/* main.js — ส่วนแสดงผลและปุ่มต่าง ๆ (view) เชื่อมหน้าเว็บเข้ากับ engine.js */
(function () {
  'use strict';
  const $ = id => document.getElementById(id);
  const E = TL.Engine, S = TL.Settings;
  const el = {
    menu: $('screen-menu'), game: $('screen-game'), dialogue: $('dialogue'), name: $('nameplate'), text: $('dialogue-text'),
    choices: $('choices'), quiz: $('quiz'), ending: $('ending'), toast: $('toast'),
    auto: $('hud-auto'), skip: $('hud-skip'), btnContinue: $('btn-continue')
  };
  let mode = 'menu';                       // menu | dialogue | choice | quiz | ending | error
  let autoOn = false, skipOn = false, autoTimer = null, skipTimer = null, toastTimer = null;
  const typer = { timer: null, done: true, full: '', read: false };
  let saveMode = 'save';

  // ---------- ตัวช่วยทั่วไป ----------
  function make(tag, cls, text) { const n = document.createElement(tag); if (cls) n.className = cls; if (text !== undefined) n.textContent = text; return n; }
  function toast(msg) { el.toast.textContent = msg; el.toast.hidden = false; clearTimeout(toastTimer); toastTimer = setTimeout(() => { el.toast.hidden = true; }, 2200); }
  function modalOpen() { return !!document.querySelector('.modal:not([hidden])'); }
  function openModal(id) { stopAutoSkip(); $(id).hidden = false; const b = $(id).querySelector('.btn-primary, .btn'); if (b) b.focus(); }
  function closeModal(id) { $(id).hidden = true; }
  function closeAllModals() { document.querySelectorAll('.modal').forEach(m => { m.hidden = true; }); }
  function showScreen(name) { el.menu.classList.toggle('active', name === 'menu'); el.game.classList.toggle('active', name === 'game'); }

  // ---------- Typewriter / Auto / Skip ----------
  function stopTyping() { clearInterval(typer.timer); typer.timer = null; }
  function typeText(text, instant) {
    stopTyping(); typer.full = text; typer.done = false; el.dialogue.classList.remove('done');
    const cps = S.textCps(), chars = Array.from(text);
    if (instant || cps === 0 || !chars.length) { el.text.textContent = text; return finishTyping(); }
    el.text.textContent = ''; const t0 = Date.now();
    typer.timer = setInterval(() => {
      const n = Math.floor((Date.now() - t0) / 1000 * cps);
      if (n >= chars.length) { el.text.textContent = text; finishTyping(); } else el.text.textContent = chars.slice(0, n).join('');
    }, 30);
  }
  function finishTyping() {
    stopTyping(); typer.done = true; el.text.textContent = typer.full; el.dialogue.classList.add('done');
    scheduleAuto(); trySkipStep();
  }
  function scheduleAuto() {
    clearTimeout(autoTimer);
    if (autoOn && mode === 'dialogue' && typer.done && !modalOpen()) autoTimer = setTimeout(() => E.advance(), S.autoDelay() + typer.full.length * 25);
  }
  function setAuto(on, msg) {
    autoOn = on && S.get('autoEnabled') && mode === 'dialogue';
    if (autoOn) { setSkip(false); scheduleAuto(); } else clearTimeout(autoTimer);
    el.auto.setAttribute('aria-pressed', String(autoOn));
    if (msg) toast(msg);
  }
  function setSkip(on, msg) {
    skipOn = on && mode === 'dialogue';
    if (skipOn) { setAuto(false); trySkipStep(); } else clearTimeout(skipTimer);
    el.skip.setAttribute('aria-pressed', String(skipOn));
    if (msg) toast(msg);
  }
  function trySkipStep() {              // Skip ข้ามเฉพาะข้อความที่อ่านแล้ว
    clearTimeout(skipTimer);
    if (!skipOn || mode !== 'dialogue') return;
    if (!typer.read) return setSkip(false, 'หยุด Skip: ถึงข้อความที่ยังไม่เคยอ่าน');
    if (!typer.done) return finishTyping();          // ข้อความที่อ่านแล้ว: แสดงทันทีแล้วข้ามต่อ
    skipTimer = setTimeout(() => E.advance(), 130);
  }
  function stopAutoSkip() { if (autoOn) setAuto(false); if (skipOn) setSkip(false); clearTimeout(autoTimer); clearTimeout(skipTimer); }
  function syncAutoButton() { el.auto.disabled = !S.get('autoEnabled'); }

  // ---------- View: engine เรียกฟังก์ชันเหล่านี้เพื่อแสดงผล ----------
  const view = {
    showDialogue(d) {
      mode = 'dialogue'; hideOverlays(); el.dialogue.hidden = false;
      el.name.hidden = !d.speaker; el.name.textContent = d.speaker || '';
      el.name.style.background = d.color || ''; el.dialogue.classList.toggle('narration', !d.speaker);
      typer.read = d.read;
      typeText(d.text, skipOn && d.read);
      trySkipStep();
    },
    showChoices(d) {
      mode = 'choice'; stopAutoSkip(); hideOverlays();
      if (d.text) { el.dialogue.hidden = false; el.name.hidden = !d.speaker; el.name.textContent = d.speaker || ''; el.name.style.background = d.color || ''; el.dialogue.classList.toggle('narration', !d.speaker); stopTyping(); typer.full = d.text; typer.done = true; el.text.textContent = d.text; el.dialogue.classList.remove('done'); }
      el.choices.replaceChildren(); el.choices.hidden = false;
      d.choices.forEach((label, i) => {
        const b = make('button', 'btn', (i + 1) + '. ' + label);
        b.addEventListener('click', () => { el.choices.querySelectorAll('button').forEach(x => { x.disabled = true; }); E.choose(i); });
        el.choices.appendChild(b);
      });
      el.choices.firstChild.focus();
    },
    showQuiz(q) { mode = 'quiz'; stopAutoSkip(); hideOverlays(); renderQuiz(q); },
    showEnding(d) {
      mode = 'ending'; stopAutoSkip(); hideOverlays(); el.ending.hidden = false;
      const p = make('div', 'panel');
      p.append(make('h2', 'ending-title', d.title), make('p', 'ending-text', d.text));
      const acts = make('div', 'panel-actions');
      if (d.canContinue) acts.append(btn('เล่นต่อ', () => E.continueAfterEnding(), true));
      acts.append(btn('เล่นใหม่', () => E.replay()), btn('กลับ Main Menu', goMenu, !d.canContinue));
      p.append(acts); el.ending.replaceChildren(p); acts.firstChild.focus();
    },
    effect(name) {
      const cls = name === 'shake' ? 'shake' : name === 'flash' ? 'flash' : null; if (!cls) return;
      el.game.classList.remove(cls); void el.game.offsetWidth; el.game.classList.add(cls);
      setTimeout(() => el.game.classList.remove(cls), 600);
    },
    error(msg) { mode = 'error'; stopAutoSkip(); $('error-text').textContent = msg; openModal('modal-error'); }
  };
  function hideOverlays() { el.dialogue.hidden = true; el.choices.hidden = true; el.quiz.hidden = true; el.ending.hidden = true; }
  function btn(label, fn, primary) { const b = make('button', 'btn' + (primary ? ' btn-primary' : ''), label); b.addEventListener('click', fn); return b; }

  // ---------- หน้าคำถาม ----------
  function renderQuiz(q) {
    el.quiz.hidden = false;
    const p = make('div', 'panel');
    if (q.phase === 'summary') {
      p.append(make('div', 'quiz-head', q.title), make('div', 'summary-big', (q.passed ? '✓ ผ่าน' : '✗ ยังไม่ผ่าน')),
        make('p', '', 'ตอบถูก ' + q.correct + ' จาก ' + q.total + ' ข้อ  •  ผิด ' + q.wrong + ' ข้อ  •  คะแนน ' + q.points),
        make('p', '', 'เกณฑ์ผ่าน: ตอบถูกอย่างน้อย ' + q.required + ' ข้อ'));
      const acts = make('div', 'panel-actions'); const next = btn('ไปต่อ', () => E.finishQuiz(), true); acts.append(next); p.append(acts);
      el.quiz.replaceChildren(p); next.focus(); return;
    }
    p.append(make('div', 'quiz-head'), make('p', 'quiz-q', q.text));
    p.firstChild.append(make('span', '', 'คำถามข้อที่ ' + q.number + ' / ' + q.total), make('span', '', q.title));
    const list = make('div', 'opts'); list.setAttribute('role', 'radiogroup');
    const locked = q.phase !== 'answering';
    q.options.forEach((o, i) => {
      const b = make('button', 'btn opt ' + o.state); b.disabled = locked;
      b.setAttribute('role', 'radio'); b.setAttribute('aria-checked', String(o.state === 'selected'));
      const mark = o.state === 'correct' ? '✓ ถูก' : o.state === 'wrong' ? '✗ ผิด' : o.state === 'selected' ? '● เลือก' : '';
      b.append(make('span', 'letter', o.label), make('span', '', o.text), make('span', 'mark', mark));
      b.addEventListener('click', () => E.selectOption(i)); list.appendChild(b);
    });
    p.append(list);
    const acts = make('div', 'panel-actions'); let focusBtn = null;
    if (q.phase === 'answering') { const c = btn('ยืนยันคำตอบ', () => E.confirmAnswer(), true); c.disabled = q.selected === null; acts.append(c); focusBtn = c.disabled ? list.querySelector('button') : c; }
    else {
      const v = make('div', 'verdict ' + (q.isCorrect ? 'ok' : 'bad'), q.isCorrect ? '✓ ตอบถูก!' : (q.phase === 'retry' ? '✗ ตอบผิด ลองอีกครั้งได้' : '✗ ตอบผิด'));
      if (q.explanation) v.append(make('small', '', q.explanation));
      p.append(v);
      const a = q.phase === 'retry' ? btn('ลองอีกครั้ง', () => E.retryQuestion(), true) : btn(q.number >= q.total ? 'ดูผลลัพธ์' : 'ข้อถัดไป', () => E.nextQuestion(), true);
      acts.append(a); focusBtn = a;
    }
    p.append(acts); el.quiz.replaceChildren(p); if (focusBtn) focusBtn.focus();
  }

  // ---------- Backlog / Save / Settings ----------
  function openBacklog() {
    const st = E.getState(), box = $('backlog-list'); box.replaceChildren();
    if (!st || !st.backlog.length) box.append(make('p', 'log-empty', 'ยังไม่มีบทสนทนา'));
    else st.backlog.forEach(e => { const d = make('div', 'log-item'); if (e.speaker) d.append(make('b', '', e.speaker)); d.append(document.createTextNode(e.text)); box.append(d); });
    openModal('modal-backlog'); const m = $('modal-backlog').querySelector('.modal-card'); m.scrollTop = m.scrollHeight;
  }
  function fmtTime(t) { return new Date(t).toLocaleString('th-TH'); }
  function openSaves(m) {
    saveMode = m; $('saves-title').textContent = m === 'save' ? 'Save' : 'Load';
    const box = $('saves-list'); box.replaceChildren();
    const rows = TL.Save.list(); if (m === 'load') { const a = TL.Save.read('auto'); rows.push(Object.assign({ slot: 'auto' }, a)); }
    rows.forEach(r => {
      const row = make('div', 'slot'), info = make('div', 'slot-info');
      info.append(make('div', '', r.slot === 'auto' ? 'บันทึกอัตโนมัติ' : 'ช่อง ' + r.slot));
      info.append(make('small', '', r.data ? fmtTime(r.data.time) + (r.data.preview ? ' — ' + r.data.preview : '') : (r.corrupt ? 'ข้อมูลเสียหาย (ใช้ไม่ได้)' : 'ว่าง')));
      const b = btn(m === 'save' ? 'บันทึก' : 'โหลด', () => (m === 'save' ? doSave(r.slot) : doLoad(r.data)), false);
      if (m === 'load' && !r.data) b.disabled = true;
      if (m === 'save' && !E.isActive()) b.disabled = true;
      row.append(info, b); box.append(row);
    });
    openModal('modal-saves');
  }
  function doSave(slot) {
    if (!E.isActive()) return;
    const ok = TL.Save.write(slot, E.getState()) && TL.Save.read(slot).data;   // อ่านกลับมาตรวจว่าบันทึกสำเร็จจริง
    toast(ok ? 'บันทึกลงช่อง ' + slot + ' แล้ว' : 'บันทึกไม่สำเร็จ (เบราว์เซอร์อาจปิด LocalStorage)');
    if (ok) openSaves('save');
  }
  function doLoad(data) {
    if (!data) return;
    closeAllModals(); stopAutoSkip(); showScreen('game');
    if (E.load(data)) toast('โหลดเกมแล้ว'); else showScreen('menu');
  }
  function bindSettings() {
    ['soundOn', 'autoEnabled', 'transitions'].forEach(k => { const i = $('set-' + k); i.checked = S.get(k); i.onchange = () => S.set(k, i.checked); });
    ['volume', 'textSpeed', 'autoSpeed'].forEach(k => {
      const i = $('set-' + k), v = $('val-' + k); i.value = S.get(k);
      const show = () => { v.textContent = k === 'volume' ? i.value + '%' : i.value + '/5'; }; show();
      i.oninput = () => { S.set(k, Number(i.value)); show(); };
    });
  }
  S.onChange(key => { if (key === 'autoEnabled') { syncAutoButton(); if (!S.get('autoEnabled')) setAuto(false); } });

  // ---------- เมนู ----------
  function refreshContinue() { el.btnContinue.disabled = !TL.Save.latest(); }
  function goMenu() { stopAutoSkip(); closeAllModals(); E.leave(); TL.Audio.stopBgm(); mode = 'menu'; showScreen('menu'); refreshContinue(); el.menu.querySelector('.btn-primary').focus(); }
  function startGame(id) { closeAllModals(); showScreen('game'); stopAutoSkip(); E.startNew(id); }
  function newGame() {
    const ids = Object.keys(typeof subjects !== 'undefined' ? subjects : {});
    if (!ids.length) return view.error('ไม่พบวิชาใน story.js');
    if (ids.length === 1) return startGame(ids[0]);
    const box = $('subjects-list'); box.replaceChildren();
    ids.forEach(id => { const s = subjects[id]; const b = btn(s.title + (s.description ? ' — ' + s.description : '') + ' (ฉากจบที่ได้: ' + TL.Save.endingsOf(id).length + ')', () => startGame(id)); box.append(b); });
    openModal('modal-subjects');
  }

  // ---------- ผูกปุ่ม ----------
  $('btn-new').onclick = newGame;
  $('btn-continue').onclick = () => { const d = TL.Save.latest(); if (d) doLoad(d); else toast('ยังไม่มีข้อมูลบันทึก'); };
  $('btn-settings').onclick = () => { bindSettings(); openModal('modal-settings'); };
  $('btn-credits').onclick = () => openModal('modal-credits');
  el.auto.onclick = () => { if (!S.get('autoEnabled')) return toast('Auto Mode ถูกปิดอยู่ใน Settings'); setAuto(!autoOn, autoOn ? 'หยุด Auto' : undefined); };
  el.skip.onclick = () => setSkip(!skipOn);
  $('hud-log').onclick = openBacklog;
  $('hud-save').onclick = () => openSaves('save');
  $('hud-load').onclick = () => openSaves('load');
  $('hud-menu').onclick = () => openModal('modal-pause');
  $('pause-save').onclick = () => { closeModal('modal-pause'); openSaves('save'); };
  $('pause-load').onclick = () => { closeModal('modal-pause'); openSaves('load'); };
  $('pause-settings').onclick = () => { closeModal('modal-pause'); bindSettings(); openModal('modal-settings'); };
  $('pause-home').onclick = goMenu;
  $('error-home').onclick = goMenu;
  document.querySelectorAll('[data-close]').forEach(b => b.addEventListener('click', () => { b.closest('.modal').hidden = true; scheduleAuto(); }));
  el.dialogue.addEventListener('click', () => {
    if (mode !== 'dialogue' || modalOpen()) return;
    if (!typer.done) finishTyping(); else E.advance();
  });

  // ---------- คีย์บอร์ด ----------
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      const open = document.querySelector('.modal:not([hidden])');
      if (open) { if (open.id !== 'modal-error') open.hidden = true; } else if (mode !== 'menu') openModal('modal-pause');
      return;
    }
    if (modalOpen()) return;
    const onControl = /^(BUTTON|INPUT)$/.test(e.target.tagName);
    if (mode === 'dialogue' && !onControl && (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowRight')) {
      e.preventDefault(); if (!typer.done) finishTyping(); else E.advance();
    } else if (mode === 'choice' && /^[1-9]$/.test(e.key)) {
      const b = el.choices.querySelectorAll('button')[Number(e.key) - 1]; if (b && !b.disabled) b.click();
    } else if (mode === 'quiz' && /^[a-dA-D1-4]$/.test(e.key)) {
      const i = /\d/.test(e.key) ? Number(e.key) - 1 : e.key.toUpperCase().charCodeAt(0) - 65; E.selectOption(i);
    }
  });

  // ---------- เริ่มต้น ----------
  TL.Characters.init($('characters'));
  TL.Backgrounds.init($('bgA'), $('bgB'));
  E.init(view);
  syncAutoButton(); refreshContinue();
  const problems = E.validateStory();
  if (problems.length) { console.warn('[TIMELESS] พบปัญหาในข้อมูลเนื้อเรื่อง:\n- ' + problems.join('\n- ')); }
})();
