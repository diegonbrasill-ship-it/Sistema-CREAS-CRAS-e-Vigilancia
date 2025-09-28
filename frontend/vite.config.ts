// frontend/vite.config.ts

import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],

  server: {
    proxy: {
      // Sua configuração antiga para '/news', mantida para não quebrar nada
      '/news': {
        target: 'http://localhost:4000',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/news/, '/news')
      },

      // --- A NOVA REGRA CORRETA PARA NOSSA API ---
      // Qualquer chamada que comece com '/api' será redirecionada
      '/api': {
        // ATENÇÃO: Confirme se a porta do seu backend é mesmo a 3000.
        // Se for 4000, 5000, ou outra, altere aqui.
        target: 'http://localhost:4000',
        changeOrigin: true, // Necessário para o redirecionamento funcionar
        secure: false,
      }
    }
  },
  
  resolve: {
    alias: {
      "@": path.resolve("./src"),
    },
  },
});
