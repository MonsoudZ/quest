// Networking models for the networking chapter.
//
// These are teaching models, not a protocol stack. Addressing, prefix matching,
// and header arithmetic below follow the real rules; the transport simulation is
// a deliberately simplified sliding window (fixed serialisation delay, a fixed
// loss pattern, no congestion control, no reordering, no delayed ACKs) chosen
// because it is deterministic and because it still shows the effects that matter:
// the bandwidth-delay product, window sizing, and the cost of retransmission.

export class NetError extends Error {}
const fail = message => { throw new NetError(message); };

// ------------------------------------------------------------ addressing

export function parseAddress(text) {
  if (typeof text !== 'string') fail('Write an address as four numbers separated by dots.');
  const parts = text.trim().split('.');
  if (parts.length !== 4) fail(`“${text}” is not an IPv4 address: it needs four parts.`);
  return parts.reduce((total, part) => {
    if (!/^\d{1,3}$/.test(part)) fail(`“${text}” has a part that is not a number from 0 to 255.`);
    const octet = Number(part);
    if (octet > 255) fail(`“${text}” has an octet above 255.`);
    return total * 256 + octet;
  }, 0);
}
export const formatAddress = value => [24, 16, 8, 0].map(shift => (value >>> shift) & 255).join('.');
export const maskFor = prefix => {
  if (!Number.isInteger(prefix) || prefix < 0 || prefix > 32) fail('A prefix length is a whole number from 0 to 32.');
  return prefix === 0 ? 0 : (0xFFFFFFFF << (32 - prefix)) >>> 0;
};

// Usable host addresses exclude the network and broadcast addresses, except on
// /31 and /32, where RFC 3021 point-to-point links and single hosts use them.
export function subnet(address, prefix) {
  const value = typeof address === 'number' ? address >>> 0 : parseAddress(address);
  const mask = maskFor(prefix);
  const network = (value & mask) >>> 0;
  const total = 2 ** (32 - prefix);
  const broadcast = (network + total - 1) >>> 0;
  const usable = prefix <= 30 ? total - 2 : total;
  return {
    prefix, mask, total, usable,
    address:formatAddress(value),
    network:formatAddress(network),
    broadcast:formatAddress(broadcast),
    firstHost:formatAddress(prefix <= 30 ? network + 1 : network),
    lastHost:formatAddress(prefix <= 30 ? broadcast - 1 : broadcast),
    maskText:formatAddress(mask),
    cidr:`${formatAddress(network)}/${prefix}`,
    networkValue:network,
    broadcastValue:broadcast,
    inSubnet:(other) => {
      const candidate = typeof other === 'number' ? other >>> 0 : parseAddress(other);
      return ((candidate & mask) >>> 0) === network;
    }
  };
}

// The smallest prefix (largest block) is the one with the most host bits, so the
// tightest fit for a host count is the longest prefix that still has room.
export function smallestPrefixFor(hosts) {
  if (!Number.isInteger(hosts) || hosts < 1) fail('A subnet has to hold at least one host.');
  for (let prefix = 32; prefix >= 0; prefix--) {
    const usable = prefix <= 30 ? 2 ** (32 - prefix) - 2 : 2 ** (32 - prefix);
    if (usable >= hosts) return prefix;
  }
  return 0;
}

// Variable-length subnet masking: each block is aligned to its own size, in the
// order requested. Requesting small blocks first fragments the space, which is
// the lesson the mission is built around.
export function allocate(base, basePrefix, requests) {
  const parent = subnet(base, basePrefix);
  let cursor = parent.networkValue;
  const blocks = requests.map(request => {
    const size = 2 ** (32 - request.prefix);
    const start = Math.ceil(cursor / size) * size;
    const block = subnet(start >>> 0, request.prefix);
    const fits = start + size - 1 <= parent.broadcastValue && start >= parent.networkValue;
    cursor = start + size;
    return {
      ...block,
      name:request.name,
      needs:request.hosts,
      enough:block.usable >= request.hosts,
      fits,
      wasted:Math.max(0, block.usable - request.hosts)
    };
  });
  // The space consumed is the distance to the end of the last block, which
  // includes any padding alignment left behind.
  const span = Math.max(0, cursor - parent.networkValue);
  const used = blocks.reduce((total, block) => total + block.total, 0);
  return {
    parent, blocks, used, span,
    free:Math.max(0, parent.total - span),
    fits:blocks.every(block => block.fits),
    enough:blocks.every(block => block.enough),
    overlap:blocks.some((block, i) => blocks.some((other, j) => j > i && block.networkValue <= other.broadcastValue && other.networkValue <= block.broadcastValue))
  };
}

// --------------------------------------------------------------- routing

// Longest prefix match, the rule every IP router uses: the most specific route
// that contains the destination wins, and 0.0.0.0/0 is the default route.
export function longestPrefixMatch(table, destination) {
  const value = parseAddress(destination);
  let best = null;
  table.forEach((route, index) => {
    const [network, prefixText] = route.prefix.split('/');
    const prefix = Number(prefixText);
    const mask = maskFor(prefix);
    if (((value & mask) >>> 0) !== ((parseAddress(network) & mask) >>> 0)) return;
    if (!best || prefix > best.prefix) best = {index, prefix, route};
  });
  return best;
}

// ---------------------------------------------------- encapsulation

// Each layer wraps the payload handed down from the layer above it, so a frame
// carries every header from every layer below the application.
export function encapsulate(headers, payloadBytes) {
  let bytes = payloadBytes;
  const wrapped = headers.map(header => {
    bytes += header.bytes;
    return {...header, cumulative:bytes};
  });
  return {
    payloadBytes,
    frameBytes:bytes,
    overheadBytes:bytes - payloadBytes,
    efficiency:payloadBytes / bytes,
    layers:wrapped
  };
}

// ------------------------------------------------------------ transport

const roundTo = (value, places = 3) => Number(value.toFixed(places));

// Event-driven sliding-window transfer. The sender may have `window` packets
// unacknowledged; the link serialises one packet at a time; a packet whose
// sequence number matches the loss pattern is dropped on its first transmission
// and recovered by a timeout. Go-Back-N resends the whole window from the lost
// packet; selective repeat resends only what was lost.
export function transfer(link, plan) {
  const {rttMs, capacityMbps, mss = 1460, lossEvery = 0} = link;
  const {window, protocol = 'selective-repeat', bytes} = plan;
  if (!Number.isInteger(window) || window < 1) fail('A window holds at least one packet.');
  if (!['selective-repeat','go-back-n'].includes(protocol)) fail('Choose selective repeat or Go-Back-N.');
  const packets = Math.ceil(bytes / mss);
  const serialise = (mss * 8) / (capacityMbps * 1000); // ms on the wire, per packet
  const timeout = plan.timeoutMs ?? rttMs * 2;
  const attempts = new Array(packets).fill(0);
  const delivered = new Array(packets).fill(false);
  let base = 0, nextSeq = 0, free = 0, clock = 0, retransmissions = 0, events = [], guard = 0;

  const schedule = event => { events.push(event); };
  const send = seq => {
    const start = Math.max(free, clock);
    free = start + serialise;
    attempts[seq]++;
    if (attempts[seq] > 1) retransmissions++;
    const dropped = lossEvery > 0 && attempts[seq] === 1 && (seq + 1) % lossEvery === 0;
    if (!dropped) schedule({at:start + serialise + rttMs, type:'ack', seq});
    schedule({at:start + serialise + timeout, type:'timeout', seq});
  };

  while (base < packets) {
    if (++guard > 200000) fail('This transfer never finishes. Check the window and loss settings.');
    while (nextSeq < packets && nextSeq < base + window) send(nextSeq++);
    if (!events.length) fail('The transfer stalled with nothing in flight.');
    events.sort((a, b) => a.at - b.at || (a.type === 'ack' ? -1 : 1));
    const event = events.shift();
    clock = Math.max(clock, event.at);
    if (event.type === 'ack') {
      delivered[event.seq] = true;
      while (base < packets && delivered[base]) base++;
      continue;
    }
    if (delivered[event.seq] || event.seq < base) continue;
    if (protocol === 'go-back-n') {
      events = events.filter(pending => pending.seq < base);
      nextSeq = base;
    } else {
      events = events.filter(pending => pending.seq !== event.seq);
      send(event.seq);
    }
  }

  const seconds = clock / 1000;
  const bdpBytes = (capacityMbps * 1e6 * (rttMs / 1000)) / 8;
  const attemptsTotal = packets + retransmissions;
  return {
    packets, retransmissions,
    transmissions:attemptsTotal,
    bytesSent:attemptsTotal * mss,
    wasted:roundTo(retransmissions / attemptsTotal, 4),
    timeMs:roundTo(clock, 2),
    seconds:roundTo(seconds, 3),
    throughputMbps:roundTo((packets * mss * 8) / (seconds * 1e6), 3),
    utilisation:roundTo((packets * mss * 8) / (seconds * 1e6) / capacityMbps, 4),
    serialiseMs:roundTo(serialise, 4),
    bdpBytes:Math.round(bdpBytes),
    bdpPackets:Math.max(1, Math.ceil(bdpBytes / mss)),
    windowBytes:window * mss,
    protocol, window
  };
}

// ------------------------------------------------------- request timelines

// A request is a sequence of round trips. Total time is what the player is
// trying to shrink, by removing round trips rather than by adding bandwidth.
export function timeline(steps) {
  let elapsed = 0;
  const rows = steps.map(step => {
    elapsed += step.ms;
    return {...step, elapsed:roundTo(elapsed, 2)};
  });
  return {rows, totalMs:roundTo(elapsed, 2)};
}
