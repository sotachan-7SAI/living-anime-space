// ========================================
// 🏠 3D環境マネージャー v2.0
// FBX/GLBモデルを環境オブジェクトとして配置
// オブジェクトごとにサイズ・高さ・回転を個別管理
// 10スロットのプリセット保存/読み込み
// ★ IndexedDB対応 (大容量モデル保存可能)
// ========================================

(function() {
    'use strict';
    console.log('🏠 3D環境マネージャー v2.0 読み込み開始');

    // ========================================
    // 定数
    // ========================================
    const MAX_PRESETS = 10;
    const DB_NAME = 'env3d_db';
    const DB_VERSION = 1;
    const STORE_NAME = 'presets';
    const PANEL_ID = 'environment-3d-panel';

    // ========================================
    // IndexedDB ヘルパー
    // ========================================
    class Env3DStorage {
        constructor() {
            this.db = null;
        }

        async open() {
            if (this.db) return this.db;
            return new Promise((resolve, reject) => {
                const req = indexedDB.open(DB_NAME, DB_VERSION);
                req.onupgradeneeded = (e) => {
                    const db = e.target.result;
                    if (!db.objectStoreNames.contains(STORE_NAME)) {
                        db.createObjectStore(STORE_NAME, { keyPath: 'slot' });
                    }
                };
                req.onsuccess = (e) => {
                    this.db = e.target.result;
                    resolve(this.db);
                };
                req.onerror = (e) => {
                    console.error('❌ IndexedDB open error:', e);
                    reject(e);
                };
            });
        }

        async getPreset(slot) {
            const db = await this.open();
            return new Promise((resolve) => {
                const tx = db.transaction(STORE_NAME, 'readonly');
                const store = tx.objectStore(STORE_NAME);
                const req = store.get(slot);
                req.onsuccess = () => resolve(req.result || null);
                req.onerror = () => resolve(null);
            });
        }

        async getAllPresets() {
            const db = await this.open();
            return new Promise((resolve) => {
                const tx = db.transaction(STORE_NAME, 'readonly');
                const store = tx.objectStore(STORE_NAME);
                const req = store.getAll();
                req.onsuccess = () => {
                    const result = new Array(MAX_PRESETS).fill(null);
                    for (const item of req.result) {
                        if (item.slot >= 0 && item.slot < MAX_PRESETS) {
                            result[item.slot] = item;
                        }
                    }
                    resolve(result);
                };
                req.onerror = () => resolve(new Array(MAX_PRESETS).fill(null));
            });
        }

        async savePreset(slot, data) {
            const db = await this.open();
            return new Promise((resolve, reject) => {
                const tx = db.transaction(STORE_NAME, 'readwrite');
                const store = tx.objectStore(STORE_NAME);
                const record = { slot, ...data };
                const req = store.put(record);
                req.onsuccess = () => resolve(true);
                req.onerror = (e) => {
                    console.error('❌ IndexedDB save error:', e);
                    reject(e);
                };
            });
        }

        async deletePreset(slot) {
            const db = await this.open();
            return new Promise((resolve) => {
                const tx = db.transaction(STORE_NAME, 'readwrite');
                const store = tx.objectStore(STORE_NAME);
                const req = store.delete(slot);
                req.onsuccess = () => resolve(true);
                req.onerror = () => resolve(false);
            });
        }
    }

    // ========================================
    // Environment3DManager クラス
    // ========================================
    class Environment3DManager {
        constructor() {
            this.objects = new Map();   // id -> { group, model, settings, fileData }
            this.nextId = 1;
            this.presets = new Array(MAX_PRESETS).fill(null); // UIキャッシュ用
            this.storage = new Env3DStorage();
            this.panel = null;
            this.selectedObjectId = null;
            this.savingSlot = -1; // 保存中スロット

            this.waitForApp(async () => {
                await this.loadPresetsFromDB();
                this.createPanel();
                this.registerToUIManager();
                console.log('✅ 3D環境マネージャー v2.0 初期化完了 (IndexedDB)');
            });
        }

        waitForApp(cb) {
            const check = () => {
                if (window.app && window.app.scene) {
                    cb();
                } else {
                    setTimeout(check, 500);
                }
            };
            check();
        }

        // ========================================
        // モデル読み込み (FBX / GLB / GLTF)
        // ========================================
        async loadModel(file) {
            const ext = file.name.split('.').pop().toLowerCase();
            const url = URL.createObjectURL(file);

            return new Promise((resolve, reject) => {
                let loader;
                if (ext === 'fbx') {
                    loader = new window.FBXLoaderClass();
                } else if (ext === 'glb' || ext === 'gltf') {
                    loader = new window.GLTFLoaderClass();
                } else {
                    reject(new Error(`未対応の形式: ${ext}`));
                    return;
                }

                loader.load(url, (result) => {
                    const model = (ext === 'fbx') ? result : result.scene;
                    URL.revokeObjectURL(url);
                    resolve(model);
                }, undefined, (err) => {
                    URL.revokeObjectURL(url);
                    reject(err);
                });
            });
        }

        // Base64からモデルを読み込み
        async loadModelFromBase64(base64Data, fileName) {
            const response = await fetch(base64Data);
            const blob = await response.blob();
            const file = new File([blob], fileName);
            return this.loadModel(file);
        }

        // ========================================
        // オブジェクト追加
        // ========================================
        async addObject(file) {
            try {
                const model = await this.loadModel(file);
                const id = `env_obj_${this.nextId++}`;
                const name = file.name.replace(/\.(fbx|glb|gltf)$/i, '');

                // バウンディングボックスで初期サイズを正規化
                const box = new THREE.Box3().setFromObject(model);
                const size = new THREE.Vector3();
                box.getSize(size);
                const maxDim = Math.max(size.x, size.y, size.z) || 1;
                const normalizeScale = 1.0 / maxDim;
                model.scale.setScalar(normalizeScale);

                const center = new THREE.Vector3();
                box.getCenter(center);
                model.position.sub(center.multiplyScalar(normalizeScale));

                // ラッパーグループ
                const group = new THREE.Group();
                group.name = `EnvObj_${id}`;
                group.userData.envObjectId = id;
                group.add(model);
                window.app.scene.add(group);

                const settings = {
                    id, name,
                    fileName: file.name,
                    scale: 1.0,
                    height: 0,
                    rotationX: 0, rotationY: 0, rotationZ: 0,
                    positionX: 0, positionZ: 0,
                    visible: true
                };

                this.objects.set(id, { group, model, settings, fileData: null });

                // ファイルデータをBase64で保持
                this.readFileAsBase64(file).then(base64 => {
                    const obj = this.objects.get(id);
                    if (obj) obj.fileData = base64;
                });

                this.applySettings(id);
                this.selectedObjectId = id;
                this.refreshPanel();

                console.log(`🏠 環境オブジェクト追加: ${name} (${id})`);
                return id;
            } catch (err) {
                console.error('❌ モデル読み込みエラー:', err);
                alert(`モデル読み込みエラー: ${err.message}`);
                return null;
            }
        }

        readFileAsBase64(file) {
            return new Promise((resolve) => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result);
                reader.onerror = () => resolve(null);
                reader.readAsDataURL(file);
            });
        }

        // ========================================
        // 設定適用
        // ========================================
        applySettings(id) {
            const obj = this.objects.get(id);
            if (!obj) return;
            const { group, settings } = obj;
            group.scale.setScalar(settings.scale);
            group.position.set(settings.positionX, settings.height, settings.positionZ);
            group.rotation.set(
                THREE.MathUtils.degToRad(settings.rotationX),
                THREE.MathUtils.degToRad(settings.rotationY),
                THREE.MathUtils.degToRad(settings.rotationZ)
            );
            group.visible = settings.visible;
        }

        // ========================================
        // オブジェクト削除
        // ========================================
        removeObject(id) {
            const obj = this.objects.get(id);
            if (!obj) return;
            window.app.scene.remove(obj.group);
            obj.group.traverse(child => {
                if (child.geometry) child.geometry.dispose();
                if (child.material) {
                    if (Array.isArray(child.material)) {
                        child.material.forEach(m => m.dispose());
                    } else {
                        child.material.dispose();
                    }
                }
            });
            this.objects.delete(id);
            if (this.selectedObjectId === id) {
                this.selectedObjectId = this.objects.keys().next().value || null;
            }
            this.refreshPanel();
            console.log(`🗑️ 環境オブジェクト削除: ${id}`);
        }

        clearAll() {
            for (const id of [...this.objects.keys()]) {
                this.removeObject(id);
            }
            this.nextId = 1;
        }

        // ========================================
        // プリセット保存 (IndexedDB)
        // ========================================
        async savePreset(slotIndex, presetName) {
            this.savingSlot = slotIndex;
            this.refreshPanel(); // 保存中表示

            try {
                const objectsData = [];
                for (const [id, obj] of this.objects) {
                    objectsData.push({
                        settings: { ...obj.settings },
                        fileData: obj.fileData,
                        fileName: obj.settings.fileName
                    });
                }

                const presetData = {
                    name: presetName || `プリセット ${slotIndex + 1}`,
                    timestamp: Date.now(),
                    objects: objectsData
                };

                await this.storage.savePreset(slotIndex, presetData);
                this.presets[slotIndex] = presetData;

                console.log(`💾 プリセット${slotIndex + 1}に保存完了: ${presetData.name} (IndexedDB)`);
            } catch (err) {
                console.error('❌ プリセット保存エラー:', err);
                alert(`保存エラー: ${err.message}`);
            } finally {
                this.savingSlot = -1;
                this.refreshPanel();
            }
        }

        // ========================================
        // プリセット読み込み (IndexedDB)
        // ========================================
        async loadPreset(slotIndex) {
            try {
                const preset = await this.storage.getPreset(slotIndex);
                if (!preset || !preset.objects || preset.objects.length === 0) {
                    alert('このスロットにはプリセットが保存されていません');
                    return;
                }

                this.clearAll();

                let loadedCount = 0;
                for (const objData of preset.objects) {
                    if (!objData.fileData) {
                        console.warn(`⚠️ ファイルデータなし: ${objData.fileName}`);
                        continue;
                    }

                    try {
                        const model = await this.loadModelFromBase64(objData.fileData, objData.fileName);

                        // バウンディングボックス正規化
                        const box = new THREE.Box3().setFromObject(model);
                        const size = new THREE.Vector3();
                        box.getSize(size);
                        const maxDim = Math.max(size.x, size.y, size.z) || 1;
                        const normalizeScale = 1.0 / maxDim;
                        model.scale.setScalar(normalizeScale);

                        const center = new THREE.Vector3();
                        box.getCenter(center);
                        model.position.sub(center.multiplyScalar(normalizeScale));

                        const id = `env_obj_${this.nextId++}`;
                        const group = new THREE.Group();
                        group.name = `EnvObj_${id}`;
                        group.userData.envObjectId = id;
                        group.add(model);
                        window.app.scene.add(group);

                        const settings = { ...objData.settings, id };
                        this.objects.set(id, { group, model, settings, fileData: objData.fileData });
                        this.applySettings(id);
                        loadedCount++;

                        console.log(`✅ プリセットから復元: ${settings.name}`);
                    } catch (err) {
                        console.error(`❌ 復元エラー (${objData.fileName}):`, err);
                    }
                }

                this.selectedObjectId = this.objects.keys().next().value || null;
                this.refreshPanel();
                console.log(`📂 プリセット${slotIndex + 1}読み込み完了: ${preset.name} (${loadedCount}個)`);
            } catch (err) {
                console.error('❌ プリセット読み込みエラー:', err);
                alert(`読み込みエラー: ${err.message}`);
            }
        }

        // ========================================
        // プリセット削除
        // ========================================
        async deletePreset(slotIndex) {
            await this.storage.deletePreset(slotIndex);
            this.presets[slotIndex] = null;
            this.refreshPanel();
            console.log(`🗑️ プリセット${slotIndex + 1}削除`);
        }

        // ========================================
        // DB初期読み込み
        // ========================================
        async loadPresetsFromDB() {
            try {
                this.presets = await this.storage.getAllPresets();
            } catch (e) {
                console.warn('⚠️ IndexedDB読み込みエラー:', e);
                this.presets = new Array(MAX_PRESETS).fill(null);
            }
        }

        // ========================================
        // エクスポート / インポート
        // ========================================
        async exportPreset(slotIndex) {
            const preset = await this.storage.getPreset(slotIndex);
            if (!preset) return;

            // slotキーは除外してエクスポート
            const { slot, ...exportData } = preset;
            const json = JSON.stringify(exportData);
            const blob = new Blob([json], { type: 'application/json' });
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = `env3d_${preset.name}.json`;
            a.click();
            URL.revokeObjectURL(a.href);
            console.log(`📤 エクスポート: ${preset.name}`);
        }

        importPreset(slotIndex) {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = '.json';
            input.onchange = (e) => {
                const file = e.target.files[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = async (ev) => {
                    try {
                        const data = JSON.parse(ev.target.result);
                        await this.storage.savePreset(slotIndex, data);
                        this.presets[slotIndex] = data;
                        this.refreshPanel();
                        console.log(`📥 インポート完了: ${data.name}`);
                    } catch (err) {
                        alert('JSONファイルの読み込みに失敗しました');
                    }
                };
                reader.readAsText(file);
            };
            input.click();
        }

        // ========================================
        // UI管理パネルに登録
        // ========================================
        registerToUIManager() {
            if (window.uiManagerPanel && window.uiManagerPanel.registerExternalPanel) {
                window.uiManagerPanel.registerExternalPanel({
                    id: PANEL_ID,
                    name: '3D環境マネージャー',
                    shortcut: 'Shift+G',
                    category: 'other'
                });
            }
        }

        // ========================================
        // パネルUI作成
        // ========================================
        createPanel() {
            if (document.getElementById(PANEL_ID)) return;

            const panel = document.createElement('div');
            panel.id = PANEL_ID;
            panel.style.cssText = `
                position: fixed;
                top: 80px;
                right: 20px;
                width: 380px;
                max-height: 85vh;
                background: rgba(15, 15, 25, 0.95);
                border: 1px solid rgba(100, 200, 255, 0.3);
                border-radius: 12px;
                color: #fff;
                font-family: 'Segoe UI', sans-serif;
                font-size: 13px;
                z-index: 10000;
                display: none;
                overflow: hidden;
                box-shadow: 0 8px 32px rgba(0,0,0,0.6);
                backdrop-filter: blur(10px);
            `;

            panel.innerHTML = this.buildPanelHTML();
            document.body.appendChild(panel);
            this.panel = panel;

            this.setupPanelEvents();
            this.makeDraggable(panel, panel.querySelector('.env3d-header'));

            document.addEventListener('keydown', (e) => {
                if (e.shiftKey && e.key === 'G') {
                    e.preventDefault();
                    this.togglePanel();
                }
            });
        }

        buildPanelHTML() {
            return `
                <div class="env3d-header" style="
                    padding: 10px 15px;
                    background: linear-gradient(135deg, rgba(40,80,120,0.8), rgba(20,60,100,0.8));
                    cursor: move;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    border-bottom: 1px solid rgba(100,200,255,0.2);
                ">
                    <span style="font-weight: bold; font-size: 14px;">🏠 3D環境マネージャー</span>
                    <div style="display:flex; gap:8px; align-items:center;">
                        <span style="font-size:11px; color:rgba(255,255,255,0.5);">Shift+G</span>
                        <button class="env3d-close" style="
                            background: none; border: none; color: #fff;
                            font-size: 18px; cursor: pointer; padding: 0 4px;
                        ">✕</button>
                    </div>
                </div>

                <div style="overflow-y: auto; max-height: calc(85vh - 44px); padding: 12px;">
                    <!-- モデル読み込みエリア -->
                    <div style="
                        border: 2px dashed rgba(100,200,255,0.3);
                        border-radius: 8px;
                        padding: 15px;
                        text-align: center;
                        margin-bottom: 12px;
                        cursor: pointer;
                        transition: border-color 0.3s;
                    " id="env3d-drop-zone">
                        <div style="font-size: 28px; margin-bottom: 5px;">📦</div>
                        <div style="color: rgba(255,255,255,0.7);">FBX / GLB ファイルをドロップ<br>またはクリックして選択</div>
                        <input type="file" id="env3d-file-input" accept=".fbx,.glb,.gltf" multiple style="display:none;">
                    </div>

                    <!-- オブジェクトリスト -->
                    <div id="env3d-object-list" style="margin-bottom: 12px;"></div>

                    <!-- 選択オブジェクト設定 -->
                    <div id="env3d-object-settings" style="display:none;"></div>

                    <!-- 区切り -->
                    <hr style="border: none; border-top: 1px solid rgba(100,200,255,0.15); margin: 12px 0;">

                    <!-- プリセット管理 -->
                    <div style="margin-bottom: 8px;">
                        <div style="font-weight:bold; font-size:13px; margin-bottom:8px; color:rgba(100,200,255,0.9);">
                            💾 環境プリセット (${MAX_PRESETS}スロット)
                            <span style="font-size:10px; color:rgba(100,255,150,0.6); margin-left:6px;">IndexedDB保存</span>
                        </div>
                        <div id="env3d-preset-list"></div>
                    </div>
                </div>
            `;
        }

        // ========================================
        // パネルイベント設定
        // ========================================
        setupPanelEvents() {
            this.panel.querySelector('.env3d-close').onclick = () => this.togglePanel();

            const dropZone = this.panel.querySelector('#env3d-drop-zone');
            const fileInput = this.panel.querySelector('#env3d-file-input');

            dropZone.onclick = () => fileInput.click();
            dropZone.ondragover = (e) => {
                e.preventDefault();
                dropZone.style.borderColor = 'rgba(100,200,255,0.8)';
                dropZone.style.background = 'rgba(100,200,255,0.1)';
            };
            dropZone.ondragleave = () => {
                dropZone.style.borderColor = 'rgba(100,200,255,0.3)';
                dropZone.style.background = 'transparent';
            };
            dropZone.ondrop = (e) => {
                e.preventDefault();
                dropZone.style.borderColor = 'rgba(100,200,255,0.3)';
                dropZone.style.background = 'transparent';
                const files = [...e.dataTransfer.files].filter(f =>
                    /\.(fbx|glb|gltf)$/i.test(f.name));
                files.forEach(f => this.addObject(f));
            };

            fileInput.onchange = (e) => {
                [...e.target.files].forEach(f => this.addObject(f));
                fileInput.value = '';
            };
        }

        // ========================================
        // パネル内容更新
        // ========================================
        refreshPanel() {
            if (!this.panel) return;
            this.renderObjectList();
            this.renderObjectSettings();
            this.renderPresetList();
        }

        renderObjectList() {
            const container = this.panel.querySelector('#env3d-object-list');
            if (this.objects.size === 0) {
                container.innerHTML = `<div style="text-align:center; color:rgba(255,255,255,0.4); padding:8px; font-size:12px;">
                    オブジェクトなし
                </div>`;
                return;
            }

            let html = `<div style="font-size:12px; color:rgba(255,255,255,0.5); margin-bottom:6px;">
                配置オブジェクト (${this.objects.size})
            </div>`;

            for (const [id, obj] of this.objects) {
                const selected = id === this.selectedObjectId;
                html += `
                    <div class="env3d-obj-item" data-id="${id}" style="
                        display: flex; align-items: center; gap: 8px;
                        padding: 6px 10px; margin-bottom: 4px; border-radius: 6px;
                        cursor: pointer;
                        background: ${selected ? 'rgba(100,200,255,0.2)' : 'rgba(255,255,255,0.05)'};
                        border: 1px solid ${selected ? 'rgba(100,200,255,0.4)' : 'transparent'};
                        transition: all 0.2s;
                    ">
                        <span style="font-size:16px;">${obj.settings.visible ? '👁️' : '🚫'}</span>
                        <span style="flex:1; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;"
                              title="${obj.settings.fileName}">${obj.settings.name}</span>
                        <button class="env3d-vis-btn" data-id="${id}" title="表示切替" style="
                            background:none; border:none; color:#fff; cursor:pointer; font-size:14px; padding:2px;
                        ">${obj.settings.visible ? '🔵' : '⚫'}</button>
                        <button class="env3d-del-btn" data-id="${id}" title="削除" style="
                            background:none; border:none; color:#ff6666; cursor:pointer; font-size:14px; padding:2px;
                        ">🗑️</button>
                    </div>
                `;
            }
            container.innerHTML = html;

            container.querySelectorAll('.env3d-obj-item').forEach(el => {
                el.addEventListener('click', (e) => {
                    if (e.target.closest('.env3d-vis-btn') || e.target.closest('.env3d-del-btn')) return;
                    this.selectedObjectId = el.dataset.id;
                    this.refreshPanel();
                });
            });
            container.querySelectorAll('.env3d-vis-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    const obj = this.objects.get(btn.dataset.id);
                    if (obj) {
                        obj.settings.visible = !obj.settings.visible;
                        this.applySettings(btn.dataset.id);
                        this.refreshPanel();
                    }
                });
            });
            container.querySelectorAll('.env3d-del-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    if (confirm('このオブジェクトを削除しますか？')) {
                        this.removeObject(btn.dataset.id);
                    }
                });
            });
        }

        renderObjectSettings() {
            const container = this.panel.querySelector('#env3d-object-settings');
            if (!this.selectedObjectId || !this.objects.has(this.selectedObjectId)) {
                container.style.display = 'none';
                return;
            }

            container.style.display = 'block';
            const obj = this.objects.get(this.selectedObjectId);
            const s = obj.settings;

            container.innerHTML = `
                <div style="
                    background: rgba(255,255,255,0.05);
                    border-radius: 8px; padding: 12px;
                    border: 1px solid rgba(100,200,255,0.15);
                ">
                    <div style="font-weight:bold; margin-bottom:10px; color:rgba(100,200,255,0.9);">
                        ⚙️ ${s.name}
                    </div>

                    ${this.buildSlider('スケール', 'scale', s.scale, 0.01, 1000, 0.1)}
                    ${this.buildSlider('高さ (Y)', 'height', s.height, -1000, 1000, 0.1)}
                    ${this.buildSlider('位置 X', 'positionX', s.positionX, -1000, 1000, 0.1)}
                    ${this.buildSlider('位置 Z', 'positionZ', s.positionZ, -1000, 1000, 0.1)}
                    ${this.buildSlider('回転 X°', 'rotationX', s.rotationX, -180, 180, 1)}
                    ${this.buildSlider('回転 Y°', 'rotationY', s.rotationY, -180, 180, 1)}
                    ${this.buildSlider('回転 Z°', 'rotationZ', s.rotationZ, -180, 180, 1)}

                    <div style="display:flex; gap:6px; margin-top:10px;">
                        <button class="env3d-reset-btn" style="
                            flex:1; padding:6px; border:none; border-radius:5px;
                            background:rgba(255,150,50,0.3); color:#fff; cursor:pointer; font-size:12px;
                        ">🔄 リセット</button>
                        <button class="env3d-center-btn" style="
                            flex:1; padding:6px; border:none; border-radius:5px;
                            background:rgba(100,200,255,0.3); color:#fff; cursor:pointer; font-size:12px;
                        ">🎯 原点に移動</button>
                    </div>
                </div>
            `;

            // スライダー → 数値入力に連動
            container.querySelectorAll('.env3d-slider').forEach(slider => {
                const prop = slider.dataset.prop;
                const numInput = container.querySelector(`.env3d-num[data-prop="${prop}"]`);
                slider.addEventListener('input', () => {
                    const val = parseFloat(slider.value);
                    obj.settings[prop] = val;
                    if (numInput) numInput.value = val.toFixed(prop === 'scale' ? 2 : (prop.startsWith('rotation') ? 0 : 2));
                    this.applySettings(this.selectedObjectId);
                });
            });

            // 数値入力 → スライダーに連動
            container.querySelectorAll('.env3d-num').forEach(numInput => {
                const prop = numInput.dataset.prop;
                const slider = container.querySelector(`.env3d-slider[data-prop="${prop}"]`);
                numInput.addEventListener('change', () => {
                    let val = parseFloat(numInput.value);
                    if (isNaN(val)) val = 0;
                    obj.settings[prop] = val;
                    if (slider) slider.value = val;
                    this.applySettings(this.selectedObjectId);
                });
            });

            container.querySelector('.env3d-reset-btn').onclick = () => {
                Object.assign(obj.settings, { scale:1, height:0, positionX:0, positionZ:0, rotationX:0, rotationY:0, rotationZ:0 });
                this.applySettings(this.selectedObjectId);
                this.refreshPanel();
            };
            container.querySelector('.env3d-center-btn').onclick = () => {
                Object.assign(obj.settings, { positionX:0, positionZ:0, height:0 });
                this.applySettings(this.selectedObjectId);
                this.refreshPanel();
            };
        }

        buildSlider(label, prop, value, min, max, step) {
            const decimals = prop === 'scale' ? 2 : (prop.startsWith('rotation') ? 0 : 2);
            return `
                <div style="margin-bottom: 8px;">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:3px;">
                        <span style="font-size:11px; color:rgba(255,255,255,0.7);">${label}</span>
                        <input type="number" class="env3d-num" data-prop="${prop}"
                            value="${value.toFixed(decimals)}" min="${min}" max="${max}" step="${step}"
                            style="width:70px; background:rgba(255,255,255,0.1); border:1px solid rgba(100,200,255,0.3);
                            border-radius:4px; color:#4af; font-size:11px; font-family:monospace;
                            text-align:right; padding:2px 5px; outline:none;">
                    </div>
                    <input type="range" class="env3d-slider" data-prop="${prop}"
                        min="${min}" max="${max}" step="${step}" value="${value}"
                        style="width:100%; height:6px; accent-color:#4af; cursor:pointer;">
                </div>
            `;
        }

        // ========================================
        // プリセットリスト表示
        // ========================================
        renderPresetList() {
            const container = this.panel.querySelector('#env3d-preset-list');
            let html = '';

            for (let i = 0; i < MAX_PRESETS; i++) {
                const preset = this.presets[i];
                const hasData = preset && preset.objects && preset.objects.length > 0;
                const name = preset ? preset.name : `スロット ${i + 1}`;
                const objCount = hasData ? preset.objects.length : 0;
                const isSaving = this.savingSlot === i;

                // ファイルサイズ概算
                let sizeInfo = '';
                if (hasData) {
                    let totalBytes = 0;
                    for (const o of preset.objects) {
                        if (o.fileData) totalBytes += o.fileData.length * 0.75; // Base64 → バイト概算
                    }
                    if (totalBytes > 1024 * 1024) {
                        sizeInfo = `${(totalBytes / 1024 / 1024).toFixed(1)}MB`;
                    } else {
                        sizeInfo = `${(totalBytes / 1024).toFixed(0)}KB`;
                    }
                }

                html += `
                    <div style="
                        display: flex; align-items: center; gap: 6px;
                        margin-bottom: 4px; padding: 5px 8px; border-radius: 6px;
                        background: ${hasData ? 'rgba(100,255,150,0.08)' : 'rgba(255,255,255,0.03)'};
                        border: 1px solid ${hasData ? 'rgba(100,255,150,0.2)' : 'rgba(255,255,255,0.08)'};
                    ">
                        <span style="
                            width:22px; height:22px;
                            display:flex; align-items:center; justify-content:center;
                            background:${hasData ? 'rgba(100,255,150,0.25)' : 'rgba(255,255,255,0.1)'};
                            border-radius:4px; font-size:11px; font-weight:bold;
                            color:${hasData ? '#7f7' : 'rgba(255,255,255,0.4)'};
                        ">${i + 1}</span>

                        ${isSaving ? `
                            <span style="flex:1; font-size:12px; color:rgba(255,200,50,0.9); padding:4px 8px;">
                                ⏳ 保存中...
                            </span>
                        ` : hasData ? `
                            <button class="env3d-preset-load" data-slot="${i}" title="読み込み" style="
                                flex:1; text-align:left; padding:4px 8px;
                                background:rgba(100,200,255,0.15); border:1px solid rgba(100,200,255,0.2);
                                border-radius:5px; color:#fff; cursor:pointer;
                                font-size:12px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;
                            ">📂 ${name} <span style="color:rgba(255,255,255,0.4);">(${objCount}個 ${sizeInfo})</span></button>
                            <button class="env3d-preset-export" data-slot="${i}" title="エクスポート" style="
                                background:none; border:none; color:rgba(255,255,255,0.5); cursor:pointer; font-size:13px; padding:2px;
                            ">📤</button>
                            <button class="env3d-preset-del" data-slot="${i}" title="削除" style="
                                background:none; border:none; color:#f66; cursor:pointer; font-size:13px; padding:2px;
                            ">✕</button>
                        ` : `
                            <span style="flex:1; font-size:12px; color:rgba(255,255,255,0.3); padding:4px 8px;">
                                ${name} (空)
                            </span>
                            <button class="env3d-preset-import" data-slot="${i}" title="インポート" style="
                                background:none; border:none; color:rgba(255,255,255,0.4); cursor:pointer; font-size:13px; padding:2px;
                            ">📥</button>
                        `}

                        <button class="env3d-preset-save" data-slot="${i}" title="現在の環境を保存" ${isSaving ? 'disabled' : ''} style="
                            background:rgba(100,255,150,0.2); border:1px solid rgba(100,255,150,0.3);
                            border-radius:4px; color:#7f7; cursor:pointer;
                            font-size:11px; padding:3px 8px; white-space:nowrap;
                            ${isSaving ? 'opacity:0.4; cursor:not-allowed;' : ''}
                        ">💾保存</button>
                    </div>
                `;
            }
            container.innerHTML = html;

            // イベント
            container.querySelectorAll('.env3d-preset-load').forEach(btn => {
                btn.addEventListener('click', () => this.loadPreset(parseInt(btn.dataset.slot)));
            });
            container.querySelectorAll('.env3d-preset-save').forEach(btn => {
                btn.addEventListener('click', () => {
                    const slot = parseInt(btn.dataset.slot);
                    if (this.objects.size === 0) {
                        alert('保存するオブジェクトがありません');
                        return;
                    }
                    const name = prompt('プリセット名を入力:', this.presets[slot]?.name || `環境${slot + 1}`);
                    if (name !== null) this.savePreset(slot, name);
                });
            });
            container.querySelectorAll('.env3d-preset-del').forEach(btn => {
                btn.addEventListener('click', () => {
                    if (confirm('このプリセットを削除しますか？')) this.deletePreset(parseInt(btn.dataset.slot));
                });
            });
            container.querySelectorAll('.env3d-preset-export').forEach(btn => {
                btn.addEventListener('click', () => this.exportPreset(parseInt(btn.dataset.slot)));
            });
            container.querySelectorAll('.env3d-preset-import').forEach(btn => {
                btn.addEventListener('click', () => this.importPreset(parseInt(btn.dataset.slot)));
            });
        }

        // ========================================
        // パネル表示切替
        // ========================================
        togglePanel() {
            if (!this.panel) return;
            const isVisible = this.panel.style.display !== 'none';
            this.panel.style.display = isVisible ? 'none' : 'block';
            if (!isVisible) this.refreshPanel();
        }

        // ========================================
        // ドラッグ可能にする
        // ========================================
        makeDraggable(element, handle) {
            let isDrag = false, startX, startY, startLeft, startTop;
            handle.addEventListener('mousedown', (e) => {
                if (e.target.tagName === 'BUTTON') return;
                isDrag = true;
                startX = e.clientX; startY = e.clientY;
                startLeft = element.offsetLeft; startTop = element.offsetTop;
                e.preventDefault();
            });
            document.addEventListener('mousemove', (e) => {
                if (!isDrag) return;
                element.style.left = (startLeft + e.clientX - startX) + 'px';
                element.style.top = (startTop + e.clientY - startY) + 'px';
                element.style.right = 'auto';
            });
            document.addEventListener('mouseup', () => isDrag = false);
        }
    }

    // ========================================
    // 初期化
    // ========================================
    window.environment3DManager = new Environment3DManager();
    console.log('🏠 3D環境マネージャー v2.0 読み込み完了');

})();
