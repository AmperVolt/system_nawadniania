/*
  SYMULATOR LCD KEYPAD SHIELD DLA SYSTEMU NAWADNIANIA
  LCD: RS=8, EN=9, D4=4, D5=5, D6=6, D7=7
  Przyciski: A0 jako dzielnik napięcia
*/
class LCD16x2 {
  constructor(idElementu) {
    this.element = document.getElementById(idElementu);
    this.kolumny = 16;
    this.wiersze = 2;
    this.kursorKolumna = 0;
    this.kursorWiersz = 0;
    this.bufor = [];
    this.utworzKomorki();
    this.clear();
  }

  utworzKomorki() {
    this.element.innerHTML = '';
    this.komorki = [];
    for (let wiersz = 0; wiersz < this.wiersze; wiersz += 1) {
      const linia = document.createElement('div');
      linia.className = 'wiersz';
      this.element.appendChild(linia);
      this.komorki[wiersz] = [];
      for (let kolumna = 0; kolumna < this.kolumny; kolumna += 1) {
        const znak = document.createElement('div');
        znak.className = 'znak';
        znak.textContent = ' ';
        linia.appendChild(znak);
        this.komorki[wiersz][kolumna] = znak;
      }
    }
  }

  clear() {
    this.bufor = Array.from({ length: this.wiersze }, () => Array(this.kolumny).fill(' '));
    this.setCursor(0, 0);
    this.odswiez();
  }

  setCursor(kolumna, wiersz) {
    this.kursorKolumna = Math.max(0, Math.min(this.kolumny - 1, kolumna));
    this.kursorWiersz = Math.max(0, Math.min(this.wiersze - 1, wiersz));
  }

  print(tekst) {
    for (const znak of String(tekst)) {
      if (this.kursorKolumna >= this.kolumny) break;
      this.bufor[this.kursorWiersz][this.kursorKolumna] = znak;
      this.kursorKolumna += 1;
    }
    this.odswiez();
  }

  write(znak) { this.print(String(znak).slice(0, 1)); }

  odswiez() {
    for (let wiersz = 0; wiersz < this.wiersze; wiersz += 1) {
      for (let kolumna = 0; kolumna < this.kolumny; kolumna += 1) {
        this.komorki[wiersz][kolumna].textContent = this.bufor[wiersz][kolumna];
      }
    }
  }
}

const lcd = new LCD16x2('lcd');
const wilgotnosc = document.getElementById('wilgotnosc');
const zbiornik = document.getElementById('zbiornik');
const wartosciAdc = { RIGHT: 0, UP: 144, DOWN: 329, LEFT: 504, SELECT: 741, NONE: 1023 };
const nazwyProgramow = ['AUTO', 'PODLEWANIE', 'DZIEN', 'GODZINA', 'PROG', 'BRAK WODY'];
const stan = { program: 0, dzienPodlewania: 1, godzinaPodlewania: 6, progWilgotnosci: 45, dzien: 1, godzina: 6, minuta: 0, pompa: false, ostatniPrzycisk: 'NONE' };

function dwa(liczba) { return String(liczba).padStart(2, '0'); }
function lcdLinia(tekst) { return String(tekst).padEnd(16, ' ').slice(0, 16); }
function poziom20() { return Number(zbiornik.value) >= 20; }
function poziom5() { return Number(zbiornik.value) >= 5; }

function drukuj(wiersz0, wiersz1) {
  lcd.clear();
  lcd.setCursor(0, 0); lcd.print(lcdLinia(wiersz0));
  lcd.setCursor(0, 1); lcd.print(lcdLinia(wiersz1));
}

function wyswietlProgram() {
  const wilg = Number(wilgotnosc.value);
  const woda = Number(zbiornik.value);
  if (stan.program === 0) drukuj(`AUTO D${stan.dzienPodlewania} G${dwa(stan.godzinaPodlewania)}`, `W${wilg}% Z${woda}% P${stan.progWilgotnosci}`);
  if (stan.program === 1) drukuj('Podlewanie', `STOP/LEFT W${wilg}%`);
  if (stan.program === 2) drukuj('Dzien podlew:', `D${stan.dzienPodlewania}  UP/DOWN`);
  if (stan.program === 3) drukuj('Godz podlew:', `${dwa(stan.godzinaPodlewania)}:00 UP/DOWN`);
  if (stan.program === 4) drukuj('Prog wilg:', `${stan.progWilgotnosci}%  UP/DOWN`);
  if (stan.program === 5) drukuj('Brak wody 20%', 'Uzupelnij zbior.');
}

function aktualizujStatus() {
  document.getElementById('stanPrzycisku').textContent = stan.ostatniPrzycisk;
  document.getElementById('stanAdc').textContent = wartosciAdc[stan.ostatniPrzycisk];
  document.getElementById('stanProgramu').textContent = nazwyProgramow[stan.program];
  document.getElementById('stanPompy').textContent = stan.pompa ? 'ON' : 'OFF';
  document.getElementById('stanCzasu').textContent = `D${stan.dzien} ${dwa(stan.godzina)}:${dwa(stan.minuta)}`;
  document.getElementById('woda').style.height = `${zbiornik.value}%`;
  document.getElementById('wodaOpis').textContent = `${zbiornik.value}%`;
}

function logikaSterownika() {
  const wilg = Number(wilgotnosc.value);
  if (stan.program === 0) {
    stan.pompa = false;
    if (stan.dzien === stan.dzienPodlewania && stan.godzina === stan.godzinaPodlewania && stan.minuta === 0 && wilg < stan.progWilgotnosci) {
      stan.program = poziom20() ? 1 : 5;
    }
  }
  if (stan.program === 1) {
    stan.pompa = true;
    if (!poziom5() || wilg >= stan.progWilgotnosci + 5) {
      stan.pompa = false;
      stan.program = 0;
    }
  }
  if (stan.program === 5) {
    stan.pompa = false;
    if (poziom20()) stan.program = 0;
  }
  wyswietlProgram();
  aktualizujStatus();
}

function wcisnijPrzycisk(przycisk) {
  stan.ostatniPrzycisk = przycisk;
  document.querySelectorAll('[data-przycisk]').forEach(btn => btn.classList.remove('aktywny'));
  const btn = document.querySelector(`[data-przycisk="${przycisk}"]`);
  if (btn) {
    btn.classList.add('aktywny');
    setTimeout(() => btn.classList.remove('aktywny'), 140);
  }
  if (przycisk === 'RIGHT') { stan.program += 1; if (stan.program > 4) stan.program = 0; }
  if (przycisk === 'SELECT') stan.program = 0;
  if (przycisk === 'LEFT' && stan.program === 1) { stan.pompa = false; stan.program = 0; }
  if (przycisk === 'UP' && stan.program === 2 && stan.dzienPodlewania < 7) stan.dzienPodlewania += 1;
  if (przycisk === 'DOWN' && stan.program === 2 && stan.dzienPodlewania > 1) stan.dzienPodlewania -= 1;
  if (przycisk === 'UP' && stan.program === 3 && stan.godzinaPodlewania < 23) stan.godzinaPodlewania += 1;
  if (przycisk === 'DOWN' && stan.program === 3 && stan.godzinaPodlewania > 0) stan.godzinaPodlewania -= 1;
  if (przycisk === 'UP' && stan.program === 4 && stan.progWilgotnosci < 90) stan.progWilgotnosci += 1;
  if (przycisk === 'DOWN' && stan.program === 4 && stan.progWilgotnosci > 10) stan.progWilgotnosci -= 1;
  logikaSterownika();
}

function resetSymulatora() {
  Object.assign(stan, { program: 0, dzienPodlewania: 1, godzinaPodlewania: 6, progWilgotnosci: 45, dzien: 1, godzina: 6, minuta: 0, pompa: false, ostatniPrzycisk: 'NONE' });
  wilgotnosc.value = 35;
  zbiornik.value = 100;
  logikaSterownika();
}

function zegar() {
  stan.minuta += 1;
  if (stan.minuta > 59) { stan.minuta = 0; stan.godzina += 1; }
  if (stan.godzina > 23) { stan.godzina = 0; stan.dzien += 1; }
  if (stan.dzien > 7) stan.dzien = 1;
  if (stan.pompa) {
    zbiornik.value = Math.max(0, Number(zbiornik.value) - 1);
    wilgotnosc.value = Math.min(100, Number(wilgotnosc.value) + 2);
  }
  logikaSterownika();
}

document.querySelectorAll('[data-przycisk]').forEach(btn => btn.addEventListener('click', () => wcisnijPrzycisk(btn.dataset.przycisk)));
document.getElementById('reset').addEventListener('click', resetSymulatora);
wilgotnosc.addEventListener('input', logikaSterownika);
zbiornik.addEventListener('input', logikaSterownika);
window.addEventListener('keydown', event => {
  const mapaKlawiszy = { ArrowUp: 'UP', ArrowDown: 'DOWN', ArrowLeft: 'LEFT', ArrowRight: 'RIGHT', Enter: 'SELECT' };
  if (event.key in mapaKlawiszy) { event.preventDefault(); wcisnijPrzycisk(mapaKlawiszy[event.key]); }
  if (event.key.toLowerCase() === 'r') resetSymulatora();
});

setInterval(zegar, 1000);
resetSymulatora();
