// ========================================
// Pipeline Monitor v1.2
// - 重複音声削除機能追加
// - Audioオブジェクト追跡システム追加
// 先読みパイプラインのリアルタイムモニタリング
// ========================================

(function() {
    'use strict';

    class PipelineMonitor {
        constructor() {
            this.panel = null;
            this.isMinimized = false;
            this.updateInterval = null;
            this.init();
        }

        init() {
            this.setupAudioTracking(); // Audioオブジェクト追跡を最初に設定
            this.createPanel();
            this.setupEventListeners();
            this.startMonitoring();
            console.log('📊 PipelineMonitor v1.2 初期化完了');
        }
        
        // Audioオブジェクト追跡システム
        setupAudioTracking() {
            // 既に設定済みならスキップ
            if (window._audioTracker) return;
            
            // 追跡用配列
            window._audioTracker = {
                audios: new Set(),
                add: function(audio) {
                    this.audios.add(audio);
                    // 終了時に自動削除
                    audio.addEventListener('ended', () => this.audios.delete(audio));
                    audio.addEventListener('error', () => this.audios.delete(audio));
                },
                getPlaying: function() {
                    const playing = [];
                    this.audios.forEach(audio => {
                        if (!audio.paused && !audio.ended) {
                            playing.push(audio);
                        }
                    });
                    return playing;
                },
                getAll: function() {
                    return Array.from(this.audios);
                }
            };
            
            // Audioコンストラクタをフック
            const OriginalAudio = window.Audio;
            window.Audio = function(src) {
                const audio = new OriginalAudio(src);
                window._audioTracker.add(audio);
                return audio;
            };
            window.Audio.prototype = OriginalAudio.prototype;
            
            console.log('📊 Audio追跡システム設定完了');
        }

        createPanel() {
            this.panel = document.createElement('div');
            this.panel.id = 'pipeline-monitor-panel';
            this.panel.innerHTML = `
                <div class="pm-header">
                    <span class="pm-title">📊 パイプラインモニター</span>
                    <div class="pm-header-controls">
                        <span class="pm-status" id="pm-status">停止中</span>
                        <button class="pm-btn pm-btn-minimize" id="pm-minimize">−</button>
                        <button class="pm-btn pm-btn-close" id="pm-close">×</button>
                    </div>
                </div>
                <div class="pm-body" id="pm-body">
                    <!-- 現在の状態 -->
                    <div class="pm-section pm-current-state">
                        <div class="pm-section-title">🎬 現在の状態</div>
                        <div class="pm-state-grid">
                            <div class="pm-state-item">
                                <span class="pm-state-label">ターン</span>
                                <span class="pm-state-value" id="pm-turn-count">0</span>
                            </div>
                            <div class="pm-state-item">
                                <span class="pm-state-label">トピック</span>
                                <span class="pm-state-value pm-topic" id="pm-current-topic">-</span>
                            </div>
                            <div class="pm-state-item">
                                <span class="pm-state-label">話者</span>
                                <span class="pm-state-value" id="pm-current-speaker">-</span>
                            </div>
                            <div class="pm-state-item">
                                <span class="pm-state-label">再生中</span>
                                <span class="pm-state-value" id="pm-is-playing">-</span>
                            </div>
                        </div>
                    </div>

                    <!-- パイプラインキュー -->
                    <div class="pm-section">
                        <div class="pm-section-title">
                            <span>📥 パイプラインキュー</span>
                            <span class="pm-queue-count" id="pm-queue-count">0件</span>
                        </div>
                        <div class="pm-pipeline-list" id="pm-pipeline-list">
                            <div class="pm-empty">パイプラインは空です</div>
                        </div>
                    </div>

                    <!-- システムノート（カンペ）プレビュー -->
                    <div class="pm-section">
                        <div class="pm-section-title">📝 現在のカンペ</div>
                        <div class="pm-system-note" id="pm-system-note">
                            <span class="pm-empty">カンペなし</span>
                        </div>
                    </div>

                    <!-- 音声監視・重複削除 -->
                    <div class="pm-section pm-audio-monitor">
                        <div class="pm-section-title">🔊 音声監視</div>
                        <div class="pm-audio-status">
                            <div class="pm-audio-count-row">
                                <span class="pm-audio-label">再生中の音声:</span>
                                <span class="pm-audio-count" id="pm-audio-count">0本</span>
                                <span class="pm-audio-warning" id="pm-audio-warning" style="display:none;">⚠️ 重複!</span>
                            </div>
                            <div class="pm-audio-list" id="pm-audio-list"></div>
                            <button class="pm-btn pm-btn-kill-audio" id="pm-kill-duplicate" style="display:none;">🔇 重複音声を削除</button>
                            <button class="pm-btn pm-btn-kill-all" id="pm-kill-all-audio">🔇 全音声停止</button>
                        </div>
                    </div>

                    <!-- 会話履歴（直近5件） -->
                    <div class="pm-section">
                        <div class="pm-section-title">
                            <span>💬 直近の会話</span>
                            <span class="pm-history-count" id="pm-history-count">0件</span>
                        </div>
                        <div class="pm-history-list" id="pm-history-list">
                            <div class="pm-empty">会話履歴なし</div>
                        </div>
                    </div>
                </div>
            `;

            this.addStyles();
            document.body.appendChild(this.panel);
            this.makeDraggable(this.panel, this.panel.querySelector('.pm-header'));
        }

        addStyles() {
            if (document.getElementById('pm-styles')) return;
            const style = document.createElement('style');
            style.id = 'pm-styles';
            style.textContent = `
                #pipeline-monitor-panel{position:fixed;top:60px;right:10px;width:300px;background:rgba(20,20,35,0.95);border-radius:12px;box-shadow:0 4px 20px rgba(0,0,0,0.5);z-index:10001;font-family:'Segoe UI','Yu Gothic',sans-serif;font-size:11px;color:#e0e0e0;overflow:hidden;backdrop-filter:blur(10px);border:1px solid rgba(100,100,255,0.3)}
                .pm-header{background:linear-gradient(135deg,#4f46e5 0%,#7c3aed 100%);padding:8px 12px;display:flex;justify-content:space-between;align-items:center;cursor:move}
                .pm-title{font-weight:bold;font-size:12px;color:white}
                .pm-header-controls{display:flex;align-items:center;gap:6px}
                .pm-status{font-size:9px;padding:2px 6px;background:rgba(255,255,255,0.2);border-radius:4px;color:white}
                .pm-status.running{background:#4ade80;color:#1a1a2e;font-weight:bold}
                .pm-status.paused{background:#fbbf24;color:#1a1a2e}
                .pm-body{padding:8px;max-height:500px;overflow-y:auto}
                .pm-body.minimized{display:none}
                .pm-section{background:rgba(255,255,255,0.05);border-radius:8px;padding:8px;margin-bottom:6px}
                .pm-section-title{font-weight:bold;font-size:10px;color:#a0a0ff;margin-bottom:6px;display:flex;justify-content:space-between;align-items:center}
                .pm-btn{padding:4px 8px;border:none;border-radius:4px;cursor:pointer;font-size:10px;transition:all 0.2s}
                .pm-btn-minimize,.pm-btn-close{background:rgba(255,255,255,0.2);color:white;width:20px;height:20px;padding:0;font-size:12px}
                .pm-btn:hover{opacity:0.8}
                
                /* 現在の状態グリッド */
                .pm-state-grid{display:grid;grid-template-columns:1fr 1fr;gap:6px}
                .pm-state-item{background:rgba(0,0,0,0.3);padding:6px;border-radius:4px}
                .pm-state-label{display:block;font-size:9px;color:#888;margin-bottom:2px}
                .pm-state-value{display:block;font-size:11px;font-weight:bold;color:#fff;word-break:break-all}
                .pm-state-value.pm-topic{font-size:10px;font-weight:normal;max-height:30px;overflow:hidden;text-overflow:ellipsis}
                
                /* パイプラインリスト */
                .pm-pipeline-list{display:flex;flex-direction:column;gap:4px;max-height:150px;overflow-y:auto}
                .pm-queue-count{font-size:9px;background:#4f46e5;padding:2px 6px;border-radius:10px;color:white}
                .pm-pipeline-item{display:flex;align-items:center;gap:6px;padding:6px 8px;background:rgba(0,0,0,0.3);border-radius:6px;border-left:3px solid #666}
                .pm-pipeline-item.pending{border-left-color:#666}
                .pm-pipeline-item.generating{border-left-color:#f59e0b;background:rgba(245,158,11,0.1)}
                .pm-pipeline-item.synthesizing{border-left-color:#8b5cf6;background:rgba(139,92,246,0.1)}
                .pm-pipeline-item.ready{border-left-color:#10b981;background:rgba(16,185,129,0.1)}
                .pm-pipeline-item.playing{border-left-color:#4ade80;background:rgba(74,222,128,0.2);animation:playing-glow 1s infinite}
                .pm-pipeline-item.done{border-left-color:#666;opacity:0.5}
                .pm-pipeline-item.error{border-left-color:#ef4444;background:rgba(239,68,68,0.1)}
                @keyframes playing-glow{0%,100%{box-shadow:0 0 5px rgba(74,222,128,0.3)}50%{box-shadow:0 0 15px rgba(74,222,128,0.6)}}
                
                .pm-pipeline-avatar{width:24px;height:24px;border-radius:50%;background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:bold;color:white;flex-shrink:0}
                .pm-pipeline-info{flex:1;overflow:hidden}
                .pm-pipeline-name{font-weight:bold;font-size:10px}
                .pm-pipeline-text{font-size:9px;color:#aaa;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:150px}
                .pm-pipeline-status{font-size:8px;padding:2px 5px;border-radius:3px;background:#333;color:#aaa;flex-shrink:0}
                .pm-pipeline-status.generating{background:#f59e0b;color:#000}
                .pm-pipeline-status.synthesizing{background:#8b5cf6;color:#fff}
                .pm-pipeline-status.ready{background:#10b981;color:#fff}
                .pm-pipeline-status.playing{background:#4ade80;color:#000}
                
                /* システムノート */
                .pm-system-note{background:rgba(0,0,0,0.3);padding:6px;border-radius:4px;font-size:9px;color:#aaa;max-height:60px;overflow-y:auto;white-space:pre-wrap;word-break:break-all}
                
                /* 会話履歴 */
                .pm-history-list{display:flex;flex-direction:column;gap:3px;max-height:100px;overflow-y:auto}
                .pm-history-count{font-size:9px;color:#888}
                .pm-history-item{padding:4px 6px;background:rgba(0,0,0,0.2);border-radius:4px;font-size:9px}
                .pm-history-speaker{font-weight:bold;color:#a0a0ff}
                .pm-history-text{color:#ccc;margin-left:4px}
                .pm-history-emotion{font-size:8px;color:#888;margin-left:4px}
                
                .pm-empty{text-align:center;color:#666;padding:10px;font-size:10px}
                
                /* 音声監視 */
                .pm-audio-monitor{background:rgba(255,100,100,0.05);border:1px solid rgba(255,100,100,0.2)}
                .pm-audio-count-row{display:flex;align-items:center;gap:8px;margin-bottom:6px}
                .pm-audio-label{font-size:10px;color:#aaa}
                .pm-audio-count{font-weight:bold;font-size:14px}
                .pm-audio-warning{color:#ef4444;font-weight:bold;animation:blink 0.5s infinite}
                @keyframes blink{0%,100%{opacity:1}50%{opacity:0.3}}
                .pm-audio-list{background:rgba(0,0,0,0.3);border-radius:4px;padding:4px;margin-bottom:6px;max-height:60px;overflow-y:auto}
                .pm-audio-item{font-size:9px;color:#aaa;padding:2px 4px}
                .pm-btn-kill-audio{width:100%;background:#ef4444;color:white;margin-bottom:4px;padding:6px}
                .pm-btn-kill-audio:hover{background:#dc2626}
                .pm-btn-kill-all{width:100%;background:#666;color:white;padding:4px;font-size:9px}
                .pm-btn-kill-all:hover{background:#555}
            `;
            document.head.appendChild(style);
        }

        setupEventListeners() {
            document.getElementById('pm-minimize').addEventListener('click', () => this.toggleMinimize());
            document.getElementById('pm-close').addEventListener('click', () => this.panel.style.display = 'none');
            
            // 音声削除ボタン
            document.getElementById('pm-kill-duplicate').addEventListener('click', () => this.killDuplicateAudio());
            document.getElementById('pm-kill-all-audio').addEventListener('click', () => this.killAllAudio());

            // パイプライン更新イベント
            window.addEventListener('multichar:pipelineUpdate', (e) => this.updateDisplay());
            window.addEventListener('multichar:conversationStart', () => this.updateDisplay());
            window.addEventListener('multichar:conversationEnd', () => this.updateDisplay());
            window.addEventListener('multichar:turnStart', () => this.updateDisplay());
            window.addEventListener('multichar:turnEnd', () => this.updateDisplay());
            window.addEventListener('multichar:topicUpdated', () => this.updateDisplay());
            window.addEventListener('multichar:kanpeSent', () => this.updateDisplay());
        }

        startMonitoring() {
            // 定期的に更新（200msごと）
            this.updateInterval = setInterval(() => this.updateDisplay(), 200);
        }

        stopMonitoring() {
            if (this.updateInterval) {
                clearInterval(this.updateInterval);
                this.updateInterval = null;
            }
        }

        updateDisplay() {
            const director = window.multiCharManager?.director;
            if (!director) {
                this.showEmpty();
                return;
            }

            // ステータス更新
            const statusEl = document.getElementById('pm-status');
            if (director.isRunning) {
                statusEl.textContent = director.isPaused ? '一時停止' : '会話中';
                statusEl.className = 'pm-status ' + (director.isPaused ? 'paused' : 'running');
            } else {
                statusEl.textContent = '停止中';
                statusEl.className = 'pm-status';
            }

            // 現在の状態
            document.getElementById('pm-turn-count').textContent = 
                `${director.currentTurnCount || 0}${director.maxTurns ? '/' + director.maxTurns : ''}`;
            document.getElementById('pm-current-topic').textContent = 
                director.topic || '-';
            
            const currentSpeaker = director.currentSpeakerId ? 
                director.characters.get(director.currentSpeakerId)?.name : '-';
            document.getElementById('pm-current-speaker').textContent = currentSpeaker;
            
            document.getElementById('pm-is-playing').textContent = 
                director.isCurrentlyPlaying ? '🔊 再生中' : '⏸️ 待機';
            document.getElementById('pm-is-playing').style.color = 
                director.isCurrentlyPlaying ? '#4ade80' : '#888';

            // パイプラインキュー
            this.updatePipelineList(director.pipeline || []);

            // システムノート
            const systemNoteEl = document.getElementById('pm-system-note');
            if (director.systemNote) {
                systemNoteEl.innerHTML = this.escapeHtml(director.systemNote.substring(0, 200)) + 
                    (director.systemNote.length > 200 ? '...' : '');
            } else {
                systemNoteEl.innerHTML = '<span class="pm-empty">カンペなし</span>';
            }

            // 会話履歴
            this.updateHistoryList(director.conversationHistory || []);
            
            // 音声監視
            this.updateAudioMonitor();
        }

        updatePipelineList(pipeline) {
            const listEl = document.getElementById('pm-pipeline-list');
            const countEl = document.getElementById('pm-queue-count');
            
            const activeEntries = pipeline.filter(e => e.status !== 'done');
            countEl.textContent = `${activeEntries.length}件`;

            if (pipeline.length === 0) {
                listEl.innerHTML = '<div class="pm-empty">パイプラインは空です</div>';
                return;
            }

            listEl.innerHTML = pipeline.map((entry, index) => {
                const statusLabel = this.getStatusLabel(entry.status);
                const textPreview = entry.responseText ? 
                    entry.responseText.substring(0, 30) + (entry.responseText.length > 30 ? '...' : '') : 
                    '生成中...';
                
                return `
                    <div class="pm-pipeline-item ${entry.status}">
                        <div class="pm-pipeline-avatar">${entry.speakerName?.charAt(0) || '?'}</div>
                        <div class="pm-pipeline-info">
                            <div class="pm-pipeline-name">${entry.speakerName || 'Unknown'}</div>
                            <div class="pm-pipeline-text">${this.escapeHtml(textPreview)}</div>
                        </div>
                        <div class="pm-pipeline-status ${entry.status}">${statusLabel}</div>
                    </div>
                `;
            }).join('');
        }

        updateHistoryList(history) {
            const listEl = document.getElementById('pm-history-list');
            const countEl = document.getElementById('pm-history-count');
            
            countEl.textContent = `${history.length}件`;

            if (history.length === 0) {
                listEl.innerHTML = '<div class="pm-empty">会話履歴なし</div>';
                return;
            }

            // 直近5件を逆順で表示
            const recentHistory = history.slice(-5).reverse();
            
            listEl.innerHTML = recentHistory.map(h => `
                <div class="pm-history-item">
                    <span class="pm-history-speaker">${h.speakerName}:</span>
                    <span class="pm-history-text">${this.escapeHtml(h.text?.substring(0, 40) || '')}${h.text?.length > 40 ? '...' : ''}</span>
                    ${h.emotion ? `<span class="pm-history-emotion">[${h.emotion}]</span>` : ''}
                </div>
            `).join('');
        }

        // 音声監視更新
        updateAudioMonitor() {
            const playingAudios = this.getPlayingAudios();
            const countEl = document.getElementById('pm-audio-count');
            const warningEl = document.getElementById('pm-audio-warning');
            const killBtn = document.getElementById('pm-kill-duplicate');
            const listEl = document.getElementById('pm-audio-list');
            
            const count = playingAudios.length;
            countEl.textContent = `${count}本`;
            countEl.style.color = count > 1 ? '#ef4444' : (count === 1 ? '#4ade80' : '#888');
            
            // 重複警告
            if (count > 1) {
                warningEl.style.display = 'inline';
                killBtn.style.display = 'block';
            } else {
                warningEl.style.display = 'none';
                killBtn.style.display = 'none';
            }
            
            // 再生中音声リスト
            if (count > 0) {
                listEl.innerHTML = playingAudios.map((audio, i) => {
                    const src = audio.src || audio.currentSrc || 'unknown';
                    const shortSrc = src.split('/').pop()?.substring(0, 20) || 'audio';
                    const time = audio.currentTime ? audio.currentTime.toFixed(1) + 's' : '0s';
                    return `<div class="pm-audio-item">#${i+1}: ${shortSrc} (${time})</div>`;
                }).join('');
            } else {
                listEl.innerHTML = '<div class="pm-audio-item pm-empty">再生中の音声なし</div>';
            }
        }
        
        // 再生中の音声要素を取得（フック + DOM両方チェック）
        getPlayingAudios() {
            const playing = [];
            const seen = new Set();
            
            // 1. フックで追跡したAudioオブジェクト
            if (window._audioTracker) {
                window._audioTracker.getPlaying().forEach(audio => {
                    if (!seen.has(audio)) {
                        seen.add(audio);
                        playing.push(audio);
                    }
                });
            }
            
            // 2. DOM上のaudio要素
            document.querySelectorAll('audio').forEach(audio => {
                if (!audio.paused && !audio.ended && !seen.has(audio)) {
                    seen.add(audio);
                    playing.push(audio);
                }
            });
            
            // 3. SBV2Panel.currentAudio（公開されていれば）
            if (window.SBV2Panel?.currentAudio && !window.SBV2Panel.currentAudio.paused) {
                const sbv2Audio = window.SBV2Panel.currentAudio;
                if (!seen.has(sbv2Audio)) {
                    seen.add(sbv2Audio);
                    playing.push(sbv2Audio);
                }
            }
            
            return playing;
        }
        
        // 重複音声を削除（最初の1本以外を停止）
        killDuplicateAudio() {
            const playingAudios = this.getPlayingAudios();
            if (playingAudios.length <= 1) {
                console.log('📊 重複音声なし');
                return;
            }
            
            // 最初の1本を残して他を停止
            let killed = 0;
            for (let i = 1; i < playingAudios.length; i++) {
                try {
                    playingAudios[i].pause();
                    playingAudios[i].currentTime = 0;
                    killed++;
                    console.log(`📊 重複音声 #${i+1} を停止しました`);
                } catch(e) {
                    console.error('音声停止エラー:', e);
                }
            }
            
            console.log(`📊 ${killed}本の重複音声を削除しました`);
            this.updateAudioMonitor();
        }
        
        // 全音声停止
        killAllAudio() {
            const allAudios = document.querySelectorAll('audio');
            let stopped = 0;
            allAudios.forEach(audio => {
                if (!audio.paused) {
                    audio.pause();
                    audio.currentTime = 0;
                    stopped++;
                }
            });
            console.log(`📊 ${stopped}本の音声を停止しました`);
            this.updateAudioMonitor();
        }
        
        getStatusLabel(status) {
            const labels = {
                'pending': '待機',
                'generating': 'LLM生成中',
                'synthesizing': '音声合成中',
                'ready': '準備完了',
                'playing': '再生中',
                'done': '完了',
                'error': 'エラー'
            };
            return labels[status] || status;
        }

        showEmpty() {
            document.getElementById('pm-status').textContent = '未接続';
            document.getElementById('pm-status').className = 'pm-status';
            document.getElementById('pm-turn-count').textContent = '-';
            document.getElementById('pm-current-topic').textContent = '-';
            document.getElementById('pm-current-speaker').textContent = '-';
            document.getElementById('pm-is-playing').textContent = '-';
            document.getElementById('pm-pipeline-list').innerHTML = '<div class="pm-empty">Director未接続</div>';
            document.getElementById('pm-history-list').innerHTML = '<div class="pm-empty">-</div>';
        }

        toggleMinimize() {
            this.isMinimized = !this.isMinimized;
            document.getElementById('pm-body').classList.toggle('minimized', this.isMinimized);
            document.getElementById('pm-minimize').textContent = this.isMinimized ? '＋' : '−';
        }

        makeDraggable(element, handle) {
            let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
            handle.onmousedown = (e) => {
                e.preventDefault();
                pos3 = e.clientX; pos4 = e.clientY;
                document.onmouseup = () => { document.onmouseup = null; document.onmousemove = null; };
                document.onmousemove = (e) => {
                    e.preventDefault();
                    pos1 = pos3 - e.clientX; pos2 = pos4 - e.clientY;
                    pos3 = e.clientX; pos4 = e.clientY;
                    element.style.top = (element.offsetTop - pos2) + "px";
                    element.style.left = (element.offsetLeft - pos1) + "px";
                    element.style.right = 'auto';
                };
            };
        }

        escapeHtml(text) {
            if (!text) return '';
            return text
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#039;');
        }

        show() { this.panel.style.display = 'block'; }
        hide() { this.panel.style.display = 'none'; }
    }

    // グローバル登録
    window.PipelineMonitor = PipelineMonitor;

    // 自動初期化
    function initPipelineMonitor() {
        if (!window.multiCharManager) {
            setTimeout(initPipelineMonitor, 500);
            return;
        }
        window.pipelineMonitor = new PipelineMonitor();
        console.log('📊 パイプラインモニター初期化完了');
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => setTimeout(initPipelineMonitor, 3000));
    } else {
        setTimeout(initPipelineMonitor, 3000);
    }

    console.log('📦 Pipeline Monitor v1.0 ロード完了');
})();
