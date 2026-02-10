/**
 * OpenAI Realtime API Client
 * リアルタイム音声会話のための WebSocket クライアント
 */

export class RealtimeAPIClient {
    constructor(apiKey, onAudioReceived, onTranscriptReceived, voice = 'alloy') {
        this.apiKey = apiKey;
        this.ws = null;
        this.isConnected = false;
        this.onAudioReceived = onAudioReceived; // 音声データを受信した時のコールバック
        this.onTranscriptReceived = onTranscriptReceived; // テキストを受信した時のコールバック
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        this.mediaRecorder = null;
        this.audioQueue = [];
        this.isPlaying = false;
        this.voice = voice; // 声質：alloy, echo, fable, onyx, nova, shimmer
    }
    
    /**
     * WebSocket接続を確立
     */
    async connect() {
        return new Promise((resolve, reject) => {
            console.log('🔌 OpenAI Realtime API に接続中...');
            
            // WebSocket URLにAuthorizationをパラメータとして含める
            const url = `wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-10-01`;
            
            // WebSocketを作成（プロトコルヘッダーでAPIキーを送る）
            this.ws = new WebSocket(url, [
                'realtime',
                `openai-insecure-api-key.${this.apiKey}`,
                'openai-beta.realtime-v1'
            ]);
            
            this.ws.onopen = () => {
                console.log('✅ Realtime API 接続成功！');
                this.isConnected = true;
                
                // セッション設定を送信（APIキーを含む）
                this.ws.send(JSON.stringify({
                    type: 'session.update',
                    session: {
                        modalities: ['text', 'audio'],
                        instructions: 'あなたは可愛いVRMキャラクターです。フレンドリーで親しみやすく、元気に会話してください。',
                        voice: this.voice,
                        input_audio_format: 'pcm16',
                        output_audio_format: 'pcm16',
                        input_audio_transcription: {
                            model: 'whisper-1'
                        },
                        turn_detection: {
                            type: 'server_vad',
                            threshold: 0.5,
                            prefix_padding_ms: 300,
                            silence_duration_ms: 500
                        }
                    }
                }));
                
                resolve();
            };
            
            this.ws.onerror = (error) => {
                console.error('❌ WebSocket エラー:', error);
                reject(error);
            };
            
            this.ws.onclose = () => {
                console.log('🔌 Realtime API 切断');
                this.isConnected = false;
            };
            
            this.ws.onmessage = (event) => {
                this.handleServerMessage(event.data);
            };
        });
    }
    
    /**
     * サーバーからのメッセージを処理
     */
    handleServerMessage(data) {
        const message = JSON.parse(data);
        
        // 全てのメッセージタイプをログ出力
        console.log('📨 APIメッセージ:', message.type);
        
        switch (message.type) {
            case 'session.created':
                console.log('📝 セッション作成:', message.session);
                break;
                
            case 'session.updated':
                console.log('🔄 セッション更新');
                break;
                
            case 'conversation.item.created':
                console.log('💬 会話アイテム作成');
                break;
                
            case 'response.audio.delta':
                // 音声データのストリーミング受信
                this.handleAudioDelta(message.delta);
                break;
                
            case 'response.audio.done':
                console.log('🎵 音声受信完了');
                break;
                
            case 'response.text.delta':
                // テキストのストリーミング受信
                if (this.onTranscriptReceived) {
                    this.onTranscriptReceived(message.delta);
                }
                break;
                
            case 'response.text.done':
                console.log('📝 テキスト受信完了:', message.text);
                break;
                
            case 'input_audio_buffer.speech_started':
                console.log('🎤 発話検出開始');
                break;
                
            case 'input_audio_buffer.speech_stopped':
                console.log('🎤 発話検出終了');
                break;
                
            case 'error':
                console.error('❌ サーバーエラー:', message.error);
                break;
                
            default:
                console.log('📨 メッセージ受信:', message.type);
        }
    }
    
    /**
     * 音声データを処理
     */
    handleAudioDelta(delta) {
        console.log('🎵 音声データ受信:', delta ? delta.substring(0, 50) : 'null');
        
        if (!delta) {
            console.warn('⚠️ 空の音声データ');
            return;
        }
        
        try {
            // Base64デコード
            const audioData = atob(delta);
            const arrayBuffer = new ArrayBuffer(audioData.length);
            const view = new Uint8Array(arrayBuffer);
            
            for (let i = 0; i < audioData.length; i++) {
                view[i] = audioData.charCodeAt(i);
            }
            
            // PCM16 を AudioBuffer に変換
            const int16Array = new Int16Array(arrayBuffer);
            const float32Array = new Float32Array(int16Array.length);
            
            for (let i = 0; i < int16Array.length; i++) {
                float32Array[i] = int16Array[i] / 32768.0;
            }
            
            // キューに追加
            this.audioQueue.push(float32Array);
            
            // 再生開始
            if (!this.isPlaying) {
                this.playAudioQueue();
            }
            
            // コールバック実行（リップシンク用）
            if (this.onAudioReceived) {
                this.onAudioReceived(float32Array);
            }
        } catch (error) {
            console.error('❗ 音声デコードエラー:', error);
        }
    }
    
    /**
     * 音声キューを再生
     */
    async playAudioQueue() {
        if (this.audioQueue.length === 0) {
            this.isPlaying = false;
            return;
        }
        
        this.isPlaying = true;
        const audioData = this.audioQueue.shift();
        
        // AudioBufferを作成
        const audioBuffer = this.audioContext.createBuffer(
            1, // モノラル
            audioData.length,
            24000 // サンプルレート
        );
        
        audioBuffer.getChannelData(0).set(audioData);
        
        // 再生
        const source = this.audioContext.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(this.audioContext.destination);
        
        source.onended = () => {
            this.playAudioQueue(); // 次の音声を再生
        };
        
        source.start();
    }
    
    /**
     * マイク入力を開始
     */
    async startMicrophone() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ 
                audio: true  // シンプルな設定に変更
            });
            
            console.log('🎤 マイク起動成功');
            
            // MediaRecorderを使用して音声を送信
            this.mediaRecorder = new MediaRecorder(stream);
            
            this.mediaRecorder.ondataavailable = async (event) => {
                if (event.data.size > 0 && this.isConnected) {
                    // Blob を ArrayBuffer に変換
                    const arrayBuffer = await event.data.arrayBuffer();
                    const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
                    
                    // 音声データを送信
                    this.ws.send(JSON.stringify({
                        type: 'input_audio_buffer.append',
                        audio: base64
                    }));
                }
            };
            
            // 100msごとにデータを送信
            this.mediaRecorder.start(100);
            
            return true;
        } catch (error) {
            console.error('❌ マイクアクセスエラー:', error);
            return false;
        }
    }
    
    /**
     * マイク入力を停止
     */
    stopMicrophone() {
        if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
            this.mediaRecorder.stop();
            this.mediaRecorder.stream.getTracks().forEach(track => track.stop());
            console.log('🎤 マイク停止');
        }
    }
    
    /**
     * テキストメッセージを送信
     */
    sendText(text) {
        if (!this.isConnected) {
            console.error('❌ 未接続');
            return;
        }
        
        this.ws.send(JSON.stringify({
            type: 'conversation.item.create',
            item: {
                type: 'message',
                role: 'user',
                content: [{
                    type: 'input_text',
                    text: text
                }]
            }
        }));
        
        // レスポンス生成を要求（音声出力を明示的に指定）
        this.ws.send(JSON.stringify({
            type: 'response.create',
            response: {
                modalities: ['text', 'audio'],
                voice: this.voice  // 声質も指定
            }
        }));
        
        console.log('📤 音声リクエスト送信:', this.voice);
    }
    
    /**
     * 会話を中断
     */
    interrupt() {
        if (!this.isConnected) return;
        
        this.ws.send(JSON.stringify({
            type: 'response.cancel'
        }));
        
        // 音声キューをクリア
        this.audioQueue = [];
        this.isPlaying = false;
    }
    
    /**
     * 接続を切断
     */
    disconnect() {
        this.stopMicrophone();
        
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
        
        this.isConnected = false;
        console.log('🔌 切断完了');
    }
}
