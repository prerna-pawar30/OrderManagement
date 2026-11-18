## What and why

<!-- One or two sentences. Link the ticket. -->

## Checklist (docs/CODING_STANDARDS.md)

- [ ] Commit messages follow Conventional Commits (`feat:`, `fix:`, `refactor:`, `docs:`, `chore:`)
- [ ] Every touched file is under 300 lines (`npm run lint` shows no `max-lines` warning for it)
- [ ] No `console.log`, no commented-out code, no `TODO` without `TODO(name, yyyy-mm-dd)`
- [ ] New exported functions and hooks have JSDoc (`@param`, `@returns`)
- [ ] Numbers, statuses and labels come from `src/constants/`, not magic values
- [ ] Money, dates and numbers are formatted with the shared format module (no `toFixed` / `toLocaleString` in components)
- [ ] Calculations live in `src/utils/` as pure functions **with unit tests** (`npm test`)
- [ ] Loading, empty and error states are handled on every screen touched
- [ ] Behaviour change? Describe it above and how you tested it
