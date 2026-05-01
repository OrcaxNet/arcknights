interface Props {
  rarity: number;
}

export function RarityStars({ rarity }: Props) {
  const color =
    rarity === 6
      ? "text-amber-400"
      : rarity === 5
      ? "text-fuchsia-400"
      : "text-sky-400";
  return (
    <span className={`text-xs ${color}`}>
      {"★".repeat(rarity)}
      <span className="text-zinc-700">{"★".repeat(6 - rarity)}</span>
    </span>
  );
}
