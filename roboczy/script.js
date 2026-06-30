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
        this.komorki[wiersz][kolumna].classList.remove('podswietlony');
      }
    }
  }

  podswietl(kolumna, wiersz) {
    if (this.komorki[wiersz] && this.komorki[wiersz][kolumna]) this.komorki[wiersz][kolumna].classList.add('podswietlony');
  }

  podswietlZakres(kolumna, wiersz, dlugosc) {
    for (let i = 0; i < dlugosc; i += 1) this.podswietl(kolumna + i, wiersz);
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
const nazwyProgramow = ['AUTO', 'PODLEWANIE', 'DZ. PODL.', 'GODZ. PODL.', 'CZAS PODL.', 'PRÓG', 'NAPEŁNIANIE', 'DZ. AKT.', 'GODZ. AKT.', 'MIN. AKT.'];
const PROGRAM_PODLEWANIE = 1;
const PROGRAM_NAPELNIANIE = 6;
const PIERWSZY_EKRAN_KONFIG = 2;
const OSTATNI_EKRAN_KONFIG = 9;
const stan = {
  program: 0,
  wybranyEkran: 1,
  trybEdycji: false,
  edytowanePole: 'godzina',
  edytowanaCyfra: -1,
  minutyStartu: [0, 0, 0, 0, 0, 0, 0, 0],
  godzinyPodlewania: [0, 6, 6, 6, 6, 6, 6, 6],
  czasyPodlewania: [0, 15, 15, 15, 15, 15, 15, 15],
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
function godzinaDnia(dzien) { return stan.godzinyPodlewania[Number(dzien)] || 0; }
function minutaDnia(dzien) { return stan.minutyStartu[Number(dzien)] || 0; }
function czasDnia(dzien) { return stan.czasyPodlewania[Number(dzien)] ?? 1; }
function wartoscPola(tekst) { return tekst; }
function cyfryUstawien(dzien) { return `${dwa(godzinaDnia(dzien))}${dwa(minutaDnia(dzien))}${String(czasDnia(dzien)).padStart(4, '0')}`; }
function kolejnaCyfra(cyfra, zmiana, maksimum) {
  if (zmiana > 0) return cyfra >= maksimum ? 0 : cyfra + 1;
  return cyfra <= 0 ? maksimum : cyfra - 1;
}
function ustawCyfreCzasu(godzina, minuta, indeks, zmiana) {
  const cyfry = `${dwa(godzina)}${dwa(minuta)}`.split('').map(Number);
  const maksima = [2, 9, 5, 9];
  cyfry[indeks] = kolejnaCyfra(cyfry[indeks], zmiana, maksima[indeks]);
  return { godzina: Number(`${cyfry[0]}${cyfry[1]}`), minuta: Number(`${cyfry[2]}${cyfry[3]}`) };
}
function ustawCyfreUstawien(dzien, indeks, zmiana) {
  if (indeks <= 3) {
    const czas = ustawCyfreCzasu(godzinaDnia(dzien), minutaDnia(dzien), indeks, zmiana);
    stan.godzinyPodlewania[dzien] = czas.godzina;
    stan.minutyStartu[dzien] = czas.minuta;
    return;
  }
  const cyfry = cyfryUstawien(dzien).split('').map(Number);
  const maksima = [2, 9, 5, 9, 1, 9, 9, 9];
  cyfry[indeks] = kolejnaCyfra(cyfry[indeks], zmiana, maksima[indeks]);
  stan.czasyPodlewania[dzien] = Number(`${cyfry[4]}${cyfry[5]}${cyfry[6]}${cyfry[7]}`);
}
function walidujUstawieniaDnia(dzien) {
  stan.godzinyPodlewania[dzien] = Math.min(23, godzinaDnia(dzien));
  stan.minutyStartu[dzien] = Math.min(59, minutaDnia(dzien));
  stan.czasyPodlewania[dzien] = Math.max(1, Math.min(1440, czasDnia(dzien)));
}
function walidujProgWilgotnosci() {
  stan.progWilgotnosci = Math.max(0, Math.min(99, stan.progWilgotnosci));
}
function grupaCyfry(indeks) {
  if (indeks <= 1) return 'godzina';
  if (indeks <= 3) return 'minuta';
  return 'czas';
}
function przesunEdytowanaCyfre(kierunek) {
  const poprzednia = stan.edytowanaCyfra;
  const nastepna = kierunek > 0 ? (poprzednia >= 7 ? 0 : poprzednia + 1) : (poprzednia <= 0 ? 7 : poprzednia - 1);
  if (stan.wybranyEkran <= 7 && grupaCyfry(poprzednia) !== grupaCyfry(nastepna)) walidujUstawieniaDnia(stan.wybranyEkran);
  stan.edytowanaCyfra = nastepna;
}
function liniaUstawienDnia(dzien) {
  const cyfry = cyfryUstawien(dzien).split('');
  return `${cyfry[0]}${cyfry[1]}:${cyfry[2]}${cyfry[3]} / ${cyfry[4]}${cyfry[5]}${cyfry[6]}${cyfry[7]} min`;
}
function cyfryProgu() { return String(stan.progWilgotnosci).padStart(2, '0'); }
function ustawCyfreProgu(indeks, zmiana) {
  const cyfry = cyfryProgu().split('').map(Number);
  cyfry[indeks] = kolejnaCyfra(cyfry[indeks], zmiana, 9);
  let prog = Number(`${cyfry[0]}${cyfry[1]}`);
  if (prog > 99) prog = zmiana > 0 ? 0 : 99;
  stan.progWilgotnosci = prog;
}
function godzinaRtcNaEkran() { return stan.trybEdycji && stan.wybranyEkran === 9 ? godzinaDnia(0) : stan.godzina; }
function minutaRtcNaEkran() { return stan.trybEdycji && stan.wybranyEkran === 9 ? minutaDnia(0) : stan.minuta; }
function liniaCzasuRtc() { return `${dwa(godzinaRtcNaEkran())}:${dwa(minutaRtcNaEkran())} / ${dzienSkrot(stan.dzien)}`; }
function skopiujRtcDoUstawienCzasu() {
  stan.godzinyPodlewania[0] = stan.godzina;
  stan.minutyStartu[0] = stan.minuta;
  stan.czasyPodlewania[0] = 1;
}
function skopiujUstawieniaCzasuDoRtc() {
  stan.godzina = stan.godzinyPodlewania[0];
  stan.minuta = stan.minutyStartu[0];
  synchronizujSuwakiZCzasem();
}
function ustawCyfreRtc(indeks, zmiana) {
  if (indeks <= 3) ustawCyfreUstawien(0, indeks, zmiana);
  if (indeks === 4) stan.dzien = zmiana > 0 ? (stan.dzien >= 7 ? 1 : stan.dzien + 1) : (stan.dzien <= 1 ? 7 : stan.dzien - 1);
  synchronizujSuwakiZCzasem();
}
function walidujCzasRtc() {
  walidujUstawieniaDnia(0);
}
function zatwierdzCzasRtc() {
  walidujCzasRtc();
  skopiujUstawieniaCzasuDoRtc();
}
function grupaCyfryRtc(indeks) {
  if (indeks <= 1) return 'godzina';
  if (indeks <= 3) return 'minuta';
  return 'dzien';
}
function przesunEdytowanaCyfreRtc(kierunek) {
  const poprzednia = stan.edytowanaCyfra;
  const nastepna = (stan.edytowanaCyfra + kierunek + 5) % 5;
  if (grupaCyfryRtc(poprzednia) !== grupaCyfryRtc(nastepna)) walidujCzasRtc();
  stan.edytowanaCyfra = nastepna;
}
function podswietlEdytowanaCyfre() {
  if (!stan.trybEdycji) return;
  if (stan.wybranyEkran <= 7) lcd.podswietl([0, 1, 3, 4, 8, 9, 10, 11][stan.edytowanaCyfra], 1);
  if (stan.wybranyEkran === 8) lcd.podswietl([0, 1][stan.edytowanaCyfra], 1);
  if (stan.wybranyEkran === 9 && stan.edytowanaCyfra <= 3) lcd.podswietl([0, 1, 3, 4][stan.edytowanaCyfra], 1);
  if (stan.wybranyEkran === 9 && stan.edytowanaCyfra === 4) lcd.podswietlZakres(8, 1, 4);
}
function synchronizujCzasZSuwakow() {
  stan.dzien = Number(dzienAktualny.value);
  stan.godzina = Number(godzinaAktualna.value);
  stan.minuta = Number(minutaAktualna.value);
}
function synchronizujSuwakiZCzasem() {
  dzienAktualny.value = stan.dzien;
  godzinaAktualna.value = stan.godzina;
  minutaAktualna.value = stan.minuta;
}
function ustawPoziomWody(wartosc) { poziomWody.value = Math.max(0, Math.min(100, wartosc)); }
function odswiezOpisySuwakow() {
  document.getElementById('opisWilgotnosci').textContent = `${wilgotnosc.value}%`;
  document.getElementById('opisPoziomuWody').textContent = `${poziomWody.value}%`;
  if (stan.wybranyEkran <= 7) czasPodlewania.value = czasDnia(stan.wybranyEkran);
  document.getElementById('opisCzasuPodlewania').textContent = `${czasPodlewania.value} min`;
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
  if (stan.program === 0) drukuj(`AUTO ${dzienSkrot(stan.dzien)} G${dwa(godzinaDnia(stan.dzien))}`, `W${wilg}% T${czasDnia(stan.dzien)}m`);
  if (stan.program === PROGRAM_PODLEWANIE) drukuj('Podlewanie', `${stan.minutyPodlewania}/${stan.czasPodlewania}m STOP D2`);
  if (stan.program === 2 && stan.wybranyEkran <= 7) { drukuj(`Ustawienia: ${dzienSkrot(stan.wybranyEkran)}`, liniaUstawienDnia(stan.wybranyEkran)); podswietlEdytowanaCyfre(); }
  if (stan.program === 2 && stan.wybranyEkran === 8) { drukuj('Próg załącz.:', `${cyfryProgu()}% wilg.`); podswietlEdytowanaCyfre(); }
  if (stan.program === 2 && stan.wybranyEkran === 9) { drukuj('Czas RTC:', liniaCzasuRtc()); podswietlEdytowanaCyfre(); }
  if (stan.program === PROGRAM_NAPELNIANIE) drukuj('Napełnianie', czujnikPelny() ? 'Zbiornik pełny' : 'Przekaźnik A2 ON');
  if (stan.program === 7) drukuj('Aktualny dzień:', `${dzienSkrot(stan.dzien)}  UP/DOWN`);
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
  stan.godzinaPodlewania = godzinaDnia(stan.wybranyEkran);
  stan.czasPodlewania = czasDnia(stan.wybranyEkran);
  const wilg = Number(wilgotnosc.value);
  if (stan.program === 0) {
    stan.pompa = false;
    stan.napelnianie = false;
    const harmonogram = stan.godzina === godzinaDnia(stan.dzien) && stan.minuta === minutaDnia(stan.dzien);
    if (harmonogram && stan.ostatniStart !== kluczCzasu() && wilg < stan.progWilgotnosci && !czujnikPusty()) {
      stan.czasPodlewania = czasDnia(stan.dzien);
      rozpocznijPodlewanie();
    }
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


function wcisnijPrzycisk(przycisk) {
  stan.ostatniPrzycisk = przycisk;
  document.querySelectorAll('[data-przycisk]').forEach(btn => btn.classList.remove('aktywny'));
  const btn = document.querySelector(`[data-przycisk="${przycisk}"]`);
  if (btn) {
    btn.classList.add('aktywny');
    setTimeout(() => btn.classList.remove('aktywny'), 140);
  }
  if (przycisk === 'SELECT') {
    if (stan.program !== 2) {
      stan.program = PIERWSZY_EKRAN_KONFIG;
      stan.wybranyEkran = 1;
      stan.trybEdycji = false;
      stan.edytowanaCyfra = -1;
    } else if (!stan.trybEdycji) {
      stan.trybEdycji = true;
      stan.edytowanaCyfra = 0;
      if (stan.wybranyEkran === 9) skopiujRtcDoUstawienCzasu();
    } else {
      if (stan.wybranyEkran <= 7) walidujUstawieniaDnia(stan.wybranyEkran);
      if (stan.wybranyEkran === 8) walidujProgWilgotnosci();
      if (stan.wybranyEkran === 9) zatwierdzCzasRtc();
      stan.trybEdycji = false;
      stan.edytowanaCyfra = -1;
    }
  }
  if (przycisk === 'RIGHT' && stan.program === 2 && stan.trybEdycji && stan.wybranyEkran <= 7) przesunEdytowanaCyfre(1);
  if (przycisk === 'LEFT' && stan.program === 2 && stan.trybEdycji && stan.wybranyEkran <= 7) przesunEdytowanaCyfre(-1);
  if (przycisk === 'RIGHT' && stan.program === 2 && stan.trybEdycji && stan.wybranyEkran === 8) stan.edytowanaCyfra = stan.edytowanaCyfra >= 1 ? 0 : stan.edytowanaCyfra + 1;
  if (przycisk === 'LEFT' && stan.program === 2 && stan.trybEdycji && stan.wybranyEkran === 8) stan.edytowanaCyfra = stan.edytowanaCyfra <= 0 ? 1 : stan.edytowanaCyfra - 1;
  if (przycisk === 'RIGHT' && stan.program === 2 && stan.trybEdycji && stan.wybranyEkran === 9) przesunEdytowanaCyfreRtc(1);
  if (przycisk === 'LEFT' && stan.program === 2 && stan.trybEdycji && stan.wybranyEkran === 9) przesunEdytowanaCyfreRtc(-1);
  if (przycisk === 'UP' && stan.program === 2 && !stan.trybEdycji) {
    if (stan.wybranyEkran >= 9) {
      stan.program = 0;
      stan.wybranyEkran = 1;
    } else stan.wybranyEkran += 1;
  }
  if (przycisk === 'DOWN' && stan.program === 2 && !stan.trybEdycji) {
    if (stan.wybranyEkran <= 1) {
      stan.program = 0;
      stan.wybranyEkran = 1;
    } else stan.wybranyEkran -= 1;
  }
  if (przycisk === 'UP' && stan.program === 2 && stan.trybEdycji && stan.wybranyEkran <= 7) ustawCyfreUstawien(stan.wybranyEkran, stan.edytowanaCyfra, 1);
  if (przycisk === 'DOWN' && stan.program === 2 && stan.trybEdycji && stan.wybranyEkran <= 7) ustawCyfreUstawien(stan.wybranyEkran, stan.edytowanaCyfra, -1);
  if (przycisk === 'UP' && stan.program === 2 && stan.trybEdycji && stan.wybranyEkran === 8) ustawCyfreProgu(stan.edytowanaCyfra, 1);
  if (przycisk === 'DOWN' && stan.program === 2 && stan.trybEdycji && stan.wybranyEkran === 8) ustawCyfreProgu(stan.edytowanaCyfra, -1);
  if (przycisk === 'UP' && stan.program === 2 && stan.trybEdycji && stan.wybranyEkran === 9) ustawCyfreRtc(stan.edytowanaCyfra, 1);
  if (przycisk === 'DOWN' && stan.program === 2 && stan.trybEdycji && stan.wybranyEkran === 9) ustawCyfreRtc(stan.edytowanaCyfra, -1);
  if (przycisk === 'UP' && stan.program === 7 && stan.dzien < 7) dzienAktualny.value = stan.dzien + 1;
  if (przycisk === 'DOWN' && stan.program === 7 && stan.dzien > 1) dzienAktualny.value = stan.dzien - 1;
  if (przycisk === 'UP' && stan.program === 8 && stan.godzina < 23) godzinaAktualna.value = stan.godzina + 1;
  if (przycisk === 'DOWN' && stan.program === 8 && stan.godzina > 0) godzinaAktualna.value = stan.godzina - 1;
  if (przycisk === 'UP' && stan.program === 9 && stan.minuta < 59) minutaAktualna.value = stan.minuta + 1;
  if (przycisk === 'DOWN' && stan.program === 9 && stan.minuta > 0) minutaAktualna.value = stan.minuta - 1;
  logikaSterownika();
}

function resetSymulatora() {
  Object.assign(stan, { program: 0, wybranyEkran: 1, trybEdycji: false, edytowanePole: 'godzina', edytowanaCyfra: -1, minutyStartu: [0, 0, 0, 0, 0, 0, 0, 0], godzinyPodlewania: [0, 6, 6, 6, 6, 6, 6, 6], czasyPodlewania: [0, 15, 15, 15, 15, 15, 15, 15], dzienPodlewania: 1, godzinaPodlewania: 6, czasPodlewania: 15, progWilgotnosci: 45, dzien: 1, godzina: 6, minuta: 0, minutyPodlewania: 0, pompa: false, napelnianie: false, ostatniPrzycisk: 'NONE', ostatniStart: '' });
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
czasPodlewania.addEventListener('input', () => { if (stan.wybranyEkran <= 7) stan.czasyPodlewania[stan.wybranyEkran] = Number(czasPodlewania.value); logikaSterownika(); });
[wilgotnosc, poziomWody, dzienAktualny, godzinaAktualna, minutaAktualna].forEach(suwak => suwak.addEventListener('input', logikaSterownika));
window.addEventListener('keydown', event => {
  const mapaKlawiszy = { ArrowUp: 'UP', ArrowDown: 'DOWN', ArrowLeft: 'LEFT', ArrowRight: 'RIGHT', Enter: 'SELECT' };
  if (event.key in mapaKlawiszy) { event.preventDefault(); wcisnijPrzycisk(mapaKlawiszy[event.key]); }
  if (event.key.toLowerCase() === 'r') resetSymulatora();
});
resetSymulatora();
