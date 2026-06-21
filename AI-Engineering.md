# AI Engineering — персональний curriculum для Vasyl

> **Для кого:** developer (~3 год/день на RALABS OptiRTC), власний проект CSD Platform (NestJS 11 / Angular 21 / AWS Lambda).
> **Темп:** сьогодні — flyover (Частина A), далі ~5–6 год/тиж step-by-step (Частина B, 10 тижнів).
> **Пісочниця:** CSD Platform (твій модерн-стек). Усі практичні завдання — на ньому.
> **Стартовий рівень:** базовий Claude Code CLI + CLAUDE.md. Поглиблюємо Skills / Hooks / Subagents / MCP / SDD.
> **3 цілі:** (1) запустити CSD MVP у production через agentic SDLC; (2) максимум щоденної продуктивності; (3) глибока теорія LLM/агентів.
> **Актуальність:** перевірено по офіційній доці `code.claude.com` / `platform.claude.com` та інженерному блогу Anthropic станом на **червень 2026**. Лінійка моделей швидко змінюється — звіряйся з live-доками.

---

## Як користуватися цим курсом

1. **Сьогодні:** прочитай Частину A (flyover, ~40 хв). Не вчи напам'ять — це карта, щоб бачити ціле.
2. **Щотижня:** бери один тиждень із Частини B. Структура кожного: **Мета · Навіщо · Вивчити · Зробити на CSD · Deliverable · Checkpoint · Maps to**.
3. **Правило:** кожен тиждень дає **матеріальний артефакт** у репозиторії CSD (файл, hook, subagent, фічу). Теорія без артефакту не зараховується.
4. **Веди learning-log:** `LEARNING-LOG.md` у репозиторії — 5 рядків на тиждень: що зробив, що зламалось, що зрозумів.
5. **RALABS:** перед використанням AI-інструментів на робочому коді перевір політику компанії. Курс свідомо побудований на твоєму особистому CSD, щоб не впиратись в обмеження.

---

# Частина A — Flyover (велика картина)

## A1. Головний зсув: ти — оркестратор, а не друкарка коду

Старий режим: «напиши код». Новий режим: **«керуй агентом, який пише код»**. Твоя цінність зміщується з набору символів на: чітку постановку задачі, проектування контексту, перевірку результату.

Рамка **AI Fluency 4D** (тримай у голові весь курс):

| D | Що це | Приклад на CSD |
|---|---|---|
| **Delegation** | Що віддати агенту, що лишити собі | «Згенеруй CRUD-endpoint» — агенту; «вибір архітектури аутентифікації» — собі |
| **Description** | Наскільки точно ти описав намір | spec.md з acceptance-критеріями замість «зроби логін» |
| **Discernment** | Чи вмієш оцінити якість виводу | помітити N+1 запит у згенерованому TypeORM-коді |
| **Diligence** | Безпека, перевірка, відповідальність | не закомітити secret, прогнати тести, прочитати diff |

## A2. Agentic loop — як працює будь-який кодинг-агент

```
observe → think → act → (repeat) → verify
(прочитати  (спланувати  (викликати   (цикл       (перевірити
 файли)      крок)        tool)         поки треба)  результат)
```

Coding-агент = **LLM + Tool Use + loop**. LLM сам по собі лише генерує текст; інструменти (Read/Write/Bash/MCP) дають руки; loop дає автономність. Розуміння цього циклу пояснює все інше: чому контекст вигорає, навіщо hooks, навіщо subagents.

## A3. The Agent Development Kit — 5 шарів (і ЩО це насправді у файлах)

Картинка `agent-dev-kit/` стилізована. Ось **реальне** відображення на Claude Code:

| Шар | Призначення | На картинці | **Реальні файли/механізм** |
|---|---|---|---|
| **L1 · Memory** | правила, конвенції, пам'ять проекту | `CLAUDE.md/` з `architecture.rules`, `global.md`, `project.md` | **`./CLAUDE.md`** (проект, у git) + **`~/.claude/CLAUDE.md`** (глобально) + **`./.claude/CLAUDE.local.md`** (особисте, у .gitignore). «architecture.rules» = звичайний `architecture.md`, підключений через `@architecture.md` |
| **L2 · Knowledge** | експертиза «на вимогу» | `skills/` з `SKILL.md`, `scripts/`, `context.md` | **`.claude/skills/<name>/SKILL.md`** + `scripts/` + `reference.md`/`examples.md`. ⚠️ `context.md` — НЕ конвенція; використовуй `reference.md` |
| **L3 · Guardrail** | детермінований контроль якості | `hooks/` з `PreToolUse.sh`, `PostToolUse.sh`, `SessionStart.sh` | конфіг у **`.claude/settings.json` → `"hooks"`** (matcher + команда). Скрипти можуть бути `.sh`, але реєструються вони в settings, не як окремі файли-події |
| **L4 · Delegation** | ізоляція контексту, делегування | `subagents/` з `code-reviewer.md`, `test-runner.md`, `explorer.md` | **`.claude/agents/<name>.md`** (frontmatter: `name`, `description`, `tools`, `model`). Кожен субагент — окреме контекстне вікно, повертає лише підсумок |
| **L5 · Distribution** | пакування й роздача команді | `plugins/` з `manifest.json`, `marketplace.url`, `team.install` | **`.claude-plugin/plugin.json`** (manifest) + **`.claude-plugin/marketplace.json`**; `marketplace.url` → `extraKnownMarketplaces` у settings; `team.install` → команда **`claude plugin add <url>`** |

**Логіка стека (знизу вгору цінності):** CLAUDE.md *задає правила* → Skills *дають експертизу* → Hooks *примушують якість* → Subagents *делегують роботу* → Plugins *роздають команді*.

## A4. Дві бічні рейки: MCP і Agent Teams

- **MCP (Model Context Protocol)** — єдиний протокол, яким агент під'єднує зовнішні інструменти/дані: GitHub, Postgres, Playwright, твої власні сервери. Примітиви: **Tools** (дії), **Resources** (дані для читання), **Prompts** (шаблони). Додається через `claude mcp add` або `.mcp.json`. Це «L0/L6» — capability layer збоку.
- **Agent Teams** — кілька повноцінних агентів паралельно (shared task list, peer messaging, file locking). Експериментально. ⚠️ Anthropic прямо попереджає: мульти-агент **~15× токенів** і **поганий fit для більшості кодингу** (послідовного, зі спільним контекстом). Використовуй для breadth-first паралелізованих задач, не за замовчуванням.

## A5. Уніфікований SDLC-цикл (серце курсу)

Усі «фреймворки» (Spec-Driven Development, GSD, plan mode) — це один цикл:

```
(discuss / clarify) → spec/plan → tasks → implement → verify
                          ▲                              │
                          └──── human approval gate ─────┘
```

Externalize намір у **рев'юабельні артефакти** (`spec.md`, `plan.md`), і **завжди** давай агенту сигнал перевірки (тести / Stop hook / review-субагент). Anthropic-loop: **Explore → Plan → Implement → Commit** з людським gate перед кодом.

**Коли SDD допомагає, а коли заважає** (важливо — не роби spec на все):

| SDD варто | SDD = зайвий overhead |
|---|---|
| greenfield / 0→1, складна фіча | typo, однорядковий фікс |
| команда, потрібні спільні артефакти | зрозумілий CRUD |
| compliance / дорогі регресії | прототип на викид |

> Anthropic: *«Якщо diff описується одним реченням — пропусти план.»*

## A6. Рубрика контекст-інженерії: що куди класти

Контекст — обмежений ресурс, він **деградує** при заповненні («context rot»). Мета — *найменший набір високосигнальних токенів*. Куди що:

| Механізм | Для чого | Поведінка токенів |
|---|---|---|
| **CLAUDE.md** | завжди-потрібні правила, команди build/test, конвенції | вантажиться повністю щосесії → тримай **≤200 рядків** |
| **Skills** | ситуативні процедури/runbooks | progressive disclosure: ім'я+опис завжди (~100 ток), тіло — при тригері |
| **Hooks** | те, що **мусить** статися щоразу | детерміновано, поза LLM (CLAUDE.md лише *радить*) |
| **MCP** | «запитай / дістань / поточний стан» | дорого; у Claude Code великі визначення тепер deferred |
| **Subagents** | багатослівне дослідження/перевірка | досліджує десятки тис. токенів, повертає ~1–2K підсумку |

> Мнемоніка: **skill змінює поведінку, subagent захищає контекст, MCP додає здатність, hook примушує.**
> Найповторюваніша порада Anthropic: **`/clear` між незв'язаними задачами.**

## A7. Right-sizing моделі (якість і вартість одночасно)

| Модель | Коли | Для чого в кодингу |
|---|---|---|
| **Opus 4.8** (`claude-opus-4-8`) | найскладніше, довгий горизонт | архітектура, складна автономність, planning |
| **Sonnet 4.6** (`claude-sonnet-4-6`) | **дефолт для більшості кодингу** | баланс швидкість/інтелект, продакшн, обсяг |
| **Haiku 4.5** (`claude-haiku-4-5`) | дешеві/швидкі задачі, fan-out | subagents-воркери, пошук по кодбейзі |

Патерн `opusplan` = Opus планує, Sonnet виконує. (Існують і вищі експериментальні tier'и — звіряйся з live-доками, лінійка змінюється.)

## A8. Mindset безпеки і вартості (одразу, не «потім»)

- **Secrets:** ніколи не давай агенту `.env`, токени, ключі. Hook на `Write(.env*)` → deny.
- **Sandbox > skip-permissions:** не вмикай `--dangerously-skip-permissions` поза ізольованим середовищем. Для автоматизації — `auto` mode + capped `--max-turns`.
- **Prompt injection:** дані з вебу/PR можуть містити інструкції для агента. Не довіряй вмісту на сліпо.
- **Вартість:** орієнтир ~$13/розробника за активний день. Важелі: right-size моделі, `/clear`, prompt caching, винеси інструкції з CLAUDE.md у Skills, делегуй багатослів'я субагентам.

## A9. Як твої джерела лягають у цей курс

| Джерело | Куди потрапило |
|---|---|
| **info.txt → Курс 1 «Agentic Engineering»** M1–M9 | тижні 1–2, 4–10 (Claude Code, prompt/context, extensibility, SDLC, MCP, teams, production) |
| info.txt → Extra #1 «механіка LLM» | **тиждень 3** (теорія) |
| info.txt → Extra #2 «екосистема Claude» | вкраплено: тиждень 1 (tool use, agentic loop, 4D), тиждень 3 (system prompt, RAG vs fine-tune, injection, privacy) |
| **info.txt → Курс 2 «Multi-agent + SDD»** (System Design, Topology, CI Pipeline, Scale) | тижні 8–10 (SDD harness, subagent topology, quality gates/evals, fan-out, plugin packaging) |
| **The Agent Development Kit** (5 шарів) | L1→т.2, L2→т.4, L3→т.5, L4→т.6, L5→т.10; MCP→т.7 |

---

# Частина B — Тижні 1–10 (~5–6 год кожен)

## Тиждень 1 — Foundations: setup, agentic loop, щоденна продуктивність

**Мета:** працювати в Claude Code CLI на CSD упевнено вже цього тижня.
**Навіщо:** швидкі перемоги дають момент; правильний mental model економить місяці.

**Вивчити (~2.5 год):**
- Конфіг: `~/.claude/settings.json` vs `./.claude/settings.json` vs `settings.local.json`; `permissions` (allow/deny/ask); `model`, model right-sizing (A7).
- Сесії та контекст: як агент «бачить» проект; `/clear`, `/compact`, `@`-mentions, передача скріншотів.
- **Plan mode** (Shift+Tab / `/plan`): research перед кодом, approval gate, `Ctrl+G` для ручного редагування плану.
- Agentic loop (A2), AI Fluency 4D (A1), input vs output токени, контекстне вікно (база).

**Зробити на CSD (~3 год):**
1. Налаштуй `./.claude/settings.json`: дозволь `Bash(npm run *)`, `Edit/Write(src/**)`; заборони `Write(.env*)`, `Bash(rm -rf *)`, `Bash(git reset --hard*)`. Постав `model`.
2. Виконай 3 реальні задачі **через plan mode**: (а) новий NestJS DTO+валідація; (б) фікс ESLint-зауважень у модулі; (в) «поясни цей Angular signal-компонент».
3. Заведи `LEARNING-LOG.md`.

**Deliverable:** робочий `.claude/settings.json` + особистий cheat-sheet топ-команд.
**Checkpoint:** можеш пройти задачу plan→approve→implement без ручного кодингу; розумієш, коли plan mode зайвий.
**Maps to:** info.txt M1, M2(част.), Extra#1(токени), Extra#2(4D, loop) · kit L1(intro).
**Docs:** `code.claude.com/docs/en/settings`, `/permission-modes`, `/best-practices`.

---

## Тиждень 2 — L1 Memory: CLAUDE.md + context engineering

**Мета:** перетворити CSD на проект, який агент «розуміє» з першого рядка.
**Навіщо:** CLAUDE.md — найвищий leverage-артефакт; context engineering — фундаментальна дисципліна.

**Вивчити (~2 год):**
- Ієрархія пам'яті: enterprise → user (`~/.claude/CLAUDE.md`) → project (`./CLAUDE.md`) → local (`CLAUDE.local.md`); усі застосовуються разом.
- Синтаксис імпорту `@path/to/file` (до 4 hops; не працює в code-блоках).
- Правило **≤200 рядків** (роздутий CLAUDE.md ігнорується); рубрика A6 (що в CLAUDE.md vs Skills vs MCP).
- Context rot, compaction (що виживає: project-root CLAUDE.md перечитується з диска).
- Prompt-патерни: few-shot, Chain-of-Thought, system vs user prompt.

**Зробити на CSD (~3.5 год):**
1. Напиши `./CLAUDE.md` для CSD: стек (NestJS 11/TypeORM/PG16; Angular 21 standalone+signals+SSR; Lambda/API GW/RDS/S3/CloudFront; Serverless v4; Passport+JWT), команди build/test/lint, конвенції іменування, «завжди роби / ніколи не роби».
2. Винеси деталі в окремі файли й підключи через `@`: `@docs/architecture.md`, `@docs/api-conventions.md`.
3. Додай `~/.claude/CLAUDE.md` з особистими преференсами (мова відповідей, стиль, лінтери).

**Deliverable:** `CLAUDE.md` ≤200 рядків + `docs/architecture.md`.
**Checkpoint:** новий чат одразу знає, як у CSD називати endpoint і чим тестувати.
**Maps to:** info.txt M2, M4.5 · kit L1 · Course2 System Design(CLAUDE.md ≤200).
**Docs:** `code.claude.com/docs/en/memory` · `anthropic.com/engineering/effective-context-engineering-for-ai-agents`.

---

## Тиждень 3 — Теорія: механіка LLM під капотом

**Мета:** розуміти, *чому* агент поводиться так, щоб краще промптити, дебажити галюцинації й рахувати вартість.
**Навіщо:** твоя ціль №3; ця база відрізняє «оператора» від «інженера».

**Вивчити (~4 год):**
- Токени та embeddings: як текст → числа; чому це впливає на ліміти й ціну.
- Attention (спрощено), stateless inference (модель не пам'ятає між сесіями), training vs inference.
- Стохастичність: `temperature`, `top_p` — чому один промпт дає різні відповіді.
- Reasoning vs standard / extended thinking: коли потрібне «думання» (і що воно тарифікується як output).
- Галюцинації: чому впевнено бреше; стратегії захисту.
- Екосистема: Tool Use/Function Calling, **fine-tuning vs prompting vs RAG** (3 способи адаптації), prompt injection, data privacy.

**Зробити (~1.5 год, експерименти):**
1. Один промпт × `temperature` 0/0.5/1 — порівняй вивід.
2. Виміряй токени/вартість реальної CSD-задачі (`--output-format json` → `total_cost_usd`).
3. Спровокуй галюцинацію (спитай про неіснуючий API CSD) і злови її.

**Deliverable:** `docs/notes/LLM-internals.md` + особистий «hallucination defense» чеклист.
**Checkpoint:** можеш пояснити колезі різницю RAG vs fine-tune і коли що.
**Maps to:** info.txt Extra#1(повністю), Extra#2(injection, privacy, RAG).
**Docs:** `platform.claude.com/docs/en/build-with-claude/context-windows`.

---

## Тиждень 4 — L2 Knowledge: Skills

**Мета:** закодувати повторювані CSD-патерни як skills із progressive disclosure.
**Навіщо:** skills дають експертизу на вимогу без роздування контексту.

**Вивчити (~2 год):**
- `SKILL.md` frontmatter: `name`, `description` (по ньому агент вирішує, коли викликати), `allowed-tools`, `disable-model-invocation`.
- Структура `.claude/skills/<name>/`: `SKILL.md` + `scripts/` + `reference.md`/`examples.md`.
- Model-invoked vs user-invoked (`/skill-name`); skills vs commands vs subagents (A6).
- Принцип: тіло SKILL.md тримай коротким; великі довідки — окремими файлами.

**Зробити на CSD (~3.5 год) — 3 skills:**
1. `nestjs-resource` — скафолдить controller+service+DTO+spec за патернами CSD.
2. `angular-signal-component` — standalone-компонент на signals + тест.
3. `pr-description` — генерує текст PR із git-diff (зі скриптом у `scripts/`).

**Deliverable:** 3 робочі skills у `.claude/skills/`.
**Checkpoint:** агент сам викликає `nestjs-resource`, коли просиш «новий ресурс», без явної команди.
**Maps to:** info.txt M3.2 · kit L2 · Course2 System Design(Skills layer, 3+ skills).
**Docs:** `code.claude.com/docs/en/skills` · `anthropic.com/engineering/equipping-agents-for-the-real-world-with-agent-skills`.

---

## Тиждень 5 — L3 Guardrail: Hooks + custom commands

**Мета:** детерміновані guardrails, що тримають якість і безпеку без надії на модель.
**Навіщо:** те, що **мусить** статися щоразу, — це hook, а не порада в CLAUDE.md.

**Вивчити (~2 год):**
- Події: `PreToolUse`, `PostToolUse`, `SessionStart`, `UserPromptSubmit`, `Stop`, `SubagentStop`, `PreCompact` (є й інші).
- Конфіг у `.claude/settings.json → "hooks"`: `matcher` + `type:"command"` + `command`.
- I/O контракт: вхід — JSON на stdin; вихід — exit 0 + JSON `{"decision":"deny","reason":...}`; `updatedInput`/`updatedToolOutput`.
- Custom slash-commands: `.claude/commands/<name>.md` ($ARGUMENTS, frontmatter).

**Зробити на CSD (~3.5 год):**
1. `PreToolUse`(Bash) → `hooks/block-dangerous-bash.sh`: блок `rm -rf`, `git reset --hard`, запис у `.env`.
2. `PostToolUse`(Write|Edit) → `hooks/format-on-write.sh`: prettier+eslint на `*.ts`.
3. `SessionStart` → друкує поточну гілку + нагадує конвенції CSD.
4. Команди `/spec` і `/commit` (шаблони plan→spec і conventional-commit).

**Deliverable:** `hooks` block у settings + 2 hook-скрипти + 2 команди.
**Checkpoint:** агент фізично не може видалити `.env`; кожен збережений `.ts` автоформатиться.
**Maps to:** info.txt M3.3–3.4 · kit L3 · Course2 CI Pipeline(3 hooks).
**Docs:** `code.claude.com/docs/en/hooks` · `/hooks-guide` · `/slash-commands`.

---

## Тиждень 6 — L4 Delegation: Subagents

**Мета:** делегувати багатослівну роботу в ізольований контекст, тримаючи головний чистим.
**Навіщо:** субагент досліджує десятки тис. токенів, а повертає 1–2K підсумку.

**Вивчити (~2 год):**
- `.claude/agents/<name>.md`: frontmatter `name`, `description`, `tools`, `model` (Haiku для дешевих воркерів).
- Ізоляція контексту: стартує «чистим», не бачить історію батька.
- Auto-invoke через `description`; вбудовані Explore/Plan.
- Коли субагент допомагає vs шкодить (не дроби тривіальне).

**Зробити на CSD (~3.5 год) — 3 субагенти:**
1. `code-reviewer.md` — рев'ю diff на security/perf/maintainability (tools: Read + `git diff`), модель Sonnet/Opus.
2. `test-runner.md` — ганяє Jest/Karma, повертає лише фейли (модель Haiku).
3. `explorer.md` — швидкий пошук по кодбейзу CSD (read-only, Haiku).

**Deliverable:** 3 субагенти у `.claude/agents/`.
**Checkpoint:** «зроби рев'ю поточних змін» делегується, головний контекст не роздувається.
**Maps to:** info.txt M8.1–8.2 · kit L4 · Course2 Agent Topology(5 subagents, dispatch matrix).
**Docs:** `code.claude.com/docs/en/sub-agents`.

---

## Тиждень 7 — MCP: Model Context Protocol

**Мета:** під'єднати зовнішні інструменти (БД, GitHub, browser) і зробити свій MCP.
**Навіщо:** MCP — єдиний протокол, що дає агенту реальні «руки» поза репо.

**Вивчити (~2.5 год):**
- Архітектура клієнт-сервер; примітиви **Tools / Resources / Prompts**.
- Додавання: `claude mcp add ...`, `.mcp.json` (scopes local/project/user), transports stdio/SSE/HTTP.
- Token-вартість MCP: великі визначення тепер deferred; вмикай лише потрібні (`/mcp`, `/context`).
- Готові сервери: Postgres, GitHub, Playwright (browser automation).

**Зробити на CSD (~3 год):**
1. Підключи **Postgres MCP (read-only)** до локальної CSD-БД; попроси агента описати схему й знайти повільний запит.
2. Підключи **Playwright MCP**; зроби smoke-E2E логіну Angular.
3. Напиши **власний MCP-сервер ~50 рядків** (TS): один tool, напр. `get_csd_deploy_status`.

**Deliverable:** `.mcp.json` з 2 серверами + власний MCP-сервер у `tools/mcp/`.
**Checkpoint:** агент читає схему БД і ганяє браузерний тест через MCP.
**Maps to:** info.txt M6 · kit MCP rail · Course2 Topology(custom MCP ~50 рядків, token budget, hybrid Skill+MCP).
**Docs:** `code.claude.com/docs/en/mcp` · `anthropic.com/engineering/code-execution-with-mcp`.

---

## Тиждень 8 — SDLC keystone: Spec-Driven Development фічі на CSD

**Мета:** провести **одну реальну CSD-фічу** через spec→plan→implement→verify (backend+frontend+тести).
**Навіщо:** це твоя ціль №1 у мініатюрі; тут сходяться всі попередні шари.

**Вивчити (~2 год):**
- SDD-цикл (A5); spec-first vs spec-anchored vs spec-as-source; межа overhead (коли НЕ робити spec).
- Артефакти: `spec.md` (user stories + acceptance GIVEN/WHEN/THEN), `plan.md`, `tasks`.
- TDD з агентом: тест перший → код → рефактор; feedback loops (скріншоти, browser, автотести).
- «Інтерв'ю мене»: дай агенту через `AskUserQuestion` уточнити spec, потім **свіжа сесія** на імплементацію.

**Зробити на CSD (~4 год):**
1. Обери фічу MVP (напр. «CRUD + фільтр для сутності X з JWT-захистом»).
2. Згенеруй `specs/feature-x/spec.md` + `plan.md` (через `/spec`, `/plan`).
3. Імплементуй TDD: NestJS endpoint (+ TypeORM міграція) → Angular signal-компонент → unit+integration+E2E.
4. Verify: тести зелені + рев'ю-субагент (т.6) по diff.

**Deliverable:** змерджена фіча + `specs/feature-x/{spec,plan}.md`.
**Checkpoint:** фіча працює end-to-end; spec відповідає коду (зроби `retro-spec` якщо розійшлось).
**Maps to:** info.txt M4–M5 · Course2 CI Pipeline(spec.md+plan.md, feature, retro-spec).
**Docs:** `code.claude.com/docs/en/best-practices` · GitHub Spec Kit (`github.com/github/spec-kit`).

---

## Тиждень 9 — Quality gates: review, CI/CD, evals, headless

**Мета:** автоматизувати якість і навчитись довіряти агенту через evals.
**Навіщо:** без evals ти сам стаєш loop'ом перевірки; evals — це unit-тести для агентів.

**Вивчити (~2.5 год):**
- Git-workflow з агентом: branches/commits/PR; `@claude` у GitHub Issues/PR; `claude-code-action` у GitHub Actions (incl. `schedule:` cron).
- **Evals:** 20–50 golden-задач із реальних фейлів; грейдери (code-based → LLM-as-judge → human); **оцінюй результат, не шлях**; capability vs regression; **читай транскрипти**; pass@k vs pass^k.
- Headless: `claude -p`, `--output-format json`, `--allowedTools`, fan-out по файлах; ризики й guardrails (sandbox, auto mode, capped turns).
- Автоген: README, ADR, changelog.

**Зробити на CSD (~3 год):**
1. Налаштуй GitHub Action: `@claude` рев'ю на PR.
2. Створи `evals/` із 20 trace-задач для свого `nestjs-resource` skill; зміряй with vs without (`skill-creator` eval mode).
3. Headless fan-out: маленька міграція по N файлах через `for ... claude -p`.

**Deliverable:** CI з Claude-рев'ю + `evals/` (20 задач) + один headless-скрипт.
**Checkpoint:** PR отримує автоматичне рев'ю; ти бачиш pass-rate свого skill у числах.
**Maps to:** info.txt M7, M8.4 · Course2 CI Pipeline(plan-verifier у CI, 20-trace eval, mutation report).
**Docs:** `anthropic.com/engineering/demystifying-evals-for-ai-agents` · `code.claude.com/docs/en/github-actions` · `/headless`.

---

## Тиждень 10 — Scale, distribution, production: ship CSD MVP

**Мета:** масштабувати (worktrees/teams), запакувати в plugin, задеплоїти CSD MVP.
**Навіщо:** фінальна ціль №1 + оформлення портфоліо AI-навичок.

**Вивчити (~2 год):**
- Паралелізм: git **worktrees** (`claude --worktree`), `isolation: worktree` у субагентах; стеля ~3–5 агентів, «один файл — один власник»; Agent Teams (експ., ~15× токенів — обережно).
- L5 Distribution: `.claude-plugin/plugin.json`, `marketplace.json`, `extraKnownMarketplaces`, `claude plugin add` (роздача команді).
- Production: secrets/.env, cost management (right-size, caching, `/clear`), Claude API в інтеграціях, деплой SaaS, безпека.

**Зробити на CSD (~4 год):**
1. Запакуй свої skills+agents+hooks у **plugin** (`harness`-bundle) із `plugin.json`.
2. Worktree fan-out: 2–3 паралельні незалежні задачі на CSD + лог результатів.
3. Задеплой CSD MVP (Serverless v4 + GitHub Actions → Lambda/API GW/RDS).
4. Онови резюме/LinkedIn секцією AI-engineering з артефактами курсу.

**Deliverable:** `harness`-plugin + задеплоєний CSD MVP + оновлене портфоліо.
**Checkpoint:** колега ставить твій plugin одним `claude plugin add`; MVP живий у production.
**Maps to:** info.txt M8–M9 · kit L5 · Course2 Scale(fan-out, plugin packaging, 30-day rollout).
**Docs:** `code.claude.com/docs/en/worktrees` · `/plugins` · `/plugin-marketplaces` · `anthropic.com/engineering/multi-agent-research-system`.

---

# Частина C — Капстоун і далі

- **Капстоун (наскрізний):** CSD MVP, побудований агентним SDLC, задеплоєний, з власним harness-plugin. Це і є доказ опанування.
- **Ongoing-треки після 10 тижнів:**
  - *Spec-as-source:* веди фічі так, щоб spec лишався джерелом правди (retro-spec на старе).
  - *Evals-driven:* нарощуй golden-набір; кожен баг → нова eval-задача.
  - *Cost-дисципліна:* щомісяця дивись токени/вартість, оптимізуй.
  - *Node.js deep-dive:* окремо є skill-ментор по внутрішностях Node (event loop, V8, streams) — синхронізуй із CSD-бекендом.
- **Перевір RALABS-політику**, перш ніж переносити harness на робочий код.

---

# Додаток 1 — Реальна структура `.claude/` (виправляє картинку)

```
~/.claude/
├── CLAUDE.md                 # глобальні преференси (усі проекти)
├── settings.json             # особисті дефолти
└── skills/  agents/          # переюзабельні особисті

<csd-repo>/
├── CLAUDE.md                 # L1: пам'ять проекту (≤200 рядків, у git)
├── .claude/
│   ├── CLAUDE.local.md       # особисте по проекту (.gitignore)
│   ├── settings.json         # L3: permissions + "hooks" block (у git)
│   ├── settings.local.json   # особисті оверайди (.gitignore)
│   ├── skills/<name>/SKILL.md # L2 (+ scripts/, reference.md)
│   ├── agents/<name>.md      # L4 (code-reviewer, test-runner, explorer)
│   ├── commands/<name>.md    # slash-команди (/spec, /commit)
│   └── hooks/*.sh            # скрипти, на які посилається settings
├── .mcp.json                 # MCP-сервери (Postgres, Playwright, custom)
├── docs/architecture.md      # підключається через @ у CLAUDE.md
├── specs/feature-x/{spec,plan}.md
├── evals/                    # golden-задачі
└── .claude-plugin/
    ├── plugin.json           # L5: manifest (з картинки "manifest.json")
    └── marketplace.json      # роздача команді ("marketplace.url"/"team.install")
```

# Додаток 2 — Перевірені ресурси (червень 2026)

**Офіційні (Claude Code):** memory, settings, permission-modes, skills, hooks, sub-agents, mcp, plugins, slash-commands, headless, worktrees, github-actions, best-practices — усі на `code.claude.com/docs/en/<тема>`.
**Інженерний блог Anthropic** (`anthropic.com/engineering/`): `effective-context-engineering-for-ai-agents` · `code-execution-with-mcp` · `demystifying-evals-for-ai-agents` · `multi-agent-research-system` · `building-effective-agents` · `equipping-agents-for-the-real-world-with-agent-skills`.
**Платформа/моделі:** `platform.claude.com/docs/en/about-claude/models/overview` · `/build-with-claude/context-windows`.
**SDD-тулінг:** `github.com/github/spec-kit` · `kiro.dev/docs/specs`.

# Додаток 3 — Глосарій

- **Agentic loop** — observe→think→act→repeat→verify.
- **Context rot** — деградація якості при заповненні контекстного вікна.
- **Progressive disclosure** — skill вантажить тіло лише при тригері.
- **Hub-and-spoke** — lead + воркери (офіційний мульти-агентний патерн); peer-mesh — агенти спілкуються напряму (рідко в проді).
- **pass@k / pass^k** — ≥1 успіх із k спроб / усі k успішні.
- **Spec-as-source** — людина редагує лише spec, код генерується.
- **Right-sizing** — добір моделі під складність задачі.
- **Backpressure** — тести/лінтери, що відсікають поганий вивід у loop.
