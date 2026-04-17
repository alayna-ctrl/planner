(function () {
  const DISCOVERY_DOC = "https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest";
  const SCOPE = "https://www.googleapis.com/auth/calendar.readonly";
  let tokenClient = null;
  let gapiReady = false;
  let gisReady = false;

  function setSyncLabel(text) {
    const el = document.getElementById("syncStatusLabel");
    if (el) el.textContent = text;
  }

  function ensureGoogleApis(onReady) {
    if (!window.gapi || !window.google || !window.google.accounts) {
      setSyncLabel("Calendar disconnected");
      onReady(new Error("Google APIs unavailable"));
      return;
    }
    if (!gapiReady) {
      window.gapi.load("client", async () => {
        await window.gapi.client.init({ discoveryDocs: [DISCOVERY_DOC] });
        gapiReady = true;
        onReady(null);
      });
      return;
    }
    onReady(null);
  }

  function configureClient(clientId) {
    if (!window.google || !window.google.accounts || !window.google.accounts.oauth2) return false;
    tokenClient = window.google.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: SCOPE,
      callback: () => {},
    });
    gisReady = true;
    return true;
  }

  function requestToken(clientId, cb) {
    if (!gisReady && !configureClient(clientId)) return cb(new Error("OAuth not initialized"));
    tokenClient.callback = (resp) => {
      if (resp.error) cb(new Error(resp.error));
      else cb(null, resp.access_token);
    };
    tokenClient.requestAccessToken({ prompt: "consent" });
  }

  async function fetchEvents(accessToken, calendarId) {
    window.gapi.client.setToken({ access_token: accessToken });
    const now = new Date();
    const max = new Date(now.getTime() + 1000 * 60 * 60 * 24 * 60);
    const resp = await window.gapi.client.calendar.events.list({
      calendarId: calendarId || "primary",
      timeMin: now.toISOString(),
      timeMax: max.toISOString(),
      showDeleted: false,
      singleEvents: true,
      orderBy: "startTime",
      maxResults: 50,
    });
    return resp.result.items || [];
  }

  function mapEvent(ev) {
    const start = (ev.start && (ev.start.dateTime || ev.start.date)) || "";
    return {
      id: `gcal_${ev.id}`,
      title: ev.summary || "Untitled event",
      when: start,
      location: ev.location || "",
      notes: ev.description || "",
      sourceRef: { type: "calendar", id: ev.id },
    };
  }

  function syncCalendar(cb) {
    const s = window.PlannerState.getState();
    const clientId = s.calendar.config.clientId;
    if (!clientId) {
      setSyncLabel("Calendar disconnected");
      return cb && cb(null, []);
    }

    ensureGoogleApis((err) => {
      if (err) return cb && cb(err);
      requestToken(clientId, async (tokErr, token) => {
        if (tokErr) return cb && cb(tokErr);
        try {
          const events = await fetchEvents(token, s.calendar.config.calendarId);
          const mapped = events.map(mapEvent);
          window.PlannerState.updateState((st) => {
            st.calendar.connected = true;
            st.calendar.lastSyncAt = new Date().toISOString();
            st.calendar.events = mapped;
            return st;
          });
          setSyncLabel(`Calendar synced (${mapped.length})`);
          cb && cb(null, mapped);
        } catch (e) {
          setSyncLabel("Calendar sync failed");
          cb && cb(e);
        }
      });
    });
  }

  function saveConfig(clientId, calendarId) {
    return window.PlannerState.updateState((s) => {
      s.calendar.config.clientId = clientId || "";
      s.calendar.config.calendarId = calendarId || "primary";
      s.calendar.connected = false;
      return s;
    });
  }

  function eventToTask(eventId) {
    const s = window.PlannerState.getState();
    const hit = (s.calendar.events || []).find((e) => e.id === eventId);
    if (!hit) return false;
    const due = hit.when ? hit.when.slice(0, 10) : "";
    const t = {
      id: `task_from_${eventId}_${Date.now()}`,
      title: hit.title,
      category: "personal",
      area: "personal",
      dueDate: due,
      priority: "medium",
      effort: "medium",
      energyType: "easy",
      status: "todo",
      recurring: null,
      notes: hit.location || hit.notes || "",
      pinnedDoNext: false,
      linkedAreaRecordId: "",
      sourceRef: { type: "calendar", id: eventId },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      source: "calendar",
    };
    window.PlannerTasks.upsertTask(t);
    return true;
  }

  window.PlannerCalendar = {
    saveConfig,
    syncCalendar,
    eventToTask,
  };
})();
