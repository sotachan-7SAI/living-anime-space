// ========================================
// MultiCharacterManager - パイプライン先読み対応版
// DialogueDirector / PipelinedDialogueDirector + カメラ連携 + VRM管理
// ========================================

import { CharacterUnit } from './character-unit.js';
import { DialogueDirector } from './dialogue-director.js';
import { PipelinedDialogueDirector } from './pipelined-dialogue-director.js';

export class MultiCharacterManager {
    constructor(app) {
        this.app = app; // VRMAIViewer参照
        
        // ★ パイプラインモード切替
        this.usePipeline = true; // trueで先読み有効
        
        // Directorを作成（パイプライン版 or 従来版）
        this.director = this.usePipeline 
            ? new PipelinedDialogueDirector()
            : new DialogueDirector();
        
        // キャラクター用VRM管理
        this.characterVRMs = new Map(); // characterId -> vrm
        this.vrmLoader = null;
        
        // 位置プリセット（1～4人）
        this.positionPresets = {
            1: [{ x: 0, y: 0, z: 0 }],
            2: [
                { x: -0.6, y: 0, z: 0 },
                { x: 0.6, y: 0, z: 0 }
            ],
            3: [
                { x: -1.0, y: 0, z: 0 },
                { x: 0, y: 0, z: 0.3 },
                { x: 1.0, y: 0, z: 0 }
            ],
            4: [
                { x: -1.2, y: 0, z: 0 },
                { x: -0.4, y: 0, z: 0.4 },
                { x: 0.4, y: 0, z: 0.4 },
                { x: 1.2, y: 0, z: 0 }
            ]
        };
        
        // カメラ追従設定
        this.cameraFollowEnabled = true;
        this.currentSpeakerTarget = null;
        
        // コールバック設定
        this.setupDirectorCallbacks();
        
        // AI Director Camera参照
        this.aiDirectorCamera = null;
        
        console.log(`🎭 MultiCharacterManager初期化完了 (パイプライン: ${this.usePipeline ? 'ON' : 'OFF'})`);
    }
    
    /**
     * パイプラインモードを切り替え
     */
    setPipelineMode(enabled) {
        if (this.director.isRunning) {
            console.warn('⚠️ 会話中はモード切替できません');
            return;
        }
        
        this.usePipeline = enabled;
        
        // Directorを再作成
        const oldCharacters = this.director.getAllCharacters();
        const oldTurnOrder = this.director.turnOrder;
        
        this.director = enabled 
            ? new PipelinedDialogueDirector()
            : new DialogueDirector();
        
        // キャラクターを移行
        oldCharacters.forEach(char => {
            this.director.addCharacter(char);
        });
        this.director.turnOrder = oldTurnOrder;
        
        this.setupDirectorCallbacks();
        
        console.log(`🔄 パイプラインモード: ${enabled ? 'ON（先読み有効）' : 'OFF（従来モード）'}`);
    }
    
    /**
     * ★ 順次計算モードを設定
     * @param {boolean} enabled - true: 上から順に1人ずつ計算、false: 並列計算
     */
    setSequentialCalculation(enabled) {
        if (this.usePipeline && this.director.sequentialCalculation !== undefined) {
            this.director.sequentialCalculation = enabled;
            console.log(`📋 順次計算モード: ${enabled ? 'ON（上から順）' : 'OFF（並列）'}`);
        } else {
            console.warn('⚠️ 順次計算モードはパイプラインモード有効時のみ設定可能です');
        }
    }
    
    /**
     * AI Director Cameraを設定
     */
    setAIDirectorCamera(camera) {
        this.aiDirectorCamera = camera;
        
        // マルチキャラクターモード対応のためカメラを拡張
        if (camera) {
            this.extendCameraForMultiCharacter(camera);
        }
        
        console.log('📷 AI Director Camera連携設定完了');
    }
    
    /**
     * AI Director Cameraをマルチキャラクター対応に拡張
     */
    extendCameraForMultiCharacter(camera) {
        // VRM取得メソッドを拡張
        camera.getCharacterVRM = (characterId) => {
            return this.characterVRMs.get(characterId);
        };
        
        // ターゲット取得を拡張（vrm1, vrm2, char_XXX 形式）
        const originalGetTargetPosition = camera.getTargetPosition.bind(camera);
        camera.getTargetPosition = (target, boneName) => {
            // char_で始まる場合はマルチキャラクターシステムから取得
            if (target && target.startsWith('char_')) {
                const vrm = this.characterVRMs.get(target);
                if (vrm) {
                    return camera.getBonePosition(vrm, boneName) || { x: 0, y: 1.2, z: 0 };
                }
            }
            
            // centerで全キャラクターの中心を計算
            if (target === 'center-all') {
                return this.getAllCharactersCenter(boneName, camera);
            }
            
            // それ以外は元のメソッド
            return originalGetTargetPosition(target, boneName);
        };
        
        // キャラクター向き取得を拡張
        const originalGetCharacterFacing = camera.getCharacterFacing.bind(camera);
        camera.getCharacterFacing = (target) => {
            if (target && target.startsWith('char_')) {
                const vrm = this.characterVRMs.get(target);
                if (vrm && vrm.humanoid) {
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
                }
                return 0;
            }
            return originalGetCharacterFacing(target);
        };
        
        // 話者追従メソッド追加
        camera.followSpeaker = (characterId, shotSize = 'MCU') => {
            if (!camera.isEnabled) return;
            
            const char = this.director.getCharacter(characterId);
            if (!char) return;
            
            console.log(`📷 カメラ追従: ${char.name} (${characterId})`);
            
            // ターゲットを話者に設定
            camera.currentShot.target = characterId;
            
            // ショットを適用
            camera.setShot(shotSize, 'FRONT', 'EYE_LEVEL', characterId);
        };
        
        // グループショットメソッド追加
        camera.showGroupShot = (characterIds = null) => {
            if (!camera.isEnabled) return;
            
            const ids = characterIds || Array.from(this.characterVRMs.keys());
            const count = ids.length;
            
            if (count === 0) return;
            
            if (count === 1) {
                camera.followSpeaker(ids[0]);
            } else if (count === 2) {
                camera.currentShot.target = 'center-all';
                camera.setShot('TWO', 'FRONT', 'EYE_LEVEL', 'center-all');
            } else {
                camera.currentShot.target = 'center-all';
                camera.setShot('LS', 'FRONT', 'EYE_LEVEL', 'center-all');
            }
            
            console.log(`📷 グループショット: ${count}人`);
        };
    }
    
    /**
     * 全キャラクターの中心位置を計算
     */
    getAllCharactersCenter(boneName, camera) {
        const positions = [];
        
        this.characterVRMs.forEach((vrm, id) => {
            const pos = camera.getBonePosition(vrm, boneName);
            if (pos) positions.push(pos);
        });
        
        if (positions.length === 0) {
            return { x: 0, y: 1.2, z: 0 };
        }
        
        const center = {
            x: positions.reduce((sum, p) => sum + p.x, 0) / positions.length,
            y: Math.max(...positions.map(p => p.y)),
            z: positions.reduce((sum, p) => sum + p.z, 0) / positions.length
        };
        
        return center;
    }
    
    /**
     * DialogueDirectorのコールバックを設定
     */
    setupDirectorCallbacks() {
        // 会話開始
        this.director.onConversationStart = (topic) => {
            console.log(`🎬 会話開始: ${topic}`);
            
            // グループショットで開始
            if (this.aiDirectorCamera && this.cameraFollowEnabled) {
                this.aiDirectorCamera.showGroupShot();
            }
            
            // UIに通知
            this.dispatchEvent('conversationStart', { topic });
        };
        
        // 会話終了
        this.director.onConversationEnd = () => {
            console.log('🎬 会話終了');
            this.currentSpeakerTarget = null;
            
            // UIに通知
            this.dispatchEvent('conversationEnd', {});
        };
        
        // ターン開始（話者が変わった）
        this.director.onTurnStart = (speaker, type) => {
            console.log(`👤 ${speaker.name}のターン開始`);
            this.currentSpeakerTarget = speaker.id;
            
            // カメラを話者に向ける
            if (this.aiDirectorCamera && this.cameraFollowEnabled) {
                // 少し遅延して自然に切り替え
                setTimeout(() => {
                    this.aiDirectorCamera.followSpeaker(speaker.id, 'MCU');
                }, 100);
            }
            
            // UIに通知
            this.dispatchEvent('turnStart', { speaker, type });
        };
        
        // ターン終了
        this.director.onTurnEnd = (speaker, text, emotion, motion) => {
            console.log(`👤 ${speaker.name}のターン終了`);
            
            // ★ 感情とモーション情報もUIに通知
            this.dispatchEvent('turnEnd', { speaker, text, emotion, motion });
        };
        
        // 発話開始
        this.director.onSpeechStart = (char) => {
            console.log(`🎤 ${char.name}発話開始`);
            
            // UIに通知（発話中表示など）
            this.dispatchEvent('speechStart', { character: char });
        };
        
        // 発話終了
        this.director.onSpeechEnd = (char) => {
            console.log(`🎤 ${char.name}発話終了`);
            
            // UIに通知
            this.dispatchEvent('speechEnd', { character: char });
        };
        
        // ★ パイプライン専用コールバック
        if (this.usePipeline && this.director.onPipelineUpdate) {
            // パイプライン状態更新
            this.director.onPipelineUpdate = (status) => {
                this.dispatchEvent('pipelineUpdate', { status });
            };
            
            // テキスト先読み完了（ログに表示、音声まだ）
            this.director.onPreviewTextReady = (entry) => {
                console.log(`📝 先読みテキスト: ${entry.speakerName}: "${entry.responseText.substring(0, 30)}..."`);
                this.dispatchEvent('previewTextReady', { entry });
            };
            
            // 音声準備完了
            this.director.onAudioReady = (entry) => {
                console.log(`🔊 音声準備完了: ${entry.speakerName}`);
                this.dispatchEvent('audioReady', { entry });
            };
        }
    }
    
    /**
     * カスタムイベントを発火
     */
    dispatchEvent(eventName, detail) {
        window.dispatchEvent(new CustomEvent(`multichar:${eventName}`, { detail }));
    }
    
    /**
     * キャラクターを作成して追加
     */
    async createCharacter(config) {
        const unit = new CharacterUnit({
            id: config.id || `char_${Date.now()}`,
            name: config.name,
            personality: config.personality,
            llmType: config.llmType || 'chatgpt',
            llmApiKey: config.apiKey,
            voiceType: config.voiceType || 'sbv2',
            voiceModel: config.voiceModel || 'jvnv-F1-jp',
            vrmPath: config.vrmPath,
            conversationContext: config.conversationContext || ''  // ★ 会話コンテキストを渡す
        });
        
        // LLM初期化
        if (config.apiKey) {
            await unit.initLLM();
        }
        
        // 音声初期化
        await unit.initVoice();
        
        // Directorに追加
        this.director.addCharacter(unit);
        
        return unit;
    }
    
    /**
     * キャラクターにVRMをロード
     */
    async loadVRMForCharacter(characterId, vrmPath) {
        const unit = this.director.getCharacter(characterId);
        if (!unit) {
            console.error(`❌ キャラクター ${characterId} が見つかりません`);
            return null;
        }
        
        try {
            // GLTFLoaderを使用
            const loader = new window.GLTFLoaderClass();
            const { VRMLoaderPlugin } = await import('@pixiv/three-vrm');
            loader.register((parser) => new VRMLoaderPlugin(parser));
            
            const gltf = await loader.loadAsync(vrmPath);
            const vrm = gltf.userData.vrm;
            
            if (!vrm) {
                throw new Error('VRMデータが見つかりません');
            }
            
            // 既存のVRMがあれば削除
            if (this.characterVRMs.has(characterId)) {
                const oldVrm = this.characterVRMs.get(characterId);
                if (oldVrm && oldVrm.scene) {
                    this.app.scene.remove(oldVrm.scene);
                }
            }
            
            // シーンに追加
            this.app.scene.add(vrm.scene);
            
            // 管理マップに登録
            this.characterVRMs.set(characterId, vrm);
            
            // CharacterUnitにVRMを設定
            unit.setVRM(vrm);
            unit.vrmPath = vrmPath;
            
            // 位置を更新
            this.updateCharacterPositions();
            
            console.log(`✅ VRMロード完了: ${unit.name} (${characterId})`);
            
            return vrm;
            
        } catch (error) {
            console.error(`❌ VRMロードエラー: ${characterId}`, error);
            return null;
        }
    }
    
    /**
     * 既存のVRMをキャラクターに割り当て
     */
    assignExistingVRM(characterId, vrm) {
        const unit = this.director.getCharacter(characterId);
        if (!unit) return false;
        
        // 管理マップに登録
        this.characterVRMs.set(characterId, vrm);
        
        // CharacterUnitにVRMを設定
        unit.setVRM(vrm);
        
        // 位置を更新
        this.updateCharacterPositions();
        
        console.log(`✅ VRM割り当て完了: ${unit.name} (${characterId})`);
        
        return true;
    }
    
    /**
     * キャラクターの位置を更新
     */
    updateCharacterPositions() {
        const count = this.characterVRMs.size;
        const positions = this.positionPresets[count] || this.positionPresets[4];
        
        let index = 0;
        this.director.getAllCharacters().forEach(unit => {
            if (this.characterVRMs.has(unit.id) && index < positions.length) {
                const pos = positions[index];
                unit.setPosition(pos.x, pos.y, pos.z);
                index++;
            }
        });
        
        console.log(`📍 キャラクター位置更新: ${count}体`);
    }
    
    /**
     * キャラクターを削除
     */
    removeCharacter(characterId) {
        // VRMをシーンから削除
        const vrm = this.characterVRMs.get(characterId);
        if (vrm && vrm.scene) {
            this.app.scene.remove(vrm.scene);
        }
        this.characterVRMs.delete(characterId);
        
        // Directorから削除
        this.director.removeCharacter(characterId);
        
        // 位置を更新
        this.updateCharacterPositions();
        
        console.log(`🗑️ キャラクター削除: ${characterId}`);
    }
    
    /**
     * 会話を開始
     * @param {string} topic - 会話のお題
     * @param {string} conversationContext - 会話コンテキスト（お題・演出指示・シーン設定等）
     */
    async startConversation(topic = '', conversationContext = '') {
        if (this.director.characters.size === 0) {
            console.warn('⚠️ キャラクターが登録されていません');
            return;
        }
        
        // ★ 会話コンテキストがあればDirectorと全キャラクターに設定
        if (conversationContext) {
            this.director.setConversationContext(conversationContext);
        }
        
        await this.director.start(topic);
    }
    
    /**
     * 会話を停止
     */
    stopConversation() {
        this.director.stop();
    }
    
    /**
     * 会話を一時停止
     */
    pauseConversation() {
        this.director.pause();
    }
    
    /**
     * 会話を再開
     */
    resumeConversation() {
        this.director.resume();
    }
    
    /**
     * ターンモードを設定
     */
    setTurnMode(mode) {
        this.director.turnMode = mode;
        console.log(`🔄 ターンモード: ${mode}`);
    }
    
    /**
     * ★ ターン数制限を設定
     */
    setMaxTurns(maxTurns) {
        this.director.setMaxTurns(maxTurns);
    }
    
    /**
     * ★ 会話コンテキストを設定
     */
    setConversationContext(context) {
        this.director.setConversationContext(context);
    }
    
    /**
     * カメラ追従を設定
     */
    setCameraFollow(enabled) {
        this.cameraFollowEnabled = enabled;
        console.log(`📷 カメラ追従: ${enabled ? 'ON' : 'OFF'}`);
    }
    
    /**
     * 現在の話者を取得
     */
    getCurrentSpeaker() {
        if (!this.director.currentSpeakerId) return null;
        return this.director.getCharacter(this.director.currentSpeakerId);
    }
    
    /**
     * 全キャラクターを取得
     */
    getAllCharacters() {
        return this.director.getAllCharacters();
    }
    
    /**
     * 会話履歴を取得
     */
    getConversationHistory() {
        return this.director.getConversationHistory();
    }
    
    /**
     * 会話履歴をクリア
     */
    clearHistory() {
        this.director.clearAllHistory();
    }
    
    /**
     * ★ パイプライン状態を取得
     */
    getPipelineStatus() {
        if (this.usePipeline && this.director.getPipelineStatus) {
            return this.director.getPipelineStatus();
        }
        return null;
    }
    
    /**
     * 設定をJSONにエクスポート
     */
    toJSON() {
        return {
            turnMode: this.director.turnMode,
            cameraFollowEnabled: this.cameraFollowEnabled,
            usePipeline: this.usePipeline,
            characters: this.director.getAllCharacters().map(c => c.toJSON())
        };
    }
    
    /**
     * 設定をJSONからインポート
     */
    async fromJSON(json, apiKeys = {}) {
        // 既存のキャラクターをクリア
        this.director.getAllCharacters().forEach(c => {
            this.removeCharacter(c.id);
        });
        
        // 設定を復元
        this.director.turnMode = json.turnMode || 'round-robin';
        this.cameraFollowEnabled = json.cameraFollowEnabled !== false;
        
        if (json.usePipeline !== undefined) {
            this.setPipelineMode(json.usePipeline);
        }
        
        // キャラクターを復元
        for (const charData of json.characters) {
            await this.createCharacter({
                ...charData,
                apiKey: apiKeys[charData.llmType] || null
            });
            
            // VRMがあればロード
            if (charData.vrmPath) {
                await this.loadVRMForCharacter(charData.id, charData.vrmPath);
            }
        }
        
        console.log(`📂 設定ロード完了: ${json.characters.length}キャラクター`);
    }
}

// グローバルにエクスポート
window.MultiCharacterManager = MultiCharacterManager;
