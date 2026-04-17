(function () {
  function daysUntil(iso) {
    if (!iso) return null;
    const d = new Date(`${iso}T00:00:00`);
    if (Number.isNaN(d.getTime())) return null;
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    return Math.ceil((d - now) / 86400000);
  }

  function urgencyBucket(task) {
    if (task.status === "done") return "done";
    const left = daysUntil(task.dueDate);
    if (left !== null && left < 0) return "overdue";
    if (left !== null && left <= 2) return "due_soon";
    if (task.recurring && task.recurring.type) return "recurring";
    return "can_wait";
  }

  function scoreTask(task, context) {
    if (task.status === "done") return -9999;
    if (task.pinnedDoNext) return 9999;

    let score = 0;
    const left = daysUntil(task.dueDate);
    if (left !== null) {
      if (left < 0) score += 100;
      else if (left <= 1) score += 75;
      else if (left <= 3) score += 45;
      else if (left <= 7) score += 25;
    }

    score += task.priority === "high" ? 30 : task.priority === "medium" ? 15 : 5;
    score += task.energyType === context.energyMode ? 18 : 0;
    score += task.effort === "low" ? 15 : task.effort === "medium" ? 8 : 2;
    if (task.status === "in_progress") score += 12;

    return score;
  }

  function getDoNext(tasks, context) {
    const open = tasks.filter((t) => t.status !== "done");
    if (!open.length) return null;
    const sorted = open.slice().sort((a, b) => scoreTask(b, context) - scoreTask(a, context));
    return sorted[0];
  }

  function getTopThree(tasks, doNextId) {
    const pinned = tasks.filter((t) => t.status !== "done" && t.pinnedDoNext);
    const rest = tasks
      .filter((t) => t.status !== "done" && !t.pinnedDoNext && t.id !== doNextId)
      .sort((a, b) => {
        const pa = a.priority === "high" ? 3 : a.priority === "medium" ? 2 : 1;
        const pb = b.priority === "high" ? 3 : b.priority === "medium" ? 2 : 1;
        return pb - pa;
      });
    return [...pinned, ...rest].slice(0, 3);
  }

  function quickAddTask(title) {
    return {
      id: `in_${Date.now()}_${Math.floor(Math.random() * 999)}`,
      title: title.trim(),
      category: "unsorted",
      area: "",
      dueDate: "",
      priority: "medium",
      effort: "medium",
      energyType: "easy",
      status: "todo",
      recurring: null,
      notes: "",
      pinnedDoNext: false,
      linkedAreaRecordId: "",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      source: "capture",
    };
  }

  function groupedTasks(tasks) {
    return {
      overdue: tasks.filter((t) => urgencyBucket(t) === "overdue"),
      dueSoon: tasks.filter((t) => urgencyBucket(t) === "due_soon"),
      recurring: tasks.filter((t) => urgencyBucket(t) === "recurring"),
      canWait: tasks.filter((t) => urgencyBucket(t) === "can_wait"),
    };
  }

  function toggleTaskDone(taskId) {
    return window.PlannerState.updateState((s) => {
      const hit = s.tasks.find((t) => t.id === taskId);
      if (!hit) return s;
      hit.status = hit.status === "done" ? "todo" : "done";
      hit.updatedAt = new Date().toISOString();
      return s;
    });
  }

  function pinDoNext(taskId) {
    return window.PlannerState.updateState((s) => {
      s.tasks.forEach((t) => {
        t.pinnedDoNext = t.id === taskId;
      });
      return s;
    });
  }

  function upsertTask(taskPatch) {
    return window.PlannerState.updateState((s) => {
      const idx = s.tasks.findIndex((t) => t.id === taskPatch.id);
      if (idx === -1) {
        s.tasks.unshift(taskPatch);
      } else {
        s.tasks[idx] = { ...s.tasks[idx], ...taskPatch, updatedAt: new Date().toISOString() };
      }
      return s;
    });
  }

  window.PlannerTasks = {
    daysUntil,
    groupedTasks,
    getDoNext,
    getTopThree,
    quickAddTask,
    toggleTaskDone,
    pinDoNext,
    upsertTask,
    urgencyBucket,
  };
})();
