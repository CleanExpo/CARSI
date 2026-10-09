import { expect, test } from '@playwright/test';

const ID = '10000000-0000-4000-8000-000000000001';
const STORAGE = 'carsi-margot-conversation-id';

test('Margot resumes a conversation and clears stale access after reload', async ({ page }) => {
  let allowed = true;
  await page.route('**/api/margot/chat/speech', (route) => route.fulfill({ json: { available: false } }));
  await page.route('**/api/margot/chat/history?*', (route) => route.fulfill(allowed
    ? { json: { conversation_id: ID, messages: [{ role: 'assistant', content: 'Your resumed conversation' }] } }
    : { status: 403, json: { detail: 'Please start a new conversation.' } }));
  await page.route('**/api/margot/chat', (route) => route.fulfill({
    json: { reply: 'Your resumed conversation', conversation_id: ID, assistant_name: 'Margot' },
  }));
  await page.goto('/');
  await page.getByRole('button', { name: 'Ask Margot' }).click();
  await page.getByRole('textbox', { name: 'Chat message input' }).fill('Hello');
  await page.getByRole('button', { name: 'Send message' }).click();
  await expect.poll(() => page.evaluate((key) => localStorage.getItem(key), STORAGE)).toBe(ID);
  await page.reload();
  await page.getByRole('button', { name: 'Ask Margot' }).click();
  await expect(page.getByText('Your resumed conversation', { exact: true })).toBeVisible();
  allowed = false;
  await page.reload();
  await expect.poll(() => page.evaluate((key) => localStorage.getItem(key), STORAGE)).toBeNull();
  await page.getByRole('button', { name: 'Ask Margot' }).click();
  await expect(page.getByText('Your resumed conversation', { exact: true })).toHaveCount(0);
});

test('history refuses a conversation ID without any owner proof', async ({ request }) => {
  const response = await request.get(`/api/margot/chat/history?conversation_id=${ID}`);
  expect(response.status()).toBe(403);
  expect(await response.json()).not.toHaveProperty('messages');
});
