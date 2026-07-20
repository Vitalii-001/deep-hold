import { useState } from 'react';
import { ARTIFACTS, ARTIFACT_MAP, DISPLAYED_ARTIFACT_LIMIT } from '../../config/artifacts';
import { BREW_MODE_LIST } from '../../config/brewModes';
import { DISCOVERIES } from '../../config/discoveries';
import { LAYERS, layerAtDepth, nextLayer } from '../../config/layers';
import { FINDS, LAYER_SET_BONUSES } from '../../config/finds';
import { completedLayerSetBonuses, findsOfLayer } from '../../game/finds';
import { FindIcon } from '../mine/FindIcon';
import { MARKET_PERKS, SELLABLES } from '../../config/market';
import { sellPrice } from '../../game/market';
import { MINING_METHODS } from '../../config/miningMethods';
import { ROYAL_STEWARD_GREETING } from '../../config/intro';
import { SURVEY_BONUSES } from '../../config/survey';
import { TROPHIES, TROPHY_MAP } from '../../config/trophies';
import { getCharterProgress, getCurrentGoal } from '../../game/charter';
import { aleStorage, productionRates, surveySpeedMult, totalWorkers } from '../../game/economy';
import { getAleForecast, getBottlenecks, getNextBestActions } from '../../game/forecast';
import { formatDuration, formatNumber } from '../../game/format';
import { useGame } from '../../game/store';
import type { AwardType, GameState, NewAward, ResourceId } from '../../game/types';
import { Icon } from '../Icon';
import { sfx } from '../sfx';
import { useUi } from '../uiStore';

type HallTab =
  | 'office'
  | 'cellar'
  | 'ledger'
  | 'discoveries'
  | 'collection'
  | 'market'
  | 'artifacts'
  | 'trophies'
  | 'records';

// `available` hides a tab until its gate is met (Market needs the Trading Post).
const TABS: { id: HallTab; label: string; icon: string; clears?: AwardType; available?: (s: GameState) => boolean }[] = [
  { id: 'office', label: 'Office', icon: 'charter' },
  { id: 'cellar', label: 'Cellar', icon: 'ale' },
  { id: 'ledger', label: 'Ledger', icon: 'records' },
  { id: 'discoveries', label: 'Discoveries', icon: 'discoveries' },
  { id: 'collection', label: 'Collection', icon: 'collection', clears: 'find' },
  { id: 'market', label: 'Market', icon: 'market', available: (s) => s.buildings.tradingPost >= 1 },
  { id: 'artifacts', label: 'Artifacts', icon: 'artifacts', clears: 'artifact' },
  { id: 'trophies', label: 'Trophies', icon: 'trophies', clears: 'trophy' },
  { id: 'records', label: 'Records', icon: 'records', clears: 'record' },
];

function resourceReport(gained: Partial<Record<ResourceId, number>>): string {
  const entries = Object.entries(gained)
    .filter(([, value]) => (value ?? 0) >= 1)
    .map(([id, value]) => `+${formatNumber(value ?? 0)} ${id}`)
    .slice(0, 3);
  return entries.length > 0 ? entries.join(', ') : 'No major resource gain.';
}

function awardTitle(award: NewAward): string {
  if (award.type === 'trophy') return TROPHY_MAP[award.id]?.title ?? award.id;
  if (award.type === 'artifact') return ARTIFACT_MAP[award.id]?.title ?? award.id;
  if (award.id === 'bestOfflineYield') return 'Best Offline Yield';
  return award.id;
}

function OfficeTab() {
  const s = useGame();
  const latestOfflineSummary = useUi((u) => u.latestOfflineSummary);
  const charter = getCharterProgress(s);
  const current = charter.current;
  const newAwards = s.newAwards;
  const actions = getNextBestActions(s, Date.now());
  const latestTrophy = newAwards.find((a) => a.type === 'trophy');

  return (
    <div className="hall-tab-body office-grid">
      <div className="hall-card office-card">
        <p className="eyebrow">Current Decree</p>
        {current ? (
          <>
            <strong>{current.chapter.title}</strong>
            <span>{current.goal.text}</span>
            <p className="desc">
              {formatNumber(Math.min(current.current, current.target))} / {formatNumber(current.target)}
            </p>
          </>
        ) : (
          <>
            <strong>Royal Charter Complete</strong>
            <p className="desc">Every decree in the current charter has been honored.</p>
          </>
        )}
      </div>

      <div className="hall-card office-card">
        <p className="eyebrow">Latest Report</p>
        {latestOfflineSummary ? (
          <>
            <strong>{formatDuration(latestOfflineSummary.elapsedSec)} away</strong>
            <span>{resourceReport(latestOfflineSummary.gained)}</span>
            <p className="desc">Dug {formatNumber(Math.max(0, latestOfflineSummary.metersDug))} m deeper.</p>
          </>
        ) : (
          <>
            <strong>No offline report yet</strong>
            <p className="desc">Close the game long enough for the night shift to report back.</p>
          </>
        )}
      </div>

      <div className={`hall-card office-card ${newAwards.length > 0 ? 'new' : ''}`}>
        <p className="eyebrow">New Trophy</p>
        {latestTrophy ? (
          <>
            <strong>{awardTitle(latestTrophy)}</strong>
            <span>{TROPHY_MAP[latestTrophy.id]?.description ?? 'A new royal mark is ready.'}</span>
            <p className="desc">{newAwards.length} unread award{newAwards.length === 1 ? '' : 's'} in the hall.</p>
          </>
        ) : newAwards.length > 0 ? (
          <>
            <strong>{awardTitle(newAwards[0])}</strong>
            <span>A new award waits in its hall tab.</span>
          </>
        ) : (
          <>
            <strong>No new awards</strong>
            <p className="desc">Keep mining, brewing and reporting records to fill the hall.</p>
          </>
        )}
      </div>

      <div className="hall-card office-card">
        <p className="eyebrow">Recommended Ambition</p>
        <div className="hall-list">
          {actions.map((action) => (
            <div key={action.id} className="milestone-row">
              <span className="milestone-mark">{'->'}</span>
              <div className="row-main">
                <strong>{action.title}</strong>
                <p className="desc">{action.detail}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function CellarTab() {
  const s = useGame();
  const forecast = getAleForecast(s, Date.now());
  const timeLine =
    forecast.timeToDry !== null
      ? `Dry in ${formatDuration(forecast.timeToDry)}`
      : forecast.timeToFull !== null
        ? `Full in ${formatDuration(forecast.timeToFull)}`
        : 'Stable cellar';

  return (
    <div className="hall-tab-body">
      <div className="hall-section-title">
        <strong>Ale Cellar</strong>
        <span className="desc">Storage {formatNumber(s.resources.ale)} / {formatNumber(forecast.storage)}</span>
      </div>

      <div className="artifact-shelf">
        {BREW_MODE_LIST.map((mode) => (
          <div key={mode.id} className={`hall-card ${s.brewMode === mode.id ? 'active' : ''}`}>
            <strong>{mode.name}</strong>
            <span className="desc">{mode.description}</span>
            <span className="desc">Brew rate x{mode.brewRateMult}</span>
          </div>
        ))}
      </div>

      <div className="stat-grid">
        <div className="stat-row">
          <span>Net Ale</span>
          <strong>{forecast.netAle >= 0 ? '+' : ''}{formatNumber(forecast.netAle)}/s</strong>
        </div>
        <div className="stat-row">
          <span>Forecast</span>
          <strong>{timeLine}</strong>
        </div>
        <div className="stat-row">
          <span>Morale</span>
          <strong>{forecast.moraleState} x{forecast.moraleMult.toFixed(2)}</strong>
        </div>
        <div className="stat-row">
          <span>Feast History</span>
          <strong>{formatNumber(s.records.feastsHeld)} held</strong>
        </div>
        <div className="stat-row">
          <span>Total Brewed</span>
          <strong>{formatNumber(s.records.totalAleBrewed)}</strong>
        </div>
        <div className="stat-row">
          <span>Longest Merry Shift</span>
          <strong>{formatDuration(s.records.longestMerryShiftSec)}</strong>
        </div>
      </div>
    </div>
  );
}

function LedgerTab() {
  const s = useGame();
  const now = Date.now();
  const layer = layerAtDepth(s.depth);
  const next = nextLayer(s.depth);
  const method = MINING_METHODS[s.miningMethod];
  const rates = productionRates(s, now);
  const bottleneck = getBottlenecks(s, now)[0];
  const bonusId = s.surveyBonuses[layer.id];
  const bonus = SURVEY_BONUSES.find((b) => b.id === bonusId);

  return (
    <div className="hall-tab-body">
      <div className="hall-card">
        <p className="eyebrow">Current Bottleneck</p>
        <strong>{bottleneck?.label ?? 'None'}</strong>
        <span className="desc">{bottleneck?.hint ?? 'The hold is balanced for now.'}</span>
      </div>

      <div className="stat-grid">
        <div className="stat-row">
          <span>Layer</span>
          <strong>{layer.name}</strong>
        </div>
        <div className="stat-row">
          <span>Next Deposit</span>
          <strong>{next ? `${next.name} at ${formatNumber(next.depth)} m` : 'Sealed Gate'}</strong>
        </div>
        <div className="stat-row">
          <span>Method</span>
          <strong>{method.name}</strong>
        </div>
        <div className="stat-row">
          <span>Best Vein</span>
          <strong>{bonus?.name ?? 'No surveyed bonus here'}</strong>
        </div>
        <div className="stat-row">
          <span>Stone Rate</span>
          <strong>{formatNumber(rates.mining)}/s</strong>
        </div>
        <div className="stat-row">
          <span>Ore Rate</span>
          <strong>{formatNumber(rates.secondary.ore ?? 0)}/s</strong>
        </div>
        <div className="stat-row">
          <span>Gold Rate</span>
          <strong>{formatNumber(rates.secondary.gold ?? 0)}/s</strong>
        </div>
        <div className="stat-row">
          <span>Smelt Rate</span>
          <strong>{formatNumber(rates.smelt)}/s</strong>
        </div>
        <div className="stat-row">
          <span>Dig Speed</span>
          <strong>{formatNumber(rates.dig)} m/s</strong>
        </div>
        <div className="stat-row">
          <span>Survey Speed</span>
          <strong>x{surveySpeedMult(s).toFixed(2)}</strong>
        </div>
      </div>
    </div>
  );
}

function DiscoveriesTab() {
  const discoveriesSeen = useGame((s) => s.discoveriesSeen);
  const discoveryChoices = useGame((s) => s.discoveryChoices);
  return (
    <div className="hall-tab-body">
      <p className="desc">Found {discoveriesSeen.length}/{DISCOVERIES.length}. Discoveries are unearthed deeper in the mountain.</p>
      <div className="discovery-shelf">
        {DISCOVERIES.map((d) => {
          const seen = discoveriesSeen.includes(d.id);
          const choice = d.options.find((o) => o.id === discoveryChoices[d.id]);
          return (
            <div key={d.id} className={`hall-card ${seen ? '' : 'locked'}`}>
              <strong>{seen ? d.name : '???'}</strong>
              <span className="desc">
                {seen && choice ? `${d.depth} m - ${choice.label}` : 'Found deeper in the mountain.'}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function MarketTab() {
  const s = useGame();
  const sell = useGame((st) => st.sellResource);
  const buy = useGame((st) => st.buyMarketPerk);

  return (
    <div className="hall-tab-body">
      <div className="hall-section-title">
        <strong>Trading Post</strong>
        <span className="desc"><Icon id="crown" /> {formatNumber(s.crowns)} Crowns</span>
      </div>

      <p className="eyebrow">Sell Surplus</p>
      <div className="market-sell">
        {SELLABLES.map((sc) => {
          const have = s.resources[sc.resource];
          const price = sellPrice(s, sc.resource);
          return (
            <div key={sc.resource} className="market-row">
              <span className="market-row-res">
                <Icon id={sc.resource} /> {formatNumber(have)}
              </span>
              <span className="desc">@ {price.toFixed(2)} <Icon id="crown" /></span>
              <span className="market-row-actions">
                <button type="button" className="mini-action" disabled={have < 10} onClick={() => sell(sc.resource, 10)}>
                  Sell 10
                </button>
                <button type="button" className="mini-action" disabled={have < 1} onClick={() => sell(sc.resource, have)}>
                  Sell all
                </button>
              </span>
            </div>
          );
        })}
      </div>

      <p className="eyebrow">Royal Perks</p>
      <div className="artifact-shelf">
        {MARKET_PERKS.map((perk) => {
          const owned = s.marketPerks.includes(perk.id);
          const affordable = s.crowns >= perk.costCrowns;
          return (
            <div key={perk.id} className={`hall-card ${owned ? 'displayed' : ''}`}>
              <strong>{perk.name}</strong>
              <span className="desc">{perk.description}</span>
              {owned ? (
                <span className="desc">Owned</span>
              ) : (
                <button type="button" className="mini-action" disabled={!affordable} onClick={() => buy(perk.id)}>
                  {perk.costCrowns} <Icon id="crown" />
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function CollectionTab() {
  const findsCollected = useGame((s) => s.findsCollected);
  const collected = new Set(findsCollected);
  const completedSets = new Set(completedLayerSetBonuses(findsCollected).map((b) => b.layerId));
  const layersWithFinds = LAYERS.filter((l) => findsOfLayer(l.id).length > 0);

  return (
    <div className="hall-tab-body">
      <div className="hall-section-title">
        <strong>Collection</strong>
        <span className="desc">{collected.size}/{FINDS.length} finds unearthed</span>
      </div>
      <p className="desc">Finds are dug up from rock chunks in the shaft. Complete a layer's set for a permanent bonus.</p>

      {layersWithFinds.map((layer) => {
        const items = findsOfLayer(layer.id);
        const got = items.filter((f) => collected.has(f.id)).length;
        const bonus = LAYER_SET_BONUSES.find((b) => b.layerId === layer.id);
        const setDone = completedSets.has(layer.id);
        return (
          <div key={layer.id} className="find-layer-group">
            <div className="find-layer-head">
              <strong style={{ color: layer.color }}>{layer.name}</strong>
              <span className="desc">{got}/{items.length}</span>
              {bonus && (
                <span className={`find-set-badge ${setDone ? 'done' : ''}`} title={bonus.description}>
                  {setDone ? `✓ ${bonus.name} · ${bonus.description}` : `Set: ${bonus.description}`}
                </span>
              )}
            </div>
            <div className="find-shelf">
              {items.map((f) => {
                const has = collected.has(f.id);
                return (
                  <div key={f.id} className={`hall-card find-card rarity-${f.rarity} ${has ? '' : 'locked'}`}>
                    <span className="find-card-icon" aria-hidden="true">
                      {has ? (
                        <FindIcon category={f.category} rarity={f.rarity} />
                      ) : (
                        <span className="find-locked">?</span>
                      )}
                    </span>
                    <strong>{has ? f.name : '???'}</strong>
                    <span className="desc">{has ? f.description : 'Undiscovered — dig this layer.'}</span>
                    {has && <span className="find-flavor">{f.flavor}</span>}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ArtifactsTab() {
  const artifactsFound = useGame((s) => s.artifactsFound);
  const displayedArtifacts = useGame((s) => s.displayedArtifacts);
  const toggleDisplayedArtifact = useGame((s) => s.toggleDisplayedArtifact);
  const slotsLeft = DISPLAYED_ARTIFACT_LIMIT - displayedArtifacts.length;

  return (
    <div className="hall-tab-body">
      <div className="hall-section-title">
        <strong>Displayed Artifacts</strong>
        <span className="desc">{displayedArtifacts.length}/{DISPLAYED_ARTIFACT_LIMIT} slots active</span>
      </div>
      <div className="artifact-shelf">
        {ARTIFACTS.map((artifact) => {
          const found = artifactsFound.includes(artifact.id);
          const displayed = displayedArtifacts.includes(artifact.id);
          const canDisplay = found && (displayed || slotsLeft > 0);
          return (
            <div key={artifact.id} className={`hall-card artifact-card ${found ? '' : 'locked'} ${displayed ? 'displayed' : ''}`}>
              <span className="artifact-icon" aria-hidden="true">{found ? artifact.icon : 'LOCK'}</span>
              <strong>{found ? artifact.title : '???'}</strong>
              <span className="desc">{found ? artifact.description : artifact.lockedHint}</span>
              <span className="desc">{found ? artifact.effectDescription : 'Locked'}</span>
              {found && (
                <button type="button" className="mini-action" disabled={!canDisplay} onClick={() => toggleDisplayedArtifact(artifact.id)}>
                  {displayed ? 'Remove' : slotsLeft > 0 ? 'Display' : 'Slots full'}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function TrophiesTab() {
  const trophiesEarned = useGame((s) => s.trophiesEarned);
  const newAwards = useGame((s) => s.newAwards);
  const unread = new Set(newAwards.filter((a) => a.type === 'trophy').map((a) => a.id));

  return (
    <div className="hall-tab-body">
      <p className="desc">Trophies mark Ale mastery and value-over-volume mining records.</p>
      <div className="trophy-wall">
        {TROPHIES.map((trophy) => {
          const won = trophiesEarned.includes(trophy.id);
          return (
            <div key={trophy.id} className={`hall-card trophy ${won ? '' : 'locked'} ${unread.has(trophy.id) ? 'new' : ''}`}>
              <span className="trophy-icon" aria-hidden="true">{won ? trophy.icon : 'LOCK'}</span>
              <strong>{won ? trophy.title : '???'}</strong>
              <span className="desc">{won ? trophy.description : trophy.lockedHint}</span>
              <span className="desc">{trophy.category === 'ale' ? 'Ale Trophy' : 'Mining Trophy'}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function RecordsTab() {
  const s = useGame();
  const buildingsBuilt = Object.values(s.buildings).reduce((n, lv) => n + lv, 0);
  const bestOffline = Object.entries(s.records.bestOfflineYield)
    .filter(([, value]) => (value ?? 0) > 0)
    .map(([id, value]) => `${formatNumber(value ?? 0)} ${id}`)
    .join(', ');
  const records: [string, string][] = [
    ['Current Depth', `${formatNumber(s.depth)} m`],
    ['Current Layer', layerAtDepth(s.depth).name],
    ['Workers Hired', String(totalWorkers(s))],
    ['Buildings Built', String(buildingsBuilt)],
    ['Upgrades Owned', String(s.upgrades.length)],
    ['Ale Storage', formatNumber(aleStorage(s))],
    ['Total Ale Brewed', formatNumber(s.records.totalAleBrewed)],
    ['Total Ale Consumed', formatNumber(s.records.totalAleConsumed)],
    ['Longest Merry Shift', formatDuration(s.records.longestMerryShiftSec)],
    ['Cave-ins Survived', formatNumber(s.records.caveInsSurvived)],
    ['Ore Mined', formatNumber(s.records.totalOreMined)],
    ['Gold Mined', formatNumber(s.records.totalGoldMined)],
    ['Ingots Smelted', formatNumber(s.records.totalIngotsSmelted)],
    ['Best Offline Yield', bestOffline || 'None yet'],
  ];
  return (
    <div className="hall-tab-body">
      <div className="stat-grid">
        {records.map(([label, value]) => (
          <div key={label} className="stat-row">
            <span>{label}</span>
            <strong>{value}</strong>
          </div>
        ))}
      </div>
    </div>
  );
}

export function KingsHallModal() {
  const open = useUi((u) => u.kingsHallOpen);
  const closeKingsHall = useUi((u) => u.closeKingsHall);
  const setActivePanel = useUi((u) => u.setActivePanel);
  const pushToast = useUi((u) => u.pushToast);
  const clearNewAwards = useGame((s) => s.clearNewAwards);
  const introSeen = useGame((s) => s.onboarding.introSeen);
  const completeIntro = useGame((s) => s.completeIntro);
  const newAwards = useGame((s) => s.newAwards);
  const newAwardsCount = newAwards.length;
  // subscribe so the Market tab appears immediately after the Trading Post is built
  const tradingPost = useGame((s) => s.buildings.tradingPost);
  const [tab, setTab] = useState<HallTab>('office');

  if (!open) return null;

  const visibleTabs = TABS.filter((t) => !t.available || t.available(useGame.getState()));
  void tradingPost; // referenced only to drive re-render

  const selectTab = (nextTab: HallTab) => {
    setTab(nextTab);
    const clears = TABS.find((t) => t.id === nextTab)?.clears;
    if (clears) clearNewAwards(clears);
  };

  const toTheMine = () => {
    completeIntro();
    closeKingsHall();
    setActivePanel('overview'); // the Charter card with the first decree lives here
    const decree = getCurrentGoal(useGame.getState());
    if (decree) pushToast(`Royal Charter: ${decree.goal.text}`);
    sfx.coin();
  };

  return (
    <div className="modal-backdrop" onClick={() => closeKingsHall()}>
      <div className="modal kings-hall-modal" onClick={(e) => e.stopPropagation()}>
        <span className="hall-title-plate">King's Hall</span>
        {newAwardsCount > 0 && <span className="hall-title-badge">{newAwardsCount} new</span>}
        <button className="hall-close" onClick={() => closeKingsHall()} aria-label="Close">
          X
        </button>

        <div className="hall-scene">
          {!introSeen && (
            <div className="royal-steward-card">
              <span className="steward-portrait" aria-hidden="true">K</span>
              <div className="steward-body">
                <p className="eyebrow">{ROYAL_STEWARD_GREETING.speaker}</p>
                <p className="desc steward-greeting">{ROYAL_STEWARD_GREETING.body}</p>
                <div className="steward-actions">
                  <button className="intro-skip" onClick={() => completeIntro()}>
                    Skip Intro
                  </button>
                  <span className="intro-go-wrap">
                    <button className="intro-primary" onClick={toTheMine}>
                      To the Mine
                    </button>
                    {/* animated pointer: dives in from the top-right corner */}
                    <svg className="intro-point-hand" viewBox="0 0 40 56" aria-hidden="true">
                      <path
                        d="M12 9 a5 5 0 0 1 10 0 V24 Q34 22 35 34 V44 Q35 52 27 52 H13 Q6 52 6 45 V40 Q3 39 3 35 Q3 31 7 31 Q11 31 12 34 Z"
                        fill="#fff"
                        stroke="#5e3c22"
                        strokeWidth="2.4"
                        strokeLinejoin="round"
                      />
                      <path d="M8 45 Q20 49 33 44" fill="none" stroke="#c9bfa8" strokeWidth="2" strokeLinecap="round" />
                      <path d="M23 27 v6 M28 28 v6" fill="none" stroke="#c9bfa8" strokeWidth="1.6" strokeLinecap="round" />
                    </svg>
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="kings-hall-panel">
          <div className="kings-hall-tabs" role="tablist">
            {visibleTabs.map((t) => {
              const unread = t.clears ? newAwards.filter((a) => a.type === t.clears).length : 0;
              return (
                <button
                  key={t.id}
                  className={tab === t.id ? 'active' : ''}
                  onClick={() => selectTab(t.id)}
                  role="tab"
                  aria-selected={tab === t.id}
                >
                  <span className="tab-icon" aria-hidden="true"><Icon id={t.icon} /></span>
                  <span className="tab-label">{t.label}</span>
                  {unread > 0 && <span className="tab-new-badge">{unread}</span>}
                </button>
              );
            })}
          </div>

          <div className="kings-hall-content">
            {tab === 'office' && <OfficeTab />}
            {tab === 'cellar' && <CellarTab />}
            {tab === 'ledger' && <LedgerTab />}
            {tab === 'discoveries' && <DiscoveriesTab />}
            {tab === 'collection' && <CollectionTab />}
            {tab === 'market' && <MarketTab />}
            {tab === 'artifacts' && <ArtifactsTab />}
            {tab === 'trophies' && <TrophiesTab />}
            {tab === 'records' && <RecordsTab />}
          </div>
        </div>
      </div>
    </div>
  );
}
