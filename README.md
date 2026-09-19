# Signal Quest

A beginner programming and computer science game with an orbital-station adventure, interactive puzzles, and a computer-building mode.

## Play

Run `npm run dev` and open `http://127.0.0.1:4317`.

- **Adventure & puzzles:** nine missions teach sequences, debugging, loops, variables, conditionals, binary, sorting, and unweighted/weighted graph paths.
- **Station builder:** three contracts teach resource allocation, throughput, budgets, and bottlenecks.
- Code drafts and progress stay in this browser. Storage failure does not prevent play.
- Use Run for animation, Step to inspect instructions, and hints or a sample solution when stuck.

## Project

This is a dependency-free static application. The authored deployable files are in `dist/`. `server.mjs` is only the local development server. Sites serves the static files in production.

`engine.js` parses a deliberately limited JavaScript subset without eval or dynamic function execution: numeric variables, movement calls, bounded for loops, and canMove conditionals. It does not implement arbitrary JavaScript or full block scoping. Mission content uses only the supported syntax. Parsing and execution are bounded to prevent runaway programs.

The builder is an explicitly simplified three-stage pipeline, not a hardware benchmark or purchasing tool. Its units and prices are teaching values.

## Validation

Run `npm test` and `npm run check`. The tests cover every mission solution, collision and error handling, execution bounds, graph constraints, puzzle answers, and builder contracts.

Browser interaction and visual QA were not requested and have not been performed. Optional WebMCP tools feature-detect `document.modelContext`. Registration and actions have not been verified in a supported WebMCP browser context; normal play does not require that integration.

## Next chapters

Possible extensions: functions, arrays in code, recursion, search algorithms, richer station construction, and an optional networking campaign. These are future work, not part of this first chapter.
