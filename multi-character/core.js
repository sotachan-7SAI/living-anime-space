/**
 * Multi-Character System Core v2.5
 * 
 * CharacterAIChatを内蔵したCharacterUnitと
 * 会話を制御するDialogueDirector
 * 
 * v2.5: speak()でvoiceEngineによる分岐追加（Grok VoiceはTTS非対応のためSBV2/ブラウザにフォールバック）
 * v2.4: callGrok()でモデル名自動設定
 * v2.3: Grok LLM対応（callGrokメソッド追加）
 * v2.2: Grok Voice対応（voiceEngine, grokVoiceプロパティ追加）
 */

(function() {
    'use strict';
    
    console.log('🎭 Multi-Character Core v2.5 読み込み開始');
    
    // ========================================
    // CharacterUnit - 各キャラクターの独立ユニット
    // ========================================
    
    class CharacterUnit {
        constructor(config) {
            this.id = config.id || `char_${Date.now()}`;
            this.name = config.name || 'キャラクター';
            this.personality = config.personality || 'フレンドリーなキャラクター';
            this.enabled = config.enabled !== false;
            
            // VRM
            this.vrm = null;
            this.vrmPath = config.vrmPath || null;
            this.position = config.position || { x: 0, y: 0, z: 0 };
            this.mixer = null;
            this.currentAction = null;
            
            // LLM設定
            this.llmProvider = config.llmProvider || 'chatgpt';
            this.llmModel = config.llmModel || 'gpt-4o-mini';
            this.apiKey = config.apiKey || null;
            this.conversationHistory = [];
            this.maxHistoryLength = 10;
            
            // ★ 会話コンテキスト（お題・演出指示・シーン設定等）
            this.conversationContext = config.conversationContext || '';
            
            // TTS設定
            this.ttsEngine = config.ttsEngine || 'sbv2';
            this.voiceModel = config.voiceModel || 'jvnv-F1-jp';
            this.voiceSpeakerId = config.voiceSpeakerId || 0;
            
            // ★ v2.2: Grok Voice対応
            this.voiceEngine = config.voiceEngine || 'sbv2';  // 'sbv2' | 'grok'
            this.grokVoice = config.grokVoice || 'Ara';       // Ara, Rex, Sal, Eve, Leo
            
            // 状態
            this.isProcessing = false;
            this.isSpeaking = false;
            this.currentEmotion = 'neutral';
            
            // コールバック
            this.onSpeakStart = null;
            this.onSpeakEnd = null;
            this.onResponseStart = null;
            this.onResponseEnd = null;
            
            // リップシンク
            this.lipSyncInterval = null;
            this.expressionAnimInterval = null;
            
            // 設定
            this.crossfadeDuration = 0.5;
        }
        
        // ========================================
        // VRM設定
        // ========================================
        
        setVRM(vrm) {
            this.vrm = vrm;
            if (vrm && vrm.scene) {
                this.mixer = new window.THREE.AnimationMixer(vrm.scene);
                
                // ★ アニメーションループにmixerを登録
                if (!window.multiConversationState) {
                    window.multiConversationState = { animationMixers: [] };
                }
                if (!window.multiConversationState.animationMixers) {
                    window.multiConversationState.animationMixers = [];
                }
                // 重複登録を防ぐ
                if (!window.multiConversationState.animationMixers.includes(this.mixer)) {
                    window.multiConversationState.animationMixers.push(this.mixer);
                    console.log(`📌 ${this.name}: mixer をアニメーションループに登録`);
                }
            }
            console.log(`✅ ${this.name}: VRM設定完了`);
        }
        
        setPosition(x, y, z) {
            this.position = { x, y, z };
            if (this.vrm && this.vrm.scene) {
                this.vrm.scene.position.set(x, y, z);
            }
        }
        
        setApiKey(apiKey) {
            this.apiKey = apiKey;
        }
        
        // ========================================
        // システムプロンプト
        // ========================================
        
        buildSystemPrompt(additionalContext = '') {
            // ★ 会話コンテキスト（お題・演出指示等）を含める
            let prompt = `あなたは「${this.name}」という名前のキャラクターです。

【あなたの性格】
${this.personality}
`;
            
            // 会話コンテキストがあれば追加
            if (this.conversationContext) {
                prompt += `
${this.conversationContext}
`;
            }
            
            prompt += `
【基本ルール】
・1回の返答は2〜3文で簡潔に
・日本語で返答
・自分のキャラクターらしい口調で話す
・目標があればそれを意識して会話を進める

【重要：感情表現について】
リアルな人間のように、様々な感情を表現してください：
・嫌なことを言われたら怒ったりイライラしたりする
・悲しい話題やがっかりすることには悲しみを表現する
・驚くようなことには素直に驚く
・考え込む場面では「うーん」「そうだなぁ」など考える姿勢を見せる
・照れくさい場面では恥ずかしがる
・不満や反対意見があれば遠慮なく表現する
・常にポジティブである必要はない！ネガティブな反応もOK
・相手の意見に賛成できないときは反論してもよい
`;
            
            if (additionalContext) {
                prompt += `
${additionalContext}`;
            }
            
            return prompt;
        }
        
        /**
         * ★ 会話コンテキストを設定
         */
        setConversationContext(context) {
            this.conversationContext = context;
            console.log(`🎬 ${this.name}: 会話コンテキスト設定完了`);
        }
        
        // ========================================
        // LLM呼び出し
        // ========================================
        
        async generateResponse(prompt, additionalContext = '') {
            if (!this.apiKey) {
                console.error(`❌ ${this.name}: APIキーが未設定`);
                return null;
            }
            
            const systemPrompt = this.buildSystemPrompt(additionalContext);
            
            this.conversationHistory.push({
                role: 'user',
                content: prompt
            });
            
            if (this.conversationHistory.length > this.maxHistoryLength * 2) {
                this.conversationHistory = this.conversationHistory.slice(-this.maxHistoryLength * 2);
            }
            
            try {
                let response;
                
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
                    case 'grok':
                        response = await this.callGrok(systemPrompt);
                        break;
                    default:
                        response = await this.callOpenAI(systemPrompt);
                }
                
                this.conversationHistory.push({
                    role: 'assistant',
                    content: response
                });
                
                console.log(`💬 ${this.name}: "${response}"`);
                return { text: response };
                
            } catch (error) {
                console.error(`❌ ${this.name} LLMエラー:`, error);
                return null;
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
            const conversationText = this.conversationHistory.map(h => 
                `${h.role === 'user' ? 'ユーザー' : this.name}: ${h.content}`
            ).join('\n');
            
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${this.apiKey}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{
                        role: 'user',
                        parts: [{ text: systemPrompt + '\n\n' + conversationText }]
                    }],
                    generationConfig: {
                        temperature: 0.8,
                        maxOutputTokens: 500
                    }
                })
            });
            
            if (!response.ok) throw new Error('Gemini API Error');
            const data = await response.json();
            return data.candidates[0].content.parts[0].text;
        }
        
        async callClaude(systemPrompt) {
            // Claudeは直接呼び出しできないのでローカルプロキシ経由
            const response = await fetch('/api/claude', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    apiKey: this.apiKey,
                    system: systemPrompt,
                    messages: this.conversationHistory
                })
            });
            
            if (!response.ok) throw new Error('Claude API Error');
            const data = await response.json();
            return data.text;
        }
        
        async callGrok(systemPrompt) {
            // xAI Grok API（OpenAI互換）
            // ★ llmModelがGrok用でない場合はデフォルトを使用
            const grokModels = ['grok-3-fast', 'grok-3', 'grok-2-1212', 'grok-2', 'grok-beta'];
            const model = grokModels.includes(this.llmModel) ? this.llmModel : 'grok-3-fast';
            
            console.log(`🤖 ${this.name} Grok API呼び出し: model=${model}`);
            
            const response = await fetch('https://api.x.ai/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + this.apiKey
                },
                body: JSON.stringify({
                    model: model,
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
                            content: `あなたは日本語テキストの感情を分析します。以下のカテゴリから1つだけ選んでください。

【重要ルール】
- 普通の会話、雑談、説明、質問への返答 → 必ず「normal」
- 楽しそうに話している程度 → 「normal」（happyではない！）
- 明るい口調で話している → 「normal」（happyではない！）
- 「〜だね」「〜だよ」等の普通の語尾 → 「normal」

【カテゴリ】
- normal: 普通の会話、雑談、説明、返事、質問、軽いポジティブな会話（デフォルト）
- thinking: 「うーん」「そうだなぁ」「考えてみると」など明確に考え中・悩んでいる
- surprised: 「えっ！」「まじで！？」「信じられない！」など明確な驚き
- shy: 「恥ずかしい」「照れる」など明確に恥ずかしがっている
- grateful: 「ありがとう」「感謝」など明確なお礼
- proud: 「どうだ！」「すごいでしょ」など自慢・得意げ・ツンデレ
- happy: 褒められた、認められた、願いが叶った、プレゼントをもらった等、明確に嬉しい出来事への反応
- happy_strong: 大喜び、感動、夢が叶った、大成功など本当に特別な喜び
- sad: 「悲しい」「残念」「寂しい」など明確な悲しみ
- sad_strong: 泣いている、絶望、大きな悲しみ
- angry: 「むかつく」「イライラ」「ひどい」など明確な怒り・不満
- angry_strong: 激怒、ぶち切れ
- disappointed: 「嫌だ」「やめて」「がっかり」など明確な拒否・失望
- strong_ok: 「絶対やる！」「大賛成！」など強い賛同

迷ったら「normal」を選んでください。happyは本当に嬉しい出来事があった時だけ使います。

カテゴリ名のみを出力してください。`
                        }, {
                            role: 'user',
                            content: text
                        }],
                        temperature: 0.1,
                        max_tokens: 20
                    })
                });
                
                if (!response.ok) return 'normal';
                
                const data = await response.json();
                const emotion = data.choices[0].message.content.trim().toLowerCase();
                console.log(`🎭 ${this.name} 感情: ${emotion}`);
                this.currentEmotion = emotion;
                return emotion;
                
            } catch (error) {
                return 'normal';
            }
        }
        
        // ========================================
        // モーション＋表情
        // ========================================
        
        static EMOTION_MOTIONS = {
            // ========================================
            // neutral/happy系 - 通常の会話モーション
            // ========================================
            normal: { motions: [
                '女性しゃべり01.vrma',
                '女性しゃべり02.vrma',
                '女性しゃべり03.vrma',
                '女性しゃべり0４.vrma',
                '女性しゃべり04うでくみ.vrma',
                '女性しゃべり05ルンルン気分.vrma',
                'VRMA_01.vrma',
                'VRMA_06.vrma',
                'VRMA_07.vrma',
                'アンリアルキャラ興味しんしん.vrma',
                'アンリアルキャラ女性しゃべり.vrma',
                'アンリアルキャラ考える.vrma'
            ], expression: 'neutral', weight: 0 },
            
            happy_mild: { motions: [
                '女性しゃべり01.vrma',
                '女性しゃべり02.vrma',
                '女性しゃべり03.vrma',
                '女性しゃべり0４.vrma',
                '女性しゃべり04うでくみ.vrma',
                '女性しゃべり05ルンルン気分.vrma',
                'VRMA_01.vrma',
                'VRMA_06.vrma',
                'VRMA_07.vrma',
                'アンリアルキャラ興味しんしん.vrma',
                'アンリアルキャラ女性しゃべり.vrma',
                'アンリアルキャラ考える.vrma'
            ], expression: 'happy', weight: 0.3 },
            
            happy: { motions: [
                '女性しゃべり01.vrma',
                '女性しゃべり02.vrma',
                '女性しゃべり03.vrma',
                '女性しゃべり0４.vrma',
                '女性しゃべり04うでくみ.vrma',
                '女性しゃべり05ルンルン気分.vrma',
                'VRMA_01.vrma',
                'VRMA_06.vrma',
                'VRMA_07.vrma',
                'アンリアルキャラ興味しんしん.vrma',
                'アンリアルキャラ女性しゃべり.vrma',
                'アンリアルキャラ考える.vrma'
            ], expression: 'happy', weight: 0.5 },
            
            happy_strong: { motions: [
                '女性しゃべり01.vrma',
                '女性しゃべり02.vrma',
                '女性しゃべり03.vrma',
                '女性しゃべり0４.vrma',
                '女性しゃべり04うでくみ.vrma',
                '女性しゃべり05ルンルン気分.vrma',
                'VRMA_01.vrma',
                'VRMA_06.vrma',
                'VRMA_07.vrma',
                'アンリアルキャラ興味しんしん.vrma',
                'アンリアルキャラ女性しゃべり.vrma',
                'アンリアルキャラ考える.vrma'
            ], expression: 'happy', weight: 0.7 },
            
            // ========================================
            // 感謝系
            // ========================================
            grateful: { motions: [
                '女性しゃべり05ルンルン気分.vrma',
                'アンリアルキャラ喜ぶ.vrma',
                'アンリアルキャラ丁寧なお辞儀.vrma'
            ], expression: 'happy', weight: 0.5 },
            
            // ========================================
            // 嬉しい・うぬぼれ系 (Happy conceit)
            // ========================================
            proud: { motions: [
                'アンリアルキャラいろいろなセクシーポーズ.vrma',
                'アンリアルキャラセクシーモーション.vrma',
                'アンリアルキャラセクシー投げキッス.vrma',
                'アンリアルキャラセクシー待機.vrma',
                'アンリアルキャラノリノリで手をふる.vrma',
                'アンリアルキャラ興味しんしん.vrma',
                'アンリアルキャラ腰に手をあて仁王だち.vrma',
                '女性投げキッス.vrma',
                'セクシーダンス.vrma',
                '投げキッスしまくり.vrma',
                'アンリアルキャラまーざっとこんなもんよツンデレ.vrma'
            ], expression: 'happy', weight: 0.8 },
            
            // ========================================
            // 悲しみ系 (sad)
            // ========================================
            sad: { motions: [
                '女性しゃべり01.vrma',
                '女性しゃべり02.vrma',
                '女性しゃべり03.vrma',
                '女性しゃべり0４.vrma',
                '悲しくしゃべる.vrma',
                'しゃがんでいじける.vrma',
                'アンリアルキャラ頭をかかえる.vrma',
                'アンリアルキャラ頭をかかえるB.vrma',
                'アンリアルキャラまーまーおちついてくび.vrma',
                '祈る.vrma'
            ], expression: 'sad', weight: 0.7 },
            
            sad_strong: { motions: [
                '子供のように駄々をこねて倒れてじだんだ.vrma',
                '悲しくしゃがんで泣いちゃう.vrma',
                'アンリアルキャラ頭をかかえるB.vrma',
                'しゃがんでいじける.vrma'
            ], expression: 'sad', weight: 1.0 },
            
            // ========================================
            // 怒り系 (angry)
            // ========================================
            angry: { motions: [
                '女性しゃべり01.vrma',
                '女性しゃべり02.vrma',
                '女性しゃべり03.vrma',
                '女性しゃべり0４.vrma',
                'しゃべりいかりイライラ.vrma',
                'あたまをおさえてがっかり.vrma',
                'アニメイライラ.vrma',
                'アンリアルキャラもーなんなのよ！.vrma',
                'アンリアルキャラおっぱらいディス.vrma',
                'アンリアルキャラおっぱらいディスB.vrma',
                'アンリアルキャラ頭をかかえる.vrma',
                'アンリアルキャラ頭をかかえるB.vrma',
                '冠談じゃない手ではらって一周.vrma',
                '怒りあきれる.vrma',
                '怒りゆびさし.vrma'
            ], expression: 'angry', weight: 0.8 },
            
            angry_strong: { motions: [
                'ぴょんぴょんジャンプ拒絶.vrma',
                'ふみつけけりまくり.vrma',
                '子供のように駄々をこねて倒れてじだんだ.vrma',
                'アニメイライラ.vrma',
                'アンリアルキャラもーなんなのよ！.vrma'
            ], expression: 'angry', weight: 1.0 },
            
            // ========================================
            // がっかり・ネガティブ系 (disappointed)
            // ========================================
            disappointed: { motions: [
                'アンリアルキャラ否定して一線をひく.vrma',
                'うなだれて一周.vrma',
                'ええええ～！いやだよ～！どんびき.vrma',
                'ぴょんぴょんジャンプ拒絶.vrma',
                '子供のように駄々をこねて倒れてじだんだ.vrma',
                '冠談じゃない手ではらって一周.vrma',
                'しゃがんでいじける.vrma',
                'アンリアルキャラびっくり否定怒る１.vrma',
                'アンリアルキャラびっくり否定怒る.vrma'
            ], expression: 'sad', weight: 0.6 },
            
            // ========================================
            // 驚き系 (surprised)
            // ========================================
            surprised: { motions: [
                'アンリアルキャラびっくり.vrma',
                'アンリアルキャラじだんだ.vrma',
                'アンリアルキャラ頭をかかえるB.vrma',
                'ええええ～！いやだよ～！どんびき.vrma'
            ], expression: 'surprised', weight: 0.7 },
            
            // ========================================
            // 考え中 (thinking)
            // ========================================
            thinking: { motions: [
                '真剣にあれこれ考える.vrma',
                'アンリアルキャラ考える.vrma'
            ], expression: 'neutral', weight: 0 },
            
            // ========================================
            // 恥ずかしい (shy)
            // ========================================
            shy: { motions: [
                '恥ずかしい顔おおい.vrma',
                '恥ずかしくて顔をおおう.vrma'
            ], expression: 'relaxed', weight: 0.5 },
            
            // ========================================
            // 激しくOK (strong_ok)
            // ========================================
            strong_ok: { motions: [
                'アンリアルキャラ全身でOKマークポーズ.vrma'
            ], expression: 'happy', weight: 1.0 }
        };
        
        async playEmotionMotion(emotion) {
            if (!this.vrm) return null;
            
            const emotionData = CharacterUnit.EMOTION_MOTIONS[emotion] || CharacterUnit.EMOTION_MOTIONS.normal;
            
            let motionFile;
            if (emotionData.motions) {
                motionFile = emotionData.motions[Math.floor(Math.random() * emotionData.motions.length)];
            } else {
                motionFile = emotionData.motion;
            }
            
            // ★ 再生したモーションファイル名を保存
            this.lastPlayedMotion = motionFile;
            
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
                this.applyExpression(emotionData.expression, emotionData.weight);
                
                console.log(`🎬 ${this.name} モーション: ${motionFile}`);
                
                return motionFile; // ★ モーションファイル名を返す
                
            } catch (error) {
                console.error(`❌ ${this.name} モーションエラー:`, error);
                return null;
            }
        }
        
        applyExpression(expressionName, weight = 1.0, duration = 300) {
            if (!this.vrm || !this.vrm.expressionManager) return;
            
            const em = this.vrm.expressionManager;
            const allExpressions = ['happy', 'angry', 'sad', 'surprised', 'relaxed'];
            
            if (this.expressionAnimInterval) clearInterval(this.expressionAnimInterval);
            
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
            
            if (this.expressionAnimInterval) clearInterval(this.expressionAnimInterval);
            
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
        // TTS + リップシンク（音声連動）
        // ========================================
        
        async speak(text) {
            if (!text) return;
            
            this.isSpeaking = true;
            if (this.onSpeakStart) this.onSpeakStart(this);
            
            try {
                // ★ voiceEngineによる分岐
                if (this.voiceEngine === 'grok') {
                    // Grok VoiceはWebSocketリアルタイムAPIなのでTTSとしては使えない
                    // SBV2が利用可能ならそちらを使用
                    console.log(`🎙️ ${this.name}: Grok VoiceはTTS非対応、SBV2/ブラウザTTSを使用`);
                    if (window.SBV2Panel && window.SBV2Panel.isEnabled()) {
                        await this.speakWithSBV2(text);
                    } else {
                        this.startPatternLipSync();
                        await this.speakWithBrowser(text);
                        this.stopLipSync();
                    }
                } else if (this.voiceEngine === 'sbv2' || this.ttsEngine === 'sbv2') {
                    // SBV2パネルが有効かチェック
                    if (window.SBV2Panel && window.SBV2Panel.isEnabled()) {
                        await this.speakWithSBV2(text);
                    } else if (window.styleBertVits2 && window.styleBertVits2.isAvailable) {
                        await this.speakWithSBV2Legacy(text);
                    } else {
                        this.startPatternLipSync();
                        await this.speakWithBrowser(text);
                        this.stopLipSync();
                    }
                } else {
                    // デフォルト: ブラウザTTS
                    this.startPatternLipSync();
                    await this.speakWithBrowser(text);
                    this.stopLipSync();
                }
                
            } catch (error) {
                console.error(`❌ ${this.name} TTS エラー:`, error);
                this.stopLipSync();
            } finally {
                this.isSpeaking = false;
                if (this.onSpeakEnd) this.onSpeakEnd(this);
            }
        }
        
        async speakWithSBV2(text) {
            try {
                const settings = window.SBV2Panel.getSettings();
                
                // G2P（読み仮名変換）
                const g2pRes = await fetch('/sbv2/api/g2p', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ text })
                });
                
                if (!g2pRes.ok) throw new Error('G2P failed');
                const g2pData = await g2pRes.json();
                const moraToneList = g2pData.mora_tone_list || g2pData || [];
                
                // ★ キャラクターのvoiceModelを使用（設定されていればそれを優先）
                const voiceModel = this.voiceModel || settings.model;
                
                // モデル情報を取得してスタイル・ファイルを検証
                let validStyle = 'Neutral';
                let modelFile = `model_assets\\${voiceModel}\\${voiceModel}.safetensors`;
                
                try {
                    const modelsRes = await fetch('/sbv2/api/models_info');
                    if (modelsRes.ok) {
                        const modelsInfo = await modelsRes.json();
                        const modelInfo = modelsInfo.find(m => m.name === voiceModel);
                        if (modelInfo) {
                            // モデルファイルを取得
                            if (modelInfo.files && modelInfo.files.length > 0) {
                                modelFile = modelInfo.files[0];
                            }
                            // 感情からスタイルを決定
                            if (modelInfo.styles) {
                                const requestedStyle = this.getRequestedStyle(this.currentEmotion);
                                validStyle = this.findValidStyle(requestedStyle, modelInfo.styles);
                            }
                        }
                    }
                } catch (e) {
                    console.warn('モデル情報取得失敗、デフォルト設定を使用');
                }
                
                const styleWeight = 0.5 + (settings.styleWeight - 1) * (2.5 / 19);
                
                console.log(`🎤 ${this.name} SBV2音声合成: model=${voiceModel}, style=${validStyle}`);
                
                // 音声合成（キャラクター固有のvoiceModelを使用）
                const synthRes = await fetch('/sbv2/api/synthesis', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        model: voiceModel,
                        modelFile: modelFile,
                        text,
                        moraToneList,
                        style: validStyle,
                        styleWeight,
                        speed: settings.speed || 1.0,
                        language: 'JP'
                    })
                });
                
                if (!synthRes.ok) {
                    const errText = await synthRes.text();
                    throw new Error(`Synthesis failed: ${synthRes.status} - ${errText}`);
                }
                
                const audioData = await synthRes.arrayBuffer();
                if (audioData.byteLength < 500) throw new Error('Audio too small');
                
                console.log(`✅ ${this.name} SBV2音声生成完了: ${audioData.byteLength} bytes (voice: ${voiceModel})`);
                
                // 音声再生（リップシンク付き）
                await this.playAudioWithLipSync(audioData);
                
            } catch (error) {
                console.error(`❌ ${this.name} SBV2エラー:`, error);
                // フォールバック
                this.startPatternLipSync();
                await this.speakWithBrowser(text);
                this.stopLipSync();
            }
        }
        
        getRequestedStyle(emotionName) {
            const emotionMapping = {
                normal: 'Neutral',
                happy_mild: 'Happy',
                happy: 'Happy',
                happy_strong: 'Happy',
                proud: 'Happy',
                grateful: 'Happy',
                sad: 'Sad',
                sad_strong: 'Sad',
                angry: 'Angry',
                angry_strong: 'Angry',
                disappointed: 'Sad',
                surprised: 'Surprise',
                thinking: 'Neutral',
                shy: 'Neutral',
                strong_ok: 'Happy'
            };
            return emotionMapping[emotionName?.toLowerCase()] || 'Neutral';
        }
        
        findValidStyle(requestedStyle, availableStyles) {
            // リクエストされたスタイルがサポートされているかチェック
            if (availableStyles.includes(requestedStyle)) {
                return requestedStyle;
            }
            
            // サポートされていない場合、代替スタイルを探す
            // angryがあれば怒り系に使用
            if (requestedStyle === 'Angry' && availableStyles.includes('angry')) {
                return 'angry';
            }
            // highがあればポジティブな感情に使用
            if (['Happy', 'Surprise'].includes(requestedStyle) && availableStyles.includes('high')) {
                return 'high';
            }
            // lowがあればネガティブな感情に使用
            if (requestedStyle === 'Sad' && availableStyles.includes('low')) {
                return 'low';
            }
            // Neutralにフォールバック
            if (availableStyles.includes('Neutral')) {
                console.log(`⚠️ スタイル「${requestedStyle}」未サポート → Neutral`);
                return 'Neutral';
            }
            // 最初のスタイルを使用
            console.log(`⚠️ スタイル「${requestedStyle}」未サポート → ${availableStyles[0]}`);
            return availableStyles[0];
        }
        
        mapEmotionToSBV2Style(emotionName) {
            // 基本的なマッピング（標準スタイル名）
            const emotionMapping = {
                normal: 'Neutral',
                happy_mild: 'Happy',
                happy: 'Happy',
                happy_strong: 'Happy',
                proud: 'Happy',
                grateful: 'Happy',
                sad: 'Sad',
                sad_strong: 'Sad',
                angry: 'Angry',
                angry_strong: 'Angry',
                disappointed: 'Sad',
                surprised: 'Surprise',
                thinking: 'Neutral',
                shy: 'Neutral',
                strong_ok: 'Happy'
            };
            
            const requestedStyle = emotionMapping[emotionName?.toLowerCase()] || 'Neutral';
            
            // SBV2パネルのモデルがサポートしているスタイルをチェック
            if (window.SBV2Panel) {
                const settings = window.SBV2Panel.getSettings();
                // モデル情報を取得
                const modelsInfo = window.sbv2ModelsInfo;
                if (modelsInfo) {
                    const currentModel = modelsInfo.find(m => m.name === settings.model);
                    if (currentModel && currentModel.styles) {
                        // リクエストされたスタイルがサポートされているかチェック
                        if (currentModel.styles.includes(requestedStyle)) {
                            return requestedStyle;
                        }
                        // サポートされていない場合、代替スタイルを探す
                        // angryがあれば怒り系に使用
                        if (requestedStyle === 'Angry' && currentModel.styles.includes('angry')) {
                            return 'angry';
                        }
                        // high/lowがあれば感情の強弱に使用
                        if (['Happy', 'Surprise'].includes(requestedStyle) && currentModel.styles.includes('high')) {
                            return 'high';
                        }
                        if (requestedStyle === 'Sad' && currentModel.styles.includes('low')) {
                            return 'low';
                        }
                        // Neutralにフォールバック
                        if (currentModel.styles.includes('Neutral')) {
                            console.log(`⚠️ スタイル「${requestedStyle}」未サポート、Neutralにフォールバック`);
                            return 'Neutral';
                        }
                        // 最初のスタイルを使用
                        console.log(`⚠️ スタイル「${requestedStyle}」未サポート、${currentModel.styles[0]}にフォールバック`);
                        return currentModel.styles[0];
                    }
                }
            }
            
            return requestedStyle;
        }
        
        async speakWithSBV2Legacy(text) {
            const sbv2 = window.styleBertVits2;
            try {
                const result = await sbv2.synthesize(text, {
                    model: this.voiceModel,
                    speakerId: this.voiceSpeakerId
                });
                await this.playAudioWithLipSync(result.audioData);
            } catch (error) {
                console.error('SBV2 Legacy エラー:', error);
                this.startPatternLipSync();
                await this.speakWithBrowser(text);
                this.stopLipSync();
            }
        }
        
        speakWithBrowser(text) {
            return new Promise((resolve) => {
                const utterance = new SpeechSynthesisUtterance(text);
                utterance.lang = 'ja-JP';
                utterance.onend = () => resolve();
                utterance.onerror = () => resolve();
                speechSynthesis.speak(utterance);
            });
        }
        
        // ========================================
        // 音声再生 + 音声波形連動リップシンク
        // ========================================
        
        async playAudioWithLipSync(audioData) {
            return new Promise((resolve, reject) => {
                try {
                    const blob = new Blob([audioData], { type: 'audio/wav' });
                    const url = URL.createObjectURL(blob);
                    const audio = new Audio(url);
                    
                    this.currentAudio = audio;
                    
                    audio.onplay = () => {
                        console.log(`🔊 ${this.name} 音声再生開始`);
                        this.startAudioLipSync(audio);
                    };
                    
                    audio.onended = () => {
                        URL.revokeObjectURL(url);
                        this.stopLipSync();
                        this.currentAudio = null;
                        console.log(`🔇 ${this.name} 音声再生終了`);
                        resolve();
                    };
                    
                    audio.onerror = (e) => {
                        URL.revokeObjectURL(url);
                        this.stopLipSync();
                        this.currentAudio = null;
                        reject(e);
                    };
                    
                    audio.play().catch(reject);
                    
                } catch (e) {
                    reject(e);
                }
            });
        }
        
        startAudioLipSync(audioElement) {
            if (!this.vrm || !this.vrm.expressionManager) return;
            
            try {
                // AudioContext初期化
                if (!this.audioContext) {
                    this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
                }
                
                // 音声ソースを作成
                const source = this.audioContext.createMediaElementSource(audioElement);
                this.analyser = this.audioContext.createAnalyser();
                this.analyser.fftSize = 256;
                this.analyser.smoothingTimeConstant = 0.3;
                
                source.connect(this.analyser);
                this.analyser.connect(this.audioContext.destination);
                
                this.dataArray = new Uint8Array(this.analyser.frequencyBinCount);
                
                // リップシンクアニメーション開始
                this.animateAudioLipSync();
                
                console.log(`👄 ${this.name} 音声連動リップシンク開始`);
            } catch (e) {
                console.warn(`⚠️ ${this.name} 音声連動リップシンク初期化失敗、パターン方式にフォールバック`);
                this.startPatternLipSync();
            }
        }
        
        animateAudioLipSync() {
            if (!this.analyser || !this.vrm) return;
            
            const em = this.vrm.expressionManager;
            if (!em) return;
            
            const self = this;
            
            function update() {
                if (!self.analyser || !self.isSpeaking) {
                    // リップシンク終了時に口を閉じる
                    try { em.setValue('aa', 0); } catch (e) {}
                    return;
                }
                
                self.analyser.getByteFrequencyData(self.dataArray);
                
                // 低周波数帯（口の動き用）の平均を計算
                let sum = 0;
                const lowFreqRange = Math.floor(self.dataArray.length * 0.3);
                for (let i = 0; i < lowFreqRange; i++) {
                    sum += self.dataArray[i];
                }
                const average = sum / lowFreqRange / 255;
                
                // 口の開きを適用（aaモーフ）
                const mouthValue = Math.pow(average, 0.8) * 1.2; // 感度調整
                try {
                    em.setValue('aa', Math.min(mouthValue, 1));
                } catch (e) {}
                
                self.lipSyncAnimationId = requestAnimationFrame(update);
            }
            
            update();
        }
        
        startPatternLipSync() {
            if (!this.vrm || !this.vrm.expressionManager) return;
            
            const mouthPattern = [0.10, 0.30, 0.05, 0.15, 0.25, 0.50, 0.20, 1.00, 0.15, 0.25, 0.10, 0.75];
            let patternIndex = 0;
            
            this.lipSyncInterval = setInterval(() => {
                if (this.vrm && this.vrm.expressionManager && this.isSpeaking) {
                    try {
                        this.vrm.expressionManager.setValue('aa', mouthPattern[patternIndex]);
                    } catch (e) {}
                    patternIndex = (patternIndex + 1) % mouthPattern.length;
                }
            }, 100);
            
            console.log(`👄 ${this.name} パターンリップシンク開始`);
        }
        
        stopLipSync() {
            // パターンベースのリップシンク停止
            if (this.lipSyncInterval) {
                clearInterval(this.lipSyncInterval);
                this.lipSyncInterval = null;
            }
            
            // 音声連動リップシンク停止
            if (this.lipSyncAnimationId) {
                cancelAnimationFrame(this.lipSyncAnimationId);
                this.lipSyncAnimationId = null;
            }
            
            // Analyserをクリーンアップ
            if (this.analyser) {
                try { this.analyser.disconnect(); } catch (e) {}
                this.analyser = null;
            }
            
            // 口を閉じる
            if (this.vrm && this.vrm.expressionManager) {
                try { this.vrm.expressionManager.setValue('aa', 0); } catch (e) {}
            }
            
            console.log(`👄 ${this.name} リップシンク停止`);
        }
        
        // ========================================
        // メイン処理
        // ========================================
        
        /**
         * メイン処理
         * @param {string} prompt - プロンプト
         * @param {string} additionalContext - 追加コンテキスト
         * @param {object} options - オプション
         * @param {boolean} options.playMotion - モーションを直接再生するか（デフォルト: true）
         */
        async processAndSpeak(prompt, additionalContext = '', options = {}) {
            if (this.isProcessing) return null;
            
            // ★ デフォルトでモーション再生を有効にする
            const { playMotion = true } = options;
            
            this.isProcessing = true;
            if (this.onResponseStart) this.onResponseStart(this);
            
            try {
                // 1. LLM応答
                const result = await this.generateResponse(prompt, additionalContext);
                if (!result || !result.text) return null;
                
                // 2. 感情分析
                const emotion = await this.analyzeEmotion(result.text);
                
                // 3. モーションファイル名を決定
                const emotionData = CharacterUnit.EMOTION_MOTIONS[emotion] || CharacterUnit.EMOTION_MOTIONS.normal;
                let motionFile;
                if (emotionData.motions) {
                    motionFile = emotionData.motions[Math.floor(Math.random() * emotionData.motions.length)];
                } else {
                    motionFile = emotionData.motion;
                }
                
                // ★ モーション再生（デフォルトで有効）
                if (playMotion && this.vrm) {
                    console.log(`🎬 ${this.name} モーション再生開始: ${motionFile} (VRM: ${this.vrm ? '有' : '無'}, mixer: ${this.mixer ? '有' : '無'})`);
                    await this.playEmotionMotion(emotion);
                } else if (!this.vrm) {
                    console.warn(`⚠️ ${this.name}: VRMが設定されていないためモーションをスキップ`);
                }
                
                // 4. TTS（リップシンク＋表情は音声再生時に適用）
                // 表情も適用
                this.applyExpression(emotionData.expression, emotionData.weight);
                await this.speak(result.text);
                
                if (this.onResponseEnd) this.onResponseEnd(this, result.text);
                
                // ★ 感情、モーションファイル名、感情データを返す
                return { 
                    text: result.text, 
                    emotion, 
                    motion: motionFile,
                    expressionName: emotionData.expression,
                    expressionWeight: emotionData.weight
                };
                
            } catch (error) {
                console.error(`❌ ${this.name} 処理エラー:`, error);
                return null;
            } finally {
                this.isProcessing = false;
            }
        }
        
        setListening() {
            this.applyExpression('happy', 0.2);
        }
        
        setIdle() {
            this.resetExpression();
        }
        
        clearHistory() {
            this.conversationHistory = [];
        }
        
        toJSON() {
            return {
                id: this.id,
                name: this.name,
                personality: this.personality,
                enabled: this.enabled,
                vrmPath: this.vrmPath,
                position: this.position,
                llmProvider: this.llmProvider,
                llmModel: this.llmModel,
                ttsEngine: this.ttsEngine,
                voiceModel: this.voiceModel,
                voiceSpeakerId: this.voiceSpeakerId
            };
        }
    }
    
    // ========================================
    // DialogueDirector - 会話の監督
    // ========================================
    
    class DialogueDirector {
        constructor() {
            this.characters = new Map();
            this.turnOrder = [];
            this.conversationHistory = [];
            this.maxHistoryLength = 20;
            this.currentTurnIndex = 0;
            this.currentSpeakerId = null;
            
            this.isRunning = false;
            this.isPaused = false;
            this.turnMode = 'round-robin';
            this.topic = '';
            
            // ★ ターン数制限
            this.maxTurns = null; // null = 無制限
            this.currentTurnCount = 0;
            
            // ★ 会話コンテキスト
            this.conversationContext = '';
            
            // コールバック
            this.onTurnStart = null;
            this.onTurnEnd = null;
            this.onConversationStart = null;
            this.onConversationEnd = null;
            this.onSpeechStart = null;
            this.onSpeechEnd = null;
            this.onLogUpdate = null;
        }
        
        /**
         * ★ ターン数制限を設定
         */
        setMaxTurns(maxTurns) {
            this.maxTurns = maxTurns;
            console.log(`🔄 ターン数制限: ${maxTurns || '無制限'}`);
        }
        
        /**
         * ★ 会話コンテキストを設定
         */
        setConversationContext(context) {
            this.conversationContext = context;
            // 全キャラクターにも設定
            this.characters.forEach(char => {
                char.setConversationContext(context);
            });
            console.log('🎬 会話コンテキスト設定完了');
        }
        
        addCharacter(unit) {
            this.characters.set(unit.id, unit);
            if (!this.turnOrder.includes(unit.id)) {
                this.turnOrder.push(unit.id);
            }
            
            unit.onSpeakStart = (char) => {
                if (this.onSpeechStart) this.onSpeechStart(char);
            };
            unit.onSpeakEnd = (char) => {
                if (this.onSpeechEnd) this.onSpeechEnd(char);
            };
            
            console.log(`➕ キャラクター追加: ${unit.name} (${unit.id})`);
        }
        
        removeCharacter(id) {
            if (!this.characters.has(id)) return false;
            this.characters.delete(id);
            this.turnOrder = this.turnOrder.filter(cid => cid !== id);
            return true;
        }
        
        getCharacter(id) { return this.characters.get(id); }
        getAllCharacters() { return Array.from(this.characters.values()); }
        getEnabledCharacters() { return this.getAllCharacters().filter(c => c.enabled); }
        
        // ========================================
        // 会話制御
        // ========================================
        
        async start(topic = '') {
            const enabledChars = this.getEnabledCharacters();
            if (enabledChars.length === 0) {
                console.warn('⚠️ 有効なキャラクターがいません');
                return;
            }
            
            if (this.isRunning) {
                console.warn('⚠️ 既に会話中です');
                return;
            }
            
            this.isRunning = true;
            this.isPaused = false;
            this.topic = topic;
            this.currentTurnIndex = 0;
            this.currentTurnCount = 0; // ★ ターン数リセット
            this.conversationHistory = [];
            
            // 有効なキャラクターのみでターン順序を再構築
            this.turnOrder = enabledChars.map(c => c.id);
            
            console.log(`🎬 会話開始: "${topic || '自由会話'}" (${enabledChars.length}人)`);
            
            if (this.onConversationStart) {
                this.onConversationStart(topic);
            }
            
            const firstSpeakerId = this.turnOrder[0];
            await this.runTurn(firstSpeakerId, topic, 'initial');
        }
        
        stop() {
            this.isRunning = false;
            this.isPaused = false;
            this.currentSpeakerId = null;
            console.log('🛑 会話停止');
            if (this.onConversationEnd) this.onConversationEnd();
        }
        
        pause() { 
            this.isPaused = true;
            console.log('⏸ 会話一時停止');
        }
        
        resume() { 
            if (this.isPaused) {
                this.isPaused = false;
                console.log('▶️ 会話再開');
            }
        }
        
        async runTurn(speakerId, context, type) {
            if (!this.isRunning || this.isPaused) return;
            
            // ★ ターン数制限チェック
            if (this.maxTurns && this.currentTurnCount >= this.maxTurns) {
                console.log(`🏁 ターン数制限に達しました (${this.currentTurnCount}/${this.maxTurns})`);
                this.stop();
                return;
            }
            
            const speaker = this.characters.get(speakerId);
            if (!speaker || !speaker.enabled) return;
            
            this.currentSpeakerId = speakerId;
            this.currentTurnCount++;
            console.log(`\n👤 ${speaker.name}のターン (${type}) [ターン ${this.currentTurnCount}${this.maxTurns ? '/' + this.maxTurns : ''}]`);
            
            if (this.onTurnStart) this.onTurnStart(speaker, type);
            
            // 他キャラは聞く姿勢
            this.characters.forEach((char, id) => {
                if (id !== speakerId && char.enabled) {
                    char.setListening();
                }
            });
            
            // プロンプト構築
            const prompt = this.buildPrompt(speakerId, context, type);
            
            // 応答生成 + 感情分析 + モーション + TTS
            const result = await speaker.processAndSpeak(prompt);
            
            if (!result || !result.text) {
                this.currentSpeakerId = null;
                console.warn(`⚠️ ${speaker.name}の応答なし`);
                return;
            }
            
            // 会話履歴に追加（感情とモーションも含む）
            this.conversationHistory.push({
                speakerId,
                speakerName: speaker.name,
                text: result.text,
                emotion: result.emotion,
                motion: result.motion,
                timestamp: Date.now()
            });
            
            if (this.conversationHistory.length > this.maxHistoryLength) {
                this.conversationHistory = this.conversationHistory.slice(-this.maxHistoryLength);
            }
            
            if (this.onLogUpdate) {
                this.onLogUpdate(this.conversationHistory);
            }
            
            // ★ 感情とモーション情報も渡す
            if (this.onTurnEnd) this.onTurnEnd(speaker, result.text, result.emotion, result.motion);
            
            this.currentSpeakerId = null;
            
            // 次のターン
            if (this.isRunning && !this.isPaused) {
                const nextSpeakerId = this.getNextSpeaker(speakerId);
                await this.wait(500);
                await this.runTurn(nextSpeakerId, result.text, 'response');
            }
        }
        
        getNextSpeaker(currentSpeakerId) {
            const enabledIds = this.getEnabledCharacters().map(c => c.id);
            
            if (this.turnMode === 'round-robin') {
                const currentIndex = enabledIds.indexOf(currentSpeakerId);
                return enabledIds[(currentIndex + 1) % enabledIds.length];
            }
            
            // dynamic mode
            return this.decideDynamicNextSpeaker(currentSpeakerId, enabledIds);
        }
        
        decideDynamicNextSpeaker(currentSpeakerId, enabledIds) {
            const lastMessage = this.conversationHistory[this.conversationHistory.length - 1];
            const others = enabledIds.filter(id => id !== currentSpeakerId);
            
            if (!lastMessage || others.length === 0) return others[0] || currentSpeakerId;
            
            // 名前が呼ばれた人を優先
            for (const id of others) {
                const char = this.characters.get(id);
                if (lastMessage.text.includes(char.name)) return id;
            }
            
            // 最近話してない人を優先
            const recentSpeakers = this.conversationHistory.slice(-2).map(h => h.speakerId);
            const notRecentSpeaker = others.find(id => !recentSpeakers.includes(id));
            if (notRecentSpeaker) return notRecentSpeaker;
            
            return others[Math.floor(Math.random() * others.length)];
        }
        
        buildPrompt(speakerId, context, type) {
            const speaker = this.characters.get(speakerId);
            const enabledChars = this.getEnabledCharacters();
            
            const others = enabledChars
                .filter(c => c.id !== speakerId)
                .map(c => `・${c.name}: ${c.personality}`)
                .join('\n');
            
            const recentHistory = this.conversationHistory
                .slice(-8)
                .map(h => `${h.speakerName}: ${h.text}`)
                .join('\n');
            
            if (type === 'initial') {
                const topicStr = context || '自由に会話を始めてください';
                return `【会話仲間】\n${others}\n\n【トピック】${topicStr}\n\nこのトピックについて、あなたから会話を始めてください。2〜3文程度で簡潔に。`;
            }
            
            const lastSpeaker = this.conversationHistory[this.conversationHistory.length - 1];
            const lastSpeakerName = lastSpeaker ? lastSpeaker.speakerName : '誰か';
            
            return `【会話仲間】\n${others}\n\n【これまでの会話】\n${recentHistory || '(会話開始)'}\n\n【${lastSpeakerName}の直前の発言】「${context}」\n\nこの会話の流れを踏まえて、あなたのキャラクターらしく反応してください。2〜3文程度で。`;
        }
        
        clearAllHistory() {
            this.conversationHistory = [];
            this.characters.forEach(char => char.clearHistory());
        }
        
        wait(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }
        
        getConversationHistory() {
            return this.conversationHistory.map(h => ({
                speaker: h.speakerName,
                text: h.text,
                emotion: h.emotion,
                motion: h.motion,
                timestamp: h.timestamp
            }));
        }
    }
    
    // グローバル公開
    window.CharacterUnit = CharacterUnit;
    window.DialogueDirector = DialogueDirector;
    
    console.log('✅ Multi-Character Core v2.1 読み込み完了');
})();
