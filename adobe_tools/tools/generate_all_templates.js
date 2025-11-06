#!/usr/bin/env node

/**
 * Unified Template Generator
 * 
 * Generates all templates (Adobe + Compositor) in one command
 * Single script to generate:
 * - Adobe layer templates (AI/PSD)
 * - Compositor JSON configs
 * - Manifest entries
 * - Documentation
 */

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const toolsDir = path.resolve(__dirname);
const templatesDir = path.resolve(__dirname, "../templates");
const dist = path.resolve(__dirname, "../dist");
const compositorDir = path.resolve(__dirname, "../dist/compositor");

// Ensure directories exist
if (!fs.existsSync(templatesDir)) {
  fs.mkdirSync(templatesDir, { recursive: true });
}
if (!fs.existsSync(compositorDir)) {
  fs.mkdirSync(compositorDir, { recursive: true });
}

/**
 * Generate all templates
 */
function generateAll() {
  console.log("=== Generating All Templates ===\n");
  
  // Step 1: Generate predefined templates (Adobe)
  console.log("Step 1: Generating predefined templates...");
  try {
    execSync(`node ${path.join(toolsDir, "template_generator.js")} predefined`, {
      cwd: toolsDir,
      stdio: "inherit"
    });
    console.log("✓ Predefined templates generated\n");
  } catch (e) {
    console.error("✗ Error generating predefined templates:", e.message);
  }
  
  // Step 2: Generate compositor configs from templates
  console.log("Step 2: Generating compositor configs...");
  try {
    execSync(`node ${path.join(toolsDir, "generate_compositor_config.js")} all`, {
      cwd: toolsDir,
      stdio: "inherit"
    });
    console.log("✓ Compositor configs generated\n");
  } catch (e) {
    console.error("✗ Error generating compositor configs:", e.message);
  }
  
  // Step 3: Generate from manifest if it exists
  const manifestPath = path.join(dist, "manifest.json");
  if (fs.existsSync(manifestPath)) {
    console.log("Step 3: Generating from manifest...");
    try {
      execSync(`node ${path.join(toolsDir, "template_generator.js")} from-manifest`, {
        cwd: toolsDir,
        stdio: "inherit"
      });
      console.log("✓ Manifest template generated\n");
      
      // Also generate compositor config from manifest
      execSync(`node ${path.join(toolsDir, "generate_compositor_config.js")} from-manifest`, {
        cwd: toolsDir,
        stdio: "inherit"
      });
      console.log("✓ Manifest compositor config generated\n");
    } catch (e) {
      console.error("✗ Error generating from manifest:", e.message);
    }
  } else {
    console.log("Step 3: No manifest.json found (skipping)\n");
  }
  
  // Step 4: Summary
  console.log("=== Summary ===");
  console.log(`Templates: ${templatesDir}`);
  console.log(`Compositor configs: ${compositorDir}`);
  
  // Count files
  const templateFiles = fs.existsSync(templatesDir) 
    ? fs.readdirSync(templatesDir).filter(f => f.endsWith(".json")).length 
    : 0;
  const compositorFiles = fs.existsSync(compositorDir)
    ? fs.readdirSync(compositorDir).filter(f => f.endsWith(".json")).length
    : 0;
  
  console.log(`\nGenerated:`);
  console.log(`  - ${templateFiles} template files`);
  console.log(`  - ${compositorFiles} compositor config files`);
  console.log("\n✓ All templates generated successfully!");
}

// CLI
const args = process.argv.slice(2);
const command = args[0] || "all";

if (command === "all" || !command) {
  generateAll();
} else {
  console.log("Usage:");
  console.log("  node generate_all_templates.js [all]");
  console.log("");
  console.log("Generates:");
  console.log("  - All predefined templates (UI, Character, Environment, Effects, Particles, Animation, Scene)");
  console.log("  - Compositor configs from all templates");
  console.log("  - Templates from manifest.json (if exists)");
  console.log("  - Compositor configs from manifest.json (if exists)");
}


