# Signal Quest

A game that teaches programming, computer science, networking, and system design by making you
do each of them. Thirty-one missions across four chapters, plus an architecture lab where you
design a service against a latency, availability, and cost target.

## Play

Run `npm run dev` and open `http://127.0.0.1:4317`.

Everything runs in the browser with no dependencies and no build step. Progress and code drafts
are stored in this browser; if storage is unavailable, play continues for the session.

## What it teaches

**Chapter 1 — Programming** (9 missions). Sequences, debugging, `for` loops, variables,
conditionals, `while` loops, and functions, taught by driving a repair drone across a deck; then
arrays and boolean logic, taught by writing a function that is run against test cases.

**Chapter 2 — Computer science** (11 missions). Binary, bytes and hexadecimal, two's-complement
signed integers, sorting by adjacent swaps, binary search under a step budget that a linear scan
cannot meet, recursion via Euclid's algorithm, a stack used for bracket matching, hash tables and
collisions, growth rates, and shortest paths on unweighted and weighted graphs.

**Chapter 3 — Networking** (8 missions). Protocol layering and the maximum segment size, CIDR
addressing, variable-length subnet planning inside a single /24, longest-prefix-match forwarding,
window sizing against the bandwidth-delay product, retransmission strategy and wasted bandwidth
under loss, DNS resolution and caching, and the round trips before an HTTPS response's first byte.

**Chapter 4 — System design** (3 missions plus the lab). Capacity estimation, queueing and tail
latency, fan-out, redundancy arithmetic, and the trades behind eventual consistency, idempotency,
and cache invalidation. The architecture lab then gives you five contracts to design for.

## Project

A dependency-free static application. The deployable files are in `dist/`; `server.mjs` is only
the local development server, and the host serves `dist/` in production.

| File | Role |
| --- | --- |
| `dist/lang.js` | The teaching language: tokenizer, parser, static checker, interpreter |
| `dist/engine.js` | Mission evaluators: the grid simulation, data puzzles, graphs, algorithm tests |
| `dist/net.js` | Networking models: addressing, routing, encapsulation, transport |
| `dist/systems.js` | The system-design model behind the architecture lab |
| `dist/puzzles.js` | One state/widget/diagram/verdict interface for every non-coding mission |
| `dist/levels.js` | Mission content, including the solution each mission's tests check |
| `dist/game.js`, `dist/builder.js`, `dist/scene.js` | Interface and isometric renderer |
| `dist/theme.css` | Design tokens, base elements, and the light and dark colour schemes |
| `dist/app.css` | Components, composed only from those tokens |

### The interface

One design system, in two files: `theme.css` holds the tokens (type scale, 4px spacing
rhythm, elevation, motion, and every colour) and `app.css` composes components from them
only — no component hard-codes a colour or a size. That is what makes a change to the look
a change in one place.

The colour scheme follows the operating system and can be overridden with the toggle in the
header, which is then remembered. Text meets WCAG AA contrast in both schemes, icon-only
controls on small screens keep their labels in the accessibility tree, and everything honours
`prefers-reduced-motion`. The 31 missions are grouped into four collapsible chapters, each
carrying its own progress and accent colour; on a phone the rail becomes a drawer over the
mission it is currently on.

### The language

`lang.js` runs a deliberately small subset of JavaScript. Nothing is passed to `eval` or the
`Function` constructor: programs are tokenized, parsed, checked, and walked. Property access is
restricted to a whitelist, so `constructor` and `__proto__` are unreachable, and operations, call
depth, array length, and total allocation are all bounded — a program that will not finish is
stopped with an explanation rather than hanging the page.

Supported: numbers, strings, booleans, arrays, `let`, assignment and compound assignment, `++`
and `--`, arithmetic, comparison and logical operators, `if`/`else`, `for`, `while`, `break`,
`continue`, function declarations with parameters, `return`, recursion, array indexing and the
array members listed in the editor, and the `Math` functions listed in `mathMembers`.

Not supported: objects, classes, closures as values, `var`, `const`, `switch`, `try`/`catch`,
regular expressions, `async`, modules, or any host API beyond the commands a mission provides.

It is also deliberately stricter than JavaScript in five places, because silence would teach the
wrong thing: reading past the end of an array, dividing by zero, mixing types under an arithmetic
operator, assigning past the end of an array, and producing `Infinity` or `NaN` are all reported
instead of returning `undefined` or `NaN`. `tests/lang.test.mjs` pins both the agreements and
these deviations against real JavaScript.

### The models are teaching models

Every number in the networking and system-design chapters is a simplification chosen to make a
real effect visible and checkable, not to size real equipment. The game says so where it matters,
and so does this list:

- **Transport.** A deterministic sliding window: fixed serialisation delay, a fixed loss pattern,
  timeout-based recovery, no congestion control, no reordering, no delayed acknowledgements. It
  reproduces the bandwidth-delay product, window sizing, and the cost difference between
  Go-Back-N and selective repeat. It does not model congestion collapse or bufferbloat, so an
  oversized window is never punished the way it would be on a real network.
- **Architecture lab.** Each tier is an M/M/1 queue, so its 99th percentile is
  `ln(100) / (capacity − arrivals)`; the reported latency follows the slowest path a request can
  take rather than blending percentiles, which overstates the total. Cache hit ratio is
  approximated from cache size against the working set. Availability composes redundant instances
  in parallel and tiers in series. Prices, capacities, and failure rates are fictional. Real
  systems add bursty arrivals, correlated failures, coordination, and cold starts.
- **Graph missions.** Link weights are fixed delays. Real packet delay also depends on
  transmission, processing, and queueing.

Addressing, prefix matching, header arithmetic, and the binary encodings follow the real rules,
and the tests check them against independent implementations.

## Validation

Run `npm test` and `npm run check`. 72 tests across seven files:

- `tests/lang.test.mjs` — 30 programs run in both the interpreter and real JavaScript via
  `node:vm` and compared, plus the refusals, the deliberate deviations, and the bounds.
- `tests/engine.test.mjs` — collisions, native argument rules, lesson requirements, bit encodings,
  and the algorithm harness.
- `tests/net.test.mjs` — subnet arithmetic against a binary-string implementation, longest prefix
  match against an independent prefix search, every host count from 1 to 1,000, and the transfer
  simulation against its closed-form models at both ends of the window range.
- `tests/systems.test.mjs` — every contract solved by exhaustive search, the techniques each
  contract requires, the availability and cost arithmetic, and the 99th-percentile formula checked
  against a simulated M/M/1 queue.
- `tests/missions.test.mjs` — every mission's shipped solution wins, no mission starts solved,
  every mission carries its teaching material, and the concept requirements hold.
- `tests/page.test.mjs` — the checks a no-build static page otherwise lacks: every file the
  page links to exists, every id the interface looks up is in the markup, every class it
  renders has a style rule, every custom property it uses is defined, and the accessibility
  affordances are still there.
- `tests/accuracy.test.mjs` — grid programs compared against real JavaScript, every algorithm
  solution compared against itself run natively on random inputs, every graph configuration
  against path enumeration, and every puzzle's whole option space enumerated to prove it is
  winnable, not winnable by accident, and solved by the answer it ships.

A browser pass through all 31 missions and all 5 lab contracts was run with Playwright against
the development server: every mission completes from its own "show a solution" button, every
contract is met, and the page reports no script errors. The layout was checked at desktop and
390px widths in both colour schemes, with no horizontal overflow at either size.

Optional WebMCP tools feature-detect `document.modelContext`. Registration and the tool actions
have not been exercised in a browser that supports it; normal play does not require it.

## Next chapters

Possible extensions: sorting and graph algorithms written as code rather than as puzzles, a
concurrency chapter, congestion control on top of the transport model, and a storage chapter
covering durability, replication lag, and consensus.
