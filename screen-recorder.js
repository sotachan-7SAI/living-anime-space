// ========================================
// 画面録画システム v1.3
// Shift+P: 録画開始 / Shift+O: 録画停止
// コーデック選択対応（MP4 H.264, WebM VP9, etc.）
// ★ v1.3: AI Director連携はデフォルトOFFに変更
// ========================================

console.log('🎬 画面録画システム v1.3 を読み込み中...');

(function() {
    // 利用可能なコーデック一覧
    const codecOptions = [
        { 
            id: 'h264-mp4',
            name: 'MP4 (H.264) - Windows互換 ★おすすめ',
            mimeType: 'video/mp4;codecs=avc1',
            fallback: 'video/webm;codecs=h264',
            extension: 'mp4',
            description: 'Windows Media Player対応、最も互換性が高い'
        },
        { 
            id: 'vp9-webm',
            name: 'WebM (VP9) - 高圧縮',
            mimeType: 'video/webm;codecs=vp9',
            fallback: 'video/webm',
            extension: 'webm',
            description: 'YouTube品質、Chrome/Firefox対応'
        },
        { 
            id: 'vp8-webm',
            name: 'WebM (VP8) - 軽量',
            mimeType: 'video/webm;codecs=vp8',
            fallback: 'video/webm',
            extension: 'webm',
            description: '古いブラウザでも対応'
        },
        { 
            id: 'h265-mp4',
            name: 'MP4 (H.265/HEVC) - 最高圧縮',
            mimeType: 'video/mp4;codecs=hvc1',
            fallback: 'video/webm;codecs=vp9',
            extension: 'mp4',
            description: '50%小さいが新しいPCのみ'
        },
        { 
            id: 'av1-webm',
            name: 'WebM (AV1) - 最新規格',
            mimeType: 'video/webm;codecs=av1',
            fallback: 'video/webm;codecs=vp9',
            extension: 'webm',
            description: '最新・最高圧縮（Chrome 94+）'
        }
    ];
    
    // 録画設定
    const recorderSettings = {
        savePath: 'I:/filesystem/vrm-ai-viewer録画/01',
        filePrefix: 'automove',
        codecId: 'h264-mp4',  // デフォルトはMP4 (H.264)
        videoBitsPerSecond: 8000000, // 8Mbps
    };
    
    // 状態管理
    let mediaRecorder = null;
    let recordedChunks = [];
    let isRecording = false;
    let recordingStartTime = null;
    let stream = null;
    
    // 選択されたコーデックを取得
    function getSelectedCodec() {
        return codecOptions.find(c => c.id === recorderSettings.codecId) || codecOptions[0];
    }
    
    // コーデックがサポートされているか確認
    function getSupportedMimeType(codec) {
        if (MediaRecorder.isTypeSupported(codec.mimeType)) {
            return codec.mimeType;
        }
        if (codec.fallback && MediaRecorder.isTypeSupported(codec.fallback)) {
            console.log(`⚠️ ${codec.mimeType} 非対応、${codec.fallback} を使用`);
            return codec.fallback;
        }
        // 最終フォールバック
        if (MediaRecorder.isTypeSupported('video/webm')) {
            return 'video/webm';
        }
        return '';
    }
    
    // 録画設定パネルを作成
    function createSettingsPanel() {
        if (document.getElementById('screen-recorder-settings')) return;
        
        // コーデック選択肢を生成
        const codecOptionsHtml = codecOptions.map(codec => {
            const supported = MediaRecorder.isTypeSupported(codec.mimeType) || 
                             MediaRecorder.isTypeSupported(codec.fallback);
            const statusIcon = supported ? '✅' : '⚠️';
            return `<option value="${codec.id}" ${!supported ? 'style="color: #888;"' : ''}>
                ${statusIcon} ${codec.name}
            </option>`;
        }).join('');
        
        const panel = document.createElement('div');
        panel.id = 'screen-recorder-settings';
        panel.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
            color: white;
            padding: 25px;
            border-radius: 15px;
            z-index: 1000000;
            min-width: 450px;
            box-shadow: 0 10px 40px rgba(0,0,0,0.5);
            display: none;
            font-family: sans-serif;
        `;
        
        panel.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                <h3 style="margin: 0; font-size: 18px;">🎬 画面録画設定</h3>
                <button id="sr-close-btn" style="
                    background: #ff4757;
                    border: none;
                    color: white;
                    width: 28px;
                    height: 28px;
                    border-radius: 50%;
                    cursor: pointer;
                    font-size: 14px;
                ">✕</button>
            </div>
            
            <div style="margin-bottom: 15px;">
                <label style="display: block; margin-bottom: 5px; font-size: 12px; color: #aaa;">保存フォルダ:</label>
                <input type="text" id="sr-save-path" value="${recorderSettings.savePath}" style="
                    width: 100%;
                    padding: 10px;
                    border: 1px solid #444;
                    border-radius: 8px;
                    background: #2a2a4a;
                    color: white;
                    font-size: 13px;
                    box-sizing: border-box;
                ">
            </div>
            
            <div style="margin-bottom: 15px;">
                <label style="display: block; margin-bottom: 5px; font-size: 12px; color: #aaa;">ファイル名プレフィックス:</label>
                <input type="text" id="sr-file-prefix" value="${recorderSettings.filePrefix}" style="
                    width: 100%;
                    padding: 10px;
                    border: 1px solid #444;
                    border-radius: 8px;
                    background: #2a2a4a;
                    color: white;
                    font-size: 13px;
                    box-sizing: border-box;
                ">
            </div>
            
            <div style="margin-bottom: 15px;">
                <label style="display: block; margin-bottom: 5px; font-size: 12px; color: #aaa;">📼 コーデック（形式）:</label>
                <select id="sr-codec" style="
                    width: 100%;
                    padding: 10px;
                    border: 1px solid #444;
                    border-radius: 8px;
                    background: #2a2a4a;
                    color: white;
                    font-size: 13px;
                    box-sizing: border-box;
                    cursor: pointer;
                ">
                    ${codecOptionsHtml}
                </select>
                <div id="sr-codec-desc" style="
                    margin-top: 5px;
                    font-size: 11px;
                    color: #888;
                    padding: 8px;
                    background: rgba(255,255,255,0.05);
                    border-radius: 6px;
                "></div>
            </div>
            
            <div style="margin-bottom: 20px;">
                <label style="display: block; margin-bottom: 5px; font-size: 12px; color: #aaa;">🎚️ ビットレート (Mbps):</label>
                <div style="display: flex; align-items: center; gap: 10px;">
                    <input type="range" id="sr-bitrate-slider" min="1" max="30" value="8" style="
                        flex: 1;
                        height: 6px;
                        cursor: pointer;
                    ">
                    <input type="number" id="sr-bitrate" value="8" min="1" max="50" style="
                        width: 70px;
                        padding: 8px;
                        border: 1px solid #444;
                        border-radius: 8px;
                        background: #2a2a4a;
                        color: white;
                        font-size: 13px;
                        text-align: center;
                    ">
                </div>
                <div style="display: flex; justify-content: space-between; font-size: 10px; color: #666; margin-top: 3px;">
                    <span>軽い (1Mbps)</span>
                    <span>標準 (8Mbps)</span>
                    <span>高画質 (30Mbps)</span>
                </div>
            </div>
            
            <div style="display: flex; gap: 10px;">
                <button id="sr-save-settings" style="
                    flex: 1;
                    padding: 12px;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    border: none;
                    border-radius: 8px;
                    color: white;
                    font-weight: bold;
                    cursor: pointer;
                    font-size: 14px;
                ">💾 設定を保存</button>
            </div>
            
            <div style="margin-top: 15px; padding: 12px; background: rgba(255,255,255,0.1); border-radius: 8px; font-size: 11px; color: #aaa;">
                <div>📹 <strong>Shift+P</strong>: 録画開始</div>
                <div>⏹️ <strong>Shift+O</strong>: 録画停止</div>
                <div id="sr-filename-preview" style="margin-top: 5px;">📁 ファイル名: automove_YYYYMMDD_HHMMSS.mp4</div>
            </div>
            
            <div style="margin-top: 10px; padding: 10px; background: rgba(102, 126, 234, 0.2); border-radius: 8px; font-size: 11px;">
                <div style="color: #667eea; font-weight: bold; margin-bottom: 5px;">💡 コーデックの選び方</div>
                <div style="color: #aaa;">
                    • <strong>Windows Media Player</strong>で見る → MP4 (H.264)<br>
                    • <strong>ファイルを小さく</strong>したい → WebM (VP9) または H.265<br>
                    • <strong>最新環境</strong>で最高圧縮 → WebM (AV1)
                </div>
            </div>
        `;
        
        document.body.appendChild(panel);
        
        // イベント設定
        document.getElementById('sr-close-btn').onclick = () => panel.style.display = 'none';
        document.getElementById('sr-save-settings').onclick = saveSettings;
        
        // コーデック選択時の説明更新
        const codecSelect = document.getElementById('sr-codec');
        const codecDesc = document.getElementById('sr-codec-desc');
        const filenamePreview = document.getElementById('sr-filename-preview');
        
        function updateCodecDesc() {
            const codec = codecOptions.find(c => c.id === codecSelect.value);
            if (codec) {
                const supported = MediaRecorder.isTypeSupported(codec.mimeType);
                codecDesc.innerHTML = `${codec.description}<br>
                    <span style="color: ${supported ? '#4CAF50' : '#ff9800'};">
                        ${supported ? '✅ このブラウザで対応' : '⚠️ フォールバック使用'}
                    </span>`;
                filenamePreview.textContent = `📁 ファイル名: ${recorderSettings.filePrefix}_YYYYMMDD_HHMMSS.${codec.extension}`;
            }
        }
        
        codecSelect.addEventListener('change', updateCodecDesc);
        
        // ビットレートスライダー連動
        const bitrateSlider = document.getElementById('sr-bitrate-slider');
        const bitrateInput = document.getElementById('sr-bitrate');
        
        bitrateSlider.addEventListener('input', () => {
            bitrateInput.value = bitrateSlider.value;
        });
        bitrateInput.addEventListener('input', () => {
            bitrateSlider.value = Math.min(30, Math.max(1, bitrateInput.value));
        });
        
        // 設定を読み込み
        loadSettings();
        updateCodecDesc();
    }
    
    // 設定を保存
    function saveSettings() {
        recorderSettings.savePath = document.getElementById('sr-save-path').value;
        recorderSettings.filePrefix = document.getElementById('sr-file-prefix').value;
        recorderSettings.codecId = document.getElementById('sr-codec').value;
        recorderSettings.videoBitsPerSecond = parseInt(document.getElementById('sr-bitrate').value) * 1000000;
        
        localStorage.setItem('screen-recorder-settings', JSON.stringify(recorderSettings));
        
        showNotification('✅ 設定を保存しました', 'success');
        document.getElementById('screen-recorder-settings').style.display = 'none';
    }
    
    // 設定を読み込み
    function loadSettings() {
        const saved = localStorage.getItem('screen-recorder-settings');
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                Object.assign(recorderSettings, parsed);
                
                // UI更新
                const pathInput = document.getElementById('sr-save-path');
                const prefixInput = document.getElementById('sr-file-prefix');
                const bitrateInput = document.getElementById('sr-bitrate');
                const bitrateSlider = document.getElementById('sr-bitrate-slider');
                const codecSelect = document.getElementById('sr-codec');
                
                if (pathInput) pathInput.value = recorderSettings.savePath;
                if (prefixInput) prefixInput.value = recorderSettings.filePrefix;
                if (bitrateInput) bitrateInput.value = recorderSettings.videoBitsPerSecond / 1000000;
                if (bitrateSlider) bitrateSlider.value = Math.min(30, recorderSettings.videoBitsPerSecond / 1000000);
                if (codecSelect) codecSelect.value = recorderSettings.codecId || 'h264-mp4';
            } catch (e) {
                console.warn('設定読み込みエラー:', e);
            }
        }
    }
    
    // 録画開始
    async function startRecording() {
        if (isRecording) {
            stopRecording();
            return;
        }
        
        try {
            // 画面キャプチャを開始
            stream = await navigator.mediaDevices.getDisplayMedia({
                video: {
                    mediaSource: 'screen',
                    frameRate: 30,
                },
                audio: true // システム音声も録音
            });
            
            // 選択されたコーデックを取得
            const codec = getSelectedCodec();
            const mimeType = getSupportedMimeType(codec);
            
            if (!mimeType) {
                throw new Error('サポートされているコーデックがありません');
            }
            
            // MediaRecorderを設定
            const options = {
                mimeType: mimeType,
                videoBitsPerSecond: recorderSettings.videoBitsPerSecond
            };
            
            console.log(`🎬 録画開始: ${mimeType} @ ${recorderSettings.videoBitsPerSecond/1000000}Mbps`);
            
            mediaRecorder = new MediaRecorder(stream, options);
            recordedChunks = [];
            
            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    recordedChunks.push(event.data);
                }
            };
            
            mediaRecorder.onstop = async () => {
                await saveRecording();
            };
            
            // ストリームが停止したときの処理
            stream.getVideoTracks()[0].onended = () => {
                if (isRecording) {
                    stopRecording();
                }
            };
            
            mediaRecorder.start(1000); // 1秒ごとにデータを取得
            isRecording = true;
            recordingStartTime = Date.now();
            
            showRecordingUI(true);
            showNotification('🎬 録画を開始しました', 'success');
            
        } catch (error) {
            console.error('録画開始エラー:', error);
            showNotification('❌ 録画を開始できませんでした', 'error');
        }
    }
    
    // 録画停止
    function stopRecording() {
        if (!isRecording || !mediaRecorder) return;
        
        isRecording = false;
        mediaRecorder.stop();
        
        // ストリームを停止
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
            stream = null;
        }
        
        showRecordingUI(false);
        showNotification('⏹️ 録画を停止しました。保存中...', 'info');
        
        console.log('🎬 画面録画を停止しました');
    }
    
    // 録画を保存
    async function saveRecording() {
        if (recordedChunks.length === 0) {
            showNotification('❌ 録画データがありません', 'error');
            return;
        }
        
        const codec = getSelectedCodec();
        const mimeType = getSupportedMimeType(codec);
        const blob = new Blob(recordedChunks, { type: mimeType });
        
        // ファイル名を生成
        const now = new Date();
        const timestamp = now.getFullYear().toString() +
            String(now.getMonth() + 1).padStart(2, '0') +
            String(now.getDate()).padStart(2, '0') + '_' +
            String(now.getHours()).padStart(2, '0') +
            String(now.getMinutes()).padStart(2, '0') +
            String(now.getSeconds()).padStart(2, '0');
        
        const filename = `${recorderSettings.filePrefix}_${timestamp}.${codec.extension}`;
        
        try {
            // サーバーに送信して保存
            const formData = new FormData();
            formData.append('video', blob, filename);
            formData.append('savePath', recorderSettings.savePath);
            formData.append('filename', filename);
            
            const response = await fetch('/api/save-recording', {
                method: 'POST',
                body: formData
            });
            
            if (response.ok) {
                const result = await response.json();
                showNotification(`✅ 保存完了: ${result.filename}`, 'success');
                console.log('🎬 録画を保存しました:', result.path);
            } else {
                throw new Error('サーバーエラー');
            }
        } catch (error) {
            console.error('保存エラー:', error);
            // フォールバック: ブラウザでダウンロード
            downloadLocally(blob, filename);
        }
        
        recordedChunks = [];
    }
    
    // ローカルダウンロード（フォールバック）
    function downloadLocally(blob, filename) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        showNotification(`📥 ダウンロード: ${filename}`, 'info');
    }
    
    // 録画UI表示
    function showRecordingUI(show) {
        let ui = document.getElementById('screen-recording-ui');
        
        if (show) {
            const codec = getSelectedCodec();
            
            if (!ui) {
                ui = document.createElement('div');
                ui.id = 'screen-recording-ui';
                ui.style.cssText = `
                    position: fixed;
                    top: 60px;
                    left: 50%;
                    transform: translateX(-50%);
                    background: linear-gradient(135deg, #e74c3c 0%, #c0392b 100%);
                    color: white;
                    padding: 10px 25px;
                    border-radius: 25px;
                    z-index: 1000001;
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    box-shadow: 0 4px 20px rgba(231, 76, 60, 0.5);
                    font-family: sans-serif;
                    font-size: 13px;
                    font-weight: bold;
                `;
                document.body.appendChild(ui);
            }
            
            ui.innerHTML = `
                <span style="
                    width: 12px;
                    height: 12px;
                    background: white;
                    border-radius: 50%;
                    animation: recBlink 1s infinite;
                "></span>
                <span>⏺️ 録画中 (${codec.extension.toUpperCase()})</span>
                <span id="rec-timer" style="font-family: monospace;">00:00</span>
                <button id="rec-stop-btn" style="
                    background: rgba(255,255,255,0.2);
                    border: none;
                    color: white;
                    padding: 5px 12px;
                    border-radius: 15px;
                    cursor: pointer;
                    font-size: 11px;
                ">⏹️ 停止 (Shift+O)</button>
            `;
            
            ui.style.display = 'flex';
            
            document.getElementById('rec-stop-btn').onclick = stopRecording;
            
            // タイマー更新
            updateRecordingTimer();
            
        } else {
            if (ui) {
                ui.style.display = 'none';
            }
        }
    }
    
    // 録画タイマー更新
    function updateRecordingTimer() {
        if (!isRecording) return;
        
        const elapsed = Math.floor((Date.now() - recordingStartTime) / 1000);
        const minutes = Math.floor(elapsed / 60);
        const seconds = elapsed % 60;
        
        const timerEl = document.getElementById('rec-timer');
        if (timerEl) {
            timerEl.textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
        }
        
        requestAnimationFrame(updateRecordingTimer);
    }
    
    // 通知表示
    function showNotification(message, type = 'info') {
        let notification = document.getElementById('sr-notification');
        if (!notification) {
            notification = document.createElement('div');
            notification.id = 'sr-notification';
            document.body.appendChild(notification);
        }
        
        const colors = {
            success: 'linear-gradient(135deg, #00b894 0%, #00cec9 100%)',
            error: 'linear-gradient(135deg, #e74c3c 0%, #c0392b 100%)',
            info: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
        };
        
        notification.style.cssText = `
            position: fixed;
            bottom: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: ${colors[type] || colors.info};
            color: white;
            padding: 12px 25px;
            border-radius: 25px;
            z-index: 1000002;
            font-family: sans-serif;
            font-size: 13px;
            font-weight: bold;
            box-shadow: 0 4px 20px rgba(0,0,0,0.3);
            animation: srNotifyPop 0.3s ease-out;
        `;
        notification.textContent = message;
        notification.style.display = 'block';
        
        setTimeout(() => {
            notification.style.display = 'none';
        }, 3000);
    }
    
    // CSS追加
    function addStyles() {
        if (document.getElementById('screen-recorder-styles')) return;
        
        const style = document.createElement('style');
        style.id = 'screen-recorder-styles';
        style.textContent = `
            @keyframes recBlink {
                0%, 100% { opacity: 1; }
                50% { opacity: 0.3; }
            }
            @keyframes srNotifyPop {
                from { opacity: 0; transform: translateX(-50%) translateY(20px); }
                to { opacity: 1; transform: translateX(-50%) translateY(0); }
            }
        `;
        document.head.appendChild(style);
    }
    
    // キーボードショートカット設定
    function setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Shift + P: 録画開始/停止
            if (e.shiftKey && (e.key === 'P' || e.key === 'p') && !e.ctrlKey) {
                e.preventDefault();
                startRecording();
            }
            
            // Shift + O: 録画停止専用
            if (e.shiftKey && (e.key === 'O' || e.key === 'o')) {
                e.preventDefault();
                if (isRecording) {
                    stopRecording();
                } else {
                    showNotification('⚠️ 録画中ではありません', 'info');
                }
            }
            
            // Ctrl + Shift + P: 設定パネル表示
            if (e.shiftKey && (e.key === 'P' || e.key === 'p') && e.ctrlKey) {
                e.preventDefault();
                const panel = document.getElementById('screen-recorder-settings');
                if (panel) {
                    panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
                }
            }
        });
    }
    
    // AI Director Camera連携設定
    // ★ v1.3: デフォルトOFF - AI Director側のチェックボックスで制御
    let aiDirectorAutoRecording = false; // デフォルトOFF
    
    // AI Director Camera状態変更リスナー
    function setupAIDirectorIntegration() {
        window.addEventListener('aiDirectorStateChanged', (e) => {
            if (!aiDirectorAutoRecording) return;
            
            const { isEnabled } = e.detail;
            
            if (isEnabled && !isRecording) {
                console.log('🎬 AI Director開始検出 → 自動録画開始');
                startRecording();
            } else if (!isEnabled && isRecording) {
                console.log('🎬 AI Director停止検出 → 自動録画停止');
                stopRecording();
            }
        });
        
        console.log('🔗 AI Director Camera連携: 有効');
    }
    
    // 初期化
    function init() {
        addStyles();
        createSettingsPanel();
        setupKeyboardShortcuts();
        loadSettings();
        setupAIDirectorIntegration();
        
        // サポート状況をログ
        console.log('📼 コーデックサポート状況:');
        codecOptions.forEach(codec => {
            const supported = MediaRecorder.isTypeSupported(codec.mimeType);
            console.log(`   ${supported ? '✅' : '❌'} ${codec.name}`);
        });
        
        console.log('✅ 画面録画システム初期化完了');
        console.log('   📹 Shift+P: 録画開始');
        console.log('   ⏹️ Shift+O: 録画停止');
        console.log('   ⚙️ Ctrl+Shift+P: 設定パネル');
        console.log('   🎬 AI Director連携: OFF (デフォルト)');
    }
    
    // グローバルAPI
    window.screenRecorder = {
        start: startRecording,
        stop: stopRecording,
        isRecording: () => isRecording,
        showSettings: () => {
            const panel = document.getElementById('screen-recorder-settings');
            if (panel) panel.style.display = 'block';
        },
        getSettings: () => ({ ...recorderSettings }),
        getCodecs: () => codecOptions,
        getSupportedCodecs: () => codecOptions.filter(c => 
            MediaRecorder.isTypeSupported(c.mimeType) || MediaRecorder.isTypeSupported(c.fallback)
        ),
        // AI Director連携
        setAIDirectorAutoRecording: (enabled) => {
            aiDirectorAutoRecording = enabled;
            console.log(`🎬 AI Director自動録画: ${enabled ? 'ON' : 'OFF'}`);
        },
        isAIDirectorAutoRecording: () => aiDirectorAutoRecording
    };
    
    // DOM準備完了後に初期化
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();

console.log('✅ screen-recorder.js v1.3 読み込み完了');
