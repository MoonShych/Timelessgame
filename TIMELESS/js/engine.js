/* engine.js — ระบบหลักของเกม (ตรรกะล้วน ๆ ไม่ยุ่งกับหน้าตา)
   อ่านข้อมูลจาก story.js / questions.js แล้วสั่งให้ "view" (อยู่ใน main.js) แสดงผล
   ผู้พัฒนาเนื้อเรื่องไม่จำเป็นต้องแก้ไฟล์นี้ */
TL.Engine = (function () {
  'use strict';
  const READ_KEY = 'timeless_read';
  let view = null, state = null, subject = null;
  let inputLocked = false, lastAdvance = 0, currentChoices = [];
  let readMap = TL.Store.getJSON(READ_KEY, {});
  if (!readMap || typeof readMap !== 'object') readMap = {};

  function init(v) { view = v; }

  // ---------- สถานะเกม ----------
  function newState(subjectId) {
    return { subjectId, eventId: null, vars: { score: 0, correct: 0, wrong: 0 }, stage: {}, background: null, bgm: null, quiz: null, backlog: [] };
  }
  function persist() { if (state) TL.Save.write('auto', state); }
  function getState() { return state; }
  function isActive() { return !!state; }
  function getEvent(id) { return subject && subject.story ? subject.story[id] : undefined; }
  function fail(message) {
    inputLocked = false;
    console.error('[TIMELESS] ' + message);
    view.error(message);
  }

  // ---------- เริ่มเกม / โหลดเกม ----------
  function startNew(subjectId) {
    subject = (typeof subjects !== 'undefined') ? subjects[subjectId] : null;
    if (!subject) { state = null; return fail('ไม่พบวิชา "' + subjectId + '" ใน story.js (ส่วน subjects)'); }
    state = newState(subjectId);
    TL.Characters.reset(); TL.Backgrounds.clear(); TL.Audio.stopBgm();
    goTo(subject.start || 'start');
  }

  function load(saved) {
    const s = saved && saved.state;
    const subj = s && typeof subjects !== 'undefined' ? subjects[s.subjectId] : null;
    if (!subj || !subj.story[s.eventId]) { state = null; fail('ข้อมูลบันทึกนี้ใช้ไม่ได้ (เนื้อเรื่องอาจถูกแก้ไขหลังบันทึก)'); return false; }
    subject = subj;
    state = JSON.parse(JSON.stringify(s));
    state.vars = state.vars || {}; state.backlog = Array.isArray(state.backlog) ? state.backlog : []; state.stage = state.stage || {};
    // คืนค่าฉากหลัง ตัวละคร เพลง แล้วแสดงเหตุการณ์ปัจจุบันโดยไม่ทำซ้ำผลของเหตุการณ์
    TL.Backgrounds.clear();
    if (state.background) TL.Backgrounds.set(state.background, false);
    TL.Characters.restore(state.stage);
    TL.Audio.stopBgm(); if (state.bgm) TL.Audio.playBgm(state.bgm);
    inputLocked = false;
    enter(getEvent(state.eventId), true);
    return true;
  }

  // ---------- ไปยังเหตุการณ์ ----------
  function goTo(id) {
    let guard = 0;
    while (true) {
      const ev = getEvent(id);
      if (!ev) return fail('ไม่พบเหตุการณ์ ID "' + id + '" — ตรวจการสะกดใน story.js ว่ามีเหตุการณ์นี้หรือไม่');
      if (++guard > 50) return fail('เงื่อนไขวนซ้ำเกิน 50 ครั้ง (ตรวจเหตุการณ์ condition ใน story.js)');
      if (ev.type === 'condition') {
        const branches = ev.branches || [{ if: ev.if, next: ev.then }];
        const hit = branches.find(b => check(b.if));
        id = hit ? hit.next : ev.else;
        if (!id) return fail('เหตุการณ์ condition "' + ev.id + '" ไม่มีปลายทาง (then/else)');
        continue;
      }
      if (ev.type === 'set') {
        applyEffects(ev); id = ev.next;
        if (!id) return fail('เหตุการณ์ set "' + ev.id + '" ไม่มี next');
        continue;
      }
      state.eventId = id;
      return enter(ev, false);
    }
  }

  function enter(ev, restoring) {
    inputLocked = false;
    if (!restoring) { applyEffects(ev); updateScene(ev); }
    switch (ev.type) {
      case 'dialogue': return enterDialogue(ev, restoring);
      case 'choice':   return enterChoice(ev, restoring);
      case 'quiz':     return restoring && state.quiz ? view.showQuiz(getQuizView()) : startQuiz(ev);
      case 'ending':   return enterEnding(ev, restoring);
      default:         return fail('ไม่รู้จัก type "' + ev.type + '" ในเหตุการณ์ "' + ev.id + '"');
    }
  }

  function applyEffects(ev) {
    if (ev.set) Object.keys(ev.set).forEach(k => { state.vars[k] = ev.set[k]; });
    if (ev.add) Object.keys(ev.add).forEach(k => { state.vars[k] = (Number(state.vars[k]) || 0) + Number(ev.add[k]); });
  }

  function updateScene(ev) {
    if (ev.background) { state.background = ev.background; TL.Backgrounds.set(ev.background, TL.Settings.get('transitions')); }
    if (ev.hide) { if (ev.hide === 'all') TL.Characters.hideAll(); else [].concat(ev.hide).forEach(id => TL.Characters.hide(id)); }
    if (ev.type === 'ending' && !ev.keepCharacters) TL.Characters.hideAll();
    if (ev.show) ev.show.forEach(c => TL.Characters.show(c.character, c.expression, c.position));
    if (ev.character) TL.Characters.show(ev.character, ev.expression, ev.position);
    state.stage = TL.Characters.getState();
    TL.Characters.highlight(ev.character || null);
    if (ev.bgm !== undefined) { state.bgm = ev.bgm; TL.Audio.playBgm(ev.bgm); }
    if (ev.sfx) TL.Audio.playSfx(ev.sfx);
    if (ev.effect) view.effect(ev.effect);
  }

  // ---------- Backlog / ข้อความที่อ่านแล้ว ----------
  function speakerOf(ev) { return ev.speaker !== undefined ? ev.speaker : (ev.character ? TL.Characters.displayName(ev.character) : ''); }
  function addBacklog(ev, speaker, text) {
    const last = state.backlog[state.backlog.length - 1];
    if (last && last.eventId === ev.id) return;           // ไม่เก็บซ้ำจากการเรนเดอร์ซ้ำ
    state.backlog.push({ eventId: ev.id, speaker, text });
    if (state.backlog.length > 300) state.backlog.shift();
  }
  function isRead(id) { return !!readMap[state.subjectId + ':' + id]; }
  function markRead(id) { readMap[state.subjectId + ':' + id] = 1; TL.Store.setJSON(READ_KEY, readMap); }

  // ---------- บทสนทนา ----------
  function enterDialogue(ev, restoring) {
    const speaker = speakerOf(ev), read = isRead(ev.id);
    if (!restoring) { addBacklog(ev, speaker, ev.text || ''); markRead(ev.id); persist(); }
    TL.Characters.highlight(ev.character || null);
    view.showDialogue({ speaker, color: ev.character ? TL.Characters.colorOf(ev.character) : null, text: ev.text || '', read });
  }
  function advance() {
    const now = Date.now();
    if (!state || inputLocked || now - lastAdvance < 100) return;
    const ev = getEvent(state.eventId);
    if (!ev || ev.type !== 'dialogue') return;
    lastAdvance = now; inputLocked = true;              // กันกดซ้ำระหว่างเปลี่ยนเหตุการณ์
    if (!ev.next) return fail('เหตุการณ์ "' + ev.id + '" ไม่มี next — ใส่ next หรือเปลี่ยนเป็น type: "ending"');
    goTo(ev.next);
  }

  // ---------- ตัวเลือก ----------
  function enterChoice(ev, restoring) {
    const speaker = speakerOf(ev);
    if (ev.text && !restoring) addBacklog(ev, speaker, ev.text);
    currentChoices = (ev.choices || []).filter(c => check(c.requires));
    if (!currentChoices.length) return fail('เหตุการณ์ "' + ev.id + '" ไม่มีตัวเลือกที่เลือกได้');
    if (!restoring) persist();
    view.showChoices({ speaker, color: ev.character ? TL.Characters.colorOf(ev.character) : null, text: ev.text || '', choices: currentChoices.map(c => c.text) });
  }
  function choose(index) {
    const c = currentChoices[index];
    if (!state || inputLocked || !c) return;
    inputLocked = true;
    applyEffects(c);
    const ev = getEvent(state.eventId);
    state.backlog.push({ eventId: ev.id + '#choice', speaker: '▶ เลือก', text: c.text });
    if (!c.next) return fail('ตัวเลือก "' + c.text + '" ไม่มี next');
    goTo(c.next);
  }

  // ---------- เงื่อนไข (ไม่ใช้ eval) ----------
  function check(c) {
    if (!c) return true;
    if (c.all) return c.all.every(check);
    if (c.any) return c.any.some(check);
    if (c.not) return !check(c.not);
    const v = state.vars[c.var], t = c.value;
    switch (c.op || '==') {
      case '==': return v === t || (v === undefined && t === false);
      case '!=': return !(v === t || (v === undefined && t === false));
      case '>':  return v > t;
      case '>=': return v >= t;
      case '<':  return v < t;
      case '<=': return v <= t;
      default: console.warn('[TIMELESS] ไม่รู้จัก op "' + c.op + '"'); return false;
    }
  }

  // ---------- ระบบคำถาม ----------
  function shuffle(arr) { for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [arr[i], arr[j]] = [arr[j], arr[i]]; } return arr; }
  function validQuestion(q) { return q && typeof q.question === 'string' && Array.isArray(q.options) && q.options.length >= 2 && Number.isInteger(q.answer) && q.answer >= 0 && q.answer < q.options.length; }

  function startQuiz(ev) {
    const set = typeof questionSets !== 'undefined' ? questionSets[ev.questionSet] : null;
    if (!set || !Array.isArray(set.questions)) return fail('ไม่พบชุดคำถาม "' + ev.questionSet + '" ใน questions.js');
    let order = [];
    set.questions.forEach((q, i) => { if (validQuestion(q)) order.push(i); else console.warn('[TIMELESS] ข้ามคำถามที่ข้อมูลไม่ถูกต้อง: ' + (q && q.id)); });
    if (set.shuffleQuestions) shuffle(order);
    if (ev.count) order = order.slice(0, ev.count);
    if (!order.length) return fail('ชุดคำถาม "' + ev.questionSet + '" ไม่มีคำถามที่ใช้งานได้');
    const optionOrders = order.map(qi => {
      const idx = set.questions[qi].options.map((_, i) => i);
      return set.shuffleOptions ? shuffle(idx) : idx;
    });
    state.quiz = {
      eventId: ev.id, setId: ev.questionSet, order, optionOrders, index: 0,
      correct: 0, wrong: 0, points: 0,
      required: ev.requiredCorrect !== undefined ? ev.requiredCorrect : (set.requiredCorrect !== undefined ? set.requiredCorrect : order.length),
      phase: 'answering', selected: null, attempts: 0, lastCorrect: false, passed: false
    };
    persist();
    view.showQuiz(getQuizView());
  }

  function currentQuestion() { const q = state.quiz, set = questionSets[q.setId]; return set.questions[q.order[q.index]]; }

  function getQuizView() {
    const q = state.quiz, set = questionSets[q.setId], total = q.order.length;
    const base = { phase: q.phase, title: set.title || '', total, correct: q.correct, wrong: q.wrong, points: q.points, required: q.required, passed: q.passed };
    if (q.phase === 'summary') return base;
    const item = currentQuestion(), optOrder = q.optionOrders[q.index];
    const correctDisplay = optOrder.indexOf(item.answer);       // ตำแหน่งคำตอบถูกหลังสุ่มตัวเลือก
    const options = optOrder.map((orig, i) => {
      let st = 'normal';
      if (q.phase === 'answering') { if (q.selected === i) st = 'selected'; else if (item.showAnswerBefore && i === correctDisplay) st = 'hint'; }
      else if (q.phase === 'retry') { if (q.selected === i) st = 'wrong'; }
      else { if (i === correctDisplay) st = 'correct'; else if (q.selected === i) st = 'wrong'; }
      return { label: String.fromCharCode(65 + i), text: item.options[orig], state: st };
    });
    const showExp = item.showExplanation !== undefined ? item.showExplanation : (set.showExplanation !== false);
    return Object.assign(base, {
      number: q.index + 1, text: item.question, options, selected: q.selected,
      isCorrect: q.lastCorrect,
      explanation: (q.phase === 'feedback' && showExp) ? (item.explanation || '') : ''
    });
  }

  function selectOption(i) {
    const q = state && state.quiz;
    if (!q || q.phase !== 'answering' || i < 0 || i >= q.optionOrders[q.index].length) return;
    q.selected = i; persist(); view.showQuiz(getQuizView());
  }
  function confirmAnswer() {
    const q = state && state.quiz;
    if (!q || q.phase !== 'answering' || q.selected === null) return;   // กันส่งคำตอบซ้ำ
    const set = questionSets[q.setId], item = currentQuestion();
    const isCorrect = q.optionOrders[q.index][q.selected] === item.answer;
    q.lastCorrect = isCorrect;
    if (q.attempts === 0) {                                              // นับคะแนนเฉพาะครั้งแรกของแต่ละข้อ
      const pts = item.points !== undefined ? item.points : (set.pointsPerQuestion !== undefined ? set.pointsPerQuestion : 1);
      if (isCorrect) { q.correct++; q.points += pts; state.vars.correct++; state.vars.score += pts; }
      else { q.wrong++; state.vars.wrong++; }
      syncQuizVars();
    }
    q.attempts++;
    q.phase = (!isCorrect && set.allowRetry) ? 'retry' : 'feedback';
    persist(); view.showQuiz(getQuizView());
  }
  function retryQuestion() {
    const q = state && state.quiz;
    if (!q || q.phase !== 'retry') return;
    q.phase = 'answering'; q.selected = null; persist(); view.showQuiz(getQuizView());
  }
  function syncQuizVars() {
    const q = state.quiz, p = q.setId + '_';
    state.vars[p + 'correct'] = q.correct; state.vars[p + 'wrong'] = q.wrong; state.vars[p + 'score'] = q.points;
  }
  function nextQuestion() {
    const q = state && state.quiz;
    if (!q || q.phase !== 'feedback') return;
    const item = currentQuestion();
    const jump = q.lastCorrect ? item.correctNext : item.wrongNext;      // ตอบแล้วกระโดดไปเหตุการณ์ที่กำหนดเอง
    if (jump) { state.vars[q.setId + '_passed'] = q.correct >= q.required; state.quiz = null; return goTo(jump); }
    q.index++;
    if (q.index >= q.order.length) { q.phase = 'summary'; q.passed = q.correct >= q.required; state.vars[q.setId + '_passed'] = q.passed; }
    else { q.phase = 'answering'; q.selected = null; q.attempts = 0; }
    persist(); view.showQuiz(getQuizView());
  }
  function finishQuiz() {
    const q = state && state.quiz;
    if (!q || q.phase !== 'summary' || inputLocked) return;
    inputLocked = true;
    const ev = getEvent(q.eventId);
    const dest = q.passed ? (ev.passNext || ev.next) : (ev.failNext || ev.next);
    state.quiz = null;
    if (!dest) return fail('เหตุการณ์ quiz "' + ev.id + '" ไม่มี ' + (q.passed ? 'passNext' : 'failNext') + ' หรือ next');
    goTo(dest);
  }

  // ---------- ฉากจบ ----------
  function enterEnding(ev, restoring) {
    if (!restoring) { TL.Save.markEnding(state.subjectId, ev.id); persist(); }
    view.showEnding({ title: ev.title || '', text: ev.text || '', canContinue: !!ev.next, endings: TL.Save.endingsOf(state.subjectId).length });
  }
  function continueAfterEnding() {
    const ev = state && getEvent(state.eventId);
    if (!ev || ev.type !== 'ending' || !ev.next || inputLocked) return;
    inputLocked = true; goTo(ev.next);
  }
  function replay() { if (state) startNew(state.subjectId); }
  function leave() { state = null; subject = null; }

  // ---------- ตัวช่วยสำหรับนักพัฒนา: ตรวจ ID ที่อ้างอิงทั้งหมดตอนเปิดเกม ----------
  function validateStory() {
    const problems = [];
    if (typeof subjects === 'undefined') return ['ไม่พบตัวแปร subjects'];
    Object.keys(subjects).forEach(sid => {
      const sub = subjects[sid], story = sub.story || {};
      if (!story[sub.start || 'start']) problems.push(sid + ': ไม่พบเหตุการณ์เริ่มต้น "' + (sub.start || 'start') + '"');
      Object.keys(story).forEach(id => {
        const ev = story[id], refs = [];
        ['next', 'passNext', 'failNext', 'then', 'else'].forEach(k => { if (ev[k]) refs.push(ev[k]); });
        (ev.choices || []).forEach(c => { if (c.next) refs.push(c.next); });
        (ev.branches || []).forEach(b => { if (b.next) refs.push(b.next); });
        refs.forEach(r => { if (!story[r]) problems.push(sid + ': เหตุการณ์ "' + id + '" อ้างถึง ID "' + r + '" ที่ไม่มีอยู่'); });
        if (ev.type === 'quiz' && (typeof questionSets === 'undefined' || !questionSets[ev.questionSet])) problems.push(sid + ': เหตุการณ์ "' + id + '" อ้างถึงชุดคำถาม "' + ev.questionSet + '" ที่ไม่มีอยู่');
      });
    });
    return problems;
  }

  return { init, startNew, load, advance, choose, selectOption, confirmAnswer, retryQuestion, nextQuestion, finishQuiz,
           continueAfterEnding, replay, leave, getState, isActive, validateStory };
})();
