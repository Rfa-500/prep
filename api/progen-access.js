const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const MAX_FAILURES = 30;
const BLOCK_DURATION_MS = 15 * 60 * 1000;
const attemptsByIp = new Map();

function getClientIp(request) {
  const forwarded = request.headers['x-forwarded-for'];
  return (Array.isArray(forwarded) ? forwarded[0] : forwarded || request.socket?.remoteAddress || 'unknown')
    .split(',')[0]
    .trim();
}

function getAttemptRecord(ip) {
  const record = attemptsByIp.get(ip);
  if (!record || (record.blockedUntil && Date.now() >= record.blockedUntil)) {
    attemptsByIp.delete(ip);
    return { failures: 0, blockedUntil: 0 };
  }
  return record;
}

function hashesMatch(candidate, expected) {
  if (!/^[a-f0-9]{64}$/i.test(expected || '')) return false;
  const candidateBuffer = Buffer.from(candidate, 'hex');
  const expectedBuffer = Buffer.from(expected.toLowerCase(), 'hex');
  return candidateBuffer.length === expectedBuffer.length && crypto.timingSafeEqual(candidateBuffer, expectedBuffer);
}

function getConfiguredPasswordHash() {
  const value = String(process.env.PROGEN_ACCESS_PASSWORD_HASH || '').trim();
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
    return value.slice(1, -1).trim();
  }
  return value;
}

async function parseRequestBody(request) {
  if (request.body && typeof request.body === 'object' && !Buffer.isBuffer(request.body)) {
    return request.body;
  }

  let rawBody = '';
  if (typeof request.body === 'string' || Buffer.isBuffer(request.body)) {
    rawBody = request.body.toString();
  } else if (request[Symbol.asyncIterator]) {
    for await (const chunk of request) {
      rawBody += chunk.toString();
      if (rawBody.length > 4096) throw new Error('REQUEST_TOO_LARGE');
    }
  }

  if (!rawBody) return {};
  try {
    return JSON.parse(rawBody);
  } catch {
    throw new Error('INVALID_JSON');
  }
}

module.exports = async function handler(request, response) {
  response.setHeader('Cache-Control', 'no-store');

  if (request.method !== 'POST') {
    response.setHeader('Allow', 'POST');
    return response.status(405).json({ error: 'Method not allowed.' });
  }

  const ip = getClientIp(request);
  const record = getAttemptRecord(ip);
  if (record.blockedUntil > Date.now()) {
    response.setHeader('Retry-After', String(Math.ceil((record.blockedUntil - Date.now()) / 1000)));
    return response.status(429).json({ error: 'Too many failed attempts. Please try again later.' });
  }

  let body;
  try {
    body = await parseRequestBody(request);
  } catch (error) {
    const message = error.message === 'REQUEST_TOO_LARGE' ? 'Request body is too large.' : 'Request body must be valid JSON.';
    return response.status(400).json({ error: message });
  }

  const { password, action } = body;
  if (typeof password !== 'string' || password.length === 0 || password.length > 256 || !['verify', 'download', 'copy'].includes(action)) {
    return response.status(400).json({ error: 'A password and valid action are required.' });
  }

  const configuredHash = getConfiguredPasswordHash();
  if (!/^[a-f0-9]{64}$/i.test(configuredHash)) {
    return response.status(503).json({ error: 'Access is not configured. Set PROGEN_ACCESS_PASSWORD_HASH in Vercel.' });
  }

  const submittedHash = crypto.createHash('sha256').update(password, 'utf8').digest('hex');
  if (!hashesMatch(submittedHash, configuredHash)) {
    record.failures += 1;
    if (record.failures >= MAX_FAILURES) record.blockedUntil = Date.now() + BLOCK_DURATION_MS;
    attemptsByIp.set(ip, record);
    return response.status(401).json({ error: 'Incorrect password.' });
  }

  attemptsByIp.delete(ip);
  if (action === 'verify') {
    return response.status(200).json({ authenticated: true });
  }

  const scriptPath = path.join(process.cwd(), 'protected', 'progen-turbo.user.js');
  let script;
  try {
    script = fs.readFileSync(scriptPath, 'utf8');
  } catch {
    return response.status(500).json({ error: 'The protected script is temporarily unavailable.' });
  }

  if (action === 'download') {
    response.setHeader('Content-Type', 'application/javascript; charset=utf-8');
    response.setHeader('Content-Disposition', 'attachment; filename="progen-turbo.user.js"');
    return response.status(200).send(script);
  }

  return response.status(200).json({ script });
};
