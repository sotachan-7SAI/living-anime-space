// ========================================
// imagination-wipe.js - 想像ワイプ機能 v3.7
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
// 【v3.6 新機能】
//   - 画像生成エンジン選択: Gemini / ComfyUI
//   - ComfyUI text-to-image ワークフロー連携
//   - ComfyUI使用時はAPIコスト不要
//
// 【v3.7 新機能】
//   - 3D空間表示機能: 想像ワイプ画像をScreen TV風に3Dポリゴンにテクスチャとして配置
//   - サイズ・位置・回転・透明度のUI調整機能
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
        
        // ★ v3.6: 画像生成プロバイダ設定（'gemini' or 'comfyui'）
        this.imageProvider = 'gemini';
        this.comfyuiConfig = {
            checkpoint: 'animagine-xl-3.1.safetensors',
            width: 1024,
            height: 576,
            steps: 20,
            cfg: 7,
            sampler: 'euler_ancestral',
            scheduler: 'normal',
            negativePrompt: 'worst quality, low quality, blurry, deformed, ugly, bad anatomy'
        };
        this.loadImageProviderSetting();
        
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
        
        // ★ v3.7: 3D空間表示機能
        this.screen3DEnabled = false;
        this.screen3DGroup = null;
        this.screen3DMesh = null;
        this.screen3DFrame = null;
        this.screen3DTexture = null;
        this.screen3DConfig = {
            width: 1.6,
            height: 0.9,
            posX: 1.5,
            posY: 1.8,
            posZ: -2.0,
            rotY: -20,
            opacity: 1.0,
            emissive: 0.3,
        };
        this._load3DConfig();
        
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
        
        console.log('🎨 ImaginationWipe v3.6 初期化完了（画像生成エンジン選択: Gemini/ComfyUI対応）');
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
    // ★ v3.6: 画像生成プロバイダ設定
    // ========================================
    loadImageProviderSetting() {
        try {
            const saved = localStorage.getItem('imagination-wipe-image-provider');
            if (saved) this.imageProvider = saved;
            const savedConfig = localStorage.getItem('imagination-wipe-comfyui-config');
            if (savedConfig) Object.assign(this.comfyuiConfig, JSON.parse(savedConfig));
        } catch (e) {}
    }
    saveImageProviderSetting() {
        try {
            localStorage.setItem('imagination-wipe-image-provider', this.imageProvider);
            localStorage.setItem('imagination-wipe-comfyui-config', JSON.stringify(this.comfyuiConfig));
        } catch (e) {}
    }
    
    // ========================================
    // ★ v3.6: ComfyUI text-to-image API
    // ========================================
    async callComfyUIImageAPI(prompt) {
        const cfg = this.comfyuiConfig;
        const seed = Math.floor(Math.random() * 2147483647);
        
        // ComfyUI APIワークフロー（SDXL text-to-image）
        const workflow = {
            "3": {
                "class_type": "KSampler",
                "inputs": {
                    "seed": seed,
                    "steps": cfg.steps,
                    "cfg": cfg.cfg,
                    "sampler_name": cfg.sampler,
                    "scheduler": cfg.scheduler,
                    "denoise": 1,
                    "model": ["4", 0],
                    "positive": ["6", 0],
                    "negative": ["7", 0],
                    "latent_image": ["5", 0]
                }
            },
            "4": {
                "class_type": "CheckpointLoaderSimple",
                "inputs": { "ckpt_name": cfg.checkpoint }
            },
            "5": {
                "class_type": "EmptyLatentImage",
                "inputs": { "width": cfg.width, "height": cfg.height, "batch_size": 1 }
            },
            "6": {
                "class_type": "CLIPTextEncode",
                "inputs": { "text": prompt, "clip": ["4", 1] }
            },
            "7": {
                "class_type": "CLIPTextEncode",
                "inputs": { "text": cfg.negativePrompt, "clip": ["4", 1] }
            },
            "8": {
                "class_type": "VAEDecode",
                "inputs": { "samples": ["3", 0], "vae": ["4", 2] }
            },
            "9": {
                "class_type": "SaveImage",
                "inputs": { "filename_prefix": "imagination_wipe", "images": ["8", 0] }
            }
        };
        
        try {
            // 1. ワークフローをキューに送信
            const queueRes = await fetch('/comfyui/prompt', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt: workflow })
            });
            const queueData = await queueRes.json();
            const promptId = queueData.prompt_id;
            if (!promptId) throw new Error('ComfyUI prompt_idが取得できませんでした');
            
            console.log(`🎨 ComfyUI キュー送信完了: ${promptId}`);
            this.updateStatus(`ComfyUI 生成中... (ID: ${promptId.substring(0, 8)})`, 'generating');
            
            // 2. ポーリングで完成を待つ（最大120秒）
            const imageUrl = await this.pollComfyUIResult(promptId, 120);
            return imageUrl;
        } catch (error) {
            console.error('🎨 ComfyUI エラー:', error);
            throw error;
        }
    }
    
    async pollComfyUIResult(promptId, maxWaitSec = 120) {
        const startTime = Date.now();
        while ((Date.now() - startTime) / 1000 < maxWaitSec) {
            try {
                const res = await fetch(`/comfyui/history/${promptId}`);
                const data = await res.json();
                
                if (data[promptId] && data[promptId].outputs) {
                    const outputs = data[promptId].outputs;
                    // SaveImageノード（ノード9）の出力を探す
                    for (const nodeId of Object.keys(outputs)) {
                        const nodeOutput = outputs[nodeId];
                        if (nodeOutput.images && nodeOutput.images.length > 0) {
                            const img = nodeOutput.images[0];
                            const imageUrl = `/comfyui/view?filename=${encodeURIComponent(img.filename)}&subfolder=${encodeURIComponent(img.subfolder || '')}&type=${img.type || 'output'}`;
                            console.log(`🎨 ComfyUI 画像取得: ${imageUrl}`);
                            
                            // 画像をbase64に変換
                            const imgRes = await fetch(imageUrl);
                            const blob = await imgRes.blob();
                            return await this.blobToDataURL(blob);
                        }
                    }
                }
            } catch (e) {}
            
            // 2秒ごとにチェック
            await new Promise(r => setTimeout(r, 2000));
            const elapsed = Math.floor((Date.now() - startTime) / 1000);
            this.updateStatus(`ComfyUI 生成中... ${elapsed}秒経過`, 'generating');
        }
        throw new Error('ComfyUI タイムアウト');
    }
    
    blobToDataURL(blob) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
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
    
    // ========================================
    // ★ v3.2: ふきだしマスク機能
    // ========================================
    
    async loadBubbleMask() {
        // 画像と動画の両方を候補に含める
        const possiblePaths = [
            // 動画を優先（同じディレクトリ）
            'ふきだしループ.mp4',
            './ふきだしループ.mp4',
            // 従来の画像パス
            'ふきだし＠1.png',
            './ふきだし＠1.png',
            'file:///I:/filesystem/ふきだし/ふきだし＠.png',
            '../../../ふきだし/ふきだし＠.png',
            '../../ふきだし/ふきだし＠.png',
            '../ふきだし/ふきだし＠.png',
            'assets/bubble-mask.png'
        ];
        
        try {
            const savedPath = localStorage.getItem('imagination-wipe-bubble-mask-path');
            if (savedPath) possiblePaths.unshift(savedPath);
        } catch (e) {}
        
        for (const path of possiblePaths) {
            const isVideo = this.isVideoFile(path);
            
            try {
                if (isVideo) {
                    // 動画の読み込みテスト
                    const video = document.createElement('video');
                    video.src = path;
                    video.muted = true;
                    await new Promise((resolve, reject) => {
                        video.onloadeddata = resolve;
                        video.onerror = reject;
                        setTimeout(reject, 3000);
                    });
                    this.bubbleMaskUrl = path;
                    this.bubbleMaskType = 'video';
                    console.log('🎬 ふきだしマスク動画読み込み成功:', path);
                    return;
                } else {
                    // 画像の読み込みテスト
                    const img = new Image();
                    img.src = path;
                    await new Promise((resolve, reject) => {
                        img.onload = resolve;
                        img.onerror = reject;
                        setTimeout(reject, 2000);
                    });
                    this.bubbleMaskUrl = path;
                    this.bubbleMaskType = 'image';
                    console.log('🗨️ ふきだしマスク画像読み込み成功:', path);
                    return;
                }
            } catch (e) {}
        }
        console.log('⚠️ ふきだしマスクが見つかりません（画像/動画）');
    }
    
    // ファイルが動画かどうか判定
    isVideoFile(path) {
        const videoExtensions = ['.mp4', '.webm', '.ogg', '.mov', '.avi'];
        const lowerPath = path.toLowerCase();
        return videoExtensions.some(ext => lowerPath.endsWith(ext));
    }
    
    setBubbleMaskFromFile(file) {
        if (!file) return;
        
        const isVideo = file.type.startsWith('video/');
        const isImage = file.type.startsWith('image/');
        
        if (!isVideo && !isImage) {
            this.updateStatus('画像または動画ファイルを選択してください', 'error');
            return;
        }
        
        const reader = new FileReader();
        reader.onload = (e) => {
            this.bubbleMaskUrl = e.target.result;
            this.bubbleMaskType = isVideo ? 'video' : 'image';
            
            // パスを保存
            try {
                localStorage.setItem('imagination-wipe-bubble-mask-path', file.name);
                localStorage.setItem('imagination-wipe-bubble-mask-type', this.bubbleMaskType);
            } catch (err) {}
            
            this.applyBubbleMask();
            const typeLabel = isVideo ? '動画' : '画像';
            this.updateStatus(`ふきだしマスク（${typeLabel}）を設定しました`, 'success');
            console.log(`🗨️ ふきだしマスク${typeLabel}設定:`, file.name);
        };
        reader.readAsDataURL(file);
    }
    
    toggleBubbleMask(enabled) {
        this.bubbleMaskEnabled = enabled;
        this.applyBubbleMask();
        try {
            localStorage.setItem('imagination-wipe-bubble-mask', enabled ? 'true' : 'false');
        } catch (e) {}
        console.log(`🗨️ ふきだしマスク: ${enabled ? 'ON' : 'OFF'}`);
    }
    
    applyBubbleMask() {
        const imageContainer = this.wipeContainer.querySelector('.wipe-image-container');
        const wipeImage = this.wipeContainer.querySelector('#wipe-image');
        const header = this.wipeContainer.querySelector('.wipe-header');
        const caption = this.wipeContainer.querySelector('.wipe-caption');
        const resizeHandle = this.wipeContainer.querySelector('.wipe-resize-handle');
        const subtitle = this.wipeContainer.querySelector('.wipe-subtitle-overlay');
        
        // 既存の動画マスクを削除
        this.removeBubbleMaskVideo();
        
        if (this.bubbleMaskEnabled && this.bubbleMaskUrl) {
            console.log(`🗨️ ふきだしマスク適用（${this.bubbleMaskType}）:`, this.bubbleMaskUrl);
            this.wipeContainer.classList.add('bubble-mask-mode');
            
            // コンテナを透明に
            this.wipeContainer.style.background = 'transparent';
            this.wipeContainer.style.boxShadow = 'none';
            this.wipeContainer.style.border = 'none';
            this.wipeContainer.style.borderRadius = '0';
            this.wipeContainer.style.backdropFilter = 'none';
            
            // 画像コンテナも透明に
            imageContainer.style.background = 'transparent';
            
            if (this.bubbleMaskType === 'video') {
                // ★ v3.3: 動画マスクの場合
                this.applyVideoMask(imageContainer, wipeImage);
            } else {
                // ★ 画像マスク: Canvas方式でマスク処理
                if (wipeImage && wipeImage.src && wipeImage.complete) {
                    this.applyCanvasMask(wipeImage);
                }
            }
            
            // ヘッダー、キャプション、リサイズハンドル、字幕を非表示
            if (header) header.style.display = 'none';
            if (caption) caption.style.display = 'none';
            if (resizeHandle) resizeHandle.style.display = 'none';
            if (subtitle) subtitle.style.display = 'none';
            
        } else {
            console.log('🗨️ ふきだしマスク解除');
            this.wipeContainer.classList.remove('bubble-mask-mode');
            
            // 通常スタイルに戻す
            this.wipeContainer.style.background = 'rgba(20, 20, 30, 0.95)';
            this.wipeContainer.style.boxShadow = '0 8px 32px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.1)';
            this.wipeContainer.style.borderRadius = '12px';
            
            imageContainer.style.background = '#1a1a2e';
            
            // ★ 元画像に復元
            if (wipeImage && wipeImage.dataset.originalSrc) {
                wipeImage.src = wipeImage.dataset.originalSrc;
                wipeImage.dataset.masked = 'false';
            }
            // 想像画像を再表示
            if (wipeImage) wipeImage.style.display = '';
            
            // UI要素を再表示
            if (header) header.style.display = 'flex';
            if (caption) caption.style.display = 'block';
            if (resizeHandle) resizeHandle.style.display = 'block';
            // 字幕は設定に応じて
            if (subtitle && this.subtitleEnabled) subtitle.style.display = 'block';
        }
    }
    
    // ★ v3.3: 動画マスクを適用（Canvasで合成）
    applyVideoMask(container, wipeImage) {
        // 動画要素を作成（非表示）
        const video = document.createElement('video');
        video.id = 'bubble-mask-video';
        video.src = this.bubbleMaskUrl;
        video.loop = true;
        video.muted = true;
        video.playsInline = true;
        video.autoplay = true;
        video.crossOrigin = 'anonymous';
        video.style.display = 'none'; // 動画自体は非表示
        
        // マスク合成用Canvasを作成
        const canvas = document.createElement('canvas');
        canvas.id = 'bubble-mask-canvas';
        canvas.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            object-fit: contain;
            z-index: 2;
        `;
        
        container.appendChild(video);
        container.appendChild(canvas);
        this.bubbleMaskVideo = video;
        this.bubbleMaskCanvas = canvas;
        
        // 想像画像を非表示にする（Canvasに合成するため）
        if (wipeImage) {
            wipeImage.style.display = 'none';
        }
        
        // 動画読み込み完了後に合成開始
        video.onloadeddata = () => {
            // Canvasサイズを動画に合わせる
            canvas.width = video.videoWidth || 400;
            canvas.height = video.videoHeight || 225;
            
            console.log(`🎬 動画マスク準備完了: ${canvas.width}x${canvas.height}`);
            
            // 合成ループ開始
            this.startVideoMaskCompositing(video, canvas, wipeImage);
        };
        
        // 再生開始
        video.play().then(() => {
            console.log('🎬 ふきだし動画マスク再生開始');
        }).catch(err => {
            console.warn('⚠️ 動画自動再生に失敗:', err);
            // クリックで再生開始
            const playOnClick = () => {
                video.play();
                container.removeEventListener('click', playOnClick);
            };
            container.addEventListener('click', playOnClick);
        });
    }
    
    // 動画マスク合成ループ
    startVideoMaskCompositing(video, canvas, wipeImage) {
        const ctx = canvas.getContext('2d');
        
        // 想像画像をImageオブジェクトとして取得
        let sourceImage = null;
        if (wipeImage && wipeImage.dataset.originalSrc) {
            sourceImage = new Image();
            sourceImage.crossOrigin = 'anonymous';
            sourceImage.src = wipeImage.dataset.originalSrc;
        } else if (wipeImage && wipeImage.src) {
            sourceImage = new Image();
            sourceImage.crossOrigin = 'anonymous';
            sourceImage.src = wipeImage.src;
        }
        
        // マスク用の一時Canvasを作成
        const maskCanvas = document.createElement('canvas');
        maskCanvas.width = canvas.width;
        maskCanvas.height = canvas.height;
        const maskCtx = maskCanvas.getContext('2d');
        
        const compositeFrame = () => {
            if (!this.bubbleMaskEnabled || !this.bubbleMaskVideo) {
                return; // マスクが無効になったら停止
            }
            
            const w = canvas.width;
            const h = canvas.height;
            
            // Canvasをクリア
            ctx.clearRect(0, 0, w, h);
            
            // 想像画像がある場合のみ合成
            if (sourceImage && sourceImage.complete && sourceImage.naturalWidth > 0) {
                // 1. 想像画像を描画
                ctx.drawImage(sourceImage, 0, 0, w, h);
                
                // 2. 動画フレームをマスクCanvasに描画
                maskCtx.drawImage(video, 0, 0, w, h);
                
                // 3. ピクセルデータを取得
                const imageData = ctx.getImageData(0, 0, w, h);
                const maskData = maskCtx.getImageData(0, 0, w, h);
                const data = imageData.data;
                const mask = maskData.data;
                
                // 4. マスク適用（白=表示、黒=透明）
                for (let i = 0; i < data.length; i += 4) {
                    // マスクの輝度（Rチャンネルを使用、白黒動画なのでRGB同じ）
                    const maskBrightness = mask[i]; // 0-255（黒=0、白=255）
                    // 想像画像のアルファにマスク輝度を掛ける
                    data[i + 3] = Math.round((data[i + 3] * maskBrightness) / 255);
                }
                
                // 5. 結果を描画
                ctx.putImageData(imageData, 0, 0);
                
            } else {
                // 想像画像がない場合は動画マスクだけ表示（デバッグ用）
                ctx.globalAlpha = 0.3;
                ctx.drawImage(video, 0, 0, w, h);
                ctx.globalAlpha = 1.0;
            }
            
            // 次フレーム
            this.bubbleMaskAnimationId = requestAnimationFrame(compositeFrame);
        };
        
        // 画像読み込み完了を待ってから開始
        if (sourceImage) {
            sourceImage.onload = () => {
                console.log('✅ 想像画像読み込み完了、マスク合成開始');
                compositeFrame();
            };
            // 既に読み込み済みの場合
            if (sourceImage.complete && sourceImage.naturalWidth > 0) {
                compositeFrame();
            }
        } else {
            compositeFrame();
        }
    }
    
    // 想像画像が更新された時に合成を再開
    updateVideoMaskSource(newImageSrc) {
        if (!this.bubbleMaskEnabled || this.bubbleMaskType !== 'video') return;
        if (!this.bubbleMaskCanvas || !this.bubbleMaskVideo) return;
        
        const wipeImage = this.wipeContainer.querySelector('#wipe-image');
        if (wipeImage) {
            wipeImage.dataset.originalSrc = newImageSrc;
        }
        
        // 合成ループを再開
        if (this.bubbleMaskAnimationId) {
            cancelAnimationFrame(this.bubbleMaskAnimationId);
        }
        this.startVideoMaskCompositing(this.bubbleMaskVideo, this.bubbleMaskCanvas, wipeImage);
    }
    
    // 動画マスクを削除
    removeBubbleMaskVideo() {
        // アニメーションフレームを停止
        if (this.bubbleMaskAnimationId) {
            cancelAnimationFrame(this.bubbleMaskAnimationId);
            this.bubbleMaskAnimationId = null;
        }
        
        // 動画要素を削除
        if (this.bubbleMaskVideo) {
            this.bubbleMaskVideo.pause();
            this.bubbleMaskVideo.src = '';
            this.bubbleMaskVideo.remove();
            this.bubbleMaskVideo = null;
        }
        
        // Canvas要素を削除
        if (this.bubbleMaskCanvas) {
            this.bubbleMaskCanvas.remove();
            this.bubbleMaskCanvas = null;
        }
        
        // IDで探して削除（念のため）
        const existingVideo = document.getElementById('bubble-mask-video');
        if (existingVideo) {
            existingVideo.pause();
            existingVideo.src = '';
            existingVideo.remove();
        }
        const existingCanvas = document.getElementById('bubble-mask-canvas');
        if (existingCanvas) {
            existingCanvas.remove();
        }
        
        // 想像画像を再表示
        const wipeImage = this.wipeContainer?.querySelector('#wipe-image');
        if (wipeImage) {
            wipeImage.style.display = '';
        }
    }
    
    // ★ Canvas方式でアルファチャンネルマスク処理
    async applyCanvasMask(imgElement) {
        if (!this.bubbleMaskUrl || !imgElement.src) return;
        
        // 元画像のURLを保存（無限ループ防止）
        const originalSrc = imgElement.dataset.originalSrc || imgElement.src;
        if (imgElement.src.startsWith('data:') && imgElement.dataset.masked === 'true') {
            return; // 既にマスク済み
        }
        imgElement.dataset.originalSrc = originalSrc;
        
        try {
            // マスク画像を読み込み
            const maskImg = new Image();
            maskImg.crossOrigin = 'anonymous';
            await new Promise((resolve, reject) => {
                maskImg.onload = resolve;
                maskImg.onerror = reject;
                maskImg.src = this.bubbleMaskUrl;
            });
            
            // 元画像を読み込み
            const srcImg = new Image();
            srcImg.crossOrigin = 'anonymous';
            await new Promise((resolve, reject) => {
                srcImg.onload = resolve;
                srcImg.onerror = reject;
                srcImg.src = originalSrc;
            });
            
            // Canvasを作成
            const canvas = document.createElement('canvas');
            canvas.width = srcImg.width;
            canvas.height = srcImg.height;
            const ctx = canvas.getContext('2d');
            
            // 元画像を描画
            ctx.drawImage(srcImg, 0, 0);
            
            // マスク画像を同じサイズに描画してピクセルデータ取得
            const maskCanvas = document.createElement('canvas');
            maskCanvas.width = srcImg.width;
            maskCanvas.height = srcImg.height;
            const maskCtx = maskCanvas.getContext('2d');
            maskCtx.drawImage(maskImg, 0, 0, srcImg.width, srcImg.height);
            const maskData = maskCtx.getImageData(0, 0, srcImg.width, srcImg.height);
            
            // 元画像のピクセルデータを取得
            const imageData = ctx.getImageData(0, 0, srcImg.width, srcImg.height);
            const data = imageData.data;
            const mask = maskData.data;
            
            // マスク適用（白=表示、黒=透明）
            for (let i = 0; i < data.length; i += 4) {
                // マスクの輝度（白黒なのでRだけ見ればOK）
                const maskAlpha = mask[i]; // 0-255
                // 元画像のアルファにマスクを掛ける
                data[i + 3] = Math.round((data[i + 3] * maskAlpha) / 255);
            }
            
            ctx.putImageData(imageData, 0, 0);
            
            // 結果を画像に設定
            imgElement.src = canvas.toDataURL('image/png');
            imgElement.dataset.masked = 'true';
            
            console.log('✅ Canvas方式マスク適用完了');
            
        } catch (error) {
            console.error('❌ マスク処理エラー:', error);
        }
    }
    
    // ========================================
    // ★ v3.2: マウス中ボタンで消す
    // ========================================
    
    setupMiddleClickClose() {
        this.wipeContainer.addEventListener('mousedown', (e) => {
            if (e.button === 1) {
                e.preventDefault();
                e.stopPropagation();
                this.hideWipeWithAnimation();
            }
        });
        
        this.wipeContainer.addEventListener('auxclick', (e) => {
            if (e.button === 1) {
                e.preventDefault();
            }
        });
    }
    
    hideWipeWithAnimation() {
        this.wipeContainer.style.transition = 'opacity 0.3s ease-out, transform 0.3s ease-out';
        this.wipeContainer.style.opacity = '0';
        this.wipeContainer.style.transform = 'scale(0.9)';
        
        setTimeout(() => {
            this.wipeContainer.style.display = 'none';
            this.wipeContainer.style.transition = '';
            this.wipeContainer.style.opacity = '';
            this.wipeContainer.style.transform = '';
        }, 300);
        
        this.showNotification('🖱️ ワイプを閉じました');
    }
    
    showNotification(message) {
        const existing = document.querySelector('.iw-notification');
        if (existing) existing.remove();
        
        const notification = document.createElement('div');
        notification.className = 'iw-notification';
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed; bottom: 100px; left: 50%; transform: translateX(-50%);
            background: rgba(0, 0, 0, 0.8); color: white; padding: 10px 20px;
            border-radius: 8px; font-size: 14px; z-index: 99999; pointer-events: none;
            animation: iwNotificationFadeOut 1.5s ease-out forwards;
        `;
        
        if (!document.querySelector('#iw-notification-fade-style')) {
            const style = document.createElement('style');
            style.id = 'iw-notification-fade-style';
            style.textContent = `@keyframes iwNotificationFadeOut { 0% { opacity: 1; } 70% { opacity: 1; } 100% { opacity: 0; } }`;
            document.head.appendChild(style);
        }
        
        document.body.appendChild(notification);
        setTimeout(() => notification.remove(), 1500);
    }
    
    // ========================================
    // 字幕オーバーレイシステム
    // ========================================
    
    setupSubtitleEventListeners() {
        window.addEventListener('playbackStart', (e) => {
            if (this.subtitleEnabled && e.detail) {
                this.showSubtitle(e.detail.text || e.detail.responseText || '');
            }
        });
        
        window.addEventListener('multichar:turnStart', (e) => {
            if (this.subtitleEnabled && e.detail) {
                const { speakerName, text, responseText } = e.detail;
                const subtitleText = text || responseText || '';
                if (subtitleText) this.showSubtitle(subtitleText, speakerName);
            }
        });
        
        setInterval(() => {
            if (!this.subtitleEnabled) return;
            const director = window.multiCharManager?.director;
            if (!director || !director.pipeline) return;
            const playingEntry = director.pipeline.find(e => e.status === 'playing');
            if (playingEntry && playingEntry.responseText) {
                this.showSubtitle(playingEntry.responseText, playingEntry.speakerName);
            }
        }, 500);
    }
    
    showSubtitle(text, speakerName = '') {
        if (!this.subtitleEnabled || !this.subtitleElement) return;
        if (!text || text === this.currentSubtitle) return;
        
        this.currentSubtitle = text;
        const maxLength = 80;
        let displayText = text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
        if (speakerName) displayText = `【${speakerName}】${displayText}`;
        
        this.subtitleElement.style.opacity = '0';
        setTimeout(() => {
            this.subtitleElement.textContent = displayText;
            this.subtitleElement.style.opacity = '1';
        }, 150);
    }
    
    toggleSubtitle(enabled) {
        this.subtitleEnabled = enabled;
        if (this.subtitleElement) this.subtitleElement.style.display = enabled ? 'block' : 'none';
        try { localStorage.setItem('imagination-wipe-subtitle', enabled ? 'true' : 'false'); } catch (e) {}
    }
    
    // ========================================
    // パイプライン監視システム
    // ========================================
    
    startPipelineMonitoring() {
        this.pipelineCheckInterval = setInterval(() => {
            // v3.5: 監視対象がマルチキャラの場合のみパイプライン監視
            if (this.isAutoMode && this.watchTarget === 'multi') {
                this.checkPipelineAndGenerateImages();
            }
        }, 200);
        
        window.addEventListener('multichar:pipelineUpdate', () => {
            if (this.isAutoMode && this.watchTarget === 'multi') {
                this.checkPipelineAndGenerateImages();
            }
        });
        
        window.addEventListener('playbackStart', (e) => {
            if (this.isAutoMode && this.watchTarget === 'multi' && e.detail) {
                this.onPlaybackStart(e.detail);
            }
        });
    }
    
    checkPipelineAndGenerateImages() {
        const director = window.multiCharManager?.director;
        if (!director || !director.pipeline) return;
        
        for (const entry of director.pipeline) {
            const entryId = this.getEntryId(entry);
            
            if (this.pipelineImageCache.has(entryId)) {
                const cached = this.pipelineImageCache.get(entryId);
                if (entry.status === 'playing' && cached.status !== 'displayed') {
                    this.displayCachedImage(entryId, entry);
                }
                continue;
            }
            
            if ((entry.status === 'generating' || entry.status === 'synthesizing' || entry.status === 'ready') 
                && entry.responseText && entry.responseText.length > 0) {
                this.pipelineImageCache.set(entryId, {
                    imageUrl: null, caption: entry.responseText,
                    status: 'generating', speakerName: entry.speakerName
                });
                this.generateImageForPipeline(entryId, entry.responseText, entry.speakerName);
            }
        }
        this.cleanupOldCache();
    }
    
    getEntryId(entry) { return `${entry.speakerId}_${entry.createdAt}`; }
    
    async generateImageForPipeline(entryId, text, speakerName) {
        try {
            // ★ v3.6: プロバイダ分岐
            if (this.imageProvider === 'gemini') {
                this.apiKey = this.getGeminiApiKey();
                if (!this.apiKey) return;
            }
            
            const sceneDescription = await this.analyzeSceneForImage(text, speakerName);
            let imageUrl;
            if (this.imageProvider === 'comfyui') {
                imageUrl = await this.callComfyUIImageAPI(sceneDescription);
            } else {
                imageUrl = await this.callGeminiImageAPI(sceneDescription);
            }
            
            if (imageUrl) {
                const cached = this.pipelineImageCache.get(entryId);
                if (cached) {
                    cached.imageUrl = imageUrl;
                    cached.status = 'ready';
                    cached.caption = sceneDescription;
                }
            }
        } catch (error) {
            const cached = this.pipelineImageCache.get(entryId);
            if (cached) cached.status = 'error';
        }
    }
    
    displayCachedImage(entryId, entry) {
        const cached = this.pipelineImageCache.get(entryId);
        if (!cached || !cached.imageUrl) return;
        
        this.displayImageWithFade(cached.imageUrl, cached.caption);
        this.showWipe();
        cached.status = 'displayed';
        this.currentPlayingEntryId = entryId;
        this.updateStatus(`🎬 ${entry.speakerName}のシーン表示中`, 'success');
    }
    
    onPlaybackStart(detail) {
        const director = window.multiCharManager?.director;
        if (!director || !director.pipeline) return;
        
        const playingEntry = director.pipeline.find(e => e.status === 'playing');
        if (playingEntry) {
            const entryId = this.getEntryId(playingEntry);
            const cached = this.pipelineImageCache.get(entryId);
            if (cached && cached.imageUrl && cached.status === 'ready') {
                this.displayCachedImage(entryId, playingEntry);
            }
        }
    }
    
    displayImageWithFade(imageUrl, caption) {
        const img = this.wipeContainer.querySelector('#wipe-image');
        const placeholder = this.wipeContainer.querySelector('#wipe-placeholder');
        const captionEl = this.wipeContainer.querySelector('#wipe-caption');
        
        // マスク状態をリセット
        img.dataset.masked = 'false';
        img.dataset.originalSrc = imageUrl;
        
        img.src = imageUrl;
        img.classList.add('visible');
        placeholder.classList.add('hidden');
        captionEl.textContent = caption.length > 60 ? caption.substring(0, 60) + '...' : caption;
        this.currentImage = imageUrl;
        
        // ★ ポップインアニメーション（サイズ0から1.5秒で拡大）
        this.playPopInAnimation();
        
        // ★ v3.7: 3D空間テクスチャ更新
        if (this.screen3DEnabled && this.screen3DMesh) {
            this._update3DTexture(imageUrl);
        }
        
        // ★ ふきだしマスクがONなら適用
        if (this.bubbleMaskEnabled && this.bubbleMaskUrl) {
            if (this.bubbleMaskType === 'video') {
                // ★ 動画マスクの場合: 合成ループを再開
                console.log('🎬 動画マスク: 新しい画像で合成再開 (fade)');
                this.updateVideoMaskSource(imageUrl);
            } else {
                // 画像マスクの場合
                img.onload = () => {
                    this.applyCanvasMask(img);
                };
            }
        }
    }
    
    cleanupOldCache() {
        const now = Date.now();
        for (const [entryId, cached] of this.pipelineImageCache.entries()) {
            if ((cached.status === 'displayed' || cached.status === 'error')) {
                const timestamp = parseInt(entryId.split('_')[1]);
                if (now - timestamp > 60000) this.pipelineImageCache.delete(entryId);
            }
        }
    }
    
    // ========================================
    // キャプチャ用CSS
    // ========================================
    addCaptureStyles() {
        const style = document.createElement('style');
        style.id = 'imagination-capture-styles';
        style.textContent = `
            .iw-capture-overlay { position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0,0,0,0.3); cursor: crosshair; z-index: 99998; }
            .iw-capture-box { position: fixed; border: 4px dashed #a78bfa; background: rgba(167,139,250,0.15); box-shadow: 0 0 30px rgba(167,139,250,0.6); z-index: 99999; pointer-events: none; }
            .iw-capture-hint { position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); background: linear-gradient(135deg, #8b5cf6, #6366f1); color: white; padding: 25px 40px; border-radius: 16px; font-size: 20px; font-weight: bold; text-align: center; z-index: 100000; box-shadow: 0 10px 40px rgba(0,0,0,0.4); animation: iwHintPulse 2s infinite; }
            .iw-capture-hint small { display: block; font-size: 14px; margin-top: 10px; opacity: 0.9; }
            @keyframes iwHintPulse { 0%, 100% { transform: translate(-50%, -50%) scale(1); } 50% { transform: translate(-50%, -50%) scale(1.03); } }
            #imagination-wipe-container.bubble-mask-mode { background: transparent !important; box-shadow: none !important; border: none !important; backdrop-filter: none !important; }
            #imagination-wipe-container.bubble-mask-mode .wipe-content { background: transparent; }
            #imagination-wipe-container.bubble-mask-mode .wipe-image-container { background: transparent; }
        `;
        document.head.appendChild(style);
    }
    
    // ========================================
    // ワイプコンテナ
    // ========================================
    createWipeContainer() {
        this.wipeContainer = document.createElement('div');
        this.wipeContainer.id = 'imagination-wipe-container';
        this.wipeContainer.innerHTML = `
            <div class="wipe-header"><span class="wipe-title">💭 想像</span><div class="wipe-controls"><button class="wipe-btn wipe-btn-minimize" title="折りたたみ">−</button><button class="wipe-btn wipe-btn-close" title="閉じる">×</button></div></div>
            <div class="wipe-content"><div class="wipe-image-container"><img id="wipe-image" src="" alt="想像画像"><div class="wipe-loading" id="wipe-loading"><div class="wipe-spinner"></div><span>生成中...</span></div><div class="wipe-placeholder" id="wipe-placeholder"><span>💭</span><p>会話から画像を生成</p></div><div class="wipe-subtitle-overlay" id="wipe-subtitle"></div></div><div class="wipe-caption" id="wipe-caption"></div></div>
            <div class="wipe-resize-handle"></div>
            <button class="wipe-collapse-btn" id="wipe-collapse-btn" title="折りたたみ/展開">▼</button>
        `;
        
        this.applyWipeStyles();
        this.wipeContainer.style.display = 'none';
        document.body.appendChild(this.wipeContainer);
        
        this.subtitleElement = this.wipeContainer.querySelector('#wipe-subtitle');
        
        this.setupWipeDragAndResize();
        this.setupWipeButtons();
        this.setupMiddleClickClose();
        this.setupSubtitleRightClick();
        
        try {
            if (localStorage.getItem('imagination-wipe-subtitle') === 'true') {
                this.subtitleEnabled = true;
                if (this.subtitleElement) this.subtitleElement.style.display = 'block';
            }
            if (localStorage.getItem('imagination-wipe-bubble-mask') === 'true') {
                this.bubbleMaskEnabled = true;
                setTimeout(() => { if (this.bubbleMaskUrl) this.applyBubbleMask(); }, 500);
            }
        } catch (e) {}
    }
    
    applyWipeStyles() {
        const style = document.createElement('style');
        style.textContent = `
            #imagination-wipe-container { position: fixed; width: ${this.wipeConfig.width}px; height: ${this.wipeConfig.height}px; left: ${this.wipeConfig.x}px; top: ${this.wipeConfig.y}px; background: rgba(20, 20, 30, 0.95); border-radius: 12px; box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.1); z-index: 9000; overflow: hidden; display: flex; flex-direction: column; backdrop-filter: blur(10px); }
            #imagination-wipe-container .wipe-header { display: flex; justify-content: space-between; align-items: center; padding: 8px 12px; background: linear-gradient(135deg, #8b5cf6, #6366f1); cursor: move; user-select: none; }
            #imagination-wipe-container .wipe-title { color: white; font-weight: bold; font-size: 12px; }
            #imagination-wipe-container .wipe-controls { display: flex; gap: 4px; }
            #imagination-wipe-container .wipe-btn { width: 20px; height: 20px; border: none; border-radius: 4px; cursor: pointer; font-size: 12px; display: flex; align-items: center; justify-content: center; transition: all 0.2s; }
            #imagination-wipe-container .wipe-btn-minimize { background: rgba(255, 255, 255, 0.2); color: white; }
            #imagination-wipe-container .wipe-btn-close { background: rgba(239, 68, 68, 0.8); color: white; }
            #imagination-wipe-container .wipe-btn:hover { transform: scale(1.1); }
            #imagination-wipe-container .wipe-content { flex: 1; display: flex; flex-direction: column; overflow: hidden; }
            #imagination-wipe-container .wipe-image-container { flex: 1; position: relative; display: flex; align-items: center; justify-content: center; background: #1a1a2e; }
            #imagination-wipe-container #wipe-image { max-width: 100%; max-height: 100%; object-fit: contain; display: none; transition: opacity 0.3s ease-out; }
            #imagination-wipe-container #wipe-image.visible { display: block; }
            #imagination-wipe-container .wipe-loading { position: absolute; display: none; flex-direction: column; align-items: center; gap: 8px; color: #a78bfa; }
            #imagination-wipe-container .wipe-loading.active { display: flex; }
            #imagination-wipe-container .wipe-spinner { width: 32px; height: 32px; border: 3px solid rgba(167, 139, 250, 0.3); border-top-color: #a78bfa; border-radius: 50%; animation: wipe-spin 1s linear infinite; }
            @keyframes wipe-spin { to { transform: rotate(360deg); } }
            #imagination-wipe-container .wipe-placeholder { display: flex; flex-direction: column; align-items: center; color: #6b7280; }
            #imagination-wipe-container .wipe-placeholder span { font-size: 48px; opacity: 0.5; }
            #imagination-wipe-container .wipe-placeholder p { font-size: 11px; margin-top: 8px; }
            #imagination-wipe-container .wipe-placeholder.hidden { display: none; }
            #imagination-wipe-container .wipe-subtitle-overlay { position: absolute; bottom: 10px; left: 10px; right: 10px; background: rgba(0, 0, 0, 0.8); color: #fff; padding: 8px 12px; border-radius: 6px; font-size: 13px; font-weight: bold; text-align: center; text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.8); transition: opacity 0.3s ease; display: none; z-index: 10; line-height: 1.4; max-height: 60px; overflow-y: auto; }
            #imagination-wipe-container .wipe-subtitle-overlay:empty { display: none !important; }
            #imagination-wipe-container .wipe-caption { padding: 6px 10px; background: rgba(0, 0, 0, 0.5); color: #d1d5db; font-size: 10px; text-align: center; max-height: 40px; overflow-y: auto; }
            #imagination-wipe-container .wipe-resize-handle { position: absolute; bottom: 0; right: 0; width: 16px; height: 16px; cursor: se-resize; background: linear-gradient(135deg, transparent 50%, rgba(167, 139, 250, 0.5) 50%); }
            #imagination-wipe-container .wipe-collapse-btn { position: absolute; bottom: -28px; left: 50%; transform: translateX(-50%); width: 50px; height: 24px; border: none; border-radius: 0 0 8px 8px; background: linear-gradient(135deg, #8b5cf6, #6366f1); color: white; cursor: pointer; font-size: 12px; z-index: 10; box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3); transition: all 0.2s; }
            #imagination-wipe-container .wipe-collapse-btn:hover { background: linear-gradient(135deg, #7c3aed, #4f46e5); transform: translateX(-50%) scale(1.1); }
            #imagination-wipe-container.collapsed { height: 32px !important; overflow: hidden; }
            #imagination-wipe-container.collapsed .wipe-content { display: none !important; }
            #imagination-wipe-container.collapsed .wipe-resize-handle { display: none; }
            #imagination-wipe-container.collapsed .wipe-collapse-btn { bottom: -28px; }
            #imagination-wipe-container.collapsed .wipe-collapse-btn::after { content: '▲'; }
            #imagination-panel { position: fixed; width: 280px; background: rgba(20, 20, 30, 0.95); border-radius: 12px; box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.1); z-index: 9001; display: none; backdrop-filter: blur(10px); overflow: hidden; }
            #imagination-panel .ip-header { display: flex; justify-content: space-between; align-items: center; padding: 10px 14px; background: linear-gradient(135deg, #8b5cf6, #6366f1); cursor: move; user-select: none; }
            #imagination-panel .ip-title { color: white; font-weight: bold; font-size: 13px; }
            #imagination-panel .ip-close { width: 22px; height: 22px; border: none; border-radius: 4px; background: rgba(239, 68, 68, 0.8); color: white; cursor: pointer; font-size: 14px; display: flex; align-items: center; justify-content: center; }
            #imagination-panel .ip-body { padding: 12px; display: flex; flex-direction: column; gap: 10px; max-height: 70vh; overflow-y: auto; }
            #imagination-panel .ip-section { background: rgba(255, 255, 255, 0.05); border-radius: 8px; padding: 10px; }
            #imagination-panel .ip-section-title { font-size: 11px; color: #a78bfa; margin-bottom: 8px; font-weight: bold; }
            #imagination-panel .ip-btn { width: 100%; padding: 10px; border: none; border-radius: 6px; cursor: pointer; font-size: 12px; font-weight: bold; transition: all 0.2s; display: flex; align-items: center; justify-content: center; gap: 6px; }
            #imagination-panel .ip-btn-primary { background: linear-gradient(135deg, #8b5cf6, #6366f1); color: white; }
            #imagination-panel .ip-btn-primary:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(139, 92, 246, 0.4); }
            #imagination-panel .ip-btn-secondary { background: rgba(255, 255, 255, 0.1); color: #d1d5db; }
            #imagination-panel .ip-btn-secondary:hover { background: rgba(255, 255, 255, 0.2); }
            #imagination-panel .ip-btn-auto { background: rgba(34, 197, 94, 0.2); color: #4ade80; border: 1px solid rgba(34, 197, 94, 0.3); }
            #imagination-panel .ip-btn-auto.active { background: linear-gradient(135deg, #22c55e, #16a34a); color: white; }
            #imagination-panel .ip-btn-bubble { background: rgba(236, 72, 153, 0.2); color: #f472b6; border: 1px solid rgba(236, 72, 153, 0.3); }
            #imagination-panel .ip-btn-bubble.active { background: linear-gradient(135deg, #ec4899, #db2777); color: white; }
            #imagination-panel .ip-btn-subtitle { background: rgba(59, 130, 246, 0.2); color: #60a5fa; border: 1px solid rgba(59, 130, 246, 0.3); }
            #imagination-panel .ip-btn-subtitle.active { background: linear-gradient(135deg, #3b82f6, #2563eb); color: white; }
            #imagination-panel .ip-btn-kanpe { background: linear-gradient(135deg, #f59e0b, #d97706); color: white; }
            #imagination-panel .ip-btn-capture { background: linear-gradient(135deg, #ec4899, #db2777); color: white; }
            #imagination-panel .ip-input { width: 100%; padding: 8px 10px; border: 1px solid rgba(255, 255, 255, 0.2); border-radius: 6px; background: rgba(0, 0, 0, 0.3); color: white; font-size: 11px; outline: none; }
            #imagination-panel .ip-input:focus { border-color: #a78bfa; }
            #imagination-panel .ip-style-presets { display: flex; flex-wrap: wrap; gap: 4px; margin-top: 8px; }
            #imagination-panel .ip-preset-btn { padding: 4px 8px; border: 1px solid rgba(167, 139, 250, 0.3); border-radius: 4px; background: rgba(167, 139, 250, 0.1); color: #a78bfa; font-size: 10px; cursor: pointer; transition: all 0.2s; }
            #imagination-panel .ip-preset-btn:hover { background: rgba(167, 139, 250, 0.3); border-color: #a78bfa; }
            #imagination-panel .ip-preset-btn.active { background: #8b5cf6; color: white; border-color: #8b5cf6; }
            #imagination-panel .ip-status { font-size: 10px; color: #6b7280; text-align: center; padding: 4px; }
            #imagination-panel .ip-status.generating { color: #a78bfa; }
            #imagination-panel .ip-status.success { color: #4ade80; }
            #imagination-panel .ip-status.error { color: #f87171; }
            #imagination-panel .ip-log-list { max-height: 150px; overflow-y: auto; display: flex; flex-direction: column; gap: 4px; }
            #imagination-panel .ip-log-item { padding: 6px 8px; background: rgba(255, 255, 255, 0.05); border-radius: 4px; cursor: pointer; font-size: 10px; color: #9ca3af; transition: all 0.2s; display: flex; align-items: flex-start; gap: 6px; }
            #imagination-panel .ip-log-item:hover { background: rgba(139, 92, 246, 0.2); color: white; }
            #imagination-panel .ip-log-item.selected { background: rgba(139, 92, 246, 0.3); border: 1px solid rgba(139, 92, 246, 0.5); color: white; }
            #imagination-panel .ip-log-char { font-weight: bold; color: #a78bfa; min-width: 50px; }
            #imagination-panel .ip-log-text { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
            #imagination-panel .ip-cache-list { max-height: 100px; overflow-y: auto; display: flex; flex-direction: column; gap: 2px; }
            #imagination-panel .ip-cache-item { padding: 4px 6px; background: rgba(0, 0, 0, 0.2); border-radius: 3px; font-size: 9px; display: flex; justify-content: space-between; align-items: center; }
            #imagination-panel .ip-cache-status { padding: 2px 4px; border-radius: 2px; font-size: 8px; }
            #imagination-panel .ip-cache-status.generating { background: #f59e0b; color: #000; }
            #imagination-panel .ip-cache-status.ready { background: #10b981; color: #fff; }
            #imagination-panel .ip-cache-status.displayed { background: #4ade80; color: #000; }
            #imagination-panel .ip-kanpe-preview { margin-top: 8px; padding: 8px; background: rgba(245, 158, 11, 0.1); border: 1px solid rgba(245, 158, 11, 0.3); border-radius: 6px; display: none; }
            #imagination-panel .ip-kanpe-preview.visible { display: block; }
            #imagination-panel .ip-kanpe-preview img { max-width: 100%; max-height: 100px; border-radius: 4px; }
        `;
        document.head.appendChild(style);
    }
    
    setupWipeDragAndResize() {
        const header = this.wipeContainer.querySelector('.wipe-header');
        const resizeHandle = this.wipeContainer.querySelector('.wipe-resize-handle');
        const imageContainer = this.wipeContainer.querySelector('.wipe-image-container');
        
        // ヘッダー左クリックでドラッグ
        header.addEventListener('mousedown', (e) => {
            if (e.button !== 0) return;
            this.isDragging = true;
            this.dragOffset = { x: e.clientX - this.wipeContainer.offsetLeft, y: e.clientY - this.wipeContainer.offsetTop };
            e.preventDefault();
        });
        
        // ★ 画像部分右クリックでドラッグ（ふきだしモード用）
        imageContainer.addEventListener('mousedown', (e) => {
            if (e.button !== 2) return; // 右クリックのみ
            this.isDragging = true;
            this.dragOffset = { x: e.clientX - this.wipeContainer.offsetLeft, y: e.clientY - this.wipeContainer.offsetTop };
            e.preventDefault();
        });
        
        // 右クリックメニューを無効化（ドラッグ中のみ）
        imageContainer.addEventListener('contextmenu', (e) => {
            if (this.bubbleMaskEnabled) {
                e.preventDefault();
            }
        });
        
        resizeHandle.addEventListener('mousedown', (e) => {
            if (e.button !== 0) return;
            this.isResizing = true;
            e.preventDefault();
            e.stopPropagation();
        });
        
        document.addEventListener('mousemove', (e) => {
            if (this.isDragging) {
                this.wipeContainer.style.left = (e.clientX - this.dragOffset.x) + 'px';
                this.wipeContainer.style.top = (e.clientY - this.dragOffset.y) + 'px';
            }
            if (this.isResizing) {
                const rect = this.wipeContainer.getBoundingClientRect();
                this.wipeContainer.style.width = Math.max(200, e.clientX - rect.left) + 'px';
                this.wipeContainer.style.height = Math.max(150, e.clientY - rect.top) + 'px';
            }
        });
        
        document.addEventListener('mouseup', () => { this.isDragging = false; this.isResizing = false; });
    }
    
    setupWipeButtons() {
        const closeBtn = this.wipeContainer.querySelector('.wipe-btn-close');
        const minimizeBtn = this.wipeContainer.querySelector('.wipe-btn-minimize');
        const collapseBtn = this.wipeContainer.querySelector('#wipe-collapse-btn');
        
        closeBtn.addEventListener('click', () => this.hideWipe());
        minimizeBtn.addEventListener('click', () => {
            this.toggleCollapse();
        });
        
        // ★ v3.4: 折りたたみボタン（常に表示、ふきだしモードでも使える）
        if (collapseBtn) {
            collapseBtn.addEventListener('click', () => {
                this.toggleCollapse();
            });
        }
    }
    
    /**
     * ★ v3.4: 折りたたみ切り替え
     */
    toggleCollapse() {
        const isCollapsed = this.wipeContainer.classList.toggle('collapsed');
        const minimizeBtn = this.wipeContainer.querySelector('.wipe-btn-minimize');
        const collapseBtn = this.wipeContainer.querySelector('#wipe-collapse-btn');
        
        if (minimizeBtn) {
            minimizeBtn.textContent = isCollapsed ? '□' : '−';
        }
        if (collapseBtn) {
            collapseBtn.textContent = isCollapsed ? '▲' : '▼';
        }
        
        console.log(`💭 想像ワイプ: ${isCollapsed ? '折りたたみ' : '展開'}`);
    }
    
    setupSubtitleRightClick() {
        if (!this.subtitleElement) return;
        this.subtitleElement.addEventListener('contextmenu', (e) => { e.preventDefault(); this.toggleSubtitleWithNotification(); });
        const imageContainer = this.wipeContainer.querySelector('.wipe-image-container');
        if (imageContainer) imageContainer.addEventListener('contextmenu', (e) => { e.preventDefault(); this.toggleSubtitleWithNotification(); });
    }
    
    toggleSubtitleWithNotification() {
        this.subtitleEnabled = !this.subtitleEnabled;
        this.toggleSubtitle(this.subtitleEnabled);
        
        const subtitleToggleBtn = this.panel?.querySelector('#ip-subtitle-toggle');
        if (subtitleToggleBtn) {
            subtitleToggleBtn.classList.toggle('active', this.subtitleEnabled);
            subtitleToggleBtn.innerHTML = this.subtitleEnabled ? '<span>💬</span> 字幕表示 ON' : '<span>💬</span> 字幕表示 OFF';
        }
        
        const notification = document.createElement('div');
        notification.innerHTML = this.subtitleEnabled ? '💬 字幕 ON' : '🔇 字幕 OFF';
        notification.style.cssText = `position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); background: ${this.subtitleEnabled ? 'rgba(59, 130, 246, 0.9)' : 'rgba(107, 114, 128, 0.9)'}; color: white; padding: 16px 32px; border-radius: 12px; font-size: 18px; font-weight: bold; z-index: 99999; pointer-events: none; animation: iwNotificationFade 1.5s ease-out forwards;`;
        document.body.appendChild(notification);
        setTimeout(() => notification.remove(), 1500);
    }
    
    // ========================================
    // コントロールパネル
    // ========================================
    createControlPanel() {
        this.panel = document.createElement('div');
        this.panel.id = 'imagination-panel';
        this.panel.innerHTML = `
            <div class="ip-header"><span class="ip-title">💭 想像ワイプ v3.6</span><button class="ip-close">×</button></div>
            <div class="ip-body">
                <div class="ip-status" id="ip-status">準備完了</div>
                
                <!-- ★ v3.5: 監視対象選択 -->
                <div class="ip-section" style="border: 2px solid #f59e0b;">
                    <div class="ip-section-title">👁️ 監視対象</div>
                    <select class="ip-select" id="ip-watch-target" style="width:100%; padding:8px; background:rgba(0,0,0,0.5); color:white; border:1px solid rgba(255,255,255,0.2); border-radius:6px;">
                        <option value="multi">🎭 マルチキャラ会話</option>
                        <option value="single">🎤 AIチャット（Grok）</option>
                    </select>
                    <div style="font-size: 9px; color: #6b7280; margin-top: 4px;">監視対象の会話から自動で画像生成</div>
                </div>
                
                <!-- ★ v3.6: 画像生成エンジン選択 -->
                <div class="ip-section" style="border: 2px solid #10b981;">
                    <div class="ip-section-title">🖼️ 画像生成エンジン</div>
                    <select class="ip-select" id="ip-image-provider" style="width:100%; padding:8px; background:rgba(0,0,0,0.5); color:white; border:1px solid rgba(255,255,255,0.2); border-radius:6px;">
                        <option value="gemini">✨ Gemini (API課金あり)</option>
                        <option value="comfyui">🖥️ ComfyUI (ローカル・無料)</option>
                    </select>
                    <div id="ip-comfyui-settings" style="display:none; margin-top:8px;">
                        <div style="font-size:10px; color:#10b981; margin-bottom:4px;">⚙️ ComfyUI設定</div>
                        <input type="text" id="ip-comfyui-checkpoint" placeholder="checkpoint名" value="animagine-xl-3.1.safetensors" style="width:100%; padding:4px 6px; background:rgba(0,0,0,0.4); color:white; border:1px solid rgba(255,255,255,0.15); border-radius:4px; font-size:10px; margin-bottom:4px;">
                        <div style="display:flex; gap:4px;">
                            <input type="number" id="ip-comfyui-steps" value="20" min="1" max="100" style="width:50%; padding:4px; background:rgba(0,0,0,0.4); color:white; border:1px solid rgba(255,255,255,0.15); border-radius:4px; font-size:10px;" title="Steps">
                            <input type="number" id="ip-comfyui-cfg" value="7" min="1" max="30" step="0.5" style="width:50%; padding:4px; background:rgba(0,0,0,0.4); color:white; border:1px solid rgba(255,255,255,0.15); border-radius:4px; font-size:10px;" title="CFG">
                        </div>
                        <div style="font-size:9px; color:#6b7280; margin-top:2px;">Steps / CFG</div>
                        <input type="text" id="ip-comfyui-negative" placeholder="ネガティブプロンプト" value="worst quality, low quality, blurry, deformed" style="width:100%; padding:4px 6px; background:rgba(0,0,0,0.4); color:white; border:1px solid rgba(255,255,255,0.15); border-radius:4px; font-size:10px; margin-top:4px;">
                        <div style="font-size:9px; color:#6b7280; margin-top:2px;">ネガティブプロンプト</div>
                    </div>
                    <div style="font-size: 9px; color: #6b7280; margin-top: 4px;">✨Gemini=API課金 / 🖼️ComfyUI=ローカルGPUで無料生成</div>
                </div>
                
                <div class="ip-section">
                    <div class="ip-section-title">🎨 画像スタイル</div>
                    <input type="text" id="ip-style-input" class="ip-input" placeholder="例: cinematic, manga..." value="anime illustration">
                    <div class="ip-style-presets">
                        <button class="ip-preset-btn" data-style="anime illustration, vibrant colors">アニメ</button>
                        <button class="ip-preset-btn" data-style="cinematic film style, dramatic lighting, photorealistic">映画</button>
                        <button class="ip-preset-btn" data-style="manga style, black and white, screentone">漫画</button>
                        <button class="ip-preset-btn" data-style="photorealistic, professional photography">実写</button>
                        <button class="ip-preset-btn" data-style="watercolor painting style">水彩</button>
                        <button class="ip-preset-btn" data-style="pixel art, retro game style">ドット</button>
                    </div>
                </div>
                <div class="ip-section" style="border: 2px solid #ec4899;">
                    <div class="ip-section-title">🗨️ ふきだしマスク (v3.3 動画対応)</div>
                    <button class="ip-btn ip-btn-bubble" id="ip-bubble-toggle"><span>🗨️</span> ふきだし OFF</button>
                    <button class="ip-btn ip-btn-secondary" id="ip-bubble-load" style="margin-top: 6px;"><span>📂</span> ふきだし読込（画像/動画）</button>
                    <input type="file" id="ip-bubble-input" accept="image/*,video/mp4,video/webm,video/ogg" style="display: none;">
                    <div id="ip-bubble-status" style="font-size: 9px; color: #a78bfa; margin-top: 4px; text-align: center;"></div>
                    <div style="font-size: 9px; color: #6b7280; margin-top: 6px; text-align: center;">🖱️ <strong>中ボタン（ホイールクリック）</strong>でワイプを閉じれます<br>🎬 動画(.mp4等)はループ再生されます</div>
                </div>
                <div class="ip-section" style="border: 2px solid #3b82f6;">
                    <div class="ip-section-title">📺 字幕オーバーレイ</div>
                    <button class="ip-btn ip-btn-subtitle" id="ip-subtitle-toggle"><span>💬</span> 字幕表示 OFF</button>
                </div>
                <div class="ip-section" style="border: 2px solid #22c55e;">
                    <div class="ip-section-title">🚀 パイプライン先読みモード</div>
                    <button class="ip-btn ip-btn-auto" id="ip-auto-toggle"><span>⚡</span> 先読みオート OFF</button>
                    <div class="ip-cache-list" id="ip-cache-list" style="margin-top: 8px;"><div style="color: #666; font-size: 9px; text-align: center;">キャッシュなし</div></div>
                </div>
                <div class="ip-section">
                    <div class="ip-section-title">🎨 今の会話から生成</div>
                    <button class="ip-btn ip-btn-primary" id="ip-generate-current"><span>✨</span> 今の会話を画像生成</button>
                </div>
                <div class="ip-section">
                    <div class="ip-section-title">📝 セリフを選んで生成</div>
                    <div class="ip-log-list" id="ip-log-list"><div style="color: #6b7280; font-size: 10px; text-align: center; padding: 20px;">会話が開始されると<br>ここにログが表示されます</div></div>
                    <button class="ip-btn ip-btn-secondary" id="ip-generate-selected" style="margin-top: 8px;"><span>🖼️</span> 選択したセリフで生成</button>
                </div>
                
                <!-- ★ v3.5: キャプチャーUI改造 -->
                <div class="ip-section" style="border: 2px solid #06b6d4;">
                    <div class="ip-section-title">📸 キャプチャーUI</div>
                    <button class="ip-btn ip-btn-capture" id="ip-capture-to-kanpe"><span>📷</span> キャプチャーして見せる</button>
                    <button class="ip-btn" id="ip-capture-to-grok-bbs" style="margin-top: 6px; background: linear-gradient(135deg, #06b6d4, #0891b2); color: white;"><span>👁️</span> キャプチャをGrok+BBSに見せる</button>
                </div>
                
                <!-- ★ v3.5: カンペ + Grok+BBS送信 -->
                <div class="ip-section" style="border: 2px solid #f59e0b;">
                    <div class="ip-section-title">📋 画像を見せる</div>
                    <button class="ip-btn ip-btn-kanpe" id="ip-send-to-kanpe"><span>📋</span> 現在の画像をカンペに送る</button>
                    <button class="ip-btn" id="ip-send-to-grok-bbs" style="margin-top: 6px; background: linear-gradient(135deg, #06b6d4, #0891b2); color: white;"><span>🖼️</span> 現在の画像をGrok+BBSに送る</button>
                    <button class="ip-btn ip-btn-secondary" id="ip-load-local-image" style="margin-top: 6px;"><span>📂</span> ローカル画像を読み込む</button>
                    <input type="file" id="ip-local-image-input" accept="image/*" style="display: none;">
                    <div class="ip-kanpe-preview" id="ip-kanpe-preview"><div class="ip-kanpe-preview-label">📷 送信予定の画像:</div><img id="ip-kanpe-preview-img" src="" alt="プレビュー"><div class="ip-kanpe-status" id="ip-kanpe-status">未送信</div></div>
                </div>
                <!-- ★ v3.7: 3D空間表示 -->
                <div class="ip-section" style="border: 2px solid #8b5cf6;">
                    <div class="ip-section-title">🞨 3D空間表示 (Screen TV風)</div>
                    <button class="ip-btn" id="ip-3d-toggle" style="background: rgba(139,92,246,0.2); color: #a78bfa; border: 1px solid rgba(139,92,246,0.3);"><span>🞨</span> 3D表示 OFF</button>
                    <div id="ip-3d-settings" style="display:none; margin-top:8px;">
                        <div style="font-size:10px; color:#a78bfa; margin-bottom:4px;">📏 サイズ</div>
                        <div style="display:flex; align-items:center; gap:4px; margin:3px 0;"><label style="min-width:30px; font-size:10px; color:#888;">幅</label><input type="range" id="ip-3d-width" min="0.3" max="5" step="0.1" value="1.6" style="flex:1; accent-color:#a78bfa;"><span id="ip-3d-width-val" style="min-width:30px; text-align:right; font-size:10px; color:#a78bfa;">1.6</span></div>
                        <div style="display:flex; align-items:center; gap:4px; margin:3px 0;"><label style="min-width:30px; font-size:10px; color:#888;">高さ</label><input type="range" id="ip-3d-height" min="0.2" max="4" step="0.1" value="0.9" style="flex:1; accent-color:#a78bfa;"><span id="ip-3d-height-val" style="min-width:30px; text-align:right; font-size:10px; color:#a78bfa;">0.9</span></div>
                        <div style="font-size:10px; color:#a78bfa; margin:6px 0 4px;">📍 位置</div>
                        <div style="display:flex; align-items:center; gap:4px; margin:3px 0;"><label style="min-width:30px; font-size:10px; color:#888;">X</label><input type="range" id="ip-3d-posX" min="-5" max="5" step="0.1" value="1.5" style="flex:1; accent-color:#a78bfa;"><span id="ip-3d-posX-val" style="min-width:30px; text-align:right; font-size:10px; color:#a78bfa;">1.5</span></div>
                        <div style="display:flex; align-items:center; gap:4px; margin:3px 0;"><label style="min-width:30px; font-size:10px; color:#888;">Y</label><input type="range" id="ip-3d-posY" min="0" max="5" step="0.1" value="1.8" style="flex:1; accent-color:#a78bfa;"><span id="ip-3d-posY-val" style="min-width:30px; text-align:right; font-size:10px; color:#a78bfa;">1.8</span></div>
                        <div style="display:flex; align-items:center; gap:4px; margin:3px 0;"><label style="min-width:30px; font-size:10px; color:#888;">Z</label><input type="range" id="ip-3d-posZ" min="-10" max="3" step="0.1" value="-2.0" style="flex:1; accent-color:#a78bfa;"><span id="ip-3d-posZ-val" style="min-width:30px; text-align:right; font-size:10px; color:#a78bfa;">-2.0</span></div>
                        <div style="display:flex; align-items:center; gap:4px; margin:3px 0;"><label style="min-width:30px; font-size:10px; color:#888;">回転</label><input type="range" id="ip-3d-rotY" min="-180" max="180" step="1" value="-20" style="flex:1; accent-color:#a78bfa;"><span id="ip-3d-rotY-val" style="min-width:30px; text-align:right; font-size:10px; color:#a78bfa;">-20°</span></div>
                        <div style="display:flex; align-items:center; gap:4px; margin:3px 0;"><label style="min-width:30px; font-size:10px; color:#888;">透明度</label><input type="range" id="ip-3d-opacity" min="0.1" max="1" step="0.05" value="1.0" style="flex:1; accent-color:#a78bfa;"><span id="ip-3d-opacity-val" style="min-width:30px; text-align:right; font-size:10px; color:#a78bfa;">1.0</span></div>
                        <div style="display:flex; align-items:center; gap:4px; margin:3px 0;"><label style="min-width:30px; font-size:10px; color:#888;">発光</label><input type="range" id="ip-3d-emissive" min="0" max="1" step="0.05" value="0.3" style="flex:1; accent-color:#a78bfa;"><span id="ip-3d-emissive-val" style="min-width:30px; text-align:right; font-size:10px; color:#a78bfa;">0.3</span></div>
                        <div style="display:flex; gap:4px; margin-top:6px;">
                            <button class="ip-btn ip-btn-secondary" id="ip-3d-reset" style="flex:1; font-size:10px;">🔄 リセット</button>
                            <button class="ip-btn ip-btn-secondary" id="ip-3d-remove" style="flex:1; font-size:10px;">🗑️ 削除</button>
                        </div>
                    </div>
                    <div style="font-size: 9px; color: #6b7280; margin-top: 4px;">想像画像を3D空間のTVモニター風に表示</div>
                </div>
                <div class="ip-section"><button class="ip-btn ip-btn-secondary" id="ip-toggle-wipe"><span>👁️</span> ワイプ表示切替</button></div>
            </div>
        `;
        
        this.panel.style.left = '320px';
        this.panel.style.top = '100px';
        document.body.appendChild(this.panel);
        
        this.setupPanelDrag();
        this.setupPanelButtons();
        
        // ★ v3.2.1: ページロード時に自動的にパネルを表示
        this.panel.style.display = 'block';
    }
    
    setupPanelDrag() {
        const header = this.panel.querySelector('.ip-header');
        let isDragging = false;
        let offset = { x: 0, y: 0 };
        
        header.addEventListener('mousedown', (e) => { isDragging = true; offset = { x: e.clientX - this.panel.offsetLeft, y: e.clientY - this.panel.offsetTop }; e.preventDefault(); });
        document.addEventListener('mousemove', (e) => { if (isDragging) { this.panel.style.left = (e.clientX - offset.x) + 'px'; this.panel.style.top = (e.clientY - offset.y) + 'px'; } });
        document.addEventListener('mouseup', () => { isDragging = false; });
    }
    
    setupPanelButtons() {
        this.panel.querySelector('.ip-close').addEventListener('click', () => this.hidePanel());
        this.panel.querySelector('#ip-generate-current').addEventListener('click', () => this.generateFromCurrentConversation());
        this.panel.querySelector('#ip-generate-selected').addEventListener('click', () => this.generateFromSelectedLog());
        
        // ★ v3.5: 監視対象選択
        const watchTargetSelect = this.panel.querySelector('#ip-watch-target');
        watchTargetSelect.value = this.watchTarget;
        watchTargetSelect.addEventListener('change', (e) => {
            this.watchTarget = e.target.value;
            this.saveWatchTargetSetting();
            this.updateStatus(`👁️ 監視対象: ${this.watchTarget === 'multi' ? 'マルチキャラ会話' : 'AIチャット（Grok）'}`, 'success');
        });
        
        // ★ v3.6: 画像生成エンジン選択
        const imageProviderSelect = this.panel.querySelector('#ip-image-provider');
        const comfyuiSettings = this.panel.querySelector('#ip-comfyui-settings');
        if (imageProviderSelect) {
            imageProviderSelect.value = this.imageProvider;
            comfyuiSettings.style.display = this.imageProvider === 'comfyui' ? 'block' : 'none';
            
            imageProviderSelect.addEventListener('change', (e) => {
                this.imageProvider = e.target.value;
                comfyuiSettings.style.display = this.imageProvider === 'comfyui' ? 'block' : 'none';
                this.saveImageProviderSetting();
                const label = this.imageProvider === 'comfyui' ? '🖼️ ComfyUI (ローカル)' : '✨ Gemini (API)';
                this.updateStatus(`🖼️ 画像エンジン: ${label}`, 'success');
            });
            
            // ComfyUI設定値の反映と保存
            const cpInput = this.panel.querySelector('#ip-comfyui-checkpoint');
            const stepsInput = this.panel.querySelector('#ip-comfyui-steps');
            const cfgInput = this.panel.querySelector('#ip-comfyui-cfg');
            const negInput = this.panel.querySelector('#ip-comfyui-negative');
            
            if (cpInput) cpInput.value = this.comfyuiConfig.checkpoint;
            if (stepsInput) stepsInput.value = this.comfyuiConfig.steps;
            if (cfgInput) cfgInput.value = this.comfyuiConfig.cfg;
            if (negInput) negInput.value = this.comfyuiConfig.negativePrompt;
            
            const saveComfyConfig = () => {
                if (cpInput) this.comfyuiConfig.checkpoint = cpInput.value;
                if (stepsInput) this.comfyuiConfig.steps = parseInt(stepsInput.value) || 20;
                if (cfgInput) this.comfyuiConfig.cfg = parseFloat(cfgInput.value) || 7;
                if (negInput) this.comfyuiConfig.negativePrompt = negInput.value;
                this.saveImageProviderSetting();
            };
            [cpInput, stepsInput, cfgInput, negInput].forEach(el => {
                if (el) el.addEventListener('change', saveComfyConfig);
            });
        }
        
        const subtitleToggleBtn = this.panel.querySelector('#ip-subtitle-toggle');
        subtitleToggleBtn.addEventListener('click', () => {
            this.subtitleEnabled = !this.subtitleEnabled;
            this.toggleSubtitle(this.subtitleEnabled);
            subtitleToggleBtn.classList.toggle('active', this.subtitleEnabled);
            subtitleToggleBtn.innerHTML = this.subtitleEnabled ? '<span>💬</span> 字幕表示 ON' : '<span>💬</span> 字幕表示 OFF';
        });
        if (this.subtitleEnabled) { subtitleToggleBtn.classList.add('active'); subtitleToggleBtn.innerHTML = '<span>💬</span> 字幕表示 ON'; }
        
        const bubbleToggleBtn = this.panel.querySelector('#ip-bubble-toggle');
        bubbleToggleBtn.addEventListener('click', () => {
            if (!this.bubbleMaskUrl) { this.updateStatus('⚠️ ふきだし画像を先に読み込んでください', 'error'); return; }
            this.bubbleMaskEnabled = !this.bubbleMaskEnabled;
            this.toggleBubbleMask(this.bubbleMaskEnabled);
            bubbleToggleBtn.classList.toggle('active', this.bubbleMaskEnabled);
            bubbleToggleBtn.innerHTML = this.bubbleMaskEnabled ? '<span>🗨️</span> ふきだし ON' : '<span>🗨️</span> ふきだし OFF';
        });
        if (this.bubbleMaskEnabled && this.bubbleMaskUrl) { 
            bubbleToggleBtn.classList.add('active'); 
            const typeIcon = this.bubbleMaskType === 'video' ? '🎬' : '🗨️';
            bubbleToggleBtn.innerHTML = `<span>${typeIcon}</span> ふきだし ON`; 
        }
        // 初期ステータス表示
        setTimeout(() => {
            const statusEl = this.panel.querySelector('#ip-bubble-status');
            if (statusEl && this.bubbleMaskUrl) {
                const typeLabel = this.bubbleMaskType === 'video' ? '動画' : '画像';
                statusEl.textContent = `✅ ${typeLabel}マスク読込済`;
            }
        }, 500);
        
        const bubbleLoadBtn = this.panel.querySelector('#ip-bubble-load');
        const bubbleInput = this.panel.querySelector('#ip-bubble-input');
        bubbleLoadBtn.addEventListener('click', () => bubbleInput.click());
        bubbleInput.addEventListener('change', (e) => { 
            if (e.target.files[0]) {
                this.setBubbleMaskFromFile(e.target.files[0]);
                // ステータス更新
                const statusEl = this.panel.querySelector('#ip-bubble-status');
                if (statusEl) {
                    const file = e.target.files[0];
                    const isVideo = file.type.startsWith('video/');
                    statusEl.textContent = `📎 ${file.name} (${isVideo ? '動画' : '画像'})`;
                }
            }
            bubbleInput.value = ''; 
        });
        
        const autoToggleBtn = this.panel.querySelector('#ip-auto-toggle');
        autoToggleBtn.addEventListener('click', () => {
            this.isAutoMode = !this.isAutoMode;
            autoToggleBtn.classList.toggle('active', this.isAutoMode);
            autoToggleBtn.innerHTML = this.isAutoMode ? '<span>⚡</span> 先読みオート ON' : '<span>⚡</span> 先読みオート OFF';
            if (this.isAutoMode) { this.updateStatus('🚀 パイプライン先読みモード ON', 'success'); this.showWipe(); this.updateCacheDisplay(); }
            else { this.updateStatus('先読みオート OFF', ''); this.pipelineImageCache.clear(); }
        });
        
        this.panel.querySelector('#ip-toggle-wipe').addEventListener('click', () => { this.wipeContainer.style.display === 'none' ? this.showWipe() : this.hideWipe(); });
        this.panel.querySelector('#ip-send-to-kanpe').addEventListener('click', () => this.sendCurrentImageToKanpe());
        this.panel.querySelector('#ip-capture-to-kanpe').addEventListener('click', () => this.startCaptureMode('kanpe'));
        
        // ★ v3.5: 新ボタン - キャプチャをGrok+BBSに見せる
        this.panel.querySelector('#ip-capture-to-grok-bbs').addEventListener('click', () => this.startCaptureMode('grok-bbs'));
        
        // ★ v3.5: 新ボタン - 現在の画像をGrok+BBSに送る
        this.panel.querySelector('#ip-send-to-grok-bbs').addEventListener('click', () => {
            if (!this.currentImage) { this.updateStatus('送信する画像がありません', 'error'); return; }
            this.sendImageToGrokAndBBS(this.currentImage, 'AI生成画像');
        });
        
        const loadLocalImageBtn = this.panel.querySelector('#ip-load-local-image');
        const localImageInput = this.panel.querySelector('#ip-local-image-input');
        loadLocalImageBtn.addEventListener('click', () => localImageInput.click());
        localImageInput.addEventListener('change', (e) => { this.loadLocalImage(e.target.files[0]); localImageInput.value = ''; });
        
        const styleInput = this.panel.querySelector('#ip-style-input');
        const presetBtns = this.panel.querySelectorAll('.ip-preset-btn');
        styleInput.addEventListener('input', (e) => { this.imageStyle = e.target.value || 'anime illustration'; presetBtns.forEach(btn => btn.classList.remove('active')); });
        presetBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                this.imageStyle = btn.dataset.style;
                styleInput.value = btn.dataset.style;
                presetBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
            });
        });
        presetBtns[0]?.classList.add('active');
        
        // ★ v3.7: 3D空間表示イベント
        this._setup3DPanelEvents();
        
        setInterval(() => { if (this.isAutoMode && this.panel.style.display !== 'none') this.updateCacheDisplay(); }, 500);
    }
    
    updateCacheDisplay() {
        const cacheList = this.panel.querySelector('#ip-cache-list');
        if (!cacheList) return;
        if (this.pipelineImageCache.size === 0) { cacheList.innerHTML = '<div style="color: #666; font-size: 9px; text-align: center;">キャッシュなし</div>'; return; }
        const statusLabels = { 'generating': '生成中', 'ready': '準備完了', 'displayed': '表示済', 'error': 'エラー' };
        let html = '';
        for (const [entryId, cached] of this.pipelineImageCache.entries()) {
            html += `<div class="ip-cache-item"><span>${cached.speakerName || '?'}</span><span class="ip-cache-status ${cached.status}">${statusLabels[cached.status] || cached.status}</span></div>`;
        }
        cacheList.innerHTML = html;
    }
    
    // ========================================
    // キャプチャーモード
    // ========================================
    startCaptureMode(sendTarget = 'kanpe') {
        if (this.isCapturing) return;
        this.isCapturing = true;
        this.captureSendTarget = sendTarget; // v3.5: 送信先を記録
        this.panel.style.display = 'none';
        
        this.captureOverlay = document.createElement('div');
        this.captureOverlay.className = 'iw-capture-overlay';
        document.body.appendChild(this.captureOverlay);
        
        this.captureBox = document.createElement('div');
        this.captureBox.className = 'iw-capture-box';
        this.captureBox.style.display = 'none';
        document.body.appendChild(this.captureBox);
        
        this.captureHint = document.createElement('div');
        this.captureHint.className = 'iw-capture-hint';
        this.captureHint.innerHTML = '📷 ドラッグして範囲を選択！<small>キャラに見せたい画像をキャプチャ<br>ESCでキャンセル</small>';
        document.body.appendChild(this.captureHint);
        
        this.captureOverlay.addEventListener('mousedown', (e) => this.onCaptureMouseDown(e));
        this.captureOverlay.addEventListener('mousemove', (e) => this.onCaptureMouseMove(e));
        this.captureOverlay.addEventListener('mouseup', (e) => this.onCaptureMouseUp(e));
        
        this.captureEscHandler = (e) => { if (e.key === 'Escape') this.endCaptureMode(); };
        document.addEventListener('keydown', this.captureEscHandler);
        if (window.app && window.app.controls) window.app.controls.enabled = false;
    }
    
    endCaptureMode() {
        this.isCapturing = false;
        this.isCaptureDrawing = false;
        if (this.captureOverlay) { this.captureOverlay.remove(); this.captureOverlay = null; }
        if (this.captureBox) { this.captureBox.remove(); this.captureBox = null; }
        if (this.captureHint) { this.captureHint.remove(); this.captureHint = null; }
        if (this.captureEscHandler) { document.removeEventListener('keydown', this.captureEscHandler); this.captureEscHandler = null; }
        if (window.app && window.app.controls) window.app.controls.enabled = true;
        this.panel.style.display = 'block';
    }
    
    onCaptureMouseDown(e) {
        if (!this.isCapturing) return;
        this.isCaptureDrawing = true;
        this.captureStartX = e.clientX;
        this.captureStartY = e.clientY;
        if (this.captureHint) { this.captureHint.remove(); this.captureHint = null; }
        this.captureBox.style.left = this.captureStartX + 'px';
        this.captureBox.style.top = this.captureStartY + 'px';
        this.captureBox.style.width = '0';
        this.captureBox.style.height = '0';
        this.captureBox.style.display = 'block';
    }
    
    onCaptureMouseMove(e) {
        if (!this.isCaptureDrawing || !this.captureBox) return;
        const x = Math.min(this.captureStartX, e.clientX);
        const y = Math.min(this.captureStartY, e.clientY);
        this.captureBox.style.left = x + 'px';
        this.captureBox.style.top = y + 'px';
        this.captureBox.style.width = Math.abs(e.clientX - this.captureStartX) + 'px';
        this.captureBox.style.height = Math.abs(e.clientY - this.captureStartY) + 'px';
    }
    
    async onCaptureMouseUp(e) {
        if (!this.isCaptureDrawing) return;
        this.isCaptureDrawing = false;
        
        const x = Math.min(this.captureStartX, e.clientX);
        const y = Math.min(this.captureStartY, e.clientY);
        const w = Math.abs(e.clientX - this.captureStartX);
        const h = Math.abs(e.clientY - this.captureStartY);
        
        if (w < 30 || h < 30) { this.endCaptureMode(); return; }
        
        if (this.captureOverlay) { this.captureOverlay.remove(); this.captureOverlay = null; }
        if (this.captureBox) { this.captureBox.remove(); this.captureBox = null; }
        
        await new Promise(r => setTimeout(r, 100));
        
        try {
            const imageData = await this.captureScreenRegion(x, y, w, h);
            if (imageData) {
                this.displayImage(imageData, 'スクリーンキャプチャ');
                this.showWipe();
                
                // ★ v3.5: 送信先に応じて処理を分岐
                if (this.captureSendTarget === 'grok-bbs') {
                    this.sendImageToGrokAndBBS(imageData, 'スクリーンキャプチャ画像');
                    this.updateStatus('✅ キャプチャしてGrok+BBSに送信しました！', 'success');
                } else {
                    this.sendImageToKanpe(imageData, 'スクリーンキャプチャ画像');
                    this.updateStatus('✅ キャプチャしてカンペに送信しました！', 'success');
                }
            }
        } catch (err) { this.updateStatus('キャプチャに失敗しました', 'error'); }
        
        this.isCapturing = false;
        if (this.captureEscHandler) { document.removeEventListener('keydown', this.captureEscHandler); this.captureEscHandler = null; }
        if (window.app && window.app.controls) window.app.controls.enabled = true;
        this.panel.style.display = 'block';
    }
    
    async captureScreenRegion(x, y, w, h) {
        const threeCanvas = document.querySelector('#canvas-container canvas') || document.querySelector('canvas');
        if (!threeCanvas) throw new Error('Canvasが見つかりません');
        
        let sourceCanvas = threeCanvas;
        if (window.app && window.app.renderer) {
            if (window.app.scene && window.app.camera) window.app.renderer.render(window.app.scene, window.app.camera);
            sourceCanvas = window.app.renderer.domElement;
        }
        
        const fullImageData = sourceCanvas.toDataURL('image/jpeg', 0.9);
        const rect = sourceCanvas.getBoundingClientRect();
        const scaleX = sourceCanvas.width / rect.width;
        const scaleY = sourceCanvas.height / rect.height;
        const srcX = Math.max(0, (x - rect.left) * scaleX);
        const srcY = Math.max(0, (y - rect.top) * scaleY);
        
        const cropCanvas = document.createElement('canvas');
        cropCanvas.width = w;
        cropCanvas.height = h;
        const ctx = cropCanvas.getContext('2d');
        
        const img = new Image();
        img.src = fullImageData;
        await new Promise((resolve, reject) => { img.onload = resolve; img.onerror = reject; });
        ctx.drawImage(img, srcX, srcY, w * scaleX, h * scaleY, 0, 0, w, h);
        
        return cropCanvas.toDataURL('image/jpeg', 0.85);
    }
    
    // ========================================
    // ローカル画像読み込み
    // ========================================
    loadLocalImage(file) {
        if (!file || !file.type.startsWith('image/')) { this.updateStatus('画像ファイルを選択してください', 'error'); return; }
        this.updateStatus('画像を読み込み中...', 'generating');
        const reader = new FileReader();
        reader.onload = (e) => {
            this.displayImage(e.target.result, `ローカル画像: ${file.name}`);
            this.showWipe();
            this.sendImageToKanpe(e.target.result, `ローカル画像 (${file.name})`);
            this.updateStatus(`✅ 「${file.name}」を読み込みカンペに送信しました！`, 'success');
        };
        reader.onerror = () => { this.updateStatus('画像の読み込みに失敗しました', 'error'); };
        reader.readAsDataURL(file);
    }
    
    // ========================================
    // カンペ送信
    // ========================================
    sendCurrentImageToKanpe() {
        if (!this.currentImage) { this.updateStatus('送信する画像がありません', 'error'); return; }
        this.sendImageToKanpe(this.currentImage, 'AI生成画像');
    }
    
    sendImageToKanpe(imageDataUrl, description = '画像') {
        const previewContainer = this.panel.querySelector('#ip-kanpe-preview');
        const previewImg = this.panel.querySelector('#ip-kanpe-preview-img');
        const previewStatus = this.panel.querySelector('#ip-kanpe-status');
        
        previewImg.src = imageDataUrl;
        previewContainer.classList.add('visible');
        previewStatus.textContent = '送信中...';
        
        const kanpeTextarea = document.getElementById('mc-system-note');
        if (kanpeTextarea) {
            window.kanpeImageData = imageDataUrl;
            window.kanpeImageDescription = description;
            const currentKanpe = kanpeTextarea.value;
            const imageNote = `\n\n【📷 カンペ画像あり】${description}\n※この画像についてコメントしてください。`;
            if (currentKanpe.includes('【📷 カンペ画像あり】')) {
                kanpeTextarea.value = currentKanpe.replace(/\n\n【📷 カンペ画像あり】.*\n※この画像についてコメントしてください。/g, imageNote);
            } else {
                kanpeTextarea.value = currentKanpe + imageNote;
            }
            previewStatus.textContent = '✅ カンペに送信完了！';
            this.updateStatus('✅ カンペに画像を送信しました！', 'success');
        } else {
            previewStatus.textContent = '❌ マルチキャラUIが見つかりません';
            this.updateStatus('マルチキャラUIが見つかりません', 'error');
        }
    }
    
    // ========================================
    // キーボードショートカット
    // ========================================
    // ========================================
    // ★ v3.7: 3D空間表示機能
    // ========================================
    _load3DConfig() {
        try {
            const saved = localStorage.getItem('imagination-wipe-3d-config');
            if (saved) Object.assign(this.screen3DConfig, JSON.parse(saved));
        } catch(e) {}
    }
    
    _save3DConfig() {
        try {
            localStorage.setItem('imagination-wipe-3d-config', JSON.stringify(this.screen3DConfig));
        } catch(e) {}
    }
    
    _create3DScreen() {
        const scene = (window.app || window.vrm_app)?.scene;
        if (!scene) { console.warn('🞨 3D Screen: シーンが見つかりません'); return; }
        
        // 既存削除
        this._remove3DScreen();
        
        const cfg = this.screen3DConfig;
        this.screen3DGroup = new THREE.Group();
        this.screen3DGroup.name = 'ImaginationScreen3D';
        
        // スクリーン（画像が映るPlane）
        const screenGeo = new THREE.PlaneGeometry(cfg.width, cfg.height);
        const screenMat = new THREE.MeshStandardMaterial({
            color: 0x111111,
            side: THREE.FrontSide,
            transparent: true,
            opacity: cfg.opacity,
            emissive: 0x8b5cf6,
            emissiveIntensity: cfg.emissive,
            roughness: 0.3,
            metalness: 0.1,
        });
        this.screen3DMesh = new THREE.Mesh(screenGeo, screenMat);
        this.screen3DMesh.name = 'ImaginationScreen3D_Screen';
        this.screen3DGroup.add(this.screen3DMesh);
        
        // フレーム（背面板）
        const fw = 0.03;
        const frameGeo = new THREE.PlaneGeometry(cfg.width + fw * 2, cfg.height + fw * 2);
        const frameMat = new THREE.MeshStandardMaterial({
            color: 0x222222,
            roughness: 0.3,
            metalness: 0.8,
        });
        this.screen3DFrame = new THREE.Mesh(frameGeo, frameMat);
        this.screen3DFrame.position.z = -0.005;
        this.screen3DFrame.name = 'ImaginationScreen3D_Frame';
        this.screen3DGroup.add(this.screen3DFrame);
        
        // 位置・回転
        this.screen3DGroup.position.set(cfg.posX, cfg.posY, cfg.posZ);
        this.screen3DGroup.rotation.y = cfg.rotY * Math.PI / 180;
        
        scene.add(this.screen3DGroup);
        
        // 現在の画像があればテクスチャ適用
        if (this.currentImage) {
            this._update3DTexture(this.currentImage);
        }
        
        console.log('🞨 3D Screen 作成完了');
    }
    
    _update3DTexture(imageUrl) {
        if (!this.screen3DMesh) return;
        
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
            if (this.screen3DTexture) this.screen3DTexture.dispose();
            this.screen3DTexture = new THREE.Texture(img);
            this.screen3DTexture.needsUpdate = true;
            this.screen3DTexture.colorSpace = THREE.SRGBColorSpace;
            
            this.screen3DMesh.material.dispose();
            this.screen3DMesh.material = new THREE.MeshStandardMaterial({
                map: this.screen3DTexture,
                side: THREE.FrontSide,
                transparent: true,
                opacity: this.screen3DConfig.opacity,
                emissive: 0xffffff,
                emissiveMap: this.screen3DTexture,
                emissiveIntensity: this.screen3DConfig.emissive,
                roughness: 0.3,
                metalness: 0.1,
                toneMapped: false,
            });
            
            console.log('🞨 3D Screen テクスチャ更新');
        };
        img.src = imageUrl;
    }
    
    _update3DTransform() {
        if (!this.screen3DGroup) return;
        const cfg = this.screen3DConfig;
        this.screen3DGroup.position.set(cfg.posX, cfg.posY, cfg.posZ);
        this.screen3DGroup.rotation.y = cfg.rotY * Math.PI / 180;
        this._save3DConfig();
    }
    
    _update3DSize() {
        if (!this.screen3DMesh || !this.screen3DFrame) return;
        const cfg = this.screen3DConfig;
        
        this.screen3DMesh.geometry.dispose();
        this.screen3DMesh.geometry = new THREE.PlaneGeometry(cfg.width, cfg.height);
        
        const fw = 0.03;
        this.screen3DFrame.geometry.dispose();
        this.screen3DFrame.geometry = new THREE.PlaneGeometry(cfg.width + fw * 2, cfg.height + fw * 2);
        
        this._save3DConfig();
    }
    
    _remove3DScreen() {
        const scene = (window.app || window.vrm_app)?.scene;
        if (this.screen3DGroup && scene) {
            scene.remove(this.screen3DGroup);
            if (this.screen3DMesh) {
                this.screen3DMesh.geometry.dispose();
                this.screen3DMesh.material.dispose();
            }
            if (this.screen3DFrame) {
                this.screen3DFrame.geometry.dispose();
                this.screen3DFrame.material.dispose();
            }
            if (this.screen3DTexture) this.screen3DTexture.dispose();
            this.screen3DGroup = null;
            this.screen3DMesh = null;
            this.screen3DFrame = null;
            this.screen3DTexture = null;
        }
        console.log('🞨 3D Screen 削除');
    }
    
    _setup3DPanelEvents() {
        const toggleBtn = this.panel.querySelector('#ip-3d-toggle');
        const settingsDiv = this.panel.querySelector('#ip-3d-settings');
        if (!toggleBtn) return;
        
        // トグル
        toggleBtn.addEventListener('click', () => {
            this.screen3DEnabled = !this.screen3DEnabled;
            toggleBtn.classList.toggle('active', this.screen3DEnabled);
            toggleBtn.style.background = this.screen3DEnabled ? 'linear-gradient(135deg, #8b5cf6, #6366f1)' : 'rgba(139,92,246,0.2)';
            toggleBtn.style.color = this.screen3DEnabled ? 'white' : '#a78bfa';
            toggleBtn.innerHTML = this.screen3DEnabled ? '<span>🞨</span> 3D表示 ON' : '<span>🞨</span> 3D表示 OFF';
            settingsDiv.style.display = this.screen3DEnabled ? 'block' : 'none';
            
            if (this.screen3DEnabled) {
                this._create3DScreen();
                this.updateStatus('🞨 3D空間表示 ON', 'success');
            } else {
                this._remove3DScreen();
                this.updateStatus('🞨 3D空間表示 OFF', '');
            }
        });
        
        // サイズスライダー
        const sizeKeys = ['width', 'height'];
        sizeKeys.forEach(key => {
            const slider = this.panel.querySelector(`#ip-3d-${key}`);
            const valSpan = this.panel.querySelector(`#ip-3d-${key}-val`);
            if (!slider) return;
            slider.value = this.screen3DConfig[key];
            valSpan.textContent = this.screen3DConfig[key];
            slider.addEventListener('input', () => {
                this.screen3DConfig[key] = parseFloat(slider.value);
                valSpan.textContent = this.screen3DConfig[key].toFixed(1);
                this._update3DSize();
            });
        });
        
        // 位置・回転スライダー
        const posKeys = ['posX', 'posY', 'posZ', 'rotY'];
        posKeys.forEach(key => {
            const slider = this.panel.querySelector(`#ip-3d-${key}`);
            const valSpan = this.panel.querySelector(`#ip-3d-${key}-val`);
            if (!slider) return;
            slider.value = this.screen3DConfig[key];
            valSpan.textContent = (key === 'rotY' ? this.screen3DConfig[key] + '°' : this.screen3DConfig[key].toFixed(1));
            slider.addEventListener('input', () => {
                this.screen3DConfig[key] = parseFloat(slider.value);
                valSpan.textContent = (key === 'rotY' ? this.screen3DConfig[key] + '°' : this.screen3DConfig[key].toFixed(1));
                this._update3DTransform();
            });
        });
        
        // 透明度
        const opacitySlider = this.panel.querySelector('#ip-3d-opacity');
        const opacityVal = this.panel.querySelector('#ip-3d-opacity-val');
        if (opacitySlider) {
            opacitySlider.value = this.screen3DConfig.opacity;
            opacityVal.textContent = this.screen3DConfig.opacity;
            opacitySlider.addEventListener('input', () => {
                this.screen3DConfig.opacity = parseFloat(opacitySlider.value);
                opacityVal.textContent = this.screen3DConfig.opacity.toFixed(2);
                if (this.screen3DMesh) this.screen3DMesh.material.opacity = this.screen3DConfig.opacity;
                this._save3DConfig();
            });
        }
        
        // 発光
        const emissiveSlider = this.panel.querySelector('#ip-3d-emissive');
        const emissiveVal = this.panel.querySelector('#ip-3d-emissive-val');
        if (emissiveSlider) {
            emissiveSlider.value = this.screen3DConfig.emissive;
            emissiveVal.textContent = this.screen3DConfig.emissive;
            emissiveSlider.addEventListener('input', () => {
                this.screen3DConfig.emissive = parseFloat(emissiveSlider.value);
                emissiveVal.textContent = this.screen3DConfig.emissive.toFixed(2);
                if (this.screen3DMesh) this.screen3DMesh.material.emissiveIntensity = this.screen3DConfig.emissive;
                this._save3DConfig();
            });
        }
        
        // リセット
        const resetBtn = this.panel.querySelector('#ip-3d-reset');
        if (resetBtn) {
            resetBtn.addEventListener('click', () => {
                this.screen3DConfig = { width: 1.6, height: 0.9, posX: 1.5, posY: 1.8, posZ: -2.0, rotY: -20, opacity: 1.0, emissive: 0.3 };
                this._save3DConfig();
                // スライダー更新
                [...sizeKeys, ...posKeys].forEach(key => {
                    const s = this.panel.querySelector(`#ip-3d-${key}`);
                    const v = this.panel.querySelector(`#ip-3d-${key}-val`);
                    if (s) { s.value = this.screen3DConfig[key]; v.textContent = (key === 'rotY' ? this.screen3DConfig[key] + '°' : this.screen3DConfig[key].toFixed ? this.screen3DConfig[key].toFixed(1) : this.screen3DConfig[key]); }
                });
                opacitySlider.value = this.screen3DConfig.opacity; opacityVal.textContent = this.screen3DConfig.opacity;
                emissiveSlider.value = this.screen3DConfig.emissive; emissiveVal.textContent = this.screen3DConfig.emissive;
                if (this.screen3DEnabled) { this._create3DScreen(); }
            });
        }
        
        // 削除
        const removeBtn = this.panel.querySelector('#ip-3d-remove');
        if (removeBtn) {
            removeBtn.addEventListener('click', () => {
                this.screen3DEnabled = false;
                this._remove3DScreen();
                toggleBtn.style.background = 'rgba(139,92,246,0.2)';
                toggleBtn.style.color = '#a78bfa';
                toggleBtn.innerHTML = '<span>🞨</span> 3D表示 OFF';
                settingsDiv.style.display = 'none';
                this.updateStatus('🞨 3D Screen 削除しました', '');
            });
        }
    }
    
    setupKeyboardShortcut() {
        document.addEventListener('keydown', (e) => {
            if (e.shiftKey && e.key.toLowerCase() === 'w') { e.preventDefault(); this.togglePanel(); }
        });
    }
    
    // ========================================
    // 会話ログ監視
    // ========================================
    setupConversationObserver() {
        const checkForLog = setInterval(() => {
            const logContainer = document.querySelector('#mc-conversation-log');
            if (logContainer) {
                clearInterval(checkForLog);
                const observer = new MutationObserver(() => this.updateLogList());
                observer.observe(logContainer, { childList: true, subtree: true });
            }
        }, 1000);
    }
    
    updateLogList() {
        const logContainer = document.querySelector('#mc-conversation-log');
        if (!logContainer) return;
        
        this.conversationLog = [];
        logContainer.querySelectorAll('.mc-log-entry').forEach((entry, index) => {
            const charSpan = entry.querySelector('.mc-log-speaker') || entry.querySelector('.mc-log-char');
            const textSpan = entry.querySelector('.mc-log-text');
            if (charSpan && textSpan) {
                this.conversationLog.push({ index, character: charSpan.textContent.replace(':', '').trim(), text: textSpan.textContent.trim() });
            }
        });
        
        const logList = this.panel.querySelector('#ip-log-list');
        if (logList && this.conversationLog.length > 0) {
            logList.innerHTML = this.conversationLog.map((entry, i) => `<div class="ip-log-item" data-index="${i}"><span class="ip-log-char">${entry.character}:</span><span class="ip-log-text">${entry.text}</span></div>`).join('');
            logList.querySelectorAll('.ip-log-item').forEach(item => {
                item.addEventListener('click', () => { logList.querySelectorAll('.ip-log-item').forEach(i => i.classList.remove('selected')); item.classList.add('selected'); });
            });
        }
    }
    
    // ========================================
    // 画像生成
    // ========================================
    async generateImage(text, character = '') {
        if (this.isGenerating) return;
        
        // ★ v3.6: プロバイダに応じてAPIキーチェックを分岐
        if (this.imageProvider === 'gemini') {
            this.apiKey = this.getGeminiApiKey();
            if (!this.apiKey) { this.updateStatus('Gemini APIキーが見つかりません', 'error'); return; }
        }
        
        this.isGenerating = true;
        this.showWipe();
        this.showLoading(true);
        const providerLabel = this.imageProvider === 'comfyui' ? 'ComfyUI' : 'Gemini';
        this.updateStatus(`シーンを分析中... (✅${providerLabel})`, 'generating');
        
        try {
            const sceneDescription = await this.analyzeSceneForImage(text, character);
            this.updateStatus(`画像を生成中... (✅${providerLabel})`, 'generating');
            
            // ★ v3.6: プロバイダ分岐
            let imageUrl;
            if (this.imageProvider === 'comfyui') {
                imageUrl = await this.callComfyUIImageAPI(sceneDescription);
            } else {
                imageUrl = await this.callGeminiImageAPI(sceneDescription);
            }
            
            if (imageUrl) { this.displayImage(imageUrl, sceneDescription); this.updateStatus(`生成完了！(✅${providerLabel})`, 'success'); }
            else throw new Error('画像URLが取得できませんでした');
        } catch (error) { this.updateStatus('エラー: ' + error.message, 'error'); }
        finally { this.isGenerating = false; this.showLoading(false); }
    }
    
    async analyzeSceneForImage(text, character) {
        const currentStyle = this.imageStyle || 'anime illustration';
        const cleanedText = text.replace(/^[^:：]+[:：]\s*/g, '').trim();
        
        const analysisPrompt = `あなたは「想像イラスト」を描くための指示書を作成するエキスパートです。
【入力セリフ】「${cleanedText}」
【タスク】上記のセリフから「視覚的に一番面白い要素」を抽出し、それをコミカルに誇張した1枚のイラスト指示を作成してください。
【出力形式】（英語のみ、説明文なし、1行で）
${currentStyle}, 16:9 aspect ratio, [誇張されたメイン要素], [コミカルな状況設定], vibrant colors, high quality`;
        
        try {
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${this.apiKey}`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ contents: [{ parts: [{ text: analysisPrompt }] }], generationConfig: { maxOutputTokens: 300, temperature: 0.7 } })
            });
            const data = await response.json();
            if (data.candidates && data.candidates[0] && data.candidates[0].content) {
                return data.candidates[0].content.parts[0].text.trim().replace(/\n+/g, ' ');
            }
        } catch (error) {}
        return `${currentStyle}, 16:9 aspect ratio, creative scene, vibrant colors, high quality`;
    }
    
    async callGeminiImageAPI(prompt) {
        try {
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3-pro-image-preview:generateContent?key=${this.apiKey}`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { responseModalities: ["TEXT", "IMAGE"] } })
            });
            const data = await response.json();
            if (data.candidates && data.candidates[0] && data.candidates[0].content) {
                for (const part of data.candidates[0].content.parts) {
                    if (part.inlineData && part.inlineData.data) {
                        return `data:${part.inlineData.mimeType || 'image/png'};base64,${part.inlineData.data}`;
                    }
                }
            }
        } catch (error) {}
        return this.generatePlaceholderImage(prompt);
    }
    
    generatePlaceholderImage(prompt) {
        const canvas = document.createElement('canvas');
        canvas.width = 512; canvas.height = 288;
        const ctx = canvas.getContext('2d');
        const gradient = ctx.createLinearGradient(0, 0, 512, 288);
        gradient.addColorStop(0, '#8b5cf6'); gradient.addColorStop(1, '#6366f1');
        ctx.fillStyle = gradient; ctx.fillRect(0, 0, 512, 288);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)'; ctx.font = 'bold 20px sans-serif'; ctx.textAlign = 'center';
        ctx.fillText('💭 想像中...', 256, 144);
        return canvas.toDataURL('image/png');
    }
    
    getGeminiApiKey() {
        try { const k = localStorage.getItem('gemini_imagen_api_key'); if (k) return k; } catch (e) {}
        if (window.imagen3ApiKey) return window.imagen3ApiKey;
        try { const k = localStorage.getItem('gemini_api_key'); if (k) return k; } catch (e) {}
        if (window.API_SETTINGS?.gemini?.apiKey) return window.API_SETTINGS.gemini.apiKey;
        const input = document.getElementById('mc-api-key-gemini'); if (input?.value) return input.value;
        return null;
    }
    
    // ========================================
    // UI更新
    // ========================================
    displayImage(imageUrl, caption) {
        const img = this.wipeContainer.querySelector('#wipe-image');
        const placeholder = this.wipeContainer.querySelector('#wipe-placeholder');
        const captionEl = this.wipeContainer.querySelector('#wipe-caption');
        
        // マスク状態をリセット
        img.dataset.masked = 'false';
        img.dataset.originalSrc = imageUrl;
        
        img.src = imageUrl;
        img.classList.add('visible');
        placeholder.classList.add('hidden');
        captionEl.textContent = caption.length > 60 ? caption.substring(0, 60) + '...' : caption;
        this.currentImage = imageUrl;
        
        // ★ ポップインアニメーション（サイズ0から1.5秒で拡大）
        this.playPopInAnimation();
        
        // ★ ふきだしマスクがONなら適用
        if (this.bubbleMaskEnabled && this.bubbleMaskUrl) {
            if (this.bubbleMaskType === 'video') {
                // ★ 動画マスクの場合: 合成ループを再開
                console.log('🎬 動画マスク: 新しい画像で合成再開');
                this.updateVideoMaskSource(imageUrl);
            } else {
                // 画像マスクの場合
                img.onload = () => {
                    this.applyCanvasMask(img);
                };
            }
        }
    }
    
    // ★ ポップインアニメーション（サイズ0から1.5秒でバウンス拡大）+ スローズーム
    playPopInAnimation() {
        // アニメーション用のkeyframesを追加
        if (!document.querySelector('#wipe-bounce-animation-style')) {
            const style = document.createElement('style');
            style.id = 'wipe-bounce-animation-style';
            style.textContent = `
                @keyframes wipeBounceIn {
                    0% {
                        transform: scale(0);
                        opacity: 0;
                    }
                    50% {
                        transform: scale(1.15);
                        opacity: 1;
                    }
                    70% {
                        transform: scale(0.9);
                    }
                    85% {
                        transform: scale(1.05);
                    }
                    100% {
                        transform: scale(1);
                    }
                }
                @keyframes wipeSlowZoomIn {
                    0% {
                        transform: scale(1);
                    }
                    100% {
                        transform: scale(1.22);
                    }
                }
                @keyframes wipeImageSlowZoomOut {
                    0% {
                        transform: scale(1.1);
                    }
                    100% {
                        transform: scale(1);
                    }
                }
            `;
            document.head.appendChild(style);
        }
        
        // アニメーションをリセット
        this.wipeContainer.style.animation = 'none';
        void this.wipeContainer.offsetWidth; // 強制リフロー
        
        // バウンスアニメーションを適用
        this.wipeContainer.style.transformOrigin = 'center center';
        this.wipeContainer.style.animation = 'wipeBounceIn 1.5s cubic-bezier(0.34, 1.56, 0.64, 1) forwards';
        
        // バウンス完了後にスローズーム開始
        setTimeout(() => {
            // UI: 100% → 110% に18秒かけて拡大
            this.wipeContainer.style.animation = 'wipeSlowZoomIn 18s ease-in-out forwards';
            
            // 画像: 110% → 100% に18秒かけて縮小
            this.startImageSlowZoom();
        }, 1500);
    }
    
    // ★ 画像のスローズームアウト（110% → 100%）
    startImageSlowZoom() {
        const img = this.wipeContainer.querySelector('#wipe-image');
        const canvas = this.wipeContainer.querySelector('#bubble-mask-canvas');
        
        // 動画マスクの場合はCanvas、そうでなければ画像に適用
        const target = canvas || img;
        if (target) {
            target.style.transformOrigin = 'center center';
            target.style.animation = 'wipeImageSlowZoomOut 18s ease-in-out forwards';
        }
    }
    
    showLoading(show) { this.wipeContainer.querySelector('#wipe-loading').classList.toggle('active', show); }
    updateStatus(message, type = '') { const status = this.panel.querySelector('#ip-status'); status.textContent = message; status.className = 'ip-status ' + type; }
    
    togglePanel() { this.panel.style.display === 'none' || this.panel.style.display === '' ? this.showPanel() : this.hidePanel(); }
    showPanel() { 
        this.panel.style.display = 'block'; 
        this.updateLogList(); 
        // ★ v3.5: UI管理パネルに通知
        if (window.uiManagerPanel) {
            window.uiManagerPanel.panelStates.set('imagination-panel', true);
            window.uiManagerPanel.updateUI();
        }
    }
    hidePanel() { 
        this.panel.style.display = 'none'; 
        // ★ v3.5: UI管理パネルに通知
        if (window.uiManagerPanel) {
            window.uiManagerPanel.panelStates.set('imagination-panel', false);
            window.uiManagerPanel.updateUI();
        }
    }
    showWipe() { 
        this.wipeContainer.style.display = 'flex'; 
        // ★ v3.5: UI管理パネルに通知
        if (window.uiManagerPanel) {
            window.uiManagerPanel.panelStates.set('imagination-wipe-container', true);
            window.uiManagerPanel.updateUI();
        }
    }
    hideWipe() { 
        this.wipeContainer.style.display = 'none'; 
        // ★ v3.5: UI管理パネルに通知
        if (window.uiManagerPanel) {
            window.uiManagerPanel.panelStates.set('imagination-wipe-container', false);
            window.uiManagerPanel.updateUI();
        }
    }
    
    generateFromCurrentConversation() {
        if (this.conversationLog.length === 0) { this.updateStatus('会話ログがありません', 'error'); return; }
        const latest = this.conversationLog[this.conversationLog.length - 1];
        this.generateImage(latest.text, latest.character);
    }
    
    generateFromSelectedLog() {
        const selected = this.panel.querySelector('.ip-log-item.selected');
        if (!selected) { this.updateStatus('セリフを選択してください', 'error'); return; }
        const entry = this.conversationLog[parseInt(selected.dataset.index)];
        if (entry) this.generateImage(entry.text, entry.character);
    }
}

window.ImaginationWipe = ImaginationWipe;

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => { window.imaginationWipe = new ImaginationWipe(); });
} else {
    window.imaginationWipe = new ImaginationWipe();
}

console.log('🎨 imagination-wipe-v3.6.js ロード完了（画像生成エンジン選択: Gemini/ComfyUI対応）');