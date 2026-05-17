-- Phase 3: CRM event log for contact + enrollment sync audit

CREATE TABLE "crm_event_logs" (
    "id" UUID NOT NULL,
    "event_type" VARCHAR(64) NOT NULL,
    "payload" JSONB NOT NULL,
    "status" VARCHAR(32) NOT NULL DEFAULT 'pending',
    "response_status" INTEGER,
    "response_body" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "crm_event_logs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "crm_event_logs_event_type_created_at_idx" ON "crm_event_logs"("event_type", "created_at" DESC);
CREATE INDEX "crm_event_logs_status_idx" ON "crm_event_logs"("status");
