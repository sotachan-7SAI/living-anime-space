/**
 * EmotionMemoryManager v1.2
 * 
 * 🧠 Grok Voice + AIチャット用の感情・記憶管理システム
 * 
 * 機能:
 * 1. 会話履歴の蓄積・要約
 * 2. 感情状態の追跡（9種類の感情メーター）
 * 3. 短期記憶・長期記憶の管理
 * 4. ChatGPT/Grokで文脈要約を生成
 * 5. Grok Voiceのsystem promptに感情・記憶を注入
 * 6. ★NEW★ 沈黙検知→Grok Voice自動発話トリガー
 */

class EmotionMemoryManager {
    constructor() {
        this.version = '1.2';
        
        // ========================================
        // 感情メーター（0-10）
        // ========================================
        this.emotions = {
            joy: 5,           // 喜び
            anger: 0,         // 怒り
            sadness: 0,       // 哀しみ
            fun: 5,           // 楽しさ
            excitement: 3,    // 興奮
            calm: 7,          // 安心
            tired: 2,         // 疲れ
            disappointment: 0,// 失望
            fear: 0,          // 恐れ
            affection: 5,     // 好感度（ユーザーへの）
            curiosity: 5      // 好奇心
        };
        
        this.emotionLabels = {
            joy: '喜び', anger: '怒り', sadness: '哀しみ', fun: '楽しさ',
            excitement: '興奮', calm: '安心', tired: '疲れ',
            disappointment: '失望', fear: '恐れ',
            affection: '好感度', curiosity: '好奇心'
        };
        
        this.emotionEmojis = {
            joy: '😊', anger: '😠', sadness: '😢', fun: '😄',
            excitement: '🤩', calm: '😌', tired: '😴',
            disappointment: '😞', fear: '😨',
            affection: '💕', curiosity: '🤔'
        };
        
        // ========================================
        // 記憶システム
        // ========================================
        
        // 短期記憶（直近の会話、最大20件）
        this.shortTermMemory = [];
        this.maxShortTermMemory = 20;
        
        // 長期記憶（重要な出来事、最大50件）
        this.longTermMemory = [];
        this.maxLongTermMemory = 50;
        
        // 会話要約（AIが生成）
        this.conversationSummary = '';
        this.lastSummaryTime = 0;
        this.summaryInterval = 60000; // 1分ごとに要約更新
        
        // ユーザー情報（学習したこと）
        this.userProfile = {
            name: null,
            interests: [],
            preferences: [],
            importantFacts: []
        };
        
        // ========================================
        // トラウマ・過去の傷（目的や欲の元）
        // ========================================
        this.traumas = [];
        this.maxTraumas = 10;
        
        // トラウマの構造:
        // {
        //   id: number,
        //   title: string,          // トラウマのタイトル（例：「幼少期の孤独」）
        //   description: string,    // 詳細な説明
        //   affectedEmotions: {},   // 影響する感情 { sadness: +3, fear: +2 }
        //   triggerWords: [],       // トリガーとなる言葉
        //   desires: [],            // このトラウマから生まれた欲求（例：「認められたい」「愛されたい」）
        //   avoidances: [],         // 避けたいこと（例：「孤独」「批判」）
        //   intensity: 5,           // トラウマの強度（1-10）
        //   isActive: true          // 有効/無効
        // }
        
        // ========================================
        // API設定
        // ========================================
        this.analyzerLLM = 'chatgpt'; // 'chatgpt' or 'grok'
        this.analyzerModel = 'gpt-4o-mini';
        this.apiKey = null;
        this.isAnalyzing = false;
        
        // ========================================
        // コールバック
        // ========================================
        this.onEmotionChange = null;
        this.onMemoryUpdate = null;
        this.onSummaryUpdate = null;
        this.onTraumaUpdate = null;
        this.onSilenceDetected = null; // 沈黙検知コールバック
        
        // ========================================
        // 沈黙検知システム (v1.2)
        // ========================================
        this.silenceDetection = {
            enabled: false,
            timeout: 10,           // 沈黙判定時間（秒）
            lastActivityTime: Date.now(),
            timerId: null,
            triggerCount: 0        // トリガー発動回数
        };
        
        // 設定読み込み
        this.loadFromStorage();
        
        console.log('🧠 EmotionMemoryManager v1.2 初期化完了（沈黙検知機能追加）');
    }
    
    // ========================================
    // 沈黙検知システム (v1.2)
    // ========================================
    
    /**
     * 沈黙検知を有効化
     */
    enableSilenceDetection(timeoutSec = 10) {
        this.silenceDetection.enabled = true;
        this.silenceDetection.timeout = Math.max(1, Math.min(30, timeoutSec));
        this.silenceDetection.lastActivityTime = Date.now();
        this.startSilenceTimer();
        
        console.log(`🔇 沈黙検知ON: ${this.silenceDetection.timeout}秒`);
        this.saveSilenceSettings();
    }
    
    /**
     * 沈黙検知を無効化
     */
    disableSilenceDetection() {
        this.silenceDetection.enabled = false;
        this.stopSilenceTimer();
        
        console.log('🔇 沈黙検知OFF');
        this.saveSilenceSettings();
    }
    
    /**
     * 沈黙検知のタイムアウトを設定
     */
    setSilenceTimeout(timeoutSec) {
        this.silenceDetection.timeout = Math.max(1, Math.min(30, timeoutSec));
        
        // タイマー再起動
        if (this.silenceDetection.enabled) {
            this.startSilenceTimer();
        }
        
        console.log(`🔇 沈黙検知時間: ${this.silenceDetection.timeout}秒`);
        this.saveSilenceSettings();
    }
    
    /**
     * 沈黙タイマーを開始
     */
    startSilenceTimer() {
        this.stopSilenceTimer();
        
        if (!this.silenceDetection.enabled) return;
        
        const timeoutMs = this.silenceDetection.timeout * 1000;
        
        this.silenceDetection.timerId = setInterval(() => {
            const elapsed = Date.now() - this.silenceDetection.lastActivityTime;
            
            if (elapsed >= timeoutMs) {
                this.triggerSilenceAction();
            }
        }, 1000);
        
        console.log(`⏱️ 沈黙タイマー開始: ${this.silenceDetection.timeout}秒`);
    }
    
    /**
     * 沈黙タイマーを停止
     */
    stopSilenceTimer() {
        if (this.silenceDetection.timerId) {
            clearInterval(this.silenceDetection.timerId);
            this.silenceDetection.timerId = null;
        }
    }
    
    /**
     * アクティビティを記録（沈黙タイマーリセット）
     */
    recordActivity() {
        this.silenceDetection.lastActivityTime = Date.now();
    }
    
    /**
     * 沈黙検知時のアクションを実行
     */
    triggerSilenceAction() {
        if (!this.silenceDetection.enabled) return;
        
        this.silenceDetection.triggerCount++;
        this.silenceDetection.lastActivityTime = Date.now(); // リセット
        
        console.log(`🔇 沈黙検知トリガー発動！ (第${this.silenceDetection.triggerCount}回)`);
        
        // コールバック実行
        if (this.onSilenceDetected) {
            this.onSilenceDetected(this.silenceDetection.triggerCount);
        }
        
        // Grok Voiceに自動発話をトリガー
        this.triggerGrokVoiceInitiate();
    }
    
    /**
     * Grok Voiceに自動発話をトリガー
     */
    triggerGrokVoiceInitiate() {
        // 多様なプロンプトを生成
        const promptForAI = this.generateDiverseInitiatePrompt();
        
        console.log(`🚀 Grok Voiceに発話依頼`);
        
        // Grok Voiceクライアントを取得（複数の場所をチェック）
        const grokClient = window.grokVoiceMode?.client || window.grokClient;
        
        if (grokClient && grokClient.isConnected) {
            // sendText() を使用
            grokClient.sendText(promptForAI);
            console.log('✅ Grok Voiceに発話トリガー送信完了');
        } else {
            console.warn('⚠️ Grok Voiceが接続されていません');
            
            // フォールバック：AIチャットに表示
            const fallbackPhrase = this.generateInitiatePrompt();
            this.fallbackToAIChat(fallbackPhrase);
        }
    }
    
    /**
     * 会話を分析して深掘りするプロンプトを生成
     */
    generateDiverseInitiatePrompt() {
        const triggerCount = this.silenceDetection.triggerCount;
        const dominant = this.getDominantEmotion();
        
        // 直前の会話を取得（最大10件）
        const recentMessages = this.shortTermMemory.slice(-10)
            .map(m => `${m.role === 'user' ? 'ユーザー' : 'あなた'}: ${m.text}`)
            .join('\n');
        
        // ユーザーの発言だけを抽出（興味分析用）
        const userMessages = this.shortTermMemory
            .filter(m => m.role === 'user')
            .slice(-5)
            .map(m => m.text)
            .join(' ');
        
        // 過去の沈黙トリガー発話を取得（重複回避用）
        const pastTriggerMessages = this.shortTermMemory
            .filter(m => m.source === 'silence_trigger')
            .slice(-5)
            .map(m => m.text);
        
        // 感情に応じたトーン
        let emotionTone = '自然体で、フレンドリーに';
        if (dominant.emotion === 'joy' && dominant.value >= 7) {
            emotionTone = '嬉しそうに、明るいトーンで';
        } else if (dominant.emotion === 'sadness' && dominant.value >= 6) {
            emotionTone = '少し寂しそうに、甘えるような感じで';
        } else if (dominant.emotion === 'curiosity' && dominant.value >= 6) {
            emotionTone = '興味津々で、ワクワクした感じで';
        } else if (dominant.emotion === 'affection' && dominant.value >= 7) {
            emotionTone = '親しみを込めて、優しく';
        }
        
        // ユーザー情報
        let userContext = '';
        if (this.userProfile.name) {
            userContext += `ユーザーの名前: ${this.userProfile.name}\n`;
        }
        if (this.userProfile.interests.length > 0) {
            userContext += `ユーザーの興味: ${this.userProfile.interests.join(', ')}\n`;
        }
        
        // 避けるべき内容（過去に言ったこと）
        let avoidContext = '';
        if (pastTriggerMessages.length > 0) {
            avoidContext = `\n【重要】以下と同じ・似た内容は絶対に言わないでください：\n${pastTriggerMessages.map(m => `・「${m}」`).join('\n')}`;
        }
        
        // トリガー回数に応じたアプローチ指示
        let approachInstruction = '';
        if (triggerCount === 1) {
            approachInstruction = 'これが最初の話しかけです。軽く声をかけてください。';
        } else if (triggerCount <= 3) {
            approachInstruction = `${triggerCount}回目の話しかけです。【直前の会話】の内容から、ユーザーが興味を持っていそうなトピックを見つけて、それについて深掘りする質問をしてください。`;
        } else {
            approachInstruction = `${triggerCount}回目の話しかけです。【直前の会話】を分析して、ユーザーの興味や関心を推測し、新しい角度から質問や話題を振ってください。`;
        }
        
        const prompt = `【沈黙検知による自動発話 - 会話深掘りモード】
ユーザーが${this.silenceDetection.timeout}秒間沈黙しています。あなたから話しかけてください。

${approachInstruction}

【会話分析の指示】
以下の直前の会話履歴を分析して、ユーザーが興味を持っていそうなことを推測してください。
その興味に対して:
- 深掘りする質問をする（例：「さっきの〇〇の話だけど、具体的にどういうこと？」）
- 関連する話題を振る（例：「そういえばさ、〇〇って知ってる？」）
- 共感や意見を伝える（例：「わかる〜！私も〇〇好き！」）
- 自分の経験や知識を共有する
などの方法で話しかけてください。

${recentMessages ? `【直前の会話履歴】\n${recentMessages}` : '【直前の会話履歴】\n（まだ会話がありません）'}
${userContext ? `\n【ユーザー情報】\n${userContext}` : ''}
【トーン】${emotionTone}
【長さ】30〜80文字程度で短く${avoidContext}

会話の流れを踏まえて、自然に話しかけてください。同じことの繰り返しはNG！`;
        
        return prompt;
    }
    
    /**
     * 感情状態に応じた話しかけプロンプトを生成
     */
    generateInitiatePrompt() {
        const dominant = this.getDominantEmotion();
        const triggerCount = this.silenceDetection.triggerCount;
        
        // 最近の会話コンテキスト
        const recentContext = this.shortTermMemory.slice(-3)
            .map(m => m.text.substring(0, 50))
            .join(' ');
        
        // 感情とトリガー回数に応じたバリエーション
        const prompts = {
            // 初回の沈黙
            first: [
                'ねー、どうしたの？',
                'あのー、何か考えてる？',
                'ん？どうしたの？',
                'ちょっと、聴いてる？'
            ],
            // 2回目以降
            repeated: [
                'もしかして応答が大変？',
                'ちょっと寂しいな〜',
                '話しかけてほしいな〜',
                '暢でいいから話そうよ？'
            ],
            // 寂しい時
            lonely: [
                'ねー、一人で寂しくなっちゃった…',
                '誰かと話したいな〜',
                '構ってほしいな…'
            ],
            // 興味津々な時
            curious: [
                'あのさ、さっきの話の続き聖きたい！',
                'もっと教えてよ！',
                'それで、どうなったの？'
            ],
            // 元気な時
            happy: [
                'ねーねー、何か楽しいことしようよ！',
                '暴してないで話しよ〜！',
                'あはは、元気？'
            ]
        };
        
        // プロンプトを選択
        let selectedPrompts;
        
        if (triggerCount === 1) {
            selectedPrompts = prompts.first;
        } else if (dominant.emotion === 'sadness' && dominant.value >= 6) {
            selectedPrompts = prompts.lonely;
        } else if (dominant.emotion === 'curiosity' && dominant.value >= 6) {
            selectedPrompts = prompts.curious;
        } else if (dominant.emotion === 'joy' && dominant.value >= 6) {
            selectedPrompts = prompts.happy;
        } else {
            selectedPrompts = prompts.repeated;
        }
        
        // ランダムに選択
        const randomIndex = Math.floor(Math.random() * selectedPrompts.length);
        return selectedPrompts[randomIndex];
    }
    
    /**
     * フォールバック: AIチャットに送信
     */
    fallbackToAIChat(prompt) {
        // AIチャットの入力欄にテキストを設定して送信
        const chatInput = document.querySelector('#chat-input');
        const chatSend = document.querySelector('#chat-send');
        
        if (chatInput && chatSend) {
            // AI側からの発話として表示
            const chatLog = document.querySelector('#chat-messages, .chat-messages');
            if (chatLog) {
                const messageDiv = document.createElement('div');
                messageDiv.className = 'message ai';
                messageDiv.innerHTML = `<strong>🤖 AI:</strong> ${prompt}`;
                chatLog.appendChild(messageDiv);
                chatLog.scrollTop = chatLog.scrollHeight;
            }
            
            // 記録
            this.recordConversation('assistant', prompt, { source: 'silence_trigger' });
            
            console.log('✅ フォールバック: AIチャットに表示');
        }
    }
    
    /**
     * 沈黙検知設定を保存
     */
    saveSilenceSettings() {
        try {
            localStorage.setItem('emm_silence_detection', JSON.stringify({
                enabled: this.silenceDetection.enabled,
                timeout: this.silenceDetection.timeout
            }));
        } catch (e) {}
    }
    
    /**
     * 沈黙検知設定を読み込み
     */
    loadSilenceSettings() {
        try {
            const saved = localStorage.getItem('emm_silence_detection');
            if (saved) {
                const data = JSON.parse(saved);
                this.silenceDetection.timeout = data.timeout || 10;
                if (data.enabled) {
                    this.enableSilenceDetection(this.silenceDetection.timeout);
                }
            }
        } catch (e) {}
    }
    
    // ========================================
    // トラウマ管理
    // ========================================
    
    /**
     * トラウマを追加
     */
    addTrauma(traumaData) {
        const trauma = {
            id: Date.now(),
            title: traumaData.title || '無題のトラウマ',
            description: traumaData.description || '',
            affectedEmotions: traumaData.affectedEmotions || {},
            triggerWords: traumaData.triggerWords || [],
            desires: traumaData.desires || [],
            avoidances: traumaData.avoidances || [],
            intensity: Math.max(1, Math.min(10, traumaData.intensity || 5)),
            isActive: traumaData.isActive !== false,
            createdAt: new Date().toISOString()
        };
        
        this.traumas.push(trauma);
        
        // 上限チェック
        while (this.traumas.length > this.maxTraumas) {
            this.traumas.shift();
        }
        
        console.log(`🧠💔 トラウマ追加: ${trauma.title}`);
        
        if (this.onTraumaUpdate) {
            this.onTraumaUpdate(this.traumas);
        }
        
        this.saveToStorage();
        return trauma;
    }
    
    /**
     * トラウマを更新
     */
    updateTrauma(traumaId, updates) {
        const index = this.traumas.findIndex(t => t.id === traumaId);
        if (index === -1) return null;
        
        this.traumas[index] = {
            ...this.traumas[index],
            ...updates,
            updatedAt: new Date().toISOString()
        };
        
        console.log(`🧠💔 トラウマ更新: ${this.traumas[index].title}`);
        
        if (this.onTraumaUpdate) {
            this.onTraumaUpdate(this.traumas);
        }
        
        this.saveToStorage();
        return this.traumas[index];
    }
    
    /**
     * トラウマを削除
     */
    removeTrauma(traumaId) {
        const index = this.traumas.findIndex(t => t.id === traumaId);
        if (index === -1) return false;
        
        const removed = this.traumas.splice(index, 1)[0];
        console.log(`🧠💔 トラウマ削除: ${removed.title}`);
        
        if (this.onTraumaUpdate) {
            this.onTraumaUpdate(this.traumas);
        }
        
        this.saveToStorage();
        return true;
    }
    
    /**
     * トラウマの有効/無効を切り替え
     */
    toggleTrauma(traumaId) {
        const trauma = this.traumas.find(t => t.id === traumaId);
        if (trauma) {
            trauma.isActive = !trauma.isActive;
            console.log(`🧠💔 トラウマ ${trauma.isActive ? '有効化' : '無効化'}: ${trauma.title}`);
            
            if (this.onTraumaUpdate) {
                this.onTraumaUpdate(this.traumas);
            }
            
            this.saveToStorage();
        }
        return trauma;
    }
    
    /**
     * テキストがトラウマのトリガーに該当するかチェック
     */
    checkTraumaTriggers(text) {
        const triggeredTraumas = [];
        const lowerText = text.toLowerCase();
        
        for (const trauma of this.traumas) {
            if (!trauma.isActive) continue;
            
            for (const trigger of trauma.triggerWords) {
                if (lowerText.includes(trigger.toLowerCase())) {
                    triggeredTraumas.push({
                        trauma: trauma,
                        trigger: trigger
                    });
                    break;
                }
            }
        }
        
        return triggeredTraumas;
    }
    
    /**
     * トラウマがトリガーされた時の感情変化を適用
     */
    applyTraumaEffect(trauma) {
        if (!trauma.isActive) return;
        
        const intensityFactor = trauma.intensity / 10;
        
        for (const [emotion, change] of Object.entries(trauma.affectedEmotions)) {
            const scaledChange = change * intensityFactor;
            this.adjustEmotion(emotion, scaledChange);
        }
        
        console.log(`🧠💔 トラウマ発動: ${trauma.title} (強度: ${trauma.intensity})`);
    }
    
    /**
     * アクティブなトラウマを取得
     */
    getActiveTraumas() {
        return this.traumas.filter(t => t.isActive);
    }
    
    /**
     * 全ての欲求を集約して取得
     */
    getAllDesires() {
        const desires = [];
        for (const trauma of this.getActiveTraumas()) {
            desires.push(...trauma.desires);
        }
        return [...new Set(desires)]; // 重複削除
    }
    
    /**
     * 全ての回避事項を集約して取得
     */
    getAllAvoidances() {
        const avoidances = [];
        for (const trauma of this.getActiveTraumas()) {
            avoidances.push(...trauma.avoidances);
        }
        return [...new Set(avoidances)]; // 重複削除
    }
    
    // ========================================
    // 会話記録
    // ========================================
    
    /**
     * 会話を記録する（ユーザー発話 or AI発話）
     */
    recordConversation(role, text, metadata = {}) {
        // 沈黙タイマーリセット
        this.recordActivity();
        
        const entry = {
            id: Date.now(),
            role: role, // 'user' or 'assistant'
            text: text,
            timestamp: new Date().toISOString(),
            emotions: { ...this.emotions }, // スナップショット
            ...metadata
        };
        
        this.shortTermMemory.push(entry);
        
        // 上限を超えたら古いものを削除
        while (this.shortTermMemory.length > this.maxShortTermMemory) {
            const removed = this.shortTermMemory.shift();
            // 重要な会話は長期記憶に移動
            if (this.isImportantConversation(removed)) {
                this.addToLongTermMemory(removed);
            }
        }
        
        console.log(`🧠 会話記録: [${role}] ${text.substring(0, 50)}...`);
        
        // コールバック
        if (this.onMemoryUpdate) {
            this.onMemoryUpdate(this.shortTermMemory, this.longTermMemory);
        }
        
        // 自動保存
        this.saveToStorage();
        
        return entry;
    }
    
    /**
     * 重要な会話かどうか判定
     */
    isImportantConversation(entry) {
        const text = entry.text.toLowerCase();
        
        // 重要キーワード
        const importantKeywords = [
            '名前', '好き', '嫌い', '趣味', '仕事', '家族',
            '約束', '覚えて', '忘れないで', '大切', '重要',
            'ありがとう', 'ごめん', '嬉しい', '悲しい'
        ];
        
        // キーワードマッチ
        for (const keyword of importantKeywords) {
            if (text.includes(keyword)) return true;
        }
        
        // 感情が高い時の会話
        const emotions = entry.emotions || {};
        if (emotions.joy >= 8 || emotions.anger >= 7 || 
            emotions.sadness >= 7 || emotions.excitement >= 8) {
            return true;
        }
        
        return false;
    }
    
    /**
     * 長期記憶に追加
     */
    addToLongTermMemory(entry) {
        const memoryEntry = {
            ...entry,
            addedToLongTerm: new Date().toISOString(),
            importance: this.calculateImportance(entry)
        };
        
        this.longTermMemory.push(memoryEntry);
        
        // 上限を超えたら重要度の低いものから削除
        while (this.longTermMemory.length > this.maxLongTermMemory) {
            this.longTermMemory.sort((a, b) => (b.importance || 0) - (a.importance || 0));
            this.longTermMemory.pop();
        }
        
        console.log(`🧠 長期記憶に追加: ${entry.text.substring(0, 30)}...`);
    }
    
    /**
     * 重要度を計算
     */
    calculateImportance(entry) {
        let score = 0;
        const text = entry.text;
        
        // 長さボーナス
        if (text.length > 50) score += 1;
        if (text.length > 100) score += 1;
        
        // 感情の強さ
        const emotions = entry.emotions || {};
        const maxEmotion = Math.max(
            emotions.joy || 0, emotions.anger || 0, 
            emotions.sadness || 0, emotions.excitement || 0
        );
        score += maxEmotion / 2;
        
        // ユーザー発話はより重要
        if (entry.role === 'user') score += 2;
        
        return score;
    }
    
    // ========================================
    // 感情管理
    // ========================================
    
    /**
     * 感情を更新
     */
    setEmotion(emotionType, value) {
        if (this.emotions[emotionType] !== undefined) {
            const oldValue = this.emotions[emotionType];
            this.emotions[emotionType] = Math.max(0, Math.min(10, value));
            
            console.log(`🧠 感情更新: ${this.emotionLabels[emotionType]} ${oldValue} → ${this.emotions[emotionType]}`);
            
            if (this.onEmotionChange) {
                this.onEmotionChange(emotionType, this.emotions[emotionType], oldValue);
            }
            
            this.saveToStorage();
        }
    }
    
    /**
     * 感情を調整（相対値）
     */
    adjustEmotion(emotionType, delta) {
        if (this.emotions[emotionType] !== undefined) {
            this.setEmotion(emotionType, this.emotions[emotionType] + delta);
        }
    }
    
    /**
     * 複数の感情を一括更新
     */
    updateEmotions(emotionChanges) {
        for (const [emotion, value] of Object.entries(emotionChanges)) {
            if (typeof value === 'number') {
                this.setEmotion(emotion, value);
            }
        }
    }
    
    /**
     * 感情を自然減衰させる（時間経過で中間値に戻る）
     */
    decayEmotions(factor = 0.1) {
        for (const emotion of Object.keys(this.emotions)) {
            const current = this.emotions[emotion];
            const target = emotion === 'calm' ? 7 : 5; // calmは高め、他は中間
            const diff = target - current;
            this.emotions[emotion] = current + diff * factor;
        }
    }
    
    /**
     * 主要な感情を取得
     */
    getDominantEmotion() {
        let maxEmotion = 'calm';
        let maxValue = 0;
        
        for (const [emotion, value] of Object.entries(this.emotions)) {
            if (emotion === 'calm' || emotion === 'tired') continue;
            if (value > maxValue && value > 5) {
                maxValue = value;
                maxEmotion = emotion;
            }
        }
        
        return { emotion: maxEmotion, value: maxValue };
    }
    
    // ========================================
    // AI分析（感情・要約）
    // ========================================
    
    /**
     * 会話から感情を分析してLLMで更新
     */
    async analyzeEmotionFromText(text, role = 'user') {
        if (this.isAnalyzing || !this.apiKey) return;
        
        this.isAnalyzing = true;
        
        try {
            const prompt = `以下の${role === 'user' ? 'ユーザー' : 'AI'}の発言を分析し、VRMキャラクターの感情変化をJSON形式で出力してください。

発言: "${text}"

現在の感情状態:
${JSON.stringify(this.emotions, null, 2)}

出力形式（変化する感情のみ、-3〜+3の相対値で）:
{
  "changes": { "joy": 1, "excitement": 2 },
  "reason": "理由を短く"
}

感情の種類: joy(喜び), anger(怒り), sadness(哀しみ), fun(楽しさ), excitement(興奮), calm(安心), tired(疲れ), disappointment(失望), fear(恐れ), affection(好感度), curiosity(好奇心)`;

            const response = await this.callLLM(prompt);
            
            // JSONを抽出
            const jsonMatch = response.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                const result = JSON.parse(jsonMatch[0]);
                
                if (result.changes) {
                    for (const [emotion, delta] of Object.entries(result.changes)) {
                        this.adjustEmotion(emotion, delta);
                    }
                    console.log(`🧠 感情分析完了: ${result.reason || ''}`);
                }
            }
            
        } catch (error) {
            console.error('🧠 感情分析エラー:', error);
        } finally {
            this.isAnalyzing = false;
        }
    }
    
    /**
     * 会話要約を生成
     */
    async generateSummary() {
        if (this.shortTermMemory.length < 3 || !this.apiKey) return;
        
        const now = Date.now();
        if (now - this.lastSummaryTime < this.summaryInterval) return;
        
        try {
            const recentConversations = this.shortTermMemory
                .slice(-10)
                .map(e => `${e.role === 'user' ? 'ユーザー' : 'AI'}: ${e.text}`)
                .join('\n');
            
            const prompt = `以下の会話を3文以内で要約してください。重要な情報（名前、好み、約束など）があれば含めてください。

${recentConversations}

要約:`;

            const summary = await this.callLLM(prompt);
            this.conversationSummary = summary.trim();
            this.lastSummaryTime = now;
            
            console.log(`🧠 要約更新: ${this.conversationSummary}`);
            
            if (this.onSummaryUpdate) {
                this.onSummaryUpdate(this.conversationSummary);
            }
            
            this.saveToStorage();
            
        } catch (error) {
            console.error('🧠 要約生成エラー:', error);
        }
    }
    
    /**
     * LLM APIを呼び出す
     */
    async callLLM(prompt) {
        if (!this.apiKey) throw new Error('APIキーが設定されていません');
        
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.apiKey}`
            },
            body: JSON.stringify({
                model: this.analyzerModel,
                messages: [
                    { role: 'system', content: 'あなたは感情分析と要約の専門家です。簡潔に回答してください。' },
                    { role: 'user', content: prompt }
                ],
                max_tokens: 300,
                temperature: 0.3
            })
        });
        
        if (!response.ok) {
            throw new Error(`API Error: ${response.status}`);
        }
        
        const data = await response.json();
        return data.choices[0].message.content;
    }
    
    // ========================================
    // Grok Voice用のプロンプト生成
    // ========================================
    
    /**
     * Grok Voiceに渡すシステムプロンプトを生成
     */
    generateGrokSystemPrompt(basePrompt = '') {
        const dominant = this.getDominantEmotion();
        
        let prompt = basePrompt || 'あなたは可愛いVRMキャラクターです。';
        
        // 感情状態を追加
        prompt += `\n\n【現在の感情状態】\n`;
        prompt += `主な感情: ${this.emotionEmojis[dominant.emotion]} ${this.emotionLabels[dominant.emotion]}（${dominant.value}/10）\n`;
        
        // 高い感情をリスト
        const highEmotions = Object.entries(this.emotions)
            .filter(([_, v]) => v >= 7)
            .map(([e, v]) => `${this.emotionEmojis[e]}${this.emotionLabels[e]}(${v})`)
            .join(', ');
        
        if (highEmotions) {
            prompt += `高まっている感情: ${highEmotions}\n`;
        }
        
        // 会話要約があれば追加
        if (this.conversationSummary) {
            prompt += `\n【これまでの会話】\n${this.conversationSummary}\n`;
        }
        
        // 長期記憶から重要な情報
        if (this.longTermMemory.length > 0) {
            const importantMemories = this.longTermMemory
                .slice(-5)
                .map(m => `・${m.text.substring(0, 50)}`)
                .join('\n');
            
            prompt += `\n【覚えていること】\n${importantMemories}\n`;
        }
        
        // ユーザー情報
        if (this.userProfile.name) {
            prompt += `\n【ユーザー情報】\n`;
            prompt += `名前: ${this.userProfile.name}\n`;
            
            if (this.userProfile.interests.length > 0) {
                prompt += `興味: ${this.userProfile.interests.join(', ')}\n`;
            }
        }
        
        // トラウマ・内面の情報
        const activeTraumas = this.getActiveTraumas();
        if (activeTraumas.length > 0) {
            prompt += `\n【心の傷・過去のトラウマ】\n`;
            for (const trauma of activeTraumas) {
                prompt += `・${trauma.title}（強度:${trauma.intensity}/10）: ${trauma.description}\n`;
            }
            
            const desires = this.getAllDesires();
            if (desires.length > 0) {
                prompt += `\n【心の奥にある欲求】\n`;
                prompt += desires.map(d => `・${d}`).join('\n') + '\n';
            }
            
            const avoidances = this.getAllAvoidances();
            if (avoidances.length > 0) {
                prompt += `\n【避けたいこと・苦手なこと】\n`;
                prompt += avoidances.map(a => `・${a}`).join('\n') + '\n';
            }
        }
        
        // 感情に応じた話し方の指示
        prompt += `\n【話し方】\n`;
        if (dominant.emotion === 'joy' && dominant.value >= 7) {
            prompt += '嬉しそうに、明るく話してください。\n';
        } else if (dominant.emotion === 'sadness' && dominant.value >= 6) {
            prompt += '少し寂しそうに、しんみりと話してください。\n';
        } else if (dominant.emotion === 'anger' && dominant.value >= 6) {
            prompt += '少しイライラした感じで話してください。\n';
        } else if (dominant.emotion === 'excitement' && dominant.value >= 7) {
            prompt += 'ワクワクして、テンション高めに話してください。\n';
        } else {
            prompt += '自然に、フレンドリーに話してください。\n';
        }
        
        prompt += '日本語で短く（50〜120文字）返答してください。';
        
        return prompt;
    }
    
    /**
     * 直近の会話コンテキストを取得
     */
    getRecentContext(maxEntries = 5) {
        return this.shortTermMemory
            .slice(-maxEntries)
            .map(e => ({
                role: e.role,
                content: e.text
            }));
    }
    
    // ========================================
    // ユーザー情報学習
    // ========================================
    
    /**
     * ユーザー名を学習
     */
    learnUserName(name) {
        this.userProfile.name = name;
        console.log(`🧠 ユーザー名を学習: ${name}`);
        this.saveToStorage();
    }
    
    /**
     * ユーザーの興味を学習
     */
    learnUserInterest(interest) {
        if (!this.userProfile.interests.includes(interest)) {
            this.userProfile.interests.push(interest);
            console.log(`🧠 興味を学習: ${interest}`);
            this.saveToStorage();
        }
    }
    
    /**
     * 重要な事実を学習
     */
    learnImportantFact(fact) {
        if (!this.userProfile.importantFacts.includes(fact)) {
            this.userProfile.importantFacts.push(fact);
            if (this.userProfile.importantFacts.length > 20) {
                this.userProfile.importantFacts.shift();
            }
            console.log(`🧠 重要な事実を学習: ${fact}`);
            this.saveToStorage();
        }
    }
    
    // ========================================
    // 永続化
    // ========================================
    
    saveToStorage() {
        try {
            const data = {
                version: this.version,
                emotions: this.emotions,
                shortTermMemory: this.shortTermMemory.slice(-this.maxShortTermMemory),
                longTermMemory: this.longTermMemory,
                conversationSummary: this.conversationSummary,
                userProfile: this.userProfile,
                traumas: this.traumas,
                savedAt: new Date().toISOString()
            };
            
            localStorage.setItem('emotion_memory_manager', JSON.stringify(data));
            
        } catch (error) {
            console.warn('🧠 保存エラー:', error);
        }
    }
    
    loadFromStorage() {
        try {
            const saved = localStorage.getItem('emotion_memory_manager');
            if (saved) {
                const data = JSON.parse(saved);
                
                if (data.emotions) this.emotions = { ...this.emotions, ...data.emotions };
                if (data.shortTermMemory) this.shortTermMemory = data.shortTermMemory;
                if (data.longTermMemory) this.longTermMemory = data.longTermMemory;
                if (data.conversationSummary) this.conversationSummary = data.conversationSummary;
                if (data.userProfile) this.userProfile = { ...this.userProfile, ...data.userProfile };
                if (data.traumas) this.traumas = data.traumas;
                
                console.log('🧠 データ読み込み完了');
            }
            
            // 沈黙検知設定も読み込み
            this.loadSilenceSettings();
            
        } catch (error) {
            console.warn('🧠 読み込みエラー:', error);
        }
    }
    
    /**
     * 全データをリセット
     */
    reset() {
        this.emotions = {
            joy: 5, anger: 0, sadness: 0, fun: 5, excitement: 3,
            calm: 7, tired: 2, disappointment: 0, fear: 0,
            affection: 5, curiosity: 5
        };
        this.shortTermMemory = [];
        this.longTermMemory = [];
        this.conversationSummary = '';
        this.userProfile = { name: null, interests: [], preferences: [], importantFacts: [] };
        this.traumas = [];
        
        localStorage.removeItem('emotion_memory_manager');
        
        console.log('🧠 データリセット完了');
        
        if (this.onEmotionChange) this.onEmotionChange(null, null, null);
        if (this.onMemoryUpdate) this.onMemoryUpdate([], []);
    }
    
    // ========================================
    // デバッグ・統計
    // ========================================
    
    getStats() {
        return {
            shortTermMemoryCount: this.shortTermMemory.length,
            longTermMemoryCount: this.longTermMemory.length,
            dominantEmotion: this.getDominantEmotion(),
            hasSummary: !!this.conversationSummary,
            userName: this.userProfile.name,
            interestsCount: this.userProfile.interests.length,
            traumaCount: this.traumas.length,
            activeTraumaCount: this.getActiveTraumas().length
        };
    }
    
    debugPrint() {
        console.log('=== EmotionMemoryManager Debug ===');
        console.log('感情:', this.emotions);
        console.log('短期記憶:', this.shortTermMemory.length, '件');
        console.log('長期記憶:', this.longTermMemory.length, '件');
        console.log('要約:', this.conversationSummary);
        console.log('ユーザー:', this.userProfile);
        console.log('================================');
    }
}

// グローバルに公開
window.EmotionMemoryManager = EmotionMemoryManager;

// シングルトンインスタンス
window.emotionMemoryManager = new EmotionMemoryManager();

console.log('🧠 EmotionMemoryManager グローバル登録完了');
