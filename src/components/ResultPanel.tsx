"use client";

import { useWeaponById } from "@/data/runtime";
import type { LockPlan, Weapon } from "@/lib/types";

interface Props {
  plans: LockPlan[];
  uncovered: Weapon[];
}

function formatProb(p: number) {
  if (p === 0) return "0";
  if (p >= 0.01) return `${(p * 100).toFixed(2)}%`;
  return `1/${Math.round(1 / p)}`;
}

function expectedDrops(p: number) {
  if (p === 0) return "—";
  return `≈ ${Math.ceil(1 / p)} 次刷取/件`;
}

export function ResultPanel({ plans, uncovered }: Props) {
  const weaponById = useWeaponById();
  if (plans.length === 0) {
    return (
      <section className="rounded-lg border border-zinc-800 bg-zinc-900/50 px-4 py-6 text-center text-sm text-zinc-400">
        所选武器在数据库内的淤积点都不支持，无可行方案。
        <br />
        可能数据库需要补充淤积点的技能词条池。
      </section>
    );
  }

  const [best, ...alternatives] = plans;

  return renderPanel({ best, alternatives, uncovered, weaponById });
}

function renderPanel({
  best,
  alternatives,
  uncovered,
  weaponById,
}: {
  best: LockPlan;
  alternatives: LockPlan[];
  uncovered: Weapon[];
  weaponById: Map<string, Weapon>;
}) {
  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-sm font-semibold text-amber-300">推荐方案</h2>
      <PlanCard plan={best} primary weaponById={weaponById} />

      {uncovered.length > 0 && (
        <div className="rounded-md border border-rose-900/50 bg-rose-950/30 px-3 py-2 text-xs text-rose-300">
          有 {uncovered.length} 件武器没有命中：
          <span className="ml-1">
            {uncovered
              .map((w) => w.name)
              .join("、")}
          </span>
          <span className="ml-1 text-rose-400/70">
            （考虑分批，或更换淤积点）
          </span>
        </div>
      )}

      {alternatives.length > 0 && (
        <details className="rounded-lg border border-zinc-800 bg-zinc-900/50">
          <summary className="cursor-pointer px-3 py-2 text-xs text-zinc-400">
            备选方案（{alternatives.length}）
          </summary>
          <div className="flex flex-col gap-2 px-3 py-2">
            {alternatives.map((p, i) => (
              <PlanCard key={i} plan={p} weaponById={weaponById} />
            ))}
          </div>
        </details>
      )}
    </section>
  );
}

function PlanCard({
  plan,
  primary,
  weaponById,
}: {
  plan: LockPlan;
  primary?: boolean;
  weaponById: Map<string, Weapon>;
}) {
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
        <span className="font-semibold text-zinc-100">{plan.point.name}</span>
        <span className="text-[11px] text-zinc-500">
          ({plan.point.region})
        </span>
      </div>

      <div className="flex flex-col gap-1">
        <div className="text-[11px] text-zinc-500">锁定基础属性</div>
        <div className="flex flex-wrap gap-1">
          {plan.lockedBases.map((b) => (
            <span
              key={b}
              className="rounded bg-sky-500/20 px-1.5 py-0.5 text-xs text-sky-300"
            >
              {b}
            </span>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <div className="text-[11px] text-zinc-500">
          锁定 {plan.lockedAttr.kind === "add" ? "附加属性" : "技能属性"}
        </div>
        <span
          className={`self-start rounded px-1.5 py-0.5 text-xs ${
            plan.lockedAttr.kind === "add"
              ? "bg-emerald-500/20 text-emerald-300"
              : "bg-fuchsia-500/20 text-fuchsia-300"
          }`}
        >
          {plan.lockedAttr.name}
        </span>
      </div>

      <div className="flex flex-col gap-1">
        <div className="text-[11px] text-zinc-500">
          覆盖 {plan.hits.length} 件武器
          <span className="ml-2 text-amber-300">
            期望产出 {plan.totalProb.toFixed(3)} 件/次
          </span>
        </div>
        <ul className="flex flex-col gap-0.5 text-xs">
          {plan.hits.map((h) => {
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
