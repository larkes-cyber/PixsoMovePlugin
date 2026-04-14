type Elements = {
  openSettings: HTMLButtonElement;
  settingsOverlay: HTMLDivElement;
  closeSettings: HTMLButtonElement;
  designSystem: HTMLSelectElement;
  teamInput: HTMLInputElement;
  sendEndpointInput: HTMLInputElement;
  selectionPreview: HTMLDivElement;
  selectionPreviewLoading: HTMLDivElement;
  selectionPreviewImage: HTMLImageElement;
  openJsonPreview: HTMLButtonElement;
  jsonActions: HTMLDivElement;
  downloadJson: HTMLButtonElement;
  sendJson: HTMLButtonElement;
  jsonPreviewOverlay: HTMLDivElement;
  closeJsonPreview: HTMLButtonElement;
  jsonContainer: HTMLDivElement;
  copyButton: HTMLButtonElement;
  jsonOutput: HTMLPreElement;
  toast: HTMLDivElement;
};

const getElement = <T extends HTMLElement>(id: string): T => {
  const element = document.getElementById(id);
  if (!element) {
    throw new Error(`Missing element with id "${id}"`);
  }

  return element as T;
};

export const getUIElements = (): Elements => ({
  openSettings: getElement<HTMLButtonElement>('openSettings'),
  settingsOverlay: getElement<HTMLDivElement>('settingsOverlay'),
  closeSettings: getElement<HTMLButtonElement>('closeSettings'),
  designSystem: getElement<HTMLSelectElement>('designSystem'),
  teamInput: getElement<HTMLInputElement>('teamInput'),
  sendEndpointInput: getElement<HTMLInputElement>('sendEndpointInput'),
  selectionPreview: getElement<HTMLDivElement>('selectionPreview'),
  selectionPreviewLoading: getElement<HTMLDivElement>('selectionPreviewLoading'),
  selectionPreviewImage: getElement<HTMLImageElement>('selectionPreviewImage'),
  openJsonPreview: getElement<HTMLButtonElement>('open-json-preview'),
  jsonActions: getElement<HTMLDivElement>('json-actions'),
  downloadJson: getElement<HTMLButtonElement>('download-json'),
  sendJson: getElement<HTMLButtonElement>('send-json'),
  jsonPreviewOverlay: getElement<HTMLDivElement>('jsonPreviewOverlay'),
  closeJsonPreview: getElement<HTMLButtonElement>('closeJsonPreview'),
  jsonContainer: getElement<HTMLDivElement>('jsonContainer'),
  copyButton: getElement<HTMLButtonElement>('copyBtn'),
  jsonOutput: getElement<HTMLPreElement>('jsonOutput'),
  toast: getElement<HTMLDivElement>('toast')
});

export type UIElements = ReturnType<typeof getUIElements>;
