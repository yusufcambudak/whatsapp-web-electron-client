const { app, BrowserWindow, Tray, Menu, nativeImage, desktopCapturer, session } = require('electron');
const path = require('path');

app.commandLine.appendSwitch('ozone-platform-hint', 'auto');
app.commandLine.appendSwitch('enable-usermedia-screen-capturing');
app.commandLine.appendSwitch('allow-http-screen-capture');

const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) { app.quit(); }

let mainWindow = null;
let tray = null;

const USER_AGENT = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

function applySessionHandlers(sess) {
    sess.setPermissionRequestHandler((webContents, permission, callback) => {
        const allowed = [
            'notifications', 'media', 'mediaKeySystem',
            'audioCapture', 'videoCapture', 'screen',
            'display-capture', 'microphone', 'camera',
        ];
        callback(allowed.includes(permission));
    });

    sess.setPermissionCheckHandler((webContents, permission) => {
        const allowed = [
            'media', 'audioCapture', 'videoCapture', 'microphone',
            'camera', 'display-capture', 'screen', 'notifications',
        ];
        return allowed.includes(permission);
    });

    sess.setDisplayMediaRequestHandler((request, callback) => {
        desktopCapturer.getSources({ types: ['screen', 'window'] })
        .then((sources) => {
            if (sources.length > 0) {
                callback({ video: sources[0], audio: 'loopback' });
            } else {
                callback({});
            }
        })
        .catch(() => callback({}));
    }, { useSystemPicker: false });
}

function createWindow() {
    applySessionHandlers(session.defaultSession);

    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        title: 'WhatsApp',
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
                                   contextIsolation: true,
                                   nodeIntegration: false,
                                   sandbox: false,
                                   enableBlinkFeatures: 'GetDisplayMedia',
        },
        show: false,
    });

    mainWindow.webContents.setUserAgent(USER_AGENT);
    mainWindow.loadURL('https://web.whatsapp.com');

    mainWindow.once('ready-to-show', () => {
        mainWindow.show();
    });

    mainWindow.webContents.on('did-finish-load', () => {
        mainWindow.webContents.executeJavaScript(`
        Object.defineProperty(document, 'visibilityState', { value: 'visible', writable: false });
        Object.defineProperty(document, 'hidden', { value: false, writable: false });
        document.dispatchEvent(new Event('visibilitychange'));

        // "Hierher verschieben" Button automatisch klicken wenn er erscheint
        const observer = new MutationObserver(() => {
            // Alle Buttons durchsuchen
            const buttons = document.querySelectorAll('button, [role="button"]');
            for (const btn of buttons) {
                const text = btn.textContent || btn.innerText || '';
                if (text.includes('Hierher verschieben') || text.includes('Move here') || text.includes('Transfer here')) {
                    console.log('Auto-clicking move here button');
                    btn.click();
                    break;
                }
            }
        });
        observer.observe(document.body, { childList: true, subtree: true });

        // Popup-Fenster abfangen und stattdessen im Hauptfenster als iframe anzeigen
        const _origOpen = window.open.bind(window);
        window.open = function(url, target, features) {
            if (url && url.includes('/call/popout')) {
                let overlay = document.getElementById('__call_overlay__');
                if (!overlay) {
                    overlay = document.createElement('div');
                    overlay.id = '__call_overlay__';
                    overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;z-index:999999;background:#000;';
                    const iframe = document.createElement('iframe');
                    iframe.id = '__call_iframe__';
                    iframe.style.cssText = 'width:100%;height:100%;border:none;';
                    iframe.allow = 'camera;microphone;display-capture;autoplay';
                    const closeBtn = document.createElement('button');
                    closeBtn.textContent = '✕';
                    closeBtn.style.cssText = 'position:absolute;top:10px;right:10px;z-index:1000000;padding:8px 16px;background:#ff0000;color:#fff;border:none;border-radius:4px;cursor:pointer;font-size:14px;';
                    closeBtn.onclick = () => { overlay.remove(); };
                    overlay.appendChild(iframe);
                    overlay.appendChild(closeBtn);
                    document.body.appendChild(overlay);
                }
                document.getElementById('__call_iframe__').src = url;
                overlay.style.display = 'block';
                return {
                    closed: false,
                    focus: () => {},
                                                 close: () => { document.getElementById('__call_overlay__')?.remove(); },
                                                 postMessage: (msg, origin) => {
                                                     try {
                                                         document.getElementById('__call_iframe__')?.contentWindow?.postMessage(msg, origin);
                                                     } catch(e) {}
                                                 }
                };
            }
            return _origOpen(url, target, features);
        };
        `);
    });

    // Kein setWindowOpenHandler nötig – window.open wird in JS abgefangen

    mainWindow.on('close', (event) => {
        if (!app.isQuitting) {
            event.preventDefault();
            mainWindow.hide();
            return false;
        }
    });
}

function createTray() {
    let trayIcon;
    try {
        trayIcon = nativeImage.createFromPath(path.join(__dirname, 'icon.png'));
        if (trayIcon.isEmpty()) throw new Error('empty');
    } catch {
        trayIcon = nativeImage.createEmpty();
    }

    tray = new Tray(trayIcon);

    const contextMenu = Menu.buildFromTemplate([
        {
            label: 'WhatsApp öffnen',
            click: () => { mainWindow.show(); mainWindow.focus(); }
        },
        { type: 'separator' },
        {
            label: 'Beenden',
            click: () => { app.isQuitting = true; app.quit(); }
        }
    ]);

    tray.setToolTip('WhatsApp');
    tray.setContextMenu(contextMenu);

    tray.on('click', () => {
        if (mainWindow.isVisible()) {
            mainWindow.hide();
        } else {
            mainWindow.show();
            mainWindow.focus();
        }
    });
}

app.whenReady().then(() => {
    createWindow();
    createTray();
});

app.on('second-instance', () => {
    if (mainWindow) { mainWindow.show(); mainWindow.focus(); }
});

app.on('window-all-closed', (event) => {
    event.preventDefault();
});
