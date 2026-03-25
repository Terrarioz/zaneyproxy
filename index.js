/**
 * ZaneyProxy — Cloudflare Worker
 * Fetches any URL server-side and relays it back with CORS headers,
 * so the GitHub Pages frontend can load it in an iframe or display it.
 *
 * Usage:
 *   GET https://your-worker.workers.dev/?url=https://example.com
 */

const ALLOWED_ORIGIN = '*'; // Lock this down to your GitHub Pages URL for extra security
                             // e.g. 'https://yourusername.github.io'

addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request));
});

async function handleRequest(request) {
  // Handle CORS preflight
  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders() });
  }

  const url = new URL(request.url);
  const target = url.searchParams.get('url');

  // No URL provided — return a health-check page
  if (!target) {
    return new Response(
      JSON.stringify({ status: 'ok', message: 'ZaneyProxy worker is running. Pass ?url= to proxy a request.' }),
      { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders() } }
    );
  }

  // Validate the target URL
  let targetUrl;
  try {
    targetUrl = new URL(target);
  } catch {
    return errorResponse(400, 'Invalid URL: ' + target);
  }

  // Only allow http/https
  if (!['http:', 'https:'].includes(targetUrl.protocol)) {
    return errorResponse(400, 'Only http/https URLs are allowed.');
  }

  try {
    // Forward the request to the target
    const fetchResponse = await fetch(targetUrl.toString(), {
      method: request.method === 'GET' ? 'GET' : request.method,
      headers: buildForwardHeaders(request, targetUrl),
      redirect: 'follow',
    });

    const contentType = fetchResponse.headers.get('content-type') || '';

    // For HTML pages: rewrite links so relative URLs resolve correctly,
    // and inject a base tag pointing at the target origin.
    if (contentType.includes('text/html')) {
      let html = await fetchResponse.text();
      html = rewriteHtml(html, targetUrl);
      return new Response(html, {
        status: fetchResponse.status,
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
          'X-Proxied-Url': targetUrl.toString(),
          ...corsHeaders(),
        },
      });
    }

    // For CSS / JS / images etc. — stream through as-is
    const body = await fetchResponse.arrayBuffer();
    const headers = {
      'Content-Type': contentType || 'application/octet-stream',
      'X-Proxied-Url': targetUrl.toString(),
      ...corsHeaders(),
    };

    return new Response(body, { status: fetchResponse.status, headers });

  } catch (err) {
    return errorResponse(502, 'Worker fetch error: ' + err.message);
  }
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': '*',
  };
}

function errorResponse(status, message) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders() },
  });
}

function buildForwardHeaders(request, targetUrl) {
  return {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9',
    'Accept-Encoding': 'identity',
    'Referer': targetUrl.origin + '/',
    'Host': targetUrl.host,
  };
}

/**
 * Rewrite HTML so that:
 * 1. A <base href> is injected — this fixes most relative links automatically.
 * 2. src/href attributes that are absolute paths get rewritten through the worker.
 */
function rewriteHtml(html, targetUrl) {
  const origin = targetUrl.origin;
  const workerBase = 'https://zaneyproxy.YOUR-SUBDOMAIN.workers.dev/?url='; // replaced at runtime below

  // Inject <base href> right after <head> (or at the start if no <head>)
  const baseTag = `<base href="${origin}/">`;
  if (/<head[\s>]/i.test(html)) {
    html = html.replace(/(<head[^>]*>)/i, '$1\n  ' + baseTag);
  } else {
    html = baseTag + '\n' + html;
  }

  // Remove X-Frame-Options and CSP meta tags that would block iframe display
  html = html.replace(/<meta[^>]+http-equiv=["']?(x-frame-options|content-security-policy)["']?[^>]*>/gi, '');

  return html;
}
