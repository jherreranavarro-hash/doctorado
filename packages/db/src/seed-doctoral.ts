import {
  PrismaClient,
  DoctoralModuleType,
  DoctoralDifficulty,
  DoctoralExerciseType,
} from "@prisma/client";
import * as argon2 from "argon2";
import {
  DEMO_DOCTORAL_ADMIN_EMAIL,
  DEMO_DOCTORAL_PROFESSOR_EMAIL,
  DEMO_DOCTORAL_STUDENT_EMAIL,
  DEMO_DOCTORAL_PASSWORD,
} from "./constants.js";

/**
 * Siembra del Dominio Doctorado — organización propia, 2 programas
 * (Doctorado en Psicología PUCV con malla real desde el PDF adjunto al
 * encargo; Doctorado en Psicología, Salud y Calidad de Vida como esqueleto
 * PROVISORIO explícitamente marcado, a la espera de su malla oficial),
 * contenido conceptual + ejercicios + examen + encuesta reales para 2
 * módulos representativos del primer semestre de Psicología, y cuentas de
 * demostración (solo fuera de producción).
 *
 * Idempotencia: cada módulo/topic se crea una sola vez (se salta por
 * completo si ya existe, en vez de upsert profundo por cada fila anidada) —
 * mismo criterio de "segunda corrida no duplica" que packages/content-importer,
 * aplicado aquí a un árbol de contenido en vez de a un importador de JSON.
 */

interface HintSeed {
  order: number;
  text: string;
}

interface CompetencyWeightSeed {
  key: string;
  weight: number;
}

interface OptionSeed {
  optionKey: string;
  text: string;
  isCorrect: boolean;
}

interface ExerciseSeed {
  key: string;
  type: DoctoralExerciseType;
  difficulty: DoctoralDifficulty;
  order: number;
  scenario?: string;
  statement: string;
  options?: OptionSeed[];
  modelAnswer?: { keyPoints: string[]; keywords: string[] };
  hints: HintSeed[];
  competencies: CompetencyWeightSeed[];
}

interface TopicSeed {
  key: string;
  title: string;
  order: number;
  summary: string;
  body: string;
  keyIdeas: string[];
  exercises: ExerciseSeed[];
}

interface ExamQuestionSeed {
  order: number;
  type: DoctoralExerciseType;
  statement: string;
  scenario?: string;
  options?: OptionSeed[];
  modelAnswer?: { keyPoints: string[]; keywords: string[] };
  competencies: CompetencyWeightSeed[];
}

interface SurveyQuestionSeed {
  order: number;
  type: "likert_1_5" | "short_answer";
  prompt: string;
}

const SURVEY_QUESTIONS: SurveyQuestionSeed[] = [
  {
    order: 1,
    type: "likert_1_5",
    prompt: "¿Qué tan claro te resultó el modelo conceptual presentado en este módulo?",
  },
  {
    order: 2,
    type: "likert_1_5",
    prompt: "¿Qué tan útiles fueron las pistas para resolver los ejercicios de mayor dificultad?",
  },
  {
    order: 3,
    type: "likert_1_5",
    prompt: "¿Qué tan adecuado fue el nivel de dificultad de los escenarios prácticos?",
  },
  {
    order: 4,
    type: "likert_1_5",
    prompt:
      "¿Qué tan preparado/a te sientes para la prueba final del módulo tras completar la práctica?",
  },
  { order: 5, type: "short_answer", prompt: "¿Qué mejorarías de este módulo?" },
];

// --- Módulo 1: Psicología y Transformaciones Sociales I (DPSI-7216) ---

const TOPICS_MODULE_1: TopicSeed[] = [
  {
    key: "modelos-psicologia-social-clasica",
    title: "Modelos clásicos de psicología social y cambio social",
    order: 1,
    summary:
      "Revisión de los modelos fundacionales de la psicología social (interaccionismo simbólico, teoría de la identidad social, construccionismo social) y su relación con procesos de transformación social.",
    body: "El interaccionismo simbólico de Mead y Blumer sostiene que las personas actúan hacia los objetos sociales en función del significado que estos tienen para ellas, y que ese significado se construye y modifica en la interacción. La teoría de la identidad social de Tajfel y Turner explica cómo la categorización en endogrupo/exogrupo y la búsqueda de una distintividad positiva predicen tanto la cohesión grupal como el conflicto intergrupal, siendo clave para entender la acción colectiva. El construccionismo social de Berger y Luckmann añade que la realidad social no es un dato fijo, sino que se produce y se sostiene mediante procesos de institucionalización y legitimación compartidos. Juntos, estos tres modelos permiten analizar tanto la reproducción del orden social como su transformación: los movimientos sociales, por ejemplo, pueden leerse como procesos donde una identidad colectiva emergente reinterpreta símbolos compartidos para cuestionar una realidad social dada por sentada.",
    keyIdeas: [
      "El self es un producto social, no solo individual (interaccionismo simbólico).",
      "La identidad social predice la acción colectiva y el conflicto intergrupal (Tajfel & Turner).",
      "La realidad social se construye y se sostiene mediante interacción y lenguaje (Berger & Luckmann).",
      "Los modelos clásicos explican tanto la reproducción del orden social como su transformación.",
    ],
    exercises: [
      {
        key: "identidad-social-distintividad",
        type: "mc",
        difficulty: "introductorio",
        order: 1,
        statement:
          "Según la teoría de la identidad social de Tajfel y Turner, ¿qué mecanismo explica que un grupo minoritario desarrolle una identidad colectiva más cohesionada frente a un grupo dominante?",
        options: [
          {
            optionKey: "a",
            text: "Comparación social intergrupal que busca una distintividad positiva",
            isCorrect: true,
          },
          {
            optionKey: "b",
            text: "Condicionamiento operante reforzado por recompensas externas",
            isCorrect: false,
          },
          {
            optionKey: "c",
            text: "Regresión a la media estadística del comportamiento grupal",
            isCorrect: false,
          },
          {
            optionKey: "d",
            text: "Disonancia cognitiva resuelta por cambio de actitud individual",
            isCorrect: false,
          },
        ],
        hints: [
          {
            order: 1,
            text: "Piensa en qué compara el grupo minoritario para definirse a sí mismo.",
          },
          {
            order: 2,
            text: "La teoría es de comparación intergrupal, no de aprendizaje por refuerzo.",
          },
        ],
        competencies: [
          { key: "pensamiento_critico", weight: 1 },
          { key: "analisis_critico_social", weight: 1 },
        ],
      },
      {
        key: "interaccionismo-simbolico-sindicato",
        type: "short_answer",
        difficulty: "intermedio",
        order: 2,
        scenario:
          "Un sindicato de trabajadoras textiles logra una identidad colectiva fuerte tras una serie de despidos injustificados, incluso sin que exista aún una organización formal.",
        statement:
          "Explica, usando el interaccionismo simbólico, cómo el lenguaje y los símbolos compartidos (consignas, relatos de despido) contribuyen a construir esa identidad colectiva antes de que exista una estructura formal.",
        modelAnswer: {
          keyPoints: [
            "El significado de 'ser despedida injustamente' se construye mediante interacción y no es dado de antemano",
            "Los símbolos compartidos (consignas, relatos) funcionan como objetos sociales que organizan la acción conjunta",
            "La identidad colectiva emerge del proceso interpretativo compartido, no de una estructura formal previa",
          ],
          keywords: [
            "interaccionismo simbólico",
            "símbolos compartidos",
            "significado compartido",
            "identidad colectiva",
            "interpretación",
          ],
        },
        hints: [
          {
            order: 1,
            text: "Recuerda que para Blumer las personas actúan hacia las cosas en función del significado que estas tienen para ellas.",
          },
          {
            order: 2,
            text: "El símbolo no necesita una organización formal para operar: puede circular por relatos y consignas informales.",
          },
        ],
        competencies: [
          { key: "analisis_critico_social", weight: 1 },
          { key: "pensamiento_critico", weight: 1 },
        ],
      },
      {
        key: "gentrificacion-identidad-construccionismo",
        type: "case_analysis",
        difficulty: "experto",
        order: 3,
        scenario:
          "En una comunidad urbana marginalizada, un proceso de gentrificación provoca que los residentes históricos comiencen a movilizarse, mientras que nuevos residentes de clase media enmarcan el conflicto como un problema de 'orden público'.",
        statement:
          "Integra construccionismo social y teoría de la identidad social para analizar por qué ambos grupos legitiman su posición como la realidad 'objetiva' del barrio, y qué intervención psicosocial podría reducir la escalada del conflicto sin invisibilizar a los residentes históricos.",
        modelAnswer: {
          keyPoints: [
            "Cada grupo construye una versión de la realidad del barrio coherente con su posición social (construccionismo)",
            "La categorización endogrupo/exogrupo intensifica el sesgo de atribución y la búsqueda de distintividad positiva",
            "Una intervención efectiva crea un objetivo superordinado y espacios de contacto que no parten de una sola narrativa como 'neutral'",
            "Reconocer la asimetría de poder es necesario: no tratar ambas narrativas como equivalentes para no invisibilizar a los residentes históricos",
          ],
          keywords: [
            "construccionismo social",
            "identidad social",
            "categorización social",
            "objetivo superordinado",
            "asimetría de poder",
            "gentrificación",
          ],
        },
        hints: [
          {
            order: 1,
            text: "No analices solo un marco teórico: la pregunta pide integrar construccionismo social CON identidad social.",
          },
          {
            order: 2,
            text: "La intervención no debe ser 'neutral' entre narrativas si hay una asimetría de poder real entre los grupos.",
          },
        ],
        competencies: [
          { key: "analisis_critico_social", weight: 2 },
          { key: "pensamiento_critico", weight: 1 },
          { key: "etica_investigacion", weight: 1 },
        ],
      },
    ],
  },
  {
    key: "psicologia-critica-desigualdad",
    title: "Psicología crítica y contextos de desigualdad",
    order: 2,
    summary:
      "Aportes de la psicología crítica y liberacionista (Martín-Baró, Freire) para analizar cómo las condiciones estructurales de desigualdad moldean el sufrimiento psicológico y la conciencia social.",
    body: "Ignacio Martín-Baró propuso una psicología de la liberación que rechaza estudiar el sufrimiento psicológico al margen de sus condiciones materiales e históricas, especialmente en contextos de violencia estructural prolongada. Uno de sus aportes centrales es el análisis del 'fatalismo' como ideología que naturaliza la desigualdad y desmoviliza la acción colectiva, en vez de tratarlo como un simple rasgo individual. Paulo Freire, desde la pedagogía, aporta el concepto de concientización: un proceso psicosocial (no solo educativo) mediante el cual las personas y comunidades transforman su relación con la realidad al reconocer el origen social e histórico de su situación. Ambos autores cuestionan la pretendida neutralidad valorativa de diagnósticos individuales aplicados a problemas de origen estructural, y proponen que la memoria histórica de las comunidades afectadas por violencia es un insumo psicológico legítimo, no un dato accesorio.",
    keyIdeas: [
      "El sufrimiento psicológico no puede entenderse fuera de sus condiciones materiales e históricas (Martín-Baró).",
      "El fatalismo puede funcionar como ideología que naturaliza la desigualdad y desmoviliza la acción colectiva.",
      "La concientización (Freire) es un proceso psicosocial, no solo educativo, que transforma la relación sujeto-realidad.",
      "La psicología crítica cuestiona la neutralidad valorativa de los diagnósticos individuales aplicados a problemas estructurales.",
    ],
    exercises: [
      {
        key: "fatalismo-funcion-ideologica",
        type: "mc",
        difficulty: "introductorio",
        order: 1,
        statement:
          "Para Martín-Baró, ¿qué función cumple el 'fatalismo' en comunidades sometidas a violencia estructural prolongada?",
        options: [
          {
            optionKey: "a",
            text: "Es una distorsión cognitiva individual sin relación con el contexto social",
            isCorrect: false,
          },
          {
            optionKey: "b",
            text: "Funciona como ideología que naturaliza la desigualdad y reduce la acción colectiva",
            isCorrect: true,
          },
          {
            optionKey: "c",
            text: "Es un mecanismo de defensa exclusivamente inconsciente sin componente social",
            isCorrect: false,
          },
          {
            optionKey: "d",
            text: "Es un sesgo estadístico en la medición de actitudes políticas",
            isCorrect: false,
          },
        ],
        hints: [
          {
            order: 1,
            text: "Piensa en el fatalismo como algo que cumple una función social, no solo individual.",
          },
          { order: 2, text: "La clave es su efecto sobre la acción colectiva." },
        ],
        competencies: [
          { key: "analisis_critico_social", weight: 1 },
          { key: "etica_investigacion", weight: 1 },
        ],
      },
      {
        key: "concientizacion-vs-autoeficacia",
        type: "short_answer",
        difficulty: "intermedio",
        order: 2,
        scenario:
          "En una comunidad rural que ha vivido décadas de exclusión de servicios básicos, muchos habitantes afirman que 'así ha sido siempre y no va a cambiar'.",
        statement:
          "Desde la psicología de la liberación, explica por qué diagnosticar esta actitud únicamente como 'baja autoeficacia individual' sería una intervención psicológicamente incompleta, y qué añadiría un enfoque de concientización.",
        modelAnswer: {
          keyPoints: [
            "Reducir el fenómeno a autoeficacia individual invisibiliza las condiciones estructurales que producen esa creencia",
            "La concientización busca que la comunidad reconozca el origen social/histórico de su situación, no solo su percepción individual",
            "Un abordaje solo individual puede terminar responsabilizando a las víctimas de la desigualdad estructural",
          ],
          keywords: [
            "concientización",
            "fatalismo",
            "condiciones estructurales",
            "autoeficacia",
            "psicología de la liberación",
          ],
        },
        hints: [
          {
            order: 1,
            text: "La crítica de Martín-Baró es justamente a la psicologización de problemas estructurales.",
          },
          {
            order: 2,
            text: "Concientización no es solo 'informar': es transformar la relación de la comunidad con su propia realidad.",
          },
        ],
        competencies: [
          { key: "etica_investigacion", weight: 1 },
          { key: "analisis_critico_social", weight: 2 },
        ],
      },
      {
        key: "escala-estandarizada-comunidad-indigena",
        type: "case_analysis",
        difficulty: "experto",
        order: 3,
        scenario:
          "Un equipo de investigación externo llega a una comunidad indígena que ha sufrido desplazamiento forzado, con el objetivo de 'medir resiliencia psicológica' mediante una escala estandarizada importada de otro contexto cultural.",
        statement:
          "Argumenta, desde la psicología crítica, al menos dos riesgos éticos y metodológicos de este diseño, y propone un ajuste que respete la agencia y la memoria histórica de la comunidad.",
        modelAnswer: {
          keyPoints: [
            "Riesgo de imponer categorías culturalmente ajenas que no capturan el sentido local del sufrimiento y la resiliencia (validez ecológica/cultural)",
            "Riesgo de extractivismo epistémico: la comunidad como objeto de medición sin participación en la definición del problema de investigación",
            "Un ajuste apropiado incorpora metodologías participativas (co-construcción de indicadores, consentimiento informado colectivo, devolución de resultados)",
          ],
          keywords: [
            "validez cultural",
            "extractivismo epistémico",
            "investigación participativa",
            "consentimiento colectivo",
            "memoria histórica",
          ],
        },
        hints: [
          {
            order: 1,
            text: "Piensa en la diferencia entre investigar 'sobre' una comunidad e investigar 'con' una comunidad.",
          },
          {
            order: 2,
            text: "Considera tanto el instrumento (la escala) como el proceso (quién decide qué se mide).",
          },
        ],
        competencies: [
          { key: "etica_investigacion", weight: 2 },
          { key: "pensamiento_critico", weight: 1 },
          { key: "analisis_critico_social", weight: 1 },
        ],
      },
    ],
  },
  {
    key: "intervencion-psicosocial-comunitaria",
    title: "Intervención psicosocial comunitaria",
    order: 3,
    summary:
      "Principios y modelos de intervención psicosocial comunitaria orientados al empoderamiento y la transformación de condiciones de vulnerabilidad.",
    body: "El concepto de empoderamiento de Rappaport describe un proceso —no un estado final medible con un único puntaje— mediante el cual personas y comunidades ganan control sobre asuntos que les importan. La investigación-acción participativa (con raíces en Lewin y desarrollos posteriores como los de Fals Borda) integra en un mismo proceso la generación de conocimiento y la transformación social, exigiendo que la comunidad participe en definir el problema, no solo en recibir la intervención. Una intervención psicosocial bien diseñada opera en múltiples niveles simultáneamente: individual, grupal, comunitario y estructural, evitando reducir problemas estructurales a soluciones exclusivamente individuales. En este marco, el rol del profesional se redefine como facilitador de la agencia comunitaria, no como quien sustituye o dirige unilateralmente el proceso de cambio.",
    keyIdeas: [
      "El empoderamiento comunitario implica procesos, no solo resultados individuales medibles.",
      "La investigación-acción participativa integra generación de conocimiento y transformación social en un mismo proceso.",
      "Una intervención psicosocial bien diseñada opera en múltiples niveles (individual, grupal, comunitario, estructural).",
      "El rol del profesional es facilitar la agencia comunitaria, no sustituirla.",
    ],
    exercises: [
      {
        key: "empoderamiento-rappaport",
        type: "mc",
        difficulty: "introductorio",
        order: 1,
        statement:
          "¿Cuál de las siguientes opciones describe mejor el concepto de 'empoderamiento' según Rappaport?",
        options: [
          {
            optionKey: "a",
            text: "Un estado final medible mediante un puntaje individual único",
            isCorrect: false,
          },
          {
            optionKey: "b",
            text: "Un proceso mediante el cual personas y comunidades ganan control sobre asuntos que les importan",
            isCorrect: true,
          },
          {
            optionKey: "c",
            text: "La transferencia de autoridad formal de una institución a un líder comunitario",
            isCorrect: false,
          },
          {
            optionKey: "d",
            text: "Un efecto secundario no buscado de las intervenciones clínicas individuales",
            isCorrect: false,
          },
        ],
        hints: [
          { order: 1, text: "Rappaport insiste en que es un proceso, no solo un estado final." },
          { order: 2, text: "Piensa en 'ganar control', no en 'recibir autoridad'." },
        ],
        competencies: [{ key: "analisis_critico_social", weight: 1 }],
      },
      {
        key: "taller-autoestima-sin-participacion",
        type: "short_answer",
        difficulty: "intermedio",
        order: 2,
        scenario:
          "Un equipo psicosocial diseña un taller único de 'fortalecimiento de autoestima' para una comunidad afectada por un desastre socioambiental, sin consultar previamente a los líderes locales sobre sus prioridades.",
        statement:
          "Señala por qué este diseño contradice el principio de investigación-acción participativa y qué cambiarías en el proceso (no solo en el contenido del taller).",
        modelAnswer: {
          keyPoints: [
            "El diseño fue definido externamente sin participación comunitaria en el diagnóstico de necesidades",
            "La investigación-acción participativa exige que la comunidad co-defina el problema y las prioridades de intervención, no solo reciba el resultado",
            "El cambio necesario es de proceso: incorporar diagnóstico participativo previo, no solo ajustar el contenido del taller",
          ],
          keywords: [
            "investigación-acción participativa",
            "diagnóstico participativo",
            "co-construcción",
            "priorización comunitaria",
          ],
        },
        hints: [
          {
            order: 1,
            text: "El problema no es necesariamente el contenido del taller, sino quién decidió que ese era el problema a abordar.",
          },
          {
            order: 2,
            text: "Piensa en 'participación' como algo que debe ocurrir desde el diagnóstico, no solo en la ejecución.",
          },
        ],
        competencies: [
          { key: "etica_investigacion", weight: 1 },
          { key: "analisis_critico_social", weight: 1 },
        ],
      },
      {
        key: "mandato-municipal-conflictividad",
        type: "case_analysis",
        difficulty: "experto",
        order: 3,
        scenario:
          "Una municipalidad solicita a un equipo de psicología comunitaria 'reducir la conflictividad social' en un barrio con alta organización vecinal crítica de la gestión municipal.",
        statement:
          "Analiza la tensión ética entre el mandato institucional (reducir 'conflictividad') y los principios de empoderamiento comunitario, y propone cómo un equipo psicosocial podría reencuadrar el encargo sin traicionar ni al financiador ni a la comunidad.",
        modelAnswer: {
          keyPoints: [
            "Existe un riesgo de que 'reducir conflictividad' se traduzca en desmovilizar la organización vecinal legítima",
            "El empoderamiento comunitario puede aumentar, no reducir, la expresión organizada de demandas — lo cual no equivale a 'fracaso' de la intervención",
            "Un reencuadre posible es redefinir el objetivo como 'fortalecer canales de diálogo y resolución de conflictos', no 'reducir la voz comunitaria'",
            "Se debe explicitar este reencuadre con el financiador, sosteniendo la autonomía profesional y los principios éticos del rol",
          ],
          keywords: [
            "empoderamiento",
            "reencuadre del encargo",
            "autonomía profesional",
            "conflicto legítimo",
            "ética institucional",
          ],
        },
        hints: [
          {
            order: 1,
            text: "El riesgo central es confundir 'menos conflicto' con 'mejor calidad de vida comunitaria'.",
          },
          {
            order: 2,
            text: "Piensa en cómo renegociar el encargo con el financiador sin simplemente rechazarlo ni aceptarlo tal cual.",
          },
        ],
        competencies: [
          { key: "etica_investigacion", weight: 2 },
          { key: "pensamiento_critico", weight: 1 },
          { key: "autonomia_investigativa", weight: 1 },
        ],
      },
    ],
  },
];

const EXAM_QUESTIONS_MODULE_1: ExamQuestionSeed[] = [
  {
    order: 1,
    type: "mc",
    statement:
      "¿Qué autor introduce el concepto de psicología de la liberación como respuesta a las condiciones de violencia estructural en Latinoamérica?",
    options: [
      { optionKey: "a", text: "Kurt Lewin", isCorrect: false },
      { optionKey: "b", text: "Ignacio Martín-Baró", isCorrect: true },
      { optionKey: "c", text: "Serge Moscovici", isCorrect: false },
      { optionKey: "d", text: "Kenneth Gergen", isCorrect: false },
    ],
    competencies: [{ key: "etica_investigacion", weight: 1 }],
  },
  {
    order: 2,
    type: "mc",
    statement:
      "Según la teoría de la identidad social, la 'distintividad positiva' se busca principalmente mediante:",
    options: [
      { optionKey: "a", text: "Comparación intergrupal favorable al endogrupo", isCorrect: true },
      { optionKey: "b", text: "Aislamiento social voluntario", isCorrect: false },
      { optionKey: "c", text: "Condicionamiento clásico", isCorrect: false },
      { optionKey: "d", text: "Regresión estadística", isCorrect: false },
    ],
    competencies: [{ key: "analisis_critico_social", weight: 1 }],
  },
  {
    order: 3,
    type: "mc",
    statement:
      "El interaccionismo simbólico de Blumer sostiene que el significado de los objetos sociales:",
    options: [
      { optionKey: "a", text: "Es fijo y biológicamente determinado", isCorrect: false },
      { optionKey: "b", text: "Se construye y modifica en la interacción social", isCorrect: true },
      { optionKey: "c", text: "Depende solo de refuerzos externos", isCorrect: false },
      { optionKey: "d", text: "Es idéntico entre culturas", isCorrect: false },
    ],
    competencies: [{ key: "pensamiento_critico", weight: 1 }],
  },
  {
    order: 4,
    type: "short_answer",
    statement:
      "Explica en qué se diferencia 'empoderamiento como proceso' de 'empoderamiento como resultado medible', y por qué esa diferencia importa para evaluar una intervención comunitaria.",
    modelAnswer: {
      keyPoints: [
        "El proceso enfatiza la trayectoria de ganar control y agencia, no solo un puntaje final",
        "Evaluar solo resultados puede ignorar cambios relevantes en la trayectoria comunitaria",
        "Importa porque una intervención puede fracasar en 'resultados' medibles a corto plazo pero fortalecer procesos genuinos de agencia",
      ],
      keywords: ["empoderamiento", "proceso", "resultado", "evaluación", "agencia comunitaria"],
    },
    competencies: [{ key: "analisis_critico_social", weight: 1 }],
  },
  {
    order: 5,
    type: "case_analysis",
    scenario:
      "Un equipo de investigación quiere estudiar el 'nivel de resiliencia' de una comunidad migrante reciente usando exclusivamente una encuesta cerrada aplicada una sola vez.",
    statement:
      "Identifica un problema metodológico y un problema ético de este diseño, y qué principio de la psicología crítica/comunitaria permitiría corregirlos.",
    modelAnswer: {
      keyPoints: [
        "Problema metodológico: una sola medición transversal no captura procesos ni trayectorias, y usa categorías potencialmente ajenas al contexto cultural",
        "Problema ético: no hay participación de la comunidad en la definición de qué es 'resiliencia' para ellos ni devolución de resultados",
        "Principio corrector: investigación-acción participativa y validez cultural de los instrumentos",
      ],
      keywords: [
        "validez cultural",
        "participación",
        "investigación-acción",
        "medición transversal",
        "resiliencia",
      ],
    },
    competencies: [
      { key: "etica_investigacion", weight: 2 },
      { key: "analisis_critico_social", weight: 1 },
    ],
  },
  {
    order: 6,
    type: "mc",
    statement: "El construccionismo social de Berger y Luckmann plantea que la realidad social:",
    options: [
      {
        optionKey: "a",
        text: "Existe independientemente de la interacción humana",
        isCorrect: false,
      },
      {
        optionKey: "b",
        text: "Se mantiene y transforma mediante procesos de institucionalización y legitimación compartidos",
        isCorrect: true,
      },
      {
        optionKey: "c",
        text: "Es exclusivamente una proyección individual sin componente colectivo",
        isCorrect: false,
      },
      {
        optionKey: "d",
        text: "Puede medirse con instrumentos estandarizados universales",
        isCorrect: false,
      },
    ],
    competencies: [{ key: "pensamiento_critico", weight: 1 }],
  },
];

// --- Módulo 2: Taller de Investigación Cuantitativa (DPSI-7214) ---

const TOPICS_MODULE_2: TopicSeed[] = [
  {
    key: "diseno-validez",
    title: "Diseño de investigación y validez",
    order: 1,
    summary:
      "Fundamentos del diseño de investigación cuantitativa en psicología: validez interna, externa, de constructo y estadística conclusiva, y su relación con el control de variables extrañas.",
    body: "La tipología de validez de Campbell y Stanley distingue la validez interna (¿el efecto observado es atribuible a la variable independiente y no a otras explicaciones?) de la validez externa (¿el hallazgo generaliza a otros contextos y poblaciones?). La asignación aleatoria es el mecanismo más robusto para controlar variables extrañas, tanto conocidas como desconocidas, distribuyéndolas equitativamente entre condiciones. Cuando la asignación aleatoria no es posible o ética, los diseños cuasi-experimentales requieren estrategias adicionales —grupos de comparación bien elegidos, controles estadísticos, diseños de series temporales— para aproximar una inferencia causal razonable. Amenazas clásicas a la validez interna incluyen la historia (eventos externos concurrentes), la maduración (cambios naturales con el tiempo), la regresión a la media y el sesgo de selección, que deben descartarse explícitamente antes de afirmar una relación causal.",
    keyIdeas: [
      "La validez interna requiere descartar explicaciones alternativas plausibles del efecto observado.",
      "La asignación aleatoria es el mecanismo más fuerte para controlar variables extrañas conocidas y desconocidas.",
      "La validez externa depende de la similitud entre la muestra/contexto de estudio y la población/contexto de interés.",
      "Los diseños cuasi-experimentales requieren estrategias adicionales para aproximar el control causal.",
    ],
    exercises: [
      {
        key: "funcion-asignacion-aleatoria",
        type: "mc",
        difficulty: "introductorio",
        order: 1,
        statement:
          "¿Cuál es la función principal de la asignación aleatoria en un diseño experimental?",
        options: [
          { optionKey: "a", text: "Aumentar el tamaño muestral", isCorrect: false },
          {
            optionKey: "b",
            text: "Controlar variables extrañas conocidas y desconocidas, distribuyéndolas equitativamente entre grupos",
            isCorrect: true,
          },
          { optionKey: "c", text: "Eliminar la necesidad de un grupo control", isCorrect: false },
          { optionKey: "d", text: "Garantizar la validez externa del estudio", isCorrect: false },
        ],
        hints: [
          {
            order: 1,
            text: "Piensa en qué problema resuelve la aleatorización, no en el tamaño de la muestra.",
          },
          {
            order: 2,
            text: "La clave es 'conocidas y desconocidas': no solo controla lo que el investigador ya identificó.",
          },
        ],
        competencies: [{ key: "rigor_metodologico", weight: 2 }],
      },
      {
        key: "mindfulness-autoseleccion",
        type: "short_answer",
        difficulty: "intermedio",
        order: 2,
        scenario:
          "Un estudio compara el bienestar psicológico de estudiantes que voluntariamente se inscribieron a un programa de mindfulness versus estudiantes que no se inscribieron, sin aleatorización.",
        statement:
          "Identifica la principal amenaza a la validez interna de este diseño y explica por qué la comparación entre grupos podría ser engañosa.",
        modelAnswer: {
          keyPoints: [
            "La principal amenaza es el sesgo de selección: quienes se inscriben voluntariamente pueden diferir sistemáticamente (ej. mayor motivación o mejor bienestar previo)",
            "La diferencia observada podría reflejar estas diferencias preexistentes y no un efecto causal del programa",
            "Se requeriría igualar grupos en variables relevantes o usar diseño experimental para atribución causal",
          ],
          keywords: [
            "sesgo de selección",
            "validez interna",
            "autoselección",
            "grupo de comparación",
            "causalidad",
          ],
        },
        hints: [
          {
            order: 1,
            text: "Piensa en quién decide entrar al programa y si esa decisión se relaciona con el resultado que se mide.",
          },
          {
            order: 2,
            text: "El nombre técnico de este problema es 'sesgo de selección' o 'autoselección'.",
          },
        ],
        competencies: [
          { key: "rigor_metodologico", weight: 2 },
          { key: "pensamiento_critico", weight: 1 },
        ],
      },
      {
        key: "intervencion-comunitaria-sin-control",
        type: "case_analysis",
        difficulty: "experto",
        order: 3,
        scenario:
          "Un investigador concluye que un programa de intervención comunitaria 'causó' una reducción en síntomas depresivos, basándose en un diseño pre-post sin grupo control, aplicado durante un periodo en que además mejoraron las condiciones económicas locales.",
        statement:
          "Explica qué amenazas a la validez interna (al menos dos) comprometen esta conclusión causal, y qué rediseño mínimo permitiría una inferencia más robusta.",
        modelAnswer: {
          keyPoints: [
            "Amenaza de 'historia': eventos externos concurrentes (mejora económica) pueden explicar el cambio, no la intervención",
            "Amenaza de 'maduración' o regresión a la media: los síntomas pueden disminuir naturalmente con el tiempo o tras una medición inicial extrema",
            "Rediseño mínimo: incorporar un grupo control equivalente (idealmente con asignación aleatoria) expuesto a las mismas condiciones externas",
          ],
          keywords: [
            "amenazas a la validez interna",
            "historia",
            "maduración",
            "regresión a la media",
            "grupo control",
          ],
        },
        hints: [
          {
            order: 1,
            text: "Hay al menos dos amenazas clásicas de Campbell y Stanley aplicables aquí: una relacionada con eventos externos y otra con el paso del tiempo.",
          },
          {
            order: 2,
            text: "El rediseño mínimo casi siempre involucra agregar un grupo de comparación adecuado.",
          },
        ],
        competencies: [
          { key: "rigor_metodologico", weight: 2 },
          { key: "pensamiento_critico", weight: 1 },
        ],
      },
    ],
  },
  {
    key: "modelos-multivariados",
    title: "Modelos estadísticos multivariados",
    order: 2,
    summary:
      "Introducción a modelos de regresión múltiple, modelos mixtos (multinivel) y su aplicación a datos psicológicos anidados (ej. estudiantes dentro de cohortes, mediciones repetidas dentro de personas).",
    body: "Más allá de la regresión múltiple clásica, los datos psicológicos suelen tener estructura anidada: mediciones repetidas dentro de una misma persona, o personas anidadas en cohortes/grupos. Analizar estos datos con métodos que asumen observaciones independientes viola ese supuesto y puede inflar la tasa de falsos positivos (error Tipo I). Los modelos mixtos (multinivel) resuelven esto incorporando efectos aleatorios —por ejemplo, un intercepto aleatorio por cohorte— que modelan explícitamente la variabilidad compartida dentro de cada grupo, separándola de la variabilidad individual. Además del ajuste del modelo, es indispensable distinguir significancia estadística (¿es improbable el resultado bajo la hipótesis nula?) de tamaño del efecto (¿cuán grande es la relación observada?): con muestras suficientemente grandes, efectos triviales pueden alcanzar significancia estadística sin tener relevancia práctica alguna.",
    keyIdeas: [
      "Ignorar la estructura anidada de los datos viola el supuesto de independencia y puede inflar falsos positivos.",
      "Los modelos mixtos permiten modelar variabilidad tanto intra- como inter-sujeto/grupo.",
      "El tamaño del efecto es tan importante como la significancia estadística para interpretar resultados.",
      "La potencia estadística depende del tamaño muestral, el tamaño del efecto esperado y el nivel de significancia.",
    ],
    exercises: [
      {
        key: "independencia-mediciones-repetidas",
        type: "mc",
        difficulty: "introductorio",
        order: 1,
        statement:
          "¿Qué problema estadístico surge si se analizan mediciones repetidas de los mismos participantes usando un modelo que asume observaciones independientes?",
        options: [
          {
            optionKey: "a",
            text: "Se subestima el tamaño del efecto automáticamente",
            isCorrect: false,
          },
          {
            optionKey: "b",
            text: "Se viola el supuesto de independencia, lo que puede inflar la tasa de falsos positivos",
            isCorrect: true,
          },
          {
            optionKey: "c",
            text: "El modelo se vuelve automáticamente no significativo",
            isCorrect: false,
          },
          {
            optionKey: "d",
            text: "No hay ningún problema si la muestra es grande",
            isCorrect: false,
          },
        ],
        hints: [
          {
            order: 1,
            text: "Piensa en qué supuesto estadístico se relaciona directamente con 'observaciones independientes'.",
          },
          {
            order: 2,
            text: "El riesgo típico es un aumento en los falsos positivos (Error Tipo I), no una reducción automática del efecto.",
          },
        ],
        competencies: [{ key: "rigor_metodologico", weight: 2 }],
      },
      {
        key: "intercepto-aleatorio-cohortes",
        type: "short_answer",
        difficulty: "intermedio",
        order: 2,
        scenario:
          "Un estudio mide el desempeño académico de estudiantes anidados en 15 cohortes distintas de un doctorado, y usa una regresión lineal simple ignorando la pertenencia a cohorte.",
        statement:
          "Explica por qué un modelo mixto con intercepto aleatorio por cohorte sería más apropiado que la regresión simple en este caso.",
        modelAnswer: {
          keyPoints: [
            "Los estudiantes dentro de la misma cohorte comparten condiciones (docentes, calendario, clima grupal) que los hacen más parecidos entre sí que estudiantes de otra cohorte",
            "Ignorar esta estructura anidada viola independencia y puede llevar a errores estándar subestimados",
            "Un intercepto aleatorio por cohorte modela explícitamente esa variabilidad compartida, separándola de la variabilidad individual",
          ],
          keywords: [
            "modelo mixto",
            "intercepto aleatorio",
            "datos anidados",
            "independencia",
            "variabilidad entre grupos",
          ],
        },
        hints: [
          {
            order: 1,
            text: "Piensa en qué comparten los estudiantes de una misma cohorte que no comparten con otra.",
          },
          {
            order: 2,
            text: "El intercepto aleatorio capta la variabilidad 'de grupo' aparte de la variabilidad individual.",
          },
        ],
        competencies: [{ key: "rigor_metodologico", weight: 2 }],
      },
      {
        key: "significancia-vs-tamano-efecto",
        type: "case_analysis",
        difficulty: "experto",
        order: 3,
        scenario:
          "Un investigador reporta un efecto 'estadísticamente significativo' (p=.04) de una intervención breve sobre autoestima, con n=400, pero el tamaño del efecto (d de Cohen) es de 0.05.",
        statement:
          "Argumenta por qué la significancia estadística no implica relevancia práctica en este caso, y qué información adicional (más allá del valor p) deberías exigir antes de considerar el hallazgo importante para la práctica profesional.",
        modelAnswer: {
          keyPoints: [
            "Con una muestra grande (n=400), incluso efectos triviales pueden alcanzar significancia estadística",
            "Un d=0.05 es un efecto prácticamente nulo según convenciones estándar (pequeño ~0.2, mediano ~0.5, grande ~0.8)",
            "Se debería exigir el tamaño del efecto con su intervalo de confianza, y evidencia de replicación, antes de considerar el hallazgo relevante para la práctica",
          ],
          keywords: [
            "significancia estadística",
            "tamaño del efecto",
            "d de Cohen",
            "muestra grande",
            "relevancia práctica",
            "intervalo de confianza",
          ],
        },
        hints: [
          {
            order: 1,
            text: "Con muestras grandes, la significancia estadística deja de ser un buen indicador de importancia práctica.",
          },
          {
            order: 2,
            text: "Compara el d=0.05 con las convenciones habituales de tamaño del efecto (pequeño/mediano/grande).",
          },
        ],
        competencies: [
          { key: "rigor_metodologico", weight: 2 },
          { key: "pensamiento_critico", weight: 1 },
        ],
      },
    ],
  },
  {
    key: "ciencia-abierta-reproducibilidad",
    title: "Ciencia abierta y reproducibilidad",
    order: 3,
    summary:
      "Principios de ciencia abierta (preregistro, materiales y datos abiertos) como respuesta a la crisis de replicación en psicología, y su relación con la integridad científica.",
    body: "La 'crisis de replicación' —visibilizada de forma sistemática por proyectos como el Reproducibility Project de 2015— mostró que una proporción sustancial de hallazgos clásicos en psicología no se replica bajo condiciones similares. Dos prácticas cuestionadas contribuyen a esto: el p-hacking (probar múltiples análisis o variables hasta obtener un resultado significativo) y el HARKing (Hypothesizing After Results are Known: presentar una hipótesis formulada después de ver los resultados como si hubiera sido planteada a priori). El preregistro —declarar públicamente hipótesis, diseño y plan de análisis antes de recolectar o analizar los datos— permite distinguir con transparencia el análisis confirmatorio (planeado a priori) del exploratorio (post hoc), sin prohibir este último, solo exigiendo que se declare como tal. Los principios FAIR (datos encontrables, accesibles, interoperables y reutilizables) y compartir materiales/datos abiertos permiten además la verificación independiente de los hallazgos.",
    keyIdeas: [
      "La 'crisis de replicación' mostró que una proporción sustancial de hallazgos clásicos en psicología no se replica.",
      "El p-hacking y el HARKing inflan artificialmente la tasa de falsos positivos publicados.",
      "El preregistro distingue análisis confirmatorio de exploratorio, aumentando la transparencia.",
      "Los datos y materiales abiertos permiten la verificación independiente de los hallazgos.",
    ],
    exercises: [
      {
        key: "definicion-harking",
        type: "mc",
        difficulty: "introductorio",
        order: 1,
        statement:
          "¿Qué práctica describe mejor el 'HARKing' (Hypothesizing After Results are Known)?",
        options: [
          {
            optionKey: "a",
            text: "Registrar la hipótesis antes de recolectar datos",
            isCorrect: false,
          },
          {
            optionKey: "b",
            text: "Presentar una hipótesis formulada después de ver los resultados como si hubiera sido planteada a priori",
            isCorrect: true,
          },
          {
            optionKey: "c",
            text: "Replicar un estudio en una muestra independiente",
            isCorrect: false,
          },
          {
            optionKey: "d",
            text: "Compartir públicamente los datos crudos de un estudio",
            isCorrect: false,
          },
        ],
        hints: [
          {
            order: 1,
            text: "El nombre lo dice: la hipótesis se formula DESPUÉS de conocer los resultados.",
          },
          {
            order: 2,
            text: "Se presenta como si hubiera sido planteada antes del análisis, lo cual es el problema ético/metodológico.",
          },
        ],
        competencies: [
          { key: "rigor_metodologico", weight: 1 },
          { key: "etica_investigacion", weight: 1 },
        ],
      },
      {
        key: "p-hacking-multiples-variables",
        type: "short_answer",
        difficulty: "intermedio",
        order: 2,
        scenario:
          "Un equipo de investigación prueba 12 variables dependientes distintas y reporta solo la única que resultó estadísticamente significativa (p<.05), presentándola como el hallazgo central del estudio.",
        statement:
          "Explica por qué esta práctica (parte del 'p-hacking') aumenta el riesgo de falsos positivos, y qué solución ofrece el preregistro.",
        modelAnswer: {
          keyPoints: [
            "Probar múltiples variables sin corrección aumenta la probabilidad de encontrar al menos un resultado significativo por azar (inflación del error Tipo I)",
            "Reportar selectivamente solo el resultado significativo oculta las comparaciones múltiples realizadas",
            "El preregistro exige especificar a priori las variables/hipótesis confirmatorias, hace visible cualquier desviación, y distingue análisis confirmatorio de exploratorio",
          ],
          keywords: [
            "p-hacking",
            "comparaciones múltiples",
            "error tipo I",
            "preregistro",
            "análisis confirmatorio",
          ],
        },
        hints: [
          {
            order: 1,
            text: "Piensa en la probabilidad acumulada de obtener al menos un falso positivo al probar muchas variables.",
          },
          {
            order: 2,
            text: "El preregistro no impide explorar los datos, pero obliga a declarar qué era confirmatorio desde el inicio.",
          },
        ],
        competencies: [
          { key: "rigor_metodologico", weight: 2 },
          { key: "etica_investigacion", weight: 1 },
        ],
      },
      {
        key: "comite-tesis-ajustar-hipotesis",
        type: "case_analysis",
        difficulty: "experto",
        order: 3,
        scenario:
          "Como parte de tu proyecto de tesis doctoral, tu comité te sugiere 'ajustar la hipótesis' después de que los análisis preliminares mostraron un patrón inesperado pero interesante, y publicar el estudio como si esa hubiera sido la hipótesis original.",
        statement:
          "Argumenta cómo responderías a esa sugerencia desde los principios de ciencia abierta, y qué opción legítima existe para reportar un hallazgo exploratorio interesante sin incurrir en HARKing.",
        modelAnswer: {
          keyPoints: [
            "Aceptar la sugerencia constituye HARKing y compromete la integridad científica del hallazgo, aun si la intención no es maliciosa",
            "Existe una opción legítima: reportar explícitamente el hallazgo como exploratorio/post hoc, distinguiéndolo del análisis confirmatorio original",
            "Una alternativa robusta es proponer un estudio de replicación/confirmación preregistrado para poner a prueba el patrón inesperado antes de afirmarlo con fuerza",
          ],
          keywords: [
            "HARKing",
            "integridad científica",
            "análisis exploratorio",
            "replicación preregistrada",
            "transparencia",
          ],
        },
        hints: [
          {
            order: 1,
            text: "La pregunta no es si el patrón es interesante, sino cómo se reporta sin distorsionar el estatus de la hipótesis.",
          },
          {
            order: 2,
            text: "Piensa en una vía que te permita mostrar el hallazgo sin fingir que fue confirmatorio.",
          },
        ],
        competencies: [
          { key: "etica_investigacion", weight: 2 },
          { key: "rigor_metodologico", weight: 1 },
          { key: "autonomia_investigativa", weight: 1 },
        ],
      },
    ],
  },
];

const EXAM_QUESTIONS_MODULE_2: ExamQuestionSeed[] = [
  {
    order: 1,
    type: "mc",
    statement: "La asignación aleatoria en un experimento sirve principalmente para...",
    options: [
      {
        optionKey: "a",
        text: "Controlar variables extrañas conocidas y desconocidas",
        isCorrect: true,
      },
      { optionKey: "b", text: "Aumentar la validez de constructo únicamente", isCorrect: false },
      { optionKey: "c", text: "Reemplazar la necesidad de un grupo control", isCorrect: false },
      { optionKey: "d", text: "Garantizar representatividad poblacional", isCorrect: false },
    ],
    competencies: [{ key: "rigor_metodologico", weight: 1 }],
  },
  {
    order: 2,
    type: "mc",
    statement: "El 'p-hacking' se refiere a...",
    options: [
      {
        optionKey: "a",
        text: "Un método válido de reducción de dimensionalidad",
        isCorrect: false,
      },
      {
        optionKey: "b",
        text: "Manipular el análisis (ej. probar múltiples variables) hasta obtener un resultado significativo",
        isCorrect: true,
      },
      { optionKey: "c", text: "Un tipo de diseño experimental factorial", isCorrect: false },
      {
        optionKey: "d",
        text: "Un procedimiento de aleatorización estratificada",
        isCorrect: false,
      },
    ],
    competencies: [{ key: "etica_investigacion", weight: 1 }],
  },
  {
    order: 3,
    type: "mc",
    statement: "Un modelo mixto con intercepto aleatorio es especialmente apropiado cuando...",
    options: [
      {
        optionKey: "a",
        text: "Los datos son completamente independientes entre sí",
        isCorrect: false,
      },
      {
        optionKey: "b",
        text: "Existen datos anidados (ej. mediciones repetidas o grupos)",
        isCorrect: true,
      },
      { optionKey: "c", text: "La muestra es menor a 30 casos", isCorrect: false },
      { optionKey: "d", text: "No hay variables continuas en el modelo", isCorrect: false },
    ],
    competencies: [{ key: "rigor_metodologico", weight: 1 }],
  },
  {
    order: 4,
    type: "short_answer",
    statement:
      "Explica la diferencia entre significancia estadística y tamaño del efecto, y por qué ambos son necesarios para interpretar un hallazgo.",
    modelAnswer: {
      keyPoints: [
        "La significancia estadística indica si un efecto es improbable bajo la hipótesis nula, pero no indica su magnitud",
        "El tamaño del efecto cuantifica la magnitud/importancia práctica del hallazgo",
        "Con muestras grandes, efectos triviales pueden ser significativos; se necesitan ambos indicadores para una interpretación completa",
      ],
      keywords: [
        "significancia estadística",
        "tamaño del efecto",
        "valor p",
        "magnitud del efecto",
        "interpretación",
      ],
    },
    competencies: [{ key: "rigor_metodologico", weight: 2 }],
  },
  {
    order: 5,
    type: "case_analysis",
    scenario:
      "Un estudio doctoral compara dos grupos de estudiantes autoseleccionados (con y sin beca) en su desempeño en un seminario, sin aleatorización.",
    statement:
      "Identifica la principal amenaza a la validez interna y qué diseño alternativo la reduciría.",
    modelAnswer: {
      keyPoints: [
        "Principal amenaza: sesgo de selección (los grupos pueden diferir sistemáticamente antes de la intervención/observación)",
        "Diseño alternativo: igualar grupos en covariables relevantes (matching) o, idealmente, asignación aleatoria si es éticamente posible",
        "Alternativamente, un diseño cuasi-experimental con controles estadísticos explícitos por las variables de selección",
      ],
      keywords: [
        "sesgo de selección",
        "validez interna",
        "matching",
        "asignación aleatoria",
        "diseño cuasi-experimental",
      ],
    },
    competencies: [
      { key: "rigor_metodologico", weight: 2 },
      { key: "pensamiento_critico", weight: 1 },
    ],
  },
  {
    order: 6,
    type: "mc",
    statement: "El preregistro de un estudio tiene como principal función...",
    options: [
      {
        optionKey: "a",
        text: "Impedir cualquier análisis exploratorio de los datos",
        isCorrect: false,
      },
      {
        optionKey: "b",
        text: "Distinguir de manera transparente el análisis confirmatorio planeado a priori del exploratorio",
        isCorrect: true,
      },
      { optionKey: "c", text: "Sustituir la revisión por pares", isCorrect: false },
      {
        optionKey: "d",
        text: "Garantizar automáticamente la replicabilidad del hallazgo",
        isCorrect: false,
      },
    ],
    competencies: [{ key: "etica_investigacion", weight: 1 }],
  },
];

const COMPETENCY_DEFS = [
  {
    key: "pensamiento_critico",
    label: "Pensamiento crítico",
    description: "Capacidad de analizar supuestos, evidencia y alternativas antes de concluir.",
  },
  {
    key: "rigor_metodologico",
    label: "Rigor metodológico",
    description: "Dominio de diseño de investigación, validez y análisis estadístico apropiado.",
  },
  {
    key: "etica_investigacion",
    label: "Ética de la investigación",
    description: "Consideración de riesgos, consentimiento y equidad en el proceso investigativo.",
  },
  {
    key: "comunicacion_academica",
    label: "Comunicación académica y escritura científica",
    description: "Claridad y precisión en la argumentación escrita de nivel doctoral.",
  },
  {
    key: "analisis_critico_social",
    label: "Análisis crítico-social",
    description: "Capacidad de situar fenómenos psicológicos en su contexto social e histórico.",
  },
  {
    key: "autonomia_investigativa",
    label: "Autonomía investigativa",
    description:
      "Capacidad de sostener decisiones metodológicas y éticas propias frente a presiones externas.",
  },
];

// Malla completa del Doctorado en Psicología PUCV (ver PDF adjunto al encargo).
// hasRealContent=true solo en los 2 módulos con contenido/ejercicios/examen
// arriba — el resto son la estructura real de la malla (código, créditos,
// semestre) con contenido pedagógico pendiente de carga (ver README).
const PSICOLOGIA_MODULES: Array<{
  order: number;
  semester: number;
  code: string | null;
  title: string;
  credits: number;
  type: DoctoralModuleType;
  hasRealContent: boolean;
}> = [
  {
    order: 1,
    semester: 1,
    code: "DPSI-7216",
    title: "Psicología y Transformaciones Sociales I",
    credits: 7,
    type: "course",
    hasRealContent: true,
  },
  {
    order: 2,
    semester: 1,
    code: "DPSI-7214",
    title: "Taller de Investigación Cuantitativa",
    credits: 7,
    type: "workshop",
    hasRealContent: true,
  },
  {
    order: 3,
    semester: 1,
    code: "DPSI-7311",
    title: "Seminario de Investigación I",
    credits: 7,
    type: "seminar",
    hasRealContent: false,
  },
  {
    order: 4,
    semester: 1,
    code: "DPSI-7750",
    title: "Tutoría y Coloquio 1",
    credits: 1,
    type: "tutoring",
    hasRealContent: false,
  },
  {
    order: 5,
    semester: 2,
    code: "DPSI-7217",
    title: "Psicología y Transformaciones Sociales II",
    credits: 7,
    type: "course",
    hasRealContent: false,
  },
  {
    order: 6,
    semester: 2,
    code: "DPSI-7212",
    title: "Taller de Investigación Cualitativa",
    credits: 7,
    type: "workshop",
    hasRealContent: false,
  },
  {
    order: 7,
    semester: 2,
    code: "DPSI-7312",
    title: "Seminario de Investigación II",
    credits: 7,
    type: "seminar",
    hasRealContent: false,
  },
  {
    order: 8,
    semester: 2,
    code: "DPSI-7751",
    title: "Tutoría y Coloquio 2",
    credits: 1,
    type: "tutoring",
    hasRealContent: false,
  },
  {
    order: 9,
    semester: 3,
    code: "DPSI-7313",
    title: "Proyecto de Tesis Doctoral I",
    credits: 13,
    type: "thesis_project",
    hasRealContent: false,
  },
  {
    order: 10,
    semester: 3,
    code: null,
    title: "Asignatura Optativa I",
    credits: 4,
    type: "elective",
    hasRealContent: false,
  },
  {
    order: 11,
    semester: 3,
    code: null,
    title: "Asignatura Optativa II",
    credits: 4,
    type: "elective",
    hasRealContent: false,
  },
  {
    order: 12,
    semester: 3,
    code: "DPSI-7752",
    title: "Tutoría y Coloquio 3",
    credits: 1,
    type: "tutoring",
    hasRealContent: false,
  },
  {
    order: 13,
    semester: 4,
    code: "DPSI-7314",
    title: "Proyecto de Tesis Doctoral II",
    credits: 13,
    type: "thesis_project",
    hasRealContent: false,
  },
  {
    order: 14,
    semester: 4,
    code: null,
    title: "Asignatura Optativa III",
    credits: 4,
    type: "elective",
    hasRealContent: false,
  },
  {
    order: 15,
    semester: 4,
    code: null,
    title: "Asignatura Optativa IV",
    credits: 4,
    type: "elective",
    hasRealContent: false,
  },
  {
    order: 16,
    semester: 4,
    code: "DPSI-7753",
    title: "Tutoría y Coloquio 4",
    credits: 1,
    type: "tutoring",
    hasRealContent: false,
  },
  {
    order: 17,
    semester: 4,
    code: null,
    title: "Examen de Calificación",
    credits: 0,
    type: "qualifying_exam",
    hasRealContent: false,
  },
  {
    order: 18,
    semester: 4,
    code: null,
    title: "Defensa de Proyecto de Tesis",
    credits: 0,
    type: "thesis_project",
    hasRealContent: false,
  },
  {
    order: 19,
    semester: 5,
    code: "DPSI-7401",
    title: "Tesis Doctoral 1",
    credits: 21,
    type: "thesis",
    hasRealContent: false,
  },
  {
    order: 20,
    semester: 6,
    code: "DPSI-7402",
    title: "Tesis Doctoral 2",
    credits: 21,
    type: "thesis",
    hasRealContent: false,
  },
  {
    order: 21,
    semester: 6,
    code: null,
    title: "Presentación Estado de Avance Tesis Doctoral",
    credits: 0,
    type: "thesis",
    hasRealContent: false,
  },
  {
    order: 22,
    semester: 7,
    code: "DPSI-7403",
    title: "Tesis Doctoral 3",
    credits: 21,
    type: "thesis",
    hasRealContent: false,
  },
  {
    order: 23,
    semester: 8,
    code: "DPSI-7404",
    title: "Tesis Doctoral 4",
    credits: 21,
    type: "thesis",
    hasRealContent: false,
  },
  {
    order: 24,
    semester: 8,
    code: null,
    title: "Presentación y Defensa de Tesis Doctoral",
    credits: 0,
    type: "thesis",
    hasRealContent: false,
  },
];

export async function seedDoctoral(prisma: PrismaClient): Promise<void> {
  const organization = await prisma.organization.upsert({
    where: { slug: "doctorados-posgrado" },
    update: {},
    create: { name: "Escuela de Posgrado — Doctorados", slug: "doctorados-posgrado" },
  });

  const psicologia = await prisma.doctoralProgram.upsert({
    where: { key: "psicologia" },
    update: {},
    create: {
      organizationId: organization.id,
      key: "psicologia",
      name: "Doctorado en Psicología",
      institution: "Pontificia Universidad Católica de Valparaíso",
      totalSemesters: 8,
    },
  });

  // Segundo doctorado: PROVISORIO — el documento con la malla oficial
  // (programa_del_doctorado.txt) llegó vacío en el encargo. Se siembra una
  // estructura genérica de 8 semestres explícitamente marcada como
  // pendiente, para no bloquear el resto de la plataforma (RBAC, dashboards,
  // motor de ejercicios) mientras se recibe la malla real.
  const psicologiaSalud = await prisma.doctoralProgram.upsert({
    where: { key: "psicologia_salud_calidad_vida" },
    update: {},
    create: {
      organizationId: organization.id,
      key: "psicologia_salud_calidad_vida",
      name: "Doctorado en Psicología, Salud y Calidad de Vida",
      totalSemesters: 8,
    },
  });

  console.log(`[db:seed] Dominio Doctorado: organización ${organization.id} lista.`);

  const competencyIds = new Map<string, string>();
  for (const def of COMPETENCY_DEFS) {
    const row = await prisma.competencyArea.upsert({
      where: { programId_key: { programId: psicologia.id, key: def.key } },
      update: {},
      create: {
        programId: psicologia.id,
        key: def.key,
        label: def.label,
        description: def.description,
      },
    });
    competencyIds.set(def.key, row.id);
  }

  for (const m of PSICOLOGIA_MODULES) {
    const existing = await prisma.programModule.findFirst({
      where: { programId: psicologia.id, order: m.order },
    });
    if (existing) continue;
    await prisma.programModule.create({
      data: {
        programId: psicologia.id,
        code: m.code,
        title: m.title,
        semester: m.semester,
        credits: m.credits,
        type: m.type,
        order: m.order,
        hasRealContent: m.hasRealContent,
      },
    });
  }
  console.log(
    `[db:seed] ${PSICOLOGIA_MODULES.length} módulos de la malla real de Psicología sembrados/verificados.`,
  );

  // 8 módulos-placeholder genéricos para el segundo doctorado, a la espera
  // de su malla oficial — nunca se simula contenido real aquí.
  for (let semester = 1; semester <= 8; semester += 1) {
    const order = semester;
    const existing = await prisma.programModule.findFirst({
      where: { programId: psicologiaSalud.id, order },
    });
    if (existing) continue;
    await prisma.programModule.create({
      data: {
        programId: psicologiaSalud.id,
        code: null,
        title: `Módulo semestre ${semester} — estructura provisoria (pendiente de malla oficial)`,
        semester,
        credits: 0,
        type: "course",
        order,
        hasRealContent: false,
      },
    });
  }
  console.log(
    "[db:seed] Estructura provisoria del segundo doctorado sembrada (pendiente de malla oficial).",
  );

  await seedFullModule(
    prisma,
    psicologia.id,
    "Psicología y Transformaciones Sociales I",
    TOPICS_MODULE_1,
    EXAM_QUESTIONS_MODULE_1,
    competencyIds,
  );
  await seedFullModule(
    prisma,
    psicologia.id,
    "Taller de Investigación Cuantitativa",
    TOPICS_MODULE_2,
    EXAM_QUESTIONS_MODULE_2,
    competencyIds,
  );

  await seedDemoDoctoralAccounts(prisma, organization.id, psicologia.id);
}

async function seedFullModule(
  prisma: PrismaClient,
  programId: string,
  moduleTitle: string,
  topics: TopicSeed[],
  examQuestions: ExamQuestionSeed[],
  competencyIds: Map<string, string>,
): Promise<void> {
  const module = await prisma.programModule.findFirstOrThrow({
    where: { programId, title: moduleTitle },
  });

  // Cada tema/examen se crea dentro de una transacción: si una fila anidada
  // falla a mitad de camino, se revierte por completo — así el chequeo de
  // idempotencia de arriba (skip si ya existe) nunca ve un tema/examen a
  // medio sembrar.
  for (const topic of topics) {
    const existingTopic = await prisma.moduleTopic.findFirst({
      where: { moduleId: module.id, key: topic.key },
      include: { _count: { select: { exercises: true } } },
    });
    if (existingTopic && existingTopic._count.exercises === 0 && topic.exercises.length > 0) {
      // Restos de una corrida anterior interrumpida a mitad del árbol
      // (antes de que este seed usara $transaction) — se limpia y se
      // vuelve a sembrar en vez de quedar atascado para siempre.
      await prisma.moduleConceptContent.deleteMany({ where: { topicId: existingTopic.id } });
      await prisma.moduleTopic.delete({ where: { id: existingTopic.id } });
    } else if (existingTopic) {
      continue;
    }

    await prisma.$transaction(async (tx) => {
      const createdTopic = await tx.moduleTopic.create({
        data: {
          moduleId: module.id,
          key: topic.key,
          title: topic.title,
          order: topic.order,
          conceptContent: {
            create: {
              status: "published",
              summary: topic.summary,
              body: topic.body,
              keyIdeas: topic.keyIdeas,
              publishedAt: new Date(),
            },
          },
        },
      });

      for (const ex of topic.exercises) {
        const createdExercise = await tx.doctoralExercise.create({
          data: {
            topicId: createdTopic.id,
            key: ex.key,
            type: ex.type,
            difficulty: ex.difficulty,
            order: ex.order,
            scenario: ex.scenario,
            statement: ex.statement,
            modelAnswer: ex.modelAnswer,
            status: "published",
            options: ex.options
              ? { create: ex.options.map((o, i) => ({ ...o, order: i + 1 })) }
              : undefined,
            hints: { create: ex.hints },
          },
        });
        for (const c of ex.competencies) {
          const competencyAreaId = competencyIds.get(c.key);
          if (!competencyAreaId) continue;
          await tx.exerciseCompetencyWeight.create({
            data: { exerciseId: createdExercise.id, competencyAreaId, weight: c.weight },
          });
        }
      }
    });
  }
  console.log(
    `[db:seed] Contenido conceptual/ejercicios de "${moduleTitle}" sembrado (${topics.length} temas).`,
  );

  const existingExam = await prisma.doctoralExam.findUnique({ where: { moduleId: module.id } });
  if (!existingExam) {
    await prisma.$transaction(async (tx) => {
      const createdExam = await tx.doctoralExam.create({
        data: {
          moduleId: module.id,
          title: `Prueba sin ayuda — ${moduleTitle}`,
          questionCount: examQuestions.length,
          timeLimitMinutes: 60,
          minScore: 10,
          maxScore: 70,
          passScore: 40,
        },
      });
      for (const q of examQuestions) {
        const createdQuestion = await tx.doctoralExamQuestion.create({
          data: {
            examId: createdExam.id,
            order: q.order,
            type: q.type,
            statement: q.statement,
            scenario: q.scenario,
            modelAnswer: q.modelAnswer,
            options: q.options
              ? { create: q.options.map((o, i) => ({ ...o, order: i + 1 })) }
              : undefined,
          },
        });
        for (const c of q.competencies) {
          const competencyAreaId = competencyIds.get(c.key);
          if (!competencyAreaId) continue;
          await tx.doctoralExamQuestionCompetencyWeight.create({
            data: { questionId: createdQuestion.id, competencyAreaId, weight: c.weight },
          });
        }
      }
    });
    console.log(
      `[db:seed] Examen final ("prueba sin ayuda", nota 10-70) de "${moduleTitle}" sembrado (${examQuestions.length} preguntas).`,
    );
  }

  const existingSurvey = await prisma.doctoralModuleSurvey.findUnique({
    where: { moduleId: module.id },
  });
  if (!existingSurvey) {
    await prisma.doctoralModuleSurvey.create({
      data: {
        moduleId: module.id,
        title: "Encuesta de cierre de módulo",
        questions: { create: SURVEY_QUESTIONS },
      },
    });
    console.log(`[db:seed] Encuesta de cierre de "${moduleTitle}" sembrada.`);
  }
}

async function grantRoleIfMissing(
  prisma: PrismaClient,
  userId: string,
  roleId: string,
  organizationId: string,
): Promise<void> {
  const existing = await prisma.userRole.findFirst({
    where: { userId, roleId, organizationId },
  });
  if (!existing) {
    await prisma.userRole.create({ data: { userId, roleId, organizationId } });
  }
}

async function seedDemoDoctoralAccounts(
  prisma: PrismaClient,
  organizationId: string,
  psicologiaProgramId: string,
): Promise<void> {
  if (process.env.NODE_ENV === "production") {
    console.warn(
      "[db:seed] NODE_ENV=production — se omiten las cuentas demo del Dominio Doctorado.",
    );
    return;
  }

  const passwordHash = await argon2.hash(DEMO_DOCTORAL_PASSWORD, { type: argon2.argon2id });

  const [adminRole, professorRole, studentRole] = await Promise.all([
    prisma.role.findUniqueOrThrow({ where: { key: "doctoral_admin" } }),
    prisma.role.findUniqueOrThrow({ where: { key: "doctoral_professor" } }),
    prisma.role.findUniqueOrThrow({ where: { key: "doctoral_student" } }),
  ]);

  const adminUser = await prisma.user.upsert({
    where: { email: DEMO_DOCTORAL_ADMIN_EMAIL },
    update: {},
    create: { email: DEMO_DOCTORAL_ADMIN_EMAIL, passwordHash, status: "active" },
  });
  await grantRoleIfMissing(prisma, adminUser.id, adminRole.id, organizationId);

  const professorUser = await prisma.user.upsert({
    where: { email: DEMO_DOCTORAL_PROFESSOR_EMAIL },
    update: {},
    create: { email: DEMO_DOCTORAL_PROFESSOR_EMAIL, passwordHash, status: "active" },
  });
  await grantRoleIfMissing(prisma, professorUser.id, professorRole.id, organizationId);
  const professorProfile = await prisma.doctoralProfessorProfile.upsert({
    where: { userId: professorUser.id },
    update: {},
    create: { userId: professorUser.id, organizationId, displayName: "Docente Demo Doctorado" },
  });

  const studentUser = await prisma.user.upsert({
    where: { email: DEMO_DOCTORAL_STUDENT_EMAIL },
    update: {},
    create: { email: DEMO_DOCTORAL_STUDENT_EMAIL, passwordHash, status: "active" },
  });
  await grantRoleIfMissing(prisma, studentUser.id, studentRole.id, organizationId);
  const studentProfile = await prisma.doctoralStudentProfile.upsert({
    where: { userId: studentUser.id },
    update: {},
    create: { userId: studentUser.id, organizationId, displayName: "Estudiante Demo Doctorado" },
  });

  let cohort = await prisma.doctoralCohort.findFirst({
    where: { programId: psicologiaProgramId, name: "Cohorte 2026" },
  });
  if (!cohort) {
    cohort = await prisma.doctoralCohort.create({
      data: { programId: psicologiaProgramId, name: "Cohorte 2026", startYear: 2026 },
    });
  }

  await prisma.doctoralCohortProfessor.upsert({
    where: {
      cohortId_doctoralProfessorProfileId: {
        cohortId: cohort.id,
        doctoralProfessorProfileId: professorProfile.id,
      },
    },
    update: {},
    create: { cohortId: cohort.id, doctoralProfessorProfileId: professorProfile.id },
  });
  await prisma.doctoralCohortStudent.upsert({
    where: {
      cohortId_doctoralStudentProfileId: {
        cohortId: cohort.id,
        doctoralStudentProfileId: studentProfile.id,
      },
    },
    update: {},
    create: { cohortId: cohort.id, doctoralStudentProfileId: studentProfile.id },
  });

  const seededModules = await prisma.programModule.findMany({
    where: { programId: psicologiaProgramId, hasRealContent: true },
  });
  for (const m of seededModules) {
    await prisma.doctoralModuleEnrollment.upsert({
      where: {
        doctoralStudentProfileId_moduleId: {
          doctoralStudentProfileId: studentProfile.id,
          moduleId: m.id,
        },
      },
      update: {},
      create: {
        doctoralStudentProfileId: studentProfile.id,
        moduleId: m.id,
        status: "in_progress",
      },
    });
  }

  console.log(
    "[db:seed] Cuentas demo del Dominio Doctorado listas (ver constants.ts para credenciales).",
  );
}
