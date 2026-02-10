// ========================================
// Style-Bert-VITS2 コントロールパネル v1.0
// VRM AI Viewer用 TTS設定UI
// ========================================

import { StyleBertVits2Client, ChatGPTWithSBV2Client } from './style-bert-vits2-client.js';

export class StyleBertVits2Panel {
    constructor() {
        this.sbv2Client = null;
        this.chatClient = null;
        this.isConnected = false;
        this.selectedModel = null;
        this.modelsInfo = [];
        
        // デフォルト設定
        this.settings = {
            baseUrl: 'http://localhost:8000',
            model: 'jvnv-F1-jp',
            style: 'Neutral',
            styleWeight: 10,
            speed: 1.0,
            enabled: false  // SBV2を使用するか
        };
        
        // localStorageから設定を読み込み
        this.loadSettings();
        
        this.panel = null;
        this.createPanel();
        this.setupEventListeners();
        
        // 自動接続試行
        this.tryConnect();
    }
    
    /**
     * 設定をlocalStorageから読み込み
     */
    loadSettings() {
        try {
            const saved = localStorage.getItem('sbv2_settings');
            if (saved) {
                const parsed = JSON.parse(saved);
                Object.assign(this.settings, parsed);
                console.log('📦 SBV2設定を読み込みました');
            }
        } catch (e) {
            console.warn('SBV2設定の読み込み失敗:', e);
        }
    }
    
    /**
     * 設定をlocalStorageに保存
     */
    saveSettings() {
        try {
            localStorage.setItem('sbv2_settings', JSON.stringify(this.settings));
            console.log('💾 SBV2設定を保存しました');
        } catch (e) {
            console.warn('SBV2設定の保存失敗:', e);
        }
    }
    
    /**
     * パネルUIを作成
     */
    createPanel() {
        // スタイルを追加
        const style = document.createElement('style');
        style.textContent = `
            #sbv2-panel {
                position: fixed;
                bottom: 10px;
                left: 200px;
                background: rgba(255, 255, 255, 0.98);
                padding: 12px;
                border-radius: 12px;
                box-shadow: 0 4px 20px rgba(0,0,0,0.3);
                z-index: 9999;
                width: 280px;
                max-height: 80vh;
                overflow-y: auto;
                font-family: 'Segoe UI', 'Yu Gothic', sans-serif;
                font-size: 11px;
                display: none;
            }
            #sbv2-panel.visible { display: block; }
            
            #sbv2-toggle-btn {
                position: fixed;
                bottom: 10px;
                left: 200px;
                background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%);
                color: white;
                border: none;
                padding: 8px 14px;
                border-radius: 8px;
                cursor: pointer;
                font-size: 11px;
                font-weight: bold;
                z-index: 10000;
                box-shadow: 0 2px 10px rgba(0,0,0,0.3);
                transition: all 0.3s;
            }
            #sbv2-toggle-btn:hover {
                transform: translateY(-2px);
                box-shadow: 0 4px 15px rgba(17, 153, 142, 0.5);
            }
            #sbv2-toggle-btn.disconnected {
                background: linear-gradient(135deg, #636e72 0%, #b2bec3 100%);
            }
            #sbv2-toggle-btn.active {
                background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
            }
            
            .sbv2-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 12px;
                padding-bottom: 8px;
                border-bottom: 2px solid #11998e;
                cursor: grab;
            }
            .sbv2-header:active { cursor: grabbing; }
            .sbv2-title {
                font-size: 13px;
                font-weight: bold;
                color: #333;
                display: flex;
                align-items: center;
                gap: 6px;
            }
            .sbv2-close {
                background: none;
                border: none;
                font-size: 16px;
                cursor: pointer;
                color: #666;
            }
            .sbv2-close:hover { color: #ff6b6b; }
            
            .sbv2-status {
                display: flex;
                align-items: center;
                gap: 8px;
                padding: 8px;
                background: #f8f9fa;
                border-radius: 8px;
                margin-bottom: 10px;
            }
            .sbv2-status-dot {
                width: 10px;
                height: 10px;
                border-radius: 50%;
                background: #ccc;
            }
            .sbv2-status-dot.connected { background: #11998e; }
            .sbv2-status-dot.error { background: #ff6b6b; }
            
            .sbv2-section {
                background: #f8f9fa;
                border-radius: 8px;
                padding: 10px;
                margin-bottom: 10px;
            }
            .sbv2-section-title {
                font-size: 11px;
                font-weight: bold;
                color: #11998e;
                margin-bottom: 8px;
                display: flex;
                align-items: center;
                gap: 4px;
            }
            
            .sbv2-input-group {
                margin-bottom: 8px;
            }
            .sbv2-label {
                font-size: 10px;
                color: #666;
                margin-bottom: 4px;
                display: block;
            }
            .sbv2-input, .sbv2-select {
                width: 100%;
                padding: 8px;
                border: 1px solid #ddd;
                border-radius: 6px;
                font-size: 11px;
            }
            .sbv2-input:focus, .sbv2-select:focus {
                border-color: #11998e;
                outline: none;
            }
            
            .sbv2-model-grid {
                display: grid;
                grid-template-columns: repeat(2, 1fr);
                gap: 6px;
                max-height: 150px;
                overflow-y: auto;
            }
            .sbv2-model-item {
                padding: 8px;
                border: 2px solid #e0e0e0;
                border-radius: 6px;
                text-align: center;
                cursor: pointer;
                font-size: 10px;
                transition: all 0.2s;
            }
            .sbv2-model-item:hover {
                border-color: #11998e;
                background: rgba(17, 153, 142, 0.1);
            }
            .sbv2-model-item.active {
                border-color: #11998e;
                background: linear-gradient(135deg, rgba(17, 153, 142, 0.2) 0%, rgba(56, 239, 125, 0.2) 100%);
            }
            .sbv2-model-icon { font-size: 16px; }
            .sbv2-model-name { font-weight: bold; margin-top: 2px; }
            .sbv2-model-styles { font-size: 8px; color: #888; margin-top: 2px; }
            
            .sbv2-style-grid {
                display: flex;
                flex-wrap: wrap;
                gap: 4px;
            }
            .sbv2-style-btn {
                padding: 6px 10px;
                border: 1px solid #ddd;
                border-radius: 4px;
                background: white;
                cursor: pointer;
                font-size: 10px;
                transition: all 0.2s;
            }
            .sbv2-style-btn:hover { border-color: #11998e; }
            .sbv2-style-btn.active {
                background: #11998e;
                color: white;
                border-color: #11998e;
            }
            
            .sbv2-slider-row {
                display: flex;
                align-items: center;
                gap: 8px;
            }
            .sbv2-slider {
                flex: 1;
                accent-color: #11998e;
            }
            .sbv2-slider-value {
                min-width: 30px;
                text-align: center;
                font-weight: bold;
                color: #11998e;
            }
            
            .sbv2-btn {
                width: 100%;
                padding: 10px;
                border: none;
                border-radius: 8px;
                font-size: 11px;
                font-weight: bold;
                cursor: pointer;
                transition: all 0.2s;
                margin-top: 6px;
            }
            .sbv2-btn-primary {
                background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%);
                color: white;
            }
            .sbv2-btn-secondary {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
            }
            .sbv2-btn-danger {
                background: linear-gradient(135deg, #ff6b6b 0%, #ee5a6f 100%);
                color: white;
            }
            .sbv2-btn:hover {
                transform: translateY(-1px);
                box-shadow: 0 2px 8px rgba(0,0,0,0.2);
            }
            .sbv2-btn:disabled {
                opacity: 0.5;
                cursor: not-allowed;
                transform: none;
            }
            
            .sbv2-test-area {
                margin-top: 8px;
            }
            .sbv2-test-input {
                width: 100%;
                padding: 8px;
                border: 1px solid #ddd;
                border-radius: 6px;
                font-size: 11px;
                resize: vertical;
                min-height: 50px;
            }
            
            .sbv2-emotion-display {
                display: flex;
                align-items: center;
                gap: 10px;
                padding: 8px;
                background: linear-gradient(135deg, rgba(17, 153, 142, 0.1) 0%, rgba(56, 239, 125, 0.1) 100%);
                border-radius: 8px;
                margin-top: 8px;
            }
            .sbv2-emotion-icon { font-size: 24px; }
            .sbv2-emotion-info { flex: 1; }
            .sbv2-emotion-style { font-weight: bold; color: #11998e; }
            .sbv2-emotion-weight-bar {
                height: 6px;
                background: #e0e0e0;
                border-radius: 3px;
                margin-top: 4px;
            }
            .sbv2-emotion-weight-fill {
                height: 100%;
                background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%);
                border-radius: 3px;
                transition: width 0.3s;
            }
            
            .sbv2-toggle-switch {
                position: relative;
                display: inline-block;
                width: 44px;
                height: 22px;
            }
            .sbv2-toggle-switch input { opacity: 0; width: 0; height: 0; }
            .sbv2-toggle-slider {
                position: absolute;
                cursor: pointer;
                top: 0; left: 0; right: 0; bottom: 0;
                background-color: #ccc;
                transition: .3s;
                border-radius: 22px;
            }
            .sbv2-toggle-slider:before {
                position: absolute;
                content: "";
                height: 16px;
                width: 16px;
                left: 3px;
                bottom: 3px;
                background-color: white;
                transition: .3s;
                border-radius: 50%;
            }
            .sbv2-toggle-switch input:checked + .sbv2-toggle-slider {
                background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%);
            }
            .sbv2-toggle-switch input:checked + .sbv2-toggle-slider:before {
                transform: translateX(22px);
            }
            
            /* モデル性格表ボタン */
            .sbv2-model-info-btn {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                border: none;
                padding: 4px 8px;
                border-radius: 4px;
                cursor: pointer;
                font-size: 9px;
                font-weight: bold;
                transition: all 0.2s;
            }
            .sbv2-model-info-btn:hover {
                transform: scale(1.05);
                box-shadow: 0 2px 8px rgba(102, 126, 234, 0.4);
            }
            
            /* モデル性格表モーダル */
            .sbv2-model-info-modal {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.6);
                display: none;
                justify-content: center;
                align-items: center;
                z-index: 100000;
            }
            .sbv2-model-info-modal.visible {
                display: flex;
            }
            .sbv2-model-info-content {
                background: white;
                border-radius: 12px;
                padding: 20px;
                max-width: 500px;
                max-height: 80vh;
                overflow-y: auto;
                box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
                animation: sbv2ModalSlideIn 0.3s ease;
            }
            @keyframes sbv2ModalSlideIn {
                from { opacity: 0; transform: translateY(-20px); }
                to { opacity: 1; transform: translateY(0); }
            }
            .sbv2-model-info-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 15px;
                padding-bottom: 10px;
                border-bottom: 2px solid #667eea;
            }
            .sbv2-model-info-title {
                font-size: 16px;
                font-weight: bold;
                color: #333;
            }
            .sbv2-model-info-close {
                background: none;
                border: none;
                font-size: 20px;
                cursor: pointer;
                color: #666;
            }
            .sbv2-model-info-close:hover { color: #ff6b6b; }
            .sbv2-model-info-body {
                font-size: 12px;
                line-height: 1.8;
            }
            .sbv2-model-info-item {
                padding: 8px 10px;
                margin-bottom: 6px;
                background: #f8f9fa;
                border-radius: 8px;
                border-left: 4px solid #667eea;
            }
            .sbv2-model-info-item-name {
                font-weight: bold;
                color: #667eea;
                margin-bottom: 2px;
            }
            .sbv2-model-info-item-desc {
                color: #666;
                font-size: 11px;
            }
            .sbv2-model-info-category {
                font-weight: bold;
                color: #11998e;
                margin: 12px 0 8px 0;
                padding-bottom: 4px;
                border-bottom: 1px solid #ddd;
            }
        `;
        document.head.appendChild(style);
        
        // トグルボタン
        const toggleBtn = document.createElement('button');
        toggleBtn.id = 'sbv2-toggle-btn';
        toggleBtn.className = 'disconnected';
        toggleBtn.innerHTML = '🎤 SBV2 OFF';
        document.body.appendChild(toggleBtn);
        
        // パネル本体
        const panel = document.createElement('div');
        panel.id = 'sbv2-panel';
        panel.innerHTML = `
            <div class="sbv2-header">
                <div class="sbv2-title">
                    <span>🎤</span>
                    <span>Style-Bert-VITS2</span>
                </div>
                <button class="sbv2-close" id="sbv2-close">✕</button>
            </div>
            
            <!-- 接続状態 -->
            <div class="sbv2-status">
                <div class="sbv2-status-dot" id="sbv2-status-dot"></div>
                <span id="sbv2-status-text">未接続</span>
                <button class="sbv2-btn sbv2-btn-secondary" id="sbv2-connect-btn" style="margin:0;padding:6px 10px;width:auto;margin-left:auto;">接続</button>
            </div>
            
            <!-- 有効/無効切り替え -->
            <div class="sbv2-section">
                <div style="display:flex;align-items:center;justify-content:space-between;">
                    <span style="font-weight:bold;">🔊 SBV2を使用</span>
                    <label class="sbv2-toggle-switch">
                        <input type="checkbox" id="sbv2-enabled">
                        <span class="sbv2-toggle-slider"></span>
                    </label>
                </div>
                <div style="font-size:9px;color:#888;margin-top:4px;">
                    ONにするとChatGPTの応答をSBV2で読み上げ
                </div>
            </div>
            
            <!-- サーバー設定 -->
            <div class="sbv2-section">
                <div class="sbv2-section-title">⚙️ サーバー設定</div>
                <div class="sbv2-input-group">
                    <label class="sbv2-label">URL</label>
                    <input type="text" class="sbv2-input" id="sbv2-url" value="http://localhost:8000">
                </div>
            </div>
            
            <!-- モデル選択 -->
            <div class="sbv2-section">
                <div class="sbv2-section-title" style="display:flex;justify-content:space-between;align-items:center;">
                    <span>🎭 音声モデル</span>
                    <button class="sbv2-model-info-btn" id="sbv2-model-info-btn" title="モデル性格表を表示">📋 性格表</button>
                </div>
                <div class="sbv2-model-grid" id="sbv2-model-grid">
                    <div style="grid-column:1/-1;text-align:center;color:#888;padding:20px;">
                        接続後にモデル一覧を表示
                    </div>
                </div>
            </div>
            
            <!-- スタイル選択 -->
            <div class="sbv2-section">
                <div class="sbv2-section-title">😊 感情スタイル</div>
                <div class="sbv2-style-grid" id="sbv2-style-grid">
                    <button class="sbv2-style-btn active" data-style="Neutral">😐 Neutral</button>
                    <button class="sbv2-style-btn" data-style="Happy">😊 Happy</button>
                    <button class="sbv2-style-btn" data-style="Angry">😠 Angry</button>
                    <button class="sbv2-style-btn" data-style="Sad">😢 Sad</button>
                    <button class="sbv2-style-btn" data-style="Surprise">😲 Surprise</button>
                    <button class="sbv2-style-btn" data-style="Fear">😨 Fear</button>
                </div>
            </div>
            
            <!-- パラメータ調整 -->
            <div class="sbv2-section">
                <div class="sbv2-section-title">🎚️ パラメータ</div>
                
                <div class="sbv2-input-group">
                    <label class="sbv2-label">感情の強さ (1-20)</label>
                    <div class="sbv2-slider-row">
                        <input type="range" class="sbv2-slider" id="sbv2-weight" min="1" max="20" value="10">
                        <span class="sbv2-slider-value" id="sbv2-weight-value">10</span>
                    </div>
                </div>
                
                <div class="sbv2-input-group">
                    <label class="sbv2-label">読み上げ速度</label>
                    <div class="sbv2-slider-row">
                        <input type="range" class="sbv2-slider" id="sbv2-speed" min="0.5" max="2.0" step="0.1" value="1.0">
                        <span class="sbv2-slider-value" id="sbv2-speed-value">1.0</span>
                    </div>
                </div>
            </div>
            
            <!-- テスト -->
            <div class="sbv2-section">
                <div class="sbv2-section-title">🔊 テスト読み上げ</div>
                <div class="sbv2-test-area">
                    <textarea class="sbv2-test-input" id="sbv2-test-text" placeholder="テスト用テキストを入力...">こんにちは！今日はいい天気ですね！</textarea>
                    <button class="sbv2-btn sbv2-btn-primary" id="sbv2-test-btn" disabled>🔊 読み上げテスト</button>
                </div>
                
                <!-- 現在の感情表示 -->
                <div class="sbv2-emotion-display" id="sbv2-emotion-display" style="display:none;">
                    <div class="sbv2-emotion-icon" id="sbv2-emotion-icon">😊</div>
                    <div class="sbv2-emotion-info">
                        <div class="sbv2-emotion-style" id="sbv2-emotion-style">Happy</div>
                        <div class="sbv2-emotion-weight-bar">
                            <div class="sbv2-emotion-weight-fill" id="sbv2-emotion-weight-fill" style="width:50%"></div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(panel);
        
        // モデル性格表モーダルを追加
        const modal = document.createElement('div');
        modal.id = 'sbv2-model-info-modal';
        modal.className = 'sbv2-model-info-modal';
        modal.innerHTML = `
            <div class="sbv2-model-info-content">
                <div class="sbv2-model-info-header">
                    <div class="sbv2-model-info-title">📋 音声モデル性格表</div>
                    <button class="sbv2-model-info-close" id="sbv2-model-info-close">✕</button>
                </div>
                <div class="sbv2-model-info-body">
                    <div class="sbv2-model-info-category">🎭 amitaro</div>
                    <div class="sbv2-model-info-item">
                        <div class="sbv2-model-info-item-name">amitaro</div>
                        <div class="sbv2-model-info-item-desc">生のVチューバーっぽい</div>
                    </div>
                    
                    <div class="sbv2-model-info-category">👩 FNシリーズ（女性）</div>
                    <div class="sbv2-model-info-item">
                        <div class="sbv2-model-info-item-name">FN1</div>
                        <div class="sbv2-model-info-item-desc">１６歳くらい　声中高　かわいい　あまあま</div>
                    </div>
                    <div class="sbv2-model-info-item">
                        <div class="sbv2-model-info-item-name">FN2</div>
                        <div class="sbv2-model-info-item-desc">１４歳くらい　声高高　かわいい　あまあま　ふにゃふにゃ</div>
                    </div>
                    <div class="sbv2-model-info-item">
                        <div class="sbv2-model-info-item-name">FN3</div>
                        <div class="sbv2-model-info-item-desc">１８歳くらい　お姉さん　明坂里美系</div>
                    </div>
                    <div class="sbv2-model-info-item">
                        <div class="sbv2-model-info-item-name">FN4</div>
                        <div class="sbv2-model-info-item-desc">１７歳くらい　ひかえめ　しっかり</div>
                    </div>
                    <div class="sbv2-model-info-item">
                        <div class="sbv2-model-info-item-name">FN5</div>
                        <div class="sbv2-model-info-item-desc">１８歳くらい　清楚　エロすくなめ　頭凡才　ぼくちゃん</div>
                    </div>
                    <div class="sbv2-model-info-item">
                        <div class="sbv2-model-info-item-name">FN6</div>
                        <div class="sbv2-model-info-item-desc">１８歳くらい　清楚　真面目　頭よさそう　エロすくなめ　羽川系</div>
                    </div>
                    <div class="sbv2-model-info-item">
                        <div class="sbv2-model-info-item-name">FN7</div>
                        <div class="sbv2-model-info-item-desc">２０歳　声やや低め　スポーティー　真がある　はつらつ元気系</div>
                    </div>
                    <div class="sbv2-model-info-item">
                        <div class="sbv2-model-info-item-name">FN8</div>
                        <div class="sbv2-model-info-item-desc">２１歳　大人がかわい子ぶってる感じ　あまあま</div>
                    </div>
                    <div class="sbv2-model-info-item">
                        <div class="sbv2-model-info-item-name">FN9</div>
                        <div class="sbv2-model-info-item-desc">１８歳　声高い　しっかりもの　お嬢様</div>
                    </div>
                    <div class="sbv2-model-info-item">
                        <div class="sbv2-model-info-item-name">FN10</div>
                        <div class="sbv2-model-info-item-desc">１８歳　中低温　おっとりまろやか</div>
                    </div>
                    
                    <div class="sbv2-model-info-category">🎙️ jvnvシリーズ</div>
                    <div class="sbv2-model-info-item">
                        <div class="sbv2-model-info-item-name">jvnv-F1-jp</div>
                        <div class="sbv2-model-info-item-desc">中音ボイス　中性的</div>
                    </div>
                    <div class="sbv2-model-info-item">
                        <div class="sbv2-model-info-item-name">jvnv-F2-jp</div>
                        <div class="sbv2-model-info-item-desc">中音ボイス　女性</div>
                    </div>
                    <div class="sbv2-model-info-item">
                        <div class="sbv2-model-info-item-name">jvnv-M1-jp</div>
                        <div class="sbv2-model-info-item-desc">中低音ボイス　男性</div>
                    </div>
                    <div class="sbv2-model-info-item">
                        <div class="sbv2-model-info-item-name">jvnv-M2-jp</div>
                        <div class="sbv2-model-info-item-desc">中高音ボイス　男性</div>
                    </div>
                    
                    <div class="sbv2-model-info-category">🎀 koharune</div>
                    <div class="sbv2-model-info-item">
                        <div class="sbv2-model-info-item-name">koharune</div>
                        <div class="sbv2-model-info-item-desc">ささやきロリータ</div>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        this.modelInfoModal = modal;
        
        this.panel = panel;
        this.toggleBtn = toggleBtn;
    }
    
    /**
     * イベントリスナーを設定
     */
    setupEventListeners() {
        const $ = id => document.getElementById(id);
        
        // トグルボタン
        this.toggleBtn.addEventListener('click', () => {
            this.panel.classList.toggle('visible');
        });
        
        // 閉じるボタン
        $('sbv2-close').addEventListener('click', () => {
            this.panel.classList.remove('visible');
        });
        
        // 接続ボタン
        $('sbv2-connect-btn').addEventListener('click', () => this.connect());
        
        // 有効/無効切り替え
        $('sbv2-enabled').addEventListener('change', (e) => {
            this.settings.enabled = e.target.checked;
            this.updateToggleButton();
            this.saveSettings();
        });
        
        // URL変更
        $('sbv2-url').addEventListener('change', (e) => {
            this.settings.baseUrl = e.target.value;
            this.saveSettings();
        });
        
        // スタイル選択
        document.querySelectorAll('.sbv2-style-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.sbv2-style-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.settings.style = btn.dataset.style;
                this.saveSettings();
            });
        });
        
        // 感情の強さ
        $('sbv2-weight').addEventListener('input', (e) => {
            const val = parseInt(e.target.value);
            $('sbv2-weight-value').textContent = val;
            this.settings.styleWeight = val;
            this.saveSettings();
        });
        
        // 速度
        $('sbv2-speed').addEventListener('input', (e) => {
            const val = parseFloat(e.target.value);
            $('sbv2-speed-value').textContent = val.toFixed(1);
            this.settings.speed = val;
            this.saveSettings();
        });
        
        // テスト読み上げ
        $('sbv2-test-btn').addEventListener('click', () => this.testSpeak());
        
        // モデル性格表ボタン
        $('sbv2-model-info-btn').addEventListener('click', () => this.showModelInfoModal());
        $('sbv2-model-info-close').addEventListener('click', () => this.hideModelInfoModal());
        this.modelInfoModal.addEventListener('click', (e) => {
            if (e.target === this.modelInfoModal) {
                this.hideModelInfoModal();
            }
        });
        
        // ドラッグ機能
        this.setupDrag();
        
        // 初期値を設定
        $('sbv2-url').value = this.settings.baseUrl;
        $('sbv2-weight').value = this.settings.styleWeight;
        $('sbv2-weight-value').textContent = this.settings.styleWeight;
        $('sbv2-speed').value = this.settings.speed;
        $('sbv2-speed-value').textContent = this.settings.speed.toFixed(1);
        $('sbv2-enabled').checked = this.settings.enabled;
    }
    
    /**
     * ドラッグ機能を設定
     */
    setupDrag() {
        const header = this.panel.querySelector('.sbv2-header');
        let isDragging = false;
        let offsetX = 0, offsetY = 0;
        
        header.addEventListener('mousedown', (e) => {
            if (e.target.classList.contains('sbv2-close')) return;
            isDragging = true;
            const rect = this.panel.getBoundingClientRect();
            offsetX = e.clientX - rect.left;
            offsetY = e.clientY - rect.top;
            e.preventDefault();
        });
        
        document.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            let x = e.clientX - offsetX;
            let y = e.clientY - offsetY;
            x = Math.max(0, Math.min(x, window.innerWidth - this.panel.offsetWidth));
            y = Math.max(0, Math.min(y, window.innerHeight - this.panel.offsetHeight));
            this.panel.style.left = x + 'px';
            this.panel.style.top = y + 'px';
            this.panel.style.bottom = 'auto';
        });
        
        document.addEventListener('mouseup', () => isDragging = false);
    }
    
    /**
     * 接続を試行
     */
    async tryConnect() {
        if (this.settings.baseUrl) {
            await this.connect();
        }
    }
    
    /**
     * SBV2サーバーに接続
     */
    async connect() {
        const $ = id => document.getElementById(id);
        const url = $('sbv2-url').value;
        
        $('sbv2-status-text').textContent = '接続中...';
        $('sbv2-connect-btn').disabled = true;
        
        try {
            this.sbv2Client = new StyleBertVits2Client(url);
            
            // タイムアウト付きfetch
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000);
            
            const response = await fetch(`${url}/api/version`, {
                method: 'GET',
                signal: controller.signal
            });
            
            clearTimeout(timeoutId);
            
            if (response.ok) {
                const version = await response.json();
                console.log('✅ SBV2接続成功:', version);
                
                // モデル情報を取得
                const modelsResponse = await fetch(`${url}/api/models_info`);
                if (modelsResponse.ok) {
                    this.modelsInfo = await modelsResponse.json();
                    this.sbv2Client.modelsInfo = this.modelsInfo;
                    this.sbv2Client.isAvailable = true;
                    this.renderModels();
                }
                
                this.isConnected = true;
                $('sbv2-status-dot').className = 'sbv2-status-dot connected';
                $('sbv2-status-text').textContent = `接続OK (v${version})`;
                $('sbv2-test-btn').disabled = false;
                this.toggleBtn.classList.remove('disconnected');
                this.updateToggleButton();
                
            } else {
                throw new Error('接続失敗');
            }
            
        } catch (error) {
            console.error('❌ SBV2接続エラー:', error);
            this.isConnected = false;
            $('sbv2-status-dot').className = 'sbv2-status-dot error';
            $('sbv2-status-text').textContent = '接続失敗';
            $('sbv2-test-btn').disabled = true;
            this.toggleBtn.classList.add('disconnected');
            this.toggleBtn.innerHTML = '🎤 SBV2 OFF';
        }
        
        $('sbv2-connect-btn').disabled = false;
    }
    
    /**
     * モデル一覧を描画
     */
    renderModels() {
        const grid = document.getElementById('sbv2-model-grid');
        if (!this.modelsInfo || this.modelsInfo.length === 0) {
            grid.innerHTML = '<div style="grid-column:1/-1;text-align:center;color:#888;padding:20px;">モデルがありません</div>';
            return;
        }
        
        // モデルのアイコンを決定
        const getModelIcon = (name) => {
            const lowerName = name.toLowerCase();
            if (lowerName.includes('f1') || lowerName.includes('f2') || lowerName.includes('fn')) return '👩';
            if (lowerName.includes('m1') || lowerName.includes('m2')) return '👨';
            if (lowerName.includes('ami') || lowerName.includes('koharune')) return '🎀';
            if (lowerName.includes('amitaro')) return '🐱';
            return '🎤';
        };
        
        grid.innerHTML = this.modelsInfo.map(model => {
            const isActive = model.name === this.settings.model;
            const stylesCount = model.styles ? model.styles.length : 0;
            return `
                <div class="sbv2-model-item ${isActive ? 'active' : ''}" data-model="${model.name}">
                    <div class="sbv2-model-icon">${getModelIcon(model.name)}</div>
                    <div class="sbv2-model-name">${model.name}</div>
                    <div class="sbv2-model-styles">${stylesCount}スタイル</div>
                </div>
            `;
        }).join('');
        
        // モデル選択イベント
        grid.querySelectorAll('.sbv2-model-item').forEach(item => {
            item.addEventListener('click', () => {
                grid.querySelectorAll('.sbv2-model-item').forEach(i => i.classList.remove('active'));
                item.classList.add('active');
                this.settings.model = item.dataset.model;
                this.sbv2Client.setModel(this.settings.model);
                this.saveSettings();
                
                // スタイル一覧を更新
                this.updateStyleButtons();
                
                console.log('🎤 モデル選択:', this.settings.model);
            });
        });
        
        // 初期モデルを設定
        if (this.sbv2Client) {
            this.sbv2Client.setModel(this.settings.model);
        }
    }
    
    /**
     * スタイルボタンを更新（選択モデルに応じて）
     */
    updateStyleButtons() {
        const model = this.modelsInfo.find(m => m.name === this.settings.model);
        if (!model || !model.styles) return;
        
        const styleIcons = {
            'Neutral': '😐', 'Happy': '😊', 'Angry': '😠', 'Sad': '😢',
            'Surprise': '😲', 'Fear': '😨', 'Disgust': '🤢',
            'るんるん': '🎵', 'ささやきA（無声）': '🤫', 'ささやきB（有声）': '🤫',
            'ノーマル': '😐', 'よふかし': '🌙'
        };
        
        const grid = document.getElementById('sbv2-style-grid');
        grid.innerHTML = model.styles.map(style => {
            const isActive = style === this.settings.style;
            const icon = styleIcons[style] || '🎭';
            return `<button class="sbv2-style-btn ${isActive ? 'active' : ''}" data-style="${style}">${icon} ${style}</button>`;
        }).join('');
        
        // イベント再設定
        grid.querySelectorAll('.sbv2-style-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                grid.querySelectorAll('.sbv2-style-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.settings.style = btn.dataset.style;
                this.saveSettings();
            });
        });
    }
    
    /**
     * トグルボタンの状態を更新
     */
    updateToggleButton() {
        if (this.isConnected && this.settings.enabled) {
            this.toggleBtn.classList.add('active');
            this.toggleBtn.innerHTML = '🎤 SBV2 ON';
        } else if (this.isConnected) {
            this.toggleBtn.classList.remove('active');
            this.toggleBtn.innerHTML = '🎤 SBV2 OFF';
        } else {
            this.toggleBtn.classList.remove('active');
            this.toggleBtn.innerHTML = '🎤 SBV2 未接続';
        }
    }
    
    /**
     * テスト読み上げ
     */
    async testSpeak() {
        if (!this.sbv2Client || !this.isConnected) {
            console.error('SBV2に接続されていません');
            return;
        }
        
        const text = document.getElementById('sbv2-test-text').value.trim();
        if (!text) return;
        
        const btn = document.getElementById('sbv2-test-btn');
        btn.disabled = true;
        btn.textContent = '🔊 再生中...';
        
        try {
            // 感情表示を更新
            this.showEmotion(this.settings.style, this.settings.styleWeight);
            
            // 音声合成
            const result = await this.sbv2Client.synthesize(text, {
                style: this.settings.style,
                weight: this.settings.styleWeight
            });
            
            // 再生
            await this.sbv2Client.playAudio(result.audioData);
            
            console.log(`✅ テスト読み上げ完了 (${result.elapsed}ms)`);
            
        } catch (error) {
            console.error('❌ 読み上げエラー:', error);
            alert('読み上げに失敗しました: ' + error.message);
        }
        
        btn.disabled = false;
        btn.textContent = '🔊 読み上げテスト';
    }
    
    /**
     * 感情表示を更新
     */
    showEmotion(style, weight) {
        const display = document.getElementById('sbv2-emotion-display');
        const icon = document.getElementById('sbv2-emotion-icon');
        const styleText = document.getElementById('sbv2-emotion-style');
        const weightFill = document.getElementById('sbv2-emotion-weight-fill');
        
        const styleIcons = {
            'Neutral': '😐', 'Happy': '😊', 'Angry': '😠', 'Sad': '😢',
            'Surprise': '😲', 'Fear': '😨', 'Disgust': '🤢'
        };
        
        display.style.display = 'flex';
        icon.textContent = styleIcons[style] || '🎭';
        styleText.textContent = `${style} Lv.${weight}`;
        weightFill.style.width = `${(weight / 20) * 100}%`;
    }
    
    /**
     * 外部から音声合成を実行（ChatGPT統合用）
     */
    async speak(text, emotion = null) {
        if (!this.isConnected || !this.settings.enabled) {
            return null;
        }
        
        try {
            const emotionData = emotion || {
                style: this.settings.style,
                weight: this.settings.styleWeight
            };
            
            // 感情表示
            this.showEmotion(emotionData.style, emotionData.weight);
            
            // 音声合成
            const result = await this.sbv2Client.synthesize(text, emotionData);
            
            // 再生
            await this.sbv2Client.playAudio(result.audioData);
            
            return result;
            
        } catch (error) {
            console.error('❌ SBV2読み上げエラー:', error);
            return null;
        }
    }
    
    /**
     * SBV2が有効かどうか
     */
    isEnabled() {
        return this.isConnected && this.settings.enabled;
    }
    
    /**
     * クライアントを取得
     */
    getClient() {
        return this.sbv2Client;
    }
    
    /**
     * モデル性格表モーダルを表示
     */
    showModelInfoModal() {
        this.modelInfoModal.classList.add('visible');
    }
    
    /**
     * モデル性格表モーダルを非表示
     */
    hideModelInfoModal() {
        this.modelInfoModal.classList.remove('visible');
    }
}

// グローバルに公開
window.StyleBertVits2Panel = StyleBertVits2Panel;
