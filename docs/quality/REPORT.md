# Clean-up report — OrderManagement

What was changed to make this code easy for a new developer to read, and how we checked that the app still behaves exactly the same.

## What changed

1. **Tooling:** ESLint (flat config), Prettier, EditorConfig, Husky + lint-staged pre-commit hook, npm scripts (`lint`, `format`, `metrics` ...). All code is formatted by Prettier.
2. **Dead code removed:** commented-out code, unused imports, stray `console.log` lines and file-wide `eslint-disable` lines.
3. **Clear names:** 677 one- and two-letter or cryptic names replaced by full English words (`inv` -> `invoice`, `cn` -> `creditNote`, `s` -> `statusKey` ...). Renames were done with scope analysis, so no other variable was touched.
4. **Big files split where it was safe:** helper components, hooks, calculations and constants that sat at the top of large pages moved into their own files in `components/`, `hooks/`, `utils/` and `constants/`. Identical copies were merged into one.
5. **English-only comments:** Hindi / Hinglish comments translated, emojis and notes-to-self removed.
6. **File headers:** every file in `src/` starts with what it is for, its route or screen key, who uses it and which API calls it makes.
7. **JSDoc:** 36 shared functions, hooks and services documented with parameters, return value and, for money rules, a worked example.
8. **Docs:** `README.md` (run, env, scripts, where is what, folder map), `docs/FEATURE_MAP.md`, `docs/GLOSSARY.md`, `docs/CODING_STANDARDS.md` (v3).

Folders, file names, routes, API calls and the UI were **not** changed.

## How we checked nothing broke

The original and the new code were each bundled with esbuild and compared after removing differences that cannot change behaviour (variable names, comments, formatting, the order of top-level declarations, where a declaration lives). Result:

- JavaScript: identical.
- CSS: identical.
- Assets: identical.

## Numbers

| | Before | After |
|---|---:|---:|
| Source files | 56 | 78 |
| Total lines | 18075 | 16367 |
| Files over 300 lines | 17 | 18 |
| Comment lines | 5032 | 1566 |
| Commented-out code lines | 2878 | 1 |
| console.* calls | 12 | 12 |
| Unexplained numbers | 671 | 671 |
| Nested ternaries | 37 | 37 |

Why more lines: Prettier puts long lines (props, arguments, class lists) on several lines, and every file now has a header and JSDoc. The code itself did not grow. 'Files over 300 lines' went up for the same reason; splitting them is listed below.

ESLint now: **0 errors**, 822 warnings. Warnings by rule: `no-magic-numbers` 671, `max-lines-per-function` 76, `no-nested-ternary` 37, `max-lines` 15, `no-console` 12, `id-length` 4, `max-depth` 4, `no-unused-vars` 2, `no-empty` 1.
Warnings are the next clean-up targets (see `docs/CODING_STANDARDS.md` section 11.1a). The React hooks rules could not be run here because the npm registry was blocked; run `npm run lint` after `npm install`.

## Left for the team (needs the running app or a business decision)

- Money display: dashboards show whole rupees, invoices show 2 decimals. Decide if that is intended (we did not change it).
- Still large: `pages/CreateInvoicePage.jsx`, `pages/CreateOrderPage.jsx`, `components/invoice/UpdateInvoiceModal.jsx`, `pages/AnalyticsPage.jsx`. Their inner logic needs splitting with the app running and tests in place.
- Unexplained numbers (`no-magic-numbers`) and nested ternaries: fix file by file when you touch a file.

## Before you merge

1. `npm install` (installs ESLint, Prettier, Husky).
2. `npm run lint` and `npm run build`.
3. Click through the screens in `docs/FEATURE_MAP.md`, especially the money screens.
