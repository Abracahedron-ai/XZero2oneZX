# Examples

## Example 1: UI Button Set

### Layer Names in Illustrator/Photoshop

```
ui__button_primary__rbase__idbtn_prim__z10__taghover+focus
ui__button_secondary__rbase__idbtn_sec__z10
ui__button_disabled__rbase__idbtn_dis__z10
```

### Output Files

```
dist/sprites/
├── ui_btn_prim_base.svg
├── ui_btn_prim_base.png
├── ui_btn_sec_base.svg
├── ui_btn_sec_base.png
├── ui_btn_dis_base.svg
└── ui_btn_dis_base.png
```

### Manifest Entry

```json
{
  "category": "ui",
  "id": "btn_prim",
  "name": "button_primary",
  "role": "base",
  "z": 10,
  "tags": ["hover", "focus"],
  "files": {
    "svg": "dist/sprites/ui_btn_prim_base.svg",
    "png": "dist/sprites/ui_btn_prim_base.png"
  }
}
```

---

## Example 2: Character with Mask

### Layer Names in Photoshop

```
char__goblin_head__rbase__idgob_head__z3
char__goblin_head__rmask__idgob_head_mask__z3
char__goblin_body__rbase__idgob_body__z2
char__goblin_body__rmask__idgob_body_mask__z2
```

### Output Files

```
dist/sprites/
├── char_gob_head_base.png
├── char_gob_body_base.png

dist/masks/
├── char_gob_head_mask.png
└── char_gob_body_mask.png
```

### Manifest Entry

```json
{
  "category": "char",
  "id": "gob_head",
  "name": "goblin_head",
  "role": "base",
  "z": 3,
  "files": {
    "png": "dist/sprites/char_gob_head_base.png"
  },
  "mask": "dist/masks/char_gob_head_mask.png"
}
```

---

## Example 3: Environment Tiles

### Layer Names in Illustrator

```
env__floor_tile_a__rbase__idtile_a__tagtileable
env__floor_tile_b__rbase__idtile_b__tagtileable
env__wall_brick__rbase__idwall_brick__tagtileable
```

### Output Files

```
dist/sprites/
├── env_tile_a_base.svg
├── env_tile_a_base.png
├── env_tile_b_base.svg
├── env_tile_b_base.png
├── env_wall_brick_base.svg
└── env_wall_brick_base.png
```

### Usage in Game

```javascript
// Load tileable textures
const manifest = await fetch('/dist/manifest.json').then(r => r.json());

manifest.items
  .filter(i => i.category === 'env' && i.tags.includes('tileable'))
  .forEach(i => {
    // Create repeating texture
    const texture = new THREE.TextureLoader().load(i.files.png);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(4, 4); // Repeat 4x4
  });
```

---

## Example 4: Nine-Slice UI Panel

### Layer Name

```
ui__panel_background__rbase__idpanel_bg__tag9s__px256x256
```

### Output Files

```
dist/sprites/
├── ui_panel_bg_base.svg
└── ui_panel_bg_base.png
```

### Manifest Entry (Normalized)

```json
{
  "category": "ui",
  "id": "panel_bg",
  "name": "panel_background",
  "role": "base",
  "tags": ["9s"],
  "files": {
    "png": "dist/sprites/ui_panel_bg_base.png"
  },
  "nineSlice": {
    "l": 12,
    "t": 12,
    "r": 12,
    "b": 12
  },
  "width": 256,
  "height": 256
}
```

### Usage in Phaser

```javascript
// Create nine-slice sprite
const item = manifest.items.find(i => i.id === 'panel_bg');
const nineSlice = this.add.nineslice(0, 0, item.width, item.height, 
  'ui_panel_bg', 0, {
    leftWidth: item.nineSlice.l,
    rightWidth: item.nineSlice.r,
    topHeight: item.nineSlice.t,
    bottomHeight: item.nineSlice.b
  }
);
```

---

## Example 5: Character with Collider

### Layer Names

```
char__enemy_goblin__rbase__idenemy_gob__z5
char__enemy_goblin__rcollider__idenemy_gob_coll__z5
```

### Manifest Entry

```json
{
  "category": "char",
  "id": "enemy_gob",
  "name": "enemy_goblin",
  "role": "base",
  "z": 5,
  "files": {
    "png": "dist/sprites/char_enemy_gob_base.png"
  },
  "collider": {
    "type": "rectangle",
    "bounds": {
      "x": 10,
      "y": 20,
      "width": 40,
      "height": 50
    }
  }
}
```

### Usage in Godot

```gdscript
# Auto-create collision shape from manifest
var item = manifest.items.find(i => i.id == 'enemy_gob')
if item.collider:
    var collision = CollisionShape2D.new()
    var shape = RectangleShape2D.new()
    shape.extents = Vector2(item.collider.bounds.width / 2, 
                           item.collider.bounds.height / 2)
    collision.shape = shape
    add_child(collision)
```

---

## Example 6: Complete UI Kit

### Layer Structure in Illustrator

```
ui__button_primary__rbase__idbtn_prim__z10__taghover+focus
ui__button_secondary__rbase__idbtn_sec__z10
ui__input_field__rbase__idinput__z9__tag9s
ui__panel__rbase__idpanel__z8__tag9s
ui__icon_close__rbase__idicon_close__z11
ui__icon_menu__rbase__idicon_menu__z11
```

### Complete Workflow

1. **Export**: Run `export_ai.jsx`
2. **Normalize**: Run `make_manifest.js`
3. **Load in Game**:

```javascript
// Load entire UI kit
const manifest = await fetch('/dist/manifest.json').then(r => r.json());

// Load all UI assets
manifest.items
  .filter(i => i.category === 'ui' && i.role === 'base')
  .forEach(i => {
    const texKey = `ui_${i.id}`;
    this.load.image(texKey, i.files.png);
  });

// After loading, create button
const button = this.add.image(100, 100, 'ui_btn_prim');
button.setInteractive();
button.on('pointerover', () => {
  // Use hover state if available
  const hoverItem = manifest.items.find(
    i => i.id === 'btn_prim' && i.tags.includes('hover')
  );
  if (hoverItem) button.setTexture('ui_btn_prim_hover');
});
```

---

## Example 7: Database Import

### SQL Import Script

```sql
-- Create table
CREATE TABLE assets (
    id VARCHAR(255) PRIMARY KEY,
    category VARCHAR(50),
    name VARCHAR(255),
    role VARCHAR(50),
    z_order INT,
    file_png TEXT,
    file_svg TEXT,
    file_mask TEXT,
    tags JSON,
    metadata JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Import from manifest JSON
INSERT INTO assets (id, category, name, role, z_order, file_png, file_svg, file_mask, tags, metadata)
SELECT 
    item.id,
    item.category,
    item.name,
    item.role,
    item.z,
    item.files.png,
    item.files.svg,
    item.mask,
    JSON_ARRAYAGG(item.tags),
    JSON_OBJECT(
        'anchor', JSON_OBJECT('x', item.anchor.x, 'y', item.anchor.y),
        'nineSlice', item.nineSlice,
        'collider', item.collider,
        'width', item.width,
        'height', item.height
    )
FROM manifest_items item
WHERE item.role = 'base';
```

### Query Example

```sql
-- Get all UI buttons
SELECT * FROM assets 
WHERE category = 'ui' 
  AND role = 'base'
  AND JSON_CONTAINS(tags, '"hover"');

-- Get character with masks
SELECT a.*, m.file_mask 
FROM assets a
LEFT JOIN assets m ON a.id = REPLACE(m.id, '_mask', '')
WHERE a.category = 'char' 
  AND a.role = 'base'
  AND m.role = 'mask';
```

---

## Example 8: Batch Processing

### Process Multiple Files

```javascript
// Node.js script to process all files
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const aiFiles = fs.readdirSync('assets_src/ai')
  .filter(f => f.endsWith('.ai'));

const psdFiles = fs.readdirSync('assets_src/psd')
  .filter(f => f.endsWith('.psd'));

// Note: Adobe scripts must be run manually from within the apps
// This is just an example of how you might organize batch processing

console.log(`Found ${aiFiles.length} AI files and ${psdFiles.length} PSD files`);
console.log('Please run export scripts from Illustrator/Photoshop for each file');
```

---

## Example 9: Style Token Integration

### Style Tokens File (`assets_src/style/tokens.json`)

```json
{
  "colors": {
    "primary": "#3B82F6",
    "secondary": "#8B5CF6",
    "accent": "#F59E0B",
    "background": "#1F2937",
    "text": "#F9FAFB"
  },
  "fonts": {
    "heading": "Inter-Bold",
    "body": "Inter-Regular",
    "mono": "FiraCode-Regular"
  },
  "spacing": {
    "xs": 4,
    "sm": 8,
    "md": 16,
    "lg": 24,
    "xl": 32
  }
}
```

### Reference in Assets

Assets can reference style tokens via tags:

```
ui__button__rbase__idbtn__tagcolor:primary+font:heading
```

---

## Example 10: Animation Rig

### Layer Names for 2D Rig

```
char__hero__rbase__idhero__z5
char__hero__rbone__idhero_root__z5
char__hero_arm__rbone__idhero_arm__z6
char__hero_leg__rbone__idhero_leg__z6
```

### Export Transform Hierarchy

The manifest can include bone/transform data for 2D animation:

```json
{
  "category": "char",
  "id": "hero",
  "role": "base",
  "bones": [
    {
      "id": "hero_root",
      "transform": { "x": 0, "y": 0, "rotation": 0 },
      "children": [
        {
          "id": "hero_arm",
          "transform": { "x": 20, "y": -10, "rotation": 0 }
        },
        {
          "id": "hero_leg",
          "transform": { "x": 0, "y": 30, "rotation": 0 }
        }
      ]
    }
  ]
}
```

---

---

## Example 10: Particle System

### Layer Names in Illustrator

```
particles__explosion_core__remitter__idpart_expl_core__z100__px64x64__tagburst+radial
particles__explosion_debris__rparticle__idpart_expl_deb__z101__px16x16__tagtrail+gravity
particles__smoke_cloud__rparticle__idpart_smoke__z99__px32x32__tagfade+expand
particles__spark__rparticle__idpart_spark__z102__px8x8__tagfast+bright
```

### Output Files

```
dist/sprites/
├── particles_part_expl_core_emitter.svg
├── particles_part_expl_core_emitter.png
├── particles_part_expl_deb_particle.svg
├── particles_part_expl_deb_particle.png
├── particles_part_smoke_particle.svg
├── particles_part_smoke_particle.png
├── particles_part_spark_particle.svg
└── particles_part_spark_particle.png
```

### Compositor Config

```json
{
  "version": 1,
  "generatedAt": "2025-01-11T20:00:00.000Z",
  "source": "template",
  "templateName": "Particle System Template",
  "layers": [
    {
      "id": "part_expl_core",
      "name": "explosion_core",
      "type": "particle",
      "zIndex": 100,
      "blendMode": "normal",
      "opacity": 1,
      "meta": {
        "category": "particles",
        "role": "emitter",
        "tags": ["burst", "radial"],
        "width": 64,
        "height": 64,
        "description": "particles | emitter | tags: burst, radial | size: 64x64"
      }
    }
  ]
}
```

---

## Example 11: Animation Layers

### Layer Names in Illustrator

```
anim__position_track__rtrack__idanim_pos__z10__tagkeyframe+bezier
anim__rotation_track__rtrack__idanim_rot__z11__tagkeyframe+ease
anim__scale_track__rtrack__idanim_scale__z12__tagkeyframe
anim__pose_base__rpose__idanim_pose_base__z5__tagrest
```

### Output Files

```
dist/sprites/
├── anim_anim_pos_track.svg
├── anim_anim_pos_track.png
├── anim_anim_rot_track.svg
├── anim_anim_rot_track.png
├── anim_anim_scale_track.svg
├── anim_anim_scale_track.png
├── anim_anim_pose_base_pose.svg
└── anim_anim_pose_base_pose.png
```

### Compositor Config

```json
{
  "layers": [
    {
      "id": "anim_pos",
      "name": "position_track",
      "type": "animation",
      "zIndex": 10,
      "meta": {
        "category": "anim",
        "role": "track",
        "tags": ["keyframe", "bezier"],
        "description": "anim | track | tags: keyframe, bezier"
      }
    }
  ]
}
```

---

## Example 12: Scene Building

### Layer Names in Illustrator

```
scene__background_sky__rbase__idscene_sky__z0__px1920x1080__tagtileable+parallax
scene__background_ground__rbase__idscene_ground__z1__px1920x400__tagtileable
scene__foreground_prop__rbase__idscene_prop__z50__px200x300__taginteractive
scene__lighting_overlay__roverlay__idscene_light__z90__tagblend+screen
```

### Output Files

```
dist/sprites/
├── scene_scene_sky_base.svg
├── scene_scene_sky_base.png
├── scene_scene_ground_base.svg
├── scene_scene_ground_base.png
├── scene_scene_prop_base.svg
├── scene_scene_prop_base.png
├── scene_scene_light_overlay.svg
└── scene_scene_light_overlay.png
```

### Compositor Config

```json
{
  "layers": [
    {
      "id": "scene_sky",
      "name": "background_sky",
      "type": "scene",
      "zIndex": 0,
      "blendMode": "normal",
      "meta": {
        "category": "scene",
        "role": "base",
        "tags": ["tileable", "parallax"],
        "width": 1920,
        "height": 1080,
        "description": "scene | base | tags: tileable, parallax | size: 1920x1080"
      }
    }
  ]
}
```

---

These examples demonstrate common use cases and integration patterns. Adapt them to your specific workflow!


