// The game layer: what the station is, what a mission is worth, how well it was
// solved, and what that adds up to. All of it is pure and derived from the
// mission list plus a record of how each one went, so it can be checked without
// a browser and cannot drift from the content.
import {levels} from './levels.js';

// Nine sections, built from the room names the missions already carry. Every
// mission belongs to exactly one, and a test checks that none is left out.
export const sections = [
  {
    id:'docking', name:'Docking bay', deck:'Deck 1',
    blurb:'Where the drone woke up, and where everything that comes aboard is counted.',
    at:[0, 0], size:[2.2, 1.6], height:1.1,
    rooms:['Docking bay', 'Service corridor', 'Repair rota', 'Cargo spine', 'Cargo manifest', 'Cargo registry', 'Cargo scales', 'Archive sorter']
  },
  {
    id:'habitat', name:'Habitat ring', deck:'Deck 2',
    blurb:'Quarters, the commissary, and the registry of everyone aboard.',
    at:[2.7, 0], size:[2.0, 1.6], height:1.5,
    rooms:['Habitat ring', 'Crew registry', 'Badge printer', 'Commissary till', 'Environment console', 'Translation desk']
  },
  {
    id:'reactor', name:'Reactor', deck:'Deck 1',
    blurb:'The thing that has to come back before anything else can.',
    at:[0, 2.1], size:[1.8, 1.8], height:2.2,
    rooms:['Reactor access', 'Reactor control', 'Thermal array', 'Thermal grid', 'Thermal monitor', 'Diagnostics bay', 'Repair log']
  },
  {
    id:'sensors', name:'Sensor array', deck:'Deck 3',
    blurb:'Everything the station knows about the outside arrives here first.',
    at:[2.3, 2.1], size:[2.0, 1.8], height:1.3,
    rooms:['Sensor chamber', 'Sensor array', 'Peak monitor', 'Telemetry bay', 'Telemetry archive', 'Telemetry review', 'Telemetry wall']
  },
  {
    id:'core', name:'Computer core', deck:'Deck 2',
    blurb:'Memory, firmware and the indexes everything else looks things up in.',
    at:[4.8, 2.1], size:[1.8, 1.8], height:1.9,
    rooms:['Memory bank', 'Firmware vault', 'Attitude computer', 'Index memory', 'Catalogue index', 'Archive index']
  },
  {
    id:'command', name:'Command deck', deck:'Deck 4',
    blurb:'Where instructions are read, checked, and turned into something that runs.',
    at:[0, 4.2], size:[2.2, 1.7], height:1.6,
    rooms:['Command parser', 'Verification bay', 'Intake console', 'Access ladder', 'Analysis deck', 'Star catalogue', 'Signal analyser']
  },
  {
    id:'comms', name:'Comms tower', deck:'Deck 5',
    blurb:'The only thing between this station and everyone who is not on it.',
    at:[2.6, 4.3], size:[1.7, 1.6], height:2.3,
    rooms:['Comms locker', 'Relay uplink', 'Uplink terminal', 'Portal front end', 'Deep-space array', 'Long-range relay', 'Name service', 'Transfer control']
  },
  {
    id:'netops', name:'Network operations', deck:'Deck 3',
    blurb:'Addresses, routes, and the closet where somebody got the mask wrong.',
    at:[4.8, 4.2], size:[1.9, 1.7], height:1.4,
    rooms:['Network operations', 'Address registry', 'Service registry', 'Station router', 'Station border router', 'Wiring closet', 'Navigation core']
  },
  {
    id:'operations', name:'Operations centre', deck:'Deck 4',
    blurb:'Where what the station promises is decided, and what it costs is argued about.',
    at:[7.2, 2.1], size:[1.9, 3.8], height:1.7,
    rooms:['Planning table', 'Planning deck', 'Reliability review', 'Incident bridge', 'Data council']
  }
];

// Power conduits: the reactor feeds the core, the core feeds everything else.
export const conduits = [
  ['reactor', 'docking'], ['reactor', 'command'], ['reactor', 'sensors'],
  ['sensors', 'core'], ['core', 'netops'], ['core', 'habitat'],
  ['netops', 'comms'], ['netops', 'operations'], ['command', 'comms']
];

export const sectionOf = level => sections.find(section => section.rooms.includes(level.location)) ?? null;
export const missionsIn = section => levels.filter(level => section.rooms.includes(level.location));

// --------------------------------------------------------------- ranks

// How a mission was solved, not how fast. Asking for a hint costs a little;
// reading the answer costs more; and both can be won back by solving it again
// without them, because the best attempt is the one that counts.
export const ranks = {
  gold:{id:'gold', name:'Unaided', power:100, mark:'★', note:'Solved with no hints and without reading the solution.'},
  silver:{id:'silver', name:'Hinted', power:80, mark:'◆', note:'Solved after a hint, or after glimpsing part of the answer.'},
  bronze:{id:'bronze', name:'Guided', power:50, mark:'●', note:'Solved with the whole answer in hand. Reset it and solve it yourself to restore the rest.'}
};
export const rankOrder = ['bronze', 'silver', 'gold'];

// Peeking at one line of an answer is not the same as being handed all of it,
// so the ladder is graduated: climbing part of it costs a hint's worth, and
// only taking the whole thing costs the rest.
export const rankFor = ({hints = 0, solutionShown = false, revealed = 0} = {}) =>
  solutionShown ? ranks.bronze : hints > 0 || revealed > 0 ? ranks.silver : ranks.gold;

export const bestRank = (a, b) => rankOrder.indexOf(a) >= rankOrder.indexOf(b) ? a : b;

export function stationPower(records) {
  return levels.reduce((total, level) => total + (records[level.id]?.rank ? ranks[records[level.id].rank].power : 0), 0);
}
export const fullPower = () => levels.length * ranks.gold.power;

export function stationState(records = {}) {
  const done = level => !!records[level.id]?.rank;
  const built = sections.map(section => {
    const missions = missionsIn(section);
    const complete = missions.filter(done).length;
    const power = missions.reduce((total, level) => total + (records[level.id]?.rank ? ranks[records[level.id].rank].power : 0), 0);
    return {
      ...section, missions, complete, total:missions.length,
      power, capacity:missions.length * ranks.gold.power,
      share:missions.length ? power / (missions.length * ranks.gold.power) : 0,
      status:complete === 0 ? 'dark' : complete < missions.length ? 'warming' : 'online'
    };
  });
  return {
    sections:built,
    power:stationPower(records),
    capacity:fullPower(),
    complete:levels.filter(done).length,
    total:levels.length,
    restored:built.filter(section => section.status === 'online').length,
    online:built.every(section => section.status === 'online')
  };
}


// ------------------------------------------------- what to look at again

// The records already know which missions were hard: the answer was read, hints
// were taken, or it took several runs. Grouped by concept, because the concept
// is what is shaky — not the particular mission it was met in.
// Reading the answer is the strongest signal that a concept did not land, a
// hint the next, and needing several runs the weakest — grinding at something
// until it works is how it is supposed to go.
const weight = record => (record.rank === 'bronze' ? 4 : record.rank === 'silver' ? 2 : 0) + Math.max(0, Math.min(2, (record.runs ?? 1) - 3));

export function struggles(records = {}, limit = 6) {
  const byConcept = new Map();
  for (const level of levels) {
    const record = records[level.id];
    if (!record?.rank) continue;
    const score = weight(record);
    if (!score) continue;
    const key = `${level.chapter}::${level.concept}`;
    if (!byConcept.has(key)) byConcept.set(key, {concept:level.concept, chapter:level.chapter, score:0, missions:[]});
    const entry = byConcept.get(key);
    entry.score += score;
    entry.missions.push({id:level.id, name:level.name, rank:record.rank, runs:record.runs ?? 1});
  }
  return [...byConcept.values()]
    .map(entry => ({
      ...entry,
      why:entry.missions.some(mission => mission.rank === 'bronze') ? 'the answer was read here'
        : entry.missions.some(mission => mission.runs >= 4) ? 'it took several runs'
        : 'a hint was taken here'
    }))
    .sort((a, b) => b.score - a.score || a.concept.localeCompare(b.concept))
    .slice(0, limit);
}

// -------------------------------------------------------- achievements

// Each one comes from something the game already measured. Nothing here is
// earned by coming back tomorrow or by doing the same thing repeatedly.
export const achievements = [
  {
    id:'first-light', name:'First light', hint:'Finish a mission.',
    earned:({state}) => state.complete >= 1
  },
  {
    id:'unaided-ten', name:'Unaided ten', hint:'Solve ten missions with no hint and no solution shown.',
    earned:({records}) => Object.values(records).filter(record => record.rank === 'gold').length >= 10
  },
  {
    id:'first-section', name:'Lights on', hint:'Bring a whole section of the station online.',
    earned:({state}) => state.restored >= 1
  },
  {
    id:'chapter-clean', name:'Chapter without help', hint:'Finish a whole chapter at Unaided.',
    earned:({records}) => ['Programming', 'Computer science', 'Networking', 'System design']
      .some(chapter => levels.filter(level => level.chapter === chapter).every(level => records[level.id]?.rank === 'gold'))
  },
  {
    id:'first-run', name:'Read it right', hint:'Solve a debug mission on the first run.',
    earned:({records}) => levels.filter(level => level.kind === 'debug').some(level => records[level.id]?.firstTry)
  },
  {
    id:'mutation-proof', name:'Mutation proof', hint:'Reject every broken version with five cases or fewer.',
    earned:({feats}) => (feats.tightestSuite ?? Infinity) <= 5
  },
  {
    id:'tenfold', name:'Tenfold', hint:'Come in at a tenth of a mission’s step budget.',
    earned:({feats}) => (feats.bestGateRatio ?? 1) <= 0.1
  },
  {
    id:'thrifty-city', name:'Thrifty engineer', hint:'Meet a Signal City contract with a fifth of the credits unspent.',
    earned:({feats}) => (feats.citySpare ?? 0) >= 0.2
  },
  {
    id:'thrifty-lab', name:'Frugal architect', hint:'Meet a lab contract with a fifth of the budget unspent.',
    earned:({feats}) => (feats.labSpare ?? 0) >= 0.2
  },
  {
    id:'polyglot', name:'Polyglot', hint:'Read all five languages in a language panel.',
    earned:({feats}) => (feats.languagesRead ?? 0) >= 5
  },
  {
    id:'all-chapters', name:'Every discipline', hint:'Finish at least one mission in all four chapters.',
    earned:({records}) => ['Programming', 'Computer science', 'Networking', 'System design']
      .every(chapter => levels.some(level => level.chapter === chapter && records[level.id]?.rank))
  },
  {
    id:'called-it', name:'Called it', hint:'Predict what a run will do, correctly, ten times.',
    earned:({feats}) => (feats.predictions ?? 0) >= 10
  },
  {
    id:'it-stuck', name:'It stuck', hint:'Recall twenty review questions correctly.',
    earned:({feats}) => (feats.recalled ?? 0) >= 20
  },
  {
    id:'own-diagnosis', name:'Your own diagnosis', hint:'Name the cause of a failure before reading it, correctly, five times.',
    earned:({feats}) => (feats.diagnosed ?? 0) >= 5
  },
  {
    id:'station-restored', name:'Station restored', hint:'Bring every section online.',
    earned:({state}) => state.online
  }
];

export function earnedAchievements(records = {}, feats = {}) {
  const state = stationState(records);
  return achievements.map(achievement => ({...achievement, done:!!achievement.earned({records, feats, state})}));
}
