# Automatyczny system podlewania trawnika

## Lista elementów
- Arduino Mega 2560.
- Wyświetlacz LCD 16x2 zgodny z biblioteką `LiquidCrystal`.
- Czujnik wilgotności gleby M335 z wyjściem analogowym 0-3 V.
- Dwa pływakowe czujniki poziomu wody: 5% oraz 20%.
- Przekaźnik do sterowania pompą wody albo silnikiem DC symulującym pompę.
- Przycisk STOP, przewody i zasilanie dobrane do pompy.

## Schemat połączeń
| Element | Pin Arduino Mega 2560 | Uwagi |
| --- | --- | --- |
| LCD RS, E, D4, D5, D6, D7 | D8, D9, D4, D5, D6, D7 | jak w pliku stylu |
| Przycisk STOP | D2 | wejście z `INPUT` i podciągnięciem `PULLUP` |
| Czujnik poziomu 5% | A1 | użyty jako wejście cyfrowe |
| Czujnik poziomu 20% | A3 | użyty jako wejście cyfrowe |
| Czujnik wilgotności M335 | A4 | wejście analogowe 0-3 V |
| Przekaźnik pompy | A2 | wyjście cyfrowe |
| Klawiatura LCD shield | A0 | odczyt przycisków przez dzielnik rezystorowy |

W założeniach projektu pin A4 występuje jednocześnie dla przekaźnika i analogowego czujnika wilgotności. Ponieważ jeden pin nie może w tym samym czasie mierzyć analogowo i sterować przekaźnikiem, w programie pozostawiono A4 dla czujnika M335, a przekaźnik przeniesiono na A2.

## Opis działania
Sterownik pracuje na podstawie harmonogramu: użytkownik ustawia dzień podlewania, godzinę rozpoczęcia oraz próg wilgotności gleby. Program sprawdza, czy aktualny dzień i godzina zgadzają się z nastawami, a wilgotność jest mniejsza od progu.

Podlewanie rozpocznie się tylko wtedy, gdy czujnik poziomu 20% potwierdzi wystarczającą ilość wody. Jeżeli w trakcie pracy poziom wody spadnie poniżej 5%, wciśnięty zostanie STOP albo wilgotność wzrośnie powyżej progu z histerezą 5%, pompa zostanie wyłączona. Progi wody 20% i 5% są wpisane na stałe.

Do symulacji dołączono pliki `index.html`, `styles.css` i `script.js`. Symulator pokazuje LCD Keypad Shield 16x2 z komórkami znaków, przyciskami RIGHT/UP/DOWN/LEFT/SELECT umieszczonymi wyłącznie na shieldzie, osobny czerwony przycisk STOP D2, czujniki pływakowe 20% i 5%, poziom wody, wilgotność gleby i stan pompy.
