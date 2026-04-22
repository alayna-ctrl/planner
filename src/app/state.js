(function () {
  const STORAGE_KEY = "alayna_planner_v8";
  const LEGACY_KEYS = ["alayna_planner_v7", "alayna_planner_v6", "alayna_planner_v5", "alayna_planner_v4", "alayna_planner"];

  function nowIso() {
    return new Date().toISOString();
  }

  function todayISO() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }

  function toDateKey(offsetDays) {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + offsetDays);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }

  function defaultState() {
    return {
      version: 1,
      migratedFrom: null,
      ui: {
        currentView: "today",
        focusMode: false,
        activeFilter: "all",
      },
      tasks: [],
      inbox: [],
      weekly: {
        priorities: [],
        resetChecklist: [
          { id: "wr1", text: "Review overdue tasks", done: false },
          { id: "wr2", text: "Set school priorities", done: false },
          { id: "wr3", text: "Plan low-energy fallback tasks", done: false },
        ],
        lastResetAt: null,
        carryForward: [],
      },
      areas: {
        school: {
          milestones: [],
          assignmentPlans: [],
          weeklyPriorities: [],
        },
        career: {
          applications: [],
          references: [],
          resumeVersions: [],
          coverVersions: [],
          certDeadlines: [],
          documents: [],
          notes: [],
        },
        personal: {
          travelPlans: [],
          lifeAdminNotes: [],
        },
      },
      calendar: {
        config: {
          clientId: "",
          calendarId: "primary",
        },
        connected: false,
        lastSyncAt: null,
        events: [],
      },
      // preserved legacy domains
      legacy: {
        study: {},
        wellness: {},
        meds: [],
        appts: [],
        doctorQ: [],
      },
      backups: {
        lastBackupAt: null,
      },
    };
  }

  function parseJSON(raw) {
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch (_e) {
      return null;
    }
  }

  function priorityFromLegacy(t) {
    if (t.priority === "urgent") return "high";
    if (t.priority === "someday") return "low";
    return "medium";
  }

  function taskFromLegacyTodo(t) {
    const createdAt = t.createdAt ? new Date(t.createdAt).toISOString() : nowIso();
    return {
      id: `task_${t.id || Date.now()}_${Math.floor(Math.random() * 999)}`,
      title: t.text || "Untitled task",
      category: t.cat || "personal",
      area: t.cat || "personal",
      dueDate: t.due || "",
      priority: priorityFromLegacy(t),
      effort: "medium",
      energyType: t.energy === "easy" ? "easy" : "focus",
      status: t.done ? "done" : "todo",
      recurring: null,
      notes: "",
      pinnedDoNext: !!t.top3,
      linkedAreaRecordId: "",
      createdAt,
      updatedAt: createdAt,
      source: "legacy-todo",
    };
  }

  function taskFromLegacyAssignment(a, status) {
    return {
      id: `assign_${a.id}`,
      title: a.name || "Assignment",
      category: "school",
      area: "school",
      dueDate: a.due || "",
      priority: status === "notstarted" ? "medium" : "high",
      effort: "high",
      energyType: "focus",
      status: status === "done" ? "done" : status === "inprogress" ? "in_progress" : "todo",
      recurring: null,
      notes: `${a.cls || "Class"}${a.url ? ` • ${a.url}` : ""}`,
      pinnedDoNext: false,
      linkedAreaRecordId: "",
      createdAt: nowIso(),
      updatedAt: nowIso(),
      source: "legacy-assignment",
    };
  }

  function migrateFromLegacy(raw, legacyKey) {
    const base = defaultState();
    if (!raw || typeof raw !== "object") return base;

    const todos = Array.isArray(raw.todos) ? raw.todos : [];
    const customFromV89 = Array.isArray(raw.customAssigns) ? raw.customAssigns : [];
    const customFromV6 = Array.isArray(raw.customAssignments) ? raw.customAssignments : [];
    const seenIds = new Set(customFromV89.map((a) => String(a.id)));
    const customAssigns = [...customFromV89];
    for (let i = 0; i < customFromV6.length; i += 1) {
      const a = customFromV6[i];
      if (a && !seenIds.has(String(a.id))) {
        customAssigns.push(a);
        seenIds.add(String(a.id));
      }
    }
    const assignmentsState = raw.assignments || {};

    const mappedTasks = todos.map(taskFromLegacyTodo);
    const assignmentTasks = customAssigns.map((a) => taskFromLegacyAssignment(a, assignmentsState[a.id] || "notstarted"));

    const inbox = [];
    const tasks = [...mappedTasks, ...assignmentTasks];

    if (!tasks.length) {
      tasks.push(
        {
          id: "seed_1",
          title: "Review today plan",
          category: "personal",
          area: "personal",
          dueDate: todayISO(),
          priority: "high",
          effort: "low",
          energyType: "focus",
          status: "todo",
          recurring: { type: "daily" },
          notes: "",
          pinnedDoNext: true,
          linkedAreaRecordId: "",
          createdAt: nowIso(),
          updatedAt: nowIso(),
          source: "seed",
        },
        {
          id: "seed_2",
          title: "15 min certification study block",
          category: "school",
          area: "school",
          dueDate: toDateKey(1),
          priority: "medium",
          effort: "medium",
          energyType: "focus",
          status: "todo",
          recurring: { type: "weekly", weekday: 1 },
          notes: "",
          pinnedDoNext: false,
          linkedAreaRecordId: "",
          createdAt: nowIso(),
          updatedAt: nowIso(),
          source: "seed",
        }
      );
    }

    base.tasks = tasks;
    base.inbox = inbox;
    base.migratedFrom = legacyKey;

    base.areas.career.references = (raw.references || []).map((r, idx) => ({
      id: r.id || `ref_${idx}_${Date.now()}`,
      name: r.name || "",
      role: r.role || "",
      contact: r.contact || "",
      notes: r.notes || "",
    }));

    base.legacy = {
      study: raw.study || {},
      wellness: raw.wellness || {},
      meds: raw.meds || [],
      appts: raw.appts || [],
      doctorQ: raw.doctorQ || [],
    };

    if (raw.lastBackupAt) base.backups.lastBackupAt = raw.lastBackupAt;
    if (raw.gcalClientId) base.calendar.config.clientId = raw.gcalClientId;
    if (raw.gcalCalId) base.calendar.config.calendarId = raw.gcalCalId;

    return base;
  }

  function migrateIfNeeded() {
    const existingV8 = parseJSON(localStorage.getItem(STORAGE_KEY));
    if (existingV8 && existingV8.version >= 1) return existingV8;

    for (let i = 0; i < LEGACY_KEYS.length; i += 1) {
      const key = LEGACY_KEYS[i];
      const raw = parseJSON(localStorage.getItem(key));
      if (raw) {
        const migrated = migrateFromLegacy(raw, key);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(migrated));
        return migrated;
      }
    }

    const fresh = defaultState();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(fresh));
    return fresh;
  }

  function getState() {
    const raw = parseJSON(localStorage.getItem(STORAGE_KEY));
    return raw || migrateIfNeeded();
  }

  function setState(state) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    return state;
  }

  function updateState(updater) {
    const current = getState();
    const next = updater(current) || current;
    return setState(next);
  }

  function exportBackup() {
    const state = getState();
    state.backups.lastBackupAt = Date.now();
    setState(state);
    const payload = {
      exportedAt: nowIso(),
      schema: "v8",
      data: state,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `alayna-planner-v8-backup-${todayISO()}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  function importBackup(file, onDone) {
    const reader = new FileReader();
    reader.onload = function () {
      try {
        const parsed = parseJSON(reader.result);
        const data = parsed && parsed.data ? parsed.data : parsed;
        if (!data || typeof data !== "object") throw new Error("Invalid backup format");
        if (data.version === 1 && data.tasks) {
          setState(data);
        } else {
          const migrated = migrateFromLegacy(data, "imported_legacy");
          setState(migrated);
        }
        onDone(null);
      } catch (e) {
        onDone(e);
      }
    };
    reader.readAsText(file);
  }

  window.PlannerState = {
    STORAGE_KEY,
    migrateIfNeeded,
    getState,
    setState,
    updateState,
    exportBackup,
    importBackup,
    todayISO,
  };
})();
