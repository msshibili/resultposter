const ADMIN_USERNAME = "admin";
const ADMIN_PASSWORD = "admin123";
const ADMIN_AUTH_KEY = "result-board-admin-auth";

function uid(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function isAdminLoggedIn() {
  return sessionStorage.getItem(ADMIN_AUTH_KEY) === "true";
}

function setAdminView(isLoggedIn) {
  document.querySelector("#loginPanel").hidden = isLoggedIn;
  document.querySelector("#adminPanel").hidden = !isLoggedIn;
  document.querySelector("#logoutAdmin").hidden = !isLoggedIn;

  if (isLoggedIn) {
    renderSiteSettings();
    renderManagedLists();
    renderAdminPrograms();
  }
}

function renderSiteSettings() {
  const data = getData();
  document.querySelector("#siteHeroImage").value = data.settings?.heroImageUrl || "";
}

function renderManagedLists() {
  const data = getData();
  const categories = data.settings.categories || [];
  const statuses = data.settings.statuses || [];

  document.querySelector("#programCategory").innerHTML = categories
    .map((item) => `<option value="${escapeHtml(item)}">${escapeHtml(item)}</option>`)
    .join("");

  document.querySelector("#programStatus").innerHTML = statuses
    .map((item) => `<option value="${escapeHtml(item)}">${escapeHtml(item)}</option>`)
    .join("");

  document.querySelector("#categoryList").innerHTML = categories
    .map((item) => `
      <span class="chip">${escapeHtml(item)}
        <button type="button" onclick="removeListItem('categories', '${encodeURIComponent(item)}')" aria-label="Remove ${escapeHtml(item)}">x</button>
      </span>
    `).join("");

  document.querySelector("#statusList").innerHTML = statuses
    .map((item) => `
      <span class="chip">${escapeHtml(item)}
        <button type="button" onclick="removeListItem('statuses', '${encodeURIComponent(item)}')" aria-label="Remove ${escapeHtml(item)}">x</button>
      </span>
    `).join("");
}

function addListItem(listName, value) {
  const text = value.trim();
  if (!text) return;

  const data = getData();
  data.settings[listName] = data.settings[listName] || [];
  if (!data.settings[listName].includes(text)) {
    data.settings[listName].push(text);
    saveData(data);
  }
  renderManagedLists();
}

function removeListItem(listName, value) {
  value = decodeURIComponent(value);
  const data = getData();
  const inUse = data.programs.some((program) => program.category === value || program.status === value);
  if (inUse && !confirm("This item is used by existing programs. Remove it from the list anyway?")) return;

  data.settings[listName] = (data.settings[listName] || []).filter((item) => item !== value);
  saveData(data);
  renderManagedLists();
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener("load", () => resolve(reader.result));
    reader.addEventListener("error", () => reject(reader.error));
    reader.readAsDataURL(file);
  });
}

function clearProgramForm() {
  document.querySelector("#programForm").reset();
  document.querySelector("#programId").value = "";
}

function renderAdminPrograms() {
  const data = getData();
  const list = document.querySelector("#adminPrograms");

  list.innerHTML = data.programs.length
    ? data.programs.map((program) => `
      <article class="admin-item">
        <h3>${escapeHtml(program.title)}</h3>
        <span class="program-meta">${escapeHtml(program.category)} | ${escapeHtml(program.status)} | ${escapeHtml(formatDate(program.date))}</span>
        <div class="button-row">
          <button type="button" onclick="editProgram('${program.id}')">Edit</button>
          <button class="danger-button" type="button" onclick="deleteProgram('${program.id}')">Delete</button>
        </div>
      </article>
    `).join("")
    : `<div class="empty">No programs yet.</div>`;
}

function editProgram(programId) {
  const program = getData().programs.find((item) => item.id === programId);
  if (!program) return;

  document.querySelector("#programId").value = program.id;
  document.querySelector("#programTitle").value = program.title || "";
  document.querySelector("#programCategory").value = program.category || "";
  document.querySelector("#programStatus").value = program.status || "Published";
  document.querySelector("#programResult").value = program.result || "";
  document.querySelector("#programDate").value = program.date || "";
  document.querySelector("#programVenue").value = program.venue || "";
  document.querySelector("#programImage").value = program.imageUrl || "";
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function deleteProgram(programId) {
  if (!confirm("Delete this program?")) return;
  const data = getData();
  data.programs = data.programs.filter((item) => item.id !== programId);
  saveData(data);
  renderAdminPrograms();
}

function parseCsvLine(line) {
  const cells = [];
  let current = "";
  let quoted = false;

  for (const char of line) {
    if (char === '"') {
      quoted = !quoted;
    } else if (char === "," && !quoted) {
      cells.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }

  cells.push(current.trim());
  return cells;
}

function bulkAddPrograms() {
  const text = document.querySelector("#bulkPrograms").value.trim();
  if (!text) return;

  const data = getData();
  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const rows = lines[0]?.toLowerCase().startsWith("title,") ? lines.slice(1) : lines;

  rows.forEach((line) => {
    const [title, category, status, result, date, venue, imageUrl] = parseCsvLine(line);
    if (!title) return;

    data.programs.unshift({
      id: uid("p"),
      title,
      category: category || data.settings.categories[0] || "General",
      status: status || data.settings.statuses[0] || "Upcoming",
      result: result || "",
      date: date || "",
      venue: venue || "",
      imageUrl: normalizePosterImageUrl(imageUrl || "")
    });

    if (category && !data.settings.categories.includes(category)) data.settings.categories.push(category);
    if (status && !data.settings.statuses.includes(status)) data.settings.statuses.push(status);
  });

  saveData(data);
  document.querySelector("#bulkPrograms").value = "";
  renderManagedLists();
  renderAdminPrograms();
}

document.addEventListener("DOMContentLoaded", () => {
  setAdminView(isAdminLoggedIn());

  document.querySelector("#loginForm").addEventListener("submit", (event) => {
    event.preventDefault();
    const username = document.querySelector("#adminUsername").value.trim();
    const password = document.querySelector("#adminPassword").value;
    const loginError = document.querySelector("#loginError");

    if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
      sessionStorage.setItem(ADMIN_AUTH_KEY, "true");
      event.target.reset();
      loginError.hidden = true;
      setAdminView(true);
      return;
    }

    loginError.hidden = false;
  });

  document.querySelector("#logoutAdmin").addEventListener("click", () => {
    sessionStorage.removeItem(ADMIN_AUTH_KEY);
    setAdminView(false);
  });

  document.querySelector("#programForm").addEventListener("submit", (event) => {
    event.preventDefault();
    const data = getData();
    const id = document.querySelector("#programId").value || uid("p");
    const program = {
      id,
      title: document.querySelector("#programTitle").value.trim(),
      category: document.querySelector("#programCategory").value.trim(),
      status: document.querySelector("#programStatus").value,
      result: document.querySelector("#programResult").value.trim(),
      date: document.querySelector("#programDate").value,
      venue: document.querySelector("#programVenue").value.trim(),
      imageUrl: document.querySelector("#programImage").value.trim()
    };

    const index = data.programs.findIndex((item) => item.id === id);
    if (index >= 0) {
      data.programs[index] = program;
    } else {
      data.programs.unshift(program);
    }

    saveData(data);
    clearProgramForm();
    renderManagedLists();
    renderAdminPrograms();
  });

  document.querySelector("#clearProgram").addEventListener("click", clearProgramForm);

  document.querySelector("#addCategory").addEventListener("click", () => {
    addListItem("categories", document.querySelector("#newCategory").value);
    document.querySelector("#newCategory").value = "";
  });

  document.querySelector("#addStatus").addEventListener("click", () => {
    addListItem("statuses", document.querySelector("#newStatus").value);
    document.querySelector("#newStatus").value = "";
  });

  document.querySelector("#bulkAddPrograms").addEventListener("click", bulkAddPrograms);

  document.querySelector("#programImageFile").addEventListener("change", async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    document.querySelector("#programImage").value = await readFileAsDataUrl(file);
  });

  document.querySelector("#saveSiteSettings").addEventListener("click", () => {
    const data = getData();
    data.settings = data.settings || {};
    data.settings.heroImageUrl = normalizePosterImageUrl(document.querySelector("#siteHeroImage").value);
    saveData(data);
    renderSiteSettings();
  });

  document.querySelector("#siteHeroImage").addEventListener("blur", (event) => {
    event.target.value = normalizePosterImageUrl(event.target.value);
  });

  document.querySelector("#siteHeroFile").addEventListener("change", async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const data = getData();
    data.settings = data.settings || {};
    data.settings.heroImageUrl = await readFileAsDataUrl(file);
    saveData(data);
    renderSiteSettings();
  });

  document.querySelector("#programImage").addEventListener("blur", (event) => {
    event.target.value = normalizePosterImageUrl(event.target.value);
  });

  document.querySelector("#newsForm").addEventListener("submit", (event) => {
    event.preventDefault();
    const data = getData();
    data.news.unshift({
      id: uid("n"),
      title: document.querySelector("#newsTitle").value.trim(),
      body: document.querySelector("#newsBody").value.trim(),
      imageUrl: normalizePosterImageUrl(document.querySelector("#newsImage").value.trim()),
      createdAt: new Date().toISOString()
    });
    saveData(data);
    event.target.reset();
  });

  document.querySelector("#newsImage").addEventListener("blur", (event) => {
    event.target.value = normalizePosterImageUrl(event.target.value);
  });

  document.querySelector("#newsImageFile").addEventListener("change", async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    document.querySelector("#newsImage").value = await readFileAsDataUrl(file);
  });

  document.querySelector("#scheduleForm").addEventListener("submit", (event) => {
    event.preventDefault();
    const data = getData();
    data.schedules.push({
      id: uid("s"),
      title: document.querySelector("#scheduleTitle").value.trim(),
      date: document.querySelector("#scheduleDate").value,
      time: document.querySelector("#scheduleTime").value,
      venue: document.querySelector("#scheduleVenue").value.trim()
    });
    saveData(data);
    event.target.reset();
  });
});
