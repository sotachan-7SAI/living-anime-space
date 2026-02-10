/**
 * EmotionMemory UI v1.0
 * 
 * 感情・記憶管理システムのUI統合
 * - 左サイドバーにボタン追加
 * - Shift+E でパネル表示切替
 */

(function() {
    'use strict';
    
    console.log('🧠 EmotionMemory UI v1.0 読み込み開始');
    
    // まずコアファイルを読み込み
    function loadScript(src) {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = src;
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }
    
    async function init() {
        try {
            // コアマネージャー読み込み
            await loadScript('emotion-memory/emotion-memory-manager.js?v=1.0');
            console.log('🧠 emotion-memory-manager.js 読み込み完了');
            
            // パネルUI読み込み
            await loadScript('emotion-memory/emotion-memory-panel.js?v=1.0');
            console.log('🧠 emotion-memory-panel.js 読み込み完了');
            
            // ボタン追加
            addSidebarButton();
            
            // キーボードショートカット
            setupKeyboardShortcut();
            
            console.log('🧠 EmotionMemory UI 初期化完了');
            
        } catch (error) {
            console.error('🧠 EmotionMemory UI 読み込みエラー:', error);
        }
    }
    
    /**
     * 左サイドバーにボタンを追加
     */
    function addSidebarButton() {
        // 左サイドバーを探す
        const leftSidebar = document.querySelector('#left-sidebar') || 
                           document.querySelector('.left-sidebar') ||
                           document.querySelector('#left-panel');
        
        if (!leftSidebar) {
            console.log('🧠 左サイドバーが見つからないため、フローティングボタンを作成');
            createFloatingButton();
            return;
        }
        
        // ボタン追加
        const button = document.createElement('button');
        button.id = 'emotion-memory-btn';
        button.className = 'sidebar-btn';
        button.innerHTML = '🧠';
        button.title = '感情・記憶マネージャー (Shift+E)';
        button.style.cssText = `
            width: 48px;
            height: 48px;
            border: none;
            border-radius: 12px;
            background: linear-gradient(135deg, #7c3aed 0%, #a855f7 100%);
            color: white;
            font-size: 24px;
            cursor: pointer;
            margin: 4px;
            transition: all 0.2s;
        `;
        
        button.addEventListener('click', () => {
            togglePanel();
        });
        
        button.addEventListener('mouseenter', () => {
            button.style.transform = 'scale(1.1)';
        });
        
        button.addEventListener('mouseleave', () => {
            button.style.transform = 'scale(1)';
        });
        
        leftSidebar.appendChild(button);
        console.log('🧠 サイドバーボタン追加完了');
    }
    
    /**
     * フローティングボタンを作成（サイドバーがない場合）
     */
    function createFloatingButton() {
        const button = document.createElement('button');
        button.id = 'emotion-memory-floating-btn';
        button.innerHTML = '🧠';
        button.title = '感情・記憶マネージャー (Shift+E)';
        button.style.cssText = `
            position: fixed;
            bottom: 100px;
            left: 20px;
            width: 56px;
            height: 56px;
            border: none;
            border-radius: 50%;
            background: linear-gradient(135deg, #7c3aed 0%, #a855f7 100%);
            color: white;
            font-size: 28px;
            cursor: pointer;
            z-index: 9999;
            box-shadow: 0 4px 20px rgba(124, 58, 237, 0.4);
            transition: all 0.2s;
        `;
        
        button.addEventListener('click', () => {
            togglePanel();
        });
        
        button.addEventListener('mouseenter', () => {
            button.style.transform = 'scale(1.1)';
            button.style.boxShadow = '0 6px 30px rgba(124, 58, 237, 0.6)';
        });
        
        button.addEventListener('mouseleave', () => {
            button.style.transform = 'scale(1)';
            button.style.boxShadow = '0 4px 20px rgba(124, 58, 237, 0.4)';
        });
        
        document.body.appendChild(button);
        console.log('🧠 フローティングボタン作成完了');
    }
    
    /**
     * キーボードショートカット設定
     */
    function setupKeyboardShortcut() {
        document.addEventListener('keydown', (e) => {
            // Shift+E で表示切替
            if (e.shiftKey && e.key === 'E') {
                e.preventDefault();
                togglePanel();
            }
        });
        
        console.log('🧠 キーボードショートカット (Shift+E) 設定完了');
    }
    
    /**
     * パネル表示切替
     */
    function togglePanel() {
        if (window.emotionMemoryPanel) {
            window.emotionMemoryPanel.toggle();
        } else {
            console.warn('🧠 emotionMemoryPanel が見つかりません');
        }
    }
    
    // DOM読み込み後に初期化
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
    
    // グローバル関数
    window.toggleEmotionMemoryPanel = togglePanel;
    
})();
