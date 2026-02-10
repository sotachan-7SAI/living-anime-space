// ========================================
// Multi-Character Auto Placement System v1.1
// キャラクター自動配置機能
// ========================================

(function() {
    'use strict';
    
    console.log('📍 Auto Placement System v1.1 読み込み開始');
    
    class AutoPlacementSystem {
        constructor(manager) {
            this.manager = manager;
            this.app = manager.app;
            this.isActive = false;
            
            // 配置設定
            this.centerPosition = { x: 0, y: 0, z: 0 };
            this.radius = 1.5; // 中心からの距離
            this.characterCount = 4;
            
            // 3Dオブジェクト
            this.centerNull = null; // 中心ヌル（赤い球体）
            this.characterMarkers = []; // キャラ位置マーカー（青い球体）
            this.connectionLines = []; // 中心からキャラへの線
            
            // TransformControls
            this.transformControls = null;
            
            // UI要素
            this.panel = null;
            
            console.log('📍 AutoPlacementSystem初期化完了');
        }
        
        // ========================================
        // 配置モード開始
        // ========================================
        
        activate() {
            if (this.isActive) return;
            this.isActive = true;
            
            // 有効なキャラクター数を取得（VRMの有無に関係なく）
            const enabledChars = this.getEnabledCharactersWithVRM();
            
            // VRMが読み込まれているキャラがいない場合は警告だけ出す
            if (enabledChars.length === 0) {
                console.warn('⚠️ VRMが読み込まれたキャラがいません。先にVRMを読み込んでください。');
                // それでも配置モードは開始（プレビュー用）
            }
            
            this.characterCount = Math.max(enabledChars.length, 2); // 最低2人分のマーカーを表示
            
            // 現在のキャラ位置の中心を計算
            this.calculateInitialCenter(enabledChars);
            
            // 3Dオブジェクトを作成
            this.createCenterNull();
            this.createCharacterMarkers();
            this.createConnectionLines();
            
            // TransformControlsを設定
            this.setupTransformControls();
            
            // UIパネルを表示
            this.showPanel();
            
            // 初期配置を適用
            this.updateCharacterPositions();
            
            console.log('📍 自動配置モード開始');
        }
        
        // ========================================
        // 配置モード終了
        // ========================================
        
        deactivate(apply = false) {
            if (!this.isActive) return;
            
            if (apply) {
                // 配置を確定
                this.applyFinalPositions();
            }
            
            // 3Dオブジェクトを削除
            this.removeCenterNull();
            this.removeCharacterMarkers();
            this.removeConnectionLines();
            
            // TransformControlsを削除
            this.removeTransformControls();
            
            // UIパネルを非表示
            this.hidePanel();
            
            this.isActive = false;
            
            console.log(`📍 自動配置モード終了 (${apply ? '適用' : 'キャンセル'})`);
        }
        
        // ========================================
        // 有効なキャラクター取得
        // ========================================
        
        getEnabledCharactersWithVRM() {
            const result = [];
            if (!this.manager || !this.manager.loadedVRMs) return result;
            
            // まずcharactersマップを試す
            if (this.manager.characters && this.manager.characters.size > 0) {
                this.manager.characters.forEach((unit, id) => {
                    if (unit.enabled && this.manager.loadedVRMs.has(id)) {
                        result.push({
                            id,
                            unit,
                            vrmData: this.manager.loadedVRMs.get(id)
                        });
                    }
                });
            } else {
                // charactersが空の場合はloadedVRMsから直接取得
                // UI設定からキャラ情報を取得
                const charConfigs = window.multiCharUI?.characterConfigs || [];
                
                this.manager.loadedVRMs.forEach((vrmData, id) => {
                    const config = charConfigs.find(c => c.id === id);
                    if (config && config.enabled !== false) {
                        result.push({
                            id,
                            unit: { 
                                name: config.name || id,
                                enabled: config.enabled !== false,
                                position: { x: 0, y: 0, z: 0 }
                            },
                            vrmData: vrmData
                        });
                    } else if (!config) {
                        // configがない場合もloadedVRMsにあれば追加
                        result.push({
                            id,
                            unit: { 
                                name: id,
                                enabled: true,
                                position: { x: 0, y: 0, z: 0 }
                            },
                            vrmData: vrmData
                        });
                    }
                });
            }
            
            console.log('📍 getEnabledCharactersWithVRM:', result.length, '体');
            return result;
        }
        
        // ========================================
        // 初期中心位置を計算
        // ========================================
        
        calculateInitialCenter(enabledChars) {
            if (enabledChars.length === 0) {
                this.centerPosition = { x: 0, y: 0, z: 0 };
                return;
            }
            
            let sumX = 0, sumZ = 0;
            enabledChars.forEach(char => {
                if (char.vrmData.vrm && char.vrmData.vrm.scene) {
                    sumX += char.vrmData.vrm.scene.position.x;
                    sumZ += char.vrmData.vrm.scene.position.z;
                }
            });
            
            this.centerPosition = {
                x: sumX / enabledChars.length,
                y: 0,
                z: sumZ / enabledChars.length
            };
        }
        
        // ========================================
        // 中心ヌル作成
        // ========================================
        
        createCenterNull() {
            const THREE = window.THREE;
            if (!THREE || !this.app || !this.app.scene) return;
            
            // 赤い半透明の球体
            const geometry = new THREE.SphereGeometry(0.15, 32, 32);
            const material = new THREE.MeshBasicMaterial({
                color: 0xff3333,
                transparent: true,
                opacity: 0.7
            });
            
            this.centerNull = new THREE.Mesh(geometry, material);
            this.centerNull.position.set(
                this.centerPosition.x,
                this.centerPosition.y + 0.5, // 少し浮かせる
                this.centerPosition.z
            );
            this.centerNull.name = 'AutoPlacement_CenterNull';
            
            // リング（装飾）
            const ringGeometry = new THREE.RingGeometry(0.18, 0.22, 32);
            const ringMaterial = new THREE.MeshBasicMaterial({
                color: 0xff6666,
                transparent: true,
                opacity: 0.5,
                side: THREE.DoubleSide
            });
            const ring = new THREE.Mesh(ringGeometry, ringMaterial);
            ring.rotation.x = -Math.PI / 2;
            this.centerNull.add(ring);
            
            this.app.scene.add(this.centerNull);
            
            console.log('📍 中心ヌル作成');
        }
        
        removeCenterNull() {
            if (this.centerNull && this.app && this.app.scene) {
                this.app.scene.remove(this.centerNull);
                this.centerNull.geometry.dispose();
                this.centerNull.material.dispose();
                this.centerNull = null;
            }
        }
        
        // ========================================
        // キャラクターマーカー作成
        // ========================================
        
        createCharacterMarkers() {
            const THREE = window.THREE;
            if (!THREE || !this.app || !this.app.scene) return;
            
            // VRMがあるキャラ + 有効なキャラ（VRMなし）も含める
            const enabledCharsWithVRM = this.getEnabledCharactersWithVRM();
            
            // 有効なキャラを全て取得（UIの設定から）
            let allEnabledChars = [];
            if (window.multiCharUI && window.multiCharUI.characterConfigs) {
                allEnabledChars = window.multiCharUI.characterConfigs.filter(c => c.enabled);
            }
            
            // マーカー数を決定
            const markerCount = Math.max(enabledCharsWithVRM.length, allEnabledChars.length, 2);
            this.characterCount = markerCount;
            
            for (let index = 0; index < markerCount; index++) {
                // キャラ情報を取得
                const charWithVRM = enabledCharsWithVRM[index];
                const charConfig = allEnabledChars[index];
                const charId = charWithVRM?.id || charConfig?.id || `placeholder_${index}`;
                const charName = charWithVRM?.unit?.name || charConfig?.name || `キャラ${index + 1}`;
                
                // 青い半透明の球体
                const geometry = new THREE.SphereGeometry(0.1, 16, 16);
                const material = new THREE.MeshBasicMaterial({
                    color: charWithVRM ? 0x3366ff : 0x666688, // VRMありは青、なしはグレー
                    transparent: true,
                    opacity: 0.6
                });
                
                const marker = new THREE.Mesh(geometry, material);
                marker.name = `AutoPlacement_Marker_${index}`;
                marker.userData.characterId = charId;
                marker.userData.characterIndex = index;
                marker.userData.hasVRM = !!charWithVRM;
                
                // 番号テキスト（スプライト）
                const canvas = document.createElement('canvas');
                canvas.width = 64;
                canvas.height = 64;
                const ctx = canvas.getContext('2d');
                ctx.fillStyle = charWithVRM ? '#3366ff' : '#666688';
                ctx.beginPath();
                ctx.arc(32, 32, 28, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = 'white';
                ctx.font = 'bold 36px Arial';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText((index + 1).toString(), 32, 32);
                
                const texture = new THREE.CanvasTexture(canvas);
                const spriteMaterial = new THREE.SpriteMaterial({ map: texture });
                const sprite = new THREE.Sprite(spriteMaterial);
                sprite.scale.set(0.3, 0.3, 1);
                sprite.position.y = 0.25;
                marker.add(sprite);
                
                this.app.scene.add(marker);
                this.characterMarkers.push(marker);
            }
            
            console.log(`📍 キャラマーカー ${this.characterMarkers.length}個作成`);
        }
        
        removeCharacterMarkers() {
            this.characterMarkers.forEach(marker => {
                if (marker && this.app && this.app.scene) {
                    this.app.scene.remove(marker);
                    marker.geometry.dispose();
                    marker.material.dispose();
                }
            });
            this.characterMarkers = [];
        }
        
        // ========================================
        // 接続線作成
        // ========================================
        
        createConnectionLines() {
            const THREE = window.THREE;
            if (!THREE || !this.app || !this.app.scene) return;
            
            // マーカー数に合わせて線を作成
            for (let index = 0; index < this.characterCount; index++) {
                const material = new THREE.LineBasicMaterial({
                    color: 0x666688,
                    transparent: true,
                    opacity: 0.5
                });
                
                const points = [
                    new THREE.Vector3(0, 0, 0),
                    new THREE.Vector3(0, 0, 0)
                ];
                
                const geometry = new THREE.BufferGeometry().setFromPoints(points);
                const line = new THREE.Line(geometry, material);
                line.name = `AutoPlacement_Line_${index}`;
                
                this.app.scene.add(line);
                this.connectionLines.push(line);
            }
        }
        
        removeConnectionLines() {
            this.connectionLines.forEach(line => {
                if (line && this.app && this.app.scene) {
                    this.app.scene.remove(line);
                    line.geometry.dispose();
                    line.material.dispose();
                }
            });
            this.connectionLines = [];
        }
        
        // ========================================
        // TransformControls設定
        // ========================================
        
        setupTransformControls() {
            const THREE = window.THREE;
            if (!THREE || !this.app || !this.centerNull) return;
            
            // TransformControlsをインポート（既にグローバルにある場合）
            if (window.TransformControls) {
                this.transformControls = new window.TransformControls(
                    this.app.camera,
                    this.app.renderer.domElement
                );
            } else if (THREE.TransformControls) {
                this.transformControls = new THREE.TransformControls(
                    this.app.camera,
                    this.app.renderer.domElement
                );
            } else {
                console.warn('⚠️ TransformControlsが見つかりません。ドラッグ移動を使用します。');
                // 代替のドラッグ操作を設定
                this.setupDragControls();
                return;
            }
            
            this.transformControls.attach(this.centerNull);
            this.transformControls.setMode('translate');
            this.transformControls.showY = false; // Y軸移動を無効化（地面に沿って移動）
            
            this.app.scene.add(this.transformControls);
            
            // ドラッグ中の更新
            this.transformControls.addEventListener('change', () => {
                this.centerPosition.x = this.centerNull.position.x;
                this.centerPosition.z = this.centerNull.position.z;
                this.updateCharacterPositions();
            });
            
            // ドラッグ中はOrbitControls無効化
            this.transformControls.addEventListener('dragging-changed', (event) => {
                if (this.app.controls) {
                    this.app.controls.enabled = !event.value;
                }
            });
            
            console.log('📍 TransformControls設定完了');
        }
        
        // ★ 代替のドラッグ操作（TransformControlsがない場合）
        setupDragControls() {
            const canvas = this.app.renderer.domElement;
            const THREE = window.THREE;
            
            let isDragging = false;
            const raycaster = new THREE.Raycaster();
            const mouse = new THREE.Vector2();
            const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -0.5); // Y=0.5の平面
            const intersection = new THREE.Vector3();
            
            const onMouseDown = (e) => {
                if (e.button !== 0) return; // 左クリックのみ
                
                const rect = canvas.getBoundingClientRect();
                mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
                mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
                
                raycaster.setFromCamera(mouse, this.app.camera);
                
                // 中心ヌルをクリックしたかチェック
                const intersects = raycaster.intersectObject(this.centerNull, true);
                if (intersects.length > 0) {
                    isDragging = true;
                    if (this.app.controls) this.app.controls.enabled = false;
                    canvas.style.cursor = 'grabbing';
                }
            };
            
            const onMouseMove = (e) => {
                if (!isDragging) return;
                
                const rect = canvas.getBoundingClientRect();
                mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
                mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
                
                raycaster.setFromCamera(mouse, this.app.camera);
                
                if (raycaster.ray.intersectPlane(plane, intersection)) {
                    this.centerNull.position.x = intersection.x;
                    this.centerNull.position.z = intersection.z;
                    this.centerPosition.x = intersection.x;
                    this.centerPosition.z = intersection.z;
                    this.updateCharacterPositions();
                }
            };
            
            const onMouseUp = () => {
                if (isDragging) {
                    isDragging = false;
                    if (this.app.controls) this.app.controls.enabled = true;
                    canvas.style.cursor = 'default';
                }
            };
            
            canvas.addEventListener('mousedown', onMouseDown);
            canvas.addEventListener('mousemove', onMouseMove);
            canvas.addEventListener('mouseup', onMouseUp);
            canvas.addEventListener('mouseleave', onMouseUp);
            
            // クリーンアップ用に保存
            this._dragHandlers = { onMouseDown, onMouseMove, onMouseUp };
            
            console.log('📍 ドラッグ操作設定完了');
        }
        
        removeTransformControls() {
            if (this.transformControls) {
                this.transformControls.detach();
                if (this.app && this.app.scene) {
                    this.app.scene.remove(this.transformControls);
                }
                this.transformControls.dispose();
                this.transformControls = null;
                
                // OrbitControlsを再有効化
                if (this.app && this.app.controls) {
                    this.app.controls.enabled = true;
                }
            }
            
            // ドラッグハンドラーの削除
            if (this._dragHandlers && this.app && this.app.renderer) {
                const canvas = this.app.renderer.domElement;
                canvas.removeEventListener('mousedown', this._dragHandlers.onMouseDown);
                canvas.removeEventListener('mousemove', this._dragHandlers.onMouseMove);
                canvas.removeEventListener('mouseup', this._dragHandlers.onMouseUp);
                canvas.removeEventListener('mouseleave', this._dragHandlers.onMouseUp);
                this._dragHandlers = null;
                canvas.style.cursor = 'default';
                
                // OrbitControlsを再有効化
                if (this.app.controls) {
                    this.app.controls.enabled = true;
                }
            }
        }
        
        // ========================================
        // キャラクター位置更新
        // ========================================
        
        updateCharacterPositions() {
            const THREE = window.THREE;
            if (!THREE) return;
            
            const enabledChars = this.getEnabledCharactersWithVRM();
            const count = this.characterCount;
            
            if (count === 0) return;
            
            // 円形に配置（中心を向く）
            for (let index = 0; index < count; index++) {
                // 角度を計算（前方から時計回りに配置）
                const angle = (Math.PI / 2) + (index / count) * Math.PI * 2;
                
                const x = this.centerPosition.x + Math.cos(angle) * this.radius;
                const z = this.centerPosition.z + Math.sin(angle) * this.radius;
                
                // VRMがある場合は位置を更新
                const char = enabledChars[index];
                if (char && char.vrmData && char.vrmData.vrm && char.vrmData.vrm.scene) {
                    char.vrmData.vrm.scene.position.x = x;
                    char.vrmData.vrm.scene.position.z = z;
                    
                    // 中心を向く
                    const lookAtAngle = Math.atan2(
                        this.centerPosition.x - x,
                        this.centerPosition.z - z
                    );
                    char.vrmData.vrm.scene.rotation.y = lookAtAngle;
                }
                
                // マーカー位置を更新
                if (this.characterMarkers[index]) {
                    this.characterMarkers[index].position.set(x, 1.5, z);
                }
                
                // 接続線を更新
                if (this.connectionLines[index] && this.centerNull) {
                    const positions = this.connectionLines[index].geometry.attributes.position;
                    positions.setXYZ(0, this.centerNull.position.x, this.centerNull.position.y, this.centerNull.position.z);
                    positions.setXYZ(1, x, 0.5, z);
                    positions.needsUpdate = true;
                }
            }
        }
        
        // ========================================
        // 半径設定
        // ========================================
        
        setRadius(newRadius) {
            this.radius = Math.max(0.5, Math.min(5, newRadius));
            this.updateCharacterPositions();
            
            // スライダー値も更新
            const slider = document.getElementById('ap-radius-slider');
            const value = document.getElementById('ap-radius-value');
            if (slider) slider.value = this.radius;
            if (value) value.textContent = this.radius.toFixed(1) + 'm';
        }
        
        // ========================================
        // 最終配置を適用
        // ========================================
        
        applyFinalPositions() {
            const enabledChars = this.getEnabledCharactersWithVRM();
            const count = this.characterCount;
            
            for (let index = 0; index < count; index++) {
                const char = enabledChars[index];
                if (char && char.vrmData && char.vrmData.vrm && char.vrmData.vrm.scene) {
                    // CharacterUnitのposition更新
                    char.unit.position = {
                        x: char.vrmData.vrm.scene.position.x,
                        y: char.vrmData.vrm.scene.position.y,
                        z: char.vrmData.vrm.scene.position.z
                    };
                    
                    console.log(`📍 ${char.unit.name} 位置確定: (${char.unit.position.x.toFixed(2)}, ${char.unit.position.z.toFixed(2)})`);
                }
            }
        }
        
        // ========================================
        // UIパネル
        // ========================================
        
        showPanel() {
            if (this.panel) {
                this.panel.style.display = 'block';
                return;
            }
            
            this.panel = document.createElement('div');
            this.panel.id = 'auto-placement-panel';
            this.panel.innerHTML = `
                <div class="ap-header">
                    <span>📍 自動配置モード</span>
                </div>
                <div class="ap-body">
                    <div class="ap-info">
                        🔴 赤い球をドラッグして中心位置を移動<br>
                        キャラクターは自動的に中心を向きます
                    </div>
                    
                    <div class="ap-setting">
                        <label>配置間隔:</label>
                        <input type="range" id="ap-radius-slider" min="0.5" max="5" step="0.1" value="${this.radius}">
                        <span id="ap-radius-value">${this.radius.toFixed(1)}m</span>
                    </div>
                    
                    <div class="ap-buttons">
                        <button class="ap-btn ap-btn-apply" id="ap-apply">✅ 配置決定</button>
                        <button class="ap-btn ap-btn-cancel" id="ap-cancel">❌ キャンセル</button>
                    </div>
                </div>
            `;
            
            this.addPanelStyles();
            document.body.appendChild(this.panel);
            
            // イベント設定
            document.getElementById('ap-radius-slider').addEventListener('input', (e) => {
                const value = parseFloat(e.target.value);
                document.getElementById('ap-radius-value').textContent = value.toFixed(1) + 'm';
                this.setRadius(value);
            });
            
            document.getElementById('ap-apply').addEventListener('click', () => {
                this.deactivate(true);
            });
            
            document.getElementById('ap-cancel').addEventListener('click', () => {
                this.deactivate(false);
            });
            
            // ドラッグ可能にする
            this.makeDraggable(this.panel, this.panel.querySelector('.ap-header'));
        }
        
        hidePanel() {
            if (this.panel) {
                this.panel.style.display = 'none';
            }
        }
        
        addPanelStyles() {
            if (document.getElementById('ap-styles')) return;
            
            const style = document.createElement('style');
            style.id = 'ap-styles';
            style.textContent = `
                #auto-placement-panel {
                    position: fixed;
                    top: 100px;
                    right: 20px;
                    width: 280px;
                    background: rgba(30, 30, 50, 0.95);
                    border-radius: 12px;
                    box-shadow: 0 4px 20px rgba(0,0,0,0.4);
                    z-index: 10001;
                    font-family: 'Segoe UI', 'Yu Gothic', sans-serif;
                    font-size: 12px;
                    color: #e0e0e0;
                    overflow: hidden;
                    backdrop-filter: blur(10px);
                    border: 2px solid #ff6666;
                }
                
                .ap-header {
                    background: linear-gradient(135deg, #ff6666 0%, #ff3333 100%);
                    padding: 10px 15px;
                    font-weight: bold;
                    font-size: 14px;
                    color: white;
                    cursor: move;
                }
                
                .ap-body {
                    padding: 15px;
                }
                
                .ap-info {
                    background: rgba(255, 102, 102, 0.1);
                    border: 1px solid rgba(255, 102, 102, 0.3);
                    border-radius: 8px;
                    padding: 10px;
                    margin-bottom: 15px;
                    line-height: 1.5;
                    font-size: 11px;
                }
                
                .ap-setting {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    margin-bottom: 15px;
                }
                
                .ap-setting label {
                    min-width: 70px;
                    color: #aaa;
                }
                
                .ap-setting input[type="range"] {
                    flex: 1;
                    height: 6px;
                    -webkit-appearance: none;
                    background: #444;
                    border-radius: 3px;
                    outline: none;
                }
                
                .ap-setting input[type="range"]::-webkit-slider-thumb {
                    -webkit-appearance: none;
                    width: 16px;
                    height: 16px;
                    background: #ff6666;
                    border-radius: 50%;
                    cursor: pointer;
                }
                
                #ap-radius-value {
                    min-width: 45px;
                    text-align: right;
                    color: #ff6666;
                    font-weight: bold;
                }
                
                .ap-buttons {
                    display: flex;
                    gap: 10px;
                }
                
                .ap-btn {
                    flex: 1;
                    padding: 10px 15px;
                    border: none;
                    border-radius: 6px;
                    cursor: pointer;
                    font-size: 12px;
                    font-weight: bold;
                    transition: all 0.2s;
                }
                
                .ap-btn:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
                }
                
                .ap-btn-apply {
                    background: linear-gradient(135deg, #4ade80 0%, #22c55e 100%);
                    color: white;
                }
                
                .ap-btn-cancel {
                    background: linear-gradient(135deg, #666 0%, #444 100%);
                    color: #ccc;
                }
            `;
            document.head.appendChild(style);
        }
        
        makeDraggable(element, handle) {
            let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
            handle.onmousedown = (e) => {
                e.preventDefault();
                pos3 = e.clientX;
                pos4 = e.clientY;
                document.onmouseup = () => {
                    document.onmouseup = null;
                    document.onmousemove = null;
                };
                document.onmousemove = (e) => {
                    e.preventDefault();
                    pos1 = pos3 - e.clientX;
                    pos2 = pos4 - e.clientY;
                    pos3 = e.clientX;
                    pos4 = e.clientY;
                    element.style.top = (element.offsetTop - pos2) + "px";
                    element.style.left = (element.offsetLeft - pos1) + "px";
                    element.style.right = 'auto';
                };
            };
        }
    }
    
    // グローバルに公開
    window.AutoPlacementSystem = AutoPlacementSystem;
    
    console.log('📍 Auto Placement System v1.1 読み込み完了');
})();
