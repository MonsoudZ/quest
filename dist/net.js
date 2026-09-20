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

// -------------------------------------------------------- local delivery

// Whether a host puts a frame on the wire for the destination itself or hands it
// to its gateway is decided entirely by the sending host's own mask — not by the
// destination's. Two hosts with different masks can disagree about whether they
// are neighbours, which is the fault this models.
export function reachability({host, prefix, gateway, destination}) {
  const hostValue = parseAddress(host);
  const destinationValue = parseAddress(destination);
  const block = subnet(hostValue, prefix);
  if (hostValue === block.networkValue && prefix <= 30) fail(`${host} is the network address of ${block.cidr}, so it cannot be a host.`);
  if (hostValue === block.broadcastValue && prefix <= 30) fail(`${host} is the broadcast address of ${block.cidr}, so it cannot be a host.`);

  const local = block.inSubnet(destinationValue);
  const gatewayValue = gateway === null || gateway === undefined ? null : parseAddress(gateway);
  const gatewayLocal = gatewayValue !== null && block.inSubnet(gatewayValue);
  const usable = value => !(prefix <= 30 && (value === block.networkValue || value === block.broadcastValue));

  if (local) {
    return {
      delivery:'direct', reachable:usable(destinationValue), block, local, gatewayLocal,
      arpFor:destination,
      reason:usable(destinationValue)
        ? `${destination} is inside ${block.cidr}, so this host ARPs for it and puts the frame on the wire itself.`
        : `${destination} is the network or broadcast address of ${block.cidr}, so no host answers for it.`
    };
  }
  if (gatewayValue === null) {
    return {delivery:'none', reachable:false, block, local, gatewayLocal:false, arpFor:null,
      reason:`${destination} is outside ${block.cidr} and this host has no gateway, so the packet has nowhere to go.`};
  }
  if (!gatewayLocal) {
    return {delivery:'none', reachable:false, block, local, gatewayLocal, arpFor:null,
      reason:`The gateway ${gateway} is outside ${block.cidr}. A host can only reach a gateway it believes is a neighbour, so this one is unusable.`};
  }
  return {delivery:'gateway', reachable:true, block, local, gatewayLocal, arpFor:gateway,
    reason:`${destination} is outside ${block.cidr}, so this host ARPs for the gateway ${gateway} and sends the frame there.`};
}

// ----------------------------------------------------------------- NAT

// Source NAT with port overloading, the way a home or office router works: many
// private sources share one public address, distinguished by port. The table is
// keyed by the outbound flow, which is why an unsolicited inbound packet has
// nothing to match and is dropped unless a forward was configured in advance.
export function translate({publicAddress, flows, forwards = [], firstPort = 49152, ports = Infinity}) {
  const table = [];
  const byKey = new Map();
  let nextPort = firstPort;
  let refused = 0;
  const results = flows.map(flow => {
    if (flow.direction === 'out') {
      const key = `${flow.source}:${flow.sourcePort}->${flow.destination}:${flow.destinationPort}`;
      let entry = byKey.get(key);
      // One outside port per flow, and a flow is the whole five-tuple: two hosts
      // using the same source port to the same server are still two flows, and a
      // pool with nowhere left to put one has to refuse it.
      if (!entry && table.length >= ports) {
        refused++;
        return {...flow, delivered:false, entry:null, seenAs:null, exhausted:true,
          reason:`All ${ports} outside ports are already allocated to other flows, so the router has nowhere to map this one and drops it. The pool has to hold every flow that is open at once, not every host.`};
      }
      if (!entry) {
        entry = {
          key, inside:flow.source, insidePort:flow.sourcePort,
          outside:publicAddress, outsidePort:nextPort++,
          peer:flow.destination, peerPort:flow.destinationPort
        };
        byKey.set(key, entry);
        table.push(entry);
      }
      return {
        ...flow, delivered:true, entry,
        seenAs:`${entry.outside}:${entry.outsidePort}`,
        reason:`The router rewrites the source to ${entry.outside}:${entry.outsidePort} and remembers the flow, so the reply can be sent back to ${entry.inside}:${entry.insidePort}.`
      };
    }
    // Inbound: a reply to a flow this router started, a configured forward, or
    // nothing. A level names the flow being replied to rather than guessing which
    // port the router happened to allocate.
    const answered = flow.replyTo === undefined ? null : table[flow.replyTo];
    const port = answered ? answered.outsidePort : flow.destinationPort;
    const reply = table.find(entry => entry.outsidePort === port && entry.peer === flow.source);
    if (reply) {
      return {...flow, delivered:true, entry:reply, seenAs:`${reply.inside}:${reply.insidePort}`,
        port, reason:`Port ${port} matches the flow ${reply.inside}:${reply.insidePort} started, so the reply is translated back to it.`};
    }
    const forward = forwards.find(rule => rule.publicPort === port);
    if (forward) {
      return {...flow, delivered:true, entry:null, port, seenAs:`${forward.inside}:${forward.insidePort}`,
        reason:`A forward for port ${forward.publicPort} sends this to ${forward.inside}:${forward.insidePort}. Without it the router would have nothing to match.`};
    }
    return {...flow, delivered:false, entry:null, port, seenAs:null,
      reason:`Nothing inside started a flow on port ${port} and no forward covers it, so the router drops the packet. This is why a device behind NAT is not reachable from outside by default.`};
  });
  return {publicAddress, table, ports, refused, flows:results, delivered:results.filter(flow => flow.delivered).length};
}

// -------------------------------------------------- congestion control

// Slow start and congestion avoidance over the same link model as transfer():
// the window is no longer chosen once, it is discovered. cwnd doubles each round
// trip until it reaches ssthresh or loses a packet, then grows by one packet per
// round trip. A loss halves ssthresh; a timeout drops cwnd back to one.
export function congestion({rttMs, capacityMbps, mss = 1460, bufferPackets = Infinity}, plan) {
  const {bytes, initialWindow = 1, mode = 'slow-start', fixedWindow = 0, maxRounds = 400} = plan;
  if (!['slow-start', 'fixed'].includes(mode)) fail('Choose slow start or a fixed window.');
  const packets = Math.ceil(bytes / mss);
  // Packets a round trip can hold end to end: the bandwidth-delay product, plus
  // whatever the bottleneck buffer will absorb before it starts dropping.
  const bdpPackets = Math.max(1, Math.round((capacityMbps * 1e6 * (rttMs / 1000)) / 8 / mss));
  const ceiling = bdpPackets + (bufferPackets === Infinity ? 0 : bufferPackets);

  let cwnd = mode === 'fixed' ? fixedWindow : initialWindow;
  if (mode === 'fixed' && (!Number.isInteger(fixedWindow) || fixedWindow < 1)) fail('A fixed window holds at least one packet.');
  let ssthresh = Infinity, sent = 0, losses = 0, retransmitted = 0, elapsed = 0;
  const rounds = [];

  while (sent < packets && rounds.length < maxRounds) {
    const inFlight = Math.max(1, Math.min(Math.floor(cwnd), packets - sent));
    // Anything beyond what the path and its buffer hold is dropped this round.
    const dropped = Math.max(0, inFlight - ceiling);
    const through = inFlight - dropped;
    // A round trip costs at least the RTT, and longer if the data cannot be
    // serialised onto the link inside one.
    const serialiseMs = (through * mss * 8) / (capacityMbps * 1000);
    elapsed += Math.max(rttMs, serialiseMs);
    sent += through;
    rounds.push({round:rounds.length + 1, cwnd:Math.floor(cwnd), sent:through, dropped, delivered:sent, atMs:roundTo(elapsed, 2)});

    if (dropped > 0) {
      losses++;
      retransmitted += dropped;
      if (mode === 'slow-start') {
        ssthresh = Math.max(2, Math.floor(cwnd / 2));
        cwnd = ssthresh;                       // fast recovery, not a timeout
      }
      continue;
    }
    if (mode === 'fixed') continue;
    cwnd = cwnd < ssthresh ? cwnd * 2 : cwnd + 1;
  }

  if (sent < packets) fail('This transfer never finishes. A window of one packet per round trip cannot move this much data.');
  const seconds = elapsed / 1000;
  const transmissions = packets + retransmitted;
  return {
    packets, rounds, losses, retransmitted, transmissions,
    wasted:roundTo(retransmitted / transmissions, 4),
    peakWindow:Math.max(...rounds.map(round => round.cwnd)),
    roundTrips:rounds.length,
    timeMs:roundTo(elapsed, 2),
    seconds:roundTo(seconds, 3),
    throughputMbps:roundTo((packets * mss * 8) / (seconds * 1e6), 3),
    utilisation:roundTo((packets * mss * 8) / (seconds * 1e6) / capacityMbps, 4),
    bdpPackets, ceiling, mode
  };
}

// ------------------------------------------------ ports and sockets
//
// A packet is delivered to a socket, not to a host. Which socket is decided by
// the destination address and port, with a socket bound to one address beating
// one bound to every address — which is the whole difference between a service
// that is reachable from the next deck and one that is not.
export function demultiplex({interfaces, sockets, packets}) {
  const bound = sockets.map(socket => ({...socket}));
  // Two sockets on the same address and port cannot both exist. The second bind
  // fails, and the service that lost is simply not listening.
  const taken = new Set();
  for (const socket of bound) {
    const key = `${socket.address}:${socket.port}`;
    // A wildcard bind also conflicts with a specific one on the same port.
    const clash = [...taken].some(other => {
      const [address, port] = other.split(':');
      return Number(port) === socket.port && (address === socket.address || address === '0.0.0.0' || socket.address === '0.0.0.0');
    });
    socket.bound = !clash;
    socket.clashed = clash;
    if (!clash) taken.add(key);
  }

  const results = packets.map(packet => {
    const reachable = interfaces.find(item => item.address === packet.destination);
    if (!reachable) {
      return {...packet, socket:null, delivered:false,
        reason:`Nothing on this host answers to ${packet.destination}, so the packet never arrives.`};
    }
    const exact = bound.find(socket => socket.bound && socket.port === packet.destinationPort && socket.address === packet.destination);
    const wildcard = bound.find(socket => socket.bound && socket.port === packet.destinationPort && socket.address === '0.0.0.0');
    const socket = exact ?? wildcard ?? null;
    if (!socket) {
      return {...packet, socket:null, delivered:false,
        reason:`Nothing is listening on ${packet.destination}:${packet.destinationPort}, so the host refuses the connection.`};
    }
    return {...packet, socket, delivered:true,
      // The interface a packet arrived on is the thing a wildcard bind stops
      // caring about, so it is worth saying which one let this through.
      reason:socket.address === '0.0.0.0'
        ? `${socket.name} is bound to every interface, so it answers on ${reachable.name} as readily as on any other.`
        : `${socket.name} is bound to ${socket.address} only, and that is the address this packet came to.`};
  });
  return {
    sockets:bound, packets:results,
    delivered:results.filter(packet => packet.delivered).length,
    clashes:bound.filter(socket => socket.clashed).length
  };
}

// -------------------------------------- one connection, several streams
//
// Several requests over one origin. Two things decide when the last of them
// finishes: how many can be in flight at once, and what one lost packet costs
// the ones that had nothing to do with it.
//
// A connection is a concurrency limit, because a browser opens at most a
// handful per origin and a request waits for a free one. Ordering is where the
// transports differ: TCP hands the application its bytes in order, so a gap
// stalls everything else on that connection whether or not it is related, and
// a transport with real streams only stalls the stream that lost something.
export function multiplex({streams, rttMs, lossAt, transport = 'tcp', connections = 1, perConnection = 1, handshakeRounds = 2}) {
  if (!['tcp', 'streams'].includes(transport)) fail('Deliver in one ordered byte stream, or in independent streams.');
  if (!(connections >= 1 && perConnection >= 1)) fail('A transfer needs at least one connection with room for one request.');
  const setup = handshakeRounds * rttMs;
  // A slot is one request in flight. A connection that carries one request at a
  // time has one slot; a multiplexed one has as many as it will interleave.
  // Listed a place at a time across all the connections, so the first requests
  // are spread over them rather than filling the first one up.
  const slots = [];
  for (let place = 0; place < perConnection; place++) {
    for (let connection = 0; connection < connections; connection++) slots.push({connection, free:setup, taken:0});
  }
  const rows = streams.map((stream, index) => {
    // The next request takes whichever slot comes free first, which is what a
    // browser's connection pool and a stream scheduler both do.
    // Earliest free, and on a tie the connection that has been used least, so
    // several connections are actually spread across rather than filled in turn.
    const slot = slots.reduce((earliest, candidate) =>
      candidate.free < earliest.free || (candidate.free === earliest.free && candidate.taken < earliest.taken)
        ? candidate : earliest, slots[0]);
    slot.taken = (slot.taken ?? 0) + 1;
    const started = slot.free;
    const clean = started + Math.max(1, stream.rounds) * rttMs;
    slot.free = clean;
    return {...stream, index, connection:slot.connection, started, queued:started > setup, clean, ms:clean};
  });

  // Now the loss. Its own stream always pays a round trip to notice and resend.
  if (lossAt !== undefined && rows[lossAt]) {
    const lost = rows[lossAt];
    lost.ms += rttMs;
    lost.lost = true;
    for (const row of rows) {
      if (row.index === lossAt) continue;
      // On an ordered byte stream everything still in flight on that connection
      // waits for the gap to be filled, related to it or not.
      const inFlight = row.clean > lost.clean - rttMs;
      if (transport === 'tcp' && row.connection === lost.connection && inFlight) {
        row.ms += rttMs;
        row.stalled = true;
      }
    }
  }
  return {
    transport, connections, perConnection, rttMs, lossAt, rows,
    lastMs:Math.max(...rows.map(row => row.ms)),
    queued:rows.filter(row => row.queued).length,
    stalled:rows.filter(row => row.stalled).length,
    cleanMs:Math.max(...rows.map(row => row.clean))
  };
}

// ------------------------------------------------------------- IPv6
//
// 128 bits, so the arithmetic is done in BigInt. Almost nothing here is about
// running out of addresses; it is about what the bottom 64 bits are reserved
// for, which is the part that makes IPv6 subnetting a different activity from
// IPv4 subnetting rather than the same one with longer numbers.
const groupsOf = value => Array.from({length:8}, (_, index) =>
  Number((value >> BigInt(112 - index * 16)) & 0xffffn));

// The canonical text form: lower case, leading zeros dropped, and the longest
// run of zero groups replaced by :: — once, and only if it is longer than one.
export function formatV6(value) {
  const groups = groupsOf(value);
  let bestAt = -1, bestRun = 1, at = -1, run = 0;
  groups.forEach((group, index) => {
    if (group === 0) { if (at < 0) at = index; run++; if (run > bestRun) { bestRun = run; bestAt = at; } }
    else { at = -1; run = 0; }
  });
  const text = groups.map(group => group.toString(16));
  if (bestAt < 0) return text.join(':');
  return `${text.slice(0, bestAt).join(':')}::${text.slice(bestAt + bestRun).join(':')}`;
}

export function parseV6(text) {
  const [head, tail] = text.split('::');
  const left = head ? head.split(':') : [];
  const right = tail === undefined ? [] : tail ? tail.split(':') : [];
  if (tail === undefined && left.length !== 8) fail(`${text} is not a full IPv6 address.`);
  const groups = [...left, ...Array(8 - left.length - right.length).fill('0'), ...right];
  if (groups.length !== 8) fail(`${text} does not expand to eight groups.`);
  return groups.reduce((total, group) => {
    const part = BigInt(parseInt(group || '0', 16));
    if (!(part >= 0n && part <= 0xffffn)) fail(`${group} is not a 16-bit group.`);
    return (total << 16n) | part;
  }, 0n);
}

// What a prefix length actually buys, and what it costs. SLAAC is the whole
// reason 64 is not just a convention: a host builds its own address from the
// bottom 64 bits, so a longer prefix leaves it nowhere to put one.
export function planV6({base, basePrefix, prefix, decks, addressing = 'slaac'}) {
  if (!(prefix >= basePrefix && prefix <= 128)) fail(`A /${prefix} is not inside a /${basePrefix}.`);
  if (!['slaac', 'dhcpv6', 'static'].includes(addressing)) fail('Configure addresses by SLAAC, by DHCPv6, or by hand.');
  const network = parseV6(base);
  const step = 1n << BigInt(128 - prefix);
  const subnets = 1n << BigInt(prefix - basePrefix);
  const hostBits = 128 - prefix;
  return {
    base, basePrefix, prefix, addressing, hostBits,
    subnets, step,
    // SLAAC builds the bottom 64 bits from the interface, so it needs all 64.
    slaacWorks: hostBits === 64,
    perSubnet: 1n << BigInt(hostBits),
    enough: subnets >= BigInt(decks.length),
    rows: decks.map((deck, index) => {
      const start = network + step * BigInt(index);
      return {
        name:deck.name, hosts:deck.hosts,
        cidr:`${formatV6(start)}/${prefix}`,
        first:formatV6(start + 1n),
        // What a host actually ends up with under SLAAC: the prefix plus an
        // identifier it makes up itself, which is why the split is at 64.
        example:hostBits === 64 ? formatV6(start + 0x0000_0a2f_fffe_31c4n) : formatV6(start + 2n)
      };
    })
  };
}

// ------------------------------------------------------- trust and chains
//
// A certificate says a name belongs to a key. Believing it means finding a path
// from it to something you already trusted before the connection started, which
// is the only part of this that is not just signatures.
const covers = (pattern, host) => pattern === host ||
  (pattern.startsWith('*.') && host.endsWith(pattern.slice(1)) && !host.slice(0, -(pattern.length - 1)).includes('.'));

export function validate({sent, store, host, now = 0}) {
  if (!sent.length) return {ok:false, fault:'nothing', path:[], reason:'The server sent no certificate at all, so there is nothing to check.'};
  const leaf = sent[0];
  const path = [];
  // TLS says the end-entity certificate comes first. Some clients will hunt for
  // it anyway; a client that does not simply fails, which is the worst kind of
  // bug to have because it depends on who is calling.
  if (!leaf.leaf) {
    return {ok:false, fault:'order', path:[leaf],
      reason:`The first certificate sent is ${leaf.subject}, which is an intermediate. The chain has to start with the certificate for the name being connected to; a client that takes the server at its word stops here.`};
  }
  if (!leaf.names.some(name => covers(name, host))) {
    return {ok:false, fault:'name', path:[leaf],
      reason:`This certificate is good for ${leaf.names.join(', ')} and the connection asked for ${host}. A name it does not cover is not a name it vouches for.`};
  }
  let current = leaf;
  const seen = new Set();
  while (current) {
    path.push(current);
    if (current.notAfter !== undefined && current.notAfter < now) {
      return {ok:false, fault:'expired', path,
        reason:`${current.subject} expired. Every certificate on the path has to still be valid, not only the one with your name on it.`};
    }
    if (store.includes(current.subject)) return {ok:true, path, anchored:current.subject, sentRoot:sent.some(item => store.includes(item.subject))};
    if (store.includes(current.issuer)) {
      path.push({subject:current.issuer, inStore:true});
      return {ok:true, path, anchored:current.issuer, sentRoot:sent.some(item => store.includes(item.subject))};
    }
    if (seen.has(current.subject)) return {ok:false, fault:'loop', path, reason:'This chain points back at itself and never reaches anything trusted.'};
    seen.add(current.subject);
    const next = sent.find(item => item.subject === current.issuer);
    if (!next) {
      return {ok:false, fault:'incomplete', path,
        reason:`${current.subject} was issued by ${current.issuer}, and ${current.issuer} was not sent and is not in the trust store. The path stops here. A browser that has cached ${current.issuer} from some other site will fill the gap itself and the connection will look fine — which is why this is usually found by something that is not a browser.`};
    }
    current = next;
  }
  return {ok:false, fault:'incomplete', path, reason:'The chain runs out before it reaches anything trusted.'};
}
