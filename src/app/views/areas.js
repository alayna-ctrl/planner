(function () {
  function esc(s) {
    return String(s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  function areaNav(active) {
    return `
      <div class="chip-row">
        <button class="chip ${active === "school" ? "active" : ""}" data-action="area-tab" data-area="school">School</button>
        <button class="chip ${active === "career" ? "active" : ""}" data-action="area-tab" data-area="career">Career/Admin</button>
        <button class="chip ${active === "personal" ? "active" : ""}" data-action="area-tab" data-area="personal">Personal</button>
      </div>
    `;
  }

  function schoolCards(school) {
    return `
      <div class="three-col">
        <article class="card"><h3>Major deadlines</h3>${(school.milestones || []).map((m) => `<div class="mini-row">${esc(m.title)} <span>${esc(m.date || "")}</span></div>`).join("") || `<div class="muted">No deadlines yet.</div>`}</article>
        <article class="card"><h3>Assignment breakdown</h3>${(school.assignmentPlans || []).map((m) => `<div class="mini-row">${esc(m.assignment)} <span>${(m.steps || []).length} steps</span></div>`).join("") || `<div class="muted">No plans yet.</div>`}</article>
        <article class="card"><h3>Weekly school priorities</h3>${(school.weeklyPriorities || []).map((p) => `<div class="mini-row">${esc(p)}</div>`).join("") || `<div class="muted">No weekly priorities yet.</div>`}</article>
      </div>
    `;
  }

  function careerCards(career) {
    return `
      <div class="three-col">
        <article class="card">
          <h3>Applications</h3>
          ${(career.applications || [])
            .map((a) => `<div class="mini-row">${esc(a.org)} - ${esc(a.role)} <span>${esc(a.status || "draft")}</span></div>`)
            .join("") || `<div class="muted">No applications yet.</div>`}
        </article>
        <article class="card">
          <h3>References</h3>
          ${(career.references || [])
            .map((r) => `<div class="mini-row">${esc(r.name)} <span>${esc(r.contact || "")}</span></div>`)
            .join("") || `<div class="muted">No references yet.</div>`}
        </article>
        <article class="card">
          <h3>Resume and docs</h3>
          <div class="mini-row">Resumes <span>${(career.resumeVersions || []).length}</span></div>
          <div class="mini-row">Cover letters <span>${(career.coverVersions || []).length}</span></div>
          <div class="mini-row">Deadlines <span>${(career.certDeadlines || []).length}</span></div>
        </article>
      </div>
    `;
  }

  function personalCards(personal) {
    return `
      <div class="three-col">
        <article class="card"><h3>Travel plans</h3>${(personal.travelPlans || []).map((t) => `<div class="mini-row">${esc(t.title || "Trip")} <span>${esc(t.date || "")}</span></div>`).join("") || `<div class="muted">No trips yet.</div>`}</article>
        <article class="card"><h3>Book / Pack / Remember</h3>${(personal.travelPlans || []).map((t) => `<div class="mini-row">${esc(t.title || "Trip")} <span>${(t.checklist || []).length} items</span></div>`).join("") || `<div class="muted">No checklist items.</div>`}</article>
        <article class="card"><h3>Life admin notes</h3>${(personal.lifeAdminNotes || []).map((n) => `<div class="mini-row">${esc(n.title || "Note")}</div>`).join("") || `<div class="muted">No notes yet.</div>`}</article>
      </div>
    `;
  }

  function render() {
    const root = document.getElementById("view-areas");
    if (!root) return;
    const s = window.PlannerState.getState();
    const active = s.ui.activeArea || "school";

    let cards = "";
    if (active === "school") cards = schoolCards(s.areas.school);
    if (active === "career") cards = careerCards(s.areas.career);
    if (active === "personal") cards = personalCards(s.areas.personal);

    root.innerHTML = `
      <div class="view-header"><h2>Areas</h2><p>Structured information spaces linked to tasks.</p></div>
      ${areaNav(active)}
      ${cards}
    `;
  }

  function bind() {
    const root = document.getElementById("view-areas");
    if (!root || root.dataset.bound === "1") return;
    root.dataset.bound = "1";
    root.addEventListener("click", function (e) {
      if (e.target.dataset.action !== "area-tab") return;
      window.PlannerState.updateState((s) => {
        s.ui.activeArea = e.target.dataset.area;
        return s;
      });
      window.PlannerApp.renderActiveView();
    });
  }

  window.ViewAreas = { render, bind };
})();
