/**
 * 物理演算UIトグルボタン
 * Shift+Bと同じ機能を画面下部のボタンで提供
 */

(function() {
    'use strict';
    
    // DOMが準備できたら実行
    function init() {
        console.log('🎮 物理演算UIトグルボタン初期化開始');
        
        // コンテナを作成
        const container = document.createElement('div');
        container.id = 'physics-toggle-container';
        container.style.cssText = `
            position: fixed;
            bottom: 10px;
            left: 50%;
            transform: translateX(-50%);
            z-index: 9999;
            display: flex;
            gap: 8px;
            background: rgba(0,0,0,0.6);
            padding: 6px 12px;
            border-radius: 20px;
            backdrop-filter: blur(10px);
        `;
        
        // UIトグルボタン
        const toggleBtn = document.createElement('button');
        toggleBtn.id = 'physics-ui-toggle-btn';
        toggleBtn.innerHTML = '🎮 UI表示';
        toggleBtn.title = '物理演算UI以外を消す/復元 (Shift+B)';
        toggleBtn.style.cssText = `
            padding: 8px 16px;
            background: linear-gradient(135deg, #667eea, #764ba2);
            color: white;
            border: none;
            border-radius: 15px;
            font-size: 12px;
            font-weight: bold;
            cursor: pointer;
            transition: all 0.3s;
            box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        `;
        
        toggleBtn.addEventListener('mouseenter', () => {
            toggleBtn.style.transform = 'scale(1.05)';
            toggleBtn.style.boxShadow = '0 4px 12px rgba(0,0,0,0.4)';
        });
        toggleBtn.addEventListener('mouseleave', () => {
            toggleBtn.style.transform = 'scale(1)';
            toggleBtn.style.boxShadow = '0 2px 8px rgba(0,0,0,0.3)';
        });
        
        // クリックイベント
        toggleBtn.addEventListener('click', () => {
            toggleUIMode();
        });
        
        container.appendChild(toggleBtn);
        document.body.appendChild(container);
        
        console.log('✅ 物理演算UIトグルボタン追加完了');
    }
    
    // UI表示/非表示を切り替え
    window.physicsUIToggleState = {
        active: false,
        hiddenElements: []
    };
    
    function toggleUIMode() {
        const state = window.physicsUIToggleState;
        const btn = document.getElementById('physics-ui-toggle-btn');
        
        if (!state.active) {
            // === UIを非表示 ===
            state.hiddenElements = [];
            
            const allElements = document.body.querySelectorAll('*');
            
            allElements.forEach(el => {
                // 残すべき要素を判定
                if (el.tagName === 'CANVAS') return;
                if (el.tagName === 'SCRIPT' || el.tagName === 'STYLE' || el.tagName === 'LINK') return;
                
                const id = (el.id || '').toLowerCase();
                
                // トグルボタン自体は残す
                if (id === 'physics-toggle-container') return;
                if (el.closest('#physics-toggle-container')) return;
                
                // 字幕は残す
                if (id.includes('subtitle')) return;
                
                // 物理演算パネル（もしあれば）は残す
                if (id === 'physics-panel') return;
                if (el.closest('#physics-panel')) return;
                
                const style = window.getComputedStyle(el);
                if (style.position === 'fixed' || style.position === 'absolute') {
                    if (style.display !== 'none') {
                        // 元のスタイルを保存
                        el.dataset.uiToggleWasDisplay = el.style.display || '';
                        el.style.setProperty('display', 'none', 'important');
                        state.hiddenElements.push(el);
                    }
                }
            });
            
            state.active = true;
            if (btn) {
                btn.innerHTML = '🎮 UI復元';
                btn.style.background = 'linear-gradient(135deg, #00c853, #00e676)';
            }
            console.log(`🛠️ UIトグル: ${state.hiddenElements.length}個のUIを非表示`);
            
        } else {
            // === UIを復元 ===
            state.hiddenElements.forEach(el => {
                const wasDisplay = el.dataset.uiToggleWasDisplay;
                if (wasDisplay !== undefined) {
                    el.style.display = wasDisplay || '';
                    delete el.dataset.uiToggleWasDisplay;
                }
            });
            
            state.hiddenElements = [];
            state.active = false;
            if (btn) {
                btn.innerHTML = '🎮 UI表示';
                btn.style.background = 'linear-gradient(135deg, #667eea, #764ba2)';
            }
            console.log('🛠️ UIトグル: UI復元完了');
        }
    }
    
    // グローバルに公開
    window.togglePhysicsUIMode = toggleUIMode;
    
    // Shift+Bでも動作
    document.addEventListener('keydown', (e) => {
        if (e.shiftKey && e.code === 'KeyB') {
            e.preventDefault();
            e.stopPropagation();
            toggleUIMode();
        }
    });
    
    // 初期化
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => setTimeout(init, 1000));
    } else {
        setTimeout(init, 1000);
    }
})();

console.log('✅ physics-ui-toggle.js 読み込み完了');
