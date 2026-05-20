import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://sahilnyk.xyz',
  output: "static",
  prefetch: true,
  compressHTML: true,
});