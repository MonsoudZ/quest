// System design model for the architecture lab.
//
// This is a teaching model with fictional prices and capacities, not a capacity
// planner. Its simplifications are deliberate and stated in the lab: every tier
// is modelled as an M/M/1 queue, so the 99th percentile response time of a tier
// is ln(100)/(capacity − arrivals); the reported request latency follows the
// slowest path a request can take rather than blending percentiles; cache hit
// ratio is approximated from cache size against the working set; and
// availability composes redundant instances in parallel and tiers in series.
// Real systems add congestion, correlated failures, coordination, and bursty
// arrivals that none of this captures.

export class DesignError extends Error {}
const fail = message => { throw new DesignError(message); };

export const catalog = {
  web:[
    {name:'Edge node S', rps:400, cost:2},
    {name:'Edge node M', rps:900, cost:4},
    {name:'Edge node L', rps:2000, cost:9}
  ],
  db:[
    {name:'Datastore S', readRps:1500, writeRps:400, cost:6},
    {name:'Datastore M', readRps:4000, writeRps:1200, cost:12},
    {name:'Datastore L', readRps:6000, writeRps:2400, cost:24}
  ],
  cache:[
    {name:'No cache', gb:0, cost:0},
    {name:'Cache 8 GB', gb:8, cost:3},
    {name:'Cache 32 GB', gb:32, cost:7},
    {name:'Cache 128 GB', gb:128, cost:14}
  ]
};
export const shardOptions = [1, 2, 4];
export const replicaOptions = [0, 1, 2, 4];
export const regionOptions = [1, 2];
export const maxServers = 24;
export const maxWorkers = 8;

const constants = {
  balancerMs:1, cacheMs:1, queueMs:3,
  workerRps:800, workerCost:2, queueCost:2,
  replicaCostShare:0.6,
  serverAvailability:0.99, primaryAvailability:0.99, balancerAvailability:0.9999,
  minutesPerMonth:43200,
  maxHitRatio:0.98
};
export const modelConstants = {...constants};

// M/M/1: response time is exponentially distributed with rate (mu - lambda),
// so the 99th percentile is ln(100) / (mu - lambda).
const tail = (capacity, arrivals) => capacity <= arrivals ? Infinity : (Math.log(100) / (capacity - arrivals)) * 1000;
const round = (value, places = 2) => Number(value.toFixed(places));
// Enough decimals that a design with real downtime is never reported as 100%.
// Four nines is a few seconds a month, so minutes alone would read as zero.
const downtimeText = minutes => minutes >= 1 ? `${round(minutes, 1)} min` : `${round(minutes * 60, 1)} s`;
const availabilityText = value => {
  const shortfall = 1 - value;
  if (shortfall <= 0) return '100%';
  const places = Math.min(6, Math.max(3, Math.ceil(-Math.log10(shortfall)) + 1));
  const text = (value * 100).toFixed(places).replace(/0+$/, '').replace(/\.$/, '');
  return Number(text) >= 100 ? '>99.9999%' : `${text}%`;
};

export const defaultDesign = {web:0, servers:2, db:0, cache:0, replicas:0, shards:1, queue:false, workers:0, regions:1};

export const scenarios = [
  {
    id:'first-light',
    name:'Serve the station portal',
    description:'1,200 requests per second, almost all reads, from a small working set. Find the tier that saturates first and give it enough capacity.',
    traffic:{rps:1200, readFraction:0.95, workingSetGb:6},
    slo:{p99Ms:150, availability:0.98, budget:16},
    teaches:'Utilisation, not average speed, decides latency. A tier at 95% utilisation queues; the same tier at 50% does not.',
    allow:{queue:false, regions:false, shards:false}
  },
  {
    id:'read-storm',
    name:'Absorb the archive read storm',
    description:'9,000 requests per second, 97% reads, over a 30 GB working set. Buying database capacity for all of it is too expensive; keep the hot set out of the datastore.',
    traffic:{rps:9000, readFraction:0.97, workingSetGb:30},
    slo:{p99Ms:120, availability:0.995, budget:70},
    teaches:'A cache in front of the datastore removes read load at a fraction of the price, and read replicas add read capacity the primary cannot.',
    allow:{queue:false, regions:false, shards:true}
  },
  {
    id:'write-pressure',
    name:'Survive the telemetry write burst',
    description:'6,000 requests per second, but 60% of them are writes. Writes cannot be cached and every write reaches a primary.',
    traffic:{rps:6000, readFraction:0.4, workingSetGb:20},
    slo:{p99Ms:60, availability:0.99, budget:130},
    teaches:'Writes are the expensive direction. Sharding splits write load across primaries; a queue answers the client before the write lands, trading immediate consistency for latency.',
    allow:{queue:true, regions:false, shards:true}
  },
  {
    id:'always-on',
    name:'Keep life support answering',
    description:'4,000 requests per second with a 99.99% availability target. Redundancy, not speed, is the constraint here.',
    traffic:{rps:4000, readFraction:0.8, workingSetGb:12},
    slo:{p99Ms:150, availability:0.9999, budget:150},
    teaches:'Redundant instances multiply availability in parallel; tiers in series multiply their failure. Every shard you add is another tier that must be up.',
    allow:{queue:true, regions:true, shards:true}
  },
  {
    id:'full-station',
    name:'Run the whole station',
    description:'30,000 requests per second over an 80 GB working set, a 99.99% availability target, and a budget that does not stretch far enough to buy your way out. Everything you have learned, at once.',
    traffic:{rps:30000, readFraction:0.97, workingSetGb:80},
    slo:{p99Ms:100, availability:0.9999, budget:230},
    teaches:'Real designs are a budget negotiation between latency, durability, availability, and cost. There is no configuration that maximises all four.',
    allow:{queue:true, regions:true, shards:true}
  }
];

function validate(design, scenario) {
  const picked = {...defaultDesign, ...design};
  const check = (value, list, label) => { if (!Number.isInteger(value) || !list[value]) fail(`Choose a valid ${label}.`); };
  check(picked.web, catalog.web, 'edge node');
  check(picked.db, catalog.db, 'datastore');
  check(picked.cache, catalog.cache, 'cache');
  if (!Number.isInteger(picked.servers) || picked.servers < 1 || picked.servers > maxServers) fail(`Run between 1 and ${maxServers} edge nodes.`);
  if (!replicaOptions.includes(picked.replicas)) fail('Choose a supported replica count.');
  if (!shardOptions.includes(picked.shards)) fail('Choose a supported shard count.');
  if (!regionOptions.includes(picked.regions)) fail('Choose a supported region count.');
  if (!Number.isInteger(picked.workers) || picked.workers < 0 || picked.workers > maxWorkers) fail(`Run between 0 and ${maxWorkers} queue workers.`);
  const allow = scenario?.allow ?? {};
  if (allow.queue === false && picked.queue) fail('This contract does not allow an asynchronous write queue yet.');
  if (allow.shards === false && picked.shards !== 1) fail('This contract does not allow sharding yet.');
  if (allow.regions === false && picked.regions !== 1) fail('This contract runs in a single region.');
  if (!picked.queue) picked.workers = 0;
  return picked;
}

export function evaluateArchitecture(design, scenarioIndex = 0) {
  const scenario = scenarios[scenarioIndex];
  if (!scenario) fail('Choose a valid contract.');
  const picked = validate(design, scenario);
  const web = catalog.web[picked.web];
  const db = catalog.db[picked.db];
  const cache = catalog.cache[picked.cache];
  const {rps, readFraction, workingSetGb} = scenario.traffic;

  const reads = rps * readFraction;
  const writes = rps - reads;
  const hitRatio = cache.gb === 0 ? 0 : Math.min(constants.maxHitRatio, cache.gb / workingSetGb);
  const databaseReads = reads * (1 - hitRatio);

  const readNodes = picked.shards * (1 + picked.replicas);
  const writeNodes = picked.shards;
  const perRegion = picked.regions;
  const arrivals = {
    app:rps / perRegion / picked.servers,
    read:databaseReads / perRegion / readNodes,
    write:writes / perRegion / writeNodes
  };
  const capacity = {app:web.rps, read:db.readRps, write:db.writeRps};
  const utilisation = {
    app:arrivals.app / capacity.app,
    read:arrivals.read / capacity.read,
    write:picked.queue ? (writes / perRegion) / Math.max(1, picked.workers * constants.workerRps) : arrivals.write / capacity.write
  };

  const saturated = [];
  if (utilisation.app >= 1) saturated.push('edge nodes');
  if (utilisation.read >= 1) saturated.push('datastore reads');
  if (!picked.queue && utilisation.write >= 1) saturated.push('datastore writes');
  if (picked.queue && utilisation.write >= 1) saturated.push('queue workers');
  if (picked.queue && arrivals.write >= capacity.write) saturated.push('datastore writes behind the queue');

  const appTail = tail(capacity.app, arrivals.app);
  const readTail = tail(capacity.read, arrivals.read);
  const writeTail = tail(capacity.write, arrivals.write);
  // A 99th-percentile read includes a datastore read whenever misses are more
  // than 1% of reads; below that, the tail is served from cache.
  const readPath = constants.cacheMs + (hitRatio < 0.99 ? readTail : 0);
  const writePath = picked.queue ? constants.queueMs : writeTail;
  const latency = saturated.length ? Infinity : constants.balancerMs + appTail + Math.max(readPath, writePath);

  const shardAvailability = 1 - (1 - constants.primaryAvailability) ** (1 + picked.replicas);
  const appAvailability = 1 - (1 - constants.serverAvailability) ** picked.servers;
  const regionAvailability = constants.balancerAvailability * appAvailability * shardAvailability ** picked.shards;
  const availability = 1 - (1 - regionAvailability) ** picked.regions;

  const replicaCost = Math.round(db.cost * constants.replicaCostShare * picked.replicas * 10) / 10;
  const cost = round(((web.cost * picked.servers) + cache.cost + (db.cost + replicaCost) * picked.shards
    + (picked.queue ? constants.queueCost + picked.workers * constants.workerCost : 0)) * picked.regions, 1);

  const met = {
    latency:Number.isFinite(latency) && latency <= scenario.slo.p99Ms,
    availability:availability >= scenario.slo.availability,
    budget:cost <= scenario.slo.budget,
    capacity:saturated.length === 0
  };
  const success = Object.values(met).every(Boolean);

  const bottleneck = saturated.length ? saturated[0]
    : [['edge nodes', appTail], ['datastore reads', hitRatio < 0.99 ? readTail : 0], [picked.queue ? 'write queue' : 'datastore writes', writePath]]
      .sort((a, b) => b[1] - a[1])[0][0];

  return {
    scenario, design:picked, success, met, saturated, bottleneck,
    cost,
    hitRatio:round(hitRatio, 4),
    reads:round(reads, 1), writes:round(writes, 1), databaseReads:round(databaseReads, 1),
    utilisation:{app:round(utilisation.app, 4), read:round(utilisation.read, 4), write:round(utilisation.write, 4)},
    latencyMs:Number.isFinite(latency) ? round(latency, 2) : null,
    breakdown:{
      balancer:constants.balancerMs,
      app:Number.isFinite(appTail) ? round(appTail, 2) : null,
      read:Number.isFinite(readPath) ? round(readPath, 2) : null,
      write:Number.isFinite(writePath) ? round(writePath, 2) : null
    },
    availability,
    availabilityText:availabilityText(availability),
    downtimeMinutes:round((1 - availability) * constants.minutesPerMonth, 4),
    downtimeText:downtimeText((1 - availability) * constants.minutesPerMonth),
    consistency:picked.queue ? 'Writes are acknowledged before they are stored: readers can see stale data until a worker drains the queue.' : 'Writes are acknowledged only once the datastore has them.',
    capacityHeadroom:{
      app:round(capacity.app * picked.servers * perRegion, 0),
      read:round(capacity.read * readNodes * perRegion, 0),
      write:round((picked.queue ? picked.workers * constants.workerRps : capacity.write * writeNodes) * perRegion, 0)
    },
    message:message({success, met, saturated, scenario, cost, latency, availability, bottleneck})
  };
}

function message({success, met, saturated, scenario, cost, latency, availability, bottleneck}) {
  if (success) return `Contract met: ${round(latency, 1)} ms at the 99th percentile, ${availabilityText(availability)} available, ${cost} credits of ${scenario.slo.budget}.`;
  if (saturated.length) return `Overloaded: ${saturated.join(' and ')} receive more work than they can serve, so the queue grows without limit. Add capacity there.`;
  if (!met.latency) return `Too slow: ${round(latency, 1)} ms at the 99th percentile against a ${scenario.slo.p99Ms} ms target. The slowest stage is ${bottleneck}.`;
  if (!met.availability) return `Not available enough: ${availabilityText(availability)} against a ${(scenario.slo.availability * 100).toFixed(4)}% target. Redundancy inside a tier helps; another tier in series hurts.`;
  return `Over budget by ${round(cost - scenario.slo.budget, 1)} credits. Something in this design is paid for but not needed.`;
}

// Used by the tests and by the lab's hint: the cheapest design that meets a
// contract, found by enumerating the option space. Latency, capacity, and
// availability only improve as nodes are added, while cost only rises, so the
// best candidate for one configuration is the smallest node count that meets
// the non-cost targets; a binary search finds it in five evaluations.
export function search(scenarioIndex) {
  const scenario = scenarios[scenarioIndex];
  let best = null;
  const consider = design => {
    const result = evaluateArchitecture(design, scenarioIndex);
    if (result.success && (!best || result.cost < best.cost)) best = {design, cost:result.cost, latencyMs:result.latencyMs, availability:result.availability};
  };
  for (let web = 0; web < catalog.web.length; web++)
  for (let db = 0; db < catalog.db.length; db++)
  for (let cache = 0; cache < catalog.cache.length; cache++)
  for (const replicas of replicaOptions)
  for (const shards of (scenario.allow.shards === false ? [1] : shardOptions))
  for (const regions of (scenario.allow.regions === false ? [1] : regionOptions))
  for (const queue of (scenario.allow.queue === false ? [false] : [false, true]))
  for (let workers = 0; workers <= (queue ? maxWorkers : 0); workers++) {
    const configuration = {web, db, cache, replicas, shards, regions, queue, workers};
    let low = 1, high = maxServers, smallest = null;
    while (low <= high) {
      const servers = Math.floor((low + high) / 2);
      const {met} = evaluateArchitecture({...configuration, servers}, scenarioIndex);
      if (met.latency && met.availability && met.capacity) { smallest = servers; high = servers - 1; }
      else low = servers + 1;
    }
    if (smallest !== null) consider({...configuration, servers:smallest});
  }
  return best;
}

// ------------------------------------------------- back-of-the-envelope

// Estimation missions state their givens and name the arithmetic. The model
// computes the answer, so a mission cannot ship an expectation that disagrees
// with its own numbers — the tests check exactly that.
export const estimators = {
  peakRequestsPerSecond:{
    label:'peak requests per second',
    unit:'req/s',
    needs:['dailyRequests', 'peakMultiplier'],
    of:({dailyRequests, peakMultiplier}) => (dailyRequests / 86400) * peakMultiplier,
    explain:({dailyRequests, peakMultiplier}) =>
      `${dailyRequests.toLocaleString('en-US')} a day ÷ 86,400 seconds is the average; traffic peaks at ${peakMultiplier}× the average, and capacity is sized for the peak.`
  },
  storagePerDayGb:{
    label:'new storage per day',
    unit:'GB/day',
    needs:['dailyRequests', 'bytesPerRecord'],
    of:({dailyRequests, bytesPerRecord}) => (dailyRequests * bytesPerRecord) / 1e9,
    explain:({dailyRequests, bytesPerRecord}) =>
      `${dailyRequests.toLocaleString('en-US')} records × ${bytesPerRecord} bytes. Storage is quoted in powers of ten, so divide by 10^9.`
  },
  storagePerYearTb:{
    label:'storage after a year, with replicas',
    unit:'TB',
    needs:['dailyRequests', 'bytesPerRecord', 'copies'],
    of:({dailyRequests, bytesPerRecord, copies}) => (dailyRequests * bytesPerRecord * 365 * copies) / 1e12,
    explain:({copies}) => `A year is 365 days, and every byte is stored ${copies} times for durability. Replicas are the factor people forget.`
  },
  egressPerMonthTb:{
    label:'egress per month',
    unit:'TB',
    needs:['dailyRequests', 'responseBytes'],
    of:({dailyRequests, responseBytes}) => (dailyRequests * responseBytes * 30) / 1e12,
    explain:({responseBytes}) => `Every request sends ${responseBytes.toLocaleString('en-US')} bytes back. Egress is usually the line on the bill nobody estimated.`
  },
  serversForPeak:{
    label:'servers needed at the peak',
    unit:'servers',
    needs:['dailyRequests', 'peakMultiplier', 'rpsPerServer', 'headroom'],
    of:({dailyRequests, peakMultiplier, rpsPerServer, headroom}) =>
      Math.ceil(((dailyRequests / 86400) * peakMultiplier) / (rpsPerServer * headroom)),
    explain:({rpsPerServer, headroom}) =>
      `Each server handles ${rpsPerServer} req/s, and running one at 100% queues without limit, so size for ${Math.round(headroom * 100)}% of its capacity.`
  }
};

// Which option a given estimate belongs to: the closest one on a log scale,
// because an estimate is right when it has the right order of magnitude.
export function nearestEstimate(value, options) {
  let best = 0;
  let distance = Infinity;
  options.forEach((option, index) => {
    const gap = Math.abs(Math.log10(Math.max(option.value, 1e-9)) - Math.log10(Math.max(value, 1e-9)));
    if (gap < distance) { distance = gap; best = index; }
  });
  return best;
}

// ------------------------------------------------------- error budgets

// An availability objective is a licence to be down for a while. What is left of
// that licence, not whether the last month was perfect, is what decides whether a
// risky change ships today.
export function errorBudget({objective, windowMinutes = constants.minutesPerMonth, incidents = []}) {
  if (!(objective > 0 && objective < 1)) throw new DesignError('An availability objective is a fraction between 0 and 1.');
  const allowedMinutes = (1 - objective) * windowMinutes;
  const spentMinutes = incidents.reduce((total, incident) => total + incident.minutes * (incident.share ?? 1), 0);
  const remainingMinutes = allowedMinutes - spentMinutes;
  const achieved = 1 - spentMinutes / windowMinutes;
  return {
    objective, windowMinutes, incidents,
    allowedMinutes:round(allowedMinutes, 2),
    spentMinutes:round(spentMinutes, 2),
    remainingMinutes:round(remainingMinutes, 2),
    spentFraction:round(spentMinutes / allowedMinutes, 4),
    achieved:round(achieved, 6),
    achievedText:availabilityText(achieved),
    exhausted:remainingMinutes <= 0,
    // The policy this game uses, stated so a mission can be checked against it.
    verdict:remainingMinutes <= 0 ? 'freeze'
      : spentMinutes / allowedMinutes >= 0.75 ? 'slow-down'
      : 'ship'
  };
}

// ------------------------------------------------------------- caching
//
// A cache is a copy, and every copy is a decision about how wrong you are
// willing to be and for how long. The hit ratio decides what it saves; the
// invalidation decides what it costs you in correctness.
export function cacheRun({reads, writes, hotFraction = 0.8, coldReuse = 0.2,
  strategy = 'aside', ttlSeconds = 60, invalidateOnWrite = false, warm = true,
  storeCapacityRps, storeLatencyMs = 20, cacheLatencyMs = 1, batchFactor = 0.1}) {
  if (!['aside', 'through', 'behind', 'none'].includes(strategy)) throw new DesignError('Read around the cache, write through it, write behind it, or do not cache.');
  if (!(ttlSeconds >= 0)) throw new DesignError('A time-to-live is a number of seconds.');

  // How often a read finds what it wants. The hot keys are re-read inside almost
  // any window; the cold tail is only kept if the window is long enough to hold
  // it, which is what makes a longer time-to-live worth something.
  const windowFactor = Math.min(1, ttlSeconds / 60);
  const hitRatio = strategy === 'none' ? 0
    : round(hotFraction * (warm ? 1 : 0.5) + (1 - hotFraction) * coldReuse * windowFactor, 3);
  const readsToStore = reads * (1 - hitRatio);
  // Write-through writes both places before acknowledging. Write-behind
  // acknowledges from the cache and batches to the store, which is why it is
  // both the cheapest and the only one that can lose an acknowledged write.
  const writesToStore = strategy === 'behind' ? writes * batchFactor : writes;
  const storeLoad = readsToStore + writesToStore;

  // How long a reader can see a value that is no longer true.
  const stalenessSeconds = strategy === 'none' || strategy === 'through' ? 0
    : invalidateOnWrite ? 0
    : ttlSeconds;
  // What a write costs the caller. Through pays for both hops; behind pays for
  // the cache alone; aside and none pay the store.
  const writeLatencyMs = strategy === 'through' ? storeLatencyMs + cacheLatencyMs
    : strategy === 'behind' ? cacheLatencyMs
    : storeLatencyMs;
  const readLatencyMs = round(hitRatio * cacheLatencyMs + (1 - hitRatio) * storeLatencyMs, 2);
  return {
    strategy, ttlSeconds, invalidateOnWrite, warm,
    hitRatio,
    readsToStore:Math.round(readsToStore),
    writesToStore:Math.round(writesToStore),
    storeLoad:Math.round(storeLoad),
    storeCapacityRps,
    overloaded:storeCapacityRps !== undefined && storeLoad > storeCapacityRps,
    saved:round(1 - storeLoad / (reads + writes), 3),
    stalenessSeconds,
    writeLatencyMs, readLatencyMs,
    // Losing the cache sends every read to the store at once, which is the
    // failure people meet the first time they restart one under load.
    coldStoreLoad:Math.round(reads + writes),
    survivesCold:storeCapacityRps === undefined || reads + writes <= storeCapacityRps,
    canLoseWrites:strategy === 'behind'
  };
}

// ------------------------------------------------- queues and backpressure
//
// A queue between a fast producer and a slow consumer does not make the consumer
// faster. It decides what happens to the difference: waiting, or refused.
export function queueRun({arrivals, serviceRatePerWorker, workers, capacity, whenFull = 'shed', minutes = 30}) {
  if (!(workers >= 0)) throw new DesignError('A queue needs a whole number of workers.');
  if (!['shed', 'block', 'grow'].includes(whenFull)) throw new DesignError('A full queue sheds, blocks, or grows.');
  const rate = serviceRatePerWorker * workers;
  const steps = [];
  let depth = 0, shed = 0, blocked = 0;
  for (let minute = 0; minute < minutes; minute++) {
    const arriving = typeof arrivals === 'function' ? arrivals(minute) : arrivals;
    const served = Math.min(depth + arriving, rate * 60);
    let next = depth + arriving - served;
    let lostHere = 0;
    if (whenFull !== 'grow' && next > capacity) {
      lostHere = next - capacity;
      next = capacity;
      if (whenFull === 'shed') shed += lostHere; else blocked += lostHere;
    }
    depth = next;
    steps.push({minute, arriving, served, depth:Math.round(depth), lost:Math.round(lostHere)});
  }
  const peak = Math.max(...steps.map(step => step.depth));
  // How long the last item in the queue waits, at the end of the window, and at
  // the worst of it. Depth over drain rate is the age of the thing at the back,
  // which is the number worth alerting on: a queue is useful only while what
  // comes out of it is still wanted.
  const waitSeconds = rate > 0 ? round(depth / rate, 1) : Infinity;
  const peakWaitSeconds = rate > 0 ? round(peak / rate, 1) : Infinity;
  return {
    workers, rate, capacity, whenFull, steps,
    peakDepth:Math.round(peak),
    finalDepth:Math.round(depth),
    shed:Math.round(shed),
    blocked:Math.round(blocked),
    waitSeconds, peakWaitSeconds,
    // A backlog that is still growing at the end never drains: the consumer is
    // slower than the producer and no amount of queue changes that.
    drains:steps.at(-1).depth <= steps[Math.floor(steps.length / 2)].depth,
    recovered:depth < capacity * 0.05
  };
}

// --------------------------------------------- retries, budgets and breakers
//
// A dependency slows down, every caller retries, and the load on the thing that
// was already struggling goes up rather than down. The retry is the outage.
export function retryRun({callers, dependencyCapacity, failureRate, policy = 'immediate',
  attempts = 3, breaker = false, rounds = 12}) {
  if (!['none', 'immediate', 'backoff', 'jitter'].includes(policy)) throw new DesignError('Retry never, at once, with backoff, or with backoff and jitter.');
  if (!(attempts >= 1)) throw new DesignError('At least one attempt has to be made.');
  const tries = policy === 'none' ? 1 : attempts;
  // Where the retries land. Immediate puts them all in the next round, which is
  // what makes a storm; backoff spreads them over several; jitter also spreads
  // them across callers, so they stop arriving as one synchronised wave.
  const spread = policy === 'immediate' ? 1 : policy === 'backoff' ? 0.5 : 0.25;
  const steps = [];
  let open = false, carried = 0, worstLoad = 0, satisfied = 0;

  for (let round = 0; round < rounds; round++) {
    // Callers are finite and each gives up after its attempts, so the offered
    // load has a ceiling however badly the policy behaves.
    const wanted = Math.min(callers * tries, callers + carried);
    // A breaker that has tripped refuses most calls itself, which is the point:
    // it turns a dependency that is failing slowly into one that fails fast.
    const offered = open ? Math.min(wanted, callers * 0.1) : wanted;
    const served = Math.min(offered, dependencyCapacity);
    const rejected = offered - served;
    const errored = served * failureRate;
    const good = served - errored;
    // What the callers actually wanted this round, and how much of it they got.
    satisfied += Math.min(1, good / callers);
    const load = round2(offered / dependencyCapacity);
    worstLoad = Math.max(worstLoad, load);
    if (breaker) open = load > 1.2 ? true : load < 0.7 ? false : open;
    carried = (rejected + errored) * (tries - 1) * spread;
    steps.push({round, offered:Math.round(offered), served:Math.round(served), failed:Math.round(rejected + errored), load, breakerOpen:open});
  }
  const last = steps.at(-1);
  return {
    policy, attempts:tries, breaker, steps,
    peakLoad:round2(worstLoad),
    finalLoad:last.load,
    // What fraction of what the callers asked for actually got an answer.
    successRate:round2(satisfied / rounds),
    overloaded:worstLoad > 1,
    recovered:last.load <= 1,
    // Offered load as a multiple of what it would have been with no retries.
    amplified:round2(worstLoad / (callers / dependencyCapacity))
  };
}

const round2 = value => Math.round(value * 100) / 100;
