const FONT = {
  ' ': ['00000','00000','00000','00000','00000','00000','00000'], '?': ['01110','10001','00001','00010','00100','00000','00100'],
  ':': ['00000','01100','01100','00000','01100','01100','00000'], '%': ['11001','11010','00100','01000','10110','00110','00000'],
  '0': ['01110','10001','10011','10101','11001','10001','01110'], '1': ['00100','01100','00100','00100','00100','00100','01110'],
  '2': ['01110','10001','00001','00010','00100','01000','11111'], '3': ['11110','00001','00001','01110','00001','00001','11110'],
  '4': ['00010','00110','01010','10010','11111','00010','00010'], '5': ['11111','10000','11110','00001','00001','10001','01110'],
  '6': ['00110','01000','10000','11110','10001','10001','01110'], '7': ['11111','00001','00010','00100','01000','01000','01000'],
  '8': ['01110','10001','10001','01110','10001','10001','01110'], '9': ['01110','10001','10001','01111','00001','00010','01100'],
  A: ['01110','10001','10001','11111','10001','10001','10001'], B: ['11110','10001','10001','11110','10001','10001','11110'],
  C: ['01110','10001','10000','10000','10000','10001','01110'], D: ['11110','10001','10001','10001','10001','10001','11110'],
  E: ['11111','10000','10000','11110','10000','10000','11111'], F: ['11111','10000','10000','11110','10000','10000','10000'],
  G: ['01110','10001','10000','10111','10001','10001','01111'], H: ['10001','10001','10001','11111','10001','10001','10001'],
  I: ['01110','00100','00100','00100','00100','00100','01110'], J: ['00111','00010','00010','00010','00010','10010','01100'],
  K: ['10001','10010','10100','11000','10100','10010','10001'], L: ['10000','10000','10000','10000','10000','10000','11111'],
  M: ['10001','11011','10101','10101','10001','10001','10001'], N: ['10001','11001','10101','10011','10001','10001','10001'],
  O: ['01110','10001','10001','10001','10001','10001','01110'], P: ['11110','10001','10001','11110','10000','10000','10000'],
  R: ['11110','10001','10001','11110','10100','10010','10001'], S: ['01111','10000','10000','01110','00001','00001','11110'],
  T: ['11111','00100','00100','00100','00100','00100','00100'], U: ['10001','10001','10001','10001','10001','10001','01110'],
  W: ['10001','10001','10001','10101','10101','10101','01010'], Y: ['10001','10001','01010','00100','00100','00100','00100'],
  Z: ['11111','00001','00010','00100','01000','10000','11111']
};

class Oled128x64 {
  constructor(canvasId) {
    this.width = 128; this.height = 64; this.canvas = document.getElementById(canvasId); this.ctx = this.canvas.getContext('2d');
    this.buffer = new Uint8Array(this.width * this.height); this.cursorX = 0; this.cursorY = 0; this.textSize = 1; this.ctx.imageSmoothingEnabled = false;
  }
  index(x, y) { return y * this.width + x; }
  clearDisplay() { this.buffer.fill(0); }
  setCursor(x, y) { this.cursorX = x; this.cursorY = y; }
  setTextSize(size) { this.textSize = Math.max(1, Math.floor(size)); }
  drawPixel(x, y, color = 1) { const xx = Math.round(x); const yy = Math.round(y); if (xx < 0 || xx >= this.width || yy < 0 || yy >= this.height) return; this.buffer[this.index(xx, yy)] = color ? 1 : 0; }
  fillRect(x, y, w, h, color = 1) { for (let yy = y; yy < y + h; yy += 1) for (let xx = x; xx < x + w; xx += 1) this.drawPixel(xx, yy, color); }
  drawLine(x0, y0, x1, y1, color = 1) { let x = Math.round(x0); let y = Math.round(y0); const ex = Math.round(x1); const ey = Math.round(y1); const dx = Math.abs(ex - x); const sx = x < ex ? 1 : -1; const dy = -Math.abs(ey - y); const sy = y < ey ? 1 : -1; let err = dx + dy; while (true) { this.drawPixel(x, y, color); if (x === ex && y === ey) break; const e2 = 2 * err; if (e2 >= dy) { err += dy; x += sx; } if (e2 <= dx) { err += dx; y += sy; } } }
  drawRect(x, y, w, h, color = 1) { this.drawLine(x, y, x + w - 1, y, color); this.drawLine(x, y + h - 1, x + w - 1, y + h - 1, color); this.drawLine(x, y, x, y + h - 1, color); this.drawLine(x + w - 1, y, x + w - 1, y + h - 1, color); }
  drawChar(x, y, char, color = 1) { const pattern = FONT[String(char).toUpperCase()] || FONT['?']; for (let row = 0; row < 7; row += 1) for (let col = 0; col < 5; col += 1) if (pattern[row][col] === '1') this.fillRect(x + col * this.textSize, y + row * this.textSize, this.textSize, this.textSize, color); }
  printText(value, color = 1) { for (const char of String(value).toUpperCase()) { if (char === '\n') { this.cursorX = 0; this.cursorY += 8 * this.textSize; continue; } this.drawChar(this.cursorX, this.cursorY, char, color); this.cursorX += 6 * this.textSize; } }
  display() { const image = this.ctx.createImageData(this.width, this.height); for (let y = 0; y < this.height; y += 1) for (let x = 0; x < this.width; x += 1) { const on = !!this.buffer[this.index(x, y)]; const offset = (y * this.width + x) * 4; image.data[offset] = on ? 142 : 0; image.data[offset + 1] = on ? 232 : 0; image.data[offset + 2] = on ? 255 : 0; image.data[offset + 3] = 255; } this.ctx.putImageData(image, 0, 0); }
}

const oled = new Oled128x64('oled');
const soil = document.getElementById('soil');
const tank = document.getElementById('tank');
const state = { program: 0, daySet: 1, hourSet: 6, soilSet: 45, day: 1, hour: 6, minute: 0, pump: false };

function two(v) { return String(v).padStart(2, '0'); }
function water20() { return Number(tank.value) >= 20; }
function water5() { return Number(tank.value) >= 5; }
function write(x, y, value, size = 1, color = 1) { oled.setTextSize(size); oled.setCursor(x, y); oled.printText(value, color); }
function bar(x, y, w, h, value) { oled.drawRect(x, y, w, h); oled.fillRect(x + 2, y + 2, Math.round((w - 4) * value / 100), h - 4); }

function drawScreen(top, moist, level) {
  oled.clearDisplay(); oled.drawRect(0, 0, 128, 64); write(4, 4, top); oled.drawLine(0, 14, 127, 14);
  write(4, 20, `D${state.day} ${two(state.hour)}:${two(state.minute)} W${moist}%`);
  write(4, 34, `ZB${level}% P${state.soilSet}%`); write(86, 48, state.pump ? 'POMPA' : 'STOP');
  bar(4, 50, 72, 9, level); oled.display();
}

function render() {
  const moist = Number(soil.value); const level = Number(tank.value);
  if (state.program === 0) { state.pump = false; if (state.day === state.daySet && state.hour === state.hourSet && state.minute === 0 && moist < state.soilSet) state.program = water20() ? 1 : 5; }
  if (state.program === 1) { state.pump = true; if (!water5() || moist >= state.soilSet + 5) { state.pump = false; state.program = 0; } }
  if (state.program === 5) state.pump = false;
  let top = `AUTO D${state.daySet} G${two(state.hourSet)} P${state.soilSet}`;
  if (state.program === 1) top = 'PODLEWANIE'; if (state.program === 2) top = `DZIEN ${state.daySet}`; if (state.program === 3) top = `GODZINA ${two(state.hourSet)}`; if (state.program === 4) top = `PROG ${state.soilSet}%`; if (state.program === 5) top = 'BRAK WODY 20%';
  drawScreen(top, moist, level);
  document.getElementById('pumpState').textContent = state.pump ? 'ON' : 'OFF'; document.getElementById('pumpState').style.color = state.pump ? '#56c271' : '#46b7ff';
  document.getElementById('soilState').textContent = `${moist}%`; document.getElementById('tankState').textContent = `${level}%`; document.getElementById('timeState').textContent = `D${state.day} ${two(state.hour)}:${two(state.minute)}`;
  document.getElementById('water').style.height = `${level}%`; document.getElementById('waterLabel').textContent = `${level}%`;
}

function tickClock() { state.minute += 1; if (state.minute > 59) { state.minute = 0; state.hour += 1; } if (state.hour > 23) { state.hour = 0; state.day += 1; } if (state.day > 7) state.day = 1; if (state.pump) { tank.value = Math.max(0, Number(tank.value) - 1); soil.value = Math.min(100, Number(soil.value) + 2); } render(); }
function press(button, action) { button.classList.add('pressed'); setTimeout(() => button.classList.remove('pressed'), 120); action(); render(); }
document.getElementById('rightBtn').addEventListener('click', e => press(e.currentTarget, () => { state.program += 1; if (state.program > 4) state.program = 0; }));
document.getElementById('upBtn').addEventListener('click', e => press(e.currentTarget, () => { if (state.program === 2 && state.daySet < 7) state.daySet += 1; if (state.program === 3 && state.hourSet < 23) state.hourSet += 1; if (state.program === 4 && state.soilSet < 90) state.soilSet += 1; }));
document.getElementById('downBtn').addEventListener('click', e => press(e.currentTarget, () => { if (state.program === 2 && state.daySet > 1) state.daySet -= 1; if (state.program === 3 && state.hourSet > 0) state.hourSet -= 1; if (state.program === 4 && state.soilSet > 10) state.soilSet -= 1; }));
document.getElementById('stopBtn').addEventListener('click', () => { state.pump = false; state.program = 0; render(); });
document.getElementById('autoBtn').addEventListener('click', () => { state.program = 0; render(); });
document.getElementById('resetBtn').addEventListener('click', () => { Object.assign(state, { program: 0, daySet: 1, hourSet: 6, soilSet: 45, day: 1, hour: 6, minute: 0, pump: false }); soil.value = 35; tank.value = 100; render(); });
soil.addEventListener('input', render); tank.addEventListener('input', render);
document.addEventListener('keydown', e => { if (e.key === 'ArrowRight' || e.key === 'Enter') document.getElementById('rightBtn').click(); if (e.key === 'ArrowUp') document.getElementById('upBtn').click(); if (e.key === 'ArrowDown') document.getElementById('downBtn').click(); if (e.key === 'Escape') document.getElementById('stopBtn').click(); });
setInterval(tickClock, 1000); render();
