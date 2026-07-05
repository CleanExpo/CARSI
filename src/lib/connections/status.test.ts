import { describe, expect, it } from 'vitest';

import { buildCarsiConnectionStatus } from './status';

const FIXED_NOW = '2026-07-03T00:00:00.000Z';

describe('buildCarsiConnectionStatus', () => {
  it('reports blocked/unknown for boot-critical and optional connections with an empty env', () => {
    const status = buildCarsiConnectionStatus({}, FIXED_NOW);

    expect(status.source).toBe('carsi:connection-status');
    expect(status.project).toEqual({
      slug: 'carsi',
      repo: 'CleanExpo/CARSI',
      service: 'carsi-web',
      environment: 'development',
    });
    expect(status.generatedAt).toBe(FIXED_NOW);

    const byId = Object.fromEntries(status.connections.map((c) => [c.id, c]));
    expect(byId.database.state).toBe('blocked');
    expect(byId.auth.state).toBe('blocked');
    expect(byId.stripe.state).toBe('blocked');
    expect(byId.email.state).toBe('blocked');
    expect(byId.ai_chat.state).toBe('blocked');
    expect(byId.turnstile.state).toBe('unknown');
    expect(byId.cloudinary.state).toBe('unknown');
    expect(byId.rate_limit_redis.state).toBe('unknown');
    expect(byId.unite_group.state).toBe('ready');

    expect(status.summary.total).toBe(status.connections.length);
    expect(status.summary.blocked).toBe(5);
    expect(status.summary.unknown).toBe(3);
    expect(status.summary.ready).toBe(1);
  });

  it('reports connected/ready for every connection with a fully populated env', () => {
    const env = {
      NODE_ENV: 'production',
      VERCEL_ENV: 'production',
      DATABASE_URL: 'postgresql://user:pass@host:5432/db',
      JWT_SECRET: 'a'.repeat(32),
      STRIPE_SECRET_KEY: 'sk_live_xxx',
      STRIPE_WEBHOOK_SECRET: 'whsec_xxx',
      MAILTRAP_API_KEY: 'mt_xxx',
      OPENROUTER_API_KEY: 'sk-or-xxx',
      TURNSTILE_SECRET_KEY: 'ts_secret_xxx',
      NEXT_PUBLIC_TURNSTILE_SITE_KEY: 'ts_site_xxx',
      CLOUDINARY_CLOUD_NAME: 'demo',
      CLOUDINARY_API_KEY: 'ck_xxx',
      CLOUDINARY_API_SECRET: 'cs_xxx',
      UPSTASH_REDIS_REST_URL: 'https://example.upstash.io',
      UPSTASH_REDIS_REST_TOKEN: 'token_xxx',
    };

    const status = buildCarsiConnectionStatus(env, FIXED_NOW);
    const byId = Object.fromEntries(status.connections.map((c) => [c.id, c]));

    expect(status.project.environment).toBe('production');
    expect(byId.database.state).toBe('connected');
    expect(byId.auth.state).toBe('connected');
    expect(byId.stripe.state).toBe('ready');
    expect(byId.email.state).toBe('ready');
    expect(byId.ai_chat.state).toBe('ready');
    expect(byId.turnstile.state).toBe('ready');
    expect(byId.cloudinary.state).toBe('ready');
    expect(byId.rate_limit_redis.state).toBe('ready');
    expect(byId.unite_group.state).toBe('ready');

    expect(status.summary.blocked).toBe(0);
    expect(status.summary.unknown).toBe(0);

    for (const connection of status.connections) {
      if (connection.id === 'unite_group') continue; // always carries a registry note
      if (connection.state === 'ready' || connection.state === 'connected') {
        expect(connection.nextAction).toBeUndefined();
      }
    }
  });

  it('never includes secret values in the payload, only presence-derived state', () => {
    const secretValues = [
      'sk_live_super_secret_stripe_key',
      'whsec_super_secret_webhook',
      'a-very-secret-jwt-signing-key-that-is-long-enough',
      'mt_super_secret_mailtrap_token',
      'sk-super-secret-openrouter-key',
      'ts_super_secret_turnstile_key',
      'cloudinary_super_secret',
      'upstash_super_secret_token',
    ];

    const env = {
      DATABASE_URL: 'postgresql://user:secretpassword@host:5432/db',
      JWT_SECRET: secretValues[2],
      STRIPE_SECRET_KEY: secretValues[0],
      STRIPE_WEBHOOK_SECRET: secretValues[1],
      MAILTRAP_API_KEY: secretValues[3],
      OPENROUTER_API_KEY: secretValues[4],
      TURNSTILE_SECRET_KEY: secretValues[5],
      NEXT_PUBLIC_TURNSTILE_SITE_KEY: 'public-site-key',
      CLOUDINARY_CLOUD_NAME: 'demo',
      CLOUDINARY_API_KEY: 'ck_public_looking',
      CLOUDINARY_API_SECRET: secretValues[6],
      UPSTASH_REDIS_REST_URL: 'https://example.upstash.io',
      UPSTASH_REDIS_REST_TOKEN: secretValues[7],
    };

    const status = buildCarsiConnectionStatus(env, FIXED_NOW);
    const serialized = JSON.stringify(status);

    expect(serialized).not.toContain('secretpassword');
    for (const secret of secretValues) {
      expect(serialized).not.toContain(secret);
    }
  });
});
