// ========================================
// API設定パネル v1.0
// 左上にAPI設定UIを表示し、localStorageに保存
// エクスポート/インポート機能付き
// ========================================

(function() {
    'use strict';
    
    console.log('🔑 API設定パネル初期化中...');
    
    // API設定のキー定義
    const API_KEYS = {
        openai: {
            name: 'OpenAI API Key',
            icon: '🤖',
            storageKey: 'openai_api_key',
            placeholder: 'sk-...',
            description: 'ChatGPT、Whisper用'
        },
        grok: {
            name: 'Grok (xAI) API Key',
            icon: '🚀',
            storageKey: 'grok_api_key',
            placeholder: 'xai-...',
            description: '⚡ Grok Voice Agent（高速リアルタイム音声）'
        },
        google: {
            name: 'Google API Key',
            icon: '🔍',
            storageKey: 'gemini_api_key',
            storageKey2: 'banana_api_key', // TTS用にも保存
            placeholder: 'AIzaSy...',
            description: 'Gemini Chat、Google TTS用'
        },
        veo3: {
            name: 'Veo 3 API Key',
            icon: '🎬',
            storageKey: 'veo3_api_key',
            placeholder: 'AIzaSy...',
            description: '🎥 Veo 3 動画生成用 (360°パノラマ動画)'
        },
        panorama: {
            name: '360°画像 API Key',
            icon: '🌐',
            storageKey: 'gemini_imagen_api_key',
            placeholder: 'AIzaSy...',
            description: '🖼️ 360度パノラマ画像生成用 (Imagen 3)'
        },
        tripo: {
            name: 'Tripo3D API Key',
            icon: '🎨',
            storageKey: 'tripo_api_key',
            placeholder: 'tsk_...',
            description: '3Dモデル生成用'
        }
    };
    
    // スタイルを追加
    const style = document.createElement('style');
    style.textContent = `
        #api-settings-toggle {
            position: fixed;
            top: 10px;
            left: 200px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border: none;
            padding: 8px 12px;
            border-radius: 8px;
            cursor: pointer;
            font-size: 12px;
            font-weight: bold;
            z-index: 10001;
            box-shadow: 0 2px 10px rgba(0,0,0,0.3);
            transition: all 0.3s;
        }
        #api-settings-toggle:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 15px rgba(102, 126, 234, 0.5);
        }
        #api-settings-toggle.has-keys {
            background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%);
        }
        
        #api-settings-panel {
            position: fixed;
            top: 50px;
            left: 10px;
            background: rgba(255, 255, 255, 0.98);
            padding: 15px;
            border-radius: 12px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.3);
            z-index: 10000;
            width: 320px;
            max-height: 80vh;
            overflow-y: auto;
            display: none;
            font-family: 'Segoe UI', 'Yu Gothic', sans-serif;
            cursor: default;
        }
        #api-settings-panel.visible {
            display: block;
            animation: slideIn 0.3s ease;
        }
        @keyframes slideIn {
            from { opacity: 0; transform: translateY(-10px); }
            to { opacity: 1; transform: translateY(0); }
        }
        
        #api-settings-panel .panel-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 15px;
            padding: 8px 10px;
            padding-bottom: 10px;
            border-bottom: 2px solid #667eea;
            cursor: grab;
            user-select: none;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            border-radius: 8px 8px 0 0;
            margin: -15px -15px 15px -15px;
        }
        #api-settings-panel .panel-header:active {
            cursor: grabbing;
        }
        #api-settings-panel .panel-header:hover {
            background: linear-gradient(135deg, #5a6fd6 0%, #6a4190 100%);
        }
        #api-settings-panel .panel-title {
            font-size: 14px;
            font-weight: bold;
            color: #fff;
        }
        #api-settings-panel .drag-hint {
            font-size: 10px;
            color: rgba(255,255,255,0.7);
            margin-left: 8px;
        }
        #api-settings-panel .close-btn {
            background: rgba(255,255,255,0.2);
            border: none;
            font-size: 16px;
            cursor: pointer;
            color: #fff;
            padding: 4px 8px;
            border-radius: 4px;
        }
        #api-settings-panel .close-btn:hover {
            background: rgba(255,107,107,0.8);
            color: #fff;
        }
        
        #api-settings-panel .api-group {
            background: #f8f9fa;
            border-radius: 8px;
            padding: 12px;
            margin-bottom: 10px;
        }
        #api-settings-panel .api-label {
            display: flex;
            align-items: center;
            gap: 6px;
            font-size: 12px;
            font-weight: bold;
            color: #333;
            margin-bottom: 4px;
        }
        #api-settings-panel .api-desc {
            font-size: 10px;
            color: #888;
            margin-bottom: 8px;
        }
        #api-settings-panel .api-input-row {
            display: flex;
            gap: 6px;
        }
        #api-settings-panel .api-input {
            flex: 1;
            padding: 8px 10px;
            border: 1px solid #ddd;
            border-radius: 6px;
            font-size: 11px;
            font-family: monospace;
        }
        #api-settings-panel .api-input:focus {
            border-color: #667eea;
            outline: none;
            box-shadow: 0 0 0 2px rgba(102, 126, 234, 0.2);
        }
        #api-settings-panel .api-input.has-value {
            border-color: #11998e;
            background: #f0fff4;
        }
        #api-settings-panel .save-btn {
            padding: 8px 12px;
            background: #667eea;
            color: white;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            font-size: 11px;
            font-weight: bold;
        }
        #api-settings-panel .save-btn:hover {
            background: #5a6fd6;
        }
        
        #api-settings-panel .status-indicator {
            display: inline-block;
            width: 8px;
            height: 8px;
            border-radius: 50%;
            margin-left: 6px;
        }
        #api-settings-panel .status-indicator.set {
            background: #11998e;
        }
        #api-settings-panel .status-indicator.empty {
            background: #ccc;
        }
        
        #api-settings-panel .actions-row {
            display: flex;
            gap: 8px;
            margin-top: 15px;
            padding-top: 15px;
            border-top: 1px solid #eee;
        }
        #api-settings-panel .action-btn {
            flex: 1;
            padding: 10px;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            font-size: 11px;
            font-weight: bold;
            transition: all 0.2s;
        }
        #api-settings-panel .export-btn {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
        }
        #api-settings-panel .import-btn {
            background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%);
            color: white;
        }
        #api-settings-panel .clear-btn {
            background: linear-gradient(135deg, #ff6b6b 0%, #ee5a6f 100%);
            color: white;
        }
        #api-settings-panel .action-btn:hover {
            transform: translateY(-1px);
            box-shadow: 0 2px 8px rgba(0,0,0,0.2);
        }
        
        #api-settings-panel .info-text {
            font-size: 10px;
            color: #888;
            margin-top: 10px;
            padding: 8px;
            background: #f0f0f0;
            border-radius: 6px;
            line-height: 1.5;
        }
    `;
    document.head.appendChild(style);
    
    // トグルボタンを作成
    const toggleBtn = document.createElement('button');
    toggleBtn.id = 'api-settings-toggle';
    toggleBtn.innerHTML = '🔑 API設定';
    document.body.appendChild(toggleBtn);
    
    // パネルを作成
    const panel = document.createElement('div');
    panel.id = 'api-settings-panel';
    panel.innerHTML = `
        <div class="panel-header">
            <div class="panel-title">🔑 API設定 <span class="drag-hint">(☰ ドラッグで移動)</span></div>
            <button class="close-btn" id="api-settings-close">✕</button>
        </div>
        
        ${Object.entries(API_KEYS).map(([key, config]) => `
            <div class="api-group" data-api="${key}">
                <div class="api-label">
                    ${config.icon} ${config.name}
                    <span class="status-indicator" id="status-${key}"></span>
                </div>
                <div class="api-desc">${config.description}</div>
                <div class="api-input-row">
                    <input type="password" class="api-input" id="input-${key}" 
                           placeholder="${config.placeholder}">
                    <button class="save-btn" data-api="${key}">保存</button>
                </div>
            </div>
        `).join('')}
        
        <div class="actions-row">
            <button class="action-btn export-btn" id="api-export">📤 エクスポート</button>
            <button class="action-btn import-btn" id="api-import">📥 インポート</button>
        </div>
        <div class="actions-row">
            <button class="action-btn clear-btn" id="api-clear">🗑️ 全てクリア</button>
        </div>
        
        <div class="info-text">
            💡 APIキーはブラウザのlocalStorageに保存されます。<br>
            📤 エクスポートでバックアップ、📥 インポートで復元できます。
        </div>
        
        <input type="file" id="api-import-file" accept=".json" style="display:none">
    `;
    document.body.appendChild(panel);
    
    // 現在の値を読み込んで表示
    function loadCurrentValues() {
        let hasAnyKey = false;
        
        Object.entries(API_KEYS).forEach(([key, config]) => {
            const value = localStorage.getItem(config.storageKey) || '';
            const input = document.getElementById(`input-${key}`);
            const status = document.getElementById(`status-${key}`);
            
            if (value && value.length > 5) {
                input.value = value;
                input.classList.add('has-value');
                status.classList.add('set');
                status.classList.remove('empty');
                hasAnyKey = true;
            } else {
                input.classList.remove('has-value');
                status.classList.remove('set');
                status.classList.add('empty');
            }
        });
        
        // トグルボタンの色を更新
        if (hasAnyKey) {
            toggleBtn.classList.add('has-keys');
        } else {
            toggleBtn.classList.remove('has-keys');
        }
    }
    
    // APIキーを保存
    function saveApiKey(apiKey) {
        const config = API_KEYS[apiKey];
        const input = document.getElementById(`input-${apiKey}`);
        const value = input.value.trim();
        
        if (value) {
            localStorage.setItem(config.storageKey, value);
            if (config.storageKey2) {
                localStorage.setItem(config.storageKey2, value);
            }
            console.log(`✅ ${config.name} を保存しました`);
            
            // window.API_CONFIG も更新
            if (window.API_CONFIG) {
                if (apiKey === 'openai') window.API_CONFIG.OPENAI_API_KEY = value;
                if (apiKey === 'google') window.API_CONFIG.GOOGLE_API_KEY = value;
                if (apiKey === 'tripo') window.API_CONFIG.TRIPO_API_KEY = value;
            }
        } else {
            localStorage.removeItem(config.storageKey);
            if (config.storageKey2) {
                localStorage.removeItem(config.storageKey2);
            }
            console.log(`🗑️ ${config.name} を削除しました`);
        }
        
        loadCurrentValues();
    }
    
    // エクスポート
    function exportSettings() {
        const settings = {};
        Object.entries(API_KEYS).forEach(([key, config]) => {
            const value = localStorage.getItem(config.storageKey);
            if (value) {
                settings[key] = value;
            }
        });
        
        const blob = new Blob([JSON.stringify(settings, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'vrm-ai-viewer-api-settings.json';
        a.click();
        URL.revokeObjectURL(url);
        
        console.log('📤 API設定をエクスポートしました');
        alert('✅ API設定をエクスポートしました！');
    }
    
    // インポート
    function importSettings(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const settings = JSON.parse(e.target.result);
                
                Object.entries(settings).forEach(([key, value]) => {
                    if (API_KEYS[key]) {
                        const config = API_KEYS[key];
                        localStorage.setItem(config.storageKey, value);
                        if (config.storageKey2) {
                            localStorage.setItem(config.storageKey2, value);
                        }
                    }
                });
                
                loadCurrentValues();
                console.log('📥 API設定をインポートしました');
                alert('✅ API設定をインポートしました！\nページをリロードすると完全に反映されます。');
            } catch (err) {
                console.error('インポートエラー:', err);
                alert('❌ インポートに失敗しました。正しいJSONファイルを選択してください。');
            }
        };
        reader.readAsText(file);
    }
    
    // 全てクリア
    function clearAllSettings() {
        if (!confirm('⚠️ 全てのAPIキーを削除しますか？')) return;
        
        Object.values(API_KEYS).forEach(config => {
            localStorage.removeItem(config.storageKey);
            if (config.storageKey2) {
                localStorage.removeItem(config.storageKey2);
            }
        });
        
        // 入力欄もクリア
        Object.keys(API_KEYS).forEach(key => {
            const input = document.getElementById(`input-${key}`);
            if (input) input.value = '';
        });
        
        loadCurrentValues();
        console.log('🗑️ 全てのAPI設定をクリアしました');
        alert('✅ 全てのAPI設定をクリアしました');
    }
    
    // ドラッグ機能（改善版）
    let isDragging = false;
    let dragStartX = 0;
    let dragStartY = 0;
    let panelStartX = 0;
    let panelStartY = 0;
    
    const panelHeader = panel.querySelector('.panel-header');
    
    panelHeader.addEventListener('mousedown', (e) => {
        // 閉じるボタンはドラッグ対象外
        if (e.target.classList.contains('close-btn')) return;
        
        isDragging = true;
        dragStartX = e.clientX;
        dragStartY = e.clientY;
        
        const rect = panel.getBoundingClientRect();
        panelStartX = rect.left;
        panelStartY = rect.top;
        
        // パネルの位置を固定化（初回ドラッグ時）
        panel.style.left = panelStartX + 'px';
        panel.style.top = panelStartY + 'px';
        panel.style.right = 'auto';
        panel.style.bottom = 'auto';
        
        // テキスト選択を防ぐ
        e.preventDefault();
        
        // カーソル変更
        panelHeader.style.cursor = 'grabbing';
    });
    
    document.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        
        const deltaX = e.clientX - dragStartX;
        const deltaY = e.clientY - dragStartY;
        
        let newX = panelStartX + deltaX;
        let newY = panelStartY + deltaY;
        
        // 画面外に出ないように制限
        const maxX = window.innerWidth - panel.offsetWidth;
        const maxY = window.innerHeight - panel.offsetHeight;
        newX = Math.max(0, Math.min(newX, maxX));
        newY = Math.max(0, Math.min(newY, maxY));
        
        panel.style.left = newX + 'px';
        panel.style.top = newY + 'px';
    });
    
    document.addEventListener('mouseup', () => {
        if (isDragging) {
            isDragging = false;
            panelHeader.style.cursor = 'grab';
        }
    });
    
    // イベントリスナー設定
    toggleBtn.addEventListener('click', () => {
        panel.classList.toggle('visible');
    });
    
    document.getElementById('api-settings-close').addEventListener('click', () => {
        panel.classList.remove('visible');
    });
    
    // 各保存ボタン
    document.querySelectorAll('.save-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            saveApiKey(btn.dataset.api);
        });
    });
    
    // Enterキーで保存
    document.querySelectorAll('.api-input').forEach(input => {
        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                const apiKey = input.id.replace('input-', '');
                saveApiKey(apiKey);
            }
        });
    });
    
    document.getElementById('api-export').addEventListener('click', exportSettings);
    
    document.getElementById('api-import').addEventListener('click', () => {
        document.getElementById('api-import-file').click();
    });
    
    document.getElementById('api-import-file').addEventListener('change', (e) => {
        if (e.target.files[0]) {
            importSettings(e.target.files[0]);
            e.target.value = ''; // リセット
        }
    });
    
    document.getElementById('api-clear').addEventListener('click', clearAllSettings);
    
    // パネル外クリックで閉じる
    document.addEventListener('click', (e) => {
        if (!panel.contains(e.target) && e.target !== toggleBtn) {
            panel.classList.remove('visible');
        }
    });
    
    // 初期読み込み
    loadCurrentValues();
    
    console.log('✅ API設定パネル初期化完了');
    
    // グローバルに公開
    window.APISettingsPanel = {
        show: () => panel.classList.add('visible'),
        hide: () => panel.classList.remove('visible'),
        toggle: () => panel.classList.toggle('visible'),
        export: exportSettings,
        reload: loadCurrentValues
    };
})();
