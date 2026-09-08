import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://www.sahilnyk.xyz',
  output: "static",
  prefetch: true,
  compressHTML: true,
  integrations: [sitemap()],
});
