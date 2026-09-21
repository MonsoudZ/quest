// The architecture lab: the second game mode. The model lives in systems.js;
// this file is only the interface for it.
import {reveal} from './ui.js';
import {percent, readStore, writeStore} from './format.js';
import {catalog, scenarios, shardOptions, replicaOptions, regionOptions, maxServers, maxWorkers, modelConstants, defaultDesign, evaluateArchitecture, search} from './systems.js';

const saveKey = 'signal-quest-architecture-v1';
const compact = value => value >= 1000 ? `${(value / 1000).toFixed(value % 1000 === 0 ? 0 : 1)}k` : String(Math.round(value));

const option = (label, note, selected, attributes) =>
  `<button class="component-option ${selected ? 'chosen' : ''}" ${attributes} aria-pressed="${selected}"><span>${label}</span><span>${note}</span></button>`;

const meter = (label, value, detail, warn) => `<div class="util-row ${warn ? 'warn' : ''}">
  <span>${label}</span>
  <div class="util-track"><i style="width:${Math.min(100, Math.round(value * 100))}%"></i></div>
  <strong>${detail}</strong>
</div>`;

export function mountBuilder(container, {onContract = () => {}} = {}) {
  let design = {...defaultDesign};
  let index = 0;
  let completed = [];
  let verdict = null;
  try {
    const saved = readStore(saveKey);
    if (saved) {
      evaluateArchitecture(saved.design, saved.index);
      design = {...defaultDesign, ...saved.design};
      index = saved.index;
      completed = Array.isArray(saved.completed) ? saved.completed.filter(entry => Number.isInteger(entry) && scenarios[entry]) : [];
    }
  } catch { /* a stored design that no longer validates is discarded */ }
  const persist = () => writeStore(saveKey, {design, index, completed});

  function change(update) {
    const next = {...design, ...update};
    try {
      evaluateArchitecture(next, index);
      design = next;
    } catch {
      return;
    }
    verdict = null;
    persist();
    render();
  }

  function render() {
    const scenario = scenarios[index];
    const result = evaluateArchitecture(design, index);
    const web = catalog.web[design.web];
    const db = catalog.db[design.db];
    const allow = scenario.allow;
    const target = scenario.slo;

    container.innerHTML = `
    <div class="mission-heading"><div><div class="eyebrow">ARCHITECTURE LAB · ${completed.length} / ${scenarios.length} CONTRACTS</div><h2>Design the station’s service.</h2></div><span class="concept">System design</span></div>
    <p class="intro">Choose an architecture that meets every target at once: the 99th-percentile latency, the availability, and the budget. Prices, capacities, and failure rates are fictional teaching values, and the model below is an idealisation — its assumptions are listed under the metrics.</p>
    <div class="builder-contract">
      <div>
        <div class="eyebrow">CONTRACT ${index + 1}</div>
        <h3>${scenario.name}</h3>
        <p>${scenario.description}</p>
        <p class="contract-targets"><span>${compact(scenario.traffic.rps)} req/s</span><span>${Math.round(scenario.traffic.readFraction * 100)}% reads</span><span>${scenario.traffic.workingSetGb} GB working set</span><span>p99 ≤ ${target.p99Ms} ms</span><span>≥ ${(target.availability * 100).toFixed(2)}% available</span><span>≤ ${target.budget} credits</span></p>
      </div>
      <label>Choose contract <select id="contract">${scenarios.map((item, i) => `<option value="${i}" ${i === index ? 'selected' : ''}>${i + 1}. ${item.name}${completed.includes(i) ? ' ✓' : ''}</option>`).join('')}</select></label>
    </div>

    <div class="builder-floor">
      <section class="component-bay">
        <div class="eyebrow">TIER 01 · REQUEST HANDLING</div>
        <h3>Edge nodes</h3>
        <strong class="component-capacity">${compact(web.rps * design.servers * design.regions)} <span>req / s served</span></strong>
        <div class="stepper" role="group" aria-label="Edge node count">
          <button data-servers="${Math.max(1, design.servers - 1)}" aria-label="Fewer edge nodes">−</button>
          <span>${design.servers} node${design.servers === 1 ? '' : 's'}${design.regions > 1 ? ' per region' : ''}</span>
          <button data-servers="${Math.min(maxServers, design.servers + 1)}" aria-label="More edge nodes">+</button>
        </div>
        <div class="component-options">${catalog.web.map((item, i) => option(item.name, `${compact(item.rps)} rps · ${item.cost} cr`, design.web === i, `data-web="${i}"`)).join('')}</div>
      </section>

      <section class="component-bay">
        <div class="eyebrow">TIER 02 · DURABLE STATE</div>
        <h3>Datastore</h3>
        <strong class="component-capacity">${compact(db.readRps)} <span>reads/s per node · ${compact(db.writeRps)} writes/s per primary</span></strong>
        <div class="component-options">${catalog.db.map((item, i) => option(item.name, `${item.cost} cr`, design.db === i, `data-db="${i}"`)).join('')}</div>
        <div class="bay-row"><span>Read replicas per shard</span><div class="segmented">${replicaOptions.map(value => option(String(value), '', design.replicas === value, `data-replicas="${value}"`)).join('')}</div></div>
        ${allow.shards === false ? '' : `<div class="bay-row"><span>Shards</span><div class="segmented">${shardOptions.map(value => option(String(value), '', design.shards === value, `data-shards="${value}"`)).join('')}</div></div>`}
      </section>

      <section class="component-bay">
        <div class="eyebrow">TIER 03 · SHED THE LOAD</div>
        <h3>Cache, queue, regions</h3>
        <strong class="component-capacity">${percent(result.hitRatio)} <span>of reads served from cache</span></strong>
        <div class="component-options">${catalog.cache.map((item, i) => option(item.name, item.cost ? `${item.cost} cr` : 'free', design.cache === i, `data-cache="${i}"`)).join('')}</div>
        ${allow.queue === false ? '' : `<div class="bay-row"><span>Write queue</span><div class="segmented">${option('Synchronous', '', !design.queue, 'data-queue="0"')}${option('Queued', '', design.queue, 'data-queue="1"')}</div></div>
        ${design.queue ? `<div class="stepper" role="group" aria-label="Queue workers"><button data-workers="${Math.max(0, design.workers - 1)}" aria-label="Fewer workers">−</button><span>${design.workers} worker${design.workers === 1 ? '' : 's'} · ${compact(design.workers * modelConstants.workerRps)} writes/s</span><button data-workers="${Math.min(maxWorkers, design.workers + 1)}" aria-label="More workers">+</button></div>` : ''}`}
        ${allow.regions === false ? '' : `<div class="bay-row"><span>Regions</span><div class="segmented">${regionOptions.map(value => option(String(value), '', design.regions === value, `data-regions="${value}"`)).join('')}</div></div>`}
      </section>
    </div>

    <div class="builder-metrics">
      <div><span>99th-percentile latency</span><strong class="${result.met.latency ? '' : 'over-budget'}">${result.latencyMs === null ? 'overloaded' : `${result.latencyMs} <small>/ ${target.p99Ms} ms</small>`}</strong></div>
      <div><span>Availability</span><strong class="${result.met.availability ? '' : 'over-budget'}">${result.availabilityText} <small>${result.downtimeText}/month down</small></strong></div>
      <div><span>Monthly cost</span><strong class="${result.met.budget ? '' : 'over-budget'}">${result.cost} <small>/ ${target.budget} cr</small></strong></div>
      <div><span>Slowest stage</span><strong class="bottlenecks">${result.bottleneck}</strong></div>
    </div>

    <div class="lab-detail">
      <section class="panel-block">
        <div class="eyebrow">UTILISATION · ARRIVALS AGAINST CAPACITY</div>
        ${meter('Edge nodes', result.utilisation.app, percent(result.utilisation.app), result.utilisation.app >= 0.85)}
        ${meter('Datastore reads', result.utilisation.read, percent(result.utilisation.read), result.utilisation.read >= 0.85)}
        ${meter(design.queue ? 'Queue workers' : 'Datastore writes', result.utilisation.write, percent(result.utilisation.write), result.utilisation.write >= 0.85)}
        <p class="model-note">${compact(result.reads)} reads/s and ${compact(result.writes)} writes/s arrive. The cache absorbs ${percent(result.hitRatio)} of reads, so ${compact(result.databaseReads)} reads/s reach the datastore. A tier at 100% utilisation has an unbounded queue, which is why latency is reported as overloaded rather than as a number.</p>
      </section>
      <section class="panel-block">
        <div class="eyebrow">WHERE THE 99TH PERCENTILE GOES</div>
        ${['balancer','app','read','write'].map(key => {
          const label = {balancer:'Load balancer', app:'Edge node queueing', read:'Read path', write:design.queue ? 'Write queue' : 'Write path'}[key];
          const value = result.breakdown[key];
          return meter(label, value === null ? 1 : value / Math.max(1, target.p99Ms), value === null ? 'overloaded' : `${value} ms`, value === null);
        }).join('')}
        <p class="model-note">Each tier is modelled as an M/M/1 queue, so its 99th percentile is ln(100) ÷ (capacity − arrivals). The figures are added along the slowest path a request can take. Real percentiles do not add like this, and real arrivals are burstier than this model assumes.</p>
      </section>
    </div>

    <div class="builder-test">
      <button id="benchmark" class="primary">▶ Run the load test</button>
      <button id="reference" class="quiet">Show a working design</button>
      <p id="benchmark-result" role="status" aria-live="polite" class="${verdict ? (verdict.success ? 'passed' : 'failed') : ''}">${verdict ? verdict.message : 'Test this design against the contract.'}</p>
    </div>

    <div class="learning-row">
      <section class="field-notes">
        <div class="eyebrow">FIELD NOTES</div>
        <h3>${scenario.name}</h3>
        <p>${scenario.teaches}</p>
        <p class="syntax-note">${result.consistency}</p>
        <a class="lesson-reference" href="${scenario.reference.url}" target="_blank" rel="noopener noreferrer">${scenario.reference.label}</a>
      </section>
      <section class="help-panel">
        <div class="eyebrow">TRY AN EXPERIMENT</div>
        <p>Add one edge node at a time and watch the 99th percentile fall away from the cliff. Then take the cache away and see which tier saturates first.</p>
        <p class="model-note">This model leaves out congestion, correlated failures, coordination cost, cold starts, and bursty arrivals. It is here to make the trade-offs arithmetic, not to size real hardware. Availability composes redundant instances in parallel (1 − failure^n) and tiers in series, so every extra shard is another component that has to be up.</p>
      </section>
    </div>`;

    container.querySelector('#contract').addEventListener('change', event => {
      index = Number(event.target.value);
      verdict = null;
      const allow = scenarios[index].allow;
      if (allow.queue === false) design = {...design, queue:false, workers:0};
      if (allow.shards === false) design = {...design, shards:1};
      if (allow.regions === false) design = {...design, regions:1};
      persist();
      render();
    });
    const wire = (attribute, key, transform = Number) => container.querySelectorAll(`[data-${attribute}]`).forEach(button =>
      button.addEventListener('click', () => change({[key]:transform(button.dataset[attribute])})));
    wire('web', 'web');
    wire('db', 'db');
    wire('cache', 'cache');
    wire('servers', 'servers');
    wire('replicas', 'replicas');
    wire('shards', 'shards');
    wire('regions', 'regions');
    wire('workers', 'workers');
    container.querySelectorAll('[data-queue]').forEach(button => button.addEventListener('click', () => change({queue:button.dataset.queue === '1', workers:button.dataset.queue === '1' ? Math.max(1, design.workers) : 0})));

    container.querySelector('#benchmark').addEventListener('click', () => {
      verdict = evaluateArchitecture(design, index);
      if (verdict.success && !completed.includes(index)) completed.push(index);
      if (verdict.success) onContract({spare:1 - verdict.cost / verdict.scenario.slo.budget});
      persist();
      render();
      reveal(container.querySelector('#benchmark-result'));
    });
    container.querySelector('#reference').addEventListener('click', () => {
      const best = search(index);
      if (!best) return;
      design = {...defaultDesign, ...best.design};
      verdict = {success:false, message:`One design that meets this contract costs ${best.cost} credits. Run the load test, then change one component at a time and watch which target breaks first.`};
      persist();
      render();
    });
  }

  render();
  return {getState:() => ({design:{...design}, contract:scenarios[index].id, completed:[...completed], ...summarise(evaluateArchitecture(design, index))})};
}

const summarise = result => ({
  success:result.success, cost:result.cost, latencyMs:result.latencyMs,
  availability:result.availabilityText, bottleneck:result.bottleneck,
  utilisation:result.utilisation, met:result.met
});
