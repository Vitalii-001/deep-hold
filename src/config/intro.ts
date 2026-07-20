// First-run introduction copy. The prologue now lives inside the King's Hall
// (ui/modals/KingsHallModal.tsx) as a Royal Steward greeting rather than a
// standalone modal. The player IS the Dwarven King; the Steward addresses them
// as "My King" and never gives orders.

export interface StewardGreeting {
  speaker: string;
  body: string;
}

export const ROYAL_STEWARD_GREETING: StewardGreeting = {
  speaker: 'Royal Steward',
  body: 'My King, our hold begins with one swing. Gather Stone, hire miners, keep the ale flowing, and the mountain will become your kingdom.',
};
