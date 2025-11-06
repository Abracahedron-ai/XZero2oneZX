#!/usr/bin/env node

/**
 * Template to Compositor Mapper
 * 
 * Maps Adobe template structure to compositor Layer format
 * Converts semantic naming to compositor properties
 */

const fs = require("fs");
const path = require("path");

/**
 * Map template item to compositor layer
 */
function mapItemToLayer(item, index = 0) {
  // Determine blend mode from tags
  const blendMode = determineBlendMode(item.tags || []);
  
  // Determine type from category and role
  const type = determineType(item.category, item.role);
  
  // Generate description from tags and role
  const description = generateDescription(item);
  
  // Calculate pivot position (default center)
  const pivotX = 0.5;
  const pivotY = 0.5;
  const pivotZ = 0;
  
  // Generate layer ID from item ID or name
  const layerId = item.id || item.name || `layer_${index}`;
  
  // Determine opacity based on tags
  const opacity = item.tags && item.tags.includes("fade") ? 0.8 : 1.0;
  
  // Determine capture to output based on role
  const captureToOutput = item.role !== "mask" && item.role !== "collider";
  
  return {
    id: layerId,
    name: item.name || "unnamed",
    parentId: null, // Can be set later for hierarchical structures
    visible: true,
    locked: false,
    transform: {
      position: { x: 0, y: 0, z: 0 },
      rotation: { x: 0, y: 0, z: 0 },
      scale: { x: 1, y: 1, z: 1 }
    },
    pivot: {
      position: { x: pivotX, y: pivotY, z: pivotZ },
      rotation: { x: 0, y: 0, z: 0 },
      mode: "layer"
    },
    flags: {
      editMode: true,  // Allow editing by default
      selectable: true
    },
    meta: {
      unitScale: 1,
      description: description,
      category: item.category || "misc",
      role: item.role || "base",
      tags: item.tags || [],
      width: item.width || null,
      height: item.height || null
    },
    type: type,
    zIndex: item.z || 0,
    captureToOutput: captureToOutput,
    blendMode: blendMode,
    opacity: opacity,
    workareaOpacity: item.role === "overlay" ? 0.5 : undefined
  };
}

/**
 * Determine blend mode from tags
 */
function determineBlendMode(tags) {
  if (tags.includes("screen")) return "screen";
  if (tags.includes("multiply")) return "multiply";
  if (tags.includes("overlay")) return "overlay";
  if (tags.includes("blend")) return "normal";
  if (tags.includes("bright")) return "screen";
  if (tags.includes("fade")) return "normal";
  return "normal";
}

/**
 * Determine type from category and role
 */
function determineType(category, role) {
  if (category === "particles") {
    if (role === "emitter") return "particle";
    if (role === "particle") return "particle";
    if (role === "trail") return "particle";
    return "particle";
  }
  if (category === "anim") {
    if (role === "track") return "animation";
    if (role === "pose") return "animation";
    if (role === "rig") return "animation";
    return "animation";
  }
  if (category === "scene") {
    if (role === "base") return "scene";
    if (role === "overlay") return "compositing";
    if (role === "mask") return "mask";
    return "scene";
  }
  return category || "misc";
}

/**
 * Generate description from item properties
 */
function generateDescription(item) {
  const parts = [];
  
  if (item.category) {
    parts.push(item.category);
  }
  
  if (item.role) {
    parts.push(item.role);
  }
  
  if (item.tags && item.tags.length > 0) {
    parts.push(`tags: ${item.tags.join(", ")}`);
  }
  
  if (item.width && item.height) {
    parts.push(`size: ${item.width}x${item.height}`);
  }
  
  return parts.join(" | ") || "Layer";
}

/**
 * Convert template structure to compositor layers
 */
function templateToCompositor(template) {
  const layers = [];
  
  if (!template.categories || !Array.isArray(template.categories)) {
    throw new Error("Invalid template structure: missing categories");
  }
  
  template.categories.forEach((category, catIndex) => {
    if (!category.items || !Array.isArray(category.items)) {
      return;
    }
    
    category.items.forEach((item, itemIndex) => {
      const layer = mapItemToLayer(item, layers.length);
      
      // Set parent if category has a parent structure
      // For now, all layers are top-level
      
      layers.push(layer);
    });
  });
  
  return {
    version: 1,
    generatedAt: new Date().toISOString(),
    source: template.source || "template",
    templateName: template.name || "template",
    layers: layers
  };
}

/**
 * Convert manifest to compositor layers
 */
function manifestToCompositor(manifestPath) {
  if (!fs.existsSync(manifestPath)) {
    throw new Error(`Manifest file not found: ${manifestPath}`);
  }
  
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  const items = manifest.items || [];
  
  const layers = items.map((item, index) => {
    return mapItemToLayer(item, index);
  });
  
  return {
    version: 1,
    generatedAt: new Date().toISOString(),
    source: "manifest",
    layers: layers
  };
}

module.exports = {
  mapItemToLayer,
  templateToCompositor,
  manifestToCompositor,
  determineBlendMode,
  determineType,
  generateDescription
};

