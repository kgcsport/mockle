(() => {
  'use strict';
  const app = document.querySelector('#mock-app');
  const modes = { wordle: ['Wordle', 1, 6], dordle: ['Dordle', 2, 7], quordle: ['Quordle', 4, 9], octordle: ['Octordle', 8, 13] };
  const defaults = 'ADORE APPLE BEACH BERRY BRAVE BREAD BRICK CHARM CHEER CLOUD CORAL CRANE DANCE DREAM EARTH FLAME FROST GIANT GRACE GRAPE GREEN HONEY HOUSE JUICE LIGHT LUCKY MANGO MAPLE MUSIC NOBLE OCEAN OLIVE PAINT PEACH PIANO PLANT PRANK QUEST RAINY RIVER ROBOT SHINE SMILE SOLAR SPARK STONE STORM SWEET TIGER TOAST TRAIL WATER WHALE WORLD YOUTH ZEBRA'.split(' ');
  const defaultGroups = [['Things with keys', ['PIANO', 'LOCK', 'MAP', 'KEYBOARD']], ['Kinds of jam', ['TRAFFIC', 'PAPER', 'FRUIT', 'SESSION']], ['Words after “space”', ['BAR', 'CADET', 'HEATER', 'WALK']], ['___ light', ['DAY', 'FLASH', 'LIME', 'MOON']]];
  let wordGame = null, connectionGame = null, timer;
  const esc = value => String(value).replace(/[&<>'"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[c]);
  const shuffle = source => { const a = [...source]; for (let i = a.length - 1; i; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const footer = () => '<details class="mock-footer"><summary>Parody notice</summary><p>This homemade family prank is an unofficial, non-commercial parody. It is not affiliated with, endorsed by, or sponsored by The New York Times, Merriam-Webster, Wordle, Dordle, Quordle, Octordle, or Connections. All referenced names belong to their respective owners.</p></details>';
  const header = (title = 'MOCKLE', back = false, subtitle = '') => `<header>${back ? '<button class="mock-icon home" aria-label="Back">☰</button>' : '<span></span>'}<div><h1>${esc(title)}</h1><p>${esc(subtitle || (back ? 'daily puzzle' : 'family game night'))}</p></div>${back ? '<button class="mock-icon help" aria-label="How to play">?</button>' : '<span></span>'}</header>`;
  const pack = data => { const bytes = new TextEncoder().encode(JSON.stringify(data)); let binary = ''; bytes.forEach(b => { binary += String.fromCharCode(b); }); return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); };
  const unpack = text => { const s = text.replace(/-/g, '+').replace(/_/g, '/'); const binary = atob(s + '='.repeat((4 - s.length % 4) % 4)); return JSON.parse(new TextDecoder().decode(Uint8Array.from(binary, c => c.charCodeAt(0)))); };
  const linkFor = data => `${location.origin}${location.pathname}#play=${pack(data)}`;

  function picker(changeUrl = true) {
    wordGame = connectionGame = null;
    document.title = 'Mockle — Create a Game';
    app.innerHTML = header() + `<main class="mock-picker"><div class="mock-intro"><b>Game maker</b><h2>What should your friend play?</h2><p>Choose a format, set the hidden answers, and create a tagged player link.</p></div><div class="mock-choices">${Object.entries(modes).map(([key, m]) => `<button data-mode="${key}"><span class="mock-preview">${'<i></i>'.repeat(Math.min(m[1], 8))}</span><span><strong>${m[0]}</strong><small>${m[1]} answer${m[1] > 1 ? 's' : ''} · ${m[2]} guesses</small></span></button>`).join('')}<button data-mode="connections"><span class="mock-preview"><i></i><i></i><i></i><i></i></span><span><strong>Connections</strong><small>4 custom groups · 4 mistakes</small></span></button></div><p class="mock-note">✦ Custom answers are encoded into the player link and never shown on the game screen.</p></main>${footer()}`;
    app.querySelectorAll('[data-mode]').forEach(button => { button.onclick = () => setup(button.dataset.mode); });
    if (changeUrl) history.replaceState({}, '', location.pathname);
    scrollTo(0, 0);
  }

  function setup(mode) {
    const isConnections = mode === 'connections', title = isConnections ? 'Connections' : modes[mode][0], count = isConnections ? 4 : modes[mode][1];
    const fields = isConnections
      ? Array.from({ length: 4 }, (_, i) => `<div class="group-fields"><div class="group-order"><strong><span class="group-number">${i + 1}</span>. <span class="group-difficulty"></span></strong><span><button type="button" class="move-group move-up" aria-label="Move group ${i + 1} up">Move up</button><button type="button" class="move-group move-down" aria-label="Move group ${i + 1} down">Move down</button></span></div><label>Category name<input class="group-name" maxlength="50" placeholder="e.g. Things with keys"></label><label>Four words, separated by commas<input class="group-words" maxlength="120" placeholder="PIANO, LOCK, MAP, KEYBOARD"></label></div>`).join('')
      : Array.from({ length: count }, (_, i) => `<label class="answer-label">Answer ${i + 1}<input class="answer-input" maxlength="5" autocomplete="off" spellcheck="false" placeholder="APPLE"></label>`).join('');
    app.innerHTML = header('CREATE A GAME', true, title) + `<main class="mock-setup"><div class="setup-heading"><span>Sender setup</span><h2>${esc(title)}</h2><p>${isConnections ? 'Name four categories and enter four connected words for each. Then arrange them from easiest (yellow) to hardest (purple).' : `Enter ${count} hidden five-letter answer${count > 1 ? 's' : ''}.`}</p></div><label class="setup-label">Tag for your friend <span>optional</span><input class="tag-input" maxlength="40" placeholder="e.g. Jamie"></label><div class="answer-fields">${fields}</div><p class="setup-error" role="alert"></p><div class="setup-actions"><button class="preview-button">Preview game</button><button class="copy-button primary">Copy player link</button></div><label class="link-output" hidden>Tagged player link<input readonly></label><p class="privacy-note">The answers are concealed, not encrypted. Anyone who deliberately decodes the link can read them.</p></main>${footer()}`;
    app.querySelector('.home').onclick = picker;
    app.querySelector('.help').hidden = true;
    app.querySelectorAll('.answer-input').forEach(input => { input.oninput = () => { input.value = input.value.toUpperCase().replace(/[^A-Z]/g, ''); }; });
    if (isConnections) {
      app.querySelectorAll('.move-up').forEach(button => { button.onclick = () => moveGroup(button.closest('.group-fields'), -1); });
      app.querySelectorAll('.move-down').forEach(button => { button.onclick = () => moveGroup(button.closest('.group-fields'), 1); });
      updateGroupOrder();
    }
    app.querySelector('.preview-button').onclick = () => create(mode, false);
    app.querySelector('.copy-button').onclick = () => create(mode, true);
    scrollTo(0, 0);
  }

  function moveGroup(row, direction) {
    const sibling = direction < 0 ? row.previousElementSibling : row.nextElementSibling;
    if (!sibling) return;
    if (direction < 0) row.parentElement.insertBefore(row, sibling);
    else row.parentElement.insertBefore(sibling, row);
    updateGroupOrder();
    row.querySelector(direction < 0 ? '.move-up' : '.move-down').focus();
  }

  function updateGroupOrder() {
    const difficulty = ['Yellow · easiest', 'Green', 'Blue', 'Purple · hardest'];
    [...app.querySelectorAll('.group-fields')].forEach((row, i, rows) => {
      row.querySelector('.group-number').textContent = i + 1;
      row.querySelector('.group-difficulty').textContent = difficulty[i];
      row.querySelector('.move-up').disabled = i === 0;
      row.querySelector('.move-down').disabled = i === rows.length - 1;
      row.querySelector('.move-up').setAttribute('aria-label', `Move group ${i + 1} up`);
      row.querySelector('.move-down').setAttribute('aria-label', `Move group ${i + 1} down`);
    });
  }

  function payloadFrom(mode) {
    const tag = app.querySelector('.tag-input').value.trim().replace(/^for\s+/i, '').slice(0, 40);
    if (mode === 'connections') {
      const groups = [...app.querySelectorAll('.group-fields')].map(row => [row.querySelector('.group-name').value.trim(), row.querySelector('.group-words').value.split(',').map(w => w.trim().toUpperCase()).filter(Boolean)]);
      if (groups.some(([name, words]) => !name || words.length !== 4)) throw new Error('Each group needs a name and exactly four comma-separated words.');
      if (new Set(groups.flatMap(g => g[1])).size !== 16) throw new Error('All 16 Connections words must be different.');
      return { v: 1, m: mode, t: tag, g: groups };
    }
    const words = [...app.querySelectorAll('.answer-input')].map(input => input.value.toUpperCase());
    if (words.some(word => !/^[A-Z]{5}$/.test(word))) throw new Error('Every answer must contain exactly five letters.');
    if (new Set(words).size !== words.length) throw new Error('Use a different answer for each board.');
    return { v: 1, m: mode, t: tag, w: words };
  }

  async function create(mode, copy) {
    const error = app.querySelector('.setup-error'); error.textContent = '';
    try {
      const data = payloadFrom(mode), url = linkFor(data), output = app.querySelector('.link-output');
      output.hidden = false; output.querySelector('input').value = url;
      if (!copy) { data.m === 'connections' ? startConnections(true, data) : startWords(data.m, true, data); return; }
      try { await navigator.clipboard.writeText(url); } catch (_) { output.querySelector('input').select(); document.execCommand('copy'); }
      const button = app.querySelector('.copy-button'); button.textContent = 'Link copied!'; setTimeout(() => { if (button) button.textContent = 'Copy player link'; }, 1800);
    } catch (problem) { error.textContent = problem.message; }
  }

  function wireHeader() {
    app.querySelector('.home').onclick = picker;
    app.querySelector('.help').onclick = () => alert(connectionGame ? 'Select four words sharing a connection. Find all groups before four mistakes.' : `Guess the hidden five-letter word${wordGame.count > 1 ? 's' : ''}. Green is correct, yellow is elsewhere, and gray is absent.`);
  }

  function startWords(mode, changeUrl = true, data = null) {
    const [name, count, limit] = modes[mode], daily = Array.from({ length: count }, (_, i) => defaults[(Math.floor(Date.now() / 86400000) * 17 + i * 13) % defaults.length]);
    const answers = data?.w?.length === count ? data.w : daily, tag = data?.t || '';
    wordGame = { mode, name, count, limit, answers, guesses: [], current: '', solved: Array(count).fill(false), keys: {}, over: false, tag }; connectionGame = null;
    const subtitle = tag ? `A puzzle for ${tag}` : 'daily puzzle'; document.title = `${name} — ${subtitle}`;
    app.innerHTML = header(name.toUpperCase(), true, subtitle) + `<main class="mock-game"><div class="mock-status"><span>${tag ? `${esc(tag)}’s ${name}` : `Daily ${name}`}</span><strong class="count"></strong></div><div class="mock-boards" data-n="${count}"></div><div class="mock-toast"></div><div class="mock-keyboard"></div></main>${footer()}`;
    wireHeader(); buildKeyboard(); renderWords(); if (changeUrl) history.pushState({}, '', data ? `#play=${pack(data)}` : `#${mode}`); scrollTo(0, 0);
  }

  function buildKeyboard() {
    const keyboard = app.querySelector('.mock-keyboard');
    ['QWERTYUIOP', 'ASDFGHJKL', '↵ZXCVBNM⌫'].forEach((letters, r) => { const row = document.createElement('div'); row.className = 'mock-key-row'; [...letters].forEach(letter => { const button = document.createElement('button'); button.className = `mock-key${r === 2 && (letter === '↵' || letter === '⌫') ? ' wide' : ''}`; button.dataset.key = letter; button.textContent = letter === '↵' ? 'Enter' : letter; button.onclick = () => type(letter); row.append(button); }); keyboard.append(row); });
  }
  function score(guess, answer) { const result = Array(5).fill('absent'), left = [...answer]; [...guess].forEach((letter, i) => { if (letter === answer[i]) { result[i] = 'correct'; left[i] = null; } }); [...guess].forEach((letter, i) => { if (result[i] === 'correct') return; const found = left.indexOf(letter); if (found >= 0) { result[i] = 'present'; left[found] = null; } }); return result; }
  function renderWords() {
    const boards = app.querySelector('.mock-boards'); boards.innerHTML = '';
    wordGame.answers.forEach(answer => { const board = document.createElement('div'); board.className = 'mock-board'; for (let r = 0; r < wordGame.limit; r++) { const row = document.createElement('div'); row.className = 'mock-row'; const submitted = wordGame.guesses[r], letters = submitted || (r === wordGame.guesses.length && !wordGame.over ? wordGame.current : ''), results = submitted ? score(submitted, answer) : []; for (let c = 0; c < 5; c++) { const tile = document.createElement('div'); tile.className = `mock-tile${letters[c] ? ' filled' : ''}${results[c] ? ` ${results[c]}` : ''}`; tile.textContent = letters[c] || ''; row.append(tile); } board.append(row); } boards.append(board); });
    app.querySelector('.count').textContent = `${wordGame.guesses.length} / ${wordGame.limit}`; app.querySelectorAll('.mock-key').forEach(key => { key.classList.remove('correct', 'present', 'absent'); if (wordGame.keys[key.dataset.key]) key.classList.add(wordGame.keys[key.dataset.key]); });
  }
  function toast(message, duration = 1400) { clearTimeout(timer); app.querySelector('.mock-toast').innerHTML = `<span>${esc(message)}</span>`; timer = setTimeout(() => { const el = app.querySelector('.mock-toast'); if (el) el.innerHTML = ''; }, duration); }
  function type(letter) { if (!wordGame || wordGame.over) return; if (letter === '⌫') wordGame.current = wordGame.current.slice(0, -1); else if (letter === '↵') { submitWord(); return; } else if (/^[A-Z]$/.test(letter) && wordGame.current.length < 5) wordGame.current += letter; renderWords(); }
  function submitWord() {
    if (wordGame.current.length !== 5) { toast('Not enough letters'); return; } const guess = wordGame.current, ranks = { absent: 1, present: 2, correct: 3 }; wordGame.guesses.push(guess);
    wordGame.answers.forEach((answer, i) => { if (!wordGame.solved[i]) score(guess, answer).forEach((status, j) => { const old = wordGame.keys[guess[j]]; if (!old || ranks[status] > ranks[old]) wordGame.keys[guess[j]] = status; }); if (guess === answer) wordGame.solved[i] = true; }); wordGame.current = '';
    if (wordGame.solved.every(Boolean)) { wordGame.over = true; toast('Impressive!', 4000); } else if (wordGame.guesses.length >= wordGame.limit) { wordGame.over = true; toast(`Answers: ${wordGame.answers.join(' · ')}`, 7000); } renderWords();
  }

  function startConnections(changeUrl = true, data = null) {
    const groups = data?.g || defaultGroups, tag = data?.t || ''; connectionGame = { groups, remaining: shuffle(groups.flatMap(g => g[1])), selected: [], solved: [], mistakes: 4, over: false, tag }; wordGame = null;
    const subtitle = tag ? `A puzzle for ${tag}` : 'daily puzzle'; document.title = `Connections — ${subtitle}`;
    app.innerHTML = header('CONNECTIONS', true, subtitle) + `<main class="mock-connections"><h2>Create four groups of four!</h2>${tag ? `<p class="tag-line">Made for ${esc(tag)}</p>` : ''}<p>Mistakes remaining: <span class="mistakes"></span></p><div class="solved"></div><div class="mock-cgrid"></div><div class="mock-msg"></div><div class="mock-actions"><button class="shuffle">Shuffle</button><button class="deselect">Deselect all</button><button class="send primary">Submit</button></div></main>${footer()}`;
    wireHeader(); app.querySelector('.shuffle').onclick = () => { connectionGame.remaining = shuffle(connectionGame.remaining); renderConnections(); }; app.querySelector('.deselect').onclick = () => { connectionGame.selected = []; renderConnections(); }; app.querySelector('.send').onclick = submitConnection; renderConnections(); if (changeUrl) history.pushState({}, '', data ? `#play=${pack(data)}` : '#connections'); scrollTo(0, 0);
  }
  function renderConnections() {
    const solved = app.querySelector('.solved'), grid = app.querySelector('.mock-cgrid'); solved.innerHTML = grid.innerHTML = '';
    connectionGame.solved.forEach(group => solved.insertAdjacentHTML('beforeend', `<div class="mock-group level-${connectionGame.groups.indexOf(group)}"><div><strong>${esc(group[0])}</strong><span>${group[1].map(esc).join(', ')}</span></div></div>`));
    connectionGame.remaining.forEach(word => { const button = document.createElement('button'); button.className = `mock-word${connectionGame.selected.includes(word) ? ' selected' : ''}`; button.textContent = word; button.onclick = () => { const i = connectionGame.selected.indexOf(word); if (i >= 0) connectionGame.selected.splice(i, 1); else if (connectionGame.selected.length < 4) connectionGame.selected.push(word); renderConnections(); }; grid.append(button); });
    app.querySelector('.mistakes').textContent = Array(connectionGame.mistakes).fill('●').join(' ') || '—'; app.querySelector('.send').disabled = connectionGame.selected.length !== 4 || connectionGame.over; app.querySelector('.deselect').disabled = !connectionGame.selected.length || connectionGame.over; app.querySelector('.shuffle').disabled = connectionGame.over;
  }
  function cmessage(text, duration = 1400) { app.querySelector('.mock-msg').textContent = text; setTimeout(() => { const el = app.querySelector('.mock-msg'); if (el?.textContent === text) el.textContent = ''; }, duration); }
  function submitConnection() {
    const match = connectionGame.groups.find(group => group[1].every(word => connectionGame.selected.includes(word)));
    if (match) { connectionGame.solved.push(match); connectionGame.remaining = connectionGame.remaining.filter(word => !match[1].includes(word)); connectionGame.selected = []; cmessage('Correct!'); if (connectionGame.solved.length === 4) { connectionGame.over = true; cmessage('Perfect connections!', 4000); } }
    else { const near = connectionGame.groups.some(group => group[1].filter(word => connectionGame.selected.includes(word)).length === 3); connectionGame.mistakes--; connectionGame.selected = []; cmessage(near ? 'One away…' : 'Not quite'); if (!connectionGame.mistakes) { connectionGame.over = true; connectionGame.groups.filter(group => !connectionGame.solved.includes(group)).forEach(group => connectionGame.solved.push(group)); connectionGame.remaining = []; cmessage('Next time! Here are the groups.', 5000); } } renderConnections();
  }

  function valid(data) { if (!data || data.v !== 1 || typeof data.m !== 'string') return false; if (data.m === 'connections') return Array.isArray(data.g) && data.g.length === 4 && data.g.every(g => Array.isArray(g) && typeof g[0] === 'string' && Array.isArray(g[1]) && g[1].length === 4); return Boolean(modes[data.m]) && Array.isArray(data.w) && data.w.length === modes[data.m][1] && data.w.every(w => /^[A-Z]{5}$/.test(w)); }
  function route() {
    const hash = location.hash.slice(1);
    if (hash.startsWith('play=')) { try { const data = unpack(hash.slice(5)); if (!valid(data)) throw new Error(); data.m === 'connections' ? startConnections(false, data) : startWords(data.m, false, data); return; } catch (_) { picker(false); return; } }
    if (hash === 'connections') startConnections(false); else if (modes[hash]) startWords(hash, false); else picker(false);
  }
  document.addEventListener('keydown', event => { if (!wordGame) return; if (event.key === 'Enter') type('↵'); else if (event.key === 'Backspace' || event.key === 'Delete') type('⌫'); else if (/^[a-z]$/i.test(event.key)) type(event.key.toUpperCase()); });
  addEventListener('popstate', route); route();
})();
