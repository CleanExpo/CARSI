import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";

/**
 * Cleanup Old Agent Runs Cron Job
 *
 * Runs daily at 2:00 AM (0 2 * * *)
 * Deletes completed agent runs older than 30 days
 */
export async function GET(request: Request) {
  try {
    // Verify cron secret for security
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const supabase = await createClient();

    // Calculate cutoff date (30 days ago)
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 30);

    // Delete old completed runs
    const { data, error } = await supabase
      .from("agent_runs")
      .delete()
      .in("status", ["completed", "failed"])
      .lt("completed_at", cutoffDate.toISOString());

    if (error) {
      logger.error("Error deleting old runs", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const deletedCount = data?.length || 0;

    logger.info("Cleanup cron: Deleted old agent runs", { deletedCount });

    return NextResponse.json({
      success: true,
      deletedCount,
      cutoffDate: cutoffDate.toISOString(),
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error("Cleanup cron error", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
