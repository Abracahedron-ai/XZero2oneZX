#!/usr/bin/env node

/**
 * Compositor Config Generator
 * 
 * Generates compositor-ready JSON from templates or manifest
 * Outputs Layer interface compatible JSON
 */

const fs = require("fs");
const path = require("path");
const { templateToCompositor, manifestToCompositor } = require("./template_to_compositor");

const dist = path.resolve(__dirname, "../dist");
const templatesDir = path.resolve(__dirname, "../templates");
const compositorDir = path.resolve(__dirname, "../dist/compositor");

// Ensure compositor directory exists
if (!fs.existsSync(compositorDir)) {
  fs.mkdirSync(compositorDir, { recursive: true });
}

/**
 * Generate compositor config from template
 */
function generateFromTemplate(templatePath) {
  if (!fs.existsSync(templatePath)) {
    console.error(`Template file not found: ${templatePath}`);
    process.exit(1);
  }
  
  const template = JSON.parse(fs.readFileSync(templatePath, "utf8"));
  const compositorConfig = templateToCompositor(template);
  
  // Generate output filename
  const templateName = path.basename(templatePath, ".json");
  const outputPath = path.join(compositorDir, `${templateName}_compositor.json`);
  
  fs.writeFileSync(outputPath, JSON.stringify(compositorConfig, null, 2));
  
  console.log(`Compositor config generated: ${outputPath}`);
  console.log(`Layers: ${compositorConfig.layers.length}`);
  
  return outputPath;
}

/**
 * Generate compositor config from manifest
 */
function generateFromManifest(manifestPath) {
  const manifestFile = manifestPath || path.join(dist, "manifest.json");
  
  if (!fs.existsSync(manifestFile)) {
    console.error(`Manifest file not found: ${manifestFile}`);
    console.error("Run export scripts first to generate manifest.json");
    process.exit(1);
  }
  
  const compositorConfig = manifestToCompositor(manifestFile);
  
  const outputPath = path.join(compositorDir, "manifest_compositor.json");
  fs.writeFileSync(outputPath, JSON.stringify(compositorConfig, null, 2));
  
  console.log(`Compositor config generated: ${outputPath}`);
  console.log(`Layers: ${compositorConfig.layers.length}`);
  
  return outputPath;
}

/**
 * Generate compositor configs from all templates
 */
function generateFromAllTemplates() {
  if (!fs.existsSync(templatesDir)) {
    console.error(`Templates directory not found: ${templatesDir}`);
    console.error("Run template generator first to create templates");
    process.exit(1);
  }
  
  const templateFiles = fs.readdirSync(templatesDir)
    .filter(f => f.endsWith(".json") && f.startsWith("template_"));
  
  if (templateFiles.length === 0) {
    console.error("No template files found. Run template generator first.");
    process.exit(1);
  }
  
  console.log(`Found ${templateFiles.length} template files`);
  
  templateFiles.forEach(templateFile => {
    const templatePath = path.join(templatesDir, templateFile);
    try {
      generateFromTemplate(templatePath);
    } catch (e) {
      console.error(`Error processing ${templateFile}: ${e.message}`);
    }
  });
}

// CLI
const args = process.argv.slice(2);
const command = args[0];

if (command === "from-template" && args[1]) {
  const templatePath = path.resolve(args[1]);
  generateFromTemplate(templatePath);
} else if (command === "from-manifest") {
  const manifestPath = args[1] ? path.resolve(args[1]) : null;
  generateFromManifest(manifestPath);
} else if (command === "all" || !command) {
  generateFromAllTemplates();
  // Also try manifest if it exists
  const manifestPath = path.join(dist, "manifest.json");
  if (fs.existsSync(manifestPath)) {
    console.log("");
    generateFromManifest(manifestPath);
  }
} else {
  console.log("Usage:");
  console.log("  node generate_compositor_config.js [command] [path]");
  console.log("");
  console.log("Commands:");
  console.log("  all                    - Generate from all templates (default)");
  console.log("  from-template <path>   - Generate from specific template file");
  console.log("  from-manifest [path]   - Generate from manifest.json");
  console.log("");
  console.log("Examples:");
  console.log("  node generate_compositor_config.js all");
  console.log("  node generate_compositor_config.js from-template templates/template_particles.json");
  console.log("  node generate_compositor_config.js from-manifest");
}


