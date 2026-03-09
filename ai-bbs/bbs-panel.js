// ========================================
// AI BBS UI パネル v1.9
// ニコ動/TikTokライブ風コメント表示
// 監視対象選択機能追加
// ChatGPT / Gemini / Grok 選択対応
// Grokへのコメント連携ON/OFF
// v1.6: #chat-messages 対応修正
// ========================================

class BBSPanel {
    constructor(agentManager) {
        this.manager = agentManager;
        this.panel = null;
        this.postsContainer = null;
        this.isMinimized = false;
        this.flowMode = false; // 流れるコメントモード
        this.flowContainer = null;
        this.flowFontSize = 36; // 流れるコメントのフォントサイズ
        
        this.init();
    }
    
    init() {
        this.createPanel();
        this.createFlowContainer();
        this.setupCallbacks();
        this.loadSettings();
    }
    
    createPanel() {
        // パネル作成
        this.panel = document.createElement('div');
        this.panel.id = 'ai-bbs-panel';
        this.panel.innerHTML = `
            <div class="bbs-header">
                <span class="bbs-title">🎭 AI BBS</span>
                <div class="bbs-controls">
                    <button class="bbs-btn bbs-flow-btn" title="流れるコメント">💨</button>
                    <button class="bbs-btn bbs-clear-btn" title="クリア">🗑️</button>
                    <button class="bbs-btn bbs-minimize-btn" title="最小化">➖</button>
                </div>
            </div>
            <div class="bbs-settings">
                <div class="bbs-setting-row">
                    <label>AIモデル:</label>
                    <select id="bbs-ai-provider">
                        <option value="grok">🤖 Grok</option>
                        <option value="openai">💬 ChatGPT</option>
                        <option value="gemini" selected>✨ Gemini</option>
                    </select>
                </div>
                <div class="bbs-setting-row">
                    <label>監視対象:</label>
                    <select id="bbs-watch-target">
                        <option value="multi">👥 マルチキャラ会話</option>
                        <option value="single">👤 AIチャット（1体）</option>
                    </select>
                </div>
                <div class="bbs-setting-row">
                    <label>エージェント数:</label>
                    <select id="bbs-agent-count">
                        <option value="5">5人（テスト）</option>
                        <option value="30">30人（フル）</option>
                    </select>
                </div>
                <div class="bbs-setting-row">
                    <label>投稿間隔:</label>
                    <select id="bbs-post-interval">
                        <option value="2000">2秒</option>
                        <option value="3000" selected>3秒</option>
                        <option value="5000">5秒</option>
                        <option value="10000">10秒</option>
                    </select>
                </div>
                <div class="bbs-setting-row">
                    <label>文字サイズ:</label>
                    <input type="range" id="bbs-flow-fontsize" min="16" max="72" value="36" step="2">
                    <span id="bbs-flow-fontsize-val" style="min-width:35px;text-align:right;font-size:11px;">36px</span>
                </div>
                <div class="bbs-setting-row bbs-toggle-row">
                    <label>Grokに見せる:</label>
                    <button id="bbs-send-to-grok" class="bbs-toggle-btn active" title="GrokがBBSコメントを参照">ON</button>
                </div>
                <div class="bbs-btn-row">
                    <button id="bbs-start-btn" class="bbs-action-btn start">▶️ 開始</button>
                    <button id="bbs-stop-btn" class="bbs-action-btn stop" disabled>⏹️ 停止</button>
                </div>
            </div>
            <div class="bbs-posts-container">
                <div class="bbs-posts"></div>
            </div>
            <div class="bbs-status">
                <span id="bbs-status-text">待機中</span>
                <span id="bbs-post-count">0件</span>
            </div>
        `;
        
        // スタイル追加
        this.addStyles();
        
        document.body.appendChild(this.panel);
        
        // 要素参照
        this.postsContainer = this.panel.querySelector('.bbs-posts');
        
        // イベント設定
        this.setupEvents();
    }
    
    createFlowContainer() {
        // 流れるコメント用コンテナ
        this.flowContainer = document.createElement('div');
        this.flowContainer.id = 'bbs-flow-container';
        this.flowContainer.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            pointer-events: none;
            z-index: 99999;
            overflow: hidden;
            display: none;
        `;
        document.body.appendChild(this.flowContainer);
    }
    
    addStyles() {
        const style = document.createElement('style');
        style.textContent = `
            #ai-bbs-panel {
                position: fixed;
                right: 20px;
                bottom: 20px;
                width: 350px;
                max-height: 580px;
                background: rgba(20, 20, 30, 0.95);
                border-radius: 12px;
                box-shadow: 0 4px 20px rgba(0,0,0,0.5);
                z-index: 10000;
                font-family: 'Segoe UI', sans-serif;
                display: flex;
                flex-direction: column;
                border: 1px solid rgba(255,255,255,0.1);
            }
            
            #ai-bbs-panel.minimized {
                max-height: 40px;
                overflow: hidden;
            }
            
            .bbs-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 10px 15px;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                border-radius: 12px 12px 0 0;
                cursor: move;
            }
            
            .bbs-title {
                color: white;
                font-weight: bold;
                font-size: 14px;
            }
            
            .bbs-controls {
                display: flex;
                gap: 5px;
            }
            
            .bbs-btn {
                background: rgba(255,255,255,0.2);
                border: none;
                border-radius: 5px;
                padding: 5px 8px;
                cursor: pointer;
                font-size: 12px;
                transition: background 0.2s;
            }
            
            .bbs-btn:hover {
                background: rgba(255,255,255,0.3);
            }
            
            .bbs-btn.active {
                background: rgba(255,255,255,0.4);
            }
            
            .bbs-settings {
                padding: 10px 15px;
                border-bottom: 1px solid rgba(255,255,255,0.1);
            }
            
            .bbs-setting-row {
                display: flex;
                align-items: center;
                gap: 10px;
                margin-bottom: 8px;
            }
            
            .bbs-setting-row label {
                color: #aaa;
                font-size: 12px;
                width: 85px;
            }
            
            .bbs-setting-row select {
                flex: 1;
                background: rgba(255,255,255,0.1);
                border: 1px solid rgba(255,255,255,0.2);
                border-radius: 5px;
                padding: 5px;
                color: white;
                font-size: 12px;
            }
            
            .bbs-toggle-row {
                margin-top: 5px;
            }
            
            .bbs-toggle-btn {
                flex: 1;
                padding: 6px 12px;
                border: none;
                border-radius: 5px;
                cursor: pointer;
                font-size: 12px;
                font-weight: bold;
                transition: all 0.2s;
                background: #555;
                color: #999;
            }
            
            .bbs-toggle-btn.active {
                background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%);
                color: white;
            }
            
            .bbs-btn-row {
                display: flex;
                gap: 10px;
                margin-top: 10px;
            }
            
            .bbs-action-btn {
                flex: 1;
                padding: 8px;
                border: none;
                border-radius: 5px;
                cursor: pointer;
                font-size: 13px;
                font-weight: bold;
                transition: all 0.2s;
            }
            
            .bbs-action-btn.start {
                background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%);
                color: white;
            }
            
            .bbs-action-btn.stop {
                background: linear-gradient(135deg, #cb2d3e 0%, #ef473a 100%);
                color: white;
            }
            
            .bbs-action-btn:disabled {
                opacity: 0.5;
                cursor: not-allowed;
            }
            
            .bbs-posts-container {
                flex: 1;
                overflow-y: auto;
                max-height: 250px;
            }
            
            .bbs-posts {
                padding: 10px;
            }
            
            .bbs-post {
                display: flex;
                gap: 8px;
                padding: 8px;
                margin-bottom: 8px;
                background: rgba(255,255,255,0.05);
                border-radius: 8px;
                animation: fadeIn 0.3s ease;
            }
            
            @keyframes fadeIn {
                from { opacity: 0; transform: translateY(-10px); }
                to { opacity: 1; transform: translateY(0); }
            }
            
            .bbs-post-icon {
                font-size: 18px;
                flex-shrink: 0;
            }
            
            .bbs-post-content {
                flex: 1;
                min-width: 0;
            }
            
            .bbs-post-name {
                font-size: 11px;
                font-weight: bold;
                margin-bottom: 3px;
            }
            
            .bbs-post-text {
                color: #eee;
                font-size: 13px;
                line-height: 1.4;
                word-wrap: break-word;
            }
            
            .bbs-post-time {
                color: #666;
                font-size: 10px;
                margin-top: 3px;
            }
            
            .bbs-status {
                display: flex;
                justify-content: space-between;
                padding: 8px 15px;
                background: rgba(0,0,0,0.3);
                border-radius: 0 0 12px 12px;
                color: #888;
                font-size: 11px;
            }
            
            /* 流れるコメント */
            .bbs-flow-comment {
                position: absolute;
                white-space: nowrap;
                font-size: 36px;
                font-weight: bold;
                text-shadow:
                    -2px -2px 0 rgba(0,0,0,0.9),
                     2px -2px 0 rgba(0,0,0,0.9),
                    -2px  2px 0 rgba(0,0,0,0.9),
                     2px  2px 0 rgba(0,0,0,0.9),
                     0    0  8px rgba(0,0,0,0.6);
                background: rgba(0,0,0,0.25);
                padding: 2px 12px;
                border-radius: 6px;
                animation: flowComment 10s linear forwards;
                pointer-events: none;
                letter-spacing: 0.5px;
            }
            
            @keyframes flowComment {
                from { transform: translateX(100vw); }
                to { transform: translateX(-100%); }
            }
            
            /* スクロールバー */
            .bbs-posts-container::-webkit-scrollbar {
                width: 6px;
            }
            
            .bbs-posts-container::-webkit-scrollbar-track {
                background: rgba(255,255,255,0.05);
            }
            
            .bbs-posts-container::-webkit-scrollbar-thumb {
                background: rgba(255,255,255,0.2);
                border-radius: 3px;
            }
        `;
        document.head.appendChild(style);
    }
    
    setupEvents() {
        // 開始ボタン
        this.panel.querySelector('#bbs-start-btn').addEventListener('click', () => this.start());
        
        // 停止ボタン
        this.panel.querySelector('#bbs-stop-btn').addEventListener('click', () => this.stop());
        
        // 最小化ボタン
        this.panel.querySelector('.bbs-minimize-btn').addEventListener('click', () => this.toggleMinimize());
        
        // クリアボタン
        this.panel.querySelector('.bbs-clear-btn').addEventListener('click', () => this.clearPosts());
        
        // 流れるコメントボタン
        this.panel.querySelector('.bbs-flow-btn').addEventListener('click', () => this.toggleFlowMode());
        
        // AIプロバイダー変更
        this.panel.querySelector('#bbs-ai-provider').addEventListener('change', (e) => {
            this.manager.setProvider(e.target.value);
            this.saveSettings();
        });
        
        // 監視対象変更
        this.panel.querySelector('#bbs-watch-target').addEventListener('change', (e) => {
            this.manager.setWatchTarget(e.target.value);
            this.saveSettings();
        });
        
        // エージェント数変更
        this.panel.querySelector('#bbs-agent-count').addEventListener('change', (e) => {
            if (e.target.value === '30') {
                this.manager.initFullAgents();
            } else {
                this.manager.initDefaultAgents();
            }
            this.saveSettings();
        });
        
        // 投稿間隔変更
        this.panel.querySelector('#bbs-post-interval').addEventListener('change', (e) => {
            this.manager.postInterval = parseInt(e.target.value);
            this.saveSettings();
        });
        
        // 流れるコメント文字サイズ
        this.panel.querySelector('#bbs-flow-fontsize').addEventListener('input', (e) => {
            this.flowFontSize = parseInt(e.target.value);
            this.panel.querySelector('#bbs-flow-fontsize-val').textContent = this.flowFontSize + 'px';
            this.saveSettings();
        });
        
        // Grokに見せるトグル
        this.panel.querySelector('#bbs-send-to-grok').addEventListener('click', (e) => {
            const btn = e.target;
            const isActive = btn.classList.toggle('active');
            btn.textContent = isActive ? 'ON' : 'OFF';
            this.manager.setSendToGrok(isActive);
            this.saveSettings();
        });
        
        // ドラッグ移動
        this.setupDrag();
    }
    
    setupDrag() {
        const header = this.panel.querySelector('.bbs-header');
        let isDragging = false;
        let startX, startY, startLeft, startTop;
        
        header.addEventListener('mousedown', (e) => {
            isDragging = true;
            startX = e.clientX;
            startY = e.clientY;
            const rect = this.panel.getBoundingClientRect();
            startLeft = rect.left;
            startTop = rect.top;
        });
        
        document.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            const dx = e.clientX - startX;
            const dy = e.clientY - startY;
            this.panel.style.left = (startLeft + dx) + 'px';
            this.panel.style.top = (startTop + dy) + 'px';
            this.panel.style.right = 'auto';
            this.panel.style.bottom = 'auto';
        });
        
        document.addEventListener('mouseup', () => {
            isDragging = false;
        });
    }
    
    setupCallbacks() {
        // 新規投稿時のコールバック
        this.manager.onNewPost = (post) => {
            this.addPostToUI(post);
            this.updateStatus();
            
            if (this.flowMode) {
                this.addFlowComment(post);
            }
        };
    }
    
    addPostToUI(post) {
        const postEl = document.createElement('div');
        postEl.className = 'bbs-post';
        postEl.innerHTML = `
            <span class="bbs-post-icon">${post.agentIcon}</span>
            <div class="bbs-post-content">
                <div class="bbs-post-name" style="color: ${post.agentColor}">${post.agentName}</div>
                <div class="bbs-post-text">${this.escapeHtml(post.text)}</div>
                <div class="bbs-post-time">${this.formatTime(post.timestamp)}</div>
            </div>
        `;
        
        this.postsContainer.insertBefore(postEl, this.postsContainer.firstChild);
        
        // 古い投稿を削除（表示は50件まで）
        while (this.postsContainer.children.length > 50) {
            this.postsContainer.removeChild(this.postsContainer.lastChild);
        }
    }
    
    addFlowComment(post) {
        const comment = document.createElement('div');
        comment.className = 'bbs-flow-comment';
        comment.style.color = post.agentColor;
        comment.style.top = (Math.random() * 70 + 10) + '%';
        comment.style.fontSize = this.flowFontSize + 'px';
        comment.textContent = `${post.agentIcon} ${post.text}`;
        
        this.flowContainer.appendChild(comment);
        
        // アニメーション終了後に削除
        setTimeout(() => {
            comment.remove();
        }, 10500);
    }
    
    async start() {
        // プロバイダーに応じてAPIキーを設定
        const provider = this.panel.querySelector('#bbs-ai-provider').value;
        this.manager.setProvider(provider);
        
        const openaiKey = window.API_SETTINGS?.chatgpt || localStorage.getItem('openai_api_key');
        const geminiKey = window.API_SETTINGS?.gemini || localStorage.getItem('gemini_api_key');
        const grokKey = window.API_SETTINGS?.grok_bbs || localStorage.getItem('grok_bbs_api_key') || window.API_SETTINGS?.grok || localStorage.getItem('grok_api_key');
        
        // APIキー設定
        this.manager.setOpenAIApiKey(openaiKey);
        this.manager.setApiKey(geminiKey);
        this.manager.setGrokApiKey(grokKey);
        
        // 選択されたプロバイダーのキーがあるか確認
        let hasKey = false;
        switch (provider) {
            case 'openai':
                hasKey = !!openaiKey;
                break;
            case 'gemini':
                hasKey = !!geminiKey;
                break;
            case 'grok':
                hasKey = !!grokKey;
                break;
        }
        
        if (!hasKey) {
            const providerNames = { openai: 'ChatGPT', gemini: 'Gemini', grok: 'Grok' };
            alert(`${providerNames[provider]} APIキーを設定してください`);
            return;
        }
        
        console.log(`💬 BBS: ${provider} APIを使用`);
        
        // 監視対象を設定
        const watchTarget = this.panel.querySelector('#bbs-watch-target').value;
        this.manager.setWatchTarget(watchTarget);
        
        // UI更新
        this.panel.querySelector('#bbs-start-btn').disabled = true;
        this.panel.querySelector('#bbs-stop-btn').disabled = false;
        this.panel.querySelector('#bbs-status-text').textContent = `実行中 (${provider})`;
        
        // 会話コンテキストを更新
        this.updateConversationContext();
        
        // リアルタイム会話監視開始
        this.setupConversationWatcher();
        
        // 開始
        await this.manager.start();
    }
    
    stop() {
        this.manager.stop();
        
        // 会話監視停止
        this.stopConversationWatcher();
        
        // UI更新
        this.panel.querySelector('#bbs-start-btn').disabled = false;
        this.panel.querySelector('#bbs-stop-btn').disabled = true;
        this.panel.querySelector('#bbs-status-text').textContent = '停止';
    }
    
    // 会話コンテキストを更新（監視対象に応じて）
    updateConversationContext() {
        const watchTarget = this.manager.watchTarget;
        
        if (watchTarget === 'multi') {
            // マルチキャラ会話の履歴を取得
            this.updateMultiCharContext();
        } else {
            // AIチャット（1体）の履歴を取得
            this.updateSingleChatContext();
        }
        
        // 定期的に更新
        if (this.manager.isRunning) {
            setTimeout(() => this.updateConversationContext(), 5000);
        }
    }
    
    // マルチキャラ会話の履歴を取得
    updateMultiCharContext() {
        if (window.multiCharManager?.director?.conversationHistory) {
            const history = window.multiCharManager.director.conversationHistory;
            const recentHistory = history.slice(-10).map(h => `${h.name}: ${h.text}`).join('\n');
            this.manager.updateConversationContext(recentHistory);
        }
    }
    
    // AIチャット（1体）の履歴を取得
    updateSingleChatContext() {
        // v1.6: チャットパネルの会話履歴を取得（#chat-messagesに対応）
        const chatMessages = document.querySelectorAll('#chat-messages .message, #chat-history .message, #chat-panel .chat-message');
        if (chatMessages.length > 0) {
            const messages = [];
            chatMessages.forEach(msg => {
                const isUser = msg.classList.contains('user') || msg.classList.contains('user-message');
                // v1.6: .message-textがあればそちらを優先、なければ直接textContent
                const textEl = msg.querySelector('.message-text');
                const text = textEl ? textEl.textContent?.trim() : msg.textContent?.trim();
                if (text) {
                    messages.push(isUser ? `ユーザー: ${text}` : `キャラクター: ${text}`);
                }
            });
            const recentMessages = messages.slice(-10).join('\n');
            this.manager.updateConversationContext(recentMessages);
            console.log(`📝 BBS: 会話コンテキスト更新 (${chatMessages.length}件)`);
        }
        
        // または window.chatHistory があれば使用
        if (window.chatHistory && Array.isArray(window.chatHistory)) {
            const recentHistory = window.chatHistory.slice(-10).map(h => {
                return h.role === 'user' ? `ユーザー: ${h.content}` : `キャラクター: ${h.content}`;
            }).join('\n');
            this.manager.updateConversationContext(recentHistory);
        }
    }
    
    // リアルタイム会話監視をセットアップ
    setupConversationWatcher() {
        const watchTarget = this.manager.watchTarget;
        
        if (watchTarget === 'multi') {
            this.setupMultiCharWatcher();
        } else {
            this.setupSingleChatWatcher();
        }
        
        console.log(`👀 会話監視開始: ${watchTarget === 'multi' ? 'マルチキャラ' : 'AIチャット'}`);
    }
    
    // マルチキャラ会話の監視
    setupMultiCharWatcher() {
        this.lastMultiHistoryLength = 0;
        
        this.watcherInterval = setInterval(() => {
            if (!this.manager.isRunning) return;
            
            const history = window.multiCharManager?.director?.conversationHistory;
            if (history && history.length > this.lastMultiHistoryLength) {
                const newMessages = history.slice(this.lastMultiHistoryLength);
                newMessages.forEach(msg => {
                    this.manager.addLatestMessage(msg.name, msg.text);
                    console.log(`🎭 [マルチ] 新発言: ${msg.name}「${msg.text.substring(0, 30)}...」`);
                });
                this.lastMultiHistoryLength = history.length;
            }
        }, 1000);
    }
    
    // AIチャット（1体）の監視
    setupSingleChatWatcher() {
        this.lastSingleHistoryLength = 0;
        
        // v1.6: DOMの変更を監視（#chat-messagesに対応）
        const chatContainer = document.querySelector('#chat-messages, #chat-history, #chat-panel .chat-messages');
        if (chatContainer) {
            this.chatObserver = new MutationObserver((mutations) => {
                if (!this.manager.isRunning) return;
                
                mutations.forEach(mutation => {
                    mutation.addedNodes.forEach(node => {
                        if (node.nodeType === Node.ELEMENT_NODE && node.classList?.contains('message')) {
                            const isUser = node.classList.contains('user') || node.classList.contains('user-message');
                            const text = node.textContent?.trim();
                            if (text) {
                                const speaker = isUser ? 'ユーザー' : 'キャラクター';
                                this.manager.addLatestMessage(speaker, text);
                                console.log(`💬 [AIチャット] 新発言検出: ${speaker}「${text.substring(0, 30)}...」`);
                            }
                        }
                    });
                });
            });
            
            this.chatObserver.observe(chatContainer, { childList: true, subtree: true });
        }
        
        // フォールバック: window.chatHistory を監視
        this.watcherInterval = setInterval(() => {
            if (!this.manager.isRunning) return;
            
            if (window.chatHistory && Array.isArray(window.chatHistory)) {
                if (window.chatHistory.length > this.lastSingleHistoryLength) {
                    const newMessages = window.chatHistory.slice(this.lastSingleHistoryLength);
                    newMessages.forEach(msg => {
                        const speaker = msg.role === 'user' ? 'ユーザー' : 'キャラクター';
                        this.manager.addLatestMessage(speaker, msg.content);
                        console.log(`💬 [AIチャット] ポーリング検出: ${speaker}「${msg.content.substring(0, 30)}...」`);
                    });
                    this.lastSingleHistoryLength = window.chatHistory.length;
                }
            }
        }, 1000);
    }
    
    stopConversationWatcher() {
        if (this.watcherInterval) {
            clearInterval(this.watcherInterval);
            this.watcherInterval = null;
        }
        if (this.chatObserver) {
            this.chatObserver.disconnect();
            this.chatObserver = null;
        }
        console.log('👀 会話監視停止');
    }
    
    updateStatus() {
        this.panel.querySelector('#bbs-post-count').textContent = `${this.manager.posts.length}件`;
    }
    
    toggleMinimize() {
        this.isMinimized = !this.isMinimized;
        this.panel.classList.toggle('minimized', this.isMinimized);
        this.panel.querySelector('.bbs-minimize-btn').textContent = this.isMinimized ? '➕' : '➖';
    }
    
    toggleFlowMode() {
        this.flowMode = !this.flowMode;
        this.flowContainer.style.display = this.flowMode ? 'block' : 'none';
        this.panel.querySelector('.bbs-flow-btn').classList.toggle('active', this.flowMode);
    }
    
    clearPosts() {
        this.manager.clearPosts();
        this.postsContainer.innerHTML = '';
        this.updateStatus();
    }
    
    saveSettings() {
        const settings = {
            provider: this.panel.querySelector('#bbs-ai-provider').value,
            watchTarget: this.panel.querySelector('#bbs-watch-target').value,
            agentCount: this.panel.querySelector('#bbs-agent-count').value,
            postInterval: this.panel.querySelector('#bbs-post-interval').value,
            sendToGrok: this.panel.querySelector('#bbs-send-to-grok').classList.contains('active'),
            flowFontSize: this.flowFontSize,
            autoStart: this.manager.isRunning,  // ★ 動作中なら次回も自動開始
            flowMode: this.flowMode              // ★ 流れる表示状態を保存
        };
        localStorage.setItem('ai-bbs-settings', JSON.stringify(settings));
    }
    
    loadSettings() {
        try {
            const saved = localStorage.getItem('ai-bbs-settings');
            const settings = saved ? JSON.parse(saved) : null;

            // ========================================
            // デフォルト値（初回起動 or 設定なし時）
            // ========================================
            const defaults = {
                provider: 'gemini',   // ★ デフォルトGemini
                watchTarget: 'multi',
                agentCount: '5',
                postInterval: '3000',
                sendToGrok: true,
                flowFontSize: 36,
                autoStart: true,      // ★ 自動開始ON
                flowMode: true        // ★ 流れる表示ON
            };

            const s = settings ? Object.assign({}, defaults, settings) : defaults;

            // プロバイダ適用
            this.panel.querySelector('#bbs-ai-provider').value = s.provider;
            this.manager.setProvider(s.provider);

            // 監視対象
            this.panel.querySelector('#bbs-watch-target').value = s.watchTarget;
            this.manager.setWatchTarget(s.watchTarget);

            // エージェント数・投稿間隔
            this.panel.querySelector('#bbs-agent-count').value = s.agentCount;
            this.panel.querySelector('#bbs-post-interval').value = s.postInterval;
            this.manager.postInterval = parseInt(s.postInterval) || 3000;
            if (s.agentCount === '30') this.manager.initFullAgents();

            // 流れるコメント文字サイズ
            this.flowFontSize = s.flowFontSize;
            this.panel.querySelector('#bbs-flow-fontsize').value = this.flowFontSize;
            this.panel.querySelector('#bbs-flow-fontsize-val').textContent = this.flowFontSize + 'px';

            // Grokに見せるトグル
            const sendToGrokBtn = this.panel.querySelector('#bbs-send-to-grok');
            sendToGrokBtn.classList.toggle('active', s.sendToGrok);
            sendToGrokBtn.textContent = s.sendToGrok ? 'ON' : 'OFF';
            this.manager.setSendToGrok(s.sendToGrok);

            // ★ 流れる表示モード自動ON
            if (s.flowMode && !this.flowMode) {
                setTimeout(() => this.toggleFlowMode(), 500);
            }

            // ★ 自動開始（設定なし初回 or autoStart=true の場合）
            if (s.autoStart) {
                setTimeout(() => {
                    const startBtn = this.panel.querySelector('#bbs-start-btn');
                    if (startBtn && !startBtn.disabled) {
                        startBtn.click();
                        console.log('🎭 AI BBS 自動開始（デフォルト設定）');
                    }
                }, 2000);
            }

        } catch (e) {
            console.warn('BBS設定の読み込み失敗:', e);
        }
    }
    
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    formatTime(date) {
        return date.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    }
    
    // パネル表示/非表示
    show() {
        this.panel.style.display = 'flex';
    }
    
    hide() {
        this.panel.style.display = 'none';
    }
    
    toggle() {
        if (this.panel.style.display === 'none') {
            this.show();
        } else {
            this.hide();
        }
    }
}

// グローバル初期化関数
window.initAIBBS = function() {
    if (window.bbsAgentManager) return;
    
    const { BBSAgentManager } = window;
    window.bbsAgentManager = new BBSAgentManager();
    window.bbsPanel = new BBSPanel(window.bbsAgentManager);
    
    console.log('🎭 AI BBS システム初期化完了');
};
