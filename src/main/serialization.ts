import { isDefined, safeArray, safeBoolean, safeNumber, safeString } from './helpers';
import type {
  ExportableFrameNode,
  MaybeSceneNode,
  SafeColor,
  SerializedNode,
  SerializedTextStyle,
  VisualGraphNode
} from './types';

type SerializeOptions = {
  includePreview: boolean;
  shouldAbort?: () => boolean;
  yieldControl?: () => Promise<void>;
  yieldEvery?: number;
};

type SerializeRuntimeOptions = {
  shouldAbort: () => boolean;
  yieldControl: () => Promise<void>;
  yieldEvery: number;
  visitedNodes: number;
};

/**
 * Сериализует Pixso-узел в безопасный JSON-совместимый объект.
 *
 * Дополнительно умеет прикреплять PNG-preview только к корневому frame-узлу,
 * если это явно разрешено через `includePreview`. Для дочерних узлов preview
 * принудительно отключается, чтобы экспорт содержал максимум одно изображение.
 */
export const serializeNodeWithImage = async (node: SceneNode, options: SerializeOptions): Promise<SerializedNode | null> => {
  const runtime: SerializeRuntimeOptions = {
    shouldAbort: options.shouldAbort ?? (() => false),
    yieldControl: options.yieldControl ?? (async () => {}),
    yieldEvery: Math.max(1, options.yieldEvery ?? 40),
    visitedNodes: 0
  };

  return serializeNodeWithImageInternal(node, options, runtime);
};

const serializeNodeWithImageInternal = async (
  node: SceneNode,
  options: SerializeOptions,
  runtime: SerializeRuntimeOptions
): Promise<SerializedNode | null> => {
  if (runtime.shouldAbort()) {
    throw new Error('EXPORT_CANCELLED');
  }

  runtime.visitedNodes += 1;
  if (runtime.visitedNodes % runtime.yieldEvery === 0) {
    await runtime.yieldControl();
  }

  if (runtime.shouldAbort()) {
    throw new Error('EXPORT_CANCELLED');
  }

  const base = serializeNode(node);
  if (!base) {
    return null;
  }

  if (options.includePreview && node.type === 'FRAME') {
    try {
      base.previewImage = await exportFrameImage(node as ExportableFrameNode);
    } catch {
      base.previewImage = null;
    }
  }

  if ('children' in node && Array.isArray(node.children) && node.children.length > 0) {
    const children: SerializedNode[] = [];

    for (const child of node.children) {
      const serializedChild = await serializeNodeWithImageInternal(
        child,
        {
          includePreview: false,
          shouldAbort: options.shouldAbort,
          yieldControl: options.yieldControl,
          yieldEvery: options.yieldEvery
        },
        runtime
      );

      if (isDefined(serializedChild)) {
        children.push(serializedChild);
      }
    }

    base.children = children;
  }

  return base;
};

/**
 * Строит сильно упрощённый граф структуры для отладочных/аналитических задач.
 *
 * В граф попадают только контейнерные узлы. Для HTML-генерации он вторичен,
 * но может быть полезен для внешних сервисов или диагностики структуры.
 */
export const extractVisualGraph = (node: SceneNode, depth: number): VisualGraphNode | null => {
  if (!['FRAME', 'GROUP', 'COMPONENT', 'INSTANCE'].includes(node.type)) {
    return null;
  }

  const children =
    'children' in node ? safeArray(node.children, child => extractVisualGraph(child as SceneNode, depth + 1)) : [];

  return {
    id: safeString(node.id),
    n: safeString(node.name),
    t: safeString(node.type),
    d: depth,
    c: children.length > 0 ? children : null
  };
};

/**
 * Экспортирует preview текущего выделения для UI.
 *
 * Нюанс: preview доступен только если выбран ровно один frame. Это отдельный путь
 * от основного экспорта JSON, чтобы UI мог показывать картинку сразу при смене выделения.
 */
export const exportSelectionPreview = async (
  selection: readonly SceneNode[],
  options?: {
    shouldAbort?: () => boolean;
    format?: 'JPG' | 'PNG';
    constraint?: {
      type: 'SCALE' | 'WIDTH' | 'HEIGHT';
      value: number;
    };
    contentsOnly?: boolean;
    useAbsoluteBounds?: boolean;
  }
): Promise<Uint8Array | null> => {
  if (selection.length !== 1) {
    return null;
  }

  const shouldAbort = options?.shouldAbort ?? (() => false);
  if (shouldAbort()) {
    throw new Error('EXPORT_CANCELLED');
  }

  const [node] = selection;
  if (!isExportableNode(node)) {
    return null;
  }

  try {
    const bytes = await node.exportAsync({
      format: options?.format ?? 'JPG',
      constraint: options?.constraint ?? {
        type: 'WIDTH',
        value: 320
      },
      contentsOnly: options?.contentsOnly ?? true,
      useAbsoluteBounds: options?.useAbsoluteBounds ?? false
    });

    if (shouldAbort()) {
      throw new Error('EXPORT_CANCELLED');
    }

    return new Uint8Array(bytes);
  } catch (error) {
    if (error instanceof Error && error.message === 'EXPORT_CANCELLED') {
      throw error;
    }

    return null;
  }
};

const isExportableNode = (node: SceneNode): node is SceneNode & ExportMixin =>
  'exportAsync' in node && typeof (node as ExportMixin).exportAsync === 'function';

const exportFrameImage = async (frame: ExportableFrameNode): Promise<string> => {
  const bytes = await frame.exportAsync({
    format: 'PNG',
    constraint: { type: 'SCALE', value: 1 }
  });

  return uint8ToBase64(bytes);
};

const uint8ToBase64 = (bytes: Uint8Array): string => {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  let output = '';

  for (let index = 0; index < bytes.length; index += 3) {
    const byte1 = bytes[index] ?? 0;
    const byte2 = bytes[index + 1] ?? 0;
    const byte3 = bytes[index + 2] ?? 0;
    const combined = (byte1 << 16) | (byte2 << 8) | byte3;

    output += alphabet[(combined >> 18) & 63];
    output += alphabet[(combined >> 12) & 63];
    output += index + 1 < bytes.length ? alphabet[(combined >> 6) & 63] : '=';
    output += index + 2 < bytes.length ? alphabet[combined & 63] : '=';
  }

  return output;
};

/**
 * Выполняет основную сериализацию свойств узла в подробный JSON.
 *
 * Здесь мы сознательно читаем только те поля, которые безопасно сериализуются
 * и не зависят от живых объектов Pixso API. Все вложенные структуры также приводятся
 * к plain-object виду, чтобы payload можно было без сюрпризов отправлять на backend.
 */
const serializeNode = (node: MaybeSceneNode | null | undefined): SerializedNode | null => {
  if (!node) {
    return null;
  }

  const children = 'children' in node ? safeArray(node.children, serializeNode) : [];
  const result: SerializedNode = {
    id: safeString(node.id),
    name: safeString(node.name),
    type: safeString(node.type),
    visible: safeBoolean(node.visible),
    locked: safeBoolean(node.locked),
    x: safeNumber('x' in node ? node.x : null),
    y: safeNumber('y' in node ? node.y : null),
    width: safeNumber('width' in node ? node.width : null),
    height: safeNumber('height' in node ? node.height : null),
    opacity: safeNumber('opacity' in node ? node.opacity : null),
    rotation: safeNumber('rotation' in node ? node.rotation : null),
    layoutMode: safeString('layoutMode' in node ? node.layoutMode : null),
    blendMode: safeString('blendMode' in node ? node.blendMode : null),
    isMask: Boolean('isMask' in node ? node.isMask : false),
    layoutAlign: safeString('layoutAlign' in node ? node.layoutAlign : null),
    layoutGrow: safeNumber('layoutGrow' in node ? node.layoutGrow : null),
    itemSpacing: safeNumber('itemSpacing' in node ? node.itemSpacing : null),
    prototypeStartNodeId: safeString('prototypeStartNodeId' in node ? node.prototypeStartNodeId : null),
    description: safeString('description' in node ? node.description : null),
    key: safeString('key' in node ? node.key : null),
    remote: safeBoolean('remote' in node ? node.remote : null),
    padding: readPadding(node),
    constraints: readConstraints(node),
    absoluteBoundingBox: readAbsoluteBoundingBox(node),
    fills: safeArray('fills' in node ? node.fills : undefined, paint =>
      serializePaint(paint as Record<string, unknown>)
    ),
    strokes: safeArray('strokes' in node ? node.strokes : undefined, stroke =>
      serializeStroke(stroke as Record<string, unknown>)
    ),
    effects: safeArray('effects' in node ? node.effects : undefined, effect =>
      serializeEffect(effect as Record<string, unknown>)
    ),
    text:
      'characters' in node && typeof node.characters === 'string'
        ? {
            characters: safeString(node.characters),
            style: readTextStyle(node)
          }
        : null,
    children,
    exportSettings: readExportSettings(node),
    cornerRadius: safeNumber('cornerRadius' in node ? node.cornerRadius : null),
    childrenCount: children.length,
    fillStyleId: safeString('fillStyleId' in node ? node.fillStyleId : null),
    strokeStyleId: safeString('strokeStyleId' in node ? node.strokeStyleId : null),
    effectStyleId: safeString('effectStyleId' in node ? node.effectStyleId : null),
    transformStyle: safeString('transformStyle' in node ? node.transformStyle : null),
    layoutGrids: 'layoutGrids' in node ? (node.layoutGrids ?? null) : null,
    pluginData: readPluginData(node),
    sharedPluginData: readSharedPluginData(node)
  };

  if (node.type === 'COMPONENT' || node.type === 'COMPONENT_SET') {
    result.componentPropertyDefinitions =
      'componentPropertyDefinitions' in node ? (node.componentPropertyDefinitions ?? null) : null;
    result.variantProperties = 'variantProperties' in node ? (node.variantProperties ?? null) : null;
  }

  if (node.type === 'INSTANCE') {
    result.mainComponent =
      'mainComponent' in node && node.mainComponent
        ? {
            id: safeString(node.mainComponent.id),
            name: safeString(node.mainComponent.name),
            key: safeString((node.mainComponent as { key?: unknown }).key),
            description: safeString((node.mainComponent as { description?: unknown }).description)
          }
        : null;
    result.componentProperties = 'componentProperties' in node ? (node.componentProperties ?? null) : null;
    result.variantProperties = 'variantProperties' in node ? (node.variantProperties ?? null) : null;
  }

  return result;
};

const readPadding = (node: MaybeSceneNode): SerializedNode['padding'] => {
  if (!('padding' in node) || !node.padding) {
    return null;
  }

  const padding = node.padding as {
    top?: unknown;
    right?: unknown;
    bottom?: unknown;
    left?: unknown;
  };

  return {
    top: safeNumber(padding.top),
    right: safeNumber(padding.right),
    bottom: safeNumber(padding.bottom),
    left: safeNumber(padding.left)
  };
};

const readConstraints = (node: MaybeSceneNode): SerializedNode['constraints'] => {
  if (!('constraints' in node) || !node.constraints) {
    return null;
  }

  const constraints = node.constraints as {
    horizontal?: unknown;
    vertical?: unknown;
  };

  return {
    horizontal: safeString(constraints.horizontal),
    vertical: safeString(constraints.vertical)
  };
};

const readAbsoluteBoundingBox = (node: MaybeSceneNode): SerializedNode['absoluteBoundingBox'] => {
  if (!('absoluteBoundingBox' in node) || !node.absoluteBoundingBox) {
    return null;
  }

  return {
    x: safeNumber(node.absoluteBoundingBox.x),
    y: safeNumber(node.absoluteBoundingBox.y),
    width: safeNumber(node.absoluteBoundingBox.width),
    height: safeNumber(node.absoluteBoundingBox.height)
  };
};

const serializeColor = (color: unknown): SafeColor | null => {
  if (!color || typeof color !== 'object') {
    return null;
  }

  const safeColor = color as Record<string, unknown>;

  return {
    r: safeNumber(safeColor.r),
    g: safeNumber(safeColor.g),
    b: safeNumber(safeColor.b),
    a: safeNumber(safeColor.a)
  };
};

const serializePaint = (paint: Record<string, unknown>) => ({
  type: safeString(paint.type),
  visible: safeBoolean(paint.visible),
  blendMode: safeString(paint.blendMode),
  opacity: safeNumber(paint.opacity),
  color: serializeColor(paint.color)
});

const serializeStroke = (stroke: Record<string, unknown>) => ({
  type: safeString(stroke.type),
  visible: safeBoolean(stroke.visible),
  blendMode: safeString(stroke.blendMode),
  opacity: safeNumber(stroke.opacity),
  color: serializeColor(stroke.color),
  strokeWeight: safeNumber(stroke.strokeWeight),
  strokeAlign: safeString(stroke.strokeAlign),
  strokeCap: safeString(stroke.strokeCap),
  strokeJoin: safeString(stroke.strokeJoin)
});

const serializeEffect = (effect: Record<string, unknown>) => ({
  type: safeString(effect.type),
  visible: safeBoolean(effect.visible),
  radius: safeNumber(effect.radius),
  color: serializeColor(effect.color)
});

/**
 * Извлекает текстовый стиль напрямую из `TextNode`.
 *
 * Важный нюанс: в Pixso текстовые стили лежат не в `node.style`, а в полях самого
 * текстового узла (`fontName`, `fontSize`, `lineHeight`, `letterSpacing` и т.д.).
 * Поэтому любые попытки читать вложенный `style` для текста будут давать `null`.
 */
const readTextStyle = (node: MaybeSceneNode): SerializedTextStyle | null => {
  if (node.type !== 'TEXT') {
    return null;
  }

  const fontName = readFontName(node.fontName);
  const letterSpacing = readLetterSpacing(node.letterSpacing);
  const lineHeight = readLineHeight(node.lineHeight);

  return {
    fontFamily: fontName?.family ?? null,
    fontSize: readMixedNumber(node.fontSize),
    fontWeight: null,
    fontStyle: fontName?.style ?? null,
    lineHeight: lineHeight?.value ?? null,
    lineHeightUnit: lineHeight?.unit ?? null,
    letterSpacing: letterSpacing?.value ?? null,
    letterSpacingUnit: letterSpacing?.unit ?? null,
    textAlignHorizontal: safeString(node.textAlignHorizontal),
    textAlignVertical: safeString(node.textAlignVertical),
    paragraphSpacing: safeNumber(node.paragraphSpacing),
    textCase: readMixedString(node.textCase),
    textDecoration: readMixedString(node.textDecoration),
    textAutoResize: safeString(node.textAutoResize)
  };
};

const readMixedNumber = (value: unknown): number | null =>
  typeof value === 'number' ? value : null;

const readMixedString = (value: unknown): string | null =>
  typeof value === 'string' ? value : null;

const readFontName = (value: unknown): { family: string | null; style: string | null } | null => {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const fontName = value as Record<string, unknown>;

  return {
    family: safeString(fontName.family),
    style: safeString(fontName.style)
  };
};

const readLetterSpacing = (value: unknown): { value: number | null; unit: string | null } | null => {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const letterSpacing = value as Record<string, unknown>;

  return {
    value: safeNumber(letterSpacing.value),
    unit: safeString(letterSpacing.unit)
  };
};

const readLineHeight = (value: unknown): { value: number | null; unit: string | null } | null => {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const lineHeight = value as Record<string, unknown>;

  return {
    value: safeNumber(lineHeight.value),
    unit: safeString(lineHeight.unit)
  };
};

const readExportSettings = (node: MaybeSceneNode): string[] | null => {
  const exportSettings = safeArray('exportSettings' in node ? node.exportSettings : undefined, setting => {
    if (typeof setting === 'string') {
      return setting;
    }

    if (setting && typeof setting === 'object' && 'format' in setting) {
      return safeString((setting as { format?: unknown }).format);
    }

    return null;
  });

  return exportSettings.length > 0 ? exportSettings : null;
};

/**
 * Читает приватные pluginData-ключи узла с максимально безопасной деградацией.
 *
 * Некоторые ключи или сами API-вызовы могут падать на отдельных типах узлов,
 * поэтому здесь намеренно используется много `try/catch`, чтобы один проблемный ключ
 * не ломал весь экспорт.
 */
const readPluginData = (node: MaybeSceneNode): Record<string, string> | null => {
  try {
    if (!('getPluginDataKeys' in node) || typeof node.getPluginDataKeys !== 'function') {
      return null;
    }

    const keys = node.getPluginDataKeys();
    if (!keys.length) {
      return null;
    }

    const result: Record<string, string> = {};

    keys.forEach(key => {
      try {
        if ('getPluginData' in node && typeof node.getPluginData === 'function') {
          result[key] = node.getPluginData(key);
        }
      } catch {
        // Пропускаем недоступные ключи plugin data.
      }
    });

    return Object.keys(result).length > 0 ? result : null;
  } catch {
    return null;
  }
};

/**
 * Читает sharedPluginData по всем доступным namespace.
 *
 * Нюанс аналогичен `readPluginData`: структура может быть частично недоступна,
 * поэтому функция пропускает проблемные namespace и ключи вместо того, чтобы
 * прерывать сериализацию всего дерева.
 */
const readSharedPluginData = (node: MaybeSceneNode): Record<string, Record<string, string>> | null => {
  try {
    if (!('getSharedPluginDataKeys' in node) || typeof node.getSharedPluginDataKeys !== 'function') {
      return null;
    }

    const namespaces = node.getSharedPluginDataKeys('*');
    if (!namespaces.length) {
      return null;
    }

    const result: Record<string, Record<string, string>> = {};

    namespaces.forEach(namespace => {
      try {
        const keys = node.getSharedPluginDataKeys(namespace);
        const namespaceData: Record<string, string> = {};

        keys.forEach(key => {
          try {
            if ('getSharedPluginData' in node && typeof node.getSharedPluginData === 'function') {
              namespaceData[key] = node.getSharedPluginData(namespace, key);
            }
          } catch {
            // Пропускаем недоступные ключи shared plugin data.
          }
        });

        if (Object.keys(namespaceData).length > 0) {
          result[namespace] = namespaceData;
        }
      } catch {
        // Пропускаем недоступные пространства имён shared plugin data.
      }
    });

    return Object.keys(result).length > 0 ? result : null;
  } catch {
    return null;
  }
};
