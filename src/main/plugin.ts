import { buildBackendExportPayload } from './exportPayload';
import { getErrorMessage } from './helpers';
import { notifySelectionPreview, notifySelectionState, notifySettingsState, postToUI } from './messaging';
import { exportSelectionPreview } from './serialization';
import { loadStoredSettings, setDesignSystem, setSendEndpoint, setTeam } from './settings';
import type { DesignSystemValue, PluginMessage } from './types';

const UI_OPTIONS = { width: 360, height: 408 };
const INVALID_SELECTION_MESSAGE =
  'Выберите один элемент для экспорта. Если нужно экспортировать несколько элементов, сгруппируйте их в Pixso';
const EXPORT_CANCELLED_MESSAGE = 'EXPORT_CANCELLED';

const PREVIEW_DEBOUNCE_MS = 320;
const PREVIEW_WIDTH = 320;
const PREVIEW_CACHE_TTL_MS = 15000;
const PREVIEW_CACHE_MAX_ENTRIES = 30;

let selectionRevision = 0;
let activeBuildJobId = 0;
let previewTimerId: ReturnType<typeof setTimeout> | null = null;
const previewCache = new Map<string, { bytes: Uint8Array; expiresAt: number }>();

/**
 * Инициализирует main thread плагина:
 * открывает UI, подписывает обработчики сообщений и следит за сменой выделения.
 */
export const startPlugin = (): void => {
  pixso.showUI(__html__, UI_OPTIONS);
  pixso.ui.onmessage = message => {
    void handleUIMessage(message);
  };
  pixso.on('selectionchange', () => {
    void handleSelectionChanged();
  });

  void initializePluginState();
};

/**
 * Загружает сохраненные настройки и отправляет UI стартовое состояние.
 */
const initializePluginState = async (): Promise<void> => {
  await loadStoredSettings();
  notifySettingsState();
  await handleSelectionChanged();
};

const isDesignSystemValue = (value: unknown): value is DesignSystemValue =>
  value === 'nova' || value === 'triplex' || value === 'atomic-ui';

/**
 * Центральный обработчик сообщений из UI.
 */
const handleUIMessage = async (msg: PluginMessage): Promise<void> => {
  if (msg.type === 'request-initial-state') {
    notifySettingsState();
    await handleSelectionChanged();
    return;
  }

  if (msg.type === 'set-design-system' && isDesignSystemValue(msg.designSystem)) {
    await setDesignSystem(msg.designSystem);
    notifySettingsState();
    return;
  }

  if (msg.type === 'set-team' && typeof msg.team === 'string') {
    await setTeam(msg.team);
    notifySettingsState();
    return;
  }

  if (msg.type === 'set-send-endpoint' && typeof msg.sendEndpoint === 'string') {
    await setSendEndpoint(msg.sendEndpoint);
    notifySettingsState();
    return;
  }

  if (msg.type === 'build-selected-payload' && typeof msg.requestId === 'number') {
    await handleBuildPayloadRequest(msg.requestId);
  }
};

const handleSelectionChanged = async (): Promise<void> => {
  selectionRevision += 1;
  activeBuildJobId += 1;
  clearPendingPreviewTimer();

  const currentRevision = selectionRevision;
  const selectionSnapshot = Array.from(pixso.currentPage.selection);

  if (selectionSnapshot.length !== 1) {
    notifySelectionState({
      isValidSelection: false,
      message: INVALID_SELECTION_MESSAGE
    });
    notifySelectionPreview(null, null);
    return;
  }

  notifySelectionState({
    isValidSelection: true,
    message: null
  });

  const cacheKey = buildPreviewCacheKey(selectionSnapshot[0]);
  const cachedPreview = getCachedPreview(cacheKey);
  if (cachedPreview) {
    notifySelectionPreview(cachedPreview, 'image/jpeg');
    return;
  }

  previewTimerId = setTimeout(() => {
    void exportAndSendPreview(selectionSnapshot, currentRevision, cacheKey);
  }, PREVIEW_DEBOUNCE_MS);
};

const exportAndSendPreview = async (
  selectionSnapshot: readonly SceneNode[],
  selectionSnapshotRevision: number,
  cacheKey: string
): Promise<void> => {
  try {
    const previewBytes = await exportSelectionPreview(selectionSnapshot, {
      shouldAbort: () => selectionSnapshotRevision !== selectionRevision,
      format: 'JPG',
      constraint: {
        type: 'WIDTH',
        value: PREVIEW_WIDTH
      },
      contentsOnly: true,
      useAbsoluteBounds: false
    });

    if (selectionSnapshotRevision !== selectionRevision) {
      return;
    }

    if (previewBytes && previewBytes.length > 0) {
      setCachedPreview(cacheKey, previewBytes);
      notifySelectionPreview(previewBytes, 'image/jpeg');
      return;
    }

    notifySelectionPreview(null, null);
  } catch (error) {
    if (isCancelledError(error)) {
      return;
    }

    if (selectionSnapshotRevision !== selectionRevision) {
      return;
    }

    notifySelectionPreview(null, null);
  }
};

const handleBuildPayloadRequest = async (requestId: number): Promise<void> => {
  const selectionSnapshot = Array.from(pixso.currentPage.selection);
  if (selectionSnapshot.length !== 1) {
    postToUI({
      type: 'error',
      message: INVALID_SELECTION_MESSAGE,
      requestId
    });
    return;
  }

  const requestSelectionRevision = selectionRevision;
  activeBuildJobId += 1;
  const jobId = activeBuildJobId;

  try {
    const payload = await buildBackendExportPayload(
      selectionSnapshot,
      () => jobId !== activeBuildJobId || requestSelectionRevision !== selectionRevision
    );

    if (jobId !== activeBuildJobId || requestSelectionRevision !== selectionRevision) {
      return;
    }

    postToUI({
      type: 'collected-data',
      payload,
      requestId
    });
  } catch (error) {
    if (isCancelledError(error)) {
      return;
    }

    if (jobId !== activeBuildJobId || requestSelectionRevision !== selectionRevision) {
      return;
    }

    postToUI({
      type: 'error',
      message: getErrorMessage(error),
      requestId
    });
  }
};

const clearPendingPreviewTimer = (): void => {
  if (previewTimerId !== null) {
    clearTimeout(previewTimerId);
    previewTimerId = null;
  }
};

const buildPreviewCacheKey = (node: SceneNode): string => {
  const width = 'width' in node && typeof node.width === 'number' ? Math.round(node.width) : 0;
  const height = 'height' in node && typeof node.height === 'number' ? Math.round(node.height) : 0;

  return `${node.id}|${node.type}|${width}x${height}`;
};

const getCachedPreview = (cacheKey: string): Uint8Array | null => {
  const entry = previewCache.get(cacheKey);
  if (!entry) {
    return null;
  }

  if (entry.expiresAt < Date.now()) {
    previewCache.delete(cacheKey);
    return null;
  }

  return new Uint8Array(entry.bytes);
};

const setCachedPreview = (cacheKey: string, bytes: Uint8Array): void => {
  const cacheEntry = {
    bytes: new Uint8Array(bytes),
    expiresAt: Date.now() + PREVIEW_CACHE_TTL_MS
  };

  if (previewCache.has(cacheKey)) {
    previewCache.delete(cacheKey);
  }
  previewCache.set(cacheKey, cacheEntry);

  while (previewCache.size > PREVIEW_CACHE_MAX_ENTRIES) {
    const oldestKey = previewCache.keys().next().value;
    if (typeof oldestKey === 'string') {
      previewCache.delete(oldestKey);
    } else {
      break;
    }
  }
};

const isCancelledError = (error: unknown): boolean =>
  error instanceof Error && error.message === EXPORT_CANCELLED_MESSAGE;
