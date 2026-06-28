const Screen = {
  SPLASH: 'splash', MENU: 'menu', MODE1: 'mode1', MODE2: 'mode2',
  SETTINGS: 'settings', DEFAULT_DELAY: 'defaultDelay', BUFFER_SIZE: 'bufferSize'
};

const FONT = {
  ' ': ['00000','00000','00000','00000','00000','00000','00000'],
  '?': ['01110','10001','00001','00010','00100','00000','00100'],
  ',': ['00000','00000','00000','00000','01100','01100','01000'],
  '.': ['00000','00000','00000','00000','00000','01100','01100'],
  ':': ['00000','01100','01100','00000','01100','01100','00000'],
  '-': ['00000','00000','00000','11111','00000','00000','00000'],
  '/': ['00001','00010','00010','00100','01000','01000','10000'],
  '=': ['00000','11111','00000','11111','00000','00000','00000'],
  '>': ['10000','01000','00100','00010','00100','01000','10000'],
  '%': ['11001','11010','00100','01000','10110','00110','00000'],
  '0': ['01110','10001','10011','10101','11001','10001','01110'],
  '1': ['00100','01100','00100','00100','00100','00100','01110'],
  '2': ['01110','10001','00001','00010','00100','01000','11111'],
  '3': ['11110','00001','00001','01110','00001','00001','11110'],
  '4': ['00010','00110','01010','10010','11111','00010','00010'],
  '5': ['11111','10000','11110','00001','00001','10001','01110'],
  '6': ['00110','01000','10000','11110','10001','10001','01110'],
  '7': ['11111','00001','00010','00100','01000','01000','01000'],
  '8': ['01110','10001','10001','01110','10001','10001','01110'],
  '9': ['01110','10001','10001','01111','00001','00010','01100'],
  A: ['01110','10001','10001','11111','10001','10001','10001'],
  B: ['11110','10001','10001','11110','10001','10001','11110'],
  C: ['01110','10001','10000','10000','10000','10001','01110'],
  D: ['11110','10001','10001','10001','10001','10001','11110'],
  E: ['11111','10000','10000','11110','10000','10000','11111'],
  F: ['11111','10000','10000','11110','10000','10000','10000'],
  G: ['01110','10001','10000','10111','10001','10001','01111'],
  H: ['10001','10001','10001','11111','10001','10001','10001'],
  I: ['01110','00100','00100','00100','00100','00100','01110'],
  J: ['00111','00010','00010','00010','00010','10010','01100'],
  K: ['10001','10010','10100','11000','10100','10010','10001'],
  L: ['10000','10000','10000','10000','10000','10000','11111'],
  M: ['10001','11011','10101','10101','10001','10001','10001'],
  N: ['10001','11001','10101','10011','10001','10001','10001'],
  O: ['01110','10001','10001','10001','10001','10001','01110'],
  P: ['11110','10001','10001','11110','10000','10000','10000'],
  Q: ['01110','10001','10001','10001','10101','10010','01101'],
  R: ['11110','10001','10001','11110','10100','10010','10001'],
  S: ['01111','10000','10000','01110','00001','00001','11110'],
  T: ['11111','00100','00100','00100','00100','00100','00100'],
  U: ['10001','10001','10001','10001','10001','10001','01110'],
  V: ['10001','10001','10001','10001','10001','01010','00100'],
  W: ['10001','10001','10001','10101','10101','10101','01010'],
  X: ['10001','10001','01010','00100','01010','10001','10001'],
  Y: ['10001','10001','01010','00100','00100','00100','00100'],
  Z: ['11111','00001','00010','00100','01000','10000','11111']
};

class Oled128x64 {
  constructor(canvasId) {
    this.width = 128;
    this.height = 64;
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas.getContext('2d');
    this.buffer = new Uint8Array(this.width * this.height);
    this.cursorX = 0;
    this.cursorY = 0;
    this.textSize = 1;
    this.inverted = false;
    this.ctx.imageSmoothingEnabled = false;
  }

  index(x, y) { return y * this.width + x; }
  clearDisplay() { this.buffer.fill(0); }
  setCursor(x, y) { this.cursorX = x; this.cursorY = y; }
  setTextSize(size) { this.textSize = Math.max(1, Math.floor(size)); }
  invertDisplay() { this.inverted = !this.inverted; this.display(); }

  drawPixel(x, y, color = 1) {
    const xx = Math.round(x);
    const yy = Math.round(y);
    if (xx < 0 || xx >= this.width || yy < 0 || yy >= this.height) return;
    this.buffer[this.index(xx, yy)] = color ? 1 : 0;
  }

  fillRect(x, y, w, h, color = 1) {
    for (let yy = y; yy < y + h; yy += 1) {
      for (let xx = x; xx < x + w; xx += 1) this.drawPixel(xx, yy, color);
    }
  }

  drawLine(x0, y0, x1, y1, color = 1) {
    let x = Math.round(x0); let y = Math.round(y0);
    const endX = Math.round(x1); const endY = Math.round(y1);
    const dx = Math.abs(endX - x); const sx = x < endX ? 1 : -1;
    const dy = -Math.abs(endY - y); const sy = y < endY ? 1 : -1;
    let err = dx + dy;
    while (true) {
      this.drawPixel(x, y, color);
      if (x === endX && y === endY) break;
      const e2 = 2 * err;
      if (e2 >= dy) { err += dy; x += sx; }
      if (e2 <= dx) { err += dx; y += sy; }
    }
  }

  drawRect(x, y, w, h, color = 1) {
    this.drawLine(x, y, x + w - 1, y, color);
    this.drawLine(x, y + h - 1, x + w - 1, y + h - 1, color);
    this.drawLine(x, y, x, y + h - 1, color);
    this.drawLine(x + w - 1, y, x + w - 1, y + h - 1, color);
  }

  drawChar(x, y, char, color = 1) {
    const pattern = FONT[String(char).toUpperCase()] || FONT['?'];
    for (let row = 0; row < 7; row += 1) {
      for (let col = 0; col < 5; col += 1) {
        if (pattern[row][col] === '1') {
          this.fillRect(x + col * this.textSize, y + row * this.textSize, this.textSize, this.textSize, color);
        }
      }
    }
  }

  printText(value, color = 1) {
    for (const char of String(value).toUpperCase()) {
      if (char === '\n') { this.cursorX = 0; this.cursorY += 8 * this.textSize; continue; }
      this.drawChar(this.cursorX, this.cursorY, char, color);
      this.cursorX += 6 * this.textSize;
      if (this.cursorX > this.width - 6 * this.textSize) { this.cursorX = 0; this.cursorY += 8 * this.textSize; }
    }
  }

  display() {
    const image = this.ctx.createImageData(this.width, this.height);
    for (let y = 0; y < this.height; y += 1) {
      for (let x = 0; x < this.width; x += 1) {
        const on = this.inverted ? !this.buffer[this.index(x, y)] : !!this.buffer[this.index(x, y)];
        const offset = (y * this.width + x) * 4;
        image.data[offset] = on ? 142 : 0;
        image.data[offset + 1] = on ? 232 : 0;
        image.data[offset + 2] = on ? 255 : 0;
        image.data[offset + 3] = 255;
      }
    }
    this.ctx.putImageData(image, 0, 0);
  }
}

const oled = new Oled128x64('oled');
const scopeCanvas = document.getElementById('scope');
const scopeCtx = scopeCanvas.getContext('2d');
const scopeSamples = [];
const maxScopeSamples = 180;
const state = {
  screen: Screen.SPLASH, menuIndex: 0, settingsIndex: 0, rotation180: false,
  delayMode1: 0, delayMode1Actual: 0, delayMode2: 0, defaultDelay: 0,
  defaultDelayEdit: 0, bufferSize: 32, bufferSizeEdit: 32,
  mode1DigitIndex: 0, defaultDelayDigitIndex: 0, cursorVisible: true,
  bufferUsage: 0, overflow: false, inputHigh: false, outputHigh: false, activeDelay: 0
};

function formatDelay3(value) {
  return `${Math.floor(value / 100).toString().padStart(3, '0')},${(value % 100).toString().padStart(2, '0')}`;
}
function formatDelay4(value) {
  return `${Math.floor(value / 100).toString().padStart(4, '0')},${(value % 100).toString().padStart(2, '0')}`;
}
function write(x, y, value, size = 1, color = 1) { oled.setTextSize(size); oled.setCursor(x, y); oled.printText(value, color); }
function fill(x, y, w, h, color = 1) { oled.fillRect(x, y, w, h, color); }
function line(x0, y0, x1, y1, color = 1) { oled.drawLine(x0, y0, x1, y1, color); }

function invertLine(y, label, selected) {
  if (selected) { fill(0, y - 1, 128, 16); write(4, y, label, 2, 0); } else write(4, y, label, 2);
}
function action(x, y, w, label, selected, textX = x + 4) {
  if (selected && state.cursorVisible) { fill(x, y, w, 9); write(textX, y + 1, label, 1, 0); } else write(textX, y + 1, label);
}
function header(title) { write(0, 0, title); line(0, 14, 127, 14); }
function bufferUsage() { write(104, 0, `${(state.overflow ? 100 : state.bufferUsage).toString().padStart(3, ' ')}%`); }
function overflowScreen() { write(0, 22, 'BLAD: BUFOR PELNY'); write(0, 36, 'WYJSCIE D12 OFF'); write(0, 52, 'ENTER 3S = MENU'); }

function render() {
  oled.clearDisplay();
  if (state.rotation180) drawRotated(); else drawCurrentScreen();
  oled.display();
  updateStatus();
}

function drawRotated() {
  const original = oled.buffer;
  oled.buffer = new Uint8Array(oled.width * oled.height);
  drawCurrentScreen();
  const drawn = oled.buffer;
  oled.buffer = original;
  for (let y = 0; y < oled.height; y += 1) {
    for (let x = 0; x < oled.width; x += 1) oled.drawPixel(127 - x, 63 - y, drawn[oled.index(x, y)]);
  }
}

function drawCurrentScreen() {
  if (state.screen === Screen.SPLASH) write(28, 28, 'ARDUINOWO.PL');
  if (state.screen === Screen.MENU) drawMenu();
  if (state.screen === Screen.MODE1) drawMode1();
  if (state.screen === Screen.MODE2) drawMode2();
  if (state.screen === Screen.SETTINGS) drawSettings();
  if (state.screen === Screen.DEFAULT_DELAY) drawDefaultDelay();
  if (state.screen === Screen.BUFFER_SIZE) drawBufferSize();
}
function drawMenu() { write(0, 0, 'WYBIERZ TRYB PRACY'); invertLine(16, 'TRYB 1', state.menuIndex === 0); invertLine(32, 'TRYB 2', state.menuIndex === 1); invertLine(48, 'USTAWIENIA', state.menuIndex === 2); }
function drawMode1() {
  write(0, 0, `AKT ${formatDelay3(state.delayMode1Actual)} MS`); bufferUsage();
  if (state.overflow) return overflowScreen();
  line(0, 14, 127, 14); write(0, 20, 'NASTAWA'); write(28, 31, formatDelay3(state.delayMode1), 2); write(100, 38, 'MS');
  if (state.cursorVisible && state.mode1DigitIndex < 5) { const pos = [0, 1, 2, 4, 5][state.mode1DigitIndex]; fill(28 + pos * 12, 52, 10, 2); }
  action(0, 55, 54, 'NASTAW', state.mode1DigitIndex === 5); action(66, 55, 62, 'ANULUJ', state.mode1DigitIndex === 6, 72);
}
function drawMode2() { write(0, 0, 'OPOZNIENIE'); bufferUsage(); if (state.overflow) return overflowScreen(); line(0, 14, 127, 14); write(20, 26, formatDelay4(state.delayMode2), 2); write(104, 33, 'MS'); write(0, 55, 'ENTER 3S = MENU'); }
function drawSettings() {
  const rows = [`OLED ${state.rotation180 ? '180' : '0'} STOPNI`, `START ${formatDelay3(state.defaultDelay)} MS`, `BUFOR ${state.bufferSize}`, 'WYJSCIE'];
  write(0, 0, 'USTAWIENIA'); rows.forEach((row, index) => write(0, 12 + index * 12, `${state.settingsIndex === index ? '>' : ' '} ${row}`));
}
function drawDefaultDelay() {
  header('DOMYSLNY START'); write(24, 27, formatDelay3(state.defaultDelayEdit), 2); write(96, 34, 'MS');
  if (state.cursorVisible && state.defaultDelayDigitIndex < 5) { const pos = [0, 1, 2, 4, 5][state.defaultDelayDigitIndex]; fill(24 + pos * 12, 48, 10, 2); }
  action(0, 55, 54, 'NASTAW', state.defaultDelayDigitIndex === 5); action(66, 55, 62, 'ANULUJ', state.defaultDelayDigitIndex === 6, 72);
}
function drawBufferSize() { header('ROZMIAR BUFORA'); write(48, 24, String(state.bufferSizeEdit), 2); write(0, 46, 'MAX ROZS. 50 ZDARZEN'); write(0, 56, 'UP/DOWN, ENTER'); }

function pressUp() { if (state.rotation180) return pressDown(true); navigate(-1); }
function pressDown(fromRotation = false) { if (state.rotation180 && !fromRotation) return pressUp(); navigate(1); }
function navigate(direction) {
  if (state.screen === Screen.MENU) state.menuIndex = (state.menuIndex + (direction > 0 ? 1 : 2)) % 3;
  else if (state.screen === Screen.MODE1) adjustMode1(direction < 0 ? 1 : -1);
  else if (state.screen === Screen.MODE2) adjustMode2(direction < 0 ? 1 : -1, 1);
  else if (state.screen === Screen.SETTINGS) state.settingsIndex = (state.settingsIndex + (direction > 0 ? 1 : 3)) % 4;
  else if (state.screen === Screen.DEFAULT_DELAY) adjustDefaultDelay(direction < 0 ? 1 : -1);
  else if (state.screen === Screen.BUFFER_SIZE) state.bufferSizeEdit = Math.max(1, Math.min(50, state.bufferSizeEdit + (direction > 0 ? -1 : 1)));
  render();
}
function pressEnter() {
  if (state.screen === Screen.MENU) { if (state.menuIndex === 0) startMode1(); if (state.menuIndex === 1) startMode2(); if (state.menuIndex === 2) state.screen = Screen.SETTINGS; }
  else if (state.screen === Screen.MODE1) enterMode1(); else if (state.screen === Screen.SETTINGS) enterSettings();
  else if (state.screen === Screen.DEFAULT_DELAY) enterDefaultDelay(); else if (state.screen === Screen.BUFFER_SIZE) { state.bufferSize = state.bufferSizeEdit; state.screen = Screen.SETTINGS; }
  render();
}
function longEnter() { Object.assign(state, { screen: Screen.MENU, menuIndex: 0, overflow: false, bufferUsage: 0, outputHigh: false }); render(); }
function startMode1() { Object.assign(state, { delayMode1: state.defaultDelay, delayMode1Actual: state.defaultDelay, activeDelay: state.defaultDelay, mode1DigitIndex: 0, screen: Screen.MODE1 }); }
function startMode2() { Object.assign(state, { delayMode2: state.defaultDelay, activeDelay: state.defaultDelay, screen: Screen.MODE2 }); }
function adjustDigit(value, digitIndex, direction) { const chars = formatDelay3(value).split(''); const pos = [0, 1, 2, 4, 5][digitIndex]; chars[pos] = String((Number(chars[pos]) + direction + 10) % 10); return Number(chars[0]) * 10000 + Number(chars[1]) * 1000 + Number(chars[2]) * 100 + Number(chars[4]) * 10 + Number(chars[5]); }
function adjustMode1(direction) { if (state.mode1DigitIndex < 5) state.delayMode1 = adjustDigit(state.delayMode1, state.mode1DigitIndex, direction); else state.mode1DigitIndex = state.mode1DigitIndex === 5 ? 6 : 5; }
function enterMode1() { if (state.mode1DigitIndex < 5) state.mode1DigitIndex += 1; else { if (state.mode1DigitIndex === 5) { state.delayMode1Actual = state.delayMode1; state.activeDelay = state.delayMode1Actual; } else state.delayMode1 = state.delayMode1Actual; state.mode1DigitIndex = 0; } }
function adjustMode2(direction, step) { state.delayMode2 = Math.max(0, Math.min(999999, state.delayMode2 + direction * step)); state.activeDelay = state.delayMode2; }
function getMode2Step(holdTime) { if (holdTime > 6000) return 5000; if (holdTime > 4000) return 500; if (holdTime > 2000) return 50; if (holdTime > 1000) return 5; return 1; }
function getMode2RepeatInterval(holdTime) { if (holdTime > 3000) return 60; if (holdTime > 1500) return 100; return 180; }
function repeatMode2FromButton(physicalDirection, holdTime) { const logicalDirection = state.rotation180 ? -physicalDirection : physicalDirection; adjustMode2(logicalDirection, getMode2Step(holdTime)); render(); }
function enterSettings() { if (state.settingsIndex === 0) state.rotation180 = !state.rotation180; if (state.settingsIndex === 1) { state.defaultDelayEdit = state.defaultDelay; state.defaultDelayDigitIndex = 0; state.screen = Screen.DEFAULT_DELAY; } if (state.settingsIndex === 2) { state.bufferSizeEdit = state.bufferSize; state.screen = Screen.BUFFER_SIZE; } if (state.settingsIndex === 3) state.screen = Screen.MENU; }
function adjustDefaultDelay(direction) { if (state.defaultDelayDigitIndex < 5) state.defaultDelayEdit = adjustDigit(state.defaultDelayEdit, state.defaultDelayDigitIndex, direction); else state.defaultDelayDigitIndex = state.defaultDelayDigitIndex === 5 ? 6 : 5; }
function enterDefaultDelay() { if (state.defaultDelayDigitIndex < 5) state.defaultDelayDigitIndex += 1; else { if (state.defaultDelayDigitIndex === 5) state.defaultDelay = state.defaultDelayEdit; state.screen = Screen.SETTINGS; } }
function updateStatus() { document.getElementById('inputState').textContent = state.inputHigh ? 'HIGH' : 'LOW'; document.getElementById('outputState').textContent = state.outputHigh ? 'HIGH' : 'LOW'; document.getElementById('bufferState').textContent = `${state.overflow ? 100 : state.bufferUsage}%`; document.getElementById('activeDelay').textContent = `${formatDelay4(state.activeDelay).replace(/^0/, '')} ms`; }
function flashButton(button) { button.classList.add('pressed'); setTimeout(() => button.classList.remove('pressed'), 120); }
function bindEnterButton() {
  const button = document.getElementById('enterBtn');
  let timer;
  let usedLong = false;
  button.addEventListener('pointerdown', () => {
    button.classList.add('pressed');
    usedLong = false;
    timer = setTimeout(() => { usedLong = true; longEnter(); }, 3000);
  });
  button.addEventListener('pointerup', () => {
    clearTimeout(timer);
    button.classList.remove('pressed');
    if (!usedLong) pressEnter();
  });
  button.addEventListener('pointerleave', () => { clearTimeout(timer); button.classList.remove('pressed'); });
}
function bindRepeatButton(id, physicalDirection, shortPress) {
  const button = document.getElementById(id);
  let holdStart = 0;
  let repeatTimer;
  const stop = () => { clearTimeout(repeatTimer); button.classList.remove('pressed'); };
  const schedule = () => {
    const holdTime = performance.now() - holdStart;
    if (state.screen === Screen.MODE2 && holdTime >= 400) repeatMode2FromButton(physicalDirection, holdTime);
    repeatTimer = setTimeout(schedule, getMode2RepeatInterval(holdTime));
  };
  button.addEventListener('pointerdown', () => {
    holdStart = performance.now();
    button.classList.add('pressed');
    shortPress();
    repeatTimer = setTimeout(schedule, 400);
  });
  button.addEventListener('pointerup', stop);
  button.addEventListener('pointerleave', stop);
}
function addScopeSample() {
  scopeSamples.push({ input: state.inputHigh ? 1 : 0, output: state.outputHigh ? 1 : 0 });
  while (scopeSamples.length > maxScopeSamples) scopeSamples.shift();
}
function drawScopeTrace(samples, yHigh, yLow, color) {
  if (samples.length < 2) return;
  const step = scopeCanvas.width / (maxScopeSamples - 1);
  const startX = scopeCanvas.width - (samples.length - 1) * step;
  scopeCtx.strokeStyle = color;
  scopeCtx.lineWidth = 3;
  scopeCtx.beginPath();
  scopeCtx.moveTo(startX, samples[0] ? yHigh : yLow);
  for (let index = 1; index < samples.length; index += 1) {
    const x = startX + index * step;
    const previousY = samples[index - 1] ? yHigh : yLow;
    const y = samples[index] ? yHigh : yLow;
    scopeCtx.lineTo(x, previousY);
    scopeCtx.lineTo(x, y);
  }
  scopeCtx.lineTo(scopeCanvas.width, samples[samples.length - 1] ? yHigh : yLow);
  scopeCtx.stroke();
}
function drawScope() {
  scopeCtx.fillStyle = '#020409';
  scopeCtx.fillRect(0, 0, scopeCanvas.width, scopeCanvas.height);
  scopeCtx.strokeStyle = 'rgba(70, 183, 255, 0.16)';
  scopeCtx.lineWidth = 1;
  for (let x = 0; x <= scopeCanvas.width; x += 40) { scopeCtx.beginPath(); scopeCtx.moveTo(x, 0); scopeCtx.lineTo(x, scopeCanvas.height); scopeCtx.stroke(); }
  for (let y = 0; y <= scopeCanvas.height; y += 30) { scopeCtx.beginPath(); scopeCtx.moveTo(0, y); scopeCtx.lineTo(scopeCanvas.width, y); scopeCtx.stroke(); }
  scopeCtx.strokeStyle = 'rgba(101, 214, 255, 0.35)';
  scopeCtx.strokeRect(1, 1, scopeCanvas.width - 2, scopeCanvas.height - 2);
  drawScopeTrace(scopeSamples.map((sample) => sample.input), 38, 74, '#65d6ff');
  drawScopeTrace(scopeSamples.map((sample) => sample.output), 114, 150, '#ffcc66');
  scopeCtx.font = '18px monospace';
  scopeCtx.fillStyle = '#65d6ff';
  scopeCtx.fillText('IN D11', 12, 28);
  scopeCtx.fillStyle = '#ffcc66';
  scopeCtx.fillText('OUT D12', 12, 104);
}
function sampleScope() { addScopeSample(); drawScope(); }

bindRepeatButton('upBtn', 1, pressUp);
bindRepeatButton('downBtn', -1, pressDown);
bindEnterButton();
document.addEventListener('keydown', (event) => { if (event.key === 'ArrowUp') pressUp(); if (event.key === 'ArrowDown') pressDown(); if (event.key === 'Enter') pressEnter(); if (event.key === 'Escape') longEnter(); });
document.getElementById('pulseBtn').addEventListener('click', () => { state.inputHigh = !state.inputHigh; const delayedState = state.inputHigh; if (state.screen === Screen.MODE1 || state.screen === Screen.MODE2) { state.bufferUsage = Math.min(100, state.bufferUsage + Math.ceil(100 / state.bufferSize)); setTimeout(() => { state.outputHigh = delayedState; state.bufferUsage = Math.max(0, state.bufferUsage - Math.ceil(100 / state.bufferSize)); render(); sampleScope(); }, Math.min(1200, Math.max(20, state.activeDelay * 2))); } render(); sampleScope(); });
document.getElementById('overflowBtn').addEventListener('click', () => { state.overflow = true; state.outputHigh = false; render(); sampleScope(); });
document.getElementById('resetBtn').addEventListener('click', () => window.location.reload());
setInterval(() => { state.cursorVisible = !state.cursorVisible; render(); }, 400);
setInterval(sampleScope, 20);
setTimeout(() => { state.screen = Screen.MENU; render(); }, 1000);
render();
sampleScope();
