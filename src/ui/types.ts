export type DesignSystemValue = 'nova' | 'triplex' | 'atomic-ui';
export type JsonAction = 'open-json-preview' | 'download-json' | 'send-json';

export type BackendExportPayload = {
  designer: string | null;
  team: string | null;
  timestamp: string | null;
  designerId: string | null;
  projectName: string | null;
  pageName: string | null;
  itemName: string | null;
  itemId: string | null;
  designSystem: string | null;
  data: string | null;
  preview: string | null;
};

export type PluginMessage =
  | {
      type: 'selection-state';
      isValidSelection: boolean;
      message: string | null;
    }
  | {
      type: 'selection-preview';
      previewBytes: Uint8Array | null;
      previewMimeType: string | null;
    }
  | {
      type: 'settings-state';
      designSystem: DesignSystemValue;
      team: string;
      sendEndpoint: string;
    }
  | {
      type: 'collected-data';
      payload: BackendExportPayload;
      requestId: number;
    }
  | {
      type: 'error';
      message: string;
      requestId?: number;
    };

export type ToastTone = 'success' | 'error';
export type ToastPlacement = 'top' | 'bottom' | 'center';

export type UIState = {
  isLoadingPreview: boolean;
  isLoadingPayload: boolean;
  isSending: boolean;
  hasValidSelection: boolean;
  isPreviewReady: boolean;
  noPreviewMessage: string;
  isJsonPreviewOpen: boolean;
  payload: BackendExportPayload | null;
  activeAction: JsonAction | null;
  selectionPreviewImage: string | null;
  designSystem: DesignSystemValue;
  team: string;
  sendEndpoint: string;
  isSettingsOpen: boolean;
  toastMessage: string;
  toastTone: ToastTone;
  toastPlacement: ToastPlacement;
  isToastVisible: boolean;
};
