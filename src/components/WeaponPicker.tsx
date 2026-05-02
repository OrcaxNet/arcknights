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
      <div className="flex flex-col gap-2.5">
        <label className="relative block">
          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 font-mono-tech text-[10px] tracking-[0.22em] text-[var(--mute)] pointer-events-none">
            QUERY //
          </span>
          <input
            type="search"
            placeholder="搜索武器 / 干员"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full bg-paper-2 border border-line focus:border-orange focus:outline-none focus:ring-1 focus:ring-[var(--orange-glow)] py-2 pl-[72px] pr-3 text-sm text-[var(--ink)] placeholder:text-[var(--mute)] transition-colors"
          />
        </label>
        <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1">
          <FilterPill
            active={rarityFilter === "all"}
            onClick={() => setRarityFilter("all")}
            label="ALL"
          />
          {RARITIES.map((r) => (
            <FilterPill
              key={r}
              active={rarityFilter === r}
              onClick={() => setRarityFilter(r)}
              label={`R/${r}`}
            />
          ))}
          <span className="mx-1 my-auto h-3 w-px bg-[var(--line-bright)]" />
          <FilterPill
            active={classFilter === "all"}
            onClick={() => setClassFilter("all")}
            label="所有类型"
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
        {list.map((w, i) => (
          <WeaponCard
            key={w.id}
            weapon={w}
            selected={selectedIds.has(w.id)}
            onClick={() => onToggle(w.id)}
            indexLabel={String(i + 1).padStart(3, "0")}
          />
        ))}
        {list.length === 0 && (
          <div className="col-span-full py-12 text-center sect-label">
            // NO MATCH —
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
      className={`shrink-0 border px-2.5 h-7 inline-flex items-center text-[10px] font-mono-tech tracking-[0.16em] uppercase transition-colors ${
        active
          ? "border-orange bg-[var(--orange)] text-[var(--bg)]"
          : "border-line text-[var(--ink-2)] hover:border-[var(--line-bright)] hover:text-[var(--ink)]"
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
  indexLabel,
}: {
  weapon: Weapon;
  selected: boolean;
  onClick: () => void;
  indexLabel: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      data-selected={selected || undefined}
      className={`group hover-sweep frame-corners ${
        selected ? "is-accent" : ""
      } relative flex flex-col items-start gap-1 overflow-hidden border bg-paper-2 px-2 py-2 text-left transition-colors active:scale-[0.985]
      ${
        selected
          ? "border-orange"
          : "border-line hover:border-[var(--line-bright)]"
      }`}
    >
      {/* image bg, half-tone-ish via opacity + grayscale on idle */}
      {weapon.imageUrl && (
        <img
          src={weapon.imageUrl}
          alt=""
          loading="lazy"
          referrerPolicy="no-referrer"
          className={`pointer-events-none absolute -right-3 top-0 h-24 w-24 object-contain transition-all duration-300 ${
            selected
              ? "opacity-50"
              : "opacity-30 grayscale group-hover:opacity-45 group-hover:grayscale-0"
          }`}
        />
      )}

      {/* top row: index + rarity */}
      <div className="relative z-10 flex w-full items-center justify-between">
        <span className="font-mono-tech text-[9px] tracking-[0.18em] text-[var(--mute)]">
          NO.{indexLabel}
        </span>
        <RarityStars rarity={weapon.rarity} />
      </div>

      {/* name */}
      <div className="relative z-10 mt-0.5 font-display text-base leading-none text-[var(--ink)]">
        {weapon.name}
      </div>

      {/* sub */}
      <div className="relative z-10 font-mono-tech text-[10px] tracking-[0.12em] text-[var(--mute)]">
        {weapon.weaponClass}
        {weapon.operator ? ` · ${weapon.operator}` : ""}
      </div>

      {/* attribute chips */}
      <div className="relative z-10 mt-1 flex flex-wrap gap-1">
        <Tag kind="base">{weapon.ideal.base}</Tag>
        <Tag kind="add">{weapon.ideal.add}</Tag>
        <Tag kind="skill">{weapon.ideal.skill}</Tag>
      </div>

      {/* selected indicator */}
      {selected && (
        <span className="absolute right-1.5 top-1.5 z-10 h-1.5 w-1.5 bg-orange shadow-[0_0_8px_var(--orange)]" />
      )}
    </button>
  );
}

function Tag({
  kind,
  children,
}: {
  kind: "base" | "add" | "skill";
  children: React.ReactNode;
}) {
  const tone =
    kind === "base"
      ? "border-[#3a534f] text-[var(--teal)]"
      : kind === "add"
      ? "border-[#4f4d28] text-[var(--acid)]"
      : "border-[#5e3a14] text-[var(--orange-soft)]";
  return (
    <span
      className={`inline-flex items-center border px-1 h-[16px] text-[9.5px] font-mono-tech tracking-[0.06em] ${tone}`}
    >
      {children}
    </span>
  );
}
