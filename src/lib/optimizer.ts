import {
  ADD_ATTRS,
  BASE_ATTRS,
  BASE_LOCK_COUNT,
} from "@/data";
import type {
  DepositionPoint,
  LockPlan,
  PlanGroup,
  Weapon,
} from "@/lib/types";

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

  const plans: LockPlan[] = [];

  for (const point of filteredPoints) {
    if (point.skillPool.length === 0) continue;
    // 实际作用于这个点位的 base/add 池：未声明则用全集
    const pointBaseList = point.basePool ?? BASE_ATTRS;
    const pointAddList = point.addPool ?? ADD_ATTRS;
    if (pointBaseList.length < BASE_LOCK_COUNT) continue;

    const skillPoolSize = point.skillPool.length;
    const addPoolSize = pointAddList.length;

    const baseCombos = chooseK(pointBaseList, BASE_LOCK_COUNT);
    const lockables: { name: string; kind: "add" | "skill" }[] = [
      ...pointAddList.map((a) => ({ name: a, kind: "add" as const })),
      ...point.skillPool.map((s) => ({ name: s, kind: "skill" as const })),
    ];

    for (const baseCombo of baseCombos) {
      const baseSet = new Set<string>(baseCombo);
      for (const lock of lockables) {
        const hits: { weaponId: string; prob: number }[] = [];
        let totalProb = 0;
        for (const w of weapons) {
          // 武器自身的词条必须落在该点位的池里，否则永远不可能命中
          if (!baseSet.has(w.ideal.base)) continue;
          if (!point.skillPool.includes(w.ideal.skill)) continue;
          if (!pointAddList.includes(w.ideal.add)) continue;

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

/**
 * 不锁词条时该淤积点能命中的武器（基质 3 槽完全随机）。
 * 命中概率 = 1/|basePool| × 1/|addPool| × 1/|skillPool|，每件武器独立。
 * 当用户选的武器在词条层面非常分散（无明显共同点）但都落在该 point 的 3 池里时，
 * "不锁定但覆盖全部"可能比"锁定只覆盖一两件"总产出更高。
 */
function unlockedPlanForPoint(
  point: DepositionPoint,
  weapons: Weapon[],
): PlanGroup | null {
  const basePool = point.basePool ?? BASE_ATTRS;
  const addPool = point.addPool ?? ADD_ATTRS;
  const skillPool = point.skillPool;
  if (basePool.length === 0 || addPool.length === 0 || skillPool.length === 0) {
    return null;
  }
  const perDrop =
    (1 / basePool.length) * (1 / addPool.length) * (1 / skillPool.length);
  const hits: { weaponId: string; prob: number }[] = [];
  for (const w of weapons) {
    if (!basePool.includes(w.ideal.base)) continue;
    if (!addPool.includes(w.ideal.add)) continue;
    if (!skillPool.includes(w.ideal.skill)) continue;
    hits.push({ weaponId: w.id, prob: perDrop });
  }
  if (hits.length === 0) return null;
  return {
    point,
    hits,
    totalProb: perDrop * hits.length,
    lockOptions: [],
    noLock: true,
  };
}

/**
 * 在 optimize 结果之上按 (淤积点, 命中武器集合) 聚合。
 * 同一聚合下的所有 (B, X) 都进入 lockOptions，UI 选一项作为主推、其余作为备选展示。
 * 同时为每个候选点位生成"不锁定"方案，参与同一排序。
 */
export function optimizeGrouped(
  weapons: Weapon[],
  points: DepositionPoint[],
  opts: OptimizeOptions = {},
): PlanGroup[] {
  const { topK = 5, pointFilter } = opts;
  if (weapons.length === 0) return [];
  const filteredPoints = pointFilter ? points.filter(pointFilter) : points;

  const allPlans = optimize(weapons, points, {
    pointFilter,
    topK: Number.MAX_SAFE_INTEGER,
  });

  const groupMap = new Map<string, PlanGroup>();
  for (const plan of allPlans) {
    const hitKey = plan.hits
      .map((h) => h.weaponId)
      .sort()
      .join(",");
    const key = `${plan.point.id}|locked|${hitKey}`;
    let group = groupMap.get(key);
    if (!group) {
      group = {
        point: plan.point,
        hits: plan.hits.slice(),
        totalProb: plan.totalProb,
        lockOptions: [],
      };
      groupMap.set(key, group);
    }
    group.lockOptions.push({
      lockedBases: plan.lockedBases,
      lockedAttr: plan.lockedAttr,
    });
  }

  // 不锁定候选：每个点位至多一条
  for (const point of filteredPoints) {
    const unlocked = unlockedPlanForPoint(point, weapons);
    if (!unlocked) continue;
    const hitKey = unlocked.hits
      .map((h) => h.weaponId)
      .sort()
      .join(",");
    groupMap.set(`${point.id}|nolock|${hitKey}`, unlocked);
  }

  const groups = [...groupMap.values()].sort((a, b) => {
    // 主排序：期望产出（覆盖×单件概率）从高到低
    if (b.totalProb !== a.totalProb) return b.totalProb - a.totalProb;
    // 同期望：覆盖件数多的在前
    return b.hits.length - a.hits.length;
  });

  for (const g of groups) {
    g.lockOptions.sort((a, b) => {
      if (a.lockedAttr.kind !== b.lockedAttr.kind) {
        return a.lockedAttr.kind === "skill" ? -1 : 1;
      }
      return a.lockedAttr.name.localeCompare(b.lockedAttr.name, "zh");
    });
  }

  return groups.slice(0, topK);
}

export function uncoveredWeaponsByGroup(
  weapons: Weapon[],
  group: PlanGroup,
): Weapon[] {
  const covered = new Set(group.hits.map((h) => h.weaponId));
  return weapons.filter((w) => !covered.has(w.id));
}

export function uncoveredWeapons(weapons: Weapon[], plan: LockPlan): Weapon[] {
  const covered = new Set(plan.hits.map((h) => h.weaponId));
  return weapons.filter((w) => !covered.has(w.id));
}
