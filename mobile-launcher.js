// ========================================
// 📱 スマホ用クイックランチャー v1.4
// ========================================
// + API設定画面をランチャー内に直接表示
// + マルチキャラクター全員オミット
// + 全UI完全非表示
// ========================================

(function() {
    'use strict';

    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || 
                     (window.innerWidth <= 768 && 'ontouchstart' in window);
    const forceMode = new URLSearchParams(window.location.search).get('mobile') === 'true';

    if (!isMobile && !forceMode) {
        console.log('📱 スマホランチャー: PCモードのためスキップ');
        return;
    }

    console.log('📱 スマホ用クイックランチャー v1.4 初期化中...');

    // ========================================
    // API設定のlocalStorageキー定義
    // ========================================
    const API_CONFIGS = [
        { key: 'openai_api_key', name: 'OpenAI', icon: '🤖', placeholder: 'sk-...', desc: 'ChatGPT・TTS' },
        { key: 'grok_api_key', name: 'Grok (xAI)', icon: '⚡', placeholder: 'xai-...', desc: '音声会話' },
        { key: 'gemini_api_key', name: 'Google', icon: '🔍', placeholder: 'AIzaSy...', desc: 'Gemini・TTS', key2: 'banana_api_key' },
        { key: 'tripo_api_key', name: 'Tripo3D', icon: '🎨', placeholder: 'tsk_...', desc: '3D生成（任意）' },
    ];

    // ========================================
    // スタイル
    // ========================================
    const style = document.createElement('style');
    style.textContent = `
        #mobile-launcher-overlay {
            position: fixed;
            top: 0; left: 0; right: 0; bottom: 0;
            background: rgba(0, 0, 0, 0.9);
            z-index: 999999;
            display: flex;
            flex-direction: column;
            justify-content: flex-start;
            align-items: center;
            font-family: 'Segoe UI', 'Yu Gothic', 'Meiryo', sans-serif;
            animation: mlFadeIn 0.3s ease;
            overflow-y: auto;
            padding: 40px 20px 40px;
            -webkit-overflow-scrolling: touch;
        }
        @keyframes mlFadeIn { from { opacity: 0; } to { opacity: 1; } }

        #mobile-launcher-overlay .ml-container {
            width: 100%; max-width: 340px; text-align: center;
        }
        #mobile-launcher-overlay .ml-logo { font-size: 48px; margin-bottom: 8px; }
        #mobile-launcher-overlay .ml-title {
            font-size: 24px; font-weight: bold; color: #fff; margin-bottom: 4px;
        }
        #mobile-launcher-overlay .ml-subtitle {
            font-size: 12px; color: #999; margin-bottom: 28px;
        }
        #mobile-launcher-overlay .ml-desc {
            font-size: 11px; color: #666; margin-top: -4px; margin-bottom: 14px;
        }
        #mobile-launcher-overlay .ml-btn {
            display: flex; align-items: center; justify-content: center;
            width: 100%; padding: 16px 20px; margin-bottom: 12px;
            border: none; border-radius: 14px; font-size: 15px; font-weight: bold;
            cursor: pointer; -webkit-tap-highlight-color: transparent;
            transition: transform 0.12s; gap: 8px;
        }
        #mobile-launcher-overlay .ml-btn:active { transform: scale(0.96); }
        #mobile-launcher-overlay .ml-btn-primary {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white; box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
            font-size: 17px; padding: 18px 20px;
        }
        #mobile-launcher-overlay .ml-btn-grok {
            background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%);
            color: white; box-shadow: 0 4px 15px rgba(17, 153, 142, 0.4);
        }
        #mobile-launcher-overlay .ml-btn-secondary {
            background: rgba(255, 255, 255, 0.08);
            color: #bbb; border: 1px solid rgba(255, 255, 255, 0.15);
        }
        #mobile-launcher-overlay .ml-btn-small {
            padding: 12px 16px; font-size: 13px; font-weight: normal;
        }
        #mobile-launcher-overlay .ml-btn-save {
            background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
            color: white; box-shadow: 0 4px 15px rgba(240, 147, 251, 0.4);
        }
        #mobile-launcher-overlay .ml-divider {
            border: none; border-top: 1px solid rgba(255, 255, 255, 0.1); margin: 18px 0;
        }
        #mobile-launcher-overlay .ml-section-label {
            font-size: 10px; color: #666; text-transform: uppercase;
            letter-spacing: 1.5px; margin-bottom: 10px;
        }
        #mobile-launcher-overlay .ml-btn-row {
            display: flex; gap: 10px;
        }
        #mobile-launcher-overlay .ml-btn-row .ml-btn { flex: 1; }

        /* API設定フォーム */
        #ml-api-section {
            display: none;
            text-align: left;
            margin-top: 4px;
        }
        #ml-api-section.visible { display: block; }

        .ml-api-item {
            margin-bottom: 12px;
        }
        .ml-api-label {
            display: flex; align-items: center; gap: 6px;
            font-size: 13px; font-weight: bold; color: #ddd;
            margin-bottom: 4px;
        }
        .ml-api-label .ml-api-desc {
            font-weight: normal; font-size: 11px; color: #888;
        }
        .ml-api-input {
            width: 100%; padding: 12px 14px;
            background: rgba(255,255,255,0.08);
            border: 1px solid rgba(255,255,255,0.15);
            border-radius: 10px;
            color: #fff; font-size: 14px;
            outline: none;
            -webkit-appearance: none;
            box-sizing: border-box;
        }
        .ml-api-input:focus {
            border-color: #667eea;
            box-shadow: 0 0 0 2px rgba(102, 126, 234, 0.3);
        }
        .ml-api-input::placeholder { color: #555; }
        .ml-api-saved {
            border-color: #38ef7d !important;
        }
        .ml-api-status {
            font-size: 11px; color: #38ef7d; margin-top: 3px;
            display: none;
        }
        .ml-api-status.visible { display: block; }

        /* フローティングボタン */
        #mobile-ui-manager-btn {
            position: fixed; bottom: 20px; right: 20px;
            width: 52px; height: 52px; border-radius: 50%;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white; border: 2px solid rgba(255,255,255,0.2);
            font-size: 22px; cursor: pointer; z-index: 99998;
            box-shadow: 0 4px 20px rgba(102, 126, 234, 0.5);
            display: none; justify-content: center; align-items: center;
            -webkit-tap-highlight-color: transparent;
        }
        #mobile-ui-manager-btn:active { transform: scale(0.88); }

        #mobile-grok-btn {
            position: fixed; bottom: 20px; left: 20px;
            width: 52px; height: 52px; border-radius: 50%;
            background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%);
            color: white; border: 2px solid rgba(255,255,255,0.2);
            font-size: 22px; cursor: pointer; z-index: 99998;
            box-shadow: 0 4px 20px rgba(17, 153, 142, 0.5);
            display: none; justify-content: center; align-items: center;
            -webkit-tap-highlight-color: transparent;
            transition: transform 0.15s, background 0.3s;
        }
        #mobile-grok-btn:active { transform: scale(0.88); }
        #mobile-grok-btn.active {
            background: linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%);
            border-color: rgba(255,100,100,0.4);
            box-shadow: 0 4px 20px rgba(238, 90, 36, 0.5);
            animation: grokPulse 2s infinite;
        }
        @keyframes grokPulse {
            0%, 100% { box-shadow: 0 4px 20px rgba(238, 90, 36, 0.5); }
            50% { box-shadow: 0 4px 30px rgba(238, 90, 36, 0.8); }
        }
    `;
    document.head.appendChild(style);

    // ========================================
    // ランチャーUI
    // ========================================
    function createLauncher() {
        // API入力欄HTML生成
        let apiFieldsHTML = '';
        API_CONFIGS.forEach(api => {
            const saved = localStorage.getItem(api.key) || '';
            const hasSaved = saved.length > 5;
            apiFieldsHTML += `
                <div class="ml-api-item">
                    <div class="ml-api-label">
                        ${api.icon} ${api.name}
                        <span class="ml-api-desc">${api.desc}</span>
                    </div>
                    <input type="text" class="ml-api-input ${hasSaved ? 'ml-api-saved' : ''}"
                           id="ml-api-${api.key}"
                           placeholder="${api.placeholder}"
                           value="${hasSaved ? saved : ''}"
                           autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false">
                    <div class="ml-api-status ${hasSaved ? 'visible' : ''}" id="ml-api-status-${api.key}">
                        ✅ 保存済み
                    </div>
                </div>
            `;
        });

        const overlay = document.createElement('div');
        overlay.id = 'mobile-launcher-overlay';
        overlay.innerHTML = `
            <div class="ml-container">
                <div class="ml-logo">🎭</div>
                <div class="ml-title">Living Anime Space</div>
                <div class="ml-subtitle">VRM AI チャットビューアー</div>

                <div id="ml-main-buttons">
                    <button class="ml-btn ml-btn-primary" id="ml-btn-start">
                        🚀 開始する
                    </button>
                    <div class="ml-desc">UIは非表示で開始。右下 📋 からUI管理できます</div>

                    <button class="ml-btn ml-btn-grok" id="ml-btn-grok">
                        🎙️ Grok Voice で音声会話
                    </button>

                    <hr class="ml-divider">
                    <div class="ml-section-label">設定</div>

                    <button class="ml-btn ml-btn-secondary" id="ml-btn-api">
                        🔑 APIキーを設定する
                    </button>

                    <button class="ml-btn ml-btn-secondary ml-btn-small" id="ml-btn-skip">
                        ⏭️ スキップ（そのまま開始）
                    </button>
                </div>

                <div id="ml-api-section">
                    <div class="ml-section-label" style="margin-bottom:16px;">🔑 APIキー設定</div>
                    ${apiFieldsHTML}
                    <button class="ml-btn ml-btn-save" id="ml-api-save">
                        💾 保存して戻る
                    </button>
                    <button class="ml-btn ml-btn-secondary ml-btn-small" id="ml-api-back">
                        ← 戻る
                    </button>
                    <div class="ml-desc" style="margin-top:8px;">
                        キーはブラウザのlocalStorageに保存されます（サーバーには送信されません）
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);

        // フローティングボタン
        const uiBtn = document.createElement('button');
        uiBtn.id = 'mobile-ui-manager-btn';
        uiBtn.innerHTML = '📋';
        document.body.appendChild(uiBtn);

        const grokBtn = document.createElement('button');
        grokBtn.id = 'mobile-grok-btn';
        grokBtn.innerHTML = '🎙️';
        document.body.appendChild(grokBtn);

        // ========================================
        // イベント
        // ========================================

        document.getElementById('ml-btn-start').addEventListener('click', () => startApp(false));
        document.getElementById('ml-btn-grok').addEventListener('click', () => startApp(true));
        document.getElementById('ml-btn-skip').addEventListener('click', () => {
            closeLauncher(); showFloatingButtons();
        });

        // API設定画面の表示切替
        document.getElementById('ml-btn-api').addEventListener('click', () => {
            document.getElementById('ml-main-buttons').style.display = 'none';
            document.getElementById('ml-api-section').classList.add('visible');
            // 最初の入力欄にフォーカス
            const firstInput = document.querySelector('.ml-api-input');
            if (firstInput) setTimeout(() => firstInput.focus(), 100);
        });

        document.getElementById('ml-api-save').addEventListener('click', () => saveApiKeys());
        document.getElementById('ml-api-back').addEventListener('click', () => {
            saveApiKeys();
            showMainButtons();
        });

        uiBtn.addEventListener('click', toggleUIManagerPanel);
        grokBtn.addEventListener('click', toggleGrokVoice);
    }

    // ========================================
    // APIキー保存
    // ========================================
    function saveApiKeys() {
        API_CONFIGS.forEach(api => {
            const input = document.getElementById(`ml-api-${api.key}`);
            const status = document.getElementById(`ml-api-status-${api.key}`);
            if (!input) return;

            const val = input.value.trim();
            if (val.length > 5) {
                localStorage.setItem(api.key, val);
                // 副キーがある場合（Google → banana_api_key）
                if (api.key2) localStorage.setItem(api.key2, val);
                input.classList.add('ml-api-saved');
                if (status) { status.textContent = '✅ 保存しました'; status.classList.add('visible'); }
            } else if (val === '') {
                localStorage.removeItem(api.key);
                if (api.key2) localStorage.removeItem(api.key2);
                input.classList.remove('ml-api-saved');
                if (status) status.classList.remove('visible');
            }
        });
        console.log('📱 APIキー保存完了');
    }

    function showMainButtons() {
        document.getElementById('ml-main-buttons').style.display = '';
        document.getElementById('ml-api-section').classList.remove('visible');
    }

    // ========================================
    // アプリ開始
    // ========================================
    function startApp(enableGrokVoice) {
        closeLauncher();
        showFloatingButtons();

        setTimeout(() => {
            nukeAllUI();
            disableAllMultiCharacters();
        }, 500);
        setTimeout(() => nukeAllUI(), 2000);
        setTimeout(() => nukeAllUI(), 5000);

        if (enableGrokVoice) {
            setTimeout(() => activateGrokVoice(), 3000);
        }
    }

    function showFloatingButtons() {
        document.getElementById('mobile-ui-manager-btn').style.display = 'flex';
        document.getElementById('mobile-grok-btn').style.display = 'flex';
    }

    function closeLauncher() {
        const overlay = document.getElementById('mobile-launcher-overlay');
        if (overlay) {
            overlay.style.opacity = '0';
            overlay.style.transition = 'opacity 0.2s ease';
            setTimeout(() => overlay.remove(), 200);
        }
    }

    // ========================================
    // 全UI完全非表示
    // ========================================
    function nukeAllUI() {
        const panelIds = [
            'left-panel', 'right-panel', 'chat-panel', 'morph-panel',
            'multi-character-panel', 'supervisor-panel', 'ai-director-panel',
            'pipeline-monitor-panel', 'emotion-memory-panel',
            'imagination-panel', 'imagination-wipe-container',
            'background-panel', 'music-panel', 'ai-background-panel',
            'auto-camera-panel', 'camera-setting-panel', 'ai-cinematographer-panel',
            'sbv2-panel', 'local-music-panel', 'local-bgm-panel',
            'api-settings-panel-container', 'api-settings-panel',
            'startup-settings-panel', 'behavior-panel', 'touch-panel',
            'subtitle-settings-panel', 'environment-3d-panel',
            'grok-vision-controls', 'grok-vision-preview',
            'grok-tool-restrictions-panel', 'grok-restriction-panel',
            'screen-capture-panel', 'screen-tv-panel',
            'bbs-panel', 'ai-bbs-panel',
            'motion-float-panel', 'hy-motion-panel',
            'scenario-selector-panel', 'size-panel',
            'action-panel', 'auto-saver-panel',
            'effects-panel', 'spatial-effects-panel',
            'env-inner-panel', 'story-panel',
            'initial-settings-panel', 'body-morph-panel',
            'vmc-panel', 'vmc-protocol-panel',
            'panel-control-buttons', 'control-buttons-container',
            'bottom-left-controls', 'bottom-right-controls',
            'physics-panel', 'physics-toggle-container',
            'api-settings-toggle', 'drop-overlay', 'ui-manager-panel',
        ];
        panelIds.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.style.display = 'none';
        });

        // position:fixed/absolute の要素を全て非表示
        document.querySelectorAll('*').forEach(el => {
            if (el.id === 'mobile-ui-manager-btn' || el.id === 'mobile-grok-btn') return;
            if (el.id === 'mobile-launcher-overlay') return;
            if (el.tagName === 'CANVAS' || el.tagName === 'SCRIPT' || el.tagName === 'STYLE' || el.tagName === 'LINK') return;
            if (el.tagName === 'HTML' || el.tagName === 'BODY' || el.tagName === 'HEAD') return;

            const computed = window.getComputedStyle(el);
            if (computed.position === 'fixed' || computed.position === 'absolute') {
                const rect = el.getBoundingClientRect();
                if (rect.width > 0 && rect.height > 0) {
                    el.style.display = 'none';
                }
            }
        });

        // 自分のボタン復元
        const uiBtn = document.getElementById('mobile-ui-manager-btn');
        const grokBtn = document.getElementById('mobile-grok-btn');
        if (uiBtn) uiBtn.style.display = 'flex';
        if (grokBtn) grokBtn.style.display = 'flex';
    }

    // ========================================
    // マルチキャラクター全員無効化
    // ========================================
    function disableAllMultiCharacters() {
        let attempts = 0;
        const wait = setInterval(() => {
            attempts++;
            const mcUI = window.multiCharUI || window.multiCharacterUI;
            if (mcUI && mcUI.characterConfigs) {
                clearInterval(wait);
                mcUI.characterConfigs.forEach(c => c.enabled = false);
                if (typeof mcUI.updateCharacterList === 'function') mcUI.updateCharacterList();
                if (typeof mcUI.renderCharacterList === 'function') mcUI.renderCharacterList();
                console.log('📱 マルチキャラ全員オミット完了');
                return;
            }
            const mcMgr = window.multiCharManager;
            if (mcMgr) {
                clearInterval(wait);
                if (mcMgr.characters) for (const [,u] of mcMgr.characters) u.enabled = false;
                if (mcMgr.characterConfigs) mcMgr.characterConfigs.forEach(c => c.enabled = false);
                console.log('📱 マルチキャラ全員オミット完了');
                return;
            }
            const cbs = document.querySelectorAll('.mc-char-toggle');
            if (cbs.length > 0) {
                clearInterval(wait);
                cbs.forEach(cb => { if (cb.checked) { cb.checked = false; cb.dispatchEvent(new Event('change', {bubbles:true})); }});
                console.log('📱 マルチキャラ全員オミット完了 (DOM)');
                return;
            }
            if (attempts > 30) clearInterval(wait);
        }, 500);
    }

    // ========================================
    // Grok Voice
    // ========================================
    function activateGrokVoice() {
        for (const sel of ['#grok-voice-toggle', '[id*="grok"][id*="connect"]', '[id*="grok"][id*="toggle"]']) {
            const btn = document.querySelector(sel);
            if (btn) { btn.click(); updateGrokBtn(true); return; }
        }
        if (window.viewer && window.viewer.grokClient) {
            try { window.viewer.grokClient.connect(); updateGrokBtn(true); } catch(e) {}
        }
    }

    function toggleGrokVoice() {
        const btn = document.getElementById('mobile-grok-btn');
        if (btn.classList.contains('active')) {
            if (window.viewer && window.viewer.grokClient) try { window.viewer.grokClient.disconnect(); } catch(e) {}
            const t = document.querySelector('#grok-voice-toggle');
            if (t && t.textContent.includes('切断')) t.click();
            updateGrokBtn(false);
        } else {
            activateGrokVoice();
        }
    }

    function updateGrokBtn(active) {
        const btn = document.getElementById('mobile-grok-btn');
        if (!btn) return;
        btn.classList.toggle('active', active);
        btn.innerHTML = active ? '🔴' : '🎙️';
    }

    // ========================================
    // UI管理パネル（Shift+U代替）
    // ========================================
    function toggleUIManagerPanel() {
        document.dispatchEvent(new KeyboardEvent('keydown', {
            key: 'U', code: 'KeyU', shiftKey: true, bubbles: true
        }));
    }

    // ========================================
    // 初期化
    // ========================================
    const initDelay = document.readyState === 'loading' ? 'DOMContentLoaded' : null;
    const init = () => setTimeout(createLauncher, 1500);
    if (initDelay) document.addEventListener(initDelay, init);
    else init();

})();
