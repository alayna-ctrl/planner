(function () {
  function buildTimelineItems(state) {
    const taskItems = state.tasks
      .filter((t) => t.status !== "done" && t.dueDate)
      .map((t) => ({
        id: `task_${t.id}`,
        date: t.dueDate,
        title: t.title,
        kind: "Task",
        linkedTaskId: t.id,
      }));
    const eventItems = (state.calendar.events || []).map((e) => ({
      id: e.id,
      date: (e.when || "").slice(0, 10),
      title: e.title,
      kind: "Event",
      sourceRef: e.sourceRef,
    }));
    return [...taskItems, ...eventItems]
      .filter((i) => i.date)
      .sort((a, b) => new Date(a.date) - new Date(b.date))
      .slice(0, 30);
  }

  function render() {
    const root = document.getElementById("view-timeline");
    if (!root) return;
    const s = window.PlannerState.getState();
    const mode = s.ui.timelineMode || "weekly";
    const items = buildTimelineItems(s);

    root.innerHTML = `
      <div class="view-header"><h2>Timeline</h2><p>Upcoming deadlines and events in one place.</p></div>
      <div class="chip-row">
        <button class="chip ${mode === "weekly" ? "active" : ""}" data-action="timeline-mode" data-mode="weekly">Weekly</button>
        <button class="chip ${mode === "monthly" ? "active" : ""}" data-action="timeline-mode" data-mode="monthly">Monthly</button>
      </div>
      <article class="card">
        ${(items || [])
          .map((i) => `<div class="timeline-row">
            <div><strong>${i.date}</strong> - ${i.title}</div>
            <span class="tag">${i.kind}</span>
          </div>`)
          .join("") || `<div class="muted">No upcoming items.</div>`}
      </article>
    `;
  }

  function bind() {
    const root = document.getElementById("view-timeline");
    if (!root || root.dataset.bound === "1") return;
    root.dataset.bound = "1";
    root.addEventListener("click", function (e) {
      if (e.target.dataset.action !== "timeline-mode") return;
      window.PlannerState.updateState((s) => {
        s.ui.timelineMode = e.target.dataset.mode;
        return s;
      });
      window.PlannerApp.renderActiveView();
    });
  }

  window.ViewTimeline = { render, bind };
})();
