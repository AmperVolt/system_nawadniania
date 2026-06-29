#include <LiquidCrystal.h>            //dodanie do projektu biblioteki do obsługi wyświetlacza LCD
LiquidCrystal lcd(8, 9, 4, 5, 6, 7);  //zdefiniowanie numerów pinów wejściowych wyświetlacza LCD

//--------poniżej stałe konfiguracyjne:----------------------
const int pin_przekaznik=A2;       //wyjście odpowiedzialne za przekaźnik pompy wody (A4 zajmuje czujnik wilgotności)
const int pin_stop=2;              //wejście przycisku STOP przerywającego podlewanie
const int pin_poziom_5=A1;         //wejście czujnika pływakowego poziomu 5% (użyte jako cyfrowe)
const int pin_poziom_20=A3;        //wejście czujnika pływakowego poziomu 20% (użyte jako cyfrowe)
const int pin_wilgotnosc=A4;       //wejście analogowe czujnika wilgotności gleby M335 (0-3V)
const float V0=5.000;              //wartość napięcia odniesienia ADC arduino (Volty)
const int prog_wody_start=20;      //stały próg poziomu wody wymagany do startu podlewania (%)
const int prog_wody_stop=5;        //stały próg poziomu wody powodujący awaryjne zatrzymanie (%)
//-----------------------------------------------------------

//------------zmienne programu-------------------------------
int adc_0=0;                       //odczyt wartości z ADC związany z przyciskami shieldu LCD
int adc_wilgotnosc=0;              //odczyt wartości z ADC związany z czujnikiem wilgotności
int pomiar_wilgotnosci=0;          //aktualna wilgotność gleby w procentach
int prog_wilgotnosci=45;           //nastawa progu wilgotności gleby (%)
int dzien_podlewania=1;            //nastawa dnia podlewania (1-7)
int godzina_podlewania=6;          //nastawa godziny rozpoczęcia podlewania (0-23)
int aktualny_dzien=1;              //symulowany aktualny dzień tygodnia (1-7)
int aktualna_godzina=6;            //symulowana aktualna godzina (0-23)
int aktualna_minuta=0;             //symulowana aktualna minuta (0-59)
unsigned long czas_DS=millis();    //zmienna związana z eliminacją problemu drgań styku przycisków
unsigned long czas_zegara=millis();//zmienna związana z pracą zegara symulowanego
unsigned long czas_LCD=millis();   //zmienna związana z odświeżaniem wyświetlacza LCD
//-----------
int program=0;  //zmienna aktualnie realizowanego programu sterownika
//programy sterownia:
//0 - kontrola harmonogramu i oczekiwanie
//1 - podlewanie trawnika
//2 - ustawianie dnia podlewania
//3 - ustawianie godziny podlewania
//4 - ustawianie progu wilgotności gleby
//5 - alarm niskiego poziomu wody
//-----------------------------------------------------------

//----macierze definiujące znaki specjalne dla wyświetlacza LCD---------------
byte procent[8] ={B11001,B11010,B00100,B01000,B10110,B00110,B00000,B00000}; //znak procent
byte s_z_kreska[8] ={B00010,B00100,B01110,B10000,B01110,B00001,B11110,B00000}; //polski znak: ś
byte l_z_kreska[8] ={B01100,B00100,B00110,B00100,B01100,B00100,B01110,B00000}; //polski znak: ł
//----------------------------------------------------------------------------

//początek funkcji inicjalizującej arduino SETUP (wykonuje się tylko raz przy włączaniu arduino)
void setup(){
  //--poniżej definicja wejść i wyjść (IO) do arduino------------------------------------
   pinMode(pin_przekaznik, OUTPUT);  //wyjście odpowiedzialne za pompę podlewania trawnika
   pinMode(pin_stop, INPUT);         //wejście przycisku STOP
   pinMode(pin_poziom_5, INPUT);     //wejście dla czujnika poziomu 5% wody w zbiorniku
   pinMode(pin_poziom_20, INPUT);    //wejście dla czujnika poziomu 20% wody w zbiorniku
  //-------------------------------------------------------------------------------------

  //--poniżej ustalenie stanów początkowych dla pinów arduino---
  digitalWrite(pin_przekaznik, LOW); //pompa wyłączona
  digitalWrite(pin_stop, HIGH);      //jednocześnie właczenie rezystora PULLUP dla wejścia
  digitalWrite(pin_poziom_5, HIGH);  //jednocześnie właczenie rezystora PULLUP dla wejścia
  digitalWrite(pin_poziom_20, HIGH); //jednocześnie właczenie rezystora PULLUP dla wejścia
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

void zegar_symulowany(){
  if(millis()-czas_zegara>1000){          //jedna sekunda symulacji oznacza jedną minutę zegara
                             czas_zegara=millis();
                             aktualna_minuta++;
                             if(aktualna_minuta>59){aktualna_minuta=0;aktualna_godzina++;}
                             if(aktualna_godzina>23){aktualna_godzina=0;aktualny_dzien++;}
                             if(aktualny_dzien>7) aktualny_dzien=1;
                            }
}

void pokaz_status(){
  if(millis()-czas_LCD>250){
    czas_LCD=millis();
    lcd.setCursor(0,1);lcd.print("D");lcd.print(aktualny_dzien);lcd.print(" ");
    if(aktualna_godzina<10) lcd.print("0");lcd.print(aktualna_godzina);lcd.print(":");
    if(aktualna_minuta<10) lcd.print("0");lcd.print(aktualna_minuta);
    lcd.print(" W=");if(pomiar_wilgotnosci<10) lcd.print(" ");lcd.print(pomiar_wilgotnosci);lcd.write(byte(0));lcd.print(" ");
  }
}

// początek pętli głównej programu
void loop(){
  zegar_symulowany();
  adc_wilgotnosc=analogRead(pin_wilgotnosc);                         //odczyt ADC z czujnika wilgotności gleby
  pomiar_wilgotnosci=map(adc_wilgotnosc,0,614,0,100);                //przeliczenie napięcia 0-3V na procenty wilgotności
  pomiar_wilgotnosci=constrain(pomiar_wilgotnosci,0,100);            //ograniczenie wyniku do zakresu 0-100%

//----------poniżej obsługa programów sterownika---------------
  if(program==0){   digitalWrite(pin_przekaznik, LOW);               //pompa wyłączona
                    lcd.setCursor(0,0);lcd.print("AUTO D");lcd.print(dzien_podlewania);lcd.print(" G");
                    if(godzina_podlewania<10) lcd.print("0");lcd.print(godzina_podlewania);lcd.print(" P");lcd.print(prog_wilgotnosci);lcd.print(" ");
                    if(aktualny_dzien==dzien_podlewania && aktualna_godzina==godzina_podlewania && aktualna_minuta==0 && pomiar_wilgotnosci<prog_wilgotnosci){
                      if(digitalRead(pin_poziom_20)==LOW){lcd.clear();program=1;}else{lcd.clear();program=5;}
                    }
                 }
  if(program==1){   lcd.setCursor(0,0);lcd.print("Podlewanie STOP"); //komunikat pracy systemu
                    digitalWrite(pin_przekaznik, HIGH);              //włączanie pompy podlewania
                    if(digitalRead(pin_stop)==LOW || digitalRead(pin_poziom_5)==HIGH || pomiar_wilgotnosci>=prog_wilgotnosci+5){
                      digitalWrite(pin_przekaznik, LOW);lcd.clear();program=0;
                    }
                 }
  if(program==2){   lcd.setCursor(0,0);lcd.print("Dzien podlew: ");lcd.print(dzien_podlewania);lcd.print(" "); }
  if(program==3){   lcd.setCursor(0,0);lcd.print("Godz podlew: ");if(godzina_podlewania<10) lcd.print("0");lcd.print(godzina_podlewania);lcd.print(" "); }
  if(program==4){   lcd.setCursor(0,0);lcd.print("Prog wilg: ");lcd.print(prog_wilgotnosci);lcd.write(byte(0));lcd.print("  "); }
  if(program==5){   digitalWrite(pin_przekaznik, LOW);lcd.setCursor(0,0);lcd.print("Brak wody 20% ");if(digitalRead(pin_poziom_20)==LOW){lcd.clear();program=0;} }
//----------koniec obsługi programów sterownika-----------------
  pokaz_status();

//------------obsługa przycisków z arduino LCD shield: -----------------------------------
    adc_0 = analogRead(0);                                              //odczyt ADC z wejścia przycisków A0
    if (adc_0 < 50 && millis()-czas_DS>250)  {czas_DS=millis();lcd.clear();program++;if(program>4) program=0;} //RIGHT - następna pozycja menu
    if (adc_0 >= 50 && adc_0 < 250 && millis()-czas_DS>200)  {          //UP - zwiększanie nastaw
      czas_DS=millis();
      if(program==2 && dzien_podlewania<7) dzien_podlewania++;
      if(program==3 && godzina_podlewania<23) godzina_podlewania++;
      if(program==4 && prog_wilgotnosci<90) prog_wilgotnosci++;
    }
    if (adc_0 >= 250 && adc_0 < 450 && millis()-czas_DS>200)  {         //DOWN - zmniejszanie nastaw
      czas_DS=millis();
      if(program==2 && dzien_podlewania>1) dzien_podlewania--;
      if(program==3 && godzina_podlewania>0) godzina_podlewania--;
      if(program==4 && prog_wilgotnosci>10) prog_wilgotnosci--;
    }
    if (adc_0 >= 650 && adc_0 < 850 && millis()-czas_DS>250)  {czas_DS=millis();lcd.clear();program=0;} //SELECT - powrót do AUTO
//-------------koniec obsługi przycisków z arduino LCD shield---------------------------------
}
//koniec pętli głównej programu
