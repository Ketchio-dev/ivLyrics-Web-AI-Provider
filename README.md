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
curl -fsSL https://raw.githubusercontent.com/Ketchio-dev/ivLyrics-Web-AI-Provider/main/install.sh | bash -s -- --bridge
```

Windows PowerShell:

```powershell
$u = "https://raw.githubusercontent.com/Ketchio-dev/ivLyrics-Web-AI-Provider/main/install.ps1"
& ([ScriptBlock]::Create((Invoke-WebRequest -UseBasicParsing $u).Content)) -Bridge
```

## Run Bridge

Foreground:

```bash
cd freeai-bridge
npm start
```

Background:

```bash
curl -fsSL https://raw.githubusercontent.com/Ketchio-dev/ivLyrics-Web-AI-Provider/main/install.sh | bash -s -- --bridge --start-bridge --no-apply
```

Restart after install:

```bash
curl -fsSL https://raw.githubusercontent.com/Ketchio-dev/ivLyrics-Web-AI-Provider/main/install.sh | bash -s -- --start-bridge --no-apply
```

Stop:

```bash
cd ~/.config/spicetify/freeai-bridge
npm run stop:bg
```

Windows start:

```powershell
$u = "https://raw.githubusercontent.com/Ketchio-dev/ivLyrics-Web-AI-Provider/main/install.ps1"
& ([ScriptBlock]::Create((Invoke-WebRequest -UseBasicParsing $u).Content)) -Bridge -StartBridge -NoApply
```

Windows restart after install:

```powershell
$u = "https://raw.githubusercontent.com/Ketchio-dev/ivLyrics-Web-AI-Provider/main/install.ps1"
& ([ScriptBlock]::Create((Invoke-WebRequest -UseBasicParsing $u).Content)) -StartBridge -NoApply
```

Windows stop:

```powershell
cd "$env:LOCALAPPDATA\spicetify\freeai-bridge"
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

## Marketplace Install

Marketplace install is not enough by itself.

What the ivLyrics marketplace does:

- Downloads `Addon_AI_FreeAIprovider.js`
- Saves the addon code locally
- Loads the addon immediately

What it does not do:

- Install `freeai-bridge`
- Install Playwright or Chromium
- Start the local bridge server
- Create browser login sessions for ChatGPT or Gemini

So after pressing the marketplace download button, you still need to:

1. Install `freeai-bridge`
2. Start the bridge
3. Log in through `Open Login Window`
4. Save the session

If the bridge is missing, the addon will appear in ivLyrics but it will not be usable yet.

## Marketplace Manifest

This repo exposes a standalone `manifest.json` for marketplace-style addon listing.

## Suggested Release Title

`Web AI Provider (ChatGPT + Gemini) v0.2.0`

## Suggested Release Summary

Experimental ivLyrics addon that reuses ChatGPT Web and Gemini Web sessions through a local Playwright bridge.

- Separate repository from the CLI provider project
- Supports translation and smart phonetic output
- Background bridge mode with popup/blocker guards
- Marketplace install downloads the addon only; bridge setup is still required

## License

MIT
