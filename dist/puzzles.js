// One interface for every mission that is not a coding mission.
//
// A level declares the slots it uses (bits, values, edges, items, dials,
// questions); this module turns those into state, into a list of widgets the UI
// renders generically, into a diagram description, and into a verdict. All of it
// is pure, so every mission can be checked in a test without a browser.
import {evaluatePuzzle, evaluateNetwork, bitValue, toHex} from './engine.js';
import {subnet, smallestPrefixFor, allocate, longestPrefixMatch, encapsulate, transfer, timeline, reachability, translate, congestion} from './net.js';
import {evaluateArchitecture, estimators, nearestEstimate, errorBudget, catalog} from './systems.js';

const clone = value => Array.isArray(value) ? [...value] : value;
const percent = value => `${(value * 100).toFixed(1)}%`;

import {algoKinds} from './engine.js';
// Everything that is not a grid program and not a function console is a puzzle:
// one generic state machine serves them all.
export const isPuzzle = level => level.kind !== 'code' && !algoKinds.has(level.kind);

export function initialState(level) {
  const state = {};
  if (level.bits) state.bits = new Array(level.bits.width).fill(0);
  if (level.values) { state.values = [...level.values]; state.swaps = 0; }
  if (level.edges) state.links = [];
  if (level.items) state.order = level.items.map(item => item.id);
  if (level.dials) state.dials = Object.fromEntries(level.dials.map(dial => [dial.id, dial.value ?? dial.options[0].value]));
  if (level.questions) state.choices = level.questions.map(() => -1);
  return state;
}

export function solutionState(level) {
  const state = initialState(level);
  const answer = level.solution;
  if (Array.isArray(answer)) {
    if (level.bits) state.bits = [...answer];
    else if (level.values) state.values = [...answer];
    else if (level.edges) state.links = [...answer];
    else if (level.items) state.order = [...answer];
    else if (level.questions) state.choices = [...answer];
    return state;
  }
  if (answer?.bits) state.bits = [...answer.bits];
  if (answer?.values) state.values = [...answer.values];
  if (answer?.links) state.links = [...answer.links];
  if (answer?.order) state.order = [...answer.order];
  if (answer?.dials) state.dials = {...state.dials, ...answer.dials};
  if (answer?.choices) state.choices = [...answer.choices];
  return state;
}

export function applyAction(level, state, action) {
  const next = {...state, bits:clone(state.bits), values:clone(state.values), links:clone(state.links), order:clone(state.order), choices:clone(state.choices), dials:state.dials ? {...state.dials} : undefined};
  if (action.type === 'bit') next.bits[action.index] = next.bits[action.index] ? 0 : 1;
  if (action.type === 'swap') {
    [next.values[action.index], next.values[action.index + 1]] = [next.values[action.index + 1], next.values[action.index]];
    next.swaps = (state.swaps ?? 0) + 1;
  }
  if (action.type === 'link') next.links = next.links.includes(action.index) ? next.links.filter(index => index !== action.index) : [...next.links, action.index];
  if (action.type === 'move') {
    const from = next.order.indexOf(action.id);
    const to = from + action.direction;
    if (to >= 0 && to < next.order.length) [next.order[from], next.order[to]] = [next.order[to], next.order[from]];
  }
  if (action.type === 'dial') next.dials[action.id] = action.value;
  if (action.type === 'choice') next.choices[action.question] = action.option;
  return next;
}

// --------------------------------------------------------------- widgets

export function widgets(level, state) {
  const list = [];
  if (level.bits) {
    const places = Array.from({length:level.bits.width}, (_, i) => 2 ** (level.bits.width - 1 - i));
    places.forEach((place, index) => list.push({
      type:'toggle', id:`bit-${index}`, action:{type:'bit', index},
      label:level.bits.encoding === 'twos' && index === 0 ? `sign bit (−${place})` : `${place}-value bit`,
      note:state.bits[index] ? 'On' : 'Off', on:!!state.bits[index]
    }));
  }
  if (level.values) state.values.slice(0, -1).forEach((value, index) => list.push({
    type:'button', id:`swap-${index}`, action:{type:'swap', index},
    label:`Swap slots ${index} and ${index + 1} · ${value} ↔ ${state.values[index + 1]}`
  }));
  if (level.edges) level.edges.forEach((edge, index) => list.push({
    type:'toggle', id:`link-${index}`, action:{type:'link', index},
    label:`${label(edge[0])} ↔ ${label(edge[1])}`,
    note:level.budget ? `${edge[2]} ms` : '',
    on:state.links.includes(index)
  }));
  if (level.items) state.order.forEach((id, position) => {
    const item = level.items.find(candidate => candidate.id === id);
    list.push({
      type:'order', id:`order-${id}`, label:`${position + 1}. ${item.name}`, note:item.note ?? '',
      up:{type:'move', id, direction:-1}, down:{type:'move', id, direction:1},
      first:position === 0, last:position === state.order.length - 1
    });
  });
  if (level.dials) level.dials.forEach(dial => list.push({
    type:'dial', id:dial.id, label:dial.label, help:dial.help ?? '',
    value:state.dials[dial.id],
    options:dial.options.map(option => ({...option, selected:option.value === state.dials[dial.id]}))
  }));
  if (level.questions) level.questions.forEach((question, index) => list.push({
    type:'choice', id:`question-${index}`, label:question.prompt, note:question.note ?? '',
    options:question.options.map((option, option_index) => ({
      label:option.label ?? option, value:option_index, selected:state.choices[index] === option_index,
      action:{type:'choice', question:index, option:option_index}
    }))
  }));
  return list;
}

const label = id => String(id).replace(/-/g, ' ').replace(/\b\w/g, character => character.toUpperCase());

// ------------------------------------------------------------ evaluation

function hashTable(level, state) {
  const size = state.dials.size;
  const multiplier = state.dials.multiplier;
  const buckets = Array.from({length:size}, () => []);
  for (const key of level.keys) buckets[(key * multiplier) % size].push(key);
  const longest = Math.max(...buckets.map(bucket => bucket.length));
  return {size, multiplier, buckets, longest, load:level.keys.length / size, collisions:buckets.filter(bucket => bucket.length > 1).length};
}


// A level describes the destinations a deck has to reach and how each one should
// leave; the model decides what the configuration actually does.
function deliveries(level, state) {
  return level.destinations.map(destination => {
    const gateway = state.dials.gateway === 'none' ? null : state.dials.gateway;
    let outcome;
    try {
      outcome = reachability({host:level.host, prefix:state.dials.prefix, gateway, destination:destination.address});
    } catch (thrown) {
      outcome = {delivery:'invalid', reachable:false, reason:thrown.message};
    }
    return {...destination, ...outcome, correct:outcome.delivery === destination.expect};
  });
}

function natRun(level, state) {
  const forwards = (level.forwardOptions.find(option => option.id === state.dials.forward)?.rules ?? []);
  const run = translate({publicAddress:level.publicAddress, flows:level.flows, forwards});
  const rows = run.flows.map((flow, index) => ({...flow, want:level.flows[index].expect, correct:flow.delivered === level.flows[index].expect}));
  return {...run, rows, forwards};
}

function congestionRuns(level, state) {
  // One dial, because a fixed size means nothing once the sender is discovering
  // the window for itself: "slow-start" or "fixed-274".
  const [mode, size] = String(state.dials.sender).split('-').length === 2 && state.dials.sender.startsWith('fixed')
    ? ['fixed', Number(state.dials.sender.slice(6))]
    : ['slow-start', 0];
  const plan = {
    bytes:level.bytes,
    mode,
    fixedWindow:size,
    initialWindow:level.initialWindow ?? 1
  };
  return level.links.map(link => {
    const result = congestion(link, plan);
    return {
      link, result,
      lateBy:result.seconds - link.target.seconds,
      onTime:result.seconds <= link.target.seconds,
      clean:result.wasted <= link.target.wasted
    };
  });
}

function estimateRows(level, state) {
  return level.questions.map((question, index) => {
    const estimator = estimators[question.estimator];
    const truth = estimator.of(level.givens);
    const answer = nearestEstimate(truth, question.options);
    return {question, estimator, truth, answer, chosen:state.choices[index], correct:state.choices[index] === answer};
  });
}

function budgetRun(level, state) {
  const report = errorBudget({objective:level.objectiveTarget, windowMinutes:level.windowMinutes, incidents:level.incidents});
  const minutes = state.dials.remaining;
  const closest = level.remainingOptions.reduce((best, option) =>
    Math.abs(option.value - report.remainingMinutes) < Math.abs(best - report.remainingMinutes) ? option.value : best, level.remainingOptions[0].value);
  return {report, minutes, closest, actionCorrect:state.dials.action === report.verdict, minutesCorrect:minutes === closest};
}

function incidentDesign(level, state) {
  return {
    web:state.dials.web, servers:state.dials.servers, db:state.dials.db, cache:state.dials.cache,
    replicas:state.dials.replicas, shards:state.dials.shards ?? 1,
    queue:state.dials.queue === 1, workers:state.dials.workers ?? 0, regions:state.dials.regions ?? 1
  };
}

function orderedCorrect(level, state) {
  return level.order.every((id, index) => state.order[index] === id);
}

export function evaluate(level, state) {
  switch (level.kind) {
    case 'bits': case 'sort':
      return evaluatePuzzle(level, level.kind === 'bits' ? state.bits : state.values);
    case 'network':
      return evaluateNetwork(level, state.links);
    case 'layers': {
      const headers = state.order.map(id => level.items.find(item => item.id === id));
      const frame = encapsulate(headers, state.dials.payload);
      const ordered = orderedCorrect(level, state);
      const fits = frame.frameBytes - level.linkOverhead <= level.mtu;
      const filled = frame.frameBytes - level.linkOverhead === level.mtu;
      if (!ordered) return {success:false, message:'Those headers are not in the order a packet acquires them. The application payload is wrapped first, and the frame the cable carries is outermost.', frame};
      if (!fits) return {success:false, message:`A ${frame.frameBytes - level.linkOverhead}-byte packet is larger than the ${level.mtu}-byte MTU, so it would be fragmented. Reduce the payload.`, frame};
      if (!filled) return {success:false, message:`This packet is ${level.mtu - (frame.frameBytes - level.linkOverhead)} bytes short of the ${level.mtu}-byte MTU. A larger payload carries the same headers more efficiently.`, frame};
      return {success:true, message:`Headers in order, payload ${state.dials.payload} bytes, frame ${frame.frameBytes} bytes on the wire, ${percent(frame.efficiency)} of it your data. That payload is the maximum segment size for this link.`, frame};
    }
    case 'subnet': {
      const block = subnet(level.base, state.dials.prefix);
      const tightest = smallestPrefixFor(level.hosts);
      if (block.usable < level.hosts) return {success:false, message:`A /${state.dials.prefix} holds ${block.usable} usable addresses, and this deck needs ${level.hosts}.`, block};
      if (state.dials.prefix !== tightest) return {success:false, message:`A /${state.dials.prefix} works but wastes ${block.usable - level.hosts} addresses. A longer prefix is a smaller block: find the smallest block that still holds ${level.hosts} hosts.`, block};
      return {success:true, message:`${block.cidr} holds ${block.usable} usable addresses for ${level.hosts} hosts: ${block.firstHost} through ${block.lastHost}, broadcast ${block.broadcast}, mask ${block.maskText}.`, block};
    }
    case 'vlsm': {
      const requests = level.requests.map(request => ({...request, prefix:state.dials[request.id]}));
      const plan = allocate(level.base, level.basePrefix, requests);
      const short = plan.blocks.find(block => !block.enough);
      const outside = plan.blocks.find(block => !block.fits);
      if (short) return {success:false, message:`${short.name} needs ${short.needs} addresses but a /${short.prefix} only has ${short.usable} usable.`, plan};
      if (outside) return {success:false, message:`${outside.name} does not fit: the blocks you chose run past the end of ${plan.parent.cidr}. Larger blocks first waste less space.`, plan};
      return {success:true, message:`All four decks fit inside ${plan.parent.cidr} with ${plan.free} addresses left over. Each block starts on a boundary that matches its own size.`, plan};
    }
    case 'routing': {
      const rows = level.questions.map((question, index) => {
        const match = longestPrefixMatch(level.table, question.destination);
        return {destination:question.destination, chosen:state.choices[index], correct:match.index, prefix:match.route.prefix, via:match.route.via};
      });
      const wrong = rows.find(row => row.chosen !== row.correct);
      if (state.choices.includes(-1)) return {success:false, message:'Choose an outgoing route for every destination.', rows};
      if (wrong) return {success:false, message:`${wrong.destination} does not leave by ${level.table[wrong.chosen].via}. Two routes can both contain an address; the router uses the one with the longest prefix.`, rows};
      return {success:true, message:'Every destination leaves by its most specific route. That rule, longest prefix match, is how a router forwards without knowing the whole internet.', rows};
    }
    case 'transport': {
      const result = transfer(level.link, {window:state.dials.window, protocol:state.dials.protocol ?? 'selective-repeat', bytes:level.bytes});
      const late = result.seconds > level.target.seconds;
      const wasteful = level.target.wasted !== undefined && result.wasted > level.target.wasted;
      if (late) return {success:false, message:`The dump took ${result.seconds} s against a ${level.target.seconds} s deadline, using ${percent(result.utilisation)} of the link. One bandwidth-delay product is ${result.bdpPackets} packets; a window smaller than that leaves the link idle waiting for acknowledgements.`, result};
      if (wasteful) return {success:false, message:`Delivered in ${result.seconds} s, but ${percent(result.wasted)} of transmissions were retransmissions against a ${percent(level.target.wasted)} limit. Resending data that already arrived is paid for twice.`, result};
      return {success:true, message:`Delivered ${(level.bytes / 1048576).toFixed(0)} MiB in ${result.seconds} s at ${result.throughputMbps} Mbps, ${percent(result.utilisation)} of the link, with ${percent(result.wasted)} of transmissions wasted.`, result};
    }
    case 'sequence': {
      const steps = state.order.map(id => level.items.find(item => item.id === id));
      const skipped = new Set(level.skipWhen && state.dials?.[level.skipWhen.dial] === level.skipWhen.value ? level.skipWhen.skip : []);
      const active = steps.filter(step => !skipped.has(step.id));
      const path = timeline(active.map(step => ({id:step.id, name:step.name, ms:step.ms})));
      const ordered = orderedCorrect(level, state);
      if (!ordered) return {success:false, message:level.orderHint, path, skipped:[...skipped]};
      if (level.target?.ms !== undefined && path.totalMs > level.target.ms) {
        return {success:false, message:`The order is right, but this takes ${path.totalMs} ms and the target is ${level.target.ms} ms. Removing a round trip is the only thing that helps: extra bandwidth does not.`, path, skipped:[...skipped]};
      }
      return {success:true, message:`${path.rows.length} steps, ${path.totalMs} ms before the first byte of the answer arrives.${skipped.size ? ` ${skipped.size} steps were skipped because the answer was already cached.` : ''}`, path, skipped:[...skipped]};
    }
    case 'hash': {
      const table = hashTable(level, state);
      if (table.size > level.maxSlots) return {success:false, message:`A ${table.size}-slot table is larger than the ${level.maxSlots} slots this memory bank has.`, table};
      if (table.longest > level.maxChain) return {success:false, message:`The longest chain holds ${table.longest} keys and this lookup budget allows ${level.maxChain}. ${table.collisions} slot${table.collisions === 1 ? '' : 's'} hold more than one key. A table size that shares factors with your keys stacks them together.`, table};
      return {success:true, message:`${level.keys.length} keys in ${table.size} slots, longest chain ${table.longest}, load factor ${table.load.toFixed(2)}. Every lookup is one probe.`, table};
    }
    case 'reach': {
      const rows = deliveries(level, state);
      const wrong = rows.find(row => !row.correct);
      if (wrong) {
        return {success:false, rows, message:wrong.delivery === 'invalid'
          ? wrong.reason
          : `${wrong.name} should be reached ${wrong.expect === 'direct' ? 'directly, on this deck' : 'through the gateway'}, and this configuration ${wrong.delivery === 'none' ? 'cannot reach it at all' : wrong.delivery === 'direct' ? 'tries to reach it directly' : 'sends it to the gateway'}. ${wrong.reason}`};
      }
      const block = rows[0].block;
      return {success:true, rows, message:`${level.host}/${state.dials.prefix} puts this deck in ${block.cidr}. Its neighbours are reached directly and everything else leaves through ${state.dials.gateway}. The mask, not the destination, is what decides.`};
    }
    case 'nat': {
      const run = natRun(level, state);
      const wrong = run.rows.find(row => !row.correct);
      if (wrong) {
        return {success:false, run, message:wrong.want
          ? `${wrong.name} should get through and does not. ${wrong.reason}`
          : `${wrong.name} should be dropped and is not. Publishing a port exposes it to everyone, not only to the hosts you had in mind.`};
      }
      return {success:true, run, message:`${run.table.length} inside hosts share ${level.publicAddress}, told apart by port. Replies find their way home from the table; the only unsolicited traffic that gets in is the port you chose to publish.`};
    }
    case 'congestion': {
      const runs = congestionRuns(level, state);
      const late = runs.find(entry => !entry.onTime);
      const dirty = runs.find(entry => !entry.clean);
      if (late) {
        return {success:false, runs, message:`On the ${late.link.name} this took ${late.result.seconds} s against a ${late.link.target.seconds} s target, using ${percent(late.result.utilisation)} of the link. One bandwidth-delay product there is ${late.result.bdpPackets} packets.`};
      }
      if (dirty) {
        return {success:false, runs, message:`On the ${dirty.link.name} the deadline is met, but ${percent(dirty.result.wasted)} of transmissions were retransmissions against a ${percent(dirty.link.target.wasted)} limit. A window past what the path holds does not go faster; it just fills a buffer until it overflows.`};
      }
      return {success:true, runs, message:`Both links are met: ${runs.map(entry => `${entry.link.name} in ${entry.result.seconds} s at ${percent(entry.result.utilisation)}`).join(', ')}. ${String(state.dials.sender).startsWith('fixed') ? 'One fixed window happened to suit both paths.' : 'Slow start found each path’s capacity without being told it.'}`};
    }
    case 'estimate': {
      const rows = estimateRows(level, state);
      if (state.choices.includes(-1)) return {success:false, rows, message:'Work out every figure before checking.'};
      const wrong = rows.findIndex(row => !row.correct);
      if (wrong >= 0) {
        const row = rows[wrong];
        return {success:false, rows, wrong, message:`The ${row.estimator.label} is not right yet. ${row.estimator.explain(level.givens)}`};
      }
      return {success:true, rows, message:`Every figure is the right order of magnitude. ${level.quizSuccess ?? ''}`.trim()};
    }
    case 'budget': {
      const run = budgetRun(level, state);
      if (!run.minutesCorrect) {
        return {success:false, run, message:`That is not what is left. The objective allows ${run.report.allowedMinutes} minutes of downtime in this window, and the incidents spent ${run.report.spentMinutes}.`};
      }
      if (!run.actionCorrect) {
        const advice = {ship:'there is budget left, so a risky change can go out', 'slow-down':'three quarters of the budget is gone, so the risky change waits and the reliability work goes first', freeze:'the budget is spent, so nothing risky ships until the window rolls over'};
        return {success:false, run, message:`The arithmetic is right; the decision is not. With ${run.report.remainingMinutes} minutes left of ${run.report.allowedMinutes}, ${advice[run.report.verdict]}.`};
      }
      return {success:true, run, message:`${run.report.spentMinutes} minutes spent of ${run.report.allowedMinutes} allowed, ${run.report.remainingMinutes} left. The month achieved ${run.report.achievedText}, and the budget — not the last outage — decides what ships.`};
    }
    case 'incident': {
      const design = incidentDesign(level, state);
      const result = evaluateArchitecture(design, level.scenario);
      if (!result.success) return {success:false, result, message:result.message};
      if (level.maxCost !== undefined && result.cost > level.maxCost) {
        return {success:false, result, message:`The contract is met, but at ${result.cost} credits against the ${level.maxCost} this repair is allowed. Something here is paid for and not doing anything.`};
      }
      return {success:true, result, message:`${result.message} The tier that was saturated is the one that had to change; the rest of the design was never the problem.`};
    }
    case 'quiz': {
      if (state.choices.includes(-1)) return {success:false, message:'Answer every question.'};
      const wrong = level.questions.findIndex((question, index) => state.choices[index] !== question.answer);
      if (wrong >= 0) return {success:false, message:`Question ${wrong + 1} is not right yet. ${level.questions[wrong].why ?? ''}`.trim(), wrong};
      return {success:true, message:level.quizSuccess ?? 'Every answer is right.'};
    }
    default:
      throw new Error(`Unknown puzzle kind “${level.kind}”.`);
  }
}

// ---------------------------------------------------------------- views

// A diagram description the UI renders with generic pieces: no mission-specific
// markup, so adding a mission does not mean adding a renderer.
export function view(level, state, result = null) {
  switch (level.kind) {
    case 'bits': {
      const places = Array.from({length:level.bits.width}, (_, i) => 2 ** (level.bits.width - 1 - i));
      const value = bitValue(level, state.bits);
      return {
        instructions:level.bits.encoding === 'twos'
          ? 'The leftmost bit is the sign bit: when it is on, subtract its place value instead of adding it.'
          : `A bit is 0 (off) or 1 (on). Turn on the place values that add up to ${level.target}.`,
        legend:[`Left to right: ${places.join('s, ')}s`, 'Tap a bit to flip it'],
        summary:`${state.bits.map((bit, index) => bit * places[index]).filter(Boolean).join(' + ') || '0'} = ${value}`,
        diagram:{type:'bits', places, bits:state.bits, value, target:level.target, hex:level.bits.width % 4 === 0 ? toHex(value, level.bits.width) : null, binary:state.bits.join('')}
      };
    }
    case 'sort':
      return {
        instructions:'Exchange two neighbouring entries. Compare their values before choosing a swap.',
        legend:['Array indices start at 0', 'Put the smallest value on the left'],
        summary:`${state.swaps ?? 0} swaps made`,
        diagram:{type:'sort', values:state.values}
      };
    case 'network': {
      const path = evaluateNetwork(level, state.links);
      return {
        instructions:'Choose cables on the map or use the switches below.',
        legend:['━ Enabled cable', '━ Available cable', '↔ Relay / router'],
        summary:`${state.links.length} links enabled · ${path.path.length ? `${path.hops} hops${level.budget ? ` / ${path.cost} ms on the fastest route` : ''}` : 'No complete route'}`,
        diagram:{type:'graph'}
      };
    }
    case 'layers': {
      const headers = state.order.map(id => level.items.find(item => item.id === id));
      const frame = encapsulate(headers, state.dials.payload);
      return {
        instructions:'Order the headers from the first one added to the last, then size the payload so the packet exactly fills the link MTU.',
        legend:[`MTU ${level.mtu} bytes`, `Frame ${frame.frameBytes} bytes`, `${percent(frame.efficiency)} payload`],
        summary:`${state.dials.payload} B payload + ${frame.overheadBytes} B headers = ${frame.frameBytes} B frame`,
        diagram:{type:'stack', rows:[
          {name:'Application payload', detail:`${state.dials.payload} bytes of your data`, size:state.dials.payload, accent:true},
          ...frame.layers.map(layer => ({name:layer.name, detail:`+${layer.bytes} B → ${layer.cumulative} B`, size:layer.cumulative}))
        ]}
      };
    }
    case 'subnet': {
      const block = subnet(level.base, state.dials.prefix);
      return {
        instructions:`Choose the prefix length for a deck that needs ${level.hosts} host addresses.`,
        legend:['A longer prefix is a smaller block', 'Network and broadcast are not usable hosts'],
        summary:`${block.cidr} · ${block.usable} usable · mask ${block.maskText}`,
        diagram:{type:'table', caption:`${block.cidr}`, columns:['Field', 'Value'], rows:[
          ['Prefix length', `/${block.prefix} (${32 - block.prefix} host bits)`],
          ['Subnet mask', block.maskText],
          ['Network address', block.network],
          ['First host', block.firstHost],
          ['Last host', block.lastHost],
          ['Broadcast', block.broadcast],
          ['Usable hosts', `${block.usable} (needs ${level.hosts})`]
        ], highlight:block.usable >= level.hosts ? 6 : -1}
      };
    }
    case 'vlsm': {
      const plan = allocate(level.base, level.basePrefix, level.requests.map(request => ({...request, prefix:state.dials[request.id]})));
      return {
        instructions:`Give each deck a prefix. Blocks are allocated in this order inside ${plan.parent.cidr}.`,
        legend:[`${plan.parent.total} addresses in the parent block`, `${plan.free} still free`],
        summary:`${plan.used} of ${plan.parent.total} addresses assigned`,
        diagram:{type:'table', caption:`${plan.parent.cidr} allocation`, columns:['Deck', 'Needs', 'Block', 'Usable', 'Range'], rows:plan.blocks.map(block => [
          block.name, String(block.needs), `${block.network}/${block.prefix}`, String(block.usable), `${block.firstHost} – ${block.lastHost}`
        ]), problems:plan.blocks.map(block => !block.enough || !block.fits)}
      };
    }
    case 'routing': {
      const rows = level.table.map((route, index) => [route.prefix, route.via, `${subnet(route.prefix.split('/')[0], Number(route.prefix.split('/')[1])).usable} addresses`, `/${route.prefix.split('/')[1]}`]);
      return {
        instructions:'For each destination, choose the route the router would use.',
        legend:['Longest prefix match wins', '0.0.0.0/0 is the default route'],
        summary:`${level.table.length} routes in the table`,
        diagram:{type:'table', caption:'Forwarding table', columns:['Destination prefix', 'Out via', 'Block size', 'Prefix length'], rows}
      };
    }
    case 'transport': {
      const result = transfer(level.link, {window:state.dials.window, protocol:state.dials.protocol ?? 'selective-repeat', bytes:level.bytes});
      return {
        instructions:`Size the window for a ${level.link.capacityMbps} Mbps link with ${level.link.rttMs} ms round-trip time.`,
        legend:[`One bandwidth-delay product ≈ ${result.bdpPackets} packets`, `${result.packets} packets to send`, `${result.retransmissions} retransmitted`],
        summary:`${result.seconds} s · ${result.throughputMbps} Mbps · ${percent(result.utilisation)} of link · ${percent(result.wasted)} wasted`,
        diagram:{type:'bars', caption:'Where the time goes', unit:'', rows:[
          {name:'In flight (window)', value:result.windowBytes, detail:`${result.windowBytes.toLocaleString('en-US')} bytes`},
          {name:'Bandwidth-delay product', value:result.bdpBytes, detail:`${result.bdpBytes.toLocaleString('en-US')} bytes`},
          {name:'Link utilisation', value:result.utilisation * result.bdpBytes, detail:percent(result.utilisation)}
        ]}
      };
    }
    case 'sequence': {
      const skipped = new Set(level.skipWhen && state.dials?.[level.skipWhen.dial] === level.skipWhen.value ? level.skipWhen.skip : []);
      const steps = state.order.map(id => level.items.find(item => item.id === id)).filter(step => !skipped.has(step.id));
      const path = timeline(steps.map(step => ({id:step.id, name:step.name, ms:step.ms})));
      return {
        instructions:level.instructions ?? 'Put the steps in the order they happen.',
        legend:[`${path.rows.length} steps`, `${path.totalMs} ms total`],
        summary:`${path.totalMs} ms to the first byte`,
        diagram:{type:'timeline', caption:'Elapsed time', total:path.totalMs, rows:path.rows.map(row => ({name:row.name, value:row.ms, at:row.elapsed, detail:`${row.ms} ms · at ${row.elapsed} ms`}))}
      };
    }
    case 'hash': {
      const table = hashTable(level, state);
      return {
        instructions:`Store ${level.keys.length} station IDs so every lookup takes at most ${level.maxChain} probe${level.maxChain === 1 ? '' : 's'}.`,
        legend:[`slot = (key × ${table.multiplier}) mod ${table.size}`, `load factor ${table.load.toFixed(2)}`],
        summary:`${table.collisions} slot${table.collisions === 1 ? '' : 's'} with more than one key · longest chain ${table.longest}`,
        diagram:{type:'bars', caption:`${table.size} slots`, rows:table.buckets.map((bucket, index) => ({
          name:`slot ${index}`, value:bucket.length, detail:bucket.length ? bucket.join(', ') : 'empty', problem:bucket.length > 1
        }))}
      };
    }
    case 'reach': {
      const rows = deliveries(level, state);
      const block = rows[0]?.block;
      const arrow = {direct:'on this deck', gateway:'via the gateway', none:'nowhere', invalid:'—'};
      return {
        instructions:`Set the mask and the gateway for ${level.host} so every destination leaves the way the plan says it should.`,
        legend:[block ? `This deck believes it is ${block.cidr}` : 'Invalid address for this mask', 'A host asks its own mask, never the destination\u2019s'],
        summary:block ? `${block.cidr} · ${block.firstHost} – ${block.lastHost} · gateway ${state.dials.gateway}` : 'No valid block',
        diagram:{type:'table', caption:`Where ${level.host} sends each packet`, columns:['Destination', 'Address', 'Should leave', 'Actually leaves'],
          rows:rows.map(row => [row.name, row.address, arrow[row.expect], arrow[row.delivery]]),
          problems:rows.map(row => !row.correct)}
      };
    }
    case 'nat': {
      const run = natRun(level, state);
      return {
        instructions:'One public address serves the whole station. Decide which port, if any, is published to the outside.',
        legend:[`Public address ${level.publicAddress}`, `${run.table.length} translations in the table`, `${run.delivered} of ${level.flows.length} packets delivered`],
        summary:run.forwards.length ? `Published: ${run.forwards.map(rule => `${rule.publicPort} → ${rule.inside}:${rule.insidePort}`).join(', ')}` : 'Nothing published to the outside',
        diagram:{type:'table', caption:'Packets through the router', columns:['Packet', 'Direction', 'Seen as', 'Outcome'],
          rows:run.rows.map(row => [row.name, row.direction === 'out' ? 'outbound' : 'inbound', row.seenAs ?? '—', row.delivered ? 'delivered' : 'dropped']),
          problems:run.rows.map(row => !row.correct)}
      };
    }
    case 'congestion': {
      const runs = congestionRuns(level, state);
      return {
        instructions:'The same transfer runs over both links. Choose how the sender decides its window.',
        legend:['cwnd doubles each round trip until something is lost', 'Then it halves and climbs by one', 'A window past the path fills a buffer, not the pipe'],
        summary:runs.map(entry => `${entry.link.name}: ${entry.result.seconds} s, ${percent(entry.result.utilisation)} of the link, ${percent(entry.result.wasted)} wasted`).join(' · '),
        diagram:{type:'bars', caption:'Each link against its target', rows:runs.flatMap(entry => [
          {name:`${entry.link.name} · time`, value:entry.result.seconds, max:entry.link.target.seconds * 1.6, detail:`${entry.result.seconds} s of ${entry.link.target.seconds} s`, problem:!entry.onTime},
          {name:`${entry.link.name} · wasted`, value:entry.result.wasted, max:Math.max(0.2, entry.link.target.wasted * 3), detail:`${percent(entry.result.wasted)} of ${percent(entry.link.target.wasted)}`, problem:!entry.clean}
        ])}
      };
    }
    case 'estimate': {
      const rows = estimateRows(level, state);
      return {
        instructions:level.instructions ?? 'Work each figure out from the numbers given, then pick the closest.',
        legend:[`${state.choices.filter(choice => choice >= 0).length} of ${level.questions.length} answered`, 'An estimate is right when its order of magnitude is'],
        summary:level.summary ?? '',
        diagram:{type:'table', caption:'What you were told', columns:['Quantity', 'Value'], rows:level.given.map(entry => [entry.label, entry.text])}
      };
    }
    case 'budget': {
      const run = budgetRun(level, state);
      return {
        instructions:`The objective is ${(level.objectiveTarget * 100).toFixed(3)}% over ${Math.round(level.windowMinutes / 1440)} days. Work out what is left, then decide.`,
        legend:[`${run.report.allowedMinutes} minutes allowed in the window`, `${level.incidents.length} incidents recorded`],
        summary:`The window achieved ${run.report.achievedText}`,
        diagram:{type:'table', caption:'Incident log', columns:['Date', 'What happened', 'Down', 'Counts against'],
          rows:level.incidents.map(incident => [incident.date, incident.name, `${incident.minutes} min`, `${Math.round((incident.share ?? 1) * 100)}%`])}
      };
    }
    case 'incident': {
      const result = evaluateArchitecture(incidentDesign(level, state), level.scenario);
      const target = result.scenario.slo;
      return {
        instructions:level.instructions ?? 'Repair the design. Change only what the numbers say is wrong.',
        legend:[`p99 ${result.latencyMs === null ? 'overloaded' : `${result.latencyMs} ms`} of ${target.p99Ms} ms`, `${result.availabilityText} of ${(target.availability * 100).toFixed(4)}%`, `${result.cost} credits of ${level.maxCost ?? target.budget}`],
        summary:result.message,
        diagram:{type:'bars', caption:'Utilisation · arrivals against capacity', rows:[
          {name:'Edge nodes', value:result.utilisation.app, max:1.5, detail:percent(result.utilisation.app), problem:result.utilisation.app >= 1},
          {name:'Datastore reads', value:result.utilisation.read, max:1.5, detail:percent(result.utilisation.read), problem:result.utilisation.read >= 1},
          {name:'Datastore writes', value:result.utilisation.write, max:1.5, detail:percent(result.utilisation.write), problem:result.utilisation.write >= 1}
        ]}
      };
    }
    case 'quiz':
      return {
        instructions:level.instructions ?? 'Choose the best answer for each question.',
        legend:[`${state.choices.filter(choice => choice >= 0).length} of ${level.questions.length} answered`],
        summary:level.summary ?? '',
        diagram:{type:'cards', rows:level.questions.map((question, index) => ({
          name:question.prompt,
          detail:state.choices[index] >= 0 ? (question.options[state.choices[index]].label ?? question.options[state.choices[index]]) : 'unanswered',
          answered:state.choices[index] >= 0,
          data:question.data ?? null
        }))}
      };
    default:
      throw new Error(`Unknown puzzle kind “${level.kind}”.`);
  }
}
