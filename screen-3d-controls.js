// ========================================
// 🎮 Screen 3D Controls v1.0
// 3D空間内のスクリーンオブジェクトを右クリックで
// 移動・リサイズ・回転できるインタラクション
// 対象: ImaginationScreen3D, ScreenTV
// ========================================

(function() {
    'use strict';
    console.log('🎮 Screen 3D Controls v1.0 初期化中...');

    // ========================================
    // 状態管理
    // ========================================
    let selectedGroup = null;       // 選択中のTHREE.Group
    let selectedType = null;        // 'imagination' or 'tv'
    let controlMode = null;         // 'move' | 'scale' | 'rotate' | null
    let isDragging = false;
    let dragStartMouse = { x: 0, y: 0 };
    let dragStartPos = null;        // THREE.Vector3
    let dragStartScale = 1;
    let dragStartRotY = 0;
    let contextMenu = null;
    let highlightOutline = null;
    let raycaster = null;
    let mouseVec = null;

    // ========================================
    // 初期化
    // ========================================
    function init() {
        const check = () => {
            const app = window.app || window.vrm_app;
            if (app && app.scene && app.camera) {
                raycaster = new THREE.Raycaster();
                mouseVec = new THREE.Vector2();
                setupEvents();
                createContextMenu();
                createHighlight();
                console.log('🎮 Screen 3D Controls: 準備完了');
            } else {
                setTimeout(check, 500);
            }
        };
        check();
    }

    // ========================================
    // 対象スクリーンを収集
    // ========================================
    function getScreenMeshes() {
        const app = window.app || window.vrm_app;
        if (!app || !app.scene) return [];
        const meshes = [];
        
        // ImaginationScreen3D
        const imgScreen = app.scene.getObjectByName('ImaginationScreen3D_Screen');
        const imgFrame = app.scene.getObjectByName('ImaginationScreen3D_Frame');
        if (imgScreen) meshes.push({ mesh: imgScreen, type: 'imagination' });
        if (imgFrame) meshes.push({ mesh: imgFrame, type: 'imagination' });
        
        // ScreenTV
        const tvScreen = app.scene.getObjectByName('ScreenTV_Screen');
        const tvFrame = app.scene.getObjectByName('ScreenTV_Frame');
        if (tvScreen) meshes.push({ mesh: tvScreen, type: 'tv' });
        if (tvFrame) meshes.push({ mesh: tvFrame, type: 'tv' });
        
        return meshes;
    }

    function getGroupForType(type) {
        const app = window.app || window.vrm_app;
        if (!app || !app.scene) return null;
        if (type === 'imagination') return app.scene.getObjectByName('ImaginationScreen3D');
        if (type === 'tv') return app.scene.getObjectByName('ScreenTV');
        return null;
    }

    // ========================================
    // イベントリスナー
    // ========================================
    function setupEvents() {
        const canvas = document.querySelector('#canvas-container canvas');
        if (!canvas) {
            console.warn('🎮 Canvas not found, retrying...');
            setTimeout(setupEvents, 1000);
            return;
        }

        // 右クリック → レイキャストでスクリーン検出
        canvas.addEventListener('contextmenu', onContextMenu);
        
        // 左クリック → ドラッグ操作
        canvas.addEventListener('mousedown', onMouseDown);
        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
        
        // マウスホイール → スケール操作（選択中のみ）
        canvas.addEventListener('wheel', onWheel, { passive: false });
        
        // Escape → 選択解除
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                deselectAll();
            }
        });
        
        // 左クリック（空白） → 選択解除 & メニュー非表示
        canvas.addEventListener('click', (e) => {
            // コントロールモード中は無視
            if (controlMode) return;
            hideContextMenu();
        });
    }

    // ========================================
    // 右クリック処理
    // ========================================
    function onContextMenu(e) {
        const app = window.app || window.vrm_app;
        if (!app || !app.camera) return;
        
        // FPSモード中は無視
        if (window.fpsMode) return;
        
        const canvas = e.target;
        const rect = canvas.getBoundingClientRect();
        mouseVec.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        mouseVec.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
        
        raycaster.setFromCamera(mouseVec, app.camera);
        
        const screenMeshes = getScreenMeshes();
        if (screenMeshes.length === 0) return;
        
        const meshOnly = screenMeshes.map(s => s.mesh);
        const intersects = raycaster.intersectObjects(meshOnly, false);
        
        if (intersects.length > 0) {
            e.preventDefault();
            e.stopPropagation();
            
            const hitMesh = intersects[0].object;
            const info = screenMeshes.find(s => s.mesh === hitMesh);
            if (!info) return;
            
            const group = getGroupForType(info.type);
            if (!group) return;
            
            // 選択状態を設定
            selectedGroup = group;
            selectedType = info.type;
            controlMode = null;
            
            // ハイライト表示
            showHighlight(group);
            
            // コンテキストメニュー表示
            showContextMenu(e.clientX, e.clientY, info.type);
            
            console.log(`🎮 スクリーン選択: ${info.type}`);
        }
    }

    // ========================================
    // コンテキストメニュー
    // ========================================
    function createContextMenu() {
        contextMenu = document.createElement('div');
        contextMenu.id = 'screen-3d-context-menu';
        contextMenu.innerHTML = `
            <style>
                #screen-3d-context-menu {
                    position: fixed;
                    display: none;
                    background: rgba(20, 20, 35, 0.97);
                    border: 1px solid rgba(100, 200, 255, 0.4);
                    border-radius: 10px;
                    padding: 6px;
                    z-index: 200000;
                    font-family: 'Segoe UI', sans-serif;
                    font-size: 12px;
                    color: #e0e0e0;
                    min-width: 180px;
                    box-shadow: 0 8px 32px rgba(0,0,0,0.6);
                    backdrop-filter: blur(12px);
                }
                #screen-3d-context-menu .s3d-title {
                    padding: 6px 10px;
                    font-weight: bold;
                    color: #64c8ff;
                    font-size: 13px;
                    border-bottom: 1px solid rgba(100, 200, 255, 0.2);
                    margin-bottom: 4px;
                }
                #screen-3d-context-menu .s3d-item {
                    padding: 8px 12px;
                    cursor: pointer;
                    border-radius: 6px;
                    transition: all 0.15s;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                }
                #screen-3d-context-menu .s3d-item:hover {
                    background: rgba(100, 200, 255, 0.15);
                }
                #screen-3d-context-menu .s3d-item.active {
                    background: linear-gradient(135deg, rgba(100, 200, 255, 0.25), rgba(139, 92, 246, 0.25));
                    color: #64c8ff;
                }
                #screen-3d-context-menu .s3d-item .s3d-icon {
                    font-size: 16px;
                    width: 22px;
                    text-align: center;
                }
                #screen-3d-context-menu .s3d-divider {
                    height: 1px;
                    background: rgba(255,255,255,0.1);
                    margin: 4px 6px;
                }
                #screen-3d-context-menu .s3d-info {
                    padding: 4px 12px;
                    font-size: 10px;
                    color: #888;
                }
            </style>
            <div class="s3d-title" id="s3d-menu-title">🖥️ スクリーン</div>
            <div class="s3d-item" data-action="move">
                <span class="s3d-icon">✥</span>
                <span>移動（ドラッグ）</span>
            </div>
            <div class="s3d-item" data-action="scale">
                <span class="s3d-icon">⇲</span>
                <span>サイズ変更（ドラッグ/ホイール）</span>
            </div>
            <div class="s3d-item" data-action="rotate">
                <span class="s3d-icon">↻</span>
                <span>回転（左右ドラッグ）</span>
            </div>
            <div class="s3d-divider"></div>
            <div class="s3d-item" data-action="reset">
                <span class="s3d-icon">🔄</span>
                <span>位置リセット</span>
            </div>
            <div class="s3d-item" data-action="deselect">
                <span class="s3d-icon">❌</span>
                <span>選択解除</span>
            </div>
            <div class="s3d-divider"></div>
            <div class="s3d-info" id="s3d-pos-info">位置: ---</div>
            <div class="s3d-info" id="s3d-scale-info">スケール: ---</div>
        `;
        document.body.appendChild(contextMenu);
        
        // メニュー項目のクリック
        contextMenu.querySelectorAll('.s3d-item').forEach(item => {
            item.addEventListener('click', (e) => {
                const action = item.dataset.action;
                handleMenuAction(action);
                e.stopPropagation();
            });
        });
        
        // メニュー外クリック
        document.addEventListener('mousedown', (e) => {
            if (contextMenu.style.display === 'block' && 
                !contextMenu.contains(e.target) && 
                e.button !== 2) {
                // コントロールモード中はメニューを隠すだけ
                hideContextMenu();
            }
        });
    }

    function showContextMenu(x, y, type) {
        if (!contextMenu) return;
        
        const label = type === 'imagination' ? '💭 想像スクリーン' : '📺 TVスクリーン';
        contextMenu.querySelector('#s3d-menu-title').textContent = label;
        
        // 位置情報更新
        updateInfoDisplay();
        
        // 画面端対策
        contextMenu.style.display = 'block';
        const menuRect = contextMenu.getBoundingClientRect();
        const finalX = Math.min(x, window.innerWidth - menuRect.width - 10);
        const finalY = Math.min(y, window.innerHeight - menuRect.height - 10);
        contextMenu.style.left = finalX + 'px';
        contextMenu.style.top = finalY + 'px';
        
        // アクティブ状態をリセット
        contextMenu.querySelectorAll('.s3d-item').forEach(i => i.classList.remove('active'));
    }

    function hideContextMenu() {
        if (contextMenu) {
            contextMenu.style.display = 'none';
        }
    }

    function updateInfoDisplay() {
        if (!selectedGroup) return;
        const pos = selectedGroup.position;
        const scl = selectedGroup.scale;
        const posInfo = contextMenu.querySelector('#s3d-pos-info');
        const sclInfo = contextMenu.querySelector('#s3d-scale-info');
        if (posInfo) posInfo.textContent = `位置: X=${pos.x.toFixed(2)} Y=${pos.y.toFixed(2)} Z=${pos.z.toFixed(2)}`;
        if (sclInfo) sclInfo.textContent = `スケール: ${scl.x.toFixed(2)}`;
    }

    // ========================================
    // メニューアクション
    // ========================================
    function handleMenuAction(action) {
        switch (action) {
            case 'move':
                setControlMode('move');
                break;
            case 'scale':
                setControlMode('scale');
                break;
            case 'rotate':
                setControlMode('rotate');
                break;
            case 'reset':
                resetTransform();
                break;
            case 'deselect':
                deselectAll();
                break;
        }
    }

    function setControlMode(mode) {
        controlMode = mode;
        
        // メニュー項目のアクティブ表示
        contextMenu.querySelectorAll('.s3d-item').forEach(item => {
            item.classList.toggle('active', item.dataset.action === mode);
        });
        
        // カメラ操作を無効化
        const app = window.app || window.vrm_app;
        if (app && app.controls) {
            app.controls.enabled = false;
        }
        
        // カーソル変更
        const canvas = document.querySelector('#canvas-container canvas');
        if (canvas) {
            switch (mode) {
                case 'move': canvas.style.cursor = 'move'; break;
                case 'scale': canvas.style.cursor = 'nwse-resize'; break;
                case 'rotate': canvas.style.cursor = 'ew-resize'; break;
                default: canvas.style.cursor = ''; break;
            }
        }
        
        // ステータス表示
        showStatusOverlay(mode);
        
        hideContextMenu();
        console.log(`🎮 コントロールモード: ${mode}`);
    }

    // ========================================
    // ステータスオーバーレイ
    // ========================================
    let statusOverlay = null;
    
    function showStatusOverlay(mode) {
        if (!statusOverlay) {
            statusOverlay = document.createElement('div');
            statusOverlay.id = 'screen-3d-status';
            statusOverlay.style.cssText = `
                position: fixed;
                top: 10px;
                left: 50%;
                transform: translateX(-50%);
                background: rgba(20, 20, 35, 0.95);
                border: 1px solid rgba(100, 200, 255, 0.4);
                border-radius: 8px;
                padding: 8px 16px;
                color: #64c8ff;
                font-family: 'Segoe UI', sans-serif;
                font-size: 12px;
                z-index: 200001;
                backdrop-filter: blur(10px);
                display: flex;
                align-items: center;
                gap: 10px;
                box-shadow: 0 4px 16px rgba(0,0,0,0.4);
            `;
            document.body.appendChild(statusOverlay);
        }
        
        const typeLabel = selectedType === 'imagination' ? '💭想像' : '📺TV';
        let modeLabel = '';
        let hint = '';
        switch (mode) {
            case 'move':
                modeLabel = '✥ 移動モード';
                hint = '左ドラッグで移動 | Shift+ドラッグで上下移動 | ESCで終了';
                break;
            case 'scale':
                modeLabel = '⇲ サイズ変更';
                hint = '左ドラッグ or ホイールで拡大縮小 | ESCで終了';
                break;
            case 'rotate':
                modeLabel = '↻ 回転モード';
                hint = '左右ドラッグで回転 | ESCで終了';
                break;
        }
        
        statusOverlay.innerHTML = `
            <span style="font-weight:bold;">${typeLabel} ${modeLabel}</span>
            <span style="color:#888; font-size:11px;">${hint}</span>
            <button id="s3d-done-btn" style="
                background: rgba(239,68,68,0.3);
                border: 1px solid rgba(239,68,68,0.5);
                color: #ef4444;
                border-radius: 4px;
                padding: 2px 8px;
                cursor: pointer;
                font-size: 11px;
            ">完了</button>
        `;
        statusOverlay.style.display = 'flex';
        
        document.getElementById('s3d-done-btn').addEventListener('click', () => {
            finishControlMode();
        });
    }

    function hideStatusOverlay() {
        if (statusOverlay) {
            statusOverlay.style.display = 'none';
        }
    }

    // ========================================
    // マウスドラッグ操作
    // ========================================
    function onMouseDown(e) {
        if (e.button !== 0) return; // 左クリックのみ
        if (!controlMode || !selectedGroup) return;
        
        // UIパネル上のクリックは無視
        if (e.target.closest('#screen-3d-context-menu')) return;
        if (e.target.closest('#screen-3d-status')) return;
        
        isDragging = true;
        dragStartMouse = { x: e.clientX, y: e.clientY };
        dragStartPos = selectedGroup.position.clone();
        dragStartScale = selectedGroup.scale.x;
        dragStartRotY = selectedGroup.rotation.y;
        
        e.preventDefault();
        e.stopPropagation();
    }

    function onMouseMove(e) {
        if (!isDragging || !controlMode || !selectedGroup) return;
        
        const dx = e.clientX - dragStartMouse.x;
        const dy = e.clientY - dragStartMouse.y;
        const app = window.app || window.vrm_app;
        if (!app || !app.camera) return;
        
        switch (controlMode) {
            case 'move': {
                if (e.shiftKey) {
                    // Shift: 上下移動
                    const moveY = -dy * 0.005;
                    selectedGroup.position.y = dragStartPos.y + moveY;
                } else {
                    // XZ平面上で移動（カメラ方向を考慮）
                    const camera = app.camera;
                    const forward = new THREE.Vector3();
                    camera.getWorldDirection(forward);
                    forward.y = 0;
                    forward.normalize();
                    
                    const right = new THREE.Vector3();
                    right.crossVectors(forward, new THREE.Vector3(0, 1, 0));
                    right.normalize();
                    
                    const moveSpeed = 0.005;
                    const moveX = dx * moveSpeed;
                    const moveZ = -dy * moveSpeed;
                    
                    selectedGroup.position.x = dragStartPos.x + right.x * moveX + forward.x * moveZ;
                    selectedGroup.position.z = dragStartPos.z + right.z * moveX + forward.z * moveZ;
                }
                break;
            }
            case 'scale': {
                const scaleDelta = 1 + (dx - dy) * 0.003;
                const newScale = Math.max(0.1, Math.min(10, dragStartScale * scaleDelta));
                selectedGroup.scale.set(newScale, newScale, newScale);
                break;
            }
            case 'rotate': {
                const rotDelta = dx * 0.005;
                selectedGroup.rotation.y = dragStartRotY + rotDelta;
                break;
            }
        }
        
        // ハイライト更新
        updateHighlight();
        updateInfoDisplay();
        syncToOwner();
    }

    function onMouseUp(e) {
        if (e.button !== 0) return;
        if (!isDragging) return;
        isDragging = false;
        
        // 設定を保存
        syncToOwner();
    }

    // ========================================
    // マウスホイール（スケール）
    // ========================================
    function onWheel(e) {
        if (!selectedGroup) return;
        
        // コントロールモードが無い場合でも、選択中ならスケール変更可能
        if (controlMode !== 'scale' && controlMode !== null) return;
        
        e.preventDefault();
        
        const delta = e.deltaY > 0 ? 0.95 : 1.05;
        const currentScale = selectedGroup.scale.x;
        const newScale = Math.max(0.1, Math.min(10, currentScale * delta));
        selectedGroup.scale.set(newScale, newScale, newScale);
        
        updateHighlight();
        updateInfoDisplay();
        syncToOwner();
    }

    // ========================================
    // オーナーモジュールと同期
    // ========================================
    function syncToOwner() {
        if (!selectedGroup) return;
        
        if (selectedType === 'tv' && window.screenTV) {
            // ScreenTV の config を更新
            const tv = window.screenTV;
            tv.config.posX = selectedGroup.position.x;
            tv.config.posY = selectedGroup.position.y;
            tv.config.posZ = selectedGroup.position.z;
            tv.config.rotY = THREE.MathUtils.radToDeg(selectedGroup.rotation.y);
            // スケールからサイズ逆算
            const baseW = 1.92;
            const baseH = 1.08;
            tv.config.width = baseW * selectedGroup.scale.x;
            tv.config.height = baseH * selectedGroup.scale.y;
            tv._saveConfig();
            
            // UIパネルも更新（もし開いていれば）
            _syncTVPanelSliders(tv);
        }
        
        if (selectedType === 'imagination' && window.imaginationWipe) {
            const wipe = window.imaginationWipe;
            const cfg = wipe.screen3DConfig;
            cfg.posX = selectedGroup.position.x;
            cfg.posY = selectedGroup.position.y;
            cfg.posZ = selectedGroup.position.z;
            cfg.rotY = THREE.MathUtils.radToDeg(selectedGroup.rotation.y);
            // スケールからサイズ逆算
            const baseW = cfg._baseWidth || cfg.width;
            const baseH = cfg._baseHeight || cfg.height;
            if (!cfg._baseWidth) {
                cfg._baseWidth = cfg.width;
                cfg._baseHeight = cfg.height;
            }
            cfg.width = baseW * selectedGroup.scale.x;
            cfg.height = baseH * selectedGroup.scale.y;
            wipe._save3DConfig();
            
            // UIパネルも更新
            _syncImaginationPanelSliders(wipe);
        }
    }
    
    function _syncTVPanelSliders(tv) {
        const panel = document.getElementById('screen-tv-panel');
        if (!panel) return;
        
        const updates = {
            'stv-posX': { val: tv.config.posX, suffix: '' },
            'stv-posY': { val: tv.config.posY, suffix: '' },
            'stv-posZ': { val: tv.config.posZ, suffix: '' },
            'stv-rotY': { val: tv.config.rotY, suffix: '°' },
            'stv-width': { val: tv.config.width, suffix: '' },
            'stv-height': { val: tv.config.height, suffix: '' },
        };
        
        for (const [id, info] of Object.entries(updates)) {
            const slider = panel.querySelector(`#${id}`);
            const valSpan = panel.querySelector(`#${id}-val`);
            if (slider) slider.value = info.val;
            if (valSpan) {
                valSpan.textContent = (id === 'stv-rotY' ? 
                    Math.round(info.val) : 
                    parseFloat(info.val).toFixed(1)) + info.suffix;
            }
        }
    }
    
    function _syncImaginationPanelSliders(wipe) {
        if (!wipe.panel) return;
        const cfg = wipe.screen3DConfig;
        
        const updates = {
            'ip-3d-posX': cfg.posX,
            'ip-3d-posY': cfg.posY,
            'ip-3d-posZ': cfg.posZ,
            'ip-3d-rotY': cfg.rotY,
            'ip-3d-width': cfg.width,
            'ip-3d-height': cfg.height,
        };
        
        for (const [id, val] of Object.entries(updates)) {
            const slider = wipe.panel.querySelector(`#${id}`);
            const valSpan = wipe.panel.querySelector(`#${id}-val`);
            if (slider) slider.value = val;
            if (valSpan) valSpan.textContent = parseFloat(val).toFixed(1);
        }
    }

    // ========================================
    // リセット
    // ========================================
    function resetTransform() {
        if (!selectedGroup) return;
        
        if (selectedType === 'tv') {
            selectedGroup.position.set(0, 1.8, -2.5);
            selectedGroup.rotation.y = 0;
            selectedGroup.scale.set(1, 1, 1);
            if (window.screenTV) {
                Object.assign(window.screenTV.config, {
                    posX: 0, posY: 1.8, posZ: -2.5, rotY: 0,
                    width: 1.92, height: 1.08
                });
                window.screenTV._saveConfig();
                window.screenTV.updateSize();
            }
        }
        
        if (selectedType === 'imagination') {
            selectedGroup.position.set(1.5, 1.5, -1.5);
            selectedGroup.rotation.y = 0;
            selectedGroup.scale.set(1, 1, 1);
            if (window.imaginationWipe) {
                const wipe = window.imaginationWipe;
                Object.assign(wipe.screen3DConfig, {
                    posX: 1.5, posY: 1.5, posZ: -1.5, rotY: 0,
                    width: 1.6, height: 0.9
                });
                wipe._save3DConfig();
                wipe._update3DSize();
            }
        }
        
        updateHighlight();
        updateInfoDisplay();
        syncToOwner();
        hideContextMenu();
        console.log('🎮 位置リセット完了');
    }

    // ========================================
    // 選択解除
    // ========================================
    function deselectAll() {
        finishControlMode();
        selectedGroup = null;
        selectedType = null;
        hideHighlight();
        hideContextMenu();
        hideStatusOverlay();
    }

    function finishControlMode() {
        controlMode = null;
        isDragging = false;
        
        // カメラ操作を復元
        const app = window.app || window.vrm_app;
        if (app && app.controls) {
            app.controls.enabled = true;
        }
        
        // カーソルを元に戻す
        const canvas = document.querySelector('#canvas-container canvas');
        if (canvas) canvas.style.cursor = '';
        
        hideStatusOverlay();
    }

    // ========================================
    // ハイライト表示（選択中のオブジェクトにアウトライン）
    // ========================================
    function createHighlight() {
        // EdgesGeometryベースのワイヤーフレームで選択表示
    }

    function showHighlight(group) {
        hideHighlight();
        
        if (!group) return;
        const app = window.app || window.vrm_app;
        if (!app || !app.scene) return;
        
        // グループ内のメッシュを探す
        group.traverse(child => {
            if (child.isMesh && child.name.includes('Screen')) {
                // エッジジオメトリでアウトライン
                const edges = new THREE.EdgesGeometry(child.geometry, 15);
                const line = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({
                    color: 0x64c8ff,
                    linewidth: 2,
                    transparent: true,
                    opacity: 0.8,
                }));
                line.name = '_screen3d_highlight';
                line.raycast = () => {}; // レイキャスト無効
                child.add(line);
            }
        });
        
        // パルスアニメーション
        startHighlightPulse();
    }

    let highlightAnimId = null;
    function startHighlightPulse() {
        const animate = () => {
            if (!selectedGroup) {
                highlightAnimId = null;
                return;
            }
            const t = Date.now() * 0.003;
            const opacity = 0.5 + 0.3 * Math.sin(t);
            
            selectedGroup.traverse(child => {
                if (child.name === '_screen3d_highlight') {
                    child.material.opacity = opacity;
                }
            });
            
            highlightAnimId = requestAnimationFrame(animate);
        };
        if (highlightAnimId) cancelAnimationFrame(highlightAnimId);
        animate();
    }

    function updateHighlight() {
        // ハイライトは子要素なので自動的に追従する
    }

    function hideHighlight() {
        if (highlightAnimId) {
            cancelAnimationFrame(highlightAnimId);
            highlightAnimId = null;
        }
        
        const app = window.app || window.vrm_app;
        if (!app || !app.scene) return;
        
        // すべてのハイライトを削除
        const toRemove = [];
        app.scene.traverse(child => {
            if (child.name === '_screen3d_highlight') {
                toRemove.push(child);
            }
        });
        toRemove.forEach(obj => {
            if (obj.parent) obj.parent.remove(obj);
            if (obj.geometry) obj.geometry.dispose();
            if (obj.material) obj.material.dispose();
        });
    }

    // ========================================
    // 起動
    // ========================================
    init();
    
    // グローバルAPI
    window.screen3DControls = {
        deselect: deselectAll,
        getSelected: () => ({ group: selectedGroup, type: selectedType }),
    };

    console.log('🎮 Screen 3D Controls v1.0 ロード完了');
    console.log('  📌 3D空間のスクリーンを右クリックで操作メニュー');
    console.log('  ✥ 移動 / ⇲ サイズ変更 / ↻ 回転');

})();
