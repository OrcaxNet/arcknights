import {
  ADD_ATTRS,
  BASE_ATTRS,
  BASE_LOCK_COUNT,
} from "@/data";
import type { DepositionPoint, LockPlan, Weapon } from "@/lib/types";

function chooseK<T>(arr: readonly T[], k: number): T[][] {
  const out: T[][] = [];
  const n = arr.length;
  if (k > n || k < 0) return out;
  const indices = Array.from({ length: k }, (_, i) => i);
  while (true) {
    out.push(indices.map((i) => arr[i]));
    let i = k - 1;
    while (i >= 0 && indices[i] === n - k + i) i--;
    if (i < 0) break;
    indices[i]++;
    for (let j = i + 1; j < k; j++) indices[j] = indices[j - 1] + 1;
  }
  return out;
}

interface OptimizeOptions {
  topK?: number;
  /** Restrict candidate points (e.g. user only owns 武陵 access) */
  pointFilter?: (p: DepositionPoint) => boolean;
}

/**
 * 在每个候选淤积点上，枚举 (锁定基础 3 个) × (锁 1 个附加 或 1 个该点位支持的技能)，
 * 计算每个武器的命中概率，并按总命中率（= 期望产出件数 / 单次刷取）排序返回。
 *
 * 概率模型（与玩家描述一致，pre-engrave 模式）：
 *   - 基础：在锁定的 3 个里均匀随机出 1 个 → 1/3
 *   - 锁住的那 1 个附加/技能：必出
 *   - 另一槽位（附加或技能中未锁住的那一类）：在该类总池中均匀随机
 *     - 附加未锁 → 1/8（附加池大小）
 *     - 技能未锁 → 1/|P.skillPool|（点位的技能池大小，决定该点位的技能采样范围）
 *
 * 单武器在 (P, B, X) 下命中：
 *   - 必要条件：a_W ∈ B, c_W ∈ P.skillPool
 *   - 若锁附加 X：还需 X = b_W；命中概率 = 1/3 × 1/|P.skillPool|
 *   - 若锁技能 X：还需 X = c_W（X ∈ P.skillPool）；命中概率 = 1/3 × 1/|ADD_POOL|
 */
export function optimize(
  weapons: Weapon[],
  points: DepositionPoint[],
  opts: OptimizeOptions = {},
): LockPlan[] {
  const { topK = 5, pointFilter } = opts;
  if (weapons.length === 0) return [];

  const filteredPoints = pointFilter ? points.filter(pointFilter) : points;
  const baseCombos = chooseK(BASE_ATTRS, BASE_LOCK_COUNT);
  const addPoolSize = ADD_ATTRS.length;

  const plans: LockPlan[] = [];

  for (const point of filteredPoints) {
    if (point.skillPool.length === 0) continue;
    const skillPoolSize = point.skillPool.length;
    const lockables: { name: string; kind: "add" | "skill" }[] = [
      ...ADD_ATTRS.map((a) => ({ name: a, kind: "add" as const })),
      ...point.skillPool.map((s) => ({ name: s, kind: "skill" as const })),
    ];

    for (const baseCombo of baseCombos) {
      const baseSet = new Set<string>(baseCombo);
      for (const lock of lockables) {
        const hits: { weaponId: string; prob: number }[] = [];
        let totalProb = 0;
        for (const w of weapons) {
          if (!baseSet.has(w.ideal.base)) continue;
          if (!point.skillPool.includes(w.ideal.skill)) continue;
          let probUnlocked = 0;
          if (lock.kind === "add") {
            if (lock.name !== w.ideal.add) continue;
            probUnlocked = 1 / skillPoolSize;
          } else {
            if (lock.name !== w.ideal.skill) continue;
            probUnlocked = 1 / addPoolSize;
          }
          const p = (1 / BASE_LOCK_COUNT) * probUnlocked;
          hits.push({ weaponId: w.id, prob: p });
          totalProb += p;
        }
        if (hits.length === 0) continue;
        plans.push({
          point,
          lockedBases: [...baseCombo],
          lockedAttr: lock,
          hits,
          totalProb,
        });
      }
    }
  }

  plans.sort((a, b) => {
    if (b.hits.length !== a.hits.length) return b.hits.length - a.hits.length;
    return b.totalProb - a.totalProb;
  });

  return plans.slice(0, topK);
}

export function uncoveredWeapons(weapons: Weapon[], plan: LockPlan): Weapon[] {
  const covered = new Set(plan.hits.map((h) => h.weaponId));
  return weapons.filter((w) => !covered.has(w.id));
}
