export const PLAYERS = Object.freeze([
  { id: 'tai', name: 'Tài', initials: 'T', color: '#c8ed76' },
  { id: 'kha', name: 'Kha', initials: 'K', color: '#b2c9f2' },
  { id: 'hiep', name: 'Hiệp', initials: 'H', color: '#e3baf3' },
  { id: 'bau', name: 'Báu', initials: 'B', color: '#f6cd99' },
  { id: 'minh', name: 'Minh', initials: 'M', color: '#94dccc' },
  { id: 'giang', name: 'Giang', initials: 'G', color: '#efb3bc' },
  { id: 'tien', name: 'Tiến', initials: 'T', color: '#bcb8ee' },
  { id: 'hoang', name: 'Hoàng', initials: 'H', color: '#e4d787' },
  { id: 'ninh', name: 'Ninh', initials: 'N', color: '#9acde3' },
  { id: 'bach', name: 'Bách', initials: 'B', color: '#edb483' },
]);

export const MATCHES = Object.freeze([
  { id: 'm1', number: 1, sources: [{ slot: 0 }, { slot: 1 }], x: 0, y: 176 },
  { id: 'm2', number: 2, sources: [{ slot: 2 }, { slot: 3 }], x: 0, y: 54 },
  { id: 'm3', number: 3, sources: [{ slot: 4 }, { slot: 5 }], x: 0, y: 298 },
  { id: 'm4', number: 4, sources: [{ slot: 6 }, { slot: 7 }], x: 0, y: 420 },
  { id: 'm5', number: 5, sources: [{ slot: 8 }, { match: 'm2' }], x: 268, y: 94 },
  { id: 'm6', number: 6, sources: [{ match: 'm1' }, { match: 'm3' }], x: 268, y: 230 },
  { id: 'm7', number: 7, sources: [{ match: 'm4' }, { match: 'm6' }], x: 536, y: 352 },
  { id: 'm8', number: 8, sources: [{ match: 'm5' }, { match: 'm7' }], x: 804, y: 212 },
]);

const copy = state => structuredClone(state);
const ensure = (condition, message) => { if (!condition) throw new Error(message); };

export const FORMATS = Object.freeze({
  reference: { name:'Bảng cũ · 9 người', playerCount:9, version:1, final:'m8', rounds:['Vòng đầu','Vòng trong','Bán kết','Chung kết'], note:'Bảng tham khảo 9 người · Giải hiện tại dùng bảng 10 người', matches:MATCHES, bye:true, championY:352 },
  balanced: { name:'Giải 10 người', playerCount:10, version:2, final:'m9', rounds:['Sơ loại','Tứ kết','Bán kết','Chung kết'], note:'2 trận sơ loại · 6 suất vào tứ kết', bye:false, championY:384, matches:Object.freeze([
    { id:'m1', number:1, sources:[{slot:0},{slot:1}], x:0, y:176 },
    { id:'m2', number:2, sources:[{slot:2},{slot:3}], x:0, y:420 },
    { id:'m3', number:3, sources:[{match:'m1'},{slot:4}], x:268, y:54 },
    { id:'m4', number:4, sources:[{slot:5},{slot:6}], x:268, y:176 },
    { id:'m5', number:5, sources:[{match:'m2'},{slot:7}], x:268, y:298 },
    { id:'m6', number:6, sources:[{slot:8},{slot:9}], x:268, y:420 },
    { id:'m7', number:7, sources:[{match:'m3'},{match:'m4'}], x:536, y:115 },
    { id:'m8', number:8, sources:[{match:'m5'},{match:'m6'}], x:536, y:359 },
    { id:'m9', number:9, sources:[{match:'m7'},{match:'m8'}], x:804, y:237 },
  ]) },
});

export function getMatches(state) {
  const format=state.format ?? 'reference';
  ensure(Object.hasOwn(FORMATS,format),'Phương án sơ đồ không hợp lệ.');
  return FORMATS[format].matches;
}

export function getPlayers(state) {
  const format=state.format ?? 'reference';
  ensure(Object.hasOwn(FORMATS,format),'Phương án sơ đồ không hợp lệ.');
  return PLAYERS.slice(0,FORMATS[format].playerCount);
}

export function newTournament(format='reference') {
  ensure(Object.hasOwn(FORMATS,format),'Phương án sơ đồ không hợp lệ.');
  return { version: FORMATS[format].version, tournament: 'B-Bad 2026', format, phase: 'draw', slots: Array(FORMATS[format].playerCount).fill(null), results: {} };
}

export function placePlayer(state, playerId, slot) {
  ensure(state.phase === 'draw', 'Sơ đồ đã khóa. Mở lại xếp nhánh để thay đổi tên.');
  ensure(Number.isInteger(slot) && slot >= 0 && slot < getPlayers(state).length, 'Vị trí xếp nhánh không hợp lệ.');
  ensure(playerId === null || getPlayers(state).some(player=>player.id===playerId), 'Tên người chơi không hợp lệ.');
  const next = copy(state);
  const previous = playerId === null ? -1 : next.slots.indexOf(playerId);
  if (previous === slot) return next;
  if (previous !== -1) next.slots[previous] = next.slots[slot];
  next.slots[slot] = playerId;
  return next;
}

export function lockDraw(state) {
  const players=getPlayers(state);
  const playerIds=new Set(players.map(player=>player.id));
  ensure(state.slots.length === players.length && state.slots.every(id => playerIds.has(id)) && new Set(state.slots).size === players.length, `Xếp đủ ${players.length} tên trước khi bắt đầu.`);
  return { ...copy(state), phase: 'play' };
}

export function reopenDraw(state) {
  return { ...copy(state), phase: 'draw', results: {} };
}

export function getMatch(state, id) {
  const definition = getMatches(state).find(match => match.id === id);
  ensure(definition, 'Trận đấu không hợp lệ.');
  const players = definition.sources.map(source => source.slot !== undefined ? state.slots[source.slot] : getMatch(state, source.match).winner);
  const score = state.results[id] || null;
  const winner = players.every(Boolean) && score ? players[score.a > score.b ? 0 : 1] : null;
  return { ...definition, players, score, winner, ready: state.phase === 'play' && players.every(Boolean) };
}

function descendants(state,id) {
  const matches=getMatches(state);
  const found = new Set();
  function visit(parent) {
    for (const match of matches) {
      if (match.sources.some(source => source.match === parent) && !found.has(match.id)) {
        found.add(match.id);
        visit(match.id);
      }
    }
  }
  visit(id);
  return matches.filter(match => found.has(match.id)).map(match => match.id);
}

export function dependentResults(state, id) {
  ensure(getMatches(state).some(match=>match.id===id), 'Trận đấu không hợp lệ.');
  return descendants(state,id).filter(matchId => state.results[matchId]);
}

export function recordScore(state, id, a, b) {
  const match = getMatch(state, id);
  ensure(match.ready, 'Trận đấu cần đủ hai người chơi và sơ đồ đã khóa.');
  ensure([a, b].every(score => Number.isInteger(score) && score >= 0 && score <= 999), 'Nhập điểm nguyên từ 0 đến 999.');
  ensure(a !== b, 'Một set cần có người thắng. Hai tỉ số không thể bằng nhau.');
  const next = copy(state);
  next.results[id] = { a, b };
  if (match.winner && match.winner !== getMatch(next, id).winner) {
    for (const descendant of descendants(state,id)) delete next.results[descendant];
  }
  return next;
}

export function clearScore(state, id) {
  ensure(getMatches(state).some(match=>match.id===id), 'Trận đấu không hợp lệ.');
  const next = copy(state);
  for (const matchId of [id, ...descendants(state,id)]) delete next.results[matchId];
  return next;
}

export function validateTournament(data) {
  ensure(data && typeof data === 'object' && !Array.isArray(data), 'Bản sao lưu không hợp lệ.');
  ensure(data.tournament === 'B-Bad 2026', 'Đây không phải bản sao lưu B-Bad 2026 được hỗ trợ.');
  let state = newTournament(data.format === undefined ? 'reference' : data.format);
  ensure(data.version === state.version, 'Bản sao lưu thuộc thể thức cũ. Giữ tệp để tham khảo; giải 10 người cần xếp nhánh mới.');
  const playerIds=new Set(getPlayers(state).map(player=>player.id));
  const matchIds=new Set(getMatches(state).map(match=>match.id));
  ensure(data.phase === 'draw' || data.phase === 'play', 'Trạng thái giải không hợp lệ.');
  ensure(Array.isArray(data.slots) && data.slots.length === state.slots.length, `Bản sao lưu cần đủ ${state.slots.length} vị trí.`);
  ensure(data.slots.every(id => id === null || playerIds.has(id)), 'Bản sao lưu có tên người chơi lạ.');
  const assigned = data.slots.filter(id => id !== null);
  ensure(new Set(assigned).size === assigned.length, 'Bản sao lưu có người chơi bị trùng.');
  ensure(data.results && typeof data.results === 'object' && !Array.isArray(data.results), 'Dữ liệu tỉ số không hợp lệ.');
  ensure(Object.keys(data.results).every(id => matchIds.has(id)), 'Bản sao lưu có trận đấu lạ.');
  ensure(data.phase === 'play' || Object.keys(data.results).length === 0, 'Sơ đồ chưa khóa không thể có kết quả thi đấu.');
  state.slots = [...data.slots];
  if (data.phase === 'play') state = lockDraw(state);
  for (const { id } of getMatches(state)) {
    if (Object.hasOwn(data.results, id)) {
      const result = data.results[id];
      ensure(result && typeof result === 'object', 'Tỉ số không hợp lệ.');
      state = recordScore(state, id, result.a, result.b);
    }
  }
  return state;
}
