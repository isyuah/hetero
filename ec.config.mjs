import { pluginCollapsibleSections } from '@expressive-code/plugin-collapsible-sections'
import { pluginLineNumbers } from '@expressive-code/plugin-line-numbers'
import { defineEcConfig } from 'astro-expressive-code';

export default defineEcConfig({
  plugins: [pluginCollapsibleSections(), pluginLineNumbers()],
  defaultProps: {
    collapseStyle: 'collapsible-auto',
    showLineNumbers: true,
  },
  styleOverrides: {
    codeFontFamily: "Cascadia Code",
    codeFontSize: "0.9rem",
    frames: {
      frameBoxShadowCssValue: "none",
    },
  },
  frames: {
    showCopyToClipboardButton: true,
  }
})