// Mission content. Four chapters: programming in a JavaScript subset, computer
// science fundamentals, networking, and system design. Every mission carries the
// solution the tests check, so no mission can ship unsolvable.
const row = (x, y, n) => Array.from({length:n}, (_, i) => [x + i, y]);
const column = (x, y, n) => Array.from({length:n}, (_, i) => [x, y + i]);
const ramp = (n, step) => Array.from({length:n}, (_, i) => i * step);

// One shift's takings: a lot of small amounts and a few large ones, which is the
// shape that makes floating-point drift visible rather than theoretical.
const tillAmounts = [
  ...Array.from({length:600}, () => 0.01),
  // Water is metered and priced below a cent, which is why counting in cents is
  // not the answer here even though counting in integers is.
  ...Array.from({length:241}, () => 0.005),
  ...Array.from({length:120}, () => 0.07),
  19.99, 4.5, 133.28, 0.03
];
const crateCodes = Array.from({length:120}, (_, i) => `QZ-${i}`);
const numberToken = value => ({kind:'number', value});
const operatorToken = text => ({kind:'operator', text});

const refs = {
  basics:{label:'Read more: Harvard CS50 — algorithms & binary', url:'https://cs50.harvard.edu/x/notes/0/'},
  variables:{label:'Reference: MDN — let and block scope', url:'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/let'},
  loops:{label:'Reference: MDN — for loops', url:'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/for'},
  whileLoops:{label:'Reference: MDN — while loops', url:'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/while'},
  conditions:{label:'Reference: MDN — if…else', url:'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/if...else'},
  functions:{label:'Reference: MDN — function declarations', url:'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/function'},
  arrays:{label:'Reference: MDN — arrays', url:'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array'},
  operators:{label:'Reference: MDN — logical operators', url:'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators'},
  sort:{label:'Reference: NIST — bubble sort', url:'https://xlinux.nist.gov/dads/HTML/bubblesort.html'},
  search:{label:'Reference: NIST — binary search', url:'https://xlinux.nist.gov/dads/HTML/binarySearch.html'},
  stack:{label:'Reference: NIST — stack', url:'https://xlinux.nist.gov/dads/HTML/stack.html'},
  hash:{label:'Reference: NIST — hash table', url:'https://xlinux.nist.gov/dads/HTML/hashtab.html'},
  growth:{label:'Reference: NIST — big-O notation', url:'https://xlinux.nist.gov/dads/HTML/bigOnotation.html'},
  recursion:{label:'Reference: Recursion in computer science', url:'https://en.wikipedia.org/wiki/Recursion_(computer_science)'},
  twos:{label:'Reference: Two’s complement', url:'https://en.wikipedia.org/wiki/Two%27s_complement'},
  graph:{label:'Reference: MIT — shortest paths & Dijkstra', url:'https://ocw.mit.edu/courses/6-046j-introduction-to-algorithms-sma-5503-fall-2005/resources/lecture-17-shortest-paths-i-properties-dijkstras-algorithm-breadth-first-search/'},
  layering:{label:'Reference: RFC 1122 — internet host layering', url:'https://www.rfc-editor.org/rfc/rfc1122'},
  cidr:{label:'Reference: RFC 4632 — CIDR addressing', url:'https://www.rfc-editor.org/rfc/rfc4632'},
  routers:{label:'Reference: RFC 1812 — IPv4 router requirements', url:'https://www.rfc-editor.org/rfc/rfc1812'},
  tcp:{label:'Reference: RFC 9293 — TCP', url:'https://www.rfc-editor.org/rfc/rfc9293'},
  dns:{label:'Reference: RFC 1034 — domain names', url:'https://www.rfc-editor.org/rfc/rfc1034'},
  tls:{label:'Reference: RFC 8446 — TLS 1.3', url:'https://www.rfc-editor.org/rfc/rfc8446'},
  slo:{label:'Reference: Google SRE — service level objectives', url:'https://sre.google/sre-book/service-level-objectives/'},
  risk:{label:'Reference: Google SRE — embracing risk', url:'https://sre.google/sre-book/embracing-risk/'},
  queueing:{label:'Reference: Little’s law', url:'https://en.wikipedia.org/wiki/Little%27s_law'},
  cap:{label:'Reference: the CAP theorem', url:'https://en.wikipedia.org/wiki/CAP_theorem'},
  arp:{label:'Reference: RFC 826 — address resolution', url:'https://www.rfc-editor.org/rfc/rfc826'},
  nat:{label:'Reference: RFC 3022 — network address translation', url:'https://www.rfc-editor.org/rfc/rfc3022'},
  congestion:{label:'Reference: RFC 5681 — TCP congestion control', url:'https://www.rfc-editor.org/rfc/rfc5681'},
  estimation:{label:'Reference: numbers every engineer should know', url:'https://static.googleusercontent.com/media/research.google.com/en//people/jeff/stanford-295-talk.pdf'},
  errorBudget:{label:'Reference: Google SRE — error budgets', url:'https://sre.google/workbook/error-budget-policy/'},
  incident:{label:'Reference: Google SRE — managing incidents', url:'https://sre.google/sre-book/managing-incidents/'},
  floats:{label:'Reference: what every computer scientist should know about floating point', url:'https://docs.oracle.com/cd/E19957-01/806-3568/ncg_goldberg.html'},
  unicode:{label:'Reference: the absolute minimum about Unicode', url:'https://www.joelonsoftware.com/2003/10/08/the-absolute-minimum-every-software-developer-absolutely-positively-must-know-about-unicode-and-character-sets-no-excuses/'},
  locality:{label:'Reference: what every programmer should know about memory', url:'https://people.freebsd.org/~lstewart/articles/cpumemory.pdf'},
  hamming:{label:'Reference: Hamming codes', url:'https://en.wikipedia.org/wiki/Hamming_code'},
  trees:{label:'Reference: NIST — binary search tree', url:'https://xlinux.nist.gov/dads/HTML/binarySearchTree.html'},
  memoisation:{label:'Reference: memoization and dynamic programming', url:'https://en.wikipedia.org/wiki/Memoization'},
  aliasing:{label:'Reference: MDN — passing objects and arrays to functions', url:'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Functions'},
  testing:{label:'Reference: equivalence partitioning and boundary values', url:'https://en.wikipedia.org/wiki/Equivalence_partitioning'},
  mergesort:{label:'Reference: NIST — merge sort', url:'https://xlinux.nist.gov/dads/HTML/mergesort.html'},
  duplication:{label:'Reference: don’t repeat yourself', url:'https://en.wikipedia.org/wiki/Don%27t_repeat_yourself'},
  records:{label:'Reference: MDN — working with objects', url:'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Working_with_objects'},
  offByOne:{label:'Reference: the off-by-one error', url:'https://en.wikipedia.org/wiki/Off-by-one_error'},
  nested:{label:'Reference: MDN — indexing nested arrays', url:'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Indexed_collections'},
  lexing:{label:'Reference: lexical analysis', url:'https://en.wikipedia.org/wiki/Lexical_analysis'},
  precedence:{label:'Reference: MDN — operator precedence', url:'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Operator_Precedence'},
  syntax:{label:'Reference: comparison of programming languages (syntax)', url:'https://en.wikipedia.org/wiki/Comparison_of_programming_languages_(syntax)'},
  strings:{label:'Reference: MDN — string members', url:'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String'},
  scope:{label:'Reference: MDN — block scope and shadowing', url:'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/let'},
  guard:{label:'Reference: replace nested conditional with guard clauses', url:'https://refactoring.com/catalog/replaceNestedConditionalWithGuardClauses.html'},
  queue:{label:'Reference: NIST — queue', url:'https://xlinux.nist.gov/dads/HTML/queue.html'},
  insertion:{label:'Reference: NIST — insertion sort', url:'https://xlinux.nist.gov/dads/HTML/insertionSort.html'},
  failFast:{label:'Reference: fail fast', url:'https://en.wikipedia.org/wiki/Fail-fast_system'},
  concurrency:{label:'Reference: race conditions and the lost update', url:'https://en.wikipedia.org/wiki/Race_condition#In_software'},
  sockets:{label:'Reference: RFC 793 — sockets and the connection four-tuple', url:'https://www.rfc-editor.org/rfc/rfc793'},
  quic:{label:'Reference: RFC 9000 — QUIC', url:'https://www.rfc-editor.org/rfc/rfc9000'},
  ipv6:{label:'Reference: RFC 4291 — IPv6 addressing architecture', url:'https://www.rfc-editor.org/rfc/rfc4291'},
  certificates:{label:'Reference: RFC 5280 — certificate path validation', url:'https://www.rfc-editor.org/rfc/rfc5280'},
  caching:{label:'Reference: cache replacement and invalidation', url:'https://en.wikipedia.org/wiki/Cache_replacement_policies'},
  queues:{label:'Reference: Little’s law and queueing', url:'https://en.wikipedia.org/wiki/Little%27s_law'},
  retries:{label:'Reference: AWS — timeouts, retries and backoff with jitter', url:'https://aws.amazon.com/builders-library/timeouts-retries-and-backoff-with-jitter/'}
};

const routingTable = [
  {prefix:'0.0.0.0/0', via:'uplink'},
  {prefix:'10.0.0.0/8', via:'core relay'},
  {prefix:'10.20.0.0/16', via:'station spine'},
  {prefix:'10.20.30.0/24', via:'lab deck'},
  {prefix:'10.20.30.64/26', via:'sensor bay'}
];
const routeOptions = routingTable.map(route => ({label:`${route.via} (${route.prefix})`}));

export const levels = [
  // ------------------------------------------------ chapter 1: programming
  {
    id:'first-contact', kind:'code', chapter:'Programming', concept:'Sequences', name:'First contact', location:'Docking bay',
    objective:'Guide SQ-01 four tiles east to the power cell.',
    intro:'The station is dark. Your repair drone follows instructions from top to bottom. Use the cyan arrow to see which way it faces.',
    lesson:'A program gives a computer instructions. In this game, move() advances one tile in the direction the drone faces; move(3) advances three. The compass maps east to the lower-right diagonal.',
    start:[1,3,0], goal:[5,3], tiles:row(1,3,5),
    starter:'// Reach the power cell, four tiles ahead.\nmove();\n',
    solution:'move(4);',
    hints:['The drone faces east. Count four tile-to-tile moves from its starting tile.','Use four move(); commands, or pass 4 to move().'],
    takeaway:'You wrote a simple algorithm: precise steps that solve this navigation problem.', reference:refs.basics
  },
  {
    id:'around-the-corner', kind:'code', chapter:'Programming', concept:'Debugging', name:'A change of direction', location:'Service corridor',
    objective:'Travel east, turn south, and reach the power cell.',
    intro:'The direct route is sealed. Break the journey into moves and turns. If a move fails, the trace identifies the responsible instruction.',
    lesson:'turnRight() rotates the drone 90° clockwise on the deck: east becomes south. turnLeft() rotates the other way. Turning does not change position. The isometric view makes right angles look like diagonal corners.',
    start:[1,1,0], goal:[5,5], tiles:[...row(1,1,5), ...column(5,2,4)],
    starter:'move(4);\n// Turn, then follow the corridor.\n',
    solution:'move(4);\nturnRight();\nmove(4);',
    hints:['Travel four tiles east to the corner, then turn south.','After move(4), use turnRight(), then move four more tiles.'],
    takeaway:'Debugging means comparing actual behaviour with intended behaviour, then fixing the responsible instruction.', reference:refs.basics
  },
  {
    id:'name-the-distance', kind:'code', chapter:'Programming', concept:'Variables', name:'Store the answer', location:'Reactor access', require:'variable',
    objective:'Reuse one named distance for both straight corridors.',
    intro:'Both corridors have the same length. Store that distance in a variable and use the name twice.',
    lesson:'let distance = 4 declares a variable and initialises it with 4. move(distance) then uses that value. let has block scope: a variable declared inside braces belongs to that block. You can also reassign it later with distance = 6.',
    start:[1,1,0], goal:[5,5], tiles:[...row(1,1,5), ...column(5,2,4)],
    starter:'let distance = 2;\nmove(distance);\nturnRight();\nmove(distance);\n',
    solution:'let distance = 4;\nmove(distance);\nturnRight();\nmove(distance);',
    hints:['The starter turns too soon. Both straight corridors require four moves.','Change the stored distance from 2 to 4. Keep using the same name in both move calls.'],
    takeaway:'Reusing a named value avoids repeating a literal. Changing this one declaration changes both movement distances.', reference:refs.variables
  },
  {
    id:'repeat-the-route', kind:'code', chapter:'Programming', concept:'Loops', name:'Find the pattern', location:'Thermal array', require:'loop',
    objective:'Use a for loop to repeat the staircase route.',
    intro:'Three identical service modules stand between you and the cell. Describe their shared pattern once and repeat it.',
    lesson:'A for loop repeats its body. let i = 0 initialises the counter; i < 3 is checked before every iteration; i++ adds one after the body. The body runs for i = 0, 1, and 2.',
    start:[0,6,0], goal:[6,3], tiles:[[0,6],[1,6],[2,6],[2,5],[3,5],[4,5],[4,4],[5,4],[6,4],[6,3]],
    starter:'for (let i = 0; i < 3; i++) {\n  move(2);\n  // Go north one tile, then face east again.\n}\n',
    solution:'for (let i = 0; i < 3; i++) {\n  move(2);\n  turnLeft();\n  move();\n  turnRight();\n}',
    hints:['Each module is two tiles east and one north. Finish each repetition facing east.','Inside the loop: move(2), turnLeft(), move(), then turnRight().'],
    takeaway:'Your loop repeats the same navigation pattern. The counter belongs to the for loop and is not accessible after it.', reference:refs.loops
  },
  {
    id:'read-the-room', kind:'code', chapter:'Programming', concept:'Conditionals', name:'Read the room', location:'Sensor chamber', require:'conditional',
    objective:'Use canMove() in a conditional to navigate the corner.',
    intro:'SQ-01 can check the tile ahead. Give it one rule for an open path and another for a blocked path.',
    lesson:'canMove() is this game’s sensor function: it returns true when the next tile is traversable. if chooses its body when the condition is true; else chooses the alternative. The loop makes eight decisions: seven moves and one turn.',
    start:[1,1,0], goal:[4,5], tiles:[...row(1,1,4), ...column(4,2,4)],
    starter:'for (let i = 0; i < 8; i++) {\n  if (canMove()) {\n    // Move when the path is open.\n  } else {\n    turnRight();\n  }\n}\n',
    solution:'for (let i = 0; i < 8; i++) {\n  if (canMove()) {\n    move();\n  } else {\n    turnRight();\n  }\n}',
    hints:['The open-path block is empty. Add a movement command there.','Put move(); inside the if block. The else block already handles the blocked path.'],
    takeaway:'Conditionals let a program respond to its environment. This rule works for this route; it is not a general-purpose maze solver.', reference:refs.conditions
  },
  {
    id:'unknown-corridor', kind:'code', chapter:'Programming', concept:'While loops', name:'How long is the corridor?', location:'Cargo spine', require:'while',
    objective:'Cross two corridors of unknown length using while loops.',
    intro:'Nobody recorded how long these corridors are. A for loop needs a count; a while loop only needs a condition.',
    lesson:'while (condition) { … } checks the condition before every repetition and stops when it becomes false. while (canMove()) { move(); } walks forward until the way ahead is blocked, whatever the distance. A condition that never becomes false is an infinite loop, which is why this sandbox stops a program that runs too long.',
    start:[1,2,0], goal:[6,6], tiles:[...row(1,2,6), ...column(6,3,4)],
    starter:'while (canMove()) {\n  move();\n}\n// The corridor turns south here.\n',
    solution:'while (canMove()) {\n  move();\n}\nturnRight();\nwhile (canMove()) {\n  move();\n}',
    hints:['The first loop stops at the corner because canMove() becomes false. Turn, then loop again.','Add turnRight(); and a second identical while loop after the first one.'],
    takeaway:'A while loop repeats on a condition rather than a count, so the same four lines work for a corridor of any length.', reference:refs.whileLoops
  },
  {
    id:'one-routine-twice', kind:'code', chapter:'Programming', concept:'Functions', name:'Name a routine', location:'Habitat ring', require:'function',
    objective:'Declare one function for a single leg, then call it twice.',
    intro:'The two legs of this route are identical. Give the manoeuvre a name and reuse it instead of writing it twice.',
    lesson:'function leg() { … } declares a function: a named block that runs when you call it with leg(). Calling it does not copy the code, it runs the same code again. Parameters let one function handle several cases: function leg(distance) { move(distance); } is called as leg(2).',
    start:[0,0,0], goal:[4,4], tiles:[[0,0],[1,0],[2,0],[2,1],[2,2],[3,2],[4,2],[4,3],[4,4]],
    starter:'function leg() {\n  move(2);\n  // Turn south, cross, then face east again.\n}\n\nleg();\nleg();\n',
    solution:'function leg() {\n  move(2);\n  turnRight();\n  move(2);\n  turnLeft();\n}\n\nleg();\nleg();',
    hints:['Each leg is two tiles east, then two tiles south, and it has to end facing east so the next leg works.','Inside the function: move(2), turnRight(), move(2), turnLeft(). Then call leg() twice.'],
    takeaway:'A function names a routine once and runs it wherever you call it. Fixing the routine fixes every call.', reference:refs.functions
  },
  {
    id:'total-the-readings', kind:'algo', chapter:'Programming', concept:'Arrays', name:'Total the readings', location:'Telemetry bay',
    objective:'Write total(values) so it returns the sum of an array of readings.',
    intro:'The sensor log arrives as an array. Walk it once and add up what you find. This console runs your function against every test case below.',
    lesson:'An array holds an ordered sequence of values. values.length is how many it holds, and values[0] is the first one, because indices start at zero. return hands a value back to whoever called the function. An empty array has length 0, so the loop body never runs and the sum stays at its starting value.',
    signature:'function total(values)', fn:'total',
    cases:[
      {args:[[1,2,3,4]], expect:10},
      {args:[[5]], expect:5},
      {args:[[]], expect:0, note:'an empty log is a real case'},
      {args:[[12,-4,7,-15]], expect:0},
      {args:[[100,200,300,400,500,600]], expect:2100}
    ],
    starter:'function total(values) {\n  let sum = 0;\n  // Visit every entry and add it to sum.\n  return sum;\n}\n',
    solution:'function total(values) {\n  let sum = 0;\n  for (let i = 0; i < values.length; i++) {\n    sum += values[i];\n  }\n  return sum;\n}',
    hints:['Loop from i = 0 while i < values.length, and add values[i] to sum each time.','sum += values[i]; is the same as sum = sum + values[i];. Return sum after the loop, not inside it.'],
    takeaway:'One pass over n entries does n additions, so the work grows in step with the array. Returning from inside the loop would stop after the first entry.', reference:refs.arrays
  },
  {
    id:'hold-the-line', kind:'algo', chapter:'Programming', concept:'Booleans', name:'Hold the line', location:'Reactor control',
    objective:'Write safe(temperature, pressure) so it returns true only inside the operating window.',
    intro:'The reactor is safe at 75 °C or below, with pressure from 20 to 110 inclusive. Turn that sentence into one boolean expression.',
    lesson:'A comparison such as temperature <= 75 produces true or false. && is true only when both sides are true; || is true when either side is. A condition is just a value, so a function can return it directly instead of using if and else to return true or false. Watch the boundaries: <= includes the limit, < excludes it.',
    toolkit:['return', '&&', '||', '!', '<=', '>=', '===', 'true / false', 'print()'],
    signature:'function safe(temperature, pressure)', fn:'safe',
    cases:[
      {args:[70,50], expect:true},
      {args:[76,50], expect:false},
      {args:[75,20], expect:true, note:'both limits are inclusive'},
      {args:[75,19], expect:false},
      {args:[75,110], expect:true},
      {args:[75,111], expect:false},
      {args:[0,0], expect:false, note:'zero pressure is not in range'}
    ],
    starter:'function safe(temperature, pressure) {\n  // Return true only inside the operating window.\n  return false;\n}\n',
    solution:'function safe(temperature, pressure) {\n  return temperature <= 75 && pressure >= 20 && pressure <= 110;\n}',
    hints:['Three conditions have to hold at once: temperature at most 75, pressure at least 20, pressure at most 110.','Join them with &&, and return the whole expression.'],
    takeaway:'Boundary values are where conditions go wrong. Writing the test cases at the limits is how you find an off-by-one comparison.', reference:refs.operators
  },

  {
    id:'summarise-the-log', kind:'algo', chapter:'Programming', concept:'Records', name:'Put a name on it', location:'Telemetry archive',
    objective:'Write summarise(readings) so it returns one record holding the count, the total, and the highest reading.',
    intro:'Three separate numbers travelling as three separate values get mixed up. Send them back as one record, with each number under its own name.',
    lesson:'A record groups values under names: { count: 3, total: 15, highest: 9 }. Read a field with report.total, and set one the same way. Unlike an array, the order of the fields does not matter, because you reach them by name rather than by position. An empty log is still a real answer: zero readings, zero total, and a highest of zero. Watch the highest on a log of negative numbers — starting it at zero would report a peak that never happened, so seed it from the first reading instead.',
    toolkit:['return', 'let', 'for', '{ field: value }', 'report.total', 'report.total += n', 'readings.length', 'print()'],
    signature:'function summarise(readings)', fn:'summarise',
    cases:[
      {args:[[4,9,2]], expect:{count:3, total:15, highest:9}},
      {args:[[7]], expect:{count:1, total:7, highest:7}},
      {args:[[]], expect:{count:0, total:0, highest:0}, note:'an empty log'},
      {args:[[-5,-2,-9]], expect:{count:3, total:-16, highest:-2}, note:'every reading is negative'},
      {args:[[3,3,3,3]], expect:{count:4, total:12, highest:3}}
    ],
    starter:'function summarise(readings) {\n  let report = {count: 0, total: 0, highest: 0};\n  // Fill the record in as you walk the readings.\n  return report;\n}\n',
    solution:'function summarise(readings) {\n  let report = {count: readings.length, total: 0, highest: 0};\n  for (let i = 0; i < readings.length; i++) {\n    report.total += readings[i];\n    if (i === 0 || readings[i] > report.highest) {\n      report.highest = readings[i];\n    }\n  }\n  return report;\n}',
    polyglot:{
      title:'A record in five languages',
      note:'Every one of these groups values under names. What changes is how much the language insists you say in advance.',
      samples:[
        {language:'JavaScript', code:'let report = {count: 3, total: 15, highest: 9};\nreport.total += 4;', note:'An object literal. Fields can be added at any time.'},
        {language:'Python', code:'report = {"count": 3, "total": 15, "highest": 9}\nreport["total"] += 4', note:'A dict. Keys are values too, so they are written as strings.'},
        {language:'Ruby', code:'report = {count: 3, total: 15, highest: 9}\nreport[:total] += 4', note:'A hash with symbol keys — :total is a name, cheaper than a string.'},
        {language:'Go', code:'type Report struct {\n\tCount, Total, Highest int\n}\nreport := Report{Count: 3, Total: 15, Highest: 9}\nreport.Total += 4', note:'A struct: the fields and their types are fixed when the type is declared.'},
        {language:'Rust', code:'struct Report { count: u32, total: i64, highest: i64 }\nlet mut report = Report { count: 3, total: 15, highest: 9 };\nreport.total += 4;', note:'Also a struct, and `mut` is required before anything can be changed.'}
      ]
    },
    hints:['Set count from readings.length, then add each reading to report.total inside the loop.','The highest has to start from a real reading, not from zero: use if (i === 0 || readings[i] > report.highest).'],
    takeaway:'A record is how a function returns more than one thing without the caller having to remember an order. Every field you name is a decision the caller no longer has to guess at.', reference:refs.records
  },
  {
    id:'letter-by-letter', kind:'algo', chapter:'Programming', concept:'Strings', name:'Read it letter by letter', location:'Badge printer',
    objective:'Write initials(name) so it returns the first letter of each word, in capitals.',
    intro:'Every badge on this station prints the wearer’s initials. The registry holds full names, and the part that shortens them was never written.',
    lesson:'A string is a sequence of characters and is read much like an array: name.length is how many it holds, and name[0] is the first one. Two members do most of the work here. split(" ") cuts a string wherever it finds a space and hands back an array, so "Ada Lovelace" becomes ["Ada", "Lovelace"]. toUpperCase() returns a capitalised copy. That word — copy — is the thing to hold on to: a string cannot be changed in place, so every one of these members gives you a new string and leaves the original exactly as it was. Watch the empty entry: "".split(" ") is not an empty array, it is an array holding one empty string, and asking that string for its first character is reading past the end.',
    toolkit:['return', 'let', 'for', 'name.split(" ")', 'words[i][0]', '.toUpperCase()', 'words.length', 'print()'],
    signature:'function initials(name)', fn:'initials',
    cases:[
      {args:['Ada Lovelace'], expect:'AL'},
      {args:['grace hopper'], expect:'GH', note:'the registry is careless about capitals'},
      {args:['Alan Mathison Turing'], expect:'AMT'},
      {args:['Prime'], expect:'P', note:'one name is still a name'},
      {args:[''], expect:'', note:'an empty entry has no initials'}
    ],
    starter:'function initials(name) {\n  let words = name.split(" ");\n  // Take the first letter of each word.\n  return "";\n}\n',
    solution:'function initials(name) {\n  let words = name.split(" ");\n  let out = "";\n  for (let i = 0; i < words.length; i++) {\n    if (words[i].length > 0) {\n      out = out + words[i][0].toUpperCase();\n    }\n  }\n  return out;\n}',
    polyglot:{
      title:'Taking a string apart in five languages',
      note:'Splitting on a separator is in every standard library. What differs is whether the result is a list, an iterator, or a view that still points at the original text.',
      samples:[
        {language:'JavaScript', code:'let words = name.split(" ");\nlet first = words[0][0].toUpperCase();', note:'split returns a new array of new strings. The original name is untouched, because strings cannot be changed in place.'},
        {language:'Python', code:'words = name.split()\nfirst = words[0][0].upper()', note:'split() with no argument splits on any run of whitespace, so double spaces do not leave empty entries behind.'},
        {language:'Go', code:'words := strings.Split(name, " ")\nfirst := strings.ToUpper(words[0][:1])', note:'Indexing a Go string gives you a byte, not a character, so a slice expression is used instead.'},
        {language:'Rust', code:'let words: Vec<&str> = name.split(\' \').collect();\nlet first = words[0][..1].to_uppercase();', note:'&str is a borrowed view into the original string: splitting copies nothing until you ask it to.'},
        {language:'Java', code:'String[] words = name.split(" ");\nString first = words[0].substring(0, 1).toUpperCase();', note:'The argument to split is a regular expression, which surprises people the first time a "." fails to work.'}
      ]
    },
    hints:['Split the name into words first, then take character 0 of each one and add it to a string you are building up.','Guard the empty word: "".split(" ") gives [""], and that entry has no character 0 to read.'],
    takeaway:'A string is a read-only sequence of characters. Every member that looks like it changes one — toUpperCase, slice, split — hands back something new instead, which is why the result has to be assigned somewhere to matter.', reference:refs.strings
  },
  {
    id:'the-log-that-lies', kind:'debug', chapter:'Programming', concept:'Reading a failure', name:'The log that lies', location:'Diagnostics bay',
    objective:'average(readings) is already written, and it is wrong. Read the failures and repair it.',
    intro:'This console hands you a program that already compiles. It is still wrong. The test cases below tell you exactly how — your job is to read them rather than to rewrite from scratch.',
    lesson:'Three separate faults hide in four lines. Starting the counter at 1 skips the first reading. Testing i <= readings.length walks one step past the end, and this sandbox reports that instead of quietly handing back undefined the way JavaScript would. Dividing by a length of zero is the third: an empty log has no average, so the function has to decide what to return before it divides. Fix one fault at a time and re-run; the case list tells you which ones are left.',
    toolkit:['return', 'let', 'for', 'if / else', 'readings.length', 'readings[i]', 'sum / count', 'print()'],
    signature:'function average(readings)', fn:'average',
    cases:[
      {args:[[2,4,6]], expect:4},
      {args:[[10]], expect:10},
      {args:[[]], expect:0, note:'an empty log averages to 0 here'},
      {args:[[1,2]], expect:1.5, note:'the answer need not be whole'},
      {args:[[-4,4,-4,4]], expect:0}
    ],
    starter:'function average(readings) {\n  let sum = 0;\n  for (let i = 1; i <= readings.length; i++) {\n    sum += readings[i];\n  }\n  return sum / readings.length;\n}\n',
    solution:'function average(readings) {\n  if (readings.length === 0) {\n    return 0;\n  }\n  let sum = 0;\n  for (let i = 0; i < readings.length; i++) {\n    sum += readings[i];\n  }\n  return sum / readings.length;\n}',
    hints:['Array positions run from 0 to length − 1. Both ends of this loop are one out.','The empty case cannot be fixed inside the loop, because the loop never runs. Decide what to return before dividing.'],
    takeaway:'A failing case is a description of the bug, not an accusation. Off-by-one errors and the empty input are the two mistakes that survive the longest, because a small hand-run rarely covers either.', reference:refs.offByOne
  },
  {
    id:'the-name-that-hides', kind:'debug', chapter:'Programming', concept:'Scope & shadowing', name:'The value that never changed', location:'Peak monitor',
    objective:'highest(values) is already written, and it always reports the first reading. Find out why.',
    intro:'This monitor is supposed to report the highest reading of the shift. It reports whatever arrived first. The loop looks right, the comparison looks right, and it still does not work.',
    lesson:'let has block scope: the variable belongs to the braces it was declared in and vanishes at the closing one. Declaring a name that already exists further out does not change the outer one — it creates a second, separate variable that hides the first for the length of the block. That is called shadowing, and it is legal, which is what makes it hard to see. The giveaway is a let inside a loop or an if that is meant to update something declared outside it. Assignment reaches out; declaration does not.',
    toolkit:['return', 'let', 'for', 'if', 'values.length', 'values[i]', 'best', 'print()'],
    signature:'function highest(values)', fn:'highest',
    cases:[
      {args:[[3,9,2]], expect:9},
      {args:[[5]], expect:5, note:'one reading is its own peak'},
      {args:[[-4,-9,-1]], expect:-1, note:'every reading is below zero'},
      {args:[[2,2,2]], expect:2},
      {args:[[1,2,3,4,5]], expect:5, note:'the peak arrives last'}
    ],
    starter:'function highest(values) {\n  let best = values[0];\n  for (let i = 1; i < values.length; i++) {\n    if (values[i] > best) {\n      let best = values[i];\n    }\n  }\n  return best;\n}\n',
    solution:'function highest(values) {\n  let best = values[0];\n  for (let i = 1; i < values.length; i++) {\n    if (values[i] > best) {\n      best = values[i];\n    }\n  }\n  return best;\n}',
    hints:['Two of the five cases pass. Ask what those two have in common, and what the other three need that they do not.','Look at the line inside the if. It declares something rather than changing something.'],
    takeaway:'let declares; plain assignment changes. A let inside a block that repeats a name from outside it builds a second variable that is thrown away at the closing brace, and the outer one is never touched.', reference:refs.scope
  },
  {
    id:'answer-and-leave', kind:'refactor', chapter:'Programming', concept:'Guard clauses', name:'Answer and leave', location:'Thermal monitor',
    objective:'band(reading) already answers every case. Rewrite it so each rule answers and leaves, instead of nesting inside the one before it.',
    intro:'Four thresholds, four answers, and the code that picks between them is indented five levels deep. Every case passes. That is not the problem.',
    lesson:'Nested else branches make the reader hold every condition that got them there in their head at once, and the deepest answer is the hardest to see. A guard clause inverts that: test one thing, answer, and return. The next line then knows that the first condition was false without saying so, so each rule is read on its own and the last line is the ordinary case. The cost is that a function has several exits rather than one, which used to be considered a fault and is now considered the point. Note what disappears along with the nesting: the mutable result variable, which existed only to carry an answer to a single return at the bottom.',
    toolkit:['return', 'if', 'reading < 40', 'print()'],
    signature:'function band(reading)', fn:'band',
    shape:{maxStatements:9},
    cases:[
      {args:[-3], expect:'invalid'},
      {args:[12], expect:'cool'},
      {args:[40], expect:'warm', note:'exactly on a threshold'},
      {args:[69], expect:'warm'},
      {args:[70], expect:'hot'},
      {args:[89], expect:'hot'},
      {args:[90], expect:'critical', note:'the last band has no upper bound'},
      {args:[0], expect:'cool'}
    ],
    starter:'function band(reading) {\n  let result = "";\n  if (reading < 0) {\n    result = "invalid";\n  } else {\n    if (reading < 40) {\n      result = "cool";\n    } else {\n      if (reading < 70) {\n        result = "warm";\n      } else {\n        if (reading < 90) {\n          result = "hot";\n        } else {\n          result = "critical";\n        }\n      }\n    }\n  }\n  return result;\n}\n',
    solution:'function band(reading) {\n  if (reading < 0) {\n    return "invalid";\n  }\n  if (reading < 40) {\n    return "cool";\n  }\n  if (reading < 70) {\n    return "warm";\n  }\n  if (reading < 90) {\n    return "hot";\n  }\n  return "critical";\n}',
    artifact:{
      title:'The same four thresholds, three ways',
      note:'All three answer every case. Read them for how much you have to hold in your head to know what a reading of 75 returns.',
      panes:[
        {label:'nested', code:'if (r < 0) {\n  result = "invalid";\n} else {\n  if (r < 40) {\n    result = "cool";\n  } else {\n    if (r < 70) { ... }\n  }\n}', note:'To reach the answer for 75 you carry three conditions and their negations down five levels of indentation. The last band is the hardest to find and the most likely to be wrong.'},
        {label:'guarded', code:'if (r < 0)  { return "invalid"; }\nif (r < 40) { return "cool"; }\nif (r < 70) { return "warm"; }\nif (r < 90) { return "hot"; }\nreturn "critical";', note:'Each line is read alone. Reaching line three already means the first two were false, so the conditions never have to be negated by hand.'},
        {label:'table', code:'let bands = [\n  {limit: 0,  name: "invalid"},\n  {limit: 40, name: "cool"},\n  {limit: 70, name: "warm"},\n  {limit: 90, name: "hot"}\n];', note:'When the thresholds start changing more often than the logic does, the bands become data and one loop reads them. Four rules is too few to be worth it; forty is not.'},
        {label:'what it costs', code:'nested   : 1 exit, 5 levels deep\nguarded  : 5 exits, 1 level deep\n\n"single exit" was a rule from an era\nof manual memory and goto. It is\nnot a rule about readability.', note:'The single-return style comes from languages where every path had to free the same resources by hand. Where that is not true, the extra exits cost nothing and the flat reading is worth a lot.'}
      ]
    },
    hints:['Start from the bottom: the last answer needs no condition at all, because everything else has already returned.','Each band becomes one if that returns. The result variable is not needed once nothing has to carry an answer downwards.'],
    takeaway:'A guard clause answers the easy case and leaves, so the rest of the function is read knowing that case is already handled. Several exits are cheaper to read than several levels of indentation.', reference:refs.guard
  },
  {
    id:'sweep-the-deck', kind:'algo', chapter:'Programming', concept:'Nested loops', name:'Sweep the whole deck', location:'Thermal grid',
    objective:'Write hottest(deck) so it returns a record naming the row, column, and value of the warmest cell.',
    intro:'The thermal map arrives as an array of rows, and each row is an array of readings. Finding the hottest cell means visiting every one of them.',
    lesson:'An array of arrays is a grid: deck[r] is a row and deck[r][c] is a cell in it. A loop inside a loop visits every cell — the outer one over rows, the inner one over the columns of that row. The work is rows × columns, which is why a grid twice as wide and twice as tall takes four times as long. Two readings can tie, so decide the rule up front: comparing with > keeps the first one found, and >= would keep the last.',
    toolkit:['return', 'let', 'for', 'deck.length', 'deck[r].length', 'deck[r][c]', '{ row: r, column: c, value: v }', 'print()'],
    signature:'function hottest(deck)', fn:'hottest',
    cases:[
      {args:[[[3,8,1],[9,2,7],[4,6,5]]], expect:{row:1, column:0, value:9}},
      {args:[[[1,2],[3,4]]], expect:{row:1, column:1, value:4}},
      {args:[[[5]]], expect:{row:0, column:0, value:5}, note:'one cell'},
      {args:[[[2,2],[2,2]]], expect:{row:0, column:0, value:2}, note:'a tie keeps the first'},
      {args:[[[-9,-3],[-7,-8]]], expect:{row:0, column:1, value:-3}, note:'all below zero'}
    ],
    starter:'function hottest(deck) {\n  let best = {row: 0, column: 0, value: deck[0][0]};\n  // Visit every cell of every row.\n  return best;\n}\n',
    solution:'function hottest(deck) {\n  let best = {row: 0, column: 0, value: deck[0][0]};\n  for (let r = 0; r < deck.length; r++) {\n    for (let c = 0; c < deck[r].length; c++) {\n      if (deck[r][c] > best.value) {\n        best = {row: r, column: c, value: deck[r][c]};\n      }\n    }\n  }\n  return best;\n}',
    hints:['The outer loop runs to deck.length; the inner one to deck[r].length, because rows need not all be the same width.','When a cell beats the best so far, store all three facts at once: best = {row: r, column: c, value: deck[r][c]};'],
    takeaway:'Nested loops multiply. One loop over n is n steps; a loop inside a loop is n × m, and that product is what you are agreeing to every time you write one.', reference:refs.nested
  },

  {
    id:'divide-and-conquer', kind:'algo', chapter:'Programming', concept:'Binary search', name:'Halve the problem', location:'Star catalogue',
    objective:'Write find(sorted, target) so it returns the position of target, or −1, without scanning every entry.',
    intro:'The catalogue is already sorted. A scan from the start would work, but the last two cases allow only 800 interpreter steps each, and a scan of 1,024 entries needs thousands.',
    lesson:'Binary search compares the middle entry with the target. If the middle is too small, the answer cannot be to its left, so half the remaining range disappears; if it is too large, the other half goes. Each comparison halves what is left, so 1,024 entries take about 10 comparisons and a million take about 20. It only works because the input is sorted.',
    toolkit:['return', 'let', 'while', 'if / else', 'sorted.length', 'sorted[middle]', 'Math.floor()', 'print()'],
    signature:'function find(sorted, target)', fn:'find',
    cases:[
      {args:[[1,3,5,7,9],7], expect:3},
      {args:[[1,3,5,7,9],1], expect:0},
      {args:[[1,3,5,7,9],9], expect:4},
      {args:[[1,3,5,7,9],4], expect:-1, note:'not present'},
      {args:[[],5], expect:-1},
      {args:[ramp(1024,3),1533], expect:511, note:'1,024 entries, at most 800 steps', maxOperations:800},
      {args:[ramp(1024,3),3070], expect:-1, note:'missing, at most 800 steps', maxOperations:800}
    ],
    gateHint:'Halving the range each time turns thousands of comparisons into about ten.',
    starter:'function find(sorted, target) {\n  let low = 0;\n  let high = sorted.length - 1;\n  while (low <= high) {\n    let middle = Math.floor((low + high) / 2);\n    // Compare sorted[middle] with target and discard half the range.\n  }\n  return -1;\n}\n',
    solution:'function find(sorted, target) {\n  let low = 0;\n  let high = sorted.length - 1;\n  while (low <= high) {\n    let middle = Math.floor((low + high) / 2);\n    if (sorted[middle] === target) {\n      return middle;\n    }\n    if (sorted[middle] < target) {\n      low = middle + 1;\n    } else {\n      high = middle - 1;\n    }\n  }\n  return -1;\n}',
    hints:['Three cases: the middle entry is the target, it is too small, or it is too large. Move low or high past the middle so the range always shrinks.','If sorted[middle] < target then low = middle + 1, otherwise high = middle - 1. Forgetting the + 1 or − 1 makes the loop run forever.'],
    takeaway:'Logarithmic search does about 10 comparisons where a linear scan does 1,024. That gap is what algorithmic complexity measures, and it grows as the input does.', reference:refs.search
  },
  {
    id:'call-yourself', kind:'algo', chapter:'Programming', concept:'Recursion', name:'Call yourself', location:'Signal analyser',
    objective:'Write a recursive gcd(a, b) that returns the greatest common divisor.',
    intro:'Two antennas repeat their patterns every a and b samples. The combined pattern repeats every gcd(a, b) samples. Euclid worked out how to find it without trying every divisor.',
    lesson:'A recursive function calls itself on a smaller version of the same problem and has a base case that stops. Euclid’s insight: any number dividing both a and b also divides a % b, so gcd(a, b) = gcd(b, a % b), and when b reaches 0 the answer is a. Each step shrinks the numbers fast, so even nine-digit inputs finish in a few dozen steps. Without a base case, the calls never stop, and this sandbox reports it instead of crashing the page.',
    toolkit:['return', 'if', 'a % b', 'gcd(b, a % b)', 'print()'],
    signature:'function gcd(a, b)', fn:'gcd', requireRecursion:true,
    cases:[
      {args:[1071,462], expect:21},
      {args:[270,192], expect:6},
      {args:[13,13], expect:13},
      {args:[17,5], expect:1, note:'coprime'},
      {args:[36,0], expect:36, note:'the base case'},
      {args:[1234567890,987654321], expect:9, note:'nine digits, at most 400 steps', maxOperations:400}
    ],
    gateHint:'Trying every divisor up to the smaller number is hundreds of millions of steps. Euclid’s rule needs a few dozen.',
    starter:'function gcd(a, b) {\n  // Base case: when b is 0, the answer is a.\n  // Otherwise call gcd again with smaller numbers.\n  return a;\n}\n',
    solution:'function gcd(a, b) {\n  if (b === 0) {\n    return a;\n  }\n  return gcd(b, a % b);\n}',
    hints:['The base case is b === 0, and then the answer is a. Everything else reduces to gcd(b, a % b).','Two lines: if (b === 0) { return a; } then return gcd(b, a % b);. Notice the arguments swap.'],
    takeaway:'Recursion describes a problem in terms of a smaller copy of itself. The base case is not optional: it is the only thing that ends the calls.', reference:refs.recursion
  },
  {
    id:'balance-the-manifest', kind:'algo', chapter:'Programming', concept:'Stacks', name:'Balance the manifest', location:'Cargo manifest',
    objective:'Write balanced(text) so it returns true when every bracket closes in the right order.',
    intro:'Cargo manifests nest: crates inside pallets inside holds. A closing bracket has to match the most recent unclosed opening bracket, which is exactly what a stack remembers.',
    lesson:'A stack is last in, first out. push adds to the end, pop removes from the end, and an array gives you both. Push every opening bracket; on a closing bracket, pop the most recent opening one and check that they match. Two failure modes are easy to miss: a closing bracket when the stack is empty, and leftovers on the stack when the text ends.',
    toolkit:['return', 'let', 'for', 'if / else', 'text.length', 'text[i]', 'stack.push(c)', 'stack.pop()', 'print()'],
    signature:'function balanced(text)', fn:'balanced',
    cases:[
      {args:['()'], expect:true},
      {args:['([]{})'], expect:true},
      {args:[''], expect:true, note:'nothing is unbalanced'},
      {args:['(]'], expect:false, note:'mismatched pair'},
      {args:['(()'], expect:false, note:'left open'},
      {args:[')('], expect:false, note:'closed before opened'},
      {args:['{[()()]}[]'], expect:true},
      {args:['{[(])}'], expect:false, note:'crossed pairs'}
    ],
    starter:'function balanced(text) {\n  let stack = [];\n  for (let i = 0; i < text.length; i++) {\n    let character = text[i];\n    // Push openings; on a closing bracket, pop and compare.\n  }\n  return stack.length === 0;\n}\n',
    solution:'function balanced(text) {\n  let stack = [];\n  for (let i = 0; i < text.length; i++) {\n    let character = text[i];\n    if (character === "(" || character === "[" || character === "{") {\n      stack.push(character);\n    } else {\n      if (stack.length === 0) {\n        return false;\n      }\n      let open = stack.pop();\n      if (character === ")" && open !== "(") {\n        return false;\n      }\n      if (character === "]" && open !== "[") {\n        return false;\n      }\n      if (character === "}" && open !== "{") {\n        return false;\n      }\n    }\n  }\n  return stack.length === 0;\n}',
    hints:['Push "(", "[" and "{". On any other character, the stack must not be empty, and the popped bracket must be the matching opening one.','Return false as soon as a pair does not match or the stack is empty. At the end, the stack has to be empty too.'],
    takeaway:'A stack turns “the most recent unclosed thing” into one operation. Parsers, undo histories, and the call stack behind your own function calls all work this way.', reference:refs.stack
  },

  {
    id:'first-in-first-served', kind:'debug', chapter:'Programming', concept:'Queues', name:'First in, first served', location:'Repair rota',
    objective:'sweep(rooms, start) is meant to visit compartments in the order a sweep reaches them. It visits them in the wrong order. Repair it.',
    intro:'The repair rota walks the deck plan outward from the airlock, finishing everything one door away before going two doors away. This one dives to the far end and works backwards.',
    lesson:'A stack and a queue hold the same things and differ only in which end comes off. push and pop use one end, so the last item in is the first out — last in, first out. push and shift use opposite ends, so the first item in is the first out — first in, first served. That one choice is the whole difference between the two classic ways to walk a structure: a queue visits everything one step away before anything two steps away, and a stack follows one path as far as it goes before backing up. Neither is more correct; they answer different questions. This deck plan is a tree, so no compartment is reached twice and neither walk needs to remember where it has been.',
    toolkit:['return', 'let', 'while', 'queue.shift()', 'queue.push(next[i])', 'rooms[room]', 'order.push(room)'],
    signature:'function sweep(rooms, start)', fn:'sweep',
    cases:[
      {args:[{dock:['bay','hold'], bay:['lab'], hold:[], lab:[]}, 'dock'], expect:['dock','bay','hold','lab']},
      {args:[{a:['b'], b:['c'], c:[]}, 'a'], expect:['a','b','c'], note:'a single corridor: both walks agree'},
      {args:[{a:['b','c','d'], b:[], c:[], d:[]}, 'a'], expect:['a','b','c','d']},
      {args:[{a:[]}, 'a'], expect:['a'], note:'one compartment, no doors'},
      {args:[{a:['b','c'], b:['d','e'], c:['f'], d:[], e:[], f:[]}, 'a'], expect:['a','b','c','d','e','f'], note:'everything one door away comes before anything two doors away'}
    ],
    starter:'function sweep(rooms, start) {\n  let queue = [start];\n  let order = [];\n  while (queue.length > 0) {\n    let room = queue.pop();\n    order.push(room);\n    let next = rooms[room];\n    for (let i = 0; i < next.length; i++) {\n      queue.push(next[i]);\n    }\n  }\n  return order;\n}\n',
    solution:'function sweep(rooms, start) {\n  let queue = [start];\n  let order = [];\n  while (queue.length > 0) {\n    let room = queue.shift();\n    order.push(room);\n    let next = rooms[room];\n    for (let i = 0; i < next.length; i++) {\n      queue.push(next[i]);\n    }\n  }\n  return order;\n}',
    hints:['The second case passes and the others do not. A single corridor is the one shape where taking from the front and taking from the back give the same answer.','One call is wrong. pop() takes from the end that was pushed last; shift() takes from the end that was pushed first.'],
    takeaway:'A queue and a stack differ by one call. Which end you take from decides whether you finish the near things first or follow one path to its end, and that decision is the algorithm, not a detail of it.', reference:refs.queue
  },
  {
    id:'stop-searching-twice', kind:'refactor', chapter:'Programming', concept:'Lookup tables', name:'Stop searching twice', location:'Cargo registry',
    objective:'duplicate(codes) already answers every case. Rewrite it without a loop inside a loop.',
    intro:'The registry checker works. It also compares every crate code against every other one, and the manifest is getting longer. This console accepts the answer only when the shape is right as well.',
    lesson:'Comparing every pair is n × n / 2 comparisons: ten crates cost 45, and a hundred cost about 5,000. A record removes the inner loop. Remember each code you have seen as a field, and the next code is either already a field or it is not — one step, not a scan. Object.has(record, name) asks the question without reading a field that may not exist. This is the whole idea behind a hash table, and the run counts in the case list show what it buys.',
    toolkit:['return', 'let', 'for', '{ }', 'seen[code] = true', 'Object.has(seen, code)', 'codes.length', 'print()'],
    signature:'function duplicate(codes)', fn:'duplicate',
    shape:{maxLoopDepth:1},
    cases:[
      {args:[['QZ-1','QZ-2','QZ-3']], expect:false},
      {args:[['QZ-1','QZ-2','QZ-1']], expect:true},
      {args:[[]], expect:false, note:'nothing repeats in an empty manifest'},
      {args:[['QZ-9']], expect:false},
      {args:[['A','B','C','D','B']], expect:true},
      {args:[crateCodes], expect:false, note:'120 codes, all different'},
      {args:[[...crateCodes, 'QZ-7']], expect:true, note:'120 codes and one repeat'}
    ],
    starter:'function duplicate(codes) {\n  for (let i = 0; i < codes.length; i++) {\n    for (let j = i + 1; j < codes.length; j++) {\n      if (codes[i] === codes[j]) {\n        return true;\n      }\n    }\n  }\n  return false;\n}\n',
    solution:'function duplicate(codes) {\n  let seen = {};\n  for (let i = 0; i < codes.length; i++) {\n    if (Object.has(seen, codes[i])) {\n      return true;\n    }\n    seen[codes[i]] = true;\n  }\n  return false;\n}',
    polyglot:{
      title:'“Have I seen this already?” in five languages',
      note:'Each of these is a set: a container whose only job is to answer that question in one step.',
      samples:[
        {language:'JavaScript', code:'let seen = {};\nif (Object.has(seen, code)) { return true; }\nseen[code] = true;', note:'A record used as a set. Real JavaScript also has a Set type.'},
        {language:'Python', code:'seen = set()\nif code in seen:\n    return True\nseen.add(code)', note:'`in` on a set is one step; `in` on a list would be a scan.'},
        {language:'Ruby', code:'seen = Set.new\nreturn true if seen.include?(code)\nseen << code', note:'Set comes from the standard library: require "set".'},
        {language:'Go', code:'seen := map[string]bool{}\nif seen[code] {\n\treturn true\n}\nseen[code] = true', note:'A map to bool is the idiomatic Go set; a missing key reads as false.'},
        {language:'Rust', code:'let mut seen = HashSet::new();\nif !seen.insert(code) {\n    return true;\n}', note:'insert returns false when the value was already there, so one call does both.'}
      ]
    },
    hints:['Keep a record of the codes already seen, and check it before adding the next one.','Object.has(seen, codes[i]) is the test; seen[codes[i]] = true; is how a code gets remembered.'],
    takeaway:'Trading memory for time is the oldest move in the book. A pass that remembers what it has seen turns a quadratic search into a linear one, which is exactly what a hash table does for you.', reference:refs.hash
  },
  {
    id:'sort-by-the-field', kind:'algo', chapter:'Programming', concept:'Sorting by a key', name:'Heaviest last', location:'Cargo scales',
    objective:'Write byMass(crates) so it returns the crates ordered from lightest to heaviest, without disturbing crates of equal mass.',
    intro:'The loading order is by mass, lightest first. Crates that weigh the same have already been put in the order the manifest wants, and that order has to survive the sort.',
    lesson:'Sorting records is sorting by a key: the comparison reads one field and the whole record travels with it. Insertion sort does this plainly — walk the list, and slide each crate left past everything heavier than it. Where it stops decides one thing more than the order. If the loop slides past entries that are heavier, two crates of equal mass never swap and the manifest order between them survives; that property is called stability. If it slides past entries that are merely not lighter, equal crates change places and the order you were given is lost. One comparison operator is the whole difference, which is why the case with three equal masses is the one to read.',
    toolkit:['return', 'let', 'for', 'while', 'copy[i].mass', 'copy[i] = copy[i - 1]', 'crates.length'],
    signature:'function byMass(crates)', fn:'byMass',
    cases:[
      {args:[[{code:'C', mass:3}, {code:'A', mass:1}, {code:'B', mass:2}]], expect:[{code:'A', mass:1}, {code:'B', mass:2}, {code:'C', mass:3}]},
      {args:[[{code:'A', mass:5}, {code:'B', mass:5}, {code:'C', mass:5}]], expect:[{code:'A', mass:5}, {code:'B', mass:5}, {code:'C', mass:5}], note:'equal masses keep the manifest order'},
      {args:[[]], expect:[], note:'an empty pallet'},
      {args:[[{code:'Z', mass:9}]], expect:[{code:'Z', mass:9}]},
      {args:[[{code:'C', mass:12}, {code:'A', mass:4}, {code:'B', mass:12}, {code:'D', mass:1}]], expect:[{code:'D', mass:1}, {code:'A', mass:4}, {code:'C', mass:12}, {code:'B', mass:12}], note:'C was manifested before B and still is'},
      {args:[[{code:'A', mass:2}, {code:'B', mass:1}]], expect:[{code:'B', mass:1}, {code:'A', mass:2}]}
    ],
    starter:'function byMass(crates) {\n  let copy = crates.slice(0);\n  // Slide each crate left past everything heavier than it.\n  return copy;\n}\n',
    solution:'function byMass(crates) {\n  let copy = crates.slice(0);\n  for (let i = 1; i < copy.length; i++) {\n    let moving = copy[i];\n    let j = i;\n    while (j > 0 && copy[j - 1].mass > moving.mass) {\n      copy[j] = copy[j - 1];\n      j = j - 1;\n    }\n    copy[j] = moving;\n  }\n  return copy;\n}',
    hints:['Copy the array first: crates.slice(0) gives you one you can rearrange without changing the caller’s.','The inner loop slides left while the crate on the left is heavier. Using "heavier" rather than "not lighter" is what keeps equal crates in the order they arrived.'],
    takeaway:'Sorting by a key compares one field and moves the whole record. A sort is stable when records that compare equal come out in the order they went in, and that is decided by a single > against a >=.', reference:refs.insertion
  },
  {
    id:'break-it-into-tokens', kind:'algo', chapter:'Programming', concept:'Tokenising', name:'Break it into tokens', location:'Command parser',
    objective:'Write tokenise(source) so it turns an expression such as "12 + 345" into a list of token records.',
    intro:'The station accepts typed commands, and the first thing any language does with typed text is cut it into pieces. Numbers and operators — nothing else, for now.',
    lesson:'A tokeniser walks the text once with an index it moves itself, which is why this is a while loop rather than a for loop: a number consumes several characters at a time. Three cases cover everything here. A space is skipped. A digit begins a number, and the inner loop keeps taking digits while they last, so "345" becomes one token rather than three. Anything else is a one-character operator. "0123456789".indexOf(character) is how you ask whether a character is a digit: it answers −1 when it is not. Each token is a record — {kind: "number", text: "345"} — and the text stays text, because turning it into a number is the next stage’s job.',
    toolkit:['return', 'let', 'while', 'source[i]', 'source.length', '"0123456789".indexOf(c)', 'tokens.push({ })', 'print()'],
    signature:'function tokenise(source)', fn:'tokenise',
    cases:[
      {args:['1+2'], expect:[{kind:'number', text:'1'},{kind:'operator', text:'+'},{kind:'number', text:'2'}]},
      {args:['12 + 345'], expect:[{kind:'number', text:'12'},{kind:'operator', text:'+'},{kind:'number', text:'345'}], note:'spaces are separators, not tokens'},
      {args:['  7  '], expect:[{kind:'number', text:'7'}]},
      {args:[''], expect:[], note:'nothing in, nothing out'},
      {args:['2*3+4'], expect:[{kind:'number', text:'2'},{kind:'operator', text:'*'},{kind:'number', text:'3'},{kind:'operator', text:'+'},{kind:'number', text:'4'}]},
      {args:['10*20*30'], expect:[{kind:'number', text:'10'},{kind:'operator', text:'*'},{kind:'number', text:'20'},{kind:'operator', text:'*'},{kind:'number', text:'30'}], note:'multi-digit numbers stay whole'}
    ],
    starter:'function tokenise(source) {\n  let tokens = [];\n  let i = 0;\n  while (i < source.length) {\n    let character = source[i];\n    // A space: skip it. A digit: take the whole number. Anything else: one operator.\n    i++;\n  }\n  return tokens;\n}\n',
    solution:'function tokenise(source) {\n  let tokens = [];\n  let i = 0;\n  while (i < source.length) {\n    let character = source[i];\n    if (character === " ") {\n      i++;\n    } else if ("0123456789".indexOf(character) >= 0) {\n      let digits = "";\n      while (i < source.length && "0123456789".indexOf(source[i]) >= 0) {\n        digits = digits + source[i];\n        i++;\n      }\n      tokens.push({kind: "number", text: digits});\n    } else {\n      tokens.push({kind: "operator", text: character});\n      i++;\n    }\n  }\n  return tokens;\n}',
    polyglot:{
      title:'“Is this character a digit?” in five languages',
      note:'Reading one character out of a string is where languages stop agreeing. What a string is made of turns out not to be obvious.',
      samples:[
        {language:'JavaScript', code:'let character = source[i];\nif ("0123456789".indexOf(character) >= 0) {\n  // a digit\n}', note:'Indexing a string gives a one-character string, not a number. There is no character type.'},
        {language:'Python', code:'character = source[i]\nif character.isdigit():\n    # a digit', note:'Also a one-character string, and the check is a method on it.'},
        {language:'Ruby', code:'character = source[i]\nif character.match?(/[0-9]/)\n  # a digit\nend', note:'Ruby reaches for a pattern where the others reach for a lookup.'},
        {language:'Go', code:'c := source[i]\nif c >= \'0\' && c <= \'9\' {\n\t// a digit\n}', note:'Indexing a Go string gives a byte, so the check is arithmetic on its value.'},
        {language:'Rust', code:'let c = source.as_bytes()[i] as char;\nif c.is_ascii_digit() {\n    // a digit\n}', note:'Rust strings are UTF-8, so it will not let you index by character position without saying what you mean.'}
      ]
    },
    hints:['Move i yourself. A space advances it by one; an operator pushes a token and advances it by one; a digit runs an inner while loop that takes every digit in a row.','"0123456789".indexOf(character) >= 0 is true exactly when the character is a digit. Build the number’s text by joining characters, and push it only once the digits run out.'],
    takeaway:'This is the first stage of every compiler and interpreter there is, including the one running your program right now. Text becomes tokens; tokens become a structure; the structure becomes an answer.', reference:refs.lexing
  },
  {
    id:'work-out-the-answer', kind:'algo', chapter:'Programming', concept:'Precedence', name:'Work out the answer', location:'Command parser',
    objective:'Write evaluate(tokens) so it computes the value of a token list, with × binding tighter than + and −.',
    intro:'The tokens arrive already cut up, and their numbers already converted. What is left is the part everyone gets wrong first: 2 + 3 × 4 is 14, not 20.',
    lesson:'Precedence means some operators claim their neighbours before others do. Two passes are enough for these three. The first walks the tokens and folds every × into the value on its left, leaving a list of values with only + and − between them. The second runs that list left to right, because + and − at the same precedence are settled in the order they were written: 5 − 2 + 1 is 4, not 2. The tokens alternate — value, operator, value, operator, value — so the walk moves two at a time, and a single number with no operator at all is already the answer.',
    toolkit:['return', 'let', 'while', 'tokens[i].kind', 'tokens[i].text', 'tokens[i].value', 'values.push(v)', 'print()'],
    signature:'function evaluate(tokens)', fn:'evaluate',
    cases:[
      {args:[[numberToken(2),operatorToken('+'),numberToken(3)]], expect:5},
      {args:[[numberToken(2),operatorToken('+'),numberToken(3),operatorToken('*'),numberToken(4)]], expect:14, note:'× binds tighter than +'},
      {args:[[numberToken(2),operatorToken('*'),numberToken(3),operatorToken('+'),numberToken(4)]], expect:10},
      {args:[[numberToken(7)]], expect:7, note:'one number, no operators'},
      {args:[[numberToken(2),operatorToken('*'),numberToken(3),operatorToken('*'),numberToken(4)]], expect:24},
      {args:[[numberToken(1),operatorToken('+'),numberToken(2),operatorToken('+'),numberToken(3),operatorToken('*'),numberToken(10)]], expect:33},
      {args:[[numberToken(5),operatorToken('-'),numberToken(2),operatorToken('+'),numberToken(1)]], expect:4, note:'+ and − run left to right'}
    ],
    starter:'function evaluate(tokens) {\n  // Pass one: fold every × into the value on its left.\n  // Pass two: add and subtract what is left, left to right.\n  return 0;\n}\n',
    solution:'function evaluate(tokens) {\n  let folded = [tokens[0].value];\n  let signs = [];\n  let i = 1;\n  while (i < tokens.length) {\n    let sign = tokens[i].text;\n    let value = tokens[i + 1].value;\n    if (sign === "*") {\n      folded[folded.length - 1] = folded[folded.length - 1] * value;\n    } else {\n      signs.push(sign);\n      folded.push(value);\n    }\n    i += 2;\n  }\n  let total = folded[0];\n  for (let j = 0; j < signs.length; j++) {\n    if (signs[j] === "+") {\n      total += folded[j + 1];\n    } else {\n      total -= folded[j + 1];\n    }\n  }\n  return total;\n}',
    hints:['Keep two lists: the values after every × has been folded away, and the + and − signs between them. Start folded with tokens[0].value and step i by 2.','On a ×, multiply into the last value of folded instead of pushing a new one. Then walk signs once, adding or subtracting folded[j + 1].'],
    takeaway:'You have now written both halves of an interpreter: text to tokens, tokens to a value. Precedence is not a property of arithmetic — it is a rule the language chooses, and the evaluator is where that choice lives.', reference:refs.precedence
  },
  {
    id:'same-idea-five-ways', kind:'quiz', chapter:'Programming', concept:'Reading other languages', name:'Same idea, five ways', location:'Translation desk',
    objective:'Read the same function written in five languages and answer what each one is telling you.',
    intro:'Nothing in this chapter was really about JavaScript. Here is the total() you wrote in the language you know, and in four you may not — read them, and see how little is actually new.',
    lesson:'Every one of these declares a function, walks a sequence, accumulates into a variable and returns it. What differs is what the language insists you say. Python and Ruby say almost nothing and decide types as they run. Go says the type of every value and returns early on errors. Rust says the type and also who owns each value, so &[i64] means “borrow this slice, do not take it”. Syntax is the smallest difference between languages; how they handle types, memory and failure is the real one.',
    instructions:'Read the panel below, then answer. Each question is about what the code says, not about which language is better.',
    polyglot:{
      title:'total(values) in five languages',
      note:'The same loop five times. The differences are in what each language makes you declare.',
      samples:[
        {language:'JavaScript', code:'function total(values) {\n  let sum = 0;\n  for (let i = 0; i < values.length; i++) {\n    sum += values[i];\n  }\n  return sum;\n}', note:'No types written down. let is block-scoped and the loop index is managed by hand.'},
        {language:'Python', code:'def total(values):\n    sum = 0\n    for value in values:\n        sum += value\n    return sum', note:'Blocks are indentation, not braces. The loop walks the values themselves — no index at all.'},
        {language:'Ruby', code:'def total(values)\n  values.sum\nend', note:'The last expression is the return value. Ruby prefers the collection method over the loop.'},
        {language:'Go', code:'func total(values []int64) int64 {\n\tvar sum int64 = 0\n\tfor _, value := range values {\n\t\tsum += value\n\t}\n\treturn sum\n}', note:'Types are written down and checked before it runs. _ discards the index you did not want.'},
        {language:'Rust', code:'fn total(values: &[i64]) -> i64 {\n    let mut sum = 0;\n    for value in values {\n        sum += value;\n    }\n    sum\n}', note:'&[i64] borrows the slice rather than taking it, and mut marks the one variable that changes.'}
      ]
    },
    questions:[
      {prompt:'In the Python version, what does for value in values give you on each turn?', options:[{label:'the position of the next entry'},{label:'the next entry itself'},{label:'a copy of the whole list'},{label:'nothing until the loop ends'}], answer:1, why:'Python’s for walks the values directly. Getting positions instead needs enumerate(values) or range(len(values)).'},
      {prompt:'The Rust signature says values: &[i64]. What is the & doing?', options:[{label:'making the values changeable'},{label:'borrowing the data instead of taking ownership of it'},{label:'marking the parameter as optional'},{label:'copying the list into the function'}], answer:1, why:'& is a borrow: the caller keeps ownership and the function only reads. Without it the value would be moved into the function and the caller could not use it again.'},
      {prompt:'Go writes []int64 and int64 in the signature. What does that buy?', options:[{label:'faster loops at run time'},{label:'errors caught before the program runs'},{label:'shorter code'},{label:'automatic memory management'}], answer:1, why:'Declared types are checked at compile time, so a mismatched call fails to build rather than failing in production.'},
      {prompt:'Ruby’s version has no return. What does it give back?', options:[{label:'nothing'},{label:'the value of its last expression'},{label:'the array it was given'},{label:'an error'}], answer:1, why:'In Ruby, and in Rust’s final line too, the last expression is the result. The explicit return is for leaving early.'},
      {prompt:'Which difference between these five would survive rewriting them all in the same brace style?', options:[{label:'where the semicolons go'},{label:'whether types are checked before the program runs'},{label:'the name of the loop variable'},{label:'the indentation'}], answer:1, why:'Braces, semicolons and indentation are surface. Static versus dynamic typing changes when your mistakes are found, which is a real difference.'}
    ],
    quizSuccess:'Same loop, five languages. The syntax is the part you can look up.',
    solution:[1,1,1,1,1],
    hints:['Read each note under the sample before answering: each one points at exactly what its language is making the author declare.','Four of the five answers are the second option, which is a coincidence — check each one against the code rather than the pattern.'],
    takeaway:'Learning a second language is mostly learning what it insists on: types before it runs, ownership of memory, or nothing at all until something breaks. The loop is the same everywhere.', reference:refs.syntax
  },
  {
    id:'remember-the-answer', kind:'algo', chapter:'Programming', concept:'Memoisation', name:'Remember the answer', location:'Access ladder',
    objective:'Write routes(rungs) so it counts the ways up a ladder — without recomputing what it has already worked out.',
    intro:'You can take one rung at a time or two. With four rungs there are five ways up. With sixty there are more than two trillion, and the obvious program will not finish today.',
    lesson:'The obvious recursion is right and unusable. routes(n) calls routes(n−1) and routes(n−2), each of which calls two more, so the calls double at every level and the same subproblem is solved over and over: computing routes(22) works out routes(5) more than a thousand times. The answers never change, so record them. Keep a record of what you have already computed, look in it before recursing, and store every result on the way out. The number of distinct subproblems is only n, so the work falls from exponential to linear — and the shape of the program barely changes. That trade, memory for repeated work, is the whole of dynamic programming.',
    signature:'function routes(rungs)', fn:'routes',
    toolkit:['return', 'let', 'if', '{ }', 'Object.has(seen, key)', 'seen[key] = n', 'routes(rungs - 1)', 'print()'],
    limits:{operations:2000000},
    cases:[
      {args:[1], expect:1, note:'one rung, one way'},
      {args:[2], expect:2, note:'two ones, or one two'},
      {args:[3], expect:3},
      {args:[4], expect:5},
      {args:[10], expect:89},
      {args:[22], expect:28657, note:'22 rungs, at most 3,000 steps', maxOperations:3000},
      {args:[60], expect:2504730781961, note:'60 rungs, at most 6,000 steps', maxOperations:6000}
    ],
    gateHint:'Every subproblem is solved once if you remember its answer. There are only as many subproblems as there are rungs.',
    starter:'function routes(rungs) {\n  if (rungs <= 2) {\n    return rungs;\n  }\n  // Correct, and it recomputes everything. Give it somewhere to remember.\n  return routes(rungs - 1) + routes(rungs - 2);\n}\n',
    solution:'function routes(rungs) {\n  let seen = {};\n  return count(rungs, seen);\n}\n\nfunction count(rungs, seen) {\n  if (rungs <= 2) {\n    return rungs;\n  }\n  let key = "n" + rungs;\n  if (Object.has(seen, key)) {\n    return seen[key];\n  }\n  let total = count(rungs - 1, seen) + count(rungs - 2, seen);\n  seen[key] = total;\n  return total;\n}',
    polyglot:{
      title:'Memoising the same function in five languages',
      note:'Every one of these is the naive recursion plus somewhere to remember. Three of the five have it built in.',
      samples:[
        {language:'JavaScript', code:'function routes(n, seen) {\n  if (n <= 2) { return n; }\n  if (Object.has(seen, "n" + n)) {\n    return seen["n" + n];\n  }\n  seen["n" + n] =\n    routes(n-1, seen) + routes(n-2, seen);\n  return seen["n" + n];\n}', note:'Carry the record through the calls. Real JavaScript would use a Map, whose keys need not be strings.'},
        {language:'Python', code:'from functools import cache\n\n@cache\ndef routes(n):\n    if n <= 2:\n        return n\n    return routes(n-1) + routes(n-2)', note:'One line above the unchanged function. The decorator wraps it in a dictionary keyed by the arguments.'},
        {language:'Ruby', code:'def routes(n, seen = {})\n  return n if n <= 2\n  seen[n] ||= routes(n-1, seen) +\n              routes(n-2, seen)\nend', note:'||= assigns only when the key is missing, so the lookup and the store are one line.'},
        {language:'Go', code:'var seen = map[int]int64{}\n\nfunc routes(n int) int64 {\n\tif n <= 2 { return int64(n) }\n\tif v, ok := seen[n]; ok { return v }\n\tseen[n] = routes(n-1) + routes(n-2)\n\treturn seen[n]\n}', note:'The two-value map read — value and "was it there" — is how Go distinguishes a stored zero from a missing key.'},
        {language:'Rust', code:'fn routes(n: u64, seen: &mut HashMap<u64, u64>)\n    -> u64 {\n    if n <= 2 { return n; }\n    if let Some(&v) = seen.get(&n) { return v; }\n    let v = routes(n-1, seen) + routes(n-2, seen);\n    seen.insert(n, v);\n    v\n}', note:'&mut is the compiler being told there is exactly one writer, which is why this cannot race.'}
      ]
    },
    hints:['Run it as it stands and read the step counts. The small cases are instant and the twenty-second is four hundred thousand steps, because it is recomputing the same answers.','Take a record along through the calls: check it before recursing, store the result before returning. A helper that takes the record as a second parameter is the easiest way to do it here.'],
    takeaway:'Exponential and linear can be two lines apart. When a recursion revisits the same subproblem, the fix is not a cleverer recursion — it is remembering.', reference:refs.memoisation
  },
  {
    id:'whose-array-is-it', kind:'debug', chapter:'Programming', concept:'Aliasing', name:'Whose array is it?', location:'Telemetry review',
    objective:'ranked(readings) returns the right answer and damages the log it was given. Repair it.',
    intro:'The sorted display is correct. The raw log, on the next screen over, is now also sorted — and the order it arrived in was the only record of when each reading was taken.',
    lesson:'An array is not copied when it is passed. The parameter is a second name for the same array, so writing into it writes into the caller’s. The tests here check the returned value and the argument: a function that gets the right answer by rearranging its input has still broken something the caller was relying on. The fix is to work on a copy. Take one explicitly — walk the input and push each value into a new array — and every write after that lands somewhere the caller does not share. This is why so much modern code prefers building a new value to changing an existing one: a function that only reads its arguments can be called from anywhere, in any order, without anyone having to know what it does inside.',
    signature:'function ranked(readings)', fn:'ranked',
    toolkit:['return', 'let', 'for', 'if', 'readings.length', 'readings[i]', 'copy.push(value)', 'print()'],
    cases:[
      {args:[[3,1,2]], expect:[1,2,3], expectArgs:[[3,1,2]], note:'the log itself must come back unchanged'},
      {args:[[5]], expect:[5], expectArgs:[[5]]},
      {args:[[]], expect:[], expectArgs:[[]]},
      {args:[[2,2,1]], expect:[1,2,2], expectArgs:[[2,2,1]]},
      {args:[[9,-4,0,7]], expect:[-4,0,7,9], expectArgs:[[9,-4,0,7]]}
    ],
    starter:'function ranked(readings) {\n  for (let i = 0; i < readings.length; i++) {\n    for (let j = 0; j < readings.length - 1; j++) {\n      if (readings[j] > readings[j + 1]) {\n        let hold = readings[j];\n        readings[j] = readings[j + 1];\n        readings[j + 1] = hold;\n      }\n    }\n  }\n  return readings;\n}\n',
    solution:'function ranked(readings) {\n  let copy = [];\n  for (let i = 0; i < readings.length; i++) {\n    copy.push(readings[i]);\n  }\n  for (let i = 0; i < copy.length; i++) {\n    for (let j = 0; j < copy.length - 1; j++) {\n      if (copy[j] > copy[j + 1]) {\n        let hold = copy[j];\n        copy[j] = copy[j + 1];\n        copy[j + 1] = hold;\n      }\n    }\n  }\n  return copy;\n}',
    artifact:{
      title:'Two names, one array',
      note:'Nothing here is a bug in the sort. The sort is fine. What is wrong is who owns the thing it sorted.',
      panes:[
        {label:'the symptom', code:'log      = [9, 3, 7, 1]\ndisplay  = ranked(log)\n\ndisplay → [1, 3, 7, 9]   ✓\nlog     → [1, 3, 7, 9]   ✗', note:'The caller never assigned to log. It changed anyway, because ranked() was handed the array itself and not a copy of it.'},
        {label:'what is passed', code:'log ────────┐\n            ▼\n        [9,3,7,1]\n            ▲\nreadings ───┘\n\nboth names refer to one array', note:'The value passed is the reference. Two names, one array — which is also why returning it looks like it worked.'},
        {label:'copying', code:'let copy = [];\nfor (…) { copy.push(readings[i]); }\n\n// or, outside this sandbox:\nconst copy = [...readings];\nconst copy = readings.slice();', note:'A shallow copy is enough when the entries are numbers. If they were records, the copy would share those, and the same bug would come back one level down.'},
        {label:'the convention', code:'sort()      changes and returns it\ntoSorted()  returns a new one\nreverse() / toReversed()\nsplice()   / toSpliced()', note:'JavaScript added the second column in 2023 precisely because the first had caused this bug for thirty years.'}
      ]
    },
    hints:['The cases check two things: what comes back, and what the argument looks like afterwards. Yours passes the first and fails the second.','Build a copy before you sort. Push each reading into a new array, then sort and return that one.'],
    takeaway:'Passing an array gives away a handle on it, not a snapshot of it. Decide deliberately whether a function reads its arguments or owns them, and say so in the name.', reference:refs.aliasing
  },
  {
    id:'write-the-tests', kind:'spec', chapter:'Programming', concept:'Test design', name:'Write the tests', location:'Verification bay',
    objective:'Here the code is written and the tests are not. Return a suite that accepts the correct version and rejects all four broken ones.',
    intro:'Four engineers each submitted a clamp(). One is right. Your job is not to read them — it is to write the cases that tell them apart.',
    lesson:'A test suite is only as good as what it rejects. Cases in the middle of a range agree with almost any implementation, which is why a suite of happy paths passes code that is badly wrong. Three habits do most of the work. Test the boundaries, because that is where < and <= disagree and where nearly every off-by-one lives. Test each branch, so that a version which only handles one side of a condition is caught by the side it ignores. And test the cases that look degenerate — a range entirely below zero, a value equal to its own limit — because an implementation that special-cases them will otherwise go unnoticed. Write cases(), returning a list of records: each one is {args: [...], expect: ...}. Every expectation has to be right, or the suite is worse than none.',
    signature:'function cases()', fn:'cases',
    toolkit:['return', '[ ]', '{args: [...], expect: ...}', 'clamp(value, low, high)'],
    subject:{
      name:'clamp', parameters:3,
      signature:'function clamp(value, low, high)',
      contract:'clamp(value, low, high)\n\n  returns low    when value is below low\n  returns high   when value is above high\n  returns value  otherwise\n\n  Both bounds are inclusive: a value equal\n  to a bound is inside the range.'
    },
    correct:'function clamp(value, low, high) {\n  if (value < low) {\n    return low;\n  }\n  if (value > high) {\n    return high;\n  }\n  return value;\n}',
    mutants:[
      {name:'only clamps the low end', why:'Nothing in your suite passes a value above the high bound.',
        code:'function clamp(value, low, high) {\n  if (value < low) { return low; }\n  return value;\n}'},
      {name:'only clamps the high end', why:'Nothing in your suite passes a value below the low bound.',
        code:'function clamp(value, low, high) {\n  if (value > high) { return high; }\n  return value;\n}'},
      {name:'excludes the bounds', why:'Nothing in your suite passes a value exactly equal to a bound, which is where < and <= disagree.',
        code:'function clamp(value, low, high) {\n  if (value <= low) { return low + 1; }\n  if (value >= high) { return high - 1; }\n  return value;\n}'},
      {name:'assumes the range is positive', why:'Nothing in your suite uses a range that lies entirely below zero.',
        code:'function clamp(value, low, high) {\n  if (low < 0) { return 0; }\n  if (value < low) { return low; }\n  if (value > high) { return high; }\n  return value;\n}'}
    ],
    minimumCases:5,
    starter:'function cases() {\n  return [\n    {args: [5, 0, 10], expect: 5}\n  ];\n}\n',
    solution:'function cases() {\n  return [\n    {args: [5, 0, 10], expect: 5},\n    {args: [-3, 0, 10], expect: 0},\n    {args: [99, 0, 10], expect: 10},\n    {args: [0, 0, 10], expect: 0},\n    {args: [10, 0, 10], expect: 10},\n    {args: [-5, -9, -1], expect: -5}\n  ];\n}',
    artifact:{
      title:'What a suite is actually measured by',
      note:'Coverage says which lines ran. Mutation testing says which mistakes would have been caught, which is the question you actually care about.',
      panes:[
        {label:'a useless suite', code:'test clamp(5, 0, 10) === 5   ✓\ntest clamp(7, 0, 10) === 7   ✓\ntest clamp(3, 0, 10) === 3   ✓\n\n3 passing, 100% line coverage\n4 of 4 broken versions accepted', note:'Every line of the reference runs and nothing is tested. Three cases from the middle of the range agree with almost any implementation.'},
        {label:'boundaries', code:'low - 1   just outside\nlow       exactly on   ← <  vs <=\nlow + 1   just inside\nhigh - 1\nhigh      exactly on   ← >  vs >=\nhigh + 1', note:'Six values around two bounds catch nearly every off-by-one there is. This is the whole of boundary-value analysis.'},
        {label:'partitions', code:'below the range\ninside the range\nabove the range\nrange entirely negative\nrange of one value (low == high)\nvalue already equal to the answer', note:'One case from each class of input. Adding a second from the same class tells you nothing new.'},
        {label:'mutation score', code:'$ npx stryker run\n\nMutants:   4 killed, 0 survived\nMutation score: 100%\n\n(survived mutants are the bugs your\n suite would not have caught)', note:'Exactly what this console does. A surviving mutant is a change to the code that no test noticed.'}
      ]
    },
    hints:['One case from the middle of the range is not enough: try each broken version in your head and ask which input would tell it apart from the correct one.','Six cases do it: one inside, one below, one above, one on each bound, and one where the whole range is negative.'],
    takeaway:'Tests are not there to show the code works; they are there to fail when it stops working. A suite is worth what it rejects, and the cases that reject things live at the boundaries and the edges.', reference:refs.testing
  },
  {
    id:'trust-nothing', kind:'spec', chapter:'Programming', concept:'Input validation', name:'Trust nothing', location:'Intake console',
    objective:'share(part, whole) is written and its guards are not tested. Return a suite that accepts the correct version and rejects all four broken ones.',
    intro:'Four versions of the same percentage calculator. They agree on every sensible input. They disagree entirely on the inputs nobody thought about.',
    lesson:'Most of what a function gets wrong, it gets wrong at the edge of what it was told to expect. A count of zero, a negative where only positives were imagined, a division whose divisor can be zero — each one is a branch that exists in the contract and usually has no case against it. The habit that catches them is to read the contract for every sentence that begins with "when", and write one case for each. Note the shape of the guards here. Returning a marker for invalid input is one choice; refusing loudly is another, and this contract makes the choice explicit so a suite can hold it to that. An unguarded division by zero is not a wrong answer, it is an operation with no answer, which is why the guard has to come first rather than the result be corrected afterwards.',
    signature:'function cases()', fn:'cases',
    toolkit:['return', '[ ]', '{args: [...], expect: ...}', 'share(part, whole)'],
    subject:{
      name:'share', parameters:2,
      signature:'function share(part, whole)',
      contract:'share(part, whole)\n\n  returns -1   when either count is negative\n  returns 0    when whole is 0\n  returns the share of whole that part is,\n               as a percentage, rounded down\n               to a whole number, otherwise\n\n  Both are counts of things, so both are\n  whole numbers. The negative check is made\n  before the zero check.'
    },
    correct:'function share(part, whole) {\n  if (part < 0 || whole < 0) {\n    return -1;\n  }\n  if (whole === 0) {\n    return 0;\n  }\n  return Math.floor(part / whole * 100);\n}',
    mutants:[
      {name:'divides anyway', why:'Nothing in your suite passes a whole of 0, where the division has no answer at all.',
        code:'function share(part, whole) {\n  if (part < 0 || whole < 0) {\n    return -1;\n  }\n  return Math.floor(part / whole * 100);\n}'},
      {name:'trusts the counts', why:'Nothing in your suite passes a negative count.',
        code:'function share(part, whole) {\n  if (whole === 0) {\n    return 0;\n  }\n  return Math.floor(part / whole * 100);\n}'},
      {name:'checks only the whole', why:'Nothing in your suite passes a negative part alongside a valid whole.',
        code:'function share(part, whole) {\n  if (whole < 0) {\n    return -1;\n  }\n  if (whole === 0) {\n    return 0;\n  }\n  return Math.floor(part / whole * 100);\n}'},
      {name:'rounds to nearest', why:'Nothing in your suite uses a part and a whole whose share is not already a whole number.',
        code:'function share(part, whole) {\n  if (part < 0 || whole < 0) {\n    return -1;\n  }\n  if (whole === 0) {\n    return 0;\n  }\n  return Math.round(part / whole * 100);\n}'}
    ],
    minimumCases:5,
    starter:'function cases() {\n  return [\n    {args: [1, 4], expect: 25}\n  ];\n}\n',
    solution:'function cases() {\n  return [\n    {args: [1, 4], expect: 25},\n    {args: [3, 0], expect: 0},\n    {args: [-1, 4], expect: -1},\n    {args: [4, -1], expect: -1},\n    {args: [2, 3], expect: 66},\n    {args: [4, 4], expect: 100}\n  ];\n}',
    hints:['Read the contract one sentence at a time. Three of them begin with "when", and each one is a case nobody has written yet.','Two thirds is 66.66…, so rounding down and rounding to nearest disagree there. A negative part with a positive whole is the case that tells the last two versions apart.'],
    takeaway:'A contract’s edge cases are the ones its author thought about and its tests usually did not. Every sentence in a contract that starts with "when" is a case waiting to be written.', reference:refs.failFast
  },
  {
    id:'split-and-merge', kind:'algo', chapter:'Programming', concept:'Divide and conquer', name:'Split and merge', location:'Archive sorter',
    objective:'Write sorted(values) so it returns a sorted copy, fast enough for four hundred entries.',
    intro:'The archive sorter you built in chapter two swaps neighbours until the order is right. It is fine for five entries. Four hundred take four and a half million steps.',
    lesson:'Merging two sorted lists is easy and linear: look at the front of each, take the smaller, repeat. Merge sort is the observation that if you could sort each half, you could finish the job with that merge — and each half can be sorted the same way, down to lists of one, which are sorted already. The work per level is one pass over everything, and halving the size gives about log₂ n levels, so the total is n log n. For four hundred entries that is around thirty-five hundred comparisons against eighty thousand for the quadratic version. Two details decide correctness: stop at length one or zero, and when the two fronts are equal take from the left, which is what keeps equal entries in the order they arrived — a property sorts are expected to have and which is not free.',
    signature:'function sorted(values)', fn:'sorted',
    toolkit:['return', 'let', 'while', 'if / else', 'values.length', 'values.slice(a, b)', 'out.push(v)', 'sorted(half)'],
    requireRecursion:true,
    limits:{operations:5000000, cells:2000000},
    cases:[
      {args:[[3,1,2]], expect:[1,2,3]},
      {args:[[]], expect:[], note:'nothing to sort'},
      {args:[[4]], expect:[4], note:'one entry is already sorted'},
      {args:[[2,2,1,1]], expect:[1,1,2,2], note:'equal entries keep their order'},
      {args:[[9,-4,0,7,-4]], expect:[-4,-4,0,7,9]},
      {args:[ramp(400, 1).reverse()], expect:ramp(400, 1), note:'400 entries, at most 130,000 steps', maxOperations:130000}
    ],
    gateHint:'Swapping neighbours does about n² comparisons. Halving the problem and merging does about n log n.',
    starter:'function sorted(values) {\n  if (values.length <= 1) {\n    return values;\n  }\n  // Split in half, sort each half, then merge the two sorted halves.\n  return values;\n}\n',
    solution:'function sorted(values) {\n  if (values.length <= 1) {\n    return values;\n  }\n  let middle = Math.floor(values.length / 2);\n  let left = sorted(values.slice(0, middle));\n  let right = sorted(values.slice(middle, values.length));\n  let out = [];\n  let i = 0;\n  let j = 0;\n  while (i < left.length && j < right.length) {\n    if (right[j] < left[i]) {\n      out.push(right[j]);\n      j++;\n    } else {\n      out.push(left[i]);\n      i++;\n    }\n  }\n  while (i < left.length) {\n    out.push(left[i]);\n    i++;\n  }\n  while (j < right.length) {\n    out.push(right[j]);\n    j++;\n  }\n  return out;\n}',
    hints:['Write the merge first and test it in your head on [1, 4] and [2, 3]. Two indices, one into each half, and you always take the smaller front value.','values.slice(0, middle) and values.slice(middle, values.length) are the two halves. Sort each one with sorted() itself, then merge. Take from the left when the two fronts are equal.'],
    takeaway:'Divide and conquer turns a problem you cannot do into two you can, plus a cheap way to combine them. The combining step is where the algorithm actually lives.', reference:refs.mergesort
  },
  {
    id:'say-it-once', kind:'refactor', chapter:'Programming', concept:'Duplication', name:'Say it once', location:'Environment console',
    objective:'report(readings) works. The rule it applies is spelled out inside the loop; move it somewhere it can be named.',
    intro:'Three temperature bands, decided in the middle of a loop that is really about building a list. The next mission that needs the same bands will copy these lines, and then there will be two copies to keep in step.',
    lesson:'Duplication is not only the same characters twice; it is the same decision written where it cannot be reused. A function that both walks a list and classifies an entry is doing two things, and the second one is the part someone else will want. Pulling it out gives it a name, a place to be tested on its own, and one site to change when the thresholds move. The console checks two things here: that the classification is called rather than inlined, and that what remains is short. Both are proxies for the real property, which is that the function now says what it does rather than how the bands happen to be defined this week.',
    signature:'function report(readings)', fn:'report',
    toolkit:['return', 'let', 'for', 'band(reading)', 'out.push(text)', 'out.join(", ")', 'print()'],
    shape:{maxStatements:14, requireCalls:['band']},
    cases:[
      {args:[[10, 70, 95]], expect:'cool, warm, hot'},
      {args:[[0]], expect:'cool'},
      {args:[[60, 60]], expect:'warm, warm', note:'60 is the bottom of warm'},
      {args:[[85, 86]], expect:'warm, hot', note:'85 is the top of warm'},
      {args:[[]], expect:'', note:'no readings, no report'}
    ],
    starter:'function report(readings) {\n  let out = [];\n  for (let i = 0; i < readings.length; i++) {\n    let reading = readings[i];\n    if (reading < 60) {\n      out.push("cool");\n    } else {\n      if (reading <= 85) {\n        out.push("warm");\n      } else {\n        out.push("hot");\n      }\n    }\n  }\n  return out.join(", ");\n}\n',
    solution:'function band(reading) {\n  if (reading < 60) {\n    return "cool";\n  }\n  if (reading <= 85) {\n    return "warm";\n  }\n  return "hot";\n}\n\nfunction report(readings) {\n  let out = [];\n  for (let i = 0; i < readings.length; i++) {\n    out.push(band(readings[i]));\n  }\n  return out.join(", ");\n}',
    artifact:{
      title:'The same change, as a reviewer sees it',
      note:'No behaviour changes here. Everything that changes is about where a decision lives and who else can reach it.',
      panes:[
        {label:'the diff', code:'+function band(reading) {\n+  if (reading < 60) { return "cool"; }\n+  if (reading <= 85) { return "warm"; }\n+  return "hot";\n+}\n\n function report(readings) {\n-    if (reading < 60) { out.push("cool"); }\n-    else { … }\n+    out.push(band(readings[i]));', note:'Five lines out of a loop and into a name. The loop is now about building a list, which is what its name said all along.'},
        {label:'what it buys', code:'band() can be tested on its own\nband() can be called from elsewhere\nthe thresholds live in one place\nreport() fits on a screen\nthe diff for a threshold change is 1 line', note:'The last one matters most. When the bands move, the change is obvious, local, and reviewable.'},
        {label:'when not to', code:'extracted once, used once, never\n  changed → maybe leave it\nnamed helper1, helper2, doStuff\n  → the name is the point; without\n  a good one the extraction is noise', note:'Extraction is not automatically an improvement. If you cannot name the thing you pulled out, you have not found a thing yet.'},
        {label:'the smell', code:'a function that needs a comment\n  in the middle explaining the\n  next few lines\n\nthat comment is usually the name\nof the function you have not\nwritten yet', note:'A reliable signal, and cheap to act on: turn the comment into a function name and move the lines under it.'}
      ]
    },
    hints:['The console wants a function called band(). Everything the loop currently decides about a single reading belongs inside it.','band(reading) returns "cool", "warm" or "hot". Then report() is a loop that pushes band(readings[i]) and joins the result.'],
    takeaway:'Pulling a decision out of a loop and giving it a name is the cheapest refactor there is, and the one that pays every time the decision changes. If you cannot name it, you have found a boundary that is not real yet.', reference:refs.duplication
  },

  // ------------------------------------------- chapter 2: computer science


  // ----------------------------------------------------- chapter 3: networking
  {
    id:'speak-in-bits', kind:'bits', chapter:'Computer science', concept:'Binary numbers', name:'Speak in bits', location:'Memory bank',
    objective:'Encode the unsigned decimal number 13 using four bits.',
    intro:'The memory bank represents information with bits: 0 or 1. Flip them to encode the access code.',
    lesson:'For these four unsigned binary digits, the place values are 8, 4, 2, and 1. A 1 includes its place value; a 0 contributes zero. The pattern 1101 means 8 + 4 + 0 + 1 = 13.',
    bits:{width:4}, target:13,
    hints:['13 is 8 + 4 + 1. Leave the 2-value bit off.','From left to right: 1, 1, 0, 1.'], solution:[1,1,0,1],
    takeaway:'Four bits have 16 possible patterns. As an unsigned integer, they represent 0 through 15. Other encodings can give the same bits a different meaning.', reference:refs.basics
  },
  {
    id:'one-byte-code', kind:'bits', chapter:'Computer science', concept:'Bytes & hexadecimal', name:'One byte, two digits', location:'Firmware vault',
    objective:'Encode 172 in eight bits and read off its hexadecimal form.',
    intro:'Firmware is addressed in bytes. Eight bits hold 0 through 255, and hexadecimal writes each group of four bits as a single digit.',
    lesson:'A byte is eight bits, with place values 128, 64, 32, 16, 8, 4, 2, 1. Hexadecimal is base 16, so one hex digit covers exactly four bits: 1010 is A and 1100 is C. That is why byte values are written as two hex digits, and why 0xAC is easier to read back than 10101100.',
    bits:{width:8}, target:172,
    hints:['172 = 128 + 32 + 8 + 4. Turn on exactly those four place values.','Left to right: 1, 0, 1, 0, 1, 1, 0, 0. Read it as two groups of four: 1010 = A, 1100 = C.'],
    solution:[1,0,1,0,1,1,0,0],
    takeaway:'Eight bits give 256 patterns. Hexadecimal is not a different number, only a shorter way to write the same bits.', reference:refs.basics
  },
  {
    id:'negative-space', kind:'bits', chapter:'Computer science', concept:'Signed integers', name:'Below zero', location:'Attitude computer',
    objective:'Encode −40 as an eight-bit two’s-complement integer.',
    intro:'Thruster corrections go both ways, so the attitude computer needs negative numbers. The same eight switches now use a different encoding.',
    lesson:'In two’s complement the leftmost bit is worth minus its place value: −128 instead of +128. So 11011000 is −128 + 64 + 16 + 8 = −40. The shortcut is to write the positive value, flip every bit, then add one. This encoding is what nearly every processor uses, because addition and subtraction work on it unchanged.',
    bits:{width:8, encoding:'twos'}, target:-40,
    hints:['40 is 00101000. Flip every bit to get 11010111, then add one.','The answer is 11011000: −128 + 64 + 16 + 8 = −40.'],
    solution:[1,1,0,1,1,0,0,0],
    takeaway:'The same eight bits mean 216 unsigned and −40 signed. Bits carry no meaning on their own; the encoding supplies it.', reference:refs.twos
  },
  {
    id:'count-the-cents', kind:'money', chapter:'Computer science', concept:'Floating point', name:'Count the cents', location:'Commissary till',
    objective:'Add up a day of takings so the total is exact, not nearly right.',
    intro:'The commissary till has been out by a few cents every evening for a month. Nothing is broken, nobody is stealing, and the arithmetic is correct.',
    lesson:'A binary fraction can only represent sums of halves, quarters, eighths and so on. A tenth is not one of them, so 0.1 is stored as 0.1000000000000000055511151231257827…, and every amount in cents carries a similar error. Add a thousand of them and the errors accumulate into something a human can see. Reducing the precision makes it worse and adding the small amounts first makes it smaller, but neither makes it go away, because the problem is the representation and not the order. The fix is to leave the fractions behind: count in whole units, so every value is an integer and every sum is exact. Which unit, though, is a second decision and the one that is usually got wrong. An integer counter is exact about the unit you chose and says nothing about the amounts that do not fit in it — count this till in cents and every metered charge below a cent is rounded on the way in, so the total comes out wrong by a clean, confident, entirely wrong number. Read the prices before choosing the unit: it has to be small enough for the smallest thing you charge for, and no smaller.',
    amounts:tillAmounts,
    dials:[
      {id:'counts', label:'What a value is held in', help:'A binary fraction, or a whole number of some unit', value:'float64', options:[
        {value:'float64', label:'Double precision'},
        {value:'float32', label:'Single precision'},
        {value:'whole', label:'Whole units, as integers'}
      ]},
      {id:'unit', label:'How many units to the credit', help:'Only meaningful once the values are integers', value:10, options:[
        {value:10, label:'10 · tenths'},
        {value:100, label:'100 · cents'},
        {value:1000, label:'1,000 · mills'},
        {value:10000, label:'10,000'}
      ]}
    ],
    artifact:{
      title:'What a number actually holds',
      note:'Every line below is real output. The first one is the reason the till is wrong, and it is also the reason nobody believes it at first.',
      panes:[
        {label:'the classic', code:'> 0.1 + 0.2\n0.30000000000000004\n> 0.1 + 0.2 === 0.3\nfalse\n> 0.1 + 0.2 - 0.3\n5.551115123125783e-17', note:'Not a bug in the language. Every language with IEEE 754 doubles prints this, including the one you would rewrite it in.'},
        {label:'0.1 in full', code:'0.1 is stored as\n0.1000000000000000055511151231257827\n021181583404541015625\n\nsign 0  exponent 01111111011\nfraction 1001100110011001100110011…', note:'The fraction is 1100 repeating forever, cut off at 52 bits. A tenth in binary is what a third is in decimal.'},
        {label:'what survives', code:'exactly representable: 0.5 0.25 0.125\n  0.75 3.5 1024 -2.5\nnot representable:     0.1 0.2 0.3\n  0.7 1.1 19.99', note:'Halves, quarters and eighths are exact. Tenths are not, which is unfortunate, because money is counted in tenths.'},
        {label:'the fix', code:'mills = 19990         // an integer\ntotal += mills        // exact\nprint(total / 1000)   // once, at the end\n\n173405 mills → "173.41"', note:'Integers up to 2^53 are exact in a double, so counting minor units keeps you inside the range where nothing is rounded. The unit has to be the smallest one you charge in.'},
        {label:'order is not the fix', code:'as they come    173.40499999999992\nsmallest first  173.40500000000011\nexact           173.405\n\nboth wrong, one less obviously', note:'Adding the small amounts first stops them being rounded away against a large total, so the error shrinks. It never reaches zero, because the amounts were already wrong when they were stored.'}
      ]
    },
    solution:{dials:{counts:'whole', unit:1000}},
    hints:['Try single precision first and watch the error get larger. That tells you the problem is how many bits the fraction has, so no unit will help until the values stop being fractions.','Integers are exact about the unit you picked. Look at what the commissary actually charges: the metered water is priced below a cent, so a counter of cents rounds every one of those charges before it is even added.'],
    takeaway:'Money, and anything else counted in exact units, does not belong in a binary fraction. Store the integer and format it for display — the decimal point is a presentation decision, not a storage one.', reference:refs.floats
  },
  {
    id:'bytes-not-letters', kind:'text', chapter:'Computer science', concept:'Character encoding', name:'Bytes, not letters', location:'Crew registry',
    objective:'Size the crew registry’s name field so every name survives whole.',
    intro:'The registry truncates names to fit a fixed field. Half the crew are showing up with a black diamond at the end of their name, and one of them is showing up as two.',
    lesson:'A string has at least three different lengths and they disagree. UTF-8 stores a character in one to four bytes — one below U+0080, two for most European letters with accents, three for most of the CJK range, four for emoji — so a name’s byte length depends on what is in it. String.length in JavaScript counts neither bytes nor characters: it counts UTF-16 code units, which is why anything above U+FFFF counts as two. A field measured in bytes and cut in bytes will eventually stop halfway through a character and leave a fragment that is not valid UTF-8, which is what the replacement character is telling you. Cutting by code points cannot split a character, but then the field has to be sized for the worst case rather than the average, because the same twelve characters can be twelve bytes or forty-eight.',
    names:['Ada Okonkwo', 'José Ramírez', 'Zoë Müller-Grün', 'アレクサンドラ ヤマモト', 'Ng Wai-Yin'],
    dials:[
      {id:'limit', label:'Field size', help:'How much the registry stores per name', value:12, options:[
        {value:12, label:'12 units'},
        {value:16, label:'16 units'},
        {value:24, label:'24 units'},
        {value:32, label:'32 units'}
      ]},
      {id:'unit', label:'What the field counts', help:'Bytes on disk, or characters', value:'bytes', options:[
        {value:'bytes', label:'Bytes'},
        {value:'codePoints', label:'Code points'}
      ]}
    ],
    artifact:{
      title:'The same name, four ways to measure it',
      note:'Everything here is one name. The disagreement between these numbers is the whole bug.',
      panes:[
        {label:'hexdump', code:'$ printf \'Zoë Müller\' | hexdump -C\n5a 6f c3 ab 20 4d c3 bc\n6c 6c 65 72\n\n10 characters, 12 bytes', note:'ë and ü are two bytes each. A field of ten bytes stops in the middle of one of them.'},
        {label:'three lengths', code:'"Zoë Müller"  bytes 12  chars 10  length 10\n"東京 たかし"  bytes 16  chars  6  length  6\n"👨‍👩‍👧"        bytes 18  chars  5  length  8', note:'The family emoji is one thing on screen, five code points, eight UTF-16 units and eighteen bytes. Every number is correct and none of them is "how many characters".'},
        {label:'a bad cut', code:'bytes:  5a 6f c3 ab 20 4d c3 | bc 6c…\ncut at 7 bytes ──────────┘\nresult: "Zoë M\\xc3"  → "Zoë M�"', note:'The leading byte of ü promised a continuation byte that never arrived, so the decoder substitutes U+FFFD. That diamond is a report, not a glyph.'},
        {label:'why UTF-8 wins', code:'ASCII text is byte-identical\nno byte of a multi-byte character\n  is ever mistaken for ASCII\nthe leading byte says how many\n  bytes follow — so a bad cut is\n  detectable rather than silent', note:'The encoding is self-synchronising by design. It cannot stop a byte-wise truncation, but it can make the damage visible instead of producing a different valid character.'}
      ]
    },
    solution:{dials:{limit:16, unit:'codePoints'}},
    hints:['Look at the byte column. The longest name is twelve characters and thirty-four bytes, so no field counted in bytes is wide enough for it — and widening it further punishes everyone whose name is ASCII.','Counting code points cannot split a character, and the field only has to hold the longest name: fifteen characters. The registry pays for every unit it reserves, so take the smallest size that fits.'],
    takeaway:'“Length” is not a property of text; it is a question about a representation. Decide which one a limit means before you write it down, because the answer changes what your users are allowed to be called.', reference:refs.unicode
  },
  {
    id:'restore-the-order', kind:'sort', chapter:'Computer science', concept:'Arrays & sorting', name:'Restore the order', location:'Archive index',
    objective:'Sort the entries from smallest to largest with adjacent swaps.',
    intro:'The archive index is scrambled. Reorder its entries by swapping neighbouring values.',
    lesson:'An array is an ordered sequence of entries; JavaScript array indices start at 0. This puzzle permits any adjacent swap. Bubble sort is a particular algorithm: scan adjacent pairs in order, swap out-of-order pairs, and repeat passes until sorted.',
    values:[7,2,9,4,1],
    hints:['Try moving the largest value right by swapping it past smaller neighbours.','The final order is 1, 2, 4, 7, 9. Move 9 to the end, then work on the earlier entries.'], solution:[1,2,4,7,9],
    takeaway:'You sorted an array with adjacent swaps. Following a systematic left-to-right pass repeatedly gives bubble sort, which has quadratic worst-case time. Arbitrary swaps need not follow that algorithm.', reference:refs.sort
  },
  {
    id:'how-it-scales', kind:'quiz', chapter:'Computer science', concept:'Complexity', name:'How it scales', location:'Analysis deck',
    objective:'Predict how four algorithms behave when their input grows.',
    intro:'Complexity is not about how fast one run is. It is about what happens to the running time when the input gets larger.',
    lesson:'Big-O describes growth. A linear scan, O(n), does ten times the work for ten times the data. Bubble sort, O(n²), does a hundred times the work for ten times the data. Binary search, O(log n), adds one comparison when the data doubles. The constants matter on small inputs, and the growth rate decides everything on large ones.',
    instructions:'Each question describes a measured run. Predict the larger one.',
    questions:[
      {prompt:'A linear scan of 1,000 entries takes 1 ms. About how long for 1,000,000 entries?', options:[{label:'about 1 ms'},{label:'about 1 second'},{label:'about 20 ms'},{label:'about 1,000 seconds'}], answer:1, why:'A thousand times the data does a thousand times the work: 1 ms becomes about 1 second.'},
      {prompt:'Bubble sort takes 1 second on 1,000 entries. About how long for 10,000?', options:[{label:'about 10 seconds'},{label:'about 100 seconds'},{label:'about 1 second'},{label:'about 1,000 seconds'}], answer:1, why:'Quadratic growth squares the factor: ten times the data is about a hundred times the work.'},
      {prompt:'Binary search needs about 10 comparisons for 1,000 sorted entries. About how many for 1,000,000?', options:[{label:'about 20'},{label:'about 1,000'},{label:'about 10,000'},{label:'about 100'}], answer:0, why:'Every doubling adds one comparison, so a thousandfold increase adds about ten.'},
      {prompt:'Which one is still usable when the input is a million times larger?', options:[{label:'the quadratic sort'},{label:'the linear scan'},{label:'the logarithmic search'},{label:'none of them'}], answer:2, why:'Logarithmic growth is the only one here that barely notices the size change.'}
    ],
    quizSuccess:'Growth rate, not raw speed, decides what survives a larger input.',
    solution:[1,1,0,2],
    hints:['Work out the factor the input grew by, then apply the growth rate: linear multiplies by it, quadratic by its square, logarithmic adds a constant.','Answers in order: 1 second, 100 seconds, 20 comparisons, the logarithmic search.'],
    takeaway:'Choosing the algorithm changes the shape of the curve. No amount of faster hardware turns a quadratic algorithm into a linear one.', reference:refs.growth
  },
  {
    id:'hash-it-out', kind:'hash', chapter:'Computer science', concept:'Hash tables', name:'Somewhere to put it', location:'Index memory',
    objective:'Store seven station IDs in the smallest table where no lookup walks more than two slots.',
    intro:'Seven station IDs have to be found fast. A hash function turns a key into a slot number, and the memory bank charges for every slot you reserve — so the question is not how to avoid collisions, it is how few slots you can get away with while lookups stay short.',
    lesson:'A hash table computes a slot from the key: slot = key mod size. A lookup is one step when the slot holds what you want, and longer when it does not, so a table is judged by its worst lookup rather than by whether anything collided at all. The size decides most of it: six of these IDs are multiples of 10, so a size of 10 sends all six to slot 0 and a size of 8 or 12 shares factors with them and stacks some together. What happens after a collision is the second decision. Separate chaining hangs a list off the slot, and a lookup walks that list — two keys in a slot means at worst two steps. Open addressing keeps everything inside the table and walks forward to the next free slot, which is kinder to the cache and has a failure mode chaining does not: the run belonging to one key runs into the run belonging to another, they merge, and the walks get longer than the number of colliding keys can explain. That is primary clustering, and it is why open addressing needs a load factor well under 1 while chaining degrades gently.',
    keys:[10,20,30,40,50,60,84], maxChain:2,
    dials:[
      {id:'size', label:'Table size (slots)', help:'Every slot is memory the bank reserves', value:8, options:[
        {value:8, label:'8 slots'}, {value:9, label:'9 slots'}, {value:10, label:'10 slots'},
        {value:11, label:'11 slots (prime)'}, {value:12, label:'12 slots'}, {value:16, label:'16 slots'}
      ]},
      {id:'collisions', label:'What happens on a collision', help:'Where the second key in a slot goes', value:'chain', options:[
        {value:'chain', label:'Separate chaining'},
        {value:'probe', label:'Open addressing'}
      ]}
    ],
    solution:{dials:{size:9, collisions:'chain'}},
    hints:['Work out (key mod size) for each ID at each size. Six of the seven are multiples of 10, so any size that shares a factor with 10 piles them up.','Two sizes keep the worst lookup to two, and only with one of the two collision strategies. At a load factor near 0.8 the runs of open addressing start merging into each other.'],
    takeaway:'A hash table is judged by its worst lookup, not by whether it collided. The size decides how often keys land together, and the collision strategy decides what that costs — open addressing is faster until the table fills, and then the runs merge and it is not.', reference:refs.hash
  },
  {
    id:'the-tree-that-became-a-list', kind:'tree', chapter:'Computer science', concept:'Trees & balance', name:'The tree that became a list', location:'Catalogue index',
    objective:'Insert seven catalogue keys so no lookup costs more than three comparisons.',
    intro:'The catalogue index is a binary search tree, and it was built by loading the keys in the order they were catalogued — which was sorted. Every lookup now walks the whole thing.',
    lesson:'A binary search tree promises logarithmic lookup, and that promise is about its height, not its size. But a tree has no shape of its own: each key goes below the first one it compares against, so the insertion order decides the shape entirely. Insert in sorted order and every key goes down the same side — a linked list with two pointers per node and none of the benefit. Insert the median first, then the medians of each half, and each insert splits the remaining range, so seven keys fit in three levels and a thousand fit in ten. This is why real implementations do not trust the caller: red-black and AVL trees rebalance on every insert, paying a little each time to keep the guarantee, and a B-tree does the same thing with wider nodes so that each level is one disk page.',
    keys:[1, 2, 3, 4, 5, 6, 7],
    items:[
      {id:'1', name:'Key 1', note:'first catalogued'},
      {id:'2', name:'Key 2', note:''},
      {id:'3', name:'Key 3', note:''},
      {id:'4', name:'Key 4', note:'the median'},
      {id:'5', name:'Key 5', note:''},
      {id:'6', name:'Key 6', note:''},
      {id:'7', name:'Key 7', note:'last catalogued'}
    ],
    target:{height:3},
    artifact:{
      title:'The same seven keys, twice',
      note:'Identical contents, identical comparisons per level, identical code. Only the order they arrived in differs.',
      panes:[
        {label:'sorted input', code:'insert 1,2,3,4,5,6,7\n\n1\\\n  2\\\n    3\\\n      4\\\n        5\\\n          6\\\n            7', note:'Every key is larger than everything before it, so every insert goes right. Seven levels, and a lookup for 7 costs seven comparisons.'},
        {label:'median first', code:'insert 4,2,6,1,3,5,7\n\n        4\n      /   \\\n     2     6\n    / \\   / \\\n   1   3 5   7', note:'Three levels. The same lookup costs three comparisons, and a thousand keys would cost ten.'},
        {label:'why it matters', code:'        depth   lookups\n   n    sorted  balanced\n   7       7        3\n 1000    1000       10\n 10^6     10^6      20', note:'The gap is the difference between a data structure and a list. At a million keys it is fifty thousand times.'},
        {label:'what real trees do', code:'red-black: recolour and rotate on\n  insert; height <= 2·log2(n+1)\nAVL:       stricter, taller cost to\n  insert, shorter trees\nB-tree:    wider nodes so one level\n  is one page of disk', note:'All three pay something on every insert to avoid ever being handed sorted input. Nobody relies on the caller shuffling first.'}
      ]
    },
    order:['4', '2', '6', '1', '3', '5', '7'],
    solution:{order:['4', '2', '6', '1', '3', '5', '7']},
    hints:['Sorted input is the worst case, and the catalogue handed you exactly that. The first key you insert becomes the root, so choose it deliberately.','Put the median first, then the median of each remaining half: 4, then 2 and 6, then 1, 3, 5 and 7.'],
    takeaway:'Logarithmic lookup is a property of a tree’s shape, and the shape is a property of how it was built. A structure that guarantees its own balance is worth the cost of rebalancing, because the alternative is trusting your input to be unsorted.', reference:refs.trees
  },
  {
    id:'fewest-hops', kind:'network', chapter:'Computer science', concept:'Graphs & paths', name:'A shorter route', location:'Navigation core',
    objective:'Enable a route from uplink to archive with at most two hops.',
    intro:'The station is a graph: nodes connected by edges. Each traversed edge is one hop. Enable a short route and test it.',
    lesson:'In an unweighted graph, a shortest path uses the fewest edges. Breadth-first search finds one by exploring nodes in increasing hop distance. This map treats every link as usable in both directions.',
    nodes:[['uplink',12,50],['relay-a',39,22],['relay-b',39,77],['relay-c',65,77],['archive',87,50]],
    edges:[['uplink','relay-a',1],['relay-a','archive',1],['uplink','relay-b',1],['relay-b','relay-c',1],['relay-c','archive',1]], source:'uplink', target:'archive', maxEdges:2,
    hints:['Both routes connect the endpoints. Count the edges along each one.','The upper path is uplink → relay A → archive: two hops.'], solution:[0,1],
    takeaway:'You minimised hops on an unweighted graph. Only traversed edges contribute to path length; unused enabled branches do not.', reference:refs.graph
  },
  {
    id:'latency-matters', kind:'network', chapter:'Computer science', concept:'Weighted graphs', name:'Find the fastest route', location:'Long-range relay',
    objective:'Enable a route whose displayed delays total at most 12 ms.',
    intro:'Every link has a delay. A route with fewer hops can still be slower. Compare the sum of weights along each path.',
    lesson:'A weighted graph assigns a cost to each edge. Here the weights model fixed link delays. Dijkstra’s algorithm finds shortest paths with non-negative weights. Real packet delay also depends on transmission, processing, and queues; this puzzle omits those effects.',
    nodes:[['uplink',12,50],['relay-a',49,20],['relay-b',35,78],['relay-c',64,78],['archive',87,50]],
    edges:[['uplink','relay-a',9],['relay-a','archive',9],['uplink','relay-b',3],['relay-b','relay-c',4],['relay-c','archive',3]], source:'uplink', target:'archive', budget:12,
    hints:['The two-hop route takes 18 ms in this model. Add the delays on the three-hop route.','The lower route costs 3 + 4 + 3 = 10 ms.'], solution:[2,3,4],
    takeaway:'The minimum-weight path costs 10 ms here, despite using more hops. Costs are summed along the chosen route, not across every enabled cable.', reference:refs.graph
  },
  {
    id:'the-loop-that-misses', kind:'cache', chapter:'Computer science', concept:'Locality', name:'The loop that misses', location:'Sensor array',
    objective:'Transpose the sensor grid with the same arithmetic and a quarter of the memory traffic.',
    intro:'Two loops, identical arithmetic, identical output. One of them moves four and a half megabytes and the other moves one. Nothing about the code says which.',
    lesson:'Memory does not arrive one value at a time. A miss fetches a whole cache line — sixty-four bytes, eight values here — on the assumption that the next thing you ask for will be next to it. A loop that walks along a row makes that assumption true and pays one miss for every eight values. A loop that walks down a column makes it false and pays one miss for each value, because it uses one value out of every line it fetches and the line is long gone before it comes back. A transpose is the awkward case: it reads along rows and writes down columns, so one of the two sides is always against the grain. Tiling fixes it by working on a square small enough that both sides fit in the cache at once — which is also why a bigger tile is not a better tile. Past the point where the working set fits, the lines start evicting each other and the traffic goes straight back up.',
    grid:{rows:256, columns:256, mode:'transpose', lineBytes:64, elementBytes:8, cacheLines:16},
    plans:[
      {id:'row', label:'Row by row', order:'row'},
      {id:'column', label:'Column by column', order:'column'},
      {id:'tile2', label:'2×2 tiles', tile:2},
      {id:'tile3', label:'3×3 tiles', tile:3},
      {id:'tile4', label:'4×4 tiles', tile:4},
      {id:'tile5', label:'5×5 tiles', tile:5},
      {id:'tile6', label:'6×6 tiles', tile:6},
      {id:'tile7', label:'7×7 tiles', tile:7},
      {id:'tile8', label:'8×8 tiles', tile:8},
      {id:'tile9', label:'9×9 tiles', tile:9},
      {id:'tile10', label:'10×10 tiles', tile:10},
      {id:'tile12', label:'12×12 tiles', tile:12},
      {id:'tile16', label:'16×16 tiles', tile:16},
      {id:'tile32', label:'32×32 tiles', tile:32},
      {id:'tile64', label:'64×64 tiles', tile:64}
    ],
    target:{misses:20000},
    dials:[{id:'plan', label:'How the loop walks the grid', help:'The arithmetic is the same in every one of these', value:'row', options:[
      {value:'row', label:'Row by row'},
      {value:'column', label:'Column by column'},
      {value:'tile2', label:'2×2'},
      {value:'tile3', label:'3×3'},
      {value:'tile4', label:'4×4'},
      {value:'tile5', label:'5×5'},
      {value:'tile6', label:'6×6'},
      {value:'tile7', label:'7×7'},
      {value:'tile8', label:'8×8'},
      {value:'tile9', label:'9×9'},
      {value:'tile10', label:'10×10'},
      {value:'tile12', label:'12×12'},
      {value:'tile16', label:'16×16'},
      {value:'tile32', label:'32×32'},
      {value:'tile64', label:'64×64'}
    ]}],
    artifact:{
      title:'The same function, measured',
      note:'Two builds of one program, no algorithmic change, no compiler flags. Only the loop order differs.',
      panes:[
        {label:'perf stat', code:'naive transpose\n  1,743,452 cache-misses\n      0.412 s elapsed\n\ntiled transpose\n    398,110 cache-misses\n      0.094 s elapsed', note:'Four times fewer misses, four times faster. The instruction counts are within a percent of each other.'},
        {label:'the two loops', code:'for (r…) for (c…)\n    b[c][r] = a[r][c];\n\nfor (rb…) for (cb…)\n  for (r = rb; r < rb+T; r++)\n    for (c = cb; c < cb+T; c++)\n      b[c][r] = a[r][c];', note:'The second one is the first one with the iteration space cut into squares. Every element is still visited exactly once, in a different order.'},
        {label:'the numbers', code:'line            64 B  = 8 doubles\nL1 cache      1,024 B = 16 lines\nrow of a        256 doubles = 32 lines\n8×8 tile   8 lines of a + 8 of b = 16', note:'A whole row does not fit. An 8×8 tile fits exactly, which is why it is the one that works and 16×16 is not.'},
        {label:'the latency wall', code:'L1 hit        ~1 ns\nL2 hit        ~4 ns\nmain memory ~100 ns\n\n100× is not a constant factor you\ncan ignore in an inner loop', note:'This is why locality is an algorithmic concern and not a micro-optimisation: the difference between hitting and missing is two orders of magnitude.'}
      ]
    },
    solution:{dials:{plan:'tile8'}},
    hints:['Row order and column order cost the same here, which is the clue: a transpose is against the grain on one side whichever way round you write it.','A tile helps only while both of its sides fit in the cache at once. Work out how many lines an N×N tile needs from each grid, and compare that with the sixteen lines available.'],
    takeaway:'Two programs with the same instruction count can differ by four times in running time, and nothing in the source says so. Where your data is, and in what order you touch it, is part of the algorithm.', reference:refs.locality
  },
  {
    id:'find-the-flipped-bit', kind:'ecc', chapter:'Computer science', concept:'Error correction', name:'Find the flipped bit', location:'Memory bank',
    objective:'A word came back from memory with one bit wrong. Work out which, and flip it back.',
    intro:'Cosmic rays flip bits, and a station gets more of them than a basement does. This memory does not merely notice; it can tell you exactly which bit went.',
    lesson:'A parity bit over a whole word tells you something is wrong and nothing about what. Hamming’s idea was to use several parity bits, each covering a different, overlapping set of positions, chosen so that the pattern of failures is the answer. Number the bits from one. Put the parity bits at the powers of two — 1, 2, 4 — and let each one cover the positions whose number has that bit set: p1 covers 1, 3, 5, 7; p2 covers 2, 3, 6, 7; p4 covers 4, 5, 6, 7. Now flip any single bit and read the three checks as a binary number, least significant first. That number is the position of the bit that changed. Three extra bits over four data bits buy you not detection but correction, and the same construction scaled up is what ECC memory runs.',
    bits:{width:7, labels:['position 1 · p1', 'position 2 · p2', 'position 3 · d1', 'position 4 · p4', 'position 5 · d2', 'position 6 · d3', 'position 7 · d4']},
    received:[0, 1, 1, 0, 0, 0, 1],
    artifact:{
      title:'How three checks name one position',
      note:'The layout is not a convention you have to memorise. It is chosen so that the failures spell out the answer.',
      panes:[
        {label:'the layout', code:'position  1  2  3  4  5  6  7\nrole     p1 p2 d1 p4 d2 d3 d4\n\np1 covers 1 3 5 7  (bit 1 set)\np2 covers 2 3 6 7  (bit 2 set)\np4 covers 4 5 6 7  (bit 4 set)', note:'Position 5 is 101 in binary, so it is covered by p1 and p4 and not by p2. Every position has its own combination.'},
        {label:'reading the syndrome', code:'p1 ok    p2 wrong  p4 wrong\n 0        1         1\n\nsyndrome = c4 c2 c1 = 110 = 6\n→ position 6 is the flipped bit', note:'The checks that fail are exactly the ones covering the bad position, so their pattern is its number.'},
        {label:'what it cannot do', code:'one bit flipped  → located, corrected\ntwo bits flipped → syndrome points at\n  a third, innocent position\n\nadd an overall parity bit and two\nerrors become detectable (SECDED)', note:'Single error correcting, double error detecting. Beyond that you need a longer code, which is why storage uses Reed–Solomon rather than Hamming.'},
        {label:'the real thing', code:'$ edac-util -v\nmc0: csrow0: ce_count 1\n  corrected error: bank 2, row 41123\n\nECC DIMM: 72 bits stored per 64', note:'Eight check bits per sixty-four of data, correcting one error in every word, silently, millions of times a day in every server rack.'}
      ]
    },
    solution:[0, 1, 1, 0, 0, 1, 1],
    hints:['Work out each parity check on the word as it arrived: p1 over positions 1,3,5,7; p2 over 2,3,6,7; p4 over 4,5,6,7. Each should be even.','Write the failing checks as a binary number with p4 as the most significant bit. That number is the position to flip — and flip only that one.'],
    takeaway:'Redundancy chosen carelessly tells you that something is wrong. Redundancy chosen well tells you what. The difference is a few bits and the arrangement.', reference:refs.hamming
  },
  {
    id:'both-consoles-at-once', kind:'race', chapter:'Computer science', concept:'Concurrency', name:'Both consoles at once', location:'Repair log',
    objective:'Order one console’s routine so the repair count is right whatever order the two consoles run in, without holding the lock over the slow part.',
    intro:'Two engineers close out repairs on two consoles, into one shared total. Forty-two repairs were logged this shift and the board says forty-one. Nothing crashed, nothing was rejected, and both entries are in the log.',
    lesson:'Adding one to a shared number is not one operation. It is read the number, add one to your own copy, write your copy back — and between any two of those, the other console can run. If both read before either writes, both write the same value and one repair vanishes. That is a lost update, and the thing that makes it hard is that almost every run is fine: the two have to interleave in one of the bad ways, which on a quiet shift may take weeks to happen and will not happen at all while you are watching. This is why the question is never "did it work" but "does every interleaving work". A lock makes a stretch of the routine indivisible, so the answer is to put the read, the add and the write inside one, and everything else outside it: whatever the lock covers is time the other console spends waiting, and a lock held over slow work turns two consoles back into one. For a counter and nothing else, a processor’s atomic add does the same job in a single instruction with no waiting at all.',
    start:40,
    items:[
      {id:'read', step:'read', name:'Read the total', note:'reads the shared number'},
      {id:'add', step:'add', name:'Add one to your copy', note:'works on your own copy'},
      {id:'write', step:'write', name:'Write your copy back', note:'writes the shared number'},
      {id:'acquire', step:'acquire', name:'Take the lock', note:'the other console waits here'},
      {id:'release', step:'release', name:'Give the lock back', note:'the other console may pass'},
      {id:'format', step:'format', name:'Write the log line', note:'slow · needs the new total · touches nothing shared'}
    ],
    target:{heldFor:3},
    order:['read','add','write','acquire','release','format'],
    artifact:{
      title:'Why it passed the tests',
      note:'The same routine, from four angles. The last one is the reason this class of bug reaches production and stays there.',
      panes:[
        {label:'one line of code', code:'total = total + 1;\n\n  mov  eax, [total]   ; read\n  add  eax, 1         ; add\n  mov  [total], eax   ; write', note:'One statement, three instructions, and the other console can run between any two of them. The source gives no hint that there is a gap.'},
        {label:'the lost update', code:'A: read  40\nB: read  40\nA: add   -> 41\nB: add   -> 41\nA: write 41\nB: write 41\n\ntwo repairs, one counted', note:'Both read before either wrote, so both wrote the same number. Nothing errored, and the log holds two entries against a total of one.'},
        {label:'what a lock costs', code:'lock held over the log line:\n  11 units, both consoles serialised\n\nlock held over the counter:\n   3 units, the log line overlaps\n\nsame correctness, 3.6x the throughput', note:'A lock is correct at any size and only fast at the right one. Everything inside it is time the other console is not working.'},
        {label:'why tests miss it', code:'$ for i in $(seq 1 10000); do ./count; done\n10000 runs, 10000 correct\n\n$ ./count --stress --threads 8\n  147 runs, 3 wrong\n\n(and the 3 do not reproduce)', note:'A race is not a case you can write; it is a schedule you have to be unlucky enough to hit. Passing is evidence of nothing, which is what thread sanitizers and model checkers exist for.'}
      ]
    },
    solution:{order:['acquire','read','add','write','release','format']},
    hints:['Start by making the routine sensible on its own: you cannot add to a number you have not read, and the log line reports the total after the add. Then ask what the other console can do in the gaps.','The lock has to cover the read, the add and the write — all three, or the gap is still there. The log line is slow and touches nothing shared, so it belongs after the lock is given back.'],
    takeaway:'Correct on the schedule you observed is not correct. A shared value read and written without a lock around the whole read-modify-write can lose an update on some interleaving, and the fact that it has not yet is not evidence that it will not.', reference:refs.concurrency
  },


  // -------------------------------------------------- chapter 4: system design
  {
    id:'stack-of-envelopes', kind:'layers', chapter:'Networking', concept:'Layering', name:'A stack of envelopes', location:'Comms locker',
    objective:'Order the headers a packet acquires, then size the payload to fill the 1,500-byte MTU exactly.',
    intro:'Your data does not travel alone. Each layer wraps what the layer above handed it, adding the information its own peers need.',
    lesson:'Layering means each layer only talks to its own peer. TCP adds 20 bytes of ports and sequence numbers so the far side can reassemble a stream; IP adds 20 bytes of addresses so routers can forward it; Ethernet adds its own header and trailer so the cable’s next device can pick it up. The link’s MTU limits the IP packet, here 1,500 bytes, so the largest payload TCP can carry in one segment is 1,500 − 20 − 20 = 1,460 bytes. That number is the maximum segment size. Exceed it and the packet is fragmented, which costs more than it saves.',
    items:[
      {id:'tcp', name:'TCP header', bytes:20, note:'ports, sequence and acknowledgement numbers'},
      {id:'ip', name:'IP header', bytes:20, note:'source and destination addresses'},
      {id:'ethernet', name:'Ethernet header and trailer', bytes:38, note:'MAC addresses and frame check, outside the MTU'}
    ],
    order:['tcp','ip','ethernet'], mtu:1500, linkOverhead:38,
    dials:[{id:'payload', label:'Application payload', help:'Bytes of your own data in this packet', value:1400, options:[{value:1400, label:'1,400 B'},{value:1440, label:'1,440 B'},{value:1460, label:'1,460 B'},{value:1480, label:'1,480 B'},{value:1500, label:'1,500 B'}]}],
    artifact:{
      title:'One packet, as four programs describe it',
      note:'The same bytes on the same wire. What changes is how far down each tool bothers to look, which is exactly what a layer is.',
      panes:[
        {label:'tcpdump', code:'14:22:07.113 IP 10.20.0.31.51314 > 203.0.113.9.443:\n  Flags [P.], seq 1:1461, ack 1, win 501,\n  length 1460', note:'One line, four layers deep, and no mention of the Ethernet header it arrived in or the 20 bytes of IP header it read to get here. The tool hides what it has already understood.'},
        {label:'tcpdump -e -x', code:'02:42:ac:11:00:02 > 02:42:9d:1c:00:01, ethertype IPv4\n  0x0000:  4500 05dc 1c46 4000 4006 ...\n  0x000e:  c350 01bb 0000 0001 ...\n\n  14 bytes frame | 20 IP | 20 TCP | 1460 data', note:'The same packet with the wrapping shown. 54 bytes of headers around 1,460 bytes of payload — 3.6% overhead, and every one of those bytes was added by a different layer that knew nothing about the others.'},
        {label:'ip link', code:'2: eth0: <BROADCAST,MULTICAST,UP> mtu 1500\n    link/ether 02:42:ac:11:00:02\n\n3: wg0: <POINTOPOINT,UP> mtu 1420\n    link/none', note:'The MTU is a property of the link, not of the protocol above it. A tunnel adds its own header to every packet, so its MTU is lower — which is why a VPN breaks large transfers that worked a moment earlier.'},
        {label:'path MTU discovery', code:'$ ping -M do -s 1472 host   # 1472+28 = 1500\n64 bytes from host: ttl=54 time=11.3 ms\n\n$ ping -M do -s 1473 host\nping: local error: message too long', note:'One byte more and the packet cannot be sent without fragmenting. This is how the largest workable payload is found in practice, and why a firewall that drops the "too big" reply produces a connection that opens and then hangs.'}
      ]
    },
    solution:{order:['tcp','ip','ethernet'], dials:{payload:1460}},
    hints:['Wrapping goes from the inside out: the layer closest to your data is added first, and the frame the cable carries is added last.','The IP packet must be at most 1,500 bytes, and it already spends 20 on TCP and 20 on IP. That leaves 1,460 for your data.'],
    takeaway:'Every layer costs bytes on every packet. A 1,460-byte payload spends 5% of the frame on headers; a 100-byte payload spends 44% of it.', reference:refs.layering
  },
  {
    id:'address-the-station', kind:'subnet', chapter:'Networking', concept:'IPv4 addressing', name:'Address the deck', location:'Network operations',
    objective:'Choose the smallest block from 10.20.30.0 that still holds 40 hosts.',
    intro:'A new deck needs addresses for 40 devices. Hand out too small a block and devices go unaddressed; too large a block and the rest of the station runs short.',
    lesson:'An IPv4 address is 32 bits. A prefix length says how many of those bits identify the network, leaving the rest for hosts: a /26 has 6 host bits and so 64 addresses. Two of them are not usable as hosts, the all-zeros network address and the all-ones broadcast address, so a /26 holds 62 hosts. A longer prefix is a smaller block, which is the part that reads backwards at first.',
    base:'10.20.30.0', hosts:40,
    dials:[{id:'prefix', label:'Prefix length', help:'Longer prefix, smaller block', value:24, options:[24,25,26,27,28,29,30].map(prefix => ({value:prefix, label:`/${prefix}`}))}],
    artifact:{
      title:'A prefix, four ways of writing the same thing',
      note:'The mask, the prefix length and the host count are one fact stated three ways. Being fluent between them is most of what subnetting is.',
      panes:[
        {label:'the mask in binary', code:'/26  11111111.11111111.11111111.11000000\n     255      .255      .255      .192\n\n     26 network bits | 6 host bits\n     2^6 = 64 addresses, 62 usable', note:'The prefix length counts the ones. Everything else follows from it, which is why /26 and 255.255.255.192 are not two facts to remember but one.'},
        {label:'ipcalc', code:'Address:   10.20.30.0\nNetmask:   255.255.255.192 = 26\nNetwork:   10.20.30.0/26\nHostMin:   10.20.30.1\nHostMax:   10.20.30.62\nBroadcast: 10.20.30.63\nHosts/Net: 62', note:'The two addresses that are not hosts are the all-zeros network and the all-ones broadcast. That is where the "minus two" comes from, and why a /30 point-to-point link holds exactly two usable addresses.'},
        {label:'ip addr', code:'inet 10.20.30.7/26 brd 10.20.30.63 scope global\n\n(the /26 is the host telling itself\n which addresses are on its own link)', note:'The prefix on an interface is not decoration. It is how the host decides whether a destination is on this link or has to go to the gateway, which is the next mission.'},
        {label:'the sizes worth knowing', code:'/24  254 hosts   a deck\n/25  126\n/26   62\n/27   30\n/28   14\n/29    6\n/30    2        a link between two routers\n/31    2        the same, without the waste', note:'Halving each time. Reading a prefix as "how many addresses" rather than "how many bits" is the fluency; /31 is the special case RFC 3021 added precisely because the minus-two was pure loss on a two-ended link.'}
      ]
    },
    solution:{dials:{prefix:26}},
    hints:['Count the usable addresses for each prefix: /27 gives 30, /26 gives 62. You need 40.','A /26 is the smallest block with room for 40 hosts. /25 would work too, but wastes 86 addresses.'],
    takeaway:'Subnetting is arithmetic on bits, not on dotted numbers. Each extra host bit doubles the block, so block sizes only ever come in powers of two.', reference:refs.cidr
  },
  {
    id:'carve-the-block', kind:'vlsm', chapter:'Networking', concept:'Subnet planning', name:'Carve up the block', location:'Address registry',
    objective:'Fit four decks of different sizes inside a single /24.',
    intro:'One /24 is all the station has: 256 addresses. Four decks need very different amounts. Give each one the smallest block that fits.',
    lesson:'Variable-length subnet masking gives each subnet only the size it needs. Every block has to start on a boundary that is a multiple of its own size, which is why order matters: a small block placed before a large one can leave a gap the large one is not allowed to start in. Allocating the largest first avoids that, and the decks below are already listed largest first.',
    base:'10.20.0.0', basePrefix:24,
    requests:[
      {id:'ops', name:'Operations deck', hosts:100},
      {id:'labs', name:'Laboratories', hosts:50},
      {id:'dock', name:'Docking bay', hosts:20},
      {id:'bridge', name:'Bridge', hosts:6}
    ],
    dials:[
      {id:'ops', label:'Operations deck · 100 hosts', value:24, options:[24,25,26,27,28,29,30].map(prefix => ({value:prefix, label:`/${prefix}`}))},
      {id:'labs', label:'Laboratories · 50 hosts', value:24, options:[24,25,26,27,28,29,30].map(prefix => ({value:prefix, label:`/${prefix}`}))},
      {id:'dock', label:'Docking bay · 20 hosts', value:24, options:[24,25,26,27,28,29,30].map(prefix => ({value:prefix, label:`/${prefix}`}))},
      {id:'bridge', label:'Bridge · 6 hosts', value:24, options:[24,25,26,27,28,29,30].map(prefix => ({value:prefix, label:`/${prefix}`}))}
    ],
    artifact:{
      title:'The same /24, allocated two ways',
      note:'Both plans hold every deck. One of them can accept another request and the other cannot, and nothing about the requirements changed.',
      panes:[
        {label:'fixed size', code:'10.20.0.0/26   Operations   62 usable, 100 needed ✗\n10.20.0.64/26  Laboratories 62 usable,  50 needed\n10.20.0.128/26 Docking      62 usable,  20 needed\n10.20.0.192/26 Bridge       62 usable,   6 needed', note:'Four equal blocks, and the largest deck does not fit in one. Fixed-size subnetting has to size every block for the biggest tenant, which is why it ran out of room before it ran out of addresses.'},
        {label:'variable length', code:'10.20.0.0/25   Operations   126 usable, 100 needed\n10.20.0.128/26 Laboratories  62 usable,  50 needed\n10.20.0.192/27 Docking       30 usable,  20 needed\n10.20.0.224/29 Bridge         6 usable,   6 needed\n10.20.0.232/29 .. free', note:'Each block sized to its deck, largest first. Every deck fits and 24 addresses are left — enough for three more small ones, which is the whole point of the technique.'},
        {label:'why order matters', code:'smallest first:\n  10.20.0.0/29    Bridge\n  10.20.0.8/27    Docking   ← must start at .0/.32/.64\n  ✗ .8 is not a /27 boundary', note:'A block has to start at a multiple of its own size, so a small block placed early leaves a hole a large block is not allowed to begin in. Allocating largest first is not a preference; it is what avoids the hole.'},
        {label:'as a router sees it', code:'$ ip route\n10.20.0.0/25   dev ops\n10.20.0.128/26 dev labs\n10.20.0.192/27 dev dock\n10.20.0.224/29 dev bridge', note:'Four routes instead of one, which is the cost. Variable-length subnetting trades a larger routing table for addresses that are not wasted, and summarising them back up is how that table stays small at the next router.'}
      ]
    },
    solution:{dials:{ops:25, labs:26, dock:27, bridge:29}},
    hints:['Work out the smallest prefix for each deck on its own: 100 hosts, 50 hosts, 20 hosts, 6 hosts.','/25 holds 126, /26 holds 62, /27 holds 30, /29 holds 6. Together that is 232 of the 256 addresses.'],
    takeaway:'Fixed-size subnets would have wasted most of this /24. Sizing each block to its deck left 24 addresses spare for the next one.', reference:refs.cidr
  },
  {
    id:'the-same-prefix-every-time', kind:'ipv6', chapter:'Networking', concept:'IPv6 addressing', name:'The same prefix every time', location:'Address registry',
    objective:'Number four decks of wildly different sizes inside the station’s /48, so that anything plugged in addresses itself.',
    intro:'The station has been allocated 2001:db8:1234::/48. Four decks need numbering: one has three devices, one has three thousand. The instinct from the last two missions is to size each block to its deck. That instinct is wrong here, and being wrong about it is the usual way IPv6 deployments go sideways.',
    lesson:'IPv4 subnetting is an exercise in thrift: you count hosts and hand out the smallest block that holds them, because there are not enough addresses. IPv6 removes the scarcity and replaces it with a convention that is load-bearing. The bottom 64 bits of an address are the interface identifier, and a device builds its own from what it knows about itself — that is stateless address autoconfiguration, and it is why a device can be plugged into a network that has never heard of it and be reachable a moment later without a server involved. Those 64 bits are not yours to economise on. So a subnet is a /64 whether it holds three devices or three thousand, and the number you are actually choosing is how many subnets to make, not how big to make them: a /48 holds 65,536 of them, which is why even a home connection is normally handed a /56 or better. Going longer than /64 to save space saves nothing worth having and breaks the thing that makes the protocol pleasant; going shorter hands one network enough room for hundreds and gets you nothing either.',
    base:'2001:db8:1234::', basePrefix:48,
    decks:[
      {name:'Habitat ring', hosts:400},
      {name:'Docking bay', hosts:3000},
      {name:'Reactor control', hosts:3},
      {name:'Sensor array', hosts:64}
    ],
    now:2026,
    dials:[
      {id:'prefix', label:'Prefix for each deck', help:'How much of the address names the network', value:56, options:[
        {value:56, label:'/56'}, {value:60, label:'/60'}, {value:64, label:'/64'},
        {value:72, label:'/72'}, {value:80, label:'/80'}, {value:112, label:'/112'}, {value:126, label:'/126'}
      ]},
      {id:'addressing', label:'How a device gets its address', help:'What happens when something is plugged in', value:'static', options:[
        {value:'slaac', label:'It works one out itself'},
        {value:'dhcpv6', label:'A DHCPv6 server hands it one'},
        {value:'static', label:'Somebody types it in'}
      ]}
    ],
    artifact:{
      title:'Where the 128 bits actually go',
      note:'Almost none of this is about having a lot of addresses. It is about what the bottom half is reserved for and what that buys.',
      panes:[
        {label:'the split', code:'2001:0db8:1234:0007:0a2f:fffe:31c4:9d01\n\\____________/\\__/\\__________________/\n   routing    sub      interface\n   prefix     net      identifier\n   48 bits   16 bits      64 bits', note:'The registry gives you the left 48. You choose the middle 16, which is 65,536 subnets. The right 64 are the device’s and are not yours to spend.'},
        {label:'a device arriving', code:'$ ip -6 addr\ninet6 fe80::a2f:fffe:31c4:9d01/64 scope link\ninet6 2001:db8:1234:7:a2f:fffe:31c4:9d01/64\n         scope global dynamic mngtmpaddr\n\nno server was contacted', note:'The link-local address exists before anything is configured. The global one is the router’s advertised prefix with the same identifier stuck on the end — which only works because the prefix stops at 64.'},
        {label:'what a /64 holds', code:'/64  = 18,446,744,073,709,551,616 addresses\n       for a deck with three devices\n\n/48  = 65,536 subnets\n/56  =    256 subnets  (a home allocation)\n/32  =  65,536 /48s    (an ISP allocation)', note:'The waste is the point. Addresses are not the scarce resource any more; the scarce resources are routing table entries and human attention, and a fixed subnet size costs neither.'},
        {label:'writing them down', code:'2001:0db8:1234:0000:0000:0000:0000:0001\n2001:db8:1234:0:0:0:0:1\n2001:db8:1234::1\n\nall the same address; the last one\nis the only correct way to print it', note:'Leading zeros in a group are dropped and the longest run of zero groups is replaced by :: exactly once. Two :: would be ambiguous, which is why the rule says once.'}
      ]
    },
    solution:{dials:{prefix:64, addressing:'slaac'}},
    hints:['Work out how many subnets the /48 gives you at each prefix before thinking about how many devices a deck has. The answer to "how many devices" turns out not to be part of this.','A device that configures itself builds the bottom 64 bits of its own address. Leave it fewer than 64 and it has nowhere to put them.'],
    takeaway:'In IPv6 a subnet is a /64, whatever it holds. The prefix stopped being a function of how many hosts there are and became the boundary a device builds its own address below — which is the whole reason something can be plugged in and be reachable without anyone configuring it.', reference:refs.ipv6
  },
  {
    id:'same-deck-or-not', kind:'reach', chapter:'Networking', concept:'Local delivery', name:'The deck that cannot talk', location:'Wiring closet',
    objective:'Repair one host’s mask and gateway so every destination leaves the way the address plan says it should.',
    intro:'Operations was re-addressed last night and one console has been unreachable since. Its address is right. Everything it does with that address is wrong.',
    lesson:'Before a host sends anything it asks one question: is this destination inside my own subnet? It answers with its own mask and nothing else — not the destination’s mask, not the gateway’s opinion. Inside, it ARPs for the destination and puts the frame on the wire itself. Outside, it ARPs for its gateway and hands the frame over. Two faults follow from that. A mask that is too short makes a host believe a distant deck is a neighbour, so it shouts for a machine no one can hear. A gateway outside the host’s own subnet is unusable, because the host cannot reach it either — which is why a wrong mask and a right gateway still fail together.',
    host:'10.20.0.10',
    destinations:[
      {name:'Console two, same deck', address:'10.20.0.20', expect:'direct'},
      {name:'Printer, same deck', address:'10.20.0.100', expect:'direct'},
      {name:'Laboratories deck', address:'10.20.0.130', expect:'gateway'},
      {name:'Off-station uplink', address:'10.30.0.5', expect:'gateway'}
    ],
    dials:[
      {id:'prefix', label:'Subnet mask', help:'What this host believes its own block is', value:24, options:[
        {value:24, label:'/24 · 255.255.255.0'},
        {value:25, label:'/25 · 255.255.255.128'},
        {value:26, label:'/26 · 255.255.255.192'},
        {value:27, label:'/27 · 255.255.255.224'}
      ]},
      {id:'gateway', label:'Default gateway', help:'Where anything outside the block is sent', value:'10.20.1.1', options:[
        {value:'10.20.0.1', label:'10.20.0.1'},
        {value:'10.20.0.129', label:'10.20.0.129'},
        {value:'10.20.1.1', label:'10.20.1.1'},
        {value:'none', label:'No gateway'}
      ]}
    ],
    artifact:{
      title:'What the console reports',
      note:'The output below is what you would see on the broken host. Read it before you touch a dial: three of these four lines are already telling you the fault.',
      panes:[
        {label:'ip addr', code:'2: eth0: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500\n    inet 10.20.0.10/24 brd 10.20.0.255 scope global eth0', note:'The address is correct and the mask is not. /24 makes this host believe everything from .0 to .255 is a neighbour.'},
        {label:'ip route', code:'default via 10.20.1.1 dev eth0\n10.20.0.0/24 dev eth0 proto kernel scope link src 10.20.0.10', note:'The default route points at a gateway that is not inside the block above, so the host cannot reach it either.'},
        {label:'ip neigh', code:'10.20.0.130 dev eth0 FAILED\n10.20.1.1   dev eth0 FAILED\n10.20.0.20  dev eth0 lladdr 3c:fd:fe:04:19:c1 REACHABLE', note:'FAILED means nobody answered the ARP. The one that works is the only destination genuinely on this wire.'},
        {label:'the plan', code:'operations  10.20.0.0/25    gateway 10.20.0.1\nlaboratories 10.20.0.128/25  gateway 10.20.0.129', note:'The address plan the station was re-cabled to. Operations is the lower half of the /24, not all of it.'}
      ]
    },
    solution:{dials:{prefix:25, gateway:'10.20.0.1'}},
    hints:['The plan says operations is 10.20.0.0/25 — the lower half. Under a /24 the host thinks 10.20.0.130 is a neighbour, and ARP for it goes unanswered.','A gateway has to be inside the host’s own block, or the host cannot reach it to hand anything over. With a /25 starting at 10.20.0.0, only one of the offered gateways qualifies.'],
    takeaway:'A host’s mask is a claim about who its neighbours are. Get it wrong and the symptom is not “no route” but silence: the host is shouting on its own wire for a machine that was never there.', reference:refs.arp
  },
  {
    id:'longest-prefix-wins', kind:'routing', chapter:'Networking', concept:'Forwarding', name:'The most specific route wins', location:'Station router',
    objective:'Forward five packets using the station’s routing table.',
    intro:'A router does not know where every address on the network is. It holds a table of prefixes and, for each packet, picks one line from it.',
    lesson:'Several routes can contain the same destination. The router always forwards along the one with the longest matching prefix, because a longer prefix is a more specific statement about where that address lives. 0.0.0.0/0 matches everything and so acts as the default route, used only when nothing more specific matches. This one rule is what lets a small table forward to the whole internet.',
    table:routingTable,
    questions:[
      {prompt:'A packet for 10.20.30.70 leaves by…', destination:'10.20.30.70', options:routeOptions},
      {prompt:'A packet for 10.20.30.9 leaves by…', destination:'10.20.30.9', options:routeOptions},
      {prompt:'A packet for 10.20.99.4 leaves by…', destination:'10.20.99.4', options:routeOptions},
      {prompt:'A packet for 10.9.1.1 leaves by…', destination:'10.9.1.1', options:routeOptions},
      {prompt:'A packet for 203.0.113.7 leaves by…', destination:'203.0.113.7', options:routeOptions}
    ],
    artifact:{
      title:'A routing table, and the one rule for reading it',
      note:'The order of the lines does not matter. Only the length of the prefix does, which is the part that surprises people coming from firewall rules.',
      panes:[
        {label:'ip route', code:'default via 198.51.100.1 dev uplink\n10.0.0.0/8     via 10.20.0.1 dev core\n10.20.0.0/16   via 10.20.0.1 dev spine\n10.20.30.0/24  dev lab\n10.20.30.64/26 via 10.20.30.1 dev sensors', note:'Five routes, and four of them could match 10.20.30.70. A firewall takes the first rule that matches; a routing table takes the most specific one, wherever it sits in the file.'},
        {label:'ip route get', code:'$ ip route get 10.20.30.70\n10.20.30.70 via 10.20.30.1 dev sensors src 10.20.30.9\n\n$ ip route get 10.20.30.9\n10.20.30.9 dev lab src 10.20.30.9', note:'The kernel answering the exact question rather than making you read the table. Two addresses one hop apart leave by different interfaces, because one of them falls inside the /26 and the other does not.'},
        {label:'the default route', code:'default via 198.51.100.1\n  =  0.0.0.0/0\n  =  zero bits have to match\n  =  the least specific route there can be', note:'The default route is not a special case in the lookup. It is a prefix of length zero, which matches everything and therefore loses to any other match — which is exactly the behaviour you want from a last resort.'},
        {label:'why the internet fits in memory', code:'$ wc -l < full-table.txt\n  974,331          # a full BGP table today\n\n10.20.0.0/16 covers 256 /24s\n  as one line, if they all leave the\n  same way', note:'Longest prefix match is what makes aggregation possible: a provider announces one short prefix instead of the hundreds of long ones inside it, and anybody needing finer detail announces it themselves and wins on specificity.'}
      ]
    },
    solution:[4,3,2,1,0],
    hints:['For each destination, find every prefix that contains it, then keep the one with the largest prefix length.','10.20.30.64/26 covers .64 to .127, so .70 is inside it but .9 is not. Only 203.0.113.7 falls through to the default route.'],
    takeaway:'Longest prefix match is the whole forwarding decision. Adding a more specific route changes where traffic goes without touching any other line in the table.', reference:refs.routers
  },
  {
    id:'which-door-it-knocks-on', kind:'socket', chapter:'Networking', concept:'Ports & sockets', name:'Which door it knocks on', location:'Service registry',
    objective:'Three services on one host. Give each the narrowest address it can listen on and still do its job.',
    intro:'The station controller runs three services on one machine. The portal is meant for anyone, the metrics are meant for the deck, and the admin console is meant for nobody but the machine itself. All three are currently listening on everything.',
    lesson:'A port on its own does not identify anything. What a program actually listens on is a socket: an address and a port together, and the address matters as much as the number. A host has several addresses — the loopback it talks to itself on, the one its deck can see, the one the outside world can see — and a socket bound to one of them is reachable only through that one. Bind to 0.0.0.0 instead and the socket answers on every interface the host has, including ones added later by a VPN or a second network card nobody told you about. When a packet arrives the kernel looks for the most specific match: a socket on this exact address wins over a socket on all of them, which is also why the two cannot both exist on the same port. This is the cheapest access control there is, and the only one that cannot be undone by a firewall rule somebody forgot to apply.',
    interfaces:[
      {name:'loopback', address:'127.0.0.1', note:'this machine only'},
      {name:'deck network', address:'10.20.0.5', note:'reachable from the station'},
      {name:'uplink', address:'198.51.100.2', note:'reachable from the internet'}
    ],
    services:[
      {id:'portal', name:'Station portal', port:80, note:'meant for anyone who can reach the station'},
      {id:'metrics', name:'Metrics endpoint', port:9090, note:'meant for the deck, not the internet'},
      {id:'admin', name:'Admin console', port:8080, note:'meant for this machine only'}
    ],
    packets:[
      {name:'Visitor loads the portal', source:'203.0.113.40', destination:'198.51.100.2', destinationPort:80, expect:true},
      {name:'Crew deck loads the portal', source:'10.20.0.31', destination:'10.20.0.5', destinationPort:80, expect:true},
      {name:'Deck monitor scrapes metrics', source:'10.20.0.31', destination:'10.20.0.5', destinationPort:9090, expect:true},
      {name:'Internet scanner finds metrics', source:'203.0.113.40', destination:'198.51.100.2', destinationPort:9090, expect:false},
      {name:'Operator on the machine opens admin', source:'127.0.0.1', destination:'127.0.0.1', destinationPort:8080, expect:true},
      {name:'Deck host reaches for admin', source:'10.20.0.31', destination:'10.20.0.5', destinationPort:8080, expect:false},
      {name:'Internet scanner finds admin', source:'203.0.113.40', destination:'198.51.100.2', destinationPort:8080, expect:false}
    ],
    dials:[
      {id:'portal', label:'Station portal · port 80', help:'Anyone who can reach the station should get this', value:'0.0.0.0', options:[
        {value:'127.0.0.1', label:'127.0.0.1 · this machine'}, {value:'10.20.0.5', label:'10.20.0.5 · the deck'},
        {value:'198.51.100.2', label:'198.51.100.2 · the uplink'}, {value:'0.0.0.0', label:'0.0.0.0 · all of them'}
      ]},
      {id:'metrics', label:'Metrics endpoint · port 9090', help:'The deck monitor scrapes this; the internet must not', value:'0.0.0.0', options:[
        {value:'127.0.0.1', label:'127.0.0.1 · this machine'}, {value:'10.20.0.5', label:'10.20.0.5 · the deck'},
        {value:'198.51.100.2', label:'198.51.100.2 · the uplink'}, {value:'0.0.0.0', label:'0.0.0.0 · all of them'}
      ]},
      {id:'admin', label:'Admin console · port 8080', help:'Nobody but this machine', value:'0.0.0.0', options:[
        {value:'127.0.0.1', label:'127.0.0.1 · this machine'}, {value:'10.20.0.5', label:'10.20.0.5 · the deck'},
        {value:'198.51.100.2', label:'198.51.100.2 · the uplink'}, {value:'0.0.0.0', label:'0.0.0.0 · all of them'}
      ]}
    ],
    artifact:{
      title:'The same three services, as the machine lists them',
      note:'Every one of these lines is real output. The first column is the whole of the decision this mission is about.',
      panes:[
        {label:'ss -tlnp', code:'State  Local Address:Port   Process\nLISTEN 0.0.0.0:80           portal\nLISTEN 0.0.0.0:9090         metrics\nLISTEN 0.0.0.0:8080         admin', note:'Three services, all on every interface. Nothing here is misconfigured in the usual sense — this is simply the default almost every framework ships with.'},
        {label:'after', code:'State  Local Address:Port   Process\nLISTEN 0.0.0.0:80           portal\nLISTEN 10.20.0.5:9090       metrics\nLISTEN 127.0.0.1:8080       admin', note:'The same three services. The admin console is now unreachable from anywhere but the machine itself, and no firewall was involved.'},
        {label:'the five-tuple', code:'protocol  src address:port     dst address:port\ntcp       203.0.113.40:51314 → 198.51.100.2:80\ntcp       10.20.0.31:44002   → 10.20.0.5:9090\n\nthe kernel matches on the right-hand side', note:'A connection is identified by all five, which is how one server holds thousands at once on a single port. The listening socket is matched on the destination half alone.'},
        {label:'the classic incident', code:'$ docker run -p 8080:8080 admin-panel\n$ curl http://<public-ip>:8080/\n{"users": [...]}\n\n-p publishes on 0.0.0.0 unless told\notherwise: -p 127.0.0.1:8080:8080', note:'Publishing a container port binds it to every interface by default and, on many setups, writes a firewall rule that bypasses the one you configured. The address in the bind is what actually decides.'}
      ]
    },
    solution:{dials:{portal:'0.0.0.0', metrics:'10.20.0.5', admin:'127.0.0.1'}},
    hints:['Take them one at a time and read which packets each has to answer. The portal has to answer on two different addresses; the metrics endpoint on exactly one; the admin console on the one nobody else can route to.','A service that has to answer on more than one address has to bind to all of them. A service that has to answer on exactly one should bind to that one and nothing else.'],
    takeaway:'A socket is an address and a port, and the address half is an access-control decision people forget they are making. Binding to 0.0.0.0 publishes a service on every interface the host has now and every one it is given later.', reference:refs.sockets
  },
  {
    id:'one-address-many-decks', kind:'nat', chapter:'Networking', concept:'Address translation', name:'One address, many decks', location:'Station border router',
    objective:'The station has one public address. Let the replies home, keep the probes out, and publish only what has to be public.',
    intro:'Forty devices inside, one address outside. The border router makes that work by rewriting every packet on the way out and remembering what it did.',
    lesson:'Source NAT rewrites the private source address to the router’s public one and picks a fresh outside port for each flow. That port is the whole trick: two hosts can talk to the same server on the same port and still be told apart, because the router gave each flow a different outside port. It also means the pool is spent per flow rather than per host, and a flow is the whole five-tuple — source address, source port, destination address, destination port, protocol. Two different consoles using the same source port to the same server are two flows. One console opening a second tab is two flows. The same console talking to the same server on a different port is two flows. Run out of outside ports and there is nowhere to map the next one, which is why a carrier sharing one address between subscribers counts flows and not people. Replies match the table and are rewritten back; an unsolicited inbound packet matches nothing and is dropped, which is why a device behind NAT is unreachable from outside by default and why publishing a service means adding a forward. A forward is not a small thing: it opens that port to everyone who can find the address.',
    publicAddress:'198.51.100.2',
    flows:[
      {direction:'out', source:'10.20.0.10', sourcePort:51000, destination:'203.0.113.9', destinationPort:443, name:'Crew console → weather, port 443', expect:true},
      {direction:'out', source:'10.20.0.11', sourcePort:51000, destination:'203.0.113.9', destinationPort:443, name:'Second console → weather, same source port', expect:true},
      {direction:'out', source:'10.20.0.10', sourcePort:51001, destination:'203.0.113.9', destinationPort:443, name:'Crew console again, next source port', expect:true},
      {direction:'out', source:'10.20.0.10', sourcePort:51000, destination:'203.0.113.9', destinationPort:80, name:'Crew console → weather, port 80', expect:true},
      {direction:'out', source:'10.20.0.12', sourcePort:60000, destination:'198.51.100.50', destinationPort:123, name:'Clock → time service', expect:true},
      {direction:'in', source:'203.0.113.9', sourcePort:443, replyTo:0, name:'Weather service replies', expect:true},
      {direction:'in', source:'198.51.100.7', sourcePort:40112, destinationPort:22, name:'Unknown host probes port 22', expect:false},
      {direction:'in', source:'198.51.100.7', sourcePort:40113, destinationPort:80, name:'Visitor loads the station portal', expect:true}
    ],
    forwardOptions:[
      {id:'none', label:'Publish nothing', rules:[]},
      {id:'ssh', label:'Publish 22 → console', rules:[{publicPort:22, inside:'10.20.0.10', insidePort:22}]},
      {id:'web', label:'Publish 80 → portal', rules:[{publicPort:80, inside:'10.20.0.12', insidePort:8080}]},
      {id:'both', label:'Publish 22 and 80', rules:[{publicPort:22, inside:'10.20.0.10', insidePort:22}, {publicPort:80, inside:'10.20.0.12', insidePort:8080}]}
    ],
    dials:[
      {id:'ports', label:'Outside ports in the pool', help:'One is spent per flow, and held until the flow closes', value:2, options:[
        {value:2, label:'2 ports'}, {value:4, label:'4 ports'}, {value:8, label:'8 ports'},
        {value:16, label:'16 ports'}, {value:32, label:'32 ports'}
      ]},
      {id:'forward', label:'Published ports', help:'What the outside world is allowed to start a connection to', value:'none', options:[
        {value:'none', label:'Publish nothing'},
        {value:'ssh', label:'Publish 22 → console'},
        {value:'web', label:'Publish 80 → portal'},
        {value:'both', label:'Publish 22 and 80'}
      ]}
    ],
    artifact:{
      title:'The same two flows, three ways to look at them',
      note:'Two consoles are talking to the same server on the same port. Only the translation table tells them apart.',
      panes:[
        {label:'conntrack', code:'tcp 6 431999 ESTABLISHED\n  src=10.20.0.10 dst=203.0.113.9 sport=51000 dport=443\n  src=203.0.113.9 dst=198.51.100.2 sport=443 dport=49152\ntcp 6 431998 ESTABLISHED\n  src=10.20.0.11 dst=203.0.113.9 sport=51000 dport=443\n  src=203.0.113.9 dst=198.51.100.2 sport=443 dport=49153', note:'Each entry is a flow the router started. The second line of each pair is the same flow as the outside world sees it — same private port, different public one.'},
        {label:'what the server sees', code:'198.51.100.2:49152 → GET /forecast\n198.51.100.2:49153 → GET /forecast', note:'Two customers, one address. The server cannot tell there are forty devices behind it, which is both the point and the problem.'},
        {label:'the dropped probe', code:'IN=eth0 SRC=198.51.100.7 DST=198.51.100.2\n  PROTO=TCP SPT=40112 DPT=22 SYN\n  → no conntrack entry, no forward: DROP', note:'Nothing inside started a flow on port 22, so there is no row to match and nowhere to send it.'}
      ]
    },
    solution:{dials:{ports:8, forward:'web'}},
    hints:['Count the outbound flows before sizing the pool, and count them by the whole five-tuple rather than by host: two of these share a source port, two share a source address, and every one of them still needs its own outside port.','Five flows are open at once, so the pool has to hold five. Then the published ports: the portal is meant to be public and the console’s SSH is not, and publishing a port opens it to everyone who can find the address.'],
    takeaway:'NAT gives you one address and, as a side effect, a default-closed border. That side effect is not a security model — it is an accident of having nothing to match — but the decision it forces, publish only what must be public, is a real one.', reference:refs.nat
  },
  {
    id:'window-of-opportunity', kind:'transport', chapter:'Networking', concept:'Sliding windows', name:'Fill the pipe', location:'Relay uplink',
    objective:'Send 8 MiB across a 50 Mbps, 200 ms link in under 2 seconds.',
    intro:'The link is fast and the distance is long. Sending one packet and waiting for its acknowledgement wastes almost all of the capacity.',
    lesson:'A sender may keep a window of unacknowledged data in flight. The amount that fits in the network at once is the bandwidth-delay product: capacity × round-trip time, here 50 Mbps × 0.2 s = 1.25 MB, about 857 packets. With a smaller window the sender runs out of permission and waits for an acknowledgement while the link sits idle. Beyond one bandwidth-delay product the window is no longer the limit, so nothing more is gained; in a real network an oversized window fills router queues and adds delay, which this model does not simulate.',
    link:{rttMs:200, capacityMbps:50, mss:1460, lossEvery:0}, bytes:8388608, target:{seconds:1.6},
    dials:[{id:'window', label:'Send window', help:'Unacknowledged packets allowed in flight', value:200, options:[
      {value:200, label:'200 packets'}, {value:400, label:'400 packets'}, {value:600, label:'600 packets'},
      {value:700, label:'700 packets'}, {value:800, label:'800 packets'}, {value:857, label:'857 packets'},
      {value:900, label:'900 packets'}, {value:1200, label:'1,200 packets'}, {value:2048, label:'2,048 packets'}
    ]}],
    artifact:{
      title:'The same link, measured',
      note:'Nothing here is about bandwidth. Every number is about how much data is allowed to be unacknowledged at once.',
      panes:[
        {label:'ss -ti', code:'cwnd:10 ssthresh:7 bytes_acked:1448000\n rtt:201.3/1.2 mss:1460\n delivery_rate:0.58Mbps\n\n(a 50 Mbps link, delivering 0.58)', note:'A window of ten packets on a 200 ms path is 14.6 KB in flight against a link that can hold 1.25 MB. The sender spends 97% of every round trip waiting, and no amount of extra bandwidth changes that number.'},
        {label:'the product', code:'50 Mbps x 0.200 s = 10,000,000 bits\n                  = 1,250,000 bytes\n                  = 856.2 packets of 1460\n\n  window >= 857 to keep it busy', note:'Bandwidth times delay is a volume: how much fits in the pipe between the two ends. Below it the link idles; above it the surplus waits in a queue somewhere and adds latency without adding throughput.'},
        {label:'iperf3', code:'-w 64K   :  2.6 Mbit/s\n-w 256K  : 10.4 Mbit/s\n-w 1M    : 41.0 Mbit/s\n-w 2M    : 49.6 Mbit/s\n-w 8M    : 49.6 Mbit/s', note:'Throughput rises with the window and then stops dead at the link rate. Everything past 2 MB is memory reserved on both ends that buys nothing — which is why the answer is the smallest window that saturates, not the largest one available.'},
        {label:'why it is the default no longer', code:'net.ipv4.tcp_rmem = 4096 131072 6291456\n                    min  default max\n\n(auto-tuning: the kernel grows the\n window to fit the path it measures)', note:'Sizing a window by hand is a thing operating systems stopped asking of you around 2005. The arithmetic is still worth knowing, because it is what the auto-tuner is doing and what you check when it has got it wrong.'}
      ]
    },
    solution:{dials:{window:857}},
    hints:['Work out how much data fits in the link at once: 50 Mbps for 200 ms, in bytes. Then divide by the 1,460-byte packet size. The answer is not one of the round numbers.','Every window at or above that figure finishes in the same 1.542 s, and every one below it leaves the link waiting. The smallest of them is the one to keep, because the rest is buffer you reserve and never use.'],
    takeaway:'Throughput on a long link is set by the window, not by the bandwidth. Until the window covers one bandwidth-delay product, most of the capacity you are paying for is idle.', reference:refs.tcp
  },
  {
    id:'lost-in-transit', kind:'transport', chapter:'Networking', concept:'Reliable delivery', name:'Lost in transit', location:'Deep-space array',
    objective:'Deliver 8 MiB over a lossy link within 2.6 seconds while retransmitting under 10% of it.',
    intro:'This link drops a packet every so often. Delivery still has to be complete, so anything lost must be sent again — the question is how much else goes with it.',
    lesson:'Reliability comes from acknowledgements and retransmission: the sender keeps data until the receiver confirms it, and a timeout means resend. What gets resent is the protocol’s choice. Go-Back-N acknowledges cumulatively, so a single loss makes the sender repeat every packet from the lost one onward, including ones that already arrived. Selective repeat acknowledges packets individually and resends only what was lost, at the cost of tracking each one. Both deliver the same bytes; they differ in how much of the link they waste doing it.',
    link:{rttMs:200, capacityMbps:50, mss:1460, lossEvery:256}, bytes:8388608, target:{seconds:2.6, wasted:0.1},
    dials:[
      {id:'window', label:'Send window', value:512, options:[
        {value:512, label:'512 packets'}, {value:857, label:'857 packets'}, {value:1024, label:'1,024 packets'},
        {value:1500, label:'1,500 packets'}, {value:2048, label:'2,048 packets'}, {value:3000, label:'3,000 packets'}
      ]},
      {id:'protocol', label:'Recovery strategy', value:'go-back-n', options:[{value:'go-back-n', label:'Go-Back-N'},{value:'selective-repeat', label:'Selective repeat'}]}
    ],
    artifact:{
      title:'One lost packet, two recovery strategies',
      note:'Both of these deliver every byte. The difference is entirely in which packets get sent a second time.',
      panes:[
        {label:'Go-Back-N', code:'sent   41 42 43 44 45 46 47 48\nlost      42\nacked  41 -- -- -- -- -- -- --\nresent    42 43 44 45 46 47 48\n\n7 packets resent, 6 of them arrived\nperfectly well the first time', note:'A cumulative acknowledgement can only say "everything up to here". With a gap at 42, the sender learns nothing about 43 to 48 and repeats them all, which is simple to implement and expensive to run.'},
        {label:'selective repeat', code:'sent   41 42 43 44 45 46 47 48\nlost      42\nSACK   41 ---- 43-48\nresent    42\n\n1 packet resent', note:'A selective acknowledgement names the blocks that did arrive, so the sender resends the hole and nothing else. The cost is a receiver that buffers out-of-order data and a sender that tracks each packet rather than a single number.'},
        {label:'netstat -s', code:'    2874 segments sent\n      14 segments retransmitted   (0.4%)\n     129 SACK blocks received\n\n    2874 segments sent\n    1405 segments retransmitted  (48.9%)\n       0 SACK blocks received', note:'The same transfer over the same link, with and without selective acknowledgement. A retransmission rate near half on a link losing well under one percent is the signature of a receiver that is not sending SACK.'},
        {label:'what loss is not', code:'loss on a wireless link : interference\nloss on a wired link    : a full queue\n\nTCP treats both as congestion,\nwhich is right for one of them', note:'Almost all loss on the wired internet is a router dropping from a queue that is already full, so treating it as a signal to slow down is correct. On a lossy radio link it is not, which is why mobile networks retransmit below IP rather than let TCP see it.'}
      ]
    },
    solution:{dials:{window:2048, protocol:'selective-repeat'}},
    hints:['Two targets bind here, and they pull in different directions. The deadline needs a window large enough to keep sending through the gaps recovery leaves; the waste limit is about which packets get resent when one goes missing.','One bandwidth-delay product is not enough on a lossy link, because recovery keeps stalling the window. Go-Back-N resends about half of everything whatever the window, so the protocol is settled first and then the smallest window that still makes the deadline.'],
    takeaway:'A loss rate of well under 1% cost either 0.4% or 49% of the link, depending only on which packets the protocol chose to resend.', reference:refs.tcp
  },
  {
    id:'ramp-up-carefully', kind:'congestion', chapter:'Networking', concept:'Congestion control', name:'Ramp up carefully', location:'Transfer control',
    objective:'Send the same 4 MiB archive over two very different links, meeting both deadlines without wasting more than a tenth of what you send.',
    intro:'One link is short and fat; the other is long and thin. The same sender has to do well on both, and it is not told which one it is on.',
    lesson:'“Fill the pipe” told you to size a window to one bandwidth-delay product. This mission asks what to do when you do not know the pipe. Slow start begins at one packet and doubles every round trip, so it finds the path’s capacity in a logarithmic number of trips rather than being told it. When something is lost it halves and then climbs by one packet per round trip — additive increase, multiplicative decrease — which is what keeps many senders sharing a link from collapsing together. A fixed window can beat it on the link it was tuned for, and only on that link: too small and the link idles waiting for acknowledgements, too large and the excess sits in the bottleneck’s buffer until it overflows, so every extra packet is sent twice for no extra speed.',
    bytes:4194304,
    links:[
      {name:'station spine', rttMs:8, capacityMbps:400, bufferPackets:12, target:{seconds:0.3, wasted:0.1}},
      {name:'deep-space relay', rttMs:500, capacityMbps:1.5, bufferPackets:12, target:{seconds:30, wasted:0.1}}
    ],
    dials:[
      {id:'sender', label:'How the sender chooses its window', help:'A size fixed in advance, or one discovered while sending', value:'fixed-16', options:[
        {value:'fixed-16', label:'Fixed · 16'},
        {value:'fixed-32', label:'Fixed · 32'},
        {value:'fixed-64', label:'Fixed · 64'},
        {value:'fixed-96', label:'Fixed · 96'},
        {value:'fixed-128', label:'Fixed · 128'},
        {value:'fixed-256', label:'Fixed · 256'},
        {value:'fixed-274', label:'Fixed · 274'},
        {value:'fixed-400', label:'Fixed · 400'},
        {value:'fixed-1024', label:'Fixed · 1,024'},
        {value:'slow-start', label:'Slow start, then additive increase'}
      ]}
    ],
    artifact:{
      title:'A congestion window, as the sender records it',
      note:'Both columns are the same code on different paths. The shape is the algorithm: double, lose, halve, climb.',
      panes:[
        {label:'ss -ti (spine)', code:'cwnd:274 ssthresh:137 bytes_acked:4194304\n rtt:8.1/0.4 delivery_rate:398Mbps retrans:0/2874', note:'A short round trip finds a large window quickly, and the whole transfer is over in a handful of trips.'},
        {label:'ss -ti (relay)', code:'cwnd:64 ssthresh:64 bytes_acked:4194304\n rtt:503/11 delivery_rate:1.49Mbps retrans:52/2926', note:'The same sender settles two orders of magnitude lower on a path that holds two orders of magnitude less.'},
        {label:'the sawtooth', code:'round  1   cwnd 1\nround  2   cwnd 2\nround  3   cwnd 4\n...\nround  9   cwnd 256   ← 77 dropped\nround 10   cwnd 128\nround 11   cwnd 129', note:'Doubling until something breaks, then halving and creeping back up. Every sender on the internet is doing a version of this right now.'}
      ]
    },
    solution:{dials:{sender:'slow-start'}},
    hints:['Work out one bandwidth-delay product for each link before touching a dial: 400 Mbps over 8 ms is one number and 1.5 Mbps over 500 ms is a very different one. Anything sized for one of them is wrong for the other.','The two paths hold 274 packets and 64 packets. Below 64 the relay is too slow, at 64 the spine is, and above 96 the relay throws away what will not fit — so there is no number in between, which is the point.'],
    takeaway:'A window tuned to a path is a guess that stops being true the moment the path changes. Slow start trades a few round trips at the beginning for being right on every link, which is why it is what actually runs.', reference:refs.congestion
  },
  {
    id:'one-file-holds-the-rest', kind:'multiplex', chapter:'Networking', concept:'Head-of-line blocking', name:'One file holds the rest', location:'Portal front end',
    objective:'Load the twelve files of the station portal within 250 ms, with one packet lost, and without that loss delaying anything else.',
    intro:'Twelve files, one origin, forty milliseconds of round trip, and one packet dropped in the stylesheet. Eleven of the twelve do not depend on the stylesheet in any way. What they wait for depends entirely on how the bytes underneath are arranged.',
    lesson:'Head-of-line blocking is what happens when something has to be delivered in order and the first thing in the queue is late. It appears at every layer and the answers have chased it up the stack. HTTP/1.1 sends one request at a time on a connection, so the second waits for the first — and browsers worked around it by opening six connections per origin, which is six handshakes, six congestion windows all starting from nothing, and six times the state on the server. HTTP/2 fixed the protocol by interleaving many requests over one connection, and then discovered the problem had only moved: TCP hands the application its bytes strictly in order, so one lost segment stalls delivery of every stream that shares the connection, related or not. The streams are independent in the protocol and not in the transport, which means they are not independent. QUIC moves the ordering down with the streams, so a gap in one is a gap in one. That is the whole reason a new transport was worth building.',
    streams:[
      {name:'index.html', rounds:1}, {name:'app.css', rounds:1}, {name:'app.js', rounds:4},
      {name:'logo.svg', rounds:1}, {name:'hero.jpg', rounds:3}, {name:'font.woff2', rounds:2},
      {name:'icons.svg', rounds:1}, {name:'analytics.js', rounds:1}, {name:'photo-1.jpg', rounds:2},
      {name:'photo-2.jpg', rounds:2}, {name:'photo-3.jpg', rounds:2}, {name:'api/session', rounds:1}
    ],
    rttMs:40, lossAt:1, handshakeRounds:2, target:{ms:250},
    dials:[
      {id:'pool', label:'Connections, and requests in flight on each', help:'A connection is a handshake and a congestion window of its own', value:'1:1', options:[
        {value:'1:1', label:'1 · one at a time'},
        {value:'2:1', label:'2 · one at a time'},
        {value:'6:1', label:'6 · one at a time'},
        {value:'1:100', label:'1 · interleaved'},
        {value:'2:100', label:'2 · interleaved'},
        {value:'6:100', label:'6 · interleaved'}
      ]},
      {id:'ordering', label:'How the transport delivers', help:'What the layer underneath promises about order', value:'tcp', options:[
        {value:'tcp', label:'One ordered byte stream'},
        {value:'streams', label:'Independent streams'}
      ]}
    ],
    artifact:{
      title:'The same twelve files, three transports',
      note:'A waterfall is the only place this is visible. Read the third column of each: what a file was waiting for when it was not being sent.',
      panes:[
        {label:'HTTP/1.1', code:'index.html   ▓▓            80ms\napp.css      ▓▓            80ms  ← lost\napp.js         ▓▓▓▓▓      240ms\nlogo.svg     ▓▓            80ms\nhero.jpg       ▓▓▓▓       200ms\n(six at a time, the rest queue)', note:'Six connections hide the blocking by not sharing. The cost is paid at setup and in congestion control, where six senders each discover the same path separately and compete with each other doing it.'},
        {label:'HTTP/2', code:'index.html   ▓▓░░          120ms\napp.css      ▓▓░░          120ms  ← lost\napp.js         ▓▓▓▓▓░░     280ms\nlogo.svg     ▓▓░░          120ms\nhero.jpg       ▓▓▓▓░░      240ms\n(░ = waiting for a gap in a file\n    it does not use)', note:'Nothing queues any more and everything still waits. One lost segment in app.css and the kernel will not hand the application anything that arrived after it, because a byte stream has one order and one gap.'},
        {label:'QUIC', code:'index.html   ▓▓             80ms\napp.css      ▓▓░            120ms ← lost\napp.js         ▓▓▓▓▓       240ms\nlogo.svg     ▓▓             80ms\nhero.jpg       ▓▓▓▓         200ms', note:'The loss costs the stream that lost something and nothing else. Ordering moved down to sit with the streams instead of underneath all of them.'},
        {label:'why it needed a new transport', code:'TCP is in kernels, middleboxes,\nload balancers and firmware.\n\nQUIC runs over UDP in user space\nbecause changing TCP on the actual\ninternet is not a thing you can do.', note:'The fix was known for years before it shipped. What took the time was that the layer needing the change is the one nobody can deploy a change to, so it was rebuilt on top of the one layer middleboxes still pass through.'}
      ]
    },
    solution:{dials:{pool:'1:100', ordering:'streams'}},
    hints:['Try the six configurations against one transport first and watch two different things go wrong: below six connections the requests queue, and at six they stop queueing. Then switch the transport and read the stalled count instead of the clock.','Interleaving fixes the queueing and does nothing about the loss. Six connections fix the loss for five of the files by not sharing, and cost six handshakes to do it. Only one of the two transports makes a lost packet cost one file.'],
    takeaway:'Streams that are independent in the protocol are only independent if they are independent in the transport underneath. HTTP/2 multiplexed requests over a connection that still delivers one ordered stream of bytes, and a single lost segment stalls all of them — which is what QUIC was built to fix.', reference:refs.quic
  },
  {
    id:'name-the-archive', kind:'sequence', chapter:'Networking', concept:'DNS', name:'Ask for it by name', location:'Name service',
    objective:'Order a DNS resolution and answer it within 60 ms.',
    intro:'The archive has a name, not an address. Finding the address means walking down the name hierarchy — unless somebody already wrote the answer down.',
    lesson:'DNS is a hierarchy resolved from the top. A resolver asks a root server which servers know the top-level domain, asks one of those which server is authoritative for the domain, and asks that one for the record. Each step is a round trip, which is why the whole chain is slow and why every answer carries a time-to-live telling resolvers how long they may reuse it. A resolver holding the delegations skips straight to the authoritative server; one holding the record answers immediately, with no network at all.',
    instructions:'Put the steps in the order they happen, then decide what the resolver already knows.',
    items:[
      {id:'stub', name:'Station resolver checks its own cache', ms:1, note:'no network'},
      {id:'recursive', name:'Recursive resolver accepts the query', ms:4},
      {id:'root', name:'Root server names the .quest servers', ms:80, note:'one round trip'},
      {id:'tld', name:'.quest server names the authoritative server', ms:60, note:'one round trip'},
      {id:'authoritative', name:'Authoritative server returns the address record', ms:45},
      {id:'answer', name:'Address returns to the station', ms:4}
    ],
    order:['stub','recursive','root','tld','authoritative','answer'],
    orderHint:'Resolution starts at the station and walks down the hierarchy: root, then the top-level domain, then the server authoritative for the name.',
    dials:[{id:'cache', label:'Resolver cache', help:'What the recursive resolver already holds', value:'cold', options:[{value:'cold', label:'Cold — nothing cached'},{value:'warm', label:'Warm — delegations still within their TTL'}]}],
    skipWhen:{dial:'cache', value:'warm', skip:['root','tld']},
    target:{ms:60},
    artifact:{
      title:'A name resolved, one step at a time',
      note:'Every line is a separate question to a separate server. Nobody holds the whole tree, which is why it has survived being the internet’s single point of failure.',
      panes:[
        {label:'dig +trace', code:'.            NS  a.root-servers.net.\nexample.     NS  a.iana-servers.net.\nstation.example. NS ns1.station.example.\narchive.station.example. A 198.51.100.44\n\n4 questions, 4 different servers', note:'Each answer is a referral to something that knows more, not the answer itself. The root knows who runs .example and nothing whatsoever about archive.station.example.'},
        {label:'the cache', code:'$ dig archive.station.example\n;; Query time: 74 msec\n\n$ dig archive.station.example\n;; Query time: 0 msec\n;; ANSWER: archive.station.example. 3521 IN A ...', note:'The second query never left the machine. That 3521 is what remains of a 3600-second TTL, and it is why a DNS change appears instantly for you and an hour later for everyone else.'},
        {label:'what a TTL costs', code:'TTL 86400 : one lookup a day per resolver\n            a change takes a day to land\nTTL 60    : a lookup a minute\n            a change lands in a minute\n\n(lower it before you migrate,\n raise it after)', note:'The TTL is a straight trade between lookup traffic and how long a mistake lasts. The standard move before moving a service is to drop it days ahead, so the cutover is fast when it comes.'},
        {label:'why it is not one round trip', code:'first visit  : 4 lookups + TCP + TLS\nreturn visit : 0 lookups (cached)\n\n(and the four are why a resolver\n close to the user matters more\n than a fast one far away)', note:'The resolution in this mission is the cold case. Warm, it disappears entirely — which is why measuring a page load once tells you almost nothing about what it costs anybody else.'}
      ]
    },
    solution:{order:['stub','recursive','root','tld','authoritative','answer'], dials:{cache:'warm'}},
    hints:['The order is fixed by the hierarchy. The 60 ms budget is not reachable while the resolver has to ask the root and the top-level domain.','Warm the resolver cache. The delegations are still valid, so only the authoritative lookup remains: 1 + 4 + 45 + 4 = 54 ms.'],
    takeaway:'A cold resolution spends 194 ms in round trips and a warm one 54 ms, for the same answer. Caching in DNS is not an optimisation bolted on afterwards; the TTL field is part of the protocol.', reference:refs.dns
  },
  {
    id:'first-byte', kind:'sequence', chapter:'Networking', concept:'Connection setup', name:'Time to first byte', location:'Uplink terminal',
    objective:'Order the steps of an HTTPS request and get the first byte inside 150 ms.',
    intro:'The link has a 120 ms round-trip time. Before any of your data moves, the two ends have to agree that they are talking, and that nobody else is listening.',
    lesson:'A new HTTPS request pays for three round trips: one for the TCP handshake, one for the TLS handshake, and one for the request and response. At 120 ms each, that is 360 ms before the first byte, none of it spent on bandwidth. Keeping the connection open removes the first two, so the next request costs one round trip. This is why connection reuse, and protocols that fold handshakes together, matter more to perceived speed than raw throughput does.',
    instructions:'Order the exchange, then decide whether this is a new connection or a reused one.',
    items:[
      {id:'syn', name:'SYN — client opens the connection', ms:60},
      {id:'synack', name:'SYN-ACK — server agrees', ms:60},
      {id:'hello', name:'TLS ClientHello — client proposes keys', ms:60},
      {id:'server-hello', name:'TLS ServerHello and Finished', ms:60},
      {id:'request', name:'HTTP GET /archive', ms:60},
      {id:'response', name:'First byte of the response', ms:60}
    ],
    order:['syn','synack','hello','server-hello','request','response'],
    orderHint:'TCP first, then TLS on top of it, then the HTTP request. Nothing encrypted can precede the handshake that set up the keys.',
    dials:[{id:'connection', label:'Connection', help:'Whether this request opens a new connection', value:'new', options:[{value:'new', label:'New connection'},{value:'reused', label:'Reused, already handshaken'}]}],
    skipWhen:{dial:'connection', value:'reused', skip:['syn','synack','hello','server-hello']},
    target:{ms:150},
    artifact:{
      title:'Where the time before the first byte goes',
      note:'One request, broken into what it actually waited for. Every segment is a round trip somebody chose to require.',
      panes:[
        {label:'curl -w', code:'namelookup:     0.074\nconnect:        0.118   (+44 ms, 1 RTT)\nappconnect:     0.206   (+88 ms, 2 RTT)\nstarttransfer:  0.250   (+44 ms, 1 RTT)\ntotal:          0.281', note:'Four round trips before a byte of content arrives, and only the last one carries the request. The DNS lookup, the handshake and the TLS negotiation are all latency nobody asked for and everybody pays.'},
        {label:'TLS 1.2 vs 1.3', code:'TLS 1.2 : ClientHello -> ServerHello ->\n          KeyExchange -> Finished     2 RTT\nTLS 1.3 : ClientHello+share ->\n          ServerHello+Finished        1 RTT\nresumed : 0 RTT (early data)', note:'TLS 1.3 removed a whole round trip by having the client guess the key exchange in its first message. On a 200 ms path that is 200 ms off every new connection, which is the single largest thing that happened to web latency in a decade.'},
        {label:'the same page, further away', code:'40 ms RTT  : 160 ms to first byte\n200 ms RTT : 800 ms to first byte\n\n(same server, same code,\n same bandwidth)', note:'Multiply the round trips by the distance. This is why a CDN edge that does nothing but terminate the connection nearby is worth having even when the content still comes from the origin.'},
        {label:'what cannot be removed', code:'speed of light, London -> Sydney\n  17,000 km / 200,000 km/s = 85 ms\n  round trip                170 ms\n\n(fibre is about 2/3 of c)', note:'Bandwidth is something you can buy more of. Latency below this floor is not for sale, which is the reason every serious optimisation is about making fewer round trips rather than faster ones.'}
      ]
    },
    solution:{order:['syn','synack','hello','server-hello','request','response'], dials:{connection:'reused'}},
    hints:['Handshakes happen bottom-up: the transport connection exists before TLS can negotiate on it, and TLS finishes before an encrypted request can be sent.','Three round trips is 360 ms, so a new connection cannot make 150 ms. Reuse the connection and only the request and response remain: 120 ms.'],
    takeaway:'Round trips, not bandwidth, decide time to first byte. Every handshake you can avoid is a whole round trip saved.', reference:refs.tls
  },
  {
    id:'who-says-so', kind:'chain', chapter:'Networking', concept:'Certificates & trust', name:'Who says so', location:'Uplink terminal',
    objective:'The portal answers to two names. Make both of them verify, from a trust store that has one certificate in it, without sending anything the client already has.',
    intro:'The portal’s certificate is installed and the browser on the operator’s desk is perfectly happy with it. Everything else that connects — the deck monitor, the backup script, the handset in the airlock — says the certificate cannot be verified. Nothing is expired and nothing is misspelled.',
    lesson:'A certificate says that a name belongs to a key, and it is signed by somebody. That signature is worth exactly as much as your reason to believe the signer, so the client walks upward: this certificate was issued by that one, that one by another, until it reaches something already in its trust store — a root it trusted before the connection started. The client only has roots. It does not have the intermediates, and there can be several, so the server has to send everything between its own certificate and the root. Miss one and the path stops, which produces the most confusing failure in the whole protocol: browsers cache intermediates they have seen on other sites and will quietly fill the gap, so the site works for the person who set it up and fails for everything that has not been browsing the web all day. Sending the root as well is the opposite mistake and a much smaller one: a client that has it did not need it, a client that lacks it is not going to start trusting it because a stranger attached it, and everyone pays the bytes on every handshake. The name is checked separately, against the certificate’s subject alternative names, and one wildcard covers a single label — *.station.example is api.station.example but not deck.two.station.example.',
    hosts:['portal.station.example', 'api.station.example'],
    store:['Station Root CA'],
    now:2026,
    certificates:{
      leaf:{leaf:true, issuer:'Station Issuing CA'},
      intermediate:{subject:'Station Issuing CA', issuer:'Station Root CA', notAfter:2028},
      root:{subject:'Station Root CA', issuer:'Station Root CA', notAfter:2030}
    },
    leaves:{
      exact:{subject:'portal.station.example', names:['portal.station.example'], notAfter:2027},
      wildcard:{subject:'*.station.example', names:['*.station.example'], notAfter:2027},
      expired:{subject:'*.station.example', names:['*.station.example'], notAfter:2024}
    },
    chains:[
      {id:'leaf', label:'The certificate on its own', certificates:['leaf']},
      {id:'full', label:'Certificate, then issuer', certificates:['leaf', 'intermediate']},
      {id:'withRoot', label:'Certificate, issuer, root', certificates:['leaf', 'intermediate', 'root']},
      {id:'reversed', label:'Issuer, then certificate', certificates:['intermediate', 'leaf']}
    ],
    dials:[
      {id:'certificate', label:'Which certificate is installed', help:'What names it vouches for, and until when', value:'exact', options:[
        {value:'exact', label:'portal.station.example'},
        {value:'wildcard', label:'*.station.example'},
        {value:'expired', label:'*.station.example · last year’s'}
      ]},
      {id:'chain', label:'What the server sends with it', help:'The client has roots and nothing else', value:'leaf', options:[
        {value:'leaf', label:'The certificate on its own'},
        {value:'full', label:'Certificate, then issuer'},
        {value:'withRoot', label:'Certificate, issuer, root'},
        {value:'reversed', label:'Issuer, then certificate'}
      ]}
    ],
    artifact:{
      title:'The same server, from four clients',
      note:'One configuration. The disagreement between these is not a bug in any of them — it is what happens when the path is incomplete and some clients happen to have the missing piece.',
      panes:[
        {label:'the browser', code:'$ open https://portal.station.example\n  🔒 Connection is secure\n\n(the intermediate was cached three\n weeks ago from an unrelated site)', note:'This is why the person who installed it sees nothing wrong. A browser fills a gap in the chain from certificates it has collected elsewhere, and never mentions that it did.'},
        {label:'everything else', code:'$ curl https://portal.station.example\ncurl: (60) SSL certificate problem:\n  unable to get local issuer certificate\n\n$ python -c "import requests; requests.get(...)"\nSSLError: certificate verify failed:\n  unable to get local issuer certificate', note:'A client with only a root store and no cache has no way to bridge the gap, and says so in the same words every time. "Unable to get local issuer certificate" almost always means a missing intermediate.'},
        {label:'what was sent', code:'$ openssl s_client -connect host:443\n---\nCertificate chain\n 0 s:CN=portal.station.example\n   i:CN=Station Issuing CA\n---\n(one certificate; the issuer is named\n but not attached)', note:'The chain the server actually sends, which is the only thing that matters. Position 0 is the leaf; anything the client needs above it should be at 1 and 2.'},
        {label:'fixed', code:'Certificate chain\n 0 s:CN=*.station.example\n   i:CN=Station Issuing CA\n 1 s:CN=Station Issuing CA\n   i:CN=Station Root CA\n\nroot not sent: the client has it', note:'Two certificates, and the second one is the bridge. The root stays out — a client that trusts it already has it, and a client that does not will not be persuaded by a copy arriving from the server.'}
      ]
    },
    solution:{dials:{certificate:'wildcard', chain:'full'}},
    hints:['Two names have to verify, and only one of the three certificates vouches for more than one name. Settle that first and the failures stop being about names.','The client starts with roots and nothing else. Send it everything between your certificate and a root, in that order, and nothing above.'],
    takeaway:'A certificate is worth the path from it to a root the client already had. The server has to send that path, because the client only has the roots — and a browser quietly filling in a missing link from its cache is the reason this fails for everything except the machine it was tested on.', reference:refs.certificates
  },
  {
    id:'size-it-yourself', kind:'estimate', chapter:'System design', concept:'Estimation', name:'Size it yourself', location:'Planning table',
    objective:'Work out what the telemetry service will actually need, from five numbers and arithmetic you can do in your head.',
    intro:'Nobody will give you a benchmark. You will be asked, in a meeting, roughly how big this has to be — and the answer you give decides what gets built.',
    lesson:'An estimate is right when its order of magnitude is right; two significant figures is a luxury. Three habits carry most of the work. Convert to per-second early, because capacity is quoted per second and a day is 86,400 of them. Size for the peak, not the average, because a service sized for the average is down every lunchtime. And multiply storage by the number of copies you keep, because durability is not free and replicas are the factor people leave out. Headroom is the fourth: a server at 100% utilisation queues without limit, so a server that handles 900 requests a second is a server you plan 630 for.',
    instructions:'Every figure below follows from the table on the left. Work it out, then pick the closest.',
    given:[
      {label:'Telemetry records a day', text:'86,400,000'},
      {label:'Peak traffic', text:'3× the average'},
      {label:'Bytes per record', text:'400 B'},
      {label:'Copies kept for durability', text:'3'},
      {label:'Bytes returned per request', text:'12,000 B'},
      {label:'One server handles', text:'900 req/s'},
      {label:'Planned headroom', text:'70% of capacity'}
    ],
    givens:{dailyRequests:86400000, peakMultiplier:3, bytesPerRecord:400, copies:3, responseBytes:12000, rpsPerServer:900, headroom:0.7},
    questions:[
      {estimator:'peakRequestsPerSecond', prompt:'What does the service have to handle at its peak second?', options:[
        {label:'about 300 req/s', value:300},
        {label:'about 1,000 req/s', value:1000},
        {label:'about 3,000 req/s', value:3000},
        {label:'about 30,000 req/s', value:30000}
      ]},
      {estimator:'storagePerDayGb', prompt:'How much new storage does one day add, before replication?', options:[
        {label:'about 350 GB', value:350},
        {label:'about 35 GB', value:35},
        {label:'about 3.5 GB', value:3.5},
        {label:'about 0.35 GB', value:0.35}
      ]},
      {estimator:'storagePerYearTb', prompt:'After a year, with every byte stored three times, how much is on disk?', options:[
        {label:'about 4 TB', value:4},
        {label:'about 40 TB', value:40},
        {label:'about 400 TB', value:400},
        {label:'about 4 PB', value:4000}
      ]},
      {estimator:'egressPerMonthTb', prompt:'How much data leaves the service in a month?', options:[
        {label:'about 3 TB', value:3},
        {label:'about 300 TB', value:300},
        {label:'about 31 TB', value:31},
        {label:'about 3 PB', value:3000}
      ]},
      {estimator:'serversForPeak', prompt:'How many servers does the peak need, at 70% of each one’s capacity?', options:[
        {label:'about 50', value:50},
        {label:'about 5', value:5},
        {label:'about 500', value:500},
        {label:'about 1', value:1}
      ]}
    ],
    quizSuccess:'Five numbers, no benchmark, and a size you can defend in a meeting.',
    solution:{choices:[2, 1, 1, 2, 1]},
    artifact:{
      title:'The numbers worth memorising',
      note:'Estimation is not a talent. It is a handful of constants and the discipline of converting to per-second before anything else.',
      panes:[
        {label:'time', code:'1 day        = 86,400 s   ≈ 10^5 s\n1 month      = 2.6 × 10^6 s\n1 year       = 3.2 × 10^7 s\n1,000/s      = 86.4 million a day', note:'A day is close enough to 10^5 seconds that you can do the division in your head and fix it later.'},
        {label:'size', code:'1 KB × 1,000/s = 1 MB/s\n1 MB/s         = 2.6 TB/month\n1 KB × 1M/day  = 1 GB/day\n10^9 B = 1 GB, 10^12 B = 1 TB', note:'Storage and bandwidth are quoted in powers of ten. Memory is quoted in powers of two. Mixing them is a 7% error, which does not matter here.'},
        {label:'latency', code:'main memory reference      100 ns\nSSD random read            16 µs\nround trip within a region 500 µs\nround trip across an ocean 150 ms', note:'Six orders of magnitude between memory and a transatlantic round trip. Almost every design argument is about which of these a request pays for.'},
        {label:'the meeting answer', code:'"About 3,000 a second at peak,\n roughly 35 GB a day, so call it\n 40 TB of disk after a year with\n three copies, and five servers.\n I would build for ten."', note:'Doubling the answer at the end is not sloppiness. It is the cost of being wrong in the direction that does not page anyone.'}
      ]
    },
    hints:['Start by turning 86,400,000 a day into a per-second figure — the number of seconds in a day is the only constant you need — then multiply by the peak factor.','Storage: 86.4 million × 400 B is about 35 GB a day. A year is 365 of those, and then multiply by 3 for the copies.'],
    takeaway:'Every capacity decision starts as arithmetic on a whiteboard. Getting the order of magnitude right, and knowing which way you rounded, is worth more than a benchmark you will not have time to run.', reference:refs.estimation
  },
  {
    id:'cheaper-than-more-database', kind:'design', chapter:'System design', concept:'Caching vs capacity', name:'Cheaper than more database', location:'Planning deck',
    objective:'Serve the archive read storm inside the latency, availability and budget targets, for the fewest credits a month.',
    intro:'Nine thousand requests a second, ninety-seven in a hundred of them reads, over a thirty-gigabyte working set. The obvious move is to buy a datastore that can serve nine thousand reads. Price it before you propose it.',
    lesson:'Read replicas and caches both take read load off a primary datastore, and they are not interchangeable. A replica is a full copy: it costs what a datastore costs, it can serve any read including ones nobody has asked for before, and it lags the primary by however long replication takes. A cache is a partial copy of whatever has been asked for recently: it costs a fraction of a datastore, it serves only the hot set, and a miss costs you the original read plus the work of caching it. Which one is cheaper depends entirely on the shape of the reads. A workload with a small hot set read over and over — which is most workloads, most of the time — is served overwhelmingly by a cache costing a tenth of what the equivalent read capacity would. A workload whose reads are spread evenly over everything has no hot set to cache, and there the replica is the only thing that helps. The question is not "cache or replica", it is "what fraction of the reads are for the same few things", and the answer to that is measurable before anything is bought.',
    scenario:1,
    fixed:{servers:11, web:1},
    brief:'9,000 requests a second, 97% reads, over a 30 GB working set. The application tier is already sized. Decide what sits behind it.',
    thrift:'Both of these take read load off the datastore, and one of them costs several times the other to do it.',
    dials:[
      {id:'cache', label:'Cache nodes', help:'Serves the hot set; a miss still reads the datastore', value:0, options:[
        {value:0, label:'None'}, {value:1, label:'1'}, {value:2, label:'2'}
      ]},
      {id:'replicas', label:'Read replicas', help:'A full copy of the datastore, serving reads', value:0, options:[
        {value:0, label:'None'}, {value:1, label:'1'}, {value:2, label:'2'}, {value:4, label:'4'}
      ]}
    ],
    artifact:{
      title:'The same read load, priced three ways',
      note:'All three of these serve the storm. The bill is the only thing that tells them apart, and it differs by a factor of four.',
      panes:[
        {label:'buy the capacity', code:'primary        1 x  24.0\nread replicas  4 x  24.0\n                   ------\n                    120.0 credits', note:'Every replica is a whole datastore: the same disk, the same memory, the same licence. It serves any read at all, which is exactly what you are paying the premium for.'},
        {label:'cache the hot set', code:'primary        1 x  24.0\ncache nodes    2 x   6.0\n                   ------\n                     36.0 credits', note:'A fraction of the price because it holds a fraction of the data. It works here because the reads are concentrated, and it would be useless against a workload with no hot set.'},
        {label:'what the hit ratio buys', code:'hit ratio   reads reaching the datastore\n  0%          9,000/s   (impossible)\n 50%          4,500/s   (still too many)\n 80%          1,800/s\n 95%            450/s', note:'Read load falls linearly with the hit ratio, so the question worth answering first is what fraction of reads are for the same things. That is measurable on the system you already have.'},
        {label:'what a replica is for', code:'reads spread evenly, no hot set\n  -> cache hit ratio near zero\n  -> the cache is pure overhead\n\nreads must be strongly consistent\n  -> a lagging replica is wrong too', note:'The cache is not the general answer. A uniform access pattern has nothing to cache, and a read that must reflect the last write cannot come from an asynchronous copy of any kind.'}
      ]
    },
    solution:{dials:{cache:2, replicas:1}},
    hints:['Try replicas alone first and read the bill, then cache alone and read the hit ratio. Neither on its own is the cheapest answer, which is the thing worth noticing.','A cache costs about a quarter of a replica and serves only what has been asked for recently. Price the mix: enough cache for the hot set, and the smallest amount of real read capacity behind it.'],
    takeaway:'A cache and a read replica both take load off a datastore, at very different prices, and which is cheaper is decided by how concentrated the reads are. That is a property of the workload you can measure, not a preference.', reference:refs.hash
  },
  {
    id:'keep-the-hot-set-close', kind:'caching', chapter:'System design', concept:'Caching', name:'Keep the hot set close', location:'Archive cache',
    objective:'Keep the archive datastore under 1,800 requests a second, without ever serving a value that has already changed.',
    intro:'Nine thousand reads a second against a datastore that comfortably serves two thousand. The crew reads the same few hundred archive entries over and over, and a handful of records change every second. Buying eight times the datastore is not on the table.',
    lesson:'A cache is a copy, and every copy is a decision about how wrong you are willing to be and for how long. The cheap part to reason about is the hit ratio: a small hot set read over and over is nearly all of the traffic, so even a modest cache takes most of the load off, and a longer window is worth something only because it keeps more of the cold tail. The expensive part is what happens when the original changes. A time-to-live bounds how stale a reader can be — it does not stop them being stale, it just says for how long — while removing the entry as part of the write closes the window entirely, at the cost of a write path that now has two things to get right. Writing through the cache is the other way round: the write pays for both hops and readers are never stale, which is freshness bought with the writer’s time. Writing behind is faster than either and acknowledges a write the datastore has not got yet, so a restart loses it. And keep the time-to-live even when you invalidate, because the invalidation you never notice failing is the one that matters: it is the backstop, not the mechanism.',
    workload:{reads:9000, writes:300, hotFraction:0.8, coldReuse:0.2, storeCapacityRps:2500, storeLatencyMs:20, cacheLatencyMs:1},
    target:{storeRps:1800, stalenessSeconds:0, backstopSeconds:60, writeLatencyMs:20},
    dials:[
      {id:'strategy', label:'How reads and writes use the cache', help:'Where a write goes, and when it is acknowledged', value:'none', options:[
        {value:'none', label:'No cache'},
        {value:'aside', label:'Read around it, write past it'},
        {value:'through', label:'Write through it'},
        {value:'behind', label:'Write behind it'}
      ]},
      {id:'ttl', label:'How long an entry is kept', help:'Longer keeps more of the cold tail', value:5, options:[
        {value:5, label:'5 seconds'}, {value:30, label:'30 seconds'},
        {value:60, label:'60 seconds'}, {value:300, label:'5 minutes'}
      ]},
      {id:'invalidate', label:'When a record is written', help:'What the write does to the cached copy', value:'no', options:[
        {value:'no', label:'Leave the entry to expire'},
        {value:'yes', label:'Remove the entry as well'}
      ]}
    ],
    artifact:{
      title:'The four ways round, and what each one costs',
      note:'Every one of these is in production somewhere and correct there. The differences are in which column you are allowed to be wrong in.',
      panes:[
        {label:'cache-aside', code:'v = cache.get(k)\nif v is None:\n    v = store.get(k)\n    cache.set(k, v, ttl)\nreturn v\n\n# write:\nstore.put(k, v)\ncache.delete(k)', note:'The application owns the cache. A miss costs a datastore read and a cache write, and the delete on the write path is the only thing standing between a reader and a stale value.'},
        {label:'write-through', code:'# write:\ncache.set(k, v)\nstore.put(k, v)      # both, before ack\n\n# read:\nreturn cache.get(k) or store.get(k)', note:'Readers are never stale because the cache is written first and always. The writer waits for both, so every write now carries the latency of the slower of the two.'},
        {label:'the stampede', code:'12:00:00  ttl expires on the hot key\n12:00:00  4,000 readers miss together\n12:00:00  4,000 identical datastore reads\n12:00:02  datastore saturated\n\n(fix: one reader refreshes, the rest\n serve the old value while it does)', note:'A shared hot key with one expiry time is a scheduled outage. Real caches solve it by letting one request through per key and serving the previous value to the rest, or by expiring at slightly different times per reader.'},
        {label:'the cold start', code:'$ systemctl restart archive-cache\n\n  9,300 req/s -> datastore\n  datastore capacity: 2,500 req/s\n\n(the cache was load-bearing and\n nobody had written that down)', note:'A cache that carries 80% of the traffic is a dependency, not an optimisation. Whether the thing behind it can survive losing it is a question worth answering before the restart, not during.'}
      ]
    },
    solution:{dials:{strategy:'aside', ttl:60, invalidate:'yes'}},
    hints:['Work the constraints one at a time. Start with the datastore: which windows get the load under 1,800, and which strategies keep the write path short?','A time-to-live long enough to keep the cold tail leaves a reader stale for that long — unless the write takes the entry out as well. Keep the longest window the backstop rule allows, and close the staleness with the write.'],
    takeaway:'A cache is a copy, and the hard part is never the hit ratio. It is deciding how long a reader may see something that is no longer true, and what the write has to do about it.', reference:refs.caching
  },
  {
    id:'what-the-queue-costs-you', kind:'design', chapter:'System design', concept:'Consistency', name:'What the queue costs you', location:'Data council',
    objective:'Absorb the telemetry write burst inside the latency and budget targets, and work out what each way of doing it costs in guarantees.',
    intro:'Six thousand requests a second, three in five of them writes, against a datastore that was sized for reads. There are two ways to survive this and they are not equivalent: split the data so there is more write capacity, or put a queue in front and tell the writer it is done before it is.',
    lesson:'A queue in front of a datastore is not a capacity increase. It is a change to what an acknowledgement means: before, "written" meant the datastore has it; after, it means something has promised to write it. That promise is usually kept, and the cases where it is not are the ones that matter — a reader who writes and then immediately reads sees the old value, a failover loses whatever had not been drained, and a retry that arrives twice writes twice unless the write carries a key the server can recognise. None of that makes a queue wrong; it makes it a trade, and the trade is worth making when the writer genuinely does not need to know. Sharding is the other answer and it buys throughput honestly: the data is split by key across machines, so write capacity grows with the number of shards and every write is still acknowledged by the datastore that holds it. What it costs is that a query spanning shards now has to visit several of them, and a transaction across shards is a distributed transaction, which is a different and much harder problem. Read what each one takes away before choosing, because a queue that is added for throughput and quietly changes the meaning of a write is how a system ends up with a consistency model nobody chose.',
    scenario:2,
    fixed:{servers:8, web:1, db:1},
    brief:'6,000 requests a second, 60% writes. Decide how the datastore keeps up, and read what each answer does to the guarantee.',
    thrift:'Both of these survive the burst. One of them changes what an acknowledged write means.',
    dials:[
      {id:'shards', label:'Datastore shards', help:'Write capacity grows with the split', value:1, options:[
        {value:1, label:'1'}, {value:2, label:'2'}, {value:4, label:'4'}
      ]},
      {id:'replicas', label:'Read replicas', help:'Copies serving reads, lagging the primary', value:0, options:[
        {value:0, label:'None'}, {value:1, label:'1'}, {value:2, label:'2'}
      ]},
      {id:'queue', label:'Write queue', help:'Acknowledge the write, store it shortly afterwards', value:false, options:[
        {value:false, label:'None'}, {value:true, label:'Fitted'}
      ]}
    ],
    artifact:{
      title:'What an acknowledgement means, three ways',
      note:'The middle column is the one nobody writes down and everybody assumes. Read it before choosing.',
      panes:[
        {label:'straight to the datastore', code:'client -> app -> datastore -> ack\n\n"written" = the datastore has it\nread-your-writes: yes\nlost on failover: nothing', note:'The strongest guarantee and the one that runs out of write capacity first. Every other option on this list is bought by giving part of this up.'},
        {label:'through a queue', code:'client -> app -> queue -> ack\n                   \\-> datastore\n\n"written" = something promised to\nread-your-writes: no\nlost on failover: whatever is queued', note:'A write is acknowledged before it is durable anywhere the reader will look. The window is usually milliseconds, which is exactly why it is missed in testing and found in production.'},
        {label:'sharded', code:'client -> app -> shard(key) -> ack\n\n"written" = that shard has it\nread-your-writes: yes\ncross-shard query: visits several\ncross-shard transaction: hard', note:'Throughput bought honestly: more machines, same guarantee per key. The cost moves to queries that span keys, and to any operation that has to be atomic across two shards.'},
        {label:'making a retry safe', code:'PUT /readings/{sensor}/{timestamp}\n  idempotency-key: 7f3c...\n\nserver records the key, second\narrival returns the first answer', note:'A queue means at-least-once delivery, so a write may arrive twice. A key the server remembers turns "at least once" into "exactly once" as far as anybody can tell, which is the only version of exactly-once that exists.'}
      ]
    },
    solution:{dials:{shards:4, replicas:1, queue:false}},
    hints:['Try the queue on its own first, and read both what it fixes and what the consistency line underneath says afterwards. Then try splitting the data instead.','Write capacity grows with the shards, and the reads still have to come from somewhere. Find the combination that meets every target without changing what an acknowledged write means.'],
    takeaway:'A queue in front of a datastore does not add capacity, it changes what an acknowledgement means. Sharding buys throughput without touching the guarantee, and pays for it in queries and transactions that span shards.', reference:refs.cap
  },
  {
    id:'when-the-queue-never-drains', kind:'queue', chapter:'System design', concept:'Queues & backpressure', name:'When the queue never drains', location:'Telemetry intake',
    objective:'Absorb a twenty-minute telemetry burst without losing a reading, and be empty again by the end of the hour — with the fewest workers and the smallest buffer that manage it.',
    intro:'Every sensor on the station reports at once during a thermal sweep: eighteen thousand readings a minute for twenty minutes, against the three thousand a minute the intake normally sees. Nothing may be dropped. The sweep happens twice a day.',
    lesson:'A queue between a fast producer and a slow consumer does not make the consumer faster. It converts "refuse this work" into "do this work later", and the only question that matters is whether later ever arrives. If the consumers can drain faster than the long-run average arrival rate, a queue absorbs a burst and empties afterwards, and its depth is the burst you were able to smooth. If they cannot, the queue is not absorbing anything — it is hiding a shortfall, growing until it runs out of memory or of patience, and the readings at the back are so old by the time they are processed that nobody wants them. That is why a bigger buffer is rarely the fix: it moves the moment you start dropping things without changing whether you will. The buffer is sized for the backlog a burst actually builds, and the consumers are sized for the average. What happens when the buffer does fill is the other half of the design: shedding load loses the newest work, blocking pushes the problem back to the producer, and for a sensor that has nowhere to put a reading those are the same thing.',
    serviceRatePerWorker:50, minutes:60,
    burst:{minutes:20, perMinute:18000, afterPerMinute:3000},
    target:{maxWaitSeconds:900},
    dials:[
      {id:'workers', label:'Intake workers', help:'Each handles 50 readings a second, all day', value:1, options:[
        {value:1, label:'1'}, {value:2, label:'2'}, {value:3, label:'3'}, {value:4, label:'4'}, {value:6, label:'6'}
      ]},
      {id:'capacity', label:'Buffer size', help:'Readings held before the intake starts dropping them', value:20000, options:[
        {value:20000, label:'20,000'}, {value:60000, label:'60,000'},
        {value:150000, label:'150,000'}, {value:400000, label:'400,000'}
      ]}
    ],
    artifact:{
      title:'A backlog, and what it is telling you',
      note:'The shape of the graph is the diagnosis. Read where it turns over, or whether it does.',
      panes:[
        {label:'absorbing a burst', code:'depth  ▁▂▄▆█▇▅▃▂▁▁▁▁▁\n       └ burst ┘└ drain ┘\n\npeak 120k, empty after 38 minutes', note:'It goes up, it turns over, it comes back. The peak is the burst you smoothed and the area under it is work that would otherwise have been refused.'},
        {label:'hiding a shortfall', code:'depth  ▁▂▃▄▅▆▇███████\n       └ burst ┘\n\nstill climbing an hour later', note:'No turn-over. The consumers are slower than the producers on average, so the queue is a buffer between now and never — and every reading in it is getting older.'},
        {label:'the age of the work', code:'queue depth        180,000\ndrain rate           3,000/min\n\noldest item age       60 min\n\n(a telemetry reading nobody\n will look at)', note:'Depth divided by drain rate is how long the thing at the back has been waiting. It is the number worth alerting on, because a queue is only useful while what comes out of it is still wanted.'},
        {label:'what a full buffer does', code:'shed   : drop the newest, keep serving\nblock  : stop accepting, push it upstream\ngrow   : take it all, run out of memory\n\n(a sensor that is blocked and a\n reading that is shed are the\n same lost reading)', note:'Backpressure only helps when the producer can do something useful with it — slow down, batch, buffer locally. A sensor reporting in real time cannot, so for this intake blocking and shedding lose exactly the same data.'}
      ]
    },
    solution:{dials:{workers:4, capacity:150000}},
    hints:['Work out the arrival rate and the drain rate per minute first. The burst delivers 18,000 a minute; each worker drains 3,000. Then ask what the difference is, multiplied by twenty minutes.','The burst leaves a backlog of the shortfall times its length, and the workers have the rest of the hour to clear it. Size the buffer for the backlog that actually builds, and the workers for what has to drain it in time.'],
    takeaway:'A queue absorbs a burst and hides a shortfall, and the graph tells you which. Workers are sized for the average rate, the buffer for the peak backlog — and a bigger buffer only changes when you start losing things, never whether you do.', reference:refs.queues
  },
  {
    id:'the-retry-that-made-it-worse', kind:'retry', chapter:'System design', concept:'Retries & failure', name:'The retry that made it worse', location:'Incident bridge',
    objective:'Get 85% of the calls answered without ever offering the dependency more than it can serve — and with nothing in the call path that is not earning its place.',
    intro:'The catalogue service is up. It is answering four calls in five and failing the fifth for no reason anybody can find, and it has been like that for ten minutes. Eighteen hundred callers a second, against a service that can serve two thousand. Then somebody turns retries on.',
    lesson:'A transient failure that is never retried is simply a failure, so retrying is right. The trouble is that every caller decides to retry at the same moment, for the same reason, and the load on the thing that was already struggling goes up rather than down. Three attempts each turns eighteen hundred callers into five thousand four hundred, and a dependency that was failing one call in five starts failing all of them — at which point everybody retries again. That is a retry storm, and the retry is the outage. Backing off spreads one caller’s attempts over time and does nothing about all the callers being in step with each other; adding jitter spreads them across the callers as well, which is the part that actually breaks the wave. A retry budget — a cap on what fraction of your traffic may be retries — is the version of this that holds under pressure. A circuit breaker is a different tool for a different failure: it is for a dependency that is down, where failing fast is better than waiting, and it earns nothing against one that is up and flaky, because what it refuses is work that would have succeeded.',
    dependency:{callers:1800, dependencyCapacity:2000, failureRate:0.2},
    target:{successRate:0.85, attempts:3},
    dials:[
      {id:'policy', label:'When a call fails', help:'Whether to try again, and when', value:'immediate', options:[
        {value:'none', label:'Give up'},
        {value:'immediate', label:'Try again at once'},
        {value:'backoff', label:'Wait longer each time'},
        {value:'jitter', label:'Wait longer, by a random amount'}
      ]},
      {id:'attempts', label:'Attempts per call', help:'Including the first one', value:'3', options:[
        {value:'1', label:'1'}, {value:'3', label:'3'}, {value:'5', label:'5'}
      ]},
      {id:'breaker', label:'Circuit breaker', help:'Stop calling while the dependency looks unhealthy', value:'no', options:[
        {value:'no', label:'None'}, {value:'yes', label:'Fitted'}
      ]}
    ],
    artifact:{
      title:'The same ten minutes, from both sides',
      note:'The graph on the dependency and the graph on the caller are the same incident. Only one of them looks like a retry problem.',
      panes:[
        {label:'what the caller saw', code:'12:01  errors 20%, p99 40ms\n12:02  retries enabled\n12:03  errors 61%, p99 2,400ms\n12:06  errors 94%\n\n"the retries are not working"', note:'From the caller’s side it looks like the dependency got dramatically worse the moment retries were turned on. It did — and the retries are why.'},
        {label:'what the dependency saw', code:'12:01  1,800 rps   0.9x capacity\n12:02  3,100 rps   1.6x\n12:03  5,400 rps   2.7x\n12:06  5,400 rps   2.7x  (ceiling:\n       every caller at max attempts)', note:'Offered load tripled without a single new user arriving. The ceiling is callers times attempts, which is the one comforting thing about a retry storm: it is bounded, and the bound is a number you chose.'},
        {label:'jitter', code:'no jitter:   all retries at t+1s\n             ▁▁█▁▁▁▁█▁▁▁▁█▁▁\n\nwith jitter: spread over t+0..2s\n             ▁▃▄▃▄▃▄▃▄▃▄▃▄▃▁', note:'Backoff decides when one caller tries again. Jitter decides that two callers do not choose the same moment. Without it, exponential backoff produces a slower, larger wave rather than no wave.'},
        {label:'a retry budget', code:'retries must stay under 10% of\nrequests, measured over a window\n\nover budget -> retries are dropped,\n               the original error\n               is returned', note:'The version that holds under pressure. It caps the amplification at 1.1x whatever the policy does, and it fails in the direction of the dependency staying up rather than the caller getting an answer.'}
      ]
    },
    solution:{dials:{policy:'jitter', attempts:'3', breaker:'no'}},
    hints:['Try giving up first and read the success rate, then try retrying at once and read the load. Neither target is met by either, and they fail in opposite directions.','Backing off spreads one caller’s attempts. Something has to spread the callers apart from each other as well. And once both targets are met, take out whatever is not needed to meet them.'],
    takeaway:'A retry is the correct response to a transient failure and the usual cause of the outage that follows it. What makes it safe is spreading retries across callers as well as across time, and capping what fraction of your traffic they are allowed to be.', reference:refs.retries
  },
  {
    id:'two-of-everything', kind:'design', chapter:'System design', concept:'Availability', name:'Two of everything', location:'Telemetry wall',
    objective:'Keep life support answering to four nines, within the latency budget and for the fewest credits a month.',
    intro:'Four thousand requests a second, and an availability target of 99.99% — fifty-two minutes of downtime a year, for everything in the path together. One of anything will not do it, and two of everything costs more than the budget allows.',
    lesson:'Availability composes by multiplication, and that is unforgiving. A chain of four components at 99.9% each is 99.6% together, because every one of them can take the whole thing down. Redundancy turns that multiplication into its complement: two independent copies of a component that is available 99.9% of the time are both down only 0.1% of 0.1% of the time, so the pair is 99.9999%. The word doing the work there is independent. Two instances in the same rack share a power feed; two racks in the same building share a roof; two regions share a deployment pipeline and whoever pushed to it this morning. Each layer of separation buys another nine and costs more than the last, so the design is a question of which correlated failure you are actually trying to survive and what you are prepared to pay to survive it. And redundancy is not free in latency either: a second region means a write that has to reach both before it is acknowledged, or one that does not and can be lost.',
    scenario:3,
    fixed:{servers:6, web:0, cache:0},
    brief:'4,000 requests a second and a 99.99% availability target. The application tier is sized. Decide what redundancy sits behind it.',
    thrift:'Every nine costs more than the one before it, and one of them is bought twice over here.',
    dials:[
      {id:'regions', label:'Regions', help:'A second site, with everything that means', value:1, options:[
        {value:1, label:'One'}, {value:2, label:'Two'}
      ]},
      {id:'replicas', label:'Read replicas', help:'Copies of the datastore that can take over', value:0, options:[
        {value:0, label:'None'}, {value:1, label:'1'}, {value:2, label:'2'}, {value:4, label:'4'}
      ]},
      {id:'shards', label:'Datastore shards', help:'How the data is split across machines', value:1, options:[
        {value:1, label:'1'}, {value:2, label:'2'}, {value:4, label:'4'}
      ]}
    ],
    artifact:{
      title:'What each nine actually costs',
      note:'The multiplication is the whole of it. Read the second pane and then look at the first again.',
      panes:[
        {label:'in series', code:'load balancer  99.99%\napplication    99.95%\ndatastore      99.90%\nnetwork        99.99%\n               -------\n  together     99.83%   (15 hours a year)', note:'Four components that each look healthy, multiplied together. Nobody sets out to build a 99.83% system; it is what you get by not doing the multiplication.'},
        {label:'in parallel', code:'one datastore     99.90%   (8.8 h/yr)\ntwo, independent  99.9999% (32 s/yr)\n\n  1 - (0.001 x 0.001)', note:'Redundancy multiplies the failure probabilities instead of the success ones, which is why one extra copy is worth three nines and the next one is worth much less.'},
        {label:'the word independent', code:'same host      : shares a kernel\nsame rack      : shares power, a switch\nsame building  : shares a roof, an ISP\nsame region    : shares a control plane\nsame pipeline  : shares this morning\x27s deploy', note:'The multiplication only holds if the failures are unrelated, and they are related far more often than the diagram suggests. The last line is the one that takes out both regions at once, and no amount of hardware helps.'},
        {label:'what it costs in latency', code:'write to one region      2 ms\nwrite to both, acked     +80 ms\nwrite to both, async     2 ms\n  (and the second region\n   is behind by 80 ms)', note:'Two regions is a choice about writes as much as about uptime: wait for both and every write pays the distance, or do not and accept that a failover loses whatever had not arrived.'}
      ]
    },
    solution:{dials:{regions:2, replicas:1, shards:2}},
    hints:['Work out what a single datastore does to the whole chain before adding anything. Availability multiplies along the path, so the weakest component sets the ceiling for everything.','Two of the datastore is worth three nines and the third copy is worth almost nothing. Spend the rest on the thing that is still a single point of failure, and check the bill against the budget.'],
    takeaway:'Availability multiplies along a path and complements across redundancy, so one extra independent copy buys almost everything and the next buys almost nothing. The hard word is independent, and it is usually less true than the diagram suggests.', reference:refs.slo
  },
  {
    id:'the-budget-you-spend', kind:'budget', chapter:'System design', concept:'Error budgets', name:'The budget you spend', location:'Reliability review',
    objective:'Work out what is left of the month’s error budget, then decide whether the risky change ships.',
    intro:'The archive service promises 99.9% over thirty days. Three things went wrong this month. Someone wants to ship a storage migration on the 24th.',
    lesson:'An availability objective is not a promise to be perfect; it is a licence to be unavailable for a stated amount of time. 99.9% over thirty days is 43.2 minutes. That licence is a budget, and it is meant to be spent: a team with budget to spare is being too careful, and a team with none is not allowed to take risks. A partial outage spends part of the budget — half the users down for twenty-six minutes costs thirteen minutes, not twenty-six. What makes this a policy rather than a metric is that the number decides something in advance: with budget left, risky changes ship; with three quarters gone, the reliability work goes first; with none left, nothing risky ships until the window rolls over. Agreeing to that before the outage is the entire point, because afterwards everyone has an opinion.',
    objectiveTarget:0.999,
    windowMinutes:43200,
    incidents:[
      {date:'2 Mar', name:'Datastore failover took longer than expected', minutes:18, share:1},
      {date:'9 Mar', name:'Uplink degraded — half of users affected', minutes:26, share:0.5},
      {date:'21 Mar', name:'Cache restart, reads fell through to the datastore', minutes:4, share:1}
    ],
    remainingOptions:[
      {value:1.2, label:'about 1 minute'},
      {value:8.2, label:'about 8 minutes'},
      {value:22.4, label:'about 22 minutes'},
      {value:35, label:'about 35 minutes'}
    ],
    dials:[
      {id:'remaining', label:'Error budget left in this window', help:'Allowed downtime, minus what the incidents spent', value:35, options:[
        {value:1.2, label:'about 1 minute'},
        {value:8.2, label:'about 8 minutes'},
        {value:22.4, label:'about 22 minutes'},
        {value:35, label:'about 35 minutes'}
      ]},
      {id:'action', label:'The storage migration on the 24th', help:'What the policy says happens next', value:'ship', options:[
        {value:'ship', label:'Ship it — there is budget'},
        {value:'slow-down', label:'Hold it — reliability work first'},
        {value:'freeze', label:'Freeze — nothing risky until April'}
      ]}
    ],
    artifact:{
      title:'What an error budget policy actually says',
      note:'None of this is interesting during a good month. It is written down so that during a bad one, nobody has to win an argument.',
      panes:[
        {label:'the SLO', code:'objective: 99.9% of requests succeed\nwindow:    30 days, rolling\nmeasured:  at the load balancer,\n           5xx and >2s count as failures', note:'Where it is measured matters as much as the number. Measured on the server, an outage that never reached the server never happened.'},
        {label:'the budget', code:'30 days           = 43,200 min\n0.1% of that      = 43.2 min\nspent so far      = 35.0 min  (81%)\nremaining         =  8.2 min', note:'The same month reads as "99.92% — fine" or "81% of the budget gone" depending on which number you put on the slide.'},
        {label:'the policy', code:'budget remaining  > 25%: ship freely\nbudget remaining <= 25%: reliability\n  work takes priority; risky changes\n  wait for the window to roll\nbudget exhausted: change freeze,\n  except fixes that buy budget back', note:'A threshold agreed in advance, so the decision is arithmetic rather than seniority.'},
        {label:'partial outages', code:'26 min × 50% of users = 13 min\n18 min × 100%         = 18 min\n 4 min × 100%         =  4 min\n                        ------\n                        35 min', note:'Weighting by the fraction of users affected is what stops a degraded region being scored the same as a total outage.'}
      ]
    },
    solution:{dials:{remaining:8.2, action:'slow-down'}},
    hints:['0.1% of 43,200 minutes is 43.2 minutes of allowed downtime. The 9 March incident affected half the users, so it spends half its minutes.','35 of 43.2 minutes is 81% of the budget. Read the policy pane: what happens past three quarters?'],
    takeaway:'“We were up 99.92%” and “we have spent four fifths of the month’s budget” describe the same month and lead to opposite decisions. The budget is the one that tells you what to do next.', reference:refs.errorBudget
  },
  {
    id:'bring-it-back', kind:'incident', chapter:'System design', concept:'Diagnosis', name:'Bring it back', location:'Incident bridge',
    objective:'The archive service is down and the design in front of you is the one that is running. Find the tier that is saturated and fix only that.',
    intro:'This is not a blank page. It is a design that worked last week, a maintenance window last night, and a service that has been failing since 04:12. Read the meters before you buy anything.',
    lesson:'An incident is a diagnosis problem, and the temptation is to change everything at once. The utilisation bars say which tier is the problem: a tier above 100% is receiving more work than it can serve, so its queue grows without limit and latency is not a number any more. Everything downstream of it looks fine, because nothing is reaching it. Two rules keep a repair honest. Change the saturated tier and nothing else, so that when it recovers you know why. And read the cost line — an outage is not a licence to buy capacity you will still be paying for next quarter, which is why this repair has a credit cap tighter than the contract’s.',
    instructions:'Read the utilisation bars, then change what they point at. The repair has to come in under the credit cap.',
    scenario:1,
    maxCost:61,
    dials:[
      {id:'servers', label:'Edge nodes', help:'How many request-handling nodes', value:11, options:[
        {value:9, label:'9 nodes'},
        {value:11, label:'11 nodes'},
        {value:14, label:'14 nodes'},
        {value:18, label:'18 nodes'}
      ]},
      {id:'web', label:'Edge node size', help:'Requests each node can serve', value:1, options:[
        {value:0, label:'Edge node S · 400 rps'},
        {value:1, label:'Edge node M · 900 rps'},
        {value:2, label:'Edge node L · 2k rps'}
      ]},
      {id:'db', label:'Datastore size', help:'Reads and writes the primary can serve', value:0, options:[
        {value:0, label:'Datastore S · 1.5k reads/s'},
        {value:1, label:'Datastore M · 4k reads/s'},
        {value:2, label:'Datastore L · 6k reads/s'}
      ]},
      {id:'cache', label:'Cache', help:'How much of the working set stays out of the datastore', value:0, options:[
        {value:0, label:'No cache'},
        {value:1, label:'Cache 8 GB'},
        {value:2, label:'Cache 32 GB'},
        {value:3, label:'Cache 128 GB'}
      ]},
      {id:'replicas', label:'Read replicas per shard', help:'Extra read capacity, and a second copy to fail over to', value:1, options:[
        {value:0, label:'None'},
        {value:1, label:'1 replica'},
        {value:2, label:'2 replicas'},
        {value:4, label:'4 replicas'}
      ]}
    ],
    artifact:{
      title:'The page, and what was on the dashboard',
      note:'Everything here is real evidence from the incident. One pane names the cause outright; the others are what you would actually have looked at first.',
      panes:[
        {label:'the page', code:'04:12 ARCHIVE-READ-LATENCY critical\n  p99 unavailable (queue unbounded)\n  error rate 61%\n  duration 00:47 and counting', note:'“Latency unavailable” rather than a large number is the signature of a saturated tier: the queue has no steady state to measure.'},
        {label:'utilisation', code:'edge nodes        91%\ndatastore reads  291%   ← here\ndatastore writes  14%', note:'One tier above 100%. Everything downstream looks healthy because almost nothing is getting through to it.'},
        {label:'change log', code:'23:40  cache tier drained for\n       maintenance window\n23:55  maintenance completed\n00:02  cache tier NOT restored\n       (checklist step skipped)', note:'Read loads returned to the datastore that had not been sent there in months. Nothing failed; something was left off.'},
        {label:'what not to do', code:'-  "add edge nodes"   → 91%, not the\n   bottleneck; costs credits, fixes\n   nothing\n-  "buy Datastore L"  → works, and\n   pays for capacity the cache makes\n   unnecessary\n-  "replicas: 4"      → over budget', note:'Three plausible changes that each make the graph look busy and the bill look worse. The bars already said which tier to touch.'}
      ]
    },
    solution:{dials:{servers:11, web:1, db:0, cache:2, replicas:1}},
    hints:['Only one bar is over 100%. Adding capacity anywhere else spends credits and changes nothing.','The change log says what was removed. Put it back — and the datastore does not also need to grow once the reads stop reaching it.'],
    takeaway:'The meters name the tier; the change log names the cause. A repair that changes one thing tells you whether you were right, and a repair that changes five does not.', reference:refs.incident
  }
];

export const chapters = [...new Set(levels.map(level => level.chapter))];
