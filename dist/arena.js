// Everything drawn into the arena panel beside the editor: the isometric scenes,
// the diagrams the puzzle layer describes, the dials that change them, and the
// case tables an algorithm mission is judged by.
//
// The scene and the stage are held here rather than passed in, because which of
// the two a mission needs is this module's decision and nobody else's business.
import {describe, algoKinds} from './engine.js';
import {widgets, view} from './puzzles.js';
import {createScene} from './scene.js';
import {createStage} from './stage.js';
import {sceneFor} from './scenes.js';
import {count} from './format.js';

const $ = id => document.getElementById(id);
const short = text => text.length > 42 ? `${text.slice(0, 39)}…` : text;

export function createArena({onAct}) {
  let scene = null, sceneLevel = null, stage = null, stageKind = null;
  const dropScene = () => { scene?.destroy(); scene = null; sceneLevel = null; };
  const dropStage = () => { stage?.destroy(); stage = null; stageKind = null; };

  function render(item, {unit, visited, puzzleState}) {
    if (item.kind === 'code') {
      if (!scene || sceneLevel !== item.id) { scene?.destroy(); scene = createScene($('arena'), item, unit); sceneLevel = item.id; }
      scene.update(unit, visited);
      $('legend').innerHTML = '<span class="legend-unit">➤ Cyan arrow: facing direction</span><span>◎ Amber ring: power cell</span><span>Only raised tiles are traversable</span>';
      return;
    }
    dropScene();
    if (item.kind === 'spec') { dropStage(); spec(item); return; }
    if (algoKinds.has(item.kind)) { dropStage(); cases(item); return; }
    const rendered = view(item, puzzleState);
    document.querySelector('.network-instructions').textContent = rendered.instructions;
    $('legend').innerHTML = rendered.legend.map((entry, position) => `<span${position === 0 ? ' class="legend-unit"' : ''}>${entry}</span>`).join('');
    $('link-total').textContent = rendered.summary;
    const built = sceneFor(item);
    if (built) renderStage(item, built, puzzleState);
    else {
      dropStage();
      renderDiagram(rendered.diagram);
    }
    renderWidgets(item, puzzleState);
  }

  // A mission with an isometric scene draws it on a canvas; clicking a solid does
  // whatever clicking the matching control would.
  function renderStage(item, built, puzzleState) {
    if (!stage || stageKind !== item.id) {
      stage?.destroy();
      stage = createStage($('arena'), {
        bounds:state => built.bounds(state.level, state.state),
        build:(scene, context) => built.build(scene, {...context, level:context.state.level, state:context.state.state}),
        describe:state => built.describe(state.level, state.state),
        still:built.still ?? false,
        aspect:built.aspect ?? 0.58,
        onPick:id => {
          const [type, index] = String(id).split('-');
          if (type === 'bit') onAct({type:'bit', index:Number(index)});
          if (type === 'link') onAct({type:'link', index:Number(index)});
        }
      });
      stageKind = item.id;
    }
    stage.update({level:item, state:puzzleState});
  }

  // Diagrams are described by the puzzle layer and drawn by these few renderers,
  // so a new mission kind does not need new markup.
  // Missions whose kind has an isometric scene never reach this: render prefers
  // the scene, and puzzles.js gives those kinds no diagram at all.
  function renderDiagram(diagram) {
    const wrap = document.createElement('div');
    wrap.className = `puzzle diagram-${diagram.type}`;
    if (diagram.type === 'table') {
      wrap.innerHTML = `<div class="eyebrow">${diagram.caption ?? ''}</div><table class="data-table"><thead><tr>${diagram.columns.map(column => `<th>${column}</th>`).join('')}</tr></thead><tbody>${diagram.rows.map((row, index) => `<tr class="${diagram.problems?.[index] ? 'problem' : ''} ${diagram.highlight === index ? 'highlight' : ''}">${row.map(cell => `<td>${cell}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
    }
    if (diagram.type === 'bars') {
      // A row may carry its own full-scale value, so bars that measure different
      // things — seconds against a deadline, a fraction against a cap — each read
      // against their own target instead of against the largest number present.
      const widest = Math.max(1e-9, ...diagram.rows.map(row => row.value));
      const fill = row => Math.max(1, Math.min(100, Math.round((row.value / (row.max ?? widest)) * 100)));
      wrap.innerHTML = `<div class="eyebrow">${diagram.caption ?? ''}</div><div class="bar-view">${diagram.rows.map(row => `<div class="bar-row ${row.problem ? 'problem' : ''}"><span class="bar-name">${row.name}</span><div class="bar-track"><i style="width:${fill(row)}%"></i></div><span class="bar-detail">${row.detail}</span></div>`).join('')}</div>`;
    }
    if (diagram.type === 'timeline') {
      wrap.innerHTML = `<div class="eyebrow">${diagram.caption ?? ''} · ${diagram.total} MS</div><div class="bar-view">${diagram.rows.map(row => `<div class="bar-row"><span class="bar-name">${row.name}</span><div class="bar-track"><i style="width:${Math.max(2, Math.round(row.value / diagram.total * 100))}%;margin-left:${Math.round((row.at - row.value) / diagram.total * 100)}%"></i></div><span class="bar-detail">${row.detail}</span></div>`).join('')}</div>`;
    }
    if (diagram.type === 'cards') {
      wrap.innerHTML = `<div class="eyebrow">${diagram.caption ?? 'QUESTIONS'}</div><div class="card-view">${diagram.rows.map((row, index) => `<div class="question-card ${row.answered ? 'answered' : ''}"><small>${index + 1}</small><strong>${row.name}</strong><span>${row.detail}</span></div>`).join('')}</div>`;
    }
    $('arena').replaceChildren(wrap);
  }

  function renderWidgets(item, puzzleState) {
    const list = widgets(item, puzzleState);
    const container = $('link-list');
    container.replaceChildren();
    for (const widget of list) {
      if (widget.type === 'toggle' || widget.type === 'button') {
        const button = document.createElement('button');
        button.className = 'link-option';
        if (widget.type === 'toggle') button.setAttribute('aria-pressed', String(widget.on));
        button.innerHTML = widget.type === 'toggle'
          ? `<span class="link-check">${widget.on ? '✓' : ''}</span><span>${widget.label}</span><span class="link-cost">${widget.note ?? ''}</span>`
          : `<span>${widget.label}</span>`;
        button.addEventListener('click', () => onAct(widget.action));
        container.append(button);
        continue;
      }
      const row = document.createElement('div');
      row.className = `widget-row widget-${widget.type}`;
      if (widget.type === 'order') {
        row.innerHTML = `<span class="widget-label">${widget.label}${widget.note ? `<small>${widget.note}</small>` : ''}</span><span class="order-buttons"><button aria-label="Move ${widget.label} earlier" ${widget.first ? 'disabled' : ''}>▲</button><button aria-label="Move ${widget.label} later" ${widget.last ? 'disabled' : ''}>▼</button></span>`;
        const [up, down] = row.querySelectorAll('button');
        up.addEventListener('click', () => onAct(widget.up));
        down.addEventListener('click', () => onAct(widget.down));
      }
      if (widget.type === 'dial' || widget.type === 'choice') {
        row.innerHTML = `<span class="widget-label">${widget.label}${widget.help || widget.note ? `<small>${widget.help || widget.note}</small>` : ''}</span><span class="segmented">${widget.options.map((option, index) => `<button data-option="${index}" class="component-option ${option.selected ? 'chosen' : ''}" aria-pressed="${!!option.selected}"><span>${option.label}</span></button>`).join('')}</span>`;
        row.querySelectorAll('[data-option]').forEach(button => {
          const option = widget.options[Number(button.dataset.option)];
          button.addEventListener('click', () => onAct(option.action ?? {type:'dial', id:widget.id, value:option.value}));
        });
      }
      container.append(row);
    }
  }

  // A spec mission shows the code under test rather than a case list: the cases
  // are the player's, and what matters is which broken versions they reject.
  function spec(item, result = null) {
    const wrap = document.createElement('div');
    wrap.className = 'puzzle diagram-spec';
    const rows = item.mutants.map((mutant, index) => {
      const outcome = result?.mutants?.[index];
      const status = !outcome ? '·' : outcome.caught ? '✓' : '✗';
      const detail = !outcome ? 'not run yet'
        : outcome.caught ? `rejected by case ${outcome.by.join(', ')}`
        : `passes your suite — ${mutant.why}`;
      return `<div class="case-row ${!outcome ? '' : outcome.caught ? 'pass' : 'fail'}"><span class="case-status">${status}</span><code>${mutant.name}</code><span class="case-detail">${detail}</span></div>`;
    }).join('');
    const written = result?.cases?.length ?? 0;
    wrap.innerHTML = `<div class="eyebrow">${item.subject.signature}</div>
    <pre class="polyglot-code" tabindex="0" aria-label="The function under test, as it is meant to behave">${item.subject.contract}</pre>
    <div class="eyebrow">${item.mutants.length} BROKEN VERSIONS${result ? ` · ${result.mutants.filter(mutant => mutant.caught).length} REJECTED · ${written} CASE${written === 1 ? '' : 'S'} WRITTEN` : ''}</div>
    <div class="case-table">${rows}</div>`;
    $('arena').replaceChildren(wrap);
    $('legend').innerHTML = '<span class="legend-unit">✓ Your suite rejects it</span><span>✗ It passes your suite</span><span>A test that passes everything tests nothing</span>';
  }

  function cases(item, result = null) {
    const wrap = document.createElement('div');
    wrap.className = 'puzzle diagram-cases';
    const rows = item.cases.map((testCase, index) => {
      const outcome = result?.cases?.[index];
      const status = !outcome ? '·' : outcome.passed && !outcome.overGate ? '✓' : '✗';
      const className = !outcome ? '' : outcome.passed && !outcome.overGate ? 'pass' : 'fail';
      const detail = !outcome
        ? testCase.note ?? ''
        : outcome.error ? outcome.error
        : !outcome.passed ? `returned ${describe(outcome.actual)}`
        : outcome.overGate ? `${count(outcome.operations)} steps, over the ${count(outcome.maxOperations)} allowed`
        : `${count(outcome.operations)} steps${testCase.maxOperations ? ` of ${count(testCase.maxOperations)} allowed` : ''}`;
      return `<div class="case-row ${className}"><span class="case-status">${status}</span><code>${item.fn}(${testCase.args.map(argument => short(describe(argument))).join(', ')})</code><span class="case-expect">→ ${short(describe(testCase.expect))}</span><span class="case-detail">${detail}</span></div>`;
    }).join('');
    // A refactor mission can pass every case and still be refused, so the panel
    // says which rule is outstanding rather than showing an unexplained full house.
    const shapeNote = result?.shape ? `<p class="case-shape">${result.shape}</p>` : '';
    wrap.innerHTML = `<div class="eyebrow">${item.cases.length} TEST CASES${result ? ` · ${result.cases.filter(entry => entry.passed && !entry.overGate).length} PASSING${result.shape ? ' · SHAPE RULE NOT MET' : ''}` : ''}</div>${shapeNote}<div class="case-table">${rows}</div>${result?.output?.length ? `<div class="case-output"><strong>print() output</strong>${result.output.slice(0, 12).map(line => `<code>${line}</code>`).join('')}</div>` : ''}`;
    $('arena').replaceChildren(wrap);
    $('legend').innerHTML = '<span class="legend-unit">✓ Case passed</span><span>✗ Case failed</span><span>Steps counted by the interpreter</span>';
  }

  return {
    render, cases, spec,
    // The walking-robot scene is the only one with a life of its own: the unit
    // moves a step at a time while the program runs, and dances when it lands.
    place(unit) { scene?.update(unit, [], true); },
    celebrate() { scene?.celebrate(); },
    reset() { dropScene(); dropStage(); }
  };
}
