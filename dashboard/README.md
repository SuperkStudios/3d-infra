# Relay · Infrastructure studio

An independent, local React + Three.js infrastructure dashboard. The surrounding repository's pre-existing documentation, demos and assets are preserved; this app does not import iCraft models, templates, or its player. All scene models are original procedural geometry, with rounded housings, detailed device faces, restrained red trim, and matching generated palette thumbnails. The scene uses studio environment lighting, a fitted orthographic camera, routed connections and collision-aware labels with leaders. No hosted fonts or external assets are requested.

## Run

Requires Node.js 20.19+ (or a supported newer Node release) and npm.

```sh
cd dashboard
npm install
npm run dev
```

Open the loopback address printed by Vite (normally http://127.0.0.1:5173).

```sh
npm test
npm run build
```

The production bundle is written to `dist/`. Serve it over HTTP with a static server or `npx vite preview --host 127.0.0.1` after building.

## Explore

- Drag the scene to orbit, scroll to zoom, select a model or label to inspect it. The scene list also offers keyboard-accessible selection.
- Reset the camera or switch to a top view using the canvas controls.
- Search the component palette and click a tile to add a component, automatically connected to Core API. Reset the camera and zoom out to explore expanded scenes.
- Run a sample request or trace flow: Edge → API → Identity → API → Cache → API → Database. Highlighted edges and selected services track the simulation. The request finishes with a simulated result.
- Pause/resume simulated metrics, packets and trace progression.
- Inject high latency into a selected component, inspect the degraded state and recover it. One component can be degraded at a time.
- Switch to Activity for a generated health-check stream.

## Scope and limitations

This is an initial in-memory sandbox, clearly marked with simulated data. It has no backend, credentials, production monitoring, real request execution, cloud integration or deployment. Refresh resets all changes. Region names, request rates, latencies, health probes and events are illustrative. Request completion latency is a sample result, not measured or aggregated telemetry. Palette additions use automatic placement; arbitrary dragging, wiring, deletion, persistence, export and collaboration are not implemented. Large diagrams are not optimized and may need zooming out. Labels move or hide when they cannot fit without covering another label or device; the scene list always remains available for selection. The 3D view needs a WebGL-capable browser; if unavailable, a message appears and the accessible scene list and simulation controls remain usable. Full screen-reader access to the 3D geometry is not provided. The UI adapts to narrow screens using stacked panels.
