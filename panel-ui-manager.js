// ========================================
// パネルUI管理システム v2.2
// ドラッグ移動、折りたたみ、VRM削除機能
// v2.0: 右クリック+左クリック同時押しで画面中央移動
// v2.1: Shift+Qで録画モード（UI非表示、姄想ワイプのみ残す）
// v2.2: 画面外防止機能 - 保存位置が画面外なら自動修正
// ========================================

console.log('📋 パネルUI管理システム v2.2 を読み込み中...');

// パネル設定（標準パネルと動的パネル両方）
const standardPanelConfigs = [
    { id: 'left-panel', title: '🎭 VRMモデル' },
    { id: 'right-panel', title: '💃 モーション' },
    { id: 'chat-panel', title: '💬 AI チャット' },
];

// 動的に生成されるパネル（構造が異なる）
const dynamicPanelConfigs = [
    { id: 'physics-panel', title: '🎮 物理演算システム', isWrapper: true },
    { id: 'env-panel', title: '🏠 3D環境', isWrapper: true },
    { id: 'hy-motion-panel', title: '🎬 HY-Motion', isWrapper: false },
];

// 初期化を待つ
function initPanelUI() {
    const checkReady = setInterval(() => {
        const leftPanel = document.getElementById('left-panel');
        if (leftPanel) {
            clearInterval(checkReady);
            setupStandardPanels();
            // VRM削除ボタンを追加
            addVRMDeleteButton();
        }
    }, 100);
    
    setTimeout(() => clearInterval(checkReady), 10000);
}

// 標準パネルのセットアップ
function setupStandardPanels() {
    standardPanelConfigs.forEach(config => {
        const panel = document.getElementById(config.id);
        if (panel) {
            setupStandardPanel(panel, config);
        }
    });
    
    console.log('✅ 標準パネル初期化完了');
}

// 動的パネルのセットアップ（遅延実行）
function setupDynamicPanels() {
    dynamicPanelConfigs.forEach(config => {
        const panel = document.getElementById(config.id);
        if (panel && panel.dataset.panelSetup !== 'true') {
            if (config.isWrapper) {
                setupWrapperPanel(panel, config);
            } else {
                setupDirectPanel(panel, config);
            }
        }
    });
}

// 標準パネル（index.htmlで定義されているもの）のセットアップ
function setupStandardPanel(panel, config) {
    if (panel.dataset.panelSetup === 'true') return;
    panel.dataset.panelSetup = 'true';
    
    panel.style.position = 'fixed';
    panel.style.zIndex = '1000';
    
    let titleBar = panel.querySelector('.panel-title');
    if (titleBar) {
        enhanceTitleBar(titleBar, panel, config);
    }
    
    restorePanelPosition(panel, config);
}

// ラッパー型パネル（内部にfixedなdivがあるもの）のセットアップ
function setupWrapperPanel(wrapperPanel, config) {
    if (wrapperPanel.dataset.panelSetup === 'true') return;
    wrapperPanel.dataset.panelSetup = 'true';
    
    // 内部のfixedなdivを見つける
    const innerPanel = wrapperPanel.querySelector('div[style*="position: fixed"], div[style*="position:fixed"]');
    if (!innerPanel) {
        console.log(`⚠️ ${config.id}: 内部パネルが見つかりません`);
        return;
    }
    
    // ラッパーを透明にして内部パネルを操作対象にする
    wrapperPanel.style.position = 'static';
    wrapperPanel.style.display = 'contents';
    
    // 内部パネルのスタイルを調整
    innerPanel.style.zIndex = '1000';
    innerPanel.id = config.id + '-inner';
    
    // タイトルバーを探すか作成
    let titleBar = innerPanel.querySelector('[style*="border-bottom"]');
    if (!titleBar) {
        // 最初の子要素をタイトルバーとして使う
        titleBar = innerPanel.firstElementChild;
    }
    
    if (titleBar) {
        // 新しいタイトルバーを挿入
        const newTitleBar = createTitleBar(config.title, innerPanel, config);
        innerPanel.insertBefore(newTitleBar, innerPanel.firstChild);
    }
    
    restorePanelPosition(innerPanel, config);
    console.log(`✅ ${config.id}: ラッパーパネル初期化完了`);
}

// 直接fixed型パネル（HY-Motionなど）のセットアップ
function setupDirectPanel(panel, config) {
    if (panel.dataset.panelSetup === 'true') return;
    panel.dataset.panelSetup = 'true';
    
    panel.style.zIndex = '1000';
    
    // 既存のトグルボタンを隠す（代わりに新しいタイトルバーを使う）
    const existingToggle = panel.querySelector('.toggle-btn');
    if (existingToggle) {
        existingToggle.style.display = 'none';
    }
    
    // 新しいタイトルバーを作成
    const newTitleBar = createTitleBar(config.title, panel, config);
    panel.insertBefore(newTitleBar, panel.firstChild);
    
    restorePanelPosition(panel, config);
    console.log(`✅ ${config.id}: 直接パネル初期化完了`);
}

// タイトルバーを作成
function createTitleBar(title, panel, config) {
    const titleBar = document.createElement('div');
    titleBar.className = 'panel-title-custom';
    titleBar.style.cssText = `
        font-size: 12px;
        font-weight: bold;
        color: #333;
        margin-bottom: 8px;
        display: flex;
        align-items: center;
        gap: 4px;
        border-bottom: 2px solid #667eea;
        padding-bottom: 4px;
        cursor: move;
        user-select: none;
        position: relative;
        background: rgba(255,255,255,0.9);
        margin: -15px -15px 10px -15px;
        padding: 8px 15px;
        border-radius: 10px 10px 0 0;
    `;
    
    // タイトルテキスト
    const titleText = document.createElement('span');
    titleText.textContent = title;
    titleBar.appendChild(titleText);
    
    // 折りたたみボタン
    const toggleBtn = document.createElement('span');
    toggleBtn.className = 'panel-toggle-btn';
    toggleBtn.innerHTML = '－';
    toggleBtn.title = '折りたたむ';
    toggleBtn.style.cssText = `
        position: absolute;
        right: 8px;
        top: 50%;
        transform: translateY(-50%);
        width: 18px;
        height: 18px;
        background: #667eea;
        color: white;
        border-radius: 4px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 14px;
        font-weight: bold;
        cursor: pointer;
        transition: all 0.2s;
    `;
    
    toggleBtn.addEventListener('mouseenter', () => toggleBtn.style.background = '#764ba2');
    toggleBtn.addEventListener('mouseleave', () => toggleBtn.style.background = '#667eea');
    
    titleBar.appendChild(toggleBtn);
    
    // コンテンツ要素を取得
    const getContentElements = () => {
        const content = [];
        for (const child of panel.children) {
            if (child !== titleBar && !child.classList.contains('panel-title-custom')) {
                content.push(child);
            }
        }
        return content;
    };
    
    let isCollapsed = false;
    
    const toggleCollapse = () => {
        isCollapsed = !isCollapsed;
        const content = getContentElements();
        
        content.forEach(el => {
            el.style.display = isCollapsed ? 'none' : '';
        });
        
        toggleBtn.innerHTML = isCollapsed ? '＋' : '－';
        toggleBtn.title = isCollapsed ? '展開する' : '折りたたむ';
        
        savePanelState(config.id, isCollapsed);
    };
    
    toggleBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleCollapse();
    });
    
    titleBar.addEventListener('dblclick', (e) => {
        if (e.target !== toggleBtn) {
            toggleCollapse();
        }
    });
    
    // ドラッグ機能
    setupDragging(titleBar, panel, config, toggleBtn);
    
    // 保存された折りたたみ状態を復元
    setTimeout(() => {
        const savedState = localStorage.getItem(`panel-collapsed-${config.id}`);
        if (savedState === 'true' && !isCollapsed) {
            toggleCollapse();
        }
    }, 100);
    
    return titleBar;
}

// タイトルバーを強化（標準パネル用）
function enhanceTitleBar(titleBar, panel, config) {
    titleBar.style.cssText = `
        font-size: 12px;
        font-weight: bold;
        color: #333;
        margin-bottom: 8px;
        display: flex;
        align-items: center;
        gap: 4px;
        border-bottom: 2px solid #667eea;
        padding-bottom: 4px;
        cursor: move;
        user-select: none;
        position: relative;
    `;
    
    // 折りたたみボタンを追加
    const toggleBtn = document.createElement('span');
    toggleBtn.className = 'panel-toggle-btn';
    toggleBtn.innerHTML = '－';
    toggleBtn.title = '折りたたむ';
    toggleBtn.style.cssText = `
        position: absolute;
        right: 0;
        top: 50%;
        transform: translateY(-50%);
        width: 18px;
        height: 18px;
        background: #667eea;
        color: white;
        border-radius: 4px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 14px;
        font-weight: bold;
        cursor: pointer;
        transition: all 0.2s;
    `;
    
    toggleBtn.addEventListener('mouseenter', () => toggleBtn.style.background = '#764ba2');
    toggleBtn.addEventListener('mouseleave', () => toggleBtn.style.background = '#667eea');
    
    titleBar.appendChild(toggleBtn);
    
    // コンテンツ要素を取得
    const getContentElements = () => {
        const content = [];
        for (const child of panel.children) {
            if (child !== titleBar && !child.classList.contains('panel-title')) {
                content.push(child);
            }
        }
        return content;
    };
    
    let isCollapsed = false;
    
    const toggleCollapse = () => {
        isCollapsed = !isCollapsed;
        const content = getContentElements();
        
        content.forEach(el => {
            el.style.display = isCollapsed ? 'none' : '';
        });
        
        toggleBtn.innerHTML = isCollapsed ? '＋' : '－';
        toggleBtn.title = isCollapsed ? '展開する' : '折りたたむ';
        
        if (isCollapsed) {
            panel.style.paddingBottom = '4px';
            titleBar.style.marginBottom = '0';
            titleBar.style.borderBottom = 'none';
        } else {
            panel.style.paddingBottom = '';
            titleBar.style.marginBottom = '8px';
            titleBar.style.borderBottom = '2px solid #667eea';
        }
        
        savePanelState(config.id, isCollapsed);
    };
    
    toggleBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleCollapse();
    });
    
    titleBar.addEventListener('dblclick', (e) => {
        if (e.target !== toggleBtn) {
            toggleCollapse();
        }
    });
    
    // ドラッグ機能
    setupDragging(titleBar, panel, config, toggleBtn);
    
    // 保存された折りたたみ状態を復元
    const savedState = localStorage.getItem(`panel-collapsed-${config.id}`);
    if (savedState === 'true') {
        toggleCollapse();
    }
}

// ドラッグ機能のセットアップ
function setupDragging(titleBar, panel, config, toggleBtn) {
    let isDragging = false;
    let startX, startY, startLeft, startTop;
    
    titleBar.addEventListener('mousedown', (e) => {
        if (e.target === toggleBtn || e.target.classList.contains('panel-toggle-btn')) return;
        
        isDragging = true;
        startX = e.clientX;
        startY = e.clientY;
        
        const rect = panel.getBoundingClientRect();
        startLeft = rect.left;
        startTop = rect.top;
        
        bringToFront(panel);
        panel.style.transition = 'none';
        document.body.style.cursor = 'move';
    });
    
    const onMouseMove = (e) => {
        if (!isDragging) return;
        
        const dx = e.clientX - startX;
        const dy = e.clientY - startY;
        
        let newLeft = startLeft + dx;
        let newTop = startTop + dy;
        
        const rect = panel.getBoundingClientRect();
        newLeft = Math.max(0, Math.min(window.innerWidth - rect.width, newLeft));
        newTop = Math.max(0, Math.min(window.innerHeight - 50, newTop));
        
        panel.style.right = 'auto';
        panel.style.bottom = 'auto';
        panel.style.left = newLeft + 'px';
        panel.style.top = newTop + 'px';
        panel.style.transform = 'none';
    };
    
    const onMouseUp = () => {
        if (isDragging) {
            isDragging = false;
            document.body.style.cursor = '';
            panel.style.transition = '';
            savePanelPosition(config.id, panel);
        }
    };
    
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
}

// パネルを最前面に
let maxZIndex = 1000;
function bringToFront(panel) {
    maxZIndex++;
    panel.style.zIndex = maxZIndex;
}

// 位置を保存
function savePanelPosition(panelId, panel) {
    const rect = panel.getBoundingClientRect();
    const pos = { left: rect.left, top: rect.top };
    localStorage.setItem(`panel-pos-${panelId}`, JSON.stringify(pos));
}

// 位置を復元（v2.2: 画面外防止機能追加）
function restorePanelPosition(panel, config) {
    const savedPos = localStorage.getItem(`panel-pos-${config.id}`);
    if (savedPos) {
        try {
            const pos = JSON.parse(savedPos);
            
            // ★ v2.2: 画面内に収まるように調整
            const rect = panel.getBoundingClientRect();
            const panelWidth = rect.width || 300;
            const panelHeight = rect.height || 200;
            
            let newLeft = pos.left;
            let newTop = pos.top;
            
            // 画面右端チェック - パネルが完全に画面外なら画面内に戻す
            if (newLeft > window.innerWidth - 50) {
                newLeft = window.innerWidth - panelWidth - 20;
                console.log(`📋 ${config.id}: 画面右端を超えていたため位置修正`);
            }
            // 画面左端チェック
            if (newLeft < -panelWidth + 50) {
                newLeft = 20;
                console.log(`📋 ${config.id}: 画面左端を超えていたため位置修正`);
            }
            // 画面下端チェック
            if (newTop > window.innerHeight - 50) {
                newTop = window.innerHeight - panelHeight - 20;
                console.log(`📋 ${config.id}: 画面下端を超えていたため位置修正`);
            }
            // 画面上端チェック
            if (newTop < -panelHeight + 50) {
                newTop = 20;
                console.log(`📋 ${config.id}: 画面上端を超えていたため位置修正`);
            }
            
            // 最終的な位置を適用
            panel.style.right = 'auto';
            panel.style.bottom = 'auto';
            panel.style.left = newLeft + 'px';
            panel.style.top = newTop + 'px';
            panel.style.transform = 'none';
            
            // 位置が修正された場合は保存し直す
            if (newLeft !== pos.left || newTop !== pos.top) {
                savePanelPosition(config.id, panel);
            }
        } catch (e) {
            console.warn(`📋 ${config.id}: 位置復元エラー`, e);
        }
    }
}

// 折りたたみ状態を保存
function savePanelState(panelId, isCollapsed) {
    localStorage.setItem(`panel-collapsed-${panelId}`, isCollapsed);
}

// VRM削除ボタンを追加
function addVRMDeleteButton() {
    const leftPanel = document.getElementById('left-panel');
    if (!leftPanel) return;
    if (document.getElementById('vrm-delete-btn')) return;
    
    const modelUpload = document.getElementById('model-upload');
    if (!modelUpload) return;
    
    const deleteBtn = document.createElement('button');
    deleteBtn.id = 'vrm-delete-btn';
    deleteBtn.className = 'btn-danger';
    deleteBtn.innerHTML = '🗑️ VRMモデルを削除';
    deleteBtn.style.cssText = `
        width: 100%;
        padding: 8px;
        background: linear-gradient(135deg, #ff6b6b 0%, #ee5a6f 100%);
        color: white;
        border: none;
        border-radius: 6px;
        font-weight: bold;
        cursor: pointer;
        margin-top: 8px;
        font-size: 11px;
        transition: all 0.3s;
    `;
    deleteBtn.addEventListener('mouseenter', () => {
        deleteBtn.style.transform = 'translateY(-1px)';
        deleteBtn.style.boxShadow = '0 2px 8px rgba(255, 107, 107, 0.5)';
    });
    deleteBtn.addEventListener('mouseleave', () => {
        deleteBtn.style.transform = '';
        deleteBtn.style.boxShadow = '';
    });
    deleteBtn.addEventListener('click', deleteCurrentVRM);
    
    modelUpload.parentNode.insertBefore(deleteBtn, modelUpload.nextSibling);
}

// VRMモデルを削除
function deleteCurrentVRM() {
    if (!window.app || !window.app.vrm) {
        alert('削除するVRMモデルがありません');
        return;
    }
    
    if (!confirm('現在のVRMモデルを削除しますか？')) {
        return;
    }
    
    try {
        const vrm = window.app.vrm;
        
        if (vrm.scene && window.app.scene) {
            window.app.scene.remove(vrm.scene);
        }
        
        if (vrm.scene) {
            vrm.scene.traverse(child => {
                if (child.geometry) child.geometry.dispose();
                if (child.material) {
                    if (Array.isArray(child.material)) {
                        child.material.forEach(m => {
                            if (m.map) m.map.dispose();
                            m.dispose();
                        });
                    } else {
                        if (child.material.map) child.material.map.dispose();
                        child.material.dispose();
                    }
                }
            });
        }
        
        window.app.vrm = null;
        window.currentVrm = null;
        window.selectedVRM = null;
        window.vrmBaseScale = null;
        
        if (window.vrmCollider) {
            if (window.vrmCollider.body && window.physicsWorld) {
                window.physicsWorld.removeBody(window.vrmCollider.body);
            }
            window.vrmCollider = null;
        }
        
        if (window.vrmDebugMesh && window.app.scene) {
            window.app.scene.remove(window.vrmDebugMesh);
            if (window.vrmDebugMesh.geometry) window.vrmDebugMesh.geometry.dispose();
            if (window.vrmDebugMesh.material) window.vrmDebugMesh.material.dispose();
            window.vrmDebugMesh = null;
        }
        
        console.log('🗑️ VRMモデルを削除しました');
        
        document.querySelectorAll('.model-item').forEach(item => {
            item.classList.remove('active');
        });
        
    } catch (error) {
        console.error('VRM削除エラー:', error);
        alert('VRMモデルの削除中にエラーが発生しました');
    }
}

// パネル位置リセット機能
window.resetAllPanelPositions = function() {
    const allConfigs = [...standardPanelConfigs, ...dynamicPanelConfigs];
    allConfigs.forEach(config => {
        localStorage.removeItem(`panel-pos-${config.id}`);
        localStorage.removeItem(`panel-collapsed-${config.id}`);
    });
    location.reload();
};

// すべてのパネルを折りたたむ
window.collapseAllPanels = function() {
    document.querySelectorAll('.panel-toggle-btn').forEach(btn => {
        if (btn.innerHTML === '－') {
            btn.click();
        }
    });
};

// すべてのパネルを展開
window.expandAllPanels = function() {
    document.querySelectorAll('.panel-toggle-btn').forEach(btn => {
        if (btn.innerHTML === '＋') {
            btn.click();
        }
    });
};

// パネル管理ボタンを作成
function createPanelControlButtons() {
    if (document.getElementById('panel-control-buttons')) return;
    
    const container = document.createElement('div');
    container.id = 'panel-control-buttons';
    container.style.cssText = `
        position: fixed;
        top: 10px;
        right: 10px;
        z-index: 99999;
        display: flex;
        gap: 5px;
        background: rgba(255,255,255,0.95);
        padding: 8px;
        border-radius: 8px;
        box-shadow: 0 2px 10px rgba(0,0,0,0.2);
    `;
    
    // 全展開ボタン
    const expandBtn = document.createElement('button');
    expandBtn.innerHTML = '📂';
    expandBtn.title = 'すべて展開';
    expandBtn.style.cssText = `
        width: 32px;
        height: 32px;
        border: none;
        border-radius: 6px;
        background: #4CAF50;
        color: white;
        font-size: 16px;
        cursor: pointer;
        transition: all 0.2s;
    `;
    expandBtn.onclick = () => window.expandAllPanels();
    container.appendChild(expandBtn);
    
    // 全閉じボタン
    const collapseBtn = document.createElement('button');
    collapseBtn.innerHTML = '📁';
    collapseBtn.title = 'すべて閉じる';
    collapseBtn.style.cssText = `
        width: 32px;
        height: 32px;
        border: none;
        border-radius: 6px;
        background: #FF9800;
        color: white;
        font-size: 16px;
        cursor: pointer;
        transition: all 0.2s;
    `;
    collapseBtn.onclick = () => window.collapseAllPanels();
    container.appendChild(collapseBtn);
    
    // リセットボタン
    const resetBtn = document.createElement('button');
    resetBtn.innerHTML = '🔄';
    resetBtn.title = 'パネル位置リセット（左端に整列）';
    resetBtn.style.cssText = `
        width: 32px;
        height: 32px;
        border: none;
        border-radius: 6px;
        background: #2196F3;
        color: white;
        font-size: 16px;
        cursor: pointer;
        transition: all 0.2s;
    `;
    resetBtn.onclick = () => {
        if (confirm('すべてのパネルを初期位置にリセットしますか？\n（ページがリロードされます）')) {
            window.resetAllPanelPositions();
        }
    };
    container.appendChild(resetBtn);
    
    document.body.appendChild(container);
    console.log('✅ パネル管理ボタン追加完了');
}

// 初期化開始
initPanelUI();

// パネル管理ボタンを追加
setTimeout(createPanelControlButtons, 500);

// 遅延初期化（動的パネル用）
setTimeout(setupDynamicPanels, 1500);
setTimeout(setupDynamicPanels, 3000);
setTimeout(setupDynamicPanels, 5000);

// ========================================
// v2.0: 右クリック+左クリック同時押しで画面中央移動
// 全パネルに対応
// ========================================

function setupPanelCenterMove() {
    // マウスボタンの状態を追跡
    let leftPressed = false;
    let rightPressed = false;
    let lastTarget = null;
    
    // パネルを画面中央に移動する関数
    function centerPanel(panel) {
        if (!panel) return;
        
        const rect = panel.getBoundingClientRect();
        const centerX = (window.innerWidth - rect.width) / 2;
        const centerY = (window.innerHeight - rect.height) / 2;
        
        // 画面内に収まるように調整
        const newLeft = Math.max(10, Math.min(centerX, window.innerWidth - rect.width - 10));
        const newTop = Math.max(10, Math.min(centerY, window.innerHeight - rect.height - 10));
        
        // アニメーション付きで移動
        panel.style.transition = 'all 0.3s ease-out';
        panel.style.left = newLeft + 'px';
        panel.style.top = newTop + 'px';
        panel.style.right = 'auto';
        panel.style.bottom = 'auto';
        panel.style.transform = 'none';
        
        // 最前面に持ってくる
        bringToFront(panel);
        
        // 位置を保存
        setTimeout(() => {
            panel.style.transition = '';
            // パネルIDを取得して保存
            const panelId = panel.id || panel.dataset.panelId;
            if (panelId) {
                savePanelPosition(panelId, panel);
            }
        }, 300);
        
        // フィードバック表示
        showCenterFeedback(panel);
        
        console.log(`🎯 パネルを画面中央に移動: ${panelId || '不明'}`);
    }
    
    // フィードバック表示
    function showCenterFeedback(panel) {
        const feedback = document.createElement('div');
        feedback.style.cssText = `
            position: fixed;
            left: 50%;
            top: 50%;
            transform: translate(-50%, -50%);
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 12px 24px;
            border-radius: 30px;
            font-size: 14px;
            font-weight: bold;
            z-index: 999999;
            pointer-events: none;
            animation: centerFeedbackPop 0.6s ease-out forwards;
            box-shadow: 0 4px 20px rgba(102, 126, 234, 0.5);
        `;
        feedback.textContent = '🎯 中央に移動！';
        document.body.appendChild(feedback);
        
        setTimeout(() => feedback.remove(), 600);
    }
    
    // アニメーションCSSを追加
    if (!document.getElementById('panel-center-move-style')) {
        const style = document.createElement('style');
        style.id = 'panel-center-move-style';
        style.textContent = `
            @keyframes centerFeedbackPop {
                0% { opacity: 0; transform: translate(-50%, -50%) scale(0.5); }
                30% { opacity: 1; transform: translate(-50%, -50%) scale(1.1); }
                50% { transform: translate(-50%, -50%) scale(1); }
                100% { opacity: 0; transform: translate(-50%, -50%) scale(0.8); }
            }
        `;
        document.head.appendChild(style);
    }
    
    // クリックされた要素からパネルを見つける
    function findPanel(element) {
        if (!element) return null;
        
        // パネルとして認識する条件
        const panelSelectors = [
            // IDが panel を含む
            '[id*="panel"]',
            // クラスが panel を含む
            '[class*="panel"]',
            // position: fixed でパネル風なスタイル
            'div[style*="position: fixed"]',
            'div[style*="position:fixed"]',
            // 特定のパネル名
            '#local-music-panel',
            '#music-generator-panel',
            '#sbv2-panel',
            '#style-bert-vits2-panel',
            '#touch-panel',
            '#behavior-panel',
            '#camera-effects-panel',
            '#imagination-wipe-panel',
            '#ai-director-panel',
            '#ai-image-generator-panel',
            '#multichar-panel',
            '#vmc-panel'
        ];
        
        let current = element;
        while (current && current !== document.body) {
            // パネル条件をチェック
            for (const selector of panelSelectors) {
                try {
                    if (current.matches && current.matches(selector)) {
                        // position: fixed か確認
                        const style = window.getComputedStyle(current);
                        if (style.position === 'fixed' || style.position === 'absolute') {
                            return current;
                        }
                    }
                } catch (e) {}
            }
            current = current.parentElement;
        }
        
        return null;
    }
    
    // マウスダウンイベント
    document.addEventListener('mousedown', (e) => {
        if (e.button === 0) { // 左クリック
            leftPressed = true;
            lastTarget = e.target;
            
            // 両方押されているかチェック
            if (rightPressed) {
                const panel = findPanel(lastTarget);
                if (panel) {
                    e.preventDefault();
                    e.stopPropagation();
                    centerPanel(panel);
                }
            }
        } else if (e.button === 2) { // 右クリック
            rightPressed = true;
            lastTarget = e.target;
            
            // 両方押されているかチェック
            if (leftPressed) {
                const panel = findPanel(lastTarget);
                if (panel) {
                    e.preventDefault();
                    e.stopPropagation();
                    centerPanel(panel);
                }
            }
        }
    }, true);
    
    // マウスアップイベント
    document.addEventListener('mouseup', (e) => {
        if (e.button === 0) {
            leftPressed = false;
        } else if (e.button === 2) {
            rightPressed = false;
        }
    }, true);
    
    // コンテキストメニューをパネル上では無効化（両クリック時）
    document.addEventListener('contextmenu', (e) => {
        if (leftPressed) {
            const panel = findPanel(e.target);
            if (panel) {
                e.preventDefault();
            }
        }
    }, true);
    
    console.log('✅ パネル中央移動機能を設定しました（右クリック+左クリック同時押し）');
}

// パネル中央移動機能を初期化
setTimeout(setupPanelCenterMove, 500);

// ========================================
// v2.1: Shift+Q 録画モード（UI非表示）
// 姄想ワイプ以外の全UIを隠す
// ========================================

function setupRecordingMode() {
    let isRecordingMode = false;
    let hiddenElements = [];
    
    // 残すべき要素を判定（姄想ワイプ + 字幕）
    const keepIds = ['imagination', 'wipe', 'recording-mode', 'subtitle'];
    
    function shouldKeep(el) {
        if (!el) return false;
        if (el.tagName === 'CANVAS') return true;
        if (el.tagName === 'SCRIPT' || el.tagName === 'STYLE' || el.tagName === 'LINK') return true;
        
        const id = (el.id || '').toLowerCase();
        const cls = (el.className || '').toString().toLowerCase();
        
        for (const keepId of keepIds) {
            if (id.includes(keepId) || cls.includes(keepId)) return true;
        }
        return false;
    }
    
    // 録画モードをトグル
    function toggleRecordingMode() {
        isRecordingMode = !isRecordingMode;
        
        if (isRecordingMode) {
            enterRecordingMode();
        } else {
            exitRecordingMode();
        }
    }
    
    // 録画モードに入る（UIを隠す）- DOM直接操作方式
    function enterRecordingMode() {
        hiddenElements = [];
        
        const allElements = document.body.querySelectorAll('*');
        
        allElements.forEach(el => {
            if (shouldKeep(el)) return;
            
            const style = window.getComputedStyle(el);
            if (style.position === 'fixed' || style.position === 'absolute') {
                if (style.display !== 'none') {
                    // 元のスタイルを保存
                    el.dataset.recordingWasDisplay = el.style.display || '';
                    el.style.setProperty('display', 'none', 'important');
                    hiddenElements.push(el);
                }
            }
        });
        
        // 録画モードインジケーターを表示
        showRecordingIndicator(true);
        
        console.log(`🎥 録画モードON - ${hiddenElements.length}個のUIを非表示`);
    }
    
    // 録画モードを終了（UIを復元）
    function exitRecordingMode() {
        // 隠した要素を復元
        hiddenElements.forEach(el => {
            const wasDisplay = el.dataset.recordingWasDisplay;
            el.style.display = wasDisplay || '';
            delete el.dataset.recordingWasDisplay;
        });
        
        hiddenElements = [];
        
        // インジケーターを隠す
        showRecordingIndicator(false);
        
        console.log('🎥 録画モードOFF - UIを復元');
    }
    
    // 録画モードインジケーター
    function showRecordingIndicator(show) {
        let indicator = document.getElementById('recording-mode-indicator');
        
        if (show) {
            if (!indicator) {
                indicator = document.createElement('div');
                indicator.id = 'recording-mode-indicator';
                indicator.style.cssText = `
                    position: fixed;
                    top: 10px;
                    left: 50%;
                    transform: translateX(-50%);
                    background: linear-gradient(135deg, #ff4757 0%, #ff6b81 100%);
                    color: white;
                    padding: 8px 20px;
                    border-radius: 20px;
                    font-size: 12px;
                    font-weight: bold;
                    z-index: 999999;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    box-shadow: 0 4px 15px rgba(255, 71, 87, 0.4);
                    animation: recordingPulse 1.5s infinite;
                    pointer-events: none;
                `;
                indicator.innerHTML = `
                    <span style="
                        width: 10px;
                        height: 10px;
                        background: white;
                        border-radius: 50%;
                        animation: recordingBlink 1s infinite;
                    "></span>
                    <span>🎥 録画モード (Shift+Qで終了)</span>
                `;
                document.body.appendChild(indicator);
            }
            indicator.style.display = 'flex';
        } else {
            if (indicator) {
                indicator.style.display = 'none';
            }
        }
    }
    
    // アニメーションCSSを追加
    if (!document.getElementById('recording-mode-style')) {
        const style = document.createElement('style');
        style.id = 'recording-mode-style';
        style.textContent = `
            @keyframes recordingPulse {
                0%, 100% { box-shadow: 0 4px 15px rgba(255, 71, 87, 0.4); }
                50% { box-shadow: 0 4px 25px rgba(255, 71, 87, 0.8); }
            }
            @keyframes recordingBlink {
                0%, 100% { opacity: 1; }
                50% { opacity: 0.3; }
            }
            @keyframes recordingModeEnter {
                from { opacity: 0; transform: translateX(-50%) translateY(-20px); }
                to { opacity: 1; transform: translateX(-50%) translateY(0); }
            }
        `;
        document.head.appendChild(style);
    }
    
    // Shift+Q キーイベントをリスン
    document.addEventListener('keydown', (e) => {
        // Shift + Q
        if (e.shiftKey && (e.key === 'Q' || e.key === 'q')) {
            e.preventDefault();
            toggleRecordingMode();
        }
    });
    
    // グローバルAPI
    window.toggleRecordingMode = toggleRecordingMode;
    window.enterRecordingMode = enterRecordingMode;
    window.exitRecordingMode = exitRecordingMode;
    window.isRecordingMode = () => isRecordingMode;
    
    console.log('✅ 録画モード機能を設定しました（Shift+Qでトグル）');
}

// 録画モード機能を初期化
setTimeout(setupRecordingMode, 1000);

console.log('✅ panel-ui-manager.js v2.2 読み込み完了');
