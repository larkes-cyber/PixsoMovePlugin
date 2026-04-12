import type {
  DetailedExportPayload,
  OptimizedExportPayload,
  OptimizedNode,
  OptimizedSummary,
  OptimizedTextStyle,
  SafeColor,
  SerializedNode
} from './types';

/**
 * Преобразует подробный экспорт в компактный формат, более дружелюбный для слабых LLM.
 *
 * Функция сохраняет служебные метаданные в корне payload, но радикально упрощает
 * дерево узлов: отбрасывает шумные поля, нормализует цвета/размеры в CSS-подобный вид,
 * собирает список текстов и добавляет summary для быстрого ориентирования модели.
 */
export const createOptimizedExportPayload = (payload: DetailedExportPayload): OptimizedExportPayload => {
  const optimizedNodes = payload.nodes.map(optimizeNode).filter(isDefined);
  const textElements = collectTextElements(optimizedNodes);

  return {
    projectName: payload.projectName,
    pageName: payload.pageName,
    pageId: payload.pageId,
    timestamp: payload.timestamp,
    userInfo: payload.userInfo,
    designSystem: payload.designSystem,
    previewImage: payload.previewImage,
    summary: buildSummary(optimizedNodes),
    textElements,
    nodes: optimizedNodes
  };
};

/**
 * Упрощает один сериализованный узел до компактного представления для LLM.
 *
 * Здесь же вычисляется "роль" узла, конвертируются геометрия и стили,
 * а также рекурсивно упрощаются дети. Невидимые узлы отбрасываются целиком.
 */
const optimizeNode = (node: SerializedNode): OptimizedNode | null => {
  if (node.visible === false) {
    return null;
  }

  const children = node.children.map(optimizeNode).filter(isDefined);
  const text = sanitizeText(node.text?.characters ?? null);
  const fills = optimizeFills(node.fills);
  const strokes = optimizeStrokes(node.strokes);
  const effects = optimizeEffects(node.effects);
  const optimizedNode: OptimizedNode = {
    kind: (node.type ?? 'unknown').toLowerCase(),
    role: inferNodeRole(node, text),
    x: roundNumber(node.x),
    y: roundNumber(node.y),
    w: roundNumber(node.width),
    h: roundNumber(node.height)
  };

  if (node.name && node.name !== text) {
    optimizedNode.name = node.name;
  }

  if (text) {
    optimizedNode.text = text;
  }

  if (typeof node.cornerRadius === 'number' && node.cornerRadius > 0) {
    optimizedNode.radius = roundNumber(node.cornerRadius);
  }

  if (fills.length > 0) {
    optimizedNode.fills = fills;
  }

  if (strokes.length > 0) {
    optimizedNode.strokes = strokes;
  }

  if (effects.length > 0) {
    optimizedNode.effects = effects;
  }

  if (node.text?.style) {
    optimizedNode.textStyle = optimizeTextStyle(node.text.style);
    optimizedNode.textColor = findPrimaryTextColor(node);
  }

  if (children.length > 0) {
    optimizedNode.children = children;
  }

  return optimizedNode;
};

const optimizeFills = (fills: SerializedNode['fills']): string[] =>
  fills
    .map(fill => {
      if (fill.type === 'SOLID') {
        return serializeColorCss(fill.color, fill.opacity);
      }

      if (fill.type && fill.type.startsWith('GRADIENT')) {
        return `gradient:${fill.type.toLowerCase()}`;
      }

      return fill.type ? fill.type.toLowerCase() : null;
    })
    .filter(isDefined);

const optimizeStrokes = (strokes: SerializedNode['strokes']): string[] =>
  strokes
    .map(stroke => {
      const color = serializeColorCss(stroke.color, stroke.opacity);
      const weight = typeof stroke.strokeWeight === 'number' ? `${roundNumber(stroke.strokeWeight)}px` : null;

      if (!color && !weight) {
        return null;
      }

      return [weight, color].filter(isDefined).join(' ');
    })
    .filter(isDefined);

const optimizeEffects = (effects: SerializedNode['effects']): string[] =>
  effects
    .map(effect => {
      const color = serializeColorCss(effect.color, null);
      const radius = typeof effect.radius === 'number' ? `${roundNumber(effect.radius)}px` : null;
      const effectType = effect.type ? effect.type.toLowerCase() : null;

      return [effectType, radius, color].filter(isDefined).join(' ') || null;
    })
    .filter(isDefined);

/**
 * Переводит подробный текстовый стиль в короткую CSS-подобную форму.
 *
 * Нюанс: здесь намеренно используются строковые значения вроде `16px` и `120%`,
 * потому что для слабой модели они проще, чем разнесённые по полям число + unit.
 */
const optimizeTextStyle = (style: NonNullable<SerializedNode['text']>['style']): OptimizedTextStyle => ({
  fontFamily: style.fontFamily,
  fontSize: typeof style.fontSize === 'number' ? `${roundNumber(style.fontSize)}px` : null,
  fontWeight: style.fontWeight,
  fontStyle: style.fontStyle,
  lineHeight: serializeUnitValue(style.lineHeight, style.lineHeightUnit),
  letterSpacing: serializeUnitValue(style.letterSpacing, style.letterSpacingUnit),
  textAlign: normalizeCase(style.textAlignHorizontal),
  verticalAlign: normalizeCase(style.textAlignVertical),
  textCase: normalizeCase(style.textCase),
  textDecoration: normalizeCase(style.textDecoration)
});

/**
 * Пытается определить основной текстовый цвет по первому solid-fill.
 *
 * Это эвристика: если у текста сложная заливка, градиент или несколько слоёв,
 * результат будет намеренно упрощённым, а не пиксельно точным.
 */
const findPrimaryTextColor = (node: SerializedNode): string | null =>
  node.fills.find(fill => fill.type === 'SOLID') ? serializeColorCss(node.fills.find(fill => fill.type === 'SOLID')?.color ?? null, node.fills.find(fill => fill.type === 'SOLID')?.opacity ?? null) : null;

const serializeUnitValue = (value: number | null, unit: string | null): string | null => {
  if (unit === 'AUTO') {
    return 'auto';
  }

  if (typeof value !== 'number' || !unit) {
    return null;
  }

  if (unit === 'PIXELS') {
    return `${roundNumber(value)}px`;
  }

  if (unit === 'PERCENT') {
    return `${roundNumber(value)}%`;
  }

  return `${roundNumber(value)} ${unit.toLowerCase()}`;
};

const serializeColorCss = (color: SafeColor | null, opacity: number | null): string | null => {
  if (!color || typeof color.r !== 'number' || typeof color.g !== 'number' || typeof color.b !== 'number') {
    return null;
  }

  const red = Math.round(color.r * 255);
  const green = Math.round(color.g * 255);
  const blue = Math.round(color.b * 255);
  const alpha = typeof opacity === 'number' ? clampAlpha(opacity) : typeof color.a === 'number' ? clampAlpha(color.a) : 1;

  return `rgba(${red}, ${green}, ${blue}, ${roundNumber(alpha)})`;
};

const clampAlpha = (value: number): number => Math.max(0, Math.min(1, value));

const sanitizeText = (value: string | null): string | null => {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();

  return trimmed.length > 0 ? trimmed : null;
};

/**
 * Определяет примерную семантическую роль узла для подсказки LLM.
 *
 * Это не строгая классификация, а набор эвристик: числа и денежные суммы считаются `value`,
 * характерные подписи — `label`, логотипы карт — `logo` и т.д.
 */
const inferNodeRole = (node: SerializedNode, text: string | null): OptimizedNode['role'] => {
  const type = node.type ?? '';
  const name = (node.name ?? '').toLowerCase();
  const textValue = (text ?? '').toLowerCase();

  if (type === 'TEXT') {
    if (/\$|€|£|\d/.test(textValue) || /\d{2}\/\d{2}/.test(textValue)) {
      return 'value';
    }

    if (textValue.includes('available') || textValue.includes('balance') || textValue.includes('label')) {
      return 'label';
    }

    return 'text';
  }

  if (type === 'VECTOR') {
    if (name.includes('visa') || name.includes('mastercard') || name.includes('logo')) {
      return 'logo';
    }

    return 'icon';
  }

  if (type === 'FRAME' || type === 'GROUP' || type === 'COMPONENT' || type === 'INSTANCE') {
    return 'container';
  }

  if (type === 'RECTANGLE' && typeof node.cornerRadius === 'number' && node.cornerRadius > 0) {
    return 'background';
  }

  return 'shape';
};

/**
 * Собирает плоский список всех видимых текстов из оптимизированного дерева.
 *
 * Этот список нужен как дополнительная страховка: даже если модель плохо справляется
 * с глубокой вложенностью, она всё равно видит отдельный перечень обязательных текстовых элементов.
 */
const collectTextElements = (nodes: OptimizedNode[]): string[] => {
  const result: string[] = [];

  nodes.forEach(node => {
    if (node.text) {
      result.push(node.text);
    }

    if (node.children) {
      result.push(...collectTextElements(node.children));
    }
  });

  return result;
};

/**
 * Подсчитывает простую статистику по оптимизированному дереву.
 *
 * Summary задуман как "быстрая карта сцены" для модели и внешних сервисов:
 * по нему можно понять, сколько в макете текста, векторов, контейнеров и прочих узлов.
 */
const buildSummary = (nodes: OptimizedNode[]): OptimizedSummary => {
  const summary: OptimizedSummary = {
    nodeCount: 0,
    textCount: 0,
    shapeCount: 0,
    vectorCount: 0,
    containerCount: 0
  };

  const visit = (node: OptimizedNode) => {
    summary.nodeCount += 1;

    if (node.kind === 'text') {
      summary.textCount += 1;
    } else if (node.kind === 'vector') {
      summary.vectorCount += 1;
    } else if (node.role === 'container') {
      summary.containerCount += 1;
    } else {
      summary.shapeCount += 1;
    }

    node.children?.forEach(visit);
  };

  nodes.forEach(visit);

  return summary;
};

const roundNumber = (value: number | null): number => {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return 0;
  }

  return Math.round(value * 10) / 10;
};

const normalizeCase = (value: string | null): string | null => (value ? value.toLowerCase() : null);

const isDefined = <T>(value: T | null | undefined): value is T => value !== null && value !== undefined;
