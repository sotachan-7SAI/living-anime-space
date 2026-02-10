// ========================================
// AI Director Camera - マルチキャラクター拡張パッチ
// ai-director-camera.jsの後に読み込んで機能を拡張
// ========================================

(function() {
    'use strict';
    
    // AI Director Cameraがロードされるのを待つ
    function waitForCamera(callback) {
        if (window.aiDirectorCamera) {
            callback(window.aiDirectorCamera);
        } else {
            const check = setInterval(() => {
                if (window.aiDirectorCamera) {
                    clearInterval(check);
                    callback(window.aiDirectorCamera);
                }
            }, 100);
        }
    }
    
    waitForCamera((camera) => {
        console.log('📷 AI Director Camera マルチキャラクター拡張適用中...');
        
        // マルチキャラクター用VRM参照
        camera.multiCharVRMs = new Map();
        
        // 現在追従中のキャラクターID
        camera.currentFollowTarget = null;
        
        // マルチキャラクターモード有効/無効
        camera.multiCharMode = false;
        
        /**
         * マルチキャラクターモードを有効化
         */
        camera.enableMultiCharMode = function() {
            this.multiCharMode = true;
            console.log('📷 マルチキャラクターモード有効');
        };
        
        /**
         * マルチキャラクターモードを無効化
         */
        camera.disableMultiCharMode = function() {
            this.multiCharMode = false;
            this.currentFollowTarget = null;
            console.log('📷 マルチキャラクターモード無効');
        };
        
        /**
         * キャラクターのVRMを登録
         */
        camera.registerCharacterVRM = function(characterId, vrm) {
            this.multiCharVRMs.set(characterId, vrm);
            console.log(`📷 キャラクターVRM登録: ${characterId}`);
        };
        
        /**
         * キャラクターのVRMを削除
         */
        camera.unregisterCharacterVRM = function(characterId) {
            this.multiCharVRMs.delete(characterId);
            console.log(`📷 キャラクターVRM削除: ${characterId}`);
        };
        
        /**
         * 指定キャラクターのVRMを取得
         */
        camera.getCharacterVRM = function(characterId) {
            // マルチキャラクターモード
            if (this.multiCharVRMs.has(characterId)) {
                return this.multiCharVRMs.get(characterId);
            }
            
            // 従来のvrm1/vrm2対応
            if (characterId === 'vrm1') {
                return this.app.vrm;
            }
            if (characterId === 'vrm2') {
                return this.getAvatarVRM();
            }
            
            return null;
        };
        
        /**
         * 話者にカメラを向ける
         */
        camera.followSpeaker = function(characterId, shotSize = 'MCU', angle = 'FRONT', height = 'EYE_LEVEL') {
            if (!this.isEnabled) {
                console.log('📷 カメラ無効のためフォロースキップ');
                return;
            }
            
            this.currentFollowTarget = characterId;
            
            // ターゲットを設定
            this.currentShot.target = characterId;
            
            // ショット適用
            this.setShot(shotSize, angle, height, characterId);
            
            console.log(`📷 話者追従: ${characterId} -> ${shotSize}/${angle}/${height}`);
        };
        
        /**
         * グループショット（全員を収める）
         */
        camera.showGroupShot = function(characterIds = null) {
            if (!this.isEnabled) return;
            
            const ids = characterIds || Array.from(this.multiCharVRMs.keys());
            const count = ids.length;
            
            if (count === 0) {
                // VRMがない場合は従来の動作
                this.setShot('MCU', 'FRONT', 'EYE_LEVEL', 'vrm1');
                return;
            }
            
            if (count === 1) {
                this.followSpeaker(ids[0], 'MCU');
            } else if (count === 2) {
                this.setShot('TWO', 'FRONT', 'EYE_LEVEL', 'center-all');
            } else {
                this.setShot('LS', 'FRONT', 'EYE_LEVEL', 'center-all');
            }
            
            console.log(`📷 グループショット: ${count}人`);
        };
        
        // getTargetPositionを拡張
        const originalGetTargetPosition = camera.getTargetPosition.bind(camera);
        camera.getTargetPosition = function(target, boneName) {
            // char_で始まる場合はマルチキャラクターシステムから取得
            if (target && target.startsWith('char_')) {
                const vrm = this.getCharacterVRM(target);
                if (vrm) {
                    const pos = this.getBonePosition(vrm, boneName);
                    if (pos) return pos;
                }
                return { x: 0, y: 1.2, z: 0 };
            }
            
            // center-all: 全キャラクターの中心
            if (target === 'center-all') {
                return this.getAllCharactersCenter(boneName);
            }
            
            // 従来の動作
            return originalGetTargetPosition(target, boneName);
        };
        
        /**
         * 全キャラクターの中心位置を計算
         */
        camera.getAllCharactersCenter = function(boneName) {
            const positions = [];
            
            // マルチキャラクターVRMから取得
            this.multiCharVRMs.forEach((vrm, id) => {
                const pos = this.getBonePosition(vrm, boneName);
                if (pos) positions.push(pos);
            });
            
            // VRMがない場合はデフォルト
            if (positions.length === 0) {
                // 従来のVRMもチェック
                const vrm1Pos = this.getBonePosition(this.app.vrm, boneName);
                if (vrm1Pos) positions.push(vrm1Pos);
                
                const vrm2 = this.getAvatarVRM();
                const vrm2Pos = this.getBonePosition(vrm2, boneName);
                if (vrm2Pos) positions.push(vrm2Pos);
            }
            
            if (positions.length === 0) {
                return { x: 0, y: 1.2, z: 0 };
            }
            
            return {
                x: positions.reduce((sum, p) => sum + p.x, 0) / positions.length,
                y: Math.max(...positions.map(p => p.y)),
                z: positions.reduce((sum, p) => sum + p.z, 0) / positions.length
            };
        };
        
        // getCharacterFacingを拡張
        const originalGetCharacterFacing = camera.getCharacterFacing.bind(camera);
        camera.getCharacterFacing = function(target) {
            // char_で始まる場合
            if (target && target.startsWith('char_')) {
                const vrm = this.getCharacterVRM(target);
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
        
        /**
         * 話者変更時の自動カメラ切り替え
         * DialogueDirectorからのコールバック用
         */
        camera.onSpeakerChange = function(characterId, characterName) {
            if (!this.isEnabled || !this.multiCharMode) return;
            
            console.log(`📷 話者変更検出: ${characterName} (${characterId})`);
            
            // 少し遅延してから追従（自然な切り替え）
            setTimeout(() => {
                // ランダムにショットサイズを選択（バリエーション）
                const shotSizes = ['MCU', 'CU', 'MS'];
                const angles = ['FRONT', 'FRONT_LEFT', 'FRONT_RIGHT', 'DIAGONAL_LEFT', 'DIAGONAL_RIGHT'];
                
                const shot = shotSizes[Math.floor(Math.random() * shotSizes.length)];
                const angle = angles[Math.floor(Math.random() * angles.length)];
                
                this.followSpeaker(characterId, shot, angle, 'EYE_LEVEL');
            }, 200);
        };
        
        // MultiCharacterManagerとの連携設定
        window.addEventListener('multichar:turnStart', (e) => {
            if (camera.multiCharMode && camera.isEnabled) {
                camera.onSpeakerChange(e.detail.speaker.id, e.detail.speaker.name);
            }
        });
        
        window.addEventListener('multichar:conversationStart', () => {
            if (camera.multiCharMode && camera.isEnabled) {
                camera.showGroupShot();
            }
        });
        
        window.addEventListener('multichar:conversationEnd', () => {
            camera.currentFollowTarget = null;
        });
        
        console.log('✅ AI Director Camera マルチキャラクター拡張適用完了');
    });
})();
