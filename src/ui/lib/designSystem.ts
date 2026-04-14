import type { BackendExportPayload, DesignSystemValue } from '../types';

export const applyDesignSystemToPayload = (
  payload: BackendExportPayload | null,
  designSystem: DesignSystemValue
): BackendExportPayload | null => {
  if (!payload) {
    return null;
  }

  return {
    ...payload,
    designSystem
  };
};

export const applyTeamToPayload = (payload: BackendExportPayload | null, team: string): BackendExportPayload | null => {
  if (!payload) {
    return null;
  }

  const trimmed = team.trim();

  return {
    ...payload,
    team: trimmed.length > 0 ? trimmed : null
  };
};
