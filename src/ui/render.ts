import { stringifyPayloadForPreview } from './lib/exportUtils';
import type { UIElements } from './dom';
import type { JsonAction, UIState } from './types';

const ACTION_LABELS: Record<JsonAction, string> = {
  'open-json-preview': 'Просмотреть JSON',
  'download-json': 'Скачать JSON',
  'send-json': 'Отправить JSON на сервер'
};

const applyActionButtonState = (button: HTMLButtonElement, label: string, isLoading: boolean): void => {
  button.textContent = isLoading ? '' : label;
  button.className = isLoading ? 'utility-button loading' : 'utility-button';
  button.setAttribute('aria-busy', isLoading ? 'true' : 'false');
};

export const renderApp = (elements: UIElements, state: UIState): void => {
  const canRequestPayload = state.hasValidSelection && state.isPreviewReady && !state.isLoadingPreview;
  const isBusy = state.isLoadingPayload || state.isSending;
  const hasPayload = Boolean(state.payload);
  const showLoadingPreview = state.isLoadingPreview;
  const showImagePreview = !showLoadingPreview && Boolean(state.selectionPreviewImage);
  const showNoImageMessage = !showLoadingPreview && !showImagePreview;
  const isOpenJsonLoading = state.isLoadingPayload && state.activeAction === 'open-json-preview';
  const isDownloadLoading = state.isLoadingPayload && state.activeAction === 'download-json';
  const isSendLoading = state.isLoadingPayload && state.activeAction === 'send-json';

  elements.designSystem.value = state.designSystem;
  elements.teamInput.value = state.team;
  elements.sendEndpointInput.value = state.sendEndpoint;
  elements.settingsOverlay.className = state.isSettingsOpen ? 'settings-overlay open' : 'settings-overlay';
  elements.jsonPreviewOverlay.className = state.isJsonPreviewOpen ? 'json-preview-overlay open' : 'json-preview-overlay';
  elements.openJsonPreview.disabled = !canRequestPayload || isBusy;
  elements.downloadJson.disabled = !canRequestPayload || isBusy;
  elements.sendJson.disabled = !canRequestPayload || isBusy;
  elements.copyButton.disabled = !hasPayload || isBusy;
  applyActionButtonState(elements.openJsonPreview, ACTION_LABELS['open-json-preview'], isOpenJsonLoading);
  applyActionButtonState(elements.downloadJson, ACTION_LABELS['download-json'], isDownloadLoading);
  applyActionButtonState(elements.sendJson, ACTION_LABELS['send-json'], isSendLoading);

  elements.selectionPreview.style.display = 'flex';
  elements.selectionPreviewLoading.style.display = showLoadingPreview || showNoImageMessage ? 'block' : 'none';
  elements.selectionPreviewImage.style.display = showImagePreview ? 'block' : 'none';

  if (showLoadingPreview) {
    elements.selectionPreviewLoading.textContent = '';
    elements.selectionPreviewLoading.className = 'selection-preview-loading loading';
  } else if (showNoImageMessage) {
    elements.selectionPreviewLoading.className = 'selection-preview-loading';
    elements.selectionPreviewLoading.textContent = state.noPreviewMessage;
  } else {
    elements.selectionPreviewLoading.className = 'selection-preview-loading';
    elements.selectionPreviewLoading.textContent = '';
  }

  if (showImagePreview && state.selectionPreviewImage) {
    elements.selectionPreviewImage.src = state.selectionPreviewImage;
  } else {
    elements.selectionPreviewImage.removeAttribute('src');
  }

  elements.jsonActions.style.display = 'flex';
  elements.jsonOutput.textContent = state.payload ? stringifyPayloadForPreview(state.payload) : '';
  const toastClass = `toast ${state.toastPlacement}`;
  elements.toast.className = state.isToastVisible ? `${toastClass} visible ${state.toastTone}` : toastClass;
  elements.toast.textContent = state.toastMessage;
};
