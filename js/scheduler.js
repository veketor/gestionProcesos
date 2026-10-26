/**
 * Motor de simulación de algoritmos de planificación de CPU.
 * Convención: número de prioridad más bajo = más prioritario.
 * Estados de celda: '' | 'E' | 'L' | 'F'
 */
(function (global) {
const ALGORITHMS = {
  fcfs: {
    id: "fcfs",
    name: "FCFS / FIFO",
    fullName: "FCFS / FIFO — First Come First Served",
    needsQuantum: false,
    needsPriority: false,
    preemptive: false,
  },
  sjf: {
    id: "sjf",
    name: "SJF",
    fullName: "Shortest Job First",
    needsQuantum: false,
    needsPriority: false,
    preemptive: false,
  },
  srtf: {
    id: "srtf",
    name: "SRTF",
    fullName: "Shortest Remaining Time First",
    needsQuantum: false,
    needsPriority: false,
    preemptive: true,
  },
  prioridad: {
    id: "prioridad",
    name: "Prioridad",
    fullName: "Por prioridad (no apropiativo)",
    needsQuantum: false,
    needsPriority: true,
    preemptive: false,
  },
  prioridad_ap: {
    id: "prioridad_ap",
    name: "Prioridad apr.",
    fullName: "Por prioridad (apropiativo)",
    needsQuantum: false,
    needsPriority: true,
    preemptive: true,
  },
  rr: {
    id: "rr",
    name: "Round Robin",
    fullName: "Round Robin",
    needsQuantum: true,
    needsPriority: false,
    preemptive: true,
  },
};

function cloneProcesses(processes) {
  return processes.map((p, i) => ({
    id: p.id || `P${i + 1}`,
    burst: Number(p.burst),
    arrival: Number(p.arrival),
    priority: Number(p.priority ?? 1),
    remaining: Number(p.burst),
    start: null,
    finish: null,
    firstResponse: null,
  }));
}

function defaultTieOrder(processes) {
  return processes
    .map((p) => p.id)
    .slice()
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
}

function tieIndex(tieOrder, id) {
  const i = tieOrder.indexOf(id);
  return i < 0 ? 999 : i;
}

function sortReady(queue, algo, tieOrder, tieBreakArrival = true) {
  const arr = [...queue];
  const order = tieOrder || defaultTieOrder(arr);
  arr.sort((a, b) => {
    if (algo === "sjf" || algo === "srtf") {
      const keyA = algo === "sjf" ? a.burst : a.remaining;
      const keyB = algo === "sjf" ? b.burst : b.remaining;
      if (keyA !== keyB) return keyA - keyB;
    } else if (algo === "prioridad" || algo === "prioridad_ap") {
      if (a.priority !== b.priority) return a.priority - b.priority;
    }
    if (tieBreakArrival && a.arrival !== b.arrival) return a.arrival - b.arrival;
    return tieIndex(order, a.id) - tieIndex(order, b.id);
  });
  return arr;
}

function permutations(arr) {
  if (arr.length <= 1) return [arr.slice()];
  const out = [];
  for (let i = 0; i < arr.length; i++) {
    const rest = arr.slice(0, i).concat(arr.slice(i + 1));
    permutations(rest).forEach((p) => out.push([arr[i]].concat(p)));
  }
  return out;
}

/**
 * Simula el algoritmo y construye:
 * - grid[processIndex][t] = 'E'|'L'|'F'|''
 * - queues[t] = [ids en cola listos, ordenados]
 * - timeline[t] = id en CPU o null
 * - metrics por proceso y medias
 *
 * options.tieOrder: orden de desempate entre procesos equivalentes
 *   (p. ej. empates de llegada en RR / FCFS).
 */
function simulate(processesInput, algorithm, quantum = 3, options = {}) {
  const algo = algorithm;
  const processes = cloneProcesses(processesInput);
  const tieOrder = options.tieOrder || defaultTieOrder(processes);
  const n = processes.length;
  const totalBurst = processes.reduce((s, p) => s + p.burst, 0);
  const maxArrival = Math.max(...processes.map((p) => p.arrival), 0);
  // Margen extra: la F va en finish = últimaE+1, hace falta al menos +1 tras el trabajo total
  let maxTime = Math.min(Math.max(totalBurst + maxArrival + n + 4, 16), 80);

  let grid = Array.from({ length: n }, () => Array(maxTime).fill(""));
  let queues = Array.from({ length: maxTime }, () => []);
  let timeline = Array(maxTime).fill(null);

  function ensureHorizon(needed) {
    if (needed <= maxTime) return;
    const extra = needed - maxTime;
    for (let i = 0; i < extra; i++) {
      grid.forEach((row) => row.push(""));
      queues.push([]);
      timeline.push(null);
    }
    maxTime = needed;
  }

  let t = 0;
  let completed = 0;
  let current = null;
  let quantumLeft = 0;
  const rrQueue = []; // cola FIFO para Round Robin

  const arrived = new Set();

  function getReadyList() {
    return processes.filter(
      (p) => p.arrival <= t && p.remaining > 0 && p !== current
    );
  }

  function pickNext() {
    if (algo === "rr") {
      while (rrQueue.length && rrQueue[0].remaining <= 0) rrQueue.shift();
      return rrQueue.length ? rrQueue.shift() : null;
    }
    const ready = processes.filter((p) => p.arrival <= t && p.remaining > 0);
    if (!ready.length) return null;
    if (algo === "fcfs") {
      ready.sort((a, b) =>
        a.arrival !== b.arrival
          ? a.arrival - b.arrival
          : tieIndex(tieOrder, a.id) - tieIndex(tieOrder, b.id)
      );
      return ready[0];
    }
    return sortReady(ready, algo, tieOrder)[0];
  }

  function enqueueArrivals() {
    const batch = processes.filter(
      (p) => p.arrival === t && !arrived.has(p.id)
    );
    batch.sort(
      (a, b) => tieIndex(tieOrder, a.id) - tieIndex(tieOrder, b.id)
    );
    batch.forEach((p) => {
      arrived.add(p.id);
      if (algo === "rr" && p.remaining > 0) {
        rrQueue.push(p);
      }
    });
  }

  // Avance hasta que todos terminen (amplía horizonte si hace falta para la F)
  while (completed < n) {
    ensureHorizon(t + 2); // t (E) + t+1 (posible F)

    enqueueArrivals();

    // ¿Hay que elegir / cambiar proceso?
    if (algo === "rr") {
      if (!current || quantumLeft === 0 || current.remaining === 0) {
        if (current && current.remaining > 0 && quantumLeft === 0) {
          rrQueue.push(current);
        }
        current = pickNext();
        quantumLeft = current ? quantum : 0;
      }
    } else if (algo === "srtf" || algo === "prioridad_ap") {
      const candidate = pickNext();
      if (!current || current.remaining === 0) {
        current = candidate;
      } else if (candidate && candidate !== current) {
        const shouldPreempt =
          algo === "srtf"
            ? candidate.remaining < current.remaining
            : candidate.priority < current.priority;
        if (shouldPreempt) current = candidate;
      } else if (!current) {
        current = candidate;
      }
    } else {
      // No apropiativos: FCFS, SJF, Prioridad
      if (!current || current.remaining === 0) {
        current = pickNext();
      }
    }

    // Cola en este instante (antes de ejecutar el tick): listos sin el que corre
    const readyNow = getReadyList();
    let ordered;
    if (algo === "rr") {
      ordered = rrQueue.filter((p) => p !== current && p.remaining > 0);
    } else if (algo === "fcfs") {
      ordered = readyNow.slice().sort((a, b) =>
        a.arrival !== b.arrival
          ? a.arrival - b.arrival
          : tieIndex(tieOrder, a.id) - tieIndex(tieOrder, b.id)
      );
    } else {
      ordered = sortReady(readyNow, algo, tieOrder);
    }
    queues[t] = ordered.map((p) => p.id);

    if (!current) {
      // CPU idle: no marcar nada en procesos no llegados
      t += 1;
      if (t > totalBurst + maxArrival + n + 20) break; // seguridad anti-bucle
      continue;
    }

    // Ejecutar 1 unidad
    if (current.start === null) current.start = t;
    if (current.firstResponse === null) current.firstResponse = t;
    timeline[t] = current.id;

    const idx = processes.indexOf(current);
    grid[idx][t] = "E";
    current.remaining -= 1;
    if (algo === "rr") quantumLeft -= 1;

    if (current.remaining === 0) {
      current.finish = t + 1;
      completed += 1;
      ensureHorizon(current.finish + 1);
      grid[idx][current.finish] = "F";
      current = null;
      quantumLeft = 0;
    }

    t += 1;
  }

  // Garantizar F en finish de cada proceso (por si el horizonte creció a medias)
  processes.forEach((p, idx) => {
    if (p.finish == null) return;
    ensureHorizon(p.finish + 1);
    grid[idx][p.finish] = "F";
  });

  // Marcar L en celdas de espera (llegó, no terminó, no está en E ni F)
  processes.forEach((p, idx) => {
    const finish = p.finish ?? maxTime;
    for (let time = p.arrival; time < finish && time < maxTime; time++) {
      if (grid[idx][time] === "") {
        grid[idx][time] = "L";
      }
    }
  });

  // Recortar tiempo útil: incluir siempre la última F
  let usedUntil = 0;
  for (let time = 0; time < maxTime; time++) {
    const any = grid.some(
      (row) => row[time] === "E" || row[time] === "F" || row[time] === "L"
    );
    if (any) usedUntil = time + 1;
  }
  const maxFinish = processes.reduce(
    (m, p) => Math.max(m, p.finish == null ? 0 : p.finish),
    0
  );
  usedUntil = Math.max(usedUntil, maxFinish + 1);
  const cols = Math.min(Math.max(usedUntil, 1), maxTime);

  const metrics = processes.map((p) => {
    const retorno = p.finish != null ? p.finish - p.arrival : null;
    const espera = retorno != null ? retorno - p.burst : null;
    return {
      id: p.id,
      start: p.start,
      finish: p.finish,
      retorno,
      espera,
      burst: p.burst,
      arrival: p.arrival,
      priority: p.priority,
    };
  });

  const valid = metrics.filter((m) => m.retorno != null);
  const avgRetorno =
    valid.length > 0
      ? valid.reduce((s, m) => s + m.retorno, 0) / valid.length
      : null;
  const avgEspera =
    valid.length > 0
      ? valid.reduce((s, m) => s + m.espera, 0) / valid.length
      : null;

  return {
    algorithm: algo,
    quantum: Number(quantum),
    processes: metrics,
    grid: grid.map((row) => row.slice(0, cols)),
    queues: queues.slice(0, cols),
    timeline: timeline.slice(0, cols),
    cols,
    avgRetorno,
    avgEspera,
    tieOrder: tieOrder.slice(),
  };
}

function solutionFingerprint(sol) {
  const grid = sol.grid.map((row) => row.join("")).join("|");
  const q = sol.queues.map((qq) => (qq || []).join(",")).join("|");
  const m = sol.processes
    .map((p) => `${p.id}:${p.start},${p.finish},${p.retorno},${p.espera}`)
    .join("|");
  return `${grid}#${q}#${m}`;
}

/**
 * Enumera soluciones equivalentes variando el orden de desempate
 * (llegadas simultáneas en RR/FCFS, empates SJF/prioridad, etc.).
 */
function enumerateSolutions(processesInput, algorithm, quantum = 3) {
  const ids = defaultTieOrder(processesInput);
  const orders =
    ids.length <= 5 ? permutations(ids) : [ids].concat(
      // si hubiera muchos procesos, al menos prueba el canónico
      []
    );
  const seen = new Map();
  const solutions = [];

  orders.forEach((tieOrder) => {
    const sol = simulate(processesInput, algorithm, quantum, { tieOrder });
    const fp = solutionFingerprint(sol);
    if (!seen.has(fp)) {
      seen.set(fp, true);
      solutions.push(sol);
    }
  });

  // Canónica: desempate por id numérico (P1 antes que P2…)
  const canonical = simulate(processesInput, algorithm, quantum, {
    tieOrder: ids,
  });
  const canonFp = solutionFingerprint(canonical);
  solutions.sort((a, b) => {
    const fa = solutionFingerprint(a);
    const fb = solutionFingerprint(b);
    if (fa === canonFp) return -1;
    if (fb === canonFp) return 1;
    return fa.localeCompare(fb);
  });

  return {
    solutions,
    solution: solutions[0] || canonical,
    count: solutions.length,
    hasMultiple: solutions.length > 1,
  };
}

function buildExercisePackage(processes, algorithm, quantum, extra = {}) {
  const enumerated = enumerateSolutions(processes, algorithm, quantum);
  return {
    processes,
    algorithm,
    quantum,
    solution: enumerated.solution,
    solutions: enumerated.solutions,
    solutionCount: enumerated.count,
    hasMultipleSolutions: enumerated.hasMultiple,
    ...extra,
  };
}

function formatAvg(n) {
  if (n == null || Number.isNaN(n)) return "—";
  return Number.isInteger(n) ? String(n) : n.toFixed(2).replace(/\.?0+$/, (m) => (m.includes(".") ? m.replace(/0+$/, "").replace(/\.$/, "") : m));
}

function round2(n) {
  return Math.round(n * 100) / 100;
}

const GRADE_MAX = {
  crono: 5,
  queues: 2.5,
  metrics: 1.5,
  averages: 1,
};
const GRADE_TOTAL_MAX = 10;

function metricNum(v) {
  if (v === "" || v == null || Number.isNaN(Number(v))) return null;
  return Number(v);
}

/**
 * Baremo /10:
 * - Cronograma (sin colas): hasta 5. Un error en un proceso anula ese proceso.
 * - Colas por instante: hasta 2.5. Un error en un instante anula ese instante.
 * - Columnas T.comienzo→T.espera: hasta 1.5. Un error anula toda la columna.
 * - T. medios: hasta 1. Cada media incorrecta resta 0.5.
 */
function gradeSolution(student, solution) {
  const errors = [];
  const rows = solution.grid.length;
  const cols = solution.cols;
  const nSlots = solution.processes.length;

  // --- Cronograma: 5 pts (por proceso, todo o nada) ---
  let okProcesses = 0;
  const processDetails = [];
  let okCells = 0;
  let totalCells = 0;
  for (let i = 0; i < rows; i++) {
    let processOk = true;
    const cellErrors = [];
    for (let t = 0; t < cols; t++) {
      const expected = solution.grid[i][t] || "";
      const got = (student.grid?.[i]?.[t] || "").toUpperCase();
      if (expected === "" && got === "") continue;
      totalCells += 1;
      if (got === expected) {
        okCells += 1;
      } else {
        processOk = false;
        const err = {
          type: "cell",
          process: solution.processes[i].id,
          time: t,
          expected: expected || "",
          got: got || "",
        };
        cellErrors.push(err);
        errors.push(err);
      }
    }
    if (processOk) okProcesses += 1;
    processDetails.push({
      id: solution.processes[i].id,
      ok: processOk,
      errorCount: cellErrors.length,
    });
  }
  const pointsCrono = rows
    ? round2((okProcesses / rows) * GRADE_MAX.crono)
    : GRADE_MAX.crono;

  // --- Colas: 2.5 pts solo sobre casillas que deben tener valor ---
  // (vacío vs vacío no puntúa: si el alumno no rellena, no suma)
  let okRequiredSlots = 0;
  let totalRequiredSlots = 0;
  let okQueueSlots = 0;
  let totalQueueSlots = 0;
  const instantDetails = [];
  for (let t = 0; t < cols; t++) {
    const expSlots = queueToSlots(solution.queues[t] || [], nSlots);
    const gotSlots = normalizeQueueSlots(
      student.queueSlots?.[t] ?? student.queues?.[t],
      nSlots
    );
    let hasRequired = false;
    let instantRequiredOk = true;
    for (let s = 0; s < nSlots; s++) {
      const exp = expSlots[s] || "";
      const got = gotSlots[s] || "";
      if (!exp) {
        // Casilla que debe estar vacía: no entra en la nota; si hay basura, se registra
        if (got) {
          errors.push({
            type: "queue",
            time: t,
            slot: s,
            expected: "",
            got,
          });
        }
        continue;
      }
      hasRequired = true;
      totalRequiredSlots += 1;
      totalQueueSlots += 1;
      if (got === exp) {
        okRequiredSlots += 1;
        okQueueSlots += 1;
      } else {
        instantRequiredOk = false;
        errors.push({
          type: "queue",
          time: t,
          slot: s,
          expected: exp,
          got: got || "",
        });
      }
    }
    if (hasRequired) {
      instantDetails.push({ time: t, ok: instantRequiredOk });
    }
  }
  const pointsQueues = totalRequiredSlots
    ? round2((okRequiredSlots / totalRequiredSlots) * GRADE_MAX.queues)
    : GRADE_MAX.queues;

  // --- Métricas: 1.5 pts (por columna, todo o nada) ---
  const metricFields = ["start", "finish", "retorno", "espera"];
  let okColumns = 0;
  const columnDetails = [];
  metricFields.forEach((key) => {
    let colOk = true;
    solution.processes.forEach((p, i) => {
      const exp = p[key];
      const got = metricNum(student.metrics?.[i]?.[key]);
      if (exp == null && got == null) return;
      if (got !== exp) {
        colOk = false;
        errors.push({
          type: "metric",
          process: p.id,
          field: key,
          expected: exp,
          got,
        });
      }
    });
    if (colOk) okColumns += 1;
    columnDetails.push({ field: key, ok: colOk });
  });
  const pointsMetrics = round2(
    (okColumns / metricFields.length) * GRADE_MAX.metrics
  );

  // --- Medias: 1 pt (0.5 cada una) ---
  const avgR = metricNum(student.avgRetorno);
  const avgE = metricNum(student.avgEspera);
  const expAvgR = round2(solution.avgRetorno);
  const expAvgE = round2(solution.avgEspera);
  const avgROk = avgR != null && round2(avgR) === expAvgR;
  const avgEOk = avgE != null && round2(avgE) === expAvgE;
  let pointsAverages = GRADE_MAX.averages;
  if (!avgROk) {
    pointsAverages -= 0.5;
    errors.push({
      type: "avg",
      field: "avgRetorno",
      expected: expAvgR,
      got: avgR,
    });
  }
  if (!avgEOk) {
    pointsAverages -= 0.5;
    errors.push({
      type: "avg",
      field: "avgEspera",
      expected: expAvgE,
      got: avgE,
    });
  }
  pointsAverages = round2(Math.max(0, pointsAverages));

  const total = round2(
    pointsCrono + pointsQueues + pointsMetrics + pointsAverages
  );
  const perfect = total === GRADE_TOTAL_MAX && errors.length === 0;

  return {
    perfect,
    errors,
    okCells,
    totalCells,
    okQueues: okQueueSlots,
    totalQueues: totalQueueSlots,
    scoreCells: totalCells ? okCells / totalCells : 1,
    scoreQueues: totalQueueSlots ? okQueueSlots / totalQueueSlots : 1,
    metricErrors: errors.filter((e) => e.type === "metric" || e.type === "avg")
      .length,
    score: {
      total,
      maxTotal: GRADE_TOTAL_MAX,
      crono: {
        points: pointsCrono,
        max: GRADE_MAX.crono,
        ok: okProcesses,
        total: rows,
        unit: rows ? round2(GRADE_MAX.crono / rows) : GRADE_MAX.crono,
        details: processDetails,
      },
      queues: {
        points: pointsQueues,
        max: GRADE_MAX.queues,
        ok: okRequiredSlots,
        total: totalRequiredSlots,
        unit: totalRequiredSlots
          ? round2(GRADE_MAX.queues / totalRequiredSlots)
          : GRADE_MAX.queues,
        details: instantDetails,
      },
      metrics: {
        points: pointsMetrics,
        max: GRADE_MAX.metrics,
        ok: okColumns,
        total: metricFields.length,
        unit: round2(GRADE_MAX.metrics / metricFields.length),
        details: columnDetails,
      },
      averages: {
        points: pointsAverages,
        max: GRADE_MAX.averages,
        unit: 0.5,
        retornoOk: avgROk,
        esperaOk: avgEOk,
      },
    },
    matchedSolution: solution,
  };
}

/**
 * Corrige contra todas las soluciones equivalentes; elige la mejor nota.
 */
function gradeAgainstAny(student, solutions) {
  const list = solutions && solutions.length ? solutions : [];
  if (!list.length) {
    return {
      perfect: false,
      errors: [{ type: "avg", field: "solution", expected: "?", got: null }],
      okCells: 0,
      totalCells: 0,
      okQueues: 0,
      totalQueues: 0,
      scoreCells: 0,
      scoreQueues: 0,
      metricErrors: 1,
      score: {
        total: 0,
        maxTotal: GRADE_TOTAL_MAX,
        crono: { points: 0, max: GRADE_MAX.crono, ok: 0, total: 0, unit: 0, details: [] },
        queues: { points: 0, max: GRADE_MAX.queues, ok: 0, total: 0, unit: 0, details: [] },
        metrics: { points: 0, max: GRADE_MAX.metrics, ok: 0, total: 4, unit: 0.375, details: [] },
        averages: {
          points: 0,
          max: GRADE_MAX.averages,
          unit: 0.5,
          retornoOk: false,
          esperaOk: false,
        },
      },
      matchedSolution: null,
      solutionCount: 0,
      hasMultipleSolutions: false,
    };
  }

  let best = null;
  for (let i = 0; i < list.length; i++) {
    const g = gradeSolution(student, list[i]);
    const pts = g.score?.total ?? 0;
    if (
      !best ||
      g.perfect ||
      pts > best._pts ||
      (pts === best._pts && g.errors.length < best.errors.length)
    ) {
      best = { ...g, _pts: pts };
      if (g.perfect) break;
    }
  }
  delete best._pts;
  best.solutionCount = list.length;
  best.hasMultipleSolutions = list.length > 1;
  return best;
}

function normalizeQueue(str) {
  return String(str)
    .toUpperCase()
    .trim()
    .replace(/[,;|+]+/g, " ")
    .replace(/\s+/g, " ");
}

/** Cola [próximo,…,lejos] → slots [arriba=lejos … abajo=próximo] */
function queueToSlots(queueIds, nSlots) {
  const slots = Array.from({ length: nSlots }, () => "");
  const ids = (queueIds || []).map((id) => String(id).toUpperCase()).filter(Boolean);
  ids.forEach((id, i) => {
    const slot = nSlots - 1 - i; // abajo = próximo
    if (slot >= 0) slots[slot] = id;
  });
  return slots;
}

/** slots [arriba…abajo] → cola [próximo,…,lejos] */
function slotsToQueue(slots) {
  const arr = Array.isArray(slots) ? slots : [];
  const out = [];
  for (let i = arr.length - 1; i >= 0; i--) {
    const id = String(arr[i] || "").toUpperCase().trim();
    if (id) out.push(id);
  }
  return out;
}

function normalizeQueueSlots(raw, nSlots) {
  if (Array.isArray(raw) && raw.length === nSlots && raw.every((x) => typeof x === "string" || x == null)) {
    return raw.map((x) => String(x || "").toUpperCase().trim());
  }
  // Compat: lista plana [próximo,…] o string
  if (Array.isArray(raw)) {
    return queueToSlots(
      raw.map((x) => String(x || "").toUpperCase().trim()).filter(Boolean),
      nSlots
    );
  }
  if (typeof raw === "string") {
    const ids = raw
      .toUpperCase()
      .split(/[\s,;|]+/)
      .map((x) => x.trim())
      .filter(Boolean);
    return queueToSlots(ids, nSlots);
  }
  return Array.from({ length: nSlots }, () => "");
}

function exerciseFingerprint(algorithm, quantum, processes) {
  const body = processes
    .map((p) => `${p.id}:${p.burst}:${p.arrival}:${p.priority ?? 1}`)
    .join("|");
  return `${algorithm}|q${quantum}|${body}`;
}

/** PRNG determinista (Mulberry32). */
function mulberry32(seed) {
  let a = seed >>> 0;
  return function rng() {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Mezcla semilla numérica + algoritmo → estado 32-bit (mismo seed ≠ mismo ejercicio entre algoritmos). */
function hashSeed(seedNum, algorithm) {
  let h = (Number(seedNum) >>> 0) ^ 0x9e3779b9;
  const s = String(algorithm || "fcfs");
  for (let i = 0; i < s.length; i++) {
    h = Math.imul(h ^ s.charCodeAt(i), 0x85ebca6b);
    h = (h << 13) | (h >>> 19);
  }
  h = Math.imul(h ^ (h >>> 16), 0x45d9f3b);
  return h >>> 0;
}

/**
 * De la semilla salen nº de procesos (3–8) y quantum (1–5) si aplica.
 * Determinista por tipo de ejercicio (algoritmo).
 */
function decodeSeedParams(seedNum, algorithm) {
  const h = hashSeed(seedNum, algorithm);
  const count = 3 + (h % 6); // 3..8
  const quantum = 1 + ((h >>> 10) % 5); // 1..5
  return { count, quantum, rngSeed: h };
}

function randInt(rng, min, maxInclusive) {
  return min + Math.floor(rng() * (maxInclusive - min + 1));
}

function shuffleInPlace(arr, rng) {
  const rnd = rng || Math.random;
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    const tmp = arr[i];
    arr[i] = arr[j];
    arr[j] = tmp;
  }
  return arr;
}

/**
 * Genera procesos con ids P1..Pn y llegadas independientes del número de proceso
 * (p. ej. P4 puede llegar antes que P2). Siempre hay al menos una llegada en t=0.
 * rng: función () => [0,1) — si no se pasa, usa Math.random.
 */
function buildRandomProcesses(count, rng) {
  const rnd = rng || Math.random;
  const arrivals = [];
  let t = 0;
  for (let i = 0; i < count; i++) {
    arrivals.push(t);
    t += randInt(rnd, 0, 2); // hueco 0, 1 o 2
  }
  shuffleInPlace(arrivals, rnd);
  if (!arrivals.includes(0)) arrivals[0] = 0;

  const processes = [];
  for (let i = 0; i < count; i++) {
    processes.push({
      id: `P${i + 1}`,
      burst: randInt(rnd, 2, 7),
      arrival: arrivals[i],
      priority: randInt(rnd, 1, 3),
    });
  }
  const maxTotal = Math.min(42, 14 + count * 3);
  while (processes.reduce((s, p) => s + p.burst, 0) > maxTotal) {
    const longest = processes.reduce((a, b) => (a.burst >= b.burst ? a : b));
    if (longest.burst > 2) longest.burst -= 1;
    else break;
  }
  return processes;
}

/**
 * Genera un ejercicio.
 * options.count, options.quantum, options.rng, options.seed, options.seen
 */
function generateExercise(algorithm, options = {}) {
  const needsQ = !!ALGORITHMS[algorithm]?.needsQuantum;
  const count = Math.min(8, Math.max(3, Number(options.count) || 5));
  let quantum = needsQ
    ? Math.min(5, Math.max(1, Number(options.quantum) || 3))
    : Number(options.quantum) || 3;
  const seen = new Set(options.seen || []);
  const rng = options.rng || null;
  let processes = null;
  let fingerprint = "";
  let reused = false;

  // Con semilla/rng fijo: una sola generación determinista
  if (rng) {
    processes = buildRandomProcesses(count, rng);
    fingerprint = exerciseFingerprint(algorithm, quantum, processes);
    reused = seen.has(fingerprint);
    return buildExercisePackage(processes, algorithm, quantum, {
      fingerprint,
      reused,
      seed: options.seed != null ? Number(options.seed) : null,
      count,
    });
  }

  for (let attempt = 0; attempt < 80; attempt++) {
    if (needsQ && options.quantum == null) {
      quantum = randInt(Math.random, 1, 5);
    }
    processes = buildRandomProcesses(count, Math.random);
    if (attempt > 20 && Math.random() < 0.5) {
      const p = processes[1 + Math.floor(Math.random() * (processes.length - 1))];
      p.burst = Math.max(2, Math.min(8, p.burst + (Math.random() < 0.5 ? -1 : 1)));
    }
    fingerprint = exerciseFingerprint(algorithm, quantum, processes);
    if (!seen.has(fingerprint)) break;
  }

  if (seen.has(fingerprint)) reused = true;

  return buildExercisePackage(processes, algorithm, quantum, {
    fingerprint,
    reused,
    seed: null,
    count,
  });
}

/**
 * Ejercicio 100% determinista a partir de semilla (0–999999) y algoritmo.
 * Misma semilla + mismo algoritmo ⇒ mismo enunciado.
 */
function generateExerciseFromSeed(algorithm, seedInput) {
  const raw = String(seedInput ?? "").replace(/\D/g, "").slice(0, 6);
  const seedNum = raw === "" ? 0 : Number(raw);
  const { count, quantum, rngSeed } = decodeSeedParams(seedNum, algorithm);
  const rng = mulberry32(rngSeed);
  const needsQ = !!ALGORITHMS[algorithm]?.needsQuantum;
  return generateExercise(algorithm, {
    count,
    quantum: needsQ ? quantum : 3,
    rng,
    seed: seedNum,
  });
}

/** Ejercicio de ejemplo fijo (llegadas no ordenadas por id). */
function exampleExercise(algorithm = "prioridad_ap", quantum = 3) {
  const processes = [
    { id: "P1", burst: 7, arrival: 2, priority: 1 },
    { id: "P2", burst: 4, arrival: 0, priority: 2 },
    { id: "P3", burst: 5, arrival: 3, priority: 2 },
    { id: "P4", burst: 6, arrival: 1, priority: 1 },
  ];
  return buildExercisePackage(processes, algorithm, quantum);
}

/** Normaliza ids de algoritmo (UI → motor). */
function normalizeAlgorithmId(algo) {
  const a = String(algo || "").toLowerCase();
  if (a === "prioridad_np") return "prioridad";
  if (a === "prioridad_ap") return "prioridad_ap";
  if (a === "prioridad") return "prioridad";
  return a;
}

/** Enunciado sin solución, completo y reproducible. */
function toExamStatementItem(pkg, id) {
  const algorithm = pkg.algorithm;
  const needsQuantum = !!ALGORITHMS[algorithm]?.needsQuantum;
  const processes = (pkg.processes || []).map((p) => ({
    id: p.id,
    burst: Number(p.burst),
    arrival: Number(p.arrival),
    priority: Number(p.priority ?? 1),
  }));
  return {
    id: String(id),
    algorithm,
    needsQuantum,
    quantum: needsQuantum ? Number(pkg.quantum) || 3 : null,
    processCount: processes.length,
    cols: Number(pkg.solution?.cols) || Number(pkg.cols) || null,
    processes,
  };
}

/**
 * Bloque enunciado + respuesta listo para el JSON de finalización del alumno.
 */
function buildExamSubmissionEntry(pkg, student, id) {
  const statement = toExamStatementItem(pkg, id);
  const processes = statement.processes;
  const metrics = (student.metrics || []).map((m, i) => ({
    id: processes[i]?.id || `P${i + 1}`,
    start: m?.start ?? null,
    finish: m?.finish ?? null,
    retorno: m?.retorno ?? null,
    espera: m?.espera ?? null,
  }));
  return {
    id: String(id),
    statement,
    answer: {
      grid: (student.grid || []).map((row) =>
        (row || []).map((c) => String(c || "").toUpperCase())
      ),
      queueSlots: (student.queueSlots || []).map((slots) =>
        (slots || []).map((x) => String(x || "").toUpperCase().trim())
      ),
      metrics,
      averages: {
        retorno:
          student.avgRetorno === "" || student.avgRetorno == null
            ? null
            : Number(student.avgRetorno),
        espera:
          student.avgEspera === "" || student.avgEspera == null
            ? null
            : Number(student.avgEspera),
      },
    },
  };
}

/**
 * Reconstruye el paquete desde un enunciado ya materializado
 * ({ algorithm, quantum, processes }).
 */
function hydrateExamItem(item) {
  const algorithm = normalizeAlgorithmId(item.algorithm);
  const quantum = Number(item.quantum) || 3;
  const processes = (item.processes || []).map((p) => ({
    id: p.id,
    burst: Number(p.burst),
    arrival: Number(p.arrival),
    priority: Number(p.priority ?? 1),
  }));
  return buildExercisePackage(processes, algorithm, quantum, {
    id: item.id,
  });
}

/**
 * Genera el enunciado concreto en el momento de realizar el examen.
 * - mode random: nº procesos (y quantum) aleatorios
 * - mode params: usa count/quantum del JSON; ráfagas/llegadas/prioridades aleatorias
 * Si el ítem ya trae processes (examen antiguo), se reutiliza.
 */
function materializeExamItem(spec) {
  if (spec?.processes?.length) {
    return hydrateExamItem(spec);
  }
  const algorithm = normalizeAlgorithmId(spec.algorithm);
  const needsQ = !!ALGORITHMS[algorithm]?.needsQuantum;
  const mode = spec.mode === "params" ? "params" : "random";
  const opts = {};
  if (mode === "params") {
    opts.count = Math.min(8, Math.max(3, Number(spec.count) || 5));
    if (needsQ) {
      opts.quantum = Math.min(5, Math.max(1, Number(spec.quantum) || 3));
    } else {
      opts.quantum = 3;
    }
  } else {
    opts.count = 3 + Math.floor(Math.random() * 6); // 3..8
    if (needsQ) opts.quantum = 1 + Math.floor(Math.random() * 5);
    else opts.quantum = 3;
  }
  const pkg = generateExercise(algorithm, opts);
  pkg.id = spec.id;
  return pkg;
}

/** Campos discretos de la llave de examen (fecha + sello). */
const EXAM_DATE_FIELD = "rd";
const EXAM_SEAL_FIELD = "qk";
const EXAM_SEAL_PEPPER = "pc·key·26";

function todayLocalYmd() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Normaliza a YYYY-MM-DD (acepta ISO completo). */
function normalizeExamDate(value) {
  const s = String(value || "").trim();
  const m = s.match(/^(\d{4}-\d{2}-\d{2})/);
  return m ? m[1] : "";
}

function computeExamKeySeal(exam) {
  const body = { ...(exam || {}) };
  delete body[EXAM_SEAL_FIELD];
  return crc32(EXAM_SEAL_PEPPER + canonicalJson(body))
    .toString(16)
    .padStart(8, "0");
}

function sealExamKey(exam) {
  const out = { ...(exam || {}) };
  out[EXAM_SEAL_FIELD] = computeExamKeySeal(out);
  return out;
}

function verifyExamKeySeal(exam) {
  if (!exam || typeof exam !== "object") {
    return { ok: false, status: "missing" };
  }
  const got = exam[EXAM_SEAL_FIELD];
  if (got == null || got === "") {
    return { ok: false, status: "missing" };
  }
  const expect = computeExamKeySeal(exam);
  if (String(got).toLowerCase() !== expect) {
    return { ok: false, status: "mismatch" };
  }
  return { ok: true, status: "ok" };
}

/**
 * Valida la llave de examen (estructura, sello y, opcionalmente, fecha).
 * La corrección debe llamar con checkDate: false.
 * @returns {{ ok: boolean, error: null|'format'|'integrity'|'date', exam?: object, examDate?: string, today?: string }}
 */
function validateExamKey(data, opts = {}) {
  const checkDate = opts.checkDate !== false;
  if (!data || typeof data !== "object" || !Array.isArray(data.exercises) || !data.exercises.length) {
    return { ok: false, error: "format" };
  }
  const seal = verifyExamKeySeal(data);
  if (!seal.ok) {
    return { ok: false, error: "integrity", exam: data };
  }
  if (checkDate) {
    const examDate = normalizeExamDate(data[EXAM_DATE_FIELD]);
    const today = todayLocalYmd();
    if (!examDate || examDate !== today) {
      return { ok: false, error: "date", exam: data, examDate, today };
    }
  }
  return { ok: true, error: null, exam: data };
}

/**
 * JSON de examen: solo especificación (sin procesos concretos).
 * Cada alumno materializa al empezar → enunciados distintos.
 * specs: [{ algorithm, mode: 'random'|'params', count?, quantum? }]
 * Incluye fecha de realización (`rd`) y sello (`qk`).
 */
function buildExam(specs, meta = {}) {
  const list = Array.isArray(specs) ? specs : [];
  const exercises = list.map((spec, i) => {
    const algorithm = normalizeAlgorithmId(spec.algorithm);
    const needsQ = !!ALGORITHMS[algorithm]?.needsQuantum;
    const mode = spec.mode === "params" ? "params" : "random";
    const item = {
      id: spec.id || `E${i + 1}`,
      algorithm,
      mode,
    };
    if (mode === "params") {
      item.count = Math.min(8, Math.max(3, Number(spec.count) || 5));
      if (needsQ) {
        item.quantum = Math.min(5, Math.max(1, Number(spec.quantum) || 3));
      }
    }
    return item;
  });
  const exam = {
    version: 2,
    createdAt: new Date().toISOString(),
    title: meta.title || "",
    [EXAM_DATE_FIELD]:
      normalizeExamDate(meta.examDate) || todayLocalYmd(),
    exercises,
  };
  return sealExamKey(exam);
}

function emptyStudentAnswer(exerciseId) {
  return {
    id: exerciseId,
    exerciseId,
    statement: null,
    answer: null,
    grid: [],
    queueSlots: [],
    metrics: [],
    avgRetorno: "",
    avgEspera: "",
  };
}

/** Normaliza una entrada de entrega (formato nuevo o antiguo) a { statement, student }. */
function normalizeSubmissionEntry(raw, fallbackId) {
  const id = String(raw?.id || raw?.exerciseId || fallbackId || "");
  const statement =
    raw?.statement && raw.statement.processes?.length
      ? { ...raw.statement, id }
      : null;
  const ans = raw?.answer || raw || {};
  const averages = ans.averages || {};
  const student = {
    grid: ans.grid || raw?.grid || [],
    queueSlots: ans.queueSlots || raw?.queueSlots || [],
    queues: ans.queues || raw?.queues,
    metrics: ans.metrics || raw?.metrics || [],
    avgRetorno:
      averages.retorno != null
        ? averages.retorno
        : ans.avgRetorno ?? raw?.avgRetorno ?? "",
    avgEspera:
      averages.espera != null
        ? averages.espera
        : ans.avgEspera ?? raw?.avgEspera ?? "",
  };
  return { id, statement, student };
}

/** Campo discreto de integridad en la entrega del alumno (no usar nombre obvio). */
const SUBMISSION_SEAL_FIELD = "xv";
const SUBMISSION_SEAL_PEPPER = "pc·smr·26";

function crc32(str) {
  let crc = 0xffffffff;
  for (let i = 0; i < str.length; i += 1) {
    crc ^= str.charCodeAt(i);
    for (let j = 0; j < 8; j += 1) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

/** JSON canónico (claves ordenadas) para que el sello no dependa del orden. */
function canonicalJson(value) {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map((v) => canonicalJson(v)).join(",")}]`;
  }
  const keys = Object.keys(value).sort();
  return `{${keys
    .map((k) => `${JSON.stringify(k)}:${canonicalJson(value[k])}`)
    .join(",")}}`;
}

function computeSubmissionSeal(payload) {
  const body = { ...(payload || {}) };
  delete body[SUBMISSION_SEAL_FIELD];
  return crc32(SUBMISSION_SEAL_PEPPER + canonicalJson(body))
    .toString(16)
    .padStart(8, "0");
}

/** Añade el sello CRC a la entrega justo antes de descargarla. */
function sealExamSubmission(payload) {
  const out = { ...(payload || {}) };
  out[SUBMISSION_SEAL_FIELD] = computeSubmissionSeal(out);
  return out;
}

/**
 * Comprueba si la entrega ha sido alterada tras generarse.
 * @returns {{ ok: boolean, status: 'ok'|'mismatch'|'missing' }}
 */
function verifyExamSubmissionSeal(payload) {
  if (!payload || typeof payload !== "object") {
    return { ok: false, status: "missing" };
  }
  const got = payload[SUBMISSION_SEAL_FIELD];
  if (got == null || got === "") {
    return { ok: false, status: "missing" };
  }
  const expect = computeSubmissionSeal(payload);
  if (String(got).toLowerCase() !== expect) {
    return { ok: false, status: "mismatch" };
  }
  return { ok: true, status: "ok" };
}

/**
 * Corrige una entrega autocontenida (statement + answer por ejercicio).
 * No hace falta el JSON de creación: el enunciado materializado va en la
 * entrega del alumno. `examFallback` solo se usa en entregas antiguas sin statement.
 */
function gradeExam(studentAnswers, examFallback = null) {
  const rawList =
    studentAnswers?.exercises ||
    studentAnswers?.answers ||
    [];
  const fallbackItems =
    examFallback?.exercises ||
    studentAnswers?.exam?.exercises ||
    studentAnswers?.exam?.spec ||
    [];

  const hasEmbeddedStatements = rawList.some(
    (a) => a?.statement?.processes?.length
  );

  const workItems = hasEmbeddedStatements
    ? rawList.map((raw, i) => ({
        id: String(raw?.id || raw?.exerciseId || `E${i + 1}`),
        algorithm: raw?.statement?.algorithm || raw?.algorithm,
        processes: raw?.statement?.processes,
        quantum: raw?.statement?.quantum,
        raw,
      }))
    : fallbackItems.map((item, i) => ({
        id: String(item.id || `E${i + 1}`),
        algorithm: item.algorithm,
        processes: item.processes,
        quantum: item.quantum,
        raw: rawList[i] || emptyStudentAnswer(item.id),
      }));

  const results = workItems.map((item) => {
    const { statement: fromAns, student } = normalizeSubmissionEntry(
      item.raw,
      item.id
    );
    const statement =
      fromAns ||
      (item.processes?.length
        ? {
            id: item.id,
            algorithm: item.algorithm,
            processes: item.processes,
            quantum: item.quantum,
          }
        : null);
    if (!statement) {
      return {
        exerciseId: item.id,
        algorithm: item.algorithm,
        perfect: false,
        score: { total: 0, maxTotal: GRADE_TOTAL_MAX },
        errors: [
          {
            type: "avg",
            field: "statement",
            expected: "statement",
            got: null,
          },
        ],
        missingStatement: true,
      };
    }
    const pkg = hydrateExamItem(statement);
    const grade = gradeAgainstAny(student, pkg.solutions || [pkg.solution]);
    return {
      exerciseId: item.id,
      algorithm: statement.algorithm || item.algorithm,
      perfect: grade.perfect,
      score: grade.score,
      errors: grade.errors,
      statement,
      student,
      matchedSolution: grade.matchedSolution || null,
      hasMultipleSolutions: grade.hasMultipleSolutions,
      solutionCount: grade.solutionCount,
    };
  });

  const total = round2(results.reduce((s, r) => s + (r.score?.total || 0), 0));
  const maxTotal = round2(results.length * GRADE_TOTAL_MAX);
  return {
    version: 1,
    gradedAt: new Date().toISOString(),
    examTitle:
      studentAnswers?.exam?.title ||
      examFallback?.title ||
      "",
    studentName: String(studentAnswers?.studentName || "").trim(),
    results,
    total,
    maxTotal,
    average: results.length ? round2(total / results.length) : 0,
  };
}

global.Scheduler = {
  ALGORITHMS,
  simulate,
  enumerateSolutions,
  gradeSolution,
  gradeAgainstAny,
  generateExercise,
  generateExerciseFromSeed,
  decodeSeedParams,
  exampleExercise,
  exerciseFingerprint,
  solutionFingerprint,
  queueToSlots,
  slotsToQueue,
  normalizeQueueSlots,
  formatAvg,
  round2,
  GRADE_MAX,
  GRADE_TOTAL_MAX,
  normalizeAlgorithmId,
  toExamStatementItem,
  buildExamSubmissionEntry,
  hydrateExamItem,
  materializeExamItem,
  buildExam,
  gradeExam,
  sealExamKey,
  validateExamKey,
  todayLocalYmd,
  normalizeExamDate,
  sealExamSubmission,
  verifyExamSubmissionSeal,
  emptyStudentAnswer,
  normalizeSubmissionEntry,
};
})(window);
