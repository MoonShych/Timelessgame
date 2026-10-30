/* characters.js — ตัวละคร: เพิ่มตัวละครใหม่ในตาราง characterList ด้านล่าง
   ไฟล์ภาพ = assets/characters/<id>_<สีหน้า>.png  เช่น luna_happy.png
   ถ้าไม่มีไฟล์ จะวาดภาพสำรอง (เงาตัวละครพร้อมสีหน้า) ให้อัตโนมัติ */
const characterList = {
  luna:       { name: 'ลูน่า',  color: '#7fd8ff', hair: '#e9f6ff' },
  protagonist:{ name: 'ตัวเอก', color: '#b9a8ff', hair: '#3b2f7a' },
  ban:{}
};

TL.Characters = (function () {
  'use strict';
  let container = null;
  const nodes = {};        // id -> { el, img }
  let stage = {};          // id -> { expression, position }  (ข้อมูลสถานะ ใช้บันทึกเกม)

  function init(el) { container = el; reset(); }
  function reset() { Object.keys(nodes).forEach(k => nodes[k].el.remove()); Object.keys(nodes).forEach(k => delete nodes[k]); stage = {}; }
  function displayName(id) { return characterList[id] ? characterList[id].name : id; }
  function colorOf(id) { return characterList[id] ? characterList[id].color : '#7fd8ff'; }

  // ภาพสำรอง SVG: เงาตัวละคร + ตา/ปากตามสีหน้า
  function placeholder(id, expression) {
    const c = characterList[id] || { color: '#7fd8ff', hair: '#e9f6ff' };
    const mouths = { normal: 'M130 214 Q150 222 170 214', happy: 'M126 208 Q150 238 174 208', sad: 'M130 224 Q150 208 170 224', surprised: 'M150 210 m-9 0 a9 11 0 1 0 18 0 a9 11 0 1 0 -18 0' };
    const mouth = mouths[expression] || mouths.normal;
    const eyes = expression === 'happy' ? '<path d="M118 178 q10 -12 20 0 M162 178 q10 -12 20 0" stroke="#10204a" stroke-width="5" fill="none"/>'
      : '<circle cx="128" cy="178" r="' + (expression === 'surprised' ? 9 : 6) + '" fill="#10204a"/><circle cx="172" cy="178" r="' + (expression === 'surprised' ? 9 : 6) + '" fill="#10204a"/>';
    const svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 600">'
      + '<defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="' + c.color + '"/><stop offset="1" stop-color="#2f6bff"/></linearGradient></defs>'
      + '<path d="M40 600 Q40 330 150 310 Q260 330 260 600 Z" fill="url(#g)" opacity=".92"/>'
      + '<rect x="132" y="262" width="36" height="56" rx="14" fill="#f3dcc9"/>'
      + '<path d="M96 170 Q96 80 150 80 Q204 80 204 170 L204 215 Q150 285 96 215 Z" fill="#f3dcc9"/>'
      + '<path d="M88 190 Q80 70 150 66 Q222 70 212 190 Q196 120 150 118 Q104 120 88 190 Z" fill="' + c.hair + '"/>'
      + eyes + '<path d="' + mouth + '" stroke="#10204a" stroke-width="5" fill="' + (expression === 'surprised' ? '#10204a' : 'none') + '" stroke-linecap="round"/></svg>';
    return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  }

  function setImage(id, expression) {
    const img = nodes[id].img;
    img.onerror = () => { img.onerror = null; img.src = placeholder(id, expression); };
    img.src = 'assets/characters/' + id + '_' + expression + '.png';
    img.alt = displayName(id);
  }

  function show(id, expression, position) {
    const prev = stage[id] || {};
    expression = expression || prev.expression || 'normal';
    position = ['left', 'center', 'right'].includes(position) ? position : (prev.position || 'center');
    // ถ้ามีตัวละครอื่นยืนอยู่ตำแหน่งเดียวกัน ให้เอาออกก่อน (ไม่ให้ซ้อนกัน)
    Object.keys(stage).forEach(o => { if (o !== id && stage[o].position === position) hide(o); });
    if (!nodes[id]) {
      const el = document.createElement('div'); el.className = 'char';
      const img = document.createElement('img'); img.draggable = false; el.appendChild(img);
      container.appendChild(el); nodes[id] = { el, img };
    }
    if (!prev.expression || prev.expression !== expression || !nodes[id].img.src) setImage(id, expression);
    nodes[id].el.className = 'char pos-' + position;
    stage[id] = { expression, position };
  }
  function hide(id) { if (nodes[id]) { nodes[id].el.remove(); delete nodes[id]; } delete stage[id]; }
  function hideAll() { Object.keys(stage).slice().forEach(hide); }
  function highlight(speakerId) {     // ตัวที่กำลังพูดสว่าง ตัวอื่นหม่นลง
    Object.keys(nodes).forEach(k => nodes[k].el.classList.toggle('dim', !!speakerId && k !== speakerId));
  }
  function getState() { return JSON.parse(JSON.stringify(stage)); }
  function restore(saved) {
    reset();
    Object.keys(saved || {}).forEach(id => { if (saved[id]) show(id, saved[id].expression, saved[id].position); });
  }
  return { init, reset, show, hide, hideAll, highlight, getState, restore, displayName, colorOf };
})();
