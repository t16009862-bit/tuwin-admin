// Wraps an existing Vercel-style handler ((req, res) => ...) so it can run
// as a classic Netlify Function (event, context) => response. Kept as a thin
// shim rather than rewriting api/*.js, so the same handler code also still
// works unchanged on Vercel and in the local server/dev.js Express server.
function toNetlifyHandler(handler) {
  return async (event) => {
    let body = {};
    if (event.body) {
      try {
        body = JSON.parse(event.body);
      } catch {
        return { statusCode: 400, body: JSON.stringify({ error: 'Invalid JSON body' }) };
      }
    }

    const req = {
      method: event.httpMethod,
      query: event.queryStringParameters || {},
      body,
      headers: event.headers || {},
    };

    let statusCode = 200;
    let responseBody = {};
    const headers = { 'Content-Type': 'application/json' };

    const res = {
      status(code) {
        statusCode = code;
        return res;
      },
      json(obj) {
        responseBody = obj;
        return res;
      },
      setHeader(key, value) {
        headers[key] = value;
        return res;
      },
    };

    await handler(req, res);

    return { statusCode, headers, body: JSON.stringify(responseBody) };
  };
}

module.exports = { toNetlifyHandler };
