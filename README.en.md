# Warm Timber Home · Floor Plan Editor

[中文](README.md) | English

The floorplan editor now opens our apartment designs from [house-design](https://github.com/itwake/house-design), instead of the original example home. [Open the editor](https://itwake.github.io/floorplan/). Default: `family`; use the top selector for `wood`, `laundry`, and the independently confirmed R4 scheme `screen`. Add `&view=3d` to a scheme URL to enter 3D directly. No build step is required.

The import preserves millimetre coordinates, door openings and actual leaf lengths, three projecting bay windows, unglazed balcony guards, detailed cabinetry and purchased furniture dimensions. Furniture uses parametric visual approximations, not exact branded product meshes. Three.js and required addons are bundled locally in `vendor/three/`.

Edits auto-save separately for each scheme in this browser. Use JSON export/import to back up or transfer drafts. Geometry is versioned source data, not an interactive CAD wall-drawing system; wall removal only creates a reversible draft. Full survey closure and wall structural status are still unverified. Do not use this model as construction approval or certified floor area.

See [data documentation](data/README.md) for conversion, provenance and unresolved measurements. Run `node tests/validate-import.cjs` for geometry/script checks. Serve the project over HTTP for ES Modules; deployment uses the `master` branch root on GitHub Pages. Original MIT license and author credit remain intact.

Scheme 4 uses the owner-confirmed 2026-10-10 R4 plan, with actual screen slats, thin-board kitchen cabinets, a recessed double bowl and a separate hob/hood. Its positions and openings match R4; existing schemes and their drafts are unchanged. [Open its 3D preview](https://itwake.github.io/floorplan/?scheme=screen&view=3d&v=screen-r4-20261011). The model is not construction approval. Run `node tests/screen-plan.cjs` and `node tests/screen-plan-browser.cjs` for its dedicated checks.

## Features

October 11 update: all four entry doors now swing outward; schemes 1–3 keep their original openings and leaf dimensions. Scheme 2 removes its 800 storage enclosure, vehicles and folding door and adopts scheme 3/4's complete L-shaped ceiling sideboard with LEDs. Scheme 1 retains its storage enclosure. Schemes 2 and 4 share the confirmed mirrored 2240×600 mm wardrobes, 1500/1800×2000 mm mattresses, compact northern desks/chairs and southern nightstands; bedroom architecture is unchanged. Both bed-foot clearances are about 555 mm and tight, with sliding lower wardrobe doors. Full sideboard drawer extension in scheme 2 requires moving its northern dining chair. Public-door clearance, exact furniture dimensions and cabinet hardware remain subject to site checks.

Existing browser drafts keep custom positions, sizes, colours, names and deletions. Removed default objects are archived in exported JSON, new furniture is inserted once, and cleared drafts remain empty. The source SHA and storage keys do not change. Run `tests/layout-20261011.cjs` and `tests/layout-20261011-browser.cjs` for exact geometry, migration and actual WebGL checks. [Scheme 2 in 3D](https://itwake.github.io/floorplan/?scheme=family&view=3d&v=layout-20261011) · [Scheme 4 in 3D](https://itwake.github.io/floorplan/?scheme=screen&view=3d&v=layout-20261011).

**2D Floor Plan**
- Displays the original floor plan at 1:60 / 1:100 scale, dimensions in mm
- Drag 60+ furniture and appliance items from the library on the left (bedroom, living room, dining & kitchen, bathroom, appliances, study & leisure)
- Move, rotate (hold Shift for free angle), and resize items, with automatic snapping to walls
- Measuring tool (snaps to nearby walls; hold Shift to lock horizontal / vertical)
- Reversible interior wall drafts; imported wall structural status is unverified
- Layer toggles: dimensions, room names, furniture, grid, wall status

**3D Scene**
- Bird's-eye, oblique, and top-down views; click a room in the list to fly to it
- Walkthrough mode: WASD + mouse on desktop, virtual joystick on touch devices; click doors to open / close them
- Toggle between full-height and cut-away walls, time-of-day sunlight slider, night lighting
- Detailed furniture models: cabinet door gaps and handles, upholstered headboards, metal and ceramic materials with environment reflections, and more
- Select and drag furniture in 3D as well, kept in sync with the 2D plan in real time

**Plans & Statistics**
- Automatic calculation of room areas and net usable floor area
- Change the floor material of each room (wood, tiles, marble, terrazzo, carpet, etc.), with cost estimates based on area plus 5% wastage
- Undo / redo; plans are auto-saved in the browser's local storage
- Chinese / English UI toggle (button on the right of the top bar; defaults to Chinese and remembers your choice)
- Export to PNG, export / import plans as JSON

## Quick Start

```bash
git clone <repository-url>
cd <repository-directory>
```

Then simply open `index.html` in your browser. Alternatively, start a local static server:

```bash
python3 -m http.server 8000
# Visit http://localhost:8000
```

> Three.js r160 and the required addons are bundled with the site; no external CDN is required.

## Keyboard Shortcuts

| Key | Action |
| --- | --- |
| `T` | Toggle 2D / 3D |
| `V` / `M` / `X` | Select / Measure / Modify walls |
| `R` / `Shift+R` | Rotate selected furniture 90° clockwise / counterclockwise |
| `Delete` / `Backspace` | Delete selected furniture |
| `Ctrl/⌘ + D` | Duplicate selected furniture |
| `Ctrl/⌘ + Z`, `Ctrl/⌘ + Shift + Z` | Undo, redo |
| `F` | Fit to window |
| `+` / `-` | Zoom in / out |
| `[` / `]` | Show / hide the furniture library (left) and the side panel (right) |
| `Shift + F` | Fullscreen |
| `Esc` | Cancel current action |
| Walkthrough: `WASD` / arrow keys, `Shift`, `E` | Move, walk faster, open / close doors |

## Tech Stack

- Vanilla HTML / CSS / JavaScript — no framework, no build step
- 2D floor plan rendered with SVG
- 3D scene built with [Three.js](https://threejs.org/) r160 (OrbitControls, PointerLockControls, RoundedBoxGeometry, RoomEnvironment, CSS2DRenderer)
- Data stored in `localStorage`

## Customizing the Floor Plan

The floor plan data lives in `index.html`:

- `ROOMS`: room polygons, names, and default floor materials
- `WALLS` / `WINS`: walls and window openings
- `MATS`: floor material names and unit prices
- `LIB`: furniture library (type, name, default size, color)
- `buildFurniture()`: 3D models for each furniture type

Edit this data to use your own floor plan.

## Social Media

- X (Twitter): [@akokoi1](https://x.com/akokoi1)

## License

[MIT](LICENSE)
