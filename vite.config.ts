import { defineConfig, loadEnv, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

function gtmNoscript(gtmId: string | undefined): Plugin {
  return {
    name: 'edo-gtm-noscript',
    transformIndexHtml(html) {
      const id = gtmId?.trim();
      if (!id) return html;
      const safeId = id.replace(/"/g, '&quot;');
      const tag = `<noscript><iframe src="https://www.googletagmanager.com/ns.html?id=${encodeURIComponent(safeId)}" height="0" width="0" style="display:none;visibility:hidden"></iframe></noscript>`;
      return html.replace('<body>', `<body>\n${tag}`);
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [react(), tailwindcss(), gtmNoscript(env.VITE_GTM_ID)],
    server: {
      proxy: {
        '/api': {
          target: 'https://cms.e-do.studio',
          changeOrigin: true,
        },
      },
    },
  };
});
