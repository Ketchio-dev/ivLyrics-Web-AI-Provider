# Release Notes

## Title

`Web AI Provider (ChatGPT + Gemini) v0.2.0`

## Short Description

Experimental ivLyrics addon that reuses ChatGPT Web and Gemini Web sessions through a local Playwright bridge.

## Marketplace Description

Experimental addon for ChatGPT/Gemini web sessions. Marketplace install downloads the addon only; local bridge setup is still required.

## Release Body

This is the first standalone release of the Web AI Provider for ivLyrics.

Highlights:

- Separate repository from the CLI-based provider project
- ChatGPT Web support
- Gemini Web support
- Translation and smart phonetic output
- Local Playwright bridge with background mode
- Popup guard, blocker detection, and failure screenshots

Important:

- This addon is experimental
- Marketplace install downloads only the addon JS file
- You still need to install and run `freeai-bridge`
- You must log in and save a browser session for ChatGPT or Gemini before use
