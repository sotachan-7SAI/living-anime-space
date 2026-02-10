// ========================================
// 🎵 AI音楽生成パネル v2.0
// Suno API統合版
// 会話のムードから自動で音楽を生成・再生
// ========================================

console.log('🎵 AI音楽生成パネル v2.0 を読み込み中...');

class MusicGeneratorPanel {
    constructor() {
        this.panelId = 'music-generator-panel';
        this.isVisible = false;
        this.isDragging = false;
        this.dragOffset = { x: 0, y: 0 };
        this.isMinimized = false;
        
        // 音楽生成状態
        this.currentMood = null;
        this.isGenerating = false;
        this.isPlaying = false;
        this.audioElement = null;
        this.autoGenerateEnabled = false;
        
        // Suno API状態
        this.currentTaskId = null;
        this.pollingInterval = null;
        this.generatedSongs = [];
        
        // API設定
        this.apiSettings = {
            provider: 'suno', // 'suno' | 'demo'
            sunoApiKey: '',
            sunoModel: 'V4_5ALL', // V4, V4_5, V4_5PLUS, V4_5ALL, V5
            duration: 60,
            instrumental: true, // BGMなのでインストゥルメンタル
            autoGenerate: false
        };
        
        // ムード→スタイルのマッピング
        this.moodToStyle = {
            'calm': { style: 'Ambient, Lo-fi, Peaceful Piano', prompt: 'A calm and relaxing instrumental track with soft melodies and gentle atmosphere' },
            'happy': { style: 'Pop, Upbeat, Cheerful', prompt: 'A happy and uplifting instrumental with bright melodies and positive energy' },
            'sad': { style: 'Melancholic, Piano Ballad, Emotional', prompt: 'A sad and emotional instrumental piece with deep feelings and touching melodies' },
            'energetic': { style: 'Electronic, Dance, EDM, Upbeat', prompt: 'An energetic and powerful instrumental track with driving beats and exciting rhythms' },
            'romantic': { style: 'Romantic, Soft Jazz, Smooth', prompt: 'A romantic and warm instrumental with beautiful harmonies and loving atmosphere' },
            'mysterious': { style: 'Cinematic, Dark Ambient, Mysterious', prompt: 'A mysterious and intriguing instrumental with suspenseful tones and enigmatic vibes' },
            'angry': { style: 'Rock, Aggressive, Intense', prompt: 'An intense and powerful instrumental with aggressive energy and strong rhythms' },
            'neutral': { style: 'Chill, Background Music, Easy Listening', prompt: 'A neutral and pleasant instrumental suitable for background music' }
        };
        
        // ムード履歴
        this.moodHistory = [];
        
        this.init();
    }
    
    init() {
        this.createAudioElement();  // 最初にAudio要素を作成
        this.createPanel();
        this.loadSettings();
        this.setupEventListeners();
        console.log('✅ AI音楽生成パネル v2.0 初期化完了');
    }
    
    createAudioElement() {
        this.audioElement = new Audio();
        this.audioElement.addEventListener('timeupdate', () => this.updateProgressFromAudio());
        this.audioElement.addEventListener('ended', () => this.onAudioEnded());
        this.audioElement.addEventListener('loadedmetadata', () => {
            this.updateStatus(`準備完了 (${Math.floor(this.audioElement.duration)}秒)`);
        });
        this.audioElement.addEventListener('error', (e) => {
            console.error('Audio error:', e);
            this.updateStatus('音声読み込みエラー');
        });
    }
    
    createPanel() {
        const panel = document.createElement('div');
        panel.id = this.panelId;
        panel.innerHTML = `
            <div class="music-panel-header">
                <span class="music-panel-title">🎵 AI音楽生成 (Suno)</span>
                <div class="music-panel-controls">
                    <button class="music-panel-btn minimize-btn" title="最小化">−</button>
                    <button class="music-panel-btn close-btn" title="閉じる">×</button>
                </div>
            </div>
            <div class="music-panel-content">
                <!-- 現在のムード表示 -->
                <div class="music-section">
                    <div class="section-label">🎭 検出されたムード</div>
                    <div class="mood-display">
                        <span class="mood-emoji">😊</span>
                        <span class="mood-text">待機中...</span>
                    </div>
                    <div class="mood-tags"></div>
                </div>
                
                <!-- プレイヤー -->
                <div class="music-section">
                    <div class="section-label">🎧 プレイヤー</div>
                    <div class="player-controls">
                        <button class="player-btn" id="music-play-btn" disabled>
                            <span class="play-icon">▶</span>
                        </button>
                        <button class="player-btn" id="music-stop-btn" disabled>
                            <span class="stop-icon">■</span>
                        </button>
                        <button class="player-btn small" id="music-next-btn" disabled title="次の曲">
                            <span>⏭</span>
                        </button>
                        <div class="volume-control">
                            <span>🔊</span>
                            <input type="range" id="music-volume" min="0" max="100" value="30">
                        </div>
                    </div>
                    <div class="player-status">
                        <span class="status-text">準備完了</span>
                        <div class="progress-bar">
                            <div class="progress-fill"></div>
                        </div>
                    </div>
                    <!-- 生成された曲リスト -->
                    <div class="generated-songs" id="generated-songs-list"></div>
                </div>
                
                <!-- 手動生成 -->
                <div class="music-section">
                    <div class="section-label">✨ 手動生成</div>
                    <div class="manual-generate">
                        <input type="text" id="mood-input" placeholder="ムードを入力 (例: calm, energetic)">
                        <button class="generate-btn" id="manual-generate-btn">生成</button>
                    </div>
                    <div class="preset-moods">
                        <button class="mood-preset" data-mood="calm">😌 穏やか</button>
                        <button class="mood-preset" data-mood="happy">😊 幸せ</button>
                        <button class="mood-preset" data-mood="sad">😢 悲しい</button>
                        <button class="mood-preset" data-mood="energetic">⚡ 元気</button>
                        <button class="mood-preset" data-mood="romantic">💕 ロマンチック</button>
                        <button class="mood-preset" data-mood="mysterious">🌙 神秘的</button>
                    </div>
                </div>
                
                <!-- 自動生成トグル -->
                <div class="music-section">
                    <div class="section-label">🤖 自動生成</div>
                    <div class="auto-generate-toggle">
                        <label class="toggle-switch">
                            <input type="checkbox" id="auto-generate-toggle">
                            <span class="toggle-slider"></span>
                        </label>
                        <span class="toggle-label">会話からムードを自動検出して音楽生成</span>
                    </div>
                </div>
                
                <!-- API設定 -->
                <div class="music-section collapsible">
                    <div class="section-label expandable" data-target="api-settings">
                        ⚙️ Suno API設定 <span class="expand-icon">▼</span>
                    </div>
                    <div class="collapsible-content" id="api-settings">
                        <div class="api-setting">
                            <label>プロバイダー</label>
                            <select id="music-provider">
                                <option value="suno">Suno API (sunoapi.org)</option>
                                <option value="demo">デモモード</option>
                            </select>
                        </div>
                        <div class="api-setting suno-settings">
                            <label>Suno API Key (sunoapi.org)</label>
                            <input type="password" id="suno-api-key" placeholder="Bearer token を入力">
                            <div class="api-hint">
                                <a href="https://sunoapi.org/dashboard" target="_blank">🔗 APIキー取得</a>
                            </div>
                        </div>
                        <div class="api-setting suno-settings">
                            <label>モデル</label>
                            <select id="suno-model">
                                <option value="V4">V4 (4分まで, 高品質)</option>
                                <option value="V4_5">V4.5 (8分まで)</option>
                                <option value="V4_5PLUS">V4.5+ (豊かな音色)</option>
                                <option value="V4_5ALL" selected>V4.5 ALL (良い構成)</option>
                                <option value="V5">V5 (最新)</option>
                            </select>
                        </div>
                        <div class="api-setting suno-settings">
                            <label>
                                <input type="checkbox" id="suno-instrumental" checked>
                                インストゥルメンタル（BGM向け）
                            </label>
                        </div>
                        <div class="api-setting">
                            <label>クレジット残高: <span id="credits-display">--</span></label>
                            <button class="check-credits-btn" id="check-credits-btn">確認</button>
                        </div>
                        <button class="save-settings-btn" id="save-music-settings">設定を保存</button>
                    </div>
                </div>
                
                <!-- 履歴 -->
                <div class="music-section collapsible">
                    <div class="section-label expandable" data-target="mood-history">
                        📜 生成履歴 <span class="expand-icon">▼</span>
                    </div>
                    <div class="collapsible-content" id="mood-history">
                        <div class="history-list"></div>
                    </div>
                </div>
            </div>
            <div class="music-panel-footer">
                <span class="footer-drag-handle">≡ ドラッグで移動 ≡</span>
            </div>
        `;
        
        // スタイルを追加
        this.addStyles();
        
        document.body.appendChild(panel);
        this.panel = panel;
        
        // 初期位置を設定
        this.setInitialPosition();
    }
    
    addStyles() {
        if (document.getElementById('music-panel-styles')) return;
        
        const style = document.createElement('style');
        style.id = 'music-panel-styles';
        style.textContent = `
            #music-generator-panel {
                position: fixed;
                top: 100px;
                left: 50%;
                transform: translateX(-50%);
                width: 340px;
                background: rgba(255, 255, 255, 0.98);
                border-radius: 12px;
                box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
                z-index: 10000;
                font-family: 'Segoe UI', 'Yu Gothic', sans-serif;
                font-size: 12px;
                display: none;
                overflow: hidden;
                backdrop-filter: blur(10px);
            }
            
            #music-generator-panel.visible {
                display: block;
                animation: panelSlideIn 0.3s ease;
            }
            
            @keyframes panelSlideIn {
                from { opacity: 0; transform: translateX(-50%) translateY(-20px); }
                to { opacity: 1; transform: translateX(-50%) translateY(0); }
            }
            
            #music-generator-panel.minimized .music-panel-content {
                display: none;
            }
            
            #music-generator-panel.minimized {
                width: auto;
                min-width: 200px;
            }
            
            .music-panel-header {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                padding: 10px 12px;
                display: flex;
                justify-content: space-between;
                align-items: center;
                cursor: move;
                user-select: none;
            }
            
            .music-panel-title {
                font-weight: bold;
                font-size: 13px;
            }
            
            .music-panel-controls {
                display: flex;
                gap: 6px;
            }
            
            .music-panel-btn {
                background: rgba(255, 255, 255, 0.2);
                border: none;
                color: white;
                width: 24px;
                height: 24px;
                border-radius: 4px;
                cursor: pointer;
                font-size: 14px;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: background 0.2s;
            }
            
            .music-panel-btn:hover {
                background: rgba(255, 255, 255, 0.3);
            }
            
            .music-panel-content {
                padding: 12px;
                max-height: 550px;
                overflow-y: auto;
            }
            
            .music-section {
                margin-bottom: 12px;
                padding-bottom: 12px;
                border-bottom: 1px solid #eee;
            }
            
            .music-section:last-child {
                border-bottom: none;
                margin-bottom: 0;
            }
            
            .section-label {
                font-weight: bold;
                color: #333;
                margin-bottom: 8px;
                font-size: 11px;
            }
            
            .section-label.expandable {
                cursor: pointer;
                display: flex;
                justify-content: space-between;
                align-items: center;
            }
            
            .section-label.expandable:hover {
                color: #667eea;
            }
            
            .expand-icon {
                transition: transform 0.2s;
                font-size: 10px;
            }
            
            .section-label.expanded .expand-icon {
                transform: rotate(180deg);
            }
            
            .collapsible-content {
                display: none;
                padding-top: 8px;
            }
            
            .collapsible-content.visible {
                display: block;
            }
            
            /* ムード表示 */
            .mood-display {
                display: flex;
                align-items: center;
                gap: 10px;
                padding: 10px;
                background: linear-gradient(135deg, #f5f7fa 0%, #e8ecf1 100%);
                border-radius: 8px;
                margin-bottom: 8px;
            }
            
            .mood-emoji {
                font-size: 28px;
            }
            
            .mood-text {
                font-size: 14px;
                font-weight: bold;
                color: #333;
            }
            
            .mood-tags {
                display: flex;
                flex-wrap: wrap;
                gap: 4px;
            }
            
            .mood-tag {
                background: #667eea;
                color: white;
                padding: 2px 8px;
                border-radius: 10px;
                font-size: 10px;
            }
            
            /* プレイヤー */
            .player-controls {
                display: flex;
                align-items: center;
                gap: 8px;
                margin-bottom: 8px;
            }
            
            .player-btn {
                width: 40px;
                height: 40px;
                border-radius: 50%;
                border: none;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                cursor: pointer;
                font-size: 14px;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: all 0.2s;
            }
            
            .player-btn.small {
                width: 32px;
                height: 32px;
                font-size: 12px;
            }
            
            .player-btn:hover:not(:disabled) {
                transform: scale(1.1);
                box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
            }
            
            .player-btn:disabled {
                background: #ccc;
                cursor: not-allowed;
            }
            
            .player-btn.playing {
                background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
            }
            
            .volume-control {
                display: flex;
                align-items: center;
                gap: 4px;
                flex: 1;
            }
            
            .volume-control input[type="range"] {
                flex: 1;
                height: 4px;
                -webkit-appearance: none;
                background: #ddd;
                border-radius: 2px;
            }
            
            .volume-control input[type="range"]::-webkit-slider-thumb {
                -webkit-appearance: none;
                width: 12px;
                height: 12px;
                background: #667eea;
                border-radius: 50%;
                cursor: pointer;
            }
            
            .player-status {
                margin-top: 8px;
            }
            
            .status-text {
                font-size: 10px;
                color: #666;
                display: block;
                margin-bottom: 4px;
            }
            
            .progress-bar {
                height: 4px;
                background: #eee;
                border-radius: 2px;
                overflow: hidden;
                cursor: pointer;
            }
            
            .progress-fill {
                height: 100%;
                width: 0%;
                background: linear-gradient(90deg, #667eea, #764ba2);
                transition: width 0.1s;
            }
            
            /* 生成された曲リスト */
            .generated-songs {
                margin-top: 8px;
                max-height: 100px;
                overflow-y: auto;
            }
            
            .song-item {
                display: flex;
                align-items: center;
                gap: 8px;
                padding: 6px 8px;
                background: #f8f9fa;
                border-radius: 6px;
                margin-bottom: 4px;
                font-size: 10px;
                cursor: pointer;
                transition: all 0.2s;
            }
            
            .song-item:hover {
                background: #e9ecef;
            }
            
            .song-item.active {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
            }
            
            .song-item .song-title {
                flex: 1;
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
            }
            
            /* 手動生成 */
            .manual-generate {
                display: flex;
                gap: 8px;
                margin-bottom: 8px;
            }
            
            .manual-generate input {
                flex: 1;
                padding: 8px;
                border: 1px solid #ddd;
                border-radius: 6px;
                font-size: 11px;
            }
            
            .manual-generate input:focus {
                outline: none;
                border-color: #667eea;
            }
            
            .generate-btn {
                padding: 8px 12px;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                border: none;
                border-radius: 6px;
                cursor: pointer;
                font-size: 11px;
                transition: all 0.2s;
            }
            
            .generate-btn:hover:not(:disabled) {
                transform: translateY(-1px);
                box-shadow: 0 2px 8px rgba(102, 126, 234, 0.4);
            }
            
            .generate-btn:disabled {
                background: #ccc;
                cursor: not-allowed;
            }
            
            .preset-moods {
                display: flex;
                flex-wrap: wrap;
                gap: 4px;
            }
            
            .mood-preset {
                padding: 4px 8px;
                background: #f0f0f0;
                border: 1px solid #ddd;
                border-radius: 12px;
                cursor: pointer;
                font-size: 10px;
                transition: all 0.2s;
            }
            
            .mood-preset:hover {
                background: #667eea;
                color: white;
                border-color: #667eea;
            }
            
            /* 自動生成トグル */
            .auto-generate-toggle {
                display: flex;
                align-items: center;
                gap: 10px;
            }
            
            .toggle-switch {
                position: relative;
                width: 44px;
                height: 22px;
            }
            
            .toggle-switch input {
                opacity: 0;
                width: 0;
                height: 0;
            }
            
            .toggle-slider {
                position: absolute;
                cursor: pointer;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: #ccc;
                border-radius: 22px;
                transition: 0.3s;
            }
            
            .toggle-slider:before {
                position: absolute;
                content: "";
                height: 18px;
                width: 18px;
                left: 2px;
                bottom: 2px;
                background: white;
                border-radius: 50%;
                transition: 0.3s;
            }
            
            .toggle-switch input:checked + .toggle-slider {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            }
            
            .toggle-switch input:checked + .toggle-slider:before {
                transform: translateX(22px);
            }
            
            .toggle-label {
                font-size: 10px;
                color: #666;
            }
            
            /* API設定 */
            .api-setting {
                margin-bottom: 10px;
            }
            
            .api-setting label {
                display: block;
                font-size: 10px;
                color: #666;
                margin-bottom: 4px;
            }
            
            .api-setting input[type="text"],
            .api-setting input[type="password"],
            .api-setting select {
                width: 100%;
                padding: 8px;
                border: 1px solid #ddd;
                border-radius: 6px;
                font-size: 11px;
            }
            
            .api-setting input:focus,
            .api-setting select:focus {
                outline: none;
                border-color: #667eea;
            }
            
            .api-hint {
                font-size: 9px;
                color: #888;
                margin-top: 4px;
            }
            
            .api-hint a {
                color: #667eea;
            }
            
            .save-settings-btn {
                width: 100%;
                padding: 8px;
                background: #28a745;
                color: white;
                border: none;
                border-radius: 6px;
                cursor: pointer;
                font-size: 11px;
                transition: all 0.2s;
            }
            
            .save-settings-btn:hover {
                background: #218838;
            }
            
            .check-credits-btn {
                padding: 4px 8px;
                background: #667eea;
                color: white;
                border: none;
                border-radius: 4px;
                cursor: pointer;
                font-size: 10px;
                margin-left: 8px;
            }
            
            /* 履歴 */
            .history-list {
                max-height: 150px;
                overflow-y: auto;
            }
            
            .history-item {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 6px 8px;
                background: #f8f9fa;
                border-radius: 6px;
                margin-bottom: 4px;
                font-size: 10px;
            }
            
            .history-item:hover {
                background: #e9ecef;
            }
            
            .history-mood {
                display: flex;
                align-items: center;
                gap: 4px;
            }
            
            .history-time {
                color: #999;
            }
            
            .history-play {
                background: #667eea;
                color: white;
                border: none;
                padding: 2px 6px;
                border-radius: 4px;
                cursor: pointer;
                font-size: 9px;
            }
            
            /* 生成中アニメーション */
            .generating {
                position: relative;
                overflow: hidden;
            }
            
            .generating::after {
                content: '';
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: linear-gradient(90deg, 
                    transparent, 
                    rgba(102, 126, 234, 0.3), 
                    transparent
                );
                animation: shimmer 1.5s infinite;
            }
            
            @keyframes shimmer {
                0% { transform: translateX(-100%); }
                100% { transform: translateX(100%); }
            }
            
            /* トグルボタン（メニューバー用） */
            #music-toggle-btn {
                position: fixed;
                bottom: 80px;
                left: 10px;
                width: 50px;
                height: 50px;
                border-radius: 50%;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                border: none;
                cursor: pointer;
                font-size: 24px;
                box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
                z-index: 9999;
                transition: all 0.2s;
                display: flex;
                align-items: center;
                justify-content: center;
            }
            
            #music-toggle-btn:hover {
                transform: scale(1.1);
                box-shadow: 0 6px 16px rgba(102, 126, 234, 0.5);
            }
            
            #music-toggle-btn.active {
                background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
            }
            
            /* フッター（下部ドラッグハンドル） */
            .music-panel-footer {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                padding: 8px 12px;
                text-align: center;
                cursor: move;
                user-select: none;
                border-top: 1px solid rgba(255, 255, 255, 0.2);
            }
            
            .footer-drag-handle {
                font-size: 11px;
                opacity: 0.9;
                letter-spacing: 1px;
            }
            
            .music-panel-footer:hover {
                background: linear-gradient(135deg, #5a6fd6 0%, #6a4190 100%);
            }
            
            .music-panel-footer:active {
                background: linear-gradient(135deg, #4e5fc4 0%, #5e377e 100%);
            }
            
            #music-toggle-btn.generating {
                animation: pulse 1s infinite;
            }
            
            @keyframes pulse {
                0%, 100% { transform: scale(1); }
                50% { transform: scale(1.1); }
            }
            
            @keyframes fadeInOut {
                0% { opacity: 0; transform: translateY(20px); }
                20% { opacity: 1; transform: translateY(0); }
                80% { opacity: 1; transform: translateY(0); }
                100% { opacity: 0; transform: translateY(-20px); }
            }
        `;
        
        document.head.appendChild(style);
    }
    
    setInitialPosition() {
        const saved = localStorage.getItem('musicPanelPosition');
        if (saved) {
            const pos = JSON.parse(saved);
            this.panel.style.left = pos.left + 'px';
            this.panel.style.top = pos.top + 'px';
            this.panel.style.transform = 'none';
        }
    }
    
    setupEventListeners() {
        // ヘッダーのドラッグ
        const header = this.panel.querySelector('.music-panel-header');
        header.addEventListener('mousedown', (e) => this.startDrag(e));
        
        // フッターのドラッグ（下部からも掴めるように）
        const footer = this.panel.querySelector('.music-panel-footer');
        if (footer) {
            footer.addEventListener('mousedown', (e) => this.startDrag(e));
        }
        
        document.addEventListener('mousemove', (e) => this.drag(e));
        document.addEventListener('mouseup', () => this.endDrag());
        
        // 閉じるボタン
        this.panel.querySelector('.close-btn').addEventListener('click', () => this.hide());
        
        // 最小化ボタン
        this.panel.querySelector('.minimize-btn').addEventListener('click', () => this.toggleMinimize());
        
        // 再生/停止ボタン
        document.getElementById('music-play-btn').addEventListener('click', () => this.togglePlay());
        document.getElementById('music-stop-btn').addEventListener('click', () => this.stopMusic());
        document.getElementById('music-next-btn').addEventListener('click', () => this.playNextSong());
        
        // 音量
        document.getElementById('music-volume').addEventListener('input', (e) => {
            if (this.audioElement) {
                this.audioElement.volume = e.target.value / 100;
            }
        });
        
        // プログレスバークリック
        this.panel.querySelector('.progress-bar').addEventListener('click', (e) => {
            if (this.audioElement && this.audioElement.duration) {
                const rect = e.target.getBoundingClientRect();
                const percent = (e.clientX - rect.left) / rect.width;
                this.audioElement.currentTime = percent * this.audioElement.duration;
            }
        });
        
        // 手動生成
        document.getElementById('manual-generate-btn').addEventListener('click', () => {
            const mood = document.getElementById('mood-input').value;
            if (mood) this.generateMusic(mood);
        });
        
        // Enterキーで生成
        document.getElementById('mood-input').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                const mood = e.target.value;
                if (mood) this.generateMusic(mood);
            }
        });
        
        // プリセットムード
        this.panel.querySelectorAll('.mood-preset').forEach(btn => {
            btn.addEventListener('click', () => {
                this.generateMusic(btn.dataset.mood);
            });
        });
        
        // 自動生成トグル
        document.getElementById('auto-generate-toggle').addEventListener('change', (e) => {
            this.autoGenerateEnabled = e.target.checked;
            this.saveSettings();
        });
        
        // プロバイダー切り替え
        document.getElementById('music-provider').addEventListener('change', (e) => {
            this.updateProviderUI(e.target.value);
        });
        
        // クレジット確認
        document.getElementById('check-credits-btn').addEventListener('click', () => this.checkCredits());
        
        // 設定保存
        document.getElementById('save-music-settings').addEventListener('click', () => this.saveSettings());
        
        // 折りたたみセクション
        this.panel.querySelectorAll('.section-label.expandable').forEach(label => {
            label.addEventListener('click', () => {
                label.classList.toggle('expanded');
                const content = document.getElementById(label.dataset.target);
                content.classList.toggle('visible');
            });
        });
        
        // トグルボタンを作成
        this.createToggleButton();
    }
    
    createToggleButton() {
        const btn = document.createElement('button');
        btn.id = 'music-toggle-btn';
        btn.innerHTML = '🎵';
        btn.title = 'AI音楽生成パネル';
        btn.addEventListener('click', () => this.toggle());
        document.body.appendChild(btn);
        this.toggleBtn = btn;
    }
    
    startDrag(e) {
        if (e.target.classList.contains('music-panel-btn')) return;
        this.isDragging = true;
        const rect = this.panel.getBoundingClientRect();
        this.dragOffset.x = e.clientX - rect.left;
        this.dragOffset.y = e.clientY - rect.top;
        this.panel.style.transform = 'none';
    }
    
    drag(e) {
        if (!this.isDragging) return;
        const x = e.clientX - this.dragOffset.x;
        const y = e.clientY - this.dragOffset.y;
        this.panel.style.left = x + 'px';
        this.panel.style.top = y + 'px';
    }
    
    endDrag() {
        if (this.isDragging) {
            this.isDragging = false;
            localStorage.setItem('musicPanelPosition', JSON.stringify({
                left: parseInt(this.panel.style.left),
                top: parseInt(this.panel.style.top)
            }));
        }
    }
    
    show() {
        this.panel.classList.add('visible');
        this.isVisible = true;
        this.toggleBtn.classList.add('active');
    }
    
    hide() {
        this.panel.classList.remove('visible');
        this.isVisible = false;
        this.toggleBtn.classList.remove('active');
    }
    
    toggle() {
        if (this.isVisible) {
            this.hide();
        } else {
            this.show();
        }
    }
    
    toggleMinimize() {
        this.isMinimized = !this.isMinimized;
        this.panel.classList.toggle('minimized', this.isMinimized);
        this.panel.querySelector('.minimize-btn').textContent = this.isMinimized ? '+' : '−';
    }
    
    updateProviderUI(provider) {
        const sunoSettings = this.panel.querySelectorAll('.suno-settings');
        sunoSettings.forEach(el => {
            el.style.display = provider === 'suno' ? 'block' : 'none';
        });
    }
    
    loadSettings() {
        const saved = localStorage.getItem('musicGeneratorSettings');
        if (saved) {
            this.apiSettings = { ...this.apiSettings, ...JSON.parse(saved) };
            
            document.getElementById('music-provider').value = this.apiSettings.provider;
            document.getElementById('suno-api-key').value = this.apiSettings.sunoApiKey || '';
            document.getElementById('suno-model').value = this.apiSettings.sunoModel || 'V4_5ALL';
            document.getElementById('suno-instrumental').checked = this.apiSettings.instrumental !== false;
            document.getElementById('auto-generate-toggle').checked = this.apiSettings.autoGenerate;
            
            this.autoGenerateEnabled = this.apiSettings.autoGenerate;
            this.updateProviderUI(this.apiSettings.provider);
        }
        
        // 音量を設定
        this.audioElement.volume = 0.3;
    }
    
    saveSettings() {
        this.apiSettings = {
            provider: document.getElementById('music-provider').value,
            sunoApiKey: document.getElementById('suno-api-key').value,
            sunoModel: document.getElementById('suno-model').value,
            instrumental: document.getElementById('suno-instrumental').checked,
            autoGenerate: document.getElementById('auto-generate-toggle').checked
        };
        
        localStorage.setItem('musicGeneratorSettings', JSON.stringify(this.apiSettings));
        this.showNotification('設定を保存しました ✓');
    }
    
    showNotification(message, type = 'success') {
        const notification = document.createElement('div');
        const bgColor = type === 'success' ? '#28a745' : type === 'error' ? '#dc3545' : '#ffc107';
        notification.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            background: ${bgColor};
            color: white;
            padding: 12px 20px;
            border-radius: 8px;
            z-index: 99999;
            animation: fadeInOut 3s forwards;
            max-width: 300px;
            word-wrap: break-word;
        `;
        notification.textContent = message;
        document.body.appendChild(notification);
        setTimeout(() => notification.remove(), 3000);
    }
    
    // ムード更新（外部から呼び出し可能）
    updateMood(mood, tags = []) {
        this.currentMood = mood;
        
        const moodEmojis = {
            'calm': '😌',
            'happy': '😊',
            'sad': '😢',
            'energetic': '⚡',
            'romantic': '💕',
            'mysterious': '🌙',
            'angry': '😠',
            'neutral': '😐'
        };
        
        const emoji = moodEmojis[mood] || '🎵';
        this.panel.querySelector('.mood-emoji').textContent = emoji;
        this.panel.querySelector('.mood-text').textContent = mood;
        
        const tagsContainer = this.panel.querySelector('.mood-tags');
        tagsContainer.innerHTML = tags.map(tag => 
            `<span class="mood-tag">${tag}</span>`
        ).join('');
        
        // 自動生成が有効なら生成
        if (this.autoGenerateEnabled && !this.isGenerating) {
            this.generateMusic(mood);
        }
    }
    
    addToHistory(mood, emoji, songs = []) {
        const now = new Date();
        const timeStr = `${now.getHours()}:${String(now.getMinutes()).padStart(2, '0')}`;
        
        this.moodHistory.unshift({ mood, emoji, time: timeStr, songs });
        if (this.moodHistory.length > 10) this.moodHistory.pop();
        
        this.updateHistoryUI();
    }
    
    updateHistoryUI() {
        const list = this.panel.querySelector('.history-list');
        list.innerHTML = this.moodHistory.map((item, i) => `
            <div class="history-item">
                <span class="history-mood">${item.emoji} ${item.mood}</span>
                <span class="history-time">${item.time}</span>
                ${item.songs && item.songs.length > 0 ? 
                    `<button class="history-play" data-index="${i}">▶ 再生</button>` : 
                    `<button class="history-play" data-index="${i}">🔄 再生成</button>`
                }
            </div>
        `).join('');
        
        list.querySelectorAll('.history-play').forEach(btn => {
            btn.addEventListener('click', () => {
                const item = this.moodHistory[btn.dataset.index];
                if (item.songs && item.songs.length > 0) {
                    this.playSongFromHistory(item.songs);
                } else {
                    this.generateMusic(item.mood);
                }
            });
        });
    }
    
    playSongFromHistory(songs) {
        this.generatedSongs = songs;
        this.updateSongsList();
        if (songs.length > 0 && songs[0].audio_url) {
            this.loadAndPlaySong(songs[0].audio_url);
        }
    }
    
    // ===========================================
    // Suno API 統合
    // ===========================================
    
    async generateMusic(mood) {
        if (this.isGenerating) {
            this.showNotification('生成中です...お待ちください', 'warning');
            return;
        }
        
        const provider = this.apiSettings.provider;
        
        if (provider === 'demo') {
            await this.generateDemoMusic(mood);
            return;
        }
        
        // Suno API
        const apiKey = this.apiSettings.sunoApiKey;
        if (!apiKey) {
            this.showNotification('Suno API Keyを設定してください', 'error');
            // API設定を開く
            const apiLabel = this.panel.querySelector('[data-target="api-settings"]');
            if (apiLabel && !apiLabel.classList.contains('expanded')) {
                apiLabel.click();
            }
            return;
        }
        
        this.isGenerating = true;
        this.toggleBtn.classList.add('generating');
        this.panel.querySelector('.mood-display').classList.add('generating');
        document.getElementById('manual-generate-btn').disabled = true;
        
        try {
            // ムード→スタイル変換
            const moodConfig = this.moodToStyle[mood] || this.moodToStyle['neutral'];
            
            this.updateStatus('🎵 Suno APIに接続中...');
            
            // Step 1: 生成リクエスト送信
            const taskId = await this.submitSunoGeneration(mood, moodConfig);
            this.currentTaskId = taskId;
            
            this.updateStatus(`🎵 音楽生成中... (TaskID: ${taskId.substring(0, 8)}...)`);
            
            // Step 2: ポーリングで完了を待つ
            const songs = await this.pollForCompletion(taskId);
            
            if (songs && songs.length > 0) {
                this.generatedSongs = songs;
                this.updateSongsList();
                
                // 履歴に追加
                const emoji = this.panel.querySelector('.mood-emoji').textContent;
                this.addToHistory(mood, emoji, songs);
                
                // 最初の曲を再生
                if (songs[0].audio_url) {
                    this.loadAndPlaySong(songs[0].audio_url);
                    this.showNotification(`🎵 "${songs[0].title || mood}" を生成しました！`);
                }
            }
            
        } catch (error) {
            console.error('Suno API Error:', error);
            this.updateStatus('❌ エラー: ' + error.message);
            this.showNotification('生成エラー: ' + error.message, 'error');
        } finally {
            this.isGenerating = false;
            this.toggleBtn.classList.remove('generating');
            this.panel.querySelector('.mood-display').classList.remove('generating');
            document.getElementById('manual-generate-btn').disabled = false;
        }
    }
    
    async submitSunoGeneration(mood, moodConfig) {
        const apiKey = this.apiSettings.sunoApiKey;
        const model = this.apiSettings.sunoModel || 'V4_5ALL';
        const instrumental = this.apiSettings.instrumental !== false;
        
        // カスタムモードで生成
        // callBackUrl は必須だが、ポーリングで結果を取得するのでダミーURLを使用
        const requestBody = {
            customMode: true,
            instrumental: instrumental,
            model: model,
            style: moodConfig.style,
            title: `${mood} BGM - ${new Date().toLocaleTimeString()}`,
            callBackUrl: 'https://example.com/callback'  // ダミーURL（実際にはポーリングで取得）
        };
        
        // インストゥルメンタルでない場合はpromptを追加
        if (!instrumental) {
            requestBody.prompt = moodConfig.prompt;
        }
        
        console.log('🎵 Suno API Request:', requestBody);
        
        const response = await fetch('https://api.sunoapi.org/api/v1/generate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify(requestBody)
        });
        
        const result = await response.json();
        console.log('🎵 Suno API Response:', result);
        
        if (result.code !== 200) {
            throw new Error(result.msg || `API Error: ${result.code}`);
        }
        
        return result.data.taskId;
    }
    
    async pollForCompletion(taskId, maxAttempts = 120) {
        // maxAttempts = 120 (3秒 × 120 = 6分まで待機)
        const apiKey = this.apiSettings.sunoApiKey;
        
        for (let attempt = 0; attempt < maxAttempts; attempt++) {
            await new Promise(resolve => setTimeout(resolve, 2500)); // 2.5秒待機（より頻繁にチェック）
            
            try {
                const response = await fetch(`https://api.sunoapi.org/api/v1/generate/record?taskId=${taskId}`, {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${apiKey}`
                    }
                });
                
                const result = await response.json();
                console.log(`🎵 Poll attempt ${attempt + 1}:`, result);
                
                if (result.code === 200 && result.data) {
                    const data = result.data;
                    console.log(`🎵 Poll ${attempt + 1}: status=${data.status}, progress=${data.progress || 'N/A'}`);
                    
                    // ステータス更新
                    if (data.status) {
                        this.updateStatus(`🎵 ${data.status}... (${attempt + 1}/${maxAttempts})`);
                    }
                    
                    // 進捗更新
                    if (data.progress !== undefined) {
                        this.updateProgress(data.progress);
                    }
                    
                    // 完了チェック - 複数のステータス名に対応
                    const completedStatuses = ['complete', 'completed', 'success', 'done'];
                    if (completedStatuses.includes(data.status?.toLowerCase())) {
                        console.log('🎵 Generation completed!', data);
                        // 曲データを返す - 複数のレスポンス形式に対応
                        if (data.response && data.response.sunoData) {
                            return data.response.sunoData;
                        } else if (data.clips) {
                            return data.clips;
                        } else if (data.data && Array.isArray(data.data)) {
                            return data.data;
                        } else if (Array.isArray(data)) {
                            return data;
                        } else {
                            // data自体にaudio_urlがある場合
                            if (data.audio_url || (data[0] && data[0].audio_url)) {
                                return Array.isArray(data) ? data : [data];
                            }
                        }
                    }
                    
                    // ストリーミングURL が既にある場合は早期完了
                    if (data.response?.sunoData?.[0]?.audio_url || data.clips?.[0]?.audio_url) {
                        console.log('🎵 Streaming URL available early!');
                        return data.response?.sunoData || data.clips;
                    }
                    
                    // 失敗チェック
                    const failedStatuses = ['failed', 'error', 'cancelled', 'timeout'];
                    if (failedStatuses.includes(data.status?.toLowerCase())) {
                        throw new Error(data.error || data.message || 'Generation failed');
                    }
                }
            } catch (error) {
                console.warn('Poll error:', error);
            }
            
            this.updateStatus(`🎵 生成中... (${attempt + 1}/${maxAttempts})`);
        }
        
        // タイムアウト時もTaskIDを保存して後で確認できるように
        console.error(`🎵 Timeout! TaskID: ${taskId} - 後で手動で確認できます`);
        throw new Error(`生成がタイムアウトしました (TaskID: ${taskId.substring(0, 8)}...) - sunoapi.orgのダッシュボードで確認できます`);
    }
    
    async checkCredits() {
        const apiKey = this.apiSettings.sunoApiKey;
        if (!apiKey) {
            this.showNotification('API Keyを設定してください', 'error');
            return;
        }
        
        try {
            const response = await fetch('https://api.sunoapi.org/api/v1/generate/account', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${apiKey}`
                }
            });
            
            const result = await response.json();
            console.log('Credits:', result);
            
            if (result.code === 200 && result.data) {
                const credits = result.data.credits || result.data.balance || 'N/A';
                document.getElementById('credits-display').textContent = credits;
                this.showNotification(`クレジット残高: ${credits}`);
            } else {
                document.getElementById('credits-display').textContent = 'エラー';
            }
        } catch (error) {
            console.error('Credits check error:', error);
            document.getElementById('credits-display').textContent = 'エラー';
        }
    }
    
    // ===========================================
    // デモモード
    // ===========================================
    
    async generateDemoMusic(mood) {
        this.isGenerating = true;
        this.toggleBtn.classList.add('generating');
        this.panel.querySelector('.mood-display').classList.add('generating');
        
        this.updateStatus(`デモ: ${mood}の音楽を生成中...`);
        
        // デモ用の待機
        await new Promise(r => setTimeout(r, 2000));
        
        // デモ用のダミー曲データ
        const demoSongs = [
            {
                id: 'demo-1',
                title: `${mood} Demo Track 1`,
                audio_url: null, // 実際のURLはないが、UIは表示
                duration: 60
            },
            {
                id: 'demo-2',
                title: `${mood} Demo Track 2`,
                audio_url: null,
                duration: 60
            }
        ];
        
        this.generatedSongs = demoSongs;
        this.updateSongsList();
        
        const emoji = this.panel.querySelector('.mood-emoji').textContent;
        this.addToHistory(mood, emoji, demoSongs);
        
        this.updateStatus('デモ: 音楽を生成しました（実際の音声はありません）');
        this.showNotification('デモモード: 実際の音楽を生成するにはSuno API Keyを設定してください', 'warning');
        
        this.isGenerating = false;
        this.toggleBtn.classList.remove('generating');
        this.panel.querySelector('.mood-display').classList.remove('generating');
    }
    
    // ===========================================
    // プレイヤー機能
    // ===========================================
    
    updateSongsList() {
        const container = document.getElementById('generated-songs-list');
        if (!container) return;
        
        container.innerHTML = this.generatedSongs.map((song, i) => `
            <div class="song-item ${i === 0 ? 'active' : ''}" data-index="${i}">
                <span>🎵</span>
                <span class="song-title">${song.title || `Track ${i + 1}`}</span>
                ${song.audio_url ? '<span>▶</span>' : '<span>⏳</span>'}
            </div>
        `).join('');
        
        container.querySelectorAll('.song-item').forEach(item => {
            item.addEventListener('click', () => {
                const index = parseInt(item.dataset.index);
                const song = this.generatedSongs[index];
                if (song && song.audio_url) {
                    this.loadAndPlaySong(song.audio_url);
                    // アクティブ表示更新
                    container.querySelectorAll('.song-item').forEach(el => el.classList.remove('active'));
                    item.classList.add('active');
                }
            });
        });
    }
    
    loadAndPlaySong(url) {
        if (!url) {
            this.showNotification('音声URLが見つかりません', 'error');
            return;
        }
        
        this.audioElement.src = url;
        this.audioElement.load();
        this.enablePlayback();
        
        // 自動再生
        this.audioElement.play().then(() => {
            this.isPlaying = true;
            document.getElementById('music-play-btn').classList.add('playing');
            document.getElementById('music-play-btn').querySelector('.play-icon').textContent = '⏸';
            this.updateStatus('🎵 再生中...');
        }).catch(err => {
            console.warn('Autoplay blocked:', err);
            this.updateStatus('▶ 再生ボタンを押してください');
        });
    }
    
    playNextSong() {
        const currentIndex = this.generatedSongs.findIndex(s => s.audio_url === this.audioElement.src);
        const nextIndex = (currentIndex + 1) % this.generatedSongs.length;
        const nextSong = this.generatedSongs[nextIndex];
        
        if (nextSong && nextSong.audio_url) {
            this.loadAndPlaySong(nextSong.audio_url);
            
            // アクティブ表示更新
            const container = document.getElementById('generated-songs-list');
            container.querySelectorAll('.song-item').forEach((el, i) => {
                el.classList.toggle('active', i === nextIndex);
            });
        }
    }
    
    enablePlayback() {
        document.getElementById('music-play-btn').disabled = false;
        document.getElementById('music-stop-btn').disabled = false;
        document.getElementById('music-next-btn').disabled = this.generatedSongs.length <= 1;
    }
    
    disablePlayback() {
        document.getElementById('music-play-btn').disabled = true;
        document.getElementById('music-stop-btn').disabled = true;
        document.getElementById('music-next-btn').disabled = true;
    }
    
    togglePlay() {
        if (this.isPlaying) {
            this.pauseMusic();
        } else {
            this.playMusic();
        }
    }
    
    playMusic() {
        if (this.audioElement.src) {
            this.audioElement.play();
            this.isPlaying = true;
            document.getElementById('music-play-btn').classList.add('playing');
            document.getElementById('music-play-btn').querySelector('.play-icon').textContent = '⏸';
            this.updateStatus('🎵 再生中...');
        }
    }
    
    pauseMusic() {
        this.audioElement.pause();
        this.isPlaying = false;
        document.getElementById('music-play-btn').classList.remove('playing');
        document.getElementById('music-play-btn').querySelector('.play-icon').textContent = '▶';
        this.updateStatus('⏸ 一時停止');
    }
    
    stopMusic() {
        this.audioElement.pause();
        this.audioElement.currentTime = 0;
        this.isPlaying = false;
        document.getElementById('music-play-btn').classList.remove('playing');
        document.getElementById('music-play-btn').querySelector('.play-icon').textContent = '▶';
        this.updateProgress(0);
        this.updateStatus('⏹ 停止');
    }
    
    onAudioEnded() {
        // 次の曲があれば自動再生
        if (this.generatedSongs.length > 1) {
            this.playNextSong();
        } else {
            this.isPlaying = false;
            document.getElementById('music-play-btn').classList.remove('playing');
            document.getElementById('music-play-btn').querySelector('.play-icon').textContent = '▶';
            this.updateStatus('✓ 再生完了');
        }
    }
    
    updateProgressFromAudio() {
        if (this.audioElement.duration) {
            const percent = (this.audioElement.currentTime / this.audioElement.duration) * 100;
            this.updateProgress(percent);
            
            const current = Math.floor(this.audioElement.currentTime);
            const total = Math.floor(this.audioElement.duration);
            this.updateStatus(`🎵 再生中... ${current}秒 / ${total}秒`);
        }
    }
    
    updateStatus(text) {
        const statusEl = this.panel.querySelector('.status-text');
        if (statusEl) {
            statusEl.textContent = text;
        }
    }
    
    updateProgress(percent) {
        const fill = this.panel.querySelector('.progress-fill');
        if (fill) {
            fill.style.width = percent + '%';
        }
    }
}

// ===========================================
// グローバル初期化
// ===========================================

let musicGeneratorPanel = null;

function initMusicGeneratorPanel() {
    if (!musicGeneratorPanel) {
        musicGeneratorPanel = new MusicGeneratorPanel();
        window.musicGeneratorPanel = musicGeneratorPanel;
    }
    return musicGeneratorPanel;
}

// DOMContentLoadedで初期化
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initMusicGeneratorPanel);
} else {
    initMusicGeneratorPanel();
}

// グローバルAPIとしてエクスポート
window.MusicGeneratorPanel = MusicGeneratorPanel;

// 他のモジュールから呼び出せるヘルパー関数
window.updateMusicMood = function(mood, tags) {
    if (musicGeneratorPanel) {
        musicGeneratorPanel.updateMood(mood, tags);
    }
};

window.showMusicPanel = function() {
    if (musicGeneratorPanel) {
        musicGeneratorPanel.show();
    }
};

window.hideMusicPanel = function() {
    if (musicGeneratorPanel) {
        musicGeneratorPanel.hide();
    }
};

window.generateMusicForMood = function(mood) {
    if (musicGeneratorPanel) {
        musicGeneratorPanel.generateMusic(mood);
    }
};

console.log('✅ AI音楽生成パネル v2.0 (Suno API統合) スクリプト読み込み完了');
