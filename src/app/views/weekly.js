(function () {
  function render() {
    const root = document.getElementById("view-weekly");
    if (!root) return;
    const s = window.PlannerState.getState();
    const openTasks = s.tasks.filter((t) => t.status !== "done");
    const doneThisWeek = s.tasks.filter((t) => t.status === "done").length;
    const priorities = s.weekly.priorities || ["", "", ""];
    const reset = s.weekly.resetChecklist || [];
    const carry = s.weekly.carryForward || [];

    root.innerHTML = `
      <div class="view-header"><h2>Weekly dashboard</h2><p>Plan intentionally. Reset every Sunday.</p></div>
      <div class="two-col">
        <article class="card">
          <header class="section-head"><h3>Weekly priorities</h3></header>
          ${[0, 1, 2]
            .map(
              (i) => `<input class="weekly-input" data-priority-idx="${i}" type="text" value="${priorities[i] || ""}" placeholder="Priority ${i + 1}">`
            )
            .join("")}
        </article>
        <article class="card">
          <header class="section-head"><h3>Workload snapshot</h3></header>
          <div class="metric-grid">
            <div class="metric"><strong>${openTasks.length}</strong><span>Open tasks</span></div>
            <div class="metric"><strong>${doneThisWeek}</strong><span>Completed</span></div>
            <div class="metric"><strong>${carry.length}</strong><span>Carry-forward</span></div>
          </div>
        </article>
      </div>
      <article class="card">
        <header class="section-head"><h3>Sunday reset checklist</h3><button class="ghost-btn mini" data-action="run-reset">Run reset now</button></header>
        ${(reset || [])
          .map(
            (r) => `<label class="reset-item ${r.done ? "done" : ""}">
              <input data-action="toggle-reset" data-reset-id="${r.id}" type="checkbox" ${r.done ? "checked" : ""}>
              <span>${r.text}</span>
            </label>`
          )
          .join("")}
      </article>
      <article class="card">
        <header class="section-head"><h3>Unfinished carry-forward</h3></header>
        ${carry
          .map((id) => s.tasks.find((t) => t.id === id))
          .filter(Boolean)
          .map((t) => `<div class="task-row"><div class="task-main"><div class="task-title">${t.title}</div><div class="task-meta">${t.priority}</div></div></div>`)
          .join("") || `<div class="muted">No carry-forward tasks.</div>`}
      </article>
    `;
  }

  function bind() {
    const root = document.getElementById("view-weekly");
    if (!root || root.dataset.bound === "1") return;
    root.dataset.bound = "1";

    root.addEventListener("input", function (e) {
      const idx = e.target.dataset.priorityIdx;
      if (idx === undefined) return;
      window.PlannerWeekly.updateWeeklyPriority(Number(idx), e.target.value);
    });

    root.addEventListener("change", function (e) {
      if (e.target.dataset.action === "toggle-reset") {
        window.PlannerWeekly.toggleResetItem(e.target.dataset.resetId);
        window.PlannerApp.renderActiveView();
      }
    });

    root.addEventListener("click", function (e) {
      if (e.target.dataset.action === "run-reset") {
        window.PlannerWeekly.sundayResetIfNeeded();
        window.PlannerApp.toast("Weekly reset complete");
        window.PlannerApp.renderActiveView();
      }
    });
  }

  window.ViewWeekly = { render, bind };
})();
