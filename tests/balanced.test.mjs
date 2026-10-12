import test from 'node:test';
import assert from 'node:assert/strict';
import { newTournament, placePlayer, lockDraw, getMatch, recordScore, validateTournament, dependentResults } from '../core.js';
const ids = ['tai','kha','hiep','bau','minh','giang','tien','hoang','ninh','bach'];
function playing() { return lockDraw(ids.reduce((state,id,slot)=>placePlayer(state,id,slot),newTournament('balanced'))); }
function completed() { let state=playing(); for (const id of ['m1','m2','m3','m4','m5','m6','m7','m8','m9']) state=recordScore(state,id,21,10); return state; }

test('ten-player draw sends two preliminary winners to opposite quarterfinal halves',()=>{
  const before=playing();
  assert.deepEqual(getMatch(before,'m3').players,[null,'minh']);
  assert.deepEqual(getMatch(before,'m5').players,[null,'hoang']);
  let state=recordScore(before,'m1',21,10);
  state=recordScore(state,'m2',21,10);
  assert.deepEqual(getMatch(state,'m3').players,['tai','minh']);
  assert.deepEqual(getMatch(state,'m4').players,['giang','tien']);
  assert.deepEqual(getMatch(state,'m5').players,['hiep','hoang']);
  assert.deepEqual(getMatch(state,'m6').players,['ninh','bach']);
});
test('balanced quarters feed two semifinals and the final',()=>{
  const state=completed();
  assert.deepEqual(getMatch(state,'m7').players,['tai','giang']);
  assert.deepEqual(getMatch(state,'m8').players,['hiep','ninh']);
  assert.deepEqual(getMatch(state,'m9').players,['tai','hiep']);
  assert.equal(getMatch(state,'m9').winner,'tai');
});
test('balanced preliminary correction clears its quarter, semi and final only',()=>{
  const before=completed();
  assert.deepEqual(dependentResults(before,'m1'),['m3','m7','m9']);
  const state=recordScore(before,'m1',10,21);
  assert.deepEqual(Object.keys(state.results).sort(),['m1','m2','m4','m5','m6','m8']);
  assert.deepEqual(getMatch(state,'m3').players,['kha','minh']);
});
test('backup retains the balanced format and its final participants',()=>{
  const state=validateTournament(JSON.parse(JSON.stringify(completed())));
  assert.equal(state.format,'balanced');
  assert.deepEqual(getMatch(state,'m9').players,['tai','hiep']);
});
test('backups from the original version without format remain readable',()=>{
  const legacy=newTournament();
  delete legacy.format;
  assert.equal(validateTournament(legacy).format,'reference');
});
test('unknown tournament formats are rejected',()=>{
  assert.throws(()=>newTournament('unknown'));
  assert.throws(()=>validateTournament({...playing(),format:'unknown'}));
});
test('Bách can be allocated and win the ten-player tournament',()=>{
  let state=playing();
  for(const id of ['m1','m2','m3','m4','m5']) state=recordScore(state,id,21,10);
  state=recordScore(state,'m6',10,21);
  state=recordScore(state,'m7',21,10);
  state=recordScore(state,'m8',10,21);
  state=recordScore(state,'m9',10,21);
  assert.equal(getMatch(state,'m9').winner,'bach');
});
test('nine-player balanced backups are rejected rather than reinterpreted as ten-player scores',()=>{
  assert.throws(()=>validateTournament({version:1,tournament:'B-Bad 2026',format:'balanced',phase:'draw',slots:ids.slice(0,9),results:{}}));
});
