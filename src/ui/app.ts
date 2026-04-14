import { DEFAULT_NO_PREVIEW_MESSAGE, INITIAL_UI_STATE, SEND_TIMEOUT_MS } from './constants';
import { getUIElements } from './dom';
import { renderApp } from './render';
import { copyText } from './lib/clipboard';
import { applyDesignSystemToPayload, applyTeamToPayload } from './lib/designSystem';
import { downloadPayload, preparePayloadForSending, stringifyPayload } from './lib/exportUtils';
import { postPluginMessage } from './lib/pluginMessaging';
import type {
  BackendExportPayload,
  DesignSystemValue,
  JsonAction,
  PluginMessage,
  ToastPlacement,
  ToastTone,
  UIState
} from './types';

const SETTINGS_INPUT_DEBOUNCE_MS = 300;
const INVALID_SELECTION_MESSAGE =
  'Выберите один элемент для экспорта. Если нужно экспортировать несколько элементов, сгруппируйте их в Pixso';
const TOAST_HIDE_DELAY_MS = 3000;
type PendingAction = JsonAction;

/**
 * Инициализирует UI-поток плагина и связывает DOM с локальным состоянием.
 */
export const startApp = (): void => {
  const elements = getUIElements();
  let state: UIState = { ...INITIAL_UI_STATE };
  let teamSyncTimeoutId: number | null = null;
  let endpointSyncTimeoutId: number | null = null;
  let toastHideTimeoutId: number | null = null;
  let pendingAction: PendingAction | null = null;
  let pendingRequestId: number | null = null;
  let nextRequestId = 1;
  let currentPreviewObjectUrl: string | null = null;

  const updateState = (nextState: Partial<UIState>) => {
    state = { ...state, ...nextState };
    renderApp(elements, state);
  };

  const isBusy = (value: UIState): boolean => value.isLoadingPayload || value.isSending;

  const showToast = (message: string, tone: ToastTone, placement: ToastPlacement = 'top'): void => {
    if (toastHideTimeoutId !== null) {
      window.clearTimeout(toastHideTimeoutId);
    }

    updateState({
      toastMessage: message,
      toastTone: tone,
      toastPlacement: placement,
      isToastVisible: true
    });

    toastHideTimeoutId = window.setTimeout(() => {
      updateState({ isToastVisible: false });
    }, TOAST_HIDE_DELAY_MS);
  };

  const clearPendingPayloadRequest = () => {
    pendingAction = null;
    pendingRequestId = null;
  };

  const clearPreviewObjectUrl = (): null => {
    if (currentPreviewObjectUrl) {
      URL.revokeObjectURL(currentPreviewObjectUrl);
      currentPreviewObjectUrl = null;
    }

    return null;
  };

  const normalizePreviewBytes = (value: unknown): Uint8Array | null => {
    if (!value) {
      return null;
    }

    if (value instanceof Uint8Array) {
      return value;
    }

    if (value instanceof ArrayBuffer) {
      return new Uint8Array(value);
    }

    if (Array.isArray(value)) {
      return new Uint8Array(value);
    }

    return null;
  };

  const makePreviewObjectUrl = (previewBytes: unknown, previewMimeType: string | null): string | null => {
    clearPreviewObjectUrl();
    const bytes = normalizePreviewBytes(previewBytes);
    if (!bytes || bytes.length === 0) {
      return null;
    }

    const stableBytes = new Uint8Array(bytes.length);
    stableBytes.set(bytes);

    const blob = new Blob([stableBytes], {
      type: previewMimeType ?? 'image/jpeg'
    });
    currentPreviewObjectUrl = URL.createObjectURL(blob);

    return currentPreviewObjectUrl;
  };

  const updateDesignSystem = (designSystem: DesignSystemValue) => {
    updateState({
      designSystem,
      payload: applyDesignSystemToPayload(state.payload, designSystem)
    });
  };

  const updateTeam = (team: string) => {
    updateState({
      team,
      payload: applyTeamToPayload(state.payload, team)
    });
  };

  const updateSendEndpoint = (sendEndpoint: string) => {
    updateState({ sendEndpoint });
  };

  const debouncePersistTeam = (team: string) => {
    if (teamSyncTimeoutId !== null) {
      window.clearTimeout(teamSyncTimeoutId);
    }

    teamSyncTimeoutId = window.setTimeout(() => {
      postPluginMessage({
        type: 'set-team',
        team
      });
    }, SETTINGS_INPUT_DEBOUNCE_MS);
  };

  const debouncePersistSendEndpoint = (sendEndpoint: string) => {
    if (endpointSyncTimeoutId !== null) {
      window.clearTimeout(endpointSyncTimeoutId);
    }

    endpointSyncTimeoutId = window.setTimeout(() => {
      postPluginMessage({
        type: 'set-send-endpoint',
        sendEndpoint
      });
    }, SETTINGS_INPUT_DEBOUNCE_MS);
  };

  const sendPayloadToBackend = async (payload: BackendExportPayload): Promise<void> => {
    const endpoint = state.sendEndpoint.trim();
    if (!endpoint) {
      showToast('Эндпоинт для отправки данных пуст', 'error');
      return;
    }

    updateState({
      isSending: true
    });

    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), SEND_TIMEOUT_MS);

    try {
      const preparedPayload = preparePayloadForSending(payload);
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(preparedPayload),
        signal: controller.signal
      });

      if (!response.ok) {
        throw new Error(`Сервер вернул статус ${response.status}`);
      }

      const responseText = await response.text();
      updateState({
        isSending: false
      });
      showToast(`Данные успешно отправлены!\n\nОтвет сервера: ${responseText}`, 'success');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      updateState({
        isSending: false
      });
      showToast(`Ошибка отправки: ${message}`, 'error');
    } finally {
      window.clearTimeout(timeoutId);
    }
  };

  const executeAction = async (action: PendingAction, payload: BackendExportPayload): Promise<void> => {
    if (action === 'open-json-preview') {
      updateState({ isJsonPreviewOpen: true });
      return;
    }

    if (action === 'download-json') {
      try {
        downloadPayload(payload);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        showToast(`Не удалось скачать JSON: ${message}`, 'error');
      }
      return;
    }

    await sendPayloadToBackend(payload);
  };

  const requestPayloadForAction = (action: PendingAction): void => {
    if (!state.hasValidSelection || !state.isPreviewReady || state.isLoadingPreview) {
      return;
    }

    if (isBusy(state)) {
      return;
    }

    if (state.payload) {
      void executeAction(action, state.payload);
      return;
    }

    const requestId = nextRequestId;
    nextRequestId += 1;
    pendingAction = action;
    pendingRequestId = requestId;

    updateState({
      isLoadingPayload: true,
      activeAction: action
    });

    postPluginMessage({
      type: 'build-selected-payload',
      requestId
    });
  };

  elements.openSettings.addEventListener('click', () => {
    updateState({ isSettingsOpen: true });
  });

  elements.closeSettings.addEventListener('click', () => {
    updateState({ isSettingsOpen: false });
  });

  elements.settingsOverlay.addEventListener('click', event => {
    if (event.target === elements.settingsOverlay) {
      updateState({ isSettingsOpen: false });
    }
  });

  elements.openJsonPreview.addEventListener('click', () => {
    requestPayloadForAction('open-json-preview');
  });

  elements.closeJsonPreview.addEventListener('click', () => {
    updateState({ isJsonPreviewOpen: false });
  });

  elements.jsonPreviewOverlay.addEventListener('click', event => {
    if (event.target === elements.jsonPreviewOverlay) {
      updateState({ isJsonPreviewOpen: false });
    }
  });

  elements.designSystem.addEventListener('change', () => {
    const designSystem = elements.designSystem.value as DesignSystemValue;

    updateDesignSystem(designSystem);
    postPluginMessage({
      type: 'set-design-system',
      designSystem
    });
  });

  elements.teamInput.addEventListener('input', () => {
    const team = elements.teamInput.value;

    updateTeam(team);
    debouncePersistTeam(team);
  });

  elements.sendEndpointInput.addEventListener('input', () => {
    const sendEndpoint = elements.sendEndpointInput.value;

    updateSendEndpoint(sendEndpoint);
    debouncePersistSendEndpoint(sendEndpoint);
  });

  elements.downloadJson.addEventListener('click', () => {
    requestPayloadForAction('download-json');
  });

  elements.sendJson.addEventListener('click', () => {
    requestPayloadForAction('send-json');
  });

  elements.copyButton.addEventListener('click', async () => {
    if (!state.payload || isBusy(state)) {
      return;
    }

    const placement: ToastPlacement = state.isJsonPreviewOpen ? 'center' : 'top';

    try {
      await copyText(stringifyPayload(state.payload));
      showToast('JSON успешно скопирован в буфер обмена', 'success', placement);
    } catch {
      showToast('Не удалось скопировать JSON', 'error', placement);
    }
  });

  window.addEventListener('message', (event: MessageEvent<{ pluginMessage?: PluginMessage }>) => {
    const message = event.data.pluginMessage;
    if (!message) {
      return;
    }

    if (message.type === 'selection-state') {
      clearPendingPayloadRequest();
      const emptyPreview = clearPreviewObjectUrl();

      if (!message.isValidSelection) {
        updateState({
          hasValidSelection: false,
          isPreviewReady: false,
          isLoadingPreview: false,
          isLoadingPayload: false,
          isJsonPreviewOpen: false,
          activeAction: null,
          selectionPreviewImage: emptyPreview,
          payload: null,
          noPreviewMessage: message.message ?? DEFAULT_NO_PREVIEW_MESSAGE
        });
        return;
      }

      updateState({
        hasValidSelection: true,
        isPreviewReady: false,
        isLoadingPreview: true,
        isLoadingPayload: false,
        isJsonPreviewOpen: false,
        activeAction: null,
        selectionPreviewImage: emptyPreview,
        payload: null,
        noPreviewMessage: INVALID_SELECTION_MESSAGE
      });
      return;
    }

    if (message.type === 'selection-preview') {
      if (!state.hasValidSelection) {
        return;
      }

      const previewImage = makePreviewObjectUrl(message.previewBytes, message.previewMimeType);
      updateState({
        selectionPreviewImage: previewImage,
        isPreviewReady: true,
        isLoadingPreview: false
      });
      return;
    }

    if (message.type === 'settings-state') {
      updateState({
        designSystem: message.designSystem,
        team: message.team,
        sendEndpoint: message.sendEndpoint,
        payload: applyTeamToPayload(applyDesignSystemToPayload(state.payload, message.designSystem), message.team)
      });
      return;
    }

    if (message.type === 'collected-data') {
      if (pendingRequestId !== null && message.requestId !== pendingRequestId) {
        return;
      }

      const action = pendingAction;
      clearPendingPayloadRequest();

      updateState({
        payload: message.payload,
        isLoadingPayload: false,
        activeAction: null
      });

      if (action) {
        void executeAction(action, message.payload);
      }
      return;
    }

    if (typeof message.requestId === 'number' && pendingRequestId !== null && message.requestId !== pendingRequestId) {
      return;
    }

    clearPendingPayloadRequest();
    updateState({
      isLoadingPayload: false,
      activeAction: null
    });
    showToast('Не удалось экспортировать данные:', 'error');
  });

  window.addEventListener('beforeunload', () => {
    clearPreviewObjectUrl();
    if (toastHideTimeoutId !== null) {
      window.clearTimeout(toastHideTimeoutId);
    }
  });

  postPluginMessage({ type: 'request-initial-state' });
  renderApp(elements, state);
};
