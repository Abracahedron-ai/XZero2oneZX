#!/usr/bin/env node

/**
 * Quick Template CLI
 * 
 * Interactive CLI for rapid template generation
 * Select template type and generate both Adobe and compositor formats
 */

const fs = require("fs");
const path = require("path");
const readline = require("readline");
const { execSync } = require("child_process");

const toolsDir = path.resolve(__dirname);
const templatesDir = path.resolve(__dirname, "../templates");
const compositorDir = path.resolve(__dirname, "../dist/compositor");

// Template types
const TEMPLATE_TYPES = {
  "1": { name: "UI Elements", key: "ui" },
  "2": { name: "Character", key: "character" },
  "3": { name: "Environment", key: "environment" },
  "4": { name: "Effects", key: "effects" },
  "5": { name: "Particles", key: "particles" },
  "6": { name: "Animation", key: "animation" },
  "7": { name: "Scene Building", key: "scene" },
  "8": { name: "All Templates", key: "all" }
};

// Particle subtypes
const PARTICLE_SUBTYPES = {
  "1": { name: "Explosion", items: ["explosion_core", "explosion_debris", "smoke_cloud", "spark"] },
  "2": { name: "Fire", items: ["fire_emitter", "fire_particle"] },
  "3": { name: "Magic", items: ["magic_sparkle"] },
  "4": { name: "Water", items: ["water_drop"] },
  "5": { name: "Trail", items: ["trail_line"] },
  "6": { name: "All Particles", items: [] }
};

// Animation subtypes
const ANIMATION_SUBTYPES = {
  "1": { name: "Keyframe Tracks", items: ["position_track", "rotation_track", "scale_track", "opacity_track"] },
  "2": { name: "Poses", items: ["pose_base", "pose_action"] },
  "3": { name: "Rig", items: ["rig_root", "rig_limb"] },
  "4": { name: "All Animation", items: [] }
};

// Scene subtypes
const SCENE_SUBTYPES = {
  "1": { name: "Backgrounds", items: ["background_sky", "background_ground", "midground_layer"] },
  "2": { name: "Props", items: ["foreground_prop"] },
  "3": { name: "Overlays", items: ["overlay_mask", "lighting_overlay", "vignette"] },
  "4": { name: "All Scene", items: [] }
};

/**
 * Create readline interface
 */
function createInterface() {
  return readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
}

/**
 * Prompt user for input
 */
function prompt(rl, question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer);
    });
  });
}

/**
 * Main interactive flow
 */
async function interactiveFlow() {
  const rl = createInterface();
  
  try {
    console.log("\n=== Quick Template Generator ===\n");
    console.log("Select template type:");
    Object.keys(TEMPLATE_TYPES).forEach(key => {
      console.log(`  ${key}. ${TEMPLATE_TYPES[key].name}`);
    });
    
    const templateChoice = await prompt(rl, "\nEnter choice (1-8): ");
    const templateType = TEMPLATE_TYPES[templateChoice];
    
    if (!templateType) {
      console.error("Invalid choice");
      rl.close();
      return;
    }
    
    if (templateType.key === "all") {
      // Generate all templates
      console.log("\nGenerating all templates...");
      rl.close();
      execSync(`node ${path.join(toolsDir, "generate_all_templates.js")}`, {
        cwd: toolsDir,
        stdio: "inherit"
      });
      return;
    }
    
    // Ask for output format
    console.log("\nSelect output format:");
    console.log("  1. Adobe only (AI/PSD layers)");
    console.log("  2. Compositor only (JSON config)");
    console.log("  3. Both (Adobe + Compositor)");
    
    const formatChoice = await prompt(rl, "\nEnter choice (1-3): ");
    const generateAdobe = formatChoice === "1" || formatChoice === "3";
    const generateCompositor = formatChoice === "2" || formatChoice === "3";
    
    if (!generateAdobe && !generateCompositor) {
      console.error("Invalid choice");
      rl.close();
      return;
    }
    
    // Generate templates
    console.log(`\nGenerating ${templateType.name} template...`);
    
    if (generateAdobe) {
      console.log("  - Generating Adobe template...");
      execSync(`node ${path.join(toolsDir, "template_generator.js")} predefined`, {
        cwd: toolsDir,
        stdio: "pipe"
      });
      console.log("  ✓ Adobe template generated");
    }
    
    if (generateCompositor) {
      console.log("  - Generating compositor config...");
      const templatePath = path.join(templatesDir, `template_${templateType.key}.json`);
      if (fs.existsSync(templatePath)) {
        execSync(`node ${path.join(toolsDir, "generate_compositor_config.js")} from-template "${templatePath}"`, {
          cwd: toolsDir,
          stdio: "pipe"
        });
        console.log("  ✓ Compositor config generated");
      } else {
        console.log("  ⚠ Template file not found, generating all templates first...");
        execSync(`node ${path.join(toolsDir, "template_generator.js")} predefined`, {
          cwd: toolsDir,
          stdio: "pipe"
        });
        execSync(`node ${path.join(toolsDir, "generate_compositor_config.js")} from-template "${templatePath}"`, {
          cwd: toolsDir,
          stdio: "pipe"
        });
        console.log("  ✓ Compositor config generated");
      }
    }
    
    console.log("\n✓ Template generation complete!");
    console.log(`\nFiles:`);
    if (generateAdobe) {
      console.log(`  - ${path.join(templatesDir, `template_${templateType.key}.json`)}`);
      console.log(`  - ${path.join(templatesDir, `${templateType.key}_generated.jsx`)}`);
    }
    if (generateCompositor) {
      console.log(`  - ${path.join(compositorDir, `template_${templateType.key}_compositor.json`)}`);
    }
    
  } catch (e) {
    console.error("Error:", e.message);
  } finally {
    rl.close();
  }
}

// CLI
const args = process.argv.slice(2);
const command = args[0];

if (command === "interactive" || !command) {
  interactiveFlow();
} else if (command === "help") {
  console.log("Usage:");
  console.log("  node quick_template.js [interactive|help]");
  console.log("");
  console.log("Commands:");
  console.log("  interactive  - Interactive template generator (default)");
  console.log("  help         - Show this help message");
  console.log("");
  console.log("The interactive mode will:");
  console.log("  1. Ask you to select a template type");
  console.log("  2. Ask you to select output format (Adobe, Compositor, or Both)");
  console.log("  3. Generate the selected templates");
} else {
  interactiveFlow();
}


