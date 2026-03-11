/**
 * Web AI Provider for ivLyrics
 * Browser-automation bridge for ChatGPT Web and Gemini Web.
 *
 * @author Ketchio-dev
 * @version 0.2.0
 */

(() => {
    'use strict';

    const ADDON_INFO = {
        id: 'freeaiprovider',
        name: 'Web AI Provider / 웹 AI 제공자 (ChatGPT + Gemini)',
        author: 'Ketchio-dev',
        description: {
            ko: 'ChatGPT와 Gemini 웹 로그인을 로컬 브리지로 자동화해 번역/발음을 제공합니다.',
            en: 'Provides translation and pronunciation by automating ChatGPT and Gemini web sessions through a local bridge.',
        },
        version: '0.2.0',
        supports: {
            translate: true,
            metadata: false,
            tmi: false,
        },
    };

    const DEFAULT_BRIDGE_URL = 'http://127.0.0.1:19333';
    const PROVIDER_FALLBACKS = [
        { id: 'chatgpt', name: 'ChatGPT' },
        { id: 'gemini', name: 'Gemini' },
    ];

    const LANGUAGE_DATA = {
        ko: { name: 'Korean', native: '한국어', phoneticDesc: 'Korean Hangul pronunciation' },
        en: { name: 'English', native: 'English', phoneticDesc: 'Latin alphabet romanization' },
        'zh-CN': { name: 'Simplified Chinese', native: '简体中文', phoneticDesc: 'Simplified Chinese pronunciation' },
        'zh-TW': { name: 'Traditional Chinese', native: '繁體中文', phoneticDesc: 'Traditional Chinese pronunciation' },
        ja: { name: 'Japanese', native: '日本語', phoneticDesc: 'Japanese Katakana pronunciation' },
        hi: { name: 'Hindi', native: 'हिन्दी', phoneticDesc: 'Hindi Devanagari pronunciation' },
        es: { name: 'Spanish', native: 'Español', phoneticDesc: 'Spanish phonetic spelling' },
        fr: { name: 'French', native: 'Français', phoneticDesc: 'French phonetic spelling' },
        ar: { name: 'Arabic', native: 'العربية', phoneticDesc: 'Arabic script pronunciation' },
        fa: { name: 'Persian', native: 'فارسی', phoneticDesc: 'Persian script pronunciation' },
        de: { name: 'German', native: 'Deutsch', phoneticDesc: 'German phonetic spelling' },
        ru: { name: 'Russian', native: 'Русский', phoneticDesc: 'Russian Cyrillic pronunciation' },
        pt: { name: 'Portuguese', native: 'Português', phoneticDesc: 'Portuguese phonetic spelling' },
        bn: { name: 'Bengali', native: 'বাংলা', phoneticDesc: 'Bengali script pronunciation' },
        it: { name: 'Italian', native: 'Italiano', phoneticDesc: 'Italian phonetic spelling' },
        th: { name: 'Thai', native: 'ไทย', phoneticDesc: 'Thai script pronunciation' },
        vi: { name: 'Vietnamese', native: 'Tiếng Việt', phoneticDesc: 'Vietnamese phonetic spelling' },
        id: { name: 'Indonesian', native: 'Bahasa Indonesia', phoneticDesc: 'Indonesian phonetic spelling' },
    };

    function normalizeBridgeUrl(rawValue) {
        const value = String(rawValue || '').trim();
        if (!value) return DEFAULT_BRIDGE_URL;
        try {
            const url = new URL(value);
            if (!/^https?:$/.test(url.protocol)) return DEFAULT_BRIDGE_URL;
            url.pathname = '';
            url.search = '';
            url.hash = '';
            return url.origin;
        } catch {
            return DEFAULT_BRIDGE_URL;
        }
    }

    function getLocalizedText(textObj, lang) {
        if (typeof textObj === 'string') return textObj;
        return textObj?.[lang] || textObj?.en || Object.values(textObj || {})[0] || '';
    }

    function bi(en, ko) {
        return `${en} / ${ko}`;
    }

    function getSetting(key, defaultValue = null) {
        return window.AIAddonManager?.getAddonSetting(ADDON_INFO.id, key, defaultValue) ?? defaultValue;
    }

    function setSetting(key, value) {
        window.AIAddonManager?.setAddonSetting(ADDON_INFO.id, key, value);
    }

    function getBridgeUrl() {
        return normalizeBridgeUrl(getSetting('bridge-url', DEFAULT_BRIDGE_URL));
    }

    function getSelectedProvider() {
        return String(getSetting('provider', 'chatgpt') || 'chatgpt').trim().toLowerCase();
    }

    function getLangInfo(lang) {
        if (!lang) return LANGUAGE_DATA.en;
        const shortLang = String(lang).split('-')[0].toLowerCase();
        return LANGUAGE_DATA[lang] || LANGUAGE_DATA[shortLang] || LANGUAGE_DATA.en;
    }

    function buildTranslationPrompt(text, lang) {
        const langInfo = getLangInfo(lang);
        const lineCount = text.split('\n').length;

        return `You are a lyrics translator. Translate these ${lineCount} lines of song lyrics into ${langInfo.name} (${langInfo.native}).

RULES:
- Output EXACTLY ${lineCount} lines, one translation per line
- Keep empty lines as empty
- Keep symbols like [Chorus], (Yeah), and ♪ as-is
- Do NOT add numbering, quotes, notes, or explanations
- Do NOT use markdown or code blocks
- Return only the translated lines

INPUT:
${text}`;
    }

    function buildPhoneticPrompt(text, lang) {
        const langInfo = getLangInfo(lang);
        const lineCount = text.split('\n').length;

        return `Convert these ${lineCount} lines of lyrics into pronunciation for ${langInfo.name} speakers.

RULES:
- Output EXACTLY ${lineCount} lines, one pronunciation per line
- Keep empty lines as empty
- Keep symbols like [Chorus], (Yeah), and ♪ as-is
- Do NOT translate the meaning
- Do NOT add numbering, quotes, notes, or explanations
- Do NOT use markdown or code blocks
- Use ${langInfo.phoneticDesc}
- Return only the pronunciation lines

INPUT:
${text}`;
    }

    function parseTextLines(text, expectedLineCount) {
        const cleaned = String(text || '')
            .replace(/```[a-z]*\s*/gi, '')
            .replace(/```\s*/g, '')
            .trim();
        const lines = cleaned.split('\n');

        if (lines.length === expectedLineCount) {
            return lines;
        }
        if (lines.length > expectedLineCount) {
            return lines.slice(-expectedLineCount);
        }
        while (lines.length < expectedLineCount) {
            lines.push('');
        }
        return lines;
    }

    async function requestBridge(path, body) {
        const response = await fetch(`${getBridgeUrl()}${path}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
            throw new Error(data.error || `HTTP ${response.status}`);
        }
        return data;
    }

    async function getBridgeProviders() {
        try {
            const response = await fetch(`${getBridgeUrl()}/providers`);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const data = await response.json();
            return Array.isArray(data.providers) && data.providers.length > 0 ? data.providers : PROVIDER_FALLBACKS;
        } catch {
            return PROVIDER_FALLBACKS;
        }
    }

    async function generate(prompt) {
        const provider = getSelectedProvider();
        const data = await requestBridge('/generate', { provider, prompt });
        if (!data.text) {
            throw new Error('Empty response from bridge');
        }
        return data.text;
    }

    const FreeAIproviderAddon = {
        ...ADDON_INFO,

        getSettingsUI() {
            const React = Spicetify.React;
            const { useState, useEffect, useCallback } = React;

            return function FreeAIproviderSettings() {
                const isWindows = /win/i.test(navigator.platform || '');
                const repoUrl = 'https://github.com/Ketchio-dev/ivLyrics-Web-AI-Provider';
                const setupCommand = isWindows
                    ? '$u = "https://raw.githubusercontent.com/Ketchio-dev/ivLyrics-Web-AI-Provider/main/install.ps1"; & ([ScriptBlock]::Create((Invoke-WebRequest -UseBasicParsing $u).Content)) -Bridge -StartBridge -NoApply'
                    : 'curl -fsSL https://raw.githubusercontent.com/Ketchio-dev/ivLyrics-Web-AI-Provider/main/install.sh | bash -s -- --bridge --start-bridge --no-apply';
                const startCommand = isWindows
                    ? '$u = "https://raw.githubusercontent.com/Ketchio-dev/ivLyrics-Web-AI-Provider/main/install.ps1"; & ([ScriptBlock]::Create((Invoke-WebRequest -UseBasicParsing $u).Content)) -StartBridge -NoApply'
                    : 'curl -fsSL https://raw.githubusercontent.com/Ketchio-dev/ivLyrics-Web-AI-Provider/main/install.sh | bash -s -- --start-bridge --no-apply';
                const [bridgeUrl, setBridgeUrl] = useState(getBridgeUrl());
                const [provider, setProvider] = useState(getSelectedProvider());
                const [availableProviders, setAvailableProviders] = useState(PROVIDER_FALLBACKS);
                const [status, setStatus] = useState(bi('Checking local bridge...', '로컬 브리지 확인 중...'));
                const [authStatus, setAuthStatus] = useState('');
                const [testStatus, setTestStatus] = useState('');
                const [loadingProviders, setLoadingProviders] = useState(false);

                const refreshProviders = useCallback(async () => {
                    setLoadingProviders(true);
                    try {
                        const providers = await getBridgeProviders();
                        setAvailableProviders(providers);
                    } finally {
                        setLoadingProviders(false);
                    }
                }, []);

                const refreshHealth = useCallback(async () => {
                    try {
                        const response = await fetch(`${bridgeUrl}/health`);
                        if (!response.ok) throw new Error(`HTTP ${response.status}`);
                        const data = await response.json();
                        const providerState = data.providers?.[provider];
                        if (providerState) {
                            setStatus(
                                bi(
                                    `Running. Session saved: ${providerState.hasSavedSession ? 'yes' : 'no'} / Login window: ${providerState.authWindowOpen ? 'open' : 'closed'}`,
                                    `실행 중. 세션 저장: ${providerState.hasSavedSession ? '예' : '아니오'} / 로그인 창: ${providerState.authWindowOpen ? '열림' : '닫힘'}`
                                )
                            );
                        } else {
                            setStatus(bi('Bridge is running.', '브리지가 실행 중입니다.'));
                        }
                    } catch {
                        setStatus(
                            bi(
                                `Bridge not running at ${bridgeUrl}. Marketplace install only adds the addon. You still need to install and start freeai-bridge.`,
                                `${bridgeUrl}에서 브리지를 찾을 수 없습니다. 마켓플레이스 설치는 애드온만 추가합니다. freeai-bridge를 별도로 설치하고 실행해야 합니다.`
                            )
                        );
                    }
                }, [bridgeUrl, provider]);

                useEffect(() => {
                    refreshProviders();
                    refreshHealth();
                }, [refreshProviders, refreshHealth]);

                const handleBridgeUrlChange = (event) => {
                    const value = normalizeBridgeUrl(event.target.value);
                    setBridgeUrl(value);
                    setSetting('bridge-url', value);
                };

                const handleProviderChange = (event) => {
                    const value = event.target.value;
                    setProvider(value);
                    setSetting('provider', value);
                };

                const handleOpenLogin = async () => {
                    setAuthStatus(bi('Opening login window...', '로그인 창 여는 중...'));
                    try {
                        await requestBridge('/auth/open', { provider });
                        setAuthStatus(
                            bi(
                                'Login window opened. Finish login in the browser, then click Save Session.',
                                '로그인 창이 열렸습니다. 브라우저에서 로그인한 뒤 Save Session을 누르세요.'
                            )
                        );
                    } catch (error) {
                        setAuthStatus(bi(`Failed: ${error.message}`, `실패: ${error.message}`));
                    } finally {
                        refreshHealth().catch(() => {});
                    }
                };

                const handleSaveSession = async () => {
                    setAuthStatus(bi('Saving session...', '세션 저장 중...'));
                    try {
                        await requestBridge('/auth/complete', { provider });
                        setAuthStatus(bi('Session saved.', '세션이 저장되었습니다.'));
                    } catch (error) {
                        setAuthStatus(bi(`Failed: ${error.message}`, `실패: ${error.message}`));
                    } finally {
                        refreshHealth().catch(() => {});
                    }
                };

                const handleCancelLogin = async () => {
                    setAuthStatus(bi('Closing login window...', '로그인 창 닫는 중...'));
                    try {
                        await requestBridge('/auth/cancel', { provider });
                        setAuthStatus(bi('Login window closed.', '로그인 창을 닫았습니다.'));
                    } catch (error) {
                        setAuthStatus(bi(`Failed: ${error.message}`, `실패: ${error.message}`));
                    } finally {
                        refreshHealth().catch(() => {});
                    }
                };

                const handleTest = async () => {
                    setTestStatus(bi('Testing...', '테스트 중...'));
                    try {
                        const result = await generate('Reply with OK only.');
                        setTestStatus(result ? bi(`OK: ${result}`, `정상: ${result}`) : bi('Empty response', '응답이 비어 있습니다.'));
                    } catch (error) {
                        setTestStatus(bi(`Failed: ${error.message}`, `실패: ${error.message}`));
                    }
                };

                const handleCopy = async (text) => {
                    try {
                        await navigator.clipboard.writeText(text);
                        Spicetify.showNotification?.(bi('Copied', '복사됨'));
                    } catch {
                        Spicetify.showNotification?.(bi('Copy failed', '복사 실패'));
                    }
                };

                const commandBoxStyle = {
                    fontSize: '11px',
                    padding: '6px 10px',
                    backgroundColor: 'rgba(0, 0, 0, 0.3)',
                    borderRadius: '4px',
                    flex: '1',
                    minWidth: '220px',
                    userSelect: 'all',
                    cursor: 'text',
                    whiteSpace: 'normal',
                    wordBreak: 'break-all'
                };

                return React.createElement('div', { className: 'ai-addon-settings freeai-settings' },
                    React.createElement('div', {
                        className: 'ai-addon-notice',
                        style: {
                            padding: '12px',
                            marginBottom: '16px',
                            backgroundColor: 'rgba(255, 255, 255, 0.05)',
                            borderRadius: '4px',
                            fontSize: '12px',
                            lineHeight: '1.5'
                        }
                    },
                        React.createElement('strong', null, bi('Before use:', '사용 전에 확인:')),
                        React.createElement('div', { style: { marginTop: '6px' } }, bi('1. Install and start freeai-bridge with this command:', '1. 아래 명령으로 freeai-bridge를 설치하고 실행하세요:')),
                        React.createElement('div', {
                            style: { display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px', flexWrap: 'wrap' }
                        },
                            React.createElement('code', { style: commandBoxStyle }, setupCommand),
                            React.createElement('button', {
                                className: 'ai-addon-btn-secondary',
                                onClick: () => handleCopy(setupCommand)
                            }, bi('Copy', '복사'))
                        ),
                        React.createElement('div', { style: { marginTop: '8px' } }, bi('2. If it is already installed, restart the bridge with this command:', '2. 이미 설치되어 있다면 아래 명령으로 브리지를 다시 실행하세요:')),
                        React.createElement('div', {
                            style: { display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px', flexWrap: 'wrap' }
                        },
                            React.createElement('code', { style: commandBoxStyle }, startCommand),
                            React.createElement('button', {
                                className: 'ai-addon-btn-secondary',
                                onClick: () => handleCopy(startCommand)
                            }, bi('Copy', '복사'))
                        ),
                        React.createElement('div', { style: { marginTop: '8px' } }, bi('3. Choose ChatGPT or Gemini below', '3. 아래에서 ChatGPT 또는 Gemini를 선택하세요')),
                        React.createElement('div', null, bi('4. Click Open Login Window and sign in', '4. Open Login Window를 눌러 로그인하세요')),
                        React.createElement('div', null, bi('5. Click Save Session', '5. Save Session을 누르세요')),
                        React.createElement('div', { style: { marginTop: '8px' } }, bi('Repository:', '저장소:')),
                        React.createElement('div', {
                            style: { display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px', flexWrap: 'wrap' }
                        },
                            React.createElement('code', { style: commandBoxStyle }, repoUrl),
                            React.createElement('button', {
                                className: 'ai-addon-btn-secondary',
                                onClick: () => handleCopy(repoUrl)
                            }, bi('Copy', '복사'))
                        ),
                        React.createElement('div', { style: { marginTop: '8px', opacity: 0.8 } }, bi('Marketplace install downloads only the addon file. The local bridge is still required.', '마켓플레이스 설치는 애드온 파일만 내려받습니다. 로컬 브리지는 별도로 필요합니다.'))
                    ),
                    React.createElement('div', { className: 'ai-addon-setting' },
                        React.createElement('label', null, bi('Bridge URL', '브리지 URL')),
                        React.createElement('input', {
                            type: 'text',
                            value: bridgeUrl,
                            onChange: handleBridgeUrlChange,
                            placeholder: DEFAULT_BRIDGE_URL,
                        }),
                        React.createElement('small', null, bi('Run the local bridge server first. Default: http://127.0.0.1:19333', '먼저 로컬 브리지 서버를 실행하세요. 기본값: http://127.0.0.1:19333'))
                    ),
                    React.createElement('div', { className: 'ai-addon-setting' },
                        React.createElement('label', null, bi('Provider', '제공자')),
                        React.createElement('div', { className: 'ai-addon-input-group' },
                            React.createElement('select', {
                                value: provider,
                                onChange: handleProviderChange,
                                disabled: loadingProviders,
                            },
                                availableProviders.map((item) => React.createElement('option', {
                                    key: item.id,
                                    value: item.id,
                                }, item.name || item.id))
                            ),
                            React.createElement('button', {
                                className: 'ai-addon-btn-secondary',
                                onClick: refreshProviders,
                            }, loadingProviders ? '...' : bi('Refresh', '새로고침'))
                        ),
                        React.createElement('small', null, status)
                    ),
                    React.createElement('div', { className: 'ai-addon-setting' },
                        React.createElement('div', { style: { display: 'flex', gap: '8px', flexWrap: 'wrap' } },
                            React.createElement('button', {
                                className: 'ai-addon-btn-primary',
                                onClick: handleOpenLogin,
                            }, bi('Open Login Window', '로그인 창 열기')),
                            React.createElement('button', {
                                className: 'ai-addon-btn-secondary',
                                onClick: handleSaveSession,
                            }, bi('Save Session', '세션 저장')),
                            React.createElement('button', {
                                className: 'ai-addon-btn-secondary',
                                onClick: handleCancelLogin,
                            }, bi('Cancel Login', '로그인 취소'))
                        ),
                        authStatus && React.createElement('small', null, authStatus)
                    ),
                    React.createElement('div', { className: 'ai-addon-setting' },
                        React.createElement('button', {
                            className: 'ai-addon-btn-primary',
                            onClick: handleTest,
                        }, bi('Test Bridge', '브리지 테스트')),
                        testStatus && React.createElement('small', null, testStatus)
                    ),
                    React.createElement('div', { className: 'ai-addon-setting' },
                        React.createElement('small', null, bi('This addon is experimental. Web UI changes, captcha, or session expiry can break it at any time.', '이 애드온은 실험적입니다. 웹 UI 변경, 캡차, 세션 만료로 언제든지 동작이 깨질 수 있습니다.'))
                    )
                );
            };
        },

        async translateLyrics({ text, lang, wantSmartPhonetic }) {
            if (!text?.trim()) {
                throw new Error('No text provided');
            }

            const expectedLineCount = text.split('\n').length;
            const prompt = wantSmartPhonetic
                ? buildPhoneticPrompt(text, lang)
                : buildTranslationPrompt(text, lang);
            const rawResponse = await generate(prompt);
            const lines = parseTextLines(rawResponse, expectedLineCount);

            if (wantSmartPhonetic) {
                return { phonetic: lines };
            }
            return { translation: lines };
        },
    };

    const registerAddon = () => {
        if (window.AIAddonManager) {
            window.AIAddonManager.register(FreeAIproviderAddon);
        } else {
            setTimeout(registerAddon, 100);
        }
    };

    registerAddon();

    window.__ivLyricsDebugLog?.('[Web AI Provider] Module loaded');
})();
