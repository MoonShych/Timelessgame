/* backgrounds.js — ฉากหลัง: เพิ่มฉากใหม่ในตาราง backgroundList ด้านล่าง
   file     = ชื่อไฟล์ใน assets/backgrounds/   (ไม่มีไฟล์ก็ใช้ fallback)
   fallback = พื้นหลังสำรองที่สร้างด้วย CSS */
const backgroundList = {
  classroom:     { file: 'classroom.jpg',     fallback: 'radial-gradient(circle at 30% 20%, rgba(255,255,255,.18), transparent 40%), linear-gradient(160deg,#27407a,#4a6fb5 60%,#9fb8e8)' },
  future_lab:    { file: 'future_lab.jpg',    fallback: 'repeating-linear-gradient(90deg, rgba(90,209,255,.08) 0 2px, transparent 2px 60px), radial-gradient(ellipse at 50% 100%, rgba(90,209,255,.35), transparent 60%), linear-gradient(170deg,#050a1f,#0f2a6b 60%,#1b4a9a)' },
  digital_world: { file: 'digital_world.jpg', fallback: 'repeating-linear-gradient(0deg, rgba(185,168,255,.1) 0 2px, transparent 2px 48px), repeating-linear-gradient(90deg, rgba(90,209,255,.1) 0 2px, transparent 2px 48px), linear-gradient(160deg,#0a0f3a,#2b1a6e)' },
  time_portal:   { file: 'time_portal.jpg',   fallback: 'radial-gradient(circle at 50% 45%, #d8f2ff 0, #5ad1ff 12%, rgba(90,209,255,.25) 30%, transparent 55%), linear-gradient(160deg,#050a1f,#1a1450)' }
};
const defaultBackground = 'linear-gradient(160deg,#050a1f,#0f1c4d 60%,#1a1450)';

TL.Backgrounds = (function () {
  'use strict';
  let layers = [], active = 0, currentId = null;

  function init(layerA, layerB) { layers = [layerA, layerB]; active = 0; currentId = null; layers.forEach(l => l.classList.remove('show')); }

  function set(id, withFade) {
    if (!layers.length || id === currentId) return;
    let def = backgroundList[id];
    if (!def) { console.warn('[TIMELESS] ไม่พบฉากหลัง "' + id + '" ใน backgrounds.js — ใช้ฉากสำรองแทน'); def = { fallback: defaultBackground }; }
    const target = layers[1 - active], old = layers[active];
    const gradient = def.fallback || defaultBackground;
    target.style.backgroundImage = gradient;
    target.dataset.bg = id;
    if (def.file) {                                  // ลองโหลดภาพจริง ถ้าไม่ได้ก็ใช้ fallback ต่อไป
      const img = new Image();
      img.onload = () => { if (target.dataset.bg === id) target.style.backgroundImage = 'url("assets/backgrounds/' + def.file + '"), ' + gradient; };
      img.onerror = () => {};
      img.src = 'assets/backgrounds/' + def.file;
    }
    target.classList.toggle('nofade', !withFade); old.classList.toggle('nofade', !withFade);
    target.classList.add('show'); old.classList.remove('show');
    active = 1 - active; currentId = id;
  }
  function clear() { layers.forEach(l => { l.classList.remove('show'); l.dataset.bg = ''; }); currentId = null; }
  return { init, set, clear, current: () => currentId };
})();
