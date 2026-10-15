const FALLBACK_ORIGIN = "https://redriver-portfolio.pages.dev";
const ASSET_EXTENSION = /\.(?:avif|css|eot|gif|ico|jpe?g|js|json|map|mjs|otf|png|svg|txt|webmanifest|webp|woff2?|ttf)$/i;

function canServeStaticFallback(request, url) {
  if (request.method !== "GET" && request.method !== "HEAD") return false;

  const accept = request.headers.get("Accept") || "";
  if (accept.includes("text/html")) return true;
  if (url.pathname === "/") return true;

  // The fallback is a static site. Do not replace failed JSON/API requests
  // with an HTML page, but do fetch its static assets through the same hostname.
  return ASSET_EXTENSION.test(url.pathname);
}

function unavailableResponse() {
  return new Response(
    `<!doctype html><html lang="tr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="theme-color" content="#050505"><title>RedRiverLab — Geçici olarak erişilemiyor</title><style>*{box-sizing:border-box}body{margin:0;min-height:100vh;display:grid;place-items:center;background:#050505;color:#f5f5f5;font:14px/1.7 Inter,system-ui,sans-serif;padding:24px}.box{max-width:600px;border:1px solid #292929;border-radius:12px;padding:28px}small{font:10px monospace;color:#aaa;letter-spacing:.08em}h1{font-size:clamp(28px,6vw,44px);line-height:1.1;letter-spacing:-.04em}p{color:#aaa}</style></head><body><main class="box"><small>REDRIVERLAB / FAILOVER</small><h1>Yedek sayfa geçici olarak erişilemiyor.</h1><p>Ana sunucu ve statik yedek şu anda yanıt vermiyor. Lütfen kısa süre sonra tekrar deneyin.</p></main></body></html>`,
    {
      status: 503,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-store, max-age=0",
        "Retry-After": "30"
      }
    }
  );
}

async function serveFallback(request, requestUrl) {
  const fallbackUrl = new URL(requestUrl.pathname, FALLBACK_ORIGIN);
  const headers = new Headers();
  for (const name of ["accept", "accept-language", "user-agent"]) {
    const value = request.headers.get(name);
    if (value) headers.set(name, value);
  }

  // Never forward cookies, authorization, or the original URL query to the
  // Pages host. The fallback is a public static emergency page.
  const fallbackRequest = new Request(fallbackUrl.toString(), {
    method: request.method,
    headers,
    redirect: "manual"
  });

  try {
    const response = await fetch(fallbackRequest, {
      cf: { cacheTtl: 0, cacheEverything: false }
    });
    const responseHeaders = new Headers(response.headers);
    responseHeaders.set("Cache-Control", "no-store, max-age=0");
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders
    });
  } catch {
    return unavailableResponse();
  }
}

export default {
  async fetch(request) {
    const requestUrl = new URL(request.url);

    // Cloudflare Route redriverlab.me/* executes before the existing DNS origin.
    // fetch(request) below reaches that configured origin without changing the
    // visitor-visible URL. The proxied DNS record must remain in place.
    try {
      const originResponse = await fetch(request, {
        cf: { cacheTtl: 0, cacheEverything: false }
      });

      // A normal application response (including a real 4xx/redirect) means the
      // primary server answered. Only HTTP 5xx is treated as origin failure.
      if (originResponse.status < 500) return originResponse;

      if (!canServeStaticFallback(request, requestUrl)) return originResponse;

      if (originResponse.body) {
        originResponse.body.cancel().catch(() => {});
      }
      return await serveFallback(request, requestUrl);
    } catch {
      // DNS/origin connection failures and timeouts reach this path.
      if (!canServeStaticFallback(request, requestUrl)) {
        return new Response("Primary origin unavailable.", {
          status: 503,
          headers: {
            "Content-Type": "text/plain; charset=utf-8",
            "Cache-Control": "no-store, max-age=0",
            "Retry-After": "30"
          }
        });
      }
      return await serveFallback(request, requestUrl);
    }
  }
};
