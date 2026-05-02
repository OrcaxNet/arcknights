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
  return `≈ ${Math.ceil(1 / p)}×`;
}

export function ResultPanel({ groups, uncovered }: Props) {
  const weaponById = useWeaponById();

  if (groups.length === 0) {
    return (
      <section className="border border-line bg-paper-2 px-4 py-6 text-center font-mono-tech text-[11px] tracking-[0.16em] text-[var(--mute)]">
        // NO FEASIBLE DROP-POINT FOUND //
      </section>
    );
  }

  const [primary, ...alternatives] = groups;

  return (
    <section className="flex flex-col gap-4">
      <GroupCard group={primary} primary weaponById={weaponById} />

      {uncovered.length > 0 && (
        <div className="reveal flex flex-col gap-1.5 border border-[var(--orange-deep)] bg-[#1a0d05] px-3 py-2.5">
          <div className="flex items-center gap-2">
            <span className="ink-bar bg-[var(--orange)] text-[var(--bg)] inline-flex h-[18px] items-center px-1.5 text-[10px] font-mono-tech tracking-[0.22em]">
              CAUTION
            </span>
            <span className="font-mono-tech text-[10px] tracking-[0.18em] text-[var(--orange-soft)]">
              {uncovered.length} 件武器未覆盖 / SPLIT-RUN ADVISED
            </span>
          </div>
          <p className="font-mono-tech text-[11px] text-[var(--ink-2)]">
            {uncovered.map((w) => w.name).join("、")}
            <span className="text-[var(--mute)]"> ── 在备选里看是否有别的关卡能命中</span>
          </p>
        </div>
      )}

      {alternatives.length > 0 && (
        <details className="group border border-line bg-[var(--bg-1)]">
          <summary className="cursor-pointer flex items-center gap-2 px-3 py-2 select-none">
            <span className="sect-label">// ALT.PLANS</span>
            <span className="font-mono-tech text-[10px] tracking-[0.18em] text-[var(--ink-2)]">
              [ {String(alternatives.length).padStart(2, "0")} ]
            </span>
            <span className="ml-auto font-mono-tech text-[10px] text-[var(--mute)] transition-transform group-open:rotate-90">
              ▸
            </span>
          </summary>
          <div className="flex flex-col gap-2 px-3 pb-3 pt-1 border-t border-line">
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
    <article
      className={`reveal frame-corners ${
        primary ? "is-accent" : ""
      } relative border bg-paper-2 ${
        primary ? "border-orange" : "border-line"
      }`}
    >
      {/* classified header bar */}
      <header
        className={`flex items-center gap-2 px-3 py-1.5 border-b ${
          primary ? "border-orange" : "border-line"
        }`}
      >
        <span
          className={`inline-flex h-[18px] items-center px-1.5 text-[10px] font-mono-tech tracking-[0.22em] ${
            primary ? "bg-orange text-[var(--bg)]" : "ink-bar"
          }`}
        >
          {primary ? "PRIMARY" : "ALT"}
        </span>
        <span className="font-mono-tech text-[10px] tracking-[0.16em] text-[var(--mute)]">
          //CASE_{group.point.id.toUpperCase().slice(-4)}
        </span>
        <span className="ml-auto font-mono-tech text-[10px] tracking-[0.18em] text-[var(--orange-soft)]">
          E[Y] {group.totalProb.toFixed(3)}/CYCLE
        </span>
      </header>

      <div className="flex flex-col gap-3 px-3 py-3">
        {/* deposition point */}
        <div className="flex flex-col gap-0.5 conn-line text-[var(--ink-2)] pl-4">
          <span className="sect-label">// DEPLOY-TARGET</span>
          <div className="flex flex-wrap items-baseline gap-x-2">
            <span className="font-display text-lg leading-none text-[var(--ink)]">
              {group.point.name}
            </span>
            <span className="font-mono-tech text-[10px] tracking-[0.16em] text-[var(--mute)]">
              [ {group.point.region} ]
            </span>
          </div>
        </div>

        {/* lock options */}
        <LockOptionView primaryLock={primaryLock} otherLocks={otherLocks} />

        {/* hits */}
        <div className="flex flex-col gap-1">
          <div className="flex items-baseline gap-2">
            <span className="sect-label">// COVERAGE</span>
            <span className="font-mono-tech text-[10px] tracking-[0.16em] text-[var(--ink-2)]">
              {String(group.hits.length).padStart(2, "0")} ITEM
              {group.hits.length === 1 ? "" : "S"}
            </span>
          </div>
          <ul className="flex flex-col gap-px">
            {group.hits.map((h, i) => {
              const w = weaponById.get(h.weaponId);
              return (
                <li
                  key={h.weaponId}
                  className="reveal flex items-center justify-between border-b border-dashed border-line px-1 py-1.5"
                  style={{ animationDelay: `${i * 25}ms` }}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    {w?.imageUrl && (
                      <img
                        src={w.imageUrl}
                        alt=""
                        loading="lazy"
                        referrerPolicy="no-referrer"
                        className="h-6 w-6 shrink-0 object-contain"
                      />
                    )}
                    <span className="font-display text-sm text-[var(--ink)] truncate">
                      {w?.name ?? h.weaponId}
                    </span>
                  </div>
                  <span className="font-mono-tech text-[10.5px] tracking-[0.06em] tabular-nums whitespace-nowrap">
                    <span className="text-[var(--orange-soft)]">{formatProb(h.prob)}</span>
                    <span className="text-[var(--mute)] ml-1.5">{expectedDrops(h.prob)}</span>
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </article>
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
    <div className="flex flex-col gap-1.5 conn-line text-[var(--ink-2)] pl-4">
      <span className="sect-label">// LOCK-CONFIG</span>
      <LockBlock lock={primaryLock} />
      {otherLocks.length > 0 && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="self-start font-mono-tech text-[10px] tracking-[0.18em] text-[var(--mute)] hover:text-[var(--orange)] transition-colors"
        >
          {expanded ? "▾" : "▸"} 其他锁定方案 [{String(otherLocks.length).padStart(2, "0")}]
        </button>
      )}
      {expanded && otherLocks.length > 0 && (
        <ul className="flex flex-col gap-1 border-l border-dashed border-[var(--mute-2)] pl-2.5">
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
    <div className={`flex flex-wrap items-center gap-x-2 gap-y-1 ${compact ? "opacity-80" : ""}`}>
      <span className="font-mono-tech text-[10px] tracking-[0.18em] text-[var(--mute)]">
        BASE×3
      </span>
      <div className="flex flex-wrap gap-1">
        {lock.lockedBases.map((b) => (
          <span
            key={b}
            className="inline-flex items-center border border-[#3a534f] px-1 h-[16px] text-[9.5px] font-mono-tech tracking-[0.06em] text-[var(--teal)]"
          >
            {b}
          </span>
        ))}
      </div>
      <span className="font-mono-tech text-[10px] tracking-[0.18em] text-[var(--mute)] ml-1">
        {lock.lockedAttr.kind === "add" ? "ADD×1" : "SKILL×1"}
      </span>
      <span
        className={`inline-flex items-center border px-1 h-[16px] text-[9.5px] font-mono-tech tracking-[0.06em] ${
          lock.lockedAttr.kind === "add"
            ? "border-[#4f4d28] text-[var(--acid)]"
            : "border-orange text-[var(--orange)]"
        }`}
      >
        {lock.lockedAttr.name}
      </span>
    </div>
  );
}
