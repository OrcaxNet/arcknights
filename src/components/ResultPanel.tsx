"use client";

import { useState } from "react";
import { useWeaponById } from "@/data/runtime";
import type { LockOption, PlanGroup, Weapon } from "@/lib/types";

interface Props {
  groups: PlanGroup[];
  uncovered: Weapon[];
}

function formatProb(p: number) {
  if (p === 0) return "0";
  if (p >= 0.01) return `${(p * 100).toFixed(2)}%`;
  return `1/${Math.round(1 / p)}`;
}

function expectedDrops(p: number) {
  if (p === 0) return "—";
  return `≈ ${Math.ceil(1 / p)} 次/件`;
}

export function ResultPanel({ groups, uncovered }: Props) {
  const weaponById = useWeaponById();

  if (groups.length === 0) {
    return (
      <section className="rounded-lg border border-zinc-800 bg-zinc-900/50 px-4 py-6 text-center text-sm text-zinc-400">
        所选武器在数据库内的淤积点都不支持，无可行方案。
      </section>
    );
  }

  const [primary, ...alternatives] = groups;

  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-sm font-semibold text-amber-300">推荐方案</h2>
      <GroupCard group={primary} primary weaponById={weaponById} />

      {uncovered.length > 0 && (
        <div className="rounded-md border border-rose-900/50 bg-rose-950/30 px-3 py-2 text-xs text-rose-300">
          有 {uncovered.length} 件武器没被这个方案覆盖：
          <span className="ml-1">{uncovered.map((w) => w.name).join("、")}</span>
          <span className="ml-1 text-rose-400/70">
            （在备选里看是否有别的关卡能命中，或考虑分批刷）
          </span>
        </div>
      )}

      {alternatives.length > 0 && (
        <details className="rounded-lg border border-zinc-800 bg-zinc-900/50">
          <summary className="cursor-pointer px-3 py-2 text-xs text-zinc-400">
            备选方案（{alternatives.length}）
          </summary>
          <div className="flex flex-col gap-2 px-3 pb-3 pt-2">
            {alternatives.map((g, i) => (
              <GroupCard key={i} group={g} weaponById={weaponById} />
            ))}
          </div>
        </details>
      )}
    </section>
  );
}

function GroupCard({
  group,
  primary,
  weaponById,
}: {
  group: PlanGroup;
  primary?: boolean;
  weaponById: Map<string, Weapon>;
}) {
  const [primaryLock, ...otherLocks] = group.lockOptions;
  return (
    <div
      className={`flex flex-col gap-3 rounded-lg border px-3 py-3 ${
        primary
          ? "border-amber-400/50 bg-amber-400/5"
          : "border-zinc-800 bg-zinc-900"
      }`}
    >
      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
        <span className="text-xs text-zinc-500">前往</span>
        <span className="font-semibold text-zinc-100">{group.point.name}</span>
        <span className="text-[11px] text-zinc-500">
          ({group.point.region})
        </span>
      </div>

      <LockOptionView
        primaryLock={primaryLock}
        otherLocks={otherLocks}
      />

      <div className="flex flex-col gap-1">
        <div className="text-[11px] text-zinc-500">
          覆盖 {group.hits.length} 件武器
          <span className="ml-2 text-amber-300">
            期望产出 {group.totalProb.toFixed(3)} 件/次
          </span>
        </div>
        <ul className="flex flex-col gap-0.5 text-xs">
          {group.hits.map((h) => {
            const w = weaponById.get(h.weaponId);
            return (
              <li
                key={h.weaponId}
                className="flex items-center justify-between rounded bg-zinc-950/40 px-2 py-1"
              >
                <span className="text-zinc-200">{w?.name ?? h.weaponId}</span>
                <span className="text-zinc-400 tabular-nums">
                  {formatProb(h.prob)}{" "}
                  <span className="text-zinc-500">{expectedDrops(h.prob)}</span>
                </span>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

function LockOptionView({
  primaryLock,
  otherLocks,
}: {
  primaryLock: LockOption;
  otherLocks: LockOption[];
}) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="flex flex-col gap-2">
      <LockBlock lock={primaryLock} />
      {otherLocks.length > 0 && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="self-start text-[11px] text-zinc-500 hover:text-zinc-300"
        >
          {expanded ? "▾" : "▸"} 其他锁定方案（{otherLocks.length}）
        </button>
      )}
      {expanded && otherLocks.length > 0 && (
        <ul className="flex flex-col gap-1 border-l border-zinc-800 pl-3">
          {otherLocks.map((lock, i) => (
            <li key={i}>
              <LockBlock lock={lock} compact />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function LockBlock({
  lock,
  compact,
}: {
  lock: LockOption;
  compact?: boolean;
}) {
  return (
    <div className={`flex flex-col gap-1 ${compact ? "text-[11px]" : ""}`}>
      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
        <span className="text-[11px] text-zinc-500">锁定基础</span>
        <div className="flex flex-wrap gap-1">
          {lock.lockedBases.map((b) => (
            <span
              key={b}
              className="rounded bg-sky-500/20 px-1.5 py-0.5 text-xs text-sky-300"
            >
              {b}
            </span>
          ))}
        </div>
        <span className="text-[11px] text-zinc-500">
          锁{lock.lockedAttr.kind === "add" ? "附加" : "技能"}
        </span>
        <span
          className={`rounded px-1.5 py-0.5 text-xs ${
            lock.lockedAttr.kind === "add"
              ? "bg-emerald-500/20 text-emerald-300"
              : "bg-fuchsia-500/20 text-fuchsia-300"
          }`}
        >
          {lock.lockedAttr.name}
        </span>
      </div>
    </div>
  );
}
