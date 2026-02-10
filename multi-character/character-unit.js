// ========================================
// CharacterUnit - 各キャラクターの独立したユニット
// ハイブリッド方式: キャラは自分のことだけやる
// ========================================

import { ChatGPTClient } from '../chatgpt-client.js';
import { GeminiClient } from '../gemini-client.js';
import { StyleBertVits2Client } from '../style-bert-vits2-client.js';

export class CharacterUnit {
    constructor(config) {
        // 基本情報
        this.id = config.id || `char_${Date.now()}`;
        this.name = config.name || 'キャラクター';
        this.personality = config.personality || 'フレンドリーなキャラクター';
        
        // ★ 会話コンテキスト（お題・演出指示・シーン設定等）
        this.conversationContext = config.conversationContext || '';
        
        // VRM関連
        this.vrm = null;
        this.vrmPath = config.vrmPath || null;
        this.position = config.position || { x: 0, y: 0, z: 0 };
        
        // LLM設定
        this.llmType = config.llmType || 'chatgpt'; // chatgpt, gemini, claude, grok
        this.llmApiKey = config.llmApiKey || null;
        this.llmClient = null;
        
        // 音声設定
        this.voiceType = config.voiceType || 'sbv2'; // sbv2, browser, gemini
        this.voiceModel = config.voiceModel || 'jvnv-F1-jp';
        this.voiceClient = null;
        
        // ★ v4.3: Grok Voice対応
        this.voiceEngine = config.voiceEngine || 'sbv2';  // 'sbv2' | 'grok'
        this.grokVoice = config.grokVoice || 'Ara';       // Ara, Rex, Sal, Eve, Leo
        
        // 状態
        this.isSpeaking = false;
        this.isListening = false;
        this.currentEmotion = 'neutral';
        
        // コールバック
        this.onSpeakStart = null;
        this.onSpeakEnd = null;
        this.onEmotionChange = null;
        
        // リップシンク用
        this.lipSyncInterval = null;
        
        console.log(`🎭 CharacterUnit作成: ${this.name} (${this.id})`);
    }
    
    /**
     * LLMクライアントを初期化
     */
    async initLLM() {
        if (!this.llmApiKey) {
            console.warn(`⚠️ ${this.name}: APIキーが設定されていません`);
            return false;
        }
        
        try {
            switch (this.llmType) {
                case 'chatgpt':
                    this.llmClient = new ChatGPTClient(this.llmApiKey);
                    this.llmClient.setSystemPrompt(this.buildSystemPrompt());
                    break;
                    
                case 'gemini':
                    this.llmClient = new GeminiClient(this.llmApiKey);
                    this.llmClient.setSystemPrompt(this.buildSystemPrompt());
                    break;
                    
                case 'claude':
                    // Claude APIクライアント（別途実装が必要）
                    console.warn('Claude APIは未実装です');
                    return false;
                    
                case 'grok':
                    // Grok APIクライアント（別途実装が必要）
                    console.warn('Grok APIは未実装です');
                    return false;
                    
                default:
                    console.warn(`⚠️ 不明なLLMタイプ: ${this.llmType}`);
                    return false;
            }
            
            console.log(`✅ ${this.name}: ${this.llmType} LLM初期化完了`);
            return true;
            
        } catch (error) {
            console.error(`❌ ${this.name}: LLM初期化エラー`, error);
            return false;
        }
    }
    
    /**
     * 音声クライアントを初期化
     */
    async initVoice(sbv2BaseUrl = 'http://localhost:8000') {
        try {
            if (this.voiceType === 'sbv2') {
                this.voiceClient = new StyleBertVits2Client(sbv2BaseUrl);
                this.voiceClient.setModel(this.voiceModel);
                const available = await this.voiceClient.init();
                
                if (available) {
                    console.log(`✅ ${this.name}: SBV2音声初期化完了 (${this.voiceModel})`);
                    return true;
                } else {
                    console.warn(`⚠️ ${this.name}: SBV2サーバーに接続できません`);
                    return false;
                }
            }
            
            // ブラウザTTSやGemini TTSの場合はここで初期化
            console.log(`✅ ${this.name}: ${this.voiceType}音声初期化完了`);
            return true;
            
        } catch (error) {
            console.error(`❌ ${this.name}: 音声初期化エラー`, error);
            return false;
        }
    }
    
    /**
     * システムプロンプトを構築
     */
    buildSystemPrompt() {
        let prompt = `あなたは「${this.name}」という名前のキャラクターです。

【あなたの性格】
${this.personality}
`;
        
        // ★ 会話コンテキストがあれば追加
        if (this.conversationContext) {
            prompt += `
${this.conversationContext}
`;
        }
        
        prompt += `
【基本ルール】
・1回の返答は2〜3文で簡潔に
・日本語で返答
・会話が自然に続くように
・自分のキャラクターらしく反応する
・目標があればそれを意識して会話を進める`;
        
        return prompt;
    }
    
    /**
     * ★ 会話コンテキストを設定
     */
    setConversationContext(context) {
        this.conversationContext = context;
        // LLMのシステムプロンプトも更新
        if (this.llmClient && this.llmClient.setSystemPrompt) {
            this.llmClient.setSystemPrompt(this.buildSystemPrompt());
        }
        console.log(`🎬 ${this.name}: 会話コンテキスト設定完了`);
    }
    
    /**
     * VRMモデルを設定
     */
    setVRM(vrm) {
        this.vrm = vrm;
        console.log(`🎨 ${this.name}: VRM設定完了`);
    }
    
    /**
     * 位置を設定
     */
    setPosition(x, y, z) {
        this.position = { x, y, z };
        if (this.vrm && this.vrm.scene) {
            this.vrm.scene.position.set(x, y, z);
        }
    }
    
    /**
     * 名前を更新
     */
    setName(name) {
        this.name = name;
        // LLMのシステムプロンプトも更新
        if (this.llmClient && this.llmClient.setSystemPrompt) {
            this.llmClient.setSystemPrompt(this.buildSystemPrompt());
        }
    }
    
    /**
     * 性格を更新
     */
    setPersonality(personality) {
        this.personality = personality;
        // LLMのシステムプロンプトも更新
        if (this.llmClient && this.llmClient.setSystemPrompt) {
            this.llmClient.setSystemPrompt(this.buildSystemPrompt());
        }
    }
    
    /**
     * LLMから応答を生成
     */
    async generateResponse(prompt) {
        if (!this.llmClient) {
            console.warn(`⚠️ ${this.name}: LLMクライアントが初期化されていません`);
            return null;
        }
        
        try {
            console.log(`💭 ${this.name} 思考中...`);
            
            let result;
            if (this.llmType === 'chatgpt') {
                result = await this.llmClient.sendMessage(prompt);
            } else if (this.llmType === 'gemini') {
                result = await this.llmClient.generateText(prompt);
            }
            
            console.log(`💬 ${this.name}: "${result.text}"`);
            return result;
            
        } catch (error) {
            console.error(`❌ ${this.name}: 応答生成エラー`, error);
            return null;
        }
    }
    
    /**
     * テキストを音声合成して再生
     */
    async speak(text, emotion = null) {
        if (!text) return;
        
        this.isSpeaking = true;
        
        if (this.onSpeakStart) {
            this.onSpeakStart(this);
        }
        
        try {
            // リップシンク開始
            this.startLipSync();
            
            if (this.voiceType === 'sbv2' && this.voiceClient && this.voiceClient.isAvailable) {
                // SBV2で音声合成
                const audioResult = await this.voiceClient.synthesize(text, emotion);
                await this.voiceClient.playAudio(
                    audioResult.audioData,
                    (duration) => {
                        console.log(`🔊 ${this.name}: 音声再生開始 (${duration.toFixed(2)}秒)`);
                    },
                    () => {
                        console.log(`🔇 ${this.name}: 音声再生終了`);
                    }
                );
            } else if (this.voiceType === 'gemini' && this.llmClient instanceof GeminiClient) {
                // Gemini TTSで音声合成
                const audioResult = await this.llmClient.generateAudio(text);
                if (audioResult.audioData) {
                    await this.llmClient.playAudio(audioResult.audioData, null, null);
                }
            } else {
                // ブラウザTTS
                await this.speakWithBrowser(text);
            }
            
        } catch (error) {
            console.error(`❌ ${this.name}: 音声再生エラー`, error);
        } finally {
            // リップシンク停止
            this.stopLipSync();
            
            this.isSpeaking = false;
            
            if (this.onSpeakEnd) {
                this.onSpeakEnd(this);
            }
        }
    }
    
    /**
     * ブラウザTTSで読み上げ
     */
    speakWithBrowser(text) {
        return new Promise((resolve) => {
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.lang = 'ja-JP';
            utterance.rate = 1.0;
            utterance.pitch = 1.0;
            
            utterance.onend = () => {
                resolve();
            };
            
            utterance.onerror = () => {
                resolve();
            };
            
            speechSynthesis.speak(utterance);
        });
    }
    
    /**
     * リップシンク開始
     */
    startLipSync() {
        if (!this.vrm || !this.vrm.expressionManager) return;
        
        const mouthPattern = [0.10, 0.30, 0.05, 0.15, 0.25, 0.50, 0.20, 1.00, 0.15, 0.25, 0.10, 0.75];
        let patternIndex = 0;
        
        this.lipSyncInterval = setInterval(() => {
            if (this.vrm && this.vrm.expressionManager) {
                const value = mouthPattern[patternIndex];
                this.vrm.expressionManager.setValue('aa', value);
                patternIndex = (patternIndex + 1) % mouthPattern.length;
            }
        }, 100);
    }
    
    /**
     * リップシンク停止
     */
    stopLipSync() {
        if (this.lipSyncInterval) {
            clearInterval(this.lipSyncInterval);
            this.lipSyncInterval = null;
        }
        
        if (this.vrm && this.vrm.expressionManager) {
            this.vrm.expressionManager.setValue('aa', 0);
        }
    }
    
    /**
     * 聞いている姿勢にする
     */
    setListening() {
        this.isListening = true;
        this.isSpeaking = false;
        
        // 表情を軽く変える（興味を示す）
        if (this.vrm && this.vrm.expressionManager) {
            // 軽く微笑む
            this.vrm.expressionManager.setValue('happy', 0.2);
        }
        
        console.log(`👂 ${this.name}: 聞いています`);
    }
    
    /**
     * 待機姿勢にする
     */
    setIdle() {
        this.isListening = false;
        this.isSpeaking = false;
        
        // 表情をニュートラルに
        if (this.vrm && this.vrm.expressionManager) {
            this.vrm.expressionManager.setValue('happy', 0);
        }
    }
    
    /**
     * 表情を設定
     */
    setExpression(expressionName, value = 1.0) {
        if (!this.vrm || !this.vrm.expressionManager) return;
        
        // 全表情をリセット
        const expressions = ['happy', 'angry', 'sad', 'surprised', 'neutral'];
        expressions.forEach(exp => {
            if (exp !== expressionName) {
                this.vrm.expressionManager.setValue(exp, 0);
            }
        });
        
        // 指定表情を設定
        this.vrm.expressionManager.setValue(expressionName, value);
        this.currentEmotion = expressionName;
        
        if (this.onEmotionChange) {
            this.onEmotionChange(this, expressionName);
        }
    }
    
    /**
     * 会話履歴をクリア
     */
    clearHistory() {
        if (this.llmClient && this.llmClient.clearHistory) {
            this.llmClient.clearHistory();
        }
        console.log(`🗑️ ${this.name}: 会話履歴クリア`);
    }
    
    /**
     * 設定をJSON形式でエクスポート
     */
    toJSON() {
        return {
            id: this.id,
            name: this.name,
            personality: this.personality,
            vrmPath: this.vrmPath,
            position: this.position,
            llmType: this.llmType,
            voiceType: this.voiceType,
            voiceModel: this.voiceModel
        };
    }
    
    /**
     * JSONから設定を読み込み
     */
    static fromJSON(json, apiKey = null) {
        return new CharacterUnit({
            ...json,
            llmApiKey: apiKey
        });
    }
}
