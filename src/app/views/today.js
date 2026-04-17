(function () {
  function esc(s) {
    return String(s || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function taskRow(t, activeId) {
    const cls = ["task-row"];
    if (t.status === "done") cls.push("done");
    if (activeId === t.id) cls.push("active");
    return `<div class="${cls.join(" ")}" data-task-id="${t.id}">
      <button class="check-btn" data-action="toggle-task" data-task-id="${t.id}">${t.status === "done" ? "✓" : ""}</button>
      <div class="task-main">
        <div class="task-title">${esc(t.title)}</div>
        <div class="task-meta">${esc(t.priority)} • ${esc(t.effort)} • ${esc(t.energyType)}${t.dueDate ? ` • due ${esc(t.dueDate)}` : ""}</div>
      </div>
      <button class="ghost-btn mini" data-action="pin-next" data-task-id="${t.id}">${t.pinnedDoNext ? "Pinned" : "Pin"}</button>
    </div>`;
  }

  function section(title, key, rows, collapsed) {
    return `<article class="card section-card ${collapsed ? "collapsed" : ""}" data-section="${key}">
      <header class="section-head">
        <h3>${title}</h3>
        <button class="ghost-btn mini" data-action="toggle-section" data-section="${key}">${collapsed ? "Show" : "Hide"}</button>
      </header>
      <div class="section-body">${rows || `<div class="muted">No items</div>`}</div>
    </article>`;
  }

  function render() {
    const state = window.PlannerState.getState();
    const root = document.getElementById("view-today");
    if (!root) return;

    const energyMode = state.ui.energyMode || "focus";
    const tasks = state.tasks || [];
    const filters = window.PlannerFilters.getFilters(tasks);
    const visible = filters[state.ui.activeFilter || "all"] || filters.all;
    const grouped = window.PlannerTasks.groupedTasks(visible);
    const doNext = window.PlannerTasks.getDoNext(visible, { energyMode });
    const top3 = window.PlannerTasks.getTopThree(visible, doNext && doNext.id);
    const focusMode = !!state.ui.focusMode;
    const activeTask = state.ui.activeTaskId || "";

    root.innerHTML = `
      <div class="view-header">
        <h2>Today</h2>
        <p>What needs attention now, and what can wait.</p>
      </div>
      <div class="chip-row">
        <button class="chip ${energyMode === "focus" ? "active" : ""}" data-action="set-energy" data-energy="focus">Focus energy</button>
        <button class="chip ${energyMode === "easy" ? "active" : ""}" data-action="set-energy" data-energy="easy">Low energy</button>
      </div>
      <div class="filter-row">
        ${["all", "quickWins", "focusTasks", "lowEnergy", "dueThisWeek", "urgent", "inbox"]
          .map((f) => `<button class="chip ${state.ui.activeFilter === f ? "active" : ""}" data-action="filter" data-filter="${f}">${f}</button>`)
          .join("")}
      </div>
      <div class="today-grid">
        <section class="left-col">
          <article class="card do-next ${doNext ? "active" : ""}">
            <header class="section-head"><h3>Do Next</h3></header>
            ${
              doNext
                ? `${taskRow(doNext, activeTask)}<div class="muted">Recommended using urgency, effort, and energy fit.</div>`
                : '<div class="muted">No open tasks. Capture something small to start.</div>'
            }
          </article>

          ${section("Overdue", "overdue", grouped.overdue.map((t) => taskRow(t, activeTask)).join(""), false)}
          ${section("Due Soon", "dueSoon", grouped.dueSoon.map((t) => taskRow(t, activeTask)).join(""), false)}
          ${section("Recurring", "recurring", grouped.recurring.map((t) => taskRow(t, activeTask)).join(""), focusMode)}
          ${section("Can Wait", "canWait", grouped.canWait.map((t) => taskRow(t, activeTask)).join(""), true)}
        </section>
        <aside class="right-col">
          <article class="card">
            <header class="section-head"><h3>Top 3 priorities</h3></header>
            <div>${top3.map((t) => taskRow(t, activeTask)).join("") || `<div class="muted">No priorities set</div>`}</div>
          </article>
          <article class="card">
            <header class="section-head"><h3>Upcoming events</h3></header>
            <div>
              ${(state.calendar.events || [])
                .slice(0, 5)
                .map(
                  (e) => `<div class="event-row">
                  <div>
                    <div class="task-title">${esc(e.title)}</div>
                    <div class="task-meta">${esc((e.when || "").replace("T", " ").slice(0, 16))}</div>
                  </div>
                  <button class="ghost-btn mini" data-action="event-to-task" data-event-id="${e.id}">To task</button>
                </div>`
                )
                .join("") || '<div class="muted">No calendar events synced.</div>'}
            </div>
          </article>
        </aside>
      </div>
    `;
  }

  function bind() {
    const root = document.getElementById("view-today");
    if (!root || root.dataset.bound === "1") return;
    root.dataset.bound = "1";
    root.addEventListener("click", function (e) {
      const t = e.target;
      const action = t && t.dataset && t.dataset.action;
      if (!action) return;

      if (action === "toggle-task") {
        window.PlannerTasks.toggleTaskDone(t.dataset.taskId);
        window.PlannerApp.renderActiveView();
      } else if (action === "pin-next") {
        window.PlannerTasks.pinDoNext(t.dataset.taskId);
        window.PlannerApp.renderActiveView();
      } else if (action === "set-energy") {
        window.PlannerState.updateState((s) => {
          s.ui.energyMode = t.dataset.energy;
          return s;
        });
        window.PlannerApp.renderActiveView();
      } else if (action === "filter") {
        window.PlannerState.updateState((s) => {
          s.ui.activeFilter = t.dataset.filter;
          return s;
        });
        window.PlannerApp.renderActiveView();
      } else if (action === "toggle-section") {
        const card = root.querySelector(`[data-section="${t.dataset.section}"]`);
        if (card) card.classList.toggle("collapsed");
      } else if (action === "event-to-task") {
        if (window.PlannerCalendar.eventToTask(t.dataset.eventId)) {
          window.PlannerApp.toast("Event converted to task");
          window.PlannerApp.renderActiveView();
        }
      }
    });

    root.addEventListener("focusin", function (e) {
      const row = e.target.closest(".task-row");
      if (!row) return;
      window.PlannerState.updateState((s) => {
        s.ui.activeTaskId = row.dataset.taskId;
        return s;
      });
      root.querySelectorAll(".task-row.active").forEach((el) => el.classList.remove("active"));
      row.classList.add("active");
    });
  }

  window.ViewToday = { render, bind };
})();
