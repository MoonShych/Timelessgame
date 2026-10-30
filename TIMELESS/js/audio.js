/* audio.js — เพลงพื้นหลังและเสียงเอฟเฟกต์ ไฟล์อยู่ที่ assets/audio/ (ไม่มีไฟล์ก็ไม่เป็นไร) */
TL.Audio = (function () {
  'use strict';
  let bgm = null, bgmName = null, wantPlay = false;

  function path(name) { return 'assets/audio/' + (/\.\w+$/.test(name) ? name : name + '.mp3'); }
  function volume() { return TL.Settings.get('soundOn') ? TL.Settings.get('volume') / 100 : 0; }
  function safePlay(a) {
    try { const p = a.play(); if (p && p.catch) p.catch(() => { wantPlay = true; }); }  // เบราว์เซอร์ยังไม่อนุญาต -> รอผู้เล่นคลิก
    catch (e) { /* ไม่มีเสียงก็เล่นต่อได้ */ }
  }

  function playBgm(name) {
    if (!name) { stopBgm(); return; }
    if (name === bgmName) return;
    stopBgm();
    try {
      bgm = new Audio(path(name)); bgm.loop = true; bgm.volume = volume();
      bgm.addEventListener('error', () => { /* ไม่พบไฟล์: ข้าม */ });
      bgmName = name; safePlay(bgm);
    } catch (e) { bgm = null; bgmName = null; }
  }
  function stopBgm() { if (bgm) { try { bgm.pause(); } catch (e) {} } bgm = null; bgmName = null; wantPlay = false; }
  function playSfx(name) {
    if (!name || volume() === 0) return;
    try { const s = new Audio(path(name)); s.volume = volume(); s.addEventListener('error', () => {}); safePlay(s); } catch (e) {}
  }
  function apply() { if (bgm) bgm.volume = volume(); }
  TL.Settings.onChange(apply);

  // เล่นเพลงที่ค้างอยู่หลังผู้เล่นคลิกครั้งแรก (ไม่บังคับเล่นตอนเปิดเว็บ)
  document.addEventListener('pointerdown', () => { if (wantPlay && bgm) { wantPlay = false; safePlay(bgm); } }, true);

  return { playBgm, stopBgm, playSfx, getCurrentBgm: () => bgmName };
})();
