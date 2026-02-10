/**
 * Auto Camera System for VRM AI Viewer
 * Version: 3.2.0
 * 
 * 新機能:
 * - ボーン中心選択（顔/胸/腰）
 * - キャラクター正面認識
 * - 2人モード: 中央モード / 交互切り替え（リップシンク検出）
 * - v3.2: トラックを水平移動に修正（VRMを中心に回転しない）
 */

class AutoCameraSystem {
    constructor(app) {
        this.app = app;
        this.isEnabled = false;
        this.isPaused = false;
        
        this.config = {
            transitionDuration: 4000,
            movementSpeed: 0.3,
            smoothness: 0.015,
            minDistance: 1.0,
            maxDistance: 5.0,
            defaultDistance: 2.5,
            minHeight: 0.2,
            maxHeight: 2.2,
            faceHeight: 1.5,
            maxHorizontalAngle: 70,
            maxVerticalAngle: 40,
            frontAngleRange: 120,
            preferFront: true,
            // 2人モード設定
            silenceTimeout: 3000,      // 無音判定時間
            twoPersonDistance: 4.0,
            speakingThreshold: 0.05,   // リップシンク検出閾値
            switchDelay: 500,          // 切り替え遅延（チラつき防止）
        };
        
        // モード: 'solo-a', 'solo-b', 'duo-center', 'duo-switch'
        this.mode = 'solo-a';
        this.focusBone = 'head';
        
        this.cameraWorkTypes = {
            'orbit-slow-left': { name: '🔄 ゆっくり左回り', category: 'orbit' },
            'orbit-slow-right': { name: '🔄 ゆっくり右回り', category: 'orbit' },
            'orbit-medium-left': { name: '🔄 中速左回り', category: 'orbit' },
            'orbit-medium-right': { name: '🔄 中速右回り', category: 'orbit' },
            'tilt-up-slow': { name: '↗️ ゆっくり下から上へ', category: 'tilt' },
            'tilt-down-slow': { name: '↘️ ゆっくり上から下へ', category: 'tilt' },
            'tilt-face-scan': { name: '👤 顔スキャン', category: 'tilt' },
            'dolly-in-slow': { name: '🔍 ゆっくり寄り', category: 'dolly' },
            'dolly-out-slow': { name: '🔭 ゆっくり引き', category: 'dolly' },
            'dolly-dramatic': { name: '✨ ドラマチック寄り', category: 'dolly' },
            'track-left-slow': { name: '◀️ ゆっくり左移動', category: 'track' },
            'track-right-slow': { name: '▶️ ゆっくり右移動', category: 'track' },
            'crane-up-slow': { name: '⬆️ クレーンアップ', category: 'crane' },
            'crane-down-slow': { name: '⬇️ クレーンダウン', category: 'crane' },
            'crane-arc': { name: '🌈 アーク軌道', category: 'crane' },
            'face-closeup': { name: '😊 顔クローズアップ', category: 'special' },
            'bust-shot': { name: '👔 バストショット', category: 'special' },
            'full-body': { name: '🧍 全身ショット', category: 'special' },
            'low-angle': { name: '📷 ローアングル', category: 'special' },
            'high-angle': { name: '🦅 ハイアングル', category: 'special' },
            'orbit-dolly-in': { name: '🎬 回り込み＋寄り', category: 'combo' },
            'orbit-tilt-up': { name: '🎬 回り込み＋上昇', category: 'combo' },
            'crane-orbit': { name: '🎬 上昇＋回り込み', category: 'combo' },
        };
        
        this.state = {
            currentTarget: 'vrm1',
            currentWorkType: null,
            workStartTime: 0,
            workProgress: 0,
            theta: 0,
            phi: Math.PI / 2,
            radius: 2.5,
            targetX: 0,
            targetY: 1.0,
            targetZ: 0,
            goalTheta: 0,
            goalPhi: Math.PI / 2,
            goalRadius: 2.5,
            goalTargetX: 0,
            goalTargetY: 1.0,
            goalTargetZ: 0,
            workHistory: [],
            characterFacing: 0,
            // リップシンク検出用
            vrm1LipHistory: [],
            vrm2LipHistory: [],
            currentSpeaker: null,      // 'vrm1', 'vrm2', null
            lastSpeakerChangeTime: 0,
            lastSpeakTime: 0,
        };
        
        this.enabledCategories = {
            orbit: true, tilt: true, dolly: true,
            track: true, crane: true, special: true, combo: true,
        };
        
        this.animationId = null;
        this.panel = null;
        this.isDragging = false;
        
        this.init();
    }
    
    init() {
        console.log('🎬 AutoCameraSystem v3.2 初期化中...');
        this.createUI();
        this.loadSettings();
        console.log('✅ AutoCameraSystem 初期化完了');
    }
    
    // =====================================================
    // リップシンク検出（口の動き）
    // =====================================================
    
    getLipSyncValue(vrm) {
        if (!vrm || !vrm.expressionManager) return 0;
        
        try {
            // VRM 1.0 の口の表情値を取得
            const aa = vrm.expressionManager.getValue('aa') || 0;
            const ih = vrm.expressionManager.getValue('ih') || 0;
            const ou = vrm.expressionManager.getValue('ou') || 0;
            const ee = vrm.expressionManager.getValue('ee') || 0;
            const oh = vrm.expressionManager.getValue('oh') || 0;
            
            // 最大値を返す
            return Math.max(aa, ih, ou, ee, oh);
        } catch (e) {
            return 0;
        }
    }
    
    detectSpeaker() {
        const vrm1 = this.app.vrm;
        const vrm2 = this.getAvatarVRM();
        
        // リップシンク値を取得
        const vrm1Lip = this.getLipSyncValue(vrm1);
        const vrm2Lip = this.getLipSyncValue(vrm2);
        
        // 履歴に追加（過去10フレーム）
        this.state.vrm1LipHistory.push(vrm1Lip);
        this.state.vrm2LipHistory.push(vrm2Lip);
        if (this.state.vrm1LipHistory.length > 10) this.state.vrm1LipHistory.shift();
        if (this.state.vrm2LipHistory.length > 10) this.state.vrm2LipHistory.shift();
        
        // 平均値で判定（ノイズ軽減）
        const vrm1Avg = this.state.vrm1LipHistory.reduce((a, b) => a + b, 0) / this.state.vrm1LipHistory.length;
        const vrm2Avg = this.state.vrm2LipHistory.reduce((a, b) => a + b, 0) / this.state.vrm2LipHistory.length;
        
        const threshold = this.config.speakingThreshold;
        const now = Date.now();
        
        const vrm1Speaking = vrm1Avg > threshold;
        const vrm2Speaking = vrm2Avg > threshold;
        
        // UI更新（発話インジケーター）
        const dot1 = document.getElementById('vrm1-speaking-dot');
        const dot2 = document.getElementById('vrm2-speaking-dot');
        if (dot1) dot1.classList.toggle('speaking', vrm1Speaking);
        if (dot2) dot2.classList.toggle('speaking', vrm2Speaking);
        
        // レベルバー更新
        const bar1 = document.getElementById('vrm1-lip-bar');
        const bar2 = document.getElementById('vrm2-lip-bar');
        if (bar1) bar1.style.width = `${Math.min(100, vrm1Avg * 500)}%`;
        if (bar2) bar2.style.width = `${Math.min(100, vrm2Avg * 500)}%`;
        
        // 発話者の切り替え判定（チラつき防止のため遅延を設ける）
        let newSpeaker = this.state.currentSpeaker;
        
        if (vrm1Speaking && !vrm2Speaking) {
            newSpeaker = 'vrm1';
            this.state.lastSpeakTime = now;
        } else if (vrm2Speaking && !vrm1Speaking) {
            newSpeaker = 'vrm2';
            this.state.lastSpeakTime = now;
        } else if (vrm1Speaking && vrm2Speaking) {
            // 両方話している場合は、より大きい方
            newSpeaker = vrm1Avg > vrm2Avg ? 'vrm1' : 'vrm2';
            this.state.lastSpeakTime = now;
        }
        // 両方無音の場合は維持（しばらくして中央に戻る）
        
        // 切り替え遅延チェック
        if (newSpeaker !== this.state.currentSpeaker) {
            if (now - this.state.lastSpeakerChangeTime > this.config.switchDelay) {
                this.state.currentSpeaker = newSpeaker;
                this.state.lastSpeakerChangeTime = now;
                
                // ターゲット更新
                if (this.mode === 'duo-switch') {
                    this.updateTargetForDuoSwitch();
                }
                
                console.log(`🎤 発話者切り替え: ${newSpeaker || '無音'}`);
            }
        }
        
        // 無音が続いたら中央に戻る（duo-switchモードの場合）
        if (this.mode === 'duo-switch' && now - this.state.lastSpeakTime > this.config.silenceTimeout) {
            if (this.state.currentTarget !== 'center') {
                this.state.currentTarget = 'center';
                this.updateTargetForDuoCenter();
                console.log('🎤 無音検出 → 中央ビュー');
            }
        }
        
        return { vrm1Speaking, vrm2Speaking, vrm1Avg, vrm2Avg };
    }
    
    // =====================================================
    // ボーン・位置取得
    // =====================================================
    
    getBonePosition(vrm, boneName) {
        if (!vrm || !vrm.humanoid) return null;
        try {
            const bone = vrm.humanoid.getNormalizedBoneNode(boneName);
            if (bone) {
                const worldPos = new THREE.Vector3();
                bone.getWorldPosition(worldPos);
                return worldPos;
            }
        } catch (e) {}
        return null;
    }
    
    getCharacterFacing(vrm) {
        if (!vrm || !vrm.humanoid) return 0;
        try {
            const hips = vrm.humanoid.getNormalizedBoneNode('hips');
            if (hips) {
                const worldQuat = new THREE.Quaternion();
                hips.getWorldQuaternion(worldQuat);
                const forward = new THREE.Vector3(0, 0, -1);
                forward.applyQuaternion(worldQuat);
                return Math.atan2(forward.x, forward.z);
            }
            if (vrm.scene) return vrm.scene.rotation.y;
        } catch (e) {}
        return 0;
    }
    
    getTargetPositionFromBone(vrm) {
        if (!vrm) return { x: 0, y: 1.0, z: 0 };
        
        const boneMap = { 'head': 'head', 'chest': 'chest', 'hips': 'hips' };
        let pos = this.getBonePosition(vrm, boneMap[this.focusBone]);
        
        if (!pos && this.focusBone === 'chest') {
            pos = this.getBonePosition(vrm, 'upperChest') || this.getBonePosition(vrm, 'spine');
        }
        
        if (pos) return { x: pos.x, y: pos.y, z: pos.z };
        
        const scenePos = vrm.scene ? vrm.scene.position : { x: 0, y: 0, z: 0 };
        const heightOffset = { 'head': 1.5, 'chest': 1.2, 'hips': 0.9 };
        return {
            x: scenePos.x || 0,
            y: (scenePos.y || 0) + (heightOffset[this.focusBone] || 1.0),
            z: scenePos.z || 0
        };
    }
    
    getAvatarVRM() {
        if (window.vmcMocap && window.vmcMocap.avatarVRM) return window.vmcMocap.avatarVRM;
        return null;
    }
    
    // =====================================================
    // ターゲット更新
    // =====================================================
    
    updateTarget() {
        if (this.mode === 'solo-a') {
            this.updateTargetForSolo(this.app.vrm);
        } else if (this.mode === 'solo-b') {
            this.updateTargetForSolo(this.getAvatarVRM() || this.app.vrm);
        } else if (this.mode === 'duo-center') {
            this.updateTargetForDuoCenter();
        } else if (this.mode === 'duo-switch') {
            this.updateTargetForDuoSwitch();
        }
    }
    
    updateTargetForSolo(vrm) {
        if (!vrm) return;
        const pos = this.getTargetPositionFromBone(vrm);
        this.state.goalTargetX = pos.x;
        this.state.goalTargetY = pos.y;
        this.state.goalTargetZ = pos.z;
        this.state.characterFacing = this.getCharacterFacing(vrm);
        this.state.currentTarget = vrm === this.app.vrm ? 'vrm1' : 'vrm2';
    }
    
    updateTargetForDuoCenter() {
        const vrm1 = this.app.vrm;
        const vrm2 = this.getAvatarVRM();
        
        const pos1 = vrm1 ? this.getTargetPositionFromBone(vrm1) : { x: 0, y: 1.0, z: 0 };
        const pos2 = vrm2 ? this.getTargetPositionFromBone(vrm2) : { x: 1.5, y: 1.0, z: 0 };
        
        // 2人の中間点
        this.state.goalTargetX = (pos1.x + pos2.x) / 2;
        this.state.goalTargetY = Math.max(pos1.y, pos2.y);
        this.state.goalTargetZ = (pos1.z + pos2.z) / 2;
        
        // 2人の向きの平均（おおよそ）
        const facing1 = vrm1 ? this.getCharacterFacing(vrm1) : 0;
        const facing2 = vrm2 ? this.getCharacterFacing(vrm2) : 0;
        this.state.characterFacing = (facing1 + facing2) / 2;
        
        this.state.currentTarget = 'center';
        
        // 距離を少し遠めに
        this.state.goalRadius = Math.max(this.state.goalRadius, this.config.twoPersonDistance);
    }
    
    updateTargetForDuoSwitch() {
        const speaker = this.state.currentSpeaker;
        
        if (speaker === 'vrm1') {
            this.updateTargetForSolo(this.app.vrm);
        } else if (speaker === 'vrm2') {
            this.updateTargetForSolo(this.getAvatarVRM() || this.app.vrm);
        } else {
            // 無音時は中央
            this.updateTargetForDuoCenter();
        }
    }
    
    // =====================================================
    // UI
    // =====================================================
    
    createUI() {
        const panel = document.createElement('div');
        panel.id = 'auto-camera-panel';
        panel.innerHTML = `
            <style>
                #auto-camera-panel {
                    position: fixed;
                    top: 80px;
                    right: 10px;
                    background: rgba(15, 15, 30, 0.97);
                    padding: 0;
                    border-radius: 16px;
                    color: #fff;
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
                    font-size: 11px;
                    z-index: 10000;
                    min-width: 320px;
                    max-height: 85vh;
                    overflow: hidden;
                    box-shadow: 0 10px 40px rgba(0,0,0,0.5);
                    border: 1px solid rgba(255,255,255,0.08);
                }
                #auto-camera-panel.collapsed .panel-body { display: none; }
                #auto-camera-panel .panel-header {
                    background: linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%);
                    padding: 12px 14px;
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    cursor: grab;
                    user-select: none;
                    border-radius: 16px 16px 0 0;
                }
                #auto-camera-panel.collapsed .panel-header { border-radius: 16px; }
                #auto-camera-panel .panel-header .title { font-weight: 700; font-size: 13px; }
                #auto-camera-panel .header-btn {
                    background: rgba(255,255,255,0.2);
                    border: none;
                    color: white;
                    width: 26px;
                    height: 26px;
                    border-radius: 6px;
                    cursor: pointer;
                }
                #auto-camera-panel .header-btn:hover { background: rgba(255,255,255,0.35); }
                #auto-camera-panel .panel-body { padding: 14px; max-height: calc(85vh - 55px); overflow-y: auto; }
                
                #auto-camera-panel .main-control { display: flex; gap: 8px; margin-bottom: 14px; }
                #auto-camera-panel .main-btn {
                    flex: 1;
                    padding: 12px 8px;
                    border: none;
                    border-radius: 10px;
                    cursor: pointer;
                    font-weight: 700;
                    font-size: 11px;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    gap: 4px;
                }
                #auto-camera-panel .main-btn.start { background: linear-gradient(135deg, #00b894, #00cec9); color: white; }
                #auto-camera-panel .main-btn.stop { background: linear-gradient(135deg, #ff6b6b, #ee5a24); color: white; }
                #auto-camera-panel .main-btn.pause { background: linear-gradient(135deg, #fdcb6e, #f39c12); color: #2d3436; }
                #auto-camera-panel .main-btn:disabled { opacity: 0.4; cursor: not-allowed; }
                
                #auto-camera-panel .status-card {
                    background: rgba(0,0,0,0.4);
                    border-radius: 12px;
                    padding: 12px;
                    margin-bottom: 14px;
                }
                #auto-camera-panel .status-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
                #auto-camera-panel .status-label { color: #888; font-size: 9px; text-transform: uppercase; }
                #auto-camera-panel .status-value { color: #00b894; font-weight: 700; font-size: 12px; }
                #auto-camera-panel .status-value.inactive { color: #636e72; }
                #auto-camera-panel .status-value.active { color: #ff6b6b; }
                
                #auto-camera-panel .progress-bar { height: 4px; background: rgba(255,255,255,0.1); border-radius: 2px; overflow: hidden; margin-top: 10px; }
                #auto-camera-panel .progress-fill { height: 100%; background: linear-gradient(90deg, #ff6b6b, #fdcb6e); }
                
                #auto-camera-panel .section {
                    background: rgba(0,0,0,0.25);
                    border-radius: 12px;
                    padding: 12px;
                    margin-bottom: 12px;
                }
                #auto-camera-panel .section-title { font-size: 11px; font-weight: 700; margin-bottom: 10px; color: #ff6b6b; }
                
                #auto-camera-panel .mode-tabs { display: flex; gap: 4px; flex-wrap: wrap; margin-bottom: 10px; }
                #auto-camera-panel .mode-tab {
                    flex: 1;
                    min-width: 70px;
                    padding: 8px 4px;
                    background: rgba(255,255,255,0.06);
                    border: 1px solid transparent;
                    border-radius: 8px;
                    color: #888;
                    font-size: 9px;
                    cursor: pointer;
                    text-align: center;
                }
                #auto-camera-panel .mode-tab:hover { background: rgba(255,255,255,0.1); color: #fff; }
                #auto-camera-panel .mode-tab.active {
                    background: linear-gradient(135deg, #ff6b6b, #ee5a24);
                    color: white;
                    font-weight: 600;
                }
                #auto-camera-panel .mode-tab .mode-icon { font-size: 14px; display: block; margin-bottom: 2px; }
                
                #auto-camera-panel .bone-tabs { display: flex; gap: 6px; margin-bottom: 12px; }
                #auto-camera-panel .bone-tab {
                    flex: 1;
                    padding: 8px 6px;
                    background: rgba(255,255,255,0.06);
                    border: 2px solid transparent;
                    border-radius: 8px;
                    color: #888;
                    font-size: 10px;
                    cursor: pointer;
                    text-align: center;
                }
                #auto-camera-panel .bone-tab:hover { background: rgba(255,255,255,0.1); color: #fff; }
                #auto-camera-panel .bone-tab.active {
                    background: rgba(0, 184, 148, 0.3);
                    border-color: #00b894;
                    color: #00b894;
                    font-weight: 600;
                }
                
                #auto-camera-panel .slider-row { margin: 8px 0; }
                #auto-camera-panel .slider-row label { display: flex; justify-content: space-between; margin-bottom: 4px; color: #aaa; font-size: 10px; }
                #auto-camera-panel .slider-row input[type="range"] { width: 100%; height: 6px; -webkit-appearance: none; background: rgba(255,255,255,0.1); border-radius: 3px; }
                #auto-camera-panel .slider-row input[type="range"]::-webkit-slider-thumb { -webkit-appearance: none; width: 14px; height: 14px; background: #ff6b6b; border-radius: 50%; cursor: pointer; }
                #auto-camera-panel .slider-value { color: #ff6b6b; font-weight: 700; }
                
                #auto-camera-panel .checkbox-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 4px; }
                #auto-camera-panel .checkbox-row {
                    display: flex;
                    align-items: center;
                    gap: 6px;
                    padding: 6px 8px;
                    background: rgba(255,255,255,0.04);
                    border-radius: 6px;
                    cursor: pointer;
                    font-size: 9px;
                }
                #auto-camera-panel .checkbox-row input { width: 14px; height: 14px; accent-color: #ff6b6b; }
                
                #auto-camera-panel .front-toggle {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    padding: 8px 10px;
                    background: rgba(0, 184, 148, 0.15);
                    border: 1px solid rgba(0, 184, 148, 0.3);
                    border-radius: 8px;
                    margin-bottom: 8px;
                }
                #auto-camera-panel .front-toggle label { color: #00b894; font-weight: 600; font-size: 10px; }
                #auto-camera-panel .front-toggle input { width: 16px; height: 16px; accent-color: #00b894; }
                
                /* 発話インジケーター */
                #auto-camera-panel .speaker-section {
                    display: none;
                    margin-top: 10px;
                    padding: 10px;
                    background: rgba(0,0,0,0.3);
                    border-radius: 10px;
                }
                #auto-camera-panel .speaker-section.visible { display: block; }
                #auto-camera-panel .speaker-row {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    margin-bottom: 8px;
                }
                #auto-camera-panel .speaker-row:last-child { margin-bottom: 0; }
                #auto-camera-panel .speaker-dot {
                    width: 12px;
                    height: 12px;
                    border-radius: 50%;
                    background: #444;
                    flex-shrink: 0;
                }
                #auto-camera-panel .speaker-dot.speaking {
                    background: #ff6b6b;
                    box-shadow: 0 0 10px #ff6b6b;
                    animation: pulse-speaker 0.3s infinite;
                }
                @keyframes pulse-speaker { 0%,100% { transform: scale(1); } 50% { transform: scale(1.2); } }
                #auto-camera-panel .speaker-label { flex: 0 0 60px; font-size: 10px; color: #aaa; }
                #auto-camera-panel .speaker-bar-bg {
                    flex: 1;
                    height: 6px;
                    background: rgba(255,255,255,0.1);
                    border-radius: 3px;
                    overflow: hidden;
                }
                #auto-camera-panel .speaker-bar {
                    height: 100%;
                    background: linear-gradient(90deg, #00b894, #fdcb6e);
                    border-radius: 3px;
                    width: 0%;
                    transition: width 0.1s;
                }
                
                #auto-camera-panel .reset-btn {
                    width: 100%;
                    padding: 8px;
                    background: rgba(255,255,255,0.06);
                    border: 1px solid rgba(255,255,255,0.1);
                    border-radius: 8px;
                    color: #aaa;
                    font-size: 10px;
                    cursor: pointer;
                    margin-top: 8px;
                }
                #auto-camera-panel .reset-btn:hover { background: rgba(255,255,255,0.12); color: #fff; }
            </style>
            
            <div class="panel-header">
                <div class="title">🎬 Auto Camera v3.2</div>
                <div style="display:flex;gap:6px;">
                    <button class="header-btn" id="camera-minimize-btn">−</button>
                    <button class="header-btn" id="camera-close-btn">×</button>
                </div>
            </div>
            
            <div class="panel-body">
                <div class="main-control">
                    <button class="main-btn start" id="camera-start-btn"><span>▶️</span><span>開始</span></button>
                    <button class="main-btn pause" id="camera-pause-btn" disabled><span>⏸️</span><span>一時停止</span></button>
                    <button class="main-btn stop" id="camera-stop-btn" disabled><span>⏹️</span><span>停止</span></button>
                </div>
                
                <div class="status-card">
                    <div class="status-grid">
                        <div>
                            <span class="status-label">状態</span>
                            <div class="status-value inactive" id="camera-status">停止中</div>
                        </div>
                        <div>
                            <span class="status-label">ターゲット</span>
                            <div class="status-value" id="camera-target">-</div>
                        </div>
                        <div style="grid-column: span 2;">
                            <span class="status-label">カメラワーク</span>
                            <div class="status-value" id="camera-work-type">-</div>
                        </div>
                    </div>
                    <div style="display:flex;justify-content:space-between;margin-top:8px;font-size:9px;color:#888;">
                        <span>次の切り替え</span>
                        <span id="progress-time">4.0秒</span>
                    </div>
                    <div class="progress-bar">
                        <div class="progress-fill" id="progress-fill" style="width:0%"></div>
                    </div>
                </div>
                
                <!-- 撮影モード -->
                <div class="section">
                    <div class="section-title">📹 撮影モード</div>
                    <div class="mode-tabs">
                        <div class="mode-tab active" data-mode="solo-a">
                            <span class="mode-icon">👤</span>
                            <div>1人A</div>
                        </div>
                        <div class="mode-tab" data-mode="solo-b">
                            <span class="mode-icon">👤</span>
                            <div>1人B</div>
                        </div>
                        <div class="mode-tab" data-mode="duo-center">
                            <span class="mode-icon">👥</span>
                            <div>2人中央</div>
                        </div>
                        <div class="mode-tab" data-mode="duo-switch">
                            <span class="mode-icon">🎤</span>
                            <div>交互切替</div>
                        </div>
                    </div>
                    <div id="mode-description" style="font-size:9px;color:#888;padding:8px;background:rgba(0,0,0,0.2);border-radius:6px;">
                        1体目（AIキャラ）を中心に撮影
                    </div>
                    
                    <!-- 発話インジケーター（2人モード時のみ表示） -->
                    <div class="speaker-section" id="speaker-section">
                        <div class="speaker-row">
                            <div class="speaker-dot" id="vrm1-speaking-dot"></div>
                            <span class="speaker-label">1体目 (AI)</span>
                            <div class="speaker-bar-bg"><div class="speaker-bar" id="vrm1-lip-bar"></div></div>
                        </div>
                        <div class="speaker-row">
                            <div class="speaker-dot" id="vrm2-speaking-dot"></div>
                            <span class="speaker-label">2体目 (VMC)</span>
                            <div class="speaker-bar-bg"><div class="speaker-bar" id="vrm2-lip-bar"></div></div>
                        </div>
                    </div>
                </div>
                
                <!-- フォーカス位置 -->
                <div class="section">
                    <div class="section-title">🎯 フォーカス位置</div>
                    <div class="bone-tabs">
                        <div class="bone-tab active" data-bone="head">😊 顔</div>
                        <div class="bone-tab" data-bone="chest">👔 胸</div>
                        <div class="bone-tab" data-bone="hips">🧍 腰</div>
                    </div>
                    <div class="front-toggle">
                        <label>👁️ 顔正面を優先</label>
                        <input type="checkbox" id="prefer-front" checked>
                    </div>
                    <div class="slider-row">
                        <label><span>📐 正面範囲</span><span class="slider-value" id="front-range-value">120°</span></label>
                        <input type="range" id="front-range" min="60" max="180" step="10" value="120">
                    </div>
                </div>
                
                <!-- カメラ設定 -->
                <div class="section">
                    <div class="section-title">⚙️ カメラ設定</div>
                    <div class="slider-row">
                        <label><span>🕐 切り替え間隔</span><span class="slider-value" id="interval-value">4.0秒</span></label>
                        <input type="range" id="camera-interval" min="2" max="10" step="0.5" value="4">
                    </div>
                    <div class="slider-row">
                        <label><span>🐢 カメラ速度</span><span class="slider-value" id="speed-value">ゆっくり</span></label>
                        <input type="range" id="camera-speed" min="0.005" max="0.05" step="0.005" value="0.015">
                    </div>
                    <div class="slider-row">
                        <label><span>📏 最小距離</span><span class="slider-value" id="min-dist-value">1.0</span></label>
                        <input type="range" id="camera-min-dist" min="0.3" max="2.5" step="0.1" value="1.0">
                    </div>
                    <div class="slider-row">
                        <label><span>📏 最大距離</span><span class="slider-value" id="max-dist-value">5.0</span></label>
                        <input type="range" id="camera-max-dist" min="2.0" max="8.0" step="0.1" value="5.0">
                    </div>
                </div>
                
                <!-- 2人モード設定 -->
                <div class="section" id="duo-settings" style="display:none;">
                    <div class="section-title">🎤 交互切替設定</div>
                    <div class="slider-row">
                        <label><span>🔇 無音判定</span><span class="slider-value" id="silence-value">3.0秒</span></label>
                        <input type="range" id="silence-timeout" min="1" max="8" step="0.5" value="3">
                    </div>
                    <div class="slider-row">
                        <label><span>🎤 検出感度</span><span class="slider-value" id="threshold-value">普通</span></label>
                        <input type="range" id="speak-threshold" min="0.01" max="0.15" step="0.01" value="0.05">
                    </div>
                    <div class="slider-row">
                        <label><span>📏 2人撮り距離</span><span class="slider-value" id="duo-dist-value">4.0</span></label>
                        <input type="range" id="duo-distance" min="2.5" max="8.0" step="0.1" value="4.0">
                    </div>
                </div>
                
                <!-- カメラワーク種類 -->
                <div class="section">
                    <div class="section-title">📹 カメラワーク</div>
                    <div class="checkbox-grid">
                        <label class="checkbox-row"><input type="checkbox" id="work-orbit" checked><span>🔄 オービット</span></label>
                        <label class="checkbox-row"><input type="checkbox" id="work-tilt" checked><span>↕️ ティルト</span></label>
                        <label class="checkbox-row"><input type="checkbox" id="work-dolly" checked><span>🔍 ドリー</span></label>
                        <label class="checkbox-row"><input type="checkbox" id="work-track" checked><span>◀️▶️ トラック</span></label>
                        <label class="checkbox-row"><input type="checkbox" id="work-crane" checked><span>🏗️ クレーン</span></label>
                        <label class="checkbox-row"><input type="checkbox" id="work-special" checked><span>✨ 特殊</span></label>
                        <label class="checkbox-row" style="grid-column:span 2;"><input type="checkbox" id="work-combo" checked><span>🎬 複合</span></label>
                    </div>
                </div>
                
                <button class="reset-btn" id="camera-reset-btn">🔄 設定をリセット</button>
            </div>
        `;
        
        document.body.appendChild(panel);
        this.panel = panel;
        this.setupEventListeners();
        this.setupDragMove();
    }
    
    setupEventListeners() {
        document.getElementById('camera-start-btn').addEventListener('click', () => this.start());
        document.getElementById('camera-stop-btn').addEventListener('click', () => this.stop());
        document.getElementById('camera-pause-btn').addEventListener('click', () => this.togglePause());
        
        document.getElementById('camera-minimize-btn').addEventListener('click', () => {
            this.panel.classList.toggle('collapsed');
            document.getElementById('camera-minimize-btn').textContent = this.panel.classList.contains('collapsed') ? '+' : '−';
        });
        document.getElementById('camera-close-btn').addEventListener('click', () => this.panel.style.display = 'none');
        
        // モード選択
        document.querySelectorAll('.mode-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                document.querySelectorAll('.mode-tab').forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                this.mode = tab.dataset.mode;
                this.updateModeUI();
                this.saveSettings();
            });
        });
        
        // ボーン選択
        document.querySelectorAll('.bone-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                document.querySelectorAll('.bone-tab').forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                this.focusBone = tab.dataset.bone;
                this.saveSettings();
            });
        });
        
        // 正面優先
        document.getElementById('prefer-front').addEventListener('change', (e) => {
            this.config.preferFront = e.target.checked;
            this.saveSettings();
        });
        
        document.getElementById('front-range').addEventListener('input', (e) => {
            this.config.frontAngleRange = parseInt(e.target.value);
            document.getElementById('front-range-value').textContent = `${e.target.value}°`;
            this.saveSettings();
        });
        
        // カメラ設定
        document.getElementById('camera-interval').addEventListener('input', (e) => {
            this.config.transitionDuration = parseFloat(e.target.value) * 1000;
            document.getElementById('interval-value').textContent = `${parseFloat(e.target.value).toFixed(1)}秒`;
            this.saveSettings();
        });
        
        document.getElementById('camera-speed').addEventListener('input', (e) => {
            this.config.smoothness = parseFloat(e.target.value);
            const v = parseFloat(e.target.value);
            document.getElementById('speed-value').textContent = v < 0.01 ? 'とてもゆっくり' : v < 0.02 ? 'ゆっくり' : v < 0.03 ? '普通' : '速い';
            this.saveSettings();
        });
        
        document.getElementById('camera-min-dist').addEventListener('input', (e) => {
            this.config.minDistance = parseFloat(e.target.value);
            document.getElementById('min-dist-value').textContent = parseFloat(e.target.value).toFixed(1);
            this.saveSettings();
        });
        
        document.getElementById('camera-max-dist').addEventListener('input', (e) => {
            this.config.maxDistance = parseFloat(e.target.value);
            document.getElementById('max-dist-value').textContent = parseFloat(e.target.value).toFixed(1);
            this.saveSettings();
        });
        
        // 2人モード設定
        document.getElementById('silence-timeout').addEventListener('input', (e) => {
            this.config.silenceTimeout = parseFloat(e.target.value) * 1000;
            document.getElementById('silence-value').textContent = `${parseFloat(e.target.value).toFixed(1)}秒`;
            this.saveSettings();
        });
        
        document.getElementById('speak-threshold').addEventListener('input', (e) => {
            this.config.speakingThreshold = parseFloat(e.target.value);
            const v = parseFloat(e.target.value);
            document.getElementById('threshold-value').textContent = v < 0.03 ? '高感度' : v < 0.08 ? '普通' : '低感度';
            this.saveSettings();
        });
        
        document.getElementById('duo-distance').addEventListener('input', (e) => {
            this.config.twoPersonDistance = parseFloat(e.target.value);
            document.getElementById('duo-dist-value').textContent = parseFloat(e.target.value).toFixed(1);
            this.saveSettings();
        });
        
        // カメラワークカテゴリ
        ['orbit', 'tilt', 'dolly', 'track', 'crane', 'special', 'combo'].forEach(cat => {
            const el = document.getElementById(`work-${cat}`);
            if (el) el.addEventListener('change', () => { this.enabledCategories[cat] = el.checked; this.saveSettings(); });
        });
        
        document.getElementById('camera-reset-btn').addEventListener('click', () => this.resetSettings());
    }
    
    updateModeUI() {
        const descriptions = {
            'solo-a': '1体目（AIキャラ）を中心に撮影',
            'solo-b': '2体目（Mocap用VRM）を中心に撮影',
            'duo-center': '2人の中間を常に撮影',
            'duo-switch': '🎤 口が動いている方を自動追従！',
        };
        document.getElementById('mode-description').textContent = descriptions[this.mode] || '';
        
        // 発話インジケーター表示
        const speakerSection = document.getElementById('speaker-section');
        const duoSettings = document.getElementById('duo-settings');
        
        if (this.mode === 'duo-switch') {
            speakerSection.classList.add('visible');
            duoSettings.style.display = 'block';
        } else if (this.mode === 'duo-center') {
            speakerSection.classList.remove('visible');
            duoSettings.style.display = 'block';
        } else {
            speakerSection.classList.remove('visible');
            duoSettings.style.display = 'none';
        }
        
        console.log(`📹 モード変更: ${this.mode}`);
    }
    
    setupDragMove() {
        const panel = this.panel;
        const header = panel.querySelector('.panel-header');
        let startX, startY, startLeft, startTop;
        
        header.addEventListener('mousedown', (e) => {
            if (e.target.tagName === 'BUTTON') return;
            this.isDragging = true;
            startX = e.clientX;
            startY = e.clientY;
            const rect = panel.getBoundingClientRect();
            startLeft = rect.left;
            startTop = rect.top;
            panel.style.right = 'auto';
            panel.style.left = rect.left + 'px';
            panel.style.top = rect.top + 'px';
            e.preventDefault();
        });
        
        document.addEventListener('mousemove', (e) => {
            if (!this.isDragging) return;
            panel.style.left = Math.max(0, Math.min(startLeft + e.clientX - startX, window.innerWidth - panel.offsetWidth)) + 'px';
            panel.style.top = Math.max(0, Math.min(startTop + e.clientY - startY, window.innerHeight - panel.offsetHeight)) + 'px';
        });
        
        document.addEventListener('mouseup', () => { this.isDragging = false; });
    }
    
    // =====================================================
    // 制御
    // =====================================================
    
    start() {
        if (this.isEnabled) return;
        console.log('🎬 自動カメラシステム v3.1 開始');
        this.isEnabled = true;
        this.isPaused = false;
        
        this.initializeCameraState();
        this.selectNextCameraWork();
        this.startAnimationLoop();
        
        document.getElementById('camera-start-btn').disabled = true;
        document.getElementById('camera-pause-btn').disabled = false;
        document.getElementById('camera-stop-btn').disabled = false;
        document.getElementById('camera-status').textContent = '🎬 動作中';
        document.getElementById('camera-status').classList.remove('inactive');
        document.getElementById('camera-status').classList.add('active');
        
        if (this.app.controls) this.app.controls.enabled = false;
    }
    
    stop() {
        if (!this.isEnabled) return;
        console.log('🎬 自動カメラシステム停止');
        this.isEnabled = false;
        this.isPaused = false;
        this.stopAnimationLoop();
        
        document.getElementById('camera-start-btn').disabled = false;
        document.getElementById('camera-pause-btn').disabled = true;
        document.getElementById('camera-stop-btn').disabled = true;
        document.getElementById('camera-status').textContent = '停止中';
        document.getElementById('camera-status').classList.remove('active');
        document.getElementById('camera-status').classList.add('inactive');
        document.getElementById('camera-work-type').textContent = '-';
        document.getElementById('camera-target').textContent = '-';
        document.getElementById('progress-fill').style.width = '0%';
        
        if (this.app.controls) this.app.controls.enabled = true;
    }
    
    togglePause() {
        this.isPaused = !this.isPaused;
        const btn = document.getElementById('camera-pause-btn');
        if (this.isPaused) {
            btn.innerHTML = '<span>▶️</span><span>再開</span>';
            document.getElementById('camera-status').textContent = '⏸️ 一時停止';
        } else {
            btn.innerHTML = '<span>⏸️</span><span>一時停止</span>';
            document.getElementById('camera-status').textContent = '🎬 動作中';
        }
    }
    
    initializeCameraState() {
        const camera = this.app.camera;
        const controls = this.app.controls;
        
        if (camera && controls) {
            const target = controls.target;
            const pos = camera.position;
            const dx = pos.x - target.x, dy = pos.y - target.y, dz = pos.z - target.z;
            
            this.state.radius = Math.sqrt(dx*dx + dy*dy + dz*dz);
            this.state.theta = Math.atan2(dx, dz);
            this.state.phi = Math.acos(Math.max(-1, Math.min(1, dy / this.state.radius)));
            
            this.state.targetX = target.x;
            this.state.targetY = target.y;
            this.state.targetZ = target.z;
            this.state.goalTheta = this.state.theta;
            this.state.goalPhi = this.state.phi;
            this.state.goalRadius = this.state.radius;
            this.state.goalTargetX = this.state.targetX;
            this.state.goalTargetY = this.state.targetY;
            this.state.goalTargetZ = this.state.targetZ;
        }
        
        this.state.workStartTime = Date.now();
        this.state.workHistory = [];
        this.state.vrm1LipHistory = [];
        this.state.vrm2LipHistory = [];
        this.state.currentSpeaker = null;
        this.state.lastSpeakTime = Date.now();
    }
    
    startAnimationLoop() {
        const animate = () => {
            if (!this.isEnabled) return;
            this.animationId = requestAnimationFrame(animate);
            if (!this.isPaused) this.update();
        };
        animate();
    }
    
    stopAnimationLoop() {
        if (this.animationId) { cancelAnimationFrame(this.animationId); this.animationId = null; }
    }
    
    update() {
        const now = Date.now();
        const elapsed = now - this.state.workStartTime;
        const progress = Math.min(1, elapsed / this.config.transitionDuration);
        
        document.getElementById('progress-fill').style.width = `${progress * 100}%`;
        document.getElementById('progress-time').textContent = `${Math.max(0, (this.config.transitionDuration - elapsed) / 1000).toFixed(1)}秒`;
        
        // 2人モード: リップシンク検出
        if (this.mode === 'duo-switch' || this.mode === 'duo-center') {
            this.detectSpeaker();
        }
        
        // ターゲット更新
        this.updateTarget();
        
        // カメラワーク切り替え
        if (elapsed >= this.config.transitionDuration) {
            this.selectNextCameraWork();
            this.state.workStartTime = now;
        }
        
        // ターゲット名更新
        const targetNames = { 'vrm1': '🎯 1体目', 'vrm2': '🎯 2体目', 'center': '👥 2人中央' };
        document.getElementById('camera-target').textContent = targetNames[this.state.currentTarget] || '-';
        
        this.updateCameraPosition();
        this.applyCameraToThreeJS();
    }
    
    selectNextCameraWork() {
        const enabledWorks = Object.entries(this.cameraWorkTypes)
            .filter(([key, info]) => this.enabledCategories[info.category])
            .map(([key]) => key);
        
        if (enabledWorks.length === 0) return;
        
        let newWork;
        let attempts = 0;
        const recent = this.state.workHistory.slice(-3);
        
        do {
            newWork = enabledWorks[Math.floor(Math.random() * enabledWorks.length)];
            attempts++;
        } while (recent.includes(newWork) && attempts < 20 && enabledWorks.length > 3);
        
        this.state.workHistory.push(newWork);
        if (this.state.workHistory.length > 10) this.state.workHistory.shift();
        
        // トラックモードリセット
        this._trackMode = null;
        this._trackOffsetStart = null;
        this._trackOffsetEnd = null;
        
        this.state.currentWorkType = newWork;
        this.setCameraWorkGoals(newWork);
        
        const workInfo = this.cameraWorkTypes[newWork];
        document.getElementById('camera-work-type').textContent = workInfo ? workInfo.name : newWork;
    }
    
    setCameraWorkGoals(workType) {
        const cfg = this.config;
        const facing = this.state.characterFacing;
        const frontAngle = facing + Math.PI;
        const currentTheta = this.state.theta;
        const currentPhi = this.state.phi;
        const currentRadius = this.state.radius;
        const randAngle = (Math.random() - 0.5) * this.degToRad(15);
        
        const randomFront = () => frontAngle + (Math.random() - 0.5) * this.degToRad(this.config.frontAngleRange);
        
        switch (workType) {
            case 'orbit-slow-left':
                this.state.goalTheta = cfg.preferFront ? frontAngle + this.degToRad(30 + Math.random() * 30) : currentTheta + this.degToRad(50);
                this.state.goalPhi = currentPhi + randAngle * 0.3;
                this.state.goalRadius = currentRadius;
                break;
            case 'orbit-slow-right':
                this.state.goalTheta = cfg.preferFront ? frontAngle - this.degToRad(30 + Math.random() * 30) : currentTheta - this.degToRad(50);
                this.state.goalPhi = currentPhi + randAngle * 0.3;
                this.state.goalRadius = currentRadius;
                break;
            case 'orbit-medium-left':
                this.state.goalTheta = cfg.preferFront ? frontAngle + this.degToRad(50 + Math.random() * 30) : currentTheta + this.degToRad(70);
                this.state.goalPhi = currentPhi;
                this.state.goalRadius = currentRadius;
                break;
            case 'orbit-medium-right':
                this.state.goalTheta = cfg.preferFront ? frontAngle - this.degToRad(50 + Math.random() * 30) : currentTheta - this.degToRad(70);
                this.state.goalPhi = currentPhi;
                this.state.goalRadius = currentRadius;
                break;
            case 'tilt-up-slow':
                this.state.goalTheta = cfg.preferFront ? randomFront() : currentTheta;
                this.state.goalPhi = Math.max(this.degToRad(40), currentPhi - this.degToRad(35));
                this.state.goalRadius = currentRadius;
                break;
            case 'tilt-down-slow':
                this.state.goalTheta = cfg.preferFront ? randomFront() : currentTheta;
                this.state.goalPhi = Math.min(this.degToRad(110), currentPhi + this.degToRad(35));
                this.state.goalRadius = currentRadius;
                break;
            case 'tilt-face-scan':
                this.state.goalTheta = frontAngle + randAngle;
                this.state.goalPhi = this.degToRad(75 + Math.random() * 20);
                this.state.goalRadius = Math.max(cfg.minDistance, currentRadius - 0.5);
                break;
            case 'dolly-in-slow':
                this.state.goalTheta = cfg.preferFront ? randomFront() : currentTheta;
                this.state.goalPhi = currentPhi;
                this.state.goalRadius = Math.max(cfg.minDistance, currentRadius - 1.2);
                break;
            case 'dolly-out-slow':
                this.state.goalTheta = cfg.preferFront ? randomFront() : currentTheta;
                this.state.goalPhi = currentPhi;
                this.state.goalRadius = Math.min(cfg.maxDistance, currentRadius + 1.2);
                break;
            case 'dolly-dramatic':
                this.state.goalTheta = frontAngle + randAngle;
                this.state.goalPhi = this.degToRad(80);
                this.state.goalRadius = cfg.minDistance + 0.3;
                break;
            case 'track-left-slow':
                // トラック: カメラが左から右へ水平移動（VRMを中心に回転しない）
                // theta/phi/radiusはそのまま、goalTargetのみX軸方向にオフセット
                this.state.goalTheta = currentTheta;  // 角度は変えない
                this.state.goalPhi = currentPhi;
                this.state.goalRadius = currentRadius;
                // カメラの左方向へオフセット（ワールド座標でX軸に動かす）
                this._trackOffsetStart = { x: -1.5, z: 0 };
                this._trackOffsetEnd = { x: 1.5, z: 0 };
                this._trackMode = 'left-to-right';
                break;
            case 'track-right-slow':
                // トラック: カメラが右から左へ水平移動
                this.state.goalTheta = currentTheta;  // 角度は変えない
                this.state.goalPhi = currentPhi;
                this.state.goalRadius = currentRadius;
                this._trackOffsetStart = { x: 1.5, z: 0 };
                this._trackOffsetEnd = { x: -1.5, z: 0 };
                this._trackMode = 'right-to-left';
                break;
            case 'crane-up-slow':
                this.state.goalTheta = cfg.preferFront ? randomFront() : currentTheta;
                this.state.goalPhi = Math.max(this.degToRad(25), currentPhi - this.degToRad(45));
                this.state.goalRadius = currentRadius + 0.6;
                break;
            case 'crane-down-slow':
                this.state.goalTheta = cfg.preferFront ? randomFront() : currentTheta;
                this.state.goalPhi = Math.min(this.degToRad(115), currentPhi + this.degToRad(45));
                this.state.goalRadius = Math.max(cfg.minDistance, currentRadius - 0.4);
                break;
            case 'crane-arc':
                this.state.goalTheta = cfg.preferFront ? frontAngle + this.degToRad(40) * (Math.random() > 0.5 ? 1 : -1) : currentTheta + this.degToRad(60);
                this.state.goalPhi = this.degToRad(50 + Math.random() * 30);
                this.state.goalRadius = currentRadius + 0.3;
                break;
            case 'face-closeup':
                this.state.goalTheta = frontAngle + this.degToRad((Math.random() - 0.5) * 20);
                this.state.goalPhi = this.degToRad(80 + Math.random() * 10);
                this.state.goalRadius = cfg.minDistance;
                break;
            case 'bust-shot':
                this.state.goalTheta = frontAngle + this.degToRad((Math.random() - 0.5) * 30);
                this.state.goalPhi = this.degToRad(85);
                this.state.goalRadius = cfg.minDistance + 0.8;
                break;
            case 'full-body':
                this.state.goalTheta = frontAngle + this.degToRad((Math.random() - 0.5) * 20);
                this.state.goalPhi = this.degToRad(80);
                this.state.goalRadius = cfg.maxDistance * 0.7;
                break;
            case 'low-angle':
                this.state.goalTheta = cfg.preferFront ? randomFront() : currentTheta;
                this.state.goalPhi = this.degToRad(105 + Math.random() * 15);
                this.state.goalRadius = currentRadius - 0.3;
                break;
            case 'high-angle':
                this.state.goalTheta = cfg.preferFront ? randomFront() : currentTheta;
                this.state.goalPhi = this.degToRad(40 + Math.random() * 20);
                this.state.goalRadius = currentRadius + 0.5;
                break;
            case 'orbit-dolly-in':
                this.state.goalTheta = cfg.preferFront ? frontAngle + this.degToRad(40) * (Math.random() > 0.5 ? 1 : -1) : currentTheta + this.degToRad(45);
                this.state.goalPhi = currentPhi;
                this.state.goalRadius = Math.max(cfg.minDistance, currentRadius - 1.0);
                break;
            case 'orbit-tilt-up':
                this.state.goalTheta = cfg.preferFront ? frontAngle + this.degToRad(35) * (Math.random() > 0.5 ? 1 : -1) : currentTheta + this.degToRad(50);
                this.state.goalPhi = Math.max(this.degToRad(45), currentPhi - this.degToRad(30));
                this.state.goalRadius = currentRadius;
                break;
            case 'crane-orbit':
                this.state.goalTheta = cfg.preferFront ? frontAngle + this.degToRad(30) * (Math.random() > 0.5 ? 1 : -1) : currentTheta + this.degToRad(40);
                this.state.goalPhi = Math.max(this.degToRad(35), currentPhi - this.degToRad(35));
                this.state.goalRadius = currentRadius + 0.4;
                break;
        }
        
        this.state.goalPhi = Math.max(this.degToRad(15), Math.min(this.degToRad(160), this.state.goalPhi));
        this.state.goalRadius = Math.max(cfg.minDistance, Math.min(cfg.maxDistance, this.state.goalRadius));
    }
    
    updateCameraPosition() {
        const s = this.config.smoothness;
        this.state.theta += (this.state.goalTheta - this.state.theta) * s;
        this.state.phi += (this.state.goalPhi - this.state.phi) * s;
        this.state.radius += (this.state.goalRadius - this.state.radius) * s;
        this.state.targetX += (this.state.goalTargetX - this.state.targetX) * s;
        this.state.targetY += (this.state.goalTargetY - this.state.targetY) * s;
        this.state.targetZ += (this.state.goalTargetZ - this.state.targetZ) * s;
        this.state.phi = Math.max(this.degToRad(10), Math.min(this.degToRad(170), this.state.phi));
    }
    
    applyCameraToThreeJS() {
        const camera = this.app.camera;
        const controls = this.app.controls;
        if (!camera || !controls) return;
        
        // ベースのカメラ位置（球面座標）
        let camX = this.state.targetX + this.state.radius * Math.sin(this.state.phi) * Math.sin(this.state.theta);
        let camY = this.state.targetY + this.state.radius * Math.cos(this.state.phi);
        let camZ = this.state.targetZ + this.state.radius * Math.sin(this.state.phi) * Math.cos(this.state.theta);
        
        // トラックモード: カメラを水平に移動（VRMを中心に回転しない）
        if (this._trackMode && this._trackOffsetStart && this._trackOffsetEnd) {
            const now = Date.now();
            const elapsed = now - this.state.workStartTime;
            const progress = Math.min(1, elapsed / this.config.transitionDuration);
            
            // イージング（スムーズな動き）
            const eased = this.easeInOutCubic(progress);
            
            // スタートからエンドへのオフセットを補間
            const offsetX = this._trackOffsetStart.x + (this._trackOffsetEnd.x - this._trackOffsetStart.x) * eased;
            const offsetZ = this._trackOffsetStart.z + (this._trackOffsetEnd.z - this._trackOffsetStart.z) * eased;
            
            // カメラ位置にオフセットを加算（ターゲットはそのまま）
            camX += offsetX;
            camZ += offsetZ;
        }
        
        camera.position.set(camX, camY, camZ);
        controls.target.set(this.state.targetX, this.state.targetY, this.state.targetZ);
        controls.update();
    }
    
    // イージング関数（スムーズな動き）
    easeInOutCubic(t) {
        return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    }
    
    degToRad(d) { return d * Math.PI / 180; }
    radToDeg(r) { return r * 180 / Math.PI; }
    
    saveSettings() {
        try {
            localStorage.setItem('autoCameraSettings_v31', JSON.stringify({
                mode: this.mode,
                focusBone: this.focusBone,
                config: this.config,
                enabledCategories: this.enabledCategories,
            }));
        } catch (e) {}
    }
    
    loadSettings() {
        try {
            const saved = localStorage.getItem('autoCameraSettings_v31');
            if (saved) {
                const s = JSON.parse(saved);
                if (s.mode) this.mode = s.mode;
                if (s.focusBone) this.focusBone = s.focusBone;
                if (s.config) Object.assign(this.config, s.config);
                if (s.enabledCategories) this.enabledCategories = s.enabledCategories;
                
                // UIに反映
                document.querySelectorAll('.mode-tab').forEach(t => t.classList.toggle('active', t.dataset.mode === this.mode));
                document.querySelectorAll('.bone-tab').forEach(t => t.classList.toggle('active', t.dataset.bone === this.focusBone));
                document.getElementById('prefer-front').checked = this.config.preferFront;
                document.getElementById('front-range').value = this.config.frontAngleRange;
                document.getElementById('front-range-value').textContent = `${this.config.frontAngleRange}°`;
                document.getElementById('camera-interval').value = this.config.transitionDuration / 1000;
                document.getElementById('interval-value').textContent = `${(this.config.transitionDuration / 1000).toFixed(1)}秒`;
                document.getElementById('camera-min-dist').value = this.config.minDistance;
                document.getElementById('min-dist-value').textContent = this.config.minDistance.toFixed(1);
                document.getElementById('camera-max-dist').value = this.config.maxDistance;
                document.getElementById('max-dist-value').textContent = this.config.maxDistance.toFixed(1);
                document.getElementById('silence-timeout').value = this.config.silenceTimeout / 1000;
                document.getElementById('silence-value').textContent = `${(this.config.silenceTimeout / 1000).toFixed(1)}秒`;
                document.getElementById('speak-threshold').value = this.config.speakingThreshold;
                document.getElementById('duo-distance').value = this.config.twoPersonDistance;
                document.getElementById('duo-dist-value').textContent = this.config.twoPersonDistance.toFixed(1);
                
                ['orbit', 'tilt', 'dolly', 'track', 'crane', 'special', 'combo'].forEach(cat => {
                    const el = document.getElementById(`work-${cat}`);
                    if (el) el.checked = this.enabledCategories[cat];
                });
                
                this.updateModeUI();
            }
        } catch (e) {}
    }
    
    resetSettings() {
        localStorage.removeItem('autoCameraSettings_v31');
        location.reload();
    }
    
    showPanel() { this.panel.style.display = 'block'; }
    hidePanel() { this.panel.style.display = 'none'; }
    togglePanel() { this.panel.style.display === 'none' ? this.showPanel() : this.hidePanel(); }
}

// 初期化
function initAutoCameraSystem() {
    if (window.app) {
        window.autoCameraSystem = new AutoCameraSystem(window.app);
        console.log('🎬 AutoCameraSystem v3.2 登録完了');
    } else {
        const check = setInterval(() => {
            if (window.app) {
                window.autoCameraSystem = new AutoCameraSystem(window.app);
                console.log('🎬 AutoCameraSystem v3.2 登録完了');
                clearInterval(check);
            }
        }, 100);
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => setTimeout(initAutoCameraSystem, 1500));
} else {
    setTimeout(initAutoCameraSystem, 1500);
}

window.AutoCameraSystem = AutoCameraSystem;
