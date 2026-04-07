// Workaround for missing module when devDependencies not yet installed or
// TypeScript can't resolve the shipped types.  The @types package is added,
// but the import path used in code doesn't always line up; declare the module
// explicitly so `import 'leaflet.vectorgrid'` stops complaining.

declare module 'leaflet.vectorgrid' {
  import * as L from 'leaflet';
  export = L;
}
