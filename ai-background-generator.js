// ========================================
// 🌍 AI背景生成パネル v1.5
// Geminiの会話文脈を理解して360度背景画像を自動生成
// + リアルタイム検出表示UI追加
// + v1.3: DOM (#chat-messages) ポーリングで全モード対応
// + v1.4: マルチキャラ会話ログ連携
// + v1.5: 監視対象の選択機能（通常チャット/マルチキャラ/特定キャラ）
// ========================================

console.log('🌍 AI背景生成パネル v1.5 を読み込み中...');

class AIBackgroundGenerator {
    constructor() {
        this.panelId = 'ai-background-panel';
        this.isVisible = false;
        this.isDragging = false;
        this.dragOffset = { x: 0, y: 0 };
        this.isMinimized = false;
        
        // 背景状態
        this.currentBackground = null;
        this.isGenerating = false;
        this.equirectMesh = null; // 360度背景用球体
        
        // 会話監視
        this.autoGenerateEnabled = false;
        this.lastDetectedScene = null;
        this.lastGeneratedPrompt = null;
        this.generationCooldown = false;
        this.cooldownTime = 15000; // 15秒のクールダウン（API負荷軽減）
        
        // v1.3: DOM監視用
        this.lastCheckedMessageCount = 0;
        this.lastProcessedMessages = new Set(); // 処理済みメッセージのID（重複防止）
        
        // v1.5: 監視対象設定
        // 'normal' = 通常チャット(#chat-messages)
        // 'multichar' = マルチキャラ会話ログ(#mc-conversation-log)
        // 'char_XXX' = 特定キャラクターのみ
        this.monitorSource = 'normal';
        this.selectedCharacter = null; // 特定キャラの場合のキャラ名
        this.availableCharacters = []; // マルチキャラの利用可能キャラリスト
        
        // v1.5: マルチキャラ監視用
        this.lastCheckedMCLogCount = 0;
        this.lastProcessedMCMessages = new Set();
        
        // 検出ログ
        this.detectionLog = [];
        this.maxDetectionLog = 10;
        
        // API設定
        this.geminiApiKey = null;
        this.imageModel = 'gemini-3-pro-image-preview'; // 画像生成可能なモデル
        this.imageSize = '4K'; // 4K: 3840x2160, HD: 1920x1080
        
        // シーン→プロンプトマッピング
        this.sceneToPrompt = {
            // 自然環境
            'beach': '360度パノラマ、美しいトロピカルビーチ、ターコイズブルーの海、白い砂浜、ヤシの木、青い空、夕暮れの光、高解像度、フォトリアリスティック',
            'forest': '360度パノラマ、神秘的な森の中、木漏れ日、緑豊かな木々、苔むした地面、霧がかった雰囲気、ファンタジー風、高解像度',
            'mountain': '360度パノラマ、雄大な山岳風景、雪をかぶった峰々、澄んだ青空、遠くの山々、壮大なスケール、高解像度、フォトリアリスティック',
            'ocean': '360度パノラマ、広大な海、水平線、穏やかな波、青い海と空、雲、太陽の反射、高解像度',
            'garden': '360度パノラマ、日本庭園、桜の木、池、石灯籠、緑の苔、平和な雰囲気、春の光、高解像度',
            'sunset': '360度パノラマ、美しい夕焼け、オレンジと紫のグラデーション、シルエットの木々、ドラマチックな空、高解像度',
            'night_sky': '360度パノラマ、満天の星空、天の川、オーロラ、月明かり、神秘的な夜景、高解像度',
            
            // 都市環境
            'city': '360度パノラマ、近未来的な都市、高層ビル群、ネオンライト、夜景、サイバーパンク風、高解像度',
            'tokyo': '360度パノラマ、東京の街並み、渋谷スクランブル交差点風、ネオン看板、夜の賑わい、アニメ風、高解像度',
            'cafe': '360度パノラマ、おしゃれなカフェ内装、温かい照明、木製家具、植物、居心地の良い雰囲気、高解像度',
            'room': '360度パノラマ、モダンな部屋、大きな窓、日差し、観葉植物、シンプルでスタイリッシュな内装、高解像度',
            'classroom': '360度パノラマ、日本の教室、机と椅子、黒板、窓からの光、放課後の雰囲気、アニメ風、高解像度',
            'station': '360度パノラマ、日本の駅ホーム、電車、人々、夕暮れ、ノスタルジックな雰囲気、高解像度',
            
            // ファンタジー
            'fantasy': '360度パノラマ、ファンタジーの世界、浮遊する島々、魔法の光、神秘的な雰囲気、壮大なスケール、高解像度',
            'castle': '360度パノラマ、中世のお城、石造りの壁、旗、青空、ファンタジーRPG風、高解像度',
            'space': '360度パノラマ、宇宙空間、地球、星々、銀河、宇宙船、SF風、高解像度',
            'underwater': '360度パノラマ、海中世界、サンゴ礁、熱帯魚、光の筋、神秘的な青、高解像度',
            
            // 感情ベース
            'happy': '360度パノラマ、明るく楽しい公園、花々、青空、暖かい日差し、ポジティブな雰囲気、高解像度',
            'sad': '360度パノラマ、雨の日の街角、街灯、濡れた路面、メランコリックな雰囲気、ブルートーン、高解像度',
            'calm': '360度パノラマ、静かな湖畔、朝もや、穏やかな水面、山々の反射、平和な雰囲気、高解像度',
            'energetic': '360度パノラマ、コンサート会場、ステージライト、熱狂的な雰囲気、カラフルな照明、高解像度',
            'romantic': '360度パノラマ、パリの夜景、エッフェル塔、イルミネーション、ロマンチックな雰囲気、高解像度',
            'mysterious': '360度パノラマ、霧に包まれた古い図書館、キャンドルの光、本棚、神秘的な雰囲気、高解像度',
            
            // デフォルト
            'neutral': '360度パノラマ、シンプルなスタジオ背景、グラデーション、プロフェッショナルな照明、高解像度'
        };
        
        // 会話キーワード→シーンマッピング
        this.keywordToScene = {
            // 場所
            '海': 'beach', 'ビーチ': 'beach', '砂浜': 'beach', '浜辺': 'beach',
            '森': 'forest', '林': 'forest', '自然': 'forest',
            '山': 'mountain', '登山': 'mountain', 'ハイキング': 'mountain',
            '庭': 'garden', '公園': 'garden', '花': 'garden',
            '夕日': 'sunset', '夕焼け': 'sunset', '日没': 'sunset',
            '星': 'night_sky', '夜空': 'night_sky', '星空': 'night_sky', 'オーロラ': 'night_sky',
            '都市': 'city', '街': 'city', 'ビル': 'city',
            '東京': 'tokyo', '渋谷': 'tokyo', '秋葉原': 'tokyo', '新宿': 'tokyo',
            'カフェ': 'cafe', '喫茶店': 'cafe', 'コーヒー': 'cafe',
            '部屋': 'room', '家': 'room', 'リビング': 'room',
            '教室': 'classroom', '学校': 'classroom', '授業': 'classroom',
            '駅': 'station', '電車': 'station', 'ホーム': 'station',
            '城': 'castle', 'お城': 'castle', '王国': 'castle',
            '宇宙': 'space', '惑星': 'space', 'ロケット': 'space', 'SF': 'space',
            '海中': 'underwater', '海底': 'underwater', 'サンゴ': 'underwater', '魚': 'underwater',
            'ファンタジー': 'fantasy', '魔法': 'fantasy', '冒険': 'fantasy',
            
            // 感情
            '嬉しい': 'happy', '楽しい': 'happy', 'わーい': 'happy', 'やったー': 'happy',
            '悲しい': 'sad', '寂しい': 'sad', '辛い': 'sad', '泣く': 'sad',
            '穏やか': 'calm', 'リラックス': 'calm', '癒し': 'calm', '落ち着く': 'calm',
            '元気': 'energetic', 'テンション': 'energetic', '盛り上がる': 'energetic',
            'ロマンチック': 'romantic', '恋': 'romantic', 'デート': 'romantic',
            '神秘的': 'mysterious', '謎': 'mysterious', '不思議': 'mysterious'
        };
        
        // シーン絵文字マッピング
        this.sceneEmojis = {
            'beach': '🏖️', 'forest': '🌲', 'mountain': '⛰️', 'ocean': '🌊',
            'garden': '🌸', 'sunset': '🌅', 'night_sky': '🌌',
            'city': '🌃', 'tokyo': '🗼', 'cafe': '☕', 'room': '🏠',
            'classroom': '🏫', 'station': '🚉',
            'fantasy': '✨', 'castle': '🏰', 'space': '🚀', 'underwater': '🐠',
            'happy': '😊', 'sad': '🌧️', 'calm': '🌿', 'energetic': '⚡',
            'romantic': '💕', 'mysterious': '🔮', 'neutral': '🌐'
        };
        
        // 生成履歴
        this.generationHistory = [];
        this.maxHistory = 10;
        
        this.init();
    }
    
    async init() {
        this.loadApiKey();
        this.createPanel();
        this.createFloatingIndicator(); // 画面上の常時表示インジケーター
        this.setupEventListeners();
        this.setupDOMConversationMonitor(); // v1.3: DOM監視
        this.setupMultiCharLogMonitor();     // v1.5: マルチキャラログ監視
        this.setupMultiCharEventListeners(); // v1.5: マルチキャライベント監視
        this.loadSettings();
        console.log('✅ AI背景生成パネル v1.5 初期化完了');
    }
    
    loadApiKey() {
        // まず専用保存から読み込み
        try {
            const dedicated = localStorage.getItem('aibg-gemini-api-key');
            if (dedicated) {
                this.geminiApiKey = dedicated;
                console.log('🔑 AI背景用APIキー読み込み完了');
                return;
            }
        } catch (e) {}
        
        // フォールバック: API設定パネルから取得
        try {
            const saved = localStorage.getItem('vrm-ai-viewer-api-settings');
            if (saved) {
                const settings = JSON.parse(saved);
                this.geminiApiKey = settings.gemini_api_key || null;
            }
        } catch (e) {
            console.log('⚠️ APIキー読み込みエラー');
        }
    }
    
    saveApiKey(apiKey) {
        try {
            localStorage.setItem('aibg-gemini-api-key', apiKey);
            this.geminiApiKey = apiKey;
            console.log('✅ AI背景用APIキー保存完了');
            return true;
        } catch (e) {
            console.error('❌ APIキー保存エラー:', e);
            return false;
        }
    }
    
    // ===================================
    // 画面常時表示インジケーター
    // ===================================
    createFloatingIndicator() {
        const indicator = document.createElement('div');
        indicator.id = 'aibg-floating-indicator';
        indicator.innerHTML = `
            <div class="aibg-indicator-header">
                <span>🌍 背景AI</span>
                <div class="aibg-indicator-controls">
                    <span class="aibg-indicator-status" id="aibg-indicator-status">待機中</span>
                    <button class="aibg-indicator-btn" id="aibg-indicator-minimize" title="最小化">−</button>
                    <button class="aibg-indicator-btn" id="aibg-indicator-close" title="閉じる">×</button>
                </div>
            </div>
            <div class="aibg-indicator-content">
                <div class="aibg-indicator-row">
                    <span class="aibg-indicator-label">検出シーン:</span>
                    <span class="aibg-indicator-scene" id="aibg-indicator-scene">-</span>
                </div>
                <div class="aibg-indicator-row">
                    <span class="aibg-indicator-label">キーワード:</span>
                    <span class="aibg-indicator-keyword" id="aibg-indicator-keyword">-</span>
                </div>
                <div class="aibg-indicator-row">
                    <span class="aibg-indicator-label">次の生成:</span>
                    <span class="aibg-indicator-next" id="aibg-indicator-next">-</span>
                </div>
                <div class="aibg-indicator-log" id="aibg-indicator-log">
                    <!-- 検出ログがここに表示される -->
                </div>
            </div>
        `;
        
        // スタイル追加
        const style = document.createElement('style');
        style.id = 'aibg-floating-indicator-styles';
        style.textContent = `
            #aibg-floating-indicator {
                position: fixed;
                top: 10px;
                left: 10px;
                width: 280px;
                background: rgba(30, 30, 50, 0.95);
                border: 2px solid #667eea;
                border-radius: 12px;
                z-index: 99998;
                font-family: 'Segoe UI', sans-serif;
                font-size: 11px;
                color: white;
                overflow: hidden;
                box-shadow: 0 4px 20px rgba(102, 126, 234, 0.3);
                transition: box-shadow 0.3s ease;
            }
            
            #aibg-floating-indicator.minimized .aibg-indicator-content {
                display: none;
            }
            
            #aibg-floating-indicator.hidden {
                display: none;
            }
            
            #aibg-floating-indicator.dragging {
                opacity: 0.9;
                cursor: grabbing !important;
            }
            
            #aibg-floating-indicator:hover {
                box-shadow: 0 6px 30px rgba(102, 126, 234, 0.5);
            }
            
            #aibg-floating-indicator.generating {
                border-color: #f5576c;
                animation: aibgIndicatorPulse 1.5s infinite;
            }
            
            @keyframes aibgIndicatorPulse {
                0%, 100% { box-shadow: 0 4px 20px rgba(245, 87, 108, 0.3); }
                50% { box-shadow: 0 4px 30px rgba(245, 87, 108, 0.8); }
            }
            
            #aibg-floating-indicator.disabled {
                opacity: 0.5;
                border-color: #666;
            }
            
            .aibg-indicator-header {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                padding: 8px 12px;
                display: flex;
                justify-content: space-between;
                align-items: center;
                font-weight: bold;
                cursor: grab;
                user-select: none;
            }
            
            .aibg-indicator-header:active {
                cursor: grabbing;
            }
            
            .aibg-indicator-controls {
                display: flex;
                align-items: center;
                gap: 6px;
            }
            
            .aibg-indicator-btn {
                background: rgba(255,255,255,0.2);
                border: none;
                color: white;
                width: 22px;
                height: 22px;
                border-radius: 4px;
                cursor: pointer;
                font-size: 14px;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: background 0.2s;
            }
            
            .aibg-indicator-btn:hover {
                background: rgba(255,255,255,0.35);
            }
            
            .aibg-indicator-status {
                font-size: 10px;
                padding: 2px 8px;
                background: rgba(255,255,255,0.2);
                border-radius: 10px;
            }
            
            .aibg-indicator-status.active {
                background: #4CAF50;
            }
            
            .aibg-indicator-status.generating {
                background: #f5576c;
                animation: aibgStatusBlink 0.5s infinite;
            }
            
            @keyframes aibgStatusBlink {
                0%, 100% { opacity: 1; }
                50% { opacity: 0.5; }
            }
            
            .aibg-indicator-status.cooldown {
                background: #ff9800;
            }
            
            .aibg-indicator-content {
                padding: 10px 12px;
            }
            
            .aibg-indicator-row {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 6px;
                padding: 4px 0;
                border-bottom: 1px solid rgba(255,255,255,0.1);
            }
            
            .aibg-indicator-label {
                color: #aaa;
                font-size: 10px;
            }
            
            .aibg-indicator-scene {
                font-size: 14px;
                font-weight: bold;
                color: #4ecdc4;
            }
            
            .aibg-indicator-keyword {
                color: #ffd93d;
                font-weight: bold;
                max-width: 150px;
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
            }
            
            .aibg-indicator-next {
                color: #ff9800;
            }
            
            .aibg-indicator-log {
                max-height: 100px;
                overflow-y: auto;
                margin-top: 8px;
                padding-top: 8px;
                border-top: 1px solid rgba(255,255,255,0.2);
            }
            
            .aibg-log-item {
                display: flex;
                gap: 6px;
                padding: 3px 0;
                font-size: 9px;
                color: #ccc;
                border-bottom: 1px solid rgba(255,255,255,0.05);
            }
            
            .aibg-log-item .time {
                color: #888;
                min-width: 50px;
            }
            
            .aibg-log-item .scene {
                color: #4ecdc4;
                font-weight: bold;
            }
            
            .aibg-log-item .text {
                flex: 1;
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
            }
            
            .aibg-log-item.generated {
                color: #4CAF50;
            }
            
            .aibg-log-item.skipped {
                color: #ff9800;
            }
        `;
        document.head.appendChild(style);
        document.body.appendChild(indicator);
        
        this.floatingIndicator = indicator;
        
        // クリックでパネルを開く（ボタン以外）
        indicator.querySelector('.aibg-indicator-header').addEventListener('click', (e) => {
            if (!e.target.classList.contains('aibg-indicator-btn')) {
                this.toggle();
            }
        });
        
        // 最小化ボタン
        document.getElementById('aibg-indicator-minimize').addEventListener('click', (e) => {
            e.stopPropagation();
            indicator.classList.toggle('minimized');
            const btn = document.getElementById('aibg-indicator-minimize');
            btn.textContent = indicator.classList.contains('minimized') ? '+' : '−';
        });
        
        // 閉じるボタン
        document.getElementById('aibg-indicator-close').addEventListener('click', (e) => {
            e.stopPropagation();
            indicator.classList.add('hidden');
        });
        
        // ドラッグ機能を追加
        this.setupIndicatorDrag();
    }
    
    // インジケーターのドラッグ機能
    setupIndicatorDrag() {
        const indicator = this.floatingIndicator;
        const header = indicator.querySelector('.aibg-indicator-header');
        
        let isDragging = false;
        let startX, startY, startLeft, startTop;
        
        header.addEventListener('mousedown', (e) => {
            if (e.target.classList.contains('aibg-indicator-btn')) return;
            
            isDragging = true;
            indicator.classList.add('dragging');
            
            startX = e.clientX;
            startY = e.clientY;
            
            const rect = indicator.getBoundingClientRect();
            startLeft = rect.left;
            startTop = rect.top;
            
            // 位置を固定
            indicator.style.left = rect.left + 'px';
            indicator.style.top = rect.top + 'px';
            indicator.style.right = 'auto';
            
            e.preventDefault();
        });
        
        document.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            
            const deltaX = e.clientX - startX;
            const deltaY = e.clientY - startY;
            
            let newLeft = startLeft + deltaX;
            let newTop = startTop + deltaY;
            
            // 画面内に制限
            const maxX = window.innerWidth - indicator.offsetWidth;
            const maxY = window.innerHeight - indicator.offsetHeight;
            
            newLeft = Math.max(0, Math.min(newLeft, maxX));
            newTop = Math.max(0, Math.min(newTop, maxY));
            
            indicator.style.left = newLeft + 'px';
            indicator.style.top = newTop + 'px';
        });
        
        document.addEventListener('mouseup', () => {
            if (isDragging) {
                isDragging = false;
                indicator.classList.remove('dragging');
                
                // 位置を保存
                localStorage.setItem('aibgIndicatorPosition', JSON.stringify({
                    left: parseInt(indicator.style.left),
                    top: parseInt(indicator.style.top)
                }));
            }
        });
        
        // 保存された位置を復元
        const savedPos = localStorage.getItem('aibgIndicatorPosition');
        if (savedPos) {
            const pos = JSON.parse(savedPos);
            indicator.style.left = pos.left + 'px';
            indicator.style.top = pos.top + 'px';
        }
    }
    
    // インジケーターを再表示
    showIndicator() {
        if (this.floatingIndicator) {
            this.floatingIndicator.classList.remove('hidden');
        }
    }
    
    hideIndicator() {
        if (this.floatingIndicator) {
            this.floatingIndicator.classList.add('hidden');
        }
    }
    
    toggleIndicator() {
        if (this.floatingIndicator) {
            this.floatingIndicator.classList.toggle('hidden');
        }
    }
    
    updateFloatingIndicator(data = {}) {
        const indicator = this.floatingIndicator;
        if (!indicator) return;
        
        const statusEl = document.getElementById('aibg-indicator-status');
        const sceneEl = document.getElementById('aibg-indicator-scene');
        const keywordEl = document.getElementById('aibg-indicator-keyword');
        const nextEl = document.getElementById('aibg-indicator-next');
        
        // 自動生成の有効/無効表示
        if (!this.autoGenerateEnabled) {
            indicator.classList.add('disabled');
            indicator.classList.remove('generating');
            if (statusEl) {
                statusEl.textContent = '無効';
                statusEl.className = 'aibg-indicator-status';
            }
        } else if (this.isGenerating) {
            indicator.classList.remove('disabled');
            indicator.classList.add('generating');
            if (statusEl) {
                statusEl.textContent = '生成中...';
                statusEl.className = 'aibg-indicator-status generating';
            }
        } else if (this.generationCooldown) {
            indicator.classList.remove('disabled', 'generating');
            if (statusEl) {
                statusEl.textContent = 'クールダウン';
                statusEl.className = 'aibg-indicator-status cooldown';
            }
        } else {
            indicator.classList.remove('disabled', 'generating');
            if (statusEl) {
                statusEl.textContent = '監視中';
                statusEl.className = 'aibg-indicator-status active';
            }
        }
        
        // シーン表示
        if (data.scene && sceneEl) {
            const emoji = this.sceneEmojis[data.scene] || '🌐';
            sceneEl.textContent = `${emoji} ${data.scene}`;
        }
        
        // キーワード表示
        if (data.keyword && keywordEl) {
            keywordEl.textContent = data.keyword;
        }
        
        // 次の生成予定
        if (data.nextAction && nextEl) {
            nextEl.textContent = data.nextAction;
        }
    }
    
    addDetectionLog(text, scene, status = 'detected') {
        const time = new Date().toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        
        this.detectionLog.unshift({
            time,
            text: text.substring(0, 30),
            scene,
            status
        });
        
        if (this.detectionLog.length > this.maxDetectionLog) {
            this.detectionLog.pop();
        }
        
        this.updateDetectionLogUI();
    }
    
    updateDetectionLogUI() {
        const container = document.getElementById('aibg-indicator-log');
        if (!container) return;
        
        container.innerHTML = this.detectionLog.map(item => `
            <div class="aibg-log-item ${item.status}">
                <span class="time">${item.time}</span>
                <span class="scene">${this.sceneEmojis[item.scene] || '🌐'}</span>
                <span class="text">${item.text}...</span>
            </div>
        `).join('');
    }
    
    createPanel() {
        const panel = document.createElement('div');
        panel.id = this.panelId;
        panel.innerHTML = `
            <div class="aibg-panel-header">
                <span class="aibg-panel-title">🌍 AI背景生成</span>
                <div class="aibg-panel-controls">
                    <button class="aibg-panel-btn minimize-btn" title="最小化">−</button>
                    <button class="aibg-panel-btn close-btn" title="閉じる">×</button>
                </div>
            </div>
            <div class="aibg-panel-content">
                <!-- 現在のシーン表示 -->
                <div class="aibg-section">
                    <div class="aibg-section-label">🎭 検出シーン</div>
                    <div class="aibg-scene-display">
                        <span class="aibg-scene-emoji">🌐</span>
                        <span class="aibg-scene-text">待機中...</span>
                    </div>
                </div>
                
                <!-- プレビュー -->
                <div class="aibg-section">
                    <div class="aibg-section-label">🖼️ 現在の背景</div>
                    <div class="aibg-preview-container">
                        <div class="aibg-preview" id="aibg-preview">
                            <span class="aibg-preview-placeholder">背景なし</span>
                        </div>
                    </div>
                    <div class="aibg-progress-container">
                        <div class="aibg-progress-bar">
                            <div class="aibg-progress-fill"></div>
                        </div>
                        <span class="aibg-status-text">準備完了</span>
                    </div>
                </div>
                
                <!-- 🔑 API設定 -->
                <div class="aibg-section">
                    <div class="aibg-section-label">🔑 Gemini API設定</div>
                    <div class="aibg-api-status" id="aibg-api-status">
                        <span class="aibg-api-indicator" id="aibg-api-indicator">⚪</span>
                        <span id="aibg-api-status-text">未設定</span>
                    </div>
                    <div class="aibg-api-input-row">
                        <input type="password" id="aibg-api-key-input" placeholder="Gemini APIキーを入力..." autocomplete="off">
                        <button id="aibg-api-save-btn" class="aibg-api-save-btn">保存</button>
                    </div>
                    <div class="aibg-api-help">
                        <a href="https://aistudio.google.com/app/apikey" target="_blank">🔗 APIキーを取得</a>
                    </div>
                </div>
                
                <!-- 会話自動生成 -->
                <div class="aibg-section">
                    <div class="aibg-section-label">🤖 会話自動生成</div>
                    <div class="aibg-auto-toggle">
                        <label class="aibg-toggle-switch">
                            <input type="checkbox" id="aibg-auto-generate">
                            <span class="aibg-toggle-slider"></span>
                        </label>
                        <span class="aibg-toggle-label">会話の文脈から自動で背景生成</span>
                    </div>
                    
                    <!-- v1.5: 監視対象選択 -->
                    <div class="aibg-monitor-source" id="aibg-monitor-source-section">
                        <div class="aibg-source-label">📡 監視対象:</div>
                        <div class="aibg-source-options">
                            <label class="aibg-source-option">
                                <input type="radio" name="aibg-source" value="normal" checked>
                                <span class="aibg-source-icon">💬</span>
                                <span>通常チャット</span>
                            </label>
                            <label class="aibg-source-option">
                                <input type="radio" name="aibg-source" value="multichar">
                                <span class="aibg-source-icon">🎭</span>
                                <span>マルチキャラ全体</span>
                            </label>
                            <label class="aibg-source-option">
                                <input type="radio" name="aibg-source" value="character">
                                <span class="aibg-source-icon">👤</span>
                                <span>特定キャラ</span>
                            </label>
                        </div>
                        
                        <!-- 特定キャラ選択 -->
                        <div class="aibg-char-select-container" id="aibg-char-select-container" style="display:none;">
                            <select id="aibg-char-select">
                                <option value="">キャラを選択...</option>
                            </select>
                            <button id="aibg-refresh-chars" class="aibg-refresh-btn" title="キャラリスト更新">🔄</button>
                        </div>
                        
                        <div class="aibg-source-info" id="aibg-source-info">
                            💬 通常チャット (#chat-messages) を監視中
                        </div>
                    </div>
                    
                    <div class="aibg-cooldown-info" id="aibg-cooldown-info" style="display:none;">
                        ⏱️ 次の生成まで: <span id="aibg-cooldown-time">0</span>秒
                    </div>
                </div>
                
                <!-- カスタムプロンプト -->
                <div class="aibg-section">
                    <div class="aibg-section-label">✏️ カスタムプロンプト</div>
                    <textarea id="aibg-custom-prompt" placeholder="360度パノラマ、桜の並木道、春の日差し、花びらが舞う..." rows="3"></textarea>
                    <button id="aibg-generate-btn" class="aibg-generate-btn">
                        <span class="aibg-generate-icon">🎨</span>
                        <span>背景を生成</span>
                    </button>
                </div>
                
                <!-- クイックシーン選択 -->
                <div class="aibg-section">
                    <div class="aibg-section-label">⚡ クイックシーン</div>
                    <div class="aibg-quick-scenes">
                        <button class="aibg-scene-btn" data-scene="beach">🏖️ ビーチ</button>
                        <button class="aibg-scene-btn" data-scene="forest">🌲 森</button>
                        <button class="aibg-scene-btn" data-scene="city">🌃 都市</button>
                        <button class="aibg-scene-btn" data-scene="sunset">🌅 夕暮れ</button>
                        <button class="aibg-scene-btn" data-scene="night_sky">🌌 星空</button>
                        <button class="aibg-scene-btn" data-scene="tokyo">🗼 東京</button>
                        <button class="aibg-scene-btn" data-scene="cafe">☕ カフェ</button>
                        <button class="aibg-scene-btn" data-scene="classroom">🏫 教室</button>
                        <button class="aibg-scene-btn" data-scene="fantasy">✨ ファンタジー</button>
                        <button class="aibg-scene-btn" data-scene="space">🚀 宇宙</button>
                        <button class="aibg-scene-btn" data-scene="underwater">🐠 海中</button>
                        <button class="aibg-scene-btn" data-scene="castle">🏰 城</button>
                    </div>
                </div>
                
                <!-- 画質設定 -->
                <div class="aibg-section">
                    <div class="aibg-section-label">⚙️ 設定</div>
                    <div class="aibg-settings">
                        <div class="aibg-setting-row">
                            <span>画質:</span>
                            <select id="aibg-quality">
                                <option value="4K">4K (3840x2160)</option>
                                <option value="2K">2K (2560x1440)</option>
                                <option value="HD">HD (1920x1080)</option>
                            </select>
                        </div>
                        <div class="aibg-setting-row">
                            <span>スタイル:</span>
                            <select id="aibg-style">
                                <option value="realistic">リアル</option>
                                <option value="anime">アニメ風</option>
                                <option value="painting">絵画風</option>
                                <option value="fantasy">ファンタジー</option>
                            </select>
                        </div>
                    </div>
                </div>
                
                <!-- 履歴 -->
                <div class="aibg-section">
                    <div class="aibg-section-label">📜 生成履歴</div>
                    <div class="aibg-history" id="aibg-history">
                        <div class="aibg-history-placeholder">履歴なし</div>
                    </div>
                </div>
                
                <!-- 削除ボタン -->
                <button id="aibg-remove-btn" class="aibg-remove-btn">🗑️ 背景を削除</button>
            </div>
        `;
        
        this.addStyles();
        document.body.appendChild(panel);
        this.panel = panel;
        this.setInitialPosition();
    }
    
    addStyles() {
        if (document.getElementById('ai-background-panel-styles')) return;
        
        const style = document.createElement('style');
        style.id = 'ai-background-panel-styles';
        style.textContent = `
            #ai-background-panel {
                position: fixed;
                top: 150px;
                right: 300px;
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
            
            #ai-background-panel.visible {
                display: block;
                animation: aibgPanelSlideIn 0.3s ease;
            }
            
            @keyframes aibgPanelSlideIn {
                from { opacity: 0; transform: translateX(20px); }
                to { opacity: 1; transform: translateX(0); }
            }
            
            #ai-background-panel.minimized .aibg-panel-content {
                display: none;
            }
            
            .aibg-panel-header {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                padding: 10px 12px;
                display: flex;
                justify-content: space-between;
                align-items: center;
                cursor: move;
                user-select: none;
            }
            
            .aibg-panel-title {
                font-weight: bold;
                font-size: 13px;
            }
            
            .aibg-panel-controls {
                display: flex;
                gap: 6px;
            }
            
            .aibg-panel-btn {
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
            
            .aibg-panel-btn:hover {
                background: rgba(255, 255, 255, 0.3);
            }
            
            .aibg-panel-content {
                padding: 12px;
                max-height: 500px;
                overflow-y: auto;
            }
            
            .aibg-section {
                margin-bottom: 12px;
                padding-bottom: 10px;
                border-bottom: 1px solid #eee;
            }
            
            .aibg-section:last-child {
                border-bottom: none;
            }
            
            .aibg-section-label {
                font-weight: bold;
                color: #333;
                margin-bottom: 8px;
                font-size: 11px;
            }
            
            /* シーン表示 */
            .aibg-scene-display {
                display: flex;
                align-items: center;
                gap: 10px;
                padding: 8px 12px;
                background: linear-gradient(135deg, #e8eaff 0%, #d4d8ff 100%);
                border-radius: 8px;
            }
            
            .aibg-scene-emoji {
                font-size: 24px;
            }
            
            .aibg-scene-text {
                font-size: 13px;
                font-weight: bold;
                color: #667eea;
            }
            
            /* プレビュー */
            .aibg-preview-container {
                margin-bottom: 8px;
            }
            
            .aibg-preview {
                width: 100%;
                height: 120px;
                background: #f0f0f0;
                border-radius: 8px;
                display: flex;
                align-items: center;
                justify-content: center;
                overflow: hidden;
                position: relative;
            }
            
            .aibg-preview img {
                width: 100%;
                height: 100%;
                object-fit: cover;
            }
            
            .aibg-preview-placeholder {
                color: #999;
                font-size: 12px;
            }
            
            /* プログレスバー */
            .aibg-progress-container {
                display: flex;
                align-items: center;
                gap: 8px;
            }
            
            .aibg-progress-bar {
                flex: 1;
                height: 4px;
                background: #eee;
                border-radius: 2px;
                overflow: hidden;
            }
            
            .aibg-progress-fill {
                height: 100%;
                width: 0%;
                background: linear-gradient(90deg, #667eea, #764ba2);
                transition: width 0.3s;
            }
            
            .aibg-status-text {
                font-size: 9px;
                color: #999;
                min-width: 80px;
                text-align: right;
            }
            
            /* 自動生成トグル */
            .aibg-auto-toggle {
                display: flex;
                align-items: center;
                gap: 10px;
                margin-bottom: 8px;
            }
            
            .aibg-toggle-switch {
                position: relative;
                width: 40px;
                height: 20px;
            }
            
            .aibg-toggle-switch input {
                opacity: 0;
                width: 0;
                height: 0;
            }
            
            .aibg-toggle-slider {
                position: absolute;
                cursor: pointer;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: #ccc;
                border-radius: 20px;
                transition: 0.3s;
            }
            
            .aibg-toggle-slider:before {
                position: absolute;
                content: "";
                height: 16px;
                width: 16px;
                left: 2px;
                bottom: 2px;
                background: white;
                border-radius: 50%;
                transition: 0.3s;
            }
            
            .aibg-toggle-switch input:checked + .aibg-toggle-slider {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            }
            
            .aibg-toggle-switch input:checked + .aibg-toggle-slider:before {
                transform: translateX(20px);
            }
            
            .aibg-toggle-label {
                font-size: 10px;
                color: #666;
            }
            
            .aibg-cooldown-info {
                font-size: 10px;
                color: #ff9800;
                margin-top: 5px;
                padding: 5px;
                background: #fff3e0;
                border-radius: 4px;
            }
            
            /* v1.5: 監視対象選択 */
            .aibg-monitor-source {
                margin-top: 10px;
                padding: 10px;
                background: #f8f9fa;
                border-radius: 8px;
                border: 1px solid #e0e0e0;
            }
            
            .aibg-source-label {
                font-size: 10px;
                font-weight: bold;
                color: #666;
                margin-bottom: 8px;
            }
            
            .aibg-source-options {
                display: flex;
                flex-direction: column;
                gap: 6px;
            }
            
            .aibg-source-option {
                display: flex;
                align-items: center;
                gap: 6px;
                padding: 6px 10px;
                background: white;
                border: 1px solid #ddd;
                border-radius: 6px;
                cursor: pointer;
                transition: all 0.2s;
                font-size: 11px;
            }
            
            .aibg-source-option:hover {
                border-color: #667eea;
                background: #f0f2ff;
            }
            
            .aibg-source-option input {
                margin: 0;
            }
            
            .aibg-source-option input:checked + .aibg-source-icon {
                transform: scale(1.2);
            }
            
            .aibg-source-option:has(input:checked) {
                border-color: #667eea;
                background: linear-gradient(135deg, #e8eaff 0%, #f0f2ff 100%);
                font-weight: bold;
            }
            
            .aibg-source-icon {
                font-size: 14px;
                transition: transform 0.2s;
            }
            
            .aibg-char-select-container {
                display: flex;
                gap: 6px;
                margin-top: 8px;
                padding: 8px;
                background: linear-gradient(135deg, rgba(156, 39, 176, 0.1) 0%, rgba(224, 64, 251, 0.1) 100%);
                border-radius: 6px;
                border: 1px solid #9c27b0;
            }
            
            .aibg-char-select-container select {
                flex: 1;
                padding: 6px 10px;
                border: 1px solid #9c27b0;
                border-radius: 4px;
                font-size: 11px;
                background: white;
            }
            
            .aibg-refresh-btn {
                padding: 6px 10px;
                background: #9c27b0;
                color: white;
                border: none;
                border-radius: 4px;
                cursor: pointer;
                font-size: 12px;
                transition: all 0.2s;
            }
            
            .aibg-refresh-btn:hover {
                background: #7b1fa2;
                transform: rotate(180deg);
            }
            
            .aibg-source-info {
                margin-top: 8px;
                padding: 6px 10px;
                background: linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%);
                border-radius: 4px;
                font-size: 9px;
                color: #667eea;
                text-align: center;
            }
            
            .aibg-source-info.multichar {
                background: linear-gradient(135deg, rgba(156, 39, 176, 0.1) 0%, rgba(224, 64, 251, 0.1) 100%);
                color: #9c27b0;
            }
            
            .aibg-source-info.character {
                background: linear-gradient(135deg, rgba(76, 175, 80, 0.1) 0%, rgba(139, 195, 74, 0.1) 100%);
                color: #4caf50;
            }
            
            /* API設定 */
            .aibg-api-status {
                display: flex;
                align-items: center;
                gap: 8px;
                padding: 6px 10px;
                background: #f5f5f5;
                border-radius: 6px;
                margin-bottom: 8px;
                font-size: 11px;
            }
            
            .aibg-api-indicator {
                font-size: 10px;
            }
            
            .aibg-api-status.connected {
                background: #e8f5e9;
                color: #2e7d32;
            }
            
            .aibg-api-status.error {
                background: #ffebee;
                color: #c62828;
            }
            
            .aibg-api-input-row {
                display: flex;
                gap: 6px;
                margin-bottom: 6px;
            }
            
            .aibg-api-input-row input {
                flex: 1;
                padding: 8px 10px;
                border: 1px solid #ddd;
                border-radius: 6px;
                font-size: 11px;
            }
            
            .aibg-api-input-row input:focus {
                outline: none;
                border-color: #667eea;
            }
            
            .aibg-api-save-btn {
                padding: 8px 16px;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                border: none;
                border-radius: 6px;
                font-size: 11px;
                font-weight: bold;
                cursor: pointer;
                transition: all 0.2s;
            }
            
            .aibg-api-save-btn:hover {
                transform: scale(1.05);
            }
            
            .aibg-api-help {
                font-size: 10px;
                text-align: right;
            }
            
            .aibg-api-help a {
                color: #667eea;
                text-decoration: none;
            }
            
            .aibg-api-help a:hover {
                text-decoration: underline;
            }
            
            /* カスタムプロンプト */
            #aibg-custom-prompt {
                width: 100%;
                padding: 8px;
                border: 1px solid #ddd;
                border-radius: 6px;
                font-size: 11px;
                resize: vertical;
                margin-bottom: 8px;
                font-family: inherit;
            }
            
            #aibg-custom-prompt:focus {
                outline: none;
                border-color: #667eea;
            }
            
            .aibg-generate-btn {
                width: 100%;
                padding: 10px;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                border: none;
                border-radius: 8px;
                font-size: 12px;
                font-weight: bold;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 8px;
                transition: all 0.2s;
            }
            
            .aibg-generate-btn:hover {
                transform: scale(1.02);
                box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
            }
            
            .aibg-generate-btn:disabled {
                opacity: 0.6;
                cursor: not-allowed;
                transform: none;
            }
            
            .aibg-generate-btn.generating {
                animation: aibgPulse 1.5s infinite;
            }
            
            @keyframes aibgPulse {
                0%, 100% { box-shadow: 0 0 0 0 rgba(102, 126, 234, 0.4); }
                50% { box-shadow: 0 0 0 10px rgba(102, 126, 234, 0); }
            }
            
            /* クイックシーン */
            .aibg-quick-scenes {
                display: flex;
                flex-wrap: wrap;
                gap: 4px;
            }
            
            .aibg-scene-btn {
                padding: 4px 10px;
                background: #f5f5f5;
                border: 1px solid #ddd;
                border-radius: 12px;
                cursor: pointer;
                font-size: 10px;
                transition: all 0.2s;
            }
            
            .aibg-scene-btn:hover {
                background: #e8eaff;
                border-color: #667eea;
            }
            
            .aibg-scene-btn.active {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                border-color: transparent;
            }
            
            /* 設定 */
            .aibg-settings {
                display: flex;
                flex-direction: column;
                gap: 8px;
            }
            
            .aibg-setting-row {
                display: flex;
                align-items: center;
                justify-content: space-between;
            }
            
            .aibg-setting-row span {
                font-size: 11px;
                color: #666;
            }
            
            .aibg-setting-row select {
                padding: 4px 8px;
                border: 1px solid #ddd;
                border-radius: 4px;
                font-size: 10px;
                min-width: 120px;
            }
            
            /* 履歴 */
            .aibg-history {
                max-height: 100px;
                overflow-y: auto;
            }
            
            .aibg-history-placeholder {
                color: #999;
                font-size: 11px;
                text-align: center;
                padding: 10px;
            }
            
            .aibg-history-item {
                display: flex;
                align-items: center;
                gap: 8px;
                padding: 6px;
                background: #f8f9fa;
                border-radius: 6px;
                margin-bottom: 4px;
                cursor: pointer;
                transition: all 0.2s;
            }
            
            .aibg-history-item:hover {
                background: #e8eaff;
            }
            
            .aibg-history-item img {
                width: 40px;
                height: 30px;
                object-fit: cover;
                border-radius: 4px;
            }
            
            .aibg-history-item .history-text {
                flex: 1;
                font-size: 10px;
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
            }
            
            /* 削除ボタン */
            .aibg-remove-btn {
                width: 100%;
                padding: 10px;
                background: #ff6b6b;
                color: white;
                border: none;
                border-radius: 8px;
                font-size: 12px;
                font-weight: bold;
                cursor: pointer;
                transition: all 0.2s;
            }
            
            .aibg-remove-btn:hover {
                background: #ff5252;
            }
            
            /* トグルボタン */
            #ai-background-toggle-btn {
                position: fixed;
                bottom: 140px;
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
            
            #ai-background-toggle-btn:hover {
                transform: scale(1.1);
                box-shadow: 0 6px 16px rgba(102, 126, 234, 0.5);
            }
            
            #ai-background-toggle-btn.active {
                background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
            }
            
            #ai-background-toggle-btn.generating {
                animation: aibgBtnPulse 2s infinite;
            }
            
            @keyframes aibgBtnPulse {
                0%, 100% { box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4); }
                50% { box-shadow: 0 4px 20px rgba(102, 126, 234, 0.8); }
            }
        `;
        
        document.head.appendChild(style);
    }
    
    setInitialPosition() {
        const saved = localStorage.getItem('aiBackgroundPanelPosition');
        if (saved) {
            const pos = JSON.parse(saved);
            this.panel.style.left = pos.left + 'px';
            this.panel.style.top = pos.top + 'px';
            this.panel.style.right = 'auto';
        }
    }
    
    setupEventListeners() {
        // ヘッダーのドラッグ
        const header = this.panel.querySelector('.aibg-panel-header');
        header.addEventListener('mousedown', (e) => this.startDrag(e));
        document.addEventListener('mousemove', (e) => this.drag(e));
        document.addEventListener('mouseup', () => this.endDrag());
        
        // 閉じる/最小化
        this.panel.querySelector('.close-btn').addEventListener('click', () => this.hide());
        this.panel.querySelector('.minimize-btn').addEventListener('click', () => this.toggleMinimize());
        
        // 生成ボタン
        document.getElementById('aibg-generate-btn').addEventListener('click', () => {
            const prompt = document.getElementById('aibg-custom-prompt').value;
            if (prompt.trim()) {
                this.generateBackground(prompt);
            } else {
                this.showNotification('⚠️ プロンプトを入力してください', 'warning');
            }
        });
        
        // API保存ボタン
        document.getElementById('aibg-api-save-btn').addEventListener('click', () => {
            const input = document.getElementById('aibg-api-key-input');
            const apiKey = input.value.trim();
            if (apiKey) {
                if (this.saveApiKey(apiKey)) {
                    this.updateApiStatus();
                    this.showNotification('✅ APIキーを保存しました');
                    input.value = '';
                }
            } else {
                this.showNotification('⚠️ APIキーを入力してください', 'warning');
            }
        });
        
        // Enterキーでも保存
        document.getElementById('aibg-api-key-input').addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                document.getElementById('aibg-api-save-btn').click();
            }
        });
        
        // 自動生成トグル
        document.getElementById('aibg-auto-generate').addEventListener('change', (e) => {
            this.autoGenerateEnabled = e.target.checked;
            this.saveSettings();
            this.updateFloatingIndicator();
            if (this.autoGenerateEnabled) {
                this.showNotification('🤖 自動背景生成が有効になりました');
            }
        });
        
        // v1.5: 監視対象選択
        document.querySelectorAll('input[name="aibg-source"]').forEach(radio => {
            radio.addEventListener('change', (e) => {
                this.setMonitorSource(e.target.value);
            });
        });
        
        // v1.5: キャラ選択
        document.getElementById('aibg-char-select').addEventListener('change', (e) => {
            this.selectedCharacter = e.target.value || null;
            this.updateSourceInfo();
            this.saveSettings();
            if (this.selectedCharacter) {
                this.showNotification(`👤 ${this.selectedCharacter} の発言を監視します`);
            }
        });
        
        // v1.5: キャラリスト更新ボタン
        document.getElementById('aibg-refresh-chars').addEventListener('click', () => {
            this.refreshCharacterList();
        });
        
        // クイックシーンボタン
        this.panel.querySelectorAll('.aibg-scene-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const scene = btn.dataset.scene;
                this.generateByScene(scene);
            });
        });
        
        // 削除ボタン
        document.getElementById('aibg-remove-btn').addEventListener('click', () => {
            this.removeBackground();
        });
        
        // トグルボタン作成
        this.createToggleButton();
    }
    
    createToggleButton() {
        const btn = document.createElement('button');
        btn.id = 'ai-background-toggle-btn';
        btn.innerHTML = '🌍';
        btn.title = 'AI背景生成パネル（クリック: パネル開閉, Shift+クリック: インジケーター再表示）';
        btn.addEventListener('click', (e) => {
            if (e.shiftKey) {
                // Shift+クリックでインジケーターを再表示
                this.showIndicator();
            } else {
                this.toggle();
            }
        });
        document.body.appendChild(btn);
        this.toggleBtn = btn;
    }
    
    // ===================================
    // v1.5: 監視対象設定
    // ===================================
    setMonitorSource(source) {
        this.monitorSource = source;
        
        const charSelectContainer = document.getElementById('aibg-char-select-container');
        
        if (source === 'character') {
            charSelectContainer.style.display = 'flex';
            this.refreshCharacterList();
        } else {
            charSelectContainer.style.display = 'none';
            this.selectedCharacter = null;
        }
        
        this.updateSourceInfo();
        this.saveSettings();
        
        // カウンターをリセット
        this.lastCheckedMessageCount = 0;
        this.lastCheckedMCLogCount = 0;
        this.lastProcessedMessages.clear();
        this.lastProcessedMCMessages.clear();
        
        const sourceNames = {
            'normal': '💬 通常チャット',
            'multichar': '🎭 マルチキャラ全体',
            'character': '👤 特定キャラ'
        };
        this.showNotification(`${sourceNames[source]} を監視します`);
    }
    
    updateSourceInfo() {
        const infoEl = document.getElementById('aibg-source-info');
        if (!infoEl) return;
        
        infoEl.classList.remove('multichar', 'character');
        
        switch (this.monitorSource) {
            case 'normal':
                infoEl.textContent = '💬 通常チャット (#chat-messages) を監視中';
                break;
            case 'multichar':
                infoEl.textContent = '🎭 マルチキャラ会話ログ全体を監視中';
                infoEl.classList.add('multichar');
                break;
            case 'character':
                if (this.selectedCharacter) {
                    infoEl.textContent = `👤 ${this.selectedCharacter} の発言のみを監視中`;
                } else {
                    infoEl.textContent = '👤 キャラクターを選択してください';
                }
                infoEl.classList.add('character');
                break;
        }
    }
    
    refreshCharacterList() {
        const select = document.getElementById('aibg-char-select');
        if (!select) return;
        
        const charSet = new Set();
        
        // ★ 1. マルチキャラ会話ログから取得（実際の発言者）
        const mcLogEl = document.getElementById('mc-conversation-log');
        if (mcLogEl) {
            const entries = mcLogEl.querySelectorAll('.mc-log-entry');
            entries.forEach(entry => {
                // v1.5.1: .mc-log-speaker または .mc-log-name をチェック
                const nameEl = entry.querySelector('.mc-log-speaker') || entry.querySelector('.mc-log-name');
                if (nameEl) {
                    const name = nameEl.textContent.trim().replace(/:$/, '').trim();
                    if (name && name.length > 0) charSet.add(name);
                }
            });
        }
        
        // ★ 2. マルチキャラUIのデフォルトキャラクターから取得
        // window.multiCharacterUI にインスタンスがある場合
        if (window.multiCharacterUI?.defaultCharacters) {
            window.multiCharacterUI.defaultCharacters.forEach(c => {
                if (c.enabled && c.name) charSet.add(c.name);
            });
        }
        
        // ★ 3. マルチキャラマネージャーから取得
        if (window.multiCharacterManager?.director) {
            const chars = window.multiCharacterManager.director.getAllCharacters();
            chars.forEach(c => {
                if (c.name) charSet.add(c.name);
            });
        }
        
        // ★ 4. キャラクターリストDOMから取得（バックアップ）
        const charListEl = document.getElementById('mc-character-list');
        if (charListEl) {
            const charItems = charListEl.querySelectorAll('.mc-char-item:not(.disabled)');
            charItems.forEach(item => {
                const nameEl = item.querySelector('.mc-char-name');
                if (nameEl) {
                    const name = nameEl.textContent.trim();
                    if (name && name.length > 0) charSet.add(name);
                }
            });
        }
        
        this.availableCharacters = Array.from(charSet);
        
        // セレクトを更新
        select.innerHTML = '<option value="">キャラを選択...</option>';
        
        if (this.availableCharacters.length > 0) {
            this.availableCharacters.forEach(name => {
                const option = document.createElement('option');
                option.value = name;
                option.textContent = `🎭 ${name}`;
                if (name === this.selectedCharacter) {
                    option.selected = true;
                }
                select.appendChild(option);
            });
        } else {
            const option = document.createElement('option');
            option.value = '';
            option.textContent = '(マルチキャラ会話を開始してください)';
            option.disabled = true;
            select.appendChild(option);
        }
        
        console.log('🔄 キャラリスト更新:', this.availableCharacters);
        
        // 更新通知
        if (this.availableCharacters.length > 0) {
            this.showNotification(`🎭 ${this.availableCharacters.length}人のキャラを検出`);
        }
    }
    
    // ===================================
    // v1.3: DOM監視（#chat-messages）
    // 全てのAIモード（ChatGPT, Gemini, Grok Voice, SBV2）に対応
    // ===================================
    setupDOMConversationMonitor() {
        console.log('🔍 AI背景: DOM会話監視を開始');
        
        setInterval(() => {
            // v1.5: 通常チャットモードの時のみ実行
            if (this.monitorSource === 'normal') {
                this.checkChatMessagesDOM();
            }
        }, 2000); // 2秒ごとにチェック
    }
    
    checkChatMessagesDOM() {
        if (!this.autoGenerateEnabled) {
            this.updateFloatingIndicator();
            return;
        }
        
        // #chat-messages DOM要素を取得
        const chatMessagesEl = document.getElementById('chat-messages');
        if (!chatMessagesEl) {
            return;
        }
        
        // 全てのメッセージ要素を取得
        const messageElements = chatMessagesEl.querySelectorAll('.message');
        const currentCount = messageElements.length;
        
        // 新しいメッセージがあるかチェック
        if (currentCount > this.lastCheckedMessageCount) {
            console.log(`📨 新しいメッセージ検出: ${this.lastCheckedMessageCount} → ${currentCount}`);
            
            // 新しいメッセージだけ処理
            for (let i = this.lastCheckedMessageCount; i < currentCount; i++) {
                const msgEl = messageElements[i];
                
                // ユニークIDを生成（インデックス + テキストの一部）
                // v1.5.1: .message-textがない場合は直接textContentを取得
                const textEl = msgEl.querySelector('.message-text');
                const text = textEl ? textEl.textContent.trim() : msgEl.textContent.trim();
                const msgId = `msg_${i}_${text.substring(0, 20)}`;
                
                // 既に処理済みならスキップ
                if (this.lastProcessedMessages.has(msgId)) {
                    continue;
                }
                this.lastProcessedMessages.add(msgId);
                
                // メッセージが空でなければ分析
                if (text.length > 0) {
                    // userクラスがあればユーザー、なければAI
                    const isUser = msgEl.classList.contains('user');
                    const source = isUser ? 'User' : 'AI';
                    
                    console.log(`💬 メッセージ (${source}): ${text.substring(0, 50)}...`);
                    this.analyzeText(text, source);
                }
            }
            
            this.lastCheckedMessageCount = currentCount;
        }
        
        // 処理済みリストが大きくなりすぎないように制限
        if (this.lastProcessedMessages.size > 100) {
            const arr = Array.from(this.lastProcessedMessages);
            this.lastProcessedMessages = new Set(arr.slice(-50));
        }
        
        this.updateFloatingIndicator();
    }
    
    // ===================================
    // v1.5: マルチキャラ会話ログ監視
    // ===================================
    setupMultiCharLogMonitor() {
        console.log('🔍 AI背景: マルチキャラログ監視を開始');
        
        setInterval(() => {
            // v1.5: マルチキャラモードまたは特定キャラモードの時のみ実行
            if (this.monitorSource === 'multichar' || this.monitorSource === 'character') {
                this.checkMultiCharLogDOM();
            }
        }, 2000);
    }
    
    checkMultiCharLogDOM() {
        if (!this.autoGenerateEnabled) {
            this.updateFloatingIndicator();
            return;
        }
        
        const mcLogEl = document.getElementById('mc-conversation-log');
        if (!mcLogEl) {
            return;
        }
        
        const logEntries = mcLogEl.querySelectorAll('.mc-log-entry');
        const currentCount = logEntries.length;
        
        if (currentCount > this.lastCheckedMCLogCount) {
            console.log(`📨 マルチキャラ新ログ検出: ${this.lastCheckedMCLogCount} → ${currentCount}`);
            
            for (let i = this.lastCheckedMCLogCount; i < currentCount; i++) {
                const entry = logEntries[i];
                
                // v1.5.1: .mc-log-speaker または .mc-log-name をチェック（DOM構造の差異対応）
                const nameEl = entry.querySelector('.mc-log-speaker') || entry.querySelector('.mc-log-name');
                const textEl = entry.querySelector('.mc-log-text');
                
                // テキストの取得：.mc-log-textがない場合は直接textContentを取得
                const charName = nameEl ? nameEl.textContent.trim().replace(/:$/, '') : 'Unknown';
                const text = textEl ? textEl.textContent.trim() : entry.textContent.trim();
                
                const msgId = `mc_aibg_${i}_${charName}_${text.substring(0, 20)}`;
                
                if (this.lastProcessedMCMessages.has(msgId)) {
                    continue;
                }
                this.lastProcessedMCMessages.add(msgId);
                
                if (text.length > 0) {
                    // v1.5: 特定キャラモードの場合、選択キャラのみ処理
                    if (this.monitorSource === 'character') {
                        if (this.selectedCharacter && charName !== this.selectedCharacter) {
                            console.log(`🔍 スキップ (${charName} ≠ ${this.selectedCharacter})`);
                            continue;
                        }
                    }
                    
                    console.log(`💬 マルチキャラログ [${charName}]: ${text.substring(0, 50)}...`);
                    this.analyzeText(text, `MC:${charName}`);
                }
            }
            
            this.lastCheckedMCLogCount = currentCount;
        }
        
        if (this.lastProcessedMCMessages.size > 100) {
            const arr = Array.from(this.lastProcessedMCMessages);
            this.lastProcessedMCMessages = new Set(arr.slice(-50));
        }
        
        this.updateFloatingIndicator();
    }
    
    // ===================================
    // v1.5: マルチキャライベント監視
    // ===================================
    setupMultiCharEventListeners() {
        console.log('🔍 AI背景: マルチキャライベント監視を開始');
        
        window.addEventListener('multichar:turnEnd', (e) => {
            if (!this.autoGenerateEnabled) return;
            if (this.monitorSource === 'normal') return; // 通常モードでは無視
            
            const { speaker, text } = e.detail;
            if (speaker && text) {
                // 特定キャラモードの場合
                if (this.monitorSource === 'character') {
                    if (this.selectedCharacter && speaker.name !== this.selectedCharacter) {
                        return;
                    }
                }
                
                console.log(`🎭 マルチキャライベント [${speaker.name}]: ${text.substring(0, 50)}...`);
                this.analyzeText(text, `MC:${speaker.name}`);
            }
        });
        
        window.addEventListener('multichar:conversationStart', () => {
            console.log('🔍 AI背景: マルチキャラ会話開始検出');
            this.lastCheckedMCLogCount = 0;
            this.lastProcessedMCMessages.clear();
            this.refreshCharacterList();
        });
    }
    
    analyzeText(text, source) {
        console.log(`🔍 会話分析 (${source}): ${text.substring(0, 50)}...`);
        
        // シーンを検出
        const result = this.detectSceneFromText(text);
        
        if (result.scene) {
            const emoji = this.sceneEmojis[result.scene] || '🌐';
            console.log(`🎭 シーン検出: ${emoji} ${result.scene} (キーワード: ${result.keyword})`);
            
            // UIを更新
            this.updateFloatingIndicator({
                scene: result.scene,
                keyword: result.keyword,
                nextAction: this.generationCooldown ? 'クールダウン中' : (this.isGenerating ? '生成中...' : '生成予定')
            });
            
            // パネルのシーン表示も更新
            this.panel.querySelector('.aibg-scene-emoji').textContent = emoji;
            this.panel.querySelector('.aibg-scene-text').textContent = `${result.scene} (${result.keyword})`;
            
            // 検出ログに追加
            this.addDetectionLog(text, result.scene, 'detected');
            
            // 新しいシーンが検出されたら背景生成
            if (result.scene !== this.lastDetectedScene && !this.isGenerating && !this.generationCooldown) {
                console.log(`🎨 新シーン検出: ${this.lastDetectedScene} → ${result.scene}`);
                this.lastDetectedScene = result.scene;
                this.generateByScene(result.scene);
                this.addDetectionLog(text, result.scene, 'generated');
            } else if (this.generationCooldown) {
                this.addDetectionLog(text, result.scene, 'skipped');
            }
        }
    }
    
    detectSceneFromText(text) {
        // テキストからキーワードを探してシーンを判定
        for (const [keyword, scene] of Object.entries(this.keywordToScene)) {
            if (text.includes(keyword)) {
                return { scene, keyword };
            }
        }
        
        return { scene: null, keyword: null };
    }
    
    // ドラッグ操作
    startDrag(e) {
        if (e.target.classList.contains('aibg-panel-btn')) return;
        this.isDragging = true;
        const rect = this.panel.getBoundingClientRect();
        this.dragOffset.x = e.clientX - rect.left;
        this.dragOffset.y = e.clientY - rect.top;
        this.panel.style.right = 'auto';
    }
    
    drag(e) {
        if (!this.isDragging) return;
        this.panel.style.left = (e.clientX - this.dragOffset.x) + 'px';
        this.panel.style.top = (e.clientY - this.dragOffset.y) + 'px';
    }
    
    endDrag() {
        if (this.isDragging) {
            this.isDragging = false;
            localStorage.setItem('aiBackgroundPanelPosition', JSON.stringify({
                left: parseInt(this.panel.style.left),
                top: parseInt(this.panel.style.top)
            }));
        }
    }
    
    // 表示制御
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
        this.isVisible ? this.hide() : this.show();
    }
    
    toggleMinimize() {
        this.isMinimized = !this.isMinimized;
        this.panel.classList.toggle('minimized', this.isMinimized);
        this.panel.querySelector('.minimize-btn').textContent = this.isMinimized ? '+' : '−';
    }
    
    // シーンベースの背景生成
    async generateByScene(scene) {
        // UI更新
        const emoji = this.sceneEmojis[scene] || '🌍';
        this.panel.querySelector('.aibg-scene-emoji').textContent = emoji;
        this.panel.querySelector('.aibg-scene-text').textContent = scene;
        
        // クイックシーンボタンのアクティブ表示
        this.panel.querySelectorAll('.aibg-scene-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.scene === scene);
        });
        
        // プロンプトを取得
        let prompt = this.sceneToPrompt[scene] || this.sceneToPrompt['neutral'];
        
        // スタイル適用
        const style = document.getElementById('aibg-style')?.value || 'realistic';
        const styleModifiers = {
            'realistic': '、フォトリアリスティック、写真のような',
            'anime': '、アニメ風、イラスト調、鮮やかな色彩',
            'painting': '、油絵風、印象派、芸術的',
            'fantasy': '、ファンタジーアート、魔法的、光の効果'
        };
        prompt += styleModifiers[style] || '';
        
        await this.generateBackground(prompt);
    }
    
    // 背景生成（メイン関数）
    async generateBackground(prompt) {
        if (this.isGenerating) {
            this.showNotification('⏳ 生成中です...', 'warning');
            return;
        }
        
        if (!this.geminiApiKey) {
            this.loadApiKey();
            if (!this.geminiApiKey) {
                this.showNotification('⚠️ Gemini APIキーを設定してください', 'error');
                return;
            }
        }
        
        this.isGenerating = true;
        this.lastGeneratedPrompt = prompt;
        
        const generateBtn = document.getElementById('aibg-generate-btn');
        generateBtn.disabled = true;
        generateBtn.classList.add('generating');
        generateBtn.innerHTML = '<span class="aibg-generate-icon">⏳</span><span>生成中...</span>';
        this.toggleBtn.classList.add('generating');
        
        this.updateFloatingIndicator();
        this.updateStatus('🎨 画像生成中...');
        this.updateProgress(10);
        
        try {
            console.log('🎨 背景生成開始:', prompt.substring(0, 50) + '...');
            
            // Gemini 2.0 Flash で画像生成
            const imageData = await this.generateImageWithGemini(prompt);
            
            if (imageData) {
                this.updateProgress(70);
                this.updateStatus('🌐 背景適用中...');
                
                // 360度背景として適用
                await this.apply360Background(imageData);
                
                // 履歴に追加
                this.addToHistory(prompt, imageData);
                
                // プレビュー更新
                this.updatePreview(imageData);
                
                this.updateProgress(100);
                this.updateStatus('✅ 完了');
                this.showNotification('🎉 背景を生成しました！');
                
                // クールダウン開始
                this.startCooldown();
                
            } else {
                throw new Error('画像データが取得できませんでした');
            }
            
        } catch (error) {
            console.error('❌ 背景生成エラー:', error);
            this.updateStatus('❌ エラー: ' + error.message);
            this.showNotification('⚠️ 生成失敗: ' + error.message, 'error');
        } finally {
            this.isGenerating = false;
            generateBtn.disabled = false;
            generateBtn.classList.remove('generating');
            generateBtn.innerHTML = '<span class="aibg-generate-icon">🎨</span><span>背景を生成</span>';
            this.toggleBtn.classList.remove('generating');
            this.updateFloatingIndicator();
        }
    }
    
    // Gemini APIで画像生成
    async generateImageWithGemini(prompt) {
        // 画質設定を取得
        const quality = document.getElementById('aibg-quality')?.value || '4K';
        
        // 解像度マッピング
        const resolutionMap = {
            '4K': { width: 3840, height: 2160, text: '4K ultra high resolution (3840x2160 pixels)' },
            '2K': { width: 2560, height: 1440, text: '2K high resolution (2560x1440 pixels)' },
            'HD': { width: 1920, height: 1080, text: 'Full HD resolution (1920x1080 pixels)' }
        };
        
        const resolution = resolutionMap[quality] || resolutionMap['4K'];
        console.log(`🎨 画像生成解像度: ${quality} (${resolution.width}x${resolution.height})`);
        
        // 画像生成リクエスト（Gemini 2.0 Flash Experimental の画像生成機能を使用）
        // 解像度を強く明示するプロンプト
        const requestBody = {
            contents: [{
                parts: [{
                    text: `Generate a 360-degree equirectangular panorama image.

**CRITICAL RESOLUTION REQUIREMENT**: ${resolution.text}
The output image MUST be exactly ${resolution.width} pixels wide and ${resolution.height} pixels tall.
This is a ${quality} resolution image - do NOT generate a lower resolution.

Style: Ultra high quality, extremely detailed, seamless panorama, photorealistic

Scene description:
${prompt}

IMPORTANT REQUIREMENTS:
1. The image MUST be in equirectangular format suitable for 360-degree viewing
2. The left and right edges MUST connect seamlessly
3. Resolution MUST be ${resolution.width}x${resolution.height} pixels (${quality})
4. Maximum detail and clarity`
                }]
            }],
            generationConfig: {
                responseModalities: ['TEXT', 'IMAGE'],
                responseMimeType: 'text/plain'
            }
        };
        
        console.log('📡 Gemini API リクエスト送信...');
        
        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${this.imageModel}:generateContent?key=${this.geminiApiKey}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(requestBody)
            }
        );
        
        const data = await response.json();
        
        if (data.error) {
            throw new Error(data.error.message);
        }
        
        // 画像データを抽出
        if (data.candidates && data.candidates[0] && data.candidates[0].content) {
            const parts = data.candidates[0].content.parts;
            for (const part of parts) {
                if (part.inlineData && part.inlineData.mimeType?.startsWith('image/')) {
                    // Base64画像データを返す
                    return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
                }
            }
        }
        
        // 画像が生成されなかった場合、テキストレスポンスをチェック
        console.log('⚠️ 画像が生成されませんでした。フォールバック処理を実行...');
        
        // フォールバック: Imagen 3 APIを試す（利用可能な場合）
        return await this.generateWithImagen(prompt);
    }
    
    // Imagen 3 APIでの画像生成（フォールバック）
    async generateWithImagen(prompt) {
        const quality = document.getElementById('aibg-quality')?.value || '4K';
        
        // 解像度マッピング
        const resolutionMap = {
            '4K': { width: 3840, height: 2160 },
            '2K': { width: 2560, height: 1440 },
            'HD': { width: 1920, height: 1080 }
        };
        const resolution = resolutionMap[quality] || resolutionMap['4K'];
        
        console.log(`🎨 Imagen API フォールバック: ${quality} (${resolution.width}x${resolution.height})`);
        
        const requestBody = {
            instances: [{
                prompt: `${prompt} 360 degree equirectangular panorama, ${quality} resolution ${resolution.width}x${resolution.height} pixels, ultra high quality, seamless, extremely detailed`
            }],
            parameters: {
                sampleCount: 1,
                aspectRatio: '16:9',
                personGeneration: 'allow_all'
            }
        };
        
        try {
            const response = await fetch(
                `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-002:predict?key=${this.geminiApiKey}`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(requestBody)
                }
            );
            
            const data = await response.json();
            
            if (data.predictions && data.predictions[0]) {
                const prediction = data.predictions[0];
                if (prediction.bytesBase64Encoded) {
                    return `data:image/png;base64,${prediction.bytesBase64Encoded}`;
                }
            }
        } catch (e) {
            console.log('⚠️ Imagen API 利用不可:', e.message);
        }
        
        // 両方失敗した場合はプレースホルダー画像を生成
        return this.generatePlaceholderImage(prompt);
    }
    
    // プレースホルダー画像生成
    generatePlaceholderImage(prompt) {
        // 画質設定を取得
        const quality = document.getElementById('aibg-quality')?.value || '4K';
        
        // 解像度マッピング
        const resolutionMap = {
            '4K': { width: 3840, height: 2160 },
            '2K': { width: 2560, height: 1440 },
            'HD': { width: 1920, height: 1080 }
        };
        const resolution = resolutionMap[quality] || resolutionMap['4K'];
        
        console.log(`🎨 プレースホルダー生成: ${quality} (${resolution.width}x${resolution.height})`);
        
        // Canvas でプレースホルダーを生成
        const canvas = document.createElement('canvas');
        canvas.width = resolution.width;
        canvas.height = resolution.height;
        const ctx = canvas.getContext('2d');
        
        // グラデーション背景
        const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
        gradient.addColorStop(0, '#667eea');
        gradient.addColorStop(1, '#764ba2');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // テキスト
        ctx.fillStyle = 'white';
        ctx.font = 'bold 48px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('🌍 AI Background', canvas.width / 2, canvas.height / 2 - 30);
        ctx.font = '24px Arial';
        ctx.fillText(prompt.substring(0, 50) + '...', canvas.width / 2, canvas.height / 2 + 30);
        
        return canvas.toDataURL('image/png');
    }
    
    // 360度背景として適用
    async apply360Background(imageDataUrl) {
        const THREE = window.THREE;
        const scene = window.app?.scene;
        const camera = window.app?.camera;
        
        if (!THREE || !scene) {
            console.error('Three.js またはシーンが利用できません');
            return;
        }
        
        console.log('🌐 360度背景適用開始...');
        console.log('  - imageDataUrl長さ:', imageDataUrl?.length || 0);
        if (camera) {
            console.log('  - カメラ位置:', camera.position.x, camera.position.y, camera.position.z);
        }
        
        // 既存の背景メッシュを削除
        if (this.equirectMesh) {
            console.log('  - 既存の背景メッシュを削除');
            scene.remove(this.equirectMesh);
            if (this.equirectMesh.geometry) this.equirectMesh.geometry.dispose();
            if (this.equirectMesh.material) {
                if (this.equirectMesh.material.map) this.equirectMesh.material.map.dispose();
                this.equirectMesh.material.dispose();
            }
            this.equirectMesh = null;
        }
        
        // グリッドを非表示
        const gridHelper = scene.children.find(child => child.type === 'GridHelper');
        if (gridHelper) {
            gridHelper.visible = false;
            console.log('  - グリッド非表示');
        }
        
        // テクスチャをロード
        return new Promise((resolve, reject) => {
            const loader = new THREE.TextureLoader();
            
            // CORSの問題を回避するためcrossOriginを設定
            loader.crossOrigin = 'anonymous';
            
            loader.load(
                imageDataUrl,
                (texture) => {
                    console.log('  - テクスチャ読み込み完了');
                    console.log('  - テクスチャサイズ:', texture.image?.width, 'x', texture.image?.height);
                    
                    // テクスチャ設定
                    texture.colorSpace = THREE.SRGBColorSpace;
                    
                    // 球体ジオメトリを作成（内側から見る）
                    // 十分大きな球体でVRMとカメラを包み込む
                    const geometry = new THREE.SphereGeometry(100, 64, 32);
                    
                    // マテリアル作成（BackSideで内側から見る）
                    const material = new THREE.MeshBasicMaterial({
                        map: texture,
                        side: THREE.BackSide  // 内側から見るのでBackSide
                    });
                    
                    // メッシュ作成
                    this.equirectMesh = new THREE.Mesh(geometry, material);
                    
                    // 球体を原点に配置（VRMとカメラが中心にあるように）
                    this.equirectMesh.position.set(0, 0, 0);
                    
                    scene.add(this.equirectMesh);
                    
                    console.log('  - 球体メッシュ追加完了');
                    console.log('  - 球体位置:', this.equirectMesh.position.x, this.equirectMesh.position.y, this.equirectMesh.position.z);
                    console.log('  - 球体半径: 100');
                    
                    // シーンの背景をnullに（球体で背景を表現するため）
                    scene.background = null;
                    
                    console.log('✅ 360度背景を適用しました');
                    this.currentBackground = imageDataUrl;
                    resolve();
                },
                (progress) => {
                    // 読み込み進捗
                    if (progress.total > 0) {
                        console.log('  - テクスチャ読み込み中:', Math.round(progress.loaded / progress.total * 100) + '%');
                    }
                },
                (error) => {
                    console.error('❌ テクスチャ読み込みエラー:', error);
                    reject(error);
                }
            );
        });
    }
    
    // 背景削除
    removeBackground() {
        const THREE = window.THREE;
        const scene = window.app?.scene;
        
        console.log('🗑️ 背景削除開始...');
        
        if (this.equirectMesh && scene) {
            scene.remove(this.equirectMesh);
            if (this.equirectMesh.geometry) this.equirectMesh.geometry.dispose();
            if (this.equirectMesh.material) {
                if (this.equirectMesh.material.map) this.equirectMesh.material.map.dispose();
                this.equirectMesh.material.dispose();
            }
            this.equirectMesh = null;
            console.log('  - 球体メッシュ削除完了');
        }
        
        // グリッドを再表示、背景色を復元
        if (scene && THREE) {
            const gridHelper = scene.children.find(child => child.type === 'GridHelper');
            if (gridHelper) {
                gridHelper.visible = true;
                console.log('  - グリッド再表示');
            }
            scene.background = new THREE.Color(0xf0f0f0);
            console.log('  - 背景色復元');
        }
        
        this.currentBackground = null;
        
        // プレビューをクリア
        const preview = document.getElementById('aibg-preview');
        if (preview) {
            preview.innerHTML = '<span class="aibg-preview-placeholder">背景なし</span>';
        }
        
        this.updateStatus('背景削除');
        this.showNotification('🗑️ 背景を削除しました');
        console.log('✅ 背景削除完了');
    }
    
    // プレビュー更新
    updatePreview(imageDataUrl) {
        const preview = document.getElementById('aibg-preview');
        if (preview) {
            preview.innerHTML = `<img src="${imageDataUrl}" alt="背景プレビュー">`;
        }
    }
    
    // 履歴に追加
    addToHistory(prompt, imageDataUrl) {
        this.generationHistory.unshift({
            prompt: prompt,
            image: imageDataUrl,
            timestamp: new Date().toLocaleTimeString()
        });
        
        // 最大件数を超えたら古いものを削除
        if (this.generationHistory.length > this.maxHistory) {
            this.generationHistory.pop();
        }
        
        this.updateHistoryUI();
    }
    
    // 履歴UI更新
    updateHistoryUI() {
        const container = document.getElementById('aibg-history');
        if (!container) return;
        
        if (this.generationHistory.length === 0) {
            container.innerHTML = '<div class="aibg-history-placeholder">履歴なし</div>';
            return;
        }
        
        container.innerHTML = this.generationHistory.map((item, i) => `
            <div class="aibg-history-item" data-index="${i}">
                <img src="${item.image}" alt="履歴${i}">
                <span class="history-text">${item.prompt.substring(0, 30)}...</span>
            </div>
        `).join('');
        
        // クリックイベント
        container.querySelectorAll('.aibg-history-item').forEach(item => {
            item.addEventListener('click', () => {
                const index = parseInt(item.dataset.index);
                const historyItem = this.generationHistory[index];
                if (historyItem) {
                    this.apply360Background(historyItem.image);
                    this.updatePreview(historyItem.image);
                    this.showNotification('📜 履歴から復元しました');
                }
            });
        });
    }
    
    // クールダウン管理
    startCooldown() {
        this.generationCooldown = true;
        const cooldownInfo = document.getElementById('aibg-cooldown-info');
        const cooldownTime = document.getElementById('aibg-cooldown-time');
        
        if (cooldownInfo) cooldownInfo.style.display = 'block';
        
        let remaining = this.cooldownTime / 1000;
        const interval = setInterval(() => {
            remaining--;
            if (cooldownTime) cooldownTime.textContent = remaining;
            
            // フローティングインジケーターも更新
            this.updateFloatingIndicator({
                nextAction: `${remaining}秒後`
            });
            
            if (remaining <= 0) {
                clearInterval(interval);
                this.generationCooldown = false;
                if (cooldownInfo) cooldownInfo.style.display = 'none';
                this.updateFloatingIndicator();
            }
        }, 1000);
    }
    
    // UI更新ヘルパー
    updateStatus(text) {
        const el = this.panel.querySelector('.aibg-status-text');
        if (el) el.textContent = text;
    }
    
    updateProgress(percent) {
        const fill = this.panel.querySelector('.aibg-progress-fill');
        if (fill) fill.style.width = percent + '%';
    }
    
    // 設定
    loadSettings() {
        const saved = localStorage.getItem('aiBackgroundSettings');
        if (saved) {
            const settings = JSON.parse(saved);
            this.autoGenerateEnabled = settings.autoGenerate || false;
            this.monitorSource = settings.monitorSource || 'normal';
            this.selectedCharacter = settings.selectedCharacter || null;
            
            document.getElementById('aibg-auto-generate').checked = this.autoGenerateEnabled;
            
            // v1.5: 監視対象を復元
            const radio = document.querySelector(`input[name="aibg-source"][value="${this.monitorSource}"]`);
            if (radio) {
                radio.checked = true;
            }
            
            // 特定キャラモードの場合
            if (this.monitorSource === 'character') {
                document.getElementById('aibg-char-select-container').style.display = 'flex';
                this.refreshCharacterList();
            }
            
            this.updateSourceInfo();
        }
        this.updateFloatingIndicator();
        this.updateApiStatus();
    }
    
    updateApiStatus() {
        const statusEl = document.getElementById('aibg-api-status');
        const indicatorEl = document.getElementById('aibg-api-indicator');
        const textEl = document.getElementById('aibg-api-status-text');
        
        if (!statusEl || !indicatorEl || !textEl) return;
        
        if (this.geminiApiKey) {
            statusEl.className = 'aibg-api-status connected';
            indicatorEl.textContent = '🟢';
            textEl.textContent = '設定済み (' + this.geminiApiKey.substring(0, 8) + '...)';
        } else {
            statusEl.className = 'aibg-api-status error';
            indicatorEl.textContent = '🔴';
            textEl.textContent = '未設定 - APIキーを入力してください';
        }
    }
    
    saveSettings() {
        localStorage.setItem('aiBackgroundSettings', JSON.stringify({
            autoGenerate: this.autoGenerateEnabled,
            monitorSource: this.monitorSource,
            selectedCharacter: this.selectedCharacter
        }));
    }
    
    showNotification(message, type = 'success') {
        const notification = document.createElement('div');
        const bgColor = type === 'success' ? '#667eea' : type === 'error' ? '#dc3545' : '#ffc107';
        notification.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            background: ${bgColor};
            color: white;
            padding: 12px 20px;
            border-radius: 8px;
            z-index: 99999;
            animation: aibgFadeInOut 3s forwards;
            max-width: 300px;
        `;
        notification.textContent = message;
        document.body.appendChild(notification);
        setTimeout(() => notification.remove(), 3000);
        
        // アニメーション追加
        if (!document.getElementById('aibg-notification-style')) {
            const style = document.createElement('style');
            style.id = 'aibg-notification-style';
            style.textContent = `
                @keyframes aibgFadeInOut {
                    0% { opacity: 0; transform: translateY(20px); }
                    20% { opacity: 1; transform: translateY(0); }
                    80% { opacity: 1; transform: translateY(0); }
                    100% { opacity: 0; transform: translateY(-20px); }
                }
            `;
            document.head.appendChild(style);
        }
    }
    
    // 外部からシーンを設定（Gemini連携用）
    setSceneFromGemini(scene, context = '') {
        if (!this.autoGenerateEnabled) return;
        if (this.isGenerating || this.generationCooldown) return;
        
        console.log(`🤖 外部呼び出しシーン: ${scene} (${context})`);
        this.generateByScene(scene);
    }
}

// ===========================================
// グローバル初期化
// ===========================================

let aiBackgroundGenerator = null;

function initAIBackgroundGenerator() {
    if (!aiBackgroundGenerator) {
        aiBackgroundGenerator = new AIBackgroundGenerator();
        window.aiBackgroundGenerator = aiBackgroundGenerator;
    }
    return aiBackgroundGenerator;
}

// DOMContentLoadedで初期化
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAIBackgroundGenerator);
} else {
    initAIBackgroundGenerator();
}

// グローバルAPIエクスポート
window.AIBackgroundGenerator = AIBackgroundGenerator;

// Gemini連携用のヘルパー関数
window.setBackgroundScene = function(scene, context) {
    if (aiBackgroundGenerator) {
        aiBackgroundGenerator.setSceneFromGemini(scene, context);
    }
};

window.showAIBackgroundPanel = function() {
    if (aiBackgroundGenerator) aiBackgroundGenerator.show();
};

window.hideAIBackgroundPanel = function() {
    if (aiBackgroundGenerator) aiBackgroundGenerator.hide();
};

window.generateAIBackground = function(prompt) {
    if (aiBackgroundGenerator) {
        aiBackgroundGenerator.generateBackground(prompt);
    }
};

console.log('✅ AI背景生成パネル v1.5 スクリプト読み込み完了 (監視対象選択対応)');