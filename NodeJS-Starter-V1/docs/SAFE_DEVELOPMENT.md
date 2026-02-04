# Safe Development Workflow

This project uses environment isolation to prevent accidental use of production resources during development.

## Quick Start

```bash
# 1. Copy the development environment template
cp .env.development .env

# 2. Install safety hooks
pnpm safety:install-hooks

# 3. Start development (validates environment first)
pnpm dev
```

## Environment Tiers

| Environment | API Keys | External Calls | Use Case |
|-------------|----------|----------------|----------|
| **Development** | None/Mock | Blocked | Daily coding |
| **Staging** | Test keys | Allowed | Integration testing |
| **Production** | Live keys | Allowed | Deployed application |

## Environment Files

### `.env.development` (Committed)
Safe template for local development:
- Uses local Ollama for AI (no API costs)
- Mocks all external services (Stripe, Twilio, ElevenLabs)
- Blocks external API calls
- Debug mode enabled

**Usage**: `cp .env.development .env`

### `.env.staging` (NOT Committed)
For integration testing with real services:
- Uses test/sandbox API keys
- Allows external API calls
- Debug mode enabled

**Usage**: Copy manually, never commit

### `.env.production.template` (Committed)
Reference template only:
- Shows required variables
- Values set in hosting platform
- Never fill in actual values

## Commands

| Command | Purpose |
|---------|---------|
| `pnpm dev` | Start with validation (development) |
| `pnpm dev:mock` | Start with mock API server |
| `pnpm validate:env` | Check current environment |
| `pnpm validate:env:dev` | Validate development config |
| `pnpm validate:env:staging` | Validate staging config |
| `pnpm validate:env:prod` | Validate production config |
| `pnpm docker:reset` | Reset all local data |
| `pnpm safety:install-hooks` | Install pre-commit safety hook |

## Safety Features

### 1. Environment Validation
Runs automatically before `pnpm dev`:
```bash
pnpm validate:env:dev
```

**Checks**:
- No production API keys in development
- MOCK_EXTERNAL_APIS is enabled
- ALLOW_EXTERNAL_CALLS is disabled
- Warns about cloud AI keys (costs)

**Blocks startup if unsafe configuration detected**

### 2. Pre-commit Hook
Scans for API keys before allowing commits:
```bash
pnpm safety:install-hooks
```

**Detects**:
- Stripe live keys (`sk_live_`)
- Anthropic production keys
- AWS access keys
- Private keys (RSA, SSH)

**Prevents commits if sensitive data found**

### 3. Mock API Server
Returns placeholder responses for external APIs:
```bash
pnpm docker:up:mock
```

**Mocked Services**:
- ElevenLabs (text-to-speech)
- Stripe (payments)
- Twilio (SMS)

**Benefits**:
- No API costs during development
- Consistent test responses
- Works offline

### 4. Network Isolation
Docker services run on isolated network:
- Services can only talk to each other
- External calls blocked by default
- Mailhog captures all emails
- MinIO provides local S3 storage

## Docker Services

```yaml
postgres:     # PostgreSQL 15 with pgvector
redis:        # Redis 7 cache
mailhog:      # Email capture (web UI on :8025)
minio:        # S3-compatible storage (console on :9001)
mock-api:     # Mock external APIs (when --profile mock)
```

## Adding New External APIs

When you integrate a new external service:

1. **Add mock endpoint** to `docker/mock-api/server.js`:
```javascript
app.post('/api/new-service/endpoint', (req, res) => {
  console.log('[MOCK] New service called');
  res.json({ mock: true, received: req.body });
});
```

2. **Add environment variable** to all `.env.*` files:
```bash
# .env.development
NEW_SERVICE_API_KEY=
MOCK_NEW_SERVICE=true

# .env.staging
NEW_SERVICE_API_KEY=your_test_key
MOCK_NEW_SERVICE=false

# .env.production.template
NEW_SERVICE_API_KEY=
```

3. **Add validation rule** to `scripts/validate-env.js`:
```javascript
// In validateDevelopment()
if (env.NEW_SERVICE_API_KEY && env.NEW_SERVICE_API_KEY.length > 10) {
  warnings.push('New Service API key is set - you may incur costs');
}
```

4. **Document** in this file

## Transitioning to Production

### Checklist

- [ ] Run full test suite: `pnpm test`
- [ ] Validate staging: `pnpm validate:env:staging`
- [ ] Test with real APIs in staging
- [ ] Set environment variables in hosting platform
- [ ] Validate production: `pnpm validate:env:prod`
- [ ] Deploy: `pnpm deploy`

### Production Safety

**Production Lock**: The `PRODUCTION_LOCK` flag must be explicitly set to `false` in production. This prevents accidental deployment from development machines.

**Required Variables**:
- `DATABASE_URL`
- `JWT_SECRET_KEY` (must be unique, not default)
- `STRIPE_SECRET_KEY`

**Validation**:
```bash
pnpm validate:env:prod
```

Fails if:
- JWT secret contains "dev-only"
- DEBUG_MODE is true
- LOG_LEVEL is debug
- Required variables missing

## Troubleshooting

### "Live Stripe key detected in development!"
**Cause**: `.env` contains `sk_live_` key  
**Fix**: Use `sk_test_` key or empty value in development

### "MOCK_EXTERNAL_APIS is not true"
**Cause**: External API calls may incur costs  
**Fix**: Set `MOCK_EXTERNAL_APIS=true` in `.env`

### "Validation keeps failing"
**Cause**: Environment doesn't match expected  
**Fix**: Check `ENVIRONMENT` variable matches your intent

### "Pre-commit hook not running"
**Cause**: Hook not installed  
**Fix**: Run `pnpm safety:install-hooks`

## Security Best Practices

1. **Never commit `.env`** files (except templates)
2. **Never share API keys** in code or chat
3. **Use mock APIs** in development
4. **Validate before deploy** to catch issues early
5. **Rotate keys** if accidentally exposed

## Support

For issues or questions:
- Check logs: `cat .claude/logs/security-$(date +%Y-%m-%d).log`
- Review hooks: `.claude/hooks/README.md`
- Validate env: `pnpm validate:env`

---

**Remember**: When in doubt, use mocks. It's cheaper and safer.
