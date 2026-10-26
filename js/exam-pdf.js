/**
 * Informe PDF de corrección de prueba (portada + 1 página por ejercicio).
 */
(function (global) {
  const OK = [198, 239, 206];
  const BAD = [255, 199, 206];
  const NEUTRAL = [255, 255, 255];
  const INK = [30, 30, 30];
  const TEAL = [15, 110, 108];
  const MUTED = [90, 90, 90];

  function getJsPDF() {
    const ns = global.jspdf || global.jsPDF;
    if (!ns) throw new Error("jsPDF no cargado");
    return ns.jsPDF || ns;
  }

  function cellOk(got, expected) {
    const g = String(got || "").toUpperCase();
    const e = String(expected || "").toUpperCase();
    if (!g && !e) return null;
    return g === e;
  }

  function metricOk(got, expected) {
    if ((got == null || got === "") && (expected == null || expected === "")) {
      return null;
    }
    if (got == null || got === "" || Number.isNaN(Number(got))) return false;
    return Number(got) === Number(expected);
  }

  function fitFontSize(doc, text, maxWidth, maxSize, minSize = 10) {
    let size = maxSize;
    doc.setFontSize(size);
    while (size > minSize && doc.getTextWidth(String(text)) > maxWidth) {
      size -= 1;
      doc.setFontSize(size);
    }
    return size;
  }

  /** Texto centrado en una sola línea (reduce tamaño si no cabe). */
  function drawSingleLine(doc, text, x, y, maxWidth, maxSize, minSize, color, style) {
    const value = String(text ?? "");
    doc.setFont("helvetica", style || "bold");
    const size = fitFontSize(doc, value, maxWidth, maxSize, minSize);
    doc.setFontSize(size);
    doc.setTextColor(...(color || INK));
    doc.text(value, x, y, { align: "center" });
    return size;
  }

  function drawCover(doc, { report, sourceName, labels }) {
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const margin = 16;
    const maxW = pageW - margin * 2;
    const fileName = sourceName || labels.untitledFile || "entrega.json";
    const studentName = String(report.studentName || "").trim();

    let y = 22;
    drawSingleLine(doc, fileName, pageW / 2, y, maxW, 22, 9, TEAL, "bold");
    y += 14;

    if (studentName) {
      drawSingleLine(doc, studentName, pageW / 2, y, maxW, 26, 11, INK, "bold");
      y += 12;
    }

    if (report.examTitle) {
      drawSingleLine(doc, report.examTitle, pageW / 2, y, maxW, 12, 8, MUTED, "normal");
      y += 8;
    }

    drawSingleLine(
      doc,
      labels.coverSubtitle || "Informe de corrección",
      pageW / 2,
      y,
      maxW,
      11,
      8,
      MUTED,
      "bold"
    );
    y += 12;

    const results = report.results || [];
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(...INK);
    doc.text(labels.perExercise || "Calificación por ejercicio", margin, y);
    y += 7;

    results.forEach((r, i) => {
      const score = r.score?.total ?? 0;
      const max = r.score?.maxTotal ?? 10;
      const line = `${r.exerciseId || `E${i + 1}`} · ${r.algorithm || "—"}: ${score} / ${max}`;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(...INK);
      doc.text(line, margin + 2, y);
      y += 6.2;
      if (y > pageH - 55) {
        doc.addPage();
        y = 24;
      }
    });

    const avg = report.average ?? 0;
    const avgLabel = labels.average || "Nota media";
    const avgText = `${avg} / 10`;
    const avgY = Math.min(pageH - 28, Math.max(y + 22, pageH * 0.62));
    drawSingleLine(doc, avgLabel, pageW / 2, avgY - 12, maxW, 13, 9, MUTED, "bold");
    drawSingleLine(doc, avgText, pageW / 2, avgY + 6, maxW, 40, 16, TEAL, "bold");
  }

  function drawScoreBox(doc, score, labels, x, y, w) {
    const s = score || {};
    const lines = [
      `${labels.crono || "Cronograma"}: ${s.crono?.points ?? 0} / ${s.crono?.max ?? 5}`,
      `${labels.queues || "Colas"}: ${s.queues?.points ?? 0} / ${s.queues?.max ?? 2.5}`,
      `${labels.metrics || "Tiempos"}: ${s.metrics?.points ?? 0} / ${s.metrics?.max ?? 1.5}`,
      `${labels.averages || "Medias"}: ${s.averages?.points ?? 0} / ${s.averages?.max ?? 1}`,
      `${labels.total || "Total"}: ${s.total ?? 0} / ${s.maxTotal ?? 10}`,
    ];
    doc.setFillColor(245, 248, 247);
    doc.setDrawColor(...TEAL);
    doc.roundedRect(x, y, w, 8 + lines.length * 5.2, 2, 2, "FD");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...INK);
    lines.forEach((line, i) => {
      const isLast = i === lines.length - 1;
      doc.setFont("helvetica", isLast ? "bold" : "normal");
      doc.text(line, x + 3, y + 6 + i * 5.2);
    });
    return y + 10 + lines.length * 5.2;
  }

  function drawGrid(doc, { title, head, body, startX, startY, maxW, maxH }) {
    const cols = Math.max(1, head.length);
    const rows = body.length;
    if (!rows) {
      doc.setFontSize(9);
      doc.setTextColor(...MUTED);
      doc.text("—", startX, startY + 5);
      return startY + 10;
    }
    let cellW = Math.min(9, (maxW - 18) / Math.max(1, cols - 1));
    let cellH = Math.min(7, Math.max(4.2, (maxH - 8) / (rows + 1)));
    if (cellW * (cols - 1) + 18 > maxW) {
      cellW = (maxW - 18) / Math.max(1, cols - 1);
    }
    const tableW = 18 + cellW * (cols - 1);
    const tableH = cellH * (rows + 1);

    let y0 = startY;
    if (title) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(...INK);
      doc.text(title, startX, startY);
      y0 = startY + 3;
    }
    for (let r = 0; r <= rows; r++) {
      for (let c = 0; c < cols; c++) {
        const x = startX + (c === 0 ? 0 : 18 + (c - 1) * cellW);
        const y = y0 + r * cellH;
        const w = c === 0 ? 18 : cellW;
        let fill = NEUTRAL;
        let text = "";
        let style = "normal";
        if (r === 0) {
          fill = [220, 235, 234];
          text = String(head[c] ?? "");
          style = "bold";
        } else {
          const cell = body[r - 1][c] || { text: "", ok: null };
          text = String(cell.text ?? "");
          if (cell.ok === true) fill = OK;
          else if (cell.ok === false) fill = BAD;
          style = c === 0 ? "bold" : "normal";
        }
        doc.setFillColor(...fill);
        doc.setDrawColor(160, 160, 160);
        doc.rect(x, y, w, cellH, "FD");
        doc.setFont("helvetica", style);
        doc.setFontSize(cellW < 5.5 ? 6 : 8);
        doc.setTextColor(...INK);
        doc.text(text, x + w / 2, y + cellH / 2 + 1.1, { align: "center" });
      }
    }
    return y0 + tableH + 4;
  }

  function needsPriority(algorithm) {
    const a = String(algorithm || "").toLowerCase();
    return a.includes("prioridad");
  }

  function needsQuantum(algorithm) {
    const a = String(algorithm || "").toLowerCase();
    return a === "rr" || a === "roundrobin" || a === "round_robin";
  }

  function drawStatement(doc, result, labels, startX, startY, maxW) {
    const statement = result.statement || {};
    const processes = statement.processes || [];
    const algorithm = result.algorithm || statement.algorithm || "—";
    const quantum = statement.quantum;
    const showPrio = needsPriority(algorithm);
    const showQ = needsQuantum(algorithm) || statement.needsQuantum;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(...INK);
    doc.text(labels.statement || "Enunciado", startX, startY);

    let meta = `${labels.algo || "Algoritmo"}: ${algorithm}`;
    if (showQ && quantum != null) {
      meta += `   ·   ${labels.quantum || "Quantum"}: ${quantum}`;
    }
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text(meta, startX, startY + 5);

    const head = [
      labels.process || "Proceso",
      labels.arrival || "Llegada",
      labels.burst || "Ráfaga",
    ];
    if (showPrio) head.push(labels.priority || "Prioridad");

    const body = processes.map((p) => {
      const row = [
        { text: p.id, ok: null },
        { text: String(p.arrival ?? ""), ok: null },
        { text: String(p.burst ?? ""), ok: null },
      ];
      if (showPrio) row.push({ text: String(p.priority ?? ""), ok: null });
      return row;
    });

    return drawGrid(doc, {
      title: "",
      head,
      body,
      startX,
      startY: startY + 8,
      maxW: Math.min(120, maxW),
      maxH: 55,
    });
  }

  function buildCronogramaBody(result) {
    const sol = result.matchedSolution;
    const student = result.student || {};
    const processes = result.statement?.processes || sol?.processes || [];
    const cols = sol?.cols || student.grid?.[0]?.length || 0;
    const head = ["P", ...Array.from({ length: cols }, (_, t) => String(t))];
    const body = processes.map((p, i) => {
      const row = [{ text: p.id, ok: null }];
      for (let t = 0; t < cols; t++) {
        const got = student.grid?.[i]?.[t] || "";
        const exp = sol?.grid?.[i]?.[t] || "";
        row.push({ text: String(got || "").toUpperCase(), ok: cellOk(got, exp) });
      }
      return row;
    });
    return { head, body, cols };
  }

  function buildQueueBody(result) {
    const sol = result.matchedSolution;
    const student = result.student || {};
    const nSlots = result.statement?.processes?.length || sol?.processes?.length || 0;
    const cols = sol?.cols || student.queueSlots?.length || 0;
    const head = ["Q", ...Array.from({ length: cols }, (_, t) => String(t))];
    const body = [];
    for (let s = 0; s < nSlots; s++) {
      const row = [{ text: `s${s + 1}`, ok: null }];
      for (let t = 0; t < cols; t++) {
        const expSlots = global.Scheduler.queueToSlots(sol?.queues?.[t] || [], nSlots);
        const gotSlots = global.Scheduler.normalizeQueueSlots(
          student.queueSlots?.[t] ?? student.queues?.[t],
          nSlots
        );
        const got = gotSlots[s] || "";
        const exp = expSlots[s] || "";
        row.push({ text: String(got || "").toUpperCase(), ok: cellOk(got, exp) });
      }
      body.push(row);
    }
    return { head, body };
  }

  function buildMetricsBody(result, labels) {
    const sol = result.matchedSolution;
    const student = result.student || {};
    const processes = result.statement?.processes || sol?.processes || [];
    const fields = [
      { key: "start", label: labels.start || "T.comienzo" },
      { key: "finish", label: labels.finish || "T.final" },
      { key: "retorno", label: labels.retorno || "T.retorno" },
      { key: "espera", label: labels.espera || "T.espera" },
    ];
    const head = ["P", ...fields.map((f) => f.label), "Burst", "Arr"];
    const body = processes.map((p, i) => {
      const row = [{ text: p.id, ok: null }];
      fields.forEach((f) => {
        const got = student.metrics?.[i]?.[f.key];
        const exp = sol?.processes?.[i]?.[f.key];
        const text = got == null || got === "" ? "" : String(got);
        row.push({ text, ok: metricOk(got, exp) });
      });
      row.push({ text: String(p.burst ?? ""), ok: null });
      row.push({ text: String(p.arrival ?? ""), ok: null });
      return row;
    });

    const avgR = student.avgRetorno;
    const avgE = student.avgEspera;
    const expR = sol ? global.Scheduler.round2(sol.avgRetorno) : null;
    const expE = sol ? global.Scheduler.round2(sol.avgEspera) : null;
    body.push([
      { text: labels.avg || "Media", ok: null },
      { text: "", ok: null },
      { text: "", ok: null },
      {
        text: avgR == null || avgR === "" ? "" : String(avgR),
        ok: metricOk(avgR, expR),
      },
      {
        text: avgE == null || avgE === "" ? "" : String(avgE),
        ok: metricOk(avgE, expE),
      },
      { text: "", ok: null },
      { text: "", ok: null },
    ]);
    return { head, body };
  }

  function drawExercisePage(doc, result, labels, index) {
    doc.addPage("a4", "landscape");
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const margin = 12;
    const score = result.score || {};

    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.setTextColor(...TEAL);
    doc.text(
      `${result.exerciseId || `E${index + 1}`} · ${result.algorithm || ""}`,
      margin,
      14
    );

    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.setTextColor(...INK);
    doc.text(`${score.total ?? 0} / ${score.maxTotal ?? 10}`, pageW - margin, 14, {
      align: "right",
    });

    let y = 18;
    const scoreBottom = drawScoreBox(doc, score, labels, pageW - margin - 72, y, 72);

    if (!result.matchedSolution && !result.statement) {
      doc.setFontSize(11);
      doc.setTextColor(...BAD);
      doc.text(labels.missingStatement || "Sin enunciado en la entrega.", margin, y + 8);
      return;
    }

    y = drawStatement(doc, result, labels, margin, y, pageW - margin * 2 - 80);
    y = Math.max(y, scoreBottom) + 2;

    const crono = buildCronogramaBody(result);
    y = drawGrid(doc, {
      title: labels.cronograma || "Cronograma (respuesta del alumno)",
      head: crono.head,
      body: crono.body,
      startX: margin,
      startY: y + 2,
      maxW: pageW - margin * 2,
      maxH: Math.max(36, pageH * 0.38 - 8),
    });

    const queues = buildQueueBody(result);
    y = drawGrid(doc, {
      title: labels.queuesTitle || "Espera CPU",
      head: queues.head,
      body: queues.body,
      startX: margin,
      startY: y + 2,
      maxW: pageW - margin * 2,
      maxH: 36,
    });

    if (y > pageH - 55) {
      doc.addPage("a4", "landscape");
      y = 16;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.setTextColor(...TEAL);
      doc.text(
        `${result.exerciseId || `E${index + 1}`} · ${labels.continued || "continuación"}`,
        margin,
        12
      );
    }

    const metrics = buildMetricsBody(result, labels);
    drawGrid(doc, {
      title: labels.metricsTitle || "Tabla de tiempos",
      head: metrics.head,
      body: metrics.body,
      startX: margin,
      startY: y + 2,
      maxW: Math.min(160, pageW - margin * 2),
      maxH: pageH - y - 16,
    });

    // Leyenda
    const lx = pageW - margin - 55;
    const ly = pageH - 14;
    doc.setFillColor(...OK);
    doc.rect(lx, ly - 3, 5, 4, "F");
    doc.setFontSize(8);
    doc.setTextColor(...INK);
    doc.text(labels.legendOk || "Correcto", lx + 7, ly);
    doc.setFillColor(...BAD);
    doc.rect(lx + 28, ly - 3, 5, 4, "F");
    doc.text(labels.legendBad || "Incorrecto", lx + 35, ly);
  }

  function buildExamGradePdf(opts) {
    const jsPDF = getJsPDF();
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    drawCover(doc, opts);
    (opts.report?.results || []).forEach((result, i) => {
      drawExercisePage(doc, result, opts.labels || {}, i);
    });
    return doc;
  }

  function downloadExamGradePdf(opts) {
    const doc = buildExamGradePdf(opts);
    const base = String(opts.fileBase || opts.sourceName || "informe-prueba")
      .replace(/\.json$/i, "")
      .replace(/[<>:"/\\|?*\u0000-\u001f]/g, "")
      .trim() || "informe-prueba";
    doc.save(`${base}-informe.pdf`);
    return doc;
  }

  global.ExamPdf = {
    buildExamGradePdf,
    downloadExamGradePdf,
  };
})(window);
