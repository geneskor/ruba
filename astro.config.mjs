// @ts-check
import { defineConfig } from 'astro/config';

import tailwindcss from '@tailwindcss/vite';

import cloudflare from "@astrojs/cloudflare";

// https://astro.build/config
export default defineConfig({
  site: 'https://rybasvprud.ru',

  build: {
    assets: 'assets',
    inlineStylesheets: 'always'
  },

  vite: {
    plugins: [tailwindcss()]
  },

  adapter: cloudflare()
});