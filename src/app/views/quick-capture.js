(function () {
  function attachQuickCapture() {
    const form = document.getElementById("quickCaptureForm");
    const input = document.getElementById("quickCaptureInput");
    const inboxBtn = document.getElementById("openInboxBtn");
    if (!form || form.dataset.bound === "1") return;
    form.dataset.bound = "1";

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      const title = (input.value || "").trim();
      if (!title) return;
      const task = window.PlannerTasks.quickAddTask(title);
      window.PlannerState.updateState((s) => {
        s.inbox.unshift(task);
        input.value = "";
        return s;
      });
      window.PlannerApp.toast("Captured to inbox");
      // no prompts; user remains in current flow
      if (window.PlannerApp.getActiveView() === "today") window.PlannerApp.renderActiveView();
    });

    inboxBtn.addEventListener("click", function () {
      window.PlannerState.updateState((s) => {
        s.ui.activeFilter = "inbox";
        s.ui.currentView = "today";
        return s;
      });
      window.PlannerApp.switchView("today");
    });
  }

  window.ViewQuickCapture = {
    attachQuickCapture,
  };
})();
