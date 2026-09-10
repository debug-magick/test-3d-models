# Packeze 3D Product Studio

An interactive React / Three.js preview for event displays and promotional products. Includes a full event kit, a 10×20 ft premium kit, configurable canopy tents, three flag shapes, a fitted table cover, yard signs, and a stylus pen.

## Run locally

```sh
pnpm install
pnpm dev
```

Open the URL printed by Vite. To check and build:

```sh
pnpm lint
pnpm build
pnpm preview
```

## Using the preview

- Drag to orbit; scroll or pinch to zoom. The zoom slider and reset button control the same camera. Scrolling the configuration panel does not zoom the scene.
- Choose a product, footprint, walls, flag shape/height, or sign size and print sides.
- Upload a PNG, JPG, or WebP up to 20 MB, try the included sample artwork, or remove it to restore Packeze branding. Artwork is decoded locally and never uploaded.
- Compare Studio and Outdoor lighting. Rotation speed and the gentle breeze have independent controls.
- The system's reduced-motion preference disables rotation, wind, and scene fades. On mobile, the preview stays above the scrollable controls.

## Scene implementation

All models are procedural and use meters. The canopy includes telescoping hexagonal legs, folding braces, a ridge for wider roofs, fabric sag, hems, and wall support rails. Table covers use curved, tensioned panels; signs have thin corrugated construction and H-wire supports; banners have rounded aluminum cassettes. The pen has chrome reflections, grip rings, and a resting pose.

`CameraRig.tsx` keeps one camera and uses elapsed-time damping for orbit, zoom, reset, and fitting. Switching products fades the stage while reframing, including across the size difference between a tent and a pen. Manual dragging pauses automatic rotation before a gradual restart.

`Flag.tsx` builds a subdivided sail. The wind shader in `motion.ts` deforms the fabric on the GPU, adjusts its normals, pins the pole edge, and applies the same motion to the shadow pass.

`Lighting.tsx` generates a local studio reflection map. Fabric weave and ground textures are generated locally too; the preview does not fetch environment assets or models. Outdoor grass is merged into one mesh. Contact shadows are baked when geometry changes; directional shadows update on each rendered frame so new artwork and materials appear immediately. Idle scenes render on demand, and sustained low frame rates lower pixel density. Imperative textures and geometry are disposed when replaced.

Artwork fitting in `print.ts` retains the existing upload behavior, including the horizontal expansion used for wide panels. These are approximate product models rather than manufacturer CAD files.

## References and verification

Construction and materials were informed by Packeze's [canopy range](https://packeze.com/custom-tents), [premium display package](https://packeze.com/product/10x10-trade-show-package), and [banner flags](https://packeze.com/product/feather-flags).

Browser verification covers all seven products, flag variations, wider canopies with walls, artwork upload/removal, wind, orbit/zoom/reset, mobile layout, and reduced motion. `pnpm lint` and `pnpm build` are the repository checks. The browser requires WebGL 2; renderer startup errors show a reload action.
