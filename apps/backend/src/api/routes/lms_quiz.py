"""LMS Quiz routes — Phase 11 (GP-107)."""

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload, selectinload

from src.api.deps_lms import get_current_lms_user
from src.api.schemas.lms_quiz import (
    QuizOptionOut,
    QuizOut,
    QuizQuestionOut,
    QuizResultOut,
    QuizSubmitRequest,
)
from src.config.database import get_async_db
from src.db.lms_models import LMSQuiz, LMSQuizAttempt, LMSUser

router = APIRouter(prefix="/api/lms/quizzes", tags=["lms-quiz"])


@router.get("/{quiz_id}", response_model=QuizOut)
async def get_quiz(
    quiz_id: UUID,
    db: AsyncSession = Depends(get_async_db),
    current_user: LMSUser = Depends(get_current_lms_user),
) -> QuizOut:
    """Return quiz with questions (answer correctness stripped)."""
    result = await db.execute(
        select(LMSQuiz)
        .options(selectinload(LMSQuiz.questions), selectinload(LMSQuiz.attempts))
        .where(LMSQuiz.id == quiz_id)
    )
    quiz = result.scalar_one_or_none()
    if not quiz:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Quiz not found")

    questions = [
        QuizQuestionOut(
            id=q.id,
            question_text=q.question_text,
            question_type=q.question_type or "multiple_choice",
            options=[QuizOptionOut(text=opt["text"]) for opt in (q.options or [])],
            order_index=q.order_index,
            points=q.points or 1,
        )
        for q in quiz.questions
    ]

    return QuizOut(
        id=quiz.id,
        title=quiz.title,
        pass_percentage=quiz.pass_percentage or 70,
        time_limit_minutes=quiz.time_limit_minutes,
        attempts_allowed=quiz.attempts_allowed or 3,
        questions=questions,
    )


@router.post("/{quiz_id}/submit", response_model=QuizResultOut)
async def submit_quiz(
    quiz_id: UUID,
    body: QuizSubmitRequest,
    db: AsyncSession = Depends(get_async_db),
    current_user: LMSUser = Depends(get_current_lms_user),
) -> QuizResultOut:
    """Grade a quiz submission and record the attempt."""
    from src.worker.tasks import handle_quiz_passed

    result = await db.execute(
        select(LMSQuiz)
        .options(selectinload(LMSQuiz.questions), selectinload(LMSQuiz.attempts))
        .where(LMSQuiz.id == quiz_id)
    )
    quiz = result.scalar_one_or_none()
    if not quiz:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Quiz not found")

    # Check attempt limit
    student_attempts = [a for a in quiz.attempts if a.student_id == current_user.id]
    if len(student_attempts) >= (quiz.attempts_allowed or 3):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Maximum number of attempts reached",
        )

    # Grade answers
    question_map = {q.id: q for q in quiz.questions}
    correct = 0
    total = len(quiz.questions)

    for question_id, selected_idx in body.answers.items():
        q = question_map.get(question_id)
        if not q or not q.options:
            continue
        opts = q.options
        if 0 <= selected_idx < len(opts) and opts[selected_idx].get("is_correct", False):
            correct += 1

    score_pct = (correct / total * 100) if total > 0 else 0.0
    passed = score_pct >= (quiz.pass_percentage or 70)

    # Record attempt
    attempt = LMSQuizAttempt(
        quiz_id=quiz_id,
        student_id=current_user.id,
        answers={str(k): v for k, v in body.answers.items()},
        score_percentage=score_pct,
        passed=passed,
    )
    db.add(attempt)
    await db.commit()

    if passed:
        handle_quiz_passed.delay(
            {
                "student_id": str(current_user.id),
                "quiz_id": str(quiz_id),
                "score_percentage": score_pct,
            }
        )

    return QuizResultOut(
        quiz_id=quiz_id,
        score_percentage=score_pct,
        passed=passed,
        correct_count=correct,
        total_questions=total,
    )
