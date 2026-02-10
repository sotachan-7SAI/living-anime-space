// ========================================
// Gemini 一体化クライアント（2段階方式）v2.1
// Gemini 2.5 Flash でテキスト生成 → Gemini TTS Pro で音声生成
// + カンペ画像対応（Vision API）
// ========================================

export class GeminiClient {
    constructor(apiKey) {
        this.apiKey = apiKey;
        this.conversationHistory = [];
        this.systemPrompt = `あなたは感情豊かなVRMキャラクターです。

【性格】テンションの起伏が激しく、興味があるとハイテンション、つまらないとローテンション。

【返答例】
ハイ：「えええ！？マジで！？めっちゃいいじゃん！！」「きたきた！それ大好き！最高！」
ロー：「あー...なんか...うん...」「ふーん...へぇ...まぁ...」
驚き：「はぁっ！？うそでしょ！？」
嬉しい：「わーい！やったー！」

【ルール】
・1回の返答は2〜3文で完結させる
・日本語で返答
・「！」「？」「...」を使う`;

        this.voiceName = 'Zephyr';
        // テキスト生成用（高速）
        this.textModel = 'gemini-2.5-flash';
        // 音声生成用（Flash版 - 無料枠多い）
        this.ttsModel = 'gemini-2.5-flash-preview-tts';
    }

    setSystemPrompt(prompt) {
        this.systemPrompt = prompt;
    }

    clearHistory() {
        this.conversationHistory = [];
    }

    /**
     * ステップ1: テキスト生成（Gemini 2.5 Flash）
     * ★ カンペ画像がある場合はVision APIを使用
     */
    async generateText(userMessage) {
        // ★ カンペ画像があるかチェック
        const kanpeImageData = window.kanpeImageData;
        const kanpeImageDescription = window.kanpeImageDescription || '画像';
        const hasKanpeImage = kanpeImageData && kanpeImageData.startsWith('data:');
        
        // ユーザーメッセージのパーツを構築
        let userParts;
        if (hasKanpeImage) {
            // Vision API形式（テキスト + 画像）
            // data:image/jpeg;base64,XXXX の形式からbase64データを抽出
            const base64Match = kanpeImageData.match(/^data:([^;]+);base64,(.+)$/);
            if (base64Match) {
                const mimeType = base64Match[1];
                const base64Data = base64Match[2];
                
                userParts = [
                    { text: userMessage + '\n\n【📷 カンペ画像あり】' + kanpeImageDescription + 'についてもコメントしてください。' },
                    {
                        inlineData: {
                            mimeType: mimeType,
                            data: base64Data
                        }
                    }
                ];
                console.log('📷 カンペ画像をGemini Vision APIで送信');
            } else {
                userParts = [{ text: userMessage }];
            }
        } else {
            // 通常のテキストのみ
            userParts = [{ text: userMessage }];
        }
        
        // 会話履歴に追加
        this.conversationHistory.push({
            role: 'user',
            parts: userParts
        });

        // 会話履歴を構築（最新6件まで）
        const recentHistory = this.conversationHistory.slice(-6);

        const requestBody = {
            system_instruction: {
                parts: [{ text: this.systemPrompt }]
            },
            contents: recentHistory,
            generationConfig: {
                maxOutputTokens: 256,
                temperature: 0.8,
                topP: 0.9,
                topK: 40
            }
        };

        console.log('🧠 Gemini Flash でテキスト生成中...' + (hasKanpeImage ? ' (画像付き)' : ''));
        const startTime = Date.now();

        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${this.textModel}:generateContent?key=${this.apiKey}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(requestBody)
            }
        );

        const data = await response.json();
        const elapsed = Date.now() - startTime;

        if (data.error) {
            throw new Error(data.error.message);
        }

        let text = '';
        if (data.candidates && data.candidates[0] && data.candidates[0].content) {
            const parts = data.candidates[0].content.parts;
            for (const part of parts) {
                if (part.text) {
                    text = part.text;
                }
            }
        }

        // テキストが空または短すぎる場合のフォールバック
        if (!text || text.length < 5) {
            console.warn('⚠️ テキストが短すぎます、フォールバック');
            text = 'えっ！？なになに！？';
        }

        console.log(`✅ テキスト生成完了 (${elapsed}ms):`, text);

        // 会話履歴にアシスタントの応答を追加
        this.conversationHistory.push({
            role: 'model',
            parts: [{ text: text }]
        });

        return { text, elapsed };
    }

    /**
     * ステップ2: 音声生成（Gemini TTS Pro）
     */
    async generateAudio(text) {
        const requestBody = {
            contents: [{
                parts: [{ text: text }]
            }],
            generationConfig: {
                responseModalities: ["AUDIO"],
                speechConfig: {
                    voiceConfig: {
                        prebuiltVoiceConfig: {
                            voiceName: this.voiceName
                        }
                    }
                }
            }
        };

        console.log('🎤 Gemini TTS Flash で音声生成中...');
        const startTime = Date.now();

        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${this.ttsModel}:generateContent?key=${this.apiKey}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(requestBody)
            }
        );

        const data = await response.json();
        const elapsed = Date.now() - startTime;

        if (data.error) {
            throw new Error(data.error.message);
        }

        let audioData = null;
        if (data.candidates && data.candidates[0] && data.candidates[0].content) {
            const parts = data.candidates[0].content.parts;
            for (const part of parts) {
                if (part.inlineData && part.inlineData.data) {
                    const base64 = part.inlineData.data;
                    const binaryString = atob(base64);
                    const bytes = new Uint8Array(binaryString.length);
                    for (let i = 0; i < binaryString.length; i++) {
                        bytes[i] = binaryString.charCodeAt(i);
                    }
                    audioData = bytes.buffer;
                }
            }
        }

        console.log(`✅ 音声生成完了 (${elapsed}ms):`, audioData ? audioData.byteLength + ' bytes' : 'なし');

        return { audioData, elapsed };
    }

    /**
     * テキストと音声を生成（2段階）
     * @param {string} userMessage - ユーザーのメッセージ
     * @returns {Promise<{text: string, audioData: ArrayBuffer, elapsed: number}>}
     */
    async generateResponse(userMessage) {
        const totalStart = Date.now();

        // ステップ1: テキスト生成
        const textResult = await this.generateText(userMessage);

        // ステップ2: 音声生成
        const audioResult = await this.generateAudio(textResult.text);

        const totalElapsed = Date.now() - totalStart;
        console.log(`🚀 合計時間: ${totalElapsed}ms (テキスト: ${textResult.elapsed}ms + 音声: ${audioResult.elapsed}ms)`);

        return {
            text: textResult.text,
            audioData: audioResult.audioData,
            elapsed: totalElapsed
        };
    }

    /**
     * 音声データを再生
     */
    async playAudio(audioData, onStart, onEnd) {
        return new Promise((resolve, reject) => {
            try {
                const audioContext = new (window.AudioContext || window.webkitAudioContext)();
                const sampleRate = 24000;

                const byteArray = new Uint8Array(audioData);
                const samples = byteArray.length / 2;
                const audioBuffer = audioContext.createBuffer(1, samples, sampleRate);
                const channelData = audioBuffer.getChannelData(0);

                const dataView = new DataView(audioData);
                for (let i = 0; i < samples; i++) {
                    const int16 = dataView.getInt16(i * 2, true);
                    channelData[i] = int16 / 32768.0;
                }

                const source = audioContext.createBufferSource();
                source.buffer = audioBuffer;
                source.connect(audioContext.destination);

                if (onStart) onStart(audioBuffer.duration);

                source.onended = () => {
                    if (onEnd) onEnd();
                    audioContext.close();
                    resolve();
                };

                source.start(0);
                console.log('🔊 音声再生開始:', audioBuffer.duration.toFixed(2), '秒');

            } catch (error) {
                console.error('❌ 音声再生エラー:', error);
                reject(error);
            }
        });
    }
}
