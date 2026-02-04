#!/usr/bin/env node

/**
 * Environment Validation Script
 * Ensures safe environment configuration before starting services
 * 
 * Usage: node scripts/validate-env.js [environment]
 * Example: node scripts/validate-env.js development
 */

const fs = require('fs');
const path = require('path');

// =============================================================================
// Configuration
// =============================================================================

const ENVIRONMENTS = ['development', 'staging', 'production'];

const PRODUCTION_KEY_PATTERNS = [
  /sk_live_/,           // Stripe live keys
  /sk-ant-api/,         // Anthropic production (if different from test)
  /^pk_live_/,          // Stripe publishable live
];

const REQUIRED_FOR_PRODUCTION = [
  'DATABASE_URL',
  'JWT_SECRET_KEY',
  'STRIPE_SECRET_KEY',
];

const DANGEROUS_IN_DEVELOPMENT = [
  { key: 'STRIPE_SECRET_KEY', pattern: /^sk_live_/, message: 'Live Stripe key detected in development!' },
  { key: 'PRODUCTION_LOCK', value: 'false', message: 'Production lock is disabled!' },
];

// =============================================================================
// Helpers
// =============================================================================

function loadEnvFile(filepath) {
  if (!fs.existsSync(filepath)) {
    return null;
  }
  
  const content = fs.readFileSync(filepath, 'utf-8');
  const env = {};
  
  content.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const [key, ...valueParts] = trimmed.split('=');
      if (key) {
        env[key.trim()] = valueParts.join('=').trim();
      }
    }
  });
  
  return env;
}

function printHeader(text) {
  console.log('\n' + '='.repeat(60));
  console.log(text);
  console.log('='.repeat(60));
}

function printSuccess(text) {
  console.log(`✅ ${text}`);
}

function printWarning(text) {
  console.log(`⚠️  ${text}`);
}

function printError(text) {
  console.log(`❌ ${text}`);
}

// =============================================================================
// Validation Functions
// =============================================================================

function validateDevelopment(env) {
  let errors = [];
  let warnings = [];
  
  // Check for production keys in development
  DANGEROUS_IN_DEVELOPMENT.forEach(check => {
    const value = env[check.key];
    if (value) {
      if (check.pattern && check.pattern.test(value)) {
        errors.push(check.message);
      }
      if (check.value && value === check.value) {
        errors.push(check.message);
      }
    }
  });
  
  // Ensure mock mode is enabled
  if (env.MOCK_EXTERNAL_APIS !== 'true') {
    warnings.push('MOCK_EXTERNAL_APIS is not true - external API calls may incur costs');
  }
  
  // Ensure external calls are blocked
  if (env.ALLOW_EXTERNAL_CALLS === 'true') {
    warnings.push('ALLOW_EXTERNAL_CALLS is true - external API calls are permitted');
  }
  
  // Check for cloud API keys
  if (env.ANTHROPIC_API_KEY && env.ANTHROPIC_API_KEY.length > 10) {
    warnings.push('Anthropic API key is set - you may incur API costs. Consider using Ollama.');
  }
  
  if (env.OPENAI_API_KEY && env.OPENAI_API_KEY.length > 10) {
    warnings.push('OpenAI API key is set - you may incur API costs. Consider using Ollama.');
  }
  
  return { errors, warnings };
}

function validateStaging(env) {
  let errors = [];
  let warnings = [];
  
  // Check for production keys in staging
  DANGEROUS_IN_DEVELOPMENT.forEach(check => {
    const value = env[check.key];
    if (value && check.pattern && check.pattern.test(value)) {
      errors.push(`${check.message} (Use test keys in staging)`);
    }
  });
  
  // Ensure production lock is still on
  if (env.PRODUCTION_LOCK !== 'true') {
    warnings.push('PRODUCTION_LOCK is not true - consider keeping it enabled until final deployment');
  }
  
  return { errors, warnings };
}

function validateProduction(env) {
  let errors = [];
  let warnings = [];
  
  // Check required keys exist
  REQUIRED_FOR_PRODUCTION.forEach(key => {
    if (!env[key] || env[key].length < 5) {
      errors.push(`Missing required production key: ${key}`);
    }
  });
  
  // Ensure JWT secret is not default
  if (env.JWT_SECRET_KEY && env.JWT_SECRET_KEY.includes('dev-only')) {
    errors.push('JWT_SECRET_KEY contains development value - generate a secure secret!');
  }
  
  // Ensure debug is off
  if (env.DEBUG_MODE === 'true') {
    warnings.push('DEBUG_MODE is enabled in production - consider disabling');
  }
  
  // Ensure log level is appropriate
  if (env.LOG_LEVEL === 'debug') {
    warnings.push('LOG_LEVEL is debug in production - consider using warn or error');
  }
  
  return { errors, warnings };
}

// =============================================================================
// Main
// =============================================================================

function main() {
  const args = process.argv.slice(2);
  const targetEnv = args[0] || process.env.NODE_ENV || 'development';
  
  printHeader(`Environment Validation: ${targetEnv.toUpperCase()}`);
  
  if (!ENVIRONMENTS.includes(targetEnv)) {
    printError(`Unknown environment: ${targetEnv}`);
    printError(`Valid environments: ${ENVIRONMENTS.join(', ')}`);
    process.exit(1);
  }
  
  // Load .env file
  const envPath = path.join(process.cwd(), '.env');
  const env = loadEnvFile(envPath);
  
  if (!env) {
    printError('.env file not found!');
    printError('Copy .env.development to .env to get started');
    process.exit(1);
  }
  
  // Check environment matches
  if (env.ENVIRONMENT && env.ENVIRONMENT !== targetEnv) {
    printWarning(`ENVIRONMENT in .env (${env.ENVIRONMENT}) doesn't match target (${targetEnv})`);
  }
  
  // Run appropriate validation
  let result;
  switch (targetEnv) {
    case 'development':
      result = validateDevelopment(env);
      break;
    case 'staging':
      result = validateStaging(env);
      break;
    case 'production':
      result = validateProduction(env);
      break;
  }
  
  // Print results
  if (result.errors.length > 0) {
    printHeader('ERRORS (Must Fix)');
    result.errors.forEach(err => printError(err));
  }
  
  if (result.warnings.length > 0) {
    printHeader('WARNINGS (Review)');
    result.warnings.forEach(warn => printWarning(warn));
  }
  
  if (result.errors.length === 0 && result.warnings.length === 0) {
    printSuccess('All checks passed!');
  }
  
  // Summary
  printHeader('Summary');
  console.log(`Environment: ${targetEnv}`);
  console.log(`Errors: ${result.errors.length}`);
  console.log(`Warnings: ${result.warnings.length}`);
  
  // Exit with error if there are blocking issues
  if (result.errors.length > 0) {
    console.log('\n🚫 Environment validation FAILED');
    process.exit(1);
  }
  
  console.log('\n✅ Environment validation PASSED');
  process.exit(0);
}

main();
