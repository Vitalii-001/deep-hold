# Deep Hold — New Game Architecture: план рефакторингу

Статус: затверджений напрям, імплементація по фазах.
Джерело: архітектурні нотатки owner'а (Ale v2, Mining v2, Retention, King's Hall meta) + аудит поточного коду.
Дата: 2026-07-17.

**Диференціатор гри:** не «глибше = більше», а **Ale-логістика + value-over-volume mining strategy**. Гравець постійно приймає рішення: як копати, скільки гномів витримає ель, де bottleneck, коли ризикнути bulk rush. Три retention-стовпи:

1. **Ale economy** — short-term tension (хвилини).
2. **Mining strategy** — mid-term decisions (десятки хвилин).
3. **King's Hall** — long-term identity, колекція, пам'ять, цілі (сесії/дні).

**Політика UI в цьому рефакторингу:** всі нові UI-елементи — прості плейсхолдери на існуючих класах (`.panel`, `.row`, `.hall-card`, текстові рядки). Дизайн малюємо окремим проходом після стабілізації механік.

---

## 1. Аудит поточного стану

| Система | Де живе | Проблема |
|---|---|---|
| Tick | `src/game/tick.ts` — моноліт `simulateTick` | Всі системи в одній функції; ель/майнінг/діг не тестуються окремо; UI не може реюзати ту саму математику для прогнозів |
| Ale | усередині tick + `isStriking`/`productionRates` в `economy.ts` | Бінарний merry/strike; немає forecast (net rate, time-to-dry); немає якості/режимів; UI показує лише +/-с |
| Mining | `LayerConfig.yields` (`config/layers.ts`) | Немає методів видобутку, hardness, hazard; scouts — просто +depth speed |
| Processing | smith у tick (`ore→ingot`) | Немає capacity/bottleneck; smelter лише відкриває слоти |
| Offline | `offline.ts`, `chunkSec: 60` | Ель у чанку «вистачило/ні» на всі 60с — несправедливо; cave-in формула `chance*dt` не time-step safe; summary лише на boot |
| Save | `save.ts`, `SAVE_VERSION = 1` | Немає migration path — кожен bump скидає прогрес |
| King's Hall | `KingsHallModal.tsx` | Пасивний display: trophies hardcoded в компоненті, artifacts — порожні слоти, немає reward loop / badge / display choice |
| Balance | ручне відчуття + unit-тести | Немає симулятора: 1000м за ~24 хв — надто швидко для idle |
| Discoveries | `config/discoveries.ts` | Нагороди — лише одноразові ресурси, не build-defining |

Що вже добре і зберігається: config-driven баланс, чисті хелпери (`economy.ts`, `charter.ts`, `discoveries.ts`), збереження з м'яким merge, Watchers-патерн для тостів, dt-based tick (стабільний на 144/165 Гц).

---

## 2. Цільова архітектура

### 2.1. Simulation core: конвеєр систем

```ts
// src/game/systems/*
simulateTick(state, dt, now, rng) {
  let ctx = createTickContext(state, dt, now, rng);
  ctx = applyAleSystem(ctx);        // спрага, мораль (плавна), варка, brewMode
  ctx = applyMiningSystem(ctx);     // метод × шар × hardness → yields
  ctx = applyProcessingSystem(ctx); // smelt capacity, backlog
  ctx = applyDigSystem(ctx);        // просування, hazard/cave-in (exp-формула)
  ctx = applyProgressionSystem(ctx);// milestones, charter, discoveries, survey
  ctx = applyAwardSystem(ctx);      // trophies/records/newAwards (Фаза 4)
  return finalize(ctx);             // збирання GameState + накопичення records
}
```

`TickContext` = `{ state, dt, now, rng, ...проміжні rates }` — системи читають результати попередніх (мораль → mining), кожна тестується окремо, offline використовує той самий конвеєр.

### 2.2. Selectors/forecast layer (pure, спільні для tick і UI)

```ts
// src/game/forecast.ts
getAleForecast(state, now)   // workers, drinkRate, brewRate, netAle, storage,
                             // timeToDry, timeToFull, moraleState, recommendedBrewers
getMiningForecast(state, now)
getBottlenecks(state)        // 'aleSupport' | 'haulage' | 'processing' | 'miningPower'
getNextBestActions(state)    // "Hire Brewer: stabilizes Ale in 46s"
getTimeToAfford(state, cost)
```

OverviewPanel/AleStatus/Steward читають тільки ці селектори — жодної математики в компонентах.

### 2.3. Нові поля GameState (сумарно по всіх фазах)

```ts
// Фаза 0 (✅ зроблено)
playedSec: number;             // game-time годинник (офлайн не тікає)
// Фаза 1 (✅ зроблено)
brewMode: 'thin' | 'stout' | 'glowbrew';
feastUntilSec: number;         // активний бенкет (game-time, playedSec)
feastCooldownUntilSec: number;
rallyReadyAtSec: number;       // Overseer Command cooldown (game-time)
// Фаза 2
miningMethod: 'balanced' | 'selective' | 'bulk';
surveyProgress: Record<string, number>;   // layerId -> 0..100
surveyBonuses: Record<string, string>;    // layerId -> rolled bonus id
// Фаза 3
activeOrders: ActiveOrder[];              // Royal Orders
ordersCompleted: string[];
expeditions: Expedition[];                // scout expeditions / fermenting batches
// Фаза 4
trophiesEarned: string[];
artifactsFound: string[];
displayedArtifacts: string[];             // максимум 3 — тільки ці дають бонус
newAwards: { type: 'trophy'|'artifact'|'record'; id: string }[];
records: {
  totalAleBrewed: number; totalAleConsumed: number; longestMerryShiftSec: number;
  totalOreMined: number; totalGoldMined: number; caveInsSurvived: number;
  bestOfflineYield: Partial<Record<ResourceId, number>>;
};
```

Кожне поле — окрема миграція (див. 2.4), старі сейви отримують безпечні дефолти.

### 2.4. Save migrations

```ts
// src/game/save.ts
const MIGRATIONS: Record<number, (raw: unknown) => unknown> = {
  2: (s) => ({ ...s, brewMode: 'thin', feastUntil: 0, feastCooldownUntil: 0 }),
  3: (s) => ({ ...s, miningMethod: 'balanced', surveyProgress: {}, ... }),
  // ...
};
// loadGame: while (version < SAVE_VERSION) raw = MIGRATIONS[++version](raw)
```

Правило: **жодна фаза не мержиться без міграції своїх полів + тесту «старий сейв v1 вантажиться»**.

### 2.5. Balance sim (dev-tool)

`npm run sim:balance` — headless greedy-бот поверх реального `simulateTick`:
друкує time-to 25/75/200/450/1000м, time to first Brewery, час у dry/strike,
середній net ale, bottlenecks по часу, кількість осмислених покупок / 10 хв,
outcome offline 1h/4h/12h. Це — джерело правди для тюнінгу, не «наче норм».

---

## 3. Фази імплементації

### Фаза 0 — Технічна стабілізація (P0) — ✅ ЗАВЕРШЕНО (2026-07-17)

Найбільший ROI: прибирає несправедливість елю і дає інструменти для всіх наступних фаз.

| # | Задача | Файли |
|---|---|---|
| 0.1 | Розбити `simulateTick` на системи (без зміни поведінки, крім 0.2) | `src/game/systems/*`, `tick.ts` стає збирачем |
| 0.2 | Offline fix: `chunkSec` 60 → 2с; ель/мораль плавно всередині чанка | `config/balance.ts`, `offline.ts` |
| 0.3 | Cave-in: `1 - Math.exp(-chancePerSec * dt)` (time-step safe) | `systems/dig.ts` |
| 0.4 | Offline summary і на visibility return (зараз лише boot) | `game/loop.ts`, `uiStore` |
| 0.5 | `getAleForecast` selector + чанк накопичення records-лічильників у `finalize` (поля — Фаза 4, хуки — зараз, щоб не рефакторити двічі) | `game/forecast.ts` |
| 0.6 | Migration scaffold + тест на завантаження v1-сейву | `save.ts`, `save.test.ts` |
| 0.7 | `npm run sim:balance` (tsx-скрипт, greedy-бот) | `scripts/simBalance.ts`, `package.json` |

DoD: тести зелені; sim-звіт виводиться; поведінка live-гри незмінна (крім чеснішого offline); окремі unit-тести на `applyAleSystem`/`applyDigSystem`.

### Фаза 1 — Ale v2 (P1) — ✅ ЗАВЕРШЕНО (2026-07-17, SAVE_VERSION 3)

| # | Задача | Деталі |
|---|---|---|
| 1.1 | Плавна мораль | 3 стани `merry / thirsty / dry` (напр. поріг 25% storage) з градієнтом множника замість бінарного 1.5/0.6 |
| 1.2 | Forecast UI (плейсхолдер-рядки в AleStatus/Overview) | `Net Ale: +0.8/s`, `Dry in 3m 20s`, `Storage full in 1m 10s`, `1 more Brewer stabilizes this shift` |
| 1.3 | Brew modes (config `BREW_MODES`) | **Thin** — дешево, стабільність, малий бонус; **Stout** — дорожче, mining/dig бонус; **Glowbrew** — scout/depth бонус, hazard = «дивні discoveries» (рішення §6.2: простий окремий пул 2–3 подій, розвиваємо пізніше). Стан `brewMode`, перемикач — плейсхолдер-кнопки в Brewery-рядку |
| 1.4 | Feast / Shift Toast (ale sink) | Коштує 30–80 ель; 3–5 хв конкретного бонусу; cooldown; кейс «перед push до шару / bulk rush». Таймінги/цифри в `BALANCE.feast`. **Кнопка — в топбарі на місці прибраної «🏰 Hall»** (рішення §6.3) |
| 1.5 | Brewer recommendation | з `getAleForecast().recommendedBrewers` у tutorial-хінт і Overview |
| 1.6 | Overseer Command (перенесено з Фази 3, ризик R1) | «Rally Miners»: cooldown 5с, +5с mining speed або +камінь; зникає як головна дія після першого Mine Shaft. НЕ endless-клікер |
| 1.7 | Пивовари імунні до страйку (ризик R2) | brew-rate не множиться на strike-мораль; тексти лишаються англійськими («brewers drink first») |

Міграція: `brewMode: 'thin'`, `feastUntil: 0`, `feastCooldownUntil: 0`. Sim-метрика: час у dry ≤ цільового, feast використовується ботом.

### Фаза 2 — Mining v2 (P2) — ✅ ЗАВЕРШЕНО (2026-07-17, SAVE_VERSION 4)

| # | Задача | Деталі |
|---|---|---|
| 2.1 | Розширити `LayerConfig` | `hardness`, `baseYield`, `selectiveYieldMult`, `bulkYieldMult`, `hazard` (`depletion` — свідомо відкладено). Поточний `yields` → `baseYield`. **Hardness — головний механізм сповільнення кривої** (рішення §6.7): стіни, які проходяться апгрейдами/методом/елем, а не рівномірне гальмо |
| 2.2 | `miningMethod: balanced / selective / bulk` | Множники методу × шару (приклад Iron Veins: selective stone×0.65 ore×0.55 depth×0.75 ale×0.9; bulk stone×1.5 ore×0.18 depth×1.5 ale×1.35 caveIn×1.5). Плейсхолдер-перемикач у MineControls замість Careful/Reckless. **Рішення §6.1:** `digMode` видаляється, міграція `reckless→bulk`, `careful→balanced` |
| 2.3 | Scout survey (Hartman: prospecting → exploitation) | Scouts наповнюють `Survey %` наступного шару; на 100% ролиться бонус: **Rich Vein** (+ore/gold yield), **Stable Tunnel** (−cave-in), **Wet Crack** (brewery bonus), **Ancient Cache** (discovery). «Survey maps» як валюта — відкладено |
| 2.4 | Processing bottleneck | Smelt capacity від рівня Smelter; якщо ore production > capacity → UI «Ore backlog: build Smelter or hire Smith». Один bottleneck, без палива/рецептів на цьому етапі |
| 2.5 | Bottleneck display | `getBottlenecks`: Ale Support / Haulage (від Mine Shaft) / Processing / Mining Power — плейсхолдер-рядок в Overview |
| 2.6 | Нові шари (контент, розтягнути криву) | Див. §5 — Mushroom Grotto 50м, Coal Seams 120м, Flooded Caverns 300м, Obsidian Belt 700м |

Міграція: `miningMethod: 'balanced'`, `surveyProgress: {}`, `surveyBonuses: {}`. Sim: перший осмислений вибір методу на 8–20 хв; час до 200м у цілі.

### Фаза 3 — Retention (P3) — ✅ CORE ІМПЛЕМЕНТОВАНО (SAVE_VERSION 6)

Core Phase 3 реалізовано: Royal Orders UI/backend, one-time completed orders, return timers/expeditions, offline morning report events, discovery permanent modifiers, v1 Sealed Gate finale, rewarded-ad slots через SDK-stub. **Follow-up:** sim still shows depth pacing faster than target, so numerical balance tuning remains a separate pass.

| # | Задача | Деталі |
|---|---|---|
| 3.1 | ~~Overseer Command~~ → **перенесено у Фазу 1** (ризик R1) | — |
| 3.2 | Royal Orders | 2–3 паралельні контракти з вибором: «Deliver 100 Ingots in 10m → +permanent mine cap», «Brew 200 Ale for the Feast → +morale», «Survey Gold Seam → +gold yield». Config-driven (`config/orders.ts`), перевірка в `applyProgressionSystem`. **Game time** (рішення §6.5): `remainingSec` декрементується в tick, offline — пауза |
| 3.3 | Offline morning report | Не «+ресурси», а історія: «The night shift drank 72 Ale, mined 430 Ore, found a Rich Pocket.» Розширити `OfflineSummary` подіями з систем |
| 3.4 | Return-таймери | Ale fermenting batches («Stout matures in 30m»), scout expeditions («Survey report ready in 1h»), overnight plan (вибір методу перед виходом) |
| 3.5 | Discovery → permanent modifiers | Опції discoveries дають маленькі build-defining ефекти, не тільки ресурси (реюз механізму displayed-бонусів з Фази 4 або власне поле) |
| 3.6 | Pacing до 30–45 хв першої сесії | Тюнінг через sim за таблицею §4 |
| 3.7 | Фінал v1: Sealed Gate «to be continued» | Рішення §6.8: подія на 1000м — лор-тізер + фінальний trophy + «the mountain sleeps... for now». Без контенту за воротами |
| 3.8 | Rewarded ad-слоти в нових системах | Рішення §6.9: feast cooldown skip, expedition/survey прискорення, order reroll — через стаб `sdk/ads.ts`, кожен з безкоштовною альтернативою |

### Фаза 4 — King's Hall як retention pillar (їхні P1–P6) — ✅ CORE ІМПЛЕМЕНТОВАНО (2026-07-18, SAVE_VERSION 7)

Принцип: **не кожна нагорода = множник**. Більшість trophies — статус/косметика; лише 2–3 `displayedArtifacts` активують бонуси → вибір стилю, а не інфляція сили.

| # | Задача | Деталі |
|---|---|---|
| 4.1 | Розширювати поточний `KingsHallModal` (не новий екран) | Плейсхолдери на існуючих `.hall-card`/`.milestone-row` |
| 4.2 | `config/trophies.ts` + `config/artifacts.ts` | `{ id, title, description, icon, condition(s) }`; поточні hardcoded TROPHIES з компонента → конфіг. Категорії: Trophies, Artifacts, Medals/Deeds, Records, Royal Decorations (декорації — суто косметика, можна відкласти) |
| 4.3 | `applyAwardSystem` після tick/purchase/discovery | Пише `trophiesEarned`/`newAwards`; **не** в React-компонентах |
| 4.4 | Badge «new» на кнопках King's Hall (🏰 Hall + будівля) | Читає `newAwards.length`; вхід у відповідний таб очищає |
| 4.5 | Ale trophies + Mining trophies | First Cask, No Dry Shift (10 хв merry), Master Brewer (500 ale), Royal Feast, Night Cellar, Strikebreaker; Iron Veins Surveyed, Selective Master, Bulk Baron, Gold Seam Charter, Deep Ledger, Clean Haulage |
| 4.6 | Royal Office — дефолтний таб після інтро | Current Decree (charter), Latest Report (offline/сесія), New Trophy, Recommended Ambition (`getNextBestActions`). Кабінет відповідає «що робити далі», а не лише показує минуле |
| 4.7 | Ale Cellar таб | Cask Collection (brew modes), Feast History, Ale Forecast, Brewer Honors |
| 4.8 | Mining Ledger таб | Поточний bottleneck, layer/deposit, method, best vein, totals, value report |
| 4.9 | `displayedArtifacts` (макс 3 слоти з бонусом) | напр. Ancient Tankard +10% ale storage; Stonebeard Compass +10% survey speed; First Hammer Head +5% smelting |
| 4.10 | Records у UI | totalAleBrewed, longestMerryShift, caveInsSurvived, bestOfflineYield (лічильники — з Фази 0) |

Міграція: `trophiesEarned: []` тощо. Без ретро-гранту (рішення §6.4) — старі сейви заробляють trophies заново; conditions перевіряються тільки з поточного стану вперед.

Стан імплементації: додано `config/trophies.ts`, `config/artifacts.ts`, `game/awards.ts`, `records` counters, `newAwards`, `displayedArtifacts` max 3, badge на будівлі King's Hall, очищення unread awards при вході у відповідний таб, Royal Office/Ale Cellar/Mining Ledger/Artifacts/Trophies/Records tabs. Royal Decorations лишаються deferred cosmetics. Balance tuning лишається окремим follow-up: sim все ще показує надто швидкий 1000m pace і завеликі offline yields.

### Фаза 5 — Portal polish (P4) — ✅ ЗАВЕРШЕНО (2026-07-18)

Зроблено: `base: './'` (відносні шляхи в dist), SDK-обгортка `src/sdk/portal.ts`
(gameplayStart/Stop на boot/visibility/ads; sitelock-хелпер, вимкнений прапорцем),
єдиний ad-гейт `src/ui/adGate.ts` (пауза симуляції + mute + AdOverlay-блок UI,
нагорода тільки на 'rewarded'), мобільні вимоги (`-webkit-user-select: none`,
`viewport-fit=cover` + safe-area padding), non-blocking privacy-нотатка в Credits.
Білд: 1.2 МБ / 9 файлів — у межах усіх лімітів.

**Чекліст на момент сабміту в CrazyGames (єдині решта-кроки):**
1. `src/sdk/portal.ts` — вставити реальні виклики `CrazyGames.SDK` (init + gameplayStart/Stop) у три позначені стаби.
2. `src/sdk/ads.ts` — замінити стаб на `SDK.ad.requestAd('rewarded')`.
3. `SITELOCK_ENABLED = true` у `portal.ts`.
4. Прогнати QA-пас із `docs`-вимог (CLAUDE.md розділ CrazyGames) на 800×450 і 1920×1080.

- Перевірити build size (внутрішній бюджет < 5 МБ; initial ≤ 20 МБ для мобільного homepage).
- Ніякого власного fullscreen (портал дає свій).
- Ads тільки через SDK-wrapper (`src/sdk/ads.ts` вже абстрагує): pause+mute+block UI до `adFinished`/`adError`, reward тільки на `adFinished`, rewarded — optional з альтернативою.
- Геймплей за ≤ 1 клік (перевірити, що King's Hall інтро не блокує).
- Sitelock, відносні шляхи, `Gameplay start/stop` events.

Деталі вимог — розділ «Вимоги порталу CrazyGames» у `CLAUDE.md`.

---

## 4. Tuning targets (перевіряються sim-скриптом)

| Час | Ціль |
|---|---|
| 0–30 c | перший hire, видно гномів, перший приріст |
| 1–3 хв | перший Mine Shaft / перший upgrade |
| 4–7 хв | ель тисне («Dry in 4m»), Brewery — очевидна ціль |
| 8–12 хв | Brewer стабілізує; відкривається вибір mining method |
| 15–25 хв | Ore/Smelter/Ingots, перший processing bottleneck |
| 30–45 хв | Gold, Scouts, Survey, перший довший contract |
| 60–90 хв | Gems / Temple / offline planning |
| День 1 | 1000м НЕ обов'язково — Ancient Gate як причина повернутись |

Retention-сценарій 3–8 хв (посилити таймінгом): hire miners → «Ale dries in 4m» → reach 25m → Cold Spring → Brewery → Brewer → «я стабілізував Hold».

---

## 5. Рекомендовані нові шари (Фаза 2.6)

Кожен новий шар має підтримувати нову механіку, а не просто «ще один колір»:

| Глибина | Шар | Навіщо (зв'язка з системами) |
|---|---|---|
| ~50 м | **Mushroom Grotto** | інгредієнт для Glowbrew (Ale v2); м'який hazard «spores»; тематично вже є discovery Mushroom Nook |
| ~120 м | **Coal Seams** | паливо/бонус для Smelter (processing); темний шар між iron і gold розтягує 75→200 |
| ~300 м | **Flooded Caverns** | вода → brewery bonus (Wet Crack synergy); hazard «flooding» замість cave-in; розтягує 200→450 |
| ~700 м | **Obsidian Belt** | hardness spike — «стіна» перед ruins, перевірка стратегії (selective vs bulk); milestone m700 вже існує |

Разом стане 10 шарів: 0 dirt / 25 stone / 50 mushroom / 75 iron / 120 coal / 200 gold / 300 flooded / 450 gems / 700 obsidian / 1000 ruins. Вводити разом із hardness/методами — інакше це лише косметика. Оновити `config.test.ts` (length) і `ART_CONTRACT.md` (нові layer strips).

---

## 6. Прийняті рішення (owner, 2026-07-17)

1. **`digMode` зливається у `miningMethod`** (reckless ≈ bulk). Поле `digMode` видаляється; міграція мапить `'reckless' → 'bulk'`, `'careful' → 'balanced'`. UI-перемикач Careful/Reckless у MineControls замінюється перемикачем методу. (Фаза 2)
2. **Glowbrew hazard = «дивні discoveries»**, не +cave-in. Старт максимально просто: під glowbrew шанс-тригер невеликого пулу «strange» подій (можна реюзнути discovery-механізм з окремим пулом на 2–3 події); розвиваємо пізніше. (Фаза 1/3)
3. **Feast-кнопка живе в топбарі на місці кнопки «🏰 Hall»** — кнопка Hall з топбару видаляється (зроблено одразу), єдиний вхід у King's Hall — будівля на поверхні. (Фаза 1)
4. **Trophies — заробляти заново**: жодного ретро-гранту старим сейвам. Спрощує applyAwardSystem — просто перевірка condition з поточного стану, без backfill-логіки. (Фаза 4)
5. **Royal Orders — game time** (таймер тікає лише коли гра активна; offline ставить ордери на паузу). Зберігаємо `remainingSec` в ордері й декрементуємо в tick, а не порівнюємо з epoch. (Фаза 3)
6. **Ale без інгредієнтів у v1**: brew modes різняться швидкістю варіння та ефектами (Stout = менше елю/с + бонус), нових ресурсів-інгредієнтів немає. Еволюція до інгредієнтів (гриби Mushroom Grotto → Glowbrew) — пізніше, разом із новими шарами. Захист від death-spiral не потрібен — ель вариться «з повітря». (Фаза 1)
7. **Крива глибини — hardness-стіни**: сповільнення до 1000м робимо геймплейно — кожен шар твердіший, прохід вимагає апгрейдів/методу/елю; Obsidian Belt (700м) — явна «стіна». Гравець бачить причину повільності та інструмент проти неї. Базові числа теж тюнимо, але головний механізм — стіни. (Фаза 2)
8. **Ендгейм v1 — «to be continued»-ворота**: Sealed Gate на 1000м — фінальна подія: сильний лор-тізер + фінальний trophy + «the mountain sleeps... for now». Чесний кінець контенту, гачок на апдейти. Жодного нескінченного грайнду за воротами у v1. (Фаза 3/контент)
9. **Rewarded ads — проєктувати слоти одразу**: нові системи закладають опційні ad-точки через існуючий стаб `src/sdk/ads.ts` (скоротити feast cooldown, прискорити expedition/survey, reroll Royal Order) — кожна з безкоштовною альтернативою (вимога CrazyGames). Реальний SDK — Фаза 5. (Фази 1–3)

## 6b. Ризики відтоку та контрзаходи (аудит плану)

Принципи, які мають статус вимог (порушення = баг дизайну):

| # | Ризик відтоку | Контрзахід (де в плані) |
|---|---|---|
| R1 | **Мертві перші 60с**: без кліку старт = ~50с споглядання до 40 каменю | Overseer Command **переноситься з Фази 3 у Фазу 1**; sim міряє «секунди без осмисленої дії в перші 3 хв» |
| R2 | **Ale-спіраль**: страйк сповільнює пивоварів, які мають його гасити | **Пивовари імунні до страйк-моралі** («brewers drink first») — вихід зі страйку завжди швидкий (Фаза 1.1) |
| R3 | **Стіна = «гра закінчилась»** | Біля кожної hardness-стіни видимі ≥2 контрзаходи + прогрес-бар пробиття; ніколи не «застиг» (Фаза 2.1) |
| R4 | **Фейкові вибори** (balanced/thin завжди оптимальні) | sim **assert'ить**, що кожен метод/режим — найкращий хоч в одному сценарії; UI показує дельту режиму (Фази 1–2) |
| R5 | **Покараний офлайн** (повернувся у страйк) | Офлайн ніколи не закінчується гірше за «thirsty»: нічне раціонування елю (floor); morning report — переважно добра новина (Фаза 0.2/3.3) |
| R6 | **Перевантаження концепціями у 8–20 хв** | «Одна нова механіка на unlock»: перемикачі приховані до свого моменту (методи — після Smelter, brew modes — після Brewery 2...) |
| R7 | **Таймери-фейли** | Ордер вигорів → без штрафу, reroll; нагорода лише за успіх (Фаза 3.2) |
| R8 | **Світ не відображає прогрес** | Принцип для UI-проходу: видимий ріст шахти/поверхні (пропси, гноми, вагонетки) — це нагорода, не прикраса |

Архітектурні доповнення (Фаза 0):

- **Modifier registry**: всі джерела множників (апгрейди, будівлі, milestones, blessing, brew mode, feast, survey, артефакти) реєструються як `{source, mult}`; `getStatBreakdown(stat)` повертає розбивку. Проти «супу множників»; дає UI-пояснення «чому mining ×3.2» і логи для sim.
- **`playedSec`** — єдиний game-time годинник у стані (потрібен orders §6.5, `longestMerryShiftSec`, feast cooldown).
- **Кап на накопичувальні масиви** (`newAwards` тощо) — захист сейву від розпухання.
- **Політика soft-fail** (статус принципу): жодного жорсткого програшу — страйк має floor, ордер без штрафу, hazard = сповільнення/дрібна втрата.

## 7. Що свідомо відкладено (не робити зараз)

- `depletion` шарів; survey maps як валюта; ore stockpile cap + fuel/рецепти smelter (лишаємо один bottleneck); prestige; IAP; локалізації; Royal Decorations (косметика залу); нові арт-асети до стабілізації механік.

## 8. Порядок робіт і залежності

```
Фаза 0 ──► Фаза 1 (Ale v2) ──► Фаза 2 (Mining v2) ──► Фаза 3 (Retention)
   │                                                        │
   └── records-хуки, forecast, migrations ──► Фаза 4 (King's Hall) ◄─┘
                                                   │
                                             Фаза 5 (Portal polish, перед релізом)
```

Кожна фаза закінчується: тести зелені, `npm run build` зелений, міграція сейвів + тест, прогін `sim:balance` зі звітом у PR/нотатку, плейтест owner'а.
