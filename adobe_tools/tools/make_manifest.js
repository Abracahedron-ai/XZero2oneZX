const fs = require("fs");
const path = require("path");

const dist = path.resolve(__dirname, "../dist");
const manifestPath = path.join(dist, "manifest.json");

if (!fs.existsSync(manifestPath)) {
  console.error("No manifest.json found. Run export scripts first.");
  process.exit(1);
}

const raw = JSON.parse(fs.readFileSync(manifestPath, "utf8"));

const items = raw.items.map(it => ({
  category: it.category,
  id: it.id || it.name,
  name: it.name,
  role: it.role || "base",
  z: it.z || 0,
  tags: it.tags || [],
  files: it.files || {
    png: it.file || null,
    svg: it.svg || null
  },
  mask: it.mask || null,
  anchor: it.anchor || { x: 0.5, y: 0.5 },
  collider: it.collider || null,
  nineSlice: it.tags && it.tags.includes("9s") ? { l: 12, t: 12, r: 12, b: 12 } : null,
  width: it.w || null,
  height: it.h || null
}));

// Add atlas references if they exist
const atlasPath = path.join(dist, "atlases");
if (fs.existsSync(atlasPath)) {
  const atlasFiles = fs.readdirSync(atlasPath).filter(f => f.endsWith(".json"));
  atlasFiles.forEach(atlasFile => {
    try {
      const atlasData = JSON.parse(fs.readFileSync(path.join(atlasPath, atlasFile), "utf8"));
      // Merge atlas UV rects into manifest items
      // This would need to match by filename/id
    } catch (e) {
      console.warn("Could not parse atlas:", atlasFile);
    }
  });
}

const normalized = {
  version: 1,
  generatedAt: raw.generatedAt || new Date().toISOString(),
  items: items
};

fs.writeFileSync(manifestPath, JSON.stringify(normalized, null, 2));
console.log("Manifest normalized:", items.length, "items");



