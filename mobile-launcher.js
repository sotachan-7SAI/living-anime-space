// ========================================
// 📱 スマホ用クイックランチャー v1.2
// ========================================
// スマホは画面が小さいのでUI全非表示が基本
// フローティングボタン2つ（📋UI管理, 🎙️Grok Voice）のみ常時表示
// UI管理パネルから必要なUIだけ個別にON可能
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

    console.log('📱 スマホ用クイックランチャー v1.2 初期化中...');

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
            justify-content: center;
            align-items: center;
            font-family: 'Segoe UI', 'Yu Gothic', 'Meiryo', sans-serif;
            animation: mlFadeIn 0.3s ease;
            overflow-y: auto;
            padding: 20px;
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
        const overlay = document.createElement('div');
        overlay.id = 'mobile-launcher-overlay';
        overlay.innerHTML = `
            <div class="ml-container">
                <div class="ml-logo">🎭</div>
                <div class="ml-title">Living Anime Space</div>
                <div class="ml-subtitle">VRM AI チャットビューアー</div>

                <button class="ml-btn ml-btn-primary" id="ml-btn-start">
                    🚀 開始する
                </button>
                <div class="ml-desc">UIは非表示で開始。右下 📋 からUI管理できます</div>

                <button class="ml-btn ml-btn-grok" id="ml-btn-grok">
                    🎙️ Grok Voice で音声会話
                </button>
                <div class="ml-desc">音声で直接キャラと会話できます</div>

                <hr class="ml-divider">
                <div class="ml-section-label">設定</div>

                <div class="ml-btn-row">
                    <button class="ml-btn ml-btn-secondary ml-btn-small" id="ml-btn-api">
                        🔑 API設定
                    </button>
                    <button class="ml-btn ml-btn-secondary ml-btn-small" id="ml-btn-skip">
                        ⏭️ スキップ
                    </button>
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

        // イベント
        document.getElementById('ml-btn-start').addEventListener('click', () => {
            startApp(false);
        });
        document.getElementById('ml-btn-grok').addEventListener('click', () => {
            startApp(true);
        });
        document.getElementById('ml-btn-api').addEventListener('click', () => {
            closeLauncher();
            showFloatingButtons();
            setTimeout(() => {
                const apiToggle = document.getElementById('api-settings-toggle');
                if (apiToggle) apiToggle.click();
            }, 500);
        });
        document.getElementById('ml-btn-skip').addEventListener('click', () => {
            closeLauncher();
            showFloatingButtons();
        });

        uiBtn.addEventListener('click', toggleUIManagerPanel);
        grokBtn.addEventListener('click', toggleGrokVoice);
    }

    // ========================================
    // アプリ開始
    // ========================================
    function startApp(enableGrokVoice) {
        closeLauncher();
        showFloatingButtons();

        setTimeout(() => {
            // 全UI非表示
            nukeAllUI();
            // デフォルトモデル読み込み
            loadDefaultModel();
            // Grok Voice
            if (enableGrokVoice) {
                setTimeout(() => activateGrokVoice(), 2000);
            }
        }, 500);
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
    // 全UI完全非表示（何も残さない）
    // ========================================
    function nukeAllUI() {
        console.log('📱 全UI完全非表示...');

        // 1. ID指定で非表示にする全パネル
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
            'api-settings-toggle',
            'drop-overlay',
        ];
        panelIds.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.style.display = 'none';
        });

        // 2. CSSセレクタで残りのUI要素も非表示
        const selectors = [
            '.floating-btn', '.floating-button', '.floating-icon',
            '.side-button', '.tool-button', '.corner-button', '.bottom-button',
            '[class*="float"][class*="btn"]', '[class*="toggle-btn"]',
            '[class*="icon-btn"]', '[class*="control-button"]',
            'button[style*="position: fixed"]',
            'div[style*="position: fixed"]',
            '[id*="toggle-btn"]', '[id*="floating"]',
        ];
        document.querySelectorAll(selectors.join(',')).forEach(el => {
            // 自分のフローティングボタンは除外
            if (el.id === 'mobile-ui-manager-btn' || el.id === 'mobile-grok-btn') return;
            // ランチャー自体も除外
            if (el.id === 'mobile-launcher-overlay') return;
            el.style.display = 'none';
        });

        // 3. マルチキャラ会話パネルの停止中要素も非表示
        document.querySelectorAll('[class*="multi-char"], [class*="multichar"]').forEach(el => {
            el.style.display = 'none';
        });

        console.log('📱 全UI非表示完了 — フローティングボタン2つのみ');
    }

    // ========================================
    // デフォルトモデル読み込み
    // ========================================
    function loadDefaultModel() {
        const modelPath = 'models/ギャル05脱着.vrm';
        let attempts = 0;
        const wait = setInterval(() => {
            attempts++;
            if (window.viewer && typeof window.viewer.loadVRM === 'function') {
                clearInterval(wait);
                console.log('📱 デフォルトモデル読み込み');
                window.viewer.loadVRM(modelPath);
            } else if (attempts > 30) {
                clearInterval(wait);
            }
        }, 500);
    }

    // ========================================
    // Grok Voice
    // ========================================
    function activateGrokVoice() {
        const selectors = [
            '#grok-voice-toggle', '[id*="grok"][id*="connect"]',
            '[id*="grok"][id*="toggle"]',
        ];
        for (const sel of selectors) {
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
            if (window.viewer && window.viewer.grokClient) {
                try { window.viewer.grokClient.disconnect(); } catch(e) {}
            }
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
