const PRIMARY_SITE = "https://redriverlab.com";
const PRIMARY_HOST = new URL(PRIMARY_SITE).hostname.toLowerCase();
const HEALTHCHECK_TIMEOUT_MS = 2000;

// This is a Pages Function middleware. It only probes the main site for HTML
// navigations; CSS, JS, images and other static assets are served normally.
export async function onRequest(context) {
  const { request } = context;
  const requestUrl = new URL(request.url);
  const accept = request.headers.get("Accept") || "";

  if (request.method !== "GET" || !accept.includes("text/html")) {
    return context.next();
  }

  // Emergency override: append ?stay=1 to preview the fallback page directly.
  if (requestUrl.searchParams.get("stay") === "1") {
    return context.next();
  }

  // Never redirect redriverlab.com to itself; that would create a redirect loop
  // if this fallback is later attached to the primary hostname.
  if (requestUrl.hostname.toLowerCase() === PRIMARY_HOST) {
    return context.next();
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort("Primary-site probe timed out"), HEALTHCHECK_TIMEOUT_MS);

  try {
    const probeUrl = new URL("/", PRIMARY_SITE);
    probeUrl.searchParams.set("__rr_failover_probe", String(Date.now()));

    const response = await fetch(probeUrl.toString(), {
      method: "GET",
      redirect: "follow",
      signal: controller.signal,
      headers: {
        "Accept": "text/html",
        "Cache-Control": "no-cache, no-store, max-age=0",
        "Pragma": "no-cache"
      }
    });

    // We only need the status code, not the document body.
    if (response.body) {
      response.body.cancel().catch(() => {});
    }

    if (response.status >= 200 && response.status < 300) {
      const destination = new URL(requestUrl.pathname + requestUrl.search, PRIMARY_SITE);
      return new Response(null, {
        status: 302,
        headers: {
          "Location": destination.toString(),
          "Cache-Control": "no-store, max-age=0"
        }
      });
    }
  } catch {
    // Unreachable, timed out, or an HTTP error: let the static fallback render.
  } finally {
    clearTimeout(timeout);
  }

  return context.next();
}
