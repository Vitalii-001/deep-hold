import type { FindCategory, FindRarity } from '../../config/finds';

// Placeholder art for collectible finds (NEW_FEATURES.md §1). Four drawn
// shapes by category, tinted by rarity — covers all ~20 finds without
// per-item art. Swap for final atlas cells `find_<id>` later (ART_CONTRACT).
// Same crisp light-cartoon outline style as RockChunkIcon.

// [fill, light-accent] per rarity — the whole item is tinted so rarity reads
// at a glance even before you open the card.
const RARITY_TINT: Record<FindRarity, [string, string]> = {
  common: ['#9c968c', '#c4beb2'],
  rare: ['#5b86c9', '#9cc0f0'],
  legendary: ['#e2b93b', '#ffe58a'],
};
const OUTLINE = '#26170a';

export function FindIcon({ category, rarity }: { category: FindCategory; rarity: FindRarity }) {
  const [fill, light] = RARITY_TINT[rarity];

  if (category === 'fossil') {
    // ammonite spiral
    return (
      <svg viewBox="0 0 40 40" className="find-icon" aria-hidden="true">
        <circle cx="20" cy="20" r="16" fill={fill} stroke={OUTLINE} strokeWidth="2.4" />
        <path
          d="M20 9 a11 11 0 1 0 8 18 a7 7 0 1 0 -6 -12 a3.5 3.5 0 1 0 3 6"
          fill="none"
          stroke={OUTLINE}
          strokeWidth="2.4"
          strokeLinecap="round"
        />
        <path d="M20 9 a11 11 0 0 1 9 6" fill="none" stroke={light} strokeWidth="2" strokeLinecap="round" />
      </svg>
    );
  }
  if (category === 'crystal') {
    // faceted gem cluster
    return (
      <svg viewBox="0 0 40 40" className="find-icon" aria-hidden="true">
        <polygon points="12,20 8,26 14,35 18,28" fill={fill} stroke={OUTLINE} strokeWidth="2.2" strokeLinejoin="round" />
        <polygon points="20,5 29,17 25,36 15,36 11,17" fill={fill} stroke={OUTLINE} strokeWidth="2.4" strokeLinejoin="round" />
        <polygon points="20,5 24,17 20,36 16,17" fill={light} />
        <polygon points="20,5 29,17 24,17" fill={fill} />
      </svg>
    );
  }
  if (category === 'tool') {
    // old pickaxe head
    return (
      <svg viewBox="0 0 40 40" className="find-icon" aria-hidden="true">
        <path d="M6 12 q14 -8 28 0 q-14 6 -28 0z" fill={fill} stroke={OUTLINE} strokeWidth="2.4" strokeLinejoin="round" />
        <rect x="18" y="10" width="4.5" height="26" rx="2" fill="#6b4a2b" stroke={OUTLINE} strokeWidth="2" />
        <path d="M10 12 q8 -3 16 0" fill="none" stroke={light} strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    );
  }
  // relic — a ringed medallion / signet
  return (
    <svg viewBox="0 0 40 40" className="find-icon" aria-hidden="true">
      <circle cx="20" cy="21" r="13" fill={fill} stroke={OUTLINE} strokeWidth="2.6" />
      <circle cx="20" cy="21" r="6.5" fill={light} stroke={OUTLINE} strokeWidth="2" />
      <rect x="16.5" y="4" width="7" height="7" rx="2" fill={fill} stroke={OUTLINE} strokeWidth="2" />
      <path d="M20 18 l2.4 2.4 -2.4 2.4 -2.4 -2.4z" fill={OUTLINE} />
    </svg>
  );
}
