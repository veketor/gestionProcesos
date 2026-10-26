/**
 * i18n: español si el navegador está en español; inglés en caso contrario.
 * Se puede cambiar pulsando el badge ES/EN (queda guardado en localStorage).
 */
(function (global) {
  const LANG_KEY = "cronograma_lang";

  function detectLang() {
    const list = navigator.languages && navigator.languages.length
      ? navigator.languages
      : [navigator.language || "en"];
    const isEs = list.some((l) => String(l).toLowerCase().startsWith("es"));
    return isEs ? "es" : "en";
  }

  function loadLang() {
    try {
      const saved = localStorage.getItem(LANG_KEY);
      if (saved === "es" || saved === "en") return saved;
    } catch (_) {
      /* ignore */
    }
    return detectLang();
  }

  let LANG = loadLang();

  function getLang() {
    return LANG;
  }

  function setLang(lang) {
    LANG = lang === "es" ? "es" : "en";
    try {
      localStorage.setItem(LANG_KEY, LANG);
    } catch (_) {
      /* ignore */
    }
    return LANG;
  }

  function toggleLang() {
    return setLang(LANG === "es" ? "en" : "es");
  }

  const STR = {
    es: {
      docTitle: "Cronograma de procesos · Sistemas Operativos Monopuesto",
      docDesc:
        "Tutorial visual y generador-corrector de algoritmos de planificación de CPU para 1º SMR · Sistemas Operativos Monopuesto.",
      brand: "Cronograma de procesos",
      navIntro: "Inicio",
      navTutorial: "Tutorial",
      navExercise: "Ejercicios",
      navExam: "Prueba",
      navAria: "Secciones",
      examTitle: "Modo prueba",
      examLead: "Carga el JSON de la prueba y realiza los ejercicios.",
      examHubCreate: "Crear prueba",
      examHubCreateDesc: "Elige algoritmos; el JSON guarda la especificación (lo aleatorio se crea al realizar).",
      examHubTake: "Realizar prueba",
      examHubTakeDesc: "Necesitarás el fichero llave de prueba que te entregará tu profesor",
      examHubGrade: "Corregir prueba",
      examHubGradeDesc: "Carga la entrega del alumno (incluye enunciado) y obtiene la nota.",
      examCreateTitle: "Crear prueba",
      examTakeTitle: "Realizar prueba",
      examGradeTitle: "Corregir prueba",
      examBack: "← Volver",
      examTitleLabel: "Título (opcional)",
      examDateLabel: "Fecha de realización",
      examCountLabel: "Nº de ejercicios",
      examCreateBuild: "Generar JSON",
      examCreateDownload: "Descargar JSON",
      examLoadLabel: "Archivo clave de prueba.",
      examTakeDropHint: "Arrastra el fichero aquí o haz clic para seleccionarlo.",
      examTakeLoading: "Validando archivo…",
      examAnswersLabel: "Entrega del alumno (.json)",
      examGradeHint:
        "Carga solo el JSON que descargó el alumno al terminar: incluye enunciado y respuestas.",
      examTakeStart: "Empezar prueba",
      examTakeBegin: "Comenzar",
      examTakeReadyCount: "Esta prueba tiene {n} ejercicios.",
      examTakeReady: "Prueba cargada: {n} ejercicios.",
      examTakeBad: "JSON de prueba no válido.",
      examKeyErrorOk: "Entendido",
      examKeyErrorFormatTitle: "Archivo no válido",
      examKeyErrorFormatBody:
        "El fichero no es una llave de prueba reconocible. Pide a tu profesor el archivo correcto.",
      examKeyErrorIntegrityTitle: "Error de integridad",
      examKeyErrorIntegrityBody:
        "El archivo clave ha sido modificado o está corrupto. No se puede iniciar la prueba. Solicita de nuevo el fichero a tu profesor.",
      examKeyErrorDateTitle: "Error de fecha",
      examKeyErrorDateBody:
        "Esta prueba no está autorizada para realizarse hoy. Solo se puede abrir el día de realización indicado por el profesor.",
      examFsWarning: "Debes permanecer en pantalla completa durante la prueba.",
      examFsReenter: "Volver a pantalla completa",
      examGradeRun: "Corregir",
      examGradeDownload: "Descargar informe JSON",
      examGradePdf: "Descargar PDF",
      examGradePdfError: "No se pudo generar el PDF.",
      examGradeNeedFiles: "Carga la entrega del alumno (.json).",
      examPdfCoverSubtitle: "Informe de corrección",
      examPdfPerExercise: "Calificación por ejercicio",
      examPdfAverage: "Nota media",
      examPdfUntitledFile: "entrega.json",
      examPdfCrono: "Cronograma",
      examPdfQueues: "Colas",
      examPdfMetrics: "Tiempos",
      examPdfAverages: "Medias",
      examPdfTotal: "Total",
      examPdfCronograma: "Cronograma (respuesta del alumno)",
      examPdfQueuesTitle: "Espera CPU",
      examPdfStatement: "Enunciado",
      examPdfAlgo: "Algoritmo",
      examPdfQuantum: "Quantum",
      examPdfProcess: "Proceso",
      examPdfArrival: "Llegada",
      examPdfBurst: "Ráfaga",
      examPdfPriority: "Prioridad",
      examPdfStudentName: "Alumno",
      examStudentNameLabel: "Nombre y apellidos",
      examStudentNameRequired: "Escribe tu nombre y apellidos para comenzar.",
      examPdfMetricsTitle: "Tabla de tiempos",
      examPdfStart: "T.comienzo",
      examPdfFinish: "T.final",
      examPdfRetorno: "T.retorno",
      examPdfEspera: "T.espera",
      examPdfAvg: "Media",
      examPdfLegendOk: "Correcto",
      examPdfLegendBad: "Incorrecto",
      examPdfMissingStatement: "Sin enunciado en la entrega.",
      examPdfContinued: "continuación",
      examGradeTampered:
        "ATENCIÓN: se ha detectado manipulación en el fichero de entrega. El contenido no coincide con el original generado al terminar la prueba.",
      examGradeSealMissing:
        "ATENCIÓN: esta entrega no incluye código de integridad (posible fichero antiguo o incompleto). No se puede garantizar que no haya sido modificado.",
      examGradeTitleLine: "Prueba: {title}",
      examGradeSummary: "Nota total: {total} / {max} (media {avg} / 10)",
      examGradeItem: "{id} · {algo}: {score} / {max}",
      examBarTitle: "Prueba",
      examPrev: "← Anterior",
      examNext: "Siguiente →",
      examFinish: "Finalizar prueba",
      examFinishTitle: "Finalizar prueba",
      examFinishConfirm:
        "¿Seguro que quieres finalizar? Se descargará el JSON con tus respuestas y no podrás seguir editando.",
      examFinishYes: "Sí, finalizar",
      examFinishNo: "No, seguir",
      examFinishCodeHint:
        "Para confirmar, escribe exactamente este código de 3 cifras: {code}",
      examFinishCodeLabel: "Código de confirmación",
      examFinishCodeError: "El código no coincide. Inténtalo de nuevo.",
      examFinishConfirmCode: "Confirmar y descargar",
      examFsReportTitle: "Pantalla completa (seguimiento)",
      examFsReportSummary:
        "Entradas: {enters} · Salidas: {exits} · Tiempo en pantalla completa: {fs}s · Tiempo fuera: {win}s",
      examFsReportNone: "Este JSON de respuestas no incluye seguimiento de pantalla completa.",
      examFsReportSegment: "{state}: {from} → {to} ({sec}s)",
      examFsStateFullscreen: "pantalla completa",
      examFsStateWindowed: "ventana",
      examSolveTitle: "Prueba en curso",
      examToolbarHint:
        "Rellena el cronograma, la cola y los tiempos. Usa la barra inferior para cambiar de ejercicio o finalizar.",
      examRowAlgo: "Algoritmo",
      examRowMode: "Generación",
      examModeRandom: "Aleatorio",
      examModeParams: "Nº procesos / quantum",
      examRowCount: "Procesos",
      examRowQuantum: "Quantum",
      heroKicker: "1º SMR · Sistemas Operativos Monopuesto",
      heroTitle: "Cronograma de procesos",
      heroLead:
        "Con viñetas claras verás cómo el planificador de la CPU ordena los procesos — FCFS, SJF, SRTF, prioridad y Round Robin (con el significado de cada sigla) — y luego practicarás el cronograma con el corrector incluido.",
      heroAlt: "Ilustración cómic: la CPU dirige la orquesta de procesos",
      btnStartTutorial: "Empezar tutorial",
      btnSkipExercise: "Ir a ejercicios",
      btnPrev: "← Anterior",
      btnNext: "Siguiente →",
      btnNextExercise: "Ir al ejercicio →",
      exTitle: "Generador · corrector",
      labelAlgo: "Algoritmo a resolver",
      labelQuantum: "Quantum",
      algoHint: "Elige el tipo de gestión y genera un ejercicio nuevo (no se repiten).",
      btnExample: "Ejemplo fijo",
      btnRandom: "Generar nuevo",
      genModalTitle: "Generar ejercicio",
      genTabParams: "Parámetros",
      genTabSeed: "Semilla",
      genCountLabel: "Nº de procesos",
      genQuantumLabel: "Quantum",
      genParamsHint:
        "El resto del enunciado (llegadas, tiempos de ejecución, prioridades) se genera al azar.",
      genSeedLabel: "Semilla (hasta 6 dígitos)",
      genSeedHint:
        "Misma semilla + mismo algoritmo = mismo ejercicio. La semilla fija el nº de procesos y el quantum (si aplica).",
      genSeedPreview: "Con esta semilla: {count} procesos{quantum}.",
      genSeedPreviewQ: ", quantum {q}",
      genCancel: "Cancelar",
      genConfirm: "Generar",
      genSeedInvalid: "Introduce una semilla numérica (hasta 6 dígitos).",
      btnCorrect: "Corregir mi respuesta",
      btnCorrectHint:
        "Marca al menos una F (finalización) en cada proceso del cronograma para poder corregir.",
      btnSolve: "Ver solución",
      btnWalk: "Explicación paso a paso",
      btnClear: "Limpiar",
      walkTitle: "Explicación paso a paso",
      walkPrev: "← Atrás",
      walkNext: "Siguiente →",
      walkPause: "Pausar",
      walkPlay: "Reproducir",
      walkRestart: "Reiniciar",
      walkStop: "Cerrar",
      walkSpeed: "Velocidad",
      walkIntro:
        "Vamos a montar la solución paso a paso. Fíjate en quién usa la CPU, cómo quedan los procesos en espera de CPU (abajo = el siguiente) y las marcas E / L / F.",
      walkTick:
        "En el instante t={t} la CPU atiende a {cpu}. Llegan: {arrivals}. Espera CPU (próximo → más lejos): {queue}.",
      walkTickIdle:
        "En el instante t={t} la CPU está libre (idle). Llegan: {arrivals}. Espera CPU: {queue}.",
      walkNoArrival: "ninguno",
      walkQueueEmpty: "(vacía)",
      walkFinish: "Marcamos las finalizaciones (F) y calculamos los tiempos de cada proceso.",
      walkMetrics:
        "Con todo terminado: tiempo medio de retorno = {avgR} · tiempo medio de espera = {avgE}. Repasa el patrón y pruébalo tú.",
      walkDone: "Hasta aquí la explicación. ¡Ahora te toca a ti!",
      guideTitle: "Solución guiada",
      guideHint: "Igual que en los ejercicios: vamos rellenando el cronograma instante a instante.",
      guideStart: "Comenzar",
      avgReturn: "T. med. retorno",
      avgWait: "T. med. espera",
      avgMeansLabel: "T. medios",
      chipE: "E Ejecución",
      chipL: "L En espera (llegó y espera CPU)",
      chipF: "F Finalizado",
      hintCells:
        "Clic en E/L/F: ciclar vacío→E→L→F · Espera CPU: clic en cada casilla cicla P1→P2→…→vacío (abajo = próximo a entrar)",
      queueHint: "Procesos en espera de CPU: casillas apiladas",
      queueStackHint: "↑ lejos · cerca ↓",
      queueNear: "próximo a entrar",
      queueFar: "más lejos en la cola",
      foot: "1º SMR · Sistemas Operativos Monopuesto — planificación de procesos · E / L / F + espera de CPU",
      colProcess: "Proceso",
      colBurst: "T. ejecución",
      colArrival: "T. llegada",
      colPriority: "Prioridad",
      colStart: "T. comienzo",
      colFinish: "T. finalización",
      colReturn: "T. retorno",
      colWait: "T. espera",
      tipReturn:
        "Tiempo de retorno = finalización − llegada. Solo coincide con la finalización cuando la llegada es 0; si el proceso llega más tarde, el retorno es menor que la finalización.",
      tipWait:
        "Tiempo de espera = tiempo de retorno − tiempo de ejecución. Es el tiempo que el proceso pasó en espera de CPU, sin usarla.",
      tipAvgReturn:
        "Media de los tiempos de retorno de todos los procesos del ejercicio.",
      tipAvgWait:
        "Media de los tiempos de espera de todos los procesos del ejercicio.",
      queue: "Espera CPU",
      solutionVisible: "Solución visible",
      processesUnit: "procesos",
      instantsUnit: "instantes",
      arrivalMark: "llegada",
      feedbackOkTitle: "¡Correcto! {score} / {max}",
      feedbackOkBody: "Cronograma, colas y tiempos cuadran con {algo}.",
      feedbackAlmost: "Nota: {score} / {max}",
      feedbackFail: "Nota: {score} / {max}",
      feedbackStats:
        "Celdas {okCells}/{totalCells} ({cellPct}%) · Colas {okQueues}/{totalQueues} ({queuePct}%) · Fallos de métricas: {metricErrors}",
      feedbackMore: "… y {n} más",
      gradeCrono:
        "Cronograma: {pts} / {max} — {ok}/{total} procesos bien (cada proceso vale {unit}; un solo error anula ese proceso).",
      gradeQueues:
        "Colas: {pts} / {max} — {ok}/{total} casillas obligatorias bien (solo se puntúan las que deben tener proceso; cada una vale {unit}).",
      gradeMetrics:
        "T. comienzo → T. espera: {pts} / {max} — {ok}/{total} columnas bien (cada columna vale {unit}; un dato erróneo anula la columna).",
      gradeAvgs:
        "T. medios: {pts} / {max} — retorno {retorno}, espera {espera} (cada media vale {unit}).",
      gradeOk: "correcto",
      gradeBad: "incorrecto",
      gradeFailedProcesses: "Procesos anulados: {list}.",
      gradeFailedInstants: "Instantes de cola anulados: {list}.",
      gradeFailedColumns: "Columnas anuladas: {list}.",
      gradeDetailsTitle: "Detalle de fallos",
      errCell: "{process} en t={time}: esperaba {expected}, hay {got}",
      errQueue: "Cola t={time} casilla {slot}: esperaba {expected}, hay {got}",
      errMetric: "{process} · {field}: esperaba {expected}, hay {got}",
      errAvg: "{field}: esperaba {expected}, hay {got}",
      empty: "(vacío)",
      solShownTitle: "Solución mostrada",
      solShownBody:
        "Revisa el patrón E/L/F y el orden de la cola. Genera otro ejercicio cuando quieras.",
      multiSolutionsNote:
        "Hay {n} soluciones equivalentes (empates de llegada u orden). Se ha aceptado/comparado con la que más se acerca a tu respuesta.",
      multiSolutionsReveal:
        "Este enunciado admite {n} soluciones equivalentes por empates (p. ej. varios procesos que llegan a la vez en Round Robin). Se muestra una de ellas (desempate por id: P1, P2…). Cualquiera coherente con el algoritmo es válida.",
      uniqueOk: "Ejercicio nuevo (sin repetir en esta sesión)",
      uniqueExhausted: "Se reinició el historial: ya se habían visto muchas variantes.",
      summaryTitle: "Resumen de algoritmos",
      fieldStart: "comienzo",
      fieldFinish: "finalización",
      fieldRetorno: "retorno",
      fieldEspera: "espera",
      fieldAvgRetorno: "T. med. retorno",
      fieldAvgEspera: "T. med. espera",
      miniAvg: "T. med. retorno {r} · T. med. espera {w}",
      algoNames: {
        fcfs: "FCFS / FIFO",
        sjf: "SJF",
        srtf: "SRTF",
        prioridad: "Prioridad",
        prioridad_ap: "Prioridad apr.",
        rr: "Round Robin",
      },
      algoFull: {
        fcfs:
          "FCFS / FIFO — First Come First Served / First In, First Out (el primero que llega / entra es el primero al que se atiende)",
        sjf: "SJF — Shortest Job First (primero el trabajo más corto)",
        srtf:
          "SRTF — Shortest Remaining Time First (primero el de menor tiempo restante)",
        prioridad: "Por prioridad (no apropiativo)",
        prioridad_ap: "Por prioridad (apropiativo)",
        rr: "Round Robin — turno rotatorio",
      },
      algoOptions: {
        fcfs: "FCFS / FIFO (First Come… — el primero que llega)",
        sjf: "SJF (Shortest Job First — el más corto)",
        srtf: "SRTF (Shortest Remaining… — el de menos restante)",
        prioridad_np: "Prioridad (no apropiativo)",
        prioridad: "Prioridad (apropiativo)",
        rr: "Round Robin (turno rotatorio)",
      },
    },
    en: {
      docTitle: "Process schedule · Single-user Operating Systems",
      docDesc:
        "Visual tutorial and exercise generator/checker for CPU scheduling algorithms (vocational IT · Single-user Operating Systems).",
      brand: "Process schedule",
      navIntro: "Home",
      navTutorial: "Tutorial",
      navExercise: "Exercises",
      navExam: "Test",
      navAria: "Sections",
      examTitle: "Test mode",
      examLead: "Load the test JSON and complete the exercises.",
      examHubCreate: "Create test",
      examHubCreateDesc: "Pick algorithms; the JSON stores the spec (random data is created when taking).",
      examHubTake: "Take test",
      examHubTakeDesc: "You will need the test key file provided by your teacher",
      examHubGrade: "Grade test",
      examHubGradeDesc: "Load the student submission (includes the statement) and get the score.",
      examCreateTitle: "Create test",
      examTakeTitle: "Take test",
      examGradeTitle: "Grade test",
      examBack: "← Back",
      examTitleLabel: "Title (optional)",
      examDateLabel: "Test date",
      examCountLabel: "Number of exercises",
      examCreateBuild: "Generate JSON",
      examCreateDownload: "Download JSON",
      examLoadLabel: "Test key file.",
      examTakeDropHint: "Drop the file here or click to choose it.",
      examTakeLoading: "Validating file…",
      examAnswersLabel: "Student submission (.json)",
      examGradeHint:
        "Load only the JSON the student downloaded on finish: it includes statement and answers.",
      examTakeStart: "Start test",
      examTakeBegin: "Start",
      examTakeReadyCount: "This test has {n} exercises.",
      examTakeReady: "Test loaded: {n} exercises.",
      examTakeBad: "Invalid test JSON.",
      examKeyErrorOk: "Got it",
      examKeyErrorFormatTitle: "Invalid file",
      examKeyErrorFormatBody:
        "This file is not a recognized test key. Ask your teacher for the correct file.",
      examKeyErrorIntegrityTitle: "Integrity error",
      examKeyErrorIntegrityBody:
        "The test key file has been modified or is corrupt. The test cannot start. Ask your teacher for a new file.",
      examKeyErrorDateTitle: "Date error",
      examKeyErrorDateBody:
        "This test is not authorized for today. It can only be opened on the test date set by your teacher.",
      examFsWarning: "You must stay in fullscreen during the test.",
      examFsReenter: "Return to fullscreen",
      examGradeRun: "Grade",
      examGradeDownload: "Download JSON report",
      examGradePdf: "Download PDF",
      examGradePdfError: "Could not generate the PDF.",
      examGradeNeedFiles: "Load the student submission (.json).",
      examPdfCoverSubtitle: "Grading report",
      examPdfPerExercise: "Score per exercise",
      examPdfAverage: "Average score",
      examPdfUntitledFile: "submission.json",
      examPdfCrono: "Schedule",
      examPdfQueues: "Queues",
      examPdfMetrics: "Times",
      examPdfAverages: "Averages",
      examPdfTotal: "Total",
      examPdfCronograma: "Schedule (student answer)",
      examPdfQueuesTitle: "Waiting CPU",
      examPdfStatement: "Statement",
      examPdfAlgo: "Algorithm",
      examPdfQuantum: "Quantum",
      examPdfProcess: "Process",
      examPdfArrival: "Arrival",
      examPdfBurst: "Burst",
      examPdfPriority: "Priority",
      examPdfStudentName: "Student",
      examStudentNameLabel: "Full name",
      examStudentNameRequired: "Enter your full name to start.",
      examPdfMetricsTitle: "Times table",
      examPdfStart: "Start",
      examPdfFinish: "Finish",
      examPdfRetorno: "Turnaround",
      examPdfEspera: "Waiting",
      examPdfAvg: "Avg",
      examPdfLegendOk: "Correct",
      examPdfLegendBad: "Incorrect",
      examPdfMissingStatement: "No statement in the submission.",
      examPdfContinued: "continued",
      examGradeTampered:
        "WARNING: tampering detected in the submission file. Contents do not match the original generated when finishing the test.",
      examGradeSealMissing:
        "WARNING: this submission has no integrity code (old or incomplete file). It cannot be guaranteed that it was not modified.",
      examGradeTitleLine: "Test: {title}",
      examGradeSummary: "Total score: {total} / {max} (average {avg} / 10)",
      examGradeItem: "{id} · {algo}: {score} / {max}",
      examBarTitle: "Test",
      examPrev: "← Previous",
      examNext: "Next →",
      examFinish: "Finish test",
      examFinishTitle: "Finish test",
      examFinishConfirm:
        "Are you sure you want to finish? Your answers JSON will be downloaded and you will not be able to keep editing.",
      examFinishYes: "Yes, finish",
      examFinishNo: "No, continue",
      examFinishCodeHint:
        "To confirm, type this 3-digit code exactly: {code}",
      examFinishCodeLabel: "Confirmation code",
      examFinishCodeError: "The code does not match. Try again.",
      examFinishConfirmCode: "Confirm and download",
      examFsReportTitle: "Fullscreen tracking",
      examFsReportSummary:
        "Entries: {enters} · Exits: {exits} · Time in fullscreen: {fs}s · Time windowed: {win}s",
      examFsReportNone: "This answers JSON has no fullscreen tracking data.",
      examFsReportSegment: "{state}: {from} → {to} ({sec}s)",
      examFsStateFullscreen: "fullscreen",
      examFsStateWindowed: "windowed",
      examSolveTitle: "Test in progress",
      examToolbarHint:
        "Fill the chart, queue and times. Use the bottom bar to switch exercises or finish.",
      examRowAlgo: "Algorithm",
      examRowMode: "Generation",
      examModeRandom: "Random",
      examModeParams: "Process count / quantum",
      examRowCount: "Processes",
      examRowQuantum: "Quantum",
      heroKicker: "Vocational IT · Single-user Operating Systems",
      heroTitle: "Process schedule",
      heroLead:
        "Friendly comics show how the CPU scheduler lines up processes — FCFS, SJF, SRTF, priority and Round Robin (with each name expanded) — then you practise the chart with a built-in checker.",
      heroAlt: "Comic illustration: the CPU conducts the process orchestra",
      btnStartTutorial: "Start tutorial",
      btnSkipExercise: "Go to exercises",
      btnPrev: "← Previous",
      btnNext: "Next →",
      btnNextExercise: "Go to exercises →",
      exTitle: "Generator · checker",
      labelAlgo: "Algorithm to solve",
      labelQuantum: "Quantum",
      algoHint: "Pick a scheduling type and generate a new exercise (no repeats this session).",
      btnExample: "Sample exercise",
      btnRandom: "Generate new",
      genModalTitle: "Generate exercise",
      genTabParams: "Parameters",
      genTabSeed: "Seed",
      genCountLabel: "Number of processes",
      genQuantumLabel: "Quantum",
      genParamsHint:
        "The rest of the exercise (arrivals, execution times, priorities) is generated at random.",
      genSeedLabel: "Seed (up to 6 digits)",
      genSeedHint:
        "Same seed + same algorithm = same exercise. The seed sets the process count and quantum (when applicable).",
      genSeedPreview: "With this seed: {count} processes{quantum}.",
      genSeedPreviewQ: ", quantum {q}",
      genCancel: "Cancel",
      genConfirm: "Generate",
      genSeedInvalid: "Enter a numeric seed (up to 6 digits).",
      btnCorrect: "Check my answer",
      btnCorrectHint:
        "Mark at least one F (finish) on each process in the schedule chart before checking.",
      btnSolve: "Show solution",
      btnWalk: "Step-by-step explanation",
      btnClear: "Clear",
      walkTitle: "Step-by-step explanation",
      walkPrev: "← Back",
      walkNext: "Next →",
      walkPause: "Pause",
      walkPlay: "Play",
      walkRestart: "Restart",
      walkStop: "Close",
      walkSpeed: "Speed",
      walkIntro:
        "We'll build the solution step by step. Watch who uses the CPU, which processes are waiting for the CPU (bottom = next) and the E / L / F marks.",
      walkTick:
        "At time t={t} the CPU runs {cpu}. Arrivals: {arrivals}. Waiting for CPU (next → furthest): {queue}.",
      walkTickIdle:
        "At time t={t} the CPU is idle. Arrivals: {arrivals}. Waiting for CPU: {queue}.",
      walkNoArrival: "none",
      walkQueueEmpty: "(empty)",
      walkFinish: "We mark finishes (F) and fill in each process's times.",
      walkMetrics:
        "All done: average turnaround = {avgR} · average waiting = {avgE}. Review the pattern and try it yourself.",
      walkDone: "That's the walkthrough. Now it's your turn!",
      guideTitle: "Guided solution",
      guideHint: "Just like in the exercises: we fill the schedule one time unit at a time.",
      guideStart: "Start",
      avgReturn: "Avg. turnaround",
      avgWait: "Avg. waiting",
      avgMeansLabel: "Avg. times",
      chipE: "E Execution",
      chipL: "L Waiting (arrived, waiting for CPU)",
      chipF: "F Finished",
      hintCells:
        "Click E/L/F: cycle empty→E→L→F · Waiting for CPU: click each slot to cycle P1→P2→…→empty (bottom = next to enter)",
      queueHint: "Processes waiting for the CPU: stacked slots",
      queueStackHint: "↑ far · near ↓",
      queueNear: "next to enter",
      queueFar: "further back in the queue",
      foot: "Vocational IT · Single-user Operating Systems — CPU scheduling · E / L / F + waiting for CPU",
      colProcess: "Process",
      colBurst: "Exec. time",
      colArrival: "Arrival",
      colPriority: "Priority",
      colStart: "Start",
      colFinish: "Finish",
      colReturn: "Turnaround",
      colWait: "Waiting",
      tipReturn:
        "Turnaround = finish − arrival. It equals finish only when arrival is 0; if the process arrives later, turnaround is smaller than finish.",
      tipWait:
        "Waiting time = turnaround − execution time. Time spent waiting for the CPU without using it.",
      tipAvgReturn: "Average of all processes' turnaround times in this exercise.",
      tipAvgWait: "Average of all processes' waiting times in this exercise.",
      queue: "Waiting CPU",
      solutionVisible: "Solution visible",
      processesUnit: "processes",
      instantsUnit: "time slots",
      arrivalMark: "arrival",
      feedbackOkTitle: "Correct! {score} / {max}",
      feedbackOkBody: "Timeline, queues and times match {algo}.",
      feedbackAlmost: "Score: {score} / {max}",
      feedbackFail: "Score: {score} / {max}",
      feedbackStats:
        "Cells {okCells}/{totalCells} ({cellPct}%) · Queues {okQueues}/{totalQueues} ({queuePct}%) · Metric errors: {metricErrors}",
      feedbackMore: "… and {n} more",
      gradeCrono:
        "Schedule chart: {pts} / {max} — {ok}/{total} processes OK (each process is worth {unit}; one error voids that process).",
      gradeQueues:
        "Queues: {pts} / {max} — {ok}/{total} required cells OK (only cells that must hold a process are scored; each is worth {unit}).",
      gradeMetrics:
        "Start → waiting times: {pts} / {max} — {ok}/{total} columns OK (each column is worth {unit}; one wrong value voids the column).",
      gradeAvgs:
        "Averages: {pts} / {max} — turnaround {retorno}, waiting {espera} (each average is worth {unit}).",
      gradeOk: "correct",
      gradeBad: "incorrect",
      gradeFailedProcesses: "Voided processes: {list}.",
      gradeFailedInstants: "Voided queue times: {list}.",
      gradeFailedColumns: "Voided columns: {list}.",
      gradeDetailsTitle: "Error details",
      errCell: "{process} at t={time}: expected {expected}, got {got}",
      errQueue: "Queue t={time} slot {slot}: expected {expected}, got {got}",
      errMetric: "{process} · {field}: expected {expected}, got {got}",
      errAvg: "{field}: expected {expected}, got {got}",
      empty: "(empty)",
      solShownTitle: "Solution shown",
      solShownBody:
        "Review the E/L/F pattern and queue order. Generate another exercise whenever you like.",
      multiSolutionsNote:
        "There are {n} equivalent solutions (arrival/order ties). Checked against the closest match to your answer.",
      multiSolutionsReveal:
        "This exercise has {n} equivalent solutions due to ties (e.g. several processes arriving together in Round Robin). One is shown (tie-break by id: P1, P2…). Any schedule consistent with the algorithm is valid.",
      uniqueOk: "New exercise (not repeated this session)",
      uniqueExhausted: "History reset: many variants had already been seen.",
      summaryTitle: "Algorithm summary",
      fieldStart: "start",
      fieldFinish: "finish",
      fieldRetorno: "turnaround",
      fieldEspera: "waiting",
      fieldAvgRetorno: "Avg. turnaround",
      fieldAvgEspera: "Avg. waiting",
      miniAvg: "Avg. turnaround {r} · Avg. waiting {w}",
      algoNames: {
        fcfs: "FCFS / FIFO",
        sjf: "SJF",
        srtf: "SRTF",
        prioridad: "Priority",
        prioridad_ap: "Priority (preemp.)",
        rr: "Round Robin",
      },
      algoFull: {
        fcfs:
          "FCFS / FIFO — First Come First Served / First In, First Out",
        sjf: "SJF — Shortest Job First",
        srtf: "SRTF — Shortest Remaining Time First",
        prioridad: "Priority (non-preemptive)",
        prioridad_ap: "Priority (preemptive)",
        rr: "Round Robin (rotating turns)",
      },
      algoOptions: {
        fcfs: "FCFS / FIFO (First Come First Served)",
        sjf: "SJF (Shortest Job First)",
        srtf: "SRTF (Shortest Remaining Time First)",
        prioridad_np: "Priority (non-preemptive)",
        prioridad: "Priority (preemptive)",
        rr: "Round Robin (rotating turns)",
      },
    },
  };

  const ART = {
    es: {
      intro: "assets/intro-hero-es.jpg",
      cronograma: "assets/panel-cronograma-es.jpg",
      leyenda: "assets/panel-leyenda-es.jpg",
      apropiativo: "assets/panel-apropiativo-es.jpg",
      resumen: "assets/panel-resumen-es.jpg",
      fcfs: "assets/panel-fcfs-es.jpg",
      sjf: "assets/panel-sjf-es.jpg",
      srtf: "assets/panel-srtf-es.jpg",
      prioridad: "assets/panel-prioridad-es.jpg",
      rr: "assets/panel-rr-es.jpg",
      practica: "assets/panel-practica-es.jpg",
    },
    en: {
      intro: "assets/intro-hero-en.jpg",
      cronograma: "assets/panel-cronograma-en.jpg",
      leyenda: "assets/panel-leyenda-en.jpg",
      apropiativo: "assets/panel-apropiativo-en.jpg",
      resumen: "assets/panel-resumen-en.jpg",
      fcfs: "assets/panel-fcfs-en.jpg",
      sjf: "assets/panel-sjf-en.jpg",
      srtf: "assets/panel-srtf-en.jpg",
      prioridad: "assets/panel-prioridad-en.jpg",
      rr: "assets/panel-rr-en.jpg",
      practica: "assets/panel-practica-en.jpg",
    },
  };

  function t(key, vars) {
    const lang = getLang();
    let s = STR[lang][key];
    if (s == null) s = STR.en[key] || key;
    if (vars && typeof s === "string") {
      Object.keys(vars).forEach((k) => {
        s = s.replace(new RegExp(`\\{${k}\\}`, "g"), String(vars[k]));
      });
    }
    return s;
  }

  function art(key) {
    const lang = getLang();
    return (ART[lang] && ART[lang][key]) || ART.en[key];
  }

  function algoName(id) {
    return t("algoNames")[id] || id;
  }

  function algoFull(id) {
    return t("algoFull")[id] || id;
  }

  /** Diapositivas del tutorial según idioma */
  function getSlides() {
    if (getLang() === "es") {
      return [
        {
          id: "intro",
          title: "¡La CPU es el director de orquesta!",
          lead: "El sistema operativo gestiona los procesos que la CPU irá ejecutando: solo puede «dirigir» a un proceso a la vez. El planificador decide el orden para que el sistema sea justo y eficiente.",
          artKey: "intro",
          bubble: "¡Yo dirijo quién toca!",
          chips: `
            <div class="chip-row chip-row--spread chip-row--top">
              <span class="chip">1º SMR · Sistemas Operativos Monopuesto</span>
              <span class="chip">Gestión de procesos</span>
            </div>
          `,
          body: `
            <p>Piensa en la CPU como quien lleva la batuta: hay varios «músicos» (procesos) y hay que decidir quién toca ahora. Antes de meternos en algoritmos, repasemos cuatro ideas básicas:</p>
            <div class="callout">El <strong>planificador</strong> es la política que usa el sistema operativo para elegir el siguiente proceso. En esta unidad practicarás varias políticas clásicas.</div>
            <ol class="steps">
              <li><strong>Proceso:</strong> un programa en marcha (P1, P2…). Es quien pide tiempo de CPU.</li>
              <li><strong>Tiempo de ejecución:</strong> cuánto necesita de CPU para terminar su trabajo.</li>
              <li><strong>Tiempo de llegada:</strong> en qué instante aparece en el sistema y se pone a la espera.</li>
              <li><strong>Procesos en espera de CPU:</strong> los que ya llegaron y esperan su turno.</li>
            </ol>
            <div class="callout-warn" role="note">
              <span class="callout-warn__icon" aria-hidden="true">!</span>
              <div class="callout-warn__body">En estos ejercicios <strong>simplificamos</strong>: imaginamos una sola CPU que ejecuta un proceso cada vez. En un PC real puede haber varios núcleos, y cada uno atiende a un proceso a la vez.</div>
            </div>
          `,
        },
        {
          id: "cronograma",
          title: "¿Qué es un cronograma?",
          lead: "El cronograma es la herramienta con la que veremos cómo el sistema operativo coordina el envío de procesos a la CPU: en cada instante queda claro quién la usa, quién espera y quién ya terminó.",
          artKey: "cronograma",
          bubble: "Cada casilla es un instante",
          body: `
            <p>El cronograma se parece a una tabla o a un diagrama de Gantt sencillo:</p>
            <ol class="steps">
              <li>Cada <strong>fila</strong> es un proceso (P1, P2…).</li>
              <li>Cada <strong>columna</strong> es una unidad de tiempo (t = 0, 1, 2…).</li>
              <li>En cada casilla anotas qué ocurre: ejecución, espera o fin.</li>
              <li>Debajo suelen ir los <strong>procesos en espera de CPU</strong>: quién está esperando y en qué orden.</li>
            </ol>
            <div class="callout">Si entiendes el cronograma, entiendes el algoritmo: no hace falta memorizar, simplemente entender cómo funciona cada algoritmo.</div>
          `,
        },
        {
          id: "leyenda",
          title: "Cómo rellenar un cronograma (E, L y F)",
          lead: "Con tres letras (E, L y F) cuentas toda la historia de cada proceso en el tiempo.",
          artKey: "leyenda",
          bubble: "E ejecuta · L espera · F termina",
          body: `
            <div class="chip-row">
              <span class="chip e">E Ejecución</span>
              <span class="chip l">L En espera (llegó y espera CPU)</span>
              <span class="chip f">F Finalizado</span>
            </div>
            <ol class="steps">
              <li><strong>E</strong> (<em>Execution</em>): el proceso está usando la CPU en ese instante.</li>
              <li><strong>L</strong> (<em>Waiting / ready</em>): ya llegó, está en el sistema, pero espera CPU (procesos en espera de CPU).</li>
              <li><strong>F</strong> (<em>Finished</em>): acaba de terminar; se marca en el instante de fin (justo después de su última E).</li>
              <li>En la fila <strong>Cola</strong>, las casillas apiladas muestran el orden: <em>abajo = próximo a entrar</em>, arriba = más lejos. Un clic cicla P1 → P2 → … → vacío.</li>
              <li>Al final calculas <em>retorno = fin − llegada</em> y <em>espera = retorno − tiempo de ejecución</em>.</li>
            </ol>
            <div class="callout">La <strong>L</strong> indica que el proceso <strong>ya ha llegado</strong> y está en el sistema, aunque todavía no use la CPU. El instante en que aparece lo miras en la columna <em>T. llegada</em> de la tabla de procesos.</div>
          `,
        },
        {
          id: "apropiativo",
          title: "¿Se puede interrumpir? Apropiativo y no apropiativo",
          lead: "Esta idea aparece en casi todos los algoritmos. Vale la pena detenerse un momento.",
          artKey: "apropiativo",
          bubble: "¿Dejo terminar o cambio?",
          body: `
            <p>Imagina que un proceso ya está «tocando» (usando la CPU) y llega otro candidato. ¿Qué hace el planificador?</p>
            <ol class="steps">
              <li><strong>No apropiativo:</strong> deja que el actual termine su tiempo de ejecución. Nadie le quita la CPU a mitad. Es más simple de seguir… y a veces más lento para los demás.</li>
              <li><strong>Apropiativo:</strong> si el recién llegado «merece» más (más corto, mejor prioridad…), <em>desaloja</em> al actual. El interrumpido vuelve a la cola con L y más adelante seguirá.</li>
            </ol>
            <div class="callout"><strong>Truco visual:</strong> si en el cronograma un proceso pasa de E a L sin haber terminado (sin F), casi seguro estás ante una versión <strong>apropiativa</strong>.</div>
          `,
        },
        {
          id: "resumen",
          title: "Mapa de algoritmos",
          lead: "Estas son las políticas que practicarás. Las siglas vienen del inglés; debajo de cada una verás qué significan y cómo se entienden en español.",
          artKey: "resumen",
          bubble: "Elige el estilo de gestión",
          body: `
            <div class="summary-grid">
              <article class="summary-card">
                <h3>FCFS / FIFO</h3>
                <p><strong>FCFS</strong> = <em>First Come First Served</em> (el primero que llega es el primero al que se atiende).<br>
                <strong>FIFO</strong> = <em>First In, First Out</em> (primero en entrar, primero en salir). Misma idea: como la cola del pan.</p>
                <p class="summary-card__mode"><strong>No apropiativo</strong></p>
              </article>
              <article class="summary-card">
                <h3>SJF</h3>
                <p><strong>SJF</strong> = <em>Shortest Job First</em> (primero el trabajo más corto). Entre los que esperan CPU, gana el de menor tiempo de ejecución.</p>
                <p class="summary-card__mode"><strong>No apropiativo</strong></p>
              </article>
              <article class="summary-card">
                <h3>SRTF</h3>
                <p><strong>SRTF</strong> = <em>Shortest Remaining Time First</em> (primero el de menor tiempo restante). Versión apropiativa del SJF: si llega uno con menos restante, cambia.</p>
                <p class="summary-card__mode"><strong>Apropiativo</strong></p>
              </article>
              <article class="summary-card">
                <h3>Prioridad</h3>
                <p>Gana el de mejor prioridad (aquí: número más bajo).</p>
                <p class="summary-card__mode"><strong>Puede ser no apropiativo o apropiativo</strong></p>
              </article>
              <article class="summary-card">
                <h3>Round Robin</h3>
                <p><strong>Round Robin</strong> = turno rotatorio. Cada uno recibe un <em>quantum</em> (porción de tiempo) y, si no termina, vuelve al final de la cola.</p>
                <p class="summary-card__mode"><strong>Apropiativo</strong> (por el quantum)</p>
              </article>
            </div>
          `,
        },
        {
          id: "fcfs",
          title: "FCFS / FIFO — El primero que llega",
          lead: "FCFS = First Come First Served (el primero que llega es el primero al que se atiende). FIFO = First In, First Out (primero en entrar, primero en salir). Sin interrupciones.",
          artKey: "fcfs",
          bubble: "¡Por orden de llegada!",
          algo: "fcfs",
          body: `
            <p>Es el planificador más intuitivo: quien llegó antes, entra antes.</p>
            <ol class="steps">
              <li>Cuando la CPU queda libre, elige el proceso en espera de CPU con <strong>menor tiempo de llegada</strong>.</li>
              <li>Ese proceso corre hasta terminar (<strong>no apropiativo</strong>).</li>
              <li>La cola se ordena por llegada (FIFO: primero en entrar, primero en salir).</li>
            </ol>
            <div class="callout"><strong>Ojo:</strong> si al principio hay un proceso muy largo, todos los demás esperan detrás. A eso se le llama <em>efecto convoy</em>.</div>
            <div id="demo-fcfs" class="tutorial-guide" data-guide-algo="fcfs"></div>
          `,
        },
        {
          id: "sjf",
          title: "SJF — Primero el más corto",
          lead: "SJF = Shortest Job First (primero el trabajo más corto): entre quienes ya esperan CPU, pasa antes el de menor tiempo de ejecución.",
          artKey: "sjf",
          bubble: "¡Los cortos pasan antes!",
          algo: "sjf",
          body: `
            <p>La idea es reducir esperas: los trabajos breves no se quedan atrapados detrás de uno enorme… siempre que ya hayan llegado.</p>
            <ol class="steps">
              <li>Al liberar la CPU, mira los procesos en espera de CPU.</li>
              <li>Elige el de <strong>menor tiempo de ejecución</strong>.</li>
              <li>Si hay empate, suele ganar quien llegó antes.</li>
            </ol>
            <div class="callout">Baja el tiempo medio de espera, pero hace falta <strong>conocer (o estimar) el tiempo de ejecución</strong> de antemano.</div>
            <div class="callout"><strong>No apropiativo:</strong> una vez que un proceso entra en la CPU, corre hasta terminar. Nadie le quita el turno a mitad.</div>
            <div id="demo-sjf" class="tutorial-guide" data-guide-algo="sjf"></div>
          `,
        },
        {
          id: "srtf",
          title: "SRTF — Primero el de menor tiempo restante",
          lead: "SRTF = Shortest Remaining Time First (primero el de menor tiempo restante). Es el SJF en versión apropiativa: si llega alguien con menos restante, se lleva la CPU.",
          artKey: "srtf",
          bubble: "¡Cambio! Te queda menos",
          algo: "srtf",
          body: `
            <p>Aquí el planificador no espera a que termine el actual: compara el <em>tiempo que queda</em> en cada instante (por eso «Remaining Time» = tiempo restante).</p>
            <ol class="steps">
              <li>En cada instante se mira el <strong>tiempo restante</strong> de quien está en CPU y de los que esperan CPU.</li>
              <li>Si un recién llegado tiene menos restante → <strong>apropiación</strong> (cambio).</li>
              <li>El desalojado vuelve a la cola con L: sigue en el sistema, solo espera su momento.</li>
            </ol>
            <div class="callout">En el cronograma verás trozos de <strong>E</strong> intercalados con <strong>L</strong> en el mismo proceso: esa es la huella de la interrupción.</div>
            <div id="demo-srtf" class="tutorial-guide" data-guide-algo="srtf"></div>
          `,
        },
        {
          id: "prioridad_np",
          title: "Prioridad no apropiativa — Quien más urge, primero",
          lead: "Cada proceso lleva un número de prioridad. En nuestros ejercicios: número más bajo = más prioritario. En esta variante, el proceso en CPU termina su trabajo sin interrupciones.",
          artKey: "prioridad",
          bubble: "Prioridad 1 pasa antes que 2",
          algo: "prioridad",
          body: `
            <p>Útil cuando algunos trabajos son más urgentes que otros (por ejemplo, tareas del sistema frente a una descarga).</p>
            <ol class="steps">
              <li>Al liberar la CPU, elige el de <strong>mejor prioridad</strong> entre los que esperan CPU.</li>
              <li>Ese proceso corre hasta terminar: <strong>no apropiativo</strong>.</li>
              <li>Empates: suele usarse el orden de llegada (FIFO = First In, First Out — primero en entrar, primero en salir).</li>
            </ol>
            <div class="callout">Si llega uno con mejor prioridad mientras otro está en E, <strong>espera con L</strong> hasta que la CPU quede libre.</div>
            <div id="demo-prioridad_np" class="tutorial-guide" data-guide-algo="prioridad"></div>
          `,
        },
        {
          id: "prioridad_ap",
          title: "Prioridad apropiativa — Puede desalojar",
          lead: "Misma regla de prioridad (número más bajo = más urgente), pero ahora un recién llegado con mejor prioridad puede quitarle la CPU al actual.",
          artKey: "prioridad",
          bubble: "¡Mejor prioridad! Cambio",
          algo: "prioridad_ap",
          body: `
            <p>La elección sigue siendo «gana el de mejor prioridad»; lo que cambia es el momento: se puede reevaluar en cada llegada.</p>
            <ol class="steps">
              <li>Si llega un proceso con <strong>mejor prioridad</strong> que el que está en CPU → <strong>apropiación</strong>.</li>
              <li>El desalojado vuelve a la espera de CPU con L y continuará más adelante.</li>
              <li>Empates: suele usarse el orden de llegada (FIFO).</li>
            </ol>
            <div class="callout">En el cronograma verás un paso de <strong>E → L</strong> sin F: huella típica de la versión apropiativa. En los ejercicios puedes elegir las dos variantes.</div>
            <div id="demo-prioridad_ap" class="tutorial-guide" data-guide-algo="prioridad_ap"></div>
          `,
        },
        {
          id: "rr",
          title: "Round Robin — Turno rotatorio",
          lead: "Round Robin significa turno rotatorio: todos reciben un quantum (una porción de tiempo). Si no terminan, vuelven al final de la cola.",
          artKey: "rr",
          bubble: "Quantum… ¡siguiente!",
          algo: "rr",
          body: `
            <p>Es el planificador típico de sistemas interactivos: nadie se queda con la CPU demasiado rato.</p>
            <ol class="steps">
              <li>Los procesos en espera de CPU se ordenan en FIFO (First In, First Out — primero en entrar, primero en salir).</li>
              <li>Cada proceso corre como máximo <strong>quantum</strong> unidades seguidas.</li>
              <li>Si no terminó, sale a la cola y entra el siguiente.</li>
              <li>Los que llegan nuevos se encolan al final (mientras esperan: márcalos con L).</li>
            </ol>
            <div class="callout">Un quantum pequeño da más «reparto justo» pero más cambios de contexto; uno grande se parece más a FCFS (First Come First Served — el primero que llega).</div>
            <div id="demo-rr" class="tutorial-guide" data-guide-algo="rr"></div>
          `,
        },
        {
          id: "practica",
          title: "¡Ahora te toca practicar!",
          lead: "Elige el algoritmo, genera un ejercicio (sin repetir en la sesión) y comprueba tu respuesta con el corrector.",
          artKey: "practica",
          bubble: "Tu turno: rellena el cronograma",
          body: `
            <ol class="steps">
              <li>Elige qué tipo de planificación quieres resolver.</li>
              <li>Pulsa <strong>Generar nuevo</strong> (o prueba el ejemplo fijo).</li>
              <li>Rellena las celdas E/L/F, la cola y los tiempos.</li>
              <li>Pulsa <strong>Corregir mi respuesta</strong>: verás aciertos parciales y dónde está cada fallo.</li>
            </ol>
            <div class="callout">Recuerda: prioridad con número más bajo = más urgente. La F se marca en el instante de fin. Si te atascas, usa la explicación paso a paso.</div>
          `,
        },
      ];
    }

    return [
      {
        id: "intro",
        title: "The CPU is the orchestra conductor!",
        lead: "The operating system manages the processes the CPU will run: it can «lead» only one process at a time. The scheduler chooses the order so the system stays fair and efficient.",
        artKey: "intro",
        bubble: "I decide who plays!",
        chips: `
          <div class="chip-row chip-row--spread chip-row--top">
            <span class="chip">Vocational IT · Single-user Operating Systems</span>
            <span class="chip">Process management</span>
          </div>
        `,
        body: `
          <p>Picture the CPU holding the baton: several «musicians» (processes) are waiting, and someone must decide who plays now. Before the algorithms, four basic ideas:</p>
          <div class="callout">The <strong>scheduler</strong> is the policy the operating system uses to pick the next process. In this unit you will practise several classic policies.</div>
          <ol class="steps">
            <li><strong>Process:</strong> a running program (P1, P2…) asking for CPU time.</li>
            <li><strong>Execution time:</strong> how much CPU it needs to finish its work.</li>
            <li><strong>Arrival time:</strong> when it appears in the system and starts waiting.</li>
            <li><strong>Processes waiting for the CPU:</strong> those that have arrived and wait their turn.</li>
          </ol>
          <div class="callout-warn" role="note">
            <span class="callout-warn__icon" aria-hidden="true">!</span>
            <div class="callout-warn__body">In these exercises we <strong>simplify</strong>: we picture a single CPU that runs one process at a time. A real PC may have several cores, and each core runs one process at a time.</div>
          </div>
        `,
      },
      {
        id: "cronograma",
        title: "What is a schedule chart?",
        lead: "The schedule chart is the tool we use to see how the operating system coordinates sending processes to the CPU: at every instant you see who uses it, who waits and who is done.",
        artKey: "cronograma",
        bubble: "Each cell is one time unit",
        body: `
          <p>The schedule chart looks like a simple table or Gantt diagram:</p>
          <ol class="steps">
            <li>Each <strong>row</strong> is a process (P1, P2…).</li>
            <li>Each <strong>column</strong> is one time unit (t = 0, 1, 2…).</li>
            <li>In each cell you mark what happens: running, waiting or finished.</li>
            <li>Below you usually find the <strong>processes waiting for the CPU</strong>: who is waiting and in which order.</li>
          </ol>
          <div class="callout">If you understand the chart, you understand the algorithm: no need to memorise — just understand how each algorithm works.</div>
        `,
      },
      {
        id: "leyenda",
        title: "How to fill a schedule chart (E, L and F)",
        lead: "With three letters (E, L and F) you tell the whole story of each process over time.",
        artKey: "leyenda",
        bubble: "E runs · L waits · F finishes",
        body: `
          <div class="chip-row">
            <span class="chip e">E Execution</span>
            <span class="chip l">L Waiting (arrived, waiting for CPU)</span>
            <span class="chip f">F Finished</span>
          </div>
          <ol class="steps">
            <li><strong>E</strong> (Execution): the process is using the CPU at that instant.</li>
            <li><strong>L</strong> (Waiting / ready): it has arrived and is waiting for the CPU.</li>
            <li><strong>F</strong> (Finished): it just finished; mark it at the finish instant (right after its last E).</li>
            <li>In the <strong>Queue</strong> row, stacked slots show order: <em>bottom = next to enter</em>, top = furthest. A click cycles P1 → P2 → … → empty.</li>
            <li>Finally compute <em>turnaround = finish − arrival</em> and <em>waiting = turnaround − execution time</em>.</li>
          </ol>
          <div class="callout"><strong>L</strong> means the process <strong>has already arrived</strong> and is in the system, even if it is not using the CPU yet. The exact arrival instant is in the <em>Arrival time</em> column of the process table.</div>
        `,
      },
      {
        id: "apropiativo",
        title: "Can it be interrupted? Preemptive vs non-preemptive",
        lead: "This idea shows up in almost every algorithm. Worth a short stop.",
        artKey: "apropiativo",
        bubble: "Finish or switch?",
        body: `
          <p>A process is already «playing» (using the CPU) and another candidate arrives. What does the scheduler do?</p>
          <ol class="steps">
            <li><strong>Non-preemptive:</strong> let the current process finish its execution time. Nobody steals the CPU mid-way. Simpler to follow… sometimes slower for others.</li>
            <li><strong>Preemptive:</strong> if the newcomer «deserves» it more (shorter, better priority…), it <em>displaces</em> the current one. The interrupted process goes back to the queue with L and continues later.</li>
          </ol>
          <div class="callout"><strong>Visual tip:</strong> if a process goes from E to L without finishing (no F yet), you are almost certainly looking at a <strong>preemptive</strong> policy.</div>
        `,
      },
      {
        id: "resumen",
        title: "Algorithm map",
        lead: "These are the policies you will practise. Each name is an acronym (or English phrase) — expanded below.",
        artKey: "resumen",
        bubble: "Pick a scheduling style",
        body: `
          <div class="summary-grid">
            <article class="summary-card">
              <h3>FCFS / FIFO</h3>
              <p><strong>FCFS</strong> = <em>First Come First Served</em>.<br>
              <strong>FIFO</strong> = <em>First In, First Out</em>. Same idea: bakery-queue order.</p>
              <p class="summary-card__mode"><strong>Non-preemptive</strong></p>
            </article>
            <article class="summary-card">
              <h3>SJF</h3>
              <p><strong>SJF</strong> = <em>Shortest Job First</em>. Among processes waiting for the CPU, the shortest execution time wins.</p>
              <p class="summary-card__mode"><strong>Non-preemptive</strong></p>
            </article>
            <article class="summary-card">
              <h3>SRTF</h3>
              <p><strong>SRTF</strong> = <em>Shortest Remaining Time First</em>. Preemptive SJF: a newcomer with less remaining time takes over.</p>
              <p class="summary-card__mode"><strong>Preemptive</strong></p>
            </article>
            <article class="summary-card">
              <h3>Priority</h3>
              <p>Best priority wins (here: lower number = higher priority).</p>
              <p class="summary-card__mode"><strong>Can be non-preemptive or preemptive</strong></p>
            </article>
            <article class="summary-card">
              <h3>Round Robin</h3>
              <p><strong>Round Robin</strong> = rotating turns. Everyone gets a fixed <em>quantum</em>; if not done, they go to the back of the queue.</p>
              <p class="summary-card__mode"><strong>Preemptive</strong> (via the quantum)</p>
            </article>
          </div>
        `,
      },
      {
        id: "fcfs",
        title: "FCFS / FIFO — First Come First Served",
        lead: "FCFS = First Come First Served. FIFO = First In, First Out. No interruptions.",
        artKey: "fcfs",
        bubble: "By arrival order!",
        algo: "fcfs",
        body: `
          <p>The most intuitive scheduler: whoever arrived first runs first.</p>
          <ol class="steps">
            <li>When the CPU is free, pick the process waiting for the CPU with the <strong>earliest arrival</strong>.</li>
            <li>That process runs until it finishes (<strong>non-preemptive</strong>).</li>
            <li>Processes waiting for the CPU are ordered by arrival (FIFO: First In, First Out).</li>
          </ol>
          <div class="callout"><strong>Watch out:</strong> a long job at the front makes everyone wait (the <em>convoy effect</em>).</div>
          <div id="demo-fcfs" class="tutorial-guide" data-guide-algo="fcfs"></div>
        `,
      },
      {
        id: "sjf",
        title: "SJF — Shortest Job First",
        lead: "SJF = Shortest Job First: among processes already waiting for the CPU, the one with the shortest execution time goes first.",
        artKey: "sjf",
        bubble: "Short jobs go first!",
        algo: "sjf",
        body: `
          <p>The goal is shorter waiting: brief jobs are not stuck forever behind a huge one — as long as they have already arrived.</p>
          <ol class="steps">
            <li>When the CPU frees up, look at the processes waiting for the CPU.</li>
            <li>Pick the smallest <strong>execution time</strong>.</li>
            <li>Ties: usually earlier arrival wins.</li>
          </ol>
          <div class="callout">It lowers average waiting time, but you must <strong>know (or estimate) the execution time</strong> beforehand.</div>
          <div class="callout"><strong>Non-preemptive:</strong> once a process enters the CPU, it runs until it finishes. Nobody steals its turn mid-way.</div>
          <div id="demo-sjf" class="tutorial-guide" data-guide-algo="sjf"></div>
        `,
      },
      {
        id: "srtf",
        title: "SRTF — Shortest Remaining Time First",
        lead: "SRTF = Shortest Remaining Time First. It is preemptive SJF: if someone arrives with less remaining time, they take the CPU.",
        artKey: "srtf",
        bubble: "Switch! You have less left",
        algo: "srtf",
        body: `
          <p>The scheduler does not wait for the current job to finish: it compares <em>remaining time</em> at every instant (that is what the «R» in SRTF stands for).</p>
          <ol class="steps">
            <li>At every instant, compare <strong>remaining time</strong> of the running job and those waiting for the CPU.</li>
            <li>A newcomer with less remaining time → <strong>preemption</strong> (switch).</li>
            <li>The displaced process goes back to the queue with L and continues later.</li>
          </ol>
          <div class="callout">On the chart you will see chunks of <strong>E</strong> interleaved with <strong>L</strong> on the same process: that is the fingerprint of an interrupt.</div>
          <div id="demo-srtf" class="tutorial-guide" data-guide-algo="srtf"></div>
        `,
      },
      {
        id: "prioridad_np",
        title: "Non-preemptive priority — Most urgent first",
        lead: "Each process has a priority number. In our exercises: lower number = higher priority. In this variant, the process on the CPU finishes without being interrupted.",
        artKey: "prioridad",
        bubble: "Priority 1 before 2",
        algo: "prioridad",
        body: `
          <p>Useful when some jobs are more urgent than others (for example system work versus a download).</p>
          <ol class="steps">
            <li>When the CPU frees, pick the <strong>best priority</strong> among those waiting for the CPU.</li>
            <li>That process runs until it finishes: <strong>non-preemptive</strong>.</li>
            <li>Ties: usually arrival order (FIFO = First In, First Out).</li>
          </ol>
          <div class="callout">If a better-priority process arrives while another is in E, it <strong>waits with L</strong> until the CPU is free.</div>
          <div id="demo-prioridad_np" class="tutorial-guide" data-guide-algo="prioridad"></div>
        `,
      },
      {
        id: "prioridad_ap",
        title: "Preemptive priority — Can kick out",
        lead: "Same priority rule (lower number = more urgent), but now a newcomer with better priority can take the CPU from the current process.",
        artKey: "prioridad",
        bubble: "Better priority! Switch",
        algo: "prioridad_ap",
        body: `
          <p>Selection is still «best priority wins»; what changes is timing: it can be re-checked on every arrival.</p>
          <ol class="steps">
            <li>If a process arrives with <strong>better priority</strong> than the one on the CPU → <strong>preemption</strong>.</li>
            <li>The displaced process goes back to waiting for the CPU with L and continues later.</li>
            <li>Ties: usually arrival order (FIFO).</li>
          </ol>
          <div class="callout">On the chart you will see <strong>E → L</strong> without an F: the fingerprint of the preemptive version. In the exercises you can choose either variant.</div>
          <div id="demo-prioridad_ap" class="tutorial-guide" data-guide-algo="prioridad_ap"></div>
        `,
      },
      {
        id: "rr",
        title: "Round Robin — Rotating turns",
        lead: "Round Robin means rotating turns: everyone gets a quantum (a time slice). If they are not done, they go to the back of the queue.",
        artKey: "rr",
        bubble: "Quantum… next!",
        algo: "rr",
        body: `
          <p>Typical for interactive systems: nobody keeps the CPU for too long.</p>
          <ol class="steps">
            <li>Processes waiting for the CPU are ordered as FIFO (First In, First Out).</li>
            <li>A process runs for at most <strong>quantum</strong> units in a row.</li>
            <li>If it is not done, it rejoins the queue and the next one runs.</li>
            <li>New arrivals join the end (mark waiting with L).</li>
          </ol>
          <div class="callout">A small quantum feels fairer but causes more context switches; a large one starts to look like FCFS (First Come First Served).</div>
          <div id="demo-rr" class="tutorial-guide" data-guide-algo="rr"></div>
        `,
      },
      {
        id: "practica",
        title: "Now it's your turn!",
        lead: "Pick an algorithm, generate an exercise (no repeats this session) and check your answer with the checker.",
        artKey: "practica",
        bubble: "Your turn: fill the chart",
        body: `
          <ol class="steps">
            <li>Choose which scheduling type you want to solve.</li>
            <li>Click <strong>Generate new</strong> (or try the sample exercise).</li>
            <li>Fill the E/L/F cells, the queue and the times.</li>
            <li>Click <strong>Check my answer</strong> for a partial score and where each error is.</li>
          </ol>
          <div class="callout">Remember: lower priority number = more urgent. F is marked at the finish instant. If you get stuck, use the step-by-step explanation.</div>
        `,
      },
    ];
  }

  global.I18n = {
    get LANG() {
      return LANG;
    },
    getLang,
    setLang,
    toggleLang,
    t,
    art,
    algoName,
    algoFull,
    getSlides,
    STR,
  };
})(window);
