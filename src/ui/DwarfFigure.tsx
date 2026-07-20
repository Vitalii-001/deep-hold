// Small cartoon dwarfs. Inline SVG (not <img>) so CSS can animate parts:
// `.dwarf-leg-l/-r` — marching (surface picketers), `.dwarf-pick` — pickaxe
// swing + `.dwarf-arm` (mine activity layer, pose="mining").
export function DwarfFigure({
  type,
  pose = 'stand',
}: {
  type: 'miner' | 'brewer';
  pose?: 'stand' | 'mining';
}) {
  if (type === 'brewer') {
    return (
      <svg viewBox="0 0 40 60" className="dwarf" aria-hidden="true">
        <rect className="dwarf-leg dwarf-leg-l" x="14" y="42" width="5" height="14" rx="2" fill="#3f2a1a" />
        <rect className="dwarf-leg dwarf-leg-r" x="21" y="42" width="5" height="14" rx="2" fill="#3f2a1a" />
        <rect x="11" y="27" width="18" height="18" rx="5" fill="#5a7a3c" />
        <rect x="14" y="29" width="12" height="16" rx="3" fill="#efe6cf" />
        <rect x="24.5" y="17" width="4" height="13" rx="2" fill="#e6b184" />
        <rect x="6" y="32" width="6" height="9" rx="1.5" fill="#caa96f" />
        <rect x="6" y="31" width="6" height="2.6" rx="1" fill="#fbf3dc" />
        <rect x="11" y="34" width="2.6" height="5" rx="1" fill="#caa96f" />
        <circle cx="20" cy="18" r="8.5" fill="#e6b184" />
        <circle cx="17" cy="18.4" r="1" fill="#3b2a17" />
        <circle cx="23" cy="18.4" r="1" fill="#3b2a17" />
        <path d="M11 20 q9 16 18 0 q-2 9 -9 10 q-7 -1 -9 -10z" fill="#9a9a9a" />
        <path d="M11 16 q9 -9 18 0 z" fill="#7a4a2a" />
        <path d="M9 16 h22" stroke="#5e3c22" strokeWidth="2" strokeLinecap="round" />
      </svg>
    );
  }
  if (pose === 'mining') {
    // Fully drawn mining dwarf, side profile facing the wall: chunky boots,
    // barrel tunic with belt, massive braided beard, big nose under a lamp
    // helmet. One heavy outline color everywhere keeps him crisp at ~44 px.
    // The svg needs `overflow: visible` (see .dwarf-mining) — the swinging
    // pick leaves the viewBox on the down-strike.
    const O = '#26170a'; // shared outline
    return (
      <svg viewBox="0 0 56 60" className="dwarf dwarf-mining" aria-hidden="true">
        {/* chunky boots with rolled cuffs */}
        <path d="M10 59 v-4 q0 -3 3 -3 h7 q4 0 4 4 v3 z" fill="#4a2f18" stroke={O} strokeWidth="1.6" strokeLinejoin="round" />
        <path d="M25 59 v-4 q0 -3 3 -3 h7 q5 0 5 4 v3 z" fill="#4a2f18" stroke={O} strokeWidth="1.6" strokeLinejoin="round" />
        {/* stout legs */}
        <rect x="14" y="44" width="8" height="10" fill="#54402c" stroke={O} strokeWidth="1.5" />
        <rect x="28" y="44" width="8" height="10" fill="#54402c" stroke={O} strokeWidth="1.5" />
        {/* barrel tunic leaning into the wall */}
        <path d="M11 47 Q8 30 20 26 L34 25 Q45 29 43 47 Z" fill="#3f6aa5" stroke={O} strokeWidth="1.8" strokeLinejoin="round" />
        <path d="M15 31 Q22 27 33 27" fill="none" stroke="#6e93c4" strokeWidth="1.6" strokeLinecap="round" />
        {/* belt with a bright buckle */}
        <rect x="11" y="42" width="32" height="5.5" rx="2" fill="#5e3c22" stroke={O} strokeWidth="1.5" />
        <rect x="23.5" y="42.5" width="7" height="4.5" rx="1" fill="#f2b93c" stroke={O} strokeWidth="1.3" />
        {/* pick group: both fists + haft + steel head; pivots at the shoulder */}
        <g className="dwarf-pick">
          <rect x="27" y="27.5" width="14" height="5.6" rx="2.8" fill="#e6b184" stroke={O} strokeWidth="1.4" />
          <rect x="23" y="30" width="13" height="5.6" rx="2.8" fill="#d9a26f" stroke={O} strokeWidth="1.4" />
          <line x1="39" y1="31" x2="51" y2="12" stroke={O} strokeWidth="5.2" strokeLinecap="round" />
          <line x1="39" y1="31" x2="51" y2="12" stroke="#8a5a34" strokeWidth="3.2" strokeLinecap="round" />
          <path d="M43.5 6.5 q11 3.5 10 17" stroke={O} strokeWidth="6.6" fill="none" strokeLinecap="round" />
          <path d="M43.5 6.5 q11 3.5 10 17" stroke="#aeb4ba" strokeWidth="3.6" fill="none" strokeLinecap="round" />
          <path d="M44.5 8 q6 2 7.5 8" stroke="#e3e8ee" strokeWidth="1.5" fill="none" strokeLinecap="round" />
        </g>
        {/* massive beard spilling over the chest, two braids with gold rings */}
        <path d="M19 23 Q34 25 34 38 Q34 50 26 52 Q15 50 15 36 Q15 27 19 23 Z" fill="#d97425" stroke={O} strokeWidth="1.8" strokeLinejoin="round" />
        <path d="M21 29 Q26 32 25 42 M28 27 Q32 33 30 44" stroke="#a04f10" strokeWidth="1.7" fill="none" strokeLinecap="round" />
        <path d="M19 44 q1 6 6 8 M31 46 q-2 4 -5 6" stroke="#a04f10" strokeWidth="1.4" fill="none" strokeLinecap="round" />
        <rect x="21" y="50" width="5" height="4" rx="1.6" fill="#f2b93c" stroke={O} strokeWidth="1.2" />
        {/* head: big skin-tone face, heroic nose, deep-set eye, bushy brow */}
        <circle cx="26" cy="19" r="8.2" fill="#eab58a" stroke={O} strokeWidth="1.7" />
        <path d="M32.5 18.5 q5 0.5 5 4.5 q0 3 -3.4 2.8 q-2.8 -0.2 -3.2 -3z" fill="#e2a877" stroke={O} strokeWidth="1.5" strokeLinejoin="round" />
        <circle cx="30" cy="17" r="1.6" fill={O} />
        <path d="M26.5 13.8 q4 -2 6.5 0" stroke={O} strokeWidth="2" fill="none" strokeLinecap="round" />
        {/* mustache bridging face and beard */}
        <path d="M24 24.5 q5 3 9.5 0.5 q-1 4 -5 4 q-3.5 0 -4.5 -4.5z" fill="#a04f10" stroke={O} strokeWidth="1.2" strokeLinejoin="round" />
        {/* gold helmet: dome, riveted brim, glowing lamp */}
        <path d="M16.5 15.5 a9.4 9.4 0 0 1 18.2 -2.4 l-0.8 3.4 z" fill="#f2b93c" stroke={O} strokeWidth="1.7" />
        <rect x="13.5" y="14.2" width="23" height="4" rx="2" fill="#c8901c" stroke={O} strokeWidth="1.5" />
        <circle cx="17.5" cy="16.2" r="0.8" fill={O} />
        <circle cx="32.5" cy="16.2" r="0.8" fill={O} />
        <circle cx="23" cy="7.5" r="3.2" fill="#fff4b0" stroke={O} strokeWidth="1.4" />
        <circle cx="23" cy="7.5" r="1.2" fill="#ffde5e" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 40 60" className="dwarf" aria-hidden="true">
      <rect className="dwarf-leg dwarf-leg-l" x="14" y="42" width="5" height="14" rx="2" fill="#3f2a1a" />
      <rect className="dwarf-leg dwarf-leg-r" x="21" y="42" width="5" height="14" rx="2" fill="#3f2a1a" />
      <rect x="11" y="27" width="18" height="18" rx="5" fill="#3f6aa5" />
      <rect x="11" y="39" width="18" height="4" fill="#6b4a2b" />
      <rect x="18" y="39" width="4" height="4" fill="#e2a828" />
      <rect x="24.5" y="17" width="4" height="13" rx="2" fill="#e6b184" />
      <circle cx="20" cy="18" r="8.5" fill="#e6b184" />
      <circle cx="17" cy="18.6" r="1" fill="#3b2a17" />
      <circle cx="23" cy="18.6" r="1" fill="#3b2a17" />
      <path d="M12 20 q8 15 16 0 q-2 8 -8 9 q-6 -1 -8 -9z" fill="#b5651d" />
      <path d="M11 17 a9 9 0 0 1 18 0z" fill="#e2a828" />
      <rect x="9.5" y="15.5" width="21" height="3" rx="1.5" fill="#b17e18" />
      <circle cx="20" cy="10.5" r="2.4" fill="#fff4b0" />
    </svg>
  );
}
