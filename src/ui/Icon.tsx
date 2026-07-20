const svgModules = import.meta.glob('../assets/icons/*.svg', {
  eager: true,
  query: '?raw',
  import: 'default',
}) as Record<string, string>;

const SVGS: Record<string, string> = {};
for (const [path, svg] of Object.entries(svgModules)) {
  const id = path.split('/').pop()!.replace('.svg', '');
  SVGS[id] = svg;
}

export const EMOJI: Record<string, string> = {
  stone: '🪨', ore: '🟤', ingot: '🔩', gold: '🪙', gem: '💎', ale: '🍺',
  miner: '⛏️', smith: '🔨', brewer: '🍻', scout: '🧭',
  mineShaft: '🕳️', smelter: '🔥', forge: '⚒️', brewery: '🛢️', greatHall: '🏛️', temple: '🗿', tradingPost: '🏪',
  crown: '👑', market: '⚖️',
};

export function Icon({ id }: { id: string }) {
  const svg = SVGS[id];
  if (svg) {
    return <span className="icon" role="img" aria-label={id} dangerouslySetInnerHTML={{ __html: svg }} />;
  }
  return (
    <span className="icon" role="img" aria-label={id}>
      {EMOJI[id] ?? '❔'}
    </span>
  );
}
