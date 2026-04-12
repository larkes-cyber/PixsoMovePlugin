import { isDefined } from './helpers';
import { extractVisualGraph, serializeNodeWithImage } from './serialization';
import { getCurrentDesignSystem, getCurrentTeam } from './settings';
import type { BackendExportPayload, SerializedNode, VisualGraphNode } from './types';

const ROOT_EXPORT_YIELD_INTERVAL = 1;
const SERIALIZE_YIELD_EVERY_NODES = 40;

/**
 * Собирает backend-payload из текущего выделения и настроек plugin main thread.
 *
 * Важные нюансы:
 * 1. Функция поддерживает мягкую отмену через `shouldAbort` и периодические yield в event loop,
 *    чтобы не блокировать UI и обработку новых событий.
 * 2. В поле `data` уходит только JSON-строка без изображений (`previewImage` вырезается из nodes).
 * 3. Поле `preview` уходит отдельно как data URL и только из корневого узла при одиночном выборе.
 */
export const buildBackendExportPayload = async (
  sourceNodes: readonly SceneNode[],
  shouldAbort: () => boolean
): Promise<BackendExportPayload> => {
  assertNotAborted(shouldAbort);

  const includeRootPreview = sourceNodes.length === 1;
  const serializedNodes = await serializeSelectedNodes(sourceNodes, includeRootPreview, shouldAbort);
  assertNotAborted(shouldAbort);

  const visualGraph = await serializeVisualGraph(sourceNodes, shouldAbort);
  const preview = toPreviewDataUrl(getRootPreviewImage(serializedNodes));
  const rootItem = getRootItemInfo(serializedNodes);
  const data = serializeRawData({
    nodes: stripPreviewImages(serializedNodes),
    visualGraph
  });

  return {
    designer: normalizeString(pixso.currentUser?.name),
    team: normalizeTeamValue(getCurrentTeam()),
    timestamp: new Date().toISOString(),
    designerId: normalizeString(pixso.currentUser?.id),
    projectName: normalizeString(pixso.root?.name),
    pageName: normalizeString(pixso.currentPage?.name),
    itemName: rootItem.name,
    itemId: rootItem.id,
    designSystem: getCurrentDesignSystem(),
    data,
    preview
  };
};

const serializeSelectedNodes = async (
  sourceNodes: readonly SceneNode[],
  includeRootPreview: boolean,
  shouldAbort: () => boolean
): Promise<SerializedNode[]> => {
  const result: SerializedNode[] = [];

  for (let index = 0; index < sourceNodes.length; index += 1) {
    assertNotAborted(shouldAbort);

    const serializedNode = await serializeNodeWithImage(sourceNodes[index], {
      includePreview: includeRootPreview && index === 0,
      shouldAbort,
      yieldControl: yieldToEventLoop,
      yieldEvery: SERIALIZE_YIELD_EVERY_NODES
    });

    if (isDefined(serializedNode)) {
      result.push(serializedNode);
    }

    if ((index + 1) % ROOT_EXPORT_YIELD_INTERVAL === 0) {
      await yieldToEventLoop();
    }
  }

  return result;
};

const serializeVisualGraph = async (
  sourceNodes: readonly SceneNode[],
  shouldAbort: () => boolean
): Promise<VisualGraphNode[]> => {
  const result: VisualGraphNode[] = [];

  for (let index = 0; index < sourceNodes.length; index += 1) {
    assertNotAborted(shouldAbort);
    const graphNode = extractVisualGraph(sourceNodes[index], 0);
    if (isDefined(graphNode)) {
      result.push(graphNode);
    }

    if ((index + 1) % ROOT_EXPORT_YIELD_INTERVAL === 0) {
      await yieldToEventLoop();
    }
  }

  return result;
};

const yieldToEventLoop = async (): Promise<void> =>
  new Promise(resolve => {
    setTimeout(resolve, 0);
  });

const assertNotAborted = (shouldAbort: () => boolean): void => {
  if (shouldAbort()) {
    throw new Error('EXPORT_CANCELLED');
  }
};

const getRootPreviewImage = (nodes: SerializedNode[]): string | null => {
  if (nodes.length !== 1) {
    return null;
  }

  return typeof nodes[0].previewImage === 'string' && nodes[0].previewImage.length > 0 ? nodes[0].previewImage : null;
};

const getRootItemInfo = (nodes: SerializedNode[]): { id: string | null; name: string | null } => {
  const rootNode = nodes[0];
  if (!rootNode) {
    return {
      id: null,
      name: null
    };
  }

  return {
    id: rootNode.id,
    name: rootNode.name
  };
};

const stripPreviewImages = (nodes: SerializedNode[]): SerializedNode[] =>
  nodes.map(node => stripPreviewImageFromNode(node));

const stripPreviewImageFromNode = (node: SerializedNode): SerializedNode => ({
  ...node,
  previewImage: undefined,
  children: node.children.map(child => stripPreviewImageFromNode(child))
});

const toPreviewDataUrl = (previewBase64: string | null): string | null =>
  previewBase64 ? `data:image/png;base64,${previewBase64}` : null;

const serializeRawData = (rawData: { nodes: SerializedNode[]; visualGraph: VisualGraphNode[] }): string | null => {
  try {
    return JSON.stringify(rawData);
  } catch {
    return null;
  }
};

const normalizeString = (value: unknown): string | null => {
  if (typeof value === 'string') {
    return value;
  }

  if (typeof value === 'number') {
    return String(value);
  }

  return null;
};

const normalizeTeamValue = (team: string): string | null => {
  const trimmed = team.trim();

  return trimmed.length > 0 ? trimmed : null;
};
