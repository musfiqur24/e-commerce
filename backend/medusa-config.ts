import { loadEnv, defineConfig, Modules } from "@medusajs/framework/utils";

loadEnv(process.env.NODE_ENV || "development", process.cwd());

const backendUrl =
  process.env.MEDUSA_BACKEND_URL ||
  process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL ||
  "http://localhost:9000";

module.exports = defineConfig({
  admin: {
    vite: () => ({
      plugins: [
        {
          name: 'custom-favicon',
          transformIndexHtml: {
            order: 'post' as const,
            handler(html: string) {
              // Remove any existing favicon links then inject ours
              const stripped = html.replace(
                /<link[^>]*rel=["'](?:shortcut icon|icon)["'][^>]*>/gi,
                ''
              )
              return stripped.replace(
                '</head>',
                '<link rel="icon" type="image/x-icon" href="/static/favicon.ico" />\n</head>'
              )
            },
          },
        },
      ],
    }),
  },
  projectConfig: {
    databaseUrl: process.env.DATABASE_URL,
    redisUrl: process.env.REDIS_URL,
    // Local Docker uses the compiled Admin over HTTP. Live deployments keep
    // secure cookies unless this explicit local-only override is set.
    ...(process.env.LOCAL_HTTP_COOKIES === 'true' ? { cookieOptions: { secure: false, sameSite: 'lax' as const } } : {}),
    http: {
      storeCors: process.env.STORE_CORS!,
      adminCors: process.env.ADMIN_CORS!,
      authCors: process.env.AUTH_CORS!,
      jwtSecret: process.env.JWT_SECRET || "supersecret",
      cookieSecret: process.env.COOKIE_SECRET || "supersecret",
    },
  },
  modules: [
    { resolve: './src/modules/inventory-history' },
    {
      resolve: "@medusajs/medusa/locking",
      options: { providers: [{ resolve: "@medusajs/medusa/locking-postgres", id: "locking-postgres", is_default: true }] },
    },
    ...(process.env.STRIPE_API_KEY && process.env.STRIPE_WEBHOOK_SECRET ? [{
      resolve: "@medusajs/medusa/payment",
      options: { providers: [{
        resolve: "@medusajs/medusa/payment-stripe",
        id: "stripe",
        options: {
          apiKey: process.env.STRIPE_API_KEY,
          webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
          // Authorize first; capture only after the order and inventory reservation exist.
          capture: false,
        },
      }] },
    }] : []),
    {
      resolve: process.env.REDIS_URL ? "@medusajs/medusa/event-bus-redis" : "@medusajs/event-bus-local",
      key: Modules.EVENT_BUS,
      options: process.env.REDIS_URL ? { redisUrl: process.env.REDIS_URL } : {},
    },
    {
      resolve: "@medusajs/medusa/file",
      options: {
        providers: [
          {
            resolve: "@medusajs/medusa/file-local",
            id: "local",
            options: {
              upload_dir: "static",
              backend_url: `${backendUrl.replace(/\/$/, "")}/static`,
            },
          },
        ],
      },
    },
  ],
});
