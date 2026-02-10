/**
 * 📹 Camera Effects Panel v2.0
 * プロフェッショナルなカメラ設定と画面演出UI
 * 
 * 機能:
 * - レンズ焦点距離（8mm-200mm）
 * - 被写界深度（DOF）とボケ効果
 * - F値設定
 * - ホワイトバランス
 * - レベル補正（露出・コントラスト・ガンマ）
 * - 彩度・明度・色相
 * - ビネット・グレイン・ブルーム
 * - 30スロット保存機能（名前付き）
 */

class CameraEffectsPanel {
    constructor() {
        this.isInitialized = false;
        this.isMinimized = false;
        
        // 保存スロット（30個）
        this.STORAGE_KEY = 'cameraEffectsSlots';
        this.MAX_SLOTS = 30;
        this.savedSlots = this.loadSavedSlots();
        
        // デフォルト設定
        this.defaultSettings = {
            // レンズ設定
            focalLength: 50,
            fStop: 2.8,
            
            // 被写界深度
            dofEnabled: false,
            focusDistance: 2.0,
            bokehIntensity: 0.5,
            bokehShape: 'circle',
            dofRange: 0.5,          // DOF範囲（被写界深度の幅） 0=狭い, 1=広い
            
            // 自動追従
            autoFocusEnabled: false,
            autoFocusTarget: 'none',
            autoFocusPart: 'face',
            
            // ホワイトバランス
            whiteBalance: 5500,
            tint: 0,
            
            // レベル補正
            exposure: 0,
            contrast: 0,
            gamma: 1.0,
            
            // 色調整
            saturation: 0,
            brightness: 0,
            hue: 0,
            
            // 特殊効果
            vignetteEnabled: false,
            vignetteIntensity: 0.3,
            grainEnabled: false,
            grainIntensity: 0.1,
            bloomEnabled: false,
            bloomIntensity: 0.3,
            bloomThreshold: 0.8,
            
            // プリセット
            currentPreset: 'natural'
        };
        
        // 現在の設定
        this.settings = { ...this.defaultSettings };
        
        // プリセット定義
        this.presets = {
            natural: {
                name: '🌿 ナチュラル',
                focalLength: 50, fStop: 2.8,
                whiteBalance: 5500, tint: 0,
                exposure: 0, contrast: 0, gamma: 1.0,
                saturation: 0, brightness: 0, hue: 0,
                vignetteEnabled: false, bloomEnabled: false,
                dofEnabled: false
            },
            cinematic: {
                name: '🎬 シネマティック',
                focalLength: 35, fStop: 1.8,
                whiteBalance: 5000, tint: -5,
                exposure: -0.3, contrast: 15, gamma: 0.95,
                saturation: -10, brightness: -5, hue: 0,
                vignetteEnabled: true, vignetteIntensity: 0.4,
                bloomEnabled: true, bloomIntensity: 0.2
            },
            portrait: {
                name: '👤 ポートレート',
                focalLength: 85, fStop: 1.4,
                whiteBalance: 5800, tint: 5,
                exposure: 0.2, contrast: -5, gamma: 1.05,
                saturation: 5, brightness: 5, hue: 0,
                dofEnabled: true, bokehIntensity: 0.7,
                vignetteEnabled: true, vignetteIntensity: 0.2
            },
            anime: {
                name: '🎨 アニメ調',
                focalLength: 50, fStop: 5.6,
                whiteBalance: 6000, tint: 0,
                exposure: 0.3, contrast: 30, gamma: 0.9,
                saturation: 30, brightness: 10, hue: 0,
                bloomEnabled: true, bloomIntensity: 0.5
            },
            noir: {
                name: '🌑 ノワール',
                focalLength: 28, fStop: 2.0,
                whiteBalance: 4500, tint: 0,
                exposure: -0.5, contrast: 40, gamma: 0.85,
                saturation: -80, brightness: -10, hue: 0,
                vignetteEnabled: true, vignetteIntensity: 0.6,
                grainEnabled: true, grainIntensity: 0.15
            },
            dreamy: {
                name: '✨ ドリーミー',
                focalLength: 50, fStop: 2.0,
                whiteBalance: 6500, tint: 10,
                exposure: 0.4, contrast: -15, gamma: 1.1,
                saturation: -5, brightness: 10, hue: 5,
                dofEnabled: true, bokehIntensity: 0.5,
                bloomEnabled: true, bloomIntensity: 0.6
            }
        };
        
        // ボケ形状定義
        this.bokehShapes = {
            circle: { name: '⭕ 円形', sides: 32 },
            hexagon: { name: '⬡ 六角形', sides: 6 },
            octagon: { name: '⯃ 八角形', sides: 8 }
        };
        
        this.init();
    }
    
    loadSavedSlots() {
        try {
            const saved = localStorage.getItem(this.STORAGE_KEY);
            if (saved) {
                return JSON.parse(saved);
            }
        } catch (e) {
            console.warn('保存スロット読み込みエラー:', e);
        }
        return {};
    }
    
    saveSlotsToStorage() {
        try {
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.savedSlots));
        } catch (e) {
            console.warn('保存スロット書き込みエラー:', e);
        }
    }
    
    init() {
        this.createPanel();
        this.setupEventListeners();
        this.isInitialized = true;
        console.log('📹 Camera Effects Panel v2.0 initialized');
    }
    
    createPanel() {
        const panel = document.createElement('div');
        panel.id = 'camera-effects-panel';
        panel.innerHTML = `
            <style>
                #camera-effects-panel {
                    position: fixed;
                    top: 10px;
                    left: 200px;
                    width: 340px;
                    max-height: 90vh;
                    background: rgba(20, 20, 30, 0.95);
                    border-radius: 12px;
                    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
                    font-family: 'Segoe UI', sans-serif;
                    font-size: 11px;
                    color: #e0e0e0;
                    z-index: 9000;
                    overflow: hidden;
                    backdrop-filter: blur(10px);
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    transition: all 0.3s ease;
                }
                
                #camera-effects-panel.minimized {
                    height: 40px;
                    overflow: hidden;
                }
                
                #camera-effects-panel.minimized .cep-content {
                    display: none;
                }
                
                .cep-header {
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    padding: 10px 14px;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    cursor: move;
                    user-select: none;
                }
                
                .cep-title {
                    font-size: 13px;
                    font-weight: bold;
                    color: white;
                    display: flex;
                    align-items: center;
                    gap: 6px;
                }
                
                .cep-header-btns {
                    display: flex;
                    gap: 6px;
                }
                
                .cep-header-btn {
                    background: rgba(255, 255, 255, 0.2);
                    border: none;
                    color: white;
                    width: 24px;
                    height: 24px;
                    border-radius: 6px;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    transition: background 0.2s;
                }
                
                .cep-header-btn:hover {
                    background: rgba(255, 255, 255, 0.3);
                }
                
                .cep-content {
                    max-height: calc(90vh - 50px);
                    overflow-y: auto;
                    padding: 10px;
                }
                
                .cep-content::-webkit-scrollbar {
                    width: 6px;
                }
                
                .cep-content::-webkit-scrollbar-track {
                    background: rgba(255, 255, 255, 0.05);
                }
                
                .cep-content::-webkit-scrollbar-thumb {
                    background: rgba(102, 126, 234, 0.5);
                    border-radius: 3px;
                }
                
                .cep-section {
                    margin-bottom: 12px;
                    background: rgba(255, 255, 255, 0.05);
                    border-radius: 8px;
                    overflow: hidden;
                }
                
                .cep-section-header {
                    background: rgba(255, 255, 255, 0.08);
                    padding: 8px 12px;
                    cursor: pointer;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    transition: background 0.2s;
                }
                
                .cep-section-header:hover {
                    background: rgba(255, 255, 255, 0.12);
                }
                
                .cep-section-title {
                    font-weight: bold;
                    font-size: 11px;
                    display: flex;
                    align-items: center;
                    gap: 6px;
                }
                
                .cep-section-toggle {
                    color: #888;
                    transition: transform 0.2s;
                }
                
                .cep-section.collapsed .cep-section-toggle {
                    transform: rotate(-90deg);
                }
                
                .cep-section.collapsed .cep-section-body {
                    display: none;
                }
                
                .cep-section-body {
                    padding: 10px 12px;
                }
                
                .cep-row {
                    display: flex;
                    align-items: center;
                    margin-bottom: 8px;
                    gap: 8px;
                }
                
                .cep-label {
                    flex: 0 0 80px;
                    font-size: 10px;
                    color: #aaa;
                }
                
                .cep-slider-container {
                    flex: 1;
                    display: flex;
                    align-items: center;
                    gap: 6px;
                }
                
                .cep-slider {
                    flex: 1;
                    -webkit-appearance: none;
                    height: 4px;
                    background: rgba(255, 255, 255, 0.1);
                    border-radius: 2px;
                    outline: none;
                }
                
                .cep-slider::-webkit-slider-thumb {
                    -webkit-appearance: none;
                    width: 14px;
                    height: 14px;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    border-radius: 50%;
                    cursor: pointer;
                    border: 2px solid white;
                    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3);
                }
                
                .cep-value {
                    min-width: 45px;
                    background: rgba(0, 0, 0, 0.3);
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    color: #4ecdc4;
                    padding: 3px 6px;
                    border-radius: 4px;
                    font-size: 10px;
                    text-align: center;
                }
                
                .cep-toggle {
                    position: relative;
                    width: 36px;
                    height: 18px;
                }
                
                .cep-toggle input {
                    opacity: 0;
                    width: 0;
                    height: 0;
                }
                
                .cep-toggle-slider {
                    position: absolute;
                    cursor: pointer;
                    top: 0; left: 0; right: 0; bottom: 0;
                    background: rgba(255, 255, 255, 0.2);
                    transition: 0.3s;
                    border-radius: 18px;
                }
                
                .cep-toggle-slider:before {
                    position: absolute;
                    content: "";
                    height: 12px;
                    width: 12px;
                    left: 3px;
                    bottom: 3px;
                    background: white;
                    transition: 0.3s;
                    border-radius: 50%;
                }
                
                .cep-toggle input:checked + .cep-toggle-slider {
                    background: linear-gradient(135deg, #4ecdc4 0%, #44a08d 100%);
                }
                
                .cep-toggle input:checked + .cep-toggle-slider:before {
                    transform: translateX(18px);
                }
                
                .cep-presets {
                    display: grid;
                    grid-template-columns: repeat(3, 1fr);
                    gap: 6px;
                    margin-bottom: 10px;
                }
                
                .cep-preset {
                    background: rgba(255, 255, 255, 0.08);
                    border: 1px solid transparent;
                    border-radius: 6px;
                    padding: 8px 4px;
                    text-align: center;
                    cursor: pointer;
                    transition: all 0.2s;
                    font-size: 9px;
                }
                
                .cep-preset:hover {
                    background: rgba(102, 126, 234, 0.3);
                    border-color: rgba(102, 126, 234, 0.5);
                }
                
                .cep-preset.active {
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    border-color: #667eea;
                }
                
                .cep-preset-icon {
                    font-size: 16px;
                    display: block;
                    margin-bottom: 2px;
                }
                
                .cep-action-btns {
                    display: flex;
                    gap: 6px;
                    margin-top: 10px;
                }
                
                .cep-btn {
                    flex: 1;
                    padding: 8px;
                    border: none;
                    border-radius: 6px;
                    cursor: pointer;
                    font-size: 10px;
                    font-weight: bold;
                    transition: all 0.2s;
                }
                
                .cep-btn-reset {
                    background: rgba(255, 107, 107, 0.3);
                    color: #ff6b6b;
                }
                
                .cep-btn-reset:hover {
                    background: rgba(255, 107, 107, 0.5);
                }
                
                .cep-btn-save {
                    background: linear-gradient(135deg, #4ecdc4 0%, #44a08d 100%);
                    color: white;
                }
                
                .cep-btn-save:hover {
                    transform: translateY(-1px);
                    box-shadow: 0 4px 12px rgba(78, 205, 196, 0.4);
                }
                
                .cep-btn-load {
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: white;
                }
                
                /* 保存スロットセクション */
                .cep-slots-container {
                    max-height: 200px;
                    overflow-y: auto;
                    background: rgba(0, 0, 0, 0.2);
                    border-radius: 6px;
                    padding: 6px;
                }
                
                .cep-slot-item {
                    display: flex;
                    align-items: center;
                    gap: 6px;
                    padding: 6px 8px;
                    background: rgba(255, 255, 255, 0.05);
                    border-radius: 4px;
                    margin-bottom: 4px;
                    cursor: pointer;
                    transition: all 0.2s;
                }
                
                .cep-slot-item:hover {
                    background: rgba(102, 126, 234, 0.2);
                }
                
                .cep-slot-item.selected {
                    background: rgba(102, 126, 234, 0.4);
                    border: 1px solid #667eea;
                }
                
                .cep-slot-item.empty {
                    opacity: 0.5;
                }
                
                .cep-slot-num {
                    font-size: 9px;
                    color: #888;
                    min-width: 20px;
                }
                
                .cep-slot-name {
                    flex: 1;
                    font-size: 10px;
                    color: #e0e0e0;
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                }
                
                .cep-slot-name-input {
                    flex: 1;
                    background: rgba(0,0,0,0.3);
                    border: 1px solid rgba(255,255,255,0.2);
                    color: #4ecdc4;
                    padding: 2px 6px;
                    border-radius: 3px;
                    font-size: 10px;
                }
                
                .cep-slot-delete {
                    background: none;
                    border: none;
                    color: #ff6b6b;
                    cursor: pointer;
                    font-size: 12px;
                    padding: 2px 4px;
                    opacity: 0.5;
                    transition: opacity 0.2s;
                }
                
                .cep-slot-delete:hover {
                    opacity: 1;
                }
                
                .cep-save-dialog {
                    background: rgba(0, 0, 0, 0.4);
                    border: 1px solid rgba(78, 205, 196, 0.3);
                    border-radius: 6px;
                    padding: 10px;
                    margin-top: 8px;
                }
                
                .cep-save-dialog-row {
                    display: flex;
                    gap: 6px;
                    align-items: center;
                    margin-bottom: 8px;
                }
                
                .cep-save-dialog-row:last-child {
                    margin-bottom: 0;
                }
                
                .cep-save-dialog input[type="text"] {
                    flex: 1;
                    background: rgba(0,0,0,0.3);
                    border: 1px solid rgba(255,255,255,0.2);
                    color: #4ecdc4;
                    padding: 6px 10px;
                    border-radius: 4px;
                    font-size: 11px;
                }
                
                .cep-save-dialog select {
                    flex: 1;
                    background: rgba(0,0,0,0.3);
                    border: 1px solid rgba(255,255,255,0.2);
                    color: #4ecdc4;
                    padding: 6px 10px;
                    border-radius: 4px;
                    font-size: 11px;
                }
            </style>
            
            <div class="cep-header" id="cep-drag-handle">
                <div class="cep-title">
                    <span>📹</span>
                    <span>カメラ & 演出 v2</span>
                </div>
                <div class="cep-header-btns">
                    <button class="cep-header-btn" id="cep-minimize" title="最小化">➖</button>
                    <button class="cep-header-btn" id="cep-close" title="閉じる">✕</button>
                </div>
            </div>
            
            <div class="cep-content">
                <!-- 基本プリセット -->
                <div class="cep-section">
                    <div class="cep-section-header">
                        <div class="cep-section-title">
                            <span>🎨</span>
                            <span>基本プリセット</span>
                        </div>
                        <span class="cep-section-toggle">▼</span>
                    </div>
                    <div class="cep-section-body">
                        <div class="cep-presets" id="cep-presets">
                            ${Object.entries(this.presets).map(([key, preset]) => `
                                <div class="cep-preset ${key === 'natural' ? 'active' : ''}" data-preset="${key}">
                                    <span class="cep-preset-icon">${preset.name.split(' ')[0]}</span>
                                    <span>${preset.name.split(' ')[1]}</span>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                </div>
                
                <!-- 💾 保存スロット -->
                <div class="cep-section">
                    <div class="cep-section-header">
                        <div class="cep-section-title">
                            <span>💾</span>
                            <span>保存スロット (1-30)</span>
                        </div>
                        <span class="cep-section-toggle">▼</span>
                    </div>
                    <div class="cep-section-body">
                        <div class="cep-slots-container" id="cep-slots-container">
                            ${this.renderSlotsList()}
                        </div>
                        
                        <!-- 保存・適用ボタン -->
                        <div class="cep-action-btns" style="margin-top: 10px;">
                            <button class="cep-btn cep-btn-load" id="cep-apply-slot">📂 選択を適用</button>
                            <button class="cep-btn cep-btn-save" id="cep-show-save-dialog">💾 現在設定を保存</button>
                        </div>
                        
                        <!-- 保存ダイアログ（非表示） -->
                        <div class="cep-save-dialog" id="cep-save-dialog" style="display: none;">
                            <div class="cep-save-dialog-row">
                                <label style="font-size: 10px; color: #aaa; min-width: 60px;">保存先:</label>
                                <select id="cep-save-slot-select">
                                    ${Array.from({length: 30}, (_, i) => {
                                        const slotData = this.savedSlots[i + 1];
                                        const name = slotData ? slotData.name : '(空)';
                                        return `<option value="${i + 1}">スロット ${i + 1}: ${name}</option>`;
                                    }).join('')}
                                </select>
                            </div>
                            <div class="cep-save-dialog-row">
                                <label style="font-size: 10px; color: #aaa; min-width: 60px;">名前:</label>
                                <input type="text" id="cep-save-name" placeholder="プリセット名を入力..." maxlength="20">
                            </div>
                            <div class="cep-save-dialog-row">
                                <button class="cep-btn cep-btn-reset" id="cep-cancel-save" style="flex: 1;">キャンセル</button>
                                <button class="cep-btn cep-btn-save" id="cep-confirm-save" style="flex: 1;">✅ 保存</button>
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- レンズ設定 -->
                <div class="cep-section">
                    <div class="cep-section-header">
                        <div class="cep-section-title">
                            <span>🔭</span>
                            <span>レンズ設定</span>
                        </div>
                        <span class="cep-section-toggle">▼</span>
                    </div>
                    <div class="cep-section-body">
                        <div class="cep-row">
                            <label class="cep-label">焦点距離</label>
                            <div class="cep-slider-container">
                                <input type="range" class="cep-slider" id="cep-focal-length" 
                                    min="8" max="200" value="${this.settings.focalLength}">
                                <input type="text" class="cep-value" id="cep-focal-length-val" value="${this.settings.focalLength}mm">
                            </div>
                        </div>
                        
                        <div class="cep-row">
                            <label class="cep-label">F値</label>
                            <div class="cep-slider-container">
                                <input type="range" class="cep-slider" id="cep-fstop" 
                                    min="1.4" max="22" step="0.1" value="${this.settings.fStop}">
                                <input type="text" class="cep-value" id="cep-fstop-val" value="f/${this.settings.fStop}">
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- 被写界深度 -->
                <div class="cep-section">
                    <div class="cep-section-header">
                        <div class="cep-section-title">
                            <span>🎯</span>
                            <span>被写界深度 (DOF)</span>
                        </div>
                        <span class="cep-section-toggle">▼</span>
                    </div>
                    <div class="cep-section-body">
                        <div class="cep-row">
                            <label class="cep-label">DOF有効</label>
                            <label class="cep-toggle">
                                <input type="checkbox" id="cep-dof-enabled">
                                <span class="cep-toggle-slider"></span>
                            </label>
                        </div>
                        
                        <!-- 自動追従設定 -->
                        <div style="background: rgba(78, 205, 196, 0.1); border: 1px solid rgba(78, 205, 196, 0.3); border-radius: 6px; padding: 8px; margin: 8px 0;">
                            <div class="cep-row" style="margin-bottom: 6px;">
                                <label class="cep-label" style="color: #4ecdc4;">🎯 自動追従</label>
                                <label class="cep-toggle">
                                    <input type="checkbox" id="cep-autofocus-enabled">
                                    <span class="cep-toggle-slider"></span>
                                </label>
                            </div>
                            
                            <div class="cep-row" style="margin-bottom: 6px;">
                                <label class="cep-label">ターゲット</label>
                                <select id="cep-autofocus-target" style="flex: 1; background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.1); color: #4ecdc4; padding: 4px 8px; border-radius: 4px; font-size: 10px;">
                                    <option value="none">なし</option>
                                    <option value="aiDirector">🎬 AI Director連動</option>
                                    <option value="characterA">キャラクターA</option>
                                    <option value="characterB">キャラクターB</option>
                                </select>
                            </div>
                            
                            <!-- AI Director連動時の説明 -->
                            <div id="cep-ai-director-info" style="display: none; background: rgba(155,89,182,0.15); border: 1px solid rgba(155,89,182,0.3); border-radius: 4px; padding: 6px; margin-bottom: 6px; font-size: 9px; color: #9b59b6;">
                                📹 AI演出のターゲット・ショットに自動連動<br>
                                顔アップ→顔、ミディアム→胸、フル→腰 にピント
                            </div>
                            
                            <div class="cep-row" style="margin-bottom: 0;" id="cep-autofocus-part-row">
                                <label class="cep-label">部位</label>
                                <div style="display: flex; gap: 4px;">
                                    <button id="cep-autofocus-face" class="cep-autofocus-part" style="flex: 1; padding: 4px 8px; background: linear-gradient(135deg, #4ecdc4 0%, #44a08d 100%); border: none; border-radius: 4px; color: white; font-size: 10px; cursor: pointer;">👤 顔</button>
                                    <button id="cep-autofocus-body" class="cep-autofocus-part" style="flex: 1; padding: 4px 8px; background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2); border-radius: 4px; color: #aaa; font-size: 10px; cursor: pointer;">🧍 体</button>
                                </div>
                            </div>
                            
                            <div id="cep-autofocus-status" style="margin-top: 6px; font-size: 9px; color: #888; text-align: center;">自動追従: OFF</div>
                        </div>
                        
                        <div class="cep-row">
                            <label class="cep-label">フォーカス距離</label>
                            <div class="cep-slider-container">
                                <input type="range" class="cep-slider" id="cep-focus-distance" 
                                    min="0.5" max="20" step="0.1" value="${this.settings.focusDistance}">
                                <input type="text" class="cep-value" id="cep-focus-distance-val" value="${this.settings.focusDistance}m">
                            </div>
                        </div>
                        
                        <div class="cep-row">
                            <label class="cep-label">ボケ強度</label>
                            <div class="cep-slider-container">
                                <input type="range" class="cep-slider" id="cep-bokeh-intensity" 
                                    min="0" max="1" step="0.01" value="${this.settings.bokehIntensity}">
                                <input type="text" class="cep-value" id="cep-bokeh-intensity-val" value="${Math.round(this.settings.bokehIntensity * 100)}%">
                            </div>
                        </div>
                        
                        <div class="cep-row">
                            <label class="cep-label" style="color: #ffd93d;">📐 DOF範囲</label>
                            <div class="cep-slider-container">
                                <input type="range" class="cep-slider" id="cep-dof-range" 
                                    min="0" max="1" step="0.01" value="${this.settings.dofRange}" style="accent-color: #ffd93d;">
                                <input type="text" class="cep-value" id="cep-dof-range-val" value="${Math.round(this.settings.dofRange * 100)}%" style="color: #ffd93d;">
                            </div>
                        </div>
                        <div style="font-size: 9px; color: #888; margin-top: -4px; margin-bottom: 8px; padding-left: 88px;">小=狭い（強ボケ）　大=広い（弱ボケ）</div>
                    </div>
                </div>
                
                <!-- ホワイトバランス -->
                <div class="cep-section">
                    <div class="cep-section-header">
                        <div class="cep-section-title">
                            <span>☀️</span>
                            <span>ホワイトバランス</span>
                        </div>
                        <span class="cep-section-toggle">▼</span>
                    </div>
                    <div class="cep-section-body">
                        <div class="cep-row">
                            <label class="cep-label">色温度</label>
                            <div class="cep-slider-container">
                                <input type="range" class="cep-slider" id="cep-white-balance" 
                                    min="2000" max="10000" step="100" value="${this.settings.whiteBalance}">
                                <input type="text" class="cep-value" id="cep-white-balance-val" value="${this.settings.whiteBalance}K">
                            </div>
                        </div>
                        
                        <div class="cep-row">
                            <label class="cep-label">色かぶり補正</label>
                            <div class="cep-slider-container">
                                <input type="range" class="cep-slider" id="cep-tint" 
                                    min="-100" max="100" value="${this.settings.tint}">
                                <input type="text" class="cep-value" id="cep-tint-val" value="${this.settings.tint}">
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- レベル補正 -->
                <div class="cep-section">
                    <div class="cep-section-header">
                        <div class="cep-section-title">
                            <span>📊</span>
                            <span>レベル補正</span>
                        </div>
                        <span class="cep-section-toggle">▼</span>
                    </div>
                    <div class="cep-section-body">
                        <div class="cep-row">
                            <label class="cep-label">露出 (EV)</label>
                            <div class="cep-slider-container">
                                <input type="range" class="cep-slider" id="cep-exposure" 
                                    min="-3" max="3" step="0.1" value="${this.settings.exposure}">
                                <input type="text" class="cep-value" id="cep-exposure-val" value="${this.settings.exposure >= 0 ? '+' : ''}${this.settings.exposure}">
                            </div>
                        </div>
                        
                        <div class="cep-row">
                            <label class="cep-label">コントラスト</label>
                            <div class="cep-slider-container">
                                <input type="range" class="cep-slider" id="cep-contrast" 
                                    min="-100" max="100" value="${this.settings.contrast}">
                                <input type="text" class="cep-value" id="cep-contrast-val" value="${this.settings.contrast}">
                            </div>
                        </div>
                        
                        <div class="cep-row">
                            <label class="cep-label">ガンマ</label>
                            <div class="cep-slider-container">
                                <input type="range" class="cep-slider" id="cep-gamma" 
                                    min="0.5" max="2" step="0.01" value="${this.settings.gamma}">
                                <input type="text" class="cep-value" id="cep-gamma-val" value="${this.settings.gamma.toFixed(2)}">
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- 色調整 -->
                <div class="cep-section">
                    <div class="cep-section-header">
                        <div class="cep-section-title">
                            <span>🎨</span>
                            <span>色調整</span>
                        </div>
                        <span class="cep-section-toggle">▼</span>
                    </div>
                    <div class="cep-section-body">
                        <div class="cep-row">
                            <label class="cep-label">彩度</label>
                            <div class="cep-slider-container">
                                <input type="range" class="cep-slider" id="cep-saturation" 
                                    min="-100" max="100" value="${this.settings.saturation}">
                                <input type="text" class="cep-value" id="cep-saturation-val" value="${this.settings.saturation}">
                            </div>
                        </div>
                        
                        <div class="cep-row">
                            <label class="cep-label">明度</label>
                            <div class="cep-slider-container">
                                <input type="range" class="cep-slider" id="cep-brightness" 
                                    min="-100" max="100" value="${this.settings.brightness}">
                                <input type="text" class="cep-value" id="cep-brightness-val" value="${this.settings.brightness}">
                            </div>
                        </div>
                        
                        <div class="cep-row">
                            <label class="cep-label">色相</label>
                            <div class="cep-slider-container">
                                <input type="range" class="cep-slider" id="cep-hue" 
                                    min="-180" max="180" value="${this.settings.hue}">
                                <input type="text" class="cep-value" id="cep-hue-val" value="${this.settings.hue}°">
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- 特殊効果 -->
                <div class="cep-section">
                    <div class="cep-section-header">
                        <div class="cep-section-title">
                            <span>✨</span>
                            <span>特殊効果</span>
                        </div>
                        <span class="cep-section-toggle">▼</span>
                    </div>
                    <div class="cep-section-body">
                        <div class="cep-row">
                            <label class="cep-label">ビネット</label>
                            <label class="cep-toggle">
                                <input type="checkbox" id="cep-vignette-enabled">
                                <span class="cep-toggle-slider"></span>
                            </label>
                        </div>
                        <div class="cep-row">
                            <label class="cep-label">強度</label>
                            <div class="cep-slider-container">
                                <input type="range" class="cep-slider" id="cep-vignette-intensity" 
                                    min="0" max="1" step="0.01" value="${this.settings.vignetteIntensity}">
                                <input type="text" class="cep-value" id="cep-vignette-intensity-val" value="${Math.round(this.settings.vignetteIntensity * 100)}%">
                            </div>
                        </div>
                        
                        <div class="cep-row" style="margin-top: 10px;">
                            <label class="cep-label">フィルムグレイン</label>
                            <label class="cep-toggle">
                                <input type="checkbox" id="cep-grain-enabled">
                                <span class="cep-toggle-slider"></span>
                            </label>
                        </div>
                        <div class="cep-row">
                            <label class="cep-label">強度</label>
                            <div class="cep-slider-container">
                                <input type="range" class="cep-slider" id="cep-grain-intensity" 
                                    min="0" max="0.5" step="0.01" value="${this.settings.grainIntensity}">
                                <input type="text" class="cep-value" id="cep-grain-intensity-val" value="${Math.round(this.settings.grainIntensity * 100)}%">
                            </div>
                        </div>
                        
                        <div class="cep-row" style="margin-top: 10px;">
                            <label class="cep-label">ブルーム</label>
                            <label class="cep-toggle">
                                <input type="checkbox" id="cep-bloom-enabled">
                                <span class="cep-toggle-slider"></span>
                            </label>
                        </div>
                        <div class="cep-row">
                            <label class="cep-label">強度</label>
                            <div class="cep-slider-container">
                                <input type="range" class="cep-slider" id="cep-bloom-intensity" 
                                    min="0" max="1" step="0.01" value="${this.settings.bloomIntensity}">
                                <input type="text" class="cep-value" id="cep-bloom-intensity-val" value="${Math.round(this.settings.bloomIntensity * 100)}%">
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- リセットボタン -->
                <div class="cep-action-btns">
                    <button class="cep-btn cep-btn-reset" id="cep-reset">🔄 全解除（リセット）</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(panel);
        this.panel = panel;
    }
    
    renderSlotsList() {
        let html = '';
        for (let i = 1; i <= this.MAX_SLOTS; i++) {
            const slotData = this.savedSlots[i];
            const isEmpty = !slotData;
            const name = slotData ? slotData.name : '(空)';
            html += `
                <div class="cep-slot-item ${isEmpty ? 'empty' : ''}" data-slot="${i}">
                    <span class="cep-slot-num">${i}.</span>
                    <span class="cep-slot-name">${name}</span>
                    ${!isEmpty ? `<button class="cep-slot-delete" data-slot="${i}" title="削除">🗑️</button>` : ''}
                </div>
            `;
        }
        return html;
    }
    
    updateSlotsList() {
        const container = document.getElementById('cep-slots-container');
        if (container) {
            container.innerHTML = this.renderSlotsList();
            this.setupSlotEvents();
        }
        
        // 保存ダイアログのセレクトも更新
        const select = document.getElementById('cep-save-slot-select');
        if (select) {
            select.innerHTML = Array.from({length: 30}, (_, i) => {
                const slotData = this.savedSlots[i + 1];
                const name = slotData ? slotData.name : '(空)';
                return `<option value="${i + 1}">スロット ${i + 1}: ${name}</option>`;
            }).join('');
        }
    }
    
    setupSlotEvents() {
        // スロットクリック（選択）
        document.querySelectorAll('.cep-slot-item').forEach(item => {
            item.addEventListener('click', (e) => {
                if (e.target.classList.contains('cep-slot-delete')) return;
                
                document.querySelectorAll('.cep-slot-item').forEach(i => i.classList.remove('selected'));
                item.classList.add('selected');
            });
        });
        
        // 削除ボタン
        document.querySelectorAll('.cep-slot-delete').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const slotNum = parseInt(btn.dataset.slot);
                if (confirm(`スロット ${slotNum} を削除しますか？`)) {
                    delete this.savedSlots[slotNum];
                    this.saveSlotsToStorage();
                    this.updateSlotsList();
                    console.log(`🗑️ スロット ${slotNum} を削除`);
                }
            });
        });
    }
    
    setupEventListeners() {
        // ドラッグ機能
        this.setupDrag();
        
        // 最小化・閉じる
        document.getElementById('cep-minimize').addEventListener('click', () => this.toggleMinimize());
        document.getElementById('cep-close').addEventListener('click', () => this.hide());
        
        // セクション折りたたみ
        document.querySelectorAll('.cep-section-header').forEach(header => {
            header.addEventListener('click', () => {
                header.parentElement.classList.toggle('collapsed');
            });
        });
        
        // 基本プリセット選択
        document.querySelectorAll('.cep-preset').forEach(preset => {
            preset.addEventListener('click', () => {
                const presetKey = preset.dataset.preset;
                this.applyPreset(presetKey);
                document.querySelectorAll('.cep-preset').forEach(p => p.classList.remove('active'));
                preset.classList.add('active');
            });
        });
        
        // スライダー設定
        this.setupSlider('focal-length', 'focalLength', (v) => `${v}mm`, () => this.updateCameraFOV());
        this.setupSlider('fstop', 'fStop', (v) => `f/${v}`);
        this.setupSlider('focus-distance', 'focusDistance', (v) => `${v}m`);
        this.setupSlider('bokeh-intensity', 'bokehIntensity', (v) => `${Math.round(v * 100)}%`);
        this.setupSlider('dof-range', 'dofRange', (v) => `${Math.round(v * 100)}%`);
        this.setupSlider('white-balance', 'whiteBalance', (v) => `${v}K`);
        this.setupSlider('tint', 'tint', (v) => `${v}`);
        this.setupSlider('exposure', 'exposure', (v) => `${v >= 0 ? '+' : ''}${v}`);
        this.setupSlider('contrast', 'contrast', (v) => `${v}`);
        this.setupSlider('gamma', 'gamma', (v) => v.toFixed(2));
        this.setupSlider('saturation', 'saturation', (v) => `${v}`);
        this.setupSlider('brightness', 'brightness', (v) => `${v}`);
        this.setupSlider('hue', 'hue', (v) => `${v}°`);
        this.setupSlider('vignette-intensity', 'vignetteIntensity', (v) => `${Math.round(v * 100)}%`);
        this.setupSlider('grain-intensity', 'grainIntensity', (v) => `${Math.round(v * 100)}%`);
        this.setupSlider('bloom-intensity', 'bloomIntensity', (v) => `${Math.round(v * 100)}%`);
        
        // トグル設定
        this.setupToggle('dof-enabled', 'dofEnabled');
        this.setupToggle('vignette-enabled', 'vignetteEnabled');
        this.setupToggle('grain-enabled', 'grainEnabled');
        this.setupToggle('bloom-enabled', 'bloomEnabled');
        
        // 自動追従
        this.setupAutoFocusEvents();
        
        // スロットイベント
        this.setupSlotEvents();
        
        // 保存スロット適用ボタン
        document.getElementById('cep-apply-slot').addEventListener('click', () => {
            const selected = document.querySelector('.cep-slot-item.selected');
            if (!selected) {
                alert('スロットを選択してください');
                return;
            }
            const slotNum = parseInt(selected.dataset.slot);
            const slotData = this.savedSlots[slotNum];
            if (!slotData) {
                alert('このスロットは空です');
                return;
            }
            this.loadFromSlot(slotNum);
        });
        
        // 保存ダイアログ表示
        document.getElementById('cep-show-save-dialog').addEventListener('click', () => {
            document.getElementById('cep-save-dialog').style.display = 'block';
            document.getElementById('cep-save-name').focus();
        });
        
        // 保存キャンセル
        document.getElementById('cep-cancel-save').addEventListener('click', () => {
            document.getElementById('cep-save-dialog').style.display = 'none';
        });
        
        // 保存確定
        document.getElementById('cep-confirm-save').addEventListener('click', () => {
            const slotNum = parseInt(document.getElementById('cep-save-slot-select').value);
            const name = document.getElementById('cep-save-name').value.trim() || `プリセット ${slotNum}`;
            this.saveToSlot(slotNum, name);
            document.getElementById('cep-save-dialog').style.display = 'none';
            document.getElementById('cep-save-name').value = '';
        });
        
        // リセット
        document.getElementById('cep-reset').addEventListener('click', () => this.resetToDefault());
    }
    
    setupSlider(id, settingKey, formatFn, extraCallback) {
        const slider = document.getElementById(`cep-${id}`);
        const valueInput = document.getElementById(`cep-${id}-val`);
        
        if (!slider || !valueInput) return;
        
        slider.addEventListener('input', () => {
            let value = parseFloat(slider.value);
            this.settings[settingKey] = value;
            valueInput.value = formatFn(value);
            this.applyEffects();
            if (extraCallback) extraCallback();
        });
        
        valueInput.addEventListener('change', () => {
            let value = parseFloat(valueInput.value.replace(/[^0-9.-]/g, ''));
            if (!isNaN(value)) {
                value = Math.max(parseFloat(slider.min), Math.min(parseFloat(slider.max), value));
                this.settings[settingKey] = value;
                slider.value = value;
                valueInput.value = formatFn(value);
                this.applyEffects();
                if (extraCallback) extraCallback();
            }
        });
    }
    
    setupToggle(id, settingKey) {
        const toggle = document.getElementById(`cep-${id}`);
        if (!toggle) return;
        
        toggle.addEventListener('change', () => {
            this.settings[settingKey] = toggle.checked;
            this.applyEffects();
        });
    }
    
    setupAutoFocusEvents() {
        const autofocusEnabled = document.getElementById('cep-autofocus-enabled');
        const autofocusTarget = document.getElementById('cep-autofocus-target');
        const autofocusFace = document.getElementById('cep-autofocus-face');
        const autofocusBody = document.getElementById('cep-autofocus-body');
        const autofocusStatus = document.getElementById('cep-autofocus-status');
        const aiDirectorInfo = document.getElementById('cep-ai-director-info');
        const partRow = document.getElementById('cep-autofocus-part-row');
        
        const updateAutoFocusStatus = () => {
            const enabled = autofocusEnabled?.checked || false;
            const target = autofocusTarget?.value || 'none';
            
            this.settings.autoFocusEnabled = enabled;
            this.settings.autoFocusTarget = target;
            
            // ★ AI Director連動時のUI切り替え
            const isAIDirector = (target === 'aiDirector');
            if (aiDirectorInfo) {
                aiDirectorInfo.style.display = isAIDirector ? 'block' : 'none';
            }
            if (partRow) {
                // AI Director連動時は部位選択を非表示（自動判定されるため）
                partRow.style.display = isAIDirector ? 'none' : 'flex';
            }
            
            if (!enabled || target === 'none') {
                if (autofocusStatus) {
                    autofocusStatus.textContent = '自動追従: OFF';
                    autofocusStatus.style.color = '#888';
                }
            } else if (isAIDirector) {
                // ★ AI Director連動モード
                if (autofocusStatus) {
                    autofocusStatus.textContent = '🎬 AI Director連動: ON';
                    autofocusStatus.style.color = '#9b59b6';
                }
            } else {
                const targetName = target === 'characterA' ? 'キャラA' : 'キャラB';
                const partName = this.settings.autoFocusPart === 'face' ? '顔' : '体';
                if (autofocusStatus) {
                    autofocusStatus.textContent = `自動追従: ${targetName} (${partName})`;
                    autofocusStatus.style.color = '#4ecdc4';
                }
            }
            
            // ★ DOFシステムに通知
            if (window.dofSystem) {
                if (isAIDirector) {
                    // AI Director連動モードを有効化
                    window.dofSystem.setAIDirectorLink(enabled);
                } else {
                    // 通常の自動追従
                    window.dofSystem.setAIDirectorLink(false);
                    window.dofSystem.setAutoFocus(enabled, target, this.settings.autoFocusPart);
                }
            }
        };
        
        if (autofocusEnabled) {
            autofocusEnabled.addEventListener('change', updateAutoFocusStatus);
        }
        
        if (autofocusTarget) {
            autofocusTarget.addEventListener('change', updateAutoFocusStatus);
        }
        
        if (autofocusFace) {
            autofocusFace.addEventListener('click', () => {
                this.settings.autoFocusPart = 'face';
                autofocusFace.style.background = 'linear-gradient(135deg, #4ecdc4 0%, #44a08d 100%)';
                autofocusFace.style.border = 'none';
                autofocusFace.style.color = 'white';
                if (autofocusBody) {
                    autofocusBody.style.background = 'rgba(255,255,255,0.1)';
                    autofocusBody.style.border = '1px solid rgba(255,255,255,0.2)';
                    autofocusBody.style.color = '#aaa';
                }
                updateAutoFocusStatus();
            });
        }
        
        if (autofocusBody) {
            autofocusBody.addEventListener('click', () => {
                this.settings.autoFocusPart = 'body';
                autofocusBody.style.background = 'linear-gradient(135deg, #4ecdc4 0%, #44a08d 100%)';
                autofocusBody.style.border = 'none';
                autofocusBody.style.color = 'white';
                if (autofocusFace) {
                    autofocusFace.style.background = 'rgba(255,255,255,0.1)';
                    autofocusFace.style.border = '1px solid rgba(255,255,255,0.2)';
                    autofocusFace.style.color = '#aaa';
                }
                updateAutoFocusStatus();
            });
        }
    }
    
    setupDrag() {
        const handle = document.getElementById('cep-drag-handle');
        let isDragging = false;
        let startX, startY, startLeft, startTop;
        
        handle.addEventListener('mousedown', (e) => {
            if (e.target.closest('.cep-header-btn')) return;
            isDragging = true;
            startX = e.clientX;
            startY = e.clientY;
            const rect = this.panel.getBoundingClientRect();
            startLeft = rect.left;
            startTop = rect.top;
            this.panel.style.transition = 'none';
        });
        
        document.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            const dx = e.clientX - startX;
            const dy = e.clientY - startY;
            this.panel.style.left = `${startLeft + dx}px`;
            this.panel.style.top = `${startTop + dy}px`;
        });
        
        document.addEventListener('mouseup', () => {
            isDragging = false;
            this.panel.style.transition = 'all 0.3s ease';
        });
    }
    
    saveToSlot(slotNum, name) {
        this.savedSlots[slotNum] = {
            name: name,
            settings: { ...this.settings },
            savedAt: new Date().toISOString()
        };
        this.saveSlotsToStorage();
        this.updateSlotsList();
        console.log(`💾 スロット ${slotNum} に保存: ${name}`);
    }
    
    loadFromSlot(slotNum) {
        const slotData = this.savedSlots[slotNum];
        if (!slotData) return;
        
        // 設定を適用
        this.settings = { ...this.defaultSettings, ...slotData.settings };
        this.updateUIFromSettings();
        this.applyEffects();
        
        console.log(`📂 スロット ${slotNum} を適用: ${slotData.name}`);
    }
    
    applyPreset(presetKey) {
        const preset = this.presets[presetKey];
        if (!preset) return;
        
        // まずデフォルトにリセット
        this.settings = { ...this.defaultSettings };
        
        // プリセットの値を適用
        Object.keys(preset).forEach(key => {
            if (key !== 'name' && this.settings.hasOwnProperty(key)) {
                this.settings[key] = preset[key];
            }
        });
        
        this.settings.currentPreset = presetKey;
        this.updateUIFromSettings();
        this.applyEffects();
        
        console.log(`🎨 プリセット適用: ${preset.name}`);
    }
    
    updateUIFromSettings() {
        // スライダー更新
        const updates = [
            ['focal-length', this.settings.focalLength, `${this.settings.focalLength}mm`],
            ['fstop', this.settings.fStop, `f/${this.settings.fStop}`],
            ['focus-distance', this.settings.focusDistance, `${this.settings.focusDistance}m`],
            ['bokeh-intensity', this.settings.bokehIntensity, `${Math.round(this.settings.bokehIntensity * 100)}%`],
            ['dof-range', this.settings.dofRange, `${Math.round(this.settings.dofRange * 100)}%`],
            ['white-balance', this.settings.whiteBalance, `${this.settings.whiteBalance}K`],
            ['tint', this.settings.tint, `${this.settings.tint}`],
            ['exposure', this.settings.exposure, `${this.settings.exposure >= 0 ? '+' : ''}${this.settings.exposure}`],
            ['contrast', this.settings.contrast, `${this.settings.contrast}`],
            ['gamma', this.settings.gamma, this.settings.gamma.toFixed(2)],
            ['saturation', this.settings.saturation, `${this.settings.saturation}`],
            ['brightness', this.settings.brightness, `${this.settings.brightness}`],
            ['hue', this.settings.hue, `${this.settings.hue}°`],
            ['vignette-intensity', this.settings.vignetteIntensity, `${Math.round(this.settings.vignetteIntensity * 100)}%`],
            ['grain-intensity', this.settings.grainIntensity, `${Math.round(this.settings.grainIntensity * 100)}%`],
            ['bloom-intensity', this.settings.bloomIntensity, `${Math.round(this.settings.bloomIntensity * 100)}%`]
        ];
        
        updates.forEach(([id, value, displayValue]) => {
            const slider = document.getElementById(`cep-${id}`);
            const valueInput = document.getElementById(`cep-${id}-val`);
            if (slider) slider.value = value;
            if (valueInput) valueInput.value = displayValue;
        });
        
        // トグル更新
        const toggles = [
            ['dof-enabled', 'dofEnabled'],
            ['vignette-enabled', 'vignetteEnabled'],
            ['grain-enabled', 'grainEnabled'],
            ['bloom-enabled', 'bloomEnabled'],
            ['autofocus-enabled', 'autoFocusEnabled']
        ];
        
        toggles.forEach(([id, key]) => {
            const toggle = document.getElementById(`cep-${id}`);
            if (toggle) toggle.checked = this.settings[key] || false;
        });
        
        // 自動追従ターゲット
        const targetSelect = document.getElementById('cep-autofocus-target');
        if (targetSelect) targetSelect.value = this.settings.autoFocusTarget || 'none';
        
        // 自動追従部位ボタン
        const faceBtn = document.getElementById('cep-autofocus-face');
        const bodyBtn = document.getElementById('cep-autofocus-body');
        if (this.settings.autoFocusPart === 'face') {
            if (faceBtn) {
                faceBtn.style.background = 'linear-gradient(135deg, #4ecdc4 0%, #44a08d 100%)';
                faceBtn.style.color = 'white';
                faceBtn.style.border = 'none';
            }
            if (bodyBtn) {
                bodyBtn.style.background = 'rgba(255,255,255,0.1)';
                bodyBtn.style.color = '#aaa';
                bodyBtn.style.border = '1px solid rgba(255,255,255,0.2)';
            }
        } else {
            if (bodyBtn) {
                bodyBtn.style.background = 'linear-gradient(135deg, #4ecdc4 0%, #44a08d 100%)';
                bodyBtn.style.color = 'white';
                bodyBtn.style.border = 'none';
            }
            if (faceBtn) {
                faceBtn.style.background = 'rgba(255,255,255,0.1)';
                faceBtn.style.color = '#aaa';
                faceBtn.style.border = '1px solid rgba(255,255,255,0.2)';
            }
        }
        
        this.updateCameraFOV();
    }
    
    updateCameraFOV() {
        const sensorHeight = 24;
        const fov = 2 * Math.atan(sensorHeight / (2 * this.settings.focalLength)) * (180 / Math.PI);
        
        let camera = window.app?.camera || window.viewer?.camera;
        if (camera) {
            camera.fov = fov;
            camera.updateProjectionMatrix();
        }
    }
    
    applyEffects() {
        const filters = [];
        
        // 露出
        if (this.settings.exposure !== 0) {
            const exposureMult = Math.pow(2, this.settings.exposure);
            filters.push(`brightness(${exposureMult})`);
        }
        
        // 明度
        if (this.settings.brightness !== 0) {
            filters.push(`brightness(${1 + this.settings.brightness / 100})`);
        }
        
        // コントラスト
        if (this.settings.contrast !== 0) {
            filters.push(`contrast(${1 + this.settings.contrast / 100})`);
        }
        
        // 彩度
        if (this.settings.saturation !== 0) {
            filters.push(`saturate(${1 + this.settings.saturation / 100})`);
        }
        
        // 色相
        if (this.settings.hue !== 0) {
            filters.push(`hue-rotate(${this.settings.hue}deg)`);
        }
        
        // ホワイトバランス
        const wbOffset = (this.settings.whiteBalance - 5500) / 5500;
        if (Math.abs(wbOffset) > 0.05) {
            if (wbOffset > 0) {
                filters.push(`sepia(${Math.abs(wbOffset) * 0.2})`);
                filters.push(`hue-rotate(${wbOffset * -30}deg)`);
            } else {
                filters.push(`sepia(${Math.abs(wbOffset) * 0.3})`);
                filters.push(`hue-rotate(${wbOffset * 20}deg)`);
            }
        }
        
        // キャンバスにフィルター適用
        const canvas = document.querySelector('#canvas-container canvas');
        if (canvas) {
            canvas.style.filter = filters.length > 0 ? filters.join(' ') : '';
        }
        
        // ガンマ補正
        this.applyGammaCorrection();
        
        // ビネット
        this.applyVignette();
        
        // グレイン
        this.applyGrain();
        
        // ブルーム
        this.applyBloom();
        
        // DOFシステムに通知
        window.dispatchEvent(new CustomEvent('cameraEffectsChanged', { detail: this.settings }));
    }
    
    applyGammaCorrection() {
        let svgFilter = document.getElementById('cep-gamma-svg');
        const container = document.getElementById('canvas-container');
        
        if (this.settings.gamma !== 1.0) {
            if (!svgFilter) {
                svgFilter = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
                svgFilter.id = 'cep-gamma-svg';
                svgFilter.style.cssText = 'position: absolute; width: 0; height: 0;';
                document.body.appendChild(svgFilter);
            }
            
            const gamma = 1 / this.settings.gamma;
            svgFilter.innerHTML = `
                <defs>
                    <filter id="cep-gamma-filter">
                        <feComponentTransfer>
                            <feFuncR type="gamma" amplitude="1" exponent="${gamma}" offset="0"/>
                            <feFuncG type="gamma" amplitude="1" exponent="${gamma}" offset="0"/>
                            <feFuncB type="gamma" amplitude="1" exponent="${gamma}" offset="0"/>
                        </feComponentTransfer>
                    </filter>
                </defs>
            `;
            
            if (container) {
                const currentFilter = container.style.filter || '';
                if (!currentFilter.includes('url(#cep-gamma-filter)')) {
                    container.style.filter = `url(#cep-gamma-filter) ${currentFilter}`;
                }
            }
        } else {
            if (container) {
                container.style.filter = container.style.filter.replace(/url\(#cep-gamma-filter\)\s*/g, '');
            }
        }
    }
    
    applyVignette() {
        let vignette = document.getElementById('cep-vignette-overlay');
        
        if (this.settings.vignetteEnabled) {
            if (!vignette) {
                vignette = document.createElement('div');
                vignette.id = 'cep-vignette-overlay';
                vignette.style.cssText = `
                    position: fixed;
                    top: 0; left: 0; right: 0; bottom: 0;
                    pointer-events: none;
                    z-index: 100;
                `;
                document.body.appendChild(vignette);
            }
            
            const intensity = this.settings.vignetteIntensity;
            vignette.style.background = `radial-gradient(ellipse at center, 
                transparent 0%, 
                transparent ${60 - intensity * 30}%, 
                rgba(0, 0, 0, ${intensity * 0.8}) 100%
            )`;
            vignette.style.display = 'block';
        } else if (vignette) {
            vignette.style.display = 'none';
        }
    }
    
    applyGrain() {
        let grain = document.getElementById('cep-grain-overlay');
        
        if (this.settings.grainEnabled) {
            if (!grain) {
                grain = document.createElement('div');
                grain.id = 'cep-grain-overlay';
                grain.style.cssText = `
                    position: fixed;
                    top: 0; left: 0; right: 0; bottom: 0;
                    pointer-events: none;
                    z-index: 101;
                    mix-blend-mode: overlay;
                `;
                document.body.appendChild(grain);
                this.animateGrain(grain);
            }
            
            grain.style.opacity = this.settings.grainIntensity;
            grain.style.display = 'block';
        } else if (grain) {
            grain.style.display = 'none';
        }
    }
    
    animateGrain(element) {
        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 256;
        const ctx = canvas.getContext('2d');
        
        const animate = () => {
            if (!this.settings.grainEnabled) return;
            
            const imageData = ctx.createImageData(256, 256);
            for (let i = 0; i < imageData.data.length; i += 4) {
                const value = Math.random() * 255;
                imageData.data[i] = value;
                imageData.data[i + 1] = value;
                imageData.data[i + 2] = value;
                imageData.data[i + 3] = 255;
            }
            ctx.putImageData(imageData, 0, 0);
            element.style.backgroundImage = `url(${canvas.toDataURL()})`;
            
            requestAnimationFrame(animate);
        };
        
        animate();
    }
    
    applyBloom() {
        let bloomOverlay = document.getElementById('cep-bloom-overlay');
        
        if (this.settings.bloomEnabled && this.settings.bloomIntensity > 0) {
            if (!bloomOverlay) {
                bloomOverlay = document.createElement('div');
                bloomOverlay.id = 'cep-bloom-overlay';
                bloomOverlay.style.cssText = `
                    position: fixed;
                    top: 0; left: 0; right: 0; bottom: 0;
                    pointer-events: none;
                    z-index: 99;
                    mix-blend-mode: screen;
                `;
                document.body.appendChild(bloomOverlay);
            }
            
            const intensity = this.settings.bloomIntensity;
            const glowColor = `rgba(255, 255, 255, ${intensity * 0.15})`;
            
            bloomOverlay.style.background = `
                radial-gradient(ellipse at center,
                    ${glowColor} 0%,
                    rgba(255, 255, 255, ${intensity * 0.08}) 70%,
                    transparent 100%
                )
            `;
            bloomOverlay.style.filter = `blur(${Math.round(intensity * 30)}px)`;
            bloomOverlay.style.opacity = intensity;
            bloomOverlay.style.display = 'block';
        } else if (bloomOverlay) {
            bloomOverlay.style.display = 'none';
        }
    }
    
    resetToDefault() {
        console.log('🔄 全解除（リセット）開始...');
        
        // 設定をデフォルトに
        this.settings = { ...this.defaultSettings };
        
        // UIを更新
        this.updateUIFromSettings();
        
        // CSSフィルターをクリア
        const canvas = document.querySelector('#canvas-container canvas');
        if (canvas) {
            canvas.style.filter = '';
        }
        
        const container = document.getElementById('canvas-container');
        if (container) {
            container.style.filter = '';
        }
        
        // SVGフィルターを削除
        ['cep-gamma-svg', 'cep-motion-blur-svg', 'cep-stylize-svg'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.remove();
        });
        
        // オーバーレイを非表示
        ['cep-vignette-overlay', 'cep-grain-overlay', 'cep-bloom-overlay',
         'cep-glow-overlay', 'cep-lensflare-overlay', 'cep-halo-overlay',
         'cep-trapcode-overlay', 'cep-gradient-overlay'].forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                el.style.display = 'none';
                el.innerHTML = '';
                el.style.background = '';
                el.style.filter = '';
            }
        });
        
        // DOFシステムをリセット
        if (window.dofSystem) {
            window.dofSystem.setEnabled(false);
            window.dofSystem.setAutoFocus(false, 'none', 'face');
        }
        
        // 自動追従UIをリセット
        const autofocusStatus = document.getElementById('cep-autofocus-status');
        if (autofocusStatus) {
            autofocusStatus.textContent = '自動追従: OFF';
            autofocusStatus.style.color = '#888';
        }
        
        // 拡張効果もリセット
        if (window.cameraEffectsExtended) {
            window.cameraEffectsExtended.clearAllEffects();
        }
        
        // 基本プリセット選択をナチュラルに
        document.querySelectorAll('.cep-preset').forEach(p => p.classList.remove('active'));
        const naturalPreset = document.querySelector('.cep-preset[data-preset="natural"]');
        if (naturalPreset) naturalPreset.classList.add('active');
        
        // エフェクト適用（全て無効状態で）
        this.applyEffects();
        
        console.log('✅ 全解除完了（DOF・自動追従含む）');
    }
    
    toggleMinimize() {
        this.isMinimized = !this.isMinimized;
        this.panel.classList.toggle('minimized', this.isMinimized);
        document.getElementById('cep-minimize').textContent = this.isMinimized ? '➕' : '➖';
    }
    
    show() {
        this.panel.style.display = 'block';
    }
    
    hide() {
        this.panel.style.display = 'none';
    }
    
    toggle() {
        if (this.panel.style.display === 'none') {
            this.show();
        } else {
            this.hide();
        }
    }
    
    getSettings() {
        return { ...this.settings };
    }
    
    setSettings(newSettings) {
        Object.assign(this.settings, newSettings);
        this.updateUIFromSettings();
        this.applyEffects();
    }
}

// グローバルインスタンス
window.cameraEffectsPanel = null;

// 初期化
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        window.cameraEffectsPanel = new CameraEffectsPanel();
        
        // 起動時は常にクリーンな状態
        window.cameraEffectsPanel.resetToDefault();
        console.log('📹 起動時: クリーンな状態で開始');
        
        // デフォルトでは非表示
        window.cameraEffectsPanel.hide();
        
        // ボタンクリックイベント
        const cameraEffectsBtn = document.getElementById('camera-effects-btn');
        if (cameraEffectsBtn) {
            cameraEffectsBtn.addEventListener('click', () => {
                if (window.cameraEffectsPanel) {
                    window.cameraEffectsPanel.toggle();
                }
            });
        }
        
        // キーボードショートカット: Shift+E または Shift+C
        document.addEventListener('keydown', (e) => {
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
            
            if (e.shiftKey && !e.ctrlKey && !e.altKey && (e.key === 'E' || e.key === 'e' || e.key === 'C' || e.key === 'c')) {
                e.preventDefault();
                if (window.cameraEffectsPanel) {
                    window.cameraEffectsPanel.toggle();
                }
            }
        });
        
        console.log('✅ カメラ演出パネル v2.0 初期化完了');
        
    }, 500);
});

if (typeof module !== 'undefined' && module.exports) {
    module.exports = CameraEffectsPanel;
}
