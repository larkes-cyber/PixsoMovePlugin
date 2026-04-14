import type { DesignSystemValue, UIState } from './types';

export const SEND_TIMEOUT_MS = 5000;
export const DEFAULT_DESIGN_SYSTEM: DesignSystemValue = 'nova';
export const DEFAULT_TEAM = '';
export const DEFAULT_SEND_ENDPOINT = 'http://tslds-efs002866.cloud.delta.sbrf.ru:8080/components/send';
export const DEFAULT_NO_PREVIEW_MESSAGE =
  'Выберите один элемент для экспорта. Если нужно экспортировать несколько элементов, сгруппируйте их в Pixso';

export const INITIAL_UI_STATE: UIState = {
  isLoadingPreview: false,
  isLoadingPayload: false,
  isSending: false,
  hasValidSelection: false,
  isPreviewReady: false,
  noPreviewMessage: DEFAULT_NO_PREVIEW_MESSAGE,
  isJsonPreviewOpen: false,
  payload: null,
  activeAction: null,
  selectionPreviewImage: null,
  designSystem: DEFAULT_DESIGN_SYSTEM,
  team: DEFAULT_TEAM,
  sendEndpoint: DEFAULT_SEND_ENDPOINT,
  isSettingsOpen: false,
  toastMessage: '',
  toastTone: 'success',
  toastPlacement: 'top',
  isToastVisible: false
};
