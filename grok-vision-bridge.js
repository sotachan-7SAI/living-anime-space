// ========================================
// Grok Vision Bridge v2.5
// Grokが自分の目で画面を見て状況を把握するシステム
// 
// 3つのモード:
// ① capture_screen Function Call（Grokが見たい時に呼ぶ）
// ② イベント通知（オブジェクト生成、モーション変更時に自動テキスト注入）
// ③ 定期キャプチャ（ON/OFF可能）
// 
// ★ v2.0: 二重発話防止、イベント通知の安全な注入、重複ツール定義修正
// ★ v2.1: Visionプレビューオーバーレイ追加（Grokが見ている画像を表示）
// ★ v2.2: UIトグルボタン追加（Grok Voiceボタン横に配置、ON/OFF切替）
// ★ v2.3: 連続視界スライダー追加（0.2秒〜10秒間隔で自動キャプチャ）
// ★ v2.5: 「詳しく見る」1回限り高品質キャプチャボタン追加
// ========================================

class GrokVisionBridge {
    constructor() {
        this.apiKey = null;
        this.isRunning = false;
        this.periodicInterval = null;
        this.periodicIntervalMs = 30000;
        this.periodicEnabled = false;    // 定期キャプチャはデフォルトOFF
        this.lastCaptureTime = 0;
        this.captureCount = 0;
        
        // イベント通知用
        this.lastNotifiedState = '';
        this._pendingEvents = [];        // ★ v2.0: 保留中のイベント（応答中は貯める）
        this._isGrokResponding = false;  // ★ v2.0: Grokが応答中かフラグ
        this._eventDebounceTimer = null; // ★ v2.0: イベントデバウンス
        this._eventCooldownMs = 3000;    // ★ v2.0: イベント通知クールダウン（3秒）
        this._lastEventTime = 0;
        
        // Vision APIモデル
        this.visionModel = 'grok-2-vision-1212';
        
        // ★ v2.0: キャッシュ（短期間の再キャプチャ防止）
        this._lastAnalysis = null;
        this._lastAnalysisTime = 0;
        this._cacheValidMs = 5000;       // 5秒キャッシュ
        
        // ★ v2.1: プレビューオーバーレイ
        this.previewEnabled = false;
        this.previewOverlay = null;
        this._previewAnalysisText = '';
        
        // ★ v2.2: UIトグルボタン
        this._toggleBtn = null;
        
        // ★ v2.3: 連続視界
        this.continuousEnabled = false;
        this.continuousIntervalMs = 3000; // デフォルト3秒
        this.continuousTimer = null;
        this._continuousToggleBtn = null;
        this._continuousSlider = null;
        
        console.log('👁️ Grok Vision Bridge v2.3 初期化');
        
        // DOM準備後にトグルボタンを作成
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.createToggleButton());
        } else {
            // 少し遅延してGrok Voiceボタンの後に配置
            setTimeout(() => this.createToggleButton(), 2000);
        }
    }
    
    // ============================
    // 開始 / 停止
    // ============================
    
    start(apiKey, intervalMs = 30000) {
        this.apiKey = apiKey;
        this.periodicIntervalMs = intervalMs;
        this.isRunning = true;
        
        // イベントリスナーをセットアップ
        this.setupEventListeners();
        
        // 定期キャプチャが有効なら開始
        if (this.periodicEnabled) {
            this.startPeriodicCapture();
        }
        
        // ★ v2.3: 連続視界の自動開始
        if (this._autoStartContinuous) {
            this._autoStartContinuous = false;
            this.startContinuousCapture();
            this._updateContinuousUI();
            localStorage.setItem('grok_vision_continuous_enabled', 'true');
        }
        
        console.log(`👁️ Vision Bridge v2.3 開始 (定期: ${this.periodicEnabled ? intervalMs + 'ms' : 'OFF'}, 連続: ${this.continuousEnabled ? this.continuousIntervalMs + 'ms' : 'OFF'})`);
    }
    
    stop() {
        this.isRunning = false;
        this.stopPeriodicCapture();
        this._pendingEvents = [];
        console.log('👁️ Vision Bridge 停止');
    }
    
    // ============================
    // ★ v2.0: Grok応答状態の追跡
    // ============================
    
    /**
     * Grokの応答が始まった時に呼ぶ
     */
    setGrokResponding(responding) {
        this._isGrokResponding = responding;
        
        // 応答完了時に保留イベントをフラッシュ
        if (!responding && this._pendingEvents.length > 0) {
            // 3秒待ってからまとめて通知（連続応答を防ぐ）
            setTimeout(() => {
                this.flushPendingEvents();
            }, 3000);
        }
    }
    
    /**
     * 保留中のイベントをまとめて1つの通知にする
     */
    flushPendingEvents() {
        if (this._pendingEvents.length === 0) return;
        if (this._isGrokResponding) return; // まだ応答中なら待つ
        
        const summary = this._pendingEvents.join(' / ');
        this._pendingEvents = [];
        
        console.log('👁️ 保留イベントフラッシュ:', summary);
        this._injectEventText(summary);
    }
    
    // ============================
    // ① capture_screen Function Call対応
    // ============================
    
    /**
     * capture_screen の Function Call ハンドラ
     */
    handleCaptureScreen(args) {
        const reason = args?.reason || args?.prompt || '';
        const force = args?.force || false;
        const detailed = args?.detailed || false;
        
        // キャッシュチェック（force/detailedでない＆5秒以内なら前回の結果を返す）
        if (!force && !detailed && this._lastAnalysis && (Date.now() - this._lastAnalysisTime < this._cacheValidMs)) {
            console.log('👁️ キャッシュ済み分析結果を返却');
            return {
                success: true,
                description: this._lastAnalysis,
                cached: true,
                captureCount: this.captureCount,
                timestamp: new Date().toISOString()
            };
        }
        
        const prompt = reason 
            ? `3D画面を見てください。特に${reason}について。キャラクターの姿勢、表情、周囲のオブジェクト、背景を含めて50文字以内の日本語で簡潔に説明して。`
            : '3D画面の状況を50文字以内の日本語で簡潔に説明して。キャラの姿勢、表情、オブジェクト、背景を含めて。';
        
        return this.captureAndAnalyze(prompt);
    }
    
    /**
     * スクリーンショットを撮影してGrok Vision APIで分析
     */
    async captureAndAnalyze(prompt = '画面の状況を簡潔に日本語で説明して') {
        if (!this.apiKey) {
            return { success: false, error: 'APIキーが未設定' };
        }
        
        try {
            const imageBase64 = this.captureCanvas();
            if (!imageBase64) {
                return { success: false, error: 'キャンバスのキャプチャに失敗' };
            }
            
            console.log('📸 キャプチャ成功、Vision API送信中...');
            
            const analysis = await this.analyzeWithVision(imageBase64, prompt);
            
            this.captureCount++;
            this.lastCaptureTime = Date.now();
            this._lastAnalysis = analysis;
            this._lastAnalysisTime = Date.now();
            
            console.log('👁️ Vision分析結果:', analysis);
            
            // ★ v2.1: プレビュー更新
            this.updatePreview(imageBase64, analysis);
            
            return {
                success: true,
                description: analysis,
                captureCount: this.captureCount,
                timestamp: new Date().toISOString()
            };
        } catch (e) {
            console.error('❌ Vision Bridge エラー:', e);
            return { success: false, error: e.message };
        }
    }
    
    /**
     * Three.jsキャンバスからスクリーンショットを取得
     * ★ v2.0: preserveDrawingBuffer:false対策
     *   レンダリング直後にキャプチャするため、強制再レンダリングを実行
     */
    captureCanvas() {
        try {
            const renderer = window.app?.renderer;
            const scene = window.app?.scene;
            const camera = window.app?.camera;
            
            if (!renderer || !scene || !camera) {
                console.warn('⚠️ renderer/scene/camera が見つかりません');
                return null;
            }
            
            // ★ 強制的に1フレームレンダリング（バッファが有効な間にtoDataURL）
            renderer.render(scene, camera);
            
            const canvas = renderer.domElement;
            
            // 低解像度でキャプチャ（コスト節約）
            const tempCanvas = document.createElement('canvas');
            const scale = 0.4;
            tempCanvas.width = canvas.width * scale;
            tempCanvas.height = canvas.height * scale;
            
            const ctx = tempCanvas.getContext('2d');
            ctx.drawImage(canvas, 0, 0, tempCanvas.width, tempCanvas.height);
            
            // JPEG品質50%でサイズ削減
            const dataUrl = tempCanvas.toDataURL('image/jpeg', 0.5);
            const base64 = dataUrl.split(',')[1];
            
            console.log(`📸 キャプチャ成功: ${tempCanvas.width}x${tempCanvas.height}, base64長: ${base64.length}`);
            
            return base64;
        } catch (e) {
            console.error('❌ キャンバスキャプチャエラー:', e);
            return null;
        }
    }
    
    /**
     * Grok Vision REST APIで画像を分析
     */
    async analyzeWithVision(imageBase64, prompt) {
        const response = await fetch('https://api.x.ai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.apiKey}`
            },
            body: JSON.stringify({
                model: this.visionModel,
                messages: [{
                    role: 'user',
                    content: [
                        {
                            type: 'image_url',
                            image_url: {
                                url: `data:image/jpeg;base64,${imageBase64}`,
                                detail: 'low'
                            }
                        },
                        {
                            type: 'text',
                            text: prompt
                        }
                    ]
                }],
                max_tokens: 150  // ★ v2.0: 少し減らす
            })
        });
        
        if (!response.ok) {
            throw new Error(`Vision API エラー: ${response.status} ${response.statusText}`);
        }
        
        const data = await response.json();
        return data.choices?.[0]?.message?.content || '分析結果なし';
    }
    
    // ============================
    // ② イベント通知（テキスト注入）★ v2.0: 安全な注入
    // ============================
    
    setupEventListeners() {
        this.hookSpawnObject();
        this.hookMotionPlay();
        this.hookClothingChange();
    }
    
    /**
     * 外部からのイベント通知（grok-extended-tools.jsから呼ばれる）
     */
    onEvent(eventType, detail) {
        if (!this.isRunning) return;
        this.notifyEvent(`${eventType}: ${detail}`);
    }
    
    /**
     * オブジェクト生成をフック
     */
    hookSpawnObject() {
        const originalSpawn = window.spawnPhysicsObject;
        if (!originalSpawn || originalSpawn._visionHooked) return;
        
        window.spawnPhysicsObject = (...args) => {
            const result = originalSpawn.apply(window, args);
            const type = args[0] || 'unknown';
            const size = args[3] || 1;
            const count = window.physicsObjects?.length || 0;
            this.notifyEvent(`📦 ${type}(${size}m)生成 → 合計${count}個`);
            return result;
        };
        window.spawnPhysicsObject._visionHooked = true;
        console.log('👁️ spawnPhysicsObject フック完了');
    }
    
    /**
     * モーション再生をフック（グローバル関数版）
     */
    hookMotionPlay() {
        const originalLoad = window.loadAndPlayVRMA;
        if (!originalLoad || originalLoad._visionHooked) return;
        
        window.loadAndPlayVRMA = (...args) => {
            const path = args[0] || '';
            const name = path.split('/').pop()?.replace('.vrma', '') || path;
            this.notifyEvent(`🎭 モーション: ${name}`);
            return originalLoad.apply(window, args);
        };
        window.loadAndPlayVRMA._visionHooked = true;
        console.log('👁️ loadAndPlayVRMA フック完了');
    }
    
    /**
     * 服装変更をフック
     */
    hookClothingChange() {
        if (!window.vrmBodyController) return;
        const original = window.vrmBodyController.setMeshOpacity?.bind(window.vrmBodyController);
        if (!original || original._visionHooked) return;
        
        window.vrmBodyController.setMeshOpacity = (...args) => {
            const target = args[0] || 'unknown';
            const opacity = args[1];
            this.notifyEvent(`👗 ${target}: ${opacity === 0 ? '脱' : opacity === 1 ? '着' : `透明度${opacity}`}`);
            return original(...args);
        };
        window.vrmBodyController.setMeshOpacity._visionHooked = true;
        console.log('👁️ setMeshOpacity フック完了');
    }
    
    /**
     * ★ v2.0: 安全なイベント通知（Grok応答中は保留、デバウンス付き）
     */
    notifyEvent(eventText) {
        if (!this.isRunning) return;
        
        const now = Date.now();
        
        // クールダウン中は保留キューに追加
        if (now - this._lastEventTime < this._eventCooldownMs) {
            // 同じイベントは無視
            if (!this._pendingEvents.includes(eventText)) {
                this._pendingEvents.push(eventText);
            }
            return;
        }
        
        // Grok応答中は保留キューに追加（返答のトリガーにさせない）
        if (this._isGrokResponding) {
            if (!this._pendingEvents.includes(eventText)) {
                this._pendingEvents.push(eventText);
            }
            console.log('👁️ イベント保留（応答中）:', eventText);
            return;
        }
        
        this._lastEventTime = now;
        this._injectEventText(eventText);
    }
    
    /**
     * ★ v2.0: テキストを実際にGrokの会話に注入（response.createは送らない）
     */
    _injectEventText(eventText) {
        console.log('👁️ イベント注入:', eventText);
        
        const grokClient = window.app?.grokRealtimeClient;
        if (grokClient?.isConnected && grokClient.ws) {
            grokClient.ws.send(JSON.stringify({
                type: 'conversation.item.create',
                item: {
                    type: 'message',
                    role: 'system',  // ★ v2.0: userではなくsystemとして送信
                    content: [{
                        type: 'input_text',
                        text: `[状況変化] ${eventText}`
                    }]
                }
            }));
            // ★★★ response.createは絶対に送らない ★★★
            // Grokは次に自分が話すタイミングで自然にこの情報を使う
        }
    }
    
    // ============================
    // ★ v2.5: 詳しく見る（1回限り高品質キャプチャ）
    // ============================
    
    async captureDetailedVision() {
        if (!this.apiKey) {
            this.showDetailedStatus('❌ APIキー未設定');
            return;
        }
        
        console.log('🔍 詳しく見る: 高品質キャプチャ開始...');
        this.showDetailedStatus('🔍 高品質キャプチャ中...');
        
        try {
            const renderer = window.app?.renderer;
            const scene = window.app?.scene;
            const camera = window.app?.camera;
            
            if (!renderer || !scene || !camera) {
                this.showDetailedStatus('❌ renderer未検出');
                return;
            }
            
            renderer.render(scene, camera);
            const canvas = renderer.domElement;
            
            // ★ フル解像度でキャプチャ（100%）
            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = canvas.width;
            tempCanvas.height = canvas.height;
            const ctx = tempCanvas.getContext('2d');
            ctx.drawImage(canvas, 0, 0, tempCanvas.width, tempCanvas.height);
            
            // ★ JPEG品質99%
            const dataUrl = tempCanvas.toDataURL('image/jpeg', 0.99);
            const base64 = dataUrl.split(',')[1];
            
            console.log(`🔍 高品質キャプチャ: ${tempCanvas.width}x${tempCanvas.height}, base64長: ${base64.length}`);
            this.showDetailedStatus('🔍 Vision API分析中...');
            
            // ★ detail: 'high', max_tokens: 800
            const response = await fetch('https://api.x.ai/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.apiKey}`
                },
                body: JSON.stringify({
                    model: this.visionModel,
                    messages: [{
                        role: 'user',
                        content: [
                            {
                                type: 'image_url',
                                image_url: {
                                    url: `data:image/jpeg;base64,${base64}`,
                                    detail: 'high'
                                }
                            },
                            {
                                type: 'text',
                                text: '3D画面を詳しく見てください。4000文字以内の日本語でできるだけ詳細に説明してください。画面に表示されている文字やテキスト情報があれば正確に読み取って含めてください。キャラクターの姿勢・表情・服装、周囲のオブジェクト、背景の風景、UI要素、色合いや雰囲気も含めて具体的に描写してください。'
                            }
                        ]
                    }],
                    max_tokens: 4000
                })
            });
            
            if (!response.ok) {
                throw new Error(`Vision API エラー: ${response.status}`);
            }
            
            const data = await response.json();
            const analysis = data.choices?.[0]?.message?.content || '分析結果なし';
            
            console.log('🔍 詳細分析結果:', analysis);
            
            // プレビュー更新
            this.updatePreview(base64, analysis);
            
            // Grokの会話に注入
            this._injectEventText(`🔍 詳細な視覚情報: ${analysis}`);
            
            this.showDetailedStatus('✅ 詳細分析完了！');
            setTimeout(() => this.showDetailedStatus(''), 3000);
            
        } catch (e) {
            console.error('❌ 詳しく見るエラー:', e);
            this.showDetailedStatus('❌ ' + e.message);
            setTimeout(() => this.showDetailedStatus(''), 5000);
        }
    }
    
    showDetailedStatus(text) {
        const statusEl = document.getElementById('grok-vision-detailed-status');
        if (statusEl) {
            statusEl.textContent = text;
            statusEl.style.display = text ? 'inline' : 'none';
        }
    }
    
    // ============================
    // ③ 定期キャプチャ
    // ============================
    
    startPeriodicCapture() {
        if (this.periodicInterval) return;
        
        this.periodicInterval = setInterval(async () => {
            if (!this.isRunning || !this.periodicEnabled) return;
            if (this._isGrokResponding) return; // ★ v2.0: 応答中はスキップ
            
            const result = await this.captureAndAnalyze(
                '3D画面を30文字以内で説明（キャラの姿勢、オブジェクト、背景）'
            );
            
            if (result.success) {
                this.notifyEvent(`👁️ 定期観測: ${result.description}`);
            }
        }, this.periodicIntervalMs);
        
        console.log(`👁️ 定期キャプチャ開始: ${this.periodicIntervalMs / 1000}秒間隔`);
    }
    
    stopPeriodicCapture() {
        if (this.periodicInterval) {
            clearInterval(this.periodicInterval);
            this.periodicInterval = null;
            console.log('👁️ 定期キャプチャ停止');
        }
    }
    
    togglePeriodicCapture() {
        this.periodicEnabled = !this.periodicEnabled;
        if (this.periodicEnabled && this.isRunning) {
            this.startPeriodicCapture();
        } else {
            this.stopPeriodicCapture();
        }
        console.log(`👁️ 定期キャプチャ: ${this.periodicEnabled ? 'ON' : 'OFF'}`);
        return this.periodicEnabled;
    }
    
    // ============================
    // ★ v2.3: 連続視界（高頻度キャプチャ）
    // ============================
    
    startContinuousCapture() {
        this.stopContinuousCapture();
        this.continuousEnabled = true;
        
        const doCapture = async () => {
            if (!this.continuousEnabled || !this.isRunning) return;
            if (this._isGrokResponding) {
                // 応答中はスキップして次回
                this.continuousTimer = setTimeout(doCapture, this.continuousIntervalMs);
                return;
            }
            
            const result = await this.captureAndAnalyze(
                '3D画面を30文字以内で説明（キャラの姿勢、オブジェクト、背景）'
            );
            
            if (result.success) {
                this._injectEventText(`👁️ 視覚: ${result.description}`);
            }
            
            if (this.continuousEnabled) {
                this.continuousTimer = setTimeout(doCapture, this.continuousIntervalMs);
            }
        };
        
        // 最初のキャプチャ
        doCapture();
        console.log(`👁️ 連続視界開始: ${this.continuousIntervalMs / 1000}秒間隔`);
    }
    
    stopContinuousCapture() {
        this.continuousEnabled = false;
        if (this.continuousTimer) {
            clearTimeout(this.continuousTimer);
            this.continuousTimer = null;
        }
        console.log('👁️ 連続視界停止');
    }
    
    toggleContinuousCapture() {
        if (this.continuousEnabled) {
            this.stopContinuousCapture();
        } else {
            if (this.isRunning) {
                this.startContinuousCapture();
            } else {
                console.warn('👁️ Vision Bridgeが未起動です（Grok Voice開始後に使えます）');
            }
        }
        this._updateContinuousUI();
        localStorage.setItem('grok_vision_continuous_enabled', this.continuousEnabled ? 'true' : 'false');
        return this.continuousEnabled;
    }
    
    setContinuousInterval(ms) {
        this.continuousIntervalMs = Math.max(200, Math.min(10000, ms));
        console.log(`👁️ 連続視界間隔変更: ${this.continuousIntervalMs / 1000}秒`);
        
        // 動作中なら再起動
        if (this.continuousEnabled) {
            this.stopContinuousCapture();
            this.continuousEnabled = true; // フラグ復元
            this.startContinuousCapture();
        }
    }
    
    _updateContinuousUI() {
        if (this._continuousToggleBtn) {
            if (this.continuousEnabled) {
                this._continuousToggleBtn.textContent = '🔄 連続 ON';
                this._continuousToggleBtn.style.background = 'linear-gradient(135deg, #00c853 0%, #00bfa5 100%)';
                this._continuousToggleBtn.style.color = 'white';
                this._continuousToggleBtn.style.borderColor = 'rgba(0, 200, 83, 0.8)';
            } else {
                this._continuousToggleBtn.textContent = '🔄 連続 OFF';
                this._continuousToggleBtn.style.background = 'rgba(30, 30, 50, 0.8)';
                this._continuousToggleBtn.style.color = '#888';
                this._continuousToggleBtn.style.borderColor = 'rgba(100, 200, 255, 0.3)';
            }
        }
    }
    
    // ============================
    // ツール定義 ★ v2.0: extended-toolsに統合されたので不要
    // ============================
    
    /**
     * ★ v2.0: extended-toolsに統合されたので空配列を返す（二重登録防止）
     */
    getToolDefinition() {
        // capture_screenはgrok-extended-tools.jsで定義するので、ここでは返さない
        return null;
    }
    
    /**
     * Function Call処理（handleFunctionCallから呼ばれる）
     */
    handleFunctionCall(functionName, args) {
        if (functionName === 'capture_screen') {
            return this.handleCaptureScreen(args);
        }
        return null;
    }
    
    /**
     * 現在の状態サマリー
     */
    getStateSummary() {
        const parts = [];
        const objCount = window.physicsObjects?.length || 0;
        if (objCount > 0) parts.push(`物理オブジェクト${objCount}個`);
        const gy = window.physicsWorld?.gravity?.y;
        if (gy !== undefined && gy !== -9.82) {
            parts.push(gy === 0 ? '無重力' : `重力${gy}`);
        }
        if (window.app?.vrm) parts.push('VRMキャラ読込済');
        if (window.fpsMode) parts.push('FPSモード');
        return parts.length > 0 ? parts.join(', ') : '通常状態';
    }

    // ============================
    // ★ v2.1: Visionプレビューオーバーレイ
    // ============================
    
    /**
     * プレビューオーバーレイを作成
     */
    createPreviewOverlay() {
        if (this.previewOverlay) return;
        
        const overlay = document.createElement('div');
        overlay.id = 'grok-vision-preview';
        overlay.innerHTML = `
            <style>
                #grok-vision-preview {
                    position: fixed;
                    bottom: 20px;
                    left: 20px;
                    width: 240px;
                    background: rgba(10, 10, 30, 0.92);
                    border-radius: 12px;
                    box-shadow: 0 4px 20px rgba(0,0,0,0.5);
                    border: 1px solid rgba(100, 200, 255, 0.3);
                    z-index: 9600;
                    display: none;
                    flex-direction: column;
                    overflow: hidden;
                    font-family: 'Segoe UI', 'Yu Gothic', sans-serif;
                    transition: opacity 0.3s;
                }
                #grok-vision-preview.visible {
                    display: flex;
                }
                #gvp-header {
                    background: linear-gradient(135deg, #1da1f2 0%, #9c27b0 100%);
                    color: white;
                    padding: 6px 10px;
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    cursor: move;
                    user-select: none;
                    font-size: 11px;
                    font-weight: bold;
                }
                #gvp-header .gvp-close {
                    background: rgba(255,255,255,0.2);
                    border: none;
                    color: white;
                    width: 20px; height: 20px;
                    border-radius: 50%;
                    cursor: pointer;
                    font-size: 10px;
                    line-height: 20px;
                    text-align: center;
                }
                #gvp-image-container {
                    width: 100%;
                    height: 135px;
                    background: #111;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    overflow: hidden;
                    position: relative;
                }
                #gvp-image {
                    max-width: 100%;
                    max-height: 100%;
                    object-fit: contain;
                }
                #gvp-placeholder {
                    color: #666;
                    font-size: 11px;
                    text-align: center;
                }
                #gvp-analysis {
                    padding: 6px 10px;
                    color: #ccc;
                    font-size: 10px;
                    line-height: 1.4;
                    border-top: 1px solid rgba(255,255,255,0.1);
                    max-height: 60px;
                    overflow-y: auto;
                }
                #gvp-status {
                    padding: 4px 10px 6px;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    font-size: 9px;
                    color: #888;
                    border-top: 1px solid rgba(255,255,255,0.05);
                }
                #gvp-status .gvp-dot {
                    width: 6px; height: 6px;
                    border-radius: 50%;
                    background: #666;
                    display: inline-block;
                    margin-right: 4px;
                }
                #gvp-status .gvp-dot.active {
                    background: #00ff88;
                    box-shadow: 0 0 6px #00ff88;
                    animation: gvp-pulse 2s infinite;
                }
                @keyframes gvp-pulse {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0.4; }
                }
            </style>
            <div id="gvp-header">
                <span>👁️ Grokの視界</span>
                <button class="gvp-close" id="gvp-close-btn">×</button>
            </div>
            <div id="gvp-image-container">
                <div id="gvp-placeholder">📷 キャプチャ待ち...</div>
                <img id="gvp-image" style="display:none;" />
            </div>
            <div id="gvp-analysis">まだ分析結果がありません</div>
            <div id="gvp-status">
                <span><span class="gvp-dot" id="gvp-active-dot"></span><span id="gvp-capture-count">キャプチャ: 0回</span></span>
                <span id="gvp-timestamp">-</span>
            </div>
        `;
        document.body.appendChild(overlay);
        this.previewOverlay = overlay;
        
        // 閉じるボタン
        document.getElementById('gvp-close-btn').onclick = () => this.togglePreview();
        
        // ドラッグ機能
        const header = document.getElementById('gvp-header');
        let isDragging = false, offsetX = 0, offsetY = 0;
        header.addEventListener('mousedown', e => {
            if (e.target.classList.contains('gvp-close')) return;
            isDragging = true;
            const rect = overlay.getBoundingClientRect();
            offsetX = e.clientX - rect.left;
            offsetY = e.clientY - rect.top;
            e.preventDefault();
        });
        document.addEventListener('mousemove', e => {
            if (!isDragging) return;
            overlay.style.left = (e.clientX - offsetX) + 'px';
            overlay.style.top = (e.clientY - offsetY) + 'px';
            overlay.style.bottom = 'auto';
            overlay.style.right = 'auto';
        });
        document.addEventListener('mouseup', () => { isDragging = false; });
        
        console.log('👁️ Visionプレビューオーバーレイ作成完了');
    }
    
    /**
     * プレビューのON/OFF切替
     */
    togglePreview() {
        if (!this.previewOverlay) {
            this.createPreviewOverlay();
        }
        this.previewEnabled = !this.previewEnabled;
        this.previewOverlay.classList.toggle('visible', this.previewEnabled);
        console.log(`👁️ Visionプレビュー: ${this.previewEnabled ? 'ON' : 'OFF'}`);
        return this.previewEnabled;
    }
    
    /**
     * プレビューを更新（キャプチャ時に自動呼び出し）
     */
    updatePreview(imageBase64, analysisText) {
        if (!this.previewEnabled || !this.previewOverlay) return;
        
        // 画像を更新
        const img = document.getElementById('gvp-image');
        const placeholder = document.getElementById('gvp-placeholder');
        if (img && imageBase64) {
            img.src = `data:image/jpeg;base64,${imageBase64}`;
            img.style.display = 'block';
            if (placeholder) placeholder.style.display = 'none';
        }
        
        // 分析結果を更新
        if (analysisText) {
            this._previewAnalysisText = analysisText;
            const analysisEl = document.getElementById('gvp-analysis');
            if (analysisEl) analysisEl.textContent = analysisText;
        }
        
        // ステータス更新
        const countEl = document.getElementById('gvp-capture-count');
        if (countEl) countEl.textContent = `キャプチャ: ${this.captureCount}回`;
        
        const timeEl = document.getElementById('gvp-timestamp');
        if (timeEl) timeEl.textContent = new Date().toLocaleTimeString('ja-JP');
        
        const dotEl = document.getElementById('gvp-active-dot');
        if (dotEl) {
            dotEl.classList.add('active');
            setTimeout(() => dotEl.classList.remove('active'), 3000);
        }
    }

    // ============================
    // ★ v2.2: UIトグルボタン
    // ============================
    
    /**
     * Grok Voiceボタンの横に「👁️ 視界」トグルボタン + 連続視界コントロールを作成
     */
    createToggleButton() {
        if (this._toggleBtn) return;
        
        // コンテナ作成
        const container = document.createElement('div');
        container.id = 'grok-vision-controls';
        container.style.cssText = `
            position: fixed;
            top: 108px;
            left: 8px;
            z-index: 99999;
            display: flex;
            align-items: center;
            gap: 6px;
            font-family: 'Segoe UI', 'Yu Gothic', sans-serif;
        `;
        
        // --- 視界ONボタン ---
        const btn = document.createElement('button');
        btn.id = 'grok-vision-toggle-btn';
        
        const saved = localStorage.getItem('grok_vision_preview_enabled');
        if (saved === 'true') {
            this.previewEnabled = true;
        }
        
        this._updateToggleBtnStyle(btn);
        
        btn.style.cssText = `
            padding: 6px 12px;
            border-radius: 20px;
            border: 2px solid rgba(100, 200, 255, 0.5);
            font-size: 12px;
            font-weight: bold;
            cursor: pointer;
            transition: all 0.3s;
            box-shadow: 0 2px 10px rgba(0,0,0,0.3);
            white-space: nowrap;
        `;
        
        btn.addEventListener('click', () => {
            this.togglePreview();
            this._updateToggleBtnStyle(btn);
            localStorage.setItem('grok_vision_preview_enabled', this.previewEnabled);
        });
        
        container.appendChild(btn);
        this._toggleBtn = btn;
        
        // --- 連続視界トグルボタン ---
        const contBtn = document.createElement('button');
        contBtn.id = 'grok-vision-continuous-btn';
        contBtn.style.cssText = `
            padding: 6px 10px;
            border-radius: 20px;
            border: 2px solid rgba(100, 200, 255, 0.3);
            font-size: 11px;
            font-weight: bold;
            cursor: pointer;
            transition: all 0.3s;
            box-shadow: 0 2px 10px rgba(0,0,0,0.3);
            white-space: nowrap;
            background: rgba(30, 30, 50, 0.8);
            color: #888;
        `;
        contBtn.textContent = '🔄 連続 OFF';
        
        contBtn.addEventListener('click', () => {
            this.toggleContinuousCapture();
        });
        
        container.appendChild(contBtn);
        this._continuousToggleBtn = contBtn;
        
        // --- ★ v2.5: 詳しく見るボタン ---
        const detailBtn = document.createElement('button');
        detailBtn.id = 'grok-vision-detail-btn';
        detailBtn.style.cssText = `
            padding: 6px 10px;
            border-radius: 20px;
            border: 2px solid rgba(255, 200, 50, 0.5);
            font-size: 11px;
            font-weight: bold;
            cursor: pointer;
            transition: all 0.3s;
            box-shadow: 0 2px 10px rgba(0,0,0,0.3);
            white-space: nowrap;
            background: rgba(60, 40, 10, 0.8);
            color: #ffd54f;
        `;
        detailBtn.textContent = '🔍 詳しく見る';
        
        detailBtn.addEventListener('click', async () => {
            detailBtn.disabled = true;
            detailBtn.style.opacity = '0.5';
            detailBtn.textContent = '🔍 分析中...';
            await this.captureDetailedVision();
            detailBtn.disabled = false;
            detailBtn.style.opacity = '1';
            detailBtn.textContent = '🔍 詳しく見る';
        });
        container.appendChild(detailBtn);
        
        // --- ★ v2.5: ステータス表示 ---
        const detailStatus = document.createElement('span');
        detailStatus.id = 'grok-vision-detailed-status';
        detailStatus.style.cssText = 'color: #ffd54f; font-size: 10px; display: none;';
        container.appendChild(detailStatus);
        
        // --- スライダーラベル ---
        const sliderLabel = document.createElement('span');
        sliderLabel.id = 'grok-vision-slider-label';
        sliderLabel.style.cssText = 'color: #aaa; font-size: 10px; min-width: 35px; text-align: center;';
        sliderLabel.textContent = '3.0s';
        container.appendChild(sliderLabel);
        
        // --- スライダー ---
        const slider = document.createElement('input');
        slider.type = 'range';
        slider.id = 'grok-vision-continuous-slider';
        slider.min = '200';    // 0.2秒
        slider.max = '10000';  // 10秒
        slider.step = '100';
        slider.value = '3000'; // デフォルト3秒
        slider.style.cssText = `
            width: 100px;
            height: 4px;
            cursor: pointer;
            accent-color: #00c853;
            -webkit-appearance: none;
            appearance: none;
            background: linear-gradient(to right, #00c853, #ff9800, #f44336);
            border-radius: 2px;
            outline: none;
        `;
        
        // 保存された値を読み込み
        const savedInterval = localStorage.getItem('grok_vision_continuous_interval');
        if (savedInterval) {
            slider.value = savedInterval;
            this.continuousIntervalMs = parseInt(savedInterval);
            sliderLabel.textContent = (parseInt(savedInterval) / 1000).toFixed(1) + 's';
        }
        
        slider.addEventListener('input', (e) => {
            const ms = parseInt(e.target.value);
            this.setContinuousInterval(ms);
            sliderLabel.textContent = (ms / 1000).toFixed(1) + 's';
            localStorage.setItem('grok_vision_continuous_interval', ms);
        });
        
        container.appendChild(slider);
        this._continuousSlider = slider;
        
        document.body.appendChild(container);
        
        // 保存状態がONならプレビューを表示
        if (this.previewEnabled) {
            this.createPreviewOverlay();
            if (this.previewOverlay) {
                this.previewOverlay.classList.add('visible');
            }
        }
        
        // 連続視界の保存状態を読み込み
        const savedContinuous = localStorage.getItem('grok_vision_continuous_enabled');
        if (savedContinuous === 'true') {
            // Grok Voice開始後に自動的に連続視界も開始するフラグ
            this._autoStartContinuous = true;
        }
        
        console.log('👁️ Vision コントロール作成完了（視界ON + 連続視界スライダー）');
    }
    
    /**
     * トグルボタンのスタイルを状態に応じて更新
     */
    _updateToggleBtnStyle(btn) {
        if (this.previewEnabled) {
            btn.textContent = '👁️ 視界 ON';
            btn.style.background = 'linear-gradient(135deg, #1da1f2 0%, #9c27b0 100%)';
            btn.style.color = 'white';
            btn.style.borderColor = 'rgba(100, 200, 255, 0.8)';
        } else {
            btn.textContent = '👁️ 視界 OFF';
            btn.style.background = 'rgba(30, 30, 50, 0.8)';
            btn.style.color = '#888';
            btn.style.borderColor = 'rgba(100, 200, 255, 0.3)';
        }
    }
}

// グローバル公開
window.grokVisionBridge = new GrokVisionBridge();
console.log('👁️ Grok Vision Bridge v2.3 loaded');
