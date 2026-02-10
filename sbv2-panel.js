// ========================================
// Style-Bert-VITS2 コントロールパネル v2.2
// 🎭 行ごと感情同期システム搭載！
// 👄 リップシンク統合！
// 🔊 Grok Voice対応！
// 
// 新機能:
// - 行ごとに感情分析 (OpenAI GPT-4o-mini)
// - 行ごとに音声生成 (並列処理)
// - 音声再生タイミングで表情モーフ変更
// - 音声再生中はリップシンク発動
// - モーションは干渉しない（表情レイヤー独立）
// - v2.2: Grok Voice API対応（高速リアルタイム音声）
// ========================================

(function() {
    console.log('🎤🎭👄🔊 Style-Bert-VITS2 パネル v2.2 初期化開始（感情同期 + リップシンク + Grok Voice）');
    
    // 設定
    const settings = {
        baseUrl: '/sbv2',
        model: 'jvnv-F1-jp',
        modelFile: '',
        style: 'Neutral',
        styleWeight: 10,
        speed: 1.0,
        enabled: false,
        // v2.0 新機能
        emotionSyncEnabled: true,  // 感情同期ON/OFF
        pauseBetweenLines: 150,    // 行間ポーズ(ms)
        // v2.1 新機能
        lipSyncEnabled: true,      // リップシンクON/OFF
        // v2.2 新機能: Grok Voice
        useGrokVoice: false,       // Grok Voiceを使用するか
        grokVoice: 'Ara'           // Grok Voice種類: Ara, Eve, Rex, Leo, Sal
    };
    
    // モデル情報
    let modelsInfo = [];
    let isConnected = false;
    
    // 感情同期システム状態
    let isSyncPlaying = false;
    let shouldStopSync = false;
    let currentAudio = null;
    
    // 感情→表情マッピング
    const EMOTION_TO_EXPRESSION = {
        joy:      { expression: 'happy',    weight: 0.7 },
        happy:    { expression: 'happy',    weight: 0.6 },
        excited:  { expression: 'happy',    weight: 0.9 },
        grateful: { expression: 'happy',    weight: 0.5 },
        love:     { expression: 'happy',    weight: 0.8 },
        
        sad:      { expression: 'sad',      weight: 0.6 },
        crying:   { expression: 'sad',      weight: 0.9 },
        lonely:   { expression: 'sad',      weight: 0.5 },
        disappointed: { expression: 'sad',  weight: 0.5 },
        
        angry:    { expression: 'angry',    weight: 0.7 },
        annoyed:  { expression: 'angry',    weight: 0.4 },
        frustrated: { expression: 'angry',  weight: 0.6 },
        
        surprised:{ expression: 'surprised', weight: 0.7 },
        shocked:  { expression: 'surprised', weight: 0.9 },
        confused: { expression: 'surprised', weight: 0.4 },
        
        relaxed:  { expression: 'relaxed',  weight: 0.5 },
        calm:     { expression: 'relaxed',  weight: 0.4 },
        shy:      { expression: 'relaxed',  weight: 0.6 },
        
        neutral:  { expression: 'neutral',  weight: 0 },
        thinking: { expression: 'neutral',  weight: 0 },
        
        // 追加の感情マッピング
        positive:   { expression: 'happy',  weight: 0.5 },
        optimistic: { expression: 'happy',  weight: 0.5 },
        hopeful:    { expression: 'happy',  weight: 0.5 },
        cheerful:   { expression: 'happy',  weight: 0.7 },
        amused:     { expression: 'happy',  weight: 0.6 },
        proud:      { expression: 'happy',  weight: 0.5 },
        content:    { expression: 'relaxed', weight: 0.5 },
        worried:    { expression: 'sad',    weight: 0.4 },
        nervous:    { expression: 'surprised', weight: 0.4 },
        curious:    { expression: 'surprised', weight: 0.5 },
        interested: { expression: 'surprised', weight: 0.5 }
    };
    
    // localStorageから読み込み
    function loadSettings() {
        try {
            const saved = localStorage.getItem('sbv2_settings_v2');
            if (saved) {
                const parsed = JSON.parse(saved);
                Object.assign(settings, parsed);
                console.log('📦 SBV2設定を読み込みました (v2.1)');
            }
        } catch (e) {
            console.warn('SBV2設定の読み込み失敗:', e);
        }
    }
    
    function saveSettings() {
        try {
            localStorage.setItem('sbv2_settings_v2', JSON.stringify(settings));
        } catch (e) {
            console.warn('SBV2設定の保存失敗:', e);
        }
    }
    
    // ============================================
    // 👄 リップシンク制御 (v2.1 新機能)
    // ============================================
    
    /**
     * リップシンクを開始
     */
    function startLipSync() {
        if (!settings.lipSyncEnabled) return;
        
        // window.app.startLipSync() が存在すれば使用
        if (window.app && typeof window.app.startLipSync === 'function') {
            window.app.startLipSync();
            console.log('👄 リップシンク開始 (app.startLipSync)');
        } else {
            // フォールバック: 直接VRM表情を操作
            startFallbackLipSync();
        }
    }
    
    /**
     * リップシンクを停止
     */
    function stopLipSync() {
        if (!settings.lipSyncEnabled) return;
        
        // window.app.stopLipSync() が存在すれば使用
        if (window.app && typeof window.app.stopLipSync === 'function') {
            window.app.stopLipSync();
            console.log('👄 リップシンク停止 (app.stopLipSync)');
        } else {
            // フォールバック
            stopFallbackLipSync();
        }
    }
    
    // フォールバック用リップシンク
    let fallbackLipSyncInterval = null;
    
    function startFallbackLipSync() {
        if (fallbackLipSyncInterval) return;
        
        fallbackLipSyncInterval = setInterval(() => {
            if (window.app && window.app.vrm && window.app.vrm.expressionManager) {
                const em = window.app.vrm.expressionManager;
                // ランダムな口の開き
                const value = Math.random() * 0.5 + 0.3;
                try {
                    em.setValue('aa', value);
                } catch (e) {}
            }
        }, 100);
        console.log('👄 リップシンク開始 (フォールバック)');
    }
    
    function stopFallbackLipSync() {
        if (fallbackLipSyncInterval) {
            clearInterval(fallbackLipSyncInterval);
            fallbackLipSyncInterval = null;
        }
        // 口を閉じる
        if (window.app && window.app.vrm && window.app.vrm.expressionManager) {
            try {
                window.app.vrm.expressionManager.setValue('aa', 0);
            } catch (e) {}
        }
        console.log('👄 リップシンク停止 (フォールバック)');
    }
    
    // ============================================
    // 🎭 感情同期システム (v2.0 新機能)
    // ============================================
    
    /**
     * テキストを行ごとに分割
     */
    function splitIntoLines(text) {
        const lines = text
            .replace(/\r\n/g, '\n')
            .split(/(?<=[。！？\n])|(?<=\.\s)|(?<=!\s)|(?<=\?\s)/)
            .map(line => line.trim())
            .filter(line => line.length >= 2);
        
        console.log('📝 行分割:', lines.length, '行');
        return lines;
    }
    
    /**
     * OpenAI APIキーを取得
     */
    function getOpenAIKey() {
        try {
            const stored = localStorage.getItem('vrm_viewer_openai_api_key');
            if (stored) return stored;
        } catch (e) {}
        
        if (window.app && window.app.OPENAI_API_KEY) return window.app.OPENAI_API_KEY;
        if (window.app && window.app.chatGPTClient && window.app.chatGPTClient.apiKey) {
            return window.app.chatGPTClient.apiKey;
        }
        return null;
    }
    
    /**
     * 複数行の感情を一括分析（OpenAI API）
     */
    async function analyzeEmotionsForLines(lines) {
        const apiKey = getOpenAIKey();
        if (!apiKey) {
            console.warn('⚠️ OpenAI APIキーなし → 全てneutral');
            return lines.map(() => ({ emotion: 'neutral', weight: 0.3 }));
        }

        console.log('🧠 感情分析開始...', lines.length, '行');

        try {
            const response = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + apiKey
                },
                body: JSON.stringify({
                    model: 'gpt-4o-mini',
                    messages: [{
                        role: 'system',
                        content: `Analyze emotions for each line of Japanese text.

Output JSON array with emotion and weight (0.1-0.9) for each line:
[{"emotion": "happy", "weight": 0.6}, {"emotion": "sad", "weight": 0.4}, ...]

Emotions: joy, happy, excited, grateful, sad, crying, lonely, disappointed, angry, annoyed, surprised, confused, relaxed, shy, neutral, thinking

Rules:
- Weight 0.1-0.3: subtle emotion
- Weight 0.4-0.6: moderate emotion  
- Weight 0.7-0.9: strong emotion
- Output ONLY JSON array
- Must have same number of objects as input lines`
                    }, {
                        role: 'user',
                        content: lines.map((line, i) => `${i + 1}: ${line}`).join('\n')
                    }],
                    temperature: 0.3,
                    max_tokens: 500
                })
            });

            if (!response.ok) throw new Error(`API Error: ${response.status}`);

            const data = await response.json();
            let content = data.choices[0].message.content.trim();
            
            // JSONパース（```json形式も対応）
            if (content.includes('```')) {
                const match = content.match(/```(?:json)?\s*([\s\S]*?)```/);
                if (match) content = match[1].trim();
            }
            
            const emotions = JSON.parse(content);
            console.log('🎭 感情分析結果:', emotions);
            
            while (emotions.length < lines.length) {
                emotions.push({ emotion: 'neutral', weight: 0.3 });
            }
            
            return emotions.slice(0, lines.length);
        } catch (e) {
            console.error('❌ 感情分析エラー:', e);
            return lines.map(() => ({ emotion: 'neutral', weight: 0.3 }));
        }
    }
    
    /**
     * 表情モーフを適用（スムーズ遷移、モーション干渉なし）
     */
    function applyExpression(emotionName, emotionWeight, duration = 200) {
        if (!window.app || !window.app.vrm) return;
        
        const em = window.app.vrm.expressionManager;
        if (!em) return;

        const mapping = EMOTION_TO_EXPRESSION[emotionName] || EMOTION_TO_EXPRESSION.neutral;
        const targetExpression = mapping.expression;
        const targetWeight = mapping.weight * emotionWeight;

        const allExpressions = ['happy', 'angry', 'sad', 'surprised', 'relaxed'];
        
        // 現在の値を取得
        const startWeights = {};
        allExpressions.forEach(expr => {
            try { startWeights[expr] = em.getValue(expr) || 0; }
            catch (e) { startWeights[expr] = 0; }
        });

        const startTime = performance.now();

        function animate() {
            const elapsed = performance.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const ease = 1 - Math.pow(1 - progress, 3);

            try {
                allExpressions.forEach(expr => {
                    if (expr === targetExpression && targetWeight > 0) {
                        em.setValue(expr, startWeights[expr] + (targetWeight - startWeights[expr]) * ease);
                    } else {
                        em.setValue(expr, startWeights[expr] * (1 - ease));
                    }
                });

                if (progress < 1) {
                    requestAnimationFrame(animate);
                }
            } catch (e) { /* ignore */ }
        }

        requestAnimationFrame(animate);
        console.log('🎭 表情変更:', emotionName, '→', targetExpression, '(', (targetWeight).toFixed(2), ')');
    }
    
    /**
     * 1行の音声を生成
     */
    async function generateAudioForLine(text) {
        try {
            // G2P
            const g2pRes = await fetch('/sbv2/api/g2p', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text: text })
            });
            
            if (!g2pRes.ok) throw new Error('G2P failed');
            const g2pData = await g2pRes.json();
            const moraToneList = g2pData.mora_tone_list || g2pData || [];

            // モデルファイル取得
            const modelInfo = modelsInfo.find(m => m.name === settings.model);
            const modelFile = modelInfo?.files?.[0] || settings.modelFile || `${settings.model}.safetensors`;
            
            // スタイル検証
            const validStyle = getValidStyle(settings.style);
            const styleWeight = 0.5 + (settings.styleWeight - 1) * (2.5 / 19);

            // Synthesis
            const synthRes = await fetch('/sbv2/api/synthesis', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: settings.model,
                    modelFile: modelFile,
                    text: text,
                    moraToneList: moraToneList,
                    style: validStyle,
                    styleWeight: styleWeight,
                    speed: settings.speed,
                    language: 'JP'
                })
            });

            if (!synthRes.ok) throw new Error('Synthesis failed');
            
            const audioData = await synthRes.arrayBuffer();
            if (audioData.byteLength < 500) throw new Error('Audio too small');
            
            return audioData;
        } catch (e) {
            console.error('❌ 音声生成エラー:', text.substring(0, 15), e.message);
            return null;
        }
    }
    
    /**
     * 音声を再生して完了を待つ（リップシンク付き）
     */
    function playAudioAndWait(audioData) {
        return new Promise((resolve, reject) => {
            const blob = new Blob([audioData], { type: 'audio/wav' });
            const url = URL.createObjectURL(blob);
            const audio = new Audio(url);
            
            currentAudio = audio;

            // 👄 再生開始時にリップシンク開始
            audio.onplay = () => {
                startLipSync();
            };

            audio.onended = () => {
                // 👄 再生終了時にリップシンク停止
                stopLipSync();
                URL.revokeObjectURL(url);
                currentAudio = null;
                resolve();
            };

            audio.onerror = (e) => {
                stopLipSync();
                URL.revokeObjectURL(url);
                currentAudio = null;
                reject(e);
            };

            audio.play().catch(e => {
                stopLipSync();
                URL.revokeObjectURL(url);
                currentAudio = null;
                reject(e);
            });
        });
    }
    
    /**
     * 音声がない場合の推定待機時間
     */
    function estimateSpeakDuration(text) {
        return Math.max(500, text.length * 120);
    }
    
    /**
     * 🎭🎵 メイン: 感情同期再生
     */
    async function playSyncedResponse(text) {
        if (!isConnected || !settings.enabled) {
            console.log('⏹ SBV2無効');
            return { success: false, reason: 'disabled' };
        }
        
        if (!settings.emotionSyncEnabled) {
            // 感情同期OFFの場合は従来の単純再生
            return await window.SBV2Panel.speak(text);
        }

        if (isSyncPlaying) {
            console.log('⏳ 既に再生中');
            return { success: false, reason: 'already_playing' };
        }

        console.log('═══════════════════════════════════════════');
        console.log('🎭🎵👄 感情同期再生開始 (v2.1 + リップシンク)');
        console.log('═══════════════════════════════════════════');
        
        isSyncPlaying = true;
        shouldStopSync = false;

        try {
            // 1. 行分割
            const lines = splitIntoLines(text);
            if (lines.length === 0) {
                console.log('⚠️ 再生する行がありません');
                return { success: false, reason: 'no_lines' };
            }

            // 2. 感情分析 + 音声生成（並列）
            console.log('🧠 感情分析 + 🎵 音声生成を並列処理...');
            const [emotions, audioDataArray] = await Promise.all([
                analyzeEmotionsForLines(lines),
                Promise.all(lines.map(line => generateAudioForLine(line)))
            ]);

            console.log('✅ 準備完了！順次再生開始...');
            console.log('───────────────────────────────────────────');

            // 3. 順次再生（音声開始と同時に表情変更 + リップシンク）
            for (let i = 0; i < lines.length; i++) {
                if (shouldStopSync) {
                    console.log('⏹ 再生中断');
                    stopLipSync();
                    break;
                }

                const line = lines[i];
                const emotion = emotions[i] || { emotion: 'neutral', weight: 0.3 };
                const audioData = audioDataArray[i];

                console.log(`📢 [${i + 1}/${lines.length}] "${line.substring(0, 25)}${line.length > 25 ? '...' : ''}"`);
                console.log(`   → 感情: ${emotion.emotion} (${emotion.weight})`);

                // 🎭 表情を変更（音声再生と同時！）
                applyExpression(emotion.emotion, emotion.weight);
                
                // 感情表示更新
                showEmotion(emotion.emotion, Math.round(emotion.weight * 20));

                // 🔊👄 音声再生（リップシンク付き）
                if (audioData) {
                    try {
                        await playAudioAndWait(audioData);
                    } catch (e) {
                        console.warn('⚠️ 音声再生エラー、推定時間で待機');
                        stopLipSync();
                        await new Promise(r => setTimeout(r, estimateSpeakDuration(line)));
                    }
                } else {
                    const waitTime = estimateSpeakDuration(line);
                    console.log(`   (音声なし、${waitTime}ms待機)`);
                    await new Promise(r => setTimeout(r, waitTime));
                }

                // 行間ポーズ
                if (i < lines.length - 1 && !shouldStopSync) {
                    await new Promise(r => setTimeout(r, settings.pauseBetweenLines));
                }
            }

            console.log('───────────────────────────────────────────');
            console.log('✅ 感情同期再生完了');
            console.log('═══════════════════════════════════════════');

            // 最後にneutralに戻す
            setTimeout(() => {
                if (!isSyncPlaying) {
                    applyExpression('neutral', 0, 500);
                }
            }, 1000);

            return { success: true };

        } catch (e) {
            console.error('❌ 感情同期再生エラー:', e);
            stopLipSync();
            return { success: false, reason: e.message };
        } finally {
            isSyncPlaying = false;
            shouldStopSync = false;
            stopLipSync();
        }
    }
    
    /**
     * 再生を停止
     */
    function stopSync() {
        shouldStopSync = true;
        if (currentAudio) {
            currentAudio.pause();
            currentAudio = null;
        }
        stopLipSync();
        isSyncPlaying = false;
        console.log('⏹ 感情同期システム停止');
    }
    
    // ============================================
    // UI関連（既存コード + v2.1追加）
    // ============================================
    
    function createUI() {
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
                margin-bottom: 10px;
                padding-bottom: 8px;
                border-bottom: 2px solid #11998e;
                cursor: grab;
            }
            .sbv2-header:active { cursor: grabbing; }
            .sbv2-title {
                font-size: 12px;
                font-weight: bold;
                color: #333;
                display: flex;
                align-items: center;
                gap: 6px;
            }
            .sbv2-version {
                font-size: 8px;
                background: #11998e;
                color: white;
                padding: 2px 5px;
                border-radius: 3px;
            }
            .sbv2-close {
                background: none;
                border: none;
                font-size: 14px;
                cursor: pointer;
                color: #666;
                padding: 2px 6px;
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
            .sbv2-section.highlight {
                background: linear-gradient(135deg, rgba(240, 147, 251, 0.1) 0%, rgba(245, 87, 108, 0.1) 100%);
                border: 1px solid rgba(240, 147, 251, 0.3);
            }
            .sbv2-section.highlight-blue {
                background: linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%);
                border: 1px solid rgba(102, 126, 234, 0.3);
            }
            .sbv2-section-title {
                font-size: 10px;
                font-weight: bold;
                color: #11998e;
                margin-bottom: 8px;
                display: flex;
                align-items: center;
                gap: 4px;
            }
            .sbv2-section-title.pink { color: #f093fb; }
            .sbv2-section-title.blue { color: #667eea; }
            
            .sbv2-model-grid {
                display: grid;
                grid-template-columns: repeat(2, 1fr);
                gap: 6px;
                max-height: 130px;
                overflow-y: auto;
            }
            .sbv2-model-item {
                padding: 8px 6px;
                border: 2px solid #e0e0e0;
                border-radius: 6px;
                text-align: center;
                cursor: pointer;
                font-size: 9px;
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
            .sbv2-model-icon { font-size: 14px; }
            .sbv2-model-name { font-weight: bold; margin-top: 2px; font-size: 8px; word-break: break-all; }
            
            .sbv2-style-grid {
                display: flex;
                flex-wrap: wrap;
                gap: 4px;
            }
            .sbv2-style-btn {
                padding: 5px 8px;
                border: 1px solid #ddd;
                border-radius: 4px;
                background: white;
                cursor: pointer;
                font-size: 9px;
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
                margin-bottom: 8px;
            }
            .sbv2-slider-label {
                font-size: 9px;
                color: #666;
                min-width: 60px;
            }
            .sbv2-slider {
                flex: 1;
                accent-color: #11998e;
            }
            .sbv2-slider-value {
                min-width: 25px;
                text-align: center;
                font-weight: bold;
                color: #11998e;
                font-size: 10px;
            }
            
            .sbv2-btn {
                width: 100%;
                padding: 8px;
                border: none;
                border-radius: 6px;
                font-size: 10px;
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
            .sbv2-btn-pink {
                background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
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
            
            .sbv2-test-input {
                width: 100%;
                padding: 8px;
                border: 1px solid #ddd;
                border-radius: 6px;
                font-size: 10px;
                resize: vertical;
                min-height: 50px;
            }
            
            .sbv2-emotion-display {
                display: none;
                align-items: center;
                gap: 10px;
                padding: 8px;
                background: linear-gradient(135deg, rgba(17, 153, 142, 0.1) 0%, rgba(56, 239, 125, 0.1) 100%);
                border-radius: 8px;
                margin-top: 8px;
            }
            .sbv2-emotion-display.visible { display: flex; }
            .sbv2-emotion-icon { font-size: 20px; }
            .sbv2-emotion-info { flex: 1; }
            .sbv2-emotion-style { font-weight: bold; color: #11998e; font-size: 11px; }
            .sbv2-emotion-weight-bar {
                height: 5px;
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
            
            .sbv2-toggle-row {
                display: flex;
                align-items: center;
                justify-content: space-between;
                padding: 8px 0;
            }
            .sbv2-toggle-switch {
                position: relative;
                display: inline-block;
                width: 40px;
                height: 20px;
            }
            .sbv2-toggle-switch input { opacity: 0; width: 0; height: 0; }
            .sbv2-toggle-slider {
                position: absolute;
                cursor: pointer;
                top: 0; left: 0; right: 0; bottom: 0;
                background-color: #ccc;
                transition: .3s;
                border-radius: 20px;
            }
            .sbv2-toggle-slider:before {
                position: absolute;
                content: "";
                height: 14px;
                width: 14px;
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
                transform: translateX(20px);
            }
            .sbv2-toggle-switch input:checked + .sbv2-toggle-slider.pink {
                background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
            }
            .sbv2-toggle-switch input:checked + .sbv2-toggle-slider.blue {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            }
            
            .sbv2-proxy-note {
                font-size: 8px;
                color: #888;
                margin-top: 4px;
                padding: 4px;
                background: rgba(17, 153, 142, 0.1);
                border-radius: 4px;
            }
        `;
        document.head.appendChild(style);
        
        // トグルボタン
        const toggleBtn = document.createElement('button');
        toggleBtn.id = 'sbv2-toggle-btn';
        toggleBtn.className = 'disconnected';
        toggleBtn.innerHTML = '🎤 SBV2 TTS OFF';
        document.body.appendChild(toggleBtn);
        
        // パネル
        const panel = document.createElement('div');
        panel.id = 'sbv2-panel';
        panel.innerHTML = `
            <div class="sbv2-header">
                <div class="sbv2-title">
                    <span>🎤🎭👄</span>
                    <span>Style-Bert-VITS2</span>
                    <span class="sbv2-version">v2.1</span>
                </div>
                <button class="sbv2-close" id="sbv2-close">✕</button>
            </div>
            
            <div class="sbv2-status">
                <div class="sbv2-status-dot" id="sbv2-status-dot"></div>
                <span id="sbv2-status-text">未接続</span>
                <button class="sbv2-btn sbv2-btn-secondary" id="sbv2-connect-btn" style="margin:0;padding:5px 8px;width:auto;margin-left:auto;font-size:9px;">接続</button>
            </div>
            <div class="sbv2-proxy-note">📡 プロキシ経由: localhost:8080 → localhost:8000</div>
            
            <div class="sbv2-section">
                <div class="sbv2-toggle-row">
                    <span style="font-weight:bold;font-size:11px;">🔊 SBV2を使用</span>
                    <label class="sbv2-toggle-switch">
                        <input type="checkbox" id="sbv2-enabled">
                        <span class="sbv2-toggle-slider"></span>
                    </label>
                </div>
                <div style="font-size:8px;color:#888;margin-top:4px;">
                    ONにするとChatGPT応答をSBV2で読み上げ
                </div>
            </div>
            
            <!-- v2.2 新機能: Grok Voice -->
            <div class="sbv2-section" style="background: linear-gradient(135deg, rgba(255, 107, 53, 0.1) 0%, rgba(255, 204, 0, 0.1) 100%); border: 1px solid rgba(255, 107, 53, 0.3);">
                <div class="sbv2-section-title" style="color: #ff6b35;">🔊⚡ Grok Voice (v2.2)</div>
                <div class="sbv2-toggle-row">
                    <span style="font-size:10px;">SBV2の代わりにGrok Voiceを使用</span>
                    <label class="sbv2-toggle-switch">
                        <input type="checkbox" id="sbv2-use-grok">
                        <span class="sbv2-toggle-slider" style="background:linear-gradient(135deg, #ff6b35 0%, #ffcc00 100%) !important;"></span>
                    </label>
                </div>
                <div id="sbv2-grok-voice-select" style="margin-top:8px;display:none;">
                    <label style="font-size:9px;color:#666;display:block;margin-bottom:4px;">🎤 Grok声種選択:</label>
                    <select id="sbv2-grok-voice" style="width:100%;padding:6px;border:1px solid #ff6b35;border-radius:4px;font-size:10px;">
                        <option value="Ara">👩 Ara (女性/温かい)</option>
                        <option value="Eve">👩 Eve (女性/元気)</option>
                        <option value="Rex">👨 Rex (男性/自信)</option>
                        <option value="Leo">👨 Leo (男性/威厳)</option>
                        <option value="Sal">🧑 Sal (中性)</option>
                    </select>
                </div>
                <div style="font-size:8px;color:#888;margin-top:4px;">
                    ⚡ 高速リアルタイム音声合成（SBV2より高速）
                </div>
            </div>
            
            <!-- v2.0 新機能: 感情同期 -->
            <div class="sbv2-section highlight">
                <div class="sbv2-section-title pink">🎭✨ 行ごと感情同期 (v2.0)</div>
                <div class="sbv2-toggle-row">
                    <span style="font-size:10px;">表情モーフ自動変更</span>
                    <label class="sbv2-toggle-switch">
                        <input type="checkbox" id="sbv2-emotion-sync" checked>
                        <span class="sbv2-toggle-slider pink"></span>
                    </label>
                </div>
                <div style="font-size:8px;color:#888;margin-top:4px;">
                    文章を行ごとに分析し、音声再生タイミングで表情を変更
                </div>
            </div>
            
            <!-- v2.1 新機能: リップシンク -->
            <div class="sbv2-section highlight-blue">
                <div class="sbv2-section-title blue">👄 リップシンク (v2.1)</div>
                <div class="sbv2-toggle-row">
                    <span style="font-size:10px;">音声再生中に口パク</span>
                    <label class="sbv2-toggle-switch">
                        <input type="checkbox" id="sbv2-lip-sync" checked>
                        <span class="sbv2-toggle-slider blue"></span>
                    </label>
                </div>
                <div style="font-size:8px;color:#888;margin-top:4px;">
                    音声再生中、VRMモデルの口が動きます
                </div>
            </div>
            
            <!-- v2.2 新機能: neutral復帰遅延 -->
            <div class="sbv2-section">
                <div class="sbv2-section-title">🕒 neutral復帰遅延</div>
                <div class="sbv2-slider-row">
                    <span class="sbv2-slider-label">表情リセット</span>
                    <input type="range" class="sbv2-slider" id="sbv2-neutral-delay" min="0" max="3000" step="100" value="1000">
                    <span class="sbv2-slider-value" id="sbv2-neutral-delay-value">1.0秒</span>
                </div>
                <div style="font-size:8px;color:#888;margin-top:4px;">
                    再生終了後、neutralに戻るまでの待機時間
                </div>
            </div>
            
            <div class="sbv2-section">
                <div class="sbv2-section-title">🎭 音声モデル</div>
                <div class="sbv2-model-grid" id="sbv2-model-grid">
                    <div style="grid-column:1/-1;text-align:center;color:#888;padding:15px;font-size:10px;">
                        接続後にモデル一覧を表示
                    </div>
                </div>
            </div>
            
            <div class="sbv2-section">
                <div class="sbv2-section-title">😊 感情スタイル</div>
                <div class="sbv2-style-grid" id="sbv2-style-grid">
                    <button class="sbv2-style-btn active" data-style="Neutral">😐 Neutral</button>
                </div>
            </div>
            
            <div class="sbv2-section">
                <div class="sbv2-section-title">🎚️ パラメータ</div>
                <div class="sbv2-slider-row">
                    <span class="sbv2-slider-label">感情の強さ</span>
                    <input type="range" class="sbv2-slider" id="sbv2-weight" min="1" max="20" value="10">
                    <span class="sbv2-slider-value" id="sbv2-weight-value">10</span>
                </div>
                <div class="sbv2-slider-row">
                    <span class="sbv2-slider-label">速度</span>
                    <input type="range" class="sbv2-slider" id="sbv2-speed" min="0.5" max="2.0" step="0.1" value="1.0">
                    <span class="sbv2-slider-value" id="sbv2-speed-value">1.0</span>
                </div>
                <div class="sbv2-slider-row">
                    <span class="sbv2-slider-label">行間ポーズ</span>
                    <input type="range" class="sbv2-slider" id="sbv2-pause" min="50" max="500" step="50" value="150">
                    <span class="sbv2-slider-value" id="sbv2-pause-value">150ms</span>
                </div>
            </div>
            
            <div class="sbv2-section">
                <div class="sbv2-section-title">🔊 テスト読み上げ</div>
                <textarea class="sbv2-test-input" id="sbv2-test-text" placeholder="テスト用テキスト（複数行も対応）">こんにちは！今日はいい天気ですね！
でも、ちょっと悲しいこともあったの...
まあでも、元気出していこう！</textarea>
                <button class="sbv2-btn sbv2-btn-primary" id="sbv2-test-btn" disabled>🔊 読み上げテスト</button>
                <button class="sbv2-btn sbv2-btn-pink" id="sbv2-test-sync-btn" disabled>🎭✨👄 感情同期テスト</button>
                <button class="sbv2-btn" id="sbv2-stop-btn" style="background:#ff6b6b;color:white;display:none;">⏹ 停止</button>
                <div class="sbv2-emotion-display" id="sbv2-emotion-display">
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
        
        setupEventListeners();
        
        // 初期値設定
        document.getElementById('sbv2-weight').value = settings.styleWeight;
        document.getElementById('sbv2-weight-value').textContent = settings.styleWeight;
        document.getElementById('sbv2-speed').value = settings.speed;
        document.getElementById('sbv2-speed-value').textContent = settings.speed.toFixed(1);
        document.getElementById('sbv2-pause').value = settings.pauseBetweenLines;
        document.getElementById('sbv2-pause-value').textContent = settings.pauseBetweenLines + 'ms';
        document.getElementById('sbv2-enabled').checked = settings.enabled;
        document.getElementById('sbv2-emotion-sync').checked = settings.emotionSyncEnabled;
        document.getElementById('sbv2-lip-sync').checked = settings.lipSyncEnabled;
        // v2.2: Grok Voice初期値
        document.getElementById('sbv2-use-grok').checked = settings.useGrokVoice;
        document.getElementById('sbv2-grok-voice').value = settings.grokVoice;
        document.getElementById('sbv2-grok-voice-select').style.display = settings.useGrokVoice ? 'block' : 'none';
        
        setTimeout(connect, 1000);
    }
    
    function setupEventListeners() {
        const $ = id => document.getElementById(id);
        
        $('sbv2-toggle-btn').addEventListener('click', () => {
            $('sbv2-panel').classList.toggle('visible');
        });
        
        $('sbv2-close').addEventListener('click', () => {
            $('sbv2-panel').classList.remove('visible');
        });
        
        $('sbv2-connect-btn').addEventListener('click', connect);
        
        $('sbv2-enabled').addEventListener('change', (e) => {
            settings.enabled = e.target.checked;
            updateToggleButton();
            saveSettings();
        });
        
        // v2.2: Grok Voiceトグル
        $('sbv2-use-grok').addEventListener('change', (e) => {
            settings.useGrokVoice = e.target.checked;
            // Grok Voice選択ドロップダウンの表示/非表示
            $('sbv2-grok-voice-select').style.display = e.target.checked ? 'block' : 'none';
            saveSettings();
            updateToggleButton();
            console.log('🔊⚡ Grok Voice:', settings.useGrokVoice ? 'ON' : 'OFF');
        });
        
        // v2.2: Grok Voice選択
        $('sbv2-grok-voice').addEventListener('change', (e) => {
            settings.grokVoice = e.target.value;
            saveSettings();
            console.log('🎤 Grok Voice変更:', settings.grokVoice);
        });
        
        // v2.0: 感情同期トグル
        $('sbv2-emotion-sync').addEventListener('change', (e) => {
            settings.emotionSyncEnabled = e.target.checked;
            saveSettings();
            console.log('🎭 感情同期:', settings.emotionSyncEnabled ? 'ON' : 'OFF');
        });
        
        // v2.1: リップシンクトグル
        $('sbv2-lip-sync').addEventListener('change', (e) => {
            settings.lipSyncEnabled = e.target.checked;
            saveSettings();
            console.log('👄 リップシンク:', settings.lipSyncEnabled ? 'ON' : 'OFF');
        });
        
        document.querySelectorAll('.sbv2-style-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.sbv2-style-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                settings.style = btn.dataset.style;
                saveSettings();
            });
        });
        
        $('sbv2-weight').addEventListener('input', (e) => {
            const val = parseInt(e.target.value);
            $('sbv2-weight-value').textContent = val;
            settings.styleWeight = val;
            saveSettings();
        });
        
        $('sbv2-speed').addEventListener('input', (e) => {
            const val = parseFloat(e.target.value);
            $('sbv2-speed-value').textContent = val.toFixed(1);
            settings.speed = val;
            saveSettings();
        });
        
        $('sbv2-pause').addEventListener('input', (e) => {
            const val = parseInt(e.target.value);
            $('sbv2-pause-value').textContent = val + 'ms';
            settings.pauseBetweenLines = val;
            saveSettings();
        });
        
        // v2.2: neutral復帰遅延スライダー
        $('sbv2-neutral-delay').addEventListener('input', (e) => {
            const val = parseInt(e.target.value);
            $('sbv2-neutral-delay-value').textContent = (val / 1000).toFixed(1) + '秒';
            settings.returnToNeutralDelay = val;
            saveSettings();
            // SBV2EmotionSyncにも連動
            if (window.SBV2EmotionSync && window.SBV2EmotionSync.setReturnToNeutralDelay) {
                window.SBV2EmotionSync.setReturnToNeutralDelay(val);
            }
        });
        
        $('sbv2-test-btn').addEventListener('click', testSpeak);
        
        // v2.0: 感情同期テスト
        $('sbv2-test-sync-btn').addEventListener('click', testSyncSpeak);
        
        $('sbv2-stop-btn').addEventListener('click', () => {
            stopSync();
            $('sbv2-stop-btn').style.display = 'none';
        });
        
        setupDrag();
    }
    
    function setupDrag() {
        const panel = document.getElementById('sbv2-panel');
        const header = panel.querySelector('.sbv2-header');
        let isDragging = false;
        let offsetX = 0, offsetY = 0;
        
        header.addEventListener('mousedown', (e) => {
            if (e.target.classList.contains('sbv2-close')) return;
            isDragging = true;
            const rect = panel.getBoundingClientRect();
            offsetX = e.clientX - rect.left;
            offsetY = e.clientY - rect.top;
            e.preventDefault();
        });
        
        document.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            let x = e.clientX - offsetX;
            let y = e.clientY - offsetY;
            x = Math.max(0, Math.min(x, window.innerWidth - panel.offsetWidth));
            y = Math.max(0, Math.min(y, window.innerHeight - panel.offsetHeight));
            panel.style.left = x + 'px';
            panel.style.top = y + 'px';
            panel.style.bottom = 'auto';
        });
        
        document.addEventListener('mouseup', () => isDragging = false);
    }
    
    async function connect() {
        const $ = id => document.getElementById(id);
        
        $('sbv2-status-text').textContent = '接続中...';
        $('sbv2-connect-btn').disabled = true;
        
        try {
            const response = await fetch('/sbv2/api/version', { timeout: 10000 });
            
            if (response.ok) {
                const versionData = await response.json();
                
                if (versionData.error) {
                    throw new Error(versionData.detail || versionData.error);
                }
                
                // モデル情報取得
                const modelsResponse = await fetch('/sbv2/api/models_info');
                if (modelsResponse.ok) {
                    const modelsData = await modelsResponse.json();
                    if (!modelsData.error && Array.isArray(modelsData)) {
                        modelsInfo = modelsData;
                    } else {
                        modelsInfo = [];
                    }
                    renderModels();
                    
                    if (modelsInfo.length > 0 && !settings.modelFile) {
                        settings.model = modelsInfo[0].name;
                        settings.modelFile = modelsInfo[0].files?.[0] || `${modelsInfo[0].name}.safetensors`;
                        saveSettings();
                    }
                }
                
                isConnected = true;
                $('sbv2-status-dot').className = 'sbv2-status-dot connected';
                $('sbv2-status-text').textContent = `接続OK (v${versionData})`;
                $('sbv2-test-btn').disabled = false;
                $('sbv2-test-sync-btn').disabled = false;
                $('sbv2-toggle-btn').classList.remove('disconnected');
                updateToggleButton();
                
            } else {
                throw new Error(`接続失敗: ${response.status}`);
            }
            
        } catch (error) {
            console.error('❌ SBV2接続エラー:', error);
            isConnected = false;
            $('sbv2-status-dot').className = 'sbv2-status-dot error';
            $('sbv2-status-text').textContent = 'SBV2サーバーに接続できません';
            $('sbv2-test-btn').disabled = true;
            $('sbv2-test-sync-btn').disabled = true;
            $('sbv2-toggle-btn').classList.add('disconnected');
            $('sbv2-toggle-btn').innerHTML = '🎤 SBV2 TTS OFF';
        }
        
        $('sbv2-connect-btn').disabled = false;
    }
    
    function renderModels() {
        const grid = document.getElementById('sbv2-model-grid');
        if (!modelsInfo || modelsInfo.length === 0) {
            grid.innerHTML = '<div style="grid-column:1/-1;text-align:center;color:#888;padding:15px;font-size:10px;">モデルがありません</div>';
            return;
        }
        
        const getIcon = (name) => {
            const n = name.toLowerCase();
            if (n.includes('f1') || n.includes('f2') || n.includes('fn')) return '👩';
            if (n.includes('m1') || n.includes('m2')) return '👨';
            if (n.includes('ami') || n.includes('koharune')) return '🎀';
            if (n.includes('amitaro')) return '🐱';
            return '🎤';
        };
        
        grid.innerHTML = modelsInfo.map((model) => {
            const isActive = model.name === settings.model;
            const modelFile = model.files?.[0] || `${model.name}.safetensors`;
            return `
                <div class="sbv2-model-item ${isActive ? 'active' : ''}" data-model="${model.name}" data-file="${modelFile}">
                    <div class="sbv2-model-icon">${getIcon(model.name)}</div>
                    <div class="sbv2-model-name">${model.name}</div>
                </div>
            `;
        }).join('');
        
        grid.querySelectorAll('.sbv2-model-item').forEach(item => {
            item.addEventListener('click', () => {
                grid.querySelectorAll('.sbv2-model-item').forEach(i => i.classList.remove('active'));
                item.classList.add('active');
                settings.model = item.dataset.model;
                settings.modelFile = item.dataset.file;
                saveSettings();
                updateStyleButtons();
            });
        });
        
        updateStyleButtons();
    }
    
    function updateStyleButtons() {
        const model = modelsInfo.find(m => m.name === settings.model);
        if (!model || !model.styles) return;
        
        const icons = {
            'Neutral': '😐', 'Happy': '😊', 'Angry': '😠', 'Sad': '😢',
            'Surprise': '😲', 'Fear': '😨', 'Disgust': '🤢',
            'ノーマル': '😐', 'るんるん': '🎵', 'ささやき': '🤫'
        };
        
        const grid = document.getElementById('sbv2-style-grid');
        grid.innerHTML = model.styles.map(style => {
            const isActive = style === settings.style;
            const icon = icons[style] || '🎭';
            return `<button class="sbv2-style-btn ${isActive ? 'active' : ''}" data-style="${style}">${icon} ${style}</button>`;
        }).join('');
        
        grid.querySelectorAll('.sbv2-style-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                grid.querySelectorAll('.sbv2-style-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                settings.style = btn.dataset.style;
                saveSettings();
            });
        });
    }
    
    function updateToggleButton() {
        const btn = document.getElementById('sbv2-toggle-btn');
        if (settings.useGrokVoice && settings.enabled) {
            // Grok Voiceモード
            btn.classList.add('active');
            btn.style.background = 'linear-gradient(135deg, #ff6b35 0%, #ffcc00 100%)';
            btn.innerHTML = '⚡ Grok Voice ON';
        } else if (isConnected && settings.enabled) {
            btn.classList.add('active');
            btn.style.background = '';
            btn.innerHTML = '🎤 SBV2 TTS ON';
        } else if (isConnected) {
            btn.classList.remove('active');
            btn.style.background = '';
            btn.innerHTML = '🎤 SBV2 TTS OFF';
        } else {
            btn.classList.remove('active');
            btn.style.background = '';
            btn.innerHTML = '🎤 SBV2 TTS OFF';
        }
    }
    
    function getValidStyle(requestedStyle) {
        const modelInfo = modelsInfo.find(m => m.name === settings.model);
        if (!modelInfo || !modelInfo.styles || modelInfo.styles.length === 0) {
            return 'Neutral';
        }
        
        if (modelInfo.styles.includes(requestedStyle)) {
            return requestedStyle;
        }
        
        const fallback = modelInfo.styles.includes('Neutral') ? 'Neutral' : modelInfo.styles[0];
        console.log(`⚠️ スタイル「${requestedStyle}」→「${fallback}」にフォールバック`);
        return fallback;
    }
    
    async function getG2P(text) {
        try {
            const response = await fetch('/sbv2/api/g2p', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text: text })
            });
            if (!response.ok) return [];
            const data = await response.json();
            return data.mora_tone_list || data || [];
        } catch (e) {
            return [];
        }
    }
    
    async function synthesizeAndPlay(text, style, styleWeight, speed) {
        const moraToneList = await getG2P(text);
        
        const modelInfo = modelsInfo.find(m => m.name === settings.model);
        const modelFile = modelInfo?.files?.[0] || settings.modelFile || `${settings.model}.safetensors`;
        const validStyle = getValidStyle(style);
        
        const response = await fetch('/sbv2/api/synthesis', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: settings.model,
                modelFile: modelFile,
                text: text,
                moraToneList: moraToneList,
                style: validStyle,
                styleWeight: styleWeight,
                speed: speed,
                language: 'JP'
            })
        });
        
        if (!response.ok) {
            throw new Error(`音声合成失敗: ${response.status}`);
        }
        
        const audioData = await response.arrayBuffer();
        if (audioData.byteLength < 1000) {
            throw new Error('音声データが小さすぎます');
        }
        
        const blob = new Blob([audioData], { type: 'audio/wav' });
        const url = URL.createObjectURL(blob);
        
        return new Promise((resolve, reject) => {
            const audio = new Audio(url);
            
            // 👄 再生開始時にリップシンク開始
            audio.onplay = () => {
                startLipSync();
            };
            
            audio.onended = () => {
                stopLipSync();
                URL.revokeObjectURL(url);
                resolve({ success: true });
            };
            audio.onerror = (e) => {
                stopLipSync();
                URL.revokeObjectURL(url);
                reject(e);
            };
            audio.play().catch(e => {
                stopLipSync();
                URL.revokeObjectURL(url);
                reject(e);
            });
        });
    }
    
    async function testSpeak() {
        if (!isConnected) return;
        
        const text = document.getElementById('sbv2-test-text').value.trim();
        if (!text) return;
        
        const btn = document.getElementById('sbv2-test-btn');
        btn.disabled = true;
        btn.textContent = '🔊 合成中...';
        
        try {
            showEmotion(settings.style, settings.styleWeight);
            const styleWeight = 0.5 + (settings.styleWeight - 1) * (2.5 / 19);
            await synthesizeAndPlay(text, settings.style, styleWeight, settings.speed);
        } catch (error) {
            alert('読み上げに失敗しました: ' + error.message);
        } finally {
            btn.disabled = false;
            btn.textContent = '🔊 読み上げテスト';
        }
    }
    
    async function testSyncSpeak() {
        if (!isConnected) return;
        
        const text = document.getElementById('sbv2-test-text').value.trim();
        if (!text) return;
        
        const btn = document.getElementById('sbv2-test-sync-btn');
        const stopBtn = document.getElementById('sbv2-stop-btn');
        btn.disabled = true;
        btn.textContent = '🎭✨👄 処理中...';
        stopBtn.style.display = 'block';
        
        try {
            await playSyncedResponse(text);
        } catch (error) {
            alert('感情同期再生に失敗しました: ' + error.message);
        } finally {
            btn.disabled = false;
            btn.textContent = '🎭✨👄 感情同期テスト';
            stopBtn.style.display = 'none';
        }
    }
    
    function showEmotion(style, weight) {
        const display = document.getElementById('sbv2-emotion-display');
        const icon = document.getElementById('sbv2-emotion-icon');
        const styleText = document.getElementById('sbv2-emotion-style');
        const weightFill = document.getElementById('sbv2-emotion-weight-fill');
        
        const icons = {
            'Neutral': '😐', 'Happy': '😊', 'Angry': '😠', 'Sad': '😢',
            'Surprise': '😲', 'Fear': '😨', 'Disgust': '🤢',
            'joy': '😄', 'happy': '😊', 'excited': '🤩', 'grateful': '🙏',
            'sad': '😢', 'crying': '😭', 'lonely': '😔', 'disappointed': '😞',
            'angry': '😠', 'annoyed': '😤', 'frustrated': '😩',
            'surprised': '😲', 'shocked': '😱', 'confused': '😕',
            'relaxed': '😌', 'calm': '🙂', 'shy': '😊',
            'neutral': '😐', 'thinking': '🤔'
        };
        
        display.classList.add('visible');
        icon.textContent = icons[style] || icons[style.toLowerCase()] || '🎭';
        styleText.textContent = `${style} Lv.${weight}`;
        weightFill.style.width = `${(weight / 20) * 100}%`;
    }
    
    // グローバルAPI
    window.SBV2Panel = {
        isEnabled: () => (isConnected || settings.useGrokVoice) && settings.enabled,
        isGrokVoiceEnabled: () => settings.useGrokVoice && settings.enabled,
        getGrokVoice: () => settings.grokVoice,
        getSettings: () => ({ ...settings }),
        
        // v1.2: 現在再生中の音声を取得（音声監視用）
        get currentAudio() { return currentAudio; },
        get isSyncPlayingNow() { return isSyncPlaying; },
        
        // 従来の単純読み上げ（リップシンク付き）
        speak: async function(text, emotion = null) {
            if (!isConnected || !settings.enabled) return null;
            
            const style = emotion?.style || settings.style;
            const weight = emotion?.weight || settings.styleWeight;
            const styleWeight = 0.5 + (weight - 1) * (2.5 / 19);
            
            try {
                showEmotion(style, weight);
                await synthesizeAndPlay(text, style, styleWeight, settings.speed);
                return { success: true };
            } catch (error) {
                console.error('❌ SBV2読み上げエラー:', error);
                return { success: false, error: error.message };
            }
        },
        
        // 🎭👄 v2.1: 感情同期再生 + リップシンク（メイン機能！）
        speakWithEmotionSync: playSyncedResponse,
        
        // 停止
        stop: stopSync,
        
        // 状態
        isSyncPlaying: () => isSyncPlaying,
        
        // v1.2: 全音声停止（外部から呼び出し可能）
        forceStop: function() {
            shouldStopSync = true;
            if (currentAudio) {
                try {
                    currentAudio.pause();
                    currentAudio.currentTime = 0;
                    currentAudio = null;
                } catch(e) {}
            }
            stopLipSync();
            isSyncPlaying = false;
            console.log('🔇 SBV2Panel: 強制停止');
        }
    };
    
    // 初期化
    loadSettings();
    
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => setTimeout(createUI, 500));
    } else {
        setTimeout(createUI, 500);
    }
    
    console.log('✅ Style-Bert-VITS2 パネル v2.2 準備完了（感情同期 + リップシンク + Grok Voice）');
})();
