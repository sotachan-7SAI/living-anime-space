/**
 * ComfyUI HY-Motion Integration v7.0
 * 完全自動版 - 生成後に自動でVRMに適用＆再生
 * 
 * 機能:
 * - 日本語 → 英語翻訳
 * - ComfyUI HY-Motion FBX生成
 * - Unity自動変換（FBX → VRMA）
 * - VRMへの自動適用＆再生
 */

console.log('🎬 comfyui-hy-motion.js v7.0 完全自動版 読み込み開始');

class ComfyUIHYMotion {
    constructor() {
        console.log('🎬 ComfyUIHYMotion コンストラクタ開始');
        this.isGenerating = false;
        this.lastVrmaPath = null;
        this.lastVrmaFilename = null;
        this.isApplying = false;  // 重複適用防止フラグ
        this.lastApplyTime = 0;   // 最後の適用時刻
        
        // モーションスタイル設定
        this.motionStyle = {
            mode: 'kawaii',
            stayFrontFacing: true,
            stayInPlace: true
        };
        
        this.init();
    }
    
    init() {
        console.log('🎬 init() 開始');
        this.waitForPanel();
    }
    
    waitForPanel() {
        console.log('🎬 パネルを探しています...');
        const checkPanel = setInterval(() => {
            const panel = document.getElementById('hy-motion-panel');
            if (panel) {
                console.log('🎬 パネル発見！');
                clearInterval(checkPanel);
                this.addUIToPanel(panel);
            }
        }, 500);
        
        setTimeout(() => {
            clearInterval(checkPanel);
            console.log('🎬 パネル検索タイムアウト');
        }, 10000);
    }
    
    addUIToPanel(panel) {
        console.log('🎬 UIを追加中...');
        const panelContent = panel.querySelector('.panel-content');
        if (!panelContent) return;
        
        const section = document.createElement('div');
        section.id = 'comfyui-hy-motion-section';
        section.innerHTML = `
            <div style="margin-top: 15px; padding: 12px; background: linear-gradient(135deg, rgba(102, 126, 234, 0.2) 0%, rgba(118, 75, 162, 0.2) 100%); border-radius: 10px; border: 1px solid #667eea;">
                <div style="color: #667eea; font-weight: bold; margin-bottom: 10px; font-size: 14px;">
                    🤖 AI モーション生成 
                    <span style="font-size: 10px; color: #00ff88; background: rgba(0,255,136,0.2); padding: 2px 6px; border-radius: 4px;">v7.0 完全自動</span>
                </div>
                
                <!-- スタイル選択 -->
                <div style="margin-bottom: 10px; display: flex; gap: 5px;">
                    <button id="style-kawaii" class="style-btn active" style="flex:1; padding: 6px; font-size: 11px; background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); border: none; border-radius: 6px; color: white; cursor: pointer; font-weight: bold;">🎀 萌えスタイル</button>
                    <button id="style-neutral" class="style-btn" style="flex:1; padding: 6px; font-size: 11px; background: #444; border: none; border-radius: 6px; color: #888; cursor: pointer;">👤 通常</button>
                </div>
                
                <!-- オプション -->
                <div style="margin-bottom: 10px; font-size: 10px; color: #aaa; background: rgba(0,0,0,0.2); padding: 8px; border-radius: 6px;">
                    <label style="display: flex; align-items: center; gap: 6px; margin: 3px 0; cursor: pointer;">
                        <input type="checkbox" id="opt-stay-front" checked style="accent-color: #f093fb; width: 14px; height: 14px;">
                        <span>📷 カメラ目線キープ</span>
                    </label>
                    <label style="display: flex; align-items: center; gap: 6px; margin: 3px 0; cursor: pointer;">
                        <input type="checkbox" id="opt-stay-place" checked style="accent-color: #f093fb; width: 14px; height: 14px;">
                        <span>📍 その場で動く</span>
                    </label>
                    <label style="display: flex; align-items: center; gap: 6px; margin: 3px 0; cursor: pointer;">
                        <input type="checkbox" id="opt-auto-apply" checked style="accent-color: #00ff88; width: 14px; height: 14px;">
                        <span style="color: #00ff88;">✨ 自動でVRMに適用＆再生</span>
                    </label>
                </div>
                
                <!-- テキスト入力 -->
                <textarea id="comfyui-motion-input" placeholder="モーションを日本語で入力...

例: 手を振る、お辞儀、ピース、踊る" style="width: 100%; height: 60px; background: rgba(0,0,0,0.4); border: 1px solid #555; border-radius: 8px; color: white; padding: 10px; font-size: 13px; resize: none;"></textarea>
                
                <div id="comfyui-translated" style="font-size: 10px; color: #888; margin: 6px 0; min-height: 16px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; padding: 0 4px;"></div>
                
                <!-- 生成ボタン -->
                <button id="comfyui-generate-btn" style="width: 100%; padding: 12px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border: none; border-radius: 8px; color: white; font-weight: bold; cursor: pointer; font-size: 13px; margin-bottom: 10px; transition: transform 0.1s;">
                    🎬 モーションを生成
                </button>
                
                <!-- ステータス -->
                <div id="comfyui-status" style="font-size: 11px; color: #888; margin-bottom: 10px; text-align: center; min-height: 20px;"></div>
                
                <!-- プログレスバー -->
                <div id="comfyui-progress-container" style="display: none; margin-bottom: 10px;">
                    <div style="background: #333; border-radius: 4px; height: 6px; overflow: hidden;">
                        <div id="comfyui-progress-bar" style="background: linear-gradient(90deg, #667eea, #f093fb); height: 100%; width: 0%; transition: width 0.3s;"></div>
                    </div>
                    <div id="comfyui-progress-text" style="font-size: 9px; color: #666; text-align: center; margin-top: 4px;"></div>
                </div>
                
                <!-- アクションボタン -->
                <div style="display: flex; gap: 5px;">
                    <button id="comfyui-apply-vrm-btn" disabled style="flex: 2; padding: 10px; background: #444; border: none; border-radius: 6px; color: #888; font-weight: bold; cursor: not-allowed; font-size: 11px;">
                        ▶ VRMに適用
                    </button>
                    <button id="comfyui-download-vrma-btn" disabled style="flex: 1; padding: 10px; background: #444; border: none; border-radius: 6px; color: #888; font-weight: bold; cursor: not-allowed; font-size: 11px;">
                        📥 保存
                    </button>
                </div>
                
                <!-- 接続状態 -->
                <div style="margin-top: 10px; padding: 6px; background: rgba(0,0,0,0.2); border-radius: 6px; font-size: 9px; color: #666;">
                    <div style="display: flex; justify-content: space-between;">
                        <span>ComfyUI:</span>
                        <span id="comfyui-connection-status">⚪ 未確認</span>
                    </div>
                    <div style="display: flex; justify-content: space-between;">
                        <span>Unity:</span>
                        <span id="unity-connection-status">⚪ 未確認</span>
                    </div>
                </div>
            </div>
        `;
        
        panelContent.insertBefore(section, panelContent.firstChild);
        
        // イベントリスナー
        document.getElementById('comfyui-generate-btn').addEventListener('click', () => this.generate());
        document.getElementById('comfyui-motion-input').addEventListener('input', (e) => this.onInputChange(e));
        document.getElementById('comfyui-download-vrma-btn').addEventListener('click', () => this.downloadVRMA());
        document.getElementById('comfyui-apply-vrm-btn').addEventListener('click', () => this.applyToVRM());
        
        // スタイルボタン
        document.getElementById('style-kawaii').addEventListener('click', () => this.setStyle('kawaii'));
        document.getElementById('style-neutral').addEventListener('click', () => this.setStyle('neutral'));
        
        // オプション
        document.getElementById('opt-stay-front').addEventListener('change', (e) => {
            this.motionStyle.stayFrontFacing = e.target.checked;
            this.updatePreview();
        });
        document.getElementById('opt-stay-place').addEventListener('change', (e) => {
            this.motionStyle.stayInPlace = e.target.checked;
            this.updatePreview();
        });
        
        // ホバーエフェクト
        const genBtn = document.getElementById('comfyui-generate-btn');
        genBtn.addEventListener('mouseenter', () => { if (!genBtn.disabled) genBtn.style.transform = 'scale(1.02)'; });
        genBtn.addEventListener('mouseleave', () => genBtn.style.transform = 'scale(1)');
        
        // 接続状態チェック
        this.checkConnections();
        
        // 自動適用を確実にONにする
        setTimeout(() => {
            const autoApplyCheckbox = document.getElementById('opt-auto-apply');
            if (autoApplyCheckbox) {
                autoApplyCheckbox.checked = true;
                console.log('✅ 自動適用チェックボックスをONに設定');
            }
        }, 100);
        
        console.log('✅ ComfyUI HY-Motion UI追加完了 (v7.0 完全自動)');
    }
    
    async checkConnections() {
        try {
            const response = await fetch('/comfyui/system_stats', { method: 'GET' });
            if (response.ok) {
                document.getElementById('comfyui-connection-status').innerHTML = '🟢 接続OK';
            } else {
                document.getElementById('comfyui-connection-status').innerHTML = '🔴 エラー';
            }
        } catch (e) {
            document.getElementById('comfyui-connection-status').innerHTML = '🔴 未接続';
        }
        
        try {
            const response = await fetch('/find-latest-vrma');
            if (response.ok) {
                document.getElementById('unity-connection-status').innerHTML = '🟢 フォルダOK';
            } else {
                document.getElementById('unity-connection-status').innerHTML = '🟡 確認中';
            }
        } catch (e) {
            document.getElementById('unity-connection-status').innerHTML = '🔴 エラー';
        }
    }
    
    setStyle(mode) {
        this.motionStyle.mode = mode;
        
        const kawaiiBtn = document.getElementById('style-kawaii');
        const neutralBtn = document.getElementById('style-neutral');
        
        if (mode === 'kawaii') {
            kawaiiBtn.style.background = 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)';
            kawaiiBtn.style.color = 'white';
            neutralBtn.style.background = '#444';
            neutralBtn.style.color = '#888';
        } else {
            neutralBtn.style.background = 'linear-gradient(135deg, #4ecdc4 0%, #44a08d 100%)';
            neutralBtn.style.color = 'white';
            kawaiiBtn.style.background = '#444';
            kawaiiBtn.style.color = '#888';
        }
        
        this.updatePreview();
    }
    
    updatePreview() {
        const text = document.getElementById('comfyui-motion-input')?.value?.trim();
        if (text) {
            this.onInputChange({ target: { value: text } });
        }
    }
    
    async onInputChange(e) {
        const text = e.target.value.trim();
        const translatedEl = document.getElementById('comfyui-translated');
        
        if (!text) {
            translatedEl.textContent = '';
            return;
        }
        
        try {
            const response = await fetch('/enhance-prompt', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    text: text, 
                    style: this.motionStyle.mode 
                })
            });
            
            if (response.ok) {
                const data = await response.json();
                translatedEl.textContent = `→ ${data.enhanced}`;
                translatedEl.title = data.enhanced;
            } else {
                translatedEl.textContent = `→ ${text}`;
            }
        } catch (e) {
            translatedEl.textContent = `→ ${text}`;
        }
    }
    
    // ======== メイン生成処理 ========
    async generate() {
        const input = document.getElementById('comfyui-motion-input');
        const status = document.getElementById('comfyui-status');
        const btn = document.getElementById('comfyui-generate-btn');
        const applyBtn = document.getElementById('comfyui-apply-vrm-btn');
        const downloadBtn = document.getElementById('comfyui-download-vrma-btn');
        const progressContainer = document.getElementById('comfyui-progress-container');
        const progressBar = document.getElementById('comfyui-progress-bar');
        const progressText = document.getElementById('comfyui-progress-text');
        const autoApply = document.getElementById('opt-auto-apply')?.checked ?? true;
        
        const text = input.value.trim();
        if (!text) {
            status.textContent = '❌ テキストを入力してください';
            return;
        }
        
        if (this.isGenerating) return;
        
        this.isGenerating = true;
        btn.disabled = true;
        btn.textContent = '⏳ 生成中...';
        this.disableButton(applyBtn);
        this.disableButton(downloadBtn);
        progressContainer.style.display = 'block';
        progressBar.style.width = '0%';
        
        try {
            // ステップ1: プロンプト強化
            this.updateProgress(5, '🔄 プロンプト準備中...', status, progressBar, progressText);
            
            let enhancedPrompt = text;
            try {
                const response = await fetch('/enhance-prompt', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ text: text, style: this.motionStyle.mode })
                });
                if (response.ok) {
                    const data = await response.json();
                    enhancedPrompt = data.enhanced;
                }
            } catch (e) {
                console.warn('プロンプト強化失敗、元テキスト使用');
            }
            
            console.log('🎨 Final prompt:', enhancedPrompt);
            
            // ステップ2: ComfyUIにワークフロー送信
            this.updateProgress(10, '🚀 ComfyUIに送信中...', status, progressBar, progressText);
            
            const workflow = this.createFBXWorkflow(enhancedPrompt);
            
            const promptResponse = await fetch('/comfyui/prompt', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt: workflow })
            });
            
            if (!promptResponse.ok) {
                throw new Error('ComfyUI接続失敗');
            }
            
            const promptData = await promptResponse.json();
            const promptId = promptData.prompt_id;
            console.log('🎯 Prompt ID:', promptId);
            
            // ステップ3: FBX生成完了を待機
            this.updateProgress(15, '🎬 モーション生成中...', status, progressBar, progressText);
            
            await this.waitForCompletion(promptId, (progress) => {
                this.updateProgress(15 + progress * 0.35, '🎬 モーション生成中...', status, progressBar, progressText);
            });
            
            // ステップ4: FBX → Unity → VRMA パイプライン
            this.updateProgress(50, '📦 FBXをUnityに送信中...', status, progressBar, progressText);
            
            await this.sleep(2000);
            
            const pipelineResponse = await fetch('/full-pipeline', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ timeout: 120 })
            });
            
            const pipelineData = await pipelineResponse.json();
            
            if (!pipelineData.success) {
                throw new Error(pipelineData.error || 'パイプライン失敗');
            }
            
            this.updateProgress(90, '✨ 変換完了！', status, progressBar, progressText);
            
            this.lastVrmaPath = pipelineData.vrma_path;
            this.lastVrmaFilename = pipelineData.filename;
            
            // ボタンを有効化
            this.enableButton(applyBtn, '#f093fb');
            this.enableButton(downloadBtn, '#a29bfe');
            
            // ★★★ 自動適用＆再生 ★★★
            if (autoApply) {
                this.updateProgress(95, '🎭 VRMに自動適用中...', status, progressBar, progressText);
                await this.applyToVRM();
                this.updateProgress(100, '✅ 完了！自動再生中...', status, progressBar, progressText);
            } else {
                this.updateProgress(100, '✅ 完了！VRMに適用できます', status, progressBar, progressText);
            }
            
        } catch (e) {
            console.error('生成エラー:', e);
            status.textContent = `❌ エラー: ${e.message}`;
            progressBar.style.background = '#ff6b6b';
        } finally {
            this.isGenerating = false;
            btn.disabled = false;
            btn.textContent = '🎬 モーションを生成';
            
            setTimeout(() => {
                progressContainer.style.display = 'none';
                progressBar.style.background = 'linear-gradient(90deg, #667eea, #f093fb)';
            }, 3000);
        }
    }
    
    updateProgress(percent, message, status, bar, text) {
        bar.style.width = `${percent}%`;
        status.textContent = message;
        text.textContent = `${Math.round(percent)}%`;
    }
    
    createFBXWorkflow(prompt) {
        return {
            "1": {
                "inputs": { "model_name": "HY-Motion-1.0" },
                "class_type": "HYMotionLoadNetwork"
            },
            "2": {
                "inputs": {
                    "duration": 5,
                    "seed": Math.floor(Math.random() * 1000000000),
                    "cfg_scale": 5,
                    "num_samples": 1,
                    "network": ["1", 0],
                    "conditioning": ["4", 0]
                },
                "class_type": "HYMotionGenerate"
            },
            "3": {
                "inputs": {
                    "sample_index": 0,
                    "preview": "",
                    "motion_data": ["2", 0]
                },
                "class_type": "HYMotionPreviewAnimation"
            },
            "4": {
                "inputs": {
                    "text": prompt,
                    "llm": ["6", 0]
                },
                "class_type": "HYMotionEncodeText"
            },
            "6": {
                "inputs": {
                    "quantization": "int4",
                    "offload_to_cpu": false
                },
                "class_type": "HYMotionLoadLLM"
            },
            "7": {
                "inputs": {
                    "output_dir": "hymotion_fbx",
                    "filename_prefix": "motion",
                    "motion_data": ["2", 0]
                },
                "class_type": "HYMotionExportFBX"
            }
        };
    }
    
    async waitForCompletion(promptId, onProgress) {
        const maxWait = 120000;
        const startTime = Date.now();
        
        console.log(`⏳ Waiting for prompt: ${promptId}`);
        
        while (Date.now() - startTime < maxWait) {
            try {
                const response = await fetch('/comfyui/history/' + promptId);
                
                if (response.ok) {
                    const data = await response.json();
                    
                    if (data[promptId]) {
                        if (data[promptId].outputs && Object.keys(data[promptId].outputs).length > 0) {
                            console.log(`✅ Generation complete!`);
                            return true;
                        }
                        
                        if (data[promptId].status?.status_str === 'error') {
                            throw new Error('ComfyUI generation error');
                        }
                    }
                }
            } catch (e) {
                if (e.message.includes('ComfyUI generation error')) {
                    throw e;
                }
            }
            
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / 60000, 1);
            onProgress(progress);
            
            await this.sleep(2000);
        }
        
        throw new Error('生成タイムアウト (2分経過)');
    }
    
    // ======== VRMAをVRMに適用＆再生 ========
    async applyToVRM() {
        if (!this.lastVrmaPath) {
            console.error('VRMAデータがありません');
            return;
        }
        
        // 重複適用防止（3秒以内の連続呼び出しをブロック）
        const now = Date.now();
        if (this.isApplying || (now - this.lastApplyTime < 3000)) {
            console.log('⏳ 適用処理中または3秒以内に適用済み、スキップ');
            return;
        }
        
        this.isApplying = true;
        this.lastApplyTime = now;
        
        const status = document.getElementById('comfyui-status');
        status.textContent = '🔄 VRMに適用中...';
        
        try {
            // VRMAファイルを取得
            const response = await fetch(`/get-vrma?path=${encodeURIComponent(this.lastVrmaPath)}`);
            if (!response.ok) {
                throw new Error('VRMAファイル取得失敗');
            }
            
            const vrmaBlob = await response.blob();
            const vrmaUrl = URL.createObjectURL(vrmaBlob);
            
            // 方法1: window.app.loadVRMA() を試す（VRM AI Viewer の内部関数）
            if (window.app && typeof window.app.loadVRMA === 'function') {
                console.log('🎭 window.app.loadVRMA() で適用');
                await window.app.loadVRMA(vrmaUrl);
                this.autoPlay();
                status.textContent = '✅ VRMに適用＆再生中！';
                URL.revokeObjectURL(vrmaUrl);
                return;
            }
            
            // 方法2: hyMotion インテグレーション
            if (window.hyMotion && window.hyMotion.loadVRMAFromBlob) {
                console.log('🎭 window.hyMotion.loadVRMAFromBlob() で適用');
                await window.hyMotion.loadVRMAFromBlob(vrmaBlob);
                this.autoPlay();
                status.textContent = '✅ VRMに適用＆再生中！';
                URL.revokeObjectURL(vrmaUrl);
                return;
            }
            
            // 方法3: グローバル loadVRMAAnimation
            if (typeof window.loadVRMAAnimation === 'function') {
                console.log('🎭 window.loadVRMAAnimation() で適用');
                await window.loadVRMAAnimation(vrmaUrl);
                this.autoPlay();
                status.textContent = '✅ VRMに適用＆再生中！';
                URL.revokeObjectURL(vrmaUrl);
                return;
            }
            
            // 方法4: ドロップイベントをシミュレート
            console.log('🎭 ドロップイベントシミュレート');
            const file = new File([vrmaBlob], this.lastVrmaFilename || 'motion.vrma', { type: 'application/octet-stream' });
            const dataTransfer = new DataTransfer();
            dataTransfer.items.add(file);
            
            const dropZone = document.querySelector('.drop-zone') || document.getElementById('drop-zone') || document.body;
            const dropEvent = new DragEvent('drop', {
                bubbles: true,
                cancelable: true,
                dataTransfer: dataTransfer
            });
            dropZone.dispatchEvent(dropEvent);
            
            // 少し待ってから再生
            await this.sleep(1000);
            this.autoPlay();
            status.textContent = '✅ VRMに適用＆再生中！';
            URL.revokeObjectURL(vrmaUrl);
            
        } catch (e) {
            console.error('適用エラー:', e);
            status.textContent = `❌ 適用エラー: ${e.message}`;
        } finally {
            // 適用処理完了
            this.isApplying = false;
        }
    }
    
    // ======== 自動再生 ========
    autoPlay() {
        try {
            // hy-motion-new.js の autoPlay() が loadVRMAFromBlob() 完了時に
            // 自動的に呼ばれるので、ここでは hyMotion.autoPlay() を直接呼ぶ
            // これにより、確実に強制再生される
            
            if (window.hyMotion && typeof window.hyMotion.autoPlay === 'function') {
                console.log('▶ window.hyMotion.autoPlay() で強制再生');
                window.hyMotion.autoPlay();
                return;
            }
            
            // フォールバック: currentAction を直接操作
            if (window.hyMotion && window.hyMotion.currentAction) {
                console.log('▶ currentAction を直接操作して再生');
                window.hyMotion.isPlaying = false;
                window.hyMotion.currentAction.stop();
                window.hyMotion.currentAction.reset();
                window.hyMotion.currentAction.paused = false;
                window.hyMotion.currentAction.play();
                window.hyMotion.isPlaying = true;
                
                const hyMotionPlayBtn = document.getElementById('hy-motion-play');
                if (hyMotionPlayBtn) {
                    hyMotionPlayBtn.textContent = '⏸ Pause';
                }
                return;
            }
            
            // 最終フォールバック: Playボタンをクリック（ただしisPlayingを確認）
            const hyMotionPlayBtn = document.getElementById('hy-motion-play');
            if (hyMotionPlayBtn && !hyMotionPlayBtn.disabled) {
                // 既に再生中かどうかを確認
                if (window.hyMotion && !window.hyMotion.isPlaying) {
                    console.log('▶ Playボタンをクリック');
                    hyMotionPlayBtn.click();
                } else {
                    console.log('▶ 既に再生中、スキップ');
                }
                return;
            }
            
            console.log('⚠️ 自動再生方法が見つかりません');
        } catch (e) {
            console.warn('自動再生エラー:', e);
        }
    }
    
    async downloadVRMA() {
        if (!this.lastVrmaPath) {
            alert('VRMAデータがありません');
            return;
        }
        
        try {
            const response = await fetch(`/get-vrma?path=${encodeURIComponent(this.lastVrmaPath)}`);
            if (!response.ok) {
                throw new Error('VRMAファイル取得失敗');
            }
            
            const blob = await response.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = this.lastVrmaFilename || 'motion.vrma';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            console.log(`✅ ダウンロード: ${this.lastVrmaFilename}`);
        } catch (e) {
            console.error('ダウンロードエラー:', e);
            alert('ダウンロードに失敗しました');
        }
    }
    
    disableButton(btn) {
        btn.disabled = true;
        btn.style.background = '#444';
        btn.style.color = '#888';
        btn.style.cursor = 'not-allowed';
    }
    
    enableButton(btn, color) {
        btn.disabled = false;
        btn.style.background = `linear-gradient(135deg, ${color} 0%, ${this.darkenColor(color)} 100%)`;
        btn.style.color = 'white';
        btn.style.cursor = 'pointer';
    }
    
    darkenColor(hex) {
        const num = parseInt(hex.replace('#', ''), 16);
        const r = Math.max(0, (num >> 16) - 40);
        const g = Math.max(0, ((num >> 8) & 0x00FF) - 40);
        const b = Math.max(0, (num & 0x0000FF) - 40);
        return `#${(r << 16 | g << 8 | b).toString(16).padStart(6, '0')}`;
    }
    
    sleep(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }
}

console.log('🎬 初期化処理開始');

function initComfyUIHYMotion() {
    console.log('🎬 initComfyUIHYMotion() 呼び出し');
    window.comfyUIHYMotion = new ComfyUIHYMotion();
    console.log('✅ ComfyUI HY-Motion Integration v7.0 loaded (完全自動版)');
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => setTimeout(initComfyUIHYMotion, 1500));
} else {
    setTimeout(initComfyUIHYMotion, 1500);
}
