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
      .sort((a, b) => new Date(b.pushed_at || b.updated_at || 0) - new Date(a.pushed_at || a.updated_at || 0))
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
        <span class="project-language">${esc(language)}</span>
      </article>`;
    }).join("");
  }

  async function loadRepos() {
    if (!username) {
      showMessage("GitHub hesabı yapılandırılmamış.");
      return;
    }
    try {
      const response = await fetch(`https://api.github.com/users/${encodeURIComponent(username)}/repos?per_page=100&sort=updated&type=owner`, {
        headers: { "Accept": "application/vnd.github+json" }
      });
      if (!response.ok) throw new Error(`GitHub API ${response.status}`);
      const repos = await response.json();
      if (!Array.isArray(repos)) throw new Error("Beklenmeyen GitHub yanıtı");
      renderRepos(repos);
    } catch (error) {
      console.warn("GitHub repositories could not be loaded:", error);
      showMessage("Proje listesi şu an yüklenemedi; tüm herkese açık depoları GitHub profilinde görebilirsin.");
    }
  }

  loadRepos();
})();
