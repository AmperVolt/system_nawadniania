#include <Wire.h>
#include <DS3231.h>
#include <LiquidCrystal.h>            //dodanie do projektu biblioteki do obsługi wyświetlacza LCD
DS3231 rtc;
LiquidCrystal lcd(8, 9, 4, 5, 6, 7);  //zdefiniowanie numerów pinów wejściowych wyświetlacza LCD

//--------poniżej stałe konfiguracyjne:----------------------
const int pin_przekaznik_podlewania=A5;   //wyjście odpowiedzialne za przekaźnik pompy podlewania
const int pin_przekaznik_napelniania=A2;  //wyjście odpowiedzialne za drugi przekaźnik - napełnianie wody
const int pin_stop=2;                     //wejście przycisku STOP przerywającego podlewanie
const int pin_poziom_pusty=A1;            //wejście czujnika pływakowego PUSTY (użyte jako cyfrowe)
const int pin_poziom_pelny=A3;            //wejście czujnika pływakowego PEŁNY (użyte jako cyfrowe)
const int pin_wilgotnosc=A4;       //wejście analogowe czujnika wilgotności gleby M335 (0-3V)
const float V0=5.000;              //wartość napięcia odniesienia ADC arduino (Volty)
const char* dni_tygodnia[] = {"", "Pon.", "Wt.", "", "Czw.", "Pt.", "Sob.", "Nd."}; //skróty dni tygodnia
//-----------------------------------------------------------

//------------zmienne programu-------------------------------
int adc_0=0;                       //odczyt wartości z ADC związany z przyciskami shieldu LCD
int adc_wilgotnosc=0;              //odczyt wartości z ADC związany z czujnikiem wilgotności
int pomiar_wilgotnosci=0;          //aktualna wilgotność gleby w procentach
int prog_wilgotnosci=45;           //nastawa progu wilgotności gleby (%)
int czas_podlewania_min=15;        //czas bieżącego podlewania w minutach
int wybrany_ekran=1;               //1-7 dni tygodnia, 8 próg załączenia, 9 dzień i czas RTC
bool tryb_edycji=false;            //SELECT włącza/wyłącza edycję pola
int edytowana_cyfra=-1;            //0..6 cyfry HHMMMMM
int minuta_startu[8]={0,0,0,0,0,0,0,0};
int godzina_podlewania[8]={0,6,6,6,6,6,6,6};
int czas_podlewania_dnia[8]={0,15,15,15,15,15,15,15};
int dzien_podlewania=1;            //aktualnie wybrany dzień ustawień (1-7)
int godzina_podlewania_biezaca=6;  //godzina bieżącego podlewania
int aktualny_dzien=1;              //symulowany aktualny dzień tygodnia (1-7)
int aktualna_godzina=6;            //symulowana aktualna godzina (0-23)
int aktualna_minuta=0;             //symulowana aktualna minuta (0-59)
int ostatni_start_dzien=0;          //zapamiętanie ostatniego uruchomienia z harmonogramu
int ostatni_start_godzina=-1;
int ostatni_start_minuta=-1;
unsigned long czas_DS=millis();    //zmienna związana z eliminacją problemu drgań styku przycisków
unsigned long czas_LCD=millis();   //zmienna związana z odświeżaniem wyświetlacza LCD
unsigned long czas_startu_podlewania=0; //czas rozpoczęcia podlewania
//-----------
int program=0;  //zmienna aktualnie realizowanego programu sterownika
//programy sterownia:
//0 - kontrola harmonogramu i oczekiwanie
//1 - podlewanie trawnika
//2 - ustawianie dnia podlewania
//3 - ustawianie godziny podlewania
//4 - ustawianie czasu podlewania
//5 - ustawianie progu wilgotności gleby
//6 - napełnianie zbiornika
//7 - ustawianie aktualnego dnia tygodnia
//8 - ustawianie aktualnej godziny
//9 - ustawianie aktualnej minuty
//-----------------------------------------------------------

//----macierze definiujące znaki specjalne dla wyświetlacza LCD---------------
byte procent[8] ={B11001,B11010,B00100,B01000,B10110,B00110,B00000,B00000}; //znak procent
byte s_z_kreska[8] ={B00010,B00100,B01110,B10000,B01110,B00001,B11110,B00000}; //polski znak: ś
byte l_z_kreska[8] ={B01100,B00100,B00110,B00100,B01100,B00100,B01110,B00000}; //polski znak: ł
byte o_z_kreska[8] ={B00010,B00100,B01110,B10001,B10001,B10001,B01110,B00000}; //polski znak: ó
byte a_z_ogonkiem[8] ={B00000,B01110,B00001,B01111,B10001,B01111,B00010,B00001}; //polski znak: ą
byte n_z_kreska[8] ={B00010,B00100,B10110,B11001,B10001,B10001,B10001,B00000}; //polski znak: ń
//----------------------------------------------------------------------------


void drukuj_prog_zalacz(){
  lcd.print("Pr");lcd.write(byte(3));lcd.print("g za");lcd.write(byte(2));lcd.write(byte(4));lcd.print("cz.:");
}

void drukuj_napelnianie(){
  lcd.print("Nape");lcd.write(byte(2));lcd.print("nianie A2 ");
}

void drukuj_aktualny_dzien(){
  lcd.print("Aktualny dzie");lcd.write(byte(5));lcd.print(":");
}

void drukuj_dzien_tygodnia(int dzien){
  if(dzien==3){lcd.write(byte(1));lcd.print("r.");}
  else lcd.print(dni_tygodnia[dzien]);
}

void drukuj_dzien_tygodnia_stale(int dzien){
  drukuj_dzien_tygodnia(dzien);
  if(dzien==2 || dzien==3 || dzien==5 || dzien==7) lcd.print(" ");
}

void drukuj_cyfre(int cyfra, int indeks){
  lcd.print(cyfra);
}

int kolumna_cyfry(int indeks){
  int kolumny[8]={0,1,3,4,8,9,10,11};
  return kolumny[indeks];
}

int kolejna_cyfra(int cyfra, int zmiana, int maksimum){
  if(zmiana>0) return cyfra>=maksimum ? 0 : cyfra+1;
  return cyfra<=0 ? maksimum : cyfra-1;
}

void ustaw_cyfre_czasu(int &godzina, int &minuta, int indeks, int zmiana){
  int cyfry[4]={godzina/10,godzina%10,minuta/10,minuta%10};
  int maksima[4]={2,9,5,9};
  cyfry[indeks]=kolejna_cyfra(cyfry[indeks],zmiana,maksima[indeks]);
  godzina=cyfry[0]*10+cyfry[1];
  minuta=cyfry[2]*10+cyfry[3];
}

void ustaw_cyfre_harmonogramu(int dzien, int indeks, int zmiana){
  if(indeks<=3){ustaw_cyfre_czasu(godzina_podlewania[dzien], minuta_startu[dzien], indeks, zmiana);return;}
  int t=czas_podlewania_dnia[dzien];
  int cyfry[4]={(t/1000)%10,(t/100)%10,(t/10)%10,t%10};
  int maksima[4]={1,9,9,9};
  int indeks_czasu=indeks-4;
  cyfry[indeks_czasu]=kolejna_cyfra(cyfry[indeks_czasu],zmiana,maksima[indeks_czasu]);
  czas_podlewania_dnia[dzien]=cyfry[0]*1000+cyfry[1]*100+cyfry[2]*10+cyfry[3];
}

void waliduj_ustawienia_dnia(int dzien){
  if(godzina_podlewania[dzien]>23) godzina_podlewania[dzien]=23;
  if(minuta_startu[dzien]>59) minuta_startu[dzien]=59;
  if(czas_podlewania_dnia[dzien]>1440) czas_podlewania_dnia[dzien]=1440;
  if(czas_podlewania_dnia[dzien]<1) czas_podlewania_dnia[dzien]=1;
}

void waliduj_prog_wilgotnosci(){
  if(prog_wilgotnosci>99) prog_wilgotnosci=99;
  if(prog_wilgotnosci<0) prog_wilgotnosci=0;
}

int grupa_cyfry(int indeks){
  if(indeks<=1) return 0;
  if(indeks<=3) return 1;
  return 2;
}

void przesun_edytowana_cyfre(int kierunek){
  int poprzednia=edytowana_cyfra;
  int nastepna;
  if(kierunek>0){nastepna=poprzednia>=7 ? 0 : poprzednia+1;}
  else{nastepna=poprzednia<=0 ? 7 : poprzednia-1;}
  if(wybrany_ekran<=7 && grupa_cyfry(poprzednia)!=grupa_cyfry(nastepna)) waliduj_ustawienia_dnia(wybrany_ekran);
  edytowana_cyfra=nastepna;
}

void ustaw_cyfre_progu(int indeks, int zmiana){
  int cyfry[2]={(prog_wilgotnosci/10)%10,prog_wilgotnosci%10};
  cyfry[indeks]=kolejna_cyfra(cyfry[indeks],zmiana,9);
  int prog=cyfry[0]*10+cyfry[1];
  if(prog>99) prog=zmiana>0 ? 0 : 99;
  prog_wilgotnosci=prog;
}

int kolumna_cyfry_progu(int indeks){return indeks;}

void skopiuj_rtc_do_ustawien_czasu(){
  godzina_podlewania[0]=aktualna_godzina;
  minuta_startu[0]=aktualna_minuta;
  czas_podlewania_dnia[0]=1;
}

void skopiuj_ustawienia_czasu_do_rtc(){
  aktualna_godzina=godzina_podlewania[0];
  aktualna_minuta=minuta_startu[0];
}

void ustaw_cyfre_rtc(int indeks, int zmiana){
  if(indeks<=3) ustaw_cyfre_harmonogramu(0, indeks, zmiana);
  if(indeks==4){aktualny_dzien=zmiana>0 ? (aktualny_dzien>=7 ? 1 : aktualny_dzien+1) : (aktualny_dzien<=1 ? 7 : aktualny_dzien-1);}
}

void waliduj_czas_rtc(){
  waliduj_ustawienia_dnia(0);
}

void zatwierdz_czas_rtc(){
  waliduj_czas_rtc();
  skopiuj_ustawienia_czasu_do_rtc();
}
int grupa_cyfry_rtc(int indeks){
  if(indeks<=1) return 0;
  if(indeks<=3) return 1;
  return 2;
}
void przesun_edytowana_cyfre_rtc(int kierunek){
  int poprzednia=edytowana_cyfra;
  int nastepna=edytowana_cyfra+kierunek;
  if(nastepna>4) nastepna=0;
  if(nastepna<0) nastepna=4;
  if(grupa_cyfry_rtc(poprzednia)!=grupa_cyfry_rtc(nastepna)) waliduj_czas_rtc();
  edytowana_cyfra=nastepna;
}

int kolumna_cyfry_rtc(int indeks){
  int kolumny[5]={0,1,3,4,8};
  return kolumny[indeks];
}

void odczytaj_czas_rtc(){
  bool h12=false;
  bool pm=false;
  int dzien=rtc.getDoW();
  if(dzien>=1 && dzien<=7) aktualny_dzien=dzien;
  aktualna_godzina=rtc.getHour(h12, pm);
  aktualna_minuta=rtc.getMinute();
  if(aktualna_godzina>23) aktualna_godzina=23;
  if(aktualna_minuta>59) aktualna_minuta=59;
}

void zapisz_czas_rtc(){
  zatwierdz_czas_rtc();
  rtc.setDoW(aktualny_dzien);
  rtc.setHour(aktualna_godzina);
  rtc.setMinute(aktualna_minuta);
  rtc.setSecond(0);
}

//początek funkcji inicjalizującej arduino SETUP (wykonuje się tylko raz przy włączaniu arduino)
void setup(){
  Wire.begin();
  //--poniżej definicja wejść i wyjść (IO) do arduino------------------------------------
   pinMode(pin_przekaznik_podlewania, OUTPUT);    //wyjście odpowiedzialne za pompę podlewania trawnika
   pinMode(pin_przekaznik_napelniania, OUTPUT);   //wyjście odpowiedzialne za napełnianie zbiornika
   pinMode(pin_stop, INPUT);                      //wejście przycisku STOP
   pinMode(pin_poziom_pusty, INPUT);              //wejście dla czujnika PUSTY
   pinMode(pin_poziom_pelny, INPUT);              //wejście dla czujnika PEŁNY
  //-------------------------------------------------------------------------------------

  //--poniżej ustalenie stanów początkowych dla pinów arduino---
  digitalWrite(pin_przekaznik_podlewania, LOW);   //pompa podlewania wyłączona
  digitalWrite(pin_przekaznik_napelniania, LOW);  //napełnianie wyłączone
  digitalWrite(pin_stop, HIGH);                   //jednocześnie właczenie rezystora PULLUP dla wejścia
  digitalWrite(pin_poziom_pusty, HIGH);           //jednocześnie właczenie rezystora PULLUP dla wejścia
  digitalWrite(pin_poziom_pelny, HIGH);           //jednocześnie właczenie rezystora PULLUP dla wejścia
  //-----------------------------------------------------------

  //-----kreacja znaków specjalnych dla wyświetlacza LCD-------
  lcd.createChar(0, procent);        //procent
  lcd.createChar(1, s_z_kreska);     //ś
  lcd.createChar(2, l_z_kreska);     //ł
  lcd.createChar(3, o_z_kreska);     //ó
  lcd.createChar(4, a_z_ogonkiem);   //ą
  lcd.createChar(5, n_z_kreska);     //ń
  //-----------------------------------------------------------

  lcd.begin(16, 2);           //rozpoczęcie pracy wyświetlacza LCD
  lcd.clear();                //wymazanie wszystkich znaków z wyświetlacza LCD
  odczytaj_czas_rtc();        //start z aktualnym czasem DS3231
  }
//koniec funkcji inicjalizującej arduino SETUP

void pokaz_status(){
  if(millis()-czas_LCD>250){
    czas_LCD=millis();
    lcd.setCursor(0,1);drukuj_dzien_tygodnia_stale(aktualny_dzien);lcd.print(" ");
    if(aktualna_godzina<10) lcd.print("0");lcd.print(aktualna_godzina);lcd.print(":");
    if(aktualna_minuta<10) lcd.print("0");lcd.print(aktualna_minuta);
    lcd.print(" W=");if(pomiar_wilgotnosci<10) lcd.print(" ");lcd.print(pomiar_wilgotnosci);lcd.write(byte(0));lcd.print(" ");
  }
}

// początek pętli głównej programu
void loop(){
  if(!(program==2 && wybrany_ekran==9 && tryb_edycji)) odczytaj_czas_rtc();
  adc_wilgotnosc=analogRead(pin_wilgotnosc);                         //odczyt ADC z czujnika wilgotności gleby
  pomiar_wilgotnosci=map(adc_wilgotnosc,0,614,0,100);                //przeliczenie napięcia 0-3V na procenty wilgotności
  pomiar_wilgotnosci=constrain(pomiar_wilgotnosci,0,100);            //ograniczenie wyniku do zakresu 0-100%

//----------poniżej obsługa programów sterownika---------------
  if(program==0){   digitalWrite(pin_przekaznik_podlewania, LOW);
                    digitalWrite(pin_przekaznik_napelniania, LOW);
                    lcd.setCursor(0,0);lcd.print("AUTO ");drukuj_dzien_tygodnia(dzien_podlewania);lcd.print(" G");
                    if(godzina_podlewania[aktualny_dzien]<10) lcd.print("0");lcd.print(godzina_podlewania[aktualny_dzien]);lcd.print(" T");lcd.print(czas_podlewania_dnia[aktualny_dzien]);lcd.print(" ");
                    if(aktualna_godzina==godzina_podlewania[aktualny_dzien] && aktualna_minuta==minuta_startu[aktualny_dzien] && pomiar_wilgotnosci<prog_wilgotnosci && digitalRead(pin_poziom_pusty)==HIGH && (ostatni_start_dzien!=aktualny_dzien || ostatni_start_godzina!=aktualna_godzina || ostatni_start_minuta!=aktualna_minuta)){
                      lcd.clear();czas_podlewania_min=czas_podlewania_dnia[aktualny_dzien];czas_startu_podlewania=millis();ostatni_start_dzien=aktualny_dzien;ostatni_start_godzina=aktualna_godzina;ostatni_start_minuta=aktualna_minuta;program=1;
                    }
                 }
  if(program==1){   lcd.setCursor(0,0);lcd.print("Podlewanie D2 ");
                    digitalWrite(pin_przekaznik_podlewania, HIGH);
                    digitalWrite(pin_przekaznik_napelniania, LOW);
                    if(digitalRead(pin_stop)==LOW){
                      digitalWrite(pin_przekaznik_podlewania, LOW);lcd.clear();program=0;
                    }
                    else if(digitalRead(pin_poziom_pusty)==LOW || millis()-czas_startu_podlewania>=czas_podlewania_min*60000UL){
                      digitalWrite(pin_przekaznik_podlewania, LOW);lcd.clear();program=6;
                    }
                 }
  if(program==2 && wybrany_ekran<=7){   lcd.setCursor(0,0);lcd.print("Ustawienia: ");drukuj_dzien_tygodnia(wybrany_ekran);lcd.print(" ");
                    int h=godzina_podlewania[wybrany_ekran]; int m=minuta_startu[wybrany_ekran]; int t=czas_podlewania_dnia[wybrany_ekran];
                    int cyfry[8]={h/10,h%10,m/10,m%10,(t/1000)%10,(t/100)%10,(t/10)%10,t%10};
                    lcd.setCursor(0,1);drukuj_cyfre(cyfry[0],0);drukuj_cyfre(cyfry[1],1);lcd.print(":");drukuj_cyfre(cyfry[2],2);drukuj_cyfre(cyfry[3],3);lcd.print(" / ");drukuj_cyfre(cyfry[4],4);drukuj_cyfre(cyfry[5],5);drukuj_cyfre(cyfry[6],6);drukuj_cyfre(cyfry[7],7);lcd.print(" min");
                    if(tryb_edycji){lcd.setCursor(kolumna_cyfry(edytowana_cyfra),1);lcd.blink();}else lcd.noBlink();
                 }
  if(program==2 && wybrany_ekran==8){ lcd.setCursor(0,0);drukuj_prog_zalacz();lcd.print(" ");
                    lcd.setCursor(0,1);if(prog_wilgotnosci<10) lcd.print("0");lcd.print(prog_wilgotnosci);lcd.write(byte(0));lcd.print(" wilg.");if(tryb_edycji){lcd.setCursor(kolumna_cyfry_progu(edytowana_cyfra),1);lcd.blink();}else lcd.noBlink();
                 }
  if(program==2 && wybrany_ekran==9){ lcd.setCursor(0,0);lcd.print("Czas RTC:       ");
                    int godzina_rtc_ekran=tryb_edycji ? godzina_podlewania[0] : aktualna_godzina;
                    int minuta_rtc_ekran=tryb_edycji ? minuta_startu[0] : aktualna_minuta;
                    bool miganie_dnia=tryb_edycji && edytowana_cyfra==4 && ((millis()/500)%2==0);
                    lcd.setCursor(0,1);if(godzina_rtc_ekran<10) lcd.print("0");lcd.print(godzina_rtc_ekran);lcd.print(":");if(minuta_rtc_ekran<10) lcd.print("0");lcd.print(minuta_rtc_ekran);lcd.print(" / ");if(miganie_dnia) lcd.print("    "); else drukuj_dzien_tygodnia_stale(aktualny_dzien);lcd.print("   ");if(tryb_edycji && edytowana_cyfra<4){lcd.setCursor(kolumna_cyfry_rtc(edytowana_cyfra),1);lcd.blink();}else lcd.noBlink();
                  }
  if(program==5){   lcd.setCursor(0,0);lcd.print("Pr");lcd.write(byte(3));lcd.print("g wilg: ");lcd.print(prog_wilgotnosci);lcd.write(byte(0));lcd.print("  "); }
  if(program==6){   digitalWrite(pin_przekaznik_podlewania, LOW);lcd.setCursor(0,0);drukuj_napelnianie();
                    if(digitalRead(pin_stop)==LOW){digitalWrite(pin_przekaznik_napelniania, LOW);lcd.clear();program=0;}
                    else if(digitalRead(pin_poziom_pelny)==HIGH){digitalWrite(pin_przekaznik_napelniania, HIGH);}
                    else{digitalWrite(pin_przekaznik_napelniania, LOW);lcd.clear();program=0;}
                 }
  if(program==7){   lcd.setCursor(0,0);drukuj_aktualny_dzien();drukuj_dzien_tygodnia(aktualny_dzien);lcd.print(" "); }
  if(program==8){   lcd.setCursor(0,0);lcd.print("Aktualna godz:");if(aktualna_godzina<10) lcd.print("0");lcd.print(aktualna_godzina);lcd.print(" "); }
  if(program==9){   lcd.setCursor(0,0);lcd.print("Aktualna min: ");if(aktualna_minuta<10) lcd.print("0");lcd.print(aktualna_minuta);lcd.print(" "); }
//----------koniec obsługi programów sterownika-----------------
  pokaz_status();

//------------obsługa przycisków z arduino LCD shield: -----------------------------------
    adc_0 = analogRead(0);                                              //odczyt ADC z wejścia przycisków A0
    if (adc_0 < 50 && millis()-czas_DS>250)  {czas_DS=millis();lcd.clear();if(program==2 && tryb_edycji && wybrany_ekran<=7){przesun_edytowana_cyfre(1);}else if(program==2 && tryb_edycji && wybrany_ekran==8){edytowana_cyfra++;if(edytowana_cyfra>1) edytowana_cyfra=0;}else if(program==2 && tryb_edycji && wybrany_ekran==9) przesun_edytowana_cyfre_rtc(1);} //RIGHT - następna cyfra
    if (adc_0 >= 450 && adc_0 < 650 && millis()-czas_DS>250)  {czas_DS=millis();lcd.clear();if(program==2 && tryb_edycji && wybrany_ekran<=7){przesun_edytowana_cyfre(-1);}else if(program==2 && tryb_edycji && wybrany_ekran==8){edytowana_cyfra--;if(edytowana_cyfra<0) edytowana_cyfra=1;}else if(program==2 && tryb_edycji && wybrany_ekran==9) przesun_edytowana_cyfre_rtc(-1);} //LEFT - poprzednia cyfra
    if (adc_0 >= 50 && adc_0 < 250 && millis()-czas_DS>200)  {
      czas_DS=millis();
      if(program==2 && !tryb_edycji){wybrany_ekran++;if(wybrany_ekran>9){program=0;wybrany_ekran=1;lcd.noBlink();}}
      else if(program==2 && tryb_edycji && wybrany_ekran<=7) ustaw_cyfre_harmonogramu(wybrany_ekran, edytowana_cyfra, 1);
      else if(program==2 && tryb_edycji && wybrany_ekran==8) ustaw_cyfre_progu(edytowana_cyfra,1);
      else if(program==2 && tryb_edycji && wybrany_ekran==9) ustaw_cyfre_rtc(edytowana_cyfra,1);
      if(program==7 && aktualny_dzien<7) aktualny_dzien++;
      if(program==8 && aktualna_godzina<23) aktualna_godzina++;
      if(program==9 && aktualna_minuta<59) aktualna_minuta++;
    }
    if (adc_0 >= 250 && adc_0 < 450 && millis()-czas_DS>200)  {
      czas_DS=millis();
      if(program==2 && !tryb_edycji){wybrany_ekran--;if(wybrany_ekran<1){program=0;wybrany_ekran=1;lcd.noBlink();}}
      else if(program==2 && tryb_edycji && wybrany_ekran<=7) ustaw_cyfre_harmonogramu(wybrany_ekran, edytowana_cyfra, -1);
      else if(program==2 && tryb_edycji && wybrany_ekran==8) ustaw_cyfre_progu(edytowana_cyfra,-1);
      else if(program==2 && tryb_edycji && wybrany_ekran==9) ustaw_cyfre_rtc(edytowana_cyfra,-1);
      if(program==7 && aktualny_dzien>1) aktualny_dzien--;
      if(program==8 && aktualna_godzina>0) aktualna_godzina--;
      if(program==9 && aktualna_minuta>0) aktualna_minuta--;
    }
    if (adc_0 >= 650 && adc_0 < 850 && millis()-czas_DS>250)  {
      czas_DS=millis();lcd.clear();
      if(program!=2){program=2;wybrany_ekran=1;tryb_edycji=false;edytowana_cyfra=-1;}
      else if(!tryb_edycji){tryb_edycji=true;edytowana_cyfra=0;if(wybrany_ekran==9) skopiuj_rtc_do_ustawien_czasu();}
      else{if(wybrany_ekran<=7) waliduj_ustawienia_dnia(wybrany_ekran); if(wybrany_ekran==8) waliduj_prog_wilgotnosci(); if(wybrany_ekran==9) zapisz_czas_rtc(); tryb_edycji=false;edytowana_cyfra=-1;}
    } //SELECT - edycja / zatwierdzenie
//-------------koniec obsługi przycisków z arduino LCD shield---------------------------------
}
//koniec pętli głównej programu
