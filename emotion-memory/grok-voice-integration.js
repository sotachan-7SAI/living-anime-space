/**
 * Grok Voice Integration v1.1
 * 
 * 🔗 EmotionMemoryManager と Grok Voice の統合
 * 
 * 機能:
 * 1. AIチャットUIの会話をEmotionMemoryManagerに記録
 * 2. Grok Voiceの発話を記録
 * 3. Grok Voiceのsystem promptに感情・記憶を注入
 * 4. 自動感情分析の実行
 * 
 * v1.1 変更点:
 * - DOM監視でのテキスト抽出を改善（プレフィックス除去）
 * - 重複記録を防止
 * - ユーザー発話の記録を改善
 */

(function() {
    'use strict';
    
    console.log('🔗 Grok Voice Integration v1.1 読み込み開始');
    
    class GrokVoiceIntegration {
        constructor() {
            this.manager = null;
            this.originalSendSessionConfig = null;
            this.isInitialized = false;
            
            // Grok Voiceの参照
            this.grokClient = null;
            
            // AIチャットUIの監視
            this.chatObserver = null;
            
            // 自動感情分析設定
            this.autoAnalyzeEnabled = true;
            
            // 重複防止用：最後に記録したメッセージ
            this.lastRecordedMessages = {
                user: '',
                assistant: ''
            };
            
            this.init();
        }
        
        async init() {
            // EmotionMemoryManagerの準備を待つ
            await this.waitForManager();
            
            // Grok Voice Clientのパッチ
            this.patchGrokVoiceClient();
            
            // AIチャットUIの監視
            this.observeAIChatUI();
            
            // ChatGPT Clientの監視
            this.patchChatGPTClient();
            
            // APIキーの共有
            this.syncApiKey();
            
            this.isInitialized = true;
            console.log('🔗 Grok Voice Integration v1.1 初期化完了');
        }
        
        async waitForManager() {
            return new Promise((resolve) => {
                const check = () => {
                    if (window.emotionMemoryManager) {
                        this.manager = window.emotionMemoryManager;
                        resolve();
                    } else {
                        setTimeout(check, 100);
                    }
                };
                check();
            });
        }
        
        /**
         * APIキーの同期
         */
        syncApiKey() {
            // OpenAI APIキーをEmotionMemoryManagerに共有
            const openaiKey = localStorage.getItem('openai_api_key');
            if (openaiKey && this.manager) {
                this.manager.apiKey = openaiKey;
                console.log('🔗 OpenAI APIキーをEmotionMemoryManagerに同期');
            }
        }
        
        /**
         * メッセージテキストからプレフィックスを除去
         * 「AI 」「🎙️ 」などを除去して純粋なテキストを取得
         */
        cleanMessageText(element, role) {
            if (!element) return '';
            
            // <strong>タグを除いたテキストを取得
            let text = '';
            element.childNodes.forEach(node => {
                if (node.nodeType === Node.TEXT_NODE) {
                    text += node.textContent;
                } else if (node.nodeType === Node.ELEMENT_NODE && node.tagName !== 'STRONG') {
                    text += node.textContent;
                }
            });
            
            // 前後の空白を除去
            text = text.trim();
            
            // まだプレフィックスが残っている場合は除去
            text = text.replace(/^AI\s*/i, '');
            text = text.replace(/^🎙️\s*/, '');
            text = text.replace(/^ユーザー\s*/i, '');
            text = text.replace(/^User\s*/i, '');
            
            return text.trim();
        }
        
        /**
         * 重複チェック
         */
        isDuplicate(role, text) {
            if (!text || text.length < 3) return true;
            
            // 直前のメッセージと比較
            const lastText = this.lastRecordedMessages[role];
            if (lastText === text) {
                return true;
            }
            
            // 部分一致チェック（断片的なメッセージを防ぐ）
            if (lastText && lastText.includes(text)) {
                return true;
            }
            
            return false;
        }
        
        /**
         * メッセージを記録（重複チェック付き）
         */
        recordMessage(role, text, source) {
            if (!this.manager || !text) return;
            
            // クリーンなテキストを取得
            const cleanText = text.trim();
            
            if (cleanText.length < 2) return;
            
            // 重複チェック
            if (this.isDuplicate(role, cleanText)) {
                console.log(`🔗 重複スキップ [${role}]: ${cleanText.substring(0, 30)}...`);
                return;
            }
            
            // 記録
            this.lastRecordedMessages[role] = cleanText;
            this.manager.recordConversation(role, cleanText, { source });
            console.log(`🔗 記録 [${role}] (${source}): ${cleanText.substring(0, 50)}...`);
            
            // 自動感情分析
            if (this.autoAnalyzeEnabled) {
                this.manager.analyzeEmotionFromText(cleanText, role);
            }
            
            // AI応答の場合は要約更新
            if (role === 'assistant') {
                this.manager.generateSummary();
            }
        }
        
        /**
         * GrokRealtimeClientをパッチして感情・記憶を注入
         */
        patchGrokVoiceClient() {
            const self = this;
            
            // GrokRealtimeClientのインスタンスが作成された時にフック
            const originalGrokRealtimeClient = window.GrokRealtimeClient;
            
            if (!originalGrokRealtimeClient) {
                console.log('🔗 GrokRealtimeClientをモジュールから取得待ち...');
                // モジュール版の場合は少し待つ
                setTimeout(() => this.setupGrokHooks(), 1000);
                return;
            }
            
            this.setupGrokHooks();
        }
        
        setupGrokHooks() {
            const self = this;
            
            // window.grokClientが設定されたら監視
            let grokClientCheckCount = 0;
            const checkGrokClient = () => {
                if (window.grokClient) {
                    console.log('🔗 grokClient検出、フック設定...');
                    self.hookGrokClient(window.grokClient);
                } else if (grokClientCheckCount < 100) {
                    grokClientCheckCount++;
                    setTimeout(checkGrokClient, 500);
                }
            };
            checkGrokClient();
            
            // custom.jsのgrokClient作成をフック
            const originalDefineProperty = Object.defineProperty;
            Object.defineProperty = function(obj, prop, descriptor) {
                if (obj === window && prop === 'grokClient' && descriptor.value) {
                    console.log('🔗 grokClient設定検出');
                    setTimeout(() => self.hookGrokClient(descriptor.value), 100);
                }
                return originalDefineProperty.apply(this, arguments);
            };
        }
        
        /**
         * GrokClientにフックを設定
         */
        hookGrokClient(client) {
            if (!client || client._emotionMemoryHooked) return;
            
            const self = this;
            client._emotionMemoryHooked = true;
            
            // 元のsendSessionConfigを保存
            const originalSendSessionConfig = client.sendSessionConfig.bind(client);
            
            // sendSessionConfigをオーバーライド
            client.sendSessionConfig = function() {
                console.log('🔗 sendSessionConfig フック実行');
                
                // 感情・記憶を含むシステムプロンプトを生成
                const basePrompt = localStorage.getItem('character_prompt') || 
                    'あなたは可愛いVRMキャラクターです。フレンドリーで親しみやすく、元気に会話してください。';
                
                const enhancedPrompt = self.manager 
                    ? self.manager.generateGrokSystemPrompt(basePrompt)
                    : basePrompt;
                
                console.log('🔗 強化されたプロンプト:', enhancedPrompt.substring(0, 200) + '...');
                
                // 設定を送信
                const config = {
                    type: 'session.update',
                    session: {
                        voice: client.voice,
                        instructions: enhancedPrompt,
                        input_audio_format: 'pcm16',
                        output_audio_format: 'pcm16',
                        input_audio_transcription: {
                            model: 'whisper'
                        },
                        turn_detection: {
                            type: 'server_vad',
                            threshold: 0.5,
                            prefix_padding_ms: 300,
                            silence_duration_ms: 500
                        },
                        tools: []
                    }
                };
                
                client.ws.send(JSON.stringify(config));
                console.log('🔗 感情・記憶入りセッション設定送信完了');
            };
            
            // ユーザー発話受信時（Grok Voice経由）
            // これはGrokのWhisperが認識したユーザーの音声テキスト
            const originalOnUserSpeechReceived = client.onUserSpeechReceived;
            client.onUserSpeechReceived = (text) => {
                console.log('🔗 Grok ユーザー発話:', text);
                
                // 記録（Grok Voice経由のユーザー発話）
                self.recordMessage('user', text, 'grok_voice');
                
                // 元のコールバックも呼び出す
                if (originalOnUserSpeechReceived) {
                    originalOnUserSpeechReceived(text);
                }
            };
            
            // AI応答テキスト受信時（ストリーミング）
            const originalOnTranscriptReceived = client.onTranscriptReceived;
            let currentTranscript = '';
            
            client.onTranscriptReceived = (text) => {
                currentTranscript += text;
                
                // 元のコールバックも呼び出す
                if (originalOnTranscriptReceived) {
                    originalOnTranscriptReceived(text);
                }
            };
            
            // 応答完了時に記録
            const originalOnResponseDone = client.onResponseDone;
            client.onResponseDone = () => {
                if (currentTranscript) {
                    console.log('🔗 Grok AI応答完了:', currentTranscript.substring(0, 50) + '...');
                    self.recordMessage('assistant', currentTranscript, 'grok_voice');
                }
                currentTranscript = '';
                
                // 元のコールバックも呼び出す
                if (originalOnResponseDone) {
                    originalOnResponseDone();
                }
            };
            
            console.log('🔗 GrokClient フック設定完了');
        }
        
        /**
         * AIチャットUIの会話を監視
         */
        observeAIChatUI() {
            const self = this;
            
            // テキスト入力での送信を監視
            // ボタンクリック
            document.addEventListener('click', (e) => {
                const target = e.target;
                
                // 送信ボタンを探す
                if (target.matches('#chat-send, #chat-send-btn, .chat-send-btn, [data-action="send"]') ||
                    target.closest('#chat-send, #chat-send-btn, .chat-send-btn, [data-action="send"]')) {
                    
                    const input = document.querySelector('#chat-input');
                    if (input && input.value.trim()) {
                        const userText = input.value.trim();
                        console.log('🔗 チャットUI送信:', userText);
                        self.recordMessage('user', userText, 'chat_ui_button');
                    }
                }
            });
            
            // Enterキー
            document.addEventListener('keypress', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    const target = e.target;
                    if (target.matches('#chat-input')) {
                        const userText = target.value.trim();
                        if (userText) {
                            console.log('🔗 チャットUI Enter送信:', userText);
                            self.recordMessage('user', userText, 'chat_ui_enter');
                        }
                    }
                }
            });
            
            // AI応答の監視（チャットログのDOM変更を検知）
            this.observeChatResponse();
            
            console.log('🔗 AIチャットUI監視開始');
        }
        
        /**
         * AI応答を監視（チャットログのDOM変更を検知）
         */
        observeChatResponse() {
            const self = this;
            
            const setupObserver = () => {
                const chatLog = document.querySelector('#chat-messages, #chat-log, .chat-log, .chat-messages');
                if (!chatLog) {
                    setTimeout(setupObserver, 1000);
                    return;
                }
                
                console.log('🔗 チャットログ発見:', chatLog.id || chatLog.className);
                
                // 処理済みメッセージを追跡
                const processedMessages = new WeakSet();
                
                // MutationObserverでAI応答を検知
                const observer = new MutationObserver((mutations) => {
                    mutations.forEach((mutation) => {
                        mutation.addedNodes.forEach((node) => {
                            if (node.nodeType !== Node.ELEMENT_NODE) return;
                            if (processedMessages.has(node)) return;
                            
                            // .message.ai または .message.user を検出
                            if (!node.classList?.contains('message')) return;
                            
                            const isAiMessage = node.classList.contains('ai');
                            const isUserMessage = node.classList.contains('user');
                            
                            if (isAiMessage || isUserMessage) {
                                processedMessages.add(node);
                                
                                // クリーンなテキストを抽出
                                const cleanText = self.cleanMessageText(node, isAiMessage ? 'assistant' : 'user');
                                
                                if (cleanText && cleanText.length > 1) {
                                    const role = isAiMessage ? 'assistant' : 'user';
                                    console.log(`🔗 DOM検出 [${role}]: ${cleanText.substring(0, 50)}...`);
                                    self.recordMessage(role, cleanText, 'chat_ui_dom');
                                }
                            }
                        });
                    });
                });
                
                observer.observe(chatLog, { childList: true, subtree: true });
                console.log('🔗 チャットログ監視開始');
            };
            
            setupObserver();
        }
        
        /**
         * ChatGPTClientをパッチ
         */
        patchChatGPTClient() {
            const self = this;
            
            const checkChatGPTClient = () => {
                if (window.chatgptClient && !window.chatgptClient._emotionMemoryHooked) {
                    self.hookChatGPTClient(window.chatgptClient);
                }
                setTimeout(checkChatGPTClient, 2000);
            };
            
            checkChatGPTClient();
        }
        
        /**
         * ChatGPTClientにフックを設定
         */
        hookChatGPTClient(client) {
            if (!client || client._emotionMemoryHooked) return;
            
            const self = this;
            client._emotionMemoryHooked = true;
            
            const originalSendMessage = client.sendMessage.bind(client);
            
            client.sendMessage = async function(userMessage) {
                console.log('🔗 ChatGPT sendMessage:', userMessage);
                
                // ユーザーメッセージを記録
                self.recordMessage('user', userMessage, 'chatgpt_api');
                
                // 元のメソッドを呼び出す
                const response = await originalSendMessage(userMessage);
                
                // AI応答を記録
                if (response) {
                    const responseText = typeof response === 'string' 
                        ? response 
                        : response.text || response.content || '';
                    
                    if (responseText) {
                        self.recordMessage('assistant', responseText, 'chatgpt_api');
                    }
                }
                
                return response;
            };
            
            console.log('🔗 ChatGPTClient フック設定完了');
        }
        
        /**
         * 自動感情分析の有効/無効を切り替え
         */
        setAutoAnalyze(enabled) {
            this.autoAnalyzeEnabled = enabled;
            console.log(`🔗 自動感情分析: ${enabled ? 'ON' : 'OFF'}`);
        }
        
        /**
         * 現在の感情状態をGrokに再送信
         */
        refreshGrokSession() {
            if (window.grokClient && window.grokClient.isConnected) {
                window.grokClient.sendSessionConfig();
                console.log('🔗 Grokセッション更新（感情・記憶反映）');
            }
        }
        
        /**
         * 記録をクリア（デバッグ用）
         */
        clearLastRecorded() {
            this.lastRecordedMessages = { user: '', assistant: '' };
            console.log('🔗 最終記録クリア');
        }
    }
    
    // グローバルに公開
    window.GrokVoiceIntegration = GrokVoiceIntegration;
    
    // 自動初期化
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            window.grokVoiceIntegration = new GrokVoiceIntegration();
        });
    } else {
        window.grokVoiceIntegration = new GrokVoiceIntegration();
    }
    
    console.log('🔗 Grok Voice Integration v1.1 グローバル登録完了');
    
})();
