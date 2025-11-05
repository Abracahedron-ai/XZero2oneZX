export type Vec3 = {
  x: number;
  y: number;
  z: number;
};

export type Transform = {
  position: Vec3;
  rotation: Vec3;
  scale: Vec3;
};

export type PivotMode = 'layer' | 'bounds_center' | 'target_pivot' | 'temporary';

export type Pivot = {
  position: Vec3;
  rotation: Vec3;
  mode: PivotMode;
};

export type TransformSpace = 'world' | 'local' | 'parent' | 'view' | 'custom';

export type SnapMode = 'none' | 'grid' | 'angle' | 'vertex' | 'edge' | 'face' | 'pivot';

export type AxisLock = {
  x: boolean;
  y: boolean;
  z: boolean;
};

export type SnapConfig = {
  mode: SnapMode;
  step: number;
  angle: number;
};

export type NumericOverride = {
  active: boolean;
  value: number | null;
};

export type GizmoMode = 'translate' | 'rotate' | 'scale' | 'pivot';

export type GizmoState = {
  mode: GizmoMode;
  space: TransformSpace;
  axisLock: AxisLock;
  snap: SnapConfig;
  numericOverride: NumericOverride;
};

export type LayerFlags = {
  editMode: boolean;
  selectable: boolean;
};

export type LayerMeta = {
  unitScale: number;
};

export type Layer = {
  id: string;
  name: string;
  parentId?: string | null;
  visible: boolean;
  locked: boolean;
  transform: Transform;
  pivot: Pivot;
  flags: LayerFlags;
  meta: LayerMeta;
  type?: string;
  zIndex?: number;
  captureToOutput?: boolean;
  blendMode?: string;
  opacity?: number;
  workareaOpacity?: number;
  htmlSource?: string;
  renderMode?: 'overlay' | 'texture';
  [key: string]: any;
};

export type MutationType = 'transform' | 'pivot_edit' | 'scene_parent' | 'snap_config';

export type MutationRecord = {
  id: string;
  ts: number;
  type: MutationType;
  before: any;
  after: any;
  selection: string[];
  meta?: Record<string, any>;
};

export type SelectionSet = {
  id: string;
  name: string;
  layerIds: string[];
};
