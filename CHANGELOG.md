# Changelog

## [Unreleased]

## 2024-06-15 - Weekly Enhancement Loop

### Added
- Barrel file `src/lib/lms/index.ts` to simplify imports across LMS module
- Social platform variants (`linkedin`, `twitter`, `generic`) for progress sharing via `buildPlatformDrafts`
- Note preview rendering with `renderNotePreview` (strips markdown, truncates to ~120 chars)
- New note formatting actions: `link`, `code`, `strikethrough`
- TypeScript static analysis verifiers: `ts_interface_exports`, `ts_no_any_types`, `ts_strict_null_checks`

### Improved
- All LMS exports now centrally available via barrel file
- Progress sharing now generates platform-optimized drafts without duplicating logic
- Note formatting now supports richer Markdown syntax without breaking existing functionality

### Tested
- Added `note-formatting.test.ts` with coverage for preview rendering and formatting actions

> *All changes are additive and non-breaking. No existing interfaces were modified, only extended.*