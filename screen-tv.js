// ========================================
// 🖥️ Screen TV - 3D空間内TV画面システム v1.0
// Screen Capture APIで外部ウィンドウを
// Three.js PlaneGeometryにVideoTextureとして投影
// ========================================

(function() {
    'use strict';
    console.log('🖥️ Screen TV System v1.0 初期化中...');

    // ========================================
    // 設定
    // ========================================
    const DEFAULT_CONFIG = {
        width: 1.92,        // 16:9比率 (1.92 x 1.08)
        height: 1.08,
        posX: 0,
        posY: 1.8,
        posZ: -2.5,
        rotY: 0,
        opacity: 1.0,
        frameColor: 0x222222,
        frameWidth: 0.03,
        emissiveIntensity: 0.3,  // 自発光（暗い場所でも見える）
        showFrame: true,
    };

    // ========================================
    // メインクラス
    // ========================================
    class ScreenTV {
        constructor() {
            this.config = { ...DEFAULT_CONFIG };
            this.tvGroup = null;       // THREE.Group (フレーム+スクリーン)
            this.screenMesh = null;    // スクリーンPlane
            this.frameMesh = null;     // フレームPlane (背面)
            this.videoElement = null;  // <video> for MediaStream
            this.videoTexture = null;  // THREE.VideoTexture
            this.mediaStream = null;   // MediaStream from getDisplayMedia
            this.isCapturing = false;
            this.scene = null;
            this.animFrameId = null;
            this._panelElement = null;
            
            // ストレージキー
            this._storageKey = 'screenTV_config';
            this._loadConfig();
            
            // 初期化待ち
            this._waitForScene();
        }

        // ========================================
        // シーン待機・初期化
        // ========================================
        _waitForScene() {
            const check = () => {
                const app = window.app || window.vrm_app;
                if (app && app.scene) {
                    this.scene = app.scene;
                    this._createPanel();
                    console.log('🖥️ Screen TV: シーン取得完了');
                } else {
                    setTimeout(check, 500);
                }
            };
            check();
        }

        // ========================================
        // 設定の保存・読み込み
        // ========================================
        _saveConfig() {
            try {
                localStorage.setItem(this._storageKey, JSON.stringify(this.config));
            } catch(e) {}
        }

        _loadConfig() {
            try {
                const saved = localStorage.getItem(this._storageKey);
                if (saved) {
                    Object.assign(this.config, JSON.parse(saved));
                }
            } catch(e) {}
        }

        // ========================================
        // TV作成（3Dオブジェクト）
        // ========================================
        _createTV() {
            if (this.tvGroup) {
                this.scene.remove(this.tvGroup);
            }

            this.tvGroup = new THREE.Group();
            this.tvGroup.name = 'ScreenTV';

            // スクリーン（映像が映るPlane）
            const screenGeo = new THREE.PlaneGeometry(this.config.width, this.config.height);
            const screenMat = new THREE.MeshBasicMaterial({
                color: 0x000000,
                side: THREE.FrontSide,
                transparent: true,
                opacity: this.config.opacity,
            });
            this.screenMesh = new THREE.Mesh(screenGeo, screenMat);
            this.screenMesh.name = 'ScreenTV_Screen';
            this.tvGroup.add(this.screenMesh);

            // フレーム（少し大きい背面板）
            if (this.config.showFrame) {
                const fw = this.config.frameWidth;
                const frameGeo = new THREE.PlaneGeometry(
                    this.config.width + fw * 2,
                    this.config.height + fw * 2
                );
                const frameMat = new THREE.MeshStandardMaterial({
                    color: this.config.frameColor,
                    roughness: 0.3,
                    metalness: 0.8,
                });
                this.frameMesh = new THREE.Mesh(frameGeo, frameMat);
                this.frameMesh.position.z = -0.005; // スクリーンの少し後ろ
                this.frameMesh.name = 'ScreenTV_Frame';
                this.tvGroup.add(this.frameMesh);
            }

            // 位置・回転
            this.tvGroup.position.set(this.config.posX, this.config.posY, this.config.posZ);
            this.tvGroup.rotation.y = this.config.rotY * Math.PI / 180;

            this.scene.add(this.tvGroup);
            console.log('🖥️ TV作成完了:', this.config);
        }

        // ========================================
        // Screen Capture 開始
        // ========================================
        async startCapture() {
            try {
                // 画面共有ダイアログ
                this.mediaStream = await navigator.mediaDevices.getDisplayMedia({
                    video: {
                        cursor: 'always',
                        displaySurface: 'window',  // ウィンドウ優先
                    },
                    audio: false,
                });

                // video要素を作成
                if (!this.videoElement) {
                    this.videoElement = document.createElement('video');
                    this.videoElement.style.display = 'none';
                    this.videoElement.autoplay = true;
                    this.videoElement.playsInline = true;
                    this.videoElement.muted = true;
                    document.body.appendChild(this.videoElement);
                }

                this.videoElement.srcObject = this.mediaStream;
                await this.videoElement.play();

                // TV作成（まだなければ）
                if (!this.tvGroup) {
                    this._createTV();
                }

                // VideoTexture作成
                this.videoTexture = new THREE.VideoTexture(this.videoElement);
                this.videoTexture.minFilter = THREE.LinearFilter;
                this.videoTexture.magFilter = THREE.LinearFilter;
                this.videoTexture.colorSpace = THREE.SRGBColorSpace;

                // スクリーンにテクスチャ適用
                this.screenMesh.material.dispose();
                this.screenMesh.material = new THREE.MeshBasicMaterial({
                    map: this.videoTexture,
                    side: THREE.FrontSide,
                    transparent: true,
                    opacity: this.config.opacity,
                    toneMapped: false,  // 色が変わらないように
                });

                this.isCapturing = true;

                // ストリーム終了検知（ユーザーが共有停止した時）
                this.mediaStream.getVideoTracks()[0].addEventListener('ended', () => {
                    console.log('🖥️ 画面共有が停止されました');
                    this.stopCapture();
                });

                this._updateButtonState();
                console.log('🖥️ Screen Capture開始！');

            } catch (err) {
                if (err.name === 'NotAllowedError') {
                    console.log('🖥️ 画面共有がキャンセルされました');
                } else {
                    console.error('🖥️ Screen Captureエラー:', err);
                }
            }
        }

        // ========================================
        // Screen Capture 停止
        // ========================================
        stopCapture() {
            if (this.mediaStream) {
                this.mediaStream.getTracks().forEach(t => t.stop());
                this.mediaStream = null;
            }

            if (this.videoElement) {
                this.videoElement.srcObject = null;
            }

            // スクリーンを黒に戻す
            if (this.screenMesh) {
                this.screenMesh.material.dispose();
                this.screenMesh.material = new THREE.MeshBasicMaterial({
                    color: 0x111111,
                    side: THREE.FrontSide,
                    transparent: true,
                    opacity: this.config.opacity,
                });
            }

            if (this.videoTexture) {
                this.videoTexture.dispose();
                this.videoTexture = null;
            }

            this.isCapturing = false;
            this._updateButtonState();
            console.log('🖥️ Screen Capture停止');
        }

        // ========================================
        // TV表示/非表示
        // ========================================
        showTV() {
            if (!this.tvGroup) {
                this._createTV();
            }
            this.tvGroup.visible = true;
        }

        hideTV() {
            if (this.tvGroup) {
                this.tvGroup.visible = false;
            }
            this.stopCapture();
        }

        removeTV() {
            this.stopCapture();
            if (this.tvGroup && this.scene) {
                this.scene.remove(this.tvGroup);
                this.tvGroup = null;
                this.screenMesh = null;
                this.frameMesh = null;
            }
        }

        // ========================================
        // 位置・サイズ更新
        // ========================================
        updateTransform() {
            if (!this.tvGroup) return;
            this.tvGroup.position.set(this.config.posX, this.config.posY, this.config.posZ);
            this.tvGroup.rotation.y = this.config.rotY * Math.PI / 180;
            this._saveConfig();
        }

        updateSize() {
            if (!this.tvGroup || !this.screenMesh) return;
            
            // スクリーン再作成
            this.screenMesh.geometry.dispose();
            this.screenMesh.geometry = new THREE.PlaneGeometry(this.config.width, this.config.height);

            // フレーム再作成
            if (this.frameMesh) {
                const fw = this.config.frameWidth;
                this.frameMesh.geometry.dispose();
                this.frameMesh.geometry = new THREE.PlaneGeometry(
                    this.config.width + fw * 2,
                    this.config.height + fw * 2
                );
            }
            this._saveConfig();
        }

        // ========================================
        // UI パネル
        // ========================================
        _createPanel() {
            // パネルコンテナ
            const panel = document.createElement('div');
            panel.id = 'screen-tv-panel';
            panel.innerHTML = `
                <style>
                    #screen-tv-panel {
                        position: fixed;
                        top: 50%;
                        left: 50%;
                        transform: translate(-50%, -50%);
                        background: rgba(20, 20, 35, 0.95);
                        border: 1px solid rgba(100, 200, 255, 0.3);
                        border-radius: 12px;
                        padding: 12px;
                        color: #fff;
                        font-size: 12px;
                        z-index: 100000;
                        min-width: 260px;
                        backdrop-filter: blur(10px);
                        display: none;
                        font-family: 'Segoe UI', sans-serif;
                        max-height: 80vh;
                        overflow-y: auto;
                    }
                    #screen-tv-panel.visible { display: block; }
                    #screen-tv-panel .stv-title {
                        font-size: 14px;
                        font-weight: bold;
                        margin-bottom: 8px;
                        color: #64c8ff;
                        display: flex;
                        align-items: center;
                        justify-content: space-between;
                    }
                    #screen-tv-panel .stv-close {
                        cursor: pointer;
                        font-size: 16px;
                        opacity: 0.7;
                    }
                    #screen-tv-panel .stv-close:hover { opacity: 1; }
                    #screen-tv-panel .stv-row {
                        display: flex;
                        align-items: center;
                        margin: 4px 0;
                        gap: 6px;
                    }
                    #screen-tv-panel .stv-row label {
                        min-width: 55px;
                        color: #aaa;
                    }
                    #screen-tv-panel input[type="range"] {
                        flex: 1;
                        height: 4px;
                        accent-color: #64c8ff;
                    }
                    #screen-tv-panel .stv-val {
                        min-width: 40px;
                        text-align: right;
                        color: #64c8ff;
                    }
                    #screen-tv-panel .stv-btn {
                        padding: 6px 12px;
                        border: none;
                        border-radius: 6px;
                        cursor: pointer;
                        font-size: 12px;
                        font-weight: bold;
                        transition: all 0.2s;
                    }
                    #screen-tv-panel .stv-btn-primary {
                        background: linear-gradient(135deg, #00b4d8, #0077b6);
                        color: #fff;
                    }
                    #screen-tv-panel .stv-btn-primary:hover {
                        background: linear-gradient(135deg, #48cae4, #0096c7);
                    }
                    #screen-tv-panel .stv-btn-danger {
                        background: linear-gradient(135deg, #e63946, #d00000);
                        color: #fff;
                    }
                    #screen-tv-panel .stv-btn-danger:hover {
                        background: linear-gradient(135deg, #ff6b6b, #e63946);
                    }
                    #screen-tv-panel .stv-btn-row {
                        display: flex;
                        gap: 6px;
                        margin-top: 8px;
                    }
                    #screen-tv-panel .stv-btn-secondary {
                        background: rgba(255,255,255,0.1);
                        color: #ccc;
                        border: 1px solid rgba(255,255,255,0.2);
                    }
                    #screen-tv-panel .stv-btn-secondary:hover {
                        background: rgba(255,255,255,0.2);
                    }
                    #screen-tv-toggle-btn {
                        position: fixed;
                        bottom: 50px;
                        right: 140px;
                        background: linear-gradient(135deg, #0077b6, #00b4d8);
                        color: #fff;
                        border: none;
                        border-radius: 10px;
                        padding: 8px 14px;
                        font-size: 13px;
                        font-weight: bold;
                        cursor: pointer;
                        z-index: 10001;
                        box-shadow: 0 2px 10px rgba(0,180,216,0.3);
                        transition: all 0.2s;
                    }
                    #screen-tv-toggle-btn:hover {
                        transform: scale(1.05);
                        box-shadow: 0 4px 15px rgba(0,180,216,0.5);
                    }
                </style>
                <div class="stv-title">
                    <span>🖥️ Screen TV</span>
                    <span class="stv-close" id="stv-close">✕</span>
                </div>
                
                <!-- キャプチャボタン -->
                <div class="stv-btn-row">
                    <button class="stv-btn stv-btn-primary" id="stv-capture-btn" style="flex:1">
                        📺 画面共有開始
                    </button>
                </div>

                <!-- サイズ -->
                <div style="margin-top:10px; color:#888; font-size:11px;">📐 サイズ</div>
                <div class="stv-row">
                    <label>幅</label>
                    <input type="range" id="stv-width" min="0.5" max="6" step="0.1" value="${this.config.width}">
                    <span class="stv-val" id="stv-width-val">${this.config.width}</span>
                </div>
                <div class="stv-row">
                    <label>高さ</label>
                    <input type="range" id="stv-height" min="0.3" max="4" step="0.1" value="${this.config.height}">
                    <span class="stv-val" id="stv-height-val">${this.config.height}</span>
                </div>
                <div class="stv-row">
                    <button class="stv-btn stv-btn-secondary" id="stv-ratio-lock" style="font-size:11px;">
                        🔒 16:9固定
                    </button>
                    <button class="stv-btn stv-btn-secondary" id="stv-size-s" style="font-size:11px;">S</button>
                    <button class="stv-btn stv-btn-secondary" id="stv-size-m" style="font-size:11px;">M</button>
                    <button class="stv-btn stv-btn-secondary" id="stv-size-l" style="font-size:11px;">L</button>
                </div>

                <!-- 位置 -->
                <div style="margin-top:8px; color:#888; font-size:11px;">📍 位置</div>
                <div class="stv-row">
                    <label>X (横)</label>
                    <input type="range" id="stv-posX" min="-5" max="5" step="0.1" value="${this.config.posX}">
                    <span class="stv-val" id="stv-posX-val">${this.config.posX}</span>
                </div>
                <div class="stv-row">
                    <label>Y (高さ)</label>
                    <input type="range" id="stv-posY" min="0" max="5" step="0.1" value="${this.config.posY}">
                    <span class="stv-val" id="stv-posY-val">${this.config.posY}</span>
                </div>
                <div class="stv-row">
                    <label>Z (奥行)</label>
                    <input type="range" id="stv-posZ" min="-10" max="2" step="0.1" value="${this.config.posZ}">
                    <span class="stv-val" id="stv-posZ-val">${this.config.posZ}</span>
                </div>
                <div class="stv-row">
                    <label>回転</label>
                    <input type="range" id="stv-rotY" min="-180" max="180" step="1" value="${this.config.rotY}">
                    <span class="stv-val" id="stv-rotY-val">${this.config.rotY}°</span>
                </div>

                <!-- 透明度 -->
                <div class="stv-row">
                    <label>透明度</label>
                    <input type="range" id="stv-opacity" min="0.1" max="1" step="0.05" value="${this.config.opacity}">
                    <span class="stv-val" id="stv-opacity-val">${this.config.opacity}</span>
                </div>

                <!-- 操作ボタン -->
                <div class="stv-btn-row">
                    <button class="stv-btn stv-btn-secondary" id="stv-reset-pos" style="flex:1; font-size:11px;">
                        🔄 位置リセット
                    </button>
                    <button class="stv-btn stv-btn-danger" id="stv-remove" style="flex:1; font-size:11px;">
                        🗑️ TV削除
                    </button>
                </div>
            `;
            document.body.appendChild(panel);
            this._panelElement = panel;

            // トグルボタン
            const toggleBtn = document.createElement('button');
            toggleBtn.id = 'screen-tv-toggle-btn';
            toggleBtn.textContent = '🖥️ TV';
            document.body.appendChild(toggleBtn);

            // イベント設定
            this._setupPanelEvents(panel, toggleBtn);
        }

        _setupPanelEvents(panel, toggleBtn) {
            // パネル開閉
            toggleBtn.addEventListener('click', () => {
                panel.classList.toggle('visible');
                if (panel.classList.contains('visible')) {
                    toggleBtn.style.display = 'none';
                }
            });

            panel.querySelector('#stv-close').addEventListener('click', () => {
                panel.classList.remove('visible');
                toggleBtn.style.display = 'block';
            });

            // キャプチャボタン
            panel.querySelector('#stv-capture-btn').addEventListener('click', () => {
                if (this.isCapturing) {
                    this.stopCapture();
                } else {
                    this.startCapture();
                }
            });

            // サイズスライダー
            const widthSlider = panel.querySelector('#stv-width');
            const heightSlider = panel.querySelector('#stv-height');
            let ratioLocked = true;

            widthSlider.addEventListener('input', () => {
                this.config.width = parseFloat(widthSlider.value);
                panel.querySelector('#stv-width-val').textContent = this.config.width.toFixed(1);
                if (ratioLocked) {
                    this.config.height = parseFloat((this.config.width * 9 / 16).toFixed(2));
                    heightSlider.value = this.config.height;
                    panel.querySelector('#stv-height-val').textContent = this.config.height.toFixed(1);
                }
                this.updateSize();
            });

            heightSlider.addEventListener('input', () => {
                this.config.height = parseFloat(heightSlider.value);
                panel.querySelector('#stv-height-val').textContent = this.config.height.toFixed(1);
                if (ratioLocked) {
                    this.config.width = parseFloat((this.config.height * 16 / 9).toFixed(2));
                    widthSlider.value = this.config.width;
                    panel.querySelector('#stv-width-val').textContent = this.config.width.toFixed(1);
                }
                this.updateSize();
            });

            // 比率ロック
            panel.querySelector('#stv-ratio-lock').addEventListener('click', (e) => {
                ratioLocked = !ratioLocked;
                e.target.textContent = ratioLocked ? '🔒 16:9固定' : '🔓 自由比率';
            });

            // サイズプリセット
            const setSizePreset = (w) => {
                this.config.width = w;
                this.config.height = parseFloat((w * 9 / 16).toFixed(2));
                widthSlider.value = this.config.width;
                heightSlider.value = this.config.height;
                panel.querySelector('#stv-width-val').textContent = this.config.width.toFixed(1);
                panel.querySelector('#stv-height-val').textContent = this.config.height.toFixed(1);
                this.updateSize();
            };
            panel.querySelector('#stv-size-s').addEventListener('click', () => setSizePreset(1.0));
            panel.querySelector('#stv-size-m').addEventListener('click', () => setSizePreset(1.92));
            panel.querySelector('#stv-size-l').addEventListener('click', () => setSizePreset(3.5));

            // 位置スライダー
            const posSliders = ['posX', 'posY', 'posZ', 'rotY'];
            posSliders.forEach(key => {
                const slider = panel.querySelector(`#stv-${key}`);
                slider.addEventListener('input', () => {
                    this.config[key] = parseFloat(slider.value);
                    const suffix = key === 'rotY' ? '°' : '';
                    panel.querySelector(`#stv-${key}-val`).textContent = 
                        (key === 'rotY' ? this.config[key] : this.config[key].toFixed(1)) + suffix;
                    this.updateTransform();
                });
            });

            // 透明度
            panel.querySelector('#stv-opacity').addEventListener('input', (e) => {
                this.config.opacity = parseFloat(e.target.value);
                panel.querySelector('#stv-opacity-val').textContent = this.config.opacity.toFixed(2);
                if (this.screenMesh) {
                    this.screenMesh.material.opacity = this.config.opacity;
                }
                this._saveConfig();
            });

            // 位置リセット
            panel.querySelector('#stv-reset-pos').addEventListener('click', () => {
                Object.assign(this.config, {
                    posX: DEFAULT_CONFIG.posX,
                    posY: DEFAULT_CONFIG.posY,
                    posZ: DEFAULT_CONFIG.posZ,
                    rotY: DEFAULT_CONFIG.rotY,
                    width: DEFAULT_CONFIG.width,
                    height: DEFAULT_CONFIG.height,
                    opacity: DEFAULT_CONFIG.opacity,
                });
                // スライダー更新
                ['posX', 'posY', 'posZ', 'rotY'].forEach(key => {
                    panel.querySelector(`#stv-${key}`).value = this.config[key];
                    const suffix = key === 'rotY' ? '°' : '';
                    panel.querySelector(`#stv-${key}-val`).textContent = 
                        (key === 'rotY' ? this.config[key] : this.config[key].toFixed(1)) + suffix;
                });
                widthSlider.value = this.config.width;
                heightSlider.value = this.config.height;
                panel.querySelector('#stv-width-val').textContent = this.config.width.toFixed(1);
                panel.querySelector('#stv-height-val').textContent = this.config.height.toFixed(1);
                panel.querySelector('#stv-opacity').value = this.config.opacity;
                panel.querySelector('#stv-opacity-val').textContent = this.config.opacity.toFixed(2);
                
                this.updateSize();
                this.updateTransform();
            });

            // TV削除
            panel.querySelector('#stv-remove').addEventListener('click', () => {
                this.removeTV();
                panel.classList.remove('visible');
                toggleBtn.style.display = 'block';
            });
        }

        _updateButtonState() {
            const btn = document.querySelector('#stv-capture-btn');
            if (!btn) return;
            if (this.isCapturing) {
                btn.textContent = '⏹️ 画面共有停止';
                btn.classList.remove('stv-btn-primary');
                btn.classList.add('stv-btn-danger');
            } else {
                btn.textContent = '📺 画面共有開始';
                btn.classList.remove('stv-btn-danger');
                btn.classList.add('stv-btn-primary');
            }
        }
    }

    // ========================================
    // グローバル登録・起動
    // ========================================
    window.screenTV = new ScreenTV();
    console.log('🖥️ Screen TV System v1.0 準備完了 (window.screenTV)');

})();
