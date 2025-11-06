# Structure Consolidated to src/

## ✅ All Frontend Code Now in `src/frontend/renderer/`

The old `renderer/` directory has been consolidated into the `src/` structure. All source code is now in `src/frontend/renderer/`.

## Current Structure

```
src/
├── frontend/
│   └── renderer/              ← All Next.js app code here
│       ├── components/        ← 18 component files
│       │   ├── animation_tools/
│       │   │   └── timeline/
│       │   │       └── AdvancedTimeline.tsx
│       │   ├── scene_building_tools/
│       │   │   ├── hierarchy/
│       │   │   │   └── LayerManagerV2.tsx
│       │   │   └── viewport/
│       │   │       └── SceneViewport.tsx
│       │   ├── shared/
│       │   │   ├── FloatingWindow.tsx
│       │   │   └── RadialMenu.tsx
│       │   ├── ui/
│       │   │   └── ChatWindow.tsx
│       │   └── ... (other components)
│       ├── pages/             ← 3 page files
│       │   ├── _app.tsx
│       │   ├── _document.tsx
│       │   └── index.tsx
│       ├── hooks/             ← 1 hook file
│       │   └── useHotkeys.ts
│       ├── lib/               ← 1 lib file
│       │   └── compositor.ts
│       ├── styles/
│       │   └── globals.css
│       ├── public/
│       ├── package.json
│       ├── tsconfig.json
│       └── ... (other config files)
```

## Running Next.js

From the new location:

```bash
cd src/frontend/renderer
npm install      # Install dependencies
npm run dev      # Start dev server
```

## Old `renderer/` Directory

The old `renderer/` directory may still exist with only `node_modules/` and `.next/` (build cache). This is safe to delete manually after stopping any running dev servers. Those will be regenerated in the new location when you run `npm install` and `npm run dev` from `src/frontend/renderer/`.

## Migration Complete

✅ All source files moved to `src/frontend/renderer/`
✅ Components organized in proper subdirectories
✅ Pages, hooks, and lib files in correct locations
✅ Configuration files preserved



