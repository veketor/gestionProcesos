/* Tutorial + generador-corrector - multilang */
(function () {
  const {
    ALGORITHMS,
    simulate,
    gradeAgainstAny,
    generateExercise,
    generateExerciseFromSeed,
    decodeSeedParams,
    exampleExercise,
    exerciseFingerprint,
    queueToSlots,
    slotsToQueue,
    formatAvg,
    round2,
    buildExam,
    hydrateExamItem,
    materializeExamItem,
    toExamStatementItem,
    buildExamSubmissionEntry,
    gradeExam,
    validateExamKey,
    todayLocalYmd,
    sealExamSubmission,
    verifyExamSubmissionSeal,
    emptyStudentAnswer,
  } = window.Scheduler;
  const { t, art, algoName, algoFull, getSlides, getLang, toggleLang } = window.I18n;

  let SLIDES = getSlides();
  const DEMO_PROCS = [
    { id: "P1", burst: 5, arrival: 0, priority: 2 },
    { id: "P2", burst: 3, arrival: 1, priority: 1 },
    { id: "P3", burst: 4, arrival: 2, priority: 3 },
  ];

  const SEEN_KEY = "cronograma_seen_v1";
  const ALGO_CARDS = [
    { value: "fcfs", key: "fcfs" },
    { value: "sjf", key: "sjf" },
    { value: "srtf", key: "srtf" },
    { value: "prioridad_np", key: "prioridad" },
    { value: "prioridad", key: "prioridad_ap" },
    { value: "rr", key: "rr" },
  ];

  let slideIndex = 0;
  let exercise = null;
  let studentGrid = [];
  let studentQueues = [];
  let showingSolution = false;
  let walkFocusTime = null;
  let walk = {
    active: false,
    playing: false,
    step: 0,
    steps: [],
    timer: null,
  };
  let tutorialGuide = {
    timer: null,
    playing: false,
    step: 0,
    steps: [],
    sol: null,
    procs: null,
    root: null,
  };

  /** Estado del modo examen (alumno). */
  let examMode = {
    active: false,
    exam: null,
    index: 0,
    answers: [],
    packages: [],
    studentName: "",
    /** Seguimiento de pantalla completa durante el examen */
    fullscreenLog: null,
  };
  let examCreateJson = null;
  let examTakeLoaded = null;
  let examGradeAnswers = null;
  let examGradeReport = null;
  let examGradeSourceName = "";
  let examFinishCode = "";

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

  function loadSeen() {
    try {
      return new Set(JSON.parse(sessionStorage.getItem(SEEN_KEY) || "[]"));
    } catch {
      return new Set();
    }
  }

  function saveSeen(set) {
    sessionStorage.setItem(SEEN_KEY, JSON.stringify([...set]));
  }

  function applyStaticI18n() {
    const lang = getLang();
    document.documentElement.lang = lang;
    document.title = t("docTitle");
    const meta = document.querySelector('meta[name="description"]');
    if (meta) meta.setAttribute("content", t("docDesc"));
    const badge = $("#lang-badge");
    badge.textContent = lang === "es" ? "ES" : "EN";
    badge.title = lang === "es" ? "Cambiar a English" : "Switch to Español";
    badge.setAttribute(
      "aria-label",
      lang === "es" ? "Idioma: español. Pulsar para inglés" : "Language: English. Click for Spanish"
    );

    $$("[data-i18n]").forEach((el) => {
      const key = el.getAttribute("data-i18n");
      const val = t(key);
      if (typeof val === "string") el.textContent = val;
    });
    $$("[data-i18n-aria]").forEach((el) => {
      el.setAttribute("aria-label", t(el.getAttribute("data-i18n-aria")));
    });

    const hero = $("#hero-art");
    if (hero) {
      hero.src = art("intro");
      hero.alt = t("heroAlt");
    }

    // opciones del select
    const sel = $("#ex-algo");
    const opts = t("algoOptions");
    [...sel.options].forEach((opt) => {
      if (opts[opt.value]) opt.textContent = opts[opt.value];
    });
    syncAvgMetricTips();
  }

  function applyLanguage() {
    SLIDES = getSlides();
    if (slideIndex >= SLIDES.length) slideIndex = SLIDES.length - 1;
    applyStaticI18n();
    const active = document.querySelector(".view.active")?.dataset.view || "intro";
    if (active === "tutorial") renderSlide();
    if (active === "exercise") {
      renderAlgoPicker();
      if (exercise) {
        syncToolbarFromExercise();
        if (walk.active) {
          const playing = walk.playing;
          const step = walk.step;
          walk.steps = buildWalkSteps(exercise.solution);
          walk.step = Math.min(step, walk.steps.length - 1);
          applyWalkVisual(walk.steps[walk.step]);
          walk.playing = playing;
          syncWalkPlayButton();
          if (playing) scheduleWalkNext();
        } else {
          renderExercise();
        }
      }
    }
  }

  function renderAlgoPicker() {
    const host = $("#algo-picker");
    const current = $("#ex-algo").value;
    const blurbs =
      getLang() === "es"
        ? {
            fcfs: "First Come / First In… — el primero que llega",
            sjf: "Shortest Job First — el más corto",
            srtf: "Shortest Remaining… — el de menos restante",
            prioridad_np: "Mejor prioridad, sin desalojar",
            prioridad: "Mejor prioridad puede interrumpir",
            rr: "Turno rotatorio con quantum",
          }
        : {
            fcfs: "First Come First Served / First In, First Out",
            sjf: "Shortest Job First",
            srtf: "Shortest Remaining Time First",
            prioridad_np: "Best priority, no kick-out",
            prioridad: "Better priority can preempt",
            rr: "Rotating turns with a quantum",
          };

    host.innerHTML = ALGO_CARDS.map((c) => {
      const label = t("algoOptions")[c.value];
      const active = c.value === current ? "active" : "";
      return `<button type="button" class="algo-pick ${active}" data-algo="${c.value}">
        ${label}<small>${blurbs[c.value]}</small>
      </button>`;
    }).join("");

    $$(".algo-pick", host).forEach((btn) => {
      btn.addEventListener("click", () => {
        if (isExamTaking()) return;
        $("#ex-algo").value = btn.dataset.algo;
        onAlgoChange();
        renderAlgoPicker();
        // Al elegir algoritmo, genera ejercicio fresco de ese tipo
        loadRandom();
      });
    });
  }

  function showView(name) {
    if (examMode.active && name !== "exercise") {
      return; // durante la prueba no se sale por la nav
    }
    if (name !== "tutorial") stopTutorialGuide();
    $$(".view").forEach((v) => {
      const on = v.dataset.view === name;
      v.classList.toggle("active", on);
      v.hidden = !on;
    });
    $$(".nav-pills button").forEach((b) =>
      b.classList.toggle("active", b.dataset.view === name)
    );
    document.body.classList.toggle("exam-view", name === "exam");
    if (name === "tutorial") renderSlide();
    if (name === "exercise" && !examMode.active) {
      renderAlgoPicker();
      ensureExercise();
    }
    if (name === "exam") showExamHub();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function sanitizeDownloadName(name) {
    const cleaned = String(name || "")
      .trim()
      .replace(/[<>:"/\\|?*\u0000-\u001f]/g, "")
      .replace(/\s+/g, " ")
      .replace(/[. ]+$/g, "")
      .slice(0, 80);
    return cleaned || "prueba";
  }

  function downloadJson(filename, data) {
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  function readJsonFile(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        try {
          resolve(JSON.parse(String(reader.result || "")));
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = () => reject(reader.error || new Error("read failed"));
      reader.readAsText(file);
    });
  }

  const EXAM_TEACHER_REVEAL_MS = 15000;
  let examTeacherRevealTimer = null;

  function setExamTeacherCardsVisible(visible) {
    $$("[data-exam-teacher]").forEach((el) => {
      el.hidden = !visible;
      if (visible) el.removeAttribute("hidden");
      else el.setAttribute("hidden", "");
    });
  }

  function hideExamTeacherCards() {
    if (examTeacherRevealTimer) {
      clearTimeout(examTeacherRevealTimer);
      examTeacherRevealTimer = null;
    }
    setExamTeacherCardsVisible(false);
  }

  function revealExamTeacherCards() {
    const hub = $("#exam-hub");
    if (!hub || hub.hidden) return;
    setExamTeacherCardsVisible(true);
    if (examTeacherRevealTimer) clearTimeout(examTeacherRevealTimer);
    examTeacherRevealTimer = setTimeout(() => {
      examTeacherRevealTimer = null;
      setExamTeacherCardsVisible(false);
    }, EXAM_TEACHER_REVEAL_MS);
  }

  function showExamHub() {
    $("#exam-hub").hidden = false;
    $("#exam-create").hidden = true;
    $("#exam-take").hidden = true;
    $("#exam-grade").hidden = true;
    if (!examTeacherRevealTimer) setExamTeacherCardsVisible(false);
  }

  function showExamPanel(name) {
    $("#exam-hub").hidden = true;
    $("#exam-create").hidden = name !== "create";
    $("#exam-take").hidden = name !== "take";
    $("#exam-grade").hidden = name !== "grade";
    if (name === "create") {
      const dateInput = $("#exam-create-date");
      if (dateInput && !dateInput.value) {
        dateInput.value = todayLocalYmd();
      }
      syncExamCreateRows();
      applyStaticI18n();
    }
    if (name === "take") {
      resetExamTakePanel();
    }
  }

  function resetExamTakePanel() {
    const status = $("#exam-take-status");
    if (status) {
      status.hidden = true;
      status.setAttribute("hidden", "");
      status.textContent = "";
    }
    const fileInput = $("#exam-take-file");
    if (fileInput) fileInput.value = "";
    const nameInput = $("#exam-take-student-name");
    if (nameInput) nameInput.value = "";
    const nameErr = $("#exam-take-name-error");
    if (nameErr) {
      nameErr.hidden = true;
      nameErr.setAttribute("hidden", "");
      nameErr.textContent = "";
    }
    examTakeLoaded = null;
    setExamTakeDropActive(false);
    const load = $("#exam-take-load");
    const ready = $("#exam-take-ready");
    if (load) {
      load.hidden = false;
      load.removeAttribute("hidden");
    }
    if (ready) {
      ready.hidden = true;
      ready.setAttribute("hidden", "");
    }
  }

  function showExamTakeReady(exam) {
    const load = $("#exam-take-load");
    const ready = $("#exam-take-ready");
    const countEl = $("#exam-take-ready-count");
    const titleEl = $("#exam-take-ready-title");
    const n = exam?.exercises?.length || 0;
    if (countEl) {
      countEl.textContent = t("examTakeReadyCount", { n });
    }
    if (titleEl) {
      const title = String(exam?.title || "").trim();
      if (title) {
        titleEl.hidden = false;
        titleEl.removeAttribute("hidden");
        titleEl.textContent = title;
      } else {
        titleEl.hidden = true;
        titleEl.setAttribute("hidden", "");
        titleEl.textContent = "";
      }
    }
    if (load) {
      load.hidden = true;
      load.setAttribute("hidden", "");
    }
    if (ready) {
      ready.hidden = false;
      ready.removeAttribute("hidden");
    }
  }

  function setExamTakeDropActive(active) {
    const drop = $("#exam-take-drop");
    if (!drop) return;
    drop.classList.toggle("is-dragover", !!active);
  }

  function openExamKeyErrorModal(error) {
    const modal = $("#exam-key-error-modal");
    if (!modal) return;
    let titleKey = "examKeyErrorFormatTitle";
    let bodyKey = "examKeyErrorFormatBody";
    if (error === "integrity") {
      titleKey = "examKeyErrorIntegrityTitle";
      bodyKey = "examKeyErrorIntegrityBody";
    } else if (error === "date") {
      titleKey = "examKeyErrorDateTitle";
      bodyKey = "examKeyErrorDateBody";
    }
    const titleEl = $("#exam-key-error-title");
    const bodyEl = $("#exam-key-error-body");
    if (titleEl) titleEl.textContent = t(titleKey);
    if (bodyEl) bodyEl.textContent = t(bodyKey);
    modal.hidden = false;
    modal.removeAttribute("hidden");
  }

  function closeExamKeyErrorModal() {
    const modal = $("#exam-key-error-modal");
    if (!modal) return;
    modal.hidden = true;
    modal.setAttribute("hidden", "");
  }

  async function processExamKeyFile(file) {
    const status = $("#exam-take-status");
    examTakeLoaded = null;
    if (!file) return;
    if (status) {
      status.hidden = false;
      status.removeAttribute("hidden");
      status.textContent = t("examTakeLoading");
    }
    try {
      const data = await readJsonFile(file);
      const result = validateExamKey(data, { checkDate: true });
      if (!result.ok) {
        if (status) {
          status.hidden = true;
          status.setAttribute("hidden", "");
        }
        openExamKeyErrorModal(result.error || "format");
        return;
      }
      examTakeLoaded = result.exam;
      if (status) {
        status.hidden = true;
        status.setAttribute("hidden", "");
      }
      showExamTakeReady(result.exam);
    } catch {
      if (status) {
        status.hidden = true;
        status.setAttribute("hidden", "");
      }
      openExamKeyErrorModal("format");
    }
  }

  function algoOptionsHtml(selected) {
    return ALGO_CARDS.map((c) => {
      const label = t("algoOptions")[c.value] || c.value;
      const sel = c.value === selected ? "selected" : "";
      return `<option value="${c.value}" ${sel}>${label}</option>`;
    }).join("");
  }

  function syncExamCreateRows() {
    const host = $("#exam-create-rows");
    if (!host) return;
    const n = Math.min(20, Math.max(1, Number($("#exam-create-n")?.value) || 3));
    const prev = $$(".exam-create-row", host).map((row) => ({
      algorithm: row.querySelector("[data-field=algorithm]")?.value,
      mode: row.querySelector("[data-field=mode]")?.value,
      count: row.querySelector("[data-field=count]")?.value,
      quantum: row.querySelector("[data-field=quantum]")?.value,
    }));
    let html = "";
    for (let i = 0; i < n; i++) {
      const p = prev[i] || {};
      const algo = p.algorithm || "fcfs";
      const mode = p.mode || "random";
      const needsQ = algo === "rr";
      html += `<div class="exam-create-row" data-idx="${i}">
        <span class="exam-row-idx">E${i + 1}</span>
        <label><span data-i18n="examRowAlgo">${t("examRowAlgo")}</span>
          <select data-field="algorithm">${algoOptionsHtml(algo)}</select>
        </label>
        <label><span data-i18n="examRowMode">${t("examRowMode")}</span>
          <select data-field="mode">
            <option value="random" ${mode === "random" ? "selected" : ""}>${t("examModeRandom")}</option>
            <option value="params" ${mode === "params" ? "selected" : ""}>${t("examModeParams")}</option>
          </select>
        </label>
        <label class="exam-param-count" ${mode === "params" ? "" : "hidden"}>
          <span data-i18n="examRowCount">${t("examRowCount")}</span>
          <select data-field="count">${[3, 4, 5, 6, 7, 8]
            .map(
              (n) =>
                `<option value="${n}" ${Number(p.count || 5) === n ? "selected" : ""}>${n}</option>`
            )
            .join("")}</select>
        </label>
        <label class="exam-param-quantum" ${mode === "params" && needsQ ? "" : "hidden"}>
          <span data-i18n="examRowQuantum">${t("examRowQuantum")}</span>
          <select data-field="quantum">${[1, 2, 3, 4, 5]
            .map(
              (n) =>
                `<option value="${n}" ${Number(p.quantum || 3) === n ? "selected" : ""}>${n}</option>`
            )
            .join("")}</select>
        </label>
      </div>`;
    }
    host.innerHTML = html;
    $$(".exam-create-row", host).forEach((row) => {
      const sync = () => {
        const mode = row.querySelector("[data-field=mode]")?.value;
        const algo = row.querySelector("[data-field=algorithm]")?.value;
        const countLab = row.querySelector(".exam-param-count");
        const qLab = row.querySelector(".exam-param-quantum");
        const showParams = mode === "params";
        const showQuantum = showParams && algo === "rr";
        if (countLab) {
          countLab.hidden = !showParams;
          if (showParams) countLab.removeAttribute("hidden");
          else countLab.setAttribute("hidden", "");
        }
        if (qLab) {
          qLab.hidden = !showQuantum;
          if (showQuantum) qLab.removeAttribute("hidden");
          else qLab.setAttribute("hidden", "");
        }
      };
      row.querySelector("[data-field=mode]")?.addEventListener("change", sync);
      row.querySelector("[data-field=algorithm]")?.addEventListener("change", sync);
      sync();
    });
  }

  function collectExamCreateSpecs() {
    return $$("#exam-create-rows .exam-create-row").map((row, i) => {
      const algorithm = row.querySelector("[data-field=algorithm]")?.value || "fcfs";
      const mode = row.querySelector("[data-field=mode]")?.value || "random";
      const spec = { id: `E${i + 1}`, algorithm, mode };
      if (mode === "params") {
        spec.count = Number(row.querySelector("[data-field=count]")?.value) || 5;
        if (algorithm === "rr") {
          spec.quantum = Number(row.querySelector("[data-field=quantum]")?.value) || 3;
        }
      }
      return spec;
    });
  }

  function saveCurrentExamAnswer() {
    if (!examMode.active || !exercise) return;
    const item = examMode.exam.exercises[examMode.index];
    const student = collectStudent();
    const pkg = examMode.packages[examMode.index] || exercise;
    // Formato reproducible: statement (enunciado) + answer (respuesta)
    examMode.answers[examMode.index] = buildExamSubmissionEntry(
      pkg,
      student,
      item.id
    );
  }

  function restoreExamAnswer(ans) {
    const sol = exercise.solution;
    const rows = exercise.processes.length;
    const cols = sol.cols;
    const answer = ans?.answer || ans || {};
    const grid = answer.grid || ans?.grid;
    const queueSlots = answer.queueSlots || ans?.queueSlots;
    if (grid?.length) {
      studentGrid = grid.map((row) => {
        const r = row.slice(0, cols);
        while (r.length < cols) r.push("");
        return r;
      });
      while (studentGrid.length < rows) {
        studentGrid.push(Array(cols).fill(""));
      }
    } else {
      studentGrid = Array.from({ length: rows }, () => Array(cols).fill(""));
    }
    if (queueSlots?.length) {
      studentQueues = queueSlots.map((slots) => {
        const s = (slots || []).slice(0, rows);
        while (s.length < rows) s.push("");
        return s;
      });
      while (studentQueues.length < cols) {
        studentQueues.push(Array(rows).fill(""));
      }
    } else {
      studentQueues = Array.from({ length: cols }, () => Array(rows).fill(""));
    }
  }

  function loadExamExerciseAt(index) {
    examMode.index = index;
    const pkg = examMode.packages[index];
    exercise = pkg;
    showingSolution = false;
    stopWalkthrough(false);
    const ans = examMode.answers[index];
    const answer = ans?.answer || ans || {};
    const metrics = answer.metrics || ans?.metrics;
    const averages = answer.averages || {};
    restoreExamAnswer(ans);
    // Rellenar métricas tras render
    renderExercise();
    if (metrics) {
      metrics.forEach((m, i) => {
        if (!m) return;
        ["start", "finish", "retorno", "espera"].forEach((field) => {
          const input = $(`#proc-table input[data-metric="${i}"][data-field="${field}"]`);
          if (input && m[field] != null && m[field] !== "") {
            input.value = m[field];
          }
        });
      });
    }
    const ar = $("#avg-retorno");
    const ae = $("#avg-espera");
    if (ar) {
      ar.value =
        averages.retorno != null && averages.retorno !== ""
          ? averages.retorno
          : ans?.avgRetorno ?? "";
    }
    if (ae) {
      ae.value =
        averages.espera != null && averages.espera !== ""
          ? averages.espera
          : ans?.avgEspera ?? "";
    }
    syncToolbarFromExercise();
    syncCorrectButton();
    updateExamBar();
  }

  function updateExamBar() {
    const bar = $("#exam-bar");
    if (!bar) return;
    const n = examMode.exam?.exercises?.length || 0;
    $("#exam-bar-progress").textContent = `${examMode.index + 1} / ${n}`;
    const item = examMode.exam.exercises[examMode.index];
    $("#exam-bar-algo").textContent = algoFull(item.algorithm);
    $("#exam-prev").disabled = examMode.index <= 0;
    $("#exam-next").disabled = examMode.index >= n - 1;
    const title = examMode.exam.title || t("examBarTitle");
    $("#exam-bar-title").textContent = title;
  }

  function isDocumentFullscreen() {
    return Boolean(
      document.fullscreenElement ||
        document.webkitFullscreenElement ||
        document.msFullscreenElement
    );
  }

  function requestExamFullscreen() {
    const el = document.documentElement;
    const req =
      el.requestFullscreen ||
      el.webkitRequestFullscreen ||
      el.msRequestFullscreen;
    if (!req) return Promise.resolve(false);
    try {
      const p = req.call(el);
      return Promise.resolve(p).then(() => true).catch(() => false);
    } catch {
      return Promise.resolve(false);
    }
  }

  function exitExamFullscreen() {
    if (!isDocumentFullscreen()) return;
    const exit =
      document.exitFullscreen ||
      document.webkitExitFullscreen ||
      document.msExitFullscreen;
    if (!exit) return;
    try {
      exit.call(document);
    } catch {
      /* ignore */
    }
  }

  function createFullscreenLog() {
    const now = Date.now();
    return {
      startedAt: new Date(now).toISOString(),
      currentState: isDocumentFullscreen() ? "fullscreen" : "windowed",
      segmentStartedAt: now,
      enterCount: 0,
      exitCount: 0,
      segments: [],
    };
  }

  function closeFullscreenSegment(log, nextState, atMs) {
    if (!log) return;
    const end = atMs ?? Date.now();
    const durationMs = Math.max(0, end - log.segmentStartedAt);
    log.segments.push({
      state: log.currentState,
      from: new Date(log.segmentStartedAt).toISOString(),
      to: new Date(end).toISOString(),
      durationMs,
      durationSec: Math.round(durationMs / 100) / 10,
    });
    log.segmentStartedAt = end;
    log.currentState = nextState;
  }

  function recordFullscreenTransition(nowInFullscreen) {
    const log = examMode.fullscreenLog;
    if (!log || !examMode.active) return;
    const next = nowInFullscreen ? "fullscreen" : "windowed";
    if (next === log.currentState) return;
    if (next === "fullscreen") log.enterCount += 1;
    else log.exitCount += 1;
    closeFullscreenSegment(log, next, Date.now());
  }

  function finalizeFullscreenLog() {
    const log = examMode.fullscreenLog;
    if (!log) return null;
    const end = Date.now();
    const durationMs = Math.max(0, end - log.segmentStartedAt);
    log.segments.push({
      state: log.currentState,
      from: new Date(log.segmentStartedAt).toISOString(),
      to: new Date(end).toISOString(),
      durationMs,
      durationSec: Math.round(durationMs / 100) / 10,
    });

    let timeFullscreenMs = 0;
    let timeWindowedMs = 0;
    log.segments.forEach((s) => {
      if (s.state === "fullscreen") timeFullscreenMs += s.durationMs;
      else timeWindowedMs += s.durationMs;
    });
    return {
      startedAt: log.startedAt,
      endedAt: new Date(end).toISOString(),
      enterCount: log.enterCount,
      exitCount: log.exitCount,
      timeFullscreenMs,
      timeFullscreenSec: Math.round(timeFullscreenMs / 100) / 10,
      timeWindowedMs,
      timeWindowedSec: Math.round(timeWindowedMs / 100) / 10,
      segments: log.segments,
    };
  }

  function syncExamFullscreenBanner() {
    const banner = $("#exam-fs-banner");
    if (!banner) return;
    const show = examMode.active && !isDocumentFullscreen();
    banner.hidden = !show;
    if (show) banner.removeAttribute("hidden");
    else banner.setAttribute("hidden", "");
  }

  function onExamFullscreenChange() {
    if (!examMode.active) return;
    recordFullscreenTransition(isDocumentFullscreen());
    syncExamFullscreenBanner();
  }

  function enterExamTaking(exam, studentName) {
    examMode.active = true;
    examMode.exam = exam;
    examMode.studentName = String(studentName || "").trim();
    examMode.index = 0;
    examMode.fullscreenLog = createFullscreenLog();
    // Materializa aquí: cada alumno obtiene enunciados distintos si mode=random/params
    examMode.packages = exam.exercises.map((item) => materializeExamItem(item));
    examMode.answers = exam.exercises.map((item, i) =>
      buildExamSubmissionEntry(
        examMode.packages[i],
        {
          grid: [],
          queueSlots: [],
          metrics: [],
          avgRetorno: "",
          avgEspera: "",
        },
        item.id
      )
    );
    document.body.classList.add("exam-taking");
    const bar = $("#exam-bar");
    bar.hidden = false;
    bar.removeAttribute("hidden");
    showView("exercise");
    loadExamExerciseAt(0);
    // Pantalla completa (requiere el gesto del botón «Empezar»)
    requestExamFullscreen().then(() => {
      // Si el log empezó en windowed y ahora estamos en FS, registra la transición
      recordFullscreenTransition(isDocumentFullscreen());
      syncExamFullscreenBanner();
    });
  }

  function exitExamTaking() {
    examMode.active = false;
    examMode.exam = null;
    examMode.packages = [];
    examMode.answers = [];
    examMode.studentName = "";
    examMode.fullscreenLog = null;
    document.body.classList.remove("exam-taking");
    const bar = $("#exam-bar");
    if (bar) {
      bar.hidden = true;
      bar.setAttribute("hidden", "");
    }
    const banner = $("#exam-fs-banner");
    if (banner) {
      banner.hidden = true;
      banner.setAttribute("hidden", "");
    }
    exitExamFullscreen();
    showView("exam");
    showExamHub();
  }

  function openExamFinishModal() {
    if (!examMode.active) return;
    const modal = $("#exam-finish-modal");
    if (!modal) return;
    $("#exam-finish-step-confirm").hidden = false;
    $("#exam-finish-step-confirm").removeAttribute("hidden");
    const stepCode = $("#exam-finish-step-code");
    stepCode.hidden = true;
    stepCode.setAttribute("hidden", "");
    const err = $("#exam-finish-code-error");
    if (err) {
      err.hidden = true;
      err.setAttribute("hidden", "");
    }
    const input = $("#exam-finish-code");
    if (input) input.value = "";
    examFinishCode = "";
    modal.hidden = false;
    modal.removeAttribute("hidden");
  }

  function closeExamFinishModal() {
    const modal = $("#exam-finish-modal");
    if (!modal) return;
    modal.hidden = true;
    modal.setAttribute("hidden", "");
    examFinishCode = "";
  }

  function showExamFinishCodeStep() {
    examFinishCode = String(100 + Math.floor(Math.random() * 900)); // 100–999
    $("#exam-finish-step-confirm").hidden = true;
    $("#exam-finish-step-confirm").setAttribute("hidden", "");
    const stepCode = $("#exam-finish-step-code");
    stepCode.hidden = false;
    stepCode.removeAttribute("hidden");
    const codeHint = $("#exam-finish-code-hint");
    if (codeHint) {
      codeHint.innerHTML = t("examFinishCodeHint", {
        code: `<strong class="exam-finish-code-val">${examFinishCode}</strong>`,
      });
    }
    const err = $("#exam-finish-code-error");
    if (err) {
      err.hidden = true;
      err.setAttribute("hidden", "");
    }
    const input = $("#exam-finish-code");
    if (input) {
      input.value = "";
      input.focus();
    }
  }

  function commitExamFinish() {
    if (!examMode.active) return;
    saveCurrentExamAnswer();
    // Asegura que todos los bloques tengan enunciado + respuesta actualizados
    examMode.exam.exercises.forEach((item, i) => {
      if (i === examMode.index) return;
      if (!examMode.answers[i]?.statement?.processes?.length) {
        examMode.answers[i] = buildExamSubmissionEntry(
          examMode.packages[i],
          {
            grid: examMode.answers[i]?.answer?.grid || [],
            queueSlots: examMode.answers[i]?.answer?.queueSlots || [],
            metrics: examMode.answers[i]?.answer?.metrics || [],
            avgRetorno: examMode.answers[i]?.answer?.averages?.retorno ?? "",
            avgEspera: examMode.answers[i]?.answer?.averages?.espera ?? "",
          },
          item.id
        );
      }
    });
    const fullscreenTracking = finalizeFullscreenLog();
    const payload = sealExamSubmission({
      version: 2,
      kind: "student-exam-submission",
      submittedAt: new Date().toISOString(),
      studentName: examMode.studentName || "",
      // Copia del JSON llave + enunciados materializados en cada ejercicio
      exam: {
        version: examMode.exam.version || 2,
        createdAt: examMode.exam.createdAt || "",
        title: examMode.exam.title || "",
        rd: examMode.exam.rd || "",
        qk: examMode.exam.qk || "",
        exercises: examMode.exam.exercises,
      },
      fullscreenTracking,
      exercises: examMode.answers,
    });
    const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
    const nameSlug = sanitizeDownloadName(examMode.studentName || "alumno");
    downloadJson(`respuestas-prueba-${nameSlug}-${stamp}.json`, payload);
    closeExamFinishModal();
    exitExamTaking();
  }

  function finishExam() {
    openExamFinishModal();
  }

  function renderFullscreenTrackingReport(tracking) {
    const host = $("#exam-grade-fs");
    if (!host) return;
    host.hidden = false;
    host.removeAttribute("hidden");
    if (!tracking) {
      host.innerHTML = `<h4>${t("examFsReportTitle")}</h4><p>${t("examFsReportNone")}</p>`;
      return;
    }
    const stateLabel = (s) =>
      s === "fullscreen" ? t("examFsStateFullscreen") : t("examFsStateWindowed");
    const segs = (tracking.segments || [])
      .map((s) => {
        const from = String(s.from || "").replace("T", " ").slice(0, 19);
        const to = String(s.to || "").replace("T", " ").slice(0, 19);
        return `<li>${t("examFsReportSegment", {
          state: stateLabel(s.state),
          from,
          to,
          sec: s.durationSec ?? Math.round((s.durationMs || 0) / 100) / 10,
        })}</li>`;
      })
      .join("");
    host.innerHTML = `
      <h4>${t("examFsReportTitle")}</h4>
      <p>${t("examFsReportSummary", {
        enters: tracking.enterCount ?? 0,
        exits: tracking.exitCount ?? 0,
        fs: tracking.timeFullscreenSec ?? 0,
        win: tracking.timeWindowedSec ?? 0,
      })}</p>
      ${segs ? `<ul>${segs}</ul>` : ""}
    `;
  }

  function stopTutorialGuide() {
    if (tutorialGuide.timer) {
      clearTimeout(tutorialGuide.timer);
      tutorialGuide.timer = null;
    }
    tutorialGuide.playing = false;
    tutorialGuide.steps = [];
    tutorialGuide.root = null;
  }

  function renderSlide() {
    stopTutorialGuide();
    const slide = SLIDES[slideIndex];
    const total = SLIDES.length;
    $("#progress-fill").style.width = `${((slideIndex + 1) / total) * 100}%`;
    $("#progress-label").textContent = `${slideIndex + 1} / ${total}`;

    const panel = $("#slide-panel");
    panel.innerHTML = `
      <div class="comic-art-wrap">
        <div class="comic-art-frame">
          <img src="${art(slide.artKey)}" alt="" />
        </div>
        <div class="speech">${slide.bubble}</div>
      </div>
      <div class="slide-body">
        ${slide.chips || ""}
        <h2>${slide.title}</h2>
        <p class="lead">${slide.lead}</p>
        ${slide.body}
      </div>
    `;

    $("#btn-prev").disabled = slideIndex === 0;
    const next = $("#btn-next");
    next.textContent =
      slideIndex === total - 1 ? t("btnNextExercise") : t("btnNext");

    if (slide.algo) {
      const host =
        panel.querySelector(`#demo-${slide.id}`) ||
        panel.querySelector(".tutorial-guide");
      if (host) {
        const algo = host.dataset.guideAlgo || slide.algo;
        const q = algo === "rr" ? 2 : 3;
        mountTutorialGuide(host, DEMO_PROCS, algo, q);
      }
    }
  }

  /** Último instante con actividad real (E/L/F o CPU), sin columnas vacías de relleno. */
  function lastActiveTime(sol) {
    let last = -1;
    const cols = sol.cols || 0;
    for (let time = 0; time < cols; time++) {
      const busy =
        sol.timeline[time] != null ||
        (sol.grid &&
          sol.grid.some(
            (row) =>
              row[time] === "E" || row[time] === "F" || row[time] === "L"
          ));
      if (busy) last = time;
    }
    return last < 0 ? Math.max(cols - 1, 0) : last;
  }

  function buildGuideSteps(sol, procs) {
    const horizon = lastActiveTime(sol);
    const steps = [
      { kind: "intro", untilTime: -1, text: t("walkIntro") },
    ];
    for (let time = 0; time <= horizon; time++) {
      const cpu = sol.timeline[time];
      const arrivals = procs
        .filter((p) => p.arrival === time)
        .map((p) => p.id);
      const queue = (sol.queues[time] || []).join(" → ") || t("walkQueueEmpty");
      const arrivalTxt = arrivals.length
        ? arrivals.join(", ")
        : t("walkNoArrival");
      steps.push({
        kind: "tick",
        untilTime: time,
        focusTime: time,
        text: cpu
          ? t("walkTick", {
              t: time,
              cpu,
              arrivals: arrivalTxt,
              queue,
            })
          : t("walkTickIdle", {
              t: time,
              arrivals: arrivalTxt,
              queue,
            }),
      });
    }
    steps.push({
      kind: "metrics",
      untilTime: horizon,
      fillAverages: true,
      text: t("walkMetrics", {
        avgR: formatAvg(sol.avgRetorno),
        avgE: formatAvg(sol.avgEspera),
      }),
    });
    steps.push({
      kind: "done",
      untilTime: horizon,
      fillAverages: true,
      text: t("walkDone"),
    });
    return steps;
  }

  function startTutorialGuidePlayback() {
    const overlay = tutorialGuide.root?.querySelector("[data-guide-overlay]");
    if (overlay) overlay.remove();
    tutorialGuide.playing = true;
    syncGuidePlayBtn();
    const target = tutorialGuide.root?.querySelector(".guide-box") || tutorialGuide.root;
    if (target) {
      target.scrollIntoView({ behavior: "smooth", block: "center" });
    }
    scheduleTutorialGuide();
  }

  function mountTutorialGuide(host, procs, algorithm, quantum) {
    const sol = simulate(procs, algorithm, quantum);
    tutorialGuide.sol = sol;
    tutorialGuide.procs = procs;
    tutorialGuide.steps = buildGuideSteps(sol, procs);
    tutorialGuide.step = 0;
    tutorialGuide.playing = false;
    tutorialGuide.root = host;

    const needsPri = algorithm === "prioridad" || algorithm === "prioridad_ap";
    host.innerHTML = `
      <div class="guide-box">
        <div class="guide-head">
          <strong>${t("guideTitle")}</strong>
          <span class="guide-progress" data-guide-progress>1 / ${tutorialGuide.steps.length}</span>
        </div>
        <p class="guide-hint">${t("guideHint")}</p>
        <div class="guide-meta">
          <span class="tag">${algoName(algorithm)}</span>
          ${algorithm === "rr" ? `<span class="tag">Quantum ${quantum}</span>` : ""}
        </div>
        <div class="guide-table-wrap">
          <table class="data guide-proc-table">
            <thead>
              <tr>
                <th>${t("colProcess")}</th>
                <th>${t("colBurst")}</th>
                <th>${t("colArrival")}</th>
                ${needsPri ? `<th>${t("colPriority")}</th>` : ""}
                <th>${t("colStart")}</th>
                <th>${t("colFinish")}</th>
                <th>${t("colReturn")}</th>
                <th>${t("colWait")}</th>
              </tr>
            </thead>
            <tbody data-guide-metrics></tbody>
          </table>
        </div>
        <div class="guide-avgs">
          <span>${t("avgReturn")}: <strong data-guide-avgr>—</strong></span>
          <span>${t("avgWait")}: <strong data-guide-avge>—</strong></span>
        </div>
        <div class="guide-crono-scroll">
          <div class="guide-crono" data-guide-crono></div>
        </div>
        <p class="guide-narration" data-guide-narration></p>
        <div class="guide-controls">
          <button type="button" class="btn btn-secondary" data-guide-prev>${t("walkPrev")}</button>
          <button type="button" class="btn btn-primary" data-guide-play>${t("walkPlay")}</button>
          <button type="button" class="btn btn-secondary" data-guide-next>${t("walkNext")}</button>
          <label class="walk-speed">
            <span>${t("walkSpeed")}</span>
            <select data-guide-speed>
              <option value="1400">0.75×</option>
              <option value="900" selected>1×</option>
              <option value="550">1.5×</option>
              <option value="350">2×</option>
            </select>
          </label>
        </div>
        <div class="guide-overlay" data-guide-overlay>
          <button type="button" class="btn btn-primary guide-start" data-guide-start>${t("guideStart")}</button>
        </div>
      </div>
    `;

    host.querySelector("[data-guide-prev]").addEventListener("click", () => {
      if (tutorialGuide.step <= 0) return;
      clearTimeout(tutorialGuide.timer);
      tutorialGuide.playing = false;
      syncGuidePlayBtn();
      tutorialGuide.step -= 1;
      paintTutorialGuideStep();
    });
    host.querySelector("[data-guide-next]").addEventListener("click", () => {
      if (tutorialGuide.step >= tutorialGuide.steps.length - 1) return;
      clearTimeout(tutorialGuide.timer);
      tutorialGuide.playing = false;
      syncGuidePlayBtn();
      tutorialGuide.step += 1;
      paintTutorialGuideStep();
    });
    host.querySelector("[data-guide-play]").addEventListener("click", () => {
      const atEnd = tutorialGuide.step >= tutorialGuide.steps.length - 1;
      if (atEnd && !tutorialGuide.playing) {
        clearTimeout(tutorialGuide.timer);
        tutorialGuide.step = 0;
        tutorialGuide.playing = true;
        paintTutorialGuideStep();
        scheduleTutorialGuide();
        return;
      }
      tutorialGuide.playing = !tutorialGuide.playing;
      syncGuidePlayBtn();
      if (tutorialGuide.playing) scheduleTutorialGuide();
      else clearTimeout(tutorialGuide.timer);
    });
    host.querySelector("[data-guide-speed]").addEventListener("change", () => {
      if (tutorialGuide.playing) scheduleTutorialGuide();
    });
    host.querySelector("[data-guide-start]").addEventListener("click", () => {
      startTutorialGuidePlayback();
    });

    paintTutorialGuideStep();
  }

  function syncGuidePlayBtn() {
    const btn = tutorialGuide.root?.querySelector("[data-guide-play]");
    if (!btn) return;
    const atEnd =
      tutorialGuide.steps.length > 0 &&
      tutorialGuide.step >= tutorialGuide.steps.length - 1;
    if (tutorialGuide.playing) btn.textContent = t("walkPause");
    else if (atEnd) btn.textContent = t("walkRestart");
    else btn.textContent = t("walkPlay");
  }

  function scheduleTutorialGuide() {
    clearTimeout(tutorialGuide.timer);
    if (!tutorialGuide.playing || !tutorialGuide.root) return;
    if (tutorialGuide.step >= tutorialGuide.steps.length - 1) {
      tutorialGuide.playing = false;
      syncGuidePlayBtn();
      return;
    }
    const ms = Number(
      tutorialGuide.root.querySelector("[data-guide-speed]")?.value || 900
    );
    tutorialGuide.timer = setTimeout(() => {
      tutorialGuide.step += 1;
      paintTutorialGuideStep();
      scheduleTutorialGuide();
    }, ms);
  }

  function paintTutorialGuideStep() {
    const root = tutorialGuide.root;
    const sol = tutorialGuide.sol;
    const procs = tutorialGuide.procs;
    if (!root || !sol) return;
    const step = tutorialGuide.steps[tutorialGuide.step];
    if (!step) return;
    const until = step.untilTime;
    const n = procs.length;
    const cols = lastActiveTime(sol) + 1;
    const needsPri =
      sol.algorithm === "prioridad" || sol.algorithm === "prioridad_ap";

    // metrics
    let metricsHtml = "";
    procs.forEach((p, i) => {
      const m = sol.processes[i];
      const start =
        m.start != null && until >= 0 && m.start <= until ? m.start : "·";
      const finish =
        m.finish != null && until >= 0 && m.finish <= until ? m.finish : "·";
      const retorno = finish !== "·" ? m.retorno : "·";
      const espera = finish !== "·" ? m.espera : "·";
      metricsHtml += `<tr>
        <td class="pid">${p.id}</td>
        <td>${p.burst}</td>
        <td>${p.arrival}</td>
        ${needsPri ? `<td>${p.priority}</td>` : ""}
        <td>${start}</td><td>${finish}</td><td>${retorno}</td><td>${espera}</td>
      </tr>`;
    });
    root.querySelector("[data-guide-metrics]").innerHTML = metricsHtml;

    if (step.fillAverages) {
      root.querySelector("[data-guide-avgr]").textContent = formatAvg(
        sol.avgRetorno
      );
      root.querySelector("[data-guide-avge]").textContent = formatAvg(
        sol.avgEspera
      );
    } else {
      root.querySelector("[data-guide-avgr]").textContent = "—";
      root.querySelector("[data-guide-avge]").textContent = "—";
    }

    // cronograma
    let crono = `<div class="guide-grid" style="grid-template-columns: 2.1rem repeat(${cols}, minmax(0,1fr))">`;
    crono += `<div class="crono-label" style="min-height:1.2rem;background:var(--paper-deep)"></div>`;
    for (let time = 0; time < cols; time++) {
      const focus =
        step.focusTime === time ? " walk-focus" : "";
      crono += `<div class="crono-time${focus}">${time}</div>`;
    }
    crono += `<div class="crono-label queue-label" style="min-height:${n * 0.95}rem;background:#dff3f2">${t("queue")}<small>${t("queueStackHint")}</small></div>`;
    for (let time = 0; time < cols; time++) {
      const focus = step.focusTime === time ? " walk-focus" : "";
      const slots =
        time <= until
          ? queueToSlots(sol.queues[time] || [], n)
          : Array(n).fill("");
      crono += `<div class="queue-stack${focus}" style="min-height:${n * 0.95}rem">`;
      for (let s = 0; s < n; s++) {
        const id = slots[s] || "";
        crono += `<div class="queue-slot${id ? " filled" : ""}${s === n - 1 ? " near" : ""}">${id || "·"}</div>`;
      }
      crono += `</div>`;
    }
    for (let i = 0; i < n; i++) {
      crono += `<div class="crono-label">${procs[i].id}</div>`;
      for (let time = 0; time < cols; time++) {
        const st = time <= until ? sol.grid[i][time] || "" : "";
        const focus = step.focusTime === time ? " walk-focus walk-pop" : "";
        crono += `<div class="crono-cell ${st}${focus}">${st}</div>`;
      }
    }
    crono += `</div>`;
    root.querySelector("[data-guide-crono]").innerHTML = crono;

    root.querySelector("[data-guide-narration]").textContent = step.text;
    root.querySelector("[data-guide-progress]").textContent = `${
      tutorialGuide.step + 1
    } / ${tutorialGuide.steps.length}`;
    syncGuidePlayBtn();
  }

  function ensureExercise() {
    if (!exercise) loadRandom();
  }

  function selectedAlgorithm() {
    const algoSel = $("#ex-algo").value;
    if (algoSel === "prioridad") return "prioridad_ap";
    if (algoSel === "prioridad_np") return "prioridad";
    return algoSel;
  }

  function currentQuantumLabel() {
    const el = $("#ex-quantum");
    if (!el) return 3;
    const n = Number(el.textContent);
    return Number.isFinite(n) && n > 0 ? n : 3;
  }

  function setQuantumLabel(value) {
    const el = $("#ex-quantum");
    if (el) el.textContent = String(value);
  }

  function loadExample() {
    stopWalkthrough(false);
    const algo = selectedAlgorithm();
    const quantum = algo === "rr" ? currentQuantumLabel() || 3 : 3;
    exercise = exampleExercise(algo, quantum);
    exercise.fingerprint = exerciseFingerprint(
      algo,
      quantum,
      exercise.processes
    );
    syncToolbarFromExercise();
    resetStudentFromExercise();
    renderExercise();
  }

  function setQuantumFieldVisible(needsQ) {
    const field = $("#quantum-field");
    if (field) {
      field.hidden = !needsQ;
      if (needsQ) field.removeAttribute("hidden");
      else field.setAttribute("hidden", "");
    }
  }

  let genModalTab = "params";

  function applyGeneratedExercise(pkg, algo) {
    stopWalkthrough(false);
    const seen = loadSeen();
    exercise = pkg;
    if (exercise.reused) {
      [...seen].forEach((fp) => {
        if (fp.startsWith(`${algo}|`)) seen.delete(fp);
      });
      // Con semilla no regeneramos: el enunciado es fijo. Sin semilla, reintentamos.
      if (exercise.seed == null) {
        exercise = generateExercise(algo, {
          count: pkg.count || pkg.processes.length,
          quantum: pkg.quantum,
          seen,
        });
      }
    }
    if (exercise.fingerprint) {
      seen.add(exercise.fingerprint);
      saveSeen(seen);
    }
    syncToolbarFromExercise();
    resetStudentFromExercise();
    renderExercise();
  }

  /** Carga inicial / fallback: aleatorio sin modal. */
  function loadRandom() {
    const algo = selectedAlgorithm();
    const seen = loadSeen();
    const opts = {
      count: 3 + Math.floor(Math.random() * 3),
      seen,
    };
    if (algo === "rr") opts.quantum = 1 + Math.floor(Math.random() * 5);
    else opts.quantum = 3;
    applyGeneratedExercise(generateExercise(algo, opts), algo);
  }

  function syncGenModalUi() {
    const algo = selectedAlgorithm();
    const needsQ = algo === "rr";
    const qWrap = $("#gen-quantum-wrap");
    if (qWrap) {
      qWrap.hidden = !needsQ;
      if (needsQ) qWrap.removeAttribute("hidden");
      else qWrap.setAttribute("hidden", "");
    }
    const countEl = $("#gen-count");
    const qEl = $("#gen-quantum");
    if (countEl && $("#gen-count-val")) {
      $("#gen-count-val").textContent = countEl.value;
    }
    if (qEl && $("#gen-quantum-val")) {
      $("#gen-quantum-val").textContent = qEl.value;
    }
    updateSeedPreview();
  }

  function updateSeedPreview() {
    const preview = $("#gen-seed-preview");
    if (!preview) return;
    const raw = String($("#gen-seed")?.value || "").replace(/\D/g, "").slice(0, 6);
    if (raw === "") {
      preview.hidden = true;
      preview.textContent = "";
      return;
    }
    const algo = selectedAlgorithm();
    const { count, quantum } = decodeSeedParams(Number(raw), algo);
    const qPart =
      algo === "rr" ? t("genSeedPreviewQ", { q: quantum }) : "";
    preview.hidden = false;
    preview.removeAttribute("hidden");
    preview.textContent = t("genSeedPreview", { count, quantum: qPart });
  }

  function setGenModalTab(tab) {
    genModalTab = tab === "seed" ? "seed" : "params";
    $$(".modal__tab").forEach((btn) => {
      const on = btn.dataset.genTab === genModalTab;
      btn.classList.toggle("active", on);
      btn.setAttribute("aria-selected", on ? "true" : "false");
    });
    const params = $("#gen-panel-params");
    const seed = $("#gen-panel-seed");
    if (params) {
      params.classList.toggle("active", genModalTab === "params");
      params.hidden = genModalTab !== "params";
    }
    if (seed) {
      seed.classList.toggle("active", genModalTab === "seed");
      seed.hidden = genModalTab !== "seed";
    }
    if (genModalTab === "seed") {
      updateSeedPreview();
      $("#gen-seed")?.focus();
    }
  }

  function openGenModal() {
    const modal = $("#gen-modal");
    if (!modal) {
      loadRandom();
      return;
    }
    syncGenModalUi();
    setGenModalTab(genModalTab);
    modal.hidden = false;
    modal.removeAttribute("hidden");
  }

  function closeGenModal() {
    const modal = $("#gen-modal");
    if (!modal) return;
    modal.hidden = true;
    modal.setAttribute("hidden", "");
  }

  function confirmGenModal() {
    const algo = selectedAlgorithm();
    const seen = loadSeen();

    if (genModalTab === "seed") {
      const raw = String($("#gen-seed")?.value || "").replace(/\D/g, "").slice(0, 6);
      if (raw === "") {
        const seedInput = $("#gen-seed");
        if (seedInput) {
          seedInput.setCustomValidity(t("genSeedInvalid"));
          seedInput.reportValidity();
        }
        return;
      }
      const pkg = generateExerciseFromSeed(algo, raw);
      applyGeneratedExercise(pkg, algo);
      closeGenModal();
      return;
    }

    const count = Number($("#gen-count")?.value) || 5;
    const opts = { count, seen };
    if (algo === "rr") {
      opts.quantum = Number($("#gen-quantum")?.value) || 3;
    } else {
      opts.quantum = 3;
    }
    applyGeneratedExercise(generateExercise(algo, opts), algo);
    closeGenModal();
  }

  function syncToolbarFromExercise() {
    const a = exercise.algorithm;
    if (a === "prioridad_ap") $("#ex-algo").value = "prioridad";
    else if (a === "prioridad") $("#ex-algo").value = "prioridad_np";
    else $("#ex-algo").value = a;
    const meta = ALGORITHMS[a] || ALGORITHMS.fcfs;
    setQuantumFieldVisible(!!meta.needsQuantum);
    if (meta.needsQuantum) setQuantumLabel(exercise.quantum);
    renderAlgoPicker();
  }

  function resetStudentFromExercise() {
    showingSolution = false;
    const rows = exercise.processes.length;
    const cols = exercise.solution.cols;
    studentGrid = Array.from({ length: rows }, () => Array(cols).fill(""));
    studentQueues = Array.from({ length: cols }, () =>
      Array(rows).fill("")
    );
    const ar = $("#avg-retorno");
    const ae = $("#avg-espera");
    if (ar) ar.value = "";
    if (ae) ae.value = "";
    $("#feedback").className = "feedback";
    $("#feedback").innerHTML = "";
    $$("#proc-table tfoot .metric-inline").forEach((c) =>
      c.classList.remove("ok", "bad")
    );
  }

  function cycleState(cur) {
    const order = ["", "E", "L", "F"];
    const i = order.indexOf(cur);
    return order[(i + 1) % order.length];
  }

  function processIdCycle() {
    return [...exercise.processes.map((p) => p.id), ""];
  }

  function cycleQueueId(cur) {
    const order = processIdCycle();
    const up = String(cur || "").toUpperCase();
    let i = order.findIndex((x) => x.toUpperCase() === up);
    if (i < 0) i = order.length - 1; // vacío
    return order[(i + 1) % order.length];
  }

  function interactionLocked() {
    return showingSolution || walk.active;
  }

  function isExamTaking() {
    return Boolean(examMode.active);
  }

  function stopWalkTimer() {
    if (walk.timer) {
      clearTimeout(walk.timer);
      walk.timer = null;
    }
  }

  function buildWalkSteps(sol) {
    const horizon = lastActiveTime(sol);
    const steps = [];
    steps.push({
      kind: "intro",
      untilTime: -1,
      text: t("walkIntro"),
    });

    for (let time = 0; time <= horizon; time++) {
      const cpu = sol.timeline[time];
      const arrivals = exercise.processes
        .filter((p) => p.arrival === time)
        .map((p) => p.id);
      const queue = (sol.queues[time] || []).join(" → ") || t("walkQueueEmpty");
      const arrivalTxt = arrivals.length
        ? arrivals.join(", ")
        : t("walkNoArrival");
      const text = cpu
        ? t("walkTick", {
            t: time,
            cpu,
            arrivals: arrivalTxt,
            queue,
          })
        : t("walkTickIdle", {
            t: time,
            arrivals: arrivalTxt,
            queue,
          });
      steps.push({
        kind: "tick",
        untilTime: time,
        focusTime: time,
        text,
      });
    }

    steps.push({
      kind: "metrics",
      untilTime: horizon,
      fillAverages: true,
      text: t("walkMetrics", {
        avgR: formatAvg(sol.avgRetorno),
        avgE: formatAvg(sol.avgEspera),
      }),
    });
    steps.push({
      kind: "done",
      untilTime: horizon,
      fillAverages: true,
      text: t("walkDone"),
    });
    return steps;
  }

  /** Métricas visibles hasta el instante `until` (inclusive). */
  function metricsVisibleUntil(sol, until, fillAverages) {
    return sol.processes.map((m) => {
      const start =
        m.start != null && until >= 0 && m.start <= until ? m.start : "";
      const finish =
        m.finish != null && until >= 0 && m.finish <= until ? m.finish : "";
      const retorno = finish !== "" ? m.retorno : "";
      const espera = finish !== "" ? m.espera : "";
      return { start, finish, retorno, espera };
    });
  }

  function applyWalkVisual(step) {
    const sol = exercise.solution;
    const rows = exercise.processes.length;
    const cols = sol.cols;
    const until = step.untilTime;

    studentGrid = Array.from({ length: rows }, () => Array(cols).fill(""));
    studentQueues = Array.from({ length: cols }, () => Array(rows).fill(""));

    for (let time = 0; time <= until; time++) {
      for (let i = 0; i < rows; i++) {
        studentGrid[i][time] = sol.grid[i][time] || "";
      }
      studentQueues[time] = queueToSlots(sol.queues[time] || [], rows);
    }

    walkFocusTime = step.focusTime != null ? step.focusTime : null;
    showingSolution = false;
    renderExercisePartialMetrics({
      until,
      fillAverages: Boolean(step.fillAverages),
      partialMetrics: metricsVisibleUntil(
        sol,
        until,
        Boolean(step.fillAverages)
      ),
    });

    $("#walk-narration").textContent = step.text;
    $("#walk-progress").textContent = `${walk.step + 1} / ${walk.steps.length}`;
    highlightWalkColumn(walkFocusTime);
  }

  function avgFooterHtml(needsPri, avgR, avgE) {
    const leadCols = needsPri ? 5 : 4;
    const r = avgR == null || avgR === "" ? "" : avgR;
    const e = avgE == null || avgE === "" ? "" : avgE;
    return `<tr class="avg-row">
      <td class="avg-legend-cell" colspan="${leadCols}">
        <div class="avg-legend" aria-label="${escapeHtml(t("chipE"))}">
          <span class="chip e">${t("chipE")}</span>
          <span class="chip l">${t("chipL")}</span>
          <span class="chip f">${t("chipF")}</span>
        </div>
      </td>
      <td class="avg-label">${t("avgMeansLabel")}</td>
      <td class="metric-inline" id="metric-retorno" title="${escapeHtml(t("tipAvgReturn"))}">
        <input id="avg-retorno" type="number" step="0.01" placeholder="?" value="${r}" title="${escapeHtml(t("tipAvgReturn"))}" />
      </td>
      <td class="metric-inline" id="metric-espera" title="${escapeHtml(t("tipAvgWait"))}">
        <input id="avg-espera" type="number" step="0.01" placeholder="?" value="${e}" title="${escapeHtml(t("tipAvgWait"))}" />
      </td>
    </tr>`;
  }

  function renderExercisePartialMetrics(opts) {
    const sol = exercise.solution;
    const procs = exercise.processes;
    const needsPri =
      exercise.algorithm === "prioridad" || exercise.algorithm === "prioridad_ap";
    const partial = opts?.partialMetrics || null;
    const fillAverages = Boolean(opts?.fillAverages);

    const thead = `<tr>
      <th>${t("colProcess")}</th><th>${t("colBurst")}</th><th>${t("colArrival")}</th>
      ${needsPri ? `<th>${t("colPriority")}</th>` : ""}
      <th>${t("colStart")}</th><th>${t("colFinish")}</th>
      <th class="th-tip" title="${escapeHtml(t("tipReturn"))}">${t("colReturn")}</th>
      <th class="th-tip" title="${escapeHtml(t("tipWait"))}">${t("colWait")}</th>
    </tr>`;
    let tbody = "";
    procs.forEach((p, i) => {
      const m = partial ? partial[i] : { start: "", finish: "", retorno: "", espera: "" };
      tbody += `<tr>
        <td class="pid given">${p.id}</td>
        <td class="given">${p.burst}</td>
        <td class="given">${p.arrival}</td>
        ${needsPri ? `<td class="given">${p.priority}</td>` : ""}
        <td><input data-metric="${i}" data-field="start" type="number" value="${m.start === "" || m.start == null ? "" : m.start}" /></td>
        <td><input data-metric="${i}" data-field="finish" type="number" value="${m.finish === "" || m.finish == null ? "" : m.finish}" /></td>
        <td><input data-metric="${i}" data-field="retorno" type="number" value="${m.retorno === "" || m.retorno == null ? "" : m.retorno}" title="${escapeHtml(t("tipReturn"))}" /></td>
        <td><input data-metric="${i}" data-field="espera" type="number" value="${m.espera === "" || m.espera == null ? "" : m.espera}" title="${escapeHtml(t("tipWait"))}" /></td>
      </tr>`;
    });
    const avgR = fillAverages ? round2(sol.avgRetorno) : "";
    const avgE = fillAverages ? round2(sol.avgEspera) : "";
    $("#proc-table thead").innerHTML = thead;
    $("#proc-table tbody").innerHTML = tbody;
    $("#proc-table tfoot").innerHTML = avgFooterHtml(needsPri, avgR, avgE);
    syncAvgMetricTips();

    renderCrono();
    syncCorrectButton();
  }

  function highlightWalkColumn(time) {
    $$(".walk-focus").forEach((el) => el.classList.remove("walk-focus"));
    $$(".walk-pop").forEach((el) => el.classList.remove("walk-pop"));
    if (time == null || time < 0) return;
    // time header + queue stack + cells in that column
    const times = $$(".crono-time");
    if (times[time]) times[time].classList.add("walk-focus");
    const stacks = $$(".queue-stack");
    if (stacks[time]) stacks[time].classList.add("walk-focus");
    $$(`.crono-cell[data-col="${time}"]`).forEach((cell) => {
      cell.classList.add("walk-focus", "walk-pop");
    });
  }

  function scheduleWalkNext() {
    stopWalkTimer();
    if (!walk.active || !walk.playing) return;
    if (walk.step >= walk.steps.length - 1) {
      walk.playing = false;
      syncWalkPlayButton();
      return;
    }
    const ms = Number($("#walk-speed").value) || 1000;
    walk.timer = setTimeout(() => {
      walk.step += 1;
      applyWalkVisual(walk.steps[walk.step]);
      scheduleWalkNext();
    }, ms);
  }

  function syncWalkPlayButton() {
    const btn = $("#btn-walk-play");
    btn.textContent = walk.playing ? t("walkPause") : t("walkPlay");
  }

  function startWalkthrough() {
    if (!exercise) return;
    stopWalkTimer();
    if (exercise.solutions && exercise.solutions.length) {
      exercise.solution = exercise.solutions[0];
    }
    showingSolution = false;
    walk.active = true;
    walk.playing = true;
    walk.step = 0;
    walk.steps = buildWalkSteps(exercise.solution);
    $("#walk-panel").hidden = false;
    $("#feedback").className = "feedback";
    $("#feedback").innerHTML = "";
    applyWalkVisual(walk.steps[0]);
    syncWalkPlayButton();
    // Centra la vista en la tabla de procesos + cronograma
    const board = $("#exercise-board") || $("#proc-table");
    if (board) {
      board.scrollIntoView({ behavior: "smooth", block: "start" });
    }
    scheduleWalkNext();
  }

  function stopWalkthrough(restoreEmpty) {
    stopWalkTimer();
    walk.active = false;
    walk.playing = false;
    walk.steps = [];
    walk.step = 0;
    walkFocusTime = null;
    $("#walk-panel").hidden = true;
    if (restoreEmpty) {
      showingSolution = false;
      resetStudentFromExercise();
      renderExercise();
    }
  }

  function arrivalsByTime() {
    const map = {};
    exercise.processes.forEach((p) => {
      if (!map[p.arrival]) map[p.arrival] = [];
      map[p.arrival].push(p.id);
    });
    return map;
  }

  function renderExercise() {
    const sol = exercise.solution;
    const procs = exercise.processes;
    const needsPri =
      exercise.algorithm === "prioridad" || exercise.algorithm === "prioridad_ap";
    const prevR = $("#avg-retorno")?.value ?? "";
    const prevE = $("#avg-espera")?.value ?? "";

    const thead = `<tr>
      <th>${t("colProcess")}</th><th>${t("colBurst")}</th><th>${t("colArrival")}</th>
      ${needsPri ? `<th>${t("colPriority")}</th>` : ""}
      <th>${t("colStart")}</th><th>${t("colFinish")}</th>
      <th class="th-tip" title="${escapeHtml(t("tipReturn"))}">${t("colReturn")}</th>
      <th class="th-tip" title="${escapeHtml(t("tipWait"))}">${t("colWait")}</th>
    </tr>`;
    let tbody = "";
    procs.forEach((p, i) => {
      const m = showingSolution ? sol.processes[i] : null;
      tbody += `<tr>
        <td class="pid given">${p.id}</td>
        <td class="given">${p.burst}</td>
        <td class="given">${p.arrival}</td>
        ${needsPri ? `<td class="given">${p.priority}</td>` : ""}
        <td><input data-metric="${i}" data-field="start" type="number" value="${m ? m.start ?? "" : ""}" /></td>
        <td><input data-metric="${i}" data-field="finish" type="number" value="${m ? m.finish ?? "" : ""}" /></td>
        <td><input data-metric="${i}" data-field="retorno" type="number" value="${m ? m.retorno ?? "" : ""}" title="${escapeHtml(t("tipReturn"))}" /></td>
        <td><input data-metric="${i}" data-field="espera" type="number" value="${m ? m.espera ?? "" : ""}" title="${escapeHtml(t("tipWait"))}" /></td>
      </tr>`;
    });
    const avgR = showingSolution ? round2(sol.avgRetorno) : prevR;
    const avgE = showingSolution ? round2(sol.avgEspera) : prevE;
    $("#proc-table thead").innerHTML = thead;
    $("#proc-table tbody").innerHTML = tbody;
    $("#proc-table tfoot").innerHTML = avgFooterHtml(needsPri, avgR, avgE);
    syncAvgMetricTips();

    if (showingSolution) {
      studentGrid = sol.grid.map((row) => row.slice());
      studentQueues = sol.queues.map((q) =>
        queueToSlots(q, procs.length)
      );
    }

    renderCrono();
    syncCorrectButton();
  }

  function studentHasFinishPerProcess() {
    if (!exercise?.processes?.length || !studentGrid?.length) return false;
    return exercise.processes.every((_, i) =>
      (studentGrid[i] || []).some((cell) => cell === "F")
    );
  }

  function syncCorrectButton() {
    const btn = $("#btn-correct");
    if (!btn) return;
    if (isExamTaking()) {
      btn.disabled = true;
      return;
    }
    const ready = studentHasFinishPerProcess();
    btn.disabled = !ready;
    btn.classList.toggle("btn-primary", ready);
    btn.classList.toggle("btn-ghost", !ready);
    btn.title = ready ? "" : t("btnCorrectHint");
  }

  function renderCrono() {
    const sol = exercise.solution;
    const cols = sol.cols;
    const rows = exercise.processes.length;
    const gridEl = $("#crono-grid");
    const arrivals = arrivalsByTime();

    // Primera columna más ancha (etiqueta «Espera CPU»); el resto reparte el ancho.
    gridEl.style.gridTemplateColumns = `5.1rem repeat(${cols}, minmax(0, 1fr))`;

    let html = "";
    html += `<div class="crono-label" style="min-height:1.9rem;background:var(--paper-deep)"></div>`;
    for (let time = 0; time < cols; time++) {
      const arr = arrivals[time];
      if (arr) {
        html += `<div class="crono-time has-arrival" title="${t("arrivalMark")}: ${arr.join(", ")}">${time}<div class="arrival-marks">${arr
          .map((id) => `<span>▼${id.replace(/^P/i, "")}</span>`)
          .join("")}</div></div>`;
      } else {
        html += `<div class="crono-time">${time}</div>`;
      }
    }

    const queueH = Math.max(2.2, rows * 1.15);
    html += `<div class="crono-label queue-label" style="min-height:${queueH}rem;background:#dff3f2;color:var(--teal-dark)" title="${t("queueHint")}">${t("queue")}<small>${t("queueStackHint")}</small></div>`;
    for (let time = 0; time < cols; time++) {
      const slots = studentQueues[time] || Array(rows).fill("");
      html += `<div class="queue-stack" data-q="${time}" style="min-height:${queueH}rem">`;
      for (let s = 0; s < rows; s++) {
        const id = slots[s] || "";
        const near = s === rows - 1;
        html += `<button type="button" class="queue-slot${id ? " filled" : ""}${near ? " near" : ""}" data-q="${time}" data-slot="${s}" title="${id || "·"} · ${t("queue")} t=${time} · ${near ? t("queueNear") : t("queueFar")}">${id || "·"}</button>`;
      }
      html += `</div>`;
    }

    for (let i = 0; i < rows; i++) {
      html += `<div class="crono-label">${exercise.processes[i].id}</div>`;
      for (let time = 0; time < cols; time++) {
        const st = studentGrid[i][time] || "";
        const isArrival = exercise.processes[i].arrival === time;
        html += `<div class="crono-cell ${st}${isArrival ? " arrival-cell" : ""}" data-row="${i}" data-col="${time}" title="${exercise.processes[i].id} @ ${time}${isArrival ? " · " + t("arrivalMark") : ""}">${st}</div>`;
      }
    }

    gridEl.innerHTML = html;

    $$(".crono-cell", gridEl).forEach((cell) => {
      cell.addEventListener("click", () => {
        if (interactionLocked()) return;
        const r = Number(cell.dataset.row);
        const c = Number(cell.dataset.col);
        studentGrid[r][c] = cycleState(studentGrid[r][c] || "");
        cell.textContent = studentGrid[r][c];
        cell.className = `crono-cell ${studentGrid[r][c]}${
          exercise.processes[r].arrival === c ? " arrival-cell" : ""
        }`;
        syncCorrectButton();
      });
      cell.addEventListener("contextmenu", (e) => {
        e.preventDefault();
        if (interactionLocked()) return;
        const r = Number(cell.dataset.row);
        const c = Number(cell.dataset.col);
        studentGrid[r][c] = "";
        cell.textContent = "";
        cell.className = `crono-cell${
          exercise.processes[r].arrival === c ? " arrival-cell" : ""
        }`;
        syncCorrectButton();
      });
    });

    $$(".queue-slot", gridEl).forEach((btn) => {
      btn.addEventListener("click", () => {
        if (interactionLocked()) return;
        const time = Number(btn.dataset.q);
        const slot = Number(btn.dataset.slot);
        if (!studentQueues[time]) studentQueues[time] = Array(rows).fill("");
        const next = cycleQueueId(studentQueues[time][slot] || "");
        studentQueues[time][slot] = next;
        btn.textContent = next || "·";
        btn.title = `${next || "·"} · ${t("queue")} t=${time}`;
        btn.classList.toggle("filled", Boolean(next));
      });
      btn.addEventListener("contextmenu", (e) => {
        e.preventDefault();
        if (interactionLocked()) return;
        const time = Number(btn.dataset.q);
        const slot = Number(btn.dataset.slot);
        if (!studentQueues[time]) studentQueues[time] = Array(rows).fill("");
        studentQueues[time][slot] = "";
        btn.textContent = "·";
        btn.title = `· · ${t("queue")} t=${time}`;
        btn.classList.remove("filled");
      });
    });
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  function collectStudent() {
    const metrics = $$("#proc-table input[data-metric]").reduce((acc, input) => {
      const i = Number(input.dataset.metric);
      const field = input.dataset.field;
      if (!acc[i]) acc[i] = {};
      acc[i][field] = input.value === "" ? null : Number(input.value);
      return acc;
    }, []);

    const n = exercise.processes.length;
    const queueSlots = studentQueues.map((slots) => {
      const arr = Array.isArray(slots) ? slots.slice(0, n) : [];
      while (arr.length < n) arr.push("");
      return arr.map((x) => String(x || "").toUpperCase().trim());
    });
    const queues = queueSlots.map((slots) => slotsToQueue(slots));

    return {
      grid: studentGrid,
      queues,
      queueSlots,
      metrics,
      avgRetorno: $("#avg-retorno").value,
      avgEspera: $("#avg-espera").value,
    };
  }

  function fmtVal(v) {
    if (v === "" || v == null) return t("empty");
    return String(v);
  }

  function fieldLabel(field) {
    const map = {
      start: t("fieldStart"),
      finish: t("fieldFinish"),
      retorno: t("fieldRetorno"),
      espera: t("fieldEspera"),
      avgRetorno: t("fieldAvgRetorno"),
      avgEspera: t("fieldAvgEspera"),
    };
    return map[field] || field;
  }

  function syncAvgMetricTips() {
    const r = $("#metric-retorno");
    const e = $("#metric-espera");
    if (r) r.title = t("tipAvgReturn");
    if (e) e.title = t("tipAvgWait");
    const rs = r?.querySelector("span");
    const es = e?.querySelector("span");
    if (rs) rs.title = t("tipAvgReturn");
    if (es) es.title = t("tipAvgWait");
    const ri = $("#avg-retorno");
    const ei = $("#avg-espera");
    if (ri) ri.title = t("tipAvgReturn");
    if (ei) ei.title = t("tipAvgWait");
  }

  function buildGradeJustification(result) {
    const s = result.score;
    if (!s) return "";
    const failedProcs = (s.crono.details || [])
      .filter((d) => !d.ok)
      .map((d) => d.id);
    const failedInstants = (s.queues.details || [])
      .filter((d) => !d.ok)
      .map((d) => `t=${d.time}`);
    const failedCols = (s.metrics.details || [])
      .filter((d) => !d.ok)
      .map((d) => fieldLabel(d.field));

    const cronoExtra = failedProcs.length
      ? ` ${t("gradeFailedProcesses", { list: failedProcs.join(", ") })}`
      : "";
    const queueExtra = failedInstants.length
      ? ` ${t("gradeFailedInstants", {
          list: failedInstants.slice(0, 12).join(", ") +
            (failedInstants.length > 12 ? "…" : ""),
        })}`
      : "";
    const metricExtra = failedCols.length
      ? ` ${t("gradeFailedColumns", { list: failedCols.join(", ") })}`
      : "";

    return `
      <ul class="grade-breakdown">
        <li>${t("gradeCrono", {
          pts: s.crono.points,
          max: s.crono.max,
          ok: s.crono.ok,
          total: s.crono.total,
          unit: s.crono.unit,
        })}${cronoExtra}</li>
        <li>${t("gradeQueues", {
          pts: s.queues.points,
          max: s.queues.max,
          ok: s.queues.ok,
          total: s.queues.total,
          unit: s.queues.unit,
        })}${queueExtra}</li>
        <li>${t("gradeMetrics", {
          pts: s.metrics.points,
          max: s.metrics.max,
          ok: s.metrics.ok,
          total: s.metrics.total,
          unit: s.metrics.unit,
        })}${metricExtra}</li>
        <li>${t("gradeAvgs", {
          pts: s.averages.points,
          max: s.averages.max,
          unit: s.averages.unit,
          retorno: s.averages.retornoOk ? t("gradeOk") : t("gradeBad"),
          espera: s.averages.esperaOk ? t("gradeOk") : t("gradeBad"),
        })}</li>
      </ul>
    `;
  }

  function correctExercise() {
    if (!exercise) ensureExercise();
    if (!exercise?.solution) return;
    showingSolution = false;
    const fb = $("#feedback");
    try {
      const student = collectStudent();
      const sols = exercise.solutions || [exercise.solution];
      const result = gradeAgainstAny(student, sols);
      const ref = result.matchedSolution || exercise.solution;
      if (!ref) return;
      const score = result.score || {
        total: 0,
        maxTotal: 10,
      };

      // Solo celdas del ejercicio (no las de la solución guiada del tutorial)
      $$("#crono-grid .crono-cell[data-row][data-col]").forEach((cell) => {
        const r = Number(cell.dataset.row);
        const c = Number(cell.dataset.col);
        if (!Number.isFinite(r) || !Number.isFinite(c)) return;
        const exp = ref.grid[r]?.[c] || "";
        const got = studentGrid[r]?.[c] || "";
        cell.classList.remove("mark-ok", "mark-bad");
        if (exp === "" && got === "") return;
        cell.classList.add(got === exp ? "mark-ok" : "mark-bad");
      });

      const n = exercise.processes.length;
      $$("#crono-grid .queue-slot[data-q][data-slot]").forEach((btn) => {
        const time = Number(btn.dataset.q);
        const slot = Number(btn.dataset.slot);
        if (!Number.isFinite(time) || !Number.isFinite(slot)) return;
        const expSlots = queueToSlots(ref.queues[time] || [], n);
        const got = (student.queueSlots?.[time]?.[slot] || "").toUpperCase();
        const exp = (expSlots[slot] || "").toUpperCase();
        btn.classList.remove("ok", "bad");
        if (!exp && !got) return;
        btn.classList.add(got === exp ? "ok" : "bad");
      });

      $$("#proc-table input[data-metric]").forEach((input) => {
        const i = Number(input.dataset.metric);
        const field = input.dataset.field;
        const exp = ref.processes[i]?.[field];
        const got = input.value === "" ? null : Number(input.value);
        input.parentElement?.classList.remove("ok", "bad");
        if (exp == null && got == null) return;
        input.parentElement?.classList.add(got === exp ? "ok" : "bad");
      });

      const avgROk =
        $("#avg-retorno").value !== "" &&
        round2(Number($("#avg-retorno").value)) === round2(ref.avgRetorno);
      const avgEOk =
        $("#avg-espera").value !== "" &&
        round2(Number($("#avg-espera").value)) === round2(ref.avgEspera);
      $("#metric-retorno")?.classList.toggle("ok", avgROk);
      $("#metric-retorno")?.classList.toggle(
        "bad",
        $("#avg-retorno").value !== "" && !avgROk
      );
      $("#metric-espera")?.classList.toggle("ok", avgEOk);
      $("#metric-espera")?.classList.toggle(
        "bad",
        $("#avg-espera").value !== "" && !avgEOk
      );

      const multiNote = result.hasMultipleSolutions
        ? `<p class="multi-sol-note">${t("multiSolutionsNote", {
            n: result.solutionCount,
          })}</p>`
        : "";
      const justification = buildGradeJustification(result);
      const preview = result.errors
        .slice(0, 12)
        .map((e) => {
          if (e.type === "cell")
            return `<li>${t("errCell", {
              process: e.process,
              time: e.time,
              expected: fmtVal(e.expected),
              got: fmtVal(e.got),
            })}</li>`;
          if (e.type === "queue")
            return `<li>${t("errQueue", {
              time: e.time,
              slot: e.slot != null ? e.slot + 1 : "?",
              expected: fmtVal(e.expected),
              got: fmtVal(e.got),
            })}</li>`;
          if (e.type === "metric")
            return `<li>${t("errMetric", {
              process: e.process,
              field: fieldLabel(e.field),
              expected: fmtVal(e.expected),
              got: fmtVal(e.got),
            })}</li>`;
          return `<li>${t("errAvg", {
            field: fieldLabel(e.field),
            expected: fmtVal(e.expected),
            got: fmtVal(e.got),
          })}</li>`;
        })
        .join("");

      const scoreVars = { score: score.total, max: score.maxTotal };
      if (result.perfect) {
        fb.className = "feedback show success";
        fb.innerHTML = `<h3>${t("feedbackOkTitle", scoreVars)}</h3>
          <p>${t("feedbackOkBody", { algo: algoFull(exercise.algorithm) })}</p>
          ${justification}${multiNote}`;
      } else {
        const severity = score.total >= 7 ? "partial" : "fail";
        fb.className = `feedback show ${severity}`;
        fb.innerHTML = `
          <h3>${t(severity === "partial" ? "feedbackAlmost" : "feedbackFail", scoreVars)}</h3>
          ${justification}
          ${multiNote}
          ${
            preview
              ? `<p class="grade-details-title">${t("gradeDetailsTitle")}</p><ul>${preview}${
                  result.errors.length > 12
                    ? `<li>${t("feedbackMore", { n: result.errors.length - 12 })}</li>`
                    : ""
                }</ul>`
              : ""
          }
        `;
      }

      fb.scrollIntoView({ behavior: "smooth", block: "nearest" });
    } catch (err) {
      console.error("correctExercise failed:", err);
      fb.className = "feedback show fail";
      fb.innerHTML = `<h3>${t("feedbackFail", { score: "—", max: 10 })}</h3><p>${escapeHtml(
        String(err && err.message ? err.message : err)
      )}</p>`;
    }
  }

  function revealSolution() {
    stopWalkthrough(false);
    showingSolution = true;
    // Mostrar la solución canónica (desempate por id); sin panel de nota
    if (exercise.solutions && exercise.solutions.length) {
      exercise.solution = exercise.solutions[0];
    }
    renderExercise();
    const fb = $("#feedback");
    fb.className = "feedback";
    fb.innerHTML = "";
  }

  function clearStudent() {
    stopWalkthrough(false);
    showingSolution = false;
    resetStudentFromExercise();
    renderExercise();
  }

  function onAlgoChange() {
    setQuantumFieldVisible($("#ex-algo").value === "rr");
  }

  function init() {
    applyStaticI18n();
    renderAlgoPicker();

    $("#lang-badge").addEventListener("click", () => {
      toggleLang();
      applyLanguage();
    });

    $$(".nav-pills button").forEach((btn) => {
      btn.addEventListener("click", () => showView(btn.dataset.view));
    });
    $("#btn-start-tutorial")?.addEventListener("click", () => {
      slideIndex = 0;
      showView("tutorial");
    });
    $("#btn-skip-exercise")?.addEventListener("click", () => showView("exercise"));

    $("#btn-prev").addEventListener("click", () => {
      if (slideIndex > 0) {
        slideIndex -= 1;
        renderSlide();
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    });
    $("#btn-next").addEventListener("click", () => {
      if (slideIndex >= SLIDES.length - 1) {
        showView("exercise");
        return;
      }
      slideIndex += 1;
      renderSlide();
      window.scrollTo({ top: 0, behavior: "smooth" });
    });

    $("#btn-example").addEventListener("click", loadExample);
    $("#btn-random").addEventListener("click", openGenModal);
    $("#gen-confirm")?.addEventListener("click", confirmGenModal);
    $$("[data-gen-close]").forEach((el) => {
      el.addEventListener("click", closeGenModal);
    });
    $$("[data-gen-tab]").forEach((btn) => {
      btn.addEventListener("click", () => setGenModalTab(btn.dataset.genTab));
    });
    $("#gen-count")?.addEventListener("input", syncGenModalUi);
    $("#gen-quantum")?.addEventListener("input", syncGenModalUi);
    $("#gen-seed")?.addEventListener("input", (e) => {
      e.target.value = String(e.target.value || "")
        .replace(/\D/g, "")
        .slice(0, 6);
      e.target.setCustomValidity("");
      updateSeedPreview();
    });
    document.addEventListener("keydown", (e) => {
      if (e.key !== "Escape") return;
      if ($("#gen-modal") && !$("#gen-modal").hidden) closeGenModal();
      if ($("#exam-finish-modal") && !$("#exam-finish-modal").hidden) {
        closeExamFinishModal();
      }
    });
    $("#btn-correct").addEventListener("click", () => {
      if (!studentHasFinishPerProcess()) return;
      stopWalkthrough(false);
      correctExercise();
    });
    $("#btn-solve").addEventListener("click", revealSolution);
    $("#btn-walk").addEventListener("click", startWalkthrough);
    $("#btn-clear").addEventListener("click", clearStudent);

    $("#btn-walk-play").addEventListener("click", () => {
      if (!walk.active) return;
      walk.playing = !walk.playing;
      syncWalkPlayButton();
      if (walk.playing) scheduleWalkNext();
      else stopWalkTimer();
    });
    $("#btn-walk-prev").addEventListener("click", () => {
      if (!walk.active || walk.step <= 0) return;
      stopWalkTimer();
      walk.playing = false;
      syncWalkPlayButton();
      walk.step -= 1;
      applyWalkVisual(walk.steps[walk.step]);
    });
    $("#btn-walk-next").addEventListener("click", () => {
      if (!walk.active || walk.step >= walk.steps.length - 1) return;
      stopWalkTimer();
      walk.playing = false;
      syncWalkPlayButton();
      walk.step += 1;
      applyWalkVisual(walk.steps[walk.step]);
    });
    $("#btn-walk-stop").addEventListener("click", () => stopWalkthrough(true));
    $("#walk-speed").addEventListener("change", () => {
      if (walk.active && walk.playing) scheduleWalkNext();
    });

    // —— Modo examen ——
    setExamTeacherCardsVisible(false);
    document.addEventListener("keydown", (e) => {
      if (!(e.ctrlKey && e.shiftKey && e.key === "F10")) return;
      const hub = $("#exam-hub");
      const examView = document.querySelector('.view[data-view="exam"]');
      if (!hub || hub.hidden || !examView || examView.hidden) return;
      e.preventDefault();
      revealExamTeacherCards();
    });
    $$("[data-exam-panel]").forEach((btn) => {
      btn.addEventListener("click", () => showExamPanel(btn.dataset.examPanel));
    });
    $$("[data-exam-back]").forEach((btn) => {
      btn.addEventListener("click", showExamHub);
    });
    $("#exam-create-n")?.addEventListener("change", syncExamCreateRows);
    $("#exam-create-n")?.addEventListener("input", syncExamCreateRows);
    $("#exam-create-build")?.addEventListener("click", () => {
      const specs = collectExamCreateSpecs();
      const typedTitle = $("#exam-create-title")?.value?.trim() || "";
      const dateInput = $("#exam-create-date");
      const examDate = dateInput?.value || todayLocalYmd();
      examCreateJson = buildExam(specs, {
        title: typedTitle || new Date().toISOString().slice(0, 19).replace("T", " "),
        examDate,
      });
      const out = $("#exam-create-out");
      out.hidden = false;
      out.removeAttribute("hidden");
      out.value = JSON.stringify(examCreateJson, null, 2);
      const dl = $("#exam-create-download");
      dl.hidden = false;
      dl.removeAttribute("hidden");
    });
    $("#exam-create-download")?.addEventListener("click", () => {
      if (!examCreateJson) return;
      const base = sanitizeDownloadName(examCreateJson.title);
      downloadJson(`${base}.json`, examCreateJson);
    });
    $("#exam-take-start")?.addEventListener("click", () => {
      if (!examTakeLoaded) return;
      const nameInput = $("#exam-take-student-name");
      const name = String(nameInput?.value || "").trim();
      const nameErr = $("#exam-take-name-error");
      if (!name) {
        if (nameErr) {
          nameErr.textContent = t("examStudentNameRequired");
          nameErr.hidden = false;
          nameErr.removeAttribute("hidden");
        }
        nameInput?.focus();
        return;
      }
      if (nameErr) {
        nameErr.hidden = true;
        nameErr.setAttribute("hidden", "");
      }
      enterExamTaking(examTakeLoaded, name);
    });
    $("#exam-take-student-name")?.addEventListener("input", () => {
      const nameErr = $("#exam-take-name-error");
      if (nameErr) {
        nameErr.hidden = true;
        nameErr.setAttribute("hidden", "");
      }
    });

    const takeDrop = $("#exam-take-drop");
    const takeFile = $("#exam-take-file");
    takeDrop?.addEventListener("click", (e) => {
      if (e.target === takeFile) return;
      takeFile?.click();
    });
    takeDrop?.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        takeFile?.click();
      }
    });
    takeDrop?.addEventListener("dragenter", (e) => {
      e.preventDefault();
      setExamTakeDropActive(true);
    });
    takeDrop?.addEventListener("dragover", (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = "copy";
      setExamTakeDropActive(true);
    });
    takeDrop?.addEventListener("dragleave", (e) => {
      if (!takeDrop.contains(e.relatedTarget)) setExamTakeDropActive(false);
    });
    takeDrop?.addEventListener("drop", (e) => {
      e.preventDefault();
      setExamTakeDropActive(false);
      const file = e.dataTransfer?.files?.[0];
      if (file) processExamKeyFile(file);
    });
    takeFile?.addEventListener("change", (e) => {
      const file = e.target.files?.[0];
      if (file) processExamKeyFile(file);
    });
    $$("[data-exam-key-error-close]").forEach((el) => {
      el.addEventListener("click", closeExamKeyErrorModal);
    });
    $("#exam-fs-reenter")?.addEventListener("click", () => {
      requestExamFullscreen().then(() => syncExamFullscreenBanner());
    });
    document.addEventListener("fullscreenchange", onExamFullscreenChange);
    document.addEventListener("webkitfullscreenchange", onExamFullscreenChange);

    $("#exam-prev")?.addEventListener("click", () => {
      if (!examMode.active || examMode.index <= 0) return;
      saveCurrentExamAnswer();
      loadExamExerciseAt(examMode.index - 1);
    });
    $("#exam-next")?.addEventListener("click", () => {
      if (!examMode.active) return;
      if (examMode.index >= examMode.exam.exercises.length - 1) return;
      saveCurrentExamAnswer();
      loadExamExerciseAt(examMode.index + 1);
    });
    $("#exam-finish")?.addEventListener("click", finishExam);
    $$("[data-exam-finish-close]").forEach((el) => {
      el.addEventListener("click", closeExamFinishModal);
    });
    $("#exam-finish-yes")?.addEventListener("click", showExamFinishCodeStep);
    $("#exam-finish-confirm-code")?.addEventListener("click", () => {
      const typed = String($("#exam-finish-code")?.value || "").replace(/\D/g, "");
      if (typed !== examFinishCode) {
        const err = $("#exam-finish-code-error");
        if (err) {
          err.textContent = t("examFinishCodeError");
          err.hidden = false;
          err.removeAttribute("hidden");
        }
        return;
      }
      commitExamFinish();
    });
    $("#exam-finish-code")?.addEventListener("input", (e) => {
      e.target.value = String(e.target.value || "")
        .replace(/\D/g, "")
        .slice(0, 3);
      const err = $("#exam-finish-code-error");
      if (err) {
        err.hidden = true;
        err.setAttribute("hidden", "");
      }
    });
    $("#exam-finish-code")?.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        $("#exam-finish-confirm-code")?.click();
      }
    });

    const syncGradeBtn = () => {
      const btn = $("#exam-grade-run");
      if (btn) btn.disabled = !examGradeAnswers;
    };
    function examPdfLabels() {
      return {
        coverSubtitle: t("examPdfCoverSubtitle"),
        perExercise: t("examPdfPerExercise"),
        average: t("examPdfAverage"),
        untitledFile: t("examPdfUntitledFile"),
        crono: t("examPdfCrono"),
        queues: t("examPdfQueues"),
        metrics: t("examPdfMetrics"),
        averages: t("examPdfAverages"),
        total: t("examPdfTotal"),
        cronograma: t("examPdfCronograma"),
        queuesTitle: t("examPdfQueuesTitle"),
        metricsTitle: t("examPdfMetricsTitle"),
        statement: t("examPdfStatement"),
        algo: t("examPdfAlgo"),
        quantum: t("examPdfQuantum"),
        process: t("examPdfProcess"),
        arrival: t("examPdfArrival"),
        burst: t("examPdfBurst"),
        priority: t("examPdfPriority"),
        studentName: t("examPdfStudentName"),
        start: t("examPdfStart"),
        finish: t("examPdfFinish"),
        retorno: t("examPdfRetorno"),
        espera: t("examPdfEspera"),
        avg: t("examPdfAvg"),
        legendOk: t("examPdfLegendOk"),
        legendBad: t("examPdfLegendBad"),
        missingStatement: t("examPdfMissingStatement"),
        continued: t("examPdfContinued"),
      };
    }

    function downloadGradePdf() {
      if (!examGradeReport || !window.ExamPdf) {
        window.alert(t("examGradePdfError"));
        return;
      }
      try {
        window.ExamPdf.downloadExamGradePdf({
          report: examGradeReport,
          sourceName: examGradeSourceName || t("examPdfUntitledFile"),
          fileBase: sanitizeDownloadName(
            (examGradeSourceName || "").replace(/\.json$/i, "") ||
              examGradeReport.examTitle ||
              "informe-prueba"
          ),
          labels: examPdfLabels(),
        });
      } catch (err) {
        console.error(err);
        window.alert(t("examGradePdfError"));
      }
    }

    $("#exam-grade-ans-file")?.addEventListener("change", async (e) => {
      const file = e.target.files?.[0];
      examGradeAnswers = null;
      examGradeReport = null;
      examGradeSourceName = "";
      const fsHost = $("#exam-grade-fs");
      if (fsHost) {
        fsHost.hidden = true;
        fsHost.setAttribute("hidden", "");
        fsHost.innerHTML = "";
      }
      const reportHost = $("#exam-grade-report");
      if (reportHost) {
        reportHost.hidden = true;
        reportHost.setAttribute("hidden", "");
        reportHost.innerHTML = "";
      }
      const dl = $("#exam-grade-download");
      if (dl) {
        dl.hidden = true;
        dl.setAttribute("hidden", "");
      }
      const pdfBtn = $("#exam-grade-pdf");
      if (pdfBtn) {
        pdfBtn.hidden = true;
        pdfBtn.setAttribute("hidden", "");
      }
      if (file) {
        try {
          examGradeSourceName = file.name || "";
          examGradeAnswers = await readJsonFile(file);
          renderFullscreenTrackingReport(
            examGradeAnswers?.fullscreenTracking || null
          );
        } catch {
          examGradeAnswers = null;
          examGradeSourceName = "";
        }
      }
      syncGradeBtn();
    });
    $("#exam-grade-run")?.addEventListener("click", () => {
      if (!examGradeAnswers) {
        window.alert(t("examGradeNeedFiles"));
        return;
      }
      const seal = verifyExamSubmissionSeal(examGradeAnswers);
      if (!seal.ok) {
        const msg =
          seal.status === "mismatch"
            ? t("examGradeTampered")
            : t("examGradeSealMissing");
        window.alert(msg);
      }
      renderFullscreenTrackingReport(
        examGradeAnswers?.fullscreenTracking || null
      );
      examGradeReport = gradeExam(examGradeAnswers);
      examGradeReport.integrity = seal;
      examGradeReport.sourceName = examGradeSourceName;
      const host = $("#exam-grade-report");
      host.hidden = false;
      host.removeAttribute("hidden");
      const integrityBanner = !seal.ok
        ? `<div class="exam-integrity-warn" role="alert">${
            seal.status === "mismatch"
              ? t("examGradeTampered")
              : t("examGradeSealMissing")
          }</div>`
        : "";
      const studentLine = examGradeReport.studentName
        ? `<p class="exam-status exam-grade-student">${examGradeReport.studentName}</p>`
        : "";
      const titleLine = examGradeReport.examTitle
        ? `<p class="exam-status">${t("examGradeTitleLine", {
            title: examGradeReport.examTitle,
          })}</p>`
        : "";
      const items = (examGradeReport.results || [])
        .map(
          (r) =>
            `<li>${t("examGradeItem", {
              id: r.exerciseId,
              algo: algoName(r.algorithm),
              score: r.score?.total ?? 0,
              max: r.score?.maxTotal ?? 10,
            })}</li>`
        )
        .join("");
      host.innerHTML = `${integrityBanner}${studentLine}${titleLine}<h4>${t("examGradeSummary", {
        total: examGradeReport.total,
        max: examGradeReport.maxTotal,
        avg: examGradeReport.average,
      })}</h4><ul>${items}</ul>`;
      const dl = $("#exam-grade-download");
      dl.hidden = false;
      dl.removeAttribute("hidden");
      const pdfBtn = $("#exam-grade-pdf");
      if (pdfBtn) {
        pdfBtn.hidden = false;
        pdfBtn.removeAttribute("hidden");
      }
      downloadGradePdf();
    });
    $("#exam-grade-download")?.addEventListener("click", () => {
      if (!examGradeReport) return;
      const base = sanitizeDownloadName(
        (examGradeSourceName || "").replace(/\.json$/i, "") ||
          examGradeReport.examTitle ||
          "informe-prueba"
      );
      downloadJson(`${base}-informe.json`, examGradeReport);
    });
    $("#exam-grade-pdf")?.addEventListener("click", downloadGradePdf);

    onAlgoChange();
    showView("intro");
  }

  let booted = false;
  function boot() {
    if (booted) return;
    booted = true;
    try {
      init();
    } catch (err) {
      console.error("App boot failed:", err);
    }
  }
  boot();
  document.addEventListener("DOMContentLoaded", boot);
  window.addEventListener("load", boot);
})();
