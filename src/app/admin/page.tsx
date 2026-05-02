"use client";

import { useEffect, useMemo, useState } from "react";
import {
  DataBundleSchema,
  validateBundle,
  type DataBundle,
  type DepositionPoint,
} from "@/data/schema";

interface MeResp {
  user: string | null;
}

export default function AdminPage() {
  const [user, setUser] = useState<string | null | undefined>(undefined);
  const [bundle, setBundle] = useState<DataBundle | null>(null);
  const [editing, setEditing] = useState<DepositionPoint[]>([]);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((j: MeResp) => setUser(j.user))
      .catch(() => setUser(null));
  }, []);

  useEffect(() => {
    if (!user) return;
    fetch("/api/bundle")
      .then((r) => r.json())
      .then((j) => {
        const parsed = DataBundleSchema.parse(j);
        validateBundle(parsed);
        setBundle(parsed);
        setEditing(structuredClone(parsed.depositionPoints));
      })
      .catch((e: unknown) => setError(`load failed: ${(e as Error).message}`));
  }, [user]);

  function updatePoint(idx: number, fn: (p: DepositionPoint) => DepositionPoint) {
    setEditing((prev) => prev.map((p, i) => (i === idx ? fn(p) : p)));
  }

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/points", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ points: editing }),
      });
      const j = (await res.json()) as { ok?: boolean; error?: string; errors?: string[] };
      if (!res.ok || !j.ok) {
        setError(j.error ?? "save failed" + (j.errors ? `: ${j.errors.join(", ")}` : ""));
      } else {
        setSavedAt(Date.now());
      }
    } catch (e) {
      setError(`network error: ${(e as Error).message}`);
    } finally {
      setSaving(false);
    }
  }

  async function logout() {
    await fetch("/api/auth/logout");
    location.reload();
  }

  // ───── render ─────

  if (user === undefined) {
    return (
      <Shell>
        <div className="font-mono-tech text-[11px] tracking-[0.2em] text-[var(--mute)]">
          // CHECKING SESSION...
        </div>
      </Shell>
    );
  }

  if (user === null) {
    return (
      <Shell>
        <LoginPrompt />
      </Shell>
    );
  }

  if (!bundle) {
    return (
      <Shell>
        <div className="font-mono-tech text-[11px] tracking-[0.2em] text-[var(--mute)]">
          // LOADING BUNDLE...
        </div>
        {error && <ErrorBox msg={error} />}
      </Shell>
    );
  }

  return (
    <Shell user={user} onLogout={logout}>
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-3 border border-line bg-paper-2 px-3 py-2">
          <span className="ink-bar inline-flex h-[18px] items-center px-1.5 text-[10px] font-mono-tech tracking-[0.22em]">
            EDIT
          </span>
          <span className="font-mono-tech text-[10px] tracking-[0.2em] text-[var(--ink-2)]">
            {editing.length} POINTS
          </span>
          <span className="ml-auto" />
          {savedAt && (
            <span className="font-mono-tech text-[10px] text-[var(--orange-soft)]">
              SAVED · {new Date(savedAt).toLocaleTimeString("zh-CN")}
            </span>
          )}
          <button
            type="button"
            onClick={save}
            disabled={saving}
            className="inline-flex items-center gap-1 px-2 h-7 bg-[var(--orange)] text-[var(--bg)] font-mono-tech text-[10px] tracking-[0.2em] disabled:opacity-50 hover:bg-[var(--orange-soft)] transition-colors"
          >
            {saving ? "SAVING…" : "▸ COMMIT"}
          </button>
        </div>

        {error && <ErrorBox msg={error} />}

        <div className="flex flex-col gap-3">
          {editing.map((p, i) => (
            <PointEditor
              key={p.id}
              point={p}
              attrs={bundle.attributes}
              onChange={(np) => updatePoint(i, () => np)}
            />
          ))}
        </div>
      </div>
    </Shell>
  );
}

// ───────────────────────── shell + login ─────────────────────────

function Shell({
  children,
  user,
  onLogout,
}: {
  children: React.ReactNode;
  user?: string;
  onLogout?: () => void;
}) {
  return (
    <div className="relative z-10 mx-auto flex w-full max-w-3xl flex-col gap-5 px-4 pt-5 pb-12">
      <header className="flex flex-col gap-2 reveal">
        <div className="flex items-center gap-2">
          <span className="ink-bar inline-flex h-[18px] items-center px-1.5 text-[10px] font-mono-tech tracking-[0.22em]">
            ADMIN
          </span>
          <span className="font-mono-tech text-[10px] tracking-[0.22em] text-[var(--mute)]">
            // ENDFIELD INDUSTRIES — OPS CONSOLE
          </span>
        </div>
        <div className="flex items-end justify-between gap-3">
          <h1 className="font-display text-[34px] leading-[0.9] tracking-[0.01em] text-[var(--ink)]">
            <span className="text-orange">DEPOSITION</span>{" "}
            <span>EDITOR</span>
          </h1>
          <div className="hidden sm:flex flex-col items-end font-mono-tech text-[10px] tracking-[0.16em] text-[var(--mute)]">
            <span>NO. ENDF-OPS.01</span>
            <span>RHINE LAB / OPS CONSOLE</span>
          </div>
        </div>
        {user && (
          <div className="flex items-center gap-2 font-mono-tech text-[10px] tracking-[0.18em] text-[var(--ink-2)]">
            <span className="text-[var(--mute)]">// OPERATOR</span>
            <span className="text-[var(--orange)]">@{user}</span>
            {onLogout && (
              <button
                type="button"
                onClick={onLogout}
                className="ml-2 text-[var(--mute)] hover:text-[var(--orange)] transition-colors"
              >
                [ LOGOUT × ]
              </button>
            )}
            <a
              href="/"
              className="ml-auto text-[var(--mute)] hover:text-[var(--ink)] transition-colors"
            >
              ← BACK
            </a>
          </div>
        )}
      </header>
      {children}
      <footer className="mt-2 flex items-center gap-2 border-t border-line pt-3 font-mono-tech text-[9.5px] tracking-[0.22em] text-[var(--mute)]">
        <span className="stripe-warn block h-[10px] w-12" />
        <span className="text-[var(--ink-2)]">POWERED BY</span>
        <span className="font-display text-[12px] tracking-[0.04em] text-[var(--ink)]">
          ENDFIELD ANALYSIS OS
        </span>
      </footer>
    </div>
  );
}

function LoginPrompt() {
  return (
    <div className="flex flex-col gap-3 border border-line bg-paper-2 px-4 py-6">
      <span className="sect-label">// AUTH-REQUIRED</span>
      <p className="font-mono-tech text-[12px] text-[var(--ink-2)] leading-relaxed">
        本控制台仅对授权 GitHub 账户开放。
        <br />
        点击下方按钮通过 GitHub OAuth 登录。
      </p>
      <a
        href="/api/auth/github/login"
        className="self-start inline-flex items-center gap-1.5 px-3 h-8 bg-[var(--orange)] text-[var(--bg)] font-mono-tech text-[11px] tracking-[0.2em] hover:bg-[var(--orange-soft)] transition-colors"
      >
        ▸ SIGN IN VIA GITHUB
      </a>
    </div>
  );
}

function ErrorBox({ msg }: { msg: string }) {
  return (
    <div className="border border-[var(--orange-deep)] bg-[#1a0d05] px-3 py-2 font-mono-tech text-[11px] text-[var(--orange-soft)]">
      // ERR · {msg}
    </div>
  );
}

// ───────────────────────── point editor ─────────────────────────

function PointEditor({
  point,
  attrs,
  onChange,
}: {
  point: DepositionPoint;
  attrs: DataBundle["attributes"];
  onChange: (p: DepositionPoint) => void;
}) {
  const baseSelected = useMemo(
    () => new Set(point.basePool ?? attrs.base),
    [point.basePool, attrs.base],
  );
  const addSelected = useMemo(
    () => new Set(point.addPool ?? attrs.add),
    [point.addPool, attrs.add],
  );
  const skillSelected = useMemo(
    () => new Set(point.skillPool),
    [point.skillPool],
  );

  function toggle(
    kind: "base" | "add" | "skill",
    name: string,
    current: Set<string>,
  ) {
    const next = new Set(current);
    if (next.has(name)) next.delete(name);
    else next.add(name);
    if (kind === "base") {
      // empty → unset (no constraint = all 5)
      onChange({
        ...point,
        basePool: next.size === 0 ? undefined : [...next],
      });
    } else if (kind === "add") {
      onChange({
        ...point,
        addPool: next.size === 0 ? undefined : [...next],
      });
    } else {
      onChange({
        ...point,
        skillPool: next.size === 0 ? point.skillPool : [...next],
      });
    }
  }

  function setAll(kind: "base" | "add" | "skill") {
    if (kind === "base") onChange({ ...point, basePool: undefined });
    else if (kind === "add") onChange({ ...point, addPool: undefined });
  }

  return (
    <article className="frame-corners border border-line bg-paper-2">
      <header className="flex items-center gap-2 border-b border-line px-3 py-1.5">
        <span className="font-display text-base leading-none text-[var(--ink)]">
          {point.name}
        </span>
        <span className="font-mono-tech text-[10px] tracking-[0.18em] text-[var(--mute)]">
          [ {point.region} ]
        </span>
      </header>
      <div className="flex flex-col gap-3 px-3 py-3">
        <PoolEditor
          label="基础属性 BASE / 5"
          options={attrs.base}
          selected={baseSelected}
          activeWhenAll
          tone="base"
          onToggle={(n) => toggle("base", n, baseSelected)}
          onReset={() => setAll("base")}
        />
        <PoolEditor
          label={`附加属性 ADD / ${attrs.add.length}`}
          options={attrs.add}
          selected={addSelected}
          activeWhenAll
          tone="add"
          onToggle={(n) => toggle("add", n, addSelected)}
          onReset={() => setAll("add")}
        />
        <PoolEditor
          label={`技能属性 SKILL / ${attrs.skill.length}`}
          options={attrs.skill}
          selected={skillSelected}
          tone="skill"
          onToggle={(n) => toggle("skill", n, skillSelected)}
        />
      </div>
    </article>
  );
}

function PoolEditor({
  label,
  options,
  selected,
  activeWhenAll,
  tone,
  onToggle,
  onReset,
}: {
  label: string;
  options: readonly string[];
  selected: Set<string>;
  activeWhenAll?: boolean;
  tone: "base" | "add" | "skill";
  onToggle: (n: string) => void;
  onReset?: () => void;
}) {
  const allSelected = options.every((o) => selected.has(o));
  const showsAllUnconstrained = activeWhenAll && allSelected;
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline gap-2">
        <span className="sect-label">// {label}</span>
        <span className="font-mono-tech text-[10px] tracking-[0.16em] text-[var(--ink-2)]">
          {selected.size}/{options.length}
          {showsAllUnconstrained && " · 全集 (默认)"}
        </span>
        {onReset && !showsAllUnconstrained && (
          <button
            type="button"
            onClick={onReset}
            className="ml-auto font-mono-tech text-[10px] tracking-[0.16em] text-[var(--mute)] hover:text-[var(--ink)]"
          >
            [ ALL ]
          </button>
        )}
      </div>
      <div className="flex flex-wrap gap-1">
        {options.map((o) => {
          const on = selected.has(o);
          return (
            <button
              key={o}
              type="button"
              onClick={() => onToggle(o)}
              className={pillClass(tone, on)}
            >
              {o}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function pillClass(tone: "base" | "add" | "skill", on: boolean): string {
  const off = "border-[var(--line)] text-[var(--mute)] hover:border-[var(--line-bright)] hover:text-[var(--ink-2)]";
  const onMap = {
    base: "border-[#3a534f] bg-[#0d2624] text-[var(--teal)]",
    add: "border-[#4f4d28] bg-[#1a1808] text-[var(--acid)]",
    skill: "border-[var(--orange)] bg-[#231104] text-[var(--orange)]",
  };
  return `inline-flex items-center border px-1.5 h-[20px] text-[10px] font-mono-tech tracking-[0.04em] transition-colors ${
    on ? onMap[tone] : off
  }`;
}
