/**
 * AI Director Camera System
 * Version: 2.2.0
 * 
 * - ショットサイズを切り替えた後、アングル回転ONならカメラがゆっくり動く
 * - カメラ切り替えタイミング（0.3〜30秒）
 * - アングル回転設定は一番下に配置
 */

class AIDirectorCamera {
    constructor(app) {
        this.app = app;
        this.isEnabled = false;
        this.aiProvider = 'rule';
        
        this.distanceMultiplier = 1.0;
        this.showBodyShots = false;
        
        // アングル回転機能
        this.angleRotationEnabled = false;
        this.currentCameraWork = null;
        this.cameraWorkStartTime = 0;
        this.rotationAnimationId = null;
        
        this.angleRotationConfig = {
            speed: 0.015,
            minDistance: 1.0,
            maxDistance: 5.0,
        };
        
        this.cameraWorkTypes = {
            'orbit-slow-left': { name: '🔄 左回り', category: 'orbit' },
            'orbit-slow-right': { name: '🔄 右回り', category: 'orbit' },
            'tilt-up-slow': { name: '↕️ 上へ', category: 'tilt' },
            'tilt-down-slow': { name: '↕️ 下へ', category: 'tilt' },
            'dolly-in-slow': { name: '🔍 寄り', category: 'dolly' },
            'dolly-out-slow': { name: '🔍 引き', category: 'dolly' },
            'track-left-slow': { name: '◀️ 左移動', category: 'track' },
            'track-right-slow': { name: '▶️ 右移動', category: 'track' },
            'crane-up-slow': { name: '🏗️ クレーンアップ', category: 'crane' },
            'crane-down-slow': { name: '🏗️ クレーンダウン', category: 'crane' },
            'face-closeup': { name: '✨ 顔寄り', category: 'special' },
            'orbit-dolly-in': { name: '🎬 回り込み＋寄り', category: 'combo' },
        };
        
        this.enabledCameraWorkCategories = {
            orbit: true, tilt: true, dolly: true,
            track: true, crane: true, special: true, combo: true,
        };
        
        this.rotationState = {
            theta: 0, phi: Math.PI / 2, radius: 2.5,
            goalTheta: 0, goalPhi: Math.PI / 2, goalRadius: 2.5,
            trackOffset: { x: 0, z: 0 },
            goalTrackOffset: { x: 0, z: 0 },
            baseTargetPos: { x: 0, y: 1.2, z: 0 },
        };
        
        this.faceShotSizes = {
            'ECU': { distance: 0.3, targetBone: 'head', heightOffset: 0.05, description: 'アイショット', emotion: '目のクローズアップ', icon: '👁️' },
            'CU': { distance: 0.5, targetBone: 'head', heightOffset: 0, description: 'フェイス', emotion: '顔のクローズアップ', icon: '😊' },
            'MCU': { distance: 0.9, targetBone: 'chest', heightOffset: 0.1, description: 'バストアップ', emotion: '胸から上', icon: '👔' },
            'MS': { distance: 1.3, targetBone: 'spine', heightOffset: 0, description: 'ミディアム', emotion: '腰から上', icon: '🧍‍♂️' },
            'COWBOY': { distance: 1.8, targetBone: 'hips', heightOffset: 0.3, description: 'カウボーイ', emotion: '膝上', icon: '🤠' },
            'FS': { distance: 2.5, targetBone: 'hips', heightOffset: 0, description: 'フル', emotion: '全身', icon: '🧍' },
            'LS': { distance: 4.0, targetBone: 'hips', heightOffset: 0, description: 'ロング', emotion: '全身+環境', icon: '🏞️' },
            'TWO': { distance: 3.0, targetBone: 'center', heightOffset: 0.2, description: 'ツーショット', emotion: '2人を同時に', icon: '👥' }
        };
        
        this.bodyShotSizes = {
            'UPPER': { distance: 1.1, targetBone: 'chest', heightOffset: 0, description: '上半身', emotion: 'upper body', icon: '👕' },
            'FEET_OUT': { distance: 1.6, targetBone: 'spine', heightOffset: 0.1, description: '足切れ', emotion: 'feet out of frame', icon: '🦵' },
            'WIDE': { distance: 3.5, targetBone: 'hips', heightOffset: 0, description: 'ワイド', emotion: 'wide shot', icon: '🏠' },
            'VERY_WIDE': { distance: 6.0, targetBone: 'hips', heightOffset: 0, description: '超ワイド', emotion: 'very wide shot', icon: '🌄' },
            'THIRD_PERSON': { distance: 1.8, targetBone: 'head', heightOffset: 0.3, description: 'サードパーソン', emotion: '後頭部越し', icon: '🎮', behindCamera: true },
            'ARM_FOCUS': { distance: 0.6, targetBone: 'leftUpperArm', heightOffset: 0, description: '腕に注目', emotion: 'armpit focus', icon: '💪' },
            'HAND_FOCUS': { distance: 0.4, targetBone: 'leftHand', heightOffset: 0, description: '手に注目', emotion: 'hand focus', icon: '🤚' },
            'NAVEL_FOCUS': { distance: 0.7, targetBone: 'spine', heightOffset: -0.15, description: 'お腹に注目', emotion: 'navel focus', icon: '🫃' },
            'BACK_FOCUS': { distance: 1.0, targetBone: 'chest', heightOffset: 0, description: '背中に注目', emotion: 'back focus', icon: '🔙', behindCamera: true },
            'CROTCH_FOCUS': { distance: 0.8, targetBone: 'hips', heightOffset: -0.15, description: '股間に注目', emotion: 'crotch focus', icon: '🩲' },
            'HIP_FOCUS': { distance: 0.8, targetBone: 'hips', heightOffset: 0, description: '腰に注目', emotion: 'hip focus', icon: '💃' },
            'ASS_FOCUS': { distance: 0.8, targetBone: 'hips', heightOffset: -0.1, description: '尻に注目', emotion: 'ass focus', icon: '🍑', behindCamera: true },
            'THIGH_FOCUS': { distance: 0.9, targetBone: 'leftUpperLeg', heightOffset: 0, description: '太ももに注目', emotion: 'thigh focus', icon: '🦵' },
            'FOOT_FOCUS': { distance: 0.6, targetBone: 'leftFoot', heightOffset: 0, description: '足に注目', emotion: 'foot focus', icon: '🦶' }
        };
        
        this.shotSizes = { ...this.faceShotSizes, ...this.bodyShotSizes };
        
        this.cameraAngles = {
            'FRONT': { theta: 0, description: '正面' },
            'FRONT_LEFT': { theta: Math.PI / 6, description: '正面やや左' },
            'FRONT_RIGHT': { theta: -Math.PI / 6, description: '正面やや右' },
            'DIAGONAL_LEFT': { theta: Math.PI / 4, description: '斜め45度左' },
            'DIAGONAL_RIGHT': { theta: -Math.PI / 4, description: '斜め45度右' },
            'SIDE_LEFT': { theta: Math.PI / 2, description: '真横左' },
            'SIDE_RIGHT': { theta: -Math.PI / 2, description: '真横右' },
            'OTS_LEFT': { theta: Math.PI / 5, description: '肩越し左' },
            'OTS_RIGHT': { theta: -Math.PI / 5, description: '肩越し右' }
        };
        
        this.cameraHeights = {
            'EYE_LEVEL': { phi: Math.PI / 2, description: 'アイレベル' },
            'LOW_ANGLE': { phi: Math.PI * 0.6, description: 'ローアングル' },
            'HIGH_ANGLE': { phi: Math.PI * 0.4, description: 'ハイアングル' },
            'EXTREME_LOW': { phi: Math.PI * 0.7, description: '極端なロー' },
            'BIRDS_EYE': { phi: Math.PI * 0.25, description: '俯瞰' }
        };
        
        this.currentShot = { size: 'MCU', angle: 'FRONT', height: 'EYE_LEVEL', target: 'vrm1' };
        this.shotHistory = [];
        this.lastAIDecision = null;
        this.decisionInterval = null;
        this.switchTimeout = null;
        
        this.config = {
            switchInterval: 5000,      // カメラ切り替え間隔（ms）
            aiDecisionInterval: 10000, // AI判断間隔（ms）- AIに問い合わせる頻度
            transitionDuration: 300,   // 切り替えアニメーション（ms）
            captureForAI: true,
        };
        
        this.mode = 'solo-a';
        this.panel = null;
        this.init();
    }
    
    init() {
        console.log('🎬 AI Director Camera V2.2 初期化中...');
        this.createUI();
        this.loadSettings();
        console.log('✅ AI Director Camera 初期化完了');
    }
    
    // ========================================
    // カメラ位置計算
    // ========================================
    
    calculateCameraPosition(target = 'vrm1') {
        const shot = this.currentShot;
        const sizeConfig = this.shotSizes[shot.size];
        const angleConfig = this.cameraAngles[shot.angle];
        const heightConfig = this.cameraHeights[shot.height];
        
        if (!sizeConfig || !angleConfig || !heightConfig) {
            return { position: { x: 0, y: 1.2, z: 3 }, target: { x: 0, y: 1.2, z: 0 } };
        }
        
        let targetPos = this.getTargetPosition(target, sizeConfig.targetBone);
        targetPos.y += sizeConfig.heightOffset;
        
        const facing = this.getCharacterFacing(target);
        const distance = sizeConfig.distance * this.distanceMultiplier;
        
        let theta = sizeConfig.behindCamera ? facing + angleConfig.theta : facing + Math.PI + angleConfig.theta;
        const phi = heightConfig.phi;
        
        const camX = targetPos.x + distance * Math.sin(phi) * Math.sin(theta);
        const camY = targetPos.y + distance * Math.cos(phi);
        const camZ = targetPos.z + distance * Math.sin(phi) * Math.cos(theta);
        
        return { position: { x: camX, y: camY, z: camZ }, target: targetPos, distance, theta, phi };
    }
    
    getTargetPosition(target, boneName) {
        let vrm = target === 'vrm1' ? this.app.vrm : target === 'vrm2' ? this.getAvatarVRM() : null;
        
        if (target === 'center') {
            const vrm1 = this.app.vrm;
            const vrm2 = this.getAvatarVRM();
            const pos1 = this.getBonePosition(vrm1, boneName) || { x: 0, y: 1.2, z: 0 };
            const pos2 = this.getBonePosition(vrm2, boneName) || { x: 1.5, y: 1.2, z: 0 };
            return { x: (pos1.x + pos2.x) / 2, y: Math.max(pos1.y, pos2.y), z: (pos1.z + pos2.z) / 2 };
        }
        
        if (!vrm) return { x: 0, y: 1.2, z: 0 };
        return this.getBonePosition(vrm, boneName) || { x: 0, y: 1.2, z: 0 };
    }
    
    getBonePosition(vrm, boneName) {
        if (!vrm || !vrm.humanoid) return null;
        try {
            const bone = vrm.humanoid.getNormalizedBoneNode(boneName);
            if (bone) {
                const worldPos = new THREE.Vector3();
                bone.getWorldPosition(worldPos);
                return { x: worldPos.x, y: worldPos.y, z: worldPos.z };
            }
        } catch (e) {}
        const scenePos = vrm.scene ? vrm.scene.position : { x: 0, y: 0, z: 0 };
        const heights = { 'head': 1.5, 'chest': 1.2, 'spine': 1.0, 'hips': 0.9, 'leftUpperArm': 1.3, 'leftHand': 0.8, 'leftUpperLeg': 0.6, 'leftFoot': 0.1 };
        return { x: scenePos.x || 0, y: (scenePos.y || 0) + (heights[boneName] || 1.2), z: scenePos.z || 0 };
    }
    
    getCharacterFacing(target) {
        const vrm = target === 'vrm2' ? this.getAvatarVRM() : this.app.vrm;
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
        } catch (e) {}
        return 0;
    }
    
    getAvatarVRM() {
        return window.vmcMocap?.avatarVRM || null;
    }
    
    // ========================================
    // ショット設定・適用
    // ========================================
    
    setShot(size, angle, height, target = null) {
        this.currentShot.size = size;
        this.currentShot.angle = angle;
        this.currentShot.height = height;
        if (target) this.currentShot.target = target;
        
        this.shotHistory.push({ ...this.currentShot, timestamp: Date.now() });
        if (this.shotHistory.length > 50) this.shotHistory.shift();
        
        // まずカメラをパッと切り替え
        this.applyCameraPosition();
        this.updateShotDisplay();
        
        // アングル回転がONなら、新しい位置からゆっくり動き始める
        if (this.angleRotationEnabled && this.isEnabled) {
            this.startAngleRotationFromCurrentPosition();
        }
        
        const sizeInfo = this.shotSizes[size] || {};
        const heightInfo = this.cameraHeights[height] || {};
        console.log(`🎬 ショット: ${sizeInfo.description || size} / ${this.cameraAngles[angle]?.description || angle} / ${heightInfo.description || height}`);
    }
    
    applyCameraPosition() {
        const camera = this.app.camera;
        const controls = this.app.controls;
        if (!camera || !controls) return;
        
        const camData = this.calculateCameraPosition(this.currentShot.target);
        
        if (this.config.transitionDuration <= 100) {
            camera.position.set(camData.position.x, camData.position.y, camData.position.z);
            controls.target.set(camData.target.x, camData.target.y, camData.target.z);
            controls.update();
        } else {
            this.animateCameraTo(camData);
        }
    }
    
    animateCameraTo(camData) {
        const camera = this.app.camera;
        const controls = this.app.controls;
        const startPos = { ...camera.position };
        const startTarget = { ...controls.target };
        const startTime = Date.now();
        const duration = this.config.transitionDuration;
        
        const animate = () => {
            const elapsed = Date.now() - startTime;
            const t = Math.min(1, elapsed / duration);
            const ease = 1 - Math.pow(1 - t, 3);
            
            camera.position.x = startPos.x + (camData.position.x - startPos.x) * ease;
            camera.position.y = startPos.y + (camData.position.y - startPos.y) * ease;
            camera.position.z = startPos.z + (camData.position.z - startPos.z) * ease;
            controls.target.x = startTarget.x + (camData.target.x - startTarget.x) * ease;
            controls.target.y = startTarget.y + (camData.target.y - startTarget.y) * ease;
            controls.target.z = startTarget.z + (camData.target.z - startTarget.z) * ease;
            controls.update();
            
            if (t < 1) requestAnimationFrame(animate);
        };
        animate();
    }
    
    // ========================================
    // アングル回転機能
    // ========================================
    
    startAngleRotationFromCurrentPosition() {
        // 現在のカメラ位置から回転状態を初期化
        const camData = this.calculateCameraPosition(this.currentShot.target);
        
        this.rotationState.theta = camData.theta;
        this.rotationState.phi = camData.phi;
        this.rotationState.radius = camData.distance;
        this.rotationState.trackOffset = { x: 0, z: 0 };
        this.rotationState.baseTargetPos = { ...camData.target };
        
        // 新しいカメラワークを選択
        this.currentCameraWork = this.selectRandomCameraWork();
        this.setCameraWorkGoals(this.currentCameraWork);
        this.cameraWorkStartTime = Date.now();
        
        // アニメーション開始
        if (!this.rotationAnimationId) {
            this.startRotationAnimation();
        }
        
        this.updateCameraWorkDisplay();
    }
    
    setCameraWorkGoals(workType) {
        const cfg = this.angleRotationConfig;
        const { theta, phi, radius } = this.rotationState;
        this.rotationState.goalTrackOffset = { x: 0, z: 0 };
        
        switch (workType) {
            case 'orbit-slow-left':
                this.rotationState.goalTheta = theta + this.degToRad(50);
                this.rotationState.goalPhi = phi;
                this.rotationState.goalRadius = radius;
                break;
            case 'orbit-slow-right':
                this.rotationState.goalTheta = theta - this.degToRad(50);
                this.rotationState.goalPhi = phi;
                this.rotationState.goalRadius = radius;
                break;
            case 'tilt-up-slow':
                this.rotationState.goalTheta = theta;
                this.rotationState.goalPhi = Math.max(this.degToRad(35), phi - this.degToRad(30));
                this.rotationState.goalRadius = radius;
                break;
            case 'tilt-down-slow':
                this.rotationState.goalTheta = theta;
                this.rotationState.goalPhi = Math.min(this.degToRad(115), phi + this.degToRad(30));
                this.rotationState.goalRadius = radius;
                break;
            case 'dolly-in-slow':
                this.rotationState.goalTheta = theta;
                this.rotationState.goalPhi = phi;
                this.rotationState.goalRadius = Math.max(cfg.minDistance, radius * 0.7);
                break;
            case 'dolly-out-slow':
                this.rotationState.goalTheta = theta;
                this.rotationState.goalPhi = phi;
                this.rotationState.goalRadius = Math.min(cfg.maxDistance, radius * 1.4);
                break;
            case 'track-left-slow':
                this.rotationState.goalTheta = theta;
                this.rotationState.goalPhi = phi;
                this.rotationState.goalRadius = radius;
                this.rotationState.goalTrackOffset = { x: 1.2, z: 0 };
                break;
            case 'track-right-slow':
                this.rotationState.goalTheta = theta;
                this.rotationState.goalPhi = phi;
                this.rotationState.goalRadius = radius;
                this.rotationState.goalTrackOffset = { x: -1.2, z: 0 };
                break;
            case 'crane-up-slow':
                this.rotationState.goalTheta = theta;
                this.rotationState.goalPhi = Math.max(this.degToRad(25), phi - this.degToRad(40));
                this.rotationState.goalRadius = radius + 0.5;
                break;
            case 'crane-down-slow':
                this.rotationState.goalTheta = theta;
                this.rotationState.goalPhi = Math.min(this.degToRad(115), phi + this.degToRad(40));
                this.rotationState.goalRadius = Math.max(cfg.minDistance, radius - 0.4);
                break;
            case 'face-closeup':
                this.rotationState.goalTheta = theta;
                this.rotationState.goalPhi = this.degToRad(85);
                this.rotationState.goalRadius = Math.max(cfg.minDistance, radius * 0.6);
                break;
            case 'orbit-dolly-in':
                this.rotationState.goalTheta = theta + this.degToRad(40);
                this.rotationState.goalPhi = phi;
                this.rotationState.goalRadius = Math.max(cfg.minDistance, radius * 0.75);
                break;
            default:
                this.rotationState.goalTheta = theta;
                this.rotationState.goalPhi = phi;
                this.rotationState.goalRadius = radius;
        }
        
        this.rotationState.goalPhi = Math.max(this.degToRad(15), Math.min(this.degToRad(155), this.rotationState.goalPhi));
        this.rotationState.goalRadius = Math.max(cfg.minDistance, Math.min(cfg.maxDistance, this.rotationState.goalRadius));
    }
    
    selectRandomCameraWork() {
        const enabledWorks = Object.entries(this.cameraWorkTypes)
            .filter(([key, info]) => this.enabledCameraWorkCategories[info.category])
            .map(([key]) => key);
        if (enabledWorks.length === 0) return null;
        return enabledWorks[Math.floor(Math.random() * enabledWorks.length)];
    }
    
    startRotationAnimation() {
        const animate = () => {
            if (!this.angleRotationEnabled || !this.isEnabled) {
                this.rotationAnimationId = null;
                return;
            }
            this.rotationAnimationId = requestAnimationFrame(animate);
            this.updateAngleRotation();
        };
        animate();
    }
    
    stopAngleRotation() {
        if (this.rotationAnimationId) {
            cancelAnimationFrame(this.rotationAnimationId);
            this.rotationAnimationId = null;
        }
        this.currentCameraWork = null;
        this.updateCameraWorkDisplay();
    }
    
    updateAngleRotation() {
        const camera = this.app.camera;
        const controls = this.app.controls;
        if (!camera || !controls) return;
        
        const s = this.angleRotationConfig.speed;
        this.rotationState.theta += (this.rotationState.goalTheta - this.rotationState.theta) * s;
        this.rotationState.phi += (this.rotationState.goalPhi - this.rotationState.phi) * s;
        this.rotationState.radius += (this.rotationState.goalRadius - this.rotationState.radius) * s;
        this.rotationState.trackOffset.x += (this.rotationState.goalTrackOffset.x - this.rotationState.trackOffset.x) * s;
        this.rotationState.trackOffset.z += (this.rotationState.goalTrackOffset.z - this.rotationState.trackOffset.z) * s;
        
        // ターゲット位置を動的に取得（キャラクターの動きに追従）
        const sizeConfig = this.shotSizes[this.currentShot.size];
        const targetPos = this.getTargetPosition(this.currentShot.target, sizeConfig?.targetBone || 'chest');
        targetPos.y += sizeConfig?.heightOffset || 0;
        
        let camX = targetPos.x + this.rotationState.radius * Math.sin(this.rotationState.phi) * Math.sin(this.rotationState.theta);
        let camY = targetPos.y + this.rotationState.radius * Math.cos(this.rotationState.phi);
        let camZ = targetPos.z + this.rotationState.radius * Math.sin(this.rotationState.phi) * Math.cos(this.rotationState.theta);
        
        camX += this.rotationState.trackOffset.x;
        camZ += this.rotationState.trackOffset.z;
        
        camera.position.set(camX, camY, camZ);
        controls.target.set(targetPos.x, targetPos.y, targetPos.z);
        controls.update();
    }
    
    updateCameraWorkDisplay() {
        const el = document.getElementById('current-camera-work');
        if (el) {
            el.textContent = this.currentCameraWork && this.cameraWorkTypes[this.currentCameraWork] ? this.cameraWorkTypes[this.currentCameraWork].name : '-';
        }
    }
    
    degToRad(d) { return d * Math.PI / 180; }
    
    // ========================================
    // AI演出
    // ========================================
    
    async startAIDirector() {
        console.log('🤖 AI演出モード開始');
        this.isEnabled = true;
        if (this.app.controls) this.app.controls.enabled = false;
        
        // 最初のショットを決定
        await this.decideAndApplyNextShot();
        
        // カメラ切り替えタイマー開始
        this.startSwitchTimer();
        
        this.updateStatusDisplay();
    }
    
    stopAIDirector() {
        console.log('🤖 AI演出モード停止');
        this.isEnabled = false;
        
        if (this.switchTimeout) {
            clearTimeout(this.switchTimeout);
            this.switchTimeout = null;
        }
        
        this.stopAngleRotation();
        
        if (this.app.controls) this.app.controls.enabled = true;
        
        this.updateStatusDisplay();
    }
    
    startSwitchTimer() {
        if (this.switchTimeout) {
            clearTimeout(this.switchTimeout);
        }
        
        this.switchTimeout = setTimeout(async () => {
            if (this.isEnabled) {
                await this.decideAndApplyNextShot();
                this.startSwitchTimer(); // 次のタイマーをセット
            }
        }, this.config.switchInterval);
    }
    
    async decideAndApplyNextShot() {
        const decision = await this.makeDecision();
        if (decision) {
            this.applyDecision(decision);
        }
    }
    
    async makeDecision() {
        // AIプロバイダーがrule以外で、AI判断を使う場合
        if (this.aiProvider !== 'rule') {
            try {
                const context = this.getConversationContext();
                let imageData = this.config.captureForAI ? await this.captureScreen() : null;
                const aiDecision = await this.queryAI(context, imageData);
                if (aiDecision) {
                    this.lastAIDecision = aiDecision;
                    return aiDecision;
                }
            } catch (error) {
                console.error('AI判断エラー:', error);
            }
        }
        
        // ルールベースの判断
        return this.makeRuleBasedDecision();
    }
    
    getConversationContext() {
        const chatHistory = [];
        const chatContainer = document.querySelector('.chat-container, #chat-messages, .messages');
        if (chatContainer) {
            const messages = chatContainer.querySelectorAll('.message, .chat-message');
            Array.from(messages).slice(-5).forEach(msg => chatHistory.push(msg.textContent?.trim() || ''));
        }
        return {
            recentMessages: chatHistory,
            speakingCharacter: this.detectSpeakingCharacter(),
            currentShot: this.currentShot,
            shotHistory: this.shotHistory.slice(-10)
        };
    }
    
    detectSpeakingCharacter() {
        const vrm1Lip = this.getLipSyncValue(this.app.vrm);
        const vrm2Lip = this.getLipSyncValue(this.getAvatarVRM());
        if (vrm1Lip > 0.05 && vrm1Lip > vrm2Lip) return 'vrm1';
        if (vrm2Lip > 0.05 && vrm2Lip > vrm1Lip) return 'vrm2';
        return null;
    }
    
    getLipSyncValue(vrm) {
        if (!vrm || !vrm.expressionManager) return 0;
        try {
            return Math.max(
                vrm.expressionManager.getValue('aa') || 0,
                vrm.expressionManager.getValue('ih') || 0,
                vrm.expressionManager.getValue('ou') || 0
            );
        } catch (e) { return 0; }
    }
    
    async captureScreen() {
        return new Promise((resolve) => {
            const canvas = this.app.renderer?.domElement;
            if (!canvas) { resolve(null); return; }
            try { resolve(canvas.toDataURL('image/jpeg', 0.6)); } catch (e) { resolve(null); }
        });
    }
    
    async queryAI(context, imageData) {
        const prompt = this.buildDirectorPrompt(context);
        try {
            if (this.aiProvider === 'gemini' && window.geminiClient) return await this.queryGemini(prompt, imageData);
            if (this.aiProvider === 'claude') return await this.queryClaude(prompt, imageData);
        } catch (e) { console.error('AI問い合わせエラー:', e); }
        return null;
    }
    
    buildDirectorPrompt(context) {
        const allShots = this.showBodyShots ? { ...this.faceShotSizes, ...this.bodyShotSizes } : this.faceShotSizes;
        return `あなたはプロの映画監督です。VRMキャラクターの会話シーンに最適なカメラショットを選んでください。

【現在の状況】
- 最近の会話: ${context.recentMessages.slice(-3).join(' / ')}
- 話しているキャラ: ${context.speakingCharacter || '不明'}
- 現在のショット: ${context.currentShot.size} / ${context.currentShot.angle} / ${context.currentShot.height}

【原則】
- 感情的なシーンではCU/MCU、説明シーンではMS/FS
- 同じショットを連続で使わない
- 高さも状況に応じて変える

【選択肢】
ショットサイズ: ${Object.keys(allShots).join(', ')}
アングル: ${Object.keys(this.cameraAngles).join(', ')}
高さ: ${Object.keys(this.cameraHeights).join(', ')}
ターゲット: vrm1, vrm2, center

【回答形式】JSONのみ:
{"size": "MCU", "angle": "FRONT", "height": "EYE_LEVEL", "target": "vrm1", "reason": "理由"}`;
    }
    
    async queryGemini(prompt, imageData) {
        if (!window.geminiClient) return null;
        try {
            const parts = [{ text: prompt }];
            if (imageData) parts.push({ inlineData: { mimeType: 'image/jpeg', data: imageData.split(',')[1] } });
            const response = await window.geminiClient.generateContent(parts);
            const text = response.response.text();
            const jsonMatch = text.match(/\{[\s\S]*?\}/);
            if (jsonMatch) return JSON.parse(jsonMatch[0]);
        } catch (e) { console.error('Gemini error:', e); }
        return null;
    }
    
    async queryClaude(prompt, imageData) {
        const apiKey = localStorage.getItem('claude_api_key');
        if (!apiKey) return null;
        try {
            const messages = [{ role: 'user', content: imageData ? [{ type: 'text', text: prompt }, { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: imageData.split(',')[1] }}] : prompt }];
            const response = await fetch('https://api.anthropic.com/v1/messages', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
                body: JSON.stringify({ model: 'claude-sonnet-4-20250514', max_tokens: 200, messages })
            });
            const data = await response.json();
            const text = data.content?.[0]?.text || '';
            const jsonMatch = text.match(/\{[\s\S]*?\}/);
            if (jsonMatch) return JSON.parse(jsonMatch[0]);
        } catch (e) { console.error('Claude error:', e); }
        return null;
    }
    
    makeRuleBasedDecision() {
        const speaking = this.detectSpeakingCharacter();
        const lastShot = this.shotHistory[this.shotHistory.length - 1];
        const target = speaking || (this.mode.includes('b') ? 'vrm2' : this.mode.includes('center') ? 'center' : 'vrm1');
        
        const sizes = this.showBodyShots ? 
            ['CU', 'MCU', 'MS', 'UPPER', 'COWBOY', 'FS', 'WIDE'] : 
            ['ECU', 'CU', 'MCU', 'MS', 'COWBOY', 'FS', 'LS'];
        const angles = ['FRONT', 'DIAGONAL_LEFT', 'DIAGONAL_RIGHT', 'FRONT_LEFT', 'FRONT_RIGHT', 'OTS_LEFT', 'OTS_RIGHT'];
        const heights = ['EYE_LEVEL', 'EYE_LEVEL', 'EYE_LEVEL', 'LOW_ANGLE', 'HIGH_ANGLE'];
        
        let size = sizes[Math.floor(Math.random() * sizes.length)];
        let angle = angles[Math.floor(Math.random() * angles.length)];
        let height = heights[Math.floor(Math.random() * heights.length)];
        
        // 連続を避ける
        if (lastShot?.size === size) size = sizes[(sizes.indexOf(size) + 1) % sizes.length];
        if (lastShot?.angle === angle) angle = angles[(angles.indexOf(angle) + 1) % angles.length];
        
        return { size, angle, height, target, reason: 'ルールベース' };
    }
    
    applyDecision(decision) {
        if (!decision) return;
        if (!this.shotSizes[decision.size]) decision.size = 'MCU';
        if (!this.cameraAngles[decision.angle]) decision.angle = 'FRONT';
        if (!this.cameraHeights[decision.height]) decision.height = 'EYE_LEVEL';
        
        this.setShot(decision.size, decision.angle, decision.height, decision.target);
        
        if (decision.reason) this.updateAIReasonDisplay(decision.reason);
    }
    
    // ========================================
    // UI
    // ========================================
    
    createUI() {
        const panel = document.createElement('div');
        panel.id = 'ai-director-panel';
        panel.innerHTML = this.getUIHTML();
        document.body.appendChild(panel);
        this.panel = panel;
        this.generateShotButtons();
        this.setupEventListeners();
        this.setupDragMove();
    }
    
    getUIHTML() {
        return `
            <style>
                #ai-director-panel { position: fixed; top: 80px; right: 10px; background: rgba(15,15,30,0.97); border-radius: 16px; color: #fff; font-family: -apple-system, sans-serif; font-size: 11px; z-index: 10001; min-width: 360px; max-height: 90vh; overflow: hidden; box-shadow: 0 10px 40px rgba(0,0,0,0.5); border: 1px solid rgba(255,255,255,0.08); }
                #ai-director-panel.collapsed .panel-body { display: none; }
                #ai-director-panel .panel-header { background: linear-gradient(135deg, #9b59b6, #8e44ad); padding: 12px 14px; display: flex; align-items: center; justify-content: space-between; cursor: grab; border-radius: 16px 16px 0 0; }
                #ai-director-panel.collapsed .panel-header { border-radius: 16px; }
                #ai-director-panel .panel-header .title { font-weight: 700; font-size: 13px; }
                #ai-director-panel .header-btn { background: rgba(255,255,255,0.2); border: none; color: white; width: 26px; height: 26px; border-radius: 6px; cursor: pointer; }
                #ai-director-panel .header-btn:hover { background: rgba(255,255,255,0.35); }
                #ai-director-panel .panel-body { padding: 14px; max-height: calc(90vh - 55px); overflow-y: auto; }
                #ai-director-panel .section { background: rgba(0,0,0,0.25); border-radius: 12px; padding: 12px; margin-bottom: 12px; }
                #ai-director-panel .section-title { font-size: 11px; font-weight: 700; margin-bottom: 10px; color: #9b59b6; }
                #ai-director-panel .mode-tabs { display: grid; grid-template-columns: repeat(3, 1fr); gap: 4px; margin-bottom: 10px; }
                #ai-director-panel .mode-tab { padding: 8px 4px; background: rgba(255,255,255,0.06); border: 2px solid transparent; border-radius: 8px; color: #888; font-size: 9px; cursor: pointer; text-align: center; }
                #ai-director-panel .mode-tab:hover { background: rgba(255,255,255,0.1); color: #fff; }
                #ai-director-panel .mode-tab.active { background: linear-gradient(135deg, #9b59b6, #8e44ad); border-color: #9b59b6; color: white; font-weight: 600; }
                #ai-director-panel .mode-tab .mode-icon { font-size: 16px; display: block; margin-bottom: 2px; }
                #ai-director-panel .shot-display { background: rgba(0,0,0,0.4); border-radius: 10px; padding: 12px; margin-bottom: 12px; }
                #ai-director-panel .shot-current { font-size: 14px; font-weight: 700; color: #9b59b6; margin-bottom: 8px; }
                #ai-director-panel .shot-detail { font-size: 10px; color: #888; }
                #ai-director-panel .ai-reason { font-size: 9px; color: #f39c12; margin-top: 8px; padding: 6px 8px; background: rgba(243,156,18,0.1); border-radius: 6px; display: none; }
                #ai-director-panel .checkbox-row { display: flex; align-items: center; gap: 8px; padding: 8px 10px; background: rgba(231,76,60,0.15); border: 1px solid rgba(231,76,60,0.3); border-radius: 8px; margin-bottom: 10px; cursor: pointer; }
                #ai-director-panel .checkbox-row:hover { background: rgba(231,76,60,0.25); }
                #ai-director-panel .checkbox-row input[type="checkbox"] { width: 16px; height: 16px; accent-color: #e74c3c; }
                #ai-director-panel .checkbox-row label { font-size: 11px; color: #e74c3c; cursor: pointer; font-weight: 600; }
                #ai-director-panel .shot-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 4px; margin-bottom: 10px; }
                #ai-director-panel .shot-btn { padding: 8px 4px; background: rgba(255,255,255,0.06); border: 1px solid transparent; border-radius: 6px; color: #aaa; font-size: 8px; cursor: pointer; text-align: center; }
                #ai-director-panel .shot-btn:hover { background: rgba(155,89,182,0.3); border-color: #9b59b6; color: #fff; }
                #ai-director-panel .shot-btn.active { background: #9b59b6; color: white; }
                #ai-director-panel .shot-btn .shot-icon { font-size: 16px; display: block; margin-bottom: 2px; }
                #ai-director-panel .body-shots-section { display: none; }
                #ai-director-panel .body-shots-section.visible { display: block; }
                #ai-director-panel .body-shot-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 4px; }
                #ai-director-panel .body-shot-btn { padding: 6px 4px; background: rgba(231,76,60,0.15); border: 1px solid rgba(231,76,60,0.3); border-radius: 6px; color: #e74c3c; font-size: 7px; cursor: pointer; text-align: center; }
                #ai-director-panel .body-shot-btn:hover { background: rgba(231,76,60,0.3); border-color: #e74c3c; color: #fff; }
                #ai-director-panel .body-shot-btn.active { background: #e74c3c; color: white; }
                #ai-director-panel .body-shot-btn .shot-icon { font-size: 14px; display: block; margin-bottom: 1px; }
                #ai-director-panel .height-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 4px; margin-bottom: 10px; }
                #ai-director-panel .height-btn { padding: 6px 4px; background: rgba(255,255,255,0.06); border: 1px solid transparent; border-radius: 6px; color: #aaa; font-size: 8px; cursor: pointer; text-align: center; }
                #ai-director-panel .height-btn:hover { background: rgba(155,89,182,0.3); border-color: #9b59b6; color: #fff; }
                #ai-director-panel .height-btn.active { background: #9b59b6; color: white; }
                #ai-director-panel .angle-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 4px; }
                #ai-director-panel .angle-btn { padding: 6px 4px; background: rgba(255,255,255,0.06); border: 1px solid transparent; border-radius: 6px; color: #aaa; font-size: 8px; cursor: pointer; text-align: center; }
                #ai-director-panel .angle-btn:hover { background: rgba(155,89,182,0.3); border-color: #9b59b6; color: #fff; }
                #ai-director-panel .angle-btn.active { background: #9b59b6; color: white; }
                #ai-director-panel .control-row { display: flex; gap: 8px; margin-bottom: 10px; }
                #ai-director-panel .control-btn { flex: 1; padding: 10px; border: none; border-radius: 8px; font-weight: 700; font-size: 11px; cursor: pointer; }
                #ai-director-panel .control-btn.start { background: linear-gradient(135deg, #27ae60, #2ecc71); color: white; }
                #ai-director-panel .control-btn.stop { background: linear-gradient(135deg, #e74c3c, #c0392b); color: white; }
                #ai-director-panel .control-btn:disabled { opacity: 0.5; cursor: not-allowed; }
                #ai-director-panel .ai-select { width: 100%; padding: 8px; background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.1); border-radius: 6px; color: white; font-size: 11px; }
                #ai-director-panel .slider-row { margin: 8px 0; }
                #ai-director-panel .slider-row label { display: flex; justify-content: space-between; margin-bottom: 4px; color: #aaa; font-size: 10px; }
                #ai-director-panel .slider-row input[type="range"] { width: 100%; height: 6px; -webkit-appearance: none; background: rgba(255,255,255,0.1); border-radius: 3px; }
                #ai-director-panel .slider-row input[type="range"]::-webkit-slider-thumb { -webkit-appearance: none; width: 14px; height: 14px; background: #9b59b6; border-radius: 50%; cursor: pointer; }
                #ai-director-panel .slider-value { color: #9b59b6; font-weight: 700; }
                #ai-director-panel .target-tabs { display: flex; gap: 4px; margin-top: 10px; }
                #ai-director-panel .target-tab { flex: 1; padding: 6px; background: rgba(255,255,255,0.06); border: 1px solid transparent; border-radius: 6px; color: #888; font-size: 9px; cursor: pointer; text-align: center; }
                #ai-director-panel .target-tab:hover { background: rgba(255,255,255,0.1); color: #fff; }
                #ai-director-panel .target-tab.active { background: rgba(155,89,182,0.3); border-color: #9b59b6; color: #9b59b6; }
                #ai-director-panel .distance-section { background: rgba(52,152,219,0.15); border: 1px solid rgba(52,152,219,0.3); border-radius: 10px; padding: 12px; margin-bottom: 12px; }
                #ai-director-panel .distance-section .section-title { color: #3498db; }
                #ai-director-panel .distance-section input[type="range"]::-webkit-slider-thumb { background: #3498db; }
                #ai-director-panel .distance-section .slider-value { color: #3498db; }
                #ai-director-panel .angle-rotation-section { background: rgba(46,204,113,0.1); border: 1px solid rgba(46,204,113,0.3); border-radius: 10px; padding: 12px; margin-bottom: 12px; }
                #ai-director-panel .angle-rotation-section .section-title { color: #2ecc71; }
                #ai-director-panel .angle-rotation-section input[type="range"]::-webkit-slider-thumb { background: #2ecc71; }
                #ai-director-panel .angle-rotation-section .slider-value { color: #2ecc71; }
                #ai-director-panel .angle-rotation-section .checkbox-row { background: rgba(46,204,113,0.15); border-color: rgba(46,204,113,0.3); }
                #ai-director-panel .angle-rotation-section .checkbox-row:hover { background: rgba(46,204,113,0.25); }
                #ai-director-panel .angle-rotation-section .checkbox-row input[type="checkbox"] { accent-color: #2ecc71; }
                #ai-director-panel .angle-rotation-section .checkbox-row label { color: #2ecc71; }
                #ai-director-panel .angle-rotation-details { display: none; margin-top: 10px; padding-top: 10px; border-top: 1px solid rgba(46,204,113,0.2); }
                #ai-director-panel .angle-rotation-details.visible { display: block; }
                #ai-director-panel .camera-work-status { background: rgba(0,0,0,0.3); border-radius: 6px; padding: 8px; margin-bottom: 10px; font-size: 10px; }
                #ai-director-panel .camera-work-status .label { color: #888; }
                #ai-director-panel .camera-work-status .value { color: #2ecc71; font-weight: 700; }
                #ai-director-panel .camerawork-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 4px; }
                #ai-director-panel .camerawork-check { display: flex; align-items: center; gap: 6px; padding: 5px 8px; background: rgba(255,255,255,0.04); border-radius: 4px; font-size: 9px; cursor: pointer; }
                #ai-director-panel .camerawork-check input { width: 12px; height: 12px; accent-color: #2ecc71; }
                #ai-director-panel .status-indicator { display: inline-block; padding: 2px 8px; border-radius: 10px; font-size: 9px; font-weight: 600; }
                #ai-director-panel .status-indicator.running { background: #27ae60; color: white; }
                #ai-director-panel .status-indicator.stopped { background: #7f8c8d; color: white; }
            </style>
            <div class="panel-header">
                <div class="title">🎬 AI Director Camera V2.2</div>
                <div style="display:flex;gap:6px;">
                    <button class="header-btn" id="ai-director-minimize">−</button>
                    <button class="header-btn" id="ai-director-close">×</button>
                </div>
            </div>
            <div class="panel-body">
                <!-- モード選択 -->
                <div class="section">
                    <div class="section-title">📹 撮影モード</div>
                    <div class="mode-tabs">
                        <div class="mode-tab" data-mode="solo-a"><span class="mode-icon">👤</span><div>1人A</div></div>
                        <div class="mode-tab" data-mode="solo-b"><span class="mode-icon">👤</span><div>1人B</div></div>
                        <div class="mode-tab" data-mode="duo-center"><span class="mode-icon">👥</span><div>2人</div></div>
                        <div class="mode-tab" data-mode="duo-switch"><span class="mode-icon">🎤</span><div>交互</div></div>
                        <div class="mode-tab" data-mode="manual"><span class="mode-icon">🎯</span><div>手動</div></div>
                        <div class="mode-tab active" data-mode="ai-director"><span class="mode-icon">🤖</span><div>AI演出</div></div>
                    </div>
                </div>
                
                <!-- 現在のショット -->
                <div class="shot-display">
                    <div style="display:flex;justify-content:space-between;align-items:center;">
                        <div class="shot-current" id="current-shot-name">バストアップ / 正面 / アイレベル</div>
                        <span class="status-indicator stopped" id="status-indicator">停止中</span>
                    </div>
                    <div class="shot-detail" id="current-shot-detail">胸から上</div>
                    <div class="ai-reason" id="ai-reason">AI判断: -</div>
                </div>
                
                <!-- AI演出コントロール -->
                <div class="section" id="ai-control-section">
                    <div class="section-title">🤖 AI演出</div>
                    <div class="control-row">
                        <button class="control-btn start" id="ai-start-btn">▶️ AI演出開始</button>
                        <button class="control-btn stop" id="ai-stop-btn" disabled>⏹️ 停止</button>
                    </div>
                    <div class="slider-row">
                        <label><span>🎬 カメラ切り替え間隔</span><span class="slider-value" id="switch-interval-value">5秒</span></label>
                        <input type="range" id="switch-interval" min="0.3" max="30" step="0.1" value="5">
                    </div>
                    <div style="margin-top:10px;">
                        <label style="font-size:10px;color:#888;">判断方法</label>
                        <select class="ai-select" id="ai-provider-select">
                            <option value="rule">ルールベース（高速・AI不使用）</option>
                            <option value="gemini">Gemini（画像認識対応）</option>
                            <option value="claude">Claude（高精度）</option>
                        </select>
                    </div>
                </div>
                
                <!-- カメラ距離調整 -->
                <div class="distance-section">
                    <div class="section-title">📏 カメラ距離調整</div>
                    <div class="slider-row">
                        <label><span>被写体からの距離</span><span class="slider-value" id="distance-value">1.0x</span></label>
                        <input type="range" id="distance-multiplier" min="0.5" max="3.0" step="0.1" value="1.0">
                    </div>
                </div>
                
                <!-- 手動ショット選択 -->
                <div class="section" id="manual-control-section">
                    <div class="section-title">🎯 ショットサイズ</div>
                    <div class="shot-grid" id="shot-size-grid"></div>
                    <div class="checkbox-row" id="body-shots-toggle">
                        <input type="checkbox" id="show-body-shots">
                        <label for="show-body-shots">🔞 顔以外も撮影（ボディショット）</label>
                    </div>
                    <div class="body-shots-section" id="body-shots-section">
                        <div class="section-title" style="color:#e74c3c;">🎯 ボディショット</div>
                        <div class="body-shot-grid" id="body-shot-grid"></div>
                    </div>
                    <div class="section-title" style="margin-top:12px;">📐 アングル</div>
                    <div class="angle-grid" id="angle-grid">
                        <button class="angle-btn" data-angle="SIDE_LEFT">←横</button>
                        <button class="angle-btn" data-angle="DIAGONAL_LEFT">↖斜め</button>
                        <button class="angle-btn active" data-angle="FRONT">正面</button>
                        <button class="angle-btn" data-angle="DIAGONAL_RIGHT">↗斜め</button>
                        <button class="angle-btn" data-angle="SIDE_RIGHT">横→</button>
                        <button class="angle-btn" data-angle="OTS_LEFT">肩越L</button>
                        <button class="angle-btn" data-angle="OTS_RIGHT">肩越R</button>
                        <button class="angle-btn" data-angle="FRONT_LEFT">正面L</button>
                        <button class="angle-btn" data-angle="FRONT_RIGHT">正面R</button>
                    </div>
                    <div class="section-title" style="margin-top:12px;">📷 高さ</div>
                    <div class="height-grid" id="height-grid">
                        <button class="height-btn" data-height="BIRDS_EYE">俯瞰</button>
                        <button class="height-btn" data-height="HIGH_ANGLE">ハイ</button>
                        <button class="height-btn active" data-height="EYE_LEVEL">目線</button>
                        <button class="height-btn" data-height="LOW_ANGLE">ロー</button>
                        <button class="height-btn" data-height="EXTREME_LOW">極ロー</button>
                    </div>
                    <div class="section-title" style="margin-top:12px;">🎯 ターゲット</div>
                    <div class="target-tabs">
                        <div class="target-tab active" data-target="vrm1">👤 AIキャラ</div>
                        <div class="target-tab" data-target="vrm2">👤 Mocap</div>
                        <div class="target-tab" data-target="center">👥 2人中央</div>
                    </div>
                </div>
                
                <!-- 切り替え速度 -->
                <div class="section">
                    <div class="section-title">⚡ 切り替えアニメーション</div>
                    <div class="slider-row">
                        <label><span>切り替え速度</span><span class="slider-value" id="transition-value">パッと</span></label>
                        <input type="range" id="transition-speed" min="0" max="500" step="50" value="100">
                    </div>
                </div>
                
                <!-- アングル回転設定（一番下） -->
                <div class="angle-rotation-section">
                    <div class="section-title">🔄 アングル回転</div>
                    <div class="checkbox-row">
                        <input type="checkbox" id="angle-rotation-checkbox">
                        <label for="angle-rotation-checkbox">カメラをゆっくり動かす</label>
                    </div>
                    <div class="angle-rotation-details" id="angle-rotation-details">
                        <div class="camera-work-status"><span class="label">カメラワーク: </span><span class="value" id="current-camera-work">-</span></div>
                        <div class="slider-row">
                            <label><span>🐢 カメラ速度</span><span class="slider-value" id="rotation-speed-value">ゆっくり</span></label>
                            <input type="range" id="rotation-speed" min="0.005" max="0.05" step="0.005" value="0.015">
                        </div>
                        <div class="slider-row">
                            <label><span>📏 最小距離</span><span class="slider-value" id="rotation-min-dist-value">1.0</span></label>
                            <input type="range" id="rotation-min-dist" min="0.3" max="2.5" step="0.1" value="1.0">
                        </div>
                        <div class="slider-row">
                            <label><span>📏 最大距離</span><span class="slider-value" id="rotation-max-dist-value">5.0</span></label>
                            <input type="range" id="rotation-max-dist" min="2.0" max="8.0" step="0.1" value="5.0">
                        </div>
                        <div class="section-title" style="margin-top:10px;">📹 カメラワーク種類</div>
                        <div class="camerawork-grid">
                            <label class="camerawork-check"><input type="checkbox" id="cw-orbit" checked><span>🔄 オービット</span></label>
                            <label class="camerawork-check"><input type="checkbox" id="cw-tilt" checked><span>↕️ ティルト</span></label>
                            <label class="camerawork-check"><input type="checkbox" id="cw-dolly" checked><span>🔍 ドリー</span></label>
                            <label class="camerawork-check"><input type="checkbox" id="cw-track" checked><span>◀️▶️ トラック</span></label>
                            <label class="camerawork-check"><input type="checkbox" id="cw-crane" checked><span>🏗️ クレーン</span></label>
                            <label class="camerawork-check"><input type="checkbox" id="cw-special" checked><span>✨ 特殊</span></label>
                            <label class="camerawork-check" style="grid-column:span 2;"><input type="checkbox" id="cw-combo" checked><span>🎬 複合</span></label>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
    
    generateShotButtons() {
        const faceGrid = document.getElementById('shot-size-grid');
        faceGrid.innerHTML = '';
        for (const [key, shot] of Object.entries(this.faceShotSizes)) {
            const btn = document.createElement('button');
            btn.className = 'shot-btn' + (key === this.currentShot.size ? ' active' : '');
            btn.dataset.size = key;
            btn.innerHTML = `<span class="shot-icon">${shot.icon}</span>${shot.description}`;
            faceGrid.appendChild(btn);
        }
        
        const bodyGrid = document.getElementById('body-shot-grid');
        bodyGrid.innerHTML = '';
        for (const [key, shot] of Object.entries(this.bodyShotSizes)) {
            const btn = document.createElement('button');
            btn.className = 'body-shot-btn';
            btn.dataset.size = key;
            btn.innerHTML = `<span class="shot-icon">${shot.icon}</span>${shot.description}`;
            bodyGrid.appendChild(btn);
        }
    }
    
    setupEventListeners() {
        document.getElementById('ai-director-minimize').addEventListener('click', () => {
            this.panel.classList.toggle('collapsed');
            document.getElementById('ai-director-minimize').textContent = this.panel.classList.contains('collapsed') ? '+' : '−';
        });
        document.getElementById('ai-director-close').addEventListener('click', () => this.panel.style.display = 'none');
        
        document.getElementById('distance-multiplier').addEventListener('input', (e) => {
            this.distanceMultiplier = parseFloat(e.target.value);
            document.getElementById('distance-value').textContent = `${this.distanceMultiplier.toFixed(1)}x`;
            this.applyCameraPosition();
        });
        
        // アングル回転チェックボックス
        document.getElementById('angle-rotation-checkbox').addEventListener('change', (e) => {
            this.angleRotationEnabled = e.target.checked;
            document.getElementById('angle-rotation-details').classList.toggle('visible', this.angleRotationEnabled);
            
            if (!this.angleRotationEnabled) {
                this.stopAngleRotation();
            } else if (this.isEnabled) {
                // 有効化されたら現在位置から回転開始
                this.startAngleRotationFromCurrentPosition();
            }
            this.saveSettings();
        });
        
        document.getElementById('rotation-speed').addEventListener('input', (e) => {
            this.angleRotationConfig.speed = parseFloat(e.target.value);
            const v = parseFloat(e.target.value);
            document.getElementById('rotation-speed-value').textContent = v < 0.01 ? 'とてもゆっくり' : v < 0.02 ? 'ゆっくり' : v < 0.03 ? '普通' : '速い';
            this.saveSettings();
        });
        
        document.getElementById('rotation-min-dist').addEventListener('input', (e) => {
            this.angleRotationConfig.minDistance = parseFloat(e.target.value);
            document.getElementById('rotation-min-dist-value').textContent = parseFloat(e.target.value).toFixed(1);
            this.saveSettings();
        });
        
        document.getElementById('rotation-max-dist').addEventListener('input', (e) => {
            this.angleRotationConfig.maxDistance = parseFloat(e.target.value);
            document.getElementById('rotation-max-dist-value').textContent = parseFloat(e.target.value).toFixed(1);
            this.saveSettings();
        });
        
        ['orbit', 'tilt', 'dolly', 'track', 'crane', 'special', 'combo'].forEach(cat => {
            const el = document.getElementById(`cw-${cat}`);
            if (el) el.addEventListener('change', () => { this.enabledCameraWorkCategories[cat] = el.checked; this.saveSettings(); });
        });
        
        document.getElementById('show-body-shots').addEventListener('change', (e) => {
            this.showBodyShots = e.target.checked;
            document.getElementById('body-shots-section').classList.toggle('visible', this.showBodyShots);
            this.saveSettings();
        });
        
        document.querySelectorAll('#ai-director-panel .mode-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                document.querySelectorAll('#ai-director-panel .mode-tab').forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                this.mode = tab.dataset.mode;
                this.onModeChange();
            });
        });
        
        document.getElementById('ai-start-btn').addEventListener('click', () => {
            this.startAIDirector();
            document.getElementById('ai-start-btn').disabled = true;
            document.getElementById('ai-stop-btn').disabled = false;
        });
        
        document.getElementById('ai-stop-btn').addEventListener('click', () => {
            this.stopAIDirector();
            document.getElementById('ai-start-btn').disabled = false;
            document.getElementById('ai-stop-btn').disabled = true;
        });
        
        document.getElementById('ai-provider-select').addEventListener('change', (e) => this.aiProvider = e.target.value);
        
        document.getElementById('switch-interval').addEventListener('input', (e) => {
            this.config.switchInterval = parseFloat(e.target.value) * 1000;
            document.getElementById('switch-interval-value').textContent = `${parseFloat(e.target.value).toFixed(1)}秒`;
            this.saveSettings();
        });
        
        document.getElementById('shot-size-grid').addEventListener('click', (e) => {
            const btn = e.target.closest('.shot-btn');
            if (!btn) return;
            document.querySelectorAll('#shot-size-grid .shot-btn, #body-shot-grid .body-shot-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            this.setShot(btn.dataset.size, this.currentShot.angle, this.currentShot.height);
        });
        
        document.getElementById('body-shot-grid').addEventListener('click', (e) => {
            const btn = e.target.closest('.body-shot-btn');
            if (!btn) return;
            document.querySelectorAll('#shot-size-grid .shot-btn, #body-shot-grid .body-shot-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            this.setShot(btn.dataset.size, this.currentShot.angle, this.currentShot.height);
        });
        
        document.querySelectorAll('#angle-grid .angle-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('#angle-grid .angle-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.setShot(this.currentShot.size, btn.dataset.angle, this.currentShot.height);
            });
        });
        
        document.querySelectorAll('#height-grid .height-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('#height-grid .height-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.setShot(this.currentShot.size, this.currentShot.angle, btn.dataset.height);
            });
        });
        
        document.querySelectorAll('#ai-director-panel .target-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                document.querySelectorAll('#ai-director-panel .target-tab').forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                this.currentShot.target = tab.dataset.target;
                this.applyCameraPosition();
            });
        });
        
        document.getElementById('transition-speed').addEventListener('input', (e) => {
            this.config.transitionDuration = parseInt(e.target.value);
            const val = parseInt(e.target.value);
            document.getElementById('transition-value').textContent = val > 300 ? 'ゆっくり' : val > 150 ? '普通' : val > 50 ? '速い' : 'パッと';
        });
    }
    
    onModeChange() {
        console.log(`📹 モード変更: ${this.mode}`);
        if (this.mode !== 'ai-director') {
            this.stopAIDirector();
            document.getElementById('ai-start-btn').disabled = false;
            document.getElementById('ai-stop-btn').disabled = true;
        }
        if (this.mode === 'solo-a') this.currentShot.target = 'vrm1';
        else if (this.mode === 'solo-b') this.currentShot.target = 'vrm2';
        else if (this.mode === 'duo-center') this.currentShot.target = 'center';
        this.applyCameraPosition();
        this.updateTargetTabs();
    }
    
    updateTargetTabs() {
        document.querySelectorAll('#ai-director-panel .target-tab').forEach(tab => {
            tab.classList.toggle('active', tab.dataset.target === this.currentShot.target);
        });
    }
    
    updateShotDisplay() {
        const size = this.currentShot.size;
        const angle = this.currentShot.angle;
        const height = this.currentShot.height;
        const sizeInfo = this.shotSizes[size] || {};
        const angleInfo = this.cameraAngles[angle] || {};
        const heightInfo = this.cameraHeights[height] || {};
        
        document.getElementById('current-shot-name').textContent = `${sizeInfo.description || size} / ${angleInfo.description || angle} / ${heightInfo.description || height}`;
        document.getElementById('current-shot-detail').textContent = sizeInfo.emotion || '';
        
        document.querySelectorAll('#shot-size-grid .shot-btn').forEach(btn => btn.classList.toggle('active', btn.dataset.size === size));
        document.querySelectorAll('#body-shot-grid .body-shot-btn').forEach(btn => btn.classList.toggle('active', btn.dataset.size === size));
        document.querySelectorAll('#angle-grid .angle-btn').forEach(btn => btn.classList.toggle('active', btn.dataset.angle === angle));
        document.querySelectorAll('#height-grid .height-btn').forEach(btn => btn.classList.toggle('active', btn.dataset.height === height));
    }
    
    updateAIReasonDisplay(reason) {
        const el = document.getElementById('ai-reason');
        if (el) {
            el.textContent = `🤖 ${reason}`;
            el.style.display = 'block';
        }
    }
    
    updateStatusDisplay() {
        const indicator = document.getElementById('status-indicator');
        if (indicator) {
            if (this.isEnabled) {
                indicator.textContent = '動作中';
                indicator.className = 'status-indicator running';
            } else {
                indicator.textContent = '停止中';
                indicator.className = 'status-indicator stopped';
            }
        }
    }
    
    setupDragMove() {
        const panel = this.panel;
        const header = panel.querySelector('.panel-header');
        let isDragging = false, startX, startY, startLeft, startTop;
        
        header.addEventListener('mousedown', (e) => {
            if (e.target.tagName === 'BUTTON') return;
            isDragging = true;
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
            if (!isDragging) return;
            panel.style.left = Math.max(0, Math.min(startLeft + e.clientX - startX, window.innerWidth - panel.offsetWidth)) + 'px';
            panel.style.top = Math.max(0, Math.min(startTop + e.clientY - startY, window.innerHeight - panel.offsetHeight)) + 'px';
        });
        
        document.addEventListener('mouseup', () => isDragging = false);
    }
    
    saveSettings() {
        try {
            localStorage.setItem('aiDirectorCameraSettings_v22', JSON.stringify({
                mode: this.mode,
                aiProvider: this.aiProvider,
                config: this.config,
                currentShot: this.currentShot,
                distanceMultiplier: this.distanceMultiplier,
                showBodyShots: this.showBodyShots,
                angleRotationEnabled: this.angleRotationEnabled,
                angleRotationConfig: this.angleRotationConfig,
                enabledCameraWorkCategories: this.enabledCameraWorkCategories,
            }));
        } catch (e) {}
    }
    
    loadSettings() {
        try {
            const saved = localStorage.getItem('aiDirectorCameraSettings_v22');
            if (saved) {
                const s = JSON.parse(saved);
                if (s.mode) this.mode = s.mode;
                if (s.aiProvider) this.aiProvider = s.aiProvider;
                if (s.config) Object.assign(this.config, s.config);
                if (s.currentShot) Object.assign(this.currentShot, s.currentShot);
                if (s.distanceMultiplier) this.distanceMultiplier = s.distanceMultiplier;
                if (s.showBodyShots !== undefined) this.showBodyShots = s.showBodyShots;
                if (s.angleRotationEnabled !== undefined) this.angleRotationEnabled = s.angleRotationEnabled;
                if (s.angleRotationConfig) Object.assign(this.angleRotationConfig, s.angleRotationConfig);
                if (s.enabledCameraWorkCategories) this.enabledCameraWorkCategories = s.enabledCameraWorkCategories;
                
                // UIに反映
                document.querySelectorAll('#ai-director-panel .mode-tab').forEach(t => t.classList.toggle('active', t.dataset.mode === this.mode));
                document.getElementById('ai-provider-select').value = this.aiProvider;
                document.getElementById('switch-interval').value = this.config.switchInterval / 1000;
                document.getElementById('switch-interval-value').textContent = `${(this.config.switchInterval / 1000).toFixed(1)}秒`;
                document.getElementById('transition-speed').value = this.config.transitionDuration;
                document.getElementById('distance-multiplier').value = this.distanceMultiplier;
                document.getElementById('distance-value').textContent = `${this.distanceMultiplier.toFixed(1)}x`;
                document.getElementById('show-body-shots').checked = this.showBodyShots;
                document.getElementById('body-shots-section').classList.toggle('visible', this.showBodyShots);
                document.getElementById('angle-rotation-checkbox').checked = this.angleRotationEnabled;
                document.getElementById('angle-rotation-details').classList.toggle('visible', this.angleRotationEnabled);
                document.getElementById('rotation-speed').value = this.angleRotationConfig.speed;
                document.getElementById('rotation-min-dist').value = this.angleRotationConfig.minDistance;
                document.getElementById('rotation-min-dist-value').textContent = this.angleRotationConfig.minDistance.toFixed(1);
                document.getElementById('rotation-max-dist').value = this.angleRotationConfig.maxDistance;
                document.getElementById('rotation-max-dist-value').textContent = this.angleRotationConfig.maxDistance.toFixed(1);
                
                ['orbit', 'tilt', 'dolly', 'track', 'crane', 'special', 'combo'].forEach(cat => {
                    const el = document.getElementById(`cw-${cat}`);
                    if (el) el.checked = this.enabledCameraWorkCategories[cat];
                });
                
                this.updateShotDisplay();
                this.updateTargetTabs();
            }
        } catch (e) {
            console.error('設定読み込みエラー:', e);
        }
    }
    
    showPanel() { this.panel.style.display = 'block'; }
    hidePanel() { this.panel.style.display = 'none'; }
    togglePanel() { this.panel.style.display = this.panel.style.display === 'none' ? 'block' : 'none'; }
}

function initAIDirectorCamera() {
    if (window.app) {
        window.aiDirectorCamera = new AIDirectorCamera(window.app);
        console.log('🎬 AI Director Camera V2.2 登録完了');
    } else {
        const check = setInterval(() => {
            if (window.app) {
                window.aiDirectorCamera = new AIDirectorCamera(window.app);
                console.log('🎬 AI Director Camera V2.2 登録完了');
                clearInterval(check);
            }
        }, 100);
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => setTimeout(initAIDirectorCamera, 1500));
} else {
    setTimeout(initAIDirectorCamera, 1500);
}

window.AIDirectorCamera = AIDirectorCamera;
