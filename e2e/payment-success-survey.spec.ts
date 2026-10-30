import { expect, test, type Page } from '@playwright/test';

/**
 * Guest payment-success page with a REAL keyboard. jsdom cannot show that a browser lets a guest
 * type into the password form when the purchase survey is on (a keydown handler that calls
 * preventDefault, a readOnly input or a hidden form all pass jsdom and break real Chrome).
 *
 * Tests tagged @survey-on run only in the `purchase-survey` Playwright project (a server with
 * PURCHASE_SURVEY_ENABLED=true, see playwright.config.ts). The flag-off test runs on the normal
 * server. Every network call the page makes is answered locally.
 */
const PATH = '/courses/moisture-meters-readings-and-dry-standards/payment-success?session_id=cs_test_guest';
const FULL_NAME = 'Jordan Q. Tester-Smith';
const PASSWORD = 'correct horse 9!';
const SURVEY_HEADING = 'Two quick questions';

type Capture = { guestComplete: unknown[]; survey: unknown[] };

async function stubNetwork(page: Page, surveyStatus: number): Promise<Capture> {
  const capture: Capture = { guestComplete: [], survey: [] };
  await page.route('**/api/auth/refresh', (route) =>
    route.fulfill({ status: 401, json: { detail: 'no session' } })
  );
  await page.route('**/api/lms/enrollments/confirm', (route) =>
    route.fulfill({ status: 401, json: { detail: 'not logged in' } })
  );
  await page.route('**/api/lms/checkout/session**', (route) =>
    route.fulfill({ json: { email: 'guest@example.test', guest_checkout: true } })
  );
  await page.route('**/api/lms/checkout/survey', async (route) => {
    capture.survey.push(route.request().postDataJSON());
    await route.fulfill({ status: surveyStatus, json: surveyStatus === 200 ? { ok: true } : { detail: 'x' } });
  });
  await page.route('**/api/lms/enrollments/guest-complete', async (route) => {
    capture.guestComplete.push(route.request().postDataJSON());
    await route.fulfill({ status: 400, json: { detail: 'Stubbed: stay on page' } });
  });
  return capture;
}

async function typeAndSubmit(page: Page, capture: Capture) {
  const name = page.getByLabel('Full name');
  const password = page.getByLabel('Password');
  await expect(name).toBeVisible();
  await name.click();
  await name.pressSequentially(FULL_NAME);
  await password.click();
  await password.pressSequentially(PASSWORD);
  await expect(name).toHaveValue(FULL_NAME);
  await expect(password).toHaveValue(PASSWORD);
  await page.getByRole('button', { name: 'Start lesson 1' }).click();
  await expect.poll(() => capture.guestComplete.length).toBe(1);
  expect(capture.guestComplete[0]).toEqual({
    session_id: 'cs_test_guest',
    password: PASSWORD,
    full_name: FULL_NAME,
  });
}

test.describe('payment-success guest form with the survey on', () => {
  test('survey just shown: guest can type and submit @survey-on', async ({ page }) => {
    const capture = await stubNetwork(page, 200);
    await page.goto(PATH);
    await expect(page.getByRole('heading', { name: SURVEY_HEADING })).toBeVisible();
    await expect(page.getByText('What work do you do?')).toBeVisible();
    await expect(page.getByText('How did you find us?')).toBeVisible();
    await typeAndSubmit(page, capture);
  });

  test('after tapping a choice: guest can type and submit @survey-on', async ({ page }) => {
    const capture = await stubNetwork(page, 200);
    await page.goto(PATH);
    const choice = page.getByRole('button', { name: 'Carpet or floor care' });
    await choice.click();
    await expect(choice).toHaveAttribute('aria-pressed', 'true');
    await typeAndSubmit(page, capture);
  });

  test('after Skip: guest can type and submit @survey-on', async ({ page }) => {
    const capture = await stubNetwork(page, 200);
    await page.goto(PATH);
    await page.getByRole('button', { name: 'Skip' }).click();
    await expect(page.getByRole('heading', { name: SURVEY_HEADING })).toHaveCount(0);
    await typeAndSubmit(page, capture);
  });

  test('after a failed survey save: guest can type and submit @survey-on', async ({ page }) => {
    const capture = await stubNetwork(page, 502);
    await page.goto(PATH);
    await page.getByRole('button', { name: 'Carpet or floor care' }).click();
    await page.getByRole('button', { name: 'Send answers' }).click();
    await expect(page.getByText('We could not save your answers')).toBeVisible();
    expect(capture.survey).toHaveLength(1);
    await typeAndSubmit(page, capture);
  });

  test('after a successful survey save: guest can type and submit @survey-on', async ({ page }) => {
    const capture = await stubNetwork(page, 200);
    await page.goto(PATH);
    await page.getByRole('button', { name: 'Carpet or floor care' }).click();
    await page.getByRole('button', { name: 'Send answers' }).click();
    await expect(page.getByText('Thank you. Your answers help us decide')).toBeVisible();
    expect(capture.survey).toHaveLength(1);
    await typeAndSubmit(page, capture);
  });

  test('while the survey save is still sending: guest can type and submit @survey-on', async ({ page }) => {
    const capture = await stubNetwork(page, 200);
    // Hold the survey request open for the whole test so the survey stays in its sending state.
    let release: () => void = () => {};
    const held = new Promise<void>((resolve) => {
      release = resolve;
    });
    await page.route('**/api/lms/checkout/survey', async (route) => {
      capture.survey.push(route.request().postDataJSON());
      await held;
      await route.fulfill({ status: 200, json: { ok: true } }).catch(() => {});
    });
    await page.goto(PATH);
    await page.getByRole('button', { name: 'Carpet or floor care' }).click();
    await page.getByRole('button', { name: 'Send answers' }).click();
    await expect(page.getByRole('button', { name: 'Sending…' })).toBeVisible();
    await typeAndSubmit(page, capture);
    await expect(page.getByRole('button', { name: 'Sending…' })).toBeVisible();
    release();
  });
});

test.describe('payment-success guest form with the survey off', () => {
  test('no survey text; guest can type and submit', async ({ page }) => {
    const capture = await stubNetwork(page, 200);
    await page.goto(PATH);
    await expect(page.getByLabel('Full name')).toBeVisible();
    await expect(page.getByText(SURVEY_HEADING)).toHaveCount(0);
    await expect(page.getByText('What work do you do?')).toHaveCount(0);
    await typeAndSubmit(page, capture);
  });
});
