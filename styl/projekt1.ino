#include <LiquidCrystal.h>            //dodanie do projektu biblioteki do obsługi wyświetlacza LCD
LiquidCrystal lcd(8, 9, 4, 5, 6, 7);  //zdefiniowanie numerów pinów wejściowych wyświetlacza LCD

//--------poniżej stałe konfiguracyjne:----------------------
const int R1=1995;                 //wartość rezystancji dla rezystora R1 (OHM)
const float V0=4.972;              //wartość zmierzonego napięcia zasilania układów scalonych arduino (Volty)
const float wspolczynnik_A=17.652; //współczynnik kierunkowy funkcji liniowej związany z czujnikiem temperatury
const int wspolczynnik_B=1554;     //wyraz wolny  funkcji liniowej związany z czujnikiem temperatury
//-----------------------------------------------------------

//------------zmienne programu-------------------------------  
float V_adc;                    //napięcie odczytane z ADC  
float R_temp;                   //obliczona rezystancja czujnika temperatury  
int adc_0  = 0;                 //odczyt wartości z ADC związany z przyciskami shieldu LCD
int nastawa_temperatury=25;     //zmienna nastawy temperatury (stopnie celcjusza)
float pomiar_temperatury=0;     //aktualna zmierzona temperatura
unsigned long czas_DS=millis(); //zmienna związana z eliminacją problemu drgań styku przycisków
//-----------
int program=0;  //zmienna aktualnie realizowanego programu sterownika
//programy sterownia:
//0 - oczekiwanie na start
//1 - pompowanie wody do zbiornika
//2 - podgrzewanie wody
//3 - wypuszczanie wody
//-----------------------------------------------------------

//----macierze definiujące znaki specjalne dla wyświetlacza LCD---------------
byte stopnie[8] ={B01000,B10100,B01000,B00000,B00000,B00000,B00000,B00000};    //znak stopnie (małe kółeczko)
byte s_z_kreska[8] ={B00010,B00100,B01110,B10000,B01110,B00001,B11110,B00000}; //polski znak: ś
byte l_z_kreska[8] ={B01100,B00100,B00110,B00100,B01100,B00100,B01110,B00000}; //polski znak: ł                    
//----------------------------------------------------------------------------

//początek funkcji inicjalizującej arduino SETUP (wykonuje się tylko raz przy włączaniu arduino)
void setup(){
  
  //--poniżej definicja wejść i wyjść (IO) do arduino------------------------------------
   pinMode(0, OUTPUT);  //wyjście odpowiedzialne za pompę napełniającą wodę do zbiornika
   pinMode(1, OUTPUT);  //wyjście odpowiedzialne za pompę spuszczającą wodę ze zbiornika
   
   pinMode(2, OUTPUT);  //wyjście dla diody syjnalizującej stan MIN wody w zbiorniku
   pinMode(3, OUTPUT);  //wyjście dla diody syjnalizującej stan MAX wody w zbiorniku
   
   pinMode(17, OUTPUT); //wyjście dla diody syjnalizującej włączone podgrzewanie wody w zbiorniku
  
   pinMode(15, INPUT);  //wejście dla czujnika poziomu wody w zbiorniu - stan MIN
   pinMode(16, INPUT);  //wejście dla czujnika poziomu wody w zbiorniu - stan MAX
  //-------------------------------------------------------------------------------------
  
  //--poniżej ustalenie stanów początkowych dla pinów arduino---
  digitalWrite(0, LOW);   //pompa wyłączona
  digitalWrite(1, LOW);   //pompa wyłączona 
  digitalWrite(15, HIGH); //jednocześnie właczenie rezystora PULLUP dla wejścia
  digitalWrite(16, HIGH); //jednocześnie właczenie rezystora PULLUP dla wejścia
  digitalWrite(17, LOW);  //podgrzewanie wyłączone
  digitalWrite(2, HIGH);   //dioda wyłączona
  digitalWrite(3, HIGH);   //dioda wyłączona
  //-----------------------------------------------------------
  
  //-----kreacja znaków specjalnych dla wyświetlacza LCD-------
  lcd.createChar(0, stopnie);    //stopnie
  lcd.createChar(1, s_z_kreska); //ś
  lcd.createChar(2, l_z_kreska); //ł
  //-----------------------------------------------------------
  
  lcd.begin(16, 2);           //rozpoczęcie pracy wyświetlacza LCD
  }
//koniec funkcji inicjalizującej arduino SETUP

// początek pętli głównej programu 
void loop(){
  V_adc=V0*analogRead(4)/1023;                               //obliczenie aktualnego napięcia przyłożonego do pinu A4 (dla czujnika temperatury)
  R_temp=V_adc*R1/(V0-V_adc);                                //obliczenie aktualnej rezystancji czujnika temperatury
  pomiar_temperatury=(R_temp-wspolczynnik_B)/wspolczynnik_A; //obliczenie aktualnej wartości temperatury

//----------poniżej obsługa programów sterownika---------------
// program oczekiwania na start (program startowy):  
  if(program==0){   lcd.setCursor(1,0);                                                //ustawienie kursora wyświetlacza LCD        
                    lcd.print("Wci");lcd.write(byte(1));lcd.print("nij START");        //wydruk tekstu na wyświetlaczu LCD (ze znakiem specjalnym)                 
                 }
// program napełniania wody do zbiornika: 
  if(program==1){   lcd.setCursor(0,0);                                                //ustawienie kursora wyświetlacza LCD               
                    lcd.print("Nape");lcd.write(byte(2));lcd.print("nianie wody");     //wydruk tekstu na wyświetlaczu LCD (ze znakiem specjalnym)  
                    digitalWrite(0, HIGH);                                             //włączanie pompy napełniającej zbiornik
                    if(digitalRead(16)==LOW) {                                         //wejście w warunek jeśli czujnik poziomu MAX załączy się
                                              program=2;                               //zmiana programu na kolejny (grzania)
                                              lcd.clear();                             //wymazanie wszystkich znaków z wyświetlacza LCD
                                              digitalWrite(0, LOW);                    //wyłączenie pompy napełniającej zbiornik
                                              }
                 }   
// program grzania wody:  
  if(program==2){   lcd.setCursor(2,0);                                                //ustawienie kursora wyświetlacza LCD               
                    lcd.print("Grzanie wody");                                         //wydruk tekstu na wyświetlaczu LCD  
                    digitalWrite(17,HIGH);                                             //włączenie diody grzania
                    if(pomiar_temperatury>=nastawa_temperatury){                       // wejście w warunek jeśli mierzona temperatura będzie większa lub równa od nastawionej
                                                                 lcd.clear();          //wymazanie wszystkich znaków z wyświetlacza LCD
                                                                 digitalWrite(17,LOW); //wyłączenie diody grzania
                                                                 program=3;            //zmiana programu na kolejny (spuszczanie wody)
                                                                };
                 }
// program opróżniania wody do zbiornika: 
  if(program==3){   lcd.setCursor(3,0);                                                //ustawienie kursora wyświetlacza LCD               
                    lcd.print("Spust wody");                                           //wydruk tekstu na wyświetlaczu LCD  
                    digitalWrite(1, HIGH);                                             //włączanie pompy opróżniającej zbiornik
                    if(digitalRead(15)==HIGH) {                                        //wejście jeśli czujnik poziomu MIN załączy się
                                               program=0;                              //zmiana programu (program startowy)
                                               lcd.clear();                            //wymazanie wszystkich znaków z wyświetlacza LCD
                                               digitalWrite(1, LOW);                   //wyłączenie pompy opróżniającej zbiornik
                                               }
                 }
//----------koniec obsługi programów sterownika-----------------

//poniżej wyświetlanie temperatury zmierzonej T oraz nastawionej przez użytkownika N
  lcd.setCursor(0,1);                                                   //ustawienie kursora wyświetlacza LCD        
  lcd.print("T=");                                                      //wydruk tekstu na wyświetlaczu LCD  
  if(pomiar_temperatury<10) lcd.print(" ");                             //dodatkowa spacja w tekscie jeśli temperatura <10 (ponieważ wyświetla się jedna cyfra mniej)
  lcd.print(int(pomiar_temperatury));lcd.write(byte(0));lcd.print("C"); //wydruk tekstu (temperatury zmierzonej T) na wyświetlaczu LCD (ze znakiem specjalnym)  

  lcd.setCursor(10,1);                                                  //ustawienie kursora wyświetlacza LCD        
  lcd.print("N=");                                                      //wydruk tekstu na wyświetlaczu LCD  
  if(nastawa_temperatury<10) lcd.print(" ");                            //dodatkowa spacja w tekscie jeśli temperatura <10 (ponieważ wyświetla się jedna cyfra mniej)
  lcd.print(nastawa_temperatury);lcd.write(byte(0));lcd.print("C");     //wydruk tekstu (temperatury nastawionej N) na wyświetlaczu LCD (ze znakiem specjalnym)  

 
//------------obsługa przycisków z arduino LCD shield: -----------------------------------
    adc_0 = analogRead(0);                                              //odczyt ADC z wejścia przycisków A0
    
    //przycisk "RIGHT"
    if (adc_0 < 50   && program==0)  {                                  //wejście w warunek jeśli ADC jest mniejsze od 50 oraz aktualny program to program startowy
                                       lcd.clear();                     //wymazanie wszystkich znaków z wyświetlacza LCD
                                       program=1;                       //zmiana programu na kolejny (napełnianie wody do zbiornika)
                                      } 
    //przycisk "UP"                                  
    if (adc_0 >= 50  && adc_0 < 250 && millis()-czas_DS>200 && nastawa_temperatury<99)  {                        //wejście w warunek jeśli ADC jest w przedziale <50,250) oraz przycisk został naciśnięty w czasie
                                                                                                                 //nie krótszym niż 200ms oraz jeśli nastawa temperatury jest mniejsza od wartości 99
                                                                                         czas_DS=millis();       //rozpoczęcie odliczania czasu
                                                                                         nastawa_temperatury++;  //dodatnie jedności do aktualnej wartości nastawy temperatury
                                                                                         } 
    //przycisk "DOWN"
    if (adc_0 >= 250 && adc_0 < 450 && millis()-czas_DS>200 && nastawa_temperatury>0)  {                         //wejście w warunek jeśli ADC jest w przedziale <250,450) oraz przycisk został naciśnięty w czasie
                                                                                                                 //nie krótszym niż 200ms oraz jeśli nastawa temperatury jest większa od wartości zero
                                                                                        czas_DS=millis();        //rozpoczęcie odliczania czasu
                                                                                        nastawa_temperatury--;   //odjęcie jedności do aktualnej wartości nastawy temperatury
                                                                                        } 
//-------------koniec obsługi przycisków z arduino LCD shield---------------------------------  
    
    
//poniżej obsługa diód LED dla stanów MIN oraz MAX:   
    digitalWrite(2,!digitalRead(15));   //załącz diodę MIN jeśli stan czujnika MIN jest rozłączony (wykrzyknik oznacza odwrócenie stanu logicznego)
    digitalWrite(3,digitalRead(16));    //załącz diodę MAX jeśli stan czujnika MAX jest załączony 
}
//koniec pętli głównej programu 



