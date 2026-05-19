const STORAGE_KEY = "result-board-data";

const sampleData = {
  updatedAt: "2026-05-16T09:30:00+05:30",
  settings: {
    heroImageUrl: "",
    categories: ["Arts", "Academics", "Sports", "General"],
    statuses: ["Published", "Upcoming", "Review"]
  },
  programs: [
    {
      id: "p1",
      title: "Classical Dance",
      category: "Arts",
      status: "Published",
      result: "First: Ananya Team",
      date: "2026-05-16",
      venue: "Main Stage",
      imageUrl: ""
    },
    {
      id: "p2",
      title: "Science Quiz",
      category: "Academics",
      status: "Review",
      result: "Results under verification",
      date: "2026-05-17",
      venue: "Seminar Hall",
      imageUrl: ""
    },
    {
      id: "p3",
      title: "Football Final",
      category: "Sports",
      status: "Upcoming",
      result: "Match starts at 4:00 PM",
      date: "2026-05-18",
      venue: "Ground A",
      imageUrl: ""
    }
  ],
  news: [
    {
      id: "n1",
      title: "Classical Dance result published",
      body: "The official poster is now available for download and sharing.",
      createdAt: "2026-05-16T09:30:00+05:30"
    },
    {
      id: "n2",
      title: "Quiz result checking in progress",
      body: "The final list will be published after verification.",
      createdAt: "2026-05-16T08:45:00+05:30"
    }
  ],
  schedules: [
    {
      id: "s1",
      title: "Prize Distribution",
      date: "2026-05-18",
      time: "17:00",
      venue: "Auditorium"
    },
    {
      id: "s2",
      title: "Cultural Night",
      date: "2026-05-19",
      time: "18:30",
      venue: "Open Stage"
    }
  ]
};

function getData() {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) {
    saveData(sampleData);
    return structuredClone(sampleData);
  }

  try {
    return normalizeData(JSON.parse(stored));
  } catch {
    saveData(sampleData);
    return structuredClone(sampleData);
  }
}

function normalizeData(data) {
  const normalized = data || {};
  normalized.settings = normalized.settings || {};
  normalized.programs = normalized.programs || [];
  normalized.news = normalized.news || [];
  normalized.schedules = normalized.schedules || [];

  const programCategories = normalized.programs.map((item) => item.category).filter(Boolean);
  const programStatuses = normalized.programs.map((item) => item.status).filter(Boolean);

  normalized.settings.categories = [...new Set([
    ...(normalized.settings.categories || sampleData.settings.categories),
    ...programCategories
  ])];
  normalized.settings.statuses = [...new Set([
    ...(normalized.settings.statuses || sampleData.settings.statuses),
    ...programStatuses
  ])];

  return normalized;
}

function saveData(data) {
  data = normalizeData(data);
  data.updatedAt = new Date().toISOString();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  window.dispatchEvent(new Event("resultBoardDataChanged"));
}

function formatDate(value) {
  if (!value) return "Date not set";
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeZone: "Asia/Kolkata"
  }).format(new Date(value));
}

function formatDateTime(value) {
  if (!value) return "Not updated yet";
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Kolkata"
  }).format(new Date(value));
}

function formatMonthDay(value) {
  if (!value) return { month: "TBA", day: "--" };
  const date = new Date(value);
  return {
    month: new Intl.DateTimeFormat("en-IN", { month: "short", timeZone: "Asia/Kolkata" }).format(date),
    day: new Intl.DateTimeFormat("en-IN", { day: "2-digit", timeZone: "Asia/Kolkata" }).format(date)
  };
}

function formatTime(value) {
  if (!value) return "Time TBA";
  const [hours, minutes] = value.split(":");
  const date = new Date();
  date.setHours(Number(hours), Number(minutes || 0), 0, 0);
  return new Intl.DateTimeFormat("en-IN", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true
  }).format(date);
}

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function extractGoogleDriveFileId(value) {
  const text = String(value || "").trim();
  const fileMatch = text.match(/drive\.google\.com\/file\/d\/([^/]+)/);
  const openMatch = text.match(/drive\.google\.com\/open\?id=([^&]+)/);
  const idMatch = text.match(/[?&]id=([^&]+)/);
  const userContentMatch = text.match(/googleusercontent\.com\/d\/([^/?]+)/);
  return fileMatch?.[1] || openMatch?.[1] || idMatch?.[1] || userContentMatch?.[1] || "";
}

function googleDriveImageUrls(fileId) {
  if (!fileId) return [];
  return [
    `https://drive.google.com/thumbnail?id=${fileId}&sz=w1600`,
    `https://lh3.googleusercontent.com/d/${fileId}=w1600`,
    `https://drive.google.com/uc?export=view&id=${fileId}`
  ];
}

function normalizePosterImageUrl(value) {
  const text = String(value || "").trim();
  const fileId = extractGoogleDriveFileId(text);
  return fileId ? googleDriveImageUrls(fileId)[0] : text;
}

function handlePosterImageError(image) {
  const fileId = image.dataset.driveId;
  const urls = googleDriveImageUrls(fileId);
  const nextIndex = Number(image.dataset.fallbackIndex || 0) + 1;

  if (nextIndex < urls.length) {
    image.dataset.fallbackIndex = String(nextIndex);
    image.src = urls[nextIndex];
    return;
  }

  image.hidden = true;
}

function getPosterColor(category) {
  const colors = {
    Arts: "#0f766e",
    Academics: "#264b96",
    Sports: "#9a5b10",
    General: "#596579"
  };
  return colors[category] || "#0f766e";
}

function posterMarkup(program) {
  const posterImageUrl = normalizePosterImageUrl(program.imageUrl);
  const driveFileId = extractGoogleDriveFileId(program.imageUrl);
  const image = posterImageUrl
    ? `<img src="${escapeHtml(posterImageUrl)}" data-drive-id="${escapeHtml(driveFileId)}" data-fallback-index="0" onerror="handlePosterImageError(this)" alt="">`
    : "";

  return `
    <div class="poster" style="background:${getPosterColor(program.category)}">
      ${image}
      <div class="poster-content">
        <div>
          <div class="eyebrow">${escapeHtml(program.category || "Program")}</div>
          <div class="poster-title">${escapeHtml(program.title)}</div>
        </div>
        <div class="poster-result">
          <strong>${escapeHtml(program.status)}</strong>
          <small>${escapeHtml(formatDate(program.date))}</small>
        </div>
      </div>
    </div>
  `;
}

function posterSvg(program) {
  const color = getPosterColor(program.category);
  const title = escapeHtml(program.title);
  const category = escapeHtml(program.category || "Program");
  const status = escapeHtml(program.status || "Update");
  const date = escapeHtml(formatDate(program.date));

  return `
    <svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1350" viewBox="0 0 1080 1350">
      <rect width="1080" height="1350" fill="${color}"/>
      <rect x="690" y="-80" width="360" height="520" rx="40" fill="rgba(255,255,255,0.16)" transform="rotate(25 690 -80)"/>
      <text x="90" y="160" fill="#d8fff8" font-family="Arial" font-size="42" font-weight="700">${category}</text>
      <foreignObject x="90" y="245" width="880" height="360">
        <div xmlns="http://www.w3.org/1999/xhtml" style="color:white;font-family:Arial;font-size:92px;font-weight:900;line-height:1.05;">${title}</div>
      </foreignObject>
      <rect x="90" y="860" width="900" height="310" rx="28" fill="rgba(0,0,0,0.24)"/>
      <text x="135" y="950" fill="#ffffff" font-family="Arial" font-size="54" font-weight="800">${status}</text>
      <text x="135" y="1045" fill="#ffffff" font-family="Arial" font-size="40">${date}</text>
      <text x="90" y="1265" fill="#d8fff8" font-family="Arial" font-size="30">Result Board</text>
    </svg>
  `;
}

function downloadPoster(programId) {
  const program = getData().programs.find((item) => item.id === programId);
  if (!program) return;

  const blob = new Blob([posterSvg(program)], { type: "image/svg+xml" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${program.title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-poster.svg`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

async function shareProgram(programId) {
  const program = getData().programs.find((item) => item.id === programId);
  if (!program) return;

  const url = `${location.origin}${location.pathname}#program-${program.id}`;
  const text = `${program.title}: ${program.result || program.status}`;

  if (navigator.share) {
    await navigator.share({ title: program.title, text, url });
    return;
  }

  await navigator.clipboard.writeText(`${text} ${url}`);
  alert("Share link copied.");
}

function openPoster(programId) {
  const program = getData().programs.find((item) => item.id === programId);
  const dialog = document.querySelector("#posterDialog");
  const dialogPoster = document.querySelector("#dialogPoster");
  if (!program || !dialog || !dialogPoster) return;

  dialogPoster.innerHTML = posterMarkup(program);
  dialog.showModal();
}

function renderPublicSite() {
  const grid = document.querySelector("#programGrid");
  if (!grid) return;

  const data = getData();
  data.settings = data.settings || {};
  const search = document.querySelector("#searchInput").value.trim().toLowerCase();
  const category = document.querySelector("#categoryFilter").value;
  const categories = [...new Set(data.settings.categories || [])].sort();
  const statuses = [...new Set(data.settings.statuses || [])];

  const categoryFilter = document.querySelector("#categoryFilter");
  const selected = categoryFilter.value;
  categoryFilter.innerHTML = `<option value="all">All categories</option>${categories.map((item) => `<option value="${escapeHtml(item)}">${escapeHtml(item)}</option>`).join("")}`;
  categoryFilter.value = categories.includes(selected) ? selected : "all";

  const statusFilter = document.querySelector("#statusFilter");
  const selectedStatus = statusFilter.value;
  statusFilter.innerHTML = `<option value="all">All statuses</option>${statuses.map((item) => `<option value="${escapeHtml(item)}">${escapeHtml(item)}</option>`).join("")}`;
  statusFilter.value = statuses.includes(selectedStatus) ? selectedStatus : "all";

  const filtered = data.programs.filter((program) => {
    const haystack = `${program.title} ${program.category} ${program.result} ${program.venue}`.toLowerCase();
    return (!search || haystack.includes(search))
      && (categoryFilter.value === "all" || program.category === categoryFilter.value)
      && (statusFilter.value === "all" || program.status === statusFilter.value);
  });

  const heroImage = document.querySelector("#heroImage");
  const heroImageUrl = normalizePosterImageUrl(data.settings.heroImageUrl);
  if (heroImageUrl) {
    heroImage.src = heroImageUrl;
    heroImage.dataset.driveId = extractGoogleDriveFileId(data.settings.heroImageUrl);
    heroImage.dataset.fallbackIndex = "0";
    heroImage.hidden = false;
  } else {
    heroImage.removeAttribute("src");
    heroImage.hidden = true;
  }

  document.querySelector("#lastUpdated").textContent = formatDateTime(data.updatedAt);
  document.querySelector("#resultCount").textContent = `${filtered.length} program${filtered.length === 1 ? "" : "s"}`;

  grid.innerHTML = filtered.length
    ? filtered.map((program) => `
      <article class="program-card" id="program-${escapeHtml(program.id)}">
        <button type="button" onclick="openPoster('${program.id}')" aria-label="Open poster for ${escapeHtml(program.title)}">
          ${posterMarkup(program)}
        </button>
        <div class="program-body">
          <span class="badge ${escapeHtml(program.status)}">${escapeHtml(program.status)}</span>
          <h3>${escapeHtml(program.title)}</h3>
          <div class="program-meta">
            <span>${escapeHtml(program.category || "Uncategorized")}</span>
            <span>${escapeHtml(formatDate(program.date))} | ${escapeHtml(program.venue || "Venue not set")}</span>
          </div>
          <div class="button-row">
            <button type="button" onclick="downloadPoster('${program.id}')">Download</button>
            <button type="button" onclick="shareProgram('${program.id}')">Share</button>
            <button class="ghost-button" type="button" onclick="openPoster('${program.id}')">View</button>
          </div>
        </div>
      </article>
    `).join("")
    : `<div class="empty">No programs match this search.</div>`;

  document.querySelector("#newsList").innerHTML = data.news
    .slice()
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .map((item, index) => `
      <article class="news-item">
        <div class="news-icon">${index === 0 ? "Live" : "Info"}</div>
        <div class="news-content">
          ${item.imageUrl ? `<img class="news-image" src="${escapeHtml(normalizePosterImageUrl(item.imageUrl))}" data-drive-id="${escapeHtml(extractGoogleDriveFileId(item.imageUrl))}" data-fallback-index="0" onerror="handlePosterImageError(this)" alt="">` : ""}
          <div class="news-topline">
            <span>${index === 0 ? "Latest" : "Update"}</span>
            <time class="news-time">${escapeHtml(formatDateTime(item.createdAt))}</time>
          </div>
          <h3>${escapeHtml(item.title)}</h3>
          <p>${escapeHtml(item.body)}</p>
        </div>
      </article>
    `).join("");

  document.querySelector("#scheduleList").innerHTML = data.schedules
    .slice()
    .sort((a, b) => `${a.date}T${a.time}`.localeCompare(`${b.date}T${b.time}`))
    .map((item) => {
      const dateParts = formatMonthDay(item.date);
      return `
      <article class="schedule-item">
        <div class="schedule-date">
          <span>${escapeHtml(dateParts.month)}</span>
          <strong>${escapeHtml(dateParts.day)}</strong>
        </div>
        <div class="schedule-content">
          <h3>${escapeHtml(item.title)}</h3>
          <span class="schedule-meta">${escapeHtml(formatTime(item.time))}</span>
          <span class="schedule-place">${escapeHtml(item.venue)}</span>
        </div>
      </article>
    `;
    }).join("");
}

document.addEventListener("DOMContentLoaded", () => {
  if (document.querySelector("#programGrid")) {
    renderPublicSite();
    document.querySelector("#searchInput").addEventListener("input", renderPublicSite);
    document.querySelector("#categoryFilter").addEventListener("change", renderPublicSite);
    document.querySelector("#statusFilter").addEventListener("change", renderPublicSite);
    document.querySelector("#closeDialog").addEventListener("click", () => document.querySelector("#posterDialog").close());
    window.addEventListener("storage", renderPublicSite);
    window.addEventListener("resultBoardDataChanged", renderPublicSite);
    setInterval(renderPublicSite, 15000);
  }
});
