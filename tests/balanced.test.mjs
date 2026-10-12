import test from 'node:test';
import assert from 'node:assert/strict';
import { newTournament, placePlayer, lockDraw, getMatch, recordScore, validateTournament, dependentResults } from '../core.js';
const ids = ['tai','kha','hiep','bau','minh','giang','tien','hoang','ninh'];
function playing() { return lockDraw(ids.reduce((state,id,slot)=>placePlayer(state,id,slot),newTournament('balanced'))); }
function completed() { let state=playing(); for (const id of ['m1','m2','m3','m4','m5','m6','m7','m8']) state=recordScore(state,id,21,10); return state; }

test('balanced draw sends one preliminary winner into an eight-player quarterfinal',()=>{
  const before=playing();
  assert.deepEqual(getMatch(before,'m2').players,[null,'hiep']);
  const state=recordScore(before,'m1',21,10);
  assert.deepEqual(getMatch(state,'m2').players,['tai','hiep']);
  assert.deepEqual(getMatch(state,'m3').players,['bau','minh']);
  assert.deepEqual(getMatch(state,'m4').players,['giang','tien']);
  assert.deepEqual(getMatch(state,'m5').players,['hoang','ninh']);
});
test('balanced quarters feed two semifinals and the final',()=>{
  const state=completed();
  assert.deepEqual(getMatch(state,'m6').players,['tai','bau']);
  assert.deepEqual(getMatch(state,'m7').players,['giang','hoang']);
  assert.deepEqual(getMatch(state,'m8').players,['tai','giang']);
  assert.equal(getMatch(state,'m8').winner,'tai');
});
test('balanced preliminary correction clears its quarter, semi and final only',()=>{
  const before=completed();
  assert.deepEqual(dependentResults(before,'m1'),['m2','m6','m8']);
  const state=recordScore(before,'m1',10,21);
  assert.deepEqual(Object.keys(state.results).sort(),['m1','m3','m4','m5','m7']);
  assert.deepEqual(getMatch(state,'m2').players,['kha','hiep']);
});
test('backup retains the balanced format and its final participants',()=>{
  const state=validateTournament(JSON.parse(JSON.stringify(completed())));
  assert.equal(state.format,'balanced');
  assert.deepEqual(getMatch(state,'m8').players,['tai','giang']);
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
