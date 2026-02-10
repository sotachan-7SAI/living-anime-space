/**
 * 🎯 DOF (Depth of Field) System
 * Three.js EffectComposer + BokehPass を使用した被写界深度エフェクト
 * + キャラクター自動フォーカス追従機能
 * + AI Director Camera V2.3 連携機能（4人対応・ショットサイズ対応）
 * 
 * Version: 2.0.0
 */

class DOFSystem {
    constructor() {
        this.enabled = false;
        this.composer = null;
        this.bokehPass = null;
        this.renderPass = null;
        
        // DOF設定
        this.settings = {
            focus: 2.0,        // フォーカス距離 (m)
            aperture: 0.025,   // 絞り (小さいほどボケが強い)
            maxblur: 0.01      // 最大ブラー
        };
        
        // 自動追従設定
        this.autoFocus = {
            enabled: false,
            target: 'none',     // 'none', 'characterA', 'characterB', 'aiDirector'
            part: 'face',       // 'face', 'body'
            smoothing: 0.1      // フォーカス移動の滑らかさ (0-1)
        };
        
        // ★ AI Director連携設定
        this.aiDirectorLink = {
            enabled: false,     // AI Director連携ON/OFF
            lastTarget: null,   // 最後に受け取ったターゲット
            lastShotSize: null, // 最後に受け取ったショットサイズ
            lastBone: 'head'    // 最後にフォーカスしたボーン
        };
        
        // ★ 4人対応のターゲットマッピング
        this.targetMapping = {
            'char_A': { source: 'character', characterId: 'char_A' },
            'char_B': { source: 'character', characterId: 'char_B' },
            'char_C': { source: 'character', characterId: 'char_C' },
            'char_D': { source: 'character', characterId: 'char_D' },
            'mocap': { source: 'mocap' },
            'default': { source: 'default' },
            'center': { source: 'center' },
            // 旧形式互換
            'characterA': { source: 'default' },
            'characterB': { source: 'mocap' }
        };
        
        // ★ ショットサイズごとのフォーカスボーン設定
        this.shotBoneMapping = {
            'ECU': 'head',       // アイショット → 顔
            'CU': 'head',        // フェイス → 顔
            'MCU': 'head',       // バストアップ → 顔（上半身だが顔にピント）
            'MS': 'chest',       // ミディアム → 胸
            'COWBOY': 'spine',   // カウボーイ → 腰
            'FS': 'hips',        // フル → 腰
            'LS': 'hips',        // ロング → 腰
            'TWO': 'chest',      // ツーショット → 中央付近
            'GROUP': 'chest',    // グループ → 中央付近
            'UPPER': 'chest',
            'FEET_OUT': 'spine',
            'WIDE': 'hips',
            'VERY_WIDE': 'hips',
            'THIRD_PERSON': 'head',
            'ARM_FOCUS': 'leftUpperArm',
            'HAND_FOCUS': 'leftHand',
            'NAVEL_FOCUS': 'spine',
            'BACK_FOCUS': 'chest',
            'CROTCH_FOCUS': 'hips',
            'HIP_FOCUS': 'hips',
            'ASS_FOCUS': 'hips',
            'THIGH_FOCUS': 'leftUpperLeg',
            'FOOT_FOCUS': 'leftFoot'
        };
        
        this.isInitialized = false;
        this.currentFocusDistance = 2.0;
        
        // ★ AI Director連携イベントリスナーを設定
        this.setupAIDirectorLink();
    }
    
    /**
     * DOFシステムを初期化
     */
    async init(renderer, scene, camera) {
        this.renderer = renderer;
        this.scene = scene;
        this.camera = camera;
        
        try {
            // 動的にモジュールをインポート
            const [
                { EffectComposer },
                { RenderPass },
                { BokehPass },
                { ShaderPass },
                { GammaCorrectionShader }
            ] = await Promise.all([
                import('https://cdn.jsdelivr.net/npm/three@0.169.0/examples/jsm/postprocessing/EffectComposer.js'),
                import('https://cdn.jsdelivr.net/npm/three@0.169.0/examples/jsm/postprocessing/RenderPass.js'),
                import('https://cdn.jsdelivr.net/npm/three@0.169.0/examples/jsm/postprocessing/BokehPass.js'),
                import('https://cdn.jsdelivr.net/npm/three@0.169.0/examples/jsm/postprocessing/ShaderPass.js'),
                import('https://cdn.jsdelivr.net/npm/three@0.169.0/examples/jsm/shaders/GammaCorrectionShader.js')
            ]);
            
            // 🔧 EffectComposer作成（sRGB対応のレンダーターゲット）
            const pixelRatio = renderer.getPixelRatio();
            const width = window.innerWidth * pixelRatio;
            const height = window.innerHeight * pixelRatio;
            
            const renderTarget = new THREE.WebGLRenderTarget(width, height, {
                minFilter: THREE.LinearFilter,
                magFilter: THREE.LinearFilter,
                format: THREE.RGBAFormat,
                colorSpace: THREE.SRGBColorSpace  // sRGBカラースペースを指定
            });
            
            this.composer = new EffectComposer(renderer, renderTarget);
            
            // RenderPass（通常レンダリング）
            this.renderPass = new RenderPass(scene, camera);
            this.composer.addPass(this.renderPass);
            
            // BokehPass（DOFエフェクト）
            this.bokehPass = new BokehPass(scene, camera, {
                focus: this.settings.focus,
                aperture: this.settings.aperture,
                maxblur: this.settings.maxblur
            });
            this.bokehPass.enabled = false; // 初期状態は無効
            this.composer.addPass(this.bokehPass);
            
            // 🔧 ガンマ補正パス（DOFで暗くなる問題を修正）
            this.gammaPass = new ShaderPass(GammaCorrectionShader);
            this.composer.addPass(this.gammaPass);
            
            this.isInitialized = true;
            console.log('✅ DOFシステム初期化完了（AI Director連携対応）');
            
            return true;
        } catch (error) {
            console.error('❌ DOFシステム初期化失敗:', error);
            return false;
        }
    }
    
    /**
     * ★ AI Director Camera連携のイベントリスナーを設定
     */
    setupAIDirectorLink() {
        // AI Director Cameraからのショット変更イベントをリッスン
        window.addEventListener('aiDirectorShotChanged', (e) => {
            if (!this.aiDirectorLink.enabled || !this.autoFocus.enabled) return;
            
            const { target, shotSize, bone } = e.detail;
            console.log(`🎯 DOF: AI Director連携 - ターゲット: ${target}, ショット: ${shotSize}, ボーン: ${bone}`);
            
            this.aiDirectorLink.lastTarget = target;
            this.aiDirectorLink.lastShotSize = shotSize;
            this.aiDirectorLink.lastBone = bone || this.shotBoneMapping[shotSize] || 'head';
            
            // 即座にフォーカスを更新
            this.updateFocusFromAIDirector();
        });
        
        // AI Director開始/停止イベント
        window.addEventListener('aiDirectorStateChanged', (e) => {
            const { isEnabled } = e.detail;
            console.log(`🎯 DOF: AI Director状態変更 - ${isEnabled ? '開始' : '停止'}`);
            
            // AI演出停止時も連携設定は保持
            if (isEnabled && this.aiDirectorLink.enabled && this.autoFocus.enabled) {
                console.log('🎯 DOF: AI Director連携モードで追従開始');
            }
        });
        
        console.log('🎯 DOF: AI Director連携イベントリスナー設定完了');
    }
    
    /**
     * ★ AI Director連携モードを設定
     */
    setAIDirectorLink(enabled) {
        this.aiDirectorLink.enabled = enabled;
        console.log(`🎯 DOF AI Director連携: ${enabled ? 'ON' : 'OFF'}`);
        
        if (enabled) {
            // 自動追従も有効にする
            this.autoFocus.enabled = true;
            this.autoFocus.target = 'aiDirector';
            
            // 現在のAI Director状態を取得して適用
            if (window.aiDirectorCamera) {
                const currentShot = window.aiDirectorCamera.currentShot;
                if (currentShot) {
                    this.aiDirectorLink.lastTarget = currentShot.target;
                    this.aiDirectorLink.lastShotSize = currentShot.size;
                    this.aiDirectorLink.lastBone = this.shotBoneMapping[currentShot.size] || 'head';
                    this.updateFocusFromAIDirector();
                }
            }
        }
    }
    
    /**
     * ★ AI Director情報からフォーカスを更新
     */
    updateFocusFromAIDirector() {
        if (!this.aiDirectorLink.enabled) return;
        
        const target = this.aiDirectorLink.lastTarget;
        const bone = this.aiDirectorLink.lastBone;
        
        if (!target) return;
        
        // ターゲットの位置を取得
        const targetPos = this.getCharacterPositionByTarget(target, bone);
        if (!targetPos) {
            console.warn(`🎯 DOF: ターゲット位置取得失敗 - ${target}`);
            return;
        }
        
        // カメラからの距離を計算
        const distance = this.calculateDistanceFromCamera(targetPos);
        if (distance !== null) {
            console.log(`🎯 DOF: フォーカス距離更新 - ${distance.toFixed(2)}m (${target} / ${bone})`);
            
            // スムーズ追従の目標値を設定
            this.targetFocusDistance = distance;
        }
    }
    
    /**
     * DOFを有効/無効にする
     */
    setEnabled(enabled) {
        this.enabled = enabled;
        if (this.bokehPass) {
            this.bokehPass.enabled = enabled;
        }
        console.log(`🎯 DOF: ${enabled ? 'ON' : 'OFF'}`);
    }
    
    /**
     * フォーカス距離を設定 (m単位)
     */
    setFocus(distance) {
        this.settings.focus = distance;
        if (this.bokehPass) {
            this.bokehPass.uniforms['focus'].value = distance;
        }
    }
    
    /**
     * ボケ強度を設定 (0-1)
     */
    setBokehIntensity(intensity) {
        // bokehIntensityを保存
        this.settings.bokehIntensity = intensity;
        
        // dofRangeを考慮した計算
        const range = this.settings.dofRange || 0.5;
        
        // aperture: 小さいほど被写界深度が深い（ボケが弱い）
        // rangeが大きいほどapertureを小さく（ピント範囲が広くなる）
        const baseAperture = 0.0001 + (1 - intensity) * 0.05;
        const rangeMultiplier = 1 - (range * 0.8);  // range=1の時0.2倍に、range=0の時1倍
        const aperture = baseAperture * rangeMultiplier;
        
        // maxblur: ボケの最大強度
        const maxblur = 0.001 + intensity * 0.02;
        
        this.settings.aperture = aperture;
        this.settings.maxblur = maxblur;
        
        if (this.bokehPass) {
            this.bokehPass.uniforms['aperture'].value = aperture;
            this.bokehPass.uniforms['maxblur'].value = maxblur;
        }
    }
    
    /**
     * DOF範囲（被写界深度の幅）を設定 (0-1)
     * 0 = 狭い（ボケが強い）
     * 1 = 広い（ボケが弱い、ピント範囲が広い）
     */
    setDofRange(range) {
        this.settings.dofRange = range;
        // setBokehIntensityを再度呼び出してapertureを再計算
        const currentIntensity = this.settings.bokehIntensity || 0.5;
        this.setBokehIntensity(currentIntensity);
        
        console.log(`📐 DOF範囲: ${Math.round(range * 100)}%`);
    }
    
    /**
     * 自動フォーカス追従を設定
     */
    setAutoFocus(enabled, target = 'none', part = 'face') {
        this.autoFocus.enabled = enabled;
        this.autoFocus.target = target;
        this.autoFocus.part = part;
        
        // aiDirectorターゲットの場合、連携も有効にする
        if (target === 'aiDirector') {
            this.aiDirectorLink.enabled = enabled;
        }
        
        console.log(`🎯 Auto Focus: ${enabled ? 'ON' : 'OFF'}, Target: ${target}, Part: ${part}`);
    }
    
    /**
     * ★ ターゲットIDからキャラクターの位置を取得（4人対応）
     */
    getCharacterPositionByTarget(targetId, boneName = 'head') {
        const mapping = this.targetMapping[targetId];
        if (!mapping) {
            // マッピングがない場合は旧形式として処理
            return this.getCharacterPosition(targetId, boneName === 'head' ? 'face' : 'body');
        }
        
        let vrm = null;
        
        switch (mapping.source) {
            case 'character':
                // multiCharUI.manager.characters から取得
                vrm = this.getVRMFromMultiChar(mapping.characterId);
                break;
            case 'mocap':
                vrm = window.vmcMocap?.avatarVRM || null;
                break;
            case 'default':
                vrm = window.app?.vrm || null;
                break;
            case 'center':
                // centerの場合は全キャラクターの中央を計算
                return this.getCenterPosition(boneName);
            default:
                vrm = window.app?.vrm || null;
        }
        
        if (!vrm || !vrm.humanoid) return null;
        
        return this.getBonePosition(vrm, boneName);
    }
    
    /**
     * ★ multiCharUI.manager.charactersからVRMを取得
     */
    getVRMFromMultiChar(characterId) {
        const manager = window.multiCharUI?.manager;
        if (manager && manager.characters instanceof Map) {
            const character = manager.characters.get(characterId);
            if (character && character.vrm) {
                return character.vrm;
            }
        }
        
        // フォールバック: dialogueDirector
        const director = window.dialogueDirector;
        if (director && director.characters instanceof Map) {
            const character = director.characters.get(characterId);
            if (character && character.vrm) {
                return character.vrm;
            }
        }
        
        return null;
    }
    
    /**
     * ★ VRMのボーン位置を取得
     */
    getBonePosition(vrm, boneName) {
        if (!vrm || !vrm.humanoid) return null;
        
        try {
            const bone = vrm.humanoid.getNormalizedBoneNode(boneName);
            if (bone) {
                const worldPos = new THREE.Vector3();
                bone.getWorldPosition(worldPos);
                return worldPos;
            }
        } catch (e) {
            console.warn('ボーン位置取得エラー:', e);
        }
        
        // フォールバック: シーン位置 + 推定高さ
        const scenePos = vrm.scene ? vrm.scene.position : { x: 0, y: 0, z: 0 };
        const heights = {
            'head': 1.5,
            'chest': 1.2,
            'spine': 1.0,
            'hips': 0.9,
            'leftUpperArm': 1.3,
            'leftHand': 0.8,
            'leftUpperLeg': 0.6,
            'leftFoot': 0.1
        };
        
        return new THREE.Vector3(
            scenePos.x || 0,
            (scenePos.y || 0) + (heights[boneName] || 1.2),
            scenePos.z || 0
        );
    }
    
    /**
     * ★ 全キャラクターの中央位置を取得
     */
    getCenterPosition(boneName) {
        const positions = [];
        
        // multiCharUI.manager.charactersから取得
        const manager = window.multiCharUI?.manager;
        if (manager && manager.characters instanceof Map) {
            manager.characters.forEach((char) => {
                if (char.vrm) {
                    const pos = this.getBonePosition(char.vrm, boneName);
                    if (pos) positions.push(pos);
                }
            });
        }
        
        // MocapVRM
        const mocapVRM = window.vmcMocap?.avatarVRM;
        if (mocapVRM) {
            const pos = this.getBonePosition(mocapVRM, boneName);
            if (pos) positions.push(pos);
        }
        
        // デフォルトVRM
        if (positions.length === 0 && window.app?.vrm) {
            const pos = this.getBonePosition(window.app.vrm, boneName);
            if (pos) positions.push(pos);
        }
        
        if (positions.length === 0) {
            return new THREE.Vector3(0, 1.2, 0);
        }
        
        // 平均位置を計算
        const center = new THREE.Vector3();
        positions.forEach(p => center.add(p));
        center.divideScalar(positions.length);
        
        return center;
    }
    
    /**
     * キャラクターの位置を取得（旧形式互換）
     */
    getCharacterPosition(characterId, part) {
        let vrm = null;
        
        // キャラクターを特定
        if (characterId === 'characterA') {
            vrm = window.app?.vrm;
        } else if (characterId === 'characterB') {
            vrm = window.app?.vrmB || window.secondVRM || window.vmcMocap?.avatarVRM;
        } else if (characterId === 'aiDirector') {
            // AI Director連携モード
            const target = this.aiDirectorLink.lastTarget;
            const bone = this.aiDirectorLink.lastBone;
            if (target) {
                return this.getCharacterPositionByTarget(target, bone);
            }
            return null;
        }
        
        if (!vrm || !vrm.humanoid) return null;
        
        const boneName = part === 'face' ? 'head' : 'spine';
        return this.getBonePosition(vrm, boneName);
    }
    
    /**
     * カメラからの距離を計算
     */
    calculateDistanceFromCamera(position) {
        if (!this.camera || !position) return null;
        
        const cameraPos = this.camera.position;
        return cameraPos.distanceTo(position);
    }
    
    /**
     * 自動フォーカス更新（毎フレーム呼ばれる）
     */
    updateAutoFocus() {
        if (!this.autoFocus.enabled) return;
        
        let targetPos = null;
        
        if (this.autoFocus.target === 'aiDirector' && this.aiDirectorLink.enabled) {
            // ★ AI Director連携モード
            const target = this.aiDirectorLink.lastTarget;
            const bone = this.aiDirectorLink.lastBone;
            if (target) {
                targetPos = this.getCharacterPositionByTarget(target, bone);
            }
        } else if (this.autoFocus.target !== 'none') {
            // 旧形式の自動追従
            targetPos = this.getCharacterPosition(this.autoFocus.target, this.autoFocus.part);
        }
        
        if (!targetPos) return;
        
        const targetDistance = this.calculateDistanceFromCamera(targetPos);
        if (targetDistance === null) return;
        
        // スムーズに追従（Lerp）
        this.currentFocusDistance += (targetDistance - this.currentFocusDistance) * this.autoFocus.smoothing;
        
        // フォーカスを適用
        if (this.bokehPass) {
            this.bokehPass.uniforms['focus'].value = this.currentFocusDistance;
        }
    }
    
    /**
     * リサイズ時の処理
     */
    onResize(width, height) {
        if (this.composer) {
            this.composer.setSize(width, height);
        }
    }
    
    /**
     * レンダリング
     */
    render() {
        if (!this.isInitialized || !this.enabled || !this.composer) {
            return false;
        }
        
        // 自動フォーカス更新
        this.updateAutoFocus();
        
        this.composer.render();
        return true;
    }
    
    /**
     * 現在のフォーカス距離を取得
     */
    getCurrentFocusDistance() {
        return this.currentFocusDistance;
    }
    
    /**
     * ★ 利用可能なキャラクターリストを取得（4人対応）
     */
    getAvailableCharacters() {
        const characters = [];
        
        // デフォルトVRM
        if (window.app?.vrm) {
            characters.push({
                id: 'characterA',
                name: 'キャラクターA',
                available: true
            });
        }
        
        // サブVRM / Mocap
        if (window.app?.vrmB || window.secondVRM || window.vmcMocap?.avatarVRM) {
            characters.push({
                id: 'characterB',
                name: 'キャラクターB / Mocap',
                available: true
            });
        }
        
        // ★ AI Director連携
        characters.push({
            id: 'aiDirector',
            name: '🎬 AI Director連動',
            available: true
        });
        
        // multiCharUI.manager.characters（4人対応）
        const manager = window.multiCharUI?.manager;
        if (manager && manager.characters instanceof Map) {
            const charLabels = ['A', 'B', 'C', 'D'];
            let index = 0;
            manager.characters.forEach((char, charId) => {
                if (char.vrm && index < charLabels.length) {
                    characters.push({
                        id: charId,
                        name: char.name || `キャラクター${charLabels[index]}`,
                        available: true
                    });
                    index++;
                }
            });
        }
        
        return characters;
    }
    
    /**
     * 破棄
     */
    dispose() {
        if (this.composer) {
            this.composer.dispose();
            this.composer = null;
        }
        this.bokehPass = null;
        this.renderPass = null;
        this.isInitialized = false;
    }
}

// グローバルインスタンス
window.dofSystem = new DOFSystem();

// カメラエフェクトパネルからのイベントをリッスン
window.addEventListener('cameraEffectsChanged', async (e) => {
    const settings = e.detail;
    
    // DOFシステムが初期化されていなければ初期化
    if (!window.dofSystem.isInitialized && window.app) {
        await window.dofSystem.init(
            window.app.renderer,
            window.app.scene,
            window.app.camera
        );
    }
    
    // DOF設定を適用
    if (window.dofSystem.isInitialized) {
        window.dofSystem.setEnabled(settings.dofEnabled);
        
        // 自動追従がOFFの場合のみ手動フォーカス距離を適用
        if (!window.dofSystem.autoFocus.enabled) {
            window.dofSystem.setFocus(settings.focusDistance);
        }
        
        // DOF範囲を先に設定（setBokehIntensity内で使用される）
        if (settings.dofRange !== undefined) {
            window.dofSystem.setDofRange(settings.dofRange);
        }
        
        window.dofSystem.setBokehIntensity(settings.bokehIntensity);
        
        // ★ AI Director連携設定
        if (settings.aiDirectorLink !== undefined) {
            window.dofSystem.setAIDirectorLink(settings.aiDirectorLink);
        }
    }
});

// DOMContentLoaded時に初期化を試みる
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(async () => {
        if (window.app && window.app.renderer && window.app.scene && window.app.camera) {
            const success = await window.dofSystem.init(
                window.app.renderer,
                window.app.scene,
                window.app.camera
            );
            
            if (success) {
                console.log('🎯 DOFシステム準備完了（AI Director連携・4人対応）');
            }
        }
    }, 1000);
});

// エクスポート
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DOFSystem;
}
