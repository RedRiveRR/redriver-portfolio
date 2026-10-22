(() => {
  const config = window.SITE_CONFIG || {};
  const brand = config.brandName || "RedRiverLab";
  const username = (config.githubUsername || "").trim();
  const profileUrl = username ? `https://github.com/${encodeURIComponent(username)}` : "https://github.com";
  const $ = (id) => document.getElementById(id);

  ["brand-name", "footer-brand-name"].forEach((id) => {
    if ($(id)) $(id).textContent = brand.toUpperCase();
  });
  if ($("brand-logo")) $("brand-logo").src = config.logoPath || "/assets/rr-wordmark-horizontal-web.png";
  if ($("nav-github")) $("nav-github").href = profileUrl;
  if ($("all-repos-link")) $("all-repos-link").href = `${profileUrl}?tab=repositories`;

  const status = config.serverStatus === "online" ? "online" : "offline";
  const statusTitle = $("status-title");
  const statusMessage = $("status-message");
  const statusChip = $("status-chip-label");
  const statusPanel = document.querySelector(".status-panel");
  if (statusTitle) statusTitle.textContent = status === "online" ? "Ana sunucu yeniden çevrimiçi." : (config.serverStatusTitle || "Ana sunucu çevrimdışı.");
  if (statusMessage) statusMessage.textContent = config.serverStatusMessage || (status === "online"
    ? "Ana sunucu tekrar erişilebilir durumda."
    : "Ana sunucu şu anda erişilemiyor. Bu geçici yedek sayfa Cloudflare üzerinde bağımsız olarak yayınlanır.");
  if (statusChip) statusChip.textContent = status === "online" ? "SERVER ONLINE" : "SERVER OFFLINE";
  if (statusPanel) statusPanel.classList.toggle("is-online", status === "online");

  // The counter runs only on HTML injected by the failover Worker.
  // Its start time is stored in a Durable Object, not in visitor-local storage.
  const fallbackMarker = document.querySelector('meta[name="redriverlab-fallback"][content="active"]');
  const outageDuration = $("outage-duration");
  if (fallbackMarker && outageDuration) {
    let elapsedAtLastSync = 0;
    let localSyncTime = 0;
    let tickTimer = null;
    let checkingStatus = false;
    let reloadPending = false;

    function formatDuration(milliseconds) {
      const seconds = Math.max(0, Math.floor(milliseconds / 1000));
      const hours = Math.floor(seconds / 3600);
      const minutes = Math.floor((seconds % 3600) / 60);
      const remainingSeconds = seconds % 60;
      return hours + " saat " + minutes + " dk " + remainingSeconds + " sn";
    }

    function renderDuration() {
      if (!localSyncTime) return;
      const elapsed = elapsedAtLastSync + (Date.now() - localSyncTime);
      outageDuration.textContent = "Kesinti süresi: " + formatDuration(elapsed);
    }

    async function checkOriginStatus() {
      if (checkingStatus || reloadPending) return;
      checkingStatus = true;

      try {
        const response = await fetch("/_origin-status", {
          method: "GET",
          cache: "no-store",
          headers: { "Accept": "application/json" }
        });
        if (!response.ok) throw new Error("Origin status returned HTTP " + response.status);

        const current = await response.json();
        if (current.state === "offline" &&
            typeof current.offlineSince === "number" &&
            Number.isFinite(current.offlineSince)) {
          // Use the Worker-provided check time to avoid depending on the
          // visitor device's wall clock being perfectly synchronized.
          const serverNow = Number.isFinite(current.checkedAt) ? current.checkedAt : Date.now();
          elapsedAtLastSync = Math.max(0, serverNow - current.offlineSince);
          localSyncTime = Date.now();

          if (statusTitle) statusTitle.textContent = config.serverStatusTitle || "Ana sunucu çevrimdışı.";
          if (statusMessage) {
            statusMessage.textContent = config.serverStatusMessage ||
              "Geçici olarak yedek sayfa üzerinden hizmet veriyoruz. Ana sunucu tekrar yanıt verdiğinde normal yayın otomatik olarak devam eder.";
          }
          if (statusPanel) statusPanel.classList.remove("is-online");

          renderDuration();
          if (tickTimer === null) tickTimer = setInterval(renderDuration, 1000);
          return;
        }

        if (current.state === "online") {
          if (tickTimer !== null) clearInterval(tickTimer);
          tickTimer = null;
          reloadPending = true;
          if (statusTitle) statusTitle.textContent = "Ana sunucu yeniden çevrimiçi.";
          if (statusMessage) statusMessage.textContent = "Bağlantı geri geldi. Normal site yükleniyor…";
          if (statusPanel) statusPanel.classList.add("is-online");
          outageDuration.textContent = "Kesinti süresi sıfırlandı.";
          // Replace the fallback view with the primary website after the
          // Worker has confirmed a successful primary-origin response.
          setTimeout(() => window.location.reload(), 1200);
          return;
        }

        if (!localSyncTime) outageDuration.textContent = "Kesinti süresi şu an alınamıyor.";
      } catch {
        if (!localSyncTime) outageDuration.textContent = "Kesinti süresi hesaplanıyor…";
      } finally {
        checkingStatus = false;
      }
    }

    void checkOriginStatus();
    setInterval(checkOriginStatus, 15000);
  }


  const grid = $("project-grid");
  const count = $("project-count");
  const esc = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[char]);
  const safeUrl = (value) => {
    try {
      const url = new URL(value);
      return ["http:", "https:"].includes(url.protocol) ? url.href : "";
    } catch { return ""; }
  };

  function showMessage(message) {
    if (count) count.textContent = "GITHUB / ŞU ANDA ERİŞİLEMİYOR";
    if (grid) grid.innerHTML = `<p class="project-empty">${esc(message)} <a href="${esc(profileUrl)}" target="_blank" rel="noopener noreferrer">GitHub profilini aç ↗</a></p>`;
  }

  function renderRepos(repos) {
    const visible = repos
      .filter((repo) => !repo.private && !repo.fork && !repo.archived)
      .sort((a, b) => {
        const starDifference = Number(b.stargazers_count || 0) - Number(a.stargazers_count || 0);
        if (starDifference !== 0) return starDifference;
        return new Date(b.pushed_at || b.updated_at || 0) - new Date(a.pushed_at || a.updated_at || 0);
      })
      .slice(0, 6);

    if (count) count.textContent = visible.length
      ? `HERKESE AÇIK DEPOLAR / ${String(visible.length).padStart(2, "0")}`
      : "GITHUB / GÖSTERİLECEK DEPO YOK";
    if (!grid) return;
    if (!visible.length) {
      showMessage("Şimdilik gösterilecek herkese açık depo yok.");
      return;
    }

    grid.innerHTML = visible.map((repo, index) => {
      const url = safeUrl(repo.html_url) || profileUrl;
      const description = repo.description || "Bu proje için açıklama eklenmemiş.";
      const language = repo.language || "Çeşitli teknolojiler";
      return `<article class="project-row">
        <span class="project-number">${String(index + 1).padStart(2, "0")}</span>
        <div class="project-main">
          <a class="project-title" href="${esc(url)}" target="_blank" rel="noopener noreferrer">${esc(repo.name)} ↗</a>
          <p class="project-description">${esc(description)}</p>
        </div>
        <span class="project-language">${esc(language)} · ★ ${Number(repo.stargazers_count || 0)}</span>
      </article>`;
    }).join("");
  }

  // The list is shown from a same-origin snapshot (/repos.json) first, so it does not depend on
  // GitHub's anonymous rate limit (60 requests/hour per IP, shared by everyone behind the same
  // address). The live GitHub API then refreshes it; if that fails, the snapshot stays on screen.
  async function loadRepos() {
    if (!username) {
      showMessage("GitHub hesabı yapılandırılmamış.");
      return;
    }
    let shown = false;
    try {
      const snapshot = await fetch("/repos.json", { cache: "no-cache" });
      if (snapshot.ok) {
        const repos = await snapshot.json();
        if (Array.isArray(repos)) { renderRepos(repos); shown = true; }
      }
    } catch { /* the snapshot is optional */ }
    try {
      const response = await fetch(`https://api.github.com/users/${encodeURIComponent(username)}/repos?per_page=100&sort=updated&type=owner`, {
        headers: { "Accept": "application/vnd.github+json" }
      });
      if (!response.ok) throw new Error(`GitHub API ${response.status}`);
      const repos = await response.json();
      if (!Array.isArray(repos)) throw new Error("Beklenmeyen GitHub yanıtı");
      renderRepos(repos);
    } catch (error) {
      console.warn("GitHub repositories could not be refreshed:", error);
      if (!shown) showMessage("Proje listesi şu an yüklenemedi; tüm herkese açık depoları GitHub profilinde görebilirsin.");
    }
  }

  loadRepos();
})();
