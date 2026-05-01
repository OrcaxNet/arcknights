/// <reference types="@cloudflare/workers-types" />

interface Env {
  ASSETS: Fetcher;
  DATA: KVNamespace;
}

const BUNDLE_KEY = "bundle";

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/api/bundle" && request.method === "GET") {
      const stored = await env.DATA.get(BUNDLE_KEY);
      if (stored) {
        return new Response(stored, {
          headers: {
            "content-type": "application/json; charset=utf-8",
            // 客户端缓存 60s；KV 全球分发已经够快了，再加一层避免突发抖动
            "cache-control": "public, max-age=60, s-maxage=60",
            "access-control-allow-origin": "*",
          },
        });
      }
      // KV 还没种过数据时返回空对象，前端会回退到打包内置的 bundle.json
      return new Response("null", {
        headers: { "content-type": "application/json; charset=utf-8" },
        status: 204,
      });
    }

    return env.ASSETS.fetch(request);
  },
} satisfies ExportedHandler<Env>;
