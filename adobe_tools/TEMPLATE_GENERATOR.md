# Template Generator

## Overview

The Template Generator extracts layer structures from existing Adobe files (via manifest) or creates new template files with proper layer naming conventions. This allows you to:

1. **Extract** layer structure from existing files
2. **Generate** template AI/PSD files with correct layer names
3. **Reuse** layer structures across projects

## Features

- ✅ Extract layer structure from manifest.json
- ✅ Generate predefined templates (UI, Character, Environment, Effects, Particles, Animation, Scene)
- ✅ Create ExtendScript files for Adobe Illustrator/Photoshop
- ✅ Automatic layer naming with proper convention
- ✅ Template reuse across projects
- ✅ Generate compositor-ready JSON configs
- ✅ Particle-specific layer creation (emitters, particles, trails)
- ✅ Animation layer templates (tracks, poses, rigs)
- ✅ Scene building templates (backgrounds, props, overlays)

## Usage

### Method 1: Generate from Existing Manifest

If you've already exported assets and have a `manifest.json`:

```bash
cd adobe_tools/tools
npm run template:manifest
```

This will:
1. Read `dist/manifest.json`
2. Extract all layer structures
3. Generate template JSON files
4. Create ExtendScript (.jsx) files ready to use in Adobe

### Method 2: Generate Predefined Templates

Generate ready-made templates for common use cases:

```bash
cd adobe_tools/tools
npm run template:predefined
```

This creates templates for:
- **UI Elements** - Buttons, panels, icons
- **Character** - Character parts with masks and colliders
- **Environment** - Tiles, walls, backgrounds
- **Effects** - Explosions, smoke, particles
- **Particles** - Particle systems (emitters, particles, trails, fire, magic, water)
- **Animation** - Keyframe tracks, poses, rigs
- **Scene Building** - Backgrounds, props, overlays, masks

### Method 3: Generate All Templates

```bash
cd adobe_tools/tools
npm run template
```

Generates both predefined templates and manifest-based templates (if manifest exists).

### Method 4: Generate Compositor Configs

Generate compositor-ready JSON configs from templates:

```bash
cd adobe_tools/tools
npm run compositor:all
```

This generates compositor configs for all templates.

### Method 5: Quick Template Generator

Interactive CLI for rapid template generation:

```bash
cd adobe_tools/tools
npm run quick
```

This will:
1. Ask you to select a template type
2. Ask you to select output format (Adobe, Compositor, or Both)
3. Generate the selected templates

### Method 6: Generate All Templates

Generate everything in one command:

```bash
cd adobe_tools/tools
npm run generate:all
```

This generates:
- All predefined templates (Adobe)
- All compositor configs
- Templates from manifest (if exists)
- Compositor configs from manifest (if exists)

## Using Generated Templates

### Step 1: Generate Template

Run the template generator to create `.jsx` files in `templates/` directory.

### Step 2: Open Adobe Application

1. Open **Adobe Illustrator** or **Adobe Photoshop**
2. Create a new document (or open existing)

### Step 3: Run Template Script

1. Go to **File → Scripts → Other Script...**
2. Navigate to `adobe_tools/templates/`
3. Select the generated `.jsx` file (e.g., `template_ui_generated.jsx`)
4. Click **Open**

### Step 4: Layers Created

The script will automatically:
- Create category groups (e.g., "ui", "char", "env")
- Create layers with proper naming convention
- Add placeholder shapes with correct dimensions
- Organize everything in the correct structure

## Template Structure

Templates are stored as JSON files with this structure:

```json
{
  "version": 1,
  "generatedAt": "2025-01-11T20:00:00.000Z",
  "source": "predefined",
  "name": "UI Elements Template",
  "categories": [
    {
      "name": "ui",
      "items": [
        {
          "category": "ui",
          "name": "button_primary",
          "role": "base",
          "id": "btn_prim",
          "z": 10,
          "width": 200,
          "height": 50,
          "tags": ["hover", "focus"]
        }
      ]
    }
  ]
}
```

## Generated Layer Names

Templates automatically generate layer names following the convention:

```
<category>__<name>__r<role>__id<slug>__z<order>__px<w>x<h>__tag<k1+k2>
```

Example:
```
ui__button_primary__rbase__idbtn_prim__z10__px200x50__taghover+focus
```

## Custom Templates

You can create custom templates by:

1. **Editing JSON files** in `templates/` directory
2. **Running template generator** to create ExtendScript
3. **Using in Adobe** to generate layer structure

### Example Custom Template

```json
{
  "version": 1,
  "name": "My Custom Template",
  "categories": [
    {
      "name": "custom",
      "items": [
        {
          "category": "custom",
          "name": "my_asset",
          "role": "base",
          "id": "my_asset",
          "z": 5,
          "width": 100,
          "height": 100,
          "tags": ["custom"]
        }
      ]
    }
  ]
}
```

## Integration with Export Pipeline

1. **Generate template** → Creates layer structure
2. **Design assets** → Add artwork to layers
3. **Export assets** → Run `export_ai.jsx` or `export_psd.jsx`
4. **Generate manifest** → Run `make_manifest.js`
5. **Reuse template** → Generate new template from manifest

This creates a **circular workflow**:
- Template → Design → Export → Manifest → Template

## Workflow Example

```bash
# 1. Generate UI template
npm run template:predefined

# 2. Open Illustrator, run template_ui_generated.jsx
#    → Creates layers with proper names

# 3. Design your UI elements in the layers

# 4. Export assets
#    → File → Scripts → Other Script → export_ai.jsx

# 5. Normalize manifest
npm run manifest

# 6. Generate new template from your design
npm run template:manifest
#    → Creates template based on your actual design structure
```

## Benefits

1. **Consistency** - All layers follow naming convention
2. **Speed** - No manual layer naming
3. **Reusability** - Templates can be shared across projects
4. **Extraction** - Pull structure from existing designs
5. **Automation** - Full pipeline from template to export

## Files Generated

After running template generator:

```
adobe_tools/
├── templates/
│   ├── template_ui.json              # UI template (JSON)
│   ├── template_ui_generated.jsx     # UI template (ExtendScript)
│   ├── template_character.json
│   ├── template_character_generated.jsx
│   ├── template_environment.json
│   ├── template_environment_generated.jsx
│   ├── template_effects.json
│   ├── template_effects_generated.jsx
│   ├── template_from_manifest.json   # From your manifest
│   └── template_from_manifest_generated.jsx
```

## Tips

1. **Start with predefined templates** - They have common structures
2. **Customize as needed** - Edit JSON files to match your needs
3. **Extract from existing work** - Use manifest to capture your structure
4. **Version control templates** - Keep templates in git for team sharing
5. **Combine templates** - Merge multiple templates for complex projects

## Troubleshooting

**Problem**: Template script doesn't create layers  
**Solution**: Make sure you have a document open in Adobe

**Problem**: Layer names are wrong  
**Solution**: Check template JSON structure matches convention

**Problem**: Groups not created  
**Solution**: Ensure category names don't conflict with existing groups

---

**Last Updated**: 2025-01-11

