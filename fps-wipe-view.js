// ========================================
// サブビューウィンドウ システム v3.0
// フローティングウィンドウで別カメラ映像を表示
// - ノーマルカメラ（OrbitControls）
// - AI Director Camera
// - モーキャプユーザー目線
// - フリーカメラ（WASD移動）
// - VRMキャラクター視点
// ========================================

console.log('📺 サブビューウィンドウ v3.0 読み込み中...');

(function() {
    'use strict';
    
    // ========================================
    // グローバル状態
    // ========================================
    window.subViewWindow = {
        enabled: false,
        container: null,
        canvas: null,
        renderer: null,
        camera: null,
        
        // ウィンドウ設定
        position: { x: 20, y: 20 },
        size: { width: 400, height: 300 },
        
        // カメラソース
        // 'normal' - メインカメラと同じ
        // 'ai_director' - AI Director Camera
        // 'mocap_user' - モーキャプユーザー目線
        // 'free' - フリーカメラ
        // 'char_A'等 - VRMキャラクター視点
        cameraSource: 'normal',
        
        // 頭ボーン追従用
        currentHeadBone: null,
        currentVrmGroup: null,
        
        // 視点オフセット
        yawOffset: 0,
        pitchOffset: 0,
        
        // フリーカメラ用
        freeCamera: {
            position: { x: 0, y: 1.65, z: 3 },
            yaw: 0,
            pitch: 0
        },
        moveState: { forward: false, backward: false, left: false, right: false },
        speedLevel: 1,
        baseSpeed: 5,
        speedMultipliers: [1, 1.5, 2.5, 3.5, 5],
        verticalVelocity: 0,
        
        // 設定
        sensitivity: 0.003,
        isPointerLocked: false,
        eyeHeightOffset: 0.08,
        eyeForwardOffset: 0.12
    };
    
    // ========================================
    // 初期化
    // ========================================
    function init() {
        console.log('📺 サブビューウィンドウ v3.0 初期化開始');
        waitForDependencies();
    }
    
    function waitForDependencies() {
        const checkInterval = setInterval(() => {
            if (window.THREE && window.app && window.app.scene && window.app.camera) {
                clearInterval(checkInterval);
                console.log('✅ Three.js 準備完了');
                setupSubViewWindow();
            }
        }, 200);
    }
    
    // ========================================
    // VRMキャラクター取得
    // ========================================
    function getVRMCharacters() {
        const scene = window.app?.scene;
        if (!scene) return [];
        
        const characters = [];
        
        scene.children.forEach((child, index) => {
            if (child.userData?.isMultiCharacterVRM) {
                let headBone = null;
                child.traverse(obj => {
                    if (obj.type === 'Bone' && 
                        (obj.name.includes('Head') || obj.name.includes('head'))) {
                        if (obj.name.includes('Normalized') || !headBone) {
                            headBone = obj;
                        }
                    }
                });
                
                const charId = child.userData.multiCharacterId;
                const charName = getCharacterDisplayName(charId) || charId;
                
                characters.push({
                    id: charId,
                    name: charName,
                    group: child,
                    headBone: headBone,
                    index: index
                });
            }
        });
        
        return characters;
    }
    
    function getCharacterDisplayName(charId) {
        const defaultNames = {
            'char_A': 'キャラA',
            'char_B': 'キャラB',
            'char_C': 'キャラC',
            'char_D': 'キャラD'
        };
        
        try {
            const saved = localStorage.getItem('multiCharConfig');
            if (saved) {
                const config = JSON.parse(saved);
                const char = config.characters?.find(c => c.id === charId);
                if (char?.name) return char.name;
            }
        } catch (e) {}
        
        return defaultNames[charId] || charId;
    }
    
    // ========================================
    // モーキャプユーザーVRM取得
    // ========================================
    function getMocapUserVRM() {
        // 物理システムから
        if (window.physicsSystem?.mocapVRM) {
            return window.physicsSystem.mocapVRM;
        }
        
        // vmcMocapから
        if (window.vmcMocap?.getTargetVRM) {
            return window.vmcMocap.getTargetVRM();
        }
        
        // シーン内から探索
        const scene = window.app?.scene;
        if (!scene) return null;
        
        for (const child of scene.children) {
            if (child.userData?.isMocapUserVRM || child.userData?.isMocapTarget) {
                return child;
            }
        }
        
        return null;
    }
    
    // ========================================
    // メインセットアップ
    // ========================================
    function setupSubViewWindow() {
        const state = window.subViewWindow;
        const THREE = window.THREE;
        
        createWindowUI();
        
        // サブビュー用カメラ
        state.camera = new THREE.PerspectiveCamera(75, state.size.width / state.size.height, 0.1, 1000);
        state.camera.position.set(0, 1.65, 3);
        
        // サブビュー用レンダラー
        state.renderer = new THREE.WebGLRenderer({
            canvas: state.canvas,
            alpha: true,
            antialias: true
        });
        state.renderer.setSize(state.size.width, state.size.height - 60);
        state.renderer.setPixelRatio(window.devicePixelRatio);
        
        setupKeyControls();
        startRenderLoop();
        addToggleButton();
        
        console.log('✅ サブビューウィンドウ v3.0 初期化完了');
    }
    
    // ========================================
    // ウィンドウUI作成
    // ========================================
    function createWindowUI() {
        const state = window.subViewWindow;
        
        // コンテナ
        const container = document.createElement('div');
        container.id = 'subview-container';
        container.style.cssText = `
            position: fixed;
            top: ${state.position.y}px;
            left: ${state.position.x}px;
            width: ${state.size.width}px;
            height: ${state.size.height}px;
            z-index: 10000;
            display: none;
            background: #000;
            border: 3px solid #00ffff;
            border-radius: 10px;
            overflow: hidden;
            box-shadow: 0 0 20px rgba(0, 255, 255, 0.5);
        `;
        
        // ヘッダー（ドラッグハンドル）
        const header = document.createElement('div');
        header.id = 'subview-header';
        header.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            height: 28px;
            background: linear-gradient(135deg, #1a1a2e, #16213e);
            color: #00ffff;
            font-size: 12px;
            font-weight: bold;
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 0 10px;
            cursor: move;
            user-select: none;
            border-bottom: 1px solid #00ffff;
        `;
        header.innerHTML = `
            <span>📺 サブビュー</span>
            <span id="subview-info" style="color: #00ff00; font-size: 11px;"></span>
        `;
        
        // カメラソース選択エリア
        const selectorArea = document.createElement('div');
        selectorArea.id = 'subview-selector-area';
        selectorArea.style.cssText = `
            position: absolute;
            top: 28px;
            left: 0;
            right: 0;
            height: 32px;
            background: linear-gradient(135deg, #0d0d1a, #1a1a2e);
            display: flex;
            align-items: center;
            padding: 0 10px;
            gap: 8px;
            border-bottom: 1px solid #333;
        `;
        
        const label = document.createElement('span');
        label.style.cssText = 'color: #aaa; font-size: 11px; white-space: nowrap;';
        label.textContent = '視点:';
        
        const select = document.createElement('select');
        select.id = 'subview-source-select';
        select.style.cssText = `
            flex: 1;
            padding: 4px 8px;
            background: #1a1a2e;
            color: #00ffff;
            border: 1px solid #00ffff;
            border-radius: 4px;
            font-size: 12px;
            cursor: pointer;
            outline: none;
        `;
        
        select.innerHTML = `<option value="normal">🎥 ノーマルカメラ</option>`;
        select.addEventListener('change', (e) => setCameraSource(e.target.value));
        
        const refreshBtn = document.createElement('button');
        refreshBtn.textContent = '🔄';
        refreshBtn.title = 'リスト更新';
        refreshBtn.style.cssText = `
            padding: 4px 8px;
            background: #333;
            color: #fff;
            border: 1px solid #555;
            border-radius: 4px;
            cursor: pointer;
            font-size: 12px;
        `;
        refreshBtn.addEventListener('click', updateCameraSourceList);
        
        selectorArea.appendChild(label);
        selectorArea.appendChild(select);
        selectorArea.appendChild(refreshBtn);
        
        // キャンバス
        const canvas = document.createElement('canvas');
        canvas.id = 'subview-canvas';
        canvas.style.cssText = `
            position: absolute;
            top: 60px;
            left: 0;
            width: 100%;
            height: calc(100% - 60px);
            cursor: crosshair;
        `;
        state.canvas = canvas;
        
        // リサイズハンドル
        const resizeHandle = document.createElement('div');
        resizeHandle.id = 'subview-resize';
        resizeHandle.style.cssText = `
            position: absolute;
            bottom: 0;
            right: 0;
            width: 20px;
            height: 20px;
            cursor: se-resize;
            background: linear-gradient(135deg, transparent 50%, #00ffff 50%);
            opacity: 0.7;
        `;
        
        // 十字線
        const crosshair = document.createElement('div');
        crosshair.id = 'subview-crosshair';
        crosshair.style.cssText = `
            position: absolute;
            top: calc(50% + 30px);
            left: 50%;
            transform: translate(-50%, -50%);
            pointer-events: none;
            display: none;
        `;
        crosshair.innerHTML = `
            <div style="width: 20px; height: 2px; background: rgba(255,255,255,0.7); position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);"></div>
            <div style="width: 2px; height: 20px; background: rgba(255,255,255,0.7); position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);"></div>
        `;
        
        // 操作ヒント
        const hint = document.createElement('div');
        hint.id = 'subview-hint';
        hint.style.cssText = `
            position: absolute;
            bottom: 5px;
            left: 5px;
            color: rgba(255,255,255,0.5);
            font-size: 10px;
            pointer-events: none;
        `;
        hint.textContent = 'メインカメラと同じ視点';
        
        container.appendChild(header);
        container.appendChild(selectorArea);
        container.appendChild(canvas);
        container.appendChild(resizeHandle);
        container.appendChild(crosshair);
        container.appendChild(hint);
        document.body.appendChild(container);
        
        state.container = container;
        
        setupDrag(container, header);
        setupResize(container, resizeHandle);
        setupPointerLock(canvas);
    }
    
    // ========================================
    // カメラソースリスト更新
    // ========================================
    function updateCameraSourceList() {
        const select = document.getElementById('subview-source-select');
        if (!select) return;
        
        const state = window.subViewWindow;
        const currentValue = state.cameraSource;
        
        select.innerHTML = '';
        
        // カメラソースグループ
        const mainGroup = document.createElement('optgroup');
        mainGroup.label = '🎥 カメラ';
        
        const normalOpt = document.createElement('option');
        normalOpt.value = 'normal';
        normalOpt.textContent = '🎥 ノーマルカメラ（OrbitControls）';
        mainGroup.appendChild(normalOpt);
        
        const aiDirOpt = document.createElement('option');
        aiDirOpt.value = 'ai_director';
        const aiEnabled = window.aiDirectorCamera?.isEnabled;
        aiDirOpt.textContent = `🎬 AI Director Camera${aiEnabled ? '' : ' (停止中)'}`;
        mainGroup.appendChild(aiDirOpt);
        
        const freeOpt = document.createElement('option');
        freeOpt.value = 'free';
        freeOpt.textContent = '🎮 フリーカメラ（WASD移動）';
        mainGroup.appendChild(freeOpt);
        
        select.appendChild(mainGroup);
        
        // モーキャプユーザー
        const mocapGroup = document.createElement('optgroup');
        mocapGroup.label = '🎭 モーキャプ';
        
        const mocapUserOpt = document.createElement('option');
        mocapUserOpt.value = 'mocap_user';
        const mocapVRM = getMocapUserVRM();
        mocapUserOpt.textContent = `👤 モーキャプユーザー目線${mocapVRM ? '' : ' (未接続)'}`;
        if (!mocapVRM) mocapUserOpt.disabled = true;
        mocapGroup.appendChild(mocapUserOpt);
        
        select.appendChild(mocapGroup);
        
        // VRMキャラクター
        const characters = getVRMCharacters();
        if (characters.length > 0) {
            const charGroup = document.createElement('optgroup');
            charGroup.label = '👥 キャラクター視点';
            
            characters.forEach(char => {
                const option = document.createElement('option');
                option.value = char.id;
                option.textContent = `👤 ${char.name} の視点`;
                if (!char.headBone) {
                    option.textContent += ' (⚠️頭ボーンなし)';
                    option.disabled = true;
                }
                charGroup.appendChild(option);
            });
            
            select.appendChild(charGroup);
        }
        
        // 選択を復元
        if (currentValue && [...select.options].some(o => o.value === currentValue && !o.disabled)) {
            select.value = currentValue;
        } else {
            select.value = 'normal';
            state.cameraSource = 'normal';
        }
        
        console.log(`📺 カメラソース更新: VRM ${characters.length}体, Mocap ${mocapVRM ? 'OK' : 'なし'}`);
    }
    
    // ========================================
    // カメラソース設定
    // ========================================
    function setCameraSource(sourceId) {
        const state = window.subViewWindow;
        state.cameraSource = sourceId;
        state.currentHeadBone = null;
        state.currentVrmGroup = null;
        
        const hint = document.getElementById('subview-hint');
        const crosshair = document.getElementById('subview-crosshair');
        const info = document.getElementById('subview-info');
        
        if (crosshair) crosshair.style.display = 'none';
        
        switch (sourceId) {
            case 'normal':
                if (hint) hint.textContent = 'メインカメラと同じ視点';
                if (info) info.textContent = '';
                console.log('📺 カメラソース: ノーマルカメラ');
                break;
                
            case 'ai_director':
                if (hint) hint.textContent = 'AI Director Cameraの視点';
                if (info) info.textContent = window.aiDirectorCamera?.isEnabled ? '🎬 ON' : '⏸️ 停止中';
                console.log('📺 カメラソース: AI Director Camera');
                break;
                
            case 'mocap_user':
                const mocapVRM = getMocapUserVRM();
                if (mocapVRM) {
                    mocapVRM.traverse(obj => {
                        if (obj.type === 'Bone' && 
                            (obj.name.includes('Head') || obj.name.includes('head'))) {
                            if (obj.name.includes('Normalized') || !state.currentHeadBone) {
                                state.currentHeadBone = obj;
                            }
                        }
                    });
                    state.currentVrmGroup = mocapVRM;
                    if (hint) hint.textContent = 'モーキャプユーザーの視点 / クリックで視点回転';
                    if (info) info.textContent = '🎭';
                    console.log('📺 カメラソース: モーキャプユーザー目線');
                } else {
                    if (hint) hint.textContent = 'モーキャプ未接続';
                }
                break;
                
            case 'free':
                if (hint) hint.textContent = 'クリックで操作 / WASD移動 / ESC解除';
                if (crosshair) crosshair.style.display = 'block';
                if (info) info.textContent = `速度: ${state.speedLevel}`;
                console.log('📺 カメラソース: フリーカメラ');
                break;
                
            default:
                // VRMキャラクター視点
                const characters = getVRMCharacters();
                const char = characters.find(c => c.id === sourceId);
                
                if (char && char.headBone) {
                    state.currentHeadBone = char.headBone;
                    state.currentVrmGroup = char.group;
                    if (hint) hint.textContent = `${char.name}の視点 / クリックで視点回転`;
                    if (info) info.textContent = char.name;
                    console.log(`📺 カメラソース: ${char.name} の頭ボーン`);
                }
                break;
        }
        
        state.yawOffset = 0;
        state.pitchOffset = 0;
    }
    
    // ========================================
    // ドラッグ機能
    // ========================================
    function setupDrag(container, header) {
        const state = window.subViewWindow;
        let isDragging = false;
        let startX, startY, startLeft, startTop;
        
        header.addEventListener('mousedown', (e) => {
            isDragging = true;
            startX = e.clientX;
            startY = e.clientY;
            startLeft = container.offsetLeft;
            startTop = container.offsetTop;
            e.preventDefault();
        });
        
        document.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            
            const dx = e.clientX - startX;
            const dy = e.clientY - startY;
            
            const newLeft = Math.max(0, Math.min(window.innerWidth - container.offsetWidth, startLeft + dx));
            const newTop = Math.max(0, Math.min(window.innerHeight - container.offsetHeight, startTop + dy));
            
            container.style.left = newLeft + 'px';
            container.style.top = newTop + 'px';
            
            state.position.x = newLeft;
            state.position.y = newTop;
        });
        
        document.addEventListener('mouseup', () => {
            isDragging = false;
        });
    }
    
    // ========================================
    // リサイズ機能
    // ========================================
    function setupResize(container, handle) {
        const state = window.subViewWindow;
        let isResizing = false;
        let startX, startY, startWidth, startHeight;
        
        handle.addEventListener('mousedown', (e) => {
            isResizing = true;
            startX = e.clientX;
            startY = e.clientY;
            startWidth = container.offsetWidth;
            startHeight = container.offsetHeight;
            e.preventDefault();
            e.stopPropagation();
        });
        
        document.addEventListener('mousemove', (e) => {
            if (!isResizing) return;
            
            const dx = e.clientX - startX;
            const dy = e.clientY - startY;
            
            const newWidth = Math.max(250, startWidth + dx);
            const newHeight = Math.max(200, startHeight + dy);
            
            container.style.width = newWidth + 'px';
            container.style.height = newHeight + 'px';
            
            state.size.width = newWidth;
            state.size.height = newHeight;
            
            if (state.renderer && state.camera) {
                const canvasHeight = newHeight - 60;
                state.renderer.setSize(newWidth, canvasHeight);
                state.camera.aspect = newWidth / canvasHeight;
                state.camera.updateProjectionMatrix();
            }
        });
        
        document.addEventListener('mouseup', () => {
            isResizing = false;
        });
    }
    
    // ========================================
    // ポインターロック
    // ========================================
    function setupPointerLock(canvas) {
        const state = window.subViewWindow;
        
        canvas.addEventListener('click', () => {
            if (!state.enabled) return;
            if (state.cameraSource === 'free' || state.currentHeadBone) {
                canvas.requestPointerLock();
            }
        });
        
        document.addEventListener('pointerlockchange', () => {
            state.isPointerLocked = document.pointerLockElement === canvas;
            console.log(state.isPointerLocked ? '🔒 ポインターロック ON' : '🔓 ポインターロック OFF');
        });
        
        document.addEventListener('mousemove', (e) => {
            if (!state.enabled || !state.isPointerLocked) return;
            
            if (state.cameraSource === 'free') {
                state.freeCamera.yaw -= e.movementX * state.sensitivity;
                state.freeCamera.pitch -= e.movementY * state.sensitivity;
                state.freeCamera.pitch = Math.max(-Math.PI/2 + 0.1, Math.min(Math.PI/2 - 0.1, state.freeCamera.pitch));
            } else if (state.currentHeadBone) {
                state.yawOffset -= e.movementX * state.sensitivity;
                state.pitchOffset -= e.movementY * state.sensitivity;
                state.pitchOffset = Math.max(-Math.PI/3, Math.min(Math.PI/3, state.pitchOffset));
            }
        });
        
        document.addEventListener('keydown', (e) => {
            if (e.code === 'Escape' && state.isPointerLocked) {
                document.exitPointerLock();
            }
        });
    }
    
    // ========================================
    // キー入力
    // ========================================
    function setupKeyControls() {
        const state = window.subViewWindow;
        
        document.addEventListener('keydown', (e) => {
            if (!state.enabled || !state.isPointerLocked) return;
            if (state.cameraSource !== 'free') return;
            
            switch(e.code) {
                case 'KeyW': state.moveState.forward = true; break;
                case 'KeyS': state.moveState.backward = true; break;
                case 'KeyA': state.moveState.left = true; break;
                case 'KeyD': state.moveState.right = true; break;
                case 'Space':
                    e.preventDefault();
                    if (state.freeCamera.position.y <= 1.65) {
                        state.verticalVelocity = 8;
                    }
                    break;
                case 'Digit1': case 'Numpad1': setSpeedLevel(1); break;
                case 'Digit2': case 'Numpad2': setSpeedLevel(2); break;
                case 'Digit3': case 'Numpad3': setSpeedLevel(3); break;
                case 'Digit4': case 'Numpad4': setSpeedLevel(4); break;
                case 'Digit5': case 'Numpad5': setSpeedLevel(5); break;
            }
        });
        
        document.addEventListener('keyup', (e) => {
            const state = window.subViewWindow;
            switch(e.code) {
                case 'KeyW': state.moveState.forward = false; break;
                case 'KeyS': state.moveState.backward = false; break;
                case 'KeyA': state.moveState.left = false; break;
                case 'KeyD': state.moveState.right = false; break;
            }
        });
    }
    
    function setSpeedLevel(level) {
        const state = window.subViewWindow;
        state.speedLevel = level;
        
        const info = document.getElementById('subview-info');
        if (info && state.cameraSource === 'free') {
            info.textContent = `速度: ${level}`;
        }
    }
    
    // ========================================
    // レンダリングループ
    // ========================================
    function startRenderLoop() {
        const state = window.subViewWindow;
        
        function render() {
            if (!state.enabled || !state.renderer || !state.camera) {
                requestAnimationFrame(render);
                return;
            }
            
            switch (state.cameraSource) {
                case 'normal':
                case 'ai_director':
                    updateFromMainCamera();
                    break;
                case 'free':
                    updateFreeCamera();
                    break;
                case 'mocap_user':
                default:
                    if (state.currentHeadBone) {
                        updateHeadBoneCamera();
                    } else {
                        updateFromMainCamera();
                    }
                    break;
            }
            
            if (window.app && window.app.scene) {
                state.renderer.render(window.app.scene, state.camera);
            }
            
            requestAnimationFrame(render);
        }
        
        render();
        console.log('✅ サブビュー レンダリングループ開始');
    }
    
    // ========================================
    // カメラ更新関数
    // ========================================
    function updateFromMainCamera() {
        const state = window.subViewWindow;
        const mainCamera = window.app?.camera;
        
        if (!state.camera || !mainCamera) return;
        
        state.camera.position.copy(mainCamera.position);
        state.camera.quaternion.copy(mainCamera.quaternion);
        state.camera.fov = mainCamera.fov;
        state.camera.updateProjectionMatrix();
    }
    
    function updateFreeCamera() {
        const state = window.subViewWindow;
        const THREE = window.THREE;
        const fc = state.freeCamera;
        
        if (!state.camera) return;
        
        if (state.isPointerLocked) {
            const multiplier = state.speedMultipliers[state.speedLevel - 1] || 1;
            const speed = state.baseSpeed * multiplier * 0.05;
            
            const forwardX = Math.sin(fc.yaw);
            const forwardZ = Math.cos(fc.yaw);
            const rightX = Math.sin(fc.yaw + Math.PI / 2);
            const rightZ = Math.cos(fc.yaw + Math.PI / 2);
            
            if (state.moveState.forward) {
                fc.position.x -= forwardX * speed;
                fc.position.z -= forwardZ * speed;
            }
            if (state.moveState.backward) {
                fc.position.x += forwardX * speed;
                fc.position.z += forwardZ * speed;
            }
            if (state.moveState.left) {
                fc.position.x -= rightX * speed;
                fc.position.z -= rightZ * speed;
            }
            if (state.moveState.right) {
                fc.position.x += rightX * speed;
                fc.position.z += rightZ * speed;
            }
            
            state.verticalVelocity -= 0.02;
            fc.position.y += state.verticalVelocity;
            
            if (fc.position.y < 1.65) {
                fc.position.y = 1.65;
                state.verticalVelocity = 0;
            }
        }
        
        state.camera.position.set(fc.position.x, fc.position.y, fc.position.z);
        
        const quaternion = new THREE.Quaternion();
        const euler = new THREE.Euler(fc.pitch, fc.yaw, 0, 'YXZ');
        quaternion.setFromEuler(euler);
        state.camera.quaternion.copy(quaternion);
    }
    
    function updateHeadBoneCamera() {
        const state = window.subViewWindow;
        const THREE = window.THREE;
        
        if (!state.camera || !state.currentHeadBone) return;
        
        const headWorldPos = new THREE.Vector3();
        const headWorldQuat = new THREE.Quaternion();
        
        state.currentHeadBone.getWorldPosition(headWorldPos);
        state.currentHeadBone.getWorldQuaternion(headWorldQuat);
        
        const forward = new THREE.Vector3(0, 0, -1);
        forward.applyQuaternion(headWorldQuat);
        
        const up = new THREE.Vector3(0, 1, 0);
        up.applyQuaternion(headWorldQuat);
        
        const eyePos = headWorldPos.clone();
        eyePos.add(up.clone().multiplyScalar(state.eyeHeightOffset));
        eyePos.add(forward.clone().multiplyScalar(state.eyeForwardOffset));
        
        state.camera.position.copy(eyePos);
        
        const euler = new THREE.Euler();
        euler.setFromQuaternion(headWorldQuat, 'YXZ');
        euler.y += state.yawOffset;
        euler.x += state.pitchOffset;
        
        state.camera.quaternion.setFromEuler(euler);
    }
    
    // ========================================
    // トグルボタン追加
    // ========================================
    function addToggleButton() {
        setTimeout(() => {
            const panel = document.getElementById('physics-panel-content');
            if (!panel) {
                console.warn('⚠️ physics-panel-content が見つかりません');
                return;
            }
            
            // 既存ボタンがあれば削除
            const existingBtn = document.getElementById('subview-toggle-btn');
            if (existingBtn) existingBtn.remove();
            
            // FPSモードボタンを探す
            const fpsBtn = document.getElementById('fps-toggle-btn');
            
            const btn = document.createElement('button');
            btn.id = 'subview-toggle-btn';
            btn.innerHTML = '📺 サブビュー OFF';
            btn.style.cssText = `
                width: 100%;
                padding: 6px;
                margin-bottom: 6px;
                background: linear-gradient(135deg, #ff6b6b, #ee5a24);
                color: white;
                border: none;
                border-radius: 6px;
                font-weight: bold;
                cursor: pointer;
                font-size: 10px;
            `;
            
            btn.addEventListener('click', toggleSubView);
            
            if (fpsBtn && fpsBtn.nextSibling) {
                fpsBtn.parentNode.insertBefore(btn, fpsBtn.nextSibling);
            } else {
                panel.insertBefore(btn, panel.firstChild);
            }
            
            console.log('✅ サブビューボタンを追加');
        }, 2500);
    }
    
    // ========================================
    // トグル関数
    // ========================================
    function toggleSubView() {
        const state = window.subViewWindow;
        state.enabled = !state.enabled;
        
        const container = state.container;
        const btn = document.getElementById('subview-toggle-btn');
        
        if (state.enabled) {
            container.style.display = 'block';
            
            if (btn) {
                btn.innerHTML = '📺 サブビュー ON';
                btn.style.background = 'linear-gradient(135deg, #00c853, #00e676)';
            }
            
            updateCameraSourceList();
            
            // フリーカメラの初期位置をメインカメラから取得
            if (window.app && window.app.camera) {
                const cam = window.app.camera;
                state.freeCamera.position.x = cam.position.x;
                state.freeCamera.position.y = cam.position.y;
                state.freeCamera.position.z = cam.position.z;
            }
            
            console.log('📺 サブビュー ON');
            
        } else {
            container.style.display = 'none';
            
            if (btn) {
                btn.innerHTML = '📺 サブビュー OFF';
                btn.style.background = 'linear-gradient(135deg, #ff6b6b, #ee5a24)';
            }
            
            if (state.isPointerLocked) {
                document.exitPointerLock();
            }
            
            console.log('📺 サブビュー OFF');
        }
    }
    
    // グローバル公開
    window.toggleSubView = toggleSubView;
    window.updateSubViewCameraList = updateCameraSourceList;
    window.setSubViewCameraSource = setCameraSource;
    
    // 初期化実行
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => setTimeout(init, 1500));
    } else {
        setTimeout(init, 1500);
    }
    
})();

console.log('✅ fps-wipe-view.js v3.0 読み込み完了');
