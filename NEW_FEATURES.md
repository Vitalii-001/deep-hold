# Deep Hold — нові фічі (roadmap + дизайн під код)

Статус: **чернетка на ревʼю** (2026-07-20). Джерело ідей — порівняння з Mr. Mine;
мета — закрити головний розрив («відчуття відкриття»), не втрачаючи власної
ідентичності (ель/мораль, королівський двір, гноми).

Документ описує 4 фічі. Кожна — самодостатній модуль, лягає на наявний
конфіг-driven каркас (`discoveries` / `artifacts` / `layers` / rock chunks) без
переписування ядра. Порядок реалізації — у §5.

**Принципи, спільні для всіх фіч (за зразком наявного коду):**
- Уся математика — в чистих хелперах (`src/game/*.ts`), UI лише показує; store
  роллить нагороди, компонент не передає суми (як `mineChunkClick`).
- Числа — в `BALANCE` (`src/config/balance.ts`), контент — в окремих конфігах.
- Нові **збережені** поля з безпечним дефолтом покриваються наявним
  `initialState`-merge у `loadGame` — **без bump `SAVE_VERSION`**; версію піднімаємо
  лише на rename/семантичну зміну (політика з `src/game/save.ts`).
- Декоративні анімації — CSS keyframes, поважають `particlesEnabled` і
  `prefers-reduced-motion`.
- **Арт-конвеєр (за `src/assets/ART_CONTRACT.md`):** будуємо на плейсхолдерах
  (inline-SVG у стилі `RockChunkIcon`/`DwarfFigure`, CSS-градієнти, emoji), фінал —
  WebP @2x / прозорий фон / світлий cartoon-палітра (parchment-дерево-золото);
  дрібні іконки йдуть в атлас `src/assets/icons/atlas.webp`(+`.json`, 64×64
  клітинки). Кожна фіча нижче має підрозділ **Дизайн-асети** з плейсхолдером,
  фінальними шляхами й анімаціями. Сумарний растровий бюджет тримати < 2 МБ.

---

## 1. Колекційні знахідки (Finds) — якірна фіча

> **Статус: реалізовано (2026-07-20).** Config `src/config/finds.ts` (22
> предмети + 4 set-бонуси), чистий `src/game/finds.ts` (+тести), store-дія
> `claimChunkFind`, дроп із chunk'ів у `MineChunks.tsx`, вкладка **Collection**
> у King's Hall, плейсхолдер-арт `FindIcon.tsx` + `collection.svg`. 193 тести й
> білд зелені.

### Ідея
Під час копання світ зрідка «віддає» **знахідку** — скамʼянілість, загублену
реліквію, рідкісний кристал, старий інструмент. На відміну від rock chunks (які
дають ресурс у вагонетку), знахідка — **колекційний предмет**: іде у вітрину
`Collection` в King's Hall. Більшість — на завершення колекції й записи; менша
частина, коли зібрано **повний набір шару**, дає невеликий постійний бонус.

Це прямий розвиток трьох наявних систем: rock chunks (спосіб «здобути»),
`artifacts` (умовні розблокування з бонусом + вітрина), `records` (лічильники).

### Як здобувається
Основний канал — **дроп із докопаного chunk'а**. `MineChunks.tsx` уже знає момент
mine-out (останній клік). На останньому кліку UI викликає нову store-дію
`claimChunkFind(layerId)`, яка **server-side** роллить знахідку з таблиці шару:
з шансом `BALANCE.finds.dropChancePerChunk` видає **одну ще не зібрану** знахідку
цього шару (вага за рідкістю). Компонент не може підробити предмет — лише
тригерить roll, який і так був би доступний (як `mineChunkClick`).

Щоб гравець гарантовано побачив механіку: перша знахідка кожного шару має
підвищений шанс (`firstFindBoost`), поки в шарі не зібрано жодної.

Знахідка **не** блокує екран модалкою (discoveries вже займають слот блокуючих
подій — щометрові попапи дратували б): показуємо toast «Unearthed: …» + бейдж
`New` на King's Hall, як зараз для нагород.

### Дані
Новий конфіг `src/config/finds.ts`:
```ts
export interface FindConfig {
  id: string;
  name: string;
  layerId: string;                 // до якого шару належить (layers.ts id)
  icon: string;                    // поки текст/емодзі-плейсхолдер (див. ART_CONTRACT)
  category: 'fossil' | 'relic' | 'crystal' | 'tool';
  rarity: 'common' | 'rare' | 'legendary'; // визначає вагу дропу
  description: string;
  flavor: string;
}

// Постійний бонус за зібраний ПОВНИЙ набір шару (довгий гачок).
export interface LayerSetBonusConfig {
  layerId: string;
  description: string;             // напр. "+5% ore forever"
  stat?: StatId; statMult?: number;      // ті самі поля, що в artifacts
  aleStorageMult?: number; surveySpeedMult?: number;
}
```
Стартовий контент: 3–4 знахідки на кожен зі шарів `iron`, `coal`, `gold`,
`gems` (мілкі шари — 1–2 «common» для навчання). Разом ~18–20 предметів.

**GameState** (`src/game/types.ts`) += `findsCollected: string[]` (id зібраних).
**GameRecords** += `totalFindsCollected: number`.
**AwardType** розширюється: `'trophy' | 'artifact' | 'record' | 'find'`
(`newAwards` — список, тож additive-безпечно).

**BALANCE.finds**:
```ts
finds: {
  dropChancePerChunk: 0.12,   // базовий шанс дропу на докопаний chunk
  firstFindBoost: 3,          // множник шансу, поки в шарі нічого не зібрано
}
```

### Логіка (чисті хелпери)
`src/game/finds.ts`:
- `findsOfLayer(layerId): FindConfig[]`
- `rollFind(layerId, findsCollected, rng): FindConfig | null` — фільтрує ще не
  зібрані знахідки шару, зважує за рідкістю, застосовує `firstFindBoost`,
  повертає одну або `null`. Тести: не дублює зібране; рідкісні рідше; boost поки
  порожньо; `null`, якщо шар вичерпано.
- `completedLayerSets(findsCollected): LayerSetBonusConfig[]` — набори, зібрані
  повністю (для бонусів). Бонуси вливаються в наявні мультиплікатори через ту
  саму механіку, що `artifacts` (розширити `statMult`/`aleStorage`/`surveySpeed`
  агрегатори в `economy.ts`, щоб врахувати завершені набори).

Store-дія `claimChunkFind(layerId, rng?)`: роллить, і якщо є результат —
`findsCollected: [...прев, id]`, `records.totalFindsCollected + 1`, пуш у
`newAwards` (`{type:'find', id}`), toast. Повертає `FindConfig | null` (UI
показує toast/анімацію по факту).

### UI
Нова вкладка King's Hall **Collection**:
- у `KingsHallModal.tsx`: `HallTab` += `'collection'`; запис у `TABS`
  (`clears: 'find'`); компонент `CollectionTab`.
- Сітка `.hall-card` за шарами (заголовок-шар + предмети), locked/unlocked як в
  `ArtifactsTab`; лічильник `N/total` і позначка «set complete → бонус».
- Дроп у шахті: коротка CSS-іскра/pop над докопаним chunk'ом + toast; без нової
  математики.

### Save / офлайн
`findsCollected` — additive-поле з дефолтом `[]`; merge покриває, bump не
потрібен. Офлайн: chunks — це UI-механіка (не працюють офлайн, як і зараз), тож
знахідки офлайн не дропаються — прийнятно й консистентно з rock chunks.

### Дизайн-асети
Найбільший арт-обсяг з усіх фіч — ~18–20 предметів + вітрина. Розбивка:

**Іконки знахідок (по одній на предмет, ~18–20).**
- *Плейсхолдер:* новий `src/ui/mine/FindIcon.tsx` — inline-SVG за `category`
  (`fossil` — кістка/спіраль амоніта, `relic` — кубок/руна, `crystal` — друза,
  `tool` — старий молот), тонований за `rarity` (common сірий / rare синій /
  legendary золото). 4 базові форми × тон — покриває всі предмети без 20 окремих
  малюнків. Обводка як у `RockChunkIcon` (crisp на 30–48px).
- *Фінал:* окрема секція атласу — клітинки 64×64 у `src/assets/icons/atlas.webp`
  (додати ключі `find_<id>` в `atlas.json`) АБО, якщо предметів більшатиме, папка
  `src/assets/icons/finds/<id>.webp` (прозорий, @2x=128px). Рекомендую атлас —
  один запит, менший бюджет.
- Розмір у сцені: 30–34px (як chunk); у вітрині: 48–56px.

**Анімація «Unearthed» (дроп із chunk'а).**
- CSS-only: короткий `findPop` (scale-in + обертання) + золота іскра-glint над
  докопаним chunk'ом (реюз патерну `.chunk-debris`), потім предмет «злітає» до
  верху й тане (як floating text). Поважає `particlesEnabled`/reduced-motion.
- Toast «Unearthed: <name>» — наявний `Toasts.tsx`, з іконкою предмета.

**Вітрина Collection (вкладка King's Hall).**
- Картки — реюз `.hall-card`; **locked** стан: силует (CSS `filter: brightness(0)
  opacity(.35)` поверх іконки) + знак `?`. **Rarity-рамка:** колір бордера картки
  за рідкістю (CSS-змінні, без асета).
- **Set-complete печатка:** маленька золота стрічка/сургуч на завершеному наборі
  шару. *Плейсхолдер:* CSS-бейдж (як `.tab-new-badge`) або emoji 🏅. *Фінал:*
  атлас-клітинка `seal_gold` 64×64.
- Заголовок набору — колір шару з `LayerConfig.color` (уже є).

**Оновити `ART_CONTRACT.md`:** додати секцію «Finds» з переліком `find_<id>`
клітинок атласу + `seal_gold`.

---

## 2. Унікальність шарів (Layer signatures)

> **Статус: реалізовано (2026-07-20).** Config `src/config/layerFeatures.ts` +
> accessor'и `src/game/layerFeatures.ts` (+тести). 4 фічі: Mushroom `aleSeep`
> (systems/ale.ts), Iron `denseChunks` (MineChunks), Gold `richChunks`
> (mineInteractions), Gems `findRich` (finds). Тег на плашці Active Face
> (`.face-feature`). Жодного нового збереженого стану. 197 тестів і білд зелені.

### Ідея
Кожен шар отримує **одну памʼятну фішку**, а не лише вищу `hardness`. Щоб
лишитися конфіг-driven і без нового збереженого стану — у v1 беремо **пасивні/
похідні** фішки (event-timer-фішки на кшталт затоплення — окремим пізнішим
кроком, бо потребують збереженого таймера).

### Дані
`src/config/layerFeatures.ts` — мапа `layerId → LayerFeatureConfig`:
```ts
export type LayerFeature =
  | { kind: 'aleSeep'; alePerSec: number }        // Mushroom Grotto: пасивний струмок елю
  | { kind: 'richChunks'; rewardMult: number }    // Gold Seams: щедріші chunk-нагороди
  | { kind: 'denseChunks'; maxActiveBonus: number }// Iron Veins: інколи 2 chunk'и разом
  | { kind: 'findRich'; dropMult: number };        // Gem Hollows: більше знахідок (звʼязок з §1)
```
Жодних нових полів GameState — усе читається зі стану похідно.

### Інтеграція (по місцю, без нової математики ядра)
- `aleSeep` → додатковий доданок у `systems/ale.ts`, якщо `layerAtDepth(depth)`
  має фічу (масштабується мораллю/`dt`, як решта).
- `richChunks` → множник у `rollChunkClickReward` (mineInteractions), коли
  chunk на шарі з фічею.
- `denseChunks` → `BALANCE.mineInteractions.maxActive + bonus` для активного
  шару (у `MineChunks.tsx`).
- `findRich` → множник до `dropChancePerChunk` у §1.

Стартово вмикаємо 3 фічі (`aleSeep` grotto, `richChunks` gold, `denseChunks`
iron); решта шарів — порожньо (легко дописати конфіг пізніше). UI: маленький
тег-підказка на плашці Active Face (реюз `.mine-bottleneck-hint` стилю).

### Тести
Кожен множник: увімкнено на «своєму» шарі, вимкнено на інших; жодних змін
балансу поза цільовим шаром.

### Дизайн-асети
Фішки — пасивні/декоративні, тож арту мало; головне — щоб шар «читався» як
особливий.

**Іконка-тег на плашці Active Face** (одна на тип фічі).
- *Плейсхолдер:* emoji/inline-SVG у стилі наявних `.mine-bottleneck-hint`
  (🍄 aleSeep, ✨ richChunks, 🧲 denseChunks, 💠 findRich) + короткий підпис.
- *Фінал:* атлас-клітинки `feat_<kind>` 64×64.

**Ambient-декор у сцені (опційно, підсилює впізнаваність шару).**
- `aleSeep` (Mushroom Grotto): світна крапля/спора — CSS-glow + `drip`-keyframe;
  фінал — маленький `mushroom-glow.webp` (прозорий, ~48px), кладеться абсолютно в
  `.mine-world` на глибині шару.
- `richChunks` (Gold Seams): додатковий золотий glint на chunk'ах — **без нового
  асета**, лише посилення наявного `chunkPulse`/тон.
- `denseChunks` (Iron): металевий відблиск — CSS-only.
- `findRich` (Gem Hollows): резонансне мерехтіння — CSS-only.

Свідомо БЕЗ важкого арту: подієві фішки (затоплення тощо) відкладені, тож
анімованих спрайтів-подій поки не треба.

**Оновити `ART_CONTRACT.md`:** `feat_<kind>` клітинки + опційний
`src/assets/layers/decor/mushroom-glow.webp`.

---

## 3. Маркет / торгівля (Crowns)

> **Статус: реалізовано (2026-07-20).** Crowns — окреме поле `crowns` (не
> ResourceId) + `marketPerks`. Config `market.ts` (SELLABLES + 3 perks),
> чистий `game/market.ts` (+тести). Будівля Trading Post (unlockDepth 75)
> гейтить вкладку **Market** у King's Hall (продаж сирих ресурсів + крамниця
> перків). Crowns-пігулка в ResourceBar. Перки — offline-yield/сховище через
> наявні MODIFIERS, ніякого +видобутку. 205 тестів і білд зелені.

### Ідея
Окрема вісь економіки: **Trading Post** дозволяє продавати надлишок сирих
ресурсів за нову валюту **Crowns** (королівська монета) і витрачати Crowns на
те, що ресурсами не купиш — **не-прогресійні** підсилювачі. Це доповнює, а не
замінює цикл ресурс→будівля.

### Ключове рішення по типу валюти
Crowns — **окреме скалярне поле** `crowns: number`, а **не** новий `ResourceId`.
Причина: `ResourceId` входить у десятки `Record<ResourceId, number>`
(resources, reveal-пороги, format, bestOfflineYield…) — новий член розповз би
всюди. Окреме поле локалізує зміну.

### Що продається / що купується
`src/config/market.ts`:
```ts
export interface SellableConfig {
  resource: ResourceId;            // stone/ore/gold/gem (ель/інгот — ні)
  basePrice: number;               // Crowns за одиницю
  depthPriceMult: number;          // ціна росте з глибиною (глибші ресурси дорожчі)
}
export interface MarketPerkConfig {
  id: string;
  name: string;
  costCrowns: number;
  description: string;
  // ефект — не-прогресійний буст (щоб не тривіалізувати білд-цикл):
  modifier?: string;               // напр. offlineRate+, feast cooldown-, extra artifact slot
}
```
Перки навмисно **не** дають прямої видобувної переваги: приклади — +offline
rate, коротший feast-cooldown, +1 слот вітрини артефактів/знахідок, косметика.

### Логіка
`src/game/market.ts` (чисті): `sellPrice(s, resource)`, `sellResource(s, rid,
qty)` (кламп по наявному, нараховує Crowns), `buyMarketPerk(s, perkId)`
(перевіряє Crowns, додає в `marketPerks`). Store-дії — тонкі обгортки.

**GameState** += `crowns: number` (деф. 0), `marketPerks: string[]` (деф. `[]`).
Обидва additive — bump не потрібен. Перк-модифікатори вливаються через наявний
`permanentBonuses`/`MODIFIERS`-механізм там, де можливо.

### UI
Розблокування — **будівля Trading Post** (наявна система `buildings`); поки не
збудовано — вкладка схована. Далі — вкладка King's Hall **Market**
(`HallTab += 'market'`): ліворуч продаж (ресурс, ціна, кнопки ×1/×макс),
праворуч крамниця перків. Баланс Crowns — у TopBar-барі поряд з ресурсами.

### Ризик балансу (зафіксувати)
Це ціла нова вісь. Правила проти зламу економіки: продавати можна лише **сирі**
ресурси (не ель/інгот); ціни ростуть повільно; перки — **тільки** якісного
життя, ніколи не «+X% видобутку». Тюнити в `BALANCE.market` окремим проходом.

### Дизайн-асети

**Валюта Crowns — окрема іконка.** В атласі вже зарезервовано `coin`, але корона
має читатися окремо від золота.
- *Плейсхолдер:* emoji 👑 у TopBar-барі поряд з ресурсами.
- *Фінал:* атлас-клітинка `crown` 64×64 (тепла золота монета з короною).

**Будівля Trading Post (surface-спрайт-гейт).**
- *Плейсхолдер:* реюз наявного стилю `.surface-building` з CSS/emoji, стоїть у
  `.surface-strip` на зарезервованому `.surface-slot`.
- *Фінал:* `src/assets/buildings/trading-post.webp` — прозорий, ~160×120
  display, той самий cartoon-стиль, що інші будівлі (ятка/віз із товаром).

**Вкладка Market (King's Hall).**
- Ліва колонка (продаж): іконки ресурсів уже в атласі — новий арт не потрібен.
- Права колонка (перки): кожен перк — картка `.hall-card` з іконкою. *Плейсхолдер:*
  атлас-іконки (`hourglass` для offline, `barrel`/`ale` для feast-cd, `chest` для
  слота) або emoji. *Фінал:* за потреби кілька `perk_<id>` клітинок атласу.
- **Анімація продажу:** монетки-glint летять із ресурсу в бік Crowns-балансу +
  `+N 👑` float — CSS-only, реюз патерну floating text.

**Оновити `ART_CONTRACT.md`:** `crown` (+ можливі `perk_<id>`) клітинки атласу;
`src/assets/buildings/trading-post.webp` у секцію Buildings.

---

## 4. Retention-гачки

### Ідея
Причини повертатися щодня. Наявні системи вже частину покривають: **Royal
Orders** = ротаційні короткі цілі, **Royal Charter** = квест-ланцюг. Тож тут
додаємо те, чого бракує: **Daily Decree** (щоденна нагорода зі стріком) і
**святкування нагород** (наявні `newAwards` зараз тихі).

### Daily Decree
- **GameState** += `lastDailyClaimMs: number` (деф. 0), `dailyStreak: number`
  (деф. 0). Wall-clock (`Date.now()`), не `playedSec`.
- `src/game/daily.ts`: `dailyStatus(s, now)` → `{ claimable, streak, reward }`;
  `claimDaily(s, now)` → нараховує нагороду, оновлює стрік (скидається, якщо
  пропущено > 48 год). Нагорода масштабується прогресом і, якщо зроблено §3,
  **видається в Crowns** (звʼязок фіч) або елем/блесингом інакше.
- UI: бейдж/кнопка в TopBar або в office-вкладці King's Hall; проста модалка-
  клейм. Конфіг тірів/стріку в `BALANCE.daily`.

### Святкування нагород
`awards.ts` уже веде `newAwards`. Додаємо: на **новий** запис у `newAwards` —
toast-святкування (реюз `Toasts.tsx`) + короткий pop на іконці King's Hall.
Дешево, помітно, не потребує нового стану.

### Save
`lastDailyClaimMs`, `dailyStreak` — additive з дефолтами, bump не потрібен.

### Дизайн-асети

**Daily Decree — кнопка/бейдж (TopBar або office-вкладка).**
- *Плейсхолдер:* атлас `scroll` (уже зарезервовано) як іконка декрету + CSS-glow
  `claimPulse`, коли доступно (реюз ідеї `hall-beckon`); коли на кулдауні —
  приглушено.
- *Фінал:* за бажанням окрема `daily_seal` клітинка (королівський сургуч).

**Індикатор стріку.**
- *Плейсхолдер:* число + emoji 🔥 (або `star` з атласу).
- *Фінал:* `streak_flame` клітинка атласу.

**Модалка клейму.**
- Реюз стилю наявних модалок (`.modal`); королівський сургуч/стрічка як акцент —
  *плейсхолдер* CSS/emoji, *фінал* `daily_seal`.

**Святкування нагород.**
- CSS-only: `awardBurst` (короткий конфеті/іскра-burst у `Toasts.tsx`) + pop-glow
  на іконці King's Hall (реюз наявного `hallBeckon`/`awardBadgePulse`). Нового
  растрового арту не треба.

**Оновити `ART_CONTRACT.md`:** опційні `daily_seal`, `streak_flame` клітинки
атласу (решта — реюз наявних).

---

## 5. Порядок реалізації та залежності

1. **Колекційні знахідки (§1)** — якір, самодостатня, найбільший вплив;
   спирається на готові chunks + artifacts. Робити першою.
2. **Унікальність шарів (§2)** — дешева, additive; `findRich` звʼязує з §1.
3. **Маркет / Crowns (§3)** — середня; вводить валюту, потрібну для §4.
4. **Retention (§4)** — Daily + святкування; нагорода в Crowns з §3 (або
   ель/блесинг, якщо §3 ще нема).

Кожна фіча — окремий spec → план → імплементація (як у superpowers-циклі), із
власними тестами й checkpoint. Порядок можна міняти: §1 і §2 незалежні від §3–4.

### Наскрізна нотатка по збереженню
Усі нові поля (`findsCollected`, `crowns`, `marketPerks`, `lastDailyClaimMs`,
`dailyStreak`, `records.totalFindsCollected`) — **additive з безпечним
дефолтом**, тож `initialState`-merge у `loadGame` їх покриває **без bump
`SAVE_VERSION`**. Нові record-ключі — через `mergeRecords`/`initialRecords`.
`AwardType += 'find'` безпечне (список). Bump потрібен лише якщо колись
переназвемо/змінимо семантику наявного поля.

---

## 6. Що свідомо НЕ робимо

За `CLAUDE.md` і `MINE_SCREEN.md`, поза скоупом лишаються: prestige, IAP/реальна
преміум-валюта (Crowns — **тільки** зароблювані), combat/монстри, side-pockets
(бічні кімнати), нова растрова графіка (плейсхолдери за `ART_CONTRACT.md`,
WebP пізніше), зміни базового балансу видобутку/елю/tick/offline поза явно
названими множниками фіч.
