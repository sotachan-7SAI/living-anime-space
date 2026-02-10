// ========================================
// Tripo3D API で テキスト→3Dモデル生成
// GLBをロードして物理演算付きで空間に配置
// ========================================

console.log('🎨 Tripo3D 3Dモデル生成システムを読み込み中...');

// APIキー設定
window.tripoApiKey = localStorage.getItem('tripo_api_key') || '';

// GLBローダーを準備
let gltfLoader = null;

function initGLTFLoader() {
    if (gltfLoader) return;
    
    // main.jsから公開されたGLTFLoaderを待つ
    const checkLoader = setInterval(() => {
        if (window.GLTFLoaderClass) {
            clearInterval(checkLoader);
            gltfLoader = new window.GLTFLoaderClass();
            console.log('✅ GLTFLoader 準備完了');
        }
    }, 100);
    
    // 10秒でタイムアウト
    setTimeout(() => {
        clearInterval(checkLoader);
        if (!gltfLoader) {
            console.warn('⚠️ GLTFLoaderの初期化に時間がかかっています');
        }
    }, 10000);
}

// 初期化
setTimeout(initGLTFLoader, 1000);

// Tripo3Dで3Dモデル生成
window.generateTripo3D = async function(prompt) {
    if (!window.tripoApiKey) {
        alert('Tripo3D APIキーを設定してください！');
        return null;
    }
    
    console.log('🎨 Tripo3D生成開始:', prompt);
    showTripoProgress('生成タスクを作成中...', 0);
    
    try {
        // 1. タスク作成
        const taskId = await createTripoTask(prompt);
        if (!taskId) throw new Error('タスク作成失敗');
        
        console.log('📝 タスクID:', taskId);
        showTripoProgress('3Dモデルを生成中...', 10);
        
        // 2. 完了を待つ（ポーリング）
        const result = await waitForTripoTask(taskId);
        if (!result) throw new Error('生成失敗');
        
        console.log('✅ 生成完了:', result);
        showTripoProgress('モデルをダウンロード中...', 80);
        
        // 3. GLBをロードしてシーンに追加
        const obj = await loadTripoModel(result.glbUrl);
        
        showTripoProgress('完了！', 100);
        setTimeout(() => hideTripoProgress(), 1000);
        
        return obj;
        
    } catch (error) {
        console.error('❌ Tripo3Dエラー:', error);
        showTripoProgress('エラー: ' + error.message, -1);
        setTimeout(() => hideTripoProgress(), 3000);
        return null;
    }
};

// タスク作成（プロキシ経由）
async function createTripoTask(prompt) {
    const response = await fetch('http://localhost:8001/task', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            prompt: prompt,
            apiKey: window.tripoApiKey
        })
    });
    
    if (!response.ok) {
        const err = await response.text();
        console.error('API Error:', err);
        throw new Error('API呼び出し失敗（プロキシサーバー起動してる？）');
    }
    
    const data = await response.json();
    return data.data?.task_id;
}

// タスク完了待ち（プロキシ経由）
async function waitForTripoTask(taskId) {
    const maxAttempts = 60;
    
    for (let i = 0; i < maxAttempts; i++) {
        await sleep(2000);
        
        const response = await fetch(`http://localhost:8001/task/${taskId}`, {
            headers: {
                'Authorization': `Bearer ${window.tripoApiKey}`
            }
        });
        
        const data = await response.json();
        const status = data.data?.status;
        const progress = data.data?.progress || 0;
        
        console.log(`⏳ ステータス: ${status} (${progress}%)`);
        showTripoProgress(`生成中... ${progress}%`, 10 + progress * 0.7);
        
        if (status === 'success') {
            const output = data.data?.output;
            console.log('📦 出力データ:', output);
            // model または pbr_model をチェック
            const glbUrl = output?.model || output?.pbr_model;
            if (glbUrl) {
                return { glbUrl: glbUrl };
            }
        } else if (status === 'failed') {
            throw new Error('生成に失敗しました');
        }
    }
    
    throw new Error('タイムアウト');
}

// GLBモデルをロード（プロキシ経由でCORS回避）
async function loadTripoModel(glbUrl) {
    const THREE = window.THREE;
    
    console.log('📥 GLBロード開始:', glbUrl);
    
    // GLTFLoaderを取得
    let loader = gltfLoader;
    if (!loader && window.GLTFLoaderClass) {
        loader = new window.GLTFLoaderClass();
        console.log('🔧 GLTFLoaderClassから作成');
    }
    
    if (!loader) {
        hideTripoProgress();
        alert('GLTFLoaderがまだ準備できていません。\n少し待ってから再度お試しください。');
        throw new Error('GLTFLoaderが見つかりません');
    }
    
    // プロキシ経由でGLBを取得（CORS回避）
    console.log('📡 プロキシ経由でダウンロード中...');
    showTripoProgress('モデルをダウンロード中...', 85);
    
    const response = await fetch('http://localhost:8001/download-glb', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: glbUrl })
    });
    
    if (!response.ok) {
        throw new Error('GLBダウンロード失敗');
    }
    
    const arrayBuffer = await response.arrayBuffer();
    console.log('📦 GLBデータ取得:', arrayBuffer.byteLength, 'bytes');
    
    showTripoProgress('モデルを読み込み中...', 90);
    
    // ArrayBufferからGLBをパース
    return new Promise((resolve, reject) => {
        loader.parse(
            arrayBuffer,
            '',
            (gltf) => {
                console.log('📦 GLBパース完了!');
                
                const model = gltf.scene;
                
                // バウンディングボックスを計算
                const box = new THREE.Box3().setFromObject(model);
                const size = box.getSize(new THREE.Vector3());
                const center = box.getCenter(new THREE.Vector3());
                
                console.log('📏 サイズ:', size);
                
                // モデルを中心に移動
                model.position.sub(center);
                
                // サイズを正規化（1m程度に）
                const maxDim = Math.max(size.x, size.y, size.z);
                const scale = maxDim > 0 ? 1.0 / maxDim : 1.0;
                model.scale.setScalar(scale);
                
                const normalizedSize = {
                    x: size.x * scale,
                    y: size.y * scale,
                    z: size.z * scale
                };
                
                // グループで包む
                const group = new THREE.Group();
                group.add(model);
                group.name = 'tripo3d_' + Date.now();
                
                // 位置設定
                const startX = (Math.random() - 0.5) * 4;
                const startZ = (Math.random() - 0.5) * 4;
                const startY = 3;
                group.position.set(startX, startY, startZ);
                
                window.app.scene.add(group);
                console.log('✅ シーンに追加!');
                
                // 物理ボディ
                const physWidth = Math.max(0.3, normalizedSize.x);
                const physHeight = Math.max(0.3, normalizedSize.y);
                const physDepth = Math.max(0.3, normalizedSize.z);
                
                const shape = new CANNON.Box(new CANNON.Vec3(
                    physWidth / 2,
                    physHeight / 2,
                    physDepth / 2
                ));
                const body = new CANNON.Body({
                    mass: physWidth * physHeight * physDepth * 2,
                    shape: shape,
                    position: new CANNON.Vec3(startX, startY, startZ)
                });
                window.physicsWorld.addBody(body);
                
                const obj = {
                    mesh: group,
                    body: body,
                    type: 'tripo3d',
                    isComposite: true
                };
                window.physicsObjects.push(obj);
                
                const countEl = document.getElementById('object-count');
                if (countEl) {
                    countEl.textContent = `オブジェクト: ${window.physicsObjects.length}`;
                }
                
                console.log(`✅ Tripo3Dモデル配置完了!`);
                resolve(obj);
            },
            (error) => {
                console.error('GLBパースエラー:', error);
                reject(error);
            }
        );
    });
}

// ユーティリティ
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// GLBをArrayBufferから読み込んでシーンに追加
async function loadGLBFromArrayBuffer(arrayBuffer, fileName = 'model.glb') {
    const THREE = window.THREE;
    
    let loader = gltfLoader;
    if (!loader && window.GLTFLoaderClass) {
        loader = new window.GLTFLoaderClass();
    }
    
    if (!loader) {
        throw new Error('GLTFLoaderが見つかりません');
    }
    
    console.log('📦 GLBパース中:', arrayBuffer.byteLength, 'bytes');
    
    return new Promise((resolve, reject) => {
        loader.parse(
            arrayBuffer,
            '',
            (gltf) => {
                console.log('📦 GLBパース完了!');
                
                const model = gltf.scene;
                
                // バウンディングボックスを計算
                const box = new THREE.Box3().setFromObject(model);
                const size = box.getSize(new THREE.Vector3());
                const center = box.getCenter(new THREE.Vector3());
                
                console.log('📏 サイズ:', size);
                
                // モデルを中心に移動
                model.position.sub(center);
                
                // サイズを正規化（1m程度に）
                const maxDim = Math.max(size.x, size.y, size.z);
                const scale = maxDim > 0 ? 1.0 / maxDim : 1.0;
                model.scale.setScalar(scale);
                
                const normalizedSize = {
                    x: size.x * scale,
                    y: size.y * scale,
                    z: size.z * scale
                };
                
                // グループで包む
                const group = new THREE.Group();
                group.add(model);
                group.name = 'glb_' + Date.now();
                
                // 位置設定
                const startX = (Math.random() - 0.5) * 4;
                const startZ = (Math.random() - 0.5) * 4;
                const startY = 3;
                group.position.set(startX, startY, startZ);
                
                window.app.scene.add(group);
                console.log('✅ シーンに追加!');
                
                // 物理ボディ
                const physWidth = Math.max(0.3, normalizedSize.x);
                const physHeight = Math.max(0.3, normalizedSize.y);
                const physDepth = Math.max(0.3, normalizedSize.z);
                
                const shape = new CANNON.Box(new CANNON.Vec3(
                    physWidth / 2,
                    physHeight / 2,
                    physDepth / 2
                ));
                const body = new CANNON.Body({
                    mass: physWidth * physHeight * physDepth * 2,
                    shape: shape,
                    position: new CANNON.Vec3(startX, startY, startZ)
                });
                window.physicsWorld.addBody(body);
                
                const obj = {
                    mesh: group,
                    body: body,
                    type: 'glb',
                    fileName: fileName,
                    isComposite: true
                };
                window.physicsObjects.push(obj);
                
                const countEl = document.getElementById('object-count');
                if (countEl) {
                    countEl.textContent = `オブジェクト: ${window.physicsObjects.length}`;
                }
                
                console.log(`✅ GLBモデル配置完了: ${fileName}`);
                resolve(obj);
            },
            (error) => {
                console.error('GLBパースエラー:', error);
                reject(error);
            }
        );
    });
}

// FBXをArrayBufferから読み込んでシーンに追加
async function loadFBXFromArrayBuffer(arrayBuffer, fileName = 'model.fbx') {
    const THREE = window.THREE;
    
    // FBXLoaderを取得
    const FBXLoader = window.FBXLoaderClass;
    if (!FBXLoader) {
        throw new Error('FBXLoaderが見つかりません');
    }
    
    const loader = new FBXLoader();
    
    console.log('📦 FBXパース中:', arrayBuffer.byteLength, 'bytes');
    
    // ArrayBufferからBlob URLを作成してロード
    const blob = new Blob([arrayBuffer], { type: 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    
    return new Promise((resolve, reject) => {
        loader.load(
            url,
            (fbx) => {
                URL.revokeObjectURL(url);
                console.log('📦 FBXパース完了!');
                
                const model = fbx;
                
                // バウンディングボックスを計算
                const box = new THREE.Box3().setFromObject(model);
                const size = box.getSize(new THREE.Vector3());
                const center = box.getCenter(new THREE.Vector3());
                
                console.log('📏 サイズ:', size);
                
                // モデルを中心に移動
                model.position.sub(center);
                
                // サイズを正規化（1m程度に）
                const maxDim = Math.max(size.x, size.y, size.z);
                const scale = maxDim > 0 ? 1.0 / maxDim : 1.0;
                model.scale.setScalar(scale);
                
                const normalizedSize = {
                    x: size.x * scale,
                    y: size.y * scale,
                    z: size.z * scale
                };
                
                // グループで包む
                const group = new THREE.Group();
                group.add(model);
                group.name = 'fbx_' + Date.now();
                
                // 位置設定
                const startX = (Math.random() - 0.5) * 4;
                const startZ = (Math.random() - 0.5) * 4;
                const startY = 3;
                group.position.set(startX, startY, startZ);
                
                window.app.scene.add(group);
                console.log('✅ FBXシーンに追加!');
                
                // 物理ボディ
                const physWidth = Math.max(0.3, normalizedSize.x);
                const physHeight = Math.max(0.3, normalizedSize.y);
                const physDepth = Math.max(0.3, normalizedSize.z);
                
                const shape = new CANNON.Box(new CANNON.Vec3(
                    physWidth / 2,
                    physHeight / 2,
                    physDepth / 2
                ));
                const body = new CANNON.Body({
                    mass: physWidth * physHeight * physDepth * 2,
                    shape: shape,
                    position: new CANNON.Vec3(startX, startY, startZ)
                });
                window.physicsWorld.addBody(body);
                
                const obj = {
                    mesh: group,
                    body: body,
                    type: 'fbx',
                    fileName: fileName,
                    isComposite: true
                };
                window.physicsObjects.push(obj);
                
                const countEl = document.getElementById('object-count');
                if (countEl) {
                    countEl.textContent = `オブジェクト: ${window.physicsObjects.length}`;
                }
                
                console.log(`✅ FBXモデル配置完了: ${fileName}`);
                resolve(obj);
            },
            (progress) => {
                if (progress.total > 0) {
                    const percent = Math.round((progress.loaded / progress.total) * 100);
                    console.log(`📦 FBX読み込み中: ${percent}%`);
                }
            },
            (error) => {
                URL.revokeObjectURL(url);
                console.error('FBXパースエラー:', error);
                reject(error);
            }
        );
    });
}

// グローバルに公開
window.loadGLBFromArrayBuffer = loadGLBFromArrayBuffer;
window.loadFBXFromArrayBuffer = loadFBXFromArrayBuffer;

// プログレス表示
function showTripoProgress(message, percent) {
    let el = document.getElementById('tripo-progress');
    
    if (!el) {
        el = document.createElement('div');
        el.id = 'tripo-progress';
        el.innerHTML = `
            <div style="
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background: rgba(0,0,0,0.9);
                color: white;
                padding: 24px 40px;
                border-radius: 16px;
                font-size: 16px;
                z-index: 10000;
                min-width: 300px;
                text-align: center;
            ">
                <div style="margin-bottom: 12px;">🎨 Tripo3D</div>
                <div id="tripo-message" style="margin-bottom: 16px;"></div>
                <div style="background: #333; border-radius: 8px; height: 8px; overflow: hidden;">
                    <div id="tripo-bar" style="background: #4CAF50; height: 100%; width: 0%; transition: width 0.3s;"></div>
                </div>
            </div>
        `;
        document.body.appendChild(el);
    }
    
    document.getElementById('tripo-message').textContent = message;
    document.getElementById('tripo-bar').style.width = Math.max(0, percent) + '%';
    
    if (percent < 0) {
        document.getElementById('tripo-bar').style.background = '#f44336';
    } else {
        document.getElementById('tripo-bar').style.background = '#4CAF50';
    }
}

function hideTripoProgress() {
    const el = document.getElementById('tripo-progress');
    if (el) el.remove();
}

// UI追加
function createTripoUI() {
    const checkPanel = setInterval(() => {
        const panel = document.querySelector('#physics-panel > div');
        if (panel && !document.getElementById('tripo-section')) {
            clearInterval(checkPanel);
            
            const section = document.createElement('div');
            section.id = 'tripo-section';
            section.innerHTML = `
                <div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid #e0e0e0;">
                    <div style="font-weight: bold; margin-bottom: 6px; color: #333; font-size: 10px;">🎨 Tripo3D生成</div>
                    <input type="text" id="tripo-prompt" placeholder="日本の太った女性アイドル" style="
                        width: 100%;
                        padding: 6px;
                        border: 1px solid #ddd;
                        border-radius: 6px;
                        margin-bottom: 6px;
                        box-sizing: border-box;
                        font-size: 10px;
                    ">
                    <button id="tripo-generate-btn" style="
                        width: 100%;
                        padding: 6px;
                        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                        color: white;
                        border: none;
                        border-radius: 6px;
                        cursor: pointer;
                        font-weight: bold;
                        font-size: 10px;
                    ">🚀 3Dモデル生成</button>
                    <button id="tripo-key-btn" style="
                        width: 100%;
                        padding: 4px;
                        margin-top: 4px;
                        background: ${window.tripoApiKey ? '#4CAF50' : '#ff9800'};
                        color: white;
                        border: none;
                        border-radius: 6px;
                        cursor: pointer;
                        font-size: 9px;
                    ">🔑 APIキー ${window.tripoApiKey ? '設定済み' : '未設定'}</button>
                    
                    <!-- GLB/FBXファイル読み込み -->
                    <div style="margin-top: 8px; padding-top: 8px; border-top: 1px dashed #ccc;">
                        <div style="font-size: 9px; color: #666; margin-bottom: 4px;">📁 3Dファイルを直接読み込み</div>
                        <input type="file" id="glb-file-input" accept=".glb,.gltf" style="display: none;">
                        <button id="glb-load-btn" style="
                            width: 100%;
                            padding: 6px;
                            background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%);
                            color: white;
                            border: none;
                            border-radius: 6px;
                            cursor: pointer;
                            font-weight: bold;
                            font-size: 10px;
                        ">📦 GLBファイルを選択</button>
                        <input type="file" id="fbx-file-input" accept=".fbx" style="display: none;">
                        <button id="fbx-load-btn" style="
                            width: 100%;
                            padding: 6px;
                            margin-top: 4px;
                            background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
                            color: white;
                            border: none;
                            border-radius: 6px;
                            cursor: pointer;
                            font-weight: bold;
                            font-size: 10px;
                        ">📦 FBXファイルを選択</button>
                    </div>
                </div>
            `;
            panel.appendChild(section);
            
            // イベント
            document.getElementById('tripo-generate-btn').addEventListener('click', () => {
                const prompt = document.getElementById('tripo-prompt').value.trim();
                if (prompt) {
                    window.generateTripo3D(prompt);
                }
            });
            
            document.getElementById('tripo-prompt').addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    const prompt = e.target.value.trim();
                    if (prompt) {
                        window.generateTripo3D(prompt);
                    }
                }
            });
            
            document.getElementById('tripo-key-btn').addEventListener('click', () => {
                const key = prompt('Tripo3D APIキーを入力:', window.tripoApiKey || '');
                if (key !== null) {
                    window.tripoApiKey = key;
                    localStorage.setItem('tripo_api_key', key);
                    document.getElementById('tripo-key-btn').textContent = key ? '🔑 APIキー 設定済み' : '🔑 APIキー 未設定';
                    document.getElementById('tripo-key-btn').style.background = key ? '#4CAF50' : '#ff9800';
                }
            });
            
            // GLBファイル読み込み
            document.getElementById('glb-load-btn').addEventListener('click', () => {
                document.getElementById('glb-file-input').click();
            });
            
            document.getElementById('glb-file-input').addEventListener('change', async (e) => {
                const file = e.target.files[0];
                if (file) {
                    console.log('📦 GLBファイル読み込み:', file.name);
                    showTripoProgress('GLBファイルを読み込み中...', 50);
                    
                    try {
                        const arrayBuffer = await file.arrayBuffer();
                        const obj = await loadGLBFromArrayBuffer(arrayBuffer, file.name);
                        showTripoProgress('完了！', 100);
                        setTimeout(() => hideTripoProgress(), 1000);
                    } catch (error) {
                        console.error('❌ GLB読み込みエラー:', error);
                        showTripoProgress('エラー: ' + error.message, -1);
                        setTimeout(() => hideTripoProgress(), 3000);
                    }
                    
                    // ファイル入力をリセット
                    e.target.value = '';
                }
            });
            
            // FBXファイル読み込み
            document.getElementById('fbx-load-btn').addEventListener('click', () => {
                document.getElementById('fbx-file-input').click();
            });
            
            document.getElementById('fbx-file-input').addEventListener('change', async (e) => {
                const file = e.target.files[0];
                if (file) {
                    console.log('📦 FBXファイル読み込み:', file.name);
                    showTripoProgress('FBXファイルを読み込み中...', 50);
                    
                    try {
                        const arrayBuffer = await file.arrayBuffer();
                        const obj = await loadFBXFromArrayBuffer(arrayBuffer, file.name);
                        showTripoProgress('完了！', 100);
                        setTimeout(() => hideTripoProgress(), 1000);
                    } catch (error) {
                        console.error('❌ FBX読み込みエラー:', error);
                        showTripoProgress('エラー: ' + error.message, -1);
                        setTimeout(() => hideTripoProgress(), 3000);
                    }
                    
                    // ファイル入力をリセット
                    e.target.value = '';
                }
            });
        }
    }, 500);
}

createTripoUI();

console.log('✅ tripo3d-generator.js 読み込み完了');
