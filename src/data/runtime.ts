"use client";

import { useEffect, useMemo, useState } from "react";
import { BUNDLED } from "./index";
import {
  DataBundleSchema,
  validateBundle,
  type DataBundle,
  type Weapon,
  type DepositionPoint,
} from "./schema";

interface RuntimeData {
  weapons: Weapon[];
  weaponById: Map<string, Weapon>;
  depositionPoints: DepositionPoint[];
  source: "bundled" | "kv";
  fetchedAt?: number;
}

const initial: RuntimeData = {
  weapons: BUNDLED.weapons,
  weaponById: new Map(BUNDLED.weapons.map((w) => [w.id, w])),
  depositionPoints: BUNDLED.depositionPoints,
  source: "bundled",
};

export function useRuntimeData(): RuntimeData {
  const [data, setData] = useState<RuntimeData>(initial);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/bundle", { cache: "no-cache" });
        if (!res.ok) return;
        const text = await res.text();
        if (!text || text === "null") return;
        const parsed = DataBundleSchema.parse(JSON.parse(text));
        validateBundle(parsed);
        if (cancelled) return;
        setData({
          weapons: parsed.weapons,
          weaponById: new Map(parsed.weapons.map((w) => [w.id, w])),
          depositionPoints: parsed.depositionPoints,
          source: "kv",
          fetchedAt: Date.now(),
        });
      } catch (err) {
        // 拉取失败时静默回退到 bundled，保持页面可用
        console.warn("[runtime data] fetch failed, using bundled:", err);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return data;
}

export function useWeaponById(): Map<string, Weapon> {
  return useRuntimeData().weaponById;
}
