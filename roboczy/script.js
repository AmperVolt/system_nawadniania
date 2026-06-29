const canvas = document.getElementById('lcd');
const ctx = canvas.getContext('2d');
const soil = document.getElementById('soil');
const tank = document.getElementById('tank');
const state = { program: 0, daySet: 1, hourSet: 6, soilSet: 45, day: 1, hour: 6, minute: 0, pump: false };

function two(v) { return String(v).padStart(2, '0'); }
function line(value) { return String(value).padEnd(16, ' ').slice(0, 16); }
function water20() { return Number(tank.value) >= 20; }
function water5() { return Number(tank.value) >= 5; }

function drawLcd(a, b) {
  ctx.fillStyle = '#b8d66b'; ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = 'rgba(23,34,10,.12)';
  for (let x = 10; x < canvas.width; x += 19) for (let y = 14; y < canvas.height; y += 28) ctx.fillRect(x, y, 13, 19);
  ctx.fillStyle = '#17220a'; ctx.font = '700 30px monospace'; ctx.textBaseline = 'top';
  ctx.fillText(line(a), 12, 12); ctx.fillText(line(b), 12, 50);
}

function render() {
  const moist = Number(soil.value); const level = Number(tank.value);
  if (state.program === 0) {
    state.pump = false;
    if (state.day === state.daySet && state.hour === state.hourSet && state.minute === 0 && moist < state.soilSet) state.program = water20() ? 1 : 5;
  }
  if (state.program === 1) {
    state.pump = true;
    if (!water5() || moist >= state.soilSet + 5) { state.pump = false; state.program = 0; }
  }
  if (state.program === 5) state.pump = false;

  let top = `AUTO D${state.daySet} G${two(state.hourSet)} P${state.soilSet}`;
  if (state.program === 1) top = 'Podlewanie STOP';
  if (state.program === 2) top = `Dzien podlew: ${state.daySet}`;
  if (state.program === 3) top = `Godz podlew: ${two(state.hourSet)}`;
  if (state.program === 4) top = `Prog wilg: ${state.soilSet}%`;
  if (state.program === 5) top = 'Brak wody 20%';
  drawLcd(top, `D${state.day} ${two(state.hour)}:${two(state.minute)} W=${String(moist).padStart(2, ' ')}%`);

  document.getElementById('pumpState').textContent = state.pump ? 'ON' : 'OFF';
  document.getElementById('pumpState').style.color = state.pump ? '#56c271' : '#46b7ff';
  document.getElementById('soilState').textContent = `${moist}%`;
  document.getElementById('tankState').textContent = `${level}%`;
  document.getElementById('timeState').textContent = `D${state.day} ${two(state.hour)}:${two(state.minute)}`;
  document.getElementById('water').style.height = `${level}%`;
  document.getElementById('waterLabel').textContent = `${level}%`;
}

function tickClock() {
  state.minute += 1;
  if (state.minute > 59) { state.minute = 0; state.hour += 1; }
  if (state.hour > 23) { state.hour = 0; state.day += 1; }
  if (state.day > 7) state.day = 1;
  if (state.pump) { tank.value = Math.max(0, Number(tank.value) - 1); soil.value = Math.min(100, Number(soil.value) + 2); }
  render();
}

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
