// ========================================
// 画面キャプチャ → ChatGPT 感想システム v1.7
// 🖼️ 📸ボタン or 「これどう思う？」でキャプチャモード起動
// 📸 ドラッグで範囲選択 → キャプチャ
// 🤖 ChatGPT Vision APIで分析 → 感想を音声で
// 🔧 v1.7: Three.js Canvasを直接キャプチャ（WebGL対応）
// ========================================

(function() {
    console.log('🖼️ 画面キャプチャシステム v1.7 初期化中...');
    
    let isCapturing = false;
    let isDragging = false;
    let startX = 0, startY = 0;
    let capturedImageData = null;
    
    // キャプチャUI要素
    let overlay = null;
    let captureBox = null;
    let hint = null;
    
    // トリガーワード
    const TRIGGER_WORDS = [
        'これどう思う', 'どう思う', 'これ見て', 'みて',
        '何これ', 'なにこれ', '画面見て', 'キャプチャ', 'スクショ'
    ];
    
    // ========================================
    // CSS追加
    // ========================================
    const style = document.createElement('style');
    style.textContent = `
        .capture-overlay {
            position: fixed; top: 0; left: 0;
            width: 100vw; height: 100vh;
            background: rgba(0,0,0,0.3);
            cursor: crosshair;
            z-index: 99998;
        }
        
        .capture-box {
            position: fixed;
            border: 4px dashed #ff6b9d;
            background: rgba(255,107,157,0.15);
            box-shadow: 0 0 30px rgba(255,107,157,0.6);
            z-index: 99999;
            pointer-events: none;
        }
        
        .capture-hint {
            position: fixed; top: 50%; left: 50%;
            transform: translate(-50%, -50%);
            background: linear-gradient(135deg, #667eea, #764ba2);
            color: white;
            padding: 25px 40px;
            border-radius: 16px;
            font-size: 20px;
            font-weight: bold;
            text-align: center;
            z-index: 100000;
            box-shadow: 0 10px 40px rgba(0,0,0,0.4);
            animation: hintPulse 2s infinite;
        }
        .capture-hint small { display: block; font-size: 14px; margin-top: 10px; opacity: 0.9; }
        
        @keyframes hintPulse {
            0%, 100% { transform: translate(-50%, -50%) scale(1); }
            50% { transform: translate(-50%, -50%) scale(1.03); }
        }
        
        #screen-capture-btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(240, 147, 251, 0.5);
        }
    `;
    document.head.appendChild(style);
    
    // ========================================
    // キャプチャモード制御
    // ========================================
    function startCaptureMode() {
        console.log('📸 キャプチャモード開始！');
        isCapturing = true;
        
        // UI要素を動的に作成
        overlay = document.createElement('div');
        overlay.className = 'capture-overlay';
        document.body.appendChild(overlay);
        
        captureBox = document.createElement('div');
        captureBox.className = 'capture-box';
        captureBox.style.display = 'none';
        document.body.appendChild(captureBox);
        
        hint = document.createElement('div');
        hint.className = 'capture-hint';
        hint.innerHTML = '📸 ドラッグして範囲を選択！<small>ESCでキャンセル</small>';
        document.body.appendChild(hint);
        
        // イベント設定
        overlay.addEventListener('mousedown', onMouseDown);
        overlay.addEventListener('mousemove', onMouseMove);
        overlay.addEventListener('mouseup', onMouseUp);
        
        // カメラコントロール無効化
        disableCameraControls();
    }
    
    function endCaptureMode() {
        console.log('📸 キャプチャモード終了');
        isCapturing = false;
        isDragging = false;
        
        // UI要素を削除
        if (overlay) { overlay.remove(); overlay = null; }
        if (captureBox) { captureBox.remove(); captureBox = null; }
        if (hint) { hint.remove(); hint = null; }
        
        // カメラコントロール再有効化
        enableCameraControls();
    }
    
    function disableCameraControls() {
        if (window.app && window.app.controls) {
            window.app.controls.enabled = false;
        }
        if (window.controls) {
            window.controls.enabled = false;
        }
    }
    
    function enableCameraControls() {
        if (window.app && window.app.controls) {
            window.app.controls.enabled = true;
        }
        if (window.controls) {
            window.controls.enabled = true;
        }
    }
    
    // ========================================
    // マウスイベント
    // ========================================
    function onMouseDown(e) {
        if (!isCapturing) return;
        isDragging = true;
        startX = e.clientX;
        startY = e.clientY;
        
        // ヒントを消す
        if (hint) { hint.remove(); hint = null; }
        
        captureBox.style.left = startX + 'px';
        captureBox.style.top = startY + 'px';
        captureBox.style.width = '0';
        captureBox.style.height = '0';
        captureBox.style.display = 'block';
    }
    
    function onMouseMove(e) {
        if (!isDragging || !captureBox) return;
        const x = Math.min(startX, e.clientX);
        const y = Math.min(startY, e.clientY);
        const w = Math.abs(e.clientX - startX);
        const h = Math.abs(e.clientY - startY);
        captureBox.style.left = x + 'px';
        captureBox.style.top = y + 'px';
        captureBox.style.width = w + 'px';
        captureBox.style.height = h + 'px';
    }
    
    async function onMouseUp(e) {
        if (!isDragging) return;
        isDragging = false;
        
        const x = Math.min(startX, e.clientX);
        const y = Math.min(startY, e.clientY);
        const w = Math.abs(e.clientX - startX);
        const h = Math.abs(e.clientY - startY);
        
        if (w < 30 || h < 30) {
            endCaptureMode();
            return;
        }
        
        // 1. UIを削除
        if (overlay) { overlay.remove(); overlay = null; }
        if (captureBox) { captureBox.remove(); captureBox = null; }
        if (hint) { hint.remove(); hint = null; }
        
        // 2. 待つ
        await new Promise(r => setTimeout(r, 100));
        
        // 3. キャプチャ実行
        try {
            await captureAndSend(x, y, w, h);
        } catch (err) {
            console.error('❌ キャプチャエラー:', err);
            addChatMessage('ai', 'ごめん、キャプチャに失敗しちゃった... 😢');
        }
        
        // 状態リセット
        isCapturing = false;
        enableCameraControls();
    }
    
    // ESCキー
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && isCapturing) {
            endCaptureMode();
        }
    });
    
    // ========================================
    // キャプチャ（Three.js Canvas直接）
    // ========================================
    async function captureAndSend(x, y, w, h) {
        console.log(`📸 キャプチャ: (${x}, ${y}) ${w}x${h}`);
        
        // Three.jsのCanvasを探す
        const threeCanvas = document.querySelector('#canvas-container canvas') || 
                           document.querySelector('canvas[data-engine]') ||
                           document.querySelector('canvas');
        
        if (!threeCanvas) {
            throw new Error('Canvasが見つかりません');
        }
        
        // Three.jsのrendererから直接画像を取得
        let sourceCanvas = threeCanvas;
        
        // もしrendererがあれば、render()を呼んでから取得
        if (window.app && window.app.renderer) {
            // preserveDrawingBuffer問題を回避：今すぐrender
            if (window.app.scene && window.app.camera) {
                window.app.renderer.render(window.app.scene, window.app.camera);
            }
            sourceCanvas = window.app.renderer.domElement;
        }
        
        // Canvas全体を取得
        const fullImageData = sourceCanvas.toDataURL('image/jpeg', 0.9);
        
        // 選択範囲を切り出す
        const rect = sourceCanvas.getBoundingClientRect();
        const scaleX = sourceCanvas.width / rect.width;
        const scaleY = sourceCanvas.height / rect.height;
        
        // 選択範囲がCanvas内にあるか計算
        const srcX = Math.max(0, (x - rect.left) * scaleX);
        const srcY = Math.max(0, (y - rect.top) * scaleY);
        const srcW = w * scaleX;
        const srcH = h * scaleY;
        
        // 切り出し用Canvas
        const cropCanvas = document.createElement('canvas');
        cropCanvas.width = w;
        cropCanvas.height = h;
        const ctx = cropCanvas.getContext('2d');
        
        // 元のCanvasから切り出し
        const img = new Image();
        img.src = fullImageData;
        
        await new Promise((resolve, reject) => {
            img.onload = resolve;
            img.onerror = reject;
        });
        
        ctx.drawImage(img, srcX, srcY, srcW, srcH, 0, 0, w, h);
        
        capturedImageData = cropCanvas.toDataURL('image/jpeg', 0.85);
        console.log('✅ Canvasからキャプチャ成功！');
        
        // チャットに表示
        addChatMessage('user', '📸 [画像を送信]');
        addChatMessage('ai', '🤔 うーん、見てみるね...');
        
        // ChatGPT Vision APIに送信
        await analyzeWithGPT(capturedImageData);
    }
    
    async function analyzeWithGPT(imageData) {
        const apiKey = getOpenAIKey();
        if (!apiKey) {
            updateLastAIMessage('⚠️ OpenAI APIキーが設定されてないよ！設定画面でAPIキーを入力してね。');
            return;
        }
        
        try {
            const res = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + apiKey
                },
                body: JSON.stringify({
                    model: 'gpt-4o',
                    messages: [{
                        role: 'system',
                        content: 'あなたは画像を見て感想を言う明るいキャラクターです。日本語で、友達に話すような自然な口調で3〜4文で答えてください。絵文字も使ってOK！'
                    }, {
                        role: 'user',
                        content: [{
                            type: 'text',
                            text: 'この画像を見て、感想を教えて！'
                        }, {
                            type: 'image_url',
                            image_url: { url: imageData, detail: 'low' }
                        }]
                    }],
                    max_tokens: 300
                })
            });
            
            if (!res.ok) throw new Error('API Error: ' + res.status);
            
            const data = await res.json();
            const reply = data.choices[0].message.content;
            
            console.log('🤖 ChatGPT応答:', reply);
            updateLastAIMessage(reply);
            
            // SBV2で読み上げ
            if (window.SBV2Panel && window.SBV2Panel.isEnabled()) {
                try {
                    await window.SBV2Panel.speakWithEmotionSync(reply);
                } catch (e) {
                    console.log('SBV2読み上げエラー:', e);
                }
            } else if (window.app && window.app.speak) {
                window.app.speak(reply);
            }
            
        } catch (err) {
            console.error('❌ GPT APIエラー:', err);
            updateLastAIMessage('ごめん、うまく見れなかった... 😢 ' + err.message);
        }
    }
    
    // ========================================
    // チャット操作
    // ========================================
    function addChatMessage(role, text) {
        const container = document.getElementById('chat-messages');
        if (!container) return;
        
        const div = document.createElement('div');
        div.className = 'message ' + role;
        div.innerHTML = `
            <div class="message-sender">${role === 'user' ? 'あなた' : 'AI'}</div>
            <div class="message-text">${text}</div>
        `;
        container.appendChild(div);
        container.scrollTop = container.scrollHeight;
    }
    
    function updateLastAIMessage(text) {
        const container = document.getElementById('chat-messages');
        if (!container) return;
        
        const msgs = container.querySelectorAll('.message.ai');
        if (msgs.length > 0) {
            const lastMsg = msgs[msgs.length - 1];
            lastMsg.querySelector('.message-text').textContent = text;
        }
    }
    
    function getOpenAIKey() {
        try {
            const k = localStorage.getItem('vrm_viewer_openai_api_key');
            if (k) return k;
            
            const apiSettings = localStorage.getItem('vrm_viewer_api_settings');
            if (apiSettings) {
                const settings = JSON.parse(apiSettings);
                if (settings.openai_api_key) return settings.openai_api_key;
            }
        } catch(e) {}
        
        if (window.app?.OPENAI_API_KEY) return window.app.OPENAI_API_KEY;
        if (window.OPENAI_API_KEY) return window.OPENAI_API_KEY;
        
        return null;
    }
    
    // ========================================
    // トリガー検出
    // ========================================
    function checkTrigger(text) {
        const t = text.toLowerCase().replace(/[？?！!。、\s]/g, '');
        return TRIGGER_WORDS.some(w => t.includes(w));
    }
    
    // ========================================
    // セットアップ
    // ========================================
    function setupUI() {
        const captureBtn = document.getElementById('screen-capture-btn');
        if (captureBtn) {
            captureBtn.addEventListener('click', () => {
                console.log('📸 ボタンクリック！');
                startCaptureMode();
            });
            console.log('✅ 📸 ボタンセットアップ完了');
        } else {
            setTimeout(setupUI, 500);
            return;
        }
        
        const chatInput = document.getElementById('chat-input');
        const sendBtn = document.getElementById('chat-send');
        
        if (chatInput && sendBtn) {
            sendBtn.addEventListener('click', () => {
                const text = chatInput.value.trim();
                if (checkTrigger(text)) {
                    setTimeout(startCaptureMode, 300);
                }
            });
            
            chatInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    const text = chatInput.value.trim();
                    if (checkTrigger(text)) {
                        setTimeout(startCaptureMode, 300);
                    }
                }
            });
            
            console.log('✅ チャットトリガー監視セットアップ完了');
        }
    }
    
    // ========================================
    // グローバルAPI
    // ========================================
    window.ScreenCapture = {
        start: startCaptureMode,
        stop: endCaptureMode,
        isActive: () => isCapturing
    };
    
    // ========================================
    // 初期化
    // ========================================
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', setupUI);
    } else {
        setupUI();
    }
    
    console.log('🖼️ 画面キャプチャシステム v1.7 準備完了！');
    console.log('   📸ボタン または トリガーワード:', TRIGGER_WORDS.slice(0, 4).join(', '), '...');
    
})();
