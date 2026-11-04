-- GP-631 (Coaching advantage A4): a coach's own knowledge base.
--
-- Additive: one new table and one index. No existing table, row or column is touched, so
-- nothing changes for any member, course or payment when this runs.
--
-- Why: Ask my coach (GP-630) answers members from their coach's own material. Every existing
-- coaching table is keyed by a member's user_id with ON DELETE CASCADE, so a coach's material
-- stored there would be deleted when that member leaves. This table is keyed by the coach id
-- Ask my coach already routes questions by. A row is used only once approved_at is set, and
-- the coach can delete it at any time (hard delete, so nothing lingers).
--
-- Down path: DROP TABLE "carsi_coaching_coach_corpus";

CREATE TABLE "carsi_coaching_coach_corpus" (
    "id" UUID NOT NULL,
    "coach_id" VARCHAR(64) NOT NULL,
    "source_type" VARCHAR(32) NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "body" TEXT NOT NULL,
    "provenance_url" VARCHAR(500),
    "approved_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "carsi_coaching_coach_corpus_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "idx_carsi_coaching_coach_corpus_coach_approved" ON "carsi_coaching_coach_corpus"("coach_id", "approved_at");
