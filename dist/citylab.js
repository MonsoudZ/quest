// Signal City: the interface for the networking build mode. The model lives in
// city.js; this file draws the map and collects what the player lays down.
import {reveal} from './ui.js';
import {createStage} from './stage.js';
import {cityScene} from './scenes.js';
import {grid, districts, technologies, scenarios, scenarioDistricts, referenceDesigns, evaluateCity, blocksBetween} from './city.js';

const saveKey = 'signal-quest-city-v1';
const cell = 70, margin = 44;
const place = district => ({x:margin + district.x * cell, y:margin + district.y * cell});
// The frame is cropped to the districts this contract actually has, so a map
// with five districts does not float in a grid built for eight.
function frame(list) {
  const points = list.map(place);
  const pad = {x:76, y:46};
  const left = Math.min(...points.map(point => point.x)) - pad.x;
  const right = Math.max(...points.map(point => point.x)) + pad.x;
  const top = Math.min(...points.map(point => point.y)) - pad.y;
  const bottom = Math.max(...points.map(point => point.y)) + pad.y;
  return {left, top, width:right - left, height:bottom - top};
}
const percent = value => `${Math.round(value * 100)}%`;
const rate = mbps => mbps >= 1000 ? `${(mbps / 1000).toFixed(mbps % 1000 === 0 ? 0 : 1)} Gbps` : `${mbps} Mbps`;
const nameOf = id => districts.find(district => district.id === id).name;
const pairKey = (a, b) => [a, b].sort().join('|');

// Utilisation bands: the colour is the lesson, so the thresholds match the ones
// the contracts set.
const band = utilisation => utilisation >= 0.85 ? 'hot' : utilisation >= 0.6 ? 'warm' : 'cool';

export function mountCity(container) {
  let index = 0;
  let designs = {};            // contract id -> the cables laid for it
  let links = [];              // the cables for the contract on screen
  let tech = 'fibre';
  let selected = null;
  let verdict = null;
  let completed = [];
  const contractId = () => scenarios[index].id;
  try {
    const saved = JSON.parse(localStorage.getItem(saveKey) || 'null');
    if (saved) {
      index = Number.isInteger(saved.index) && scenarios[saved.index] ? saved.index : 0;
      // A stored city is kept only if it still validates against its own
      // contract, so a change to the map cannot leave a broken one behind.
      const stored = saved.designs ?? (Array.isArray(saved.links) ? {[scenarios[index].id]:saved.links} : {});
      for (const [id, city] of Object.entries(stored)) {
        const position = scenarios.findIndex(scenario => scenario.id === id);
        if (position < 0 || !Array.isArray(city)) continue;
        try { evaluateCity({links:city}, position); designs[id] = city; } catch { /* dropped */ }
      }
      links = designs[contractId()] ?? [];
      tech = technologies.some(technology => technology.id === saved.tech) ? saved.tech : 'fibre';
      completed = Array.isArray(saved.completed) ? saved.completed.filter(entry => Number.isInteger(entry) && scenarios[entry]) : [];
    }
  } catch { /* a stored city that no longer validates is discarded */ }
  const persist = () => {
    designs[contractId()] = links;
    try { localStorage.setItem(saveKey, JSON.stringify({index, designs, tech, completed})); } catch { /* play continues without saved progress */ }
  };

  const available = () => scenarioDistricts(scenarios[index]);
  const canLink = (a, b) => {
    if (!a || !b || a === b) return false;
    if (links.some(link => pairKey(link.from, link.to) === pairKey(a, b))) return false;
    const technology = technologies.find(entry => entry.id === tech);
    return blocksBetween(districts.find(d => d.id === a), districts.find(d => d.id === b)) <= technology.reachBlocks;
  };
  function connect(a, b) {
    if (!canLink(a, b)) return;
    links = [...links, {from:a, to:b, tech}];
    verdict = null;
    selected = null;
    persist();
    render();
  }
  function disconnect(position) {
    links = links.filter((_, other) => other !== position);
    verdict = null;
    persist();
    render();
  }
  function choose(id) {
    if (selected === id) { selected = null; render(); return; }
    if (selected && canLink(selected, id)) { connect(selected, id); return; }
    selected = id;
    render();
  }

  let stage = null;
  function paintMap(result) {
    const canvas = container.querySelector('.city-canvas');
    if (!canvas) return;
    if (!stage || !canvas.contains(stage.canvas)) {
      stage?.destroy();
      stage = createStage(canvas, {
        aspect:cityScene.aspect,
        bounds:cityScene.bounds,
        build:(scene, context) => cityScene.build(scene, context),
        describe:cityScene.describe,
        onPick:id => {
          const [type, ...rest] = String(id).split('-');
          if (type === 'district') choose(rest.join('-'));
          if (type === 'cable') disconnect(Number(rest[0]));
        }
      });
    }
    stage.update({districts:available(), links, result, selected});
  }

  function render() {
    const scenario = scenarios[index];
    const result = evaluateCityQuietly();
    const shown = verdict ?? result;
    const list = available();
    const technology = technologies.find(entry => entry.id === tech);
    const overBudget = shown && shown.cost > scenario.budget;

    container.innerHTML = `
    <div class="mission-heading"><div><div class="eyebrow">SIGNAL CITY · ${completed.length} / ${scenarios.length} CONTRACTS</div><h2>Lay the city’s network.</h2></div><span class="concept">Networking</span></div>
    <p class="intro">Every district has to reach the orbital uplink. You choose what to lay between them, and the model tells you where the traffic goes, how full each cable gets, and who loses their connection when one of them is cut.</p>

    <div class="builder-contract">
      <div>
        <div class="eyebrow">CONTRACT ${index + 1}</div>
        <h3>${scenario.name}</h3>
        <p>${scenario.brief}</p>
        <p class="contract-targets">${targetChips(scenario)}</p>
      </div>
      <label>Choose contract <select id="city-contract">${scenarios.map((item, position) => `<option value="${position}" ${position === index ? 'selected' : ''}>${position + 1}. ${item.name}${completed.includes(position) ? ' ✓' : ''}</option>`).join('')}</select></label>
    </div>

    <div class="city-layout">
      <section class="panel-block city-stage">
        <div class="city-toolbar">
          <div class="eyebrow">${selected ? `From ${nameOf(selected)} — pick the other end` : 'Pick two districts to lay a cable'}</div>
          <div class="segmented">${technologies.map(item => `<button class="component-option ${item.id === tech ? 'chosen' : ''}" data-tech="${item.id}" aria-pressed="${item.id === tech}"><span>${item.name}</span><span>${rate(item.capacityMbps)} · ${item.costPerBlock}/block</span></button>`).join('')}</div>
        </div>
        <div class="city-canvas"></div>
        <div class="city-legend">
          <span class="city-key"><i class="city-swatch is-fibre"></i>Fibre</span>
          <span class="city-key"><i class="city-swatch is-copper"></i>Copper</span>
          <span class="city-key"><i class="city-swatch is-microwave"></i>Microwave</span>
          <span class="city-key"><i class="city-swatch is-cool"></i>Under 60% loaded</span>
          <span class="city-key"><i class="city-swatch is-warm"></i>60–85%</span>
          <span class="city-key"><i class="city-swatch is-hot"></i>Over 85%</span>
          <span class="city-key"><i class="city-swatch is-starved"></i>Short of traffic</span>
          <span class="city-key"><i class="city-swatch is-offline"></i>No route out</span>
        </div>
        <p class="model-note">${technology.note} It reaches ${technology.reachBlocks} blocks, and a block of it costs ${technology.costPerBlock} credits. Click a cable to remove it, or use the list. Cables show their load once you run the city.</p>
      </section>

      <section class="panel-block city-build">
        <div class="eyebrow">CABLE LIST · ${links.length} LAID</div>
        <div class="city-links">${links.length ? links.map((link, position) => {
          const measured = shown?.links[position];
          return `<div class="link-row ${measured ? `load-${band(measured.utilisation)}` : ''}">
            <span class="link-route">${nameOf(link.from)} ↔ ${nameOf(link.to)}<small>${technologies.find(entry => entry.id === link.tech).name} · ${measured ? `${measured.cost} cr · ${percent(measured.utilisation)} loaded` : 'not measured'}</small></span>
            <button class="quiet" data-drop="${position}" aria-label="Remove the ${nameOf(link.from)} to ${nameOf(link.to)} cable">Remove</button>
          </div>`;
        }).join('') : '<p class="model-note">Nothing laid yet. Pick a technology, then two districts.</p>'}</div>

        <div class="bay-row"><span>Add a cable</span></div>
        <div class="city-add">
          <label class="sr-only" for="city-from">From district</label>
          <select id="city-from">${list.map(district => `<option value="${district.id}">${district.name}</option>`).join('')}</select>
          <label class="sr-only" for="city-to">To district</label>
          <select id="city-to">${list.map((district, position) => `<option value="${district.id}" ${position === 1 ? 'selected' : ''}>${district.name}</option>`).join('')}</select>
          <button id="city-add" class="secondary">Lay cable</button>
        </div>

        <div class="builder-metrics city-metrics">
          <div><span>Spent</span><strong class="${overBudget ? 'over-budget' : ''}">${shown ? shown.cost : 0} <small>/ ${scenario.budget} cr</small></strong></div>
          <div><span>Busiest cable</span><strong class="${shown && scenario.targets.maxUtilisation !== undefined && shown.peakUtilisation > scenario.targets.maxUtilisation ? 'over-budget' : ''}">${shown ? percent(shown.peakUtilisation) : '—'}</strong></div>
          <div><span>Traffic delivered</span><strong class="${shown && shown.worstSatisfaction < 1 ? 'over-budget' : ''}">${shown ? percent(shown.deliveredMbps / Math.max(1, shown.totalDemandMbps)) : '—'}</strong></div>
          <div><span>Worst single cut</span><strong class="${shown && (scenario.targets.resilient || scenario.targets.survivesCut !== undefined) && (shown.cuts.length || !shown.met.survivesCut) ? 'over-budget' : ''}">${shown ? (shown.cuts.length ? `${shown.cuts.length} isolate` : shown.worstCut ? `${percent(shown.worstCut.survivingShare)} survives` : 'no links') : '—'}</strong></div>
        </div>

        <div class="builder-test">
          <button id="city-run" class="primary">▶ Run the city</button>
          <button id="city-reference" class="quiet">Show a working city</button>
          <button id="city-clear" class="quiet">Clear</button>
        </div>
        <p id="city-result" role="status" aria-live="polite" class="${verdict ? (verdict.success ? 'passed' : 'failed') : ''}">${verdict ? verdict.message : 'Lay your cables, then run the city to measure it.'}</p>
      </section>
    </div>

    <div class="lab-detail">
      <section class="panel-block">
        <div class="eyebrow">DISTRICTS</div>
        <div class="table-scroll"><table class="data-table"><thead><tr><th>District</th><th>Wants</th><th>Gets</th><th>Hops</th><th>Round trip</th></tr></thead><tbody>
          ${list.filter(district => district.demandMbps > 0).map(district => {
            const row = shown?.districts.find(entry => entry.id === district.id);
            const short = row && row.satisfaction < 1;
            return `<tr class="${short || (row && !row.connected) ? 'problem' : ''}">
              <td>${district.name}</td><td>${rate(district.demandMbps)}</td>
              <td>${row ? (row.connected ? rate(row.deliveredMbps) : 'no route') : '—'}</td>
              <td>${row?.hops ?? '—'}</td>
              <td>${row?.roundTripMs !== null && row?.roundTripMs !== undefined ? `${row.roundTripMs} ms` : '—'}</td>
            </tr>`;
          }).join('')}
        </tbody></table></div>
      </section>
      <section class="panel-block">
        <div class="eyebrow">WHAT THIS CONTRACT TEACHES</div>
        <p>${scenario.teaches}</p>
        <p class="model-note">Routing follows the shortest path on an OSPF-style metric, so a fatter cable is preferred even when it is the longer way round. Bandwidth is shared max-min fairly rather than by TCP's real dynamics, queueing delay uses the M/M/1 factor 1/(1 − utilisation), and demand is steady rather than bursty. Distances, prices, and capacities are teaching values.</p>
      </section>
    </div>`;

    paintMap(shown);
    container.querySelector('#city-contract').addEventListener('change', event => {
      designs[contractId()] = links;
      index = Number(event.target.value);
      links = (designs[contractId()] ?? []).map(link => ({...link}));
      selected = null;
      verdict = null;
      persist();
      render();
    });
    container.querySelectorAll('[data-tech]').forEach(button => button.addEventListener('click', () => {
      tech = button.dataset.tech;
      persist();
      render();
    }));
    container.querySelectorAll('[data-drop]').forEach(button => button.addEventListener('click', () => disconnect(Number(button.dataset.drop))));
    container.querySelector('#city-add').addEventListener('click', () => {
      const from = container.querySelector('#city-from').value;
      const to = container.querySelector('#city-to').value;
      if (!canLink(from, to)) {
        const message = container.querySelector('#city-result');
        message.className = 'failed';
        message.textContent = from === to ? 'A cable needs two different districts.'
          : links.some(link => pairKey(link.from, link.to) === pairKey(from, to)) ? 'Those two districts already have a cable between them.'
          : `${technologies.find(entry => entry.id === tech).name} does not reach from ${nameOf(from)} to ${nameOf(to)}.`;
        return;
      }
      connect(from, to);
    });
    container.querySelector('#city-run').addEventListener('click', () => {
      verdict = evaluateCityQuietly();
      if (verdict?.success && !completed.includes(index)) completed.push(index);
      persist();
      render();
      reveal(container.querySelector('#city-result'));
    });
    container.querySelector('#city-reference').addEventListener('click', () => {
      links = referenceDesigns[scenarios[index].id].map(link => ({...link}));
      verdict = null;
      persist();
      render();
    });
    container.querySelector('#city-clear').addEventListener('click', () => {
      links = [];
      selected = null;
      verdict = null;
      persist();
      render();
    });
  }

  function evaluateCityQuietly() {
    try { return evaluateCity({links}, index); } catch { return null; }
  }

  function targetChips(scenario) {
    const targets = scenario.targets;
    const chips = [`≤ ${scenario.budget} credits`];
    if (targets.connect) chips.push('every district connected');
    if (targets.delivered) chips.push('all traffic delivered');
    if (targets.maxUtilisation !== undefined) chips.push(`cables under ${percent(targets.maxUtilisation)}`);
    if (targets.resilient) chips.push('survives any one cut');
    if (targets.survivesCut !== undefined) chips.push(`≥ ${percent(targets.survivesCut)} traffic after a cut`);
    if (targets.latency) chips.push(`${nameOf(targets.latency.district)} under ${targets.latency.ms} ms`);
    return chips.map(chip => `<span>${chip}</span>`).join('');
  }

  render();
  return {getState:() => ({contract:scenarios[index].id, links:links.map(link => ({...link})), completed:[...completed], result:evaluateCityQuietly()})};
}
