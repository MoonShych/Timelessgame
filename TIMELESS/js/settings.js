/* settings.js — ตัวช่วยอ่าน/เขียน LocalStorage แบบปลอดภัย และระบบตั้งค่าเกม */
window.TL = window.TL || {};

// TL.Store: ถ้าเบราว์เซอร์ปิด LocalStorage เกมจะยังเล่นได้ (แค่บันทึกไม่ได้)
TL.Store = {
  getJSON(key, fallback) {
    try { const raw = localStorage.getItem(key); return raw === null ? fallback : JSON.parse(raw); }
    catch (e) { return fallback; }
  },
  setJSON(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); return true; }
    catch (e) { return false; }
  }
};

TL.Settings = (function () {
  'use strict';
  const KEY = 'timeless_settings';
  // ค่าเริ่มต้นของการตั้งค่าทั้งหมด
  const defaults = { soundOn: true, volume: 70, textSpeed: 3, autoEnabled: true, autoSpeed: 3, transitions: true };
  const charsPerSecond = { 1: 18, 2: 32, 3: 55, 4: 90, 5: 0 };       // 0 = แสดงทันที
  const autoDelayMs = { 1: 4000, 2: 3000, 3: 2200, 4: 1500, 5: 900 };
  let values = Object.assign({}, defaults);
  const listeners = [];

  function clean(saved) {                       // กรองเฉพาะค่าที่ชนิดถูกต้อง
    const out = Object.assign({}, defaults);
    if (saved && typeof saved === 'object') {
      Object.keys(defaults).forEach(k => { if (typeof saved[k] === typeof defaults[k]) out[k] = saved[k]; });
    }
    return out;
  }
  function load() { values = clean(TL.Store.getJSON(KEY, null)); }
  function get(key) { return values[key]; }
  function set(key, value) {
    if (!(key in defaults)) return;
    values[key] = value;
    TL.Store.setJSON(KEY, values);
    listeners.forEach(fn => fn(key, value));
  }
  function onChange(fn) { listeners.push(fn); }
  load();
  return {
    get, set, onChange,
    textCps: () => charsPerSecond[values.textSpeed],
    autoDelay: () => autoDelayMs[values.autoSpeed]
  };
})();
