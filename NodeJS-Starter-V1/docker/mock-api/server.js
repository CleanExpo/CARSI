/**
 * Mock API Server
 * Intercepts external API calls during development
 * Returns realistic placeholder responses
 */

const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 8888;

// =============================================================================
// Health Check
// =============================================================================
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'mock-api', timestamp: new Date().toISOString() });
});

// =============================================================================
// ElevenLabs Mock
// =============================================================================
app.post('/v1/text-to-speech/:voiceId', (req, res) => {
  console.log('[MOCK] ElevenLabs TTS request:', req.body.text?.substring(0, 50));
  
  // Return a small silent audio file (base64 encoded)
  const silentAudio = Buffer.from('UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=', 'base64');
  
  res.set('Content-Type', 'audio/mpeg');
  res.send(silentAudio);
});

app.get('/v1/voices', (req, res) => {
  res.json({
    voices: [
      { voice_id: 'mock-voice-1', name: 'Mock Australian Male', labels: { accent: 'australian' } },
      { voice_id: 'mock-voice-2', name: 'Mock Australian Female', labels: { accent: 'australian' } }
    ]
  });
});

// =============================================================================
// Stripe Mock (supplements Stripe test mode)
// =============================================================================
app.post('/v1/payment_intents', (req, res) => {
  console.log('[MOCK] Stripe PaymentIntent:', req.body.amount);
  res.json({
    id: 'pi_mock_' + Date.now(),
    object: 'payment_intent',
    amount: req.body.amount || 1000,
    currency: req.body.currency || 'aud',
    status: 'requires_payment_method',
    client_secret: 'pi_mock_secret_' + Date.now()
  });
});

app.post('/v1/customers', (req, res) => {
  console.log('[MOCK] Stripe Customer:', req.body.email);
  res.json({
    id: 'cus_mock_' + Date.now(),
    object: 'customer',
    email: req.body.email || 'mock@example.com',
    created: Math.floor(Date.now() / 1000)
  });
});

// =============================================================================
// Twilio Mock
// =============================================================================
app.post('/2010-04-01/Accounts/:accountSid/Messages.json', (req, res) => {
  console.log('[MOCK] Twilio SMS to:', req.body.To);
  res.json({
    sid: 'SM_mock_' + Date.now(),
    status: 'queued',
    to: req.body.To,
    body: req.body.Body
  });
});

// =============================================================================
// Generic Webhook Receiver
// =============================================================================
app.post('/webhooks/:service', (req, res) => {
  console.log(`[MOCK] Webhook received for ${req.params.service}:`, JSON.stringify(req.body).substring(0, 200));
  res.json({ received: true, service: req.params.service });
});

// =============================================================================
// Catch-all for unmocked endpoints
// =============================================================================
app.all('*', (req, res) => {
  console.log(`[MOCK] Unmocked endpoint: ${req.method} ${req.path}`);
  res.status(501).json({
    error: 'Not mocked',
    message: `This endpoint (${req.method} ${req.path}) is not yet mocked. Add it to mock-api/server.js`,
    timestamp: new Date().toISOString()
  });
});

// =============================================================================
// Start Server
// =============================================================================
app.listen(PORT, () => {
  console.log('='.repeat(60));
  console.log('Mock API Server Running');
  console.log('='.repeat(60));
  console.log(`Port: ${PORT}`);
  console.log(`ElevenLabs: ${process.env.MOCK_ELEVENLABS === 'true' ? 'MOCKED' : 'PASSTHROUGH'}`);
  console.log(`Stripe: ${process.env.MOCK_STRIPE === 'true' ? 'MOCKED' : 'PASSTHROUGH'}`);
  console.log(`Twilio: ${process.env.MOCK_TWILIO === 'true' ? 'MOCKED' : 'PASSTHROUGH'}`);
  console.log('='.repeat(60));
});
