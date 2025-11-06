# Quick Reference Guide

## Naming Convention Cheat Sheet

```
<category>__<name>__r<role>__id<slug>__z<order>__px<w>x<h>__tag<k1+k2>
```

### Minimal Example
```
ui__button__rbase__idbtn_1
```

### Full Example
```
ui__button_primary__rbase__idbtn_prim__z10__px64x64__taghover+focus+9s
```

## Categories

| Category | Use Case |
|----------|----------|
| `ui` | User interface elements |
| `char` | Character assets |
| `env` | Environment/backgrounds |
| `fx` | Effects, particles |
| `mask` | Mask layers |
| `decal` | Decals, stickers |
| `tile` | Tileable textures |

## Roles

| Role | Description |
|------|-------------|
| `rbase` | Primary asset (default) |
| `rmask` | Mask image (separate file) |
| `rcollider` | Collision shape |
| `rhitbox` | Hit detection box |
| `rnormal` | Normal map |
| `rrough` | Roughness map |
| `rmetallic` | Metallic map |
| `rtrigger` | Interaction zone |
| `rbone` | 2D rig bone |

## Common Tags

| Tag | Effect |
|-----|--------|
| `tag:tileable` | Repeatable texture |
| `tag:9s` | Nine-slice UI |
| `tag:parallax2` | Parallax factor 0.5 |
| `tag:hover+focus` | Multiple states |

## Export Workflow

### Illustrator
1. Open `.ai` file
2. File → Scripts → Other Script
3. Select `tools/export_ai.jsx`
4. Done! Check `dist/sprites/`

### Photoshop
1. Open `.psd` file
2. File → Scripts → Other Script
3. Select `tools/export_psd.jsx`
4. Done! Check `dist/sprites/` and `dist/masks/`

### Normalize
```bash
cd tools
node make_manifest.js
```

## Mask Pairing

Base and mask must share the same `id`:

```
char__goblin_head__rbase__idgob_head__z3
char__goblin_head__rmask__idgob_head_mask__z3
```

## File Output

### Illustrator
- `{category}_{id}_{role}.svg`
- `{category}_{id}_{role}.png`

### Photoshop
- `{category}_{id}_{role}.png`
- `{category}_{id}_mask.png` (if mask exists)

## Manifest Location
```
dist/manifest.json
```

## Common Patterns

### UI Button
```
ui__button_primary__rbase__idbtn_prim__taghover+focus
```

### Character with Mask
```
char__hero__rbase__idhero__z5
char__hero__rmask__idhero_mask__z5
```

### Tileable Background
```
env__floor_tile__rbase__idfloor__tagtileable
```

### Nine-Slice Panel
```
ui__panel__rbase__idpanel__tag9s__px256x256
```



