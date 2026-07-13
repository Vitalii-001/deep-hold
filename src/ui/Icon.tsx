export const EMOJI: Record<string, string> = {
  stone: '🪨', ore: '🟤', ingot: '🔩', gold: '🪙', gem: '💎', ale: '🍺',
  miner: '⛏️', smith: '🔨', brewer: '🍻', scout: '🧭',
  mineShaft: '🕳️', smelter: '🔥', forge: '⚒️', brewery: '🛢️', greatHall: '🏛️', temple: '🗿',
};

export function Icon({ id }: { id: string }) {
  return (
    <span className="icon" role="img" aria-label={id}>
      {EMOJI[id] ?? '❔'}
    </span>
  );
}
