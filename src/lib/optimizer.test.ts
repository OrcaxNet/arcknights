import { describe, expect, it } from "vitest";
import type { DepositionPoint, Weapon } from "@/lib/types";
import { optimize, uncoveredWeapons } from "@/lib/optimizer";
import { ADD_ATTRS, BASE_LOCK_COUNT } from "@/data/attributes";

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
