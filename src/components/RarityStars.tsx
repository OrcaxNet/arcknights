interface Props {
  rarity: number;
}

const COLOR: Record<number, string> = {
  6: "text-[var(--orange)]",
  5: "text-[var(--acid)]",
  4: "text-[var(--teal)]",
};

export function RarityStars({ rarity }: Props) {
  const tone = COLOR[rarity] ?? "text-[var(--ink-2)]";
  return (
    <span
      className={`font-mono-tech text-[10px] leading-none tracking-[0.18em] ${tone}`}
      aria-label={`${rarity}-star`}
    >
      <span>{"●".repeat(rarity)}</span>
      <span className="text-[var(--mute-2)]">{"○".repeat(6 - rarity)}</span>
      <span className="ml-1 text-[var(--mute)] tracking-normal">R/{rarity}</span>
    </span>
  );
}
