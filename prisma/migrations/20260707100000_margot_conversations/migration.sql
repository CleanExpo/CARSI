-- Margot assistant conversation persistence
CREATE TABLE "margot_conversations" (
    "id" UUID NOT NULL,
    "user_id" UUID,
    "source_ip" VARCHAR(64),
    "page_path" VARCHAR(512),
    "course_slug" VARCHAR(200),
    "lesson_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "margot_conversations_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "margot_messages" (
    "id" UUID NOT NULL,
    "conversation_id" UUID NOT NULL,
    "role" VARCHAR(16) NOT NULL,
    "content" TEXT NOT NULL,
    "model" VARCHAR(120),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "margot_messages_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "margot_conversations_updated_at_idx" ON "margot_conversations"("updated_at" DESC);
CREATE INDEX "margot_conversations_user_id_idx" ON "margot_conversations"("user_id");
CREATE INDEX "margot_messages_conversation_id_created_at_idx" ON "margot_messages"("conversation_id", "created_at");

ALTER TABLE "margot_conversations" ADD CONSTRAINT "margot_conversations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "lms_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "margot_messages" ADD CONSTRAINT "margot_messages_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "margot_conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
