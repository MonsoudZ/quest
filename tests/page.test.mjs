import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync, existsSync} from 'node:fs';
import {resolve, dirname} from 'node:path';
import {fileURLToPath} from 'node:url';

// This application has no build step, so nothing but these checks stands between
// a renamed file or a renamed id and a blank page.
const dist = resolve(dirname(fileURLToPath(import.meta.url)), '../dist');
const read = name => readFileSync(resolve(dist, name), 'utf8');
const html = read('index.html');
const scripts = ['game.js', 'builder.js', 'citylab.js', 'scene.js', 'webmcp.js', 'puzzles.js', 'ui.js'].map(read).join('\n');
const styles = ['theme.css', 'app.css'].map(read).join('\n');

test('every local file the page links to exists', () => {
  const references = [...html.matchAll(/(?:href|src)="(\.[^"]+)"/g)].map(match => match[1]);
  assert.ok(references.length >= 4, 'the page should link to its own assets');
  for (const reference of references) {
    assert.ok(existsSync(resolve(dist, reference)), `index.html references ${reference}, which does not exist`);
  }
  assert.ok(references.includes('./theme.css') && references.includes('./app.css'));
  assert.ok(references.includes('./game.js'));
});

test('every element the interface looks up by id is in the markup', () => {
  const ids = new Set([...html.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]));
  const wanted = new Set([...scripts.matchAll(/\$\('([^']+)'\)/g)].map(match => match[1]));
  // Ids the interface creates at runtime rather than finding in the page.
  const runtime = new Set(['contract', 'benchmark', 'benchmark-result', 'reference']);
  for (const id of wanted) {
    if (runtime.has(id)) continue;
    assert.ok(ids.has(id), `game.js looks up #${id}, which the page does not contain`);
  }
  assert.ok(wanted.has('mission-title') && wanted.has('theme') && wanted.has('sound-label'));
});

test('every class the interface renders has a style rule', () => {
  const classes = new Set();
  const prefixes = new Set();
  // A class attribute can hold interpolations, and those can hold quotes, so the
  // attribute is matched with its `${...}` groups treated as single units.
  const attribute = /class(?:Name)?\s*[=:]\s*(["'`])((?:\$\{(?:[^{}]|\{[^{}]*\})*\}|(?!\1).)*)\1/g;
  const interpolation = /\$\{(?:[^{}]|\{[^{}]*\})*\}/g;
  const scan = text => {
    for (const match of text.matchAll(/([a-zA-Z][\w-]*)\$\{/g)) prefixes.add(match[1]);
    for (const group of text.matchAll(interpolation)) {
      for (const quoted of group[0].matchAll(/'([a-zA-Z][\w-]*)'/g)) classes.add(quoted[1]);
    }
    // A marker rather than a space, so `diagram-${type}` does not leave a bare
    // `diagram-` behind: names touching an interpolation are prefixes, not classes.
    for (const name of text.replace(interpolation, '\u0000').split(/\s+/)) {
      if (name && !name.includes('\u0000')) classes.add(name);
    }
  };
  for (const source of [html, scripts]) {
    for (const match of source.matchAll(attribute)) scan(match[2]);
    for (const match of source.matchAll(/classList\.(?:add|toggle|remove)\('([^']+)'/g)) scan(match[1]);
  }
  const styled = new Set([...styles.matchAll(/\.([a-zA-Z][\w-]*)/g)].map(match => match[1]));
  const missing = [...classes].filter(name => !styled.has(name));
  assert.deepEqual(missing, [], `these classes are rendered but never styled: ${missing.join(', ')}`);
  assert.deepEqual([...prefixes].sort(), ['diagram-', 'load-', 'widget-'], 'a new interpolated class name needs its concrete forms listed below');
  // Every diagram kind needs its own rule. Widget kinds mostly share the base
  // row, so only the ones that differ are required to have one.
  // The city map is drawn on a canvas now, so district and cable colours live in
  // scenes.js rather than in CSS; only the classes still rendered are required.
  for (const concrete of ['diagram-bits', 'diagram-sort', 'diagram-stack', 'diagram-table', 'diagram-bars', 'diagram-timeline', 'diagram-cards', 'diagram-cases', 'diagram-spec', 'widget-row', 'widget-choice',
    'load-cool', 'load-warm', 'load-hot']) {
    assert.ok(styled.has(concrete), `${concrete} has no style rule`);
  }
  assert.ok(classes.size > 60, `only ${classes.size} classes were found, so the scan is not working`);
});

test('the stylesheets define both colour schemes and every token they use', () => {
  assert.match(styles, /prefers-color-scheme: light/);
  assert.match(styles, /\[data-theme='light'\]/);
  assert.match(styles, /\[data-theme='dark'\]/);
  const defined = new Set([...styles.matchAll(/(--[\w-]+)\s*:/g)].map(match => match[1]));
  const used = new Set([...styles.matchAll(/var\((--[\w-]+)/g)].map(match => match[1]));
  const undefinedTokens = [...used].filter(token => !defined.has(token));
  assert.deepEqual(undefinedTokens, [], `these custom properties are used but never defined: ${undefinedTokens.join(', ')}`);
});

test('every mode brings its outcome into view rather than leaving it below the fold', () => {
  // The browser pass checks that this works; this checks it is still wired up,
  // because the failure mode is silent: the player simply sees nothing happen.
  for (const [file, expected] of [['game.js', 3], ['builder.js', 1], ['citylab.js', 1]]) {
    const source = read(file);
    assert.match(source, /from '\.\/ui\.js'/, `${file} should use the shared reveal helper`);
    const calls = (source.match(/reveal\(/g) ?? []).length;
    assert.ok(calls >= expected, `${file} calls reveal() ${calls} times, expected at least ${expected}`);
  }
  // The mission screen has to cover a win and both kinds of failure.
  const game = read('game.js');
  for (const site of ['reveal($(\'result\'))', 'reveal(outcomePanel())']) {
    assert.ok(game.includes(site), `game.js is missing ${site}`);
  }
});

test('the page keeps its accessibility affordances', () => {
  assert.match(html, /<html lang="en">/);
  assert.match(html, /aria-live="polite"/);
  assert.match(html, /class="sr-only" for="code"/);
  // Every icon-only control still carries a label and a description.
  for (const id of ['theme', 'sound']) {
    const button = html.match(new RegExp(`<button id="${id}"[\\s\\S]*?</button>`))[0];
    assert.match(button, /title="/, `#${id} needs a title`);
    assert.match(button, /aria-pressed="/, `#${id} needs a pressed state`);
    assert.match(button, /<span id="/, `#${id} needs a text label`);
    assert.match(button, /aria-hidden="true"/, `#${id} icon should be hidden from the accessibility tree`);
  }
  assert.match(styles, /\.icon-button span \{ position:absolute;[^}]*clip:/, 'hidden button labels must stay in the accessibility tree');
});

test('the console chip row survives a mission that has no function to write', async () => {
  // A quiz or model mission carries no signature. Deriving chips from one
  // crashed the whole mission load until this guard existed.
  const {levels} = await import('../dist/levels.js');
  const source = scripts;
  const guard = /if \(!item\.signature\) return \[\];/;
  assert.match(source, guard, 'commandReference no longer guards against a missing signature');
  assert.ok(levels.some(level => !level.signature && level.kind !== 'code'), 'there are no signature-less missions left to guard against');
});

test('every game mode is reachable on a phone without a hidden sideways scroller', () => {
  // The mode row scrolls sideways inside a pill with no scrollbar, so at phone
  // width the third mode simply looked cut off. It wraps there instead.
  const phone = styles.slice(styles.indexOf('@media (max-width:640px)'));
  assert.match(phone, /\.mode-switch \{[^}]*flex-wrap:wrap/, 'the mode row does not wrap at phone width');
  assert.match(phone, /\.mode-switch \{[^}]*overflow-x:visible/, 'and it must stop being a hidden scroller');
});

test('the station mode is wired into the page the same way the others are', async () => {
  const {sections} = await import('../dist/progress.js');
  for (const id of ['station', 'station-mode', 'result-rank', 'result-power', 'result-note', 'result-badges']) {
    assert.match(html, new RegExp(`id="${id}"`), `the page has no #${id}`);
  }
  // The power bar measures restored power now, so its ceiling has to match.
  const {levels} = await import('../dist/levels.js');
  assert.match(html, new RegExp(`<progress id="power" max="${levels.length * 100}"`), 'the power bar does not go up to the station\'s full capacity');
  assert.ok(sections.length >= 6);
});
