#include <Wire.h>
#include <EEPROM.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>
#include <avr/interrupt.h>
#include <stdlib.h>

#define SCREEN_WIDTH 128
#define SCREEN_HEIGHT 64

#define OLED_RESET -1
#define SCREEN_ADDRESS 0x3C

Adafruit_SSD1306 display(SCREEN_WIDTH, SCREEN_HEIGHT, &Wire, OLED_RESET);

const int enterPin = A1;
const int upPin = A2;
const int downPin = A3;

const byte inputSignalPin = 11;
const byte outputSignalPin = 12;
const byte defaultEventBufferSize = 32;
const byte maxEventBufferSize = 50;
const uint16_t timer1TicksPerHundredthMs = 20;
const uint16_t minCompareLeadTicks = 16;
const uint32_t maxSafeDelayTicks = 0x7FFFFFFFUL;

const int eepromRotationAddress = 0;
const int eepromDefaultDelayAddress = 1;
const int eepromBufferSizeAddress = eepromDefaultDelayAddress + sizeof(long);
const long maxDefaultDelay = 99999L;

const byte rotationNormal = 2;
const byte rotation180 = 0;

const unsigned long splashTime = 1000;
const unsigned long longPressTime = 3000;
const unsigned long debounceTime = 40;
const unsigned long savedInfoTime = 800;
const unsigned long cursorBlinkTime = 400;

enum Screen {
  SCREEN_SPLASH,
  SCREEN_MENU,
  SCREEN_MODE_1,
  SCREEN_MODE_2,
  SCREEN_SETTINGS,
  SCREEN_DEFAULT_DELAY,
  SCREEN_BUFFER_SIZE
};

Screen currentScreen = SCREEN_SPLASH;
Screen lastDrawnScreen = SCREEN_SPLASH;

int menuIndex = 0;
int settingsIndex = 0;

byte screenRotation = rotationNormal;

unsigned long splashStartTime = 0;
unsigned long savedStartTime = 0;
bool showSavedInfo = false;

long delayMode1 = 0;        // nastawa 000.00 do 999.99
long delayMode1Actual = 0;  // aktualne
long delayMode2 = 0;        // 0000.00 do 9999.99
long defaultDelay = 0;      // domyslne opoznienie startowe w 0.01 ms
long defaultDelayEdit = 0;
byte eventBufferSize = defaultEventBufferSize;
byte eventBufferSizeEdit = defaultEventBufferSize;

int mode1DigitIndex = 0;    // 0..4 cyfry, 5 = NASTAW, 6 = ANULUJ
int defaultDelayDigitIndex = 0; // 0..4 cyfry, 5 = NASTAW, 6 = ANULUJ

bool cursorVisible = true;
unsigned long lastCursorBlink = 0;

uint32_t *eventOutputTimes = nullptr;
uint8_t eventOutputStates[(maxEventBufferSize + 7) / 8];
volatile uint8_t pendingEvents = 0;
volatile bool delayLineEnabled = false;
volatile bool bufferOverflow = false;
volatile uint32_t activeDelayTicks = 0;
volatile uint32_t timer1OverflowCount = 0;

struct Button {
  int pin;
  bool stableState;
  bool lastReading;
  unsigned long lastChangeTime;
  bool pressEvent;
  bool releaseEvent;
  unsigned long pressStartTime;
  unsigned long lastRepeatTime;
  bool longPressDone;
};

Button enterButton = {enterPin, HIGH, HIGH, 0, false, false, 0, 0, false};
Button upButton = {upPin, HIGH, HIGH, 0, false, false, 0, 0, false};
Button downButton = {downPin, HIGH, HIGH, 0, false, false, 0, 0, false};

void setup() {
  Serial.begin(9600);

  pinMode(enterPin, INPUT_PULLUP);
  pinMode(upPin, INPUT_PULLUP);
  pinMode(downPin, INPUT_PULLUP);
  pinMode(inputSignalPin, INPUT);
  pinMode(outputSignalPin, OUTPUT);
  setOutputSignalLow();

  if (!display.begin(SSD1306_SWITCHCAPVCC, SCREEN_ADDRESS)) {
    Serial.println(F("OLED error"));
    while (true) {
    }
  }


  screenRotation = EEPROM.read(eepromRotationAddress);

  if (screenRotation != rotationNormal && screenRotation != rotation180) {
    screenRotation = rotationNormal;
  }

  EEPROM.get(eepromDefaultDelayAddress, defaultDelay);

  if (defaultDelay < 0 || defaultDelay > maxDefaultDelay) {
    defaultDelay = 0;
  }

  delayMode1 = defaultDelay;
  delayMode1Actual = defaultDelay;
  delayMode2 = defaultDelay;

  eventBufferSize = EEPROM.read(eepromBufferSizeAddress);

  if (eventBufferSize < 1 || eventBufferSize > maxEventBufferSize) {
    eventBufferSize = defaultEventBufferSize;
  }

  display.setRotation(screenRotation);

  configureTimer1();
  configurePinChangeInterrupt();

  splashStartTime = millis();
  drawSplash();
}

void loop() {
  updateButton(enterButton);
  updateButton(upButton);
  updateButton(downButton);

  if (currentScreen == SCREEN_SPLASH) {
    if (millis() - splashStartTime >= splashTime) {
      currentScreen = SCREEN_MENU;
      stopDelayLine();
      drawMenu();
    }
    return;
  }

  if (showSavedInfo) {
    if (millis() - savedStartTime >= savedInfoTime) {
      showSavedInfo = false;
      currentScreen = SCREEN_MENU;
      stopDelayLine();
      drawMenu();
    }
    return;
  }

  if (isEnterLongPress()) {
    currentScreen = SCREEN_MENU;
    menuIndex = 0;
    stopDelayLine();
    drawMenu();
    return;
  }

  if (bufferOverflow && (currentScreen == SCREEN_MODE_1 || currentScreen == SCREEN_MODE_2)) {
    if (currentScreen == SCREEN_MODE_1) {
      drawMode1();
    } else {
      drawMode2();
    }
    return;
  }

  if (currentScreen == SCREEN_MENU) {
    handleMenu();
    return;
  }

  if (currentScreen == SCREEN_MODE_1) {
    handleMode1();
    return;
  }

  if (currentScreen == SCREEN_MODE_2) {
    handleMode2();
    return;
  }

  if (currentScreen == SCREEN_SETTINGS) {
    handleSettings();
    return;
  }

  if (currentScreen == SCREEN_DEFAULT_DELAY) {
    handleDefaultDelay();
    return;
  }

  if (currentScreen == SCREEN_BUFFER_SIZE) {
    handleBufferSize();
    return;
  }
}


void setOutputSignalLow() {
  PORTB &= ~_BV(PORTB4);
}

void setOutputSignalState(uint8_t state) {
  if (state == HIGH) {
    PORTB |= _BV(PORTB4);
  } else {
    PORTB &= ~_BV(PORTB4);
  }
}

void configureTimer1() {
  cli();
  TCCR1A = 0;
  TCCR1B = _BV(CS11);
  TIMSK1 = _BV(TOIE1);
  sei();
}

void configurePinChangeInterrupt() {
  cli();
  PCICR |= _BV(PCIE0);
  PCMSK0 &= ~_BV(PCINT3);
  sei();
}

bool ensureEventBuffer() {
  if (eventOutputTimes != nullptr) {
    return true;
  }

  eventOutputTimes = (uint32_t *)malloc(eventBufferSize * sizeof(uint32_t));

  if (eventOutputTimes == nullptr) {
    bufferOverflow = true;
    return false;
  }

  return true;
}

void clearEventBuffer() {
  cli();
  pendingEvents = 0;
  bufferOverflow = false;
  for (byte index = 0; index < sizeof(eventOutputStates); index++) {
    eventOutputStates[index] = 0;
  }
  TIMSK1 &= ~_BV(OCIE1A);
  sei();
}

bool startDelayLine(long delaySetting) {
  if (!ensureEventBuffer()) {
    delayLineEnabled = false;
    drawDelayBufferRamError();
    return false;
  }

  clearEventBuffer();
  setActiveDelayFromSetting(delaySetting);
  cli();
  delayLineEnabled = true;
  PCIFR |= _BV(PCIF0);
  PCMSK0 |= _BV(PCINT3);
  sei();
  return true;
}

void stopDelayLine() {
  cli();
  delayLineEnabled = false;
  PCMSK0 &= ~_BV(PCINT3);
  TIMSK1 &= ~_BV(OCIE1A);
  pendingEvents = 0;
  sei();

  if (eventOutputTimes != nullptr) {
    free(eventOutputTimes);
    eventOutputTimes = nullptr;
  }

  setOutputSignalLow();
}

void setActiveDelayFromSetting(long delaySetting) {
  unsigned long ticks = delaySetting * (unsigned long)timer1TicksPerHundredthMs;

  if (ticks > maxSafeDelayTicks) {
    ticks = maxSafeDelayTicks;
  }

  cli();
  activeDelayTicks = ticks;
  sei();
}

uint8_t getBufferUsagePercent() {
  uint8_t count;

  cli();
  count = pendingEvents;
  sei();

  return ((unsigned int)count * 100U) / eventBufferSize;
}

uint8_t getEventOutputState(uint8_t index) {
  uint8_t mask = _BV(index & 7);

  return (eventOutputStates[index >> 3] & mask) ? HIGH : LOW;
}

void setEventOutputState(uint8_t index, uint8_t state) {
  uint8_t mask = _BV(index & 7);

  if (state == HIGH) {
    eventOutputStates[index >> 3] |= mask;
  } else {
    eventOutputStates[index >> 3] &= ~mask;
  }
}

void drawBufferUsage() {
  char text[5];
  uint8_t percent = getBufferUsagePercent();

  if (bufferOverflow) {
    percent = 100;
  }

  snprintf(text, sizeof(text), "%3u%%", percent);
  display.setTextSize(1);
  display.setTextColor(SSD1306_WHITE);
  display.fillRect(100, 0, 28, 8, SSD1306_BLACK);
  display.setCursor(104, 0);
  display.print(text);
}

void drawBufferOverflowError() {
  display.setTextSize(1);
  display.setTextColor(SSD1306_WHITE);
  display.setCursor(0, 22);
  display.println(F("BLAD: bufor pelny"));
  display.setCursor(0, 36);
  display.println(F("Wyjscie D12 OFF"));
  display.setCursor(0, 52);
  display.println(F("ENTER 3s = menu"));
  display.display();
}


void drawDelayBufferRamError() {
  display.clearDisplay();
  display.setTextColor(SSD1306_WHITE);
  display.setTextSize(1);
  display.setCursor(0, 0);
  display.println(F("RAM error"));
  display.setCursor(0, 16);
  display.println(F("Brak bufora"));
  display.setCursor(0, 36);
  display.println(F("ENTER 3s = menu"));
  display.display();
}

uint32_t getTimer1TicksFromIsr() {
  uint32_t overflows = timer1OverflowCount;
  uint16_t ticks = TCNT1;

  if ((TIFR1 & _BV(TOV1)) && ticks < 1024) {
    overflows++;
  }

  return (overflows << 16) | ticks;
}

void scheduleNextCompareFromIsr() {
  if (eventOutputTimes == nullptr) {
    TIMSK1 &= ~_BV(OCIE1A);
    return;
  }

  if (pendingEvents > 0) {
    uint32_t now = getTimer1TicksFromIsr();

    if ((int32_t)(now - eventOutputTimes[0]) >= 0) {
      OCR1A = TCNT1 + minCompareLeadTicks;
    } else {
      OCR1A = (uint16_t)eventOutputTimes[0];
    }

    TIFR1 |= _BV(OCF1A);
    TIMSK1 |= _BV(OCIE1A);
  } else {
    TIMSK1 &= ~_BV(OCIE1A);
  }
}

void removeFirstEventFromIsr() {
  for (uint8_t index = 1; index < pendingEvents; index++) {
    eventOutputTimes[index - 1] = eventOutputTimes[index];
    setEventOutputState(index - 1, getEventOutputState(index));
  }

  pendingEvents--;
}

void dispatchDueEventsFromIsr() {
  uint32_t now = getTimer1TicksFromIsr();

  while (pendingEvents > 0 && (int32_t)(now - eventOutputTimes[0]) >= 0) {
    setOutputSignalState(getEventOutputState(0));
    removeFirstEventFromIsr();
    now = getTimer1TicksFromIsr();
  }
}

ISR(PCINT0_vect) {
  if (!delayLineEnabled || bufferOverflow || eventOutputTimes == nullptr) {
    return;
  }

  uint32_t edgeTime = getTimer1TicksFromIsr();
  uint8_t state = (PINB & _BV(PINB3)) ? HIGH : LOW;
  uint32_t delayTicks = activeDelayTicks;

  if (delayTicks == 0) {
    setOutputSignalState(state);
    return;
  }

  uint32_t outputTime = edgeTime + delayTicks;

  if ((int32_t)(outputTime - getTimer1TicksFromIsr()) <= (int32_t)minCompareLeadTicks) {
    setOutputSignalState(state);
    return;
  }

  if (pendingEvents >= eventBufferSize) {
    bufferOverflow = true;
    delayLineEnabled = false;
    PCMSK0 &= ~_BV(PCINT3);
    TIMSK1 &= ~_BV(OCIE1A);
    setOutputSignalLow();
    return;
  }

  uint8_t insertIndex = pendingEvents;

  while (insertIndex > 0 && (int32_t)(outputTime - eventOutputTimes[insertIndex - 1]) < 0) {
    eventOutputTimes[insertIndex] = eventOutputTimes[insertIndex - 1];
    setEventOutputState(insertIndex, getEventOutputState(insertIndex - 1));
    insertIndex--;
  }

  eventOutputTimes[insertIndex] = outputTime;
  setEventOutputState(insertIndex, state);
  pendingEvents++;
  dispatchDueEventsFromIsr();
  scheduleNextCompareFromIsr();
}

ISR(TIMER1_COMPA_vect) {
  if (eventOutputTimes == nullptr) {
    TIMSK1 &= ~_BV(OCIE1A);
    return;
  }

  dispatchDueEventsFromIsr();
  scheduleNextCompareFromIsr();
}

ISR(TIMER1_OVF_vect) {
  timer1OverflowCount++;
}

void updateButton(Button &button) {
  button.pressEvent = false;
  button.releaseEvent = false;

  bool reading = digitalRead(button.pin);

  if (reading != button.lastReading) {
    button.lastChangeTime = millis();
    button.lastReading = reading;
  }

  if (millis() - button.lastChangeTime > debounceTime) {
    if (reading != button.stableState) {
      button.stableState = reading;

      if (button.stableState == LOW) {
        button.pressEvent = true;
        button.pressStartTime = millis();
        button.lastRepeatTime = millis();
        button.longPressDone = false;
      } else {
        button.releaseEvent = true;
      }
    }
  }
}

bool wasPressed(Button &button) {
  return button.pressEvent;
}

Button& logicalUpButton() {
  if (screenRotation == rotationNormal) {
    return upButton;
  } else {
    return downButton;
  }
}

Button& logicalDownButton() {
  if (screenRotation == rotationNormal) {
    return downButton;
  } else {
    return upButton;
  }
}

bool wasUpPressed() {
  return wasPressed(logicalUpButton());
}

bool wasDownPressed() {
  return wasPressed(logicalDownButton());
}

bool wasShortEnterPress() {
  if (enterButton.releaseEvent && !enterButton.longPressDone) {
    if (millis() - enterButton.pressStartTime < longPressTime) {
      return true;
    }
  }

  return false;
}

bool isEnterLongPress() {
  if (enterButton.stableState == LOW && !enterButton.longPressDone) {
    if (millis() - enterButton.pressStartTime >= longPressTime) {
      enterButton.longPressDone = true;
      return true;
    }
  }

  return false;
}

void drawSplash() {
  display.clearDisplay();
  display.setTextColor(SSD1306_WHITE);

  display.setTextSize(1);
  display.setCursor(28, 28);
  display.println(F("arduinowo.pl"));

  display.display();
}

void handleMenu() {
  if (wasUpPressed()) {
    menuIndex--;

    if (menuIndex < 0) {
      menuIndex = 2;
    }

    drawMenu();
  }

  if (wasDownPressed()) {
    menuIndex++;

    if (menuIndex > 2) {
      menuIndex = 0;
    }

    drawMenu();
  }

  if (wasShortEnterPress()) {
    if (menuIndex == 0) {
      delayMode1 = defaultDelay;
      delayMode1Actual = defaultDelay;
      if (startDelayLine(delayMode1Actual)) {
        currentScreen = SCREEN_MODE_1;
        lastDrawnScreen = SCREEN_SPLASH;
        mode1DigitIndex = 0;
        cursorVisible = true;
        lastCursorBlink = millis();
        drawMode1();
      }
    }

    if (menuIndex == 1) {
      delayMode2 = defaultDelay;
      if (startDelayLine(delayMode2)) {
        currentScreen = SCREEN_MODE_2;
        lastDrawnScreen = SCREEN_SPLASH;
        drawMode2();
      }
    }

    if (menuIndex == 2) {
      currentScreen = SCREEN_SETTINGS;
      settingsIndex = 0;
      stopDelayLine();
      drawSettings();
    }
  }
}

void drawMenu() {
  lastDrawnScreen = SCREEN_MENU;

  display.clearDisplay();
  display.setTextColor(SSD1306_WHITE);

  display.setTextSize(1);
  display.setCursor(0, 0);
  display.println(F("Wybierz tryb pracy"));

  drawMenuLine(0, 16, F("Tryb 1"));
  drawMenuLine(1, 32, F("Tryb 2"));
  drawMenuLine(2, 48, F("Ustawienia"));

  display.display();
}

void drawMenuLine(int index, int y, const __FlashStringHelper *text) {
  display.setTextSize(2);

  if (menuIndex == index) {
    display.fillRect(0, y - 1, 128, 16, SSD1306_WHITE);
    display.setTextColor(SSD1306_BLACK);
  } else {
    display.setTextColor(SSD1306_WHITE);
  }

  display.setCursor(4, y);
  display.println(text);

  display.setTextColor(SSD1306_WHITE);
}

void handleMode1() {
  bool redraw = false;

  if (mode1DigitIndex < 5) {
    if (wasUpPressed()) {
      changeMode1Digit(1);
      redraw = true;
    }

    if (wasDownPressed()) {
      changeMode1Digit(-1);
      redraw = true;
    }
  } else {
    if (wasUpPressed() || wasDownPressed()) {
      if (mode1DigitIndex == 5) {
        mode1DigitIndex = 6;
      } else {
        mode1DigitIndex = 5;
      }

      cursorVisible = true;
      lastCursorBlink = millis();
      redraw = true;
    }
  }

  if (wasShortEnterPress()) {
    if (mode1DigitIndex < 5) {
      mode1DigitIndex++;
    } else {
      if (mode1DigitIndex == 5) {
        delayMode1Actual = delayMode1;
        setActiveDelayFromSetting(delayMode1Actual);
      } else {
        delayMode1 = delayMode1Actual;
      }

      mode1DigitIndex = 0;
    }

    cursorVisible = true;
    lastCursorBlink = millis();
    redraw = true;
  }

  if (millis() - lastCursorBlink >= cursorBlinkTime) {
    lastCursorBlink = millis();
    cursorVisible = !cursorVisible;
    redraw = true;
  }

  if (redraw || lastDrawnScreen != SCREEN_MODE_1) {
    drawMode1();
  }
}

void changeMode1Digit(int direction) {
  char valueText[7];
  formatDelay3(delayMode1, valueText);

  int charIndex[5] = {0, 1, 2, 4, 5};
  int pos = charIndex[mode1DigitIndex];

  int digit = valueText[pos] - '0';
  digit += direction;

  if (digit > 9) {
    digit = 0;
  }

  if (digit < 0) {
    digit = 9;
  }

  valueText[pos] = digit + '0';

  long hundreds = valueText[0] - '0';
  long tens = valueText[1] - '0';
  long ones = valueText[2] - '0';
  long tenth = valueText[4] - '0';
  long hundredth = valueText[5] - '0';

  delayMode1 = hundreds * 10000L + tens * 1000L + ones * 100L + tenth * 10L + hundredth;
}

void drawMode1() {
  lastDrawnScreen = SCREEN_MODE_1;

  char actualText[7];
  char settingText[7];

  formatDelay3(delayMode1Actual, actualText);
  formatDelay3(delayMode1, settingText);

  display.clearDisplay();
  display.setTextColor(SSD1306_WHITE);

  display.setTextSize(1);
  display.setCursor(0, 0);
  display.print(F("Akt "));
  display.print(actualText);
  display.println(F(" ms"));
  drawBufferUsage();

  if (bufferOverflow) {
    drawBufferOverflowError();
    return;
  }

  display.drawLine(0, 14, 127, 14, SSD1306_WHITE);

  display.setCursor(0, 20);
  display.println(F("Nastawa"));

  display.setTextSize(2);
  display.setCursor(28, 31);
  display.println(settingText);
  display.setTextSize(1);
  display.setCursor(100, 38);
  display.println(F("ms"));

  if (cursorVisible && mode1DigitIndex < 5) {
    int charIndex[5] = {0, 1, 2, 4, 5};
    int pos = charIndex[mode1DigitIndex];

    int x = 28 + pos * 12;
    display.drawLine(x, 52, x + 9, 52, SSD1306_WHITE);
    display.drawLine(x, 53, x + 9, 53, SSD1306_WHITE);
  }

  display.setTextSize(1);

  if (mode1DigitIndex == 5 && cursorVisible) {
    display.fillRect(0, 55, 54, 9, SSD1306_WHITE);
    display.setTextColor(SSD1306_BLACK);
  } else {
    display.setTextColor(SSD1306_WHITE);
  }

  display.setCursor(4, 56);
  display.print(F("NASTAW"));

  if (mode1DigitIndex == 6 && cursorVisible) {
    display.fillRect(66, 55, 62, 9, SSD1306_WHITE);
    display.setTextColor(SSD1306_BLACK);
  } else {
    display.setTextColor(SSD1306_WHITE);
  }

  display.setCursor(72, 56);
  display.print(F("ANULUJ"));

  display.setTextColor(SSD1306_WHITE);
  display.display();
}

void handleMode2() {
  bool redraw = false;

  Button &up = logicalUpButton();
  Button &down = logicalDownButton();

  if (wasUpPressed()) {
    changeMode2Delay(1, 1);
    redraw = true;
  }

  if (wasDownPressed()) {
    changeMode2Delay(-1, 1);
    redraw = true;
  }

  if (handleHoldRepeat(up)) {
    changeMode2Delay(1, getMode2Step(up));
    redraw = true;
  }

  if (handleHoldRepeat(down)) {
    changeMode2Delay(-1, getMode2Step(down));
    redraw = true;
  }

  if (redraw || lastDrawnScreen != SCREEN_MODE_2) {
    drawMode2();
  }
}

bool handleHoldRepeat(Button &button) {
  if (button.stableState != LOW) {
    return false;
  }

  unsigned long holdTime = millis() - button.pressStartTime;

  if (holdTime < 400) {
    return false;
  }

  unsigned long repeatInterval = 180;

  if (holdTime > 1500) {
    repeatInterval = 100;
  }

  if (holdTime > 3000) {
    repeatInterval = 60;
  }

  if (millis() - button.lastRepeatTime >= repeatInterval) {
    button.lastRepeatTime = millis();
    return true;
  }

  return false;
}

long getMode2Step(Button &button) {
  unsigned long holdTime = millis() - button.pressStartTime;

  if (holdTime > 6000) {
    return 5000;    // 50.00
  }

  if (holdTime > 4000) {
    return 500;     // 5.00
  }

  if (holdTime > 2000) {
    return 50;      // 0.50
  }

  if (holdTime > 1000) {
    return 5;       // 0.05
  }

  return 1;         // 0.01
}

void changeMode2Delay(int direction, long step) {
  delayMode2 += direction * step;

  if (delayMode2 < 0) {
    delayMode2 = 0;
  }

  if (delayMode2 > 999999L) {
    delayMode2 = 999999L;
  }

  setActiveDelayFromSetting(delayMode2);
}

void drawMode2() {
  lastDrawnScreen = SCREEN_MODE_2;

  char valueText[8];
  formatDelay4(delayMode2, valueText);

  display.clearDisplay();
  display.setTextColor(SSD1306_WHITE);

  display.setTextSize(1);
  display.setCursor(0, 0);
  display.println(F("Opoznienie"));
  drawBufferUsage();

  if (bufferOverflow) {
    drawBufferOverflowError();
    return;
  }

  display.drawLine(0, 14, 127, 14, SSD1306_WHITE);

  display.setTextSize(2);
  display.setCursor(20, 26);
  display.println(valueText);
  display.setTextSize(1);
  display.setCursor(104, 33);
  display.println(F("ms"));

  display.setTextSize(1);
  display.setCursor(0, 55);
  display.println(F("ENTER 3s = menu"));

  display.display();
}

void handleSettings() {
  if (wasUpPressed() || wasDownPressed()) {
    if (wasUpPressed()) {
      settingsIndex--;
      if (settingsIndex < 0) {
        settingsIndex = 3;
      }
    } else {
      settingsIndex++;
      if (settingsIndex > 3) {
        settingsIndex = 0;
      }
    }

    drawSettings();
  }

  if (wasShortEnterPress()) {
    if (settingsIndex == 0) {
      if (screenRotation == rotationNormal) {
        screenRotation = rotation180;
      } else {
        screenRotation = rotationNormal;
      }
      EEPROM.update(eepromRotationAddress, screenRotation);
      display.setRotation(screenRotation);
      drawSettings();
      return;
    } else if (settingsIndex == 1) {
      currentScreen = SCREEN_DEFAULT_DELAY;
      defaultDelayEdit = defaultDelay;
      defaultDelayDigitIndex = 0;
      cursorVisible = true;
      lastCursorBlink = millis();
      drawDefaultDelay();
      return;
    } else if (settingsIndex == 2) {
      currentScreen = SCREEN_BUFFER_SIZE;
      eventBufferSizeEdit = eventBufferSize;
      drawBufferSize();
      return;
    } else {
      currentScreen = SCREEN_MENU;
      drawMenu();
      return;
    }
  }
}

void drawSettings() {
  lastDrawnScreen = SCREEN_SETTINGS;

  char defaultText[7];
  formatDelay3(defaultDelay, defaultText);

  display.clearDisplay();
  display.setTextColor(SSD1306_WHITE);
  display.setTextSize(1);

  display.setCursor(0, 0);
  display.println(F("Ustawienia"));

  display.setCursor(0, 12);
  if (settingsIndex == 0) {
    display.print("> ");
  } else {
    display.print("  ");
  }
  if (screenRotation == rotationNormal) {
    display.println(F("OLED 0 stopni"));
  } else {
    display.println(F("OLED 180 stopni"));
  }

  display.setCursor(0, 24);
  if (settingsIndex == 1) {
    display.print("> ");
  } else {
    display.print("  ");
  }
  display.print(F("Start "));
  display.print(defaultText);
  display.println(F(" ms"));

  display.setCursor(0, 36);
  if (settingsIndex == 2) {
    display.print("> ");
  } else {
    display.print("  ");
  }
  display.print(F("Bufor "));
  display.print(eventBufferSize);

  display.setCursor(0, 48);
  if (settingsIndex == 3) {
    display.print(F("> Wyjscie"));
  } else {
    display.print(F("  Wyjscie"));
  }

  display.display();
}

void handleDefaultDelay() {
  bool redraw = false;

  if (defaultDelayDigitIndex < 5) {
    if (wasUpPressed()) {
      changeDefaultDelayDigit(1);
      redraw = true;
    }

    if (wasDownPressed()) {
      changeDefaultDelayDigit(-1);
      redraw = true;
    }
  } else if (wasUpPressed() || wasDownPressed()) {
    defaultDelayDigitIndex = defaultDelayDigitIndex == 5 ? 6 : 5;
    cursorVisible = true;
    lastCursorBlink = millis();
    redraw = true;
  }

  if (wasShortEnterPress()) {
    if (defaultDelayDigitIndex < 5) {
      defaultDelayDigitIndex++;
    } else {
      if (defaultDelayDigitIndex == 5) {
        defaultDelay = defaultDelayEdit;
        EEPROM.put(eepromDefaultDelayAddress, defaultDelay);
      }

      currentScreen = SCREEN_SETTINGS;
      drawSettings();
      return;
    }

    cursorVisible = true;
    lastCursorBlink = millis();
    redraw = true;
  }

  if (millis() - lastCursorBlink >= cursorBlinkTime) {
    lastCursorBlink = millis();
    cursorVisible = !cursorVisible;
    redraw = true;
  }

  if (redraw || lastDrawnScreen != SCREEN_DEFAULT_DELAY) {
    drawDefaultDelay();
  }
}

void changeDefaultDelayDigit(int direction) {
  char valueText[7];
  formatDelay3(defaultDelayEdit, valueText);

  int charIndex[5] = {0, 1, 2, 4, 5};
  int pos = charIndex[defaultDelayDigitIndex];
  int digit = valueText[pos] - '0';

  digit += direction;

  if (digit > 9) {
    digit = 0;
  }

  if (digit < 0) {
    digit = 9;
  }

  valueText[pos] = digit + '0';

  long hundreds = valueText[0] - '0';
  long tens = valueText[1] - '0';
  long ones = valueText[2] - '0';
  long tenth = valueText[4] - '0';
  long hundredth = valueText[5] - '0';

  defaultDelayEdit = hundreds * 10000L + tens * 1000L + ones * 100L + tenth * 10L + hundredth;
}

void drawDefaultDelay() {
  lastDrawnScreen = SCREEN_DEFAULT_DELAY;

  char valueText[7];
  formatDelay3(defaultDelayEdit, valueText);

  display.clearDisplay();
  display.setTextColor(SSD1306_WHITE);
  display.setTextSize(1);
  display.setCursor(0, 0);
  display.println(F("Domyslny start"));
  display.drawLine(0, 14, 127, 14, SSD1306_WHITE);

  display.setTextSize(2);
  display.setCursor(24, 27);
  display.println(valueText);
  display.setTextSize(1);
  display.setCursor(96, 34);
  display.println(F("ms"));

  if (cursorVisible && defaultDelayDigitIndex < 5) {
    int charIndex[5] = {0, 1, 2, 4, 5};
    int pos = charIndex[defaultDelayDigitIndex];
    int x = 24 + pos * 12;

    display.drawLine(x, 48, x + 9, 48, SSD1306_WHITE);
    display.drawLine(x, 49, x + 9, 49, SSD1306_WHITE);
  }

  display.setTextSize(1);

  if (defaultDelayDigitIndex == 5 && cursorVisible) {
    display.fillRect(0, 55, 54, 9, SSD1306_WHITE);
    display.setTextColor(SSD1306_BLACK);
  } else {
    display.setTextColor(SSD1306_WHITE);
  }

  display.setCursor(4, 56);
  display.print(F("NASTAW"));

  if (defaultDelayDigitIndex == 6 && cursorVisible) {
    display.fillRect(66, 55, 62, 9, SSD1306_WHITE);
    display.setTextColor(SSD1306_BLACK);
  } else {
    display.setTextColor(SSD1306_WHITE);
  }

  display.setCursor(72, 56);
  display.print(F("ANULUJ"));
  display.setTextColor(SSD1306_WHITE);
  display.display();
}

void handleBufferSize() {
  bool redraw = false;

  if (wasUpPressed()) {
    if (eventBufferSizeEdit < maxEventBufferSize) {
      eventBufferSizeEdit++;
    }
    redraw = true;
  }

  if (wasDownPressed()) {
    if (eventBufferSizeEdit > 1) {
      eventBufferSizeEdit--;
    }
    redraw = true;
  }

  if (wasShortEnterPress()) {
    eventBufferSize = eventBufferSizeEdit;
    EEPROM.update(eepromBufferSizeAddress, eventBufferSize);
    currentScreen = SCREEN_SETTINGS;
    drawSettings();
    return;
  }

  if (redraw || lastDrawnScreen != SCREEN_BUFFER_SIZE) {
    drawBufferSize();
  }
}

void drawBufferSize() {
  lastDrawnScreen = SCREEN_BUFFER_SIZE;

  display.clearDisplay();
  display.setTextColor(SSD1306_WHITE);
  display.setTextSize(1);
  display.setCursor(0, 0);
  display.println(F("Rozmiar bufora"));
  display.drawLine(0, 14, 127, 14, SSD1306_WHITE);

  display.setTextSize(2);
  display.setCursor(48, 24);
  display.println(eventBufferSizeEdit);

  display.setTextSize(1);
  display.setCursor(0, 46);
  display.print(F("Max rozs. "));
  display.print(maxEventBufferSize);
  display.println(F(" zdarzen"));

  display.setCursor(0, 56);
  display.println(F("UP/DOWN, ENTER"));

  display.display();
}

void formatDelay3(long value, char *buffer) {
  long whole = value / 100;
  long fraction = value % 100;

  buffer[0] = '0' + (whole / 100) % 10;
  buffer[1] = '0' + (whole / 10) % 10;
  buffer[2] = '0' + whole % 10;
  buffer[3] = ',';
  buffer[4] = '0' + (fraction / 10) % 10;
  buffer[5] = '0' + fraction % 10;
  buffer[6] = '\0';
}

void formatDelay4(long value, char *buffer) {
  long whole = value / 100;
  long fraction = value % 100;

  buffer[0] = '0' + (whole / 1000) % 10;
  buffer[1] = '0' + (whole / 100) % 10;
  buffer[2] = '0' + (whole / 10) % 10;
  buffer[3] = '0' + whole % 10;
  buffer[4] = ',';
  buffer[5] = '0' + (fraction / 10) % 10;
  buffer[6] = '0' + fraction % 10;
  buffer[7] = '\0';
}
