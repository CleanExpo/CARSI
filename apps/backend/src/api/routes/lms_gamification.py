"""
CARSI LMS Gamification Routes

GET  /api/lms/gamification/me/level     -- current user XP, level, streak
GET  /api/lms/gamification/leaderboard  -- top 20 this month (public)
"""

from datetime import datetime, timezone

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from src.api.deps_lms import get_current_lms_user
from src.config.database import get_async_db
from src.db.lms_models import LMSUser, LMSUserLevel, LMSXPEvent

router = APIRouter(prefix="/api/lms/gamification", tags=["lms-gamification"])

LEVEL_THRESHOLDS: dict[int, int] = {
    1: 0, 2: 500, 3: 1_500, 4: 3_500, 5: 7_000, 6: 12_000,
}
LEVEL_TITLES: dict[int, str] = {
    1: "Apprentice", 2: "Trainee", 3: "Technician",
    4: "Senior Technician", 5: "Specialist", 6: "Master Restorer",
}


def _calculate_level(total_xp: int) -> int:
    level = 1
    for lvl, threshold in sorted(LEVEL_THRESHOLDS.items(), reverse=True):
        if total_xp >= threshold:
            level = lvl
            break
    return level


def _xp_to_next(current_level: int, total_xp: int) -> int | None:
    next_lvl = current_level + 1
    if next_lvl not in LEVEL_THRESHOLDS:
        return None
    return LEVEL_THRESHOLDS[next_lvl] - total_xp


class UserLevelOut(BaseModel):
    total_xp: int
    current_level: int
    level_title: str
    current_streak: int
    longest_streak: int
    xp_to_next_level: int | None


class LeaderboardEntryOut(BaseModel):
    rank: int
    display_name: str
    total_xp: int
    current_level: int
    level_title: str


@router.get("/me/level", response_model=UserLevelOut)
async def get_my_level(
    db: AsyncSession = Depends(get_async_db),
    current_user: LMSUser = Depends(get_current_lms_user),
) -> UserLevelOut:
    """Current user XP, level title, and streak."""
    result = await db.execute(
        select(LMSUserLevel).where(LMSUserLevel.student_id == current_user.id)
    )
    level = result.scalar_one_or_none()

    if level is None:
        return UserLevelOut(
            total_xp=0,
            current_level=1,
            level_title=LEVEL_TITLES[1],
            current_streak=0,
            longest_streak=0,
            xp_to_next_level=LEVEL_THRESHOLDS[2],
        )

    return UserLevelOut(
        total_xp=level.total_xp,
        current_level=level.current_level,
        level_title=LEVEL_TITLES.get(level.current_level, "Apprentice"),
        current_streak=level.current_streak,
        longest_streak=level.longest_streak,
        xp_to_next_level=_xp_to_next(level.current_level, level.total_xp),
    )


@router.get("/leaderboard", response_model=list[LeaderboardEntryOut])
async def get_leaderboard(
    db: AsyncSession = Depends(get_async_db),
) -> list[LeaderboardEntryOut]:
    """Top 20 students by XP earned this calendar month (public, anonymous)."""
    now = datetime.now(timezone.utc)
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

    result = await db.execute(
        select(
            LMSXPEvent.student_id,
            func.sum(LMSXPEvent.xp_awarded).label("monthly_xp"),
        )
        .where(LMSXPEvent.earned_at >= month_start)
        .group_by(LMSXPEvent.student_id)
        .order_by(func.sum(LMSXPEvent.xp_awarded).desc())
        .limit(20)
    )
    rows = result.all()

    entries: list[LeaderboardEntryOut] = []
    for rank, row in enumerate(rows, start=1):
        lvl_result = await db.execute(
            select(LMSUserLevel).where(LMSUserLevel.student_id == row.student_id)
        )
        lvl = lvl_result.scalar_one_or_none()
        total_xp = lvl.total_xp if lvl else 0
        current_level = lvl.current_level if lvl else 1
        entries.append(
            LeaderboardEntryOut(
                rank=rank,
                display_name=f"Technician #{rank}",
                total_xp=total_xp,
                current_level=current_level,
                level_title=LEVEL_TITLES.get(current_level, "Apprentice"),
            )
        )
    return entries
