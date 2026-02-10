// ========================================
// 🖼️ 自動保存システム v2.2
// サーバー経由で I:\filesystem\ai_creative_vrm\save に保存
// + 画面録画機能追加
// ========================================

console.log('🖼️ 自動保存システム v2.2 を読み込み中...');

class AutoSaver {
    constructor() {
        // セッション管理
        this.sessionName = null;
        this.sessionStartTime = null;
        
        // サーバーAPI
        this.serverUrl = 'http://localhost:8081';
        
        // サブフォルダ名
        this.subFolders = {
            imagination: '01_imagination_wipe',
            background360: '02_360_backgrounds',
            tripo3d: '03_tripo3d_models',
            conversation: '04_conversation_logs',
            pipeline: '05_pipeline_logs',
            topic: '06_topics',
            kanpe: '07_kanpe',
            recording: '08_screen_recording'
        };
        
        // 自動保存ON/OFF
        this.autoSaveEnabled = {
            imagination: true,
            background360: true,
            tripo3d: true,
            conversation: true,
            pipeline: true,
            topic: true,
            kanpe: true,
            recording: true  // 画面録画
        };
        
        // 保存カウンター
        this.saveCounter = {
            imagination: 0,
            background360: 0,
            tripo3d: 0,
            conversation: 0,
            pipeline: 0,
            topic: 0,
            kanpe: 0,
            recording: 0
        };
        
        // 最後に保存した内容（重複防止）
        this.lastSaved = {
            conversation: '',
            pipeline: '',
            topic: '',
            kanpe: ''
        };
        
        // 自動保存インターバル
        this.autoSaveInterval = null;
        this.autoSaveIntervalMs = 30000; // 30秒ごと
        
        // 保存履歴
        this.saveHistory = [];
        this.maxHistory = 50;
        
        // UI
        this.panel = null;
        this.isSessionActive = false;
        
        // 画面録画
        this.mediaRecorder = null;
        this.recordedChunks = [];
        this.isRecording = false;
        this.recordingStartTime = null;
        this.recordingCanvas = null;
        this.recordingStream = null;
        
        // 録画設定
        this.recordingSettings = {
            fps: 30,                    // フレームレート（カメラ開始時は30fps）
            videoBitsPerSecond: 2000000, // ビットレート 2Mbps
            quality: 'medium',          // low, medium, high
            withAudio: true             // 音声録音
        };
        
        // AI Director Camera連携
        this.waitingForDirectorStart = false;
        
        this.init();
    }
    
    init() {
        this.loadSettings();
        this.createPanel();
        this.createToggleButton();
        this.hookIntoSystems();
        
        console.log('✅ 自動保存システム v2.2 初期化完了');
        console.log('📁 保存先: I:\\filesystem\\ai_creative_vrm\\save');
    }
    
    // ========================================
    // セッション管理
    // ========================================
    async startSession(customName = '') {
        this.sessionStartTime = new Date();
        
        // フォルダ名を決定
        if (customName && customName.trim()) {
            const timestamp = this.getTimestamp();
            this.sessionName = `${customName.trim()}_${timestamp}`;
        } else {
            this.sessionName = this.getSessionTimestamp();
        }
        
        // サーバーにフォルダ作成リクエスト
        try {
            const response = await fetch(`${this.serverUrl}/api/create-session`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sessionName: this.sessionName })
            });
            
            const result = await response.json();
            
            if (!result.success) {
                throw new Error(result.error || 'フォルダ作成に失敗');
            }
            
            console.log(`📁 セッション作成成功: ${result.sessionPath}`);
            
        } catch (error) {
            console.error('❌ セッション作成エラー:', error);
            this.showNotification('⚠️ セッション作成に失敗しました', 'error');
            return;
        }
        
        // カウンターリセット
        this.saveCounter = {
            imagination: 0, background360: 0, tripo3d: 0,
            conversation: 0, pipeline: 0, topic: 0, kanpe: 0, recording: 0
        };
        
        this.lastSaved = { conversation: '', pipeline: '', topic: '', kanpe: '' };
        this.isSessionActive = true;
        
        // 自動保存インターバル開始
        this.startAutoSaveInterval();
        
        // 画面録画はAI Director Camera開始時に自動開始するので、ここでは開始しない
        // if (this.autoSaveEnabled.recording) {
        //     await this.startRecording();
        // }
        
        // UI更新
        this.updateSessionDisplay();
        
        console.log(`📁 セッション開始: ${this.sessionName}`);
        this.showNotification(`📁 セッション開始: ${this.sessionName}`);
        
        // 初回保存
        setTimeout(() => this.saveAllTextData(), 1000);
    }
    
    async endSession() {
        if (!this.isSessionActive) return;
        
        // 画面録画停止 & 保存
        if (this.isRecording) {
            await this.stopRecording();
        }
        
        this.saveAllTextData();
        this.stopAutoSaveInterval();
        this.isSessionActive = false;
        
        console.log(`📁 セッション終了: ${this.sessionName}`);
        this.showNotification(`📁 セッション終了`);
        
        this.updateSessionDisplay();
    }
    
    getSessionTimestamp() {
        const now = new Date();
        const y = now.getFullYear();
        const m = String(now.getMonth() + 1).padStart(2, '0');
        const d = String(now.getDate()).padStart(2, '0');
        const h = String(now.getHours()).padStart(2, '0');
        const min = String(now.getMinutes()).padStart(2, '0');
        const s = String(now.getSeconds()).padStart(2, '0');
        return `${y}${m}${d}_${h}${min}${s}`;
    }
    
    getTimestamp() {
        const now = new Date();
        return now.toISOString().replace(/[-:]/g, '').replace('T', '_').slice(0, 15);
    }
    
    // ========================================
    // 画面録画機能（音声付き）
    // ========================================
    async startRecording() {
        if (this.isRecording) return;
        
        try {
            // Three.jsキャンバスを取得
            const canvas = document.querySelector('canvas');
            if (!canvas) {
                console.warn('⚠️ キャンバスが見つかりません');
                return;
            }
            
            // ビットレート設定
            let videoBitsPerSecond;
            switch (this.recordingSettings.quality) {
                case 'low':
                    videoBitsPerSecond = 1000000;  // 1Mbps
                    break;
                case 'high':
                    videoBitsPerSecond = 4000000;  // 4Mbps
                    break;
                default:
                    videoBitsPerSecond = 2000000;  // 2Mbps
            }
            
            // キャンバスからストリームを取得 (30fps)
            const videoStream = canvas.captureStream(30);
            
            // 音声を取得（getDisplayMediaで画面共有から音声のみ取得）
            let audioTracks = [];
            if (this.recordingSettings.withAudio) {
                try {
                    // 画面共有ダイアログを表示してシステム音声を取得
                    // 注意: ユーザーが「システム音声を共有」にチェックを入れる必要がある
                    const displayStream = await navigator.mediaDevices.getDisplayMedia({
                        video: true,  // video:trueが必要（falseだと音声が取得できない）
                        audio: {
                            echoCancellation: false,
                            noiseSuppression: false,
                            autoGainControl: false,
                            sampleRate: 48000,
                            channelCount: 2
                        }
                    });
                    
                    // 音声トラックを取得
                    audioTracks = displayStream.getAudioTracks();
                    
                    // 画面共有のビデオトラックは使わないので停止
                    displayStream.getVideoTracks().forEach(track => track.stop());
                    
                    if (audioTracks.length > 0) {
                        console.log('🎤 システム音声取得成功:', audioTracks.length, 'トラック');
                    } else {
                        console.warn('⚠️ 音声トラックがありません。画面共有ダイアログで「システム音声を共有」にチェックを入れてください');
                    }
                } catch (audioError) {
                    console.warn('⚠️ システム音声取得失敗、音声なしで録画:', audioError.message);
                }
            }
            
            // ストリームを結合（キャンバスの映像 + システム音声）
            const tracks = [...videoStream.getVideoTracks(), ...audioTracks];
            this.recordingStream = new MediaStream(tracks);
            
            // MediaRecorder設定
            const mimeType = this.getSupportedMimeType();
            const options = {
                mimeType: mimeType,
                videoBitsPerSecond: videoBitsPerSecond,
                audioBitsPerSecond: 128000 // 128kbps
            };
            
            this.mediaRecorder = new MediaRecorder(this.recordingStream, options);
            this.recordedChunks = [];
            
            this.mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    this.recordedChunks.push(event.data);
                }
            };
            
            this.mediaRecorder.onstop = async () => {
                await this.saveRecording();
            };
            
            // 録画開始
            this.mediaRecorder.start(1000); // 1秒ごとにデータを取得
            this.isRecording = true;
            this.recordingStartTime = new Date();
            
            const hasAudio = audioStream ? '🎤音声あり' : '🔇音声なし';
            console.log(`🎬 画面録画開始 (${mimeType}, 30fps, ${videoBitsPerSecond / 1000}kbps, ${hasAudio})`);
            this.showNotification(`🎬 録画開始 ${hasAudio}`);
            this.updateRecordingIndicator();
            this.updateSessionDisplay();
            
        } catch (error) {
            console.error('❌ 録画開始エラー:', error);
            this.showNotification('⚠️ 録画を開始できませんでした', 'error');
        }
    }
    
    async stopRecording() {
        if (!this.isRecording || !this.mediaRecorder) return;
        
        return new Promise((resolve) => {
            this.mediaRecorder.onstop = async () => {
                await this.saveRecording();
                resolve();
            };
            
            this.mediaRecorder.stop();
            this.isRecording = false;
            
            // ストリームを停止
            if (this.recordingStream) {
                this.recordingStream.getTracks().forEach(track => track.stop());
            }
            
            console.log('🎬 画面録画停止');
            this.updateRecordingIndicator();
        });
    }
    
    async saveRecording() {
        if (this.recordedChunks.length === 0) return;
        
        try {
            const mimeType = this.getSupportedMimeType();
            const blob = new Blob(this.recordedChunks, { type: mimeType });
            
            // ファイル名生成
            const duration = this.recordingStartTime 
                ? Math.round((new Date() - this.recordingStartTime) / 1000)
                : 0;
            const ext = mimeType.includes('webm') ? 'webm' : 'mp4';
            this.saveCounter.recording++;
            const filename = `${String(this.saveCounter.recording).padStart(4, '0')}_session_${duration}sec.${ext}`;
            
            // Base64に変換
            const base64 = await this.blobToBase64(blob);
            
            // サーバーに保存（WebM→MP4変換もリクエスト）
            const response = await fetch(`${this.serverUrl}/api/save-file`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    sessionName: this.sessionName,
                    subfolder: this.subFolders.recording,
                    filename: filename,
                    data: base64,
                    isBase64: true,
                    convertToMp4: true  // FFmpegでMP4に変換
                })
            });
            
            const result = await response.json();
            
            if (result.success) {
                const sizeMB = (blob.size / 1024 / 1024).toFixed(2);
                console.log(`💾 録画保存: ${result.path} (${sizeMB}MB, ${duration}秒)`);
                this.showNotification(`🎬 録画保存完了 (${sizeMB}MB)`);
                this.addToHistory({ type: 'recording', filename, label: '画面録画' });
                this.updateHistoryDisplay();
            } else {
                console.error('❌ 録画保存失敗:', result.error);
            }
            
        } catch (error) {
            console.error('❌ 録画保存エラー:', error);
        }
        
        this.recordedChunks = [];
    }
    
    getSupportedMimeType() {
        // MP4 > WebM の優先順位（Windows互換性重視）
        const mimeTypes = [
            'video/mp4;codecs=h264',
            'video/mp4;codecs=avc1',
            'video/mp4',
            'video/webm;codecs=vp9',
            'video/webm;codecs=vp8',
            'video/webm'
        ];
        
        for (const mimeType of mimeTypes) {
            if (MediaRecorder.isTypeSupported(mimeType)) {
                console.log(`🎬 録画形式: ${mimeType}`);
                return mimeType;
            }
        }
        
        return 'video/webm';
    }
    
    updateRecordingIndicator() {
        let indicator = document.getElementById('asp-recording-indicator');
        
        if (this.isRecording) {
            if (!indicator) {
                indicator = document.createElement('div');
                indicator.id = 'asp-recording-indicator';
                indicator.innerHTML = '🔴 REC';
                indicator.style.cssText = `
                    position: fixed;
                    top: 10px;
                    right: 10px;
                    background: rgba(239, 68, 68, 0.9);
                    color: white;
                    padding: 6px 12px;
                    border-radius: 20px;
                    font-size: 12px;
                    font-weight: bold;
                    z-index: 99999;
                    animation: recBlink 1s infinite;
                `;
                document.body.appendChild(indicator);
                
                // 点滅アニメーション
                if (!document.getElementById('asp-rec-blink-style')) {
                    const style = document.createElement('style');
                    style.id = 'asp-rec-blink-style';
                    style.textContent = `
                        @keyframes recBlink {
                            0%, 100% { opacity: 1; }
                            50% { opacity: 0.5; }
                        }
                    `;
                    document.head.appendChild(style);
                }
            }
        } else {
            if (indicator) {
                indicator.remove();
            }
        }
    }
    
    // ========================================
    // 自動保存インターバル
    // ========================================
    startAutoSaveInterval() {
        this.stopAutoSaveInterval();
        this.autoSaveInterval = setInterval(() => {
            if (this.isSessionActive) {
                this.saveAllTextData();
            }
        }, this.autoSaveIntervalMs);
        console.log(`⏰ 自動保存インターバル開始 (${this.autoSaveIntervalMs / 1000}秒)`);
    }
    
    stopAutoSaveInterval() {
        if (this.autoSaveInterval) {
            clearInterval(this.autoSaveInterval);
            this.autoSaveInterval = null;
        }
    }
    
    // ========================================
    // テキストデータの一括保存
    // ========================================
    saveAllTextData() {
        if (!this.isSessionActive) return;
        
        if (this.autoSaveEnabled.conversation) this.saveConversationLog();
        if (this.autoSaveEnabled.pipeline) this.savePipelineLog();
        if (this.autoSaveEnabled.topic) this.saveTopic();
        if (this.autoSaveEnabled.kanpe) this.saveKanpe();
    }
    
    saveConversationLog() {
        const logContainer = document.querySelector('#mc-conversation-log');
        if (!logContainer) return;
        
        let logText = '';
        logContainer.querySelectorAll('.mc-log-entry').forEach((entry) => {
            const speaker = entry.querySelector('.mc-log-speaker, .mc-log-char');
            const text = entry.querySelector('.mc-log-text');
            if (speaker && text) {
                logText += `${speaker.textContent} ${text.textContent}\n`;
            }
        });
        
        if (logText && logText !== this.lastSaved.conversation) {
            this.lastSaved.conversation = logText;
            this.saveTextFile(logText, 'conversation', '会話ログ');
        }
    }
    
    savePipelineLog() {
        const director = window.multiCharManager?.director;
        if (!director || !director.pipeline) return;
        
        let pipelineText = '=== パイプライン状態 ===\n';
        pipelineText += `時刻: ${new Date().toLocaleString()}\n\n`;
        
        director.pipeline.forEach((entry, index) => {
            pipelineText += `[${index + 1}] ${entry.speakerName || '???'}\n`;
            pipelineText += `  状態: ${entry.status}\n`;
            pipelineText += `  テキスト: ${entry.responseText || '(なし)'}\n`;
            pipelineText += `  作成: ${new Date(entry.createdAt).toLocaleTimeString()}\n\n`;
        });
        
        // 直近の会話テキストエリア
        const recentEl = document.querySelector('#pipeline-recent-display, [id*="recent-conversation"]');
        if (recentEl) {
            const recentText = recentEl.value || recentEl.textContent || '';
            if (recentText) {
                pipelineText += '\n=== 直近の会話 ===\n' + recentText;
            }
        }
        
        if (pipelineText !== this.lastSaved.pipeline) {
            this.lastSaved.pipeline = pipelineText;
            this.saveTextFile(pipelineText, 'pipeline', 'パイプライン');
        }
    }
    
    saveTopic() {
        const topicInput = document.querySelector('#mc-topic-input, [id*="topic"]');
        if (!topicInput) return;
        
        const topicText = topicInput.value || '';
        
        if (topicText && topicText !== this.lastSaved.topic) {
            this.lastSaved.topic = topicText;
            this.saveTextFile(`トピック: ${topicText}\n\n保存時刻: ${new Date().toLocaleString()}`, 'topic', 'トピック');
        }
    }
    
    saveKanpe() {
        const kanpeTextarea = document.querySelector('#mc-system-note, [id*="kanpe"], [id*="system-note"]');
        if (!kanpeTextarea) return;
        
        const kanpeText = kanpeTextarea.value || '';
        
        if (kanpeText && kanpeText !== this.lastSaved.kanpe) {
            this.lastSaved.kanpe = kanpeText;
            this.saveTextFile(`=== カンペ ===\n${kanpeText}\n\n保存時刻: ${new Date().toLocaleString()}`, 'kanpe', 'カンペ');
        }
    }
    
    // ========================================
    // ファイル保存処理（サーバー経由）
    // ========================================
    async saveTextFile(content, type, label) {
        if (!this.isSessionActive || !this.sessionName) return;
        
        this.saveCounter[type]++;
        const filename = `${String(this.saveCounter[type]).padStart(4, '0')}_${this.getTimestamp()}.txt`;
        
        try {
            const response = await fetch(`${this.serverUrl}/api/save-file`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    sessionName: this.sessionName,
                    subfolder: this.subFolders[type],
                    filename: filename,
                    data: content,
                    isBase64: false
                })
            });
            
            const result = await response.json();
            
            if (result.success) {
                this.addToHistory({ type, filename, label });
                console.log(`💾 ${label}保存: ${result.path}`);
            } else {
                console.error(`❌ ${label}保存失敗:`, result.error);
            }
        } catch (error) {
            console.error(`❌ ${label}保存エラー:`, error);
        }
    }
    
    async saveImage(imageUrl, type, description = '') {
        if (!this.isSessionActive || !this.sessionName) {
            console.warn('⚠️ セッションが開始されていません');
            return;
        }
        
        if (!imageUrl) return;
        
        this.saveCounter[type]++;
        const safeName = this.sanitizeFilename(description);
        const filename = `${String(this.saveCounter[type]).padStart(4, '0')}_${safeName}.png`;
        
        try {
            const response = await fetch(`${this.serverUrl}/api/save-file`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    sessionName: this.sessionName,
                    subfolder: this.subFolders[type],
                    filename: filename,
                    data: imageUrl,
                    isBase64: true
                })
            });
            
            const result = await response.json();
            
            if (result.success) {
                this.addToHistory({ type, filename, label: this.getTypeLabel(type) });
                console.log(`💾 ${this.getTypeLabel(type)}保存: ${result.path}`);
                this.showNotification(`💾 ${this.getTypeLabel(type)}を保存`);
                this.updateHistoryDisplay();
            } else {
                console.error(`❌ 画像保存失敗:`, result.error);
            }
        } catch (error) {
            console.error('❌ 画像保存エラー:', error);
        }
    }
    
    async saveModel(glbUrl, prompt) {
        if (!this.isSessionActive || !this.sessionName) return;
        
        this.saveCounter.tripo3d++;
        const safeName = this.sanitizeFilename(prompt);
        const filename = `${String(this.saveCounter.tripo3d).padStart(4, '0')}_${safeName}.glb`;
        
        try {
            const response = await fetch(glbUrl);
            const blob = await response.blob();
            const base64 = await this.blobToBase64(blob);
            
            const saveResponse = await fetch(`${this.serverUrl}/api/save-file`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    sessionName: this.sessionName,
                    subfolder: this.subFolders.tripo3d,
                    filename: filename,
                    data: base64,
                    isBase64: true
                })
            });
            
            const result = await saveResponse.json();
            
            if (result.success) {
                this.addToHistory({ type: 'tripo3d', filename, label: '3Dモデル' });
                console.log(`💾 3Dモデル保存: ${result.path}`);
                this.showNotification('💾 3Dモデルを保存');
            }
        } catch (error) {
            console.error('❌ 3Dモデル保存エラー:', error);
        }
    }
    
    blobToBase64(blob) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    }
    
    // ========================================
    // システムへのフック
    // ========================================
    hookIntoSystems() {
        this.hookImaginationWipe();
        this.hookBackgroundGenerator();
        this.hookTripo3D();
        this.hookAIDirectorCamera();
    }
    
    hookImaginationWipe() {
        const checkInterval = setInterval(() => {
            if (window.imaginationWipe) {
                clearInterval(checkInterval);
                
                const originalDisplayImage = window.imaginationWipe.displayImage?.bind(window.imaginationWipe);
                if (originalDisplayImage) {
                    window.imaginationWipe.displayImage = (imageUrl, caption) => {
                        originalDisplayImage(imageUrl, caption);
                        if (this.autoSaveEnabled.imagination && this.isSessionActive) {
                            this.saveImage(imageUrl, 'imagination', caption);
                        }
                    };
                }
                
                const originalDisplayImageWithFade = window.imaginationWipe.displayImageWithFade?.bind(window.imaginationWipe);
                if (originalDisplayImageWithFade) {
                    window.imaginationWipe.displayImageWithFade = (imageUrl, caption) => {
                        originalDisplayImageWithFade(imageUrl, caption);
                        if (this.autoSaveEnabled.imagination && this.isSessionActive) {
                            this.saveImage(imageUrl, 'imagination', caption);
                        }
                    };
                }
                
                console.log('✅ ImaginationWipe にフック完了');
            }
        }, 500);
        setTimeout(() => clearInterval(checkInterval), 10000);
    }
    
    hookBackgroundGenerator() {
        const checkInterval = setInterval(() => {
            if (window.aiBackgroundGenerator) {
                clearInterval(checkInterval);
                
                const original = window.aiBackgroundGenerator.apply360Background?.bind(window.aiBackgroundGenerator);
                if (original) {
                    window.aiBackgroundGenerator.apply360Background = async (imageUrl) => {
                        const result = await original(imageUrl);
                        if (this.autoSaveEnabled.background360 && this.isSessionActive) {
                            const scene = window.aiBackgroundGenerator.lastDetectedScene || '360bg';
                            console.log('🌍 360度背景を自動保存:', scene);
                            this.saveImage(imageUrl, 'background360', scene);
                        }
                        return result;
                    };
                    console.log('✅ AIBackgroundGenerator.apply360Background にフック完了');
                } else {
                    console.warn('⚠️ apply360Background が見つかりません');
                }
            }
        }, 500);
        setTimeout(() => clearInterval(checkInterval), 10000);
    }
    
    hookTripo3D() {
        const originalGenerateTripo3D = window.generateTripo3D;
        if (originalGenerateTripo3D) {
            window.generateTripo3D = async (prompt) => {
                const result = await originalGenerateTripo3D(prompt);
                return result;
            };
            console.log('✅ Tripo3D にフック完了');
        }
    }
    
    hookAIDirectorCamera() {
        // AI Director Cameraの「AI演出開始」ボタンを監視
        const checkInterval = setInterval(() => {
            // aiDirectorCameraが存在するか確認
            if (window.aiDirectorCamera) {
                clearInterval(checkInterval);
                
                // 元のstartAIDirectorをフック
                const originalStart = window.aiDirectorCamera.startAIDirector?.bind(window.aiDirectorCamera);
                if (originalStart) {
                    window.aiDirectorCamera.startAIDirector = async () => {
                        console.log('🎥 AI Director Camera 開始検出');
                        
                        // セッションがアクティブで録画有効なら録画開始
                        if (window.autoSaver?.isSessionActive && window.autoSaver?.autoSaveEnabled?.recording && !window.autoSaver?.isRecording) {
                            await window.autoSaver.startRecording();
                        }
                        
                        return originalStart();
                    };
                    console.log('✅ AIDirectorCamera.startAIDirector にフック完了');
                }
                
                // 元のstopAIDirectorをフック
                const originalStop = window.aiDirectorCamera.stopAIDirector?.bind(window.aiDirectorCamera);
                if (originalStop) {
                    window.aiDirectorCamera.stopAIDirector = async () => {
                        console.log('🎥 AI Director Camera 停止検出');
                        
                        // 録画中なら停止・保存
                        if (window.autoSaver?.isRecording) {
                            await window.autoSaver.stopRecording();
                        }
                        
                        return originalStop();
                    };
                    console.log('✅ AIDirectorCamera.stopAIDirector にフック完了');
                }
            }
        }, 500);
        setTimeout(() => clearInterval(checkInterval), 15000);
    }
    
    // ========================================
    // ユーティリティ
    // ========================================
    sanitizeFilename(str) {
        if (!str) return 'file';
        return str.replace(/[\\/:*?"<>|]/g, '').replace(/\s+/g, '_').slice(0, 40);
    }
    
    getTypeLabel(type) {
        const labels = {
            imagination: '想像ワイプ', background360: '360度背景', tripo3d: '3Dモデル',
            conversation: '会話ログ', pipeline: 'パイプライン', topic: 'トピック', 
            kanpe: 'カンペ', recording: '画面録画'
        };
        return labels[type] || type;
    }
    
    addToHistory(entry) {
        this.saveHistory.unshift({ ...entry, time: new Date().toLocaleTimeString() });
        if (this.saveHistory.length > this.maxHistory) {
            this.saveHistory = this.saveHistory.slice(0, this.maxHistory);
        }
    }
    
    loadSettings() {
        try {
            const saved = localStorage.getItem('auto-saver-v2-settings');
            if (saved) {
                const settings = JSON.parse(saved);
                this.autoSaveEnabled = { ...this.autoSaveEnabled, ...settings.autoSaveEnabled };
                if (settings.recordingSettings) {
                    this.recordingSettings = { ...this.recordingSettings, ...settings.recordingSettings };
                }
            }
        } catch (e) {}
    }
    
    saveSettings() {
        try {
            localStorage.setItem('auto-saver-v2-settings', JSON.stringify({
                autoSaveEnabled: this.autoSaveEnabled,
                recordingSettings: this.recordingSettings
            }));
        } catch (e) {}
    }
    
    // ========================================
    // UI
    // ========================================
    createToggleButton() {
        const btn = document.createElement('button');
        btn.id = 'auto-saver-toggle-btn';
        btn.innerHTML = '💾';
        btn.title = '自動保存設定';
        btn.style.cssText = `
            position: fixed; left: 10px; bottom: 280px;
            width: 44px; height: 44px; border-radius: 50%; border: none;
            background: linear-gradient(135deg, #10b981, #059669);
            color: white; font-size: 20px; cursor: pointer; z-index: 9000;
            box-shadow: 0 4px 12px rgba(16, 185, 129, 0.4); transition: all 0.3s;
        `;
        btn.addEventListener('mouseenter', () => btn.style.transform = 'scale(1.1)');
        btn.addEventListener('mouseleave', () => btn.style.transform = 'scale(1)');
        btn.addEventListener('click', () => this.togglePanel());
        document.body.appendChild(btn);
    }
    
    createPanel() {
        this.panel = document.createElement('div');
        this.panel.id = 'auto-saver-panel';
        this.panel.innerHTML = `
            <div class="asp-header">
                <span class="asp-title">💾 自動保存 v2.2</span>
                <button class="asp-close">×</button>
            </div>
            <div class="asp-body">
                <div class="asp-section asp-session-section">
                    <div class="asp-section-title">📁 セッション管理</div>
                    <div class="asp-session-status" id="asp-session-status">
                        <span class="status-indicator inactive"></span>
                        <span>セッション未開始</span>
                    </div>
                    <input type="text" id="asp-session-name" class="asp-input" placeholder="フォルダ名（空欄で日時自動）">
                    <div class="asp-session-buttons">
                        <button class="asp-btn asp-btn-start" id="asp-start-session">▶️ 開始</button>
                        <button class="asp-btn asp-btn-stop" id="asp-stop-session" disabled>⏹️ 終了</button>
                    </div>
                    <div class="asp-session-info" id="asp-session-info"></div>
                </div>
                
                <div class="asp-section">
                    <div class="asp-section-title">🎬 画面録画</div>
                    <label class="asp-toggle-row"><span>🎬 自動録画</span><input type="checkbox" id="asp-recording" ${this.autoSaveEnabled.recording ? 'checked' : ''}><span class="asp-toggle-slider"></span></label>
                    <div class="asp-quality-row">
                        <span>画質:</span>
                        <select id="asp-recording-quality" class="asp-select">
                            <option value="low" ${this.recordingSettings.quality === 'low' ? 'selected' : ''}>低 (500kbps)</option>
                            <option value="medium" ${this.recordingSettings.quality === 'medium' ? 'selected' : ''}>中 (1Mbps)</option>
                            <option value="high" ${this.recordingSettings.quality === 'high' ? 'selected' : ''}>高 (2.5Mbps)</option>
                        </select>
                    </div>
                </div>
                
                <div class="asp-section">
                    <div class="asp-section-title">🖼️ 画像自動保存</div>
                    <label class="asp-toggle-row"><span>🎨 想像ワイプ</span><input type="checkbox" id="asp-imagination" ${this.autoSaveEnabled.imagination ? 'checked' : ''}><span class="asp-toggle-slider"></span></label>
                    <label class="asp-toggle-row"><span>🌍 360度背景</span><input type="checkbox" id="asp-background360" ${this.autoSaveEnabled.background360 ? 'checked' : ''}><span class="asp-toggle-slider"></span></label>
                    <label class="asp-toggle-row"><span>🎲 3Dモデル</span><input type="checkbox" id="asp-tripo3d" ${this.autoSaveEnabled.tripo3d ? 'checked' : ''}><span class="asp-toggle-slider"></span></label>
                </div>
                
                <div class="asp-section">
                    <div class="asp-section-title">📝 テキスト自動保存（30秒ごと）</div>
                    <label class="asp-toggle-row"><span>💬 会話ログ</span><input type="checkbox" id="asp-conversation" ${this.autoSaveEnabled.conversation ? 'checked' : ''}><span class="asp-toggle-slider"></span></label>
                    <label class="asp-toggle-row"><span>📊 パイプライン</span><input type="checkbox" id="asp-pipeline" ${this.autoSaveEnabled.pipeline ? 'checked' : ''}><span class="asp-toggle-slider"></span></label>
                    <label class="asp-toggle-row"><span>🎯 トピック</span><input type="checkbox" id="asp-topic" ${this.autoSaveEnabled.topic ? 'checked' : ''}><span class="asp-toggle-slider"></span></label>
                    <label class="asp-toggle-row"><span>📋 カンペ</span><input type="checkbox" id="asp-kanpe" ${this.autoSaveEnabled.kanpe ? 'checked' : ''}><span class="asp-toggle-slider"></span></label>
                </div>
                
                <div class="asp-section">
                    <div class="asp-section-title">📥 今すぐ保存</div>
                    <button class="asp-btn asp-btn-save-all" id="asp-save-all-now">📥 全てを今すぐ保存</button>
                </div>
                
                <div class="asp-section">
                    <div class="asp-section-title">📜 保存履歴</div>
                    <div class="asp-history" id="asp-history-list">
                        <div class="asp-history-empty">セッションを開始してください</div>
                    </div>
                </div>
                
                <div class="asp-info">
                    📁 保存先: I:\\filesystem\\ai_creative_vrm\\save\\[セッション名]
                </div>
            </div>
        `;
        
        this.applyPanelStyles();
        this.panel.style.display = 'none';
        document.body.appendChild(this.panel);
        this.setupPanelEvents();
    }
    
    applyPanelStyles() {
        if (document.getElementById('auto-saver-styles')) return;
        const style = document.createElement('style');
        style.id = 'auto-saver-styles';
        style.textContent = `
            #auto-saver-panel { position: fixed; left: 60px; bottom: 200px; width: 300px; background: rgba(20, 20, 30, 0.98); border-radius: 12px; box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(16, 185, 129, 0.3); z-index: 9001; backdrop-filter: blur(10px); overflow: hidden; font-family: sans-serif; font-size: 12px; }
            #auto-saver-panel .asp-header { display: flex; justify-content: space-between; align-items: center; padding: 10px 14px; background: linear-gradient(135deg, #10b981, #059669); cursor: move; user-select: none; }
            #auto-saver-panel .asp-title { color: white; font-weight: bold; font-size: 13px; }
            #auto-saver-panel .asp-close { width: 22px; height: 22px; border: none; border-radius: 4px; background: rgba(239, 68, 68, 0.8); color: white; cursor: pointer; font-size: 14px; }
            #auto-saver-panel .asp-body { padding: 10px; display: flex; flex-direction: column; gap: 8px; max-height: 65vh; overflow-y: auto; }
            #auto-saver-panel .asp-section { background: rgba(255, 255, 255, 0.05); border-radius: 8px; padding: 10px; }
            #auto-saver-panel .asp-session-section { border: 2px solid rgba(16, 185, 129, 0.5); }
            #auto-saver-panel .asp-section-title { font-size: 11px; color: #10b981; margin-bottom: 8px; font-weight: bold; }
            #auto-saver-panel .asp-session-status { display: flex; align-items: center; gap: 8px; padding: 6px 10px; background: rgba(0, 0, 0, 0.3); border-radius: 6px; margin-bottom: 8px; font-size: 11px; color: #d1d5db; }
            #auto-saver-panel .status-indicator { width: 10px; height: 10px; border-radius: 50%; }
            #auto-saver-panel .status-indicator.inactive { background: #6b7280; }
            #auto-saver-panel .status-indicator.active { background: #10b981; animation: pulse 1.5s infinite; }
            @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
            #auto-saver-panel .asp-input { width: 100%; padding: 8px 10px; border: 1px solid rgba(255, 255, 255, 0.2); border-radius: 6px; background: rgba(0, 0, 0, 0.3); color: white; font-size: 11px; outline: none; box-sizing: border-box; margin-bottom: 8px; }
            #auto-saver-panel .asp-input:focus { border-color: #10b981; }
            #auto-saver-panel .asp-session-buttons { display: flex; gap: 8px; }
            #auto-saver-panel .asp-btn { flex: 1; padding: 8px; border: none; border-radius: 6px; cursor: pointer; font-size: 11px; font-weight: bold; transition: all 0.2s; }
            #auto-saver-panel .asp-btn-start { background: linear-gradient(135deg, #10b981, #059669); color: white; }
            #auto-saver-panel .asp-btn-start:hover { filter: brightness(1.1); }
            #auto-saver-panel .asp-btn-start:disabled { background: #374151; cursor: not-allowed; }
            #auto-saver-panel .asp-btn-stop { background: linear-gradient(135deg, #ef4444, #dc2626); color: white; }
            #auto-saver-panel .asp-btn-stop:disabled { background: #374151; cursor: not-allowed; }
            #auto-saver-panel .asp-btn-save-all { width: 100%; background: linear-gradient(135deg, #3b82f6, #2563eb); color: white; }
            #auto-saver-panel .asp-session-info { margin-top: 8px; font-size: 10px; color: #6b7280; word-break: break-all; }
            #auto-saver-panel .asp-toggle-row { display: flex; align-items: center; justify-content: space-between; padding: 6px 0; cursor: pointer; color: #d1d5db; }
            #auto-saver-panel .asp-toggle-row input { display: none; }
            #auto-saver-panel .asp-toggle-slider { width: 36px; height: 18px; background: #374151; border-radius: 9px; position: relative; transition: all 0.3s; }
            #auto-saver-panel .asp-toggle-slider::after { content: ''; position: absolute; width: 14px; height: 14px; background: white; border-radius: 50%; top: 2px; left: 2px; transition: all 0.3s; }
            #auto-saver-panel .asp-toggle-row input:checked + .asp-toggle-slider { background: #10b981; }
            #auto-saver-panel .asp-toggle-row input:checked + .asp-toggle-slider::after { left: 20px; }
            #auto-saver-panel .asp-quality-row { display: flex; align-items: center; justify-content: space-between; padding: 6px 0; color: #9ca3af; font-size: 11px; }
            #auto-saver-panel .asp-select { padding: 4px 8px; border-radius: 4px; border: 1px solid rgba(255,255,255,0.2); background: rgba(0,0,0,0.3); color: white; font-size: 10px; }
            #auto-saver-panel .asp-history { max-height: 100px; overflow-y: auto; }
            #auto-saver-panel .asp-history-item { padding: 4px 6px; background: rgba(0, 0, 0, 0.2); border-radius: 4px; margin-bottom: 3px; font-size: 9px; color: #9ca3af; display: flex; justify-content: space-between; }
            #auto-saver-panel .asp-history-item .type { color: #10b981; }
            #auto-saver-panel .asp-history-empty { color: #6b7280; font-size: 10px; text-align: center; padding: 10px; }
            #auto-saver-panel .asp-info { font-size: 9px; color: #10b981; text-align: center; line-height: 1.4; background: rgba(16, 185, 129, 0.1); padding: 6px; border-radius: 4px; }
            .asp-notification { position: fixed; bottom: 80px; right: 20px; background: rgba(16, 185, 129, 0.95); color: white; padding: 10px 20px; border-radius: 8px; font-size: 13px; z-index: 99999; animation: aspFadeInOut 2s ease-out forwards; }
            .asp-notification.error { background: rgba(239, 68, 68, 0.95); }
            @keyframes aspFadeInOut { 0% { opacity: 0; transform: translateY(20px); } 15% { opacity: 1; transform: translateY(0); } 85% { opacity: 1; } 100% { opacity: 0; } }
        `;
        document.head.appendChild(style);
    }
    
    setupPanelEvents() {
        this.panel.querySelector('.asp-close').addEventListener('click', () => this.panel.style.display = 'none');
        
        // ドラッグ
        const header = this.panel.querySelector('.asp-header');
        let isDragging = false, offset = { x: 0, y: 0 };
        header.addEventListener('mousedown', (e) => { isDragging = true; offset = { x: e.clientX - this.panel.offsetLeft, y: e.clientY - this.panel.offsetTop }; });
        document.addEventListener('mousemove', (e) => { if (isDragging) { this.panel.style.left = (e.clientX - offset.x) + 'px'; this.panel.style.top = (e.clientY - offset.y) + 'px'; this.panel.style.bottom = 'auto'; } });
        document.addEventListener('mouseup', () => isDragging = false);
        
        // セッション開始/終了
        this.panel.querySelector('#asp-start-session').addEventListener('click', () => {
            const nameInput = this.panel.querySelector('#asp-session-name');
            this.startSession(nameInput.value);
            nameInput.value = '';
        });
        this.panel.querySelector('#asp-stop-session').addEventListener('click', () => this.endSession());
        
        // 今すぐ保存
        this.panel.querySelector('#asp-save-all-now').addEventListener('click', () => {
            if (this.isSessionActive) {
                this.saveAllTextData();
                this.showNotification('📥 全データを保存しました');
            } else {
                this.showNotification('⚠️ セッションを開始してください', 'error');
            }
        });
        
        // 録画品質
        this.panel.querySelector('#asp-recording-quality').addEventListener('change', (e) => {
            this.recordingSettings.quality = e.target.value;
            this.saveSettings();
        });
        
        // トグル
        ['imagination', 'background360', 'tripo3d', 'conversation', 'pipeline', 'topic', 'kanpe', 'recording'].forEach(type => {
            const toggle = this.panel.querySelector(`#asp-${type}`);
            if (toggle) {
                toggle.addEventListener('change', (e) => { this.autoSaveEnabled[type] = e.target.checked; this.saveSettings(); });
            }
        });
    }
    
    updateSessionDisplay() {
        const statusEl = this.panel.querySelector('#asp-session-status');
        const infoEl = this.panel.querySelector('#asp-session-info');
        const startBtn = this.panel.querySelector('#asp-start-session');
        const stopBtn = this.panel.querySelector('#asp-stop-session');
        
        if (this.isSessionActive) {
            statusEl.innerHTML = `<span class="status-indicator active"></span><span>セッション実行中${this.isRecording ? ' 🔴REC' : ''}</span>`;
            infoEl.textContent = `📁 ${this.sessionName}`;
            startBtn.disabled = true;
            stopBtn.disabled = false;
        } else {
            statusEl.innerHTML = `<span class="status-indicator inactive"></span><span>セッション未開始</span>`;
            infoEl.textContent = '';
            startBtn.disabled = false;
            stopBtn.disabled = true;
        }
    }
    
    updateHistoryDisplay() {
        const historyList = this.panel.querySelector('#asp-history-list');
        if (!historyList) return;
        
        if (this.saveHistory.length === 0) {
            historyList.innerHTML = '<div class="asp-history-empty">保存履歴なし</div>';
            return;
        }
        
        const icons = { imagination: '🎨', background360: '🌍', tripo3d: '🎲', conversation: '💬', pipeline: '📊', topic: '🎯', kanpe: '📋', recording: '🎬' };
        historyList.innerHTML = this.saveHistory.slice(0, 15).map(h => `<div class="asp-history-item"><span class="type">${icons[h.type] || '📁'} ${h.label}</span><span>${h.time}</span></div>`).join('');
    }
    
    togglePanel() {
        this.panel.style.display = this.panel.style.display === 'none' ? 'block' : 'none';
        if (this.panel.style.display === 'block') {
            this.updateSessionDisplay();
            this.updateHistoryDisplay();
        }
    }
    
    showNotification(message, type = 'success') {
        const notification = document.createElement('div');
        notification.className = `asp-notification ${type}`;
        notification.textContent = message;
        document.body.appendChild(notification);
        setTimeout(() => notification.remove(), 2000);
    }
}

// インスタンス作成
window.autoSaver = new AutoSaver();
console.log('✅ 自動保存システム v2.2 起動完了');
