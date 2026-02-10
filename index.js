// ---------------------------------------
// UI (iframe)
// ---------------------------------------
pixso.showUI(__html__, { width: 600, height: 800 });

// ---------------------------------------
// Main thread (контроллер плагина)
// ---------------------------------------
pixso.ui.onmessage = async msg => {
  if (!['collect-all', 'collect-selected'].includes(msg.type)) return;

  try {
    // Collect data for sending to server
    const projectName = pixso.root?.name ?? null;
    const page = pixso.currentPage;

    let sourceNodes = [];

    if (msg.type === 'collect-all') {
      sourceNodes = page?.children ?? [];
    }

    if (msg.type === 'collect-selected') {
      sourceNodes = pixso.currentPage.selection ?? [];
    }

    const nodes = await Promise.all(sourceNodes.map(serializeNodeWithImage));
    const visualGraph = sourceNodes.map(n => extractVisualGraph(n, 0));

    const payload = {
      projectName,
      pageName: page?.name ?? null,
      pageId: page?.id ?? null,
      timestamp: new Date().toISOString(),
      nodes: nodes.filter(Boolean),
      visualGraph: visualGraph.filter(Boolean)
    };

    pixso.ui.postMessage({ type: 'collected-data', payload });
  } catch (err) {
    pixso.ui.postMessage({ type: 'error', message: err.message });
  }
};

function notifySelectionState() {
  const hasSelection = pixso.currentPage.selection.length > 0;
  pixso.ui.postMessage({
    type: 'selection-state',
    hasSelection
  });
}

// Подписываемся на событие изменения выделения
pixso.on('selectionchange', () => {
  notifySelectionState();
});

notifySelectionState();

/**
 * Универсальные хелперы
 */
const safeNumber = v => (typeof v === 'number' ? v : null);
const safeArray = (a, fn) => (Array.isArray(a) ? a.map(fn).filter(Boolean) : []);
const safeString = v => (typeof v === 'string' ? v : null);

function uint8ToBase64(uint8) {
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < uint8.length; i += chunkSize) {
    binary += String.fromCharCode(...uint8.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

async function exportFrameImage(frame) {
  const bytes = await frame.exportAsync({
    format: 'PNG',
    constraint: { type: 'SCALE', value: 1 }
  });

  return {
    mimeType: 'image/png',
    encoding: 'base64',
    data: uint8ToBase64(bytes)
  };
}

async function serializeNodeWithImage(node) {
  const base = serializeNode(node);
  if (!base) return null;

  if (node.type === 'FRAME') {
    try {
      let img = await exportFrameBytes(node);
      base.previewImage = img;
    } catch (e) {
      base.previewImage = null;
    }
  }

  if (node.children?.length) {
    base.children = await Promise.all(node.children.map(serializeNodeWithImage)).then(a => a.filter(Boolean));
  }

  return base;
}

/**
 * Сериализация ноды строго под DTO
 */

async function exportFrameBytes(frame) {
  return Array.from(
    await frame.exportAsync({
      format: 'PNG',
      constraint: { type: 'SCALE', value: 1 }
    })
  );
}

function serializeNode(node) {
  if (!node) return null;

  const base = {
    id: safeString(node.id),
    name: safeString(node.name),
    type: safeString(node.type),
    visible: typeof node.visible === 'boolean' ? node.visible : null,
    locked: typeof node.locked === 'boolean' ? node.locked : null,
    x: safeNumber(node.x),
    y: safeNumber(node.y),
    width: safeNumber(node.width),
    height: safeNumber(node.height),
    opacity: safeNumber(node.opacity),
    rotation: safeNumber(node.rotation),
    layoutMode: safeString(node.layoutMode),
    blendMode: safeString(node.blendMode),
    isMask: !!node.isMask,
    layoutAlign: safeString(node.layoutAlign),
    layoutGrow: safeNumber(node.layoutGrow),
    itemSpacing: safeNumber(node.itemSpacing),
    prototypeStartNodeId: safeString(node.prototypeStartNodeId),
    // Component metadata
    description: safeString(node.description),
    key: safeString(node.key),
    remote: typeof node.remote === 'boolean' ? node.remote : null
  };

  const padding = node.padding
    ? {
        top: safeNumber(node.padding.top),
        right: safeNumber(node.padding.right),
        bottom: safeNumber(node.padding.bottom),
        left: safeNumber(node.padding.left)
      }
    : null;

  const constraints = node.constraints
    ? {
        horizontal: safeString(node.constraints.horizontal),
        vertical: safeString(node.constraints.vertical)
      }
    : null;

  const absoluteBoundingBox = node.absoluteBoundingBox
    ? {
        x: safeNumber(node.absoluteBoundingBox.x),
        y: safeNumber(node.absoluteBoundingBox.y),
        width: safeNumber(node.absoluteBoundingBox.width),
        height: safeNumber(node.absoluteBoundingBox.height)
      }
    : null;

  const fills = safeArray(node.fills, p => ({
    type: safeString(p.type),
    visible: typeof p.visible === 'boolean' ? p.visible : null,
    blendMode: safeString(p.blendMode),
    opacity: safeNumber(p.opacity),
    color: p.color
      ? {
          r: safeNumber(p.color.r),
          g: safeNumber(p.color.g),
          b: safeNumber(p.color.b),
          a: safeNumber(p.color.a)
        }
      : null
  }));

  const strokes = safeArray(node.strokes, s => ({
    type: safeString(s.type),
    visible: typeof s.visible === 'boolean' ? s.visible : null,
    blendMode: safeString(s.blendMode),
    opacity: safeNumber(s.opacity),
    color: s.color
      ? {
          r: safeNumber(s.color.r),
          g: safeNumber(s.color.g),
          b: safeNumber(s.color.b),
          a: safeNumber(s.color.a)
        }
      : null,
    strokeWeight: safeNumber(s.strokeWeight),
    strokeAlign: safeString(s.strokeAlign),
    strokeCap: safeString(s.strokeCap),
    strokeJoin: safeString(s.strokeJoin)
  }));

  const effects = safeArray(node.effects, e => ({
    type: safeString(e.type),
    visible: typeof e.visible === 'boolean' ? e.visible : null,
    radius: safeNumber(e.radius),
    color: e.color
      ? {
          r: safeNumber(e.color.r),
          g: safeNumber(e.color.g),
          b: safeNumber(e.color.b),
          a: safeNumber(e.color.a)
        }
      : null
  }));

  const text = node.characters
    ? {
        characters: safeString(node.characters),
        style: node.style
          ? {
              fontFamily: safeString(node.style.fontFamily),
              fontSize: safeNumber(node.style.fontSize),
              fontWeight: safeNumber(node.style.fontWeight),
              fontStyle: safeString(node.style.fontStyle),
              lineHeight: safeNumber(node.style.lineHeight),
              letterSpacing: safeNumber(node.style.letterSpacing),
              textAlignHorizontal: safeString(node.style.textAlignHorizontal),
              textAlignVertical: safeString(node.style.textAlignVertical),
              paragraphSpacing: safeNumber(node.style.paragraphSpacing),
              textCase: safeString(node.style.textCase),
              textDecoration: safeString(node.style.textDecoration)
            }
          : null
      }
    : null;

  const exportSettings = safeArray(node.exportSettings, e => {
    if (typeof e === 'string') return e;
    if (e?.format) return e.format;
    return null;
  });

  const children = safeArray(node.children, serializeNode);

  // Component properties for COMPONENT and INSTANCE nodes
  const componentProperties = {};
  if (node.type === 'COMPONENT' || node.type === 'COMPONENT_SET') {
    componentProperties.componentPropertyDefinitions = node.componentPropertyDefinitions ?? null;
    componentProperties.variantProperties = node.variantProperties ?? null;
  }
  if (node.type === 'INSTANCE') {
    componentProperties.mainComponent = node.mainComponent
      ? {
          id: safeString(node.mainComponent.id),
          name: safeString(node.mainComponent.name),
          key: safeString(node.mainComponent.key),
          description: safeString(node.mainComponent.description)
        }
      : null;
    componentProperties.componentProperties = node.componentProperties ?? null;
    componentProperties.variantProperties = node.variantProperties ?? null;
  }

  // Plugin data (may contain additional metadata)
  let pluginData = null;
  try {
    const pluginDataKeys = node.getPluginDataKeys ? node.getPluginDataKeys() : [];
    if (pluginDataKeys.length > 0) {
      pluginData = {};
      pluginDataKeys.forEach(key => {
        try {
          pluginData[key] = node.getPluginData(key);
        } catch (e) {
          // Skip if access is denied
        }
      });
    }
  } catch (e) {
    // Plugin data not accessible
  }

  // Shared plugin data
  let sharedPluginData = null;
  try {
    const sharedPluginDataKeys = node.getSharedPluginDataKeys ? node.getSharedPluginDataKeys('*') : [];
    if (sharedPluginDataKeys.length > 0) {
      sharedPluginData = {};
      sharedPluginDataKeys.forEach(namespace => {
        try {
          const keys = node.getSharedPluginDataKeys(namespace);
          sharedPluginData[namespace] = {};
          keys.forEach(key => {
            try {
              sharedPluginData[namespace][key] = node.getSharedPluginData(namespace, key);
            } catch (e) {
              // Skip if access is denied
            }
          });
        } catch (e) {
          // Skip if access is denied
        }
      });
    }
  } catch (e) {
    // Shared plugin data not accessible
  }

  return {
    ...base,
    padding,
    constraints,
    absoluteBoundingBox,
    fills,
    strokes,
    effects,
    text,
    children,
    exportSettings: exportSettings.length > 0 ? exportSettings : null,
    cornerRadius: safeNumber(node.cornerRadius),
    childrenCount: children.length,
    fillStyleId: safeString(node.fillStyleId),
    strokeStyleId: safeString(node.strokeStyleId),
    effectStyleId: safeString(node.effectStyleId),
    transformStyle: safeString(node.transformStyle),
    layoutGrids: node.layoutGrids ?? null,
    ...componentProperties,
    pluginData: pluginData && Object.keys(pluginData).length > 0 ? pluginData : null,
    sharedPluginData: sharedPluginData && Object.keys(sharedPluginData).length > 0 ? sharedPluginData : null
  };
}

/**
 * Визуальный граф
 */
function extractVisualGraph(node, depth = 0) {
  if (!node) return null;

  const isContainer = ['FRAME', 'GROUP', 'COMPONENT', 'INSTANCE'].includes(node.type);
  if (!isContainer) return null;

  const children = safeArray(node.children, n => extractVisualGraph(n, depth + 1)).filter(Boolean);
  return {
    id: safeString(node.id),
    n: safeString(node.name),
    t: safeString(node.type),
    d: depth,
    c: children.length ? children : null
  };
}
