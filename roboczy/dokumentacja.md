# Automatyczny system podlewania trawnika

## Lista elementów
- Arduino Mega 2560.
- Wyświetlacz LCD 16x2 zgodny z biblioteką `LiquidCrystal`.
- Moduł RTC DS3231 obsługiwany przez `Wire.h` i `DS3231.h` (`DS3231 rtc;`).
- Czujnik wilgotności gleby M335 z wyjściem analogowym 0-3 V.
- Dwa pływakowe czujniki poziomu wody: PUSTY oraz PEŁNY.
- Przekaźnik pompy podlewania oraz drugi przekaźnik do napełniania zbiornika wodą.
- Przycisk STOP, przewody i zasilanie dobrane do pomp/przekaźników.

## Schemat połączeń
| Element | Pin Arduino Mega 2560 | Uwagi |
| --- | --- | --- |
| LCD RS, E, D4, D5, D6, D7 | D8, D9, D4, D5, D6, D7 | jak w pliku stylu |
| Przycisk STOP | D2 | wejście z `INPUT` i podciągnięciem `PULLUP` |
| Czujnik poziomu PUSTY | A1 | użyty jako wejście cyfrowe |
| Czujnik poziomu PEŁNY | A3 | użyty jako wejście cyfrowe |
| Czujnik wilgotności M335 | A4 | wejście analogowe 0-3 V |
| Przekaźnik pompy podlewania | A5 | wyjście cyfrowe |
| Przekaźnik napełniania zbiornika | A2 | drugie wyjście cyfrowe do dolewania wody |
| Klawiatura LCD shield | A0 | odczyt przycisków przez dzielnik rezystorowy |
| RTC DS3231 | SDA/SCL (Mega: D20/D21) | zegar czasu rzeczywistego po I2C (`Wire.h`, `DS3231.h`) |

Pin A4 pozostaje wejściem analogowym czujnika wilgotności M335. Przekaźnik napełniania zbiornika jest podłączony do A2, a przekaźnik pompy podlewania do wolnego pinu A5.

## Opis działania
Sterownik pracuje na podstawie harmonogramu tygodniowego: użytkownik przełącza dni skrótami (Pon., Wt., Śr., Czw., Pt., Sob., Nd.), ustawia dla każdego dnia godzinę rozpoczęcia i czas podlewania w minutach (do 1440 min), po niedzieli ustawia próg wilgotności gleby maksymalnie 99%, a w ostatnim oknie ustawia czas RTC w układzie `HH:MM / dzień` zapisywany do DS3231; cyfry `HH:MM` są edytowane tą samą ścieżką co godzina startu podlewania. UP/DOWN przełącza okna ustawień, SELECT rozpoczyna albo zatwierdza edycję, LEFT/RIGHT przesuwa migającą cyfrę, a w edycji UP/DOWN zmienia tę cyfrę. Podlewanie uruchamia się tylko wtedy, gdy aktualny dzień i godzina zgadzają się z harmonogramem, wilgotność gleby jest mniejsza od progu i zbiornik nie jest pusty.

Ekran procesu pokazuje w górnej linii dzień tygodnia, na środku aktualną godzinę i po prawej wilgotność gleby, a w dolnej linii wyśrodkowane `Gotowy`, odliczanie podlewania w formacie `Podlewanie    15m` albo wyśrodkowane `Napełnianie` dla uzupełniania wody. Podlewanie jest czasowe, domyślnie 15 minut. W trakcie podlewania działa przekaźnik pompy podlewania, a przekaźnik napełniania A2 pozostaje wyłączony. STOP na D2 przerywa podlewanie bez uruchamiania napełniania, a sygnał PUSTY albo zakończenie czasu podlewania przełącza sterownik do napełniania zbiornika. Ten sam STOP zatrzymuje także aktywne napełnianie.

Podczas napełniania działa drugi przekaźnik na A2. Napełnianie trwa do momentu załączenia czujnika PEŁNY, po czym sterownik wyłącza przekaźnik A2 i wraca do trybu AUTO. W symulatorze jeden suwak poziomu wody służy wyłącznie do ustawienia stanów cyfrowych PEŁNY/PUSTY; nie jest przeliczany na analogowy sygnał czujnika poziomu.

Do symulacji dołączono pliki `index.html`, `styles.css` i `script.js`. Symulator nie zmienia poziomu wody automatycznie; odzwierciedla zewnętrzne warunki ustawiane suwakami i natychmiast reaguje na zmianę poziomu wody, wilgotności oraz ręczne lub automatyczne przestawienie aktualnego czasu poza koniec podlewania. Przycisk PLAY/PAUZA uruchamia bieg czasu: przy ×1 co sekundę dopisywana jest jedna minuta symulacji, a ×5/×15/×60 wyraźnie skraca odstęp między kolejnymi pojedynczymi minutami bez skoków o wiele minut naraz. Symulator pokazuje LCD Keypad Shield 16x2, osobny czerwony STOP D2 dla podlewania i napełniania, przekaźnik podlewania, przekaźnik napełniania A2, jeden suwak poziomu wody, cyfrowe stany PEŁNY/PUSTY, wilgotność gleby oraz okno ustawienia dnia i czasu RTC; czas podlewania ustawia się wyłącznie w ustawieniach sterownika.
