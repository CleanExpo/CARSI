/** Real migrated-Postgres guard test. Only explicit disposable loopback test databases. */
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { after, before, test } from 'node:test';
import { Pool } from 'pg';

const url = new URL(process.env.DATABASE_URL ?? '');
assert.equal(process.env.CARSI_MARGOT_DB_TEST, '1', 'explicit disposable test permission required');
assert.ok(['localhost', '127.0.0.1', '::1'].includes(url.hostname), 'test database must be loopback');
assert.ok(['/carsi', '/carsi_margot_ownership_test'].includes(url.pathname), 'unexpected test database');
assert.notEqual(process.env.NODE_ENV, 'production');
process.env.JWT_SECRET = 'synthetic-margot-db-test-secret-at-least-32-characters';

const { prisma } = await import('../src/lib/prisma');
const { signAnonymousConversation } = await import('../src/lib/server/margot-conversation-access');
const { appendMargotUserTurn, appendMargotTurn, margotConversationExists, loadMargotHistory } =
  await import('../src/lib/server/margot-conversation-store');
const pool = new Pool({ connectionString: url.toString() });
const owner = randomUUID();
const foreign = randomUUID();
const ids: string[] = [];

before(async () => {
  const rows = await pool.query('SELECT count(*)::int AS count FROM _prisma_migrations WHERE finished_at IS NOT NULL');
  assert.ok(rows.rows[0].count > 0, 'migrations must be applied');
  await prisma.lmsUser.createMany({ data: [owner, foreign].map((id) => ({
    id, email: `margot-ownership-${id}@example.invalid`, hashedPassword: 'not-an-authentic-password',
  })) });
});
after(async () => {
  await prisma.margotConversation.deleteMany({ where: { id: { in: ids } } });
  await prisma.lmsUser.deleteMany({ where: { id: { in: [owner, foreign] } } });
  await prisma.$disconnect();
  await pool.end();
});

async function anonymousConversation() {
  const id = randomUUID(); ids.push(id);
  const access = { userId: null, anonymousToken: await signAnonymousConversation(id) } as const;
  await appendMargotUserTurn({ conversationId: id, access, userMessage: 'Initial private message' });
  return { id, access };
}

test('foreign owner cannot read or append to an anonymous conversation', async () => {
  const { id, access } = await anonymousConversation();
  const otherAccess = { userId: foreign };
  assert.equal(await margotConversationExists(id, otherAccess), false);
  assert.deepEqual(await loadMargotHistory(id, otherAccess), []);
  await assert.rejects(appendMargotTurn({ conversationId: id, access: otherAccess,
    userMessage: 'Injected user', assistantMessage: 'Injected assistant' }));
  assert.deepEqual(await loadMargotHistory(id, access), [{ role: 'user', content: 'Initial private message' }]);
  assert.equal(await prisma.margotMessage.count({ where: { conversationId: id } }), 1);
});

test('legitimate owner can resume and append while first creation cannot adopt an existing ID', async () => {
  const id = randomUUID(); ids.push(id);
  const access = { userId: owner };
  await appendMargotUserTurn({ conversationId: id, access, userMessage: 'Owner first message' });
  await appendMargotTurn({ conversationId: id, access, userMessage: 'Owner first message',
    assistantMessage: 'Owner reply', userMessageAlreadyStored: true });
  assert.equal(await margotConversationExists(id, access), true);
  assert.equal((await loadMargotHistory(id, access)).length, 2);
  await assert.rejects(appendMargotUserTurn({ conversationId: id, access: { userId: foreign }, userMessage: 'Adopt attempt' }));
  const row = await prisma.margotConversation.findUniqueOrThrow({ where: { id }, select: { userId: true } });
  assert.equal(row.userId, owner);
  assert.equal(await prisma.margotMessage.count({ where: { conversationId: id } }), 2);
});

test('ownership change after a successful route check prevents a later append', async () => {
  const { id, access } = await anonymousConversation();
  assert.equal(await margotConversationExists(id, access), true);
  await prisma.margotConversation.update({ where: { id }, data: { userId: foreign } });
  await assert.rejects(appendMargotTurn({ conversationId: id, access,
    userMessage: 'Stale request', assistantMessage: 'Stale reply' }));
  assert.equal(await prisma.margotMessage.count({ where: { conversationId: id } }), 1);
});

test('concurrent owner change holding a real row lock denies the waiting stale write', { timeout: 15000 }, async () => {
  const { id, access } = await anonymousConversation();
  let release!: () => void;
  let signalReady!: () => void;
  const ready = new Promise<void>((resolve) => { signalReady = resolve; });
  const unlocked = new Promise<void>((resolve) => { release = resolve; });
  const transfer = prisma.$transaction(async (tx) => {
    await tx.margotConversation.update({ where: { id }, data: { userId: foreign } });
    signalReady();
    await unlocked;
  }, { timeout: 10000 });
  await ready;
  const writing = appendMargotTurn({ conversationId: id, access, userMessage: 'Racing user', assistantMessage: 'Racing reply' });
  // Attach a rejection handler immediately; assert the result after releasing the row lock.
  const outcome = writing.then(() => ({ denied: false }), () => ({ denied: true }));
  try {
    let locked = false;
    for (let attempt = 0; attempt < 60 && !locked; attempt++) {
      const result = await pool.query("SELECT EXISTS (SELECT 1 FROM pg_stat_activity WHERE datname = current_database() AND wait_event_type = 'Lock' AND query LIKE '%margot_conversations%') AS locked");
      locked = result.rows[0].locked;
      if (!locked) await new Promise((resolve) => setTimeout(resolve, 25));
    }
    assert.equal(locked, true, 'writer must actually wait on the database row lock');
  } finally {
    release();
    await transfer;
  }
  assert.equal((await outcome).denied, true);
  assert.equal(await prisma.margotMessage.count({ where: { conversationId: id } }), 1);
});
