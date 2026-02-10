// ========================================
// Style-Bert-VITS2 TTS クライアント v2.1
// ChatGPTの感情分析結果（style + weight 1-20）対応
// ========================================

export class StyleBertVits2Client {
    constructor(baseUrl = 'http://localhost:8000') {
        this.baseUrl = baseUrl;
        this.modelsInfo = null;
        this.isAvailable = false;
        
        // デフォルト設定
        this.settings = {
            model: 'jvnv-F1-jp',        // デフォルトモデル（女性）
            speaker: 'jvnv-F1-jp',
            style: 'Neutral',
            styleWeight: 5,              // 1-20 スケール
            speed: 1.0,
            noise: 0.6,
            noisew: 0.8,
            sdpRatio: 0.2,
            language: 'JP',
            silenceAfter: 0.3,
            pitchScale: 1.0,
            intonationScale: 1.0
        };
        
        // 感情マッピング（様々な表現 → Style-Bert-VITS2スタイル）
        this.emotionToStyle = {
            // Happy系
            'joy': 'Happy', 'happy': 'Happy', 'happiness': 'Happy',
            'excited': 'Happy', 'cheerful': 'Happy', 'delighted': 'Happy',
            'pleased': 'Happy', 'glad': 'Happy', 'joyful': 'Happy',
            
            // Angry系
            'anger': 'Angry', 'angry': 'Angry', 'irritated': 'Angry',
            'frustrated': 'Angry', 'annoyed': 'Angry', 'furious': 'Angry',
            
            // Sad系
            'sadness': 'Sad', 'sad': 'Sad', 'melancholy': 'Sad',
            'disappointed': 'Sad', 'depressed': 'Sad', 'sorrowful': 'Sad',
            
            // Surprise系
            'surprise': 'Surprise', 'surprised': 'Surprise', 
            'shocked': 'Surprise', 'amazed': 'Surprise', 'astonished': 'Surprise',
            
            // Fear系
            'fear': 'Fear', 'scared': 'Fear', 'anxious': 'Fear',
            'nervous': 'Fear', 'worried': 'Fear', 'terrified': 'Fear',
            
            // Disgust系
            'disgust': 'Disgust', 'disgusted': 'Disgust',
            
            // Neutral系
            'neutral': 'Neutral', 'calm': 'Neutral', 'normal': 'Neutral',
            'default': 'Neutral', 'composed': 'Neutral'
        };
        
        // 利用可能なスタイル一覧
        this.validStyles = ['Neutral', 'Happy', 'Angry', 'Sad', 'Surprise', 'Fear', 'Disgust'];
    }
    
    /**
     * サーバー接続確認と初期化
     */
    async init() {
        try {
            // AbortControllerでタイムアウト処理（互換性対応）
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000);
            
            const response = await fetch(`${this.baseUrl}/api/version`, {
                method: 'GET',
                signal: controller.signal
            });
            
            clearTimeout(timeoutId);
            
            if (response.ok) {
                const version = await response.json();
                console.log('✅ Style-Bert-VITS2 接続OK:', version);
                
                // モデル情報を取得
                await this.getModelsInfo();
                this.isAvailable = true;
                return true;
            }
        } catch (error) {
            console.warn('⚠️ Style-Bert-VITS2 サーバーに接続できません:', error.message);
            this.isAvailable = false;
        }
        return false;
    }
    
    /**
     * 利用可能なモデル情報を取得
     */
    async getModelsInfo() {
        try {
            const response = await fetch(`${this.baseUrl}/api/models_info`);
            if (response.ok) {
                this.modelsInfo = await response.json();
                console.log('📋 利用可能なモデル:', this.modelsInfo.map(m => `${m.name} (${m.styles.join(', ')})`));
                return this.modelsInfo;
            }
        } catch (error) {
            console.error('❌ モデル情報取得失敗:', error);
        }
        return null;
    }
    
    /**
     * モデルが持っているスタイル一覧を取得
     */
    getAvailableStyles(modelName = null) {
        const targetModel = modelName || this.settings.model;
        if (!this.modelsInfo) return this.validStyles;
        
        const model = this.modelsInfo.find(m => m.name === targetModel);
        return model ? model.styles : this.validStyles;
    }
    
    /**
     * モデルを設定
     */
    setModel(modelName) {
        this.settings.model = modelName;
        this.settings.speaker = modelName;
        console.log('🎤 SBV2モデル変更:', modelName);
    }
    
    /**
     * 設定を更新
     */
    updateSettings(newSettings) {
        Object.assign(this.settings, newSettings);
        console.log('⚙️ SBV2設定更新:', this.settings);
    }
    
    /**
     * 感情名からスタイルを取得
     */
    getStyleFromEmotion(emotion) {
        if (!emotion) return 'Neutral';
        
        const normalizedEmotion = emotion.toLowerCase().trim();
        
        // 直接マッピング
        if (this.emotionToStyle[normalizedEmotion]) {
            return this.emotionToStyle[normalizedEmotion];
        }
        
        // 有効なスタイル名そのものかチェック
        const capitalizedEmotion = emotion.charAt(0).toUpperCase() + emotion.slice(1).toLowerCase();
        if (this.validStyles.includes(capitalizedEmotion)) {
            return capitalizedEmotion;
        }
        
        return 'Neutral';
    }
    
    /**
     * styleWeight を 1-20 から実際のパラメータに変換
     */
    convertStyleWeight(weight) {
        // weight: 1-20 → styleWeight: 0.5-3.0
        const clampedWeight = Math.max(1, Math.min(20, weight || 10));
        return 0.5 + (clampedWeight - 1) * (2.5 / 19);
    }
    
    /**
     * 感情に応じた追加パラメータを取得
     */
    getEmotionParams(style, weight) {
        const intensity = weight / 20; // 0.05 - 1.0
        
        const params = {
            'Happy': {
                intonationScale: 1.0 + intensity * 0.3,
                speed: 1.0 + intensity * 0.1
            },
            'Angry': {
                intonationScale: 1.0 + intensity * 0.4,
                speed: 1.0 + intensity * 0.15,
                noise: 0.6 + intensity * 0.1
            },
            'Sad': {
                speed: 1.0 - intensity * 0.15,
                pitchScale: 1.0 - intensity * 0.05,
                intonationScale: 1.0 - intensity * 0.1
            },
            'Surprise': {
                intonationScale: 1.0 + intensity * 0.5,
                speed: 1.0 + intensity * 0.2
            },
            'Fear': {
                speed: 1.0 + intensity * 0.1,
                noise: 0.6 + intensity * 0.15
            },
            'Disgust': {
                speed: 1.0 - intensity * 0.1,
                noise: 0.6 + intensity * 0.1
            },
            'Neutral': {}
        };
        
        return params[style] || {};
    }
    
    /**
     * テキストから感情を簡易分析（フォールバック用）
     */
    analyzeTextEmotion(text) {
        const emotionKeywords = {
            'Happy': ['嬉しい', 'やった', 'わーい', '楽しい', 'ありがとう', '最高', 'すごい', '！！', 'うれしい', 'わくわく', 'いいね'],
            'Angry': ['怒', 'むかつく', 'イライラ', 'ふざけ', 'ひどい', 'なんで', '許せない', 'うざい', 'ムカ'],
            'Sad': ['悲しい', '辛い', '寂しい', '残念', 'がっかり', 'しょんぼり', '...', 'つらい'],
            'Surprise': ['えっ', 'まじ', 'うそ', '本当', 'びっくり', 'すごい', '！？', 'えええ', 'はぁ', 'ええ'],
            'Fear': ['怖い', '不安', '心配', 'やばい', 'どうしよう', 'こわい'],
            'Disgust': ['気持ち悪い', 'いや', '嫌い', 'きもい', 'げ']
        };
        
        let maxScore = 0;
        let detectedEmotion = 'Neutral';
        
        for (const [emotion, keywords] of Object.entries(emotionKeywords)) {
            let score = 0;
            for (const keyword of keywords) {
                if (text.includes(keyword)) {
                    score++;
                }
            }
            if (score > maxScore) {
                maxScore = score;
                detectedEmotion = emotion;
            }
        }
        
        // 強度も推定（キーワード数と感嘆符の数から）
        const exclamationCount = (text.match(/[！!]/g) || []).length;
        const questionCount = (text.match(/[？?]/g) || []).length;
        const baseWeight = Math.min(maxScore * 4 + exclamationCount * 2 + questionCount, 15);
        const weight = Math.max(5, baseWeight);
        
        return { style: detectedEmotion, weight };
    }
    
    /**
     * 音声合成を実行
     * @param {string} text - 読み上げるテキスト
     * @param {Object} emotion - 感情情報 { style: string, weight: number(1-20) }
     * @returns {Promise<Object>} - { audioData, style, weight, elapsed }
     */
    async synthesize(text, emotion = null) {
        let style = 'Neutral';
        let weight = 10;
        
        if (emotion) {
            // ChatGPTからの感情情報を使用
            if (typeof emotion === 'object') {
                style = this.getStyleFromEmotion(emotion.style || emotion.emotion);
                weight = emotion.weight || emotion.intensity || 10;
            } else if (typeof emotion === 'string') {
                style = this.getStyleFromEmotion(emotion);
                weight = 10;
            }
        } else {
            // テキストから感情を推定
            const analyzed = this.analyzeTextEmotion(text);
            style = analyzed.style;
            weight = analyzed.weight;
        }
        
        // モデルがスタイルをサポートしているか確認
        const availableStyles = this.getAvailableStyles();
        if (!availableStyles.includes(style)) {
            console.warn(`⚠️ モデル ${this.settings.model} は ${style} スタイルをサポートしていません。Neutralを使用します。`);
            // 利用可能なスタイルの最初のものを使用
            style = availableStyles[0] || 'Neutral';
        }
        
        // パラメータ計算
        const styleWeight = this.convertStyleWeight(weight);
        const emotionParams = this.getEmotionParams(style, weight);
        
        const requestBody = {
            model: this.settings.model,
            text: text,
            style: style,
            styleWeight: styleWeight,
            speed: emotionParams.speed || this.settings.speed,
            noise: emotionParams.noise || this.settings.noise,
            noisew: this.settings.noisew,
            sdpRatio: this.settings.sdpRatio,
            language: this.settings.language,
            silenceAfter: this.settings.silenceAfter,
            pitchScale: emotionParams.pitchScale || this.settings.pitchScale,
            intonationScale: emotionParams.intonationScale || this.settings.intonationScale,
            speaker: this.settings.speaker
        };
        
        console.log(`🎤 SBV2音声合成: "${text.substring(0, 30)}..." [${style} Lv.${weight}]`);
        const startTime = Date.now();
        
        try {
            const response = await fetch(`${this.baseUrl}/api/synthesis`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(requestBody)
            });
            
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.detail || 'Synthesis failed');
            }
            
            const audioData = await response.arrayBuffer();
            const elapsed = Date.now() - startTime;
            
            console.log(`✅ SBV2音声生成完了 (${elapsed}ms): ${audioData.byteLength} bytes, ${style} Lv.${weight}`);
            
            return {
                audioData,
                style,
                weight,
                elapsed
            };
            
        } catch (error) {
            console.error('❌ Style-Bert-VITS2 音声合成エラー:', error);
            throw error;
        }
    }
    
    /**
     * WAV音声データを再生
     */
    async playAudio(audioData, onStart, onEnd) {
        return new Promise((resolve, reject) => {
            try {
                const blob = new Blob([audioData], { type: 'audio/wav' });
                const url = URL.createObjectURL(blob);
                const audio = new Audio(url);
                
                audio.onloadedmetadata = () => {
                    if (onStart) onStart(audio.duration);
                };
                
                audio.onended = () => {
                    URL.revokeObjectURL(url);
                    if (onEnd) onEnd();
                    resolve();
                };
                
                audio.onerror = (error) => {
                    URL.revokeObjectURL(url);
                    reject(error);
                };
                
                audio.play();
                console.log('🔊 SBV2音声再生開始');
                
            } catch (error) {
                console.error('❌ 音声再生エラー:', error);
                reject(error);
            }
        });
    }
}


// ========================================
// ChatGPT + Style-Bert-VITS2 統合クライアント
// 感情分析付きテキスト生成 → 感情付き音声合成
// ========================================

export class ChatGPTWithSBV2Client {
    constructor(openaiApiKey, sbv2BaseUrl = 'http://localhost:8000') {
        this.openaiApiKey = openaiApiKey;
        this.sbv2Client = new StyleBertVits2Client(sbv2BaseUrl);
        
        this.conversationHistory = [];
        this.maxHistoryLength = 10;
        
        // システムプロンプト（感情分析付き応答を要求）
        this.systemPrompt = `あなたは感情豊かなVRMキャラクターです。

【性格】
テンションの起伏が激しく、興味があるとハイテンション、つまらないとローテンション。

【重要：応答形式】
必ず以下のJSON形式で応答してください：

{
  "text": "あなたの応答テキスト",
  "emotion": {
    "style": "感情タイプ",
    "weight": 感情の強さ(1-20の数値)
  }
}

【感情タイプ（style）】
- Neutral: 普通、冷静
- Happy: 嬉しい、楽しい、興奮
- Angry: 怒り、イライラ
- Sad: 悲しい、寂しい
- Surprise: 驚き、びっくり
- Fear: 恐怖、不安
- Disgust: 嫌悪

【感情の強さ（weight）】
- 1-5: 微かな感情
- 6-10: 普通の感情表現
- 11-15: 強い感情
- 16-20: 非常に強い感情

【返答例】
{"text": "えええ！？マジで！？めっちゃいいじゃん！！", "emotion": {"style": "Surprise", "weight": 18}}
{"text": "あー...なんか...うん...", "emotion": {"style": "Neutral", "weight": 3}}
{"text": "わーい！やったー！最高！", "emotion": {"style": "Happy", "weight": 17}}
{"text": "それはちょっと...嫌かな...", "emotion": {"style": "Sad", "weight": 8}}

【ルール】
・1回の返答は2〜3文で完結させる
・日本語で返答
・必ずJSON形式で返す`;

        this.model = 'gpt-4o-mini';
    }
    
    /**
     * 初期化
     */
    async init() {
        const sbv2Available = await this.sbv2Client.init();
        console.log(`🎭 ChatGPT+SBV2 初期化: SBV2=${sbv2Available ? '✅' : '❌'}`);
        return sbv2Available;
    }
    
    /**
     * システムプロンプトを設定
     */
    setSystemPrompt(characterPrompt) {
        // キャラクター設定を追加しつつ、JSON形式の指示は維持
        this.systemPrompt = `${characterPrompt}

【重要：応答形式】
必ず以下のJSON形式で応答してください：

{
  "text": "あなたの応答テキスト",
  "emotion": {
    "style": "感情タイプ",
    "weight": 感情の強さ(1-20の数値)
  }
}

【感情タイプ（style）】
- Neutral: 普通、冷静
- Happy: 嬉しい、楽しい、興奮
- Angry: 怒り、イライラ
- Sad: 悲しい、寂しい
- Surprise: 驚き、びっくり
- Fear: 恐怖、不安
- Disgust: 嫌悪

【感情の強さ（weight）】1-5:微か、6-10:普通、11-15:強い、16-20:非常に強い

必ずJSON形式で返してください。`;
    }
    
    /**
     * SBV2のモデルを設定
     */
    setSBV2Model(modelName) {
        this.sbv2Client.setModel(modelName);
    }
    
    /**
     * 会話履歴をクリア
     */
    clearHistory() {
        this.conversationHistory = [];
        console.log('🗑️ 会話履歴をクリア');
    }
    
    /**
     * ChatGPTからJSON形式の応答を取得
     */
    async generateTextWithEmotion(userMessage) {
        this.conversationHistory.push({
            role: 'user',
            content: userMessage
        });
        
        if (this.conversationHistory.length > this.maxHistoryLength * 2) {
            this.conversationHistory = this.conversationHistory.slice(-this.maxHistoryLength * 2);
        }
        
        console.log('🧠 ChatGPT で感情分析付きテキスト生成中...');
        const startTime = Date.now();
        
        try {
            const response = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + this.openaiApiKey
                },
                body: JSON.stringify({
                    model: this.model,
                    messages: [
                        { role: 'system', content: this.systemPrompt },
                        ...this.conversationHistory
                    ],
                    temperature: 0.8,
                    max_tokens: 300,
                    response_format: { type: "json_object" }
                })
            });
            
            if (!response.ok) {
                const error = await response.json();
                throw new Error('API Error: ' + (error.error?.message || response.statusText));
            }
            
            const data = await response.json();
            const content = data.choices[0].message.content;
            const elapsed = Date.now() - startTime;
            
            // JSONパース
            let parsed;
            try {
                parsed = JSON.parse(content);
            } catch (e) {
                console.warn('⚠️ JSONパース失敗、テキストとして処理:', content);
                parsed = {
                    text: content,
                    emotion: { style: 'Neutral', weight: 10 }
                };
            }
            
            // 会話履歴に追加（テキスト部分のみ）
            this.conversationHistory.push({
                role: 'assistant',
                content: parsed.text
            });
            
            console.log(`✅ テキスト生成完了 (${elapsed}ms):`, parsed.text);
            console.log(`   感情: ${parsed.emotion?.style || 'Neutral'} Lv.${parsed.emotion?.weight || 10}`);
            
            return {
                text: parsed.text,
                emotion: parsed.emotion || { style: 'Neutral', weight: 10 },
                elapsed
            };
            
        } catch (error) {
            console.error('❌ ChatGPT APIエラー:', error);
            throw error;
        }
    }
    
    /**
     * テキスト生成 → 音声合成 → 再生 の一連の流れ
     */
    async chat(userMessage, callbacks = {}) {
        const { onTextGenerated, onAudioStart, onAudioEnd, onEmotionDetected } = callbacks;
        
        const totalStart = Date.now();
        
        try {
            // Step 1: ChatGPTでテキスト+感情生成
            const textResult = await this.generateTextWithEmotion(userMessage);
            
            if (onTextGenerated) {
                onTextGenerated(textResult.text);
            }
            
            if (onEmotionDetected) {
                onEmotionDetected(textResult.emotion);
            }
            
            // Step 2: Style-Bert-VITS2で音声合成
            if (!this.sbv2Client.isAvailable) {
                console.warn('⚠️ SBV2が利用できません、テキストのみ返します');
                return {
                    text: textResult.text,
                    emotion: textResult.emotion,
                    audioData: null,
                    elapsed: Date.now() - totalStart
                };
            }
            
            const audioResult = await this.sbv2Client.synthesize(
                textResult.text,
                textResult.emotion
            );
            
            // Step 3: 音声再生
            await this.sbv2Client.playAudio(
                audioResult.audioData,
                onAudioStart,
                onAudioEnd
            );
            
            const totalElapsed = Date.now() - totalStart;
            console.log(`🚀 合計時間: ${totalElapsed}ms`);
            
            return {
                text: textResult.text,
                emotion: textResult.emotion,
                audioData: audioResult.audioData,
                style: audioResult.style,
                weight: audioResult.weight,
                elapsed: totalElapsed
            };
            
        } catch (error) {
            console.error('❌ Chat処理エラー:', error);
            throw error;
        }
    }
    
    /**
     * テキストのみ生成（音声なし）
     */
    async generateText(userMessage) {
        return await this.generateTextWithEmotion(userMessage);
    }
    
    /**
     * 既存テキストを音声合成
     */
    async synthesizeText(text, emotion = null) {
        return await this.sbv2Client.synthesize(text, emotion);
    }
}
