// ========================================
// MultiCharacterUI - マルチキャラクター管理UIパネル
// ========================================

export class MultiCharacterUI {
    constructor(manager) {
        this.manager = manager;
        this.panel = null;
        this.characterList = null;
        this.conversationLog = null;
        this.isMinimized = false;
        this.selectedCharacterId = null;
        
        // ★ ユーザー参加モジュール
        this.userParticipation = null;
        
        // デフォルト設定
        this.defaultCharacters = [
            { id: 'char_A', name: 'アキラ', personality: 'ボケ担当。天然で突拍子もない発想をする。', llmType: 'chatgpt', voiceModel: 'jvnv-F1-jp', enabled: true },
            { id: 'char_B', name: 'ボン', personality: 'ツッコミ担当。論理的で鋭い指摘をする。', llmType: 'chatgpt', voiceModel: 'jvnv-M1-jp', enabled: true },
            { id: 'char_C', name: 'チカ', personality: '仲裁・まとめ役。優しく場を和ませる。', llmType: 'chatgpt', voiceModel: 'jvnv-F2-jp', enabled: false },
            { id: 'char_D', name: 'ダイスケ', personality: 'クール系。あまり喋らないが的確なコメント。', llmType: 'chatgpt', voiceModel: 'jvnv-M2-jp', enabled: false }
        ];
        
        // 利用可能なVRMモデル
        this.availableVRMs = [
            { name: 'メインモデル', path: './model.vrm' },
            { name: 'Mocap用', path: './avatar.vrm' }
        ];
        
        this.init();
    }
    
    init() {
        this.createPanel();
        this.setupEventListeners();
        this.initUserParticipation();
        console.log('🎭 MultiCharacterUI初期化完了');
    }
    
    /**
     * ★ ユーザー参加機能を初期化
     */
    initUserParticipation() {
        // user-participation.js が読み込まれているかチェック
        if (window.UserParticipation) {
            // ディレクターは後で設定される可能性があるので遅延初期化
            const director = this.manager?.director || this.manager?.pipelinedDirector;
            this.userParticipation = new window.UserParticipation(director, this);
            
            // 会話ログセクションにUIを追加（遅延実行）
            setTimeout(() => {
                const logSection = this.conversationLog?.parentElement;
                if (logSection && this.userParticipation) {
                    this.userParticipation.createUI(logSection);
                    console.log('👤 ユーザー参加UIを会話ログセクションに追加');
                }
            }, 100);
        } else {
            console.warn('⚠️ UserParticipation モジュールが読み込まれていません');
        }
    }
    
    createPanel() {
        this.panel = document.createElement('div');
        this.panel.id = 'multi-character-panel';
        this.panel.innerHTML = `
            <div class="mc-header">
                <span class="mc-title">🎭 マルチキャラ会話</span>
                <div class="mc-header-controls">
                    <span class="mc-status" id="mc-status">停止中</span>
                    <span class="mc-pipeline-badge" id="mc-pipeline-badge" title="先読みパイプラインモード">🚀</span>
                    <button class="mc-btn mc-btn-minimize" id="mc-minimize">−</button>
                    <button class="mc-btn mc-btn-close" id="mc-close">×</button>
                </div>
            </div>
            
            <div class="mc-body" id="mc-body">
                <!-- キャラクター一覧 -->
                <div class="mc-section">
                    <div class="mc-section-title">
                        <span>👥 キャラクター</span>
                        <button class="mc-btn mc-btn-small" id="mc-add-char">＋追加</button>
                    </div>
                    <div class="mc-character-list" id="mc-character-list">
                        <!-- 動的に生成 -->
                    </div>
                </div>
                
                <!-- ★ 発言順序管理 -->
                <div class="mc-section mc-order-section">
                    <div class="mc-section-title">
                        <span>📋 発言順序</span>
                        <button class="mc-btn mc-btn-small" id="mc-reset-order">🔄 リセット</button>
                    </div>
                    <div class="mc-order-hint">ドラッグまたは▲▼で並び替え</div>
                    <div class="mc-speaking-order" id="mc-speaking-order">
                        <!-- 動的に生成 -->
                    </div>
                </div>
                
                <!-- ★ 行動制御セクション -->
                <div class="mc-section mc-behavior-section">
                    <div class="mc-section-title">
                        <span>🚶 行動制御</span>
                        <button class="mc-btn mc-btn-small" id="mc-behavior-toggle">展開▼</button>
                    </div>
                    <div class="mc-behavior-body" id="mc-behavior-body" style="display:none;">
                        <!-- 全体制御 -->
                        <div class="mc-behavior-all">
                            <label>全員:</label>
                            <div class="mc-behavior-btns">
                                <button class="mc-behavior-btn active" data-mode="idle" data-all="true" title="その場で静止">🧍</button>
                                <button class="mc-behavior-btn" data-mode="follow" data-all="true" title="カメラを追う">🏃</button>
                                <button class="mc-behavior-btn" data-mode="flee" data-all="true" title="カメラから逃げる">💨</button>
                                <button class="mc-behavior-btn" data-mode="random" data-all="true" title="ランダム行動">🎲</button>
                            </div>
                        </div>
                        
                        <!-- ★ キャラ同士の距離設定 -->
                        <div class="mc-behavior-distance" style="margin: 10px 0; padding: 8px; background: rgba(240, 147, 251, 0.15); border-radius: 6px;">
                            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px;">
                                <span style="font-size: 10px; color: #f093fb;">📏 キャラ間距離:</span>
                                <span id="mc-separation-value" style="font-size: 11px; font-weight: bold; color: #fff; min-width: 45px;">1.5m</span>
                                <button class="mc-btn mc-btn-small" id="mc-spread-chars" title="全員を強制分離">💥 分離</button>
                            </div>
                            <input type="range" id="mc-separation-slider" 
                                   min="0.5" max="3.0" step="0.1" value="1.5"
                                   style="width: 100%; height: 20px; cursor: pointer;">
                            <div style="display: flex; justify-content: space-between; font-size: 9px; color: #888; margin-top: 2px;">
                                <span>0.5m (近い)</span>
                                <span>3.0m (遠い)</span>
                            </div>
                        </div>
                        
                        <hr style="border:none;border-top:1px dashed #444;margin:8px 0;">
                        <!-- キャラクター個別制御 -->
                        <div class="mc-behavior-individual" id="mc-behavior-individual">
                            <!-- 動的に生成 -->
                        </div>
                    </div>
                </div>
                
                <!-- 選択キャラクター設定 -->
                <div class="mc-section mc-char-settings" id="mc-char-settings" style="display:none;">
                    <div class="mc-section-title">⚙️ キャラ設定</div>
                    <div class="mc-setting-row">
                        <label>名前:</label>
                        <input type="text" id="mc-char-name" placeholder="名前">
                    </div>
                    <div class="mc-setting-row">
                        <label>性格:</label>
                        <textarea id="mc-char-personality" placeholder="性格・特徴" rows="2"></textarea>
                    </div>
                    <div class="mc-setting-row">
                        <label>LLM:</label>
                        <select id="mc-char-llm">
                            <option value="chatgpt">ChatGPT</option>
                            <option value="gemini">Gemini</option>
                            <option value="claude">Claude</option>
                            <option value="grok">Grok</option>
                        </select>
                    </div>
                    <div class="mc-setting-row">
                        <label>🔊 音声:</label>
                        <select id="mc-char-voice-engine" style="width: 70px;">
                            <option value="sbv2">SBV2</option>
                            <option value="grok">Grok</option>
                        </select>
                        <select id="mc-char-voice" style="flex: 1;">
                            <option value="jvnv-F1-jp">女声1 (jvnv-F1)</option>
                            <option value="jvnv-F2-jp">女声2 (jvnv-F2)</option>
                            <option value="jvnv-M1-jp">男声1 (jvnv-M1)</option>
                            <option value="jvnv-M2-jp">男声2 (jvnv-M2)</option>
                        </select>
                    </div>
                    <div class="mc-setting-row mc-grok-voice-row" id="mc-grok-voice-row" style="display:none;">
                        <label>🎤 Grok声:</label>
                        <select id="mc-char-grok-voice">
                            <option value="Ara">Ara (女/温かい)</option>
                            <option value="Eve">Eve (女/元気)</option>
                            <option value="Rex">Rex (男/自信)</option>
                            <option value="Leo">Leo (男/威厳)</option>
                            <option value="Sal">Sal (中性)</option>
                        </select>
                    </div>
                    <div class="mc-setting-row">
                        <label>VRM:</label>
                        <select id="mc-char-vrm">
                            <option value="">選択...</option>
                            <option value="./model.vrm">メインモデル</option>
                            <option value="./avatar.vrm">Mocap用</option>
                            <option value="custom">カスタム...</option>
                        </select>
                    </div>
                    <div class="mc-setting-buttons">
                        <button class="mc-btn mc-btn-apply" id="mc-char-apply">適用</button>
                        <button class="mc-btn mc-btn-delete" id="mc-char-delete">削除</button>
                    </div>
                </div>
                
                <!-- 会話設定 -->
                <div class="mc-section">
                    <div class="mc-section-title">
                        <span>💬 会話設定</span>
                        <button class="mc-btn mc-btn-small" id="mc-toggle-advanced">詳細▼</button>
                    </div>
                    <div class="mc-setting-row">
                        <label>API Key:</label>
                        <input type="password" id="mc-api-key" placeholder="OpenAI API Key">
                    </div>
                    
                    <!-- ★ 会話のお題（必須） -->
                    <div class="mc-setting-row">
                        <label>🎯 お題:</label>
                        <input type="text" id="mc-topic" placeholder="例: 今度の夏休みの計画について">
                    </div>
                    
                    <!-- ★ 詳細設定（折りたたみ） -->
                    <div class="mc-advanced-settings" id="mc-advanced-settings">
                        <!-- 演出指示 -->
                        <div class="mc-setting-row mc-setting-full">
                            <label>🎬 演出指示:</label>
                            <textarea id="mc-direction" placeholder="例: コメディの掛け合いのようにテンポよく、ボケとツッコミを入れて" rows="2"></textarea>
                        </div>
                        
                        <!-- シーン設定 -->
                        <div class="mc-setting-row mc-setting-full">
                            <label>🎭 シーン設定:</label>
                            <textarea id="mc-scene" placeholder="例: 学校の屋上でお弁当を食べながら" rows="2"></textarea>
                        </div>
                        
                        <!-- 目標・ゴール -->
                        <div class="mc-setting-row mc-setting-full">
                            <label>🏁 目標:</label>
                            <textarea id="mc-goal" placeholder="例: 最終的に皆で沖縄に行くことに決まる" rows="2"></textarea>
                        </div>
                        
                        <!-- 追加情報・ルール -->
                        <div class="mc-setting-row mc-setting-full">
                            <label>📝 追加ルール:</label>
                            <textarea id="mc-rules" placeholder="例: 各キャラは予算の都合をさりげなく主張する" rows="2"></textarea>
                        </div>
                        
                        <!-- ターン数制限 -->
                        <div class="mc-setting-row">
                            <label>🔄 ターン数:</label>
                            <input type="number" id="mc-max-turns" placeholder="無制限" min="1" max="100" style="width: 60px;">
                            <span style="font-size: 9px; color: #888;">空白=無制限</span>
                        </div>
                    </div>
                    
                    <div class="mc-setting-row">
                        <label>モード:</label>
                        <select id="mc-turn-mode">
                            <option value="round-robin">順番制 (A→B→C→...)</option>
                            <option value="dynamic">動的 (名前呼び等)</option>
                        </select>
                    </div>
                    <div class="mc-setting-row">
                        <label>📷 カメラ追従:</label>
                        <input type="checkbox" id="mc-camera-follow" checked>
                    </div>
                    <div class="mc-setting-row">
                        <label>🚀 先読み:</label>
                        <input type="checkbox" id="mc-pipeline-mode" checked>
                        <span style="font-size: 9px; color: #4ade80;">5秒待ち解消</span>
                    </div>
                    <div class="mc-setting-row" id="mc-sequential-row">
                        <label>📋 順次計算:</label>
                        <input type="checkbox" id="mc-sequential-mode" checked>
                        <span style="font-size: 9px; color: #fbbf24;">上から順に計算</span>
                    </div>
                </div>
                
                <!-- コントロール -->
                <div class="mc-section mc-controls">
                    <button class="mc-btn mc-btn-start" id="mc-start">▶️ 会話開始</button>
                    <button class="mc-btn mc-btn-stop" id="mc-stop" disabled>⏹️ 停止</button>
                    <button class="mc-btn mc-btn-pause" id="mc-pause" disabled>⏸️ 一時停止</button>
                </div>
                
                <!-- ★ パイプライン状態表示 -->
                <div class="mc-section mc-pipeline-section" id="mc-pipeline-section" style="display:none;">
                    <div class="mc-section-title">
                        <span>🚀 パイプライン</span>
                        <span class="mc-pipeline-count" id="mc-pipeline-count">0件</span>
                    </div>
                    <div class="mc-pipeline-queue" id="mc-pipeline-queue">
                        <!-- 動的に生成 -->
                    </div>
                </div>
                
                <!-- 会話ログ -->
                <div class="mc-section">
                    <div class="mc-section-title">
                        <span>📜 会話ログ</span>
                        <button class="mc-btn mc-btn-small" id="mc-clear-log">クリア</button>
                    </div>
                    <div class="mc-conversation-log" id="mc-conversation-log">
                        <div class="mc-log-empty">会話がありません</div>
                    </div>
                </div>
            </div>
            
            <div class="mc-footer">
                <span class="mc-footer-drag-handle">≡ ドラッグで移動 ≡</span>
            </div>
        `;
        
        // スタイルを追加
        this.addStyles();
        
        // DOMに追加
        document.body.appendChild(this.panel);
        
        // 要素を取得
        this.characterList = document.getElementById('mc-character-list');
        this.conversationLog = document.getElementById('mc-conversation-log');
        
        // デフォルトキャラクターを表示
        this.renderCharacterList();
        
        // ★ 発言順序リストを取得
        this.speakingOrderList = document.getElementById('mc-speaking-order');
        this.renderSpeakingOrder();
    }
    
    addStyles() {
        const style = document.createElement('style');
        style.textContent = `
            #multi-character-panel {
                position: fixed;
                top: 10px;
                left: 200px;
                width: 300px;
                background: rgba(30, 30, 50, 0.95);
                border-radius: 12px;
                box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4);
                z-index: 10000;
                font-family: 'Segoe UI', 'Yu Gothic', sans-serif;
                font-size: 11px;
                color: #e0e0e0;
                overflow: hidden;
                resize: both;
                min-width: 280px;
                max-width: 450px;
            }
            
            .mc-header {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                padding: 8px 12px;
                display: flex;
                justify-content: space-between;
                align-items: center;
                cursor: move;
            }
            
            .mc-title {
                font-weight: bold;
                font-size: 13px;
                color: white;
            }
            
            .mc-header-controls {
                display: flex;
                align-items: center;
                gap: 6px;
            }
            
            .mc-status {
                font-size: 10px;
                padding: 2px 6px;
                background: rgba(255,255,255,0.2);
                border-radius: 4px;
                color: white;
            }
            
            .mc-status.running {
                background: #4ade80;
                color: #1a1a2e;
            }
            
            .mc-status.paused {
                background: #fbbf24;
                color: #1a1a2e;
            }
            
            .mc-body {
                padding: 10px;
                max-height: 70vh;
                overflow-y: auto;
            }
            
            .mc-body.minimized {
                display: none;
            }
            
            .mc-section {
                background: rgba(255, 255, 255, 0.05);
                border-radius: 8px;
                padding: 8px;
                margin-bottom: 8px;
            }
            
            .mc-section-title {
                font-weight: bold;
                font-size: 11px;
                color: #a0a0ff;
                margin-bottom: 6px;
                display: flex;
                justify-content: space-between;
                align-items: center;
            }
            
            .mc-btn {
                padding: 4px 8px;
                border: none;
                border-radius: 4px;
                cursor: pointer;
                font-size: 10px;
                transition: all 0.2s;
            }
            
            .mc-btn:hover {
                opacity: 0.9;
                transform: scale(1.02);
            }
            
            .mc-btn:disabled {
                opacity: 0.5;
                cursor: not-allowed;
            }
            
            .mc-btn-small {
                padding: 2px 6px;
                font-size: 9px;
                background: #444;
                color: #aaa;
            }
            
            .mc-btn-minimize, .mc-btn-close {
                background: rgba(255,255,255,0.2);
                color: white;
                width: 20px;
                height: 20px;
                padding: 0;
                font-size: 12px;
            }
            
            .mc-btn-start {
                background: linear-gradient(135deg, #4ade80 0%, #22c55e 100%);
                color: white;
                flex: 1;
            }
            
            .mc-btn-stop {
                background: linear-gradient(135deg, #f87171 0%, #ef4444 100%);
                color: white;
                flex: 1;
            }
            
            .mc-btn-pause {
                background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%);
                color: #1a1a2e;
                flex: 1;
            }
            
            .mc-btn-apply {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                flex: 1;
            }
            
            .mc-btn-delete {
                background: #ef4444;
                color: white;
                flex: 0.5;
            }
            
            .mc-controls {
                display: flex;
                gap: 6px;
            }
            
            /* キャラクターリスト */
            .mc-character-list {
                display: flex;
                flex-direction: column;
                gap: 4px;
            }
            
            .mc-char-item {
                display: flex;
                align-items: center;
                gap: 6px;
                padding: 6px 8px;
                background: rgba(255, 255, 255, 0.05);
                border-radius: 6px;
                cursor: pointer;
                transition: all 0.2s;
                border: 2px solid transparent;
            }
            
            .mc-char-item:hover {
                background: rgba(255, 255, 255, 0.1);
            }
            
            .mc-char-item.selected {
                border-color: #667eea;
                background: rgba(102, 126, 234, 0.2);
            }
            
            .mc-char-item.speaking {
                border-color: #4ade80;
                animation: speaking-pulse 1s infinite;
            }
            
            @keyframes speaking-pulse {
                0%, 100% { box-shadow: 0 0 5px rgba(74, 222, 128, 0.3); }
                50% { box-shadow: 0 0 15px rgba(74, 222, 128, 0.6); }
            }
            
            .mc-char-item.disabled {
                opacity: 0.5;
            }
            
            .mc-char-toggle {
                width: 16px;
                height: 16px;
                cursor: pointer;
            }
            
            .mc-char-avatar {
                width: 28px;
                height: 28px;
                border-radius: 50%;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 14px;
            }
            
            .mc-char-info {
                flex: 1;
                overflow: hidden;
            }
            
            .mc-char-name {
                font-weight: bold;
                font-size: 11px;
            }
            
            .mc-char-personality {
                font-size: 9px;
                color: #888;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
            }
            
            .mc-char-badges {
                display: flex;
                gap: 2px;
            }
            
            .mc-badge {
                font-size: 8px;
                padding: 1px 4px;
                border-radius: 3px;
                background: #444;
                color: #aaa;
            }
            
            .mc-badge.llm {
                background: #3b82f6;
                color: white;
            }
            
            /* 設定フォーム */
            .mc-setting-row {
                display: flex;
                align-items: center;
                gap: 6px;
                margin-bottom: 6px;
            }
            
            .mc-setting-row label {
                min-width: 60px;
                font-size: 10px;
                color: #aaa;
            }
            
            .mc-setting-row input[type="text"],
            .mc-setting-row input[type="password"],
            .mc-setting-row select,
            .mc-setting-row textarea {
                flex: 1;
                padding: 4px 8px;
                border: 1px solid #444;
                border-radius: 4px;
                background: #2a2a3e;
                color: #e0e0e0;
                font-size: 10px;
            }
            
            .mc-setting-row textarea {
                resize: vertical;
                min-height: 40px;
            }
            
            .mc-setting-row input[type="checkbox"] {
                width: 16px;
                height: 16px;
            }
            
            .mc-setting-buttons {
                display: flex;
                gap: 6px;
                margin-top: 8px;
            }
            
            /* ★ 詳細設定の折りたたみ */
            .mc-advanced-settings {
                display: none;
                margin-top: 8px;
                padding-top: 8px;
                border-top: 1px dashed #444;
            }
            
            .mc-advanced-settings.show {
                display: block;
            }
            
            .mc-setting-full {
                flex-direction: column;
                align-items: stretch !important;
            }
            
            .mc-setting-full label {
                margin-bottom: 4px;
            }
            
            .mc-setting-full textarea {
                width: 100%;
                min-height: 36px;
                font-size: 10px;
                line-height: 1.4;
            }
            
            /* 会話ログ */
            .mc-conversation-log {
                max-height: 150px;
                overflow-y: auto;
                font-size: 10px;
            }
            
            .mc-log-empty {
                text-align: center;
                color: #666;
                padding: 10px;
            }
            
            .mc-log-entry {
                padding: 4px 6px;
                margin-bottom: 4px;
                background: rgba(255, 255, 255, 0.03);
                border-radius: 4px;
                border-left: 3px solid #667eea;
            }
            
            .mc-log-header {
                display: flex;
                align-items: center;
                gap: 4px;
            }
            
            .mc-log-speaker {
                font-weight: bold;
                color: #a0a0ff;
            }
            
            .mc-log-emotion {
                font-size: 12px;
                cursor: help;
            }
            
            .mc-log-motion {
                font-size: 10px;
                cursor: help;
                opacity: 0.7;
            }
            
            .mc-log-text {
                color: #ccc;
                margin-top: 2px;
            }
            
            /* ★ パイプラインバッジ */
            .mc-pipeline-badge {
                font-size: 12px;
                padding: 2px 4px;
                background: linear-gradient(135deg, #4ade80 0%, #22c55e 100%);
                border-radius: 4px;
                animation: pipeline-pulse 2s infinite;
            }
            
            .mc-pipeline-badge.disabled {
                background: #444;
                animation: none;
            }
            
            @keyframes pipeline-pulse {
                0%, 100% { opacity: 1; }
                50% { opacity: 0.6; }
            }
            
            /* ★ パイプラインセクション */
            .mc-pipeline-section {
                background: rgba(74, 222, 128, 0.1) !important;
                border: 1px solid rgba(74, 222, 128, 0.3);
            }
            
            .mc-pipeline-count {
                font-size: 10px;
                padding: 2px 6px;
                background: #4ade80;
                color: #1a1a2e;
                border-radius: 10px;
            }
            
            .mc-pipeline-queue {
                display: flex;
                flex-direction: column;
                gap: 4px;
                max-height: 100px;
                overflow-y: auto;
            }
            
            .mc-pipeline-entry {
                display: flex;
                align-items: center;
                gap: 6px;
                padding: 4px 6px;
                background: rgba(0, 0, 0, 0.3);
                border-radius: 4px;
                font-size: 10px;
            }
            
            .mc-pipeline-entry.pending {
                border-left: 3px solid #888;
            }
            
            .mc-pipeline-entry.generating {
                border-left: 3px solid #fbbf24;
            }
            
            .mc-pipeline-entry.synthesizing {
                border-left: 3px solid #3b82f6;
            }
            
            .mc-pipeline-entry.ready {
                border-left: 3px solid #4ade80;
            }
            
            .mc-pipeline-entry.playing {
                border-left: 3px solid #f87171;
                animation: playing-pulse 0.5s infinite;
            }
            
            @keyframes playing-pulse {
                0%, 100% { background: rgba(248, 113, 113, 0.2); }
                50% { background: rgba(248, 113, 113, 0.4); }
            }
            
            .mc-pipeline-status {
                font-size: 9px;
                padding: 1px 4px;
                border-radius: 3px;
                background: #333;
            }
            
            .mc-pipeline-status.pending { background: #555; color: #aaa; }
            .mc-pipeline-status.generating { background: #fbbf24; color: #1a1a2e; }
            .mc-pipeline-status.synthesizing { background: #3b82f6; color: white; }
            .mc-pipeline-status.ready { background: #4ade80; color: #1a1a2e; }
            .mc-pipeline-status.playing { background: #f87171; color: white; }
            
            .mc-pipeline-text {
                flex: 1;
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
                color: #999;
            }
            
            /* ★ 先読みログエントリ（まだ音声未再生） */
            .mc-log-entry.preview {
                opacity: 0.6;
                border-left-color: #fbbf24;
                background: rgba(251, 191, 36, 0.1);
            }
            
            .mc-log-entry.preview .mc-log-speaker::after {
                content: ' (準備中)';
                font-size: 9px;
                color: #fbbf24;
            }
            
            /* ★ 発言順序セクション */
            .mc-order-section {
                background: rgba(102, 126, 234, 0.1) !important;
                border: 1px solid rgba(102, 126, 234, 0.3);
            }
            
            .mc-order-hint {
                font-size: 9px;
                color: #888;
                text-align: center;
                margin-bottom: 6px;
            }
            
            .mc-speaking-order {
                display: flex;
                flex-direction: column;
                gap: 4px;
            }
            
            .mc-order-item {
                display: flex;
                align-items: center;
                gap: 6px;
                padding: 6px 8px;
                background: rgba(255, 255, 255, 0.08);
                border-radius: 6px;
                cursor: grab;
                transition: all 0.2s;
                border: 2px solid transparent;
                user-select: none;
            }
            
            .mc-order-item:hover {
                background: rgba(255, 255, 255, 0.15);
                border-color: rgba(102, 126, 234, 0.5);
            }
            
            .mc-order-item.dragging {
                opacity: 0.5;
                border-color: #667eea;
                background: rgba(102, 126, 234, 0.3);
            }
            
            .mc-order-item.drag-over {
                border-color: #4ade80;
                background: rgba(74, 222, 128, 0.2);
            }
            
            .mc-order-item.disabled {
                opacity: 0.4;
                cursor: not-allowed;
            }
            
            .mc-order-handle {
                cursor: grab;
                font-size: 12px;
                color: #888;
                padding: 2px 4px;
            }
            
            .mc-order-handle:active {
                cursor: grabbing;
            }
            
            .mc-order-number {
                width: 20px;
                height: 20px;
                border-radius: 50%;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 10px;
                font-weight: bold;
            }
            
            .mc-order-item.disabled .mc-order-number {
                background: #444;
            }
            
            .mc-order-name {
                flex: 1;
                font-size: 11px;
                font-weight: 500;
            }
            
            .mc-order-controls {
                display: flex;
                gap: 2px;
            }
            
            .mc-order-btn {
                width: 20px;
                height: 20px;
                border: none;
                border-radius: 4px;
                background: #444;
                color: #aaa;
                cursor: pointer;
                font-size: 10px;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: all 0.2s;
            }
            
            .mc-order-btn:hover {
                background: #555;
                color: white;
            }
            
            .mc-order-btn:disabled {
                opacity: 0.3;
                cursor: not-allowed;
            }
            
            .mc-order-btn.up:hover { background: #3b82f6; }
            .mc-order-btn.down:hover { background: #3b82f6; }
            
            .mc-order-item.speaking {
                border-color: #4ade80;
                background: rgba(74, 222, 128, 0.2);
                animation: speaking-pulse 1s infinite;
            }
            
            .mc-order-item.speaking .mc-order-number {
                background: linear-gradient(135deg, #4ade80 0%, #22c55e 100%);
            }
            
            /* ★ 行動制御セクション */
            .mc-behavior-section {
                background: rgba(240, 147, 251, 0.1) !important;
                border: 1px solid rgba(240, 147, 251, 0.3);
            }
            
            .mc-behavior-body {
                padding-top: 8px;
            }
            
            .mc-behavior-all {
                display: flex;
                align-items: center;
                gap: 8px;
                margin-bottom: 6px;
            }
            
            .mc-behavior-all label {
                font-size: 10px;
                color: #aaa;
                min-width: 40px;
            }
            
            .mc-behavior-btns {
                display: flex;
                gap: 4px;
            }
            
            .mc-behavior-btn {
                width: 32px;
                height: 32px;
                border: 2px solid #444;
                border-radius: 6px;
                background: rgba(255, 255, 255, 0.05);
                cursor: pointer;
                font-size: 16px;
                transition: all 0.2s;
                display: flex;
                align-items: center;
                justify-content: center;
            }
            
            .mc-behavior-btn:hover {
                border-color: #f093fb;
                background: rgba(240, 147, 251, 0.2);
            }
            
            .mc-behavior-btn.active {
                background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
                border-color: transparent;
            }
            
            .mc-behavior-btn.waypoint {
                background: linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%);
                border-color: transparent;
                animation: waypoint-pulse 1s infinite;
            }
            
            @keyframes waypoint-pulse {
                0%, 100% { opacity: 1; }
                50% { opacity: 0.7; }
            }
            
            .mc-behavior-individual {
                display: flex;
                flex-direction: column;
                gap: 6px;
            }
            
            .mc-behavior-char-row {
                display: flex;
                align-items: center;
                gap: 6px;
                padding: 4px 6px;
                background: rgba(255, 255, 255, 0.03);
                border-radius: 6px;
            }
            
            .mc-behavior-char-name {
                min-width: 60px;
                font-size: 10px;
                font-weight: 500;
                color: #ccc;
            }
            
            .mc-behavior-char-btns {
                display: flex;
                gap: 3px;
                flex: 1;
            }
            
            .mc-behavior-char-btn {
                width: 26px;
                height: 26px;
                border: 1px solid #555;
                border-radius: 4px;
                background: rgba(255, 255, 255, 0.03);
                cursor: pointer;
                font-size: 12px;
                transition: all 0.2s;
            }
            
            .mc-behavior-char-btn:hover {
                border-color: #f093fb;
                background: rgba(240, 147, 251, 0.15);
            }
            
            .mc-behavior-char-btn.active {
                background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
                border-color: transparent;
            }
            
            .mc-behavior-char-btn.waypoint {
                background: linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%);
                border-color: transparent;
            }
            
            .mc-behavior-char-status {
                font-size: 9px;
                color: #888;
                min-width: 50px;
                text-align: right;
            }
            
            .mc-behavior-target-select {
                font-size: 9px;
                padding: 2px 4px;
                background: #2a2a3e;
                border: 1px solid #444;
                border-radius: 3px;
                color: #ccc;
                max-width: 60px;
            }
            
            /* ★ キャラ間距離スライダー */
            #mc-separation-slider {
                -webkit-appearance: none;
                appearance: none;
                background: linear-gradient(to right, #f093fb 0%, #f5576c 100%);
                border-radius: 10px;
                height: 8px;
            }
            
            #mc-separation-slider::-webkit-slider-thumb {
                -webkit-appearance: none;
                appearance: none;
                width: 20px;
                height: 20px;
                border-radius: 50%;
                background: white;
                cursor: pointer;
                box-shadow: 0 2px 6px rgba(0,0,0,0.3);
                border: 2px solid #f093fb;
            }
            
            #mc-separation-slider::-moz-range-thumb {
                width: 20px;
                height: 20px;
                border-radius: 50%;
                background: white;
                cursor: pointer;
                box-shadow: 0 2px 6px rgba(0,0,0,0.3);
                border: 2px solid #f093fb;
            }
            
            #mc-spread-chars {
                background: linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%);
                color: white;
                font-weight: bold;
            }
            
            #mc-spread-chars:hover {
                transform: scale(1.05);
            }
            
            /* フッター（下部ドラッグハンドル） */
            .mc-footer {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                padding: 8px 12px;
                text-align: center;
                cursor: move;
                user-select: none;
                border-top: 1px solid rgba(255, 255, 255, 0.2);
                border-radius: 0 0 12px 12px;
            }
            
            .mc-footer-drag-handle {
                font-size: 11px;
                opacity: 0.9;
                letter-spacing: 1px;
            }
            
            .mc-footer:hover {
                background: linear-gradient(135deg, #5a6fd6 0%, #6a4190 100%);
            }
            
            .mc-footer:active {
                background: linear-gradient(135deg, #4e5fc4 0%, #5e377e 100%);
            }
        `;
        document.head.appendChild(style);
    }
    
    setupEventListeners() {
        // パネルドラッグ（ヘッダー）
        this.makeDraggable(this.panel, this.panel.querySelector('.mc-header'));
        
        // パネルドラッグ（フッター）- 下部からも掴めるように
        const footer = this.panel.querySelector('.mc-footer');
        if (footer) {
            this.makeDraggable(this.panel, footer);
        }
        
        // 最小化
        document.getElementById('mc-minimize').addEventListener('click', () => {
            this.toggleMinimize();
        });
        
        // 閉じる
        document.getElementById('mc-close').addEventListener('click', () => {
            this.panel.style.display = 'none';
        });
        
        // ★ 詳細設定の折りたたみ
        document.getElementById('mc-toggle-advanced').addEventListener('click', () => {
            const advSettings = document.getElementById('mc-advanced-settings');
            const btn = document.getElementById('mc-toggle-advanced');
            advSettings.classList.toggle('show');
            btn.textContent = advSettings.classList.contains('show') ? '詳細▲' : '詳細▼';
        });
        
        // キャラクター追加
        document.getElementById('mc-add-char').addEventListener('click', () => {
            this.addNewCharacter();
        });
        
        // キャラクター設定適用
        document.getElementById('mc-char-apply').addEventListener('click', () => {
            this.applyCharacterSettings();
        });
        
        // キャラクター削除
        document.getElementById('mc-char-delete').addEventListener('click', () => {
            this.deleteSelectedCharacter();
        });
        
        // 会話開始
        document.getElementById('mc-start').addEventListener('click', () => {
            this.startConversation();
        });
        
        // 会話停止
        document.getElementById('mc-stop').addEventListener('click', () => {
            this.stopConversation();
        });
        
        // 一時停止
        document.getElementById('mc-pause').addEventListener('click', () => {
            this.togglePause();
        });
        
        // ログクリア
        document.getElementById('mc-clear-log').addEventListener('click', () => {
            this.clearLog();
        });
        
        // ★ 発言順序リセット
        document.getElementById('mc-reset-order').addEventListener('click', () => {
            this.resetSpeakingOrder();
        });
        
        // ★ 行動制御トグル
        document.getElementById('mc-behavior-toggle').addEventListener('click', () => {
            const body = document.getElementById('mc-behavior-body');
            const btn = document.getElementById('mc-behavior-toggle');
            const isVisible = body.style.display !== 'none';
            body.style.display = isVisible ? 'none' : 'block';
            btn.textContent = isVisible ? '展開▼' : '折りたたみ▲';
            
            // 展開時に行動マネージャーを初期化・更新
            if (!isVisible) {
                this.initBehaviorManager();
                this.renderBehaviorControls();
            }
        });
        
        // ★ 全員行動ボタン
        document.querySelectorAll('.mc-behavior-btn[data-all="true"]').forEach(btn => {
            btn.addEventListener('click', () => {
                const mode = btn.dataset.mode;
                this.setAllBehaviorMode(mode);
                
                // ボタンのアクティブ状態を更新
                document.querySelectorAll('.mc-behavior-btn[data-all="true"]').forEach(b => {
                    b.classList.toggle('active', b.dataset.mode === mode);
                });
            });
        });
        
        // ★ キャラ間距離スライダー
        const separationSlider = document.getElementById('mc-separation-slider');
        const separationValue = document.getElementById('mc-separation-value');
        if (separationSlider) {
            separationSlider.addEventListener('input', (e) => {
                const distance = parseFloat(e.target.value);
                separationValue.textContent = `${distance.toFixed(1)}m`;
                
                // 行動マネージャーに距離を設定
                if (this.behaviorManager) {
                    this.behaviorManager.setSeparationDistance(distance);
                }
            });
        }
        
        // ★ 強制分離ボタン
        const spreadBtn = document.getElementById('mc-spread-chars');
        if (spreadBtn) {
            spreadBtn.addEventListener('click', () => {
                if (this.behaviorManager) {
                    this.behaviorManager.spreadCharacters();
                }
            });
        }
        
        // カメラ追従
        document.getElementById('mc-camera-follow').addEventListener('change', (e) => {
            this.manager.setCameraFollow(e.target.checked);
        });
        
        // ★ パイプラインモード
        document.getElementById('mc-pipeline-mode').addEventListener('change', (e) => {
            this.manager.setPipelineMode(e.target.checked);
            document.getElementById('mc-pipeline-badge').classList.toggle('disabled', !e.target.checked);
            document.getElementById('mc-pipeline-section').style.display = e.target.checked ? 'block' : 'none';
            // 順次計算オプションの表示/非表示
            document.getElementById('mc-sequential-row').style.display = e.target.checked ? 'flex' : 'none';
        });
        
        // ★ 順次計算モード
        document.getElementById('mc-sequential-mode').addEventListener('change', (e) => {
            this.manager.setSequentialCalculation(e.target.checked);
            console.log(`📋 順次計算モード: ${e.target.checked ? 'ON' : 'OFF'}`);
        });
        
        // ターンモード
        document.getElementById('mc-turn-mode').addEventListener('change', (e) => {
            this.manager.setTurnMode(e.target.value);
        });
        
        // ★ v4.3: 音声エンジン選択時にGrok声行の表示/非表示を切替
        document.getElementById('mc-char-voice-engine').addEventListener('change', (e) => {
            const isGrok = e.target.value === 'grok';
            document.getElementById('mc-grok-voice-row').style.display = isGrok ? 'flex' : 'none';
        });
        
        // イベントリスナー（Managerからの通知）
        window.addEventListener('multichar:conversationStart', (e) => {
            this.updateStatus('running');
            this.updateControls(true);
            // ★ 行動システムも初期化
            this.onConversationStart();
        });
        
        window.addEventListener('multichar:conversationEnd', () => {
            this.updateStatus('stopped');
            this.updateControls(false);
        });
        
        window.addEventListener('multichar:turnStart', (e) => {
            this.highlightSpeaker(e.detail.speaker.id);
        });
        
        window.addEventListener('multichar:turnEnd', async (e) => {
            const { speaker, text, emotion, motion } = e.detail;
            
            // ★ 感情とモーション情報も受け取る
            // 先読みプレビューがあれば本番に切り替え
            this.promotePreviewToFinal(speaker.name, text);
            
            // 先読みがなかった場合は新規追加
            if (!this.hasPreviewEntry(speaker.name)) {
                this.addLogEntry(
                    speaker.name, 
                    text,
                    emotion,
                    motion
                );
            }
            
            // ★ UI側でモーション再生（セリフ開始前に再生する）
            // 注: processAndSpeakがモーション再生しない設定(playMotion=false)の場合のみ有効
            if (motion && speaker.id) {
                await this.playMotionForCharacter(speaker.id, motion);
            }
        });
        
        // ★ パイプラインイベント
        window.addEventListener('multichar:pipelineUpdate', (e) => {
            this.updatePipelineDisplay(e.detail.status);
        });
        
        window.addEventListener('multichar:previewTextReady', (e) => {
            const entry = e.detail.entry;
            // 先読みテキストをログに表示（準備中状態）
            this.addPreviewLogEntry(entry.speakerName, entry.responseText);
        });
        
        window.addEventListener('multichar:audioReady', (e) => {
            // 音声準備完了通知（UI更新用）
            const entry = e.detail.entry;
            console.log(`🔊 UI: ${entry.speakerName} 音声準備完了`);
        });
    }
    
    /**
     * キャラクターリストを描画
     */
    renderCharacterList() {
        this.characterList.innerHTML = '';
        
        this.defaultCharacters.forEach(char => {
            const item = document.createElement('div');
            item.className = `mc-char-item ${char.enabled ? '' : 'disabled'} ${char.id === this.selectedCharacterId ? 'selected' : ''}`;
            item.dataset.charId = char.id;
            
            item.innerHTML = `
                <input type="checkbox" class="mc-char-toggle" ${char.enabled ? 'checked' : ''}>
                <div class="mc-char-avatar">${char.name.charAt(0)}</div>
                <div class="mc-char-info">
                    <div class="mc-char-name">${char.name}</div>
                    <div class="mc-char-personality">${char.personality.substring(0, 30)}...</div>
                </div>
                <div class="mc-char-badges">
                    <span class="mc-badge llm">${char.llmType}</span>
                </div>
            `;
            
            // クリックで選択
            item.addEventListener('click', (e) => {
                if (e.target.classList.contains('mc-char-toggle')) return;
                this.selectCharacter(char.id);
            });
            
            // 有効/無効トグル
            item.querySelector('.mc-char-toggle').addEventListener('change', (e) => {
                char.enabled = e.target.checked;
                item.classList.toggle('disabled', !char.enabled);
                // ★ 発言順序リストも更新
                this.onCharacterEnabledChange();
            });
            
            this.characterList.appendChild(item);
        });
    }
    
    /**
     * キャラクターを選択
     */
    selectCharacter(charId) {
        this.selectedCharacterId = charId;
        
        // 選択表示を更新
        document.querySelectorAll('.mc-char-item').forEach(item => {
            item.classList.toggle('selected', item.dataset.charId === charId);
        });
        
        // 設定パネルを表示
        const char = this.defaultCharacters.find(c => c.id === charId);
        if (char) {
            document.getElementById('mc-char-settings').style.display = 'block';
            document.getElementById('mc-char-name').value = char.name;
            document.getElementById('mc-char-personality').value = char.personality;
            document.getElementById('mc-char-llm').value = char.llmType;
            document.getElementById('mc-char-voice').value = char.voiceModel;
            
            // ★ v4.3: 音声エンジンとGrok声の復元
            const voiceEngine = char.voiceEngine || 'sbv2';
            document.getElementById('mc-char-voice-engine').value = voiceEngine;
            document.getElementById('mc-char-grok-voice').value = char.grokVoice || 'Ara';
            
            // Grok選択時はGrok声行を表示
            document.getElementById('mc-grok-voice-row').style.display = voiceEngine === 'grok' ? 'flex' : 'none';
        }
    }
    
    /**
     * キャラクター設定を適用
     */
    applyCharacterSettings() {
        if (!this.selectedCharacterId) return;
        
        const char = this.defaultCharacters.find(c => c.id === this.selectedCharacterId);
        if (!char) return;
        
        char.name = document.getElementById('mc-char-name').value;
        char.personality = document.getElementById('mc-char-personality').value;
        char.llmType = document.getElementById('mc-char-llm').value;
        char.voiceModel = document.getElementById('mc-char-voice').value;
        
        // ★ v4.3: 音声エンジンとGrok声を保存
        char.voiceEngine = document.getElementById('mc-char-voice-engine').value;
        char.grokVoice = document.getElementById('mc-char-grok-voice').value;
        
        // VRMパス
        const vrmSelect = document.getElementById('mc-char-vrm').value;
        if (vrmSelect && vrmSelect !== 'custom') {
            char.vrmPath = vrmSelect;
        }
        
        // リスト更新
        this.renderCharacterList();
        this.selectCharacter(this.selectedCharacterId);
        
        console.log(`✅ キャラクター設定更新: ${char.name} (音声エンジン: ${char.voiceEngine})`);
    }
    
    /**
     * 新しいキャラクターを追加
     */
    addNewCharacter() {
        const id = `char_${Date.now()}`;
        const newChar = {
            id,
            name: `キャラ${this.defaultCharacters.length + 1}`,
            personality: '新しいキャラクター',
            llmType: 'chatgpt',
            voiceModel: 'jvnv-F1-jp',
            enabled: false
        };
        
        this.defaultCharacters.push(newChar);
        this.renderCharacterList();
        this.selectCharacter(id);
    }
    
    /**
     * 選択キャラクターを削除
     */
    deleteSelectedCharacter() {
        if (!this.selectedCharacterId) return;
        
        const index = this.defaultCharacters.findIndex(c => c.id === this.selectedCharacterId);
        if (index >= 0) {
            this.defaultCharacters.splice(index, 1);
        }
        
        this.selectedCharacterId = null;
        document.getElementById('mc-char-settings').style.display = 'none';
        this.renderCharacterList();
    }
    
    /**
     * 会話を開始
     */
    async startConversation() {
        const apiKey = document.getElementById('mc-api-key').value;
        const topic = document.getElementById('mc-topic').value;
        const direction = document.getElementById('mc-direction')?.value || '';
        const scene = document.getElementById('mc-scene')?.value || '';
        const goal = document.getElementById('mc-goal')?.value || '';
        const rules = document.getElementById('mc-rules')?.value || '';
        const maxTurns = document.getElementById('mc-max-turns')?.value || null;
        
        if (!apiKey) {
            alert('⚠️ API Keyを入力してください');
            return;
        }
        
        if (!topic) {
            alert('⚠️ 会話のお題を入力してください');
            return;
        }
        
        // 有効なキャラクターでManagerを初期化
        const enabledChars = this.defaultCharacters.filter(c => c.enabled);
        
        if (enabledChars.length < 2) {
            alert('⚠️ 2人以上のキャラクターを有効にしてください');
            return;
        }
        
        // ★ 全キャラクターが共有する会話コンテキストを構築
        const conversationContext = this.buildConversationContext({
            topic,
            direction,
            scene,
            goal,
            rules,
            characters: enabledChars
        });
        
        console.log('🎬 会話コンテキスト:', conversationContext);
        
        // 既存のキャラクターをクリア
        this.manager.director.getAllCharacters().forEach(c => {
            this.manager.removeCharacter(c.id);
        });
        
        // キャラクターを作成（会話コンテキストを渡す）
        for (const charData of enabledChars) {
            await this.manager.createCharacter({
                ...charData,
                apiKey: apiKey,
                conversationContext: conversationContext  // ★ 会話コンテキストを渡す
            });
            
            // VRMがあればロード
            if (charData.vrmPath) {
                await this.manager.loadVRMForCharacter(charData.id, charData.vrmPath);
            }
        }
        
        // ターンモード設定
        this.manager.setTurnMode(document.getElementById('mc-turn-mode').value);
        
        // カメラ追従設定
        this.manager.setCameraFollow(document.getElementById('mc-camera-follow').checked);
        
        // ★ ターン数制限を設定
        if (maxTurns) {
            this.manager.setMaxTurns(parseInt(maxTurns));
        }
        
        // 会話開始（コンテキスト付き）
        await this.manager.startConversation(topic, conversationContext);
        
        // ★ ユーザー参加モジュールを更新
        if (this.userParticipation) {
            // ディレクター参照を更新（パイプラインモード対応）
            this.userParticipation.director = this.manager.pipelinedDirector || this.manager.director;
            // キャラ一覧を更新
            this.userParticipation.refreshTargetList();
            console.log('👤 ユーザー参加モジュール: ディレクター参照更新完了');
        }
    }
    
    /**
     * ★ 会話コンテキストを構築
     */
    buildConversationContext(settings) {
        const { topic, direction, scene, goal, rules, characters } = settings;
        
        let context = `【会話のお題】
${topic}
`;
        
        if (scene) {
            context += `
【シーン設定】
${scene}
`;
        }
        
        if (direction) {
            context += `
【演出指示】
${direction}
`;
        }
        
        if (goal) {
            context += `
【会話の目標・ゴール】
${goal}
`;
        }
        
        if (rules) {
            context += `
【追加ルール】
${rules}
`;
        }
        
        // 参加キャラクター情報
        context += `
【参加キャラクター】
`;
        characters.forEach(c => {
            context += `・${c.name}: ${c.personality}
`;
        });
        
        return context;
    }
    
    /**
     * 会話を停止
     */
    stopConversation() {
        this.manager.stopConversation();
    }
    
    /**
     * 一時停止/再開
     */
    togglePause() {
        if (this.manager.director.isPaused) {
            this.manager.resumeConversation();
            this.updateStatus('running');
            document.getElementById('mc-pause').textContent = '⏸️ 一時停止';
        } else {
            this.manager.pauseConversation();
            this.updateStatus('paused');
            document.getElementById('mc-pause').textContent = '▶️ 再開';
        }
    }
    
    /**
     * ステータス更新
     */
    updateStatus(status) {
        const statusEl = document.getElementById('mc-status');
        statusEl.className = 'mc-status ' + status;
        
        switch (status) {
            case 'running':
                statusEl.textContent = '会話中';
                break;
            case 'paused':
                statusEl.textContent = '一時停止';
                break;
            default:
                statusEl.textContent = '停止中';
        }
    }
    
    /**
     * コントロールボタン更新
     */
    updateControls(isRunning) {
        document.getElementById('mc-start').disabled = isRunning;
        document.getElementById('mc-stop').disabled = !isRunning;
        document.getElementById('mc-pause').disabled = !isRunning;
    }
    
    /**
     * 話者をハイライト
     */
    highlightSpeaker(charId) {
        // キャラクターリスト
        document.querySelectorAll('.mc-char-item').forEach(item => {
            item.classList.toggle('speaking', item.dataset.charId === charId);
        });
        
        // ★ 発言順序リストもハイライト
        document.querySelectorAll('.mc-order-item').forEach(item => {
            item.classList.toggle('speaking', item.dataset.charId === charId);
        });
    }
    
    /**
     * ログエントリを追加
     * @param {string} speaker - 話者名
     * @param {string} text - セリフ
     * @param {string} emotion - 感情 (オプション)
     * @param {string} motion - モーションファイル名 (オプション)
     */
    addLogEntry(speaker, text, emotion = null, motion = null) {
        const emptyMsg = this.conversationLog.querySelector('.mc-log-empty');
        if (emptyMsg) {
            emptyMsg.remove();
        }
        
        // 感情の絵文字マッピング
        const emotionEmoji = {
            normal: '😐', neutral: '😐',
            happy_mild: '😊', happy: '😄', happy_strong: '🤩',
            grateful: '🙏', sad: '😢', angry: '😠',
            surprised: '😲', thinking: '🤔', shy: '😳'
        };
        
        const emojiStr = emotion ? (emotionEmoji[emotion.toLowerCase()] || '😐') : '';
        const emotionBadge = emotion ? `<span class="mc-log-emotion" title="${emotion}">${emojiStr}</span>` : '';
        const motionBadge = motion ? `<span class="mc-log-motion" title="モーション: ${motion}">🎬</span>` : '';
        
        const entry = document.createElement('div');
        entry.className = 'mc-log-entry';
        entry.innerHTML = `
            <div class="mc-log-header">
                <span class="mc-log-speaker">${speaker}:</span>
                ${emotionBadge}
                ${motionBadge}
            </div>
            <div class="mc-log-text">${text}</div>
        `;
        
        this.conversationLog.appendChild(entry);
        this.conversationLog.scrollTop = this.conversationLog.scrollHeight;
        
        // デバッグログ
        if (emotion || motion) {
            console.log(`🎭 ${speaker} [感情: ${emotion || 'N/A'}, モーション: ${motion || 'N/A'}]: ${text.substring(0, 30)}...`);
        }
    }
    
    /**
     * ログをクリア
     */
    clearLog() {
        this.conversationLog.innerHTML = '<div class="mc-log-empty">会話がありません</div>';
        this.manager.clearHistory();
    }
    
    // ========================================
    // ★ パイプライン表示機能
    // ========================================
    
    /**
     * パイプライン状態を更新
     */
    updatePipelineDisplay(status) {
        const section = document.getElementById('mc-pipeline-section');
        const queue = document.getElementById('mc-pipeline-queue');
        const count = document.getElementById('mc-pipeline-count');
        
        if (!status || status.length === 0) {
            section.style.display = 'none';
            return;
        }
        
        section.style.display = 'block';
        count.textContent = `${status.length}件`;
        
        queue.innerHTML = status.map(entry => {
            const statusLabel = {
                'pending': '待機',
                'generating': '生成中',
                'synthesizing': '音声合成',
                'ready': '準備OK',
                'playing': '再生中',
                'done': '完了',
                'error': 'エラー'
            }[entry.status] || entry.status;
            
            return `
                <div class="mc-pipeline-entry ${entry.status}">
                    <span class="mc-char-avatar" style="width:20px;height:20px;font-size:10px;">${entry.speakerName.charAt(0)}</span>
                    <span class="mc-pipeline-status ${entry.status}">${statusLabel}</span>
                    <span class="mc-pipeline-text">${entry.text || '...'}</span>
                </div>
            `;
        }).join('');
    }
    
    /**
     * 先読みログエントリを追加（準備中状態）
     */
    addPreviewLogEntry(speaker, text) {
        const emptyMsg = this.conversationLog.querySelector('.mc-log-empty');
        if (emptyMsg) {
            emptyMsg.remove();
        }
        
        const entry = document.createElement('div');
        entry.className = 'mc-log-entry preview';
        entry.dataset.speaker = speaker;
        entry.innerHTML = `
            <div class="mc-log-header">
                <span class="mc-log-speaker">${speaker}:</span>
                <span class="mc-log-emotion" title="準備中">⏳</span>
            </div>
            <div class="mc-log-text">${text}</div>
        `;
        
        this.conversationLog.appendChild(entry);
        this.conversationLog.scrollTop = this.conversationLog.scrollHeight;
    }
    
    /**
     * 先読みエントリがあるかチェック
     */
    hasPreviewEntry(speaker) {
        return !!this.conversationLog.querySelector(`.mc-log-entry.preview[data-speaker="${speaker}"]`);
    }
    
    /**
     * 先読みエントリを本番に昇格
     */
    promotePreviewToFinal(speaker, text) {
        const previewEntry = this.conversationLog.querySelector(`.mc-log-entry.preview[data-speaker="${speaker}"]`);
        if (previewEntry) {
            previewEntry.classList.remove('preview');
            // アイコンを更新
            const emotionEl = previewEntry.querySelector('.mc-log-emotion');
            if (emotionEl) {
                emotionEl.textContent = '🗣️';
                emotionEl.title = '再生済み';
            }
        }
    }
    
    /**
     * 最小化トグル
     */
    toggleMinimize() {
        this.isMinimized = !this.isMinimized;
        document.getElementById('mc-body').classList.toggle('minimized', this.isMinimized);
        document.getElementById('mc-minimize').textContent = this.isMinimized ? '＋' : '−';
    }
    
    /**
     * パネルをドラッグ可能にする
     */
    makeDraggable(element, handle) {
        let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
        
        handle.onmousedown = dragMouseDown;
        
        function dragMouseDown(e) {
            e.preventDefault();
            pos3 = e.clientX;
            pos4 = e.clientY;
            document.onmouseup = closeDragElement;
            document.onmousemove = elementDrag;
        }
        
        function elementDrag(e) {
            e.preventDefault();
            pos1 = pos3 - e.clientX;
            pos2 = pos4 - e.clientY;
            pos3 = e.clientX;
            pos4 = e.clientY;
            element.style.top = (element.offsetTop - pos2) + "px";
            element.style.left = (element.offsetLeft - pos1) + "px";
        }
        
        function closeDragElement() {
            document.onmouseup = null;
            document.onmousemove = null;
        }
    }
    
    /**
     * パネルを表示
     */
    show() {
        this.panel.style.display = 'block';
    }
    
    /**
     * パネルを非表示
     */
    hide() {
        this.panel.style.display = 'none';
    }
    
    // ========================================
    // ★ 行動制御機能
    // ========================================
    
    /**
     * 行動マネージャーを初期化
     */
    initBehaviorManager() {
        // CharacterBehaviorManagerをインポート（動的）
        if (!this.behaviorManager && window.CharacterBehaviorManager) {
            this.behaviorManager = new window.CharacterBehaviorManager(this.manager);
            this.behaviorManager.start();
            console.log('🎮 行動マネージャー初期化完了');
        }
        
        // 既存のキャラクターにBehaviorを作成
        if (this.behaviorManager && this.manager) {
            const characters = this.manager.getAllCharacters();
            characters.forEach(unit => {
                if (!this.behaviorManager.getBehavior(unit.id)) {
                    this.behaviorManager.createBehavior(unit);
                }
            });
            
            // ★ スライダーの値を行動マネージャーに適用
            const slider = document.getElementById('mc-separation-slider');
            if (slider) {
                const distance = parseFloat(slider.value);
                this.behaviorManager.setSeparationDistance(distance);
            }
        }
    }
    
    /**
     * 行動制御UIを描画
     */
    renderBehaviorControls() {
        const container = document.getElementById('mc-behavior-individual');
        if (!container) return;
        
        const enabledChars = this.defaultCharacters.filter(c => c.enabled);
        
        if (enabledChars.length === 0) {
            container.innerHTML = '<div style="text-align:center;color:#666;padding:10px;font-size:10px;">キャラクターを有効にしてください</div>';
            return;
        }
        
        container.innerHTML = '';
        
        enabledChars.forEach(char => {
            const behavior = this.behaviorManager?.getBehavior(char.id);
            const currentMode = behavior?.currentMode || 'idle';
            
            const row = document.createElement('div');
            row.className = 'mc-behavior-char-row';
            row.dataset.charId = char.id;
            
            // 他キャラクター選択用のオプション
            const otherChars = enabledChars.filter(c => c.id !== char.id);
            const targetOptions = otherChars.map(c => 
                `<option value="${c.id}">${c.name}</option>`
            ).join('');
            
            row.innerHTML = `
                <span class="mc-behavior-char-name">${char.name}</span>
                <div class="mc-behavior-char-btns">
                    <button class="mc-behavior-char-btn ${currentMode === 'idle' ? 'active' : ''}" 
                            data-char-id="${char.id}" data-mode="idle" title="その場で静止">🧍</button>
                    <button class="mc-behavior-char-btn ${currentMode === 'follow' ? 'active' : ''}" 
                            data-char-id="${char.id}" data-mode="follow" title="カメラを追う">🏃</button>
                    <button class="mc-behavior-char-btn ${currentMode === 'flee' ? 'active' : ''}" 
                            data-char-id="${char.id}" data-mode="flee" title="カメラから逃げる">💨</button>
                    <button class="mc-behavior-char-btn ${currentMode === 'random' ? 'active' : ''}" 
                            data-char-id="${char.id}" data-mode="random" title="ランダム行動">🎲</button>
                    <button class="mc-behavior-char-btn ${currentMode === 'waypoint' ? 'waypoint' : ''}" 
                            data-char-id="${char.id}" data-mode="waypoint" title="目的地指示">📍</button>
                    <button class="mc-behavior-char-btn ${currentMode === 'follow-character' ? 'active' : ''}" 
                            data-char-id="${char.id}" data-mode="follow-character" title="キャラ追跡">👥</button>
                </div>
                ${otherChars.length > 0 ? `
                    <select class="mc-behavior-target-select" data-char-id="${char.id}" title="追跡対象">
                        <option value="">対象</option>
                        ${targetOptions}
                    </select>
                ` : ''}
                <span class="mc-behavior-char-status" data-char-id="${char.id}">待機</span>
            `;
            
            container.appendChild(row);
            
            // ボタンイベント
            row.querySelectorAll('.mc-behavior-char-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    const charId = btn.dataset.charId;
                    const mode = btn.dataset.mode;
                    
                    // follow-characterの場合はターゲットを確認
                    if (mode === 'follow-character') {
                        const select = row.querySelector('.mc-behavior-target-select');
                        const targetId = select?.value;
                        if (!targetId) {
                            alert('追跡対象を選択してください');
                            return;
                        }
                        this.setCharacterBehaviorMode(charId, mode, { targetCharacterId: targetId });
                    } else {
                        this.setCharacterBehaviorMode(charId, mode);
                    }
                    
                    // ボタン状態更新
                    row.querySelectorAll('.mc-behavior-char-btn').forEach(b => {
                        b.classList.remove('active', 'waypoint');
                    });
                    btn.classList.add(mode === 'waypoint' ? 'waypoint' : 'active');
                });
            });
        });
        
        // 状態更新コールバックを設定
        if (this.behaviorManager) {
            this.behaviorManager.behaviors.forEach(behavior => {
                behavior.onStateChange = (b, state) => {
                    const statusEl = container.querySelector(`.mc-behavior-char-status[data-char-id="${b.id}"]`);
                    if (statusEl) {
                        statusEl.textContent = state;
                    }
                };
            });
        }
    }
    
    /**
     * 全キャラクターの行動モードを設定
     */
    setAllBehaviorMode(mode) {
        if (!this.behaviorManager) {
            this.initBehaviorManager();
        }
        
        if (this.behaviorManager) {
            this.behaviorManager.setAllMode(mode);
            
            // UI更新
            document.querySelectorAll('.mc-behavior-char-btn').forEach(btn => {
                btn.classList.remove('active', 'waypoint');
                if (btn.dataset.mode === mode) {
                    btn.classList.add(mode === 'waypoint' ? 'waypoint' : 'active');
                }
            });
            
            console.log(`🚶 全キャラ: 行動モード → ${mode}`);
        }
    }
    
    /**
     * 特定キャラクターの行動モードを設定
     */
    setCharacterBehaviorMode(characterId, mode, options = {}) {
        if (!this.behaviorManager) {
            this.initBehaviorManager();
        }
        
        if (this.behaviorManager) {
            this.behaviorManager.setMode(characterId, mode, options);
            
            // waypointモードの場合はクリック待ちモードを有効化
            if (mode === 'waypoint') {
                this.behaviorManager.enableWaypointMode(characterId);
                
                // UIにクリック待ち表示
                const statusEl = document.querySelector(`.mc-behavior-char-status[data-char-id="${characterId}"]`);
                if (statusEl) {
                    statusEl.textContent = 'クリック待ち...';
                }
            }
            
            console.log(`🚶 ${characterId}: 行動モード → ${mode}`, options);
        }
    }
    
    /**
     * 会話開始時に行動システムも初期化
     */
    onConversationStart() {
        // 行動マネージャーがあればキャラクターにBehaviorを作成
        if (this.behaviorManager && this.manager) {
            const characters = this.manager.getAllCharacters();
            characters.forEach(unit => {
                if (!this.behaviorManager.getBehavior(unit.id)) {
                    this.behaviorManager.createBehavior(unit);
                }
            });
            
            // UI更新
            this.renderBehaviorControls();
        }
    }
    
    // ========================================
    // ★ モーション再生機能（UI側でVRMを特定して再生）
    // ========================================
    
    /**
     * 指定キャラクターにモーションを再生
     * @param {string} characterId - キャラクターID
     * @param {string} motionFile - モーションファイル名 (e.g. '女性しゃべり01.vrma')
     * @returns {Promise<boolean>} - 成功したかtrue
     */
    async playMotionForCharacter(characterId, motionFile) {
        if (!motionFile) {
            console.warn(`⚠️ モーションファイルが指定されていません`);
            return false;
        }
        
        // マネージャーからVRMを取得
        const vrm = this.manager?.characterVRMs?.get(characterId);
        if (!vrm) {
            console.warn(`⚠️ キャラクター ${characterId} のVRMが見つかりません`);
            return false;
        }
        
        // CharacterUnitを取得
        const unit = this.manager?.director?.getCharacter(characterId);
        if (!unit) {
            console.warn(`⚠️ キャラクター ${characterId} のCharacterUnitが見つかりません`);
            return false;
        }
        
        try {
            const THREE = window.THREE;
            const loader = new window.GLTFLoaderClass();
            const { VRMAnimationLoaderPlugin, createVRMAnimationClip } = await import('@pixiv/three-vrm-animation');
            
            loader.register((parser) => new VRMAnimationLoaderPlugin(parser));
            const gltf = await loader.loadAsync('./motions/' + encodeURIComponent(motionFile));
            const vrmAnim = gltf.userData.vrmAnimation || gltf.userData.vrmAnimations?.[0];
            
            if (!vrmAnim) {
                console.warn(`⚠️ VRMAデータが見つかりません: ${motionFile}`);
                return false;
            }
            
            // mixerがなければ作成
            if (!unit.mixer) {
                unit.mixer = new THREE.AnimationMixer(vrm.scene);
                
                // アニメーションループにmixerを登録
                if (!window.multiConversationState) {
                    window.multiConversationState = { animationMixers: [] };
                }
                if (!window.multiConversationState.animationMixers) {
                    window.multiConversationState.animationMixers = [];
                }
                if (!window.multiConversationState.animationMixers.includes(unit.mixer)) {
                    window.multiConversationState.animationMixers.push(unit.mixer);
                    console.log(`📌 UI側: ${unit.name} のmixerをアニメーションループに登録`);
                }
            }
            
            const clip = createVRMAnimationClip(vrmAnim, vrm);
            const newAction = unit.mixer.clipAction(clip);
            
            // クロスフェードで切り替え
            if (unit.currentAction && unit.currentAction.isRunning()) {
                newAction.reset();
                newAction.setLoop(THREE.LoopRepeat);
                newAction.setEffectiveWeight(1);
                newAction.play();
                unit.currentAction.crossFadeTo(newAction, unit.crossfadeDuration || 0.5, true);
            } else {
                newAction.reset();
                newAction.setLoop(THREE.LoopRepeat);
                newAction.play();
            }
            
            unit.currentAction = newAction;
            
            console.log(`🎬 UI側モーション再生: ${unit.name} → ${motionFile}`);
            
            return true;
            
        } catch (error) {
            console.error(`❌ UI側モーションエラー (${characterId}):`, error);
            return false;
        }
    }
    
    /**
     * ターン終了時にモーションを再生
     * (turnEndイベントから呼び出される)
     * @param {string} characterId - キャラクターID
     * @param {string} motionFile - モーションファイル名
     * @param {string} emotion - 感情
     */
    async onTurnEndWithMotion(characterId, motionFile, emotion) {
        console.log(`🎭 UI側ターン終了処理: ${characterId}, 感情=${emotion}, モーション=${motionFile}`);
        
        // モーション再生
        if (motionFile) {
            await this.playMotionForCharacter(characterId, motionFile);
        }
    }
    
    // ========================================
    // ★ 発言順序管理機能
    // ========================================
    
    /**
     * 発言順序リストを描画
     */
    renderSpeakingOrder() {
        if (!this.speakingOrderList) return;
        
        // 有効なキャラクターのみ取得
        const enabledChars = this.defaultCharacters.filter(c => c.enabled);
        
        if (enabledChars.length === 0) {
            this.speakingOrderList.innerHTML = '<div style="text-align:center;color:#666;padding:10px;font-size:10px;">キャラクターを有効にしてください</div>';
            return;
        }
        
        this.speakingOrderList.innerHTML = '';
        
        enabledChars.forEach((char, index) => {
            const item = document.createElement('div');
            item.className = 'mc-order-item';
            item.draggable = true;
            item.dataset.charId = char.id;
            item.dataset.index = index;
            
            const isFirst = index === 0;
            const isLast = index === enabledChars.length - 1;
            
            item.innerHTML = `
                <span class="mc-order-handle" title="ドラッグで移動">≡</span>
                <span class="mc-order-number">${index + 1}</span>
                <span class="mc-order-name">${char.name}</span>
                <div class="mc-order-controls">
                    <button class="mc-order-btn up" title="上へ" ${isFirst ? 'disabled' : ''}>▲</button>
                    <button class="mc-order-btn down" title="下へ" ${isLast ? 'disabled' : ''}>▼</button>
                </div>
            `;
            
            // ▲▼ボタンイベント
            item.querySelector('.mc-order-btn.up').addEventListener('click', (e) => {
                e.stopPropagation();
                this.moveSpeakingOrder(index, index - 1);
            });
            
            item.querySelector('.mc-order-btn.down').addEventListener('click', (e) => {
                e.stopPropagation();
                this.moveSpeakingOrder(index, index + 1);
            });
            
            // ドラッグイベント
            this.setupDragEvents(item, index);
            
            this.speakingOrderList.appendChild(item);
        });
    }
    
    /**
     * ドラッグ＆ドロップイベントを設定
     */
    setupDragEvents(item, index) {
        item.addEventListener('dragstart', (e) => {
            item.classList.add('dragging');
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/plain', index.toString());
            this.draggedIndex = index;
        });
        
        item.addEventListener('dragend', () => {
            item.classList.remove('dragging');
            // 全てのdrag-overを削除
            this.speakingOrderList.querySelectorAll('.mc-order-item').forEach(el => {
                el.classList.remove('drag-over');
            });
            this.draggedIndex = null;
        });
        
        item.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
            
            const currentIndex = parseInt(item.dataset.index);
            if (this.draggedIndex !== null && this.draggedIndex !== currentIndex) {
                item.classList.add('drag-over');
            }
        });
        
        item.addEventListener('dragleave', () => {
            item.classList.remove('drag-over');
        });
        
        item.addEventListener('drop', (e) => {
            e.preventDefault();
            item.classList.remove('drag-over');
            
            const fromIndex = parseInt(e.dataTransfer.getData('text/plain'));
            const toIndex = parseInt(item.dataset.index);
            
            if (fromIndex !== toIndex) {
                this.moveSpeakingOrder(fromIndex, toIndex);
            }
        });
    }
    
    /**
     * 発言順序を移動
     * @param {number} fromIndex - 移動元インデックス
     * @param {number} toIndex - 移動先インデックス
     */
    moveSpeakingOrder(fromIndex, toIndex) {
        const enabledChars = this.defaultCharacters.filter(c => c.enabled);
        
        if (fromIndex < 0 || fromIndex >= enabledChars.length) return;
        if (toIndex < 0 || toIndex >= enabledChars.length) return;
        if (fromIndex === toIndex) return;
        
        // 有効なキャラクターの順序を入れ替え
        const movedChar = enabledChars[fromIndex];
        const targetChar = enabledChars[toIndex];
        
        // defaultCharacters内でのインデックスを取得
        const fromFullIndex = this.defaultCharacters.findIndex(c => c.id === movedChar.id);
        const toFullIndex = this.defaultCharacters.findIndex(c => c.id === targetChar.id);
        
        // 配列を入れ替え（単純なswapではなく、挿入形式）
        const [removed] = this.defaultCharacters.splice(fromFullIndex, 1);
        
        // toFullIndexが変わる可能性があるので再計算
        const newToIndex = this.defaultCharacters.findIndex(c => c.id === targetChar.id);
        const insertAt = fromIndex < toIndex ? newToIndex + 1 : newToIndex;
        
        this.defaultCharacters.splice(insertAt, 0, removed);
        
        // ディレクターのターン順序も更新
        this.updateDirectorTurnOrder();
        
        // UI更新
        this.renderSpeakingOrder();
        this.renderCharacterList();
        
        console.log(`📋 発言順序変更: ${movedChar.name} を ${fromIndex + 1}番目 → ${toIndex + 1}番目へ`);
    }
    
    /**
     * 発言順序をリセット（デフォルト順に戻す）
     */
    resetSpeakingOrder() {
        // IDでソート（char_A, char_B, char_C, char_D の順）
        this.defaultCharacters.sort((a, b) => {
            // char_で始まる場合は英字でソート
            if (a.id.startsWith('char_') && b.id.startsWith('char_')) {
                return a.id.localeCompare(b.id);
            }
            // その他は追加順（IDのタイムスタンプ）
            return a.id.localeCompare(b.id);
        });
        
        // ディレクターのターン順序も更新
        this.updateDirectorTurnOrder();
        
        // UI更新
        this.renderSpeakingOrder();
        this.renderCharacterList();
        
        console.log('🔄 発言順序をリセットしました');
    }
    
    /**
     * ディレクターのターン順序を更新
     */
    updateDirectorTurnOrder() {
        if (!this.manager?.director) return;
        
        const enabledChars = this.defaultCharacters.filter(c => c.enabled);
        const newOrder = enabledChars.map(c => c.id);
        
        // ディレクターにturnOrderがあれば更新
        if (this.manager.director.turnOrder) {
            this.manager.director.turnOrder = newOrder;
            console.log('🎬 ディレクターのターン順序更新:', newOrder);
        }
        
        // パイプラインディレクターがあればそちらも更新
        if (this.manager.pipelinedDirector?.turnOrder) {
            this.manager.pipelinedDirector.turnOrder = newOrder;
        }
    }
    
    /**
     * キャラクターの有効/無効が変更された時に呼ぶ
     */
    onCharacterEnabledChange() {
        this.renderSpeakingOrder();
        this.updateDirectorTurnOrder();
    }
}

// グローバルにエクスポート
window.MultiCharacterUI = MultiCharacterUI;
