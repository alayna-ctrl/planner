(function () {
  function toast(msg) {
    const el = document.getElementById("toast");
    if (!el) return;
    el.textContent = msg;
    el.classList.add("show");
    clearTimeout(toast._t);
    toast._t = setTimeout(() => el.classList.remove("show"), 1700);
  }

  function renderSettings() {
    const root = document.getElementById("view-settings");
    if (!root) return;
    const s = window.PlannerState.getState();
    root.innerHTML = `
      <div class="view-header"><h2>Settings</h2><p>Optional integrations and backup controls.</p></div>
      <article class="card">
        <h3>Google Calendar (optional)</h3>
        <p class="muted">Read-only sync. Works fine disconnected.</p>
        <div class="two-col">
          <input id="gClientId" type="text" placeholder="OAuth Client ID" value="${s.calendar.config.clientId || ""}">
          <input id="gCalendarId" type="text" placeholder="Calendar ID (default: primary)" value="${s.calendar.config.calendarId || "primary"}">
        </div>
        <div class="chip-row">
          <button id="saveCalendarCfgBtn" class="ghost-btn">Save config</button>
          <button id="syncCalendarBtn" class="primary-btn">Sync now</button>
        </div>
        <div class="muted">Last sync: ${s.calendar.lastSyncAt || "never"}</div>
      </article>
      <article class="card">
        <h3>Legacy data preserved</h3>
        <div class="muted">Migrated from: ${s.migratedFrom || "fresh v8"}</div>
      </article>
    `;
  }

  function renderActiveView() {
    const s = window.PlannerState.getState();
    const view = s.ui.currentView || "today";
    if (view === "today") window.ViewToday.render();
    if (view === "weekly") window.ViewWeekly.render();
    if (view === "areas") window.ViewAreas.render();
    if (view === "timeline") window.ViewTimeline.render();
    if (view === "settings") renderSettings();
    syncNav(view);
  }

  function syncNav(view) {
    document.querySelectorAll(".nav-btn").forEach((b) => {
      b.classList.toggle("active", b.dataset.view === view);
    });
  }

  function switchView(view) {
    window.PlannerState.updateState((s) => {
      s.ui.currentView = view;
      return s;
    });
    document.querySelectorAll(".view").forEach((v) => v.classList.remove("active"));
    const target = document.getElementById(`view-${view}`);
    if (target) target.classList.add("active");
    renderActiveView();
  }

  function bindBase() {
    document.getElementById("todayLabel").textContent = new Date().toDateString();
    document.querySelectorAll(".nav-btn").forEach((btn) =>
      btn.addEventListener("click", () => {
        switchView(btn.dataset.view);
      })
    );
    document.getElementById("focusModeBtn").addEventListener("click", () => {
      window.PlannerState.updateState((s) => {
        s.ui.focusMode = !s.ui.focusMode;
        return s;
      });
      renderActiveView();
    });
    document.getElementById("exportBtn").addEventListener("click", () => {
      window.PlannerState.exportBackup();
      toast("Backup exported");
    });
    document.getElementById("importInput").addEventListener("change", (e) => {
      const file = e.target.files && e.target.files[0];
      if (!file) return;
      window.PlannerState.importBackup(file, (err) => {
        if (err) toast(`Import failed: ${err.message}`);
        else {
          toast("Backup imported");
          renderActiveView();
        }
      });
    });
    document.addEventListener("click", (e) => {
      if (e.target.id === "saveCalendarCfgBtn") {
        const clientId = document.getElementById("gClientId").value.trim();
        const calendarId = document.getElementById("gCalendarId").value.trim();
        window.PlannerCalendar.saveConfig(clientId, calendarId || "primary");
        toast("Calendar config saved");
        renderActiveView();
      } else if (e.target.id === "syncCalendarBtn") {
        window.PlannerCalendar.syncCalendar((err) => {
          toast(err ? "Calendar sync failed" : "Calendar synced");
          renderActiveView();
        });
      }
    });
  }

  function init() {
    window.PlannerState.migrateIfNeeded();
    window.PlannerWeekly.sundayResetIfNeeded();
    bindBase();
    window.ViewToday.bind();
    window.ViewWeekly.bind();
    window.ViewAreas.bind();
    window.ViewTimeline.bind();
    window.ViewQuickCapture.attachQuickCapture();
    const current = window.PlannerState.getState().ui.currentView || "today";
    switchView(current);
  }

  window.PlannerApp = {
    init,
    switchView,
    renderActiveView,
    getActiveView: () => window.PlannerState.getState().ui.currentView || "today",
    toast,
  };

  init();
})();
