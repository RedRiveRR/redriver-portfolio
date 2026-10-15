import { DurableObject } from "cloudflare:workers";

const FALLBACK_ORIGIN = "https://redriver-portfolio.pages.dev";
const STATUS_PATH = "/_origin-status";
let lastObservedOriginState = "unknown";
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

    // Mark only Worker-served fallback HTML so its duration script never runs
    // on the live primary website.
    if (request.method === "GET" && (response.headers.get("content-type") || "").includes("text/html")) {
      let html = await response.text();
      const marker = '<meta name="redriverlab-fallback" content="active">';
      if (!html.includes(marker)) html = html.replace(/<\/head>/i, marker + "\n</head>");
      responseHeaders.delete("content-length");
      responseHeaders.delete("content-encoding");
      responseHeaders.delete("etag");
      return new Response(html, {
        status: response.status,
        statusText: response.statusText,
        headers: responseHeaders
      });
    }

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders
    });
  } catch {
    return unavailableResponse();
  }
}

async function syncOriginStatus(env, state, force = false) {
  if (!force && lastObservedOriginState === state) {
    return { state, offlineSince: null };
  }

  try {
    if (!env.ORIGIN_STATUS) throw new Error("ORIGIN_STATUS binding is missing");
    const id = env.ORIGIN_STATUS.idFromName("redriverlab-primary-origin");
    const stub = env.ORIGIN_STATUS.get(id);
    const response = await stub.fetch(new Request("https://origin-status/" + state, {
      method: "POST"
    }));
    if (!response.ok) throw new Error("Origin status storage returned " + response.status);

    const result = await response.json();
    if (result.state !== "unknown") lastObservedOriginState = result.state;
    return result;
  } catch (error) {
    // Tracking must never take the site down. The fallback remains available
    // even if the status store is temporarily unavailable.
    return { state: "unknown", offlineSince: null };
  }
}

function statusJson(payload) {
  return new Response(JSON.stringify(payload), {
    status: 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store, max-age=0",
      "X-Content-Type-Options": "nosniff"
    }
  });
}

/** Stores the first failed-origin timestamp across Worker isolates and restarts. */
export class OriginStatus extends DurableObject {
  async fetch(request) {
    if (request.method !== "POST") {
      return new Response("Method not allowed", {
        status: 405,
        headers: { "Allow": "POST", "Cache-Control": "no-store" }
      });
    }

    const { pathname } = new URL(request.url);
    const now = Date.now();

    if (pathname === "/offline") {
      const offlineSince = await this.ctx.storage.transaction(async (txn) => {
        const initialized = await txn.get("offlineCounterSeeded");
        const stored = await txn.get("offlineSince");

        // Seed the outage already in progress to 1085 hours, once only.
        // After the first recovery, future outages use their true first-failure time.
        if (initialized !== true) {
          const seededSince = now - (1085 * 60 * 60 * 1000);
          await txn.put("offlineCounterSeeded", true);
          await txn.put("offlineSince", seededSince);
          return seededSince;
        }

        if (typeof stored === "number" && Number.isFinite(stored)) return stored;

        await txn.put("offlineSince", now);
        return now;
      });

      return Response.json({ state: "offline", offlineSince, observedAt: now }, {
        headers: { "Cache-Control": "no-store, max-age=0" }
      });
    }

    if (pathname === "/online") {
      await this.ctx.storage.transaction(async (txn) => {
        await txn.delete("offlineSince");
        // Mark one-time initialization done so any later outage starts at zero.
        await txn.put("offlineCounterSeeded", true);
      });
      return Response.json({ state: "online", offlineSince: null, observedAt: now }, {
        headers: { "Cache-Control": "no-store, max-age=0" }
      });
    }

    return new Response("Not found", { status: 404 });
  }
}

export default {
  async fetch(request, env) {
    const requestUrl = new URL(request.url);
    const isStatusRequest = requestUrl.pathname === STATUS_PATH;

    if (isStatusRequest && request.method !== "GET" && request.method !== "HEAD") {
      return new Response("Method not allowed", {
        status: 405,
        headers: { "Allow": "GET, HEAD", "Cache-Control": "no-store, max-age=0" }
      });
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort("Primary origin timed out"), 4000);

    try {
      // The status endpoint probes the real homepage, not this synthetic path,
      // so an application-level 404 on /_origin-status cannot look like an outage.
      const originRequest = isStatusRequest
        ? new Request(new URL("/", requestUrl).toString(), {
            method: "GET",
            headers: { "Accept": "text/html", "Cache-Control": "no-cache" },
            redirect: "manual"
          })
        : request;

      const fetchOptions = { signal: controller.signal };
      if (originRequest.method === "GET" || originRequest.method === "HEAD") {
        fetchOptions.cf = {
          cacheTtl: 0,
          cacheEverything: false,
          // Both apex and www reach the real primary through the proxied www A record.
          // resolveOverride changes DNS resolution only; the request hostname stays intact.
          resolveOverride: "www.redriverlab.me"
        };
      }

      const originResponse = await fetch(originRequest, fetchOptions);
      const primaryIsResponding = originResponse.status < 500;

      if (isStatusRequest) {
        if (originResponse.body) originResponse.body.cancel().catch(() => {});
        if (primaryIsResponding) {
          const saved = await syncOriginStatus(env, "online", true);
          return statusJson({
            state: saved.state === "online" ? "online" : "unknown",
            offlineSince: null,
            checkedAt: Date.now()
          });
        }

        const saved = await syncOriginStatus(env, "offline", true);
        return statusJson({
          state: saved.state === "offline" ? "offline" : "unknown",
          offlineSince: saved.state === "offline" ? saved.offlineSince : null,
          checkedAt: Date.now()
        });
      }

      // Any non-5xx origin response (including normal 4xx/redirect responses)
      // means the host answered. A successful page request force-checks persistent
      // state so another Worker isolate cannot leave a stale offline timestamp.
      if (primaryIsResponding) {
        const accept = request.headers.get("Accept") || "";
        const isPageRequest = request.method === "GET" &&
          (requestUrl.pathname === "/" || accept.includes("text/html"));
        await syncOriginStatus(env, "online", isPageRequest);
        return originResponse;
      }

      await syncOriginStatus(env, "offline");
      if (!canServeStaticFallback(request, requestUrl)) return originResponse;

      if (originResponse.body) originResponse.body.cancel().catch(() => {});
      return await serveFallback(request, requestUrl);
    } catch {
      if (isStatusRequest) {
        const saved = await syncOriginStatus(env, "offline", true);
        return statusJson({
          state: saved.state === "offline" ? "offline" : "unknown",
          offlineSince: saved.state === "offline" ? saved.offlineSince : null,
          checkedAt: Date.now()
        });
      }

      await syncOriginStatus(env, "offline");
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
    } finally {
      clearTimeout(timeout);
    }
  }
};
