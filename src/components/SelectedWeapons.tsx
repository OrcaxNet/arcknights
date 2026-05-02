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
      <div className="flex items-center gap-3">
        <span className="sect-label">// MANIFEST</span>
        <span className="font-mono-tech text-[11px] tracking-[0.18em] text-[var(--ink-2)]">
          {String(list.length).padStart(2, "0")} ITEM{list.length === 1 ? "" : "S"}
        </span>
        <span className="ml-auto" />
        {list.length > 0 && (
          <button
            type="button"
            onClick={onClear}
            className="font-mono-tech text-[10px] tracking-[0.18em] text-[var(--mute)] hover:text-[var(--orange)] transition-colors"
          >
            [ CLEAR × ]
          </button>
        )}
      </div>
      {list.length === 0 ? (
        <p className="border border-dashed border-line bg-[var(--bg-1)]/40 px-4 py-6 text-center font-mono-tech text-[11px] tracking-[0.16em] text-[var(--mute)]">
          // 选取目标武器以生成刷取建议 //
        </p>
      ) : (
        <ul className="flex flex-col gap-1">
          {list.map((w, i) => (
            <li
              key={w.id}
              className="reveal flex items-center gap-2 border border-line bg-paper-2 pl-1.5 pr-1 py-1 hover:border-[var(--line-bright)] transition-colors"
              style={{ animationDelay: `${i * 30}ms` }}
            >
              <span className="font-mono-tech text-[9.5px] tracking-[0.16em] text-[var(--mute)] w-6 text-center">
                {String(i + 1).padStart(2, "0")}
              </span>
              {w.imageUrl && (
                <img
                  src={w.imageUrl}
                  alt=""
                  loading="lazy"
                  referrerPolicy="no-referrer"
                  className="h-7 w-7 shrink-0 object-contain"
                />
              )}
              <RarityStars rarity={w.rarity} />
              <span className="font-display text-sm text-[var(--ink)]">
                {w.name}
              </span>
              <span className="hidden sm:inline font-mono-tech text-[10px] tracking-[0.06em] text-[var(--mute)]">
                {w.ideal.base} · {w.ideal.add} · {w.ideal.skill}
              </span>
              <button
                type="button"
                onClick={() => onRemove(w.id)}
                className="ml-auto h-7 w-7 inline-flex items-center justify-center text-[var(--mute)] hover:text-[var(--orange)] transition-colors"
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
