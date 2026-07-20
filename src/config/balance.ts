// Every tunable number in the game lives here (plus the per-entity configs
// in workers/buildings/layers/upgrades). Balance tuning = editing this folder.
export const BALANCE = {
  dig: {
    baseSpeed: 0, // descent is fully worker-driven — no free progress without dwarves
    firstMinerShaftM: 7, // hiring the first miner breaks ground instantly — the shaft is visible right away
    perMiner: 0.02, // m/s each (before layer hardness) — miners are the primary early driver
    perScout: 0.05, // m/s each (before layer hardness) — scouts are dedicated diggers
    caveIn: {
      chancePerSec: 0.02, // base risk while Bulk-mining (scaled by layer hazard)
      stunSec: 60,
      stunMult: 0.25, // production multiplier while stunned
      stoneLossRatio: 0.1,
      templeReductionPerLevel: 0.2, // chance *= (1 - this)^templeLevel
    },
  },
  smelt: { orePerIngot: 2, capacityPerSmelterLevel: 0.5 }, // conversions/s ceiling per smelter level
  ale: {
    consumptionPerWorker: 0.02, // ale/s per worker
    happyMult: 1.5, // work speed while ale is comfortable
    strikeMult: 0.6, // work speed when dry (0.6/1.5 = 40% of the merry pace)
    // Below this ale/storage ratio morale slides linearly from happy to strike
    // ("thirsty" band) instead of snapping — Phase 1 smooth morale.
    thirstyRatio: 0.25,
    storageBase: 50,
    storagePerBreweryLevel: 50,
    adBarrelAmount: 50,
    initialAle: 20,
  },
  feast: {
    aleCost: 50,
    durationSec: 240, // game-time (playedSec) — pauses offline
    cooldownSec: 600,
    productionMult: 1.25, // all production while the feast lasts
  },
  rally: {
    cooldownSec: 5,
    baseStone: 2, // floor so the very first rallies always feel like something
    secondsOfMining: 5, // grants this many seconds of current mining output
  },
  // Loose Chunk hotspot (MINE_SCREEN.md Pass 1): a tiny periodic click reward
  // inside the mine. Deliberately capped so it can never rival idle production.
  // Haul-cycle cart: mining income is credited only when the cart delivers it
  // to the Mine Shaft at the surface (spec 2026-07-19-cart-courier-design.md).
  cart: {
    loadSec: 2, // loading pause at the dig face before departure
    unloadSec: 1.5, // dumping pause at the shaft mouth (delivery happens at its end)
    speedMps: 12, // base ascent speed, meters per second
    downMult: 0.6, // descent duration = ascent duration × this
    minTripSec: 4,
    maxTripSec: 40, // late game never waits minutes for a haul
    shaftSpeedPerLevel: 0.15, // each Mine Shaft building level speeds the cart up
  },
  // Collectible finds (NEW_FEATURES.md §1): keepsakes that drop from a mined-out
  // rock chunk and fill the King's Hall Collection.
  finds: {
    dropChancePerChunk: 0.12, // base chance a mined-out chunk yields a find
    firstFindBoost: 3, // chance multiplier while the layer has yielded nothing yet
  },
  mineInteractions: {
    cooldownSecMin: 10,
    cooldownSecMax: 18,
    lifetimeSec: 50, // unmined chunk crumbles after this long
    maxActive: 3, // concurrent chunks on the walls
    clicksMin: 3, // clicks to mine a chunk out
    clicksMax: 5,
    spawnBandM: 70, // chunks appear within this many meters above the dig face
    minDepthM: 4, // never above this depth (avoids the surface edge)
    rewardMiningSec: 4, // whole-chunk budget = this many seconds of current stone rate
    rewardMinStone: 3,
    rewardMaxStone: 25, // hard cap on the whole-chunk stone budget
    secondaryChance: 0.35, // per-click chance to also drop a pinch of the layer's secondary
    secondaryCapMult: 0.5, // secondary amount = stone reward * ratio, capped by this fraction
  },
  production: {
    forgeMultPerLevel: 1.25, // mining only
    greatHallMultPerLevel: 1.05, // all production
    templeMultPerLevel: 1.05, // all production
  },
  caps: {
    miner: { base: 5, perLevel: 3, building: 'mineShaft' },
    smith: { base: 0, perLevel: 2, building: 'smelter' },
    brewer: { base: 0, perLevel: 2, building: 'brewery' },
    scout: { base: 0, perLevel: 1, building: 'greatHall' },
  },
  reveal: { stone: 0, ale: 0, ore: 75, ingot: 75, gold: 200, gem: 450 },
  // chunkSec 5: fine-grained enough that ale/morale drain smoothly instead of
  // "did one whole minute of thirst fit" (Phase 0 offline fairness fix)
  offline: { capHours: 12, rate: 0.5, chunkSec: 5, minModalSec: 60 },
  blessing: { mult: 2, durationHours: 4 },
  autosaveSec: 10,
} as const;
