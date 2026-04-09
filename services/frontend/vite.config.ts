import path from 'node:path'
import fs from 'node:fs'
import { defineConfig } from 'vite'
import type { Plugin } from 'vite'
import react from '@vitejs/plugin-react-swc'
import { VitePWA } from 'vite-plugin-pwa'

// After repo reorg, canonical repo-root data/ is at workspace root; resolve to that path
const backendDataDir = path.resolve(__dirname, '..', '..', 'data')

/** Serve repo-root data/ as /data/ in dev and copy to dist/data/ in build. */
function backendDataPlugin(): Plugin {
  return {
    name: 'backend-data',
    configureServer(server) {
      server.middlewares.use('/data', (req, res) => {
        const requestUrl = new URL(req.url ?? '/', 'http://localhost')
        const relativePath = decodeURIComponent(requestUrl.pathname.replace(/^\/+/, ''))
        const filePath = path.join(backendDataDir, relativePath)
        if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
          res.setHeader('Content-Type', filePath.endsWith('.json') ? 'application/json' : 'application/octet-stream')
          fs.createReadStream(filePath).pipe(res)
        } else {
          res.statusCode = 404
          res.setHeader('Content-Type', 'text/plain; charset=utf-8')
          res.end(`Missing data asset: ${requestUrl.pathname}`)
        }
      })
    },
    closeBundle() {
      const distDataDir = path.resolve(__dirname, 'dist', 'data')
      fs.rmSync(distDataDir, { recursive: true, force: true })
      copyDirSync(backendDataDir, distDataDir)
    },
  }
}

function copyDirSync(src: string, dest: string) {
  fs.mkdirSync(dest, { recursive: true })
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name)
    const destPath = path.join(dest, entry.name)
    if (entry.isDirectory()) {
      copyDirSync(srcPath, destPath)
    } else {
      fs.copyFileSync(srcPath, destPath)
    }
  }
}

const repositoryName = process.env.GITHUB_REPOSITORY?.split('/')[1] ?? 'student_counting_analysis_TW'
const isGithubPagesBuild = process.env.GITHUB_ACTIONS === 'true'
const publicBasePath = isGithubPagesBuild ? `/${repositoryName}/` : '/'

export default defineConfig({
  base: publicBasePath,
  // persist Vite cache under workspace root to speed cold restarts
  cacheDir: path.resolve(__dirname, '..', '..', '.vite-cache', 'frontend'),
  optimizeDeps: {
    // include heavy libs to pre-bundle once and reuse
    include: ['react', 'react-dom', 'leaflet', 'react-leaflet', 'sql.js', 'topojson-client', 'leaflet.vectorgrid'],
    esbuildOptions: {
      target: 'es2020',
    },
  },
  // reduce transpilation work by targeting modern browsers in dev tooling
  esbuild: {
    target: 'es2020',
  },
  // speed up dev HMR and reduce watcher overhead on Windows
  server: {
    hmr: { overlay: false },
    // Avoid watching large repo data folders (they change rarely and are large)
    watch: { usePolling: false, ignored: [path.resolve(backendDataDir, '**')] },
  },
  css: { devSourcemap: false },
  build: {
    // target modern JS for faster bundling and smaller runtime transforms
    target: 'es2020',
    // disable source maps by default to speed up production builds (enable when debugging)
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined
          if (id.includes('sql.js')) return 'vendor-sqljs'
          if (id.includes('leaflet') || id.includes('react-leaflet')) return 'vendor-leaflet'
          if (id.includes('react-dom') || id.includes('/react/')) return 'vendor-react'
          return undefined
        },
      },
    },
  },
  worker: {
    format: 'es',
  },
  plugins: [
    backendDataPlugin(),
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      includeAssets: ['atlas-icon.svg', 'apple-touch-icon.svg', 'pwa-192.svg', 'pwa-512.svg'],
      manifest: {
        id: publicBasePath,
        scope: publicBasePath,
        start_url: publicBasePath,
        name: 'Taiwan Education Atlas',
        short_name: 'TW Atlas',
        description: '以教育部正式資料與官方行政區界線打造的台灣學生數互動地圖。',
        theme_color: '#08111f',
        background_color: '#08111f',
        display: 'standalone',
        lang: 'zh-Hant',
        icons: [
          {
            src: 'pwa-192.svg',
            sizes: '192x192',
            type: 'image/svg+xml',
            purpose: 'any',
          },
          {
            src: 'pwa-512.svg',
            sizes: '512x512',
            type: 'image/svg+xml',
            purpose: 'any maskable',
          },
          {
            src: 'apple-touch-icon.svg',
            sizes: '180x180',
            type: 'image/svg+xml',
            purpose: 'any',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,txt,woff2}'],
        navigateFallback: 'index.html',
        navigateFallbackDenylist: [/\/data\//, /\.json$/],
        maximumFileSizeToCacheInBytes: 50 * 1024 * 1024,
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'google-fonts-stylesheets',
            },
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-webfonts',
              expiration: {
                maxEntries: 8,
                maxAgeSeconds: 60 * 60 * 24 * 365,
              },
            },
          },
          {
            urlPattern: /\/data\/.*\.(json|sqlite)$/i,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'education-data-assets',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 30,
              },
            },
          },
          {
            urlPattern: /^https:\/\/.*tile.*\.(png|jpg|pbf)$/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'map-tiles',
              expiration: {
                maxEntries: 500,
                maxAgeSeconds: 60 * 60 * 24 * 30,
              },
            },
          },
        ],
      },
    }),
  ],
})
