"""Verification module - Independent verification of task completion."""

from .independent_verifier import (
    IndependentVerifier,
    VerificationRequest,
    VerificationResult,
    VerificationEvidence,
    VerificationFailure,
    CompletionCriterion,
    ClaimedOutput,
    VerificationType,
)

__all__ = [
    "IndependentVerifier",
    "VerificationRequest",
    "VerificationResult",
    "VerificationEvidence",
    "VerificationFailure",
    "CompletionCriterion",
    "ClaimedOutput",
    "VerificationType",
]
