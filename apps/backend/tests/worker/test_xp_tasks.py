"""Tests for the award_xp Celery task."""
from datetime import date, timedelta
from unittest.mock import MagicMock, patch
from uuid import uuid4

STUDENT_ID = str(uuid4())
SOURCE_ID = str(uuid4())


def _make_db_session(level_row=None):
    """Return a mock synchronous DB session context manager."""
    session = MagicMock()
    ctx_mgr = MagicMock()
    ctx_mgr.__enter__ = MagicMock(return_value=session)
    ctx_mgr.__exit__ = MagicMock(return_value=False)

    execute_result = MagicMock()
    execute_result.scalar_one_or_none.return_value = level_row
    session.execute.return_value = execute_result

    return ctx_mgr


def test_award_xp_creates_xp_event_and_level_row():
    """When no level row exists, award_xp creates both records."""
    with patch("src.worker.tasks.SyncSessionLocal", return_value=_make_db_session()):
        from src.worker.tasks import award_xp

        result = award_xp(
            student_id=STUDENT_ID,
            source_type="lesson_completed",
            source_id=SOURCE_ID,
            xp_amount=10,
        )

    assert result["status"] == "ok"
    assert result["xp_awarded"] == 10


def test_award_xp_increments_existing_level_and_updates_streak():
    """When a level row exists, award_xp updates XP and recalculates level."""
    from src.db.lms_models import LMSUserLevel

    mock_level = MagicMock(spec=LMSUserLevel)
    mock_level.total_xp = 490
    mock_level.current_level = 1
    mock_level.current_streak = 2
    mock_level.longest_streak = 5
    mock_level.last_active_date = date.today() - timedelta(days=1)  # yesterday

    with patch("src.worker.tasks.SyncSessionLocal", return_value=_make_db_session(mock_level)):
        from src.worker.tasks import award_xp

        result = award_xp(
            student_id=STUDENT_ID,
            source_type="quiz_passed",
            source_id=SOURCE_ID,
            xp_amount=25,
        )

    assert result["status"] == "ok"
    # 490 + 25 = 515 → level 2 (threshold 500)
    assert mock_level.total_xp == 515
    assert mock_level.current_level == 2
    # yesterday → streak incremented from 2 to 3
    assert mock_level.current_streak == 3
