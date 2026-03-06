"""
CARSI Google Drive Service

Wraps the Google Drive API v3 for course content management.
Uses OAuth2 user credentials stored in PostgreSQL (admin one-time flow).

In development without credentials (no token stored, or FEATURE_GOOGLE_DRIVE=false),
the service operates in "disabled" mode and returns empty results
rather than crashing — allowing the rest of the app to work normally.
"""

from typing import Any

from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError

from src.utils import get_logger

logger = get_logger(__name__)

_DRIVE_FILE_FIELDS = "id, name, mimeType, size, webViewLink, createdTime"
_DRIVE_META_FIELDS = "id, name, mimeType, size, webViewLink, thumbnailLink"


class DriveService:
    """
    Thin wrapper around the Google Drive API.

    Pass ``credentials=None`` to activate disabled mode —
    all methods return empty/None without raising.
    """

    def __init__(self, credentials: Credentials | None, folder_id: str) -> None:
        self._folder_id = folder_id
        self._service: Any = None

        if credentials is None:
            logger.info("DriveService: no credentials — running in disabled mode")
            self.is_disabled = True
            return

        try:
            self._service = build("drive", "v3", credentials=credentials, cache_discovery=False)
            self.is_disabled = False
            logger.info("DriveService: initialised with OAuth2 credentials")
        except Exception as exc:
            logger.warning("DriveService: failed to initialise — disabled", error=str(exc))
            self.is_disabled = True

    # ---------------------------------------------------------------------------
    # Public API
    # ---------------------------------------------------------------------------

    def list_files_in_folder(self, folder_id: str | None = None) -> list[dict]:
        """
        Return files inside *folder_id* (or the configured root folder).
        Returns an empty list in disabled mode or on API error.
        """
        if self.is_disabled:
            return []

        target = folder_id or self._folder_id
        if not target:
            return []

        try:
            result = (
                self._service.files()
                .list(
                    q=f"'{target}' in parents and trashed=false",
                    fields=f"files({_DRIVE_FILE_FIELDS})",
                    orderBy="name",
                    pageSize=100,
                )
                .execute()
            )
            return result.get("files", [])
        except HttpError as exc:
            logger.error("DriveService.list_files_in_folder error", error=str(exc))
            return []

    def get_file_metadata(self, file_id: str) -> dict | None:
        """
        Return metadata for a single file. Returns ``None`` in disabled mode or on error.
        """
        if self.is_disabled:
            return None

        try:
            return (
                self._service.files()
                .get(fileId=file_id, fields=_DRIVE_META_FIELDS)
                .execute()
            )
        except HttpError as exc:
            logger.error("DriveService.get_file_metadata error", file_id=file_id, error=str(exc))
            return None

    def get_file_download_url(self, file_id: str) -> str | None:
        """Return a direct download URL for a file. Returns ``None`` in disabled mode."""
        if self.is_disabled:
            return None
        return f"https://drive.google.com/uc?export=download&id={file_id}"

    def list_folders_recursive(
        self,
        folder_id: str | None = None,
        *,
        _depth: int = 0,
        _parent_name: str | None = None,
    ) -> list[dict]:
        """
        Recursively discover all files and sub-folders within *folder_id*.

        Returns a flat list where each item is a Drive file dict augmented
        with ``_parent_name`` (the name of its immediate parent folder).
        Stops at depth 5 to prevent runaway recursion on deep Drive trees.
        """
        if self.is_disabled or _depth > 5:
            return []

        target = folder_id or self._folder_id
        if not target:
            return []

        _FOLDER_MIME = "application/vnd.google-apps.folder"
        results: list[dict] = []

        try:
            response = (
                self._service.files()
                .list(
                    q=f"'{target}' in parents and trashed=false",
                    fields=f"files({_DRIVE_FILE_FIELDS})",
                    orderBy="name",
                    pageSize=200,
                )
                .execute()
            )
        except Exception as exc:
            logger.error("DriveService.list_folders_recursive error", folder_id=target, error=str(exc))
            return []

        for item in response.get("files", []):
            item["_parent_name"] = _parent_name
            if item.get("mimeType") == _FOLDER_MIME:
                # Recurse into sub-folders; the folder itself is also included
                results.append(item)
                results.extend(
                    self.list_folders_recursive(
                        item["id"],
                        _depth=_depth + 1,
                        _parent_name=item.get("name"),
                    )
                )
            else:
                results.append(item)

        return results
