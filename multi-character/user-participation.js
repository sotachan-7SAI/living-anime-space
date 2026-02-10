// ========================================
// UserParticipation - ユーザー割り込み参加システム v3.4
// ========================================
// 
// 🎯 機能:
//   1. 会話ログにユーザーコメント投稿欄
//   2. テキスト入力 or 音声入力（マイク / VMCモーキャプカメラ音声）
//   3. ★ v3.0: 即時割り込みモード（キャッシュ全破棄）
//   4. 名前指定で次の回答者を選択（○○にむけて発言ボタン）
//   5. キャラがユーザー発言として認識・反応
//   6. 「ユーザーを追加」ボタンでキャラ一覧にユーザーを追加
//   7. AI Director Camera V2.3と連携してユーザーにカメラを向ける
//   8. 発言予約機能：会話を一時停止してカメラをユーザーに向ける
//
// 【v3.4 改善】割り込み後の複数人同時発話修正
//   - director.isUserInterrupting フラグ追加
//   - pipelineLoopが割り込み中は処理をスキップ
//   - 音声のonendedイベントで割り込みチェック
//
// 【v3.3 改善】割り込み後の会話再開修正
//   - 割り込み後は1人が応答
//   - 応答完了後、確実に会話を再開
//   - パイプライン先読みと競合しないように修正
//
// 【v3.1 改善】強化版キャッシュ破棄
//   - 全てのAudio要素を停止
//   - パイプラインの完全クリア
//   - isCurrentlyPlaying等のフラグを確実にリセット
//   - 声が同時に流れる問題を解決！
//
// 【v3.0 新機能】即時割り込み（キャッシュ全破棄）
//   - 話した瞬間に再生中の音声を停止
//   - パイプライン（先読みキャッシュ）を全破棄
//   - ユーザー発言を会話履歴に追加
//   - 新しい文脈で会話を再開
//   → バラエティ番組のような生放送感！
//
// ========================================

(function() {
    'use strict';

class UserParticipation {
    constructor(director, ui) {
        this.director = director;         // PipelinedDialogueDirector
        this.ui = ui;                      // MultiCharacterUI
        
        // 状態
        this.isEnabled = true;
        this.isRecording = false;          // 音声入力中
        this.recognition = null;           // SpeechRecognition
        this.targetCharacterId = null;     // 指名キャラID（null=自動）
        
        // ★ ユーザー参加モード
        this.isUserParticipant = false;    // ユーザーがキャラ一覧に参加しているか
        this.userCharacter = null;         // ユーザーキャラクター情報
        
        // 設定
        this.userName = 'ユーザー';
        this.userIconEmoji = '👤';
        
        // ★ VMCモーキャプ音声連携
        this.useVMCAudio = false;          // VMCカメラ音声を使うか
        this.vmcAudioStream = null;        // VMCオーディオストリーム
        
        // UI要素
        this.inputContainer = null;
        this.textInput = null;
        this.voiceBtn = null;
        this.sendBtn = null;
        this.targetSelect = null;
        
        // ★ 音声認識の中間結果
        this.interimTranscript = '';
        this.finalTranscript = '';
        
        // ★ 発言予約モード
        this.isReserved = false;           // 発言予約中か
        this.reserveBtn = null;            // 発言予約ボタン
        
        // ★ v3.0: 即時割り込みモード
        this.interruptMode = 'immediate';  // 'immediate' | 'reserved' | 'cycle'
        this.currentAudio = null;          // 現在再生中のAudioオブジェクト
        
        // ★ v3.1: 割り込み処理中フラグ
        this.isInterrupting = false;
        
        console.log('👤 UserParticipation v3.4 初期化（割り込み後の複数人同時発話修正）');
    }
    
    /**
     * UIを生成して会話ログセクションに追加
     */
    createUI(conversationLogParent) {
        // 既存の入力エリアがあれば削除
        const existing = document.getElementById('user-participation-container');
        if (existing) existing.remove();
        
        // ユーザー入力コンテナ
        this.inputContainer = document.createElement('div');
        this.inputContainer.id = 'user-participation-container';
        this.inputContainer.innerHTML = `
            <div class="up-header">
                <span class="up-icon">${this.userIconEmoji}</span>
                <span class="up-title">🎤 会話割り込み v3.4</span>
                <label class="up-enable-toggle">
                    <input type="checkbox" id="up-enabled" checked>
                    <span>有効</span>
                </label>
            </div>
            
            <div class="up-body" id="up-body">
                <!-- ★ v3.0: 割り込みモード選択 -->
                <div class="up-mode-row">
                    <label class="up-mode-label">割り込み方式:</label>
                    <div class="up-mode-buttons">
                        <button class="up-mode-btn active" id="up-mode-immediate" title="話した瞬間に会話を中断">
                            ⚡ 即時
                        </button>
                        <button class="up-mode-btn" id="up-mode-reserved" title="発言予約して順番を待つ">
                            ✋ 予約
                        </button>
                    </div>
                </div>
                
                <!-- ★ ユーザー参加ボタン -->
                <div class="up-add-user-row" id="up-add-user-row">
                    <button class="up-btn up-btn-add-user" id="up-add-user-btn" title="自分も会話に参加">
                        👤＋ ユーザーを追加
                    </button>
                    <span class="up-hint-small">会話に参加してキャラと交流！</span>
                </div>
                
                <!-- ★ ユーザー参加中の表示 -->
                <div class="up-user-active" id="up-user-active" style="display: none;">
                    <span class="up-user-badge">👤 参加中</span>
                    <button class="up-btn up-btn-remove-user" id="up-remove-user-btn" title="参加をやめる">退出</button>
                </div>
                
                <!-- 指名先選択 -->
                <div class="up-target-row">
                    <label>📣 発言先:</label>
                    <select id="up-target-select">
                        <option value="">自動（次の順番）</option>
                    </select>
                    <button class="up-btn up-btn-refresh" id="up-refresh-targets" title="キャラ一覧を更新">🔄</button>
                </div>
                
                <!-- ★ 発言予約ボタン（予約モード時のみ表示） -->
                <div class="up-reserve-row" id="up-reserve-row" style="display: none;">
                    <button class="up-btn up-btn-reserve" id="up-reserve-btn" title="会話を止めて発言準備">
                        ✋ 発言予約
                    </button>
                    <span class="up-hint-small">会話を止めてカメラがあなたに向きます</span>
                </div>
                
                <!-- ★ 発言予約中の表示 -->
                <div class="up-reserved-status" id="up-reserved-status" style="display: none;">
                    <span class="up-reserved-badge">🎤 発言準備中...</span>
                    <button class="up-btn up-btn-cancel-reserve" id="up-cancel-reserve-btn" title="予約をキャンセル">キャンセル</button>
                </div>
                
                <!-- テキスト入力 -->
                <div class="up-input-row">
                    <input type="text" id="up-text-input" placeholder="💬 会話に割り込むメッセージを入力..." />
                    <button class="up-btn up-btn-voice" id="up-voice-btn" title="音声入力">🎤</button>
                    <button class="up-btn up-btn-send" id="up-send-btn" title="送信（即時割り込み）">⚡</button>
                </div>
                
                <!-- ★ VMCカメラ音声オプション -->
                <div class="up-vmc-audio-row" id="up-vmc-audio-row">
                    <label class="up-checkbox-label">
                        <input type="checkbox" id="up-use-vmc-audio">
                        <span>🎥 VMCカメラ音声を使用</span>
                    </label>
                </div>
                
                <!-- 音声入力状態 -->
                <div class="up-voice-status" id="up-voice-status" style="display:none;">
                    <span class="up-voice-indicator">🔴</span>
                    <span id="up-voice-text">音声認識中...</span>
                    <button class="up-btn up-btn-stop" id="up-voice-stop">停止</button>
                </div>
                
                <!-- ★ 音声認識プレビュー -->
                <div class="up-voice-preview" id="up-voice-preview" style="display:none;">
                    <div class="up-voice-interim" id="up-voice-interim"></div>
                </div>
                
                <!-- ヒント -->
                <div class="up-hint">
                    ⚡ 即時モード: 送信した瞬間に会話を中断して割り込み！
                </div>
            </div>
        `;
        
        // スタイル追加
        this.addStyles();
        
        // 会話ログセクションの前に挿入
        conversationLogParent.insertBefore(this.inputContainer, conversationLogParent.firstChild);
        
        // 要素を取得
        this.textInput = document.getElementById('up-text-input');
        this.voiceBtn = document.getElementById('up-voice-btn');
        this.sendBtn = document.getElementById('up-send-btn');
        this.targetSelect = document.getElementById('up-target-select');
        
        // イベントリスナー
        this.setupEventListeners();
        
        console.log('👤 ユーザー参加UI作成完了');
    }
    
    /**
     * スタイル追加
     */
    addStyles() {
        const styleId = 'user-participation-styles';
        if (document.getElementById(styleId)) return;
        
        const style = document.createElement('style');
        style.id = styleId;
        style.textContent = `
            #user-participation-container {
                background: linear-gradient(135deg, rgba(59, 130, 246, 0.2) 0%, rgba(147, 51, 234, 0.2) 100%);
                border: 1px solid rgba(59, 130, 246, 0.4);
                border-radius: 8px;
                padding: 8px;
                margin-bottom: 8px;
            }
            
            .up-header {
                display: flex;
                align-items: center;
                gap: 6px;
                margin-bottom: 6px;
                padding-bottom: 6px;
                border-bottom: 1px solid rgba(255,255,255,0.1);
            }
            
            .up-icon { font-size: 16px; }
            
            .up-title {
                font-weight: bold;
                font-size: 11px;
                color: #93c5fd;
                flex: 1;
            }
            
            .up-enable-toggle {
                display: flex;
                align-items: center;
                gap: 4px;
                font-size: 9px;
                color: #aaa;
                cursor: pointer;
            }
            
            .up-enable-toggle input { width: 14px; height: 14px; }
            
            .up-body {
                display: flex;
                flex-direction: column;
                gap: 6px;
            }
            
            .up-body.disabled { opacity: 0.5; pointer-events: none; }
            
            .up-mode-row {
                display: flex;
                align-items: center;
                gap: 8px;
                padding: 6px;
                background: rgba(0, 0, 0, 0.2);
                border-radius: 6px;
            }
            
            .up-mode-label { font-size: 10px; color: #aaa; white-space: nowrap; }
            
            .up-mode-buttons { display: flex; gap: 4px; flex: 1; }
            
            .up-mode-btn {
                flex: 1;
                padding: 6px 10px;
                border: 1px solid rgba(255,255,255,0.2);
                border-radius: 4px;
                background: rgba(255,255,255,0.05);
                color: #aaa;
                font-size: 10px;
                cursor: pointer;
                transition: all 0.2s;
            }
            
            .up-mode-btn:hover { background: rgba(255,255,255,0.1); color: #fff; }
            
            .up-mode-btn.active {
                background: linear-gradient(135deg, #f59e0b 0%, #ef4444 100%);
                color: white;
                border-color: #f59e0b;
                font-weight: bold;
            }
            
            .up-mode-btn.active[id="up-mode-reserved"] {
                background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%);
                border-color: #fbbf24;
            }
            
            .up-add-user-row {
                display: flex;
                align-items: center;
                gap: 8px;
                padding: 6px;
                background: rgba(74, 222, 128, 0.15);
                border-radius: 6px;
                border: 1px dashed rgba(74, 222, 128, 0.5);
            }
            
            .up-btn-add-user {
                background: linear-gradient(135deg, #4ade80 0%, #22c55e 100%) !important;
                color: white !important;
                font-weight: bold;
                padding: 8px 12px !important;
            }
            
            .up-hint-small { font-size: 9px; color: #4ade80; }
            
            .up-user-active {
                display: flex;
                align-items: center;
                gap: 8px;
                padding: 6px;
                background: rgba(59, 130, 246, 0.2);
                border-radius: 6px;
                border: 1px solid rgba(59, 130, 246, 0.5);
            }
            
            .up-user-badge { font-size: 11px; color: #93c5fd; font-weight: bold; flex: 1; }
            
            .up-btn-remove-user {
                background: rgba(239, 68, 68, 0.3) !important;
                color: #fca5a5 !important;
                font-size: 10px !important;
                padding: 4px 8px !important;
            }
            
            .up-target-row { display: flex; align-items: center; gap: 6px; }
            .up-target-row label { font-size: 10px; color: #aaa; white-space: nowrap; }
            
            .up-target-row select {
                flex: 1;
                padding: 4px 6px;
                border: 1px solid #444;
                border-radius: 4px;
                background: #2a2a3e;
                color: #e0e0e0;
                font-size: 10px;
            }
            
            .up-input-row { display: flex; gap: 4px; }
            
            .up-input-row input {
                flex: 1;
                padding: 6px 10px;
                border: 1px solid #444;
                border-radius: 6px;
                background: #1a1a2e;
                color: #e0e0e0;
                font-size: 11px;
            }
            
            .up-input-row input:focus {
                outline: none;
                border-color: #f59e0b;
                box-shadow: 0 0 5px rgba(245, 158, 11, 0.3);
            }
            
            .up-vmc-audio-row { padding: 4px 0; }
            
            .up-checkbox-label {
                display: flex;
                align-items: center;
                gap: 6px;
                font-size: 10px;
                color: #aaa;
                cursor: pointer;
            }
            
            .up-checkbox-label input { width: 14px; height: 14px; }
            
            .up-btn {
                padding: 6px 10px;
                border: none;
                border-radius: 6px;
                cursor: pointer;
                font-size: 12px;
                transition: all 0.2s;
            }
            
            .up-btn:hover { transform: scale(1.05); }
            .up-btn:active { transform: scale(0.95); }
            
            .up-btn-voice {
                background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
                color: white;
            }
            
            .up-btn-voice.recording { animation: recording-pulse 1s infinite; }
            
            @keyframes recording-pulse {
                0%, 100% { box-shadow: 0 0 5px rgba(239, 68, 68, 0.5); }
                50% { box-shadow: 0 0 15px rgba(239, 68, 68, 0.8); }
            }
            
            .up-btn-send {
                background: linear-gradient(135deg, #f59e0b 0%, #ef4444 100%);
                color: white;
                font-weight: bold;
            }
            
            .up-btn-send:hover { box-shadow: 0 0 10px rgba(245, 158, 11, 0.5); }
            
            .up-btn-refresh { background: #444; color: #aaa; padding: 4px 6px; font-size: 10px; }
            .up-btn-stop { background: #666; color: white; font-size: 10px; padding: 4px 8px; }
            
            .up-voice-status {
                display: flex;
                align-items: center;
                gap: 6px;
                padding: 6px 10px;
                background: rgba(239, 68, 68, 0.2);
                border-radius: 6px;
                font-size: 10px;
                color: #fca5a5;
            }
            
            .up-voice-indicator { animation: blink 1s infinite; }
            
            @keyframes blink {
                0%, 100% { opacity: 1; }
                50% { opacity: 0.3; }
            }
            
            .up-voice-preview {
                padding: 6px 10px;
                background: rgba(0, 0, 0, 0.3);
                border-radius: 6px;
                font-size: 11px;
                color: #ccc;
                min-height: 24px;
            }
            
            .up-voice-interim { color: #fbbf24; font-style: italic; }
            
            .up-hint { font-size: 9px; color: #f59e0b; text-align: center; padding: 2px 0; }
            
            .mc-log-entry.user-entry {
                border-left-color: #f59e0b !important;
                background: rgba(245, 158, 11, 0.1) !important;
            }
            
            .mc-log-entry.user-entry .mc-log-speaker { color: #fbbf24 !important; }
            
            .mc-char-item.user-char {
                background: rgba(59, 130, 246, 0.15) !important;
                border: 1px solid rgba(59, 130, 246, 0.4) !important;
            }
            
            .mc-char-item.user-char .mc-char-avatar {
                background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%) !important;
            }
            
            .up-reserve-row {
                display: flex;
                align-items: center;
                gap: 8px;
                padding: 6px;
                background: rgba(251, 191, 36, 0.15);
                border-radius: 6px;
                border: 1px dashed rgba(251, 191, 36, 0.5);
            }
            
            .up-btn-reserve {
                background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%) !important;
                color: #1a1a2e !important;
                font-weight: bold;
                padding: 8px 12px !important;
            }
            
            .up-btn-reserve:hover { box-shadow: 0 0 10px rgba(251, 191, 36, 0.5); }
            
            .up-reserved-status {
                display: flex;
                align-items: center;
                gap: 8px;
                padding: 8px;
                background: linear-gradient(135deg, rgba(251, 191, 36, 0.3) 0%, rgba(245, 158, 11, 0.3) 100%);
                border-radius: 6px;
                border: 2px solid rgba(251, 191, 36, 0.8);
                animation: reserve-pulse 1.5s infinite;
            }
            
            @keyframes reserve-pulse {
                0%, 100% { box-shadow: 0 0 5px rgba(251, 191, 36, 0.3); }
                50% { box-shadow: 0 0 15px rgba(251, 191, 36, 0.6); }
            }
            
            .up-reserved-badge {
                font-size: 12px;
                color: #fbbf24;
                font-weight: bold;
                flex: 1;
                animation: badge-blink 1s infinite;
            }
            
            @keyframes badge-blink {
                0%, 100% { opacity: 1; }
                50% { opacity: 0.6; }
            }
            
            .up-btn-cancel-reserve {
                background: rgba(239, 68, 68, 0.3) !important;
                color: #fca5a5 !important;
                font-size: 10px !important;
                padding: 4px 8px !important;
            }
            
            .up-interrupting { animation: interrupt-flash 0.3s ease-out; }
            
            @keyframes interrupt-flash {
                0% { background: rgba(245, 158, 11, 0.5); }
                100% { background: transparent; }
            }
        `;
        document.head.appendChild(style);
    }
    
    /**
     * イベントリスナー設定
     */
    setupEventListeners() {
        document.getElementById('up-enabled').addEventListener('change', (e) => {
            this.isEnabled = e.target.checked;
            document.getElementById('up-body').classList.toggle('disabled', !this.isEnabled);
        });
        
        document.getElementById('up-mode-immediate').addEventListener('click', () => {
            this.setInterruptMode('immediate');
        });
        
        document.getElementById('up-mode-reserved').addEventListener('click', () => {
            this.setInterruptMode('reserved');
        });
        
        document.getElementById('up-add-user-btn').addEventListener('click', () => {
            this.addUserToConversation();
        });
        
        document.getElementById('up-remove-user-btn').addEventListener('click', () => {
            this.removeUserFromConversation();
        });
        
        this.sendBtn.addEventListener('click', () => { this.sendMessage(); });
        
        this.textInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });
        
        this.voiceBtn.addEventListener('click', () => { this.toggleVoiceInput(); });
        document.getElementById('up-voice-stop').addEventListener('click', () => { this.stopVoiceInput(); });
        document.getElementById('up-refresh-targets').addEventListener('click', () => { this.refreshTargetList(); });
        
        this.targetSelect.addEventListener('change', (e) => {
            this.targetCharacterId = e.target.value || null;
        });
        
        document.getElementById('up-use-vmc-audio').addEventListener('change', (e) => {
            this.useVMCAudio = e.target.checked;
            console.log('🎥 VMCオーディオ使用:', this.useVMCAudio);
        });
        
        this.updateVMCAudioVisibility();
        
        this.reserveBtn = document.getElementById('up-reserve-btn');
        this.reserveBtn.addEventListener('click', () => { this.reserveSpeech(); });
        
        document.getElementById('up-cancel-reserve-btn').addEventListener('click', () => {
            this.cancelReservation();
        });
    }
    
    /**
     * ★ v3.0: 割り込みモードを設定
     */
    setInterruptMode(mode) {
        this.interruptMode = mode;
        
        document.getElementById('up-mode-immediate').classList.toggle('active', mode === 'immediate');
        document.getElementById('up-mode-reserved').classList.toggle('active', mode === 'reserved');
        document.getElementById('up-reserve-row').style.display = mode === 'reserved' ? 'flex' : 'none';
        
        if (mode === 'immediate') {
            this.sendBtn.textContent = '⚡';
            this.sendBtn.title = '送信（即時割り込み）';
            document.querySelector('.up-hint').textContent = '⚡ 即時モード: 送信した瞬間に会話を中断して割り込み！';
        } else {
            this.sendBtn.textContent = '📤';
            this.sendBtn.title = '送信（予約後）';
            document.querySelector('.up-hint').textContent = '✋ 予約モード: 発言予約ボタンで順番を待ってから発言';
        }
        
        console.log(`🎤 割り込みモード変更: ${mode}`);
    }
    
    /**
     * ★ v3.1: 現在再生中の音声を停止（強化版）
     */
    stopCurrentAudio() {
        console.log('🔇 ========================================');
        console.log('🔇 全ての音声を強制停止！');
        console.log('🔇 ========================================');
        
        // 1. このクラスで追跡しているAudioを停止
        if (this.currentAudio) {
            try {
                this.currentAudio.pause();
                this.currentAudio.currentTime = 0;
                this.currentAudio = null;
                console.log('🔇 currentAudio停止');
            } catch (e) {
                console.warn('⚠️ Audio停止エラー:', e);
            }
        }
        
        // 2. ブラウザTTSを停止
        if (window.speechSynthesis) {
            window.speechSynthesis.cancel();
            console.log('🔇 ブラウザTTS停止');
        }
        
        // 3. ページ上の全てのAudio要素を停止
        const allAudioElements = document.querySelectorAll('audio');
        allAudioElements.forEach((audio, i) => {
            try {
                audio.pause();
                audio.currentTime = 0;
                console.log(`🔇 Audio要素 ${i} 停止`);
            } catch (e) {}
        });
        
        // 4. 話者のリップシンクを停止
        if (this.director) {
            this.director.characters.forEach((char, id) => {
                if (char.stopLipSync) {
                    char.stopLipSync();
                }
                char.isSpeaking = false;
                this.director.updateSpeakerHighlight(id, 'none');
            });
        }
        
        // 5. 字幕終了イベント
        window.dispatchEvent(new CustomEvent('multichar:playbackEnd', {
            detail: { speakerId: null, interrupted: true }
        }));
        
        console.log('🔇 音声停止完了');
    }
    
    /**
     * ★ v3.1: パイプラインを全破棄（強化版）
     * ★ v3.4: isUserInterruptingフラグ追加
     */
    clearPipeline() {
        if (!this.director) return;
        
        console.log('🗑️ ========================================');
        console.log('🗑️ パイプライン完全破棄！');
        console.log('🗑️ ========================================');
        
        const pipelineCount = this.director.pipeline.length;
        
        // ★ v3.4: 割り込みフラグを立てる（pipelineLoopが新規起動しないように）
        this.director.isUserInterrupting = true;
        
        // 1. パイプライン配列を完全にクリア
        this.director.pipeline = [];
        
        // 2. 順次計算中フラグをリセット
        this.director.isPreparingSequentially = false;
        
        // 3. 再生中フラグをリセット（重要！）
        this.director.isCurrentlyPlaying = false;
        this.director.currentPlayingSpeakerId = null;
        
        // 4. 現在の話者IDをクリア
        this.director.currentSpeakerId = null;
        
        // ★ v3.4: pipelineLoopの実行中フラグもリセット
        this.director.isPipelineLoopRunning = false;
        
        console.log(`🗑️ パイプライン破棄完了: ${pipelineCount}件のエントリを削除`);
        console.log(`🗑️ isCurrentlyPlaying: false`);
        console.log(`🗑️ isPreparingSequentially: false`);
        console.log(`🗑️ isPipelineLoopRunning: false`);
        console.log(`🗑️ isUserInterrupting: true`);
        
        // 5. パイプライン更新イベント
        window.dispatchEvent(new CustomEvent('multichar:pipelineUpdate'));
        
        // 6. 全キャラのハイライトをリセット
        if (this.director.turnOrder) {
            this.director.turnOrder.forEach(id => {
                this.director.updateSpeakerHighlight(id, 'none');
            });
        }
    }
    
    /**
     * ★ v3.1: 即時割り込み実行（強化版）
     */
    async executeImmediateInterrupt(text, targetId) {
        // 二重実行防止
        if (this.isInterrupting) {
            console.log('⚠️ 既に割り込み処理中...');
            return;
        }
        this.isInterrupting = true;
        
        console.log('');
        console.log('⚡ ========================================');
        console.log('⚡ 即時割り込み実行！');
        console.log(`⚡ 「${text}」`);
        console.log('⚡ ========================================');
        
        // directorがない場合は再接続を試みる
        if (!this.director) {
            const director = window.multiCharManager?.director;
            if (director) {
                this.director = director;
                window.pipelinedDirector = director;
                this.refreshTargetList();
            }
        }
        
        if (!this.director) {
            console.warn('⚠️ 会話システムが初期化されていません');
            this.addUserLogEntry(text);
            this.isInterrupting = false;
            return;
        }
        
        // 視覚的フィードバック
        this.inputContainer.classList.add('up-interrupting');
        setTimeout(() => this.inputContainer.classList.remove('up-interrupting'), 300);
        
        try {
            // ★ 1. 再生中の音声を停止（全て）
            this.stopCurrentAudio();
            
            // ★ 2. パイプラインを全破棄（フラグもリセット）
            this.clearPipeline();
            
            // ★ 3. 少し待機（前の処理が完全に終わるまで）
            await this.wait(200);
            
            // ★ 4. ユーザー発言を会話履歴に追加
            this.director.conversationHistory.push({
                speakerId: 'user',
                speakerName: this.userName,
                text: text,
                emotion: null,
                timestamp: Date.now(),
                isUser: true
            });
            
            if (this.director.conversationHistory.length > this.director.maxHistoryLength) {
                this.director.conversationHistory = this.director.conversationHistory.slice(-this.director.maxHistoryLength);
            }
            
            // ★ 5. UIのログに表示
            this.addUserLogEntry(text);
            
            // ★ 6. カメラをユーザーに向ける
            this.focusCameraOnUser();
            
            // ★ 7. 次の回答者を決定
            let responderId = targetId;
            if (!responderId) {
                responderId = this.detectTargetFromText(text);
            }
            if (!responderId) {
                responderId = this.director.turnOrder[0];
            }
            
            const responder = this.director.getCharacter(responderId);
            console.log(`⚡ 回答者: ${responder ? responder.name : responderId}`);
            
            // ★ 8. 会話が実行中なら回答者に応答させて会話再開
            if (this.director.isRunning) {
                this.focusCameraOnCharacter(responderId);
                await this.generateUserResponse(responderId, text);
            } else {
                console.log('⚠️ 会話が開始されていません（ログのみ表示）');
            }
            
        } finally {
            this.isInterrupting = false;
        }
        
        // イベント発火
        window.dispatchEvent(new CustomEvent('multichar:userInterrupt', {
            detail: { text, mode: 'immediate' }
        }));
    }
    
    /**
     * ★ 発言予約
     */
    reserveSpeech() {
        if (!this.director) {
            const director = window.multiCharManager?.director;
            if (director) {
                this.director = director;
                window.pipelinedDirector = director;
                this.refreshTargetList();
            }
        }
        
        if (!this.director) {
            console.warn('⚠️ 会話システムが初期化されていません');
            alert('⚠️ まず会話を開始してください');
            return;
        }
        
        if (!this.director.isRunning) {
            console.warn('⚠️ 会話が開始されていません');
            alert('⚠️ 会話が開始されていません。先に会話を開始してください。');
            return;
        }
        
        console.log('');
        console.log('✋ ========================================');
        console.log('✋ 発言予約: 会話を一時停止');
        console.log('✋ ========================================');
        
        this.isReserved = true;
        
        document.getElementById('up-reserve-row').style.display = 'none';
        document.getElementById('up-reserved-status').style.display = 'flex';
        
        if (!this.director.isPaused) {
            this.director.pause();
            console.log('⏸️ 会話を一時停止しました');
        }
        
        this.focusCameraOnUser();
        this.textInput.focus();
        
        window.dispatchEvent(new CustomEvent('multichar:userReserveSpeech'));
    }
    
    /**
     * ★ 発言予約をキャンセル
     */
    cancelReservation() {
        if (!this.isReserved) return;
        
        console.log('❌ 発言予約をキャンセル');
        
        this.isReserved = false;
        
        document.getElementById('up-reserve-row').style.display = 'flex';
        document.getElementById('up-reserved-status').style.display = 'none';
        
        if (this.director && this.director.isPaused && this.director.isRunning) {
            this.director.resume();
            console.log('▶️ 会話を再開しました');
        }
        
        window.dispatchEvent(new CustomEvent('multichar:userCancelReservation'));
    }
    
    updateVMCAudioVisibility() {
        const vmcRow = document.getElementById('up-vmc-audio-row');
        if (vmcRow) {
            const hasVMC = window.vmcMocap && window.vmcMocap.avatarVRM;
            vmcRow.style.display = hasVMC ? 'block' : 'none';
        }
    }
    
    addUserToConversation() {
        if (this.isUserParticipant) {
            console.log('⚠️ ユーザーは既に参加中です');
            return;
        }
        
        console.log('');
        console.log('👤 ========================================');
        console.log('👤 ユーザーを会話に追加');
        console.log('👤 ========================================');
        
        this.userCharacter = {
            id: 'user',
            name: this.userName,
            personality: '会話を見ているユーザー（視聴者）です。',
            llmType: null,
            voiceModel: null,
            enabled: true,
            isUser: true,
            vrmId: 'mocap_user'
        };
        
        this.isUserParticipant = true;
        
        document.getElementById('up-add-user-row').style.display = 'none';
        document.getElementById('up-user-active').style.display = 'flex';
        
        this.registerUserAsTarget();
        
        if (this.ui) {
            this.addUserToCharacterList();
        }
        
        this.refreshTargetList();
        
        window.dispatchEvent(new CustomEvent('multichar:userJoined', {
            detail: { user: this.userCharacter }
        }));
        
        console.log('✅ ユーザーが会話に参加しました');
    }
    
    removeUserFromConversation() {
        if (!this.isUserParticipant) return;
        
        console.log('👤 ユーザーが会話から退出');
        
        this.isUserParticipant = false;
        this.userCharacter = null;
        
        document.getElementById('up-add-user-row').style.display = 'flex';
        document.getElementById('up-user-active').style.display = 'none';
        
        this.unregisterUserAsTarget();
        
        if (this.ui) {
            this.removeUserFromCharacterList();
        }
        
        this.refreshTargetList();
        
        window.dispatchEvent(new CustomEvent('multichar:userLeft'));
    }
    
    registerUserAsTarget() {
        if (!window.aiDirectorCamera) {
            console.warn('⚠️ AI Director Camera が見つかりません');
            return;
        }
        
        if (!window.aiDirectorCamera.targetDefinitions['user']) {
            window.aiDirectorCamera.targetDefinitions['user'] = {
                label: 'ユーザー',
                icon: '👤',
                source: 'mocap_user',
                characterId: 'user'
            };
            console.log('📷 AIカメラにユーザーターゲット追加');
        }
    }
    
    unregisterUserAsTarget() {
        if (!window.aiDirectorCamera) return;
        
        if (window.aiDirectorCamera.targetDefinitions['user']) {
            delete window.aiDirectorCamera.targetDefinitions['user'];
            console.log('📷 AIカメラからユーザーターゲット削除');
        }
    }
    
    addUserToCharacterList() {
        if (!this.ui || !this.ui.characterList) return;
        
        const existing = this.ui.characterList.querySelector('[data-char-id="user"]');
        if (existing) existing.remove();
        
        const item = document.createElement('div');
        item.className = 'mc-char-item user-char';
        item.dataset.charId = 'user';
        
        item.innerHTML = `
            <input type="checkbox" class="mc-char-toggle" checked disabled>
            <div class="mc-char-avatar">${this.userIconEmoji}</div>
            <div class="mc-char-info">
                <div class="mc-char-name">${this.userName}</div>
                <div class="mc-char-personality">音声入力で参加中</div>
            </div>
            <div class="mc-char-badges">
                <span class="mc-badge" style="background: #f59e0b; color: white;">あなた</span>
            </div>
        `;
        
        this.ui.characterList.insertBefore(item, this.ui.characterList.firstChild);
        console.log('🎭 キャラ一覧にユーザーを追加');
    }
    
    removeUserFromCharacterList() {
        if (!this.ui || !this.ui.characterList) return;
        
        const userItem = this.ui.characterList.querySelector('[data-char-id="user"]');
        if (userItem) {
            userItem.remove();
            console.log('🎭 キャラ一覧からユーザーを削除');
        }
    }
    
    refreshTargetList() {
        if (!this.director) return;
        
        const currentValue = this.targetSelect.value;
        this.targetSelect.innerHTML = '<option value="">自動（次の順番）</option>';
        
        const characters = this.director.getAllCharacters();
        characters.forEach(char => {
            if (char.id === 'user') return;
            
            const option = document.createElement('option');
            option.value = char.id;
            option.textContent = `${char.name} に向けて`;
            this.targetSelect.appendChild(option);
        });
        
        if (currentValue) {
            this.targetSelect.value = currentValue;
        }
        
        console.log(`🔄 キャラ一覧更新: ${characters.length}人`);
    }
    
    async sendMessage() {
        const text = this.textInput.value.trim();
        if (!text) return;
        
        this.textInput.value = '';
        
        let targetId = this.targetCharacterId;
        if (!targetId) {
            targetId = this.detectTargetFromText(text);
        }
        
        if (this.interruptMode === 'immediate') {
            await this.executeImmediateInterrupt(text, targetId);
        } else {
            if (this.isReserved) {
                await this.processUserMessageFromReservation(text, targetId);
            } else {
                alert('✋ 予約モードでは「発言予約」ボタンを押してから発言してください');
            }
        }
    }
    
    async processUserMessageFromReservation(text, targetId) {
        console.log('');
        console.log('👤 ========================================');
        console.log(`👤 発言予約からの送信: "${text}"`);
        console.log('👤 ========================================');
        
        this.isReserved = false;
        document.getElementById('up-reserve-row').style.display = 'flex';
        document.getElementById('up-reserved-status').style.display = 'none';
        
        if (!this.director) {
            const director = window.multiCharManager?.director;
            if (director) {
                this.director = director;
                window.pipelinedDirector = director;
                this.refreshTargetList();
            }
        }
        
        if (!this.director) {
            this.addUserLogEntry(text);
            return;
        }
        
        this.director.conversationHistory.push({
            speakerId: 'user',
            speakerName: this.userName,
            text: text,
            emotion: null,
            timestamp: Date.now(),
            isUser: true
        });
        
        if (this.director.conversationHistory.length > this.director.maxHistoryLength) {
            this.director.conversationHistory = this.director.conversationHistory.slice(-this.director.maxHistoryLength);
        }
        
        this.addUserLogEntry(text);
        
        let responderId = targetId;
        if (!responderId) {
            const lastNonUserSpeaker = this.director.conversationHistory
                .slice()
                .reverse()
                .find(h => h.speakerId !== 'user');
            
            if (lastNonUserSpeaker) {
                responderId = this.director.getNextSpeaker(lastNonUserSpeaker.speakerId);
            } else {
                responderId = this.director.turnOrder[0];
            }
        }
        
        const responder = this.director.getCharacter(responderId);
        console.log(`   → 回答者: ${responder ? responder.name : responderId}`);
        
        if (this.director.isPaused) {
            if (responder) {
                this.focusCameraOnCharacter(responderId);
                await this.generateUserResponse(responderId, text);
            } else {
                this.director.resume();
                console.log('▶️ 会話を再開しました');
            }
        }
        
        window.dispatchEvent(new CustomEvent('multichar:userSpeechComplete', {
            detail: { text, responderId }
        }));
    }
    
    focusCameraOnUser() {
        if (!window.aiDirectorCamera) return;
        
        if (window.vmcMocap && window.vmcMocap.avatarVRM) {
            const shotOptions = ['MCU', 'CU', 'MS', 'ECU'];
            const randomShot = shotOptions[Math.floor(Math.random() * shotOptions.length)];
            
            if (window.aiDirectorCamera.setTarget) {
                window.aiDirectorCamera.setTarget('user');
            }
            
            if (window.aiDirectorCamera.setShot) {
                window.aiDirectorCamera.setShot(randomShot, 'FRONT', 'EYE_LEVEL');
            }
            
            console.log(`📷 カメラをユーザーに向ける: ${randomShot}`);
        }
    }
    
    detectTargetFromText(text) {
        if (!this.director) return null;
        
        const characters = this.director.getAllCharacters();
        
        for (const char of characters) {
            if (char.id === 'user') continue;
            
            if (text.includes(char.name)) {
                console.log(`   → 名前検出: ${char.name}`);
                return char.id;
            }
            
            const nameVariations = [
                char.name + 'さん',
                char.name + 'ちゃん',
                char.name + 'くん',
                char.name + '君',
                char.name + '様',
            ];
            
            for (const variation of nameVariations) {
                if (text.includes(variation)) {
                    console.log(`   → 名前検出（変形）: ${variation}`);
                    return char.id;
                }
            }
        }
        
        return null;
    }
    
    focusCameraOnCharacter(characterId) {
        if (!window.aiDirectorCamera) return;
        
        if (window.aiDirectorCamera.setTarget) {
            window.aiDirectorCamera.setTarget(characterId);
        }
        
        const shotOptions = ['MCU', 'CU', 'MS'];
        const randomShot = shotOptions[Math.floor(Math.random() * shotOptions.length)];
        
        if (window.aiDirectorCamera.setShot) {
            window.aiDirectorCamera.setShot(randomShot, 'FRONT', 'EYE_LEVEL');
        }
        
        console.log(`📷 カメラを${characterId}に向ける: ${randomShot}`);
    }
    
    async generateUserResponse(responderId, userText) {
        const responder = this.director.getCharacter(responderId);
        if (!responder) return;
        
        console.log(`🤖 ${responder.name} がユーザーに応答を生成中...`);
        
        const prompt = this.buildUserResponsePrompt(responderId, userText);
        const result = await responder.generateResponse(prompt);
        
        if (!result || !result.text) {
            console.warn(`⚠️ ${responder.name}: 応答なし`);
            this.resumeConversation(responderId, userText);
            return;
        }
        
        const emotion = await responder.analyzeEmotion(result.text);
        console.log(`📝 ${responder.name} 応答: "${result.text}" (感情: ${emotion})`);
        
        this.director.conversationHistory.push({
            speakerId: responderId,
            speakerName: responder.name,
            text: result.text,
            emotion: emotion,
            timestamp: Date.now()
        });
        
        let audioData = null;
        if (window.SBV2Panel && window.SBV2Panel.isEnabled()) {
            audioData = await this.director.synthesizeAudio(responder, result.text, emotion);
        }
        
        if (emotion && responder.vrm && responder.playEmotionMotion) {
            try {
                await responder.playEmotionMotion(emotion);
            } catch (e) {
                console.warn(`⚠️ モーション再生エラー:`, e);
            }
        }
        
        this.director.updateSpeakerHighlight(responderId, 'speaking');
        
        if (this.ui && this.ui.addLogEntry) {
            this.ui.addLogEntry(responder.name, result.text, emotion, null);
        }
        
        this.director.isCurrentlyPlaying = true;
        this.director.currentPlayingSpeakerId = responderId;
        
        if (audioData) {
            await this.playAudioWithTracking(responder, audioData);
        } else {
            await this.director.playBrowserTTS(responder, result.text);
        }
        
        this.director.isCurrentlyPlaying = false;
        this.director.currentPlayingSpeakerId = null;
        
        this.director.updateSpeakerHighlight(responderId, 'none');
        
        if (this.director.resetExpression) {
            this.director.resetExpression(responder, 500);
        }
        
        // ★ v3.3: 応答完了後、少し待ってから会話再開
        await this.wait(300);
        
        // 会話を再開（通常のresumeConversationを使用）
        this.resumeConversation(responderId, result.text);
    }
    
    async playAudioWithTracking(speaker, audioData) {
        return new Promise((resolve, reject) => {
            try {
                const blob = new Blob([audioData], { type: 'audio/wav' });
                const url = URL.createObjectURL(blob);
                const audio = new Audio(url);
                
                this.currentAudio = audio;
                
                audio.onplay = () => {
                    console.log(`👄 ${speaker.name} リップシンク開始`);
                    if (speaker.startAudioLipSync) {
                        speaker.isSpeaking = true;
                        speaker.startAudioLipSync(audio);
                    }
                };
                
                audio.onended = () => {
                    URL.revokeObjectURL(url);
                    if (speaker.stopLipSync) {
                        speaker.stopLipSync();
                    }
                    speaker.isSpeaking = false;
                    this.currentAudio = null;
                    console.log(`👄 ${speaker.name} リップシンク終了`);
                    resolve();
                };
                
                audio.onerror = (e) => {
                    URL.revokeObjectURL(url);
                    if (speaker.stopLipSync) {
                        speaker.stopLipSync();
                    }
                    speaker.isSpeaking = false;
                    this.currentAudio = null;
                    reject(e);
                };
                
                audio.play().catch(reject);
                
            } catch (e) {
                reject(e);
            }
        });
    }
    
    buildUserResponsePrompt(responderId, userText) {
        const responder = this.director.getCharacter(responderId);
        if (!responder) return '';
        
        const others = this.director.turnOrder
            .filter(id => id !== responderId && id !== 'user')
            .map(id => {
                const char = this.director.getCharacter(id);
                return char ? `・${char.name}: ${char.personality}` : '';
            })
            .filter(s => s)
            .join('\n');
        
        const recentHistory = this.director.conversationHistory
            .slice(-8)
            .map(h => {
                const prefix = h.isUser ? `[${this.userName}]` : h.speakerName;
                return `${prefix}: ${h.text}`;
            })
            .join('\n');
        
        return `あなたは「${responder.name}」です。

【あなたの性格】
${responder.personality || '明るく元気な性格です。'}

【会話仲間】
${others || '(なし)'}

【これまでの会話】
${recentHistory}

【${this.userName}（視聴者/ユーザー）の発言】
「${userText}」

${this.userName}さん（会話を見ている視聴者）が話しかけてきました。
あなたのキャラクターらしく、${this.userName}さんの発言に反応してください。

- 直接話しかけられたら丁寧に応答してください
- 他のキャラへの発言でも、自然なら反応してOKです
- 2〜3文程度で簡潔に
- 無理に全ての発言に反応する必要はありません`;
    }
    
    resumeConversation(lastSpeakerId, lastText) {
        if (!this.director || !this.director.isRunning) return;
        
        console.log('▶️ 会話を再開...');
        
        // ★ v3.4: 割り込みフラグを解除
        this.director.isUserInterrupting = false;
        console.log('✅ isUserInterrupting: false（割り込み完了）');
        
        const nextSpeakerId = this.director.getNextSpeaker(lastSpeakerId);
        
        this.director.fillPipeline(nextSpeakerId, lastText);
        
        if (!this.director.isCurrentlyPlaying && this.director.pipeline.length > 0) {
            this.director.pipelineLoop();
        }
    }
    
    /**
     * ★ v3.2: 安全な会話再開（二重起動防止付き）
     * ★ v3.4: 割り込みフラグ解除追加
     */
    resumeConversationSafely(lastSpeakerId, lastText) {
        if (!this.director || !this.director.isRunning) {
            console.log('⚠️ 会話が実行中ではないため、再開をスキップ');
            return;
        }
        
        // 二重起動チェック
        if (this.director.isCurrentlyPlaying) {
            console.log('⚠️ 既に再生中のため、再開をスキップ');
            return;
        }
        
        if (this.director.pipeline.length > 0) {
            console.log('⚠️ パイプラインに既にエントリがあるため、再開をスキップ');
            return;
        }
        
        console.log('');
        console.log('▶️ ========================================');
        console.log('▶️ 安全な会話再開（1人のみ）');
        console.log('▶️ ========================================');
        
        // ★ v3.4: 割り込みフラグを解除
        this.director.isUserInterrupting = false;
        console.log('✅ isUserInterrupting: false（割り込み完了）');
        
        const nextSpeakerId = this.director.getNextSpeaker(lastSpeakerId);
        const nextChar = this.director.getCharacter(nextSpeakerId);
        console.log(`▶️ 次の話者: ${nextChar ? nextChar.name : nextSpeakerId}`);
        
        // パイプラインに1件だけ追加してループ開始
        this.director.fillPipeline(nextSpeakerId, lastText);
        
        // ループが動いていなければ開始
        if (this.director.pipeline.length > 0) {
            this.director.pipelineLoop();
        }
    }
    
    addUserLogEntry(text) {
        if (!this.ui || !this.ui.conversationLog) return;
        
        const emptyMsg = this.ui.conversationLog.querySelector('.mc-log-empty');
        if (emptyMsg) emptyMsg.remove();
        
        const entry = document.createElement('div');
        entry.className = 'mc-log-entry user-entry';
        entry.innerHTML = `
            <div class="mc-log-header">
                <span class="mc-log-speaker">${this.userIconEmoji} ${this.userName}:</span>
                <span class="mc-log-badge" style="background: #f59e0b;">⚡割り込み</span>
            </div>
            <div class="mc-log-text">${text}</div>
        `;
        
        this.ui.conversationLog.appendChild(entry);
        this.ui.conversationLog.scrollTop = this.ui.conversationLog.scrollHeight;
    }
    
    toggleVoiceInput() {
        if (this.isRecording) {
            this.stopVoiceInput();
        } else {
            this.startVoiceInput();
        }
    }
    
    startVoiceInput() {
        if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
            alert('⚠️ このブラウザは音声認識に対応していません');
            return;
        }
        
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        this.recognition = new SpeechRecognition();
        
        this.recognition.lang = 'ja-JP';
        this.recognition.continuous = true;
        this.recognition.interimResults = true;
        
        this.interimTranscript = '';
        this.finalTranscript = '';
        
        this.recognition.onstart = () => {
            this.isRecording = true;
            this.voiceBtn.classList.add('recording');
            document.getElementById('up-voice-status').style.display = 'flex';
            document.getElementById('up-voice-preview').style.display = 'block';
            document.getElementById('up-voice-interim').textContent = '話してください...';
            console.log('🎤 音声認識開始');
            
            // 即時割り込みモードの場合、会話を一時停止
            if (this.interruptMode === 'immediate' && this.director && this.director.isRunning) {
                // 録音開始時は停止しない（送信時に割り込む）
            }
        };
        
        this.recognition.onresult = (event) => {
            this.interimTranscript = '';
            this.finalTranscript = '';
            
            for (let i = event.resultIndex; i < event.results.length; i++) {
                const transcript = event.results[i][0].transcript;
                if (event.results[i].isFinal) {
                    this.finalTranscript += transcript;
                } else {
                    this.interimTranscript += transcript;
                }
            }
            
            // プレビュー更新
            const interimEl = document.getElementById('up-voice-interim');
            if (interimEl) {
                if (this.finalTranscript) {
                    interimEl.textContent = this.finalTranscript;
                    interimEl.style.color = '#4ade80';
                } else if (this.interimTranscript) {
                    interimEl.textContent = this.interimTranscript;
                    interimEl.style.color = '#fbbf24';
                }
            }
            
            // テキスト入力欄にも反映
            this.textInput.value = this.finalTranscript || this.interimTranscript;
        };
        
        this.recognition.onerror = (event) => {
            console.error('🎤 音声認識エラー:', event.error);
            this.stopVoiceInput();
            
            if (event.error === 'no-speech') {
                document.getElementById('up-voice-interim').textContent = '音声が検出されませんでした';
            } else if (event.error === 'audio-capture') {
                alert('⚠️ マイクにアクセスできません');
            } else if (event.error === 'not-allowed') {
                alert('⚠️ マイクの使用が許可されていません');
            }
        };
        
        this.recognition.onend = () => {
            // 継続モードでは自動的に再開
            if (this.isRecording) {
                try {
                    this.recognition.start();
                } catch (e) {
                    console.warn('🎤 音声認識再開失敗:', e);
                    this.stopVoiceInput();
                }
            }
        };
        
        // 音声認識開始
        try {
            this.recognition.start();
        } catch (e) {
            console.error('🎤 音声認識開始失敗:', e);
            alert('⚠️ 音声認識を開始できませんでした');
        }
    }
    
    /**
     * 音声入力を停止
     */
    stopVoiceInput() {
        this.isRecording = false;
        
        if (this.recognition) {
            try {
                this.recognition.stop();
            } catch (e) {}
            this.recognition = null;
        }
        
        this.voiceBtn.classList.remove('recording');
        document.getElementById('up-voice-status').style.display = 'none';
        
        // 最終結果があればテキスト入力欄に残す
        if (this.finalTranscript) {
            this.textInput.value = this.finalTranscript;
            console.log(`🎤 音声認識完了: "${this.finalTranscript}"`);
        }
        
        // プレビューを少し後に非表示
        setTimeout(() => {
            document.getElementById('up-voice-preview').style.display = 'none';
        }, 1000);
    }
    
    /**
     * 待機ヘルパー
     */
    wait(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    
    /**
     * 外部からdirectorを設定
     */
    setDirector(director) {
        this.director = director;
        this.refreshTargetList();
        console.log('👤 UserParticipation: director設定完了');
    }
    
    /**
     * 外部からUIを設定
     */
    setUI(ui) {
        this.ui = ui;
        console.log('👤 UserParticipation: UI設定完了');
    }
}

// グローバルに公開
window.UserParticipation = UserParticipation;

// 自動初期化（既存のdirectorがあれば）
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        if (window.multiCharManager && window.multiCharManager.director) {
            const director = window.multiCharManager.director;
            const ui = window.multiCharManager.ui;
            
            if (!window.userParticipation) {
                window.userParticipation = new UserParticipation(director, ui);
                
                // 会話ログの親要素を探す
                const logParent = document.querySelector('.mc-conversation-log')?.parentElement;
                if (logParent) {
                    window.userParticipation.createUI(logParent);
                }
            }
        }
    }, 2000);
});

console.log('👤 UserParticipation v3.4 モジュール読み込み完了（割り込み後の複数人同時発話修正）');

})();