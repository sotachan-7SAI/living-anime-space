// ========================================
// ConversationSupervisor - 会話ログ監視システム v2.6
// ========================================
//
// 🎯 目的:
//   1. 音声重複防止: 常に1人だけが発話している状態を監視（感情分析OFF時も有効）
//   2. 感情メーター管理: 各キャラの感情を10段階で追跡（4人バラバラ）
//   3. 長期記憶: 会話の文脈を保持し、キャラLLMに提供
//   4. 演出指示: 直接書き込みで会話の流れを誘導可能
//   5. 音声重複再生の検出・停止機能
//   6. ★NEW★ 沈黙検知→自動会話トリガー機能
//
// 【v2.6 改善点】★★★ NEW ★★★
//   - 沈黙検知機能追加（1〜30秒で設定可能）
//   - ユーザーの沈黙が続いたらVRMキャラが自動で話しかける
//   - ON/OFFスイッチとスライダーで細かく制御可能
//   - AIチャット/マルチキャラ会話との連携
//
// 【v2.5 改善点】
//   - 音声重複再生の検出・停止機能追加
//   - 同一人物の音声が2本同時再生されたら1本に統一
//   - 別々の人物の音声が同時再生されたら1人に統一
//   - 定期的な音声状態チェック（500ms間隔）
//
// 【v2.4 改善点】
//   - 感情メーターに文字ラベルを追加（絵文字+文字）
//   - 感情分析OFF時も発話監視は維持（2人同時発話防止）
//
// 【v2.3 改善点】
//   - ON/OFFボタンを大きく目立つ位置に配置
//   - キャラクターリストの上にON/OFFトグルボタンを表示
//   - システム状態を文字でも明示
//
// 【v2.2 改善点】
//   - 感情メーターをユーザーが直接編集可能（数値入力/スライダー）
//   - 感情分析システムのオン/オフ機能
//   - オフ時はLLM感情分析を完全にスキップ
//   - 設定をlocalStorageに保存
//
// 【v2.1 改善点】
//   - マルチキャラパネルとの表示連動（Shift+Mで同時表示/非表示）
//   - MutationObserverでパネル状態を監視
//
// 【v2.0 改善点】
//   - 4人それぞれの感情を個別に管理
//   - UIで各キャラの全感情メーターをリアルタイム表示
//   - キャラクター自動登録機能強化
//   - 発話ごとにLLMで感情分析（発話者以外の3人の感情も更新）
//   - 感情メーターの色分け表示
//
// 【感情メーター】各キャラごとに以下を0-10で管理:
//   - joy (喜び), anger (怒り), sadness (哀しみ), fun (楽しさ)
//   - excitement (興奮), calm (安心), tired (ダルさ)
//   - disappointment (失望), fear (恐れ)
//
// ========================================

(function() {
    'use strict';
    
    console.log('👁️ ConversationSupervisor v2.5 読み込み開始');
    
    // ========================================
    // 感情メーター定義
    // ========================================
    
    const EMOTION_TYPES = [
        'joy', 'anger', 'sadness', 'fun', 'excitement',
        'calm', 'tired', 'disappointment', 'fear'
    ];
    
    const EMOTION_LABELS = {
        joy: '喜び', anger: '怒り', sadness: '哀しみ', fun: '楽しさ',
        excitement: '興奮', calm: '安心', tired: 'ダルさ',
        disappointment: '失望', fear: '恐れ'
    };
    
    const EMOTION_COLORS = {
        joy: '#ffd700', anger: '#ff4444', sadness: '#4488ff', fun: '#ffaa00',
        excitement: '#ff44ff', calm: '#44ff88', tired: '#888888',
        disappointment: '#8844ff', fear: '#44dddd'
    };
    
    const EMOTION_EMOJIS = {
        joy: '😊', anger: '😠', sadness: '😢', fun: '😄',
        excitement: '🤩', calm: '😌', tired: '😴',
        disappointment: '😞', fear: '😨'
    };
    
    // ========================================
    // CharacterEmotionState - キャラごとの感情状態
    // ========================================
    
    class CharacterEmotionState {
        constructor(characterId, characterName) {
            this.characterId = characterId;
            this.characterName = characterName;
            
            // 感情メーター（0-10）
            this.meters = {};
            EMOTION_TYPES.forEach(type => {
                this.meters[type] = 5; // 初期値は中間
            });
            
            // 特殊フラグ
            this.isForgiving = true;
            this.grudgeLevel = 0;
            this.trustLevel = 5;
            
            // 履歴
            this.recentEvents = [];
            this.memorableEvents = [];
        }
        
        adjustEmotion(emotionType, delta) {
            if (this.meters[emotionType] !== undefined) {
                this.meters[emotionType] = Math.max(0, Math.min(10, this.meters[emotionType] + delta));
            }
        }
        
        setEmotion(emotionType, value) {
            if (this.meters[emotionType] !== undefined) {
                this.meters[emotionType] = Math.max(0, Math.min(10, value));
            }
        }
        
        getDominantEmotion() {
            let maxEmotion = 'calm';
            let maxValue = 0;
            
            for (const [emotion, value] of Object.entries(this.meters)) {
                if (emotion === 'calm' || emotion === 'tired') continue;
                if (value > maxValue && value > 5) {
                    maxValue = value;
                    maxEmotion = emotion;
                }
            }
            
            return { emotion: maxEmotion, intensity: maxValue };
        }
        
        addEvent(event) {
            this.recentEvents.push({ ...event, timestamp: Date.now() });
            if (this.recentEvents.length > 20) this.recentEvents.shift();
            
            if (event.intensity && event.intensity >= 3) {
                this.memorableEvents.push({ ...event, timestamp: Date.now() });
                if (this.memorableEvents.length > 10) this.memorableEvents.shift();
            }
        }
        
        getSummary() {
            const dominant = this.getDominantEmotion();
            return {
                characterName: this.characterName,
                dominantEmotion: dominant.emotion,
                dominantIntensity: dominant.intensity,
                meters: { ...this.meters },
                isForgiving: this.isForgiving,
                grudgeLevel: this.grudgeLevel,
                trustLevel: this.trustLevel,
                recentEventCount: this.recentEvents.length
            };
        }
        
        generateEmotionContext() {
            const dominant = this.getDominantEmotion();
            const highEmotions = Object.entries(this.meters)
                .filter(([_, v]) => v >= 7)
                .map(([e, v]) => `${EMOTION_LABELS[e]}(${v})`)
                .join('、');
            
            const lowEmotions = Object.entries(this.meters)
                .filter(([_, v]) => v <= 3)
                .map(([e, v]) => `${EMOTION_LABELS[e]}(${v})`)
                .join('、');
            
            let context = `【現在の感情状態】\n`;
            context += `主要感情: ${EMOTION_LABELS[dominant.emotion]}（強度${dominant.intensity}/10）\n`;
            
            if (highEmotions) context += `高い感情: ${highEmotions}\n`;
            if (lowEmotions) context += `低い感情: ${lowEmotions}\n`;
            
            if (this.memorableEvents.length > 0) {
                const recent = this.memorableEvents.slice(-3);
                context += `\n【印象に残っていること】\n`;
                recent.forEach(e => { context += `・${e.summary}\n`; });
            }
            
            return context;
        }
    }
    
    // ========================================
    // ConversationSupervisor - メインクラス
    // ========================================
    
    class ConversationSupervisor {
        constructor() {
            this.characterStates = new Map();
            this.conversationLog = [];
            this.maxLogLength = 100;
            
            this.directorNotes = [];
            this.activeDirectives = [];
            
            this.currentSpeakerId = null;
            this.isSpeaking = false;
            this.speakingQueue = [];
            
            // ★ v2.2: システムオン/オフ
            this.systemEnabled = true;  // 感情分析システム全体のオン/オフ
            
            // LLM設定
            this.supervisorLLM = 'chatgpt';
            this.supervisorModel = 'gpt-4o-mini';
            this.supervisorApiKey = null;
            this.autoAnalyze = true;
            this.isAnalyzing = false;
            
            this.analysisHistory = [];
            
            this.onEmotionUpdate = null;
            this.onConflictDetected = null;
            this.onDirectiveExecuted = null;
            
            this.uiPanel = null;
            this.uiMinimized = false;
            
            // ★ v2.5: 音声重複再生検出用
            this.activeAudioElements = new Map(); // characterId => Audio要素
            this.audioCheckInterval = null;
            
            // ★ v2.6: 沈黙検知→自動会話トリガー
            this.silenceDetectionEnabled = false;  // 沈黙検知ON/OFF
            this.silenceThreshold = 7;             // 沈黙しきい値（秒）
            this.lastActivityTime = Date.now();    // 最後のアクティビティ時間
            this.silenceCheckInterval = null;      // 沈黙チェック用インターバル
            this.isSilenceTriggered = false;       // 沈黙トリガー発動済みフラグ
            this.silenceTriggerCooldown = false;   // クールダウン中フラグ
            
            // ★ v2.2: 設定を読み込み
            this.loadSettings();
            
            // ★ v2.5: 音声監視開始
            this.startAudioMonitoring();
            
            // ★ v2.6: 沈黙監視開始
            this.startSilenceMonitoring();
            
            console.log('👁️ ConversationSupervisor v2.6 初期化完了');
        }
        
        // ========================================
        // ★ v2.2: 設定の保存/読み込み
        // ========================================
        
        loadSettings() {
            try {
                const saved = localStorage.getItem('conversation_supervisor_settings');
                if (saved) {
                    const settings = JSON.parse(saved);
                    this.systemEnabled = settings.systemEnabled !== false;
                    this.autoAnalyze = settings.autoAnalyze !== false;
                    // ★ v2.6: 沈黙検知設定
                    this.silenceDetectionEnabled = settings.silenceDetectionEnabled || false;
                    this.silenceThreshold = settings.silenceThreshold || 7;
                    console.log(`👁️ 設定読み込み: システム=${this.systemEnabled}, 自動分析=${this.autoAnalyze}, 沈黙検知=${this.silenceDetectionEnabled}(${this.silenceThreshold}秒)`);
                }
            } catch (e) {
                console.warn('👁️ 設定読み込みエラー:', e);
            }
        }
        
        saveSettings() {
            try {
                const settings = {
                    systemEnabled: this.systemEnabled,
                    autoAnalyze: this.autoAnalyze,
                    // ★ v2.6: 沈黙検知設定
                    silenceDetectionEnabled: this.silenceDetectionEnabled,
                    silenceThreshold: this.silenceThreshold
                };
                localStorage.setItem('conversation_supervisor_settings', JSON.stringify(settings));
                console.log('👁️ 設定保存完了');
            } catch (e) {
                console.warn('👁️ 設定保存エラー:', e);
            }
        }
        
        // ★ v2.2: システムのオン/オフ
        setSystemEnabled(enabled) {
            this.systemEnabled = enabled;
            this.saveSettings();
            console.log(`👁️ 感情分析システム: ${enabled ? 'ON' : 'OFF'}`);
            this.updateUI();
        }
        
        isSystemEnabled() {
            return this.systemEnabled;
        }
        
        // ========================================
        // キャラクター管理
        // ========================================
        
        registerCharacter(characterId, characterName) {
            if (!this.characterStates.has(characterId)) {
                this.characterStates.set(characterId, 
                    new CharacterEmotionState(characterId, characterName)
                );
                console.log(`👁️ キャラクター登録: ${characterName} (${characterId})`);
                this.updateUI();
            }
            return this.characterStates.get(characterId);
        }
        
        registerCharactersFromDirector() {
            const director = window.pipelinedDialogueDirector || 
                            (window.multiCharManager && window.multiCharManager.director);
            
            if (director && director.characters) {
                console.log('👁️ Directorからキャラクター一括登録...');
                director.characters.forEach((char, id) => {
                    this.registerCharacter(id, char.name);
                });
            }
            
            if (window.multiCharManager && window.multiCharManager.characters) {
                window.multiCharManager.characters.forEach((char, id) => {
                    this.registerCharacter(id, char.name);
                });
            }
        }
        
        getCharacterState(characterId) {
            return this.characterStates.get(characterId);
        }
        
        getAllCharacterStates() {
            const states = {};
            this.characterStates.forEach((state, id) => {
                states[id] = state.getSummary();
            });
            return states;
        }
        
        // ★ v2.2: 感情を直接設定（UI用）
        setCharacterEmotion(characterId, emotionType, value) {
            const state = this.characterStates.get(characterId);
            if (state) {
                state.setEmotion(emotionType, value);
                console.log(`👁️ ${state.characterName}の${EMOTION_LABELS[emotionType]}: ${value}`);
                this.updateUI();
                
                if (this.onEmotionUpdate) {
                    this.onEmotionUpdate(this.getAllCharacterStates());
                }
            }
        }
        
        // ========================================
        // 音声重複防止システム
        // ========================================
        
        startSpeaking(characterId) {
            if (this.isSpeaking && this.currentSpeakerId !== characterId) {
                console.warn(`⚠️ 音声重複検出！${this.currentSpeakerId} が喋っている間に ${characterId} が発話開始`);
                this.speakingQueue.push(characterId);
                
                if (this.onConflictDetected) {
                    this.onConflictDetected({
                        type: 'voice_overlap',
                        currentSpeaker: this.currentSpeakerId,
                        attemptedSpeaker: characterId
                    });
                }
                
                return false;
            }
            
            this.isSpeaking = true;
            this.currentSpeakerId = characterId;
            console.log(`🎤 発話開始: ${characterId}`);
            this.updateUI();
            return true;
        }
        
        endSpeaking(characterId) {
            if (this.currentSpeakerId === characterId) {
                this.isSpeaking = false;
                this.currentSpeakerId = null;
                console.log(`🎤 発話終了: ${characterId}`);
                
                if (this.speakingQueue.length > 0) {
                    const nextSpeaker = this.speakingQueue.shift();
                    console.log(`📢 次の発話者: ${nextSpeaker}`);
                }
                
                this.updateUI();
                return true;
            }
            return false;
        }
        
        forceStopSpeaking(characterId) {
            console.log(`🛑 強制停止: ${characterId}`);
            this.isSpeaking = false;
            this.currentSpeakerId = null;
            this.updateUI();
        }
        
        getCurrentSpeaker() {
            return this.currentSpeakerId;
        }
        
        // ========================================
        // ★ v2.5: 音声重複再生検出・停止システム
        // ========================================
        
        /**
         * 音声監視を開始
         */
        startAudioMonitoring() {
            if (this.audioCheckInterval) {
                clearInterval(this.audioCheckInterval);
            }
            
            // 500msごとに音声状態をチェック
            this.audioCheckInterval = setInterval(() => {
                this.checkAndFixAudioOverlap();
            }, 500);
            
            console.log('👁️ 音声重複監視開始');
        }
        
        /**
         * 音声重複をチェックし、1本のみ再生するように修正
         */
        checkAndFixAudioOverlap() {
            // 再生中の全Audio要素を取得
            const allAudios = document.querySelectorAll('audio');
            const playingAudios = [];
            
            allAudios.forEach(audio => {
                if (!audio.paused && !audio.ended && audio.currentTime > 0) {
                    playingAudios.push(audio);
                }
            });
            
            // CharacterUnitの音声もチェック
            const director = window.multiCharManager?.director;
            if (director && director.characters) {
                director.characters.forEach((char, charId) => {
                    if (char.currentAudio && !char.currentAudio.paused) {
                        // 既にリストにない場合のみ追加
                        if (!playingAudios.includes(char.currentAudio)) {
                            playingAudios.push(char.currentAudio);
                            char.currentAudio._characterId = charId; // マーク付け
                        }
                    }
                });
            }
            
            // 2本以上再生中なら重複を解消
            if (playingAudios.length > 1) {
                console.warn(`⚠️ 音声重複検出！${playingAudios.length}本同時再生中`);
                
                // 最も最近開始した音声以外を停止
                // currentTimeが最も小さいものが最新
                playingAudios.sort((a, b) => a.currentTime - b.currentTime);
                const keepAudio = playingAudios[0]; // 最も最近開始したものを残す
                
                playingAudios.slice(1).forEach(audio => {
                    console.log(`🛑 重複音声を停止: currentTime=${audio.currentTime.toFixed(2)}`);
                    audio.pause();
                    audio.currentTime = 0;
                    
                    // CharacterUnitのリップシンクも停止
                    if (audio._characterId && director) {
                        const char = director.characters.get(audio._characterId);
                        if (char && char.stopLipSync) {
                            char.stopLipSync();
                            char.isSpeaking = false;
                        }
                    }
                });
                
                console.log(`✅ 音声を統一: 1本のみ再生中`);
            }
        }
        
        /**
         * 特定キャラクターの音声を強制停止
         */
        forceStopCharacterAudio(characterId) {
            const director = window.multiCharManager?.director;
            if (director && director.characters) {
                const char = director.characters.get(characterId);
                if (char) {
                    if (char.currentAudio) {
                        char.currentAudio.pause();
                        char.currentAudio.currentTime = 0;
                    }
                    if (char.stopLipSync) {
                        char.stopLipSync();
                    }
                    char.isSpeaking = false;
                    console.log(`🛑 ${char.name}の音声を強制停止`);
                }
            }
        }
        
        /**
         * すべての音声を強制停止
         */
        forceStopAllAudio() {
            // 全Audio要素を停止
            document.querySelectorAll('audio').forEach(audio => {
                audio.pause();
                audio.currentTime = 0;
            });
            
            // 全キャラのリップシンクも停止
            const director = window.multiCharManager?.director;
            if (director && director.characters) {
                director.characters.forEach((char) => {
                    if (char.stopLipSync) {
                        char.stopLipSync();
                    }
                    char.isSpeaking = false;
                });
            }
            
            this.isSpeaking = false;
            this.currentSpeakerId = null;
            this.updateUI();
            
            console.log('🛑 全音声を強制停止');
        }
        
        // ========================================
        // 会話ログ管理
        // ========================================
        
        logMessage(speakerId, speakerName, message, emotion = null) {
            const entry = {
                id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                speakerId,
                speakerName,
                message,
                emotion,
                timestamp: Date.now()
            };
            
            this.conversationLog.push(entry);
            
            if (this.conversationLog.length > this.maxLogLength) {
                this.conversationLog.shift();
            }
            
            // ★ v2.2: システムがオンの場合のみ感情分析
            if (this.systemEnabled && this.autoAnalyze && !this.isAnalyzing) {
                this.analyzeLastMessage(entry);
            }
            
            this.updateUI();
            return entry;
        }
        
        getRecentLog(count = 10) {
            return this.conversationLog.slice(-count);
        }
        
        generateConversationSummary() {
            const recent = this.getRecentLog(20);
            if (recent.length === 0) return '会話はまだ始まっていません。';
            
            let summary = '【これまでの会話の流れ】\n';
            recent.forEach(entry => {
                summary += `${entry.speakerName}: ${entry.message.substring(0, 50)}${entry.message.length > 50 ? '...' : ''}\n`;
            });
            
            return summary;
        }
        
        // ========================================
        // 感情分析（4人バラバラに更新）
        // ========================================
        
        async analyzeLastMessage(logEntry) {
            // ★ v2.2: システムがオフなら何もしない
            if (!this.systemEnabled) {
                console.log('👁️ 感情分析システムがOFFです');
                return;
            }
            
            if (this.isAnalyzing) return;
            
            if (!this.supervisorApiKey) {
                this.supervisorApiKey = this.getOpenAIApiKey();
            }
            
            if (!this.supervisorApiKey) {
                console.log('👁️ APIキーなし、感情分析スキップ');
                return;
            }
            
            const affectedCharacters = [];
            this.characterStates.forEach((state, charId) => {
                affectedCharacters.push({
                    id: charId,
                    name: state.characterName,
                    state
                });
            });
            
            if (affectedCharacters.length === 0) {
                console.log('👁️ キャラクターが登録されていません');
                return;
            }
            
            this.isAnalyzing = true;
            
            try {
                console.log(`👁️ 感情分析開始: "${logEntry.message.substring(0, 30)}..."`);
                const analysis = await this.callSupervisorLLM(logEntry, affectedCharacters);
                this.applyEmotionAnalysis(analysis);
            } catch (error) {
                console.error('👁️ 感情分析エラー:', error);
            } finally {
                this.isAnalyzing = false;
            }
        }
        
        async callSupervisorLLM(logEntry, affectedCharacters) {
            const characterList = affectedCharacters
                .map(c => {
                    const metersStr = Object.entries(c.state.meters)
                        .map(([k, v]) => `${EMOTION_LABELS[k]}:${v}`)
                        .join(', ');
                    return `- ${c.name} (${c.id}): ${metersStr}`;
                })
                .join('\n');
            
            const prompt = `あなたは会話の感情分析AIです。以下の発言を分析し、全キャラクターの感情変化をJSONで返してください。

【発言者】${logEntry.speakerName}
【発言内容】"${logEntry.message}"

【全キャラクターの現在の感情】
${characterList}

【ルール】
1. 発言者自身の感情も分析してください
2. 聞いている側の感情変化も分析してください
3. 変化量は-3〜+3の範囲で、0は変化なし
4. 全員分の分析を返してください

【出力形式】以下のJSON形式のみを出力:
{
  "changes": [
    {
      "characterId": "char_A",
      "emotions": {
        "joy": 0, "anger": 0, "sadness": 0, "fun": 1, "excitement": 0,
        "calm": 0, "tired": 0, "disappointment": 0, "fear": 0
      },
      "reason": "理由"
    }
  ],
  "summary": "発言の要約"
}`;

            const response = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.supervisorApiKey}`
                },
                body: JSON.stringify({
                    model: this.supervisorModel,
                    messages: [
                        { role: 'system', content: 'あなたは会話の感情分析AIです。必ずJSONのみを返してください。マークダウンは使わないでください。' },
                        { role: 'user', content: prompt }
                    ],
                    temperature: 0.3,
                    max_tokens: 1500
                })
            });
            
            const data = await response.json();
            let content = data.choices[0].message.content.trim();
            content = content.replace(/```json\s*/gi, '').replace(/```\s*/gi, '').trim();
            
            return JSON.parse(content);
        }
        
        applyEmotionAnalysis(analysis) {
            if (!analysis || !analysis.changes) return;
            
            console.log('👁️ 感情分析結果を適用:', analysis.summary);
            
            analysis.changes.forEach(change => {
                const state = this.characterStates.get(change.characterId);
                if (state) {
                    Object.entries(change.emotions).forEach(([emotion, delta]) => {
                        if (delta !== 0) {
                            state.adjustEmotion(emotion, delta);
                        }
                    });
                    
                    state.addEvent({
                        type: 'emotion_change',
                        summary: change.reason,
                        intensity: Math.max(...Object.values(change.emotions).map(Math.abs))
                    });
                }
            });
            
            this.analysisHistory.push({ timestamp: Date.now(), analysis });
            
            if (this.onEmotionUpdate) {
                this.onEmotionUpdate(this.getAllCharacterStates());
            }
            
            this.updateUI();
        }
        
        getOpenAIApiKey() {
            try {
                const stored = localStorage.getItem('vrm_viewer_openai_api_key');
                if (stored) return stored;
                
                const mcKey = document.getElementById('mc-api-key-openai')?.value;
                if (mcKey) return mcKey;
            } catch (e) {}
            
            if (window.app?.OPENAI_API_KEY) return window.app.OPENAI_API_KEY;
            if (window.app?.chatGPTClient?.apiKey) return window.app.chatGPTClient.apiKey;
            
            return null;
        }
        
        // ========================================
        // 演出指示システム
        // ========================================
        
        addDirective(directive) {
            const entry = {
                id: `dir_${Date.now()}`,
                ...directive,
                status: 'pending',
                createdAt: Date.now()
            };
            
            this.directorNotes.push(entry);
            this.activeDirectives.push(entry);
            
            console.log(`📝 演出指示追加: ${directive.instruction}`);
            this.updateUI();
            return entry;
        }
        
        getDirectivesForCharacter(characterId) {
            return this.activeDirectives.filter(d => 
                d.targetCharacter === characterId || d.targetCharacter === 'all'
            );
        }
        
        resolveDirective(directiveId) {
            const index = this.activeDirectives.findIndex(d => d.id === directiveId);
            if (index >= 0) {
                this.activeDirectives[index].status = 'resolved';
                this.activeDirectives.splice(index, 1);
                console.log(`✅ 演出指示完了: ${directiveId}`);
                this.updateUI();
            }
        }
        
        // ========================================
        // キャラLLMへのコンテキスト提供
        // ========================================
        
        generateContextForCharacter(characterId) {
            // ★ v2.2: システムがオフなら空文字を返す
            if (!this.systemEnabled) {
                return '';
            }
            
            const state = this.characterStates.get(characterId);
            if (!state) return '';
            
            let context = '';
            context += this.generateConversationSummary();
            context += '\n\n';
            context += state.generateEmotionContext();
            context += '\n';
            
            const directives = this.getDirectivesForCharacter(characterId);
            if (directives.length > 0) {
                context += '\n【今意識すべきこと】\n';
                directives.forEach(d => { context += `・${d.instruction}\n`; });
            }
            
            context += '\n【他のキャラクターの状態】\n';
            this.characterStates.forEach((otherState, otherId) => {
                if (otherId !== characterId) {
                    const dominant = otherState.getDominantEmotion();
                    context += `・${otherState.characterName}: ${EMOTION_LABELS[dominant.emotion]}（強度${dominant.intensity}）\n`;
                }
            });
            
            return context;
        }
        
        // ========================================
        // ★ v2.2: UI（編集可能な感情メーター）
        // ========================================
        
        createUI() {
            const existing = document.getElementById('supervisor-panel');
            if (existing) existing.remove();
            
            const panel = document.createElement('div');
            panel.id = 'supervisor-panel';
            panel.innerHTML = `
                <style>
                    #supervisor-panel {
                        position: fixed;
                        top: 10px;
                        right: 10px;
                        width: 400px;
                        max-height: 85vh;
                        background: rgba(15, 15, 30, 0.97);
                        border: 2px solid #6a4eff;
                        border-radius: 14px;
                        color: #fff;
                        font-size: 12px;
                        z-index: 10000;
                        overflow: hidden;
                        box-shadow: 0 6px 30px rgba(100, 80, 255, 0.3);
                    }
                    #supervisor-panel.system-off {
                        border-color: #666;
                        opacity: 0.7;
                    }
                    #supervisor-panel .sv-header {
                        background: linear-gradient(135deg, #6a4eff, #a855f7);
                        padding: 10px 15px;
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        cursor: move;
                    }
                    #supervisor-panel.system-off .sv-header {
                        background: linear-gradient(135deg, #444, #666);
                    }
                    #supervisor-panel .sv-header h3 {
                        margin: 0;
                        font-size: 13px;
                        display: flex;
                        align-items: center;
                        gap: 8px;
                    }
                    #supervisor-panel .sv-header-btns {
                        display: flex;
                        gap: 6px;
                        align-items: center;
                    }
                    #supervisor-panel .sv-toggle-system {
                        background: rgba(255,255,255,0.2);
                        border: none;
                        color: white;
                        font-size: 11px;
                        cursor: pointer;
                        padding: 4px 10px;
                        border-radius: 12px;
                        transition: all 0.2s;
                    }
                    #supervisor-panel .sv-toggle-system:hover {
                        background: rgba(255,255,255,0.3);
                    }
                    #supervisor-panel .sv-toggle-system.off {
                        background: #ff4a6a;
                    }
                    #supervisor-panel .sv-minimize {
                        background: rgba(255,255,255,0.2);
                        border: none;
                        color: white;
                        font-size: 16px;
                        cursor: pointer;
                        padding: 4px 10px;
                        border-radius: 6px;
                    }
                    #supervisor-panel .sv-content {
                        padding: 12px;
                        max-height: calc(85vh - 50px);
                        overflow-y: auto;
                    }
                    #supervisor-panel .sv-section {
                        margin-bottom: 12px;
                    }
                    #supervisor-panel .sv-section-title {
                        font-weight: bold;
                        color: #a855f7;
                        margin-bottom: 8px;
                        border-bottom: 1px solid #333;
                        padding-bottom: 5px;
                        display: flex;
                        align-items: center;
                        gap: 6px;
                    }
                    #supervisor-panel .sv-character {
                        background: rgba(255,255,255,0.03);
                        border: 1px solid rgba(255,255,255,0.1);
                        border-radius: 10px;
                        padding: 10px;
                        margin-bottom: 10px;
                    }
                    #supervisor-panel .sv-character.speaking {
                        border-color: #4aff4a;
                        box-shadow: 0 0 10px rgba(74, 255, 74, 0.3);
                    }
                    #supervisor-panel .sv-char-header {
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        margin-bottom: 8px;
                    }
                    #supervisor-panel .sv-char-name {
                        font-weight: bold;
                        font-size: 12px;
                        color: #ffd700;
                    }
                    #supervisor-panel .sv-char-dominant {
                        font-size: 10px;
                        padding: 2px 8px;
                        border-radius: 10px;
                        background: rgba(168, 85, 247, 0.3);
                    }
                    #supervisor-panel .sv-speaking-badge {
                        font-size: 9px;
                        padding: 2px 6px;
                        border-radius: 8px;
                        background: #4aff4a;
                        color: #000;
                        animation: pulse-badge 1s infinite;
                    }
                    @keyframes pulse-badge {
                        0%, 100% { opacity: 1; }
                        50% { opacity: 0.6; }
                    }
                    #supervisor-panel .sv-meters-grid {
                        display: grid;
                        grid-template-columns: repeat(3, 1fr);
                        gap: 6px;
                    }
                    #supervisor-panel .sv-meter-item {
                        display: flex;
                        flex-direction: column;
                        gap: 3px;
                    }
                    #supervisor-panel .sv-meter-header {
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        font-size: 9px;
                    }
                    #supervisor-panel .sv-meter-label {
                        display: flex;
                        align-items: center;
                        gap: 2px;
                    }
                    #supervisor-panel .sv-meter-value {
                        width: 28px;
                        padding: 1px 3px;
                        border: 1px solid #444;
                        border-radius: 4px;
                        background: #1a1a2e;
                        color: #fff;
                        font-size: 10px;
                        text-align: center;
                    }
                    #supervisor-panel .sv-meter-value:focus {
                        border-color: #a855f7;
                        outline: none;
                    }
                    #supervisor-panel .sv-meter-slider {
                        width: 100%;
                        height: 8px;
                        -webkit-appearance: none;
                        background: #222;
                        border-radius: 4px;
                        cursor: pointer;
                    }
                    #supervisor-panel .sv-meter-slider::-webkit-slider-thumb {
                        -webkit-appearance: none;
                        width: 12px;
                        height: 12px;
                        border-radius: 50%;
                        cursor: pointer;
                    }
                    #supervisor-panel .sv-directive-input {
                        width: 100%;
                        padding: 8px;
                        border: 1px solid #444;
                        border-radius: 6px;
                        background: #1a1a2e;
                        color: white;
                        margin-bottom: 8px;
                        font-size: 11px;
                    }
                    #supervisor-panel .sv-btn {
                        padding: 6px 14px;
                        border: none;
                        border-radius: 6px;
                        cursor: pointer;
                        font-size: 11px;
                        transition: all 0.2s;
                    }
                    #supervisor-panel .sv-btn-primary {
                        background: linear-gradient(135deg, #6a4eff, #a855f7);
                        color: white;
                    }
                    #supervisor-panel .sv-btn-danger {
                        background: #ff4a6a;
                        color: white;
                    }
                    #supervisor-panel .sv-directive-item {
                        background: rgba(168, 85, 247, 0.1);
                        padding: 8px;
                        border-radius: 6px;
                        margin-bottom: 6px;
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        border-left: 3px solid #a855f7;
                    }
                    #supervisor-panel .sv-log {
                        max-height: 100px;
                        overflow-y: auto;
                        font-size: 10px;
                        background: #0a0a15;
                        padding: 8px;
                        border-radius: 6px;
                    }
                    #supervisor-panel .sv-log-entry {
                        padding: 3px 0;
                        border-bottom: 1px solid #1a1a2e;
                    }
                    #supervisor-panel .sv-log-speaker {
                        color: #ffd700;
                        font-weight: bold;
                    }
                    #supervisor-panel .sv-status-row {
                        display: flex;
                        align-items: center;
                        gap: 10px;
                        padding: 8px;
                        background: rgba(74, 158, 255, 0.1);
                        border-radius: 8px;
                        margin-bottom: 10px;
                    }
                    #supervisor-panel .sv-status-dot {
                        width: 10px;
                        height: 10px;
                        border-radius: 50%;
                        background: #888;
                    }
                    #supervisor-panel .sv-status-dot.active {
                        background: #4aff4a;
                        animation: pulse-dot 1s infinite;
                    }
                    @keyframes pulse-dot {
                        0%, 100% { box-shadow: 0 0 0 0 rgba(74, 255, 74, 0.7); }
                        50% { box-shadow: 0 0 0 6px rgba(74, 255, 74, 0); }
                    }
                    #supervisor-panel .sv-no-chars {
                        text-align: center;
                        color: #888;
                        padding: 15px;
                        font-style: italic;
                    }
                    #supervisor-panel .sv-system-off-msg {
                        text-align: center;
                        padding: 20px;
                        color: #ff4a6a;
                        font-size: 13px;
                    }
                </style>
                
                <div class="sv-header">
                    <h3>👁️ 会話監視システム <span style="font-size:10px; opacity:0.7;">v2.5</span></h3>
                    <div class="sv-header-btns">
                        <button class="sv-minimize" onclick="window.conversationSupervisor.toggleUI()">−</button>
                    </div>
                </div>
                
                <div class="sv-content" id="supervisor-content">
                    <!-- ★★★ v2.3: 大きなON/OFFトグルボタン ★★★ -->
                    <div style="margin-bottom: 12px; padding: 10px; background: rgba(100, 80, 255, 0.1); border-radius: 10px; border: 1px solid rgba(100, 80, 255, 0.3);">
                        <div style="display: flex; justify-content: space-between; align-items: center;">
                            <div>
                                <div style="font-weight: bold; font-size: 12px; color: #a855f7;">🧠 感情分析システム</div>
                                <div style="font-size: 10px; color: #888; margin-top: 2px;" id="sv-system-status-text">キャラの感情を自動分析してLLMに渡します</div>
                            </div>
                            <button id="sv-toggle-system" style="
                                padding: 8px 20px;
                                font-size: 14px;
                                font-weight: bold;
                                border: none;
                                border-radius: 20px;
                                cursor: pointer;
                                transition: all 0.3s;
                                background: linear-gradient(135deg, #4aff4a, #00cc66);
                                color: #000;
                                box-shadow: 0 2px 10px rgba(74, 255, 74, 0.3);
                            ">ON</button>
                        </div>
                    </div>
                    
                    <!-- システムオフ時のメッセージ -->
                    <div class="sv-system-off-msg" id="sv-system-off-msg" style="display:none;">
                        🔇 感情分析システムはOFFです<br>
                        <small style="color:#888;">ONにすると自動で感情が分析され、LLMに渡されます</small>
                    </div>
                    
                    <!-- 発話状態 -->
                    <div class="sv-status-row" id="sv-speaking-status">
                        <div class="sv-status-dot" id="sv-status-dot"></div>
                        <span id="sv-status-text">誰も喋っていません</span>
                    </div>
                    
                    <!-- キャラクター感情 -->
                    <div class="sv-section">
                        <div class="sv-section-title">😊 各キャラクターの感情状態 <span style="font-size:9px;color:#888;margin-left:auto;">(クリックで編集可)</span></div>
                        <div id="sv-character-emotions">
                            <div class="sv-no-chars">キャラクターがまだ登録されていません</div>
                        </div>
                    </div>
                    
                    <!-- 演出指示 -->
                    <div class="sv-section">
                        <div class="sv-section-title">📝 演出指示</div>
                        <select class="sv-directive-input" id="sv-directive-target">
                            <option value="all">全員</option>
                        </select>
                        <input type="text" class="sv-directive-input" id="sv-directive-text" 
                               placeholder="例: ジャイ美のボケに毎回ツッコミを入れる">
                        <button class="sv-btn sv-btn-primary" onclick="window.conversationSupervisor.addDirectiveFromUI()">
                            指示を追加
                        </button>
                        <div id="sv-active-directives" style="margin-top: 10px;"></div>
                    </div>
                    
                    <!-- 会話ログ -->
                    <div class="sv-section">
                        <div class="sv-section-title">💬 最近の会話</div>
                        <div class="sv-log" id="sv-conversation-log">
                            <div style="color: #666; text-align: center;">会話ログがありません</div>
                        </div>
                    </div>
                </div>
            `;
            
            document.body.appendChild(panel);
            this.uiPanel = panel;
            this.makeDraggable(panel);
            
            // システムオン/オフボタンのイベント
            const toggleBtn = document.getElementById('sv-toggle-system');
            toggleBtn.addEventListener('click', () => {
                this.systemEnabled = !this.systemEnabled;
                this.saveSettings();
                this.updateUI();
            });
            
            this.updateUI();
            
            return panel;
        }
        
        makeDraggable(element) {
            const header = element.querySelector('.sv-header');
            let isDragging = false;
            let offsetX, offsetY;
            
            header.addEventListener('mousedown', (e) => {
                if (e.target.tagName === 'BUTTON') return;
                isDragging = true;
                offsetX = e.clientX - element.offsetLeft;
                offsetY = e.clientY - element.offsetTop;
            });
            
            document.addEventListener('mousemove', (e) => {
                if (isDragging) {
                    element.style.left = (e.clientX - offsetX) + 'px';
                    element.style.top = (e.clientY - offsetY) + 'px';
                    element.style.right = 'auto';
                }
            });
            
            document.addEventListener('mouseup', () => { isDragging = false; });
        }
        
        toggleUI() {
            const content = document.getElementById('supervisor-content');
            if (content) {
                this.uiMinimized = !this.uiMinimized;
                content.style.display = this.uiMinimized ? 'none' : 'block';
            }
        }
        
        updateUI() {
            if (!this.uiPanel) return;
            
            // システムオン/オフ表示
            const toggleBtn = document.getElementById('sv-toggle-system');
            const offMsg = document.getElementById('sv-system-off-msg');
            const panel = this.uiPanel;
            
            if (toggleBtn) {
                toggleBtn.textContent = this.systemEnabled ? 'ON' : 'OFF';
                toggleBtn.style.background = this.systemEnabled 
                    ? 'linear-gradient(135deg, #4aff4a, #00cc66)' 
                    : 'linear-gradient(135deg, #ff4a6a, #cc0033)';
                toggleBtn.style.color = this.systemEnabled ? '#000' : '#fff';
                toggleBtn.style.boxShadow = this.systemEnabled 
                    ? '0 2px 10px rgba(74, 255, 74, 0.3)' 
                    : '0 2px 10px rgba(255, 74, 106, 0.3)';
            }
            
            // ステータステキスト更新
            const statusTextEl = document.getElementById('sv-system-status-text');
            if (statusTextEl) {
                statusTextEl.textContent = this.systemEnabled 
                    ? 'キャラの感情を自動分析してLLMに渡します' 
                    : '感情分析が停止中です';
            }
            
            if (offMsg) {
                offMsg.style.display = this.systemEnabled ? 'none' : 'block';
            }
            
            panel.classList.toggle('system-off', !this.systemEnabled);
            
            // 発話状態
            const statusDot = document.getElementById('sv-status-dot');
            const statusText = document.getElementById('sv-status-text');
            
            if (statusDot && statusText) {
                if (this.isSpeaking && this.currentSpeakerId) {
                    const state = this.characterStates.get(this.currentSpeakerId);
                    statusDot.classList.add('active');
                    statusText.textContent = `🎤 ${state?.characterName || this.currentSpeakerId} が発話中`;
                } else {
                    statusDot.classList.remove('active');
                    statusText.textContent = '誰も喋っていません';
                }
            }
            
            // 4人分の感情メーター（編集可能）
            const emotionsContainer = document.getElementById('sv-character-emotions');
            if (emotionsContainer) {
                if (this.characterStates.size === 0) {
                    emotionsContainer.innerHTML = '<div class="sv-no-chars">キャラクターがまだ登録されていません<br><small>会話開始で自動登録されます</small></div>';
                } else {
                    emotionsContainer.innerHTML = '';
                    
                    this.characterStates.forEach((state, charId) => {
                        const charDiv = document.createElement('div');
                        charDiv.className = 'sv-character';
                        
                        if (this.currentSpeakerId === charId) {
                            charDiv.classList.add('speaking');
                        }
                        
                        const dominant = state.getDominantEmotion();
                        
                        // 感情メーターをグリッド表示（編集可能）
                        let metersHtml = '<div class="sv-meters-grid">';
                        Object.entries(state.meters).forEach(([emotion, value]) => {
                            const color = EMOTION_COLORS[emotion];
                            const emoji = EMOTION_EMOJIS[emotion];
                            const label = EMOTION_LABELS[emotion];
                            
                            metersHtml += `
                                <div class="sv-meter-item">
                                    <div class="sv-meter-header">
                                        <span class="sv-meter-label" style="font-size: 9px;">${emoji} ${label}</span>
                                        <input type="number" class="sv-meter-value" 
                                               min="0" max="10" value="${value}"
                                               data-char="${charId}" data-emotion="${emotion}"
                                               title="${label}: クリックして編集">
                                    </div>
                                    <input type="range" class="sv-meter-slider" 
                                           min="0" max="10" value="${value}"
                                           data-char="${charId}" data-emotion="${emotion}"
                                           style="--color: ${color};"
                                           title="${label}">
                                </div>
                            `;
                        });
                        metersHtml += '</div>';
                        
                        charDiv.innerHTML = `
                            <div class="sv-char-header">
                                <span class="sv-char-name">${state.characterName}</span>
                                <div style="display: flex; gap: 6px; align-items: center;">
                                    ${this.currentSpeakerId === charId ? '<span class="sv-speaking-badge">発話中</span>' : ''}
                                    <span class="sv-char-dominant">${EMOTION_EMOJIS[dominant.emotion]} ${EMOTION_LABELS[dominant.emotion]}</span>
                                </div>
                            </div>
                            ${metersHtml}
                        `;
                        
                        emotionsContainer.appendChild(charDiv);
                    });
                    
                    // イベントリスナーを追加（数値入力）
                    emotionsContainer.querySelectorAll('.sv-meter-value').forEach(input => {
                        input.addEventListener('change', (e) => {
                            const charId = e.target.dataset.char;
                            const emotion = e.target.dataset.emotion;
                            const value = parseInt(e.target.value) || 0;
                            this.setCharacterEmotion(charId, emotion, value);
                        });
                    });
                    
                    // イベントリスナーを追加（スライダー）
                    emotionsContainer.querySelectorAll('.sv-meter-slider').forEach(slider => {
                        slider.addEventListener('input', (e) => {
                            const charId = e.target.dataset.char;
                            const emotion = e.target.dataset.emotion;
                            const value = parseInt(e.target.value);
                            
                            // 対応する数値入力も更新
                            const numInput = emotionsContainer.querySelector(
                                `.sv-meter-value[data-char="${charId}"][data-emotion="${emotion}"]`
                            );
                            if (numInput) numInput.value = value;
                            
                            this.setCharacterEmotion(charId, emotion, value);
                        });
                        
                        // スライダーの色を設定
                        const color = slider.style.getPropertyValue('--color');
                        slider.style.background = `linear-gradient(to right, ${color} ${slider.value * 10}%, #222 ${slider.value * 10}%)`;
                        
                        slider.addEventListener('input', (e) => {
                            const color = e.target.style.getPropertyValue('--color');
                            e.target.style.background = `linear-gradient(to right, ${color} ${e.target.value * 10}%, #222 ${e.target.value * 10}%)`;
                        });
                    });
                }
            }
            
            // 演出指示ターゲット
            const targetSelect = document.getElementById('sv-directive-target');
            if (targetSelect) {
                const currentValue = targetSelect.value;
                targetSelect.innerHTML = '<option value="all">全員</option>';
                
                this.characterStates.forEach((state, charId) => {
                    targetSelect.innerHTML += `<option value="${charId}">${state.characterName}</option>`;
                });
                
                targetSelect.value = currentValue || 'all';
            }
            
            // アクティブな指示
            const directivesDiv = document.getElementById('sv-active-directives');
            if (directivesDiv) {
                if (this.activeDirectives.length === 0) {
                    directivesDiv.innerHTML = '<div style="color: #666; font-size: 10px;">アクティブな指示はありません</div>';
                } else {
                    directivesDiv.innerHTML = this.activeDirectives.map(d => `
                        <div class="sv-directive-item">
                            <span style="flex: 1; font-size: 11px;">${d.instruction}</span>
                            <button class="sv-btn sv-btn-danger" onclick="window.conversationSupervisor.resolveDirective('${d.id}')" style="font-size: 10px; padding: 3px 8px;">完了</button>
                        </div>
                    `).join('');
                }
            }
            
            // 会話ログ
            const logDiv = document.getElementById('sv-conversation-log');
            if (logDiv) {
                if (this.conversationLog.length === 0) {
                    logDiv.innerHTML = '<div style="color: #666; text-align: center;">会話ログがありません</div>';
                } else {
                    logDiv.innerHTML = this.conversationLog.slice(-8).map(entry => `
                        <div class="sv-log-entry">
                            <span class="sv-log-speaker">${entry.speakerName}:</span> 
                            ${entry.message.substring(0, 40)}${entry.message.length > 40 ? '...' : ''}
                        </div>
                    `).join('');
                    
                    logDiv.scrollTop = logDiv.scrollHeight;
                }
            }
        }
        
        addDirectiveFromUI() {
            const targetSelect = document.getElementById('sv-directive-target');
            const textInput = document.getElementById('sv-directive-text');
            
            if (targetSelect && textInput && textInput.value.trim()) {
                this.addDirective({
                    targetCharacter: targetSelect.value,
                    instruction: textInput.value.trim()
                });
                
                textInput.value = '';
            }
        }
        
        // ========================================
        // API Key設定
        // ========================================
        
        setApiKey(apiKey) {
            this.supervisorApiKey = apiKey;
            console.log('👁️ Supervisor API Key設定完了');
        }
        
        setLLMProvider(provider, model) {
            this.supervisorLLM = provider;
            this.supervisorModel = model || (provider === 'chatgpt' ? 'gpt-4o-mini' : 'gemini-1.5-flash');
            console.log(`👁️ Supervisor LLM設定: ${provider} (${this.supervisorModel})`);
        }
        
        // ========================================
        // シリアライズ
        // ========================================
        
        toJSON() {
            return {
                systemEnabled: this.systemEnabled,
                characterStates: Object.fromEntries(
                    Array.from(this.characterStates.entries()).map(([id, state]) => [
                        id,
                        { meters: state.meters, isForgiving: state.isForgiving, grudgeLevel: state.grudgeLevel, trustLevel: state.trustLevel }
                    ])
                ),
                conversationLog: this.conversationLog.slice(-50),
                activeDirectives: this.activeDirectives
            };
        }
        
        fromJSON(data) {
            if (data.systemEnabled !== undefined) {
                this.systemEnabled = data.systemEnabled;
            }
            
            if (data.characterStates) {
                Object.entries(data.characterStates).forEach(([id, stateData]) => {
                    const state = this.characterStates.get(id);
                    if (state) {
                        Object.assign(state.meters, stateData.meters);
                        state.isForgiving = stateData.isForgiving;
                        state.grudgeLevel = stateData.grudgeLevel;
                        state.trustLevel = stateData.trustLevel;
                    }
                });
            }
            
            if (data.conversationLog) this.conversationLog = data.conversationLog;
            if (data.activeDirectives) this.activeDirectives = data.activeDirectives;
            
            this.updateUI();
        }
    }
    
    // グローバル登録
    window.ConversationSupervisor = ConversationSupervisor;
    window.CharacterEmotionState = CharacterEmotionState;
    window.EMOTION_TYPES = EMOTION_TYPES;
    window.EMOTION_LABELS = EMOTION_LABELS;
    
    // シングルトンインスタンス
    window.conversationSupervisor = new ConversationSupervisor();
    
    // ========================================
    // PipelinedDialogueDirectorとの統合
    // ========================================
    
    function integrateWithPipeline() {
        const checkInterval = setInterval(() => {
            const director = window.pipelinedDialogueDirector || 
                            (window.multiCharManager && window.multiCharManager.director);
            
            if (director) {
                clearInterval(checkInterval);
                
                const supervisor = window.conversationSupervisor;
                
                console.log('👁️ ConversationSupervisor ⟷ PipelinedDialogueDirector 連携開始');
                
                supervisor.registerCharactersFromDirector();
                
                const originalOnTurnEnd = director.onTurnEnd;
                director.onTurnEnd = (speaker, text, emotion) => {
                    if (originalOnTurnEnd) originalOnTurnEnd(speaker, text, emotion);
                    
                    supervisor.registerCharacter(speaker.id, speaker.name);
                    supervisor.logMessage(speaker.id, speaker.name, text, emotion);
                };
                
                window.addEventListener('multichar:playbackStart', (e) => {
                    const { speakerId, speakerName } = e.detail;
                    supervisor.registerCharacter(speakerId, speakerName);
                    supervisor.startSpeaking(speakerId);
                });
                
                window.addEventListener('multichar:playbackEnd', (e) => {
                    const { speakerId } = e.detail;
                    supervisor.endSpeaking(speakerId);
                });
                
                const originalOnConversationStart = director.onConversationStart;
                director.onConversationStart = (topic) => {
                    if (originalOnConversationStart) originalOnConversationStart(topic);
                    supervisor.registerCharactersFromDirector();
                };
                
                console.log('👁️ 連携完了');
                
                supervisor.createUI();
                
                setTimeout(() => supervisor.registerCharactersFromDirector(), 500);
            }
        }, 500);
        
        setTimeout(() => clearInterval(checkInterval), 30000);
    }
    
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => setTimeout(integrateWithPipeline, 1500));
    } else {
        setTimeout(integrateWithPipeline, 1500);
    }
    
    console.log('👁️ ConversationSupervisor v2.5 グローバル登録完了');
    
    // ========================================
    // マルチキャラパネルとの連動
    // ========================================
    
    function linkWithMultiCharPanel() {
        const mcPanel = document.getElementById('multi-character-panel');
        const supervisorPanel = document.getElementById('supervisor-panel');
        
        if (!mcPanel) {
            setTimeout(linkWithMultiCharPanel, 500);
            return;
        }
        
        const observer = new MutationObserver((mutations) => {
            const supervisorPanel = document.getElementById('supervisor-panel');
            if (!supervisorPanel) return;
            
            const mcDisplay = mcPanel.style.display;
            const mcVisible = mcDisplay !== 'none';
            
            supervisorPanel.style.display = mcVisible ? 'block' : 'none';
        });
        
        observer.observe(mcPanel, { attributes: true, attributeFilter: ['style'] });
        
        const supervisorPanel2 = document.getElementById('supervisor-panel');
        if (supervisorPanel2 && mcPanel) {
            const mcVisible = mcPanel.style.display !== 'none';
            supervisorPanel2.style.display = mcVisible ? 'block' : 'none';
        }
        
        console.log('👁️ マルチキャラパネルと連動設定完了');
    }
    
    setTimeout(linkWithMultiCharPanel, 2000);
    
})();
