import test from 'node:test';
import assert from 'node:assert/strict';
import {exactValue, accumulate, finestUnit, representations, encodeUtf8, measure, truncate, traverse, hammingEncode, hammingCheck, buildTree, MachineError} from '../dist/machine.js';

test('a double is printed in full, not in the shortest string that round-trips', () => {
  // The exact expansion, worked out independently: 0.1 is the 53-bit integer
  // 3602879701896397 divided by 2^55, and that fraction terminates in decimal.
  assert.equal(exactValue(0.1), '0.1000000000000000055511151231257827021181583404541015625');
  // Recomputed here from the bit pattern alone: 0.1 is the integer 3602879701896397
  // over 2^55, and dividing by 2^55 is multiplying by 5^55 and moving the point.
  const byHand = String(3602879701896397n * 5n ** 55n).padStart(56, '0');
  assert.equal(`0.${byHand.slice(byHand.length - 55).replace(/0+$/, '')}`, exactValue(0.1));
  assert.equal(exactValue(0.5), '0.5');
  assert.equal(exactValue(0.25), '0.25');
  assert.equal(exactValue(3.5), '3.5');
  assert.equal(exactValue(0.1 + 0.2), '0.3000000000000000444089209850062616169452667236328125');
  assert.equal(exactValue(1), '1');
  assert.equal(exactValue(-2.5), '-2.5');
  assert.equal(exactValue(0), '0');
  assert.equal(exactValue(Infinity), 'Infinity');
  // A subnormal has no implicit leading one, and still has an exact expansion.
  assert.match(exactValue(Number.MIN_VALUE), /^0\.0{323}49406564584124654/);
  // Whatever is printed has to parse back to the same double.
  for (const value of [0.1, 0.2, 0.3, 1 / 3, 1e-7, 1234.5678, Math.PI]) {
    assert.equal(Number(exactValue(value)), value, String(value));
  }
});

test('only integer minor units add up exactly, and only in a fine enough unit', () => {
  const amounts = Array.from({length:1000}, () => 0.01);
  const doubles = accumulate(amounts, {representation:'float64'});
  const singles = accumulate(amounts, {representation:'float32'});
  const cents = accumulate(amounts, {representation:'whole', scale:100});

  assert.equal(doubles.equal, false);
  assert.equal(singles.equal, false);
  assert.equal(cents.equal, true);
  assert.equal(cents.value, 10);
  // Fewer bits of significand, a larger error: the fault is the representation.
  assert.ok(Math.abs(singles.error) > Math.abs(doubles.error) * 100, `${singles.error} vs ${doubles.error}`);

  // An integer counter is exact about its own unit and says nothing about the
  // amounts that do not fit in one. Counting a half-cent charge in cents rounds
  // every one of them before a single addition happens.
  const metered = [...Array.from({length:200}, () => 0.005), 1.5];
  assert.equal(finestUnit(metered), 1000);
  assert.equal(accumulate(metered, {representation:'whole', scale:100}).equal, false, 'cents cannot write down half a cent');
  assert.equal(accumulate(metered, {representation:'whole', scale:100}).rounded, 200);
  assert.equal(accumulate(metered, {representation:'whole', scale:1000}).equal, true);
  assert.equal(accumulate(metered, {representation:'whole', scale:1000}).tight, true, 'mills is the smallest unit that fits');
  assert.equal(accumulate(metered, {representation:'whole', scale:10000}).equal, true);
  assert.equal(accumulate(metered, {representation:'whole', scale:10000}).tight, false, 'exact, and finer than it needs to be');
  // No unit rescues a binary fraction.
  assert.equal(accumulate(metered, {representation:'float64', scale:1000}).equal, false);

  // Adding smallest first keeps small amounts from being rounded away against a
  // total that has already grown, so the error shrinks. It is not a fix: on some
  // inputs it happens to land exactly, and on others it does not.
  const mixed = [...Array.from({length:500}, () => 0.01), 9999.99, ...Array.from({length:500}, () => 0.01)];
  const asGiven = accumulate(mixed, {representation:'float64', order:'given'});
  const ascending = accumulate(mixed, {representation:'float64', order:'ascending'});
  assert.equal(asGiven.equal, false);
  assert.ok(Math.abs(ascending.error) < Math.abs(asGiven.error));
  const awkward = [...Array.from({length:600}, () => 0.01), ...Array.from({length:120}, () => 0.07), 19.99, 4.5, 133.28, 0.03];
  assert.equal(accumulate(awkward, {representation:'float64', order:'given'}).equal, false);
  assert.equal(accumulate(awkward, {representation:'float64', order:'ascending'}).equal, false, 'reordering is not a fix');
  // Order never rescues integers or breaks them.
  assert.equal(accumulate(mixed, {representation:'whole', scale:100, order:'ascending'}).equal, true);
  assert.equal(accumulate(mixed, {representation:'whole', scale:100, order:'given'}).equal, true);

  assert.throws(() => accumulate([1], {representation:'decimal128'}), /no representation/);
  assert.throws(() => accumulate([1], {order:'random'}), /as they come or smallest first/);
  for (const model of Object.values(representations)) assert.ok(model.label.length > 8 && model.note.length > 20);
});

test('UTF-8 encoding matches what the platform encoder produces', () => {
  const encoder = new TextEncoder();
  for (const text of ['A', 'é', 'ü', '東', 'か', '👨', '👨‍👩‍👧', 'Zoë Müller-Grün', 'アレクサンドラ ヤマモト', '']) {
    assert.deepEqual(measure(text).byteValues, [...encoder.encode(text)], text);
    assert.equal(measure(text).bytes, encoder.encode(text).length, text);
  }
  // The boundaries of each encoded length, checked one either side.
  assert.equal(encodeUtf8(0x7F).length, 1);
  assert.equal(encodeUtf8(0x80).length, 2);
  assert.equal(encodeUtf8(0x7FF).length, 2);
  assert.equal(encodeUtf8(0x800).length, 3);
  assert.equal(encodeUtf8(0xFFFF).length, 3);
  assert.equal(encodeUtf8(0x10000).length, 4);
  assert.throws(() => encodeUtf8(0x110000), /0 to U\+10FFFF/);

  // The three lengths of one string, and the fact that they disagree.
  const family = measure('👨‍👩‍👧');
  assert.equal(family.codePoints, 5, 'three people and two zero-width joiners');
  assert.equal(family.utf16Units, 8, 'each person is a surrogate pair');
  assert.equal(family.bytes, 18);
  assert.equal('👨‍👩‍👧'.length, family.utf16Units, 'String.length counts UTF-16 units');
});

test('cutting by bytes can split a character; cutting by code points cannot', () => {
  const name = 'Zoë Müller';
  assert.equal(measure(name).bytes, 12);
  assert.equal(measure(name).codePoints, 10);

  const short = truncate(name, 7, {unit:'bytes'});
  assert.equal(short.mangled, true, 'the cut lands inside ü');
  assert.ok(short.bytes <= 7);
  assert.ok(new TextEncoder().encode(short.text).every((_, index, bytes) => bytes.length <= 7));

  // A cut that lands on a boundary is short, not mangled.
  assert.equal(truncate(name, 5, {unit:'bytes'}).mangled, false);
  assert.equal(truncate(name, 12, {unit:'bytes'}).fits, true);
  assert.equal(truncate(name, 11, {unit:'bytes'}).fits, false);

  // By code points, never mangled, and the byte cost is the worst case.
  const cut = truncate('アレクサンドラ ヤマモト', 8, {unit:'codePoints'});
  assert.equal(cut.mangled, false);
  assert.equal([...cut.text].length, 8);
  assert.equal(cut.bytes, 22, 'seven three-byte characters and a space');
  assert.throws(() => truncate(name, 4, {unit:'glyphs'}), /bytes or by code points/);
});

test('cache misses depend on the order, and a tile only helps while it fits', () => {
  const grid = {rows:256, columns:256, mode:'transpose', lineBytes:64, elementBytes:8, cacheLines:16};
  const missesFor = plan => traverse({...grid, ...plan}).misses;

  // Every line has to be fetched once; the question is how many times more.
  const floor = traverse({...grid, tile:8}).compulsory;
  assert.equal(floor, Math.ceil((256 * 256) / 8) * 2, 'two grids, eight values to a line');
  assert.equal(missesFor({tile:8}), floor, 'an 8×8 tile fetches every line exactly once');
  assert.equal(traverse({...grid, tile:8}).avoidable, 0);

  // Untiled, one side of the transpose is always against the grain.
  assert.equal(missesFor({order:'row'}), missesFor({order:'column'}), 'a transpose is symmetric in its badness');
  assert.ok(missesFor({order:'row'}) > floor * 4, `${missesFor({order:'row'})} vs ${floor}`);

  // Too small under-uses each line; too large no longer fits in the cache.
  assert.ok(missesFor({tile:4}) > floor);
  assert.ok(missesFor({tile:16}) > floor, 'a 16×16 tile needs 32 lines and the cache holds 16');
  assert.equal(missesFor({tile:64}), missesFor({order:'row'}), 'a tile larger than the cache is no tile at all');

  // A plain scan of one grid is the textbook row-versus-column case.
  const scan = plan => traverse({rows:128, columns:128, mode:'scan', cacheLines:16, ...plan});
  assert.equal(scan({order:'row'}).missRate, 0.125, 'one miss per eight values');
  assert.equal(scan({order:'column'}).missRate, 1, 'one miss per value');
  assert.throws(() => traverse({rows:0, columns:4}), /at least one row/);
  assert.throws(() => traverse({rows:4, columns:4, order:'diagonal'}), /by row or by column/);
});

test('a Hamming syndrome is the position of the flipped bit, not a yes or no', () => {
  // Every four-bit message, every single-bit error, in all seven positions.
  for (let value = 0; value < 16; value++) {
    const data = [3, 2, 1, 0].map(shift => (value >> shift) & 1);
    const word = hammingEncode(data);
    assert.equal(hammingCheck(word).valid, true, `clean word for ${data.join('')}`);
    assert.deepEqual(hammingCheck(word).data, data);
    for (let position = 1; position <= 7; position++) {
      const received = [...word];
      received[position - 1] ^= 1;
      const check = hammingCheck(received);
      assert.equal(check.valid, false, `${data.join('')} bit ${position}`);
      assert.equal(check.syndrome, position, 'the syndrome names the position');
      assert.deepEqual(check.corrected, word, 'and correcting it restores the word');
      assert.deepEqual(check.data, data, 'so the message survives');
    }
  }
  // Two errors are beyond what this code can do, and it fails confidently: the
  // syndrome points somewhere, and where it points is wrong.
  const word = hammingEncode([1, 0, 1, 1]);
  const twice = [...word];
  twice[1] ^= 1;
  twice[5] ^= 1;
  const confused = hammingCheck(twice);
  assert.notEqual(confused.syndrome, 0);
  assert.notDeepEqual(confused.corrected, word);

  assert.throws(() => hammingEncode([1, 0, 1]), /exactly four bits/);
  assert.throws(() => hammingCheck([1, 0, 1, 1, 0, 1]), /seven bits/);
  assert.throws(() => hammingCheck([1, 0, 1, 1, 0, 1, 2]), /seven bits/);
});

test('a binary search tree’s height is decided by its insertion order', () => {
  // Sorted input gives a list; median-first gives the best a tree can do.
  assert.equal(buildTree([1, 2, 3, 4, 5, 6, 7]).height, 7);
  assert.equal(buildTree([7, 6, 5, 4, 3, 2, 1]).height, 7, 'reverse-sorted is the same shape mirrored');
  const balanced = buildTree([4, 2, 6, 1, 3, 5, 7]);
  assert.equal(balanced.height, 3);
  assert.equal(balanced.perfect, 3);
  assert.equal(balanced.balanced, true);
  assert.equal(balanced.overhead, 0);

  // Depth recomputed independently by walking the tree the model built.
  const deepest = node => node ? 1 + Math.max(deepest(node.left), deepest(node.right)) : 0;
  for (const keys of [[1, 2, 3, 4, 5, 6, 7], [4, 2, 6, 1, 3, 5, 7], [5, 3, 8, 1, 4, 7, 9, 2, 6], [2, 1, 3]]) {
    const tree = buildTree(keys);
    assert.equal(tree.height, deepest(tree.root), keys.join(','));
    // In-order traversal of a search tree is the sorted keys, whatever its shape.
    const inOrder = node => node ? [...inOrder(node.left), node.key, ...inOrder(node.right)] : [];
    assert.deepEqual(inOrder(tree.root), [...keys].sort((a, b) => a - b), keys.join(','));
    assert.ok(tree.height >= tree.perfect, 'no tree beats a perfectly balanced one');
  }
  assert.throws(() => buildTree([1, 1, 2]), /not all different/);
  assert.throws(() => buildTree([]), /at least one key/);
  assert.ok(new MachineError('x') instanceof Error);
});
