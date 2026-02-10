// ========================================
// vrm-model-ui-toggle.js - VRMモデルUI表示切替
// Shift + V でVRMモデル読み込みUIを表示/非表示
// ========================================

(function() {
    'use strict';
    
    // VRMモデルUI関連のパネルID/クラス
    const VRM_UI_SELECTORS = [
        '#left-panel',                    // 左パネル（モデル選択）
        '#model-upload',                  // モデルアップロードエリア
        '.model-upload',                  // モデルアップロードクラス
        '#model-list-panel',              // モデルリストパネル
        '[id*="vrm-model"]',              // VRMモデル関連ID
        '[id*="model-upload"]',           // モデルアップロード関連
    ];
    
    // UIの表示状態
    let isVRMUIVisible = true;
    let vrmUIElements = [];
    let originalDisplayStyles = new Map();
    
    // 初期化
    function init() {
        // 少し待ってからDOM要素を収集
        setTimeout(() => {
            collectVRMUIElements();
            setupKeyboardShortcut();
            console.log('🎭 VRM Model UI Toggle 初期化完了 (Shift+V で切替)');
        }, 2000);
    }
    
    // VRM UI要素を収集
    function collectVRMUIElements() {
        vrmUIElements = [];
        
        // 左パネル（メインのVRMモデルUI）を優先的に取得
        const leftPanel = document.getElementById('left-panel');
        if (leftPanel) {
            vrmUIElements.push(leftPanel);
            originalDisplayStyles.set(leftPanel, leftPanel.style.display || '');
        }
        
        // その他のセレクターも収集
        VRM_UI_SELECTORS.forEach(selector => {
            try {
                const elements = document.querySelectorAll(selector);
                elements.forEach(el => {
                    if (!vrmUIElements.includes(el)) {
                        vrmUIElements.push(el);
                        originalDisplayStyles.set(el, el.style.display || '');
                    }
                });
            } catch (e) {
                // セレクターエラーは無視
            }
        });
        
        console.log(`🎭 VRM UI要素を ${vrmUIElements.length} 個検出`);
    }
    
    // キーボードショートカット設定
    function setupKeyboardShortcut() {
        document.addEventListener('keydown', (e) => {
            // Shift + V でトグル
            if (e.shiftKey && e.key.toLowerCase() === 'v') {
                e.preventDefault();
                toggleVRMUI();
            }
        });
    }
    
    // VRM UIの表示/非表示をトグル
    function toggleVRMUI() {
        isVRMUIVisible = !isVRMUIVisible;
        
        // 要素が空なら再収集
        if (vrmUIElements.length === 0) {
            collectVRMUIElements();
        }
        
        vrmUIElements.forEach(el => {
            if (isVRMUIVisible) {
                // 表示
                const originalDisplay = originalDisplayStyles.get(el) || '';
                el.style.display = originalDisplay;
            } else {
                // 非表示
                el.style.display = 'none';
            }
        });
        
        // 通知を表示
        showNotification(isVRMUIVisible ? '🎭 VRM Model UI: 表示' : '🎭 VRM Model UI: 非表示');
        
        console.log(`🎭 VRM Model UI: ${isVRMUIVisible ? '表示' : '非表示'}`);
    }
    
    // 通知表示
    function showNotification(message) {
        // 既存の通知を削除
        const existing = document.getElementById('vrm-ui-notification');
        if (existing) existing.remove();
        
        // 通知要素を作成
        const notification = document.createElement('div');
        notification.id = 'vrm-ui-notification';
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: rgba(102, 126, 234, 0.95);
            color: white;
            padding: 15px 30px;
            border-radius: 10px;
            font-size: 16px;
            font-weight: bold;
            z-index: 100000;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
            animation: fadeInOut 1.5s ease-in-out;
            pointer-events: none;
        `;
        
        // アニメーション用CSS
        if (!document.getElementById('vrm-ui-notification-style')) {
            const style = document.createElement('style');
            style.id = 'vrm-ui-notification-style';
            style.textContent = `
                @keyframes fadeInOut {
                    0% { opacity: 0; transform: translate(-50%, -50%) scale(0.8); }
                    20% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
                    80% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
                    100% { opacity: 0; transform: translate(-50%, -50%) scale(0.8); }
                }
            `;
            document.head.appendChild(style);
        }
        
        document.body.appendChild(notification);
        
        // 1.5秒後に削除
        setTimeout(() => {
            notification.remove();
        }, 1500);
    }
    
    // グローバルAPI
    window.vrmModelUIToggle = {
        toggle: toggleVRMUI,
        show: () => {
            isVRMUIVisible = false;
            toggleVRMUI();
        },
        hide: () => {
            isVRMUIVisible = true;
            toggleVRMUI();
        },
        isVisible: () => isVRMUIVisible
    };
    
    // 自動初期化
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
    
    console.log('📦 vrm-model-ui-toggle.js ロード完了');
})();
