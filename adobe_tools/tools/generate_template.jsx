#target illustrator

/**
 * Template Generator for Adobe Illustrator
 * 
 * Generates template AI files with proper layer structure and naming
 * based on manifest or predefined templates.
 */

(function() {
  'use strict';
  
  try {
    var doc = app.activeDocument;
    if (!doc) {
      alert("Please open a document first.");
      return;
    }
    
    var manifestPath = File(Folder.current + "/../dist/manifest.json");
    var useManifest = false;
    
    // Check if manifest exists
    if (manifestPath.exists) {
      useManifest = confirm("Use existing manifest.json to generate template?\n\nYes: Generate from manifest\nNo: Create new template structure");
    }
    
    if (useManifest) {
      generateFromManifest(doc, manifestPath);
    } else {
      generateNewTemplate(doc);
    }
    
  } catch (e) {
    alert("Error: " + e.message + "\nLine: " + e.line);
  }
  
  function generateFromManifest(doc, manifestPath) {
    try {
      manifestPath.open("r");
      var manifestJson = manifestPath.read();
      manifestPath.close();
      
      // Check if file is empty
      if (!manifestJson || manifestJson.length === 0) {
        alert("Manifest file is empty.");
        return;
      }
      
      // ExtendScript doesn't have JSON.parse, use eval instead
      // Wrap in try-catch for invalid JSON
      var manifest;
      try {
        manifest = eval("(" + manifestJson + ")");
      } catch (e) {
        alert("Error parsing manifest JSON: " + e.message + "\n\nMake sure manifest.json is valid JSON.");
        return;
      }
      
      if (!manifest || !manifest.items) {
        alert("Manifest is missing 'items' array.");
        return;
      }
      
      var items = manifest.items || [];
      
      if (items.length === 0) {
        alert("Manifest is empty. No items to generate.");
        return;
      }
      
      // Group items by category
      var byCategory = {};
      for (var i = 0; i < items.length; i++) {
        var item = items[i];
        var cat = item.category || "misc";
        if (!byCategory[cat]) {
          byCategory[cat] = [];
        }
        byCategory[cat].push(item);
      }
      
      var totalLayers = 0;
      var categories = [];
      for (var cat in byCategory) {
        categories.push(cat);
      }
      
      // Create layer structure
      for (var c = 0; c < categories.length; c++) {
        var category = categories[c];
        var categoryGroup = createGroup(doc, category);
        var categoryItems = byCategory[category];
        
        // Create a layer in the Layers panel for this category
        var categoryLayer = null;
        try {
          categoryLayer = doc.layers.add();
          categoryLayer.name = category;
          // Explicitly unlock category layer to allow editing
          categoryLayer.locked = false;
        } catch (e) {
          // Layer might already exist
          for (var li = 0; li < doc.layers.length; li++) {
            if (doc.layers[li].name === category) {
              categoryLayer = doc.layers[li];
              // Unlock existing layer if it was locked
              categoryLayer.locked = false;
              break;
            }
          }
        }
        
        for (var i = 0; i < categoryItems.length; i++) {
          var item = categoryItems[i];
          var layerName = buildLayerName(item);
          
          // Create layer in Layers panel first
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
          
          // Create the actual shape inside the layer
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
      
      alert("Template generated from manifest:\n" + totalLayers + " layers created\n" + categories.length + " categories");
      
    } catch (e) {
      alert("Error reading manifest: " + e.message);
    }
  }
  
  function generateNewTemplate(doc) {
    var templateType = prompt("Template type:\n1. UI Elements\n2. Character\n3. Environment\n4. Effects\n5. Particles\n6. Animation\n7. Scene Building\n8. Custom", "1");
    
    if (!templateType) {
      return;
    }
    
    var structure = getTemplateStructure(templateType);
    
    if (!structure) {
      alert("Invalid template type");
      return;
    }
    
    var totalLayers = 0;
    
    // Create template structure
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
        var layerName = buildLayerNameFromSpec(item);
        
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
    
    alert("Template generated:\n" + totalLayers + " layers created\n" + structure.categories.length + " categories");
  }
  
  function buildLayerName(item) {
    var parts = [];
    
    // Required: category
    parts.push(item.category || "misc");
    
    // Required: name
    parts.push(item.name || "unnamed");
    
    // Required: role
    parts.push("r" + (item.role || "base"));
    
    // Optional: id
    if (item.id) {
      parts.push("id" + item.id);
    }
    
    // Optional: z-order
    if (item.z !== undefined && item.z !== 0) {
      parts.push("z" + item.z);
    }
    
    // Optional: size
    if (item.width && item.height) {
      parts.push("px" + item.width + "x" + item.height);
    }
    
    // Optional: tags
    if (item.tags && item.tags.length > 0) {
      parts.push("tag" + item.tags.join("+"));
    }
    
    return parts.join("__");
  }
  
  function buildLayerNameFromSpec(spec) {
    var parts = [];
    parts.push(spec.category || "misc");
    parts.push(spec.name || "unnamed");
    parts.push("r" + (spec.role || "base"));
    
    if (spec.id) parts.push("id" + spec.id);
    if (spec.z !== undefined) parts.push("z" + spec.z);
    if (spec.width && spec.height) parts.push("px" + spec.width + "x" + spec.height);
    if (spec.tags && spec.tags.length > 0) parts.push("tag" + spec.tags.join("+"));
    
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
      alert("Error creating group '" + name + "': " + e.message);
      return null;
    }
  }
  
  function createLayer(doc, name, item) {
    try {
      var width = (item && item.width) ? item.width : 100;
      var height = (item && item.height) ? item.height : 100;
      var category = (item && item.category) ? item.category : "misc";
      var role = (item && item.role) ? item.role : "base";
      var tags = (item && item.tags) ? item.tags : [];
      
      var shape;
      
      // Particle-specific shapes
      if (category === "particles") {
        if (role === "emitter") {
          // Emitter: circle shape
          shape = doc.pathItems.ellipse(0, 0, width, height);
        } else if (role === "trail") {
          // Trail: elongated rectangle
          shape = doc.pathItems.rectangle(0, 0, width, height);
        } else {
          // Particle: small circle or square based on size
          if (width <= 16 && height <= 16) {
            shape = doc.pathItems.ellipse(0, 0, width, height);
          } else {
            shape = doc.pathItems.rectangle(0, 0, width, height);
          }
        }
      } else if (category === "anim") {
        // Animation: horizontal line for tracks, rectangle for poses
        if (role === "track") {
          shape = doc.pathItems.rectangle(0, 0, width || 200, height || 20);
        } else if (role === "rig") {
          shape = doc.pathItems.ellipse(0, 0, width || 16, height || 16);
        } else {
          shape = doc.pathItems.rectangle(0, 0, width || 100, height || 100);
        }
      } else {
        // Default: rectangle
        shape = doc.pathItems.rectangle(0, 0, width, height);
      }
      
      shape.name = name;
      
      // Set fill color based on category
      try {
        if (category === "particles") {
          if (tags.indexOf("bright") > -1 || tags.indexOf("fire") > -1) {
            shape.fillColor = doc.swatches["Red"].color;
            shape.fillColor.red = 255;
            shape.fillColor.green = 200;
            shape.fillColor.blue = 0;
          } else if (tags.indexOf("smoke") > -1) {
            shape.fillColor = doc.swatches["Gray"].color;
            shape.fillColor.gray = 50;
          } else {
            shape.fillColor = doc.swatches["Yellow"].color;
            shape.fillColor.yellow = 255;
          }
        } else if (category === "anim") {
          shape.fillColor = doc.swatches["Blue"].color;
          shape.fillColor.blue = 200;
        } else if (category === "scene") {
          shape.fillColor = doc.swatches["Gray"].color;
          shape.fillColor.gray = 120;
        } else {
          shape.fillColor = doc.swatches["Gray"].color;
          shape.fillColor.gray = 80;
        }
        
        // Set stroke
        shape.stroked = true;
        shape.strokeColor = doc.swatches["Black"].color;
        shape.strokeWidth = 1;
      } catch (e) {
        // Swatches might not exist, that's OK
      }
      
      return shape;
    } catch (e) {
      // Try simpler approach if above fails
      try {
        var rect = doc.pathItems.rectangle(0, 0, 100, 100);
        rect.name = name;
        return rect;
      } catch (e2) {
        alert("Error creating layer '" + name + "': " + e2.message);
        return null;
      }
    }
  }
  
  function getTemplateStructure(type) {
    var templates = {
      "1": { // UI Elements
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
        ],
        totalItems: 5
      },
      "2": { // Character
        categories: [
          {
            name: "char",
            items: [
              { category: "char", name: "character_head", role: "base", id: "char_head", z: 3, width: 64, height: 64 },
              { category: "char", name: "character_head", role: "mask", id: "char_head_mask", z: 3, width: 64, height: 64 },
              { category: "char", name: "character_body", role: "base", id: "char_body", z: 2, width: 64, height: 128 },
              { category: "char", name: "character_body", role: "mask", id: "char_body_mask", z: 2, width: 64, height: 128 },
              { category: "char", name: "character_legs", role: "base", id: "char_legs", z: 1, width: 64, height: 64 },
              { category: "char", name: "character_collider", role: "collider", id: "char_collider", z: 0, width: 32, height: 32 }
            ]
          }
        ],
        totalItems: 6
      },
      "3": { // Environment
        categories: [
          {
            name: "env",
            items: [
              { category: "env", name: "floor_tile_a", role: "base", id: "tile_a", width: 128, height: 128, tags: ["tileable"] },
              { category: "env", name: "floor_tile_b", role: "base", id: "tile_b", width: 128, height: 128, tags: ["tileable"] },
              { category: "env", name: "wall_brick", role: "base", id: "wall_brick", width: 128, height: 128, tags: ["tileable"] },
              { category: "env", name: "ceiling_panel", role: "base", id: "ceiling", z: 10, width: 256, height: 256 }
            ]
          }
        ],
        totalItems: 4
      },
      "4": { // Effects
        categories: [
          {
            name: "fx",
            items: [
              { category: "fx", name: "explosion", role: "base", id: "fx_expl", z: 100, width: 128, height: 128 },
              { category: "fx", name: "smoke", role: "base", id: "fx_smoke", z: 99, width: 128, height: 128 },
              { category: "fx", name: "spark", role: "base", id: "fx_spark", z: 101, width: 64, height: 64 }
            ]
          }
        ],
        totalItems: 3
      },
      "5": { // Particles
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
        ],
        totalItems: 9
      },
      "6": { // Animation
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
        ],
        totalItems: 8
      },
      "7": { // Scene Building
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
        ],
        totalItems: 7
      }
    };
    
    return templates[type] || null;
  }
})();
