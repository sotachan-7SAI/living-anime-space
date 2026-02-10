// ========================================
// imagination-wipe.js - 想像ワイプ機能 v3.5
// パイプライン監視 + 先読み画像生成 + 音声シンクロ表示
// ========================================
// 
// 【v3.0 新機能】
//   - パイプラインモニターを監視（会話ログではなく）
//   - 画像を先読み生成（事前に作り置き）
//   - 音声再生タイミングでシンクロ表示
//   - 従来機能もすべて維持
//
// 【v3.1 新機能】
//   - 16:9アスペクト比の強制指定
//   - 実写スタイル追加（プリセット）
//   - 字幕オーバーレイ機能（画像の上に字幕をリアルタイム表示）
//
// 【v3.1.1 新機能】
//   - 妄想ワイプ画像を右クリックで字幕オンオフ切り替え
//   - トグル時の視覚通知アニメーション
//
// 【v3.2 新機能】
//   - マウス中ボタン（ホイールクリック）でワイプUIを消す
//   - ふきだしマスク機能（四角い枠ではなくふきだし形状で表示）
//
// 【v3.3 新機能】
//   - ふきだしマスクに動画（.mp4等）対応
//   - 動画はループ再生
//   - 画像/動画の自動判別
//
// 【v3.5 新機能】
//   - 監視対象選択: マルチキャラ会話 or AIチャット（Grok）
//   - 「現在の画像をGrok+BBSに送る」ボタン追加
//   - 「キャプチャをGrok+BBSに見せる」ボタン追加
//
// ========================================

class ImaginationWipe {
    constructor() {
        this.panel = null;
        this.wipeContainer = null;
        this.isVisible = false;
        this.isAutoMode = false;
        this.currentImage = null;
        this.conversationLog = [];
        this.apiKey = null;
        this.isGenerating = false;
        
        // 画像スタイル設定
        this.imageStyle = 'anime illustration';
        
        // ★ v3.5: 監視対象設定（'multi' or 'single'）
        this.watchTarget = 'multi'; // 'multi' = マルチキャラ会話, 'single' = AIチャット（Grok）
        
        // ★ v3.5: AIチャット監視用
        this.lastAIChatMessage = '';
        this.aiChatObserver = null;
        
        // ★ v3.1: 字幕オーバーレイ設定
        this.subtitleEnabled = false;
        this.currentSubtitle = '';
        this.subtitleElement = null;
        
        // ★ v3.2/v3.3: ふきだしマスク設定（動画対応）
        this.bubbleMaskEnabled = false;
        this.bubbleMaskUrl = null;
        this.bubbleMaskType = 'image'; // 'image' or 'video'
        this.bubbleMaskVideo = null;   // 動画要素（非表示）
        this.bubbleMaskCanvas = null;  // マスク合成用Canvas
        this.bubbleMaskAnimationId = null; // アニメーションフレームID
        
        // ワイプ設定（★ v3.1: 16:9比率）
        this.wipeConfig = {
            width: 400,
            height: 225,
            x: window.innerWidth - 420,
            y: window.innerHeight - 245,
            opacity: 0.95
        };
        
        // ドラッグ状態
        this.isDragging = false;
        this.isResizing = false;
        this.dragOffset = { x: 0, y: 0 };
        
        // キャプチャモード用
        this.isCapturing = false;
        this.captureOverlay = null;
        this.captureBox = null;
        this.captureHint = null;
        this.captureStartX = 0;
        this.captureStartY = 0;
        this.isCaptureDrawing = false;
        
        // v3.0: パイプライン連動
        this.pipelineImageCache = new Map();
        this.currentPlayingEntryId = null;
        this.pipelineCheckInterval = null;
        this.lastPipelineState = null;
        
        this.init();
    }
    
    init() {
        this.createWipeContainer();
        this.createControlPanel();
        this.setupKeyboardShortcut();
        this.setupConversationObserver();
        this.addCaptureStyles();
        this.startPipelineMonitoring();
        this.setupSubtitleEventListeners();
        this.loadBubbleMask();
        this.loadWatchTargetSetting(); // v3.5
        this.setupAIChatObserver(); // v3.5
        
        console.log('🎨 ImaginationWipe v3.5 初期化完了（監視対象選択+Grok+BBS送信対応）');
    }
    
    // ========================================
    // ★ v3.5: 監視対象設定の読み込み/保存
    // ========================================
    loadWatchTargetSetting() {
        try {
            const saved = localStorage.getItem('imagination-wipe-watch-target');
            if (saved) this.watchTarget = saved;
        } catch (e) {}
    }
    
    saveWatchTargetSetting() {
        try {
            localStorage.setItem('imagination-wipe-watch-target', this.watchTarget);
        } catch (e) {}
    }
    
    // ========================================
    // ★ v3.5: AIチャット（Grok）監視
    // ========================================
    setupAIChatObserver() {
        const checkForChatMessages = setInterval(() => {
            const chatMessages = document.querySelector('#chat-messages');
            if (chatMessages) {
                clearInterval(checkForChatMessages);
                this.aiChatObserver = new MutationObserver(() => {
                    if (this.watchTarget === 'single' && this.isAutoMode) {
                        this.checkAIChatAndGenerate();
                    }
                });
                this.aiChatObserver.observe(chatMessages, { childList: true, subtree: true });
                console.log('🎨 AIチャット監視開始');
            }
        }, 1000);
    }
    
    checkAIChatAndGenerate() {
        const chatMessages = document.querySelector('#chat-messages');
        if (!chatMessages) return;
        
        const messages = chatMessages.querySelectorAll('.message');
        if (messages.length === 0) return;
        
        const lastMessage = messages[messages.length - 1];
        const isAI = lastMessage.classList.contains('ai') || 
                     lastMessage.querySelector('.ai-message') ||
                     !lastMessage.classList.contains('user');
        
        if (!isAI) return;
        
        const text = lastMessage.textContent.trim();
        if (!text || text === this.lastAIChatMessage) return;
        
        this.lastAIChatMessage = text;
        console.log('🎨 AIチャット新メッセージ検出:', text.substring(0, 50) + '...');
        this.generateImage(text, 'AI');
    }
    
    // ========================================
    // ★ v3.5: Grok Voice + BBS に画像を送信
    // ========================================
    async sendImageToGrokAndBBS(imageDataUrl, description = '画像') {
        console.log('👁️ Grok+BBS に画像送信開始:', description);
        
        let sentToGrok = false;
        let sentToBBS = false;
        
        // 1. Grok Voice に送信
        try {
            if (window.grokRealtimeClient && window.grokRealtimeClient.sendImage) {
                await window.grokRealtimeClient.sendImage(imageDataUrl, description);
                sentToGrok = true;
            } else if (window.grokVoice && window.grokVoice.sendImage) {
                await window.grokVoice.sendImage(imageDataUrl, description);
                sentToGrok = true;
            } else {
                window.grokImageContext = { imageUrl: imageDataUrl, description, timestamp: Date.now() };
                sentToGrok = true;
                console.log('📝 Grok コンテキストに画像情報追加');
            }
        } catch (err) { console.warn('⚠️ Grok Voice 送信エラー:', err); }
        
        // 2. BBS エージェントに送信
        try {
            if (window.bbsAgentManager) {
                window.bbsAgentManager.latestImage = { imageUrl: imageDataUrl, description, timestamp: Date.now() };
                if (window.bbsAgentManager.isRunning) {
                    window.bbsAgentManager.conversationContext += `\n\n【📷 新しい画像が投稿されました】${description}\n※この画像について感想を言ってください。`;
                }
                sentToBBS = true;
            }
        } catch (err) { console.warn('⚠️ BBS 送信エラー:', err); }
        
        // 3. グローバルに画像情報を保存
        window.latestSharedImage = { imageUrl: imageDataUrl, description, timestamp: Date.now() };
        window.pendingImageForChat = imageDataUrl;
        
        const results = [];
        if (sentToGrok) results.push('Grok');
        if (sentToBBS) results.push('BBS');
        
        if (results.length > 0) {
            this.updateStatus(`✅ ${results.join(' + ')} に画像送信完了！`, 'success');
            this.showNotification(`👁️ ${results.join(' + ')} に画像を送信しました`);
        } else {
            this.updateStatus('⚠️ 送信先が見つかりません', 'error');
        }
        
        return { sentToGrok, sentToBBS };
    }
