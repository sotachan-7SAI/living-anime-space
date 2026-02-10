console.log('=== voice-input.js ファイル読み込み開始 ===');

/**
 * Voice Input System v1.1
 * マイクから音声を取得してテキストに変換し、チャットに入力する
 * Web Speech API (SpeechRecognition) を使用
 */

(function() {
    console.log('🎙️ Voice Input System v1.1 読み込み開始');
    
    // ========== 定数 ==========
    const STORAGE_KEYS = {
        VOICE_INPUT_LANG: 'vrm_viewer_voice_input_lang',
        VOICE_INPUT_AUTO_SEND: 'vrm_viewer_voice_input_auto_send'
    };
    
    // ========== 状態管理 ==========
    let recognition = null;
    let isListening = false;
    let currentLang = 'ja-JP';
    let autoSend = true;
    
    // ========== ユーティリティ ==========
    function saveSetting(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
        } catch (e) {}
    }
    
    function loadSetting(key, defaultValue) {
        try {
            const saved = localStorage.getItem(key);
            return saved ? JSON.parse(saved) : defaultValue;
        } catch (e) {
            return defaultValue;
        }
    }
    
    // ========== SpeechRecognition 初期化 ==========
    function initSpeechRecognition() {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        
        if (!SpeechRecognition) {
            console.error('❌ このブラウザはWeb Speech APIに対応していません');
            return false;
        }
        
        recognition = new SpeechRecognition();
        recognition.lang = currentLang;
        recognition.continuous = false;
        recognition.interimResults = true;
        recognition.maxAlternatives = 1;
        
        recognition.onstart = () => {
            console.log('🎙️ 音声認識開始');
            isListening = true;
            updateButtonState();
        };
        
        recognition.onend = () => {
            console.log('🎙️ 音声認識終了');
            isListening = false;
            updateButtonState();
        };
        
        recognition.onresult = (event) => {
            let finalTranscript = '';
            let interimTranscript = '';
            
            for (let i = event.resultIndex; i < event.results.length; i++) {
                const result = event.results[i];
                if (result.isFinal) {
                    finalTranscript += result[0].transcript;
                } else {
                    interimTranscript += result[0].transcript;
                }
            }
            
            // チャット入力欄に表示
            const chatInput = document.getElementById('chat-input');
            if (chatInput) {
                if (finalTranscript) {
                    chatInput.value = finalTranscript.trim();
                    console.log('🎙️ 認識結果:', finalTranscript.trim());
                    
                    // 自動送信
                    if (autoSend) {
                        setTimeout(() => {
                            const chatSend = document.getElementById('chat-send');
                            if (chatSend) chatSend.click();
                        }, 200);
                    }
                } else if (interimTranscript) {
                    chatInput.value = interimTranscript;
                    chatInput.style.color = '#888';
                }
            }
        };
        
        recognition.onerror = (event) => {
            console.error('🎙️ 音声認識エラー:', event.error);
            isListening = false;
            updateButtonState();
            
            if (event.error === 'not-allowed') {
                alert('マイクの使用が許可されていません。\nブラウザの設定でマイクを許可してください。');
            }
        };
        
        console.log('✅ SpeechRecognition 初期化完了');
        return true;
    }
    
    // ========== 音声認識の開始/停止 ==========
    function toggleListening() {
        if (!recognition) {
            if (!initSpeechRecognition()) {
                alert('このブラウザは音声入力に対応していません。\nChrome、Edge、Safariをお使いください。');
                return;
            }
        }
        
        if (isListening) {
            recognition.stop();
        } else {
            try {
                recognition.lang = currentLang;
                recognition.start();
            } catch (e) {
                if (e.name === 'InvalidStateError') {
                    recognition.stop();
                    setTimeout(() => recognition.start(), 100);
                }
            }
        }
    }
    
    // ========== UI更新 ==========
    function updateButtonState() {
        const btn = document.getElementById('voice-input-btn');
        if (!btn) return;
        
        if (isListening) {
            btn.style.background = '#ff6b6b';
            btn.style.animation = 'voice-pulse 1s infinite';
            btn.textContent = '🔴';
            btn.title = '音声認識中... クリックで停止';
        } else {
            btn.style.background = '#4ecdc4';
            btn.style.animation = 'none';
            btn.textContent = '🎙️';
            btn.title = '音声入力を開始';
        }
    }
    
    // ========== UI作成 ==========
    function createUI() {
        // 既に作成済みなら終了
        if (document.getElementById('voice-input-btn')) {
            console.log('🎙️ ボタン既に存在');
            return;
        }
        
        // チャット入力コンテナを探す
        const chatInputContainer = document.querySelector('.chat-input-container');
        if (!chatInputContainer) {
            console.log('🎙️ chat-input-container が見つかりません、再試行...');
            setTimeout(createUI, 1000);
            return;
        }
        
        console.log('🎙️ UI作成開始');
        
        // 設定読み込み
        currentLang = loadSetting(STORAGE_KEYS.VOICE_INPUT_LANG, 'ja-JP');
        autoSend = loadSetting(STORAGE_KEYS.VOICE_INPUT_AUTO_SEND, true);
        
        // スタイル追加
        if (!document.getElementById('voice-input-styles')) {
            const style = document.createElement('style');
            style.id = 'voice-input-styles';
            style.textContent = `
                @keyframes voice-pulse {
                    0%, 100% { box-shadow: 0 0 0 0 rgba(255, 107, 107, 0.7); }
                    50% { box-shadow: 0 0 0 8px rgba(255, 107, 107, 0); }
                }
            `;
            document.head.appendChild(style);
        }
        
        // マイクボタン作成
        const micBtn = document.createElement('button');
        micBtn.id = 'voice-input-btn';
        micBtn.textContent = '🎙️';
        micBtn.title = '音声入力を開始';
        micBtn.style.cssText = `
            padding: 6px 10px;
            background: #4ecdc4;
            color: white;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            font-size: 14px;
            transition: all 0.3s;
            margin-left: 4px;
        `;
        micBtn.addEventListener('click', toggleListening);
        
        // 送信ボタンの後に追加
        const sendBtn = document.getElementById('chat-send');
        if (sendBtn) {
            sendBtn.parentNode.insertBefore(micBtn, sendBtn.nextSibling);
        } else {
            chatInputContainer.appendChild(micBtn);
        }
        
        // 音声入力設定セクションを追加
        createSettingsUI();
        
        console.log('✅ 音声入力 UI 作成完了');
    }
    
    function createSettingsUI() {
        const voiceSettings = document.querySelector('.voice-settings');
        if (!voiceSettings) return;
        
        // 既に存在する場合はスキップ
        if (document.getElementById('voice-input-settings')) return;
        
        const settingsDiv = document.createElement('div');
        settingsDiv.id = 'voice-input-settings';
        settingsDiv.innerHTML = `
            <div style="margin-top: 15px; padding: 10px; background: linear-gradient(135deg, rgba(78, 205, 196, 0.15) 0%, rgba(68, 160, 141, 0.15) 100%); border-radius: 8px; border: 1px solid rgba(78, 205, 196, 0.4);">
                <div style="font-size: 12px; font-weight: bold; color: #4ecdc4; margin-bottom: 8px;">
                    🎙️ 音声入力設定
                </div>
                
                <div style="margin-bottom: 8px;">
                    <label style="font-size: 10px; color: #666; display: block; margin-bottom: 4px;">認識言語:</label>
                    <select id="voice-input-lang-select" style="width: 100%; padding: 6px; border: 1px solid #4ecdc4; border-radius: 4px; font-size: 11px;">
                        <option value="ja-JP" ${currentLang === 'ja-JP' ? 'selected' : ''}>🇯🇵 日本語</option>
                        <option value="en-US" ${currentLang === 'en-US' ? 'selected' : ''}>🇺🇸 English (US)</option>
                        <option value="zh-CN" ${currentLang === 'zh-CN' ? 'selected' : ''}>🇨🇳 中文</option>
                        <option value="ko-KR" ${currentLang === 'ko-KR' ? 'selected' : ''}>🇰🇷 한국어</option>
                    </select>
                </div>
                
                <label style="display: flex; align-items: center; gap: 6px; font-size: 10px; color: #666; cursor: pointer;">
                    <input type="checkbox" id="voice-input-auto-send-check" ${autoSend ? 'checked' : ''} style="accent-color: #4ecdc4;">
                    認識後に自動送信
                </label>
                
                <div style="font-size: 9px; color: #888; margin-top: 8px;">
                    💡 チャット入力欄の🎙️ボタンで音声入力開始
                </div>
            </div>
        `;
        
        voiceSettings.appendChild(settingsDiv);
        
        // イベントリスナー
        document.getElementById('voice-input-lang-select')?.addEventListener('change', (e) => {
            currentLang = e.target.value;
            saveSetting(STORAGE_KEYS.VOICE_INPUT_LANG, currentLang);
            if (recognition) recognition.lang = currentLang;
            console.log('🎙️ 言語変更:', currentLang);
        });
        
        document.getElementById('voice-input-auto-send-check')?.addEventListener('change', (e) => {
            autoSend = e.target.checked;
            saveSetting(STORAGE_KEYS.VOICE_INPUT_AUTO_SEND, autoSend);
            console.log('🎙️ 自動送信:', autoSend ? 'ON' : 'OFF');
        });
    }
    
    // ========== 初期化 ==========
    function init() {
        console.log('🎙️ Voice Input System 初期化');
        createUI();
        setTimeout(() => initSpeechRecognition(), 500);
    }
    
    // ========== エントリーポイント ==========
    // 他のスクリプトが読み込まれた後に実行
    setTimeout(init, 3000);
    
    // DOMContentLoaded後にも再試行
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => setTimeout(init, 3500));
    }
    
    // window.load後にも再試行
    window.addEventListener('load', () => setTimeout(init, 4000));
    
    // ========== グローバルAPI ==========
    window.VoiceInput = {
        start: () => { if (!isListening) toggleListening(); },
        stop: () => { if (isListening && recognition) recognition.stop(); },
        toggle: toggleListening,
        isListening: () => isListening,
        setLanguage: (lang) => { currentLang = lang; if (recognition) recognition.lang = lang; }
    };
    
    console.log('✅ Voice Input System v1.1 読み込み完了');
})();
