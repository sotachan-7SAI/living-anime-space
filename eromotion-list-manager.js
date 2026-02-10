// Eromotion List Manager v2.0
// モーフ設定 + 名前変更 + ドラッグ移動フローティングパネル

import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { VRMAnimationLoaderPlugin, createVRMAnimationClip } from '@pixiv/three-vrm-animation';

class EromotionListManager {
    constructor() {
        this.eromotionFiles = [];
        this.filterText = '';
        this.isLoaded = false;
        this.isDragging = false;
        this.dragOffset = { x: 0, y: 0 };
        this.panel = null;
        
        // eromotion設定 (localStorage管理)
        // { "filename.vrma": { displayName: "...", morphs: { happy: 0.5, blink: 0.3, ... } } }
        this.eromotionSettings = {};
        
        // 主要モーフリスト（UIに表示するもの）
        this.morphList = [
            { key: 'happy', label: '😊 喜び' },
            { key: 'angry', label: '😠 怒り' },
            { key: 'sad', label: '😢 悲しみ' },
            { key: 'relaxed', label: '😌 リラックス' },
            { key: 'surprised', label: '😮 驚き' },
            { key: 'blink', label: '👁️ まばたき' },
            { key: 'blinkLeft', label: '👁️ 左まばたき' },
            { key: 'blinkRight', label: '👁️ 右まばたき' },
            { key: 'aa', label: '👄 あ' },
            { key: 'ih', label: '👄 い' },
            { key: 'ou', label: '👄 う' },
            { key: 'ee', label: '👄 え' },
            { key: 'oh', label: '👄 お' },
            { key: 'lookUp', label: '👀 上を見る' },
            { key: 'lookDown', label: '👀 下を見る' },
            { key: 'lookLeft', label: '👀 左を見る' },
            { key: 'lookRight', label: '👀 右を見る' },
            { key: 'neutral', label: '😐 ニュートラル' },
        ];
        
        this.init();
    }
    
    init() {
        const self = this;
        this.loadSettings();
        this.createFloatingPanel();
        this.createMorphDialog();
        this.createRenameDialog();
        
        setTimeout(() => {
            const btn = document.getElementById('eromotion-btn');
            if (btn) btn.onclick = () => self.togglePanel();
            console.log('💋 EromotionListManager v2.0 initialized (モーフ+リネーム対応)');
        }, 500);
        
        window.eromotionListManager = this;
    }
    
    // ========== 設定管理 ==========
    
    loadSettings() {
        try {
            const saved = localStorage.getItem('eromotionSettings');
            if (saved) this.eromotionSettings = JSON.parse(saved);
        } catch (e) {}
    }
    
    saveSettings() {
        try {
            localStorage.setItem('eromotionSettings', JSON.stringify(this.eromotionSettings));
            console.log('💾 eromotion設定を保存');
        } catch (e) {}
    }
    
    getSettings(filename) {
        return this.eromotionSettings[filename] || {};
    }
    
    getDisplayName(filename) {
        const s = this.getSettings(filename);
        return s.displayName || filename.replace('.vrma', '');
    }
    
    getMorphs(filename) {
        const s = this.getSettings(filename);
        return s.morphs || {};
    }
    
    // ========== フローティングパネル ==========
    
    createFloatingPanel() {
        const style = document.createElement('style');
        style.textContent = `
            #eromotion-float-panel {
                position: fixed;
                top: 80px;
                left: calc(50% + 260px);
                width: 450px;
                min-width: 340px;
                min-height: 300px;
                max-height: 85vh;
                background: rgba(255, 255, 255, 0.98);
                border-radius: 12px;
                box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
                z-index: 9999;
                display: none;
                flex-direction: column;
                font-family: 'Segoe UI', 'Yu Gothic', sans-serif;
                resize: both;
                overflow: visible;
            }
            #eromotion-float-panel.visible { display: flex; }
            
            #eromotion-float-header {
                background: linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%);
                color: white;
                padding: 10px 15px;
                cursor: move;
                display: flex;
                align-items: center;
                justify-content: space-between;
                user-select: none;
                border-radius: 12px 12px 0 0;
            }
            #eromotion-float-header .title { font-size: 14px; font-weight: bold; }
            #eromotion-float-header .close-btn {
                background: rgba(255,255,255,0.2);
                border: none;
                color: white;
                width: 26px; height: 26px;
                border-radius: 50%;
                cursor: pointer;
                font-size: 14px;
            }
            #eromotion-float-header .close-btn:hover { background: rgba(255,255,255,0.3); }
            
            #eromotion-float-body {
                padding: 10px;
                flex: 1;
                display: flex;
                flex-direction: column;
                overflow: hidden;
                border-radius: 0 0 12px 12px;
            }
            
            #eromotion-float-controls {
                display: flex;
                gap: 6px;
                margin-bottom: 8px;
                align-items: center;
            }
            #eromotion-float-controls input[type="text"] {
                flex: 1;
                padding: 6px 10px;
                border: 1px solid #ddd;
                border-radius: 6px;
                font-size: 12px;
            }
            #eromotion-float-controls .count { font-size: 10px; color: #888; white-space: nowrap; }
            
            #eromotion-float-list {
                flex: 1;
                overflow-y: auto;
                overflow-x: visible;
                padding: 0 4px;
            }
            
            .ero-item {
                background: #f8f9fa;
                border: 1px solid #e0e0e0;
                border-radius: 6px;
                padding: 5px 8px;
                margin-bottom: 3px;
                cursor: pointer;
                display: flex;
                align-items: center;
                gap: 5px;
                transition: all 0.15s;
                position: relative;
            }
            .ero-item:hover { background: linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%); color: white; }
            .ero-item.playing { background: linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%); color: white; border-color: #ff6b6b; }
            
            .ero-item .e-icon { font-size: 14px; width: 20px; text-align: center; flex-shrink: 0; }
            .ero-item .e-name { flex: 1; font-size: 11px; font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
            
            /* モーフ設定済みバッジ */
            .ero-item .e-morph-badge {
                font-size: 9px;
                background: #ff9800;
                color: white;
                padding: 1px 4px;
                border-radius: 3px;
                flex-shrink: 0;
            }
            .ero-item:hover .e-morph-badge, .ero-item.playing .e-morph-badge { background: rgba(255,255,255,0.3); }
            
            /* 操作ボタン */
            .ero-item .e-actions {
                display: flex;
                gap: 2px;
                flex-shrink: 0;
            }
            .ero-item .e-action-btn {
                font-size: 12px;
                padding: 2px 4px;
                cursor: pointer;
                opacity: 0.4;
                transition: opacity 0.2s;
                border-radius: 3px;
            }
            .ero-item .e-action-btn:hover { opacity: 1; background: rgba(0,0,0,0.1); }
            .ero-item:hover .e-action-btn { opacity: 0.8; }
            .ero-item.playing .e-action-btn { opacity: 0.8; }
            
            .ero-float-loading {
                text-align: center;
                padding: 20px;
                color: #888;
                font-size: 12px;
            }
            
            #eromotion-resize-handle {
                position: absolute;
                right: 0; bottom: 0;
                width: 20px; height: 20px;
                cursor: nwse-resize;
                background: linear-gradient(135deg, transparent 50%, #ff6b6b 50%);
                border-radius: 0 0 12px 0;
            }
            
            #eromotion-float-list::-webkit-scrollbar { width: 5px; }
            #eromotion-float-list::-webkit-scrollbar-thumb { background: #ccc; border-radius: 3px; }
            
            /* === モーフ設定ダイアログ === */
            #ero-morph-dialog {
                position: fixed;
                top: 0; left: 0; right: 0; bottom: 0;
                background: rgba(0,0,0,0.5);
                z-index: 20000;
                display: none;
                align-items: center;
                justify-content: center;
            }
            #ero-morph-dialog.show { display: flex; }
            
            #ero-morph-box {
                background: white;
                border-radius: 12px;
                padding: 16px;
                width: 420px;
                max-width: 95vw;
                max-height: 80vh;
                box-shadow: 0 8px 32px rgba(0,0,0,0.3);
                display: flex;
                flex-direction: column;
            }
            #ero-morph-box .morph-title {
                font-size: 14px;
                font-weight: bold;
                margin-bottom: 8px;
                color: #333;
                display: flex;
                align-items: center;
                gap: 6px;
            }
            #ero-morph-box .morph-filename {
                font-size: 10px;
                color: #888;
                margin-bottom: 10px;
                word-break: break-all;
            }
            #ero-morph-box .morph-sliders {
                flex: 1;
                overflow-y: auto;
                margin-bottom: 10px;
                padding-right: 4px;
            }
            .morph-slider-row {
                display: flex;
                align-items: center;
                gap: 6px;
                margin-bottom: 4px;
                padding: 3px 0;
            }
            .morph-slider-row label {
                font-size: 11px;
                width: 100px;
                flex-shrink: 0;
                white-space: nowrap;
            }
            .morph-slider-row input[type="range"] {
                flex: 1;
                height: 4px;
                accent-color: #ff6b6b;
            }
            .morph-slider-row .morph-val {
                font-size: 10px;
                color: #666;
                min-width: 32px;
                text-align: right;
            }
            
            #ero-morph-box .morph-buttons {
                display: flex;
                gap: 8px;
                justify-content: flex-end;
            }
            #ero-morph-box .morph-buttons button {
                padding: 7px 16px;
                border: none;
                border-radius: 6px;
                font-size: 12px;
                font-weight: bold;
                cursor: pointer;
            }
            #ero-morph-box .morph-btn-cancel { background: #e0e0e0; color: #333; }
            #ero-morph-box .morph-btn-reset { background: #ff9800; color: white; }
            #ero-morph-box .morph-btn-save { background: linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%); color: white; }
            #ero-morph-box .morph-btn-save:hover { opacity: 0.9; }
            
            #ero-morph-box .morph-sliders::-webkit-scrollbar { width: 4px; }
            #ero-morph-box .morph-sliders::-webkit-scrollbar-thumb { background: #ccc; border-radius: 2px; }
            
            /* === リネームダイアログ === */
            #ero-rename-dialog {
                position: fixed;
                top: 0; left: 0; right: 0; bottom: 0;
                background: rgba(0,0,0,0.5);
                z-index: 20000;
                display: none;
                align-items: center;
                justify-content: center;
            }
            #ero-rename-dialog.show { display: flex; }
            
            #ero-rename-box {
                background: white;
                border-radius: 12px;
                padding: 20px;
                width: 400px;
                max-width: 90vw;
                box-shadow: 0 8px 32px rgba(0,0,0,0.3);
            }
            #ero-rename-box h3 { margin: 0 0 10px 0; font-size: 15px; color: #333; }
            #ero-rename-box .orig-name { font-size: 10px; color: #888; margin-bottom: 10px; word-break: break-all; }
            #ero-rename-box input {
                width: 100%; padding: 8px 10px;
                border: 2px solid #ddd; border-radius: 8px;
                font-size: 13px; margin-bottom: 12px; box-sizing: border-box;
            }
            #ero-rename-box input:focus { outline: none; border-color: #ff6b6b; }
            #ero-rename-box .buttons { display: flex; gap: 8px; justify-content: flex-end; }
            #ero-rename-box button {
                padding: 7px 18px; border: none; border-radius: 6px;
                font-size: 12px; font-weight: bold; cursor: pointer;
            }
            #ero-rename-box .cancel-btn { background: #e0e0e0; color: #333; }
            #ero-rename-box .ok-btn { background: linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%); color: white; }
        `;
        document.head.appendChild(style);
        
        this.panel = document.createElement('div');
        this.panel.id = 'eromotion-float-panel';
        this.panel.innerHTML = `
            <div id="eromotion-float-header">
                <div class="title">💋 eromotion一覧</div>
                <button class="close-btn" id="eromotion-float-close">✕</button>
            </div>
            <div id="eromotion-float-body">
                <div id="eromotion-float-controls">
                    <input type="text" id="eromotion-float-input" placeholder="🔍 検索...">
                    <span class="count" id="eromotion-float-count"></span>
                </div>
                <div id="eromotion-float-list">
                    <div class="ero-float-loading">💋 eromotionボタンで読み込み</div>
                </div>
            </div>
            <div id="eromotion-resize-handle"></div>
        `;
        document.body.appendChild(this.panel);
        this.setupPanelEvents();
    }
    
    // ========== モーフ設定ダイアログ ==========
    
    createMorphDialog() {
        const dialog = document.createElement('div');
        dialog.id = 'ero-morph-dialog';
        dialog.innerHTML = `
            <div id="ero-morph-box">
                <div class="morph-title">🎨 モーフ設定 <span id="ero-morph-name"></span></div>
                <div class="morph-filename" id="ero-morph-filename"></div>
                <div class="morph-sliders" id="ero-morph-sliders"></div>
                <div class="morph-buttons">
                    <button class="morph-btn-reset" id="ero-morph-reset">🔄 リセット</button>
                    <button class="morph-btn-cancel" id="ero-morph-cancel">キャンセル</button>
                    <button class="morph-btn-save" id="ero-morph-save">💾 保存</button>
                </div>
            </div>
        `;
        document.body.appendChild(dialog);
        
        const self = this;
        dialog.onclick = (e) => { if (e.target === dialog) self.closeMorphDialog(); };
        document.getElementById('ero-morph-cancel').onclick = () => self.closeMorphDialog();
        document.getElementById('ero-morph-save').onclick = () => self.saveMorphSettings();
        document.getElementById('ero-morph-reset').onclick = () => self.resetMorphSliders();
    }
    
    openMorphDialog(filename) {
        this.currentMorphFile = filename;
        const displayName = this.getDisplayName(filename);
        const morphs = this.getMorphs(filename);
        
        document.getElementById('ero-morph-name').textContent = displayName;
        document.getElementById('ero-morph-filename').textContent = '元ファイル: ' + filename;
        
        // スライダー生成
        const container = document.getElementById('ero-morph-sliders');
        container.innerHTML = '';
        
        for (const m of this.morphList) {
            const val = morphs[m.key] || 0;
            const row = document.createElement('div');
            row.className = 'morph-slider-row';
            row.innerHTML = `
                <label>${m.label}</label>
                <input type="range" min="0" max="1" step="0.01" value="${val}" data-morph="${m.key}">
                <span class="morph-val">${val.toFixed(2)}</span>
            `;
            
            const slider = row.querySelector('input[type="range"]');
            const valSpan = row.querySelector('.morph-val');
            slider.oninput = () => {
                valSpan.textContent = parseFloat(slider.value).toFixed(2);
                // リアルタイムプレビュー
                this.previewMorph(m.key, parseFloat(slider.value));
            };
            
            container.appendChild(row);
        }
        
        document.getElementById('ero-morph-dialog').classList.add('show');
    }
    
    closeMorphDialog() {
        document.getElementById('ero-morph-dialog').classList.remove('show');
        this.currentMorphFile = null;
    }
    
    resetMorphSliders() {
        const sliders = document.querySelectorAll('#ero-morph-sliders input[type="range"]');
        sliders.forEach(s => {
            s.value = 0;
            s.nextElementSibling.textContent = '0.00';
            this.previewMorph(s.dataset.morph, 0);
        });
    }
    
    previewMorph(morphKey, value) {
        if (!window.app || !window.app.vrm) return;
        const em = window.app.vrm.expressionManager;
        if (!em) return;
        try { em.setValue(morphKey, value); } catch(e) {}
    }
    
    saveMorphSettings() {
        const filename = this.currentMorphFile;
        if (!filename) return;
        
        const morphs = {};
        const sliders = document.querySelectorAll('#ero-morph-sliders input[type="range"]');
        sliders.forEach(s => {
            const v = parseFloat(s.value);
            if (v > 0) morphs[s.dataset.morph] = v;
        });
        
        if (!this.eromotionSettings[filename]) this.eromotionSettings[filename] = {};
        this.eromotionSettings[filename].morphs = morphs;
        this.saveSettings();
        
        this.closeMorphDialog();
        this.renderList();
        
        console.log(`💾 モーフ設定保存: ${filename}`, morphs);
    }
    
    // ========== リネームダイアログ ==========
    
    createRenameDialog() {
        const dialog = document.createElement('div');
        dialog.id = 'ero-rename-dialog';
        dialog.innerHTML = `
            <div id="ero-rename-box">
                <h3>✏️ 表示名を変更</h3>
                <div class="orig-name">元ファイル: <span id="ero-rename-original"></span></div>
                <input type="text" id="ero-rename-input" placeholder="新しい表示名...">
                <div class="buttons">
                    <button class="cancel-btn" id="ero-rename-cancel">キャンセル</button>
                    <button class="ok-btn" id="ero-rename-ok">変更する</button>
                </div>
            </div>
        `;
        document.body.appendChild(dialog);
        
        const self = this;
        dialog.onclick = (e) => { if (e.target === dialog) self.closeRenameDialog(); };
        document.getElementById('ero-rename-cancel').onclick = () => self.closeRenameDialog();
        document.getElementById('ero-rename-ok').onclick = () => self.confirmRename();
        document.getElementById('ero-rename-input').onkeypress = (e) => {
            if (e.key === 'Enter') self.confirmRename();
        };
    }
    
    openRenameDialog(filename) {
        this.currentRenameFile = filename;
        const displayName = this.getDisplayName(filename);
        
        document.getElementById('ero-rename-original').textContent = filename;
        document.getElementById('ero-rename-input').value = displayName;
        document.getElementById('ero-rename-dialog').classList.add('show');
        
        setTimeout(() => {
            const input = document.getElementById('ero-rename-input');
            input.focus();
            input.select();
        }, 100);
    }
    
    closeRenameDialog() {
        document.getElementById('ero-rename-dialog').classList.remove('show');
        this.currentRenameFile = null;
    }
    
    confirmRename() {
        const newName = document.getElementById('ero-rename-input').value.trim();
        if (!newName) return;
        
        const filename = this.currentRenameFile;
        if (!filename) return;
        
        if (!this.eromotionSettings[filename]) this.eromotionSettings[filename] = {};
        this.eromotionSettings[filename].displayName = newName;
        this.saveSettings();
        
        this.closeRenameDialog();
        this.renderList();
        
        console.log(`✏️ 表示名変更: ${filename} → ${newName}`);
    }
    
    // ========== パネルイベント ==========
    
    setupPanelEvents() {
        const self = this;
        const header = document.getElementById('eromotion-float-header');
        const closeBtn = document.getElementById('eromotion-float-close');
        const searchInput = document.getElementById('eromotion-float-input');
        
        closeBtn.onclick = () => self.hidePanel();
        
        searchInput.oninput = (e) => {
            self.filterText = e.target.value.toLowerCase();
            self.renderList();
        };
        
        // ドラッグ移動
        header.onmousedown = (e) => {
            if (e.target === closeBtn) return;
            self.isDragging = true;
            const rect = self.panel.getBoundingClientRect();
            self.dragOffset.x = e.clientX - rect.left;
            self.dragOffset.y = e.clientY - rect.top;
            e.preventDefault();
        };
        
        document.addEventListener('mousemove', (e) => {
            if (!self.isDragging) return;
            self.panel.style.left = (e.clientX - self.dragOffset.x) + 'px';
            self.panel.style.top = (e.clientY - self.dragOffset.y) + 'px';
        });
        document.addEventListener('mouseup', () => { self.isDragging = false; });
        
        // タッチ
        header.ontouchstart = (e) => {
            self.isDragging = true;
            const touch = e.touches[0];
            const rect = self.panel.getBoundingClientRect();
            self.dragOffset.x = touch.clientX - rect.left;
            self.dragOffset.y = touch.clientY - rect.top;
        };
        document.addEventListener('touchmove', (e) => {
            if (!self.isDragging) return;
            const touch = e.touches[0];
            self.panel.style.left = (touch.clientX - self.dragOffset.x) + 'px';
            self.panel.style.top = (touch.clientY - self.dragOffset.y) + 'px';
        });
        document.addEventListener('touchend', () => { self.isDragging = false; });
        
        // リサイズ
        const resizeHandle = document.getElementById('eromotion-resize-handle');
        let isResizing = false, startX, startY, startW, startH;
        
        resizeHandle.onmousedown = (e) => {
            isResizing = true;
            startX = e.clientX; startY = e.clientY;
            startW = self.panel.offsetWidth; startH = self.panel.offsetHeight;
            e.preventDefault(); e.stopPropagation();
        };
        document.addEventListener('mousemove', (e) => {
            if (!isResizing) return;
            const nw = startW + (e.clientX - startX);
            const nh = startH + (e.clientY - startY);
            if (nw >= 340) self.panel.style.width = nw + 'px';
            if (nh >= 300) self.panel.style.height = nh + 'px';
        });
        document.addEventListener('mouseup', () => { isResizing = false; });
    }
    
    togglePanel() {
        this.panel.classList.toggle('visible');
        if (this.panel.classList.contains('visible')) this.loadList();
    }
    showPanel() { this.panel.classList.add('visible'); this.loadList(); }
    hidePanel() { this.panel.classList.remove('visible'); }
    
    // ========== リスト管理 ==========
    
    async loadList() {
        const container = document.getElementById('eromotion-float-list');
        if (!container) return;
        
        if (this.isLoaded) { this.renderList(); return; }
        
        container.innerHTML = '<div class="ero-float-loading">🔄 読み込み中...</div>';
        
        try {
            const response = await fetch('./eromotion-vrma/eromotions.json?t=' + Date.now());
            if (!response.ok) throw new Error('JSON not found');
            const data = await response.json();
            
            this.eromotionFiles = data.eromotions || [];
            this.eromotionFiles.sort((a, b) => a.localeCompare(b, 'ja'));
            this.isLoaded = true;
            this.renderList();
            
            document.getElementById('eromotion-float-count').textContent = this.eromotionFiles.length + '件';
        } catch (e) {
            console.error('Eromotion list error:', e);
            container.innerHTML = '<div class="ero-float-loading">❌ eromotions.json が見つかりません</div>';
        }
    }
    
    renderList() {
        const container = document.getElementById('eromotion-float-list');
        if (!container) return;
        
        const filtered = this.eromotionFiles.filter(f => {
            if (!this.filterText) return true;
            const dn = this.getDisplayName(f).toLowerCase();
            return dn.includes(this.filterText) || f.toLowerCase().includes(this.filterText);
        });
        
        const countEl = document.getElementById('eromotion-float-count');
        if (countEl) {
            countEl.textContent = this.filterText 
                ? `${filtered.length}/${this.eromotionFiles.length}件`
                : `${this.eromotionFiles.length}件`;
        }
        
        if (filtered.length === 0) {
            container.innerHTML = '<div class="ero-float-loading">🔍 該当なし</div>';
            return;
        }
        
        container.innerHTML = '';
        const self = this;
        
        for (const file of filtered) {
            const item = document.createElement('div');
            item.className = 'ero-item';
            item.dataset.file = file;
            
            const displayName = this.getDisplayName(file);
            const morphs = this.getMorphs(file);
            const hasMorph = Object.keys(morphs).length > 0;
            const isRenamed = this.getSettings(file).displayName;
            
            // アイコン
            let icon = '💋';
            const n = file.toLowerCase();
            if (n.includes('ona') || n.includes('オナ')) icon = '🫦';
            else if (n.includes('sex')) icon = '💕';
            else if (n.includes('vol01') || n.includes('ねころび') || n.includes('もじもじ')) icon = '🌸';
            else if (n.includes('脱衣') || n.includes('ぬぎ')) icon = '👗';
            else if (n.includes('四つん這い')) icon = '🐾';
            else if (n.includes('拾う')) icon = '🤲';
            else if (n.includes('breast') || n.includes('乳')) icon = '🫧';
            else if (n.includes('♀')) icon = '♀️';
            else if (n.includes('♂')) icon = '♂️';
            else if (n.includes('kikyo')) icon = '🌺';
            else if (n.includes('aina')) icon = '🎀';
            else if (n.includes('eyo')) icon = '✨';
            
            item.innerHTML = `
                <span class="e-icon">${icon}</span>
                <span class="e-name" title="${file}">${displayName}</span>
                ${hasMorph ? '<span class="e-morph-badge">🎨M</span>' : ''}
                <span class="e-actions">
                    <span class="e-action-btn" data-action="morph" title="モーフ設定">🎨</span>
                    <span class="e-action-btn" data-action="rename" title="名前変更">✏️</span>
                </span>
            `;
            
            // モーション再生
            item.querySelector('.e-name').onclick = () => self.playEromotion(file, item);
            item.querySelector('.e-icon').onclick = () => self.playEromotion(file, item);
            
            // モーフ設定ボタン
            item.querySelector('[data-action="morph"]').onclick = (e) => {
                e.stopPropagation();
                self.openMorphDialog(file);
            };
            
            // リネームボタン
            item.querySelector('[data-action="rename"]').onclick = (e) => {
                e.stopPropagation();
                self.openRenameDialog(file);
            };
            
            container.appendChild(item);
        }
    }
    
    // ========== 再生 ==========
    
    async playEromotion(filename, element) {
        if (!window.app || !window.app.vrm) {
            alert('VRMモデルを先に読み込んでください');
            return;
        }
        
        const container = document.getElementById('eromotion-float-list');
        if (container) container.querySelectorAll('.ero-item').forEach(i => i.classList.remove('playing'));
        if (element) element.classList.add('playing');
        
        try {
            const loader = new GLTFLoader();
            loader.register((parser) => new VRMAnimationLoaderPlugin(parser));
            
            const url = './eromotion-vrma/' + encodeURIComponent(filename);
            const gltf = await loader.loadAsync(url);
            const vrmAnim = gltf.userData.vrmAnimation || gltf.userData.vrmAnimations?.[0];
            if (!vrmAnim) throw new Error('No animation data');
            
            if (window.app.currentAction) window.app.currentAction.stop();
            if (!window.app.mixer) window.app.mixer = new THREE.AnimationMixer(window.app.vrm.scene);
            
            const clip = createVRMAnimationClip(vrmAnim, window.app.vrm);
            window.app.currentAction = window.app.mixer.clipAction(clip);
            window.app.currentAction.reset();
            window.app.currentAction.play();
            
            // モーフ設定を適用
            this.applyMorphs(filename);
            
            console.log(`💋 Eromotion再生: ${filename}`);
            
        } catch (e) {
            console.error('Eromotion play error:', e);
            if (element) element.classList.remove('playing');
        }
    }
    
    applyMorphs(filename) {
        const morphs = this.getMorphs(filename);
        if (Object.keys(morphs).length === 0) return;
        
        if (!window.app || !window.app.vrm) return;
        const em = window.app.vrm.expressionManager;
        if (!em) return;
        
        // モーション一覧側の瞬きを一時停止
        if (window.motionListManager) {
            window.motionListManager.pauseBlink();
        }
        
        for (const [key, value] of Object.entries(morphs)) {
            try { em.setValue(key, value); } catch(e) {}
        }
        
        console.log(`🎨 モーフ適用: ${filename}`, morphs);
    }
}

const eromotionManager = new EromotionListManager();
