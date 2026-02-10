/**
 * Multi-Character Config Manager v1.0
 * マルチキャラクター設定の保存/読み込み
 */

(function() {
    'use strict';
    
    console.log('💾 Multi-Character Config Manager v1.0 読み込み開始');

    class MultiCharConfigManager {
        constructor() {
            this.storageKey = 'multichar_config_v1';
            this.presetsStorageKey = 'multichar_presets_v1';
            console.log('✅ MultiCharConfigManager初期化');
        }
        
        /**
         * 現在のマルチキャラ設定を収集
         */
        collectCurrentConfig() {
            const config = {
                version: '1.0',
                savedAt: new Date().toISOString(),
                characters: [],
                conversationSettings: {}
            };
            
            if (!window.multiCharManager) {
                console.warn('⚠️ MultiCharacterManagerが見つかりません');
                return null;
            }
            
            const manager = window.multiCharManager;
            
            manager.characters.forEach((charUnit, charId) => {
                const charConfig = {
                    id: charId,
                    name: charUnit.name,
                    personality: charUnit.personality,
                    enabled: charUnit.enabled,
                    llmProvider: charUnit.llmProvider || 'chatgpt',
                    llmModel: charUnit.llmModel || 'gpt-4o-mini',
                    ttsEngine: charUnit.ttsEngine || 'sbv2',
                    voiceModel: charUnit.voiceModel || 'jvnv-F1-jp',
                    voiceSpeakerId: charUnit.voiceSpeakerId || 0,
                    vrm: null
                };
                
                if (manager.loadedVRMs.has(charId)) {
                    const vrmData = manager.loadedVRMs.get(charId);
                    const vrm = vrmData.vrm;
                    
                    charConfig.vrm = {
                        path: vrmData.path || null,
                        fileName: vrmData.fileName || null,
                        isMain: vrmData.isMain || false,
                        position: vrm && vrm.scene ? {
                            x: vrm.scene.position.x,
                            y: vrm.scene.position.y,
                            z: vrm.scene.position.z
                        } : { x: 0, y: 0, z: 0 },
                        rotation: vrm && vrm.scene ? {
                            y: vrm.scene.rotation.y * (180 / Math.PI)
                        } : { y: 180 },
                        scale: vrm && vrm.scene ? vrm.scene.scale.x : 1.0
                    };
                }
                
                config.characters.push(charConfig);
            });
            
            if (manager.dialogueDirector) {
                config.conversationSettings = {
                    topic: manager.dialogueDirector.topic || '',
                    turnMode: manager.dialogueDirector.turnMode || 'round-robin'
                };
            }
            
            config.cameraFollowEnabled = manager.cameraFollowEnabled;
            console.log('📋 設定収集完了:', config.characters.length, 'キャラクター');
            return config;
        }
        
        /**
         * localStorageに保存
         */
        saveToLocalStorage(name = 'default') {
            const config = this.collectCurrentConfig();
            if (!config) return false;
            
            config.name = name;
            
            try {
                let presets = this.getPresetList();
                const existingIndex = presets.findIndex(p => p.name === name);
                if (existingIndex >= 0) {
                    presets[existingIndex] = { name, savedAt: config.savedAt, characterCount: config.characters.length };
                } else {
                    presets.push({ name, savedAt: config.savedAt, characterCount: config.characters.length });
                }
                
                localStorage.setItem(this.presetsStorageKey, JSON.stringify(presets));
                localStorage.setItem(`${this.storageKey}_${name}`, JSON.stringify(config));
                console.log(`💾 設定保存完了: "${name}"`);
                return true;
            } catch (e) {
                console.error('❌ 設定保存エラー:', e);
                return false;
            }
        }
        
        /**
         * JSONファイルとしてダウンロード
         */
        downloadAsJson(filename = null) {
            const config = this.collectCurrentConfig();
            if (!config) return false;
            
            const defaultName = `multichar_config_${new Date().toISOString().slice(0, 10)}.json`;
            const finalFilename = filename || defaultName;
            
            try {
                const json = JSON.stringify(config, null, 2);
                const blob = new Blob([json], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                
                const a = document.createElement('a');
                a.href = url;
                a.download = finalFilename;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
                
                console.log(`📥 JSON保存完了: ${finalFilename}`);
                return true;
            } catch (e) {
                console.error('❌ JSONダウンロードエラー:', e);
                return false;
            }
        }
        
        /**
         * localStorageから読み込み
         */
        loadFromLocalStorage(name = 'default') {
            try {
                const json = localStorage.getItem(`${this.storageKey}_${name}`);
                if (!json) {
                    console.warn(`⚠️ プリセット "${name}" が見つかりません`);
                    return null;
                }
                return JSON.parse(json);
            } catch (e) {
                console.error('❌ 設定読み込みエラー:', e);
                return null;
            }
        }
        
        /**
         * JSONファイルから読み込み
         */
        loadFromJsonFile(file) {
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = (e) => {
                    try {
                        resolve(JSON.parse(e.target.result));
                    } catch (err) {
                        reject(err);
                    }
                };
                reader.onerror = () => reject(reader.error);
                reader.readAsText(file);
            });
        }
        
        /**
         * プリセット一覧を取得
         */
        getPresetList() {
            try {
                const json = localStorage.getItem(this.presetsStorageKey);
                return json ? JSON.parse(json) : [];
            } catch (e) {
                return [];
            }
        }
        
        /**
         * プリセットを削除
         */
        deletePreset(name) {
            try {
                let presets = this.getPresetList();
                presets = presets.filter(p => p.name !== name);
                localStorage.setItem(this.presetsStorageKey, JSON.stringify(presets));
                localStorage.removeItem(`${this.storageKey}_${name}`);
                console.log(`🗑️ プリセット削除: "${name}"`);
                return true;
            } catch (e) {
                return false;
            }
        }
        
        /**
         * 設定を適用
         */
        async applyConfig(config) {
            if (!config || !config.characters) return false;
            if (!window.multiCharManager) return false;
            
            const manager = window.multiCharManager;
            console.log(`🔄 設定適用開始: ${config.characters.length}キャラクター`);
            
            for (const charConfig of config.characters) {
                await this.applyCharacterConfig(manager, charConfig);
            }
            
            if (config.conversationSettings && manager.dialogueDirector) {
                manager.dialogueDirector.topic = config.conversationSettings.topic || '';
                manager.dialogueDirector.turnMode = config.conversationSettings.turnMode || 'round-robin';
            }
            
            if (config.cameraFollowEnabled !== undefined) {
                manager.cameraFollowEnabled = config.cameraFollowEnabled;
            }
            
            if (window.multiCharUI && window.multiCharUI.refreshCharacterList) {
                window.multiCharUI.refreshCharacterList();
            }
            
            console.log('✅ 設定適用完了');
            return true;
        }
        
        async applyCharacterConfig(manager, charConfig) {
            let charUnit = manager.characters.get(charConfig.id);
            
            if (!charUnit) {
                charUnit = manager.createCharacter({
                    id: charConfig.id,
                    name: charConfig.name,
                    personality: charConfig.personality,
                    enabled: charConfig.enabled,
                    llmProvider: charConfig.llmProvider,
                    llmModel: charConfig.llmModel,
                    ttsEngine: charConfig.ttsEngine,
                    voiceModel: charConfig.voiceModel,
                    voiceSpeakerId: charConfig.voiceSpeakerId
                });
            } else {
                charUnit.name = charConfig.name;
                charUnit.personality = charConfig.personality;
                charUnit.enabled = charConfig.enabled;
                charUnit.llmProvider = charConfig.llmProvider || 'chatgpt';
                charUnit.llmModel = charConfig.llmModel || 'gpt-4o-mini';
                charUnit.ttsEngine = charConfig.ttsEngine || 'sbv2';
                charUnit.voiceModel = charConfig.voiceModel || 'jvnv-F1-jp';
                charUnit.voiceSpeakerId = charConfig.voiceSpeakerId || 0;
            }
            
            if (charConfig.vrm) {
                await this.applyVRMConfig(manager, charConfig.id, charConfig.vrm);
            }
            
            console.log(`  ✅ ${charConfig.name} (${charConfig.id}) 設定適用`);
        }
        
        async applyVRMConfig(manager, charId, vrmConfig) {
            if (!vrmConfig.path && !vrmConfig.isMain) return;
            
            try {
                if (vrmConfig.isMain) {
                    manager.useMainVRM(charId);
                } else if (vrmConfig.path && vrmConfig.path !== 'main') {
                    await manager.loadVRMForCharacter(charId, vrmConfig.path);
                }
                
                const vrmData = manager.loadedVRMs.get(charId);
                if (vrmData && vrmData.vrm && vrmData.vrm.scene) {
                    const scene = vrmData.vrm.scene;
                    
                    if (vrmConfig.position) {
                        scene.position.set(
                            vrmConfig.position.x || 0,
                            vrmConfig.position.y || 0,
                            vrmConfig.position.z || 0
                        );
                    }
                    
                    if (vrmConfig.rotation) {
                        scene.rotation.y = (vrmConfig.rotation.y || 180) * (Math.PI / 180);
                    }
                    
                    if (vrmConfig.scale) {
                        scene.scale.set(vrmConfig.scale, vrmConfig.scale, vrmConfig.scale);
                    }
                }
            } catch (e) {
                console.error(`  ❌ ${charId}: VRM設定適用エラー:`, e);
            }
        }
    }

    // UI追加
    function addConfigUIToPanel() {
        const headerElement = document.querySelector('.multi-char-header');
        if (!headerElement) {
            setTimeout(addConfigUIToPanel, 1000);
            return;
        }
        
        if (document.querySelector('.config-buttons')) return;
        
        const configContainer = document.createElement('div');
        configContainer.className = 'config-buttons';
        configContainer.style.cssText = 'display:flex;gap:5px;margin-left:auto;';
        
        const saveBtn = document.createElement('button');
        saveBtn.innerHTML = '💾';
        saveBtn.title = '設定を保存';
        saveBtn.style.cssText = 'padding:4px 8px;background:#4a5568;color:white;border:none;border-radius:4px;cursor:pointer;font-size:14px;';
        saveBtn.onclick = () => {
            const name = prompt('プリセット名:', 'マイ設定');
            if (name && window.multiCharConfigManager.saveToLocalStorage(name)) {
                alert(`✅ "${name}" を保存しました`);
            }
        };
        
        const loadBtn = document.createElement('button');
        loadBtn.innerHTML = '📂';
        loadBtn.title = '設定を読込';
        loadBtn.style.cssText = saveBtn.style.cssText;
        loadBtn.onclick = () => {
            const presets = window.multiCharConfigManager.getPresetList();
            if (presets.length === 0) { alert('保存されたプリセットがありません'); return; }
            const choice = prompt(`読み込む番号:\n${presets.map((p, i) => `${i+1}. ${p.name}`).join('\n')}`);
            if (choice) {
                const idx = parseInt(choice) - 1;
                if (idx >= 0 && idx < presets.length) {
                    const config = window.multiCharConfigManager.loadFromLocalStorage(presets[idx].name);
                    if (config) window.multiCharConfigManager.applyConfig(config);
                }
            }
        };
        
        const exportBtn = document.createElement('button');
        exportBtn.innerHTML = '📥';
        exportBtn.title = 'JSON出力';
        exportBtn.style.cssText = saveBtn.style.cssText;
        exportBtn.onclick = () => window.multiCharConfigManager.downloadAsJson();
        
        const importBtn = document.createElement('button');
        importBtn.innerHTML = '📤';
        importBtn.title = 'JSON読込';
        importBtn.style.cssText = saveBtn.style.cssText;
        importBtn.onclick = () => {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = '.json';
            input.onchange = async (e) => {
                const file = e.target.files[0];
                if (file) {
                    try {
                        const config = await window.multiCharConfigManager.loadFromJsonFile(file);
                        await window.multiCharConfigManager.applyConfig(config);
                        alert('✅ 設定を読み込みました');
                    } catch (err) {
                        alert('❌ 読み込みエラー');
                    }
                }
            };
            input.click();
        };
        
        configContainer.appendChild(saveBtn);
        configContainer.appendChild(loadBtn);
        configContainer.appendChild(exportBtn);
        configContainer.appendChild(importBtn);
        headerElement.appendChild(configContainer);
        
        console.log('✅ 設定保存/読み込みUI追加完了');
    }

    // グローバル公開
    window.MultiCharConfigManager = MultiCharConfigManager;
    window.multiCharConfigManager = new MultiCharConfigManager();
    
    // UI追加
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => setTimeout(addConfigUIToPanel, 2000));
    } else {
        setTimeout(addConfigUIToPanel, 2000);
    }

    console.log('✅ Multi-Character Config Manager v1.0 読み込み完了');
})();
