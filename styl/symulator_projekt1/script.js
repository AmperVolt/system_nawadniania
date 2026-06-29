class LCD16x2 {
  constructor(id) { this.element = document.getElementById(id); this.kolumny = 16; this.wiersze = 2; this.kursorKolumna = 0; this.kursorWiersz = 0; this.utworzKomorki(); this.clear(); }
  utworzKomorki() { this.element.innerHTML = ''; this.komorki = []; for (let w = 0; w < this.wiersze; w += 1) { const linia = document.createElement('div'); linia.className = 'wiersz'; this.element.appendChild(linia); this.komorki[w] = []; for (let k = 0; k < this.kolumny; k += 1) { const znak = document.createElement('div'); znak.className = 'znak'; znak.textContent = ' '; linia.appendChild(znak); this.komorki[w][k] = znak; } } }
  clear() { this.bufor = Array.from({ length: this.wiersze }, () => Array(this.kolumny).fill(' ')); this.setCursor(0, 0); this.odswiez(); }
  setCursor(kolumna, wiersz) { this.kursorKolumna = Math.max(0, Math.min(this.kolumny - 1, kolumna)); this.kursorWiersz = Math.max(0, Math.min(this.wiersze - 1, wiersz)); }
  print(tekst) { for (const znak of String(tekst)) { if (this.kursorKolumna >= this.kolumny) break; this.bufor[this.kursorWiersz][this.kursorKolumna] = znak; this.kursorKolumna += 1; } this.odswiez(); }
  write(znak) { this.print(String(znak).slice(0, 1)); }
  odswiez() { for (let w = 0; w < this.wiersze; w += 1) for (let k = 0; k < this.kolumny; k += 1) this.komorki[w][k].textContent = this.bufor[w][k]; }
}

const lcd = new LCD16x2('lcd');
const poziom = document.getElementById('poziom');
const temperatura = document.getElementById('temperatura');
const adc = { RIGHT: 0, UP: 144, DOWN: 329, LEFT: 504, SELECT: 741, NONE: 1023 };
const opisy = ['0 - oczekiwanie', '1 - napełnianie', '2 - grzanie', '3 - spust'];
const stan = { program: 0, nastawaTemperatury: 25, ostatniPrzycisk: 'NONE', pompaN: false, pompaS: false, grzanie: false };

function linia(tekst) { return String(tekst).padEnd(16, ' ').slice(0, 16); }
function czujnikMin() { return Number(poziom.value) > 12 ? 'LOW' : 'HIGH'; }
function czujnikMax() { return Number(poziom.value) >= 88 ? 'LOW' : 'HIGH'; }
function drukuj(a, b) { lcd.clear(); lcd.setCursor(0, 0); lcd.print(linia(a)); lcd.setCursor(0, 1); lcd.print(linia(b)); }

function wyswietlLCD() {
  const t = Number(temperatura.value);
  if (stan.program === 0) drukuj('Wcisnij START', `T=${String(t).padStart(2, ' ')}C    N=${stan.nastawaTemperatury}C`);
  if (stan.program === 1) drukuj('Napelnianie wody', `T=${String(t).padStart(2, ' ')}C    N=${stan.nastawaTemperatury}C`);
  if (stan.program === 2) drukuj('  Grzanie wody', `T=${String(t).padStart(2, ' ')}C    N=${stan.nastawaTemperatury}C`);
  if (stan.program === 3) drukuj('   Spust wody', `T=${String(t).padStart(2, ' ')}C    N=${stan.nastawaTemperatury}C`);
}

function logikaProgramu() {
  stan.pompaN = false; stan.pompaS = false; stan.grzanie = false;
  if (stan.program === 1) { stan.pompaN = true; poziom.value = Math.min(100, Number(poziom.value) + 2); if (czujnikMax() === 'LOW') stan.program = 2; }
  if (stan.program === 2) { stan.grzanie = true; temperatura.value = Math.min(99, Number(temperatura.value) + 1); if (Number(temperatura.value) >= stan.nastawaTemperatury) stan.program = 3; }
  if (stan.program === 3) { stan.pompaS = true; poziom.value = Math.max(0, Number(poziom.value) - 2); if (czujnikMin() === 'HIGH') stan.program = 0; }
  wyswietlLCD(); aktualizujPanel();
}

function aktualizujPanel() {
  document.getElementById('programOpis').textContent = opisy[stan.program];
  document.getElementById('adcOpis').textContent = adc[stan.ostatniPrzycisk];
  document.getElementById('pompaNOpis').textContent = stan.pompaN ? 'HIGH' : 'LOW';
  document.getElementById('grzanieOpis').textContent = stan.grzanie ? 'HIGH' : 'LOW';
  document.getElementById('pompaSOpis').textContent = stan.pompaS ? 'HIGH' : 'LOW';
  document.getElementById('minOpis').textContent = czujnikMin();
  document.getElementById('maxOpis').textContent = czujnikMax();
  document.getElementById('woda').style.height = `${poziom.value}%`;
  document.getElementById('wodaOpis').textContent = `${poziom.value}%`;
}

function wcisnij(przycisk) {
  stan.ostatniPrzycisk = przycisk;
  document.querySelectorAll('[data-przycisk]').forEach(btn => btn.classList.remove('aktywny'));
  const btn = document.querySelector(`[data-przycisk="${przycisk}"]`);
  if (btn) { btn.classList.add('aktywny'); setTimeout(() => btn.classList.remove('aktywny'), 140); }
  if (przycisk === 'RIGHT' && stan.program === 0) stan.program = 1;
  if (przycisk === 'UP' && stan.nastawaTemperatury < 99) stan.nastawaTemperatury += 1;
  if (przycisk === 'DOWN' && stan.nastawaTemperatury > 0) stan.nastawaTemperatury -= 1;
  logikaProgramu();
}

function reset() { Object.assign(stan, { program: 0, nastawaTemperatury: 25, ostatniPrzycisk: 'NONE', pompaN: false, pompaS: false, grzanie: false }); poziom.value = 0; temperatura.value = 20; logikaProgramu(); }

document.querySelectorAll('[data-przycisk]').forEach(btn => btn.addEventListener('click', () => wcisnij(btn.dataset.przycisk)));
document.getElementById('reset').addEventListener('click', reset);
poziom.addEventListener('input', logikaProgramu);
temperatura.addEventListener('input', logikaProgramu);
window.addEventListener('keydown', event => { const mapa = { ArrowUp: 'UP', ArrowDown: 'DOWN', ArrowLeft: 'LEFT', ArrowRight: 'RIGHT', Enter: 'SELECT' }; if (event.key in mapa) { event.preventDefault(); wcisnij(mapa[event.key]); } if (event.key.toLowerCase() === 'r') reset(); });
setInterval(logikaProgramu, 700);
reset();
