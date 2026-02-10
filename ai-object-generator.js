// ========================================
// AI オブジェクト生成システム v3
// Claude APIでリアルタイムに形状を判断！
// パーツは見た目だけ、物理は1つのボックスで囲む
// ========================================

console.log('🤖 AIオブジェクト生成システム v3 を読み込み中...');

// APIキー設定（UIから設定可能）
window.claudeApiKey = localStorage.getItem('claude_api_key') || '';

// AI生成オブジェクト（Claude API版）
window.spawnAIObject = async function(description) {
    console.log('🤖 AI生成:', description);
    
    // === サイズ解析 ===
    let size = 0.5;
    
    const meterMatch = description.match(/(\d+(?:\.\d+)?)\s*(?:メートル|m(?:\s|$|の))/i);
    if (meterMatch) size = parseFloat(meterMatch[1]);
    
    const cmMatch = description.match(/(\d+(?:\.\d+)?)\s*(?:センチ|cm)/i);
    if (cmMatch) size = parseFloat(cmMatch[1]) / 100;
    
    const mmMatch = description.match(/(\d+(?:\.\d+)?)\s*(?:ミリ|mm)/i);
    if (mmMatch) size = parseFloat(mmMatch[1]) / 1000;
    
    if (description.match(/巨大|めちゃくちゃ大きい|でかい|ばかでかい|超巨大/)) {
        size = size * 5;
    } else if (description.match(/大きい|大きな/)) {
        size = size * 2;
    } else if (description.match(/小さい|小さな|ちいさい|ミニ|ちっちゃい/)) {
        size = size * 0.5;
    } else if (description.match(/極小|めちゃくちゃ小さい|粒|豆粒/)) {
        size = size * 0.1;
    }
    
    // === 色解析 ===
    let color = null;
    
    if (description.includes('赤')) color = 0xff0000;
    else if (description.includes('青')) color = 0x0066ff;
    else if (description.includes('緑')) color = 0x00cc00;
    else if (description.includes('黄')) color = 0xffff00;
    else if (description.includes('紫')) color = 0x9900ff;
    else if (description.match(/オレンジ|橙/)) color = 0xff9900;
    else if (description.match(/ピンク|桃/)) color = 0xff66b2;
    else if (description.includes('白')) color = 0xffffff;
    else if (description.includes('黒')) color = 0x222222;
    else if (description.includes('茶')) color = 0x8b4513;
    else if (description.match(/金|ゴールド/)) color = 0xffd700;
    else if (description.match(/銀|シルバー/)) color = 0xc0c0c0;
    else if (description.match(/水色|シアン/)) color = 0x00ffff;
    else if (description.match(/レインボー|虹/)) color = 'random';
    
    // APIキーがなければフォールバック
    if (!window.claudeApiKey) {
        console.warn('⚠️ APIキーがないのでシンプルモードで生成');
        return spawnSimpleObject(description, size, color);
    }
    
    // UIに「考え中...」表示
    showThinkingIndicator(true);
    
    try {
        // Claude APIで形状を考えてもらう
        const parts = await askClaudeForShape(description);
        
        if (parts && parts.length > 0) {
            console.log('🎭 AIが考えた形状:', parts);
            return spawnCompositeObject(parts, size, color);
        } else {
            console.warn('⚠️ AI応答が空なのでシンプルモードで生成');
            return spawnSimpleObject(description, size, color);
        }
    } catch (error) {
        console.error('❌ AI生成エラー:', error);
        return spawnSimpleObject(description, size, color);
    } finally {
        showThinkingIndicator(false);
    }
};

// Claude APIに形状を聞く
async function askClaudeForShape(description) {
    const prompt = `あなたは3Dモデリングの専門家です。
「${description}」を3Dの基本形状の組み合わせで表現してください。

使える形状:
- sphere (球)
- box (箱)
- cylinder (円柱)
- cone (コーン)
- torus (ドーナツ)

以下のJSON配列形式で返してください。説明は不要です。JSONのみ返してください:
[
  {
    "type": "sphere",
    "offsetX": 0,
    "offsetY": 0.5,
    "offsetZ": 0,
    "scale": 1.0,
    "scaleX": 1.0,
    "scaleY": 1.0,
    "scaleZ": 1.0,
    "color": "#ff0000"
  }
]

ルール:
- offsetX/Y/Zは-1〜1の範囲（中心からの相対位置）
- scaleは0.1〜2.0の範囲（パーツのサイズ倍率）
- scaleX/Y/Zで縦横比を調整可能（省略可）
- colorは16進数カラーコード（その物体らしい色を選んで）
- パーツは2〜8個程度で簡潔に
- 特徴的な部分を強調して`;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-api-key': window.claudeApiKey,
            'anthropic-version': '2023-06-01',
            'anthropic-dangerous-direct-browser-access': 'true'
        },
        body: JSON.stringify({
            model: 'claude-sonnet-4-20250514',
            max_tokens: 1024,
            messages: [{
                role: 'user',
                content: prompt
            }]
        })
    });
    
    if (!response.ok) {
        const errorText = await response.text();
        console.error('API Error:', response.status, errorText);
        throw new Error(`API Error: ${response.status}`);
    }
    
    const data = await response.json();
    const text = data.content[0].text;
    
    console.log('📝 Claude応答:', text);
    
    // JSONを抽出
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
        const parts = JSON.parse(jsonMatch[0]);
        return parts.map(part => ({
            ...part,
            color: part.color ? parseInt(part.color.replace('#', ''), 16) : null
        }));
    }
    
    return null;
}

// ★★★ 複合オブジェクトを生成（物理は透明ボックスのみ） ★★★
function spawnCompositeObject(parts, baseSize, overrideColor) {
    const THREE = window.THREE;
    
    if (!THREE || !window.app || !window.app.scene || !window.physicsWorld) {
        console.error('❌ 物理システムが初期化されていません');
        return null;
    }
    
    const startX = (Math.random() - 0.5) * 4;
    const startZ = (Math.random() - 0.5) * 4;
    const startY = 4 + baseSize;
    
    // バウンディングボックス計算用
    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;
    let minZ = Infinity, maxZ = -Infinity;
    
    // 先にバウンディングボックスを計算
    parts.forEach((part) => {
        const partSize = baseSize * (part.scale || 1);
        const offsetX = (part.offsetX || 0) * baseSize;
        const offsetY = (part.offsetY || 0) * baseSize;
        const offsetZ = (part.offsetZ || 0) * baseSize;
        
        const halfSize = partSize / 2;
        const sx = part.scaleX || 1;
        const sy = part.scaleY || 1;
        const sz = part.scaleZ || 1;
        
        minX = Math.min(minX, offsetX - halfSize * sx);
        maxX = Math.max(maxX, offsetX + halfSize * sx);
        minY = Math.min(minY, offsetY - halfSize * sy);
        maxY = Math.max(maxY, offsetY + halfSize * sy);
        minZ = Math.min(minZ, offsetZ - halfSize * sz);
        maxZ = Math.max(maxZ, offsetZ + halfSize * sz);
    });
    
    // バウンディングボックスのサイズと中心
    const boxWidth = (maxX - minX) || baseSize;
    const boxHeight = (maxY - minY) || baseSize;
    const boxDepth = (maxZ - minZ) || baseSize;
    const boxCenterX = (maxX + minX) / 2;
    const boxCenterY = (maxY + minY) / 2;
    const boxCenterZ = (maxZ + minZ) / 2;
    
    // === 親グループ（空） ===
    const group = new THREE.Group();
    group.name = 'composite_' + Date.now();
    group.position.set(startX, startY, startZ);
    window.app.scene.add(group);
    
    // === 見た目のパーツを追加（物理なし！） ===
    parts.forEach((part) => {
        let partColor;
        if (overrideColor === 'random') {
            partColor = Math.random() * 0xffffff;
        } else if (overrideColor !== null) {
            partColor = overrideColor;
        } else {
            partColor = part.color || 0x888888;
        }
        
        const partSize = baseSize * (part.scale || 1);
        const offsetX = (part.offsetX || 0) * baseSize;
        const offsetY = (part.offsetY || 0) * baseSize;
        const offsetZ = (part.offsetZ || 0) * baseSize;
        
        let geometry;
        switch(part.type) {
            case 'sphere':
                geometry = new THREE.SphereGeometry(partSize / 2, 16, 16);
                break;
            case 'box':
                geometry = new THREE.BoxGeometry(partSize, partSize, partSize);
                break;
            case 'cylinder':
                geometry = new THREE.CylinderGeometry(partSize / 3, partSize / 3, partSize, 16);
                break;
            case 'cone':
                geometry = new THREE.ConeGeometry(partSize / 2, partSize, 16);
                break;
            case 'torus':
                geometry = new THREE.TorusGeometry(partSize / 2, partSize / 6, 8, 16);
                break;
            default:
                geometry = new THREE.BoxGeometry(partSize, partSize, partSize);
        }
        
        const material = new THREE.MeshStandardMaterial({ color: partColor });
        const mesh = new THREE.Mesh(geometry, material);
        mesh.castShadow = true;
        
        // グループの中心からの相対位置
        mesh.position.set(
            offsetX - boxCenterX,
            offsetY - boxCenterY,
            offsetZ - boxCenterZ
        );
        mesh.scale.set(
            part.scaleX || 1,
            part.scaleY || 1,
            part.scaleZ || 1
        );
        
        group.add(mesh);
    });
    
    // === Cannon.js: 物理ボディは1つだけ ===
    const shape = new CANNON.Box(new CANNON.Vec3(boxWidth / 2, boxHeight / 2, boxDepth / 2));
    const body = new CANNON.Body({
        mass: boxWidth * boxHeight * boxDepth * 0.5,
        shape: shape,
        position: new CANNON.Vec3(startX, startY, startZ)
    });
    window.physicsWorld.addBody(body);
    
    // === 同期用に登録 ===
    const obj = {
        mesh: group,
        body: body,
        type: 'composite',
        isComposite: true
    };
    window.physicsObjects.push(obj);
    
    console.log(`🎭 複合オブジェクト生成: ${parts.length}パーツ`);
    updateObjectCount();
    
    return obj;
}

// シンプルモード（APIなし）
function spawnSimpleObject(description, size, color) {
    let type = 'box';
    
    if (description.match(/ボール|球|丸/)) type = 'sphere';
    else if (description.match(/筒|円柱|缶|棒|柱/)) type = 'cylinder';
    else if (description.match(/ドーナツ|タイヤ|リング/)) type = 'torus';
    else if (description.match(/コーン|三角|ピラミッド/)) type = 'cone';
    
    const finalColor = color === 'random' ? Math.random() * 0xffffff : (color || 0x888888);
    return window.spawnPhysicsObject(type, null, finalColor, size);
}

// オブジェクト数更新（physics-system.jsの関数を呼ぶ）
function updateObjectCount() {
    const countEl = document.getElementById('object-count');
    if (countEl) {
        countEl.textContent = `オブジェクト: ${window.physicsObjects.length}`;
    }
}

// 考え中インジケーター
function showThinkingIndicator(show) {
    let indicator = document.getElementById('ai-thinking');
    
    if (show) {
        if (!indicator) {
            indicator = document.createElement('div');
            indicator.id = 'ai-thinking';
            indicator.innerHTML = `
                <div style="
                    position: fixed;
                    top: 50%;
                    left: 50%;
                    transform: translate(-50%, -50%);
                    background: rgba(0,0,0,0.8);
                    color: white;
                    padding: 20px 40px;
                    border-radius: 12px;
                    font-size: 18px;
                    z-index: 9999;
                    display: flex;
                    align-items: center;
                    gap: 12px;
                ">
                    <div class="spinner" style="
                        width: 24px;
                        height: 24px;
                        border: 3px solid #ffffff33;
                        border-top-color: #fff;
                        border-radius: 50%;
                        animation: spin 1s linear infinite;
                    "></div>
                    🤖 AIが形を考え中...
                </div>
                <style>
                    @keyframes spin {
                        to { transform: rotate(360deg); }
                    }
                </style>
            `;
            document.body.appendChild(indicator);
        }
    } else {
        if (indicator) {
            indicator.remove();
        }
    }
}

// APIキー設定UI
function createApiKeyUI() {
    const existingBtn = document.getElementById('api-key-btn');
    if (existingBtn) return;
    
    const checkPanel = setInterval(() => {
        const panel = document.querySelector('#physics-panel > div');
        if (panel) {
            clearInterval(checkPanel);
            
            const apiSection = document.createElement('div');
            apiSection.innerHTML = `
                <div style="margin-top: 12px; padding-top: 12px; border-top: 1px solid #e0e0e0;">
                    <button id="api-key-btn" style="
                        width: 100%;
                        padding: 8px;
                        background: ${window.claudeApiKey ? '#4CAF50' : '#ff9800'};
                        color: white;
                        border: none;
                        border-radius: 6px;
                        cursor: pointer;
                        font-size: 12px;
                    ">🔑 APIキー ${window.claudeApiKey ? '設定済み' : '未設定'}</button>
                </div>
            `;
            panel.appendChild(apiSection);
            
            document.getElementById('api-key-btn').addEventListener('click', () => {
                const key = prompt('Claude APIキーを入力:', window.claudeApiKey || '');
                if (key !== null) {
                    window.claudeApiKey = key;
                    localStorage.setItem('claude_api_key', key);
                    document.getElementById('api-key-btn').textContent = key ? '🔑 APIキー 設定済み' : '🔑 APIキー 未設定';
                    document.getElementById('api-key-btn').style.background = key ? '#4CAF50' : '#ff9800';
                }
            });
        }
    }, 500);
}

// 初期化
createApiKeyUI();

console.log('✅ ai-object-generator.js v3 読み込み完了');
