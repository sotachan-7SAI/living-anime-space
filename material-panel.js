// ========================================
// material-panel.js v1.0
// VRMマテリアル透明度・着せ替えパネル
// 右クリックメニューから「👗 マテリアル透明度」で開く
// ========================================

console.log('👗 マテリアル透明度パネルを読み込み中...');

(function() {
    'use strict';

    let materialPanel = null;
    let currentVRM = null;
    let meshDataCache = []; // { mesh, materials[], category, displayName }
    
    // メッシュ名からカテゴリを推定
    function categorize(matName, meshName) {
        const n = (matName + ' ' + meshName).toLowerCase();
        if (n.includes('hair')) return '🎀 髪';
        if (n.includes('face') || n.includes('mouth') || n.includes('brow') || n.includes('eyelash') || n.includes('eyeline')) return '😊 顔パーツ';
        if (n.includes('eye')) return '👁️ 目';
        if (n.includes('body') || n.includes('skin')) return '🧍 肌';
        if (n.includes('tops') || n.includes('shirt') || n.includes('jacket') || n.includes('coat') || n.includes('vest')) return '👕 トップス';
        if (n.includes('bottoms') || n.includes('pants') || n.includes('skirt') || n.includes('shorts')) return '👖 ボトムス';
        if (n.includes('shoes') || n.includes('boots') || n.includes('sandal')) return '👟 靴';
        if (n.includes('acc') || n.includes('glove') || n.includes('hat') || n.includes('bag') || n.includes('glass') || n.includes('ribbon') || n.includes('belt')) return '💍 アクセサリ';
        if (n.includes('cloth')) return '👔 服';
        return '📦 その他';
    }
    
    // マテリアル名を短く整形
    function shortName(name) {
        return name
            .replace(/ \(Instance\)/g, '')
            .replace(/ \(Outline\)/g, ' [OL]')
            .replace(/^N\d+_\d+_\d+_/, '')
            .replace(/_\d+$/, '')
            .substring(0, 30);
    }
    
    // VRMからメッシュデータを収集
    function collectMeshData(vrm) {
        meshDataCache = [];
        if (!vrm || !vrm.scene) return;
        
        const seen = new Map(); // meshName -> index (重複統合用)
        
        vrm.scene.traverse(child => {
            if (!child.isMesh || !child.material) return;
            
            const mats = Array.isArray(child.material) ? child.material : [child.material];
            
            mats.forEach((mat, matIdx) => {
                // Outlineマテリアルは親マテリアルと連動させるので個別表示しない
                if (mat.name.includes('Outline')) return;
                
                const category = categorize(mat.name, child.name);
                const displayName = shortName(mat.name);
                
                meshDataCache.push({
                    mesh: child,
                    material: mat,
                    matIndex: matIdx,
                    category: category,
                    displayName: displayName,
                    fullName: mat.name,
                    meshName: child.name,
                    // 初期値を保存
                    originalOpacity: mat.opacity,
                    originalTransparent: mat.transparent,
                    originalDepthWrite: mat.depthWrite,
                    originalAlphaTest: mat.alphaTest,
                    originalVisible: child.visible,
                });
            });
        });
        
        // カテゴリ順にソート
        const order = ['😊 顔パーツ', '👁️ 目', '🧍 肌', '🎀 髪', '👕 トップス', '👖 ボトムス', '👔 服', '👟 靴', '💍 アクセサリ', '📦 その他'];
        meshDataCache.sort((a, b) => {
            const ai = order.indexOf(a.category);
            const bi = order.indexOf(b.category);
            return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
        });
    }
    
    // マテリアルの透明度を変更
    function setMaterialOpacity(data, opacity) {
        const mat = data.material;
        
        if (opacity < 1) {
            mat.transparent = true;
            mat.depthWrite = false;
            mat.alphaTest = 0;
        } else {
            mat.transparent = data.originalTransparent;
            mat.depthWrite = data.originalDepthWrite;
            mat.alphaTest = data.originalAlphaTest;
        }
        
        mat.opacity = opacity;
        
        // MToon shader のcolorAlpha uniform
        if (mat.uniforms && mat.uniforms.colorAlpha) {
            mat.uniforms.colorAlpha.value = opacity;
        }
        
        mat.needsUpdate = true;
        
        // 対応するOutlineマテリアルも同期
        syncOutlineMaterial(data, opacity);
    }
    
    // Outlineマテリアルも同じ透明度に
    function syncOutlineMaterial(data, opacity) {
        const vrm = currentVRM;
        if (!vrm) return;
        
        vrm.scene.traverse(child => {
            if (!child.isMesh || !child.material) return;
            const mats = Array.isArray(child.material) ? child.material : [child.material];
            mats.forEach(mat => {
                // 同じベース名のOutlineマテリアルを探す
                const baseName = data.material.name.replace(' (Instance)', '');
                if (mat.name.includes(baseName) && mat.name.includes('Outline')) {
                    mat.transparent = opacity < 1;
                    mat.opacity = opacity;
                    mat.depthWrite = opacity >= 1 ? data.originalDepthWrite : false;
                    if (mat.uniforms && mat.uniforms.colorAlpha) {
                        mat.uniforms.colorAlpha.value = opacity;
                    }
                    mat.needsUpdate = true;
                }
            });
        });
    }
    
    // メッシュの表示/非表示
    function setMeshVisible(data, visible) {
        data.mesh.visible = visible;
    }
    
    // パネルHTML作成
    function createMaterialPanel() {
        if (materialPanel) return;
        
        materialPanel = document.createElement('div');
        materialPanel.id = 'material-panel';
        materialPanel.style.cssText = `
            display: none;
            position: fixed;
            top: 60px;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(255, 255, 255, 0.98);
            border-radius: 12px;
            box-shadow: 0 8px 32px rgba(0,0,0,0.3);
            z-index: 10003;
            width: 420px;
            max-height: 85vh;
            font-family: 'Segoe UI', sans-serif;
            font-size: 11px;
            overflow: hidden;
        `;
        materialPanel.innerHTML = `
            <div id="material-panel-header" style="padding: 12px 16px; background: linear-gradient(135deg, #e91e63 0%, #9c27b0 100%); color: white; cursor: move; user-select: none;">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <span style="font-weight: bold; font-size: 14px;">👗 マテリアル透明度・着せ替え</span>
                    <button id="material-panel-close" style="background: rgba(255,255,255,0.2); border: none; font-size: 16px; cursor: pointer; padding: 4px 8px; border-radius: 4px; color: white;">✕</button>
                </div>
                <div style="font-size: 10px; opacity: 0.8; margin-top: 4px;">服パーツの透明度を操作して着せ替え（ドラッグで移動可）</div>
            </div>
            
            <!-- クイックプリセット -->
            <div style="padding: 10px 16px; border-bottom: 1px solid #eee; display: flex; gap: 6px; flex-wrap: wrap;">
                <button class="mat-preset-btn" data-preset="all-show" style="padding: 5px 10px; border: 1px solid #ddd; border-radius: 6px; background: #e8f5e9; cursor: pointer; font-size: 10px; font-weight: bold;">👔 全て表示</button>
                <button class="mat-preset-btn" data-preset="cloth-hide" style="padding: 5px 10px; border: 1px solid #ddd; border-radius: 6px; background: #fce4ec; cursor: pointer; font-size: 10px; font-weight: bold;">👙 服を透明</button>
                <button class="mat-preset-btn" data-preset="cloth-half" style="padding: 5px 10px; border: 1px solid #ddd; border-radius: 6px; background: #f3e5f5; cursor: pointer; font-size: 10px; font-weight: bold;">🩱 服を半透明</button>
                <button class="mat-preset-btn" data-preset="top-hide" style="padding: 5px 10px; border: 1px solid #ddd; border-radius: 6px; background: #fff3e0; cursor: pointer; font-size: 10px; font-weight: bold;">👕 トップスのみ透明</button>
                <button class="mat-preset-btn" data-preset="bottom-hide" style="padding: 5px 10px; border: 1px solid #ddd; border-radius: 6px; background: #e0f7fa; cursor: pointer; font-size: 10px; font-weight: bold;">👖 ボトムスのみ透明</button>
                <button class="mat-preset-btn" data-preset="shoes-hide" style="padding: 5px 10px; border: 1px solid #ddd; border-radius: 6px; background: #efebe9; cursor: pointer; font-size: 10px; font-weight: bold;">👟 靴を透明</button>
            </div>
            
            <!-- カスタムプリセット保存/読込 -->
            <div style="padding: 8px 16px; border-bottom: 1px solid #eee; display: flex; gap: 6px; align-items: center;">
                <button id="mat-save-preset" style="padding: 5px 10px; border: 1px solid #4caf50; border-radius: 6px; background: #e8f5e9; cursor: pointer; font-size: 10px; font-weight: bold; color: #2e7d32;">💾 保存</button>
                <select id="mat-preset-select" style="flex:1; padding: 5px 8px; border: 1px solid #ddd; border-radius: 6px; font-size: 10px;">
                    <option value="">-- カスタムプリセット --</option>
                </select>
                <button id="mat-load-preset" style="padding: 5px 10px; border: 1px solid #2196f3; border-radius: 6px; background: #e3f2fd; cursor: pointer; font-size: 10px; font-weight: bold; color: #1565c0;">📂 適用</button>
                <button id="mat-delete-preset" style="padding: 5px 8px; border: 1px solid #f44336; border-radius: 6px; background: #ffebee; cursor: pointer; font-size: 10px; color: #c62828;">🗑️</button>
            </div>
            
            <!-- カテゴリ一括操作 -->
            <div id="material-category-controls" style="padding: 8px 16px; border-bottom: 1px solid #eee; font-size: 10px; color: #666;">
                カテゴリ一括: 下のグループヘッダのスライダーで一括操作
            </div>
            
            <!-- マテリアルリスト -->
            <div id="material-list" style="padding: 8px 16px; max-height: 50vh; overflow-y: auto;">
                <div style="text-align: center; padding: 20px; color: #888;">VRMモデルを読み込んでください</div>
            </div>
            
            <!-- リセットボタン -->
            <div style="padding: 10px 16px; border-top: 1px solid #eee; background: #f9f9f9;">
                <button id="material-reset-all" style="width: 100%; padding: 10px; border: none; border-radius: 6px; background: linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%); color: white; font-weight: bold; cursor: pointer; font-size: 12px;">🔄 すべて元に戻す</button>
            </div>
        `;
        document.body.appendChild(materialPanel);
        
        // イベント設定
        document.getElementById('material-panel-close').addEventListener('click', hideMaterialPanel);
        document.getElementById('material-reset-all').addEventListener('click', resetAllMaterials);
        document.getElementById('mat-save-preset').addEventListener('click', saveCustomPreset);
        document.getElementById('mat-load-preset').addEventListener('click', loadCustomPreset);
        document.getElementById('mat-delete-preset').addEventListener('click', deleteCustomPreset);
        
        // クイックプリセット
        materialPanel.querySelectorAll('.mat-preset-btn').forEach(btn => {
            btn.addEventListener('click', () => applyQuickPreset(btn.dataset.preset));
        });
        
        // ドラッグ移動
        makePanelDraggable(materialPanel, document.getElementById('material-panel-header'));
        
        // カスタムプリセット読み込み
        loadCustomPresetsToDropdown();
    }
    
    // マテリアルリストを描画
    function renderMaterialList() {
        const listEl = document.getElementById('material-list');
        if (!listEl) return;
        
        if (meshDataCache.length === 0) {
            listEl.innerHTML = '<div style="text-align: center; padding: 20px; color: #888;">マテリアルが見つかりません</div>';
            return;
        }
        
        let html = '';
        let currentCategory = '';
        
        meshDataCache.forEach((data, idx) => {
            // カテゴリヘッダ
            if (data.category !== currentCategory) {
                currentCategory = data.category;
                const catId = `mat-cat-${idx}`;
                html += `
                    <div style="margin-top: ${idx > 0 ? '12px' : '0'}; padding: 6px 10px; background: linear-gradient(135deg, #667eea20, #764ba220); border-radius: 6px; display: flex; align-items: center; gap: 8px; justify-content: space-between;">
                        <span style="font-weight: bold; font-size: 12px;">${currentCategory}</span>
                        <div style="display: flex; align-items: center; gap: 6px;">
                            <input type="range" class="mat-cat-slider" data-category="${currentCategory}" min="0" max="100" value="100" style="width: 80px; height: 4px; cursor: pointer;">
                            <span class="mat-cat-value" data-category="${currentCategory}" style="font-size: 9px; min-width: 30px; text-align: right;">100%</span>
                        </div>
                    </div>
                `;
            }
            
            // 各マテリアル行
            const opacity = Math.round(data.material.opacity * 100);
            const visible = data.mesh.visible;
            html += `
                <div class="mat-row" data-idx="${idx}" style="display: flex; align-items: center; gap: 6px; padding: 4px 6px; margin: 2px 0; border-radius: 4px; transition: background 0.15s;" 
                     onmouseover="this.style.background='#f5f5f5'" onmouseout="this.style.background='transparent'">
                    <button class="mat-vis-btn" data-idx="${idx}" title="表示/非表示" style="border: none; background: none; cursor: pointer; font-size: 14px; padding: 2px; min-width: 22px;">${visible ? '👁️' : '🚫'}</button>
                    <div style="flex: 1; min-width: 0;">
                        <div style="font-size: 10px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${data.fullName}">${data.displayName}</div>
                    </div>
                    <input type="range" class="mat-opacity-slider" data-idx="${idx}" min="0" max="100" value="${opacity}" style="width: 80px; height: 4px; cursor: pointer; accent-color: #e91e63;">
                    <input type="number" class="mat-opacity-num" data-idx="${idx}" min="0" max="100" value="${opacity}" style="width: 38px; padding: 2px 4px; border: 1px solid #ddd; border-radius: 4px; font-size: 10px; text-align: center;">
                    <span style="font-size: 9px; color: #888;">%</span>
                </div>
            `;
        });
        
        listEl.innerHTML = html;
        
        // イベント設定
        listEl.querySelectorAll('.mat-opacity-slider').forEach(slider => {
            slider.addEventListener('input', (e) => {
                const idx = parseInt(e.target.dataset.idx);
                const val = parseInt(e.target.value) / 100;
                setMaterialOpacity(meshDataCache[idx], val);
                // 数値入力も同期
                const numInput = listEl.querySelector(`.mat-opacity-num[data-idx="${idx}"]`);
                if (numInput) numInput.value = e.target.value;
            });
        });
        
        listEl.querySelectorAll('.mat-opacity-num').forEach(numInput => {
            numInput.addEventListener('change', (e) => {
                const idx = parseInt(e.target.dataset.idx);
                let val = Math.max(0, Math.min(100, parseInt(e.target.value) || 0));
                e.target.value = val;
                setMaterialOpacity(meshDataCache[idx], val / 100);
                // スライダーも同期
                const slider = listEl.querySelector(`.mat-opacity-slider[data-idx="${idx}"]`);
                if (slider) slider.value = val;
            });
        });
        
        listEl.querySelectorAll('.mat-vis-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const idx = parseInt(e.currentTarget.dataset.idx);
                const data = meshDataCache[idx];
                const newVisible = !data.mesh.visible;
                setMeshVisible(data, newVisible);
                e.currentTarget.textContent = newVisible ? '👁️' : '🚫';
            });
        });
        
        // カテゴリ一括スライダー
        listEl.querySelectorAll('.mat-cat-slider').forEach(slider => {
            slider.addEventListener('input', (e) => {
                const cat = e.target.dataset.category;
                const val = parseInt(e.target.value) / 100;
                // カテゴリ内の全マテリアルに適用
                meshDataCache.forEach((data, idx) => {
                    if (data.category === cat) {
                        setMaterialOpacity(data, val);
                        const s = listEl.querySelector(`.mat-opacity-slider[data-idx="${idx}"]`);
                        const n = listEl.querySelector(`.mat-opacity-num[data-idx="${idx}"]`);
                        if (s) s.value = Math.round(val * 100);
                        if (n) n.value = Math.round(val * 100);
                    }
                });
                // 値表示更新
                const valSpan = document.querySelector(`.mat-cat-value[data-category="${cat}"]`);
                if (valSpan) valSpan.textContent = e.target.value + '%';
            });
        });
    }
    
    // ========================================
    // クイックプリセット
    // ========================================
    
    function isClothingCategory(cat) {
        return cat.includes('トップス') || cat.includes('ボトムス') || cat.includes('靴') || cat.includes('アクセサリ') || cat.includes('服');
    }
    
    function applyQuickPreset(preset) {
        const listEl = document.getElementById('material-list');
        
        meshDataCache.forEach((data, idx) => {
            let opacity = 1;
            let visible = true;
            
            switch (preset) {
                case 'all-show':
                    opacity = 1;
                    visible = true;
                    break;
                case 'cloth-hide':
                    if (isClothingCategory(data.category)) opacity = 0;
                    break;
                case 'cloth-half':
                    if (isClothingCategory(data.category)) opacity = 0.3;
                    break;
                case 'top-hide':
                    if (data.category.includes('トップス')) opacity = 0;
                    break;
                case 'bottom-hide':
                    if (data.category.includes('ボトムス')) opacity = 0;
                    break;
                case 'shoes-hide':
                    if (data.category.includes('靴')) opacity = 0;
                    break;
            }
            
            setMaterialOpacity(data, opacity);
            setMeshVisible(data, visible);
            
            // UI同期
            if (listEl) {
                const s = listEl.querySelector(`.mat-opacity-slider[data-idx="${idx}"]`);
                const n = listEl.querySelector(`.mat-opacity-num[data-idx="${idx}"]`);
                const v = listEl.querySelector(`.mat-vis-btn[data-idx="${idx}"]`);
                if (s) s.value = Math.round(opacity * 100);
                if (n) n.value = Math.round(opacity * 100);
                if (v) v.textContent = visible ? '👁️' : '🚫';
            }
        });
        
        // カテゴリスライダーも同期
        syncCategorySliders();
        
        console.log(`👗 プリセット適用: ${preset}`);
    }
    
    // カテゴリスライダーを現在の値に同期
    function syncCategorySliders() {
        const cats = new Map();
        meshDataCache.forEach(data => {
            if (!cats.has(data.category)) cats.set(data.category, []);
            cats.get(data.category).push(data.material.opacity);
        });
        
        cats.forEach((opacities, cat) => {
            const avg = opacities.reduce((a, b) => a + b, 0) / opacities.length;
            const slider = document.querySelector(`.mat-cat-slider[data-category="${cat}"]`);
            const valSpan = document.querySelector(`.mat-cat-value[data-category="${cat}"]`);
            if (slider) slider.value = Math.round(avg * 100);
            if (valSpan) valSpan.textContent = Math.round(avg * 100) + '%';
        });
    }
    
    // ========================================
    // カスタムプリセット保存/読込
    // ========================================
    
    function getCustomPresets() {
        try {
            return JSON.parse(localStorage.getItem('vrm-material-presets') || '[]');
        } catch (e) { return []; }
    }
    
    function saveCustomPresetsToStorage(presets) {
        localStorage.setItem('vrm-material-presets', JSON.stringify(presets));
    }
    
    function loadCustomPresetsToDropdown() {
        const select = document.getElementById('mat-preset-select');
        if (!select) return;
        
        const presets = getCustomPresets();
        select.innerHTML = '<option value="">-- カスタムプリセット --</option>';
        presets.forEach((p, i) => {
            const opt = document.createElement('option');
            opt.value = i;
            opt.textContent = `${p.name} (${Object.keys(p.values).length}パーツ)`;
            select.appendChild(opt);
        });
    }
    
    function saveCustomPreset() {
        const name = prompt('プリセット名を入力:', `着せ替え${Date.now() % 1000}`);
        if (!name || !name.trim()) return;
        
        const values = {};
        meshDataCache.forEach((data, idx) => {
            values[data.fullName] = {
                opacity: data.material.opacity,
                visible: data.mesh.visible,
            };
        });
        
        const presets = getCustomPresets();
        presets.push({ name: name.trim(), values, createdAt: new Date().toISOString() });
        saveCustomPresetsToStorage(presets);
        loadCustomPresetsToDropdown();
        
        console.log(`💾 マテリアルプリセット保存: ${name}`);
        alert(`「${name}」を保存しました！`);
    }
    
    function loadCustomPreset() {
        const select = document.getElementById('mat-preset-select');
        const idx = parseInt(select.value);
        if (isNaN(idx)) return;
        
        const presets = getCustomPresets();
        const preset = presets[idx];
        if (!preset) return;
        
        const listEl = document.getElementById('material-list');
        
        meshDataCache.forEach((data, i) => {
            const saved = preset.values[data.fullName];
            if (saved) {
                setMaterialOpacity(data, saved.opacity);
                setMeshVisible(data, saved.visible);
                
                if (listEl) {
                    const s = listEl.querySelector(`.mat-opacity-slider[data-idx="${i}"]`);
                    const n = listEl.querySelector(`.mat-opacity-num[data-idx="${i}"]`);
                    const v = listEl.querySelector(`.mat-vis-btn[data-idx="${i}"]`);
                    if (s) s.value = Math.round(saved.opacity * 100);
                    if (n) n.value = Math.round(saved.opacity * 100);
                    if (v) v.textContent = saved.visible ? '👁️' : '🚫';
                }
            }
        });
        
        syncCategorySliders();
        console.log(`📂 プリセット適用: ${preset.name}`);
    }
    
    function deleteCustomPreset() {
        const select = document.getElementById('mat-preset-select');
        const idx = parseInt(select.value);
        if (isNaN(idx)) return;
        
        const presets = getCustomPresets();
        const name = presets[idx]?.name;
        if (!confirm(`「${name}」を削除しますか？`)) return;
        
        presets.splice(idx, 1);
        saveCustomPresetsToStorage(presets);
        loadCustomPresetsToDropdown();
        console.log(`🗑️ プリセット削除: ${name}`);
    }
    
    // ========================================
    // リセット
    // ========================================
    
    function resetAllMaterials() {
        const listEl = document.getElementById('material-list');
        
        meshDataCache.forEach((data, idx) => {
            // 初期値に復元
            data.material.opacity = data.originalOpacity;
            data.material.transparent = data.originalTransparent;
            data.material.depthWrite = data.originalDepthWrite;
            data.material.alphaTest = data.originalAlphaTest;
            data.mesh.visible = data.originalVisible;
            
            if (data.material.uniforms && data.material.uniforms.colorAlpha) {
                data.material.uniforms.colorAlpha.value = data.originalOpacity;
            }
            data.material.needsUpdate = true;
            
            // Outlineも復元
            syncOutlineMaterial(data, data.originalOpacity);
            
            // UI同期
            if (listEl) {
                const s = listEl.querySelector(`.mat-opacity-slider[data-idx="${idx}"]`);
                const n = listEl.querySelector(`.mat-opacity-num[data-idx="${idx}"]`);
                const v = listEl.querySelector(`.mat-vis-btn[data-idx="${idx}"]`);
                if (s) s.value = Math.round(data.originalOpacity * 100);
                if (n) n.value = Math.round(data.originalOpacity * 100);
                if (v) v.textContent = data.originalVisible ? '👁️' : '🚫';
            }
        });
        
        syncCategorySliders();
        console.log('🔄 全マテリアルリセット');
    }
    
    // ========================================
    // パネル表示/非表示
    // ========================================
    
    function showMaterialPanel(vrm) {
        if (!materialPanel) createMaterialPanel();
        
        currentVRM = vrm || window.selectedVRM || (window.app && window.app.vrm);
        if (!currentVRM) {
            alert('VRMモデルが読み込まれていません');
            return;
        }
        
        collectMeshData(currentVRM);
        renderMaterialList();
        loadCustomPresetsToDropdown();
        
        materialPanel.style.display = 'block';
        console.log(`👗 マテリアルパネル表示 (${meshDataCache.length}パーツ)`);
    }
    
    function hideMaterialPanel() {
        if (materialPanel) materialPanel.style.display = 'none';
    }
    
    // ========================================
    // ドラッグ移動
    // ========================================
    
    function makePanelDraggable(panel, handle) {
        let isDragging = false, startX, startY, startLeft, startTop;
        
        handle.addEventListener('mousedown', (e) => {
            if (e.target.tagName === 'BUTTON') return;
            isDragging = true;
            startX = e.clientX;
            startY = e.clientY;
            const rect = panel.getBoundingClientRect();
            startLeft = rect.left;
            startTop = rect.top;
            panel.style.transform = 'none';
        });
        
        document.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            panel.style.left = Math.max(0, startLeft + e.clientX - startX) + 'px';
            panel.style.top = Math.max(0, startTop + e.clientY - startY) + 'px';
        });
        
        document.addEventListener('mouseup', () => isDragging = false);
    }
    
    // ========================================
    // 右クリックメニューに項目追加
    // ========================================
    
    function addContextMenuItem() {
        const waitForMenu = setInterval(() => {
            const menu = document.getElementById('model-context-menu');
            if (!menu) return;
            clearInterval(waitForMenu);
            
            // 既に追加されていたらスキップ
            if (menu.querySelector('[data-action="material"]')) return;
            
            // モーフ調整の後に挿入
            const morphItem = menu.querySelector('[data-action="morph"]');
            if (!morphItem) return;
            
            const matItem = document.createElement('div');
            matItem.className = 'ctx-item ctx-vrm-only';
            matItem.dataset.action = 'material';
            matItem.style.cssText = 'padding: 8px 12px; cursor: pointer; display: flex; align-items: center; gap: 8px; border-bottom: 1px solid #eee; background: #fce4ec;';
            matItem.innerHTML = '<span>👗</span> マテリアル透明度';
            
            // ホバー
            matItem.addEventListener('mouseenter', () => matItem.style.background = '#f8bbd0');
            matItem.addEventListener('mouseleave', () => matItem.style.background = '#fce4ec');
            
            // クリック
            matItem.addEventListener('click', () => {
                menu.style.display = 'none';
                showMaterialPanel();
            });
            
            morphItem.parentNode.insertBefore(matItem, morphItem.nextSibling);
            
            console.log('✅ 右クリックメニューに「マテリアル透明度」追加');
        }, 500);
        
        setTimeout(() => clearInterval(waitForMenu), 10000);
    }
    
    // ========================================
    // グローバルAPI
    // ========================================
    
    window.materialPanel = {
        show: showMaterialPanel,
        hide: hideMaterialPanel,
        reset: resetAllMaterials,
        setOpacity: (matNamePart, opacity) => {
            meshDataCache.forEach(data => {
                if (data.fullName.includes(matNamePart) || data.displayName.includes(matNamePart)) {
                    setMaterialOpacity(data, opacity);
                }
            });
        },
        setCategoryOpacity: (categoryPart, opacity) => {
            meshDataCache.forEach(data => {
                if (data.category.includes(categoryPart)) {
                    setMaterialOpacity(data, opacity);
                }
            });
        },
        hideClothing: () => applyQuickPreset('cloth-hide'),
        showAll: () => applyQuickPreset('all-show'),
    };
    
    // ========================================
    // 初期化
    // ========================================
    
    addContextMenuItem();
    
    console.log('✅ material-panel.js 読み込み完了');
    console.log('  window.materialPanel.show() - パネル表示');
    console.log('  window.materialPanel.setOpacity("Tops", 0.5) - 名前で透明度設定');
    console.log('  window.materialPanel.setCategoryOpacity("トップス", 0) - カテゴリ一括');
    console.log('  window.materialPanel.hideClothing() - 服を透明に');
    console.log('  window.materialPanel.showAll() - 全て表示');
})();
