// ========================================
// Subtitle Display System v1.8
// 会話の字幕をリアルタイム表示 + グリッド制御
// v1.4: 重複グリッドを自動削除し1つだけ残す
// v1.5: 大きな字幕サイズ、フォント選択、文字色・枠線色選択機能追加
// v1.6: 背景ボックスのオンオフ、色・透明度設定機能追加
// v1.7: アニメーション種類、フェードアウト時間、横位置、複数行対応
// v1.8: 常に3行以内に制限（古い行を消す）、Shift+Tでトグル
// ========================================

(function() {
    'use strict';

    class SubtitleDisplay {
        constructor() {
            this.container = null;
            this.speakerName = null;
            this.textElement = null;
            this.subtitleBox = null;
            this.isVisible = false;
            this.currentText = '';
            this.hideTimeout = null;
            this.settings = {
                enabled: true,
                fontSize: 24,
                fontFamily: "'Yu Gothic', 'Meiryo', sans-serif",
                // 背景ボックス設定
                backgroundEnabled: true,
                backgroundColor: '#000000',
                backgroundOpacity: 0.75,
                // テキスト設定
                textColor: '#ffffff',
                strokeColor: '#000000',
                strokeWidth: 2,
                speakerColor: '#4ade80',
                // レイアウト設定
                position: 'bottom',
                horizontalAlign: 'center', // 'left', 'center', 'right'
                maxWidth: 80,
                showSpeakerName: true,
                // アニメーション設定
                animation: true,
                animationType: 'fade-up', // 'fade-up', 'fade', 'slide-left', 'slide-right', 'zoom', 'typewriter', 'bounce'
                fadeOutDuration: 0.5, // 秒
                typewriterSpeed: 50, // ミリ秒/文字（小さいほど速い）
                autoHideDelay: 3000, // ミリ秒（0で自動非表示なし）
                // 複数行設定
                maxLines: 3,
                lineHeight: 1.5
            };
            
            // 利用可能なフォント一覧
            this.availableFonts = [
                { name: 'Yu Gothic', value: "'Yu Gothic', 'Meiryo', sans-serif", label: '游ゴシック' },
                { name: 'Meiryo', value: "'Meiryo', 'Yu Gothic', sans-serif", label: 'メイリオ' },
                { name: 'MS Gothic', value: "'MS Gothic', 'Yu Gothic', monospace", label: 'ＭＳ ゴシック' },
                { name: 'MS Mincho', value: "'MS Mincho', 'Yu Mincho', serif", label: 'ＭＳ 明朝' },
                { name: 'Yu Mincho', value: "'Yu Mincho', 'MS Mincho', serif", label: '游明朝' },
                { name: 'Hiragino Sans', value: "'Hiragino Sans', 'Hiragino Kaku Gothic ProN', sans-serif", label: 'ヒラギノ角ゴ' },
                { name: 'Noto Sans JP', value: "'Noto Sans JP', 'Yu Gothic', sans-serif", label: 'Noto Sans JP' },
                { name: 'BIZ UDGothic', value: "'BIZ UDGothic', 'Yu Gothic', sans-serif", label: 'BIZ UDゴシック' },
                { name: 'Impact', value: "'Impact', 'Arial Black', sans-serif", label: 'Impact（太字）' },
                { name: 'Arial Black', value: "'Arial Black', 'Helvetica', sans-serif", label: 'Arial Black' },
                { name: 'Comic Sans MS', value: "'Comic Sans MS', cursive", label: 'Comic Sans' },
                { name: 'Segoe UI', value: "'Segoe UI', sans-serif", label: 'Segoe UI' },
            ];
            
            // アニメーション種類
            this.animationTypes = [
                { value: 'fade-up', label: 'フェードアップ' },
                { value: 'fade', label: 'フェード' },
                { value: 'slide-left', label: 'スライド（左から）' },
                { value: 'slide-right', label: 'スライド（右から）' },
                { value: 'zoom', label: 'ズーム' },
                { value: 'bounce', label: 'バウンス' },
                { value: 'typewriter', label: 'タイプライター' },
                { value: 'none', label: 'なし' },
            ];
            
            // プリセットカラー
            this.presetColors = [
                { name: '白', value: '#ffffff' },
                { name: '黄色', value: '#ffff00' },
                { name: '水色', value: '#00ffff' },
                { name: 'ピンク', value: '#ff69b4' },
                { name: '緑', value: '#00ff00' },
                { name: 'オレンジ', value: '#ffa500' },
                { name: '赤', value: '#ff0000' },
                { name: '青', value: '#0080ff' },
                { name: '紫', value: '#9966ff' },
                { name: '金色', value: '#ffd700' },
            ];
            
            this.presetStrokeColors = [
                { name: '黒', value: '#000000' },
                { name: '濃紺', value: '#1a1a3a' },
                { name: '茶色', value: '#4a2c00' },
                { name: '深緑', value: '#003300' },
                { name: '紺', value: '#000066' },
                { name: '濃赤', value: '#660000' },
                { name: '白', value: '#ffffff' },
                { name: 'なし', value: 'transparent' },
            ];
            
            // 背景色プリセット
            this.presetBackgroundColors = [
                { name: '黒', value: '#000000' },
                { name: '濃紺', value: '#1a1a3a' },
                { name: '紺', value: '#000033' },
                { name: '深緑', value: '#002200' },
                { name: '茶色', value: '#2a1a00' },
                { name: '濃赤', value: '#330000' },
                { name: '紫', value: '#1a001a' },
                { name: '白', value: '#ffffff' },
                { name: 'グレー', value: '#333333' },
                { name: '青', value: '#001144' },
            ];
            
            this.typewriterInterval = null;
            
            this.loadSettings();
            this.init();
            this.setupKeyboardShortcuts();
        }

        init() {
            this.createSubtitleUI();
            this.createSettingsPanel();
            this.setupEventListeners();
            console.log('📺 SubtitleDisplay v1.8 初期化完了');
        }

        createSubtitleUI() {
            // メインコンテナ
            this.container = document.createElement('div');
            this.container.id = 'subtitle-container';
            this.container.innerHTML = `
                <div class="subtitle-box">
                    <span class="subtitle-speaker"></span>
                    <span class="subtitle-text"></span>
                </div>
            `;
            
            // スタイル追加
            const style = document.createElement('style');
            style.id = 'subtitle-styles';
            style.textContent = `
                #subtitle-container {
                    position: fixed;
                    bottom: 60px;
                    left: 50%;
                    transform: translateX(-50%);
                    z-index: 999999;
                    pointer-events: none;
                    opacity: 0;
                    display: none;
                    max-width: 90%;
                    transition: opacity var(--fade-duration, 0.5s) ease;
                }
                
                #subtitle-container.visible {
                    display: block;
                    opacity: 1;
                }
                
                #subtitle-container.top {
                    bottom: auto;
                    top: 60px;
                }
                
                /* 横位置 */
                #subtitle-container.align-left {
                    left: 20px;
                    transform: translateX(0);
                }
                
                #subtitle-container.align-center {
                    left: 50%;
                    transform: translateX(-50%);
                }
                
                #subtitle-container.align-right {
                    left: auto;
                    right: 20px;
                    transform: translateX(0);
                }
                
                .subtitle-box {
                    background: rgba(0, 0, 0, 0.75);
                    padding: 12px 24px;
                    border-radius: 8px;
                    backdrop-filter: blur(4px);
                    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
                    transition: background 0.3s ease;
                    text-align: center;
                }
                
                .subtitle-box.text-left {
                    text-align: left;
                }
                
                .subtitle-box.text-center {
                    text-align: center;
                }
                
                .subtitle-box.text-right {
                    text-align: right;
                }
                
                .subtitle-box.no-background {
                    background: transparent !important;
                    backdrop-filter: none;
                    box-shadow: none;
                }
                
                .subtitle-speaker {
                    color: #4ade80;
                    font-weight: bold;
                    font-size: 18px;
                    margin-right: 8px;
                    font-family: 'Yu Gothic', 'Meiryo', sans-serif;
                    display: inline;
                }
                
                .subtitle-speaker:empty {
                    display: none;
                }
                
                .subtitle-text {
                    color: #ffffff;
                    font-size: 24px;
                    font-family: 'Yu Gothic', 'Meiryo', sans-serif;
                    line-height: 1.5;
                    text-shadow: 
                        -2px -2px 0 #000,
                         2px -2px 0 #000,
                        -2px  2px 0 #000,
                         2px  2px 0 #000,
                        -2px  0   0 #000,
                         2px  0   0 #000,
                         0   -2px 0 #000,
                         0    2px 0 #000;
                    white-space: pre-wrap;
                    word-wrap: break-word;
                    display: inline;
                }
                
                /* ===== アニメーション定義 ===== */
                
                /* フェードアップ */
                @keyframes subtitle-fade-up {
                    from {
                        opacity: 0;
                        transform: translateY(20px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }
                
                /* フェード */
                @keyframes subtitle-fade {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                
                /* スライド（左から） */
                @keyframes subtitle-slide-left {
                    from {
                        opacity: 0;
                        transform: translateX(-50px);
                    }
                    to {
                        opacity: 1;
                        transform: translateX(0);
                    }
                }
                
                /* スライド（右から） */
                @keyframes subtitle-slide-right {
                    from {
                        opacity: 0;
                        transform: translateX(50px);
                    }
                    to {
                        opacity: 1;
                        transform: translateX(0);
                    }
                }
                
                /* ズーム */
                @keyframes subtitle-zoom {
                    from {
                        opacity: 0;
                        transform: scale(0.5);
                    }
                    to {
                        opacity: 1;
                        transform: scale(1);
                    }
                }
                
                /* バウンス */
                @keyframes subtitle-bounce {
                    0% {
                        opacity: 0;
                        transform: translateY(-30px);
                    }
                    50% {
                        opacity: 1;
                        transform: translateY(10px);
                    }
                    70% {
                        transform: translateY(-5px);
                    }
                    100% {
                        transform: translateY(0);
                    }
                }
                
                /* タイプライター カーソル */
                @keyframes blink-cursor {
                    from, to { border-color: transparent; }
                    50% { border-color: currentColor; }
                }
                
                /* アニメーションクラス */
                #subtitle-container.animate-fade-up .subtitle-box {
                    animation: subtitle-fade-up 0.3s ease-out;
                }
                
                #subtitle-container.animate-fade .subtitle-box {
                    animation: subtitle-fade 0.3s ease-out;
                }
                
                #subtitle-container.animate-slide-left .subtitle-box {
                    animation: subtitle-slide-left 0.3s ease-out;
                }
                
                #subtitle-container.animate-slide-right .subtitle-box {
                    animation: subtitle-slide-right 0.3s ease-out;
                }
                
                #subtitle-container.animate-zoom .subtitle-box {
                    animation: subtitle-zoom 0.3s ease-out;
                }
                
                #subtitle-container.animate-bounce .subtitle-box {
                    animation: subtitle-bounce 0.5s ease-out;
                }
                
                #subtitle-container.typewriter .subtitle-text {
                    border-right: 2px solid currentColor;
                    animation: blink-cursor 0.7s step-end infinite;
                }
                
                /* 設定パネル v1.7 拡張版 */
                #subtitle-settings-panel {
                    position: fixed;
                    bottom: 50px;
                    left: 50%;
                    transform: translateX(-50%);
                    background: rgba(20, 20, 40, 0.97);
                    padding: 15px 20px;
                    border-radius: 12px;
                    z-index: 10000;
                    display: none;
                    flex-direction: column;
                    gap: 8px;
                    font-family: 'Yu Gothic', 'Segoe UI', sans-serif;
                    font-size: 12px;
                    color: #e0e0e0;
                    backdrop-filter: blur(10px);
                    box-shadow: 0 8px 30px rgba(0, 0, 0, 0.5);
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    max-width: 500px;
                    width: 95vw;
                    max-height: 75vh;
                    overflow-y: auto;
                }
                
                #subtitle-settings-panel.visible {
                    display: flex;
                }
                
                #subtitle-settings-panel .panel-title {
                    font-size: 14px;
                    font-weight: bold;
                    color: #4ade80;
                    margin-bottom: 5px;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    position: sticky;
                    top: -15px;
                    background: rgba(20, 20, 40, 0.97);
                    padding: 10px 0;
                    margin: -15px -20px 10px -20px;
                    padding: 15px 20px 10px 20px;
                    z-index: 1;
                }
                
                #subtitle-settings-panel .setting-row {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    flex-wrap: wrap;
                    min-height: 32px;
                }
                
                #subtitle-settings-panel .setting-label {
                    min-width: 90px;
                    color: #aaa;
                    font-size: 11px;
                }
                
                #subtitle-settings-panel .setting-control {
                    flex: 1;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    flex-wrap: wrap;
                }
                
                #subtitle-settings-panel input[type="checkbox"] {
                    accent-color: #4ade80;
                    width: 16px;
                    height: 16px;
                }
                
                #subtitle-settings-panel input[type="range"] {
                    flex: 1;
                    min-width: 80px;
                    height: 6px;
                    background: #333;
                    border-radius: 3px;
                    -webkit-appearance: none;
                }
                
                #subtitle-settings-panel input[type="range"]::-webkit-slider-thumb {
                    -webkit-appearance: none;
                    width: 16px;
                    height: 16px;
                    background: #4ade80;
                    border-radius: 50%;
                    cursor: pointer;
                }
                
                #subtitle-settings-panel input[type="color"] {
                    width: 32px;
                    height: 32px;
                    border: none;
                    border-radius: 6px;
                    cursor: pointer;
                    background: none;
                    padding: 0;
                }
                
                #subtitle-settings-panel select {
                    background: #333;
                    border: 1px solid #555;
                    color: #fff;
                    padding: 6px 10px;
                    border-radius: 6px;
                    font-size: 11px;
                    cursor: pointer;
                    min-width: 120px;
                }
                
                #subtitle-settings-panel select:hover {
                    background: #444;
                }
                
                #subtitle-settings-panel .color-presets {
                    display: flex;
                    gap: 4px;
                    flex-wrap: wrap;
                }
                
                #subtitle-settings-panel .color-preset {
                    width: 20px;
                    height: 20px;
                    border-radius: 4px;
                    border: 2px solid transparent;
                    cursor: pointer;
                    transition: all 0.2s;
                }
                
                #subtitle-settings-panel .color-preset:hover {
                    transform: scale(1.15);
                }
                
                #subtitle-settings-panel .color-preset.selected {
                    border-color: #4ade80;
                    box-shadow: 0 0 8px rgba(74, 222, 128, 0.5);
                }
                
                #subtitle-settings-panel .close-btn {
                    background: #ef4444;
                    border: none;
                    color: white;
                    width: 24px;
                    height: 24px;
                    border-radius: 50%;
                    cursor: pointer;
                    font-size: 14px;
                    transition: all 0.2s;
                }
                
                #subtitle-settings-panel .close-btn:hover {
                    background: #dc2626;
                    transform: scale(1.1);
                }
                
                #subtitle-settings-panel .section-title {
                    font-size: 12px;
                    font-weight: bold;
                    color: #8b5cf6;
                    margin-top: 8px;
                    padding-bottom: 5px;
                    border-bottom: 1px solid rgba(139, 92, 246, 0.3);
                }
                
                #subtitle-settings-panel .section-divider {
                    height: 1px;
                    background: rgba(255, 255, 255, 0.1);
                    margin: 3px 0;
                }
                
                #subtitle-settings-panel .value-display {
                    min-width: 50px;
                    text-align: right;
                    color: #4ade80;
                    font-weight: bold;
                    font-size: 11px;
                }
                
                /* 字幕トグルボタン */
                #subtitle-toggle-btn {
                    position: fixed;
                    bottom: 15px;
                    right: 180px;  /* ★ 右寄せに変更 */
                    left: auto;
                    transform: none;
                    background: linear-gradient(135deg, #4ade80 0%, #22c55e 100%);
                    border: none;
                    color: white;
                    padding: 6px 14px;
                    border-radius: 16px;
                    cursor: pointer;
                    font-size: 11px;
                    font-weight: bold;
                    z-index: 10000;
                    box-shadow: 0 2px 10px rgba(74, 222, 128, 0.4);
                    transition: all 0.2s;
                    font-family: 'Segoe UI', 'Yu Gothic', sans-serif;
                }
                
                #subtitle-toggle-btn:hover {
                    transform: scale(1.05);
                }
                
                #subtitle-toggle-btn.off {
                    background: linear-gradient(135deg, #666 0%, #444 100%);
                    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.3);
                }
                
                /* グリッドトグルボタン */
                #grid-toggle-btn {
                    position: fixed;
                    bottom: 15px;
                    right: 80px;  /* ★ 右寄せに変更 */
                    left: auto;
                    transform: none;
                    background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%);
                    border: none;
                    color: white;
                    padding: 6px 14px;
                    border-radius: 16px;
                    cursor: pointer;
                    font-size: 11px;
                    font-weight: bold;
                    z-index: 10000;
                    box-shadow: 0 2px 10px rgba(139, 92, 246, 0.4);
                    transition: all 0.2s;
                    font-family: 'Segoe UI', 'Yu Gothic', sans-serif;
                }
                
                #grid-toggle-btn:hover {
                    transform: scale(1.05);
                }
                
                #grid-toggle-btn.off {
                    background: linear-gradient(135deg, #666 0%, #444 100%);
                    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.3);
                }
                
                /* 字幕設定ボタン */
                #subtitle-settings-btn {
                    position: fixed;
                    bottom: 15px;
                    right: 275px;  /* ★ 右寄せに変更 */
                    left: auto;
                    transform: none;
                    background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
                    border: none;
                    color: white;
                    padding: 6px 14px;
                    border-radius: 16px;
                    cursor: pointer;
                    font-size: 11px;
                    font-weight: bold;
                    z-index: 10000;
                    box-shadow: 0 2px 10px rgba(245, 158, 11, 0.4);
                    transition: all 0.2s;
                    font-family: 'Segoe UI', 'Yu Gothic', sans-serif;
                }
                
                #subtitle-settings-btn:hover {
                    transform: scale(1.05);
                }
                
                /* プレビューエリア */
                #subtitle-preview-area {
                    padding: 15px;
                    border-radius: 8px;
                    margin-top: 5px;
                    transition: all 0.3s ease;
                    min-height: 60px;
                }
                
                #subtitle-preview-text {
                    font-size: 24px;
                    white-space: pre-wrap;
                    word-wrap: break-word;
                }
                
                /* 設定がOFFの時のグレーアウト */
                .setting-row.disabled {
                    opacity: 0.4;
                    pointer-events: none;
                }
                
                /* 横位置選択ボタングループ */
                .align-btn-group {
                    display: flex;
                    gap: 4px;
                }
                
                .align-btn {
                    background: #333;
                    border: 1px solid #555;
                    color: #fff;
                    padding: 6px 12px;
                    border-radius: 4px;
                    cursor: pointer;
                    font-size: 11px;
                    transition: all 0.2s;
                }
                
                .align-btn:hover {
                    background: #444;
                }
                
                .align-btn.active {
                    background: #4ade80;
                    border-color: #4ade80;
                    color: #000;
                }
            `;
            
            document.head.appendChild(style);
            document.body.appendChild(this.container);
            
            this.speakerElement = this.container.querySelector('.subtitle-speaker');
            this.textElement = this.container.querySelector('.subtitle-text');
            this.subtitleBox = this.container.querySelector('.subtitle-box');
            
            // 初期設定を適用
            this.applyTextStyles();
            this.applyBackgroundStyles();
            this.applyLayoutStyles();
        }

        createSettingsPanel() {
            // トグルボタン
            const toggleBtn = document.createElement('button');
            toggleBtn.id = 'subtitle-toggle-btn';
            toggleBtn.innerHTML = '📺 字幕 ON';
            toggleBtn.addEventListener('click', () => {
                this.toggleSubtitles();
            });
            document.body.appendChild(toggleBtn);
            
            // 設定ボタン
            const settingsBtn = document.createElement('button');
            settingsBtn.id = 'subtitle-settings-btn';
            settingsBtn.innerHTML = '⚙️ 字幕設定';
            settingsBtn.addEventListener('click', () => {
                this.toggleSettingsPanel();
            });
            document.body.appendChild(settingsBtn);
            
            // グリッドトグルボタン
            const gridBtn = document.createElement('button');
            gridBtn.id = 'grid-toggle-btn';
            gridBtn.innerHTML = '⛶ グリッド ON';
            const self = this;
            gridBtn.addEventListener('click', function() {
                self.toggleGrid();
            });
            document.body.appendChild(gridBtn);
            
            // グリッド状態を保存から復元
            this.gridEnabled = this.loadGridState();
            setTimeout(() => this.applyGridState(), 100);
            
            // 設定パネル v1.7
            const panel = document.createElement('div');
            panel.id = 'subtitle-settings-panel';
            panel.innerHTML = `
                <div class="panel-title">
                    <span>📺 字幕設定 v1.7</span>
                    <button class="close-btn" id="subtitle-settings-close">×</button>
                </div>
                
                <!-- ===== 文字設定セクション ===== -->
                <div class="section-title">📝 文字設定</div>
                
                <!-- サイズ設定 -->
                <div class="setting-row">
                    <span class="setting-label">文字サイズ:</span>
                    <div class="setting-control">
                        <input type="range" id="subtitle-size" min="16" max="72" value="${this.settings.fontSize}">
                        <span class="value-display" id="subtitle-size-val">${this.settings.fontSize}px</span>
                    </div>
                </div>
                
                <!-- フォント選択 -->
                <div class="setting-row">
                    <span class="setting-label">フォント:</span>
                    <div class="setting-control">
                        <select id="subtitle-font">
                            ${this.availableFonts.map(f => 
                                `<option value="${f.value}" ${this.settings.fontFamily === f.value ? 'selected' : ''}>${f.label}</option>`
                            ).join('')}
                        </select>
                    </div>
                </div>
                
                <!-- 文字色 -->
                <div class="setting-row">
                    <span class="setting-label">文字色:</span>
                    <div class="setting-control">
                        <input type="color" id="subtitle-text-color" value="${this.settings.textColor}">
                        <div class="color-presets" id="text-color-presets">
                            ${this.presetColors.map(c => 
                                `<div class="color-preset ${this.settings.textColor === c.value ? 'selected' : ''}" 
                                     data-color="${c.value}" 
                                     style="background: ${c.value}; ${c.value === '#ffffff' ? 'border: 1px solid #555;' : ''}" 
                                     title="${c.name}"></div>`
                            ).join('')}
                        </div>
                    </div>
                </div>
                
                <!-- 枠線色 -->
                <div class="setting-row">
                    <span class="setting-label">文字の縁:</span>
                    <div class="setting-control">
                        <input type="color" id="subtitle-stroke-color" value="${this.settings.strokeColor}">
                        <div class="color-presets" id="stroke-color-presets">
                            ${this.presetStrokeColors.map(c => 
                                `<div class="color-preset ${this.settings.strokeColor === c.value ? 'selected' : ''}" 
                                     data-color="${c.value}" 
                                     style="background: ${c.value === 'transparent' ? 'linear-gradient(45deg, #ccc 25%, transparent 25%, transparent 75%, #ccc 75%), linear-gradient(45deg, #ccc 25%, transparent 25%, transparent 75%, #ccc 75%)' : c.value}; 
                                            background-size: 8px 8px; background-position: 0 0, 4px 4px;
                                            ${c.value === '#ffffff' ? 'border: 1px solid #555;' : ''}" 
                                     title="${c.name}"></div>`
                            ).join('')}
                        </div>
                    </div>
                </div>
                
                <!-- 枠線太さ -->
                <div class="setting-row">
                    <span class="setting-label">縁の太さ:</span>
                    <div class="setting-control">
                        <input type="range" id="subtitle-stroke-width" min="0" max="6" value="${this.settings.strokeWidth}">
                        <span class="value-display" id="subtitle-stroke-val">${this.settings.strokeWidth}px</span>
                    </div>
                </div>
                
                <!-- 話者名色 -->
                <div class="setting-row">
                    <span class="setting-label">話者名色:</span>
                    <div class="setting-control">
                        <input type="color" id="subtitle-speaker-color" value="${this.settings.speakerColor}">
                        <div class="color-presets" id="speaker-color-presets">
                            ${this.presetColors.map(c => 
                                `<div class="color-preset ${this.settings.speakerColor === c.value ? 'selected' : ''}" 
                                     data-color="${c.value}" 
                                     style="background: ${c.value}; ${c.value === '#ffffff' ? 'border: 1px solid #555;' : ''}" 
                                     title="${c.name}"></div>`
                            ).join('')}
                        </div>
                    </div>
                </div>
                
                <!-- ===== 背景ボックス設定セクション ===== -->
                <div class="section-title">🎨 背景ボックス設定</div>
                
                <!-- 背景ON/OFF -->
                <div class="setting-row">
                    <span class="setting-label">背景表示:</span>
                    <div class="setting-control">
                        <input type="checkbox" id="subtitle-bg-enabled" ${this.settings.backgroundEnabled ? 'checked' : ''}>
                        <label for="subtitle-bg-enabled">背景ボックスを表示する</label>
                    </div>
                </div>
                
                <!-- 背景色 -->
                <div class="setting-row" id="bg-color-row">
                    <span class="setting-label">背景色:</span>
                    <div class="setting-control">
                        <input type="color" id="subtitle-bg-color" value="${this.settings.backgroundColor}">
                        <div class="color-presets" id="bg-color-presets">
                            ${this.presetBackgroundColors.map(c => 
                                `<div class="color-preset ${this.settings.backgroundColor === c.value ? 'selected' : ''}" 
                                     data-color="${c.value}" 
                                     style="background: ${c.value}; ${c.value === '#ffffff' ? 'border: 1px solid #555;' : ''}" 
                                     title="${c.name}"></div>`
                            ).join('')}
                        </div>
                    </div>
                </div>
                
                <!-- 背景透明度 -->
                <div class="setting-row" id="bg-opacity-row">
                    <span class="setting-label">背景透明度:</span>
                    <div class="setting-control">
                        <input type="range" id="subtitle-bg-opacity" min="0" max="100" value="${Math.round(this.settings.backgroundOpacity * 100)}">
                        <span class="value-display" id="subtitle-bg-opacity-val">${Math.round(this.settings.backgroundOpacity * 100)}%</span>
                    </div>
                </div>
                
                <!-- ===== レイアウト設定セクション ===== -->
                <div class="section-title">📐 レイアウト設定</div>
                
                <!-- 縦位置 -->
                <div class="setting-row">
                    <span class="setting-label">縦位置:</span>
                    <div class="setting-control">
                        <select id="subtitle-position">
                            <option value="bottom" ${this.settings.position === 'bottom' ? 'selected' : ''}>画面下</option>
                            <option value="top" ${this.settings.position === 'top' ? 'selected' : ''}>画面上</option>
                        </select>
                    </div>
                </div>
                
                <!-- 横位置 -->
                <div class="setting-row">
                    <span class="setting-label">横位置:</span>
                    <div class="setting-control">
                        <div class="align-btn-group">
                            <button class="align-btn ${this.settings.horizontalAlign === 'left' ? 'active' : ''}" data-align="left">◀ 左</button>
                            <button class="align-btn ${this.settings.horizontalAlign === 'center' ? 'active' : ''}" data-align="center">中央</button>
                            <button class="align-btn ${this.settings.horizontalAlign === 'right' ? 'active' : ''}" data-align="right">右 ▶</button>
                        </div>
                    </div>
                </div>
                
                <!-- 複数行設定 -->
                <div class="setting-row">
                    <span class="setting-label">最大行数:</span>
                    <div class="setting-control">
                        <input type="range" id="subtitle-max-lines" min="1" max="6" value="${this.settings.maxLines}">
                        <span class="value-display" id="subtitle-max-lines-val">${this.settings.maxLines}行</span>
                    </div>
                </div>
                
                <!-- 行間 -->
                <div class="setting-row">
                    <span class="setting-label">行間:</span>
                    <div class="setting-control">
                        <input type="range" id="subtitle-line-height" min="100" max="250" value="${Math.round(this.settings.lineHeight * 100)}">
                        <span class="value-display" id="subtitle-line-height-val">${Math.round(this.settings.lineHeight * 100)}%</span>
                    </div>
                </div>
                
                <!-- 話者名・アニメーション -->
                <div class="setting-row">
                    <div class="setting-control">
                        <input type="checkbox" id="subtitle-speaker-toggle" ${this.settings.showSpeakerName ? 'checked' : ''}>
                        <label for="subtitle-speaker-toggle">話者名を表示</label>
                    </div>
                </div>
                
                <!-- ===== アニメーション設定セクション ===== -->
                <div class="section-title">✨ アニメーション設定</div>
                
                <!-- アニメーションON/OFF -->
                <div class="setting-row">
                    <span class="setting-label">アニメ有効:</span>
                    <div class="setting-control">
                        <input type="checkbox" id="subtitle-animation-toggle" ${this.settings.animation ? 'checked' : ''}>
                        <label for="subtitle-animation-toggle">表示アニメーションを有効にする</label>
                    </div>
                </div>
                
                <!-- アニメーション種類 -->
                <div class="setting-row" id="animation-type-row">
                    <span class="setting-label">表示効果:</span>
                    <div class="setting-control">
                        <select id="subtitle-animation-type">
                            ${this.animationTypes.map(a => 
                                `<option value="${a.value}" ${this.settings.animationType === a.value ? 'selected' : ''}>${a.label}</option>`
                            ).join('')}
                        </select>
                    </div>
                </div>
                
                <!-- タイプライター速度 -->
                <div class="setting-row" id="typewriter-speed-row">
                    <span class="setting-label">タイプ速度:</span>
                    <div class="setting-control">
                        <input type="range" id="subtitle-typewriter-speed" min="10" max="500" value="${this.settings.typewriterSpeed}">
                        <span class="value-display" id="subtitle-typewriter-speed-val">${this.settings.typewriterSpeed}ms</span>
                    </div>
                </div>
                
                <!-- フェードアウト時間 -->
                <div class="setting-row">
                    <span class="setting-label">消える速度:</span>
                    <div class="setting-control">
                        <input type="range" id="subtitle-fade-duration" min="0" max="3000" value="${Math.round(this.settings.fadeOutDuration * 100)}">
                        <span class="value-display" id="subtitle-fade-duration-val">${this.settings.fadeOutDuration.toFixed(1)}秒</span>
                    </div>
                </div>
                
                <!-- 自動非表示時間 -->
                <div class="setting-row">
                    <span class="setting-label">自動消去:</span>
                    <div class="setting-control">
                        <input type="range" id="subtitle-auto-hide" min="0" max="10000" step="500" value="${this.settings.autoHideDelay}">
                        <span class="value-display" id="subtitle-auto-hide-val">${this.settings.autoHideDelay === 0 ? 'OFF' : (this.settings.autoHideDelay / 1000).toFixed(1) + '秒'}</span>
                    </div>
                </div>
                
                <!-- ===== プレビュー ===== -->
                <div class="section-title">👁️ プレビュー</div>
                <div id="subtitle-preview-area">
                    <span id="subtitle-preview-speaker" style="color: ${this.settings.speakerColor}; font-weight: bold; margin-right: 8px;">話者名:</span>
                    <span id="subtitle-preview-text" style="color: ${this.settings.textColor}; font-family: ${this.settings.fontFamily};">プレビューテキスト
複数行のテキストも
このように表示されます</span>
                </div>
                
                <!-- テストボタン -->
                <div class="setting-row" style="justify-content: center; margin-top: 10px;">
                    <button id="subtitle-test-btn" style="background: #4ade80; border: none; color: #000; padding: 8px 20px; border-radius: 8px; cursor: pointer; font-weight: bold;">
                        🎬 アニメーションテスト
                    </button>
                </div>
            `;
            document.body.appendChild(panel);
            this.settingsPanel = panel;
            
            // イベントリスナー設定
            this.setupSettingsPanelEvents();
            
            // 初期状態で背景設定の有効/無効を設定
            this.updateBackgroundSettingsState();
            this.updateAnimationSettingsState();
        }
        
        setupSettingsPanelEvents() {
            // サイズ
            document.getElementById('subtitle-size').addEventListener('input', (e) => {
                this.settings.fontSize = parseInt(e.target.value);
                document.getElementById('subtitle-size-val').textContent = this.settings.fontSize + 'px';
                this.applyTextStyles();
                this.updatePreview();
            });
            
            // フォント
            document.getElementById('subtitle-font').addEventListener('change', (e) => {
                this.settings.fontFamily = e.target.value;
                this.applyTextStyles();
                this.updatePreview();
            });
            
            // 文字色 - カラーピッカー
            document.getElementById('subtitle-text-color').addEventListener('input', (e) => {
                this.settings.textColor = e.target.value;
                this.updateColorPresetSelection('text-color-presets', e.target.value);
                this.applyTextStyles();
                this.updatePreview();
            });
            
            // 文字色 - プリセット
            document.getElementById('text-color-presets').addEventListener('click', (e) => {
                if (e.target.classList.contains('color-preset')) {
                    const color = e.target.dataset.color;
                    this.settings.textColor = color;
                    document.getElementById('subtitle-text-color').value = color;
                    this.updateColorPresetSelection('text-color-presets', color);
                    this.applyTextStyles();
                    this.updatePreview();
                }
            });
            
            // 枠線色 - カラーピッカー
            document.getElementById('subtitle-stroke-color').addEventListener('input', (e) => {
                this.settings.strokeColor = e.target.value;
                this.updateColorPresetSelection('stroke-color-presets', e.target.value);
                this.applyTextStyles();
                this.updatePreview();
            });
            
            // 枠線色 - プリセット
            document.getElementById('stroke-color-presets').addEventListener('click', (e) => {
                if (e.target.classList.contains('color-preset')) {
                    const color = e.target.dataset.color;
                    this.settings.strokeColor = color;
                    if (color !== 'transparent') {
                        document.getElementById('subtitle-stroke-color').value = color;
                    }
                    this.updateColorPresetSelection('stroke-color-presets', color);
                    this.applyTextStyles();
                    this.updatePreview();
                }
            });
            
            // 枠線太さ
            document.getElementById('subtitle-stroke-width').addEventListener('input', (e) => {
                this.settings.strokeWidth = parseInt(e.target.value);
                document.getElementById('subtitle-stroke-val').textContent = this.settings.strokeWidth + 'px';
                this.applyTextStyles();
                this.updatePreview();
            });
            
            // 話者名色 - カラーピッカー
            document.getElementById('subtitle-speaker-color').addEventListener('input', (e) => {
                this.settings.speakerColor = e.target.value;
                this.updateColorPresetSelection('speaker-color-presets', e.target.value);
                this.applyTextStyles();
                this.updatePreview();
            });
            
            // 話者名色 - プリセット
            document.getElementById('speaker-color-presets').addEventListener('click', (e) => {
                if (e.target.classList.contains('color-preset')) {
                    const color = e.target.dataset.color;
                    this.settings.speakerColor = color;
                    document.getElementById('subtitle-speaker-color').value = color;
                    this.updateColorPresetSelection('speaker-color-presets', color);
                    this.applyTextStyles();
                    this.updatePreview();
                }
            });
            
            // === 背景設定 ===
            
            // 背景ON/OFF
            document.getElementById('subtitle-bg-enabled').addEventListener('change', (e) => {
                this.settings.backgroundEnabled = e.target.checked;
                this.applyBackgroundStyles();
                this.updateBackgroundSettingsState();
                this.updatePreview();
            });
            
            // 背景色 - カラーピッカー
            document.getElementById('subtitle-bg-color').addEventListener('input', (e) => {
                this.settings.backgroundColor = e.target.value;
                this.updateColorPresetSelection('bg-color-presets', e.target.value);
                this.applyBackgroundStyles();
                this.updatePreview();
            });
            
            // 背景色 - プリセット
            document.getElementById('bg-color-presets').addEventListener('click', (e) => {
                if (e.target.classList.contains('color-preset')) {
                    const color = e.target.dataset.color;
                    this.settings.backgroundColor = color;
                    document.getElementById('subtitle-bg-color').value = color;
                    this.updateColorPresetSelection('bg-color-presets', color);
                    this.applyBackgroundStyles();
                    this.updatePreview();
                }
            });
            
            // 背景透明度
            document.getElementById('subtitle-bg-opacity').addEventListener('input', (e) => {
                this.settings.backgroundOpacity = parseInt(e.target.value) / 100;
                document.getElementById('subtitle-bg-opacity-val').textContent = e.target.value + '%';
                this.applyBackgroundStyles();
                this.updatePreview();
            });
            
            // === レイアウト設定 ===
            
            // 縦位置
            document.getElementById('subtitle-position').addEventListener('change', (e) => {
                this.settings.position = e.target.value;
                this.applyLayoutStyles();
            });
            
            // 横位置
            document.querySelectorAll('.align-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const align = e.target.dataset.align;
                    this.settings.horizontalAlign = align;
                    document.querySelectorAll('.align-btn').forEach(b => b.classList.remove('active'));
                    e.target.classList.add('active');
                    this.applyLayoutStyles();
                    this.updatePreview();
                });
            });
            
            // 最大行数
            document.getElementById('subtitle-max-lines').addEventListener('input', (e) => {
                this.settings.maxLines = parseInt(e.target.value);
                document.getElementById('subtitle-max-lines-val').textContent = this.settings.maxLines + '行';
                this.applyTextStyles();
                this.updatePreview();
            });
            
            // 行間
            document.getElementById('subtitle-line-height').addEventListener('input', (e) => {
                this.settings.lineHeight = parseInt(e.target.value) / 100;
                document.getElementById('subtitle-line-height-val').textContent = e.target.value + '%';
                this.applyTextStyles();
                this.updatePreview();
            });
            
            // 話者名表示
            document.getElementById('subtitle-speaker-toggle').addEventListener('change', (e) => {
                this.settings.showSpeakerName = e.target.checked;
                this.applySettings();
                this.updatePreview();
            });
            
            // === アニメーション設定 ===
            
            // アニメーションON/OFF
            document.getElementById('subtitle-animation-toggle').addEventListener('change', (e) => {
                this.settings.animation = e.target.checked;
                this.updateAnimationSettingsState();
            });
            
            // アニメーション種類
            document.getElementById('subtitle-animation-type').addEventListener('change', (e) => {
                this.settings.animationType = e.target.value;
                this.updateTypewriterSettingsState();
                this.saveSettings();
            });
            
            // タイプライター速度
            document.getElementById('subtitle-typewriter-speed').addEventListener('input', (e) => {
                this.settings.typewriterSpeed = parseInt(e.target.value);
                document.getElementById('subtitle-typewriter-speed-val').textContent = this.settings.typewriterSpeed + 'ms';
                this.saveSettings();
            });
            
            // フェードアウト時間
            document.getElementById('subtitle-fade-duration').addEventListener('input', (e) => {
                this.settings.fadeOutDuration = parseInt(e.target.value) / 100;
                document.getElementById('subtitle-fade-duration-val').textContent = this.settings.fadeOutDuration.toFixed(1) + '秒';
                this.container.style.setProperty('--fade-duration', this.settings.fadeOutDuration + 's');
                this.saveSettings();
            });
            
            // 自動非表示時間
            document.getElementById('subtitle-auto-hide').addEventListener('input', (e) => {
                this.settings.autoHideDelay = parseInt(e.target.value);
                const val = this.settings.autoHideDelay === 0 ? 'OFF' : (this.settings.autoHideDelay / 1000).toFixed(1) + '秒';
                document.getElementById('subtitle-auto-hide-val').textContent = val;
                this.saveSettings();
            });
            
            // テストボタン
            document.getElementById('subtitle-test-btn').addEventListener('click', () => {
                this.showSubtitle('テスト', 'これはアニメーションのテストです。\n複数行も表示できます！');
                if (this.settings.autoHideDelay > 0) {
                    this.scheduleHide(this.settings.autoHideDelay);
                } else {
                    this.scheduleHide(3000);
                }
            });
            
            // 閉じるボタン
            document.getElementById('subtitle-settings-close').addEventListener('click', () => {
                this.settingsPanel.classList.remove('visible');
                this.saveSettings();
            });
        }
        
        updateBackgroundSettingsState() {
            const bgColorRow = document.getElementById('bg-color-row');
            const bgOpacityRow = document.getElementById('bg-opacity-row');
            
            if (this.settings.backgroundEnabled) {
                bgColorRow?.classList.remove('disabled');
                bgOpacityRow?.classList.remove('disabled');
            } else {
                bgColorRow?.classList.add('disabled');
                bgOpacityRow?.classList.add('disabled');
            }
        }
        
        updateAnimationSettingsState() {
            const animationTypeRow = document.getElementById('animation-type-row');
            
            if (this.settings.animation) {
                animationTypeRow?.classList.remove('disabled');
            } else {
                animationTypeRow?.classList.add('disabled');
            }
            
            this.updateTypewriterSettingsState();
        }
        
        updateTypewriterSettingsState() {
            const typewriterSpeedRow = document.getElementById('typewriter-speed-row');
            
            // タイプライターが選択されている場合のみ表示
            if (this.settings.animation && this.settings.animationType === 'typewriter') {
                typewriterSpeedRow?.classList.remove('disabled');
            } else {
                typewriterSpeedRow?.classList.add('disabled');
            }
        }
        
        updateColorPresetSelection(containerId, selectedColor) {
            const container = document.getElementById(containerId);
            if (!container) return;
            
            container.querySelectorAll('.color-preset').forEach(preset => {
                if (preset.dataset.color === selectedColor) {
                    preset.classList.add('selected');
                } else {
                    preset.classList.remove('selected');
                }
            });
        }
        
        updatePreview() {
            const previewText = document.getElementById('subtitle-preview-text');
            const previewSpeaker = document.getElementById('subtitle-preview-speaker');
            const previewArea = document.getElementById('subtitle-preview-area');
            
            if (previewText) {
                previewText.style.color = this.settings.textColor;
                previewText.style.fontFamily = this.settings.fontFamily;
                previewText.style.fontSize = Math.min(this.settings.fontSize, 32) + 'px';
                previewText.style.textShadow = this.generateTextShadow();
                previewText.style.lineHeight = this.settings.lineHeight;
            }
            
            if (previewSpeaker) {
                previewSpeaker.style.color = this.settings.speakerColor;
                previewSpeaker.style.fontFamily = this.settings.fontFamily;
                previewSpeaker.style.fontSize = Math.min(this.settings.fontSize * 0.75, 24) + 'px';
                previewSpeaker.style.display = this.settings.showSpeakerName ? 'inline' : 'none';
            }
            
            if (previewArea) {
                if (this.settings.backgroundEnabled) {
                    previewArea.style.background = this.hexToRgba(this.settings.backgroundColor, this.settings.backgroundOpacity);
                } else {
                    previewArea.style.background = 'rgba(50, 50, 50, 0.3)';
                }
                previewArea.style.textAlign = this.settings.horizontalAlign;
            }
        }
        
        hexToRgba(hex, alpha) {
            const r = parseInt(hex.slice(1, 3), 16);
            const g = parseInt(hex.slice(3, 5), 16);
            const b = parseInt(hex.slice(5, 7), 16);
            return `rgba(${r}, ${g}, ${b}, ${alpha})`;
        }
        
        generateTextShadow() {
            if (this.settings.strokeColor === 'transparent' || this.settings.strokeWidth === 0) {
                return 'none';
            }
            
            const w = this.settings.strokeWidth;
            const c = this.settings.strokeColor;
            
            return `
                -${w}px -${w}px 0 ${c},
                 ${w}px -${w}px 0 ${c},
                -${w}px  ${w}px 0 ${c},
                 ${w}px  ${w}px 0 ${c},
                -${w}px  0     0 ${c},
                 ${w}px  0     0 ${c},
                 0      -${w}px 0 ${c},
                 0       ${w}px 0 ${c}
            `.trim();
        }
        
        applyTextStyles() {
            // メイン字幕テキスト
            if (this.textElement) {
                this.textElement.style.color = this.settings.textColor;
                this.textElement.style.fontFamily = this.settings.fontFamily;
                this.textElement.style.fontSize = this.settings.fontSize + 'px';
                this.textElement.style.textShadow = this.generateTextShadow();
                this.textElement.style.lineHeight = this.settings.lineHeight;
            }
            
            // 話者名
            if (this.speakerElement) {
                this.speakerElement.style.color = this.settings.speakerColor;
                this.speakerElement.style.fontFamily = this.settings.fontFamily;
                this.speakerElement.style.fontSize = (this.settings.fontSize * 0.75) + 'px';
            }
            
            this.saveSettings();
        }
        
        applyBackgroundStyles() {
            if (!this.subtitleBox) return;
            
            if (this.settings.backgroundEnabled) {
                this.subtitleBox.classList.remove('no-background');
                this.subtitleBox.style.background = this.hexToRgba(this.settings.backgroundColor, this.settings.backgroundOpacity);
            } else {
                this.subtitleBox.classList.add('no-background');
                this.subtitleBox.style.background = 'transparent';
            }
            
            this.saveSettings();
        }
        
        applyLayoutStyles() {
            if (!this.container || !this.subtitleBox) return;
            
            // 縦位置
            this.container.classList.toggle('top', this.settings.position === 'top');
            
            // 横位置
            this.container.classList.remove('align-left', 'align-center', 'align-right');
            this.container.classList.add('align-' + this.settings.horizontalAlign);
            
            // テキスト揃え
            this.subtitleBox.classList.remove('text-left', 'text-center', 'text-right');
            this.subtitleBox.classList.add('text-' + this.settings.horizontalAlign);
            
            // フェードアウト時間
            this.container.style.setProperty('--fade-duration', this.settings.fadeOutDuration + 's');
            
            this.saveSettings();
        }

        setupEventListeners() {
            // 再生開始イベント（パイプラインから）
            window.addEventListener('multichar:playbackStart', (e) => {
                if (!this.settings.enabled) return;
                const { speakerName, text } = e.detail;
                this.showSubtitle(speakerName, text);
            });
            
            // 再生終了イベント
            window.addEventListener('multichar:playbackEnd', () => {
                if (this.settings.autoHideDelay > 0) {
                    this.scheduleHide(this.settings.autoHideDelay);
                }
            });
            
            // ターン開始イベント（フォールバック）
            window.addEventListener('multichar:turnStart', (e) => {
                // playbackStartがない場合のフォールバック
            });
            
            // ターン終了イベント
            window.addEventListener('multichar:turnEnd', (e) => {
                if (!this.settings.enabled) return;
                const { speaker, text } = e.detail;
                if (speaker && text) {
                    this.showSubtitle(speaker.name, text);
                    if (this.settings.autoHideDelay > 0) {
                        this.scheduleHide(this.settings.autoHideDelay);
                    }
                }
            });
            
            // 会話終了イベント
            window.addEventListener('multichar:conversationEnd', () => {
                this.hideSubtitle();
            });
        }

        showSubtitle(speaker, text) {
            if (!this.settings.enabled) return;
            
            // タイムアウトをクリア
            if (this.hideTimeout) {
                clearTimeout(this.hideTimeout);
                this.hideTimeout = null;
            }
            
            // タイプライターをクリア
            if (this.typewriterInterval) {
                clearInterval(this.typewriterInterval);
                this.typewriterInterval = null;
            }
            
            // 話者名
            if (this.settings.showSpeakerName && speaker) {
                this.speakerElement.textContent = speaker + ':';
            } else {
                this.speakerElement.textContent = '';
            }
            
            // 複数行対応：最大行数で切り詰め
            let processedText = this.processMultilineText(text);
            
            // タイプライターアニメーション
            if (this.settings.animation && this.settings.animationType === 'typewriter') {
                this.textElement.textContent = '';
                this.container.classList.add('typewriter');
                this.startTypewriter(processedText);
            } else {
                this.textElement.textContent = processedText;
                this.container.classList.remove('typewriter');
            }
            
            this.currentText = text;
            
            // スタイル適用
            this.applyTextStyles();
            this.applyBackgroundStyles();
            this.applyLayoutStyles();
            
            // アニメーション
            if (this.settings.animation && this.settings.animationType !== 'typewriter' && this.settings.animationType !== 'none') {
                // 既存のアニメーションクラスを削除
                this.container.className = this.container.className.replace(/animate-\S+/g, '').trim();
                void this.container.offsetWidth; // リフロー強制
                this.container.classList.add('animate-' + this.settings.animationType);
            }
            
            // 表示
            this.container.classList.add('visible');
            this.isVisible = true;
            
            console.log(`📺 字幕表示: ${speaker}: ${text.substring(0, 30)}...`);
        }
        
        processMultilineText(text) {
            // 改行で分割
            const lines = text.split('\n');
            
            // 最大行数で切り詰め（後ろの行を残す＝古い行を消す）
            if (lines.length > this.settings.maxLines) {
                // 最後のmaxLines行だけを残す
                return lines.slice(-this.settings.maxLines).join('\n');
            }
            
            return text;
        }
        
        /**
         * キーボードショートカット設定
         * Shift + T で字幕のオン/オフ切り替え
         */
        setupKeyboardShortcuts() {
            document.addEventListener('keydown', (e) => {
                // Shift + T で字幕トグル
                if (e.shiftKey && e.key.toLowerCase() === 't') {
                    e.preventDefault();
                    this.toggleSubtitles();
                    console.log(`📺 字幕トグル (Shift+T): ${this.settings.enabled ? 'ON' : 'OFF'}`);
                }
            });
            console.log('⌨️ 字幕ショートカット登録: Shift+T でトグル');
        }
        
        startTypewriter(text) {
            let index = 0;
            const speed = this.settings.typewriterSpeed || 50; // 設定値を使用
            
            this.typewriterInterval = setInterval(() => {
                if (index < text.length) {
                    this.textElement.textContent = text.substring(0, index + 1);
                    index++;
                } else {
                    clearInterval(this.typewriterInterval);
                    this.typewriterInterval = null;
                    this.container.classList.remove('typewriter');
                }
            }, speed);
        }

        hideSubtitle() {
            this.container.classList.remove('visible');
            this.isVisible = false;
            
            // タイプライターをクリア
            if (this.typewriterInterval) {
                clearInterval(this.typewriterInterval);
                this.typewriterInterval = null;
            }
            this.container.classList.remove('typewriter');
        }

        scheduleHide(delay) {
            if (this.hideTimeout) {
                clearTimeout(this.hideTimeout);
            }
            this.hideTimeout = setTimeout(() => {
                this.hideSubtitle();
            }, delay);
        }

        toggleSubtitles() {
            this.settings.enabled = !this.settings.enabled;
            const btn = document.getElementById('subtitle-toggle-btn');
            
            if (this.settings.enabled) {
                btn.innerHTML = '📺 字幕 ON';
                btn.classList.remove('off');
            } else {
                btn.innerHTML = '📺 字幕 OFF';
                btn.classList.add('off');
                this.hideSubtitle();
            }
            
            this.saveSettings();
            console.log(`📺 字幕: ${this.settings.enabled ? 'ON' : 'OFF'}`);
        }

        toggleSettingsPanel() {
            this.settingsPanel.classList.toggle('visible');
            if (this.settingsPanel.classList.contains('visible')) {
                this.updatePreview();
            }
        }

        applySettings() {
            this.applyLayoutStyles();
            
            // 現在表示中なら再描画
            if (this.isVisible && this.currentText) {
                const speaker = this.speakerElement.textContent.replace(':', '');
                this.showSubtitle(speaker, this.currentText);
            }
            
            this.saveSettings();
        }

        saveSettings() {
            try {
                localStorage.setItem('subtitle_settings_v1.7', JSON.stringify(this.settings));
            } catch (e) {
                console.warn('字幕設定保存失敗:', e);
            }
        }

        loadSettings() {
            try {
                // v1.7の設定を優先、なければ旧バージョンから移行
                let saved = localStorage.getItem('subtitle_settings_v1.7');
                if (!saved) saved = localStorage.getItem('subtitle_settings_v1.6');
                if (!saved) saved = localStorage.getItem('subtitle_settings_v1.5');
                if (!saved) saved = localStorage.getItem('subtitle_settings');
                
                if (saved) {
                    const loaded = JSON.parse(saved);
                    this.settings = { ...this.settings, ...loaded };
                    
                    // 旧形式からの移行（rgba形式の背景色を分離）
                    if (loaded.backgroundColor && loaded.backgroundColor.startsWith('rgba')) {
                        const match = loaded.backgroundColor.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
                        if (match) {
                            const r = parseInt(match[1]).toString(16).padStart(2, '0');
                            const g = parseInt(match[2]).toString(16).padStart(2, '0');
                            const b = parseInt(match[3]).toString(16).padStart(2, '0');
                            this.settings.backgroundColor = `#${r}${g}${b}`;
                            this.settings.backgroundOpacity = match[4] ? parseFloat(match[4]) : 0.75;
                        }
                    }
                }
            } catch (e) {
                console.warn('字幕設定読み込み失敗:', e);
            }
        }

        // 外部からの呼び出し用
        show(speaker, text) {
            this.showSubtitle(speaker, text);
        }

        hide() {
            this.hideSubtitle();
        }

        setEnabled(enabled) {
            this.settings.enabled = enabled;
            if (!enabled) this.hideSubtitle();
        }
        
        // ========================================
        // グリッド制御 v1.4 - 重複削除＆1つだけ残す
        // ========================================
        
        toggleGrid() {
            this.gridEnabled = !this.gridEnabled;
            this.applyGridState();
            this.saveGridState();
            console.log(`⛶ グリッド: ${this.gridEnabled ? 'ON' : 'OFF'}`);
        }
        
        applyGridState() {
            const btn = document.getElementById('grid-toggle-btn');
            
            if (!window.app || !window.app.scene) {
                console.warn('⛶ シーンが未初期化');
                return;
            }
            
            // ★ v1.4: 重複GridHelperを削除し、1つだけ残す
            const allGrids = [];
            window.app.scene.traverse((obj) => {
                if (obj.type === 'GridHelper') {
                    allGrids.push(obj);
                }
            });
            
            // 重複があれば削除（groundGridを優先して残す）
            if (allGrids.length > 1) {
                console.log(`⛶ 重複グリッド検出: ${allGrids.length}個 → 1個に統合`);
                
                // groundGridを探す、なければ最初の1つを残す
                let keepGrid = allGrids.find(g => g.name === 'groundGrid') || allGrids[0];
                
                allGrids.forEach((grid) => {
                    if (grid !== keepGrid) {
                        window.app.scene.remove(grid);
                        if (grid.geometry) grid.geometry.dispose();
                        if (grid.material) grid.material.dispose();
                        console.log(`  🗑️ 削除: GridHelper "${grid.name || '(無名)'}"`);
                    }
                });
                
                // app.gridHelperを正しい参照に更新
                window.app.gridHelper = keepGrid;
                console.log(`  ✅ 残存: GridHelper "${keepGrid.name || '(無名)'}"`);
            }
            
            // 残った1つのグリッドの表示切り替え
            if (window.app.gridHelper) {
                window.app.gridHelper.visible = this.gridEnabled;
                console.log(`⛶ グリッド visible=${this.gridEnabled}`);
            }
            
            // ボタン表示更新
            if (btn) {
                if (this.gridEnabled) {
                    btn.innerHTML = '⛶ グリッド ON';
                    btn.classList.remove('off');
                } else {
                    btn.innerHTML = '⛶ グリッド OFF';
                    btn.classList.add('off');
                }
            }
        }
        
        saveGridState() {
            try {
                localStorage.setItem('grid_enabled', JSON.stringify(this.gridEnabled));
            } catch (e) {
                console.warn('グリッド設定保存失敗:', e);
            }
        }
        
        loadGridState() {
            try {
                const saved = localStorage.getItem('grid_enabled');
                if (saved !== null) {
                    return JSON.parse(saved);
                }
            } catch (e) {
                console.warn('グリッド設定読み込み失敗:', e);
            }
            return true; // デフォルトはON
        }
    }

    // グローバル登録
    window.SubtitleDisplay = SubtitleDisplay;

    // 自動初期化
    function initSubtitleDisplay() {
        window.subtitleDisplay = new SubtitleDisplay();
        console.log('📺 字幕システム v1.8 初期化完了');
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => setTimeout(initSubtitleDisplay, 2000));
    } else {
        setTimeout(initSubtitleDisplay, 2000);
    }

    console.log('📦 Subtitle Display System v1.8 ロード完了');
})();
