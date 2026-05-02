"use client";

import { useMemo, useState } from "react";
import { WeaponPicker } from "@/components/WeaponPicker";
import { SelectedWeapons } from "@/components/SelectedWeapons";
import { ResultPanel } from "@/components/ResultPanel";
import { SectionLabel } from "@/components/SectionLabel";
import { useRuntimeData } from "@/data/runtime";
import { optimizeGrouped, uncoveredWeaponsByGroup } from "@/lib/optimizer";

export default function Home() {
  const { weaponById, depositionPoints, source, fetchedAt } = useRuntimeData();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const selectedWeapons = useMemo(
    () =>
      [...selectedIds]
        .map((id) => weaponById.get(id))
        .filter((w): w is NonNullable<typeof w> => Boolean(w)),
    [selectedIds, weaponById],
  );

  const groups = useMemo(
    () => optimizeGrouped(selectedWeapons, depositionPoints, { topK: 5 }),
    [selectedWeapons, depositionPoints],
  );

  const uncovered = useMemo(() => {
    if (groups.length === 0) return selectedWeapons;
    return uncoveredWeaponsByGroup(selectedWeapons, groups[0]);
  }, [groups, selectedWeapons]);

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
    <div className="relative z-10 mx-auto flex w-full max-w-3xl flex-col gap-7 px-4 pt-5 pb-12">
      {/* ─── classified-document chrome ─── */}
      <header className="flex flex-col gap-2 reveal">
        <div className="flex items-center gap-2">
          <span className="ink-bar inline-flex h-[18px] items-center px-1.5 text-[10px] font-mono-tech tracking-[0.22em]">
            CLASSIFIED
          </span>
          <span className="font-mono-tech text-[10px] tracking-[0.22em] text-[var(--mute)]">
            // ENDFIELD INDUSTRIES — INTERNAL TOOL
          </span>
        </div>
        <div className="flex items-end justify-between gap-3">
          <h1 className="font-display text-[34px] leading-[0.9] tracking-[0.01em] text-[var(--ink)]">
            <span className="text-orange">SUBSTRATE</span>{" "}
            <span>FARM-OS</span>
          </h1>
          <div className="hidden sm:flex flex-col items-end font-mono-tech text-[10px] tracking-[0.16em] text-[var(--mute)]">
            <span>NO. ENDF-CALC.04</span>
            <span>RHINE LAB / ANALYSIS OS</span>
          </div>
        </div>
        <p className="font-mono-tech text-[11px] tracking-[0.06em] text-[var(--ink-2)] max-w-md">
          // 选择目标武器，本系统将基于淤积点 ×
          锁词条组合，输出最优刷取方案与等价备选。
        </p>
      </header>

      <SectionLabel
        index="01"
        title="选择武器"
        subtitle="TARGET WEAPONS"
      />
      <WeaponPicker selectedIds={selectedIds} onToggle={toggle} />

      {selectedIds.size > 0 && (
        <>
          <SectionLabel
            index="02"
            title="目标清单"
            subtitle="TARGET MANIFEST"
          />
          <SelectedWeapons
            selectedIds={selectedIds}
            onRemove={toggle}
            onClear={clear}
          />

          <SectionLabel
            index="03"
            title="刷取方案"
            subtitle="DROP-PLAN — RECOMMENDATION"
          />
          <ResultPanel groups={groups} uncovered={uncovered} />
        </>
      )}

      <footer className="mt-6 flex items-center gap-2 border-t border-line pt-3 font-mono-tech text-[9.5px] tracking-[0.22em] text-[var(--mute)]">
        <span className="stripe-warn block h-[10px] w-12" />
        <span className="text-[var(--ink-2)]">POWERED BY</span>
        <span className="font-display text-[12px] tracking-[0.04em] text-[var(--ink)]">
          ENDFIELD ANALYSIS OS
        </span>
        <span className="ml-auto">
          DATA: {source === "kv" ? "LIVE/KV" : "BAKED"}
          {fetchedAt && source === "kv"
            ? ` · ${new Date(fetchedAt).toLocaleTimeString("zh-CN")}`
            : ""}
        </span>
      </footer>
    </div>
  );
}
