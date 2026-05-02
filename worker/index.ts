/// <reference types="@cloudflare/workers-types" />

import bakedBundle from "../src/data/bundle.json";
import {
  type AuthEnv,
  getSession,
  handleCallback,
  logoutResponse,
  startLoginRedirect,
} from "./auth";

interface Env extends AuthEnv {
  ASSETS: Fetcher;
  DATA: KVNamespace;
}

const BUNDLE_KEY = "bundle";

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    // ───── public bundle ─────
    if (path === "/api/bundle" && request.method === "GET") {
      return getBundle(env);
    }

    // ───── auth flow ─────
    if (path === "/api/auth/github/login") {
      return startLoginRedirect(env, url.origin);
    }
    if (path === "/api/auth/github/callback") {
      return handleCallback(env, request);
    }
    if (path === "/api/auth/me") {
      return whoami(request, env);
    }
    if (path === "/api/auth/logout") {
      return logoutResponse();
    }

    // ───── admin (protected) ─────
    if (path === "/api/admin/points" && request.method === "POST") {
      return adminUpdatePoints(request, env);
    }

    // ───── static assets fallback ─────
    return env.ASSETS.fetch(request);
  },
} satisfies ExportedHandler<Env>;

async function getBundle(env: Env): Promise<Response> {
  const stored = await env.DATA.get(BUNDLE_KEY);
  const body = stored ?? JSON.stringify(bakedBundle);
  return new Response(body, {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "public, max-age=60, s-maxage=60",
      "access-control-allow-origin": "*",
    },
  });
}

async function whoami(req: Request, env: Env): Promise<Response> {
  const session = await getSession(req, env);
  if (!session) {
    return new Response(JSON.stringify({ user: null }), {
      headers: { "content-type": "application/json" },
    });
  }
  return new Response(JSON.stringify({ user: session.u }), {
    headers: { "content-type": "application/json" },
  });
}

interface PointPatch {
  id: string;
  name: string;
  region: "四号谷地" | "武陵";
  skillPool: string[];
  basePool?: string[];
  addPool?: string[];
}

async function adminUpdatePoints(
  req: Request,
  env: Env,
): Promise<Response> {
  const session = await getSession(req, env);
  if (!session) {
    return jsonError(401, "unauthenticated");
  }

  let body: { points?: unknown };
  try {
    body = (await req.json()) as { points?: unknown };
  } catch {
    return jsonError(400, "invalid json body");
  }
  const points = body.points;
  if (!Array.isArray(points)) {
    return jsonError(400, "expected { points: [...] }");
  }

  // load current bundle (KV → fall back to baked)
  const current = JSON.parse(
    (await env.DATA.get(BUNDLE_KEY)) ?? JSON.stringify(bakedBundle),
  ) as typeof bakedBundle;

  const baseSet = new Set<string>(current.attributes.base);
  const addSet = new Set<string>(current.attributes.add);
  const skillSet = new Set<string>(current.attributes.skill);
  const validRegion = new Set(["四号谷地", "武陵"]);

  const cleaned: PointPatch[] = [];
  const errors: string[] = [];
  for (const p of points as PointPatch[]) {
    if (!p || typeof p !== "object") {
      errors.push("non-object point");
      continue;
    }
    if (typeof p.id !== "string" || !p.id) errors.push("missing id");
    if (typeof p.name !== "string" || !p.name) errors.push(`${p.id}: missing name`);
    if (!validRegion.has(p.region)) errors.push(`${p.id}: bad region`);
    if (
      !Array.isArray(p.skillPool) ||
      p.skillPool.length === 0 ||
      p.skillPool.some((s) => !skillSet.has(s))
    ) {
      errors.push(`${p.id}: invalid skillPool`);
    }
    if (p.basePool !== undefined) {
      if (
        !Array.isArray(p.basePool) ||
        p.basePool.some((s) => !baseSet.has(s))
      ) {
        errors.push(`${p.id}: invalid basePool`);
      }
    }
    if (p.addPool !== undefined) {
      if (
        !Array.isArray(p.addPool) ||
        p.addPool.some((s) => !addSet.has(s))
      ) {
        errors.push(`${p.id}: invalid addPool`);
      }
    }
    cleaned.push({
      id: p.id,
      name: p.name,
      region: p.region,
      skillPool: [...p.skillPool],
      basePool: p.basePool ? [...p.basePool] : undefined,
      addPool: p.addPool ? [...p.addPool] : undefined,
    });
  }

  if (errors.length > 0) {
    return jsonError(422, "validation failed", { errors });
  }

  const next = { ...current, depositionPoints: cleaned };
  await env.DATA.put(BUNDLE_KEY, JSON.stringify(next));

  return new Response(
    JSON.stringify({ ok: true, count: cleaned.length, by: session.u }),
    { headers: { "content-type": "application/json" } },
  );
}

function jsonError(
  status: number,
  message: string,
  extra: Record<string, unknown> = {},
): Response {
  return new Response(JSON.stringify({ error: message, ...extra }), {
    status,
    headers: { "content-type": "application/json" },
  });
}
