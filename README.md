# WhatsApp Web Electron Client

Ein schlanker Electron-Wrapper für WhatsApp Web unter Linux. Beim Schließen des Fensters verschwindet die App ins System-Tray, statt komplett beendet zu werden – WhatsApp bleibt so im Hintergrund erreichbar.

## Funktionen

- Läuft WhatsApp Web in einem eigenständigen Fenster (kein Browser-Tab nötig)
- Minimiert sich beim Schließen ins Taskbar/System-Tray statt die App zu beenden
- *[weitere Funktionen ergänzen, z.B. Benachrichtigungen, Tray-Icon-Menü, Autostart]*

## Installation

### Vorgefertigte Binärdatei (empfohlen)

Lade die neueste `.AppImage`-Datei von der [Releases-Seite](../../releases) herunter, mache sie ausführbar und starte sie:

```bash
chmod +x WhatsApp-*.AppImage
./WhatsApp-*.AppImage
```

### Aus dem Quellcode

```bash
git clone https://github.com/yusufcambudak/whatsapp-web-electron-client.git
cd whatsapp-web-electron-client
npm install
npm start
```

## Selbst bauen

```bash
npm run dist
```
Die fertige AppImage findest du danach unter `dist/`.

## Lizenz

Dieses Projekt steht unter der [GNU General Public License v3.0](LICENSE).
