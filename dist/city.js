// Signal City: the networking track's build mode.
//
// You lay cable between districts and the model tells you what the city gets:
// which routes traffic takes, how loaded each link is, how much of each
// district's demand is actually delivered, what the latency looks like once
// queues build, and which single cable cut would isolate somebody.
//
// The model is simplified on purpose and says where: routing is shortest-path
// on an OSPF-style cost (a reference bandwidth divided by link capacity), with
// no load balancing across equal-cost paths; bandwidth is shared max-min fairly
// rather than by TCP's actual dynamics; queueing delay uses the M/M/1 factor
// 1/(1 − utilisation); and demand is steady rather than bursty. Prices,
// capacities, and distances are teaching values.

export class CityError extends Error {}
const fail = message => { throw new CityError(message); };
const round = (value, places = 2) => Number(value.toFixed(places));

export const grid = {columns:12, rows:8};

// Every district the city can contain. A contract picks a subset and sets what
// each one demands at peak.
export const districts = [
  {id:'uplink', name:'Orbital uplink', x:11, y:1, kind:'uplink', note:'Everything the city sends leaves through here'},
  {id:'habitat', name:'Habitat ring', x:1, y:1, kind:'homes', note:'Crew quarters and the mess'},
  {id:'labs', name:'Research labs', x:4, y:0, kind:'science', note:'Instrument data, bursty and large'},
  {id:'foundry', name:'Foundry', x:1, y:5, kind:'industry', note:'Machine telemetry'},
  {id:'dock', name:'Docking bay', x:5, y:6, kind:'transport', note:'Manifests and navigation traffic'},
  {id:'medbay', name:'Medical bay', x:8, y:5, kind:'medical', note:'Remote surgery: latency matters more than volume'},
  {id:'market', name:'Market deck', x:8, y:2, kind:'commerce', note:'Point of sale and a lot of video'},
  {id:'relay', name:'Relay mast', x:6, y:3, kind:'relay', note:'No users of its own: a junction you can route through'}
];
const districtById = id => districts.find(district => district.id === id) ?? fail(`There is no district called “${id}”.`);

export const technologies = [
  {id:'copper', name:'Copper', capacityMbps:1000, costPerBlock:2, latencyPerBlock:0.35, reachBlocks:4,
   note:'Cheap and short. Fine inside a district cluster, useless across the city.'},
  {id:'fibre', name:'Fibre', capacityMbps:10000, costPerBlock:6, latencyPerBlock:0.2, reachBlocks:14,
   note:'Ten times the capacity and the lowest delay per block, at three times the price.'},
  {id:'microwave', name:'Microwave', capacityMbps:600, costPerBlock:1, latencyPerBlock:0.9, reachBlocks:14,
   note:'Reaches anywhere for almost nothing, but it is slow and narrow. A backup, not a trunk.'}
];
const technologyById = id => technologies.find(technology => technology.id === id) ?? fail(`There is no link technology called “${id}”.`);

// OSPF's default metric: a reference bandwidth divided by the link's capacity,
// so a router prefers the fatter pipe even when it is the longer way round.
const referenceMbps = 10000;
const routingCost = technology => Math.max(1, referenceMbps / technology.capacityMbps);
export const blocksBetween = (a, b) => round(Math.hypot(a.x - b.x, a.y - b.y), 3);

export const scenarios = [
  {
    id:'first-light',
    name:'Light up the city',
    brief:'Four districts and an uplink. Every district has to reach the orbital uplink, and copper does not stretch far enough to do it alone.',
    teaches:'A network is a graph you pay for. Reach, not just price, decides which technology can carry a given span.',
    districts:{uplink:0, habitat:300, labs:500, dock:250, market:400},
    budget:50,
    targets:{connect:true, delivered:1}
  },
  {
    id:'peak-hour',
    name:'Survive peak hour',
    brief:'Shift change: every district is busy at once. Keep every cable under 80% loaded, because a link at 95% is a queue, not a link.',
    teaches:'Utilisation, not capacity, is what you design against. Traffic aggregates as it approaches the uplink, so trunk links carry everyone.',
    districts:{uplink:0, habitat:900, labs:2600, dock:700, market:2200, foundry:800},
    budget:104,
    targets:{connect:true, maxUtilisation:0.8, delivered:1}
  },
  {
    id:'no-single-point',
    name:'No single point of failure',
    brief:'A maintenance crew will cut exactly one cable, and you do not get to choose which. Nobody may lose the uplink when they do.',
    teaches:'Redundancy is a ring, not a spare part. One extra path turns every cut into a reroute — and costs real money.',
    districts:{uplink:0, habitat:700, labs:1800, dock:600, market:1600, foundry:700, medbay:400},
    budget:128,
    targets:{connect:true, maxUtilisation:0.9, delivered:1, resilient:true}
  },
  {
    id:'the-medical-bay',
    name:'The medical bay',
    brief:'Remote surgery runs from the medical bay. It needs a round trip under 9 ms while the rest of the city keeps working.',
    teaches:'Latency is path length plus queueing. A congested short path can be slower than an idle long one, and the fix is usually headroom.',
    districts:{uplink:0, habitat:900, labs:2400, dock:800, market:2400, foundry:900, medbay:500},
    budget:155,
    targets:{connect:true, maxUtilisation:0.85, delivered:1, latency:{district:'medbay', ms:9}}
  },
  {
    id:'the-city-grows',
    name:'The city grows',
    brief:'The labs double their instrument feed and the foundry comes online for real. One cut may not isolate anybody, and it may not cost the city more than 40% of its traffic either.',
    teaches:'Real networks are rebuilt while running. The cheapest topology that met yesterday’s demand is rarely the one that meets tomorrow’s.',
    districts:{uplink:0, habitat:1200, labs:5200, dock:1100, market:3000, foundry:2400, medbay:600},
    budget:210,
    targets:{connect:true, maxUtilisation:0.8, delivered:1, resilient:true, survivesCut:0.6, latency:{district:'medbay', ms:11}}
  }
];

export const scenarioDistricts = scenario =>
  districts.filter(district => Object.hasOwn(scenario.districts, district.id) || district.kind === 'relay')
    .map(district => ({...district, demandMbps:scenario.districts[district.id] ?? 0}));

// ------------------------------------------------------------ validation

function prepare(design, scenario) {
  const available = new Map(scenarioDistricts(scenario).map(district => [district.id, district]));
  const links = [];
  const seen = new Set();
  for (const link of design.links ?? []) {
    if (!available.has(link.from) || !available.has(link.to)) fail('That link connects a district this contract does not have.');
    if (link.from === link.to) fail('A link needs two different districts.');
    const key = [link.from, link.to].sort().join('|');
    if (seen.has(key)) fail('Those two districts are already connected. Change that link instead of laying a second one.');
    seen.add(key);
    const technology = technologyById(link.tech);
    const blocks = blocksBetween(available.get(link.from), available.get(link.to));
    if (blocks > technology.reachBlocks) fail(`${technology.name} reaches ${technology.reachBlocks} blocks and that span is ${blocks}.`);
    links.push({
      ...link, technology, blocks,
      key,
      cost:Math.round(blocks * technology.costPerBlock),
      capacityMbps:technology.capacityMbps,
      propagationMs:round(blocks * technology.latencyPerBlock, 3),
      metric:routingCost(technology)
    });
  }
  if (links.length > 40) fail('Keep the city to 40 links or fewer.');
  return {links, available};
}

// ------------------------------------------------------------- routing

// Shortest path on the routing metric, with the total propagation delay kept as
// a tiebreak so two equal-cost paths resolve to the shorter one.
function routeTo(target, districtList, links) {
  const neighbours = new Map(districtList.map(district => [district.id, []]));
  links.forEach((link, index) => {
    neighbours.get(link.from).push({to:link.to, index, link});
    neighbours.get(link.to).push({to:link.from, index, link});
  });
  const best = new Map([[target, {cost:0, delay:0, path:[], hops:0}]]);
  const pending = new Set(districtList.map(district => district.id));
  while (pending.size) {
    let node = null;
    for (const candidate of pending) {
      const entry = best.get(candidate);
      if (!entry) continue;
      if (!node || entry.cost < best.get(node).cost || (entry.cost === best.get(node).cost && entry.delay < best.get(node).delay)) node = candidate;
    }
    if (!node) break;
    pending.delete(node);
    const here = best.get(node);
    for (const {to, index, link} of neighbours.get(node)) {
      if (!pending.has(to)) continue;
      const cost = here.cost + link.metric;
      const delay = here.delay + link.propagationMs;
      const known = best.get(to);
      if (!known || cost < known.cost || (cost === known.cost && delay < known.delay)) {
        best.set(to, {cost, delay, path:[index, ...here.path], hops:here.hops + 1});
      }
    }
  }
  return best;
}

// Max-min fair sharing: every flow grows at the same rate until the link it
// needs is full, which is the standard way to describe a fair bottleneck.
function allocate(flows, links) {
  const rates = flows.map(() => 0);
  const residual = links.map(link => link.capacityMbps);
  const active = new Set(flows.map((_, index) => index));
  for (let guard = 0; active.size && guard <= flows.length + links.length + 2; guard++) {
    let step = Infinity;
    const counts = links.map(() => 0);
    for (const index of active) for (const link of flows[index].path) counts[link]++;
    for (let link = 0; link < links.length; link++) {
      if (counts[link] > 0) step = Math.min(step, residual[link] / counts[link]);
    }
    for (const index of active) step = Math.min(step, flows[index].demandMbps - rates[index]);
    if (!Number.isFinite(step)) break;
    for (const index of active) {
      rates[index] += step;
      for (const link of flows[index].path) residual[link] -= step;
    }
    for (const index of [...active]) {
      const satisfied = rates[index] >= flows[index].demandMbps - 1e-9;
      const blocked = flows[index].path.some(link => residual[link] <= 1e-9);
      if (satisfied || blocked) active.delete(index);
    }
  }
  return rates;
}

// ------------------------------------------------------------ evaluation

// One pass of the whole city: where traffic goes, how much of it arrives.
function simulate(districtList, links) {
  const routes = routeTo('uplink', districtList, links);
  const customers = districtList.filter(district => district.demandMbps > 0);
  const flows = customers.map(district => ({
    id:district.id,
    demandMbps:district.demandMbps,
    path:routes.get(district.id)?.path ?? null
  }));
  const connected = flows.filter(flow => flow.path !== null);
  const rates = allocate(connected, links);
  const load = links.map(() => 0);
  connected.forEach((flow, index) => { for (const link of flow.path) load[link] += rates[index]; });
  return {
    routes, flows, connected, rates, load,
    unreachable:flows.filter(flow => flow.path === null).map(flow => flow.id),
    demandMbps:customers.reduce((total, district) => total + district.demandMbps, 0),
    deliveredMbps:rates.reduce((total, rate) => total + rate, 0)
  };
}

export function evaluateCity(design, scenarioIndex = 0) {
  const scenario = scenarios[scenarioIndex];
  if (!scenario) fail('Choose a valid contract.');
  const districtList = scenarioDistricts(scenario);
  const {links} = prepare(design ?? {links:[]}, scenario);
  const cost = links.reduce((total, link) => total + link.cost, 0);
  const run = simulate(districtList, links);
  const {routes, connected, rates, load, unreachable} = run;

  const linkReport = links.map((link, index) => ({
    from:link.from, to:link.to, tech:link.tech, technology:link.technology.name,
    blocks:link.blocks, cost:link.cost, capacityMbps:link.capacityMbps,
    loadMbps:round(load[index], 1),
    utilisation:round(load[index] / link.capacityMbps, 4),
    propagationMs:link.propagationMs
  }));

  // Queueing grows without bound as a link fills, which is the point of the
  // utilisation target; the model reports a saturated link rather than infinity.
  const queueing = index => {
    const utilisation = Math.min(0.999, load[index] / links[index].capacityMbps);
    return links[index].propagationMs * (1 / (1 - utilisation) - 1);
  };
  const report = districtList.map(district => {
    const route = routes.get(district.id);
    const flowIndex = connected.findIndex(flow => flow.id === district.id);
    const delivered = flowIndex >= 0 ? round(rates[flowIndex], 1) : 0;
    const latency = route ? round(route.path.reduce((total, index) => total + links[index].propagationMs + queueing(index), 0) * 2, 3) : null;
    return {
      id:district.id, name:district.name, kind:district.kind,
      demandMbps:district.demandMbps,
      deliveredMbps:delivered,
      satisfaction:district.demandMbps ? round(delivered / district.demandMbps, 4) : 1,
      hops:route ? route.hops : null,
      roundTripMs:latency,
      path:route ? route.path : null,
      connected:Boolean(route)
    };
  });

  // Cut each cable in turn: who loses the uplink, and how much of the city's
  // traffic still arrives on the paths that are left.
  const cuts = links.map((_, index) => {
    const remaining = links.filter((_, other) => other !== index);
    const after = simulate(districtList, remaining);
    return {
      link:index, from:links[index].from, to:links[index].to,
      isolated:after.unreachable,
      survivingShare:run.demandMbps ? round(after.deliveredMbps / run.demandMbps, 4) : 1
    };
  });
  const weakest = cuts.filter(cut => cut.isolated.length);
  const worstCut = cuts.reduce((worst, cut) => !worst || cut.survivingShare < worst.survivingShare ? cut : worst, null);

  const targets = scenario.targets;
  const peakUtilisation = linkReport.length ? Math.max(...linkReport.map(link => link.utilisation)) : 0;
  const worstSatisfaction = report.filter(row => row.demandMbps).reduce((lowest, row) => Math.min(lowest, row.satisfaction), 1);
  const watched = targets.latency ? report.find(row => row.id === targets.latency.district) : null;
  const met = {
    connect:!targets.connect || unreachable.length === 0,
    utilisation:targets.maxUtilisation === undefined || peakUtilisation <= targets.maxUtilisation,
    delivered:targets.delivered === undefined || worstSatisfaction >= targets.delivered - 1e-9,
    resilient:!targets.resilient || weakest.length === 0,
    survivesCut:targets.survivesCut === undefined || !worstCut || worstCut.survivingShare >= targets.survivesCut - 1e-9,
    latency:!targets.latency || (watched?.roundTripMs !== null && watched?.roundTripMs <= targets.latency.ms),
    budget:cost <= scenario.budget
  };
  const success = links.length > 0 && Object.values(met).every(Boolean);

  return {
    scenario, success, met, cost, links:linkReport, districts:report, cuts:weakest, worstCut,
    peakUtilisation, worstSatisfaction:round(worstSatisfaction, 4),
    unreachable,
    totalDemandMbps:run.demandMbps,
    deliveredMbps:round(run.deliveredMbps, 1),
    message:verdict({met, success, cost, scenario, unreachable, peakUtilisation, weakest, worstCut, report, targets, worstSatisfaction, links:linkReport})
  };
}

function verdict({met, success, cost, scenario, unreachable, peakUtilisation, weakest, worstCut, report, targets, worstSatisfaction, links}) {
  const name = id => districts.find(district => district.id === id).name;
  const list = items => items.length < 2 ? items.join('') : `${items.slice(0, -1).join(', ')} and ${items.at(-1)}`;
  if (!links.length) return 'Lay some cable first: select a technology, then pick two districts to connect.';
  if (success) return `Contract met. ${links.length} links, ${cost} credits of ${scenario.budget}, busiest cable at ${Math.round(peakUtilisation * 100)}%.`;
  if (!met.connect) return `${list(unreachable.map(name))} cannot reach the uplink. Every district needs a path, not just a cable.`;
  if (!met.budget) return `Over budget by ${cost - scenario.budget} credits. Fibre everywhere is a design, but it is not this budget.`;
  if (!met.delivered) {
    const starved = report.filter(row => row.demandMbps && row.satisfaction < 1).map(row => row.name);
    return `${list(starved)} cannot get all of their traffic through: the busiest cable on that path is full. Widen it or give the traffic a second route.`;
  }
  if (!met.utilisation) {
    const hottest = links.reduce((worst, link) => link.utilisation > worst.utilisation ? link : worst);
    return `The ${name(hottest.from)} ↔ ${name(hottest.to)} cable is ${Math.round(hottest.utilisation * 100)}% loaded against a ${Math.round(targets.maxUtilisation * 100)}% target. Traffic aggregates towards the uplink, so trunk links need the most capacity.`;
  }
  if (!met.resilient) {
    const cut = weakest[0];
    return `Cut the ${name(cut.from)} ↔ ${name(cut.to)} cable and ${list(cut.isolated.map(name))} go dark. Resilience means a second path, not a second cable on the same route.`;
  }
  if (!met.survivesCut) {
    return `Cut the ${name(worstCut.from)} ↔ ${name(worstCut.to)} cable and only ${Math.round(worstCut.survivingShare * 100)}% of the city's traffic still arrives, against a ${Math.round(targets.survivesCut * 100)}% target. A backup path has to be wide enough to carry the traffic it inherits.`;
  }
  if (!met.latency) {
    const watched = report.find(row => row.id === targets.latency.district);
    return `${watched.name} sees a ${watched.roundTripMs} ms round trip against a ${targets.latency.ms} ms target over ${watched.hops} hops. Fewer hops, faster cable, or more headroom on the ones it crosses.`;
  }
  return `Still short of ${worstSatisfaction < 1 ? 'the delivery target' : 'the contract'}.`;
}

// A reference build for each contract: not the cheapest design, but the one
// that shows the idiom the contract is teaching. The tests check every one.
export const referenceDesigns = {
  'first-light':[
    {from:'relay', to:'uplink', tech:'fibre'},
    {from:'habitat', to:'relay', tech:'microwave'},
    {from:'labs', to:'relay', tech:'microwave'},
    {from:'dock', to:'relay', tech:'microwave'},
    {from:'market', to:'relay', tech:'microwave'}
  ],
  'peak-hour':[
    {from:'relay', to:'uplink', tech:'fibre'},
    {from:'labs', to:'relay', tech:'fibre'},
    {from:'market', to:'relay', tech:'fibre'},
    {from:'habitat', to:'labs', tech:'fibre'},
    {from:'foundry', to:'habitat', tech:'copper'},
    {from:'dock', to:'relay', tech:'copper'}
  ],
  'no-single-point':[
    {from:'relay', to:'uplink', tech:'fibre'},
    {from:'labs', to:'relay', tech:'fibre'},
    {from:'market', to:'relay', tech:'fibre'},
    {from:'habitat', to:'labs', tech:'fibre'},
    {from:'foundry', to:'habitat', tech:'copper'},
    {from:'dock', to:'relay', tech:'copper'},
    {from:'medbay', to:'market', tech:'copper'},
    {from:'market', to:'uplink', tech:'microwave'},
    {from:'foundry', to:'dock', tech:'microwave'},
    {from:'medbay', to:'dock', tech:'microwave'}
  ],
  'the-medical-bay':[
    {from:'market', to:'uplink', tech:'fibre'},
    {from:'medbay', to:'market', tech:'fibre'},
    {from:'labs', to:'market', tech:'fibre'},
    {from:'habitat', to:'labs', tech:'fibre'},
    {from:'foundry', to:'habitat', tech:'fibre'},
    {from:'dock', to:'medbay', tech:'copper'}
  ],
  'the-city-grows':[
    {from:'market', to:'uplink', tech:'fibre'},
    {from:'relay', to:'uplink', tech:'fibre'},
    {from:'labs', to:'relay', tech:'fibre'},
    {from:'habitat', to:'labs', tech:'fibre'},
    {from:'foundry', to:'habitat', tech:'fibre'},
    {from:'foundry', to:'dock', tech:'fibre'},
    {from:'dock', to:'market', tech:'fibre'},
    {from:'medbay', to:'market', tech:'fibre'},
    {from:'medbay', to:'dock', tech:'copper'}
  ]
};
