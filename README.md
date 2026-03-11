# ivLyrics Web AI Provider

Experimental AI addon for [ivLyrics](https://github.com/ivLis-STUDIO/ivLyrics).

This repository is separate from the CLI-based provider addons. It focuses only on a local browser-automation bridge that reuses:

- ChatGPT Web
- Gemini Web

without API keys.

## Included

- `Addon_AI_FreeAIprovider.js`
- `freeai-bridge/`

## What It Does

- Supports lyrics translation
- Supports smart phonetic output
- Uses saved browser sessions instead of API tokens
- Runs through a local Playwright bridge on `http://127.0.0.1:19333`

## Limits

- Experimental
- Depends on web UI selectors
- Can break when sites change layouts
- Captcha, login expiry, or upgrade prompts can block requests

## Install Bridge

```bash
cd freeai-bridge
npm install
npx playwright install chromium
```

## Run Bridge

Foreground:

```bash
cd freeai-bridge
npm start
```

Background:

```bash
cd freeai-bridge
npm run start:bg
```

Stop:

```bash
cd freeai-bridge
npm run stop:bg
```

## Login Flow

1. Start the bridge.
2. Enable `Web AI Provider (ChatGPT + Gemini)` in ivLyrics.
3. Open addon settings.
4. Choose `ChatGPT` or `Gemini`.
5. Click `Open Login Window`.
6. Sign in.
7. Click `Save Session`.

## Marketplace Manifest

This repo exposes a standalone `manifest.json` for marketplace-style addon listing.

## License

MIT
