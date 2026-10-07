# Three.js r160

Vendored unmodified files from the official npm package `three@0.160.0`.

- Source: <https://registry.npmjs.org/three/-/three-0.160.0.tgz>
- npm tarball SHA-1: `cd1e4dbd01aee0719280a9086d75545db52b7a8f`
- License: MIT; original `LICENSE` is retained.
- Included modules: `three.module.js`, `OrbitControls`, `PointerLockControls`, `RoundedBoxGeometry`, `RoomEnvironment`, `CSS2DRenderer`.
- The selected addons import only the bare module `three`; no relative addon dependencies are missing.
- `manifest.json` records every copied file's SHA-256 and byte count.

Use this import map in the hosting page:

```json
{
  "imports": {
    "three": "./vendor/three/build/three.module.js",
    "three/addons/": "./vendor/three/examples/jsm/"
  }
}
```

These files are served by the same GitHub Pages site as the editor, so entering 3D does not depend on a third-party CDN. Runtime files plus the license total 1,320,035 bytes (about 1.26 MiB) before HTTP compression. The original npm archive and unused package contents are not included.
