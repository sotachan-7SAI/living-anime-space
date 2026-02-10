// ========================================
// KeyboardShortcuts - キーボードショートカット管理
// ========================================
// 
// Shift+M: マルチキャラモード（他のUI非表示）
// 
// ========================================

(function() {
    'use strict';

class KeyboardShortcuts {
    constructor() {
        // マルチキャラモードの状態
        this.isMultiCharMode = false;
        
        // 非表示にするUI要素のセレクタ
        this.hiddenUISelectors = [
            // 左側パネル全体
            '#left-panel',
            
            // 右側パネル全体
            '#right-panel',
            
            // チャットパネル
            '#chat-panel',
            '#ai-chat-panel',                // AIチャットパネル
            '.ai-chat-panel',                // AIチャット（クラス）
            
            // API設定パネル
            '#api-settings-panel',
            
            // モーション関連
            '#motion-float-panel',
            '#hy-motion-panel',
            '#motion-panel',                 // モーションパネル
            '.motion-panel',                 // モーション（クラス）
            '#hy-motion-inline-panel',       // HY-Motionインライン
            
            // 行動制御・タッチパネル
            '#behavior-panel',
            '#touch-panel',
            
            // 音楽関連
            '#music-generator-panel',
            '#local-music-panel',
            
            // AI背景（想像パネルとワイプはマルチキャラモードでも表示）
            '#ai-background-panel',
            // '#imagination-panel',          // マルチキャラモードでも表示するためコメントアウト
            // '#imagination-wipe-container', // マルチキャラモードでも表示するためコメントアウト
            
            // サイズ・モーフ・物理
            '#size-panel',
            '#morph-panel',
            '#body-morph-bone-panel',
            '#physics-panel',
            
            // モーキャプ設定
            '#mocap-settings-panel',
            '#vmc-mocap-panel',
            
            // 環境・背景
            '#env-panel',
            '#env-panel-inner',              // 3D環境UI（内側）
            '.env-panel',                    // 3D環境UI（クラス）
            '#aibg-floating-indicator',      // 背景AI監視インジケータ
            
            // SBV2パネル
            '#sbv2-panel',
            
            // カメラ関連
            '#camera-effects-panel',
            '#ai-cinematographer-panel',
            '#ai-cinematic-presets-panel',
            '#auto-camera-panel',
            '#autocamera-panel',             // autocamera v3.2
            '.autocamera-panel',             // autocamera（クラス）
            
            // サブビュー
            '#subview-container',
            
            // ストーリー監督
            '#story-supervisor-panel',
            '#scenario-selector-panel',
            
            // 字幕設定
            '#subtitle-settings-panel',
            
            // 空間エフェクト
            '#spatial-effects-panel',
            
            // 初期設定
            '#startup-settings-panel',
            
            // 自動配置
            '#auto-placement-panel',
            
            // 自動保存
            '#auto-saver-panel',
            
            // 上部ボタン群
            '.top-buttons',
            '#panel-control-buttons',
            
            // 物理トグル
            '#physics-toggle-container',
            
            // 下部ツールバー
            '.bottom-toolbar',
            
            // 字幕コンテナ
            '#subtitle-container',
            
            // body直下のボタン類
            '#api-settings-toggle',
            '#gemini-mode-toggle',
            '#grok-voice-toggle',
            '#grok-voice-select',
            '#panorama-image-btn',
            '#panorama-video-btn',
            '#character-generator-btn',
            '#character-history-btn',
            '#auto-saver-toggle-btn',
            '#behavior-toggle-btn',
            '#touch-toggle-btn',
            '#music-toggle-btn',
            '#ai-background-toggle-btn',
            '#sbv2-toggle-btn',
            '#story-menu-btn',
            '#startup-settings-toggle-btn',
            '#subtitle-toggle-btn',
            '#subtitle-settings-btn',
            '#grid-toggle-btn',
            '#local-music-toggle-btn',
            
            // クラスがないボタン（テキストで検索）
            'button[id*="openai"]',
            'button[id*="tts"]',
            'button[id*="google"]',
        ];
        
        // マルチキャラ関連のUI（非表示にしない）
        this.multiCharUISelectors = [
            '#multi-character-panel',      // マルチキャラ会話パネル
            '#pipeline-monitor-panel',     // パイプラインモニター
            '#user-participation-container', // ユーザー割り込みUI
            '#ai-director-panel',          // AIカメラディレクター（会話に必要）
            '#imagination-panel',          // 想像パネル（マルチキャラ会話中も表示）
            '#imagination-wipe-container', // 想像ワイプUI（マルチキャラ会話中も表示）
        ];
        
        // 保存された表示状態
        this.savedDisplayStates = new Map();
        
        this.init();
    }
    
    init() {
        // キーボードイベントを登録
        document.addEventListener('keydown', (e) => this.handleKeyDown(e));
        
        // スタイル追加
        this.addStyles();
        
        console.log('⌨️ KeyboardShortcuts 初期化完了');
        console.log('   Shift+M: マルチキャラモード切替');
    }
    
    addStyles() {
        const styleId = 'keyboard-shortcuts-styles';
        if (document.getElementById(styleId)) return;
        
        const style = document.createElement('style');
        style.id = styleId;
        style.textContent = `
            /* マルチキャラモードのインジケータ */
            .multichar-mode-indicator {
                position: fixed;
                top: 10px;
                left: 50%;
                transform: translateX(-50%);
                background: linear-gradient(135deg, rgba(147, 51, 234, 0.9) 0%, rgba(59, 130, 246, 0.9) 100%);
                color: white;
                padding: 8px 20px;
                border-radius: 20px;
                font-size: 12px;
                font-weight: bold;
                z-index: 10000;
                box-shadow: 0 4px 15px rgba(147, 51, 234, 0.4);
                animation: fadeInSlide 0.3s ease-out;
                display: flex;
                align-items: center;
                gap: 8px;
            }
            
            .multichar-mode-indicator .mode-icon {
                font-size: 16px;
            }
            
            .multichar-mode-indicator .mode-hint {
                font-size: 10px;
                opacity: 0.8;
                margin-left: 10px;
            }
            
            @keyframes fadeInSlide {
                from {
                    opacity: 0;
                    transform: translateX(-50%) translateY(-20px);
                }
                to {
                    opacity: 1;
                    transform: translateX(-50%) translateY(0);
                }
            }
            
            /* 非表示要素のトランジション */
            .kb-hidden {
                opacity: 0 !important;
                pointer-events: none !important;
                transform: scale(0.95);
                transition: opacity 0.3s ease, transform 0.3s ease;
                visibility: hidden !important;
            }
            
            /* panel-showクラスがあっても非表示にする */
            .kb-hidden.panel-show {
                opacity: 0 !important;
                visibility: hidden !important;
                pointer-events: none !important;
            }
            
            /* マルチキャラUIを強調 */
            .multichar-mode-active #multi-char-panel,
            .multichar-mode-active .mc-panel {
                box-shadow: 0 0 20px rgba(147, 51, 234, 0.3);
            }
        `;
        document.head.appendChild(style);
    }
    
    handleKeyDown(e) {
        // Shift + M: マルチキャラモード切替
        if (e.shiftKey && e.key === 'M') {
            e.preventDefault();
            this.toggleMultiCharMode();
        }
    }
    
    toggleMultiCharMode() {
        this.isMultiCharMode = !this.isMultiCharMode;
        
        if (this.isMultiCharMode) {
            this.enterMultiCharMode();
        } else {
            this.exitMultiCharMode();
        }
    }
    
    enterMultiCharMode() {
        console.log('');
        console.log('🎭 ========================================');
        console.log('🎭 マルチキャラモード ON');
        console.log('🎭 ========================================');
        
        // 現在の表示状態を保存
        this.savedDisplayStates.clear();
        
        // 非表示にするUI要素を処理
        this.hiddenUISelectors.forEach(selector => {
            const elements = document.querySelectorAll(selector);
            elements.forEach(el => {
                // 現在のdisplayを保存
                this.savedDisplayStates.set(el, {
                    display: el.style.display,
                    visibility: el.style.visibility,
                    opacity: el.style.opacity
                });
                
                // 非表示クラスを追加
                el.classList.add('kb-hidden');
                // 直接スタイルも設定（確実に非表示にする）
                el.style.display = 'none';
            });
        });
        
        // ★ 追加: position:fixedのパネルを全て非表示（マルチキャラ関連以外）
        this.hideAllFloatingPanels();
        
        // bodyにモードクラスを追加
        document.body.classList.add('multichar-mode-active');
        
        // インジケータを表示
        this.showModeIndicator(true);
        
        // IDのないボタンも非表示にする
        this.hideUnnamedButtons();
        
        // パイプラインモニターを確実に表示
        this.ensureMultiCharUIVisible();
    }
    
    exitMultiCharMode() {
        console.log('');
        console.log('🎭 ========================================');
        console.log('🎭 マルチキャラモード OFF');
        console.log('🎭 ========================================');
        
        // ★ フローティングパネルを全て復元
        this.showAllFloatingPanels();
        
        // 非表示にしたUI要素を復元
        this.hiddenUISelectors.forEach(selector => {
            const elements = document.querySelectorAll(selector);
            elements.forEach(el => {
                // 非表示クラスを削除
                el.classList.remove('kb-hidden');
                // 保存した表示状態を復元
                const saved = this.savedDisplayStates.get(el);
                if (saved) {
                    el.style.display = saved.display || '';
                } else {
                    el.style.display = '';
                }
            });
        });
        
        // bodyのモードクラスを削除
        document.body.classList.remove('multichar-mode-active');
        
        // IDのないボタンも復元
        this.showUnnamedButtons();
        
        // インジケータを非表示
        this.showModeIndicator(false);
    }
    
    showModeIndicator(show) {
        const existingIndicator = document.getElementById('multichar-mode-indicator');
        
        if (show) {
            if (existingIndicator) return;
            
            const indicator = document.createElement('div');
            indicator.id = 'multichar-mode-indicator';
            indicator.className = 'multichar-mode-indicator';
            indicator.innerHTML = `
                <span class="mode-icon">🎭</span>
                <span>マルチキャラモード</span>
                <span class="mode-hint">Shift+M で解除</span>
            `;
            document.body.appendChild(indicator);
            
            // 3秒後にフェードアウト
            setTimeout(() => {
                if (indicator.parentNode) {
                    indicator.style.opacity = '0.6';
                }
            }, 3000);
        } else {
            if (existingIndicator) {
                existingIndicator.remove();
            }
        }
    }
    
    ensureMultiCharUIVisible() {
        // マルチキャラ関連のUIが表示されていることを確認
        this.multiCharUISelectors.forEach(selector => {
            const elements = document.querySelectorAll(selector);
            elements.forEach(el => {
                el.classList.remove('kb-hidden');
                // 強制的に表示
                if (el.style.display === 'none') {
                    el.style.display = '';
                }
            });
        });
        
        // パイプラインモニターが閉じていたら開く
        const pipelineMonitor = document.getElementById('pipeline-monitor-panel') || 
                               document.querySelector('.pipeline-monitor');
        if (pipelineMonitor) {
            pipelineMonitor.classList.remove('kb-hidden');
        }
    }
    
    /**
     * IDのないボタンを非表示にする
     */
    hideUnnamedButtons() {
        // body直下のボタンで、特定のテキストを含むものを非表示
        const hideTexts = [
            'OpenAI TTS',
            'Google TTS',
            '高速モード',
            '環境削除',
            'SBV2 TTS',
        ];
        
        const bodyButtons = Array.from(document.body.children).filter(el => el.tagName === 'BUTTON');
        
        bodyButtons.forEach(btn => {
            const text = btn.textContent || '';
            const shouldHide = hideTexts.some(t => text.includes(t));
            
            if (shouldHide) {
                btn.classList.add('kb-hidden');
            }
        });
        
        console.log(`🔒 ボタン非表示: ${bodyButtons.filter(b => b.classList.contains('kb-hidden')).length}個`);
    }
    
    /**
     * IDのないボタンを復元する
     */
    showUnnamedButtons() {
        const bodyButtons = Array.from(document.body.children).filter(el => el.tagName === 'BUTTON');
        
        bodyButtons.forEach(btn => {
            btn.classList.remove('kb-hidden');
            const saved = this.savedDisplayStates.get(btn);
            if (saved) {
                btn.style.display = saved.display || '';
            } else {
                btn.style.display = '';
            }
        });
        
        console.log(`🔓 ボタン復元: ${bodyButtons.length}個`);
    }
    
    /**
     * ★ フローティングパネルを全て非表示（マルチキャラ関連以外）
     */
    hideAllFloatingPanels() {
        // マルチキャラ関連のID（これらは非表示にしない）
        const keepVisibleIds = [
            'multi-character-panel',
            'pipeline-monitor-panel',
            'user-participation-container',
            'ai-director-panel',
            'imagination-panel',
            'imagination-wipe-container',
            'multichar-mode-indicator',
            'recording-indicator'
        ];
        
        // position:fixedの要素を全て取得
        const allElements = document.querySelectorAll('*');
        let hiddenCount = 0;
        
        allElements.forEach(el => {
            const style = window.getComputedStyle(el);
            if (style.position === 'fixed' && style.display !== 'none') {
                // マルチキャラ関連はスキップ
                if (keepVisibleIds.some(id => el.id === id || el.closest(`#${id}`))) {
                    return;
                }
                
                // 元の表示状態を保存
                if (!this.savedDisplayStates.has(el)) {
                    this.savedDisplayStates.set(el, {
                        display: el.style.display,
                        visibility: el.style.visibility,
                        opacity: el.style.opacity
                    });
                }
                
                el.classList.add('kb-hidden');
                el.style.display = 'none';
                hiddenCount++;
            }
        });
        
        console.log(`🔒 フローティングパネル非表示: ${hiddenCount}個`);
    }
    
    /**
     * ★ フローティングパネルを復元
     */
    showAllFloatingPanels() {
        // kb-hiddenクラスがついた全要素を復元
        const hiddenElements = document.querySelectorAll('.kb-hidden');
        let restoredCount = 0;
        
        hiddenElements.forEach(el => {
            el.classList.remove('kb-hidden');
            const saved = this.savedDisplayStates.get(el);
            if (saved) {
                el.style.display = saved.display || '';
            } else {
                el.style.display = '';
            }
            restoredCount++;
        });
        
        console.log(`🔓 フローティングパネル復元: ${restoredCount}個`);
    }
    
    /**
     * 特定のUIを強制的に表示/非表示
     */
    setUIVisibility(selector, visible) {
        const elements = document.querySelectorAll(selector);
        elements.forEach(el => {
            if (visible) {
                el.classList.remove('kb-hidden');
            } else {
                el.classList.add('kb-hidden');
            }
        });
    }
    
    /**
     * 現在のモード状態を取得
     */
    isInMultiCharMode() {
        return this.isMultiCharMode;
    }
}

// グローバルに公開
window.KeyboardShortcuts = KeyboardShortcuts;

// 自動初期化
document.addEventListener('DOMContentLoaded', () => {
    if (!window.keyboardShortcuts) {
        window.keyboardShortcuts = new KeyboardShortcuts();
    }
});

// 即座に初期化（DOMContentLoadedが既に発火している場合用）
if (document.readyState === 'complete' || document.readyState === 'interactive') {
    setTimeout(() => {
        if (!window.keyboardShortcuts) {
            window.keyboardShortcuts = new KeyboardShortcuts();
        }
    }, 100);
}

console.log('⌨️ KeyboardShortcuts モジュール読み込み完了');

})();
