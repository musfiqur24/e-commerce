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
    http: {
      storeCors: process.env.STORE_CORS!,
      adminCors: process.env.ADMIN_CORS!,
      authCors: process.env.AUTH_CORS!,
      jwtSecret: process.env.JWT_SECRET || "supersecret",
      cookieSecret: process.env.COOKIE_SECRET || "supersecret",
    },
  },
  modules: [
    {
      resolve: "@medusajs/event-bus-local",
      key: Modules.EVENT_BUS,
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
