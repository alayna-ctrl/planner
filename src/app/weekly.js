(function () {
  function sundayResetIfNeeded() {
    return window.PlannerState.updateState((s) => {
      const now = new Date();
      const day = now.getDay();
      const last = s.weekly.lastResetAt ? new Date(s.weekly.lastResetAt) : null;
      const weekTag = `${now.getFullYear()}-${Math.floor((now.getTime() / 86400000) / 7)}`;
      const lastTag = last ? `${last.getFullYear()}-${Math.floor((last.getTime() / 86400000) / 7)}` : "";

      if (day !== 0 || weekTag === lastTag) return s;

      s.weekly.lastResetAt = now.toISOString();
      s.weekly.resetChecklist = (s.weekly.resetChecklist || []).map((i) => ({ ...i, done: false }));
      s.weekly.carryForward = s.tasks.filter((t) => t.status !== "done").slice(0, 12).map((t) => t.id);
      return s;
    });
  }

  function updateWeeklyPriority(idx, value) {
    return window.PlannerState.updateState((s) => {
      if (!Array.isArray(s.weekly.priorities)) s.weekly.priorities = ["", "", ""];
      s.weekly.priorities[idx] = value;
      return s;
    });
  }

  function toggleResetItem(id) {
    return window.PlannerState.updateState((s) => {
      const hit = (s.weekly.resetChecklist || []).find((i) => i.id === id);
      if (hit) hit.done = !hit.done;
      return s;
    });
  }

  window.PlannerWeekly = {
    sundayResetIfNeeded,
    updateWeeklyPriority,
    toggleResetItem,
  };
})();
