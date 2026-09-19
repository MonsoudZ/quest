// Mission content. Four chapters: programming in a JavaScript subset, computer
// science fundamentals, networking, and system design. Every mission carries the
// solution the tests check, so no mission can ship unsolvable.
const row = (x, y, n) => Array.from({length:n}, (_, i) => [x + i, y]);
const column = (x, y, n) => Array.from({length:n}, (_, i) => [x, y + i]);
const ramp = (n, step) => Array.from({length:n}, (_, i) => i * step);

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
  records:{label:'Reference: MDN — working with objects', url:'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Working_with_objects'},
  offByOne:{label:'Reference: the off-by-one error', url:'https://en.wikipedia.org/wiki/Off-by-one_error'},
  nested:{label:'Reference: MDN — indexing nested arrays', url:'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Indexed_collections'},
  lexing:{label:'Reference: lexical analysis', url:'https://en.wikipedia.org/wiki/Lexical_analysis'},
  precedence:{label:'Reference: MDN — operator precedence', url:'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Operator_Precedence'},
  syntax:{label:'Reference: comparison of programming languages (syntax)', url:'https://en.wikipedia.org/wiki/Comparison_of_programming_languages_(syntax)'}
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
  // ------------------------------------------- chapter 2: computer science
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
    id:'restore-the-order', kind:'sort', chapter:'Computer science', concept:'Arrays & sorting', name:'Restore the order', location:'Archive index',
    objective:'Sort the entries from smallest to largest with adjacent swaps.',
    intro:'The archive index is scrambled. Reorder its entries by swapping neighbouring values.',
    lesson:'An array is an ordered sequence of entries; JavaScript array indices start at 0. This puzzle permits any adjacent swap. Bubble sort is a particular algorithm: scan adjacent pairs in order, swap out-of-order pairs, and repeat passes until sorted.',
    values:[7,2,9,4,1],
    hints:['Try moving the largest value right by swapping it past smaller neighbours.','The final order is 1, 2, 4, 7, 9. Move 9 to the end, then work on the earlier entries.'], solution:[1,2,4,7,9],
    takeaway:'You sorted an array with adjacent swaps. Following a systematic left-to-right pass repeatedly gives bubble sort, which has quadratic worst-case time. Arbitrary swaps need not follow that algorithm.', reference:refs.sort
  },
  {
    id:'hash-it-out', kind:'hash', chapter:'Computer science', concept:'Hash tables', name:'Somewhere to put it', location:'Index memory',
    objective:'Choose a table size and multiplier that give all seven station IDs their own slot.',
    intro:'Seven station IDs need to be found in one step. A hash function turns a key into a slot number; when two keys land in the same slot, the lookup has to search the chain.',
    lesson:'A hash table computes a slot from the key: slot = (key × multiplier) mod size. Lookup is one step when the slot holds one key, so collisions are what cost time. Six of these IDs are multiples of 10, so a size of 10 sends all six to slot 0, and multiplying first does not help, because a multiple of 10 stays a multiple of 10. A size of 8 or 12 shares factors with the keys and still stacks some of them together. Only a size that shares no factor with them spreads them out, which is why real implementations prefer prime table sizes and keep the load factor well under 1.',
    keys:[10,20,30,40,50,60,84], maxSlots:13, maxChain:1,
    dials:[
      {id:'size', label:'Table size (slots)', help:'How many slots the memory bank provides', value:10, options:[{value:8, label:'8 slots'},{value:10, label:'10 slots'},{value:12, label:'12 slots'},{value:13, label:'13 slots (prime)'},{value:16, label:'16 slots'}]},
      {id:'multiplier', label:'Hash multiplier', help:'The key is multiplied before the remainder is taken', value:1, options:[{value:1, label:'× 1'},{value:3, label:'× 3'}]}
    ],
    solution:{dials:{size:13, multiplier:1}},
    hints:['Work out (key mod size) for each ID. A size that shares a factor with the keys sends several of them to the same slot, and the multiplier cannot undo that.','13 is prime, so it shares no factor with any of these IDs. Try 13 slots.'],
    takeaway:'Average lookup is one step only while collisions stay rare. That depends on the relationship between your keys and your table size, not on the speed of the machine.', reference:refs.hash
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

  // ----------------------------------------------------- chapter 3: networking
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
    solution:{dials:{ops:25, labs:26, dock:27, bridge:29}},
    hints:['Work out the smallest prefix for each deck on its own: 100 hosts, 50 hosts, 20 hosts, 6 hosts.','/25 holds 126, /26 holds 62, /27 holds 30, /29 holds 6. Together that is 232 of the 256 addresses.'],
    takeaway:'Fixed-size subnets would have wasted most of this /24. Sizing each block to its deck left 24 addresses spare for the next one.', reference:refs.cidr
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
    solution:[4,3,2,1,0],
    hints:['For each destination, find every prefix that contains it, then keep the one with the largest prefix length.','10.20.30.64/26 covers .64 to .127, so .70 is inside it but .9 is not. Only 203.0.113.7 falls through to the default route.'],
    takeaway:'Longest prefix match is the whole forwarding decision. Adding a more specific route changes where traffic goes without touching any other line in the table.', reference:refs.routers
  },
  {
    id:'window-of-opportunity', kind:'transport', chapter:'Networking', concept:'Sliding windows', name:'Fill the pipe', location:'Relay uplink',
    objective:'Send 8 MiB across a 50 Mbps, 200 ms link in under 2 seconds.',
    intro:'The link is fast and the distance is long. Sending one packet and waiting for its acknowledgement wastes almost all of the capacity.',
    lesson:'A sender may keep a window of unacknowledged data in flight. The amount that fits in the network at once is the bandwidth-delay product: capacity × round-trip time, here 50 Mbps × 0.2 s = 1.25 MB, about 857 packets. With a smaller window the sender runs out of permission and waits for an acknowledgement while the link sits idle. Beyond one bandwidth-delay product the window is no longer the limit, so nothing more is gained; in a real network an oversized window fills router queues and adds delay, which this model does not simulate.',
    link:{rttMs:200, capacityMbps:50, mss:1460, lossEvery:0}, bytes:8388608, target:{seconds:2},
    dials:[{id:'window', label:'Send window', help:'Unacknowledged packets allowed in flight', value:32, options:[{value:32, label:'32 packets'},{value:128, label:'128 packets'},{value:512, label:'512 packets'},{value:857, label:'857 packets (one BDP)'},{value:2048, label:'2,048 packets'}]}],
    solution:{dials:{window:857}},
    hints:['Work out how much data fits in the link at once: 50 Mbps for 200 ms. Then divide by the 1,460-byte packet size.','One bandwidth-delay product is about 857 packets. A 512-packet window still leaves the link waiting.'],
    takeaway:'Throughput on a long link is set by the window, not by the bandwidth. Until the window covers one bandwidth-delay product, most of the capacity you are paying for is idle.', reference:refs.tcp
  },
  {
    id:'lost-in-transit', kind:'transport', chapter:'Networking', concept:'Reliable delivery', name:'Lost in transit', location:'Deep-space array',
    objective:'Deliver 8 MiB over a lossy link within 2.6 seconds while retransmitting under 10% of it.',
    intro:'This link drops a packet every so often. Delivery still has to be complete, so anything lost must be sent again — the question is how much else goes with it.',
    lesson:'Reliability comes from acknowledgements and retransmission: the sender keeps data until the receiver confirms it, and a timeout means resend. What gets resent is the protocol’s choice. Go-Back-N acknowledges cumulatively, so a single loss makes the sender repeat every packet from the lost one onward, including ones that already arrived. Selective repeat acknowledges packets individually and resends only what was lost, at the cost of tracking each one. Both deliver the same bytes; they differ in how much of the link they waste doing it.',
    link:{rttMs:200, capacityMbps:50, mss:1460, lossEvery:256}, bytes:8388608, target:{seconds:2.6, wasted:0.1},
    dials:[
      {id:'window', label:'Send window', value:512, options:[{value:512, label:'512 packets'},{value:857, label:'857 packets (one BDP)'},{value:2048, label:'2,048 packets'}]},
      {id:'protocol', label:'Recovery strategy', value:'go-back-n', options:[{value:'go-back-n', label:'Go-Back-N'},{value:'selective-repeat', label:'Selective repeat'}]}
    ],
    solution:{dials:{window:2048, protocol:'selective-repeat'}},
    hints:['Two targets bind here. The deadline needs a window large enough to keep sending through the gaps left by recovery; the waste limit is about which packets get resent.','A 2,048-packet window meets the deadline. Go-Back-N then resends about half of everything, so selective repeat is the one that stays under 10%.'],
    takeaway:'A loss rate of well under 1% cost either 0.4% or 49% of the link, depending only on which packets the protocol chose to resend.', reference:refs.tcp
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
    solution:{order:['syn','synack','hello','server-hello','request','response'], dials:{connection:'reused'}},
    hints:['Handshakes happen bottom-up: the transport connection exists before TLS can negotiate on it, and TLS finishes before an encrypted request can be sent.','Three round trips is 360 ms, so a new connection cannot make 150 ms. Reuse the connection and only the request and response remain: 120 ms.'],
    takeaway:'Round trips, not bandwidth, decide time to first byte. Every handshake you can avoid is a whole round trip saved.', reference:refs.tls
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
    id:'one-address-many-decks', kind:'nat', chapter:'Networking', concept:'Address translation', name:'One address, many decks', location:'Station border router',
    objective:'The station has one public address. Let the replies home, keep the probes out, and publish only what has to be public.',
    intro:'Forty devices inside, one address outside. The border router makes that work by rewriting every packet on the way out and remembering what it did.',
    lesson:'Source NAT rewrites the private source address to the router’s public one and picks a fresh source port for each flow. That port is the whole trick: two hosts can talk to the same server on the same port and still be told apart, because the router gave each flow a different outside port. Replies match the table and are rewritten back. An unsolicited inbound packet matches nothing — the router has no idea which of forty devices it was meant for — so it is dropped. That is why a device behind NAT is unreachable from outside by default, and why publishing a service means adding a forward. A forward is not a small thing: it opens that port to everyone who can find the address, not only to the people you had in mind.',
    publicAddress:'198.51.100.2',
    flows:[
      {direction:'out', source:'10.20.0.10', sourcePort:51000, destination:'203.0.113.9', destinationPort:443, name:'Crew console → weather service', expect:true},
      {direction:'out', source:'10.20.0.11', sourcePort:51000, destination:'203.0.113.9', destinationPort:443, name:'Second console → weather service', expect:true},
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
    dials:[{id:'forward', label:'Published ports', help:'What the outside world is allowed to start a connection to', value:'none', options:[
      {value:'none', label:'Publish nothing'},
      {value:'ssh', label:'Publish 22 → console'},
      {value:'web', label:'Publish 80 → portal'},
      {value:'both', label:'Publish 22 and 80'}
    ]}],
    artifact:{
      title:'The same two flows, three ways to look at them',
      note:'Two consoles are talking to the same server on the same port. Only the translation table tells them apart.',
      panes:[
        {label:'conntrack', code:'tcp 6 431999 ESTABLISHED\n  src=10.20.0.10 dst=203.0.113.9 sport=51000 dport=443\n  src=203.0.113.9 dst=198.51.100.2 sport=443 dport=49152\ntcp 6 431998 ESTABLISHED\n  src=10.20.0.11 dst=203.0.113.9 sport=51000 dport=443\n  src=203.0.113.9 dst=198.51.100.2 sport=443 dport=49153', note:'Each entry is a flow the router started. The second line of each pair is the same flow as the outside world sees it — same private port, different public one.'},
        {label:'what the server sees', code:'198.51.100.2:49152 → GET /forecast\n198.51.100.2:49153 → GET /forecast', note:'Two customers, one address. The server cannot tell there are forty devices behind it, which is both the point and the problem.'},
        {label:'the dropped probe', code:'IN=eth0 SRC=198.51.100.7 DST=198.51.100.2\n  PROTO=TCP SPT=40112 DPT=22 SYN\n  → no conntrack entry, no forward: DROP', note:'Nothing inside started a flow on port 22, so there is no row to match and nowhere to send it.'}
      ]
    },
    solution:{dials:{forward:'web'}},
    hints:['Replies are already handled: the router remembers the flows it started, so nothing needs publishing for them.','The portal is meant to be public and the console’s SSH is not. Publishing a port opens it to the whole internet, so publish the fewest that meet the requirement.'],
    takeaway:'NAT gives you one address and, as a side effect, a default-closed border. That side effect is not a security model — it is an accident of having nothing to match — but the decision it forces, publish only what must be public, is a real one.', reference:refs.nat
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
        {value:'fixed-16', label:'Fixed · 16 packets'},
        {value:'fixed-64', label:'Fixed · 64 packets'},
        {value:'fixed-274', label:'Fixed · 274 packets'},
        {value:'fixed-512', label:'Fixed · 512 packets'},
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
    hints:['Try each fixed window on both links and read the two bars. One window is too small for the spine; another is fast on the relay but throws away most of what it sends.','No single fixed number meets both targets, which is the point: the sender has to discover the path rather than assume it.'],
    takeaway:'A window tuned to a path is a guess that stops being true the moment the path changes. Slow start trades a few round trips at the beginning for being right on every link, which is why it is what actually runs.', reference:refs.congestion
  },

  // -------------------------------------------------- chapter 4: system design
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
  },
  {
    id:'back-of-the-envelope', kind:'quiz', chapter:'System design', concept:'Estimation', name:'Back of the envelope', location:'Planning deck',
    objective:'Size the station’s service from user numbers alone.',
    intro:'Before choosing any hardware, you need to know roughly how much work arrives and how much data piles up. Rough is enough: the point is the right order of magnitude.',
    lesson:'Capacity estimation is arithmetic you can do without a calculator. Requests per second is daily requests divided by 86,400 seconds, and real traffic peaks well above its average, so design for the peak. Storage is requests × bytes each, multiplied by retention and by replication. Machine count follows from the peak rate divided by what one machine serves — plus enough spare that losing one machine does not take the service with it.',
    instructions:'4.3 million daily active users, 20 requests each per day, peaking at four times the daily average.',
    questions:[
      {prompt:'What peak request rate should the design target?', options:[{label:'about 400 per second'},{label:'about 1,000 per second'},{label:'about 4,000 per second'},{label:'about 40,000 per second'}], answer:2, why:'4.3M × 20 = 86M requests a day. 86M ÷ 86,400 ≈ 1,000 per second average, and the peak is four times that.'},
      {prompt:'Each request writes a 2 KB log line. How much log data per day?', options:[{label:'about 17 GB'},{label:'about 172 GB'},{label:'about 1.7 TB'},{label:'about 17 TB'}], answer:1, why:'86M × 2 KB ≈ 172 GB per day.'},
      {prompt:'You keep 30 days of those logs, stored in triplicate. How much storage?', options:[{label:'about 5 TB'},{label:'about 15 TB'},{label:'about 155 TB'},{label:'about 1.5 PB'}], answer:1, why:'172 GB × 30 days × 3 copies ≈ 15.5 TB.'},
      {prompt:'One node serves 2,000 requests per second. How many do you run, if losing a node must not drop traffic?', options:[{label:'two'},{label:'three'},{label:'four'},{label:'eight'}], answer:1, why:'Two nodes cover the 4,000 peak exactly, so a third is what makes a single failure survivable.'}
    ],
    quizSuccess:'That is the whole envelope: peak rate, data per day, retention, and the node count that survives a failure.',
    solution:[2,1,1,1],
    hints:['There are 86,400 seconds in a day. Work out the average rate first, then multiply by the peak factor.','86M requests a day is about 1,000 per second average and 4,000 at peak; 172 GB of logs a day; 15.5 TB for 30 days in triplicate; three nodes so one can fail.'],
    takeaway:'These four numbers decide the shape of a design before any technology is chosen. Being out by a factor of two is fine; being out by a factor of a thousand is not.', reference:refs.slo
  },
  {
    id:'the-tail-that-matters', kind:'quiz', chapter:'System design', concept:'Latency & availability', name:'The tail that matters', location:'Telemetry wall',
    objective:'Reason about queueing, fan-out, and redundancy with numbers.',
    intro:'Averages hide the requests that make users leave. Utilisation, fan-out, and redundancy all act on the tail rather than on the mean.',
    lesson:'A queue’s delay depends on how close arrivals are to capacity, not on the gap in absolute terms: at 95% utilisation the wait is long, and adding capacity moves the system away from the cliff rather than making each request faster. Fan-out multiplies tail risk, because a request that touches ten services is slow if any one of them is slow. Redundancy works the other way: independent replicas multiply their failure probabilities together, which is why a second one adds nines.',
    instructions:'Each answer follows from one line of arithmetic.',
    questions:[
      {prompt:'A tier receives 1,000 requests per second and can serve 1,050. You double its capacity to 2,100. What happens to queueing delay?', options:[{label:'it is unchanged: the arrival rate did not change'},{label:'it roughly halves'},{label:'it drops more than twentyfold'},{label:'it doubles'}], answer:2, why:'Delay depends on the headroom, capacity minus arrivals: 50 becomes 1,100, so the wait falls by about a factor of 22.'},
      {prompt:'One request fans out to 10 services, each slower than 10 ms for 1% of calls. How often is at least one of the ten slow?', options:[{label:'about 1 request in 1,000'},{label:'about 1 request in 100'},{label:'about 1 request in 10'},{label:'about 1 request in 2'}], answer:2, why:'The chance all ten are fast is 0.99^10 ≈ 0.90, so about one request in ten waits on a slow call.'},
      {prompt:'A region is available 99.9% of the time. Two independent regions, either of which can serve the request, give…', options:[{label:'99.9%'},{label:'99.95%'},{label:'99.99%'},{label:'99.9999%'}], answer:3, why:'Both must fail together: 0.001 × 0.001 = 0.000001, so 99.9999%.'},
      {prompt:'Which change lowers the 99th percentile without buying capacity?', options:[{label:'raise the client timeout'},{label:'remove a round trip from the request path'},{label:'retry every request once'},{label:'log more detail per request'}], answer:1, why:'A removed round trip is time nobody waits for. A longer timeout hides the symptom, and blanket retries add load exactly when the system is struggling.'}
    ],
    quizSuccess:'Headroom, fan-out, and independent redundancy: three numbers that decide what users actually experience.',
    solution:[2,2,3,1],
    hints:['For queueing, look at capacity minus arrivals. For fan-out, ask how often every call is fast. For redundancy, multiply the failure probabilities.','Answers in order: more than twentyfold, 1 in 10, 99.9999%, remove a round trip.'],
    takeaway:'Tail latency is a property of the whole path, and availability is a property of how failures combine. Both are arithmetic before they are engineering.', reference:refs.risk
  },
  {
    id:'consistency-costs', kind:'quiz', chapter:'System design', concept:'Consistency', name:'What consistency costs', location:'Data council',
    objective:'Name the trade each design choice is actually making.',
    intro:'Every one of these choices buys something and gives something up. The engineering skill is saying which, out loud, before the incident.',
    lesson:'Acknowledging a write before storing it makes writes fast and makes readers able to see stale data: that is eventual consistency, and it is a trade rather than a bug. When a network partition splits a system, you may keep answering on both sides and reconcile later, or refuse on one side to keep a single answer: availability or consistency, never both, for the duration of the partition. Retries make duplicates inevitable, so operations that must not happen twice need an idempotency key the server remembers. And a cache is only as fresh as its invalidation: a long time-to-live with nothing telling it the value changed keeps the old answer longest.',
    instructions:'Choose the answer that names the trade precisely.',
    questions:[
      {prompt:'A queue acknowledges a write before the datastore has it. A reader immediately sees the old value. What is that?', options:[{label:'a bug in the queue'},{label:'eventual consistency, the trade the queue makes'},{label:'a cache miss'},{label:'a network partition'}], answer:1, why:'The queue answered before the write landed. Staleness is the price of that latency, not a defect.'},
      {prompt:'A partition splits two regions. Life support must keep accepting commands in both. What have you chosen?', options:[{label:'consistency over availability'},{label:'availability over consistency, and conflicts to reconcile later'},{label:'both, because the regions are independent'},{label:'neither: partitions are a hardware problem'}], answer:1, why:'Accepting writes on both sides of a partition means the two sides can disagree, and somebody has to merge them afterwards.'},
      {prompt:'Which change makes a retried command safe to send twice?', options:[{label:'a longer timeout'},{label:'an idempotency key the server records'},{label:'a larger queue'},{label:'a read replica'}], answer:1, why:'The server has to recognise the second copy as the same command. Nothing about timing can guarantee that.'},
      {prompt:'A record changes in the datastore. Which caching choice keeps readers on the old value longest?', options:[{label:'delete the cache entry as part of the write'},{label:'a 5-second time-to-live'},{label:'a 1-hour time-to-live and no invalidation'},{label:'no cache at all'}], answer:2, why:'Without invalidation, readers keep the stale value for the whole hour the entry is allowed to live.'}
    ],
    quizSuccess:'Each of those is a trade with a name. Saying the name is what makes it a design decision instead of a surprise.',
    solution:[1,1,1,2],
    hints:['For each option, ask what it costs rather than what it provides.','Answers in order: eventual consistency, availability over consistency, an idempotency key, the one-hour TTL with no invalidation.'],
    takeaway:'Consistency, availability, and latency are exchanged for one another, never all bought at once. The architecture lab makes the same trades with numbers attached.', reference:refs.cap
  }
];

export const chapters = [...new Set(levels.map(level => level.chapter))];
