# Deep Hold — Light-Cartoon UI Rebuild · Phase 1, Sub-phase 1: Shell + Design System

**Дата:** 2026-07-13
**Статус:** на розгляді користувача
**Джерела:** гейм-планувальник (детальний бриф + сценарії), обраний арт-напрям **#1 (light cartoon)**, мокапи `docs/design/proof_design_1.png`
**Базується на:** грі v1 (вже імплементована), онбординг-хінтах, балансі (щойно розтягнутому)

## Контекст і межі

Deep Hold лишається **single-page idle-грою без routing**. Навігація — таби/панелі через UI-стан; settings/credits/confirm/offline — модалки/оверлеї. **Не чіпати** симуляцію (`tick.ts`), економіку, save/load, офлайн, баланс (`config/*`). Без нових runtime-залежностей. Увесь ігровий текст — англійською.

### Дорожня карта (3 під-фази, кожна — окремий spec+plan)

1. **Sub-phase 1 (ЦЯ СПЕКА):** дизайн-токени light-cartoon + `GameShell` layout + навігація (`activePanel`) + перекладка наявних панелей у новий shell + ель-метр (3 стани) + адаптація онбордингу. Дає граючу гру у новому вигляді.
2. **Sub-phase 2:** `OverviewPanel` (з Goal-card), `MilestonesPanel`, `StatsPanel`; дефолтна панель → `overview`.
3. **Sub-phase 3:** `SettingsModal`, `ConfirmationModal`, персистентні UI-налаштування (`deep-hold-ui-settings`), тумблери particles/high-contrast/compact, перенесення Reset у Settings, `ART_CONTRACT.md`, volume-слайдери.

**Арт (WebP персонажі/будівлі/шари/іконки)** — у всіх під-фазах пізніше; зараз плейсхолдери, наявні іконки й CSS-градієнти.

## Дизайн-токени (light cartoon) — потребує схвалення/корекції

**Знахідка при семплюванні мокапа #1:** його UI-панелі насправді теплі **темно-дерев'яні** (`#3C2814`, золото `#503C00`, тло `#141414`), тоді як письмовий бриф просить **світлі parchment-панелі** («not the current dark hardcore UI», «high contrast for small portal iframes»). **Рішення:** беремо світлий parchment-chrome (за брифом) + золото/дерево-акценти з мокапа #1 + яскравих персонажів #1. Нижче — стартові значення; дизайнер може віддати точну таблицю токенів, тоді замінимо.

| Токен | Значення | Роль |
|---|---|---|
| `--bg` | `#e6d2ac` | тло сторінки (тепле parchment; допускається м'який градієнт) |
| `--surface` | `#f2e5c8` | тло за картками |
| `--panel` | `#f8efd8` | заливка панелі/картки (світлий parchment) |
| `--panel-strong` | `#ecdab0` | піднята/активна панель |
| `--wood` | `#8a5a34` | дерев'яна рамка (середня) |
| `--wood-dark` | `#5e3c22` | глибока рамка/тінь дерева |
| `--gold` | `#e2a828` | золота кнопка (primary) |
| `--gold-dark` | `#b17e18` | золото натиснуте/бордюр |
| `--stone` | `#b9ad95` | нейтральний камінь |
| `--text` | `#3b2a17` | основний текст (темно-коричневий на світлому) |
| `--text-muted` | `#7c6a4e` | приглушений текст |
| `--success` | `#4f9a3c` | зелений (Merry/ок) |
| `--warning` | `#e08a1e` | оранжевий (Low/попередження) |
| `--danger` | `#cc4526` | червоний (Strike/небезпека) |
| `--border` | `#cb9a63` | загальний бордюр |
| `--shadow` | `rgba(70,45,20,0.22)` | м'яка тінь |

Стиль: тепле parchment, дерев'яні бордюри, золоті кнопки з темним текстом, заокруглені кути, м'які тіні, високий контраст для малих iframe. Ошатні рамки — через CSS `border-image`/градієнти, **без** повнорозмірних картинок.

**Канвас-розріз шахти** (щойно «насочений» темний процедурний) лишається як **плейсхолдер** у світлій рамці; посвітлимо, коли приїде layer-арт.

## Архітектура layout

Нові компоненти (`src/ui/layout/`), кожен — одна відповідальність:

- **`GameShell.tsx`** — топ-рівень. Застосовує тему на корені. Desktop: CSS-grid `TopBar / (LeftNav · MineStage · RightPanel)`; Mobile (≤760px): вертикальний стек `TopBar → MineStage → RightPanel(ale+active panel) → BottomNav`. Рендерить `ModalLayer` поверх усього. Без routing — усе через `activePanel` в `uiStore`.
- **`TopBar.tsx`** — плейсхолдер портрета короля/лого, назва «Deep Hold», плейсхолдер level/depth-прогресу, лічильники ресурсів (**reveal через `BALANCE.reveal`**, не хардкод), плейсхолдер Shop/Ad, кнопка Settings (у sub-phase 1 — заглушка/disabled, реальна модалка в sub-phase 3), кнопка Credits (відкриває наявний `CreditsModal`), кнопка Mute (наявний `toggleMuted`).
- **`LeftNav.tsx`** (desktop) / **`BottomNav.tsx`** (mobile) — кнопки навігації, що керують `activePanel`. **Sub-phase 1 кнопки:** Workers, Buildings, Upgrades, Ad Boosts. Кожна кнопка несе `data-hint="nav-<panel>"` (для стрілок онбордингу). Overview/Milestones/Stats з'являться в sub-phase 2.
- **`MineStage.tsx`** — центр: плейсхолдер поверхні/входу + наявний `MineView` (канвас) у мультяшній рамці + мітки глибини + маркер поточної глибини + велика кнопка **MINE** (наявний `ClickButton`) + зведення поточного шару + режим Careful/Reckless + картка cave-in risk. **Уся логіка MINE / dig-mode / cave-in — наявна, не змінюється.**
- **`RightPanel.tsx`** — вгорі **завжди видима** картка ель-метра (`AleStatus`), нижче — активна панель за `activePanel` (`WorkersPanel`/`BuildingsPanel`/`UpgradesPanel`/`AdBoostsPanel`).
- **`ModalLayer.tsx`** — рендерить наявні `OfflineModal`, `Toasts`, `CreditsModal`; у sub-phase 3 додасться `SettingsModal`/`ConfirmationModal`.

`SidePanels.tsx` (старий таб-світчер) **замінюється** на `LeftNav`+`RightPanel` і видаляється.

## Зміни в `uiStore`

- Перейменувати `activeTab` → `activePanel` з повним union (стабілізуємо одразу):
  `type ActivePanel = 'overview' | 'workers' | 'buildings' | 'upgrades' | 'milestones' | 'stats' | 'adBoosts' | 'credits'`.
- `activePanel: ActivePanel` (дефолт `'workers'` у sub-phase 1; sub-phase 2 змінить на `'overview'`), `setActivePanel(p)`.
- `offlineSummary`, `toasts` та їхні екшени — без змін.

## Адаптація онбордингу (стрілки лишаються)

Користувач обрав **обидва** механізми (стрілки + Goal-card); Goal-card — у sub-phase 2. Тут — щоб **стрілки далі працювали в новому layout**:

- У `config/tutorial.ts` поле кроку `tab` семантично стає «панель» — значення лишаються (`'workers'`/`'buildings'`), але `TutorialHint` тепер ретаргетить на `data-hint="nav-<panel>"` (замість `tab-<panel>`) і порівнює з `activePanel`.
- Target-рядки кроків не змінюються (`mine-btn`, `worker-miner`, `worker-brewer`, `building-mineShaft`, `building-brewery`, `ale-status`) — елементи переїжджають у новий shell, але **зберігають свої `data-hint`**.
- Перевірити, що всі target-елементи існують у новому layout.

## Ель-метр: 3 стани (тільки відображення)

`AleStatus` перетворюється на велику читабельну картку з трьома станами:

- **Merry:** `ale/storage > 0.30` → золото/зелений, «The dwarves work merrily».
- **Low:** `0 < ale/storage <= 0.30` → оранжевий (`--warning`), «Ale is running low».
- **On Strike:** `isStriking(s)` (ель фактично 0 і працівників > 0) → червоний (`--danger`), «ON STRIKE — no ale, work crawls!».

**Важливо:** мораль у симуляції лишається бінарною (`isStriking` → ×0.4 / інакше ×1.5). «Low» — **суто візуальне попередження** перед страйком, нічого в балансі не змінює. Показуємо: ель/сховище, brew/s, drink/s (наявні формули), кольоровий бар, текст стану.

## `App.tsx` стає тонким

```
useGameLoop();
return <GameShell />;   // GameShell композить TopBar/LeftNav/MineStage/RightPanel/ModalLayer + Watchers + TutorialHint
```

Наявні компоненти переюзаються (переставлені/перестилізовані), логіка НЕ переїжджає в UI: `MineView`, `ClickButton`, `DepthPanel`(контент у MineStage), `WorkersPanel`/`BuildingsPanel`/`UpgradesPanel`, `AdBoosts`→`AdBoostsPanel`, `AleStatus`, `MuteButton`, `CreditsModal`, `OfflineModal`, `Toasts`, `Watchers`, `TutorialHint`.

## Поза скоупом sub-phase 1

- `OverviewPanel`/`MilestonesPanel`/`StatsPanel`, Goal-card, дефолт `overview` → sub-phase 2.
- `SettingsModal`/`ConfirmationModal`, персистентні UI-налаштування, particles/high-contrast/compact тумблери, перенесення Reset у Settings, volume-слайдери, `ART_CONTRACT.md` → sub-phase 3.
- Reset Save лишається в наявному `CreditsModal` до sub-phase 3.
- Растрові арт-асети — пізніше; канвас лишається темним плейсхолдером.

## Тестування й критерії приймання

- `npm run test` (75) і `npm run build` — зелені; без TS-помилок; без нових залежностей; без routing.
- Наявні механіки працюють: клік MINE додає камінь; найм; пасивне виробництво; глибина росте; ель спадає, страйк спрацьовує; будівлі відкриваються за глибиною; апгрейди; offline-модалка; save/load.
- Desktop: цілісний light-cartoon shell (TopBar/LeftNav/MineStage/RightPanel). Mobile ~375px — придатний, з BottomNav.
- Стрілки онбордингу коректно вказують у новому layout (включно з ретаргетом на nav-кнопки).
- Жодних balance-чисел, захардкоджених у UI (reveal через `BALANCE.reveal` тощо).
- UI-компоненти переважно без юніт-тестів — верифікація: build/typecheck + збережені логічні тести + візуальний плейтест власника.
