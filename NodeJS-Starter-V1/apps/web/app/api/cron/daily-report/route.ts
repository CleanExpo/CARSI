import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";

/**
 * Daily Agent Report Cron Job
 *
 * Runs daily at 9:00 AM (0 9 * * *)
 * Generates a summary report of yesterday's agent activity
 */
export async function GET(request: Request) {
  try {
    // Verify cron secret for security
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const supabase = await createClient();

    // Calculate yesterday's date range
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    // Fetch yesterday's agent runs
    const { data: runs, error } = await supabase
      .from("agent_runs")
      .select("*")
      .gte("started_at", yesterday.toISOString())
      .lt("started_at", today.toISOString());

    if (error) {
      logger.error("Error fetching daily report data", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Calculate statistics
    const total = runs?.length || 0;
    const completed = runs?.filter((r) => r.status === "completed").length || 0;
    const failed = runs?.filter((r) => r.status === "failed").length || 0;
    const escalated = runs?.filter((r) => r.status === "escalated_to_human").length || 0;

    const successRate = total > 0 ? ((completed / total) * 100).toFixed(1) : "0.0";

    // Calculate average duration for completed runs
    const completedRuns = runs?.filter((r) => r.status === "completed" && r.completed_at) || [];
    const avgDuration =
      completedRuns.length > 0
        ? completedRuns.reduce((acc, run) => {
            const duration =
              new Date(run.completed_at!).getTime() - new Date(run.started_at).getTime();
            return acc + duration;
          }, 0) / completedRuns.length
        : 0;

    const avgDurationSeconds = Math.round(avgDuration / 1000);

    // Agent breakdown
    const agentStats = runs?.reduce((acc: Record<string, number>, run) => {
      acc[run.agent_name] = (acc[run.agent_name] || 0) + 1;
      return acc;
    }, {});

    const report = {
      date: yesterday.toISOString().split("T")[0],
      summary: {
        total,
        completed,
        failed,
        escalated,
        successRate: `${successRate}%`,
        avgDurationSeconds,
      },
      byAgent: agentStats || {},
      topFailures: runs
        ?.filter((r) => r.status === "failed")
        .slice(0, 5)
        .map((r) => ({
          agent: r.agent_name,
          error: r.error,
          timestamp: r.started_at,
        })),
    };

    logger.info("Daily report generated", { report });

    // TODO: Send report via email, Slack, or save to database
    // Example: await sendSlackNotification(report);
    // Example: await saveReportToDatabase(report);

    return NextResponse.json({
      success: true,
      report,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error("Daily report cron error", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
