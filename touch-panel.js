// Touch Panel Manager - 触るUI
// VRMキャラを触って操作する機能

class TouchPanelManager {
    constructor() {
        this.panel = null;
        this.isDragging = false;
        this.dragOffset = { x: 0, y: 0 };
        
        // モード
        this.currentMode = null; // null, 'flick', 'grab', 'doll'
        
        // つまむモード用
        this.grabbedBone = null;
        this.grabbedBoneNode = null;
        this.originalRotation = null;
        this.grabStartPos = null;
        this.isGrabbing = false;
        this.grabIndicator = null; // 回転表示用球体
        this.grabRing = null; // 回転リング
        
        // デコピン復帰用
        this.flickRestoreTimer = null;
        this.preFlickPose = null; // デコピン前のポーズ
        
        // 人形モード用
        this.dollMode = {
            active: false,
            grabbedPoint: null,
            grabbedBone: null,
            boneVelocities: {},  // ボーンの速度
            lastMousePos: null,
            ragdollBones: [],    // ラグドール対象ボーン
            gravity: 0.015,      // ボーン重力（強め）
            damping: 0.90,       // 減衰（強め）
            animationId: null,
            // 落下物理用
            fallVelocity: 0,          // 落下速度
            isOnGround: false,        // 地面にいるか
            groundY: 0,               // 地面のY座標
            fallGravity: 0.015,       // 落下重力（強め）
            bounceDecay: 0.3,         // バウンス減衰
            impactVelocities: {}      // 着地時の衝撃速度
        };
        
        // レイキャスト用
        this.raycaster = null;
        this.mouse = null;
        
        // ボーンマッピング（クリック検出用）
        this.boneColliders = [];
        
        this.init();
    }
    
    init() {
        this.createPanel();
        this.setupRaycaster();
        
        window.touchPanelManager = this;
        console.log('TouchPanelManager initialized');
    }
    
    createPanel() {
        const style = document.createElement('style');
        style.textContent = `
            #touch-panel {
                position: fixed;
                top: 100px;
                left: 20px;
                width: 140px;
                background: rgba(255, 255, 255, 0.95);
                border-radius: 12px;
                box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
                z-index: 9998;
                display: none;
                flex-direction: column;
                overflow: hidden;
                font-family: 'Segoe UI', 'Yu Gothic', sans-serif;
            }
            #touch-panel.visible { display: flex; }
            
            #touch-panel-header {
                background: linear-gradient(135deg, #ff9a9e 0%, #fad0c4 100%);
                color: white;
                padding: 8px 10px;
                cursor: move;
                display: flex;
                align-items: center;
                justify-content: space-between;
                user-select: none;
                font-size: 12px;
                font-weight: bold;
                text-shadow: 0 1px 2px rgba(0,0,0,0.2);
            }
            
            #touch-panel-header .close-btn {
                background: rgba(255,255,255,0.3);
                border: none;
                color: white;
                width: 20px; height: 20px;
                border-radius: 50%;
                cursor: pointer;
                font-size: 10px;
            }
            #touch-panel-header .close-btn:hover { background: rgba(255,255,255,0.5); }
            
            #touch-panel-body {
                padding: 10px;
                display: flex;
                flex-direction: column;
                gap: 8px;
            }
            
            .touch-btn {
                width: 100%;
                padding: 12px 10px;
                border: 2px solid #e0e0e0;
                border-radius: 10px;
                background: white;
                cursor: pointer;
                font-size: 11px;
                font-weight: 600;
                text-align: center;
                transition: all 0.2s;
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: 4px;
            }
            
            .touch-btn:hover {
                border-color: #ff9a9e;
                background: #fff5f5;
                transform: scale(1.02);
            }
            
            .touch-btn.active {
                background: linear-gradient(135deg, #ff9a9e 0%, #fad0c4 100%);
                color: white;
                border-color: transparent;
                box-shadow: 0 2px 8px rgba(255, 154, 158, 0.4);
            }
            
            .touch-btn .icon { font-size: 24px; }
            .touch-btn .label { font-size: 10px; }
            
            .touch-btn.reset-btn {
                background: linear-gradient(135deg, #a8e6cf 0%, #88d8b0 100%);
                border-color: #88d8b0;
            }
            .touch-btn.reset-btn:hover {
                background: linear-gradient(135deg, #88d8b0 0%, #6bc4a0 100%);
                border-color: #6bc4a0;
            }
            
            #touch-status {
                font-size: 9px;
                color: #888;
                text-align: center;
                padding: 4px;
                background: #f5f5f5;
                border-radius: 4px;
            }
            
            /* トグルボタン */
            #touch-toggle-btn {
                position: fixed;
                bottom: 180px;
                right: 20px;
                width: 50px;
                height: 50px;
                border-radius: 50%;
                background: linear-gradient(135deg, #ff9a9e 0%, #fad0c4 100%);
                color: white;
                border: none;
                font-size: 20px;
                cursor: pointer;
                box-shadow: 0 4px 15px rgba(255, 154, 158, 0.4);
                z-index: 9997;
                display: flex;
                align-items: center;
                justify-content: center;
            }
            #touch-toggle-btn:hover {
                transform: scale(1.1);
            }
            
            /* つまみカーソル */
            body.grab-mode { cursor: grab !important; }
            body.grab-mode canvas { cursor: grab !important; }
            body.grabbing { cursor: grabbing !important; }
            body.grabbing canvas { cursor: grabbing !important; }
            
            body.flick-mode { cursor: pointer !important; }
            body.flick-mode canvas { cursor: pointer !important; }
            
            body.doll-mode { cursor: grab !important; }
            body.doll-mode canvas { cursor: grab !important; }
            body.doll-grabbing { cursor: grabbing !important; }
            body.doll-grabbing canvas { cursor: grabbing !important; }
        `;
        document.head.appendChild(style);
        
        // トグルボタン
        const toggleBtn = document.createElement('button');
        toggleBtn.id = 'touch-toggle-btn';
        toggleBtn.innerHTML = '👆';
        toggleBtn.title = '触るパネル';
        toggleBtn.onclick = () => this.togglePanel();
        document.body.appendChild(toggleBtn);
        
        // パネル
        this.panel = document.createElement('div');
        this.panel.id = 'touch-panel';
        this.panel.innerHTML = `
            <div id="touch-panel-header">
                <span>👆 触る</span>
                <button class="close-btn" id="touch-close">✕</button>
            </div>
            <div id="touch-panel-body">
                <button class="touch-btn" data-mode="flick">
                    <span class="icon">👉</span>
                    <span class="label">デコピン</span>
                </button>
                <button class="touch-btn" data-mode="grab">
                    <span class="icon">🤏</span>
                    <span class="label">つまむ</span>
                </button>
                <button class="touch-btn" data-mode="doll">
                    <span class="icon">🧸</span>
                    <span class="label">人形モード</span>
                </button>
                <button class="touch-btn reset-btn" id="pose-reset-btn">
                    <span class="icon">🔄</span>
                    <span class="label">ポーズリセット</span>
                </button>
                <div id="touch-status">モードを選択</div>
            </div>
        `;
        document.body.appendChild(this.panel);
        
        this.setupEvents();
    }
    
    setupEvents() {
        const self = this;
        const header = document.getElementById('touch-panel-header');
        const closeBtn = document.getElementById('touch-close');
        
        closeBtn.onclick = () => self.hidePanel();
        
        // モードボタン
        this.panel.querySelectorAll('.touch-btn[data-mode]').forEach(btn => {
            btn.onclick = () => {
                const mode = btn.dataset.mode;
                
                // 同じボタンをクリックしたら解除
                if (self.currentMode === mode) {
                    self.setMode(null);
                    btn.classList.remove('active');
                } else {
                    self.setMode(mode);
                    self.panel.querySelectorAll('.touch-btn[data-mode]').forEach(b => b.classList.remove('active'));
                    btn.classList.add('active');
                }
            };
        });
        
        // ポーズリセットボタン
        const resetBtn = document.getElementById('pose-reset-btn');
        if (resetBtn) {
            resetBtn.onclick = () => {
                self.resetPoseToDefault();
            };
        }
        
        // ドラッグ
        header.onmousedown = (e) => {
            if (e.target === closeBtn) return;
            self.isDragging = true;
            const rect = self.panel.getBoundingClientRect();
            self.dragOffset.x = e.clientX - rect.left;
            self.dragOffset.y = e.clientY - rect.top;
            e.preventDefault();
        };
        
        document.addEventListener('mousemove', (e) => {
            if (!self.isDragging) return;
            self.panel.style.left = (e.clientX - self.dragOffset.x) + 'px';
            self.panel.style.top = (e.clientY - self.dragOffset.y) + 'px';
            self.panel.style.right = 'auto';
        });
        
        document.addEventListener('mouseup', () => { self.isDragging = false; });
    }
    
    setupRaycaster() {
        const THREE = window.THREE;
        if (!THREE) return;
        
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();
    }
    
    togglePanel() {
        this.panel.classList.toggle('visible');
    }
    
    showPanel() { this.panel.classList.add('visible'); }
    hidePanel() { 
        this.panel.classList.remove('visible');
        this.setMode(null); // モード解除＆カメラ有効化
    }
    
    setMode(mode) {
        // 前のモードをクリア
        document.body.classList.remove('grab-mode', 'flick-mode', 'grabbing', 'doll-mode', 'doll-grabbing');
        this.removeCanvasListeners();
        
        // 人形モードを終了
        if (this.currentMode === 'doll' && mode !== 'doll') {
            this.exitDollMode();
        }
        
        this.currentMode = mode;
        
        const statusEl = document.getElementById('touch-status');
        
        // カメラ操作の制御
        const controls = window.app?.controls;
        
        if (mode === 'flick') {
            statusEl.textContent = 'VRMをクリック→デコピン！';
            document.body.classList.add('flick-mode');
            this.addCanvasListeners();
            if (controls) controls.enabled = false;
        } else if (mode === 'grab') {
            statusEl.textContent = 'VRMをドラッグで動かす';
            document.body.classList.add('grab-mode');
            this.addCanvasListeners();
            if (controls) controls.enabled = false;
            // モーションを停止
            this.stopCurrentMotion();
        } else if (mode === 'doll') {
            statusEl.textContent = '🧸 人形モード：クリックでつかむ';
            document.body.classList.add('doll-mode');
            this.addCanvasListeners();
            if (controls) controls.enabled = false;
            this.enterDollMode();
        } else {
            statusEl.textContent = 'モードを選択';
            this.panel.querySelectorAll('.touch-btn').forEach(b => b.classList.remove('active'));
            if (controls) controls.enabled = true;
        }
        
        console.log('👆 触るモード:', mode || 'なし', '(カメラ:', controls?.enabled ? '有効' : '無効', ')');
    }
    
    addCanvasListeners() {
        const canvas = document.querySelector('#canvas-container canvas');
        if (!canvas) return;
        
        this.canvasClickHandler = this.onCanvasClick.bind(this);
        this.canvasMouseDownHandler = this.onCanvasMouseDown.bind(this);
        this.canvasMouseMoveHandler = this.onCanvasMouseMove.bind(this);
        this.canvasMouseUpHandler = this.onCanvasMouseUp.bind(this);
        this.canvasWheelHandler = this.onCanvasWheel.bind(this);
        
        canvas.addEventListener('click', this.canvasClickHandler);
        canvas.addEventListener('mousedown', this.canvasMouseDownHandler);
        canvas.addEventListener('wheel', this.canvasWheelHandler, { passive: false });
        document.addEventListener('mousemove', this.canvasMouseMoveHandler);
        document.addEventListener('mouseup', this.canvasMouseUpHandler);
    }
    
    removeCanvasListeners() {
        const canvas = document.querySelector('#canvas-container canvas');
        if (!canvas) return;
        
        if (this.canvasClickHandler) {
            canvas.removeEventListener('click', this.canvasClickHandler);
        }
        if (this.canvasMouseDownHandler) {
            canvas.removeEventListener('mousedown', this.canvasMouseDownHandler);
        }
        if (this.canvasWheelHandler) {
            canvas.removeEventListener('wheel', this.canvasWheelHandler);
        }
        if (this.canvasMouseMoveHandler) {
            document.removeEventListener('mousemove', this.canvasMouseMoveHandler);
        }
        if (this.canvasMouseUpHandler) {
            document.removeEventListener('mouseup', this.canvasMouseUpHandler);
        }
    }
    
    // マウスホイール（つまむモード / 人形モードでつかんでいるときの回転）
    onCanvasWheel(event) {
        // つまむモードでつかんでいる時
        if (this.currentMode === 'grab' && this.isGrabbing && this.grabbedBoneNode) {
            event.preventDefault();
            
            const delta = event.deltaY * 0.01;
            
            // Ctrl: Z軸, Shift: Y軸, 通常: X軸
            if (event.ctrlKey) {
                this.grabbedBoneNode.rotation.z += delta;
                console.log('🔄 Z軸回転:', this.grabbedBoneNode.rotation.z.toFixed(2));
            } else if (event.shiftKey) {
                this.grabbedBoneNode.rotation.y += delta;
                console.log('🔄 Y軸回転:', this.grabbedBoneNode.rotation.y.toFixed(2));
            } else {
                this.grabbedBoneNode.rotation.x += delta;
                console.log('🔄 X軸回転:', this.grabbedBoneNode.rotation.x.toFixed(2));
            }
            return;
        }
        
        // 人形モードでつかんでいる時
        if (this.currentMode === 'doll' && this.dollMode.grabbedBone && this.grabbedBoneNode) {
            event.preventDefault();
            
            const delta = event.deltaY * 0.01;
            
            // Ctrl: Z軸, Shift: Y軸, 通常: X軸
            if (event.ctrlKey) {
                this.grabbedBoneNode.rotation.z += delta;
                console.log('🔄 Z軸回転:', this.grabbedBoneNode.rotation.z.toFixed(2));
            } else if (event.shiftKey) {
                this.grabbedBoneNode.rotation.y += delta;
                console.log('🔄 Y軸回転:', this.grabbedBoneNode.rotation.y.toFixed(2));
            } else {
                this.grabbedBoneNode.rotation.x += delta;
                console.log('🔄 X軸回転:', this.grabbedBoneNode.rotation.x.toFixed(2));
            }
        }
    }
    
    // マウス位置を正規化
    getNormalizedMousePos(event) {
        const canvas = document.querySelector('#canvas-container canvas');
        if (!canvas) return null;
        
        const rect = canvas.getBoundingClientRect();
        return {
            x: ((event.clientX - rect.left) / rect.width) * 2 - 1,
            y: -((event.clientY - rect.top) / rect.height) * 2 + 1
        };
    }
    
    // VRMのボーンをレイキャストで検出
    findBoneAtMouse(event) {
        if (!window.app || !window.app.vrm || !window.app.camera) return null;
        
        const mousePos = this.getNormalizedMousePos(event);
        if (!mousePos) return null;
        
        const THREE = window.THREE;
        this.mouse.set(mousePos.x, mousePos.y);
        this.raycaster.setFromCamera(this.mouse, window.app.camera);
        
        // VRMのシーン全体に対してレイキャスト
        const intersects = this.raycaster.intersectObject(window.app.vrm.scene, true);
        
        if (intersects.length > 0) {
            // 最も近い交差点
            const hit = intersects[0];
            
            // 交差したオブジェクトからボーンを探す
            let bone = this.findNearestBone(hit.point);
            return { bone, point: hit.point, object: hit.object };
        }
        
        return null;
    }
    
    // 最も近いボーンを探す
    findNearestBone(point) {
        if (!window.app || !window.app.vrm) return null;
        
        const THREE = window.THREE;
        const humanoid = window.app.vrm.humanoid;
        if (!humanoid) return null;
        
        const boneNames = [
            'head', 'neck', 'chest', 'spine', 'hips',
            'leftUpperArm', 'leftLowerArm', 'leftHand',
            'rightUpperArm', 'rightLowerArm', 'rightHand',
            'leftUpperLeg', 'leftLowerLeg', 'leftFoot',
            'rightUpperLeg', 'rightLowerLeg', 'rightFoot'
        ];
        
        let nearestBone = null;
        let nearestDist = Infinity;
        
        for (const boneName of boneNames) {
            const boneNode = humanoid.getNormalizedBoneNode(boneName);
            if (!boneNode) continue;
            
            const boneWorldPos = new THREE.Vector3();
            boneNode.getWorldPosition(boneWorldPos);
            
            const dist = point.distanceTo(boneWorldPos);
            if (dist < nearestDist) {
                nearestDist = dist;
                nearestBone = { name: boneName, node: boneNode };
            }
        }
        
        return nearestBone;
    }
    
    // ポーズをデフォルト（Tポーズ）にリセット
    resetPoseToDefault() {
        if (!window.app || !window.app.vrm) {
            console.warn('⚠️ VRMが読み込まれていません');
            return;
        }
        
        const vrm = window.app.vrm;
        const humanoid = vrm.humanoid;
        if (!humanoid) return;
        
        console.log('🔄 ポーズリセット');
        
        // アニメーション停止
        if (window.app.currentAction) {
            window.app.currentAction.stop();
        }
        
        // 人形モードの場合は終了
        if (this.dollMode.active) {
            this.exitDollMode();
            this.setMode(null);
        }
        
        // VRMの位置をリセット
        vrm.scene.position.set(0, 0, 0);
        vrm.scene.rotation.set(0, 0, 0);
        
        // 全ボーンをリセット
        const boneNames = [
            'hips', 'spine', 'chest', 'upperChest', 'neck', 'head',
            'leftShoulder', 'leftUpperArm', 'leftLowerArm', 'leftHand',
            'rightShoulder', 'rightUpperArm', 'rightLowerArm', 'rightHand',
            'leftUpperLeg', 'leftLowerLeg', 'leftFoot', 'leftToes',
            'rightUpperLeg', 'rightLowerLeg', 'rightFoot', 'rightToes'
        ];
        
        boneNames.forEach(boneName => {
            const bone = humanoid.getNormalizedBoneNode(boneName);
            if (bone) {
                bone.rotation.set(0, 0, 0);
            }
        });
        
        // 表情リセット
        this.resetExpression();
        
        // ステータス更新
        const statusEl = document.getElementById('touch-status');
        if (statusEl) {
            statusEl.textContent = '✅ ポーズリセット完了';
            setTimeout(() => {
                statusEl.textContent = 'モードを選択';
            }, 2000);
        }
        
        console.log('✅ ポーズリセット完了');
    }
    
    // 現在のモーションを停止
    stopCurrentMotion() {
        if (window.app && window.app.currentAction) {
            window.app.currentAction.stop();
            console.log('⏹️ モーション停止');
        }
    }
    
    // キャンバスクリック
    onCanvasClick(event) {
        if (this.currentMode === 'flick') {
            const result = this.findBoneAtMouse(event);
            if (result && result.bone) {
                console.log('👉 デコピン!', result.bone.name);
                this.playFlickMotion();
                this.spawnFlickParticles(result.point);
            }
        }
        // 人形モードはマウスダウンで処理
    }
    
    // デコピンモーション再生
    async playFlickMotion() {
        if (!window.app || !window.app.vrm) return;
        
        // 前回のタイマーをクリア
        if (this.flickRestoreTimer) {
            clearTimeout(this.flickRestoreTimer);
            this.flickRestoreTimer = null;
        }
        
        // 現在のポーズを保存
        this.saveCurrentPose();
        
        // 驚く表情を設定
        this.setSurprisedExpression();
        
        try {
            const THREE = window.THREE;
            const loader = new window.GLTFLoaderClass();
            const { VRMAnimationLoaderPlugin, createVRMAnimationClip } = await import('@pixiv/three-vrm-animation');
            
            loader.register((parser) => new VRMAnimationLoaderPlugin(parser));
            
            // うしろにころぶモーション
            const motionFile = 'アンリアルキャラうしろにころぶ.vrma';
            const gltf = await loader.loadAsync('./motions/' + encodeURIComponent(motionFile));
            const vrmAnim = gltf.userData.vrmAnimation || gltf.userData.vrmAnimations?.[0];
            
            if (!vrmAnim) return;
            
            if (window.app.currentAction) window.app.currentAction.stop();
            if (!window.app.mixer) window.app.mixer = new THREE.AnimationMixer(window.app.vrm.scene);
            
            const clip = createVRMAnimationClip(vrmAnim, window.app.vrm);
            window.app.currentAction = window.app.mixer.clipAction(clip);
            window.app.currentAction.reset();
            window.app.currentAction.setLoop(THREE.LoopOnce);
            window.app.currentAction.clampWhenFinished = true;
            window.app.currentAction.play();
            
            console.log('🎬 デコピンモーション再生（驚き表情）');
            
            // 7秒後に元のポーズに戻す
            this.flickRestoreTimer = setTimeout(() => {
                this.restorePose();
            }, 7000);
            
        } catch (e) {
            console.warn('デコピンモーション再生エラー:', e);
        }
    }
    
    // 驚く表情を設定
    setSurprisedExpression() {
        if (!window.app || !window.app.vrm) return;
        
        const vrm = window.app.vrm;
        const expressionManager = vrm.expressionManager;
        if (!expressionManager) return;
        
        // 全表情をリセット
        const expressions = ['happy', 'angry', 'sad', 'relaxed', 'surprised', 'neutral'];
        expressions.forEach(exp => {
            try { expressionManager.setValue(exp, 0); } catch(e) {}
        });
        
        // 驚き表情を設定
        try {
            expressionManager.setValue('surprised', 1.0);
            console.log('😲 驚き表情設定');
        } catch(e) {
            // surprisedがない場合は目を大きく
            try {
                expressionManager.setValue('aa', 0.5); // 口を開ける
            } catch(e2) {}
        }
    }
    
    // 表情をリセット
    resetExpression() {
        if (!window.app || !window.app.vrm) return;
        
        const vrm = window.app.vrm;
        const expressionManager = vrm.expressionManager;
        if (!expressionManager) return;
        
        // 全表情をリセット
        const expressions = ['happy', 'angry', 'sad', 'relaxed', 'surprised', 'neutral', 'aa', 'ih', 'ou', 'ee', 'oh'];
        expressions.forEach(exp => {
            try { expressionManager.setValue(exp, 0); } catch(e) {}
        });
        
        console.log('😐 表情リセット');
    }
    
    // 現在のポーズを保存
    saveCurrentPose() {
        if (!window.app || !window.app.vrm) return;
        
        const humanoid = window.app.vrm.humanoid;
        if (!humanoid) return;
        
        this.preFlickPose = {
            position: window.app.vrm.scene.position.clone(),
            rotation: window.app.vrm.scene.rotation.clone(),
            bones: {}
        };
        
        const boneNames = [
            'hips', 'spine', 'chest', 'upperChest', 'neck', 'head',
            'leftShoulder', 'leftUpperArm', 'leftLowerArm', 'leftHand',
            'rightShoulder', 'rightUpperArm', 'rightLowerArm', 'rightHand',
            'leftUpperLeg', 'leftLowerLeg', 'leftFoot',
            'rightUpperLeg', 'rightLowerLeg', 'rightFoot'
        ];
        
        for (const boneName of boneNames) {
            const bone = humanoid.getNormalizedBoneNode(boneName);
            if (bone) {
                this.preFlickPose.bones[boneName] = bone.rotation.clone();
            }
        }
        
        console.log('💾 ポーズ保存');
    }
    
    // ポーズを復元
    restorePose() {
        if (!window.app || !window.app.vrm || !this.preFlickPose) return;
        
        const humanoid = window.app.vrm.humanoid;
        if (!humanoid) return;
        
        console.log('↩️ ポーズ復元開始');
        
        // アニメーションを停止
        if (window.app.currentAction) {
            window.app.currentAction.stop();
        }
        
        // 表情もリセット
        this.resetExpression();
        
        // 位置と回転を復元（スムーズに）
        const startPos = window.app.vrm.scene.position.clone();
        const startRot = window.app.vrm.scene.rotation.clone();
        const targetPos = this.preFlickPose.position;
        const targetRot = this.preFlickPose.rotation;
        
        // ボーンの開始状態を保存
        const boneStarts = {};
        for (const boneName in this.preFlickPose.bones) {
            const bone = humanoid.getNormalizedBoneNode(boneName);
            if (bone) {
                boneStarts[boneName] = bone.rotation.clone();
            }
        }
        
        // スムーズに復元
        let progress = 0;
        const duration = 1.0; // 1秒で復元
        const startTime = performance.now();
        
        const animate = () => {
            const elapsed = (performance.now() - startTime) / 1000;
            progress = Math.min(1, elapsed / duration);
            
            // イージング
            const ease = 1 - Math.pow(1 - progress, 3); // easeOutCubic
            
            // 位置を補間
            window.app.vrm.scene.position.lerpVectors(startPos, targetPos, ease);
            
            // ボーンを補間
            for (const boneName in this.preFlickPose.bones) {
                const bone = humanoid.getNormalizedBoneNode(boneName);
                if (bone && boneStarts[boneName]) {
                    bone.rotation.x = boneStarts[boneName].x + (this.preFlickPose.bones[boneName].x - boneStarts[boneName].x) * ease;
                    bone.rotation.y = boneStarts[boneName].y + (this.preFlickPose.bones[boneName].y - boneStarts[boneName].y) * ease;
                    bone.rotation.z = boneStarts[boneName].z + (this.preFlickPose.bones[boneName].z - boneStarts[boneName].z) * ease;
                }
            }
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                console.log('✅ ポーズ復元完了');
                this.preFlickPose = null;
            }
        };
        
        animate();
    }
    
    // デコピンパーティクル
    spawnFlickParticles(position) {
        const THREE = window.THREE;
        if (!THREE || !window.app || !window.app.scene) return;
        
        // 衝撃波的なパーティクル
        for (let i = 0; i < 15; i++) {
            const geometry = new THREE.SphereGeometry(0.05 + Math.random() * 0.05, 8, 8);
            const material = new THREE.MeshBasicMaterial({
                color: 0xffaa00,
                transparent: true,
                opacity: 1.0
            });
            
            const particle = new THREE.Mesh(geometry, material);
            particle.position.copy(position);
            
            const angle = Math.random() * Math.PI * 2;
            const speed = 0.1 + Math.random() * 0.1;
            
            particle.userData = {
                velocity: new THREE.Vector3(
                    Math.cos(angle) * speed,
                    0.05 + Math.random() * 0.1,
                    Math.sin(angle) * speed
                ),
                life: 1.0,
                decay: 0.03
            };
            
            window.app.scene.add(particle);
            
            // アニメーション
            const animate = () => {
                particle.position.add(particle.userData.velocity);
                particle.userData.velocity.y -= 0.005;
                particle.userData.life -= particle.userData.decay;
                particle.material.opacity = particle.userData.life;
                particle.scale.setScalar(particle.userData.life);
                
                if (particle.userData.life > 0) {
                    requestAnimationFrame(animate);
                } else {
                    window.app.scene.remove(particle);
                    particle.geometry.dispose();
                    particle.material.dispose();
                }
            };
            animate();
        }
    }
    
    // マウスダウン（つまむモード / 人形モード）
    onCanvasMouseDown(event) {
        if (this.currentMode === 'grab') {
            const result = this.findBoneAtMouse(event);
            if (result && result.bone) {
                this.isGrabbing = true;
                this.grabbedBone = result.bone.name;
                this.grabbedBoneNode = result.bone.node;
                this.originalRotation = result.bone.node.rotation.clone();
                this.grabStartPos = this.getNormalizedMousePos(event);
                
                document.body.classList.add('grabbing');
                document.body.classList.remove('grab-mode');
                
                // 回転インジケーターを作成
                this.createGrabIndicator(result.bone.node);
                
                console.log('🤏 つまみ開始:', this.grabbedBone);
                document.getElementById('touch-status').textContent = `${this.grabbedBone} (ホイール:X / Shift:Y / Ctrl:Z)`;
            }
        } else if (this.currentMode === 'doll') {
            this.onDollMouseDown(event);
        }
    }
    
    // 回転インジケーター作成
    createGrabIndicator(boneNode) {
        const THREE = window.THREE;
        if (!THREE || !window.app || !window.app.scene) return;
        
        // 削除（前回のが残っている場合）
        this.removeGrabIndicator();
        
        // 赤い半透明球体（支点）
        const sphereGeo = new THREE.SphereGeometry(0.05, 16, 16);
        const sphereMat = new THREE.MeshBasicMaterial({
            color: 0xff3333,
            transparent: true,
            opacity: 0.7
        });
        this.grabIndicator = new THREE.Mesh(sphereGeo, sphereMat);
        
        // 回転リング（X軸：赤、Y軸：緑、Z軸：青）
        const ringGroup = new THREE.Group();
        
        // X軸リング（赤）
        const ringGeoX = new THREE.TorusGeometry(0.12, 0.008, 8, 32);
        const ringMatX = new THREE.MeshBasicMaterial({ color: 0xff0000, transparent: true, opacity: 0.6 });
        const ringX = new THREE.Mesh(ringGeoX, ringMatX);
        ringX.rotation.y = Math.PI / 2;
        ringGroup.add(ringX);
        
        // Y軸リング（緑）
        const ringGeoY = new THREE.TorusGeometry(0.12, 0.008, 8, 32);
        const ringMatY = new THREE.MeshBasicMaterial({ color: 0x00ff00, transparent: true, opacity: 0.6 });
        const ringY = new THREE.Mesh(ringGeoY, ringMatY);
        ringY.rotation.x = Math.PI / 2;
        ringGroup.add(ringY);
        
        // Z軸リング（青）
        const ringGeoZ = new THREE.TorusGeometry(0.12, 0.008, 8, 32);
        const ringMatZ = new THREE.MeshBasicMaterial({ color: 0x0088ff, transparent: true, opacity: 0.6 });
        const ringZ = new THREE.Mesh(ringGeoZ, ringMatZ);
        ringGroup.add(ringZ);
        
        this.grabRing = ringGroup;
        
        // ボーンにアタッチ
        boneNode.add(this.grabIndicator);
        boneNode.add(this.grabRing);
    }
    
    // 回転インジケーター削除
    removeGrabIndicator() {
        if (this.grabIndicator && this.grabIndicator.parent) {
            this.grabIndicator.parent.remove(this.grabIndicator);
            this.grabIndicator.geometry.dispose();
            this.grabIndicator.material.dispose();
            this.grabIndicator = null;
        }
        
        if (this.grabRing && this.grabRing.parent) {
            this.grabRing.parent.remove(this.grabRing);
            // 子要素も削除
            this.grabRing.children.forEach(child => {
                child.geometry.dispose();
                child.material.dispose();
            });
            this.grabRing = null;
        }
    }
    
    // マウス移動（つまむモード / 人形モード）
    onCanvasMouseMove(event) {
        if (this.currentMode === 'grab' && this.isGrabbing) {
            if (!this.grabbedBoneNode) return;
            
            const currentPos = this.getNormalizedMousePos(event);
            if (!currentPos || !this.grabStartPos) return;
            
            // マウス移動量から回転を計算
            const deltaX = currentPos.x - this.grabStartPos.x;
            const deltaY = currentPos.y - this.grabStartPos.y;
            
            const sensitivity = 2.0;
            
            // Ctrl: Z軸, Shift: Y軸, 通常: X軸
            if (event.ctrlKey) {
                // ===== Ctrl押しているとき: Z軸回転（傾き）=====
                this.grabbedBoneNode.rotation.z = this.originalRotation.z + deltaX * sensitivity;
            } else if (event.shiftKey) {
                // ===== Shift押しているとき: Y軸回転（ひねり）=====
                this.grabbedBoneNode.rotation.y = this.originalRotation.y + deltaX * sensitivity;
            } else {
                // ===== 通常時: X軸回転（曲げ伸ばし）=====
                this.grabbedBoneNode.rotation.x = this.originalRotation.x + deltaY * sensitivity;
            }
        } else if (this.currentMode === 'doll') {
            this.onDollMouseMove(event);
        }
    }
    
    // マウスアップ（つまむモード / 人形モード）
    onCanvasMouseUp(event) {
        if (this.currentMode === 'grab' && this.isGrabbing) {
            console.log('🤏 つまみ終了:', this.grabbedBone);
            document.getElementById('touch-status').textContent = 'VRMをドラッグで動かす';
            
            // インジケーターを削除
            this.removeGrabIndicator();
            
            this.isGrabbing = false;
            this.grabbedBone = null;
            this.grabbedBoneNode = null;
            this.originalRotation = null;
            this.grabStartPos = null;
            
            document.body.classList.remove('grabbing');
            document.body.classList.add('grab-mode');
        } else if (this.currentMode === 'doll') {
            this.onDollMouseUp(event);
        }
    }
    
    // クリーンアップ
    destroy() {
        this.removeCanvasListeners();
        this.removeGrabIndicator();
        this.exitDollMode();
        if (this.flickRestoreTimer) {
            clearTimeout(this.flickRestoreTimer);
        }
        this.setMode(null);
    }
    
    // ========================================
    // 人形モード
    // ========================================
    
    enterDollMode() {
        if (!window.app || !window.app.vrm) return;
        
        console.log('🧸 人形モード開始');
        
        // 目を閉じる
        this.setDollExpression();
        
        // アニメーションを停止
        if (window.app.currentAction) {
            window.app.currentAction.stop();
        }
        
        // 自動まばたきを停止
        this.savedBlinkEnabled = window.autoBlinkEnabled;
        window.autoBlinkEnabled = false;
        console.log('👁️ 自動まばたき停止');
        
        // VRMコライダーを無効化
        this.disableVRMColliders();
        
        // ラグドールボーンの初期化
        this.dollMode.active = true;
        this.dollMode.boneVelocities = {};
        this.dollMode.ragdollBones = [
            'head', 'neck', 
            'leftUpperArm', 'leftLowerArm', 'leftHand',
            'rightUpperArm', 'rightLowerArm', 'rightHand',
            'leftUpperLeg', 'leftLowerLeg', 'leftFoot',
            'rightUpperLeg', 'rightLowerLeg', 'rightFoot',
            'spine', 'chest', 'upperChest'
        ];
        
        // 各ボーンの速度を初期化
        this.dollMode.ragdollBones.forEach(boneName => {
            this.dollMode.boneVelocities[boneName] = { x: 0, y: 0, z: 0 };
        });
        
        // ラグドールアニメーション開始
        this.startRagdollAnimation();
    }
    
    exitDollMode() {
        if (!this.dollMode.active) return;
        
        console.log('🧸 人形モード終了');
        
        this.dollMode.active = false;
        this.dollMode.grabbedBone = null;
        
        // アニメーション停止
        if (this.dollMode.animationId) {
            cancelAnimationFrame(this.dollMode.animationId);
            this.dollMode.animationId = null;
        }
        
        // まばたき強制を停止
        this.stopBlinkOverride();
        
        // 表情リセット
        this.resetExpression();
        
        // 自動まばたきを復元
        if (this.savedBlinkEnabled !== undefined) {
            window.autoBlinkEnabled = this.savedBlinkEnabled;
            console.log('👁️ 自動まばたき復元:', window.autoBlinkEnabled);
        }
        
        // VRMコライダーを復元
        this.enableVRMColliders();
        
        // インジケーター削除
        this.removeGrabIndicator();
    }
    
    setDollExpression() {
        if (!window.app || !window.app.vrm) return;
        
        const expressionManager = window.app.vrm.expressionManager;
        if (!expressionManager) return;
        
        // 全表情リセット
        const expressions = ['happy', 'angry', 'sad', 'relaxed', 'surprised', 'neutral', 'aa'];
        expressions.forEach(exp => {
            try { expressionManager.setValue(exp, 0); } catch(e) {}
        });
        
        // 目を閉じる
        try {
            expressionManager.setValue('blink', 1.0);
            console.log('😴 目を閉じる');
        } catch(e) {
            try {
                expressionManager.setValue('blinkLeft', 1.0);
                expressionManager.setValue('blinkRight', 1.0);
            } catch(e2) {}
        }
        
        // まばたきを強制的に維持するループを開始
        this.startBlinkOverride();
    }
    
    // まばたきを強制的に1.0に維持
    startBlinkOverride() {
        if (this.blinkOverrideId) return;
        
        const override = () => {
            if (!this.dollMode.active) {
                this.blinkOverrideId = null;
                return;
            }
            
            if (window.app && window.app.vrm && window.app.vrm.expressionManager) {
                const em = window.app.vrm.expressionManager;
                try {
                    em.setValue('blink', 1.0);
                } catch(e) {
                    try {
                        em.setValue('blinkLeft', 1.0);
                        em.setValue('blinkRight', 1.0);
                    } catch(e2) {}
                }
            }
            
            this.blinkOverrideId = requestAnimationFrame(override);
        };
        override();
    }
    
    // まばたき強制を停止
    stopBlinkOverride() {
        if (this.blinkOverrideId) {
            cancelAnimationFrame(this.blinkOverrideId);
            this.blinkOverrideId = null;
        }
    }
    
    // VRMコライダーを無効化
    disableVRMColliders() {
        console.log('🧸 VRMコライダー無効化開始...');
        console.log('  - window.vrmColliders:', window.vrmColliders?.length || 0);
        console.log('  - window.vrmColliderMeshes:', window.vrmColliderMeshes?.length || 0);
        
        // コライダーの状態を保存
        this.savedCollidersEnabled = window.vrmCollidersEnabled;
        window.vrmCollidersEnabled = false;
        
        // コライダーのワイヤーフレームも非表示
        if (window.vrmColliderHelpers) {
            window.vrmColliderHelpers.forEach(helper => {
                if (helper) helper.visible = false;
            });
        }
        
        // VRM SpringBoneのコライダーを無効化（各コライダーの半径を0に）
        if (window.app && window.app.vrm && window.app.vrm.springBoneManager) {
            const sbm = window.app.vrm.springBoneManager;
            // colliderGroupsは読み取り専用なので、各コライダーの半径を保存・0にする
            if (sbm.colliderGroups && sbm.colliderGroups.length > 0) {
                this.savedSpringBoneColliderRadii = [];
                sbm.colliderGroups.forEach((group, gi) => {
                    if (group.colliders) {
                        group.colliders.forEach((collider, ci) => {
                            if (collider.shape && collider.shape.radius !== undefined) {
                                this.savedSpringBoneColliderRadii.push({
                                    groupIndex: gi,
                                    colliderIndex: ci,
                                    radius: collider.shape.radius
                                });
                                collider.shape.radius = 0;
                            }
                        });
                    }
                });
                console.log('🧸 SpringBoneコライダー半径を0に:', this.savedSpringBoneColliderRadii.length);
            }
        }
        
        // ========================================
        // physics-system.js のVRMコライダーを完全に削除
        // ========================================
        
        // 1. コライダーデータを保存
        if (window.vrmColliders && window.vrmColliders.length > 0) {
            this.savedVrmCollidersData = [...window.vrmColliders];
            
            // 物理ワールドからbodyを削除
            window.vrmColliders.forEach(collider => {
                if (collider.body && window.physicsWorld) {
                    try {
                        window.physicsWorld.removeBody(collider.body);
                    } catch(e) {
                        console.log('body削除スキップ');
                    }
                }
            });
            
            window.vrmColliders = [];
            console.log('🧸 vrmColliders をクリア');
        }
        
        // 2. コライダー表示用メッシュを削除（緑の球体）
        if (window.vrmColliderMeshes && window.vrmColliderMeshes.length > 0) {
            this.savedVrmColliderMeshes = [...window.vrmColliderMeshes];
            
            window.vrmColliderMeshes.forEach(mesh => {
                if (mesh && window.app && window.app.scene) {
                    window.app.scene.remove(mesh);
                }
            });
            
            window.vrmColliderMeshes = [];
            console.log('🧸 vrmColliderMeshes をシーンから削除');
        }
        
        // 3. シーン内の全ての vrmCollider 名前を持つオブジェクトを強制削除
        if (window.app && window.app.scene) {
            const toRemove = [];
            window.app.scene.traverse(obj => {
                if (obj.name && obj.name.includes('vrmCollider')) {
                    toRemove.push(obj);
                }
                // 緑色のワイヤーフレーム球体も探す
                if (obj.material && obj.material.color) {
                    const c = obj.material.color;
                    if (c.r === 0 && c.g > 0.9 && c.b > 0.4 && c.b < 0.6) {
                        toRemove.push(obj);
                    }
                }
            });
            toRemove.forEach(obj => {
                window.app.scene.remove(obj);
                if (obj.geometry) obj.geometry.dispose();
                if (obj.material) obj.material.dispose();
            });
            if (toRemove.length > 0) {
                console.log('🧸 シーンからコライダーメッシュを強制削除:', toRemove.length);
            }
        }
        
        // 4. コライダー表示フラグを保存してOFF
        this.savedShowVRMColliders = window.showVRMColliders;
        window.showVRMColliders = false;
        
        // 人形モードフラグをグローバルに設定
        window.dollModeActive = true;
        
        console.log('✅ VRMコライダー完全無効化完了');
    }
    
    // VRMコライダーを有効化
    enableVRMColliders() {
        console.log('🧸 VRMコライダー復元開始...');
        
        // 人形モードフラグをクリア
        window.dollModeActive = false;
        
        // 保存した状態に復元
        if (this.savedCollidersEnabled !== undefined) {
            window.vrmCollidersEnabled = this.savedCollidersEnabled;
        } else {
            window.vrmCollidersEnabled = true;
        }
        
        // コライダーのワイヤーフレームも復元（表示設定に応じて）
        if (window.vrmColliderHelpers && this.savedShowVRMColliders) {
            window.vrmColliderHelpers.forEach(helper => {
                if (helper) helper.visible = true;
            });
        }
        
        // SpringBone コライダーの半径を復元
        if (window.app && window.app.vrm && window.app.vrm.springBoneManager && this.savedSpringBoneColliderRadii) {
            const sbm = window.app.vrm.springBoneManager;
            this.savedSpringBoneColliderRadii.forEach(saved => {
                const group = sbm.colliderGroups[saved.groupIndex];
                if (group && group.colliders && group.colliders[saved.colliderIndex]) {
                    const collider = group.colliders[saved.colliderIndex];
                    if (collider.shape) {
                        collider.shape.radius = saved.radius;
                    }
                }
            });
            console.log('🧸 SpringBoneコライダー半径復元:', this.savedSpringBoneColliderRadii.length);
            this.savedSpringBoneColliderRadii = null;
        }
        
        // ========================================
        // physics-system.js のVRMコライダーを復元
        // ========================================
        
        // 1. コライダーデータを復元（物理ワールドに再追加）
        if (this.savedVrmCollidersData && this.savedVrmCollidersData.length > 0) {
            this.savedVrmCollidersData.forEach(collider => {
                if (collider.body && window.physicsWorld) {
                    try {
                        window.physicsWorld.addBody(collider.body);
                    } catch(e) {
                        console.log('body追加スキップ');
                    }
                }
            });
            window.vrmColliders = this.savedVrmCollidersData;
            this.savedVrmCollidersData = null;
            console.log('🧸 vrmColliders 復元');
        }
        
        // 2. コライダーメッシュを復元（緑の球体）- 表示設定が有効なら
        if (this.savedVrmColliderMeshes && this.savedVrmColliderMeshes.length > 0 && this.savedShowVRMColliders) {
            this.savedVrmColliderMeshes.forEach(mesh => {
                if (mesh && window.app && window.app.scene) {
                    window.app.scene.add(mesh);
                }
            });
            window.vrmColliderMeshes = this.savedVrmColliderMeshes;
            console.log('🧸 vrmColliderMeshes シーンに復元');
        } else {
            // メッシュを破棄
            if (this.savedVrmColliderMeshes) {
                this.savedVrmColliderMeshes.forEach(mesh => {
                    if (mesh) {
                        if (mesh.geometry) mesh.geometry.dispose();
                        if (mesh.material) mesh.material.dispose();
                    }
                });
            }
        }
        this.savedVrmColliderMeshes = null;
        
        // 3. コライダー表示フラグを復元
        if (this.savedShowVRMColliders !== undefined) {
            window.showVRMColliders = this.savedShowVRMColliders;
            this.savedShowVRMColliders = undefined;
        }
        
        console.log('✅ VRMコライダー復元完了');
    }
    
    startRagdollAnimation() {
        const animate = () => {
            if (!this.dollMode.active) return;
            
            this.updateRagdoll();
            this.dollMode.animationId = requestAnimationFrame(animate);
        };
        animate();
    }
    
    updateRagdoll() {
        if (!window.app || !window.app.vrm) return;
        
        const humanoid = window.app.vrm.humanoid;
        if (!humanoid) return;
        
        const THREE = window.THREE;
        const gravity = this.dollMode.gravity;
        const damping = this.dollMode.damping;
        const grabbedBone = this.dollMode.grabbedBone;
        const vrm = window.app.vrm;
        
        // ボーンごとの可動域制限
        const boneLimits = {
            head: { x: [-0.4, 0.4], z: [-0.3, 0.3] },
            neck: { x: [-0.3, 0.3], z: [-0.2, 0.2] },
            spine: { x: [-0.5, 0.5], z: [-0.4, 0.4] },
            chest: { x: [-0.4, 0.4], z: [-0.3, 0.3] },
            upperChest: { x: [-0.3, 0.3], z: [-0.25, 0.25] },
            hips: { x: [-0.6, 0.6], z: [-0.5, 0.5] },
            leftUpperArm: { x: [-1.5, 1.5], z: [-1.0, 1.0] },
            rightUpperArm: { x: [-1.5, 1.5], z: [-1.0, 1.0] },
            leftLowerArm: { x: [-1.5, 1.5], z: [-1.0, 1.0] },
            rightLowerArm: { x: [-1.5, 1.5], z: [-1.0, 1.0] },
            leftHand: { x: [-0.8, 0.8], z: [-0.5, 0.5] },
            rightHand: { x: [-0.8, 0.8], z: [-0.5, 0.5] },
            leftUpperLeg: { x: [-1.2, 1.2], z: [-0.6, 0.6] },
            rightUpperLeg: { x: [-1.2, 1.2], z: [-0.6, 0.6] },
            leftLowerLeg: { x: [-1.5, 0.1], z: [-0.3, 0.3] },
            rightLowerLeg: { x: [-1.5, 0.1], z: [-0.3, 0.3] },
            leftFoot: { x: [-0.5, 0.5], z: [-0.3, 0.3] },
            rightFoot: { x: [-0.5, 0.5], z: [-0.3, 0.3] }
        };
        
        // ========================================
        // 落下物理
        // ========================================
        if (!grabbedBone) {
            // つかんでいない場合は落下
            this.dollMode.fallVelocity += this.dollMode.fallGravity;
            vrm.scene.position.y -= this.dollMode.fallVelocity;
            
            // 地面判定
            if (vrm.scene.position.y <= this.dollMode.groundY) {
                vrm.scene.position.y = this.dollMode.groundY;
                
                // 着地時の衝撃
                if (!this.dollMode.isOnGround && this.dollMode.fallVelocity > 0.01) {
                    console.log('💥 着地! 速度:', this.dollMode.fallVelocity.toFixed(3));
                    
                    // 衝撃でボーンを揺らす
                    const impactForce = Math.min(this.dollMode.fallVelocity * 3, 0.3);
                    this.dollMode.ragdollBones.forEach(boneName => {
                        const vel = this.dollMode.boneVelocities[boneName];
                        if (vel) {
                            vel.x += (Math.random() - 0.5) * impactForce;
                            vel.z += (Math.random() - 0.5) * impactForce;
                        }
                    });
                    
                    // 体を前か後ろに倒す
                    const hipsBone = humanoid.getNormalizedBoneNode('hips');
                    if (hipsBone) {
                        // ランダムに前か後ろに倒れる
                        const fallDirection = Math.random() > 0.5 ? 1 : -1;
                        this.dollMode.boneVelocities['hips'] = this.dollMode.boneVelocities['hips'] || { x: 0, y: 0, z: 0 };
                        this.dollMode.boneVelocities['hips'].x += impactForce * fallDirection * 2;
                    }
                }
                
                this.dollMode.isOnGround = true;
                this.dollMode.fallVelocity = 0;
            } else {
                this.dollMode.isOnGround = false;
            }
        } else {
            // つかんでいる場合は落下リセット
            this.dollMode.fallVelocity = 0;
            this.dollMode.isOnGround = false;
        }
        
        // ========================================
        // つかんでいるときの垂れ下がり重力
        // ========================================
        const hangingGravity = grabbedBone ? gravity * 1.5 : 0; // つかんでいるときは垂れ下がり重力を強める
        
        // ========================================
        // 地面にいるときの物理（倒れる）
        // ========================================
        const groundGravity = this.dollMode.isOnGround ? gravity * 2 : gravity;
        const groundDamping = this.dollMode.isOnGround ? 0.88 : damping;
        
        // hipsをラグドールに追加（倒れるため）
        if (this.dollMode.isOnGround && !this.dollMode.ragdollBones.includes('hips')) {
            this.dollMode.ragdollBones.push('hips');
            this.dollMode.boneVelocities['hips'] = { x: 0, y: 0, z: 0 };
        }
        
        // ========================================
        // 各ボーンにラグドール物理を適用
        // ========================================
        this.dollMode.ragdollBones.forEach(boneName => {
            // つかんでいるボーンはスキップ
            if (boneName === grabbedBone) return;
            
            const bone = humanoid.getNormalizedBoneNode(boneName);
            if (!bone) return;
            
            const vel = this.dollMode.boneVelocities[boneName];
            if (!vel) return;
            
            const limits = boneLimits[boneName] || { x: [-1.5, 1.5], z: [-1.0, 1.0] };
            
            // 重力を加える
            if (boneName.includes('Arm') || boneName.includes('Hand')) {
                vel.x += groundGravity * 0.5;
                // つかんでいるときは追加の垂れ下がり重力
                if (grabbedBone) vel.x += hangingGravity * 0.5;
            } else if (boneName.includes('Leg') || boneName.includes('Foot')) {
                // 地面にいるときは足も動く
                if (this.dollMode.isOnGround) {
                    vel.x += groundGravity * 0.3;
                }
                // つかんでいるときは足も垂れる
                if (grabbedBone) vel.x += hangingGravity * 0.4;
            } else if (boneName === 'head' || boneName === 'neck') {
                vel.x += groundGravity * 0.15;
                if (grabbedBone) vel.x += hangingGravity * 0.2;
            } else if (boneName === 'hips') {
                // hipsは倒れる方向に
                if (this.dollMode.isOnGround) {
                    vel.x += groundGravity * 0.8;
                }
            } else if (boneName === 'spine' || boneName === 'chest') {
                vel.x += groundGravity * 0.4;
                if (grabbedBone) vel.x += hangingGravity * 0.3;
            }
            
            // 速度を適用
            bone.rotation.x += vel.x;
            bone.rotation.z += vel.z;
            
            // 減衰
            vel.x *= groundDamping;
            vel.z *= groundDamping;
            
            // 回転制限
            bone.rotation.x = Math.max(limits.x[0], Math.min(limits.x[1], bone.rotation.x));
            bone.rotation.z = Math.max(limits.z[0], Math.min(limits.z[1], bone.rotation.z));
            
            // 地面にいるとき、限界に達したらバウンス
            if (this.dollMode.isOnGround) {
                if (bone.rotation.x <= limits.x[0] || bone.rotation.x >= limits.x[1]) {
                    vel.x *= -this.dollMode.bounceDecay;
                }
                if (bone.rotation.z <= limits.z[0] || bone.rotation.z >= limits.z[1]) {
                    vel.z *= -this.dollMode.bounceDecay;
                }
            }
        });
    }
    
    // 人形モードのマウスダウン
    onDollMouseDown(event) {
        const result = this.findBoneAtMouse(event);
        if (result && result.bone) {
            this.dollMode.grabbedBone = result.bone.name;
            this.dollMode.lastMousePos = this.getNormalizedMousePos(event);
            this.grabbedBoneNode = result.bone.node;
            
            // 落下リセット（持ち上げない）
            this.dollMode.fallVelocity = 0;
            this.dollMode.isOnGround = false;
            
            // つかんだボーンに応じて他のボーンに垂れ下がる速度を与える
            this.applyHangingPhysics(result.bone.name);
            
            // インジケーター表示
            this.createGrabIndicator(result.bone.node);
            
            document.body.classList.add('doll-grabbing');
            document.body.classList.remove('doll-mode');
            
            console.log('🧸 つかんだ:', this.dollMode.grabbedBone);
            document.getElementById('touch-status').textContent = `🧸 ${this.dollMode.grabbedBone} (ホイール:X / Shift:Y / Ctrl:Z)`;
        }
    }
    
    // つかんだボーンから垂れ下がる物理を適用
    applyHangingPhysics(grabbedBone) {
        // ボーンの階層構造（親→子）
        const boneHierarchy = {
            // 右腕チェーン
            'rightHand': ['rightLowerArm', 'rightUpperArm', 'rightShoulder', 'chest', 'spine', 'hips'],
            'rightLowerArm': ['rightUpperArm', 'rightShoulder', 'chest', 'spine', 'hips'],
            'rightUpperArm': ['rightShoulder', 'chest', 'spine', 'hips'],
            // 左腕チェーン
            'leftHand': ['leftLowerArm', 'leftUpperArm', 'leftShoulder', 'chest', 'spine', 'hips'],
            'leftLowerArm': ['leftUpperArm', 'leftShoulder', 'chest', 'spine', 'hips'],
            'leftUpperArm': ['leftShoulder', 'chest', 'spine', 'hips'],
            // 頭チェーン
            'head': ['neck', 'upperChest', 'chest', 'spine', 'hips'],
            'neck': ['upperChest', 'chest', 'spine', 'hips'],
            // 胴体
            'upperChest': ['chest', 'spine', 'hips'],
            'chest': ['spine', 'hips'],
            'spine': ['hips'],
            'hips': [],
            // 足チェーン
            'rightFoot': ['rightLowerLeg', 'rightUpperLeg', 'hips'],
            'rightLowerLeg': ['rightUpperLeg', 'hips'],
            'rightUpperLeg': ['hips'],
            'leftFoot': ['leftLowerLeg', 'leftUpperLeg', 'hips'],
            'leftLowerLeg': ['leftUpperLeg', 'hips'],
            'leftUpperLeg': ['hips']
        };
        
        // 垂れ下がるボーン（つかんだボーンより下の階層）
        const hangingBones = {
            // 右手をつかむと→体全体が垂れる
            'rightHand': ['head', 'neck', 'leftUpperArm', 'leftLowerArm', 'leftHand', 'leftUpperLeg', 'leftLowerLeg', 'leftFoot', 'rightUpperLeg', 'rightLowerLeg', 'rightFoot', 'spine', 'chest'],
            'rightLowerArm': ['rightHand', 'head', 'neck', 'leftUpperArm', 'leftLowerArm', 'leftHand', 'leftUpperLeg', 'leftLowerLeg', 'leftFoot', 'rightUpperLeg', 'rightLowerLeg', 'rightFoot'],
            'rightUpperArm': ['rightLowerArm', 'rightHand', 'head', 'neck', 'leftUpperArm', 'leftLowerArm', 'leftHand', 'leftUpperLeg', 'leftLowerLeg', 'leftFoot', 'rightUpperLeg', 'rightLowerLeg', 'rightFoot'],
            // 左手をつかむ
            'leftHand': ['head', 'neck', 'rightUpperArm', 'rightLowerArm', 'rightHand', 'leftUpperLeg', 'leftLowerLeg', 'leftFoot', 'rightUpperLeg', 'rightLowerLeg', 'rightFoot', 'spine', 'chest'],
            'leftLowerArm': ['leftHand', 'head', 'neck', 'rightUpperArm', 'rightLowerArm', 'rightHand', 'leftUpperLeg', 'leftLowerLeg', 'leftFoot', 'rightUpperLeg', 'rightLowerLeg', 'rightFoot'],
            'leftUpperArm': ['leftLowerArm', 'leftHand', 'head', 'neck', 'rightUpperArm', 'rightLowerArm', 'rightHand', 'leftUpperLeg', 'leftLowerLeg', 'leftFoot', 'rightUpperLeg', 'rightLowerLeg', 'rightFoot'],
            // 頭をつかむ
            'head': ['leftUpperArm', 'leftLowerArm', 'leftHand', 'rightUpperArm', 'rightLowerArm', 'rightHand', 'leftUpperLeg', 'leftLowerLeg', 'leftFoot', 'rightUpperLeg', 'rightLowerLeg', 'rightFoot'],
            // 胴体をつかむ
            'hips': ['head', 'neck', 'leftUpperArm', 'leftLowerArm', 'leftHand', 'rightUpperArm', 'rightLowerArm', 'rightHand', 'leftUpperLeg', 'leftLowerLeg', 'leftFoot', 'rightUpperLeg', 'rightLowerLeg', 'rightFoot'],
            'spine': ['head', 'neck', 'leftUpperArm', 'leftLowerArm', 'leftHand', 'rightUpperArm', 'rightLowerArm', 'rightHand', 'leftUpperLeg', 'leftLowerLeg', 'leftFoot', 'rightUpperLeg', 'rightLowerLeg', 'rightFoot'],
            'chest': ['head', 'neck', 'leftUpperArm', 'leftLowerArm', 'leftHand', 'rightUpperArm', 'rightLowerArm', 'rightHand', 'leftUpperLeg', 'leftLowerLeg', 'leftFoot', 'rightUpperLeg', 'rightLowerLeg', 'rightFoot'],
            // 足をつかむ
            'rightFoot': ['head', 'neck', 'leftUpperArm', 'leftLowerArm', 'leftHand', 'rightUpperArm', 'rightLowerArm', 'rightHand', 'leftUpperLeg', 'leftLowerLeg', 'leftFoot'],
            'leftFoot': ['head', 'neck', 'leftUpperArm', 'leftLowerArm', 'leftHand', 'rightUpperArm', 'rightLowerArm', 'rightHand', 'rightUpperLeg', 'rightLowerLeg', 'rightFoot']
        };
        
        // 垂れ下がるボーンに下向きの速度を与える
        const hanging = hangingBones[grabbedBone] || [];
        const hangForce = 0.08;
        
        hanging.forEach(boneName => {
            if (this.dollMode.boneVelocities[boneName]) {
                // 下向きに回転（腕は下に垂れる）
                if (boneName.includes('Arm') || boneName.includes('Hand')) {
                    this.dollMode.boneVelocities[boneName].x += hangForce;
                } else if (boneName.includes('Leg') || boneName.includes('Foot')) {
                    // 足は下に垂れる
                    this.dollMode.boneVelocities[boneName].x += hangForce * 0.5;
                } else if (boneName === 'head' || boneName === 'neck') {
                    this.dollMode.boneVelocities[boneName].x += hangForce * 0.3;
                } else {
                    // 胴体
                    this.dollMode.boneVelocities[boneName].x += hangForce * 0.2;
                }
            }
        });
        
        console.log('🧸 垂れ下がり物理適用:', grabbedBone, '→', hanging.length, 'ボーン');
    }
    
    // 人形モードのマウス移動
    onDollMouseMove(event) {
        if (!this.dollMode.grabbedBone || !this.grabbedBoneNode) return;
        
        const currentPos = this.getNormalizedMousePos(event);
        if (!currentPos || !this.dollMode.lastMousePos) return;
        
        const deltaX = currentPos.x - this.dollMode.lastMousePos.x;
        const deltaY = currentPos.y - this.dollMode.lastMousePos.y;
        
        // Ctrl: Z軸のみ, Shift: Y軸のみ, 通常: X軸+Y軸+移動
        if (event.ctrlKey) {
            // ===== Ctrl押しているとき: Z軸回転（傾き）=====
            this.grabbedBoneNode.rotation.z += deltaX * 2;
            // VRM全体は動かさない（ボーンのみ回転）
        } else if (event.shiftKey) {
            // ===== Shift押しているとき: Y軸回転（ひねり）=====
            this.grabbedBoneNode.rotation.y += deltaX * 2;
            // VRM全体は動かさない（ボーンのみ回転）
        } else {
            // ===== 通常時: X軸回転 + VRM移動 =====
            this.grabbedBoneNode.rotation.x += deltaY * 2;
            
            // VRM全体も動かす
            if (window.app && window.app.vrm) {
                window.app.vrm.scene.position.x += deltaX * 2;
                window.app.vrm.scene.position.y += deltaY * 2;
                
                // 地面より下にはいかない
                if (window.app.vrm.scene.position.y < 0) {
                    window.app.vrm.scene.position.y = 0;
                }
            }
        }
        
        // 他のボーンに速度を与える（ぶらぶら）
        this.dollMode.ragdollBones.forEach(boneName => {
            if (boneName === this.dollMode.grabbedBone) return;
            const vel = this.dollMode.boneVelocities[boneName];
            if (vel) {
                vel.x += (Math.random() - 0.5) * 0.02;
                vel.z += (Math.random() - 0.5) * 0.02;
            }
        });
        
        this.dollMode.lastMousePos = currentPos;
    }
    
    // 人形モードのマウスアップ
    onDollMouseUp(event) {
        if (!this.dollMode.grabbedBone) return;
        
        console.log('🧸 はなした:', this.dollMode.grabbedBone);
        document.getElementById('touch-status').textContent = '🧸 人形モード：クリックでつかむ';
        
        // インジケーター削除
        this.removeGrabIndicator();
        
        // 落下開始（初速度を与える）
        this.dollMode.fallVelocity = 0.02; // 落下速度を強める
        this.dollMode.isOnGround = false;
        
        // つかんでいたボーンにも速度を与える
        const releasedBone = this.dollMode.grabbedBone;
        if (this.dollMode.boneVelocities[releasedBone]) {
            this.dollMode.boneVelocities[releasedBone].x += (Math.random() - 0.5) * 0.05;
            this.dollMode.boneVelocities[releasedBone].z += (Math.random() - 0.5) * 0.05;
        }
        
        // ※ 目は閉じたまま維持（表情はリセットしない）
        // ※ ラグドール状態も維持（dollMode.active は true のまま）
        
        this.dollMode.grabbedBone = null;
        this.grabbedBoneNode = null;
        this.dollMode.lastMousePos = null;
        
        document.body.classList.remove('doll-grabbing');
        if (this.currentMode === 'doll') {
            document.body.classList.add('doll-mode');
        }
        
        console.log('🧸 ラグドール状態維持、目は閉じたまま');
    }
}

// 初期化
const touchPanelManager = new TouchPanelManager();

// グローバルに公開
window.setTouchMode = (mode) => touchPanelManager.setMode(mode);
