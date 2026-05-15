---
phase: 03-ai-categorization-chat
reviewed: 2026-05-15T15:45:00Z
depth: standard
files_reviewed: 19
files_reviewed_list:
  - supabase/functions/ai-categorize/index.ts
  - supabase/functions/ai-query/index.ts
  - supabase/functions/_shared/schemas.ts
  - supabase/functions/_shared/chat-schemas.ts
  - supabase/functions/_shared/prompts.ts
  - supabase/functions/_shared/chat-prompts.ts
  - supabase/functions/_shared/facts-runner.ts
  - supabase/functions/_shared/anthropic.ts
  - supabase/functions/_shared/normalize.ts
  - apps/mobile/src/lib/supabase.ts
  - apps/mobile/src/lib/secureStorage.ts
  - apps/mobile/src/services/aiCategorize.ts
  - apps/mobile/src/services/aiQuery.ts
  - apps/mobile/src/features/chat/chatStore.ts
  - apps/mobile/src/features/chat/factsPackBuilder.ts
  - apps/mobile/src/features/chat/leakDetector.ts
  - apps/mobile/src/features/chat/ChatInputRow.tsx
  - apps/mobile/src/features/chat/ChatErrorBanner.tsx
  - apps/mobile/src/features/transactions/aiCategorizeTrigger.ts
  - apps/mobile/src/features/transactions/merchantNormalize.ts
  - apps/mobile/src/features/transactions/PropagationToast.tsx
findings:
  critical: 2
  warning: 6
  info: 4
  total: 12
status: issues_found
---

# Phase 03: Code Review Report

**Reviewed:** 2026-05-15T15:45:00Z
**Depth:** standard
**Files Reviewed:** 19 (21 paths, 2 test files excluded per policy)
**Status:** issues_found

## Summary

Ревью охватывает всю цепочку Phase 3: ai-categorize Edge Function (03-01), merchant propagation (03-02), ai-query Edge Function + чат UI (03-03). Главный приоритет — AI prompt safety и data-leakage контракт.

Хорошее: GDPR-gate через zod `.strict()` работает на обоих Edge Functions; `description` не попадает к Anthropic; `merchant_key` нормализован перед отправкой; `AsyncStorage` не использован; `ANTHROPIC_API_KEY` только в `Deno.env`. Основные баги — логическая ошибка в истории retry, система prompt'а содержит несуществующее поле `tx_index`, и потенциально deadlock `buildFactsPack()` в UI-потоке.

---

## Critical Issues

### CR-01: `retryLast` включает `isError` assistant-сообщения в историю Anthropic

**File:** `apps/mobile/src/features/chat/chatStore.ts:146`
**Issue:** История для retry-запроса строится фильтром `m.role === 'user' || m.role === 'assistant'`, который включает пузыри с `isError: true`. Эти пузыри содержат строки типа `"Service unavailable"` или `"Timeout"` — они отправляются Sonnet как якобы валидные ответы ассистента. Это загрязняет контекст разговора и может вызвать некорректные ответы модели или cost-spike при многократных retry.
**Fix:**
```typescript
// chatStore.ts, строка 146 — добавить фильтр по isError
const history = get()
  .messages.filter((m) => m.role === 'user' || m.role === 'assistant')
  .filter((m): m is Extract<ChatMessage, { role: 'user' | 'assistant' }> => true)
  .filter((m) => m.id !== typingId)
  .filter((m) => m.role !== 'assistant' || !(m as Extract<ChatMessage, { role: 'assistant' }>).isError)
  // ^^^^ добавить эту строку
  .map(/* ... */);
```

---

### CR-02: Система промпт `CATEGORIZE_SYSTEM_PROMPT` содержит несуществующее поле `tx_index`

**File:** `supabase/functions/_shared/prompts.ts:51`
**Issue:** Промпт инструктирует Haiku вернуть поле `tx_index` в вызове `assign_category`, но tool `input_schema` в `ai-categorize/index.ts:160–168` это поле не объявляет (`required: ['category_slug', 'confidence']`, нет `tx_index`). Промпт описывает устаревшую batch-архитектуру (один вызов = один tx, `tx_index` всегда был бы 0). Haiku получает противоречивые инструкции: промпт требует `tx_index`, схема не разрешает. Это повышает риск отказа tool-use или hallucination slug'а, так как модель пытается уложить несуществующий параметр в closed schema.
**Fix:** Убрать `tx_index` из системного промпта; промпт должен описывать один tx на вызов:
```typescript
// prompts.ts — заменить блок описания вывода:
// БЫЛО:
//   tx_index    — zero-based index into the input array
//   category_slug — one of the closed enum below; pick the best fit
//   confidence  — 0.0..1.0 where 1.0 means certain
// СТАЛО:
//   category_slug — one of the closed enum below; pick the best fit
//   confidence    — 0.0..1.0 where 1.0 means certain
```

---

## Warnings

### WR-01: `buildFactsPack()` вызывается синхронно в UI-потоке (handleSend)

**File:** `apps/mobile/src/features/chat/ChatInputRow.tsx:104`
**Issue:** `buildFactsPack()` синхронно выполняет два `db.executeSync()` запроса к op-sqlite на главном потоке (строки 71 и 110 в `factsPackBuilder.ts`). При большой базе (13 месяцев транзакций, до 2000 merchant-записей) это блокирует JS-поток на время I/O. Вызывается в `handleSend` — критическом tap-пути.
**Fix:** Перенести `buildFactsPack()` в асинхронный вызов через `Promise.resolve().then(buildFactsPack)` или оборачивает в `requestAnimationFrame`/`InteractionManager.runAfterInteractions`. Либо вызывать при открытии sheet, а не при каждом отправлении.

---

### WR-02: `factsPackBuilder.ts` делает два `executeSync` запроса; первый почти дублирует второй

**File:** `apps/mobile/src/features/chat/factsPackBuilder.ts:71–118`
**Issue:** Первый запрос (строка 71) выбирает `amount_cents, currency, merchant_name, category_id, date` — используется только для `rows.length === 0` проверки (строка 87) и `currency` (строка 99). Второй запрос (строка 110) делает JOIN с categories и возвращает те же колонки плюс `category_slug`. Значение `currency` доступно в `joinRows` (строка 122), и `joinRows.length === 0` можно использовать как пустую проверку. Два полных scan той же таблицы.
**Fix:** Убрать первый `executeSync` запрос; использовать `joinRows`:
```typescript
if (joinRows.length === 0) { /* ... empty return ... */ }
const currency = (joinRows[0]!.currency ?? 'EUR') as 'EUR' | 'UAH';
```

---

### WR-03: `monthInRange` — некорректное сравнение верхней границы

**File:** `supabase/functions/_shared/facts-runner.ts:51`
**Issue:** `monthStart <= dateTo` сравнивает `"YYYY-MM-01"` с `"YYYY-MM-DD"`. Это работает при string sort только потому что ISO-формат лексикографически упорядочен. Но есть edge case: если `date_to = "2024-03-01"` (первый день месяца), month `"2024-03"` даёт `monthStart = "2024-03-01"`, что равно `dateTo` → включается. Это верно. Однако если пользователь не имел транзакций в марте и `date_to` подобран клиентом как последний день данных (`"2024-03-01"`), функция включит весь март даже если данных там нет. Семантически это корректно (клемп по date, не по факту данных), но комментарий на строке 50 вводит в заблуждение ("month end = first day of next month"). Реальная ошибка: для `month = "2024-03"`, `dateTo = "2024-02-15"` → `"2024-03-01" > "2024-02-15"` → excluded ✓. Логика работает, но комментарий неверен — это может скрыть будущий регрессионный баг.
**Fix:** Исправить комментарий:
```typescript
// month = 'YYYY-MM'; dateFrom/dateTo = 'YYYY-MM-DD'
// monthStart = first day of the month. Included if monthStart is within [dateFrom, dateTo] range.
return monthStart >= dateFrom.slice(0, 7) + '-01' && monthStart <= dateTo;
```

---

### WR-04: CORS `Access-Control-Allow-Origin: '*'` на обоих Edge Functions

**File:** `supabase/functions/ai-categorize/index.ts:52`, `supabase/functions/ai-query/index.ts:28`
**Issue:** Wildcard CORS разрешает запросы с любого origin. Защита — Authorization header (401 без него), но это не предотвращает CSRF-style атаки если JWT утечёт. Для Supabase Edge Functions, вызываемых только из мобильного приложения (не браузера), риск снижен — RN-клиент не подвержен CORS; но если в Phase 4/5 появится web-клиент, это станет проблемой. На Supabase wildcard — стандарт для мобильных Edge Functions, но явного ограничения нет.
**Fix (рекомендуется для Phase 4):** Ограничить origin значением из `Deno.env.get('ALLOWED_ORIGIN')` с fallback на `*` только в `development`.

---

### WR-05: `aiQuery` в `chatStore.ts` импортируется статически — потенциальный circular module

**File:** `apps/mobile/src/features/chat/chatStore.ts:19`
**Issue:** `chatStore.ts` импортирует `aiQuery` из `@services/aiQuery` статически (строка 19). `ChatInputRow.tsx` импортирует `chatStore` и делает dynamic import `aiQuery` именно чтобы избежать циркуляра (задокументировано в 03-03 SUMMARY). Но `chatStore` сам по себе уже импортирует `aiQuery` статически. Если React bundler разворачивает граф импортов при инициализации, cycle `chatStore → aiQuery → (nothing)` замыкается. Текущее состояние: `aiQuery` не импортирует `chatStore`, значит циркуляра нет. Но комментарий в `ChatInputRow` ("avoids circular at module level") вводит в заблуждение — circular существовал бы только если `aiQuery` импортировал `chatStore`. Это запутывает для будущего разработчика.
**Fix:** Убрать dynamic import в `ChatInputRow` (он не нужен для предотвращения циркуляра) или задокументировать реальную причину; пояснить в комментарии что граф `chatStore → aiQuery` уже линейный.

---

### WR-06: `persistResults` в `aiCategorizeTrigger.ts` не ожидает `updateCategoryBatch`

**File:** `apps/mobile/src/features/transactions/aiCategorizeTrigger.ts:60`
**Issue:** `persistResults` — `async` функция, вызывает `updateCategoryBatch(updates)` синхронно (строка 60), но `updateCategoryBatch` возвращает `void` (проверено: `transactionsRepo.ts:419`). Это корректно — `updateCategoryBatch` является синхронной (op-sqlite executeSync). Проблема не в await, а в том что ошибки внутри `updateCategoryBatch` (DB exception) пробросятся в `persistResults`, которая вызвана через `.then(persistResults)` — ошибка будет поймана `.catch(logCategorizeError)`. Это верно. Однако `persistResults` объявлена как `async` без какого-либо `await` внутри — это создаёт лишний Promise wrap и вводит в заблуждение.
**Fix:**
```typescript
// Убрать async — функция синхронная:
function persistResults(result: Awaited<ReturnType<typeof aiCategorizeBatch>>): void {
```

---

## Info

### IN-01: Промпт `CATEGORIZE_SYSTEM_PROMPT` описывает batch-API но функция вызывается per-row

**File:** `supabase/functions/_shared/prompts.ts:44–66`
**Issue:** "You receive **batches** of merchant payloads" — но `categorizeUserMessage([u.payload])` всегда передаёт массив из одного элемента (index.ts:179). Промпт вводит Haiku в заблуждение о ожидаемом формате ввода.
**Fix:** Изменить "batches" → "a single merchant payload"; убрать упоминание множественного числа где уместно.

---

### IN-02: `leakDetector.ts` не проверяет `monthly_category_sums` category slugs

**File:** `apps/mobile/src/features/chat/leakDetector.ts:30`
**Issue:** Detector проверяет только `top_merchants_by_month[].merchant_key`. Category slug'и (`groceries`, `transport` и т.д.) — не PII, проверять их не нужно. Это верно. Но detector не проверяет, нет ли в prose числовых паттернов из FactsPack (конкретные суммы). Это out of scope для v1, но стоит задокументировать как known gap.
**Fix:** Добавить `// TODO: Phase 5 — consider amount-pattern leak detection` комментарий.

---

### IN-03: `ChatInputRow` подавляет `react-hooks/exhaustive-deps` для `handleSend`

**File:** `apps/mobile/src/features/chat/ChatInputRow.tsx:79`
**Issue:** `eslint-disable-next-line react-hooks/exhaustive-deps` скрывает что `handleSend` не включена в deps `useEffect`. На практике не баг (т.к. `overrideText` передаётся явно), но подавление правила без объяснения — источник будущих ошибок при рефакторинге.
**Fix:** Заменить на inline eslint-disable с объяснением:
```typescript
// eslint-disable-next-line react-hooks/exhaustive-deps -- handleSend intentionally excluded:
// overrideText=prefillText is passed explicitly, so stale closure on text/messages is harmless here.
```

---

### IN-04: `factsPackBuilder.ts` использует нестандартный alias `@/src/...`

**File:** `apps/mobile/src/features/chat/factsPackBuilder.ts:24`
**Issue:** `import { normalizeMerchantKey } from '@/src/features/transactions/merchantNormalize'` — `@/*` maps to `apps/mobile/*`, так что путь разворачивается в `apps/mobile/src/features/transactions/merchantNormalize`. Работает, но `@/src/` выглядит как дублирование (`src` уже есть в пути). Остальные файлы в `src/features/` используют относительные пути для cross-feature импортов. Непоследовательно.
**Fix:** Использовать относительный путь:
```typescript
import { normalizeMerchantKey } from '../transactions/merchantNormalize';
```

---

_Reviewed: 2026-05-15T15:45:00Z_
_Reviewer: Claude Sonnet 4.6 (gsd-code-reviewer)_
_Depth: standard_
