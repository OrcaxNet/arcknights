"use client";

import { useMemo, useState } from "react";
import { useRuntimeData } from "@/data/runtime";
import type { Rarity, Weapon, WeaponClass } from "@/lib/types";
import { RarityStars } from "./RarityStars";

const CLASSES: WeaponClass[] = [
  "单手剑",
  "双手剑",
  "长柄",
  "手铳",
  "施术单元",
];
const RARITIES: Rarity[] = [6, 5, 4];

interface Props {
  selectedIds: Set<string>;
  onToggle: (id: string) => void;
}

export function WeaponPicker({ selectedIds, onToggle }: Props) {
  const { weapons } = useRuntimeData();
  const [classFilter, setClassFilter] = useState<WeaponClass | "all">("all");
  const [rarityFilter, setRarityFilter] = useState<Rarity | "all">("all");
  const [query, setQuery] = useState("");

  const list = useMemo(() => {
    return weapons.filter((w) => {
      if (classFilter !== "all" && w.weaponClass !== classFilter) return false;
      if (rarityFilter !== "all" && w.rarity !== rarityFilter) return false;
      if (query && !w.name.includes(query) && !w.operator?.includes(query)) {
        return false;
      }
      return true;
    });
  }, [weapons, classFilter, rarityFilter, query]);

  return (
    <section className="flex flex-col gap-3">
      <div className="flex flex-col gap-2">
        <input
          type="search"
          placeholder="搜索武器/干员"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus:border-amber-400 focus:outline-none"
        />
        <div className="flex gap-2 overflow-x-auto pb-1">
          <FilterPill
            active={rarityFilter === "all"}
            onClick={() => setRarityFilter("all")}
            label="全部稀有度"
          />
          {RARITIES.map((r) => (
            <FilterPill
              key={r}
              active={rarityFilter === r}
              onClick={() => setRarityFilter(r)}
              label={`${r}★`}
            />
          ))}
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1">
          <FilterPill
            active={classFilter === "all"}
            onClick={() => setClassFilter("all")}
            label="全部类型"
          />
          {CLASSES.map((c) => (
            <FilterPill
              key={c}
              active={classFilter === c}
              onClick={() => setClassFilter(c)}
              label={c}
            />
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
        {list.map((w) => (
          <WeaponCard
            key={w.id}
            weapon={w}
            selected={selectedIds.has(w.id)}
            onClick={() => onToggle(w.id)}
          />
        ))}
        {list.length === 0 && (
          <div className="col-span-full py-12 text-center text-sm text-zinc-500">
            没有匹配的武器
          </div>
        )}
      </div>
    </section>
  );
}

function FilterPill({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`shrink-0 rounded-full border px-3 py-1 text-xs transition-colors ${
        active
          ? "border-amber-400 bg-amber-400/10 text-amber-300"
          : "border-zinc-700 text-zinc-400 hover:border-zinc-500"
      }`}
    >
      {label}
    </button>
  );
}

function WeaponCard({
  weapon,
  selected,
  onClick,
}: {
  weapon: Weapon;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex flex-col items-start gap-1 rounded-lg border p-2 text-left transition-colors active:scale-[0.98] ${
        selected
          ? "border-amber-400 bg-amber-400/10"
          : "border-zinc-800 bg-zinc-900 hover:border-zinc-600"
      }`}
    >
      <div className="flex w-full items-center justify-between">
        <RarityStars rarity={weapon.rarity} />
        {selected && (
          <span className="text-xs text-amber-400">✓</span>
        )}
      </div>
      <div className="font-medium text-zinc-100 text-sm leading-tight">
        {weapon.name}
      </div>
      <div className="text-[11px] text-zinc-500">
        {weapon.weaponClass}
        {weapon.operator ? ` · ${weapon.operator}` : ""}
      </div>
      <div className="mt-1 flex flex-wrap gap-1 text-[10px]">
        <Tag color="base">{weapon.ideal.base}</Tag>
        <Tag color="add">{weapon.ideal.add}</Tag>
        <Tag color="skill">{weapon.ideal.skill}</Tag>
      </div>
    </button>
  );
}

function Tag({
  color,
  children,
}: {
  color: "base" | "add" | "skill";
  children: React.ReactNode;
}) {
  const cls =
    color === "base"
      ? "bg-sky-500/20 text-sky-300"
      : color === "add"
      ? "bg-emerald-500/20 text-emerald-300"
      : "bg-fuchsia-500/20 text-fuchsia-300";
  return (
    <span className={`rounded px-1.5 py-0.5 ${cls}`}>{children}</span>
  );
}
