(function () {
  function byStatusOpen(t) {
    return t.status !== "done";
  }

  function getFilters(tasks) {
    const open = tasks.filter(byStatusOpen);
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    return {
      all: open,
      quickWins: open.filter((t) => t.effort === "low"),
      focusTasks: open.filter((t) => t.energyType === "focus"),
      lowEnergy: open.filter((t) => t.energyType === "easy" || t.effort === "low"),
      dueThisWeek: open.filter((t) => {
        if (!t.dueDate) return false;
        const d = new Date(`${t.dueDate}T00:00:00`);
        const diff = Math.ceil((d - now) / 86400000);
        return diff >= 0 && diff <= 7;
      }),
      urgent: open.filter((t) => t.priority === "high"),
      inbox: open.filter((t) => t.category === "unsorted" || !t.area),
    };
  }

  window.PlannerFilters = {
    getFilters,
  };
})();
