// @ts-check
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';

// arzzzae.com is an apex custom domain served via GitHub Pages, so the site
// lives at the root (no base path needed).
export default defineConfig({
  site: 'https://arzzzae.com',
  integrations: [react()],
  vite: {
    ssr: {
      // three.js ships ESM that should not be externalized during SSR build.
      // detect-gpu is a CommonJS dep pulled in by drei; bundling it lets Vite
      // apply CJS<->ESM interop so its named exports resolve in the dev SSR.
      noExternal: ['three', '@react-three/fiber', '@react-three/drei', 'detect-gpu'],
    },
  },
});
