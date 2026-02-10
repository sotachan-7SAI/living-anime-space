/**
 * EmotionMemoryPanel v1.3
 * 
 * 🎛️ 感情・記憶管理システムのUIパネル
 * 
 * 表示内容:
 * - 感情メーター（リアルタイム表示・編集可能）
 * - トラウマ（過去の傷・欲求の元）
 * - 会話ログ（短期記憶）
 * - 長期記憶リスト
 * - 会話要約
 * - ユーザー情報
 * - ★NEW★ 沈黙検知→Grok Voice自動発話
 */

(function() {
    'use strict';
    
    console.log('🎛️ EmotionMemoryPanel v1.3 読み込み開始（沈黙検知UI追加）');
    
    class EmotionMemoryPanel {
        constructor() {
            this.panel = null;
            this.isMinimized = false;
            this.manager = null;
            this.isClosed = true;
            this.updateInterval = null;
            this.init();
        }
        
        init() {
            this.waitForManager();
        }
        
        waitForManager() {
            if (window.emotionMemoryManager) {
                this.manager = window.emotionMemoryManager;
                this.createPanel();
                this.setupCallbacks();
                console.log('🎛️ EmotionMemoryPanel v1.3 初期化完了');
            } else {
                setTimeout(() => this.waitForManager(), 100);
            }
        }
        
        createPanel() {
            const existing = document.getElementById('emotion-memory-panel');
            if (existing) existing.remove();
            
            this.panel = document.createElement('div');
            this.panel.id = 'emotion-memory-panel';
            this.panel.innerHTML = this.getPanelHTML();
            this.applyStyles();
            document.body.appendChild(this.panel);
            this.setupEventListeners();
            this.panel.style.display = 'none';
            this.startAutoUpdate();
        }
        
        getPanelHTML() {
            return `
                <div class="emm-header">
                    <span class="emm-title">🧠 感情・記憶マネージャー</span>
                    <div class="emm-header-buttons">
                        <button class="emm-btn emm-minimize-btn" title="最小化">−</button>
                        <button class="emm-btn emm-close-btn" title="閉じる">×</button>
                    </div>
                </div>
                
                <div class="emm-content">
                    <div class="emm-tabs">
                        <button class="emm-tab active" data-tab="emotions">感情</button>
                        <button class="emm-tab" data-tab="trauma">💔トラウマ</button>
                        <button class="emm-tab" data-tab="memory">記憶</button>
                        <button class="emm-tab" data-tab="summary">要約</button>
                        <button class="emm-tab" data-tab="settings">設定</button>
                    </div>
                    
                    <!-- 感情タブ -->
                    <div class="emm-tab-content active" id="emm-tab-emotions">
                        <!-- ★ 沈黙検知UI (v1.3) ★ -->
                        <div class="emm-section emm-silence-section">
                            <div class="emm-section-title">🔇 沈黙検知→自動発話</div>
                            <div style="display:flex; align-items:center; gap:10px; margin-bottom:10px;">
                                <button id="emm-silence-toggle" class="emm-silence-toggle-btn off">🔇 OFF</button>
                                <span id="emm-silence-status" style="font-size:11px; color:#a0a0a0;">Grok Voiceが沈黙時に話しかけます</span>
                            </div>
                            <div style="display:flex; align-items:center; gap:10px;">
                                <span style="font-size:12px; min-width:80px;">沈黙時間:</span>
                                <input type="range" id="emm-silence-slider" min="1" max="30" value="10" style="flex:1; accent-color:#7c3aed;" />
                                <span id="emm-silence-value" style="font-size:14px; font-weight:bold; color:#a855f7; min-width:50px;">10秒</span>
                            </div>
                            <div id="emm-silence-trigger-count" style="font-size:10px; color:#808080; margin-top:6px; text-align:right;">トリガー発動: 0回</div>
                        </div>
                        
                        <div class="emm-section">
                            <div class="emm-section-title">😊 感情メーター</div>
                            <div id="emm-emotion-meters"></div>
                        </div>
                        <div class="emm-section">
                            <div class="emm-section-title">🎭 主要な感情</div>
                            <div id="emm-dominant-emotion" class="emm-dominant"></div>
                        </div>
                        <div class="emm-actions">
                            <button class="emm-action-btn" id="emm-decay-btn">感情リセット（中間値）</button>
                        </div>
                    </div>
                    
                    <!-- トラウマタブ -->
                    <div class="emm-tab-content" id="emm-tab-trauma">
                        <div class="emm-section">
                            <div class="emm-section-title">💔 過去の傷・トラウマ</div>
                            <div style="font-size:11px; color:#a0a0a0; margin-bottom:10px;">
                                キャラクターの行動原理や欲求の根源となる過去の経験を設定します
                            </div>
                            <div id="emm-trauma-list" class="emm-trauma-list"></div>
                            <button class="emm-action-btn" id="emm-add-trauma-btn" style="margin-top:10px; width:100%;">➕ 新しいトラウマを追加</button>
                        </div>
                        <div class="emm-section">
                            <div class="emm-section-title">📊 トラウマの影響</div>
                            <div id="emm-trauma-summary" class="emm-trauma-summary"></div>
                        </div>
                    </div>
                    
                    <!-- 記憶タブ -->
                    <div class="emm-tab-content" id="emm-tab-memory">
                        <div class="emm-section">
                            <div class="emm-section-title">💭 短期記憶（直近${this.manager?.maxShortTermMemory || 20}件）</div>
                            <div id="emm-short-term-memory" class="emm-memory-list"></div>
                            <button class="emm-action-btn emm-warning-btn" id="emm-clear-short-memory-btn" style="margin-top:8px; width:100%;">🗑️ 短期記憶をクリア</button>
                        </div>
                        <div class="emm-section">
                            <div class="emm-section-title">📚 長期記憶（重要な会話）</div>
                            <div id="emm-long-term-memory" class="emm-memory-list"></div>
                            <button class="emm-action-btn emm-warning-btn" id="emm-clear-long-memory-btn" style="margin-top:8px; width:100%;">🗑️ 長期記憶をクリア</button>
                        </div>
                        <div class="emm-actions" style="margin-top:12px;">
                            <button class="emm-action-btn emm-danger-btn" id="emm-clear-all-memory-btn" style="width:100%;">⚠️ 全ての記憶をクリア</button>
                        </div>
                    </div>
                    
                    <!-- 要約タブ -->
                    <div class="emm-tab-content" id="emm-tab-summary">
                        <div class="emm-section">
                            <div class="emm-section-title">📝 会話の要約</div>
                            <div id="emm-summary-text" class="emm-summary-box"></div>
                            <div style="display:flex; gap:8px; margin-top:8px;">
                                <button class="emm-action-btn" id="emm-update-summary-btn">要約を更新</button>
                                <button class="emm-action-btn emm-warning-btn" id="emm-clear-summary-btn">要約をクリア</button>
                            </div>
                        </div>
                        <div class="emm-section">
                            <div class="emm-section-title">👤 ユーザー情報</div>
                            <div id="emm-user-profile" class="emm-user-box"></div>
                            <button class="emm-action-btn emm-warning-btn" id="emm-clear-user-btn" style="margin-top:8px;">ユーザー情報をクリア</button>
                        </div>
                    </div>
                    
                    <!-- 設定タブ -->
                    <div class="emm-tab-content" id="emm-tab-settings">
                        <div class="emm-section">
                            <div class="emm-section-title">🔑 API設定</div>
                            <div class="emm-form-group">
                                <label>分析用APIキー（OpenAI）</label>
                                <input type="password" id="emm-api-key" placeholder="sk-..." />
                                <button class="emm-action-btn" id="emm-save-api-btn">保存</button>
                            </div>
                        </div>
                        <div class="emm-section">
                            <div class="emm-section-title">⚙️ オプション</div>
                            <div class="emm-form-group">
                                <label><input type="checkbox" id="emm-auto-analyze" /> 自動感情分析（発話ごと）</label>
                            </div>
                            <div class="emm-form-group">
                                <label><input type="checkbox" id="emm-auto-summary" /> 自動要約更新</label>
                            </div>
                        </div>
                        <div class="emm-section">
                            <div class="emm-section-title">⚠️ データ管理</div>
                            <button class="emm-action-btn emm-danger-btn" id="emm-reset-btn" style="width:100%;">🔄 全データを完全リセット</button>
                            <p style="font-size:10px; color:#888; margin-top:8px;">※感情・記憶・トラウマ・ユーザー情報など全てを初期化します</p>
                        </div>
                        <div class="emm-section">
                            <div class="emm-section-title">📊 統計</div>
                            <div id="emm-stats" class="emm-stats-box"></div>
                        </div>
                    </div>
                </div>
            `;
        }
        
        applyStyles() {
            const style = document.createElement('style');
            style.id = 'emotion-memory-panel-styles';
            style.textContent = `
                #emotion-memory-panel {
                    position: fixed;
                    top: 80px;
                    right: 20px;
                    width: 380px;
                    max-height: 80vh;
                    background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
                    border: 2px solid #7c3aed;
                    border-radius: 16px;
                    box-shadow: 0 10px 40px rgba(124, 58, 237, 0.3);
                    z-index: 100000;
                    font-family: 'Segoe UI', system-ui, sans-serif;
                    color: #e0e0e0;
                    overflow: hidden;
                }
                #emotion-memory-panel.minimized .emm-content { display: none; }
                #emotion-memory-panel.minimized { width: auto; max-height: none; }
                .emm-header {
                    display: flex; justify-content: space-between; align-items: center;
                    padding: 12px 16px;
                    background: linear-gradient(90deg, #7c3aed 0%, #a855f7 100%);
                    cursor: move;
                }
                .emm-title { font-size: 14px; font-weight: bold; color: white; }
                .emm-header-buttons { display: flex; gap: 8px; }
                .emm-btn {
                    width: 24px; height: 24px; border: none; border-radius: 6px;
                    background: rgba(255,255,255,0.2); color: white; cursor: pointer;
                    font-size: 14px; display: flex; align-items: center; justify-content: center;
                }
                .emm-btn:hover { background: rgba(255,255,255,0.3); }
                .emm-content { padding: 12px; max-height: calc(80vh - 60px); overflow-y: auto; }
                .emm-tabs {
                    display: flex; gap: 4px; margin-bottom: 12px;
                    background: rgba(0,0,0,0.2); padding: 4px; border-radius: 8px;
                }
                .emm-tab {
                    flex: 1; padding: 8px 2px; border: none; border-radius: 6px;
                    background: transparent; color: #a0a0a0; cursor: pointer;
                    font-size: 11px; transition: all 0.2s; white-space: nowrap;
                }
                .emm-tab:hover { background: rgba(124, 58, 237, 0.3); color: white; }
                .emm-tab.active { background: #7c3aed; color: white; }
                .emm-tab-content { display: none; }
                .emm-tab-content.active { display: block; }
                .emm-section { margin-bottom: 16px; padding: 12px; background: rgba(0,0,0,0.2); border-radius: 10px; }
                .emm-section-title { font-size: 13px; font-weight: bold; color: #a855f7; margin-bottom: 10px; }
                .emm-emotion-row { display: flex; align-items: center; margin-bottom: 8px; gap: 8px; }
                .emm-emotion-label { width: 80px; font-size: 12px; display: flex; align-items: center; gap: 4px; }
                .emm-emotion-bar-container { flex: 1; height: 20px; background: rgba(0,0,0,0.3); border-radius: 10px; overflow: hidden; }
                .emm-emotion-bar { height: 100%; border-radius: 10px; transition: width 0.3s ease; }
                .emm-emotion-input { width: 50px; padding: 4px; border: 1px solid #444; border-radius: 4px; background: rgba(0,0,0,0.3); color: white; text-align: center; font-size: 12px; }
                .emm-dominant { text-align: center; padding: 16px; background: rgba(124, 58, 237, 0.2); border-radius: 10px; }
                .emm-dominant-emoji { font-size: 48px; display: block; margin-bottom: 8px; }
                .emm-dominant-text { font-size: 18px; font-weight: bold; }
                .emm-memory-list { max-height: 200px; overflow-y: auto; }
                .emm-memory-item { padding: 8px; margin-bottom: 6px; background: rgba(0,0,0,0.2); border-radius: 6px; font-size: 11px; border-left: 3px solid #7c3aed; }
                .emm-memory-item.user { border-left-color: #22c55e; }
                .emm-memory-item.assistant { border-left-color: #3b82f6; }
                .emm-memory-role { font-weight: bold; margin-bottom: 4px; }
                .emm-memory-text { color: #c0c0c0; line-height: 1.4; }
                .emm-memory-time { font-size: 10px; color: #808080; margin-top: 4px; }
                .emm-summary-box, .emm-user-box, .emm-stats-box { padding: 12px; background: rgba(0,0,0,0.2); border-radius: 8px; font-size: 12px; line-height: 1.6; min-height: 60px; }
                .emm-form-group { margin-bottom: 12px; }
                .emm-form-group label { display: block; font-size: 12px; margin-bottom: 6px; color: #a0a0a0; }
                .emm-form-group input[type="password"], .emm-form-group input[type="text"] { width: 100%; padding: 8px; border: 1px solid #444; border-radius: 6px; background: rgba(0,0,0,0.3); color: white; font-size: 12px; margin-bottom: 8px; }
                .emm-form-group input[type="checkbox"] { margin-right: 8px; }
                .emm-actions { margin-top: 12px; }
                .emm-action-btn { padding: 8px 16px; border: none; border-radius: 6px; background: #7c3aed; color: white; cursor: pointer; font-size: 12px; transition: all 0.2s; }
                .emm-action-btn:hover { background: #9333ea; }
                .emm-warning-btn { background: #d97706; }
                .emm-warning-btn:hover { background: #f59e0b; }
                .emm-danger-btn { background: #dc2626; }
                .emm-danger-btn:hover { background: #ef4444; }
                .emm-content::-webkit-scrollbar, .emm-memory-list::-webkit-scrollbar { width: 6px; }
                .emm-content::-webkit-scrollbar-track, .emm-memory-list::-webkit-scrollbar-track { background: rgba(0,0,0,0.2); }
                .emm-content::-webkit-scrollbar-thumb, .emm-memory-list::-webkit-scrollbar-thumb { background: #7c3aed; border-radius: 3px; }
                
                /* トラウマ関連 */
                .emm-trauma-list { max-height: 300px; overflow-y: auto; }
                .emm-trauma-item { padding: 12px; margin-bottom: 10px; background: rgba(139, 0, 0, 0.2); border: 1px solid rgba(220, 38, 38, 0.3); border-radius: 8px; }
                .emm-trauma-item.inactive { opacity: 0.5; background: rgba(0,0,0,0.2); border-color: rgba(100,100,100,0.3); }
                .emm-trauma-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
                .emm-trauma-title { font-size: 13px; font-weight: bold; color: #f87171; }
                .emm-trauma-intensity { font-size: 11px; color: #fca5a5; background: rgba(220, 38, 38, 0.3); padding: 2px 8px; border-radius: 10px; }
                .emm-trauma-desc { font-size: 11px; color: #d0d0d0; margin-bottom: 8px; line-height: 1.4; }
                .emm-trauma-tags { display: flex; flex-wrap: wrap; gap: 4px; margin-bottom: 8px; }
                .emm-trauma-tag { font-size: 10px; padding: 2px 6px; border-radius: 4px; background: rgba(124, 58, 237, 0.3); color: #c4b5fd; }
                .emm-trauma-tag.desire { background: rgba(34, 197, 94, 0.3); color: #86efac; }
                .emm-trauma-tag.avoid { background: rgba(239, 68, 68, 0.3); color: #fca5a5; }
                .emm-trauma-tag.trigger { background: rgba(234, 179, 8, 0.3); color: #fde047; }
                .emm-trauma-actions { display: flex; gap: 6px; margin-top: 8px; }
                .emm-trauma-btn { padding: 4px 8px; font-size: 10px; border: none; border-radius: 4px; cursor: pointer; }
                .emm-trauma-btn.edit { background: rgba(59, 130, 246, 0.5); color: white; }
                .emm-trauma-btn.toggle { background: rgba(234, 179, 8, 0.5); color: white; }
                .emm-trauma-btn.delete { background: rgba(220, 38, 38, 0.5); color: white; }
                .emm-trauma-btn:hover { opacity: 0.8; }
                .emm-trauma-summary { font-size: 12px; line-height: 1.6; color: #d0d0d0; }
                
                /* モーダル */
                .emm-modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.7); z-index: 100001; display: flex; align-items: center; justify-content: center; }
                .emm-modal { background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); border: 2px solid #7c3aed; border-radius: 16px; padding: 20px; width: 400px; max-height: 80vh; overflow-y: auto; }
                .emm-modal-title { font-size: 16px; font-weight: bold; color: #a855f7; margin-bottom: 16px; }
                .emm-modal-field { margin-bottom: 12px; }
                .emm-modal-field label { display: block; font-size: 12px; color: #a0a0a0; margin-bottom: 4px; }
                .emm-modal-field input, .emm-modal-field textarea { width: 100%; padding: 8px; border: 1px solid #444; border-radius: 6px; background: rgba(0,0,0,0.3); color: white; font-size: 12px; box-sizing: border-box; }
                .emm-modal-field textarea { min-height: 60px; resize: vertical; }
                .emm-modal-buttons { display: flex; justify-content: flex-end; gap: 10px; margin-top: 16px; }
                .emm-modal-btn { padding: 8px 16px; border: none; border-radius: 6px; cursor: pointer; font-size: 12px; }
                .emm-modal-btn.cancel { background: rgba(100,100,100,0.5); color: white; }
                .emm-modal-btn.save { background: #7c3aed; color: white; }
                
                /* 沈黙検知UI (v1.3) */
                .emm-silence-section { border: 1px solid rgba(34, 197, 94, 0.3); }
                .emm-silence-toggle-btn {
                    padding: 8px 16px;
                    border: none;
                    border-radius: 6px;
                    font-size: 12px;
                    font-weight: bold;
                    cursor: pointer;
                    transition: all 0.2s;
                }
                .emm-silence-toggle-btn.off {
                    background: rgba(100,100,100,0.5);
                    color: #ccc;
                }
                .emm-silence-toggle-btn.on {
                    background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%);
                    color: white;
                }
                @keyframes emm-pulse {
                    0% { transform: scale(1); }
                    50% { transform: scale(1.1); box-shadow: 0 0 20px rgba(34, 197, 94, 0.6); }
                    100% { transform: scale(1); }
                }
            `;
            const existingStyle = document.getElementById('emotion-memory-panel-styles');
            if (existingStyle) existingStyle.remove();
            document.head.appendChild(style);
        }
        
        setupEventListeners() {
            this.panel.querySelector('.emm-close-btn').addEventListener('click', () => this.hide());
            this.panel.querySelector('.emm-minimize-btn').addEventListener('click', () => this.toggleMinimize());
            
            this.panel.querySelectorAll('.emm-tab').forEach(tab => {
                tab.addEventListener('click', () => this.switchTab(tab.dataset.tab));
            });
            
            this.panel.querySelector('#emm-decay-btn').addEventListener('click', () => {
                if (this.manager) {
                    this.manager.decayEmotions(1.0);
                    this.updateEmotionMeters();
                }
            });
            
            this.panel.querySelector('#emm-update-summary-btn').addEventListener('click', async () => {
                if (this.manager) {
                    await this.manager.generateSummary();
                    this.updateSummary();
                }
            });
            
            this.panel.querySelector('#emm-save-api-btn').addEventListener('click', () => {
                const key = this.panel.querySelector('#emm-api-key').value;
                if (this.manager && key) {
                    this.manager.apiKey = key;
                    localStorage.setItem('emm_api_key', key);
                    alert('APIキーを保存しました');
                }
            });
            
            this.panel.querySelector('#emm-reset-btn').addEventListener('click', () => {
                if (confirm('全てのデータをリセットしますか？\n（感情・記憶・トラウマ・ユーザー情報全て）\nこの操作は取り消せません。')) {
                    if (this.manager) {
                        this.manager.reset();
                        this.updateAll();
                        alert('全データをリセットしました');
                    }
                }
            });
            
            // 記憶クリアボタン
            this.panel.querySelector('#emm-clear-short-memory-btn').addEventListener('click', () => {
                if (confirm('短期記憶をクリアしますか？')) {
                    if (this.manager) {
                        this.manager.shortTermMemory = [];
                        this.manager.saveToStorage();
                        this.updateMemoryLists();
                        console.log('🧠 短期記憶をクリアしました');
                    }
                }
            });
            
            this.panel.querySelector('#emm-clear-long-memory-btn').addEventListener('click', () => {
                if (confirm('長期記憶をクリアしますか？')) {
                    if (this.manager) {
                        this.manager.longTermMemory = [];
                        this.manager.saveToStorage();
                        this.updateMemoryLists();
                        console.log('🧠 長期記憶をクリアしました');
                    }
                }
            });
            
            this.panel.querySelector('#emm-clear-all-memory-btn').addEventListener('click', () => {
                if (confirm('全ての記憶（短期・長期）をクリアしますか？\nこの操作は取り消せません。')) {
                    if (this.manager) {
                        this.manager.shortTermMemory = [];
                        this.manager.longTermMemory = [];
                        this.manager.saveToStorage();
                        this.updateMemoryLists();
                        console.log('🧠 全ての記憶をクリアしました');
                        alert('全ての記憶をクリアしました');
                    }
                }
            });
            
            this.panel.querySelector('#emm-clear-summary-btn').addEventListener('click', () => {
                if (confirm('会話要約をクリアしますか？')) {
                    if (this.manager) {
                        this.manager.conversationSummary = '';
                        this.manager.saveToStorage();
                        this.updateSummary();
                        console.log('🧠 会話要約をクリアしました');
                    }
                }
            });
            
            this.panel.querySelector('#emm-clear-user-btn').addEventListener('click', () => {
                if (confirm('ユーザー情報をクリアしますか？')) {
                    if (this.manager) {
                        this.manager.userProfile = { name: null, interests: [], preferences: [], importantFacts: [] };
                        this.manager.saveToStorage();
                        this.updateUserProfile();
                        console.log('🧠 ユーザー情報をクリアしました');
                    }
                }
            });
            
            this.panel.querySelector('#emm-add-trauma-btn').addEventListener('click', () => this.openTraumaEditor(null));
            
            // ★ 沈黙検知UIのイベントリスナー (v1.3) ★
            this.setupSilenceDetectionUI();
            
            this.setupDraggable();
            
            const savedKey = localStorage.getItem('emm_api_key');
            if (savedKey) {
                this.panel.querySelector('#emm-api-key').value = savedKey;
                if (this.manager) this.manager.apiKey = savedKey;
            }
        }
        
        setupDraggable() {
            const header = this.panel.querySelector('.emm-header');
            let isDragging = false;
            let startX, startY, startLeft, startTop;
            
            header.addEventListener('mousedown', (e) => {
                if (e.target.tagName === 'BUTTON') return;
                isDragging = true;
                startX = e.clientX;
                startY = e.clientY;
                const rect = this.panel.getBoundingClientRect();
                startLeft = rect.left;
                startTop = rect.top;
                e.preventDefault();
            });
            
            document.addEventListener('mousemove', (e) => {
                if (!isDragging) return;
                this.panel.style.left = `${startLeft + e.clientX - startX}px`;
                this.panel.style.top = `${startTop + e.clientY - startY}px`;
                this.panel.style.right = 'auto';
            });
            
            document.addEventListener('mouseup', () => { isDragging = false; });
        }
        
        setupCallbacks() {
            if (!this.manager) return;
            this.manager.onEmotionChange = () => { this.updateEmotionMeters(); this.updateDominantEmotion(); };
            this.manager.onMemoryUpdate = () => { this.updateMemoryLists(); };
            this.manager.onSummaryUpdate = () => { this.updateSummary(); };
            this.manager.onTraumaUpdate = () => { this.updateTraumaList(); this.updateTraumaSummary(); };
        }
        
        switchTab(tabName) {
            this.panel.querySelectorAll('.emm-tab').forEach(tab => {
                tab.classList.toggle('active', tab.dataset.tab === tabName);
            });
            this.panel.querySelectorAll('.emm-tab-content').forEach(content => {
                content.classList.toggle('active', content.id === `emm-tab-${tabName}`);
            });
            
            if (tabName === 'emotions') { this.updateEmotionMeters(); this.updateDominantEmotion(); }
            else if (tabName === 'trauma') { this.updateTraumaList(); this.updateTraumaSummary(); }
            else if (tabName === 'memory') { this.updateMemoryLists(); }
            else if (tabName === 'summary') { this.updateSummary(); this.updateUserProfile(); }
            else if (tabName === 'settings') { this.updateStats(); }
        }
        
        // トラウマ関連
        updateTraumaList() {
            if (!this.manager) return;
            const container = this.panel.querySelector('#emm-trauma-list');
            if (!container) return;
            
            const traumas = this.manager.traumas || [];
            if (traumas.length === 0) {
                container.innerHTML = '<div style="color: #808080; text-align: center; padding: 20px;">トラウマはまだ設定されていません</div>';
                return;
            }
            
            container.innerHTML = traumas.map(t => this.renderTraumaItem(t)).join('');
            
            container.querySelectorAll('.emm-trauma-btn.edit').forEach(btn => {
                btn.addEventListener('click', () => {
                    const trauma = this.manager.traumas.find(t => t.id === parseInt(btn.dataset.id));
                    if (trauma) this.openTraumaEditor(trauma);
                });
            });
            container.querySelectorAll('.emm-trauma-btn.toggle').forEach(btn => {
                btn.addEventListener('click', () => this.manager.toggleTrauma(parseInt(btn.dataset.id)));
            });
            container.querySelectorAll('.emm-trauma-btn.delete').forEach(btn => {
                btn.addEventListener('click', () => {
                    if (confirm('このトラウマを削除しますか？')) this.manager.removeTrauma(parseInt(btn.dataset.id));
                });
            });
        }
        
        renderTraumaItem(trauma) {
            const desires = (trauma.desires || []).map(d => `<span class="emm-trauma-tag desire">欲: ${d}</span>`).join('');
            const avoidances = (trauma.avoidances || []).map(a => `<span class="emm-trauma-tag avoid">避: ${a}</span>`).join('');
            const triggers = (trauma.triggerWords || []).slice(0, 3).map(t => `<span class="emm-trauma-tag trigger">🎯 ${t}</span>`).join('');
            
            return `
                <div class="emm-trauma-item ${trauma.isActive ? '' : 'inactive'}">
                    <div class="emm-trauma-header">
                        <span class="emm-trauma-title">💔 ${trauma.title}</span>
                        <span class="emm-trauma-intensity">強度 ${trauma.intensity}/10</span>
                    </div>
                    <div class="emm-trauma-desc">${trauma.description || '（説明なし）'}</div>
                    <div class="emm-trauma-tags">${desires}${avoidances}${triggers}</div>
                    <div class="emm-trauma-actions">
                        <button class="emm-trauma-btn edit" data-id="${trauma.id}">✎ 編集</button>
                        <button class="emm-trauma-btn toggle" data-id="${trauma.id}">${trauma.isActive ? '● 無効化' : '○ 有効化'}</button>
                        <button class="emm-trauma-btn delete" data-id="${trauma.id}">✕ 削除</button>
                    </div>
                </div>
            `;
        }
        
        updateTraumaSummary() {
            if (!this.manager) return;
            const container = this.panel.querySelector('#emm-trauma-summary');
            if (!container) return;
            
            const activeTraumas = this.manager.getActiveTraumas ? this.manager.getActiveTraumas() : [];
            const desires = this.manager.getAllDesires ? this.manager.getAllDesires() : [];
            const avoidances = this.manager.getAllAvoidances ? this.manager.getAllAvoidances() : [];
            
            let html = '';
            if (activeTraumas.length === 0) {
                html = '<div style="color: #808080;">アクティブなトラウマはありません</div>';
            } else {
                html += `<div>💔 アクティブなトラウマ: <strong>${activeTraumas.length}</strong>件</div>`;
                if (desires.length > 0) html += `<div style="margin-top:8px;">💚 心の欲求:</div><div style="margin-left:12px; color:#86efac;">${desires.join('、')}</div>`;
                if (avoidances.length > 0) html += `<div style="margin-top:8px;">🚧 避けたいこと:</div><div style="margin-left:12px; color:#fca5a5;">${avoidances.join('、')}</div>`;
            }
            container.innerHTML = html;
        }
        
        openTraumaEditor(trauma) {
            const isEdit = !!trauma;
            const overlay = document.createElement('div');
            overlay.className = 'emm-modal-overlay';
            overlay.innerHTML = `
                <div class="emm-modal">
                    <div class="emm-modal-title">${isEdit ? '💔 トラウマを編集' : '💔 新しいトラウマを追加'}</div>
                    <div class="emm-modal-field">
                        <label>タイトル *</label>
                        <input type="text" id="trauma-title" value="${isEdit ? trauma.title : ''}" placeholder="例: 幼少期の孤独" />
                    </div>
                    <div class="emm-modal-field">
                        <label>説明</label>
                        <textarea id="trauma-desc" placeholder="トラウマの詳細...">${isEdit ? (trauma.description || '') : ''}</textarea>
                    </div>
                    <div class="emm-modal-field">
                        <label>強度 (1-10): <span id="trauma-intensity-value">${isEdit ? trauma.intensity : 5}</span></label>
                        <input type="range" id="trauma-intensity" min="1" max="10" value="${isEdit ? trauma.intensity : 5}" style="width:100%;" />
                    </div>
                    <div class="emm-modal-field">
                        <label>このトラウマから生まれた欲求（カンマ区切り）</label>
                        <input type="text" id="trauma-desires" value="${isEdit ? (trauma.desires || []).join(', ') : ''}" placeholder="例: 認められたい, 愛されたい" />
                    </div>
                    <div class="emm-modal-field">
                        <label>避けたいこと（カンマ区切り）</label>
                        <input type="text" id="trauma-avoidances" value="${isEdit ? (trauma.avoidances || []).join(', ') : ''}" placeholder="例: 孤独, 批判, 拒絶" />
                    </div>
                    <div class="emm-modal-field">
                        <label>トリガーワード（カンマ区切り）</label>
                        <input type="text" id="trauma-triggers" value="${isEdit ? (trauma.triggerWords || []).join(', ') : ''}" placeholder="例: 一人, 置いてかないで, 嫌い" />
                    </div>
                    <div class="emm-modal-field">
                        <label>影響する感情（トリガー時の変化量）</label>
                        <div style="display:grid; grid-template-columns: 1fr 1fr; gap:8px;">
                            <div><label style="font-size:10px;">哀しみ</label><input type="number" id="affect-sadness" value="${isEdit ? (trauma.affectedEmotions?.sadness || 0) : 0}" min="-5" max="5" style="width:100%;" /></div>
                            <div><label style="font-size:10px;">恐れ</label><input type="number" id="affect-fear" value="${isEdit ? (trauma.affectedEmotions?.fear || 0) : 0}" min="-5" max="5" style="width:100%;" /></div>
                            <div><label style="font-size:10px;">怒り</label><input type="number" id="affect-anger" value="${isEdit ? (trauma.affectedEmotions?.anger || 0) : 0}" min="-5" max="5" style="width:100%;" /></div>
                            <div><label style="font-size:10px;">失望</label><input type="number" id="affect-disappointment" value="${isEdit ? (trauma.affectedEmotions?.disappointment || 0) : 0}" min="-5" max="5" style="width:100%;" /></div>
                        </div>
                    </div>
                    <div class="emm-modal-buttons">
                        <button class="emm-modal-btn cancel">キャンセル</button>
                        <button class="emm-modal-btn save">保存</button>
                    </div>
                </div>
            `;
            
            document.body.appendChild(overlay);
            
            const slider = overlay.querySelector('#trauma-intensity');
            const valueDisplay = overlay.querySelector('#trauma-intensity-value');
            slider.addEventListener('input', () => { valueDisplay.textContent = slider.value; });
            
            overlay.querySelector('.emm-modal-btn.cancel').addEventListener('click', () => overlay.remove());
            overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
            
            overlay.querySelector('.emm-modal-btn.save').addEventListener('click', () => {
                const title = overlay.querySelector('#trauma-title').value.trim();
                if (!title) { alert('タイトルを入力してください'); return; }
                
                const data = {
                    title,
                    description: overlay.querySelector('#trauma-desc').value.trim(),
                    intensity: parseInt(slider.value),
                    desires: overlay.querySelector('#trauma-desires').value.split(',').map(s => s.trim()).filter(s => s),
                    avoidances: overlay.querySelector('#trauma-avoidances').value.split(',').map(s => s.trim()).filter(s => s),
                    triggerWords: overlay.querySelector('#trauma-triggers').value.split(',').map(s => s.trim()).filter(s => s),
                    affectedEmotions: {
                        sadness: parseInt(overlay.querySelector('#affect-sadness').value) || 0,
                        fear: parseInt(overlay.querySelector('#affect-fear').value) || 0,
                        anger: parseInt(overlay.querySelector('#affect-anger').value) || 0,
                        disappointment: parseInt(overlay.querySelector('#affect-disappointment').value) || 0
                    }
                };
                
                if (isEdit) this.manager.updateTrauma(trauma.id, data);
                else this.manager.addTrauma(data);
                overlay.remove();
            });
        }
        
        // その他のUI更新
        updateEmotionMeters() {
            if (!this.manager) return;
            const container = this.panel.querySelector('#emm-emotion-meters');
            if (!container) return;
            
            const emotions = this.manager.emotions;
            const labels = this.manager.emotionLabels;
            const emojis = this.manager.emotionEmojis;
            const colors = { joy: '#fbbf24', anger: '#ef4444', sadness: '#3b82f6', fun: '#f97316', excitement: '#ec4899', calm: '#22c55e', tired: '#6b7280', disappointment: '#8b5cf6', fear: '#06b6d4', affection: '#f472b6', curiosity: '#a78bfa' };
            
            let html = '';
            for (const [emotion, value] of Object.entries(emotions)) {
                html += `
                    <div class="emm-emotion-row">
                        <span class="emm-emotion-label">${emojis[emotion]} ${labels[emotion]}</span>
                        <div class="emm-emotion-bar-container">
                            <div class="emm-emotion-bar" style="width: ${value * 10}%; background: ${colors[emotion] || '#7c3aed'};"></div>
                        </div>
                        <input type="number" class="emm-emotion-input" data-emotion="${emotion}" value="${value.toFixed(1)}" min="0" max="10" step="0.5" />
                    </div>
                `;
            }
            container.innerHTML = html;
            
            container.querySelectorAll('.emm-emotion-input').forEach(input => {
                input.addEventListener('change', (e) => {
                    const v = parseFloat(e.target.value);
                    if (this.manager && !isNaN(v)) this.manager.setEmotion(e.target.dataset.emotion, v);
                });
            });
        }
        
        updateDominantEmotion() {
            if (!this.manager) return;
            const container = this.panel.querySelector('#emm-dominant-emotion');
            if (!container) return;
            const d = this.manager.getDominantEmotion();
            container.innerHTML = `<span class="emm-dominant-emoji">${this.manager.emotionEmojis[d.emotion]}</span><span class="emm-dominant-text">${this.manager.emotionLabels[d.emotion]} (${d.value.toFixed(1)}/10)</span>`;
        }
        
        updateMemoryLists() {
            if (!this.manager) return;
            const shortContainer = this.panel.querySelector('#emm-short-term-memory');
            const longContainer = this.panel.querySelector('#emm-long-term-memory');
            
            if (shortContainer) {
                const m = (this.manager.shortTermMemory || []).slice().reverse();
                shortContainer.innerHTML = m.length === 0 ? '<div style="color:#808080;text-align:center;">まだ会話がありません</div>' : m.map(x => this.renderMemoryItem(x)).join('');
            }
            if (longContainer) {
                const m = (this.manager.longTermMemory || []).slice().reverse();
                longContainer.innerHTML = m.length === 0 ? '<div style="color:#808080;text-align:center;">重要な記憶はまだありません</div>' : m.map(x => this.renderMemoryItem(x)).join('');
            }
        }
        
        renderMemoryItem(m) {
            const role = m.role === 'user' ? '👤 ユーザー' : '🤖 AI';
            const time = new Date(m.timestamp).toLocaleTimeString('ja-JP');
            const text = m.text.length > 100 ? m.text.substring(0, 100) + '...' : m.text;
            return `<div class="emm-memory-item ${m.role}"><div class="emm-memory-role">${role}</div><div class="emm-memory-text">${text}</div><div class="emm-memory-time">${time}</div></div>`;
        }
        
        updateSummary() {
            if (!this.manager) return;
            const c = this.panel.querySelector('#emm-summary-text');
            if (c) c.textContent = this.manager.conversationSummary || '要約はまだありません。';
        }
        
        updateUserProfile() {
            if (!this.manager) return;
            const c = this.panel.querySelector('#emm-user-profile');
            if (!c) return;
            const p = this.manager.userProfile;
            let html = '';
            if (p.name) html += `<div>👤 名前: ${p.name}</div>`;
            if (p.interests?.length > 0) html += `<div>💡 興味: ${p.interests.join(', ')}</div>`;
            if (p.importantFacts?.length > 0) { html += `<div>📌 重要情報:</div>`; p.importantFacts.forEach(f => html += `<div style="margin-left:12px;">・${f}</div>`); }
            c.innerHTML = html || '<div style="color:#808080;">ユーザー情報はまだ学習していません</div>';
        }
        
        updateStats() {
            if (!this.manager) return;
            const c = this.panel.querySelector('#emm-stats');
            if (!c) return;
            const s = this.manager.getStats();
            c.innerHTML = `
                <div>💭 短期記憶: ${s.shortTermMemoryCount} 件</div>
                <div>📚 長期記憶: ${s.longTermMemoryCount} 件</div>
                <div>🎭 主要感情: ${this.manager.emotionLabels[s.dominantEmotion.emotion]} (${s.dominantEmotion.value.toFixed(1)})</div>
                <div>📝 要約: ${s.hasSummary ? 'あり' : 'なし'}</div>
                <div>👤 ユーザー名: ${s.userName || '不明'}</div>
                <div>💡 学習した興味: ${s.interestsCount} 件</div>
                <div>💔 トラウマ: ${s.traumaCount || 0} 件 (アクティブ: ${s.activeTraumaCount || 0})</div>
            `;
        }
        
        updateAll() {
            this.updateEmotionMeters();
            this.updateDominantEmotion();
            this.updateTraumaList();
            this.updateTraumaSummary();
            this.updateMemoryLists();
            this.updateSummary();
            this.updateUserProfile();
            this.updateStats();
        }
        
        startAutoUpdate() {
            this.updateInterval = setInterval(() => {
                if (!this.isClosed && !this.isMinimized) {
                    this.updateEmotionMeters();
                    this.updateDominantEmotion();
                }
            }, 5000);
        }
        
        show() { this.panel.style.display = 'block'; this.isClosed = false; this.updateAll(); this.updateSilenceUI(); }
        hide() { this.panel.style.display = 'none'; this.isClosed = true; }
        toggle() { this.isClosed ? this.show() : this.hide(); }
        toggleMinimize() {
            this.isMinimized = !this.isMinimized;
            this.panel.classList.toggle('minimized', this.isMinimized);
            this.panel.querySelector('.emm-minimize-btn').textContent = this.isMinimized ? '+' : '−';
        }
        
        // ========================================
        // 沈黙検知UI (v1.3)
        // ========================================
        
        setupSilenceDetectionUI() {
            const toggleBtn = this.panel.querySelector('#emm-silence-toggle');
            const slider = this.panel.querySelector('#emm-silence-slider');
            const valueDisplay = this.panel.querySelector('#emm-silence-value');
            const statusDisplay = this.panel.querySelector('#emm-silence-status');
            const triggerCountDisplay = this.panel.querySelector('#emm-silence-trigger-count');
            
            if (!toggleBtn || !slider || !this.manager) return;
            
            // ON/OFFトグル
            toggleBtn.addEventListener('click', () => {
                if (!this.manager.silenceDetection) {
                    console.warn('⚠️ silenceDetectionが未定義');
                    return;
                }
                
                if (this.manager.silenceDetection.enabled) {
                    this.manager.disableSilenceDetection();
                } else {
                    const timeout = parseInt(slider.value);
                    this.manager.enableSilenceDetection(timeout);
                }
                this.updateSilenceUI();
            });
            
            // スライダー変更
            slider.addEventListener('input', () => {
                const val = parseInt(slider.value);
                valueDisplay.textContent = `${val}秒`;
                
                if (this.manager.silenceDetection?.enabled) {
                    this.manager.setSilenceTimeout(val);
                }
            });
            
            // コールバック設定: トリガー発動時にUI更新
            if (this.manager) {
                this.manager.onSilenceDetected = (count) => {
                    this.updateSilenceUI();
                    // ビジュアルフィードバック
                    if (toggleBtn) {
                        toggleBtn.style.animation = 'emm-pulse 0.5s';
                        setTimeout(() => { toggleBtn.style.animation = ''; }, 500);
                    }
                };
            }
            
            // 初期状態を反映
            this.updateSilenceUI();
            
            console.log('🔇 沈黙検知UIセットアップ完了');
        }
        
        updateSilenceUI() {
            if (!this.manager || !this.manager.silenceDetection) return;
            
            const toggleBtn = this.panel.querySelector('#emm-silence-toggle');
            const slider = this.panel.querySelector('#emm-silence-slider');
            const valueDisplay = this.panel.querySelector('#emm-silence-value');
            const statusDisplay = this.panel.querySelector('#emm-silence-status');
            const triggerCountDisplay = this.panel.querySelector('#emm-silence-trigger-count');
            
            const sd = this.manager.silenceDetection;
            
            if (toggleBtn) {
                if (sd.enabled) {
                    toggleBtn.textContent = '🔊 ON';
                    toggleBtn.className = 'emm-silence-toggle-btn on';
                    toggleBtn.style.background = 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)';
                    toggleBtn.style.color = 'white';
                } else {
                    toggleBtn.textContent = '🔇 OFF';
                    toggleBtn.className = 'emm-silence-toggle-btn off';
                    toggleBtn.style.background = 'rgba(100,100,100,0.5)';
                    toggleBtn.style.color = '#ccc';
                }
            }
            
            if (slider) {
                slider.value = sd.timeout;
            }
            
            if (valueDisplay) {
                valueDisplay.textContent = `${sd.timeout}秒`;
            }
            
            if (statusDisplay) {
                if (sd.enabled) {
                    statusDisplay.textContent = `✅ ${sd.timeout}秒沈黙でGrok Voiceが話しかけます`;
                    statusDisplay.style.color = '#22c55e';
                } else {
                    statusDisplay.textContent = 'Grok Voiceが沈黙時に話しかけます';
                    statusDisplay.style.color = '#a0a0a0';
                }
            }
            
            if (triggerCountDisplay) {
                triggerCountDisplay.textContent = `トリガー発動: ${sd.triggerCount || 0}回`;
            }
        }
    }
    
    window.EmotionMemoryPanel = EmotionMemoryPanel;
    
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => { window.emotionMemoryPanel = new EmotionMemoryPanel(); });
    } else {
        window.emotionMemoryPanel = new EmotionMemoryPanel();
    }
    
    console.log('🎛️ EmotionMemoryPanel v1.3 グローバル登録完了');
})();
