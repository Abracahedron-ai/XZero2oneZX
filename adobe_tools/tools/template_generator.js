#!/usr/bin/env node

/**
 * Template Generator (Node.js)
 * 
 * Generates template AI/PSD files with proper layer structure
 * Can be used standalone or integrated into build pipeline
 */

const fs = require("fs");
const path = require("path");

const dist = path.resolve(__dirname, "../dist");
const manifestPath = path.join(dist, "manifest.json");
const templatesDir = path.resolve(__dirname, "../templates");

// Ensure templates directory exists
if (!fs.existsSync(templatesDir)) {
  fs.mkdirSync(templatesDir, { recursive: true });
}

/**
 * Generate template structure from manifest
 */
function generateFromManifest() {
  if (!fs.existsSync(manifestPath)) {
    console.error("No manifest.json found. Run export scripts first.");
    process.exit(1);
  }
  
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  const items = manifest.items || [];
  
  // Group by category
  const byCategory = {};
  items.forEach(item => {
    if (!byCategory[item.category]) {
      byCategory[item.category] = [];
    }
    byCategory[item.category].push(item);
  });
  
  // Generate template structure
  const template = {
    version: 1,
    generatedAt: new Date().toISOString(),
    source: "manifest",
    categories: Object.keys(byCategory).map(category => ({
      name: category,
      items: byCategory[category].map(item => ({
        category: item.category,
        name: item.name,
        role: item.role || "base",
        id: item.id || item.name,
        z: item.z || 0,
        width: item.width || null,
        height: item.height || null,
        tags: item.tags || []
      }))
    }))
  };
  
  // Save template
  const templatePath = path.join(templatesDir, "template_from_manifest.json");
  fs.writeFileSync(templatePath, JSON.stringify(template, null, 2));
  
  console.log(`Template generated: ${templatePath}`);
  console.log(`Categories: ${template.categories.length}`);
  console.log(`Total items: ${items.length}`);
  
  // Generate ExtendScript code
  generateExtendScriptTemplate(template);
}

/**
 * Generate predefined templates
 */
function generatePredefinedTemplates() {
  const templates = {
    ui: {
      name: "UI Elements Template",
      categories: [
        {
          name: "ui",
          items: [
            { category: "ui", name: "button_primary", role: "base", id: "btn_prim", z: 10, width: 200, height: 50, tags: ["hover", "focus"] },
            { category: "ui", name: "button_secondary", role: "base", id: "btn_sec", z: 10, width: 200, height: 50 },
            { category: "ui", name: "button_disabled", role: "base", id: "btn_dis", z: 10, width: 200, height: 50 },
            { category: "ui", name: "panel_background", role: "base", id: "panel_bg", z: 5, width: 400, height: 300, tags: ["9s"] },
            { category: "ui", name: "icon_close", role: "base", id: "icon_close", z: 20, width: 24, height: 24 }
          ]
        }
      ]
    },
    character: {
      name: "Character Template",
      categories: [
        {
          name: "char",
          items: [
            { category: "char", name: "character_head", role: "base", id: "char_head", z: 3 },
            { category: "char", name: "character_head", role: "mask", id: "char_head_mask", z: 3 },
            { category: "char", name: "character_body", role: "base", id: "char_body", z: 2 },
            { category: "char", name: "character_body", role: "mask", id: "char_body_mask", z: 2 },
            { category: "char", name: "character_legs", role: "base", id: "char_legs", z: 1 },
            { category: "char", name: "character_collider", role: "collider", id: "char_collider", z: 0 }
          ]
        }
      ]
    },
    environment: {
      name: "Environment Template",
      categories: [
        {
          name: "env",
          items: [
            { category: "env", name: "floor_tile_a", role: "base", id: "tile_a", tags: ["tileable"] },
            { category: "env", name: "floor_tile_b", role: "base", id: "tile_b", tags: ["tileable"] },
            { category: "env", name: "wall_brick", role: "base", id: "wall_brick", tags: ["tileable"] },
            { category: "env", name: "ceiling_panel", role: "base", id: "ceiling", z: 10 }
          ]
        }
      ]
    },
    effects: {
      name: "Effects Template",
      categories: [
        {
          name: "fx",
          items: [
            { category: "fx", name: "explosion", role: "base", id: "fx_expl", z: 100 },
            { category: "fx", name: "smoke", role: "base", id: "fx_smoke", z: 99 },
            { category: "fx", name: "spark", role: "base", id: "fx_spark", z: 101 }
          ]
        }
      ]
    },
    particles: {
      name: "Particle System Template",
      categories: [
        {
          name: "particles",
          items: [
            { category: "particles", name: "explosion_core", role: "emitter", id: "part_expl_core", z: 100, width: 64, height: 64, tags: ["burst", "radial"] },
            { category: "particles", name: "explosion_debris", role: "particle", id: "part_expl_deb", z: 101, width: 16, height: 16, tags: ["trail", "gravity"] },
            { category: "particles", name: "smoke_cloud", role: "particle", id: "part_smoke", z: 99, width: 32, height: 32, tags: ["fade", "expand"] },
            { category: "particles", name: "spark", role: "particle", id: "part_spark", z: 102, width: 8, height: 8, tags: ["fast", "bright"] },
            { category: "particles", name: "fire_emitter", role: "emitter", id: "part_fire_emit", z: 98, width: 48, height: 48, tags: ["radial", "upward"] },
            { category: "particles", name: "fire_particle", role: "particle", id: "part_fire", z: 99, width: 24, height: 24, tags: ["fade", "bright"] },
            { category: "particles", name: "magic_sparkle", role: "particle", id: "part_magic", z: 103, width: 12, height: 12, tags: ["bright", "twinkle"] },
            { category: "particles", name: "water_drop", role: "particle", id: "part_water", z: 97, width: 6, height: 6, tags: ["gravity", "splash"] },
            { category: "particles", name: "trail_line", role: "trail", id: "part_trail", z: 104, width: 4, height: 32, tags: ["motion", "blur"] }
          ]
        }
      ]
    },
    animation: {
      name: "Animation Layer Template",
      categories: [
        {
          name: "anim",
          items: [
            { category: "anim", name: "position_track", role: "track", id: "anim_pos", z: 10, tags: ["keyframe", "bezier"] },
            { category: "anim", name: "rotation_track", role: "track", id: "anim_rot", z: 11, tags: ["keyframe", "ease"] },
            { category: "anim", name: "scale_track", role: "track", id: "anim_scale", z: 12, tags: ["keyframe"] },
            { category: "anim", name: "opacity_track", role: "track", id: "anim_opacity", z: 13, tags: ["keyframe", "fade"] },
            { category: "anim", name: "pose_base", role: "pose", id: "anim_pose_base", z: 5, tags: ["rest"] },
            { category: "anim", name: "pose_action", role: "pose", id: "anim_pose_action", z: 6, tags: ["keyframe"] },
            { category: "anim", name: "rig_root", role: "rig", id: "anim_rig_root", z: 0, tags: ["bone"] },
            { category: "anim", name: "rig_limb", role: "rig", id: "anim_rig_limb", z: 1, tags: ["bone", "child"] }
          ]
        }
      ]
    },
    scene: {
      name: "Scene Building Template",
      categories: [
        {
          name: "scene",
          items: [
            { category: "scene", name: "background_sky", role: "base", id: "scene_sky", z: 0, width: 1920, height: 1080, tags: ["tileable", "parallax"] },
            { category: "scene", name: "background_ground", role: "base", id: "scene_ground", z: 1, width: 1920, height: 400, tags: ["tileable"] },
            { category: "scene", name: "midground_layer", role: "base", id: "scene_mid", z: 25, width: 1920, height: 800, tags: ["parallax"] },
            { category: "scene", name: "foreground_prop", role: "base", id: "scene_prop", z: 50, width: 200, height: 300, tags: ["interactive"] },
            { category: "scene", name: "overlay_mask", role: "mask", id: "scene_mask", z: 100, tags: ["blend"] },
            { category: "scene", name: "lighting_overlay", role: "overlay", id: "scene_light", z: 90, tags: ["blend", "screen"] },
            { category: "scene", name: "vignette", role: "overlay", id: "scene_vignette", z: 95, tags: ["blend", "multiply"] }
          ]
        }
      ]
    }
  };
  
  // Save each template
  Object.keys(templates).forEach(key => {
    const template = {
      version: 1,
      generatedAt: new Date().toISOString(),
      source: "predefined",
      name: templates[key].name,
      ...templates[key]
    };
    
    const templatePath = path.join(templatesDir, `template_${key}.json`);
    fs.writeFileSync(templatePath, JSON.stringify(template, null, 2));
    
    console.log(`Template generated: ${templatePath}`);
  });
  
  // Generate ExtendScript for each
  Object.keys(templates).forEach(key => {
    generateExtendScriptTemplate(templates[key], key);
  });
}

/**
 * Generate ExtendScript code from template
 */
function generateExtendScriptTemplate(template, name = "template") {
  const script = `#target illustrator

/**
 * Auto-generated template script
 * Generated from: ${template.name || "template"}
 * Date: ${new Date().toISOString()}
 */

(function() {
  'use strict';
  
  try {
    var doc = app.activeDocument;
    if (!doc) {
      alert("Please open a document first.");
      return;
    }
    
    var structure = ${JSON.stringify(template, null, 2)};
    var totalLayers = 0;
    
    for (var c = 0; c < structure.categories.length; c++) {
      var category = structure.categories[c];
      var categoryGroup = createGroup(doc, category.name);
      
      // Create a layer in the Layers panel for this category
      var categoryLayer = null;
      try {
        categoryLayer = doc.layers.add();
        categoryLayer.name = category.name;
        // Explicitly unlock category layer to allow editing
        categoryLayer.locked = false;
      } catch (e) {
        // Layer might already exist
        for (var li = 0; li < doc.layers.length; li++) {
          if (doc.layers[li].name === category.name) {
            categoryLayer = doc.layers[li];
            // Unlock existing layer if it was locked
            categoryLayer.locked = false;
            break;
          }
        }
      }
      
      for (var i = 0; i < category.items.length; i++) {
        var item = category.items[i];
        var layerName = buildLayerName(item);
        
        // Create layer in Layers panel first (inside category layer if possible)
        var layerObj = null;
        try {
          if (categoryLayer) {
            layerObj = categoryLayer.layers.add();
          } else {
            layerObj = doc.layers.add();
          }
          layerObj.name = layerName;
          // Explicitly unlock layer to allow editing
          layerObj.locked = false;
        } catch (e) {
          // Try creating at document level if category layer fails
          layerObj = doc.layers.add();
          layerObj.name = layerName;
          // Explicitly unlock layer to allow editing
          layerObj.locked = false;
        }
        
        // Create the actual shape
        var shape = createLayer(doc, layerName, item);
        
        // Ensure shape is also unlocked and editable
        if (shape) {
          try {
            shape.locked = false;
          } catch (e) {
            // Some shape types might not have locked property
          }
        }
        
        // Move shape into the group
        if (categoryGroup && shape) {
          try {
            shape.move(categoryGroup, ElementPlacement.PLACEATEND);
          } catch (e) {
            // Shape might already be in group
          }
        }
        
        totalLayers++;
      }
    }
    
    alert("Template applied: " + totalLayers + " layers created in " + structure.categories.length + " categories");
    
  } catch (e) {
    alert("Error: " + e.message + "\\nLine: " + e.line);
  }
  
  function buildLayerName(item) {
    var parts = [];
    parts.push(item.category || "misc");
    parts.push(item.name || "unnamed");
    parts.push("r" + (item.role || "base"));
    if (item.id) parts.push("id" + item.id);
    if (item.z !== undefined) parts.push("z" + item.z);
    if (item.width && item.height) parts.push("px" + item.width + "x" + item.height);
    if (item.tags && item.tags.length > 0) parts.push("tag" + item.tags.join("+"));
    return parts.join("__");
  }
  
  function createGroup(doc, name) {
    try {
      // Check if group already exists
      for (var i = 0; i < doc.groupItems.length; i++) {
        if (doc.groupItems[i].name === name) {
          return doc.groupItems[i];
        }
      }
      
      // Create new group
      var group = doc.groupItems.add();
      group.name = name;
      return group;
    } catch (e) {
      return null;
    }
  }
  
  function createLayer(doc, name, item) {
    try {
      var width = (item && item.width) ? item.width : 100;
      var height = (item && item.height) ? item.height : 100;
      
      // Create rectangle path
      var rect = doc.pathItems.rectangle(0, 0, width, height);
      rect.name = name;
      
      // Explicitly unlock shape to allow editing
      try {
        rect.locked = false;
      } catch (e) {
        // Some shape types might not have locked property
      }
      
      // Set fill to light gray for visibility
      try {
        rect.fillColor = doc.swatches["Gray"].color;
        rect.fillColor.gray = 80;
        rect.stroked = true;
        rect.strokeColor = doc.swatches["Black"].color;
        rect.strokeWidth = 1;
      } catch (e) {
        // Swatches might not exist, that's OK
      }
      
      return rect;
    } catch (e) {
      // Try simpler approach
      try {
        var rect = doc.pathItems.rectangle(0, 0, 100, 100);
        rect.name = name;
        // Explicitly unlock shape to allow editing
        try {
          rect.locked = false;
        } catch (e) {
          // Some shape types might not have locked property
        }
        return rect;
      } catch (e2) {
        return null;
      }
    }
  }
})();
`;
  
  const scriptPath = path.join(templatesDir, `${name}_generated.jsx`);
  fs.writeFileSync(scriptPath, script);
  console.log(`ExtendScript generated: ${scriptPath}`);
}

// CLI
const args = process.argv.slice(2);
const command = args[0] || "all";

if (command === "from-manifest") {
  generateFromManifest();
} else if (command === "predefined") {
  generatePredefinedTemplates();
} else if (command === "all") {
  generatePredefinedTemplates();
  if (fs.existsSync(manifestPath)) {
    generateFromManifest();
  }
} else {
  console.log("Usage:");
  console.log("  node template_generator.js [from-manifest|predefined|all]");
  console.log("");
  console.log("Commands:");
  console.log("  from-manifest  - Generate template from existing manifest.json");
  console.log("  predefined    - Generate predefined templates (ui, character, env, fx)");
  console.log("  all           - Generate all templates (default)");
}


