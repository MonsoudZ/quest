# Signal Quest

A game that teaches programming, computer science, networking, and system design by making you
do each of them. Sixty-eight missions across four chapters, plus an architecture lab where you
design a service against a latency, availability, and cost target.

## Play

Run `npm run dev` and open `http://127.0.0.1:4317`.

Everything runs in the browser with no dependencies and no build step. Progress and code drafts
are stored in this browser; if storage is unavailable, play continues for the session.

## What it teaches

**Chapter 1 — Programming** (30 missions). Sequences, debugging, variables, `for` loops,
conditionals, `while` loops, and functions, taught by driving a repair drone across a deck.
Variables come before loops deliberately: the loop counter is the first `let` a player would
otherwise meet unexplained. Then the function console takes over: arrays and boolean logic,
records, strings, nested loops over a grid, binary search under a step budget a linear scan
cannot meet, recursion via Euclid's algorithm, a stack used for bracket matching and a queue
contrasted against it, insertion sort by a record's field, and a two-mission capstone that
tokenises an expression and then evaluates it with `*` binding tighter than `+`.

Ten of the thirty are not write-it-from-scratch missions at all, because reading code you did
not write, judging it, and fixing it is most of the work:

- five **debug** missions hand you a program that compiles, runs, and is wrong. One is wrong in
  three separate ways and asks you to read the failing cases rather than start again. One is
  wrong because a `let` inside an `if` shadows the variable it was meant to update, so the
  answer never changes — legal, silent, and the reason the other three cases fail. One walks a
  deck plan with `pop()` where it needed `shift()`, which is the whole difference between a
  stack and a queue and between following one path to its end and finishing the near things
  first. One returns the right answer and rearranges the caller's log, because an array is
  passed by reference;
- three **refactor** missions hand you a program that passes every case and reject it anyway.
  The console judges the shape of the answer — loop count, loop nesting, statements, calls made
  — as well as its values. One walks the data with a loop inside a loop; one spells a decision
  out inside a loop that has to be pulled out and named; one answers four thresholds through
  five levels of nested `else`, and has to be rewritten so each rule answers and leaves;
- two **spec** missions turn the console around. The code is written and the tests are not: you
  return a list of cases, and the console runs them against one correct implementation and four
  broken ones. Every expectation has to be right, and every broken version has to be rejected.
  A suite of happy paths accepts all four, which is the lesson. The second is pointed at a
  function's guards rather than its answers — a count of zero, a negative where only positives
  were imagined, a division whose divisor can be zero.

Three more missions go deeper: **memoisation**, where the obvious recursion is correct and
unusable and the fix is a record; **merge sort**, under a step budget the quadratic version
misses by forty-eight times; and the extraction refactor above.

The chapter closes by reading the same function in JavaScript, Python, Ruby, Go, and Rust. Several
missions carry a read-only **language panel** showing the same idea in all five, with a note on
what each language makes you declare. Only the JavaScript subset runs; the rest is for reading.

**Chapter 2 — Computer science** (14 missions, in three movements). *How a machine writes a value
down*: binary, bytes and hexadecimal, two's-complement negatives, floating point, and UTF-8 text.
*How data is arranged*: sorting, complexity, hash tables, binary search trees, and shortest paths
on unweighted and weighted graphs. *What the machine actually is*: cache locality, error
correction, and concurrency. The missions that ask you to *write* an algorithm moved to chapter 1;
what is left is the ideas underneath, each one a model you configure rather than a function you
write.

Four of them are worth calling out:

- **Count the cents** adds up a day's takings. Doubles drift, singles drift faster, and counting
  in whole integers is only half the answer: the commissary meters water below a cent, so a till
  counting in cents rounds every one of those charges on the way in and comes out wrong by a
  clean, confident number. The unit has to be as small as the smallest thing you charge for,
  and no smaller.
- **Somewhere to put it** is a hash table judged by its worst lookup rather than by whether
  anything collided. The size decides how often keys land together — six of the seven IDs are
  multiples of ten — and the collision strategy decides what that costs. Chaining degrades
  gently; open addressing is faster until the table fills, and then the runs of two keys merge
  into one and the walks get longer than the collisions can explain.
- **The loop that misses** transposes a 256×256 grid. The arithmetic is identical in all fifteen
  loop orders on offer; the traffic runs from 4.5 MiB down to 1 MiB and back up again, and the
  tile that works is the one whose two sides both fit in the sixteen cache lines at once.
- **Both consoles at once** is about the thing every other mission assumes away. Two engineers
  add repairs to one shared total, and you arrange one console's routine: read, add, write, take
  the lock, give it back, write the log line. The model runs every interleaving of two consoles
  executing it — 504 of them for the routine as shipped, 396 ending at the wrong number — and
  shows you one that loses an update, step by step. A routine is right only when every schedule
  agrees, and the lock has to cover the read, the add and the write without covering the slow
  part, because whatever is inside it is time the other console spends waiting.

Every mission with dials has exactly one setting that wins, and a test enforces it: several right
answers would make the shipped solution one of many and leave "which setting met the target?"
unanswerable when the mission comes back for review.

**Chapter 3 — Networking** (15 missions, bottom-up through the stack). The frame on the wire and
the MTU; IPv4 addressing, variable-length subnetting and IPv6; whether a destination is on this
link or past the gateway; longest-prefix forwarding; ports and sockets; NAT; sliding windows,
reliable delivery, congestion control and head-of-line blocking; DNS, the handshake, and
certificates. Every mission carries read-only evidence beside its lesson — real `tcpdump`,
`ip route`, `ss -ti`, `dig +trace` and `openssl s_client` output — because most of what this
chapter teaches is how to read the thing in front of you.

Four of them are worth calling out:

- **Which door it knocks on** puts three services on one host and asks what address each listens
  on. The portal has to answer on two interfaces, the metrics endpoint on exactly one, and the
  admin console on none but the loopback. A socket is an address *and* a port, and the address
  half is the cheapest access control there is — the one a forgotten firewall rule cannot undo.
- **One address, many decks** is NAT sized twice over: which ports to publish, and how many
  outside ports the pool needs. A flow is the whole five-tuple, so two consoles using the same
  source port to the same server are two flows, and one console opening a second tab is two
  more. Counting them is why a carrier can put a street behind one address or a building.
- **One file holds the rest** loads twelve files with one packet lost in the stylesheet. Six
  connections hide the blocking by not sharing and pay six handshakes for it; one multiplexed
  TCP connection stops the queueing and stalls all twelve on a gap in a file none of them use;
  a transport with real streams costs the loss to the one file that lost something. That is the
  whole argument for QUIC, in a waterfall.
- **The same prefix every time** numbers four decks of wildly different sizes inside a /48, and
  the answer is /64 for every one of them. The bottom 64 bits belong to the device, which is what
  lets it be plugged in and address itself — so the prefix stopped being a function of how many
  hosts there are, which is the habit the two IPv4 missions before it just finished teaching.

**Chapter 4 — System design** (9 missions plus the lab). The life of one service, in order: estimate
how big it will be, buy what serves it, live with what you bought, survive a burst, survive a
failure, pay for the redundancy, budget the downtime, and run the incident when it happens anyway.
Half this chapter used to be multiple choice; none of it is now. Every mission is a model you
configure and watch, and a test refuses a quiz here.

Three of them run on the architecture simulator the lab is built on — servers, caches, replicas,
shards, queues and regions against a real traffic scenario — each exposing only the handful of
knobs its own lesson is about. **Cheaper than more database** prices a cache against a read replica
and finds the mix; **Two of everything** buys availability and discovers the third copy is worth
almost nothing; **What the queue costs you** puts a queue in front of a datastore and reads what it
did to the meaning of an acknowledgement. Until this round the simulator was reachable only through
the separate lab, and no campaign mission had ever touched it.

Three more are new models:

- **Keep the hot set close** is a cache with four decisions in it: read around it or write through
  it, how long an entry lives, and whether a write removes the entry or lets it expire. The
  datastore load, the staleness window, the write latency and whether an acknowledged write can be
  lost all move together, and exactly one of the thirty-two settings satisfies all four targets.
- **When the queue never drains** absorbs a twenty-minute telemetry burst. A bigger buffer moves
  the moment you start dropping readings without changing whether you will; the graph turning over
  or not is the diagnosis, and depth over drain rate is how old the reading at the back is.
- **The retry that made it worse** is a dependency that is up and failing one call in five. Turning
  retries on takes the offered load from 0.9× capacity to 2.7× without a single new user arriving,
  and the fix is spreading the retries across the callers as well as across time. The circuit
  breaker on offer does not earn its place, because it is built for a dependency that is down.

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
`prefers-reduced-motion`. The 68 missions are grouped into four collapsible chapters, each
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

Run `npm test` and `npm run check`. 144 tests across thirteen files:

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
- `tests/learning.test.mjs` — every console mission's own starter fails in a way
  the game can name and the name is the one that mission is about, every mission
  can be predicted and its real outcome is one of the answers offered, a wrong prediction is never scolded, every mission
  can be asked about again from what it already ships with the answer among the
  options, the schedule widens on recall and resets on failure, and the review
  queue opens with four different chapters.
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
