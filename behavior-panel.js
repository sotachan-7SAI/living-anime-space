// Behavior Panel Manager - 行動パネル
// VRMキャラの行動モードを制御

class BehaviorPanelManager {
    constructor() {
        this.currentMode = 'idle'; // idle, follow, flee, random, waypoint
        this.panel = null;
        this.isDragging = false;
        this.dragOffset = { x: 0, y: 0 };
        
        // 移動関連
        this.moveSpeed = 0.02; // 基本移動速度
        this.walkSpeed = 0.015;
        this.runSpeed = 0.065;  // 走る速度
        this.targetPosition = null;
        this.isMoving = false;
        this.currentMoveType = 'idle'; // idle, walk, run
        
        // モーションファイル名
        this.motions = {
            walk: '歩きMotion.vrma',
            walk2: '歩き１Motion.vrma',
            run: '女性らしい走り.vrma',  // 追いかける・逃げる・ランダム行動で使用
            idle: 'VRMA_06.vrma'
        };
        
        // 距離設定
        this.closeDistance = 1.0; // この距離以内なら停止
        this.walkDistance = 3.0; // この距離以内なら歩き
        // それ以上は走り
        
        // ランダム行動用
        this.randomTargetTimer = null;
        this.randomMoveRange = 5; // ランダム移動の範囲
        this.randomIdleTimer = null; // ランダム待機モーション用
        
        // 目的地指示モード用
        this.waypointMesh = null; // 赤い立方体
        this.waypointBody = null; // 物理ボディ
        this.waypointTouchTime = null; // タッチ開始時間
        this.waypointFadeTimer = null; // 消えるタイマー
        this.particles = []; // パーティクル配列
        
        // アニメーションループ
        this.animationId = null;
        this.lastMotion = null;
        this.isIdling = false; // 待機中フラグ（ループ防止）
        
        this.init();
    }
    
    init() {
        this.createPanel();
        this.startBehaviorLoop();
        
        window.behaviorManager = this;
        console.log('BehaviorPanelManager initialized');
    }
    
    createPanel() {
        const style = document.createElement('style');
        style.textContent = `
            #behavior-panel {
                position: fixed;
                top: 100px;
                right: 20px;
                width: 200px;
                background: rgba(255, 255, 255, 0.95);
                border-radius: 12px;
                box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
                z-index: 9998;
                display: none;
                flex-direction: column;
                overflow: hidden;
                font-family: 'Segoe UI', 'Yu Gothic', sans-serif;
            }
            #behavior-panel.visible { display: flex; }
            
            #behavior-panel-header {
                background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
                color: white;
                padding: 10px 12px;
                cursor: move;
                display: flex;
                align-items: center;
                justify-content: space-between;
                user-select: none;
                font-size: 13px;
                font-weight: bold;
            }
            
            #behavior-panel-header .close-btn {
                background: rgba(255,255,255,0.2);
                border: none;
                color: white;
                width: 24px; height: 24px;
                border-radius: 50%;
                cursor: pointer;
                font-size: 12px;
            }
            #behavior-panel-header .close-btn:hover { background: rgba(255,255,255,0.3); }
            
            #behavior-panel-body {
                padding: 10px;
            }
            
            .behavior-btn {
                width: 100%;
                padding: 10px 12px;
                margin-bottom: 6px;
                border: 2px solid #e0e0e0;
                border-radius: 8px;
                background: white;
                cursor: pointer;
                font-size: 12px;
                font-weight: 600;
                text-align: left;
                display: flex;
                align-items: center;
                gap: 8px;
                transition: all 0.2s;
            }
            
            .behavior-btn:hover {
                border-color: #f093fb;
                background: #fef6ff;
            }
            
            .behavior-btn.active {
                background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
                color: white;
                border-color: transparent;
            }
            
            .behavior-btn .icon { font-size: 16px; }
            .behavior-btn .label { flex: 1; }
            .behavior-btn .status {
                font-size: 10px;
                opacity: 0.7;
            }
            
            #behavior-status {
                margin-top: 8px;
                padding: 8px;
                background: #f5f5f5;
                border-radius: 6px;
                font-size: 10px;
                color: #666;
            }
            #behavior-status .row {
                display: flex;
                justify-content: space-between;
                margin: 2px 0;
            }
            #behavior-status .value { color: #f5576c; font-weight: bold; }
            
            /* 行動パネルボタン（メインUIに追加） */
            #behavior-toggle-btn {
                position: fixed;
                bottom: 120px;
                right: 20px;
                width: 50px;
                height: 50px;
                border-radius: 50%;
                background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
                color: white;
                border: none;
                font-size: 20px;
                cursor: pointer;
                box-shadow: 0 4px 15px rgba(240, 147, 251, 0.4);
                z-index: 9997;
                display: flex;
                align-items: center;
                justify-content: center;
            }
            #behavior-toggle-btn:hover {
                transform: scale(1.1);
            }
        `;
        document.head.appendChild(style);
        
        // トグルボタン
        const toggleBtn = document.createElement('button');
        toggleBtn.id = 'behavior-toggle-btn';
        toggleBtn.innerHTML = '🚶';
        toggleBtn.title = '行動パネル';
        toggleBtn.onclick = () => this.togglePanel();
        document.body.appendChild(toggleBtn);
        
        // パネル
        this.panel = document.createElement('div');
        this.panel.id = 'behavior-panel';
        this.panel.innerHTML = `
            <div id="behavior-panel-header">
                <span>🚶 行動パネル</span>
                <button class="close-btn" id="behavior-close">✕</button>
            </div>
            <div id="behavior-panel-body">
                <button class="behavior-btn active" data-mode="idle">
                    <span class="icon">🧍</span>
                    <span class="label">その場で静止</span>
                </button>
                <button class="behavior-btn" data-mode="follow">
                    <span class="icon">🏃‍♂️</span>
                    <span class="label">追いかける</span>
                </button>
                <button class="behavior-btn" data-mode="flee">
                    <span class="icon">💨</span>
                    <span class="label">逃げる</span>
                </button>
                <button class="behavior-btn" data-mode="random">
                    <span class="icon">🎲</span>
                    <span class="label">ランダム行動</span>
                </button>
                <button class="behavior-btn" data-mode="waypoint">
                    <span class="icon">📍</span>
                    <span class="label">目的地指示</span>
                    <span class="status">クリックで指定</span>
                </button>
                
                <div id="behavior-status">
                    <div class="row">
                        <span>モード:</span>
                        <span class="value" id="status-mode">静止</span>
                    </div>
                    <div class="row">
                        <span>距離:</span>
                        <span class="value" id="status-distance">-</span>
                    </div>
                    <div class="row">
                        <span>状態:</span>
                        <span class="value" id="status-state">待機中</span>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(this.panel);
        
        this.setupEvents();
    }
    
    setupEvents() {
        const self = this;
        const header = document.getElementById('behavior-panel-header');
        const closeBtn = document.getElementById('behavior-close');
        
        closeBtn.onclick = () => self.hidePanel();
        
        // モードボタン
        this.panel.querySelectorAll('.behavior-btn').forEach(btn => {
            btn.onclick = () => {
                const mode = btn.dataset.mode;
                self.setMode(mode);
                
                self.panel.querySelectorAll('.behavior-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
            };
        });
        
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
    
    togglePanel() {
        this.panel.classList.toggle('visible');
    }
    
    showPanel() { this.panel.classList.add('visible'); }
    hidePanel() { this.panel.classList.remove('visible'); }
    
    setMode(mode) {
        this.currentMode = mode;
        
        // タイマーをクリア
        if (this.randomTargetTimer) {
            clearTimeout(this.randomTargetTimer);
            this.randomTargetTimer = null;
        }
        if (this.randomIdleTimer) {
            clearTimeout(this.randomIdleTimer);
            this.randomIdleTimer = null;
        }
        
        // 待機フラグリセット
        this.isIdling = false;
        
        const modeNames = {
            'idle': '静止',
            'follow': '追跡',
            'flee': '逃走',
            'random': 'ランダム',
            'waypoint': '目的地指示'
        };
        
        document.getElementById('status-mode').textContent = modeNames[mode] || mode;
        
        if (mode === 'idle') {
            this.stopMoving();
            this.removeWaypoint();
        } else if (mode === 'random') {
            this.startRandomBehavior();
        } else if (mode === 'waypoint') {
            this.enableWaypointMode();
        } else {
            // 他のモードに切り替え時は目的地クリックを無効化
            this.disableWaypointClick();
        }
        
        console.log('🚶 行動モード変更:', mode);
    }
    
    // カメラ位置を取得
    getCameraPosition() {
        if (!window.app || !window.app.camera) return null;
        return window.app.camera.position.clone();
    }
    
    // VRM位置を取得
    getVRMPosition() {
        if (!window.app || !window.app.vrm) return null;
        const vrm = window.app.vrm;
        
        // hipsボーンの位置を取得
        const hips = vrm.humanoid?.getNormalizedBoneNode('hips');
        if (hips) {
            const worldPos = new THREE.Vector3();
            hips.getWorldPosition(worldPos);
            return worldPos;
        }
        
        // なければシーンの位置
        return vrm.scene.position.clone();
    }
    
    // VRMを移動
    moveVRM(direction, speed) {
        if (!window.app || !window.app.vrm) return;
        
        const vrm = window.app.vrm;
        vrm.scene.position.x += direction.x * speed;
        vrm.scene.position.z += direction.z * speed;
        
        // 向きを変える（移動方向を向く）
        if (direction.length() > 0.01) {
            const angle = Math.atan2(direction.x, direction.z);
            vrm.scene.rotation.y = angle;
        }
    }
    
    // モーションをファイル名で再生
    // ★ MotionCleanup対応 - ゾンビアクション残留防止
    async playMotionFile(motionFile) {
        if (!motionFile) return;
        if (this.lastMotion === motionFile) return; // 同じモーションなら再生しない
        
        if (!window.app || !window.app.vrm) return;
        
        try {
            // GLTFLoaderを使用
            const THREE = window.THREE;
            const loader = new window.GLTFLoaderClass();
            const { VRMAnimationLoaderPlugin, createVRMAnimationClip } = await import('@pixiv/three-vrm-animation');
            
            loader.register((parser) => new VRMAnimationLoaderPlugin(parser));
            
            const gltf = await loader.loadAsync('./motions/' + encodeURIComponent(motionFile));
            const vrmAnim = gltf.userData.vrmAnimation || gltf.userData.vrmAnimations?.[0];
            
            if (!vrmAnim) return;
            
            if (!window.app.mixer) window.app.mixer = new THREE.AnimationMixer(window.app.vrm.scene);
            
            const clip = createVRMAnimationClip(vrmAnim, window.app.vrm);
            
            // ★ MotionCleanup: 全アクションをクリーンアップしてから再生
            if (window.MotionCleanup) {
                window.MotionCleanup.playCleanMotion(window.app.mixer, clip, {
                    loop: true,
                    fadeIn: 0.2
                });
            } else {
                // フォールバック
                if (window.app.currentAction) window.app.currentAction.stop();
                window.app.currentAction = window.app.mixer.clipAction(clip);
                window.app.currentAction.reset();
                window.app.currentAction.setLoop(THREE.LoopRepeat);
                window.app.currentAction.play();
            }
            
            this.lastMotion = motionFile;
            console.log('🎬 行動モーション(clean):', motionFile);
            
        } catch (e) {
            console.warn('モーション再生エラー:', e);
        }
    }
    
    // 移動モーションを再生（歩き/走り）
    async playMoveMotion(moveType) {
        // 待機中ならフラグをリセット
        if (this.isIdling) {
            this.isIdling = false;
            // ランダム待機タイマーをクリア
            if (this.randomIdleTimer) {
                clearTimeout(this.randomIdleTimer);
                this.randomIdleTimer = null;
            }
        }
        
        const motionFile = moveType === 'run' ? this.motions.run : this.motions.walk;
        await this.playMotionFile(motionFile);
    }
    
    // 移動を停止
    stopMoving() {
        // すでに待機中なら何もしない（ループ防止）
        if (this.isIdling) {
            return;
        }
        
        this.isMoving = false;
        this.currentMoveType = 'idle';
        this.isIdling = true;
        document.getElementById('status-state').textContent = '待機中';
        
        // ランダムモードの場合はランダムな待機モーションを再生
        if (this.currentMode === 'random') {
            this.playRandomIdleMotion();
        } else {
            // 追跡/逃走モードの場合
            // 最後のAI応答があれば、それに応じたモーションを選択
            if (window.autoSelectMotion) {
                const lastAIMessage = document.querySelector('#chat-messages .message.ai:last-child .message-text');
                if (lastAIMessage) {
                    window.autoSelectMotion(lastAIMessage.textContent);
                } else {
                    this.playMotionFile(this.motions.idle);
                }
            } else {
                this.playMotionFile(this.motions.idle);
            }
        }
        
        this.lastMotion = null; // 次に動き出したときにモーション更新
    }
    
    // ランダムな待機モーションを再生
    async playRandomIdleMotion() {
        // 待機用モーションリスト
        const idleMotions = [
            'VRMA_06.vrma',
            'アンリアルキャラ考える.vrma',
            'アンリアルキャラ興味しんしん.vrma',
            'アンリアルキャラセクシー待機.vrma',
            'アンリアルキャラ丁寧なお辞儀.vrma',
            'アンリアルキャラ女性しゃべり.vrma',
            'アンリアルキャラ腰に手をあて仁王だち.vrma',
            'アンリアルキャラノリノリで手をふる.vrma',
            'アンリアルキャラ喜ぶ.vrma',
            'アンリアルキャラリアクションポーズ.vrma',
            'アンリアルキャラ全身でOKマークポーズ.vrma',
            'アンリアルキャラセクシー投げキッス.vrma'
        ];
        
        // ランダムに選択
        const randomMotion = idleMotions[Math.floor(Math.random() * idleMotions.length)];
        await this.playMotionFile(randomMotion);
        
        // 次のランダムモーションをスケジュール（3〜8秒後）
        if (this.currentMode === 'random' && this.isIdling) {
            this.randomIdleTimer = setTimeout(() => {
                if (this.currentMode === 'random' && this.isIdling) {
                    this.playRandomIdleMotion();
                }
            }, 3000 + Math.random() * 5000);
        }
    }
    
    // ランダム行動を開始
    startRandomBehavior() {
        this.setRandomTarget();
    }
    
    // ランダムなターゲットを設定
    setRandomTarget() {
        const vrmPos = this.getVRMPosition();
        if (!vrmPos) return;
        
        // ランダムな位置を生成
        const angle = Math.random() * Math.PI * 2;
        const distance = 2 + Math.random() * this.randomMoveRange;
        
        this.targetPosition = new THREE.Vector3(
            vrmPos.x + Math.cos(angle) * distance,
            0,
            vrmPos.z + Math.sin(angle) * distance
        );
        
        // 次のターゲット更新をスケジュール
        const nextDelay = 3000 + Math.random() * 5000;
        this.randomTargetTimer = setTimeout(() => {
            if (this.currentMode === 'random') {
                this.setRandomTarget();
            }
        }, nextDelay);
    }
    
    // 行動ループ
    startBehaviorLoop() {
        const self = this;
        
        const update = () => {
            self.updateBehavior();
            self.animationId = requestAnimationFrame(update);
        };
        
        update();
    }
    
    // 行動を更新
    updateBehavior() {
        if (this.currentMode === 'idle') return;
        
        // 目的地モードの物理更新と到達チェック（常に実行）
        if (this.currentMode === 'waypoint') {
            this.updateWaypointPhysics();
            this.checkWaypointTouch();
            
            // すでに到達している場合は移動しない
            if (this.waypointTouchTime) {
                return;
            }
        }
        
        const cameraPos = this.getCameraPosition();
        const vrmPos = this.getVRMPosition();
        
        if (!cameraPos || !vrmPos) return;
        
        let targetPos;
        let direction = new THREE.Vector3();
        
        if (this.currentMode === 'follow') {
            // 追いかける：カメラに向かう
            targetPos = cameraPos.clone();
            targetPos.y = 0; // Y軸は無視
            direction.subVectors(targetPos, vrmPos);
            direction.y = 0;
            
        } else if (this.currentMode === 'flee') {
            // 逃げる：カメラから離れる
            direction.subVectors(vrmPos, cameraPos);
            direction.y = 0;
            targetPos = vrmPos.clone().add(direction.normalize().multiplyScalar(5));
            direction.subVectors(targetPos, vrmPos);
            
        } else if (this.currentMode === 'random') {
            // ランダム：設定されたターゲットに向かう
            if (!this.targetPosition) {
                this.setRandomTarget();
                return;
            }
            targetPos = this.targetPosition;
            direction.subVectors(targetPos, vrmPos);
            direction.y = 0;
            
        } else if (this.currentMode === 'waypoint') {
            // 目的地指示：赤い立方体に向かう
            if (!this.targetPosition || !this.waypointMesh) {
                return; // 目的地がない場合は待機
            }
            
            // すでに到達してタイマーが動いている場合は移動しない
            if (this.waypointTouchTime) {
                if (this.isMoving) {
                    this.stopMoving();
                }
                return;
            }
            
            targetPos = this.targetPosition;
            direction.subVectors(targetPos, vrmPos);
            direction.y = 0;
        }
        
        const distance = direction.length();
        
        // 距離を表示
        document.getElementById('status-distance').textContent = distance.toFixed(2) + 'm';
        
        // 近くにいる場合は停止（waypointモードは別処理）
        if (this.currentMode !== 'flee' && this.currentMode !== 'waypoint' && distance < this.closeDistance) {
            if (this.isMoving) {
                this.stopMoving();
            }
            return;
        }
        
        // waypointモードの近接判定（トリガー半径の少し内側で停止）
        if (this.currentMode === 'waypoint') {
            const triggerRadius = this.waypointTriggerRadius || 1.2;
            if (distance < triggerRadius * 0.8) {
                // トリガー範囲内なのでcheckWaypointTouchに任せる
                return;
            }
        }
        
        // 逃げるモードで十分離れたら停止
        if (this.currentMode === 'flee') {
            const distFromCamera = vrmPos.distanceTo(new THREE.Vector3(cameraPos.x, 0, cameraPos.z));
            if (distFromCamera > 8) {
                if (this.isMoving) {
                    this.stopMoving();
                }
                return;
            }
        }
        
        // 方向を正規化
        direction.normalize();
        
        // 距離に応じて歩き/走り
        let speed;
        let moveType;
        
        if (distance < this.walkDistance) {
            speed = this.walkSpeed;
            moveType = 'walk';
            document.getElementById('status-state').textContent = '歩行中';
        } else {
            speed = this.runSpeed;
            moveType = 'run';
            document.getElementById('status-state').textContent = '走行中';
        }
        
        // ランダムモードは歩きと走りをミックス
        if (this.currentMode === 'random' && Math.random() < 0.01) {
            moveType = Math.random() < 0.5 ? 'walk' : 'run';
            speed = moveType === 'walk' ? this.walkSpeed : this.runSpeed;
        }
        
        // 移動
        this.moveVRM(direction, speed);
        this.isMoving = true;
        
        // モーション更新
        if (this.currentMoveType !== moveType) {
            this.currentMoveType = moveType;
            this.playMoveMotion(moveType);
        }
    }
    
    // ========================================
    // パーティクルエフェクト
    // ========================================
    
    // パーティクルを生成（配置時：青、消える時：赤）
    spawnParticles(position, type = 'spawn') {
        const THREE = window.THREE;
        if (!THREE || !window.app || !window.app.scene) return;
        
        const particleCount = type === 'spawn' ? 20 : 30;
        const color = type === 'spawn' ? 0x00aaff : 0xff3333;
        const speed = type === 'spawn' ? 0.08 : 0.15;
        const size = type === 'spawn' ? 0.08 : 0.1;
        
        for (let i = 0; i < particleCount; i++) {
            // パーティクルのジオメトリ
            const geometry = new THREE.SphereGeometry(size * (0.5 + Math.random() * 0.5), 8, 8);
            const material = new THREE.MeshBasicMaterial({
                color: color,
                transparent: true,
                opacity: 1.0
            });
            
            const particle = new THREE.Mesh(geometry, material);
            particle.position.set(
                position.x + (Math.random() - 0.5) * 0.3,
                position.y + (Math.random() - 0.5) * 0.3,
                position.z + (Math.random() - 0.5) * 0.3
            );
            
            // 速度をランダムに設定
            const angle = Math.random() * Math.PI * 2;
            const upSpeed = type === 'spawn' ? 0.05 + Math.random() * 0.1 : 0.1 + Math.random() * 0.15;
            const outSpeed = speed * (0.5 + Math.random());
            
            particle.userData = {
                velocity: new THREE.Vector3(
                    Math.cos(angle) * outSpeed,
                    upSpeed,
                    Math.sin(angle) * outSpeed
                ),
                life: 1.0,
                decay: 0.02 + Math.random() * 0.02
            };
            
            window.app.scene.add(particle);
            this.particles.push(particle);
        }
        
        // パーティクル更新ループ開始
        if (!this.particleLoopRunning) {
            this.particleLoopRunning = true;
            this.updateParticles();
        }
        
        console.log(`✨ パーティクル発生: ${type} (${particleCount}個)`);
    }
    
    // パーティクルを更新
    updateParticles() {
        if (this.particles.length === 0) {
            this.particleLoopRunning = false;
            return;
        }
        
        const THREE = window.THREE;
        const gravity = -0.003;
        
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            
            // 位置更新
            p.position.add(p.userData.velocity);
            p.userData.velocity.y += gravity; // 重力
            
            // ライフ減少
            p.userData.life -= p.userData.decay;
            p.material.opacity = Math.max(0, p.userData.life);
            
            // 縮小
            const scale = p.userData.life;
            p.scale.set(scale, scale, scale);
            
            // 消えたら削除
            if (p.userData.life <= 0) {
                window.app.scene.remove(p);
                p.geometry.dispose();
                p.material.dispose();
                this.particles.splice(i, 1);
            }
        }
        
        requestAnimationFrame(() => this.updateParticles());
    }
    
    // ========================================
    // 目的地指示モード
    // ========================================
    
    enableWaypointMode() {
        console.log('📍 目的地指示モード有効');
        this.waypointClickHandler = this.onWaypointClick.bind(this);
        
        // キャンバスにクリックイベントを追加
        const canvas = document.querySelector('#canvas-container canvas');
        if (canvas) {
            canvas.addEventListener('click', this.waypointClickHandler);
            canvas.style.cursor = 'crosshair';
        }
        
        document.getElementById('status-state').textContent = '地面をクリックして目的地を設定';
    }
    
    disableWaypointClick() {
        const canvas = document.querySelector('#canvas-container canvas');
        if (canvas && this.waypointClickHandler) {
            canvas.removeEventListener('click', this.waypointClickHandler);
            canvas.style.cursor = 'default';
        }
    }
    
    onWaypointClick(event) {
        if (this.currentMode !== 'waypoint') return;
        
        // レイキャストで地面の位置を取得
        const canvas = event.target;
        const rect = canvas.getBoundingClientRect();
        const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        const y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
        
        const THREE = window.THREE;
        const raycaster = new THREE.Raycaster();
        const mouse = new THREE.Vector2(x, y);
        
        raycaster.setFromCamera(mouse, window.app.camera);
        
        // 地面との交点を計算（Y=0平面）
        const planeY = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
        const intersection = new THREE.Vector3();
        raycaster.ray.intersectPlane(planeY, intersection);
        
        if (intersection) {
            this.createWaypoint(intersection);
        }
    }
    
    createWaypoint(position) {
        const THREE = window.THREE;
        
        // 既存の目的地を削除
        this.removeWaypoint();
        
        // 赤い半透明立方体を作成
        const size = 0.5;
        const geometry = new THREE.BoxGeometry(size, size, size);
        const material = new THREE.MeshStandardMaterial({
            color: 0xff3333,
            transparent: true,
            opacity: 0.6,
            emissive: 0xff0000,
            emissiveIntensity: 0.3
        });
        
        this.waypointMesh = new THREE.Mesh(geometry, material);
        this.waypointMesh.position.set(position.x, size / 2, position.z);
        this.waypointMesh.name = 'waypoint_target';
        this.waypointMesh.castShadow = true;
        window.app.scene.add(this.waypointMesh);
        
        // 透明な大きい当たり判定用球体（VRMがここに触れたら到達判定）
        const triggerRadius = 1.2; // リジッドボディより大きい
        this.waypointTriggerRadius = triggerRadius;
        
        // 物理ボディを作成（蛹ったり移動できるように）
        if (window.physicsWorld && typeof CANNON !== 'undefined') {
            const shape = new CANNON.Box(new CANNON.Vec3(size/2, size/2, size/2));
            this.waypointBody = new CANNON.Body({
                mass: 2, // 軽め
                position: new CANNON.Vec3(position.x, size / 2, position.z),
                shape: shape,
                linearDamping: 0.8,
                angularDamping: 0.8
            });
            window.physicsWorld.addBody(this.waypointBody);
            
            // physicsObjectsに追加（蛹ることができるように）
            window.physicsObjects.push({
                mesh: this.waypointMesh,
                body: this.waypointBody,
                type: 'waypoint',
                size: size,
                isWaypoint: true
            });
        }
        
        // ターゲット位置を設定
        this.targetPosition = position.clone();
        this.waypointTouchTime = null;
        
        // 配置時パーティクル（青）
        this.spawnParticles(new THREE.Vector3(position.x, size / 2, position.z), 'spawn');
        
        console.log('📍 目的地設定:', position, '(トリガー半径:', triggerRadius, ')');
        document.getElementById('status-state').textContent = '目的地に向かっています';
    }
    
    removeWaypoint() {
        // タイマークリア
        if (this.waypointFadeTimer) {
            clearTimeout(this.waypointFadeTimer);
            this.waypointFadeTimer = null;
        }
        
        // メッシュ削除
        if (this.waypointMesh) {
            window.app.scene.remove(this.waypointMesh);
            this.waypointMesh.geometry.dispose();
            this.waypointMesh.material.dispose();
            this.waypointMesh = null;
        }
        
        // 物理ボディ削除
        if (this.waypointBody && window.physicsWorld) {
            window.physicsWorld.removeBody(this.waypointBody);
            
            // physicsObjectsからも削除
            const idx = window.physicsObjects.findIndex(o => o.isWaypoint);
            if (idx >= 0) {
                window.physicsObjects.splice(idx, 1);
            }
            
            this.waypointBody = null;
        }
        
        this.waypointTouchTime = null;
    }
    
    // 目的地の物理位置を同期
    updateWaypointPhysics() {
        if (this.waypointMesh && this.waypointBody) {
            // 物理ボディの位置をメッシュに反映
            this.waypointMesh.position.copy(this.waypointBody.position);
            this.waypointMesh.quaternion.copy(this.waypointBody.quaternion);
            
            // ターゲット位置も更新
            this.targetPosition = new THREE.Vector3(
                this.waypointBody.position.x,
                0,
                this.waypointBody.position.z
            );
        }
    }
    
    // VRMが目的地の透明コライダーに触れたかチェック
    checkWaypointTouch() {
        if (!this.waypointMesh || this.currentMode !== 'waypoint') return;
        if (this.waypointTouchTime) return; // すでに到達済み
        
        // VRMの位置を取得（scene.positionを使用）
        if (!window.app || !window.app.vrm) return;
        const vrmPos = window.app.vrm.scene.position.clone();
        vrmPos.y = 0; // Yは無視
        
        // リジッドボディの位置（蛹られて移動している可能性がある）
        let waypointPos;
        if (this.waypointBody) {
            waypointPos = new THREE.Vector3(this.waypointBody.position.x, 0, this.waypointBody.position.z);
        } else {
            waypointPos = new THREE.Vector3(this.waypointMesh.position.x, 0, this.waypointMesh.position.z);
        }
        
        const distance = vrmPos.distanceTo(waypointPos);
        
        // 透明コライダー（トリガー半径）内に入ったら到達
        const triggerRadius = this.waypointTriggerRadius || 1.2;
        
        // デバッグログ（毎秒程度）
        if (Math.random() < 0.02) {
            console.log(`📍 距離チェック: VRM(${vrmPos.x.toFixed(2)}, ${vrmPos.z.toFixed(2)}) → WP(${waypointPos.x.toFixed(2)}, ${waypointPos.z.toFixed(2)}) = ${distance.toFixed(2)}m (トリガー: ${triggerRadius}m)`);
        }
        
        if (distance < triggerRadius) {
            // 触れた！
            this.waypointTouchTime = Date.now();
            console.log('🎉 目的地に到達！ (距離:', distance.toFixed(2), 'm)');
            document.getElementById('status-state').textContent = '目的地に到達！';
            
            // すぐに小さくなって消える（0.5秒後）
            this.waypointFadeTimer = setTimeout(() => {
                this.shrinkAndRemoveWaypoint();
            }, 500);
        }
    }
    
    // 目的地を小さくして削除
    shrinkAndRemoveWaypoint() {
        if (!this.waypointMesh) return;
        
        const mesh = this.waypointMesh;
        const body = this.waypointBody;
        let scale = 1.0;
        
        // 消える時パーティクル（赤）
        const particlePos = body ? 
            new THREE.Vector3(body.position.x, body.position.y, body.position.z) :
            mesh.position.clone();
        this.spawnParticles(particlePos, 'destroy');
        
        const shrinkInterval = setInterval(() => {
            scale -= 0.08; // 約12フレームで消える
            
            if (scale > 0) {
                mesh.scale.set(scale, scale, scale);
                // 物理ボディも地面に向かって沈む
                if (body) {
                    body.position.y = 0.25 * scale;
                }
            } else {
                clearInterval(shrinkInterval);
                this.removeWaypoint();
                this.stopMoving();
                document.getElementById('status-state').textContent = '目的地到達完了';
            }
        }, 30);
    }
    
    // クリーンアップ
    destroy() {
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
        }
        if (this.randomTargetTimer) {
            clearTimeout(this.randomTargetTimer);
        }
        this.disableWaypointClick();
        this.removeWaypoint();
    }
}

// 初期化
const behaviorManager = new BehaviorPanelManager();

// グローバルに公開
window.setBehaviorMode = (mode) => behaviorManager.setMode(mode);
