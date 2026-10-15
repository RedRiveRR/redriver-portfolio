(() => {
  const config = window.SITE_CONFIG || {};
  const brand = config.brandName || "Your Brand";
  const username = (config.githubUsername || "").trim();
  const profileUrl = username ? `https://github.com/${encodeURIComponent(username)}` : "https://github.com";
  const $ = (id) => document.getElementById(id);

  ["brand-name", "footer-brand-name", "footer-copy-name"].forEach((id) => {
    if ($(id)) $(id).textContent = brand.toUpperCase();
  });
  if ($("brand-logo")) $("brand-logo").src = config.logoPath || "/assets/logo.svg";
  ["nav-github", "hero-github", "contact-github"].forEach((id) => {
    if ($(id)) $(id).href = profileUrl;
  });
  if ($("all-repos-link")) $("all-repos-link").href = `${profileUrl}?tab=repositories`;
  if ($("year")) $("year").textContent = new Date().getFullYear();

  const status = config.serverStatus === "online" ? "online" : "offline";
  const statusTitle = $("status-title");
  const statusMessage = $("status-message");
  const statusChip = $("status-chip-label");
  const statusPanel = document.querySelector(".status-panel");
  if (statusTitle) statusTitle.textContent = status === "online" ? "Çevrimiçi" : (config.serverStatusTitle || "Ana sunucu çevrimdışı.");
  if (statusMessage) statusMessage.textContent = config.serverStatusMessage || (status === "online" ? "Ana sunucu çalışıyor." : "Ana sunucu şu anda erişilemiyor. Bu portföy, ana sunucudan bağımsız olarak Cloudflare üzerinde yayınlanır.");
  if (statusChip) statusChip.textContent = status === "online" ? "SERVER ONLINE" : "SERVER OFFLINE";
  if (statusPanel) statusPanel.classList.toggle("is-online", status === "online");

  const grid = $("project-grid");
  const count = $("project-count");
  const esc = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;", "'":"&#39;"})[char]);
  const validHttpUrl = (value) => {
    try { const url = new URL(value); return ["http:", "https:"].includes(url.protocol) ? url.href : ""; }
    catch { return ""; }
  };
  const dateLabel = (dateString) => {
    if (!dateString) return "Güncelleme bilgisi yok";
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return "Güncelleme bilgisi yok";
    return `Güncelleme: ${new Intl.DateTimeFormat("tr-TR", { day: "2-digit", month: "short", year: "numeric" }).format(date)}`;
  };

  function showMessage(title, description, linkText = "GitHub profilini aç") {
    if (count) count.textContent = "REPOSITORIES / UNAVAILABLE";
    if (!grid) return;
    grid.innerHTML = `<article class="empty-card"><div class="empty-symbol" aria-hidden="true">↗</div><h3>${esc(title)}</h3><p>${esc(description)}</p><a class="text-link" href="${esc(profileUrl)}" target="_blank" rel="noreferrer">${esc(linkText)} <span aria-hidden="true">↗</span></a></article>`;
  }

  function renderRepos(repos) {
    const publicRepos = repos
      .filter((repo) => !repo.private && !repo.fork && !repo.archived)
      .sort((a, b) => new Date(b.pushed_at || b.updated_at || 0) - new Date(a.pushed_at || a.updated_at || 0))
      .slice(0, 9);
    if (count) count.textContent = `REPOSITORIES / ${String(publicRepos.length).padStart(2, "0")}`;
    if (!grid) return;
    if (!publicRepos.length) {
      showMessage("Henüz gösterilecek depo yok", "Profilinde herkese açık ve arşivlenmemiş depolar görünür olduğunda burada listelenecek.", "GitHub depoları");
      return;
    }
    grid.innerHTML = publicRepos.map((repo, index) => {
      const repoUrl = validHttpUrl(repo.html_url) || profileUrl;
      const homepage = validHttpUrl(repo.homepage);
      const description = repo.description || "Bu proje için henüz bir açıklama eklenmemiş.";
      const language = repo.language || "Çeşitli teknolojiler";
      const stars = Number(repo.stargazers_count || 0);
      const forks = Number(repo.forks_count || 0);
      return `<article class="project-card" style="--card-index:${index}">
        <div class="card-topline"><span class="card-index">${String(index + 1).padStart(2, "0")}</span><span class="repo-mark" aria-hidden="true">⌘</span></div>
        <h3><a href="${esc(repoUrl)}" target="_blank" rel="noreferrer">${esc(repo.name)} <span aria-hidden="true">↗</span></a></h3>
        <p class="repo-description">${esc(description)}</p>
        <div class="repo-stats"><span class="language-dot"></span><span>${esc(language)}</span><span class="stat-separator">/</span><span title="Yıldız">☆ ${stars}</span><span title="Fork">⑂ ${forks}</span></div>
        <div class="card-bottom"><span>${esc(dateLabel(repo.pushed_at || repo.updated_at))}</span><div class="card-links"><a href="${esc(repoUrl)}" target="_blank" rel="noreferrer" aria-label="${esc(repo.name)} GitHub deposu">CODE ↗</a>${homepage ? `<a href="${esc(homepage)}" target="_blank" rel="noreferrer">LIVE ↗</a>` : ""}</div></div>
      </article>`;
    }).join("");
  }

  async function loadRepos() {
    if (!username) {
      showMessage("GitHub hesabı ayarlanmamış", "site-config.js içindeki githubUsername alanına kullanıcı adını yaz.");
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
      showMessage("Projeler şu an yüklenemedi", "GitHub API geçici olarak yanıt vermiyor veya kullanıcı adı yanlış. Projelere profil bağlantısından ulaşabilirsin.");
    }
  }

  loadRepos();
})();
