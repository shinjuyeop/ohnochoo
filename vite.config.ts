import { existsSync } from "node:fs";
import type { IncomingMessage, ServerResponse } from "node:http";
import { createRequire } from "node:module";
import { resolve } from "node:path";
import { defineConfig, loadEnv, type Plugin } from "vite";
import react from "@vitejs/plugin-react";

type LocalApiRequest = IncomingMessage & { query: Record<string, string> };
type LocalApiResponse = ServerResponse & {
  status: (code: number) => LocalApiResponse;
  json: (body: unknown) => LocalApiResponse;
};

function localVercelFunctions(): Plugin {
  const require = createRequire(import.meta.url);

  return {
    name: "ohnochoo-local-vercel-functions",
    apply: "serve",
    configureServer(server) {
      server.middlewares.use(async (rawRequest, rawResponse, next) => {
        const requestUrl = new URL(rawRequest.url || "/", "http://localhost");
        const routeMatch = requestUrl.pathname.match(/^\/api\/([a-z0-9-]+)$/i);
        if (!routeMatch) return next();

        const functionPath = resolve(process.cwd(), "api", `${routeMatch[1]}.js`);
        if (!existsSync(functionPath)) return next();

        const request = rawRequest as LocalApiRequest;
        const response = rawResponse as LocalApiResponse;
        request.query = Object.fromEntries(requestUrl.searchParams.entries());
        response.status = (code) => {
          response.statusCode = code;
          return response;
        };
        response.json = (body) => {
          if (!response.headersSent) response.setHeader("Content-Type", "application/json; charset=utf-8");
          response.end(JSON.stringify(body));
          return response;
        };

        try {
          const handler = require(functionPath) as (req: LocalApiRequest, res: LocalApiResponse) => unknown;
          await handler(request, response);
        } catch (error) {
          server.config.logger.error(`Local API failed: ${requestUrl.pathname}`, {
            error: error instanceof Error ? error : new Error(String(error)),
          });
          if (!response.writableEnded) response.status(500).json({ error: "로컬 API 실행에 실패했습니다." });
        }
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  for (const key of ["SUPABASE_URL", "SUPABASE_ANON_KEY", "SUPABASE_SERVICE_ROLE_KEY", "VAPID_PUBLIC_KEY", "VAPID_PRIVATE_KEY", "VAPID_SUBJECT"]) {
    process.env[key] ||= env[key];
  }

  return {
    plugins: [localVercelFunctions(), react()],
  };
});
