// ========================================
// VRM カプセル当たり判定
// VRMモデルに透明なカプセルで当たり判定を追加
// ========================================

console.log('🦴 VRM当たり判定システムを読み込み中...');

// VRMコライダー管理
window.vrmColliders = [];

// VRMが読み込まれたら当たり判定を追加
function setupVRMColliders() {
    // VRMの読み込みを待つ
    const checkVRM = setInterval(() => {
        if (window.app && window.app.vrm && window.physicsWorld) {
            clearInterval(checkVRM);
            
            // 既存のコライダーをクリア
            clearVRMColliders();
            
            // 新しいコライダーを追加
            createVRMColliders(window.app.vrm);
            
            console.log('✅ VRM当たり判定を追加しました');
        }
    }, 500);
}

// コライダーをクリア
function clearVRMColliders() {
    window.vrmColliders.forEach(collider => {
        if (collider.body) {
            window.physicsWorld.removeBody(collider.body);
        }
        if (collider.debugMesh && window.app && window.app.scene) {
            window.app.scene.remove(collider.debugMesh);
        }
    });
    window.vrmColliders = [];
}

// VRMにコライダーを作成
function createVRMColliders(vrm) {
    const THREE = window.THREE;
    
    if (!vrm || !vrm.humanoid) {
        console.warn('⚠️ VRM humanoidが見つかりません');
        return;
    }
    
    // ボーン定義（カプセルで囲む部位）
    const boneConfigs = [
        // 胴体
        { bone: 'hips', radius: 0.15, height: 0.2, offset: { x: 0, y: 0.1, z: 0 } },
        { bone: 'spine', radius: 0.12, height: 0.15, offset: { x: 0, y: 0.08, z: 0 } },
        { bone: 'chest', radius: 0.14, height: 0.2, offset: { x: 0, y: 0.1, z: 0 } },
        
        // 頭
        { bone: 'head', radius: 0.12, height: 0.15, offset: { x: 0, y: 0.1, z: 0 } },
        
        // 左腕
        { bone: 'leftUpperArm', radius: 0.04, height: 0.25, offset: { x: 0, y: -0.12, z: 0 } },
        { bone: 'leftLowerArm', radius: 0.035, height: 0.22, offset: { x: 0, y: -0.11, z: 0 } },
        
        // 右腕
        { bone: 'rightUpperArm', radius: 0.04, height: 0.25, offset: { x: 0, y: -0.12, z: 0 } },
        { bone: 'rightLowerArm', radius: 0.035, height: 0.22, offset: { x: 0, y: -0.11, z: 0 } },
        
        // 左足
        { bone: 'leftUpperLeg', radius: 0.06, height: 0.4, offset: { x: 0, y: -0.2, z: 0 } },
        { bone: 'leftLowerLeg', radius: 0.045, height: 0.35, offset: { x: 0, y: -0.18, z: 0 } },
        
        // 右足
        { bone: 'rightUpperLeg', radius: 0.06, height: 0.4, offset: { x: 0, y: -0.2, z: 0 } },
        { bone: 'rightLowerLeg', radius: 0.045, height: 0.35, offset: { x: 0, y: -0.18, z: 0 } },
    ];
    
    boneConfigs.forEach(config => {
        try {
            const boneNode = vrm.humanoid.getNormalizedBoneNode(config.bone);
            if (!boneNode) {
                console.log(`⚠️ ボーンが見つかりません: ${config.bone}`);
                return;
            }
            
            // Cannon.js: カプセル形状（球 + 円柱 + 球で近似）
            const body = new CANNON.Body({
                mass: 0, // 静的（動かない）
                type: CANNON.Body.KINEMATIC // キネマティック（手動で位置更新）
            });
            
            // カプセルを球2つ + 円柱で近似
            const sphereTop = new CANNON.Sphere(config.radius);
            const sphereBottom = new CANNON.Sphere(config.radius);
            const cylinder = new CANNON.Cylinder(config.radius, config.radius, config.height, 8);
            
            const halfHeight = config.height / 2;
            body.addShape(sphereTop, new CANNON.Vec3(0, halfHeight, 0));
            body.addShape(sphereBottom, new CANNON.Vec3(0, -halfHeight, 0));
            body.addShape(cylinder, new CANNON.Vec3(0, 0, 0));
            
            window.physicsWorld.addBody(body);
            
            // デバッグ用メッシュ（透明なワイヤーフレーム）
            let debugMesh = null;
            if (window.showVRMColliders) {
                const capsuleGeo = new THREE.CapsuleGeometry(config.radius, config.height, 4, 8);
                const capsuleMat = new THREE.MeshBasicMaterial({
                    color: 0x00ff00,
                    wireframe: true,
                    transparent: true,
                    opacity: 0.3
                });
                debugMesh = new THREE.Mesh(capsuleGeo, capsuleMat);
                window.app.scene.add(debugMesh);
            }
            
            window.vrmColliders.push({
                bone: config.bone,
                boneNode: boneNode,
                body: body,
                offset: config.offset,
                debugMesh: debugMesh
            });
            
        } catch (e) {
            console.warn(`⚠️ ${config.bone} のコライダー作成失敗:`, e);
        }
    });
    
    console.log(`🦴 ${window.vrmColliders.length}個のコライダーを作成`);
}

// 毎フレームコライダー位置を更新
function updateVRMColliders() {
    // 人形モード中は更新しない
    if (window.dollModeActive) return;
    
    const THREE = window.THREE;
    
    if (!THREE || window.vrmColliders.length === 0) return;
    
    const worldPos = new THREE.Vector3();
    const worldQuat = new THREE.Quaternion();
    
    window.vrmColliders.forEach(collider => {
        if (!collider.boneNode || !collider.body) return;
        
        // ボーンのワールド座標を取得
        collider.boneNode.getWorldPosition(worldPos);
        collider.boneNode.getWorldQuaternion(worldQuat);
        
        // オフセットを適用
        const offset = new THREE.Vector3(
            collider.offset.x,
            collider.offset.y,
            collider.offset.z
        );
        offset.applyQuaternion(worldQuat);
        worldPos.add(offset);
        
        // Cannon.jsボディの位置を更新
        collider.body.position.set(worldPos.x, worldPos.y, worldPos.z);
        collider.body.quaternion.set(worldQuat.x, worldQuat.y, worldQuat.z, worldQuat.w);
        
        // デバッグメッシュも更新
        if (collider.debugMesh) {
            collider.debugMesh.position.copy(worldPos);
            collider.debugMesh.quaternion.copy(worldQuat);
        }
    });
}

// 物理更新ループに組み込む
// 注意: physics-system.jsで既にループがあるので、ここでは無効化
function hookIntoPhysicsLoop() {
    // physics-system.jsのupdateVRMCollidersAndPushObjects()が
    // 既にコライダー更新を行っているため、ここでは何もしない
    console.log('ℹ️ vrm-collider.js: hookIntoPhysicsLoopは無効化（physics-system.jsが管理）');
}

// デバッグ表示切り替え
window.showVRMColliders = false;
window.toggleVRMColliderDebug = function() {
    window.showVRMColliders = !window.showVRMColliders;
    
    // 既存のコライダーを再作成
    if (window.app && window.app.vrm) {
        clearVRMColliders();
        createVRMColliders(window.app.vrm);
    }
    
    console.log(`🔧 VRMコライダー表示: ${window.showVRMColliders ? 'ON' : 'OFF'}`);
};

// VRM読み込みイベントを監視
function watchVRMLoad() {
    // 定期的にVRM変更をチェック
    let lastVRM = null;
    
    setInterval(() => {
        // 人形モード中はコライダーを作成しない
        if (window.dollModeActive) {
            return;
        }
        
        if (window.app && window.app.vrm && window.app.vrm !== lastVRM) {
            lastVRM = window.app.vrm;
            console.log('🎭 新しいVRMを検出、コライダーを作成...');
            
            clearVRMColliders();
            createVRMColliders(window.app.vrm);
        }
    }, 1000);
}

// 初期化
setupVRMColliders();
hookIntoPhysicsLoop();
watchVRMLoad();

// UI追加（デバッグ用）
function createColliderUI() {
    const checkPanel = setInterval(() => {
        const panel = document.querySelector('#physics-panel > div');
        if (panel && !document.getElementById('collider-debug-btn')) {
            clearInterval(checkPanel);
            
            const btn = document.createElement('button');
            btn.id = 'collider-debug-btn';
            btn.textContent = '🦴 VRM当たり判定 表示';
            btn.style.cssText = `
                width: 100%;
                padding: 8px;
                margin-top: 8px;
                background: #607D8B;
                color: white;
                border: none;
                border-radius: 6px;
                cursor: pointer;
                font-size: 12px;
            `;
            btn.onclick = () => {
                window.toggleVRMColliderDebug();
                btn.textContent = window.showVRMColliders ? '🦴 VRM当たり判定 非表示' : '🦴 VRM当たり判定 表示';
            };
            panel.appendChild(btn);
        }
    }, 500);
}

createColliderUI();

console.log('✅ vrm-collider.js 読み込み完了');
