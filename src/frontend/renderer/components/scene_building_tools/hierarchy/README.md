# Hierarchy Editor

Tree inspector showing parent-child relationships, collection visibility, and instancing state.

## Implementation Status

⚠️ **Partial Implementation** - Prototype exists in `prototypes/gui_reference/scene_building_tools/hierarchy_editor/`. Needs full integration with main renderer.

## Responsibilities

Tree inspector showing parent-child relationships, collection visibility, and instancing state.

## Input/Output Format

### Input
- **scene_id** (str): ID of the scene to display
- **expanded_nodes** (list, optional): List of node IDs to expand by default
- **filter_query** (str, optional): Filter nodes by name
- **show_hidden** (bool, optional): Show hidden/invisible nodes (default: false)
- **collection_filter** (str, optional): Filter by collection name

### Output
```json
{
  "hierarchy": {
    "id": "root",
    "name": "Scene",
    "type": "scene",
    "children": [
      {
        "id": "obj_123",
        "name": "Character",
        "type": "mesh",
        "visible": true,
        "locked": false,
        "instance_count": 1,
        "children": [
          {
            "id": "obj_124",
            "name": "Armature",
            "type": "armature",
            "visible": true,
            "locked": false,
            "children": []
          }
        ]
      }
    ]
  },
  "collections": [
    {
      "id": "coll_123",
      "name": "Characters",
      "visible": true,
      "object_count": 5
    }
  ],
  "metadata": {
    "total_objects": 50,
    "total_instances": 75,
    "last_updated": "2024-01-01T12:00:00Z"
  }
}
```

## Example Usage

### React Component
```tsx
import { HierarchyEditor } from '@/components/HierarchyEditor';

function SceneBuilder() {
  const [selectedNode, setSelectedNode] = useState(null);
  
  return (
    <HierarchyEditor
      sceneId="scene_123"
      onNodeSelect={(node) => {
        setSelectedNode(node);
        dispatch(selectObject({ objectId: node.id }));
      }}
      onNodeDrag={(nodeId, newParentId) => {
        dispatch(reparentObject({ objectId: nodeId, parentId: newParentId }));
      }}
      onNodeVisibilityToggle={(nodeId, visible) => {
        dispatch(setObjectVisibility({ objectId: nodeId, visible }));
      }}
    />
  );
}
```

### API Call
```typescript
const hierarchy = await fetch(`/api/scenes/${sceneId}/hierarchy`, {
  method: 'GET'
});
```

### Hierarchy Operations
```typescript
// Reparent object
await reparentObject({
  objectId: "obj_123",
  newParentId: "obj_456"
});

// Toggle visibility
await setObjectVisibility({
  objectId: "obj_123",
  visible: false
});

// Create instance
await createInstance({
  sourceObjectId: "obj_123",
  position: { x: 10, y: 0, z: 5 }
});
```

## Features

- **Tree View**: Expandable/collapsible tree structure
- **Drag & Drop**: Reparent objects by dragging
- **Multi-Select**: Select multiple objects (Ctrl/Cmd click)
- **Visibility Toggle**: Show/hide objects and collections
- **Lock/Unlock**: Prevent accidental modifications
- **Search**: Filter hierarchy by name
- **Collections**: Group objects into collections
- **Instancing**: Visual indication of instanced objects
- **Context Menu**: Right-click operations (duplicate, delete, etc.)

## Dependencies & Requirements

- **React/TypeScript**: Component framework
- **React DnD**: Drag and drop functionality
- **Redux Toolkit**: Scene graph state management
- **PostgreSQL**: Hierarchy data persistence
- **Three.js**: Scene graph representation
- **Permissions**: `runtime:query`, `runtime:control` (scene query and control)

## Runtime Hooks

- Receives live updates from Redis object brain and persists state to Postgres where applicable.
- Emits telemetry for quality gating and undo/redo tracking.
