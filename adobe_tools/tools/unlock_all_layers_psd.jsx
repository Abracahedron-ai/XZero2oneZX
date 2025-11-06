#target photoshop

/**
 * Unlock All Layers Utility (Photoshop)
 * 
 * Unlocks all layers in the current document
 * Useful for fixing documents where layers were accidentally locked
 * or imported with locked state
 */

(function() {
  'use strict';
  
  try {
    var doc = app.activeDocument;
    if (!doc) {
      alert("Please open a document first.");
      return;
    }
    
    var unlockedCount = 0;
    
    // Unlock all layers recursively
    function unlockLayer(layer) {
      try {
        // Photoshop uses allLocked property
        if (layer.allLocked) {
          layer.allLocked = false;
          unlockedCount++;
        }
      } catch (e) {
        // Try individual lock properties
        try {
          if (layer.pixelsLocked) {
            layer.pixelsLocked = false;
            unlockedCount++;
          }
          if (layer.positionLocked) {
            layer.positionLocked = false;
            unlockedCount++;
          }
          if (layer.transparentPixelsLocked) {
            layer.transparentPixelsLocked = false;
            unlockedCount++;
          }
        } catch (e2) {
          // Some layers might not support these properties
        }
      }
      
      // Recursively unlock sub-layers (layer sets)
      try {
        if (layer.typename === "ArtLayer") {
          // This is an art layer, no sub-layers
        } else if (layer.typename === "LayerSet") {
          // This is a layer set, unlock all layers inside
          for (var j = 0; j < layer.layers.length; j++) {
            unlockLayer(layer.layers[j]);
          }
        }
      } catch (e) {
        // Layer might not have sub-layers
      }
    }
    
    // Unlock all top-level layers
    for (var k = 0; k < doc.layers.length; k++) {
      unlockLayer(doc.layers[k]);
    }
    
    alert("Unlocked " + unlockedCount + " layers in the document.\n\nAll layers are now editable.");
    
  } catch (e) {
    alert("Error: " + e.message + "\nLine: " + e.line);
  }
})();


