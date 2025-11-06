# Adobe Tools - Asset Pipeline

> **Automated asset export pipeline for Adobe Illustrator and Photoshop files**  
> Transform design files into production-ready assets with structured naming conventions and automated exports.

---

## 🎯 Overview

This pipeline extracts assets from Adobe Illustrator (`.ai`) and Photoshop (`.psd`) files by parsing semantic layer names, exports them as game-ready sprites, and generates a manifest for database integration and production workflows.

### Key Features

- **Semantic naming convention** - Parse layer names to extract metadata automatically
- **Multi-format export** - Export as SVG (vector) and PNG (raster) simultaneously
- **Mask handling** - Automatic mask extraction and pairing with base assets
- **Manifest generation** - Single source of truth JSON index for all assets
- **Database-ready** - Structured output ready for production pipelines

---

## 📁 Directory Structure

```
adobe_tools/
├── assets_src/              # Source Adobe files (input)
│   ├── ai/                 # .ai design sources (Illustrator)
│   ├── psd/                # .psd sources (Photoshop)
│   └── style/               # Color tokens, gradients, fonts
│
├── tools/                   # Export scripts
│   ├── export_ai.jsx       # Illustrator exporter (ExtendScript)
│   ├── export_psd.jsx      # Photoshop exporter (ExtendScript)
│   ├── make_manifest.js    # Manifest normalizer (Node.js)
│   └── package.json        # Node.js dependencies
│
└── dist/                   # Exported assets (output)
    ├── sprites/            # PNG/SVG slices by category
    ├── masks/              # Mask images
    ├── atlases/            # Packed sprite sheets
    └── manifest.json        # Asset index (single source of truth)
```

---

## 🏷️ Naming Convention

The naming convention is the **linchpin** of this pipeline. Every layer or group name contains semantic tags that are parsed automatically.

### Format

```
<category>__<name>__r<role>__id<slug>__z<order>__px<w>x<h>__tag<k1+k2>
```

### Components Explained

| Component | Required | Description | Examples |
|-----------|----------|-------------|----------|
| `category` | ✅ | Asset category | `ui`, `char`, `env`, `fx`, `mask`, `decal`, `tile` |
| `name` | ✅ | Human-readable name | `button_primary`, `goblin_head`, `floor_tile_a` |
| `r<role>` | ✅ | Asset role | `rbase`, `rmask`, `rcollider`, `rhitbox`, `rnormal`, `rrough`, `rmetallic`, `rtrigger`, `rbone` |
| `id<slug>` | ⚠️ | Stable identifier | `idbtn_prim`, `idgob_head`, `idtile_a` |
| `z<order>` | ❌ | Draw order hint | `z10`, `z3`, `z0` |
| `px<w>x<h>` | ❌ | Explicit pixel size | `px64x64`, `px128x256` |
| `tag<k1+k2>` | ❌ | Arbitrary flags | `taghover+focus`, `tagtileable`, `tag9s`, `tagparallax2` |

### Real-World Examples

#### UI Button with States
```
ui__button_primary__rbase__idbtn_prim__z10__taghover+focus
```
- **Category**: `ui`
- **Name**: `button_primary`
- **Role**: `base`
- **ID**: `btn_prim`
- **Z-Order**: `10`
- **Tags**: `hover`, `focus`

#### Character with Mask
```
char__goblin_head__rbase__idgob_head__z3
char__goblin_head__rmask__idgob_head_mask__z3
```
- Base and mask share the same `id` prefix (`gob_head`)
- Mask uses role `rmask` to separate from base
- Both maintain same z-order for proper layering

#### Environment Tile
```
env__floor_tile_a__rbase__idtile_a__tagtileable
```
- **Tag**: `tileable` → Auto-marked as repeatable for backgrounds
- Useful for seamless textures

#### Nine-Slice UI Element
```
ui__panel_background__rbase__idpanel_bg__tag9s__px256x256
```
- **Tag**: `9s` → Automatically treated as nine-slice UI
- **Size**: Explicit 256x256 pixels

---

## 🚀 Quick Start

### Prerequisites

- Adobe Illustrator (for `.ai` files)
- Adobe Photoshop (for `.psd` files)
- Node.js (for manifest normalization, optional)

### Step 1: Prepare Your Files

1. Place Illustrator files in `assets_src/ai/`
2. Place Photoshop files in `assets_src/psd/`
3. Name your layers/groups using the convention above

### Step 2: Export from Illustrator

1. Open your `.ai` file in Illustrator
2. Go to **File → Scripts → Other Script...**
3. Navigate to `adobe_tools/tools/export_ai.jsx`
4. Click **Open**
5. Assets export to `dist/sprites/` (SVG + PNG)
6. Manifest generates at `dist/manifest.json`

### Step 3: Export from Photoshop

1. Open your `.psd` file in Photoshop
2. Go to **File → Scripts → Other Script...**
3. Navigate to `adobe_tools/tools/export_psd.jsx`
4. Click **Open**
5. Base assets → `dist/sprites/`
6. Masks → `dist/masks/`
7. Manifest updates at `dist/manifest.json`

### Step 4: Normalize Manifest

```bash
cd adobe_tools/tools
node make_manifest.js
```

This normalizes the manifest by:
- Adding default values for missing fields
- Normalizing file paths
- Adding derived properties (nine-slice, anchors, etc.)
- Outputting a clean, production-ready manifest

---

## 📋 Export Scripts

### `export_ai.jsx` (Illustrator)

**What it does:**
- Iterates through top-level groups in Illustrator
- Parses layer names using the naming convention
- Exports each group as:
  - **SVG** (vector, scalable)
  - **PNG** (raster, 24-bit with transparency)
- Generates manifest entries

**Best Practices:**
- Keep gameplay-relevant assets as **top-level groups** (not nested deep)
- Group per asset; name the group using the convention
- Avoid deep nesting - only top-level items are exported

**Output:**
- `dist/sprites/{category}_{id}_{role}.svg`
- `dist/sprites/{category}_{id}_{role}.png`

### `export_psd.jsx` (Photoshop)

**What it does:**
- Iterates through layer sets (groups) in Photoshop
- Parses layer names using the naming convention
- Exports base layers as PNG
- Automatically detects and exports masks (layers with `__rmask` in name)
- Generates manifest entries

**Mask Detection:**
- Looks for layers with `__rmask` or `rmask` in the name
- Exports masks separately to `dist/masks/`
- Pairs masks with base assets via matching `id`

**Output:**
- `dist/sprites/{category}_{id}_{role}.png`
- `dist/masks/{category}_{id}_mask.png` (if mask exists)

### `make_manifest.js` (Node.js)

**What it does:**
- Reads raw manifest from export scripts
- Normalizes and enriches data
- Adds derived properties:
  - Default anchors (0.5, 0.5)
  - Nine-slice definitions (if `tag:9s` present)
  - Collider data (if `role:collider` present)
  - Atlas references (if atlases exist)

**Usage:**
```bash
cd adobe_tools/tools
node make_manifest.js
```

---

## 🎨 Tag Behaviors

Tags add implicit behaviors to assets:

| Tag | Behavior |
|-----|----------|
| `tag:tileable` | Auto-marked as repeatable (for backgrounds) |
| `tag:9s` | Treated as nine-slice UI (adds `nineSlice` property) |
| `tag:parallax2` | Assigns parallax factor 0.5 |
| `tag:hover+focus` | Multiple tags can be combined with `+` |

### Role Behaviors

| Role | Behavior |
|------|----------|
| `role:base` | Primary asset (default) |
| `role:mask` | Exported as mask image (separate file) |
| `role:collider` | Invisible collision zone; emit as rectangle/polygon |
| `role:trigger` | Interaction zone; emit as rectangle/polygon |
| `role:bone` | Export transform hierarchy for simple 2D rigs |
| `role:normal` | Normal map texture |
| `role:rough` | Roughness map texture |
| `role:metallic` | Metallic map texture |

---

## 📊 Manifest Structure

The `manifest.json` is your **single source of truth** for all assets.

### Example Manifest Entry

```json
{
  "version": 1,
  "generatedAt": "2025-01-11T20:14:00.000Z",
  "items": [
    {
      "category": "ui",
      "id": "btn_prim",
      "name": "button_primary",
      "role": "base",
      "z": 10,
      "tags": ["hover", "focus"],
      "files": {
        "svg": "/path/to/ui_btn_prim_base.svg",
        "png": "/path/to/ui_btn_prim_base.png"
      },
      "mask": null,
      "anchor": { "x": 0.5, "y": 0.5 },
      "collider": null,
      "nineSlice": null,
      "width": null,
      "height": null
    }
  ]
}
```

### Manifest Schema

```typescript
interface Manifest {
  version: number;
  generatedAt: string;
  items: AssetItem[];
}

interface AssetItem {
  category: string;           // ui, char, env, etc.
  id: string;                 // Stable identifier
  name: string;               // Human-readable name
  role: string;               // base, mask, collider, etc.
  z: number;                  // Draw order
  tags: string[];            // Behavior tags
  files: {
    svg?: string;             // SVG file path (if exists)
    png?: string;             // PNG file path
  };
  mask?: string;              // Mask file path (if exists)
  anchor: { x: number; y: number }; // Pivot point (0-1)
  collider?: ColliderData;    // Collision data (if role=collider)
  nineSlice?: {              // Nine-slice data (if tag:9s)
    l: number;                // Left border
    t: number;                // Top border
    r: number;                // Right border
    b: number;                // Bottom border
  };
  width?: number;             // Explicit width (if px specified)
  height?: number;            // Explicit height (if px specified)
}
```

---

## 🔌 Integration Examples

### Web/Three.js/Canvas

```javascript
const manifest = await fetch('/dist/manifest.json').then(r => r.json());

manifest.items
  .filter(i => i.category === 'ui' && i.role === 'base')
  .forEach(i => {
    const texKey = `ui_${i.id}`;
    const loader = new THREE.TextureLoader();
    loader.load(i.files.png || i.files.svg, (texture) => {
      // Use texture
    });
  });
```

### Phaser 3

```javascript
class MyScene extends Phaser.Scene {
  preload() {
    fetch('/dist/manifest.json')
      .then(r => r.json())
      .then(manifest => {
        manifest.items
          .filter(i => i.category === 'ui' && i.role === 'base')
          .forEach(i => {
            const texKey = `ui_${i.id}`;
            this.load.image(texKey, i.files.png || i.files.svg);
          });
      });
  }
}
```

### PixiJS

```javascript
const manifest = await fetch('/dist/manifest.json').then(r => r.json());

manifest.items
  .filter(i => i.category === 'char' && i.role === 'base')
  .forEach(i => {
    const sprite = PIXI.Sprite.from(i.files.png);
    // Apply mask if exists
    if (i.mask) {
      const maskTexture = PIXI.Texture.from(i.mask);
      sprite.mask = new PIXI.Sprite(maskTexture);
    }
    app.stage.addChild(sprite);
  });
```

### Unity (C#)

```csharp
using UnityEngine;
using System.IO;
using Newtonsoft.Json;

public class AssetLoader : MonoBehaviour {
    void Start() {
        string manifestPath = Path.Combine(Application.dataPath, "../dist/manifest.json");
        string manifestJson = File.ReadAllText(manifestPath);
        Manifest manifest = JsonConvert.DeserializeObject<Manifest>(manifestJson);
        
        foreach (var item in manifest.items) {
            if (item.category == "ui" && item.role == "base") {
                string texturePath = Path.Combine(Application.dataPath, "../dist/sprites", 
                    Path.GetFileName(item.files.png));
                Texture2D texture = LoadTexture(texturePath);
                // Create Sprite asset with pivot from anchor
                Sprite sprite = Sprite.Create(texture, new Rect(0, 0, texture.width, texture.height),
                    new Vector2(item.anchor.x, item.anchor.y));
            }
        }
    }
}
```

### Godot (GDScript)

```gdscript
extends Node2D

func _ready():
    var manifest_file = File.new()
    manifest_file.open("res://dist/manifest.json", File.READ)
    var manifest = JSON.parse(manifest_file.get_as_text()).result
    manifest_file.close()
    
    for item in manifest.items:
        if item.category == "char" and item.role == "base":
            var texture = load("res://dist/sprites/" + item.files.png.get_file())
            var sprite = Sprite.new()
            sprite.texture = texture
            add_child(sprite)
            
            # Handle colliders
            if item.role == "collider":
                var collision = CollisionShape2D.new()
                # Create collision shape from item.collider data
                add_child(collision)
```

---

## 🛡️ Guardrails & Validation

### Layer Name Validation

- **Required**: `category` and `role` (or defaults: `misc`, `base`)
- **Invalid names**: Exported with `misc` category and warning
- **Missing fields**: Use sensible defaults:
  - `z: 0` (default draw order)
  - `anchor: {x: 0.5, y: 0.5}` (center pivot)
  - `tags: []` (empty array)

### Best Practices

1. **Consistent naming** - Use the same `id` prefix for related assets (base + mask)
2. **Top-level groups** - Keep gameplay assets at the top level in Illustrator
3. **Mask pairing** - Masks should share the same `id` prefix as their base
4. **Version control** - Keep `manifest.json` in version control for tracking

---

## 📦 Atlas Packing (Optional)

After exporting, you can pack sprites into atlases for better performance:

### Using free-tex-packer

```bash
free-tex-packer --layout=best --extrude=2 --padding=2 \
  --sheet ./dist/atlases/ui.png \
  --data ./dist/atlases/ui.json \
  ./dist/sprites/ui_*.png
```

### Using TexturePacker CLI

```bash
TexturePacker --format json-array \
  --data dist/atlases/ui.json \
  --sheet dist/atlases/ui.png \
  --no-trim \
  dist/sprites/ui_*.png
```

Atlas UV rects can then be merged back into the manifest for game engine consumption.

---

## 🎓 Tips & Tricks

### Illustrator Workflow

1. **Organize by category** - Group related assets together
2. **Name groups, not individual paths** - Export script iterates groups
3. **Use artboards sparingly** - Top-level groups are preferred
4. **Vector-first** - Export as SVG for scalability, PNG for raster fallback

### Photoshop Workflow

1. **Layer sets = assets** - Each layer set becomes one asset
2. **Mask naming** - Use `__rmask` suffix for mask layers
3. **Flatten when needed** - Script merges layers automatically
4. **Preserve transparency** - PNG exports support alpha channels

### Performance Optimization

- Use atlases for UI elements (reduce draw calls)
- Keep masks separate for compositing flexibility
- Use SVG for scalable UI, PNG for game sprites
- Filter manifest by category/role for selective loading

---

## 🔄 Database Integration

The manifest is designed to be easily imported into databases:

### Example SQL Import

```sql
CREATE TABLE assets (
    id VARCHAR(255) PRIMARY KEY,
    category VARCHAR(50),
    name VARCHAR(255),
    role VARCHAR(50),
    z_order INT,
    tags JSON,
    file_png TEXT,
    file_svg TEXT,
    file_mask TEXT,
    anchor_x FLOAT,
    anchor_y FLOAT,
    width INT,
    height INT,
    metadata JSON
);

-- Import from manifest
INSERT INTO assets (id, category, name, role, z_order, tags, file_png, anchor_x, anchor_y)
SELECT 
    item.id,
    item.category,
    item.name,
    item.role,
    item.z,
    JSON_ARRAYAGG(item.tags),
    item.files.png,
    item.anchor.x,
    item.anchor.y
FROM manifest_items item
WHERE item.role = 'base';
```

### MongoDB Example

```javascript
const manifest = require('./dist/manifest.json');

db.assets.insertMany(
  manifest.items.map(item => ({
    assetId: item.id,
    category: item.category,
    name: item.name,
    role: item.role,
    zOrder: item.z,
    tags: item.tags,
    files: item.files,
    mask: item.mask,
    anchor: item.anchor,
    metadata: {
      collider: item.collider,
      nineSlice: item.nineSlice,
      width: item.width,
      height: item.height
    }
  }))
);
```

---

## 🐛 Troubleshooting

### Common Issues

**Problem**: Script doesn't export anything  
**Solution**: Check that layers/groups are at the top level and have names

**Problem**: Masks not being exported  
**Solution**: Ensure mask layers have `__rmask` or `rmask` in their name

**Problem**: Manifest missing fields  
**Solution**: Run `make_manifest.js` to normalize the manifest

**Problem**: Path errors in manifest  
**Solution**: Ensure scripts are run from the correct directory relative to `adobe_tools/`

---

## 📚 Additional Resources

- [Adobe ExtendScript Guide](https://www.adobe.com/devnet/scripting.html)
- [Illustrator Scripting Reference](https://www.adobe.com/content/dam/acom/en/devnet/illustrator/pdfs/IllustratorScriptingReference.pdf)
- [Photoshop Scripting Reference](https://www.adobe.com/content/dam/acom/en/devnet/photoshop/pdfs/photoshop-cc-scripting-guide-2019.pdf)

---

## 🎨 Template Generator

The template generator creates Adobe layer structures and compositor-ready JSON configs:

### Generate Templates

```bash
cd adobe_tools/tools

# Generate all predefined templates
npm run template:predefined

# Generate from manifest
npm run template:manifest

# Generate compositor configs
npm run compositor:all

# Generate everything
npm run generate:all

# Interactive template generator
npm run quick
```

### Template Types

- **UI Elements** - Buttons, panels, icons
- **Character** - Character parts with masks and colliders
- **Environment** - Tiles, walls, backgrounds
- **Effects** - Explosions, smoke, particles
- **Particles** - Particle systems (emitters, particles, trails, fire, magic, water)
- **Animation** - Keyframe tracks, poses, rigs
- **Scene Building** - Backgrounds, props, overlays, masks

### Compositor Integration

Templates can generate compositor-ready JSON configs that match the Layer interface:

```bash
# Generate compositor configs from all templates
npm run compositor:all

# Generate from specific template
npm run compositor:template templates/template_particles.json

# Generate from manifest
npm run compositor:manifest
```

Output files are in `dist/compositor/` directory.

## 🔮 Future Enhancements

- [ ] Automated linting of layer names (pre-export validation)
- [ ] Style token extraction from `/style/` folder
- [ ] Unity Editor integration (auto-import manifest)
- [ ] Godot plugin for manifest import
- [ ] Atlas UV rect merging into manifest
- [ ] Batch processing multiple files
- [ ] Web-based preview tool for manifest
- [x] Particle system templates
- [x] Animation layer templates
- [x] Scene building templates
- [x] Compositor JSON config generator

---

## 📝 License

MIT License - Use freely in your projects

---

## 🤝 Contributing

Found a bug or have a suggestion? Open an issue or submit a pull request!

---

**Last Updated**: 2025-01-11
