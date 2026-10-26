import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { readdirSync, cpSync } from 'node:fs';
import { resolve } from 'node:path';

export default defineConfig({
    root: 'frontend',
    publicDir: false,
    plugins: [react(), {
        name: 'preserve-public-assets',
        closeBundle() { cpSync('frontend/assets', 'dist/assets', { recursive: true }); }
    }],
    server: {
        host: '127.0.0.1',
        port: 5173,
        proxy: { '/api': 'http://127.0.0.1:3000', '/uploads': 'http://127.0.0.1:3000' }
    },
    build: {
        outDir: '../dist',
        emptyOutDir: true,
        assetsDir: 'bundles',
        rollupOptions: {
            input: Object.fromEntries(readdirSync('frontend').filter(f => f.endsWith('.html')).map(f => [f.replace('.html', ''), resolve('frontend', f)]))
        }
    }
});
