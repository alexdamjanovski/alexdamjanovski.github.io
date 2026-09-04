import { defineConfig } from "vite";

export default defineConfig({
  base: "/",
  // Publish built site from /docs so GitHub Pages branch deploy works
  // for username.github.io (Settings → Pages → Folder: /docs).
  build: {
    outDir: "docs",
    emptyOutDir: true,
  },
});
