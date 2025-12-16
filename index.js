// ---------------------------------------
// UI (iframe)
// ---------------------------------------
pixso.showUI(`
<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Pixso Data Exporter</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
      overflow: hidden;
    }

    .container {
      background: white;
      border-radius: 16px;
      padding: 40px;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
      max-width: 600px;
      width: 100%;
    }

    h1 {
      font-size: 24px;
      font-weight: 600;
      color: #1a202c;
      margin-bottom: 8px;
      text-align: center;
    }

    .subtitle {
      font-size: 14px;
      color: #718096;
      text-align: center;
      margin-bottom: 32px;
    }

    #send {
      width: 100%;
      padding: 14px 24px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      border: none;
      border-radius: 8px;
      font-size: 16px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.3s ease;
      box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
    }

    #send:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 20px rgba(102, 126, 234, 0.6);
    }

    #send:active {
      transform: translateY(0);
    }

    #send:disabled {
      opacity: 0.6;
      cursor: not-allowed;
      transform: none;
    }

    .status-container {
      margin-top: 24px;
      padding: 16px;
      background: #f7fafc;
      border-radius: 8px;
      border-left: 4px solid #cbd5e0;
      min-height: 60px;
    }

    .status-label {
      font-size: 12px;
      font-weight: 600;
      color: #718096;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 8px;
    }

    #status {
      font-size: 14px;
      color: #4a5568;
      line-height: 1.6;
      white-space: pre-wrap;
      word-break: break-word;
      font-family: 'Monaco', 'Courier New', monospace;
    }

    .status-container.loading {
      border-left-color: #4299e1;
      background: #ebf8ff;
    }

    .status-container.loading #status {
      color: #2b6cb0;
    }

    .status-container.success {
      border-left-color: #48bb78;
      background: #f0fff4;
    }

    .status-container.success #status {
      color: #22543d;
    }

    .status-container.error {
      border-left-color: #f56565;
      background: #fff5f5;
    }

    .status-container.error #status {
      color: #742a2a;
    }

    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
    }

    .loading .status-label::after {
      content: '...';
      animation: pulse 1.5s ease-in-out infinite;
    }

    .toggle-container {
      display: flex;
      align-items: center;
      margin-top: 20px;
      cursor: pointer;
      user-select: none;
    }

    .toggle-container input[type="checkbox"] {
      width: 18px;
      height: 18px;
      margin-right: 10px;
      cursor: pointer;
      accent-color: #667eea;
    }

    .toggle-label {
      font-size: 14px;
      color: #4a5568;
      font-weight: 500;
    }

    .json-container {
      margin-top: 16px;
      padding: 16px;
      background: #1a202c;
      border-radius: 8px;
      max-height: 400px;
      overflow-y: auto;
      position: relative;
    }

    .json-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;
    }

    .json-header .status-label {
      color: #a0aec0;
      margin-bottom: 0;
    }

    .copy-btn {
      padding: 6px 12px;
      background: #667eea;
      color: white;
      border: none;
      border-radius: 4px;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .copy-btn:hover {
      background: #5568d3;
    }

    .copy-btn:active {
      transform: scale(0.95);
    }

    .copy-btn.copied {
      background: #48bb78;
    }

    #jsonOutput {
      font-size: 12px;
      color: #e2e8f0;
      line-height: 1.5;
      white-space: pre-wrap;
      word-break: break-word;
      font-family: 'Monaco', 'Courier New', monospace;
      margin: 0;
    }

    .json-container::-webkit-scrollbar {
      width: 8px;
    }

    .json-container::-webkit-scrollbar-track {
      background: #2d3748;
      border-radius: 4px;
    }

    .json-container::-webkit-scrollbar-thumb {
      background: #4a5568;
      border-radius: 4px;
    }

    .json-container::-webkit-scrollbar-thumb:hover {
      background: #718096;
    }

  </style>
</head>
<body>
  <div class="container">
    <h1>Pixso Data Exporter</h1>
    <p class="subtitle">Экспорт структуры страницы на сервер</p>

    <button id="send">Отправить данные</button>

    <div class="status-container" id="statusContainer">
      <div class="status-label">Статус</div>
      <div id="status">Готов к отправке</div>
    </div>

    <label class="toggle-container">
      <input type="checkbox" id="showJson">
      <span class="toggle-label">Show json</span>
    </label>

    <div class="json-container" id="jsonContainer" style="display: none;">
      <div class="json-header">
        <div class="status-label">JSON Data</div>
        <button class="copy-btn" id="copyBtn">Copy</button>
      </div>
      <pre id="jsonOutput"></pre>
    </div>
  </div>

  <script>
    const statusDiv = document.getElementById('status');
    const statusContainer = document.getElementById('statusContainer');
    const sendBtn = document.getElementById('send');
    const showJsonCheckbox = document.getElementById('showJson');
    const jsonContainer = document.getElementById('jsonContainer');
    const jsonOutput = document.getElementById('jsonOutput');
    const copyBtn = document.getElementById('copyBtn');

    let currentJsonData = null;

    function setStatus(text, type = 'default') {
      statusDiv.textContent = text;
      statusContainer.className = 'status-container ' + type;
    }

    // Toggle JSON viewer visibility
    showJsonCheckbox.addEventListener('change', function() {
      if (this.checked) {
        jsonContainer.style.display = 'block';
        if (currentJsonData) {
          jsonOutput.textContent = JSON.stringify(currentJsonData, null, 2);
        }
      } else {
        jsonContainer.style.display = 'none';
      }
    });

    // Copy JSON to clipboard
    copyBtn.addEventListener('click', function() {
      if (!currentJsonData) return;

      try {
        const jsonString = JSON.stringify(currentJsonData, null, 2);

        // Create a temporary textarea element
        const textarea = document.createElement('textarea');
        textarea.value = jsonString;
        textarea.style.position = 'fixed';
        textarea.style.left = '-9999px';
        textarea.style.top = '0';
        document.body.appendChild(textarea);

        // Select and copy the text
        textarea.select();
        textarea.setSelectionRange(0, textarea.value.length);
        const successful = document.execCommand('copy');

        // Remove the textarea
        document.body.removeChild(textarea);

        if (successful) {
          copyBtn.textContent = 'Copied!';
          copyBtn.classList.add('copied');

          setTimeout(() => {
            copyBtn.textContent = 'Copy';
            copyBtn.classList.remove('copied');
          }, 2000);
        }
      } catch (err) {
        console.error('Failed to copy:', err);
        copyBtn.textContent = 'Failed';
        setTimeout(() => {
          copyBtn.textContent = 'Copy';
        }, 2000);
      }
    });

    // Preload data when plugin opens
    function preloadData() {
      setStatus('Загружаю данные...', 'loading');
      parent.postMessage({ pluginMessage: { type: 'preload-data' } }, '*');
    }

    sendBtn.onclick = async function() {
      sendBtn.disabled = true;
      setStatus('Запрашиваю данные у плагина', 'loading');

      try {
        parent.postMessage({ pluginMessage: { type: 'collect-data' } }, '*');
      } catch (err) {
        setStatus('❌ Ошибка: ' + err.message, 'error');
        sendBtn.disabled = false;
      }
    };

    // Initialize plugin by preloading data
    preloadData();
    function bytesToBase64(bytes) {
      // bytes: Uint8Array
      let binary = '';
      const chunkSize = 0x8000; // предотвращаем переполнение стека
      for (let i = 0; i < bytes.length; i += chunkSize) {
        const chunk = bytes.subarray(i, i + chunkSize);
        binary += String.fromCharCode(...chunk);
      }
      return btoa(binary);
    }

    window.onmessage = async (event) => {
      const msg = event.data.pluginMessage;
      if (!msg) return;

      if (msg.type === 'preload-data') {
        const payload = msg.payload;

        // Store payload for JSON viewer
        currentJsonData = payload;

        // Update JSON viewer if it's visible
        if (showJsonCheckbox.checked) {
          jsonOutput.textContent = JSON.stringify(payload, null, 2);
        }

        setStatus('Готов к отправке', 'default');
      } else if (msg.type === 'collected-data') {
        const payload = msg.payload;

        // Store payload for JSON viewer
        currentJsonData = payload;

        // Update JSON viewer if it's visible
        if (showJsonCheckbox.checked) {
          jsonOutput.textContent = JSON.stringify(payload, null, 2);
        }

        setStatus('Отправляю данные на сервер', 'loading');
        
        function uint8ToBase64(u8Arr) {
        const chunkSize = 0x8000; // 32KB
        let result = '';
        for (let i = 0; i < u8Arr.length; i += chunkSize) {
          const chunk = u8Arr.subarray(i, i + chunkSize);
          result += String.fromCharCode.apply(null, chunk);
        }
        return btoa(result);
      }

      // Recursive function to convert all previewImage fields to base64
      function convertNodeImagesToBase64(node) {
        if (!node) return null;

        const { previewImage, children, ...rest } = node;

        // Convert previewImage to base64 if it exists
        let convertedPreviewImage = null;
        if (previewImage && Array.isArray(previewImage)) {
          const uint8Array = new Uint8Array(previewImage);
          convertedPreviewImage = uint8ToBase64(uint8Array);
        }

        // Recursively convert children
        let convertedChildren = null;
        if (children && Array.isArray(children)) {
          convertedChildren = children.map(convertNodeImagesToBase64).filter(Boolean);
        }

        return {
          ...rest,
          previewImage: convertedPreviewImage,
          children: convertedChildren
        };
      }

      // Convert all nodes recursively
      const updatedNodes = payload.nodes.map(convertNodeImagesToBase64).filter(Boolean);

      // Replace nodes with updated ones
      payload.nodes = updatedNodes;
      payload.nodes.forEach(node => {
        console.log(node.previewImage)
      })
        try {
                console.log("###################################")
          const res = await fetch('https://pxisomove-production-6aa6.up.railway.app/sendPixsoNodes', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });

          if (!res.ok) throw new Error('Сервер вернул статус ' + res.status);

          const responseData = await res.text();
          setStatus('✓ Данные успешно отправлены!\\n\\nОтвет сервера: ' + responseData, 'success');
        } catch (err) {
          setStatus('❌ Ошибка отправки: ' + err.message, 'error');
        }

        sendBtn.disabled = false;
      } else if (msg.type === 'error') {
        setStatus('❌ Ошибка сбора данных: ' + msg.message, 'error');
        sendBtn.disabled = false;
      }
    };
  </script>
</body>
</html>
`, { width: 600, height: 800 });

// ---------------------------------------
// Main thread (контроллер плагина)
// ---------------------------------------
pixso.ui.onmessage = async (msg) => {
  if (msg.type !== 'collect-data' && msg.type !== 'preload-data') return;

  try {
    // Collect data for sending to server
    const projectName = pixso.root?.name ?? null;
    const page = pixso.currentPage;

    const nodes = await Promise.all((page?.children ?? []).map(serializeNodeWithImage));
    const visualGraph = (page?.children ?? []).map(n => extractVisualGraph(n, 0));

    const payload = {
      projectName,
      pageName: page?.name ?? null,
      pageId: page?.id ?? null,
      timestamp: new Date().toISOString(),
      nodes: nodes.filter(Boolean),
      visualGraph: visualGraph.filter(Boolean)
    };
    pixso.ui.postMessage({ type: msg.type === 'preload-data' ? 'preload-data' : 'collected-data', payload });
  } catch (err) {
    pixso.ui.postMessage({ type: 'error', message: err.message });
  }
};

/**
 * Универсальные хелперы
 */
const safeNumber = v => (typeof v === 'number' ? v : null);
const safeArray = (a, fn) => Array.isArray(a) ? a.map(fn).filter(Boolean) : [];
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
      let img = await exportFrameBytes(node)
      base.previewImage = img;
    } catch (e) {
      base.previewImage = null;
    }
  }

  if (node.children?.length) {
    base.children = await Promise.all(
      node.children.map(serializeNodeWithImage)
    ).then(a => a.filter(Boolean));
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
    prototypeStartNodeId: safeString(node.prototypeStartNodeId)
  };

  const padding = node.padding ? {
    top: safeNumber(node.padding.top),
    right: safeNumber(node.padding.right),
    bottom: safeNumber(node.padding.bottom),
    left: safeNumber(node.padding.left)
  } : null;

  const constraints = node.constraints ? {
    horizontal: safeString(node.constraints.horizontal),
    vertical: safeString(node.constraints.vertical)
  } : null;

  const absoluteBoundingBox = node.absoluteBoundingBox ? {
    x: safeNumber(node.absoluteBoundingBox.x),
    y: safeNumber(node.absoluteBoundingBox.y),
    width: safeNumber(node.absoluteBoundingBox.width),
    height: safeNumber(node.absoluteBoundingBox.height)
  } : null;

  const fills = safeArray(node.fills, p => ({
    type: safeString(p.type),
    visible: typeof p.visible === 'boolean' ? p.visible : null,
    blendMode: safeString(p.blendMode),
    opacity: safeNumber(p.opacity),
    color: p.color ? {
      r: safeNumber(p.color.r),
      g: safeNumber(p.color.g),
      b: safeNumber(p.color.b),
      a: safeNumber(p.color.a)
    } : null
  }));

  const strokes = safeArray(node.strokes, s => ({
    type: safeString(s.type),
    visible: typeof s.visible === 'boolean' ? s.visible : null,
    blendMode: safeString(s.blendMode),
    opacity: safeNumber(s.opacity),
    color: s.color ? {
      r: safeNumber(s.color.r),
      g: safeNumber(s.color.g),
      b: safeNumber(s.color.b),
      a: safeNumber(s.color.a)
    } : null,
    strokeWeight: safeNumber(s.strokeWeight),
    strokeAlign: safeString(s.strokeAlign),
    strokeCap: safeString(s.strokeCap),
    strokeJoin: safeString(s.strokeJoin)
  }));

  const effects = safeArray(node.effects, e => ({
    type: safeString(e.type),
    visible: typeof e.visible === 'boolean' ? e.visible : null,
    radius: safeNumber(e.radius),
    color: e.color ? {
      r: safeNumber(e.color.r),
      g: safeNumber(e.color.g),
      b: safeNumber(e.color.b),
      a: safeNumber(e.color.a)
    } : null
  }));

  const text = node.characters ? {
    characters: safeString(node.characters),
    style: node.style ? {
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
    } : null
  } : null;

  const exportSettings = safeArray(node.exportSettings, e => {
    if (typeof e === 'string') return e;
    if (e?.format) return e.format;
    return null;
  });

  const children = safeArray(node.children, serializeNode);

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
    layoutGrids: node.layoutGrids ?? null
  };
}

/**
 * Визуальный граф
 */
function extractVisualGraph(node, depth = 0) {
  if (!node) return null;

  const isContainer = ['FRAME','GROUP','COMPONENT','INSTANCE'].includes(node.type);
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
