#target photoshop

(function() {
  var doc = app.activeDocument;
  var outSprites = Folder(Folder.current + "/../dist/sprites");
  if (!outSprites.exists) outSprites.create();
  
  var outMasks = Folder(Folder.current + "/../dist/masks");
  if (!outMasks.exists) outMasks.create();

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

  function exportLayerSet(set) {
    var meta = parseName(set.name);
    var baseName = meta.category + "_" + (meta.id || meta.name);

    // Duplicate & isolate
    var dup = set.duplicate();
    dup.merge();

    var pngFile = File(outSprites + "/" + baseName + "_" + meta.role + ".png");
    var opts = new PNGSaveOptions();
    opts.compression = 6;
    opts.interlaced = false;

    // Copy merged layer to new document
    dup.copy();
    var bounds = dup.bounds;
    var width = bounds[2] - bounds[0];
    var height = bounds[3] - bounds[1];
    
    var tmp = app.documents.add(width, height, 72, "tmp", NewDocumentMode.RGB, DocumentFill.TRANSPARENT);
    tmp.paste(true);
    tmp.saveAs(pngFile, opts, true);
    tmp.close(SaveOptions.DONOTSAVECHANGES);

    // Check for mask layers
    for (var i = 0; i < set.layers.length; i++) {
      var l = set.layers[i];
      if (l.name.indexOf("__rmask") > -1 || l.name.indexOf("rmask") > -1) {
        var maskFile = File(outMasks + "/" + baseName + "_mask.png");
        l.copy();
        var t2 = app.documents.add(width, height, 72, "tmp2", NewDocumentMode.GRAYSCALE, DocumentFill.WHITE);
        t2.paste(true);
        t2.saveAs(maskFile, opts, true);
        t2.close(SaveOptions.DONOTSAVECHANGES);
        meta.mask = maskFile.fsName;
      }
    }

    meta.file = pngFile.fsName;
    manifest.push(meta);
  }

  // Walk top-level groups (layerSets)
  for (var i = 0; i < doc.layerSets.length; i++) {
    exportLayerSet(doc.layerSets[i]);
  }

  // Also check for top-level layers
  for (var j = 0; j < doc.layers.length; j++) {
    var layer = doc.layers[j];
    if (layer.typename === "ArtLayer" && layer.name) {
      var meta = parseName(layer.name);
      if (meta.category !== "misc" || meta.id) {
        // Export single layer
        var baseName = meta.category + "_" + (meta.id || meta.name);
        var pngFile = File(outSprites + "/" + baseName + "_" + meta.role + ".png");
        var opts = new PNGSaveOptions();
        var bounds = layer.bounds;
        var width = bounds[2] - bounds[0];
        var height = bounds[3] - bounds[1];
        var tmp = app.documents.add(width, height, 72, "tmp", NewDocumentMode.RGB, DocumentFill.TRANSPARENT);
        layer.copy();
        tmp.paste(true);
        tmp.saveAs(pngFile, opts, true);
        tmp.close(SaveOptions.DONOTSAVECHANGES);
        meta.file = pngFile.fsName;
        manifest.push(meta);
      }
    }
  }

  // Write manifest
  var mf = File(Folder(Folder.current + "/../dist/manifest.json"));
  mf.open("w");
  mf.write(JSON.stringify({
    generatedAt: new Date().toISOString(),
    items: manifest
  }, null, 2));
  mf.close();

  alert("PSD export complete: " + manifest.length + " items");
})();



