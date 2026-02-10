// ========================================
// 3Dモデル右クリックメニュー
// サイズ変更、回転、削除などの操作
// VRMモデル対応版（体型モーフ＆ボーン調整、モーフ調整機能追加）
// ========================================

console.log('📋 右クリックメニューシステムを読み込み中...');

// 選択中のオブジェクト
window.selectedPhysicsObject = null;
window.selectedVRM = null; // VRM選択用

// 右クリックメニュー要素
let contextMenu = null;
let sizePanel = null;
let morphPanel = null;
let bodyMorphBonePanel = null;

// Raycaster for picking
let raycaster = null;
let mouse = null;

// 初期化を待つ
function initContextMenu() {
    const checkReady = setInterval(() => {
        if (window.THREE && window.app && window.app.scene && window.app.camera) {
            clearInterval(checkReady);
            setupContextMenu();
        }
    }, 100);
    
    setTimeout(() => clearInterval(checkReady), 10000);
}

function setupContextMenu() {
    const THREE = window.THREE;
    
    raycaster = new THREE.Raycaster();
    mouse = new THREE.Vector2();
    
    // 右クリックメニューHTML作成
    createContextMenuElement();
    createSizePanelElement();
    createMorphPanelElement();
    createBodyMorphBonePanelElement();
    
    // イベントリスナー
    const canvas = document.querySelector('canvas');
    if (canvas) {
        canvas.addEventListener('contextmenu', onContextMenu);
        canvas.addEventListener('click', hideContextMenu);
    }
    
    // ESCで閉じる
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            hideContextMenu();
            hideSizePanel();
            hideMorphPanel();
            hideBodyMorphBonePanel();
        }
    });
    
    console.log('✅ 右クリックメニュー初期化完了（VRM対応・モーフ/ボーン調整機能付き）');
}

// 右クリックメニュー要素作成
function createContextMenuElement() {
    contextMenu = document.createElement('div');
    contextMenu.id = 'model-context-menu';
    contextMenu.style.cssText = `
        display: none;
        position: fixed;
        background: rgba(255, 255, 255, 0.98);
        border-radius: 8px;
        box-shadow: 0 4px 20px rgba(0,0,0,0.3);
        z-index: 10001;
        min-width: 180px;
        font-family: 'Segoe UI', sans-serif;
        font-size: 11px;
        overflow: hidden;
    `;
    contextMenu.innerHTML = `
        <div id="ctx-target-name" style="padding: 8px 12px; background: #667eea; color: white; font-weight: bold; font-size: 10px;"></div>
        <div class="ctx-item" data-action="resize" style="padding: 8px 12px; cursor: pointer; display: flex; align-items: center; gap: 8px; border-bottom: 1px solid #eee;">
            <span>📏</span> サイズ・位置
        </div>
        <div class="ctx-item ctx-vrm-only" data-action="body-morph-bone" style="padding: 8px 12px; cursor: pointer; display: flex; align-items: center; gap: 8px; border-bottom: 1px solid #eee; background: #fff3e0;">
            <span>🦴</span> 体型モーフ＆ボーン調整
        </div>
        <div class="ctx-item ctx-vrm-only" data-action="morph" style="padding: 8px 12px; cursor: pointer; display: flex; align-items: center; gap: 8px; border-bottom: 1px solid #eee; background: #e3f2fd;">
            <span>😊</span> モーフ調整
        </div>
        <div class="ctx-item" data-action="rotate" style="padding: 8px 12px; cursor: pointer; display: flex; align-items: center; gap: 8px; border-bottom: 1px solid #eee;">
            <span>🔄</span> 回転リセット
        </div>
        <div class="ctx-item" data-action="clone" style="padding: 8px 12px; cursor: pointer; display: flex; align-items: center; gap: 8px; border-bottom: 1px solid #eee;">
            <span>📋</span> 複製
        </div>
        <div class="ctx-item ctx-delete" data-action="delete" style="padding: 8px 12px; cursor: pointer; display: flex; align-items: center; gap: 8px; color: #e53935;">
            <span>🗑️</span> 削除
        </div>
    `;
    document.body.appendChild(contextMenu);
    
    // ホバー効果
    contextMenu.querySelectorAll('.ctx-item').forEach(item => {
        item.addEventListener('mouseenter', () => {
            item.style.background = item.classList.contains('ctx-vrm-only') ? 
                (item.dataset.action === 'body-morph-bone' ? '#ffe0b2' : '#bbdefb') : '#f0f0f0';
        });
        item.addEventListener('mouseleave', () => {
            item.style.background = item.classList.contains('ctx-vrm-only') ? 
                (item.dataset.action === 'body-morph-bone' ? '#fff3e0' : '#e3f2fd') : 'transparent';
        });
        item.addEventListener('click', onMenuAction);
    });
}

// ========================================
// モーフ調整パネル（表情モーフ）
// ========================================

// 保存済みモーフプリセットを管理
window.savedMorphPresets = window.savedMorphPresets || [];

// ローカルストレージからプリセットを読み込み
function loadSavedMorphPresets() {
    try {
        const saved = localStorage.getItem('vrm-morph-presets');
        if (saved) {
            window.savedMorphPresets = JSON.parse(saved);
            console.log(`📂 保存済みモーフプリセット読み込み: ${window.savedMorphPresets.length}件`);
        }
    } catch (e) {
        console.warn('モーフプリセット読み込みエラー:', e);
        window.savedMorphPresets = [];
    }
}

// ローカルストレージにプリセットを保存
function saveMorphPresetsToStorage() {
    try {
        localStorage.setItem('vrm-morph-presets', JSON.stringify(window.savedMorphPresets));
        console.log(`💾 モーフプリセット保存完了: ${window.savedMorphPresets.length}件`);
    } catch (e) {
        console.warn('モーフプリセット保存エラー:', e);
    }
}

// 現在のモーフ状態を取得
function getCurrentMorphState() {
    const vrm = window.selectedVRM;
    if (!vrm || !vrm.expressionManager) return null;
    
    const state = {};
    const expressionNames = ['happy', 'angry', 'sad', 'relaxed', 'surprised', 'aa', 'ih', 'ou', 'ee', 'oh', 
                            'blink', 'blinkLeft', 'blinkRight', 'lookUp', 'lookDown', 'lookLeft', 'lookRight', 'neutral',
                            'browDownLeft', 'browDownRight', 'browInnerUp', 'browOuterUpLeft', 'browOuterUpRight'];
    
    expressionNames.forEach(name => {
        try {
            const val = vrm.expressionManager.getValue(name);
            if (val !== undefined && val > 0) {
                state[name] = val;
            }
        } catch (e) {}
    });
    
    return state;
}

// モーフプリセットを保存
function saveCurrentMorphPreset() {
    const state = getCurrentMorphState();
    if (!state || Object.keys(state).length === 0) {
        alert('保存するモーフがありません。\n少なくとも1つのモーフを0以外に設定してください。');
        return;
    }
    
    const name = prompt('プリセット名を入力してください:', `表情${window.savedMorphPresets.length + 1}`);
    if (!name || name.trim() === '') return;
    
    const preset = {
        id: Date.now(),
        name: name.trim(),
        values: state,
        createdAt: new Date().toISOString()
    };
    
    window.savedMorphPresets.push(preset);
    saveMorphPresetsToStorage();
    updateSavedPresetsDropdown();
    
    console.log(`💾 モーフプリセット保存: ${preset.name}`, preset.values);
    alert(`「${preset.name}」を保存しました！`);
}

// 保存済みプリセットを適用
function applySavedMorphPreset(presetId) {
    const preset = window.savedMorphPresets.find(p => p.id === presetId);
    if (!preset) return;
    
    const vrm = window.selectedVRM;
    if (!vrm || !vrm.expressionManager) return;
    
    // 全モーフをリセット
    resetAllMorphs();
    
    // プリセットの値を適用
    for (const [name, value] of Object.entries(preset.values)) {
        setMorphValue(name, value);
    }
    
    // UIを更新
    updateMorphList();
    console.log(`🎭 プリセット適用: ${preset.name}`);
    
    // ドロップダウンを閉じる
    closeSavedPresetsDropdown();
}

// 保存済みプリセットを削除
function deleteSavedMorphPreset(presetId, event) {
    event.stopPropagation();
    
    const preset = window.savedMorphPresets.find(p => p.id === presetId);
    if (!preset) return;
    
    if (!confirm(`「${preset.name}」を削除しますか？`)) return;
    
    window.savedMorphPresets = window.savedMorphPresets.filter(p => p.id !== presetId);
    saveMorphPresetsToStorage();
    updateSavedPresetsDropdown();
    
    console.log(`🗑️ プリセット削除: ${preset.name}`);
}

// ドロップダウンを更新
function updateSavedPresetsDropdown() {
    const listContainer = document.getElementById('saved-presets-list');
    if (!listContainer) return;
    
    if (window.savedMorphPresets.length === 0) {
        listContainer.innerHTML = `
            <div style="padding: 12px; text-align: center; color: #888; font-size: 11px;">
                保存済みプリセットはありません
            </div>
        `;
        return;
    }
    
    let html = '';
    window.savedMorphPresets.forEach(preset => {
        const morphCount = Object.keys(preset.values).length;
        const previewText = Object.entries(preset.values)
            .slice(0, 3)
            .map(([k, v]) => `${getMorphDisplayName(k).split(' ')[1] || k}:${(v*100).toFixed(0)}%`)
            .join(', ');
        
        html += `
            <div class="saved-preset-item" data-preset-id="${preset.id}" style="
                padding: 10px 12px;
                border-bottom: 1px solid #eee;
                cursor: pointer;
                display: flex;
                justify-content: space-between;
                align-items: center;
                transition: background 0.2s;
            " onmouseover="this.style.background='#f0f0f0'" onmouseout="this.style.background='white'">
                <div style="flex: 1; min-width: 0;">
                    <div style="font-weight: bold; font-size: 12px; color: #333; margin-bottom: 2px;">
                        🎭 ${preset.name}
                    </div>
                    <div style="font-size: 9px; color: #888; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                        ${morphCount}個のモーフ: ${previewText}${morphCount > 3 ? '...' : ''}
                    </div>
                </div>
                <button class="delete-preset-btn" data-preset-id="${preset.id}" style="
                    background: none;
                    border: none;
                    color: #e53935;
                    cursor: pointer;
                    padding: 4px 8px;
                    font-size: 14px;
                    opacity: 0.6;
                    transition: opacity 0.2s;
                " onmouseover="this.style.opacity='1'" onmouseout="this.style.opacity='0.6'">🗑️</button>
            </div>
        `;
    });
    
    listContainer.innerHTML = html;
    
    // イベント設定
    listContainer.querySelectorAll('.saved-preset-item').forEach(item => {
        item.addEventListener('click', (e) => {
            if (!e.target.classList.contains('delete-preset-btn')) {
                applySavedMorphPreset(parseInt(item.dataset.presetId));
            }
        });
    });
    
    listContainer.querySelectorAll('.delete-preset-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            deleteSavedMorphPreset(parseInt(btn.dataset.presetId), e);
        });
    });
}

// ドロップダウンの表示/非表示を切り替え
function toggleSavedPresetsDropdown() {
    const dropdown = document.getElementById('saved-presets-dropdown');
    if (!dropdown) return;
    
    const isVisible = dropdown.style.display !== 'none';
    
    if (isVisible) {
        closeSavedPresetsDropdown();
    } else {
        dropdown.style.display = 'block';
        updateSavedPresetsDropdown();
    }
}

// ドロップダウンを閉じる
function closeSavedPresetsDropdown() {
    const dropdown = document.getElementById('saved-presets-dropdown');
    if (dropdown) {
        dropdown.style.display = 'none';
    }
}

function createMorphPanelElement() {
    // 保存済みプリセットを読み込み
    loadSavedMorphPresets();
    
    morphPanel = document.createElement('div');
    morphPanel.id = 'morph-panel';
    morphPanel.style.cssText = `
        display: none;
        position: fixed;
        background: rgba(255, 255, 255, 0.98);
        border-radius: 12px;
        box-shadow: 0 8px 32px rgba(0,0,0,0.3);
        z-index: 10003;
        width: 380px;
        max-height: 80vh;
        font-family: 'Segoe UI', sans-serif;
        font-size: 11px;
        overflow: hidden;
    `;
    morphPanel.innerHTML = `
        <div id="morph-panel-header" style="padding: 12px 16px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; cursor: move; user-select: none;">
            <div style="display: flex; justify-content: space-between; align-items: center;">
                <span style="font-weight: bold; font-size: 14px;">😊 モーフ調整</span>
                <div style="display: flex; align-items: center; gap: 8px;">
                    <!-- 保存済みプリセットドロップダウン -->
                    <div style="position: relative;">
                        <button id="saved-presets-toggle" style="
                            background: rgba(255,255,255,0.2);
                            border: none;
                            font-size: 18px;
                            cursor: pointer;
                            padding: 4px 8px;
                            border-radius: 4px;
                            color: white;
                            display: flex;
                            align-items: center;
                            gap: 4px;
                        " title="保存済みプリセット">
                            <span style="font-size: 12px;">📁</span>
                            <span style="font-size: 14px;">▼</span>
                        </button>
                        <div id="saved-presets-dropdown" style="
                            display: none;
                            position: absolute;
                            top: 100%;
                            right: 0;
                            background: white;
                            border-radius: 8px;
                            box-shadow: 0 4px 20px rgba(0,0,0,0.3);
                            min-width: 280px;
                            max-height: 300px;
                            overflow-y: auto;
                            z-index: 10010;
                            margin-top: 4px;
                        ">
                            <div style="
                                padding: 10px 12px;
                                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                                color: white;
                                font-weight: bold;
                                font-size: 12px;
                                border-radius: 8px 8px 0 0;
                            ">📁 保存済みプリセット</div>
                            <div id="saved-presets-list">
                                <!-- プリセットリストがここに入る -->
                            </div>
                        </div>
                    </div>
                    <button id="morph-panel-close" style="
                        background: rgba(255,255,255,0.2);
                        border: none;
                        font-size: 16px;
                        cursor: pointer;
                        padding: 4px 8px;
                        border-radius: 4px;
                        color: white;
                    ">✕</button>
                </div>
            </div>
            <div style="font-size: 10px; opacity: 0.8; margin-top: 4px;">VRoid Studio風のモーフコントロール（ドラッグで移動可）</div>
        </div>
        
        <!-- 検索バー -->
        <div style="padding: 10px 16px; border-bottom: 1px solid #eee;">
            <input type="text" id="morph-search" placeholder="🔍 モーフを検索..." style="
                width: 100%;
                padding: 8px 12px;
                border: 1px solid #ddd;
                border-radius: 6px;
                font-size: 12px;
            ">
        </div>
        
        <!-- プリセットボタン -->
        <div style="padding: 10px 16px; border-bottom: 1px solid #eee; display: flex; gap: 6px; flex-wrap: wrap;">
            <button class="morph-preset-btn" data-preset="neutral" style="padding: 6px 12px; border: 1px solid #ddd; border-radius: 6px; background: #f5f5f5; cursor: pointer; font-size: 10px;">😐 ニュートラル</button>
            <button class="morph-preset-btn" data-preset="happy" style="padding: 6px 12px; border: 1px solid #ddd; border-radius: 6px; background: #f5f5f5; cursor: pointer; font-size: 10px;">😊 笑顔</button>
            <button class="morph-preset-btn" data-preset="angry" style="padding: 6px 12px; border: 1px solid #ddd; border-radius: 6px; background: #f5f5f5; cursor: pointer; font-size: 10px;">😠 怒り</button>
            <button class="morph-preset-btn" data-preset="sad" style="padding: 6px 12px; border: 1px solid #ddd; border-radius: 6px; background: #f5f5f5; cursor: pointer; font-size: 10px;">😢 悲しみ</button>
            <button class="morph-preset-btn" data-preset="surprised" style="padding: 6px 12px; border: 1px solid #ddd; border-radius: 6px; background: #f5f5f5; cursor: pointer; font-size: 10px;">😮 驚き</button>
        </div>
        
        <!-- モーフリスト -->
        <div id="morph-list" style="padding: 10px 16px; max-height: 45vh; overflow-y: auto;">
            <div style="text-align: center; padding: 20px; color: #888;">VRMモデルを読み込んでください</div>
        </div>
        
        <!-- 保存ボタン＆リセットボタン -->
        <div style="padding: 12px 16px; border-top: 1px solid #eee; background: #f9f9f9;">
            <div style="display: flex; gap: 8px; margin-bottom: 8px;">
                <button id="morph-save-preset" style="
                    flex: 1;
                    padding: 10px;
                    border: none;
                    border-radius: 6px;
                    background: linear-gradient(135deg, #4CAF50 0%, #45a049 100%);
                    color: white;
                    font-weight: bold;
                    cursor: pointer;
                    font-size: 12px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 6px;
                ">
                    <span>💾</span> 表情を保存
                </button>
            </div>
            <button id="morph-reset-all" style="
                width: 100%;
                padding: 10px;
                border: none;
                border-radius: 6px;
                background: linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%);
                color: white;
                font-weight: bold;
                cursor: pointer;
                font-size: 12px;
            ">🔄 すべてのモーフをリセット</button>
        </div>
    `;
    document.body.appendChild(morphPanel);
    
    // イベント設定
    document.getElementById('morph-panel-close').addEventListener('click', hideMorphPanel);
    document.getElementById('morph-reset-all').addEventListener('click', resetAllMorphs);
    document.getElementById('morph-search').addEventListener('input', filterMorphList);
    document.getElementById('morph-save-preset').addEventListener('click', saveCurrentMorphPreset);
    document.getElementById('saved-presets-toggle').addEventListener('click', toggleSavedPresetsDropdown);
    
    // プリセットボタン
    morphPanel.querySelectorAll('.morph-preset-btn').forEach(btn => {
        btn.addEventListener('click', () => applyMorphPreset(btn.dataset.preset));
    });
    
    // ドロップダウン外をクリックしたら閉じる
    document.addEventListener('click', (e) => {
        const dropdown = document.getElementById('saved-presets-dropdown');
        const toggle = document.getElementById('saved-presets-toggle');
        if (dropdown && toggle && !dropdown.contains(e.target) && !toggle.contains(e.target)) {
            closeSavedPresetsDropdown();
        }
    });
    
    // 初期ドロップダウン更新
    updateSavedPresetsDropdown();
    
    // ドラッグ移動機能を設定
    setupMorphPanelDrag();
}

// モーフ調整パネルのドラッグ移動機能
function setupMorphPanelDrag() {
    const header = document.getElementById('morph-panel-header');
    const panel = document.getElementById('morph-panel');
    
    if (!header || !panel) return;
    
    let isDragging = false;
    let startX = 0;
    let startY = 0;
    let initialLeft = 0;
    let initialTop = 0;
    
    // マウスダウン
    header.addEventListener('mousedown', (e) => {
        // ボタンをクリックした場合は無視
        if (e.target.tagName === 'BUTTON' || e.target.closest('button')) return;
        
        isDragging = true;
        startX = e.clientX;
        startY = e.clientY;
        initialLeft = panel.offsetLeft;
        initialTop = panel.offsetTop;
        
        header.style.cursor = 'grabbing';
        e.preventDefault();
    });
    
    // マウス移動（document全体で監視）
    document.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        
        const deltaX = e.clientX - startX;
        const deltaY = e.clientY - startY;
        
        let newLeft = initialLeft + deltaX;
        let newTop = initialTop + deltaY;
        
        // 画面外に出ないよう制限
        const panelRect = panel.getBoundingClientRect();
        const maxLeft = window.innerWidth - panelRect.width;
        const maxTop = window.innerHeight - 50; // ヘッダー部分は残す
        
        newLeft = Math.max(0, Math.min(newLeft, maxLeft));
        newTop = Math.max(0, Math.min(newTop, maxTop));
        
        panel.style.left = newLeft + 'px';
        panel.style.top = newTop + 'px';
    });
    
    // マウスアップ（document全体で監視）
    document.addEventListener('mouseup', () => {
        if (isDragging) {
            isDragging = false;
            header.style.cursor = 'move';
        }
    });
    
    // タッチ対応
    header.addEventListener('touchstart', (e) => {
        if (e.target.tagName === 'BUTTON' || e.target.closest('button')) return;
        
        isDragging = true;
        const touch = e.touches[0];
        startX = touch.clientX;
        startY = touch.clientY;
        initialLeft = panel.offsetLeft;
        initialTop = panel.offsetTop;
        
        e.preventDefault();
    }, { passive: false });
    
    document.addEventListener('touchmove', (e) => {
        if (!isDragging) return;
        
        const touch = e.touches[0];
        const deltaX = touch.clientX - startX;
        const deltaY = touch.clientY - startY;
        
        let newLeft = initialLeft + deltaX;
        let newTop = initialTop + deltaY;
        
        const panelRect = panel.getBoundingClientRect();
        const maxLeft = window.innerWidth - panelRect.width;
        const maxTop = window.innerHeight - 50;
        
        newLeft = Math.max(0, Math.min(newLeft, maxLeft));
        newTop = Math.max(0, Math.min(newTop, maxTop));
        
        panel.style.left = newLeft + 'px';
        panel.style.top = newTop + 'px';
    }, { passive: true });
    
    document.addEventListener('touchend', () => {
        isDragging = false;
    });
    
    console.log('✅ モーフパネルドラッグ移動機能設定完了');
}

// モーフパネル表示
function showMorphPanel() {
    if (!window.selectedVRM) return;
    
    morphPanel.style.display = 'block';
    
    // 画面右側に配置
    const x = Math.min(window.innerWidth - 400, Math.max(10, window.innerWidth - 400));
    const y = Math.min(window.innerHeight - 500, Math.max(10, 50));
    morphPanel.style.left = x + 'px';
    morphPanel.style.top = y + 'px';
    
    // ヘッダーにキャラクター名を表示
    const headerTitle = morphPanel.querySelector('#morph-panel-header span');
    if (headerTitle) {
        if (window.selectedVRMCharacterId) {
            const charName = window.selectedVRMCharacterName || window.selectedVRMCharacterId;
            headerTitle.textContent = `😊 モーフ調整 - ${charName}`;
        } else {
            headerTitle.textContent = '😊 モーフ調整';
        }
    }
    
    // モーフリストを更新
    updateMorphList();
    
    // ★ ルックアットは停止しない（モーフパネル中も有効）
    // ★ 自動瞬きのみ停止（モーフ調整中は邪魔になるため）
    if (window.autoBlinkInterval) {
        window._morphPanelPausedBlinkInterval = true;
        clearInterval(window.autoBlinkInterval);
        window.autoBlinkInterval = null;
        console.log('⏸️ 自動瞬き一時停止（モーフ調整中）');
    }
    
    console.log('😊 モーフパネル表示（ルックアットは有効）');
}

// モーフパネル非表示
function hideMorphPanel() {
    if (morphPanel) {
        morphPanel.style.display = 'none';
    }
    
    // ★ ルックアットの状態をデバッグ
    console.log('🔍 ルックアット状態確認:');
    console.log('  - window.lookAtUpdateInterval:', window.lookAtUpdateInterval);
    console.log('  - window.LookAtSystem:', window.LookAtSystem);
    console.log('  - window.reinitializeLookAt:', typeof window.reinitializeLookAt);
    
    // ★ 強制的にルックアットを再初期化（常に実行）
    if (window.reinitializeLookAt) {
        console.log('🔄 ルックアット強制再初期化...');
        window.reinitializeLookAt();
    } else if (window.LookAtSystem && typeof window.LookAtSystem.reinitialize === 'function') {
        console.log('🔄 LookAtSystem.reinitialize()を呼び出し...');
        window.LookAtSystem.reinitialize();
    } else {
        console.warn('⚠️ ルックアット再初期化関数が見つかりません');
    }
    
    // ★ 自動瞬き復帰
    if (window._morphPanelPausedBlinkInterval && !window.autoBlinkInterval) {
        if (window.startAutoBlink && typeof window.startAutoBlink === 'function') {
            window.startAutoBlink();
            console.log('▶️ 自動瞬き復帰');
        } else if (window.reinitializeAutoBlink) {
            window.reinitializeAutoBlink();
            console.log('▶️ 自動瞬き復帰（reinitialize）');
        }
        window._morphPanelPausedBlinkInterval = false;
    }
    
    console.log('▶️ モーフパネル閉じました');
}

// モーフリスト更新
function updateMorphList() {
    const listContainer = document.getElementById('morph-list');
    if (!listContainer) return;
    
    const vrm = window.selectedVRM;
    if (!vrm || !vrm.expressionManager) {
        listContainer.innerHTML = '<div style="text-align: center; padding: 20px; color: #888;">モーフデータがありません</div>';
        return;
    }
    
    const expressions = vrm.expressionManager.expressions || [];
    const expressionMap = vrm.expressionManager.expressionMap || {};
    
    // 利用可能な表情名を取得
    let expressionNames = [];
    
    // VRM 1.0の場合
    if (expressionMap && Object.keys(expressionMap).length > 0) {
        expressionNames = Object.keys(expressionMap);
        console.log('🎭 VRM 1.0 expressionMap:', Object.keys(expressionMap));
    }
    
    // VRM 0.xの場合（BlendShapeProxy）
    if (vrm.blendShapeProxy) {
        const blendShapeGroups = vrm.blendShapeProxy._blendShapeGroups;
        if (blendShapeGroups) {
            expressionNames = Object.keys(blendShapeGroups);
            console.log('🎭 VRM 0.x blendShapeGroups:', Object.keys(blendShapeGroups));
        }
    }
    
    // expressionsリストも確認
    if (expressions && expressions.length > 0) {
        console.log('🎭 expressions配列:', expressions.map(e => e.expressionName || e.name || 'unknown'));
        expressions.forEach(exp => {
            const name = exp.expressionName || exp.name;
            if (name && !expressionNames.includes(name)) {
                expressionNames.push(name);
            }
        });
    }
    
    // _expressionMapも確認（内部プロパティ）
    if (vrm.expressionManager._expressionMap) {
        const internalMap = vrm.expressionManager._expressionMap;
        console.log('🎭 _expressionMap:', Object.keys(internalMap));
        Object.keys(internalMap).forEach(name => {
            if (!expressionNames.includes(name)) {
                expressionNames.push(name);
            }
        });
    }
    
    console.log('🎭 検出された全表情名:', expressionNames);
    
    // 標準的なVRM表情名も追加（眉毛モーフ含む）
    const standardExpressions = ['happy', 'angry', 'sad', 'relaxed', 'surprised', 'aa', 'ih', 'ou', 'ee', 'oh', 'blink', 'blinkLeft', 'blinkRight', 'lookUp', 'lookDown', 'lookLeft', 'lookRight', 'neutral',
        'browDownLeft', 'browDownRight', 'browInnerUp', 'browOuterUpLeft', 'browOuterUpRight',
        'browDown', 'browUp', 'browAngry', 'browSad', 'browHappy', 'browSurprised'];
    standardExpressions.forEach(name => {
        if (!expressionNames.includes(name)) {
            // 値が取得できるか試す
            try {
                const val = vrm.expressionManager.getValue(name);
                if (val !== undefined) {
                    expressionNames.push(name);
                }
            } catch (e) {}
        }
    });
    
    if (expressionNames.length === 0) {
        listContainer.innerHTML = '<div style="text-align: center; padding: 20px; color: #888;">利用可能なモーフがありません</div>';
        return;
    }
    
    // カテゴリ分け（眉毛カテゴリ追加）
    // 実際に存在するモーフのみ表示する
    const browMorphs = ['browDownLeft', 'browDownRight', 'browInnerUp', 'browOuterUpLeft', 'browOuterUpRight', 'browDown', 'browUp', 'browAngry', 'browSad', 'browHappy', 'browSurprised',
        'Fcl_BRW_Angry', 'Fcl_BRW_Fun', 'Fcl_BRW_Joy', 'Fcl_BRW_Sorrow', 'Fcl_BRW_Surprised']; // VRoid Studio形式も含む
    
    // 実際にVRMのexpressionMapに存在する眉毛モーフのみフィルタ
    const vrmExpressionNames = Object.keys(vrm.expressionManager._expressionMap || vrm.expressionManager.expressionMap || {});
    const availableBrowMorphs = browMorphs.filter(name => vrmExpressionNames.includes(name));
    
    console.log('🎭 VRMが実際に持つ表情:', vrmExpressionNames);
    console.log('🤨 実際に利用可能な眉毛モーフ:', availableBrowMorphs);
    
    const categories = {
        '👀 目・まばたき': ['blink', 'blinkLeft', 'blinkRight', 'lookUp', 'lookDown', 'lookLeft', 'lookRight'],
        '😊 感情': ['happy', 'angry', 'sad', 'relaxed', 'surprised', 'neutral'],
        '👄 リップシンク': ['aa', 'ih', 'ou', 'ee', 'oh', 'a', 'i', 'u', 'e', 'o'],
        '✨ その他': []
    };
    
    // 眉毛モーフが存在する場合のみカテゴリ追加
    if (availableBrowMorphs.length > 0) {
        // 感情の前に眉毛カテゴリを挿入
        const newCategories = {
            '👀 目・まばたき': categories['👀 目・まばたき'],
            '🤨 眉毛': availableBrowMorphs,
            '😊 感情': categories['😊 感情'],
            '👄 リップシンク': categories['👄 リップシンク'],
            '✨ その他': categories['✨ その他']
        };
        Object.assign(categories, newCategories);
        console.log('🤨 眉毛モーフ検出:', availableBrowMorphs);
    } else {
        console.log('⚠️ このVRMモデルには眉毛モーフが含まれていません');
    }
    
    // カテゴリに属さないものは「その他」へ
    const categorized = new Set();
    Object.values(categories).forEach(list => list.forEach(name => categorized.add(name)));
    expressionNames.forEach(name => {
        if (!categorized.has(name)) {
            categories['✨ その他'].push(name);
        }
    });
    
    let html = '';
    
    for (const [category, names] of Object.entries(categories)) {
        const availableNames = names.filter(name => expressionNames.includes(name));
        if (availableNames.length === 0) continue;
        
        html += `
            <div class="morph-category" style="margin-bottom: 16px;">
                <div style="font-weight: bold; color: #667eea; margin-bottom: 8px; font-size: 12px;">${category}</div>
        `;
        
        availableNames.forEach(name => {
            const currentValue = vrm.expressionManager.getValue(name) || 0;
            const displayName = getMorphDisplayName(name);
            
            html += `
                <div class="morph-row" data-morph="${name}" style="
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    margin-bottom: 8px;
                    padding: 6px 8px;
                    background: #f9f9f9;
                    border-radius: 6px;
                ">
                    <label style="min-width: 100px; font-size: 11px; color: #333;">${displayName}</label>
                    <input type="range" class="morph-slider" data-morph="${name}" 
                        min="0" max="1" step="0.01" value="${currentValue}"
                        style="flex: 1; accent-color: #667eea;">
                    <input type="number" class="morph-value" data-morph="${name}" 
                        min="0" max="1" step="0.01" value="${currentValue.toFixed(2)}"
                        style="width: 50px; text-align: center; border: 1px solid #ddd; border-radius: 4px; padding: 4px; font-size: 10px;">
                </div>
            `;
        });
        
        html += '</div>';
    }
    
    listContainer.innerHTML = html;
    
    // スライダーイベント設定
    listContainer.querySelectorAll('.morph-slider').forEach(slider => {
        slider.addEventListener('input', (e) => {
            const morphName = e.target.dataset.morph;
            const value = parseFloat(e.target.value);
            setMorphValue(morphName, value);
            
            // 数値入力も更新
            const numInput = listContainer.querySelector(`.morph-value[data-morph="${morphName}"]`);
            if (numInput) numInput.value = value.toFixed(2);
        });
    });
    
    // 数値入力イベント設定
    listContainer.querySelectorAll('.morph-value').forEach(input => {
        input.addEventListener('change', (e) => {
            const morphName = e.target.dataset.morph;
            let value = parseFloat(e.target.value) || 0;
            value = Math.max(0, Math.min(1, value));
            e.target.value = value.toFixed(2);
            setMorphValue(morphName, value);
            
            // スライダーも更新
            const slider = listContainer.querySelector(`.morph-slider[data-morph="${morphName}"]`);
            if (slider) slider.value = value;
        });
    });
}

// モーフ表示名取得
function getMorphDisplayName(name) {
    const displayNames = {
        'happy': '😊 喜び',
        'angry': '😠 怒り',
        'sad': '😢 悲しみ',
        'relaxed': '😌 リラックス',
        'surprised': '😮 驚き',
        'neutral': '😐 ニュートラル',
        'aa': '👄 あ',
        'ih': '👄 い',
        'ou': '👄 う',
        'ee': '👄 え',
        'oh': '👄 お',
        'a': '👄 あ',
        'i': '👄 い',
        'u': '👄 う',
        'e': '👄 え',
        'o': '👄 お',
        'blink': '👁️ まばたき',
        'blinkLeft': '👁️ 左まばたき',
        'blinkRight': '👁️ 右まばたき',
        'lookUp': '👀 上を見る',
        'lookDown': '👀 下を見る',
        'lookLeft': '👀 左を見る',
        'lookRight': '👀 右を見る',
        // 眉毛モーフ
        'browDownLeft': '🤨 左眉下げ',
        'browDownRight': '🤨 右眉下げ',
        'browInnerUp': '🤨 眉内側上げ',
        'browOuterUpLeft': '🤨 左眉外側上げ',
        'browOuterUpRight': '🤨 右眉外側上げ',
        'browDown': '🤨 眉下げ',
        'browUp': '🤨 眉上げ',
        'browAngry': '🤨 怒り眉',
        'browSad': '🤨 悲しみ眉',
        'browHappy': '🤨 喜び眉',
        'browSurprised': '🤨 驚き眉',
        // VRoid Studio形式
        'Fcl_BRW_Angry': '🤨 怒り眉 (VRoid)',
        'Fcl_BRW_Fun': '🤨 楽しい眉 (VRoid)',
        'Fcl_BRW_Joy': '🤨 喜び眉 (VRoid)',
        'Fcl_BRW_Sorrow': '🤨 悲しみ眉 (VRoid)',
        'Fcl_BRW_Surprised': '🤨 驚き眉 (VRoid)'
    };
    return displayNames[name] || name;
}

// モーフ値設定
function setMorphValue(name, value) {
    const vrm = window.selectedVRM;
    if (!vrm || !vrm.expressionManager) return;
    
    try {
        vrm.expressionManager.setValue(name, value);
        console.log(`😊 モーフ設定: ${name} = ${value.toFixed(2)}`);
    } catch (e) {
        console.warn('モーフ設定エラー:', name, e);
    }
}

// モーフプリセット適用
function applyMorphPreset(preset) {
    const vrm = window.selectedVRM;
    if (!vrm || !vrm.expressionManager) return;
    
    // 全モーフをリセット
    resetAllMorphs();
    
    // プリセットに応じて設定
    const presets = {
        'neutral': {},
        'happy': { 'happy': 1.0 },
        'angry': { 'angry': 1.0 },
        'sad': { 'sad': 1.0 },
        'surprised': { 'surprised': 1.0 }
    };
    
    const values = presets[preset] || {};
    for (const [name, value] of Object.entries(values)) {
        setMorphValue(name, value);
    }
    
    // UIを更新
    updateMorphList();
    console.log(`🎭 プリセット適用: ${preset}`);
}

// 全モーフリセット
function resetAllMorphs() {
    const vrm = window.selectedVRM;
    if (!vrm || !vrm.expressionManager) return;
    
    // 全ての表情をリセット（眉毛モーフ含む）
    const expressionNames = ['happy', 'angry', 'sad', 'relaxed', 'surprised', 'aa', 'ih', 'ou', 'ee', 'oh', 'blink', 'blinkLeft', 'blinkRight', 'lookUp', 'lookDown', 'lookLeft', 'lookRight', 'neutral',
        'browDownLeft', 'browDownRight', 'browInnerUp', 'browOuterUpLeft', 'browOuterUpRight', 'browDown', 'browUp', 'browAngry', 'browSad', 'browHappy', 'browSurprised'];
    
    expressionNames.forEach(name => {
        try {
            vrm.expressionManager.setValue(name, 0);
        } catch (e) {}
    });
    
    // UIを更新
    updateMorphList();
    console.log('🔄 全モーフリセット');
}

// モーフリスト検索フィルター
function filterMorphList() {
    const searchText = document.getElementById('morph-search').value.toLowerCase();
    const rows = document.querySelectorAll('.morph-row');
    
    rows.forEach(row => {
        const morphName = row.dataset.morph.toLowerCase();
        const label = row.querySelector('label').textContent.toLowerCase();
        const visible = morphName.includes(searchText) || label.includes(searchText);
        row.style.display = visible ? 'flex' : 'none';
    });
}

// ========================================
// 体型モーフ＆ボーン調整パネル
// ========================================
function createBodyMorphBonePanelElement() {
    bodyMorphBonePanel = document.createElement('div');
    bodyMorphBonePanel.id = 'body-morph-bone-panel';
    bodyMorphBonePanel.style.cssText = `
        display: none;
        position: fixed;
        background: rgba(255, 255, 255, 0.98);
        border-radius: 12px;
        box-shadow: 0 8px 32px rgba(0,0,0,0.3);
        z-index: 10003;
        width: 420px;
        max-height: 85vh;
        font-family: 'Segoe UI', sans-serif;
        font-size: 11px;
        overflow: hidden;
    `;
    bodyMorphBonePanel.innerHTML = `
        <div id="body-morph-bone-panel-header" style="padding: 12px 16px; background: linear-gradient(135deg, #ff9800 0%, #f57c00 100%); color: white; cursor: move; user-select: none;">
            <div style="display: flex; justify-content: space-between; align-items: center;">
                <span style="font-weight: bold; font-size: 14px;">🦴 体型モーフ＆ボーン調整</span>
                <button id="body-morph-bone-panel-close" style="
                    background: rgba(255,255,255,0.2);
                    border: none;
                    font-size: 16px;
                    cursor: pointer;
                    padding: 4px 8px;
                    border-radius: 4px;
                    color: white;
                ">✕</button>
            </div>
            <div style="font-size: 10px; opacity: 0.8; margin-top: 4px;">VRoid Studio風の体型・ボーン調整（ドラッグで移動可）</div>
        </div>
        
        <!-- タブ切り替え -->
        <div style="display: flex; border-bottom: 2px solid #f57c00;">
            <button id="tab-body-morph" class="body-tab active" style="
                flex: 1;
                padding: 10px;
                border: none;
                background: #fff3e0;
                cursor: pointer;
                font-weight: bold;
                font-size: 11px;
                color: #e65100;
            ">🎨 体型モーフ</button>
            <button id="tab-bone-adjust" class="body-tab" style="
                flex: 1;
                padding: 10px;
                border: none;
                background: #fafafa;
                cursor: pointer;
                font-weight: bold;
                font-size: 11px;
                color: #666;
            ">🦴 ボーン調整</button>
        </div>
        
        <!-- 検索バー -->
        <div style="padding: 10px 16px; border-bottom: 1px solid #eee;">
            <input type="text" id="body-search" placeholder="🔍 検索..." style="
                width: 100%;
                padding: 8px 12px;
                border: 1px solid #ddd;
                border-radius: 6px;
                font-size: 12px;
            ">
        </div>
        
        <!-- 体型モーフタブ内容 -->
        <div id="body-morph-content" class="body-tab-content" style="display: block;">
            <div id="body-morph-list" style="padding: 10px 16px; max-height: 50vh; overflow-y: auto;">
                <div style="text-align: center; padding: 20px; color: #888;">VRMモデルを読み込んでください</div>
            </div>
        </div>
        
        <!-- ボーン調整タブ内容 -->
        <div id="bone-adjust-content" class="body-tab-content" style="display: none;">
            <div id="bone-list" style="padding: 10px 16px; max-height: 50vh; overflow-y: auto;">
                <div style="text-align: center; padding: 20px; color: #888;">VRMモデルを読み込んでください</div>
            </div>
        </div>
        
        <!-- 全リセットボタン -->
        <div style="padding: 12px 16px; border-top: 1px solid #eee; background: #f9f9f9;">
            <button id="body-bone-reset-all" style="
                width: 100%;
                padding: 10px;
                border: none;
                border-radius: 6px;
                background: linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%);
                color: white;
                font-weight: bold;
                cursor: pointer;
                font-size: 12px;
            ">🔄 すべてリセット</button>
        </div>
    `;
    document.body.appendChild(bodyMorphBonePanel);
    
    // イベント設定
    document.getElementById('body-morph-bone-panel-close').addEventListener('click', hideBodyMorphBonePanel);
    document.getElementById('body-bone-reset-all').addEventListener('click', resetAllBodyMorphAndBones);
    document.getElementById('body-search').addEventListener('input', filterBodyList);
    
    // タブ切り替え
    document.getElementById('tab-body-morph').addEventListener('click', () => switchBodyTab('morph'));
    document.getElementById('tab-bone-adjust').addEventListener('click', () => switchBodyTab('bone'));
    
    // ドラッグ移動機能
    setupBodyMorphBonePanelDrag();
}

// 体型モーフ＆ボーン調整パネルのドラッグ移動機能
function setupBodyMorphBonePanelDrag() {
    const header = document.getElementById('body-morph-bone-panel-header');
    const panel = document.getElementById('body-morph-bone-panel');
    
    if (!header || !panel) return;
    
    let isDragging = false;
    let startX = 0;
    let startY = 0;
    let initialLeft = 0;
    let initialTop = 0;
    
    // マウスダウン
    header.addEventListener('mousedown', (e) => {
        // 閉じるボタンをクリックした場合は無視
        if (e.target.id === 'body-morph-bone-panel-close') return;
        
        isDragging = true;
        startX = e.clientX;
        startY = e.clientY;
        initialLeft = panel.offsetLeft;
        initialTop = panel.offsetTop;
        
        header.style.cursor = 'grabbing';
        e.preventDefault();
    });
    
    // マウス移動（document全体で監視）
    document.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        
        const deltaX = e.clientX - startX;
        const deltaY = e.clientY - startY;
        
        let newLeft = initialLeft + deltaX;
        let newTop = initialTop + deltaY;
        
        // 画面外に出ないよう制限
        const panelRect = panel.getBoundingClientRect();
        const maxLeft = window.innerWidth - panelRect.width;
        const maxTop = window.innerHeight - 50; // ヘッダー部分は残す
        
        newLeft = Math.max(0, Math.min(newLeft, maxLeft));
        newTop = Math.max(0, Math.min(newTop, maxTop));
        
        panel.style.left = newLeft + 'px';
        panel.style.top = newTop + 'px';
    });
    
    // マウスアップ（document全体で監視）
    document.addEventListener('mouseup', () => {
        if (isDragging) {
            isDragging = false;
            header.style.cursor = 'move';
        }
    });
    
    // タッチ対応
    header.addEventListener('touchstart', (e) => {
        if (e.target.id === 'body-morph-bone-panel-close') return;
        
        isDragging = true;
        const touch = e.touches[0];
        startX = touch.clientX;
        startY = touch.clientY;
        initialLeft = panel.offsetLeft;
        initialTop = panel.offsetTop;
        
        e.preventDefault();
    }, { passive: false });
    
    document.addEventListener('touchmove', (e) => {
        if (!isDragging) return;
        
        const touch = e.touches[0];
        const deltaX = touch.clientX - startX;
        const deltaY = touch.clientY - startY;
        
        let newLeft = initialLeft + deltaX;
        let newTop = initialTop + deltaY;
        
        const panelRect = panel.getBoundingClientRect();
        const maxLeft = window.innerWidth - panelRect.width;
        const maxTop = window.innerHeight - 50;
        
        newLeft = Math.max(0, Math.min(newLeft, maxLeft));
        newTop = Math.max(0, Math.min(newTop, maxTop));
        
        panel.style.left = newLeft + 'px';
        panel.style.top = newTop + 'px';
    }, { passive: true });
    
    document.addEventListener('touchend', () => {
        isDragging = false;
    });
}

// タブ切り替え
function switchBodyTab(tab) {
    const morphTab = document.getElementById('tab-body-morph');
    const boneTab = document.getElementById('tab-bone-adjust');
    const morphContent = document.getElementById('body-morph-content');
    const boneContent = document.getElementById('bone-adjust-content');
    
    if (tab === 'morph') {
        morphTab.style.background = '#fff3e0';
        morphTab.style.color = '#e65100';
        boneTab.style.background = '#fafafa';
        boneTab.style.color = '#666';
        morphContent.style.display = 'block';
        boneContent.style.display = 'none';
    } else {
        morphTab.style.background = '#fafafa';
        morphTab.style.color = '#666';
        boneTab.style.background = '#fff3e0';
        boneTab.style.color = '#e65100';
        morphContent.style.display = 'none';
        boneContent.style.display = 'block';
    }
}

// 体型モーフ＆ボーン調整パネル表示
function showBodyMorphBonePanel() {
    if (!window.selectedVRM) return;
    
    bodyMorphBonePanel.style.display = 'block';
    
    // 画面左側に配置
    const x = Math.max(10, 50);
    const y = Math.min(window.innerHeight - 600, Math.max(10, 50));
    bodyMorphBonePanel.style.left = x + 'px';
    bodyMorphBonePanel.style.top = y + 'px';
    
    // ヘッダーにキャラクター名を表示
    const headerTitle = bodyMorphBonePanel.querySelector('#body-morph-bone-panel-header span');
    if (headerTitle) {
        if (window.selectedVRMCharacterId) {
            const charName = window.selectedVRMCharacterName || window.selectedVRMCharacterId;
            headerTitle.textContent = `🦴 体型モーフ＆ボーン調整 - ${charName}`;
        } else {
            headerTitle.textContent = '🦴 体型モーフ＆ボーン調整';
        }
    }
    
    // リストを更新
    updateBodyMorphList();
    updateBoneList();
}

// 体型モーフ＆ボーン調整パネル非表示
function hideBodyMorphBonePanel() {
    if (bodyMorphBonePanel) {
        bodyMorphBonePanel.style.display = 'none';
    }
}

// 体型モーフリスト更新
function updateBodyMorphList() {
    const listContainer = document.getElementById('body-morph-list');
    if (!listContainer) return;
    
    const vrm = window.selectedVRM;
    if (!vrm) {
        listContainer.innerHTML = '<div style="text-align: center; padding: 20px; color: #888;">VRMモデルがありません</div>';
        return;
    }
    
    // VRMのBlendShapeを探索
    const blendShapes = [];
    
    // メッシュを保存するマップ（後で直接参照できるように）
    window._bodyMorphMeshes = window._bodyMorphMeshes || {};
    
    vrm.scene.traverse((obj) => {
        if (obj.isMesh && obj.morphTargetInfluences && obj.morphTargetDictionary) {
            const meshName = obj.name || 'Mesh';
            const morphNames = Object.keys(obj.morphTargetDictionary);
            
            // メッシュを保存
            window._bodyMorphMeshes[meshName] = obj;
            
            morphNames.forEach(name => {
                // 体型関連のモーフをフィルタリング（顔の表情以外）
                const isBodyMorph = !['happy', 'angry', 'sad', 'surprised', 'relaxed', 'neutral',
                    'aa', 'ih', 'ou', 'ee', 'oh', 'a', 'i', 'u', 'e', 'o',
                    'blink', 'blinkLeft', 'blinkRight', 'lookUp', 'lookDown', 'lookLeft', 'lookRight'].includes(name.toLowerCase());
                
                blendShapes.push({
                    mesh: obj,
                    meshName: meshName,
                    morphName: name,
                    index: obj.morphTargetDictionary[name],
                    isBodyMorph: isBodyMorph
                });
            });
        }
    });
    
    if (blendShapes.length === 0) {
        listContainer.innerHTML = '<div style="text-align: center; padding: 20px; color: #888;">ブレンドシェイプがありません</div>';
        return;
    }
    
    console.log(`🎨 体型モーフ検出: ${blendShapes.length}個`);
    
    // メッシュごとにグループ化
    const meshGroups = {};
    blendShapes.forEach(bs => {
        if (!meshGroups[bs.meshName]) {
            meshGroups[bs.meshName] = [];
        }
        meshGroups[bs.meshName].push(bs);
    });
    
    let html = '';
    
    for (const [meshName, shapes] of Object.entries(meshGroups)) {
        html += `
            <div class="body-morph-category" style="margin-bottom: 16px;">
                <div style="
                    font-weight: bold;
                    color: #e65100;
                    margin-bottom: 8px;
                    font-size: 12px;
                    padding: 6px 10px;
                    background: #fff3e0;
                    border-radius: 6px;
                    cursor: pointer;
                " onclick="this.nextElementSibling.style.display = this.nextElementSibling.style.display === 'none' ? 'block' : 'none'">
                    📦 ${meshName} (${shapes.length}個) ▼
                </div>
                <div class="morph-items">
        `;
        
        shapes.forEach(bs => {
            const currentValue = bs.mesh.morphTargetInfluences[bs.index] || 0;
            const uniqueId = `body-morph-${bs.meshName}-${bs.index}`.replace(/\s/g, '_');
            
            html += `
                <div class="body-morph-row" data-mesh="${bs.meshName}" data-index="${bs.index}" style="
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    margin-bottom: 8px;
                    padding: 6px 8px;
                    background: ${bs.isBodyMorph ? '#e8f5e9' : '#f5f5f5'};
                    border-radius: 6px;
                    border-left: 3px solid ${bs.isBodyMorph ? '#4caf50' : '#9e9e9e'};
                ">
                    <label style="min-width: 120px; font-size: 10px; color: #333; word-break: break-all;">${bs.morphName}</label>
                    <input type="range" class="body-morph-slider" 
                        data-mesh-name="${bs.meshName}" 
                        data-morph-index="${bs.index}"
                        min="0" max="1" step="0.01" value="${currentValue}"
                        style="flex: 1; accent-color: #ff9800;">
                    <input type="number" class="body-morph-value" 
                        data-mesh-name="${bs.meshName}" 
                        data-morph-index="${bs.index}"
                        min="0" max="1" step="0.01" value="${currentValue.toFixed(2)}"
                        style="width: 50px; text-align: center; border: 1px solid #ddd; border-radius: 4px; padding: 4px; font-size: 10px;">
                </div>
            `;
        });
        
        html += '</div></div>';
    }
    
    listContainer.innerHTML = html;
    
    // スライダーイベント設定
    listContainer.querySelectorAll('.body-morph-slider').forEach(slider => {
        slider.addEventListener('input', (e) => {
            const meshName = e.target.dataset.meshName;
            const morphIndex = parseInt(e.target.dataset.morphIndex);
            const value = parseFloat(e.target.value);
            setBodyMorphValue(meshName, morphIndex, value);
            
            // 数値入力も更新
            const numInput = listContainer.querySelector(`.body-morph-value[data-mesh-name="${meshName}"][data-morph-index="${morphIndex}"]`);
            if (numInput) numInput.value = value.toFixed(2);
        });
    });
    
    // 数値入力イベント設定
    listContainer.querySelectorAll('.body-morph-value').forEach(input => {
        input.addEventListener('change', (e) => {
            const meshName = e.target.dataset.meshName;
            const morphIndex = parseInt(e.target.dataset.morphIndex);
            let value = parseFloat(e.target.value) || 0;
            value = Math.max(0, Math.min(1, value));
            e.target.value = value.toFixed(2);
            setBodyMorphValue(meshName, morphIndex, value);
            
            // スライダーも更新
            const slider = listContainer.querySelector(`.body-morph-slider[data-mesh-name="${meshName}"][data-morph-index="${morphIndex}"]`);
            if (slider) slider.value = value;
        });
    });
}

// 体型モーフ値設定
function setBodyMorphValue(meshName, morphIndex, value) {
    const vrm = window.selectedVRM;
    if (!vrm) return;
    
    // まず保存したメッシュ参照を試す
    if (window._bodyMorphMeshes && window._bodyMorphMeshes[meshName]) {
        const mesh = window._bodyMorphMeshes[meshName];
        if (mesh.morphTargetInfluences && morphIndex < mesh.morphTargetInfluences.length) {
            mesh.morphTargetInfluences[morphIndex] = value;
            console.log(`🎨 体型モーフ設定: ${meshName}[${morphIndex}] = ${value.toFixed(2)}`);
            return;
        }
    }
    
    // フォールバック：シーンをトラバース
    let found = false;
    vrm.scene.traverse((obj) => {
        if (found) return;
        if (obj.isMesh && obj.morphTargetInfluences) {
            const objName = obj.name || 'Mesh';
            if (objName === meshName && morphIndex < obj.morphTargetInfluences.length) {
                obj.morphTargetInfluences[morphIndex] = value;
                found = true;
                console.log(`🎨 体型モーフ設定(トラバース): ${meshName}[${morphIndex}] = ${value.toFixed(2)}`);
            }
        }
    });
    
    if (!found) {
        console.warn(`⚠️ モーフが見つかりません: ${meshName}[${morphIndex}]`);
    }
}

// ボーンノードを取得するヘルパー関数（用途によって異なるノードを返す）
function getBoneNode(vrm, boneName, forScale = false) {
    if (!vrm || !vrm.humanoid) return null;
    
    let bone = null;
    
    if (forScale) {
        // スケール変更にはRawBoneNodeを使用（VRM 1.0）
        if (typeof vrm.humanoid.getRawBoneNode === 'function') {
            try {
                bone = vrm.humanoid.getRawBoneNode(boneName);
            } catch (e) {}
        }
    }
    
    // 回転変更やフォールバックにはNormalizedBoneNodeを使用
    if (!bone && typeof vrm.humanoid.getNormalizedBoneNode === 'function') {
        try {
            bone = vrm.humanoid.getNormalizedBoneNode(boneName);
        } catch (e) {}
    }
    
    // まだなければRawBoneNodeを試す
    if (!bone && typeof vrm.humanoid.getRawBoneNode === 'function') {
        try {
            bone = vrm.humanoid.getRawBoneNode(boneName);
        } catch (e) {}
    }
    
    // VRM 0.x対応：humanBonesからボーンを取得
    if (!bone && vrm.humanoid.humanBones) {
        const humanBone = vrm.humanoid.humanBones[boneName];
        if (humanBone && humanBone.node) {
            bone = humanBone.node;
        }
    }
    
    return bone;
}

// ボーンリスト更新
function updateBoneList() {
    const listContainer = document.getElementById('bone-list');
    if (!listContainer) return;
    
    const vrm = window.selectedVRM;
    if (!vrm || !vrm.humanoid) {
        listContainer.innerHTML = '<div style="text-align: center; padding: 20px; color: #888;">ボーンデータがありません</div>';
        return;
    }
    
    console.log('🦴 ボーンリスト更新中...');
    
    // VRMのヒューマノイドボーン
    const humanoidBones = {
        '🦴 頭・首': ['head', 'neck'],
        '🦴 胴体': ['hips', 'spine', 'chest', 'upperChest'],
        '🦴 左腕': ['leftShoulder', 'leftUpperArm', 'leftLowerArm', 'leftHand'],
        '🦴 右腕': ['rightShoulder', 'rightUpperArm', 'rightLowerArm', 'rightHand'],
        '🦴 左脚': ['leftUpperLeg', 'leftLowerLeg', 'leftFoot', 'leftToes'],
        '🦴 右脚': ['rightUpperLeg', 'rightLowerLeg', 'rightFoot', 'rightToes'],
        '🦴 左指': ['leftThumbProximal', 'leftThumbIntermediate', 'leftThumbDistal',
                   'leftIndexProximal', 'leftIndexIntermediate', 'leftIndexDistal',
                   'leftMiddleProximal', 'leftMiddleIntermediate', 'leftMiddleDistal',
                   'leftRingProximal', 'leftRingIntermediate', 'leftRingDistal',
                   'leftLittleProximal', 'leftLittleIntermediate', 'leftLittleDistal'],
        '🦴 右指': ['rightThumbProximal', 'rightThumbIntermediate', 'rightThumbDistal',
                   'rightIndexProximal', 'rightIndexIntermediate', 'rightIndexDistal',
                   'rightMiddleProximal', 'rightMiddleIntermediate', 'rightMiddleDistal',
                   'rightRingProximal', 'rightRingIntermediate', 'rightRingDistal',
                   'rightLittleProximal', 'rightLittleIntermediate', 'rightLittleDistal']
    };
    
    let html = '';
    
    for (const [category, boneNames] of Object.entries(humanoidBones)) {
        const availableBones = boneNames.filter(name => {
            const bone = getBoneNode(vrm, name);
            return bone !== null;
        });
        
        if (availableBones.length === 0) continue;
        
        html += `
            <div class="bone-category" style="margin-bottom: 16px;">
                <div style="
                    font-weight: bold;
                    color: #e65100;
                    margin-bottom: 8px;
                    font-size: 12px;
                    padding: 6px 10px;
                    background: #fff3e0;
                    border-radius: 6px;
                    cursor: pointer;
                " onclick="this.nextElementSibling.style.display = this.nextElementSibling.style.display === 'none' ? 'block' : 'none'">
                    ${category} (${availableBones.length}個) ▼
                </div>
                <div class="bone-items">
        `;
        
        availableBones.forEach(boneName => {
            // スケール用のボーンと回転用のボーンを別々に取得
            const scaleBone = getBoneNode(vrm, boneName, true);   // RawBoneNodeを優先
            const rotBone = getBoneNode(vrm, boneName, false);    // NormalizedBoneNodeを優先
            
            if (!scaleBone && !rotBone) return;
            
            const displayName = getBoneDisplayName(boneName);
            const scale = (scaleBone && scaleBone.scale) ? scaleBone.scale.x : 1;
            
            // 回転値を取得（rotBoneがなければscaleBoneを使用）
            const rotationBone = rotBone || scaleBone;
            const rotX = rotationBone && rotationBone.rotation ? window.THREE.MathUtils.radToDeg(rotationBone.rotation.x) : 0;
            const rotY = rotationBone && rotationBone.rotation ? window.THREE.MathUtils.radToDeg(rotationBone.rotation.y) : 0;
            const rotZ = rotationBone && rotationBone.rotation ? window.THREE.MathUtils.radToDeg(rotationBone.rotation.z) : 0;
            
            html += `
                <div class="bone-row" data-bone="${boneName}" style="
                    margin-bottom: 12px;
                    padding: 10px;
                    background: #f5f5f5;
                    border-radius: 8px;
                    border-left: 3px solid #ff9800;
                ">
                    <div style="font-weight: bold; margin-bottom: 8px; color: #333; font-size: 11px;">${displayName}</div>
                    
                    <!-- スケール -->
                    <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 6px;">
                        <span style="min-width: 60px; font-size: 10px; color: #666;">📏 スケール:</span>
                        <input type="range" class="bone-scale-slider" data-bone="${boneName}"
                            min="0.1" max="3" step="0.01" value="${scale}"
                            style="flex: 1; accent-color: #ff9800;">
                        <input type="number" class="bone-scale-value" data-bone="${boneName}"
                            min="0.1" max="3" step="0.01" value="${scale.toFixed(2)}"
                            style="width: 50px; text-align: center; border: 1px solid #ddd; border-radius: 4px; padding: 4px; font-size: 10px;">
                    </div>
                    
                    <!-- X回転 -->
                    <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 4px;">
                        <span style="min-width: 60px; font-size: 10px; color: #f44336;">X回転:</span>
                        <input type="range" class="bone-rot-x-slider" data-bone="${boneName}"
                            min="-180" max="180" step="1" value="${rotX.toFixed(0)}"
                            style="flex: 1; accent-color: #f44336;">
                        <input type="number" class="bone-rot-x-value" data-bone="${boneName}"
                            min="-180" max="180" step="1" value="${rotX.toFixed(0)}"
                            style="width: 50px; text-align: center; border: 1px solid #ddd; border-radius: 4px; padding: 4px; font-size: 10px;">°
                    </div>
                    
                    <!-- Y回転 -->
                    <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 4px;">
                        <span style="min-width: 60px; font-size: 10px; color: #4caf50;">Y回転:</span>
                        <input type="range" class="bone-rot-y-slider" data-bone="${boneName}"
                            min="-180" max="180" step="1" value="${rotY.toFixed(0)}"
                            style="flex: 1; accent-color: #4caf50;">
                        <input type="number" class="bone-rot-y-value" data-bone="${boneName}"
                            min="-180" max="180" step="1" value="${rotY.toFixed(0)}"
                            style="width: 50px; text-align: center; border: 1px solid #ddd; border-radius: 4px; padding: 4px; font-size: 10px;">°
                    </div>
                    
                    <!-- Z回転 -->
                    <div style="display: flex; align-items: center; gap: 6px;">
                        <span style="min-width: 60px; font-size: 10px; color: #2196f3;">Z回転:</span>
                        <input type="range" class="bone-rot-z-slider" data-bone="${boneName}"
                            min="-180" max="180" step="1" value="${rotZ.toFixed(0)}"
                            style="flex: 1; accent-color: #2196f3;">
                        <input type="number" class="bone-rot-z-value" data-bone="${boneName}"
                            min="-180" max="180" step="1" value="${rotZ.toFixed(0)}"
                            style="width: 50px; text-align: center; border: 1px solid #ddd; border-radius: 4px; padding: 4px; font-size: 10px;">°
                    </div>
                </div>
            `;
        });
        
        html += '</div></div>';
    }
    
    if (!html) {
        listContainer.innerHTML = '<div style="text-align: center; padding: 20px; color: #888;">利用可能なボーンがありません</div>';
        return;
    }
    
    listContainer.innerHTML = html;
    
    // スケールスライダーイベント
    listContainer.querySelectorAll('.bone-scale-slider').forEach(slider => {
        slider.addEventListener('input', (e) => {
            const boneName = e.target.dataset.bone;
            const value = parseFloat(e.target.value);
            setBoneScale(boneName, value);
            
            const numInput = listContainer.querySelector(`.bone-scale-value[data-bone="${boneName}"]`);
            if (numInput) numInput.value = value.toFixed(2);
        });
    });
    
    listContainer.querySelectorAll('.bone-scale-value').forEach(input => {
        input.addEventListener('change', (e) => {
            const boneName = e.target.dataset.bone;
            let value = parseFloat(e.target.value) || 1;
            value = Math.max(0.1, Math.min(3, value));
            e.target.value = value.toFixed(2);
            setBoneScale(boneName, value);
            
            const slider = listContainer.querySelector(`.bone-scale-slider[data-bone="${boneName}"]`);
            if (slider) slider.value = value;
        });
    });
    
    // X回転スライダーイベント
    ['x', 'y', 'z'].forEach(axis => {
        listContainer.querySelectorAll(`.bone-rot-${axis}-slider`).forEach(slider => {
            slider.addEventListener('input', (e) => {
                const boneName = e.target.dataset.bone;
                const value = parseFloat(e.target.value);
                setBoneRotation(boneName, axis, value);
                
                const numInput = listContainer.querySelector(`.bone-rot-${axis}-value[data-bone="${boneName}"]`);
                if (numInput) numInput.value = value.toFixed(0);
            });
        });
        
        listContainer.querySelectorAll(`.bone-rot-${axis}-value`).forEach(input => {
            input.addEventListener('change', (e) => {
                const boneName = e.target.dataset.bone;
                let value = parseFloat(e.target.value) || 0;
                value = Math.max(-180, Math.min(180, value));
                e.target.value = value.toFixed(0);
                setBoneRotation(boneName, axis, value);
                
                const slider = listContainer.querySelector(`.bone-rot-${axis}-slider[data-bone="${boneName}"]`);
                if (slider) slider.value = value;
            });
        });
    });
}

// ボーン表示名取得
function getBoneDisplayName(name) {
    const displayNames = {
        'hips': '腰',
        'spine': '背骨',
        'chest': '胸',
        'upperChest': '上胸',
        'neck': '首',
        'head': '頭',
        'leftShoulder': '左肩',
        'leftUpperArm': '左上腕',
        'leftLowerArm': '左前腕',
        'leftHand': '左手',
        'rightShoulder': '右肩',
        'rightUpperArm': '右上腕',
        'rightLowerArm': '右前腕',
        'rightHand': '右手',
        'leftUpperLeg': '左太もも',
        'leftLowerLeg': '左すね',
        'leftFoot': '左足',
        'leftToes': '左つま先',
        'rightUpperLeg': '右太もも',
        'rightLowerLeg': '右すね',
        'rightFoot': '右足',
        'rightToes': '右つま先',
        'leftThumbProximal': '左親指(根元)',
        'leftThumbIntermediate': '左親指(中間)',
        'leftThumbDistal': '左親指(先端)',
        'leftIndexProximal': '左人差し指(根元)',
        'leftIndexIntermediate': '左人差し指(中間)',
        'leftIndexDistal': '左人差し指(先端)',
        'leftMiddleProximal': '左中指(根元)',
        'leftMiddleIntermediate': '左中指(中間)',
        'leftMiddleDistal': '左中指(先端)',
        'leftRingProximal': '左薬指(根元)',
        'leftRingIntermediate': '左薬指(中間)',
        'leftRingDistal': '左薬指(先端)',
        'leftLittleProximal': '左小指(根元)',
        'leftLittleIntermediate': '左小指(中間)',
        'leftLittleDistal': '左小指(先端)',
        'rightThumbProximal': '右親指(根元)',
        'rightThumbIntermediate': '右親指(中間)',
        'rightThumbDistal': '右親指(先端)',
        'rightIndexProximal': '右人差し指(根元)',
        'rightIndexIntermediate': '右人差し指(中間)',
        'rightIndexDistal': '右人差し指(先端)',
        'rightMiddleProximal': '右中指(根元)',
        'rightMiddleIntermediate': '右中指(中間)',
        'rightMiddleDistal': '右中指(先端)',
        'rightRingProximal': '右薬指(根元)',
        'rightRingIntermediate': '右薬指(中間)',
        'rightRingDistal': '右薬指(先端)',
        'rightLittleProximal': '右小指(根元)',
        'rightLittleIntermediate': '右小指(中間)',
        'rightLittleDistal': '右小指(先端)'
    };
    return displayNames[name] || name;
}

// ボーンスケール設定
function setBoneScale(boneName, scale) {
    const vrm = window.selectedVRM;
    if (!vrm || !vrm.humanoid) return;
    
    try {
        // スケール変更にはRawBoneNodeを使用
        const bone = getBoneNode(vrm, boneName, true);
        
        if (bone && bone.scale) {
            bone.scale.setScalar(scale);
            console.log(`🦴 ボーンスケール: ${boneName} = ${scale.toFixed(2)}`);
        } else {
            console.warn(`⚠️ スケール用ボーンが見つかりません: ${boneName}`);
        }
    } catch (e) {
        console.warn('ボーンスケール設定エラー:', boneName, e);
    }
}

// ボーン回転設定
function setBoneRotation(boneName, axis, degrees) {
    const vrm = window.selectedVRM;
    if (!vrm || !vrm.humanoid) return;
    
    try {
        // 回転変更にはNormalizedBoneNodeを優先使用
        const bone = getBoneNode(vrm, boneName, false);
        
        if (bone && bone.rotation) {
            const radians = window.THREE.MathUtils.degToRad(degrees);
            
            // rotation orderを確認して適切に設定
            if (bone.rotation.order !== 'XYZ') {
                bone.rotation.order = 'XYZ';
            }
            
            // 軸に応じて回転を設定
            bone.rotation[axis] = radians;
            
            // matrixの更新を強制
            bone.updateMatrix();
            bone.updateMatrixWorld(true);
            
            console.log(`🦴 ボーン回転: ${boneName}.${axis} = ${degrees}° (rad: ${radians.toFixed(3)})`);
        } else {
            console.warn(`⚠️ 回転用ボーンが見つかりません: ${boneName}`);
        }
    } catch (e) {
        console.warn('ボーン回転設定エラー:', boneName, axis, e);
    }
}

// 全リセット
function resetAllBodyMorphAndBones() {
    const vrm = window.selectedVRM;
    if (!vrm) return;
    
    // 体型モーフリセット
    vrm.scene.traverse((obj) => {
        if (obj.isMesh && obj.morphTargetInfluences) {
            for (let i = 0; i < obj.morphTargetInfluences.length; i++) {
                obj.morphTargetInfluences[i] = 0;
            }
        }
    });
    
    // ボーンリセット
    if (vrm.humanoid) {
        const boneNames = ['hips', 'spine', 'chest', 'upperChest', 'neck', 'head',
            'leftShoulder', 'leftUpperArm', 'leftLowerArm', 'leftHand',
            'rightShoulder', 'rightUpperArm', 'rightLowerArm', 'rightHand',
            'leftUpperLeg', 'leftLowerLeg', 'leftFoot', 'leftToes',
            'rightUpperLeg', 'rightLowerLeg', 'rightFoot', 'rightToes'];
        
        boneNames.forEach(name => {
            try {
                const bone = vrm.humanoid.getNormalizedBoneNode(name);
                if (bone) {
                    bone.scale.setScalar(1);
                    bone.rotation.set(0, 0, 0);
                }
            } catch (e) {}
        });
    }
    
    // UI更新
    updateBodyMorphList();
    updateBoneList();
    
    console.log('🔄 体型モーフ＆ボーン全リセット');
}

// 検索フィルター
function filterBodyList() {
    const searchText = document.getElementById('body-search').value.toLowerCase();
    
    // 体型モーフ
    document.querySelectorAll('.body-morph-row').forEach(row => {
        const label = row.querySelector('label').textContent.toLowerCase();
        row.style.display = label.includes(searchText) ? 'flex' : 'none';
    });
    
    // ボーン
    document.querySelectorAll('.bone-row').forEach(row => {
        const boneName = row.dataset.bone.toLowerCase();
        const label = row.querySelector('div').textContent.toLowerCase();
        row.style.display = (boneName.includes(searchText) || label.includes(searchText)) ? 'block' : 'none';
    });
}

// ========================================
// サイズ調整パネル（既存）
// ========================================
function createSizePanelElement() {
    sizePanel = document.createElement('div');
    sizePanel.id = 'size-panel';
    sizePanel.style.cssText = `
        display: none;
        position: fixed;
        background: rgba(255, 255, 255, 0.98);
        border-radius: 10px;
        box-shadow: 0 4px 20px rgba(0,0,0,0.3);
        z-index: 10002;
        width: 280px;
        font-family: 'Segoe UI', sans-serif;
        font-size: 11px;
    `;
    sizePanel.innerHTML = `
        <div style="padding: 10px; border-bottom: 2px solid #667eea;">
            <div style="display: flex; justify-content: space-between; align-items: center;">
                <span style="font-weight: bold; font-size: 12px;">📏 モデル設定</span>
                <button id="size-panel-close" style="
                    background: none;
                    border: none;
                    font-size: 16px;
                    cursor: pointer;
                    padding: 0;
                    line-height: 1;
                ">✕</button>
            </div>
            <div id="size-target-name" style="font-size: 10px; color: #666; margin-top: 4px;"></div>
            <div id="size-target-type" style="font-size: 9px; color: #999; margin-top: 2px;"></div>
        </div>
        <div style="padding: 12px;">
            <!-- サイズ調整 -->
            <div style="margin-bottom: 12px;">
                <div style="font-weight: bold; margin-bottom: 6px; color: #333;">📏 サイズ</div>
                <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                    <span>スケール:</span>
                    <span><input type="number" id="size-value-input" value="1.0" step="0.1" min="0.1" max="10" style="width: 50px; text-align: right; border: 1px solid #ddd; border-radius: 4px; padding: 2px 4px; font-size: 11px;">x</span>
                </div>
                <input type="range" id="size-slider" min="0.1" max="5" step="0.05" value="1" style="width: 100%;">
                <div style="display: flex; gap: 4px; flex-wrap: wrap; margin-top: 6px;">
                    <button class="size-preset" data-scale="0.1" style="flex: 1; padding: 4px 8px; border: 1px solid #ddd; border-radius: 4px; background: #f5f5f5; cursor: pointer; font-size: 10px;">0.1x</button>
                    <button class="size-preset" data-scale="0.5" style="flex: 1; padding: 4px 8px; border: 1px solid #ddd; border-radius: 4px; background: #f5f5f5; cursor: pointer; font-size: 10px;">0.5x</button>
                    <button class="size-preset" data-scale="1" style="flex: 1; padding: 4px 8px; border: 1px solid #ddd; border-radius: 4px; background: #f5f5f5; cursor: pointer; font-size: 10px;">1x</button>
                    <button class="size-preset" data-scale="2" style="flex: 1; padding: 4px 8px; border: 1px solid #ddd; border-radius: 4px; background: #f5f5f5; cursor: pointer; font-size: 10px;">2x</button>
                    <button class="size-preset" data-scale="5" style="flex: 1; padding: 4px 8px; border: 1px solid #ddd; border-radius: 4px; background: #f5f5f5; cursor: pointer; font-size: 10px;">5x</button>
                </div>
            </div>
            
            <!-- 位置調整（方向パッド） -->
            <div style="border-top: 1px solid #eee; padding-top: 12px;">
                <div style="font-weight: bold; margin-bottom: 8px; color: #333;">📍 位置移動（押し続けで移動）</div>
                
                <!-- 現在位置表示 -->
                <div id="pos-display" style="font-size: 10px; color: #666; margin-bottom: 8px; text-align: center;">X: 0.00 / Y: 0.00 / Z: 0.00</div>
                
                <!-- 方向パッドUI -->
                <div style="display: flex; gap: 10px; justify-content: center; align-items: flex-start;">
                    <!-- 左右・奥行き（XZ平面） -->
                    <div style="display: flex; flex-direction: column; align-items: center;">
                        <div style="font-size: 9px; color: #999; margin-bottom: 4px;">左右・前後</div>
                        <div style="display: grid; grid-template-columns: 40px 40px 40px; grid-template-rows: 40px 40px 40px; gap: 2px;">
                            <div></div>
                            <button class="move-btn" data-axis="z" data-dir="-1" style="background: #4CAF50; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 16px; display: flex; align-items: center; justify-content: center;">↑</button>
                            <div></div>
                            <button class="move-btn" data-axis="x" data-dir="-1" style="background: #f44336; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 16px; display: flex; align-items: center; justify-content: center;">←</button>
                            <button id="pos-center-btn" style="background: #9E9E9E; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 10px;">中央</button>
                            <button class="move-btn" data-axis="x" data-dir="1" style="background: #f44336; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 16px; display: flex; align-items: center; justify-content: center;">→</button>
                            <div></div>
                            <button class="move-btn" data-axis="z" data-dir="1" style="background: #4CAF50; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 16px; display: flex; align-items: center; justify-content: center;">↓</button>
                            <div></div>
                        </div>
                    </div>
                    
                    <!-- 上下（Y軸） -->
                    <div style="display: flex; flex-direction: column; align-items: center;">
                        <div style="font-size: 9px; color: #999; margin-bottom: 4px;">高さ</div>
                        <div style="display: flex; flex-direction: column; gap: 2px;">
                            <button class="move-btn" data-axis="y" data-dir="1" style="width: 40px; height: 50px; background: #2196F3; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 16px;">▲</button>
                            <button class="move-btn" data-axis="y" data-dir="-1" style="width: 40px; height: 50px; background: #2196F3; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 16px;">▼</button>
                        </div>
                    </div>
                </div>
                
                <!-- 移動速度 -->
                <div style="margin-top: 10px;">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <span style="font-size: 10px; color: #666;">移動速度:</span>
                        <select id="move-speed" style="border: 1px solid #ddd; border-radius: 4px; padding: 2px 4px; font-size: 10px;">
                            <option value="0.05">遅い</option>
                            <option value="0.15" selected>普通</option>
                            <option value="0.4">速い</option>
                            <option value="1.0">超速</option>
                        </select>
                    </div>
                </div>
                
                <!-- 回転調整 -->
                <div style="margin-top: 12px; border-top: 1px solid #eee; padding-top: 10px;">
                    <div style="font-weight: bold; margin-bottom: 6px; color: #333;">🔄 回転</div>
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                        <span style="font-size: 10px;">Y軸回転:</span>
                        <span><input type="number" id="rotation-y-input" value="0" step="15" style="width: 50px; text-align: right; border: 1px solid #ddd; border-radius: 4px; padding: 2px 4px; font-size: 11px;">°</span>
                    </div>
                    <input type="range" id="rotation-y-slider" min="-180" max="180" step="5" value="0" style="width: 100%;">
                    <div style="display: flex; gap: 4px; margin-top: 6px;">
                        <button class="rotation-preset" data-rotation="0" style="flex: 1; padding: 4px 8px; border: 1px solid #ddd; border-radius: 4px; background: #f5f5f5; cursor: pointer; font-size: 10px;">0°</button>
                        <button class="rotation-preset" data-rotation="90" style="flex: 1; padding: 4px 8px; border: 1px solid #ddd; border-radius: 4px; background: #f5f5f5; cursor: pointer; font-size: 10px;">90°</button>
                        <button class="rotation-preset" data-rotation="180" style="flex: 1; padding: 4px 8px; border: 1px solid #ddd; border-radius: 4px; background: #f5f5f5; cursor: pointer; font-size: 10px;">180°</button>
                        <button class="rotation-preset" data-rotation="-90" style="flex: 1; padding: 4px 8px; border: 1px solid #ddd; border-radius: 4px; background: #f5f5f5; cursor: pointer; font-size: 10px;">-90°</button>
                    </div>
                </div>
                
                <!-- 落下ボタン（物理オブジェクトのみ） -->
                <button id="pos-drop-btn" style="width: 100%; margin-top: 8px; padding: 6px; border: 1px solid #ddd; border-radius: 4px; background: #e3f2fd; cursor: pointer; font-size: 10px; display: none;">⬇️ 上空から落下させる</button>
            </div>
            
            <!-- 当たり判定調整（物理オブジェクトのみ） -->
            <div id="collider-section" style="border-top: 1px solid #eee; padding-top: 12px; margin-top: 12px; display: none;">
                <div style="font-weight: bold; margin-bottom: 8px; color: #333;">🟢 当たり判定（物理ボディ）</div>
                <div id="collider-info" style="font-size: 10px; color: #666; margin-bottom: 8px;">タイプ: ---</div>
                
                <!-- サイズ調整 -->
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                    <span style="font-size: 10px;">コライダーサイズ:</span>
                    <span><input type="number" id="collider-scale-input" value="1.0" step="0.1" min="0.1" max="5" style="width: 50px; text-align: right; border: 1px solid #ddd; border-radius: 4px; padding: 2px 4px; font-size: 11px;">x</span>
                </div>
                <input type="range" id="collider-slider" min="0.1" max="3" step="0.05" value="1" style="width: 100%;">
                
                <!-- Yオフセット（地面からの浮き） -->
                <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 8px; margin-bottom: 6px;">
                    <span style="font-size: 10px;">Yオフセット（浮かす）:</span>
                    <span><input type="number" id="collider-offset-input" value="0" step="0.1" min="-2" max="5" style="width: 50px; text-align: right; border: 1px solid #ddd; border-radius: 4px; padding: 2px 4px; font-size: 11px;">m</span>
                </div>
                <input type="range" id="collider-offset-slider" min="-1" max="3" step="0.05" value="0" style="width: 100%;">
                
                <!-- プリセット -->
                <div style="display: flex; gap: 4px; margin-top: 8px;">
                    <button id="collider-auto-btn" style="flex: 1; padding: 4px 8px; border: 1px solid #ddd; border-radius: 4px; background: #e8f5e9; cursor: pointer; font-size: 10px;">🎯 自動調整</button>
                    <button id="collider-reset-btn" style="flex: 1; padding: 4px 8px; border: 1px solid #ddd; border-radius: 4px; background: #fff3e0; cursor: pointer; font-size: 10px;">🔄 リセット</button>
                </div>
                
                <!-- デバッグ表示トグル -->
                <div style="margin-top: 8px;">
                    <label style="font-size: 10px; display: flex; align-items: center; gap: 4px; cursor: pointer;">
                        <input type="checkbox" id="show-collider-debug">
                        <span>👁️ 当たり判定を表示</span>
                    </label>
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(sizePanel);
    
    // イベント設定
    setupSizePanelEvents();
}

// サイズパネルイベント設定
function setupSizePanelEvents() {
    document.getElementById('size-panel-close').addEventListener('click', hideSizePanel);
    
    const slider = document.getElementById('size-slider');
    const valueInput = document.getElementById('size-value-input');
    
    slider.addEventListener('input', () => {
        valueInput.value = parseFloat(slider.value).toFixed(2);
        applyScale(parseFloat(slider.value));
    });
    
    valueInput.addEventListener('change', () => {
        const val = Math.max(0.1, Math.min(10, parseFloat(valueInput.value) || 1));
        valueInput.value = val.toFixed(2);
        slider.value = Math.min(5, val);
        applyScale(val);
    });
    
    sizePanel.querySelectorAll('.size-preset').forEach(btn => {
        btn.addEventListener('click', () => {
            const scale = parseFloat(btn.dataset.scale);
            slider.value = scale;
            valueInput.value = scale.toFixed(2);
            applyScale(scale);
        });
    });
    
    // 回転スライダー
    const rotationSlider = document.getElementById('rotation-y-slider');
    const rotationInput = document.getElementById('rotation-y-input');
    
    rotationSlider.addEventListener('input', () => {
        rotationInput.value = rotationSlider.value;
        applyRotationY(parseFloat(rotationSlider.value));
    });
    
    rotationInput.addEventListener('change', () => {
        let val = parseFloat(rotationInput.value) || 0;
        val = Math.max(-180, Math.min(180, val));
        rotationInput.value = val;
        rotationSlider.value = val;
        applyRotationY(val);
    });
    
    sizePanel.querySelectorAll('.rotation-preset').forEach(btn => {
        btn.addEventListener('click', () => {
            const rotation = parseFloat(btn.dataset.rotation);
            rotationSlider.value = rotation;
            rotationInput.value = rotation;
            applyRotationY(rotation);
        });
    });
    
    // 方向ボタンの押し続け移動
    let moveInterval = null;
    
    sizePanel.querySelectorAll('.move-btn').forEach(btn => {
        const startMove = () => {
            const axis = btn.dataset.axis;
            const dir = parseFloat(btn.dataset.dir);
            
            // 即座に1回移動
            moveObject(axis, dir);
            
            // 押し続けで連続移動
            moveInterval = setInterval(() => {
                moveObject(axis, dir);
            }, 50); // 50msごと
            
            btn.style.transform = 'scale(0.95)';
            btn.style.filter = 'brightness(0.8)';
        };
        
        const stopMove = () => {
            if (moveInterval) {
                clearInterval(moveInterval);
                moveInterval = null;
            }
            btn.style.transform = '';
            btn.style.filter = '';
        };
        
        // マウス
        btn.addEventListener('mousedown', startMove);
        btn.addEventListener('mouseup', stopMove);
        btn.addEventListener('mouseleave', stopMove);
        
        // タッチ
        btn.addEventListener('touchstart', (e) => {
            e.preventDefault();
            startMove();
        });
        btn.addEventListener('touchend', stopMove);
        btn.addEventListener('touchcancel', stopMove);
    });
    
    // 落下ボタン
    document.getElementById('pos-drop-btn').addEventListener('click', () => {
        const obj = window.selectedPhysicsObject;
        if (!obj) return;
        
        const x = obj.mesh.position.x;
        const z = obj.mesh.position.z;
        
        obj.mesh.position.set(x, 5, z);
        if (obj.body) {
            obj.body.position.set(x, 5, z);
            obj.body.velocity.set(0, 0, 0);
            obj.body.angularVelocity.set(0, 0, 0);
        }
        
        updatePositionDisplay();
        console.log('⬇️ 落下開始');
    });
    
    // 中央ボタン
    document.getElementById('pos-center-btn').addEventListener('click', () => {
        const target = getSelectedTarget();
        if (!target) return;
        
        const y = target.mesh.position.y;
        target.mesh.position.set(0, y, 0);
        
        if (target.body) {
            target.body.position.set(0, y, 0);
            target.body.velocity.set(0, 0, 0);
        }
        
        updatePositionDisplay();
        console.log('🎯 中央に移動');
    });
    
    // コライダー調整イベント
    setupColliderEvents();
}

// コライダーイベント設定
function setupColliderEvents() {
    const colliderSlider = document.getElementById('collider-slider');
    const colliderInput = document.getElementById('collider-scale-input');
    const colliderOffsetSlider = document.getElementById('collider-offset-slider');
    const colliderOffsetInput = document.getElementById('collider-offset-input');
    
    // コライダーサイズスライダー
    colliderSlider.addEventListener('input', () => {
        colliderInput.value = parseFloat(colliderSlider.value).toFixed(2);
        applyColliderScale(parseFloat(colliderSlider.value));
    });
    
    colliderInput.addEventListener('change', () => {
        const val = Math.max(0.1, Math.min(5, parseFloat(colliderInput.value) || 1));
        colliderInput.value = val.toFixed(2);
        colliderSlider.value = Math.min(3, val);
        applyColliderScale(val);
    });
    
    // Yオフセットスライダー
    colliderOffsetSlider.addEventListener('input', () => {
        colliderOffsetInput.value = parseFloat(colliderOffsetSlider.value).toFixed(2);
        applyColliderOffset(parseFloat(colliderOffsetSlider.value));
    });
    
    colliderOffsetInput.addEventListener('change', () => {
        const val = Math.max(-2, Math.min(5, parseFloat(colliderOffsetInput.value) || 0));
        colliderOffsetInput.value = val.toFixed(2);
        colliderOffsetSlider.value = Math.max(-1, Math.min(3, val));
        applyColliderOffset(val);
    });
    
    // 自動調整ボタン
    document.getElementById('collider-auto-btn').addEventListener('click', () => {
        autoAdjustCollider();
    });
    
    // リセットボタン
    document.getElementById('collider-reset-btn').addEventListener('click', () => {
        resetCollider();
    });
    
    // デバッグ表示トグル
    document.getElementById('show-collider-debug').addEventListener('change', (e) => {
        toggleColliderDebug(e.target.checked);
    });
}

// 選択中のターゲット（VRMまたは物理オブジェクト）を取得
function getSelectedTarget() {
    if (window.selectedVRM) {
        return { 
            mesh: window.selectedVRM.scene, 
            type: 'vrm',
            vrm: window.selectedVRM
        };
    } else if (window.selectedPhysicsObject) {
        return { 
            mesh: window.selectedPhysicsObject.mesh, 
            body: window.selectedPhysicsObject.body,
            type: 'physics',
            obj: window.selectedPhysicsObject
        };
    }
    return null;
}

// オブジェクト移動
function moveObject(axis, dir) {
    const target = getSelectedTarget();
    if (!target) return;
    
    const speed = parseFloat(document.getElementById('move-speed').value) || 0.15;
    const delta = dir * speed;
    
    // 現在位置取得
    const pos = target.mesh.position.clone();
    
    // 軸に応じて移動
    if (axis === 'x') pos.x += delta;
    else if (axis === 'y') pos.y += delta;
    else if (axis === 'z') pos.z += delta;
    
    // Yは床より下に行かない（VRMは0が基準）
    if (target.type === 'vrm') {
        if (pos.y < 0) pos.y = 0;
    }
    
    // 適用
    target.mesh.position.copy(pos);
    
    if (target.body) {
        target.body.position.set(pos.x, pos.y, pos.z);
        target.body.velocity.set(0, 0, 0);
        target.body.angularVelocity.set(0, 0, 0);
    }
    
    updatePositionDisplay();
}

// Y軸回転適用
function applyRotationY(degrees) {
    const target = getSelectedTarget();
    if (!target) return;
    
    const radians = degrees * Math.PI / 180;
    target.mesh.rotation.y = radians;
    
    if (target.body) {
        const quat = new window.THREE.Quaternion();
        quat.setFromEuler(new window.THREE.Euler(0, radians, 0));
        target.body.quaternion.set(quat.x, quat.y, quat.z, quat.w);
    }
    
    console.log(`🔄 Y軸回転: ${degrees}°`);
}

// 位置表示更新
function updatePositionDisplay() {
    const target = getSelectedTarget();
    if (!target) return;
    
    const display = document.getElementById('pos-display');
    if (display) {
        const p = target.mesh.position;
        display.textContent = `X: ${p.x.toFixed(2)} / Y: ${p.y.toFixed(2)} / Z: ${p.z.toFixed(2)}`;
    }
}

// スケール適用
function applyScale(scale) {
    const target = getSelectedTarget();
    if (!target) return;
    
    if (target.type === 'vrm') {
        // VRMモデルのスケール
        const baseScale = window.vrmBaseScale || 1;
        const newScale = baseScale * scale;
        target.mesh.scale.setScalar(newScale);
        console.log(`📏 VRMスケール: ${scale.toFixed(2)}x (実際: ${newScale.toFixed(2)})`);
    } else {
        // 物理オブジェクトのスケール
        const obj = target.obj;
        const baseScale = obj.baseScale || 1;
        const newScale = baseScale * scale;
        
        obj.mesh.scale.setScalar(newScale);
        
        if (obj.body) {
            const baseMass = obj.baseMass || obj.body.mass;
            if (!obj.baseMass) obj.baseMass = baseMass;
            obj.body.mass = baseMass * scale * scale * scale;
            obj.body.updateMassProperties();
        }
        
        console.log(`📏 オブジェクトスケール: ${scale.toFixed(2)}x`);
    }
}

// ========================================
// コライダー（当たり判定）関連関数
// ========================================

// コライダー情報更新
function updateColliderInfo() {
    const obj = window.selectedPhysicsObject;
    if (!obj || !obj.body) {
        document.getElementById('collider-info').textContent = 'タイプ: 物理ボディなし';
        return;
    }
    
    const body = obj.body;
    const shape = body.shapes[0];
    let info = 'タイプ: ';
    
    if (shape) {
        const type = shape.type;
        if (type === 1) info += 'Sphere (球)';
        else if (type === 2) info += 'Plane (平面)';
        else if (type === 4) info += 'Box (箱)';
        else if (type === 16) info += 'ConvexPolyhedron (メッシュ)';
        else info += `不明(${type})`;
        
        if (shape.radius) {
            info += ` / 半径: ${shape.radius.toFixed(2)}m`;
        }
        if (shape.halfExtents) {
            const h = shape.halfExtents;
            info += ` / サイズ: ${(h.x*2).toFixed(2)}x${(h.y*2).toFixed(2)}x${(h.z*2).toFixed(2)}`;
        }
    }
    
    document.getElementById('collider-info').textContent = info;
    
    const currentScale = obj.colliderScale || 1;
    document.getElementById('collider-slider').value = Math.min(3, currentScale);
    document.getElementById('collider-scale-input').value = currentScale.toFixed(2);
    
    const currentOffset = obj.colliderYOffset || 0;
    document.getElementById('collider-offset-slider').value = Math.max(-1, Math.min(3, currentOffset));
    document.getElementById('collider-offset-input').value = currentOffset.toFixed(2);
}

// コライダーサイズ適用
function applyColliderScale(scale) {
    const obj = window.selectedPhysicsObject;
    if (!obj || !obj.body) return;
    
    const body = obj.body;
    const shape = body.shapes[0];
    if (!shape) return;
    
    if (!obj.baseColliderSize) {
        if (shape.radius) {
            obj.baseColliderSize = { type: 'sphere', radius: shape.radius };
        } else if (shape.halfExtents) {
            obj.baseColliderSize = { 
                type: 'box', 
                halfExtents: { 
                    x: shape.halfExtents.x, 
                    y: shape.halfExtents.y, 
                    z: shape.halfExtents.z 
                } 
            };
        }
    }
    
    if (obj.baseColliderSize) {
        if (obj.baseColliderSize.type === 'sphere') {
            shape.radius = obj.baseColliderSize.radius * scale;
            shape.updateBoundingSphereRadius();
        } else if (obj.baseColliderSize.type === 'box') {
            shape.halfExtents.x = obj.baseColliderSize.halfExtents.x * scale;
            shape.halfExtents.y = obj.baseColliderSize.halfExtents.y * scale;
            shape.halfExtents.z = obj.baseColliderSize.halfExtents.z * scale;
            shape.updateConvexPolyhedronRepresentation();
            shape.updateBoundingSphereRadius();
        }
    }
    
    obj.colliderScale = scale;
    body.updateBoundingRadius();
    body.updateMassProperties();
    
    updateColliderInfo();
    updateDebugMesh();
    console.log(`🟢 コライダーサイズ: ${scale.toFixed(2)}x`);
}

// Yオフセット適用
function applyColliderOffset(offset) {
    const obj = window.selectedPhysicsObject;
    if (!obj) return;
    
    obj.colliderYOffset = offset;
    console.log(`🟢 Yオフセット: ${offset.toFixed(2)}m`);
    updateDebugMesh();
}

// 自動調整
function autoAdjustCollider() {
    const obj = window.selectedPhysicsObject;
    if (!obj || !obj.mesh) return;
    
    const THREE = window.THREE;
    const box = new THREE.Box3().setFromObject(obj.mesh);
    const size = new THREE.Vector3();
    box.getSize(size);
    const center = new THREE.Vector3();
    box.getCenter(center);
    
    if (obj.body && obj.body.shapes[0]) {
        const shape = obj.body.shapes[0];
        let currentSize = 1;
        if (shape.radius) {
            currentSize = shape.radius * 2;
        } else if (shape.halfExtents) {
            currentSize = Math.max(shape.halfExtents.x, shape.halfExtents.y, shape.halfExtents.z) * 2;
        }
        
        const meshMaxSize = Math.max(size.x, size.y, size.z);
        const newScale = meshMaxSize / currentSize * (obj.colliderScale || 1);
        const yOffset = -box.min.y + (obj.mesh.position.y - center.y);
        
        document.getElementById('collider-slider').value = Math.min(3, newScale);
        document.getElementById('collider-scale-input').value = newScale.toFixed(2);
        applyColliderScale(newScale);
        
        document.getElementById('collider-offset-slider').value = Math.max(-1, Math.min(3, yOffset));
        document.getElementById('collider-offset-input').value = yOffset.toFixed(2);
        applyColliderOffset(yOffset);
        
        console.log('🎯 自動調整完了');
    }
}

// リセット
function resetCollider() {
    document.getElementById('collider-slider').value = 1;
    document.getElementById('collider-scale-input').value = '1.00';
    applyColliderScale(1);
    
    document.getElementById('collider-offset-slider').value = 0;
    document.getElementById('collider-offset-input').value = '0.00';
    applyColliderOffset(0);
    
    console.log('🔄 コライダーリセット');
}

// デバッグ表示トグル
function toggleColliderDebug(show) {
    const obj = window.selectedPhysicsObject;
    if (!obj) return;
    
    if (show) {
        createDebugMesh(obj);
    } else {
        removeDebugMesh(obj);
    }
}

// デバッグメッシュ作成
function createDebugMesh(obj) {
    if (!obj || !obj.body) return;
    
    const THREE = window.THREE;
    const shape = obj.body.shapes[0];
    if (!shape) return;
    
    removeDebugMesh(obj);
    
    let geometry;
    if (shape.radius) {
        geometry = new THREE.SphereGeometry(shape.radius, 16, 16);
    } else if (shape.halfExtents) {
        geometry = new THREE.BoxGeometry(
            shape.halfExtents.x * 2,
            shape.halfExtents.y * 2,
            shape.halfExtents.z * 2
        );
    } else {
        return;
    }
    
    const material = new THREE.MeshBasicMaterial({
        color: 0x00ff00,
        wireframe: true,
        transparent: true,
        opacity: 0.5
    });
    
    obj.debugMesh = new THREE.Mesh(geometry, material);
    window.app.scene.add(obj.debugMesh);
    
    updateDebugMesh();
}

// デバッグメッシュ削除
function removeDebugMesh(obj) {
    if (obj && obj.debugMesh) {
        window.app.scene.remove(obj.debugMesh);
        obj.debugMesh.geometry.dispose();
        obj.debugMesh.material.dispose();
        obj.debugMesh = null;
    }
}

// デバッグメッシュ更新
function updateDebugMesh() {
    const obj = window.selectedPhysicsObject;
    if (!obj || !obj.debugMesh || !obj.body) return;
    
    const THREE = window.THREE;
    const shape = obj.body.shapes[0];
    
    obj.debugMesh.geometry.dispose();
    if (shape.radius) {
        obj.debugMesh.geometry = new THREE.SphereGeometry(shape.radius, 16, 16);
    } else if (shape.halfExtents) {
        obj.debugMesh.geometry = new THREE.BoxGeometry(
            shape.halfExtents.x * 2,
            shape.halfExtents.y * 2,
            shape.halfExtents.z * 2
        );
    }
    
    const offset = obj.colliderYOffset || 0;
    obj.debugMesh.position.copy(obj.mesh.position);
    obj.debugMesh.position.y += offset;
}

// デバッグメッシュの定期更新
setInterval(() => {
    const obj = window.selectedPhysicsObject;
    if (obj && obj.debugMesh) {
        const offset = obj.colliderYOffset || 0;
        obj.debugMesh.position.copy(obj.mesh.position);
        obj.debugMesh.position.y += offset;
        obj.debugMesh.quaternion.copy(obj.mesh.quaternion);
    }
}, 16);

// 右クリックイベント
function onContextMenu(e) {
    e.preventDefault();
    
    if (window.fpsMode) return; // FPSモード中は無効
    
    const canvas = e.target;
    const rect = canvas.getBoundingClientRect();
    
    mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    
    raycaster.setFromCamera(mouse, window.app.camera);
    
    // === モーキャプユーザーVRMをチェック ===
    if (window.vmcMocap && window.vmcMocap.avatarVRM && window.vmcMocap.avatarVRM.scene) {
        const mocapVRMMeshes = [];
        window.vmcMocap.avatarVRM.scene.traverse(child => {
            if (child.isMesh || child.isSkinnedMesh) {
                mocapVRMMeshes.push(child);
            }
        });
        
        const mocapIntersects = raycaster.intersectObjects(mocapVRMMeshes, true);
        if (mocapIntersects.length > 0) {
            // モーキャプユーザーVRMをクリックした
            window.selectedVRM = window.vmcMocap.avatarVRM;
            window.selectedVRMCharacterId = 'mocap_user';
            window.selectedVRMCharacterName = 'モーキャプユーザー';
            window.selectedPhysicsObject = null;
            
            // VRMの基準スケールを保存
            if (!window.vmcMocap.avatarVRM._baseScale) {
                window.vmcMocap.avatarVRM._baseScale = window.vmcMocap.avatarVRM.scene.scale.x;
            }
            window.vrmBaseScale = window.vmcMocap.avatarVRM._baseScale;
            
            showContextMenu(e.clientX, e.clientY, '🎭 モーキャプユーザー', 'vrm');
            console.log('📋 右クリック: モーキャプユーザーVRM');
            return;
        }
    }
    
    // === マルチキャラクターのVRMをチェック ===
    if (window.multiCharManager && window.multiCharManager.loadedVRMs) {
        const allVRMMeshes = [];
        const vrmToCharMap = new Map(); // mesh -> {vrm, characterId, characterName}
        
        window.multiCharManager.loadedVRMs.forEach((vrmData, characterId) => {
            if (vrmData.vrm && vrmData.vrm.scene) {
                const charConfig = window.multiCharUI?.characterConfigs?.find(c => c.id === characterId);
                const charName = charConfig?.name || characterId;
                
                vrmData.vrm.scene.traverse(child => {
                    if (child.isMesh || child.isSkinnedMesh) {
                        allVRMMeshes.push(child);
                        vrmToCharMap.set(child, { 
                            vrm: vrmData.vrm, 
                            characterId, 
                            characterName: charName,
                            mixer: vrmData.mixer
                        });
                    }
                });
            }
        });
        
        if (allVRMMeshes.length > 0) {
            const intersects = raycaster.intersectObjects(allVRMMeshes, true);
            if (intersects.length > 0) {
                // クリックされたメッシュからVRM情報を取得
                let clickedMesh = intersects[0].object;
                let vrmInfo = vrmToCharMap.get(clickedMesh);
                
                // 親を辿って検索
                if (!vrmInfo) {
                    let parent = clickedMesh.parent;
                    while (parent && !vrmInfo) {
                        vrmInfo = vrmToCharMap.get(parent);
                        parent = parent.parent;
                    }
                }
                
                // どのVRMのメッシュか特定できなかった場合、全VRMをチェック
                if (!vrmInfo) {
                    for (const [mesh, info] of vrmToCharMap) {
                        let checkMesh = clickedMesh;
                        while (checkMesh) {
                            if (info.vrm.scene.getObjectById(checkMesh.id)) {
                                vrmInfo = info;
                                break;
                            }
                            checkMesh = checkMesh.parent;
                        }
                        if (vrmInfo) break;
                    }
                }
                
                if (vrmInfo) {
                    window.selectedVRM = vrmInfo.vrm;
                    window.selectedVRMCharacterId = vrmInfo.characterId;
                    window.selectedVRMCharacterName = vrmInfo.characterName;
                    window.selectedPhysicsObject = null;
                    
                    // VRMの基準スケールを保存
                    if (!vrmInfo.vrm._baseScale) {
                        vrmInfo.vrm._baseScale = vrmInfo.vrm.scene.scale.x;
                    }
                    window.vrmBaseScale = vrmInfo.vrm._baseScale;
                    
                    showContextMenu(e.clientX, e.clientY, `🎭 ${vrmInfo.characterName}`, 'vrm');
                    console.log(`📋 右クリック: マルチキャラVRM "${vrmInfo.characterName}" (${vrmInfo.characterId})`);
                    return;
                }
            }
        }
    }
    
    // === メインVRMモデルをチェック ===
    if (window.app && window.app.vrm && window.app.vrm.scene) {
        const vrmMeshes = [];
        window.app.vrm.scene.traverse(child => {
            if (child.isMesh || child.isSkinnedMesh) {
                vrmMeshes.push(child);
            }
        });
        
        const vrmIntersects = raycaster.intersectObjects(vrmMeshes, true);
        if (vrmIntersects.length > 0) {
            // VRMをクリックした
            window.selectedVRM = window.app.vrm;
            window.selectedVRMCharacterId = null;
            window.selectedVRMCharacterName = 'メインVRM';
            window.selectedPhysicsObject = null;
            
            // VRMの基準スケールを保存
            if (!window.vrmBaseScale) {
                window.vrmBaseScale = window.app.vrm.scene.scale.x;
            }
            
            showContextMenu(e.clientX, e.clientY, 'VRMキャラクター', 'vrm');
            console.log('📋 右クリック: メインVRMモデル');
            return;
        }
    }
    
    // === 物理オブジェクトをチェック ===
    if (window.physicsObjects && window.physicsObjects.length > 0) {
        const meshes = window.physicsObjects.map(obj => obj.mesh).filter(m => m);
        const allMeshes = [];
        meshes.forEach(m => {
            m.traverse(child => {
                if (child.isMesh) {
                    allMeshes.push(child);
                }
            });
            allMeshes.push(m);
        });
        
        const intersects = raycaster.intersectObjects(allMeshes, true);
        
        if (intersects.length > 0) {
            let clickedMesh = intersects[0].object;
            let foundObj = null;
            
            for (const obj of window.physicsObjects) {
                if (obj.mesh === clickedMesh) {
                    foundObj = obj;
                    break;
                }
                let parent = clickedMesh.parent;
                while (parent) {
                    if (obj.mesh === parent) {
                        foundObj = obj;
                        break;
                    }
                    parent = parent.parent;
                }
                if (foundObj) break;
            }
            
            if (foundObj) {
                window.selectedPhysicsObject = foundObj;
                window.selectedVRM = null;
                
                const name = foundObj.fileName || foundObj.mesh.name || foundObj.type || '不明';
                showContextMenu(e.clientX, e.clientY, name, 'physics');
                console.log('📋 右クリック:', name);
                return;
            }
        }
    }
    
    // 何も選択されなかった
    hideContextMenu();
}

// メニュー表示
function showContextMenu(x, y, name, type) {
    // ターゲット名を表示
    document.getElementById('ctx-target-name').textContent = `📦 ${name}`;
    
    // VRMの場合は削除ボタンを非表示、VRM専用メニューを表示
    const deleteBtn = contextMenu.querySelector('.ctx-delete');
    const vrmOnlyItems = contextMenu.querySelectorAll('.ctx-vrm-only');
    
    if (type === 'vrm') {
        deleteBtn.style.display = 'none';
        vrmOnlyItems.forEach(item => item.style.display = 'flex');
    } else {
        deleteBtn.style.display = 'flex';
        vrmOnlyItems.forEach(item => item.style.display = 'none');
    }
    
    contextMenu.style.display = 'block';
    contextMenu.style.left = x + 'px';
    contextMenu.style.top = y + 'px';
    
    // 画面外にはみ出さないよう調整
    const rect = contextMenu.getBoundingClientRect();
    if (rect.right > window.innerWidth) {
        contextMenu.style.left = (window.innerWidth - rect.width - 10) + 'px';
    }
    if (rect.bottom > window.innerHeight) {
        contextMenu.style.top = (window.innerHeight - rect.height - 10) + 'px';
    }
}

// メニュー非表示
function hideContextMenu() {
    if (contextMenu) {
        contextMenu.style.display = 'none';
    }
}

// サイズパネル表示
function showSizePanel() {
    const target = getSelectedTarget();
    if (!target) return;
    
    let name, typeText;
    
    if (target.type === 'vrm') {
        // マルチキャラクターVRMの場合はキャラ名を表示
        if (window.selectedVRMCharacterId) {
            name = window.selectedVRMCharacterName || window.selectedVRMCharacterId;
            typeText = `🎭 マルチキャラVRM (${window.selectedVRMCharacterId})`;
        } else {
            name = 'VRMキャラクター';
            typeText = '🎭 VRMモデル';    
        }
        
        // VRM用：コライダーセクション非表示、落下ボタン非表示
        document.getElementById('collider-section').style.display = 'none';
        document.getElementById('pos-drop-btn').style.display = 'none';
        
        // 現在のスケールを取得
        const baseScale = window.vrmBaseScale || 1;
        const currentScale = target.mesh.scale.x;
        const relativeScale = currentScale / baseScale;
        
        document.getElementById('size-slider').value = Math.min(5, relativeScale);
        document.getElementById('size-value-input').value = relativeScale.toFixed(2);
        
    } else {
        const obj = target.obj;
        name = obj.fileName || obj.mesh.name || obj.type || '不明';
        typeText = '📦 物理オブジェクト';
        
        // 物理オブジェクト用：コライダーセクション表示、落下ボタン表示
        document.getElementById('collider-section').style.display = 'block';
        document.getElementById('pos-drop-btn').style.display = 'block';
        
        // 現在のスケールを取得
        const currentScale = obj.mesh.scale.x;
        const baseScale = obj.baseScale || 1;
        const relativeScale = currentScale / baseScale;
        
        document.getElementById('size-slider').value = Math.min(5, relativeScale);
        document.getElementById('size-value-input').value = relativeScale.toFixed(2);
        
        // baseScaleを保存（初回のみ）
        if (!obj.baseScale) {
            obj.baseScale = currentScale;
        }
        
        // コライダー情報を更新
        updateColliderInfo();
        
        // デバッグチェックボックスをリセット
        document.getElementById('show-collider-debug').checked = !!obj.debugMesh;
    }
    
    document.getElementById('size-target-name').textContent = name;
    document.getElementById('size-target-type').textContent = typeText;
    
    // 現在の位置を表示
    updatePositionDisplay();
    
    // 現在の回転を表示
    const rotationY = target.mesh.rotation.y * 180 / Math.PI;
    document.getElementById('rotation-y-slider').value = rotationY;
    document.getElementById('rotation-y-input').value = Math.round(rotationY);
    
    sizePanel.style.display = 'block';
    
    // 画面中央付近に配置
    const x = Math.min(window.innerWidth - 300, Math.max(10, window.innerWidth / 2 - 140));
    const y = Math.min(window.innerHeight - 600, Math.max(10, window.innerHeight / 2 - 300));
    sizePanel.style.left = x + 'px';
    sizePanel.style.top = y + 'px';
}

// サイズパネル非表示
function hideSizePanel() {
    if (sizePanel) {
        sizePanel.style.display = 'none';
    }
}

// メニューアクション
function onMenuAction(e) {
    const action = e.currentTarget.dataset.action;
    const target = getSelectedTarget();
    
    if (!target) {
        hideContextMenu();
        return;
    }
    
    switch (action) {
        case 'resize':
            hideContextMenu();
            showSizePanel();
            break;
            
        case 'body-morph-bone':
            hideContextMenu();
            showBodyMorphBonePanel();
            break;
            
        case 'morph':
            hideContextMenu();
            showMorphPanel();
            break;
            
        case 'rotate':
            target.mesh.rotation.set(0, 0, 0);
            target.mesh.quaternion.set(0, 0, 0, 1);
            if (target.body) {
                target.body.quaternion.set(0, 0, 0, 1);
                target.body.angularVelocity.set(0, 0, 0);
            }
            console.log('🔄 回転リセット');
            hideContextMenu();
            break;
            
        case 'clone':
            if (target.type === 'physics') {
                cloneObject(target.obj);
            } else {
                console.log('⚠️ VRMモデルの複製は未対応');
                alert('VRMモデルの複製は現在対応していません');
            }
            hideContextMenu();
            break;
            
        case 'delete':
            if (target.type === 'physics') {
                deleteObject(target.obj);
            }
            // VRMは削除不可
            hideContextMenu();
            break;
    }
}

// オブジェクト複製
function cloneObject(obj) {
    const THREE = window.THREE;
    
    const clonedMesh = obj.mesh.clone();
    clonedMesh.name = obj.mesh.name + '_copy_' + Date.now();
    
    clonedMesh.position.x += 1;
    clonedMesh.position.y = 3;
    
    window.app.scene.add(clonedMesh);
    
    let clonedBody = null;
    if (obj.body && window.physicsWorld) {
        const shape = obj.body.shapes[0];
        clonedBody = new CANNON.Body({
            mass: obj.body.mass,
            shape: shape.clone ? shape.clone() : shape,
            position: new CANNON.Vec3(
                clonedMesh.position.x,
                clonedMesh.position.y,
                clonedMesh.position.z
            )
        });
        window.physicsWorld.addBody(clonedBody);
    }
    
    const newObj = {
        mesh: clonedMesh,
        body: clonedBody,
        type: obj.type,
        fileName: obj.fileName,
        baseScale: obj.baseScale,
        baseMass: obj.baseMass,
        isComposite: obj.isComposite
    };
    
    window.physicsObjects.push(newObj);
    updateObjectCount();
    
    console.log('📋 複製完了');
}

// オブジェクト削除
function deleteObject(obj) {
    if (window.app && window.app.scene) {
        window.app.scene.remove(obj.mesh);
    }
    
    if (obj.body && window.physicsWorld) {
        window.physicsWorld.removeBody(obj.body);
    }
    
    const index = window.physicsObjects.indexOf(obj);
    if (index > -1) {
        window.physicsObjects.splice(index, 1);
    }
    
    if (obj.mesh.geometry) obj.mesh.geometry.dispose();
    if (obj.mesh.material) {
        if (Array.isArray(obj.mesh.material)) {
            obj.mesh.material.forEach(m => m.dispose());
        } else {
            obj.mesh.material.dispose();
        }
    }
    
    updateObjectCount();
    window.selectedPhysicsObject = null;
    hideSizePanel();
    
    console.log('🗑️ 削除完了');
}

// オブジェクト数更新
function updateObjectCount() {
    const countEl = document.getElementById('object-count');
    if (countEl) {
        countEl.textContent = `オブジェクト: ${window.physicsObjects.length}`;
    }
}

// 初期化開始
initContextMenu();

console.log('✅ model-context-menu.js 読み込み完了（VRM対応・モーフ/ボーン調整機能付き）');

// ========================================
// ★ モーフパネル常時表示 & グローバル表情操作関数
// ========================================

// ★ グローバル表情操作関数（Claudeが直接呼び出し可能）
window.setEmotion = function(emotionName, value) {
    if (!window.app || !window.app.vrm || !window.app.vrm.expressionManager) {
        console.warn('⚠️ VRMが読み込まれていません');
        return false;
    }
    
    const em = window.app.vrm.expressionManager;
    try {
        em.setValue(emotionName, value);
        em.update();
        
        // UIスライダーも更新
        const slider = document.querySelector(`.morph-slider[data-morph="${emotionName}"]`);
        const numInput = document.querySelector(`.morph-value[data-morph="${emotionName}"]`);
        if (slider) slider.value = value;
        if (numInput) numInput.value = value.toFixed(2);
        
        console.log(`😊 表情設定: ${emotionName} = ${value.toFixed(2)}`);
        return true;
    } catch (e) {
        console.warn('表情設定エラー:', emotionName, e);
        return false;
    }
};

// ★ 複数表情を一度に設定
window.setEmotions = function(emotions) {
    if (!window.app || !window.app.vrm || !window.app.vrm.expressionManager) {
        console.warn('⚠️ VRMが読み込まれていません');
        return false;
    }
    
    const em = window.app.vrm.expressionManager;
    
    for (const [name, value] of Object.entries(emotions)) {
        try {
            em.setValue(name, value);
            
            // UIスライダーも更新
            const slider = document.querySelector(`.morph-slider[data-morph="${name}"]`);
            const numInput = document.querySelector(`.morph-value[data-morph="${name}"]`);
            if (slider) slider.value = value;
            if (numInput) numInput.value = value.toFixed(2);
        } catch (e) {}
    }
    
    em.update();
    console.log('🎭 表情一括設定:', emotions);
    return true;
};

// ★ 全表情リセット
window.resetEmotions = function() {
    if (!window.app || !window.app.vrm || !window.app.vrm.expressionManager) return false;
    
    const em = window.app.vrm.expressionManager;
    const expressionNames = ['happy', 'angry', 'sad', 'relaxed', 'surprised', 'neutral', 'aa', 'ih', 'ou', 'ee', 'oh'];
    
    expressionNames.forEach(name => {
        try {
            em.setValue(name, 0);
            
            const slider = document.querySelector(`.morph-slider[data-morph="${name}"]`);
            const numInput = document.querySelector(`.morph-value[data-morph="${name}"]`);
            if (slider) slider.value = 0;
            if (numInput) numInput.value = '0.00';
        } catch (e) {}
    });
    
    em.update();
    console.log('🔄 全表情リセット');
    return true;
};

// ★ 現在の表情値を取得
window.getEmotions = function() {
    if (!window.app || !window.app.vrm || !window.app.vrm.expressionManager) return null;
    
    const em = window.app.vrm.expressionManager;
    const result = {};
    const expressionNames = ['happy', 'angry', 'sad', 'relaxed', 'surprised', 'neutral', 'aa', 'ih', 'ou', 'ee', 'oh', 'blink'];
    
    expressionNames.forEach(name => {
        try {
            const val = em.getValue(name);
            if (val !== undefined) result[name] = val;
        } catch (e) {}
    });
    
    return result;
};

// ★ モーフパネル準備（VRM読み込み後 - 自動表示はしない）
// VRM右クリックメニューの「モーフ調整」から開けます
(function prepareMorphPanel() {
    let attempts = 0;
    const maxAttempts = 60; // 30秒
    
    const checkVRM = setInterval(() => {
        attempts++;
        
        if (window.app && window.app.vrm && window.app.vrm.expressionManager && morphPanel) {
            clearInterval(checkVRM);
            
            // VRMを選択状態にする（右クリックメニュー用）
            window.selectedVRM = window.app.vrm;
            
            // パネルは表示しない（右クリック→「モーフ調整」で開く）
            console.log('✅ モーフ調整パネル準備完了（右クリック→「モーフ調整」で開けます）');
        }
        
        if (attempts >= maxAttempts) {
            clearInterval(checkVRM);
            console.log('⚠️ モーフパネル準備タイムアウト');
        }
    }, 500);
})();

console.log('✅ グローバル表情操作関数準備完了');
console.log('  window.setEmotion("happy", 0.8) - 単一表情設定');
console.log('  window.setEmotions({happy: 0.5, surprised: 0.3}) - 複数表情');
console.log('  window.resetEmotions() - 全表情リセット');
console.log('  window.getEmotions() - 現在の表情値取得');