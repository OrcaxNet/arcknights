interface Props {
  index: string;
  title: string;
  subtitle?: string;
}

/**
 * 分类文件式分节标签：
 *   [ SECT. 01 ]  TARGET WEAPONS / 选择武器
 *   ─── 短横线
 */
export function SectionLabel({ index, title, subtitle }: Props) {
  return (
    <div className="flex items-baseline gap-2.5 reveal">
      <span className="ink-bar inline-flex h-[18px] items-center px-1.5 text-[10px] font-mono-tech tracking-[0.22em]">
        SECT. {index}
      </span>
      <span className="font-display text-base text-[var(--ink)]">{title}</span>
      {subtitle && (
        <span className="font-mono-tech text-[10px] tracking-[0.18em] text-[var(--mute)] hidden sm:inline">
          {subtitle}
        </span>
      )}
      <span className="ml-1 h-px flex-1 bg-[var(--line)]" />
    </div>
  );
}
