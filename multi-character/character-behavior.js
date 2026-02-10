// ========================================
// CharacterBehavior - マルチキャラクター用行動システム
// 各キャラクターが独立して行動できる
// ========================================

export class CharacterBehavior {
    constructor(characterUnit) {
        this.unit = characterUnit;
        this.id = characterUnit.id;
        this.name = characterUnit.name;
        
        // 行動モード
        this.currentMode = 'idle'; // idle, follow, flee, random, waypoint, follow-character
        
        // 移動設定
        this.moveSpeed = 0.02;
        this.walkSpeed = 0.015;
        this.runSpeed = 0.065;
        
        // 距離設定
        this.closeDistance = 1.0;
        this.walkDistance = 3.0;
        
        // ★ 分離設定（キャラ同士が重ならないように）
        this.separationDistance = 1.5;  // この距離以内になると離れる
        this.separationForce = 0.15;    // 分離力の強さ
        this.minSeparation = 0.8;       // 最小許容距離（これ以下には絶対近づかない）
        this.colliderRadius = 0.4;      // 透明コライダーの半径
        
        // ★ 追跡時のオフセット（全員同じ場所を目指さない）
        this.followOffset = null; // {x, z} 各キャラに別々のオフセットを設定
        
        // 状態
        this.isMoving = false;
        this.currentMoveType = 'idle';
        this.lastMotion = null;
        this.isIdling = false;
        
        // ターゲット
        this.targetPosition = null;
        this.targetCharacterId = null; // 追いかける/逃げる対象のキャラクターID
        
        // ランダム行動用
        this.randomTargetTimer = null;
        this.randomMoveRange = 5;
        this.randomIdleTimer = null;
        
        // 目的地指示用
        this.waypointMesh = null;
        this.waypointBody = null;
        this.waypointTouchTime = null;
        this.waypointFadeTimer = null;
        this.waypointTriggerRadius = 1.2;
        
        // パーティクル
        this.particles = [];
        this.particleLoopRunning = false;
        
        // モーションファイル
        this.motions = {
            walk: '歩きMotion.vrma',
            walk2: '歩き１Motion.vrma',
            run: '女性らしい走り.vrma',
            idle: 'VRMA_06.vrma'
        };
        
        // 待機モーションリスト
        this.idleMotions = [
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
        
        // コールバック
        this.onModeChange = null;
        this.onStateChange = null;
        
        console.log(`🚶 CharacterBehavior作成: ${this.name} (${this.id})`);
    }
    
    /**
     * VRMを取得
     */
    getVRM() {
        return this.unit.vrm;
    }
    
    /**
     * VRM位置を取得
     */
    getPosition() {
        const vrm = this.getVRM();
        if (!vrm || !vrm.scene) return null;
        return vrm.scene.position.clone();
    }
    
    /**
     * VRMを移動
     */
    moveVRM(direction, speed) {
        const vrm = this.getVRM();
        if (!vrm || !vrm.scene) return;
        
        vrm.scene.position.x += direction.x * speed;
        vrm.scene.position.z += direction.z * speed;
        
        // 向きを変える
        if (direction.length() > 0.01) {
            const angle = Math.atan2(direction.x, direction.z);
            vrm.scene.rotation.y = angle;
        }
    }
    
    /**
     * モードを設定
     */
    setMode(mode, options = {}) {
        const previousMode = this.currentMode;
        this.currentMode = mode;
        
        // タイマーをクリア
        this.clearTimers();
        
        // 待機フラグリセット
        this.isIdling = false;
        
        // ターゲットをリセット
        this.targetCharacterId = options.targetCharacterId || null;
        
        if (mode === 'idle') {
            this.stopMoving();
            this.removeWaypoint();
        } else if (mode === 'random') {
            this.startRandomBehavior();
        } else if (mode === 'waypoint') {
            // 目的地はsetWaypointで設定
        } else if (mode === 'follow' || mode === 'flee' || mode === 'follow-character') {
            // ターゲット追従/逃走モード
        }
        
        console.log(`🚶 ${this.name}: モード変更 ${previousMode} → ${mode}`, options);
        
        if (this.onModeChange) {
            this.onModeChange(this, mode, previousMode);
        }
    }
    
    /**
     * タイマーをクリア
     */
    clearTimers() {
        if (this.randomTargetTimer) {
            clearTimeout(this.randomTargetTimer);
            this.randomTargetTimer = null;
        }
        if (this.randomIdleTimer) {
            clearTimeout(this.randomIdleTimer);
            this.randomIdleTimer = null;
        }
        if (this.waypointFadeTimer) {
            clearTimeout(this.waypointFadeTimer);
            this.waypointFadeTimer = null;
        }
    }
    
    /**
     * モーションを再生
     */
    async playMotionFile(motionFile) {
        if (!motionFile) return;
        if (this.lastMotion === motionFile) return;
        
        const vrm = this.getVRM();
        if (!vrm) return;
        
        try {
            const THREE = window.THREE;
            const loader = new window.GLTFLoaderClass();
            const { VRMAnimationLoaderPlugin, createVRMAnimationClip } = await import('@pixiv/three-vrm-animation');
            
            loader.register((parser) => new VRMAnimationLoaderPlugin(parser));
            
            const gltf = await loader.loadAsync('./motions/' + encodeURIComponent(motionFile));
            const vrmAnim = gltf.userData.vrmAnimation || gltf.userData.vrmAnimations?.[0];
            
            if (!vrmAnim) return;
            
            // mixerを取得または作成
            if (!this.unit.mixer) {
                this.unit.mixer = new THREE.AnimationMixer(vrm.scene);
                
                // グローバルmixerリストに登録
                if (!window.multiConversationState) {
                    window.multiConversationState = { animationMixers: [] };
                }
                if (!window.multiConversationState.animationMixers) {
                    window.multiConversationState.animationMixers = [];
                }
                if (!window.multiConversationState.animationMixers.includes(this.unit.mixer)) {
                    window.multiConversationState.animationMixers.push(this.unit.mixer);
                }
            }
            
            const clip = createVRMAnimationClip(vrmAnim, vrm);
            const newAction = this.unit.mixer.clipAction(clip);
            
            // クロスフェード
            if (this.unit.currentAction && this.unit.currentAction.isRunning()) {
                newAction.reset();
                newAction.setLoop(THREE.LoopRepeat);
                newAction.setEffectiveWeight(1);
                newAction.play();
                this.unit.currentAction.crossFadeTo(newAction, 0.5, true);
            } else {
                newAction.reset();
                newAction.setLoop(THREE.LoopRepeat);
                newAction.play();
            }
            
            this.unit.currentAction = newAction;
            this.lastMotion = motionFile;
            
            console.log(`🎬 ${this.name}: 行動モーション: ${motionFile}`);
            
        } catch (e) {
            console.warn(`${this.name}: モーション再生エラー:`, e);
        }
    }
    
    /**
     * 移動モーションを再生
     */
    async playMoveMotion(moveType) {
        if (this.isIdling) {
            this.isIdling = false;
            if (this.randomIdleTimer) {
                clearTimeout(this.randomIdleTimer);
                this.randomIdleTimer = null;
            }
        }
        
        const motionFile = moveType === 'run' ? this.motions.run : this.motions.walk;
        await this.playMotionFile(motionFile);
    }
    
    /**
     * 移動を停止
     */
    stopMoving() {
        if (this.isIdling) return;
        
        this.isMoving = false;
        this.currentMoveType = 'idle';
        this.isIdling = true;
        
        if (this.onStateChange) {
            this.onStateChange(this, '待機中');
        }
        
        // ランダムモードなら待機モーション
        if (this.currentMode === 'random') {
            this.playRandomIdleMotion();
        } else {
            this.playMotionFile(this.motions.idle);
        }
        
        this.lastMotion = null;
    }
    
    /**
     * ランダムな待機モーションを再生
     */
    async playRandomIdleMotion() {
        const randomMotion = this.idleMotions[Math.floor(Math.random() * this.idleMotions.length)];
        await this.playMotionFile(randomMotion);
        
        // 次のランダムモーションをスケジュール
        if (this.currentMode === 'random' && this.isIdling) {
            this.randomIdleTimer = setTimeout(() => {
                if (this.currentMode === 'random' && this.isIdling) {
                    this.playRandomIdleMotion();
                }
            }, 3000 + Math.random() * 5000);
        }
    }
    
    /**
     * ランダム行動を開始
     */
    startRandomBehavior() {
        this.setRandomTarget();
    }
    
    /**
     * ★ 分離処理（idleモードでも実行）
     */
    applySeparation(allBehaviors, myPos) {
        const vrm = this.getVRM();
        if (!vrm || !vrm.scene) return;
        
        for (const other of allBehaviors) {
            if (other.id === this.id) continue;
            
            const otherPos = other.getPosition();
            if (!otherPos) continue;
            
            const diff = new THREE.Vector3().subVectors(myPos, otherPos);
            diff.y = 0;
            const dist = diff.length();
            
            // 最小距離以下なら強制的に押し戻す
            if (dist < this.minSeparation && dist > 0.01) {
                diff.normalize();
                const pushAmount = (this.minSeparation - dist) + 0.05;
                vrm.scene.position.x += diff.x * pushAmount;
                vrm.scene.position.z += diff.z * pushAmount;
            }
            // 分離距離以内ならゆっくり押し戻す
            else if (dist < this.separationDistance && dist > 0.01) {
                diff.normalize();
                const ratio = (this.separationDistance - dist) / this.separationDistance;
                const pushAmount = ratio * ratio * this.separationForce;
                vrm.scene.position.x += diff.x * pushAmount;
                vrm.scene.position.z += diff.z * pushAmount;
            }
        }
    }
    
    /**
     * ランダムなターゲットを設定
     */
    setRandomTarget() {
        const pos = this.getPosition();
        if (!pos) return;
        
        const angle = Math.random() * Math.PI * 2;
        const distance = 2 + Math.random() * this.randomMoveRange;
        
        this.targetPosition = new THREE.Vector3(
            pos.x + Math.cos(angle) * distance,
            0,
            pos.z + Math.sin(angle) * distance
        );
        
        // 次のターゲット更新をスケジュール
        const nextDelay = 3000 + Math.random() * 5000;
        this.randomTargetTimer = setTimeout(() => {
            if (this.currentMode === 'random') {
                this.setRandomTarget();
            }
        }, nextDelay);
    }
    
    /**
     * 行動を更新（毎フレーム呼び出し）
     */
    update(allBehaviors = [], cameraPosition = null) {
        const myPos = this.getPosition();
        if (!myPos) return;
        
        // ★ idleモードでも分離処理は実行する
        this.applySeparation(allBehaviors, myPos);
        
        if (this.currentMode === 'idle') return;
        
        let targetPos;
        let direction = new THREE.Vector3();
        
        // モードに応じたターゲット計算
        switch (this.currentMode) {
            case 'follow':
                // カメラを追いかける
                if (!cameraPosition) return;
                targetPos = cameraPosition.clone();
                targetPos.y = 0;
                direction.subVectors(targetPos, myPos);
                direction.y = 0;
                break;
                
            case 'flee':
                // カメラから逃げる
                if (!cameraPosition) return;
                direction.subVectors(myPos, cameraPosition);
                direction.y = 0;
                targetPos = myPos.clone().add(direction.normalize().multiplyScalar(5));
                direction.subVectors(targetPos, myPos);
                break;
                
            case 'follow-character':
                // 特定のキャラクターを追いかける
                if (!this.targetCharacterId) return;
                const targetBehavior = allBehaviors.find(b => b.id === this.targetCharacterId);
                if (!targetBehavior) return;
                const targetCharPos = targetBehavior.getPosition();
                if (!targetCharPos) return;
                targetPos = targetCharPos.clone();
                targetPos.y = 0;
                direction.subVectors(targetPos, myPos);
                direction.y = 0;
                break;
                
            case 'random':
                // ランダム移動
                if (!this.targetPosition) {
                    this.setRandomTarget();
                    return;
                }
                targetPos = this.targetPosition;
                direction.subVectors(targetPos, myPos);
                direction.y = 0;
                break;
                
            case 'waypoint':
                // 目的地指示
                if (!this.targetPosition || !this.waypointMesh) {
                    return;
                }
                if (this.waypointTouchTime) {
                    if (this.isMoving) this.stopMoving();
                    return;
                }
                targetPos = this.targetPosition;
                direction.subVectors(targetPos, myPos);
                direction.y = 0;
                break;
                
            default:
                return;
        }
        
        const distance = direction.length();
        
        // ★ 分離力を計算（他のキャラクターと重ならないように）
        const separation = new THREE.Vector3();
        let separationCount = 0;
        let needsHardPush = false; // 最小距離以下の場合の強制押し戻し
        
        for (const other of allBehaviors) {
            if (other.id === this.id) continue;
            
            const otherPos = other.getPosition();
            if (!otherPos) continue;
            
            const diff = new THREE.Vector3().subVectors(myPos, otherPos);
            diff.y = 0;
            const dist = diff.length();
            
            // ★ 最小距離以下なら強制的に押し戻す
            if (dist < this.minSeparation && dist > 0.01) {
                needsHardPush = true;
                diff.normalize();
                // 最小距離まで強制移動
                const pushAmount = (this.minSeparation - dist) + 0.05;
                const vrm = this.getVRM();
                if (vrm && vrm.scene) {
                    vrm.scene.position.x += diff.x * pushAmount;
                    vrm.scene.position.z += diff.z * pushAmount;
                }
            }
            
            if (dist < this.separationDistance && dist > 0.01) {
                // 近いほど強く離れる（二次曲線的に強化）
                diff.normalize();
                const ratio = (this.separationDistance - dist) / this.separationDistance;
                diff.multiplyScalar(ratio * ratio); // 二乗で近いほど強く
                separation.add(diff);
                separationCount++;
            }
        }
        
        // 分離力を適用
        if (separationCount > 0) {
            separation.divideScalar(separationCount);
            separation.multiplyScalar(this.separationForce * 3); // 分離力をさらに強めに
            direction.add(separation);
        }
        
        // ★ 追跡モードのオフセット（全員同じ場所を目指さない）
        if (this.currentMode === 'follow' && this.followOffset) {
            direction.x += this.followOffset.x * 0.1;
            direction.z += this.followOffset.z * 0.1;
        }
        
        // 距離更新コールバック
        if (this.onStateChange && Math.random() < 0.05) {
            this.onStateChange(this, `距離: ${distance.toFixed(2)}m`);
        }
        
        // 近くにいる場合は停止
        if (this.currentMode !== 'flee' && this.currentMode !== 'waypoint' && distance < this.closeDistance) {
            if (this.isMoving) {
                this.stopMoving();
            }
            return;
        }
        
        // waypointモードの近接判定
        if (this.currentMode === 'waypoint') {
            if (distance < this.waypointTriggerRadius * 0.8) {
                this.checkWaypointTouch();
                return;
            }
        }
        
        // 逃げるモードで十分離れたら停止
        if (this.currentMode === 'flee') {
            if (cameraPosition) {
                const distFromCamera = myPos.distanceTo(new THREE.Vector3(cameraPosition.x, 0, cameraPosition.z));
                if (distFromCamera > 8) {
                    if (this.isMoving) {
                        this.stopMoving();
                    }
                    return;
                }
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
        } else {
            speed = this.runSpeed;
            moveType = 'run';
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
    // 目的地指示モード
    // ========================================
    
    /**
     * 目的地を設定
     */
    setWaypoint(position) {
        const THREE = window.THREE;
        
        // 既存の目的地を削除
        this.removeWaypoint();
        
        // 赤い半透明立方体を作成
        const size = 0.5;
        const geometry = new THREE.BoxGeometry(size, size, size);
        
        // キャラクターごとに色を変える
        const colors = [0xff3333, 0x33ff33, 0x3333ff, 0xffff33, 0xff33ff, 0x33ffff];
        const colorIndex = parseInt(this.id.replace(/\D/g, ''), 10) % colors.length || 0;
        const color = colors[colorIndex];
        
        const material = new THREE.MeshStandardMaterial({
            color: color,
            transparent: true,
            opacity: 0.6,
            emissive: color,
            emissiveIntensity: 0.3
        });
        
        this.waypointMesh = new THREE.Mesh(geometry, material);
        this.waypointMesh.position.set(position.x, size / 2, position.z);
        this.waypointMesh.name = `waypoint_${this.id}`;
        this.waypointMesh.castShadow = true;
        
        window.app.scene.add(this.waypointMesh);
        
        // 物理ボディを作成
        if (window.physicsWorld && typeof CANNON !== 'undefined') {
            const shape = new CANNON.Box(new CANNON.Vec3(size/2, size/2, size/2));
            this.waypointBody = new CANNON.Body({
                mass: 2,
                position: new CANNON.Vec3(position.x, size / 2, position.z),
                shape: shape,
                linearDamping: 0.8,
                angularDamping: 0.8
            });
            window.physicsWorld.addBody(this.waypointBody);
            
            window.physicsObjects.push({
                mesh: this.waypointMesh,
                body: this.waypointBody,
                type: 'waypoint',
                size: size,
                isWaypoint: true,
                characterId: this.id
            });
        }
        
        // ターゲット位置を設定
        this.targetPosition = position.clone();
        this.waypointTouchTime = null;
        
        // パーティクル
        this.spawnParticles(new THREE.Vector3(position.x, size / 2, position.z), 'spawn', color);
        
        console.log(`📍 ${this.name}: 目的地設定`, position);
    }
    
    /**
     * 目的地を削除
     */
    removeWaypoint() {
        if (this.waypointFadeTimer) {
            clearTimeout(this.waypointFadeTimer);
            this.waypointFadeTimer = null;
        }
        
        if (this.waypointMesh) {
            window.app.scene.remove(this.waypointMesh);
            this.waypointMesh.geometry.dispose();
            this.waypointMesh.material.dispose();
            this.waypointMesh = null;
        }
        
        if (this.waypointBody && window.physicsWorld) {
            window.physicsWorld.removeBody(this.waypointBody);
            
            const idx = window.physicsObjects.findIndex(o => o.characterId === this.id && o.isWaypoint);
            if (idx >= 0) {
                window.physicsObjects.splice(idx, 1);
            }
            
            this.waypointBody = null;
        }
        
        this.waypointTouchTime = null;
    }
    
    /**
     * 目的地タッチ判定
     */
    checkWaypointTouch() {
        if (!this.waypointMesh || this.currentMode !== 'waypoint') return;
        if (this.waypointTouchTime) return;
        
        const myPos = this.getPosition();
        if (!myPos) return;
        myPos.y = 0;
        
        let waypointPos;
        if (this.waypointBody) {
            waypointPos = new THREE.Vector3(this.waypointBody.position.x, 0, this.waypointBody.position.z);
        } else {
            waypointPos = new THREE.Vector3(this.waypointMesh.position.x, 0, this.waypointMesh.position.z);
        }
        
        const distance = myPos.distanceTo(waypointPos);
        
        if (distance < this.waypointTriggerRadius) {
            this.waypointTouchTime = Date.now();
            console.log(`🎉 ${this.name}: 目的地に到達！ (距離: ${distance.toFixed(2)}m)`);
            
            if (this.onStateChange) {
                this.onStateChange(this, '目的地到達！');
            }
            
            // 0.5秒後に消える
            this.waypointFadeTimer = setTimeout(() => {
                this.shrinkAndRemoveWaypoint();
            }, 500);
        }
    }
    
    /**
     * 目的地を縮小して削除
     */
    shrinkAndRemoveWaypoint() {
        if (!this.waypointMesh) return;
        
        const mesh = this.waypointMesh;
        const body = this.waypointBody;
        let scale = 1.0;
        
        // パーティクル
        const particlePos = body ? 
            new THREE.Vector3(body.position.x, body.position.y, body.position.z) :
            mesh.position.clone();
        this.spawnParticles(particlePos, 'destroy', mesh.material.color.getHex());
        
        const shrinkInterval = setInterval(() => {
            scale -= 0.08;
            
            if (scale > 0) {
                mesh.scale.set(scale, scale, scale);
                if (body) {
                    body.position.y = 0.25 * scale;
                }
            } else {
                clearInterval(shrinkInterval);
                this.removeWaypoint();
                this.stopMoving();
            }
        }, 30);
    }
    
    // ========================================
    // パーティクルエフェクト
    // ========================================
    
    spawnParticles(position, type = 'spawn', color = 0x00aaff) {
        const THREE = window.THREE;
        if (!THREE || !window.app || !window.app.scene) return;
        
        const particleCount = type === 'spawn' ? 20 : 30;
        const speed = type === 'spawn' ? 0.08 : 0.15;
        const size = type === 'spawn' ? 0.08 : 0.1;
        
        for (let i = 0; i < particleCount; i++) {
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
        
        if (!this.particleLoopRunning) {
            this.particleLoopRunning = true;
            this.updateParticles();
        }
    }
    
    updateParticles() {
        if (this.particles.length === 0) {
            this.particleLoopRunning = false;
            return;
        }
        
        const gravity = -0.003;
        
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            
            p.position.add(p.userData.velocity);
            p.userData.velocity.y += gravity;
            
            p.userData.life -= p.userData.decay;
            p.material.opacity = Math.max(0, p.userData.life);
            
            const scale = p.userData.life;
            p.scale.set(scale, scale, scale);
            
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
    // クリーンアップ
    // ========================================
    
    destroy() {
        this.clearTimers();
        this.removeWaypoint();
        
        // パーティクルをクリア
        this.particles.forEach(p => {
            if (window.app && window.app.scene) {
                window.app.scene.remove(p);
            }
            p.geometry.dispose();
            p.material.dispose();
        });
        this.particles = [];
        
        console.log(`🗑️ ${this.name}: CharacterBehavior破棄`);
    }
}


// ========================================
// CharacterBehaviorManager - 全キャラの行動を管理
// ========================================

export class CharacterBehaviorManager {
    constructor(multiCharManager) {
        this.multiCharManager = multiCharManager;
        this.behaviors = new Map(); // characterId -> CharacterBehavior
        this.animationId = null;
        this.isRunning = false;
        
        // 目的地クリック用
        this.waypointMode = false;
        this.waypointTargetCharId = null;
        this.waypointClickHandler = null;
        
        console.log('🎮 CharacterBehaviorManager初期化');
    }
    
    /**
     * キャラクターの行動システムを作成
     */
    createBehavior(characterUnit) {
        if (this.behaviors.has(characterUnit.id)) {
            console.warn(`⚠️ ${characterUnit.name}: Behaviorはすでに存在します`);
            return this.behaviors.get(characterUnit.id);
        }
        
        const behavior = new CharacterBehavior(characterUnit);
        
        // ★ キャラクターごとに異なるオフセットを設定（円形に配置）
        const index = this.behaviors.size;
        const angleStep = (Math.PI * 2) / Math.max(4, this.behaviors.size + 1);
        const angle = angleStep * index;
        const radius = 1.5; // オフセット半径
        behavior.followOffset = {
            x: Math.cos(angle) * radius,
            z: Math.sin(angle) * radius
        };
        
        this.behaviors.set(characterUnit.id, behavior);
        
        console.log(`✅ ${characterUnit.name}: Behavior作成 (オフセット: x=${behavior.followOffset.x.toFixed(2)}, z=${behavior.followOffset.z.toFixed(2)})`);
        return behavior;
    }
    
    /**
     * キャラクターの行動システムを取得
     */
    getBehavior(characterId) {
        return this.behaviors.get(characterId);
    }
    
    /**
     * キャラクターの行動システムを削除
     */
    removeBehavior(characterId) {
        const behavior = this.behaviors.get(characterId);
        if (behavior) {
            behavior.destroy();
            this.behaviors.delete(characterId);
            console.log(`🗑️ Behavior削除: ${characterId}`);
        }
    }
    
    /**
     * 全キャラクターの行動モードを設定
     */
    setAllMode(mode, options = {}) {
        this.behaviors.forEach(behavior => {
            behavior.setMode(mode, options);
        });
        console.log(`🚶 全キャラクター: モード変更 → ${mode}`);
    }
    
    /**
     * 特定キャラクターの行動モードを設定
     */
    setMode(characterId, mode, options = {}) {
        const behavior = this.behaviors.get(characterId);
        if (behavior) {
            behavior.setMode(mode, options);
        }
    }
    
    /**
     * 行動ループを開始
     */
    start() {
        if (this.isRunning) return;
        this.isRunning = true;
        
        const update = () => {
            if (!this.isRunning) return;
            
            // カメラ位置を取得
            const cameraPos = window.app?.camera?.position?.clone() || null;
            
            // 全Behaviorの配列
            const allBehaviors = Array.from(this.behaviors.values());
            
            // 各キャラクターの行動を更新
            allBehaviors.forEach(behavior => {
                behavior.update(allBehaviors, cameraPos);
            });
            
            this.animationId = requestAnimationFrame(update);
        };
        
        update();
        console.log('▶️ 行動ループ開始');
    }
    
    /**
     * 行動ループを停止
     */
    stop() {
        this.isRunning = false;
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
        console.log('⏹️ 行動ループ停止');
    }
    
    /**
     * 目的地指示モードを有効化
     */
    enableWaypointMode(characterId) {
        this.waypointMode = true;
        this.waypointTargetCharId = characterId;
        
        const behavior = this.behaviors.get(characterId);
        if (behavior) {
            behavior.setMode('waypoint');
        }
        
        // キャンバスにクリックイベントを追加
        const canvas = document.querySelector('#canvas-container canvas');
        if (canvas) {
            this.waypointClickHandler = (event) => this.onWaypointClick(event);
            canvas.addEventListener('click', this.waypointClickHandler);
            canvas.style.cursor = 'crosshair';
        }
        
        console.log(`📍 目的地指示モード: ${characterId}`);
    }
    
    /**
     * 目的地指示クリック処理
     */
    onWaypointClick(event) {
        if (!this.waypointMode || !this.waypointTargetCharId) return;
        
        const behavior = this.behaviors.get(this.waypointTargetCharId);
        if (!behavior || behavior.currentMode !== 'waypoint') {
            this.disableWaypointMode();
            return;
        }
        
        const canvas = event.target;
        const rect = canvas.getBoundingClientRect();
        const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        const y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
        
        const THREE = window.THREE;
        const raycaster = new THREE.Raycaster();
        const mouse = new THREE.Vector2(x, y);
        
        raycaster.setFromCamera(mouse, window.app.camera);
        
        const planeY = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
        const intersection = new THREE.Vector3();
        raycaster.ray.intersectPlane(planeY, intersection);
        
        if (intersection) {
            behavior.setWaypoint(intersection);
        }
    }
    
    /**
     * 目的地指示モードを無効化
     */
    disableWaypointMode() {
        this.waypointMode = false;
        this.waypointTargetCharId = null;
        
        const canvas = document.querySelector('#canvas-container canvas');
        if (canvas && this.waypointClickHandler) {
            canvas.removeEventListener('click', this.waypointClickHandler);
            canvas.style.cursor = 'default';
        }
        this.waypointClickHandler = null;
    }
    
    /**
     * 全Behaviorをクリア
     */
    clear() {
        this.stop();
        this.disableWaypointMode();
        
        this.behaviors.forEach(behavior => {
            behavior.destroy();
        });
        this.behaviors.clear();
        
        console.log('🗑️ 全Behavior削除');
    }
    
    /**
     * 状態を取得
     */
    getStatus() {
        const status = [];
        this.behaviors.forEach((behavior, id) => {
            status.push({
                id: id,
                name: behavior.name,
                mode: behavior.currentMode,
                isMoving: behavior.isMoving,
                targetCharacterId: behavior.targetCharacterId
            });
        });
        return status;
    }
    
    // ========================================
    // ★ キャラクター間距離設定
    // ========================================
    
    /**
     * 全キャラクターの分離距離を設定
     * @param {number} distance - 分離距離（0.5～3.0m推奨）
     */
    setSeparationDistance(distance) {
        this.behaviors.forEach(behavior => {
            behavior.separationDistance = distance;
            // 最小距離は分離距離の半分程度
            behavior.minSeparation = Math.max(0.4, distance * 0.5);
        });
        console.log(`📏 全キャラ: 分離距離 = ${distance.toFixed(2)}m, 最小距離 = ${(distance * 0.5).toFixed(2)}m`);
    }
    
    /**
     * 全キャラクターの分離力を設定
     * @param {number} force - 分離力（0.05～0.3推奨）
     */
    setSeparationForce(force) {
        this.behaviors.forEach(behavior => {
            behavior.separationForce = force;
        });
        console.log(`💪 全キャラ: 分離力 = ${force.toFixed(3)}`);
    }
    
    /**
     * 現在の分離設定を取得
     */
    getSeparationSettings() {
        const firstBehavior = this.behaviors.values().next().value;
        if (firstBehavior) {
            return {
                separationDistance: firstBehavior.separationDistance,
                minSeparation: firstBehavior.minSeparation,
                separationForce: firstBehavior.separationForce
            };
        }
        return {
            separationDistance: 1.5,
            minSeparation: 0.8,
            separationForce: 0.15
        };
    }
    
    /**
     * キャラクターを強制的に分離させる（一度だけ実行）
     */
    spreadCharacters() {
        const allBehaviors = Array.from(this.behaviors.values());
        
        allBehaviors.forEach(behavior => {
            const myPos = behavior.getPosition();
            if (!myPos) return;
            
            const vrm = behavior.getVRM();
            if (!vrm || !vrm.scene) return;
            
            for (const other of allBehaviors) {
                if (other.id === behavior.id) continue;
                
                const otherPos = other.getPosition();
                if (!otherPos) continue;
                
                const diff = new THREE.Vector3().subVectors(myPos, otherPos);
                diff.y = 0;
                const dist = diff.length();
                
                if (dist < behavior.separationDistance) {
                    diff.normalize();
                    const pushAmount = (behavior.separationDistance - dist) + 0.1;
                    vrm.scene.position.x += diff.x * pushAmount;
                    vrm.scene.position.z += diff.z * pushAmount;
                }
            }
        });
        
        console.log('💥 キャラクターを強制分離しました');
    }
}

// グローバルエクスポート
window.CharacterBehavior = CharacterBehavior;
window.CharacterBehaviorManager = CharacterBehaviorManager;
