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
const czasPodlewania = document.getElementById('czasPodlewania');
const wartosciAdc = { RIGHT: 0, UP: 144, DOWN: 329, LEFT: 504, SELECT: 741, NONE: 1023, 'STOP D2': 'D2' };
const skrotyDni = ['', 'Pon.', 'Wt.', 'Śr.', 'Czw.', 'Pt.', 'Sob.', 'Nd.'];
const dzienAktualny = document.getElementById('dzienAktualny');
const godzinaAktualna = document.getElementById('godzinaAktualna');
const minutaAktualna = document.getElementById('minutaAktualna');
const nazwyProgramow = ['AUTO', 'PODLEWANIE', 'DZ. PODL.', 'GODZ. PODL.', 'CZAS PODL.', 'PROG', 'NAPELNIANIE', 'DZ. AKT.', 'GODZ. AKT.', 'MIN. AKT.'];
const PROGRAM_PODLEWANIE = 1;
const PROGRAM_NAPELNIANIE = 6;
const PIERWSZY_EKRAN_KONFIG = 2;
const OSTATNI_EKRAN_KONFIG = 9;
const stan = {
  program: 0,
  dzienPodlewania: 1,
  godzinaPodlewania: 6,
  czasPodlewania: 15,
  progWilgotnosci: 45,
  dzien: 1,
  godzina: 6,
  minuta: 0,
  minutyPodlewania: 0,
  pompa: false,
  napelnianie: false,
  ostatniPrzycisk: 'NONE',
  ostatniStart: ''
};

function dwa(liczba) { return String(liczba).padStart(2, '0'); }
function dzienSkrot(dzien) { return skrotyDni[Number(dzien)] || `D${dzien}`; }
function lcdLinia(tekst) { return String(tekst).padEnd(16, ' ').slice(0, 16); }
function aktualnyPoziomWody() { return Number(poziomWody.value); }
function czujnikPelny() { return aktualnyPoziomWody() >= 100; }
function czujnikPusty() { return aktualnyPoziomWody() <= 0; }
function opisPlywaka(stanPlywaka) { return stanPlywaka ? 'ZAŁ.' : 'ROZŁ.'; }
function kluczCzasu() { return `D${stan.dzien}-${stan.godzina}-${stan.minuta}`; }
function synchronizujCzasZSuwakow() {
  stan.dzien = Number(dzienAktualny.value);
  stan.godzina = Number(godzinaAktualna.value);
  stan.minuta = Number(minutaAktualna.value);
}
function ustawPoziomWody(wartosc) { poziomWody.value = Math.max(0, Math.min(100, wartosc)); }
function odswiezOpisySuwakow() {
  document.getElementById('opisWilgotnosci').textContent = `${wilgotnosc.value}%`;
  document.getElementById('opisPoziomuWody').textContent = `${poziomWody.value}%`;
  document.getElementById('opisCzasuPodlewania').textContent = `${stan.czasPodlewania} min`;
  document.getElementById('opisDniaAktualnego').textContent = dzienSkrot(dzienAktualny.value);
  document.getElementById('opisGodzinyAktualnej').textContent = dwa(godzinaAktualna.value);
  document.getElementById('opisMinutyAktualnej').textContent = dwa(minutaAktualna.value);
}

function drukuj(wiersz0, wiersz1) {
  lcd.clear();
  lcd.setCursor(0, 0); lcd.print(lcdLinia(wiersz0));
  lcd.setCursor(0, 1); lcd.print(lcdLinia(wiersz1));
}

function wyswietlProgram() {
  const wilg = Number(wilgotnosc.value);
  if (stan.program === 0) drukuj(`AUTO ${dzienSkrot(stan.dzienPodlewania)} G${dwa(stan.godzinaPodlewania)}`, `W${wilg}% T${stan.czasPodlewania}m`);
  if (stan.program === PROGRAM_PODLEWANIE) drukuj('Podlewanie', `${stan.minutyPodlewania}/${stan.czasPodlewania}m STOP D2`);
  if (stan.program === 2) drukuj(`Ustawienia: ${dzienSkrot(stan.dzienPodlewania)}`, `${dwa(stan.godzinaPodlewania)}:00 / ${stan.czasPodlewania}min`);
  if (stan.program === 3) drukuj(`Start ${dzienSkrot(stan.dzienPodlewania)}`, `${dwa(stan.godzinaPodlewania)}:00  UP/DOWN`);
  if (stan.program === 4) drukuj(`Czas ${dzienSkrot(stan.dzienPodlewania)}`, `${stan.czasPodlewania}min UP/DOWN`);
  if (stan.program === 5) drukuj('Prog wilg:', `${stan.progWilgotnosci}%  UP/DOWN`);
  if (stan.program === PROGRAM_NAPELNIANIE) drukuj('Napelnianie', czujnikPelny() ? 'Zbiornik pelny' : 'Przekaznik A2 ON');
  if (stan.program === 7) drukuj('Aktualny dzien:', `${dzienSkrot(stan.dzien)}  UP/DOWN`);
  if (stan.program === 8) drukuj('Aktualna godz:', `${dwa(stan.godzina)}:${dwa(stan.minuta)}`);
  if (stan.program === 9) drukuj('Aktualna min:', `${dwa(stan.godzina)}:${dwa(stan.minuta)}`);
}

function aktualizujStatus() {
  document.getElementById('stanPrzycisku').textContent = stan.ostatniPrzycisk;
  document.getElementById('stanAdc').textContent = wartosciAdc[stan.ostatniPrzycisk];
  document.getElementById('stanProgramu').textContent = nazwyProgramow[stan.program];
  document.getElementById('stanPompy').textContent = stan.pompa ? 'ON' : 'OFF';
  document.getElementById('stanNapelniania').textContent = stan.napelnianie ? 'ON' : 'OFF';
  document.getElementById('stanPelny').textContent = opisPlywaka(czujnikPelny());
  document.getElementById('stanPusty').textContent = opisPlywaka(czujnikPusty());
  document.getElementById('opisPelny').textContent = opisPlywaka(czujnikPelny());
  document.getElementById('opisPusty').textContent = opisPlywaka(czujnikPusty());
  document.querySelector('.plywak-pelny').classList.toggle('alarm', !czujnikPelny());
  document.querySelector('.plywak-pusty').classList.toggle('alarm', czujnikPusty());
  document.getElementById('woda').style.height = `${poziomWody.value}%`;
  document.getElementById('wodaOpis').textContent = `${poziomWody.value}%`;
  document.getElementById('stanCzasu').textContent = `${dzienSkrot(stan.dzien)} ${dwa(stan.godzina)}:${dwa(stan.minuta)}`;
  odswiezOpisySuwakow();
}

function rozpocznijPodlewanie() {
  stan.program = PROGRAM_PODLEWANIE;
  stan.minutyPodlewania = 0;
  stan.ostatniStart = kluczCzasu();
}
function rozpocznijNapelnianie() {
  stan.program = PROGRAM_NAPELNIANIE;
  stan.pompa = false;
  stan.napelnianie = !czujnikPelny();
}

function logikaSterownika() {
  synchronizujCzasZSuwakow();
  stan.czasPodlewania = Number(czasPodlewania.value);
  const wilg = Number(wilgotnosc.value);
  if (stan.program === 0) {
    stan.pompa = false;
    stan.napelnianie = false;
    const harmonogram = stan.dzien === stan.dzienPodlewania && stan.godzina === stan.godzinaPodlewania && stan.minuta === 0;
    if (harmonogram && stan.ostatniStart !== kluczCzasu() && wilg < stan.progWilgotnosci && !czujnikPusty()) rozpocznijPodlewanie();
  }
  if (stan.program === PROGRAM_PODLEWANIE) {
    stan.pompa = true;
    stan.napelnianie = false;
    if (czujnikPusty()) rozpocznijNapelnianie();
  }
  if (stan.program === PROGRAM_NAPELNIANIE) {
    stan.pompa = false;
    stan.napelnianie = !czujnikPelny();
    if (czujnikPelny()) {
      stan.napelnianie = false;
      stan.program = 0;
    }
  }
  wyswietlProgram();
  aktualizujStatus();
}

function krokSymulacji() {
  if (stan.program === PROGRAM_PODLEWANIE) {
    stan.minutyPodlewania += 1;
    ustawPoziomWody(aktualnyPoziomWody() - 4);
    if (stan.minutyPodlewania >= stan.czasPodlewania || czujnikPusty()) rozpocznijNapelnianie();
    logikaSterownika();
  } else if (stan.program === PROGRAM_NAPELNIANIE) {
    ustawPoziomWody(aktualnyPoziomWody() + 8);
    logikaSterownika();
  }
}

function wcisnijPrzycisk(przycisk) {
  stan.ostatniPrzycisk = przycisk;
  document.querySelectorAll('[data-przycisk]').forEach(btn => btn.classList.remove('aktywny'));
  const btn = document.querySelector(`[data-przycisk="${przycisk}"]`);
  if (btn) {
    btn.classList.add('aktywny');
    setTimeout(() => btn.classList.remove('aktywny'), 140);
  }
  if (przycisk === 'SELECT') {
    if (stan.program === 0) stan.program = PIERWSZY_EKRAN_KONFIG;
    else if (stan.program === 2 && stan.dzienPodlewania < 7) stan.dzienPodlewania += 1;
    else stan.program = 0;
  }
  if (przycisk === 'RIGHT' && stan.program >= PIERWSZY_EKRAN_KONFIG && stan.program <= OSTATNI_EKRAN_KONFIG) {
    stan.program += 1;
    if (stan.program > OSTATNI_EKRAN_KONFIG) stan.program = PIERWSZY_EKRAN_KONFIG;
  }
  if (przycisk === 'UP' && stan.program === 2 && stan.dzienPodlewania < 7) stan.dzienPodlewania += 1;
  if (przycisk === 'DOWN' && stan.program === 2 && stan.dzienPodlewania > 1) stan.dzienPodlewania -= 1;
  if (przycisk === 'UP' && stan.program === 3 && stan.godzinaPodlewania < 23) stan.godzinaPodlewania += 1;
  if (przycisk === 'DOWN' && stan.program === 3 && stan.godzinaPodlewania > 0) stan.godzinaPodlewania -= 1;
  if (przycisk === 'UP' && stan.program === 4 && stan.czasPodlewania < 999) czasPodlewania.value = stan.czasPodlewania + 1;
  if (przycisk === 'DOWN' && stan.program === 4 && stan.czasPodlewania > 1) czasPodlewania.value = stan.czasPodlewania - 1;
  if (przycisk === 'UP' && stan.program === 5 && stan.progWilgotnosci < 90) stan.progWilgotnosci += 1;
  if (przycisk === 'DOWN' && stan.program === 5 && stan.progWilgotnosci > 10) stan.progWilgotnosci -= 1;
  if (przycisk === 'UP' && stan.program === 7 && stan.dzien < 7) dzienAktualny.value = stan.dzien + 1;
  if (przycisk === 'DOWN' && stan.program === 7 && stan.dzien > 1) dzienAktualny.value = stan.dzien - 1;
  if (przycisk === 'UP' && stan.program === 8 && stan.godzina < 23) godzinaAktualna.value = stan.godzina + 1;
  if (przycisk === 'DOWN' && stan.program === 8 && stan.godzina > 0) godzinaAktualna.value = stan.godzina - 1;
  if (przycisk === 'UP' && stan.program === 9 && stan.minuta < 59) minutaAktualna.value = stan.minuta + 1;
  if (przycisk === 'DOWN' && stan.program === 9 && stan.minuta > 0) minutaAktualna.value = stan.minuta - 1;
  logikaSterownika();
}

function resetSymulatora() {
  Object.assign(stan, { program: 0, dzienPodlewania: 1, godzinaPodlewania: 6, czasPodlewania: 15, progWilgotnosci: 45, dzien: 1, godzina: 6, minuta: 0, minutyPodlewania: 0, pompa: false, napelnianie: false, ostatniPrzycisk: 'NONE', ostatniStart: '' });
  wilgotnosc.value = 35;
  poziomWody.value = 35;
  czasPodlewania.value = 15;
  dzienAktualny.value = 1;
  godzinaAktualna.value = 6;
  minutaAktualna.value = 0;
  logikaSterownika();
}

document.querySelectorAll('[data-przycisk]').forEach(btn => btn.addEventListener('click', () => wcisnijPrzycisk(btn.dataset.przycisk)));
document.getElementById('reset').addEventListener('click', resetSymulatora);
document.getElementById('stopAwaryjny').addEventListener('click', () => {
  stan.ostatniPrzycisk = 'STOP D2';
  rozpocznijNapelnianie();
  const stop = document.getElementById('stopAwaryjny');
  stop.classList.add('aktywny');
  setTimeout(() => stop.classList.remove('aktywny'), 160);
  logikaSterownika();
});
[wilgotnosc, poziomWody, czasPodlewania, dzienAktualny, godzinaAktualna, minutaAktualna].forEach(suwak => suwak.addEventListener('input', logikaSterownika));
window.addEventListener('keydown', event => {
  const mapaKlawiszy = { ArrowUp: 'UP', ArrowDown: 'DOWN', ArrowLeft: 'LEFT', ArrowRight: 'RIGHT', Enter: 'SELECT' };
  if (event.key in mapaKlawiszy) { event.preventDefault(); wcisnijPrzycisk(mapaKlawiszy[event.key]); }
  if (event.key.toLowerCase() === 'r') resetSymulatora();
});
setInterval(krokSymulacji, 1000);
resetSymulatora();
