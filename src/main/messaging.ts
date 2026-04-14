import { getCurrentDesignSystem, getCurrentSendEndpoint, getCurrentTeam } from './settings';
import type { UIMessage } from './types';

export const postToUI = (message: UIMessage): void => {
  pixso.ui.postMessage(message);
};

export const notifySelectionState = (state: { isValidSelection: boolean; message: string | null }): void => {
  postToUI({
    type: 'selection-state',
    isValidSelection: state.isValidSelection,
    message: state.message
  });
};

export const notifySelectionPreview = (previewBytes: Uint8Array | null, previewMimeType: string | null): void => {
  postToUI({
    type: 'selection-preview',
    previewBytes,
    previewMimeType
  });
};

/**
 * Синхронизирует с UI все пользовательские настройки, сохраненные в main thread.
 */
export const notifySettingsState = (): void => {
  postToUI({
    type: 'settings-state',
    designSystem: getCurrentDesignSystem(),
    team: getCurrentTeam(),
    sendEndpoint: getCurrentSendEndpoint()
  });
};
