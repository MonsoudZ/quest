const row=(x,y,n)=>Array.from({length:n},(_,i)=>[x+i,y]);
const column=(x,y,n)=>Array.from({length:n},(_,i)=>[x,y+i]);
const refs={
  basics:{label:'Read more: Harvard CS50 — algorithms & binary',url:'https://cs50.harvard.edu/x/notes/0/'},
  variables:{label:'Reference: MDN — let and block scope',url:'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/let'},
  loops:{label:'Reference: MDN — for loops',url:'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/for'},
  conditions:{label:'Reference: MDN — if…else',url:'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/if...else'},
  sort:{label:'Reference: NIST — bubble sort',url:'https://xlinux.nist.gov/dads/HTML/bubblesort.html'},
  graph:{label:'Reference: MIT — shortest paths & Dijkstra',url:'https://ocw.mit.edu/courses/6-046j-introduction-to-algorithms-sma-5503-fall-2005/resources/lecture-17-shortest-paths-i-properties-dijkstras-algorithm-breadth-first-search/'}
};
export const levels=[
  {
    id:'first-contact',kind:'code',chapter:'Programming',concept:'Sequences',name:'First contact',location:'Docking bay',
    objective:'Guide SQ-01 four tiles east to the power cell.',
    intro:'The station is dark. Your repair drone follows instructions from top to bottom. Use the cyan arrow to see which way it faces.',
    lesson:'A program gives a computer instructions. In this game, move() advances one tile in the direction the drone faces; move(3) advances three. The compass maps east to the lower-right diagonal.',
    start:[1,3,0],goal:[5,3],tiles:row(1,3,5),
    starter:'// Reach the power cell, four tiles ahead.\nmove();\n',
    solution:'move(4);',
    hints:['The drone faces east. Count four tile-to-tile moves from its starting tile.','Use four move(); commands, or pass 4 to move().'],
    takeaway:'You wrote a simple algorithm: precise steps that solve this navigation problem.',reference:refs.basics
  },
  {
    id:'around-the-corner',kind:'code',chapter:'Programming',concept:'Debugging',name:'A change of direction',location:'Service corridor',
    objective:'Travel east, turn south, and reach the power cell.',
    intro:'The direct route is sealed. Break the journey into moves and turns. If a move fails, the trace identifies the responsible instruction.',
    lesson:'turnRight() rotates the drone 90° clockwise on the deck: east becomes south. turnLeft() rotates the other way. Turning does not change position. The isometric view makes right angles look like diagonal corners.',
    start:[1,1,0],goal:[5,5],tiles:[...row(1,1,5),...column(5,2,4)],
    starter:'move(4);\n// Turn, then follow the corridor.\n',
    solution:'move(4);\nturnRight();\nmove(4);',
    hints:['Travel four tiles east to the corner, then turn south.','After move(4), use turnRight(), then move four more tiles.'],
    takeaway:'Debugging means comparing actual behavior with intended behavior, then fixing the responsible instruction.',reference:refs.basics
  },
  {
    id:'repeat-the-route',kind:'code',chapter:'Programming',concept:'Loops',name:'Find the pattern',location:'Thermal array',require:'loop',
    objective:'Use a for loop to repeat the staircase route.',
    intro:'Three identical service modules stand between you and the cell. Describe their shared pattern once and repeat it.',
    lesson:'A for loop repeats its body. let i = 0 initializes the counter; i < 3 is checked before every iteration; i++ adds one after the body. The body runs for i = 0, 1, and 2.',
    start:[0,6,0],goal:[6,3],tiles:[[0,6],[1,6],[2,6],[2,5],[3,5],[4,5],[4,4],[5,4],[6,4],[6,3]],
    starter:'for (let i = 0; i < 3; i++) {\n  move(2);\n  // Go north one tile, then face east again.\n}\n',
    solution:'for (let i = 0; i < 3; i++) {\n  move(2);\n  turnLeft();\n  move();\n  turnRight();\n}',
    hints:['Each module is two tiles east and one north. Finish each repetition facing east.','Inside the loop: move(2), turnLeft(), move(), then turnRight().'],
    takeaway:'Your loop repeats the same navigation pattern. The counter belongs to the for loop and is not accessible after it.',reference:refs.loops
  },
  {
    id:'name-the-distance',kind:'code',chapter:'Programming',concept:'Variables',name:'Store the answer',location:'Reactor access',require:'variable',
    objective:'Reuse one named distance for both straight corridors.',
    intro:'Both corridors have the same length. Store that distance in a variable and use the name twice.',
    lesson:'let distance = 4 declares a variable and initializes it with 4. move(distance) then uses that value. let has block scope: a variable declared inside braces belongs to that block. JavaScript also supports reassignment; this sandbox currently focuses on declarations and reads.',
    start:[1,1,0],goal:[5,5],tiles:[...row(1,1,5),...column(5,2,4)],
    starter:'let distance = 2;\nmove(distance);\nturnRight();\nmove(distance);\n',
    solution:'let distance = 4;\nmove(distance);\nturnRight();\nmove(distance);',
    hints:['The starter turns too soon. Both straight corridors require four moves.','Change the stored distance from 2 to 4. Keep using the same name in both move calls.'],
    takeaway:'Reusing a named value avoids repeating a literal. Changing this one declaration changes both movement distances.',reference:refs.variables
  },
  {
    id:'read-the-room',kind:'code',chapter:'Programming',concept:'Conditionals',name:'Read the room',location:'Sensor chamber',require:'conditional',
    objective:'Use canMove() in a conditional to navigate the corner.',
    intro:'SQ-01 can check the tile ahead. Give it one rule for an open path and another for a blocked path.',
    lesson:'canMove() is this game’s sensor function: it returns true when the next tile is traversable. if chooses its body when the condition is true; else chooses the alternative. The loop makes eight decisions: seven moves and one turn.',
    start:[1,1,0],goal:[4,5],tiles:[...row(1,1,4),...column(4,2,4)],
    starter:'for (let i = 0; i < 8; i++) {\n  if (canMove()) {\n    // Move when the path is open.\n  } else {\n    turnRight();\n  }\n}\n',
    solution:'for (let i = 0; i < 8; i++) {\n  if (canMove()) {\n    move();\n  } else {\n    turnRight();\n  }\n}',
    hints:['The open-path block is empty. Add a movement command there.','Put move(); inside the if block. The else block already handles the blocked path.'],
    takeaway:'Conditionals let a program respond to its environment. This rule works for this route; it is not a general-purpose maze solver.',reference:refs.conditions
  },
  {
    id:'speak-in-bits',kind:'bits',chapter:'Computer science',concept:'Binary numbers',name:'Speak in bits',location:'Memory bank',
    objective:'Encode the unsigned decimal number 13 using four bits.',
    intro:'The memory bank represents information with bits: 0 or 1. Flip them to encode the access code.',
    lesson:'For these four unsigned binary digits, the place values are 8, 4, 2, and 1. A 1 includes its place value; a 0 contributes zero. The pattern 1101 means 8 + 4 + 0 + 1 = 13.',
    target:13,hints:['13 is 8 + 4 + 1. Leave the 2-value bit off.','From left to right: 1, 1, 0, 1.'],solution:[1,1,0,1],
    takeaway:'Four bits have 16 possible patterns. As an unsigned integer, they represent 0 through 15. Other encodings can give the same bits a different meaning.',reference:refs.basics
  },
  {
    id:'restore-the-order',kind:'sort',chapter:'Computer science',concept:'Arrays & sorting',name:'Restore the order',location:'Archive index',
    objective:'Sort the entries from smallest to largest with adjacent swaps.',
    intro:'The archive index is scrambled. Reorder its entries by swapping neighboring values.',
    lesson:'An array is an ordered sequence of entries; JavaScript array indices start at 0. This puzzle permits any adjacent swap. Bubble sort is a particular algorithm: scan adjacent pairs in order, swap out-of-order pairs, and repeat passes until sorted.',
    values:[7,2,9,4,1],hints:['Try moving the largest value right by swapping it past smaller neighbors.','The final order is 1, 2, 4, 7, 9. Move 9 to the end, then work on the earlier entries.'],solution:[1,2,4,7,9],
    takeaway:'You sorted an array with adjacent swaps. Following a systematic left-to-right pass repeatedly gives bubble sort, which has quadratic worst-case time. Arbitrary swaps need not follow that algorithm.',reference:refs.sort
  },
  {
    id:'fewest-hops',kind:'network',chapter:'Computer science',concept:'Graphs & paths',name:'A shorter route',location:'Navigation core',
    objective:'Enable a route from uplink to archive with at most two hops.',
    intro:'The station is a graph: nodes connected by edges. Each traversed edge is one hop. Enable a short route and test it.',
    lesson:'In an unweighted graph, a shortest path uses the fewest edges. Breadth-first search finds one by exploring nodes in increasing hop distance. This map treats every link as usable in both directions.',
    nodes:[['uplink',12,50],['relay-a',39,22],['relay-b',39,77],['relay-c',65,77],['archive',87,50]],
    edges:[['uplink','relay-a',1],['relay-a','archive',1],['uplink','relay-b',1],['relay-b','relay-c',1],['relay-c','archive',1]],source:'uplink',target:'archive',maxEdges:2,
    hints:['Both routes connect the endpoints. Count the edges along each one.','The upper path is uplink → relay A → archive: two hops.'],solution:[0,1],
    takeaway:'You minimized hops on an unweighted graph. Only traversed edges contribute to path length; unused enabled branches do not.',reference:refs.graph
  },
  {
    id:'latency-matters',kind:'network',chapter:'Computer science',concept:'Weighted graphs',name:'Find the fastest route',location:'Long-range relay',
    objective:'Enable a route whose displayed delays total at most 12 ms.',
    intro:'Every link has a delay. A route with fewer hops can still be slower. Compare the sum of weights along each path.',
    lesson:'A weighted graph assigns a cost to each edge. Here the weights model fixed link delays. Dijkstra’s algorithm finds shortest paths with nonnegative weights. Real packet delay also depends on transmission, processing, and queues; this puzzle omits those effects.',
    nodes:[['uplink',12,50],['relay-a',49,20],['relay-b',35,78],['relay-c',64,78],['archive',87,50]],
    edges:[['uplink','relay-a',9],['relay-a','archive',9],['uplink','relay-b',3],['relay-b','relay-c',4],['relay-c','archive',3]],source:'uplink',target:'archive',budget:12,
    hints:['The two-hop route takes 18 ms in this model. Add the delays on the three-hop route.','The lower route costs 3 + 4 + 3 = 10 ms.'],solution:[2,3,4],
    takeaway:'The minimum-weight path costs 10 ms here, despite using more hops. Costs are summed along the chosen route, not across every enabled cable.',reference:refs.graph
  }
];
