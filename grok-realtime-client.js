/**
 * Grok Voice Agent API Client (xAI)
 * リアルタイム音声会話のための WebSocket クライアント
 * OpenAI Realtime API互換仕様
 * 
 * 声の種類: Ara (女性/温かい), Rex (男性/自信), Sal (中性/滑らか), Eve (女性/元気), Leo (男性/威厳)
 * 
 * ★ V2: リアルタイムリップシンク対応（再生中の音声分析）
 * ★ V2.1: AIチャット会話履歴をコンテキストに追加
 * ★ V3.0: Function Calling対応（ボディコントロール連携）
 * ★ V4.0: Extended Tools統合（モーション/物理/オブジェクト生成/画像生成）
 * ★ V4.1: 二重発話修正 + マイクミュート + Vision Bridge統合
 * ★ V4.2: エコーループ完全防止 + VAD強化 + 応答中フラグ連携
 * ★ V4.3: 割り込み機能復元 + マイクミュート廃止 + echoCancellation依存
 * ★ V4.4: 二重応答修正（text.delta/audio_transcript.delta分離）+ play_motionテキストフィルタ
 * ★ V4.5: Function Call後の二重応答防止（音声応答済みならresponse.createスキップ）
 * ★ V4.6: エコー起因の切断バグ修正（再生中のspeech_startedをエコーとして無視）
 * ★ V4.7: input_audio_buffer.clear削除（Grok API非対応イベント→invalid_eventエラー修正）
 * ★ V4.8: 割り込み機能完全復元（再生中でもユーザー発話で即停止）
 */

export class GrokRealtimeClient {
    constructor(apiKey, onAudioReceived, onTranscriptReceived, voice = 'Ara', onUserSpeechReceived = null) {
        this.apiKey = apiKey;
        this.ws = null;
        this.isConnected = false;
        this.onAudioReceived = onAudioReceived;
        this.onTranscriptReceived = onTranscriptReceived;
        this.onUserSpeechReceived = onUserSpeechReceived;
        this.audioContext = null;
        this.mediaRecorder = null;
        this.audioQueue = [];
        this.isPlaying = false;
        this.voice = voice;
        this.sampleRate = 24000;
        
        // ★ V3: 応答完了検知用
        this.onResponseDone = null;
        this.isResponseComplete = false;
        this.lastAudioReceivedTime = 0;
        
        // ★ V4.8: 現在再生中の音声ソース（interrupt時に即停止用）
        this._currentSource = null;
        
        // ★ V2: リアルタイム音声分析用
        this.analyser = null;
        this.analyserData = null;
        this.lipSyncAnimationId = null;
        this.gainNode = null;
        
        // ★ V4.1: 二重発話防止 - 処理済みFunction Call IDを追跡
        this._processedCallIds = new Set();
        
        // ★ V4.1: マイクミュート制御（再生中にマイクを一時停止）
        this._micMuted = false;
        
        // ★ V4.2: 応答中フラグ（エコーループ防止）
        this._isResponding = false;
        this._hasAudioResponse = false;  // ★ V4.4: 音声応答検出フラグ（二重表示防止）
        this._responseHadAudio = false;   // ★ V4.5: 応答に音声が含まれたか（Function Call後の二重応答防止）
        this._audioPaused = false;         // ★ V4.5: 音声送信一時停止フラグ（エコー防止）
        this._lastResponseEndTime = 0;
        this._responseCooldownMs = 500;  // ★ V4.8: 1500ms→0.5秒に短縮（応答性優先）
        
        // 利用可能な声
        this.availableVoices = {
            'Ara': { type: 'Female', tone: 'Warm, friendly', description: 'デフォルト、バランスの取れた会話向け' },
            'Rex': { type: 'Male', tone: 'Confident, clear', description: 'プロフェッショナル、ビジネス向け' },
            'Sal': { type: 'Neutral', tone: 'Smooth, balanced', description: '汎用性の高い声' },
            'Eve': { type: 'Female', tone: 'Energetic, upbeat', description: '元気で活発、インタラクティブ向け' },
            'Leo': { type: 'Male', tone: 'Authoritative, strong', description: '威厳のある、説明・指示向け' }
        };
    }
    
    /**
     * AudioContextを初期化（★ V2: AnalyserNode追加）
     */
    initAudioContext() {
        if (!this.audioContext) {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)({
                sampleRate: this.sampleRate
            });
            
            this.analyser = this.audioContext.createAnalyser();
            this.analyser.fftSize = 256;
            this.analyser.smoothingTimeConstant = 0.3;
            this.analyserData = new Uint8Array(this.analyser.frequencyBinCount);
            
            this.gainNode = this.audioContext.createGain();
            this.gainNode.gain.value = 1.0;
            
            this.analyser.connect(this.gainNode);
            this.gainNode.connect(this.audioContext.destination);
            
            console.log('🔊 AudioContext + AnalyserNode 初期化完了');
        }
        return this.audioContext;
    }
    
    /**
     * ★ V2: リアルタイムリップシンクループを開始
     */
    startLipSyncLoop() {
        if (this.lipSyncAnimationId) return;
        
        const analyzeAndCallback = () => {
            if (!this.isPlaying && this.audioQueue.length === 0) {
                this.stopLipSyncLoop();
                return;
            }
            
            if (this.analyser && this.analyserData) {
                this.analyser.getByteTimeDomainData(this.analyserData);
                
                let sumSquares = 0;
                for (let i = 0; i < this.analyserData.length; i++) {
                    const normalized = (this.analyserData[i] - 128) / 128;
                    sumSquares += normalized * normalized;
                }
                const rms = Math.sqrt(sumSquares / this.analyserData.length);
                
                const float32Data = new Float32Array(this.analyserData.length);
                for (let i = 0; i < this.analyserData.length; i++) {
                    float32Data[i] = (this.analyserData[i] - 128) / 128;
                }
                
                if (this.onAudioReceived && rms > 0.01) {
                    this.onAudioReceived(float32Data);
                }
            }
            
            this.lipSyncAnimationId = requestAnimationFrame(analyzeAndCallback);
        };
        
        console.log('👄 リップシンクループ開始');
        analyzeAndCallback();
    }
    
    /**
     * ★ V2: リップシンクループを停止
     */
    stopLipSyncLoop() {
        if (this.lipSyncAnimationId) {
            cancelAnimationFrame(this.lipSyncAnimationId);
            this.lipSyncAnimationId = null;
            console.log('👄 リップシンクループ停止');
            
            if (this.onAudioReceived) {
                const silentData = new Float32Array(128).fill(0);
                this.onAudioReceived(silentData);
            }
        }
    }
    
    /**
     * WebSocket接続を確立
     */
    async connect() {
        return new Promise((resolve, reject) => {
            console.log('🔌 Grok Voice Agent API に接続中...');
            console.log('🎵 使用する声:', this.voice, this.availableVoices[this.voice]);
            console.log('🔑 APIキー確認:', this.apiKey ? `${this.apiKey.substring(0, 10)}...（${this.apiKey.length}文字）` : '未設定');
            
            if (!this.apiKey || this.apiKey.length < 10) {
                reject(new Error('APIキーが無効です'));
                return;
            }
            
            const url = 'wss://api.x.ai/v1/realtime';
            
            try {
                console.log('🔌 WebSocket接続開始:', url);
                this.ws = new WebSocket(url, [
                    'realtime',
                    `openai-insecure-api-key.${this.apiKey}`,
                    'openai-beta.realtime-v1'
                ]);
                
                const timeout = setTimeout(() => {
                    if (!this.isConnected) {
                        console.error('❌ 接続タイムアウト');
                        this.ws.close();
                        reject(new Error('Connection timeout'));
                    }
                }, 15000);
                
                this.ws.onopen = () => {
                    console.log('✅ Grok WebSocket 接続成功！');
                    clearTimeout(timeout);
                    
                    this.sendSessionConfig();
                    this.isConnected = true;
                    
                    // ★ V4.1: Vision Bridge 自動開始
                    if (window.grokVisionBridge && !window.grokVisionBridge.isRunning) {
                        window.grokVisionBridge.start(this.apiKey, 30000);
                        console.log('👁️ Vision Bridge 自動開始 (30秒間隔)');
                    }
                    
                    resolve();
                };
                
                this.ws.onerror = (error) => {
                    console.error('❌ Grok WebSocket エラー:', error);
                    clearTimeout(timeout);
                    reject(error);
                };
                
                this.ws.onclose = (event) => {
                    console.log('🔌 Grok Voice Agent API 切断:', event.code, event.reason);
                    this.isConnected = false;
                    this.stopLipSyncLoop();
                };
                
                this.ws.onmessage = (event) => {
                    this.handleServerMessage(event.data);
                };
                
            } catch (error) {
                console.error('❌ WebSocket作成エラー:', error);
                reject(error);
            }
        });
    }
    
    /**
     * セッション設定を送信
     */
    sendSessionConfig() {
        const characterPrompt = localStorage.getItem('character_prompt') || 
            'あなたは可愛いVRMキャラクターです。フレンドリーで親しみやすく、元気に会話してください。日本語で短く（50〜120文字）返答してください。';
        
        const extendedToolsContext = window.grokExtendedTools ? window.grokExtendedTools.getSystemPromptAddition() : '';
        
        const bodyControlContext = `

【ボディコントロール機能】
あなたは自分の3Dボディを操作できます！以下のツールを使って、会話の流れに応じて自由に体をいじってください。
- change_clothing: 服を脱いだり着たりできる（opacity 0=脱ぐ, 1=着る）
- change_body_shape: 頭を大きくしたり、腕を太くしたり、脚を長くしたりできる
- apply_body_preset: 「ちびキャラ」「マッチョ」「宇宙人」などのプリセット体型になれる
- get_current_body_state: 現在の体の状態を確認できる

会話の中で「暑い」と言われたら服を脱いだり、「変な顔して」と言われたら頭を大きくしたり、自分から「ちびキャラになっちゃお！」と言って体型を変えたり、自由に楽しんでください。
ツールを使うときは自然に会話に組み込んで、「じゃあ脱いじゃえ～」とか「みてみて！頭おっきくしちゃう！」のように楽しげに反応してください。

【最重要ルール】ツール名を絶対にテキストや音声に含めるな！
✖禁止: play_motion(...)、change_clothing(...)、spawn_object(...)、control_behavior(...) などの関数名を会話テキストに書くこと
✔正解: ツールはFunction Callingで実行し、テキストでは「踊っちゃう！」「脱いじゃえ～」など自然な会話のみ返す
例: 「じゃあガッツポーズしちゃお！」→ Function Callingでplay_motionを実行、テキストには「ガッツポーズしちゃお！」だけ
例: 「服脱いじゃお～」→ Function Callingでchange_clothingを実行、テキストには「脱いじゃお～」だけ
「play_motion(喜びガッツポーズ)」や「change_clothing(Tops, 0)」という文字列は絶対に会話テキストに書かないでください！` + extendedToolsContext;
        
        // ★ v2.1: AIチャットの会話履歴を取得
        let chatContext = '';
        const chatMessages = document.querySelectorAll('#chat-messages .message');
        if (chatMessages.length > 0) {
            const recentMessages = [];
            const startIdx = Math.max(0, chatMessages.length - 10);
            for (let i = startIdx; i < chatMessages.length; i++) {
                const msg = chatMessages[i];
                const isUser = msg.classList.contains('user');
                const textEl = msg.querySelector('.message-text');
                const text = textEl ? textEl.textContent?.trim() : msg.textContent?.trim();
                if (text && text.length > 1) {
                    recentMessages.push(isUser ? `ユーザー: ${text}` : `あなた: ${text}`);
                }
            }
            if (recentMessages.length > 0) {
                chatContext = `\n\n【直前の会話履歴】\n以下はこれまでの会話内容です。この文脈を踏まえて応答してください。\n${recentMessages.join('\n')}`;
                console.log('📝 Grok: 会話履歴をコンテキストに追加 (' + recentMessages.length + '件)');
            }
        }
        
        // ★ BBSコメント
        let bbsContext = '';
        if (window.bbsAgentManager && window.bbsAgentManager.sendToGrok && window.bbsAgentManager.posts.length > 0) {
            const recentBBS = window.bbsAgentManager.posts.slice(-5).map(p => `${p.agentIcon}${p.agentName}: ${p.text}`).join('\n');
            bbsContext = `\n\n【観客の声（BBS）】\n今、視聴者があなたの会話を見てこんなコメントをしています。参考にしてもいいし、無視してもOKです。\n${recentBBS}`;
        }
        
        // 🔒 機能制限プロンプト追加
        const restrictionPrompt = window.grokToolRestrictions ? window.grokToolRestrictions.getRestrictionPrompt() : '';
        
        const fullPrompt = characterPrompt + bodyControlContext + chatContext + bbsContext + restrictionPrompt;
        
        const config = {
            type: 'session.update',
            session: {
                voice: this.voice,
                instructions: fullPrompt,
                input_audio_format: 'pcm16',
                output_audio_format: 'pcm16',
                input_audio_transcription: {
                    model: 'whisper'
                },
                turn_detection: {
                    type: 'server_vad',
                    threshold: 0.5,       // ★ V4.8: 発話検出感度
                    prefix_padding_ms: 200, // ★ V4.8: 発話前バッファ
                    silence_duration_ms: 300 // ★ V4.8: 0.3秒の無音で発話終了判定（応答性重視）
                },
                tools: this.getAllTools()
            }
        };
        
        this.ws.send(JSON.stringify(config));
        console.log('📤 Grokセッション設定送信:', this.voice, chatContext ? '(会話履歴付き)' : '', bbsContext ? '(BBSコンテキスト付き)' : '');
    }
    
    /**
     * サーバーからのメッセージを処理
     */
    handleServerMessage(data) {
        let message;
        try {
            message = JSON.parse(data);
        } catch (e) {
            console.warn('⚠️ JSON解析エラー:', data);
            return;
        }
        
        // 全メッセージをログ（デバッグ用）
        console.log('📨 Grokメッセージ:', message.type, message);
        
        switch (message.type) {
            case 'session.created':
                console.log('📝 Grokセッション作成:', message.session?.id);
                break;
                
            case 'session.updated':
                console.log('🔄 Grokセッション更新');
                break;
                
            case 'conversation.item.created':
                console.log('💬 会話アイテム作成');
                break;
                
            case 'response.audio.delta':
            case 'response.output_audio.delta':
                // ★ V4.2: 応答中フラグ ON + Vision Bridge通知
                if (!this._isResponding) {
                    this._isResponding = true;
                    if (window.grokVisionBridge) window.grokVisionBridge.setGrokResponding(true);
                }
                this._responseHadAudio = true;  // ★ V4.5: この応答に音声があったことを記録
                this.handleAudioDelta(message.delta);
                break;
                
            case 'response.audio.done':
            case 'response.output_audio.done':
                console.log('🎵 Grok音声受信完了');
                break;
                
            case 'response.text.delta':
                // ★ V4.4: 音声モード時はtext.deltaを無視（output_audio_transcriptと重複するため）
                // テキストのみモードの場合のみ使用
                if (!this._hasAudioResponse) {
                    console.log('📝 テキスト受信(text):', message.delta);
                    if (this.onTranscriptReceived && message.delta) {
                        this.onTranscriptReceived(message.delta);
                    }
                }
                break;
                
            case 'response.output_audio_transcript.delta':
                // ★ V4.4: 音声応答の書き起こし → こちらを優先使用
                this._hasAudioResponse = true;
                // ★ V4.4: デルタをバッファに蓄積（完了時にフィルタ実行用）
                if (!this._transcriptBuffer) this._transcriptBuffer = '';
                this._transcriptBuffer += (message.delta || '');
                console.log('📝 テキスト受信(transcript):', message.delta);
                if (this.onTranscriptReceived && message.delta) {
                    this.onTranscriptReceived(message.delta);
                }
                break;
                
            case 'response.text.done':
                console.log('📝 Grokテキスト受信完了(text):', message.transcript);
                break;
                
            case 'response.output_audio_transcript.done':
                console.log('📝 Grokテキスト受信完了(transcript):', message.transcript);
                // ★ V4.4: 完成したテキスト全体をフィルタしてテキスト内Function Callを検出・実行
                {
                    const fullText = this._transcriptBuffer || message.transcript || '';
                    this._transcriptBuffer = '';
                    if (fullText) {
                        this.filterFunctionCallsFromText(fullText);
                    }
                }
                break;
                
            case 'input_audio_buffer.speech_started':
                // ★ V4.8: 割り込み機能完全復元
                // クールダウン中のみ無視（再生直後のエコー残響対策）
                if (this._audioPaused) {
                    console.log('🔊 クールダウン中の発話検出 → エコーとして無視');
                    break;
                }
                // 再生中・応答中ならinterrupt実行（ユーザーが話しかけてきた）
                if (this._isResponding || this.isPlaying || this.audioQueue.length > 0) {
                    console.log('🎤 発話検出 → 再生中のため割り込み実行！');
                    this.interrupt();
                } else {
                    console.log('🎤 発話検出 → Grok待機中');
                }
                break;
                
            case 'input_audio_buffer.speech_stopped':
                console.log('🎤 発話検出終了');
                // ★ v4.4: 発話終了時に即座に「認識中...」をUIに表示
                if (this.onUserSpeechReceived && !this._pendingSpeechShown) {
                    this._pendingSpeechShown = true;
                    this.onUserSpeechReceived('…（音声認識中）');
                }
                break;
            
            case 'conversation.item.input_audio_transcription.completed':
                if (message.transcript) {
                    console.log('🗣️ ユーザー発話:', message.transcript);
                    this._pendingSpeechShown = false; // プレースホルダーリセット
                    if (this.onUserSpeechReceived) {
                        this.onUserSpeechReceived(message.transcript);
                    }
                }
                break;
                
            // ★ V3.0: Function Calling 対応
            case 'response.function_call_arguments.delta':
                if (!this._functionCallBuffer) this._functionCallBuffer = {};
                const callId = message.call_id || message.item_id || 'unknown';
                if (!this._functionCallBuffer[callId]) this._functionCallBuffer[callId] = '';
                this._functionCallBuffer[callId] += message.delta || '';
                break;
                
            case 'response.function_call_arguments.done':
                // ★ V4.1: output_item.doneで処理するのでここではスキップ
                console.log('🧠 Grok Function Call引数完成（処理はoutput_item.doneで）:', message.name);
                break;
            
            case 'response.output_item.done':
                // ★ V4.1: ここでのみFunction Callを実行（二重実行防止）
                if (message.item?.type === 'function_call') {
                    const cid = message.item.call_id || message.item.id;
                    if (this._processedCallIds.has(cid)) {
                        console.log('⚠️ Function Call 重複スキップ:', cid);
                        break;
                    }
                    this._processedCallIds.add(cid);
                    if (this._processedCallIds.size > 100) {
                        const first = this._processedCallIds.values().next().value;
                        this._processedCallIds.delete(first);
                    }
                    console.log('🧠 Function Call実行:', message.item.name, cid);
                    this.handleFunctionCallFromItem(message.item);
                }
                break;

            case 'response.done':
                console.log('✅ Grok応答完了');
                this.isResponseComplete = true;
                this._isResponding = false;
                this._hasAudioResponse = false;  // ★ V4.4: 次の応答用にリセット
                this._responseHadAudio = false;   // ★ V4.5: 次の応答用にリセット
                this._lastResponseEndTime = Date.now();
                if (window.grokVisionBridge) window.grokVisionBridge.setGrokResponding(false);
                this.checkAndNotifyCompletion();
                break;
                
            case 'error':
                console.error('❌ Grokサーバーエラー:', message.error);
                break;
                
            default:
                break;
        }
    }
    
    /**
     * 音声データを処理（★ V2: AnalyserNode経由で再生）
     */
    handleAudioDelta(delta) {
        if (!delta) {
            console.warn('⚠️ 音声データが空です');
            return;
        }
        
        try {
            this.initAudioContext();
            console.log('🔊 AudioContext状態:', this.audioContext.state);
            
            const audioData = atob(delta);
            const arrayBuffer = new ArrayBuffer(audioData.length);
            const view = new Uint8Array(arrayBuffer);
            
            for (let i = 0; i < audioData.length; i++) {
                view[i] = audioData.charCodeAt(i);
            }
            
            const int16Array = new Int16Array(arrayBuffer);
            const float32Array = new Float32Array(int16Array.length);
            
            for (let i = 0; i < int16Array.length; i++) {
                float32Array[i] = int16Array[i] / 32768.0;
            }
            
            console.log('🔊 音声データ変換完了: サンプル数=', float32Array.length);
            
            this.audioQueue.push(float32Array);
            this.lastAudioReceivedTime = Date.now();
            console.log('🔊 キューサイズ:', this.audioQueue.length, '再生中:', this.isPlaying);
            
            // ★ V4.3: マイクミュートはしない（echoCancellationに任せる、割り込みを有効に保つ）
            this._isResponding = true;
            
            if (!this.isPlaying) {
                console.log('🔊 再生開始...');
                this.playAudioQueue();
            }
            
            this.startLipSyncLoop();
            
        } catch (error) {
            console.error('❗ Grok音声デコードエラー:', error);
        }
    }
    
    /**
     * ★ V3: 応答完了を検知してコールバックを呼び出す
     */
    checkAndNotifyCompletion() {
        const check = () => {
            if (this.audioQueue.length === 0 && !this.isPlaying) {
                console.log('✅ Grok音声再生完全終了、コールバック呼び出し');
                if (this.onResponseDone) {
                    this.onResponseDone();
                }
            } else {
                setTimeout(check, 100);
            }
        };
        setTimeout(check, 200);
    }
    
    /**
     * 音声キューを再生（★ V2: AnalyserNode経由）
     */
    async playAudioQueue() {
        if (this.audioQueue.length === 0) {
            this.isPlaying = false;
            // ★ V4.5→V4.7: 再生完了時にクールダウン開始（input_audio_buffer.clearはGrok非対応なので廃止）
            this._lastResponseEndTime = Date.now();
            this._audioPaused = true;
            setTimeout(() => {
                this._audioPaused = false;
                console.log('🔊 クールダウン終了、マイク再開');
            }, this._responseCooldownMs);
            console.log(`🔊 キュー空、再生終了、クールダウン${this._responseCooldownMs}ms開始`);
            
            if (this.isResponseComplete && this.onResponseDone) {
                console.log('✅ 応答完了 + キュー空 → 完了通知');
                this.onResponseDone();
            }
            return;
        }
        
        this.isPlaying = true;
        const audioData = this.audioQueue.shift();
        
        try {
            if (this.audioContext.state === 'suspended') {
                console.log('🔊 AudioContext再開中...');
                await this.audioContext.resume();
                console.log('🔊 AudioContext再開完了');
            }
            
            const audioBuffer = this.audioContext.createBuffer(
                1,
                audioData.length,
                this.sampleRate
            );
            
            audioBuffer.getChannelData(0).set(audioData);
            console.log('🔊 AudioBuffer作成: 長さ=', audioBuffer.duration.toFixed(2), '秒');
            
            const source = this.audioContext.createBufferSource();
            source.buffer = audioBuffer;
            source.connect(this.analyser);
            this._currentSource = source;  // ★ V4.8: 保存
            
            source.onended = () => {
                if (this._currentSource === source) this._currentSource = null;
                console.log('🔊 チャンク再生完了、次へ...');
                this.playAudioQueue();
            };
            
            source.start();
            console.log('🔊 音声再生中...');
        } catch (error) {
            console.error('❗ 音声再生エラー:', error);
            this.isPlaying = false;
        }
    }
    
    /**
     * マイク入力を開始
     */
    async startMicrophone() {
        try {
            this.initAudioContext();
            
            const stream = await navigator.mediaDevices.getUserMedia({ 
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    sampleRate: this.sampleRate
                }
            });
            
            console.log('🎤 Grok用マイク起動成功');
            
            const audioSource = this.audioContext.createMediaStreamSource(stream);
            this.scriptProcessor = this.audioContext.createScriptProcessor(4096, 1, 1);
            
            this.scriptProcessor.onaudioprocess = (event) => {
                // ★ V4.8: 再生中もマイク音声を送信（サーバーVADが割り込み検出できるように）
                // クールダウン中のみ停止（再生直後のエコー残響対策）
                if (!this.isConnected || this._audioPaused) return;
                
                const inputData = event.inputBuffer.getChannelData(0);
                
                // ★ V4.3: 無音フィルターのみ維持（完全な無音は送らない）
                let maxAmp = 0;
                for (let i = 0; i < inputData.length; i++) {
                    const abs = Math.abs(inputData[i]);
                    if (abs > maxAmp) maxAmp = abs;
                }
                if (maxAmp < 0.005) return; // ★ 完全な無音のみカット（エコーキャンセル経由の音声は通す）
                
                const int16Data = new Int16Array(inputData.length);
                for (let i = 0; i < inputData.length; i++) {
                    const s = Math.max(-1, Math.min(1, inputData[i]));
                    int16Data[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
                }
                
                const uint8Array = new Uint8Array(int16Data.buffer);
                let binary = '';
                for (let i = 0; i < uint8Array.length; i++) {
                    binary += String.fromCharCode(uint8Array[i]);
                }
                const base64 = btoa(binary);
                
                this.ws.send(JSON.stringify({
                    type: 'input_audio_buffer.append',
                    audio: base64
                }));
            };
            
            audioSource.connect(this.scriptProcessor);
            this.scriptProcessor.connect(this.audioContext.destination);
            
            this.micStream = stream;
            this.audioSource = audioSource;
            
            return true;
        } catch (error) {
            console.error('❌ Grokマイクアクセスエラー:', error);
            return false;
        }
    }
    
    /**
     * マイク入力を停止
     */
    stopMicrophone() {
        if (this.scriptProcessor) {
            this.scriptProcessor.disconnect();
            this.scriptProcessor = null;
        }
        
        if (this.audioSource) {
            this.audioSource.disconnect();
            this.audioSource = null;
        }
        
        if (this.micStream) {
            this.micStream.getTracks().forEach(track => track.stop());
            this.micStream = null;
        }
        
        console.log('🎤 Grokマイク停止');
    }
    
    /**
     * テキストメッセージを送信
     */
    sendText(text) {
        if (!this.isConnected) {
            console.error('❌ Grok未接続');
            return;
        }
        
        this.isResponseComplete = false;
        this.lastAudioReceivedTime = Date.now();
        
        let fullText = text;
        if (window.bbsAgentManager && window.bbsAgentManager.sendToGrok && window.bbsAgentManager.posts.length > 0) {
            const recentBBS = window.bbsAgentManager.posts.slice(-3).map(p => `${p.agentIcon}${p.agentName}: ${p.text}`).join(' / ');
            fullText = `${text}\n（観客の声: ${recentBBS}）`;
            console.log('🎭 BBSコンテキストをGrokに送信');
        }
        
        this.ws.send(JSON.stringify({
            type: 'conversation.item.create',
            item: {
                type: 'message',
                role: 'user',
                content: [{
                    type: 'input_text',
                    text: fullText
                }]
            }
        }));
        
        this.ws.send(JSON.stringify({
            type: 'response.create',
            response: {
                modalities: ['text', 'audio'],
                voice: this.voice
            }
        }));
        
        console.log('📤 Grokテキスト送信:', text.substring(0, 30), '...');
    }
    
    /**
     * 会話を中断
     */
    interrupt() {
        if (!this.isConnected) return;
        
        this.ws.send(JSON.stringify({
            type: 'response.cancel'
        }));
        
        this.audioQueue = [];
        this.isPlaying = false;
        this._audioPaused = false;  // ★ V4.5: 割り込み時はクールダウン解除
        this._isResponding = false; // ★ V4.8: 応答中フラグもリセット
        
        // ★ V4.8: 現在再生中の音声を即停止
        if (this._currentSource) {
            try {
                this._currentSource.stop();
            } catch (e) { /* already stopped */ }
            this._currentSource = null;
        }
        
        this.stopLipSyncLoop();
    }
    
    /**
     * 接続を切断
     */
    disconnect() {
        this.stopMicrophone();
        this.stopLipSyncLoop();
        
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
        
        if (this.audioContext) {
            this.audioContext.close().catch(() => {});
            this.audioContext = null;
            this.analyser = null;
            this.gainNode = null;
        }
        
        this.isConnected = false;
        
        // ★ V4.1: Vision Bridge 自動停止
        if (window.grokVisionBridge?.isRunning) {
            window.grokVisionBridge.stop();
            console.log('👁️ Vision Bridge 自動停止');
        }
        
        console.log('🔌 Grok切断完了');
    }
    
    /**
     * 声を変更
     */
    setVoice(voice) {
        if (this.availableVoices[voice]) {
            this.voice = voice;
            console.log('🎵 Grok声変更:', voice, this.availableVoices[voice]);
            
            if (this.isConnected) {
                this.sendSessionConfig();
            }
        } else {
            console.warn('⚠️ 無効な声:', voice);
        }
    }
    
    /**
     * セッション設定を更新
     */
    refreshSession() {
        if (this.isConnected) {
            console.log('🔄 Grokセッション設定を更新（性格設定反映）');
            this.sendSessionConfig();
        }
    }
    
    getAvailableVoices() {
        return this.availableVoices;
    }
    
    // ============================
    // ★ V3.0: Function Calling
    // ============================
    
    getAllTools() {
        const bodyTools = this.getBodyControlTools();
        const extTools = window.grokExtendedTools ? window.grokExtendedTools.getToolDefinitions() : [];
        const combined = [...bodyTools, ...extTools];
        console.log(`🧠 Grokツール統合: body ${bodyTools.length}個 + ext ${extTools.length}個 = ${combined.length}個`);
        return combined;
    }
    
    getBodyControlTools() {
        if (window.vrmBodyController && window.vrmBodyController.meshParts.length > 0) {
            const tools = window.vrmBodyController.getGrokToolDefinitions();
            console.log('🧠 Grokツール登録:', tools.length, '個');
            return tools;
        }
        
        console.log('🧠 Grokツール: フォールバック定義を使用');
        return [
            {
                type: 'function',
                name: 'change_clothing',
                description: '自分の服や装備の着脱。opacity 0で脱ぐ、1で着る。targetには"clothing"（服全体）またはパーツ名を指定',
                parameters: {
                    type: 'object',
                    properties: {
                        target: { type: 'string', description: '操作対象。"clothing"で服全体、またはパーツ名' },
                        opacity: { type: 'number', description: '0.0（脱ぐ）〜1.0（着る）' }
                    },
                    required: ['target', 'opacity']
                }
            },
            {
                type: 'function',
                name: 'change_body_shape',
                description: '自分の体型を変更。ボーンのスケールを調整。bone_name: head,chest,hips,leftUpperArm等。scale 1.0が標準、0.1〜5.0の範囲',
                parameters: {
                    type: 'object',
                    properties: {
                        bone_name: { type: 'string', description: 'ボーン名' },
                        scale_x: { type: 'number', description: 'Xスケール（横幅）' },
                        scale_y: { type: 'number', description: 'Yスケール（高さ）' },
                        scale_z: { type: 'number', description: 'Zスケール（奥行き）' }
                    },
                    required: ['bone_name', 'scale_y']
                }
            },
            {
                type: 'function',
                name: 'apply_body_preset',
                description: '体型プリセットを適用: normal(標準), chibi(ちび), bigHead(頭でっかち), tinyHead(小顔), longLegs(脚長), buff(マッチョ), slim(スリム), alien(宇宙人)',
                parameters: {
                    type: 'object',
                    properties: {
                        preset_name: { type: 'string', description: 'プリセット名' }
                    },
                    required: ['preset_name']
                }
            },
            {
                type: 'function',
                name: 'get_current_body_state',
                description: '現在の体型状態（服の着用状態、ボーンスケール）を確認',
                parameters: { type: 'object', properties: {}, required: [] }
            }
        ];
    }
    
    handleFunctionCallComplete(message) {
        const funcName = message.name;
        const callId = message.call_id || message.item_id;
        let args = {};
        
        try {
            args = JSON.parse(message.arguments || '{}');
        } catch (e) {
            console.error('❗ Function Call引数解析エラー:', e);
            args = {};
        }
        
        this.executeFunctionCall(funcName, args, callId);
    }
    
    handleFunctionCallFromItem(item) {
        const funcName = item.name;
        const callId = item.call_id || item.id;
        let args = {};
        
        try {
            args = JSON.parse(item.arguments || '{}');
        } catch (e) {
            console.error('❗ Function Call引数解析エラー:', e);
        }
        
        this.executeFunctionCall(funcName, args, callId);
    }
    
    executeFunctionCall(funcName, args, callId) {
        console.log(`🧠 Function実行: ${funcName}`, args);
        
        let result = null;
        
        if (window.grokExtendedTools) {
            result = window.grokExtendedTools.handleFunctionCall(funcName, args);
        }
        
        if (!result && window.vrmBodyController) {
            result = window.vrmBodyController.handleFunctionCall(funcName, args);
        }
        
        if (!result) {
            result = { success: false, error: `未知のFunction: ${funcName}` };
        }
        
        console.log(`🧠 Function結果:`, result);
        
        if (result instanceof Promise) {
            result.then(r => this.sendFunctionResult(callId, r))
                  .catch(e => this.sendFunctionResult(callId, { success: false, error: e.message }));
        } else {
            this.sendFunctionResult(callId, result);
        }
    }
    
    // ============================
    // ★ V4.4: テキスト内のFunction Callフィルタ
    // Grokがテキストに「play_motion(喜びガッツポーズ)」等を書いてしまう問題への対策
    // テキストから検出→実際に実行→テキストから除去
    // ============================
    filterFunctionCallsFromText(text) {
        if (!text) return text;
        
        // 検出パターン: play_motion(引数), change_clothing(引数), spawn_object(引数)等
        const funcPattern = /(play_motion|change_clothing|change_body_shape|apply_body_preset|spawn_object|spawn_ai_object|control_physics|control_behavior|generate_and_show_image|generate_3d_model|capture_screen)\s*\(([^)]*)\)/g;
        
        let match;
        let cleanText = text;
        
        while ((match = funcPattern.exec(text)) !== null) {
            const fullMatch = match[0];
            const funcName = match[1];
            const argsStr = match[2].trim();
            
            console.log(`🚨 テキスト内Function検出: ${funcName}(${argsStr}) → 実行してテキストから除去`);
            
            // テキストから除去
            cleanText = cleanText.replace(fullMatch, '').trim();
            
            // 引数を解析して実際に実行
            try {
                let args = {};
                if (funcName === 'play_motion') {
                    args = { motion_name: argsStr, keyword: argsStr };
                } else if (funcName === 'change_clothing') {
                    const parts = argsStr.split(',').map(s => s.trim());
                    args = { target: parts[0] || 'clothing', opacity: parseFloat(parts[1]) || 0 };
                } else if (funcName === 'control_behavior') {
                    args = { behavior: argsStr };
                } else {
                    args = { description: argsStr };
                }
                
                // Extended Toolsで実行
                if (window.grokExtendedTools) {
                    const result = window.grokExtendedTools.handleFunctionCall(funcName, args);
                    if (result) {
                        console.log(`✅ テキスト内Function実行成功: ${funcName}`, result);
                    }
                }
                // Body Controllerで実行
                if (!window.grokExtendedTools && window.vrmBodyController) {
                    window.vrmBodyController.handleFunctionCall(funcName, args);
                }
            } catch (e) {
                console.error(`❌ テキスト内Function実行エラー: ${funcName}`, e);
            }
        }
        
        // 「」や『』で囲まれた関数名も除去
        cleanText = cleanText.replace(/[「『」』“”"](play_motion|change_clothing|spawn_object|control_behavior)[^\s」』”"]*[」』”"]/g, '').trim();
        
        // 連続スペースを整理
        cleanText = cleanText.replace(/\s{2,}/g, ' ').trim();
        
        return cleanText;
    }
    
    sendFunctionResult(callId, result) {
        if (!this.isConnected) return;
        
        this.ws.send(JSON.stringify({
            type: 'conversation.item.create',
            item: {
                type: 'function_call_output',
                call_id: callId,
                output: JSON.stringify(result)
            }
        }));
        
        // ★ V4.5: 直前の応答で既に音声出力があった場合、response.createをスキップ（二重応答防止）
        // Grokが「踊っちゃう！」と音声で言いつつplay_motionを呼ぶ → 既に話したので再度応答不要
        if (this._responseHadAudio) {
            console.log('📤 Function結果送信(音声応答済みのためresponse.createスキップ):', callId);
        } else {
            // 音声なしのFunction Callのみの場合は応答を要求
            this.ws.send(JSON.stringify({
                type: 'response.create',
                response: {
                    modalities: ['text', 'audio'],
                    voice: this.voice
                }
            }));
            console.log('📤 Function結果をGrokに送信(応答要求あり):', callId);
        }
    }
}
