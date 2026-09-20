import test from 'node:test';
import assert from 'node:assert/strict';
import {levels} from '../dist/levels.js';
import {
  sections, conduits, sectionOf, missionsIn, struggles,
  ranks, rankOrder, rankFor, bestRank,
  stationPower, fullPower, stationState,
  achievements, earnedAchievements
} from '../dist/progress.js';

const all = (rank = 'gold') => Object.fromEntries(levels.map(level => [level.id, {rank, firstTry:true, runs:1}]));

test('the station accounts for every mission exactly once', () => {
  const seen = new Map();
  for (const section of sections) {
    for (const level of missionsIn(section)) {
      assert.ok(!seen.has(level.id), `${level.id} is in both ${seen.get(level.id)} and ${section.id}`);
      seen.set(level.id, section.id);
    }
  }
  for (const level of levels) {
    assert.ok(seen.has(level.id), `${level.id} (${level.location}) belongs to no section`);
    assert.equal(sectionOf(level).id, seen.get(level.id));
  }
  // And no section claims a room that no mission is in, which would show as a
  // section that can never be completed.
  const rooms = new Set(levels.map(level => level.location));
  for (const section of sections) {
    for (const room of section.rooms) assert.ok(rooms.has(room), `${section.id} lists “${room}”, which no mission uses`);
    assert.ok(section.rooms.length >= 4, `${section.id} is too small to be a section`);
    assert.ok(section.blurb.length > 30 && section.name.length > 3);
  }
  assert.equal(sections.length, 9);
});

test('the station is wired as one network, not as islands', () => {
  const ids = new Set(sections.map(section => section.id));
  for (const [from, to] of conduits) {
    assert.ok(ids.has(from) && ids.has(to), `conduit ${from}→${to} names a section that does not exist`);
    assert.notEqual(from, to);
  }
  // Every section is reachable from the reactor, so no module is left unpowered
  // on the map however the player progresses.
  const neighbours = id => conduits.filter(pair => pair.includes(id)).map(pair => pair.find(end => end !== id));
  const reached = new Set(['reactor']);
  const queue = ['reactor'];
  while (queue.length) for (const next of neighbours(queue.pop())) if (!reached.has(next)) { reached.add(next); queue.push(next); }
  assert.equal(reached.size, sections.length, `only ${reached.size} sections are connected to the reactor`);
});

test('a rank is decided by how much help was taken, and the best one is kept', () => {
  assert.equal(rankFor({hints:0, solutionShown:false}).id, 'gold');
  assert.equal(rankFor({hints:2, solutionShown:false}).id, 'silver');
  assert.equal(rankFor({hints:0, solutionShown:true}).id, 'bronze');
  assert.equal(rankFor({hints:9, solutionShown:true}).id, 'bronze', 'reading the answer is the stronger signal');
  assert.equal(rankFor().id, 'gold', 'no record of help means none was taken');
  // A glimpse of one line is not the same as being handed the whole answer.
  assert.equal(rankFor({revealed:1}).id, 'silver');
  assert.equal(rankFor({revealed:9}).id, 'silver');
  assert.equal(rankFor({revealed:9, solutionShown:true}).id, 'bronze');

  // More help is never worth more power.
  const power = rankOrder.map(id => ranks[id].power);
  assert.deepEqual(power, [...power].sort((a, b) => a - b));
  assert.equal(ranks.gold.power, 100);

  // Solving it again without help upgrades it; solving it again with help does not.
  assert.equal(bestRank('bronze', 'gold'), 'gold');
  assert.equal(bestRank('gold', 'bronze'), 'gold');
  assert.equal(bestRank('silver', 'bronze'), 'silver');
  assert.equal(bestRank('silver', 'silver'), 'silver');
  for (const rank of Object.values(ranks)) assert.ok(rank.note.length > 20 && rank.mark.length >= 1);
});

test('power restored follows the ranks, and the station lights up section by section', () => {
  assert.equal(stationPower({}), 0);
  assert.equal(stationPower(all('gold')), fullPower());
  assert.equal(fullPower(), levels.length * 100);
  assert.equal(stationPower(all('bronze')), levels.length * 50, 'a guided station runs at half power');

  const empty = stationState({});
  assert.equal(empty.complete, 0);
  assert.equal(empty.restored, 0);
  assert.equal(empty.online, false);
  assert.equal(empty.sections.every(section => section.status === 'dark'), true);
  assert.equal(empty.capacity, fullPower());

  // One section finished is one section online and nothing else.
  const docking = sections[0];
  const partial = Object.fromEntries(missionsIn(docking).map(level => [level.id, {rank:'gold'}]));
  const one = stationState(partial);
  assert.equal(one.restored, 1);
  assert.equal(one.sections.find(section => section.id === docking.id).status, 'online');
  assert.equal(one.sections.filter(section => section.status === 'dark').length, sections.length - 1);
  assert.equal(one.power, missionsIn(docking).length * 100);

  // One mission short is "warming", not online — the map has to show the gap.
  const short = {...partial};
  delete short[missionsIn(docking)[0].id];
  assert.equal(stationState(short).sections.find(section => section.id === docking.id).status, 'warming');
  assert.equal(stationState(short).restored, 0);

  // A section at bronze is complete but not at full power, and share says so.
  const guided = Object.fromEntries(missionsIn(docking).map(level => [level.id, {rank:'bronze'}]));
  const dim = stationState(guided).sections.find(section => section.id === docking.id);
  assert.equal(dim.status, 'online');
  assert.equal(dim.share, 0.5);

  const full = stationState(all('gold'));
  assert.equal(full.online, true);
  assert.equal(full.restored, sections.length);
  assert.equal(full.power, full.capacity);
});

test('every achievement is unearned at the start and reachable by doing the thing', () => {
  const ids = new Set();
  for (const achievement of achievements) {
    assert.ok(!ids.has(achievement.id), `duplicate achievement ${achievement.id}`);
    ids.add(achievement.id);
    assert.ok(achievement.name.length > 3 && achievement.hint.length > 15, `${achievement.id} needs a name and a hint`);
  }
  const none = earnedAchievements({}, {});
  assert.equal(none.every(badge => !badge.done), true, 'something is earned before the player has done anything');
  assert.equal(none.length, achievements.length);

  const earnedWith = (records, feats) => new Set(earnedAchievements(records, feats).filter(badge => badge.done).map(badge => badge.id));

  // Each one, triggered by exactly the signal it describes.
  const oneMission = {[levels[0].id]:{rank:'bronze'}};
  assert.ok(earnedWith(oneMission, {}).has('first-light'));
  assert.ok(!earnedWith(oneMission, {}).has('unaided-ten'));

  const tenGold = Object.fromEntries(levels.slice(0, 10).map(level => [level.id, {rank:'gold'}]));
  assert.ok(earnedWith(tenGold, {}).has('unaided-ten'));
  assert.ok(!earnedWith(Object.fromEntries(levels.slice(0, 10).map(level => [level.id, {rank:'silver'}])), {}).has('unaided-ten'));

  const chapter = Object.fromEntries(levels.filter(level => level.chapter === 'System design').map(level => [level.id, {rank:'gold'}]));
  assert.ok(earnedWith(chapter, {}).has('chapter-clean'));

  const debugLevel = levels.find(level => level.kind === 'debug');
  assert.ok(earnedWith({[debugLevel.id]:{rank:'gold', firstTry:true}}, {}).has('first-run'));
  assert.ok(!earnedWith({[debugLevel.id]:{rank:'gold', firstTry:false}}, {}).has('first-run'));

  assert.ok(earnedWith({}, {tightestSuite:5}).has('mutation-proof'));
  assert.ok(!earnedWith({}, {tightestSuite:6}).has('mutation-proof'));
  assert.ok(earnedWith({}, {bestGateRatio:0.1}).has('tenfold'));
  assert.ok(!earnedWith({}, {bestGateRatio:0.11}).has('tenfold'));
  assert.ok(earnedWith({}, {citySpare:0.2}).has('thrifty-city'));
  assert.ok(earnedWith({}, {labSpare:0.2}).has('thrifty-lab'));
  assert.ok(!earnedWith({}, {labSpare:0.19}).has('thrifty-lab'));
  assert.ok(earnedWith({}, {languagesRead:5}).has('polyglot'));
  assert.ok(!earnedWith({}, {languagesRead:4}).has('polyglot'));
  assert.ok(earnedWith({}, {predictions:10}).has('called-it'));
  assert.ok(!earnedWith({}, {predictions:9}).has('called-it'));
  assert.ok(earnedWith({}, {recalled:20}).has('it-stuck'));
  assert.ok(!earnedWith({}, {recalled:19}).has('it-stuck'));
  assert.ok(earnedWith({}, {diagnosed:5}).has('own-diagnosis'));
  assert.ok(!earnedWith({}, {diagnosed:4}).has('own-diagnosis'));

  const oneEach = Object.fromEntries(['Programming', 'Computer science', 'Networking', 'System design']
    .map(chapterName => [levels.find(level => level.chapter === chapterName).id, {rank:'silver'}]));
  assert.ok(earnedWith(oneEach, {}).has('all-chapters'));
  assert.ok(!earnedWith({[levels[0].id]:{rank:'gold'}}, {}).has('all-chapters'));

  // And everything is earned by a finished station with every feat.
  const everything = earnedWith(all('gold'), {tightestSuite:5, bestGateRatio:0.04, citySpare:0.3, labSpare:0.3, languagesRead:5, predictions:10, recalled:20, diagnosed:5});
  assert.equal(everything.size, achievements.length, `${achievements.length - everything.size} achievements cannot be earned`);
});

test('what to look at again comes from how the missions went, not from a test', () => {
  // A clean record has nothing to say.
  assert.deepEqual(struggles(Object.fromEntries(levels.map(level => [level.id, {rank:'gold', runs:1}]))), []);
  assert.deepEqual(struggles({}), []);

  const read = levels.find(level => level.concept === 'Reading a failure');
  const hinted = levels.find(level => level.concept === 'Recursion');
  const laboured = levels.find(level => level.concept === 'Arrays');
  const list = struggles({
    [read.id]:{rank:'bronze', runs:2},
    [hinted.id]:{rank:'silver', runs:1},
    [laboured.id]:{rank:'gold', runs:6},
    ...Object.fromEntries(levels.slice(40).map(level => [level.id, {rank:'gold', runs:1}]))
  });
  const concepts = list.map(entry => entry.concept);
  assert.ok(concepts.includes(read.concept) && concepts.includes(hinted.concept) && concepts.includes(laboured.concept));
  // Reading the answer is the strongest signal, so it comes first.
  assert.equal(list[0].concept, read.concept, `the list opens with ${list[0].concept}`);
  assert.match(list.find(entry => entry.concept === read.concept).why, /answer was read/);
  assert.match(list.find(entry => entry.concept === laboured.concept).why, /several runs/);
  assert.match(list.find(entry => entry.concept === hinted.concept).why, /hint/);
  // Missions solved cleanly never appear, however many of them there are.
  assert.equal(list.every(entry => entry.missions.every(mission => mission.rank !== 'gold' || mission.runs >= 4)), true);
  assert.ok(list.length <= 6, 'the list stays short enough to act on');
});
