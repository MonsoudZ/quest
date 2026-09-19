import test from 'node:test';
import assert from 'node:assert/strict';
import {parseAddress, formatAddress, maskFor, subnet, smallestPrefixFor, allocate, longestPrefixMatch, encapsulate, transfer, timeline, NetError, reachability, translate, congestion} from '../dist/net.js';

// An independent implementation of IPv4 addressing that works on binary strings
// instead of 32-bit integer arithmetic, so the two cannot share a mistake.
const toBits = text => text.split('.').map(part => Number(part).toString(2).padStart(8, '0')).join('');
const fromBits = bits => [0,1,2,3].map(index => parseInt(bits.slice(index * 8, index * 8 + 8), 2)).join('.');
const networkBits = (text, prefix) => toBits(text).slice(0, prefix).padEnd(32, '0');
const broadcastBits = (text, prefix) => toBits(text).slice(0, prefix).padEnd(32, '1');

const samples = [
  ['10.20.30.44', 26], ['192.168.1.130', 25], ['172.16.5.1', 12], ['8.8.8.8', 32],
  ['203.0.113.17', 31], ['10.0.0.1', 8], ['255.255.255.255', 0], ['0.0.0.0', 24], ['100.64.3.200', 19]
];

test('addresses round-trip through the integer form', () => {
  for (const [address] of samples) assert.equal(formatAddress(parseAddress(address)), address);
  assert.equal(parseAddress('0.0.0.0'), 0);
  assert.equal(parseAddress('255.255.255.255'), 4294967295);
  assert.equal(formatAddress(parseAddress('1.2.3.4')), '1.2.3.4');
});

test('invalid addresses and prefixes are refused', () => {
  for (const bad of ['10.20.30', '10.20.30.256', '10.20.30.4.5', 'ten.twenty.thirty.forty', '', '10.20.30.-1']) {
    assert.throws(() => parseAddress(bad), NetError, bad);
  }
  for (const prefix of [-1, 33, 1.5, '24', NaN]) assert.throws(() => maskFor(prefix), NetError, String(prefix));
});

test('subnet arithmetic matches an independent binary-string implementation', () => {
  for (const [address, prefix] of samples) {
    const block = subnet(address, prefix);
    assert.equal(block.network, fromBits(networkBits(address, prefix)), `${address}/${prefix} network`);
    assert.equal(block.broadcast, fromBits(broadcastBits(address, prefix)), `${address}/${prefix} broadcast`);
    assert.equal(block.maskText, fromBits('1'.repeat(prefix).padEnd(32, '0')), `${address}/${prefix} mask`);
    assert.equal(block.total, 2 ** (32 - prefix));
    assert.equal(block.usable, prefix <= 30 ? 2 ** (32 - prefix) - 2 : 2 ** (32 - prefix));
    assert.equal(block.inSubnet(block.network), true);
    assert.equal(block.inSubnet(block.broadcast), true);
  }
  const example = subnet('10.20.30.44', 26);
  assert.equal(example.cidr, '10.20.30.0/26');
  assert.equal(example.firstHost, '10.20.30.1');
  assert.equal(example.lastHost, '10.20.30.62');
  assert.equal(example.usable, 62);
});

test('a /31 and a /32 use every address they have, as RFC 3021 allows', () => {
  const pointToPoint = subnet('203.0.113.16', 31);
  assert.equal(pointToPoint.usable, 2);
  assert.equal(pointToPoint.firstHost, '203.0.113.16');
  assert.equal(pointToPoint.lastHost, '203.0.113.17');
  const host = subnet('8.8.8.8', 32);
  assert.equal(host.usable, 1);
  assert.equal(host.network, host.broadcast);
});

test('the smallest prefix for a host count is the tightest one that still fits', () => {
  for (let hosts = 1; hosts <= 1000; hosts++) {
    const prefix = smallestPrefixFor(hosts);
    assert.ok(subnet('10.0.0.0', prefix).usable >= hosts, `${hosts} needs more than /${prefix}`);
    if (prefix < 32) assert.ok(subnet('10.0.0.0', prefix + 1).usable < hosts, `/${prefix + 1} would also fit ${hosts}`);
  }
  assert.equal(smallestPrefixFor(1), 32);
  assert.equal(smallestPrefixFor(2), 31);
  assert.equal(smallestPrefixFor(3), 29);
  assert.equal(smallestPrefixFor(40), 26);
  assert.equal(smallestPrefixFor(254), 24);
  assert.throws(() => smallestPrefixFor(0), NetError);
});

test('allocated blocks are aligned, ordered, and never overlap', () => {
  const requests = [{name:'Ops', hosts:100, prefix:25}, {name:'Labs', hosts:50, prefix:26}, {name:'Dock', hosts:20, prefix:27}, {name:'Bridge', hosts:6, prefix:29}];
  const plan = allocate('10.20.0.0', 24, requests);
  assert.deepEqual(plan.blocks.map(block => block.cidr), ['10.20.0.0/25', '10.20.0.128/26', '10.20.0.192/27', '10.20.0.224/29']);
  assert.equal(plan.overlap, false);
  assert.equal(plan.fits, true);
  assert.equal(plan.enough, true);
  assert.equal(plan.free, 24);
  for (const block of plan.blocks) assert.equal(parseAddress(block.network) % block.total, 0, `${block.cidr} is not aligned to its own size`);
  // Alignment is what makes order matter: a small block placed before a large
  // one can leave a gap the large one cannot start in.
  const fragmented = allocate('10.20.0.0', 24, [{name:'A', hosts:60, prefix:26}, {name:'B', hosts:120, prefix:25}, {name:'C', hosts:60, prefix:26}]);
  assert.equal(fragmented.fits, false);
  assert.deepEqual(fragmented.blocks.map(block => block.cidr), ['10.20.0.0/26', '10.20.0.128/25', '10.20.1.0/26']);
  assert.deepEqual(fragmented.blocks.map(block => block.fits), [true, true, false]);
  // 64 addresses were stranded between the first block and the aligned start of the second.
  assert.equal(fragmented.span, 320);
  const packed = allocate('10.20.0.0', 24, [{name:'B', hosts:120, prefix:25}, {name:'A', hosts:60, prefix:26}, {name:'C', hosts:60, prefix:26}]);
  assert.equal(packed.fits, true);
  assert.equal(packed.span, 256);
  assert.equal(packed.free, 0);
  // Blocks that are too small are reported per deck.
  const cramped = allocate('10.20.0.0', 24, requests.map(request => ({...request, prefix:28})));
  assert.equal(cramped.blocks[0].enough, false);
  assert.equal(cramped.blocks[3].enough, true);
});

test('longest prefix match agrees with an independent binary-prefix search', () => {
  const table = [
    {prefix:'0.0.0.0/0', via:'uplink'},
    {prefix:'10.0.0.0/8', via:'core'},
    {prefix:'10.20.0.0/16', via:'spine'},
    {prefix:'10.20.30.0/24', via:'lab'},
    {prefix:'10.20.30.64/26', via:'sensor'}
  ];
  const reference = destination => {
    const bits = toBits(destination);
    let best = null;
    table.forEach((route, index) => {
      const [network, length] = route.prefix.split('/');
      const prefix = Number(length);
      if (bits.slice(0, prefix) !== toBits(network).slice(0, prefix)) return;
      if (!best || prefix > best.prefix) best = {index, prefix};
    });
    return best;
  };
  const destinations = ['10.20.30.70', '10.20.30.9', '10.20.30.64', '10.20.30.127', '10.20.30.128', '10.20.99.4', '10.9.1.1', '11.0.0.1', '203.0.113.7', '0.0.0.0', '255.255.255.255'];
  for (const destination of destinations) {
    const found = longestPrefixMatch(table, destination);
    const expected = reference(destination);
    assert.equal(found.index, expected.index, destination);
    assert.equal(found.prefix, expected.prefix, destination);
  }
  assert.equal(longestPrefixMatch(table, '10.20.30.70').route.via, 'sensor');
  assert.equal(longestPrefixMatch(table, '10.20.30.128').route.via, 'lab');
  assert.equal(longestPrefixMatch([{prefix:'10.0.0.0/8', via:'core'}], '11.0.0.1'), null);
});

test('encapsulation adds every header once and reports the efficiency', () => {
  const frame = encapsulate([{name:'TCP', bytes:20}, {name:'IP', bytes:20}, {name:'Ethernet', bytes:38}], 1460);
  assert.equal(frame.frameBytes, 1538);
  assert.equal(frame.overheadBytes, 78);
  assert.deepEqual(frame.layers.map(layer => layer.cumulative), [1480, 1500, 1538]);
  assert.ok(Math.abs(frame.efficiency - 1460 / 1538) < 1e-12);
  const tiny = encapsulate([{name:'TCP', bytes:20}, {name:'IP', bytes:20}, {name:'Ethernet', bytes:38}], 100);
  assert.ok(tiny.efficiency < 0.57, 'small payloads spend most of the frame on headers');
});

const link = {rttMs:200, capacityMbps:50, mss:1460, lossEvery:0};
const megabyte = 8 * 1048576;

test('a transfer delivers every packet exactly once and accounts for every transmission', () => {
  for (const window of [1, 8, 512, 857, 4096]) {
    for (const protocol of ['selective-repeat', 'go-back-n']) {
      for (const lossEvery of [0, 7, 64]) {
        const result = transfer({...link, lossEvery}, {window, protocol, bytes:262144});
        assert.equal(result.packets, Math.ceil(262144 / 1460));
        assert.equal(result.transmissions, result.packets + result.retransmissions);
        assert.ok(result.timeMs > 0);
        assert.ok(result.throughputMbps <= link.capacityMbps + 1e-6, `${window}/${protocol}: throughput above capacity`);
        if (lossEvery === 0) assert.equal(result.retransmissions, 0);
        else assert.ok(result.retransmissions > 0);
      }
    }
  }
});

test('transfer time matches the closed-form models at both ends of the window range', () => {
  const serialise = (1460 * 8) / (50 * 1000);
  const packets = Math.ceil(megabyte / 1460);
  // Stop-and-wait: one packet per round trip.
  const single = transfer(link, {window:1, bytes:megabyte});
  assert.ok(Math.abs(single.timeMs - packets * (serialise + 200)) < 1, `${single.timeMs}`);
  // A window at or beyond the bandwidth-delay product keeps the link busy, so
  // the transfer costs one serialisation each plus a single round trip.
  const saturated = transfer(link, {window:4096, bytes:megabyte});
  assert.ok(Math.abs(saturated.timeMs - (packets * serialise + 200)) < 1, `${saturated.timeMs}`);
  assert.equal(saturated.bdpPackets, Math.ceil((50e6 * 0.2 / 8) / 1460));
  assert.ok(saturated.utilisation > 0.85);
});

test('a larger window never makes a transfer slower, and the bandwidth-delay product is where it stops helping', () => {
  let previous = Infinity;
  for (const window of [1, 2, 4, 32, 128, 512, 857, 1024, 2048]) {
    const result = transfer(link, {window, bytes:megabyte});
    assert.ok(result.timeMs <= previous + 1e-9, `window ${window} was slower than the smaller window`);
    previous = result.timeMs;
  }
  const atProduct = transfer(link, {window:857, bytes:megabyte}).timeMs;
  const beyond = transfer(link, {window:4096, bytes:megabyte}).timeMs;
  assert.ok(atProduct - beyond < atProduct * 0.02, 'beyond one bandwidth-delay product there is almost nothing left to gain');
});

test('Go-Back-N resends more than selective repeat and is never faster', () => {
  for (const lossEvery of [16, 64, 256]) {
    const lossy = {...link, lossEvery};
    const selective = transfer(lossy, {window:2048, protocol:'selective-repeat', bytes:megabyte});
    const goBack = transfer(lossy, {window:2048, protocol:'go-back-n', bytes:megabyte});
    assert.ok(goBack.retransmissions > selective.retransmissions * 5, `loss 1/${lossEvery}`);
    assert.ok(goBack.timeMs >= selective.timeMs);
    assert.ok(selective.wasted < 2 / lossEvery && goBack.wasted > 0.3, `loss 1/${lossEvery}: ${selective.wasted} vs ${goBack.wasted}`);
    assert.equal(selective.retransmissions, Math.floor(selective.packets / lossEvery));
  }
});

test('transfer rejects impossible plans instead of looping', () => {
  assert.throws(() => transfer(link, {window:0, bytes:1000}), /at least one packet/);
  assert.throws(() => transfer(link, {window:1.5, bytes:1000}), /at least one packet/);
  assert.throws(() => transfer(link, {window:4, protocol:'shout-louder', bytes:1000}), /selective repeat or Go-Back-N/);
});

test('a timeline accumulates elapsed time in order', () => {
  const path = timeline([{name:'a', ms:10}, {name:'b', ms:5}, {name:'c', ms:2.5}]);
  assert.deepEqual(path.rows.map(row => row.elapsed), [10, 15, 17.5]);
  assert.equal(path.totalMs, 17.5);
  assert.equal(timeline([]).totalMs, 0);
});

test('a host decides local delivery from its own mask, and nothing else', () => {
  // The same destination, two masks: /24 makes it a neighbour, /25 does not.
  const wide = reachability({host:'10.20.0.10', prefix:24, gateway:'10.20.0.1', destination:'10.20.0.130'});
  const tight = reachability({host:'10.20.0.10', prefix:25, gateway:'10.20.0.1', destination:'10.20.0.130'});
  assert.equal(wide.delivery, 'direct');
  assert.equal(tight.delivery, 'gateway');
  assert.equal(tight.arpFor, '10.20.0.1');

  // A gateway outside the host's own block cannot be used, however valid it looks.
  const stranded = reachability({host:'10.20.0.10', prefix:25, gateway:'10.20.0.129', destination:'10.30.0.5'});
  assert.equal(stranded.delivery, 'none');
  assert.equal(stranded.gatewayLocal, false);
  assert.match(stranded.reason, /outside/);

  // No gateway at all is a different fault with the same symptom.
  assert.equal(reachability({host:'10.20.0.10', prefix:25, gateway:null, destination:'10.30.0.5'}).delivery, 'none');

  // Network and broadcast addresses are not hosts, in either direction.
  assert.equal(reachability({host:'10.20.0.10', prefix:25, gateway:'10.20.0.1', destination:'10.20.0.127'}).reachable, false);
  assert.throws(() => reachability({host:'10.20.0.0', prefix:25, gateway:'10.20.0.1', destination:'10.20.0.9'}), /network address/);
  assert.throws(() => reachability({host:'10.20.0.127', prefix:25, gateway:'10.20.0.1', destination:'10.20.0.9'}), /broadcast address/);

  // A /31 has no network or broadcast address to lose, so both ends are hosts.
  assert.equal(reachability({host:'10.20.0.0', prefix:31, gateway:null, destination:'10.20.0.1'}).delivery, 'direct');

  // Checked against the arithmetic done independently: same block, same answer.
  const mask = prefix => prefix === 0 ? 0 : (0xFFFFFFFF << (32 - prefix)) >>> 0;
  const value = text => text.split('.').reduce((total, part) => total * 256 + Number(part), 0);
  for (const prefix of [8, 16, 20, 24, 25, 26, 28, 30]) {
    for (const destination of ['10.20.0.20', '10.20.0.130', '10.20.5.5', '10.30.0.5', '192.0.2.1']) {
      const expected = ((value('10.20.0.10') & mask(prefix)) >>> 0) === ((value(destination) & mask(prefix)) >>> 0);
      const actual = reachability({host:'10.20.0.10', prefix, gateway:'10.20.0.1', destination}).local;
      assert.equal(actual, expected, `/${prefix} → ${destination}`);
    }
  }
});

test('NAT tells flows apart by port, and drops what nothing inside asked for', () => {
  const flows = [
    {direction:'out', source:'10.20.0.10', sourcePort:51000, destination:'203.0.113.9', destinationPort:443},
    {direction:'out', source:'10.20.0.11', sourcePort:51000, destination:'203.0.113.9', destinationPort:443},
    {direction:'in', source:'203.0.113.9', sourcePort:443, replyTo:0},
    {direction:'in', source:'203.0.113.9', sourcePort:443, replyTo:1},
    {direction:'in', source:'198.51.100.7', sourcePort:40112, destinationPort:22}
  ];
  const run = translate({publicAddress:'198.51.100.2', flows});
  // Two inside hosts using the identical private port still get distinct
  // outside ports, which is the only thing keeping their replies apart.
  assert.equal(run.table.length, 2);
  assert.notEqual(run.table[0].outsidePort, run.table[1].outsidePort);
  assert.equal(run.flows[2].seenAs, '10.20.0.10:51000');
  assert.equal(run.flows[3].seenAs, '10.20.0.11:51000');
  assert.equal(run.flows[4].delivered, false);
  assert.match(run.flows[4].reason, /no forward covers it/);

  // The same outbound flow seen twice reuses its entry rather than burning a port.
  const repeated = translate({publicAddress:'198.51.100.2', flows:[flows[0], flows[0], flows[0]]});
  assert.equal(repeated.table.length, 1);

  // A forward is what makes an inside service reachable, and only that port.
  const published = translate({publicAddress:'198.51.100.2', flows, forwards:[{publicPort:22, inside:'10.20.0.10', insidePort:22}]});
  assert.equal(published.flows[4].delivered, true);
  assert.equal(published.flows[4].seenAs, '10.20.0.10:22');
  const other = translate({publicAddress:'198.51.100.2', flows:[{direction:'in', source:'198.51.100.7', sourcePort:1, destinationPort:80}], forwards:[{publicPort:22, inside:'10.20.0.10', insidePort:22}]});
  assert.equal(other.flows[0].delivered, false);
});

test('slow start finds a path’s window; a fixed one is right for at most one path', () => {
  const spine = {rttMs:8, capacityMbps:400, bufferPackets:12};
  const relay = {rttMs:500, capacityMbps:1.5, bufferPackets:12};
  const bytes = 4 * 1048576;

  // The bandwidth-delay product, computed here independently of the model.
  const bdp = link => Math.round((link.capacityMbps * 1e6 * (link.rttMs / 1000)) / 8 / 1460);
  assert.equal(congestion(spine, {bytes, mode:'slow-start'}).bdpPackets, bdp(spine));
  assert.equal(congestion(relay, {bytes, mode:'slow-start'}).bdpPackets, bdp(relay));

  // Doubling every round trip until something is lost, then halving.
  const ramp = congestion(spine, {bytes, mode:'slow-start'}).rounds.slice(0, 6).map(round => round.cwnd);
  assert.deepEqual(ramp, [1, 2, 4, 8, 16, 32]);

  // A window far past what the path holds buys no time and costs retransmissions.
  const tuned = congestion(spine, {bytes, mode:'fixed', fixedWindow:bdp(spine)});
  const bloated = congestion(spine, {bytes, mode:'fixed', fixedWindow:bdp(spine) * 4});
  assert.equal(tuned.wasted, 0);
  assert.ok(bloated.wasted > 0.3, `${bloated.wasted}`);
  assert.ok(bloated.seconds >= tuned.seconds * 0.95, 'a bloated window is not faster');

  // A window far under it leaves the link idle.
  const starved = congestion(spine, {bytes, mode:'fixed', fixedWindow:16});
  assert.ok(starved.utilisation < 0.1, `${starved.utilisation}`);
  assert.ok(starved.seconds > tuned.seconds * 8);

  // No single fixed window meets both links; slow start meets both.
  const meets = (link, result) => result.seconds <= link.target && result.wasted <= 0.1;
  const targets = [{...spine, target:0.3}, {...relay, target:30}];
  for (const window of [16, 64, 274, 512]) {
    const both = targets.every(link => meets(link, congestion(link, {bytes, mode:'fixed', fixedWindow:window})));
    assert.equal(both, false, `a fixed window of ${window} met both links`);
  }
  assert.equal(targets.every(link => meets(link, congestion(link, {bytes, mode:'slow-start'}))), true);

  assert.throws(() => congestion(spine, {bytes, mode:'fixed', fixedWindow:0}), /at least one packet/);
  assert.throws(() => congestion(spine, {bytes, mode:'sideways'}), /slow start or a fixed window/);
});
