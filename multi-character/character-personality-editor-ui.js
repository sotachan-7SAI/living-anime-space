// ========================================
// Character Personality Editor UI v1.7.2
// キャラクター個性設定エディターUI
// ========================================
// 
// 🔧 v1.7.2: デバッグログ追加
//    - 保存時にexcludedIdleMotionsの件数をログ出力
//    - 完了アラートにも除外件数を表示
//
// 🔧 v1.7.1: 待機モーション除外の保存・読み込み修正
//    - モーション設定テーブルでも直接カテゴリ変更可能
//    - ポップアップとテーブルが双方向連動
//    - 変更箇所は黄色ハイライト表示
//
// v1.4: カテゴリ変更機能追加
//    - ポップアップ内でモーションのカテゴリを変更可能
//    - happy_mild → happy_strong など自由に変更
//    - 変更はキャラクター別に保存
//
// v1.3: カテゴリモーションポップアップ追加
//    - 禁止モーションカテゴリタグをクリックでポップアップ表示
//    - カテゴリ内のモーションを個別にプレビュー・除外設定可能
//
// v1.2: ドラッグ移動機能追加
//
// v1.1: モーションプレビュー機能追加
// 
// 🎯 機能:
// - プリセット選択（元気おてんば/おしとやか/知的クール）
// - 表情強度スライダー
// - モーション設定の表形式編集
// - カテゴリ変更機能
// - JSON保存/読込
//
// ========================================

(function() {
    'use strict';

class CharacterPersonalityEditorUI {
    constructor() {
        this.modal = null;
        this.currentCharacterId = null;
        
        // モーダル作成
        this.createModal();
        
        // スタイル追加
        this.addStyles();
        
        console.log('🎭 CharacterPersonalityEditorUI 初期化完了');
    }
    
    addStyles() {
        if (document.getElementById('personality-editor-styles')) return;
        
        const style = document.createElement('style');
        style.id = 'personality-editor-styles';
        style.textContent = `
            #personality-editor-modal {
                display: none;
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0,0,0,0.7);
                z-index: 20000;
                overflow-y: auto;
            }
            
            .pe-modal-content {
                position: absolute;
                top: 30px;
                left: 50%;
                transform: translateX(-50%);
                width: 90%;
                max-width: 900px;
                background: linear-gradient(135deg, #1e1e3f 0%, #2a2a4e 100%);
                border-radius: 16px;
                box-shadow: 0 8px 32px rgba(0,0,0,0.5);
                font-family: 'Segoe UI', 'Yu Gothic', sans-serif;
                color: #e0e0e0;
            }
            
            .pe-header {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                padding: 16px 20px;
                border-radius: 16px 16px 0 0;
                display: flex;
                justify-content: space-between;
                align-items: center;
                cursor: move;
                user-select: none;
            }
            
            .pe-header:active {
                cursor: grabbing;
            }
            
            .pe-modal-content.dragging {
                transition: none;
                opacity: 0.9;
            }
            
            .pe-title {
                font-size: 18px;
                font-weight: bold;
                color: white;
            }
            
            .pe-close-btn {
                background: rgba(255,255,255,0.2);
                border: none;
                color: white;
                width: 32px;
                height: 32px;
                border-radius: 50%;
                cursor: pointer;
                font-size: 18px;
            }
            
            .pe-body {
                padding: 20px;
            }
            
            /* プリセット選択 */
            .pe-preset-section {
                margin-bottom: 20px;
            }
            
            .pe-section-title {
                font-size: 14px;
                font-weight: bold;
                color: #a0a0ff;
                margin-bottom: 12px;
                display: flex;
                align-items: center;
                gap: 8px;
            }
            
            .pe-preset-grid {
                display: grid;
                grid-template-columns: repeat(3, 1fr);
                gap: 12px;
            }
            
            .pe-preset-card {
                background: rgba(255,255,255,0.05);
                border: 2px solid transparent;
                border-radius: 12px;
                padding: 16px;
                cursor: pointer;
                transition: all 0.2s;
                text-align: center;
            }
            
            .pe-preset-card:hover {
                background: rgba(255,255,255,0.1);
                border-color: rgba(102,126,234,0.5);
            }
            
            .pe-preset-card.selected {
                background: rgba(102,126,234,0.2);
                border-color: #667eea;
            }
            
            .pe-preset-icon {
                font-size: 32px;
                margin-bottom: 8px;
            }
            
            .pe-preset-name {
                font-size: 14px;
                font-weight: bold;
                margin-bottom: 4px;
            }
            
            .pe-preset-desc {
                font-size: 11px;
                color: #888;
            }
            
            /* 表情設定 */
            .pe-expression-section {
                margin-bottom: 20px;
                background: rgba(255,165,0,0.1);
                border: 1px solid rgba(255,165,0,0.3);
                border-radius: 12px;
                padding: 16px;
            }
            
            .pe-slider-row {
                display: flex;
                align-items: center;
                gap: 12px;
                margin-bottom: 12px;
            }
            
            .pe-slider-label {
                min-width: 150px;
                font-size: 12px;
            }
            
            .pe-slider {
                flex: 1;
                -webkit-appearance: none;
                height: 8px;
                border-radius: 4px;
                background: rgba(255,255,255,0.1);
            }
            
            .pe-slider::-webkit-slider-thumb {
                -webkit-appearance: none;
                width: 20px;
                height: 20px;
                border-radius: 50%;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                cursor: pointer;
            }
            
            .pe-slider-value {
                min-width: 50px;
                text-align: right;
                font-size: 12px;
                color: #aaa;
            }
            
            /* モーション設定 */
            .pe-motion-section {
                margin-bottom: 20px;
            }
            
            .pe-motion-tabs {
                display: flex;
                gap: 8px;
                margin-bottom: 12px;
                flex-wrap: wrap;
            }
            
            .pe-motion-tab {
                padding: 8px 16px;
                background: rgba(255,255,255,0.05);
                border: none;
                border-radius: 8px;
                color: #aaa;
                cursor: pointer;
                font-size: 12px;
                transition: all 0.2s;
            }
            
            .pe-motion-tab:hover {
                background: rgba(255,255,255,0.1);
            }
            
            .pe-motion-tab.active {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
            }
            
            .pe-motion-table-container {
                max-height: 300px;
                overflow-y: auto;
                border-radius: 8px;
                background: rgba(0,0,0,0.2);
            }
            
            .pe-motion-table {
                width: 100%;
                border-collapse: collapse;
                font-size: 12px;
            }
            
            .pe-motion-table th {
                background: rgba(102,126,234,0.2);
                padding: 10px 8px;
                text-align: left;
                position: sticky;
                top: 0;
                z-index: 1;
            }
            
            .pe-motion-table td {
                padding: 8px;
                border-bottom: 1px solid rgba(255,255,255,0.05);
            }
            
            .pe-motion-table tr:hover {
                background: rgba(255,255,255,0.05);
            }
            
            .pe-motion-checkbox {
                width: 18px;
                height: 18px;
                accent-color: #4ade80;
            }
            
            .pe-motion-checkbox.excluded {
                accent-color: #ef4444;
            }
            
            .pe-motion-name {
                font-weight: 500;
            }
            
            .pe-motion-file {
                font-size: 10px;
                color: #666;
            }
            
            .pe-motion-category {
                font-size: 10px;
                padding: 2px 6px;
                border-radius: 4px;
                background: rgba(255,255,255,0.1);
            }
            
            .pe-motion-category.happy { background: rgba(74,222,128,0.2); color: #4ade80; }
            .pe-motion-category.happy_strong { background: rgba(251,191,36,0.2); color: #fbbf24; }
            .pe-motion-category.sad { background: rgba(96,165,250,0.2); color: #60a5fa; }
            .pe-motion-category.angry { background: rgba(248,113,113,0.2); color: #f87171; }
            .pe-motion-category.sexy { background: rgba(244,114,182,0.2); color: #f472b6; }
            .pe-motion-category.normal { background: rgba(156,163,175,0.2); color: #9ca3af; }
            
            .pe-probability-input {
                width: 60px;
                padding: 4px 8px;
                border: 1px solid #444;
                border-radius: 4px;
                background: rgba(0,0,0,0.3);
                color: #e0e0e0;
                font-size: 11px;
                text-align: center;
            }
            
            /* プレビューボタン */
            .pe-preview-btn {
                width: 32px;
                height: 32px;
                border: none;
                border-radius: 50%;
                background: linear-gradient(135deg, #4ade80 0%, #22c55e 100%);
                color: white;
                font-size: 14px;
                cursor: pointer;
                transition: all 0.2s;
                display: flex;
                align-items: center;
                justify-content: center;
            }
            
            .pe-preview-btn:hover {
                transform: scale(1.1);
                box-shadow: 0 0 12px rgba(74, 222, 128, 0.5);
            }
            
            .pe-preview-btn:active {
                transform: scale(0.95);
            }
            
            .pe-preview-btn.playing {
                background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
                animation: pulse 1s infinite;
            }
            
            @keyframes pulse {
                0%, 100% { box-shadow: 0 0 0 0 rgba(245, 158, 11, 0.4); }
                50% { box-shadow: 0 0 0 8px rgba(245, 158, 11, 0); }
            }
            
            /* フッター */
            .pe-footer {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 16px 20px;
                background: rgba(0,0,0,0.2);
                border-radius: 0 0 16px 16px;
            }
            
            .pe-footer-left {
                display: flex;
                gap: 8px;
            }
            
            .pe-footer-right {
                display: flex;
                gap: 8px;
            }
            
            .pe-btn {
                padding: 10px 20px;
                border: none;
                border-radius: 8px;
                cursor: pointer;
                font-size: 13px;
                font-weight: 500;
                transition: all 0.2s;
            }
            
            .pe-btn:hover {
                transform: translateY(-2px);
            }
            
            .pe-btn-primary {
                background: linear-gradient(135deg, #4ade80 0%, #22c55e 100%);
                color: white;
            }
            
            .pe-btn-secondary {
                background: rgba(255,255,255,0.1);
                color: #aaa;
            }
            
            .pe-btn-export {
                background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
                color: white;
            }
            
            .pe-btn-import {
                background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
                color: white;
            }
            
            .pe-btn-export-all {
                background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%);
                color: white;
            }
            
            .pe-btn-import-all {
                background: linear-gradient(135deg, #ec4899 0%, #db2777 100%);
                color: white;
            }
            
            /* 感情カテゴリ制限 */
            .pe-restriction-section {
                margin-bottom: 20px;
                background: rgba(239,68,68,0.1);
                border: 1px solid rgba(239,68,68,0.3);
                border-radius: 12px;
                padding: 16px;
            }
            
            .pe-restriction-grid {
                display: flex;
                flex-wrap: wrap;
                gap: 8px;
            }
            
            .pe-restriction-chip {
                padding: 6px 12px;
                background: rgba(255,255,255,0.05);
                border: 2px solid transparent;
                border-radius: 20px;
                cursor: pointer;
                font-size: 11px;
                transition: all 0.2s;
            }
            
            .pe-restriction-chip:hover {
                background: rgba(255,255,255,0.1);
            }
            
            .pe-restriction-chip.active {
                background: rgba(239,68,68,0.3);
                border-color: #ef4444;
                color: #f87171;
            }
            
            /* 🆕 v1.3: カテゴリモーションポップアップ */
            .pe-category-popup {
                position: fixed;
                background: linear-gradient(135deg, #1e1e3f 0%, #2a2a4e 100%);
                border: 2px solid #667eea;
                border-radius: 12px;
                box-shadow: 0 8px 32px rgba(0,0,0,0.6);
                z-index: 30000;
                min-width: 380px;
                max-width: 500px;
                max-height: 450px;
                overflow: hidden;
                font-family: 'Segoe UI', 'Yu Gothic', sans-serif;
            }
            
            .pe-category-popup-header {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                padding: 12px 16px;
                display: flex;
                justify-content: space-between;
                align-items: center;
                cursor: move;
            }
            
            .pe-category-popup-title {
                font-size: 14px;
                font-weight: bold;
                color: white;
            }
            
            .pe-category-popup-close {
                background: rgba(255,255,255,0.2);
                border: none;
                color: white;
                width: 24px;
                height: 24px;
                border-radius: 50%;
                cursor: pointer;
                font-size: 14px;
            }
            
            .pe-category-popup-body {
                padding: 12px;
                max-height: 350px;
                overflow-y: auto;
            }
            
            .pe-category-motion-row {
                display: flex;
                align-items: center;
                gap: 10px;
                padding: 8px;
                border-radius: 8px;
                margin-bottom: 6px;
                background: rgba(255,255,255,0.03);
                transition: background 0.2s;
            }
            
            .pe-category-motion-row:hover {
                background: rgba(255,255,255,0.08);
            }
            
            .pe-category-motion-row.excluded {
                background: rgba(239,68,68,0.15);
                border-left: 3px solid #ef4444;
            }
            
            .pe-category-motion-preview {
                width: 28px;
                height: 28px;
                border: none;
                border-radius: 50%;
                background: linear-gradient(135deg, #4ade80 0%, #22c55e 100%);
                color: white;
                font-size: 12px;
                cursor: pointer;
                flex-shrink: 0;
            }
            
            .pe-category-motion-preview:hover {
                transform: scale(1.1);
            }
            
            .pe-category-motion-preview.playing {
                background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
            }
            
            .pe-category-motion-info {
                flex: 1;
                min-width: 0;
            }
            
            .pe-category-motion-name {
                font-size: 12px;
                font-weight: 500;
                color: #e0e0e0;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
            }
            
            .pe-category-motion-file {
                font-size: 10px;
                color: #666;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
            }
            
            .pe-category-motion-checkbox {
                width: 20px;
                height: 20px;
                accent-color: #ef4444;
                flex-shrink: 0;
            }
            
            /* 🆕 v1.4: カテゴリ変更ドロップダウン */
            .pe-category-select {
                padding: 4px 8px;
                border: 1px solid #444;
                border-radius: 6px;
                background: rgba(0,0,0,0.3);
                color: #e0e0e0;
                font-size: 10px;
                cursor: pointer;
                min-width: 90px;
                flex-shrink: 0;
            }
            
            .pe-category-select:hover {
                border-color: #667eea;
            }
            
            .pe-category-select:focus {
                outline: none;
                border-color: #667eea;
                box-shadow: 0 0 0 2px rgba(102,126,234,0.3);
            }
            
            .pe-category-select option {
                background: #1e1e3f;
                color: #e0e0e0;
            }
            
            .pe-category-select.changed {
                background: rgba(251,191,36,0.2);
                border-color: #fbbf24;
            }
            
            .pe-category-motion-row.category-changed {
                background: rgba(251,191,36,0.15) !important;
                border-left: 3px solid #fbbf24 !important;
            }
            
            .pe-category-popup-footer {
                padding: 10px 16px;
                background: rgba(0,0,0,0.2);
                display: flex;
                justify-content: space-between;
                align-items: center;
                font-size: 11px;
                color: #888;
            }
            
            .pe-category-popup-actions {
                display: flex;
                gap: 8px;
            }
            
            .pe-category-popup-btn {
                padding: 6px 12px;
                border: none;
                border-radius: 6px;
                cursor: pointer;
                font-size: 11px;
                transition: all 0.2s;
            }
            
            .pe-category-popup-btn.select-all {
                background: rgba(74,222,128,0.2);
                color: #4ade80;
            }
            
            .pe-category-popup-btn.deselect-all {
                background: rgba(239,68,68,0.2);
                color: #f87171;
            }
            
            .pe-category-popup-btn:hover {
                transform: translateY(-1px);
            }
            
            /* 🆕 v1.5: テーブル行のカテゴリ変更ハイライト */
            .pe-motion-table tr.pe-motion-row-changed {
                background: rgba(251,191,36,0.15) !important;
            }
            
            .pe-motion-table tr.pe-motion-row-changed td {
                border-left-color: #fbbf24;
            }
            
            .pe-motion-table tr.pe-motion-row-changed td:first-child {
                border-left: 3px solid #fbbf24;
            }
        `;
        
        document.head.appendChild(style);
    }
    
    createModal() {
        this.modal = document.createElement('div');
        this.modal.id = 'personality-editor-modal';
        this.modal.innerHTML = `
            <div class="pe-modal-content">
                <div class="pe-header">
                    <span class="pe-title">🎭 キャラクター個性設定</span>
                    <button class="pe-close-btn" id="pe-close">×</button>
                </div>
                
                <div class="pe-body">
                    <!-- キャラクター名 -->
                    <div class="pe-section-title">
                        <span>👤</span>
                        <span id="pe-char-name">キャラクター名</span>
                    </div>
                    
                    <!-- プリセット選択 -->
                    <div class="pe-preset-section">
                        <div class="pe-section-title">
                            <span>📦</span>
                            <span>プリセット選択</span>
                        </div>
                        <div class="pe-preset-grid" id="pe-preset-grid"></div>
                    </div>
                    
                    <!-- 表情設定 -->
                    <div class="pe-expression-section">
                        <div class="pe-section-title">
                            <span>😊</span>
                            <span>表情強度設定</span>
                        </div>
                        <div class="pe-slider-row">
                            <span class="pe-slider-label">全体の表情強度</span>
                            <input type="range" class="pe-slider" id="pe-expr-multiplier" min="0.1" max="1.5" step="0.1" value="1.0">
                            <span class="pe-slider-value" id="pe-expr-multiplier-val">100%</span>
                        </div>
                        <div class="pe-slider-row">
                            <span class="pe-slider-label">嬉しい表情の追加補正</span>
                            <input type="range" class="pe-slider" id="pe-expr-happy" min="0.1" max="1.5" step="0.1" value="1.0">
                            <span class="pe-slider-value" id="pe-expr-happy-val">100%</span>
                        </div>
                        <div style="font-size:10px;color:#888;margin-top:8px;">
                            💡 知的クール系は50%程度、おしとやか系は70%程度がおすすめです
                        </div>
                    </div>
                    
                    <!-- 感情カテゴリ制限 -->
                    <div class="pe-restriction-section">
                        <div class="pe-section-title">
                            <span>🚫</span>
                            <span>禁止モーションカテゴリ</span>
                        </div>
                        <div class="pe-restriction-grid" id="pe-restriction-grid"></div>
                        <div style="font-size:10px;color:#888;margin-top:8px;">
                            💡 タグをクリック→ポップアップで個別除外可能
                        </div>
                    </div>
                    
                    <!-- 🆕 v1.7: しゃべり終わった後モーション -->
                    <div class="pe-idle-section" style="margin-bottom: 20px; background: rgba(147,112,219,0.1); border: 1px solid rgba(147,112,219,0.3); border-radius: 12px; padding: 16px;">
                        <div class="pe-section-title" style="color: #9370db;">
                            <span>💤</span>
                            <span>しゃべり終わった後の待機モーション</span>
                        </div>
                        <div style="font-size:10px;color:#888;margin-bottom:10px;">
                            💡 会話後の待機ポーズを感情カテゴリ別に管理（派手すぎるものを除外）
                        </div>
                        <div class="pe-idle-tabs" id="pe-idle-tabs" style="display: flex; gap: 6px; margin-bottom: 10px; flex-wrap: wrap;"></div>
                        <div class="pe-idle-motion-list" id="pe-idle-motion-list" style="max-height: 200px; overflow-y: auto; background: rgba(0,0,0,0.2); border-radius: 8px; padding: 8px;"></div>
                    </div>
                    
                    <!-- モーション設定 -->
                    <div class="pe-motion-section">
                        <div class="pe-section-title">
                            <span>💃</span>
                            <span>モーション設定</span>
                        </div>
                        <div class="pe-motion-tabs" id="pe-motion-tabs"></div>
                        <div class="pe-motion-table-container">
                            <table class="pe-motion-table">
                                <thead>
                                    <tr>
                                        <th style="width:50px;">プレビュー</th>
                                        <th style="width:50px;">優先</th>
                                        <th style="width:50px;">除外</th>
                                        <th>モーション名</th>
                                        <th style="width:100px;">カテゴリ</th>
                                        <th style="width:80px;">確率補正</th>
                                    </tr>
                                </thead>
                                <tbody id="pe-motion-tbody"></tbody>
                            </table>
                        </div>
                    </div>
                </div>
                
                <div class="pe-footer">
                    <div class="pe-footer-left">
                        <button class="pe-btn pe-btn-export" id="pe-export">💾 JSON保存</button>
                        <button class="pe-btn pe-btn-import" id="pe-import">📂 JSON読込</button>
                        <input type="file" id="pe-import-file" accept=".json" style="display:none;">
                        <span style="color:#666;margin:0 8px;">|</span>
                        <button class="pe-btn pe-btn-export-all" id="pe-export-all">💾 全員分保存</button>
                        <button class="pe-btn pe-btn-import-all" id="pe-import-all">📂 全員分読込</button>
                        <input type="file" id="pe-import-all-file" accept=".json" style="display:none;">
                    </div>
                    <div class="pe-footer-right">
                        <button class="pe-btn pe-btn-secondary" id="pe-cancel">キャンセル</button>
                        <button class="pe-btn pe-btn-primary" id="pe-save">✅ 適用</button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(this.modal);
        this.setupEventListeners();
    }
    
    setupEventListeners() {
        // 閉じるボタン
        document.getElementById('pe-close').addEventListener('click', () => this.hide());
        document.getElementById('pe-cancel').addEventListener('click', () => this.hide());
        
        // モーダル外クリックで閉じる
        this.modal.addEventListener('click', (e) => {
            if (e.target === this.modal) this.hide();
        });
        
        // 適用ボタン
        document.getElementById('pe-save').addEventListener('click', () => this.save());
        
        // エクスポート
        document.getElementById('pe-export').addEventListener('click', () => this.exportJSON());
        
        // インポート
        document.getElementById('pe-import').addEventListener('click', () => {
            document.getElementById('pe-import-file').click();
        });
        document.getElementById('pe-import-file').addEventListener('change', (e) => {
            if (e.target.files[0]) {
                this.importJSON(e.target.files[0]);
                e.target.value = '';
            }
        });
        
        // 全員分エクスポート
        document.getElementById('pe-export-all').addEventListener('click', () => this.exportAllJSON());
        
        // 全員分インポート
        document.getElementById('pe-import-all').addEventListener('click', () => {
            document.getElementById('pe-import-all-file').click();
        });
        document.getElementById('pe-import-all-file').addEventListener('change', (e) => {
            if (e.target.files[0]) {
                this.importAllJSON(e.target.files[0]);
                e.target.value = '';
            }
        });
        
        // スライダー
        document.getElementById('pe-expr-multiplier').addEventListener('input', (e) => {
            document.getElementById('pe-expr-multiplier-val').textContent = Math.round(e.target.value * 100) + '%';
        });
        document.getElementById('pe-expr-happy').addEventListener('input', (e) => {
            document.getElementById('pe-expr-happy-val').textContent = Math.round(e.target.value * 100) + '%';
        });
        
        // ドラッグ機能の設定
        this.setupDragFeature();
    }
    
    /**
     * 🆕 v1.2: ドラッグ機能のセットアップ
     * ヘッダーをつかんでモーダルを移動できるようにする
     */
    setupDragFeature() {
        const modalContent = this.modal.querySelector('.pe-modal-content');
        const header = this.modal.querySelector('.pe-header');
        
        if (!header || !modalContent) {
            console.warn('⚠️ ドラッグ機能: ヘッダーまたはモーダルが見つかりません');
            return;
        }
        
        let isDragging = false;
        let startX, startY;
        let initialLeft, initialTop;
        
        // マウスダウン（ドラッグ開始）
        header.addEventListener('mousedown', (e) => {
            // 閉じるボタンのクリックは無視
            if (e.target.closest('.pe-close-btn')) return;
            
            isDragging = true;
            modalContent.classList.add('dragging');
            
            // 現在のtransformを解除して実際の位置に固定
            const rect = modalContent.getBoundingClientRect();
            modalContent.style.transform = 'none';
            modalContent.style.left = rect.left + 'px';
            modalContent.style.top = rect.top + 'px';
            
            startX = e.clientX;
            startY = e.clientY;
            initialLeft = rect.left;
            initialTop = rect.top;
            
            e.preventDefault();
        });
        
        // マウスムーブ（ドラッグ中）
        document.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            
            const deltaX = e.clientX - startX;
            const deltaY = e.clientY - startY;
            
            let newLeft = initialLeft + deltaX;
            let newTop = initialTop + deltaY;
            
            // 画面外に出ないように制限
            const modalRect = modalContent.getBoundingClientRect();
            const maxLeft = window.innerWidth - 100; // 最低100px見える
            const maxTop = window.innerHeight - 50; // 最低50px見える
            
            newLeft = Math.max(-modalRect.width + 100, Math.min(maxLeft, newLeft));
            newTop = Math.max(0, Math.min(maxTop, newTop));
            
            modalContent.style.left = newLeft + 'px';
            modalContent.style.top = newTop + 'px';
        });
        
        // マウスアップ（ドラッグ終了）
        document.addEventListener('mouseup', () => {
            if (isDragging) {
                isDragging = false;
                modalContent.classList.remove('dragging');
            }
        });
        
        // マウスがウィンドウ外に出た時もドラッグ終了
        document.addEventListener('mouseleave', () => {
            if (isDragging) {
                isDragging = false;
                modalContent.classList.remove('dragging');
            }
        });
        
        console.log('🖱️ ドラッグ機能を設定しました');
    }
    
    /**
     * モーダルを表示
     */
    show(characterId, characterName) {
        this.currentCharacterId = characterId;
        
        // キャラクター名表示
        document.getElementById('pe-char-name').textContent = characterName || characterId;
        
        // 現在の設定を読み込み
        const manager = window.characterPersonalityManager;
        const settings = manager.getSettings(characterId);
        
        // プリセット選択を構築
        this.renderPresetGrid(settings.presetId);
        
        // スライダー値を設定
        document.getElementById('pe-expr-multiplier').value = settings.expressionMultiplier;
        document.getElementById('pe-expr-multiplier-val').textContent = Math.round(settings.expressionMultiplier * 100) + '%';
        document.getElementById('pe-expr-happy').value = settings.expressionHappyMultiplier;
        document.getElementById('pe-expr-happy-val').textContent = Math.round(settings.expressionHappyMultiplier * 100) + '%';
        
        // 感情制限を構築
        this.renderRestrictionGrid(settings.motionEmotionRestrictions);
        
        // 🆕 v1.7: 待機モーションセクションを構築
        this.renderIdleMotionSection(settings);
        
        // モーションタブを構築
        this.renderMotionTabs();
        this.renderMotionTable('all', settings);
        
        // モーダル表示
        this.modal.style.display = 'block';
    }
    
    /**
     * モーダルを非表示
     */
    hide() {
        this.modal.style.display = 'none';
        this.currentCharacterId = null;
    }
    
    /**
     * プリセットグリッドを描画
     */
    renderPresetGrid(selectedPresetId) {
        const grid = document.getElementById('pe-preset-grid');
        const presets = window.CHARACTER_PRESETS;
        
        grid.innerHTML = Object.values(presets).filter(p => p.id !== 'custom').map(preset => `
            <div class="pe-preset-card ${preset.id === selectedPresetId ? 'selected' : ''}" data-preset="${preset.id}">
                <div class="pe-preset-icon">${preset.icon}</div>
                <div class="pe-preset-name">${preset.name}</div>
                <div class="pe-preset-desc">${preset.description}</div>
            </div>
        `).join('');
        
        // クリックイベント
        grid.querySelectorAll('.pe-preset-card').forEach(card => {
            card.addEventListener('click', () => {
                // 選択状態を更新
                grid.querySelectorAll('.pe-preset-card').forEach(c => c.classList.remove('selected'));
                card.classList.add('selected');
                
                // プリセット設定を適用
                const presetId = card.dataset.preset;
                const preset = presets[presetId];
                
                // スライダー更新
                document.getElementById('pe-expr-multiplier').value = preset.expressionMultiplier;
                document.getElementById('pe-expr-multiplier-val').textContent = Math.round(preset.expressionMultiplier * 100) + '%';
                document.getElementById('pe-expr-happy').value = preset.expressionHappyMultiplier;
                document.getElementById('pe-expr-happy-val').textContent = Math.round(preset.expressionHappyMultiplier * 100) + '%';
                
                // 感情制限更新
                this.renderRestrictionGrid(preset.motionEmotionRestrictions);
                
                // モーション設定更新
                const manager = window.characterPersonalityManager;
                const currentSettings = manager.getSettings(this.currentCharacterId);
                const newSettings = {
                    ...currentSettings,
                    ...JSON.parse(JSON.stringify(preset))
                };
                this.renderMotionTable('all', newSettings);
            });
        });
    }
    
    /**
     * 感情制限グリッドを描画
     * 🆕 v1.3: タグクリックでポップアップ表示
     */
    renderRestrictionGrid(restrictions) {
        const grid = document.getElementById('pe-restriction-grid');
        
        const categories = [
            { id: 'happy_strong', name: '🎉 大喜び' },
            { id: 'angry_strong', name: '💢 激怒り' },
            { id: 'sad_strong', name: '😭 大泣き' },
            { id: 'annoyed_strong', name: '😤 うんざり' },
            { id: 'sexy', name: '💋 セクシー' },
            { id: 'sexy_strong', name: '💃 激セクシー' },
            { id: 'spin_happy', name: '🌀 ルンルン回転' },
            { id: 'exercise', name: '🏋️ 運動' }
        ];
        
        grid.innerHTML = categories.map(cat => `
            <div class="pe-restriction-chip ${restrictions.includes(cat.id) ? 'active' : ''}" data-category="${cat.id}" data-name="${cat.name}">
                ${cat.name}
            </div>
        `).join('');
        
        // クリックイベント - ポップアップ表示
        grid.querySelectorAll('.pe-restriction-chip').forEach(chip => {
            chip.addEventListener('click', (e) => {
                const categoryId = chip.dataset.category;
                const categoryName = chip.dataset.name;
                this.showCategoryPopup(categoryId, categoryName, chip, e);
            });
        });
    }
    
    /**
     * 🆕 v1.7: 待機モーションセクションを描画
     * pipelined-dialogue-directorのidleMotionCategoriesを参照
     * 🔧 v1.7.1: 内部で状態を保持
     */
    renderIdleMotionSection(settings) {
        const tabsContainer = document.getElementById('pe-idle-tabs');
        const listContainer = document.getElementById('pe-idle-motion-list');
        
        if (!tabsContainer || !listContainer) return;
        
        // 🔧 v1.7.1: 内部で除外状態を保持（タブ切り替えで消えないように）
        this.tempExcludedIdleMotions = new Set(settings.excludedIdleMotions || []);
        
        // pipelined-dialogue-directorからidleMotionCategoriesを取得
        const director = window.multiCharManager?.director;
        const idleCategories = director?.idleMotionCategories || this.getDefaultIdleCategories();
        
        // カテゴリ名のマッピング
        const categoryNames = {
            natural: '💤 通常待機',
            happy: '😊 嬉しい',
            happy_mild: '🙂 ちょい嬉しい',
            happy_strong: '🎉 大喜び',
            angry: '😠 怒り',
            angry_strong: '💢 激怒り',
            annoyed: '😒 うんざり',
            annoyed_strong: '😤 激うんざり',
            sad: '😢 悲しい',
            sad_strong: '😭 大泣き',
            disappointed: '😞 がっかり',
            muscle: '💪 筋肉',
            polite: '🙇 お辞儀',
            teasing: '😜 おちょくり',
            sexy: '💋 セクシー',
            sexy_strong: '💃 激セクシー',
            pray: '🙏 祈り',
            shy: '😳 恥ずかしい',
            exercise: '🏋️ 運動',
            spin_happy: '🌀 ルンルン'
        };
        
        // タブを作成
        const categoryIds = Object.keys(idleCategories);
        tabsContainer.innerHTML = categoryIds.map((catId, idx) => `
            <button class="pe-idle-tab ${idx === 0 ? 'active' : ''}" data-category="${catId}"
                    style="padding: 4px 10px; font-size: 10px; border: none; border-radius: 6px; cursor: pointer;
                           background: ${idx === 0 ? 'linear-gradient(135deg, #9370db 0%, #7b68ee 100%)' : 'rgba(255,255,255,0.1)'};
                           color: ${idx === 0 ? 'white' : '#aaa'}; transition: all 0.2s;">
                ${categoryNames[catId] || catId}
            </button>
        `).join('');
        
        // タブクリックイベント
        tabsContainer.querySelectorAll('.pe-idle-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                tabsContainer.querySelectorAll('.pe-idle-tab').forEach(t => {
                    t.style.background = 'rgba(255,255,255,0.1)';
                    t.style.color = '#aaa';
                    t.classList.remove('active');
                });
                tab.style.background = 'linear-gradient(135deg, #9370db 0%, #7b68ee 100%)';
                tab.style.color = 'white';
                tab.classList.add('active');
                // 🆕 v1.7: 最新の設定を取得してリストを描画
                this.renderIdleMotionList(tab.dataset.category);
            });
        });
        
        // 最初のカテゴリを表示
        if (categoryIds.length > 0) {
            this.renderIdleMotionList(categoryIds[0]);
        }
    }
    
    /**
     * 🆕 v1.7: 待機モーションリストを描画
     * 🔧 v1.7.1: 内部状態(tempExcludedIdleMotions)を使用
     */
    renderIdleMotionList(categoryId) {
        const listContainer = document.getElementById('pe-idle-motion-list');
        if (!listContainer) return;
        
        // pipelined-dialogue-directorからidleMotionCategoriesを取得
        const director = window.multiCharManager?.director;
        const idleCategories = director?.idleMotionCategories || this.getDefaultIdleCategories();
        
        const motions = idleCategories[categoryId] || [];
        
        // 🔧 v1.7.1: 内部状態から除外リストを取得
        const excludedIdle = this.tempExcludedIdleMotions || new Set();
        
        if (motions.length === 0) {
            listContainer.innerHTML = '<div style="color:#666;font-size:11px;text-align:center;padding:20px;">このカテゴリにモーションはありません</div>';
            return;
        }
        
        listContainer.innerHTML = motions.map(motionFile => {
            const isExcluded = excludedIdle.has(motionFile);
            const displayName = motionFile.replace('.vrma', '').replace('アンリアルキャラ', '');
            
            return `
                <div class="pe-idle-motion-row" style="display: flex; align-items: center; gap: 8px; padding: 6px 8px; margin-bottom: 4px;
                            border-radius: 6px; background: ${isExcluded ? 'rgba(239,68,68,0.15)' : 'rgba(255,255,255,0.03)'};
                            ${isExcluded ? 'border-left: 3px solid #ef4444;' : ''} transition: all 0.2s;">
                    <button class="pe-idle-preview-btn" data-file="${motionFile}" 
                            style="width: 26px; height: 26px; border: none; border-radius: 50%; cursor: pointer;
                                   background: linear-gradient(135deg, #4ade80 0%, #22c55e 100%); color: white; font-size: 11px;">▶</button>
                    <div style="flex: 1; min-width: 0;">
                        <div style="font-size: 11px; color: #e0e0e0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${displayName}</div>
                        <div style="font-size: 9px; color: #666; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${motionFile}</div>
                    </div>
                    <label style="display: flex; align-items: center; gap: 4px; cursor: pointer; font-size: 10px; color: ${isExcluded ? '#f87171' : '#888'};">
                        <input type="checkbox" class="pe-idle-exclude-cb" data-file="${motionFile}" data-category="${categoryId}"
                               ${isExcluded ? 'checked' : ''}
                               style="width: 16px; height: 16px; accent-color: #ef4444;">
                        除外
                    </label>
                </div>
            `;
        }).join('');
        
        // プレビューボタン
        listContainer.querySelectorAll('.pe-idle-preview-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.previewMotion(btn.dataset.file, btn);
            });
        });
        
        // 🔧 v1.7.1: 除外チェックボックス - 内部状態を即座に更新
        listContainer.querySelectorAll('.pe-idle-exclude-cb').forEach(cb => {
            cb.addEventListener('change', (e) => {
                const motionFile = cb.dataset.file;
                const row = cb.closest('.pe-idle-motion-row');
                
                if (cb.checked) {
                    this.tempExcludedIdleMotions.add(motionFile);
                    row.style.background = 'rgba(239,68,68,0.15)';
                    row.style.borderLeft = '3px solid #ef4444';
                } else {
                    this.tempExcludedIdleMotions.delete(motionFile);
                    row.style.background = 'rgba(255,255,255,0.03)';
                    row.style.borderLeft = '';
                }
                
                console.log(`💤 待機モーション除外更新: ${motionFile} = ${cb.checked}`);
            });
        });
    }
    
    /**
     * 🆕 v1.7: デフォルトのidleMotionCategories（directorがない場合のフォールバック）
     */
    getDefaultIdleCategories() {
        return {
            natural: [
                'アンリアルキャラ否定.vrma',
                'アンリアルキャラセクシー待機.vrma', 'アンリアルキャラゆびうごかし.vrma',
                'アンリアルキャラリアクションポーズ.vrma', 'アンリアルキャラ考える.vrma',
                'アンリアルキャラ腰に手をあて仁王だち.vrma', 'おしとやかにしゃべる.vrma',
                '女性しゃべり01.vrma', '女性しゃべり02.vrma',
                '女性しゃべり0４.vrma',
                '真剣にあれこれ考える.vrma'
            ],
            happy: [
                'VRMA_03.vrma', 'アンリアルキャラセクシーモーション.vrma',
                'アンリアルキャラまーざっとこんなもんよツンデレ.vrma', 'アンリアルキャラ喜ぶ.vrma',
                'アンリアルキャラ興味しんしん.vrma', '女性投げキッス.vrma', '投げキッスしまくり.vrma'
            ],
            happy_mild: [
                '女性しゃべり05ルンルン気分.vrma', 'VRMA_05.vrma',
                'アンリアルキャラいろいろなセクシーポーズ.vrma', 'アンリアルキャラセクシー投げキッス.vrma',
                'アンリアルキャラノリノリで手をふる.vrma'
            ],
            happy_strong: [
                'アンリアルキャラ全身でOKマークポーズ.vrma', 'アンリアルキャラガッツポーズでめちゃくちゃよろこぶ.vrma',
                'アンリアルキャラガッツポーズでジャンプしてめちゃくちゃよろこぶ.vrma', '喜びガッツポーズ.vrma'
            ],
            angry: [
                '怒りあきれる.vrma', 'アンリアルキャラ否定.vrma', 'アニメイライラ.vrma',
                'VRMA_03.vrma', 'アンリアルキャラびっくり否定怒る.vrma',
                'アンリアルキャラびっくり否定怒る１.vrma', 'アンリアルキャラおっぱらいディスB.vrma',
                '女性しゃべり04うでくみ.vrma', '冗談じゃない手ではらって一周.vrma'
            ],
            angry_strong: [
                '怒りゆびさし.vrma', 'しゃべりいかりイライラ.vrma', 'ぴょんぴょんジャンプ拒絶.vrma',
                'ふみつけけりまくり.vrma', '威嚇して蹴ってくる.vrma', '怒って攻撃しまくり.vrma',
                '怒り「かかってこいよ！」.vrma'
            ],
            annoyed: [
                '怒りあきれる.vrma', 'アンリアルキャラ否定して一線をひく.vrma',
                'アンリアルキャラ女性しゃべり.vrma', 'アンリアルキャラまーまーおちついてくび.vrma',
                'アンリアルキャラおっぱらいディス.vrma', 'アンリアルキャラお化け屋敷で四方八方にびびり散らかす.vrma'
            ],
            annoyed_strong: [
                'アンリアルキャラえーなにそれ！嫌なリアクション.vrma', 'アンリアルキャラもーなんなのよ！.vrma',
                'アンリアルキャラじだんだ.vrma', '子供のように駄々をこねて倒れてじだんだ.vrma'
            ],
            sad: [
                '悲しくしゃべる.vrma', 'あたまをおさえてがっかり.vrma',
                'アンリアルキャラ頭をかかえる.vrma', 'アンリアルキャラ頭をかかえるB.vrma',
                'ええええ～！いやだよ～！どんびき.vrma'
            ],
            sad_strong: ['悲しくしゃがんで泣いちゃう.vrma'],
            disappointed: [
                'うなだれて一周.vrma', 'しゃがんでいじける.vrma',
                '子供のように駄々をこねて倒れてじだんだ.vrma'
            ],
            muscle: ['アンリアルキャラ筋肉ムキムキ.vrma'],
            polite: ['アンリアルキャラ丁寧なお辞儀.vrma'],
            teasing: ['おちょくりwave.vrma'],
            sexy: [
                'アンリアルキャラいろいろなセクシーポーズ.vrma', 'アンリアルキャラセクシー投げキッス.vrma',
                'アンリアルキャラセクシーモーション.vrma'
            ],
            sexy_strong: ['セクシーダンス.vrma'],
            pray: ['祈る.vrma'],
            shy: ['恥ずかしくて顔をおおう.vrma', '恥ずかしい顔おおい.vrma'],
            exercise: ['VRMA_07.vrma'],
            spin_happy: ['VRMA_01.vrma']
        };
    }
    
    /**
     * 🆕 v1.3: カテゴリモーションポップアップを表示
     * モーションのカテゴリを変更できる
     */
    showCategoryPopup(categoryId, categoryName, chipElement, event) {
        // 既存のポップアップを削除
        const existingPopup = document.querySelector('.pe-category-popup');
        if (existingPopup) {
            existingPopup.remove();
        }
        
        // カテゴリに属するモーションを取得
        const allMotions = window.ALL_MOTIONS || {};
        const categoryMotions = allMotions[categoryId] || [];
        
        if (categoryMotions.length === 0) {
            console.warn(`⚠️ カテゴリ "${categoryId}" にモーションがありません`);
            chipElement.classList.toggle('active');
            return;
        }
        
        // 現在の設定を取得
        const currentSettings = this.getCurrentSettings();
        const excludedMotions = currentSettings.excludedMotions || [];
        const categoryOverrides = currentSettings.motionCategoryOverrides || {};
        
        // 全カテゴリリスト
        const allCategories = [
            { id: 'idle', name: '待機' },
            { id: 'talk_basic', name: 'しゃべり' },
            { id: 'happy', name: '嬉しい' },
            { id: 'happy_mild', name: 'ちょい嬉しい' },
            { id: 'happy_strong', name: '大喜び' },
            { id: 'sexy', name: 'セクシー' },
            { id: 'sexy_strong', name: '激セクシー' },
            { id: 'angry', name: '怒り' },
            { id: 'angry_strong', name: '激怒り' },
            { id: 'sad', name: '悲しみ' },
            { id: 'sad_strong', name: '大泣き' },
            { id: 'thinking', name: '考える' },
            { id: 'annoyed', name: 'うんざり' },
            { id: 'annoyed_strong', name: '激うんざり' },
            { id: 'spin_happy', name: 'ルンルン回転' },
            { id: 'exercise', name: '運動' },
            { id: 'normal', name: '通常' },
            { id: 'misc', name: 'その他' }
        ];
        
        // ポップアップを作成
        const popup = document.createElement('div');
        popup.className = 'pe-category-popup';
        popup.innerHTML = `
            <div class="pe-category-popup-header">
                <span class="pe-category-popup-title">${categoryName} モーション編集</span>
                <button class="pe-category-popup-close">×</button>
            </div>
            <div class="pe-category-popup-body">
                ${categoryMotions.map(motion => {
                    const currentCategory = categoryOverrides[motion.file] || motion.category;
                    const isExcluded = excludedMotions.includes(motion.file);
                    
                    return `
                    <div class="pe-category-motion-row ${isExcluded ? 'excluded' : ''}" data-file="${motion.file}">
                        <button class="pe-category-motion-preview" data-file="${motion.file}" title="プレビュー">▶</button>
                        <div class="pe-category-motion-info">
                            <div class="pe-category-motion-name">${motion.name}</div>
                            <div class="pe-category-motion-file">${motion.file}</div>
                        </div>
                        <select class="pe-category-select" data-file="${motion.file}" data-original="${motion.category}">
                            ${allCategories.map(cat => `
                                <option value="${cat.id}" ${currentCategory === cat.id ? 'selected' : ''}>
                                    ${cat.name}
                                </option>
                            `).join('')}
                        </select>
                        <input type="checkbox" class="pe-category-motion-checkbox" 
                               data-file="${motion.file}" 
                               ${isExcluded ? 'checked' : ''}
                               title="除外">
                    </div>
                `}).join('')}
            </div>
            <div class="pe-category-popup-footer">
                <span>📝 カテゴリ変更可能 / ☑ = 除外</span>
                <div class="pe-category-popup-actions">
                    <button class="pe-category-popup-btn reset-all">リセット</button>
                    <button class="pe-category-popup-btn deselect-all">全除外</button>
                </div>
            </div>
        `;
        
        // 位置を計算
        const chipRect = chipElement.getBoundingClientRect();
        let left = chipRect.left;
        let top = chipRect.bottom + 8;
        
        if (left + 450 > window.innerWidth) {
            left = window.innerWidth - 470;
        }
        if (top + 400 > window.innerHeight) {
            top = chipRect.top - 420;
        }
        
        popup.style.left = Math.max(10, left) + 'px';
        popup.style.top = Math.max(10, top) + 'px';
        
        document.body.appendChild(popup);
        
        // イベントリスナーを設定
        this.setupCategoryPopupEvents(popup, categoryId, chipElement);
        
        console.log(`📝 カテゴリポップアップ表示: ${categoryName} (${categoryMotions.length}件)`);
    }
    
    /**
     * 🆕 v1.3: カテゴリポップアップのイベント設定
     */
    setupCategoryPopupEvents(popup, categoryId, chipElement) {
        // 閉じるボタン
        popup.querySelector('.pe-category-popup-close').addEventListener('click', () => {
            this.updateChipStateFromPopup(popup, categoryId, chipElement);
            popup.remove();
        });
        
        // ポップアップ外クリックで閉じる
        const closeOnOutsideClick = (e) => {
            if (!popup.contains(e.target) && !chipElement.contains(e.target)) {
                this.updateChipStateFromPopup(popup, categoryId, chipElement);
                popup.remove();
                document.removeEventListener('click', closeOnOutsideClick);
            }
        };
        setTimeout(() => {
            document.addEventListener('click', closeOnOutsideClick);
        }, 100);
        
        // プレビューボタン
        popup.querySelectorAll('.pe-category-motion-preview').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const motionFile = btn.dataset.file;
                this.previewMotion(motionFile, btn);
            });
        });
        
        // カテゴリ変更ドロップダウン
        popup.querySelectorAll('.pe-category-select').forEach(select => {
            select.addEventListener('change', (e) => {
                const motionFile = select.dataset.file;
                const originalCategory = select.dataset.original;
                const newCategory = select.value;
                const row = select.closest('.pe-category-motion-row');
                
                // 変更があればハイライト
                if (newCategory !== originalCategory) {
                    row.style.background = 'rgba(102,126,234,0.2)';
                    row.style.borderLeft = '3px solid #667eea';
                } else {
                    row.style.background = '';
                    row.style.borderLeft = '';
                }
                
                // 🆕 v1.5: テーブルへ連動
                this.syncCategoryToTable(motionFile, newCategory);
                
                console.log(`🔄 カテゴリ変更: ${motionFile} : ${originalCategory} → ${newCategory}`);
            });
        });
        
        // 除外チェックボックス
        popup.querySelectorAll('.pe-category-motion-checkbox').forEach(cb => {
            cb.addEventListener('change', (e) => {
                const row = cb.closest('.pe-category-motion-row');
                const motionFile = cb.dataset.file;
                
                if (cb.checked) {
                    row.classList.add('excluded');
                    const mainCb = document.querySelector(`.pe-motion-checkbox.excluded[data-file="${motionFile}"]`);
                    if (mainCb) mainCb.checked = true;
                } else {
                    row.classList.remove('excluded');
                    const mainCb = document.querySelector(`.pe-motion-checkbox.excluded[data-file="${motionFile}"]`);
                    if (mainCb) mainCb.checked = false;
                }
            });
        });
        
        // リセットボタン（カテゴリを元に戻す）
        popup.querySelector('.pe-category-popup-btn.reset-all').addEventListener('click', () => {
            popup.querySelectorAll('.pe-category-select').forEach(select => {
                const originalCategory = select.dataset.original;
                select.value = originalCategory;
                select.dispatchEvent(new Event('change'));
            });
            popup.querySelectorAll('.pe-category-motion-checkbox').forEach(cb => {
                cb.checked = false;
                cb.dispatchEvent(new Event('change'));
            });
        });
        
        // 全て除外ボタン
        popup.querySelector('.pe-category-popup-btn.deselect-all').addEventListener('click', () => {
            popup.querySelectorAll('.pe-category-motion-checkbox').forEach(cb => {
                cb.checked = true;
                cb.dispatchEvent(new Event('change'));
            });
        });
        
        // ドラッグ機能
        this.setupPopupDrag(popup);
    }
    
    /**
     * 🆕 v1.3: ポップアップのドラッグ機能
     */
    setupPopupDrag(popup) {
        const header = popup.querySelector('.pe-category-popup-header');
        let isDragging = false;
        let startX, startY, initialLeft, initialTop;
        
        header.addEventListener('mousedown', (e) => {
            if (e.target.closest('.pe-category-popup-close')) return;
            
            isDragging = true;
            const rect = popup.getBoundingClientRect();
            startX = e.clientX;
            startY = e.clientY;
            initialLeft = rect.left;
            initialTop = rect.top;
            e.preventDefault();
        });
        
        document.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            
            const deltaX = e.clientX - startX;
            const deltaY = e.clientY - startY;
            
            popup.style.left = (initialLeft + deltaX) + 'px';
            popup.style.top = (initialTop + deltaY) + 'px';
        });
        
        document.addEventListener('mouseup', () => {
            isDragging = false;
        });
    }
    
    /**
     * 🆕 v1.3: ポップアップの状態からチップの状態を更新
     */
    updateChipStateFromPopup(popup, categoryId, chipElement) {
        const checkboxes = popup.querySelectorAll('.pe-category-motion-checkbox');
        const total = checkboxes.length;
        let excludedCount = 0;
        
        checkboxes.forEach(cb => {
            if (cb.checked) excludedCount++;
        });
        
        // 全て除外されている場合はカテゴリ全体を禁止状態に
        if (excludedCount === total) {
            chipElement.classList.add('active');
        } else {
            chipElement.classList.remove('active');
        }
        
        console.log(`📊 ${categoryId}: ${excludedCount}/${total} 除外`);
    }
    
    /**
     * モーションタブを描画
     */
    renderMotionTabs() {
        const tabs = document.getElementById('pe-motion-tabs');
        const categories = [
            { id: 'all', name: '全て' },
            { id: 'idle', name: '待機' },
            { id: 'talk_basic', name: 'しゃべり' },
            { id: 'happy', name: '嬉しい' },
            { id: 'happy_strong', name: '大喜び' },
            { id: 'sexy', name: 'セクシー' },
            { id: 'angry', name: '怒り' },
            { id: 'sad', name: '悲しみ' },
            { id: 'thinking', name: '考える' },
            { id: 'misc', name: 'その他' }
        ];
        
        tabs.innerHTML = categories.map(cat => `
            <button class="pe-motion-tab ${cat.id === 'all' ? 'active' : ''}" data-category="${cat.id}">
                ${cat.name}
            </button>
        `).join('');
        
        // クリックイベント
        tabs.querySelectorAll('.pe-motion-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                tabs.querySelectorAll('.pe-motion-tab').forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                
                const manager = window.characterPersonalityManager;
                const settings = this.getCurrentSettings();
                this.renderMotionTable(tab.dataset.category, settings);
            });
        });
    }
    
    /**
     * モーションテーブルを描画
     * 🆕 v1.5: カテゴリ変更ドロップダウン追加（ポップアップと連動）
     */
    renderMotionTable(category, settings) {
        const tbody = document.getElementById('pe-motion-tbody');
        const allMotions = window.ALL_MOTIONS;
        const categoryOverrides = settings.motionCategoryOverrides || {};
        
        // 全カテゴリリスト
        const allCategories = [
            { id: 'idle', name: '待機' },
            { id: 'talk_basic', name: 'しゃべり' },
            { id: 'happy', name: '嬉しい' },
            { id: 'happy_mild', name: 'ちょい嬉しい' },
            { id: 'happy_strong', name: '大喜び' },
            { id: 'sexy', name: 'セクシー' },
            { id: 'sexy_strong', name: '激セクシー' },
            { id: 'angry', name: '怒り' },
            { id: 'angry_strong', name: '激怒り' },
            { id: 'sad', name: '悲しみ' },
            { id: 'sad_strong', name: '大泣き' },
            { id: 'thinking', name: '考える' },
            { id: 'annoyed', name: 'うんざり' },
            { id: 'annoyed_strong', name: '激うんざり' },
            { id: 'spin_happy', name: 'ルンルン回転' },
            { id: 'exercise', name: '運動' },
            { id: 'normal', name: '通常' },
            { id: 'misc', name: 'その他' }
        ];
        
        let motions = [];
        if (category === 'all') {
            Object.values(allMotions).forEach(cat => motions.push(...cat));
        } else if (allMotions[category]) {
            motions = allMotions[category];
        }
        
        tbody.innerHTML = motions.map(motion => {
            const isPreferred = settings.preferredMotions?.includes(motion.file);
            const isExcluded = settings.excludedMotions?.includes(motion.file);
            const probability = settings.motionProbabilityBoost?.[motion.category] || 1.0;
            const currentCategory = categoryOverrides[motion.file] || motion.category;
            const isChanged = currentCategory !== motion.category;
            
            return `
                <tr class="${isChanged ? 'pe-motion-row-changed' : ''}">
                    <td>
                        <button class="pe-preview-btn" data-file="${motion.file}" title="プレビュー再生">
                            ▶
                        </button>
                    </td>
                    <td>
                        <input type="checkbox" class="pe-motion-checkbox preferred" 
                               data-file="${motion.file}" ${isPreferred ? 'checked' : ''}>
                    </td>
                    <td>
                        <input type="checkbox" class="pe-motion-checkbox excluded" 
                               data-file="${motion.file}" ${isExcluded ? 'checked' : ''}>
                    </td>
                    <td>
                        <div class="pe-motion-name">${motion.name}</div>
                        <div class="pe-motion-file">${motion.file}</div>
                    </td>
                    <td>
                        <select class="pe-category-select pe-table-category-select ${isChanged ? 'changed' : ''}" 
                                data-file="${motion.file}" 
                                data-original="${motion.category}">
                            ${allCategories.map(cat => `
                                <option value="${cat.id}" ${currentCategory === cat.id ? 'selected' : ''}>
                                    ${cat.name}
                                </option>
                            `).join('')}
                        </select>
                    </td>
                    <td>
                        <input type="number" class="pe-probability-input" 
                               data-category="${motion.category}" 
                               value="${probability}" min="0" max="5" step="0.1">
                    </td>
                </tr>
            `;
        }).join('');
        
        // プレビューボタンのイベントリスナーを設定
        tbody.querySelectorAll('.pe-preview-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const motionFile = btn.dataset.file;
                this.previewMotion(motionFile, btn);
            });
        });
        
        // 🆕 v1.5: テーブル内カテゴリ変更のイベントリスナー
        tbody.querySelectorAll('.pe-table-category-select').forEach(select => {
            select.addEventListener('change', (e) => {
                const motionFile = select.dataset.file;
                const originalCategory = select.dataset.original;
                const newCategory = select.value;
                const row = select.closest('tr');
                
                // 変更があればハイライト
                if (newCategory !== originalCategory) {
                    select.classList.add('changed');
                    row.classList.add('pe-motion-row-changed');
                } else {
                    select.classList.remove('changed');
                    row.classList.remove('pe-motion-row-changed');
                }
                
                // ポップアップが開いていれば連動
                this.syncCategoryToPopup(motionFile, newCategory);
                
                console.log(`🔄 テーブル カテゴリ変更: ${motionFile} : ${originalCategory} → ${newCategory}`);
            });
        });
    }
    
    /**
     * 🆕 v1.5: テーブルからポップアップへカテゴリ変更を連動
     */
    syncCategoryToPopup(motionFile, newCategory) {
        const popup = document.querySelector('.pe-category-popup');
        if (popup) {
            const popupSelect = popup.querySelector(`.pe-category-select[data-file="${motionFile}"]`);
            if (popupSelect && popupSelect.value !== newCategory) {
                popupSelect.value = newCategory;
                // 視覚的フィードバック
                const row = popupSelect.closest('.pe-category-motion-row');
                const originalCategory = popupSelect.dataset.original;
                if (newCategory !== originalCategory) {
                    row.style.background = 'rgba(102,126,234,0.2)';
                    row.style.borderLeft = '3px solid #667eea';
                } else {
                    row.style.background = '';
                    row.style.borderLeft = '';
                }
            }
        }
    }
    
    /**
     * 🆕 v1.5: ポップアップからテーブルへカテゴリ変更を連動
     */
    syncCategoryToTable(motionFile, newCategory) {
        const tableSelect = document.querySelector(`.pe-table-category-select[data-file="${motionFile}"]`);
        if (tableSelect && tableSelect.value !== newCategory) {
            tableSelect.value = newCategory;
            const row = tableSelect.closest('tr');
            const originalCategory = tableSelect.dataset.original;
            if (newCategory !== originalCategory) {
                tableSelect.classList.add('changed');
                row.classList.add('pe-motion-row-changed');
            } else {
                tableSelect.classList.remove('changed');
                row.classList.remove('pe-motion-row-changed');
            }
        }
    }
    
    /**
     * 🆕 モーションプレビュー再生
     * VRMモデルUIパネルで読み込まれたモデル（メインVRM）で再生
     */
    async previewMotion(motionFile, buttonElement) {
        console.log('▶️ プレビュー再生:', motionFile);
        
        // VRMモデルが読み込まれているか確認
        if (!window.app || !window.app.vrm) {
            alert('⚠️ VRMモデルを先に読み込んでください');
            return;
        }
        
        // ボタンを再生中状態に
        buttonElement.classList.add('playing');
        buttonElement.textContent = '⏹';
        
        try {
            // 既存のplayMotionByFilenameを使用
            if (typeof window.playMotionByFilename === 'function') {
                await window.playMotionByFilename(motionFile);
                console.log('✅ プレビュー再生開始:', motionFile);
            } else {
                // フォールバック: 直接再生
                console.warn('⚠️ playMotionByFilename が見つかりません、直接再生します');
                await this.playMotionDirect(motionFile);
            }
        } catch (error) {
            console.error('❌ プレビュー再生エラー:', error);
            alert('❌ モーションの再生に失敗しました\n' + error.message);
        }
        
        // 3秒後にボタンをリセット（再生は続く）
        setTimeout(() => {
            buttonElement.classList.remove('playing');
            buttonElement.textContent = '▶';
        }, 3000);
    }
    
    /**
     * モーション直接再生（フォールバック用）
     */
    async playMotionDirect(motionFile) {
        const THREE = window.THREE;
        const loader = new window.GLTFLoaderClass();
        const { VRMAnimationLoaderPlugin, createVRMAnimationClip } = await import('@pixiv/three-vrm-animation');
        
        loader.register((parser) => new VRMAnimationLoaderPlugin(parser));
        
        const gltf = await loader.loadAsync('./motions/' + encodeURIComponent(motionFile));
        const vrmAnim = gltf.userData.vrmAnimation || gltf.userData.vrmAnimations?.[0];
        
        if (!vrmAnim) {
            throw new Error('VRMアニメーションが見つかりません');
        }
        
        // 現在のアクションを停止
        if (window.app.currentAction) {
            window.app.currentAction.stop();
        }
        
        // mixer初期化
        if (!window.app.mixer) {
            window.app.mixer = new THREE.AnimationMixer(window.app.vrm.scene);
        }
        
        // クリップ作成・再生
        const clip = createVRMAnimationClip(vrmAnim, window.app.vrm);
        window.app.currentAction = window.app.mixer.clipAction(clip);
        window.app.currentAction.reset();
        window.app.currentAction.play();
        
        console.log('✅ モーション直接再生:', motionFile);
    }
    
    /**
     * 現在のUI状態から設定を取得
     * 🆕 v1.4: カテゴリオーバーライド対応
     */
    getCurrentSettings() {
        const manager = window.characterPersonalityManager;
        const baseSettings = manager.getSettings(this.currentCharacterId);
        
        // プリセット
        const selectedPreset = document.querySelector('.pe-preset-card.selected');
        const presetId = selectedPreset ? selectedPreset.dataset.preset : 'custom';
        
        // 表情設定
        const expressionMultiplier = parseFloat(document.getElementById('pe-expr-multiplier').value);
        const expressionHappyMultiplier = parseFloat(document.getElementById('pe-expr-happy').value);
        
        // 感情制限
        const motionEmotionRestrictions = [];
        document.querySelectorAll('.pe-restriction-chip.active').forEach(chip => {
            motionEmotionRestrictions.push(chip.dataset.category);
        });
        
        // モーション設定
        const preferredMotions = [];
        const excludedMotions = [];
        const motionProbabilityBoost = {};
        
        document.querySelectorAll('.pe-motion-checkbox.preferred:checked').forEach(cb => {
            preferredMotions.push(cb.dataset.file);
        });
        
        document.querySelectorAll('.pe-motion-checkbox.excluded:checked').forEach(cb => {
            excludedMotions.push(cb.dataset.file);
        });
        
        document.querySelectorAll('.pe-probability-input').forEach(input => {
            const cat = input.dataset.category;
            const val = parseFloat(input.value);
            if (val !== 1.0) {
                motionProbabilityBoost[cat] = val;
            }
        });
        
        // 🆕 v1.7: 待機モーション除外を収集
        // 🔧 v1.7.1: 内部状態から取得
        const excludedIdleMotions = this.tempExcludedIdleMotions 
            ? Array.from(this.tempExcludedIdleMotions) 
            : [];
        
        // 🆕 v1.5: カテゴリオーバーライドを収集（テーブルとポップアップ両方から）
        const motionCategoryOverrides = { ...(baseSettings.motionCategoryOverrides || {}) };
        
        // テーブルから収集
        document.querySelectorAll('.pe-table-category-select').forEach(select => {
            const motionFile = select.dataset.file;
            const originalCategory = select.dataset.original;
            const newCategory = select.value;
            
            if (newCategory !== originalCategory) {
                motionCategoryOverrides[motionFile] = newCategory;
            } else {
                // 元のカテゴリに戻した場合は削除
                delete motionCategoryOverrides[motionFile];
            }
        });
        
        // ポップアップからも収集（ポップアップが開いている場合はそちらを優先）
        const popup = document.querySelector('.pe-category-popup');
        if (popup) {
            popup.querySelectorAll('.pe-category-select').forEach(select => {
                const motionFile = select.dataset.file;
                const originalCategory = select.dataset.original;
                const newCategory = select.value;
                
                if (newCategory !== originalCategory) {
                    motionCategoryOverrides[motionFile] = newCategory;
                } else {
                    // 元のカテゴリに戻した場合は削除
                    delete motionCategoryOverrides[motionFile];
                }
            });
        }
        
        return {
            ...baseSettings,
            presetId,
            expressionMultiplier,
            expressionHappyMultiplier,
            motionEmotionRestrictions,
            preferredMotions,
            excludedMotions,
            motionProbabilityBoost,
            motionCategoryOverrides,
            excludedIdleMotions  // 🆕 v1.7: 待機モーション除外
        };
    }
    
    /**
     * 設定を保存
     */
    save() {
        const settings = this.getCurrentSettings();
        const manager = window.characterPersonalityManager;
        
        // 🔧 デバッグ: 保存する設定を確認
        console.log(`💾 保存する設定 (${this.currentCharacterId}):`, {
            presetId: settings.presetId,
            excludedIdleMotions: settings.excludedIdleMotions,
            excludedIdleMotionsCount: settings.excludedIdleMotions?.length || 0
        });
        
        // プリセットか、カスタムか判定
        if (settings.presetId !== 'custom') {
            manager.setPreset(this.currentCharacterId, settings.presetId);
        }
        
        // カスタム設定を上書き
        manager.updateSettings(this.currentCharacterId, settings);
        
        console.log(`✅ ${this.currentCharacterId} の個性設定を保存`);
        
        this.hide();
        
        // 完了通知
        alert(`✅ 個性設定を保存しました！\n\nプリセット: ${settings.presetId}\n表情強度: ${Math.round(settings.expressionMultiplier * 100)}%\n待機モーション除外: ${settings.excludedIdleMotions?.length || 0}件`);
    }
    
    /**
     * JSONエクスポート
     */
    exportJSON() {
        const settings = this.getCurrentSettings();
        
        const data = {
            version: '1.0',
            exportDate: new Date().toISOString(),
            characterId: this.currentCharacterId,
            settings: settings
        };
        
        const json = JSON.stringify(data, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `personality-${this.currentCharacterId}-${new Date().toISOString().slice(0,10)}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        console.log('💾 個性設定をJSONエクスポート');
    }
    
    /**
     * JSONインポート
     */
    importJSON(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target.result);
                
                if (data.settings) {
                    const manager = window.characterPersonalityManager;
                    manager.updateSettings(this.currentCharacterId, data.settings);
                    
                    // UIを更新
                    this.show(this.currentCharacterId, document.getElementById('pe-char-name').textContent);
                    
                    console.log('📂 個性設定をJSONインポート');
                    alert('✅ 個性設定を読み込みました');
                }
            } catch (err) {
                console.error('❌ JSONインポートエラー:', err);
                alert('❌ JSONファイルの読み込みに失敗しました');
            }
        };
        reader.readAsText(file);
    }
    
    /**
     * 全キャラクターの設定をJSONエクスポート
     */
    exportAllJSON() {
        const manager = window.characterPersonalityManager;
        const allCharacterIds = this.getAllCharacterIds();
        
        if (allCharacterIds.length === 0) {
            alert('⚠️ キャラクターが登録されていません');
            return;
        }
        
        // 全員分の設定を収集
        const allSettings = {};
        allCharacterIds.forEach(charId => {
            allSettings[charId] = manager.getSettings(charId);
        });
        
        const data = {
            version: '1.0',
            type: 'all_characters',
            exportDate: new Date().toISOString(),
            characterCount: allCharacterIds.length,
            characters: allSettings
        };
        
        const json = JSON.stringify(data, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `personality-all-characters-${new Date().toISOString().slice(0,10)}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        console.log(`💾 全${allCharacterIds.length}キャラクターの個性設定をエクスポート`);
        alert(`✅ ${allCharacterIds.length}人分の個性設定を保存しました\n\nキャラクター: ${allCharacterIds.join(', ')}`);
    }
    
    /**
     * 全キャラクターの設定をJSONインポート
     */
    importAllJSON(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target.result);
                
                if (data.type !== 'all_characters' || !data.characters) {
                    alert('⚠️ これは単体キャラクター用のファイルです。\n「JSON読込」ボタンを使用してください。');
                    return;
                }
                
                const manager = window.characterPersonalityManager;
                const importedChars = [];
                
                Object.entries(data.characters).forEach(([charId, settings]) => {
                    manager.updateSettings(charId, settings);
                    importedChars.push(charId);
                });
                
                if (this.currentCharacterId && importedChars.includes(this.currentCharacterId)) {
                    this.show(this.currentCharacterId, document.getElementById('pe-char-name').textContent);
                }
                
                console.log(`📂 全${importedChars.length}キャラクターの個性設定をインポート`);
                alert(`✅ ${importedChars.length}人分の個性設定を読み込みました\n\nキャラクター: ${importedChars.join(', ')}`);
                
            } catch (err) {
                console.error('❌ 全員分JSONインポートエラー:', err);
                alert('❌ JSONファイルの読み込みに失敗しました');
            }
        };
        reader.readAsText(file);
    }
    
    /**
     * マルチキャラ会話パネルから全キャラクターIDを取得
     */
    getAllCharacterIds() {
        const characterIds = [];
        
        // multiCharUI.characterConfigs から取得（メイン）
        if (window.multiCharUI && window.multiCharUI.characterConfigs) {
            const configs = window.multiCharUI.characterConfigs;
            if (Array.isArray(configs)) {
                configs.forEach(char => {
                    if (char && char.id && !characterIds.includes(char.id)) {
                        characterIds.push(char.id);
                    }
                });
            } else {
                Object.values(configs).forEach(char => {
                    if (char && char.id && !characterIds.includes(char.id)) {
                        characterIds.push(char.id);
                    }
                });
            }
        }
        
        // multiCharManager からも取得（バックアップ1）
        if (characterIds.length === 0 && window.multiCharManager && window.multiCharManager.characters) {
            const chars = window.multiCharManager.characters;
            if (Array.isArray(chars)) {
                chars.forEach(char => {
                    if (char && char.id && !characterIds.includes(char.id)) {
                        characterIds.push(char.id);
                    }
                });
            } else {
                Object.values(chars).forEach(char => {
                    if (char && char.id && !characterIds.includes(char.id)) {
                        characterIds.push(char.id);
                    }
                });
            }
        }
        
        // DOMからも取得（バックアップ2）
        if (characterIds.length === 0) {
            const charRows = document.querySelectorAll('.multi-char-row, [data-character-id]');
            charRows.forEach(row => {
                const charId = row.dataset.characterId;
                if (charId && !characterIds.includes(charId)) {
                    characterIds.push(charId);
                }
            });
        }
        
        // キャラクター個性マネージャーからも取得（バックアップ3）
        if (characterIds.length === 0 && window.characterPersonalityManager) {
            const manager = window.characterPersonalityManager;
            if (manager.settings) {
                Object.keys(manager.settings).forEach(charId => {
                    if (!characterIds.includes(charId)) {
                        characterIds.push(charId);
                    }
                });
            }
        }
        
        console.log('📋 取得したキャラクターID:', characterIds);
        return characterIds;
    }
}

// ========================================
// グローバル登録
// ========================================

window.CharacterPersonalityEditorUI = CharacterPersonalityEditorUI;

// インスタンス作成
if (!window.personalityEditorUI) {
    window.personalityEditorUI = new CharacterPersonalityEditorUI();
}

console.log('🎭 CharacterPersonalityEditorUI v1.7.1 読み込み完了（待機モーション保存修正）');

})();
