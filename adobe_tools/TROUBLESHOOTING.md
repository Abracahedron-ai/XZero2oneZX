# Troubleshooting Adobe Tools

## Common Issues

### Issue: Template Opens as 1 Layer with JavaScript Code

**Problem**: When opening the template script in Adobe Illustrator, it appears as a single layer containing the JavaScript code instead of executing.

**Causes**:
1. Script is being opened as a file instead of executed
2. Script has syntax errors
3. Script encoding issues
4. Wrong file extension

**Solutions**:

#### Solution 1: Run Script Correctly

**DO NOT** open the `.jsx` file directly in Illustrator.

**DO THIS**:
1. Open Adobe Illustrator
2. Create or open a document
3. Go to **File → Scripts → Other Script...**
4. Navigate to `adobe_tools/tools/generate_template.jsx`
5. Click **Open** (script will execute)

#### Solution 2: Check Script Format

Make sure the script starts with:
```javascript
#target illustrator

(function() {
  'use strict';
  // ... code ...
})();
```

#### Solution 3: Verify Document is Open

The script requires an active document. Make sure you:
1. Open Illustrator
2. Create a new document (File → New)
3. Then run the script

#### Solution 4: Check for Errors

If the script fails, Illustrator will show an error message. Common errors:
- "No document is open" → Create/open a document first
- "Syntax error" → Check script for typos
- "Object doesn't support this property" → ExtendScript API issue

### Issue: Script Creates Layers But They're Empty

**Problem**: Script runs but creates empty layers or layers without shapes.

**Solution**: The script creates placeholder rectangles. If you don't see them:
1. Check Layers panel (Window → Layers)
2. Look for groups and layers with proper names
3. Expand groups to see individual layers
4. Layers might be off-canvas - check artboard bounds

### Issue: Groups Not Created

**Problem**: Categories are not being created as groups.

**Solution**: 
1. Check if groups already exist with same name
2. Script will reuse existing groups
3. Delete existing groups if you want fresh structure

### Issue: Layer Names Are Wrong

**Problem**: Generated layer names don't follow convention.

**Solution**:
1. Check template JSON structure
2. Verify all required fields (category, name, role) are present
3. Check `buildLayerName()` function logic

### Issue: Script Runs But Nothing Happens

**Problem**: Script executes without errors but no layers are created.

**Possible Causes**:
1. Template structure is empty
2. Items array is empty
3. All items filtered out

**Solution**:
1. Check manifest.json has items
2. Verify template JSON structure
3. Add debug alerts to see what's happening

### Issue: "Cannot read property" Errors

**Problem**: Script throws errors about undefined properties.

**Solution**:
1. Add null checks in code
2. Verify manifest.json structure
3. Check that all required fields exist

### Issue: Layers Created Outside Groups / Unlabeled

**Problem**: Illustrator creates layers at document level instead of inside groups, or creates unlabeled layers.

**Causes**:
1. Illustrator's default behavior creates layers at document level
2. Manual layer creation doesn't respect group selection
3. PathItems (shapes) are created but not properly associated with Layers panel layers

**Solutions**:

#### Solution 1: Use the Script (Recommended)

The script now properly creates layers in the Layers panel and associates them with groups:
- Creates category layers in the Layers panel
- Creates child layers inside category layers
- Names layers immediately
- Associates shapes with groups

**This is the recommended approach** - let the script handle layer creation.

#### Solution 2: Manual Workaround

If you need to manually create layers:

1. **Select the group first**: Click on the group in the Layers panel
2. **Create layer inside group**: 
   - Right-click the group → "New Layer"
   - Or use Layers panel menu → "New Layer" (will create inside selected group)
3. **Name immediately**: Double-click the new layer and name it before creating content
4. **Create shape**: Draw your shape - it will be associated with the selected layer

#### Solution 3: Fix Existing Layers

If you already have unlabeled layers:

1. **Select the layer** in the Layers panel
2. **Double-click** to rename it
3. **Drag it** into the correct group if needed
4. **Use proper naming convention**: `category__name__rrole__idid__zorder__pxtags`

### Issue: Layers Created One Step Higher

**Problem**: New layers are created at the document level instead of inside the selected group.

**Solution**:
1. Make sure you select the group in the Layers panel before creating a new layer
2. Use the script instead - it handles this automatically
3. If manually creating, use "New Layer" from the group's context menu, not the document's

### Issue: Unlabeled Layers

**Problem**: Illustrator creates layers with default names like "<Rectangle>" instead of proper names.

**Solution**:
1. **Name immediately**: Double-click the layer as soon as it's created
2. **Use the script**: The script names layers automatically
3. **Batch rename**: Select multiple layers and use a script to rename them

## Best Practices

1. **Always open a document first** before running scripts
2. **Use File → Scripts → Other Script** to run scripts (don't open files directly)
3. **Check Layers panel** to see results
4. **Save your work** before running scripts
5. **Test with simple templates** first before complex ones
6. **Let the script create layers** - it handles Illustrator's quirks automatically
7. **If manually creating layers**, select the group first, then create the layer

## Debugging Tips

### Add Debug Alerts

Add alerts to see what's happening:

```javascript
alert("Items found: " + items.length);
alert("Categories: " + Object.keys(byCategory).length);
```

### Check Console

ExtendScript has a console. Enable it:
1. Go to **File → Scripts → Other Script...**
2. Run a simple test script
3. Check for error messages

### Verify File Paths

Make sure paths are correct:
```javascript
var manifestPath = File(Folder.current + "/../dist/manifest.json");
```

Use absolute paths if relative paths don't work:
```javascript
var manifestPath = File("D:/Zero2oneZ/adobe_tools/dist/manifest.json");
```

## Getting Help

If issues persist:
1. Check ExtendScript documentation
2. Verify Adobe Illustrator version compatibility
3. Test with minimal script first
4. Check file encoding (should be UTF-8)

---

**Last Updated**: 2025-01-11
