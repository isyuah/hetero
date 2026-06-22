// @ts-check
import { defineConfig, fontProviders } from 'astro/config';

import react from '@astrojs/react';
import mdx from '@astrojs/mdx';
import node from '@astrojs/node';
import expressiveCode from 'astro-expressive-code';
import rehypeExternalLinks from 'rehype-external-links';

import icon from 'astro-icon';

import sitemap from '@astrojs/sitemap';
import edgeoneAda from '@edgeone/astro'

// https://astro.build/config
export default defineConfig({
  site: "https://blog.isyuah.top",
  integrations: [react(), expressiveCode({
    themes: ['github-light'],
  }), mdx(), icon(), sitemap()],
  markdown: {
    rehypePlugins: [[rehypeExternalLinks, {
      target: '_blank',
      rel: ['noopener', 'noreferrer']
    }]],
  },
  fonts: [{
    provider: fontProviders.fontsource(),
    name: 'Noto Sans SC',
    cssVariable: '--font-noto-sans-sc',
    weights: [500, 600, 700, 800],
  },{
    provider: fontProviders.fontsource(),
    name: 'Cascadia Code',
    cssVariable: '--font-cascadia-code',
    weights: [400, 500, 600, 700, 800],
  }],

  vite: {
    plugins: [],
    resolve: {
      alias: {
        "@": "/src"
      }
    },
    server: {
      allowedHosts: ['astro-tnl.isyuah.top']
    }
  },

  // adapter: node({
  //   mode: 'standalone'
  // }),
  adapter: edgeoneAda(),
});