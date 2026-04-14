export const isDefined = <T>(value: T | null | undefined): value is T =>
  value !== null && value !== undefined;

export const safeNumber = (value: unknown): number | null =>
  (typeof value === 'number' ? value : null);

export const safeString = (value: unknown): string | null =>
  (typeof value === 'string' ? value : null);

export const safeBoolean = (value: unknown): boolean | null =>
  (typeof value === 'boolean' ? value : null);

export const safeArray = <TInput, TOutput>(
  value: unknown,
  map: (item: TInput) => TOutput | null
): TOutput[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return (value as TInput[]).map(map).filter(isDefined);
};

export const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === 'string') {
    return error;
  }

  return 'Unknown error';
};
