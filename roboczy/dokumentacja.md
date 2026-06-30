# Automatyczny system podlewania trawnika

## Lista elementów
- Arduino Mega 2560.
- Wyświetlacz LCD 16x2 zgodny z biblioteką `LiquidCrystal`.
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

Pin A4 pozostaje wejściem analogowym czujnika wilgotności M335. Przekaźnik napełniania zbiornika jest podłączony do A2, a przekaźnik pompy podlewania do wolnego pinu A5.

## Opis działania
Sterownik pracuje na podstawie harmonogramu: użytkownik ustawia dzień podlewania, godzinę rozpoczęcia, czas podlewania w minutach oraz próg wilgotności gleby. Podlewanie uruchamia się tylko wtedy, gdy aktualny dzień i godzina zgadzają się z harmonogramem, wilgotność gleby jest mniejsza od progu i zbiornik nie jest pusty.

Podlewanie jest czasowe, domyślnie 15 minut. W trakcie podlewania działa przekaźnik pompy podlewania, a przekaźnik napełniania A2 pozostaje wyłączony. STOP na D2 albo sygnał PUSTY przerywa podlewanie. Po zakończeniu czasu podlewania, po STOP albo po wykryciu pustego zbiornika sterownik automatycznie przechodzi do napełniania zbiornika.

Podczas napełniania działa drugi przekaźnik na A2. Napełnianie trwa do momentu załączenia czujnika PEŁNY, po czym sterownik wyłącza przekaźnik A2 i wraca do trybu AUTO. W symulatorze jeden suwak poziomu wody służy wyłącznie do ustawienia stanów cyfrowych PEŁNY/PUSTY; nie jest przeliczany na analogowy sygnał czujnika poziomu.

Do symulacji dołączono pliki `index.html`, `styles.css` i `script.js`. Symulator pokazuje LCD Keypad Shield 16x2, osobny czerwony STOP D2, przekaźnik podlewania, przekaźnik napełniania A2, jeden suwak poziomu wody, cyfrowe stany PEŁNY/PUSTY, wilgotność gleby i nastawę czasu podlewania.
