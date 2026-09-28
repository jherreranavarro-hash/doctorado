import { Injectable } from '@nestjs/common';

/**
 * Motor de evaluación semántica — HEURÍSTICO v1, no un modelo de NLP/embeddings
 * real. Corrige respuestas abiertas (short_answer/case_analysis) contra una
 * rúbrica de puntos clave + palabras clave usando cobertura léxica
 * normalizada (sin acentos/puntuación, filtrando palabras vacías), no
 * similitud semántica vectorial.
 *
 * Se documenta así a propósito (mismo criterio que el resto del repo: nunca
 * simular una capacidad que no existe) — el diseño en dos partes
 * (SemanticRubric de entrada, SemanticGradingResult de salida estable) deja
 * un punto de reemplazo limpio: cambiar la implementación interna de
 * `gradeFreeText` por una llamada a un modelo de embeddings o a un LLM
 * evaluador no requiere tocar ningún caller (DoctoralLearningService,
 * exámenes, etc.), porque el contrato público no cambia.
 */

export interface SemanticRubric {
  keyPoints: string[];
  keywords: string[];
}

export interface SemanticGradingResult {
  score: number; // 0-100
  passed: boolean;
  feedback: string;
  matchedKeyPoints: string[];
  missedKeyPoints: string[];
}

const PASS_THRESHOLD = 60;
const KEY_POINT_WEIGHT = 0.65;
const KEYWORD_WEIGHT = 0.35;
const KEY_POINT_TERM_MIN_LENGTH = 4;
const KEY_POINT_MATCH_RATIO = 0.4;

const SPANISH_STOPWORDS = new Set([
  'el',
  'la',
  'los',
  'las',
  'un',
  'una',
  'unos',
  'unas',
  'de',
  'del',
  'al',
  'a',
  'ante',
  'bajo',
  'con',
  'contra',
  'desde',
  'en',
  'entre',
  'hacia',
  'hasta',
  'para',
  'por',
  'segun',
  'sin',
  'sobre',
  'tras',
  'y',
  'o',
  'u',
  'que',
  'como',
  'cuando',
  'donde',
  'porque',
  'pero',
  'si',
  'no',
  'se',
  'su',
  'sus',
  'lo',
  'le',
  'les',
  'es',
  'son',
  'ser',
  'esta',
  'este',
  'estos',
  'estas',
  'ese',
  'esa',
  'esos',
  'esas',
  'mas',
  'muy',
  'ya',
  'tambien',
]);

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // quita acentos
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function significantTokens(normalized: string, minLength: number): string[] {
  return normalized
    .split(' ')
    .filter((t) => t.length >= minLength && !SPANISH_STOPWORDS.has(t));
}

@Injectable()
export class SemanticGradingService {
  static readonly PASS_THRESHOLD = PASS_THRESHOLD;

  gradeFreeText(
    responseText: string | null | undefined,
    rubric: SemanticRubric | null | undefined,
  ): SemanticGradingResult {
    const hasKeyPoints = Boolean(rubric?.keyPoints?.length);
    const hasKeywords = Boolean(rubric?.keywords?.length);

    if (!rubric || (!hasKeyPoints && !hasKeywords)) {
      return {
        score: 0,
        passed: false,
        feedback:
          'Esta pregunta no tiene una rúbrica configurada para corrección automática.',
        matchedKeyPoints: [],
        missedKeyPoints: [],
      };
    }

    const normalizedResponse = normalize(responseText ?? '');
    const responseTokens = new Set(significantTokens(normalizedResponse, 3));

    const matchedKeyPoints: string[] = [];
    const missedKeyPoints: string[] = [];
    for (const keyPoint of rubric.keyPoints) {
      const terms = significantTokens(
        normalize(keyPoint),
        KEY_POINT_TERM_MIN_LENGTH,
      );
      if (terms.length === 0) continue;
      const hits = terms.filter((t) => responseTokens.has(t)).length;
      const ratio = hits / terms.length;
      if (ratio >= KEY_POINT_MATCH_RATIO) {
        matchedKeyPoints.push(keyPoint);
      } else {
        missedKeyPoints.push(keyPoint);
      }
    }

    let matchedKeywordCount = 0;
    for (const keyword of rubric.keywords) {
      const normalizedKeyword = normalize(keyword);
      if (!normalizedKeyword) continue;
      const asPhrase = normalizedResponse.includes(normalizedKeyword);
      if (asPhrase) {
        matchedKeywordCount += 1;
        continue;
      }
      const terms = significantTokens(normalizedKeyword, 3);
      if (terms.length === 0) continue;
      const hits = terms.filter((t) => responseTokens.has(t)).length;
      if (hits / terms.length >= 0.7) {
        matchedKeywordCount += 1;
      }
    }

    const keyPointRatio = hasKeyPoints
      ? matchedKeyPoints.length / rubric.keyPoints.length
      : null;
    const keywordRatio = hasKeywords
      ? matchedKeywordCount / rubric.keywords.length
      : null;

    let score: number;
    if (keyPointRatio !== null && keywordRatio !== null) {
      score =
        keyPointRatio * KEY_POINT_WEIGHT * 100 +
        keywordRatio * KEYWORD_WEIGHT * 100;
    } else if (keyPointRatio !== null) {
      score = keyPointRatio * 100;
    } else {
      score = (keywordRatio ?? 0) * 100;
    }
    score = Math.round(Math.max(0, Math.min(100, score)));

    let feedback: string;
    if (matchedKeyPoints.length === 0 && missedKeyPoints.length > 0) {
      feedback =
        'No se detectó cobertura de los puntos clave esperados en tu respuesta.';
    } else if (missedKeyPoints.length === 0) {
      feedback = 'Cubriste los puntos clave esperados en tu respuesta.';
    } else {
      feedback = `Cubriste: ${matchedKeyPoints.join('; ')}. Te faltó abordar: ${missedKeyPoints.join('; ')}.`;
    }

    return {
      score,
      passed: score >= PASS_THRESHOLD,
      feedback,
      matchedKeyPoints,
      missedKeyPoints,
    };
  }
}
