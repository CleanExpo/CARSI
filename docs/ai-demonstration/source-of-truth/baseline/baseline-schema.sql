-- SQLite local video standards register. No application or production schema is changed.
PRAGMA foreign_keys = ON;
BEGIN;
CREATE TABLE IF NOT EXISTS video_standard_baselines (
 baseline_id TEXT PRIMARY KEY,
 artifact_sha256 TEXT NOT NULL UNIQUE CHECK(length(artifact_sha256)=64 AND artifact_sha256 NOT GLOB '*[^0-9a-f]*'),
 task_id TEXT NOT NULL, approved_by TEXT NOT NULL, approved_on TEXT NOT NULL,
 approval_quote TEXT NOT NULL, artifact_path TEXT NOT NULL,
 duration_sec REAL NOT NULL CHECK(duration_sec>0), fps INTEGER NOT NULL CHECK(fps>0),
 status TEXT NOT NULL CHECK(status='OWNER_APPROVED_BASELINE'),
 publication_status TEXT NOT NULL CHECK(publication_status='HOLD')
);
CREATE TABLE IF NOT EXISTS video_standard_requirements (
 baseline_id TEXT NOT NULL REFERENCES video_standard_baselines(baseline_id),
 ordinal INTEGER NOT NULL CHECK(ordinal>0), requirement TEXT NOT NULL,
 PRIMARY KEY(baseline_id,ordinal)
);
CREATE TRIGGER IF NOT EXISTS preserve_accepted_baseline_update BEFORE UPDATE ON video_standard_baselines
 BEGIN SELECT RAISE(ABORT,'Approved baselines are immutable; insert a new approved version'); END;
CREATE TRIGGER IF NOT EXISTS preserve_accepted_baseline_delete BEFORE DELETE ON video_standard_baselines
 BEGIN SELECT RAISE(ABORT,'Preserve approved baseline history'); END;
CREATE TRIGGER IF NOT EXISTS preserve_requirement_update BEFORE UPDATE ON video_standard_requirements
 BEGIN SELECT RAISE(ABORT,'Approved requirements are immutable'); END;
CREATE TRIGGER IF NOT EXISTS preserve_requirement_delete BEFORE DELETE ON video_standard_requirements
 BEGIN SELECT RAISE(ABORT,'Preserve approved requirements'); END;
COMMIT;
