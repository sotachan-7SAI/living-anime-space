// ========================================
// 🎵 ローカル音楽BGMパネル v2.4
// 会話のムードに応じてローカル音楽を選曲・フェード再生
// v2.0: 人間側の言葉を分析 + 毎回変化モード
// v2.1: 開始ボタン追加でいつ始まるか分かりやすく
// v2.2: DOM監視方式に変更（AI背景生成と同様、全AIモード対応）
// v2.3: マルチキャラ会話UIの会話ログから分析監視対応
// v2.4: 「いろいろ」フォルダからAI文脈読み取り選曲モード追加
// ========================================

console.log('🎵 ローカル音楽BGMパネル v2.4 を読み込み中...');

class LocalMusicPanel {
    constructor() {
        this.panelId = 'local-music-panel';
        this.isVisible = false;
        this.isDragging = false;
        this.dragOffset = { x: 0, y: 0 };
        this.isMinimized = false;
        
        // 音楽状態
        this.currentTrack = null;
        this.isPlaying = false;
        this.audioElement = null;
        this.fadeInterval = null;
        
        // 自動選曲設定
        this.autoSelectEnabled = false;
        this.analyzeHumanOnly = true;  // v2.0: 人間側の言葉のみを分析
        this.alwaysChangeTrack = false; // v2.0: 毎回確実に曲を変える
        this.lastDetectedMood = null;
        this.lastPlayedTrackPath = null; // 最後に再生した曲のパス
        this.recentTracks = [];  // 最近再生した曲（重複防止用）
        this.maxRecentTracks = 5;
        
        // v2.2: DOM監視用（AI背景生成と同じ方式）
        this.lastCheckedMessageCount = 0;
        this.lastProcessedMessages = new Set();
        
        // v2.3: マルチキャラ会話ログ監視用
        this.lastCheckedMCLogCount = 0;
        this.lastProcessedMCMessages = new Set();
        this.useMultiCharLog = true;  // マルチキャラログを優先する
        
        // v2.4: 「いろいろ」フォルダからAI文脈読み取り選曲モード
        this.contextReadModeEnabled = false;  // 文脈から読み取りモード
        this.iroiroTracks = [];  // いろいろフォルダの曲リスト
        this.iroiroBasePath = '/music/いろいろ';
        
        // 音楽ライブラリ
        this.musicBasePath = '/music';
        this.musicLibrary = {};
        this.categories = [];
        this.currentCategory = null;
        
        // ムード→カテゴリマッピング
        this.moodToCategory = {
            'happy': ['03エモーション', '雰囲気', 'バラエティ'],
            'sad': ['感情', 'あんにゅい', 'ドラマティック'],
            'calm': ['01ネイチャー', '雰囲気', 'そらキレイ'],
            'energetic': ['02ループBGM', 'スタイリッシュ', 'バラエティ'],
            'romantic': ['ろまんす', 'ドラマティック', '情景'],
            'mysterious': ['サスペンス', '闘', '雰囲気'],
            'angry': ['感情', 'ドラマティック', '03エモーション'],
            'anxious': ['サスペンス', '感情', '雰囲気'],
            'hopeful': ['雰囲気', 'ドラマティック', '03エモーション'],
            'nostalgic': ['民芸レトロ', '情景', 'あんにゅい'],
            'playful': ['08コミカル', 'バラエティ', '03エモーション'],
            'serious': ['ニュース', '06ビジネス', 'くーる'],
            'exciting': ['07イベント', 'バラエティ', '02ループBGM'],
            'relaxed': ['01ネイチャー', 'そらキレイ', '雰囲気'],
            'thinking': ['雰囲気', '06ビジネス', 'くーる'],
            'surprised': ['03エモーション', '04ファンファーレカウントダウン', 'バラエティ'],
            'neutral': ['02ループBGM', '雰囲気', '01ネイチャー']
        };
        
        // フェード設定
        this.fadeSettings = {
            duration: 2000,
            steps: 40,
            defaultVolume: 0.3
        };
        
        this.init();
    }
    
    async init() {
        this.createAudioElement();
        this.createPanel();
        await this.scanMusicLibrary();
        await this.loadIroiroTracks();  // v2.4: いろいろフォルダの曲をロード
        this.setupEventListeners();
        this.setupDOMConversationMonitor();  // v2.2: DOM監視方式に変更
        this.setupMultiCharLogMonitor();      // v2.3: マルチキャラ会話ログ監視
        this.setupMultiCharEventListeners();  // v2.3: マルチキャライベント監視
        this.loadSettings();
        console.log('✅ ローカル音楽BGMパネル v2.4 初期化完了');
    }
    
    // ========================================
    // v2.3: マルチキャラ会話ログ監視（#mc-conversation-log）
    // マルチキャラ会話UIの会話ログから分析
    // ========================================
    
    setupMultiCharLogMonitor() {
        console.log('🎵 BGM: マルチキャラ会話ログ監視を開始（#mc-conversation-log）');
        
        // 2秒ごとに#mc-conversation-logをチェック
        setInterval(() => {
            this.checkMultiCharLogDOM();
        }, 2000);
    }
    
    checkMultiCharLogDOM() {
        if (!this.autoSelectEnabled) {
            return;
        }
        
        // #mc-conversation-log DOM要素を取得
        const mcLogEl = document.getElementById('mc-conversation-log');
        if (!mcLogEl) {
            return; // マルチキャラパネルがない場合
        }
        
        // 全てのログエントリを取得（.mc-log-entry）
        const logEntries = mcLogEl.querySelectorAll('.mc-log-entry');
        const currentCount = logEntries.length;
        
        // 新しいログがあるかチェック
        if (currentCount > this.lastCheckedMCLogCount) {
            console.log(`🎵 マルチキャラ新ログ検出: ${this.lastCheckedMCLogCount} → ${currentCount}`);
            
            // 新しいログだけ処理
            for (let i = this.lastCheckedMCLogCount; i < currentCount; i++) {
                const entry = logEntries[i];
                
                // キャラクター名とテキストを取得
                const nameEl = entry.querySelector('.mc-log-name');
                const textEl = entry.querySelector('.mc-log-text');
                
                const charName = nameEl ? nameEl.textContent.trim().replace(':', '') : 'Unknown';
                const text = textEl ? textEl.textContent.trim() : '';
                
                // ユニークIDを生成
                const msgId = `mc_bgm_${i}_${charName}_${text.substring(0, 20)}`;
                
                // 既に処理済みならスキップ
                if (this.lastProcessedMCMessages.has(msgId)) {
                    continue;
                }
                this.lastProcessedMCMessages.add(msgId);
                
                // メッセージが空でなければ分析
                if (text.length > 0) {
                    console.log(`🎵 マルチキャラログ分析 [${charName}]: ${text.substring(0, 50)}...`);
                    this.analyzeAndSelectMusic(text, charName);
                }
            }
            
            this.lastCheckedMCLogCount = currentCount;
        }
        
        // 処理済みリストが大きくなりすぎないように制限
        if (this.lastProcessedMCMessages.size > 100) {
            const arr = Array.from(this.lastProcessedMCMessages);
            this.lastProcessedMCMessages = new Set(arr.slice(-50));
        }
    }
    
    // ========================================
    // v2.3: マルチキャライベントリスナー
    // multichar:turnEnd イベントを監視
    // ========================================
    
    setupMultiCharEventListeners() {
        console.log('🎵 BGM: マルチキャライベント監視を開始');
        
        // multichar:turnEnd イベントを監視
        window.addEventListener('multichar:turnEnd', (e) => {
            if (!this.autoSelectEnabled) return;
            
            const { speaker, text, emotion } = e.detail;
            if (speaker && text) {
                console.log(`🎵 マルチキャライベント受信 [${speaker.name}]: ${text.substring(0, 50)}...`);
                
                // 感情があればそれも考慮
                if (emotion) {
                    const emotionMood = this.emotionToMood(emotion);
                    if (emotionMood) {
                        console.log(`🎵 感情からムード推測: ${emotion} → ${emotionMood}`);
                        this.selectByMood(emotionMood, this.alwaysChangeTrack);
                        return;
                    }
                }
                
                // テキストから分析
                this.analyzeAndSelectMusic(text, speaker.name);
            }
        });
        
        // 会話開始イベント
        window.addEventListener('multichar:conversationStart', (e) => {
            console.log('🎵 マルチキャラ会話開始検出');
            // ログカウントをリセット
            this.lastCheckedMCLogCount = 0;
            this.lastProcessedMCMessages.clear();
        });
        
        // 会話終了イベント
        window.addEventListener('multichar:conversationEnd', () => {
            console.log('🎵 マルチキャラ会話終了検出');
        });
    }
    
    // v2.3: 感情からムードへの変換
    emotionToMood(emotion) {
        const emotionMap = {
            'happy': 'happy',
            'joy': 'happy',
            '嬉しい': 'happy',
            '楽しい': 'happy',
            'sad': 'sad',
            'sorrow': 'sad',
            '悲しい': 'sad',
            '寂しい': 'sad',
            'angry': 'angry',
            '怒り': 'angry',
            'surprised': 'surprised',
            '驚き': 'surprised',
            'relaxed': 'calm',
            '穏やか': 'calm',
            'リラックス': 'calm',
            'neutral': 'neutral',
            '通常': 'neutral',
            'fun': 'playful',
            '面白い': 'playful',
            'love': 'romantic',
            '恋': 'romantic',
            'fear': 'anxious',
            '不安': 'anxious',
            'think': 'thinking',
            '考える': 'thinking'
        };
        
        const lowerEmotion = emotion.toLowerCase();
        return emotionMap[lowerEmotion] || emotionMap[emotion] || null;
    }
    
    // ========================================
    // v2.2: DOM監視（#chat-messages）
    // AI背景生成と同じ方式、全AIモード対応
    // ChatGPT, Gemini, Grok Voice, SBV2 全て対応
    // ========================================
    
    setupDOMConversationMonitor() {
        console.log('🎵 BGM: DOM会話監視を開始（#chat-messages）');
        
        // 2秒ごとに#chat-messagesをチェック
        setInterval(() => {
            this.checkChatMessagesDOM();
        }, 2000);
    }
    
    checkChatMessagesDOM() {
        if (!this.autoSelectEnabled) {
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
            console.log(`🎵 新しいメッセージ検出: ${this.lastCheckedMessageCount} → ${currentCount}`);
            
            // 新しいメッセージだけ処理
            for (let i = this.lastCheckedMessageCount; i < currentCount; i++) {
                const msgEl = messageElements[i];
                
                // ユニークIDを生成（インデックス + テキストの一部）
                const textEl = msgEl.querySelector('.message-text');
                const text = textEl ? textEl.textContent.trim() : '';
                const msgId = `bgm_msg_${i}_${text.substring(0, 20)}`;
                
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
                    
                    // 人間側のみ分析モードの場合
                    if (this.analyzeHumanOnly && !isUser) {
                        console.log(`🎵 AIの発言はスキップ（人間側のみ分析モード）`);
                        continue;
                    }
                    
                    console.log(`🎵 メッセージ分析 (${source}): ${text.substring(0, 50)}...`);
                    this.analyzeAndSelectMusic(text);
                }
            }
            
            this.lastCheckedMessageCount = currentCount;
        }
        
        // 処理済みリストが大きくなりすぎないように制限
        if (this.lastProcessedMessages.size > 100) {
            const arr = Array.from(this.lastProcessedMessages);
            this.lastProcessedMessages = new Set(arr.slice(-50));
        }
    }
    
    // v2.0: テキストからムードを分析してBGM選択
    // v2.3: キャラクター名も受け取るように拡張
    // v2.4: 文脈から読み取りモード対応
    async analyzeAndSelectMusic(text, charName = null) {
        // v2.4: 文脈から読み取りモードが有効な場合、AIで曲を選択
        if (this.contextReadModeEnabled) {
            await this.selectFromIroiroByContext(text, charName);
            return;
        }
        
        const mood = this.detectMoodFromText(text);
        
        if (mood) {
            // 毎回変化モードの場合、または前回と違うムードの場合
            if (this.alwaysChangeTrack || mood !== this.lastDetectedMood) {
                const source = charName ? `[${charName}]` : '';
                console.log(`🎵 ムード検出${source}: ${mood} (毎回変化: ${this.alwaysChangeTrack})`);
                await this.selectByMood(mood, this.alwaysChangeTrack);
            }
        }
    }
    
    // v2.0: テキストからムードを検出
    detectMoodFromText(text) {
        const patterns = [
            { mood: 'happy', regex: /嬉し|楽し|幸せ|やった|わーい|最高|すごい|ありがとう|よかった|！！/i },
            { mood: 'sad', regex: /悲し|辛い|寂し|切な|泣|さよなら|別れ|もう会えない/i },
            { mood: 'angry', regex: /怒|むかつ|イライラ|許さない|ふざけるな|💢|くそ/i },
            { mood: 'anxious', regex: /怖|恐|不安|やばい|ヤバ|心配|どうしよう/i },
            { mood: 'surprised', regex: /え[ぇえ]|まじ|本当|うそ|びっくり|！\？|\?!/i },
            { mood: 'romantic', regex: /好き|愛して|ドキドキ|照れ|💕|❤|大好き|告白/i },
            { mood: 'calm', regex: /穏やか|静か|落ち着|リラックス|のんびり|ゆっくり/i },
            { mood: 'energetic', regex: /元気|頑張|やるぞ|行くぞ|燃え|テンション/i },
            { mood: 'mysterious', regex: /謎|不思議|怪しい|闘|秘密|神秘/i },
            { mood: 'nostalgic', regex: /思い出|昔|あの時|懐かし|過去/i },
            { mood: 'playful', regex: /笑|あはは|ウケる|www|ｗｗ|面白/i },
            { mood: 'serious', regex: /真剣|大事|重要|真面目|本気/i },
            { mood: 'hopeful', regex: /希望|夢|未来|きっと|信じ/i },
            { mood: 'relaxed', regex: /おはよう|朝|目覚め|夜|おやすみ|眠/i },
            { mood: 'thinking', regex: /うーん|考え|なぜ|どうして|どうしよう/i },
        ];
        
        for (const { mood, regex } of patterns) {
            if (regex.test(text)) {
                return mood;
            }
        }
        
        // 質問文
        if (/？|\?/.test(text)) {
            return 'thinking';
        }
        
        // 毎回変化モードの場合はneutralを返す（何かしら変化させるため）
        if (this.alwaysChangeTrack) {
            return 'neutral';
        }
        
        return null;
    }
    
    createAudioElement() {
        this.audioElement = new Audio();
        this.audioElement.loop = true;
        this.audioElement.volume = this.fadeSettings.defaultVolume;
        
        this.audioElement.addEventListener('timeupdate', () => this.updateProgressFromAudio());
        this.audioElement.addEventListener('ended', () => this.onAudioEnded());
        this.audioElement.addEventListener('loadedmetadata', () => {
            const duration = Math.floor(this.audioElement.duration);
            this.updateStatus(`準備完了 (${Math.floor(duration/60)}:${String(duration%60).padStart(2,'0')})`);
        });
        this.audioElement.addEventListener('error', (e) => {
            console.error('Audio error:', e);
            this.updateStatus('⚠️ 読み込みエラー');
        });
    }
    
    async scanMusicLibrary() {
        try {
            const response = await fetch('/api/music-library');
            if (response.ok) {
                const data = await response.json();
                this.musicLibrary = data.library || {};
                this.categories = data.categories || [];
                console.log('🎵 音楽ライブラリ読み込み完了:', this.categories.length, 'カテゴリ');
                this.updateCategoryList();
                return;
            }
        } catch (e) {
            console.log('🎵 API利用不可、ハードコードリストを使用');
        }
        
        this.categories = [
            '01オープニングBGM', '01ネイチャー', '02メトロポリス', '02ループBGM',
            '03エモーション', '03タイトルコール', '04アニマル', '04ファンファーレカウントダウン',
            '05シーズン', '05情報番組ME', '06アテンションME', '06ビジネス',
            '07イベント', '07フレームSE', '08コミカル', '08シークエンスSE',
            '09モーションSE', '09ワールド', '10トーン', '10ファンクションSE',
            '11イメージSE', '11プラスSE', '12ムービー', '12リアルSE',
            'RU-PU', 'あんにゅい', 'おーけすとら', 'くーる', 'そらキレイ',
            'ろまんす', 'サスペンス', 'シーン', 'スタイリッシュ', 'ダサい曲',
            'ドラマティック', 'ニュース', 'バラエティ', '場面', '場面転換',
            '情景', '感情', '民芸レトロ', '海川', '炎', '生っぽい', '行事', '闇', '雰囲気'
        ];
        this.updateCategoryList();
    }
    
    createPanel() {
        const panel = document.createElement('div');
        panel.id = this.panelId;
        panel.innerHTML = `
            <div class="lm-panel-header">
                <span class="lm-panel-title">🎵 ローカルBGM v2.4</span>
                <div class="lm-panel-controls">
                    <button class="lm-panel-btn minimize-btn" title="最小化">−</button>
                    <button class="lm-panel-btn close-btn" title="閉じる">×</button>
                </div>
            </div>
            <div class="lm-panel-content">
                <!-- 🎬 クイックスタート（目立つ開始ボタン） -->
                <div class="lm-section lm-quick-start-section">
                    <button id="lm-quick-start-btn" class="lm-quick-start-btn">
                        <span class="lm-qs-icon">🎵</span>
                        <span class="lm-qs-text">BGMを開始する</span>
                    </button>
                    <div class="lm-quick-start-hint">クリックでランダムなBGMが再生されます</div>
                </div>
                
                <!-- 現在のムード/曲表示 -->
                <div class="lm-section">
                    <div class="lm-section-label">🎭 検出ムード</div>
                    <div class="lm-mood-display">
                        <span class="lm-mood-emoji">😊</span>
                        <span class="lm-mood-text">待機中...</span>
                    </div>
                </div>
                
                <!-- プレイヤー -->
                <div class="lm-section">
                    <div class="lm-section-label">🎧 再生中</div>
                    <div class="lm-now-playing">
                        <span class="lm-track-name">曲を選択してください</span>
                    </div>
                    <div class="lm-player-controls">
                        <button class="lm-player-btn" id="lm-play-btn">
                            <span class="lm-play-icon">▶</span>
                        </button>
                        <button class="lm-player-btn" id="lm-stop-btn">
                            <span>■</span>
                        </button>
                        <button class="lm-player-btn small" id="lm-shuffle-btn" title="シャッフル">
                            <span>🔀</span>
                        </button>
                        <div class="lm-volume-control">
                            <span>🔊</span>
                            <input type="range" id="lm-volume" min="0" max="100" value="30">
                        </div>
                    </div>
                    <div class="lm-progress-container">
                        <div class="lm-progress-bar">
                            <div class="lm-progress-fill"></div>
                        </div>
                        <span class="lm-status-text">準備完了</span>
                    </div>
                </div>
                
                <!-- v2.0: 自動選曲設定 -->
                <div class="lm-section">
                    <div class="lm-section-label">🤖 自動BGM選曲</div>
                    
                    <!-- メイントグル -->
                    <div class="lm-auto-toggle">
                        <label class="lm-toggle-switch">
                            <input type="checkbox" id="lm-auto-select">
                            <span class="lm-toggle-slider"></span>
                        </label>
                        <span class="lm-toggle-label">会話からBGM自動選曲</span>
                    </div>
                    
                    <!-- v2.3: マルチキャラログ優先 -->
                    <div class="lm-auto-toggle" style="margin-top: 8px; padding-left: 10px; border-left: 2px solid #9c27b0;">
                        <label class="lm-toggle-switch">
                            <input type="checkbox" id="lm-use-multichar" checked>
                            <span class="lm-toggle-slider lm-slider-purple"></span>
                        </label>
                        <span class="lm-toggle-label">🎭 マルチキャラログから分析</span>
                    </div>
                    
                    <!-- v2.4: 文脈から読み取りモード（いろいろフォルダ） -->
                    <div class="lm-auto-toggle" style="margin-top: 8px; padding-left: 10px; border-left: 2px solid #ff6b35;">
                        <label class="lm-toggle-switch">
                            <input type="checkbox" id="lm-context-read-mode">
                            <span class="lm-toggle-slider lm-slider-orange"></span>
                        </label>
                        <span class="lm-toggle-label">🎯 文脈から読み取りモード（いろいろ優先）</span>
                    </div>
                    <div id="lm-context-read-info" style="margin-top: 4px; padding-left: 10px; font-size: 9px; color: #888; display: none;">
                        💡 AIが会話内容から最適な曲名を推測して選曲します
                    </div>
                    
                    <!-- v2.0: 人間側のみ分析 -->
                    <div class="lm-auto-toggle" style="margin-top: 8px; padding-left: 10px; border-left: 2px solid #11998e;">
                        <label class="lm-toggle-switch">
                            <input type="checkbox" id="lm-analyze-human" checked>
                            <span class="lm-toggle-slider"></span>
                        </label>
                        <span class="lm-toggle-label">👤 人間の発言のみ分析（通常チャット）</span>
                    </div>
                    
                    <!-- v2.0: 毎回変化モード -->
                    <div class="lm-auto-toggle" style="margin-top: 8px; padding-left: 10px; border-left: 2px solid #f093fb;">
                        <label class="lm-toggle-switch">
                            <input type="checkbox" id="lm-always-change">
                            <span class="lm-toggle-slider lm-slider-pink"></span>
                        </label>
                        <span class="lm-toggle-label">🔄 毎回必ず曲を変える</span>
                    </div>
                    
                    <div class="lm-mode-info" id="lm-mode-info">
                        モード: 通常
                    </div>
                </div>
                
                <!-- カテゴリ選択 -->
                <div class="lm-section">
                    <div class="lm-section-label">📁 カテゴリ</div>
                    <div class="lm-category-filter">
                        <input type="text" id="lm-category-search" placeholder="カテゴリを検索...">
                    </div>
                    <div class="lm-category-list" id="lm-category-list">
                    </div>
                </div>
                
                <!-- 曲リスト -->
                <div class="lm-section">
                    <div class="lm-section-label">🎵 曲一覧 <span id="lm-track-count">(0)</span></div>
                    <div class="lm-track-list" id="lm-track-list">
                        <div class="lm-track-placeholder">カテゴリを選択してください</div>
                    </div>
                </div>
                
                <!-- クイックムード選択 -->
                <div class="lm-section">
                    <div class="lm-section-label">⚡ クイックムード</div>
                    <div class="lm-quick-moods">
                        <button class="lm-mood-btn" data-mood="happy">😊 楽しい</button>
                        <button class="lm-mood-btn" data-mood="calm">😌 穏やか</button>
                        <button class="lm-mood-btn" data-mood="sad">😢 悲しい</button>
                        <button class="lm-mood-btn" data-mood="energetic">⚡ 元気</button>
                        <button class="lm-mood-btn" data-mood="romantic">💕 ロマンス</button>
                        <button class="lm-mood-btn" data-mood="mysterious">🌙 神秘的</button>
                        <button class="lm-mood-btn" data-mood="serious">📋 真剣</button>
                        <button class="lm-mood-btn" data-mood="playful">🎪 コミカル</button>
                    </div>
                </div>
            </div>
            <div class="lm-panel-footer">
                <span class="lm-footer-drag-handle">≡ ドラッグで移動 ≡</span>
            </div>
        `;
        
        this.addStyles();
        document.body.appendChild(panel);
        this.panel = panel;
        this.setInitialPosition();
    }
    
    addStyles() {
        if (document.getElementById('local-music-panel-styles')) return;
        
        const style = document.createElement('style');
        style.id = 'local-music-panel-styles';
        style.textContent = `
            #local-music-panel {
                position: fixed;
                top: 100px;
                left: 50%;
                transform: translateX(-50%);
                width: 360px;
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
            
            #local-music-panel.visible {
                display: block;
                animation: lmPanelSlideIn 0.3s ease;
            }
            
            @keyframes lmPanelSlideIn {
                from { opacity: 0; transform: translateX(-50%) translateY(-20px); }
                to { opacity: 1; transform: translateX(-50%) translateY(0); }
            }
            
            #local-music-panel.minimized .lm-panel-content {
                display: none;
            }
            
            .lm-panel-header {
                background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%);
                color: white;
                padding: 10px 12px;
                display: flex;
                justify-content: space-between;
                align-items: center;
                cursor: move;
                user-select: none;
            }
            
            .lm-panel-title {
                font-weight: bold;
                font-size: 13px;
            }
            
            .lm-panel-controls {
                display: flex;
                gap: 6px;
            }
            
            .lm-panel-btn {
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
            
            .lm-panel-btn:hover {
                background: rgba(255, 255, 255, 0.3);
            }
            
            .lm-panel-content {
                padding: 12px;
                max-height: 550px;
                overflow-y: auto;
            }
            
            .lm-section {
                margin-bottom: 12px;
                padding-bottom: 10px;
                border-bottom: 1px solid #eee;
            }
            
            .lm-section:last-child {
                border-bottom: none;
            }
            
            .lm-section-label {
                font-weight: bold;
                color: #333;
                margin-bottom: 8px;
                font-size: 11px;
            }
            
            .lm-mood-display {
                display: flex;
                align-items: center;
                gap: 10px;
                padding: 8px 12px;
                background: linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%);
                border-radius: 8px;
            }
            
            .lm-mood-emoji {
                font-size: 24px;
            }
            
            .lm-mood-text {
                font-size: 13px;
                font-weight: bold;
                color: #2e7d32;
            }
            
            .lm-now-playing {
                background: #f5f5f5;
                padding: 8px 12px;
                border-radius: 6px;
                margin-bottom: 8px;
            }
            
            .lm-track-name {
                font-size: 11px;
                color: #666;
                display: block;
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
            }
            
            .lm-track-name.playing {
                color: #11998e;
                font-weight: bold;
            }
            
            .lm-player-controls {
                display: flex;
                align-items: center;
                gap: 8px;
                margin-bottom: 8px;
            }
            
            .lm-player-btn {
                width: 36px;
                height: 36px;
                border-radius: 50%;
                border: none;
                background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%);
                color: white;
                cursor: pointer;
                font-size: 12px;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: all 0.2s;
            }
            
            .lm-player-btn.small {
                width: 30px;
                height: 30px;
                font-size: 11px;
            }
            
            .lm-player-btn:hover {
                transform: scale(1.1);
                box-shadow: 0 4px 12px rgba(17, 153, 142, 0.4);
            }
            
            .lm-player-btn.playing {
                background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
            }
            
            .lm-volume-control {
                display: flex;
                align-items: center;
                gap: 4px;
                flex: 1;
            }
            
            .lm-volume-control input[type="range"] {
                flex: 1;
                height: 4px;
                -webkit-appearance: none;
                background: #ddd;
                border-radius: 2px;
            }
            
            .lm-volume-control input[type="range"]::-webkit-slider-thumb {
                -webkit-appearance: none;
                width: 12px;
                height: 12px;
                background: #11998e;
                border-radius: 50%;
                cursor: pointer;
            }
            
            .lm-progress-container {
                display: flex;
                align-items: center;
                gap: 8px;
            }
            
            .lm-progress-bar {
                flex: 1;
                height: 4px;
                background: #eee;
                border-radius: 2px;
                overflow: hidden;
                cursor: pointer;
            }
            
            .lm-progress-fill {
                height: 100%;
                width: 0%;
                background: linear-gradient(90deg, #11998e, #38ef7d);
                transition: width 0.1s;
            }
            
            .lm-status-text {
                font-size: 9px;
                color: #999;
                min-width: 60px;
                text-align: right;
            }
            
            .lm-auto-toggle {
                display: flex;
                align-items: center;
                gap: 10px;
            }
            
            .lm-toggle-switch {
                position: relative;
                width: 40px;
                height: 20px;
            }
            
            .lm-toggle-switch input {
                opacity: 0;
                width: 0;
                height: 0;
            }
            
            .lm-toggle-slider {
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
            
            .lm-toggle-slider:before {
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
            
            .lm-toggle-switch input:checked + .lm-toggle-slider {
                background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%);
            }
            
            .lm-toggle-switch input:checked + .lm-toggle-slider.lm-slider-pink {
                background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
            }
            
            .lm-toggle-switch input:checked + .lm-toggle-slider.lm-slider-purple {
                background: linear-gradient(135deg, #9c27b0 0%, #e040fb 100%);
            }
            
            .lm-toggle-switch input:checked + .lm-toggle-slider.lm-slider-orange {
                background: linear-gradient(135deg, #ff6b35 0%, #f7931e 100%);
            }
            
            .lm-toggle-switch input:checked + .lm-toggle-slider:before {
                transform: translateX(20px);
            }
            
            .lm-toggle-label {
                font-size: 10px;
                color: #666;
            }
            
            /* v2.0: モード情報表示 */
            .lm-mode-info {
                margin-top: 10px;
                padding: 6px 10px;
                background: #f8f9fa;
                border-radius: 6px;
                font-size: 10px;
                color: #666;
                text-align: center;
            }
            
            .lm-mode-info.active {
                background: linear-gradient(135deg, rgba(17, 153, 142, 0.1) 0%, rgba(56, 239, 125, 0.1) 100%);
                color: #11998e;
                font-weight: bold;
            }
            
            .lm-mode-info.always-change {
                background: linear-gradient(135deg, rgba(240, 147, 251, 0.1) 0%, rgba(245, 87, 108, 0.1) 100%);
                color: #f5576c;
            }
            
            .lm-mode-info.multichar {
                background: linear-gradient(135deg, rgba(156, 39, 176, 0.1) 0%, rgba(224, 64, 251, 0.1) 100%);
                color: #9c27b0;
            }
            
            .lm-mode-info.context-read {
                background: linear-gradient(135deg, rgba(255, 107, 53, 0.1) 0%, rgba(247, 147, 30, 0.1) 100%);
                color: #ff6b35;
            }
            
            .lm-category-filter {
                margin-bottom: 8px;
            }
            
            .lm-category-filter input {
                width: 100%;
                padding: 6px 10px;
                border: 1px solid #ddd;
                border-radius: 6px;
                font-size: 11px;
            }
            
            .lm-category-filter input:focus {
                outline: none;
                border-color: #11998e;
            }
            
            .lm-category-list {
                max-height: 120px;
                overflow-y: auto;
                display: flex;
                flex-wrap: wrap;
                gap: 4px;
            }
            
            .lm-category-item {
                padding: 4px 10px;
                background: #f0f0f0;
                border: 1px solid #ddd;
                border-radius: 12px;
                cursor: pointer;
                font-size: 10px;
                transition: all 0.2s;
            }
            
            .lm-category-item:hover {
                background: #e0f2f1;
                border-color: #11998e;
            }
            
            .lm-category-item.active {
                background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%);
                color: white;
                border-color: transparent;
            }
            
            .lm-track-list {
                max-height: 150px;
                overflow-y: auto;
            }
            
            .lm-track-placeholder {
                color: #999;
                font-size: 11px;
                text-align: center;
                padding: 20px;
            }
            
            .lm-track-item {
                display: flex;
                align-items: center;
                gap: 8px;
                padding: 6px 8px;
                background: #f8f9fa;
                border-radius: 6px;
                margin-bottom: 4px;
                cursor: pointer;
                transition: all 0.2s;
            }
            
            .lm-track-item:hover {
                background: #e8f5e9;
            }
            
            .lm-track-item.active {
                background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%);
                color: white;
            }
            
            .lm-track-item .track-icon {
                font-size: 12px;
            }
            
            .lm-track-item .track-name {
                flex: 1;
                font-size: 10px;
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
            }
            
            .lm-quick-moods {
                display: flex;
                flex-wrap: wrap;
                gap: 4px;
            }
            
            .lm-mood-btn {
                padding: 4px 10px;
                background: #f5f5f5;
                border: 1px solid #ddd;
                border-radius: 12px;
                cursor: pointer;
                font-size: 10px;
                transition: all 0.2s;
            }
            
            .lm-mood-btn:hover {
                background: #e0f2f1;
                border-color: #11998e;
            }
            
            .lm-mood-btn.active {
                background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%);
                color: white;
                border-color: transparent;
            }
            
            #local-music-toggle-btn {
                position: fixed;
                bottom: 80px;
                left: 10px;
                width: 50px;
                height: 50px;
                border-radius: 50%;
                background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%);
                color: white;
                border: none;
                cursor: pointer;
                font-size: 24px;
                box-shadow: 0 4px 12px rgba(17, 153, 142, 0.4);
                z-index: 9999;
                transition: all 0.2s;
                display: flex;
                align-items: center;
                justify-content: center;
            }
            
            #local-music-toggle-btn:hover {
                transform: scale(1.1);
            }
            
            #local-music-toggle-btn.active {
                background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
            }
            
            #local-music-toggle-btn.playing {
                animation: lmPulse 2s infinite;
            }
            
            /* フッター（下部ドラッグハンドル） */
            .lm-panel-footer {
                background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%);
                color: white;
                padding: 8px 12px;
                text-align: center;
                cursor: move;
                user-select: none;
                border-top: 1px solid rgba(255, 255, 255, 0.2);
            }
            
            .lm-footer-drag-handle {
                font-size: 11px;
                opacity: 0.9;
                letter-spacing: 1px;
            }
            
            .lm-panel-footer:hover {
                background: linear-gradient(135deg, #0f8a80 0%, #30d86d 100%);
            }
            
            .lm-panel-footer:active {
                background: linear-gradient(135deg, #0d7b72 0%, #28c85f 100%);
            }
            
            @keyframes lmPulse {
                0%, 100% { box-shadow: 0 4px 12px rgba(17, 153, 142, 0.4); }
                50% { box-shadow: 0 4px 20px rgba(17, 153, 142, 0.8); }
            }
            
            /* v2.1: クイックスタートボタン */
            .lm-quick-start-section {
                text-align: center;
                padding: 15px 10px !important;
                background: linear-gradient(135deg, rgba(17, 153, 142, 0.05) 0%, rgba(56, 239, 125, 0.05) 100%);
                border-radius: 10px;
                margin-bottom: 15px !important;
            }
            
            .lm-quick-start-btn {
                width: 100%;
                padding: 16px 20px;
                background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%);
                border: none;
                border-radius: 12px;
                color: white;
                cursor: pointer;
                font-size: 16px;
                font-weight: bold;
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 10px;
                transition: all 0.3s;
                box-shadow: 0 4px 15px rgba(17, 153, 142, 0.4);
            }
            
            .lm-quick-start-btn:hover {
                transform: translateY(-2px);
                box-shadow: 0 6px 20px rgba(17, 153, 142, 0.5);
            }
            
            .lm-quick-start-btn:active {
                transform: translateY(0);
            }
            
            .lm-quick-start-btn.playing {
                background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
                box-shadow: 0 4px 15px rgba(240, 147, 251, 0.4);
            }
            
            .lm-quick-start-btn.playing:hover {
                box-shadow: 0 6px 20px rgba(240, 147, 251, 0.5);
            }
            
            .lm-qs-icon {
                font-size: 24px;
                animation: lmQsIconBounce 2s infinite;
            }
            
            .lm-quick-start-btn.playing .lm-qs-icon {
                animation: lmQsIconPulse 1s infinite;
            }
            
            @keyframes lmQsIconBounce {
                0%, 100% { transform: scale(1); }
                50% { transform: scale(1.1); }
            }
            
            @keyframes lmQsIconPulse {
                0%, 100% { transform: scale(1); opacity: 1; }
                50% { transform: scale(1.2); opacity: 0.8; }
            }
            
            .lm-qs-text {
                font-size: 14px;
            }
            
            .lm-quick-start-hint {
                margin-top: 8px;
                font-size: 10px;
                color: #888;
            }
        `;
        
        document.head.appendChild(style);
    }
    
    setInitialPosition() {
        const saved = localStorage.getItem('localMusicPanelPosition');
        if (saved) {
            const pos = JSON.parse(saved);
            this.panel.style.left = pos.left + 'px';
            this.panel.style.top = pos.top + 'px';
            this.panel.style.transform = 'none';
        }
    }
    
    setupEventListeners() {
        // ヘッダーのドラッグ
        const header = this.panel.querySelector('.lm-panel-header');
        header.addEventListener('mousedown', (e) => this.startDrag(e));
        
        // フッターのドラッグ（下部からも掴めるように）
        const footer = this.panel.querySelector('.lm-panel-footer');
        if (footer) {
            footer.addEventListener('mousedown', (e) => this.startDrag(e));
        }
        
        document.addEventListener('mousemove', (e) => this.drag(e));
        document.addEventListener('mouseup', () => this.endDrag());
        
        this.panel.querySelector('.close-btn').addEventListener('click', () => this.hide());
        this.panel.querySelector('.minimize-btn').addEventListener('click', () => this.toggleMinimize());
        
        document.getElementById('lm-play-btn').addEventListener('click', () => this.togglePlay());
        document.getElementById('lm-stop-btn').addEventListener('click', () => this.stop());
        document.getElementById('lm-shuffle-btn').addEventListener('click', () => this.shuffleAndPlay());
        
        document.getElementById('lm-volume').addEventListener('input', (e) => {
            this.audioElement.volume = e.target.value / 100;
        });
        
        this.panel.querySelector('.lm-progress-bar').addEventListener('click', (e) => {
            if (this.audioElement.duration) {
                const rect = e.target.getBoundingClientRect();
                const percent = (e.clientX - rect.left) / rect.width;
                this.audioElement.currentTime = percent * this.audioElement.duration;
            }
        });
        
        // 自動選曲トグル
        document.getElementById('lm-auto-select').addEventListener('change', (e) => {
            this.autoSelectEnabled = e.target.checked;
            this.saveSettings();
            this.updateModeInfo();
            if (this.autoSelectEnabled) {
                this.showNotification('🤖 自動BGM選曲が有効になりました');
            }
        });
        
        // v2.3: マルチキャラログ優先トグル
        document.getElementById('lm-use-multichar').addEventListener('change', (e) => {
            this.useMultiCharLog = e.target.checked;
            this.saveSettings();
            this.updateModeInfo();
            if (this.useMultiCharLog) {
                this.showNotification('🎭 マルチキャラログから分析します');
            }
        });
        
        // v2.4: 文脈から読み取りモード
        document.getElementById('lm-context-read-mode').addEventListener('change', (e) => {
            this.contextReadModeEnabled = e.target.checked;
            this.saveSettings();
            this.updateModeInfo();
            const infoEl = document.getElementById('lm-context-read-info');
            if (infoEl) infoEl.style.display = this.contextReadModeEnabled ? 'block' : 'none';
            if (this.contextReadModeEnabled) {
                this.showNotification('🎯 文脈から読み取りモードON！いろいろフォルダから選曲します');
            }
        });
        
        // v2.0: 人間側のみ分析トグル
        document.getElementById('lm-analyze-human').addEventListener('change', (e) => {
            this.analyzeHumanOnly = e.target.checked;
            this.saveSettings();
            this.updateModeInfo();
        });
        
        // v2.0: 毎回変化モードトグル
        document.getElementById('lm-always-change').addEventListener('change', (e) => {
            this.alwaysChangeTrack = e.target.checked;
            this.saveSettings();
            this.updateModeInfo();
            if (this.alwaysChangeTrack) {
                this.showNotification('🔄 毎回曲が変わるモードが有効になりました');
            }
        });
        
        document.getElementById('lm-category-search').addEventListener('input', (e) => {
            this.filterCategories(e.target.value);
        });
        
        this.panel.querySelectorAll('.lm-mood-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const mood = btn.dataset.mood;
                this.selectByMood(mood, true); // 手動選択は常に曲を変える
            });
        });
        
        // v2.1: クイックスタートボタン
        document.getElementById('lm-quick-start-btn').addEventListener('click', () => this.quickStart());
        
        this.createToggleButton();
    }
    
    // v2.0: モード情報表示更新
    // v2.3: マルチキャラログ対応
    // v2.4: 文脈から読み取りモード対応
    updateModeInfo() {
        const infoEl = document.getElementById('lm-mode-info');
        if (!infoEl) return;
        
        infoEl.classList.remove('active', 'always-change', 'multichar', 'context-read');
        
        if (!this.autoSelectEnabled) {
            infoEl.textContent = 'モード: 手動選曲';
        } else if (this.contextReadModeEnabled) {
            // v2.4: 文脈から読み取りモード（最優先）
            infoEl.textContent = '🎯 文脈から読み取りモード（いろいろフォルダ）';
            infoEl.classList.add('active', 'context-read');
        } else if (this.useMultiCharLog) {
            // マルチキャラモード
            if (this.alwaysChangeTrack) {
                infoEl.textContent = '🎭🔄 マルチキャラ+毎回変化';
                infoEl.classList.add('active', 'always-change');
            } else {
                infoEl.textContent = '🎭 マルチキャラ会話ログから分析';
                infoEl.classList.add('active', 'multichar');
            }
        } else if (this.alwaysChangeTrack) {
            infoEl.textContent = '🔄 毎回変化モード（人間' + (this.analyzeHumanOnly ? 'のみ' : '+AI') + '）';
            infoEl.classList.add('active', 'always-change');
        } else {
            infoEl.textContent = '👤 自動選曲（' + (this.analyzeHumanOnly ? '人間のみ分析' : '全発言分析') + '）';
            infoEl.classList.add('active');
        }
    }
    
    createToggleButton() {
        const btn = document.createElement('button');
        btn.id = 'local-music-toggle-btn';
        btn.innerHTML = '🎵';
        btn.title = 'ローカルBGMパネル';
        btn.addEventListener('click', () => this.toggle());
        document.body.appendChild(btn);
        this.toggleBtn = btn;
    }
    
    startDrag(e) {
        if (e.target.classList.contains('lm-panel-btn')) return;
        this.isDragging = true;
        const rect = this.panel.getBoundingClientRect();
        this.dragOffset.x = e.clientX - rect.left;
        this.dragOffset.y = e.clientY - rect.top;
        this.panel.style.transform = 'none';
    }
    
    drag(e) {
        if (!this.isDragging) return;
        this.panel.style.left = (e.clientX - this.dragOffset.x) + 'px';
        this.panel.style.top = (e.clientY - this.dragOffset.y) + 'px';
    }
    
    endDrag() {
        if (this.isDragging) {
            this.isDragging = false;
            localStorage.setItem('localMusicPanelPosition', JSON.stringify({
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
        this.isVisible ? this.hide() : this.show();
    }
    
    toggleMinimize() {
        this.isMinimized = !this.isMinimized;
        this.panel.classList.toggle('minimized', this.isMinimized);
        this.panel.querySelector('.minimize-btn').textContent = this.isMinimized ? '+' : '−';
    }
    
    updateCategoryList() {
        const container = document.getElementById('lm-category-list');
        if (!container) return;
        
        container.innerHTML = this.categories.map(cat => `
            <div class="lm-category-item" data-category="${cat}">${cat}</div>
        `).join('');
        
        container.querySelectorAll('.lm-category-item').forEach(item => {
            item.addEventListener('click', () => {
                this.selectCategory(item.dataset.category);
            });
        });
    }
    
    filterCategories(query) {
        const items = this.panel.querySelectorAll('.lm-category-item');
        const lowerQuery = query.toLowerCase();
        items.forEach(item => {
            const match = item.dataset.category.toLowerCase().includes(lowerQuery);
            item.style.display = match ? '' : 'none';
        });
    }
    
    async selectCategory(category) {
        this.currentCategory = category;
        
        this.panel.querySelectorAll('.lm-category-item').forEach(item => {
            item.classList.toggle('active', item.dataset.category === category);
        });
        
        await this.loadTracksForCategory(category);
    }
    
    async loadTracksForCategory(category) {
        const container = document.getElementById('lm-track-list');
        const countEl = document.getElementById('lm-track-count');
        
        container.innerHTML = '<div class="lm-track-placeholder">読み込み中...</div>';
        
        try {
            const response = await fetch(`/api/music-tracks?category=${encodeURIComponent(category)}`);
            if (response.ok) {
                const data = await response.json();
                this.displayTracks(data.tracks || []);
                return;
            }
        } catch (e) {
            console.log('🎵 API利用不可');
        }
        
        container.innerHTML = '<div class="lm-track-placeholder">サーバーAPIが必要です</div>';
        countEl.textContent = '(0)';
    }
    
    displayTracks(tracks) {
        const container = document.getElementById('lm-track-list');
        const countEl = document.getElementById('lm-track-count');
        
        if (tracks.length === 0) {
            container.innerHTML = '<div class="lm-track-placeholder">曲が見つかりません</div>';
            countEl.textContent = '(0)';
            return;
        }
        
        countEl.textContent = `(${tracks.length})`;
        
        container.innerHTML = tracks.map((track, i) => `
            <div class="lm-track-item" data-index="${i}" data-path="${track.path}">
                <span class="track-icon">🎵</span>
                <span class="track-name">${track.name}</span>
            </div>
        `).join('');
        
        this.currentTracks = tracks;
        
        container.querySelectorAll('.lm-track-item').forEach(item => {
            item.addEventListener('click', () => {
                const index = parseInt(item.dataset.index);
                this.playTrack(this.currentTracks[index]);
            });
        });
    }
    
    // v2.0: 重複を避けてトラック選択
    selectNonRecentTrack(tracks) {
        if (!tracks || tracks.length === 0) return null;
        
        // 最近再生していない曲をフィルタ
        const availableTracks = tracks.filter(t => !this.recentTracks.includes(t.path));
        
        // 全部最近再生した場合は履歴をクリアして全曲から選択
        if (availableTracks.length === 0) {
            this.recentTracks = [];
            return tracks[Math.floor(Math.random() * tracks.length)];
        }
        
        return availableTracks[Math.floor(Math.random() * availableTracks.length)];
    }
    
    async playTrack(track, fadeIn = true) {
        if (!track) return;
        
        if (this.isPlaying && fadeIn) {
            await this.fadeOut();
        }
        
        this.currentTrack = track;
        this.lastPlayedTrackPath = track.path;
        
        // 最近再生した曲リストに追加
        this.recentTracks.push(track.path);
        if (this.recentTracks.length > this.maxRecentTracks) {
            this.recentTracks.shift();
        }
        
        const url = `/music/${encodeURIComponent(track.category)}/${encodeURIComponent(track.filename)}`;
        console.log('🎵 Loading:', url);
        
        this.audioElement.src = url;
        this.audioElement.load();
        
        this.panel.querySelector('.lm-track-name').textContent = track.name;
        this.panel.querySelector('.lm-track-name').classList.add('playing');
        
        this.panel.querySelectorAll('.lm-track-item').forEach(item => {
            item.classList.toggle('active', item.dataset.path === track.path);
        });
        
        if (fadeIn) {
            await this.fadeInAndPlay();
        } else {
            this.audioElement.volume = document.getElementById('lm-volume').value / 100;
            await this.audioElement.play();
            this.isPlaying = true;
            this.updatePlayButton();
        }
    }
    
    async fadeInAndPlay() {
        const targetVolume = document.getElementById('lm-volume').value / 100;
        this.audioElement.volume = 0;
        
        try {
            await this.audioElement.play();
            this.isPlaying = true;
            this.updatePlayButton();
            this.toggleBtn.classList.add('playing');
            
            const steps = this.fadeSettings.steps;
            const stepTime = this.fadeSettings.duration / steps;
            const volumeStep = targetVolume / steps;
            
            let currentStep = 0;
            this.fadeInterval = setInterval(() => {
                currentStep++;
                this.audioElement.volume = Math.min(volumeStep * currentStep, targetVolume);
                
                if (currentStep >= steps) {
                    clearInterval(this.fadeInterval);
                    this.fadeInterval = null;
                }
            }, stepTime);
            
        } catch (e) {
            console.error('Play error:', e);
            this.updateStatus('⚠️ 再生エラー');
        }
    }
    
    async fadeOut() {
        return new Promise(resolve => {
            const currentVolume = this.audioElement.volume;
            const steps = this.fadeSettings.steps;
            const stepTime = this.fadeSettings.duration / steps;
            const volumeStep = currentVolume / steps;
            
            let currentStep = 0;
            const fadeInterval = setInterval(() => {
                currentStep++;
                this.audioElement.volume = Math.max(currentVolume - volumeStep * currentStep, 0);
                
                if (currentStep >= steps) {
                    clearInterval(fadeInterval);
                    this.audioElement.pause();
                    resolve();
                }
            }, stepTime);
        });
    }
    
    togglePlay() {
        if (this.isPlaying) {
            this.pause();
        } else {
            this.play();
        }
    }
    
    play() {
        if (this.currentTrack) {
            this.audioElement.play();
            this.isPlaying = true;
            this.updatePlayButton();
            this.toggleBtn.classList.add('playing');
        } else if (this.currentTracks && this.currentTracks.length > 0) {
            this.playTrack(this.currentTracks[0]);
        }
    }
    
    pause() {
        this.audioElement.pause();
        this.isPlaying = false;
        this.updatePlayButton();
        this.toggleBtn.classList.remove('playing');
    }
    
    async stop() {
        if (this.isPlaying) {
            await this.fadeOut();
        }
        this.audioElement.currentTime = 0;
        this.isPlaying = false;
        this.updatePlayButton();
        this.toggleBtn.classList.remove('playing');
        this.updateProgress(0);
        this.updateStatus('停止');
    }
    
    shuffleAndPlay() {
        if (this.currentTracks && this.currentTracks.length > 0) {
            const track = this.selectNonRecentTrack(this.currentTracks);
            if (track) {
                this.playTrack(track);
            }
        } else {
            this.showNotification('⚠️ まずカテゴリを選択してください', 'warning');
        }
    }
    
    // v2.1: クイックスタート（ランダムカテゴリから即再生）
    async quickStart() {
        const quickStartBtn = document.getElementById('lm-quick-start-btn');
        
        // 再生中なら停止
        if (this.isPlaying) {
            await this.stop();
            quickStartBtn.classList.remove('playing');
            quickStartBtn.querySelector('.lm-qs-icon').textContent = '🎵';
            quickStartBtn.querySelector('.lm-qs-text').textContent = 'BGMを開始する';
            this.showNotification('⏹️ BGMを停止しました');
            return;
        }
        
        // ランダムなムードを選択して再生
        const moods = ['calm', 'happy', 'relaxed', 'energetic', 'mysterious', 'romantic', 'playful', 'nostalgic'];
        const randomMood = moods[Math.floor(Math.random() * moods.length)];
        
        this.showNotification(`🎵 BGMを開始: ${randomMood}`);
        quickStartBtn.classList.add('playing');
        quickStartBtn.querySelector('.lm-qs-icon').textContent = '⏸️';
        quickStartBtn.querySelector('.lm-qs-text').textContent = 'BGMを停止する';
        
        await this.selectByMood(randomMood, true);
    }
    
    // v2.1: クイックスタートボタンの状態更新
    updateQuickStartButton() {
        const quickStartBtn = document.getElementById('lm-quick-start-btn');
        if (!quickStartBtn) return;
        
        if (this.isPlaying) {
            quickStartBtn.classList.add('playing');
            quickStartBtn.querySelector('.lm-qs-icon').textContent = '⏸️';
            quickStartBtn.querySelector('.lm-qs-text').textContent = 'BGMを停止する';
        } else {
            quickStartBtn.classList.remove('playing');
            quickStartBtn.querySelector('.lm-qs-icon').textContent = '🎵';
            quickStartBtn.querySelector('.lm-qs-text').textContent = 'BGMを開始する';
        }
    }
    
    updatePlayButton() {
        const btn = document.getElementById('lm-play-btn');
        btn.classList.toggle('playing', this.isPlaying);
        btn.querySelector('.lm-play-icon').textContent = this.isPlaying ? '⏸' : '▶';
        
        // v2.1: クイックスタートボタンも同期
        this.updateQuickStartButton();
    }
    
    // v2.0: ムードベースの選曲（強制変更オプション付き）
    async selectByMood(mood, forceChange = false) {
        this.lastDetectedMood = mood;
        
        const moodEmojis = {
            'happy': '😊', 'sad': '😢', 'calm': '😌', 'energetic': '⚡',
            'romantic': '💕', 'mysterious': '🌙', 'angry': '😠', 'anxious': '😰',
            'hopeful': '🌟', 'nostalgic': '🍂', 'playful': '🎪', 'serious': '📋',
            'exciting': '🎉', 'relaxed': '🌿', 'thinking': '🤔', 'surprised': '😲',
            'neutral': '😐'
        };
        
        this.panel.querySelector('.lm-mood-emoji').textContent = moodEmojis[mood] || '🎵';
        this.panel.querySelector('.lm-mood-text').textContent = mood;
        
        this.panel.querySelectorAll('.lm-mood-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.mood === mood);
        });
        
        const categories = this.moodToCategory[mood] || this.moodToCategory['neutral'];
        const selectedCategory = categories[Math.floor(Math.random() * categories.length)];
        
        console.log(`🎵 ムード「${mood}」→ カテゴリ「${selectedCategory}」を選択 (強制変更: ${forceChange || this.alwaysChangeTrack})`);
        
        await this.selectCategory(selectedCategory);
        
        if (this.currentTracks && this.currentTracks.length > 0) {
            // v2.0: 毎回変化モードまたは強制変更の場合、重複を避けて選曲
            const shouldChange = forceChange || this.alwaysChangeTrack;
            
            let selectedTrack;
            if (shouldChange) {
                selectedTrack = this.selectNonRecentTrack(this.currentTracks);
            } else {
                selectedTrack = this.currentTracks[Math.floor(Math.random() * this.currentTracks.length)];
            }
            
            if (selectedTrack) {
                await this.playTrack(selectedTrack);
                this.showNotification(`🎵 ${mood} → ${selectedTrack.name}`);
            }
        }
    }
    
    // Gemini連携
    setMoodFromGemini(mood, context = '', isHuman = false) {
        if (!this.autoSelectEnabled) return;
        
        // 人間側のみ分析モードの場合
        if (this.analyzeHumanOnly && !isHuman) {
            console.log('🎵 AI発言スキップ（人間側のみ分析モード）');
            return;
        }
        
        console.log(`🤖 検出ムード: ${mood} (${context}) [${isHuman ? 'HUMAN' : 'AI'}]`);
        this.selectByMood(mood, this.alwaysChangeTrack);
    }
    
    updateProgressFromAudio() {
        if (this.audioElement.duration) {
            const percent = (this.audioElement.currentTime / this.audioElement.duration) * 100;
            this.updateProgress(percent);
            
            const current = Math.floor(this.audioElement.currentTime);
            const total = Math.floor(this.audioElement.duration);
            this.updateStatus(`${Math.floor(current/60)}:${String(current%60).padStart(2,'0')} / ${Math.floor(total/60)}:${String(total%60).padStart(2,'0')}`);
        }
    }
    
    onAudioEnded() {
        if (this.currentTracks && this.currentTracks.length > 1) {
            const currentIndex = this.currentTracks.findIndex(t => t.path === this.currentTrack?.path);
            const nextIndex = (currentIndex + 1) % this.currentTracks.length;
            this.playTrack(this.currentTracks[nextIndex]);
        }
    }
    
    updateStatus(text) {
        const el = this.panel.querySelector('.lm-status-text');
        if (el) el.textContent = text;
    }
    
    updateProgress(percent) {
        const fill = this.panel.querySelector('.lm-progress-fill');
        if (fill) fill.style.width = percent + '%';
    }
    
    loadSettings() {
        const saved = localStorage.getItem('localMusicSettings');
        if (saved) {
            const settings = JSON.parse(saved);
            this.autoSelectEnabled = settings.autoSelect || false;
            this.analyzeHumanOnly = settings.analyzeHumanOnly !== false; // デフォルトtrue
            this.alwaysChangeTrack = settings.alwaysChangeTrack || false;
            this.useMultiCharLog = settings.useMultiCharLog !== false; // v2.3: デフォルトtrue
            this.contextReadModeEnabled = settings.contextReadModeEnabled || false; // v2.4
            
            document.getElementById('lm-auto-select').checked = this.autoSelectEnabled;
            document.getElementById('lm-analyze-human').checked = this.analyzeHumanOnly;
            document.getElementById('lm-always-change').checked = this.alwaysChangeTrack;
            document.getElementById('lm-use-multichar').checked = this.useMultiCharLog;
            document.getElementById('lm-context-read-mode').checked = this.contextReadModeEnabled;
            
            // v2.4: 文脈読み取りモードの説明表示
            const infoEl = document.getElementById('lm-context-read-info');
            if (infoEl) infoEl.style.display = this.contextReadModeEnabled ? 'block' : 'none';
        }
        this.updateModeInfo();
    }
    
    saveSettings() {
        localStorage.setItem('localMusicSettings', JSON.stringify({
            autoSelect: this.autoSelectEnabled,
            analyzeHumanOnly: this.analyzeHumanOnly,
            alwaysChangeTrack: this.alwaysChangeTrack,
            useMultiCharLog: this.useMultiCharLog,  // v2.3
            contextReadModeEnabled: this.contextReadModeEnabled  // v2.4
        }));
    }
    
    // ========================================
    // v2.4: 「いろいろ」フォルダからAI文脈読み取り選曲
    // ========================================
    
    // 「いろいろ」フォルダの曲リストをロード
    async loadIroiroTracks() {
        try {
            const response = await fetch(`/api/music-tracks?category=${encodeURIComponent('いろいろ')}`);
            if (response.ok) {
                const data = await response.json();
                this.iroiroTracks = data.tracks || [];
                console.log(`🎵 「いろいろ」フォルダ: ${this.iroiroTracks.length}曲ロード完了`);
            }
        } catch (e) {
            console.log('🎵 いろいろフォルダのロードに失敗:', e);
        }
    }
    
    // 会話の文脈からAIが曲を選択
    async selectFromIroiroByContext(text, charName = null) {
        if (this.iroiroTracks.length === 0) {
            console.log('🎵 いろいろフォルダの曲がロードされていません');
            return;
        }
        
        const apiKey = this.getGeminiApiKey();
        if (!apiKey) {
            console.log('🎵 Gemini APIキーがありません');
            return;
        }
        
        // 曲名リストを作成（.mp3/.wav/.WAV拡張子を除去）
        const trackNames = this.iroiroTracks.map(t => 
            t.name.replace(/\.(mp3|wav|WAV|MP3)$/i, '')
        );
        
        // 曲名リストを適度に分割（API制限対策）
        const maxTracks = 150;
        const limitedTrackNames = trackNames.slice(0, maxTracks);
        
        const source = charName ? `【${charName}】` : '';
        console.log(`🎵 文脈から選曲中... ${source}${text.substring(0, 50)}...`);
        
        try {
            const prompt = `あなたはBGM選曲AIです。会話の文脈を読み取って、最もふさわしい曲を選んでください。

【会話内容】
${source}${text}

【選曲候補】
${limitedTrackNames.join('\n')}

【指示】
- 会話の雰囲気、感情、トピックに合った曲を選んでください
- 曲名のキーワードから内容を推測してください
- 例: 明るい会話→「ポジティブ」「楽しい」系
- 例: 悲しい会話→「悲喧」「切ない」系
- 例: 神秘的→「不思議」「闇」系
- 例: 冒険・ゲーム→「アクション」「冒険」系
- 必ず候補リスト内の曲名をそのまま返してください

JSON形式で出力:
{
  "track": "選んだ曲名（候補からそのまま）",
  "reason": "選んだ理由（日本語1文）"
}`;

            const response = await fetch(
                `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contents: [{ parts: [{ text: prompt }] }],
                        generationConfig: {
                            temperature: 0.5,
                            maxOutputTokens: 200
                        }
                    })
                }
            );
            
            if (!response.ok) {
                throw new Error(`API error: ${response.status}`);
            }
            
            const data = await response.json();
            const resultText = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
            
            console.log('🎵 Gemini選曲応答:', resultText);
            
            // JSONをパース
            let result;
            try {
                const jsonMatch = resultText.match(/\{[\s\S]*\}/);
                if (jsonMatch) {
                    result = JSON.parse(jsonMatch[0]);
                } else {
                    // 曲名を直接検索
                    const foundTrack = this.findTrackByPartialName(resultText);
                    if (foundTrack) {
                        result = { track: foundTrack.name, reason: '文脈から選曲' };
                    }
                }
            } catch (e) {
                console.log('🎵 JSONパース失敗、曲名を検索...');
                const foundTrack = this.findTrackByPartialName(resultText);
                if (foundTrack) {
                    result = { track: foundTrack.name, reason: '文脈から選曲' };
                }
            }
            
            if (result && result.track) {
                // 曲を検索
                const selectedTrack = this.findTrackByPartialName(result.track);
                
                if (selectedTrack) {
                    console.log(`🎵 文脈選曲: ${selectedTrack.name} - ${result.reason}`);
                    this.showNotification(`🎯 ${selectedTrack.name.substring(0, 30)}...`);
                    
                    // ムード表示を更新
                    this.panel.querySelector('.lm-mood-emoji').textContent = '🎯';
                    this.panel.querySelector('.lm-mood-text').textContent = result.reason || '文脈から選曲';
                    
                    // 再生
                    await this.playTrack(selectedTrack);
                } else {
                    console.log(`🎵 曲が見つからない: ${result.track}`);
                    // フォールバック: ランダム選曲
                    await this.playRandomIroiroTrack();
                }
            } else {
                // フォールバック: ランダム選曲
                console.log('🎵 AI選曲失敗、ランダム選曲へ');
                await this.playRandomIroiroTrack();
            }
            
        } catch (error) {
            console.error('🎵 文脈選曲エラー:', error);
            // フォールバック: ランダム選曲
            await this.playRandomIroiroTrack();
        }
    }
    
    // 部分一致で曲を検索
    findTrackByPartialName(searchName) {
        if (!searchName) return null;
        
        const cleanSearch = searchName.replace(/\.(mp3|wav|WAV|MP3)$/i, '').trim();
        
        // 完全一致
        let found = this.iroiroTracks.find(t => 
            t.name.replace(/\.(mp3|wav|WAV|MP3)$/i, '').trim() === cleanSearch
        );
        if (found) return found;
        
        // 部分一致
        found = this.iroiroTracks.find(t => 
            t.name.includes(cleanSearch) || cleanSearch.includes(t.name.replace(/\.(mp3|wav|WAV|MP3)$/i, ''))
        );
        if (found) return found;
        
        // キーワード検索（スペースで分割）
        const keywords = cleanSearch.split(/[\s　・、。]+/).filter(k => k.length >= 2);
        for (const keyword of keywords) {
            found = this.iroiroTracks.find(t => t.name.includes(keyword));
            if (found) return found;
        }
        
        return null;
    }
    
    // ランダムにいろいろフォルダから選曲
    async playRandomIroiroTrack() {
        if (this.iroiroTracks.length === 0) return;
        
        const track = this.selectNonRecentTrack(this.iroiroTracks);
        if (track) {
            console.log(`🎵 ランダム選曲（いろいろ）: ${track.name}`);
            this.panel.querySelector('.lm-mood-emoji').textContent = '🎲';
            this.panel.querySelector('.lm-mood-text').textContent = 'ランダム選曲';
            await this.playTrack(track);
        }
    }
    
    // Gemini APIキー取得
    getGeminiApiKey() {
        if (window.GOOGLE_API_KEY) return window.GOOGLE_API_KEY;
        if (window.API_CONFIG && window.API_CONFIG.GOOGLE_API_KEY) {
            return window.API_CONFIG.GOOGLE_API_KEY;
        }
        if (window.app && window.app.GOOGLE_API_KEY) return window.app.GOOGLE_API_KEY;
        try {
            const stored = localStorage.getItem('gemini_api_key') || 
                           localStorage.getItem('banana_api_key') ||
                           localStorage.getItem('vrm_viewer_google_api_key');
            if (stored) return stored;
        } catch (e) {}
        if (typeof GOOGLE_API_KEY !== 'undefined') return GOOGLE_API_KEY;
        return null;
    }
    
    showNotification(message, type = 'success') {
        const notification = document.createElement('div');
        const bgColor = type === 'success' ? '#11998e' : type === 'error' ? '#dc3545' : '#ffc107';
        notification.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            background: ${bgColor};
            color: white;
            padding: 12px 20px;
            border-radius: 8px;
            z-index: 99999;
            animation: lmFadeInOut 3s forwards;
            max-width: 300px;
        `;
        notification.textContent = message;
        document.body.appendChild(notification);
        setTimeout(() => notification.remove(), 3000);
        
        if (!document.getElementById('lm-notification-style')) {
            const style = document.createElement('style');
            style.id = 'lm-notification-style';
            style.textContent = `
                @keyframes lmFadeInOut {
                    0% { opacity: 0; transform: translateY(20px); }
                    20% { opacity: 1; transform: translateY(0); }
                    80% { opacity: 1; transform: translateY(0); }
                    100% { opacity: 0; transform: translateY(-20px); }
                }
            `;
            document.head.appendChild(style);
        }
    }
}

// ===========================================
// グローバル初期化
// ===========================================

let localMusicPanel = null;

function initLocalMusicPanel() {
    if (!localMusicPanel) {
        localMusicPanel = new LocalMusicPanel();
        window.localMusicPanel = localMusicPanel;
    }
    return localMusicPanel;
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initLocalMusicPanel);
} else {
    initLocalMusicPanel();
}

window.LocalMusicPanel = LocalMusicPanel;

// v2.0: Gemini連携用（人間/AI判定付き）
window.setMusicMood = function(mood, context, isHuman = false) {
    if (localMusicPanel) {
        localMusicPanel.setMoodFromGemini(mood, context, isHuman);
    }
};

window.setMusicMoodFromHuman = function(mood, context) {
    if (localMusicPanel) {
        localMusicPanel.setMoodFromGemini(mood, context, true);
    }
};

window.showLocalMusicPanel = function() {
    if (localMusicPanel) localMusicPanel.show();
};

window.hideLocalMusicPanel = function() {
    if (localMusicPanel) localMusicPanel.hide();
};

console.log('✅ ローカル音楽BGMパネル v2.4 スクリプト読み込み完了 (文脈読み取りモード追加)');
