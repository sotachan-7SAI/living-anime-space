/**
 * Story Supervisor System - AI監督システム
 * シナリオ進行を管理し、エチュード（即興演技）を監視・誘導
 * 
 * Version: 1.0.0
 * 
 * 特徴:
 * - オプション発動式（通常は自由会話）
 * - 固定シナリオ / エチュードシナリオ 両対応
 * - シーン目標の達成判定
 * - BGM・カメラ・背景との連携
 */

class StorySupervisor {
    constructor(app) {
        this.app = app;
        this.isActive = false;  // 発動中かどうか
        
        // 現在のシナリオ
        this.currentScenario = null;
        this.currentSceneIndex = 0;
        this.sceneProgress = 0;  // 0-100%
        
        // AI監督設定
        this.config = {
            aiProvider: 'gemini',  // 監督AI
            checkInterval: 10000,  // 進捗チェック間隔（10秒）
            progressThreshold: 80, // この%以上で次のシーンへ
            autoAdvance: true,     // 自動シーン進行
            showHints: true,       // ヒント表示
        };
        
        // 監視用
        this.checkIntervalId = null;
        this.conversationBuffer = [];  // 会話バッファ
        this.maxBufferSize = 20;       // 最大保持数
        
        // サンプルシナリオ（組み込み）
        this.builtInScenarios = this.createBuiltInScenarios();
        
        // カスタムシナリオ
        this.customScenarios = [];
        
        this.panel = null;
        this.init();
    }
    
    init() {
        console.log('🎬 Story Supervisor System 初期化中...');
        this.createUI();
        this.loadScenarios();
        this.setupConversationListener();
        console.log('✅ Story Supervisor 初期化完了');
    }
    
    // ========================================
    // 組み込みシナリオ定義
    // ========================================
    
    createBuiltInScenarios() {
        return [
            // ========== 固定シナリオ ==========
            {
                id: 'cafe_romance',
                name: '☕ カフェでの出会い',
                type: 'fixed',  // 固定シナリオ
                description: '偶然カフェで隣り合わせになった二人の物語',
                scenes: [
                    {
                        id: 'scene1',
                        name: '出会い',
                        description: 'カフェで偶然隣に座る',
                        goal: '自己紹介をして、共通の話題を見つける',
                        keywords: ['名前', '初めまして', '趣味', '仕事', '好き'],
                        background: 'cafe_interior',
                        bgm: 'calm_acoustic',
                        cameraPreset: 'two_shot_cafe',
                        maxDuration: 180,  // 3分
                    },
                    {
                        id: 'scene2', 
                        name: '打ち解ける',
                        description: '共通の趣味で盛り上がる',
                        goal: '趣味や好きなことについて深く話し、親しくなる',
                        keywords: ['楽しい', '私も', '一緒に', 'もっと', '聞かせて'],
                        background: 'cafe_interior',
                        bgm: 'upbeat_jazz',
                        cameraPreset: 'close_conversation',
                        maxDuration: 180,
                    },
                    {
                        id: 'scene3',
                        name: '連絡先交換',
                        description: 'また会う約束をする',
                        goal: '連絡先を交換するか、次に会う約束をする',
                        keywords: ['連絡', 'また', '今度', '会いたい', '約束', 'LINE'],
                        background: 'cafe_evening',
                        bgm: 'romantic_piano',
                        cameraPreset: 'emotional_closeup',
                        maxDuration: 120,
                    }
                ]
            },
            
            {
                id: 'mystery_room',
                name: '🔍 謎の部屋からの脱出',
                type: 'fixed',
                description: '気づいたら見知らぬ部屋に。協力して脱出せよ',
                scenes: [
                    {
                        id: 'scene1',
                        name: '目覚め',
                        description: '見知らぬ部屋で目を覚ます',
                        goal: '状況を把握し、部屋を調べ始める',
                        keywords: ['どこ', '何', '覚えて', '調べ', '見て'],
                        background: 'mysterious_room',
                        bgm: 'suspense',
                        cameraPreset: 'wide_room',
                        maxDuration: 120,
                    },
                    {
                        id: 'scene2',
                        name: '手がかり発見',
                        description: '部屋の中に隠された手がかりを見つける',
                        goal: '3つ以上の手がかりについて話し合う',
                        keywords: ['見つけた', '手がかり', '暗号', '鍵', 'メモ', '数字'],
                        background: 'mysterious_room_dark',
                        bgm: 'investigation',
                        cameraPreset: 'dynamic_search',
                        maxDuration: 240,
                    },
                    {
                        id: 'scene3',
                        name: '謎解き',
                        description: '手がかりを組み合わせて謎を解く',
                        goal: '暗号や謎を解読する',
                        keywords: ['わかった', '解けた', 'これは', '組み合わせ', '答え'],
                        background: 'mysterious_room_light',
                        bgm: 'tension_rising',
                        cameraPreset: 'intense_closeup',
                        maxDuration: 180,
                    },
                    {
                        id: 'scene4',
                        name: '脱出',
                        description: 'ドアが開く！',
                        goal: '脱出に成功し、喜びを分かち合う',
                        keywords: ['開いた', 'やった', '出られる', 'ありがとう', '協力'],
                        background: 'bright_exit',
                        bgm: 'victory',
                        cameraPreset: 'celebration',
                        maxDuration: 60,
                    }
                ]
            },
            
            // ========== エチュードシナリオ ==========
            {
                id: 'etude_first_date',
                name: '💕 初デート（エチュード）',
                type: 'etude',  // 即興型
                description: '初めてのデート。展開は自由！',
                scenes: [
                    {
                        id: 'scene1',
                        name: '待ち合わせ',
                        goal: '相手を見つけて、緊張しながらも挨拶する',
                        keywords: ['待った', 'ごめん', '会えて', 'うれしい', '緊張'],
                        generateBackground: true,  // AI生成
                        backgroundPrompt: '駅前の待ち合わせ場所、晴れた日、アニメ風',
                        bgmMood: 'excited',
                    },
                    {
                        id: 'scene2',
                        name: 'デート本番',
                        goal: '一緒に楽しい時間を過ごす',
                        keywords: ['楽しい', 'おいしい', 'きれい', 'すごい', '一緒'],
                        generateBackground: true,
                        backgroundPrompt: null,  // 会話から自動決定
                        bgmMood: 'happy',
                    },
                    {
                        id: 'scene3',
                        name: '別れ際',
                        goal: 'また会いたいという気持ちを伝える',
                        keywords: ['また', '今日', '楽しかった', '会いたい', '次'],
                        generateBackground: true,
                        backgroundPrompt: '夕暮れの駅、オレンジの空、アニメ風',
                        bgmMood: 'romantic',
                    }
                ]
            },
            
            {
                id: 'etude_confession',
                name: '💗 告白（エチュード）',
                type: 'etude',
                description: '想いを伝える勇気。結末は会話次第',
                scenes: [
                    {
                        id: 'scene1',
                        name: '呼び出し',
                        goal: '二人きりになって話を切り出す',
                        keywords: ['話', '二人', '聞いて', '大事', '言いたい'],
                        generateBackground: true,
                        backgroundPrompt: '学校の屋上、夕方、アニメ風',
                        bgmMood: 'nervous',
                    },
                    {
                        id: 'scene2',
                        name: '告白',
                        goal: '自分の気持ちを正直に伝える',
                        keywords: ['好き', '気持ち', 'ずっと', '本当', '伝えたい'],
                        generateBackground: true,
                        backgroundPrompt: '学校の屋上、夕焼け、ドラマチック、アニメ風',
                        bgmMood: 'emotional',
                    },
                    {
                        id: 'scene3',
                        name: '返事',
                        goal: '相手の返事を聞く（結末は会話次第）',
                        keywords: ['返事', 'うれしい', 'ごめん', '私も', '考えさせて'],
                        generateBackground: true,
                        backgroundPrompt: null,  // 展開に応じて変化
                        bgmMood: 'resolution',
                    }
                ]
            },
            
            {
                id: 'etude_argument',
                name: '💢 ケンカと仲直り（エチュード）',
                type: 'etude',
                description: '意見の衝突から仲直りまで',
                scenes: [
                    {
                        id: 'scene1',
                        name: '衝突',
                        goal: '意見が対立し、感情的になる',
                        keywords: ['違う', 'なんで', '信じられない', 'ひどい', '嫌'],
                        generateBackground: true,
                        bgmMood: 'tense',
                    },
                    {
                        id: 'scene2',
                        name: '沈黙',
                        goal: '冷静になって考える時間',
                        keywords: ['...', '静か', '考え', 'ごめん', '悪かった'],
                        generateBackground: true,
                        bgmMood: 'melancholy',
                    },
                    {
                        id: 'scene3',
                        name: '仲直り',
                        goal: '互いに歩み寄り、和解する',
                        keywords: ['ごめん', 'わかった', '大切', '許して', 'これから'],
                        generateBackground: true,
                        bgmMood: 'healing',
                    }
                ]
            }
        ];
    }
    
    // ========================================
    // シナリオ管理
    // ========================================
    
    loadScenarios() {
        // カスタムシナリオをlocalStorageから読み込み
        try {
            const saved = localStorage.getItem('customScenarios');
            if (saved) {
                this.customScenarios = JSON.parse(saved);
            }
        } catch (e) {
            console.error('シナリオ読み込みエラー:', e);
        }
    }
    
    saveCustomScenarios() {
        try {
            localStorage.setItem('customScenarios', JSON.stringify(this.customScenarios));
        } catch (e) {
            console.error('シナリオ保存エラー:', e);
        }
    }
    
    getAllScenarios() {
        return [...this.builtInScenarios, ...this.customScenarios];
    }
    
    getScenarioById(id) {
        return this.getAllScenarios().find(s => s.id === id);
    }
    
    // ========================================
    // シナリオ発動・制御
    // ========================================
    
    async startScenario(scenarioId) {
        const scenario = this.getScenarioById(scenarioId);
        if (!scenario) {
            console.error('シナリオが見つかりません:', scenarioId);
            return false;
        }
        
        console.log(`🎬 シナリオ開始: ${scenario.name}`);
        
        this.currentScenario = scenario;
        this.currentSceneIndex = 0;
        this.sceneProgress = 0;
        this.conversationBuffer = [];
        this.isActive = true;
        
        // 最初のシーンを開始
        await this.startScene(0);
        
        // 進捗監視を開始
        this.startProgressCheck();
        
        // UI更新
        this.updateUI();
        
        return true;
    }
    
    async startScene(sceneIndex) {
        if (!this.currentScenario) return;
        
        const scene = this.currentScenario.scenes[sceneIndex];
        if (!scene) {
            console.log('🎬 シナリオ完了！');
            this.endScenario();
            return;
        }
        
        console.log(`📍 シーン開始: ${scene.name}`);
        this.currentSceneIndex = sceneIndex;
        this.sceneProgress = 0;
        
        // 背景設定
        await this.applySceneBackground(scene);
        
        // BGM設定
        this.applySceneBGM(scene);
        
        // カメラ設定
        this.applySceneCamera(scene);
        
        // AIキャラにシーン情報を伝える（システムプロンプト的に）
        this.notifyAICharacter(scene);
        
        // UI更新
        this.updateUI();
        
        // シーン開始通知
        this.showSceneNotification(scene);
    }
    
    async applySceneBackground(scene) {
        if (scene.generateBackground) {
            // エチュード: AI生成
            const prompt = scene.backgroundPrompt || await this.generateBackgroundPrompt();
            if (prompt && window.aiBackgroundGenerator) {
                console.log(`🖼️ 背景生成中: ${prompt}`);
                // AI背景生成を呼び出し（非同期）
                window.aiBackgroundGenerator.generateBackground(prompt);
            }
        } else if (scene.background) {
            // 固定シナリオ: プリセット背景
            console.log(`🖼️ 背景設定: ${scene.background}`);
            // 背景画像のURLまたは360度画像を適用
            this.applyPresetBackground(scene.background);
        }
    }
    
    applyPresetBackground(backgroundId) {
        // プリセット背景の適用（実装は環境に依存）
        // 例: 360度画像、Gaussian Splat、単純な画像など
        const presets = {
            'cafe_interior': '/backgrounds/cafe.jpg',
            'cafe_evening': '/backgrounds/cafe_evening.jpg',
            'mysterious_room': '/backgrounds/mystery_room.jpg',
            'mysterious_room_dark': '/backgrounds/mystery_dark.jpg',
            'mysterious_room_light': '/backgrounds/mystery_light.jpg',
            'bright_exit': '/backgrounds/bright.jpg',
        };
        
        const url = presets[backgroundId];
        if (url && this.app.setBackground) {
            this.app.setBackground(url);
        }
    }
    
    async generateBackgroundPrompt() {
        // 会話内容から背景プロンプトを生成
        const recentConversation = this.conversationBuffer.slice(-5).join('\n');
        
        if (!recentConversation) return null;
        
        // AIに問い合わせて背景を決定
        const prompt = `以下の会話から、適切な背景画像の説明を日本語で短く（20文字以内）生成してください。アニメ風で。

会話:
${recentConversation}

背景の説明:`;
        
        try {
            if (window.geminiClient) {
                const response = await window.geminiClient.generateContent(prompt);
                return response.response.text().trim();
            }
        } catch (e) {
            console.error('背景プロンプト生成エラー:', e);
        }
        
        return null;
    }
    
    applySceneBGM(scene) {
        if (scene.bgm && window.localMusicPanel) {
            // 固定BGM
            console.log(`🎵 BGM: ${scene.bgm}`);
            // localMusicPanelでBGMを再生
        } else if (scene.bgmMood && window.bgmSceneAnalyzer) {
            // ムードベースで選曲
            console.log(`🎵 BGMムード: ${scene.bgmMood}`);
            window.bgmSceneAnalyzer.setMoodOverride(scene.bgmMood);
        }
    }
    
    applySceneCamera(scene) {
        if (scene.cameraPreset && window.aiDirectorCamera) {
            console.log(`🎬 カメラ: ${scene.cameraPreset}`);
            // カメラプリセットを適用
            this.applyCameraPreset(scene.cameraPreset);
        }
    }
    
    applyCameraPreset(presetId) {
        const presets = {
            'two_shot_cafe': { size: 'TWO', angle: 'FRONT', height: 'EYE_LEVEL' },
            'close_conversation': { size: 'MCU', angle: 'DIAGONAL_LEFT', height: 'EYE_LEVEL' },
            'emotional_closeup': { size: 'CU', angle: 'FRONT', height: 'EYE_LEVEL' },
            'wide_room': { size: 'LS', angle: 'FRONT', height: 'EYE_LEVEL' },
            'dynamic_search': { size: 'MS', angle: 'DIAGONAL_RIGHT', height: 'EYE_LEVEL' },
            'intense_closeup': { size: 'CU', angle: 'FRONT', height: 'LOW_ANGLE' },
            'celebration': { size: 'TWO', angle: 'FRONT', height: 'LOW_ANGLE' },
        };
        
        const preset = presets[presetId];
        if (preset && window.aiDirectorCamera) {
            window.aiDirectorCamera.setShot(preset.size, preset.angle, preset.height);
        }
    }
    
    notifyAICharacter(scene) {
        // AIキャラクターにシーン情報を伝える
        // これによりAIキャラが適切な演技をするようになる
        const hint = `
【シーン情報】
シーン名: ${scene.name}
状況: ${scene.description || ''}
目標: ${scene.goal}

この情報を参考に、自然に会話を進めてください。目標に向かって誘導してもOKです。
`;
        
        // チャットシステムにシステムメッセージとして送る
        if (window.chatClient && window.chatClient.addSystemContext) {
            window.chatClient.addSystemContext(hint);
        }
        
        console.log('📝 AIキャラにシーン情報を通知:', scene.name);
    }
    
    showSceneNotification(scene) {
        // シーン開始通知を表示
        const notification = document.createElement('div');
        notification.className = 'scene-notification';
        notification.innerHTML = `
            <div class="scene-notification-content">
                <div class="scene-number">Scene ${this.currentSceneIndex + 1}</div>
                <div class="scene-name">${scene.name}</div>
                <div class="scene-goal">🎯 ${scene.goal}</div>
            </div>
        `;
        
        // スタイル追加
        notification.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: rgba(0, 0, 0, 0.9);
            color: white;
            padding: 30px 50px;
            border-radius: 16px;
            text-align: center;
            z-index: 100000;
            animation: fadeInOut 3s ease-in-out forwards;
        `;
        
        // アニメーション追加
        if (!document.getElementById('scene-notification-style')) {
            const style = document.createElement('style');
            style.id = 'scene-notification-style';
            style.textContent = `
                @keyframes fadeInOut {
                    0% { opacity: 0; transform: translate(-50%, -50%) scale(0.8); }
                    20% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
                    80% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
                    100% { opacity: 0; transform: translate(-50%, -50%) scale(0.8); }
                }
                .scene-notification .scene-number {
                    font-size: 14px;
                    color: #9b59b6;
                    margin-bottom: 8px;
                }
                .scene-notification .scene-name {
                    font-size: 28px;
                    font-weight: bold;
                    margin-bottom: 12px;
                }
                .scene-notification .scene-goal {
                    font-size: 14px;
                    color: #aaa;
                }
            `;
            document.head.appendChild(style);
        }
        
        document.body.appendChild(notification);
        
        // 3秒後に削除
        setTimeout(() => notification.remove(), 3000);
    }
    
    endScenario() {
        console.log('🎬 シナリオ終了');
        
        this.isActive = false;
        this.stopProgressCheck();
        
        // 終了通知
        this.showEndNotification();
        
        // UI更新
        this.updateUI();
    }
    
    showEndNotification() {
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: linear-gradient(135deg, #9b59b6, #8e44ad);
            color: white;
            padding: 40px 60px;
            border-radius: 16px;
            text-align: center;
            z-index: 100000;
            animation: fadeInOut 4s ease-in-out forwards;
        `;
        notification.innerHTML = `
            <div style="font-size: 40px; margin-bottom: 16px;">🎬</div>
            <div style="font-size: 24px; font-weight: bold; margin-bottom: 8px;">シナリオ完了！</div>
            <div style="font-size: 14px; color: rgba(255,255,255,0.8);">${this.currentScenario?.name || ''}</div>
        `;
        
        document.body.appendChild(notification);
        setTimeout(() => notification.remove(), 4000);
    }
    
    stopScenario() {
        console.log('🎬 シナリオ中断');
        this.isActive = false;
        this.stopProgressCheck();
        this.currentScenario = null;
        this.updateUI();
    }
    
    // ========================================
    // 進捗監視
    // ========================================
    
    startProgressCheck() {
        if (this.checkIntervalId) {
            clearInterval(this.checkIntervalId);
        }
        
        this.checkIntervalId = setInterval(() => {
            if (this.isActive) {
                this.checkProgress();
            }
        }, this.config.checkInterval);
    }
    
    stopProgressCheck() {
        if (this.checkIntervalId) {
            clearInterval(this.checkIntervalId);
            this.checkIntervalId = null;
        }
    }
    
    setupConversationListener() {
        // チャットメッセージを監視
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                mutation.addedNodes.forEach((node) => {
                    if (node.nodeType === 1 && node.classList?.contains('message')) {
                        const text = node.textContent?.trim();
                        if (text) {
                            this.conversationBuffer.push(text);
                            if (this.conversationBuffer.length > this.maxBufferSize) {
                                this.conversationBuffer.shift();
                            }
                        }
                    }
                });
            });
        });
        
        // チャットコンテナを監視
        const chatContainer = document.querySelector('.chat-container, #chat-messages, .messages');
        if (chatContainer) {
            observer.observe(chatContainer, { childList: true, subtree: true });
        }
        
        // 遅延実行（DOMがまだない場合）
        setTimeout(() => {
            const container = document.querySelector('.chat-container, #chat-messages, .messages');
            if (container && !container._storySupervisorObserving) {
                observer.observe(container, { childList: true, subtree: true });
                container._storySupervisorObserving = true;
            }
        }, 3000);
    }
    
    async checkProgress() {
        if (!this.currentScenario || !this.isActive) return;
        
        const scene = this.currentScenario.scenes[this.currentSceneIndex];
        if (!scene) return;
        
        // キーワードベースの進捗チェック
        const keywordProgress = this.calculateKeywordProgress(scene);
        
        // AIベースの進捗チェック（オプション）
        let aiProgress = 0;
        if (this.config.aiProvider !== 'none') {
            aiProgress = await this.calculateAIProgress(scene);
        }
        
        // 総合進捗（キーワード60% + AI40%）
        this.sceneProgress = Math.round(
            keywordProgress * 0.6 + aiProgress * 0.4
        );
        
        console.log(`📊 進捗: ${this.sceneProgress}% (キーワード: ${keywordProgress}%, AI: ${aiProgress}%)`);
        
        // UI更新
        this.updateProgressUI();
        
        // 次のシーンへの自動進行
        if (this.config.autoAdvance && this.sceneProgress >= this.config.progressThreshold) {
            console.log('✅ 目標達成！次のシーンへ');
            await this.startScene(this.currentSceneIndex + 1);
        }
    }
    
    calculateKeywordProgress(scene) {
        if (!scene.keywords || scene.keywords.length === 0) return 50;
        
        const recentText = this.conversationBuffer.slice(-10).join(' ').toLowerCase();
        let matchedCount = 0;
        
        for (const keyword of scene.keywords) {
            if (recentText.includes(keyword.toLowerCase())) {
                matchedCount++;
            }
        }
        
        return Math.round((matchedCount / scene.keywords.length) * 100);
    }
    
    async calculateAIProgress(scene) {
        const recentConversation = this.conversationBuffer.slice(-10).join('\n');
        if (!recentConversation) return 0;
        
        const prompt = `以下の会話が、目標「${scene.goal}」にどれくらい近づいているか、0から100の数値のみで答えてください。

会話:
${recentConversation}

達成度（数値のみ）:`;
        
        try {
            if (window.geminiClient) {
                const response = await window.geminiClient.generateContent(prompt);
                const text = response.response.text().trim();
                const num = parseInt(text.match(/\d+/)?.[0] || '0');
                return Math.min(100, Math.max(0, num));
            }
        } catch (e) {
            console.error('AI進捗チェックエラー:', e);
        }
        
        return 50;  // デフォルト
    }
    
    // ========================================
    // UI
    // ========================================
    
    createUI() {
        const panel = document.createElement('div');
        panel.id = 'story-supervisor-panel';
        panel.innerHTML = `
            <style>
                #story-supervisor-panel {
                    position: fixed;
                    bottom: 20px;
                    left: 20px;
                    background: rgba(15, 15, 30, 0.97);
                    padding: 0;
                    border-radius: 16px;
                    color: #fff;
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
                    font-size: 11px;
                    z-index: 10002;
                    min-width: 300px;
                    max-width: 400px;
                    box-shadow: 0 10px 40px rgba(0,0,0,0.5);
                    border: 1px solid rgba(255,255,255,0.08);
                    display: none;
                }
                #story-supervisor-panel.active { display: block; }
                #story-supervisor-panel .panel-header {
                    background: linear-gradient(135deg, #e74c3c 0%, #c0392b 100%);
                    padding: 12px 14px;
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    border-radius: 16px 16px 0 0;
                    cursor: grab;
                }
                #story-supervisor-panel .panel-header .title { font-weight: 700; font-size: 13px; }
                #story-supervisor-panel .header-btn {
                    background: rgba(255,255,255,0.2);
                    border: none;
                    color: white;
                    width: 26px;
                    height: 26px;
                    border-radius: 6px;
                    cursor: pointer;
                }
                #story-supervisor-panel .panel-body { padding: 14px; }
                
                #story-supervisor-panel .scenario-info {
                    background: rgba(0,0,0,0.3);
                    border-radius: 10px;
                    padding: 12px;
                    margin-bottom: 12px;
                }
                #story-supervisor-panel .scenario-name {
                    font-size: 16px;
                    font-weight: 700;
                    margin-bottom: 4px;
                }
                #story-supervisor-panel .scenario-desc {
                    font-size: 10px;
                    color: #888;
                }
                
                #story-supervisor-panel .scene-timeline {
                    display: flex;
                    gap: 4px;
                    margin: 12px 0;
                    overflow-x: auto;
                    padding-bottom: 8px;
                }
                #story-supervisor-panel .scene-dot {
                    width: 36px;
                    height: 36px;
                    border-radius: 50%;
                    background: rgba(255,255,255,0.1);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 12px;
                    flex-shrink: 0;
                    border: 2px solid transparent;
                }
                #story-supervisor-panel .scene-dot.completed {
                    background: #27ae60;
                    border-color: #27ae60;
                }
                #story-supervisor-panel .scene-dot.current {
                    background: #e74c3c;
                    border-color: #e74c3c;
                    animation: pulse 1s infinite;
                }
                @keyframes pulse {
                    0%, 100% { transform: scale(1); }
                    50% { transform: scale(1.1); }
                }
                #story-supervisor-panel .scene-dot.pending {
                    background: rgba(255,255,255,0.05);
                    border-color: rgba(255,255,255,0.1);
                }
                
                #story-supervisor-panel .current-scene {
                    background: rgba(231, 76, 60, 0.1);
                    border: 1px solid rgba(231, 76, 60, 0.3);
                    border-radius: 10px;
                    padding: 12px;
                    margin-bottom: 12px;
                }
                #story-supervisor-panel .current-scene-name {
                    font-size: 14px;
                    font-weight: 700;
                    color: #e74c3c;
                    margin-bottom: 6px;
                }
                #story-supervisor-panel .current-scene-goal {
                    font-size: 11px;
                    color: #aaa;
                    margin-bottom: 10px;
                }
                
                #story-supervisor-panel .progress-container {
                    margin-top: 10px;
                }
                #story-supervisor-panel .progress-label {
                    display: flex;
                    justify-content: space-between;
                    font-size: 10px;
                    color: #888;
                    margin-bottom: 4px;
                }
                #story-supervisor-panel .progress-bar {
                    height: 8px;
                    background: rgba(255,255,255,0.1);
                    border-radius: 4px;
                    overflow: hidden;
                }
                #story-supervisor-panel .progress-fill {
                    height: 100%;
                    background: linear-gradient(90deg, #e74c3c, #f39c12);
                    border-radius: 4px;
                    transition: width 0.5s ease;
                }
                
                #story-supervisor-panel .control-btn {
                    width: 100%;
                    padding: 10px;
                    border: none;
                    border-radius: 8px;
                    font-weight: 700;
                    font-size: 11px;
                    cursor: pointer;
                    margin-top: 8px;
                }
                #story-supervisor-panel .control-btn.stop {
                    background: linear-gradient(135deg, #636e72, #2d3436);
                    color: white;
                }
                #story-supervisor-panel .control-btn.skip {
                    background: linear-gradient(135deg, #0984e3, #74b9ff);
                    color: white;
                }
            </style>
            
            <div class="panel-header">
                <div class="title">🎬 Story Supervisor</div>
                <button class="header-btn" id="story-close-btn">×</button>
            </div>
            
            <div class="panel-body">
                <div class="scenario-info">
                    <div class="scenario-name" id="story-scenario-name">-</div>
                    <div class="scenario-desc" id="story-scenario-desc">シナリオを選択してください</div>
                </div>
                
                <div class="scene-timeline" id="story-timeline">
                    <!-- シーンドットが動的に生成される -->
                </div>
                
                <div class="current-scene">
                    <div class="current-scene-name" id="story-current-scene">待機中</div>
                    <div class="current-scene-goal" id="story-current-goal">🎯 -</div>
                    <div class="progress-container">
                        <div class="progress-label">
                            <span>進捗</span>
                            <span id="story-progress-value">0%</span>
                        </div>
                        <div class="progress-bar">
                            <div class="progress-fill" id="story-progress-fill" style="width: 0%"></div>
                        </div>
                    </div>
                </div>
                
                <button class="control-btn skip" id="story-skip-btn">⏭️ 次のシーンへスキップ</button>
                <button class="control-btn stop" id="story-stop-btn">⏹️ シナリオ終了</button>
            </div>
        `;
        
        document.body.appendChild(panel);
        this.panel = panel;
        
        // イベントリスナー
        document.getElementById('story-close-btn').addEventListener('click', () => {
            this.panel.classList.remove('active');
        });
        
        document.getElementById('story-skip-btn').addEventListener('click', () => {
            if (this.isActive) {
                this.startScene(this.currentSceneIndex + 1);
            }
        });
        
        document.getElementById('story-stop-btn').addEventListener('click', () => {
            this.stopScenario();
        });
        
        // シナリオ選択UIを作成
        this.createScenarioSelector();
    }
    
    createScenarioSelector() {
        const selector = document.createElement('div');
        selector.id = 'scenario-selector-panel';
        selector.innerHTML = `
            <style>
                #scenario-selector-panel {
                    position: fixed;
                    top: 50%;
                    left: 50%;
                    transform: translate(-50%, -50%);
                    background: rgba(15, 15, 30, 0.98);
                    padding: 0;
                    border-radius: 20px;
                    color: #fff;
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
                    z-index: 100001;
                    min-width: 500px;
                    max-width: 600px;
                    max-height: 80vh;
                    box-shadow: 0 20px 60px rgba(0,0,0,0.7);
                    border: 1px solid rgba(255,255,255,0.1);
                    display: none;
                }
                #scenario-selector-panel.active { display: block; }
                #scenario-selector-panel .selector-header {
                    background: linear-gradient(135deg, #e74c3c 0%, #c0392b 100%);
                    padding: 16px 20px;
                    border-radius: 20px 20px 0 0;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }
                #scenario-selector-panel .selector-header h2 {
                    margin: 0;
                    font-size: 18px;
                }
                #scenario-selector-panel .selector-close {
                    background: rgba(255,255,255,0.2);
                    border: none;
                    color: white;
                    width: 30px;
                    height: 30px;
                    border-radius: 8px;
                    cursor: pointer;
                    font-size: 18px;
                }
                #scenario-selector-panel .selector-body {
                    padding: 20px;
                    max-height: calc(80vh - 80px);
                    overflow-y: auto;
                }
                #scenario-selector-panel .scenario-category {
                    margin-bottom: 20px;
                }
                #scenario-selector-panel .category-title {
                    font-size: 12px;
                    color: #888;
                    margin-bottom: 10px;
                    text-transform: uppercase;
                    letter-spacing: 1px;
                }
                #scenario-selector-panel .scenario-card {
                    background: rgba(255,255,255,0.05);
                    border: 1px solid rgba(255,255,255,0.1);
                    border-radius: 12px;
                    padding: 14px;
                    margin-bottom: 10px;
                    cursor: pointer;
                    transition: all 0.2s;
                }
                #scenario-selector-panel .scenario-card:hover {
                    background: rgba(231, 76, 60, 0.2);
                    border-color: #e74c3c;
                    transform: translateX(4px);
                }
                #scenario-selector-panel .scenario-card-name {
                    font-size: 14px;
                    font-weight: 700;
                    margin-bottom: 4px;
                }
                #scenario-selector-panel .scenario-card-desc {
                    font-size: 11px;
                    color: #888;
                    margin-bottom: 8px;
                }
                #scenario-selector-panel .scenario-card-info {
                    display: flex;
                    gap: 12px;
                    font-size: 10px;
                    color: #666;
                }
                #scenario-selector-panel .scenario-card-info span {
                    display: flex;
                    align-items: center;
                    gap: 4px;
                }
            </style>
            
            <div class="selector-header">
                <h2>🎬 シナリオ選択</h2>
                <button class="selector-close" id="scenario-selector-close">×</button>
            </div>
            
            <div class="selector-body" id="scenario-list">
                <!-- シナリオリストが動的に生成される -->
            </div>
        `;
        
        document.body.appendChild(selector);
        
        document.getElementById('scenario-selector-close').addEventListener('click', () => {
            selector.classList.remove('active');
        });
        
        this.selectorPanel = selector;
    }
    
    showScenarioSelector() {
        const listContainer = document.getElementById('scenario-list');
        listContainer.innerHTML = '';
        
        // 固定シナリオ
        const fixedScenarios = this.getAllScenarios().filter(s => s.type === 'fixed');
        if (fixedScenarios.length > 0) {
            listContainer.innerHTML += `
                <div class="scenario-category">
                    <div class="category-title">📁 固定シナリオ（背景・BGM準備済み）</div>
                    ${fixedScenarios.map(s => this.createScenarioCard(s)).join('')}
                </div>
            `;
        }
        
        // エチュードシナリオ
        const etudeScenarios = this.getAllScenarios().filter(s => s.type === 'etude');
        if (etudeScenarios.length > 0) {
            listContainer.innerHTML += `
                <div class="scenario-category">
                    <div class="category-title">🎲 エチュードシナリオ（即興・AI生成）</div>
                    ${etudeScenarios.map(s => this.createScenarioCard(s)).join('')}
                </div>
            `;
        }
        
        // クリックイベント
        listContainer.querySelectorAll('.scenario-card').forEach(card => {
            card.addEventListener('click', () => {
                const id = card.dataset.scenarioId;
                this.selectorPanel.classList.remove('active');
                this.startScenario(id);
            });
        });
        
        this.selectorPanel.classList.add('active');
    }
    
    createScenarioCard(scenario) {
        const sceneCount = scenario.scenes?.length || 0;
        const typeLabel = scenario.type === 'fixed' ? '📁 固定' : '🎲 即興';
        
        return `
            <div class="scenario-card" data-scenario-id="${scenario.id}">
                <div class="scenario-card-name">${scenario.name}</div>
                <div class="scenario-card-desc">${scenario.description}</div>
                <div class="scenario-card-info">
                    <span>📍 ${sceneCount}シーン</span>
                    <span>${typeLabel}</span>
                </div>
            </div>
        `;
    }
    
    updateUI() {
        if (!this.currentScenario) {
            this.panel.classList.remove('active');
            return;
        }
        
        this.panel.classList.add('active');
        
        // シナリオ情報
        document.getElementById('story-scenario-name').textContent = this.currentScenario.name;
        document.getElementById('story-scenario-desc').textContent = this.currentScenario.description;
        
        // タイムライン
        const timeline = document.getElementById('story-timeline');
        timeline.innerHTML = this.currentScenario.scenes.map((scene, i) => {
            let status = 'pending';
            if (i < this.currentSceneIndex) status = 'completed';
            else if (i === this.currentSceneIndex) status = 'current';
            
            return `<div class="scene-dot ${status}" title="${scene.name}">${i + 1}</div>`;
        }).join('');
        
        // 現在のシーン
        const currentScene = this.currentScenario.scenes[this.currentSceneIndex];
        if (currentScene) {
            document.getElementById('story-current-scene').textContent = 
                `Scene ${this.currentSceneIndex + 1}: ${currentScene.name}`;
            document.getElementById('story-current-goal').textContent = 
                `🎯 ${currentScene.goal}`;
        }
    }
    
    updateProgressUI() {
        document.getElementById('story-progress-value').textContent = `${this.sceneProgress}%`;
        document.getElementById('story-progress-fill').style.width = `${this.sceneProgress}%`;
    }
    
    // ========================================
    // 公開メソッド
    // ========================================
    
    showPanel() { this.panel.classList.add('active'); }
    hidePanel() { this.panel.classList.remove('active'); }
    togglePanel() { this.panel.classList.toggle('active'); }
    
    openSelector() { this.showScenarioSelector(); }
}

// ========================================
// 初期化
// ========================================

function initStorySupervisor() {
    if (window.app) {
        window.storySupervisor = new StorySupervisor(window.app);
        console.log('🎬 Story Supervisor 登録完了');
    } else {
        const check = setInterval(() => {
            if (window.app) {
                window.storySupervisor = new StorySupervisor(window.app);
                console.log('🎬 Story Supervisor 登録完了');
                clearInterval(check);
            }
        }, 100);
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => setTimeout(initStorySupervisor, 2000));
} else {
    setTimeout(initStorySupervisor, 2000);
}

window.StorySupervisor = StorySupervisor;

// メニューボタンを追加
function addStoryMenuButton() {
    if (document.getElementById('story-menu-btn')) return;
    
    const btn = document.createElement('button');
    btn.id = 'story-menu-btn';
    btn.innerHTML = '🎬 ストーリー';
    btn.style.cssText = `
        position: fixed;
        top: 10px;
        left: 410px;
        background: linear-gradient(135deg, #e74c3c 0%, #c0392b 100%);
        color: white;
        border: none;
        padding: 8px 12px;
        border-radius: 8px;
        cursor: pointer;
        font-size: 12px;
        font-weight: bold;
        z-index: 10001;
        box-shadow: 0 2px 10px rgba(0,0,0,0.3);
        transition: all 0.3s;
    `;
    
    btn.addEventListener('click', () => {
        if (window.storySupervisor) {
            if (window.storySupervisor.isActive) {
                window.storySupervisor.togglePanel();
            } else {
                window.storySupervisor.openSelector();
            }
        }
    });
    
    btn.addEventListener('mouseenter', () => {
        btn.style.transform = 'translateY(-2px)';
        btn.style.boxShadow = '0 4px 15px rgba(231, 76, 60, 0.5)';
    });
    btn.addEventListener('mouseleave', () => {
        btn.style.transform = '';
        btn.style.boxShadow = '0 2px 10px rgba(0,0,0,0.3)';
    });
    
    document.body.appendChild(btn);
    console.log('✅ ストーリーメニューボタン追加');
}

setTimeout(addStoryMenuButton, 3000);
