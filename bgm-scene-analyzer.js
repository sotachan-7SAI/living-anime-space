// ========================================
// 🎵 BGMシーン分析システム v1.4
// 会話全体の文脈からシーンを判定してBGM選曲
// 思考チャット表示機能 + 短略的モード追加
// ★ マルチキャラ会話ログ連携対応
// ========================================

console.log('🎵 BGMシーン分析システム v1.4 を読み込み中...');

(function() {
    
    // ========================================
    // 設定
    // ========================================
    
    const CONFIG = {
        HISTORY_SIZE: 5,
        MIN_ANALYSIS_INTERVAL: 10,
        IGNORE_SAME_SCENE: true,
        DEBUG: true,
        // 短略的モード: 1セリフでも積極的に判定
        AGGRESSIVE_MODE: true
    };
    
    // ========================================
    // シーン定義
    // ========================================
    
    const SCENES = {
        cheerful: {
            name: '楽しい会話',
            emoji: '😊',
            description: '明るく楽しい雑談、冗談、ポジティブな話題',
            categories: ['03エモーション', 'バラエティ', '雰囲気'],
            keywords: ['ウキウキ', 'ニコニコ', '愉快', 'ポジティブ', '満足']
        },
        calm: {
            name: '穏やかな日常',
            emoji: '😌',
            description: '落ち着いた会話、日常の話、リラックス',
            categories: ['01ネイチャー', 'そらキレイ', '雰囲気'],
            keywords: ['ほのぼの', 'のほほん', 'リラックス', '穏やか']
        },
        serious: {
            name: '真剣な話',
            emoji: '🤔',
            description: '相談、悩み、重要な話題、議論、プログラミング',
            categories: ['06ビジネス', 'ニュース', 'くーる'],
            keywords: ['真剣', '計画', '説明', '考える']
        },
        melancholy: {
            name: '切ない雰囲気',
            emoji: '😢',
            description: '悲しい話題、別れ、寂しさ、後悔',
            categories: ['感情', 'あんにゅい', 'ドラマティック'],
            keywords: ['悲嘆', '憂鬱', '切ない', '悲しい']
        },
        romantic: {
            name: 'ロマンチック',
            emoji: '💕',
            description: '恋愛話、甘い会話、ロマンチックな雰囲気',
            categories: ['ろまんす', 'ドラマティック', '情景'],
            keywords: ['ロマンス', '恋', '愛']
        },
        mysterious: {
            name: '神秘的な話',
            emoji: '🌙',
            description: '不思議な話、哲学、宇宙、スピリチュアル、意識',
            categories: ['サスペンス', '闇', '雰囲気'],
            keywords: ['不思議', '神秘', '洞窟', '聖なる']
        },
        exciting: {
            name: 'ワクワクする話',
            emoji: '⚡',
            description: '冒険、挑戦、新しいこと、興奮、ゲーム',
            categories: ['07イベント', '02ループBGM', 'スタイリッシュ'],
            keywords: ['エキサイト', '冒険', 'ゲーム', 'アクション']
        },
        comical: {
            name: 'コミカルな会話',
            emoji: '🎪',
            description: 'ギャグ、ボケツッコミ、面白おかしい',
            categories: ['08コミカル', 'バラエティ', 'ダサい曲'],
            keywords: ['コミカル', 'いたずら', 'パニック', '面白い']
        },
        nostalgic: {
            name: '懐かしい話',
            emoji: '🍂',
            description: '思い出話、昔の話、懐古',
            categories: ['民芸レトロ', '情景', 'あんにゅい'],
            keywords: ['レトロ', '懐かしい', '記憶']
        },
        intellectual: {
            name: '知的な議論',
            emoji: '📚',
            description: '勉強、研究、専門的な話題、説明、技術',
            categories: ['06ビジネス', '雰囲気', 'くーる'],
            keywords: ['実験', '理科', '研究', '開発']
        },
        creative: {
            name: '創作活動',
            emoji: '🎨',
            description: '創作、アート、デザイン、音楽制作',
            categories: ['雰囲気', 'スタイリッシュ', '03エモーション'],
            keywords: ['創作', 'アート', 'デザイン', '作る']
        },
        neutral: {
            name: '通常',
            emoji: '🎵',
            description: '特に特徴のない会話',
            categories: ['02ループBGM', '雰囲気', '01ネイチャー'],
            keywords: []
        }
    };
    
    // ========================================
    // 状態管理
    // ========================================
    
    let conversationHistory = [];
    let currentScene = 'neutral';
    let lastAnalysisTime = 0;
    let isAnalyzing = false;
    let analysisEnabled = true;
    
    // 思考ログ
    let thoughtLog = [];
    
    // ========================================
    // 思考チャットUI
    // ========================================
    
    function createThoughtChatUI() {
        const checkPanel = setInterval(() => {
            const panel = document.getElementById('local-music-panel');
            if (panel && !document.getElementById('bgm-thought-section')) {
                clearInterval(checkPanel);
                
                // 思考チャットセクションを作成
                const thoughtSection = document.createElement('div');
                thoughtSection.id = 'bgm-thought-section';
                thoughtSection.style.cssText = `
                    margin-top: 10px;
                    padding: 10px;
                    background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
                    border-radius: 8px;
                    border: 1px solid #4ecdc4;
                `;
                thoughtSection.innerHTML = `
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                        <span style="font-size: 11px; color: #4ecdc4; font-weight: bold;">🧠 AI思考ログ</span>
                        <button id="bgm-thought-clear" style="
                            background: rgba(255,255,255,0.1);
                            border: none;
                            color: #999;
                            font-size: 9px;
                            padding: 2px 6px;
                            border-radius: 4px;
                            cursor: pointer;
                        ">クリア</button>
                    </div>
                    <div id="bgm-thought-chat" style="
                        max-height: 150px;
                        overflow-y: auto;
                        font-size: 10px;
                        color: #ccc;
                        line-height: 1.5;
                    ">
                        <div style="color: #666; font-style: italic;">会話を始めると、選曲理由がここに表示されます...</div>
                    </div>
                `;
                
                // カテゴリセクションの前に挿入
                const categorySection = panel.querySelector('.lm-category-section') || 
                                        panel.querySelector('[class*="category"]');
                if (categorySection) {
                    categorySection.parentNode.insertBefore(thoughtSection, categorySection);
                } else {
                    panel.querySelector('.lm-panel-body')?.appendChild(thoughtSection);
                }
                
                // クリアボタン
                document.getElementById('bgm-thought-clear').addEventListener('click', () => {
                    clearThoughtLog();
                });
                
                console.log('✅ 思考チャットUIを追加しました');
            }
        }, 500);
    }
    
    function addThought(type, content) {
        const timestamp = new Date().toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        
        const thought = { type, content, timestamp };
        thoughtLog.push(thought);
        
        // 最大20件まで保持
        while (thoughtLog.length > 20) {
            thoughtLog.shift();
        }
        
        updateThoughtChatUI();
    }
    
    function updateThoughtChatUI() {
        const chatDiv = document.getElementById('bgm-thought-chat');
        if (!chatDiv) return;
        
        if (thoughtLog.length === 0) {
            chatDiv.innerHTML = '<div style="color: #666; font-style: italic;">会話を始めると、選曲理由がここに表示されます...</div>';
            return;
        }
        
        chatDiv.innerHTML = thoughtLog.map(t => {
            let icon, color;
            switch (t.type) {
                case 'input':
                    icon = '📥';
                    color = '#88c0d0';
                    break;
                case 'analysis':
                    icon = '🔍';
                    color = '#ebcb8b';
                    break;
                case 'scene':
                    icon = '🎬';
                    color = '#a3be8c';
                    break;
                case 'reason':
                    icon = '💭';
                    color = '#b48ead';
                    break;
                case 'music':
                    icon = '🎵';
                    color = '#88c0d0';
                    break;
                case 'mode':
                    icon = '⚡';
                    color = '#d08770';
                    break;
                case 'error':
                    icon = '❌';
                    color = '#bf616a';
                    break;
                default:
                    icon = '📝';
                    color = '#ccc';
            }
            
            return `
                <div style="margin-bottom: 6px; padding: 4px; background: rgba(255,255,255,0.05); border-radius: 4px;">
                    <span style="color: #666; font-size: 9px;">${t.timestamp}</span>
                    <span style="margin-left: 4px;">${icon}</span>
                    <span style="color: ${color}; margin-left: 4px;">${t.content}</span>
                </div>
            `;
        }).join('');
        
        // 最下部にスクロール
        chatDiv.scrollTop = chatDiv.scrollHeight;
    }
    
    function clearThoughtLog() {
        thoughtLog = [];
        updateThoughtChatUI();
    }
    
    // ========================================
    // 短略的モードUI
    // ========================================
    
    function createAggressiveModeUI() {
        const checkPanel = setInterval(() => {
            const contextSection = document.getElementById('lm-context-length-section');
            if (contextSection && !document.getElementById('lm-aggressive-mode-section')) {
                clearInterval(checkPanel);
                
                const aggressiveSection = document.createElement('div');
                aggressiveSection.id = 'lm-aggressive-mode-section';
                aggressiveSection.style.cssText = 'margin-top: 10px; padding-top: 10px; border-top: 1px dashed #ddd;';
                aggressiveSection.innerHTML = `
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <label style="display: flex; align-items: center; gap: 6px; cursor: pointer;">
                            <input type="checkbox" id="lm-aggressive-mode" ${CONFIG.AGGRESSIVE_MODE ? 'checked' : ''} 
                                   style="width: 16px; height: 16px; accent-color: #d08770;">
                            <span style="font-size: 10px; color: #666;">⚡ 短略的モード</span>
                        </label>
                    </div>
                    <div style="font-size: 9px; color: #999; margin-top: 4px; padding-left: 22px;">
                        ON: 1セリフでも積極的に雰囲気を判定<br>
                        OFF: 慎重に判定（neutralになりやすい）
                    </div>
                `;
                
                contextSection.parentNode.insertBefore(aggressiveSection, contextSection.nextSibling);
                
                // イベントリスナー
                const checkbox = document.getElementById('lm-aggressive-mode');
                checkbox.addEventListener('change', (e) => {
                    CONFIG.AGGRESSIVE_MODE = e.target.checked;
                    saveSettings();
                    addThought('mode', `短略的モード: ${CONFIG.AGGRESSIVE_MODE ? 'ON' : 'OFF'}`);
                });
                
                console.log('✅ 短略的モードUIを追加しました');
            }
        }, 500);
    }
    
    // ========================================
    // 設定変更API
    // ========================================
    
    function setHistorySize(size) {
        const newSize = Math.max(1, Math.min(10, parseInt(size) || 5));
        CONFIG.HISTORY_SIZE = newSize;
        while (conversationHistory.length > newSize) {
            conversationHistory.shift();
        }
        saveSettings();
        return newSize;
    }
    
    function setAggressiveMode(enabled) {
        CONFIG.AGGRESSIVE_MODE = !!enabled;
        saveSettings();
        const checkbox = document.getElementById('lm-aggressive-mode');
        if (checkbox) checkbox.checked = CONFIG.AGGRESSIVE_MODE;
    }
    
    function saveSettings() {
        try {
            localStorage.setItem('bgmSceneSettings', JSON.stringify({
                historySize: CONFIG.HISTORY_SIZE,
                analysisInterval: CONFIG.MIN_ANALYSIS_INTERVAL,
                aggressiveMode: CONFIG.AGGRESSIVE_MODE
            }));
        } catch (e) {}
    }
    
    function loadSettings() {
        try {
            const saved = localStorage.getItem('bgmSceneSettings');
            if (saved) {
                const settings = JSON.parse(saved);
                if (settings.historySize) CONFIG.HISTORY_SIZE = settings.historySize;
                if (settings.analysisInterval) CONFIG.MIN_ANALYSIS_INTERVAL = settings.analysisInterval;
                if (typeof settings.aggressiveMode === 'boolean') CONFIG.AGGRESSIVE_MODE = settings.aggressiveMode;
            }
        } catch (e) {}
    }
    
    // ========================================
    // 会話履歴管理
    // ========================================
    
    function addToHistory(role, message) {
        // AI応答が短すぎる場合（「それは」「えっと」など）は無視
        if (role === 'assistant') {
            const trimmed = message.trim();
            // 10文字以下の短い応答は途中経過として無視
            if (trimmed.length <= 10) {
                console.log(`🎵 AI応答が短すぎるためスキップ: "${trimmed}"`);
                return false;
            }
        }
        
        conversationHistory.push({
            role: role,
            message: message,
            timestamp: Date.now()
        });
        
        while (conversationHistory.length > CONFIG.HISTORY_SIZE) {
            conversationHistory.shift();
        }
        
        // 思考ログに追加
        const shortMsg = message.length > 30 ? message.substring(0, 30) + '...' : message;
        addThought('input', `${role === 'user' ? 'ユーザー' : 'AI'}: ${shortMsg}`);
        
        return true;
    }
    
    function getHistorySummary() {
        if (conversationHistory.length === 0) return '';
        const recentHistory = conversationHistory.slice(-CONFIG.HISTORY_SIZE);
        return recentHistory.map(h => 
            `${h.role === 'user' ? 'ユーザー' : 'AI'}: ${h.message}`
        ).join('\n');
    }
    
    function clearHistory() {
        conversationHistory = [];
        currentScene = 'neutral';
        lastAnalysisTime = 0;
    }
    
    // ========================================
    // シーン分析（Gemini使用）- 短略的モード対応
    // ========================================
    
    async function analyzeScene(forceAnalyze = false) {
        const now = Date.now();
        if (!forceAnalyze && now - lastAnalysisTime < CONFIG.MIN_ANALYSIS_INTERVAL * 1000) {
            return currentScene;
        }
        
        if (isAnalyzing) return currentScene;
        
        if (conversationHistory.length < 1) {
            return currentScene;
        }
        
        const apiKey = getGeminiApiKey();
        if (!apiKey) {
            addThought('error', 'Gemini APIキーがありません');
            return currentScene;
        }
        
        isAnalyzing = true;
        lastAnalysisTime = now;
        
        const modeLabel = CONFIG.AGGRESSIVE_MODE ? '⚡短略的' : '🔍慎重';
        addThought('analysis', `シーン分析開始 (${modeLabel})`);
        
        try {
            const historySummary = getHistorySummary();
            
            // 短略的モードと慎重モードでプロンプトを変える
            let prompt;
            
            if (CONFIG.AGGRESSIVE_MODE) {
                // 短略的モード: 積極的に判定、neutralを避ける
                prompt = `あなたはBGM選曲AIです。会話の雰囲気を【積極的に】判断してください。

【重要な指示】
- たとえ1セリフでも、必ず具体的なシーンを選んでください
- 「neutral（通常）」は最後の手段です。できる限り避けてください
- 言葉の端々から感情や状況を読み取り、大胆に判断してください
- 迷ったら、最も近いと思うシーンを選んでください

【会話】
${historySummary}

【シーン選択肢】（neutralは避けて！）
cheerful（楽しい・明るい・嬉しい）
calm（穏やか・リラックス・日常）
serious（真剣・悩み・相談）
melancholy（悲しい・切ない・寂しい）
romantic（恋愛・甘い・ドキドキ）
mysterious（不思議・神秘・哲学）
exciting（ワクワク・興奮・冒険）
comical（面白い・ギャグ・笑い）
nostalgic（懐かしい・思い出）
intellectual（知的・勉強・技術）
creative（創作・アート・制作）
neutral（どうしても判断できない時のみ）

JSON形式で出力:
{
  "scene": "シーン名",
  "reason": "なぜそう判断したか（日本語1-2文）"
}`;
            } else {
                // 慎重モード: 従来通り
                prompt = `あなたは会話のシーン・雰囲気を分析してBGMを選曲するAIです。

以下の会話履歴を読んで、今の会話全体の「シーン」を判断し、選曲理由を説明してください。

【会話履歴】
${historySummary}

【シーン選択肢】
cheerful（楽しい）、calm（穏やか）、serious（真剣）、melancholy（切ない）、
romantic（ロマンチック）、mysterious（神秘的）、exciting（ワクワク）、
comical（コミカル）、nostalgic（懐かしい）、intellectual（知的）、
creative（創作）、neutral（通常）

以下のJSON形式で出力してください:
{
  "scene": "シーン名（英語）",
  "reason": "選曲理由を1-2文で日本語で説明"
}`;
            }

            const response = await fetch(
                `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contents: [{ parts: [{ text: prompt }] }],
                        generationConfig: {
                            temperature: CONFIG.AGGRESSIVE_MODE ? 0.7 : 0.3,
                            maxOutputTokens: 200
                        }
                    })
                }
            );
            
            if (!response.ok) {
                throw new Error(`API error: ${response.status}`);
            }
            
            const data = await response.json();
            const resultText = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
            
            console.log('🎵 Gemini応答:', resultText);
            
            // JSONをパース
            let result;
            try {
                // JSONを抽出
                const jsonMatch = resultText.match(/\{[\s\S]*\}/);
                if (jsonMatch) {
                    result = JSON.parse(jsonMatch[0]);
                } else {
                    // フォールバック: シーン名のみ
                    const sceneName = resultText.toLowerCase().match(/cheerful|calm|serious|melancholy|romantic|mysterious|exciting|comical|nostalgic|intellectual|creative|neutral/);
                    result = { scene: sceneName ? sceneName[0] : 'calm', reason: '会話の雰囲気から判断しました' };
                }
            } catch (e) {
                // パース失敗時
                const sceneName = resultText.toLowerCase().match(/cheerful|calm|serious|melancholy|romantic|mysterious|exciting|comical|nostalgic|intellectual|creative|neutral/);
                // 短略的モードではneutral以外をデフォルトに
                const defaultScene = CONFIG.AGGRESSIVE_MODE ? 'calm' : 'neutral';
                result = { scene: sceneName ? sceneName[0] : defaultScene, reason: resultText.substring(0, 100) };
            }
            
            // 短略的モードでneutralが返ってきた場合、calmに変更
            if (CONFIG.AGGRESSIVE_MODE && result.scene === 'neutral') {
                result.scene = 'calm';
                result.reason = '（短略的モード）特徴が薄いため穏やかな雰囲気と判断';
            }
            
            console.log('🎵 シーン分析結果:', result);
            
            // 有効なシーンかチェック
            if (result.scene && SCENES[result.scene]) {
                const previousScene = currentScene;
                currentScene = result.scene;
                
                // 思考ログに理由を追加
                addThought('reason', result.reason || '会話の雰囲気から判断');
                
                if (previousScene !== currentScene) {
                    const sceneData = SCENES[currentScene];
                    addThought('scene', `${sceneData.emoji} ${sceneData.name} に変更`);
                    onSceneChanged(currentScene, previousScene, result.reason);
                } else {
                    addThought('scene', `${SCENES[currentScene].emoji} ${SCENES[currentScene].name} を継続`);
                }
                
                return currentScene;
            }
            
        } catch (error) {
            console.error('🎵 シーン分析エラー:', error);
            addThought('error', `分析エラー: ${error.message}`);
        } finally {
            isAnalyzing = false;
        }
        
        return currentScene;
    }
    
    // ========================================
    // シーン変更時の処理
    // ========================================
    
    function onSceneChanged(newScene, oldScene, reason) {
        const sceneData = SCENES[newScene];
        
        if (window.localMusicPanel && window.localMusicPanel.autoSelectEnabled) {
            const categories = sceneData.categories;
            const selectedCategory = categories[Math.floor(Math.random() * categories.length)];
            
            updateMusicPanelUI(newScene, sceneData);
            selectAndPlayFromCategory(selectedCategory, sceneData, reason);
        }
    }
    
    function updateMusicPanelUI(scene, sceneData) {
        const moodEmoji = document.querySelector('.lm-mood-emoji');
        const moodText = document.querySelector('.lm-mood-text');
        
        if (moodEmoji) moodEmoji.textContent = sceneData.emoji;
        if (moodText) moodText.textContent = sceneData.name;
    }
    
    async function selectAndPlayFromCategory(category, sceneData, reason) {
        const panel = window.localMusicPanel;
        if (!panel) return;
        
        try {
            const response = await fetch(`/api/music-tracks?category=${encodeURIComponent(category)}`);
            if (!response.ok) return;
            
            const data = await response.json();
            if (!data.tracks || data.tracks.length === 0) {
                addThought('error', `カテゴリ「${category}」に曲がありません`);
                return;
            }
            
            let selectedTrack = null;
            
            if (sceneData.keywords && sceneData.keywords.length > 0) {
                for (const keyword of sceneData.keywords) {
                    const match = data.tracks.find(t => 
                        t.name.includes(keyword) || t.name.toLowerCase().includes(keyword.toLowerCase())
                    );
                    if (match) {
                        selectedTrack = match;
                        break;
                    }
                }
            }
            
            if (!selectedTrack) {
                selectedTrack = data.tracks[Math.floor(Math.random() * data.tracks.length)];
            }
            
            // 思考ログに選曲結果を追加
            addThought('music', `♪ ${selectedTrack.name} (${category})`);
            
            if (!panel.currentTrack || panel.currentTrack.path !== selectedTrack.path) {
                panel.currentCategory = category;
                panel.currentTracks = data.tracks;
                await panel.playTrack(selectedTrack);
            }
            
        } catch (error) {
            addThought('error', `選曲エラー: ${error.message}`);
        }
    }
    
    // ========================================
    // APIキー取得
    // ========================================
    
    function getGeminiApiKey() {
        if (window.GOOGLE_API_KEY) return window.GOOGLE_API_KEY;
        if (window.API_CONFIG && window.API_CONFIG.GOOGLE_API_KEY) {
            return window.API_CONFIG.GOOGLE_API_KEY;
        }
        if (window.app && window.app.GOOGLE_API_KEY) return window.app.GOOGLE_API_KEY;
        try {
            const stored = localStorage.getItem('gemini_api_key') || 
                           localStorage.getItem('banana_api_key') ||
                           localStorage.getItem('vrm_viewer_google_api_key');
            if (stored) return stored;
        } catch (e) {}
        if (typeof GOOGLE_API_KEY !== 'undefined') return GOOGLE_API_KEY;
        return null;
    }
    
    // ========================================
    // チャット監視
    // ========================================
    
    function hookChatSystem() {
        const chatInput = document.getElementById('chat-input');
        const chatSend = document.getElementById('chat-send');
        
        if (chatInput && chatSend) {
            chatSend.addEventListener('click', () => {
                const message = chatInput.value.trim();
                if (message) {
                    addToHistory('user', message);
                    setTimeout(() => analyzeScene(true), 2000);
                }
            });
            
            chatInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    const message = chatInput.value.trim();
                    if (message) {
                        addToHistory('user', message);
                        setTimeout(() => analyzeScene(true), 2000);
                    }
                }
            });
            
            console.log('✅ チャット入力フック完了');
        } else {
            setTimeout(hookChatSystem, 1000);
            return;
        }
        
        observeAIResponses();
    }
    
    function observeAIResponses() {
        const chatMessages = document.getElementById('chat-messages');
        if (!chatMessages) {
            setTimeout(observeAIResponses, 1000);
            return;
        }
        
        const observer = new MutationObserver((mutations) => {
            for (const mutation of mutations) {
                for (const node of mutation.addedNodes) {
                    if (node.nodeType === Node.ELEMENT_NODE) {
                        let aiMessage = null;
                        if (node.classList?.contains('message') && (node.classList?.contains('ai') || node.classList?.contains('assistant'))) {
                            aiMessage = node;
                        } else {
                            aiMessage = node.querySelector?.('.message.ai, .message.assistant');
                        }
                        
                        if (aiMessage) {
                            const textEl = aiMessage.querySelector('.message-text');
                            const text = textEl?.textContent?.trim() || aiMessage.textContent?.trim();
                            if (text && text.length > 0) {
                                // addToHistoryがfalseを返した場合（短すぎる応答）は分析しない
                                const added = addToHistory('assistant', text);
                                if (added) {
                                    setTimeout(() => analyzeScene(true), 1000);
                                }
                            }
                        }
                    }
                }
            }
        });
        
        observer.observe(chatMessages, { childList: true, subtree: true });
        console.log('✅ AI応答監視開始');
    }
    
    // ========================================
    // 文脈長さUI
    // ========================================
    
    function createContextLengthUI() {
        const checkPanel = setInterval(() => {
            const autoToggleSection = document.querySelector('.lm-auto-toggle');
            if (autoToggleSection && !document.getElementById('lm-context-length-section')) {
                clearInterval(checkPanel);
                
                const contextSection = document.createElement('div');
                contextSection.id = 'lm-context-length-section';
                contextSection.style.cssText = 'margin-top: 10px; padding-top: 10px; border-top: 1px dashed #ddd;';
                contextSection.innerHTML = `
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <span style="font-size: 10px; color: #666;">📝 文脈の長さ:</span>
                        <input type="range" id="lm-context-length" min="1" max="10" value="${CONFIG.HISTORY_SIZE}" 
                               style="flex: 1; height: 4px;">
                        <span id="lm-context-length-value" style="font-size: 11px; font-weight: bold; color: #11998e; min-width: 20px;">
                            ${CONFIG.HISTORY_SIZE}
                        </span>
                    </div>
                    <div style="font-size: 9px; color: #999; margin-top: 4px;">
                        1=直近の発言のみ / 10=長い文脈を考慮
                    </div>
                `;
                
                autoToggleSection.parentNode.insertBefore(contextSection, autoToggleSection.nextSibling);
                
                const slider = document.getElementById('lm-context-length');
                const valueDisplay = document.getElementById('lm-context-length-value');
                
                slider.addEventListener('input', (e) => {
                    const value = parseInt(e.target.value);
                    valueDisplay.textContent = value;
                    setHistorySize(value);
                });
            }
        }, 500);
    }
    
    // ========================================
    // 外部API
    // ========================================
    
    function addConversation(role, message) {
        addToHistory(role, message);
        return analyzeScene(true);
    }
    
    function getCurrentScene() {
        return {
            scene: currentScene,
            ...SCENES[currentScene]
        };
    }
    
    function getThoughtLog() {
        return [...thoughtLog];
    }
    
    // ========================================
    // ★ マルチキャラ会話ログ監視
    // ========================================
    
    function hookMultiCharacterSystem() {
        // multichar:turnEnd イベントを監視
        window.addEventListener('multichar:turnEnd', (e) => {
            const { speaker, text, emotion } = e.detail;
            if (speaker && text) {
                // マルチキャラの発言を履歴に追加
                const message = `【${speaker.name}】 ${text}`;
                const added = addToHistory('assistant', message);
                if (added) {
                    console.log(`🎵 マルチキャラ発言追加: ${speaker.name}`);
                    // シーン分析をトリガー（少し遅延させて複数発言をまとめる）
                    setTimeout(() => analyzeScene(true), 3000);
                }
            }
        });
        
        // multichar:conversationStart イベントを監視
        window.addEventListener('multichar:conversationStart', (e) => {
            const { topic } = e.detail;
            addThought('input', `🎭 マルチキャラ会話開始: ${topic || '自由会話'}`);
            clearHistory();
        });
        
        // multichar:conversationEnd イベントを監視
        window.addEventListener('multichar:conversationEnd', () => {
            addThought('input', `🎭 マルチキャラ会話終了`);
        });
        
        console.log('✅ マルチキャラクター会話ログ監視開始');
    }
    
    /**
     * ★ マルチキャラ会話ログを直接取得するAPI
     * @returns {Array} 会話ログ配列
     */
    function getMultiCharConversationLog() {
        if (window.multiCharManager && window.multiCharManager.director) {
            const history = window.multiCharManager.director.getConversationHistory();
            return history.map(h => ({
                speaker: h.speaker,
                text: h.text,
                emotion: h.emotion,
                timestamp: h.timestamp
            }));
        }
        return [];
    }
    
    /**
     * ★ マルチキャラ会話ログからシーン分析を強制実行
     */
    async function analyzeFromMultiCharLog() {
        const log = getMultiCharConversationLog();
        if (log.length === 0) {
            console.log('🎵 マルチキャラ会話ログが空です');
            return currentScene;
        }
        
        // マルチキャラログを履歴に追加
        clearHistory();
        const recentLog = log.slice(-CONFIG.HISTORY_SIZE);
        for (const entry of recentLog) {
            conversationHistory.push({
                role: 'assistant',
                message: `【${entry.speaker}】 ${entry.text}`,
                timestamp: entry.timestamp || Date.now()
            });
        }
        
        addThought('input', `🎭 マルチキャラログから${recentLog.length}件取得`);
        
        // 強制分析
        return analyzeScene(true);
    }
    
    // ========================================
    // 初期化
    // ========================================
    
    function init() {
        console.log('🎵 BGMシーン分析システム v1.4 初期化中...');
        
        loadSettings();
        
        setTimeout(hookChatSystem, 2000);
        setTimeout(hookMultiCharacterSystem, 2500);  // ★ マルチキャラ監視追加
        setTimeout(createContextLengthUI, 3000);
        setTimeout(createAggressiveModeUI, 3200);
        setTimeout(createThoughtChatUI, 3500);
        
        window.BGMSceneAnalyzer = {
            addConversation,
            analyzeScene: () => analyzeScene(true),
            getCurrentScene,
            clearHistory,
            getHistory: () => conversationHistory,
            setHistorySize,
            setAggressiveMode,
            getConfig: () => ({ ...CONFIG }),
            getThoughtLog,
            clearThoughtLog,
            SCENES,
            // ★ マルチキャラ連携用API追加
            getMultiCharLog: getMultiCharConversationLog,
            analyzeFromMultiCharLog
        };
        
        console.log('✅ BGMシーン分析システム v1.4 初期化完了');
        console.log(`   短略的モード: ${CONFIG.AGGRESSIVE_MODE ? 'ON' : 'OFF'}`);
        console.log(`   ★ マルチキャラ会話ログ連携: ON`);
    }
    
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
    
})();

console.log('✅ BGMシーン分析システム v1.4 スクリプト読み込み完了 (マルチキャラ連携対応)');
