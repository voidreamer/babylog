import { readFileSync } from 'fs'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
    define: {
        __APP_VERSION__: JSON.stringify(JSON.parse(readFileSync('package.json', 'utf-8')).version),
    },
    plugins: [
        react(),
        VitePWA({
            registerType: 'autoUpdate',
            includeAssets: ['baby.svg', 'favicon.ico'],
            manifest: {
                name: 'HeyBub - Baby Tracker',
                short_name: 'HeyBub',
                description: 'Track your baby\'s sleep, feeding, and diaper changes',
                theme_color: '#d4849c',
                background_color: '#fefdfb',
                display: 'standalone',
                orientation: 'portrait',
                start_url: '/',
                icons: [
                    {
                        src: 'baby.svg',
                        sizes: '192x192',
                        type: 'image/svg+xml',
                        purpose: 'any maskable'
                    },
                    {
                        src: 'baby.svg',
                        sizes: '512x512',
                        type: 'image/svg+xml',
                        purpose: 'any maskable'
                    }
                ]
            },
            workbox: {
                // Enable navigation preload: while SW serves cached shell, start API fetch in parallel
                navigationPreload: true,
                // Cache strategies
                runtimeCaching: [
                    {
                        // Cache Google Fonts
                        urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
                        handler: 'CacheFirst',
                        options: {
                            cacheName: 'google-fonts-cache',
                            expiration: {
                                maxEntries: 10,
                                maxAgeSeconds: 60 * 60 * 24 * 365 // 1 year
                            },
                            cacheableResponse: {
                                statuses: [0, 200]
                            }
                        }
                    },
                    {
                        urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
                        handler: 'CacheFirst',
                        options: {
                            cacheName: 'gstatic-fonts-cache',
                            expiration: {
                                maxEntries: 10,
                                maxAgeSeconds: 60 * 60 * 24 * 365 // 1 year
                            },
                            cacheableResponse: {
                                statuses: [0, 200]
                            }
                        }
                    },
                    {
                        // Cache locale JSON files (translations) — CacheFirst, long TTL
                        urlPattern: /\/locales\/.+\.json$/i,
                        handler: 'CacheFirst',
                        options: {
                            cacheName: 'locales-cache',
                            expiration: {
                                maxEntries: 60,
                                maxAgeSeconds: 60 * 60 * 24 * 30 // 30 days
                            },
                            cacheableResponse: {
                                statuses: [0, 200]
                            }
                        }
                    },
                    {
                        // Cache baby/profile data — CacheFirst with 5 min TTL
                        urlPattern: /\/api\/babies\/.*/i,
                        handler: 'CacheFirst',
                        options: {
                            cacheName: 'api-babies-cache',
                            expiration: {
                                maxEntries: 20,
                                maxAgeSeconds: 60 * 5 // 5 minutes
                            },
                            cacheableResponse: {
                                statuses: [0, 200]
                            }
                        }
                    },
                    {
                        // Dashboard data — StaleWhileRevalidate: serve cached instantly, refresh in background
                        urlPattern: /\/api\/events\/dashboard.*/i,
                        handler: 'StaleWhileRevalidate',
                        options: {
                            cacheName: 'api-dashboard-cache',
                            expiration: {
                                maxEntries: 10,
                                maxAgeSeconds: 300 // 5 minutes
                            },
                            cacheableResponse: {
                                statuses: [0, 200]
                            }
                        }
                    },
                    {
                        // Babies data — StaleWhileRevalidate for instant app start
                        urlPattern: /\/api\/babies\/?$/i,
                        handler: 'StaleWhileRevalidate',
                        options: {
                            cacheName: 'api-babies-list-cache',
                            expiration: {
                                maxEntries: 5,
                                maxAgeSeconds: 300 // 5 minutes
                            },
                            cacheableResponse: {
                                statuses: [0, 200]
                            }
                        }
                    },
                    {
                        // All other API responses — NetworkFirst
                        urlPattern: /\/api\/.*/i,
                        handler: 'NetworkFirst',
                        options: {
                            cacheName: 'api-cache',
                            expiration: {
                                maxEntries: 100,
                                maxAgeSeconds: 60 * 60 * 24 // 24 hours
                            },
                            networkTimeoutSeconds: 10,
                            cacheableResponse: {
                                statuses: [0, 200]
                            }
                        }
                    }
                ],
                // Don't cache during development
                globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}']
            }
        })
    ],
    server: {
        port: 5173,
        proxy: {
            '/api': {
                target: 'http://localhost:8000',
                changeOrigin: true,
            }
        }
    },
    build: {
        outDir: 'dist',
        sourcemap: false,
        rollupOptions: {
            output: {
                manualChunks: {
                    // Heavy charting library — only used in Insights page, not on Dashboard
                    'recharts': ['recharts'],
                    // Animation library — keep separate so core bundle parses faster
                    'framer': ['framer-motion'],
                    // Date utilities
                    'date-fns': ['date-fns'],
                    // Supabase auth — loaded async after initial render
                    'supabase': ['@supabase/supabase-js'],
                    // i18n runtime
                    'i18n': ['i18next', 'react-i18next'],
                    // React core (shared, cached aggressively)
                    'react-vendor': ['react', 'react-dom', 'react-router-dom'],
                }
            }
        }
    }
})
