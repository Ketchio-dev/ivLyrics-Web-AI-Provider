# FreeAI Bridge

Local bridge server for `Addon_AI_FreeAIprovider.js`.

This package automates AI web UIs through Playwright and exposes a small local HTTP API for ivLyrics.

Supported providers in the default config:

- ChatGPT
- Gemini

## Install

```bash
cd freeai-bridge
npm install
npx playwright install chromium
```

## Run

```bash
cd freeai-bridge
npm start
```

Background mode:

```bash
cd freeai-bridge
npm run start:bg
```

Stop background mode:

```bash
cd freeai-bridge
npm run stop:bg
```

Default URL:

```text
http://127.0.0.1:19333
```

Defaults:

- Login windows always open in a visible browser.
- Service runtime is headed by default.
- Service windows start minimized by default when possible.
- Set `FREEAI_SERVICE_HEADLESS=1` if you want hidden background automation.
- Recovery windows open on automation failures by default.

## Login flow

1. Start the bridge.
2. In ivLyrics `FreeAIprovider` settings, choose a provider.
3. Click `Open Login Window`.
4. Log in manually in the opened browser.
5. Click `Save Session`.

The session is saved under:

```text
~/.freeai-bridge/state
```

Failure screenshots are saved under:

```text
output/playwright
```

## Local selector overrides

Web UIs change often. If a provider stops working, create:

```text
freeai-bridge/providers.local.json
```

Its structure matches `providers.example.json`. Any values in `providers.local.json` override the built-in defaults.

Useful overrides:

- `newChatUrl`: provider-specific entry URL to start a fresh chat before each request
- `temporaryChatUrl`: provider-specific temporary-chat entry URL, if supported
- `temporaryChatSelectors`: fallback selectors used to enable temporary chat from the UI
- `newChatSelectors`: fallback selectors used when the site still needs an explicit `New chat` click
- `loadingSelectors`: selectors used to detect whether the provider is still generating a response

## API

- `GET /health`
- `GET /providers`
- `POST /auth/open`
- `POST /auth/complete`
- `POST /auth/cancel`
- `POST /recovery/cancel`
- `POST /generate`

## Runtime behavior

- Keeps one persistent browser runtime per provider/task type.
- Serializes requests per provider/task type to avoid overlapping prompts in the same chat UI.
- Starts each request from a fresh page and prefers a provider-specific `newChatUrl`.
- Can optionally attempt provider-specific temporary chat before falling back to normal fresh chat.
- Tracks login windows separately from recovery/debug windows opened after failures.
- Automatically dismisses common dialogs and closes unexpected popups.
- Detects common blockers such as captcha, forced login, and upgrade walls.
- Captures a screenshot when a request fails during browser automation.

Example:

```bash
curl -sS http://127.0.0.1:19333/health
```

```bash
curl -sS http://127.0.0.1:19333/generate \
  -H 'Content-Type: application/json' \
  -d '{"provider":"chatgpt","prompt":"Translate hello to Korean. Reply with the translation only."}'
```
