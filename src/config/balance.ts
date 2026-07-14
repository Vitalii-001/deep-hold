// Every tunable number in the game lives here (plus the per-entity configs
// in workers/buildings/layers/upgrades). Balance tuning = editing this folder.
export const BALANCE = {
  click: { stonePerClick: 1 },
  dig: {
    baseSpeed: 0.11, // m/s with no workers — sets the near-constant descent pace
    perMiner: 0.00008, // m/s each — miners mainly dig stone, barely speed the descent
    perScout: 0.0025, // m/s each — scouts accelerate the descent modestly
    recklessMult: 2,
    caveIn: {
      chancePerSec: 0.02, // in reckless mode
      stunSec: 60,
      stunMult: 0.25, // production multiplier while stunned
      stoneLossRatio: 0.1,
      templeReductionPerLevel: 0.2, // chance *= (1 - this)^templeLevel
    },
  },
  ale: {
    consumptionPerWorker: 0.02, // ale/s per worker
    happyMult: 1.5, // work speed while ale > 0
    strikeMult: 0.4, // work speed while ale == 0
    storageBase: 50,
    storagePerBreweryLevel: 50,
    adBarrelAmount: 50,
    initialAle: 20,
  },
  smelt: { orePerIngot: 2 },
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
  offline: { capHours: 12, rate: 0.5, chunkSec: 60, minModalSec: 60 },
  blessing: { mult: 2, durationHours: 4 },
  autosaveSec: 10,
} as const;
