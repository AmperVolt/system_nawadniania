/*
  Tester linii opozniajacej dla Arduino UNO R4 Minima.

  Polaczenia:
  - R4 D7  -> wejscie badanego ukladu D11
  - R4 GND -> GND badanego ukladu
  - wyjscie badanego ukladu D12 -> R4 D8

  Program generuje przebieg testowy na D7, mierzy zbocza wracajace na D8
  i raportuje przez Serial opoznienie, zgodnosc stanu logicznego oraz bledy.
*/

const byte testOutputPin = 7;
const byte measuredInputPin = 8;
const byte statusLedPin = LED_BUILTIN;

const unsigned long serialBaud = 115200;

// Ustaw tu opoznienie skonfigurowane w badanym Arduino, aby dostac ocene OK/FAIL.
const unsigned long expectedDelayUs = 1000;
const unsigned long allowedErrorUs = 80;

// Okres polowy przebiegu testowego. Jedno zbocze powstaje co halfPeriodUs.
const unsigned long halfPeriodUs = 5000;
const unsigned long reportIntervalMs = 1000;
const unsigned long missingEdgeTimeoutUs = expectedDelayUs + halfPeriodUs + 2000;

const byte edgeQueueSize = 64;

struct EdgeEvent {
  unsigned long edgeTimeUs;
  byte state;
};

EdgeEvent generatedEdges[edgeQueueSize];
volatile byte edgeHead = 0;
volatile byte edgeTail = 0;
volatile byte queuedEdges = 0;

volatile unsigned long measuredEdges = 0;
volatile unsigned long matchedEdges = 0;
volatile unsigned long stateErrors = 0;
volatile unsigned long missingEdges = 0;
volatile unsigned long queueOverflows = 0;
volatile unsigned long tooEarlyEdges = 0;

volatile unsigned long lastDelayUs = 0;
volatile unsigned long minDelayUs = 0xFFFFFFFFUL;
volatile unsigned long maxDelayUs = 0;
volatile unsigned long sumDelayUs = 0;

bool outputState = LOW;
unsigned long lastToggleUs = 0;
unsigned long lastReportMs = 0;

void setup() {
  pinMode(testOutputPin, OUTPUT);
  pinMode(measuredInputPin, INPUT);
  pinMode(statusLedPin, OUTPUT);

  digitalWrite(testOutputPin, outputState);
  digitalWrite(statusLedPin, LOW);

  Serial.begin(serialBaud);

  if (Serial) {
    Serial.println("Tester linii opozniajacej - Arduino UNO R4 Minima");
    Serial.println("Polacz: R4 D7 -> DUT D11, DUT D12 -> R4 D8, wspolna masa GND");
    Serial.print("Oczekiwane opoznienie [us]: ");
    Serial.println(expectedDelayUs);
    Serial.print("Tolerancja [us]: +/-");
    Serial.println(allowedErrorUs);
    Serial.println("start");
  }

  attachInterrupt(digitalPinToInterrupt(measuredInputPin), measuredEdgeIsr, CHANGE);

  lastToggleUs = micros();
  lastReportMs = millis();
}

void loop() {
  unsigned long nowUs = micros();
  bool toggled = false;

  if ((unsigned long)(nowUs - lastToggleUs) >= halfPeriodUs) {
    lastToggleUs = nowUs;
    outputState = !outputState;
    digitalWrite(testOutputPin, outputState);
    rememberGeneratedEdge(nowUs, outputState);
    toggled = true;
  }

  checkMissingEdges(nowUs);

  if (toggled && millis() - lastReportMs >= reportIntervalMs) {
    lastReportMs += reportIntervalMs;
    printReport();
  }
}

void rememberGeneratedEdge(unsigned long edgeTimeUs, byte state) {
  noInterrupts();

  if (queuedEdges >= edgeQueueSize) {
    queueOverflows++;
    interrupts();
    return;
  }

  generatedEdges[edgeHead].edgeTimeUs = edgeTimeUs;
  generatedEdges[edgeHead].state = state;
  edgeHead = (edgeHead + 1) % edgeQueueSize;
  queuedEdges++;

  interrupts();
}

void checkMissingEdges(unsigned long nowUs) {
  noInterrupts();

  while (queuedEdges > 0 && (unsigned long)(nowUs - generatedEdges[edgeTail].edgeTimeUs) > missingEdgeTimeoutUs) {
    edgeTail = (edgeTail + 1) % edgeQueueSize;
    queuedEdges--;
    missingEdges++;
  }

  interrupts();
}

void measuredEdgeIsr() {
  unsigned long nowUs = micros();
  byte measuredState = digitalRead(measuredInputPin);

  measuredEdges++;

  if (queuedEdges == 0) {
    tooEarlyEdges++;
    return;
  }

  EdgeEvent expectedEdge = generatedEdges[edgeTail];
  edgeTail = (edgeTail + 1) % edgeQueueSize;
  queuedEdges--;

  unsigned long delayUs = nowUs - expectedEdge.edgeTimeUs;
  lastDelayUs = delayUs;

  if (delayUs < minDelayUs) {
    minDelayUs = delayUs;
  }

  if (delayUs > maxDelayUs) {
    maxDelayUs = delayUs;
  }

  sumDelayUs += delayUs;
  matchedEdges++;

  if (measuredState != expectedEdge.state) {
    stateErrors++;
  }
}

void printReport() {
  unsigned long localMeasuredEdges;
  unsigned long localMatchedEdges;
  unsigned long localStateErrors;
  unsigned long localMissingEdges;
  unsigned long localQueueOverflows;
  unsigned long localTooEarlyEdges;
  unsigned long localLastDelayUs;
  unsigned long localMinDelayUs;
  unsigned long localMaxDelayUs;
  unsigned long localSumDelayUs;
  byte localQueuedEdges;

  noInterrupts();
  localMeasuredEdges = measuredEdges;
  localMatchedEdges = matchedEdges;
  localStateErrors = stateErrors;
  localMissingEdges = missingEdges;
  localQueueOverflows = queueOverflows;
  localTooEarlyEdges = tooEarlyEdges;
  localLastDelayUs = lastDelayUs;
  localMinDelayUs = minDelayUs;
  localMaxDelayUs = maxDelayUs;
  localSumDelayUs = sumDelayUs;
  localQueuedEdges = queuedEdges;
  interrupts();

  unsigned long averageDelayUs = 0;

  if (localMatchedEdges > 0) {
    averageDelayUs = localSumDelayUs / localMatchedEdges;
  }

  bool delayOk = localMatchedEdges > 0
                 && averageDelayUs >= expectedDelayUs - allowedErrorUs
                 && averageDelayUs <= expectedDelayUs + allowedErrorUs;
  bool allOk = delayOk
               && localStateErrors == 0
               && localMissingEdges == 0
               && localQueueOverflows == 0
               && localTooEarlyEdges == 0;

  digitalWrite(statusLedPin, allOk ? HIGH : LOW);

  if (!Serial) {
    return;
  }

  Serial.print(allOk ? "OK" : "FAIL");
  Serial.print(" | matched=");
  Serial.print(localMatchedEdges);
  Serial.print(" measured=");
  Serial.print(localMeasuredEdges);
  Serial.print(" queued=");
  Serial.print(localQueuedEdges);
  Serial.print(" delay_us last/avg/min/max=");
  Serial.print(localLastDelayUs);
  Serial.print('/');
  Serial.print(averageDelayUs);
  Serial.print('/');
  Serial.print(localMinDelayUs == 0xFFFFFFFFUL ? 0 : localMinDelayUs);
  Serial.print('/');
  Serial.print(localMaxDelayUs);
  Serial.print(" errors state/missing/overflow/early=");
  Serial.print(localStateErrors);
  Serial.print('/');
  Serial.print(localMissingEdges);
  Serial.print('/');
  Serial.print(localQueueOverflows);
  Serial.print('/');
  Serial.println(localTooEarlyEdges);
}
