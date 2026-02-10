// ========================================
// 物理演算 & FPS移動システム
// Cannon.js で物理演算、WASDで移動、オブジェクトを蹴れる！
// ========================================

console.log('🎮 物理演算システムを読み込み中...');

// Cannon.jsを動的に読み込み
const cannonScript = document.createElement('script');
cannonScript.src = 'https://cdnjs.cloudflare.com/ajax/libs/cannon.js/0.6.2/cannon.min.js';
cannonScript.onload = () => {
    console.log('✅ Cannon.js 読み込み完了');
    waitForDependencies();
};
cannonScript.onerror = () => {
    console.error('❌ Cannon.js 読み込み失敗');
};
document.head.appendChild(cannonScript);

// グローバル変数
window.physicsWorld = null;
window.physicsObjects = [];
window.playerBody = null;
window.fpsMode = false;
window.moveState = { forward: false, backward: false, left: false, right: false };

// FPSモード移動速度（1〜5キーで変更）
window.fpsSpeedLevel = 1;  // 現在の速度レベル（1〜5）
window.fpsSpeedMultipliers = [1, 1.5, 2.5, 3.5, 5];  // 各レベルの速度倍率（1が基準、5は5倍）
window.fpsBaseSpeed = 5;  // 基本速度

// 生成位置指定用
window.spawnPositionMode = false;
window.spawnCursor = null;
window.customSpawnPosition = null;

// サイズ指定用（グローバル）
window.spawnObjectSize = 1.0;

// 地面オブジェクト参照（非表示切り替え用）
window.groundObjects = {
    gridHelper: null,
    edgeMesh: null,
    groundMesh: null,
    groundBody: null,
    visible: true
};

// 弾丸管理用
window.bullets = [];
window.bulletLifetime = 30000; // 30秒で消える（ミリ秒）

// 弾丸用の事前作成済みリソース（パフォーマンス最適化）
window.bulletGeometry = null;
window.bulletMaterial = null;
window.bulletShape = null;

// 弾丸リソースを事前作成
function initBulletResources() {
    const THREE = window.THREE;
    if (!THREE) return;
    
    const bulletSize = 0.08;
    
    // ジオメトリを事前作成（セグメント数を減らして軽量化）
    window.bulletGeometry = new THREE.SphereGeometry(bulletSize, 8, 8);
    
    // マテリアルを事前作成
    window.bulletMaterial = new THREE.MeshBasicMaterial({
        color: 0xffff00,
        // MeshBasicMaterialは光源計算なしで軽い
    });
    
    // Cannon.jsの形状も事前作成
    if (typeof CANNON !== 'undefined') {
        window.bulletShape = new CANNON.Sphere(bulletSize);
    }
    
    console.log('✅ 弾丸リソース事前作成完了');
}

function waitForDependencies() {
    console.log('⏳ Three.js と app を待機中...');
    
    let attempts = 0;
    const maxAttempts = 100; // 10秒待つ
    
    const waitInterval = setInterval(() => {
        attempts++;
        
        // デバッグ情報
        if (attempts % 10 === 0) {
            console.log(`⏳ 待機中... (${attempts}回目)`, {
                THREE: !!window.THREE,
                app: !!window.app,
                scene: window.app ? !!window.app.scene : false,
                CANNON: typeof CANNON !== 'undefined'
            });
        }
        
        // Three.jsとappが準備できたか確認
        if (window.THREE && window.app && window.app.scene && typeof CANNON !== 'undefined') {
            clearInterval(waitInterval);
            console.log('✅ 依存関係が準備完了！');
            initPhysicsSystem();
        } else if (attempts >= maxAttempts) {
            clearInterval(waitInterval);
            console.error('❌ タイムアウト: Three.js または app が見つかりません');
            console.log('現在の状態:', {
                THREE: !!window.THREE,
                app: !!window.app,
                CANNON: typeof CANNON !== 'undefined'
            });
        }
    }, 100);
}

function initPhysicsSystem() {
    try {
        setupPhysics();
        // 弾丸リソースを事前作成（発射時の遅延を防止）
        initBulletResources();
    } catch (error) {
        console.error('❌ 物理システム初期化エラー:', error);
    }
}

function setupPhysics() {
    const THREE = window.THREE;
    
    // 物理ワールド作成
    window.physicsWorld = new CANNON.World();
    window.physicsWorld.gravity.set(0, -9.82, 0);
    window.physicsWorld.broadphase = new CANNON.NaiveBroadphase();
    window.physicsWorld.solver.iterations = 10;
    
    console.log('✅ 物理ワールド作成');
    
    // 透明な地面を作成
    createGround(THREE);
    
    // プレイヤー（カメラ）の物理ボディを作成
    createPlayerBody();
    
    // UI作成
    createPhysicsUI();
    
    // キー入力設定
    setupKeyControls();
    
    // 物理演算更新ループ
    startPhysicsLoop(THREE);
    
    console.log('✅ 物理演算システム初期化完了');
}

// 透明な地面を作成
function createGround(THREE) {
    // Three.js: ワイヤーフレームのグリッド地面
    const gridSize = 50;
    const gridDivisions = 50;
    
    // ワイヤーフレームグリッド
    const gridHelper = new THREE.GridHelper(gridSize, gridDivisions, 0x00ffff, 0x004444);
    gridHelper.material.transparent = true;
    gridHelper.material.opacity = 0.3;
    gridHelper.position.y = 0.01; // 少し浮かせる
    window.app.scene.add(gridHelper);
    window.groundObjects.gridHelper = gridHelper;  // 参照保存
    
    // 外枠のワイヤーフレーム
    const edgeGeometry = new THREE.EdgesGeometry(
        new THREE.PlaneGeometry(gridSize, gridSize)
    );
    const edgeMaterial = new THREE.LineBasicMaterial({ 
        color: 0x00ffff, 
        transparent: true, 
        opacity: 0.5 
    });
    const edgeMesh = new THREE.LineSegments(edgeGeometry, edgeMaterial);
    edgeMesh.rotation.x = -Math.PI / 2;
    edgeMesh.position.y = 0.02;
    window.app.scene.add(edgeMesh);
    window.groundObjects.edgeMesh = edgeMesh;  // 参照保存
    
    // 物理判定用の透明な床（見えない）
    const groundGeometry = new THREE.PlaneGeometry(50, 50);
    const groundMaterial = new THREE.MeshBasicMaterial({ 
        visible: false  // 完全に見えない
    });
    const groundMesh = new THREE.Mesh(groundGeometry, groundMaterial);
    groundMesh.rotation.x = -Math.PI / 2;
    groundMesh.position.y = 0;
    window.app.scene.add(groundMesh);
    window.groundObjects.groundMesh = groundMesh;  // 参照保存
    
    // Cannon.js: 物理的な地面
    const groundShape = new CANNON.Plane();
    const groundBody = new CANNON.Body({ mass: 0 }); // mass: 0 = 動かない
    groundBody.addShape(groundShape);
    groundBody.quaternion.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), -Math.PI / 2);
    
    // 地面のマテリアル（反発係数を設定）
    const cannonGroundMaterial = new CANNON.Material('ground');
    groundBody.material = cannonGroundMaterial;
    
    window.physicsWorld.addBody(groundBody);
    window.groundObjects.groundBody = groundBody;  // 参照保存
    
    // グローバルに地面マテリアルを保存（オブジェクト生成時に使用）
    window.cannonGroundMaterial = cannonGroundMaterial;
    
    // デフォルトの接触マテリアル設定（全オブジェクト共通）
    const cannonDefaultMaterial = new CANNON.Material('default');
    window.defaultMaterial = cannonDefaultMaterial;
    
    // 地面とオブジェクトの接触設定（弾む！）
    const groundContactMaterial = new CANNON.ContactMaterial(
        cannonGroundMaterial,
        cannonDefaultMaterial,
        {
            friction: 0.3,        // 摩擦係数
            restitution: 0.6      // 反発係数（0=弾まない, 1=完全に弾む）
        }
    );
    window.physicsWorld.addContactMaterial(groundContactMaterial);
    
    // オブジェクト同士の接触設定
    const objectContactMaterial = new CANNON.ContactMaterial(
        cannonDefaultMaterial,
        cannonDefaultMaterial,
        {
            friction: 0.3,
            restitution: 0.5      // オブジェクト同士も弾む
        }
    );
    window.physicsWorld.addContactMaterial(objectContactMaterial);
    
    console.log('✅ 透明な地面を作成（反発係数付き）');
}

// プレイヤーの物理ボディを作成（カプセルコライダー）
function createPlayerBody() {
    // カプセル型コライダー: 高さ1.65m（円柱1.05m + 上下の半球0.3m×2）
    const capsuleRadius = 0.3;  // カプセルの半径
    const capsuleHeight = 1.05; // 円柱部分の高さ
    
    window.playerBody = new CANNON.Body({
        mass: 60, // 60kg
        position: new CANNON.Vec3(0, 1.65, 3), // 目線の高さ
        linearDamping: 0.9,
        angularDamping: 0.9,
        fixedRotation: true,  // プレイヤーが倒れないように
        collisionFilterGroup: 1,  // プレイヤーグループ
        collisionFilterMask: 1 | 2 | 4  // 全てのコライダーと衝突（1=物理、2=VRM、4=環境）
    });
    
    // 円柱部分（胴体）
    const cylinderShape = new CANNON.Cylinder(capsuleRadius, capsuleRadius, capsuleHeight, 8);
    window.playerBody.addShape(cylinderShape, new CANNON.Vec3(0, 0, 0));
    
    // 上部の半球（頭）
    const topSphere = new CANNON.Sphere(capsuleRadius);
    window.playerBody.addShape(topSphere, new CANNON.Vec3(0, capsuleHeight / 2, 0));
    
    // 下部の半球（足）
    const bottomSphere = new CANNON.Sphere(capsuleRadius);
    window.playerBody.addShape(bottomSphere, new CANNON.Vec3(0, -capsuleHeight / 2, 0));
    
    window.physicsWorld.addBody(window.playerBody);
    
    // ジャンプ力の倍率を初期化
    window.jumpMultiplier = 1;
    window.baseJumpVelocity = 5.5; // 1倍で約1mジャンプする初速度
    
    // ★ 環境コライダーとの衝突検出 ★
    window.playerOnEnvironment = false;
    window.playerBody.addEventListener('collide', function(e) {
        // 環境コライダー（グループ2）との衝突を検出
        const otherBody = e.body;
        if (otherBody.collisionFilterGroup === 2) {
            // 衝突法線を確認（上向きなら着地）
            const contact = e.contact;
            const normal = contact.ni;
            // 法線が上向き（Y > 0.5）なら地面扱い
            if (normal.y > 0.5 || normal.y < -0.5) {
                window.playerOnEnvironment = true;
            }
        }
    });
    
    console.log('✅ プレイヤーカプセルコライダー作成（高さ1.65m）');
}


// ジャンプ倍率表示を更新
function updateJumpDisplay() {
    let display = document.getElementById('jump-power-display');
    if (!display) {
        display = document.createElement('div');
        display.id = 'jump-power-display';
        display.style.cssText = `
            position: fixed;
            top: 60px;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(0, 200, 83, 0.9);
            color: white;
            padding: 8px 16px;
            border-radius: 20px;
            font-size: 14px;
            font-weight: bold;
            z-index: 10000;
            pointer-events: none;
        `;
        document.body.appendChild(display);
    }
    display.textContent = '🦘 ジャンプ力: ' + (window.jumpMultiplier || 1) + '倍';
    display.style.display = 'block';
    
    // 2秒後に非表示
    clearTimeout(window.jumpDisplayTimeout);
    window.jumpDisplayTimeout = setTimeout(() => {
        display.style.display = 'none';
    }, 2000);
}

// キー入力設定
function setupKeyControls() {
    document.addEventListener('keydown', (e) => {
        if (!window.fpsMode) return;
        
        switch(e.code) {
            case 'KeyW': window.moveState.forward = true; break;
            case 'KeyS': window.moveState.backward = true; break;
            case 'KeyA': window.moveState.left = true; break;
            case 'KeyD': window.moveState.right = true; break;
            case 'Space': 
                e.preventDefault();
                // ジャンプ（地面にいる時のみ）- 現在の倍率でジャンプ
                if (window.isOnGround) {
                    const jumpPower = (window.baseJumpVelocity || 5.5) * (window.jumpMultiplier || 1);
                    window.playerBody.velocity.y = jumpPower;
                    window.isOnGround = false;
                    console.log('🦘 ジャンプ！（' + (window.jumpMultiplier || 1) + '倍）');
                }
                break;
            case 'Digit6':
            case 'Numpad6':
                e.preventDefault();
                window.jumpMultiplier = 1;
                console.log('🎚️ ジャンプ力: 1倍（約1m）');
                updateJumpDisplay();
                break;
            case 'Digit7':
            case 'Numpad7':
                e.preventDefault();
                window.jumpMultiplier = 2;
                console.log('🎚️ ジャンプ力: 2倍（約2m）');
                updateJumpDisplay();
                break;
            case 'Digit8':
            case 'Numpad8':
                e.preventDefault();
                window.jumpMultiplier = 4;
                console.log('🎚️ ジャンプ力: 4倍（約4m）');
                updateJumpDisplay();
                break;
            case 'Digit9':
            case 'Numpad9':
                e.preventDefault();
                window.jumpMultiplier = 8;
                console.log('🎚️ ジャンプ力: 8倍（約8m）');
                updateJumpDisplay();
                break;
            case 'Digit0':
            case 'Numpad0':
                e.preventDefault();
                window.jumpMultiplier = 16;
                console.log('🎚️ ジャンプ力: 16倍（約16m）');
                updateJumpDisplay();
                break;
            case 'KeyE':
                // 蹴る！
                kickNearbyObjects();
                break;
            
            // 速度変更（1〜5キー）
            case 'Digit1':
            case 'Numpad1':
                setFPSSpeedLevel(1);
                break;
            case 'Digit2':
            case 'Numpad2':
                setFPSSpeedLevel(2);
                break;
            case 'Digit3':
            case 'Numpad3':
                setFPSSpeedLevel(3);
                break;
            case 'Digit4':
            case 'Numpad4':
                setFPSSpeedLevel(4);
                break;
            case 'Digit5':
            case 'Numpad5':
                setFPSSpeedLevel(5);
                break;
        }
    });
    
    document.addEventListener('keyup', (e) => {
        switch(e.code) {
            case 'KeyW': window.moveState.forward = false; break;
            case 'KeyS': window.moveState.backward = false; break;
            case 'KeyA': window.moveState.left = false; break;
            case 'KeyD': window.moveState.right = false; break;
        }
    });
    
    // マウス中クリック（ホイール押し込み）で弾発射
    document.addEventListener('mousedown', (e) => {
        if (!window.fpsMode) return;
        if (e.button !== 1) return; // 中クリック（ホイール押し込み）のみ
        
        e.preventDefault(); // デフォルトのスクロール動作を防止
        
        // UIパネル上のクリックは無視
        if (e.target.closest('#physics-panel')) return;
        if (e.target.closest('#env-panel')) return;
        if (e.target.closest('#chat-panel')) return;
        
        shootBullet();
    });
    
    // 中クリックのデフォルト動作を防止（ページスクロール防止）
    document.addEventListener('auxclick', (e) => {
        if (window.fpsMode && e.button === 1) {
            e.preventDefault();
        }
    });
    
    console.log('✅ キー操作設定完了');
}

// 弾を発射（最適化版）
function shootBullet() {
    const THREE = window.THREE;
    if (!THREE || !window.app || !window.app.camera) return;
    if (!window.bulletGeometry || !window.bulletMaterial) {
        // リソースがない場合は初期化
        initBulletResources();
        if (!window.bulletGeometry) return;
    }
    
    const camera = window.app.camera;
    const bulletSize = 0.08;
    const bulletSpeed = 50;
    
    // カメラの位置と方向を取得
    const startPos = new THREE.Vector3();
    camera.getWorldPosition(startPos);
    
    const direction = new THREE.Vector3();
    camera.getWorldDirection(direction);
    
    // 少し前から発射
    startPos.add(direction.clone().multiplyScalar(0.5));
    
    // 事前作成済みのジオメトリとマテリアルを再利用（高速）
    const mesh = new THREE.Mesh(window.bulletGeometry, window.bulletMaterial);
    mesh.position.copy(startPos);
    window.app.scene.add(mesh);
    
    // 物理ボディを作成（形状は再利用）
    const body = new CANNON.Body({
        mass: 0.1,
        position: new CANNON.Vec3(startPos.x, startPos.y, startPos.z),
        shape: window.bulletShape,
        linearDamping: 0.01,
        angularDamping: 0.01,
        collisionFilterGroup: 1,
        collisionFilterMask: 1 | 2
    });
    
    if (window.defaultMaterial) {
        body.material = window.defaultMaterial;
    }
    
    // 発射方向に速度を設定
    body.velocity.set(
        direction.x * bulletSpeed,
        direction.y * bulletSpeed,
        direction.z * bulletSpeed
    );
    
    window.physicsWorld.addBody(body);
    
    // 弾丸オブジェクトを管理リストに追加
    const bullet = {
        mesh: mesh,
        body: body,
        createdAt: Date.now()
    };
    window.bullets.push(bullet);
    
    // physicsObjectsにも追加
    window.physicsObjects.push({
        mesh: mesh,
        body: body,
        type: 'bullet',
        size: bulletSize * 2,
        isBullet: true
    });
    
    // 弾丸が他のオブジェクトに当たった時の処理
    body.addEventListener('collide', (event) => {
        const contactBody = event.body;
        
        // 地面との衝突は無視
        if (contactBody.mass === 0) return;
        
        // 弾丸同士の衝突は無視
        const hitBullet = window.bullets.find(b => b.body === contactBody);
        if (hitBullet) return;
        
        // 衝突したオブジェクトにインパルスを与える
        const bulletVel = body.velocity;
        const impulse = new CANNON.Vec3(
            bulletVel.x * 0.3,
            bulletVel.y * 0.3 + 2,
            bulletVel.z * 0.3
        );
        contactBody.applyImpulse(impulse, contactBody.position);
    });
    
    // 発射音（非同期）
    playShootSound();
}

// 右手または手首から弾を発射（モーキャプVRMの右手を使用）
// mode: 'hand' = 右手の先（手のひら方向）, 'wrist' = 手首先（肘→手首方向）
function shootBulletFromHand(mode = 'hand') {
    const THREE = window.THREE;
    if (!THREE || !window.app || !window.physicsWorld) return;
    if (!window.bulletGeometry || !window.bulletMaterial) {
        initBulletResources();
        if (!window.bulletGeometry) return;
    }
    
    // モーキャプVRMの右手を取得
    if (!window.vmcMocap) {
        console.log('❌ VMCモーキャプが接続されていません');
        return;
    }
    
    const mocapVRM = window.vmcMocap.getTargetVRM();
    if (!mocapVRM || !mocapVRM.humanoid) {
        console.log('❌ モーキャプVRMが見つかりません');
        return;
    }
    
    const humanoid = mocapVRM.humanoid;
    
    // VRMの位置オフセットを取得
    const vrmPos = window.vmcMocap.getVRMPosition ? window.vmcMocap.getVRMPosition() : { x: 0, y: 0, z: 0 };
    
    let startPos, direction;
    
    if (mode === 'wrist') {
        // === 手首先モード: 肘→手首の方向に発射 ===
        const rightLowerArm = humanoid.getNormalizedBoneNode('rightLowerArm'); // 聘
        const rightHand = humanoid.getNormalizedBoneNode('rightHand'); // 手首
        
        if (!rightLowerArm || !rightHand) {
            console.log('❌ 腕ボーンが見つかりません');
            return;
        }
        
        // 聘と手首のワールド座標を取得
        const elbowWorldPos = new THREE.Vector3();
        const wristWorldPos = new THREE.Vector3();
        rightLowerArm.getWorldPosition(elbowWorldPos);
        rightHand.getWorldPosition(wristWorldPos);
        
        // 聘→手首の方向ベクトルを計算
        direction = new THREE.Vector3();
        direction.subVectors(wristWorldPos, elbowWorldPos);
        direction.normalize();
        
        // 発射位置は手首（少し前にオフセット）
        startPos = new THREE.Vector3(
            wristWorldPos.x + vrmPos.x,
            wristWorldPos.y + vrmPos.y,
            wristWorldPos.z + vrmPos.z
        );
        startPos.add(direction.clone().multiplyScalar(0.1));
        
        console.log('🦾 手首先から弾発射！');
    } else {
        // === 右手の先モード: 手のひら方向に発射 ===
        const rightHand = humanoid.getNormalizedBoneNode('rightHand');
        if (!rightHand) {
            console.log('❌ 右手ボーンが見つかりません');
            return;
        }
        
        // 右手のワールド座標を取得
        const handWorldPos = new THREE.Vector3();
        rightHand.getWorldPosition(handWorldPos);
        
        startPos = new THREE.Vector3(
            handWorldPos.x + vrmPos.x,
            handWorldPos.y + vrmPos.y,
            handWorldPos.z + vrmPos.z
        );
        
        // 右手の向き（ワールド座標での前方向）を取得
        const handWorldQuat = new THREE.Quaternion();
        rightHand.getWorldQuaternion(handWorldQuat);
        
        // 手の前方向（Y軸負方向が手のひら向き）
        direction = new THREE.Vector3(0, -1, 0);
        direction.applyQuaternion(handWorldQuat);
        direction.normalize();
        
        // 発射位置を少し前にオフセット
        startPos.add(direction.clone().multiplyScalar(0.15));
        
        console.log('✋ 右手から弾発射！');
    }
    
    const bulletSize = 0.08;
    const bulletSpeed = 50;
    
    // メッシュ作成
    const mesh = new THREE.Mesh(window.bulletGeometry, window.bulletMaterial);
    mesh.position.copy(startPos);
    window.app.scene.add(mesh);
    
    // 物理ボディを作成
    const body = new CANNON.Body({
        mass: 0.1,
        position: new CANNON.Vec3(startPos.x, startPos.y, startPos.z),
        shape: window.bulletShape,
        linearDamping: 0.01,
        angularDamping: 0.01,
        collisionFilterGroup: 1,
        collisionFilterMask: 1 | 2
    });
    
    if (window.defaultMaterial) {
        body.material = window.defaultMaterial;
    }
    
    // 発射方向に速度を設定
    body.velocity.set(
        direction.x * bulletSpeed,
        direction.y * bulletSpeed,
        direction.z * bulletSpeed
    );
    
    window.physicsWorld.addBody(body);
    
    // 弾丸オブジェクトを管理リストに追加
    const bullet = {
        mesh: mesh,
        body: body,
        createdAt: Date.now()
    };
    window.bullets.push(bullet);
    
    window.physicsObjects.push({
        mesh: mesh,
        body: body,
        type: 'bullet',
        size: bulletSize * 2,
        isBullet: true
    });
    
    // 弾丸が他のオブジェクトに当たった時の処理
    body.addEventListener('collide', (event) => {
        const contactBody = event.body;
        if (contactBody.mass === 0) return;
        const hitBullet = window.bullets.find(b => b.body === contactBody);
        if (hitBullet) return;
        const bulletVel = body.velocity;
        const impulse = new CANNON.Vec3(
            bulletVel.x * 0.3,
            bulletVel.y * 0.3 + 2,
            bulletVel.z * 0.3
        );
        contactBody.applyImpulse(impulse, contactBody.position);
    });
    
    // 発射音
    playShootSound();
}

// グローバルに公開
window.shootBulletFromHand = shootBulletFromHand;

// 発射音用のAudioContext（一度だけ作成して再利用）
let shootAudioCtx = null;

// 発射音を再生（非同期で遅延なく再生）
function playShootSound() {
    // 非同期で実行して発射処理をブロックしない
    setTimeout(() => {
        try {
            // AudioContextを再利用
            if (!shootAudioCtx) {
                shootAudioCtx = new (window.AudioContext || window.webkitAudioContext)();
            }
            
            // AudioContextが一時停止している場合は再開
            if (shootAudioCtx.state === 'suspended') {
                shootAudioCtx.resume();
            }
            
            const oscillator = shootAudioCtx.createOscillator();
            const gainNode = shootAudioCtx.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(shootAudioCtx.destination);
            
            oscillator.frequency.setValueAtTime(800, shootAudioCtx.currentTime);
            oscillator.frequency.exponentialRampToValueAtTime(200, shootAudioCtx.currentTime + 0.1);
            
            gainNode.gain.setValueAtTime(0.3, shootAudioCtx.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, shootAudioCtx.currentTime + 0.1);
            
            oscillator.start(shootAudioCtx.currentTime);
            oscillator.stop(shootAudioCtx.currentTime + 0.1);
        } catch (e) {
            // 音が出なくても問題なし
        }
    }, 0);
}

// 古い弾丸を削除
function cleanupOldBullets() {
    const now = Date.now();
    
    for (let i = window.bullets.length - 1; i >= 0; i--) {
        const bullet = window.bullets[i];
        
        if (now - bullet.createdAt > window.bulletLifetime) {
            // メッシュをシーンから削除（ジオメトリとマテリアルは再利用なのでdisposeしない）
            if (bullet.mesh && window.app && window.app.scene) {
                window.app.scene.remove(bullet.mesh);
            }
            
            // 物理ボディを削除
            if (bullet.body && window.physicsWorld) {
                window.physicsWorld.removeBody(bullet.body);
            }
            
            // physicsObjectsからも削除
            const objIndex = window.physicsObjects.findIndex(obj => obj.mesh === bullet.mesh);
            if (objIndex !== -1) {
                window.physicsObjects.splice(objIndex, 1);
            }
            
            // bulletsリストから削除
            window.bullets.splice(i, 1);
        }
    }
}

// FPS移動速度レベルを設定
function setFPSSpeedLevel(level) {
    if (level < 1 || level > 5) return;
    
    window.fpsSpeedLevel = level;
    const multiplier = window.fpsSpeedMultipliers[level - 1];
    const actualSpeed = window.fpsBaseSpeed * multiplier;
    
    console.log(`🏃 速度レベル: ${level} (${multiplier}x = ${actualSpeed.toFixed(1)}m/s)`);
    
    // UI更新
    updateSpeedDisplay();
}

// 速度表示を更新
function updateSpeedDisplay() {
    const display = document.getElementById('fps-speed-display');
    if (display) {
        const level = window.fpsSpeedLevel;
        const multiplier = window.fpsSpeedMultipliers[level - 1];
        display.textContent = `速度: ${level} (${multiplier}x)`;
        
        // レベルに応じて色を変更
        const colors = ['#4CAF50', '#8BC34A', '#FFEB3B', '#FF9800', '#F44336'];
        display.style.background = colors[level - 1];
        display.style.color = level >= 3 ? '#000' : '#fff';
    }
}

// 近くのオブジェクトを蹴る
function kickNearbyObjects() {
    const playerPos = window.playerBody.position;
    const kickForce = 20;
    const kickRange = 2;
    
    window.physicsObjects.forEach(obj => {
        const dx = obj.body.position.x - playerPos.x;
        const dy = obj.body.position.y - playerPos.y;
        const dz = obj.body.position.z - playerPos.z;
        const distance = Math.sqrt(dx*dx + dy*dy + dz*dz);
        
        if (distance < kickRange) {
            // 蹴る方向を計算
            const dirX = dx / distance;
            const dirY = 0.5;
            const dirZ = dz / distance;
            
            obj.body.applyImpulse(
                new CANNON.Vec3(dirX * kickForce, dirY * kickForce, dirZ * kickForce),
                obj.body.position
            );
            
            console.log('🦶 蹴った！', obj.mesh.name);
        }
    });
}

// 物理演算更新ループ
function startPhysicsLoop(THREE) {
    const timeStep = 1/60;
    
    function updatePhysics() {
        if (!window.physicsWorld) {
            requestAnimationFrame(updatePhysics);
            return;
        }
        
        // FPSモード時のプレイヤー移動
        if (window.fpsMode && window.playerBody && window.app && window.app.camera) {
            // 速度レベルに応じた速度を計算
            const multiplier = window.fpsSpeedMultipliers[window.fpsSpeedLevel - 1] || 1;
            const speed = window.fpsBaseSpeed * multiplier;
            const camera = window.app.camera;
            
            // ★★★ 重要: OrbitControlsを完全に無効化 ★★★
            if (window.app.controls) {
                window.app.controls.enabled = false;
            }
            
            // カメラの向いている方向を取得
            const yaw = window.fpsYaw;
            
            // 前方向（カメラが向いてる方向）
            const forwardX = Math.sin(yaw);
            const forwardZ = Math.cos(yaw);
            
            // 右方向（前方向を右に90度回転）
            const rightX = Math.sin(yaw + Math.PI / 2);
            const rightZ = Math.cos(yaw + Math.PI / 2);
            
            // 移動ベクトル計算
            let moveX = 0, moveZ = 0;
            
            // W: 前に進む
            if (window.moveState.forward) {
                moveX -= forwardX * speed;
                moveZ -= forwardZ * speed;
            }
            // S: 後ろに下がる
            if (window.moveState.backward) {
                moveX += forwardX * speed;
                moveZ += forwardZ * speed;
            }
            // A: 左に移動
            if (window.moveState.left) {
                moveX -= rightX * speed;
                moveZ -= rightZ * speed;
            }
            // D: 右に移動
            if (window.moveState.right) {
                moveX += rightX * speed;
                moveZ += rightZ * speed;
            }
            
            // コリジョン応答を考慮した移動（加算式）
            // 現在の速度を取得し、目標速度と混合
            const currentVelX = window.playerBody.velocity.x;
            const currentVelZ = window.playerBody.velocity.z;
            
            // コリジョンで減速された速度を保持しつつ、入力方向へ加速
            const blendFactor = 0.5; // 0に近いほどコリジョン応答を重視
            window.playerBody.velocity.x = currentVelX * (1 - blendFactor) + moveX * blendFactor;
            window.playerBody.velocity.z = currentVelZ * (1 - blendFactor) + moveZ * blendFactor;
            
            // ジャンプ対応：地面判定（地面ON/OFF対応 + 環境コライダー対応）
            const groundEnabled = window.groundObjects && window.groundObjects.visible;
            const minHeight = groundEnabled ? 1.65 : -10000;  // 地面OFFなら制限なし
            
            // 環境コライダー上にいるかチェック
            if (window.playerOnEnvironment) {
                // 環境コライダー（街など）の上にいる
                if (window.playerBody.velocity.y < 0) {
                    window.playerBody.velocity.y = 0;  // 落下停止
                }
                window.isOnGround = true;
                window.playerOnEnvironment = false;  // 次フレーム用にリセット
            } else if (window.playerBody.position.y <= minHeight) {
                // デフォルト地面に到達
                window.playerBody.position.y = minHeight;
                if (window.playerBody.velocity.y < 0) {
                    window.playerBody.velocity.y = 0;
                }
                window.isOnGround = true;
            } else {
                // 空中では重力を適用
                window.playerBody.velocity.y -= 0.3; // 重力加速度
                window.isOnGround = false;
            }
            
            // カメラ位置をプレイヤーに追従（物理演算後の位置を使用）
            camera.position.x = window.playerBody.position.x;
            camera.position.y = window.playerBody.position.y;
            camera.position.z = window.playerBody.position.z;
            
            // ★★★ カメラの回転を直接設定（Quaternion使用）★★★
            // EulerではなくQuaternionで設定するとOrbitControlsの干渉を避ける
            const quaternion = new THREE.Quaternion();
            const euler = new THREE.Euler(window.fpsPitch, window.fpsYaw, 0, 'YXZ');
            quaternion.setFromEuler(euler);
            camera.quaternion.copy(quaternion);
        }
        
        // 物理演算を進める
        window.physicsWorld.step(timeStep);
        
        // Three.jsのメッシュを物理ボディに同期
        window.physicsObjects.forEach(obj => {
            if (obj.mesh && obj.body) {
                obj.mesh.position.copy(obj.body.position);
                obj.mesh.quaternion.copy(obj.body.quaternion);
            }
        });
        
        // 古い弾丸を削除（1秒ごとにチェック）
        if (!window.lastBulletCleanup || Date.now() - window.lastBulletCleanup > 1000) {
            cleanupOldBullets();
            window.lastBulletCleanup = Date.now();
        }
        
        requestAnimationFrame(updatePhysics);
    }
    
    updatePhysics();
    console.log('✅ 物理演算ループ開始');
}

// サイズスライダーの値を取得してオブジェクト生成
window.spawnWithSize = function(type) {
    const slider = document.getElementById('size-slider');
    const size = slider ? parseFloat(slider.value) : 1.0;
    console.log('📦 spawnWithSize:', type, 'サイズ:', size);
    window.spawnPhysicsObject(type, null, null, size);
};

// 3Dオブジェクトを生成
window.spawnPhysicsObject = function(type, position, color, size) {
    const THREE = window.THREE;
    
    if (!THREE || !window.app || !window.app.scene || !window.physicsWorld) {
        console.error('❌ 物理システムが初期化されていません');
        return null;
    }
    
    // カスタム位置が指定されている場合はそれを使用
    const pos = position || window.customSpawnPosition || { 
        x: (Math.random() - 0.5) * 4, 
        y: 3 + (size || 1) * 0.5, // サイズに応じて高さ調整
        z: (Math.random() - 0.5) * 4 
    };
    
    // カスタム位置使用後は高さを調整
    if (window.customSpawnPosition && !position) {
        pos.y = window.customSpawnPosition.y + (size || 1) * 0.5;
    }
    
    const col = color || Math.random() * 0xffffff;
    const s = size || 1.0; // サイズ（デフォルト 1m）
    
    let mesh, body;
    
    try {
        switch(type) {
            case 'box':
                // 箱
                const boxGeo = new THREE.BoxGeometry(s, s, s);
                const boxMat = new THREE.MeshStandardMaterial({ color: col });
                mesh = new THREE.Mesh(boxGeo, boxMat);
                mesh.castShadow = true;
                const boxShape = new CANNON.Box(new CANNON.Vec3(s/2, s/2, s/2));
                body = new CANNON.Body({ 
                    mass: s * s * s, 
                    shape: boxShape,
                    collisionFilterGroup: 1, // 物理オブジェクトグループ
                    collisionFilterMask: 1 | 2 // 物理オブジェクトとVRM両方と衝突
                });
                break;
                
            case 'sphere':
                // 球
                const sphereGeo = new THREE.SphereGeometry(s/2, 32, 32);
                const sphereMat = new THREE.MeshStandardMaterial({ color: col });
                mesh = new THREE.Mesh(sphereGeo, sphereMat);
                mesh.castShadow = true;
                const sphereShape = new CANNON.Sphere(s/2);
                body = new CANNON.Body({ 
                    mass: s * s * s * 0.5, 
                    shape: sphereShape,
                    collisionFilterGroup: 1,
                    collisionFilterMask: 1 | 2
                });
                break;
                
            case 'cylinder':
                // 円柱
                const cylGeo = new THREE.CylinderGeometry(s/3, s/3, s, 32);
                const cylMat = new THREE.MeshStandardMaterial({ color: col });
                mesh = new THREE.Mesh(cylGeo, cylMat);
                mesh.castShadow = true;
                const cylShape = new CANNON.Cylinder(s/3, s/3, s, 16);
                body = new CANNON.Body({ 
                    mass: s * s * s * 0.7, 
                    shape: cylShape,
                    collisionFilterGroup: 1,
                    collisionFilterMask: 1 | 2
                });
                break;
                
            case 'cone':
                // コーン
                const coneGeo = new THREE.ConeGeometry(s/2, s, 32);
                const coneMat = new THREE.MeshStandardMaterial({ color: col });
                mesh = new THREE.Mesh(coneGeo, coneMat);
                mesh.castShadow = true;
                const coneShape = new CANNON.Cylinder(0, s/2, s, 16);
                body = new CANNON.Body({ 
                    mass: s * s * s * 0.3, 
                    shape: coneShape,
                    collisionFilterGroup: 1,
                    collisionFilterMask: 1 | 2
                });
                break;
                
            case 'torus':
                // ドーナツ
                const torusGeo = new THREE.TorusGeometry(s/2, s/6, 16, 48);
                const torusMat = new THREE.MeshStandardMaterial({ color: col });
                mesh = new THREE.Mesh(torusGeo, torusMat);
                mesh.castShadow = true;
                // トーラスは球で近似
                const torusShape = new CANNON.Sphere(s/2);
                body = new CANNON.Body({ 
                    mass: s * s * 0.5, 
                    shape: torusShape,
                    collisionFilterGroup: 1,
                    collisionFilterMask: 1 | 2
                });
                break;
                
            case 'capsule':
                // カプセル
                const capsuleGeo = new THREE.CapsuleGeometry(s/4, s/2, 16, 32);
                const capsuleMat = new THREE.MeshStandardMaterial({ color: col });
                mesh = new THREE.Mesh(capsuleGeo, capsuleMat);
                mesh.castShadow = true;
                const capsuleShape = new CANNON.Cylinder(s/4, s/4, s, 16);
                body = new CANNON.Body({ 
                    mass: s * s * s * 0.5, 
                    shape: capsuleShape,
                    collisionFilterGroup: 1,
                    collisionFilterMask: 1 | 2
                });
                break;
                
            case 'plane':
                // 板
                const planeGeo = new THREE.BoxGeometry(s, s/10, s);
                const planeMat = new THREE.MeshStandardMaterial({ color: col });
                mesh = new THREE.Mesh(planeGeo, planeMat);
                mesh.castShadow = true;
                const planeShape = new CANNON.Box(new CANNON.Vec3(s/2, s/20, s/2));
                body = new CANNON.Body({ 
                    mass: s * s * 0.2, 
                    shape: planeShape,
                    collisionFilterGroup: 1,
                    collisionFilterMask: 1 | 2
                });
                break;
                
            case 'icosahedron':
                // アイコサヘドロン（サッカーボール風）
                const icoGeo = new THREE.IcosahedronGeometry(s/2);
                const icoMat = new THREE.MeshStandardMaterial({ color: col });
                mesh = new THREE.Mesh(icoGeo, icoMat);
                mesh.castShadow = true;
                const icoShape = new CANNON.Sphere(s/2);
                body = new CANNON.Body({ 
                    mass: s * s * s * 0.5, 
                    shape: icoShape,
                    collisionFilterGroup: 1,
                    collisionFilterMask: 1 | 2
                });
                break;
                
            case 'octahedron':
                // 八面体
                const octGeo = new THREE.OctahedronGeometry(s/2);
                const octMat = new THREE.MeshStandardMaterial({ color: col });
                mesh = new THREE.Mesh(octGeo, octMat);
                mesh.castShadow = true;
                const octShape = new CANNON.Sphere(s/2);
                body = new CANNON.Body({ 
                    mass: s * s * s * 0.4, 
                    shape: octShape,
                    collisionFilterGroup: 1,
                    collisionFilterMask: 1 | 2
                });
                break;
                
            case 'tetrahedron':
                // 四面体
                const tetraGeo = new THREE.TetrahedronGeometry(s/2);
                const tetraMat = new THREE.MeshStandardMaterial({ color: col });
                mesh = new THREE.Mesh(tetraGeo, tetraMat);
                mesh.castShadow = true;
                const tetraShape = new CANNON.Sphere(s/3);
                body = new CANNON.Body({ 
                    mass: s * s * s * 0.3, 
                    shape: tetraShape,
                    collisionFilterGroup: 1,
                    collisionFilterMask: 1 | 2
                });
                break;
                
            case 'torusKnot':
                // トーラスノット
                const knotGeo = new THREE.TorusKnotGeometry(s/3, s/10, 64, 8);
                const knotMat = new THREE.MeshStandardMaterial({ color: col });
                mesh = new THREE.Mesh(knotGeo, knotMat);
                mesh.castShadow = true;
                const knotShape = new CANNON.Sphere(s/2);
                body = new CANNON.Body({ 
                    mass: s * s * 0.5, 
                    shape: knotShape,
                    collisionFilterGroup: 1,
                    collisionFilterMask: 1 | 2
                });
                break;
                
            default:
                console.warn('不明なタイプ:', type);
                return null;
        }
        
        mesh.name = `${type}_${Date.now()}`;
        mesh.position.set(pos.x, pos.y, pos.z);
        window.app.scene.add(mesh);
        
        body.position.set(pos.x, pos.y, pos.z);
        
        // 反発係数を適用するためのマテリアル設定
        if (window.defaultMaterial) {
            body.material = window.defaultMaterial;
        }
        
        window.physicsWorld.addBody(body);
        
        const obj = { mesh, body, type, size: s };
        window.physicsObjects.push(obj);
        
        console.log(`📦 ${type} を生成 (サイズ: ${s.toFixed(2)}m):`, pos);
        updateObjectCount();
        return obj;
        
    } catch (error) {
        console.error('❌ オブジェクト生成エラー:', error);
        return null;
    }
};

// AI生成オブジェクト
window.spawnAIObject = async function(description) {
    console.log('🤖 AI生成:', description);
    
    // === サイズ解析 ===
    let size = 1.0; // デフォルト 1m
    
    // メートル指定
    const meterMatch = description.match(/(\d+(?:\.\d+)?)メートル|(\d+(?:\.\d+)?)m\b/i);
    if (meterMatch) {
        size = parseFloat(meterMatch[1] || meterMatch[2]);
    }
    
    // センチ指定
    const cmMatch = description.match(/(\d+(?:\.\d+)?)センチ|(\d+(?:\.\d+)?)cm\b/i);
    if (cmMatch) {
        size = parseFloat(cmMatch[1] || cmMatch[2]) / 100;
    }
    
    // ミリ指定
    const mmMatch = description.match(/(\d+(?:\.\d+)?)ミリ|(\d+(?:\.\d+)?)mm\b/i);
    if (mmMatch) {
        size = parseFloat(mmMatch[1] || mmMatch[2]) / 1000;
    }
    
    // 形容詞でサイズ調整
    if (description.includes('巨大') || description.includes('めちゃくちゃ大きい') || description.includes('でかい')) {
        size = size * 5;
    } else if (description.includes('大きい') || description.includes('大きな') || description.includes('でか')) {
        size = size * 2;
    } else if (description.includes('小さい') || description.includes('小さな') || description.includes('ちいさい')) {
        size = size * 0.5;
    } else if (description.includes('極小') || description.includes('めちゃくちゃ小さい') || description.includes('粒')) {
        size = size * 0.1;
    }
    
    // === 形状解析 ===
    let type = 'box'; // デフォルト
    
    // 球体系
    if (description.match(/ボール|球|丸|スフィア|地球|月|太陽|惑星|ビー玉|ボーリング/)) {
        type = 'sphere';
    }
    // 円柱系
    else if (description.match(/筒|円柱|缶|ドラム|パイプ|ポール|棒|ペットボトル|ボトル|柱/)) {
        type = 'cylinder';
    }
    // 箱系
    else if (description.match(/箱|キューブ|ブロック|ダンボール|コンテナ|ビル|家|車|テレビ|スマホ/)) {
        type = 'box';
    }
    // ドーナツ系
    else if (description.match(/ドーナツ|ドーナツ|タイヤ|リング|浮き輪/)) {
        type = 'torus';
    }
    // コーン系
    else if (description.match(/コーン|三角|ピラミッド|山|ロケット/)) {
        type = 'cone';
    }
    // カプセル（薬）
    else if (description.match(/カプセル|薬|ピル|ロケット|ミサイル/)) {
        type = 'capsule';
    }
    // 平面系
    else if (description.match(/板|パネル|床|壁|プレート|カード/)) {
        type = 'plane';
    }
    // 全周系（アイコサヘドロン）
    else if (description.match(/サッカーボール|多面体|ダイス|サイコロ/)) {
        type = 'icosahedron';
    }
    // トーラスノット
    else if (description.match(/ノット|結び目/)) {
        type = 'torusKnot';
    }
    // テトラ
    else if (description.match(/テトラ|四面体/)) {
        type = 'tetrahedron';
    }
    // オクタ
    else if (description.match(/オクタ|八面体|ダイアモンド/)) {
        type = 'octahedron';
    }
    
    // === 色解析 ===
    let color = 0x888888; // デフォルトグレー
    
    if (description.includes('赤')) color = 0xff0000;
    else if (description.includes('青')) color = 0x0066ff;
    else if (description.includes('緑')) color = 0x00cc00;
    else if (description.includes('黄')) color = 0xffff00;
    else if (description.includes('紫')) color = 0x9900ff;
    else if (description.includes('オレンジ') || description.includes('橙')) color = 0xff9900;
    else if (description.includes('ピンク') || description.includes('桃')) color = 0xff66b2;
    else if (description.includes('白')) color = 0xffffff;
    else if (description.includes('黒')) color = 0x222222;
    else if (description.includes('茶')) color = 0x8b4513;
    else if (description.includes('金') || description.includes('ゴールド')) color = 0xffd700;
    else if (description.includes('銀') || description.includes('シルバー')) color = 0xc0c0c0;
    else if (description.includes('水色') || description.includes('シアン')) color = 0x00ffff;
    else if (description.includes('マゼンタ')) color = 0xff00ff;
    else if (description.includes('ライム') || description.includes('黄緑')) color = 0xccff00;
    else if (description.includes('ネイビー') || description.includes('紺')) color = 0x000080;
    else if (description.includes('ベージュ') || description.includes('肌')) color = 0xf5deb3;
    else if (description.includes('レインボー') || description.includes('虹')) {
        // ランダムカラー
        color = Math.random() * 0xffffff;
    }
    
    return window.spawnPhysicsObject(type, null, color, size);
};

// オブジェクトを全削除
window.clearAllPhysicsObjects = function() {
    window.physicsObjects.forEach(obj => {
        if (window.app && window.app.scene) {
            window.app.scene.remove(obj.mesh);
        }
        if (window.physicsWorld) {
            window.physicsWorld.removeBody(obj.body);
        }
        if (obj.mesh.geometry) obj.mesh.geometry.dispose();
        if (obj.mesh.material) obj.mesh.material.dispose();
    });
    window.physicsObjects = [];
    
    // 生成位置もリセット
    window.customSpawnPosition = null;
    const posInfo = document.getElementById('custom-position-info');
    if (posInfo) posInfo.style.display = 'none';
    
    updateObjectCount();
    console.log('🗑️ 全オブジェクト削除');
};

// UI作成
function createPhysicsUI() {
    // 既存のパネルがあれば削除
    const existing = document.getElementById('physics-panel');
    if (existing) existing.remove();
    
    const panel = document.createElement('div');
    panel.id = 'physics-panel';
    panel.style.cssText = `
        position: fixed;
        bottom: 10px;
        left: 10px;
        background: rgba(255,255,255,0.95);
        border-radius: 10px;
        box-shadow: 0 4px 16px rgba(0,0,0,0.2);
        font-family: 'Segoe UI', sans-serif;
        z-index: 1000;
        min-width: 200px;
        max-width: 280px;
        font-size: 11px;
        display: flex;
        flex-direction: column;
        max-height: 70vh;
    `;
    panel.innerHTML = `
            <!-- ドラッグハンドル -->
            <div id="physics-panel-header" style="
                font-weight: bold;
                font-size: 12px;
                padding: 8px 10px;
                border-bottom: 2px solid #667eea;
                background: linear-gradient(135deg, #667eea, #764ba2);
                color: white;
                border-radius: 10px 10px 0 0;
                cursor: move;
                user-select: none;
                display: flex;
                justify-content: space-between;
                align-items: center;
            ">
                <span>🎮 物理演算システム</span>
                <div style="display: flex; gap: 4px; align-items: center;">
                    <button id="physics-panel-collapse-btn" style="
                        background: rgba(255,255,255,0.2);
                        border: none;
                        color: white;
                        width: 24px;
                        height: 24px;
                        border-radius: 4px;
                        cursor: pointer;
                        font-size: 12px;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                    " title="折りたたみ">▼</button>
                    <button id="physics-panel-close-btn" style="
                        background: rgba(255,255,255,0.2);
                        border: none;
                        color: white;
                        width: 24px;
                        height: 24px;
                        border-radius: 4px;
                        cursor: pointer;
                        font-size: 14px;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                    " title="閉じる">×</button>
                </div>
            </div>
            
            <!-- スクロール可能なコンテンツ -->
            <div id="physics-panel-content" style="
                padding: 10px;
                overflow-y: auto;
                flex: 1;
                max-height: calc(70vh - 40px);
            ">
            
            <button id="fps-toggle-btn" style="
                width: 100%;
                padding: 6px;
                margin-bottom: 6px;
                background: linear-gradient(135deg, #667eea, #764ba2);
                color: white;
                border: none;
                border-radius: 6px;
                font-weight: bold;
                cursor: pointer;
                font-size: 10px;
            ">🚶 FPSモード OFF</button>
            
            <div style="font-size: 9px; color: #666; margin-bottom: 4px;">
                WASD: 移動 / Space: ジャンプ / E: 蹴る
            </div>
            <div style="font-size: 9px; color: #666; margin-bottom: 4px;">
                ホイール押込: 弾発射 / 1〜5: 速度変更
            </div>
            <div id="fps-speed-display" style="
                font-size: 10px;
                font-weight: bold;
                padding: 4px 8px;
                margin-bottom: 8px;
                border-radius: 4px;
                text-align: center;
                background: #4CAF50;
                color: white;
                display: none;
            ">速度: 1 (1x)</div>
            
            <div style="font-weight: bold; font-size: 10px; margin-bottom: 6px;">📦 オブジェクト生成</div>
            
            <div style="display: flex; gap: 4px; margin-bottom: 6px;">
                <button class="spawn-btn" data-type="box" onclick="window.spawnWithSize('box')" style="flex:1; padding: 8px; border: none; border-radius: 6px; background: #45b7d1; color: white; cursor: pointer; font-size: 14px;" title="立方体">📦</button>
                <button class="spawn-btn" data-type="sphere" onclick="window.spawnWithSize('sphere')" style="flex:1; padding: 8px; border: none; border-radius: 6px; background: #ff6b6b; color: white; cursor: pointer; font-size: 14px;" title="球体">⚽</button>
                <button class="spawn-btn" data-type="cylinder" onclick="window.spawnWithSize('cylinder')" style="flex:1; padding: 8px; border: none; border-radius: 6px; background: #4ecdc4; color: white; cursor: pointer; font-size: 14px;" title="円柱">🥫</button>
                <button class="spawn-btn" data-type="cone" onclick="window.spawnWithSize('cone')" style="flex:1; padding: 8px; border: none; border-radius: 6px; background: #f39c12; color: white; cursor: pointer; font-size: 14px;" title="コーン">🚩</button>
            </div>
            
            <!-- サイズスライダー -->
            <div style="margin-bottom: 8px; background: #f0f0f0; padding: 8px; border-radius: 6px;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                    <span style="font-size: 9px; color: #666;">📏 サイズ</span>
                    <span id="size-value" style="font-size: 10px; font-weight: bold; color: #667eea;">1.00m</span>
                </div>
                <input type="range" id="size-slider" min="0.01" max="5" step="0.01" value="1" style="
                    width: 100%;
                    height: 8px;
                    -webkit-appearance: none;
                    background: linear-gradient(to right, #667eea, #764ba2);
                    border-radius: 4px;
                    outline: none;
                    cursor: pointer;
                ">
                <div style="display: flex; justify-content: space-between; font-size: 8px; color: #999; margin-top: 2px;">
                    <span>1cm</span>
                    <span>50cm</span>
                    <span>1m</span>
                    <span>2m</span>
                    <span>5m</span>
                </div>
            </div>
            
            <!-- 生成位置指定 -->
            <button id="spawn-position-btn" style="
                width: 100%;
                padding: 6px;
                margin-bottom: 6px;
                background: linear-gradient(135deg, #00b894, #00cec9);
                color: white;
                border: none;
                border-radius: 6px;
                font-weight: bold;
                cursor: pointer;
                font-size: 10px;
            ">🎯 生成場所を指定</button>
            
            <div id="spawn-position-status" style="
                font-size: 9px;
                color: #666;
                margin-bottom: 6px;
                text-align: center;
                display: none;
            ">✨ クリックで位置決定 / ESCでキャンセル</div>
            
            <input type="text" id="ai-object-input" placeholder="例: 赤いボール、青い箱" style="
                width: 100%;
                padding: 6px;
                border: 1px solid #e0e0e0;
                border-radius: 6px;
                margin-bottom: 6px;
                box-sizing: border-box;
                font-size: 10px;
            ">
            
            <button id="ai-spawn-btn" style="
                width: 100%;
                padding: 6px;
                background: linear-gradient(135deg, #f093fb, #f5576c);
                color: white;
                border: none;
                border-radius: 6px;
                font-weight: bold;
                cursor: pointer;
                margin-bottom: 6px;
                font-size: 10px;
            ">🤖 AI生成</button>
            
            <button id="clear-objects-btn" style="
                width: 100%;
                padding: 6px;
                background: #ff6b6b;
                color: white;
                border: none;
                border-radius: 6px;
                cursor: pointer;
                font-size: 10px;
            ">🗑️ 全削除</button>
            
            <button id="vrm-collider-btn" style="
                width: 100%;
                padding: 6px;
                margin-top: 6px;
                background: linear-gradient(135deg, #00ff88, #00cc66);
                color: #1a1a2e;
                border: none;
                border-radius: 6px;
                cursor: pointer;
                font-size: 10px;
                font-weight: bold;
            ">🟢 VRMコライダー表示</button>
            
            <div id="object-count" style="font-size: 9px; color: #666; margin-top: 6px; text-align: center;">
                オブジェクト: 0
            </div>
            
            <div id="custom-position-info" style="font-size: 8px; color: #00b894; margin-top: 4px; text-align: center; display: none;">
                📍 生成位置: (0, 0, 0)
            </div>
            
            </div><!-- physics-panel-contentの閉じタグ -->
    `;
    document.body.appendChild(panel);
    
    // スタイル追加（スライダーのサム）
    const style = document.createElement('style');
    style.textContent = `
        #size-slider::-webkit-slider-thumb {
            -webkit-appearance: none;
            width: 16px;
            height: 16px;
            background: white;
            border: 2px solid #667eea;
            border-radius: 50%;
            cursor: pointer;
            box-shadow: 0 2px 4px rgba(0,0,0,0.2);
        }
        #size-slider::-moz-range-thumb {
            width: 16px;
            height: 16px;
            background: white;
            border: 2px solid #667eea;
            border-radius: 50%;
            cursor: pointer;
        }
    `;
    document.head.appendChild(style);
    
    // イベントリスナー
    document.getElementById('fps-toggle-btn').addEventListener('click', toggleFPSMode);
    
    // サイズスライダー
    const sizeSlider = document.getElementById('size-slider');
    const sizeValue = document.getElementById('size-value');
    sizeSlider.addEventListener('input', function() {
        const size = parseFloat(this.value);
        window.spawnObjectSize = size; // グローバルにも保存
        if (size < 0.1) {
            sizeValue.textContent = (size * 100).toFixed(0) + 'cm';
        } else {
            sizeValue.textContent = size.toFixed(2) + 'm';
        }
        console.log('📏 サイズ変更:', size);
    });
    
    // 生成位置指定ボタン
    document.getElementById('spawn-position-btn').addEventListener('click', toggleSpawnPositionMode);
    
    document.querySelectorAll('.spawn-btn').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            // スライダーから直接取得
            const slider = document.getElementById('size-slider');
            const size = slider ? parseFloat(slider.value) : 1.0;
            const type = this.dataset.type;
            console.log('🔘 ボタンクリック:', type, 'サイズ:', size);
            
            // 少し遅延して実行（イベントの競合を避ける）
            setTimeout(() => {
                window.spawnPhysicsObject(type, null, null, size);
            }, 10);
        });
    });
    
    document.getElementById('ai-spawn-btn').addEventListener('click', function() {
        const input = document.getElementById('ai-object-input');
        if (input.value.trim()) {
            console.log('🤖 AI生成ボタンクリック:', input.value);
            window.spawnAIObject(input.value.trim());
        }
    });
    
    document.getElementById('ai-object-input').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            document.getElementById('ai-spawn-btn').click();
        }
    });
    
    document.getElementById('clear-objects-btn').addEventListener('click', function() {
        window.clearAllPhysicsObjects();
    });
    
    document.getElementById('vrm-collider-btn').addEventListener('click', function() {
        toggleVRMColliderVisibility();
        const btn = document.getElementById('vrm-collider-btn');
        if (window.showVRMColliders) {
            btn.textContent = '🟢 VRMコライダー非表示';
            btn.style.background = 'linear-gradient(135deg, #ff6b6b, #ee5a5a)';
        } else {
            btn.textContent = '🟢 VRMコライダー表示';
            btn.style.background = 'linear-gradient(135deg, #00ff88, #00cc66)';
        }
    });
    
    // === ドラッグ機能 ===
    const header = document.getElementById('physics-panel-header');
    let isDragging = false;
    let dragOffsetX = 0;
    let dragOffsetY = 0;
    
    header.addEventListener('mousedown', (e) => {
        isDragging = true;
        const rect = panel.getBoundingClientRect();
        dragOffsetX = e.clientX - rect.left;
        dragOffsetY = e.clientY - rect.top;
        header.style.cursor = 'grabbing';
        e.preventDefault();
    });
    
    document.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        
        const newX = e.clientX - dragOffsetX;
        const newY = e.clientY - dragOffsetY;
        
        // 画面外に出ないように制限
        const maxX = window.innerWidth - panel.offsetWidth;
        const maxY = window.innerHeight - panel.offsetHeight;
        
        panel.style.left = Math.max(0, Math.min(newX, maxX)) + 'px';
        panel.style.top = Math.max(0, Math.min(newY, maxY)) + 'px';
        panel.style.bottom = 'auto'; // bottomを解除
    });
    
    document.addEventListener('mouseup', () => {
        if (isDragging) {
            isDragging = false;
            header.style.cursor = 'move';
        }
    });
    
    // === スクロールバースタイル ===
    const scrollStyle = document.createElement('style');
    scrollStyle.textContent = `
        #physics-panel-content::-webkit-scrollbar {
            width: 8px;
        }
        #physics-panel-content::-webkit-scrollbar-track {
            background: #f0f0f0;
            border-radius: 4px;
        }
        #physics-panel-content::-webkit-scrollbar-thumb {
            background: linear-gradient(135deg, #667eea, #764ba2);
            border-radius: 4px;
        }
        #physics-panel-content::-webkit-scrollbar-thumb:hover {
            background: linear-gradient(135deg, #5a6fd6, #6a4190);
        }
    `;
    document.head.appendChild(scrollStyle);
    
    // === 折りたたみボタンのイベントリスナー ===
    const collapseBtn = document.getElementById('physics-panel-collapse-btn');
    const panelContent = document.getElementById('physics-panel-content');
    let isCollapsed = false;
    
    if (collapseBtn && panelContent) {
        collapseBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            isCollapsed = !isCollapsed;
            if (isCollapsed) {
                panelContent.style.display = 'none';
                collapseBtn.textContent = '▶';
                collapseBtn.title = '展開';
            } else {
                panelContent.style.display = 'block';
                collapseBtn.textContent = '▼';
                collapseBtn.title = '折りたたみ';
            }
            console.log('🎮 物理演算パネル:', isCollapsed ? '折りたたみ' : '展開');
        });
    }
    
    // === 閉じるボタンのイベントリスナー ===
    const closeBtn = document.getElementById('physics-panel-close-btn');
    if (closeBtn) {
        closeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            panel.style.display = 'none';
            console.log('🎮 物理演算パネルを閉じました');
        });
    }
    
    // パネル再表示関数をグローバルに公開
    window.showPhysicsPanel = function() {
        const physicsPanel = document.getElementById('physics-panel');
        if (physicsPanel) {
            physicsPanel.style.display = 'flex';
            console.log('🎮 物理演算パネルを表示');
        }
    };
    
    console.log('✅ 物理演算UI作成完了');
}

// 生成位置指定モード切り替え
function toggleSpawnPositionMode() {
    window.spawnPositionMode = !window.spawnPositionMode;
    
    const btn = document.getElementById('spawn-position-btn');
    const status = document.getElementById('spawn-position-status');
    const posInfo = document.getElementById('custom-position-info');
    
    if (window.spawnPositionMode) {
        btn.textContent = '❌ 位置指定キャンセル';
        btn.style.background = 'linear-gradient(135deg, #e74c3c, #c0392b)';
        status.style.display = 'block';
        
        // カメラ操作を無効化
        if (window.app && window.app.controls) {
            window.app.controls.enabled = false;
        }
        
        // 十字カーソルを作成
        createSpawnCursor();
        
        // クリックイベントを追加
        document.addEventListener('click', onSpawnPositionClick);
        document.addEventListener('mousemove', onSpawnPositionMove);
        document.addEventListener('keydown', onSpawnPositionKeydown);
        
        console.log('🎯 生成位置指定モード ON');
    } else {
        btn.textContent = '🎯 生成場所を指定';
        btn.style.background = 'linear-gradient(135deg, #00b894, #00cec9)';
        status.style.display = 'none';
        
        // カメラ操作を有効化
        if (window.app && window.app.controls) {
            window.app.controls.enabled = true;
        }
        
        // 十字カーソルを削除
        removeSpawnCursor();
        
        // イベントを削除
        document.removeEventListener('click', onSpawnPositionClick);
        document.removeEventListener('mousemove', onSpawnPositionMove);
        document.removeEventListener('keydown', onSpawnPositionKeydown);
        
        console.log('🎯 生成位置指定モード OFF');
    }
}

// 十字カーソルを作成
function createSpawnCursor() {
    const THREE = window.THREE;
    if (!THREE || !window.app || !window.app.scene) return;
    
    removeSpawnCursor();
    
    // 十字カーソルグループ
    window.spawnCursor = new THREE.Group();
    window.spawnCursor.name = 'spawnCursor';
    
    const material = new THREE.MeshBasicMaterial({ 
        color: 0x00ff88, 
        transparent: true, 
        opacity: 0.8 
    });
    
    // 中心球
    const centerGeo = new THREE.SphereGeometry(0.08, 16, 16);
    const centerMesh = new THREE.Mesh(centerGeo, material);
    window.spawnCursor.add(centerMesh);
    
    // X軸（赤）
    const xMat = new THREE.MeshBasicMaterial({ color: 0xff0000, transparent: true, opacity: 0.8 });
    const xGeo = new THREE.CylinderGeometry(0.02, 0.02, 1, 8);
    const xMesh = new THREE.Mesh(xGeo, xMat);
    xMesh.rotation.z = Math.PI / 2;
    window.spawnCursor.add(xMesh);
    
    // Y軸（緑）
    const yMat = new THREE.MeshBasicMaterial({ color: 0x00ff00, transparent: true, opacity: 0.8 });
    const yGeo = new THREE.CylinderGeometry(0.02, 0.02, 1, 8);
    const yMesh = new THREE.Mesh(yGeo, yMat);
    window.spawnCursor.add(yMesh);
    
    // Z軸（青）
    const zMat = new THREE.MeshBasicMaterial({ color: 0x0088ff, transparent: true, opacity: 0.8 });
    const zGeo = new THREE.CylinderGeometry(0.02, 0.02, 1, 8);
    const zMesh = new THREE.Mesh(zGeo, zMat);
    zMesh.rotation.x = Math.PI / 2;
    window.spawnCursor.add(zMesh);
    
    // リング（地面投影）
    const ringGeo = new THREE.TorusGeometry(0.3, 0.02, 8, 32);
    const ringMat = new THREE.MeshBasicMaterial({ color: 0x00ff88, transparent: true, opacity: 0.5 });
    const ringMesh = new THREE.Mesh(ringGeo, ringMat);
    ringMesh.rotation.x = -Math.PI / 2;
    window.spawnCursor.add(ringMesh);
    
    window.app.scene.add(window.spawnCursor);
    
    // アニメーション（回転）
    window.spawnCursorAnimId = null;
    function animateCursor() {
        if (!window.spawnCursor || !window.spawnPositionMode) {
            window.spawnCursorAnimId = null;
            return;
        }
        window.spawnCursor.rotation.y += 0.02;
        window.spawnCursorAnimId = requestAnimationFrame(animateCursor);
    }
    animateCursor();
    
    console.log('✨ 十字カーソル作成');
}

// 十字カーソルを削除
function removeSpawnCursor() {
    if (window.spawnCursorAnimId) {
        cancelAnimationFrame(window.spawnCursorAnimId);
        window.spawnCursorAnimId = null;
    }
    
    if (window.spawnCursor && window.app && window.app.scene) {
        window.app.scene.remove(window.spawnCursor);
        window.spawnCursor.traverse(child => {
            if (child.geometry) child.geometry.dispose();
            if (child.material) child.material.dispose();
        });
        window.spawnCursor = null;
    }
}

// マウス移動時にカーソルを更新
function onSpawnPositionMove(event) {
    if (!window.spawnPositionMode || !window.spawnCursor) return;
    if (!window.app || !window.app.camera) return;
    
    const THREE = window.THREE;
    const canvas = document.querySelector('#canvas-container canvas');
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const mouse = new THREE.Vector2(
        ((event.clientX - rect.left) / rect.width) * 2 - 1,
        -((event.clientY - rect.top) / rect.height) * 2 + 1
    );
    
    // レイキャストで地面との交差点を求める
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, window.app.camera);
    
    // 地面平面（y=0）との交差
    const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    const intersection = new THREE.Vector3();
    
    if (raycaster.ray.intersectPlane(plane, intersection)) {
        window.spawnCursor.position.copy(intersection);
        window.spawnCursor.position.y = 0.5; // 少し浮かせる
    }
}

// クリックで位置を決定
function onSpawnPositionClick(event) {
    if (!window.spawnPositionMode || !window.spawnCursor) return;
    
    // UIパネル上のクリックは無視
    if (event.target.closest('#physics-panel')) return;
    
    const pos = window.spawnCursor.position.clone();
    window.customSpawnPosition = { x: pos.x, y: pos.y, z: pos.z };
    
    // 位置情報を表示
    const posInfo = document.getElementById('custom-position-info');
    posInfo.style.display = 'block';
    posInfo.textContent = `📍 生成位置: (${pos.x.toFixed(1)}, ${pos.y.toFixed(1)}, ${pos.z.toFixed(1)})`;
    
    console.log('📍 生成位置決定:', window.customSpawnPosition);
    
    // モードを終了
    toggleSpawnPositionMode();
}

// ESCでキャンセル
function onSpawnPositionKeydown(event) {
    if (event.code === 'Escape' && window.spawnPositionMode) {
        toggleSpawnPositionMode();
    }
}

function toggleFPSMode() {
    window.fpsMode = !window.fpsMode;
    const btn = document.getElementById('fps-toggle-btn');
    
    if (window.fpsMode) {
        btn.textContent = '🚶 FPSモード ON';
        btn.style.background = 'linear-gradient(135deg, #00c853, #00e676)';
        
        // 速度表示を表示
        const speedDisplay = document.getElementById('fps-speed-display');
        if (speedDisplay) {
            speedDisplay.style.display = 'block';
            updateSpeedDisplay();
        }
        
        // OrbitControlsを無効化
        if (window.app && window.app.controls) {
            window.app.controls.enabled = false;
        }
        
        // 現在のカメラ角度を取得してFPS用に設定
        if (window.app && window.app.camera) {
            window.fpsYaw = window.app.camera.rotation.y;
            window.fpsPitch = 0; // 水平からスタート
            
            // ★ プレイヤーを安全な位置に配置 ★
            if (window.playerBody) {
                // カメラ位置を基準に、少し上に配置（建物に埋まらないように）
                const cam = window.app.camera;
                window.playerBody.position.set(cam.position.x, cam.position.y + 0.5, cam.position.z);
                // 速度をリセット（弾き飛ばされないように）
                window.playerBody.velocity.set(0, 0, 0);
                window.playerBody.angularVelocity.set(0, 0, 0);
                console.log('📍 プレイヤー位置リセット:', cam.position.x.toFixed(2), cam.position.y.toFixed(2), cam.position.z.toFixed(2));
            }
        }
        
        // 地面がOFFの場合は落下可能を通知
        if (window.groundObjects && !window.groundObjects.visible) {
            console.log('⚠️ 地面OFF: 落下に注意！');
        }
        
        // ポインターロック
        document.body.requestPointerLock();
        
        console.log('🎮 FPSモード ON');
    } else {
        btn.textContent = '🚶 FPSモード OFF';
        btn.style.background = 'linear-gradient(135deg, #667eea, #764ba2)';
        
        // 速度表示を非表示
        const speedDisplay = document.getElementById('fps-speed-display');
        if (speedDisplay) {
            speedDisplay.style.display = 'none';
        }
        
        // OrbitControlsを有効化
        if (window.app && window.app.controls) {
            window.app.controls.enabled = true;
        }
        
        // ポインターロック解除
        document.exitPointerLock();
        
        console.log('🎮 FPSモード OFF');
    }
}

// グローバルに公開
window.setFPSSpeedLevel = setFPSSpeedLevel;

function updateObjectCount() {
    const countEl = document.getElementById('object-count');
    if (countEl) {
        countEl.textContent = `オブジェクト: ${window.physicsObjects.length}`;
    }
}

// FPSモード用のカメラ制御変数
window.fpsYaw = 0;   // 水平角度
window.fpsPitch = 0; // 垂直角度

// マウスでカメラ回転（FPSモード時）
document.addEventListener('mousemove', (e) => {
    if (!window.fpsMode || !document.pointerLockElement) return;
    if (!window.app || !window.app.camera) return;
    
    const sensitivity = 0.003;
    
    // 角度を更新
    window.fpsYaw -= e.movementX * sensitivity;
    window.fpsPitch -= e.movementY * sensitivity;
    
    // 垂直角度を制限（上下90度まで）
    window.fpsPitch = Math.max(-Math.PI/2 + 0.1, Math.min(Math.PI/2 - 0.1, window.fpsPitch));
});

// ESCでFPSモード解除
document.addEventListener('keydown', (e) => {
    if (e.code === 'Escape' && window.fpsMode) {
        toggleFPSMode();
    }
    
    // Shift+B: 物理演算UIパネル以外を全部消す/復元
    if (e.shiftKey && e.code === 'KeyB') {
        e.preventDefault();
        e.stopPropagation();
        window.togglePhysicsOnlyMode();
    }
});

// 物理演算UIパネル以外を全部消す/復元する機能
window.physicsOnlyMode = {
    active: false,
    hiddenElements: []
};

window.togglePhysicsOnlyMode = function() {
    const mode = window.physicsOnlyMode;
    
    if (!mode.active) {
        // === 物理演算UI以外を非表示 === 
        mode.hiddenElements = [];
        
        const allElements = document.body.querySelectorAll('*');
        
        allElements.forEach(el => {
            // 残すべき要素を判定
            if (el.tagName === 'CANVAS') return;
            if (el.tagName === 'SCRIPT' || el.tagName === 'STYLE' || el.tagName === 'LINK') return;
            
            const id = (el.id || '').toLowerCase();
            
            // physics-panelとその子要素は残す
            if (id === 'physics-panel') return;
            if (el.closest('#physics-panel')) return;
            
            // 字幕も残す
            if (id.includes('subtitle')) return;
            
            const style = window.getComputedStyle(el);
            if (style.position === 'fixed' || style.position === 'absolute') {
                if (style.display !== 'none') {
                    // 元のスタイルを保存
                    el.dataset.physicsOnlyWasDisplay = el.style.display || '';
                    el.style.setProperty('display', 'none', 'important');
                    mode.hiddenElements.push(el);
                }
            }
        });
        
        mode.active = true;
        console.log(`🛠️ 物理演算UIモードON - ${mode.hiddenElements.length}個のUIを非表示`);
        
    } else {
        // === UIを復元 ===
        mode.hiddenElements.forEach(el => {
            const wasDisplay = el.dataset.physicsOnlyWasDisplay;
            if (wasDisplay !== undefined) {
                el.style.display = wasDisplay || '';
                delete el.dataset.physicsOnlyWasDisplay;
            }
        });
        
        mode.hiddenElements = [];
        mode.active = false;
        console.log('🛠️ 物理演算UIモードOFF - UI復元');
    }
};

// ========================================
// VRMコライダーシステム
// VRMキャラが物理オブジェクトを押せるようにする
// 手動で衝突検出して力を加える方式
// ========================================

window.vrmColliders = [];
window.vrmColliderMeshes = [];
window.showVRMColliders = false;

// VRMコライダーを作成
function createVRMColliders() {
    console.log('🟢 createVRMColliders 開始');
    console.log('  - window.app:', !!window.app);
    console.log('  - window.app.vrm:', !!window.app?.vrm);
    console.log('  - window.dollModeActive:', !!window.dollModeActive);
    
    // 人形モード中はコライダーを作成しない
    if (window.dollModeActive) {
        console.log('⚠️ 人形モード中のためコライダー作成スキップ');
        return;
    }
    
    if (!window.app || !window.app.vrm) {
        console.log('⚠️ VRMがないためコライダー作成スキップ');
        return;
    }
    
    // 既存のコライダーを削除
    clearVRMColliders();
    
    const vrm = window.app.vrm;
    const humanoid = vrm.humanoid;
    console.log('  - humanoid:', !!humanoid);
    
    if (!humanoid) {
        console.log('⚠️ humanoidがない');
        return;
    }
    
    // コライダー設定（ボーン名, 半径, Yオフセット）
    const colliderConfig = [
        // 胴体（大きめの球）
        { bone: 'hips', radius: 0.18, offsetY: 0.1 },
        { bone: 'spine', radius: 0.18, offsetY: 0 },
        { bone: 'chest', radius: 0.20, offsetY: 0 },
        { bone: 'upperChest', radius: 0.18, offsetY: 0 },
        
        // 頭
        { bone: 'head', radius: 0.15, offsetY: 0.1 },
        
        // 左腕
        { bone: 'leftUpperArm', radius: 0.08, offsetY: 0 },
        { bone: 'leftLowerArm', radius: 0.07, offsetY: 0 },
        { bone: 'leftHand', radius: 0.08, offsetY: 0 },
        
        // 右腕
        { bone: 'rightUpperArm', radius: 0.08, offsetY: 0 },
        { bone: 'rightLowerArm', radius: 0.07, offsetY: 0 },
        { bone: 'rightHand', radius: 0.08, offsetY: 0 },
        
        // 左足
        { bone: 'leftUpperLeg', radius: 0.10, offsetY: -0.15 },
        { bone: 'leftLowerLeg', radius: 0.08, offsetY: -0.15 },
        { bone: 'leftFoot', radius: 0.08, offsetY: 0 },
        
        // 右足
        { bone: 'rightUpperLeg', radius: 0.10, offsetY: -0.15 },
        { bone: 'rightLowerLeg', radius: 0.08, offsetY: -0.15 },
        { bone: 'rightFoot', radius: 0.08, offsetY: 0 },
    ];
    
    for (const config of colliderConfig) {
        const boneNode = humanoid.getNormalizedBoneNode(config.bone);
        if (!boneNode) {
            console.log(`⚠️ ボーンが見つからない: ${config.bone}`);
            continue;
        }
        
        window.vrmColliders.push({
            bone: config.bone,
            boneNode: boneNode,
            radius: config.radius,
            offsetY: config.offsetY,
            position: new window.THREE.Vector3()
        });
    }
    
    console.log(`✅ VRMコライダー作成: ${window.vrmColliders.length}個`);
}

// VRMコライダーを削除
function clearVRMColliders() {
    // メッシュも削除
    for (const mesh of window.vrmColliderMeshes) {
        if (window.app && window.app.scene) {
            window.app.scene.remove(mesh);
        }
        if (mesh.geometry) mesh.geometry.dispose();
        if (mesh.material) mesh.material.dispose();
    }
    window.vrmColliders = [];
    window.vrmColliderMeshes = [];
}

// VRMコライダーの位置を更新し、物理オブジェクトとの衝突をチェック
// window.vrmCollidersEnabled が false のときはスキップ
window.vrmCollidersEnabled = true; // デフォルトで有効
window.vrmEnvironmentCollisionEnabled = true; // VRMと環境の衝突を有効にするか

function updateVRMCollidersAndPushObjects() {
    // コライダーが無効化されている場合はスキップ
    if (!window.vrmCollidersEnabled) return;
    
    // 人形モード中はスキップ
    if (window.dollModeActive) return;
    
    if (!window.app || !window.app.vrm || window.vrmColliders.length === 0) return;
    
    const THREE = window.THREE;
    const worldPos = new THREE.Vector3();
    
    // 各コライダーの位置を更新
    for (const collider of window.vrmColliders) {
        if (!collider.boneNode) continue;
        
        // ボーンのワールド座標を取得（これだけで完全なワールド座標が得られる）
        collider.boneNode.getWorldPosition(worldPos);
        
        // コライダー位置を設定（vrmPosは追加不要、getWorldPositionが既にワールド座標）
        collider.position.set(
            worldPos.x,
            worldPos.y + collider.offsetY,
            worldPos.z
        );
    }
    
    // 物理オブジェクトとの衝突をチェック（双方向）
    const vrm = window.app.vrm;
    const vrmPos = vrm.scene.position;
    
    // VRMへの押し返し力を累積
    let vrmPushX = 0;
    let vrmPushZ = 0;
    let vrmCollisionCount = 0;
    
    for (const obj of window.physicsObjects) {
        if (!obj.body) continue;
        
        const objPos = new THREE.Vector3(
            obj.body.position.x,
            obj.body.position.y,
            obj.body.position.z
        );
        
        // オブジェクトの半径（簡易的にサイズの半分）
        const objRadius = (obj.size || 1) / 2;
        
        // オブジェクトの質量（速度から運動量を計算）
        const objMass = obj.body.mass || 1;
        const objSpeed = Math.sqrt(
            obj.body.velocity.x * obj.body.velocity.x +
            obj.body.velocity.y * obj.body.velocity.y +
            obj.body.velocity.z * obj.body.velocity.z
        );
        
        for (const collider of window.vrmColliders) {
            // 距離を計算
            const dx = objPos.x - collider.position.x;
            const dy = objPos.y - collider.position.y;
            const dz = objPos.z - collider.position.z;
            const distance = Math.sqrt(dx*dx + dy*dy + dz*dz);
            
            // 衝突判定
            const minDist = collider.radius + objRadius;
            
            if (distance < minDist && distance > 0.001) {
                // 衝突！
                const overlap = minDist - distance;
                
                // 押す方向（コライダーからオブジェクトへ）
                const dirX = dx / distance;
                const dirY = dy / distance;
                const dirZ = dz / distance;
                
                // === オブジェクトを押す ===
                const pushStrengthObj = overlap * 3;
                obj.body.velocity.x += dirX * pushStrengthObj;
                obj.body.velocity.y += dirY * pushStrengthObj * 0.3 + 0.5;
                obj.body.velocity.z += dirZ * pushStrengthObj;
                
                // 速度の上限を設定（吹っ飛び防止）
                const maxVel = 5;
                obj.body.velocity.x = Math.max(-maxVel, Math.min(maxVel, obj.body.velocity.x));
                obj.body.velocity.y = Math.max(-maxVel, Math.min(maxVel * 2, obj.body.velocity.y));
                obj.body.velocity.z = Math.max(-maxVel, Math.min(maxVel, obj.body.velocity.z));
                
                // 回転も控えめに
                obj.body.angularVelocity.x += (Math.random() - 0.5) * 1.5;
                obj.body.angularVelocity.y += (Math.random() - 0.5) * 1.5;
                obj.body.angularVelocity.z += (Math.random() - 0.5) * 1.5;
                
                // === VRMを押し返す（オブジェクトの運動量に基づく） ===
                // オブジェクトが速く動いているほどVRMを強く押す
                const impactForce = Math.min(objSpeed * objMass * 0.02, 0.1); // 最大0.1m
                vrmPushX -= dirX * (overlap * 0.5 + impactForce);
                vrmPushZ -= dirZ * (overlap * 0.5 + impactForce);
                vrmCollisionCount++;
            }
        }
    }
    
    // VRMを押し返す
    if (vrmCollisionCount > 0) {
        // 平均化
        vrmPushX /= vrmCollisionCount;
        vrmPushZ /= vrmCollisionCount;
        
        // 押し返し量の上限
        const maxPush = 0.15;
        vrmPushX = Math.max(-maxPush, Math.min(maxPush, vrmPushX));
        vrmPushZ = Math.max(-maxPush, Math.min(maxPush, vrmPushZ));
        
        // VRMの位置を更新
        vrmPos.x += vrmPushX;
        vrmPos.z += vrmPushZ;
        
        // デバッグログ（必要なら有効化）
        // console.log(`💥 VRM押し返し: (${vrmPushX.toFixed(3)}, ${vrmPushZ.toFixed(3)})`);
    }
    
    // ========================================
    // VRMと環境コライダーの衝突判定
    // VRMが壁にぶつかると押し返される
    // ========================================
    if (window.vrmEnvironmentCollisionEnabled && window.environmentColliders && window.environmentColliders.length > 0) {
        const vrm = window.app.vrm;
        const vrmPos = vrm.scene.position;
        
        // VRMの全コライダーで環境との衝突をチェック
        let totalPushX = 0;
        let totalPushZ = 0;
        let collisionCount = 0;
        
        for (const vrmCol of window.vrmColliders) {
            const vrmColPos = vrmCol.position;
            
            for (const envCol of window.environmentColliders) {
                // 環境コライダーのボックスとVRMコライダー（球）の衝突判定
                // AABB vs Sphere 衝突
                const boxCenter = envCol.center;
                const boxHalfSize = new THREE.Vector3(
                    envCol.size.x / 2,
                    envCol.size.y / 2,
                    envCol.size.z / 2
                );
                
                // 球の中心からボックスの最近点を求める
                const closestX = Math.max(boxCenter.x - boxHalfSize.x, Math.min(vrmColPos.x, boxCenter.x + boxHalfSize.x));
                const closestY = Math.max(boxCenter.y - boxHalfSize.y, Math.min(vrmColPos.y, boxCenter.y + boxHalfSize.y));
                const closestZ = Math.max(boxCenter.z - boxHalfSize.z, Math.min(vrmColPos.z, boxCenter.z + boxHalfSize.z));
                
                // 距離を計算
                const dx = vrmColPos.x - closestX;
                const dy = vrmColPos.y - closestY;
                const dz = vrmColPos.z - closestZ;
                const distSq = dx * dx + dy * dy + dz * dz;
                const radiusSq = vrmCol.radius * vrmCol.radius;
                
                if (distSq < radiusSq && distSq > 0.0001) {
                    // 衝突している！
                    const dist = Math.sqrt(distSq);
                    const overlap = vrmCol.radius - dist;
                    
                    // 押し出す方向（ボックスからVRMへ）
                    const pushDirX = dx / dist;
                    const pushDirZ = dz / dist;
                    
                    // 押し出し量を累積
                    totalPushX += pushDirX * overlap * 2;
                    totalPushZ += pushDirZ * overlap * 2;
                    collisionCount++;
                }
            }
        }
        
        // 衝突があったらVRMを押し返す
        if (collisionCount > 0) {
            // 平均化
            totalPushX /= collisionCount;
            totalPushZ /= collisionCount;
            
            // VRMの位置を更新
            vrmPos.x += totalPushX;
            vrmPos.z += totalPushZ;
            
            // デバッグログ（頻繁なのでコメントアウト）
            // console.log(`🧱 VRMが壁に衝突! push: (${totalPushX.toFixed(3)}, ${totalPushZ.toFixed(3)})`);
        }
    }
}

// VRMコライダーを視覚化（デバッグ用）
function toggleVRMColliderVisibility() {
    console.log('🟢 toggleVRMColliderVisibility');
    console.log('  - vrmColliders.length:', window.vrmColliders.length);
    console.log('  - window.dollModeActive:', !!window.dollModeActive);
    
    // 人形モード中は無視
    if (window.dollModeActive) {
        console.log('⚠️ 人形モード中のためコライダー表示スキップ');
        return;
    }
    
    // コライダーがない場合は再作成を試みる
    if (window.vrmColliders.length === 0) {
        console.log('  - コライダーがないので作成を試みる...');
        createVRMColliders();
    }
    
    window.showVRMColliders = !window.showVRMColliders;
    console.log('  - showVRMColliders:', window.showVRMColliders);
    
    if (window.showVRMColliders) {
        // コライダーメッシュを作成
        const THREE = window.THREE;
        
        for (const collider of window.vrmColliders) {
            const geo = new THREE.SphereGeometry(collider.radius, 16, 16);
            const mat = new THREE.MeshBasicMaterial({
                color: 0x00ff88,
                transparent: true,
                opacity: 0.4,
                wireframe: true
            });
            const mesh = new THREE.Mesh(geo, mat);
            mesh.name = 'vrmCollider_' + collider.bone;
            window.app.scene.add(mesh);
            window.vrmColliderMeshes.push(mesh);
        }
        console.log('🟢 VRMコライダー表示 ON');
    } else {
        // コライダーメッシュを削除
        for (const mesh of window.vrmColliderMeshes) {
            window.app.scene.remove(mesh);
            mesh.geometry.dispose();
            mesh.material.dispose();
        }
        window.vrmColliderMeshes = [];
        console.log('🟢 VRMコライダー表示 OFF');
    }
}

// コライダーメッシュの位置を更新
function updateVRMColliderMeshes() {
    if (!window.showVRMColliders) return;
    
    // 人形モード中はスキップ
    if (window.dollModeActive) return;
    
    for (let i = 0; i < window.vrmColliders.length && i < window.vrmColliderMeshes.length; i++) {
        const collider = window.vrmColliders[i];
        const mesh = window.vrmColliderMeshes[i];
        if (mesh && collider.position) {
            mesh.position.copy(collider.position);
        }
    }
}

// 物理ループにVRMコライダー更新を追加
const originalStartPhysicsLoop = startPhysicsLoop;
startPhysicsLoop = function(THREE) {
    const timeStep = 1/60;
    
    function updatePhysics() {
        if (!window.physicsWorld) {
            requestAnimationFrame(updatePhysics);
            return;
        }
        
        // VRMコライダーの位置を更新し、物理オブジェクトを押す
        updateVRMCollidersAndPushObjects();
        updateVRMColliderMeshes();
        
        // FPSモード時のプレイヤー移動
        if (window.fpsMode && window.playerBody && window.app && window.app.camera) {
            const camera = window.app.camera;
            
            if (window.app.controls) {
                window.app.controls.enabled = false;
            }
            
            // 速度レベルに応じた速度を計算
            const multiplier = window.fpsSpeedMultipliers[window.fpsSpeedLevel - 1] || 1;
            const speed = window.fpsBaseSpeed * multiplier;
            
            const yaw = window.fpsYaw;
            const forwardX = Math.sin(yaw);
            const forwardZ = Math.cos(yaw);
            const rightX = Math.sin(yaw + Math.PI / 2);
            const rightZ = Math.cos(yaw + Math.PI / 2);
            
            let moveX = 0, moveZ = 0;
            
            if (window.moveState.forward) {
                moveX -= forwardX * speed;
                moveZ -= forwardZ * speed;
            }
            if (window.moveState.backward) {
                moveX += forwardX * speed;
                moveZ += forwardZ * speed;
            }
            if (window.moveState.left) {
                moveX -= rightX * speed;
                moveZ -= rightZ * speed;
            }
            if (window.moveState.right) {
                moveX += rightX * speed;
                moveZ += rightZ * speed;
            }
            
            // コリジョン応答を考慮した移動（加算式）
            const currentVelX2 = window.playerBody.velocity.x;
            const currentVelZ2 = window.playerBody.velocity.z;
            const blendFactor2 = 0.5;
            window.playerBody.velocity.x = currentVelX2 * (1 - blendFactor2) + moveX * blendFactor2;
            window.playerBody.velocity.z = currentVelZ2 * (1 - blendFactor2) + moveZ * blendFactor2;
            
            // ジャンプ対応：地面判定（地面ON/OFF対応 + 環境コライダー対応）
            const groundEnabled2 = window.groundObjects && window.groundObjects.visible;
            const minHeight2 = groundEnabled2 ? 1.65 : -10000;
            
            // 環境コライダー上にいるかチェック
            if (window.playerOnEnvironment) {
                if (window.playerBody.velocity.y < 0) {
                    window.playerBody.velocity.y = 0;
                }
                window.isOnGround = true;
                window.playerOnEnvironment = false;
            } else if (window.playerBody.position.y <= minHeight2) {
                window.playerBody.position.y = minHeight2;
                if (window.playerBody.velocity.y < 0) {
                    window.playerBody.velocity.y = 0;
                }
                window.isOnGround = true;
            } else {
                window.playerBody.velocity.y -= 0.3; // 重力
                window.isOnGround = false;
            }
            
            camera.position.x = window.playerBody.position.x;
            camera.position.y = window.playerBody.position.y;
            camera.position.z = window.playerBody.position.z;
            
            const quaternion = new THREE.Quaternion();
            const euler = new THREE.Euler(window.fpsPitch, window.fpsYaw, 0, 'YXZ');
            quaternion.setFromEuler(euler);
            camera.quaternion.copy(quaternion);
        }
        
        // 物理演算を進める
        window.physicsWorld.step(timeStep);
        
        // Three.jsのメッシュを物理ボディに同期
        window.physicsObjects.forEach(obj => {
            if (obj.mesh && obj.body) {
                obj.mesh.position.copy(obj.body.position);
                obj.mesh.quaternion.copy(obj.body.quaternion);
            }
        });
        
        requestAnimationFrame(updatePhysics);
    }
    
    updatePhysics();
    console.log('✅ 物理演算ループ開始（VRMコライダー付き）');
};

// VRMが読み込まれたらコライダーを作成
function setupVRMColliderWatcher() {
    let lastVRM = null;
    
    setInterval(() => {
        // 人形モード中はコライダーを作成しない
        if (window.dollModeActive) return;
        
        if (window.app && window.app.vrm && window.app.vrm !== lastVRM) {
            lastVRM = window.app.vrm;
            setTimeout(() => {
                // 再度チェック（過去に人形モードに入ったかも）
                if (window.dollModeActive) return;
                createVRMColliders();
            }, 500); // VRMが完全に読み込まれるまで少し待つ
        }
    }, 1000);
}

// 初期化時にVRMウォッチャーを起動
setTimeout(setupVRMColliderWatcher, 2000);

// グローバルに公開
window.createVRMColliders = createVRMColliders;
window.clearVRMColliders = clearVRMColliders;
window.toggleVRMColliderVisibility = toggleVRMColliderVisibility;

// ========================================
// 環境オブジェクト（GLB/GLTF）の物理コライダー
// キネマティック（動かない）オブジェクトとして追加
// ========================================

window.environmentColliders = [];  // 環境コライダーのリスト
window.environmentColliderMeshes = [];  // 視覚化用メッシュ
window.showEnvironmentColliders = false;  // コライダー表示フラグ

/**
 * 3Dモデルから物理コライダーを作成
 * @param {THREE.Object3D} model - Three.jsの3Dモデル
 * @param {Object} options - オプション
 */
window.createEnvironmentColliders = function(model, options = {}) {
    if (!window.physicsWorld || !model) {
        console.warn('⚠️ 物理ワールドまたはモデルがありません');
        return;
    }
    
    const THREE = window.THREE;
    console.log('🏗️ 環境コライダー作成開始（Trimeshモード）...');
    
    // 既存の環境コライダーを削除
    window.clearEnvironmentColliders();
    
    const colliderCount = { trimesh: 0, skipped: 0 };
    
    // モデルをトラバースしてメッシュを探す
    model.traverse((child) => {
        if (!child.isMesh) return;
        if (!child.geometry) return;
        
        // メッシュのワールド座標を取得
        child.updateMatrixWorld(true);
        
        const geo = child.geometry;
        const posAttr = geo.attributes.position;
        if (!posAttr) return;
        
        // マテリアルが配列の場合（複数マテリアル）
        const materials = Array.isArray(child.material) ? child.material : [child.material];
        const groups = geo.groups && geo.groups.length > 0 ? geo.groups : [{ start: 0, count: geo.index ? geo.index.count : posAttr.count, materialIndex: 0 }];
        
        console.log(`📦 メッシュ処理: ${child.name || 'unnamed'}, グループ数: ${groups.length}, マテリアル数: ${materials.length}`);
        
        // 各グループ（サブメッシュ）ごとに処理
        groups.forEach((group, groupIndex) => {
            // マテリアルを取得
            const matIndex = group.materialIndex !== undefined ? group.materialIndex : 0;
            const mat = materials[matIndex] || materials[0];
            const matName = (mat && mat.name) ? mat.name.toLowerCase() : '';
            
            // ★ 空（sky）はスキップ ★
            const isSky = matName.includes('空') || matName.includes('sky');
            const hasSkyFlag = mat && mat.userData && mat.userData.isSky;
            
            if (isSky || hasSkyFlag) {
                console.log('☁️ 空グループをスキップ:', matName || `group_${groupIndex}`);
                colliderCount.skipped++;
                return;
            }
            
            try {
                // このグループのインデックスを取得
                let groupIndices = [];
                const indexArray = geo.index ? geo.index.array : null;
                
                if (indexArray) {
                    // インデックスバッファがある場合
                    for (let i = group.start; i < group.start + group.count; i++) {
                        groupIndices.push(indexArray[i]);
                    }
                } else {
                    // インデックスがない場合
                    for (let i = group.start; i < group.start + group.count; i++) {
                        groupIndices.push(i);
                    }
                }
                
                // 頂点数チェック
                if (groupIndices.length < 3) {
                    colliderCount.skipped++;
                    return;
                }
                
                // 使用する頂点のインデックスを再マッピング
                const usedVertices = new Map();
                const newIndices = [];
                const vertices = [];
                const tempVec = new THREE.Vector3();
                let newIndex = 0;
                
                groupIndices.forEach(oldIdx => {
                    if (!usedVertices.has(oldIdx)) {
                        tempVec.fromBufferAttribute(posAttr, oldIdx);
                        tempVec.applyMatrix4(child.matrixWorld);
                        vertices.push(tempVec.x, tempVec.y, tempVec.z);
                        usedVertices.set(oldIdx, newIndex);
                        newIndex++;
                    }
                    newIndices.push(usedVertices.get(oldIdx));
                });
                
                if (vertices.length < 9 || newIndices.length < 3) {
                    colliderCount.skipped++;
                    return;
                }
                
                // ★ Cannon.js Trimeshを作成 ★
                const trimeshShape = new CANNON.Trimesh(vertices, newIndices);
                
                const body = new CANNON.Body({
                    mass: 0,
                    collisionFilterGroup: 2,
                    collisionFilterMask: 1 | 2 | 4
                });
                
                body.addShape(trimeshShape);
                window.physicsWorld.addBody(body);
                
                // バウンディングボックスを計算
                let minX = Infinity, minY = Infinity, minZ = Infinity;
                let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
                for (let i = 0; i < vertices.length; i += 3) {
                    minX = Math.min(minX, vertices[i]);
                    maxX = Math.max(maxX, vertices[i]);
                    minY = Math.min(minY, vertices[i+1]);
                    maxY = Math.max(maxY, vertices[i+1]);
                    minZ = Math.min(minZ, vertices[i+2]);
                    maxZ = Math.max(maxZ, vertices[i+2]);
                }
                const center = new THREE.Vector3((minX+maxX)/2, (minY+maxY)/2, (minZ+maxZ)/2);
                const size = new THREE.Vector3(maxX-minX, maxY-minY, maxZ-minZ);
                
                const colliderName = (mat && mat.name) || `group_${groupIndex}`;
                window.environmentColliders.push({
                    body: body,
                    mesh: child,
                    groupIndex: groupIndex,
                    center: center,
                    size: size,
                    name: colliderName,
                    type: 'trimesh',
                    vertexCount: vertices.length / 3,
                    triangleCount: newIndices.length / 3
                });
                
                console.log(`  ✅ ${colliderName}: ${newIndices.length/3}三角形, ${vertices.length/3}頂点`);
                colliderCount.trimesh++;
                
            } catch (e) {
                console.warn('⚠️ グループTrimeshエラー:', matName, e.message);
                colliderCount.skipped++;
            }
        });
    });
    
    console.log(`✅ 環境コライダー作成完了: ${colliderCount.trimesh}個のTrimesh, ${colliderCount.skipped}個スキップ`);
    
    // ★ モデルの親グループを参照として保存（高さ・スケール同期用）★
    // GLBモデルは通常、親Groupで位置とスケールが制御される
    if (model.parent && model.parent.type === 'Group') {
        window.environmentModelRef = model.parent;
        console.log('📍 親グループを参照:', model.parent.name, 'Y:', model.parent.position.y, 'Scale:', model.parent.scale.x);
    } else {
        window.environmentModelRef = model;
    }
    
    // ★ 高さスライダーにイベントリスナーを追加 ★
    setTimeout(() => {
        const heightSlider = document.getElementById('env-height');
        const heightInput = document.getElementById('env-height-input');
        
        const syncFunc = () => window.syncEnvironmentCollidersToModel();
        
        if (heightSlider && !heightSlider._colliderSyncAdded) {
            heightSlider.addEventListener('input', syncFunc);
            heightSlider.addEventListener('change', syncFunc);
            heightSlider._colliderSyncAdded = true;
            console.log('✅ 高さスライダーにコライダー同期イベント追加');
        }
        
        if (heightInput && !heightInput._colliderSyncAdded) {
            heightInput.addEventListener('input', syncFunc);
            heightInput.addEventListener('change', syncFunc);
            heightInput._colliderSyncAdded = true;
        }
    }, 500);
    
    // ★ モデルの現在位置でコライダーを同期 ★
    window.syncEnvironmentCollidersToModel();
    
    // コライダー表示がONなら視覚化
    if (window.showEnvironmentColliders) {
        window.updateEnvironmentColliderVisuals();
    }
    
    return window.environmentColliders;
};

/**
 * 環境コライダーをモデルの位置に同期
 */
window.syncEnvironmentCollidersToModel = function() {
    const parentGroup = window.environmentModelRef;
    if (!parentGroup || !window.environmentColliders) {
        console.log('⚠️ モデル参照またはコライダーがありません');
        return;
    }
    
    // 親グループの位置とスケールを取得
    const offsetY = parentGroup.position.y;
    const scale = parentGroup.scale.x; // 均等スケールを仮定
    
    console.log(`📍 コライダー同期: Y=${offsetY.toFixed(2)}, Scale=${scale.toFixed(2)}`);
    
    // 各コライダーのbody位置を更新
    // Trimeshの頂点は matrixWorld 適用済み（スケール込み）なので、
    // 位置オフセットのみ追加で適用
    window.environmentColliders.forEach((collider, i) => {
        if (collider.body) {
            collider.body.position.y = offsetY;
        }
    });
    
    // 視覚化メッシュも更新（表示されている場合）
    if (window.showEnvironmentColliders) {
        window.updateEnvironmentColliderVisuals();
    }
    
    console.log(`✅ ${window.environmentColliders.length}個のコライダーを Y=${offsetY} に同期`);
};

/**
 * 環境コライダーを削除
 */
window.clearEnvironmentColliders = function() {
    // 物理ボディを削除
    window.environmentColliders.forEach(collider => {
        if (collider.body && window.physicsWorld) {
            window.physicsWorld.removeBody(collider.body);
        }
    });
    window.environmentColliders = [];
    
    // 視覚化メッシュを削除
    window.environmentColliderMeshes.forEach(mesh => {
        if (mesh && window.app && window.app.scene) {
            window.app.scene.remove(mesh);
        }
        if (mesh.geometry) mesh.geometry.dispose();
        if (mesh.material) mesh.material.dispose();
    });
    window.environmentColliderMeshes = [];
    
    console.log('🗑️ 環境コライダー削除');
};

/**
 * 環境コライダーの表示/非表示を切り替え
 */
window.toggleEnvironmentColliderVisibility = function() {
    window.showEnvironmentColliders = !window.showEnvironmentColliders;
    
    if (window.showEnvironmentColliders) {
        window.updateEnvironmentColliderVisuals();
        console.log('🟦 環境コライダー表示 ON');
    } else {
        // 視覚化メッシュを削除
        window.environmentColliderMeshes.forEach(mesh => {
            if (mesh && window.app && window.app.scene) {
                window.app.scene.remove(mesh);
            }
            if (mesh.geometry) mesh.geometry.dispose();
            if (mesh.material) mesh.material.dispose();
        });
        window.environmentColliderMeshes = [];
        console.log('🟦 環境コライダー表示 OFF');
    }
};

/**
 * 環境コライダーの視覚化メッシュを更新
 */
window.updateEnvironmentColliderVisuals = function() {
    const THREE = window.THREE;
    if (!THREE || !window.app || !window.app.scene) return;
    
    // 既存のメッシュを削除
    window.environmentColliderMeshes.forEach(mesh => {
        if (mesh) {
            window.app.scene.remove(mesh);
            if (mesh.geometry) mesh.geometry.dispose();
            if (mesh.material) mesh.material.dispose();
        }
    });
    window.environmentColliderMeshes = [];
    
    // 各コライダーの視覚化
    window.environmentColliders.forEach(collider => {
        let mesh;
        
        if (collider.type === 'trimesh' && collider.mesh && collider.mesh.geometry) {
            // ★ Trimeshの場合：元のメッシュ形状をワイヤーフレーム表示 ★
            const geo = collider.mesh.geometry.clone();
            const mat = new THREE.MeshBasicMaterial({
                color: 0x00ff88,  // 緑色
                transparent: true,
                opacity: 0.15,
                wireframe: true
            });
            mesh = new THREE.Mesh(geo, mat);
            // ワールド変換を適用
            mesh.matrixAutoUpdate = false;
            mesh.matrix.copy(collider.mesh.matrixWorld);
        } else {
            // ボックスの場合（フォールバック）
            const geo = new THREE.BoxGeometry(collider.size.x, collider.size.y, collider.size.z);
            const mat = new THREE.MeshBasicMaterial({
                color: 0x0088ff,
                transparent: true,
                opacity: 0.3,
                wireframe: true
            });
            mesh = new THREE.Mesh(geo, mat);
            mesh.position.copy(collider.center);
            
            if (collider.body) {
                mesh.quaternion.set(
                    collider.body.quaternion.x,
                    collider.body.quaternion.y,
                    collider.body.quaternion.z,
                    collider.body.quaternion.w
                );
            }
        }
        
        mesh.name = 'envCollider_' + collider.name;
        window.app.scene.add(mesh);
        window.environmentColliderMeshes.push(mesh);
    });
    
    console.log(`🟩 環境コライダー視覚化: ${window.environmentColliderMeshes.length}個`);
};



// ========================================
// 地面の表示/非表示切り替え
// ========================================

/**
 * 地面（グリッド + 物理判定）の表示/非表示を切り替え
 */
window.toggleGroundVisibility = function() {
    window.groundObjects.visible = !window.groundObjects.visible;
    
    const visible = window.groundObjects.visible;
    
    // グリッドの表示/非表示
    if (window.groundObjects.gridHelper) {
        window.groundObjects.gridHelper.visible = visible;
    }
    
    // 外枠の表示/非表示
    if (window.groundObjects.edgeMesh) {
        window.groundObjects.edgeMesh.visible = visible;
    }
    
    // 透明な床メッシュの表示/非表示
    if (window.groundObjects.groundMesh) {
        window.groundObjects.groundMesh.visible = visible;
    }
    
    // 物理判定の有効/無効
    if (window.groundObjects.groundBody && window.physicsWorld) {
        if (visible) {
            if (!window.physicsWorld.bodies.includes(window.groundObjects.groundBody)) {
                window.physicsWorld.addBody(window.groundObjects.groundBody);
                console.log('🟢 地面の物理判定を有効化');
            }
        } else {
            window.physicsWorld.removeBody(window.groundObjects.groundBody);
            console.log('🔴 地面の物理判定を無効化');
        }
    }
    
    console.log(`🌍 地面: ${visible ? '表示' : '非表示'}`);
    
    // ボタンのテキストを更新
    const btn = document.getElementById('toggle-ground-btn');
    if (btn) {
        btn.textContent = visible ? '🌍 地面ON' : '🌍 地面OFF';
        btn.style.background = visible 
            ? 'linear-gradient(135deg, #00b894, #00cec9)' 
            : 'linear-gradient(135deg, #636e72, #2d3436)';
    }
    
    return visible;
};

// UIに地面切り替えボタンを追加
setTimeout(function() {
    const panel = document.getElementById('physics-panel');
    if (!panel) return;
    
    if (document.getElementById('toggle-ground-btn')) return;
    
    const vrmColliderBtn = document.getElementById('vrm-collider-btn');
    if (vrmColliderBtn) {
        const groundBtn = document.createElement('button');
        groundBtn.id = 'toggle-ground-btn';
        groundBtn.textContent = '🌍 地面ON';
        groundBtn.style.cssText = `
            width: 100%;
            padding: 6px;
            margin-top: 6px;
            background: linear-gradient(135deg, #00b894, #00cec9);
            color: white;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            font-size: 10px;
            font-weight: bold;
        `;
        groundBtn.onclick = function() {
            window.toggleGroundVisibility();
        };
        
        vrmColliderBtn.parentNode.insertBefore(groundBtn, vrmColliderBtn.nextSibling);
        console.log('✅ 地面切り替えボタン追加');
    }
}, 3000);

// ========================================
// VRMキャラクター落下システム
// 地面OFFの時にVRMキャラも落下する
// ========================================

window.vrmFallState = {
    velocityY: 0,          // Y方向の速度
    gravity: -9.82,        // 重力加速度
    groundLevel: 0,        // 地面の高さ
    isFalling: false,      // 落下中フラグ
    terminalVelocity: -50  // 終端速度（落下の最大速度）
};

/**
 * VRMキャラクターの落下処理を更新
 */
window.updateVRMFalling = function() {
    // VRMがなければスキップ
    if (!window.app || !window.app.vrm) return;
    
    const vrm = window.app.vrm;
    const vrmPos = vrm.scene.position;
    const dt = 1/60; // タイムステップ
    
    // 地面がONの場合
    if (window.groundObjects && window.groundObjects.visible) {
        // 地面より下にいたら地面に戻す
        if (vrmPos.y < window.vrmFallState.groundLevel) {
            vrmPos.y = window.vrmFallState.groundLevel;
            window.vrmFallState.velocityY = 0;
            window.vrmFallState.isFalling = false;
        }
        return;
    }
    
    // 地面がOFFの場合 → 落下処理
    window.vrmFallState.isFalling = true;
    
    // 重力を適用
    window.vrmFallState.velocityY += window.vrmFallState.gravity * dt;
    
    // 終端速度を制限
    if (window.vrmFallState.velocityY < window.vrmFallState.terminalVelocity) {
        window.vrmFallState.velocityY = window.vrmFallState.terminalVelocity;
    }
    
    // 位置を更新
    vrmPos.y += window.vrmFallState.velocityY * dt;
    
    // 環境コライダーとの衝突チェック（床に着地する場合）
    if (window.environmentColliders && window.environmentColliders.length > 0) {
        const THREE = window.THREE;
        if (THREE) {
            // VRMの足元位置
            const footY = vrmPos.y;
            
            for (const envCol of window.environmentColliders) {
                if (!envCol.center || !envCol.size) continue;
                
                // VRMがコライダーの上にいるかチェック
                const boxTop = envCol.center.y + envCol.size.y / 2;
                const boxBottom = envCol.center.y - envCol.size.y / 2;
                
                // X, Z範囲内にいるか
                const inXRange = Math.abs(vrmPos.x - envCol.center.x) < envCol.size.x / 2 + 0.3;
                const inZRange = Math.abs(vrmPos.z - envCol.center.z) < envCol.size.z / 2 + 0.3;
                
                // コライダーの上に着地
                if (inXRange && inZRange && footY <= boxTop + 0.1 && footY >= boxBottom) {
                    if (window.vrmFallState.velocityY < 0) {
                        vrmPos.y = boxTop;
                        window.vrmFallState.velocityY = 0;
                        window.vrmFallState.isFalling = false;
                        break;
                    }
                }
            }
        }
    }
};

/**
 * VRM落下状態をリセット
 */
window.resetVRMFallState = function() {
    window.vrmFallState.velocityY = 0;
    window.vrmFallState.isFalling = false;
    
    // VRMを地面に戻す
    if (window.app && window.app.vrm) {
        const vrm = window.app.vrm;
        if (vrm.scene.position.y < window.vrmFallState.groundLevel) {
            vrm.scene.position.y = window.vrmFallState.groundLevel;
        }
    }
    
    console.log('🔄 VRM落下状態リセット');
};

// toggleGroundVisibility を拡張してVRM落下リセットを追加
const originalToggleGroundVisibility = window.toggleGroundVisibility;
window.toggleGroundVisibility = function() {
    const result = originalToggleGroundVisibility();
    
    // 地面がONになったらVRM落下をリセット
    if (window.groundObjects.visible) {
        window.resetVRMFallState();
    } else {
        console.log('⚠️ 地面OFF: VRMも落下します！');
    }
    
    return result;
};

// VRM落下更新を物理ループに追加
(function setupVRMFallingLoop() {
    let lastUpdate = performance.now();
    
    function updateVRMFallingLoop() {
        const now = performance.now();
        const dt = (now - lastUpdate) / 1000;
        lastUpdate = now;
        
        // VRM落下処理を呼び出し
        window.updateVRMFalling();
        
        requestAnimationFrame(updateVRMFallingLoop);
    }
    
    // 少し遅延して開始（他のシステムが初期化されてから）
    setTimeout(function() {
        updateVRMFallingLoop();
        console.log('✅ VRM落下システム開始');
    }, 3000);
})();

// ========================================
// モーキャプ移動モード
// VMCからの動きを検出してFPS移動を制御
// ========================================

window.mocapMoveMode = {
    enabled: false,
    
    // 動き検出用の履歴
    history: {
        hipsY: [],           // 腰の高さ履歴（歩き検出用）
        leftHandY: [],       // 左手Y位置履歴（羽ばたき検出用）
        rightHandY: [],      // 右手Y位置履歴（羽ばたき検出用）
        leftHandX: [],       // 左手X位置履歴（水泳モード用）
        leftHandZ: [],       // 左手Z位置履歴（水泳モード用）
        rightHandX: [],      // 右手X位置履歴（水泳モード用）
        rightHandZ: [],      // 右手Z位置履歴（水泳モード用）
        headYaw: [],         // 頭のヨー角度履歴
        chestPitch: [],      // 胸の前傾角度履歴
        spinePitch: [],      // 背骨の前傾角度履歴
        hipsPitch: [],       // 腰の前傾角度履歴
        maxHistoryLength: 30 // 30フレーム分保持
    },
    
    // 検出された動き
    detected: {
        walking: 0,          // 歩き強度 (0-1)
        flapping: 0,         // 羽ばたき強度 (0-1)
        leanForward: 0,      // 前傾角度 (-1 to 1)
        headYaw: 0,          // 頭のヨー角度（ラジアン）
        headRoll: 0,         // 頭のロール角度（Z軸傾き、ラジアン）
        bodyYaw: 0,          // 体のヨー角度（ラジアン）
        swimForward: 0,      // 水泳モード前後移動 (-1〜1)
        swimRotate: 0        // 水泳モード回転 (-1〜1)
    },
    
    // 設定（感度を大幅に上げた）
    config: {
        walkThreshold: 0.005,    // 歩き検出閾値（メートル）★大幅に下げた
        walkSpeed: 6,            // 歩き移動速度 ★上げた
        flapThreshold: 0.15,     // 羽ばたき検出閾値（メートル）15cm以上の動き
        flapLiftSpeed: 4,        // 羽ばたき上昇速度 ★上げた
        leanThreshold: 0.01,     // 傾き検出閾値（ラジアン）★さらに下げた
        leanMoveSpeed: 15,       // 傾き移動速度 ★大幅UP
        leanMoveEnabled: false,  // 傾き移動の有効/無効 ★デフォルトOFF
        leanMoveInvert: false,   // 傾き移動の方向を逆転
        leanDeadzone: 0.15,      // 傾き移動のデッドゾーン（この値以下は静止）
        turnSpeed: 2.5,          // 方向転換速度
        turnThreshold: 0.1,      // 方向転換検出閾値（ラジアン）
        headTiltWeight: 0.5,     // 首傾き（Z軸）の回転への影響度（0=無効、1=最大）
        smoothing: 0.1,          // スムージング係数 ★さらに下げた（反応を速く）
        gravity: 9.82,           // 重力加速度 m/s²
        maxFallSpeed: 20,        // 最大落下速度 m/s
        mouthMoveSpeed: 10,      // 口で前進の速度
        // 水泳モード設定
        swimModeEnabled: false,  // 水泳モードの有効/無効
        swimMoveSpeed: 8,        // 水泳前後移動速度
        swimRotateSpeed: 2.5,    // 水泳回転速度
        swimThreshold: 0.05      // 水泳動作検出閾値
    },
    
    // 飛行状態
    flying: {
        isFlying: false,
        altitude: 0,
        verticalVelocity: 0
    },
    
    // デバッグ用生データ
    rawData: {
        hipsY: 0,
        chestPitch: 0,
        spinePitch: 0,
        hipsPitch: 0
    },
    
    // サードパーソン表示設定
    thirdPerson: {
        enabled: false,
        distance: 2.0,      // カメラからの距離
        heightOffset: 0,    // 高さオフセット（0=同じ高さ）
        smoothing: 0.1      // 追従のスムージング
    },
    
    // 口＋手のひら回転モード
    mouthHandRotate: false,
    
    // 口アクションモード
    mouthAction: {
        enabled: false,
        type: 'move',       // 'move' または 'shoot'
        lastShootTime: 0,   // 最後に弾を撃った時刻
        shootCooldown: 300, // 発射間隔（ミリ秒）
        shootFromHand: false, // 右手の先から発射
        shootMode: 'camera' // 'camera'（カメラ前方）, 'hand'（右手先）, 'wrist'（手首先）
    },
    
    // 口・手のひらの検出値
    mouthHand: {
        mouthOpen: 0,       // 口の開き具合 (0-1)
        leftHandOpen: 0,    // 左手の開き具合 (0-1)
        rightHandOpen: 0,   // 右手の開き具合 (0-1)
        mouthThreshold: 0.3, // 口が開いたと判定する閾値
        // ジェスチャー検出
        leftPointingFinger: false,  // 左手人差し指立て
        rightPointingFinger: false, // 右手人差し指立て
        leftPeace: false,           // 左手ピース
        rightPeace: false,          // 右手ピース
        leftFist: false,            // 左手グー
        rightFist: false            // 右手グー
    },
    
    // ジェスチャー制御
    gestureControl: {
        freezeActive: false,        // 静止状態
        returnToStartActive: false, // 元の位置に戻る
        startPosition: null,        // 開始位置
        // 前フレームの状態（ジェスチャー遷移検出用）
        prevLeftFist: false,
        prevRightFist: false,
        prevBothFist: false         // 両手グー状態を記録
    }
};

/**
 * モーキャプ移動モードを切り替え
 */
window.toggleMocapMoveMode = function() {
    window.mocapMoveMode.enabled = !window.mocapMoveMode.enabled;
    
    const btn = document.getElementById('mocap-move-btn');
    if (btn) {
        if (window.mocapMoveMode.enabled) {
            btn.textContent = '🎭 モーキャプ移動 ON';
            btn.style.background = 'linear-gradient(135deg, #00c853, #00e676)';
            console.log('🎭 モーキャプ移動モード ON');
            console.log('  - その場歩き → 前進');
            console.log('  - 手を羽ばたかせる → 上昇');
            console.log('  - 体を前に傾ける → 前進（飛行中）');
            console.log('  - 体を後ろに傾ける → 後退（飛行中）');
            console.log('  - 頭/体を捻る → 方向転換');
        } else {
            btn.textContent = '🎭 モーキャプ移動 OFF';
            btn.style.background = 'linear-gradient(135deg, #667eea, #764ba2)';
            console.log('🎭 モーキャプ移動モード OFF');
            // 履歴をクリア
            window.mocapMoveMode.history.hipsY = [];
            window.mocapMoveMode.history.leftHandY = [];
            window.mocapMoveMode.history.rightHandY = [];
            window.mocapMoveMode.history.leftHandX = [];
            window.mocapMoveMode.history.leftHandZ = [];
            window.mocapMoveMode.history.rightHandX = [];
            window.mocapMoveMode.history.rightHandZ = [];
            window.mocapMoveMode.history.headYaw = [];
            window.mocapMoveMode.history.chestPitch = [];
        }
    }
    
    return window.mocapMoveMode.enabled;
};

/**
 * モーキャプVRMからのボーンデータを解析して動きを検出
 */
window.analyzeMocapMovement = function() {
    if (!window.mocapMoveMode.enabled) return;
    if (!window.fpsMode) return;
    
    const detected = window.mocapMoveMode.detected;
    
    // モーキャプが接続されていない場合は検出値をリセット
    if (!window.vmcMocap) {
        detected.walking = 0;
        detected.flapping = 0;
        detected.leanForward = 0;
        detected.headYaw = 0;
        detected.bodyYaw = 0;
        return;
    }
    
    // モーキャプVRMを取得
    const mocapVRM = window.vmcMocap.getTargetVRM();
    if (!mocapVRM || !mocapVRM.humanoid) {
        detected.walking = 0;
        detected.flapping = 0;
        detected.leanForward = 0;
        detected.headYaw = 0;
        detected.bodyYaw = 0;
        return;
    }
    
    const humanoid = mocapVRM.humanoid;
    const THREE = window.THREE;
    if (!THREE) return;
    
    const history = window.mocapMoveMode.history;
    const config = window.mocapMoveMode.config;
    const rawData = window.mocapMoveMode.rawData;
    const maxLen = history.maxHistoryLength;
    
    // === 1. 腰の高さを取得（歩き検出用） ===
    const hipsBone = humanoid.getNormalizedBoneNode('hips');
    if (hipsBone) {
        const worldPos = new THREE.Vector3();
        hipsBone.getWorldPosition(worldPos);
        rawData.hipsY = worldPos.y;
        
        history.hipsY.push(worldPos.y);
        if (history.hipsY.length > maxLen) history.hipsY.shift();
        
        // 上下動きの振幅を計算（より短い期間で検出）
        if (history.hipsY.length >= 5) {
            const recent = history.hipsY.slice(-8); // 8フレーム分
            const max = Math.max(...recent);
            const min = Math.min(...recent);
            const amplitude = max - min;
            
            // 閾値以上の上下動きがあれば歩いている
            if (amplitude > config.walkThreshold) {
                // 感度を上げて強めに反応
                detected.walking = Math.min(1, amplitude / (config.walkThreshold * 2));
            } else {
                detected.walking *= 0.95; // 減衰を緩やかに
            }
        }
    }
    
    // === 2. 羽ばたき検出（肩からの相対位置で検出） ===
    // 肩と手の相対位置を使うことで、体全体の動きではなく腕の動きのみを検出
    const leftShoulderBone = humanoid.getNormalizedBoneNode('leftUpperArm');
    const rightShoulderBone = humanoid.getNormalizedBoneNode('rightUpperArm');
    const leftHandBone = humanoid.getNormalizedBoneNode('leftHand');
    const rightHandBone = humanoid.getNormalizedBoneNode('rightHand');
    
    if (leftShoulderBone && rightShoulderBone && leftHandBone && rightHandBone) {
        const leftShoulderPos = new THREE.Vector3();
        const rightShoulderPos = new THREE.Vector3();
        const leftHandPos = new THREE.Vector3();
        const rightHandPos = new THREE.Vector3();
        
        leftShoulderBone.getWorldPosition(leftShoulderPos);
        rightShoulderBone.getWorldPosition(rightShoulderPos);
        leftHandBone.getWorldPosition(leftHandPos);
        rightHandBone.getWorldPosition(rightHandPos);
        
        // 肩から手までの相対的なY差分（手が肩より上なら正）
        const leftRelativeY = leftHandPos.y - leftShoulderPos.y;
        const rightRelativeY = rightHandPos.y - rightShoulderPos.y;
        
        history.leftHandY.push(leftRelativeY);
        history.rightHandY.push(rightRelativeY);
        if (history.leftHandY.length > maxLen) history.leftHandY.shift();
        if (history.rightHandY.length > maxLen) history.rightHandY.shift();
        
        // 水泳モード用：手のXZ位置も追跡（肩を基準）
        const leftRelativeX = leftHandPos.x - leftShoulderPos.x;
        const leftRelativeZ = leftHandPos.z - leftShoulderPos.z;
        const rightRelativeX = rightHandPos.x - rightShoulderPos.x;
        const rightRelativeZ = rightHandPos.z - rightShoulderPos.z;
        
        history.leftHandX.push(leftRelativeX);
        history.leftHandZ.push(leftRelativeZ);
        history.rightHandX.push(rightRelativeX);
        history.rightHandZ.push(rightRelativeZ);
        if (history.leftHandX.length > maxLen) history.leftHandX.shift();
        if (history.leftHandZ.length > maxLen) history.leftHandZ.shift();
        if (history.rightHandX.length > maxLen) history.rightHandX.shift();
        if (history.rightHandZ.length > maxLen) history.rightHandZ.shift();
        
        // 履歴が十分にたまってから判定
        if (history.leftHandY.length >= 20) {
            const recentLeft = history.leftHandY.slice(-20);
            const recentRight = history.rightHandY.slice(-20);
            
            // 振幅を計算（最大-最小）
            const maxLeft = Math.max(...recentLeft);
            const minLeft = Math.min(...recentLeft);
            const maxRight = Math.max(...recentRight);
            const minRight = Math.min(...recentRight);
            
            const ampLeft = maxLeft - minLeft;
            const ampRight = maxRight - minRight;
            
            // 両手ともが閾値以上動いている場合のみ羽ばたきと判定
            const threshold = config.flapThreshold;
            const bothMoving = ampLeft > threshold && ampRight > threshold;
            
            if (bothMoving) {
                const avgAmplitude = (ampLeft + ampRight) / 2;
                // 閾値の2倍で最大値に達する
                const newFlap = Math.min(1, (avgAmplitude - threshold) / threshold);
                // スムージングをかける
                detected.flapping = detected.flapping * 0.7 + newFlap * 0.3;
            } else {
                // 羽ばたいていない場合は速く減衰
                detected.flapping *= 0.3;
            }
            
            // 小さすぎる値は0に丸める
            if (detected.flapping < 0.05) {
                detected.flapping = 0;
            }
        } else {
            detected.flapping = 0;
        }
    } else {
        detected.flapping = 0;
    }
    
    // === 2.5 水泳モードの検出（手の前後・左右の動き） ===
    // グー（手を閉じる）のときは推進力なし、パー（手を開く）のときだけ推進力が働く
    if (config.swimModeEnabled && history.leftHandZ.length >= 10) {
        const recentLeftZ = history.leftHandZ.slice(-10);
        const recentRightZ = history.rightHandZ.slice(-10);
        const recentLeftX = history.leftHandX.slice(-10);
        const recentRightX = history.rightHandX.slice(-10);
        const recentLeftY = history.leftHandY.slice(-10);
        const recentRightY = history.rightHandY.slice(-10);
        
        // 手の開き具合を取得（mouthHandはこの関数の後半で設定されるので、前回の値を使用）
        const mouthHand = window.mocapMoveMode.mouthHand;
        const handOpenThreshold = 0.4; // この値以上で「パー」と判定
        const leftHandOpen = mouthHand.leftHandOpen > handOpenThreshold;
        const rightHandOpen = mouthHand.rightHandOpen > handOpenThreshold;
        
        // === 前後移動検出：片手ずつ独立して処理 ===
        // 手が開いているときだけ速度を積算
        let leftZVelocity = 0, rightZVelocity = 0;
        let leftYVelocity = 0, rightYVelocity = 0;
        
        for (let i = 1; i < recentLeftZ.length; i++) {
            leftZVelocity += recentLeftZ[i] - recentLeftZ[i-1];
            leftYVelocity += recentLeftY[i] - recentLeftY[i-1];
            rightZVelocity += recentRightZ[i] - recentRightZ[i-1];
            rightYVelocity += recentRightY[i] - recentRightY[i-1];
        }
        
        // パーの手だけ推進力を計算
        let swimForce = 0;
        let activeHands = 0;
        
        // 左手がパーで下に動いている場合
        if (leftHandOpen && leftYVelocity < -config.swimThreshold) {
            swimForce += -leftZVelocity * 5;
            activeHands++;
        }
        
        // 右手がパーで下に動いている場合
        if (rightHandOpen && rightYVelocity < -config.swimThreshold) {
            swimForce += -rightZVelocity * 5;
            activeHands++;
        }
        
        // アクティブな手があれば推進力を適用
        if (activeHands > 0) {
            swimForce /= activeHands; // 平均化
            detected.swimForward = detected.swimForward * 0.7 + swimForce * 0.3;
        } else {
            detected.swimForward *= 0.85; // 動いていない時は減衰
        }
        
        // 値をクリップ
        detected.swimForward = Math.max(-1, Math.min(1, detected.swimForward));
        if (Math.abs(detected.swimForward) < 0.05) detected.swimForward = 0;
        
        // === 回転検出：片手ずつ独立して処理 ===
        // パーの手だけ回転力を計算
        let leftXVelocity = 0, rightXVelocity = 0;
        
        for (let i = 1; i < recentLeftX.length; i++) {
            leftXVelocity += recentLeftX[i] - recentLeftX[i-1];
            rightXVelocity += recentRightX[i] - recentRightX[i-1];
        }
        
        let rotateForce = 0;
        let rotateHands = 0;
        
        // 左手がパーの場合
        if (leftHandOpen && Math.abs(leftXVelocity) > config.swimThreshold) {
            rotateForce += -leftXVelocity * 5;
            rotateHands++;
        }
        
        // 右手がパーの場合
        if (rightHandOpen && Math.abs(rightXVelocity) > config.swimThreshold) {
            rotateForce += -rightXVelocity * 5;
            rotateHands++;
        }
        
        if (rotateHands > 0) {
            rotateForce /= rotateHands;
            detected.swimRotate = detected.swimRotate * 0.7 + rotateForce * 0.3;
        } else {
            detected.swimRotate *= 0.85;
        }
        
        detected.swimRotate = Math.max(-1, Math.min(1, detected.swimRotate));
        if (Math.abs(detected.swimRotate) < 0.05) detected.swimRotate = 0;
    } else {
        detected.swimForward *= 0.9;
        detected.swimRotate *= 0.9;
    }
    
    // === 3. 複数のボーンから前傾角度を計算（精度向上） ===
    let totalPitch = 0;
    let pitchCount = 0;
    
    // 胸ボーン
    const chestBone = humanoid.getNormalizedBoneNode('chest');
    if (chestBone) {
        const euler = new THREE.Euler();
        euler.setFromQuaternion(chestBone.quaternion, 'YXZ');
        rawData.chestPitch = euler.x;
        totalPitch += euler.x;
        pitchCount++;
        
        history.chestPitch.push(euler.x);
        if (history.chestPitch.length > maxLen) history.chestPitch.shift();
    }
    
    // 背骨ボーン
    const spineBone = humanoid.getNormalizedBoneNode('spine');
    if (spineBone) {
        const euler = new THREE.Euler();
        euler.setFromQuaternion(spineBone.quaternion, 'YXZ');
        rawData.spinePitch = euler.x;
        totalPitch += euler.x;
        pitchCount++;
        
        history.spinePitch.push(euler.x);
        if (history.spinePitch.length > maxLen) history.spinePitch.shift();
    }
    
    // 腰ボーン
    if (hipsBone) {
        const euler = new THREE.Euler();
        euler.setFromQuaternion(hipsBone.quaternion, 'YXZ');
        rawData.hipsPitch = euler.x;
        totalPitch += euler.x * 1.5; // 腰は重み付けを強く
        pitchCount += 1.5;
        
        history.hipsPitch.push(euler.x);
        if (history.hipsPitch.length > maxLen) history.hipsPitch.shift();
    }
    
    // 前傾角度を計算
    if (pitchCount > 0) {
        const avgPitch = totalPitch / pitchCount;
        
        // 閾値を非常に低くして反応しやすく
        // 前傾: 負の値（前に倒す）、後傾: 正の値（後ろに倒す）
        if (Math.abs(avgPitch) > config.leanThreshold) {
            // avgPitch: VRMで前傾すると負の値になる
            // 符号をそのまま使用（前傾=負→前進、後傾=正→後退）
            detected.leanForward = Math.max(-1, Math.min(1, avgPitch / 0.3)); // 0.3rad(約17度)で最大
        } else {
            detected.leanForward *= 0.85; // 緩やかに減衰
        }
    }
    
    // === 4. 頭のヨー角度とロール角度を取得（方向転換用） ===
    const headBone = humanoid.getNormalizedBoneNode('head');
    if (headBone) {
        const euler = new THREE.Euler();
        euler.setFromQuaternion(headBone.quaternion, 'YXZ');
        detected.headYaw = euler.y;   // Y軸回転（左右を向く）
        detected.headRoll = euler.z;  // Z軸回転（肩に傾ける）
    }
    
    // === 5. 体全体のヨー角度 ===
    if (spineBone) {
        const euler = new THREE.Euler();
        euler.setFromQuaternion(spineBone.quaternion, 'YXZ');
        detected.bodyYaw = euler.y;
    }
    
    // === 6. 口の開き具合を検出 ===
    const mouthHand = window.mocapMoveMode.mouthHand;
    if (mocapVRM.expressionManager) {
        // VRMの表情から口の開き具合を取得
        const aa = mocapVRM.expressionManager.getValue('aa') || 0;
        const oh = mocapVRM.expressionManager.getValue('oh') || 0;
        const ih = mocapVRM.expressionManager.getValue('ih') || 0;
        mouthHand.mouthOpen = Math.max(aa, oh, ih);
    }
    
    // === 7. 手のひらの開き具合を検出 ===
    // 指のボーンから手の開き具合を推定
    const detectHandOpenness = (side) => {
        const fingers = ['Index', 'Middle', 'Ring', 'Little'];
        let totalCurl = 0;
        let count = 0;
        
        fingers.forEach(finger => {
            const proximalName = `${side}${finger}Proximal`;
            const proximalBone = humanoid.getNormalizedBoneNode(proximalName);
            if (proximalBone) {
                const euler = new THREE.Euler();
                euler.setFromQuaternion(proximalBone.quaternion, 'XYZ');
                // 指の曲がり具合（X軸回転）を取得
                // 曲げると負の値になることが多い
                totalCurl += Math.abs(euler.x);
                count++;
            }
        });
        
        if (count === 0) return 0;
        const avgCurl = totalCurl / count;
        // 指が伸びている（curlが小さい）と手が開いていると判定
        // 0.5rad以上曲がっていると0、完全に伸びていると1
        return Math.max(0, Math.min(1, 1 - avgCurl / 0.8));
    };
    
    mouthHand.leftHandOpen = detectHandOpenness('left');
    mouthHand.rightHandOpen = detectHandOpenness('right');
    
    // === 8. 指のジェスチャー検出 ===
    // 各指の曲がり具合を検出
    const detectFingerCurl = (side, fingerName) => {
        const proximalName = `${side}${fingerName}Proximal`;
        const proximalBone = humanoid.getNormalizedBoneNode(proximalName);
        if (!proximalBone) return 0.5; // ボーンがない場合は中間値
        
        const euler = new THREE.Euler();
        euler.setFromQuaternion(proximalBone.quaternion, 'XYZ');
        // 指の曲がり具合（X軸回転）を取得
        return Math.abs(euler.x);
    };
    
    // 人差し指立て検出（人差し指が伸びていて、他の指が曲がっている）
    const detectPointingFinger = (side) => {
        const indexCurl = detectFingerCurl(side, 'Index');
        const middleCurl = detectFingerCurl(side, 'Middle');
        const ringCurl = detectFingerCurl(side, 'Ring');
        const littleCurl = detectFingerCurl(side, 'Little');
        
        // 人差し指が伸びている（0.3rad以下）かつ他の指が曲がっている（0.4rad以上）
        const indexStraight = indexCurl < 0.3;
        const othersCurled = middleCurl > 0.4 && ringCurl > 0.4 && littleCurl > 0.4;
        
        return indexStraight && othersCurled;
    };
    
    // ピースサイン検出（人差し指と中指が伸びていて、他の指が曲がっている）
    const detectPeace = (side) => {
        const indexCurl = detectFingerCurl(side, 'Index');
        const middleCurl = detectFingerCurl(side, 'Middle');
        const ringCurl = detectFingerCurl(side, 'Ring');
        const littleCurl = detectFingerCurl(side, 'Little');
        
        // 人差し指と中指が伸びている（0.3rad以下）かつ他の指が曲がっている（0.4rad以上）
        const indexStraight = indexCurl < 0.3;
        const middleStraight = middleCurl < 0.3;
        const othersCurled = ringCurl > 0.4 && littleCurl > 0.4;
        
        return indexStraight && middleStraight && othersCurled;
    };
    
    // グー検出（すべての指が曲がっている）
    const detectFist = (side) => {
        const indexCurl = detectFingerCurl(side, 'Index');
        const middleCurl = detectFingerCurl(side, 'Middle');
        const ringCurl = detectFingerCurl(side, 'Ring');
        const littleCurl = detectFingerCurl(side, 'Little');
        
        // すべての指が曲がっている（0.4rad以上）
        const allCurled = indexCurl > 0.4 && middleCurl > 0.4 && ringCurl > 0.4 && littleCurl > 0.4;
        
        return allCurled;
    };
    
    // ジェスチャー結果を格納
    mouthHand.leftPointingFinger = detectPointingFinger('left');
    mouthHand.rightPointingFinger = detectPointingFinger('right');
    mouthHand.leftPeace = detectPeace('left');
    mouthHand.rightPeace = detectPeace('right');
    mouthHand.leftFist = detectFist('left');
    mouthHand.rightFist = detectFist('right');
};

/**
 * モーキャプ移動をFPS移動に適用
 */
window.applyMocapMovement = function() {
    if (!window.mocapMoveMode.enabled) return;
    if (!window.fpsMode) return;
    if (!window.playerBody) return;
    
    const detected = window.mocapMoveMode.detected;
    const config = window.mocapMoveMode.config;
    const flying = window.mocapMoveMode.flying;
    const mouthHand = window.mocapMoveMode.mouthHand;
    const gestureControl = window.mocapMoveMode.gestureControl;
    const dt = 1/60; // 60fps基準のタイムステップ
    
    // === 開始位置を保存（初回のみ） ===
    if (!gestureControl.startPosition) {
        gestureControl.startPosition = {
            x: window.playerBody.position.x,
            y: window.playerBody.position.y,
            z: window.playerBody.position.z
        };
        console.log('📍 開始位置を保存:', gestureControl.startPosition);
    }
    
    // === ジェスチャー制御 ===
    // 両手グー状態を検出
    const bothFist = mouthHand.leftFist && mouthHand.rightFist;
    const bothPointingFinger = mouthHand.leftPointingFinger && mouthHand.rightPointingFinger;
    const returnGesture = mouthHand.leftPointingFinger && mouthHand.rightPeace;
    
    // === 両手グー → 両手人差し指 の遷移を検出 ===
    // 前フレームが両手グーで、今フレームが両手人差し指の場合
    if (gestureControl.prevBothFist && bothPointingFinger) {
        console.log('✊→☝️☝️ 両手グーから両手人差し指への遷移を検出！');
        
        // 「体の傾きで移動」チェックボックスをオフにする
        const leanMoveCheckbox = document.getElementById('mocap-lean-move');
        if (leanMoveCheckbox) {
            leanMoveCheckbox.checked = false;
            // イベントを発火してUIを更新
            leanMoveCheckbox.dispatchEvent(new Event('change'));
            console.log('✅ 「体の傾きで移動」をOFFにしました');
        }
        
        // 設定値も直接変更
        config.leanMoveEnabled = false;
        
        // 静止モードON
        gestureControl.freezeActive = true;
        console.log('☝️☝️ 静止モード ON（両手グーからの遷移）');
        
        // 移動を停止
        window.playerBody.velocity.x = 0;
        window.playerBody.velocity.z = 0;
    }
    
    // === 両手グー → 左手人差し指 + 右手ピース の遷移を検出 ===
    if (gestureControl.prevBothFist && returnGesture && gestureControl.startPosition) {
        console.log('✊→☝️✌️ 両手グーから左人差し指+右ピースへの遷移を検出！');
        gestureControl.returnToStartActive = true;
        console.log('☝️✌️ 元の位置に戻ります...');
    }
    
    // === 元の位置に戻る処理 ===
    if (gestureControl.returnToStartActive && gestureControl.startPosition) {
        const start = gestureControl.startPosition;
        const dx = start.x - window.playerBody.position.x;
        const dz = start.z - window.playerBody.position.z;
        const dist = Math.sqrt(dx * dx + dz * dz);
        
        if (dist > 0.1) {
            // 目標に向かって移動（速度調整）
            const speed = Math.min(dist * 3, 10);
            window.playerBody.velocity.x = (dx / dist) * speed;
            window.playerBody.velocity.z = (dz / dist) * speed;
        } else {
            // 到着
            window.playerBody.position.x = start.x;
            window.playerBody.position.z = start.z;
            window.playerBody.velocity.x = 0;
            window.playerBody.velocity.z = 0;
            gestureControl.returnToStartActive = false;
            console.log('✅ 元の位置に戻りました');
        }
    }
    
    // === 静止モード中の処理 ===
    if (gestureControl.freezeActive) {
        // 静止中は移動をキャンセル
        window.playerBody.velocity.x = 0;
        window.playerBody.velocity.z = 0;
        
        // 両手人差し指でなくなったら静止モード解除
        if (!bothPointingFinger) {
            gestureControl.freezeActive = false;
            console.log('☝️☝️ 静止モード OFF');
        }
    }
    
    // === 前フレームの状態を更新 ===
    gestureControl.prevLeftFist = mouthHand.leftFist;
    gestureControl.prevRightFist = mouthHand.rightFist;
    gestureControl.prevBothFist = bothFist;
    
    // 静止モード中または戻り中は以降の処理をスキップ
    if (gestureControl.freezeActive || gestureControl.returnToStartActive) {
        return;
    }
    
    // デバッグ：羽ばたき値が異常に高い場合は警告
    if (detected.flapping > 0.2 && !window._lastFlapLog) {
        console.log('🦅 羽ばたき検出:', detected.flapping.toFixed(3));
        window._lastFlapLog = Date.now();
    }
    if (window._lastFlapLog && Date.now() - window._lastFlapLog > 1000) {
        window._lastFlapLog = null;
    }
    
    // 基本の方向転換（頭または体のヨー角度 + 頭の傾き）
    // Y軸回転（左右を向く）
    const yawInput = detected.headYaw * 0.7 + detected.bodyYaw * 0.3;
    // Z軸回転（肩に傾ける）- 右肩に傾けると右回転
    const tiltInput = -detected.headRoll * config.headTiltWeight;
    
    const totalTurnInput = yawInput + tiltInput;
    if (Math.abs(totalTurnInput) > config.turnThreshold) {
        window.fpsYaw += totalTurnInput * config.turnSpeed * dt;
    }
    
    // === 口＋手のひら回転モード ===
    if (window.mocapMoveMode.mouthHandRotate) {
        // 口が開いているときだけ手のひらで回転
        if (mouthHand.mouthOpen > mouthHand.mouthThreshold) {
            const rotateSpeed = 3.0; // 回転速度
            // 右手開く → 右回転（負の方向）
            // 左手開く → 左回転（正の方向）
            const rotateAmount = (mouthHand.leftHandOpen - mouthHand.rightHandOpen) * rotateSpeed * dt;
            window.fpsYaw += rotateAmount;
        }
    }
    
    // 前方向ベクトル
    const forwardX = Math.sin(window.fpsYaw);
    const forwardZ = Math.cos(window.fpsYaw);
    
    let moveX = 0, moveZ = 0;
    
    // === 口アクションモード ===
    const mouthAction = window.mocapMoveMode.mouthAction;
    if (mouthAction.enabled && mouthHand.mouthOpen > mouthHand.mouthThreshold) {
        if (mouthAction.type === 'move') {
            // 口を開いている間前進（開き具合に応じて速度調整）
            const mouthMoveSpeed = config.mouthMoveSpeed * mouthHand.mouthOpen;
            moveX -= forwardX * mouthMoveSpeed;
            moveZ -= forwardZ * mouthMoveSpeed;
        } else if (mouthAction.type === 'shoot') {
            // 口を開くと弾を発射
            const now = performance.now();
            if (now - mouthAction.lastShootTime > mouthAction.shootCooldown) {
                mouthAction.lastShootTime = now;
                
                const shootMode = mouthAction.shootMode || 'camera';
                if (shootMode === 'hand') {
                    // 右手の先から発射
                    shootBulletFromHand('hand');
                } else if (shootMode === 'wrist') {
                    // 手首先から（腕方向）発射
                    shootBulletFromHand('wrist');
                } else {
                    // カメラ前方から発射（従来通り）
                    if (window.shootBullet) {
                        window.shootBullet();
                        console.log('🟡 口で弾発射！');
                    }
                }
            }
        }
    }
    
    // === 地面判定 ===
    const groundEnabled = window.groundObjects && window.groundObjects.visible;
    const groundLevel = groundEnabled ? 1.65 : -10000;
    const isOnGround = window.playerBody.position.y <= groundLevel + 0.1;
    
    // === 羽ばたきによる上昇 ===
    // 羽ばたき閾値を超えた場合のみ上昇
    const flapDetected = detected.flapping > 0.3; // 閾値を少し上げた
    
    if (flapDetected) {
        // 羽ばたき検出 → 上昇
        const liftForce = detected.flapping * config.flapLiftSpeed;
        flying.verticalVelocity = Math.min(flying.verticalVelocity + liftForce * 0.1, config.flapLiftSpeed);
        flying.isFlying = true;
        // console.log('🦅 羽ばたき検出:', detected.flapping.toFixed(2), '上昇速度:', flying.verticalVelocity.toFixed(2));
    }
    
    // === 重力は常に適用（羽ばたき中でも） ===
    flying.verticalVelocity -= config.gravity * dt;
    
    // 最大落下速度を制限
    if (flying.verticalVelocity < -config.maxFallSpeed) {
        flying.verticalVelocity = -config.maxFallSpeed;
    }
    
    // === 体の傾きで前後移動（飛行中・地上問わず） ===
    // leanForward: 前傾=負、後傾=正 → 前傾で前進させるため符号反転
    // デッドゾーンを適用（まっすぐ立っているときは静止）
    if (config.leanMoveEnabled) {
        const leanValue = Math.abs(detected.leanForward);
        const deadzone = config.leanDeadzone || 0.15;
        
        if (leanValue > deadzone) {
            // デッドゾーンを超えた分だけ移動（徐々に加速）
            const adjustedLean = (leanValue - deadzone) / (1 - deadzone); // 0-1に正規化
            const sign = detected.leanForward > 0 ? 1 : -1;
            const invertSign = config.leanMoveInvert ? 1 : -1;
            const leanSpeed = invertSign * sign * adjustedLean * config.leanMoveSpeed;
            
            moveX -= forwardX * leanSpeed;
            moveZ -= forwardZ * leanSpeed;
        }
        // デッドゾーン内は何もしない（静止）
    }
    
    // === 水泳モードで前後移動 ===
    if (config.swimModeEnabled && Math.abs(detected.swimForward) > 0.05) {
        const swimSpeed = detected.swimForward * config.swimMoveSpeed;
        moveX -= forwardX * swimSpeed;
        moveZ -= forwardZ * swimSpeed;
    }
    
    // === 水泳モードで回転 ===
    if (config.swimModeEnabled && Math.abs(detected.swimRotate) > 0.05) {
        window.fpsYaw += detected.swimRotate * config.swimRotateSpeed * dt;
    }
    
    // === 歩きによる前進（地上のみ） ===
    if (detected.walking > 0.1 && isOnGround) {
        const walkSpeed = detected.walking * config.walkSpeed;
        // 前進方向に移動
        moveX -= forwardX * walkSpeed;
        moveZ -= forwardZ * walkSpeed;
    }
    
    // === 高度制御（常に適用） ===
    // 地面に到達したら着地
    if (window.playerBody.position.y <= groundLevel) {
        window.playerBody.position.y = groundLevel;
        if (flying.verticalVelocity < 0) {
            flying.verticalVelocity = 0;
        }
        flying.isFlying = false;
    }
    
    // === 移動を適用 ===
    const smoothing = config.smoothing;
    
    // 水平移動
    if (Math.abs(moveX) > 0.01 || Math.abs(moveZ) > 0.01) {
        window.playerBody.velocity.x = window.playerBody.velocity.x * smoothing + moveX * (1 - smoothing);
        window.playerBody.velocity.z = window.playerBody.velocity.z * smoothing + moveZ * (1 - smoothing);
    }
    
    // 垂直移動（飛行中または空中）
    // 地面にいない場合は常に垂直速度を適用
    if (!isOnGround || flying.verticalVelocity > 0) {
        window.playerBody.velocity.y = flying.verticalVelocity;
    }
};

// UIにモーキャプ移動ボタンと設定パネルを追加
setTimeout(function() {
    const fpsBtn = document.getElementById('fps-toggle-btn');
    if (!fpsBtn) return;
    if (document.getElementById('mocap-move-btn')) return;
    
    const mocapBtn = document.createElement('button');
    mocapBtn.id = 'mocap-move-btn';
    mocapBtn.textContent = '🎭 モーキャプ移動 OFF';
    mocapBtn.style.cssText = `
        width: 100%;
        padding: 6px;
        margin-bottom: 4px;
        background: linear-gradient(135deg, #667eea, #764ba2);
        color: white;
        border: none;
        border-radius: 6px;
        font-weight: bold;
        cursor: pointer;
        font-size: 10px;
    `;
    mocapBtn.addEventListener('click', function() {
        window.toggleMocapMoveMode();
    });
    
    // FPSボタンの後に挿入
    fpsBtn.parentNode.insertBefore(mocapBtn, fpsBtn.nextSibling);
    
    // 設定パネル展開ボタン
    const settingsToggle = document.createElement('button');
    settingsToggle.id = 'mocap-settings-toggle';
    settingsToggle.textContent = '⚙️ モーキャプ設定';
    settingsToggle.style.cssText = `
        width: 100%;
        padding: 4px;
        margin-bottom: 6px;
        background: rgba(102, 126, 234, 0.3);
        color: #667eea;
        border: 1px solid #667eea;
        border-radius: 4px;
        cursor: pointer;
        font-size: 9px;
    `;
    mocapBtn.parentNode.insertBefore(settingsToggle, mocapBtn.nextSibling);
    
    // 設定パネル本体
    const settingsPanel = document.createElement('div');
    settingsPanel.id = 'mocap-settings-panel';
    settingsPanel.style.cssText = `
        display: none;
        background: rgba(255,255,255,0.95);
        border-radius: 6px;
        padding: 10px;
        margin-bottom: 8px;
        font-size: 12px;
        color: #222;
        max-height: 60vh;
        overflow-y: auto;
    `;
    settingsPanel.innerHTML = `
        <style>
            #mocap-settings-panel .slider-row {
                margin: 8px 0;
            }
            #mocap-settings-panel .slider-row label {
                display: flex;
                justify-content: space-between;
                color: #222;
                margin-bottom: 3px;
                font-size: 12px;
                font-weight: 500;
            }
            #mocap-settings-panel .slider-row input[type="range"] {
                width: 100%;
                height: 8px;
                -webkit-appearance: none;
                background: linear-gradient(to right, #667eea, #764ba2);
                border-radius: 4px;
                outline: none;
            }
            #mocap-settings-panel .slider-row input[type="range"]::-webkit-slider-thumb {
                -webkit-appearance: none;
                width: 16px;
                height: 16px;
                background: white;
                border: 2px solid #667eea;
                border-radius: 50%;
                cursor: pointer;
            }
            #mocap-settings-panel .section-title {
                color: #222;
                font-weight: bold;
                font-size: 13px;
                margin: 12px 0 6px 0;
                padding-top: 8px;
                border-top: 2px solid #667eea;
            }
            #mocap-settings-panel .section-title:first-child {
                border-top: none;
                padding-top: 0;
                margin-top: 0;
            }
            #mocap-settings-panel .checkbox-row {
                display: flex;
                align-items: center;
                margin: 8px 0;
                padding: 6px;
                background: rgba(102, 126, 234, 0.1);
                border-radius: 4px;
            }
            #mocap-settings-panel .checkbox-row input[type="checkbox"] {
                width: 18px;
                height: 18px;
                margin-right: 8px;
                cursor: pointer;
            }
            #mocap-settings-panel .checkbox-row label {
                color: #222;
                font-size: 12px;
                font-weight: 500;
                cursor: pointer;
            }
            #mocap-settings-panel .radio-group {
                margin: 6px 0;
                padding: 8px;
                background: rgba(102, 126, 234, 0.05);
                border-radius: 4px;
            }
            #mocap-settings-panel .radio-row {
                display: flex;
                align-items: center;
                margin: 4px 0;
            }
            #mocap-settings-panel .radio-row input[type="radio"] {
                width: 16px;
                height: 16px;
                margin-right: 8px;
                cursor: pointer;
            }
            #mocap-settings-panel .radio-row label {
                color: #333;
                font-size: 11px;
                cursor: pointer;
            }
        </style>
        
        <div class="section-title" style="border-top: none; padding-top: 0; margin-top: 0;">💾 設定保存/読み込み</div>
        <div style="display: flex; gap: 4px; margin-bottom: 8px;">
            <select id="mocap-preset-slot" style="
                flex: 1;
                padding: 6px;
                border: 1px solid #ddd;
                border-radius: 4px;
                font-size: 11px;
            ">
                <option value="1">スロット 1</option>
                <option value="2">スロット 2</option>
                <option value="3">スロット 3</option>
                <option value="4">スロット 4</option>
                <option value="5">スロット 5</option>
                <option value="6">スロット 6</option>
                <option value="7">スロット 7</option>
                <option value="8">スロット 8</option>
                <option value="9">スロット 9</option>
                <option value="10">スロット 10</option>
            </select>
            <button id="mocap-save-slot" style="
                padding: 6px 12px;
                background: #4CAF50;
                color: white;
                border: none;
                border-radius: 4px;
                cursor: pointer;
                font-size: 11px;
            ">💾 保存</button>
            <button id="mocap-load-slot" style="
                padding: 6px 12px;
                background: #2196F3;
                color: white;
                border: none;
                border-radius: 4px;
                cursor: pointer;
                font-size: 11px;
            ">📂 読込</button>
        </div>
        <div style="display: flex; gap: 4px; margin-bottom: 8px;">
            <button id="mocap-export-json" style="
                flex: 1;
                padding: 6px;
                background: #9C27B0;
                color: white;
                border: none;
                border-radius: 4px;
                cursor: pointer;
                font-size: 10px;
            ">📤 JSONエクスポート</button>
            <button id="mocap-import-json" style="
                flex: 1;
                padding: 6px;
                background: #FF9800;
                color: white;
                border: none;
                border-radius: 4px;
                cursor: pointer;
                font-size: 10px;
            ">📥 JSONインポート</button>
        </div>
        <input type="file" id="mocap-import-file" accept=".json" style="display: none;">
        <div id="mocap-preset-status" style="
            font-size: 10px;
            color: #666;
            margin-bottom: 8px;
            text-align: center;
        "></div>
        
        <div class="section-title">👄 口・手のひら操作</div>
        <div class="checkbox-row">
            <input type="checkbox" id="mocap-mouth-hand-rotate">
            <label for="mocap-mouth-hand-rotate">口を開く＋手のひらで回転</label>
        </div>
        <div style="font-size:10px; color:#666; margin-left:26px; margin-top:-4px;">
            右手開く→右回転、左手開く→左回転
        </div>
        
        <div class="checkbox-row">
            <input type="checkbox" id="mocap-mouth-action">
            <label for="mocap-mouth-action">口を開くとアクション</label>
        </div>
        <div class="radio-group" id="mouth-action-options" style="display:none;">
            <div class="radio-row">
                <input type="radio" name="mouth-action" id="mouth-action-move" value="move" checked>
                <label for="mouth-action-move">🚶 前に移動</label>
            </div>
            <div class="slider-row" id="mouth-move-speed-row">
                <label>👄 口移動速度 <span id="mocap-mouth-speed-val">10</span></label>
                <input type="range" id="mocap-mouth-speed" min="1" max="30" step="1" value="10">
            </div>
            <div class="radio-row">
                <input type="radio" name="mouth-action" id="mouth-action-shoot" value="shoot">
                <label for="mouth-action-shoot">🟡 弾を発射</label>
            </div>
            <div class="radio-group" id="shoot-mode-options" style="display:none; margin-left:20px;">
                <div class="radio-row">
                    <input type="radio" name="shoot-mode" id="shoot-mode-camera" value="camera" checked>
                    <label for="shoot-mode-camera">🎥 カメラ前方から</label>
                </div>
                <div class="radio-row">
                    <input type="radio" name="shoot-mode" id="shoot-mode-hand" value="hand">
                    <label for="shoot-mode-hand">✋ 右手の先から</label>
                </div>
                <div class="radio-row">
                    <input type="radio" name="shoot-mode" id="shoot-mode-wrist" value="wrist">
                    <label for="shoot-mode-wrist">🦾 手首先から（腕方向）</label>
                </div>
                <div class="help-text" style="font-size:9px; color:#888; margin:2px 0 6px 20px;">
                    手首先: 肘→手首の方向に発射
                </div>
            </div>
        </div>
        
        <div class="section-title">🏊 水泳モード</div>
        <div class="checkbox-row">
            <input type="checkbox" id="mocap-swim-mode">
            <label for="mocap-swim-mode">水泳モードを有効にする</label>
        </div>
        <div class="help-text" style="font-size:9px; color:#888; margin:-4px 0 6px 20px;">
            ↑ 前斜め上から後ろ斜め下に羽ばたく→前進<br>
            ↓ 後ろ斜め上から前斜め下に羽ばたく→後退<br>
            ←→ 手を横に漕ぐ→回転
        </div>
        <div class="slider-row" id="swim-settings" style="display:none;">
            <label>前後速度 <span id="mocap-swim-speed-val">8</span></label>
            <input type="range" id="mocap-swim-speed" min="1" max="20" step="1" value="8">
        </div>
        <div class="slider-row" id="swim-rotate-settings" style="display:none;">
            <label>回転速度 <span id="mocap-swim-rotate-val">2.5</span></label>
            <input type="range" id="mocap-swim-rotate" min="0.5" max="5" step="0.1" value="2.5">
        </div>
        
        <div class="section-title">💃 傾き移動</div>
        <div class="checkbox-row">
            <input type="checkbox" id="mocap-lean-move">
            <label for="mocap-lean-move">体の傾きで移動</label>
        </div>
        <div class="help-text" style="font-size:9px; color:#888; margin:-4px 0 6px 20px;">
            前傾→前進、後傾→後退
        </div>
        <div id="lean-settings" style="display:none;">
            <div class="slider-row">
                <label>移動速度 <span id="mocap-lean-speed-val">15</span></label>
                <input type="range" id="mocap-lean-speed" min="1" max="30" step="1" value="15">
            </div>
            <div class="slider-row">
                <label>デッドゾーン <span id="mocap-lean-deadzone-val">0.15</span></label>
                <input type="range" id="mocap-lean-deadzone" min="0.05" max="0.4" step="0.01" value="0.15">
            </div>
            <div class="help-text" style="font-size:9px; color:#888; margin:-4px 0 6px 20px;">
                ↑大きいほどまっすぐ時に静止しやすい
            </div>
            <div class="checkbox-row">
                <input type="checkbox" id="mocap-lean-invert">
                <label for="mocap-lean-invert">↔️ 方向を逆転</label>
            </div>
            <div class="help-text" style="font-size:9px; color:#888; margin:-4px 0 6px 20px;">
                前傾で後退してしまう場合はONに
            </div>
        </div>
        
        <div class="section-title">🚶 歩き検出</div>
        <div class="slider-row">
            <label>感度 <span id="mocap-walk-threshold-val">0.005</span></label>
            <input type="range" id="mocap-walk-threshold" min="0.001" max="0.05" step="0.001" value="0.005">
        </div>
        <div class="slider-row">
            <label>移動速度 <span id="mocap-walk-speed-val">6</span></label>
            <input type="range" id="mocap-walk-speed" min="1" max="15" step="0.5" value="6">
        </div>
        
        <div class="section-title">🦅 羽ばたき（上昇）</div>
        <div class="slider-row">
            <label>感度 <span id="mocap-flap-threshold-val">0.15</span></label>
            <input type="range" id="mocap-flap-threshold" min="0.05" max="0.5" step="0.01" value="0.15">
        </div>
        <div style="font-size:9px; color:#666; margin-top:-4px; margin-bottom:6px;">
            ※ 肩から手の相対移動量（m）。大きいほど大きな動きが必要
        </div>
        <div class="slider-row">
            <label>上昇速度 <span id="mocap-flap-speed-val">4</span></label>
            <input type="range" id="mocap-flap-speed" min="1" max="10" step="0.5" value="4">
        </div>
        
        <div class="section-title">↗️ 傾き移動</div>
        <div class="slider-row">
            <label>感度 <span id="mocap-lean-threshold-val">0.03</span></label>
            <input type="range" id="mocap-lean-threshold" min="0.01" max="0.3" step="0.01" value="0.03">
        </div>
        <div class="slider-row">
            <label>移動速度 <span id="mocap-lean-speed-val">8</span></label>
            <input type="range" id="mocap-lean-speed" min="1" max="15" step="0.5" value="8">
        </div>
        
        <div class="section-title">🔄 方向転換</div>
        <div class="slider-row">
            <label>感度 <span id="mocap-turn-threshold-val">0.1</span></label>
            <input type="range" id="mocap-turn-threshold" min="0.01" max="0.5" step="0.01" value="0.1">
        </div>
        <div class="slider-row">
            <label>回転速度 <span id="mocap-turn-speed-val">2.5</span></label>
            <input type="range" id="mocap-turn-speed" min="0.5" max="5" step="0.1" value="2.5">
        </div>
        
        <div class="section-title">⬇️ 落下</div>
        <div class="slider-row">
            <label>重力 <span id="mocap-gravity-val">9.82</span></label>
            <input type="range" id="mocap-gravity" min="1" max="30" step="0.5" value="9.82">
        </div>
        <div class="slider-row">
            <label>最大落下速度 <span id="mocap-max-fall-val">20</span></label>
            <input type="range" id="mocap-max-fall" min="5" max="50" step="1" value="20">
        </div>
        
        <div class="section-title">🎬 サードパーソン</div>
        <div class="slider-row">
            <label>距離 <span id="mocap-tp-distance-val">2.0</span></label>
            <input type="range" id="mocap-tp-distance" min="0.5" max="5" step="0.1" value="2.0">
        </div>
        <div class="slider-row">
            <label>高さオフセット <span id="mocap-tp-height-val">0</span></label>
            <input type="range" id="mocap-tp-height" min="-1" max="2" step="0.1" value="0">
        </div>
        <div class="slider-row">
            <label>追従スムージング <span id="mocap-tp-smoothing-val">0.1</span></label>
            <input type="range" id="mocap-tp-smoothing" min="0" max="0.5" step="0.05" value="0.1">
        </div>
        
        <div class="section-title">🎛️ その他</div>
        <div class="slider-row">
            <label>スムージング <span id="mocap-smoothing-val">0.2</span></label>
            <input type="range" id="mocap-smoothing" min="0" max="0.8" step="0.05" value="0.2">
        </div>
        
        <button id="mocap-reset-settings" style="
            width: 100%;
            padding: 8px;
            margin-top: 10px;
            background: #ff6b6b;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 12px;
            font-weight: bold;
        ">🔄 デフォルトに戻す</button>
    `;
    settingsToggle.parentNode.insertBefore(settingsPanel, settingsToggle.nextSibling);
    
    // 設定パネル展開/折りたたみ
    settingsToggle.addEventListener('click', function() {
        const panel = document.getElementById('mocap-settings-panel');
        if (panel.style.display === 'none') {
            panel.style.display = 'block';
            settingsToggle.textContent = '⚙️ モーキャプ設定 ▼';
        } else {
            panel.style.display = 'none';
            settingsToggle.textContent = '⚙️ モーキャプ設定';
        }
    });
    
    // サードパーソンボタンを追加
    const tpBtn = document.createElement('button');
    tpBtn.id = 'third-person-btn';
    tpBtn.textContent = '🎬 サードパーソン OFF';
    tpBtn.style.cssText = `
        width: 100%;
        padding: 6px;
        margin-bottom: 4px;
        background: linear-gradient(135deg, #667eea, #764ba2);
        color: white;
        border: none;
        border-radius: 6px;
        font-weight: bold;
        cursor: pointer;
        font-size: 10px;
    `;
    tpBtn.addEventListener('click', function() {
        window.toggleThirdPersonView();
    });
    settingsToggle.parentNode.insertBefore(tpBtn, settingsToggle);
    
    // スライダーイベント設定
    const sliderConfigs = [
        { id: 'mocap-walk-threshold', key: 'walkThreshold', decimals: 3 },
        { id: 'mocap-walk-speed', key: 'walkSpeed', decimals: 1 },
        { id: 'mocap-flap-threshold', key: 'flapThreshold', decimals: 2 },
        { id: 'mocap-flap-speed', key: 'flapLiftSpeed', decimals: 1 },
        { id: 'mocap-lean-threshold', key: 'leanThreshold', decimals: 2 },
        { id: 'mocap-lean-speed', key: 'leanMoveSpeed', decimals: 1 },
        { id: 'mocap-turn-threshold', key: 'turnThreshold', decimals: 2 },
        { id: 'mocap-turn-speed', key: 'turnSpeed', decimals: 1 },
        { id: 'mocap-gravity', key: 'gravity', decimals: 2 },
        { id: 'mocap-max-fall', key: 'maxFallSpeed', decimals: 0 },
        { id: 'mocap-smoothing', key: 'smoothing', decimals: 2 }
    ];
    
    // サードパーソン用スライダー
    const tpSliderConfigs = [
        { id: 'mocap-tp-distance', key: 'distance', decimals: 1 },
        { id: 'mocap-tp-height', key: 'heightOffset', decimals: 1 },
        { id: 'mocap-tp-smoothing', key: 'smoothing', decimals: 2 }
    ];
    
    tpSliderConfigs.forEach(cfg => {
        const slider = document.getElementById(cfg.id);
        const valEl = document.getElementById(cfg.id + '-val');
        if (slider && valEl) {
            slider.addEventListener('input', function() {
                const val = parseFloat(this.value);
                window.mocapMoveMode.thirdPerson[cfg.key] = val;
                valEl.textContent = val.toFixed(cfg.decimals);
            });
        }
    });
    
    sliderConfigs.forEach(cfg => {
        const slider = document.getElementById(cfg.id);
        const valEl = document.getElementById(cfg.id + '-val');
        if (slider && valEl) {
            slider.addEventListener('input', function() {
                const val = parseFloat(this.value);
                window.mocapMoveMode.config[cfg.key] = val;
                valEl.textContent = val.toFixed(cfg.decimals);
            });
        }
    });
    
    // デフォルトに戻すボタン
    document.getElementById('mocap-reset-settings').addEventListener('click', function() {
        const defaults = {
            walkThreshold: 0.005,
            walkSpeed: 6,
            flapThreshold: 0.15,
            flapLiftSpeed: 4,
            leanThreshold: 0.03,
            leanMoveSpeed: 8,
            turnThreshold: 0.1,
            turnSpeed: 2.5,
            gravity: 9.82,
            maxFallSpeed: 20,
            smoothing: 0.2
        };
        
        const tpDefaults = {
            distance: 2.0,
            heightOffset: 0,
            smoothing: 0.1
        };
        
        Object.assign(window.mocapMoveMode.config, defaults);
        Object.assign(window.mocapMoveMode.thirdPerson, tpDefaults);
        
        // スライダーも更新
        sliderConfigs.forEach(cfg => {
            const slider = document.getElementById(cfg.id);
            const valEl = document.getElementById(cfg.id + '-val');
            if (slider && valEl && defaults[cfg.key] !== undefined) {
                slider.value = defaults[cfg.key];
                valEl.textContent = defaults[cfg.key].toFixed(cfg.decimals);
            }
        });
        
        // サードパーソンスライダーも更新
        tpSliderConfigs.forEach(cfg => {
            const slider = document.getElementById(cfg.id);
            const valEl = document.getElementById(cfg.id + '-val');
            if (slider && valEl && tpDefaults[cfg.key] !== undefined) {
                slider.value = tpDefaults[cfg.key];
                valEl.textContent = tpDefaults[cfg.key].toFixed(cfg.decimals);
            }
        });
        
        console.log('🔄 モーキャプ設定をデフォルトに戻しました');
    });
    
    console.log('✅ モーキャプ移動ボタン＆設定パネル追加');
    
    // 口・手のひら操作のチェックボックスイベント
    const mouthHandRotateCheckbox = document.getElementById('mocap-mouth-hand-rotate');
    const mouthActionCheckbox = document.getElementById('mocap-mouth-action');
    const mouthActionOptions = document.getElementById('mouth-action-options');
    
    if (mouthHandRotateCheckbox) {
        mouthHandRotateCheckbox.addEventListener('change', function() {
            window.mocapMoveMode.mouthHandRotate = this.checked;
            console.log('👄 口＋手のひら回転:', this.checked ? 'ON' : 'OFF');
        });
    }
    
    if (mouthActionCheckbox && mouthActionOptions) {
        mouthActionCheckbox.addEventListener('change', function() {
            window.mocapMoveMode.mouthAction.enabled = this.checked;
            mouthActionOptions.style.display = this.checked ? 'block' : 'none';
            console.log('👄 口アクション:', this.checked ? 'ON' : 'OFF');
        });
    }
    
    // ラジオボタンのイベント（口アクションタイプ）
    const shootModeOptions = document.getElementById('shoot-mode-options');
    document.querySelectorAll('input[name="mouth-action"]').forEach(radio => {
        radio.addEventListener('change', function() {
            window.mocapMoveMode.mouthAction.type = this.value;
            console.log('👄 口アクションタイプ:', this.value === 'move' ? '前進' : '弾発射');
            
            // 弾発射が選択されたら発射モードオプションを表示
            if (shootModeOptions) {
                shootModeOptions.style.display = this.value === 'shoot' ? 'block' : 'none';
            }
        });
    });
    
    // 発射モードラジオボタンのイベント
    document.querySelectorAll('input[name="shoot-mode"]').forEach(radio => {
        radio.addEventListener('change', function() {
            window.mocapMoveMode.mouthAction.shootMode = this.value;
            const modeNames = { 'camera': 'カメラ前方', 'hand': '右手の先', 'wrist': '手首先' };
            console.log('🟡 発射モード:', modeNames[this.value] || this.value);
        });
    });
    
    // 口移動速度スライダーのイベント
    const mouthSpeedSlider = document.getElementById('mocap-mouth-speed');
    const mouthSpeedVal = document.getElementById('mocap-mouth-speed-val');
    if (mouthSpeedSlider && mouthSpeedVal) {
        mouthSpeedSlider.addEventListener('input', function() {
            const val = parseFloat(this.value);
            window.mocapMoveMode.config.mouthMoveSpeed = val;
            mouthSpeedVal.textContent = val.toFixed(0);
            console.log('👄 口移動速度:', val);
        });
    }
    
    // === 水泳モードのイベント ===
    const swimModeCheckbox = document.getElementById('mocap-swim-mode');
    const swimSettings = document.getElementById('swim-settings');
    const swimRotateSettings = document.getElementById('swim-rotate-settings');
    if (swimModeCheckbox) {
        swimModeCheckbox.addEventListener('change', function() {
            window.mocapMoveMode.config.swimModeEnabled = this.checked;
            if (swimSettings) swimSettings.style.display = this.checked ? 'block' : 'none';
            if (swimRotateSettings) swimRotateSettings.style.display = this.checked ? 'block' : 'none';
            console.log('🏊 水泳モード:', this.checked ? 'ON' : 'OFF');
        });
    }
    
    // 水泳前後速度スライダー
    const swimSpeedSlider = document.getElementById('mocap-swim-speed');
    const swimSpeedVal = document.getElementById('mocap-swim-speed-val');
    if (swimSpeedSlider && swimSpeedVal) {
        swimSpeedSlider.addEventListener('input', function() {
            const val = parseFloat(this.value);
            window.mocapMoveMode.config.swimMoveSpeed = val;
            swimSpeedVal.textContent = val.toFixed(0);
        });
    }
    
    // 水泳回転速度スライダー
    const swimRotateSlider = document.getElementById('mocap-swim-rotate');
    const swimRotateVal = document.getElementById('mocap-swim-rotate-val');
    if (swimRotateSlider && swimRotateVal) {
        swimRotateSlider.addEventListener('input', function() {
            const val = parseFloat(this.value);
            window.mocapMoveMode.config.swimRotateSpeed = val;
            swimRotateVal.textContent = val.toFixed(1);
        });
    }
    
    // === 傾き移動のイベント ===
    const leanMoveCheckbox = document.getElementById('mocap-lean-move');
    const leanSettings = document.getElementById('lean-settings');
    if (leanMoveCheckbox) {
        leanMoveCheckbox.addEventListener('change', function() {
            window.mocapMoveMode.config.leanMoveEnabled = this.checked;
            if (leanSettings) leanSettings.style.display = this.checked ? 'block' : 'none';
            console.log('💃 傾き移動:', this.checked ? 'ON' : 'OFF');
        });
    }
    
    // 傾き移動速度スライダー
    const leanSpeedSlider = document.getElementById('mocap-lean-speed');
    const leanSpeedVal = document.getElementById('mocap-lean-speed-val');
    if (leanSpeedSlider && leanSpeedVal) {
        leanSpeedSlider.addEventListener('input', function() {
            const val = parseFloat(this.value);
            window.mocapMoveMode.config.leanMoveSpeed = val;
            leanSpeedVal.textContent = val.toFixed(0);
        });
    }
    
    // 傾き移動デッドゾーンスライダー
    const leanDeadzoneSlider = document.getElementById('mocap-lean-deadzone');
    const leanDeadzoneVal = document.getElementById('mocap-lean-deadzone-val');
    if (leanDeadzoneSlider && leanDeadzoneVal) {
        leanDeadzoneSlider.addEventListener('input', function() {
            const val = parseFloat(this.value);
            window.mocapMoveMode.config.leanDeadzone = val;
            leanDeadzoneVal.textContent = val.toFixed(2);
            console.log('🟢 傾き移動デッドゾーン:', val.toFixed(2));
        });
    }
    
    // 傾き移動の方向逆転チェックボックス
    const leanInvertCheckbox = document.getElementById('mocap-lean-invert');
    if (leanInvertCheckbox) {
        leanInvertCheckbox.addEventListener('change', function() {
            window.mocapMoveMode.config.leanMoveInvert = this.checked;
            console.log('↔️ 傾き移動方向逆転:', this.checked ? 'ON' : 'OFF');
        });
    }
}, 3000);

// 物理ループにモーキャプ移動を統合
(function setupMocapMoveLoop() {
    function updateMocapMove() {
        // モーキャプ動き解析
        window.analyzeMocapMovement();
        
        // FPS移動に適用
        window.applyMocapMovement();
        
        // サードパーソン表示更新
        window.updateThirdPersonView();
        
        requestAnimationFrame(updateMocapMove);
    }
    
    setTimeout(function() {
        updateMocapMove();
        console.log('✅ モーキャプ移動ループ開始');
    }, 3500);
})();

/**
 * サードパーソン表示：モーキャプVRMをFPSカメラの前方に配置
 */
window.updateThirdPersonView = function() {
    const tp = window.mocapMoveMode.thirdPerson;
    if (!tp.enabled) return;
    if (!window.fpsMode) return;
    if (!window.vmcMocap) return;
    
    const mocapVRM = window.vmcMocap.getTargetVRM();
    if (!mocapVRM || !mocapVRM.scene) return;
    if (!window.app || !window.app.camera) return;
    if (!window.playerBody) return;
    
    const THREE = window.THREE;
    if (!THREE) return;
    
    const camera = window.app.camera;
    const yaw = window.fpsYaw || 0;
    
    // カメラの前方向を計算
    const forwardX = -Math.sin(yaw);
    const forwardZ = -Math.cos(yaw);
    
    // プレイヤー位置から前方に配置
    const targetX = window.playerBody.position.x + forwardX * tp.distance;
    const targetZ = window.playerBody.position.z + forwardZ * tp.distance;
    
    // 高さ計算：playerBody.position.yはカメラ（目線）の高さ
    // VRMは足元が原点なので、カメラ高さから1.65m引いて足元位置を計算
    const eyeHeight = 1.65;
    const targetY = window.playerBody.position.y - eyeHeight + tp.heightOffset;
    
    // スムージングで移動（ガクガクしないように）
    const s = tp.smoothing;
    mocapVRM.scene.position.x += (targetX - mocapVRM.scene.position.x) * (1 - s);
    mocapVRM.scene.position.y += (targetY - mocapVRM.scene.position.y) * (1 - s);
    mocapVRM.scene.position.z += (targetZ - mocapVRM.scene.position.z) * (1 - s);
    
    // VRMをカメラの方を向かせる（背中を見せる）
    mocapVRM.scene.rotation.y = yaw + Math.PI;
};

/**
 * サードパーソン表示を切り替え
 */
window.toggleThirdPersonView = function() {
    const tp = window.mocapMoveMode.thirdPerson;
    tp.enabled = !tp.enabled;
    
    const btn = document.getElementById('third-person-btn');
    if (btn) {
        if (tp.enabled) {
            btn.textContent = '🎬 サードパーソン ON';
            btn.style.background = 'linear-gradient(135deg, #00c853, #00e676)';
            console.log('🎬 サードパーソン表示 ON');
            console.log('  - モーキャプVRMがFPSカメラの前方に表示されます');
        } else {
            btn.textContent = '🎬 サードパーソン OFF';
            btn.style.background = 'linear-gradient(135deg, #667eea, #764ba2)';
            console.log('🎬 サードパーソン表示 OFF');
        }
    }
    
    return tp.enabled;
};

// デバッグ用：モーキャプ検出状態を表示
window.showMocapDebug = function() {
    const detected = window.mocapMoveMode.detected;
    const rawData = window.mocapMoveMode.rawData;
    const flying = window.mocapMoveMode.flying;
    const mouthHand = window.mocapMoveMode.mouthHand;
    console.log('🎭 モーキャプ検出状態:');
    console.log('  歩き強度:', detected.walking.toFixed(3));
    console.log('  羽ばたき強度:', detected.flapping.toFixed(3));
    console.log('  前傾:', detected.leanForward.toFixed(3));
    console.log('  頭ヨー:', (detected.headYaw * 180 / Math.PI).toFixed(1) + '°');
    console.log('  頭傾き:', (detected.headRoll * 180 / Math.PI).toFixed(1) + '°');
    console.log('  体ヨー:', (detected.bodyYaw * 180 / Math.PI).toFixed(1) + '°');
    console.log('  飛行中:', flying.isFlying, '垂直速度:', flying.verticalVelocity.toFixed(2));
    console.log('  --- 水泳モード ---');
    console.log('  水泳前後:', detected.swimForward.toFixed(3));
    console.log('  水泳回転:', detected.swimRotate.toFixed(3));
    console.log('  --- 口・手のひら ---');
    console.log('  口開度:', mouthHand.mouthOpen.toFixed(2));
    console.log('  左手開度:', mouthHand.leftHandOpen.toFixed(2));
    console.log('  右手開度:', mouthHand.rightHandOpen.toFixed(2));
    console.log('  --- ジェスチャー ---');
    console.log('  左手グー:', mouthHand.leftFist ? '✅' : '❌');
    console.log('  右手グー:', mouthHand.rightFist ? '✅' : '❌');
    console.log('  左手人差し指:', mouthHand.leftPointingFinger ? '✅' : '❌');
    console.log('  右手人差し指:', mouthHand.rightPointingFinger ? '✅' : '❌');
    console.log('  左手ピース:', mouthHand.leftPeace ? '✅' : '❌');
    console.log('  右手ピース:', mouthHand.rightPeace ? '✅' : '❌');
    console.log('  --- ジェスチャー制御 ---');
    const gestureControl = window.mocapMoveMode.gestureControl;
    console.log('  前フレーム両手グー:', gestureControl.prevBothFist ? '✅' : '❌');
    console.log('  静止モード:', gestureControl.freezeActive ? '✅' : '❌');
    console.log('  戻り中:', gestureControl.returnToStartActive ? '✅' : '❌');
    console.log('  --- 生データ ---');
    console.log('  hipsY:', rawData.hipsY.toFixed(4));
    console.log('  chestPitch:', (rawData.chestPitch * 180 / Math.PI).toFixed(2) + '°');
    console.log('  spinePitch:', (rawData.spinePitch * 180 / Math.PI).toFixed(2) + '°');
    console.log('  hipsPitch:', (rawData.hipsPitch * 180 / Math.PI).toFixed(2) + '°');
};

// 指の曲がり具合を詳細表示
window.debugFingerCurl = function() {
    if (!window.vmcMocap) {
        console.log('❌ VMCモーキャプが接続されていません');
        return;
    }
    
    const mocapVRM = window.vmcMocap.getTargetVRM();
    if (!mocapVRM || !mocapVRM.humanoid) {
        console.log('❌ モーキャプVRMが見つかりません');
        return;
    }
    
    const humanoid = mocapVRM.humanoid;
    const THREE = window.THREE;
    
    const getFingerCurl = (side, fingerName) => {
        const proximalName = `${side}${fingerName}Proximal`;
        const proximalBone = humanoid.getNormalizedBoneNode(proximalName);
        if (!proximalBone) {
            return { exists: false, curl: 0, name: proximalName };
        }
        
        const euler = new THREE.Euler();
        euler.setFromQuaternion(proximalBone.quaternion, 'XYZ');
        return { 
            exists: true, 
            curl: Math.abs(euler.x),
            x: euler.x,
            y: euler.y,
            z: euler.z,
            name: proximalName 
        };
    };
    
    console.log('=== 指の曲がり具合（生データ）===');
    console.log('閾値: 伸び < 0.3rad, 曲がり > 0.4rad');
    console.log('');
    
    const fingers = ['Index', 'Middle', 'Ring', 'Little'];
    const sides = ['left', 'right'];
    
    for (const side of sides) {
        console.log(`--- ${side === 'left' ? '左手' : '右手'} ---`);
        let allCurled = true;
        
        for (const finger of fingers) {
            const data = getFingerCurl(side, finger);
            if (!data.exists) {
                console.log(`  ${finger}: ボーンなし (${data.name})`);
                allCurled = false;
            } else {
                const curlRad = data.curl.toFixed(3);
                const curlDeg = (data.curl * 180 / Math.PI).toFixed(1);
                const status = data.curl > 0.4 ? '✅曲' : (data.curl < 0.3 ? '❌伸' : '⚠️中');
                console.log(`  ${finger}: ${curlRad}rad (${curlDeg}°) ${status}`);
                if (data.curl <= 0.4) allCurled = false;
            }
        }
        console.log(`  → グー判定: ${allCurled ? '✅ YES' : '❌ NO'}`);
    }
    
    // 現在のmouthHandの状態も表示
    const mouthHand = window.mocapMoveMode.mouthHand;
    console.log('');
    console.log('=== mouthHand状態 ===');
    console.log('  leftFist:', mouthHand.leftFist);
    console.log('  rightFist:', mouthHand.rightFist);
};

// 連続デバッグ表示（1秒ごと）
window.startMocapDebugLoop = function() {
    if (window._mocapDebugInterval) {
        clearInterval(window._mocapDebugInterval);
        window._mocapDebugInterval = null;
        console.log('🎭 デバッグ表示停止');
        return;
    }
    window._mocapDebugInterval = setInterval(() => {
        if (window.mocapMoveMode.enabled) {
            window.showMocapDebug();
        }
    }, 1000);
    console.log('🎭 デバッグ表示開始（もう一度呼ぶと停止）');
};

// ========================================
// モーキャプ設定保存/読み込み機能
// ========================================

// 現在の設定を取得
window.getMocapSettings = function() {
    const config = window.mocapMoveMode.config;
    const mouthHand = window.mocapMoveMode.mouthHand;
    const mouthAction = window.mocapMoveMode.mouthAction;
    const tp = window.mocapMoveMode.thirdPerson;
    
    return {
        version: 1,
        timestamp: new Date().toISOString(),
        config: { ...config },
        mouthHand: {
            mouthThreshold: mouthHand.mouthThreshold
        },
        mouthAction: {
            enabled: mouthAction.enabled,
            type: mouthAction.type,
            shootMode: mouthAction.shootMode
        },
        thirdPerson: {
            enabled: tp.enabled,
            distance: tp.distance,
            heightOffset: tp.heightOffset,
            smoothing: tp.smoothing
        },
        checkboxes: {
            mouthHandRotate: window.mocapMoveMode.mouthHandRotate || false,
            swimModeEnabled: config.swimModeEnabled || false,
            leanMoveEnabled: config.leanMoveEnabled || false,
            leanMoveInvert: config.leanMoveInvert || false
        }
    };
};

// 設定を適用
window.applyMocapSettings = function(settings) {
    if (!settings || !settings.config) {
        console.error('❌ 無効な設定データ');
        return false;
    }
    
    try {
        // configを適用
        Object.assign(window.mocapMoveMode.config, settings.config);
        
        // mouthHandを適用
        if (settings.mouthHand) {
            window.mocapMoveMode.mouthHand.mouthThreshold = settings.mouthHand.mouthThreshold;
        }
        
        // mouthActionを適用
        if (settings.mouthAction) {
            window.mocapMoveMode.mouthAction.enabled = settings.mouthAction.enabled;
            window.mocapMoveMode.mouthAction.type = settings.mouthAction.type;
            window.mocapMoveMode.mouthAction.shootMode = settings.mouthAction.shootMode || 'camera';
        }
        
        // thirdPersonを適用
        if (settings.thirdPerson) {
            window.mocapMoveMode.thirdPerson.enabled = settings.thirdPerson.enabled;
            window.mocapMoveMode.thirdPerson.distance = settings.thirdPerson.distance;
            window.mocapMoveMode.thirdPerson.heightOffset = settings.thirdPerson.heightOffset;
            window.mocapMoveMode.thirdPerson.smoothing = settings.thirdPerson.smoothing;
        }
        
        // checkboxesを適用
        if (settings.checkboxes) {
            window.mocapMoveMode.mouthHandRotate = settings.checkboxes.mouthHandRotate;
        }
        
        // UIを更新
        window.updateMocapSettingsUI();
        
        console.log('✅ モーキャプ設定を適用しました');
        return true;
    } catch (e) {
        console.error('❌ 設定適用エラー:', e);
        return false;
    }
};

// UIを現在の設定に合わせて更新
window.updateMocapSettingsUI = function() {
    const config = window.mocapMoveMode.config;
    const mouthAction = window.mocapMoveMode.mouthAction;
    const tp = window.mocapMoveMode.thirdPerson;
    
    // チェックボックス
    const checkboxes = [
        { id: 'mocap-mouth-hand-rotate', value: window.mocapMoveMode.mouthHandRotate },
        { id: 'mocap-mouth-action', value: mouthAction.enabled },
        { id: 'mocap-swim-mode', value: config.swimModeEnabled },
        { id: 'mocap-lean-move', value: config.leanMoveEnabled },
        { id: 'mocap-lean-invert', value: config.leanMoveInvert }
    ];
    
    checkboxes.forEach(cb => {
        const el = document.getElementById(cb.id);
        if (el) {
            el.checked = cb.value;
            el.dispatchEvent(new Event('change'));
        }
    });
    
    // ラジオボタン（口アクションタイプ）
    const radioEl = document.getElementById(mouthAction.type === 'move' ? 'mouth-action-move' : 'mouth-action-shoot');
    if (radioEl) radioEl.checked = true;
    
    // 発射モードラジオボタン
    const shootMode = mouthAction.shootMode || 'camera';
    const shootModeRadio = document.getElementById(`shoot-mode-${shootMode}`);
    if (shootModeRadio) shootModeRadio.checked = true;
    
    // 弾発射選択時のみオプション表示
    const shootModeOptions = document.getElementById('shoot-mode-options');
    if (shootModeOptions) {
        shootModeOptions.style.display = mouthAction.type === 'shoot' ? 'block' : 'none';
    }
    
    // スライダー
    const sliders = [
        { id: 'mocap-walk-threshold', valId: 'mocap-walk-threshold-val', value: config.walkThreshold, decimals: 3 },
        { id: 'mocap-walk-speed', valId: 'mocap-walk-speed-val', value: config.walkSpeed, decimals: 0 },
        { id: 'mocap-flap-threshold', valId: 'mocap-flap-threshold-val', value: config.flapThreshold, decimals: 2 },
        { id: 'mocap-flap-lift', valId: 'mocap-flap-lift-val', value: config.flapLiftSpeed, decimals: 1 },
        { id: 'mocap-lean-threshold', valId: 'mocap-lean-threshold-val', value: config.leanThreshold, decimals: 2 },
        { id: 'mocap-lean-speed', valId: 'mocap-lean-speed-val', value: config.leanMoveSpeed, decimals: 0 },
        { id: 'mocap-lean-deadzone', valId: 'mocap-lean-deadzone-val', value: config.leanDeadzone || 0.15, decimals: 2 },
        { id: 'mocap-turn-threshold', valId: 'mocap-turn-threshold-val', value: config.turnThreshold, decimals: 2 },
        { id: 'mocap-turn-speed', valId: 'mocap-turn-speed-val', value: config.turnSpeed, decimals: 1 },
        { id: 'mocap-gravity', valId: 'mocap-gravity-val', value: config.gravity, decimals: 2 },
        { id: 'mocap-max-fall', valId: 'mocap-max-fall-val', value: config.maxFallSpeed, decimals: 0 },
        { id: 'mocap-smoothing', valId: 'mocap-smoothing-val', value: config.smoothing, decimals: 2 },
        { id: 'mocap-mouth-speed', valId: 'mocap-mouth-speed-val', value: config.mouthMoveSpeed, decimals: 0 },
        { id: 'mocap-swim-speed', valId: 'mocap-swim-speed-val', value: config.swimMoveSpeed, decimals: 0 },
        { id: 'mocap-swim-rotate', valId: 'mocap-swim-rotate-val', value: config.swimRotateSpeed, decimals: 1 },
        { id: 'mocap-tp-distance', valId: 'mocap-tp-distance-val', value: tp.distance, decimals: 1 },
        { id: 'mocap-tp-height', valId: 'mocap-tp-height-val', value: tp.heightOffset, decimals: 1 },
        { id: 'mocap-tp-smoothing', valId: 'mocap-tp-smoothing-val', value: tp.smoothing, decimals: 2 }
    ];
    
    sliders.forEach(s => {
        const slider = document.getElementById(s.id);
        const valEl = document.getElementById(s.valId);
        if (slider) {
            slider.value = s.value;
            if (valEl) valEl.textContent = s.value.toFixed(s.decimals);
        }
    });
};

// スロットに保存
window.saveMocapPreset = function(slot) {
    const settings = window.getMocapSettings();
    const key = `mocapPreset_${slot}`;
    localStorage.setItem(key, JSON.stringify(settings));
    console.log(`💾 モーキャプ設定をスロット${slot}に保存しました`);
    return true;
};

// スロットから読み込み
window.loadMocapPreset = function(slot) {
    const key = `mocapPreset_${slot}`;
    const data = localStorage.getItem(key);
    if (!data) {
        console.warn(`⚠️ スロット${slot}に設定がありません`);
        return false;
    }
    try {
        const settings = JSON.parse(data);
        window.applyMocapSettings(settings);
        console.log(`📂 スロット${slot}から設定を読み込みました`);
        return true;
    } catch (e) {
        console.error('❌ 設定読み込みエラー:', e);
        return false;
    }
};

// JSONエクスポート
window.exportMocapSettings = function() {
    const settings = window.getMocapSettings();
    const json = JSON.stringify(settings, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mocap-settings-${new Date().toISOString().slice(0,10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    console.log('📤 モーキャプ設定をエクスポートしました');
};

// JSONインポート
window.importMocapSettings = function(file) {
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const settings = JSON.parse(e.target.result);
            if (window.applyMocapSettings(settings)) {
                console.log('📥 モーキャプ設定をインポートしました');
                const status = document.getElementById('mocap-preset-status');
                if (status) {
                    status.textContent = '✅ インポート完了';
                    setTimeout(() => status.textContent = '', 3000);
                }
            }
        } catch (e) {
            console.error('❌ JSONパースエラー:', e);
            alert('無効なJSONファイルです');
        }
    };
    reader.readAsText(file);
};

// 保存/読み込みUIのイベント設定
setTimeout(() => {
    // スロット保存
    const saveBtn = document.getElementById('mocap-save-slot');
    if (saveBtn) {
        saveBtn.addEventListener('click', function() {
            const slot = document.getElementById('mocap-preset-slot').value;
            if (window.saveMocapPreset(slot)) {
                const status = document.getElementById('mocap-preset-status');
                if (status) {
                    status.textContent = `✅ スロット${slot}に保存しました`;
                    setTimeout(() => status.textContent = '', 3000);
                }
            }
        });
    }
    
    // スロット読み込み
    const loadBtn = document.getElementById('mocap-load-slot');
    if (loadBtn) {
        loadBtn.addEventListener('click', function() {
            const slot = document.getElementById('mocap-preset-slot').value;
            if (window.loadMocapPreset(slot)) {
                const status = document.getElementById('mocap-preset-status');
                if (status) {
                    status.textContent = `✅ スロット${slot}から読み込みました`;
                    setTimeout(() => status.textContent = '', 3000);
                }
            } else {
                const status = document.getElementById('mocap-preset-status');
                if (status) {
                    status.textContent = `⚠️ スロット${slot}は空です`;
                    setTimeout(() => status.textContent = '', 3000);
                }
            }
        });
    }
    
    // JSONエクスポート
    const exportBtn = document.getElementById('mocap-export-json');
    if (exportBtn) {
        exportBtn.addEventListener('click', function() {
            window.exportMocapSettings();
            const status = document.getElementById('mocap-preset-status');
            if (status) {
                status.textContent = '✅ JSONエクスポート完了';
                setTimeout(() => status.textContent = '', 3000);
            }
        });
    }
    
    // JSONインポート
    const importBtn = document.getElementById('mocap-import-json');
    const importFile = document.getElementById('mocap-import-file');
    if (importBtn && importFile) {
        importBtn.addEventListener('click', function() {
            importFile.click();
        });
        importFile.addEventListener('change', function() {
            if (this.files && this.files[0]) {
                window.importMocapSettings(this.files[0]);
                this.value = ''; // リセット
            }
        });
    }
    
    console.log('✅ モーキャプ設定保存/読み込み機能を設定しました');
}, 3500);

console.log('✅ physics-system.js 読み込み完了（VRMコライダー + 環境コライダー + 地面切り替え + VRM落下 + モーキャプ移動機能付き）');