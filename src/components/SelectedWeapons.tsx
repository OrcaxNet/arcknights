"use client";

import { useWeaponById } from "@/data/runtime";
import { RarityStars } from "./RarityStars";

interface Props {
  selectedIds: Set<string>;
  onRemove: (id: string) => void;
  onClear: () => void;
}

export function SelectedWeapons({ selectedIds, onRemove, onClear }: Props) {
  const weaponById = useWeaponById();
  const list = [...selectedIds]
    .map((id) => weaponById.get(id))
    .filter((w): w is NonNullable<typeof w> => Boolean(w));

  return (
    <section className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-zinc-300">
          已选 {list.length} 件
        </h3>
        {list.length > 0 && (
          <button
            type="button"
            onClick={onClear}
            className="text-xs text-zinc-500 hover:text-zinc-300"
          >
            清空
          </button>
        )}
      </div>
      {list.length === 0 ? (
        <p className="rounded-lg border border-dashed border-zinc-800 px-4 py-6 text-center text-sm text-zinc-500">
          先选几把武器，然后下方会出现刷取建议
        </p>
      ) : (
        <ul className="flex flex-col gap-1.5">
          {list.map((w) => (
            <li
              key={w.id}
              className="flex items-center gap-2 rounded-md border border-zinc-800 bg-zinc-900/50 px-2 py-1.5 text-sm"
            >
              <RarityStars rarity={w.rarity} />
              <span className="font-medium text-zinc-100">{w.name}</span>
              <span className="text-[11px] text-zinc-500">
                {w.ideal.base}·{w.ideal.add}·{w.ideal.skill}
              </span>
              <button
                type="button"
                onClick={() => onRemove(w.id)}
                className="ml-auto text-zinc-500 hover:text-rose-400"
                aria-label="移除"
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
