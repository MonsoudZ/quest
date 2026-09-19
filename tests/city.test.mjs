import test from 'node:test';
import assert from 'node:assert/strict';
import {evaluateCity, scenarios, scenarioDistricts, districts, technologies, referenceDesigns, blocksBetween, grid, CityError} from '../dist/city.js';

const byId = id => districts.find(district => district.id === id);
const design = id => ({links:referenceDesigns[id].map(link => ({...link}))});
const index = id => scenarios.findIndex(scenario => scenario.id === id);
const metric = tech => Math.max(1, 10000 / technologies.find(technology => technology.id === tech).capacityMbps);

test('the map is coherent: every district sits on the grid and has a distinct place', () => {
  const seen = new Set();
  for (const district of districts) {
    assert.ok(district.x >= 0 && district.x < grid.columns, `${district.id} is off the grid`);
    assert.ok(district.y >= 0 && district.y < grid.rows, `${district.id} is off the grid`);
    const cell = `${district.x},${district.y}`;
    assert.ok(!seen.has(cell), `two districts share cell ${cell}`);
    seen.add(cell);
    assert.ok(district.name && district.note, `${district.id} needs a name and a note`);
  }
  assert.ok(districts.some(district => district.id === 'uplink'));
});

test('every contract is met by the design it ships, and by nothing at all', () => {
  scenarios.forEach((scenario, position) => {
    assert.ok(referenceDesigns[scenario.id], `${scenario.id} has no reference design`);
    const result = evaluateCity(design(scenario.id), position);
    assert.equal(result.success, true, `${scenario.id}: ${result.message}`);
    assert.ok(result.cost <= scenario.budget, `${scenario.id} reference design is over budget`);
    assert.equal(evaluateCity({links:[]}, position).success, false, `${scenario.id} is won by an empty city`);
    assert.match(evaluateCity({links:[]}, position).message, /Lay some cable/);
    assert.ok(scenario.name?.length > 8, `${scenario.id} needs a name`);
    for (const field of ['brief', 'teaches']) assert.ok(scenario[field]?.length > 40, `${scenario.id} needs a ${field}`);
  });
});

test('routing picks the path a router would, checked against every simple path', () => {
  for (const scenario of scenarios) {
    const position = index(scenario.id);
    const result = evaluateCity(design(scenario.id), position);
    const list = scenarioDistricts(scenario);
    const links = result.links;
    // Enumerate every simple path to the uplink and take the best by the same
    // rule the model claims to use: lowest total metric, then lowest delay.
    const best = new Map();
    const walk = (node, visited, used, cost, delay) => {
      if (node === 'uplink') {
        const known = best.get(visited[0]);
        if (!known || cost < known.cost - 1e-9 || (Math.abs(cost - known.cost) < 1e-9 && delay < known.delay - 1e-9)) {
          best.set(visited[0], {cost, delay, hops:used.length});
        }
        return;
      }
      links.forEach((link, position) => {
        if (used.includes(position)) return;
        const next = link.from === node ? link.to : link.to === node ? link.from : null;
        if (!next || visited.includes(next)) return;
        walk(next, [...visited, next], [...used, position], cost + metric(link.tech), delay + link.propagationMs);
      });
    };
    for (const district of list) {
      if (district.id === 'uplink') continue;
      walk(district.id, [district.id], [], 0, 0);
      const row = result.districts.find(entry => entry.id === district.id);
      const reference = best.get(district.id);
      assert.equal(Boolean(row.path), Boolean(reference), `${scenario.id}/${district.id} reachability`);
      if (!reference) continue;
      const cost = row.path.reduce((total, position) => total + metric(links[position].tech), 0);
      const delay = row.path.reduce((total, position) => total + links[position].propagationMs, 0);
      assert.ok(Math.abs(cost - reference.cost) < 1e-9, `${scenario.id}/${district.id}: routed at metric ${cost}, best is ${reference.cost}`);
      assert.ok(delay <= reference.delay + 1e-9, `${scenario.id}/${district.id}: equal-cost tie not broken by delay`);
      assert.equal(row.hops, row.path.length);
    }
  }
});

test('no link carries more than its capacity, and a starved district always has a full link on its path', () => {
  for (const scenario of scenarios) {
    const position = index(scenario.id);
    for (const candidate of [design(scenario.id), {links:referenceDesigns[scenario.id].map(link => ({...link, tech:'microwave'})).filter(link => blocksBetween(byId(link.from), byId(link.to)) <= 14)}]) {
      let result;
      try { result = evaluateCity(candidate, position); } catch { continue; }
      for (const link of result.links) {
        assert.ok(link.loadMbps <= link.capacityMbps + 1e-6, `${scenario.id}: a link carries ${link.loadMbps} of ${link.capacityMbps}`);
      }
      for (const row of result.districts.filter(entry => entry.demandMbps && entry.connected)) {
        if (row.satisfaction >= 1 - 1e-9) continue;
        const saturated = row.path.some(link => result.links[link].utilisation >= 0.999);
        assert.ok(saturated, `${scenario.id}/${row.id} is starved but no link on its path is full`);
      }
    }
  }
});

test('bandwidth is shared max-min fairly, on a case with a hand-computed answer', () => {
  // Everyone leaves through one cable out of the market deck. Demands are
  // 300, 500, 250 and 400, so 1,450 Mbps wants to cross it.
  const spurs = [
    {from:'habitat', to:'market', tech:'microwave'},
    {from:'labs', to:'market', tech:'microwave'},
    {from:'dock', to:'market', tech:'microwave'}
  ];
  // A 600 Mbps exit: an equal share is 150, and everybody wants more than that.
  const narrow = evaluateCity({links:[...spurs, {from:'market', to:'uplink', tech:'microwave'}]}, 0);
  assert.deepEqual(Object.fromEntries(narrow.districts.map(row => [row.id, row.deliveredMbps])),
    {uplink:0, habitat:150, labs:150, dock:150, market:150, relay:0});
  assert.equal(narrow.deliveredMbps, 600);
  assert.equal(narrow.met.delivered, false);

  // A 1,000 Mbps exit: the share rises to 250, which satisfies the dock exactly
  // and still leaves the other three short.
  const wider = evaluateCity({links:[...spurs, {from:'market', to:'uplink', tech:'copper'}]}, 0);
  assert.deepEqual(Object.fromEntries(wider.districts.map(row => [row.id, row.deliveredMbps])),
    {uplink:0, habitat:250, labs:250, dock:250, market:250, relay:0});
  assert.equal(wider.deliveredMbps, 1000);
  assert.equal(wider.districts.find(row => row.id === 'dock').satisfaction, 1);

  // A fibre exit has room for all of it.
  const roomy = evaluateCity({links:[...spurs, {from:'market', to:'uplink', tech:'fibre'}]}, 0);
  assert.equal(roomy.deliveredMbps, 1450);
  assert.ok(roomy.districts.filter(row => row.demandMbps).every(row => row.satisfaction === 1));
});

test('a cut isolates exactly the districts an independent search says it does', () => {
  for (const scenario of scenarios) {
    const position = index(scenario.id);
    const links = referenceDesigns[scenario.id];
    const result = evaluateCity({links}, position);
    const customers = scenarioDistricts(scenario).filter(district => district.demandMbps > 0).map(district => district.id);
    links.forEach((_, cut) => {
      const remaining = links.filter((__, other) => other !== cut);
      const reached = new Set(['uplink']);
      for (let pass = 0; pass < remaining.length + 1; pass++) {
        for (const link of remaining) {
          if (reached.has(link.from)) reached.add(link.to);
          if (reached.has(link.to)) reached.add(link.from);
        }
      }
      const isolated = customers.filter(id => !reached.has(id)).sort();
      const reported = (result.cuts.find(entry => entry.link === cut)?.isolated ?? []).slice().sort();
      assert.deepEqual(reported, isolated, `${scenario.id}: cutting ${links[cut].from}–${links[cut].to}`);
    });
  }
});

test('cost is the sum of distance times the technology price', () => {
  for (const scenario of scenarios) {
    const result = evaluateCity(design(scenario.id), index(scenario.id));
    const expected = referenceDesigns[scenario.id].reduce((total, link) => {
      const technology = technologies.find(entry => entry.id === link.tech);
      return total + Math.round(blocksBetween(byId(link.from), byId(link.to)) * technology.costPerBlock);
    }, 0);
    assert.equal(result.cost, expected, scenario.id);
  }
});

test('each contract fails when the technique it teaches is taken away', () => {
  // Peak hour: a microwave trunk reaches, but it cannot carry the aggregate.
  const peak = index('peak-hour');
  const downgraded = design('peak-hour');
  assert.equal(downgraded.links[0].from, 'relay');
  downgraded.links[0].tech = 'microwave';
  const thin = evaluateCity(downgraded, peak);
  assert.equal(thin.success, false);
  assert.equal(thin.met.delivered, false, 'a 600 Mbps trunk should not carry peak hour');
  assert.ok(thin.peakUtilisation >= 0.999);

  // Resilience: drop the three backup links and one cut isolates somebody.
  const resilient = index('no-single-point');
  const withoutBackup = {links:referenceDesigns['no-single-point'].filter(link => link.tech !== 'microwave')};
  const fragile = evaluateCity(withoutBackup, resilient);
  assert.equal(fragile.met.resilient, false);
  assert.ok(fragile.cuts.length > 0);
  assert.match(fragile.message, /go dark|Cut the/);
  assert.equal(evaluateCity(design('no-single-point'), resilient).met.resilient, true);

  // The medical bay: the reference design meets the latency target, and routing
  // the bay the long way round the city makes its round trip worse.
  const medical = index('the-medical-bay');
  const target = scenarios[medical].targets.latency;
  const direct = evaluateCity(design('the-medical-bay'), medical);
  const straight = direct.districts.find(row => row.id === target.district);
  assert.equal(direct.met.latency, true);
  assert.ok(straight.roundTripMs <= target.ms);
  const detoured = evaluateCity({links:[
    {from:'market', to:'uplink', tech:'fibre'},
    {from:'labs', to:'market', tech:'fibre'},
    {from:'habitat', to:'labs', tech:'fibre'},
    {from:'foundry', to:'habitat', tech:'fibre'},
    {from:'dock', to:'foundry', tech:'fibre'},
    {from:'medbay', to:'dock', tech:'fibre'}
  ]}, medical);
  const long = detoured.districts.find(row => row.id === target.district);
  assert.ok(long.hops > straight.hops, 'the detour should add hops');
  assert.ok(long.roundTripMs > straight.roundTripMs, 'more hops should cost more time');

  // Queueing, not distance, is what actually breaks the target: load the short
  // path until the cable is nearly full and the same two hops take longer.
  const congested = evaluateCity({links:[
    {from:'market', to:'uplink', tech:'copper'},
    {from:'medbay', to:'market', tech:'fibre'},
    {from:'labs', to:'market', tech:'fibre'},
    {from:'habitat', to:'labs', tech:'fibre'},
    {from:'foundry', to:'habitat', tech:'fibre'},
    {from:'dock', to:'medbay', tech:'copper'}
  ]}, medical);
  const queued = congested.districts.find(row => row.id === target.district);
  assert.equal(queued.hops, straight.hops, 'same path length');
  assert.ok(queued.roundTripMs > straight.roundTripMs * 2, `queueing should dominate: ${queued.roundTripMs} vs ${straight.roundTripMs}`);
  assert.equal(congested.met.latency, false);

  // The capstone: a single exit survives the cut test connectivity-wise but not
  // the share of traffic that still arrives.
  const capstone = index('the-city-grows');
  const oneExit = {links:referenceDesigns['the-city-grows'].filter(link => !(link.from === 'market' && link.to === 'uplink'))};
  const narrow = evaluateCity(oneExit, capstone);
  assert.equal(narrow.success, false);
});

test('invalid cities are refused rather than scored', () => {
  assert.throws(() => evaluateCity({links:[{from:'habitat', to:'habitat', tech:'fibre'}]}, 0), /two different districts/);
  assert.throws(() => evaluateCity({links:[{from:'habitat', to:'uplink', tech:'copper'}]}, 0), /Copper reaches/);
  assert.throws(() => evaluateCity({links:[{from:'habitat', to:'relay', tech:'string'}]}, 0), /no link technology/);
  assert.throws(() => evaluateCity({links:[{from:'habitat', to:'atlantis', tech:'fibre'}]}, 0), CityError);
  assert.throws(() => evaluateCity({links:[{from:'medbay', to:'relay', tech:'fibre'}]}, 0), /does not have/);
  assert.throws(() => evaluateCity({links:[
    {from:'habitat', to:'relay', tech:'fibre'},
    {from:'relay', to:'habitat', tech:'copper'}
  ]}, 0), /already connected/);
  assert.throws(() => evaluateCity({links:[]}, 99), /valid contract/);
});

test('evaluation is pure: the same city scores the same, and the design is not modified', () => {
  const first = design('the-city-grows');
  const snapshot = JSON.stringify(first);
  const position = index('the-city-grows');
  const a = evaluateCity(first, position);
  const b = evaluateCity(first, position);
  assert.equal(JSON.stringify(first), snapshot, 'the design was mutated');
  assert.equal(a.cost, b.cost);
  assert.equal(a.message, b.message);
  assert.deepEqual(a.links, b.links);
  assert.deepEqual(a.districts, b.districts);
});

test('a longer path is preferred when it is the faster one, which is what the metric is for', () => {
  // Microwave is cheap and reaches, but its metric is the worst, so traffic
  // takes the two-hop fibre route instead of the one-hop microwave route.
  const result = evaluateCity({links:[
    {from:'habitat', to:'uplink', tech:'microwave'},
    {from:'habitat', to:'relay', tech:'fibre'},
    {from:'relay', to:'uplink', tech:'fibre'},
    {from:'labs', to:'relay', tech:'fibre'},
    {from:'dock', to:'relay', tech:'fibre'},
    {from:'market', to:'relay', tech:'fibre'}
  ]}, 0);
  const habitat = result.districts.find(row => row.id === 'habitat');
  assert.equal(habitat.hops, 2, 'the fibre pair should beat the single microwave hop');
  assert.equal(result.links[0].loadMbps, 0, 'the microwave link should carry nothing while the fibre path is up');
  assert.equal(habitat.satisfaction, 1);
});
