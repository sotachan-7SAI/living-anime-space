// ========================================
// 📱 スマホ用クイックランチャー v1.1
// ========================================
// スマホアクセス時に最前面に表示
// - UIをONにして開始（スマホ向けプリセット）
// - シンプルモードで開始（UIオフ）
// - Grok Voice自動ON
// - デフォルトVRMモデル: ギャル05脱着.vrm
// - UI管理パネル表示ボタン（Shift+U代替）
// ========================================

(function() {
    'use strict';

    // スマホ判定（タッチデバイス＆画面幅）
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || 
                     (window.innerWidth <= 768 && 'ontouchstart' in window);

    // PC でも ?mobile=true パラメータで強制表示可能
    const forceMode = new URLSearchParams(window.location.search).get('mobile') === 'true';

    if (!isMobile && !forceMode) {
        console.log('📱 スマホランチャー: PCモードのためスキップ');
        return;
    }

    console.log('📱 スマホ用クイックランチャー v1.1 初期化中...');

    // ========================================
    // スマホUI ONモードで表示するパネルID一覧
    // （スクショ準拠）
    // ========================================
    const MOBILE_ON_PANELS = [
        'left-panel',              // VRMモデルUI（左）
        'right-panel',             // モーションUI（右）
        'morph-panel',             // モーフパネル
        'ai-bbs-panel',            // AI BBS
        'bbs-panel',               // AI BBS (別ID候補)
        'grok-vision-controls',    // Grokの視界UI
        'grok-vision-preview',     // Grokの視界キャプチャー
        'chat-panel',              // チャット
        'panel-control-buttons',   // コントロールボタン
    ];

    // 物理演算・Bbs flow・Env inner はプログラムで直接制御
    const MOBILE_ON_FEATURES = {
        physics: true,      // 物理演算 ON
        bbsFlow: true,      // Bbs flow ON
        envInner: true,     // Env inner ON
    };

    // ========================================
    // スタイル注入
    // ========================================
    const style = document.createElement('style');
    style.textContent = `
        /* ランチャーオーバーレイ */
        #mobile-launcher-overlay {
            position: fixed;
            top: 0; left: 0; right: 0; bottom: 0;
            background: rgba(0, 0, 0, 0.88);
            z-index: 999999;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            font-family: 'Segoe UI', 'Yu Gothic', 'Meiryo', sans-serif;
            animation: mlauncherFadeIn 0.3s ease;
            overflow-y: auto;
            padding: 20px;
        }

        @keyframes mlauncherFadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
        }

        #mobile-launcher-overlay .ml-container {
            width: 100%;
            max-width: 340px;
            text-align: center;
        }

        #mobile-launcher-overlay .ml-logo {
            font-size: 48px;
            margin-bottom: 8px;
        }

        #mobile-launcher-overlay .ml-title {
            font-size: 24px;
            font-weight: bold;
            color: #fff;
            margin-bottom: 4px;
        }

        #mobile-launcher-overlay .ml-subtitle {
            font-size: 12px;
            color: #999;
            margin-bottom: 28px;
        }

        #mobile-launcher-overlay .ml-btn {
            display: flex;
            align-items: center;
            justify-content: center;
            width: 100%;
            padding: 16px 20px;
            margin-bottom: 12px;
            border: none;
            border-radius: 14px;
            font-size: 15px;
            font-weight: bold;
            cursor: pointer;
            transition: transform 0.12s, box-shadow 0.12s;
            text-align: center;
            -webkit-tap-highlight-color: transparent;
            gap: 8px;
        }

        #mobile-launcher-overlay .ml-btn:active {
            transform: scale(0.96);
        }

        #mobile-launcher-overlay .ml-btn-primary {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
            font-size: 17px;
            padding: 18px 20px;
        }

        #mobile-launcher-overlay .ml-btn-grok {
            background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%);
            color: white;
            box-shadow: 0 4px 15px rgba(17, 153, 142, 0.4);
        }

        #mobile-launcher-overlay .ml-btn-secondary {
            background: rgba(255, 255, 255, 0.08);
            color: #bbb;
            border: 1px solid rgba(255, 255, 255, 0.15);
        }

        #mobile-launcher-overlay .ml-btn-small {
            padding: 12px 16px;
            font-size: 13px;
            font-weight: normal;
        }

        #mobile-launcher-overlay .ml-divider {
            border: none;
            border-top: 1px solid rgba(255, 255, 255, 0.1);
            margin: 18px 0;
        }

        #mobile-launcher-overlay .ml-section-label {
            font-size: 10px;
            color: #666;
            text-transform: uppercase;
            letter-spacing: 1.5px;
            margin-bottom: 10px;
        }

        #mobile-launcher-overlay .ml-btn-row {
            display: flex;
            gap: 10px;
        }
        #mobile-launcher-overlay .ml-btn-row .ml-btn {
            flex: 1;
        }

        /* UI管理フローティングボタン（ランチャー後も残る） */
        #mobile-ui-manager-btn {
            position: fixed;
            bottom: 20px;
            right: 20px;
            width: 52px;
            height: 52px;
            border-radius: 50%;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border: 2px solid rgba(255,255,255,0.2);
            font-size: 22px;
            cursor: pointer;
            z-index: 99998;
            box-shadow: 0 4px 20px rgba(102, 126, 234, 0.5);
            display: none;
            justify-content: center;
            align-items: center;
            -webkit-tap-highlight-color: transparent;
            transition: transform 0.15s;
        }

        #mobile-ui-manager-btn:active {
            transform: scale(0.88);
        }

        /* Grok Voice フローティングボタン */
        #mobile-grok-btn {
            position: fixed;
            bottom: 20px;
            left: 20px;
            width: 52px;
            height: 52px;
            border-radius: 50%;
            background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%);
            color: white;
            border: 2px solid rgba(255,255,255,0.2);
            font-size: 22px;
            cursor: pointer;
            z-index: 99998;
            box-shadow: 0 4px 20px rgba(17, 153, 142, 0.5);
            display: none;
            justify-content: center;
            align-items: center;
            -webkit-tap-highlight-color: transparent;
            transition: transform 0.15s, background 0.3s;
        }

        #mobile-grok-btn:active {
            transform: scale(0.88);
        }

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
    // ランチャーUI作成
    // ========================================
    function createLauncher() {
        const overlay = document.createElement('div');
        overlay.id = 'mobile-launcher-overlay';
        overlay.innerHTML = `
            <div class="ml-container">
                <div class="ml-logo">🎭</div>
                <div class="ml-title">Living Anime Space</div>
                <div class="ml-subtitle">VRM AI チャットビューアー</div>

                <button class="ml-btn ml-btn-primary" id="ml-btn-full">
                    🚀 UI ON で開始
                </button>

                <button class="ml-btn ml-btn-grok" id="ml-btn-grok">
                    🎙️ Grok Voice で音声会話
                </button>

                <button class="ml-btn ml-btn-secondary" id="ml-btn-simple">
                    ✨ シンプルモード（UI非表示）
                </button>

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

        // UI管理ボタン（フローティング）
        const uiBtn = document.createElement('button');
        uiBtn.id = 'mobile-ui-manager-btn';
        uiBtn.innerHTML = '📋';
        uiBtn.title = 'UI管理パネル (Shift+U)';
        document.body.appendChild(uiBtn);

        // Grok Voiceボタン（フローティング）
        const grokBtn = document.createElement('button');
        grokBtn.id = 'mobile-grok-btn';
        grokBtn.innerHTML = '🎙️';
        grokBtn.title = 'Grok Voice';
        document.body.appendChild(grokBtn);

        // ========================================
        // イベントハンドラ
        // ========================================

        // 🚀 UI ON で開始
        document.getElementById('ml-btn-full').addEventListener('click', () => {
            startApp({ mode: 'full', enableGrokVoice: false });
        });

        // 🎙️ Grok Voice で開始
        document.getElementById('ml-btn-grok').addEventListener('click', () => {
            startApp({ mode: 'simple', enableGrokVoice: true });
        });

        // ✨ シンプルモード
        document.getElementById('ml-btn-simple').addEventListener('click', () => {
            startApp({ mode: 'simple', enableGrokVoice: false });
        });

        // 🔑 API設定
        document.getElementById('ml-btn-api').addEventListener('click', () => {
            closeLauncher();
            showFloatingButtons();
            setTimeout(() => {
                const apiToggle = document.getElementById('api-settings-toggle');
                if (apiToggle) apiToggle.click();
            }, 500);
        });

        // ⏭️ スキップ（何もせず閉じる）
        document.getElementById('ml-btn-skip').addEventListener('click', () => {
            closeLauncher();
            showFloatingButtons();
        });

        // UI管理フローティングボタン
        uiBtn.addEventListener('click', () => {
            toggleUIManagerPanel();
        });

        // Grok Voiceフローティングボタン
        grokBtn.addEventListener('click', () => {
            toggleGrokVoice();
        });
    }

    // ========================================
    // アプリ開始処理
    // ========================================
    function startApp(options) {
        const { mode, enableGrokVoice } = options;

        closeLauncher();
        showFloatingButtons();

        setTimeout(() => {
            if (mode === 'full') {
                // UI ONモード：スマホ向けプリセット適用
                applyMobilePreset();
            } else {
                // シンプルモード：全UIを非表示
                hideAllPanels();
            }

            // デフォルトモデル読み込み
            loadDefaultModel();

            // Grok Voice 自動ON
            if (enableGrokVoice) {
                setTimeout(() => activateGrokVoice(), 2000);
            }
        }, 500);
    }

    // ========================================
    // フローティングボタン表示
    // ========================================
    function showFloatingButtons() {
        document.getElementById('mobile-ui-manager-btn').style.display = 'flex';
        document.getElementById('mobile-grok-btn').style.display = 'flex';
    }

    // ========================================
    // ランチャーを閉じる
    // ========================================
    function closeLauncher() {
        const overlay = document.getElementById('mobile-launcher-overlay');
        if (overlay) {
            overlay.style.opacity = '0';
            overlay.style.transition = 'opacity 0.2s ease';
            setTimeout(() => overlay.remove(), 200);
        }
    }

    // ========================================
    // スマホ向けUIプリセット適用
    // （スクショ準拠：必要なUIだけON、残りOFF）
    // ========================================
    function applyMobilePreset() {
        console.log('📱 スマホ向けUIプリセット適用中...');

        // まず全パネルを非表示にする
        hideAllPanelsRaw();

        // ONにするパネルを表示
        MOBILE_ON_PANELS.forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                el.style.display = '';
                el.style.visibility = 'visible';
                // visibleクラスで制御されるパネル対応
                if (el.classList.contains('hidden')) el.classList.remove('hidden');
                if (!el.classList.contains('visible')) el.classList.add('visible');
            }
        });

        // 物理演算ON
        if (MOBILE_ON_FEATURES.physics) {
            if (window.physicsSystem && typeof window.physicsSystem.enable === 'function') {
                window.physicsSystem.enable();
            }
            const physBtn = document.getElementById('physics-toggle-btn');
            if (physBtn && physBtn.textContent.includes('OFF')) physBtn.click();
        }

        // コントロールボタン類は表示
        const controlBtns = document.getElementById('control-buttons-container') || 
                           document.getElementById('panel-control-buttons');
        if (controlBtns) {
            controlBtns.style.display = '';
        }

        // アイコンボタン類は表示
        const iconBtnToggle = document.querySelector('#icon-buttons-toggle');
        if (iconBtnToggle) iconBtnToggle.checked = true;

        // UI管理パネルのpanelStatesを同期（もし存在すれば）
        syncUIManagerState();

        console.log('📱 スマホ向けUIプリセット適用完了');
    }

    // ========================================
    // 全パネルを非表示（内部用）
    // ========================================
    function hideAllPanelsRaw() {
        // 主要パネルセレクタ
        const selectors = [
            '#left-panel', '#right-panel', '#chat-panel', '#morph-panel',
            '#multi-character-panel', '#supervisor-panel', '#ai-director-panel',
            '#pipeline-monitor-panel', '#emotion-memory-panel',
            '#imagination-panel', '#imagination-wipe-container',
            '#background-panel', '#music-panel', '#ai-background-panel',
            '#auto-camera-panel', '#camera-setting-panel', '#ai-cinematographer-panel',
            '#sbv2-panel', '#local-music-panel', '#local-bgm-panel',
            '#api-settings-panel-container', '#api-settings-panel',
            '#startup-settings-panel', '#behavior-panel', '#touch-panel',
            '#subtitle-settings-panel', '#environment-3d-panel',
            '#grok-vision-controls', '#grok-vision-preview',
            '#grok-tool-restrictions-panel', '#grok-restriction-panel',
            '#screen-capture-panel', '#screen-tv-panel',
            '#bbs-panel', '#ai-bbs-panel',
            '#motion-float-panel', '#hy-motion-panel',
            '#scenario-selector-panel', '#size-panel',
            '#action-panel', '#auto-saver-panel',
            '#effects-panel', '#spatial-effects-panel',
            '#env-inner-panel', '#story-panel',
            '#initial-settings-panel', '#body-morph-panel',
            '#vmc-panel', '#vmc-protocol-panel',
            '#panel-control-buttons', '#control-buttons-container',
        ];

        selectors.forEach(sel => {
            const el = document.querySelector(sel);
            if (el) el.style.display = 'none';
        });
    }

    // ========================================
    // 全UIパネルを非表示（シンプルモード）
    // ========================================
    function hideAllPanels() {
        hideAllPanelsRaw();

        // アイコンボタン類も非表示
        document.querySelectorAll(
            '.floating-btn, .floating-button, .floating-icon, .side-button, ' +
            '.tool-button, .corner-button, .bottom-button, ' +
            '[class*="float"][class*="btn"], [class*="toggle-btn"], ' +
            'button[style*="position: fixed"], #control-buttons-container, ' +
            '#panel-control-buttons, #bottom-left-controls, #bottom-right-controls'
        ).forEach(btn => {
            if (btn && btn.id !== 'mobile-ui-manager-btn' && btn.id !== 'mobile-grok-btn') {
                btn.style.display = 'none';
            }
        });

        console.log('📱 全UIパネルを非表示にしました（シンプルモード）');
    }

    // ========================================
    // UI管理パネルの状態同期
    // ========================================
    function syncUIManagerState() {
        // UIManagerPanelが初期化されていれば、状態をリフレッシュ
        if (window.uiManagerPanel && typeof window.uiManagerPanel.syncWithActualDOMState === 'function') {
            setTimeout(() => {
                window.uiManagerPanel.syncWithActualDOMState();
                console.log('📱 UI管理パネルの状態を同期');
            }, 500);
        }
    }

    // ========================================
    // デフォルトモデル読み込み
    // ========================================
    function loadDefaultModel() {
        const modelName = 'ギャル05脱着.vrm';
        const modelPath = `models/${modelName}`;

        let attempts = 0;
        const waitForViewer = setInterval(() => {
            attempts++;
            if (window.viewer && typeof window.viewer.loadVRM === 'function') {
                clearInterval(waitForViewer);
                console.log(`📱 デフォルトモデル読み込み: ${modelName}`);
                window.viewer.loadVRM(modelPath);
            } else if (attempts > 30) {
                clearInterval(waitForViewer);
                console.warn('📱 viewerの初期化タイムアウト');
            }
        }, 500);
    }

    // ========================================
    // Grok Voice 操作
    // ========================================
    function activateGrokVoice() {
        // 複数のセレクタでGrok Voiceボタンを探す
        const selectors = [
            '#grok-voice-toggle',
            '[id*="grok"][id*="connect"]',
            '[id*="grok"][id*="toggle"]',
            'button[onclick*="grok"]',
        ];

        for (const sel of selectors) {
            const btn = document.querySelector(sel);
            if (btn) {
                btn.click();
                updateGrokButtonState(true);
                console.log('📱 Grok Voice 接続:', sel);
                return;
            }
        }

        // GrokRealtimeClient直接呼び出し
        if (window.viewer && window.viewer.grokClient) {
            try {
                window.viewer.grokClient.connect();
                updateGrokButtonState(true);
                console.log('📱 Grok Voice 直接接続');
            } catch (e) {
                console.warn('📱 Grok Voice 接続失敗:', e);
            }
        } else {
            console.warn('📱 Grok Voice ボタンが見つかりません');
        }
    }

    function toggleGrokVoice() {
        const btn = document.getElementById('mobile-grok-btn');
        const isActive = btn.classList.contains('active');

        if (isActive) {
            // 切断
            if (window.viewer && window.viewer.grokClient) {
                try { window.viewer.grokClient.disconnect(); } catch(e) {}
            }
            const grokToggle = document.querySelector('#grok-voice-toggle');
            if (grokToggle && grokToggle.textContent.includes('切断')) grokToggle.click();
            updateGrokButtonState(false);
        } else {
            activateGrokVoice();
        }
    }

    function updateGrokButtonState(active) {
        const btn = document.getElementById('mobile-grok-btn');
        if (!btn) return;
        if (active) {
            btn.classList.add('active');
            btn.innerHTML = '🔴';
        } else {
            btn.classList.remove('active');
            btn.innerHTML = '🎙️';
        }
    }

    // ========================================
    // UI管理パネルトグル（Shift+U 代替）
    // ========================================
    function toggleUIManagerPanel() {
        const event = new KeyboardEvent('keydown', {
            key: 'U',
            code: 'KeyU',
            shiftKey: true,
            bubbles: true
        });
        document.dispatchEvent(event);
        console.log('📱 UI管理パネルをトグル');
    }

    // ========================================
    // DOM読み込み後にランチャー生成
    // ========================================
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            setTimeout(createLauncher, 1500);
        });
    } else {
        setTimeout(createLauncher, 1500);
    }

    console.log('📱 スマホ用クイックランチャー v1.1 準備完了');

})();
