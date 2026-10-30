/* save.js — บันทึก/โหลดเกมด้วย LocalStorage (ช่อง 1–3 + ช่อง auto สำหรับ Continue) */
TL.Save = (function () {
  'use strict';
  const SLOTS = [1, 2, 3];
  const PROGRESS_KEY = 'timeless_progress';
  const keyOf = slot => 'timeless_save_' + slot;

  // ตรวจว่าข้อมูลบันทึกใช้ได้จริง (กันข้อมูลเสียหาย)
  function valid(d) {
    return !!(d && typeof d === 'object' && d.state && typeof d.state === 'object'
      && typeof d.state.eventId === 'string' && typeof d.state.subjectId === 'string'
      && d.state.vars && typeof d.state.vars === 'object');
  }
  function read(slot) {
    let raw = null;
    try { raw = localStorage.getItem(keyOf(slot)); } catch (e) { return { data: null, corrupt: false }; }
    if (raw === null) return { data: null, corrupt: false };
    try { const d = JSON.parse(raw); return valid(d) ? { data: d, corrupt: false } : { data: null, corrupt: true }; }
    catch (e) { return { data: null, corrupt: true }; }
  }
  function write(slot, state) {
    const last = state.backlog && state.backlog.length ? state.backlog[state.backlog.length - 1].text : '';
    const payload = { version: 1, time: Date.now(), preview: String(last).slice(0, 40), state: JSON.parse(JSON.stringify(state)) };
    return TL.Store.setJSON(keyOf(slot), payload);
  }
  function list() { return SLOTS.map(s => Object.assign({ slot: s }, read(s))); }
  function latest() {          // บันทึกล่าสุดจากทุกช่อง (รวม auto) ใช้กับปุ่ม Continue
    let best = null;
    SLOTS.concat(['auto']).forEach(s => { const r = read(s).data; if (r && (!best || r.time > best.time)) best = r; });
    return best;
  }
  function markEnding(subjectId, endingId) {
    const p = TL.Store.getJSON(PROGRESS_KEY, {});
    p[subjectId] = p[subjectId] || { endings: [] };
    if (!Array.isArray(p[subjectId].endings)) p[subjectId].endings = [];
    if (!p[subjectId].endings.includes(endingId)) { p[subjectId].endings.push(endingId); TL.Store.setJSON(PROGRESS_KEY, p); }
  }
  function endingsOf(subjectId) {
    const p = TL.Store.getJSON(PROGRESS_KEY, {});
    return p && p[subjectId] && Array.isArray(p[subjectId].endings) ? p[subjectId].endings : [];
  }
  return { SLOTS, read, write, list, latest, markEnding, endingsOf };
})();
