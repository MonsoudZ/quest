# Signal Quest

A game that teaches programming, computer science, networking, and system design by making you
do each of them. Fifty-four missions across four chapters, plus an architecture lab where you
design a service against a latency, availability, and cost target.

## Play

Run `npm run dev` and open `http://127.0.0.1:4317`.

Everything runs in the browser with no dependencies and no build step. Progress and code drafts
are stored in this browser; if storage is unavailable, play continues for the session.

## What it teaches

**Chapter 1 — Programming** (24 missions). Sequences, debugging, `for` loops, variables,
conditionals, `while` loops, and functions, taught by driving a repair drone across a deck. Then
the function console takes over: arrays and boolean logic, records, nested loops over a grid,
binary search under a step budget a linear scan cannot meet, recursion via Euclid's algorithm, a
stack used for bracket matching, and a two-mission capstone that tokenises an expression and then
evaluates it with `*` binding tighter than `+`. Two missions here are not write-it-from-scratch
missions at all:

- a **debug** mission hands you a program that compiles, runs, and is wrong in three separate
  ways, and asks you to read the failing cases rather than start again;
- a **refactor** mission hands you a program that passes every case and rejects it anyway,
  because it walks the data with a loop inside a loop. The console judges the shape of the
  answer — loop count, loop nesting, calls made — as well as its values. A second one is about
  readability rather than speed: a decision spelled out inside a loop, which has to be pulled
  out and given a name;
- a **spec** mission turns the console around. The code is written and the tests are not: you
  return a list of cases, and the console runs them against one correct implementation and four
  broken ones. Every expectation has to be right, and every broken version has to be rejected.
  A suite of happy paths accepts all four, which is the lesson.

Four more missions go deeper: **memoisation**, where the obvious recursion is correct and
unusable and the fix is a record; **aliasing**, where a sort returns the right answer and
rearranges the caller's log, because an array is passed by reference; **merge sort**, under a
step budget the quadratic version misses by forty-eight times; and the extraction refactor above.

The chapter closes by reading the same function in JavaScript, Python, Ruby, Go, and Rust. Several
missions carry a read-only **language panel** showing the same idea in all five, with a note on
what each language makes you declare. Only the JavaScript subset runs; the rest is for reading.

**Chapter 2 — Computer science** (13 missions). Binary, bytes and hexadecimal, two's-complement
signed integers, sorting by adjacent swaps, hash tables and collisions, growth rates, and shortest
paths on unweighted and weighted graphs. The missions that ask you to *write* an algorithm moved
to Chapter 1; what is left is the ideas, taught through models you manipulate directly. Five of
them are about the machine underneath rather than the algorithm on top:

- **floating point** — a till that is a few cents out every evening, with nothing broken and the
  arithmetic correct. Single precision makes it worse and adding smallest first makes it smaller;
  only counting whole minor units makes it exact. The panel prints 0.1 to its last digit;
- **character encoding** — a name field that has to hold every crew member's name. A string has
  three lengths that disagree, a byte-wise cut can stop halfway through a character, and a field
  counted in bytes quietly discriminates against names that need more of them;
- **locality** — two transposes with identical arithmetic, identical output, and four and a half
  times the memory traffic between them. Tiling fixes it, and only while the tile still fits in
  the cache;
- **error correction** — a word that came back from memory with one bit wrong. Three parity
  checks over overlapping positions spell out which one, in binary. Flip it back, and only it;
- **trees and balance** — a catalogue index built by loading keys in the order they were
  catalogued, which was sorted, so it is a linked list with extra pointers.

The first and the fourth are diagnosis missions; the third is the same
correct-but-wrong-shaped-answer idea as Chapter 1's refactor mission, in hardware terms.

**Chapter 3 — Networking** (11 missions). Protocol layering and the maximum segment size, CIDR
addressing, variable-length subnet planning inside a single /24, longest-prefix-match forwarding,
window sizing against the bandwidth-delay product, retransmission strategy and wasted bandwidth
under loss, DNS resolution and caching, and the round trips before an HTTPS response's first byte.
Then three that go further:

- **local delivery** — a host that has been unreachable since a re-addressing. Its address is
  right; its mask and gateway are not. A host decides whether a destination is a neighbour from
  its own mask and nothing else, and both faults here follow from that;
- **address translation** — one public address for the whole station. Replies find their way
  home through the translation table, an unsolicited probe matches nothing and is dropped, and
  publishing a port is a decision with a blast radius;
- **congestion control** — the same 4 MiB over a short fat link and a long thin one. Every fixed
  window fails one of them: too small and the link idles, too large and the excess sits in a
  buffer until it overflows. Slow start meets both without being told either path's capacity.

**Chapter 4 — System design** (6 missions plus the lab). Capacity estimation, queueing and tail
latency, fan-out, redundancy arithmetic, and the trades behind eventual consistency, idempotency,
and cache invalidation. Three of the six are worked rather than chosen:

- **estimation** — five given numbers and five figures to derive: peak requests per second,
  storage a day, a year of it with replicas, monthly egress, and servers at 70% headroom. The
  model computes each answer from the givens, so a mission cannot ship a figure that disagrees
  with its own arithmetic;
- **error budgets** — an objective, a month's incident log with one partial outage, and a policy.
  Work out what is left of the budget, then decide whether the risky change ships;
- **an incident** — not a blank page but the design that is running, saturated in exactly one
  tier, with a credit cap tighter than the contract's. One of 192 configurations is a repair.

The architecture lab then gives you five contracts to design for.

Missions in both chapters carry a read-only **evidence panel**: `ip addr` and `ip neigh` output
for the unreachable host, `conntrack` rows for the NAT, `ss -ti` for the congestion window, an
SLO definition and an error budget policy, the page and dashboard for the incident. Same panel as
Chapter 1's language comparison, different material.

### The station

Every mission belongs to one of nine sections of the station — the room names the
missions already carried, grouped into decks — and finishing it restores power there.
The fourth mode draws the station as an isometric cutaway: dark modules, modules
rising as their power comes back, lit windows counting completed missions, and
conduits that carry light only between sections that are both awake. Bringing every
mission in a section home turns its beacon on.

Power is not a mission count. A mission restores 100 kW when it is solved with no
hints and without reading the solution, 80 kW after a hint, and 50 kW after the
answer was shown — and the best attempt is the one kept, so resetting a mission and
solving it yourself restores the rest. The rank shows on the mission list, on the
win panel, and in the section breakdown. Twelve achievements come from signals the
game already measures: rejecting every broken version in the spec mission with five
cases, coming in at a tenth of a step budget, solving a debug mission on the first
run, meeting a contract with a fifth of the budget unspent, reading all five
languages in a language panel.

None of it is a timer, a streak, or a leaderboard. The only things measured are what
you solved and how much help you took.

### The two build modes

The missions teach a concept each; the build modes are where you apply them at scale, against
contracts that have to be met all at once.

**Signal City** (networking). Lay cable between districts and the model tells you what the city
gets. Each contract keeps its own city, so switching between them compares designs instead of
throwing work away, and a legend under the map says what the line weights and load colours mean.
The model reports: which route each district's traffic takes, how loaded every cable is, how much of the
demand actually arrives, what the round trip looks like once queues build, and who loses the
uplink when a single cable is cut. Five contracts move from "connect everything within budget"
to "survive any one cut without losing more than 40% of the traffic". Copper is cheap and short,
fibre is fast and expensive, microwave reaches anywhere and carries almost nothing — the design
is choosing which span gets which.

**Architecture lab** (system design). Choose an edge tier, a datastore, replicas, shards, a
cache, an async queue, and a second region, against a 99th-percentile latency target, an
availability target, and a budget.

## Project

A dependency-free static application. The deployable files are in `dist/`; `server.mjs` is only
the local development server, and the host serves `dist/` in production.

| File | Role |
| --- | --- |
| `dist/lang.js` | The teaching language: tokenizer, parser, static checker, interpreter |
| `dist/engine.js` | Mission evaluators: the grid simulation, data puzzles, graphs, algorithm tests |
| `dist/net.js` | Networking models: addressing, routing, encapsulation, transport |
| `dist/city.js` | Signal City: topology, routing, fair bandwidth sharing, failure analysis |
| `dist/systems.js` | The system-design model behind the architecture lab |
| `dist/puzzles.js` | One state/widget/diagram/verdict interface for every non-coding mission |
| `dist/levels.js` | Mission content, including the solution each mission's tests check |
| `dist/game.js`, `dist/builder.js`, `dist/citylab.js`, `dist/scene.js` | Interface, city map, and isometric renderer |
| `dist/ui.js` | The few behaviours all three modes share |
| `dist/theme.css` | Design tokens, base elements, and the light and dark colour schemes |
| `dist/app.css` | Components, composed only from those tokens |

### The interface

One design system, in two files: `theme.css` holds the tokens (type scale, 4px spacing
rhythm, elevation, motion, and every colour) and `app.css` composes components from them
only — no component hard-codes a colour or a size. That is what makes a change to the look
a change in one place.

Running anything brings its outcome into view: the result banner after a win, the mission log
after a failure, the verdict after a load test or a city run. It scrolls the smallest distance
that does it, and never moves a result the player can already see — before that, finishing a
mission on a 1366×768 screen changed nothing visible at all.

The colour scheme follows the operating system and can be overridden with the toggle in the
header, which is then remembered. Text meets WCAG AA contrast in both schemes, icon-only
controls on small screens keep their labels in the accessibility tree, and everything honours
`prefers-reduced-motion`. The 54 missions are grouped into four collapsible chapters, each
carrying its own progress and accent colour; on a phone the rail becomes a drawer over the
mission it is currently on.

### The language

`lang.js` runs a deliberately small subset of JavaScript. Nothing is passed to `eval` or the
`Function` constructor: programs are tokenized, parsed, checked, and walked. Property access is
restricted to a whitelist, so `constructor` and `__proto__` are unreachable, and operations, call
depth, array length, and total allocation are all bounded — a program that will not finish is
stopped with an explanation rather than hanging the page.

Supported: numbers, strings, booleans, arrays, records written `{ field: value }`, `let`,
assignment and compound assignment, `++` and `--`, arithmetic, comparison and logical operators,
`if`/`else`, `for`, `while`, `break`, `continue`, function declarations with parameters, `return`,
recursion, array and record indexing, the array and string members listed in the editor, and the
`Math` and `Object` functions listed in `mathMembers` and `objectMembers`.

Records are created with a null prototype, `__proto__`, `constructor` and `prototype` are refused
when the program is parsed, and field growth is charged against the same allocation budget arrays
are, so a loop cannot build an unbounded table. Functions, natives and namespaces carry a symbol
rather than a `kind` field, because a player's record is free to have a field called `kind` — the
tokens in the capstone missions do.

Not supported: classes, closures as values, `var`, `const`, `switch`, `try`/`catch`, regular
expressions, `async`, modules, or any host API beyond the commands a mission provides.

It is also deliberately stricter than JavaScript, because silence would teach the wrong thing:
reading past the end of an array, reading a field a record does not have, dividing by zero, mixing
types under an arithmetic operator, joining two records with `+`, assigning past the end of an
array, and producing `Infinity` or `NaN` are all reported instead of returning `undefined` or
`NaN`. `tests/lang.test.mjs` pins both the agreements and
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
- **Congestion control.** A round-trip-at-a-time model: the window doubles until the path plus
  its bottleneck buffer cannot hold it, then halves and climbs by one. It reproduces slow start,
  additive increase / multiplicative decrease, and the fact that a window past the
  bandwidth-delay product buys retransmissions rather than throughput. It has one sender, one
  bottleneck, no competing flows, no delayed acknowledgements, and no fast retransmit, so it
  cannot show senders converging on a fair share.
- **Local delivery and NAT.** The addressing arithmetic is real. Everything around it is a single
  hop: no switching fabric, no ARP timers or caches, no route metrics, and a translation table
  that never expires an entry. The NAT allocates ports sequentially from 49152 rather than
  randomising them, which a real implementation does precisely because predictable ports are
  guessable.
- **Error budgets.** Downtime is minutes of total unavailability weighted by the fraction of
  users affected, which is the simplest of several real definitions; measuring against requests
  rather than time gives different numbers. The ship / slow-down / freeze thresholds are this
  game's policy, stated in `errorBudget` so a mission can be checked against it, not an industry
  standard.
- **Estimation.** The estimators use powers of ten for storage and bandwidth and ignore the
  ~7% difference from powers of two, because an estimate scored on its order of magnitude cannot
  tell the difference.
- **The cache.** Fully associative with least-recently-used eviction, one level, no prefetching,
  no write-back traffic and no set conflicts. Real caches are set-associative, which adds conflict
  misses the model cannot show, and real hardware prefetches sequential lines, which makes the
  good order look better still. The floating-point arithmetic in the same chapter is not a model
  at all: it is IEEE 754 running on the same hardware as everything else, and `exactValue` prints
  what is actually stored.
- **Graph missions.** Link weights are fixed delays. Real packet delay also depends on
  transmission, processing, and queueing.
- **Signal City.** Routing is shortest-path on an OSPF-style metric (a reference bandwidth over
  the link's capacity), with no load balancing across equal-cost paths. Bandwidth is shared
  max-min fairly rather than by TCP's actual dynamics, queueing delay uses the same M/M/1 factor,
  and demand is steady rather than bursty. Cutting a cable reroutes instantly, with no
  convergence time.

Addressing, prefix matching, header arithmetic, and the binary encodings follow the real rules,
and the tests check them against independent implementations.

## Validation

Run `npm test` and `npm run check`. 134 tests across twelve files:

- `tests/lang.test.mjs` — 30 programs run in both the interpreter and real JavaScript via
  `node:vm` and compared, plus the refusals, the deliberate deviations, and the bounds.
- `tests/engine.test.mjs` — collisions, native argument rules, lesson requirements, bit encodings,
  and the algorithm harness.
- `tests/net.test.mjs` — subnet arithmetic against a binary-string implementation, longest prefix
  match against an independent prefix search, every host count from 1 to 1,000, the transfer
  simulation against its closed-form models at both ends of the window range, local delivery
  recomputed on masked integers, and the congestion window against the bandwidth-delay product.
- `tests/systems.test.mjs` — every contract solved by exhaustive search, the techniques each
  contract requires, the availability and cost arithmetic, the 99th-percentile formula checked
  against a simulated M/M/1 queue, each estimator against the arithmetic done by hand, and the
  error budget against a worked month.
- `tests/progress.test.mjs` — every mission belongs to exactly one section, every
  section is reachable from the reactor, ranks never pay more for more help, the
  station lights up section by section, and every achievement is unearned at the
  start and reachable by doing the thing it describes.
- `tests/machine.test.mjs` — the exact decimal expansion of a double rebuilt from its bit pattern
  with BigInt, UTF-8 output compared byte for byte against `TextEncoder`, cache misses against
  the compulsory floor, every four-bit message with every single-bit error in all seven positions,
  and tree heights recomputed by walking the tree the model built.
- `tests/missions.test.mjs` — every mission's shipped solution wins, no mission starts solved,
  every mission carries its teaching material, and the concept requirements hold.
- `tests/city.test.mjs` — the city's routing checked against an enumeration of every simple
  path, max-min fair sharing against a hand-computed allocation, cut analysis against an
  independent reachability search, and a check that each contract fails when the technique it
  teaches is removed.
- `tests/ui.test.mjs` — when the page should scroll an outcome into view and, just as
  importantly, when it should leave the page alone.
- `tests/page.test.mjs` — the checks a no-build static page otherwise lacks: every file the
  page links to exists, every id the interface looks up is in the markup, every class it
  renders has a style rule, every custom property it uses is defined, and the accessibility
  affordances are still there.
- `tests/accuracy.test.mjs` — grid programs compared against real JavaScript, every algorithm
  solution compared against itself run natively on random inputs, every graph configuration
  against path enumeration, and every puzzle's whole option space enumerated to prove it is
  winnable, not winnable by accident, and solved by the answer it ships.

A browser pass was run with Playwright against the development server: all 54 missions complete
from their own "show a solution" button, all 5 architecture contracts and all 5 city contracts
are met, a city built by clicking the map passes its contract and fails again when cables are
removed, and the page reports no script errors. Outcomes were checked to land on screen at 1440×960,
1366×768, and 390×844 for wins, failures, load tests, and city runs. The layout was swept from
320px to 1920px in both colour schemes across all three modes, with no horizontal overflow
anywhere.

Optional WebMCP tools feature-detect `document.modelContext`. Registration and the tool actions
have not been exercised in a browser that supports it; normal play does not require it.

## Next chapters

Possible extensions: sorting and graph algorithms written as code rather than as puzzles, a
concurrency chapter, congestion control on top of the transport model, a storage chapter covering
durability, replication lag, and consensus, and a Signal City that grows over several contracts
rather than resetting between them.
