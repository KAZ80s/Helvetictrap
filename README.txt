HELVETICTRAP '84 — PHASE 4 · VERSION 0.4.1
==============================

Start:
1. Ordner entpacken.
2. index.html in einem aktuellen Browser öffnen.
3. Kampagne oder gewünschten Phasen-Einstieg starten.

Steuerung:
- WASD oder Pfeiltasten: bewegen
- E: Depot/Kiste durchsuchen
- Leertaste: Falle setzen
- P: Pause
- Mobil: Touch-Tasten
- Q oder WECHSEL: Fallentyp wechseln

Spielziel:
In jedem Level ist das Dossier in einem der Depots versteckt.
Dossier finden, Patrouillen umgehen oder mit Fallen kurz ausschalten,
danach den Ausgang erreichen.

Neu in Phase 1.1:
- Patrouillen laufen sichtbar zwischen Wegpunkten und verfolgen dich bei Annäherung.
- Jeder Fund erscheint gross im Spielfeld und dauerhaft im Fundprotokoll.
- Mögliche Funde: Geheimdossier, Ersatzfalle, Sanitätspaket und Patrouillenplan.
- Eine rote Alarmanzeige warnt, sobald eine Patrouille dich entdeckt hat.

Neu in Phase 1.2:
- Der Auftrag steht gross und zentral über dem Spielfeld.
- Vor jedem Level gibt es eine 3-sekündige Einsatzanzeige mit Countdown.
- Während des Countdowns sind Spieler und Patrouillen vollständig angehalten.
- Patrouillen beginnen weiter vom Startpunkt entfernt.

Neu in Phase 2:
- Insgesamt 20 Levels; Phase 2 kann direkt bei Level 11 gestartet werden.
- Vier Fallen: Schock, Köder, Rauch und Netz.
- Drei neue Gegner-Gegenmaßnahmen: Panzerung, Detektor und Sprinter.
- Klare Farbumrandungen zeigen den Gegnertyp.
- Neue Schweizer Schauplätze von Luzern bis Simplon und Bundesarchiv.

Neu in Phase 3 — Swiss World:
- Insgesamt 30 Levels; Phase 3 kann direkt bei Level 21 gestartet werden.
- Zehn klar unterscheidbare Schweizer Schauplätze mit eigener Farbwelt und Architektur.
- Berghütte, Werft, Altstadt, Hauptbahnhof, Festung, Gletscherstation,
  Güterdepot, Kasematte, Bergstation und Gipfelbasis.
- Die Schauplätze sind bewusst visuell: Steuerung, Fallen und Gegnerregeln bleiben vertraut.
- Neue Kartenmuster und weiter steigende Patrouillendichte.

Phase 1:
- 10 spielbare Einsätze
- Singleplayer
- Tastatur + Touch
- Punkte, Leben, Fallen
- unterschiedliche Karten und steigende Schwierigkeit
- eigenständige geometrische Retro-Grafik
- Schweizer Schauplätze/Optik
- keine externen Bibliotheken, Fonts, Bilder, Tracker oder Netzwerkzugriffe

Dateien:
index.html  Startseite
style.css   Darstellung
game.js     Spiellogik
HELVETICTRAP_84_Phase3_Anleitung.docx  Anleitung, Levelbeschreibung, Security

Phase 4 — Arcade (17.10.2026):
- 30 Levels mit allen bisherigen Swiss-World-Schauplätzen.
- Zeitbonus: 1200 Punkte minus 10 pro aktiver Spielsekunde, mindestens 0.
- Countdown und Pause zählen nicht zur Einsatzzeit.
- Combos: Funde/Fallentreffer innerhalb von 5 Sekunden; bis ×5.
  Zusätzliche Combopunkte: 0 / 100 / 200 / 300 / 400 pro Aktion.
- Treffer gegen den Spieler brechen die Combo ab.
- Partikeleffekte bei Funden, Fallentreffern und Treffern.
- 1,8 Sekunden Abschlussanzeige vor dem nächsten Einsatz-Countdown.
- Lokale Retro-Sounds, oben mit SOUND AN/AUS umschaltbar.
- Kein Zeitlimit: der Zeitbonus kann auslaufen, der Einsatz bleibt spielbar.

Security-Check Phase 4:
Audio ausschließlich lokal synthetisiert; keine Audiodateien, Downloads,
Netzwerkzugriffe, Konten oder neuen persönlichen Daten. Effekte sind kurzlebig.
Keine dynamische Codeausführung oder freien HTML-Eingaben. Risiko: niedrig.

V0.4.1 – Balance ab Level 20 (25.10.2026):
- Gegnertempo ab Level 20 deutlich reduziert; weitere Steigerung gedeckelt.
- Sprinter ab Level 20 nur noch 10 Prozent schneller als normale Gegner.
- Selbst der schnellste verfolgende Sprinter bleibt langsamer als der Spieler.
- Level 1–19 unverändert. Security: reine lokale Zahlenanpassung, keine neue Angriffsfläche.
