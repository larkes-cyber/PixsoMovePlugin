import type { BackendExportPayload } from '../types';

export const stringifyPayload = (payload: BackendExportPayload): string =>
  JSON.stringify(payload, null, 2);

const PREVIEW_IMAGE_PLACEHOLDER = '<Base64 PNG - не отображается в режиме предварительного просмотра>';

export const stringifyPayloadForPreview = (payload: BackendExportPayload): string =>
  JSON.stringify(formatPayloadForPreview(payload), null, 2);

export const downloadPayload = (payload: BackendExportPayload): void => {
  const blob = new Blob([stringifyPayload(payload)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

  anchor.href = url;
  anchor.download = `pixso-export-${timestamp}.json`;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
};

export const preparePayloadForSending = (payload: BackendExportPayload): BackendExportPayload => ({
  ...payload
});

const formatPayloadForPreview = (payload: BackendExportPayload): Record<string, unknown> => {
  const previewPayload: Record<string, unknown> = { ...payload };
  const previewValue = previewPayload.preview;
  if (typeof previewValue === 'string' && previewValue.length > 0) {
    previewPayload.preview = PREVIEW_IMAGE_PLACEHOLDER;
  }

  const previewImageValue = previewPayload.previewImage;
  if (typeof previewImageValue === 'string' && previewImageValue.length > 0) {
    previewPayload.previewImage = PREVIEW_IMAGE_PLACEHOLDER;
  }

  const dataValue = payload.data;
  if (typeof dataValue === 'string' && dataValue.trim().length > 0) {
    previewPayload.data = tryParseJson(dataValue);
  }

  return previewPayload;
};

const tryParseJson = (value: string): unknown => {
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
};
