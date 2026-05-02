"use client";

import { useMemo, useState } from "react";
import { WeaponPicker } from "@/components/WeaponPicker";
import { SelectedWeapons } from "@/components/SelectedWeapons";
import { PrimaryPlan, AlternativePlans } from "@/components/ResultPanel";
import { SectionLabel } from "@/components/SectionLabel";
import { PagedView } from "@/components/PagedView";
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

  const [primaryGroup, ...altGroups] = groups;

  const uncovered = useMemo(() => {
    if (!primaryGroup) return selectedWeapons;
    return uncoveredWeaponsByGroup(selectedWeapons, primaryGroup);
  }, [primaryGroup, selectedWeapons]);

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

  const hasSelection = selectedIds.size > 0;

  // Page 1：目标清单 + 武器筛选
  const page1 = (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-3">
        <SectionLabel
          index="01"
          title="目标清单"
          subtitle="TARGET MANIFEST"
        />
        <SelectedWeapons
          selectedIds={selectedIds}
          onRemove={toggle}
          onClear={clear}
        />
      </div>

      <div className="flex flex-col gap-3">
        <SectionLabel
          index="02"
          title="选择武器"
          subtitle="WEAPON CATALOG"
        />
        <WeaponPicker selectedIds={selectedIds} onToggle={toggle} />
      </div>
    </div>
  );

  // Page 2：刷取方案 + 备选方案
  const page2 = (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-3">
        <SectionLabel
          index="03"
          title="刷取方案"
          subtitle="DROP-PLAN — RECOMMENDATION"
        />
        <PrimaryPlan group={primaryGroup ?? null} uncovered={uncovered} />
      </div>

      <div className="flex flex-col gap-3">
        <SectionLabel
          index="04"
          title="备选方案"
          subtitle={`ALT-PLANS · ${String(altGroups.length).padStart(2, "0")}`}
        />
        <AlternativePlans groups={altGroups} />
      </div>
    </div>
  );

  return (
    <div className="relative z-10 mx-auto flex w-full max-w-3xl flex-col gap-5 px-4 pt-5 pb-12">
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
      </header>

      <PagedView
        pageTitles={["TARGETS", "DROP-PLAN"]}
        enablePage2={hasSelection && groups.length > 0}
        pages={[page1, page2]}
      />

      <footer className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 border-t border-line pt-3 font-mono-tech text-[9.5px] tracking-[0.22em] text-[var(--mute)]">
        <span className="stripe-warn block h-[10px] w-12" />
        <span className="text-[var(--ink-2)]">POWERED BY</span>
        <span className="font-display text-[12px] tracking-[0.04em] text-[var(--ink)]">
          ENDFIELD ANALYSIS OS
        </span>
        <a
          href="/admin/"
          className="ml-2 text-[var(--mute)] hover:text-[var(--orange)] transition-colors"
        >
          [ OPS ]
        </a>
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
