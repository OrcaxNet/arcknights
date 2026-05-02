import { describe, expect, it } from "vitest";
import type { DepositionPoint, Weapon } from "@/lib/types";
import {
  optimize,
  optimizeGrouped,
  uncoveredWeapons,
} from "@/lib/optimizer";
import { ADD_ATTRS, BASE_LOCK_COUNT } from "@/data";

const W = (
  id: string,
  base: string,
  add: string,
  skill: string,
): Weapon => ({
  id,
  name: id,
  rarity: 6,
  weaponClass: "单手剑",
  ideal: { base, add, skill },
});

const P = (id: string, skillPool: string[]): DepositionPoint => ({
  id,
  name: id,
  region: "四号谷地",
  skillPool,
});

describe("optimize", () => {
  it("returns empty for no weapons", () => {
    expect(optimize([], [P("p", ["压制"])])).toEqual([]);
  });

  it("single weapon: pick the matching point and perfect-lock by skill", () => {
    const w = W("a", "力量提升", "物理伤害提升", "压制");
    const points = [P("p1", ["压制"]), P("p2", ["医疗"])];
    const [best] = optimize([w], points);
    expect(best.point.id).toBe("p1");
    expect(best.lockedBases).toContain("力量提升");
    expect(best.hits).toHaveLength(1);
    // skill pool=1 → lock skill: 1/3 * 1/8 = 1/24, lock add: 1/3 * 1/1 = 1/3
    // optimizer sorts by hits then prob, so should pick the better one (lock add)
    expect(best.totalProb).toBeCloseTo(1 / 3);
  });

  it("two weapons sharing same skill but different add: lock skill covers both", () => {
    const a = W("a", "力量提升", "物理伤害提升", "压制");
    const b = W("b", "力量提升", "灼热伤害提升", "压制");
    const point = P("p", ["压制"]);
    const [best] = optimize([a, b], [point]);
    expect(best.hits).toHaveLength(2);
    expect(best.lockedAttr.kind).toBe("skill");
    expect(best.lockedAttr.name).toBe("压制");
    expect(best.totalProb).toBeCloseTo(2 * (1 / BASE_LOCK_COUNT) * (1 / ADD_ATTRS.length));
  });

  it("when no point supports the skill: weapon yields no plan", () => {
    const w = W("a", "力量提升", "物理伤害提升", "压制");
    const points = [P("p", ["医疗"])];
    expect(optimize([w], points)).toEqual([]);
  });

  it("two weapons sharing add: lock add at single-skill point yields 1/3 each", () => {
    const a = W("a", "力量提升", "物理伤害提升", "压制");
    const b = W("b", "智识提升", "物理伤害提升", "压制");
    const points = [P("p", ["压制"])];
    const [best] = optimize([a, b], points);
    expect(best.hits).toHaveLength(2);
    expect(best.lockedAttr).toEqual({ name: "物理伤害提升", kind: "add" });
    expect(best.totalProb).toBeCloseTo(2 * (1 / 3));
  });

  it("at multi-skill point: lock add gives lower per-weapon prob than at single-skill point", () => {
    const w = W("a", "力量提升", "物理伤害提升", "压制");
    const single = P("p1", ["压制"]);
    const multi = P("p2", ["压制", "医疗", "夜幕"]);
    const [bestSingle] = optimize([w], [single]);
    const [bestMulti] = optimize([w], [multi]);
    // single-skill point gives lock-add = 1/3, multi gives 1/3 * 1/3 = 1/9
    // but optimizer picks lock-skill at multi which is 1/3 * 1/8 = 1/24
    // wait — best of (1/9, 1/24) = 1/9, so multi gives 1/9
    expect(bestSingle.totalProb).toBeCloseTo(1 / 3);
    expect(bestMulti.totalProb).toBeCloseTo(1 / 9);
  });

  it("uncoveredWeapons returns weapons not in plan", () => {
    const a = W("a", "力量提升", "物理伤害提升", "压制");
    const b = W("b", "意志提升", "电磁伤害提升", "效益");
    const points = [P("p", ["压制"])];
    const [best] = optimize([a, b], points);
    const left = uncoveredWeapons([a, b], best);
    expect(left).toHaveLength(1);
    expect(left[0].id).toBe("b");
  });

  it("respects pointFilter", () => {
    const w = W("a", "力量提升", "物理伤害提升", "压制");
    const points = [
      P("p1", ["压制"]),
      { ...P("p2", ["压制"]), region: "武陵" as const },
    ];
    const onlyWuling = optimize([w], points, {
      pointFilter: (p) => p.region === "武陵",
    });
    expect(onlyWuling[0].point.id).toBe("p2");
  });
});

describe("optimize - point attribute pool restrictions", () => {
  it("excludes weapon when its add is not in point.addPool", () => {
    const a = W("a", "力量提升", "物理伤害提升", "压制");
    const b = W("b", "力量提升", "法术伤害提升", "压制");
    // point.addPool 仅含物理伤害提升 → 法术伤害提升的武器 b 不应命中
    const point: DepositionPoint = {
      id: "p",
      name: "p",
      region: "四号谷地",
      skillPool: ["压制"],
      addPool: ["物理伤害提升"],
    };
    const [best] = optimize([a, b], [point]);
    expect(best.hits.map((h) => h.weaponId)).toEqual(["a"]);
  });

  it("excludes weapon when its base is not in point.basePool", () => {
    const a = W("a", "力量提升", "物理伤害提升", "压制");
    const b = W("b", "意志提升", "物理伤害提升", "压制");
    const point: DepositionPoint = {
      id: "p",
      name: "p",
      region: "四号谷地",
      skillPool: ["压制"],
      basePool: ["力量提升", "敏捷提升", "智识提升"],
    };
    const [best] = optimize([a, b], [point]);
    expect(best.hits.map((h) => h.weaponId)).toEqual(["a"]);
  });
});

describe("optimizeGrouped", () => {
  it("collapses multiple lock combos with same point + same hits into one group", () => {
    const a = W("a", "力量提升", "物理伤害提升", "压制");
    const b = W("b", "力量提升", "物理伤害提升", "压制");
    const point = P("p", ["压制"]);
    const groups = optimizeGrouped([a, b], [point]);
    expect(groups[0].point.id).toBe("p");
    expect(groups[0].hits).toHaveLength(2);
    expect(groups[0].lockOptions.length).toBeGreaterThan(1);
    expect(groups[0].lockOptions.some((l) => l.lockedAttr.name === "压制")).toBe(
      true,
    );
  });

  it("different point + same hits → different groups", () => {
    const a = W("a", "力量提升", "物理伤害提升", "压制");
    const points = [P("p1", ["压制"]), P("p2", ["压制"])];
    const groups = optimizeGrouped([a], points);
    const pointIds = new Set(groups.map((g) => g.point.id));
    expect(pointIds.size).toBe(2);
  });

  it("groups are sorted by hit count desc", () => {
    const a = W("a", "力量提升", "物理伤害提升", "压制");
    const b = W("b", "力量提升", "物理伤害提升", "压制");
    const c = W("c", "意志提升", "电磁伤害提升", "效益");
    const points = [P("p", ["压制", "效益"])];
    const groups = optimizeGrouped([a, b, c], points);
    expect(groups[0].hits.length).toBeGreaterThanOrEqual(2);
  });

  it("includes a no-lock plan when weapons are scattered enough that locking covers fewer", () => {
    // 5 把武器都落在同一点位池子里，但 base/add 各不相同，锁定只能覆盖 1
    const weapons = [
      W("a", "力量提升", "攻击提升", "压制"),
      W("b", "敏捷提升", "生命提升", "压制"),
      W("c", "智识提升", "物理伤害提升", "压制"),
      W("d", "意志提升", "法术伤害提升", "压制"),
      W("e", "主能力提升", "电磁伤害提升", "压制"),
    ];
    const points = [P("p", ["压制"])];
    const groups = optimizeGrouped(weapons, points, { topK: 10 });
    const noLock = groups.find((g) => g.noLock);
    expect(noLock).toBeDefined();
    expect(noLock!.hits).toHaveLength(5);
    // 每件武器单次命中: 1/5 × 1/12 × 1/1 = 1/60
    expect(noLock!.totalProb).toBeCloseTo(5 / (5 * 12 * 1));
  });
});
