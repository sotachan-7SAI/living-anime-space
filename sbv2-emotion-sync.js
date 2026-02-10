/**
 * SBV2 Emotion Sync System v1.0
 * 
 * 📝 行ごとに感情分析
 * 🎵 行ごとに音声を事前生成
 * 🎭 音声再生タイミングで表情モーフを変更
 * 🎬 モーションは別レイヤー（干渉しない）
 * 
 * フロー:
 * 1. ChatGPT応答を行ごとに分割
 * 2. 各行の感情を一括分析（OpenAI API）
 * 3. 各行の音声を事前生成（SBV2 API）
 * 4. 順番に再生：音声開始と同時に表情モーフ変更
 */

(function() {
    console.log('🎭🎵 SBV2 Emotion Sync System v1.0 読み込み開始');

    // 設定
    const CONFIG = {
        minLineLength: 2,           // 最小行の文字数（短すぎる行はスキップ）
        expressionTransition: 200,  // 表情遷移時間(ms)
        pauseBetweenLines: 150,     // 行間のポーズ(ms)
        maxConcurrentGenerate: 3,   // 同時音声生成数
        enabled: true,              // 有効/無効
        returnToNeutralDelay: 1000  // neutral復帰までの遅延(ms) 0-3000
    };

    // 表情マッピング（感情名 → VRM表情名）
    const EMOTION_MAP = {
        // 喜び系
        joy:      'happy',
        happy:    'happy',
        excited:  'happy',
        grateful: 'happy',
        love:     'happy',
        
        // 悲しみ系
        sad:      'sad',
        crying:   'sad',
        lonely:   'sad',
        disappointed: 'sad',
        
        // 怒り系
        angry:    'angry',
        annoyed:  'angry',
        frustrated: 'angry',
        
        // 驚き系
        surprised: 'surprised',
        shocked:   'surprised',
        confused:  'surprised',
        
        // リラックス系
        relaxed:  'relaxed',
        calm:     'relaxed',
        shy:      'relaxed',
        
        // ニュートラル
        neutral:  'neutral',
        thinking: 'neutral'
    };

    // 状態管理
    let isPlaying = false;
    let currentAudio = null;
    let shouldStop = false;

    /**
     * テキストを行ごとに分割
     */
    function splitIntoLines(text) {
        // 句点、感嘆符、疑問符、改行で分割
        const lines = text
            .replace(/\r\n/g, '\n')
            .split(/(?<=[。！？\n])|(?<=\.\s)|(?<=!\s)|(?<=\?\s)/)
            .map(line => line.trim())
            .filter(line => line.length >= CONFIG.minLineLength);
        
        console.log('📝 行分割:', lines.length, '行');
        lines.forEach((line, i) => console.log(`  ${i+1}: "${line.substring(0, 30)}..."`));
        return lines;
    }

    /**
     * OpenAI APIキーを取得
     */
    function getApiKey() {
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
        const apiKey = getApiKey();
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
            const content = data.choices[0].message.content.trim();
            
            // JSONパース（```json ... ``` 形式も対応）
            let jsonStr = content;
            if (content.includes('```')) {
                const match = content.match(/```(?:json)?\s*([\s\S]*?)```/);
                if (match) jsonStr = match[1].trim();
            }
            
            const emotions = JSON.parse(jsonStr);
            console.log('🎭 感情分析結果:', emotions);
            
            // 行数調整
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
     * 1行の音声を生成（SBV2 API）
     */
    async function generateAudioForLine(text) {
        if (!window.SBV2Panel || !window.SBV2Panel.isEnabled()) {
            console.warn('⚠️ SBV2が無効');
            return null;
        }

        try {
            const settings = window.SBV2Panel.getSettings();
            
            // G2P
            const g2pRes = await fetch('/sbv2/api/g2p', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text: text })
            });
            
            if (!g2pRes.ok) throw new Error('G2P failed');
            const g2pData = await g2pRes.json();
            const moraToneList = g2pData.mora_tone_list || g2pData || [];

            // Synthesis
            const styleWeight = 0.5 + (settings.styleWeight - 1) * (2.5 / 19);
            const synthRes = await fetch('/sbv2/api/synthesis', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: settings.model,
                    modelFile: settings.modelFile,
                    text: text,
                    moraToneList: moraToneList,
                    style: 'Neutral',
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
     * 表情モーフを適用（スムーズ遷移、モーションに干渉しない）
     */
    function applyExpression(emotionName, weight, duration = CONFIG.expressionTransition) {
        if (!window.app || !window.app.vrm) return;
        
        const em = window.app.vrm.expressionManager;
        if (!em) return;

        // 感情名をVRM表情名に変換
        const targetExpression = EMOTION_MAP[emotionName] || 'neutral';
        const targetWeight = targetExpression === 'neutral' ? 0 : weight;

        const allExpressions = ['happy', 'angry', 'sad', 'surprised', 'relaxed'];
        
        // 現在の値を取得
        const startWeights = {};
        allExpressions.forEach(expr => {
            try { startWeights[expr] = em.getValue(expr) || 0; }
            catch (e) { startWeights[expr] = 0; }
        });

        const startTime = performance.now();
        let animId = null;

        function animate() {
            const elapsed = performance.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const ease = 1 - Math.pow(1 - progress, 3); // ease-out

            try {
                allExpressions.forEach(expr => {
                    if (expr === targetExpression && targetWeight > 0) {
                        em.setValue(expr, startWeights[expr] + (targetWeight - startWeights[expr]) * ease);
                    } else {
                        em.setValue(expr, startWeights[expr] * (1 - ease));
                    }
                });

                if (progress < 1) {
                    animId = requestAnimationFrame(animate);
                } else {
                    console.log('🎭 表情変更完了:', targetExpression, targetWeight.toFixed(2));
                }
            } catch (e) {
                // エラー時は中断
            }
        }

        animId = requestAnimationFrame(animate);
        console.log('🎭 表情変更:', emotionName, '→', targetExpression, '(', weight.toFixed(2), ')');
    }

    /**
     * 音声を再生して完了を待つ
     */
    function playAudioAndWait(audioData) {
        return new Promise((resolve, reject) => {
            const blob = new Blob([audioData], { type: 'audio/wav' });
            const url = URL.createObjectURL(blob);
            const audio = new Audio(url);
            
            currentAudio = audio;

            audio.onended = () => {
                URL.revokeObjectURL(url);
                currentAudio = null;
                resolve();
            };

            audio.onerror = (e) => {
                URL.revokeObjectURL(url);
                currentAudio = null;
                reject(e);
            };

            audio.play().catch(e => {
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
        // 日本語: 約6文字/秒、最低500ms
        return Math.max(500, text.length * 150);
    }

    /**
     * メイン処理：感情同期再生
     * @param {string} text - ChatGPT応答テキスト全文
     */
    async function playSyncedResponse(text) {
        if (!CONFIG.enabled) {
            console.log('⏹ 感情同期システム無効');
            return { success: false, reason: 'disabled' };
        }

        if (isPlaying) {
            console.log('⏳ 既に再生中');
            return { success: false, reason: 'already_playing' };
        }

        console.log('═══════════════════════════════════════════');
        console.log('🎬🎵 感情同期再生開始');
        console.log('═══════════════════════════════════════════');
        
        isPlaying = true;
        shouldStop = false;

        try {
            // 1. 行分割
            const lines = splitIntoLines(text);
            if (lines.length === 0) {
                console.log('⚠️ 再生する行がありません');
                isPlaying = false;
                return { success: false, reason: 'no_lines' };
            }

            // 2. 感情分析（非同期で開始）
            console.log('🧠 感情分析開始...');
            const emotionsPromise = analyzeEmotionsForLines(lines);

            // 3. 音声生成（並列処理）
            console.log('🎵 音声生成開始...');
            const audioPromises = lines.map(line => generateAudioForLine(line));
            
            // 4. 両方の完了を待つ
            const [emotions, audioDataArray] = await Promise.all([
                emotionsPromise,
                Promise.all(audioPromises)
            ]);

            console.log('✅ 準備完了！順次再生開始...');
            console.log('───────────────────────────────────────────');

            // 5. 順次再生（音声開始と同時に表情変更）
            for (let i = 0; i < lines.length; i++) {
                if (shouldStop) {
                    console.log('⏹ 再生中断');
                    break;
                }

                const line = lines[i];
                const emotion = emotions[i] || { emotion: 'neutral', weight: 0.3 };
                const audioData = audioDataArray[i];

                console.log(`📢 [${i + 1}/${lines.length}] "${line.substring(0, 25)}${line.length > 25 ? '...' : ''}"`);
                console.log(`   → 感情: ${emotion.emotion} (${emotion.weight})`);

                // 🎭 表情を変更（音声再生と同時！）
                applyExpression(emotion.emotion, emotion.weight);

                // 🔊 音声再生
                if (audioData) {
                    try {
                        await playAudioAndWait(audioData);
                    } catch (e) {
                        console.warn('⚠️ 音声再生エラー、推定時間で待機');
                        await new Promise(r => setTimeout(r, estimateSpeakDuration(line)));
                    }
                } else {
                    // 音声生成失敗時は推定時間待機
                    const waitTime = estimateSpeakDuration(line);
                    console.log(`   (音声なし、${waitTime}ms待機)`);
                    await new Promise(r => setTimeout(r, waitTime));
                }

                // 行間ポーズ
                if (i < lines.length - 1 && !shouldStop) {
                    await new Promise(r => setTimeout(r, CONFIG.pauseBetweenLines));
                }
            }

            console.log('───────────────────────────────────────────');
            console.log('✅ 感情同期再生完了');
            console.log('═══════════════════════════════════════════');

            // 最後にneutralに戻す（設定可能な遅延後）
            setTimeout(() => {
                if (!isPlaying) {
                    applyExpression('neutral', 0, 500);
                }
            }, CONFIG.returnToNeutralDelay);

            return { success: true };

        } catch (e) {
            console.error('❌ 感情同期再生エラー:', e);
            return { success: false, reason: e.message };
        } finally {
            isPlaying = false;
            shouldStop = false;
        }
    }

    /**
     * 再生を停止
     */
    function stop() {
        shouldStop = true;
        if (currentAudio) {
            currentAudio.pause();
            currentAudio = null;
        }
        isPlaying = false;
        console.log('⏹ 感情同期システム停止');
    }

    /**
     * 設定を変更
     */
    function setEnabled(enabled) {
        CONFIG.enabled = enabled;
        console.log('🎭🎵 感情同期システム:', enabled ? 'ON' : 'OFF');
    }

    /**
     * neutral復帰遅延を設定 (0-3000ms)
     */
    function setReturnToNeutralDelay(delayMs) {
        CONFIG.returnToNeutralDelay = Math.max(0, Math.min(3000, delayMs));
        console.log('🕒 neutral復帰遅延:', CONFIG.returnToNeutralDelay, 'ms');
    }

    // グローバルAPI公開
    window.SBV2EmotionSync = {
        play: playSyncedResponse,
        stop: stop,
        isPlaying: () => isPlaying,
        isEnabled: () => CONFIG.enabled,
        setEnabled: setEnabled,
        applyExpression: applyExpression,
        setReturnToNeutralDelay: setReturnToNeutralDelay,
        getReturnToNeutralDelay: () => CONFIG.returnToNeutralDelay,
        config: CONFIG
    };

    console.log('✅ SBV2 Emotion Sync System v1.0 読み込み完了');
    console.log('   使い方: window.SBV2EmotionSync.play("テキスト")');
})();
