#target illustrator
// or #target photoshop

/**
 * Auto-generated template script
 * Generated from: Effects Template
 * Date: 2025-11-06T09:40:44.157Z
 */

(function() {
  var doc = app.activeDocument;
  var structure = {
  "name": "Effects Template",
  "categories": [
    {
      "name": "fx",
      "items": [
        {
          "category": "fx",
          "name": "explosion",
          "role": "base",
          "id": "fx_expl",
          "z": 100
        },
        {
          "category": "fx",
          "name": "smoke",
          "role": "base",
          "id": "fx_smoke",
          "z": 99
        },
        {
          "category": "fx",
          "name": "spark",
          "role": "base",
          "id": "fx_spark",
          "z": 101
        }
      ]
    }
  ]
};
  
  structure.categories.forEach(function(category) {
    var categoryGroup = createGroup(category.name);
    
    category.items.forEach(function(item) {
      var layerName = buildLayerName(item);
      var layer = createLayer(layerName);
      
      if (categoryGroup) {
        layer.move(categoryGroup, ElementPlacement.PLACEATEND);
      }
      
      if (item.width && item.height) {
        createPlaceholder(layer, item.width, item.height);
      }
    });
  });
  
  function buildLayerName(item) {
    var parts = [];
    parts.push(item.category || "misc");
    parts.push(item.name);
    parts.push("r" + (item.role || "base"));
    if (item.id) parts.push("id" + item.id);
    if (item.z !== undefined) parts.push("z" + item.z);
    if (item.width && item.height) parts.push("px" + item.width + "x" + item.height);
    if (item.tags && item.tags.length > 0) parts.push("tag" + item.tags.join("+"));
    return parts.join("__");
  }
  
  function createGroup(name) {
    try {
      if (app.name === "Adobe Illustrator") {
        var group = doc.groupItems.add();
        group.name = name;
        return group;
      } else if (app.name === "Adobe Photoshop") {
        var layerSet = doc.layerSets.add();
        layerSet.name = name;
        return layerSet;
      }
    } catch (e) {
      return findGroup(name);
    }
    return null;
  }
  
  function createLayer(name) {
    try {
      if (app.name === "Adobe Illustrator") {
        var pathItem = doc.pathItems.rectangle(0, 0, 100, 100);
        pathItem.name = name;
        return pathItem;
      } else if (app.name === "Adobe Photoshop") {
        var layer = doc.artLayers.add();
        layer.name = name;
        return layer;
      }
    } catch (e) {
      alert("Error creating layer: " + e.message);
    }
    return null;
  }
  
  function createPlaceholder(layer, width, height) {
    try {
      if (app.name === "Adobe Illustrator") {
        if (layer.typename === "PathItem") {
          layer.width = width;
          layer.height = height;
          layer.position = [width / 2, -height / 2];
        }
      } else if (app.name === "Adobe Photoshop") {
        var bounds = layer.bounds;
        var rect = [bounds[0], bounds[1], bounds[0] + width, bounds[1] + height];
        doc.selection.select(rect);
        doc.selection.fill(doc.foregroundColor);
        doc.selection.deselect();
      }
    } catch (e) {}
  }
  
  function findGroup(name) {
    try {
      if (app.name === "Adobe Illustrator") {
        for (var i = 0; i < doc.groupItems.length; i++) {
          if (doc.groupItems[i].name === name) return doc.groupItems[i];
        }
      } else if (app.name === "Adobe Photoshop") {
        for (var i = 0; i < doc.layerSets.length; i++) {
          if (doc.layerSets[i].name === name) return doc.layerSets[i];
        }
      }
    } catch (e) {}
    return null;
  }
  
  alert("Template applied: " + structure.categories.length + " categories");
})();
