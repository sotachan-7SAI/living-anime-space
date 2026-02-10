/**
 * ChatGPT API Client with Auto Motion v2.2
 * 
 * 修正: ヘッダーエンコーディング問題を解決
 * + カンペ画像対応（Vision API）
 */

export class ChatGPTClient {
    constructor(apiKey) {
        // APIキーをサニタイズ（ASCII文字のみ）
        this.apiKey = apiKey ? String(apiKey).trim() : '';
        this.conversationHistory = [];
        this.systemPrompt = 'あなたは親しみやすく、フレンドリーなVRMキャラクターです。';
        this.maxHistoryLength = 10;
        
        // 自動モーション設定
        this.autoMotionMode = 'preset';
        this.onMotionDetected = null;
    }
    
    /**
     * APIキーをlocalStorageに保存
     */
    static saveApiKey(apiKey) {
        try {
            localStorage.setItem('openai_api_key', apiKey);
            console.log('💾 OpenAI APIキーを保存しました');
        } catch (e) {
            console.warn('APIキー保存失敗:', e);
        }
    }
    
    /**
     * localStorageからAPIキーを読み込み
     */
    static loadApiKey() {
        try {
            const key = localStorage.getItem('openai_api_key');
            if (key) {
                console.log('🔑 保存されたOpenAI APIキーを読み込みました');
            }
            return key;
        } catch (e) {
            console.warn('APIキー読み込み失敗:', e);
            return null;
        }
    }
    
    /**
     * システムプロンプトを更新
     */
    setSystemPrompt(prompt) {
        this.systemPrompt = prompt;
        console.log('🎭 性格設定を更新');
    }
    
    /**
     * 会話履歴をクリア
     */
    clearHistory() {
        this.conversationHistory = [];
        console.log('🗑️ 会話履歴をクリア');
    }
    
    /**
     * 自動モーションモードを設定
     */
    setAutoMotionMode(mode) {
        this.autoMotionMode = mode;
        console.log('🎬 自動モーションモード:', mode);
    }
    
    /**
     * モーション検出コールバックを設定
     */
    setMotionCallback(callback) {
        this.onMotionDetected = callback;
    }
    
    /**
     * APIキーが有効かチェック
     */
    isApiKeyValid() {
        if (!this.apiKey) return false;
        // sk- で始まる文字列かチェック
        return /^sk-[A-Za-z0-9_-]+$/.test(this.apiKey);
    }
    
    /**
     * ChatGPT APIでメッセージを送信
     * カンペ画像がある場合はVision APIを使用
     */
    async sendMessage(userMessage) {
        // APIキーチェック
        if (!this.apiKey) {
            throw new Error('APIキーが設定されていません');
        }
        
        try {
            // ★ カンペ画像があるかチェック
            const kanpeImageData = window.kanpeImageData;
            const kanpeImageDescription = window.kanpeImageDescription || '画像';
            const hasKanpeImage = kanpeImageData && kanpeImageData.startsWith('data:');
            
            // ユーザーメッセージを構築
            let userContent;
            if (hasKanpeImage) {
                // Vision API形式（テキスト + 画像）
                userContent = [
                    {
                        type: 'text',
                        text: userMessage + '\n\n【📷 カンペ画像あり】' + kanpeImageDescription + 'についてもコメントしてください。'
                    },
                    {
                        type: 'image_url',
                        image_url: {
                            url: kanpeImageData,
                            detail: 'low'
                        }
                    }
                ];
                console.log('📷 カンペ画像をVision APIで送信');
            } else {
                // 通常のテキストのみ
                userContent = userMessage;
            }
            
            this.conversationHistory.push({
                role: 'user',
                content: userContent
            });
            
            if (this.conversationHistory.length > this.maxHistoryLength * 2) {
                this.conversationHistory = this.conversationHistory.slice(-this.maxHistoryLength * 2);
            }
            
            // Vision API対応のモデルを使用
            const model = hasKanpeImage ? 'gpt-4o' : 'gpt-4o-mini';
            
            const response = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + this.apiKey
                },
                body: JSON.stringify({
                    model: model,
                    messages: [
                        {
                            role: 'system',
                            content: this.systemPrompt
                        },
                        ...this.conversationHistory
                    ],
                    temperature: 0.8,
                    max_tokens: 500,
                    presence_penalty: 0.6,
                    frequency_penalty: 0.3
                })
            });
            
            if (!response.ok) {
                const error = await response.json();
                throw new Error('API Error: ' + (error.error?.message || response.statusText));
            }
            
            const data = await response.json();
            const assistantMessage = data.choices[0].message.content;
            
            this.conversationHistory.push({
                role: 'assistant',
                content: assistantMessage
            });
            
            console.log('🤖 ChatGPT応答:', assistantMessage);
            
            return {
                text: assistantMessage,
                usage: data.usage
            };
            
        } catch (error) {
            console.error('❌ ChatGPT APIエラー:', error);
            throw error;
        }
    }
    
    /**
     * ストリーミングでメッセージを送信
     */
    async sendMessageStream(userMessage, onChunk) {
        // APIキーチェック
        if (!this.apiKey) {
            throw new Error('APIキーが設定されていません');
        }
        
        try {
            this.conversationHistory.push({
                role: 'user',
                content: userMessage
            });
            
            if (this.conversationHistory.length > this.maxHistoryLength * 2) {
                this.conversationHistory = this.conversationHistory.slice(-this.maxHistoryLength * 2);
            }
            
            // ヘッダーを安全に構築（テンプレートリテラルを避ける）
            const authHeader = 'Bearer ' + this.apiKey;
            
            const response = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': authHeader
                },
                body: JSON.stringify({
                    model: 'gpt-4o-mini',
                    messages: [
                        {
                            role: 'system',
                            content: this.systemPrompt
                        },
                        ...this.conversationHistory
                    ],
                    temperature: 0.8,
                    max_tokens: 500,
                    presence_penalty: 0.6,
                    frequency_penalty: 0.3,
                    stream: true
                })
            });
            
            if (!response.ok) {
                const errorText = await response.text();
                let errorMessage = response.statusText;
                try {
                    const errorJson = JSON.parse(errorText);
                    errorMessage = errorJson.error?.message || errorMessage;
                } catch (e) {}
                throw new Error('API Error: ' + errorMessage);
            }
            
            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let fullText = '';
            
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                
                const chunk = decoder.decode(value);
                const lines = chunk.split('\n').filter(function(line) { return line.trim() !== ''; });
                
                for (let i = 0; i < lines.length; i++) {
                    const line = lines[i];
                    if (line.startsWith('data: ')) {
                        const data = line.slice(6);
                        
                        if (data === '[DONE]') {
                            break;
                        }
                        
                        try {
                            const parsed = JSON.parse(data);
                            const content = parsed.choices[0]?.delta?.content;
                            
                            if (content) {
                                fullText += content;
                                onChunk(content);
                            }
                        } catch (e) {
                            // JSONパースエラーは無視
                        }
                    }
                }
            }
            
            this.conversationHistory.push({
                role: 'assistant',
                content: fullText
            });
            
            console.log('🤖 ChatGPT応答完了');
            
            return {
                text: fullText
            };
            
        } catch (error) {
            console.error('❌ ChatGPT APIエラー:', error);
            throw error;
        }
    }
}
