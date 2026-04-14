/**
 * @deprecated
 * Временный слой совместимости. Экспорт выделения теперь обрабатывается напрямую в `plugin.ts`.
 */
export const createSelectionExportPipeline = () => ({
  onSelectionChanged: () => {},
  runNow: async () => {}
});
