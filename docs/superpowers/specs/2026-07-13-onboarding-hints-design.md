# Deep Hold — онбординг-хінти для нових гравців

**Дата:** 2026-07-13
**Статус:** затверджено користувачем
**Базується на:** `2026-07-10-deep-hold-design.md` (гра v1 вже імплементована)

## Мета

Новий гравець за перші 5 хвилин має зрозуміти core loop без читання описів: клік → найм → будівництво → цикл еля → що таке страйк. Привід: на плейтесті гравець докопався до 236 м, жодного разу не скориставшись механікою еля.

## Затверджені рішення

- **Скоуп:** до циклу еля включно — 6 кроків (без плавильні, кузні, апгрейдів, Reckless).
- **Форма:** анімована стрілка-«підстрибує» + коротка текстова бульбашка біля цілі. **Не блокує гру** — хінт можна ігнорувати; жодних затемнень і примусових кліків.
- **Архітектура:** декларативний конфіг кроків + один компонент-рендерер.
- Мова текстів — англійська (як усе в грі). Показується щонайбільше **один хінт одночасно**.

## Кроки туторіалу

Порядок = порядок у конфігу. Активний хінт — перший незавершений крок, чия умова появи виконана.

| # | id | Умова появи (showWhen) | Умова завершення (doneWhen) | Ціль (data-hint) | Вкладка | Текст (EN) |
|---|----|------------------------|------------------------------|------------------|---------|------------|
| 1 | clickMine | `miner === 0 && stone < 15` | `stone >= 15 \|\| miner >= 1` | `mine-btn` | — | Click MINE to dig stone! |
| 2 | hireMiner | `miner === 0 && stone >= 15` | `miner >= 1` | `worker-miner` | workers | Hire a miner — he digs while you rest. |
| 3 | buildShaft | `mineShaft === 0 && miner >= 1 && stone >= 50` | `mineShaft >= 1` | `building-mineShaft` | buildings | Build a Mine Shaft — +3 miner slots. |
| 4 | buildBrewery | `brewery === 0 && depth >= BUILDINGS.brewery.unlockDepth` | `brewery >= 1` | `building-brewery` | buildings | The ale won't last forever — build a Brewery! |
| 5 | hireBrewer | `brewery >= 1 && brewer === 0` | `brewer >= 1` | `worker-brewer` | workers | Hire a brewer — one keeps ~30 dwarves merry. |
| 6 | strikeExplain | страйк активний (та сама умова, що в AleStatus/Watchers) | страйк закінчився; **requiresShown** | `ale-status` | — | No ale = STRIKE: work slows to 40%. Keep the ale flowing! |

Числові пороги в showWhen (15, 50) — не магічні числа, а вартості з конфігу: `WORKERS.miner.baseCost.stone`, `BUILDINGS.mineShaft.baseCost.stone`, `BUILDINGS.brewery.unlockDepth`.

## Правила життєвого циклу

- **Auto-complete:** на кожній оцінці будь-який незавершений крок, чий `doneWhen` уже істинний, тихо позначається виконаним — навіть якщо ніколи не показувався. Це гасить туторіал для старих сейвів (у ветерана всі досягнення вже є) і для гравців, що діють швидше за підказки.
- **requiresShown** (тільки крок 6): `doneWhen` оцінюється лише поки крок є активним (показаним). Інакше «страйк закінчився» був би істинним одразу на старті гри й крок зник би, не з'явившись.
- **Вкладки:** якщо ціль кроку в неактивній вкладці, стрілка вказує на кнопку цієї вкладки (`tab-workers` / `tab-buildings`) з тим самим текстом; після перемикання — на саму ціль.
- **Персистентність:** виконані кроки — нове поле `tutorialDone: string[]` у `GameState`, зберігається в сейві. Reset save (кнопка або `?reset`) → туторіал заново. Старі сейви без поля отримують `[]` через існуючий forward-compatible merge у `loadGame` — міграція і бамп `SAVE_VERSION` не потрібні.
- Якщо цільовий елемент відсутній у DOM — хінт не рендериться (без помилок).

## Архітектура

- **`src/config/tutorial.ts`** — `TUTORIAL_STEPS: TutorialStepConfig[]`:
  `{ id: string; text: string; target: string; tab?: 'workers' | 'buildings' | 'upgrades'; requiresShown?: boolean; showWhen(s: GameState): boolean; doneWhen(s: GameState): boolean }`.
  Тексти й умови — частина балансного конфігу, редагуються без коду.
- **`src/game/tutorial.ts`** — чистий оцінювач
  `evaluateTutorial(s: GameState, shownId: string | null): { toComplete: string[]; active: TutorialStepConfig | null }` — покривається юніт-тестами.
- **`src/game/store.ts`** — дія `completeTutorialStep(id: string)` (додає в `tutorialDone`, ідемпотентна); `tutorialDone: []` в `initialState()`.
- **`src/ui/TutorialHint.tsx`** — єдиний рендерер: підписаний на стор, викликає оцінювач, комітить `toComplete`, малює стрілку+бульбашку біля `[data-hint=...]` через `getBoundingClientRect` (перемірювання на кожному рендері ~10 Гц + `resize`). Монтується в `App`.
- **`data-hint`-атрибути** на цілях: кнопка MINE, кнопки вкладок у SidePanels, рядки miner/brewer у WorkersPanel, рядки mineShaft/brewery у BuildingsPanel, панель AleStatus.
- **`src/ui/uiStore.ts`** — `activeTab` переїжджає з локального стану SidePanels у uiStore (щоб рендерер знав активну вкладку).

## Візуал

Золота стрілка (▼, `--accent`) з CSS-анімацією підстрибування + бульбашка в стилі існуючих панелей (фон `--panel-2`, рамка `--accent`). Позиція — під або над ціллю залежно від місця на екрані; на мобільній ширині ті самі правила. `pointer-events: none` — хінт не перехоплює кліки.

## Тестування

- Юніт-тести (Vitest): showWhen/doneWhen кожного кроку на синтетичних станах; `evaluateTutorial` — порядок, auto-complete, requiresShown, «один активний»; ветеранський сейв → усі кроки auto-complete, active = null.
- UI — тайпчек + візуальна перевірка на dev-сервері (свіжа гра `?reset` → пройти всі 6 кроків).

## Поза скоупом

Квест-панель з цілями на всю гру, нагороди за кроки, кнопка «skip tutorial» (не потрібна — хінти не блокують), локалізація, хінти для механік після циклу еля.
