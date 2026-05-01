"use client";

import { useMemo, useState } from "react";
import { WeaponPicker } from "@/components/WeaponPicker";
import { SelectedWeapons } from "@/components/SelectedWeapons";
import { ResultPanel } from "@/components/ResultPanel";
import { WEAPON_BY_ID } from "@/data/weapons";
import { DEPOSITION_POINTS } from "@/data/depositionPoints";
import { optimize, uncoveredWeapons } from "@/lib/optimizer";

export default function Home() {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const selectedWeapons = useMemo(
    () =>
      [...selectedIds]
        .map((id) => WEAPON_BY_ID.get(id))
        .filter((w): w is NonNullable<typeof w> => Boolean(w)),
    [selectedIds],
  );

  const plans = useMemo(
    () => optimize(selectedWeapons, DEPOSITION_POINTS, { topK: 5 }),
    [selectedWeapons],
  );

  const uncovered = useMemo(() => {
    if (plans.length === 0) return selectedWeapons;
    return uncoveredWeapons(selectedWeapons, plans[0]);
  }, [plans, selectedWeapons]);

  function toggle(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function clear() {
    setSelectedIds(new Set());
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-6 text-zinc-100">
      <header className="flex flex-col gap-1">
        <h1 className="text-xl font-bold">终末地·基质刷取计算器</h1>
        <p className="text-xs text-zinc-500">
          选中你想刷的武器，工具会推荐最优的能量淤积点 + 锁词条方案。
        </p>
      </header>

      <WeaponPicker selectedIds={selectedIds} onToggle={toggle} />

      {selectedIds.size > 0 && (
        <>
          <SelectedWeapons
            selectedIds={selectedIds}
            onRemove={toggle}
            onClear={clear}
          />
          <ResultPanel plans={plans} uncovered={uncovered} />
        </>
      )}

      <footer className="mt-8 border-t border-zinc-900 pt-4 text-[10px] text-zinc-600">
        数据来源：森空岛官方 wiki。淤积点支持的技能词条池仅供参考，需要根据实际游玩补全。
      </footer>
    </div>
  );
}
