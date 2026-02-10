/**
 * Multi-Character AI Chat System v1.0
 * 
 * 各キャラクターが独立したAIチャット機能を持つシステム
 * - 独立したLLM会話履歴
 * - 感情分析 → モーション → 表情
 * - TTS → リップシンク
 */

(function() {
    'use strict';
    
    console.log('🎭 Multi-Character AI Chat System v1.0 読み込み開始');
    
    // ========================================
    // CharacterAIChat - キャラクター専用AIチャット
    // ========================================
    
    class CharacterAIChat {
        constructor(config) {
            this.id = config.id || `chat_${Date.now()}`;
            this.characterId = config.characterId;
            this.name = config.name || 'キャラクター';
            this.personality = config.personality || 'フレンドリーなキャラクター';
            
            // LLM設定
            this.llmProvider = config.llmProvider || 'chatgpt'; // chatgpt, gemini, claude, grok
            this.llmModel = config.llmModel || 'gpt-4o-mini';
            this.apiKey = config.apiKey || null;
            
            // 会話履歴
            this.conversationHistory = [];
            this.maxHistoryLength = 10;
            
            // TTS設定
            this.ttsEngine = config.ttsEngine || 'sbv2'; // sbv2, google, browser
            this.voiceModel = config.voiceModel || 'jvnv-F1-jp';
            this.voiceSpeakerId = config.voiceSpeakerId || 0;
            
            // VRM参照
            this.vrm = null;
            this.mixer = null;
            this.currentAction = null;
            
            // 状態
            this.isProcessing = false;
            this.isSpeaking = false;
            this.currentEmotion = 'neutral';
            
            // コールバック
            this.onResponseStart = null;
            this.onResponseEnd = null;
            this.onSpeakStart = null;
            this.onSpeakEnd = null;
            this.onEmotionDetected = null;
            
            // リップシンク
            this.lipSyncInterval = null;
            this.expressionAnimInterval = null;
            
            // モーション設定
            this.crossfadeDuration = 0.5;
        }
        
        // ========================================
        // 初期化
        // ========================================
        
        setVRM(vrm, mixer) {
            this.vrm = vrm;
            this.mixer = mixer;
            console.log(`✅ ${this.name}: VRM設定完了`);
        }
        
        setApiKey(apiKey) {
            this.apiKey = apiKey;
        }
        
        buildSystemPrompt(additionalContext = '') {
            return `あなたは「${this.name}」という名前のキャラクターです。

【性格】
${this.personality}

【ルール】
・1回の返答は2〜3文で簡潔に
・日本語で返答
・自分のキャラクターらしい口調で話す
・感情豊かに反応する

${additionalContext}`;
        }
        
        // ========================================
        // LLM API呼び出し
        // ========================================
        
        async sendToLLM(userMessage, systemPromptAddition = '') {
            if (!this.apiKey) {
                throw new Error('APIキーが設定されていません');
            }
            
            const systemPrompt = this.buildSystemPrompt(systemPromptAddition);
            
            this.conversationHistory.push({
                role: 'user',
                content: userMessage
            });
            
            // 履歴が長すぎる場合は古いものを削除
            if (this.conversationHistory.length > this.maxHistoryLength * 2) {
                this.conversationHistory = this.conversationHistory.slice(-this.maxHistoryLength * 2);
            }
            
            let response;
            
            try {
                switch (this.llmProvider) {
                    case 'chatgpt':
                        response = await this.callOpenAI(systemPrompt);
                        break;
                    case 'gemini':
                        response = await this.callGemini(systemPrompt);
                        break;
                    case 'claude':
                        response = await this.callClaude(systemPrompt);
                        break;
                    default:
                        response = await this.callOpenAI(systemPrompt);
                }
                
                this.conversationHistory.push({
                    role: 'assistant',
                    content: response
                });
                
                console.log(`💬 ${this.name}: "${response}"`);
                return response;
                
            } catch (error) {
                console.error(`❌ ${this.name} LLMエラー:`, error);
                throw error;
            }
        }
        
        async callOpenAI(systemPrompt) {
            const response = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + this.apiKey
                },
                body: JSON.stringify({
                    model: this.llmModel,
                    messages: [
                        { role: 'system', content: systemPrompt },
                        ...this.conversationHistory
                    ],
                    temperature: 0.8,
                    max_tokens: 500
                })
            });
            
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error?.message || response.statusText);
            }
            
            const data = await response.json();
            return data.choices[0].message.content;
        }
        
        async callGemini(systemPrompt) {
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${this.apiKey}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [
                        {
                            role: 'user',
                            parts: [{ text: systemPrompt + '\n\n' + this.conversationHistory.map(h => 
                                `${h.role === 'user' ? 'ユーザー' : this.name}: ${h.content}`
                            ).join('\n') }]
                        }
                    ],
                    generationConfig: {
                        temperature: 0.8,
                        maxOutputTokens: 500
                    }
                })
            });
            
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error?.message || response.statusText);
            }
            
            const data = await response.json();
            return data.candidates[0].content.parts[0].text;
        }
        
        async callClaude(systemPrompt) {
            // Claude APIは直接呼び出しできないため、プロキシ経由
            const response = await fetch('/api/claude', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    apiKey: this.apiKey,
                    system: systemPrompt,
                    messages: this.conversationHistory
                })
            });
            
            if (!response.ok) {
                throw new Error('Claude API呼び出し失敗');
            }
            
            const data = await response.json();
            return data.text;
        }
        
        // ========================================
        // 感情分析
        // ========================================
        
        async analyzeEmotion(text) {
            if (!this.apiKey) return 'normal';
            
            try {
                const response = await fetch('https://api.openai.com/v1/chat/completions', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': 'Bearer ' + this.apiKey
                    },
                    body: JSON.stringify({
                        model: 'gpt-4o-mini',
                        messages: [{
                            role: 'system',
                            content: `Analyze the emotional tone of this Japanese text and return ONE category:
- normal: 普通の会話
- happy_mild: 軽い喜び
- happy: 明るい気分
- happy_strong: とても嬉しい
- grateful: 感謝
- sad: 悲しい
- angry: 怒り
- surprised: 驚き
- thinking: 考え中
- shy: 恥ずかしい
Output ONLY the category name.`
                        }, {
                            role: 'user',
                            content: text
                        }],
                        temperature: 0.2,
                        max_tokens: 20
                    })
                });
                
                if (!response.ok) return 'normal';
                
                const data = await response.json();
                const emotion = data.choices[0].message.content.trim().toLowerCase();
                console.log(`🎭 ${this.name} 感情: ${emotion}`);
                
                this.currentEmotion = emotion;
                if (this.onEmotionDetected) {
                    this.onEmotionDetected(emotion);
                }
                
                return emotion;
                
            } catch (error) {
                console.error('感情分析エラー:', error);
                return 'normal';
            }
        }
        
        // ========================================
        // モーション再生
        // ========================================
        
        // 感情→モーションマッピング
        static EMOTION_MOTIONS = {
            normal: { motions: ['女性しゃべり01.vrma', '女性しゃべり02.vrma'], expression: 'neutral', weight: 0 },
            happy_mild: { motion: 'アンリアルキャラ喜ぶ.vrma', expression: 'happy', weight: 0.5 },
            happy: { motion: '女性しゃべり05ルンルン気分.vrma', expression: 'happy', weight: 0.7 },
            happy_strong: { motion: 'アンリアルキャラガッツポーズでめちゃくちゃよろこぶ.vrma', expression: 'happy', weight: 1.0 },
            grateful: { motion: 'アンリアルキャラ喜ぶ.vrma', expression: 'happy', weight: 0.5 },
            sad: { motion: '悲しくしゃべる.vrma', expression: 'sad', weight: 0.7 },
            angry: { motion: 'しゃべりいかりイライラ.vrma', expression: 'angry', weight: 0.8 },
            surprised: { motion: 'アンリアルキャラびっくり.vrma', expression: 'surprised', weight: 0.7 },
            thinking: { motion: '真剣にあれこれ考える.vrma', expression: 'neutral', weight: 0 },
            shy: { motion: '恥ずかしくて顔をおおう.vrma', expression: 'relaxed', weight: 0.5 }
        };
        
        async playEmotionMotion(emotion) {
            if (!this.vrm) return;
            
            const emotionData = CharacterAIChat.EMOTION_MOTIONS[emotion] || CharacterAIChat.EMOTION_MOTIONS.normal;
            
            let motionFile;
            if (emotionData.motions) {
                motionFile = emotionData.motions[Math.floor(Math.random() * emotionData.motions.length)];
            } else {
                motionFile = emotionData.motion;
            }
            
            try {
                const THREE = window.THREE;
                const loader = new window.GLTFLoaderClass();
                const { VRMAnimationLoaderPlugin, createVRMAnimationClip } = await import('@pixiv/three-vrm-animation');
                
                loader.register((parser) => new VRMAnimationLoaderPlugin(parser));
                const gltf = await loader.loadAsync('./motions/' + encodeURIComponent(motionFile));
                const vrmAnim = gltf.userData.vrmAnimation || gltf.userData.vrmAnimations?.[0];
                
                if (!vrmAnim) return;
                
                if (!this.mixer) {
                    this.mixer = new THREE.AnimationMixer(this.vrm.scene);
                }
                
                const clip = createVRMAnimationClip(vrmAnim, this.vrm);
                const newAction = this.mixer.clipAction(clip);
                
                // クロスフェード
                if (this.currentAction && this.currentAction.isRunning()) {
                    newAction.reset();
                    newAction.setLoop(THREE.LoopRepeat);
                    newAction.setEffectiveWeight(1);
                    newAction.play();
                    this.currentAction.crossFadeTo(newAction, this.crossfadeDuration, true);
                } else {
                    newAction.reset();
                    newAction.setLoop(THREE.LoopRepeat);
                    newAction.play();
                }
                
                this.currentAction = newAction;
                
                // 表情適用
                this.applyExpression(emotionData.expression, emotionData.weight);
                
                console.log(`🎬 ${this.name} モーション: ${motionFile}`);
                
            } catch (error) {
                console.error(`❌ ${this.name} モーションエラー:`, error);
            }
        }
        
        // ========================================
        // 表情制御
        // ========================================
        
        applyExpression(expressionName, weight = 1.0, duration = 300) {
            if (!this.vrm || !this.vrm.expressionManager) return;
            
            const em = this.vrm.expressionManager;
            const allExpressions = ['happy', 'angry', 'sad', 'surprised', 'relaxed'];
            
            if (this.expressionAnimInterval) {
                clearInterval(this.expressionAnimInterval);
            }
            
            const startTime = Date.now();
            const startWeights = {};
            allExpressions.forEach(expr => {
                try { startWeights[expr] = em.getValue(expr) || 0; } 
                catch (e) { startWeights[expr] = 0; }
            });
            
            this.expressionAnimInterval = setInterval(() => {
                const elapsed = Date.now() - startTime;
                const progress = Math.min(elapsed / duration, 1);
                const easeProgress = 1 - Math.pow(1 - progress, 3);
                
                try {
                    allExpressions.forEach(expr => {
                        if (expr === expressionName) {
                            em.setValue(expr, startWeights[expr] + (weight - startWeights[expr]) * easeProgress);
                        } else {
                            em.setValue(expr, startWeights[expr] * (1 - easeProgress));
                        }
                    });
                    
                    if (progress >= 1) {
                        clearInterval(this.expressionAnimInterval);
                        this.expressionAnimInterval = null;
                    }
                } catch (e) {
                    clearInterval(this.expressionAnimInterval);
                    this.expressionAnimInterval = null;
                }
            }, 16);
        }
        
        resetExpression(duration = 500) {
            if (!this.vrm || !this.vrm.expressionManager) return;
            
            const em = this.vrm.expressionManager;
            const allExpressions = ['happy', 'angry', 'sad', 'surprised', 'relaxed'];
            
            if (this.expressionAnimInterval) {
                clearInterval(this.expressionAnimInterval);
            }
            
            const startTime = Date.now();
            const startWeights = {};
            allExpressions.forEach(expr => {
                try { startWeights[expr] = em.getValue(expr) || 0; }
                catch (e) { startWeights[expr] = 0; }
            });
            
            this.expressionAnimInterval = setInterval(() => {
                const elapsed = Date.now() - startTime;
                const progress = Math.min(elapsed / duration, 1);
                
                try {
                    allExpressions.forEach(expr => {
                        em.setValue(expr, startWeights[expr] * (1 - progress));
                    });
                    
                    if (progress >= 1) {
                        clearInterval(this.expressionAnimInterval);
                        this.expressionAnimInterval = null;
                    }
                } catch (e) {
                    clearInterval(this.expressionAnimInterval);
                    this.expressionAnimInterval = null;
                }
            }, 16);
        }
        
        // ========================================
        // TTS（音声合成）
        // ========================================
        
        async speak(text) {
            if (!text) return;
            
            this.isSpeaking = true;
            if (this.onSpeakStart) this.onSpeakStart(this);
            
            try {
                this.startLipSync();
                
                if (this.ttsEngine === 'sbv2' && window.styleBertVits2) {
                    await this.speakWithSBV2(text);
                } else if (this.ttsEngine === 'google') {
                    await this.speakWithGoogleTTS(text);
                } else {
                    await this.speakWithBrowser(text);
                }
                
            } catch (error) {
                console.error(`❌ ${this.name} TTS エラー:`, error);
            } finally {
                this.stopLipSync();
                this.isSpeaking = false;
                if (this.onSpeakEnd) this.onSpeakEnd(this);
            }
        }
        
        async speakWithSBV2(text) {
            const sbv2 = window.styleBertVits2;
            if (!sbv2 || !sbv2.isAvailable) {
                return this.speakWithBrowser(text);
            }
            
            try {
                const result = await sbv2.synthesize(text, {
                    model: this.voiceModel,
                    speakerId: this.voiceSpeakerId
                });
                
                await sbv2.playAudio(result.audioData);
            } catch (error) {
                console.error('SBV2エラー:', error);
                await this.speakWithBrowser(text);
            }
        }
        
        async speakWithGoogleTTS(text) {
            // Google TTS実装（必要に応じて）
            return this.speakWithBrowser(text);
        }
        
        speakWithBrowser(text) {
            return new Promise((resolve) => {
                const utterance = new SpeechSynthesisUtterance(text);
                utterance.lang = 'ja-JP';
                utterance.rate = 1.0;
                utterance.pitch = 1.0;
                utterance.onend = () => resolve();
                utterance.onerror = () => resolve();
                speechSynthesis.speak(utterance);
            });
        }
        
        // ========================================
        // リップシンク
        // ========================================
        
        startLipSync() {
            if (!this.vrm || !this.vrm.expressionManager) return;
            
            const mouthPattern = [0.10, 0.30, 0.05, 0.15, 0.25, 0.50, 0.20, 1.00, 0.15, 0.25, 0.10, 0.75];
            let patternIndex = 0;
            
            this.lipSyncInterval = setInterval(() => {
                if (this.vrm && this.vrm.expressionManager) {
                    try {
                        this.vrm.expressionManager.setValue('aa', mouthPattern[patternIndex]);
                    } catch (e) {}
                    patternIndex = (patternIndex + 1) % mouthPattern.length;
                }
            }, 100);
        }
        
        stopLipSync() {
            if (this.lipSyncInterval) {
                clearInterval(this.lipSyncInterval);
                this.lipSyncInterval = null;
            }
            
            if (this.vrm && this.vrm.expressionManager) {
                try {
                    this.vrm.expressionManager.setValue('aa', 0);
                } catch (e) {}
            }
        }
        
        // ========================================
        // メイン処理：メッセージ処理
        // ========================================
        
        async processMessage(userMessage, contextAddition = '') {
            if (this.isProcessing) {
                console.warn(`${this.name} は処理中です`);
                return null;
            }
            
            this.isProcessing = true;
            if (this.onResponseStart) this.onResponseStart(this);
            
            try {
                // 1. LLMから応答取得
                const response = await this.sendToLLM(userMessage, contextAddition);
                
                // 2. 感情分析
                const emotion = await this.analyzeEmotion(response);
                
                // 3. モーション＋表情
                await this.playEmotionMotion(emotion);
                
                // 4. 音声再生
                await this.speak(response);
                
                if (this.onResponseEnd) this.onResponseEnd(this, response);
                
                return {
                    text: response,
                    emotion: emotion
                };
                
            } catch (error) {
                console.error(`❌ ${this.name} 処理エラー:`, error);
                return null;
            } finally {
                this.isProcessing = false;
            }
        }
        
        // ========================================
        // ユーティリティ
        // ========================================
        
        clearHistory() {
            this.conversationHistory = [];
        }
        
        setListening() {
            // 聞いている姿勢
            this.applyExpression('happy', 0.2);
        }
        
        setIdle() {
            this.resetExpression();
        }
        
        toJSON() {
            return {
                id: this.id,
                characterId: this.characterId,
                name: this.name,
                personality: this.personality,
                llmProvider: this.llmProvider,
                llmModel: this.llmModel,
                ttsEngine: this.ttsEngine,
                voiceModel: this.voiceModel,
                voiceSpeakerId: this.voiceSpeakerId
            };
        }
    }
    
    // ========================================
    // MultiCharacterChatManager - 複数キャラ管理
    // ========================================
    
    class MultiCharacterChatManager {
        constructor() {
            this.chats = new Map(); // characterId -> CharacterAIChat
            this.sharedApiKey = null;
            this.isRunning = false;
        }
        
        createChat(config) {
            const chat = new CharacterAIChat(config);
            if (this.sharedApiKey) {
                chat.setApiKey(this.sharedApiKey);
            }
            this.chats.set(config.characterId, chat);
            console.log(`✅ AIチャット作成: ${config.name} (${config.characterId})`);
            return chat;
        }
        
        getChat(characterId) {
            return this.chats.get(characterId);
        }
        
        removeChat(characterId) {
            this.chats.delete(characterId);
        }
        
        setSharedApiKey(apiKey) {
            this.sharedApiKey = apiKey;
            this.chats.forEach(chat => {
                chat.setApiKey(apiKey);
            });
        }
        
        getAllChats() {
            return Array.from(this.chats.values());
        }
    }
    
    // グローバル公開
    window.CharacterAIChat = CharacterAIChat;
    window.MultiCharacterChatManager = MultiCharacterChatManager;
    
    console.log('✅ Multi-Character AI Chat System v1.0 読み込み完了');
})();
