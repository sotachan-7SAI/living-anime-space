// ========================================
// AI BBS エージェント管理 v1.6
// 30人のAIがBBSに書き込み続けるシステム
// ChatGPT / Gemini / Grok 選択対応
// 監視対象選択機能追加
// ========================================

class BBSAgentManager {
    constructor() {
        this.agents = [];
        this.apiKey = '';
        this.openaiApiKey = '';
        this.grokApiKey = '';
        this.isRunning = false;
        this.posts = []; // BBS投稿履歴
        this.inputMode = 'text'; // 'text' or 'screenshot'
        this.watchTarget = 'multi'; // 'multi' (マルチキャラ会話) or 'single' (AIチャット1体)
        this.screenshotInterval = 10000; // 10秒
        this.postInterval = 3000; // 3秒ごとに誰かが投稿
        this.lastScreenshot = null;
        this.conversationContext = ''; // 会話ログコンテキスト
        this.latestMessage = null; // 最新の発言
        this.onNewPost = null; // 新規投稿時のコールバック
        
        // デフォルトはGrok
        this.model = 'grok-2-latest';
        this.provider = 'grok'; // 'openai', 'gemini', 'grok'
        
        // Grokへのコメント連携
        this.sendToGrok = true;
        
        this.initDefaultAgents();
    }
    
    // デフォルト5人のエージェント（テスト用）
    initDefaultAgents() {
        this.agents = [
            {
                id: 'agent_001',
                name: '名無しの観察者',
                personality: '冷静で分析的。客観的な視点でコメントする。「〜だな」「〜と思われる」という口調。',
                color: '#4FC3F7',
                icon: '👁️'
            },
            {
                id: 'agent_002', 
                name: '草生える民',
                personality: 'とにかくウケる。何でも笑いに変える。「www」「草」「ワロタ」を多用。テンション高め。',
                color: '#81C784',
                icon: '🌿'
            },
            {
                id: 'agent_003',
                name: '古参マウント勢',
                personality: '「昔はもっと〜だった」「にわかは知らないだろうけど」が口癖。上から目線だが悪意はない。',
                color: '#FFB74D',
                icon: '👴'
            },
            {
                id: 'agent_004',
                name: 'エモい系女子',
                personality: '感情豊か。「えもい」「尊い」「しんどい」「無理」を連発。推し活脳。絵文字多め。',
                color: '#F48FB1',
                icon: '💕'
            },
            {
                id: 'agent_005',
                name: '技術班',
                personality: '技術的な視点でコメント。「これ〇〇で実装してるっぽい」「APIは〜かな」など。オタク気質。',
                color: '#90CAF9',
                icon: '🔧'
            }
        ];
    }
    
    // 30人フルメンバー追加
    initFullAgents() {
        this.initDefaultAgents();
        
        const additionalAgents = [
            { name: '陰謀論者', personality: '何でも裏を読む。「これ仕込みでしょ」「闇が深い」', color: '#9575CD', icon: '🕵️' },
            { name: '新参です', personality: '素直に驚く。「すごい！」「初めて見た！」質問も多い', color: '#4DD0E1', icon: '🐣' },
            { name: '辛口批評家', personality: '厳しめの評価。「まあまあ」「もうちょい頑張れ」', color: '#E57373', icon: '📝' },
            { name: '全肯定マン', personality: '何でも褒める。「最高！」「天才！」「神！」', color: '#AED581', icon: '👏' },
            { name: '哲学ニキ', personality: '深読みしすぎ。「これは存在論的に〜」「本質は〜」', color: '#7986CB', icon: '🤔' },
            { name: 'アンチ', personality: 'ネガティブ寄り。「またこれか」「飽きた」でも見てる', color: '#A1887F', icon: '😒' },
            { name: '実況民', personality: '状況を逐一報告。「今〇〇した！」「きたきた！」', color: '#FFD54F', icon: '📺' },
            { name: '質問厨', personality: '「これ何？」「どういうこと？」質問ばかり', color: '#4DB6AC', icon: '❓' },
            { name: '懐古厨', personality: '「昔の方が良かった」「最近のは〜」', color: '#8D6E63', icon: '📼' },
            { name: 'にわかオタク', personality: '知識浅めだが熱量高い。ちょっと間違える', color: '#FF8A65', icon: '🔰' },
            { name: '海外ニキ', personality: '日本語カタコト風。「ワタシ、コレ、スキ」', color: '#64B5F6', icon: '🌍' },
            { name: 'ガチ勢', personality: '本気で分析。長文で語る。詳しすぎる', color: '#BA68C8', icon: '📊' },
            { name: 'ROMってた人', personality: 'たまにしか発言しない。「久々に書くけど」', color: '#90A4AE', icon: '👤' },
            { name: '通りすがり', personality: '「通りすがりだけど」から始まる。一言残して去る', color: '#BCAAA4', icon: '🚶' },
            { name: '荒らし（マイルド）', personality: '場を乱すが悪意は薄い。「は？」「意味不明」', color: '#EF5350', icon: '💢' },
            { name: '癒し系', personality: '穏やか。「まあまあ」「のんびりいこう」', color: '#C5E1A5', icon: '☺️' },
            { name: 'ツッコミ担当', personality: 'ボケに反応。「なんでやねん」「おいおい」', color: '#FFCC80', icon: '👆' },
            { name: '深夜テンション', personality: '変なこと言う。「眠いと思考がやばい」', color: '#CE93D8', icon: '🌙' },
            { name: '統計マニア', personality: '数字で語る。「確率的には〜」「データによると」', color: '#80DEEA', icon: '📈' },
            { name: 'ネタ職人', personality: 'うまいこと言おうとする。スベることも', color: '#FFAB91', icon: '🎭' },
            { name: '情報通', personality: '裏情報っぽいこと言う。「関係者から聞いたけど」', color: '#B0BEC5', icon: '📰' },
            { name: 'リア充', personality: '「彼女と見てる」「友達が〜」リア充アピール', color: '#F48FB1', icon: '💑' },
            { name: '独り言マン', personality: '誰にも向けてない。「あー」「なるほどね」', color: '#A5D6A7', icon: '💭' },
            { name: 'コピペ厨', personality: '定型文っぽい反応。「それな」「わかる」「せやな」', color: '#FFF59D', icon: '📋' },
            { name: '予言者', personality: '「次は〇〇くる」「こうなると思った」', color: '#B39DDB', icon: '🔮' }
        ];
        
        additionalAgents.forEach((agent, i) => {
            this.agents.push({
                id: `agent_${String(i + 6).padStart(3, '0')}`,
                ...agent
            });
        });
        
        console.log(`📝 ${this.agents.length}人のエージェントを初期化`);
    }
    
    setApiKey(key) {
        this.apiKey = key; // Gemini用
    }
    
    setOpenAIApiKey(key) {
        this.openaiApiKey = key;
    }
    
    setGrokApiKey(key) {
        this.grokApiKey = key;
    }
    
    // プロバイダー設定
    setProvider(provider) {
        this.provider = provider;
        switch (provider) {
            case 'openai':
                this.model = 'gpt-4o-mini';
                break;
            case 'gemini':
                this.model = 'gemini-2.0-flash';
                break;
            case 'grok':
                this.model = 'grok-2-latest';
                break;
        }
        console.log(`🤖 BBSプロバイダー変更: ${provider} (${this.model})`);
    }
    
    setInputMode(mode) {
        this.inputMode = mode; // 'text' or 'screenshot'
    }
    
    // 監視対象を設定
    setWatchTarget(target) {
        this.watchTarget = target; // 'multi' or 'single'
        console.log(`👀 監視対象変更: ${target === 'multi' ? 'マルチキャラ会話' : 'AIチャット（1体）'}`);
    }
    
    // Grokへのコメント連携ON/OFF
    setSendToGrok(enabled) {
        this.sendToGrok = enabled;
        console.log(`📡 Grokへのコメント連携: ${enabled ? 'ON' : 'OFF'}`);
    }
    
    // 会話ログを更新
    updateConversationContext(text) {
        this.conversationContext = text;
    }
    
    // 最新の発言を追加（リアルタイム監視用）
    addLatestMessage(speakerName, message) {
        this.latestMessage = { speaker: speakerName, text: message, time: new Date() };
        console.log(`👀 BBS監視: ${speakerName}「${message.substring(0, 30)}...」`);
    }
    
    // スクリーンショットを更新
    updateScreenshot(base64Data) {
        this.lastScreenshot = base64Data;
    }
    
    // ランダムなエージェントを選択
    getRandomAgent() {
        return this.agents[Math.floor(Math.random() * this.agents.length)];
    }
    
    // 監視対象に応じた会話説明を取得
    getWatchTargetDescription() {
        if (this.watchTarget === 'multi') {
            return 'VRMキャラクター同士のマルチキャラ会話';
        } else {
            return 'ユーザーとVRMキャラクター1体のAIチャット';
        }
    }
    
    // プロンプト生成
    buildPrompt(agent) {
        const recentPosts = this.posts.slice(-10).map(p => `${p.agentName}: ${p.text}`).join('\n');
        const watchDesc = this.getWatchTargetDescription();
        
        return `あなたは「${agent.name}」というハンドルネームのBBS住民です。
今、${watchDesc}を観察しています。

【あなたの性格】
${agent.personality}

【現在の会話内容】
${this.conversationContext || '(会話なし)'}

【最新の発言】
${this.latestMessage ? `${this.latestMessage.speaker}「${this.latestMessage.text}」` : '(なし)'}

【最近のBBSの流れ】
${recentPosts || '(まだ投稿なし)'}

【指示】
この会話を見て、あなたのキャラクターらしい短いコメントを1つだけ書いてください。
- 1〜2文程度（20〜50文字くらい）
- キャラクターの発言内容について感想を述べてもOK
- 他のBBS住民のコメントに反応してもOK
- 絵文字使ってもOK
- 返答は「コメント内容のみ」で、説明や前置きは不要`;
    }
    
    // OpenAI APIでコメント生成
    async generateCommentOpenAI(agent, prompt) {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.openaiApiKey}`
            },
            body: JSON.stringify({
                model: this.model,
                messages: [
                    { role: 'user', content: prompt }
                ],
                max_tokens: 100,
                temperature: 1.0
            })
        });
        
        const data = await response.json();
        
        if (data.error) {
            throw new Error(data.error.message);
        }
        
        return data.choices?.[0]?.message?.content?.trim() || '...';
    }
    
    // Gemini APIでコメント生成
    async generateCommentGemini(agent, prompt) {
        const requestBody = {
            contents: [{
                parts: [{ text: prompt }]
            }],
            generationConfig: {
                maxOutputTokens: 100,
                temperature: 1.0,
                topP: 0.95
            }
        };
        
        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${this.apiKey}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(requestBody)
            }
        );
        
        const data = await response.json();
        
        if (data.error) {
            throw new Error(data.error.message);
        }
        
        let text = '';
        if (data.candidates?.[0]?.content?.parts) {
            for (const part of data.candidates[0].content.parts) {
                if (part.text) {
                    text = part.text.trim();
                }
            }
        }
        
        return text || '...';
    }
    
    // Grok APIでコメント生成
    async generateCommentGrok(agent, prompt) {
        const response = await fetch('https://api.x.ai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.grokApiKey}`
            },
            body: JSON.stringify({
                model: this.model,
                messages: [
                    { role: 'user', content: prompt }
                ],
                max_tokens: 100,
                temperature: 1.0
            })
        });
        
        const data = await response.json();
        
        if (data.error) {
            throw new Error(data.error.message || JSON.stringify(data.error));
        }
        
        return data.choices?.[0]?.message?.content?.trim() || '...';
    }
    
    // コメント生成（プロバイダーに応じて切り替え）
    async generateComment(agent) {
        const prompt = this.buildPrompt(agent);
        
        try {
            switch (this.provider) {
                case 'openai':
                    if (!this.openaiApiKey) {
                        throw new Error('OpenAI APIキーが設定されていません');
                    }
                    return await this.generateCommentOpenAI(agent, prompt);
                    
                case 'grok':
                    if (!this.grokApiKey) {
                        throw new Error('Grok APIキーが設定されていません');
                    }
                    return await this.generateCommentGrok(agent, prompt);
                    
                case 'gemini':
                default:
                    if (!this.apiKey) {
                        throw new Error('Gemini APIキーが設定されていません');
                    }
                    return await this.generateCommentGemini(agent, prompt);
            }
        } catch (error) {
            console.error(`❌ ${agent.name} のコメント生成失敗:`, error);
            return null;
        }
    }
    
    // 投稿を追加
    addPost(agent, text) {
        const post = {
            id: Date.now(),
            agentId: agent.id,
            agentName: agent.name,
            agentIcon: agent.icon,
            agentColor: agent.color,
            text: text,
            timestamp: new Date()
        };
        
        this.posts.push(post);
        
        // 投稿数制限（最新500件）
        if (this.posts.length > 500) {
            this.posts = this.posts.slice(-500);
        }
        
        // コールバック
        if (this.onNewPost) {
            this.onNewPost(post);
        }
        
        console.log(`💬 [${agent.icon} ${agent.name}] ${text}`);
        
        return post;
    }
    
    // BBS自動実行開始
    async start() {
        if (this.isRunning) return;
        this.isRunning = true;
        
        console.log(`🚀 AI BBS 開始！ プロバイダー: ${this.provider} 監視対象: ${this.getWatchTargetDescription()}`);
        
        // メインループ
        this.runLoop();
        
        // スクリーンショットモードの場合、定期更新
        if (this.inputMode === 'screenshot') {
            this.startScreenshotCapture();
        }
    }
    
    // メインループ
    async runLoop() {
        while (this.isRunning) {
            try {
                // ランダムなエージェントを選択
                const agent = this.getRandomAgent();
                
                // コメント生成
                const comment = await this.generateComment(agent);
                
                if (comment) {
                    this.addPost(agent, comment);
                }
                
            } catch (error) {
                console.error('❌ ループエラー:', error);
            }
            
            // 次の投稿まで待機（ランダム性を持たせる）
            const waitTime = this.postInterval + Math.random() * 2000;
            await this.sleep(waitTime);
        }
    }
    
    // スクリーンショット定期キャプチャ
    startScreenshotCapture() {
        this.screenshotTimer = setInterval(async () => {
            if (!this.isRunning) return;
            
            try {
                // canvas からスクリーンショット取得
                const canvas = document.querySelector('canvas');
                if (canvas) {
                    const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
                    this.updateScreenshot(dataUrl);
                    console.log('📸 スクリーンショット更新');
                }
            } catch (error) {
                console.error('❌ スクリーンショット取得エラー:', error);
            }
            
        }, this.screenshotInterval);
    }
    
    // 停止
    stop() {
        this.isRunning = false;
        if (this.screenshotTimer) {
            clearInterval(this.screenshotTimer);
        }
        console.log('⏹️ AI BBS 停止');
    }
    
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    
    // 投稿履歴取得
    getPosts(limit = 50) {
        return this.posts.slice(-limit);
    }
    
    // 投稿クリア
    clearPosts() {
        this.posts = [];
    }
}

// グローバルインスタンス
window.BBSAgentManager = BBSAgentManager;
