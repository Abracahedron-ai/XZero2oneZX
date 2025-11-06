#target illustrator

/**
 * Unlock All Layers Utility
 * 
 * Unlocks all layers and shapes in the current document
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
        if (layer.locked) {
          layer.locked = false;
          unlockedCount++;
        }
      } catch (e) {
        // Some layers might not support locked property
      }
      
      // Unlock all page items in this layer
      try {
        for (var i = 0; i < layer.pageItems.length; i++) {
          var item = layer.pageItems[i];
          try {
            if (item.locked) {
              item.locked = false;
              unlockedCount++;
            }
          } catch (e) {
            // Some items might not support locked property
          }
        }
      } catch (e) {
        // Layer might not have pageItems property
      }
      
      // Recursively unlock sub-layers
      try {
        for (var j = 0; j < layer.layers.length; j++) {
          unlockLayer(layer.layers[j]);
        }
      } catch (e) {
        // Layer might not have sub-layers
      }
    }
    
    // Unlock all top-level layers
    for (var k = 0; k < doc.layers.length; k++) {
      unlockLayer(doc.layers[k]);
    }
    
    // Also unlock all page items at document level
    try {
      for (var m = 0; m < doc.pageItems.length; m++) {
        var pageItem = doc.pageItems[m];
        try {
          if (pageItem.locked) {
            pageItem.locked = false;
            unlockedCount++;
          }
        } catch (e) {
          // Some items might not support locked property
        }
      }
    } catch (e) {
      // Document might not have pageItems property
    }
    
    alert("Unlocked " + unlockedCount + " items in the document.\n\nAll layers and shapes are now editable.");
    
  } catch (e) {
    alert("Error: " + e.message + "\nLine: " + e.line);
  }
})();


