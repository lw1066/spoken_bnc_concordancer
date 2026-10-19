# Spoken BNC2014 Explorer

React19+Vite+Tailwind4 frontend → Express5+better-sqlite3 API (BNC2014 corpus).
**Run:** `node backend/server.ts` (:8000) + `cd frontend && npm run dev` (:5173)

## You are in chat mode

- Tool calls do NOT execute — you cannot read files or run commands.
- If you need to see a file, ask the user to paste its contents in chat.
- Never guess, assume, or hallucinate code, file contents, API params, or behaviour. Ask first.
- When providing changes, give the complete file or exact snippet for the user to paste manually.

## Frontend (`frontend/src/`)

- `App.tsx` — orchestrates panels/modals; nearly all state in `hooks/useCorpusSearch.ts`
- Components: `SearchControls` (type/query/validation), `CollocationControls` (L/R 0–5, min freq, "Use all variants"), `VocabularyVariants` (selectable word+POS), `ConcordanceTable` (KWIC rows), `CollocationsPanel`+`CollocationDistributionChart` (recharts, clickable positions), `ResultDetailsModal` (Escape closes), `Pagination`, `resultsToolbar` (context width 1–20, rows/limit)
- `utils/posLabels.ts` — `getPosLabel`, `getPosDescription`, `getPosLabelWithClass`, `getPosDescriptionWithClass`; coverage check: `node checkPosCoverage.mjs`
- `types/corpus.ts` — `KwicResult`, `ApiResponse`, `Collocation`, `SearchType`, `UniqueWord`, `SelectedVariant`
- `useCorpusSearch` fetches `http://localhost:8000` via `URLSearchParams` (no API client); selecting a collocation swaps to `/api/collocations/concordance`

## Backend (`backend/`)

- Routes in `server.ts`: `/api/search`, `/api/collocations`, `/api/collocations/concordance` (see file for exact params)
- Services (one per feature): `wordSearchService`, `linguisticSearchService`, `phraseSearchService`, `wordCollocationService`, `phraseCollocationService`, `collocationConcordanceService`
- Helpers: `databaseHelpers` (utterance words/map), `concordanceHelpers` (KWIC context), `searchHelpers` (phrase tokenizing), `wordSearchHelpers` (wildcard→SQL)
- DB schema: `texts` → `utterances` (FTS5 on `search_body`) → `words` (indexes: word, LOWER(word), lemma, pos, class, usas, (lemma,pos), (utterance_id,position))
- Backend conventions: strict TS, NodeNext modules, typed option/result interfaces; always parameterized queries (no string interpolation); logs query timing to stdout

## Search rules

- **Word:** exact or wildcards `*`, `prefix*`, `*suffix`, `*both*`; rejects >1 wildcard unless `*both*`
- **Linguistic filters:** `lemma`, `pos`, `class`, `usas` → dispatches to `searchLinguistic`
- **Phrase:** 2+ words, **no wildcards**; iterates first-token matches, verifies via `findPhraseOccurrenceAt`
- **Collocations:** co-occurring words L/R 0–5 with min frequency; per-position distribution
