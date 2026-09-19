import test from 'node:test';
import assert from 'node:assert/strict';
import {catalog, scenarios, shardOptions, replicaOptions, regionOptions, maxServers, maxWorkers, modelConstants, defaultDesign, evaluateArchitecture, search, DesignError, estimators, nearestEstimate, errorBudget} from '../dist/systems.js';

const design = update => ({...defaultDesign, ...update});

test('every contract is solvable, and the starting design solves none of them', () => {
  scenarios.forEach((scenario, index) => {
    const best = search(index);
    assert.ok(best, `${scenario.id} has no working design`);
    assert.ok(best.cost <= scenario.slo.budget, `${scenario.id} cheapest design is over budget`);
    const verified = evaluateArchitecture(best.design, index);
    assert.equal(verified.success, true, `${scenario.id}: ${verified.message}`);
    assert.equal(evaluateArchitecture(defaultDesign, index).success, false, `${scenario.id} is solved by the default design`);
  });
});

test('each contract makes the technique it teaches necessary', () => {
  const cheapest = (index, filter) => {
    const scenario = scenarios[index];
    let best = null;
    for (let web = 0; web < catalog.web.length; web++)
    for (let db = 0; db < catalog.db.length; db++)
    for (let cache = 0; cache < catalog.cache.length; cache++)
    for (const replicas of replicaOptions)
    for (const shards of (scenario.allow.shards === false ? [1] : shardOptions))
    for (const regions of (scenario.allow.regions === false ? [1] : regionOptions))
    for (let servers = 1; servers <= maxServers; servers++) {
      const candidate = {web, db, cache, replicas, shards, regions, queue:false, workers:0, servers};
      if (!filter(candidate)) continue;
      const result = evaluateArchitecture(candidate, index);
      if (result.success && (!best || result.cost < best)) best = result.cost;
    }
    return best;
  };
  // The read storm cannot be served without a cache, nor without a replica.
  assert.equal(cheapest(1, candidate => candidate.cache === 0), null);
  assert.equal(cheapest(1, candidate => candidate.replicas === 0), null);
  // Write pressure cannot be served by one primary.
  assert.equal(cheapest(2, candidate => candidate.shards === 1), null);
  // Four nines needs redundancy inside the tier and more than one region.
  assert.equal(cheapest(3, candidate => candidate.replicas === 0), null);
  assert.equal(cheapest(3, candidate => candidate.regions === 1), null);
  // The capstone is cheapest with the big cache, and impossible without replicas.
  assert.equal(cheapest(4, candidate => candidate.replicas === 0), null);
  assert.ok(cheapest(4, candidate => candidate.cache >= 2) < cheapest(4, candidate => candidate.cache === 0));
});

test('the reference design the lab offers is the cheapest one that exists', () => {
  // An exhaustive scan with no early exit, to check the one search() takes.
  for (const index of [0, 1, 3]) {
    const scenario = scenarios[index];
    let cheapest = null;
    for (let web = 0; web < catalog.web.length; web++)
    for (let db = 0; db < catalog.db.length; db++)
    for (let cache = 0; cache < catalog.cache.length; cache++)
    for (const replicas of replicaOptions)
    for (const shards of (scenario.allow.shards === false ? [1] : shardOptions))
    for (const regions of (scenario.allow.regions === false ? [1] : regionOptions))
    for (const queue of (scenario.allow.queue === false ? [false] : [false, true]))
    for (let workers = 0; workers <= (queue ? maxWorkers : 0); workers++)
    for (let servers = 1; servers <= maxServers; servers++) {
      const result = evaluateArchitecture({web, db, cache, replicas, shards, regions, queue, workers, servers}, index);
      if (result.success && (cheapest === null || result.cost < cheapest)) cheapest = result.cost;
    }
    assert.equal(search(index).cost, cheapest, scenario.id);
  }
});

test('invalid designs and contracts are refused rather than scored', () => {
  assert.throws(() => evaluateArchitecture(design({web:9}), 0), DesignError);
  assert.throws(() => evaluateArchitecture(design({servers:0}), 0), /between 1 and/);
  assert.throws(() => evaluateArchitecture(design({servers:maxServers + 1}), 0), /between 1 and/);
  assert.throws(() => evaluateArchitecture(design({replicas:3}), 0), /supported replica count/);
  assert.throws(() => evaluateArchitecture(design({shards:3}), 2), /supported shard count/);
  assert.throws(() => evaluateArchitecture(design({}), 99), /valid contract/);
  // Contracts gate the techniques they have not taught yet.
  assert.throws(() => evaluateArchitecture(design({queue:true, workers:1}), 0), /does not allow an asynchronous write queue/);
  assert.throws(() => evaluateArchitecture(design({shards:2}), 0), /does not allow sharding/);
  assert.throws(() => evaluateArchitecture(design({regions:2}), 0), /single region/);
  assert.throws(() => evaluateArchitecture(design({workers:maxWorkers + 1, queue:true}), 2), /between 0 and/);
});

test('a saturated tier is reported as overloaded instead of as a latency number', () => {
  const result = evaluateArchitecture(design({servers:1, web:0}), 1);
  assert.equal(result.latencyMs, null);
  assert.deepEqual(result.saturated.includes('edge nodes'), true);
  assert.match(result.message, /Overloaded/);
  assert.equal(result.success, false);
});

test('adding capacity only ever lowers latency, and the queueing curve is steep near saturation', () => {
  let previous = Infinity;
  for (let servers = 3; servers <= 16; servers++) {
    const result = evaluateArchitecture(design({web:1, servers, db:1, cache:2, replicas:1}), 1);
    if (result.latencyMs === null) continue;
    assert.ok(result.latencyMs <= previous + 1e-9, `${servers} nodes was slower than ${servers - 1}`);
    previous = result.latencyMs;
  }
  const tight = evaluateArchitecture(design({web:1, servers:11, db:1, cache:2, replicas:1}), 1);
  const loose = evaluateArchitecture(design({web:1, servers:22, db:1, cache:2, replicas:1}), 1);
  assert.ok(tight.utilisation.app > loose.utilisation.app);
  assert.ok(tight.latencyMs > loose.latencyMs * 1.5, 'halving utilisation should visibly cut the tail');
});

// The lab claims each tier behaves like an M/M/1 queue. This simulates one with
// a seeded generator and checks the reported 99th percentile against it.
test('the 99th-percentile formula matches a simulated M/M/1 queue', () => {
  // mulberry32: a small generator that stays inside 32-bit integer arithmetic,
  // so the sequence is not distorted by floating-point rounding.
  let seed = 20240917;
  const random = () => {
    seed = (seed + 0x6D2B79F5) | 0;
    let value = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    value = (value + Math.imul(value ^ (value >>> 7), 61 | value)) ^ value;
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
  const exponential = mean => -Math.log(random()) * mean;
  for (const [arrivalRate, serviceRate] of [[800, 1000], [1000, 2000], [400, 500]]) {
    let clock = 0, free = 0;
    const responses = [];
    for (let i = 0; i < 600000; i++) {
      clock += exponential(1 / arrivalRate);
      const start = Math.max(clock, free);
      free = start + exponential(1 / serviceRate);
      responses.push(free - clock);
    }
    responses.sort((a, b) => a - b);
    const simulated = responses[Math.floor(responses.length * 0.99)] * 1000;
    const formula = (Math.log(100) / (serviceRate - arrivalRate)) * 1000;
    assert.ok(Math.abs(simulated - formula) / formula < 0.08, `λ=${arrivalRate} μ=${serviceRate}: simulated ${simulated.toFixed(2)} ms against ${formula.toFixed(2)} ms`);
  }
});

test('availability composes redundancy in parallel and tiers in series', () => {
  const {serverAvailability, primaryAvailability, balancerAvailability} = modelConstants;
  for (const servers of [1, 2, 4]) {
    for (const replicas of replicaOptions) {
      for (const shards of shardOptions) {
        for (const regions of regionOptions) {
          const result = evaluateArchitecture(design({servers, replicas, shards, regions, web:2, db:2, cache:3}), 4);
          const shard = 1 - (1 - primaryAvailability) ** (1 + replicas);
          const region = balancerAvailability * (1 - (1 - serverAvailability) ** servers) * shard ** shards;
          assert.ok(Math.abs(result.availability - (1 - (1 - region) ** regions)) < 1e-12, `${servers}/${replicas}/${shards}/${regions}`);
        }
      }
    }
  }
  // A second region always helps; another shard without more replicas always hurts.
  const single = evaluateArchitecture(design({servers:4, replicas:1, shards:1, regions:1, web:2, db:2}), 4).availability;
  const paired = evaluateArchitecture(design({servers:4, replicas:1, shards:1, regions:2, web:2, db:2}), 4).availability;
  const sharded = evaluateArchitecture(design({servers:4, replicas:1, shards:4, regions:1, web:2, db:2}), 4).availability;
  assert.ok(paired > single);
  assert.ok(sharded < single);
  assert.ok(!evaluateArchitecture(design({servers:4, replicas:1, shards:1, regions:1, web:2, db:2}), 4).availabilityText.startsWith('100'), 'a design with downtime must never read as 100%');
});

test('cost is the sum of what was chosen, multiplied by the regions running it', () => {
  for (const servers of [1, 5, 12]) {
    for (const cache of [0, 2, 3]) {
      for (const shards of shardOptions) {
        for (const replicas of replicaOptions) {
          for (const regions of regionOptions) {
            for (const workers of [0, 3]) {
              const queue = workers > 0;
              const result = evaluateArchitecture(design({web:1, db:1, cache, servers, shards, replicas, regions, queue, workers}), 4);
              const expected = ((catalog.web[1].cost * servers) + catalog.cache[cache].cost
                + (catalog.db[1].cost + Math.round(catalog.db[1].cost * modelConstants.replicaCostShare * replicas * 10) / 10) * shards
                + (queue ? modelConstants.queueCost + workers * modelConstants.workerCost : 0)) * regions;
              assert.ok(Math.abs(result.cost - expected) < 0.051, `${servers}/${cache}/${shards}/${replicas}/${regions}/${workers}`);
            }
          }
        }
      }
    }
  }
});

test('a cache only removes read load, and a queue only removes write latency', () => {
  const withoutCache = evaluateArchitecture(design({web:2, servers:6, db:2, cache:0, replicas:1}), 1);
  const withCache = evaluateArchitecture(design({web:2, servers:6, db:2, cache:2, replicas:1}), 1);
  assert.ok(withCache.databaseReads < withoutCache.databaseReads / 2);
  assert.equal(withoutCache.writes, withCache.writes, 'a cache does not change the write load');
  assert.ok(withCache.utilisation.read < withoutCache.utilisation.read);

  const synchronous = evaluateArchitecture(design({web:2, servers:8, db:2, shards:2, replicas:1, queue:false}), 2);
  const queued = evaluateArchitecture(design({web:2, servers:8, db:2, shards:2, replicas:1, queue:true, workers:6}), 2);
  assert.ok(Number.isFinite(synchronous.breakdown.write), 'this comparison needs an unsaturated write path');
  assert.ok(queued.breakdown.write < synchronous.breakdown.write, 'the queue answers before the datastore does');
  assert.match(queued.consistency, /stale/);
  assert.match(synchronous.consistency, /only once the datastore has them/);
  // A queue does not create write capacity: too few workers is still an overload.
  assert.equal(evaluateArchitecture(design({web:2, servers:8, db:2, shards:2, replicas:1, queue:true, workers:1}), 2).saturated.includes('queue workers'), true);
});

test('the reported hit ratio follows the cache size against the working set, and is capped', () => {
  const scenario = scenarios[1];
  for (let cache = 0; cache < catalog.cache.length; cache++) {
    const result = evaluateArchitecture(design({cache, servers:11, web:1, replicas:1}), 1);
    const expected = catalog.cache[cache].gb === 0 ? 0 : Math.min(modelConstants.maxHitRatio, catalog.cache[cache].gb / scenario.traffic.workingSetGb);
    assert.ok(Math.abs(result.hitRatio - expected) < 1e-4, `${cache}`);
    assert.ok(result.hitRatio <= modelConstants.maxHitRatio);
  }
});

test('every estimator agrees with the arithmetic done by hand', () => {
  const givens = {dailyRequests:86400000, peakMultiplier:3, bytesPerRecord:400, copies:3, responseBytes:12000, rpsPerServer:900, headroom:0.7};
  // Worked out separately from the model, the way it would be on a whiteboard.
  assert.equal(estimators.peakRequestsPerSecond.of(givens), 3000);
  assert.equal(Number(estimators.storagePerDayGb.of(givens).toFixed(3)), 34.56);
  assert.equal(Number(estimators.storagePerYearTb.of(givens).toFixed(3)), 37.843);
  assert.equal(Number(estimators.egressPerMonthTb.of(givens).toFixed(3)), 31.104);
  assert.equal(estimators.serversForPeak.of(givens), 5);
  // Headroom is the difference between a server that works and one that queues.
  assert.equal(estimators.serversForPeak.of({...givens, headroom:1}), 4);
  for (const estimator of Object.values(estimators)) {
    assert.ok(estimator.needs.every(key => key in givens), `${estimator.label} names a given nobody supplies`);
    assert.ok(estimator.explain(givens).length > 40);
  }
});

test('an estimate is scored on its order of magnitude, not its digits', () => {
  const options = [{value:300}, {value:3000}, {value:30000}, {value:300000}];
  assert.equal(nearestEstimate(3000, options), 1);
  assert.equal(nearestEstimate(2400, options), 1, 'a fifth low is still the same answer');
  assert.equal(nearestEstimate(9000, options), 1, 'three times high is nearer 3,000 than 30,000 on a log scale');
  assert.equal(nearestEstimate(11000, options), 2);
  assert.equal(nearestEstimate(1, options), 0);
  assert.equal(nearestEstimate(1e9, options), 3);
});

test('an error budget is spent by outages in proportion to who they hit', () => {
  const month = errorBudget({objective:0.999, incidents:[
    {minutes:18, share:1},
    {minutes:26, share:0.5},
    {minutes:4, share:1}
  ]});
  assert.equal(month.allowedMinutes, 43.2, '0.1% of 43,200 minutes');
  assert.equal(month.spentMinutes, 35, '18 + 13 + 4');
  assert.equal(month.remainingMinutes, 8.2);
  assert.equal(month.verdict, 'slow-down');
  // The same month reported two ways, which is the mission's whole point.
  assert.match(month.achievedText, /^99\.91/);
  assert.ok(month.spentFraction > 0.75);

  const quiet = errorBudget({objective:0.999, incidents:[{minutes:4, share:1}]});
  assert.equal(quiet.verdict, 'ship');
  assert.equal(quiet.exhausted, false);

  const blown = errorBudget({objective:0.999, incidents:[{minutes:60, share:1}]});
  assert.equal(blown.verdict, 'freeze');
  assert.equal(blown.exhausted, true);
  assert.ok(blown.remainingMinutes < 0);

  // A tighter objective is a smaller licence: four nines is four minutes a month.
  assert.equal(errorBudget({objective:0.9999, incidents:[]}).allowedMinutes, 4.32);
  assert.throws(() => errorBudget({objective:1, incidents:[]}), /between 0 and 1/);
  assert.throws(() => errorBudget({objective:0, incidents:[]}), /between 0 and 1/);
});
