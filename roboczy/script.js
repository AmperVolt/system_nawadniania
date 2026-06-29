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
const poziomWody = document.getElementById('poziomWody');
const wartosciAdc = { RIGHT: 0, UP: 144, DOWN: 329, LEFT: 504, SELECT: 741, NONE: 1023, 'STOP D2': 'D2' };
const dzienAktualny = document.getElementById('dzienAktualny');
const godzinaAktualna = document.getElementById('godzinaAktualna');
const minutaAktualna = document.getElementById('minutaAktualna');
const nazwyProgramow = ['AUTO', 'PODLEWANIE', 'DZ. PODL.', 'GODZ. PODL.', 'PROG', 'BRAK WODY', 'DZ. AKT.', 'GODZ. AKT.', 'MIN. AKT.'];
const stan = { program: 0, dzienPodlewania: 1, godzinaPodlewania: 6, progWilgotnosci: 45, dzien: 1, godzina: 6, minuta: 0, pompa: false, ostatniPrzycisk: 'NONE', stopDoMinuty: -1 };
const PROGRAM_BRAK_WODY = 5;
const PIERWSZY_EKRAN_KONFIG = 2;
const OSTATNI_EKRAN_KONFIG = 8;

function dwa(liczba) { return String(liczba).padStart(2, '0'); }
function lcdLinia(tekst) { return String(tekst).padEnd(16, ' ').slice(0, 16); }
function aktualnyPoziomWody() { return Number(poziomWody.value); }
function poziom20() { return aktualnyPoziomWody() >= 20; }
function poziom5() { return aktualnyPoziomWody() >= 5; }
function synchronizujCzasZSuwakow() {
  stan.dzien = Number(dzienAktualny.value);
  stan.godzina = Number(godzinaAktualna.value);
  stan.minuta = Number(minutaAktualna.value);
}
function odswiezOpisySuwakow() {
  document.getElementById('opisWilgotnosci').textContent = `${wilgotnosc.value}%`;
  document.getElementById('opisPoziomuWody').textContent = `${poziomWody.value}%`;
  document.getElementById('opisDniaAktualnego').textContent = `D${dzienAktualny.value}`;
  document.getElementById('opisGodzinyAktualnej').textContent = dwa(godzinaAktualna.value);
  document.getElementById('opisMinutyAktualnej').textContent = dwa(minutaAktualna.value);
}
function opisPlywaka(stan) { return stan ? 'ZAŁ.' : 'ROZŁ.'; }

function drukuj(wiersz0, wiersz1) {
  lcd.clear();
  lcd.setCursor(0, 0); lcd.print(lcdLinia(wiersz0));
  lcd.setCursor(0, 1); lcd.print(lcdLinia(wiersz1));
}

function wyswietlProgram() {
  const wilg = Number(wilgotnosc.value);
  if (stan.program === 0) drukuj(`AUTO D${stan.dzienPodlewania} G${dwa(stan.godzinaPodlewania)}`, `W${wilg}% 20${opisPlywaka(poziom20()).slice(0, 1)} 5${opisPlywaka(poziom5()).slice(0, 1)}`);
  if (stan.program === 1) drukuj('Podlewanie', `STOP D2  W${wilg}%`);
  if (stan.program === 2) drukuj('Dzien podlew:', `D${stan.dzienPodlewania}  UP/DOWN`);
  if (stan.program === 3) drukuj('Godz podlew:', `${dwa(stan.godzinaPodlewania)}:00 UP/DOWN`);
  if (stan.program === 4) drukuj('Prog wilg:', `${stan.progWilgotnosci}%  UP/DOWN`);
  if (stan.program === 5) drukuj('Brak wody 20%', 'Uzupelnij zbior.');
  if (stan.program === 6) drukuj('Aktualny dzien:', `D${stan.dzien}  UP/DOWN`);
  if (stan.program === 7) drukuj('Aktualna godz:', `${dwa(stan.godzina)}:${dwa(stan.minuta)}`);
  if (stan.program === 8) drukuj('Aktualna min:', `${dwa(stan.godzina)}:${dwa(stan.minuta)}`);
}

function aktualizujStatus() {
  document.getElementById('stanPrzycisku').textContent = stan.ostatniPrzycisk;
  document.getElementById('stanAdc').textContent = wartosciAdc[stan.ostatniPrzycisk];
  document.getElementById('stanProgramu').textContent = nazwyProgramow[stan.program];
  document.getElementById('stanPompy').textContent = stan.pompa ? 'ON' : 'OFF';
  document.getElementById('stanPlywak20').textContent = opisPlywaka(poziom20());
  document.getElementById('stanPlywak5').textContent = opisPlywaka(poziom5());
  document.getElementById('opisPlywak20').textContent = opisPlywaka(poziom20());
  document.getElementById('opisPlywak5').textContent = opisPlywaka(poziom5());
  document.querySelector('.plywak-20').classList.toggle('alarm', !poziom20());
  document.querySelector('.plywak-5').classList.toggle('alarm', !poziom5());
  document.getElementById('woda').style.height = `${poziomWody.value}%`;
  document.getElementById('wodaOpis').textContent = `${poziomWody.value}%`;
  document.getElementById('stanCzasu').textContent = `D${stan.dzien} ${dwa(stan.godzina)}:${dwa(stan.minuta)}`;
  odswiezOpisySuwakow();
}

function logikaSterownika() {
  synchronizujCzasZSuwakow();
  const wilg = Number(wilgotnosc.value);
  if (stan.program === 0) {
    stan.pompa = false;
    if (stan.stopDoMinuty !== stan.minuta && stan.dzien === stan.dzienPodlewania && stan.godzina === stan.godzinaPodlewania && stan.minuta === 0 && wilg < stan.progWilgotnosci) {
      stan.program = poziom20() ? 1 : PROGRAM_BRAK_WODY;
    }
  }
  if (stan.program === 1) {
    stan.pompa = true;
    if (!poziom5() || wilg >= stan.progWilgotnosci + 5) {
      stan.pompa = false;
      stan.program = 0;
    }
  }
  if (stan.program === PROGRAM_BRAK_WODY) {
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
  if (przycisk === 'SELECT') { stan.program = stan.program === 0 ? PIERWSZY_EKRAN_KONFIG : 0; }
  if (przycisk === 'RIGHT' && stan.program >= PIERWSZY_EKRAN_KONFIG && stan.program <= OSTATNI_EKRAN_KONFIG) {
    stan.program += 1;
    if (stan.program > OSTATNI_EKRAN_KONFIG) stan.program = PIERWSZY_EKRAN_KONFIG;
  }
  if (przycisk === 'UP' && stan.program === 2 && stan.dzienPodlewania < 7) stan.dzienPodlewania += 1;
  if (przycisk === 'DOWN' && stan.program === 2 && stan.dzienPodlewania > 1) stan.dzienPodlewania -= 1;
  if (przycisk === 'UP' && stan.program === 3 && stan.godzinaPodlewania < 23) stan.godzinaPodlewania += 1;
  if (przycisk === 'DOWN' && stan.program === 3 && stan.godzinaPodlewania > 0) stan.godzinaPodlewania -= 1;
  if (przycisk === 'UP' && stan.program === 4 && stan.progWilgotnosci < 90) stan.progWilgotnosci += 1;
  if (przycisk === 'DOWN' && stan.program === 4 && stan.progWilgotnosci > 10) stan.progWilgotnosci -= 1;
  if (przycisk === 'UP' && stan.program === 6 && stan.dzien < 7) dzienAktualny.value = stan.dzien + 1;
  if (przycisk === 'DOWN' && stan.program === 6 && stan.dzien > 1) dzienAktualny.value = stan.dzien - 1;
  if (przycisk === 'UP' && stan.program === 7 && stan.godzina < 23) godzinaAktualna.value = stan.godzina + 1;
  if (przycisk === 'DOWN' && stan.program === 7 && stan.godzina > 0) godzinaAktualna.value = stan.godzina - 1;
  if (przycisk === 'UP' && stan.program === 8 && stan.minuta < 59) minutaAktualna.value = stan.minuta + 1;
  if (przycisk === 'DOWN' && stan.program === 8 && stan.minuta > 0) minutaAktualna.value = stan.minuta - 1;
  logikaSterownika();
}

function resetSymulatora() {
  Object.assign(stan, { program: 0, dzienPodlewania: 1, godzinaPodlewania: 6, progWilgotnosci: 45, dzien: 1, godzina: 6, minuta: 0, pompa: false, ostatniPrzycisk: 'NONE', stopDoMinuty: -1 });
  wilgotnosc.value = 35;
  poziomWody.value = 35;
  dzienAktualny.value = 1;
  godzinaAktualna.value = 6;
  minutaAktualna.value = 0;
  logikaSterownika();
}

document.querySelectorAll('[data-przycisk]').forEach(btn => btn.addEventListener('click', () => wcisnijPrzycisk(btn.dataset.przycisk)));
document.getElementById('reset').addEventListener('click', resetSymulatora);
document.getElementById('stopAwaryjny').addEventListener('click', () => {
  stan.ostatniPrzycisk = 'STOP D2';
  stan.pompa = false;
  stan.program = 0;
  stan.stopDoMinuty = stan.minuta;
  const stop = document.getElementById('stopAwaryjny');
  stop.classList.add('aktywny');
  setTimeout(() => stop.classList.remove('aktywny'), 160);
  logikaSterownika();
});
[wilgotnosc, poziomWody, dzienAktualny, godzinaAktualna, minutaAktualna].forEach(suwak => suwak.addEventListener('input', logikaSterownika));
window.addEventListener('keydown', event => {
  const mapaKlawiszy = { ArrowUp: 'UP', ArrowDown: 'DOWN', ArrowLeft: 'LEFT', ArrowRight: 'RIGHT', Enter: 'SELECT' };
  if (event.key in mapaKlawiszy) { event.preventDefault(); wcisnijPrzycisk(mapaKlawiszy[event.key]); }
  if (event.key.toLowerCase() === 'r') resetSymulatora();
});

resetSymulatora();
