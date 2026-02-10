// ========================================
// 🚀 初期設定記憶システム v2.4
// ドラッグ可能なフローティングパネル版
// Grok Voice / AI背景 / モーフパネル対応
// + BGM自動選曲 / AI背景会話自動生成 対応
// + マルチキャラVRM自動読み込み対応
// + v2.4: 想像ワイプ先読みオフ、空間エフェクト保存、メインVRMスキップ
// ========================================

console.log('🚀 初期設定記憶システム v2.4 を読み込み中...');

(function() {
    
    const STORAGE_KEY = 'vrm_viewer_startup_settings';
    const PANEL_POS_KEY = 'vrm_viewer_startup_panel_pos';
    
    // デフォルト設定
    const DEFAULT_SETTINGS = {
        defaultModel: null,
        autoConnectSBV2: false,
        autoEnableChatGPT: false,
        autoEnableGemini: false,
        autoEnableBGM: false,
        bgmContextLength: 5,
        voiceEnabled: false,
        lipsyncEnabled: false,
        lastUsedModel: null,
        // 新規追加
        autoEnableGrokVoice: false,
        autoEnableAIBackground: false,
        showMorphPanel: true,
        showCameraEffectsPanel: false,  // カメラ＆演出パネル
        // v2.2 追加
        autoEnableBGMAutoSelect: false,  // ローカルBGM2「自動BGM選曲」
        autoEnableAIBackgroundAutoGen: false,  // AI背景「会話自動生成」
        // v2.3 追加
        autoLoadMultiCharVRMs: false,  // マルチキャラVRM自動読み込み
        // v2.4 追加
        skipMainVRMLoad: true,  // メインVRMの自動読み込みをスキップ
        disableImaginationAutoMode: false,  // 想像ワイプ先読みオートを初期状態でOFF
        spatialEffectsState: null  // 空間エフェクトの保存状態
    };
    
    let settings = { ...DEFAULT_SETTINGS };
    let panelVisible = false;
    
    // ========================================
    // 設定の保存・読み込み
    // ========================================
    
    function loadSettings() {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            if (saved) {
                settings = { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
                console.log('🚀 初期設定を読み込みました:', settings);
            }
        } catch (e) {
            console.error('設定読み込みエラー:', e);
        }
        return settings;
    }
    
    function saveSettings() {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
            console.log('🚀 設定を保存しました');
        } catch (e) {
            console.error('設定保存エラー:', e);
        }
    }
    
    // ========================================
    // モデルリスト取得
    // ========================================
    
    async function loadModelList() {
        try {
            const response = await fetch('/api/model-list');
            if (response.ok) {
                const data = await response.json();
                return data.models || [];
            }
        } catch (e) {
            console.log('API利用不可');
        }
        return ['AvatarSample_B.vrm', 'AvatarSample_E.vrm', 'jyaimi.vrm', '大人ジャイ美頭大.vrm', '裸01.vrm', '雑ピクピク.vrm'];
    }
    
    // ========================================
    // トグルボタン作成（API設定の隣）
    // ========================================
    
    function createToggleButton() {
        if (document.getElementById('startup-settings-toggle-btn')) return;
        
        const btn = document.createElement('button');
        btn.id = 'startup-settings-toggle-btn';
        btn.innerHTML = '⚙️ 初期設定';
        btn.style.cssText = `
            position: fixed;
            top: 12px;
            left: 270px;
            z-index: 10001;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border: none;
            padding: 8px 16px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: bold;
            cursor: pointer;
            box-shadow: 0 2px 10px rgba(102, 126, 234, 0.4);
            transition: all 0.3s;
        `;
        
        btn.addEventListener('mouseenter', () => {
            btn.style.transform = 'scale(1.05)';
            btn.style.boxShadow = '0 4px 15px rgba(102, 126, 234, 0.6)';
        });
        btn.addEventListener('mouseleave', () => {
            btn.style.transform = 'scale(1)';
            btn.style.boxShadow = '0 2px 10px rgba(102, 126, 234, 0.4)';
        });
        
        btn.addEventListener('click', () => togglePanel());
        
        document.body.appendChild(btn);
        console.log('✅ 初期設定ボタンを追加しました');
    }
    
    // ========================================
    // フローティングパネル作成
    // ========================================
    
    async function createPanel() {
        if (document.getElementById('startup-settings-panel')) return;
        
        const models = await loadModelList();
        
        // 保存された位置を読み込み
        let panelPos = { x: 100, y: 60 };
        try {
            const savedPos = localStorage.getItem(PANEL_POS_KEY);
            if (savedPos) panelPos = JSON.parse(savedPos);
        } catch (e) {}
        
        const panel = document.createElement('div');
        panel.id = 'startup-settings-panel';
        panel.style.cssText = `
            position: fixed;
            top: ${panelPos.y}px;
            left: ${panelPos.x}px;
            width: 300px;
            background: rgba(30, 30, 50, 0.95);
            border-radius: 12px;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
            z-index: 10000;
            font-family: -apple-system, BlinkMacSystemFont, sans-serif;
            display: none;
            overflow: hidden;
        `;
        
        panel.innerHTML = `
            <style>
                #startup-settings-panel .header {
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    padding: 12px 15px;
                    cursor: move;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    user-select: none;
                }
                #startup-settings-panel .header-title {
                    color: white;
                    font-size: 14px;
                    font-weight: bold;
                }
                #startup-settings-panel .close-btn {
                    background: rgba(255,255,255,0.2);
                    border: none;
                    color: white;
                    width: 24px;
                    height: 24px;
                    border-radius: 50%;
                    cursor: pointer;
                    font-size: 14px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }
                #startup-settings-panel .close-btn:hover {
                    background: rgba(255,255,255,0.3);
                }
                #startup-settings-panel .body {
                    padding: 15px;
                    color: #fff;
                    max-height: 500px;
                    overflow-y: auto;
                }
                #startup-settings-panel .section {
                    margin-bottom: 15px;
                }
                #startup-settings-panel .section-title {
                    font-size: 11px;
                    color: #4ecdc4;
                    margin-bottom: 8px;
                    font-weight: bold;
                }
                #startup-settings-panel select {
                    width: 100%;
                    padding: 8px;
                    border: 1px solid #444;
                    border-radius: 6px;
                    background: #2a2a3e;
                    color: white;
                    font-size: 12px;
                }
                #startup-settings-panel .checkbox-item {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    padding: 6px 0;
                    font-size: 12px;
                    color: #ccc;
                    cursor: pointer;
                }
                #startup-settings-panel .checkbox-item:hover {
                    color: white;
                }
                #startup-settings-panel .checkbox-item input {
                    accent-color: #4ecdc4;
                    width: 16px;
                    height: 16px;
                }
                #startup-settings-panel .save-btn {
                    width: 100%;
                    padding: 10px;
                    background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%);
                    border: none;
                    border-radius: 8px;
                    color: white;
                    font-weight: bold;
                    font-size: 13px;
                    cursor: pointer;
                    margin-top: 10px;
                    transition: all 0.3s;
                }
                #startup-settings-panel .save-btn:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 4px 15px rgba(17, 153, 142, 0.4);
                }
                #startup-settings-panel .hint {
                    font-size: 10px;
                    color: #888;
                    margin-top: 8px;
                    text-align: center;
                }
                #startup-settings-panel .status {
                    font-size: 10px;
                    color: #4ecdc4;
                    margin-top: 5px;
                    padding: 5px;
                    background: rgba(78, 205, 196, 0.1);
                    border-radius: 4px;
                }
                #startup-settings-panel .divider {
                    border-top: 1px solid #444;
                    margin: 10px 0;
                }
            </style>
            
            <div class="header" id="startup-panel-header">
                <span class="header-title">🚀 初期設定記憶</span>
                <button class="close-btn" id="startup-panel-close">✕</button>
            </div>
            
            <div class="body">
                <div class="section">
                    <div class="section-title">📂 起動時に読み込むモデル</div>
                    <select id="ss-default-model">
                        <option value="">なし（手動で選択）</option>
                        ${models.map(m => `<option value="${m}" ${settings.defaultModel === m ? 'selected' : ''}>${m.replace('.vrm', '')}</option>`).join('')}
                    </select>
                </div>
                
                <div class="section">
                    <div class="section-title">⚡ 起動時の自動アクション</div>
                    <label class="checkbox-item">
                        <input type="checkbox" id="ss-auto-sbv2" ${settings.autoConnectSBV2 ? 'checked' : ''}>
                        🎤 Style-Bert-VITS2 に自動接続
                    </label>
                    <label class="checkbox-item">
                        <input type="checkbox" id="ss-auto-chatgpt" ${settings.autoEnableChatGPT ? 'checked' : ''}>
                        🤖 ChatGPT を自動でON
                    </label>
                    <label class="checkbox-item">
                        <input type="checkbox" id="ss-auto-bgm" ${settings.autoEnableBGM ? 'checked' : ''}>
                        🎵 BGM自動選曲を有効
                    </label>
                    <label class="checkbox-item">
                        <input type="checkbox" id="ss-auto-bgm-auto-select" ${settings.autoEnableBGMAutoSelect ? 'checked' : ''}>
                        🎶 ローカルBGM2「自動BGM選曲」
                    </label>
                    
                    <div class="divider"></div>
                    
                    <label class="checkbox-item">
                        <input type="checkbox" id="ss-auto-grok-voice" ${settings.autoEnableGrokVoice ? 'checked' : ''}>
                        🎙️ Grok Voice を自動でON
                    </label>
                    <label class="checkbox-item">
                        <input type="checkbox" id="ss-auto-ai-background" ${settings.autoEnableAIBackground ? 'checked' : ''}>
                        🖼️ AI背景設定を自動でON
                    </label>
                    <label class="checkbox-item">
                        <input type="checkbox" id="ss-auto-ai-background-auto-gen" ${settings.autoEnableAIBackgroundAutoGen ? 'checked' : ''}>
                        🌍 AI背景「会話自動生成」
                    </label>
                    
                    <div class="divider"></div>
                    
                    <label class="checkbox-item">
                        <input type="checkbox" id="ss-auto-multichar-vrm" ${settings.autoLoadMultiCharVRMs ? 'checked' : ''}>
                        🎭 マルチキャラVRM自動読み込み
                    </label>
                    <div class="hint" style="margin: 4px 0; color: #888; font-size: 9px;">
                        ↑ 保存済みのVRM設定を起動時に自動で読み込みます
                    </div>
                    
                    <div class="divider"></div>
                    
                    <label class="checkbox-item">
                        <input type="checkbox" id="ss-skip-main-vrm" ${settings.skipMainVRMLoad ? 'checked' : ''}>
                        🚧 メインVRMを起動時に読み込まない
                    </label>
                    <div class="hint" style="margin: 4px 0; color: #888; font-size: 9px;">
                        ↑ model.vrmの自動読み込みをスキップします
                    </div>
                    
                    <label class="checkbox-item">
                        <input type="checkbox" id="ss-disable-imagination-auto" ${settings.disableImaginationAutoMode ? 'checked' : ''}>
                        🖼️ 想像ワイプ先読みオートをOFF
                    </label>
                    <div class="hint" style="margin: 4px 0; color: #888; font-size: 9px;">
                        ↑ 起動時に先読みオートモードをOFFにします
                    </div>
                </div>
                
                <div class="section">
                    <div class="section-title">✨ 空間エフェクト</div>
                    <button class="save-btn" id="ss-save-spatial" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); margin-bottom: 6px;">
                        💾 現在のエフェクトを保存
                    </button>
                    <button class="save-btn" id="ss-load-spatial" style="background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%); margin-bottom: 6px;">
                        📥 保存したエフェクトを復元
                    </button>
                    <button class="save-btn" id="ss-clear-spatial" style="background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);">
                        🗑️ 保存をクリア
                    </button>
                    <div id="ss-spatial-status" class="hint" style="margin-top: 6px; color: #888;">
                        保存状態: なし
                    </div>
                </div>
                
                <div class="section">
                    <div class="section-title">🎨 UI表示設定</div>
                    <label class="checkbox-item">
                        <input type="checkbox" id="ss-show-morph-panel" ${settings.showMorphPanel ? 'checked' : ''}>
                        😊 モーフ調整パネルを表示
                    </label>
                    <label class="checkbox-item">
                        <input type="checkbox" id="ss-show-camera-effects" ${settings.showCameraEffectsPanel ? 'checked' : ''}>
                        📹 カメラ＆演出パネルを表示
                    </label>
                </div>
                
                <button class="save-btn" id="ss-save-btn">💾 設定を保存</button>
                
                <div class="hint">💡 設定は次回起動時から適用されます</div>
                
                <div class="status" id="ss-current-status">
                    現在: モデル=${settings.defaultModel || 'なし'}, SBV2=${settings.autoConnectSBV2 ? 'ON' : 'OFF'}, ChatGPT=${settings.autoEnableChatGPT ? 'ON' : 'OFF'}
                </div>
            </div>
        `;
        
        document.body.appendChild(panel);
        
        // ドラッグ機能
        setupDrag(panel);
        
        // イベント設定
        document.getElementById('startup-panel-close').addEventListener('click', () => togglePanel(false));
        
        document.getElementById('ss-save-btn').addEventListener('click', () => {
            settings.defaultModel = document.getElementById('ss-default-model').value || null;
            settings.autoConnectSBV2 = document.getElementById('ss-auto-sbv2').checked;
            settings.autoEnableChatGPT = document.getElementById('ss-auto-chatgpt').checked;
            settings.autoEnableBGM = document.getElementById('ss-auto-bgm').checked;
            settings.autoEnableGrokVoice = document.getElementById('ss-auto-grok-voice').checked;
            settings.autoEnableAIBackground = document.getElementById('ss-auto-ai-background').checked;
            settings.showMorphPanel = document.getElementById('ss-show-morph-panel').checked;
            settings.showCameraEffectsPanel = document.getElementById('ss-show-camera-effects').checked;
            // v2.2 追加
            settings.autoEnableBGMAutoSelect = document.getElementById('ss-auto-bgm-auto-select').checked;
            settings.autoEnableAIBackgroundAutoGen = document.getElementById('ss-auto-ai-background-auto-gen').checked;
            // v2.3 追加
            settings.autoLoadMultiCharVRMs = document.getElementById('ss-auto-multichar-vrm').checked;
            // v2.4 追加
            settings.skipMainVRMLoad = document.getElementById('ss-skip-main-vrm').checked;
            settings.disableImaginationAutoMode = document.getElementById('ss-disable-imagination-auto').checked;
            
            saveSettings();
            
            // ステータス更新
            updateStatusDisplay();
            
            showNotification('✅ 初期設定を保存しました！');
        });
        
        // v2.4: 空間エフェクト保存ボタン
        document.getElementById('ss-save-spatial').addEventListener('click', () => {
            saveSpatialEffects();
        });
        
        document.getElementById('ss-load-spatial').addEventListener('click', () => {
            loadSpatialEffects();
        });
        
        document.getElementById('ss-clear-spatial').addEventListener('click', () => {
            clearSpatialEffects();
        });
        
        // 空間エフェクト保存状態を表示
        updateSpatialStatus();
        
        console.log('✅ 初期設定パネルを作成しました');
    }
    
    // ステータス表示更新
    function updateStatusDisplay() {
        const statusEl = document.getElementById('ss-current-status');
        if (statusEl) {
            statusEl.innerHTML = `
                現在: モデル=${settings.defaultModel || 'なし'}<br>
                SBV2=${settings.autoConnectSBV2 ? 'ON' : 'OFF'}, 
                ChatGPT=${settings.autoEnableChatGPT ? 'ON' : 'OFF'}, 
                Grok=${settings.autoEnableGrokVoice ? 'ON' : 'OFF'}<br>
                AI背景=${settings.autoEnableAIBackground ? 'ON' : 'OFF'}, 
                モーフパネル=${settings.showMorphPanel ? '表示' : '非表示'}<br>
                BGM自動選曲=${settings.autoEnableBGMAutoSelect ? 'ON' : 'OFF'},
                AI背景自動生成=${settings.autoEnableAIBackgroundAutoGen ? 'ON' : 'OFF'}<br>
                🎭 マルチキャラVRM=${settings.autoLoadMultiCharVRMs ? 'ON' : 'OFF'}<br>
                🚧 メインVRMスキップ=${settings.skipMainVRMLoad ? 'ON' : 'OFF'},
                🖼️ 想像先読みOFF=${settings.disableImaginationAutoMode ? 'ON' : 'OFF'}
            `;
        }
    }
    
    // ========================================
    // ドラッグ機能
    // ========================================
    
    function setupDrag(panel) {
        const header = document.getElementById('startup-panel-header');
        let isDragging = false;
        let startX, startY, startLeft, startTop;
        
        header.addEventListener('mousedown', (e) => {
            if (e.target.classList.contains('close-btn')) return;
            isDragging = true;
            startX = e.clientX;
            startY = e.clientY;
            startLeft = panel.offsetLeft;
            startTop = panel.offsetTop;
            header.style.cursor = 'grabbing';
        });
        
        document.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            const dx = e.clientX - startX;
            const dy = e.clientY - startY;
            panel.style.left = (startLeft + dx) + 'px';
            panel.style.top = (startTop + dy) + 'px';
        });
        
        document.addEventListener('mouseup', () => {
            if (isDragging) {
                isDragging = false;
                header.style.cursor = 'move';
                // 位置を保存
                localStorage.setItem(PANEL_POS_KEY, JSON.stringify({
                    x: panel.offsetLeft,
                    y: panel.offsetTop
                }));
            }
        });
    }
    
    // ========================================
    // パネル表示/非表示
    // ========================================
    
    function togglePanel(show) {
        const panel = document.getElementById('startup-settings-panel');
        if (!panel) return;
        
        if (show === undefined) {
            panelVisible = !panelVisible;
        } else {
            panelVisible = show;
        }
        
        panel.style.display = panelVisible ? 'block' : 'none';
    }
    
    // ========================================
    // モデル読み込み
    // ========================================
    
    async function loadModel(modelName) {
        console.log('🎭 モデル読み込み:', modelName);
        const modelPath = `./models/${modelName}`;
        
        try {
            if (window.app && window.app.loadVRM) {
                await window.app.loadVRM(modelPath);
                settings.lastUsedModel = modelName;
                saveSettings();
                console.log('✅ モデル読み込み完了:', modelName);
            }
        } catch (error) {
            console.error('❌ モデル読み込みエラー:', error);
        }
    }
    
    // ========================================
    // 起動時の自動設定適用
    // ========================================
    
    async function applyStartupSettings() {
        console.log('🚀 起動設定を適用中...', settings);
        
        // デフォルトモデルを読み込み
        if (settings.defaultModel) {
            setTimeout(async () => {
                console.log('🎭 デフォルトモデルを読み込み:', settings.defaultModel);
                await loadModel(settings.defaultModel);
            }, 2000);
        }
        
        // Style-Bert-VITS2に自動接続
        if (settings.autoConnectSBV2) {
            setTimeout(() => {
                console.log('🎤 SBV2に自動接続...');
                const connectBtn = document.getElementById('sbv2-connect-btn');
                if (connectBtn) {
                    connectBtn.click();
                    console.log('✅ SBV2接続ボタンをクリック');
                } else {
                    const checkInterval = setInterval(() => {
                        const btn = document.getElementById('sbv2-connect-btn');
                        if (btn) {
                            btn.click();
                            clearInterval(checkInterval);
                            console.log('✅ SBV2接続ボタンをクリック（遅延）');
                        }
                    }, 500);
                    setTimeout(() => clearInterval(checkInterval), 10000);
                }
            }, 3000);
        }
        
        // ChatGPTを自動でON
        if (settings.autoEnableChatGPT) {
            setTimeout(() => {
                console.log('🤖 ChatGPTを自動でON...');
                const chatgptBtn = document.getElementById('chatgpt-mode-toggle');
                if (chatgptBtn && chatgptBtn.textContent.includes('OFF')) {
                    chatgptBtn.click();
                    console.log('✅ ChatGPTをONにしました');
                }
            }, 2500);
        }
        
        // BGM自動選曲を有効
        if (settings.autoEnableBGM) {
            setTimeout(() => {
                console.log('🎵 BGM自動選曲を有効化...');
                const autoSelectCheckbox = document.getElementById('lm-auto-select');
                if (autoSelectCheckbox && !autoSelectCheckbox.checked) {
                    autoSelectCheckbox.checked = true;
                    autoSelectCheckbox.dispatchEvent(new Event('change'));
                    console.log('✅ BGM自動選曲を有効にしました');
                }
            }, 4000);
        }
        
        // Grok Voiceを自動でON
        if (settings.autoEnableGrokVoice) {
            setTimeout(() => {
                console.log('🎙️ Grok Voiceを自動でON...');
                const grokVoiceBtn = document.getElementById('grok-voice-toggle');
                if (grokVoiceBtn && grokVoiceBtn.textContent.includes('OFF')) {
                    grokVoiceBtn.click();
                    console.log('✅ Grok VoiceをONにしました');
                } else {
                    // ボタンが見つからない場合は探す
                    const buttons = document.querySelectorAll('button');
                    buttons.forEach(btn => {
                        if (btn.textContent.includes('Grok Voice') && btn.textContent.includes('OFF')) {
                            btn.click();
                            console.log('✅ Grok VoiceをONにしました（代替検索）');
                        }
                    });
                }
            }, 3500);
        }
        
        // AI背景設定を自動でON
        if (settings.autoEnableAIBackground) {
            setTimeout(() => {
                console.log('🖼️ AI背景設定を自動でON...');
                // AI背景ボタンを探す
                const aiBgBtn = document.getElementById('ai-background-toggle') || 
                               document.querySelector('[data-feature="ai-background"]');
                if (aiBgBtn) {
                    if (aiBgBtn.textContent.includes('OFF') || !aiBgBtn.classList.contains('active')) {
                        aiBgBtn.click();
                        console.log('✅ AI背景設定をONにしました');
                    }
                } else {
                    // ボタンが見つからない場合は代替検索
                    const buttons = document.querySelectorAll('button');
                    buttons.forEach(btn => {
                        if ((btn.textContent.includes('AI背景') || btn.textContent.includes('AI Background')) 
                            && btn.textContent.includes('OFF')) {
                            btn.click();
                            console.log('✅ AI背景設定をONにしました（代替検索）');
                        }
                    });
                }
            }, 4500);
        }
        
        // モーフ調整パネルの表示/非表示
        setTimeout(() => {
            applyMorphPanelVisibility();
        }, 1500);
        
        // カメラ＆演出パネルの表示/非表示
        setTimeout(() => {
            applyCameraEffectsPanelVisibility();
        }, 2000);
        
        // v2.2: ローカルBGM2「自動BGM選曲」を自動でON
        if (settings.autoEnableBGMAutoSelect) {
            setTimeout(() => {
                console.log('🎶 ローカルBGM2「自動BGM選曲」を自動でON...');
                const autoSelectCheckbox = document.getElementById('lm-auto-select');
                if (autoSelectCheckbox && !autoSelectCheckbox.checked) {
                    autoSelectCheckbox.checked = true;
                    autoSelectCheckbox.dispatchEvent(new Event('change'));
                    console.log('✅ ローカルBGM2「自動BGM選曲」を有効にしました');
                } else {
                    // 別名で探す
                    const checkInterval = setInterval(() => {
                        const cb = document.getElementById('lm-auto-select');
                        if (cb) {
                            if (!cb.checked) {
                                cb.checked = true;
                                cb.dispatchEvent(new Event('change'));
                                console.log('✅ ローカルBGM2「自動BGM選曲」を有効にしました（遅延）');
                            }
                            clearInterval(checkInterval);
                        }
                    }, 500);
                    setTimeout(() => clearInterval(checkInterval), 10000);
                }
            }, 5000);
        }
        
        // v2.2: AI背景「会話自動生成」を自動でON
        if (settings.autoEnableAIBackgroundAutoGen) {
            setTimeout(() => {
                console.log('🌍 AI背景「会話自動生成」を自動でON...');
                // AIBackgroundGeneratorのインスタンスを探す
                if (window.aiBackgroundGenerator && typeof window.aiBackgroundGenerator.setAutoGenerate === 'function') {
                    window.aiBackgroundGenerator.setAutoGenerate(true);
                    console.log('✅ AI背景「会話自動生成」を有効にしました');
                } else {
                    // チェックボックスを直接操作
                    const autoGenCheckbox = document.getElementById('aibg-auto-generate');
                    if (autoGenCheckbox && !autoGenCheckbox.checked) {
                        autoGenCheckbox.checked = true;
                        autoGenCheckbox.dispatchEvent(new Event('change'));
                        console.log('✅ AI背景「会話自動生成」を有効にしました');
                    } else {
                        // 待機して再試行
                        const checkInterval = setInterval(() => {
                            const cb = document.getElementById('aibg-auto-generate');
                            if (cb) {
                                if (!cb.checked) {
                                    cb.checked = true;
                                    cb.dispatchEvent(new Event('change'));
                                    console.log('✅ AI背景「会話自動生成」を有効にしました（遅延）');
                                }
                            clearInterval(checkInterval);
                            }
                        }, 500);
                        setTimeout(() => clearInterval(checkInterval), 10000);
                    }
                }
            }, 5500);
        }
        
        // v2.3: マルチキャラVRM自動読み込み
        if (settings.autoLoadMultiCharVRMs) {
            setTimeout(() => {
                console.log('🎭 マルチキャラVRM自動読み込みを実行中...');
                autoLoadMultiCharacterVRMs();
            }, 4000);
        }
        
        // v2.4: 想像ワイプ先読みオートをOFFにする
        if (settings.disableImaginationAutoMode) {
            setTimeout(() => {
                if (window.imaginationWipe) {
                    window.imaginationWipe.isAutoMode = false;
                    console.log('🖼️ 想像ワイプ先読みオートをOFFにしました');
                    // UIも更新
                    const autoToggleBtn = document.querySelector('#ip-auto-toggle');
                    if (autoToggleBtn) {
                        autoToggleBtn.classList.remove('active');
                        autoToggleBtn.innerHTML = '<span>⚡</span> 先読みオート OFF';
                    }
                }
            }, 3000);
        }
        
        // v2.4: 空間エフェクトを復元
        if (settings.spatialEffectsState) {
            setTimeout(() => {
                loadSpatialEffects(true);  // 自動復元
            }, 5000);
        }
    }
    
    // ========================================
    // v2.4: 空間エフェクトの保存・復元
    // ========================================
    
    function saveSpatialEffects() {
        if (!window.spatialEffects) {
            showNotification('⚠️ 空間エフェクトが初期化されていません', 'error');
            return;
        }
        
        const activeEffects = [...window.spatialEffects.activeEffects];
        const density = window.spatialEffects._densityMultiplier || 1;
        const speed = window.spatialEffects._speedMultiplier || 1;
        
        const state = {
            effects: activeEffects,
            density: density,
            speed: speed,
            savedAt: new Date().toISOString()
        };
        
        settings.spatialEffectsState = state;
        saveSettings();
        
        updateSpatialStatus();
        showNotification(`✨ 空間エフェクトを保存しました (${activeEffects.length}個)`);
        console.log('✨ 空間エフェクト保存:', state);
    }
    
    function loadSpatialEffects(silent = false) {
        if (!window.spatialEffects) {
            if (!silent) showNotification('⚠️ 空間エフェクトが初期化されていません', 'error');
            return;
        }
        
        const state = settings.spatialEffectsState;
        if (!state || !state.effects) {
            if (!silent) showNotification('⚠️ 保存されたエフェクトがありません', 'error');
            return;
        }
        
        // 既存のエフェクトをクリア
        window.spatialEffects.clearAllEffects();
        
        // 密度と速度を復元
        window.spatialEffects._densityMultiplier = state.density || 1;
        window.spatialEffects._speedMultiplier = state.speed || 1;
        
        // UIのスライダーも更新
        const densitySlider = document.querySelector('#sep-density');
        const speedSlider = document.querySelector('#sep-speed');
        if (densitySlider) {
            densitySlider.value = state.density;
            const densityVal = document.querySelector('#sep-density-val');
            if (densityVal) densityVal.textContent = state.density.toFixed(1) + 'x';
        }
        if (speedSlider) {
            speedSlider.value = state.speed;
            const speedVal = document.querySelector('#sep-speed-val');
            if (speedVal) speedVal.textContent = state.speed.toFixed(1) + 'x';
        }
        
        // エフェクトを復元
        state.effects.forEach(effectType => {
            window.spatialEffects.addEffect(effectType);
            // UIボタンも更新
            const btn = document.querySelector(`.sep-btn[data-effect="${effectType}"]`);
            if (btn) btn.classList.add('active');
        });
        
        if (!silent) {
            showNotification(`✨ 空間エフェクトを復元しました (${state.effects.length}個)`);
        }
        console.log('✨ 空間エフェクト復元:', state);
    }
    
    function clearSpatialEffects() {
        settings.spatialEffectsState = null;
        saveSettings();
        updateSpatialStatus();
        showNotification('🗑️ 空間エフェクトの保存をクリアしました');
    }
    
    function updateSpatialStatus() {
        const statusEl = document.getElementById('ss-spatial-status');
        if (!statusEl) return;
        
        const state = settings.spatialEffectsState;
        if (state && state.effects) {
            const savedDate = new Date(state.savedAt).toLocaleString('ja-JP');
            statusEl.innerHTML = `保存状態: <span style="color: #4ecdc4;">${state.effects.length}個のエフェクト</span><br>
                <span style="font-size: 8px;">保存日時: ${savedDate}</span>`;
        } else {
            statusEl.textContent = '保存状態: なし';
        }
    }
    
    // モーフパネル表示/非表示の適用
    function applyMorphPanelVisibility() {
        const morphPanel = document.getElementById('morph-panel') || 
                          document.querySelector('.morph-panel') ||
                          document.querySelector('[class*="morph"]');
        
        if (morphPanel) {
            if (settings.showMorphPanel) {
                morphPanel.style.display = '';
                console.log('✅ モーフパネルを表示');
            } else {
                morphPanel.style.display = 'none';
                console.log('✅ モーフパネルを非表示');
            }
        } else {
            // モーフ調整パネルを探す（右側のパネル）
            const rightPanels = document.querySelectorAll('[style*="right"]');
            rightPanels.forEach(panel => {
                if (panel.textContent.includes('モーフ調整') || panel.textContent.includes('まばたき')) {
                    if (settings.showMorphPanel) {
                        panel.style.display = '';
                        console.log('✅ モーフパネルを表示（代替検索）');
                    } else {
                        panel.style.display = 'none';
                        console.log('✅ モーフパネルを非表示（代替検索）');
                    }
                }
            });
        }
    }
    
    // カメラ＆演出パネル表示/非表示の適用
    function applyCameraEffectsPanelVisibility() {
        if (settings.showCameraEffectsPanel) {
            // カメラ演出パネルを表示
            if (window.cameraEffectsPanel) {
                window.cameraEffectsPanel.show();
                console.log('✅ カメラ＆演出パネルを表示');
            } else {
                // パネルがまだ初期化されていない場合、待機して再試行
                const checkInterval = setInterval(() => {
                    if (window.cameraEffectsPanel) {
                        window.cameraEffectsPanel.show();
                        clearInterval(checkInterval);
                        console.log('✅ カメラ＆演出パネルを表示（遅延）');
                    }
                }, 500);
                setTimeout(() => clearInterval(checkInterval), 5000);
            }
        } else {
            // カメラ演出パネルを非表示
            if (window.cameraEffectsPanel) {
                window.cameraEffectsPanel.hide();
                console.log('✅ カメラ＆演出パネルを非表示');
            }
        }
    }
    
    // ========================================
    // 通知表示
    // ========================================
    
    function showNotification(message) {
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 60px;
            left: 50%;
            transform: translateX(-50%);
            background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%);
            color: white;
            padding: 12px 24px;
            border-radius: 8px;
            z-index: 99999;
            font-size: 13px;
            font-weight: bold;
            box-shadow: 0 4px 15px rgba(0,0,0,0.3);
        `;
        notification.textContent = message;
        document.body.appendChild(notification);
        setTimeout(() => notification.remove(), 2500);
    }
    
    // ========================================
    // 既存のモデルリストUIを強化
    // ========================================
    
    async function enhanceModelList() {
        const modelList = document.getElementById('model-list');
        if (!modelList) {
            setTimeout(enhanceModelList, 500);
            return;
        }
        
        const models = await loadModelList();
        
        // モデルリストを更新
        modelList.innerHTML = models.map(model => {
            const isDefault = settings.defaultModel === model;
            const icon = isDefault ? '⭐' : '🎭';
            return `
                <div class="model-item" data-model="${model}" ${isDefault ? 'style="border: 2px solid #667eea; background: linear-gradient(135deg, rgba(102,126,234,0.2), rgba(118,75,162,0.2));"' : ''}>
                    <span>${icon}</span>
                    <span>${model.replace('.vrm', '')}</span>
                </div>
            `;
        }).join('');
        
        // クリックイベント
        modelList.querySelectorAll('.model-item').forEach(item => {
            item.addEventListener('click', async () => {
                const modelName = item.dataset.model;
                await loadModel(modelName);
                
                // アクティブ表示を更新
                modelList.querySelectorAll('.model-item').forEach(i => {
                    i.classList.remove('active');
                    if (i.dataset.model !== settings.defaultModel) {
                        i.style.border = '';
                        i.style.background = '';
                    }
                });
                item.classList.add('active');
            });
        });
        
        console.log('✅ モデルリストを強化しました');
    }
    
    // ========================================
    // 初期化
    // ========================================
    
    // ========================================
    // v2.3: マルチキャラVRM自動読み込み
    // ========================================
    
    async function autoLoadMultiCharacterVRMs() {
        // multiCharManagerが初期化されるまで待機
        if (!window.multiCharManager) {
            console.log('🎭 multiCharManager待機中...');
            const checkInterval = setInterval(() => {
                if (window.multiCharManager) {
                    clearInterval(checkInterval);
                    autoLoadMultiCharacterVRMs();
                }
            }, 500);
            setTimeout(() => clearInterval(checkInterval), 15000);
            return;
        }
        
        try {
            // 保存されたキャラクター設定を取得
            const savedConfigs = localStorage.getItem('multichar_configs_v2');
            if (!savedConfigs) {
                console.log('🎭 保存されたマルチキャラ設定がありません');
                return;
            }
            
            const configs = JSON.parse(savedConfigs);
            const enabledConfigs = configs.filter(c => c.enabled && c.vrmPath);
            
            if (enabledConfigs.length === 0) {
                console.log('🎭 有効なキャラクターVRM設定がありません');
                return;
            }
            
            console.log(`🎭 ${enabledConfigs.length}人のキャラクターVRMを自動読み込み中...`);
            
            let loadedCount = 0;
            for (const char of enabledConfigs) {
                try {
                    if (char.vrmPath === 'main') {
                        // メインVRMを使用
                        const success = window.multiCharManager.useMainVRM(char.id);
                        if (success) {
                            loadedCount++;
                            console.log(`✅ ${char.name}: メインVRM設定完了`);
                        }
                    } else if (char.vrmPath.startsWith('file:')) {
                        // ファイルから読み込まれたVRMはスキップ（手動再読み込み必要）
                        console.log(`⚠️ ${char.name}: ファイルVRMは手動で再読み込みしてください`);
                    } else {
                        // モデルファイルから読み込み
                        const vrm = await window.multiCharManager.loadVRMForCharacter(char.id, char.vrmPath);
                        if (vrm) {
                            loadedCount++;
                            console.log(`✅ ${char.name}: VRM読み込み完了`);
                        }
                    }
                    // 少し待機（連続読み込みの負荷軽減）
                    await new Promise(r => setTimeout(r, 500));
                } catch (e) {
                    console.error(`❌ ${char.name}: VRM読み込みエラー`, e);
                }
            }
            
            console.log(`✅ マルチキャラVRM自動読み込み完了: ${loadedCount}人`);
            
            // UIを更新
            if (window.multiCharUI && window.multiCharUI.renderCharacterList) {
                window.multiCharUI.renderCharacterList();
            }
            
        } catch (e) {
            console.error('❌ マルチキャラVRM自動読み込みエラー:', e);
        }
    }
    
    function init() {
        console.log('🚀 初期設定記憶システム v2.4 初期化中...');
        
        loadSettings();
        
        // UIを作成
        setTimeout(() => {
            createToggleButton();
            createPanel();
            enhanceModelList();
        }, 1500);
        
        // 起動設定を適用
        setTimeout(applyStartupSettings, 2000);
        
        // グローバルAPI
        window.StartupSettings = {
            load: loadSettings,
            save: saveSettings,
            get: () => settings,
            loadModel,
            showPanel: () => togglePanel(true),
            hidePanel: () => togglePanel(false),
            applyMorphPanelVisibility,
            applyCameraEffectsPanelVisibility,
            toggleMorphPanel: (show) => {
                settings.showMorphPanel = show;
                applyMorphPanelVisibility();
            },
            toggleCameraEffectsPanel: (show) => {
                settings.showCameraEffectsPanel = show;
                applyCameraEffectsPanelVisibility();
            },
            // v2.4 追加
            shouldSkipMainVRM: () => settings.skipMainVRMLoad,
            saveSpatialEffects,
            loadSpatialEffects,
            clearSpatialEffects
        };
        
        console.log('✅ 初期設定記憶システム v2.4 初期化完了');
    }
    
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
    
})();

console.log('✅ 初期設定記憶システム v2.4 スクリプト読み込み完了');
