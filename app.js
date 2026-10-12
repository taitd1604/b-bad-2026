import { PLAYERS, FORMATS, newTournament, placePlayer, lockDraw, reopenDraw, getMatch, recordScore, clearScore, dependentResults, validateTournament } from './core.js';

const $ = id => document.getElementById(id);
const icons = {
  expand: '<path d="M8 3H3v5M16 3h5v5M21 16v5h-5M3 16v5h5"/>',
  more: '<circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/>',
  download: '<path d="M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5"/>',
  upload: '<path d="M12 16V3m-5 5 5-5 5 5M4 16v5h16v-5"/>',
  print: '<path d="M7 8V3h10v5M7 17H3V8h18v9h-4M7 14h10v7H7zM17 11h1"/>',
  reset: '<path d="M3 10a9 9 0 1 1 2 8M3 4v6h6"/>',
  help: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 0 1 5 0c0 2-2.5 2-2.5 4m0 3h.01"/>',
  external: '<path d="M14 3h7v7m0-7-10 10M10 4H4v16h16v-6"/>',
  cursor: '<path d="m4 3 6 18 3-8 8-3L4 3z"/>',
  undo: '<path d="M3 9h10a7 7 0 0 1 0 14M3 9l6-6M3 9l6 6" transform="translate(0 -2)"/>',
  arrow: '<path d="M4 12h16m-6-6 6 6-6 6"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  minus: '<path d="M5 12h14"/>',
  close: '<path d="m6 6 12 12M6 18 18 6"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
  drag: '<circle cx="9" cy="5" r=".8"/><circle cx="15" cy="5" r=".8"/><circle cx="9" cy="12" r=".8"/><circle cx="15" cy="12" r=".8"/><circle cx="9" cy="19" r=".8"/><circle cx="15" cy="19" r=".8"/>',
  score: '<path d="M4 4h16v16H4zM8 8h1m6 0h1M8 12h1m6 0h1M8 16h1m6 0h1"/>',
  trophy: '<path d="M7 3h10v7a5 5 0 0 1-10 0V3ZM7 5H3v3a4 4 0 0 0 4 4m10-7h4v3a4 4 0 0 1-4 4M12 15v6m-4 0h8"/>',
  bye: '<path d="M4 12h16m-6-6 6 6-6 6M4 6v12"/>',
};
const icon = name => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[name] || icons.arrow}</svg>`;
document.querySelectorAll('[data-icon]').forEach(el => { el.innerHTML = icon(el.dataset.icon); });

const FORMAT = document.body.dataset.format || 'reference';
const formatConfig = FORMATS[FORMAT];
const MATCHES = formatConfig.matches;
const STORAGE_KEY = FORMAT === 'reference' ? 'b-bad-2026:desk:v1' : 'b-bad-2026:desk:balanced:v1';
const playerById = Object.fromEntries(PLAYERS.map(player => [player.id, player]));
const slotLabels = FORMAT === 'reference' ? ['Trận 1', 'Trận 1', 'Trận 2', 'Trận 2', 'Trận 3', 'Trận 3', 'Trận 4', 'Trận 4', 'Miễn vòng'] : ['Sơ loại','Sơ loại','Tứ kết 1','Tứ kết 2','Tứ kết 2','Tứ kết 3','Tứ kết 3','Tứ kết 4','Tứ kết 4'];
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
let state = newTournament(FORMAT);
let history = [];
let selected = null;
let scoringId = null;
let toastTimer;
let confirmResolve;
let manualScale = null;
let currentScale = 1;
let loadError = '';
let storageFailed = false;
let wasFullscreen = false;

$('format-' + FORMAT).classList.add('active');
$('format-' + FORMAT).setAttribute('aria-current','page');
$('format-note').textContent = formatConfig.note;
$('compare-link').href = FORMAT === 'reference' ? './balanced.html' : './';
if (FORMAT === 'balanced') {
  document.querySelector('.draw-note p>span').textContent='Xếp 2 người đánh sơ loại và 7 người vào thẳng tứ kết theo vòng quay ngoài.';
  document.querySelector('.help-steps li:first-child p').textContent='Chọn thẻ tên rồi bấm vị trí hoặc kéo thả. Hai ô ở vòng sơ loại dành cho hai người được vòng quay ngoài chọn; bảy tên còn lại xếp vào tứ kết.';
}
$('confirm-dialog').setAttribute('aria-labelledby','confirm-title');
$('confirm-dialog').setAttribute('aria-describedby','confirm-description');
$('help-dialog').setAttribute('aria-label','Hướng dẫn vận hành B-Bad 2026');
$('champion-dialog').setAttribute('aria-labelledby','champion-name');

try {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    const data = JSON.parse(saved);
    const restored = validateTournament(data.state);
    if (restored.format !== FORMAT) throw new Error('Sai phương án sơ đồ.');
    state = restored;
    history = (Array.isArray(data.history) ? data.history.slice(-35) : []).flatMap(item => { try { const valid=validateTournament(item); return valid.format === FORMAT ? [valid] : []; } catch { return []; } });
  }
  localStorage.setItem(STORAGE_KEY + ':check', '1');
  localStorage.removeItem(STORAGE_KEY + ':check');
} catch (error) {
  loadError = 'Không thể đọc dữ liệu đã lưu. Bạn có thể nhập lại bản sao lưu từ menu ⋯.';
  storageFailed = true;
}

function toast(message, error = false) {
  clearTimeout(toastTimer);
  $('toast').textContent = message;
  $('toast').className = `toast visible${error ? ' error' : ''}`;
  toastTimer = setTimeout(() => { $('toast').classList.remove('visible'); }, error ? 6500 : 3800);
}

function updateSaveStatus() {
  $('save-status').classList.toggle('error', storageFailed);
  $('save-label').textContent = storageFailed ? 'Chưa lưu trên máy' : 'Đã lưu trên máy';
  $('storage-alert').hidden = !storageFailed;
}

function persist() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ state, history, savedAt: new Date().toISOString() }));
    storageFailed = false;
  } catch {
    storageFailed = true;
    toast('Trình duyệt chưa lưu được tiến độ. Hãy xuất bản sao lưu.', true);
  }
  updateSaveStatus();
}

function commit(next, animation = null) {
  if (JSON.stringify(next) === JSON.stringify(state)) return;
  history.push(state);
  history = history.slice(-35);
  state = next;
  selected = null;
  render();
  persist();
  if (animation) requestAnimationFrame(() => animateName(animation));
}

function avatar(id, extraClass = '') {
  const player = playerById[id];
  return `<span class="player-avatar ${extraClass}" style="--player-color:${player.color}" aria-hidden="true">${player.initials}</span>`;
}

function renderRoster() {
  const locked = state.phase === 'play';
  const losers = new Set(MATCHES.flatMap(({ id }) => { const m = getMatch(state, id); return m.winner ? m.players.filter(player => player !== m.winner) : []; }));
  const champion = getMatch(state, 'm8').winner;
  $('roster').innerHTML = PLAYERS.map(player => {
    const slot = state.slots.indexOf(player.id);
    const assigned = slot !== -1;
    const label = locked ? champion === player.id ? 'Vô địch' : losers.has(player.id) ? 'Đã dừng' : 'Trong giải' : assigned ? slotLabels[slot] : 'Chưa xếp';
    return `<button type="button" class="player-card${assigned ? ' assigned' : ''}${selected === player.id ? ' selected' : ''}" data-select="${player.id}" draggable="${!locked}" aria-pressed="${selected === player.id}" aria-label="${player.name}, ${label}" ${locked ? 'disabled' : ''}>${avatar(player.id)}<span class="player-name">${player.name}</span><span class="roster-meta">${selected === player.id ? 'Đang chọn' : label}</span>${!locked && !assigned ? `<span class="drag-handle">${icon('drag')}</span>` : ''}</button>`;
  }).join('');
  const count = state.slots.filter(Boolean).length;
  $('allocation-label').textContent = `Đã xếp ${count} / 9 người`;
  $('allocation-percent').textContent = `${Math.round(count / 9 * 100)}%`;
  $('allocation-progress').style.width = `${count / 9 * 100}%`;
  $('roster-instruction').textContent = locked ? 'Sơ đồ đã khóa. Chọn trận đấu để nhập tỉ số.' : 'Chọn thẻ tên, rồi chọn vị trí trên sơ đồ.';
  $('clear-placement').hidden = locked || !selected || !state.slots.includes(selected);
  if (selected) $('clear-placement').setAttribute('aria-label',`Đưa ${playerById[selected].name} về danh sách chưa xếp`);
}

function slotRow(match, index) {
  const id = match.players[index];
  const source = match.sources[index];
  const editable = state.phase === 'draw' && source.slot !== undefined;
  const sourceLabel = FORMAT === 'reference' && source.slot === 8 ? 'Người miễn vòng 1' : source.match ? `Thắng trận ${source.match.slice(1)}` : 'Chọn người chơi';
  const score = match.score ? match.score[index === 0 ? 'a' : 'b'] : null;
  const classes = `match-slot${editable && selected ? ' target' : ''}${match.winner === id && id ? ' winner' : match.winner && id ? ' loser' : ''}`;
  const content = `${id ? avatar(id) : `<span class="slot-icon">${icon(editable ? 'plus' : 'arrow')}</span>`}<span class="slot-name${id ? '' : ' slot-placeholder'}">${id ? playerById[id].name : sourceLabel}</span>${match.winner === id && id ? `<span class="winner-check">${icon('check')}</span>` : ''}${score !== null ? `<span class="slot-points">${score}</span>` : '<span class="slot-dash">—</span>'}`;
  return editable ? `<button type="button" class="${classes}" data-slot="${source.slot}" ${id ? `data-player="${id}"` : ''} aria-label="${FORMAT === 'reference' && source.slot === 8 ? 'Miễn vòng đầu' : `Vị trí ${source.slot + 1}, trận ${match.number}`}${id ? `, ${playerById[id].name}` : ', trống'}">${content}</button>` : `<div class="${classes}" ${id ? `data-player="${id}"` : ''}>${content}</div>`;
}

function renderLinks() {
  const links = [];
  for (const match of MATCHES) {
    match.sources.forEach((source, index) => {
      if (!source.match) return;
      const parent = getMatch(state, source.match);
      const sx = parent.x + 216;
      const sy = parent.y + 54;
      const dx = match.x;
      const dy = match.y + (index === 0 ? 38 : 70);
      let route;
      if (FORMAT === 'reference' && parent.id === 'm4') route = `M${sx},${sy} H244 V540 H514 V${dy} H${dx}`;
      else if (FORMAT === 'reference' && parent.id === 'm5') route = `M${sx},${sy} H766 V${dy} H${dx}`;
      else { const mx = dx - 26; route = `M${sx},${sy} H${mx} V${dy} H${dx}`; }
      links.push(`<path d="${route}" class="${parent.winner ? 'active' : ''}"/>`);
    });
  }
  if (formatConfig.bye) links.push(`<path d="M376,78 V94" class="${state.slots[8] ? 'active' : ''}"/>`);
  return `<svg class="bracket-links" viewBox="0 0 1020 554" aria-hidden="true">${links.join('')}</svg>`;
}

function renderBracket() {
  const rounds = formatConfig.rounds.map((name, index) => `<div class="round-label${index === 3 ? ' final-label' : ''}" style="left:${index * 268}px"><span class="round-index">0${index + 1}</span>${name}</div>`).join('');
  const bye = state.slots[8];
  const editable = state.phase === 'draw';
  const byeContent = `${bye ? avatar(bye) : `<span class="slot-icon">${icon('plus')}</span>`}<span class="slot-name${bye ? '' : ' slot-placeholder'}">${bye ? playerById[bye].name : 'Chọn người miễn vòng'}<span class="bye-label">MIỄN VÒNG 1</span></span><span class="bye-symbol">${icon('bye')}</span>`;
  const byeHtml = formatConfig.bye ? `<div class="bye-card">${editable ? `<button type="button" class="match-slot${selected ? ' target' : ''}" data-slot="8" ${bye ? `data-player="${bye}"` : ''} aria-label="Suất miễn vòng đầu${bye ? ', ' + playerById[bye].name : ', trống'}">${byeContent}</button>` : `<div class="match-slot" ${bye ? `data-player="${bye}"` : ''}>${byeContent}</div>`}</div>` : '<div class="format-explainer"><span>01 TRẬN SƠ LOẠI</span><strong>Đủ 8 người.<br>Vào tứ kết.</strong><p>2 người đánh sơ loại.<br>7 người vào thẳng tứ kết.</p><small>3–4 trận thắng để lên ngôi ↗</small></div>';
  const cards = MATCHES.map(({ id }) => {
    const match = getMatch(state, id);
    const assigned = match.players.every(Boolean);
    const status = match.winner ? 'Đã chốt' : match.ready ? 'Sẵn sàng' : assigned ? 'Chờ khóa nhánh' : 'Đang chờ';
    const action = match.ready ? `<button type="button" class="score-open" data-score="${id}" aria-label="${match.score ? 'Sửa kết quả' : 'Nhập tỉ số'} trận ${match.number}">${icon(match.score ? 'check' : 'score')}${match.score ? 'Sửa kết quả' : 'Nhập tỉ số'}</button>` : `<div class="match-waiting">${state.phase === 'draw' ? id === 'm8' ? 'TRẬN ĐẤU CUỐI CÙNG' : 'XẾP NHÁNH THỦ CÔNG' : 'CHỜ NGƯỜI THẮNG ĐI TIẾP'}</div>`;
    return `<article class="match-card${match.ready ? ' ready' : ''}${match.winner ? ' finished' : ''}${id === 'm8' ? ' final-card' : ''}" style="left:${match.x}px;top:${match.y}px" data-match="${id}" aria-label="Trận ${match.number}"><div class="match-meta"><span class="match-number">${id === 'm8' ? icon('trophy') : ''}TRẬN 0${match.number}</span><span class="match-status">${status}</span></div>${slotRow(match,0)}${slotRow(match,1)}${action}</article>`;
  }).join('');
  const champion = getMatch(state, 'm8').winner;
  const championContent = `${icon('trophy')}<span>${champion ? 'NHÀ VÔ ĐỊCH' : 'CHIẾC CÚP ĐANG CHỜ'}</span><strong>${champion ? playerById[champion].name : 'Ai sẽ lên ngôi?'}</strong>${champion ? '<small>B-BAD 2026 · XEM VINH DANH ↗</small>' : ''}`;
  const championHtml = champion ? `<button type="button" class="champion-card champion-found" style="top:${formatConfig.championY}px" data-champion aria-label="Vinh danh ${playerById[champion].name}">${championContent}</button>` : `<div class="champion-card" style="top:${formatConfig.championY}px">${championContent}</div>`;
  $('bracket-canvas').innerHTML = rounds + renderLinks() + byeHtml + cards + championHtml;
  resizeBracket();
}

function render() {
  renderRoster();
  renderBracket();
  const locked = state.phase === 'play';
  const count = state.slots.filter(Boolean).length;
  const champion = getMatch(state, 'm8').winner;
  $('phase-tag').className = `phase-tag${champion ? ' done' : locked ? ' play' : ''}`;
  $('phase-tag').innerHTML = `<span></span>${champion ? 'Giải đã hoàn tất' : locked ? 'Đang thi đấu' : 'Đang xếp nhánh'}`;
  $('phase-button').disabled = !locked && count !== 9;
  $('phase-button-label').textContent = locked ? 'Mở lại xếp nhánh' : 'Bắt đầu thi đấu';
  $('phase-button').classList.toggle('primary', !locked);
  $('phase-button').classList.toggle('subtle', locked);
  $('undo-button').disabled = history.length === 0;
  $('operation-hint').classList.toggle('selected', Boolean(selected));
  $('operation-text').textContent = selected ? `Đã chọn ${playerById[selected].name}. Chọn một ô để xếp.` : champion ? `${playerById[champion].name} là nhà vô địch B-Bad 2026!` : locked ? 'Chọn trận đủ hai người để chốt tỉ số một set.' : count === 9 ? 'Đủ 9 người. Sẵn sàng khóa nhánh và thi đấu.' : 'Bắt đầu bằng một thẻ tên ở bên trái.';
  $('match-progress').textContent = `${Object.keys(state.results).length} / 8 trận hoàn tất`;
  updateSaveStatus();
}

function resizeBracket() {
  const viewport = $('bracket-viewport');
  if (!viewport) return;
  const style = getComputedStyle(viewport);
  const width = viewport.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
  const height = viewport.clientHeight - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom);
  const isMobile = matchMedia('(max-width:650px)').matches;
  currentScale = manualScale || (isMobile ? .88 : Math.max(.62, Math.min(width / 1020, height / 554, 1.2)));
  $('bracket-canvas').style.transform = `scale(${currentScale})`;
  $('bracket-sizer').style.width = `${1020 * currentScale}px`;
  $('bracket-sizer').style.height = `${554 * currentScale}px`;
  $('zoom-label').textContent = manualScale ? `${Math.round(currentScale * 100)}%` : isMobile ? 'Cuộn để xem' : 'Vừa màn hình';
  $('zoom-in').disabled = currentScale >= 1.5;
  $('zoom-out').disabled = currentScale <= .5;
}

function animateName({ playerId, from, to }) {
  if (reducedMotion.matches || !from) return;
  const target = typeof to === 'string' ? document.querySelector(to) : to;
  if (!target) return;
  const dest = target.getBoundingClientRect();
  if (!dest.width || dest.right < 0 || dest.left > innerWidth) return;
  const ghost = document.createElement('div');
  ghost.className = 'flight-card';
  ghost.innerHTML = `${avatar(playerId)}<span>${playerById[playerId].name}</span>`;
  ghost.style.left = `${from.left}px`;
  ghost.style.top = `${from.top}px`;
  document.body.append(ghost);
  const motion = ghost.animate([{ transform:'translate(0,0) scale(1)', opacity:1 }, { transform:`translate(${dest.left - from.left}px,${dest.top - from.top}px) scale(.9)`, opacity:1, offset:.85 }, { transform:`translate(${dest.left - from.left}px,${dest.top - from.top}px) scale(.9)`, opacity:0 }], { duration:650, easing:'cubic-bezier(.22,.7,.24,1)' });
  motion.finished.then(() => { ghost.remove(); target.classList.add('arrived'); setTimeout(() => target.classList.remove('arrived'), 850); }).catch(() => ghost.remove());
}

function selectPlayer(id) {
  if (state.phase !== 'draw') return;
  selected = selected === id ? null : id;
  render();
  document.querySelector(`[data-select="${id}"]`)?.focus({ preventScroll:true });
}

function assign(slot, id = selected, from = null) {
  if (state.phase !== 'draw') return;
  if (!id) {
    const current = state.slots[slot];
    if (current) { selectPlayer(current); toast(`${playerById[current].name} đang được chọn. Bấm ô khác để đổi chỗ.`); }
    else { toast('Chọn một thẻ tên trước, rồi bấm ô này.'); document.querySelector('.player-card:not(.assigned)')?.focus(); }
    return;
  }
  const source = from || document.querySelector(`[data-select="${id}"]`)?.getBoundingClientRect();
  try {
    const alreadyHere = state.slots[slot] === id;
    commit(placePlayer(state, id, slot), { playerId:id, from:source, to:`[data-slot="${slot}"]` });
    if (alreadyHere) { selected = null; render(); }
    toast(`${playerById[id].name} → ${slotLabels[slot]}`);
  } catch (error) { toast(error.message, true); }
}

$('roster').addEventListener('click', event => { const card = event.target.closest('[data-select]'); if (card) selectPlayer(card.dataset.select); });
$('clear-placement').addEventListener('click', () => {
  const id=selected;
  const slot=state.slots.indexOf(id);
  if (slot === -1 || !id || state.phase !== 'draw') return;
  const from=document.querySelector(`[data-slot="${slot}"]`)?.getBoundingClientRect();
  commit(placePlayer(state,null,slot),{playerId:id,from,to:`[data-select="${id}"]`});
  toast(`Đã đưa ${playerById[id].name} về danh sách chưa xếp.`);
});
$('roster').addEventListener('dragstart', event => {
  const card = event.target.closest('[data-select]');
  if (!card || state.phase !== 'draw') { event.preventDefault(); return; }
  event.dataTransfer.setData('text/plain', card.dataset.select);
  event.dataTransfer.effectAllowed = 'move';
});
$('bracket-canvas').addEventListener('click', event => {
  const slot = event.target.closest('[data-slot]');
  if (slot) { assign(Number(slot.dataset.slot)); return; }
  const scoreButton = event.target.closest('[data-score]');
  if (scoreButton) openScore(scoreButton.dataset.score);
  if (event.target.closest('[data-champion]')) showChampion();
});
$('bracket-canvas').addEventListener('dragover', event => {
  const slot = event.target.closest('[data-slot]');
  if (!slot || state.phase !== 'draw') return;
  event.preventDefault();
  event.dataTransfer.dropEffect = 'move';
  slot.classList.add('drag-over');
});
$('bracket-canvas').addEventListener('dragleave', event => event.target.closest('[data-slot]')?.classList.remove('drag-over'));
$('bracket-canvas').addEventListener('drop', event => {
  const slot = event.target.closest('[data-slot]');
  if (!slot || state.phase !== 'draw') return;
  event.preventDefault();
  slot.classList.remove('drag-over');
  const id = event.dataTransfer.getData('text/plain');
  if (playerById[id]) assign(Number(slot.dataset.slot), id);
});

function confirmAction(title, description, accept = 'Xác nhận') {
  return new Promise(resolve => {
    $('confirm-title').textContent = title;
    $('confirm-description').textContent = description;
    $('confirm-accept').textContent = accept;
    confirmResolve = resolve;
    $('confirm-dialog').returnValue = '';
    $('confirm-dialog').showModal();
    $('confirm-cancel').focus();
  });
}
$('confirm-accept').addEventListener('click', () => $('confirm-dialog').close('accept'));
$('confirm-cancel').addEventListener('click', () => $('confirm-dialog').close('cancel'));
$('confirm-close').addEventListener('click', () => $('confirm-dialog').close('cancel'));
$('confirm-dialog').addEventListener('close', () => { const resolve = confirmResolve; confirmResolve = null; resolve?.($('confirm-dialog').returnValue === 'accept'); });
document.querySelectorAll('[data-close]').forEach(button => button.addEventListener('click', () => $(button.dataset.close).close()));

$('phase-button').addEventListener('click', async () => {
  if (state.phase === 'play') {
    const count = Object.keys(state.results).length;
    const ok = await confirmAction('Mở lại xếp nhánh?', count ? `Danh sách tên vẫn giữ nguyên. Toàn bộ ${count} kết quả sẽ được xóa để bạn thay đổi sơ đồ. Có thể hoàn tác sau đó.` : 'Bạn có thể đổi chỗ các thẻ tên, bao gồm suất miễn vòng.', 'Mở xếp nhánh');
    if (ok) { commit(reopenDraw(state)); toast('Đã mở lại xếp nhánh.'); }
  } else {
    try { commit(lockDraw(state)); toast('Đã khóa sơ đồ. B-Bad 2026 bắt đầu!'); } catch (error) { toast(error.message,true); }
  }
});

function undo() {
  if (!history.length) return;
  state = history.pop();
  selected = null;
  render();
  persist();
  toast('Đã hoàn tác thao tác vừa rồi.');
}
$('undo-button').addEventListener('click', undo);
document.addEventListener('keydown', event => {
  const editing = event.target.closest('input,textarea,[contenteditable="true"]');
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z' && !editing && !document.querySelector('dialog[open]')) { event.preventDefault(); undo(); }
  if (event.key === 'Escape' && !document.querySelector('dialog[open]')) { selected = null; render(); $('tools-menu').open = false; }
});
document.addEventListener('click', event => { if (!event.target.closest('.tools-menu')) $('tools-menu').open = false; });

function openScore(id) {
  const match = getMatch(state, id);
  if (!match.ready) return;
  scoringId = id;
  $('score-eyebrow').textContent = `TRẬN 0${match.number} / MỘT SET`;
  $('score-title').textContent = match.score ? 'Cập nhật kết quả' : 'Chốt tỉ số';
  match.players.forEach((playerId, index) => {
    const suffix = index === 0 ? 'a' : 'b';
    const player = playerById[playerId];
    $('score-name-' + suffix).textContent = player.name;
    $('score-avatar-' + suffix).textContent = player.initials;
    $('score-avatar-' + suffix).style.setProperty('--player-color', player.color);
    $('score-' + suffix).value = match.score ? match.score[suffix] : '';
  });
  $('score-error').textContent = '';
  $('clear-score-button').hidden = !match.score;
  previewWinner();
  $('score-dialog').showModal();
  $('score-a').focus();
  $('score-a').select();
}

function previewWinner() {
  const a = $('score-a').value;
  const b = $('score-b').value;
  const match = scoringId ? getMatch(state, scoringId) : null;
  const valid = a !== '' && b !== '' && [Number(a),Number(b)].every(n => Number.isInteger(n) && n >= 0 && n <= 999);
  $('score-error').textContent = valid && Number(a) === Number(b) ? 'Hai tỉ số đang bằng nhau. Nhập điểm của set đã phân thắng bại.' : '';
  if (match && valid && Number(a) !== Number(b)) {
    const winner = playerById[match.players[Number(a) > Number(b) ? 0 : 1]];
    $('winner-preview').innerHTML = `${icon(scoringId === 'm8' ? 'trophy' : 'arrow')}<span><strong>${winner.name}</strong> ${scoringId === 'm8' ? 'sẽ trở thành nhà vô địch.' : 'sẽ đi tiếp vào nhánh kế tiếp.'}</span>`;
  } else $('winner-preview').innerHTML = `${icon('arrow')}<span>Người thắng sẽ được đưa vào nhánh tiếp theo.</span>`;
}
$('score-a').addEventListener('input', previewWinner);
$('score-b').addEventListener('input', previewWinner);
$('score-form').addEventListener('submit', async event => {
  event.preventDefault();
  if (!$('score-form').reportValidity()) return;
  const id = scoringId;
  const match = getMatch(state, id);
  const a = Number($('score-a').value), b = Number($('score-b').value);
  const submit = $('score-form').querySelector('[type="submit"]');
  try {
    const next = recordScore(state,id,a,b);
    const winner = getMatch(next,id).winner;
    const affected = dependentResults(state,id);
    submit.disabled = true;
    if (match.winner && match.winner !== winner && affected.length) {
      if (!await confirmAction('Thay đổi người thắng?', `Người thắng mới là ${playerById[winner].name}. Kết quả trận ${affected.map(m => m.slice(1)).join(', ')} phụ thuộc vào trận này và sẽ được xóa để nhập lại.`, 'Cập nhật và xóa kết quả phụ thuộc')) return;
    }
    const from = document.querySelector(`[data-match="${id}"] [data-player="${winner}"]`)?.getBoundingClientRect();
    const destination = MATCHES.find(m => m.sources.some(s => s.match === id));
    $('score-dialog').close();
    commit(next, destination ? { playerId:winner, from, to:`[data-match="${destination.id}"] [data-player="${winner}"]` } : null);
    toast(`Trận ${match.number}: ${playerById[match.players[0]].name} ${a}–${b} ${playerById[match.players[1]].name}`);
    if (id === 'm8' && match.winner !== winner) setTimeout(showChampion, reducedMotion.matches ? 50 : 600);
  } catch (error) { $('score-error').textContent = error.message; }
  finally { submit.disabled = false; }
});
$('clear-score-button').addEventListener('click', async () => {
  const id = scoringId;
  const affected = dependentResults(state,id);
  if (await confirmAction(`Xóa kết quả trận ${id.slice(1)}?`, affected.length ? `Kết quả trận ${affected.map(m => m.slice(1)).join(', ')} cũng sẽ được xóa vì phụ thuộc vào trận này. Bạn có thể hoàn tác.` : 'Hai người chơi vẫn giữ nguyên. Bạn có thể nhập lại tỉ số hoặc hoàn tác.', 'Xóa kết quả')) {
    $('score-dialog').close();
    commit(clearScore(state,id));
    toast('Đã xóa kết quả.');
  }
});

function showChampion() {
  const final = getMatch(state,'m8');
  if (!final.winner || $('champion-dialog').open) return;
  $('champion-name').textContent = playerById[final.winner].name;
  $('champion-score').textContent = `${playerById[final.players[0]].name} ${final.score.a} — ${final.score.b} ${playerById[final.players[1]].name}`;
  $('confetti').innerHTML = reducedMotion.matches ? '' : Array.from({length:42},(_,index) => `<span class="confetti-piece" style="left:${(index*37)%100}%;background:${index%3 ? '#c1ef6a' : '#ecf3da'};animation-delay:${(index%9)*.14}s;width:${index%2 ? 4 : 7}px;transform:rotate(${index*31}deg)"></span>`).join('');
  $('champion-dialog').showModal();
}

function exportBackup() {
  const data = { app:'b-bad-2026', exportedAt:new Date().toISOString(), state };
  const url = URL.createObjectURL(new Blob([JSON.stringify(data,null,2)], {type:'application/json'}));
  const link = document.createElement('a');
  link.href = url;
  link.download = `b-bad-2026-${FORMAT}-backup-${new Date().toISOString().replaceAll(':','-').slice(0,19)}.json`;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url),10000);
  $('tools-menu').open = false;
  toast('Đã tải bản sao lưu. Mang tệp này sang MacBook để nhập lại.');
}
$('export-button').addEventListener('click',exportBackup);
$('storage-export').addEventListener('click',exportBackup);
$('import-button').addEventListener('click', () => { $('tools-menu').open=false; $('import-file').click(); });
$('import-file').addEventListener('change',async () => {
  const file = $('import-file').files[0];
  $('import-file').value = '';
  if (!file) return;
  try {
    if (file.size > 128 * 1024) throw new Error('Tệp quá lớn. Chọn bản sao lưu JSON do B-Bad 2026 xuất ra.');
    const data = JSON.parse(await file.text());
    const imported = validateTournament(data.app === 'b-bad-2026' ? data.state : data);
    if (imported.format !== FORMAT) throw new Error(`Bản sao lưu thuộc “${FORMATS[imported.format].name}”. Mở đúng trang phương án đó để nhập lại.`);
    if (await confirmAction('Nhập bản sao lưu?', `Bản sao lưu có ${imported.slots.filter(Boolean).length}/9 người được xếp và ${Object.keys(imported.results).length}/8 trận có kết quả. Tiến độ hiện tại sẽ được thay thế. Có thể hoàn tác.`, 'Nhập dữ liệu')) {
      commit(imported);
      if (JSON.stringify(imported) === JSON.stringify(state)) persist();
      toast('Đã nhập bản sao lưu. Bạn có thể tiếp tục giải trên máy này.');
    }
  } catch(error) { toast(error instanceof SyntaxError ? 'Tệp không phải JSON hợp lệ.' : error.message,true); }
});
$('reset-button').addEventListener('click',async () => {
  $('tools-menu').open = false;
  if (await confirmAction('Tạo lại B-Bad 2026?', `Toàn bộ vị trí và tỉ số của “${formatConfig.name}” sẽ được xóa. Phương án còn lại vẫn giữ nguyên. Hãy xuất bản sao lưu nếu cần giữ giải hiện tại. Bạn vẫn có thể hoàn tác.`, 'Tạo giải mới')) { commit(newTournament(FORMAT)); toast('Giải mới đã sẵn sàng để xếp nhánh.'); }
});
$('help-button').addEventListener('click', () => { $('tools-menu').open=false; $('help-dialog').showModal(); });
$('print-button').addEventListener('click', () => { $('tools-menu').open=false; window.print(); });

$('zoom-in').addEventListener('click', () => { manualScale=Math.min(1.5,currentScale+.1); resizeBracket(); });
$('zoom-out').addEventListener('click', () => { manualScale=Math.max(.5,currentScale-.1); resizeBracket(); });
$('fit-button').addEventListener('click', () => { manualScale=null; resizeBracket(); $('bracket-viewport').scrollTo({left:0,top:0}); });
new ResizeObserver(resizeBracket).observe($('bracket-viewport'));

async function setPresentation(enabled) {
  document.body.classList.toggle('presentation',enabled);
  $('presentation-label').textContent=enabled ? 'Thoát trình chiếu' : 'Trình chiếu';
  $('presentation-button').setAttribute('aria-pressed',String(enabled));
  manualScale=null;
  if (enabled && document.documentElement.requestFullscreen && !document.fullscreenElement) {
    try { await document.documentElement.requestFullscreen(); wasFullscreen=true; } catch { /* Presentation layout remains usable without browser fullscreen. */ }
  } else if (!enabled && document.fullscreenElement) {
    try { await document.exitFullscreen(); } catch { /* Layout exit still applies. */ }
    wasFullscreen=false;
  }
  requestAnimationFrame(resizeBracket);
}
$('presentation-button').addEventListener('click', () => setPresentation(!document.body.classList.contains('presentation')));
document.addEventListener('fullscreenchange', () => {
  if (!document.fullscreenElement && wasFullscreen) { wasFullscreen=false; setPresentation(false); }
});

render();
if (loadError) setTimeout(() => toast(loadError,true),400);
