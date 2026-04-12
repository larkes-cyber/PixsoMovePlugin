export type DesignSystemValue = 'nova' | 'triplex' | 'atomic-ui';

export type PluginMessage =
  | {
      type: 'request-initial-state';
    }
  | {
      type: 'build-selected-payload';
      requestId: number;
    }
  | {
      type: 'set-design-system';
      designSystem: DesignSystemValue;
    }
  | {
      type: 'set-team';
      team: string;
    }
  | {
      type: 'set-send-endpoint';
      sendEndpoint: string;
    }
  | {
      type: string;
      [key: string]: unknown;
    };

export type SafeColor = {
  r: number | null;
  g: number | null;
  b: number | null;
  a: number | null;
};

export type SerializedTextStyle = {
  fontFamily: string | null;
  fontSize: number | null;
  fontWeight: number | null;
  fontStyle: string | null;
  lineHeight: number | null;
  lineHeightUnit: string | null;
  letterSpacing: number | null;
  letterSpacingUnit: string | null;
  textAlignHorizontal: string | null;
  textAlignVertical: string | null;
  paragraphSpacing: number | null;
  textCase: string | null;
  textDecoration: string | null;
  textAutoResize: string | null;
};

export type SerializedNode = {
  id: string | null;
  name: string | null;
  type: string | null;
  visible: boolean | null;
  locked: boolean | null;
  x: number | null;
  y: number | null;
  width: number | null;
  height: number | null;
  opacity: number | null;
  rotation: number | null;
  layoutMode: string | null;
  blendMode: string | null;
  isMask: boolean;
  layoutAlign: string | null;
  layoutGrow: number | null;
  itemSpacing: number | null;
  prototypeStartNodeId: string | null;
  description: string | null;
  key: string | null;
  remote: boolean | null;
  padding: {
    top: number | null;
    right: number | null;
    bottom: number | null;
    left: number | null;
  } | null;
  constraints: {
    horizontal: string | null;
    vertical: string | null;
  } | null;
  absoluteBoundingBox: {
    x: number | null;
    y: number | null;
    width: number | null;
    height: number | null;
  } | null;
  fills: Array<{
    type: string | null;
    visible: boolean | null;
    blendMode: string | null;
    opacity: number | null;
    color: SafeColor | null;
  }>;
  strokes: Array<{
    type: string | null;
    visible: boolean | null;
    blendMode: string | null;
    opacity: number | null;
    color: SafeColor | null;
    strokeWeight: number | null;
    strokeAlign: string | null;
    strokeCap: string | null;
    strokeJoin: string | null;
  }>;
  effects: Array<{
    type: string | null;
    visible: boolean | null;
    radius: number | null;
    color: SafeColor | null;
  }>;
  text: {
    characters: string | null;
    style: SerializedTextStyle | null;
  } | null;
  children: SerializedNode[];
  exportSettings: string[] | null;
  cornerRadius: number | null;
  childrenCount: number;
  fillStyleId: string | null;
  strokeStyleId: string | null;
  effectStyleId: string | null;
  transformStyle: string | null;
  layoutGrids: unknown;
  componentPropertyDefinitions?: unknown;
  variantProperties?: unknown;
  mainComponent?: {
    id: string | null;
    name: string | null;
    key: string | null;
    description: string | null;
  } | null;
  componentProperties?: unknown;
  pluginData: Record<string, string> | null;
  sharedPluginData: Record<string, Record<string, string>> | null;
  previewImage?: string | null;
};

export type VisualGraphNode = {
  id: string | null;
  n: string | null;
  t: string | null;
  d: number;
  c: VisualGraphNode[] | null;
};

export type RawExportData = {
  nodes: SerializedNode[];
  visualGraph: VisualGraphNode[];
};

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

export type DetailedExportPayload = {
  projectName: string | null;
  pageName: string | null;
  pageId: string | null;
  timestamp: string;
  userInfo: {
    id: string | null;
    name: string;
  };
  designSystem: DesignSystemValue;
  previewImage: string | null;
  nodes: SerializedNode[];
  visualGraph: VisualGraphNode[];
};

export type OptimizedTextStyle = {
  fontFamily: string | null;
  fontSize: string | null;
  fontWeight: number | null;
  fontStyle: string | null;
  lineHeight: string | null;
  letterSpacing: string | null;
  textAlign: string | null;
  verticalAlign: string | null;
  textCase: string | null;
  textDecoration: string | null;
};

export type OptimizedNode = {
  kind: string;
  role: 'container' | 'background' | 'shape' | 'text' | 'label' | 'value' | 'logo' | 'icon';
  name?: string;
  text?: string;
  x: number;
  y: number;
  w: number;
  h: number;
  radius?: number;
  fills?: string[];
  strokes?: string[];
  effects?: string[];
  textColor?: string | null;
  textStyle?: OptimizedTextStyle;
  children?: OptimizedNode[];
};

export type OptimizedSummary = {
  nodeCount: number;
  textCount: number;
  shapeCount: number;
  vectorCount: number;
  containerCount: number;
};

export type OptimizedExportPayload = {
  projectName: string | null;
  pageName: string | null;
  pageId: string | null;
  timestamp: string;
  userInfo: {
    id: string | null;
    name: string;
  };
  designSystem: DesignSystemValue;
  previewImage: string | null;
  summary: OptimizedSummary;
  textElements: string[];
  nodes: OptimizedNode[];
};

export type UIMessage =
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

export type ExportableFrameNode = FrameNode & ExportMixin;
export type MaybeSceneNode = SceneNode & Partial<ChildrenMixin>;
