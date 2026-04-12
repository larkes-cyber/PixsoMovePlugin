import type { DesignSystemValue } from './types';

const DESIGN_SYSTEM_STORAGE_KEY = 'design-system';
const TEAM_STORAGE_KEY = 'team';
const SEND_ENDPOINT_STORAGE_KEY = 'send-endpoint';
const DEFAULT_DESIGN_SYSTEM: DesignSystemValue = 'nova';
const DEFAULT_TEAM = '';
const DEFAULT_SEND_ENDPOINT = 'http://tslds-efs002866.cloud.delta.sbrf.ru:8080/components/send';

let currentDesignSystem: DesignSystemValue = DEFAULT_DESIGN_SYSTEM;
let currentTeam = DEFAULT_TEAM;
let currentSendEndpoint = DEFAULT_SEND_ENDPOINT;

export const getCurrentDesignSystem = (): DesignSystemValue => currentDesignSystem;
export const getCurrentTeam = (): string => currentTeam;
export const getCurrentSendEndpoint = (): string => currentSendEndpoint;

/**
 * Загружает сохранённые настройки из `serverStorage` в память main thread.
 *
 * При недоступности storage или невалидном значении используются дефолты.
 */
export const loadStoredSettings = async (): Promise<void> => {
  currentDesignSystem = await readStoredDesignSystem();
  currentTeam = await readStoredTeam();
  currentSendEndpoint = await readStoredSendEndpoint();
};

/**
 * Сохраняет выбранную design system и обновляет in-memory состояние.
 */
export const setDesignSystem = async (designSystem: DesignSystemValue): Promise<DesignSystemValue> => {
  currentDesignSystem = designSystem;

  try {
    await pixso.serverStorage.setAsync(DESIGN_SYSTEM_STORAGE_KEY, designSystem);
  } catch {
    // Сохраняем значение в памяти, даже если запись в хранилище не удалась.
  }

  return currentDesignSystem;
};

/**
 * Сохраняет название команды и обновляет in-memory состояние.
 */
export const setTeam = async (team: string): Promise<string> => {
  currentTeam = team;

  try {
    await pixso.serverStorage.setAsync(TEAM_STORAGE_KEY, team);
  } catch {
    // Сохраняем значение в памяти, даже если запись в хранилище не удалась.
  }

  return currentTeam;
};

/**
 * Сохраняет endpoint для отправки и обновляет in-memory состояние.
 */
export const setSendEndpoint = async (sendEndpoint: string): Promise<string> => {
  currentSendEndpoint = sendEndpoint;

  try {
    await pixso.serverStorage.setAsync(SEND_ENDPOINT_STORAGE_KEY, sendEndpoint);
  } catch {
    // Сохраняем значение в памяти, даже если запись в хранилище не удалась.
  }

  return currentSendEndpoint;
};

const readStoredDesignSystem = async (): Promise<DesignSystemValue> => {
  try {
    const storedValue = await pixso.serverStorage.getAsync(DESIGN_SYSTEM_STORAGE_KEY);

    return isDesignSystemValue(storedValue) ? storedValue : DEFAULT_DESIGN_SYSTEM;
  } catch {
    return DEFAULT_DESIGN_SYSTEM;
  }
};

const readStoredTeam = async (): Promise<string> => {
  try {
    const storedValue = await pixso.serverStorage.getAsync(TEAM_STORAGE_KEY);

    return typeof storedValue === 'string' ? storedValue : DEFAULT_TEAM;
  } catch {
    return DEFAULT_TEAM;
  }
};

const readStoredSendEndpoint = async (): Promise<string> => {
  try {
    const storedValue = await pixso.serverStorage.getAsync(SEND_ENDPOINT_STORAGE_KEY);

    return typeof storedValue === 'string' && storedValue.length > 0 ? storedValue : DEFAULT_SEND_ENDPOINT;
  } catch {
    return DEFAULT_SEND_ENDPOINT;
  }
};

const isDesignSystemValue = (value: unknown): value is DesignSystemValue =>
  value === 'nova' || value === 'triplex' || value === 'atomic-ui';
