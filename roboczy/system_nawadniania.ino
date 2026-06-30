#include <LiquidCrystal.h>            //dodanie do projektu biblioteki do obsługi wyświetlacza LCD
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
int czas_podlewania_min=15;        //nastawa czasu podlewania w minutach
int dzien_podlewania=1;            //nastawa dnia podlewania (1-7)
int godzina_podlewania=6;          //nastawa godziny rozpoczęcia podlewania (0-23)
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
//----------------------------------------------------------------------------


void drukuj_dzien_tygodnia(int dzien){
  if(dzien==3){lcd.write(byte(1));lcd.print("r.");}
  else lcd.print(dni_tygodnia[dzien]);
}

//początek funkcji inicjalizującej arduino SETUP (wykonuje się tylko raz przy włączaniu arduino)
void setup(){
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
  //-----------------------------------------------------------

  lcd.begin(16, 2);           //rozpoczęcie pracy wyświetlacza LCD
  lcd.clear();                //wymazanie wszystkich znaków z wyświetlacza LCD
  }
//koniec funkcji inicjalizującej arduino SETUP

void pokaz_status(){
  if(millis()-czas_LCD>250){
    czas_LCD=millis();
    lcd.setCursor(0,1);drukuj_dzien_tygodnia(aktualny_dzien);lcd.print(" ");
    if(aktualna_godzina<10) lcd.print("0");lcd.print(aktualna_godzina);lcd.print(":");
    if(aktualna_minuta<10) lcd.print("0");lcd.print(aktualna_minuta);
    lcd.print(" W=");if(pomiar_wilgotnosci<10) lcd.print(" ");lcd.print(pomiar_wilgotnosci);lcd.write(byte(0));lcd.print(" ");
  }
}

// początek pętli głównej programu
void loop(){
  adc_wilgotnosc=analogRead(pin_wilgotnosc);                         //odczyt ADC z czujnika wilgotności gleby
  pomiar_wilgotnosci=map(adc_wilgotnosc,0,614,0,100);                //przeliczenie napięcia 0-3V na procenty wilgotności
  pomiar_wilgotnosci=constrain(pomiar_wilgotnosci,0,100);            //ograniczenie wyniku do zakresu 0-100%

//----------poniżej obsługa programów sterownika---------------
  if(program==0){   digitalWrite(pin_przekaznik_podlewania, LOW);
                    digitalWrite(pin_przekaznik_napelniania, LOW);
                    lcd.setCursor(0,0);lcd.print("AUTO ");drukuj_dzien_tygodnia(dzien_podlewania);lcd.print(" G");
                    if(godzina_podlewania<10) lcd.print("0");lcd.print(godzina_podlewania);lcd.print(" T");lcd.print(czas_podlewania_min);lcd.print(" ");
                    if(aktualny_dzien==dzien_podlewania && aktualna_godzina==godzina_podlewania && aktualna_minuta==0 && pomiar_wilgotnosci<prog_wilgotnosci && digitalRead(pin_poziom_pusty)==HIGH && (ostatni_start_dzien!=aktualny_dzien || ostatni_start_godzina!=aktualna_godzina || ostatni_start_minuta!=aktualna_minuta)){
                      lcd.clear();czas_startu_podlewania=millis();ostatni_start_dzien=aktualny_dzien;ostatni_start_godzina=aktualna_godzina;ostatni_start_minuta=aktualna_minuta;program=1;
                    }
                 }
  if(program==1){   lcd.setCursor(0,0);lcd.print("Podlewanie D2 ");
                    digitalWrite(pin_przekaznik_podlewania, HIGH);
                    digitalWrite(pin_przekaznik_napelniania, LOW);
                    if(digitalRead(pin_stop)==LOW || digitalRead(pin_poziom_pusty)==LOW || millis()-czas_startu_podlewania>=czas_podlewania_min*60000UL){
                      digitalWrite(pin_przekaznik_podlewania, LOW);lcd.clear();program=6;
                    }
                 }
  if(program==2){   lcd.setCursor(0,0);lcd.print("Ustawienia: ");drukuj_dzien_tygodnia(dzien_podlewania);lcd.print(" ");
                    lcd.setCursor(0,1);if(godzina_podlewania<10) lcd.print("0");lcd.print(godzina_podlewania);lcd.print(":00 / ");lcd.print(czas_podlewania_min);lcd.print("min");
                 }
  if(program==3){   lcd.setCursor(0,0);lcd.print("Start ");drukuj_dzien_tygodnia(dzien_podlewania);lcd.print(" ");if(godzina_podlewania<10) lcd.print("0");lcd.print(godzina_podlewania);lcd.print(":00 "); }
  if(program==4){   lcd.setCursor(0,0);lcd.print("Czas ");drukuj_dzien_tygodnia(dzien_podlewania);lcd.print(" ");lcd.print(czas_podlewania_min);lcd.print("min "); }
  if(program==5){   lcd.setCursor(0,0);lcd.print("Prog wilg: ");lcd.print(prog_wilgotnosci);lcd.write(byte(0));lcd.print("  "); }
  if(program==6){   digitalWrite(pin_przekaznik_podlewania, LOW);lcd.setCursor(0,0);lcd.print("Napelnianie A2 ");
                    if(digitalRead(pin_poziom_pelny)==HIGH){digitalWrite(pin_przekaznik_napelniania, HIGH);}
                    else{digitalWrite(pin_przekaznik_napelniania, LOW);lcd.clear();program=0;}
                 }
  if(program==7){   lcd.setCursor(0,0);lcd.print("Aktualny dzien:");drukuj_dzien_tygodnia(aktualny_dzien);lcd.print(" "); }
  if(program==8){   lcd.setCursor(0,0);lcd.print("Aktualna godz:");if(aktualna_godzina<10) lcd.print("0");lcd.print(aktualna_godzina);lcd.print(" "); }
  if(program==9){   lcd.setCursor(0,0);lcd.print("Aktualna min: ");if(aktualna_minuta<10) lcd.print("0");lcd.print(aktualna_minuta);lcd.print(" "); }
//----------koniec obsługi programów sterownika-----------------
  pokaz_status();

//------------obsługa przycisków z arduino LCD shield: -----------------------------------
    adc_0 = analogRead(0);                                              //odczyt ADC z wejścia przycisków A0
    if (adc_0 < 50 && millis()-czas_DS>250)  {czas_DS=millis();lcd.clear();if(program>=2 && program<=9){program++;if(program>9) program=2;}} //RIGHT - następna pozycja konfiguracji
    if (adc_0 >= 50 && adc_0 < 250 && millis()-czas_DS>200)  {          //UP - zwiększanie nastaw
      czas_DS=millis();
      if(program==2 && dzien_podlewania<7) dzien_podlewania++;
      if(program==3 && godzina_podlewania<23) godzina_podlewania++;
      if(program==4 && czas_podlewania_min<999) czas_podlewania_min++;
      if(program==5 && prog_wilgotnosci<90) prog_wilgotnosci++;
      if(program==7 && aktualny_dzien<7) aktualny_dzien++;
      if(program==8 && aktualna_godzina<23) aktualna_godzina++;
      if(program==9 && aktualna_minuta<59) aktualna_minuta++;
    }
    if (adc_0 >= 250 && adc_0 < 450 && millis()-czas_DS>200)  {         //DOWN - zmniejszanie nastaw
      czas_DS=millis();
      if(program==2 && dzien_podlewania>1) dzien_podlewania--;
      if(program==3 && godzina_podlewania>0) godzina_podlewania--;
      if(program==4 && czas_podlewania_min>1) czas_podlewania_min--;
      if(program==5 && prog_wilgotnosci>10) prog_wilgotnosci--;
      if(program==7 && aktualny_dzien>1) aktualny_dzien--;
      if(program==8 && aktualna_godzina>0) aktualna_godzina--;
      if(program==9 && aktualna_minuta>0) aktualna_minuta--;
    }
    if (adc_0 >= 650 && adc_0 < 850 && millis()-czas_DS>250)  {czas_DS=millis();lcd.clear();if(program==0) program=2; else if(program==2 && dzien_podlewania<7) dzien_podlewania++; else program=0;} //SELECT - wybór dnia / wejście/wyjście z konfiguracji
//-------------koniec obsługi przycisków z arduino LCD shield---------------------------------
}
//koniec pętli głównej programu
