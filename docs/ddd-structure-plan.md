# DDD Structure Deep Optimization Plan

This plan is the coordination contract for the current refactor pass. It keeps the existing `app / domains / shared` layering, but moves large or feature-specific surfaces into package-by-feature folders.

## Target Frontend Shape

```text
frontend/src/
  app/
    composition/          # app-level assembly across domains
    hooks/                # app-only browser/global hooks
    layouts/
    providers/
    store/
    styles/
  domains/
    atlas/
      model/
      ui/
        map/
          atoms/
          molecules/
          organisms/
          mini-map/        # Mini-map package when AtlasMiniMap is split
          canvas/          # Canvas package when map orchestration grows
        styles/
      utils/
      index.ts
    analytics/
      ui/
        charts/
          trend/
          treemap/
        county/
        overview/
        styles/
      index.ts
    education/
      model/
      ui/
      index.ts
    scenario/
      model/
      ui/
      index.ts
  shared/
    api/
    lib/
    ui/
      core/
        charts/
          stacked-area-trend/
```

## Target Backend Shape

```text
backend/scripts/lib/
  refresh/                # official data refresh shared kernel
  official-dataset/       # domain pipeline for MOE/NLSC official dataset
  atlas-sqlite/           # SQLite schema and write helpers
  build-*.mjs             # public script entry points and thin orchestration
```

## Package-by-Feature and Line Budget Gate

Large UI, chart, map, CSS, and backend pipeline surfaces should be split into feature-owned packages. A package keeps its component, local styles, constants, formatters, geometry helpers, and serialization/build helpers together unless the code is genuinely domain-neutral.

`npm.cmd --workspace frontend run lint:architecture` enforces the source budget. It scans `frontend/src` for `.ts`, `.tsx`, and `.css` files, and scans repo `backend/scripts` for `.mjs`, `.ts`, `.tsx`, and `.css` files. Any file above 300 lines fails the architecture gate.

## Rules

- Keep public entry points stable unless all imports are updated in the same patch.
- Keep every gate-scanned `.ts`, `.tsx`, `.css`, and `.mjs` source file at or below 300 lines.
- Do not move domain-specific UI into `shared`; shared stays domain-neutral.
- Feature-local helpers belong beside the component package, not in global utility folders.
- CSS entry files may stay as ordered `@import` barrels; partials live beside the feature they style.
- Backend public entry files should orchestrate only. Schema, fetchers, parsers, builders, and serializers belong in subfolders.
- After edits, run `npm.cmd --workspace frontend run lint -- --fix`, then `npm.cmd --workspace frontend run lint`, and treat warnings as unfinished.
