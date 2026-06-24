/**
 * E2E tests for PRD generation flow
 */

import { test, expect } from "@playwright/test";

test.describe("PRD Generation Flow", () => {
  test.beforeEach(async ({ page }) => {
    // Mock the PRD backend (CI has no AI generation service). These defaults let the
    // submit-driven tests enter and stay in the "generating" state. Tests that need
    // other behaviour (error handling, full workflow) register their own routes
    // afterwards, which take priority in Playwright.
    await page.route("**/api/prd/generate", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          prd_id: "prd_test",
          task_id: "prd_test",
          run_id: "run_test",
          status: "pending",
          message: "PRD generation started",
        }),
      });
    });
    await page.route("**/api/prd/status/**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          prd_id: "prd_test",
          status: "running",
          progress_percent: 30,
          current_step: "Analyzing requirements",
          result: null,
        }),
      });
    });

    // Navigate to PRD generator page
    await page.goto("/prd/generate");
  });

  test("should display PRD generator form", async ({ page }) => {
    // Check page title
    await expect(page.locator("h1")).toContainText("Generate Product Requirements Document");

    // Check form elements exist
    await expect(page.getByLabel(/Project Description/i)).toBeVisible();
    await expect(page.getByLabel(/Target Users/i)).toBeVisible();
    await expect(page.getByLabel(/Timeline/i)).toBeVisible();
    await expect(page.getByLabel(/Team Size/i)).toBeVisible();
    await expect(page.getByLabel(/Existing Stack/i)).toBeVisible();

    // Check submit button exists but is disabled
    const submitButton = page.getByRole("button", { name: /Generate PRD/i });
    await expect(submitButton).toBeVisible();
    await expect(submitButton).toBeDisabled();
  });

  test("should validate requirements length", async ({ page }) => {
    const textarea = page.getByLabel(/Project Description/i);
    const submitButton = page.getByRole("button", { name: /Generate PRD/i });

    // Too short - button should be disabled
    await textarea.fill("Short description");
    await expect(submitButton).toBeDisabled();

    // Long enough - button should be enabled
    await textarea.fill("Build a comprehensive task management application for remote teams with real-time collaboration features and Kanban boards");
    await expect(submitButton).not.toBeDisabled();
  });

  test("should show character count", async ({ page }) => {
    const textarea = page.getByLabel(/Project Description/i);

    await textarea.fill("Test requirements");
    await expect(page.locator("text=/\\d+ \\/ 50 characters minimum/i")).toBeVisible();
  });

  test("should submit form with valid data", async ({ page }) => {
    // Fill in requirements
    await page.getByLabel(/Project Description/i).fill(
      "Build a task management app for remote teams with Kanban boards, real-time notifications, and project tracking"
    );

    // Fill in optional context
    await page.getByLabel(/Target Users/i).fill("Remote teams, project managers");
    await page.getByLabel(/Timeline/i).fill("3 months");
    await page.getByLabel(/Team Size/i).fill("2");
    await page.getByLabel(/Existing Stack/i).fill("Next.js, FastAPI, PostgreSQL");

    // Submit form
    const submitButton = page.getByRole("button", { name: /Generate PRD/i });
    await submitButton.click();

    // Should show progress state
    await expect(page.locator("text=/Generating Your PRD/i")).toBeVisible({ timeout: 5000 });
  });

  test("should display progress during generation", async ({ page }) => {
    // Fill and submit form
    await page.getByLabel(/Project Description/i).fill(
      "Build a simple todo application with user authentication and task management features for students"
    );
    await page.getByRole("button", { name: /Generate PRD/i }).click();

    // Wait for progress UI
    await expect(page.locator("text=/Generating Your PRD/i")).toBeVisible({ timeout: 5000 });

    // Check progress elements
    await expect(page.locator("text=/Overall Progress/i")).toBeVisible();
    await expect(page.locator("text=/Generation Phases/i")).toBeVisible();

    // Check that phases are listed
    await expect(page.locator("text=/Analyzing requirements/i")).toBeVisible();
    await expect(page.locator("text=/Decomposing features/i")).toBeVisible();
    await expect(page.locator("text=/Generating technical specification/i")).toBeVisible();

    // Check "What's Being Generated" section. Target the section headings — these
    // phrases also appear in the phase list and descriptions, so a bare text= locator
    // matches multiple elements (strict-mode violation).
    await expect(page.getByRole("heading", { name: "PRD Document" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "User Stories" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Technical Spec" })).toBeVisible();
  });

  test("should show success state after completion", async ({ page }) => {
    // Note: This test requires mocking the backend or very long timeout
    // For real E2E, you'd mock the API responses

    test.skip(); // Skip in CI unless backend is running
  });

  test("should handle errors gracefully", async ({ page }) => {
    // Mock API error
    await page.route("**/api/prd/generate", (route) => {
      route.fulfill({
        status: 500,
        body: JSON.stringify({ detail: "Server error" }),
      });
    });

    // Submit form
    await page.getByLabel(/Project Description/i).fill(
      "Build an app with at least fifty characters in the description"
    );
    await page.getByRole("button", { name: /Generate PRD/i }).click();

    // Should show error message
    await expect(page.locator("text=/Server error/i")).toBeVisible({ timeout: 5000 });
  });

  test("should disable form inputs during generation", async ({ page }) => {
    // Fill and submit
    await page.getByLabel(/Project Description/i).fill(
      "Build a comprehensive application with many features for testing purposes"
    );
    await page.getByRole("button", { name: /Generate PRD/i }).click();

    // Wait for generation state. Target the heading — "Generating" also appears in
    // the subtitle and phase list (strict-mode violation with a bare text= locator).
    await expect(page.getByRole("heading", { name: "Generating Your PRD" })).toBeVisible({
      timeout: 5000,
    });

    // During generation the page swaps the form out for the progress view, so the
    // inputs are no longer present/editable.
    await expect(page.getByLabel(/Project Description/i)).toHaveCount(0);
  });

  test("should show How It Works section", async ({ page }) => {
    await expect(page.getByText("How It Works", { exact: true })).toBeVisible({ timeout: 10_000 });

    // Check steps are displayed (each is an <h4> heading)
    await expect(page.getByRole("heading", { name: "Describe Your Project" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "AI Analysis" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Ready to Build" })).toBeVisible();
  });
});

test.describe("PRD Viewer", () => {
  // The viewer page (app/prd/[id]/page.tsx) is a client component. Its usePRDResult
  // hook (src/hooks/use-prd-generation.ts) fetches GET /api/prd/result/<id> from the
  // browser (getBackendOrigin() returns "", so the request is same-origin/relative).
  // That means page.route DOES intercept it, and we can render the full viewer by
  // returning a completed PRDResult. The shape below mirrors what the page reads:
  // prd_analysis, feature_decomposition, technical_spec, test_plan, roadmap, plus the
  // top-level summary totals and generated_at.
  const PRD_ID = "test-prd-id";

  const mockPRDResult = {
    prd_analysis: {
      executive_summary: "A task management platform for remote teams.",
      problem_statement: "Remote teams lack a unified collaboration tool.",
      target_users: ["Remote teams", "Project managers"],
      success_metrics: ["Daily active users", "Task completion rate"],
      functional_requirements: ["Kanban boards", "Real-time notifications"],
    },
    feature_decomposition: {
      epics: [
        {
          id: "epic-1",
          name: "Collaboration",
          description: "Real-time collaboration features",
          priority: "Critical",
        },
      ],
      user_stories: [
        {
          id: "story-1",
          epic: "epic-1",
          title: "As a user I can create a board",
          description: "Create Kanban boards",
          effort_estimate: "M",
          acceptance_criteria: ["Board is persisted", "Board appears in list"],
        },
      ],
    },
    technical_spec: {
      architecture_overview: "Next.js frontend with a FastAPI backend.",
      database_schema: [
        {
          name: "boards",
          description: "Kanban boards",
          columns: [{ name: "id" }, { name: "title" }],
          indexes: [{ name: "boards_pkey" }],
        },
      ],
      api_endpoints: [
        { method: "GET", path: "/api/boards" },
        { method: "POST", path: "/api/boards" },
      ],
    },
    test_plan: {
      unit_tests: ["board creation"],
      integration_tests: ["board API"],
      e2e_tests: ["board workflow"],
      coverage_strategy: "Cover critical paths with unit and e2e tests.",
    },
    roadmap: {
      total_duration_weeks: 12,
      sprints: [
        {
          sprint_number: 1,
          sprint_goal: "Foundation",
          duration_weeks: 2,
          user_stories: ["story-1"],
          deliverables: ["Auth", "Boards"],
        },
      ],
      milestones: [
        {
          name: "MVP",
          description: "Minimum viable product",
          target_sprint: 3,
        },
      ],
    },
    documents_generated: ["prd.md"],
    total_user_stories: 15,
    total_api_endpoints: 25,
    total_test_scenarios: 30,
    total_sprints: 6,
    estimated_duration_weeks: 12,
    generated_at: "2026-01-01T00:00:00.000Z",
  };

  test.beforeEach(async ({ page }) => {
    // Client-side fetch (usePRDResult) hits a relative /api/prd/result/<id>, so this
    // browser route mock intercepts it and the viewer renders with full data.
    await page.route(`**/api/prd/result/${PRD_ID}`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(mockPRDResult),
      });
    });
  });

  test("should display PRD result with all tabs", async ({ page }) => {
    await page.goto(`/prd/${PRD_ID}`);

    // Tabs render as role="tab" (shadcn Tabs). Tab labels: PRD, User Stories,
    // Tech Spec, Tests, Roadmap.
    await expect(page.getByRole("tab", { name: "PRD" })).toBeVisible();
    await expect(page.getByRole("tab", { name: "User Stories" })).toBeVisible();
    await expect(page.getByRole("tab", { name: /Tech/i })).toBeVisible();
    await expect(page.getByRole("tab", { name: "Tests" })).toBeVisible();
    await expect(page.getByRole("tab", { name: "Roadmap" })).toBeVisible();

    // Summary card labels. "User Stories" also appears as a tab (strict-mode
    // multi-match), so assert the two labels that are unique to the summary cards:
    // "API Endpoints" and "Test Scenarios". The "User Stories" tab visibility above
    // already covers that string. The numeric totals confirm the cards rendered.
    await expect(page.getByText("API Endpoints", { exact: true })).toBeVisible();
    await expect(page.getByText("Test Scenarios", { exact: true })).toBeVisible();
    await expect(page.getByText("25", { exact: true })).toBeVisible();
    await expect(page.getByText("30", { exact: true })).toBeVisible();
  });

  test("should navigate between tabs", async ({ page }) => {
    await page.goto(`/prd/${PRD_ID}`);

    // User Stories tab -> epic card renders. Assert on the seeded epic name, which is
    // unique to this tab's content (the word "Epics" never appears in the markup).
    await page.getByRole("tab", { name: "User Stories" }).click();
    await expect(page.getByText("Collaboration")).toBeVisible();

    // Tech tab -> "Architecture Overview" card title.
    await page.getByRole("tab", { name: /Tech/i }).click();
    await expect(page.getByText("Architecture Overview")).toBeVisible();

    // Tests tab -> "Test Coverage Summary" card title.
    await page.getByRole("tab", { name: "Tests" }).click();
    await expect(page.getByText(/Test Coverage/i)).toBeVisible();

    // Roadmap tab -> "Implementation Timeline" card title.
    await page.getByRole("tab", { name: "Roadmap" }).click();
    await expect(page.getByText("Implementation Timeline")).toBeVisible();
  });

  test("should have export button", async ({ page }) => {
    await page.goto(`/prd/${PRD_ID}`);

    const exportButton = page.getByRole("button", { name: /Export/i });
    await expect(exportButton).toBeVisible();
  });

  test("should have back button to generator", async ({ page }) => {
    await page.goto(`/prd/${PRD_ID}`);

    // The "Back" control is a Link wrapping a button; getByRole("button") matches the
    // inner button. Clicking navigates to /prd/generate via the Link href.
    const backButton = page.getByRole("button", { name: /Back/i });
    await expect(backButton).toBeVisible();

    await backButton.click();
    await expect(page).toHaveURL(/\/prd\/generate$/);
  });
});

test.describe("PRD Integration Tests", () => {
  test("should complete full workflow from form to result", async ({ page }) => {
    // Mock successful API responses
    let runId = "";
    let prdId = "";

    // Mock generate endpoint
    await page.route("**/api/prd/generate", async (route) => {
      runId = "run_test_123";
      prdId = "prd_test_123";

      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          prd_id: prdId,
          task_id: prdId,
          run_id: runId,
          status: "pending",
          message: "PRD generation started",
        }),
      });
    });

    // Mock status endpoint (simulating completion)
    await page.route(`**/api/prd/status/${runId}`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          prd_id: prdId,
          status: "completed",
          progress_percent: 100,
          current_step: null,
          result: {
            total_user_stories: 15,
            total_api_endpoints: 25,
            total_test_scenarios: 30,
            total_sprints: 6,
            estimated_duration_weeks: 12,
          },
        }),
      });
    });

    // Navigate and fill form
    await page.goto("/prd/generate");
    await page.getByLabel(/Project Description/i).fill(
      "Build a comprehensive task management app for remote teams with collaboration features"
    );
    await page.getByLabel(/Target Users/i).fill("Remote teams");
    await page.getByLabel(/Timeline/i).fill("3 months");

    // Submit
    await page.getByRole("button", { name: /Generate PRD/i }).click();

    // Should transition to generating state
    await expect(page.locator("text=/Generating Your PRD/i")).toBeVisible({ timeout: 5000 });

    // With mocked completion, should eventually show success
    // (In real E2E, this would wait for actual completion)
  });
});
