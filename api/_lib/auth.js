const crypto = require('crypto');

// A high-entropy access code is checked only on the server. The code itself is
// never shipped in the public JavaScript bundle or committed to GitHub.
const DEFAULT_ACCESS_HASH = 'bd68ac229655d82efc0f08df5aefd906c0144ab6d7070e52349a162576d13b16';

function headerValue(req, name) {
  if (!req.headers) return '';
  if (typeof req.headers.get === 'function') return req.headers.get(name) || '';
  const direct = req.headers[name]
    ?? req.headers[name.toLowerCase()]
    ?? Object.entries(req.headers).find(([key]) => key.toLowerCase() === name.toLowerCase())?.[1];
  if (Array.isArray(direct)) return direct[0] || '';
  return String(direct ?? '');
}

function isAuthorized(req) {
  const key = headerValue(req, 'x-admin-key');
  if (!key) return false;

  const actual = crypto.createHash('sha256').update(key).digest();
  const expectedHex = process.env.ADMIN_ACCESS_HASH || DEFAULT_ACCESS_HASH;
  if (!/^[a-f0-9]{64}$/i.test(expectedHex)) return false;
  const expected = Buffer.from(expectedHex, 'hex');
  return actual.length === expected.length && crypto.timingSafeEqual(actual, expected);
}

function requireAdmin(req, res) {
  if (isAuthorized(req)) return true;
  res.setHeader?.('WWW-Authenticate', 'AdminKey');
  res.status(401).json({ error: 'Admin sign-in required' });
  return false;
}

module.exports = { requireAdmin };
