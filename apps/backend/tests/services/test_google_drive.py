"""
Tests for Google Drive service — Phase 5 (GP-101)

Tests the DriveService in both disabled mode (no credentials)
and enabled mode (mocked Google API client).

Updated for OAuth2 credentials object (migration 007).
"""

from unittest.mock import MagicMock, patch

import pytest


class TestDriveServiceDisabledMode:
    """DriveService with no credentials returns graceful empty responses."""

    def test_disabled_mode_list_files_returns_empty(self):
        from src.services.google_drive import DriveService

        service = DriveService(credentials=None, folder_id="")
        assert service.is_disabled
        assert service.list_files_in_folder() == []

    def test_disabled_mode_get_metadata_returns_none(self):
        from src.services.google_drive import DriveService

        service = DriveService(credentials=None, folder_id="")
        assert service.get_file_metadata("any-file-id") is None

    def test_disabled_mode_download_url_returns_none(self):
        from src.services.google_drive import DriveService

        service = DriveService(credentials=None, folder_id="")
        assert service.get_file_download_url("any-file-id") is None


class TestDriveServiceEnabledMode:
    """DriveService with mocked Google API credentials."""

    @patch("src.services.google_drive.build")
    def test_list_files_in_root_folder(self, mock_build):
        from src.services.google_drive import DriveService

        mock_creds = MagicMock()
        mock_service = MagicMock()
        mock_build.return_value = mock_service
        mock_files_list = mock_service.files.return_value.list.return_value
        mock_files_list.execute.return_value = {
            "files": [
                {
                    "id": "file-123",
                    "name": "WRT Module 1 - Introduction.pdf",
                    "mimeType": "application/pdf",
                    "size": "2048000",
                    "webViewLink": "https://drive.google.com/file/d/file-123/view",
                    "createdTime": "2026-01-15T09:00:00.000Z",
                }
            ]
        }

        service = DriveService(credentials=mock_creds, folder_id="root-folder-id")
        files = service.list_files_in_folder()

        assert len(files) == 1
        assert files[0]["id"] == "file-123"
        assert files[0]["name"] == "WRT Module 1 - Introduction.pdf"

    @patch("src.services.google_drive.build")
    def test_list_files_in_subfolder(self, mock_build):
        from src.services.google_drive import DriveService

        mock_creds = MagicMock()
        mock_service = MagicMock()
        mock_build.return_value = mock_service
        mock_files_list = mock_service.files.return_value.list.return_value
        mock_files_list.execute.return_value = {"files": []}

        service = DriveService(credentials=mock_creds, folder_id="root-folder-id")
        files = service.list_files_in_folder(folder_id="subfolder-456")

        call_kwargs = mock_service.files.return_value.list.call_args.kwargs
        assert "subfolder-456" in call_kwargs["q"]
        assert files == []

    @patch("src.services.google_drive.build")
    def test_get_file_metadata(self, mock_build):
        from src.services.google_drive import DriveService

        mock_creds = MagicMock()
        mock_service = MagicMock()
        mock_build.return_value = mock_service
        mock_service.files.return_value.get.return_value.execute.return_value = {
            "id": "file-789",
            "name": "CRT Advanced Techniques.pdf",
            "mimeType": "application/pdf",
            "size": "5120000",
            "webViewLink": "https://drive.google.com/file/d/file-789/view",
            "thumbnailLink": None,
        }

        service = DriveService(credentials=mock_creds, folder_id="root-folder-id")
        metadata = service.get_file_metadata("file-789")

        assert metadata is not None
        assert metadata["id"] == "file-789"
        assert metadata["name"] == "CRT Advanced Techniques.pdf"

    @patch("src.services.google_drive.build")
    def test_get_download_url(self, mock_build):
        from src.services.google_drive import DriveService

        mock_creds = MagicMock()
        mock_build.return_value = MagicMock()

        service = DriveService(credentials=mock_creds, folder_id="root-folder-id")
        url = service.get_file_download_url("file-abc")

        assert url is not None
        assert "file-abc" in url


class TestDriveAPIEndpoints:
    """Test the /api/lms/drive HTTP endpoints."""

    def test_list_files_requires_auth(self):
        from fastapi.testclient import TestClient
        from src.api.main import app

        c = TestClient(app)
        # No auth headers at all — AuthMiddleware should reject
        response = c.get("/api/lms/drive/files")
        assert response.status_code == 401

    def test_list_files_returns_empty_when_drive_disabled(self):
        from fastapi.testclient import TestClient
        from src.api.main import app
        from src.api.deps_lms import get_current_lms_user
        from src.api.routes.lms_drive import _get_drive_service

        def _override_user():
            user = MagicMock()
            user.id = "00000000-0000-0000-0000-000000000001"
            user.is_active = True
            ur = MagicMock()
            ur.role = MagicMock()
            ur.role.name = "instructor"
            user.user_roles = [ur]
            return user

        async def _override_drive():
            svc = MagicMock()
            svc.is_disabled = True
            svc.list_files_in_folder.return_value = []
            return svc

        app.dependency_overrides[get_current_lms_user] = _override_user
        app.dependency_overrides[_get_drive_service] = _override_drive

        headers = {"X-User-Id": "00000000-0000-0000-0000-000000000001"}

        try:
            c = TestClient(app)
            response = c.get("/api/lms/drive/files", headers=headers)
        finally:
            app.dependency_overrides.clear()

        assert response.status_code == 200
        assert response.json() == []
