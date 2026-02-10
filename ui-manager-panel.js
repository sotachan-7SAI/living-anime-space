// ========================================
// UI管理パネル v2.8
// ========================================
//
// 🎯 目的:
//   - すべてのUIパネルを一元管理
//   - アイコンボタン類も一括ON/OFF
//   - Shift+U で開閉
//   - 各パネルのON/OFF切り替え
//   - ドラッグで移動可能
//   - リサイズ可能
//   - 最小化可能
//   - 設定をlocalStorageに保存
//
// 【v2.1 改善点】
//   - アイコンボタン類の一括ON/OFF機能追加
//   - 「パネルのみ非表示」ボタン追加
//   - 「アイコンも非表示」ボタン追加
//   - より多くのUI要素を検出
//
// 【v2.3 改善点】
//   - プリセット保存機能追加（1〜10スロット）
//   - 各プリセットに名前を設定可能
//   - プリセットの読み込み・削除機能
//
// 【v2.4 改善点】
//   - visibleクラスで制御されるパネルに対応
//   - touch-panel, behavior-panel, imagination-panel, sozo-wipe-panel
//   - これらのパネルはUI管理パネルから連動して表示/非表示可能
//
// 【v2.5 改善点】
//   - 想像ワイプの専用メソッドを呼ぶように変更
//   - imagination-panelはimaginationWipe.showPanel()/hidePanel()を使用
//   - imagination-wipe-containerはimaginationWipe.showWipe()/hideWipe()を使用
//   - Shift+WとUI管理パネルの連動が正しく動作
//
// 【v2.6 改善点】
//   - 起動時に実際のDOM状態と同期するように変更
//   - 保存された状態ではなく、実際のパネル表示状態を反映
//   - これにより、UI管理パネルを開いた竂間から正しい状態が表示される
//
// ========================================

(function() {
    'use strict';
    
    console.log('📋 UI管理パネル v2.8 読み込み開始');
    
    // ========================================
    // 管理対象パネル定義
    // ========================================
    
    const MANAGED_PANELS = [
        // メインパネル
        { id: 'multi-character-panel', name: 'マルチキャラ会話', shortcut: 'Shift+M', category: 'main' },
        { id: 'supervisor-panel', name: '会話監視システム', shortcut: '', category: 'main' },
        { id: 'ai-director-panel', name: 'AI演出カメラ', shortcut: '', category: 'main' },
        { id: 'pipeline-monitor-panel', name: 'パイプラインモニター', shortcut: '', category: 'main' },
        { id: 'emotion-memory-panel', name: '感情・記憶マネージャー', shortcut: 'Shift+E', category: 'main' },
        
        // 想像・生成系
        { id: 'imagination-panel', name: '想像ワイプ設定', shortcut: 'Shift+W', category: 'generation' },
        { id: 'imagination-wipe-container', name: '想像ワイプ表示', shortcut: '', category: 'generation' },
        { id: 'background-panel', name: 'AI背景生成', shortcut: '', category: 'generation' },
        { id: 'music-panel', name: 'AI音楽生成', shortcut: '', category: 'generation' },
        { id: 'ai-background-panel', name: 'AI背景パネル', shortcut: '', category: 'generation' },
        
        // カメラ系
        { id: 'auto-camera-panel', name: 'AUTOカメラ', shortcut: '', category: 'camera' },
        { id: 'camera-setting-panel', name: 'カメラ設定', shortcut: '', category: 'camera' },
        { id: 'ai-cinematographer-panel', name: 'AI撮影監督', shortcut: '', category: 'camera' },
        
        // モーション・VRM系
        { id: 'vmc-panel', name: 'VMCモーキャプ', shortcut: '', category: 'motion' },
        { id: 'vmc-protocol-panel', name: 'VMC Protocol', shortcut: '', category: 'motion' },
        { id: 'motion-panel', name: 'モーションUI', shortcut: '', category: 'motion' },
        { id: 'hy-motion-panel', name: 'HY-Motion', shortcut: '', category: 'motion' },
        { id: 'motion-float-panel', name: 'モーションフロート', shortcut: '', category: 'motion' },
        { id: 'vrm-model-panel', name: 'VRMモデルUI', shortcut: 'Shift+V', category: 'motion' },
        { id: 'left-panel', name: 'VRMモデルUI（左）', shortcut: '', category: 'motion' },
        { id: 'right-panel', name: 'モーションUI（右）', shortcut: '', category: 'motion' },
        { id: 'morph-panel', name: 'モーフパネル', shortcut: '', category: 'motion' },
        { id: 'body-morph-panel', name: 'ボディモーフ', shortcut: '', category: 'motion' },
        
        // 音声系
        { id: 'sbv2-panel', name: 'SBV2 TTS設定', shortcut: '', category: 'audio' },
        { id: 'grok-voice-panel', name: 'Grok Voice', shortcut: '', category: 'audio' },
        { id: 'local-music-panel', name: 'ローカル音楽', shortcut: '', category: 'audio' },
        { id: 'local-bgm-panel', name: 'ローカルBGM', shortcut: '', category: 'audio' },
        
        // エフェクト系
        { id: 'effects-panel', name: 'エフェクト', shortcut: '', category: 'effects' },
        { id: 'spatial-effects-panel', name: '空間エフェクト', shortcut: '', category: 'effects' },
        { id: 'env-inner-panel', name: '環境内部', shortcut: '', category: 'effects' },
        
        // その他UI
        { id: 'action-panel', name: '行動制御', shortcut: '', category: 'other' },
        { id: 'touch-panel', name: '触るパネル', shortcut: '', category: 'other' },
        { id: 'physics-panel', name: '物理演算', shortcut: 'Shift+B', category: 'other' },
        { id: 'subtitle-settings-panel', name: '字幕設定', shortcut: '', category: 'other' },
        { id: 'story-panel', name: 'ストーリー', shortcut: '', category: 'other' },
        { id: 'initial-settings-panel', name: '初期設定', shortcut: '', category: 'other' },
        { id: 'api-settings-panel', name: 'API設定', shortcut: '', category: 'other' },
        { id: 'startup-settings-panel', name: 'スタートアップ', shortcut: '', category: 'other' },
        { id: 'chat-panel', name: 'チャット', shortcut: '', category: 'other' },
        { id: 'scenario-selector-panel', name: 'シナリオ選択', shortcut: '', category: 'other' },
        { id: 'size-panel', name: 'サイズ調整', shortcut: '', category: 'other' },
        { id: 'behavior-panel', name: '行動パネル', shortcut: '', category: 'other' },
        { id: 'auto-saver-panel', name: '自動保存', shortcut: '', category: 'other' },
        { id: 'ai-bbs-panel', name: 'AI BBS', shortcut: '', category: 'other' },
        { id: 'grok-vision-controls', name: 'Grokの視界UI', shortcut: '', category: 'other' },
        { id: 'grok-vision-preview', name: 'Grokの視界キャプチャー', shortcut: '', category: 'other' },
        { id: 'grok-restriction-panel', name: 'Grok機能制限', shortcut: '', category: 'other' },
        { id: 'screen-tv-panel', name: 'TVスクリーン', shortcut: '', category: 'other' },
        { id: 'panel-control-buttons', name: 'コントロールボタン', shortcut: '', category: 'control' },
    ];
    
    // ========================================
    // アイコンボタン類のセレクタ
    // ========================================
    
    const ICON_BUTTON_SELECTORS = [
        // 左側のフローティングボタン
        '.floating-button',
        '.floating-icon',
        '.side-button',
        '.tool-button',
        // 特定のボタン群
        '#effects-toggle-btn',
        '#physics-toggle-btn',
        '#vmc-toggle-btn',
        '#camera-toggle-btn',
        '#motion-toggle-btn',
        // 画面端のボタン
        '[class*="float"]',
        '[class*="toggle-btn"]',
        '[class*="icon-btn"]',
        // position: fixedの小さいボタン
        'button[style*="position: fixed"]',
        'div[style*="position: fixed"] > button',
        // 特定のID
        '#grok-voice-btn',
        '#gemini-btn',
        '#openai-tts-btn',
        '#google-tts-btn',
        '#sbv2-tts-btn',
        '#high-speed-btn',
        // 左下・右下のアイコン
        '.corner-button',
        '.bottom-button',
    ];
    
    // ========================================
    // UIManagerPanel クラス
    // ========================================
    
    class UIManagerPanel {
        constructor() {
            this.panel = null;
            this.isVisible = false;
            this.isMinimized = false;
            this.panelStates = new Map();
            this.detectedPanels = [];
            this.iconsHidden = false;
            this.hiddenIcons = [];
            
            // ドラッグ用
            this.isDragging = false;
            this.dragOffset = { x: 0, y: 0 };
            
            // リサイズ用
            this.isResizing = false;
            this.originalSize = { width: 0, height: 0 };
            this.originalPos = { x: 0, y: 0 };
            
            // ★ v2.3: プリセット機能
            this.presets = [];  // 最大10個のプリセット
            this.editingPresetIndex = -1;  // 編集中のプリセットインデックス
            
            // 設定を読み込み
            this.loadSettings();
            this.loadPresets();
            
            // キーボードショートカット登録
            this.registerShortcut();
            
            // 初期化後にUI作成
            setTimeout(() => {
                this.detectAllPanels();
                this.syncWithActualDOMState();  // ★ v2.6: 実際のDOM状態と同期
                this.createUI();
            }, 3000);
            
            console.log('📋 UIManagerPanel v2.8 初期化完了');
        }
        
        // ========================================
        // 設定の保存/読み込み
        // ========================================
        
        loadSettings() {
            try {
                const saved = localStorage.getItem('ui_manager_panel_states_v2');
                if (saved) {
                    const data = JSON.parse(saved);
                    if (data.panelStates) {
                        Object.entries(data.panelStates).forEach(([id, visible]) => {
                            this.panelStates.set(id, visible);
                        });
                    }
                    this.iconsHidden = data.iconsHidden || false;
                    console.log('📋 UI状態読み込み完了');
                }
            } catch (e) {
                console.warn('📋 UI状態読み込みエラー:', e);
            }
        }
        
        saveSettings() {
            try {
                const states = {};
                this.panelStates.forEach((visible, id) => {
                    states[id] = visible;
                });
                const data = {
                    panelStates: states,
                    iconsHidden: this.iconsHidden
                };
                localStorage.setItem('ui_manager_panel_states_v2', JSON.stringify(data));
            } catch (e) {
                console.warn('📋 UI状態保存エラー:', e);
            }
        }
        
        // ========================================
        // ★ v2.6: 実際のDOM状態と同期
        // ========================================
        
        /**
         * 起動時に実際のパネルの表示状態を検出してpanelStatesを更新
         * これにより、保存された状態ではなく実際のDOM状態が反映される
         */
        syncWithActualDOMState() {
            console.log('📋 実際のDOM状態と同期中...');
            
            this.detectedPanels.forEach(config => {
                const actualVisible = this.getPanelVisible(config.id);
                this.panelStates.set(config.id, actualVisible);
            });
            
            // 同期後の状態を保存
            this.saveSettings();
            console.log(`📋 DOM同期完了: ${this.detectedPanels.length}個のパネル`);
        }
        
        // ========================================
        // パネル検出（より包括的に）
        // ========================================
        
        detectAllPanels() {
            this.detectedPanels = [];
            const foundIds = new Set();
            
            // 定義済みパネルをチェック
            MANAGED_PANELS.forEach(config => {
                const panel = document.getElementById(config.id);
                if (panel) {
                    this.detectedPanels.push({
                        ...config,
                        element: panel,
                        exists: true
                    });
                    foundIds.add(config.id);
                }
            });
            
            // position: fixed または absolute のパネルを自動検出
            const allElements = document.querySelectorAll('div, section, aside');
            allElements.forEach(el => {
                if (!el.id || foundIds.has(el.id)) return;
                if (el.id === 'ui-manager-panel') return;
                
                const style = window.getComputedStyle(el);
                const isFloating = style.position === 'fixed' || 
                                   (style.position === 'absolute' && parseInt(style.zIndex) > 100);
                
                // パネルっぽい条件（サイズも考慮）
                const rect = el.getBoundingClientRect();
                const isLargeEnough = rect.width > 100 && rect.height > 50;
                
                const isPanelLike = 
                    el.id.toLowerCase().includes('panel') ||
                    el.id.toLowerCase().includes('container') ||
                    el.id.toLowerCase().includes('modal') ||
                    el.id.toLowerCase().includes('settings') ||
                    el.id.toLowerCase().includes('menu') ||
                    el.id.toLowerCase().includes('wipe') ||
                    el.id.toLowerCase().includes('effect') ||
                    el.id.toLowerCase().includes('camera') ||
                    el.id.toLowerCase().includes('motion') ||
                    el.id.toLowerCase().includes('vmc') ||
                    el.id.toLowerCase().includes('vrm') ||
                    el.id.toLowerCase().includes('morph') ||
                    el.id.toLowerCase().includes('subtitle') ||
                    el.id.toLowerCase().includes('supervisor') ||
                    el.id.toLowerCase().includes('director') ||
                    el.id.toLowerCase().includes('environment') ||
                    el.classList.contains('floating-panel') ||
                    el.classList.contains('ui-panel');
                
                if (isFloating && isPanelLike && isLargeEnough) {
                    let name = el.id
                        .replace(/-/g, ' ')
                        .replace(/panel/gi, '')
                        .replace(/container/gi, '')
                        .replace(/modal/gi, '')
                        .trim();
                    
                    name = name.charAt(0).toUpperCase() + name.slice(1);
                    
                    // 特別な名前変換
                    const nameMapping = {
                        'Left': 'VRMモデルUI（左）',
                        'Right': 'モーションUI（右）'
                    };
                    if (nameMapping[name]) {
                        name = nameMapping[name];
                    }
                    
                    this.detectedPanels.push({
                        id: el.id,
                        name: name || el.id,
                        shortcut: '',
                        category: 'detected',
                        element: el,
                        exists: true
                    });
                    foundIds.add(el.id);
                }
            });
            
            console.log(`📋 検出されたパネル: ${this.detectedPanels.length}個`);
            return this.detectedPanels;
        }
        
        // ========================================
        // アイコンボタン検出・管理
        // ========================================
        
        detectIconButtons() {
            const icons = new Set();
            
            // セレクタで検出
            ICON_BUTTON_SELECTORS.forEach(selector => {
                try {
                    document.querySelectorAll(selector).forEach(el => {
                        if (el.id !== 'ui-manager-panel' && !el.closest('#ui-manager-panel')) {
                            icons.add(el);
                        }
                    });
                } catch (e) {}
            });
            
            // position: fixedの小さいボタン/div
            document.querySelectorAll('button, div').forEach(el => {
                if (el.id === 'ui-manager-panel' || el.closest('#ui-manager-panel')) return;
                
                const style = window.getComputedStyle(el);
                if (style.position === 'fixed') {
                    const rect = el.getBoundingClientRect();
                    // 小さい要素（アイコンサイズ）
                    if (rect.width > 20 && rect.width < 200 && rect.height > 20 && rect.height < 200) {
                        // パネルではない
                        if (!el.id.toLowerCase().includes('panel')) {
                            icons.add(el);
                        }
                    }
                }
            });
            
            // 左側・右側端のボタン群
            document.querySelectorAll('button').forEach(btn => {
                if (btn.closest('#ui-manager-panel')) return;
                
                const rect = btn.getBoundingClientRect();
                // 画面端（左200px以内 or 右200px以内）
                if (rect.left < 200 || rect.right > window.innerWidth - 200) {
                    const style = window.getComputedStyle(btn);
                    if (style.position === 'fixed' || style.position === 'absolute') {
                        icons.add(btn);
                    }
                }
                
                // 下端100px以内
                if (rect.bottom > window.innerHeight - 100) {
                    const style = window.getComputedStyle(btn);
                    if (style.position === 'fixed' || style.position === 'absolute') {
                        icons.add(btn);
                    }
                }
            });
            
            // 上部のボタンバー（API設定、初期設定、ストーリーなど）
            document.querySelectorAll('button').forEach(btn => {
                if (btn.closest('#ui-manager-panel')) return;
                
                const rect = btn.getBoundingClientRect();
                // 上端80px以内
                if (rect.top < 80) {
                    icons.add(btn);
                }
            });
            
            // 左側のフローティングボタングループ
            document.querySelectorAll('[class*="floating"], [class*="side-"], [class*="tool-"]').forEach(el => {
                if (!el.closest('#ui-manager-panel')) {
                    icons.add(el);
                }
            });
            
            return Array.from(icons);
        }
        
        hideAllIcons() {
            this.hiddenIcons = [];
            const icons = this.detectIconButtons();
            
            icons.forEach(icon => {
                const currentDisplay = icon.style.display;
                const currentVisibility = icon.style.visibility;
                
                // 元の状態を保存
                this.hiddenIcons.push({
                    element: icon,
                    originalDisplay: currentDisplay,
                    originalVisibility: currentVisibility
                });
                
                icon.style.display = 'none';
            });
            
            this.iconsHidden = true;
            this.saveSettings();
            console.log(`📋 アイコン非表示: ${icons.length}個`);
            this.updateUI();
        }
        
        showAllIcons() {
            // hiddenIcons配列がある場合はそれを使う
            if (this.hiddenIcons.length > 0) {
                this.hiddenIcons.forEach(item => {
                    if (item.element) {
                        item.element.style.display = item.originalDisplay || '';
                        item.element.style.visibility = item.originalVisibility || '';
                    }
                });
            } else {
                // ページリロード後など、hiddenIcons配列が空の場合は再検出して表示
                const icons = this.detectIconButtons();
                icons.forEach(icon => {
                    // display: noneになっているものを復元
                    if (icon.style.display === 'none') {
                        icon.style.display = '';
                    }
                    if (icon.style.visibility === 'hidden') {
                        icon.style.visibility = '';
                    }
                });
                console.log(`📋 アイコン表示復元（再検出）: ${icons.length}個`);
            }
            
            this.hiddenIcons = [];
            this.iconsHidden = false;
            this.saveSettings();
            console.log('📋 アイコン表示復元');
            this.updateUI();
        }
        
        toggleIcons() {
            if (this.iconsHidden) {
                this.showAllIcons();
            } else {
                this.hideAllIcons();
            }
        }
        
        // ========================================
        // パネル状態管理
        // ========================================
        
        // ★ v2.4: visibleクラスで制御されるパネルのリスト
        // これらのパネルは display ではなく visible クラスの有無で表示制御
        static VISIBLE_CLASS_PANELS = [
            'touch-panel',
            'behavior-panel'
            // imagination-panelはdisplayで制御されるので含めない
        ];
        
        getPanelVisible(panelId) {
            const panel = document.getElementById(panelId);
            if (panel) {
                // visibleクラスで制御されるパネルかチェック
                if (UIManagerPanel.VISIBLE_CLASS_PANELS.includes(panelId)) {
                    return panel.classList.contains('visible');
                }
                // 通常のdisplay/visibilityチェック
                const style = window.getComputedStyle(panel);
                return style.display !== 'none' && style.visibility !== 'hidden';
            }
            return false;
        }
        
        setPanelVisible(panelId, visible) {
            const panel = document.getElementById(panelId);
            if (panel) {
                // ★ v2.7: 感情・記憶マネージャーパネルの特別処理
                if (panelId === 'emotion-memory-panel' && window.emotionMemoryPanel) {
                    if (visible) {
                        window.emotionMemoryPanel.show();
                    } else {
                        window.emotionMemoryPanel.hide();
                    }
                    this.panelStates.set(panelId, visible);
                    this.saveSettings();
                    console.log(`📋 ${panelId}: ${visible ? '表示' : '非表示'}`);
                    return;
                }
                // ★ v2.5: 特定のパネルは専用メソッドを呼ぶ
                if (panelId === 'imagination-panel' && window.imaginationWipe) {
                    if (visible) {
                        window.imaginationWipe.showPanel();
                    } else {
                        window.imaginationWipe.hidePanel();
                    }
                } else if (panelId === 'imagination-wipe-container' && window.imaginationWipe) {
                    if (visible) {
                        window.imaginationWipe.showWipe();
                    } else {
                        window.imaginationWipe.hideWipe();
                    }
                } else if (panelId === 'grok-vision-controls' || panelId === 'grok-vision-preview') {
                    // Grokの視界UIはflexboxで表示
                    panel.style.display = visible ? 'flex' : 'none';
                } else if (UIManagerPanel.VISIBLE_CLASS_PANELS.includes(panelId)) {
                    // visibleクラスで制御されるパネル
                    if (visible) {
                        panel.classList.add('visible');
                        panel.style.display = '';
                    } else {
                        panel.classList.remove('visible');
                        panel.style.display = 'none';
                    }
                } else {
                    // 通常のdisplay制御
                    panel.style.display = visible ? '' : 'none';
                }
                this.panelStates.set(panelId, visible);
                this.saveSettings();
                console.log(`📋 ${panelId}: ${visible ? '表示' : '非表示'}`);
            }
        }
        
        togglePanel(panelId) {
            const currentVisible = this.getPanelVisible(panelId);
            this.setPanelVisible(panelId, !currentVisible);
            this.updateUI();
        }
        
        showAll() {
            this.detectedPanels.forEach(config => {
                if (config.id !== 'ui-manager-panel') {
                    this.setPanelVisible(config.id, true);
                }
            });
            this.showAllIcons();
            this.updateUI();
        }
        
        hideAll() {
            this.detectedPanels.forEach(config => {
                if (config.id !== 'ui-manager-panel') {
                    this.setPanelVisible(config.id, false);
                }
            });
            this.hideAllIcons();
            this.updateUI();
        }
        
        hideOnlyPanels() {
            this.detectedPanels.forEach(config => {
                if (config.id !== 'ui-manager-panel') {
                    this.setPanelVisible(config.id, false);
                }
            });
            this.updateUI();
        }
        
        resetToDefault() {
            this.panelStates.clear();
            this.showAllIcons();
            localStorage.removeItem('ui_manager_panel_states_v2');
            this.updateUI();
            console.log('📋 UI状態をリセット');
        }
        
        // ========================================
        // ★ v2.3: プリセット機能
        // ========================================
        
        loadPresets() {
            try {
                const saved = localStorage.getItem('ui_manager_presets_v23');
                if (saved) {
                    this.presets = JSON.parse(saved);
                    console.log(`📋 プリセット読み込み完了: ${this.presets.length}個`);
                } else {
                    this.presets = [];
                }
            } catch (e) {
                console.warn('📋 プリセット読み込みエラー:', e);
                this.presets = [];
            }
        }
        
        savePresets() {
            try {
                localStorage.setItem('ui_manager_presets_v23', JSON.stringify(this.presets));
            } catch (e) {
                console.warn('📋 プリセット保存エラー:', e);
            }
        }
        
        /**
         * 現在の状態をプリセットとして取得
         */
        getCurrentStateAsPreset() {
            const panelStates = {};
            this.detectedPanels.forEach(config => {
                panelStates[config.id] = this.getPanelVisible(config.id);
            });
            
            return {
                panelStates: panelStates,
                iconsHidden: this.iconsHidden,
                timestamp: Date.now()
            };
        }
        
        /**
         * プリセットを保存
         */
        saveToPreset(slotIndex, name = '') {
            if (slotIndex < 0 || slotIndex >= 10) return;
            
            const preset = this.getCurrentStateAsPreset();
            preset.name = name || `プリセット ${slotIndex + 1}`;
            preset.slotIndex = slotIndex;
            
            // 既存スロットを探す
            const existingIndex = this.presets.findIndex(p => p.slotIndex === slotIndex);
            if (existingIndex >= 0) {
                this.presets[existingIndex] = preset;
            } else {
                this.presets.push(preset);
            }
            
            this.savePresets();
            this.updatePresetsUI();
            console.log(`📋 プリセット ${slotIndex + 1} に保存: ${preset.name}`);
        }
        
        /**
         * プリセットを読み込み
         */
        loadFromPreset(slotIndex) {
            const preset = this.presets.find(p => p.slotIndex === slotIndex);
            if (!preset) {
                console.log(`📋 プリセット ${slotIndex + 1} は空です`);
                return;
            }
            
            // パネル状態を復元
            if (preset.panelStates) {
                Object.entries(preset.panelStates).forEach(([panelId, visible]) => {
                    const panel = document.getElementById(panelId);
                    if (panel) {
                        panel.style.display = visible ? '' : 'none';
                        this.panelStates.set(panelId, visible);
                    }
                });
            }
            
            // アイコン状態を復元
            if (preset.iconsHidden !== undefined) {
                if (preset.iconsHidden && !this.iconsHidden) {
                    this.hideAllIcons();
                } else if (!preset.iconsHidden && this.iconsHidden) {
                    this.showAllIcons();
                }
            }
            
            this.saveSettings();
            this.updateUI();
            console.log(`📋 プリセット ${slotIndex + 1} を読み込み: ${preset.name}`);
        }
        
        /**
         * プリセットを削除
         */
        deletePreset(slotIndex) {
            const index = this.presets.findIndex(p => p.slotIndex === slotIndex);
            if (index >= 0) {
                const name = this.presets[index].name;
                this.presets.splice(index, 1);
                this.savePresets();
                this.updatePresetsUI();
                console.log(`📋 プリセット ${slotIndex + 1} を削除: ${name}`);
            }
        }
        
        /**
         * プリセット名を変更
         */
        renamePreset(slotIndex, newName) {
            const preset = this.presets.find(p => p.slotIndex === slotIndex);
            if (preset) {
                preset.name = newName || `プリセット ${slotIndex + 1}`;
                this.savePresets();
                this.updatePresetsUI();
                console.log(`📋 プリセット ${slotIndex + 1} 名前変更: ${preset.name}`);
            }
        }
        
        /**
         * プリセット名編集開始
         */
        startEditPresetName(slotIndex) {
            this.editingPresetIndex = slotIndex;
            this.updatePresetsUI();
            
            // 入力欄にフォーカス
            setTimeout(() => {
                const input = document.getElementById(`preset-name-input-${slotIndex}`);
                if (input) {
                    input.focus();
                    input.select();
                }
            }, 50);
        }
        
        /**
         * プリセット名編集終了
         */
        finishEditPresetName(slotIndex) {
            const input = document.getElementById(`preset-name-input-${slotIndex}`);
            if (input) {
                this.renamePreset(slotIndex, input.value.trim());
            }
            this.editingPresetIndex = -1;
            this.updatePresetsUI();
        }
        
        /**
         * プリセットUIを更新
         */
        updatePresetsUI() {
            const container = document.getElementById('uim-presets-list');
            if (!container) return;
            
            let html = '';
            for (let i = 0; i < 10; i++) {
                const preset = this.presets.find(p => p.slotIndex === i);
                const isEmpty = !preset;
                const isEditing = this.editingPresetIndex === i;
                const name = preset ? preset.name : `スロット ${i + 1}`;
                const visibleCount = preset ? Object.values(preset.panelStates).filter(v => v).length : 0;
                const date = preset ? new Date(preset.timestamp).toLocaleDateString('ja-JP', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '';
                
                html += `
                    <div class="uim-preset-slot ${isEmpty ? 'empty' : 'saved'}" data-slot="${i}">
                        <div class="uim-preset-number">${i + 1}</div>
                        <div class="uim-preset-info">
                            ${isEditing ? `
                                <input type="text" 
                                       id="preset-name-input-${i}" 
                                       class="uim-preset-name-input" 
                                       value="${preset ? preset.name : ''}" 
                                       placeholder="名前を入力..."
                                       onkeydown="if(event.key==='Enter')window.uiManagerPanel.finishEditPresetName(${i})"
                                       onblur="window.uiManagerPanel.finishEditPresetName(${i})">
                            ` : `
                                <span class="uim-preset-name" 
                                      onclick="${isEmpty ? '' : `window.uiManagerPanel.startEditPresetName(${i})`}"
                                      title="${isEmpty ? '' : 'クリックで名前編集'}">
                                    ${name}
                                </span>
                            `}
                            ${!isEmpty ? `<span class="uim-preset-meta">${visibleCount}個表示 | ${date}</span>` : ''}
                        </div>
                        <div class="uim-preset-actions">
                            ${isEmpty ? `
                                <button class="uim-preset-btn save" onclick="window.uiManagerPanel.promptSavePreset(${i})" title="現在の状態を保存">
                                    💾
                                </button>
                            ` : `
                                <button class="uim-preset-btn load" onclick="window.uiManagerPanel.loadFromPreset(${i})" title="読み込む">
                                    📂
                                </button>
                                <button class="uim-preset-btn save" onclick="window.uiManagerPanel.promptSavePreset(${i})" title="上書き保存">
                                    💾
                                </button>
                                <button class="uim-preset-btn delete" onclick="window.uiManagerPanel.confirmDeletePreset(${i})" title="削除">
                                    🗑️
                                </button>
                            `}
                        </div>
                    </div>
                `;
            }
            
            container.innerHTML = html;
        }
        
        /**
         * 保存確認ダイアログ
         */
        promptSavePreset(slotIndex) {
            const preset = this.presets.find(p => p.slotIndex === slotIndex);
            const currentName = preset ? preset.name : `プリセット ${slotIndex + 1}`;
            
            const name = prompt(`プリセット ${slotIndex + 1} の名前を入力:`, currentName);
            if (name !== null) {
                this.saveToPreset(slotIndex, name);
            }
        }
        
        /**
         * 削除確認
         */
        confirmDeletePreset(slotIndex) {
            const preset = this.presets.find(p => p.slotIndex === slotIndex);
            if (preset && confirm(`「${preset.name}」を削除しますか？`)) {
                this.deletePreset(slotIndex);
            }
        }
        
        // ========================================
        // キーボードショートカット
        // ========================================
        
        registerShortcut() {
            document.addEventListener('keydown', (e) => {
                if (e.shiftKey && e.key.toLowerCase() === 'u') {
                    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
                        return;
                    }
                    e.preventDefault();
                    this.toggle();
                }
            });
        }
        
        toggle() {
            if (this.isMinimized) {
                this.restore();
            } else {
                this.isVisible = !this.isVisible;
                if (this.panel) {
                    this.panel.style.display = this.isVisible ? 'block' : 'none';
                }
                if (this.isVisible) {
                    this.detectAllPanels();
                    this.updateUI();
                }
            }
        }
        
        minimize() {
            this.isMinimized = true;
            const content = this.panel.querySelector('.uim-content');
            const resizeHandle = this.panel.querySelector('.uim-resize-handle');
            if (content) content.style.display = 'none';
            if (resizeHandle) resizeHandle.style.display = 'none';
            this.panel.style.height = 'auto';
            this.panel.style.width = '200px';
        }
        
        restore() {
            this.isMinimized = false;
            const content = this.panel.querySelector('.uim-content');
            const resizeHandle = this.panel.querySelector('.uim-resize-handle');
            if (content) content.style.display = 'block';
            if (resizeHandle) resizeHandle.style.display = 'block';
            this.panel.style.width = '';
            this.panel.style.height = '';
        }
        
        close() {
            this.isVisible = false;
            if (this.panel) {
                this.panel.style.display = 'none';
            }
        }
        
        // ========================================
        // UI作成
        // ========================================
        
        createUI() {
            const existing = document.getElementById('ui-manager-panel');
            if (existing) existing.remove();
            
            const panel = document.createElement('div');
            panel.id = 'ui-manager-panel';
            panel.innerHTML = `
                <style>
                    #ui-manager-panel {
                        position: fixed;
                        top: 100px;
                        left: 100px;
                        width: 580px;
                        min-width: 300px;
                        min-height: 200px;
                        max-height: 85vh;
                        background: rgba(20, 20, 40, 0.98);
                        border: 2px solid #6a4eff;
                        border-radius: 16px;
                        color: #fff;
                        font-size: 13px;
                        z-index: 100000;
                        overflow: hidden;
                        box-shadow: 0 10px 50px rgba(100, 80, 255, 0.4);
                        display: none;
                    }
                    #ui-manager-panel .uim-header {
                        background: linear-gradient(135deg, #6a4eff, #a855f7);
                        padding: 10px 15px;
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        cursor: move;
                        user-select: none;
                    }
                    #ui-manager-panel .uim-header h3 {
                        margin: 0;
                        font-size: 14px;
                        display: flex;
                        align-items: center;
                        gap: 8px;
                    }
                    #ui-manager-panel .uim-header-btns {
                        display: flex;
                        gap: 6px;
                    }
                    #ui-manager-panel .uim-header-btn {
                        background: rgba(255,255,255,0.2);
                        border: none;
                        color: white;
                        font-size: 14px;
                        cursor: pointer;
                        padding: 4px 10px;
                        border-radius: 6px;
                        transition: all 0.2s;
                    }
                    #ui-manager-panel .uim-header-btn:hover {
                        background: rgba(255,255,255,0.3);
                    }
                    #ui-manager-panel .uim-content {
                        padding: 12px;
                        max-height: calc(85vh - 100px);
                        overflow-y: auto;
                    }
                    #ui-manager-panel .uim-section {
                        margin-bottom: 12px;
                    }
                    #ui-manager-panel .uim-section-title {
                        font-weight: bold;
                        color: #a855f7;
                        margin-bottom: 8px;
                        font-size: 11px;
                        border-bottom: 1px solid #333;
                        padding-bottom: 4px;
                    }
                    #ui-manager-panel .uim-grid {
                        display: grid;
                        grid-template-columns: repeat(2, 1fr);
                        gap: 6px;
                    }
                    #ui-manager-panel .uim-item {
                        background: rgba(255,255,255,0.05);
                        border: 1px solid rgba(255,255,255,0.1);
                        border-radius: 6px;
                        padding: 8px 10px;
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        transition: all 0.2s;
                    }
                    #ui-manager-panel .uim-item:hover {
                        background: rgba(255,255,255,0.08);
                        border-color: rgba(100, 80, 255, 0.3);
                    }
                    #ui-manager-panel .uim-item.visible {
                        border-color: rgba(74, 255, 74, 0.3);
                        background: rgba(74, 255, 74, 0.05);
                    }
                    #ui-manager-panel .uim-item-info {
                        display: flex;
                        flex-direction: column;
                        gap: 1px;
                        flex: 1;
                        min-width: 0;
                    }
                    #ui-manager-panel .uim-item-name {
                        font-weight: bold;
                        font-size: 11px;
                        white-space: nowrap;
                        overflow: hidden;
                        text-overflow: ellipsis;
                    }
                    #ui-manager-panel .uim-item-shortcut {
                        font-size: 9px;
                        color: #888;
                    }
                    #ui-manager-panel .uim-toggle {
                        position: relative;
                        width: 40px;
                        height: 20px;
                        background: #444;
                        border-radius: 10px;
                        cursor: pointer;
                        transition: all 0.3s;
                        flex-shrink: 0;
                    }
                    #ui-manager-panel .uim-toggle.on {
                        background: linear-gradient(135deg, #4aff4a, #00cc66);
                    }
                    #ui-manager-panel .uim-toggle::after {
                        content: '';
                        position: absolute;
                        top: 2px;
                        left: 2px;
                        width: 16px;
                        height: 16px;
                        background: white;
                        border-radius: 50%;
                        transition: all 0.3s;
                        box-shadow: 0 2px 4px rgba(0,0,0,0.3);
                    }
                    #ui-manager-panel .uim-toggle.on::after {
                        left: 22px;
                    }
                    #ui-manager-panel .uim-icon-toggle {
                        display: flex;
                        align-items: center;
                        justify-content: space-between;
                        background: rgba(255, 165, 0, 0.1);
                        border: 1px solid rgba(255, 165, 0, 0.3);
                        border-radius: 8px;
                        padding: 10px 12px;
                        margin-bottom: 10px;
                    }
                    #ui-manager-panel .uim-icon-toggle.hidden {
                        background: rgba(255, 74, 106, 0.1);
                        border-color: rgba(255, 74, 106, 0.3);
                    }
                    #ui-manager-panel .uim-icon-label {
                        font-size: 12px;
                        font-weight: bold;
                    }
                    #ui-manager-panel .uim-actions {
                        display: grid;
                        grid-template-columns: repeat(2, 1fr);
                        gap: 8px;
                        margin-top: 10px;
                        padding-top: 10px;
                        border-top: 1px solid #333;
                    }
                    #ui-manager-panel .uim-btn {
                        padding: 8px;
                        border: none;
                        border-radius: 6px;
                        cursor: pointer;
                        font-size: 11px;
                        font-weight: bold;
                        transition: all 0.2s;
                    }
                    #ui-manager-panel .uim-btn-primary {
                        background: linear-gradient(135deg, #6a4eff, #a855f7);
                        color: white;
                    }
                    #ui-manager-panel .uim-btn-danger {
                        background: #ff4a6a;
                        color: white;
                    }
                    #ui-manager-panel .uim-btn-warning {
                        background: #ff9500;
                        color: white;
                    }
                    #ui-manager-panel .uim-btn-secondary {
                        background: #444;
                        color: white;
                    }
                    #ui-manager-panel .uim-btn:hover {
                        transform: translateY(-1px);
                        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
                    }
                    #ui-manager-panel .uim-hint {
                        text-align: center;
                        color: #666;
                        font-size: 10px;
                        margin-top: 8px;
                    }
                    #ui-manager-panel .uim-resize-handle {
                        position: absolute;
                        bottom: 0;
                        right: 0;
                        width: 20px;
                        height: 20px;
                        cursor: nwse-resize;
                        background: linear-gradient(135deg, transparent 50%, rgba(106, 78, 255, 0.5) 50%);
                        border-radius: 0 0 14px 0;
                    }
                    #ui-manager-panel .uim-count {
                        font-size: 10px;
                        color: #888;
                        margin-left: 8px;
                    }
                    #ui-manager-panel .uim-refresh-btn {
                        background: rgba(255,255,255,0.1);
                        border: none;
                        color: #aaa;
                        font-size: 12px;
                        cursor: pointer;
                        padding: 2px 8px;
                        border-radius: 4px;
                        margin-left: auto;
                    }
                    #ui-manager-panel .uim-refresh-btn:hover {
                        background: rgba(255,255,255,0.2);
                        color: white;
                    }
                    /* ★ v2.3: プリセット機能のスタイル */
                    #ui-manager-panel .uim-presets-section {
                        margin-top: 15px;
                        padding-top: 12px;
                        border-top: 2px solid #6a4eff;
                    }
                    #ui-manager-panel .uim-presets-title {
                        font-weight: bold;
                        color: #f39c12;
                        margin-bottom: 10px;
                        font-size: 12px;
                        display: flex;
                        align-items: center;
                        gap: 8px;
                    }
                    #ui-manager-panel .uim-presets-list {
                        display: flex;
                        flex-direction: column;
                        gap: 6px;
                    }
                    #ui-manager-panel .uim-preset-slot {
                        display: flex;
                        align-items: center;
                        gap: 8px;
                        padding: 8px 10px;
                        background: rgba(255,255,255,0.03);
                        border: 1px solid rgba(255,255,255,0.08);
                        border-radius: 8px;
                        transition: all 0.2s;
                    }
                    #ui-manager-panel .uim-preset-slot:hover {
                        background: rgba(255,255,255,0.06);
                        border-color: rgba(243, 156, 18, 0.3);
                    }
                    #ui-manager-panel .uim-preset-slot.saved {
                        background: rgba(243, 156, 18, 0.08);
                        border-color: rgba(243, 156, 18, 0.25);
                    }
                    #ui-manager-panel .uim-preset-slot.empty {
                        opacity: 0.6;
                    }
                    #ui-manager-panel .uim-preset-number {
                        width: 24px;
                        height: 24px;
                        background: linear-gradient(135deg, #f39c12, #e67e22);
                        border-radius: 6px;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        font-weight: bold;
                        font-size: 12px;
                        flex-shrink: 0;
                    }
                    #ui-manager-panel .uim-preset-slot.empty .uim-preset-number {
                        background: #444;
                    }
                    #ui-manager-panel .uim-preset-info {
                        flex: 1;
                        min-width: 0;
                        display: flex;
                        flex-direction: column;
                        gap: 2px;
                    }
                    #ui-manager-panel .uim-preset-name {
                        font-weight: bold;
                        font-size: 11px;
                        white-space: nowrap;
                        overflow: hidden;
                        text-overflow: ellipsis;
                        cursor: pointer;
                    }
                    #ui-manager-panel .uim-preset-slot.saved .uim-preset-name:hover {
                        color: #f39c12;
                    }
                    #ui-manager-panel .uim-preset-name-input {
                        background: rgba(0,0,0,0.3);
                        border: 1px solid #f39c12;
                        border-radius: 4px;
                        color: white;
                        font-size: 11px;
                        padding: 4px 6px;
                        width: 100%;
                        outline: none;
                    }
                    #ui-manager-panel .uim-preset-meta {
                        font-size: 9px;
                        color: #888;
                    }
                    #ui-manager-panel .uim-preset-actions {
                        display: flex;
                        gap: 4px;
                        flex-shrink: 0;
                    }
                    #ui-manager-panel .uim-preset-btn {
                        width: 28px;
                        height: 28px;
                        border: none;
                        border-radius: 6px;
                        cursor: pointer;
                        font-size: 14px;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        transition: all 0.2s;
                    }
                    #ui-manager-panel .uim-preset-btn.load {
                        background: linear-gradient(135deg, #3498db, #2980b9);
                    }
                    #ui-manager-panel .uim-preset-btn.save {
                        background: linear-gradient(135deg, #27ae60, #229954);
                    }
                    #ui-manager-panel .uim-preset-btn.delete {
                        background: linear-gradient(135deg, #e74c3c, #c0392b);
                    }
                    #ui-manager-panel .uim-preset-btn:hover {
                        transform: scale(1.1);
                        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
                    }
                    #ui-manager-panel .uim-preset-slot.empty .uim-preset-btn.save {
                        background: linear-gradient(135deg, #f39c12, #e67e22);
                    }
                </style>
                
                <div class="uim-header">
                    <h3>📋 UI管理 <span style="font-size:10px; opacity:0.7;">v2.3</span></h3>
                    <div class="uim-header-btns">
                        <button class="uim-header-btn" onclick="window.uiManagerPanel.minimize()" title="最小化">−</button>
                        <button class="uim-header-btn" onclick="window.uiManagerPanel.close()" title="閉じる">×</button>
                    </div>
                </div>
                
                <div class="uim-content">
                    <!-- アイコンボタン一括トグル -->
                    <div class="uim-icon-toggle ${this.iconsHidden ? 'hidden' : ''}" id="uim-icon-toggle">
                        <span class="uim-icon-label">🔘 アイコンボタン類</span>
                        <div class="uim-toggle ${this.iconsHidden ? '' : 'on'}" 
                             onclick="window.uiManagerPanel.toggleIcons()"
                             title="${this.iconsHidden ? 'アイコンを表示' : 'アイコンを非表示'}">
                        </div>
                    </div>
                    
                    <div class="uim-section">
                        <div class="uim-section-title" style="display: flex; align-items: center;">
                            🎛️ パネル表示設定 
                            <span class="uim-count" id="uim-panel-count">(0個)</span>
                            <button class="uim-refresh-btn" onclick="window.uiManagerPanel.refresh()">🔄 更新</button>
                        </div>
                        <div class="uim-grid" id="uim-panel-list">
                            <!-- 動的に生成 -->
                        </div>
                    </div>
                    
                    <div class="uim-actions">
                        <button class="uim-btn uim-btn-primary" onclick="window.uiManagerPanel.showAll()">
                            👁️ 全部表示
                        </button>
                        <button class="uim-btn uim-btn-danger" onclick="window.uiManagerPanel.hideAll()">
                            🙈 全部非表示
                        </button>
                        <button class="uim-btn uim-btn-warning" onclick="window.uiManagerPanel.hideOnlyPanels()">
                            📦 パネルのみ非表示
                        </button>
                        <button class="uim-btn uim-btn-secondary" onclick="window.uiManagerPanel.resetToDefault()">
                            🔄 リセット
                        </button>
                    </div>
                    
                    <div class="uim-hint">
                        Shift + U で開閉 | ヘッダーをドラッグで移動 | 右下でリサイズ
                    </div>
                    
                    <!-- ★ v2.3: プリセット保存機能 -->
                    <div class="uim-presets-section">
                        <div class="uim-presets-title">
                            💾 設定プリセット
                            <span style="font-size:9px;color:#888;font-weight:normal;">現在の表示状態を保存・復元</span>
                        </div>
                        <div class="uim-presets-list" id="uim-presets-list">
                            <!-- 動的に生成 -->
                        </div>
                    </div>
                </div>
                
                <div class="uim-resize-handle"></div>
            `;
            
            document.body.appendChild(panel);
            this.panel = panel;
            
            this.setupDrag();
            this.setupResize();
            this.updateUI();
            this.updatePresetsUI();  // ★ v2.3: プリセットUI初期化
            
            // 起動時にアイコン状態を適用
            if (this.iconsHidden) {
                setTimeout(() => this.hideAllIcons(), 500);
            }
            
            console.log('📋 UI管理パネル v2.3 作成完了');
        }
        
        // ========================================
        // ドラッグ機能
        // ========================================
        
        setupDrag() {
            const header = this.panel.querySelector('.uim-header');
            
            header.addEventListener('mousedown', (e) => {
                if (e.target.tagName === 'BUTTON') return;
                
                this.isDragging = true;
                this.dragOffset = {
                    x: e.clientX - this.panel.offsetLeft,
                    y: e.clientY - this.panel.offsetTop
                };
                
                e.preventDefault();
            });
            
            document.addEventListener('mousemove', (e) => {
                if (!this.isDragging) return;
                
                const newLeft = e.clientX - this.dragOffset.x;
                const newTop = e.clientY - this.dragOffset.y;
                
                const maxLeft = window.innerWidth - this.panel.offsetWidth;
                const maxTop = window.innerHeight - 50;
                
                this.panel.style.left = Math.max(0, Math.min(newLeft, maxLeft)) + 'px';
                this.panel.style.top = Math.max(0, Math.min(newTop, maxTop)) + 'px';
            });
            
            document.addEventListener('mouseup', () => {
                this.isDragging = false;
            });
        }
        
        // ========================================
        // リサイズ機能
        // ========================================
        
        setupResize() {
            const handle = this.panel.querySelector('.uim-resize-handle');
            
            handle.addEventListener('mousedown', (e) => {
                this.isResizing = true;
                this.originalSize = {
                    width: this.panel.offsetWidth,
                    height: this.panel.offsetHeight
                };
                this.originalPos = {
                    x: e.clientX,
                    y: e.clientY
                };
                
                e.preventDefault();
                e.stopPropagation();
            });
            
            document.addEventListener('mousemove', (e) => {
                if (!this.isResizing) return;
                
                const deltaX = e.clientX - this.originalPos.x;
                const deltaY = e.clientY - this.originalPos.y;
                
                const newWidth = Math.max(300, this.originalSize.width + deltaX);
                const newHeight = Math.max(200, this.originalSize.height + deltaY);
                
                this.panel.style.width = newWidth + 'px';
                this.panel.style.height = newHeight + 'px';
            });
            
            document.addEventListener('mouseup', () => {
                this.isResizing = false;
            });
        }
        
        // ========================================
        // UI更新
        // ========================================
        
        refresh() {
            this.detectAllPanels();
            this.updateUI();
        }
        
        updateUI() {
            const listContainer = document.getElementById('uim-panel-list');
            const countSpan = document.getElementById('uim-panel-count');
            const iconToggle = document.getElementById('uim-icon-toggle');
            
            if (!listContainer) return;
            
            // パネルを再検出
            if (this.detectedPanels.length === 0) {
                this.detectAllPanels();
            }
            
            // カウント更新
            if (countSpan) {
                countSpan.textContent = `(${this.detectedPanels.length}個)`;
            }
            
            // アイコントグル状態更新
            if (iconToggle) {
                iconToggle.className = `uim-icon-toggle ${this.iconsHidden ? 'hidden' : ''}`;
                const toggle = iconToggle.querySelector('.uim-toggle');
                if (toggle) {
                    toggle.className = `uim-toggle ${this.iconsHidden ? '' : 'on'}`;
                }
            }
            
            // カテゴリー順にソート
            const categoryOrder = ['main', 'generation', 'camera', 'motion', 'audio', 'effects', 'other', 'control', 'detected'];
            const sortedPanels = [...this.detectedPanels].sort((a, b) => {
                const catA = categoryOrder.indexOf(a.category || 'detected');
                const catB = categoryOrder.indexOf(b.category || 'detected');
                if (catA !== catB) return catA - catB;
                return a.name.localeCompare(b.name);
            });
            
            listContainer.innerHTML = sortedPanels.map(config => {
                const visible = this.getPanelVisible(config.id);
                
                return `
                    <div class="uim-item ${visible ? 'visible' : ''}" data-panel-id="${config.id}">
                        <div class="uim-item-info">
                            <span class="uim-item-name">${visible ? '✅' : '⬜'} ${config.name}</span>
                            ${config.shortcut ? `<span class="uim-item-shortcut">${config.shortcut}</span>` : ''}
                        </div>
                        <div class="uim-toggle ${visible ? 'on' : ''}" 
                             onclick="window.uiManagerPanel.togglePanel('${config.id}')"
                             title="${visible ? '非表示にする' : '表示する'}">
                        </div>
                    </div>
                `;
            }).join('');
        }
    }
    
    // ========================================
    // グローバル登録
    // ========================================
    
    window.UIManagerPanel = UIManagerPanel;
    window.uiManagerPanel = new UIManagerPanel();
    
    console.log('📋 UI管理パネル v2.3 グローバル登録完了 (Shift+Uで開閉)');
    
})();
