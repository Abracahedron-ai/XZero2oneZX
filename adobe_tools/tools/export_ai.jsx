#target illustrator

(function () {
  var doc = app.activeDocument;
  var outDir = Folder(Folder.current + "/../dist/sprites");
  if (!outDir.exists) outDir.create();

  var manifest = [];

  function parseName(n) {
    var o = {
      raw: n,
      category: "misc",
      name: n,
      role: "base",
      id: "",
      z: 0,
      tags: [],
      w: null,
      h: null
    };

    n.split("__").forEach(function(tok) {
      if (tok.indexOf("r") === 0) o.role = tok.slice(1);
      else if (tok.indexOf("id") === 0) o.id = tok.slice(2);
      else if (tok.indexOf("z") === 0) o.z = parseInt(tok.slice(1), 10);
      else if (tok.indexOf("px") === 0) {
        var wh = tok.slice(2).split("x");
        o.w = +wh[0];
        o.h = +wh[1];
      }
      else if (tok.indexOf("tag") === 0) o.tags = tok.slice(3).split("+");
      else if (!o.category || o.category === "misc") o.category = tok;
      else o.name = tok;
    });

    return o;
  }

  function exportItem(item) {
    var meta = parseName(item.name);
    var baseName = meta.category + "_" + (meta.id || meta.name) + "_" + meta.role;

    // Export SVG
    var svgFile = File(outDir + "/" + baseName + ".svg");
    var svgOpts = new ExportOptionsSVG();
    svgOpts.embedRasterImages = true;
    doc.selection = null;
    item.selected = true;
    doc.exportFile(svgFile, ExportType.SVG, svgOpts);

    // Export PNG (optional)
    var pngFile = File(outDir + "/" + baseName + ".png");
    var pngOpts = new ExportOptionsPNG24();
    pngOpts.transparency = true;
    pngOpts.artBoardClipping = true;
    doc.exportFile(pngFile, ExportType.PNG24, pngOpts);

    meta.files = {
      svg: svgFile.fsName,
      png: pngFile.fsName
    };
    manifest.push(meta);
  }

  // Iterate through top-level groups
  for (var i = 0; i < doc.pageItems.length; i++) {
    var it = doc.pageItems[i];
    if (!it.hidden && it.name && it.typename !== "TextRange") {
      exportItem(it);
    }
  }

  // Save manifest
  var mf = File(Folder(Folder.current + "/../dist/manifest.json"));
  mf.open("w");
  mf.write(JSON.stringify({
    generatedAt: new Date().toISOString(),
    items: manifest
  }, null, 2));
  mf.close();

  alert("Export complete: " + manifest.length + " items");
})();



