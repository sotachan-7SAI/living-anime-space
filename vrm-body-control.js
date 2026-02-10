// ========================================
// VRM Body Control System v1.0
// 服の着脱、ボーンスケール（体型調整）、モーフ操作
// Grok Voice Function Calling 対応
// ========================================

class VRMBodyController {
    constructor() {
        this.vrm = null;
        this.meshParts = [];     // 検出されたメッシュパーツ
        this.boneList = [];      // 操作可能なボーン
        this.panel = null;
        this.isMinimized = false;
        
        // ボーン定義（日本語名付き）
        this.boneDefinitions = {
            head:          { label: '🗣️ 頭', defaultScale: [1,1,1] },
            neck:          { label: '首', defaultScale: [1,1,1] },
            chest:         { label: '👕 胸', defaultScale: [1,1,1] },
            upperChest:    { label: '上胸', defaultScale: [1,1,1] },
            spine:         { label: '背骨', defaultScale: [1,1,1] },
            hips:          { label: '🦴 腰', defaultScale: [1,1,1] },
            leftUpperArm:  { label: '左上腕', defaultScale: [1,1,1] },
            rightUpperArm: { label: '右上腕', defaultScale: [1,1,1] },
            leftLowerArm:  { label: '左前腕', defaultScale: [1,1,1] },
            rightLowerArm: { label: '右前腕', defaultScale: [1,1,1] },
            leftHand:      { label: '✋ 左手', defaultScale: [1,1,1] },
            rightHand:     { label: '✋ 右手', defaultScale: [1,1,1] },
            leftUpperLeg:  { label: '左太もも', defaultScale: [1,1,1] },
            rightUpperLeg: { label: '右太もも', defaultScale: [1,1,1] },
            leftLowerLeg:  { label: '左すね', defaultScale: [1,1,1] },
            rightLowerLeg: { label: '右すね', defaultScale: [1,1,1] },
            leftFoot:      { label: '👟 左足', defaultScale: [1,1,1] },
            rightFoot:     { label: '👟 右足', defaultScale: [1,1,1] },
            leftShoulder:  { label: '左肩', defaultScale: [1,1,1] },
            rightShoulder: { label: '右肩', defaultScale: [1,1,1] },
        };
        
        // プリセット体型
        this.bodyPresets = {
            'normal': { label: '🧍 標準', bones: {} },
            'chibi': { 
                label: '🍼 ちびキャラ', 
                bones: { head: [1.8, 1.8, 1.8], chest: [0.8, 0.8, 0.8], hips: [0.8, 0.8, 0.8], 
                         leftUpperLeg: [0.7, 0.7, 0.7], rightUpperLeg: [0.7, 0.7, 0.7],
                         leftUpperArm: [0.8, 0.8, 0.8], rightUpperArm: [0.8, 0.8, 0.8] }
            },
            'bigHead': {
                label: '🎃 頭でっかち',
                bones: { head: [2.5, 2.5, 2.5] }
            },
            'tinyHead': {
                label: '🤏 小顔',
                bones: { head: [0.6, 0.6, 0.6] }
            },
            'longLegs': {
                label: '🦵 脚長',
                bones: { leftUpperLeg: [1, 1.4, 1], rightUpperLeg: [1, 1.4, 1],
                         leftLowerLeg: [1, 1.3, 1], rightLowerLeg: [1, 1.3, 1] }
            },
            'buff': {
                label: '💪 マッチョ',
                bones: { chest: [1.4, 1.1, 1.3], upperChest: [1.3, 1, 1.2],
                         leftUpperArm: [1.5, 1, 1.5], rightUpperArm: [1.5, 1, 1.5],
                         leftShoulder: [1.3, 1.3, 1.3], rightShoulder: [1.3, 1.3, 1.3] }
            },
            'slim': {
                label: '🩰 スリム',
                bones: { chest: [0.8, 1, 0.8], hips: [0.85, 1, 0.85],
                         leftUpperArm: [0.8, 1, 0.8], rightUpperArm: [0.8, 1, 0.8],
                         leftUpperLeg: [0.85, 1, 0.85], rightUpperLeg: [0.85, 1, 0.85] }
            },
            'alien': {
                label: '👽 宇宙人',
                bones: { head: [1.6, 2.0, 1.6], neck: [1, 1.5, 1], 
                         chest: [0.7, 0.7, 0.7], hips: [0.6, 0.6, 0.6],
                         leftUpperArm: [0.6, 1.3, 0.6], rightUpperArm: [0.6, 1.3, 0.6] }
            }
        };
        
        console.log('👗 VRM Body Controller 初期化');
    }
    
    // ============================
    // VRM スキャン
    // ============================
    
    scanVRM(vrm) {
        this.vrm = vrm || window.app?.vrm;
        if (!this.vrm) {
            console.warn('👗 VRMが見つかりません');
            return;
        }
        
        this.meshParts = [];
        this.boneList = [];
        
        // メッシュパーツをスキャン
        this.vrm.scene.traverse(child => {
            if (child.isMesh) {
                const mats = Array.isArray(child.material) ? child.material : [child.material];
                const mainMat = mats[0];
                const matName = mainMat?.name || '';
                
                // カテゴリ分類
                let category = 'other';
                if (matName.includes('CLOTH')) category = 'clothing';
                else if (matName.includes('SKIN')) category = 'skin';
                else if (matName.includes('HAIR')) category = 'hair';
                else if (matName.includes('EYE')) category = 'eye';
                else if (matName.includes('FACE')) category = 'face';
                
                // 短い表示名を生成
                let displayName = matName.replace(/ \(Instance\).*/, '').replace(/^N\d+_\d+_\d+_/, '');
                
                this.meshParts.push({
                    mesh: child,
                    name: child.name,
                    displayName,
                    materialName: matName,
                    category,
                    materials: mats,
                    originalOpacity: mainMat?.opacity ?? 1,
                    originalVisible: child.visible
                });
            }
        });
        
        // ボーンをスキャン
        if (this.vrm.humanoid) {
            for (const [boneName, def] of Object.entries(this.boneDefinitions)) {
                const bone = this.vrm.humanoid.getRawBoneNode(boneName);
                if (bone) {
                    this.boneList.push({
                        name: boneName,
                        label: def.label,
                        bone,
                        defaultScale: [1, 1, 1]
                    });
                }
            }
        }
        
        console.log(`👗 VRMスキャン完了: メッシュ${this.meshParts.length}個、ボーン${this.boneList.length}個`);
        return { meshCount: this.meshParts.length, boneCount: this.boneList.length };
    }
    
    // ============================
    // メッシュ操作（服の着脱）
    // ============================
    
    setMeshOpacity(meshNameOrCategory, opacity) {
        if (!this.vrm) return { success: false, error: 'VRM未読み込み' };
        
        let affected = 0;
        const target = meshNameOrCategory.toLowerCase();
        
        this.meshParts.forEach(part => {
            const matchName = part.displayName.toLowerCase().includes(target) || 
                             part.materialName.toLowerCase().includes(target) ||
                             part.name.toLowerCase().includes(target);
            const matchCategory = part.category === target;
            
            if (matchName || matchCategory) {
                part.materials.forEach(mat => {
                    mat.transparent = true;
                    mat.opacity = opacity;
                    mat.needsUpdate = true;
                });
                part.mesh.visible = opacity > 0.01;
                affected++;
            }
        });
        
        const result = { success: affected > 0, affectedMeshes: affected, opacity };
        console.log(`👗 setMeshOpacity("${meshNameOrCategory}", ${opacity}):`, result);
        
        // UI更新
        this.updatePanelValues();
        
        return result;
    }
    
    toggleClothing(visible) {
        return this.setMeshOpacity('clothing', visible ? 1 : 0);
    }
    
    // ============================
    // ボーンスケール操作（体型調整）
    // ============================
    
    setBoneScale(boneName, scaleX, scaleY, scaleZ) {
        if (!this.vrm || !this.vrm.humanoid) return { success: false, error: 'VRM未読み込み' };
        
        // 統一スケール（数値1つの場合）
        if (scaleY === undefined) { scaleY = scaleX; scaleZ = scaleX; }
        if (scaleZ === undefined) { scaleZ = scaleY; }
        
        const bone = this.vrm.humanoid.getRawBoneNode(boneName);
        if (!bone) return { success: false, error: `ボーン "${boneName}" が見つかりません` };
        
        // クランプ
        scaleX = Math.max(0.1, Math.min(5.0, scaleX));
        scaleY = Math.max(0.1, Math.min(5.0, scaleY));
        scaleZ = Math.max(0.1, Math.min(5.0, scaleZ));
        
        bone.scale.set(scaleX, scaleY, scaleZ);
        
        const result = { success: true, bone: boneName, scale: { x: scaleX, y: scaleY, z: scaleZ } };
        console.log(`🦴 setBoneScale("${boneName}", ${scaleX}, ${scaleY}, ${scaleZ}):`, result);
        
        this.updatePanelValues();
        return result;
    }
    
    // 複数ボーンを一括設定
    setMultipleBoneScales(boneScales) {
        const results = [];
        for (const [boneName, scale] of Object.entries(boneScales)) {
            const [x, y, z] = Array.isArray(scale) ? scale : [scale, scale, scale];
            results.push(this.setBoneScale(boneName, x, y, z));
        }
        return results;
    }
    
    // プリセット適用
    applyBodyPreset(presetName) {
        const preset = this.bodyPresets[presetName];
        if (!preset) return { success: false, error: `プリセット "${presetName}" が見つかりません` };
        
        // まず全ボーンをリセット
        this.resetAllBones();
        
        // プリセットのボーンを適用
        if (preset.bones) {
            this.setMultipleBoneScales(preset.bones);
        }
        
        console.log(`🎭 プリセット適用: ${preset.label}`);
        return { success: true, preset: presetName, label: preset.label };
    }
    
    // 全ボーンリセット
    resetAllBones() {
        this.boneList.forEach(b => {
            b.bone.scale.set(1, 1, 1);
        });
        this.updatePanelValues();
        console.log('🦴 全ボーンリセット');
    }
    
    // 全メッシュリセット
    resetAllMeshes() {
        this.meshParts.forEach(part => {
            part.materials.forEach(mat => {
                mat.opacity = part.originalOpacity;
                mat.transparent = part.originalOpacity < 1;
                mat.needsUpdate = true;
            });
            part.mesh.visible = part.originalVisible;
        });
        this.updatePanelValues();
        console.log('👗 全メッシュリセット');
    }
    
    // ============================
    // 現在の状態を取得（Grok用）
    // ============================
    
    getCurrentState() {
        const clothing = {};
        this.meshParts.filter(p => p.category === 'clothing').forEach(p => {
            clothing[p.displayName] = {
                visible: p.mesh.visible,
                opacity: p.materials[0]?.opacity ?? 1
            };
        });
        
        const bones = {};
        this.boneList.forEach(b => {
            if (b.bone.scale.x !== 1 || b.bone.scale.y !== 1 || b.bone.scale.z !== 1) {
                bones[b.name] = {
                    label: b.label,
                    scale: { x: +b.bone.scale.x.toFixed(2), y: +b.bone.scale.y.toFixed(2), z: +b.bone.scale.z.toFixed(2) }
                };
            }
        });
        
        return { clothing, modifiedBones: bones };
    }
    
    // ============================
    // Grok Voice Function Call ツール定義
    // ============================
    
    getGrokToolDefinitions() {
        // 利用可能な服パーツ名一覧
        const clothingParts = this.meshParts
            .filter(p => p.category === 'clothing')
            .map(p => p.displayName);
        
        // ボーン名一覧
        const boneNames = this.boneList.map(b => `${b.name}(${b.label})`);
        
        // プリセット名一覧
        const presetNames = Object.entries(this.bodyPresets).map(([k, v]) => `${k}(${v.label})`);
        
        return [
            {
                type: 'function',
                name: 'change_clothing',
                description: `自分の服や装備パーツの着脱・透明度を変更する。opacityを0にすると脱ぐ/非表示、1にすると着る/表示。中間値で半透明。利用可能な服パーツ: ${clothingParts.join(', ')}。"clothing"で服を全部まとめて操作も可能。`,
                parameters: {
                    type: 'object',
                    properties: {
                        target: { 
                            type: 'string', 
                            description: '操作対象。服パーツ名（例: Tops_01_CLOTH）または "clothing" で服全体'
                        },
                        opacity: { 
                            type: 'number', 
                            description: '0.0（完全に脱ぐ/非表示）〜 1.0（完全に着る/表示）' 
                        }
                    },
                    required: ['target', 'opacity']
                }
            },
            {
                type: 'function',
                name: 'change_body_shape',
                description: `自分の体型を変更する。ボーンのスケールを調整して頭を大きくしたり、腕を太くしたり、脚を長くしたりできる。利用可能なボーン: ${boneNames.join(', ')}。scale値は0.1〜5.0。1.0が標準。`,
                parameters: {
                    type: 'object',
                    properties: {
                        bone_name: { 
                            type: 'string', 
                            description: 'ボーン名（例: head, chest, leftUpperArm）'
                        },
                        scale_x: { type: 'number', description: 'X方向スケール（横幅）。省略時はscale_yと同じ' },
                        scale_y: { type: 'number', description: 'Y方向スケール（高さ/長さ）' },
                        scale_z: { type: 'number', description: 'Z方向スケール（奥行き）。省略時はscale_xと同じ' }
                    },
                    required: ['bone_name', 'scale_y']
                }
            },
            {
                type: 'function',
                name: 'apply_body_preset',
                description: `体型プリセットを適用する。利用可能: ${presetNames.join(', ')}`,
                parameters: {
                    type: 'object',
                    properties: {
                        preset_name: {
                            type: 'string',
                            description: 'プリセット名（例: chibi, bigHead, buff, alien, normal）'
                        }
                    },
                    required: ['preset_name']
                }
            },
            {
                type: 'function',
                name: 'get_current_body_state',
                description: '現在の体型状態（服の着用状態、ボーンスケール変更）を確認する',
                parameters: {
                    type: 'object',
                    properties: {},
                    required: []
                }
            }
        ];
    }
    
    // Grokからのfunction callを処理
    handleFunctionCall(functionName, args) {
        console.log(`🤖 Grok Function Call: ${functionName}`, args);
        
        switch (functionName) {
            case 'change_clothing':
                return this.setMeshOpacity(args.target, args.opacity);
                
            case 'change_body_shape': {
                const sx = args.scale_x ?? args.scale_y;
                const sy = args.scale_y;
                const sz = args.scale_z ?? args.scale_x ?? args.scale_y;
                return this.setBoneScale(args.bone_name, sx, sy, sz);
            }
                
            case 'apply_body_preset':
                return this.applyBodyPreset(args.preset_name);
                
            case 'get_current_body_state':
                return this.getCurrentState();
                
            default:
                return { success: false, error: `未知の関数: ${functionName}` };
        }
    }
    
    // ============================
    // UI パネル
    // ============================
    
    createPanel() {
        if (this.panel) return;
        
        this.panel = document.createElement('div');
        this.panel.id = 'vrm-body-control-panel';
        this.panel.innerHTML = `
            <div class="vbc-header" id="vbc-header">
                <span class="vbc-title">👗🦴 ボディコントロール</span>
                <div class="vbc-header-btns">
                    <button class="vbc-btn-header" id="vbc-minimize">−</button>
                    <button class="vbc-btn-header" id="vbc-close">×</button>
                </div>
            </div>
            <div class="vbc-body" id="vbc-body">
                <!-- タブ -->
                <div class="vbc-tabs">
                    <button class="vbc-tab active" data-tab="clothing">👗 服</button>
                    <button class="vbc-tab" data-tab="bones">🦴 体型</button>
                    <button class="vbc-tab" data-tab="presets">🎭 プリセット</button>
                </div>
                
                <!-- 服タブ -->
                <div class="vbc-tab-content active" id="vbc-tab-clothing">
                    <div class="vbc-section-header">
                        <span>衣装パーツ</span>
                        <button class="vbc-btn-small" id="vbc-reset-clothing">リセット</button>
                    </div>
                    <div id="vbc-clothing-list"></div>
                </div>
                
                <!-- ボーンタブ -->
                <div class="vbc-tab-content" id="vbc-tab-bones">
                    <div class="vbc-section-header">
                        <span>ボーンスケール</span>
                        <button class="vbc-btn-small" id="vbc-reset-bones">リセット</button>
                    </div>
                    <div id="vbc-bone-list"></div>
                </div>
                
                <!-- プリセットタブ -->
                <div class="vbc-tab-content" id="vbc-tab-presets">
                    <div class="vbc-section-header">
                        <span>体型プリセット</span>
                    </div>
                    <div id="vbc-preset-list" class="vbc-preset-grid"></div>
                </div>
            </div>
        `;
        
        // スタイル
        const style = document.createElement('style');
        style.textContent = `
            #vrm-body-control-panel {
                position: fixed;
                top: 80px;
                right: 10px;
                width: 320px;
                background: rgba(20, 20, 40, 0.95);
                border-radius: 12px;
                color: #e0e0e0;
                font-size: 11px;
                z-index: 9000;
                box-shadow: 0 8px 32px rgba(0,0,0,0.5);
                border: 1px solid rgba(255,255,255,0.1);
                display: none;
                font-family: 'Segoe UI', 'Yu Gothic', sans-serif;
            }
            .vbc-header {
                background: linear-gradient(135deg, #e91e63 0%, #9c27b0 100%);
                padding: 8px 12px;
                border-radius: 12px 12px 0 0;
                display: flex;
                justify-content: space-between;
                align-items: center;
                cursor: move;
            }
            .vbc-title { font-weight: bold; font-size: 13px; color: white; }
            .vbc-header-btns { display: flex; gap: 4px; }
            .vbc-btn-header {
                background: rgba(255,255,255,0.2);
                border: none;
                color: white;
                width: 22px; height: 22px;
                border-radius: 4px;
                cursor: pointer;
                font-size: 14px;
                display: flex; align-items: center; justify-content: center;
            }
            .vbc-btn-header:hover { background: rgba(255,255,255,0.4); }
            .vbc-body { padding: 8px; max-height: 65vh; overflow-y: auto; }
            .vbc-body.minimized { display: none; }
            
            /* タブ */
            .vbc-tabs { display: flex; gap: 2px; margin-bottom: 8px; }
            .vbc-tab {
                flex: 1;
                padding: 6px 4px;
                background: rgba(255,255,255,0.05);
                border: 1px solid rgba(255,255,255,0.1);
                border-radius: 6px;
                color: #aaa;
                cursor: pointer;
                font-size: 11px;
                transition: all 0.2s;
            }
            .vbc-tab:hover { background: rgba(255,255,255,0.1); }
            .vbc-tab.active { background: rgba(233,30,99,0.3); color: white; border-color: #e91e63; }
            .vbc-tab-content { display: none; }
            .vbc-tab-content.active { display: block; }
            
            /* セクション */
            .vbc-section-header {
                display: flex; justify-content: space-between; align-items: center;
                margin-bottom: 6px; color: #ccc; font-weight: bold;
            }
            .vbc-btn-small {
                padding: 2px 8px;
                background: #444;
                border: none;
                border-radius: 4px;
                color: #aaa;
                cursor: pointer;
                font-size: 10px;
            }
            .vbc-btn-small:hover { background: #555; color: white; }
            
            /* 服パーツ行 */
            .vbc-clothing-row {
                display: flex;
                align-items: center;
                gap: 6px;
                padding: 4px 6px;
                background: rgba(255,255,255,0.03);
                border-radius: 6px;
                margin-bottom: 3px;
            }
            .vbc-clothing-row:hover { background: rgba(255,255,255,0.06); }
            .vbc-clothing-name { flex: 1; font-size: 10px; min-width: 80px; }
            .vbc-clothing-slider { flex: 2; height: 4px; }
            .vbc-clothing-value { width: 36px; text-align: right; font-size: 10px; color: #e91e63; }
            .vbc-clothing-toggle {
                padding: 2px 6px;
                background: #e91e63;
                border: none;
                border-radius: 3px;
                color: white;
                cursor: pointer;
                font-size: 9px;
            }
            
            /* ボーン行 */
            .vbc-bone-row {
                padding: 4px 6px;
                background: rgba(255,255,255,0.03);
                border-radius: 6px;
                margin-bottom: 3px;
            }
            .vbc-bone-header {
                display: flex;
                align-items: center;
                justify-content: space-between;
                margin-bottom: 2px;
            }
            .vbc-bone-name { font-size: 10px; font-weight: bold; }
            .vbc-bone-values { font-size: 9px; color: #9c27b0; }
            .vbc-bone-sliders { display: flex; gap: 4px; align-items: center; }
            .vbc-bone-sliders label { font-size: 9px; color: #888; width: 12px; }
            .vbc-bone-sliders input[type="range"] { flex: 1; height: 3px; }
            
            /* プリセットグリッド */
            .vbc-preset-grid {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 6px;
            }
            .vbc-preset-btn {
                padding: 10px 6px;
                background: rgba(255,255,255,0.05);
                border: 1px solid rgba(255,255,255,0.1);
                border-radius: 8px;
                color: #e0e0e0;
                cursor: pointer;
                font-size: 12px;
                text-align: center;
                transition: all 0.2s;
            }
            .vbc-preset-btn:hover {
                background: rgba(233,30,99,0.2);
                border-color: #e91e63;
                transform: scale(1.03);
            }
            
            /* スライダースタイル */
            #vrm-body-control-panel input[type="range"] {
                -webkit-appearance: none;
                background: rgba(255,255,255,0.15);
                border-radius: 2px;
                outline: none;
            }
            #vrm-body-control-panel input[type="range"]::-webkit-slider-thumb {
                -webkit-appearance: none;
                width: 12px; height: 12px;
                background: #e91e63;
                border-radius: 50%;
                cursor: pointer;
            }
        `;
        document.head.appendChild(style);
        document.body.appendChild(this.panel);
        
        this.setupPanelEvents();
        this.populatePanel();
    }
    
    setupPanelEvents() {
        // ドラッグ
        this.makeDraggable(this.panel, document.getElementById('vbc-header'));
        
        // 最小化
        document.getElementById('vbc-minimize').addEventListener('click', () => {
            this.isMinimized = !this.isMinimized;
            document.getElementById('vbc-body').classList.toggle('minimized', this.isMinimized);
            document.getElementById('vbc-minimize').textContent = this.isMinimized ? '+' : '−';
        });
        
        // 閉じる
        document.getElementById('vbc-close').addEventListener('click', () => {
            this.panel.style.display = 'none';
        });
        
        // タブ切替
        this.panel.querySelectorAll('.vbc-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                this.panel.querySelectorAll('.vbc-tab').forEach(t => t.classList.remove('active'));
                this.panel.querySelectorAll('.vbc-tab-content').forEach(c => c.classList.remove('active'));
                tab.classList.add('active');
                document.getElementById(`vbc-tab-${tab.dataset.tab}`).classList.add('active');
            });
        });
        
        // リセットボタン
        document.getElementById('vbc-reset-clothing')?.addEventListener('click', () => this.resetAllMeshes());
        document.getElementById('vbc-reset-bones')?.addEventListener('click', () => this.resetAllBones());
    }
    
    populatePanel() {
        // 服パーツ
        const clothingList = document.getElementById('vbc-clothing-list');
        if (clothingList) {
            clothingList.innerHTML = '';
            
            // カテゴリ別にグループ化
            const categories = { clothing: '👕 服', hair: '💇 髪', skin: '🧑 肌', face: '😊 顔', eye: '👁️ 目', other: '📦 その他' };
            
            for (const [cat, catLabel] of Object.entries(categories)) {
                const parts = this.meshParts.filter(p => p.category === cat);
                if (parts.length === 0) continue;
                
                const catHeader = document.createElement('div');
                catHeader.style.cssText = 'color: #e91e63; font-size: 10px; font-weight: bold; margin: 6px 0 3px 0;';
                catHeader.textContent = catLabel;
                clothingList.appendChild(catHeader);
                
                parts.forEach((part, i) => {
                    const row = document.createElement('div');
                    row.className = 'vbc-clothing-row';
                    const opacity = part.materials[0]?.opacity ?? 1;
                    row.innerHTML = `
                        <span class="vbc-clothing-name" title="${part.materialName}">${part.displayName}</span>
                        <input type="range" class="vbc-clothing-slider" min="0" max="100" value="${opacity * 100}" 
                               data-mesh-idx="${this.meshParts.indexOf(part)}">
                        <span class="vbc-clothing-value">${Math.round(opacity * 100)}%</span>
                        <button class="vbc-clothing-toggle" data-mesh-idx="${this.meshParts.indexOf(part)}">
                            ${opacity > 0.5 ? '脱' : '着'}
                        </button>
                    `;
                    clothingList.appendChild(row);
                    
                    // スライダーイベント
                    const slider = row.querySelector('.vbc-clothing-slider');
                    const valueSpan = row.querySelector('.vbc-clothing-value');
                    const toggleBtn = row.querySelector('.vbc-clothing-toggle');
                    
                    slider.addEventListener('input', (e) => {
                        const val = parseInt(e.target.value) / 100;
                        this.setMeshOpacityByIndex(this.meshParts.indexOf(part), val);
                        valueSpan.textContent = `${Math.round(val * 100)}%`;
                        toggleBtn.textContent = val > 0.5 ? '脱' : '着';
                    });
                    
                    toggleBtn.addEventListener('click', () => {
                        const current = part.materials[0]?.opacity ?? 1;
                        const newVal = current > 0.5 ? 0 : 1;
                        this.setMeshOpacityByIndex(this.meshParts.indexOf(part), newVal);
                        slider.value = newVal * 100;
                        valueSpan.textContent = `${Math.round(newVal * 100)}%`;
                        toggleBtn.textContent = newVal > 0.5 ? '脱' : '着';
                    });
                });
            }
        }
        
        // ボーン
        const boneList = document.getElementById('vbc-bone-list');
        if (boneList) {
            boneList.innerHTML = '';
            this.boneList.forEach(b => {
                const row = document.createElement('div');
                row.className = 'vbc-bone-row';
                row.setAttribute('data-bone', b.name);
                row.innerHTML = `
                    <div class="vbc-bone-header">
                        <span class="vbc-bone-name">${b.label} (${b.name})</span>
                        <span class="vbc-bone-values" id="vbc-bv-${b.name}">1.00 / 1.00 / 1.00</span>
                    </div>
                    <div class="vbc-bone-sliders">
                        <label>X</label>
                        <input type="range" min="10" max="500" value="100" data-bone="${b.name}" data-axis="x">
                        <label>Y</label>
                        <input type="range" min="10" max="500" value="100" data-bone="${b.name}" data-axis="y">
                        <label>Z</label>
                        <input type="range" min="10" max="500" value="100" data-bone="${b.name}" data-axis="z">
                    </div>
                `;
                boneList.appendChild(row);
                
                row.querySelectorAll('input[type="range"]').forEach(slider => {
                    slider.addEventListener('input', (e) => {
                        const bone = e.target.dataset.bone;
                        const axis = e.target.dataset.axis;
                        const val = parseInt(e.target.value) / 100;
                        
                        const boneObj = this.vrm.humanoid.getRawBoneNode(bone);
                        if (boneObj) {
                            boneObj.scale[axis] = val;
                        }
                        
                        // 値表示更新
                        const valEl = document.getElementById(`vbc-bv-${bone}`);
                        if (valEl && boneObj) {
                            valEl.textContent = `${boneObj.scale.x.toFixed(2)} / ${boneObj.scale.y.toFixed(2)} / ${boneObj.scale.z.toFixed(2)}`;
                        }
                    });
                });
            });
        }
        
        // プリセット
        const presetList = document.getElementById('vbc-preset-list');
        if (presetList) {
            presetList.innerHTML = '';
            for (const [key, preset] of Object.entries(this.bodyPresets)) {
                const btn = document.createElement('button');
                btn.className = 'vbc-preset-btn';
                btn.textContent = preset.label;
                btn.addEventListener('click', () => this.applyBodyPreset(key));
                presetList.appendChild(btn);
            }
        }
    }
    
    setMeshOpacityByIndex(idx, opacity) {
        const part = this.meshParts[idx];
        if (!part) return;
        
        part.materials.forEach(mat => {
            mat.transparent = true;
            mat.opacity = opacity;
            mat.needsUpdate = true;
        });
        part.mesh.visible = opacity > 0.01;
    }
    
    updatePanelValues() {
        if (!this.panel) return;
        
        // ボーンスライダー更新
        this.boneList.forEach(b => {
            const valEl = document.getElementById(`vbc-bv-${b.name}`);
            if (valEl) {
                valEl.textContent = `${b.bone.scale.x.toFixed(2)} / ${b.bone.scale.y.toFixed(2)} / ${b.bone.scale.z.toFixed(2)}`;
            }
            
            ['x', 'y', 'z'].forEach(axis => {
                const slider = this.panel.querySelector(`input[data-bone="${b.name}"][data-axis="${axis}"]`);
                if (slider) {
                    slider.value = Math.round(b.bone.scale[axis] * 100);
                }
            });
        });
        
        // 服スライダー更新
        this.meshParts.forEach((part, idx) => {
            const slider = this.panel?.querySelector(`.vbc-clothing-slider[data-mesh-idx="${idx}"]`);
            if (slider) {
                const opacity = part.materials[0]?.opacity ?? 1;
                slider.value = Math.round(opacity * 100);
                const valueSpan = slider.parentElement?.querySelector('.vbc-clothing-value');
                if (valueSpan) valueSpan.textContent = `${Math.round(opacity * 100)}%`;
            }
        });
    }
    
    // パネル表示/非表示
    togglePanel() {
        if (!this.panel) this.createPanel();
        const isVisible = this.panel.style.display !== 'none';
        this.panel.style.display = isVisible ? 'none' : 'block';
        if (!isVisible) {
            this.scanVRM();
            this.populatePanel();
        }
    }
    
    showPanel() {
        if (!this.panel) this.createPanel();
        this.panel.style.display = 'block';
        this.scanVRM();
        this.populatePanel();
    }
    
    // ドラッグ機能
    makeDraggable(element, handle) {
        let offsetX, offsetY, isDragging = false;
        
        handle.addEventListener('mousedown', (e) => {
            isDragging = true;
            offsetX = e.clientX - element.getBoundingClientRect().left;
            offsetY = e.clientY - element.getBoundingClientRect().top;
            e.preventDefault();
        });
        
        document.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            element.style.left = (e.clientX - offsetX) + 'px';
            element.style.top = (e.clientY - offsetY) + 'px';
            element.style.right = 'auto';
        });
        
        document.addEventListener('mouseup', () => { isDragging = false; });
    }
}

// ============================
// 初期化 & グローバル公開
// ============================

window.vrmBodyController = new VRMBodyController();

// VRM読み込み後に自動スキャン
const _vbcCheckInterval = setInterval(() => {
    if (window.app?.vrm) {
        window.vrmBodyController.scanVRM();
        window.vrmBodyController.createPanel();
        clearInterval(_vbcCheckInterval);
    }
}, 1000);

// キーボードショートカット: Shift+D でパネル表示切替
document.addEventListener('keydown', (e) => {
    if (e.shiftKey && e.key === 'D') {
        window.vrmBodyController.togglePanel();
    }
});

console.log('👗🦴 VRM Body Control System v1.0 loaded (Shift+D でパネル表示)');
