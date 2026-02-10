// ========================================
// DialogueDirector - 会話の監督（順番・同期を管理）
// ハイブリッド方式: 監督は順番と情報共有だけ
// ========================================

export class DialogueDirector {
    constructor() {
        // キャラクター管理
        this.characters = new Map(); // id -> CharacterUnit
        this.turnOrder = []; // ターン順序 (キャラID配列)
        
        // 会話状態
        this.conversationHistory = [];
        this.maxHistoryLength = 20;
        this.currentTurnIndex = 0;
        this.currentSpeakerId = null;
        
        // 動作状態
        this.isRunning = false;
        this.isPaused = false;
        
        // 設定
        this.turnMode = 'round-robin'; // round-robin | dynamic
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
        
        console.log('🎬 DialogueDirector作成');
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
            if (char.setConversationContext) {
                char.setConversationContext(context);
            }
        });
        console.log('🎬 会話コンテキスト設定完了');
    }
    
    /**
     * キャラクターを追加
     */
    addCharacter(unit) {
        this.characters.set(unit.id, unit);
        this.turnOrder.push(unit.id);
        
        // キャラクターのコールバックを設定
        unit.onSpeakStart = (char) => {
            if (this.onSpeechStart) {
                this.onSpeechStart(char);
            }
        };
        
        unit.onSpeakEnd = (char) => {
            if (this.onSpeechEnd) {
                this.onSpeechEnd(char);
            }
        };
        
        console.log(`➕ キャラクター追加: ${unit.name} (${unit.id})`);
        console.log(`   現在のキャラクター数: ${this.characters.size}`);
    }
    
    /**
     * キャラクターを削除
     */
    removeCharacter(id) {
        const unit = this.characters.get(id);
        if (!unit) {
            console.warn(`⚠️ キャラクター ${id} が見つかりません`);
            return false;
        }
        
        this.characters.delete(id);
        this.turnOrder = this.turnOrder.filter(cid => cid !== id);
        
        console.log(`➖ キャラクター削除: ${unit.name} (${id})`);
        console.log(`   現在のキャラクター数: ${this.characters.size}`);
        
        return true;
    }
    
    /**
     * キャラクターを取得
     */
    getCharacter(id) {
        return this.characters.get(id);
    }
    
    /**
     * 全キャラクターを取得
     */
    getAllCharacters() {
        return Array.from(this.characters.values());
    }
    
    /**
     * ターン順序を設定
     */
    setTurnOrder(order) {
        // 有効なIDのみフィルタ
        this.turnOrder = order.filter(id => this.characters.has(id));
        console.log(`🔄 ターン順序更新: ${this.turnOrder.map(id => this.characters.get(id).name).join(' → ')}`);
    }
    
    /**
     * 会話を開始
     */
    async start(topic = '') {
        if (this.characters.size === 0) {
            console.warn('⚠️ キャラクターが登録されていません');
            return;
        }
        
        if (this.isRunning) {
            console.warn('⚠️ 会話は既に進行中です');
            return;
        }
        
        this.isRunning = true;
        this.isPaused = false;
        this.topic = topic;
        this.currentTurnIndex = 0;
        this.currentTurnCount = 0; // ★ ターン数リセット
        this.conversationHistory = [];
        
        console.log(`🎬 会話開始: "${topic || '自由会話'}"`);
        console.log(`   参加者: ${this.turnOrder.map(id => this.characters.get(id).name).join(', ')}`);
        
        if (this.onConversationStart) {
            this.onConversationStart(topic);
        }
        
        // 最初の話者のターン
        const firstSpeakerId = this.turnOrder[0];
        await this.runTurn(firstSpeakerId, topic, 'initial');
    }
    
    /**
     * 会話を停止
     */
    stop() {
        this.isRunning = false;
        this.isPaused = false;
        this.currentSpeakerId = null;
        
        console.log('🛑 会話停止');
        
        if (this.onConversationEnd) {
            this.onConversationEnd();
        }
    }
    
    /**
     * 会話を一時停止
     */
    pause() {
        this.isPaused = true;
        console.log('⏸️ 会話一時停止');
    }
    
    /**
     * 会話を再開
     */
    resume() {
        if (this.isPaused) {
            this.isPaused = false;
            console.log('▶️ 会話再開');
        }
    }
    
    /**
     * ターンを実行
     */
    async runTurn(speakerId, context, type) {
        if (!this.isRunning || this.isPaused) return;
        
        // ★ ターン数制限チェック
        if (this.maxTurns && this.currentTurnCount >= this.maxTurns) {
            console.log(`🏁 ターン数制限に達しました (${this.currentTurnCount}/${this.maxTurns})`);
            this.stop();
            return;
        }
        
        const speaker = this.characters.get(speakerId);
        if (!speaker) {
            console.error(`❌ 話者 ${speakerId} が見つかりません`);
            return;
        }
        
        this.currentSpeakerId = speakerId;
        this.currentTurnCount++; // ★ ターン数カウント
        
        console.log(`\n👤 ${speaker.name}のターン (${type}) [ターン ${this.currentTurnCount}${this.maxTurns ? '/' + this.maxTurns : ''}]`);
        
        if (this.onTurnStart) {
            this.onTurnStart(speaker, type);
        }
        
        // 他のキャラクターを聞く姿勢に
        this.characters.forEach((char, id) => {
            if (id !== speakerId) {
                char.setListening();
            }
        });
        
        // プロンプトを構築
        const prompt = this.buildPrompt(speakerId, context, type);
        
        // 応答を生成
        const result = await speaker.generateResponse(prompt);
        
        if (!result || !result.text) {
            console.warn(`⚠️ ${speaker.name}: 応答なし`);
            this.currentSpeakerId = null;
            return;
        }
        
        // 会話履歴に追加
        this.conversationHistory.push({
            speakerId: speakerId,
            speakerName: speaker.name,
            text: result.text,
            timestamp: Date.now()
        });
        
        // 履歴が長すぎる場合はトリム
        if (this.conversationHistory.length > this.maxHistoryLength) {
            this.conversationHistory = this.conversationHistory.slice(-this.maxHistoryLength);
        }
        
        // 発話（完了まで待機）
        await speaker.speak(result.text, result.emotion);
        
        if (this.onTurnEnd) {
            this.onTurnEnd(speaker, result.text);
        }
        
        this.currentSpeakerId = null;
        
        // 次のターンへ
        if (this.isRunning && !this.isPaused) {
            const nextSpeakerId = this.getNextSpeaker(speakerId);
            
            // 少し間をおいてから次のターン
            await this.wait(500);
            
            await this.runTurn(nextSpeakerId, result.text, 'response');
        }
    }
    
    /**
     * 次の話者を決定
     */
    getNextSpeaker(currentSpeakerId) {
        if (this.turnMode === 'round-robin') {
            // 順番制: A → B → C → A → ...
            const currentIndex = this.turnOrder.indexOf(currentSpeakerId);
            const nextIndex = (currentIndex + 1) % this.turnOrder.length;
            return this.turnOrder[nextIndex];
        } else {
            // 動的制: 直前の発言内容や状況で決定
            return this.decideDynamicNextSpeaker(currentSpeakerId);
        }
    }
    
    /**
     * 動的に次の話者を決定
     */
    decideDynamicNextSpeaker(currentSpeakerId) {
        const lastMessage = this.conversationHistory[this.conversationHistory.length - 1];
        const others = this.turnOrder.filter(id => id !== currentSpeakerId);
        
        if (!lastMessage || others.length === 0) {
            return others[0] || currentSpeakerId;
        }
        
        // 名前が呼ばれていたらその人
        for (const id of others) {
            const char = this.characters.get(id);
            if (lastMessage.text.includes(char.name)) {
                console.log(`   → 名前で指名: ${char.name}`);
                return id;
            }
        }
        
        // 最近発言していない人を優先
        const recentSpeakers = this.conversationHistory.slice(-2).map(h => h.speakerId);
        const notRecentSpeaker = others.find(id => !recentSpeakers.includes(id));
        if (notRecentSpeaker) {
            console.log(`   → 最近発言なし: ${this.characters.get(notRecentSpeaker).name}`);
            return notRecentSpeaker;
        }
        
        // ランダム
        const randomSpeaker = others[Math.floor(Math.random() * others.length)];
        console.log(`   → ランダム: ${this.characters.get(randomSpeaker).name}`);
        return randomSpeaker;
    }
    
    /**
     * プロンプトを構築
     */
    buildPrompt(speakerId, context, type) {
        const speaker = this.characters.get(speakerId);
        
        // 他のキャラクターの紹介
        const others = this.turnOrder
            .filter(id => id !== speakerId)
            .map(id => {
                const char = this.characters.get(id);
                return `・${char.name}: ${char.personality}`;
            })
            .join('\n');
        
        // 直近の会話履歴
        const recentHistory = this.conversationHistory
            .slice(-8)
            .map(h => `${h.speakerName}: ${h.text}`)
            .join('\n');
        
        if (type === 'initial') {
            return `あなたは「${speaker.name}」です。

【会話仲間】
${others}

【トピック】
${context || '自由に会話を始めてください'}

このトピックについて、あなたから会話を始めてください。
2〜3文程度で簡潔に。他の人が反応しやすい内容で。`;
        }
        
        // 直前の発言者
        const lastSpeaker = this.conversationHistory[this.conversationHistory.length - 1];
        const lastSpeakerName = lastSpeaker ? lastSpeaker.speakerName : '誰か';
        
        const participantCount = this.characters.size;
        const conversationType = participantCount === 2 ? '2人の会話' : `${participantCount}人の会話`;
        
        return `あなたは「${speaker.name}」です。

【会話仲間】
${others}

【これまでの会話】
${recentHistory || '(会話開始)'}

【${lastSpeakerName}の直前の発言】
「${context}」

この${conversationType}の流れを踏まえて、あなたのキャラクターらしく反応してください。
- ツッコミ、質問、同意、反論、話題の展開など自由に
- 2〜3文程度で簡潔に
- 必要なら他のキャラの名前を呼んで話を振ってもOK`;
    }
    
    /**
     * 全キャラクターの会話履歴をクリア
     */
    clearAllHistory() {
        this.conversationHistory = [];
        this.characters.forEach(char => {
            char.clearHistory();
        });
        console.log('🗑️ 全会話履歴クリア');
    }
    
    /**
     * 待機
     */
    wait(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    
    /**
     * 設定をJSON形式でエクスポート
     */
    toJSON() {
        return {
            turnOrder: this.turnOrder,
            turnMode: this.turnMode,
            characters: this.turnOrder.map(id => this.characters.get(id).toJSON())
        };
    }
    
    /**
     * 現在の会話履歴を取得
     */
    getConversationHistory() {
        return this.conversationHistory.map(h => ({
            speaker: h.speakerName,
            text: h.text,
            timestamp: h.timestamp
        }));
    }
}
