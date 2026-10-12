import test from 'node:test';
import assert from 'node:assert/strict';
import { newTournament, placePlayer, lockDraw, reopenDraw, getMatch, recordScore, clearScore, dependentResults, validateTournament } from '../core.js';

const ids = ['tai', 'kha', 'hiep', 'bau', 'minh', 'giang', 'tien', 'hoang', 'ninh'];
function filled() { return ids.reduce((state, id, slot) => placePlayer(state, id, slot), newTournament()); }
function playing() { return lockDraw(filled()); }
function completed() {
  let state = playing();
  for (const [id, a, b] of [['m1',21,15],['m2',21,10],['m3',21,16],['m4',21,19],['m5',21,18],['m6',21,18],['m7',15,21],['m8',18,21]]) state = recordScore(state, id, a, b);
  return state;
}

test('manual placement assigns the externally selected bye', () => {
  const state = placePlayer(newTournament(), 'bau', 8);
  assert.equal(getMatch(state, 'm5').players[0], 'bau');
  assert.equal(state.slots.filter(Boolean).length, 1);
});
test('moving a placed player swaps occupied seats without duplicate players', () => {
  const state = placePlayer(filled(), 'tai', 1);
  assert.deepEqual(state.slots.slice(0, 2), ['kha', 'tai']);
  assert.equal(new Set(state.slots).size, 9);
});
test('placing a pooled player returns a displaced player to the pool', () => {
  let state = placePlayer(newTournament(), 'tai', 0);
  state = placePlayer(state, 'kha', 0);
  assert.equal(state.slots[0], 'kha');
  assert.ok(!state.slots.includes('tai'));
});
test('removing a seat is possible only before locking', () => {
  assert.equal(placePlayer(filled(), null, 8).slots[8], null);
  assert.throws(() => placePlayer(playing(), null, 8));
});
test('unknown players and invalid seat indices are rejected', () => {
  for (const [id, slot] of [['someone',0],['tai',9],['tai',-1],['tai',1.5]]) assert.throws(() => placePlayer(newTournament(), id, slot));
});
test('an incomplete draw cannot start competition', () => {
  assert.throws(() => lockDraw(newTournament()));
  assert.equal(playing().phase, 'play');
});
test('actions do not mutate previous states needed by undo', () => {
  const before = playing();
  const snapshot = JSON.stringify(before);
  recordScore(before, 'm1', 21, 10);
  assert.equal(JSON.stringify(before), snapshot);
});
test('every winner follows the reference graph through the final', () => {
  const state = completed();
  assert.deepEqual(getMatch(state, 'm5').players, ['ninh','hiep']);
  assert.deepEqual(getMatch(state, 'm6').players, ['tai','minh']);
  assert.deepEqual(getMatch(state, 'm7').players, ['tien','tai']);
  assert.deepEqual(getMatch(state, 'm8').players, ['ninh','tai']);
  assert.equal(getMatch(state, 'm8').winner, 'tai');
});
test('scores require two actual participants and a locked draw', () => {
  assert.throws(() => recordScore(filled(), 'm1', 21, 10));
  assert.throws(() => recordScore(playing(), 'm6', 21, 10));
});
test('negative, fractional, blank, string, infinite and tied scores are rejected', () => {
  for (const [a,b] of [[-1,21],[21,21],[1.5,2],['',21],['21',0],[NaN,21],[Infinity,21],[1000,0]]) assert.throws(() => recordScore(playing(), 'm1', a, b));
});
test('zero points and one-set scores above 21 are accepted', () => {
  const state = recordScore(playing(), 'm1', 31, 0);
  assert.equal(getMatch(state,'m1').winner, 'tai');
  assert.deepEqual(getMatch(state,'m1').score, {a:31,b:0});
});
test('changing an early winner invalidates descendants and preserves unrelated matches', () => {
  const before = completed();
  assert.deepEqual(dependentResults(before, 'm1'), ['m6','m7','m8']);
  const state = recordScore(before, 'm1', 10, 21);
  assert.deepEqual(Object.keys(state.results).sort(), ['m1','m2','m3','m4','m5']);
  assert.deepEqual(getMatch(state,'m6').players, ['kha','minh']);
  assert.equal(getMatch(state,'m8').winner, null);
  assert.equal(getMatch(before,'m8').winner, 'tai');
});
test('correcting points with the same winner retains downstream results', () => {
  const state = recordScore(completed(), 'm1', 25, 23);
  assert.equal(getMatch(state,'m8').winner, 'tai');
  assert.equal(Object.keys(state.results).length, 8);
});
test('clearing a result clears only its dependent branch', () => {
  const state = clearScore(completed(), 'm2');
  assert.deepEqual(Object.keys(state.results).sort(), ['m1','m3','m4','m6','m7']);
  assert.deepEqual(getMatch(state,'m5').players, ['ninh',null]);
});
test('reopening draw keeps all names and clears scores', () => {
  const state = reopenDraw(completed());
  assert.deepEqual(state.slots, ids);
  assert.equal(state.phase, 'draw');
  assert.deepEqual(state.results, {});
});
test('validated backup round-trip reproduces the winner', () => {
  const state = validateTournament(JSON.parse(JSON.stringify(completed())));
  assert.equal(getMatch(state,'m8').winner, 'tai');
});
test('corrupt and foreign imports cannot replace a tournament', () => {
  const fixtures = [null, {}, {...playing(),version:2}, {...playing(),tournament:'PES'}, {...playing(),slots:['tai','tai',...ids.slice(2)]}, {...playing(),slots:[...ids.slice(0,8),null]}, {...playing(),results:{m8:{a:21,b:10}}}, {...filled(),results:{m1:{a:21,b:10}}}, {...playing(),results:{m9:{a:21,b:10}}}, {...playing(),results:{m1:{a:21,b:21}}}];
  for (const data of fixtures) assert.throws(() => validateTournament(data));
});
