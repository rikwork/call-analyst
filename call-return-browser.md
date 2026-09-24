# Implementation Plan: Post-Call Navigation & External Browser Links

> **Task Slug:** `call-return-browser`  
> **Target:** Call Analyst Desktop Application (`apps/desktop`)  
> **Core Objective:** Provide seamless transition back to the recording screen upon call completion and ensure all web cabinet links open in the user's default OS browser (Chrome, Safari, Firefox, etc.) via Electron native shell integration.

---

## 1. Overview & Context

In the desktop mini-recorder (`apps/desktop`):
1. **Return to Recording Flow:** When a consultation call finishes and finishes processing (`finishedSessionId` is set), the user currently remains on the completion screen without a direct way to start a new recording or select another client without restarting the application.
2. **External Link Routing:** Clicking "Открыть в веб-кабинете" (`<a href="http://localhost:3050" target="_blank">`) inside the Electron container does not properly launch the user's default system browser. Using Electron's native `shell.openExternal` and `webContents.setWindowOpenHandler` is required for opening URLs in the OS browser.

---

## 2. Project Type & Scope

- **Project Type:** DESKTOP (Electron + React / TypeScript + Tailwind CSS)
- **Primary Agent:** `frontend-specialist`
- **Key Skills:** `@[plan-writing]`, `@[clean-code]`, `@[frontend-architecture]`

---

## 3. Success Criteria

- [ ] A clear and accessible action button ("Новая запись" / "Вернуться к записи") is displayed on the post-call completion screen.
- [ ] Clicking "Новая запись" resets session state (`finishedSessionId`, elapsed timers, notes, upload status) and returns to the initial client selection / recording screen.
- [ ] Electron main process safely exposes and handles external URL opening via `shell.openExternal(url)` and catches window-open requests.
- [ ] Clicking "Открыть в веб-кабинете" immediately opens the web dashboard in the system's default browser (macOS / Windows / Linux).
- [ ] TypeScript types and build verification pass cleanly (`npm run build`).

---

## 4. Affected Files & Architecture

```
apps/desktop/
├── electron/
│   ├── main.js        # Add shell.openExternal IPC handler & setWindowOpenHandler
│   └── preload.js     # Expose electronAPI.openExternal bridge to renderer
└── src/
    └── App.tsx        # Add handleNewRecording reset action & use openExternal for web cabinet link
```

---

## 5. Task Breakdown

### TASK-01: Configure Native External URL Handling in Electron
- **Agent:** `frontend-specialist`
- **Skills:** `@[clean-code]`, `@[frontend-architecture]`
- **Dependencies:** None
- **Input:** [main.js](file:///Users/nikita/projects/call_analyst/apps/desktop/electron/main.js), [preload.js](file:///Users/nikita/projects/call_analyst/apps/desktop/electron/preload.js)
- **Actions:**
  1. In `apps/desktop/electron/main.js`:
     - Import `shell` from `electron`.
     - Register `ipcMain.on('open-external', (event, url) => { if (url) shell.openExternal(url); })`.
     - Add `mainWindow.webContents.setWindowOpenHandler(({ url }) => { shell.openExternal(url); return { action: 'deny' }; })`.
  2. In `apps/desktop/electron/preload.js`:
     - Expose `openExternal: (url) => ipcRenderer.send('open-external', url)` under `window.electronAPI`.
- **Output:** Native bridge for opening links in the OS default browser.
- **Verify:** IPC channel is registered and handles external URL opening.

---

### TASK-02: Implement Return to Recording & External Web Link in UI
- **Agent:** `frontend-specialist`
- **Skills:** `@[clean-code]`, `@[tailwind-patterns]`
- **Dependencies:** TASK-01
- **Input:** [App.tsx](file:///Users/nikita/projects/call_analyst/apps/desktop/src/App.tsx)
- **Actions:**
  1. Implement `handleResetRecording` / `handleNewRecording`:
     - Resets `finishedSessionId` to `null`.
     - Resets `isRecording` to `false`, `isPaused` to `false`, `elapsedSeconds` to `0`.
     - Clears notes (`setNotes([])`), resets `uploadStatus` and levels.
  2. Update the completion view (`finishedSessionId` screen):
     - Replace raw `<a>` tag or augment it with `onClick` handler calling `window.electronAPI?.openExternal('http://localhost:3050')` (with fallback to `window.open`).
     - Add primary/secondary action button: **"Новая запись" / "Вернуться к записи"** with icon (e.g. `RotateCcw` or `Mic`).
- **Output:** Polished completion screen with return action and native browser launcher.
- **Verify:** User can switch back to recording mode and open web cabinet in the external browser.

---

### TASK-03: Verification & Build Check
- **Agent:** `frontend-specialist`
- **Skills:** `@[verify-changes]`
- **Dependencies:** TASK-01, TASK-02
- **Input:** `apps/desktop`
- **Actions:**
  1. Run `npm run build` in `apps/desktop` to ensure TypeScript compilation and asset bundling succeed without errors.
- **Output:** Production build succeeds.
- **Verify:** Zero build or lint errors.

---

## 6. Phase X: Final Verification Checklist

- [ ] "Новая запись" button returns UI to clean pre-recording state with client select.
- [ ] "Открыть в веб-кабинете" opens the default computer browser without blank Electron popups.
- [ ] No regression in audio recording, dual VU meters, or note capture.
- [ ] Build passes: `npm run build` in `apps/desktop`.
