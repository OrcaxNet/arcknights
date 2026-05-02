"use client";

import {
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

interface Props {
  /** 各 page 的标题（用于指示器/编号） */
  pageTitles: [string, string];
  /** 第二页是否启用（disabled 时不可滑动到，且滑动指引不显示） */
  enablePage2: boolean;
  pages: [ReactNode, ReactNode];
}

export function PagedView({ pageTitles, enablePage2, pages }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);

  // 监听滚动位置 → 高亮 dot
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const idx = Math.round(el.scrollLeft / el.clientWidth);
        setActive(idx);
      });
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      el.removeEventListener("scroll", onScroll);
    };
  }, []);

  // page2 关闭后强制回到 page 1
  useEffect(() => {
    if (!enablePage2 && ref.current) {
      ref.current.scrollTo({ left: 0, behavior: "smooth" });
    }
  }, [enablePage2]);

  function go(idx: number) {
    const el = ref.current;
    if (!el) return;
    if (idx === 1 && !enablePage2) return;
    el.scrollTo({ left: idx * el.clientWidth, behavior: "smooth" });
  }

  return (
    <div className="flex flex-col gap-3">
      {/* 顶部页码 + 切换按钮 */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5">
          {[0, 1].map((i) => (
            <button
              key={i}
              type="button"
              onClick={() => go(i)}
              disabled={i === 1 && !enablePage2}
              aria-label={`切换到第 ${i + 1} 页`}
              className={`group inline-flex items-center gap-1.5 px-1.5 h-6 border transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
                active === i
                  ? "border-orange bg-[var(--orange)] text-[var(--bg)]"
                  : "border-line text-[var(--ink-2)] hover:border-[var(--line-bright)]"
              }`}
            >
              <span className="font-mono-tech text-[10px] tracking-[0.18em]">
                P/{String(i + 1).padStart(2, "0")}
              </span>
              <span className="hidden sm:inline font-display text-[11px] tracking-[0.04em]">
                {pageTitles[i]}
              </span>
            </button>
          ))}
        </div>
        <span className="h-px flex-1 bg-[var(--line)]" />
        {enablePage2 && active === 0 && (
          <button
            type="button"
            onClick={() => go(1)}
            className="hint-pulse inline-flex items-center gap-1.5 px-2 h-6 bg-[var(--orange)] text-[var(--bg)] font-mono-tech text-[10px] tracking-[0.2em] hover:bg-[var(--orange-soft)] transition-colors"
          >
            DROP-PLAN
            <span className="text-base leading-none">→</span>
          </button>
        )}
        {active === 1 && (
          <button
            type="button"
            onClick={() => go(0)}
            className="inline-flex items-center gap-1 font-mono-tech text-[10px] tracking-[0.2em] text-[var(--ink-2)] hover:text-[var(--ink)] transition-colors"
          >
            <span className="text-base leading-none">←</span>
            TARGETS
          </button>
        )}
      </div>

      {/* 两个 snap page */}
      <div
        ref={ref}
        className="paged-track flex w-full snap-x snap-mandatory overflow-x-auto"
      >
        <section className="w-full shrink-0 snap-start pr-4 last:pr-0">
          {pages[0]}
        </section>
        <section className="w-full shrink-0 snap-start pl-1 pr-1 last:pr-0">
          {enablePage2 ? (
            pages[1]
          ) : (
            <div className="border border-dashed border-line bg-[var(--bg-1)]/40 px-4 py-8 text-center font-mono-tech text-[11px] tracking-[0.16em] text-[var(--mute)]">
              // 选取武器后展开 //
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
