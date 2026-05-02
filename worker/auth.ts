/// <reference types="@cloudflare/workers-types" />

export interface Session {
  u: string; // github login
  exp: number; // unix seconds
}

export interface AuthEnv {
  GITHUB_CLIENT_ID: string;
  GITHUB_CLIENT_SECRET: string;
  SESSION_SECRET: string;
  ALLOWED_GITHUB_USER: string;
}

const SESSION_TTL_SEC = 24 * 60 * 60; // 24h

// ───────────── cookie helpers ─────────────

export function parseCookies(header: string | null): Record<string, string> {
  if (!header) return {};
  const out: Record<string, string> = {};
  for (const part of header.split(/;\s*/)) {
    const i = part.indexOf("=");
    if (i < 0) continue;
    out[part.slice(0, i)] = decodeURIComponent(part.slice(i + 1));
  }
  return out;
}

function makeCookie(
  name: string,
  value: string,
  opts: { maxAge?: number; path?: string } = {},
): string {
  const path = opts.path ?? "/";
  const parts = [
    `${name}=${value}`,
    "HttpOnly",
    "Secure",
    "SameSite=Lax",
    `Path=${path}`,
  ];
  if (opts.maxAge !== undefined) parts.push(`Max-Age=${opts.maxAge}`);
  return parts.join("; ");
}

// ───────────── HMAC-signed session ─────────────

async function hmacKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

function b64url(bytes: ArrayBuffer | Uint8Array): string {
  const arr = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let s = "";
  for (const b of arr) s += String.fromCharCode(b);
  return btoa(s).replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_");
}

function b64urlDecode(s: string): Uint8Array {
  const padded = s.replace(/-/g, "+").replace(/_/g, "/").padEnd(
    Math.ceil(s.length / 4) * 4,
    "=",
  );
  const bin = atob(padded);
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return arr;
}

export async function issueSession(
  user: string,
  secret: string,
): Promise<string> {
  const payload: Session = {
    u: user,
    exp: Math.floor(Date.now() / 1000) + SESSION_TTL_SEC,
  };
  const data = b64url(new TextEncoder().encode(JSON.stringify(payload)));
  const key = await hmacKey(secret);
  const sig = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(data),
  );
  return `${data}.${b64url(sig)}`;
}

export async function verifySession(
  token: string,
  secret: string,
): Promise<Session | null> {
  const [data, sig] = token.split(".");
  if (!data || !sig) return null;
  const key = await hmacKey(secret);
  const ok = await crypto.subtle.verify(
    "HMAC",
    key,
    b64urlDecode(sig),
    new TextEncoder().encode(data),
  );
  if (!ok) return null;
  try {
    const payload = JSON.parse(
      new TextDecoder().decode(b64urlDecode(data)),
    ) as Session;
    if (payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

export async function getSession(
  req: Request,
  env: AuthEnv,
): Promise<Session | null> {
  const cookies = parseCookies(req.headers.get("cookie"));
  if (!cookies.session) return null;
  return verifySession(cookies.session, env.SESSION_SECRET);
}

// ───────────── GitHub OAuth flow ─────────────

export function startLoginRedirect(env: AuthEnv, origin: string): Response {
  const state = crypto.randomUUID();
  const callback = `${origin}/api/auth/github/callback`;
  const url = new URL("https://github.com/login/oauth/authorize");
  url.searchParams.set("client_id", env.GITHUB_CLIENT_ID);
  url.searchParams.set("redirect_uri", callback);
  url.searchParams.set("scope", "read:user");
  url.searchParams.set("state", state);

  const headers = new Headers({ location: url.toString() });
  headers.append(
    "set-cookie",
    makeCookie("oauth_state", state, { maxAge: 600 }),
  );
  return new Response(null, { status: 302, headers });
}

export async function handleCallback(
  env: AuthEnv,
  req: Request,
): Promise<Response> {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const cookies = parseCookies(req.headers.get("cookie"));
  if (!code || !state || cookies.oauth_state !== state) {
    return new Response("invalid OAuth state", { status: 400 });
  }

  // exchange code for token
  const tokenRes = await fetch(
    "https://github.com/login/oauth/access_token",
    {
      method: "POST",
      headers: {
        accept: "application/json",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        client_id: env.GITHUB_CLIENT_ID,
        client_secret: env.GITHUB_CLIENT_SECRET,
        code,
      }),
    },
  );
  const tokenJson = (await tokenRes.json()) as {
    access_token?: string;
    error?: string;
  };
  if (!tokenJson.access_token) {
    return new Response(
      `github oauth error: ${tokenJson.error ?? "no token"}`,
      { status: 400 },
    );
  }

  const userRes = await fetch("https://api.github.com/user", {
    headers: {
      authorization: `Bearer ${tokenJson.access_token}`,
      "user-agent": "arcknights-substrate-calc",
      accept: "application/vnd.github+json",
    },
  });
  const user = (await userRes.json()) as { login?: string };
  if (!user.login) {
    return new Response("could not fetch user", { status: 400 });
  }

  // allow-list: comma-separated, case-insensitive
  const allowed = env.ALLOWED_GITHUB_USER.split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  if (!allowed.includes(user.login.toLowerCase())) {
    return new Response(
      `User "${user.login}" is not allowed to access admin.`,
      { status: 403 },
    );
  }

  const session = await issueSession(user.login, env.SESSION_SECRET);
  const headers = new Headers({ location: "/admin/" });
  headers.append(
    "set-cookie",
    makeCookie("session", session, { maxAge: SESSION_TTL_SEC }),
  );
  headers.append("set-cookie", makeCookie("oauth_state", "", { maxAge: 0 }));
  return new Response(null, { status: 302, headers });
}

export function logoutResponse(): Response {
  const headers = new Headers({ "content-type": "application/json" });
  headers.append("set-cookie", makeCookie("session", "", { maxAge: 0 }));
  return new Response(JSON.stringify({ ok: true }), { headers });
}
