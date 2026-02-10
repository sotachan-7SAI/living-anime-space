/**
 * 3D Environment Manager
 * .ply (Gaussian Splats) / .glb/.gltf/.fbx (3Dモデル) 背景をVRMビューワーに統合
 */

console.log('🌃 3D Environment Manager を読み込み中...');

/**
 * 環境マネージャークラス
 */
class EnvironmentManager {
    constructor(scene, renderer, camera) {
        this.scene = scene;
        this.renderer = renderer;
        this.camera = camera;
        this.splatMesh = null;
        this.envModel = null;  // GLB/GLTFモデル用
        this.pointMaterial = null;
        this.isLoading = false;
        this.envType = null;  // 'splat' or 'mesh'
        
        // TransformControls（移動ハンドル）
        this.transformControls = null;
        this.isTransformMode = false;
    }
    
    /**
     * TransformControlsを初期化
     */
    initTransformControls() {
        const THREE = window.THREE;
        const TransformControls = window.TransformControlsClass;
        
        if (!TransformControls) {
            console.warn('⚠️ TransformControlsが見つかりません');
            return;
        }
        
        if (this.transformControls) {
            // 既存のものがあれば削除
            this.scene.remove(this.transformControls);
            this.transformControls.dispose();
        }
        
        this.transformControls = new TransformControls(this.camera, this.renderer.domElement);
        this.transformControls.setMode('translate'); // 移動モード
        this.transformControls.setSize(1.2); // ハンドルサイズ
        
        // ドラッグ中はOrbitControlsを無効化
        this.transformControls.addEventListener('dragging-changed', (event) => {
            if (window.app && window.app.controls) {
                window.app.controls.enabled = !event.value;
            }
        });
        
        // 値が変更されたらUIを同期
        this.transformControls.addEventListener('change', () => {
            this.syncUIFromModel();
        });
        
        this.scene.add(this.transformControls);
        console.log('✅ TransformControls 初期化完了');
    }
    
    /**
     * 移動モードをトグル
     */
    toggleTransformMode() {
        const target = this.envModel || this.splatMesh;
        if (!target) {
            alert('先に3Dモデルを読み込んでください');
            return false;
        }
        
        if (!this.transformControls) {
            this.initTransformControls();
        }
        
        this.isTransformMode = !this.isTransformMode;
        
        if (this.isTransformMode) {
            this.transformControls.attach(target);
            console.log('📍 移動モード ON');
        } else {
            this.transformControls.detach();
            console.log('📍 移動モード OFF');
            
            // コライダーを更新
            if (this.envType === 'mesh' && this.envModel && window.createEnvironmentColliders) {
                window.createEnvironmentColliders(this.envModel);
            }
        }
        
        return this.isTransformMode;
    }
    
    /**
     * モデルの位置からUIを同期
     */
    syncUIFromModel() {
        const target = this.envModel || this.splatMesh;
        if (!target) return;
        
        // 高さの同期
        const heightInput = document.getElementById('env-height-input');
        const heightSlider = document.getElementById('env-height');
        if (heightInput && heightSlider) {
            const y = target.position.y;
            heightInput.value = y.toFixed(2);
            heightSlider.value = Math.min(Math.max(y, -10), 10);
        }
        
        // 位置表示を更新
        this.updatePositionDisplay();
    }
    
    /**
     * 位置表示を更新
     */
    updatePositionDisplay() {
        const target = this.envModel || this.splatMesh;
        if (!target) return;
        
        const posDisplay = document.getElementById('env-position-display');
        if (posDisplay) {
            const p = target.position;
            posDisplay.textContent = `X: ${p.x.toFixed(2)}, Y: ${p.y.toFixed(2)}, Z: ${p.z.toFixed(2)}`;
        }
    }
    
    /**
     * 移動モードを切り替え（translate / rotate / scale）
     */
    setTransformMode(mode) {
        if (!this.transformControls) return;
        this.transformControls.setMode(mode);
        console.log(`🔧 トランスフォームモード: ${mode}`);
    }
    
    /**
     * PLYファイルをパース（バイナリ対応）
     */
    async parsePLY(arrayBuffer) {
        const dataView = new DataView(arrayBuffer);
        const decoder = new TextDecoder();
        
        // ヘッダーを探す
        let headerEnd = 0;
        const headerBytes = new Uint8Array(arrayBuffer.slice(0, Math.min(10000, arrayBuffer.byteLength)));
        const headerText = decoder.decode(headerBytes);
        
        const endHeaderIndex = headerText.indexOf('end_header');
        if (endHeaderIndex === -1) {
            throw new Error('PLYヘッダーが見つかりません');
        }
        
        // end_header の後の改行を含めてヘッダー終了位置を計算
        headerEnd = endHeaderIndex + 'end_header'.length;
        // 改行文字をスキップ
        while (headerEnd < headerBytes.length && (headerBytes[headerEnd] === 10 || headerBytes[headerEnd] === 13)) {
            headerEnd++;
        }
        
        const header = headerText.substring(0, endHeaderIndex);
        console.log('📄 PLYヘッダー:\n', header);
        
        // ヘッダー解析
        const lines = header.split('\n');
        let vertexCount = 0;
        let format = 'ascii';
        const properties = [];
        
        for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed.startsWith('format')) {
                format = trimmed.includes('binary_little_endian') ? 'binary_little_endian' : 
                         trimmed.includes('binary_big_endian') ? 'binary_big_endian' : 'ascii';
            } else if (trimmed.startsWith('element vertex')) {
                vertexCount = parseInt(trimmed.split(' ')[2]);
            } else if (trimmed.startsWith('property')) {
                const parts = trimmed.split(' ');
                properties.push({
                    type: parts[1],
                    name: parts[2]
                });
            }
        }
        
        console.log(`📊 フォーマット: ${format}, 頂点数: ${vertexCount}, プロパティ: ${properties.length}`);
        console.log('📋 プロパティ:', properties.map(p => p.name).join(', '));
        
        // プロパティインデックス作成
        const propIndex = {};
        properties.forEach((p, i) => propIndex[p.name] = i);
        
        // データ配列
        const positions = new Float32Array(vertexCount * 3);
        const colors = new Float32Array(vertexCount * 3);
        
        if (format === 'ascii') {
            // ASCII形式
            const fullText = decoder.decode(new Uint8Array(arrayBuffer));
            const dataLines = fullText.substring(fullText.indexOf('end_header') + 'end_header'.length).trim().split('\n');
            
            for (let i = 0; i < vertexCount && i < dataLines.length; i++) {
                const values = dataLines[i].trim().split(/\s+/).map(parseFloat);
                this.parseVertexData(i, values, propIndex, positions, colors);
            }
        } else {
            // バイナリ形式
            let offset = headerEnd;
            const isLittleEndian = format === 'binary_little_endian';
            
            // 各プロパティのバイトサイズを計算
            const getTypeSize = (type) => {
                switch(type) {
                    case 'float': case 'float32': return 4;
                    case 'double': case 'float64': return 8;
                    case 'int': case 'int32': return 4;
                    case 'uint': case 'uint32': return 4;
                    case 'short': case 'int16': return 2;
                    case 'ushort': case 'uint16': return 2;
                    case 'char': case 'int8': return 1;
                    case 'uchar': case 'uint8': return 1;
                    default: return 4;
                }
            };
            
            const vertexSize = properties.reduce((sum, p) => sum + getTypeSize(p.type), 0);
            console.log(`📏 頂点サイズ: ${vertexSize} bytes`);
            
            for (let i = 0; i < vertexCount; i++) {
                const values = [];
                let propOffset = offset;
                
                for (const prop of properties) {
                    const size = getTypeSize(prop.type);
                    let value = 0;
                    
                    try {
                        switch(prop.type) {
                            case 'float': case 'float32':
                                value = dataView.getFloat32(propOffset, isLittleEndian);
                                break;
                            case 'double': case 'float64':
                                value = dataView.getFloat64(propOffset, isLittleEndian);
                                break;
                            case 'int': case 'int32':
                                value = dataView.getInt32(propOffset, isLittleEndian);
                                break;
                            case 'uint': case 'uint32':
                                value = dataView.getUint32(propOffset, isLittleEndian);
                                break;
                            case 'short': case 'int16':
                                value = dataView.getInt16(propOffset, isLittleEndian);
                                break;
                            case 'ushort': case 'uint16':
                                value = dataView.getUint16(propOffset, isLittleEndian);
                                break;
                            case 'char': case 'int8':
                                value = dataView.getInt8(propOffset);
                                break;
                            case 'uchar': case 'uint8':
                                value = dataView.getUint8(propOffset);
                                break;
                        }
                    } catch (e) {
                        value = 0;
                    }
                    
                    values.push(value);
                    propOffset += size;
                }
                
                this.parseVertexData(i, values, propIndex, positions, colors);
                offset += vertexSize;
            }
        }
        
        return { positions, colors, vertexCount };
    }
    
    /**
     * 頂点データをパース
     */
    parseVertexData(index, values, propIndex, positions, colors) {
        // Position
        positions[index * 3] = values[propIndex['x']] || 0;
        positions[index * 3 + 1] = values[propIndex['y']] || 0;
        positions[index * 3 + 2] = values[propIndex['z']] || 0;
        
        // Color - 複数の形式に対応
        let r = 0.5, g = 0.5, b = 0.5;
        
        // Spherical Harmonics (Gaussian Splat形式)
        if (propIndex['f_dc_0'] !== undefined) {
            const SH_C0 = 0.28209479177387814;
            r = Math.max(0, Math.min(1, 0.5 + SH_C0 * (values[propIndex['f_dc_0']] || 0)));
            g = Math.max(0, Math.min(1, 0.5 + SH_C0 * (values[propIndex['f_dc_1']] || 0)));
            b = Math.max(0, Math.min(1, 0.5 + SH_C0 * (values[propIndex['f_dc_2']] || 0)));
        }
        // 標準RGB (0-255)
        else if (propIndex['red'] !== undefined) {
            r = (values[propIndex['red']] || 0) / 255;
            g = (values[propIndex['green']] || 0) / 255;
            b = (values[propIndex['blue']] || 0) / 255;
        }
        // 標準RGB (diffuse)
        else if (propIndex['diffuse_red'] !== undefined) {
            r = (values[propIndex['diffuse_red']] || 0) / 255;
            g = (values[propIndex['diffuse_green']] || 0) / 255;
            b = (values[propIndex['diffuse_blue']] || 0) / 255;
        }
        // float RGB (0-1)
        else if (propIndex['r'] !== undefined) {
            r = values[propIndex['r']] || 0;
            g = values[propIndex['g']] || 0;
            b = values[propIndex['b']] || 0;
        }
        
        colors[index * 3] = r;
        colors[index * 3 + 1] = g;
        colors[index * 3 + 2] = b;
    }
    
    /**
     * ポイントクラウドメッシュを作成（円形ポイント）
     */
    createPointCloudMesh(data) {
        const THREE = window.THREE;
        
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.BufferAttribute(data.positions, 3));
        geometry.setAttribute('color', new THREE.BufferAttribute(data.colors, 3));
        
        // カスタムシェーダーで円形ポイントを描画（距離減衰を調整）
        this.pointMaterial = new THREE.ShaderMaterial({
            uniforms: {
                pointSize: { value: 50.0 },
                minPointSize: { value: 2.0 }  // 遠くでも最低このサイズを保つ
            },
            vertexShader: `
                attribute vec3 color;
                varying vec3 vColor;
                uniform float pointSize;
                uniform float minPointSize;
                
                void main() {
                    vColor = color;
                    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
                    
                    // 距離によるサイズ調整（遠くでも最低サイズを保証）
                    float dist = -mvPosition.z;
                    float size = pointSize * (300.0 / max(dist, 1.0));
                    gl_PointSize = max(size, minPointSize);
                    
                    gl_Position = projectionMatrix * mvPosition;
                }
            `,
            fragmentShader: `
                varying vec3 vColor;
                
                void main() {
                    // 円形にする
                    vec2 center = gl_PointCoord - vec2(0.5);
                    float dist = length(center);
                    
                    if (dist > 0.5) discard;
                    
                    // ソフトエッジ
                    float alpha = 1.0 - smoothstep(0.3, 0.5, dist);
                    
                    gl_FragColor = vec4(vColor, alpha);
                }
            `,
            transparent: true,
            depthWrite: false,
            blending: THREE.NormalBlending
        });
        
        const points = new THREE.Points(geometry, this.pointMaterial);
        points.frustumCulled = false;  // フラスタムカリングを無効化（遠くの点も描画）
        
        return points;
    }
    
    /**
     * GLB/GLTFモデルを読み込み
     */
    async loadGLB(arrayBuffer, fileName) {
        const THREE = window.THREE;
        
        return new Promise((resolve, reject) => {
            // GLTFLoaderが利用可能か確認（main.jsでGLTFLoaderClassとして公開されている）
            const GLTFLoader = window.GLTFLoaderClass;
            if (!GLTFLoader) {
                reject(new Error('GLTFLoaderが見つかりません。ページをリロードしてください。'));
                return;
            }
            
            const loader = new GLTFLoader();
            
            // ArrayBufferからBlob URLを作成
            const blob = new Blob([arrayBuffer], { type: 'model/gltf-binary' });
            const url = URL.createObjectURL(blob);
            
            loader.load(
                url,
                (gltf) => {
                    URL.revokeObjectURL(url);
                    
                    const model = gltf.scene;
                    
                    // マテリアル調整（背景らしく）
                    model.traverse((child) => {
                        if (child.isMesh) {
                            // 既存のマテリアルを保持しつつ、必要なら調整
                            if (child.material) {
                                child.material.side = THREE.DoubleSide;
                                // 影を受ける
                                child.receiveShadow = true;
                            }
                        }
                    });
                    
                    console.log('✅ GLBモデル読み込み完了:', fileName);
                    resolve(model);
                },
                (progress) => {
                    if (progress.total > 0) {
                        const percent = Math.round((progress.loaded / progress.total) * 100);
                        console.log(`📦 読み込み中: ${percent}%`);
                    }
                },
                (error) => {
                    URL.revokeObjectURL(url);
                    reject(error);
                }
            );
        });
    }
    
    /**
     * FBXモデルを読み込み
     */
    async loadFBX(arrayBuffer, fileName) {
        const THREE = window.THREE;
        
        return new Promise((resolve, reject) => {
            // FBXLoaderが利用可能か確認（main.jsでFBXLoaderClassとして公開されている）
            const FBXLoader = window.FBXLoaderClass;
            if (!FBXLoader) {
                reject(new Error('FBXLoaderが見つかりません。ページをリロードしてください。'));
                return;
            }
            
            const loader = new FBXLoader();
            
            // ArrayBufferからBlob URLを作成
            const blob = new Blob([arrayBuffer], { type: 'application/octet-stream' });
            const url = URL.createObjectURL(blob);
            
            loader.load(
                url,
                (fbx) => {
                    URL.revokeObjectURL(url);
                    
                    // マテリアル調整（背景らしく）
                    fbx.traverse((child) => {
                        if (child.isMesh) {
                            // 既存のマテリアルを保持しつつ、必要なら調整
                            if (child.material) {
                                // 配列の場合（マルチマテリアル）
                                if (Array.isArray(child.material)) {
                                    child.material.forEach(mat => {
                                        mat.side = THREE.DoubleSide;
                                    });
                                } else {
                                    child.material.side = THREE.DoubleSide;
                                }
                                // 影を受ける
                                child.receiveShadow = true;
                            }
                        }
                    });
                    
                    console.log('✅ FBXモデル読み込み完了:', fileName);
                    resolve(fbx);
                },
                (progress) => {
                    if (progress.total > 0) {
                        const percent = Math.round((progress.loaded / progress.total) * 100);
                        console.log(`📦 FBX読み込み中: ${percent}%`);
                    }
                },
                (error) => {
                    URL.revokeObjectURL(url);
                    reject(error);
                }
            );
        });
    }
    
    /**
     * ファイルから環境を読み込み
     */
    async loadEnvironmentFromFile(file) {
        if (this.isLoading) return;
        this.isLoading = true;
        
        const statusEl = document.getElementById('env-status');
        if (statusEl) statusEl.textContent = '🔄 読み込み中...';
        
        console.log('📂 ファイル読み込み:', file.name, file.size, 'bytes');
        
        // 拡張子を取得
        const ext = file.name.toLowerCase().split('.').pop();
        console.log('📋 拡張子:', ext);
        
        try {
            this.removeEnvironment();
            
            const arrayBuffer = await file.arrayBuffer();
            console.log('📦 ArrayBuffer取得完了');
            
            // カメラの描画距離を拡大
            if (this.camera) {
                this.camera.far = 10000;
                this.camera.updateProjectionMatrix();
            }
            
            this.hideGrid();
            
            if (ext === 'glb' || ext === 'gltf') {
                // GLB/GLTFモデルとして読み込み
                this.envType = 'mesh';
                this.envModel = await this.loadGLB(arrayBuffer, file.name);
                this.scene.add(this.envModel);
                
                // 初期スケール
                const initialScale = 1.0;
                this.envModel.scale.setScalar(initialScale);
                
                // スライダー初期化
                this.initSliders(initialScale, 0.5);
                
                if (statusEl) statusEl.textContent = `✅ ${file.name} (3Dモデル)`;
                console.log('🎉 3Dモデル読み込み完了');
                
                // 物理コライダーを作成（GLBのみ）
                if (window.createEnvironmentColliders) {
                    setTimeout(() => {
                        window.createEnvironmentColliders(this.envModel);
                    }, 100);
                }
                
                // 保存された設定を適用
                this.applyPendingSettings();
                
            } else if (ext === 'fbx') {
                // FBXモデルとして読み込み
                this.envType = 'mesh';
                this.envModel = await this.loadFBX(arrayBuffer, file.name);
                this.scene.add(this.envModel);
                
                // FBXは通常大きいので小さめの初期スケール
                const initialScale = 0.01;
                this.envModel.scale.setScalar(initialScale);
                
                // スライダー初期化
                this.initSliders(initialScale, 0.5);
                
                if (statusEl) statusEl.textContent = `✅ ${file.name} (FBXモデル)`;
                console.log('🎉 FBXモデル読み込み完了');
                
                // 物理コライダーを作成
                if (window.createEnvironmentColliders) {
                    setTimeout(() => {
                        window.createEnvironmentColliders(this.envModel);
                    }, 100);
                }
                
                // 保存された設定を適用
                this.applyPendingSettings();
                
            } else if (ext === 'ply') {
                // PLY (Gaussian Splats) として読み込み
                this.envType = 'splat';
                const data = await this.parsePLY(arrayBuffer);
                console.log('✅ パース完了:', data.vertexCount, '頂点');
                
                // 色のデバッグ情報
                let hasColor = false;
                for (let i = 0; i < Math.min(10, data.vertexCount); i++) {
                    const r = data.colors[i * 3];
                    const g = data.colors[i * 3 + 1];
                    const b = data.colors[i * 3 + 2];
                    if (r !== 0.5 || g !== 0.5 || b !== 0.5) hasColor = true;
                }
                console.log('🎨 色データ:', hasColor ? '検出' : 'デフォルト(グレー)');
                
                this.splatMesh = this.createPointCloudMesh(data);
                this.scene.add(this.splatMesh);
                
                // 初期スケール
                const initialScale = 0.01;
                this.splatMesh.scale.setScalar(initialScale);
                
                // スライダー初期化
                this.initSliders(initialScale, 0.5);
                
                if (statusEl) statusEl.textContent = `✅ ${file.name} (${data.vertexCount}点)`;
                console.log('🎉 Splat読み込み完了');
                
                // 保存された設定を適用
                this.applyPendingSettings();
                
            } else {
                throw new Error('サポートされていない形式です。\n対応: .ply, .glb, .gltf, .fbx');
            }
            
        } catch (error) {
            console.error('❌ エラー:', error);
            if (statusEl) statusEl.textContent = '❌ 失敗';
            alert('読み込み失敗: ' + error.message);
            this.showGrid();
        } finally {
            this.isLoading = false;
        }
    }
    
    /**
     * スライダー初期化
     */
    initSliders(scale, pointSize) {
        const scaleSlider = document.getElementById('env-scale');
        const scaleInput = document.getElementById('env-scale-input');
        if (scaleSlider) scaleSlider.value = Math.min(scale, 5);
        if (scaleInput) scaleInput.value = scale;
        
        const pointSizeSlider = document.getElementById('env-pointsize');
        const pointSizeInput = document.getElementById('env-pointsize-input');
        if (pointSizeSlider) pointSizeSlider.value = pointSize;
        if (pointSizeInput) pointSizeInput.value = pointSize;
        
        const heightSlider = document.getElementById('env-height');
        const heightInput = document.getElementById('env-height-input');
        if (heightSlider) heightSlider.value = 0;
        if (heightInput) heightInput.value = 0;
        
        const rotationSlider = document.getElementById('env-rotation');
        const rotationInput = document.getElementById('env-rotation-input');
        if (rotationSlider) rotationSlider.value = 0;
        if (rotationInput) rotationInput.value = 0;
    }
    
    /**
     * プリセット
     */
    loadPreset(presetName) {
        this.removeEnvironment();
        const gridHelper = this.scene.children.find(child => child.type === 'GridHelper');
        
        switch (presetName) {
            case 'grid':
                if (gridHelper) gridHelper.visible = true;
                this.scene.background = new window.THREE.Color(0xf0f0f0);
                break;
            case 'gradient':
                if (gridHelper) gridHelper.visible = false;
                this.scene.background = new window.THREE.Color(0x87CEEB);
                break;
            case 'dark':
                if (gridHelper) gridHelper.visible = false;
                this.scene.background = new window.THREE.Color(0x1a1a2e);
                break;
        }
        
        const statusEl = document.getElementById('env-status');
        if (statusEl) statusEl.textContent = `プリセット: ${presetName}`;
    }
    
    /**
     * トランスフォーム更新
     */
    updateEnvironmentTransform() {
        const target = this.envModel || this.splatMesh;
        if (!target) return;
        
        // 数字入力フィールドから値を取得
        const scale = parseFloat(document.getElementById('env-scale-input')?.value || 1);
        const height = parseFloat(document.getElementById('env-height-input')?.value || 0);
        const rotation = parseFloat(document.getElementById('env-rotation-input')?.value || 0);
        
        target.scale.setScalar(scale);
        target.position.y = height;
        target.rotation.y = window.THREE.MathUtils.degToRad(rotation);
        
        // GLBモデルの場合、物理コライダーも更新
        if (this.envType === 'mesh' && this.envModel && window.createEnvironmentColliders) {
            // トランスフォーム変更後にコライダーを再作成
            if (this._colliderUpdateTimeout) clearTimeout(this._colliderUpdateTimeout);
            this._colliderUpdateTimeout = setTimeout(() => {
                window.createEnvironmentColliders(this.envModel);
            }, 200);
        }
    }
    
    /**
     * ポイントサイズ更新
     */
    updatePointSize(size) {
        if (this.pointMaterial && this.pointMaterial.uniforms) {
            this.pointMaterial.uniforms.pointSize.value = size * 100;
            this.pointMaterial.needsUpdate = true;
        }
    }
    
    /**
     * 環境削除
     */
    removeEnvironment() {
        // TransformControlsを解除
        if (this.transformControls) {
            this.transformControls.detach();
            this.isTransformMode = false;
            // ボタンの表示を更新
            const btn = document.getElementById('env-transform-btn');
            if (btn) {
                btn.textContent = '📍 移動モード';
                btn.style.background = 'linear-gradient(135deg, #667eea, #764ba2)';
            }
        }
        
        // 物理コライダーを削除
        if (window.clearEnvironmentColliders) {
            window.clearEnvironmentColliders();
        }
        
        // Splatメッシュ削除
        if (this.splatMesh) {
            this.scene.remove(this.splatMesh);
            if (this.splatMesh.geometry) this.splatMesh.geometry.dispose();
            if (this.splatMesh.material) this.splatMesh.material.dispose();
            this.splatMesh = null;
        }
        
        // GLBモデル削除
        if (this.envModel) {
            this.scene.remove(this.envModel);
            // メモリ解放
            this.envModel.traverse((child) => {
                if (child.isMesh) {
                    if (child.geometry) child.geometry.dispose();
                    if (child.material) {
                        if (Array.isArray(child.material)) {
                            child.material.forEach(m => m.dispose());
                        } else {
                            child.material.dispose();
                        }
                    }
                }
            });
            this.envModel = null;
        }
        
        this.pointMaterial = null;
        this.envType = null;
        this.showGrid();
        
        const statusEl = document.getElementById('env-status');
        if (statusEl) statusEl.textContent = 'なし';
        
        // 位置表示をリセット
        const posDisplay = document.getElementById('env-position-display');
        if (posDisplay) posDisplay.textContent = '--';
    }
    
    hideGrid() {
        const gridHelper = this.scene.children.find(child => child.type === 'GridHelper');
        if (gridHelper) gridHelper.visible = false;
        this.scene.background = new window.THREE.Color(0x111111);
    }
    
    showGrid() {
        const gridHelper = this.scene.children.find(child => child.type === 'GridHelper');
        if (gridHelper) gridHelper.visible = true;
        this.scene.background = new window.THREE.Color(0xf0f0f0);
    }
    
    /**
     * 保留中の設定を適用
     */
    applyPendingSettings() {
        if (window._pendingEnvSettings) {
            setTimeout(() => {
                window.applyEnvironmentSettings(window._pendingEnvSettings);
                console.log('💾 保存された設定を自動適用しました');
                // 一度適用したらクリア（再読み込み時のみ適用）
                // window._pendingEnvSettings = null;
            }, 200);
        }
    }
}

window.EnvironmentManager = EnvironmentManager;

/**
 * 設定の保存キー
 */
const ENV_SETTINGS_KEY = 'vrm_environment_settings';

/**
 * 環境設定を保存
 */
window.saveEnvironmentSettings = function() {
    const manager = window.app?.environmentManager;
    if (!manager) {
        console.warn('⚠️ EnvironmentManagerが見つかりません');
        return false;
    }
    
    const target = manager.envModel || manager.splatMesh;
    
    const settings = {
        // スライダー値
        scale: parseFloat(document.getElementById('env-scale-input')?.value || 1),
        pointSize: parseFloat(document.getElementById('env-pointsize-input')?.value || 0.5),
        height: parseFloat(document.getElementById('env-height-input')?.value || 0),
        rotation: parseFloat(document.getElementById('env-rotation-input')?.value || 0),
        
        // モデルの実際の位置（移動モードで動かした場合）
        position: target ? {
            x: target.position.x,
            y: target.position.y,
            z: target.position.z
        } : null,
        
        // 環境タイプ
        envType: manager.envType,
        
        // 最後に読み込んだファイル名
        lastFileName: document.getElementById('env-status')?.textContent || '',
        
        // 保存日時
        savedAt: new Date().toISOString()
    };
    
    try {
        localStorage.setItem(ENV_SETTINGS_KEY, JSON.stringify(settings));
        console.log('💾 環境設定を保存しました:', settings);
        return true;
    } catch (e) {
        console.error('❌ 設定保存エラー:', e);
        return false;
    }
};

/**
 * 環境設定を読み込み
 */
window.loadEnvironmentSettings = function() {
    try {
        const saved = localStorage.getItem(ENV_SETTINGS_KEY);
        if (!saved) return null;
        return JSON.parse(saved);
    } catch (e) {
        console.error('❌ 設定読み込みエラー:', e);
        return null;
    }
};

/**
 * 保存された設定をUIとモデルに適用
 */
window.applyEnvironmentSettings = function(settings) {
    if (!settings) return false;
    
    const manager = window.app?.environmentManager;
    if (!manager) return false;
    
    const target = manager.envModel || manager.splatMesh;
    
    // スライダーとinputに値を設定
    const setValue = (sliderId, inputId, value) => {
        const slider = document.getElementById(sliderId);
        const input = document.getElementById(inputId);
        if (slider) slider.value = value;
        if (input) input.value = value;
    };
    
    setValue('env-scale', 'env-scale-input', settings.scale || 1);
    setValue('env-pointsize', 'env-pointsize-input', settings.pointSize || 0.5);
    setValue('env-height', 'env-height-input', settings.height || 0);
    setValue('env-rotation', 'env-rotation-input', settings.rotation || 0);
    
    // モデルがあれば位置も適用
    if (target) {
        // スケールと回転を適用
        target.scale.setScalar(settings.scale || 1);
        target.rotation.y = window.THREE.MathUtils.degToRad(settings.rotation || 0);
        
        // 位置を適用
        if (settings.position) {
            target.position.set(
                settings.position.x || 0,
                settings.position.y || 0,
                settings.position.z || 0
            );
        } else {
            target.position.y = settings.height || 0;
        }
        
        // ポイントサイズを適用（Splatの場合）
        if (manager.pointMaterial && manager.pointMaterial.uniforms) {
            manager.pointMaterial.uniforms.pointSize.value = (settings.pointSize || 0.5) * 100;
        }
        
        // コライダーを更新
        if (manager.envType === 'mesh' && manager.envModel && window.createEnvironmentColliders) {
            setTimeout(() => {
                window.createEnvironmentColliders(manager.envModel);
            }, 100);
        }
        
        // 位置表示を更新
        manager.updatePositionDisplay();
    }
    
    console.log('✅ 環境設定を適用しました:', settings);
    return true;
};

/**
 * 保存された設定をクリア
 */
window.clearEnvironmentSettings = function() {
    try {
        localStorage.removeItem(ENV_SETTINGS_KEY);
        console.log('🗑️ 環境設定をクリアしました');
        return true;
    } catch (e) {
        console.error('❌ 設定クリアエラー:', e);
        return false;
    }
};

/**
 * パネル作成
 */
function createEnvironmentPanel() {
    if (document.getElementById('env-panel')) return;
    
    const panel = document.createElement('div');
    panel.id = 'env-panel';
    panel.innerHTML = `
        <div style="
            position: fixed;
            top: 10px;
            left: 210px;
            z-index: 99999;
            background: rgba(255, 255, 255, 0.95);
            padding: 15px;
            border-radius: 10px;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
            width: 220px;
            font-family: 'Segoe UI', sans-serif;
        ">
            <div style="font-weight: bold; font-size: 14px; margin-bottom: 10px; color: #333; border-bottom: 2px solid #667eea; padding-bottom: 5px;">
                🌃 3D環境
            </div>
            
            <div id="env-status" style="font-size: 10px; color: #666; margin-bottom: 10px; padding: 5px; background: #f0f0f0; border-radius: 4px;">
                なし
            </div>
            
            <!-- ドロップゾーン -->
            <div id="env-drop-zone" style="
                border: 2px dashed #667eea;
                border-radius: 8px;
                padding: 15px;
                text-align: center;
                cursor: pointer;
                margin-bottom: 15px;
                background: #f8f9ff;
            ">
                <div style="font-size: 24px;">📁</div>
                <div style="font-size: 11px; color: #667eea; font-weight: bold;">.glb / .fbx / .ply をドロップ</div>
                <div style="font-size: 9px; color: #999; margin-top: 3px;">3Dモデル or Gaussian Splats</div>
            </div>
            
            <!-- プリセット -->
            <div style="display: flex; gap: 5px; margin-bottom: 15px;">
                <button class="env-preset-btn" data-env="grid" style="flex: 1; padding: 8px; font-size: 16px; border: 1px solid #ddd; border-radius: 6px; background: white; cursor: pointer;">📐</button>
                <button class="env-preset-btn" data-env="gradient" style="flex: 1; padding: 8px; font-size: 16px; border: 1px solid #ddd; border-radius: 6px; background: white; cursor: pointer;">🌅</button>
                <button class="env-preset-btn" data-env="dark" style="flex: 1; padding: 8px; font-size: 16px; border: 1px solid #ddd; border-radius: 6px; background: white; cursor: pointer;">🌙</button>
            </div>
            
            <!-- スライダー -->
            <div style="background: #f5f5f5; padding: 12px; border-radius: 8px; margin-bottom: 10px;">
                <div style="font-weight: bold; font-size: 12px; margin-bottom: 10px; color: #333;">🔧 調整スライダー</div>
                
                <!-- スケール -->
                <div style="margin-bottom: 12px;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 3px;">
                        <span style="font-size: 11px; font-weight: bold;">📐 スケール</span>
                        <input type="number" id="env-scale-input" value="0.01" min="0.0001" max="10" step="0.001" style="width: 70px; font-size: 10px; padding: 2px 4px; border: 1px solid #667eea; border-radius: 3px; text-align: right;">
                    </div>
                    <input type="range" id="env-scale" min="0.0001" max="5" step="0.0001" value="0.01" style="width: 100%; height: 20px; cursor: pointer;">
                </div>
                
                <!-- ポイントサイズ -->
                <div style="margin-bottom: 12px;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 3px;">
                        <span style="font-size: 11px; font-weight: bold;">⭕ 粒の大きさ</span>
                        <input type="number" id="env-pointsize-input" value="0.5" min="0.001" max="10" step="0.001" style="width: 70px; font-size: 10px; padding: 2px 4px; border: 1px solid #667eea; border-radius: 3px; text-align: right;">
                    </div>
                    <input type="range" id="env-pointsize" min="0.001" max="2" step="0.001" value="0.5" style="width: 100%; height: 20px; cursor: pointer;">
                </div>
                
                <!-- 高さ -->
                <div style="margin-bottom: 12px;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 3px;">
                        <span style="font-size: 11px; font-weight: bold;">↕️ 高さ</span>
                        <input type="number" id="env-height-input" value="0" min="-50" max="50" step="0.1" style="width: 70px; font-size: 10px; padding: 2px 4px; border: 1px solid #667eea; border-radius: 3px; text-align: right;">
                    </div>
                    <input type="range" id="env-height" min="-10" max="10" step="0.1" value="0" style="width: 100%; height: 20px; cursor: pointer;">
                </div>
                
                <!-- 回転 -->
                <div>
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 3px;">
                        <span style="font-size: 11px; font-weight: bold;">🔄 回転</span>
                        <input type="number" id="env-rotation-input" value="0" min="0" max="360" step="1" style="width: 70px; font-size: 10px; padding: 2px 4px; border: 1px solid #667eea; border-radius: 3px; text-align: right;">
                    </div>
                    <input type="range" id="env-rotation" min="0" max="360" step="1" value="0" style="width: 100%; height: 20px; cursor: pointer;">
                </div>
            </div>
            
            <!-- 移動ハンドル -->
            <div style="background: #e8f4f8; padding: 10px; border-radius: 8px; margin-bottom: 10px;">
                <div style="font-weight: bold; font-size: 11px; margin-bottom: 8px; color: #333;">📍 モデル移動</div>
                <button id="env-transform-btn" style="
                    width: 100%;
                    padding: 8px;
                    font-size: 11px;
                    border: none;
                    border-radius: 6px;
                    background: linear-gradient(135deg, #667eea, #764ba2);
                    color: white;
                    cursor: pointer;
                    font-weight: bold;
                    margin-bottom: 6px;
                ">📍 移動モード</button>
                <div style="display: flex; gap: 4px; margin-bottom: 6px;">
                    <button class="env-mode-btn" data-mode="translate" style="flex: 1; padding: 6px; font-size: 10px; border: 1px solid #667eea; border-radius: 4px; background: #667eea; color: white; cursor: pointer;" title="移動">↔️ 移動</button>
                    <button class="env-mode-btn" data-mode="rotate" style="flex: 1; padding: 6px; font-size: 10px; border: 1px solid #667eea; border-radius: 4px; background: white; color: #667eea; cursor: pointer;" title="回転">🔄 回転</button>
                    <button class="env-mode-btn" data-mode="scale" style="flex: 1; padding: 6px; font-size: 10px; border: 1px solid #667eea; border-radius: 4px; background: white; color: #667eea; cursor: pointer;" title="拡大縮小">🔍 サイズ</button>
                </div>
                <div style="font-size: 9px; color: #666; text-align: center;">
                    位置: <span id="env-position-display">--</span>
                </div>
            </div>
            
            <!-- コライダーボタン -->
            <div style="display: flex; gap: 5px; margin-bottom: 10px;">
                <button id="env-collider-btn" style="
                    flex: 1;
                    padding: 8px;
                    font-size: 11px;
                    border: 1px solid #0088ff;
                    border-radius: 6px;
                    background: white;
                    color: #0088ff;
                    cursor: pointer;
                    font-weight: bold;
                ">🟦 コライダー表示</button>
            </div>
            <!-- 設定保存セクション -->
            <div style="background: #fff3cd; padding: 10px; border-radius: 8px; margin-bottom: 10px;">
                <div style="font-weight: bold; font-size: 11px; margin-bottom: 8px; color: #856404;">💾 設定の保存</div>
                <div style="display: flex; gap: 5px; margin-bottom: 6px;">
                    <button id="env-save-btn" style="
                        flex: 2;
                        padding: 8px;
                        font-size: 11px;
                        border: none;
                        border-radius: 6px;
                        background: linear-gradient(135deg, #28a745, #20c997);
                        color: white;
                        cursor: pointer;
                        font-weight: bold;
                    ">💾 現在の設定を保存</button>
                    <button id="env-clear-settings-btn" style="
                        flex: 1;
                        padding: 8px;
                        font-size: 10px;
                        border: 1px solid #dc3545;
                        border-radius: 6px;
                        background: white;
                        color: #dc3545;
                        cursor: pointer;
                    ">クリア</button>
                </div>
                <div id="env-save-status" style="font-size: 9px; color: #666; text-align: center;">保存された設定: なし</div>
            </div>
            
            <button id="env-remove-btn" style="
                width: 100%;
                padding: 10px;
                font-size: 12px;
                border: none;
                border-radius: 6px;
                background: #ff6b6b;
                color: white;
                cursor: pointer;
                font-weight: bold;
            ">🗑️ 環境を削除</button>
        </div>
    `;
    
    document.body.appendChild(panel);
    setupEvents();
    
    console.log('✅ 3D環境パネル作成完了');
}

/**
 * イベント設定
 */
function setupEvents() {
    // ドロップゾーン
    const dropZone = document.getElementById('env-drop-zone');
    if (dropZone) {
        dropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropZone.style.background = '#e8ebff';
        });
        dropZone.addEventListener('dragleave', () => {
            dropZone.style.background = '#f8f9ff';
        });
        dropZone.addEventListener('drop', async (e) => {
            e.preventDefault();
            dropZone.style.background = '#f8f9ff';
            const file = e.dataTransfer.files[0];
            if (file && window.app?.environmentManager) {
                await window.app.environmentManager.loadEnvironmentFromFile(file);
            }
        });
        dropZone.addEventListener('click', () => {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = '.ply,.glb,.gltf,.fbx';
            input.onchange = async (e) => {
                const file = e.target.files[0];
                if (file && window.app?.environmentManager) {
                    await window.app.environmentManager.loadEnvironmentFromFile(file);
                }
            };
            input.click();
        });
    }
    
    // プリセットボタン
    document.querySelectorAll('.env-preset-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            window.app?.environmentManager?.loadPreset(btn.dataset.env);
        });
    });
    
    // スケールスライダー
    const scaleSlider = document.getElementById('env-scale');
    const scaleInput = document.getElementById('env-scale-input');
    if (scaleSlider && scaleInput) {
        scaleSlider.addEventListener('input', (e) => {
            const val = parseFloat(e.target.value);
            scaleInput.value = val;
            window.app?.environmentManager?.updateEnvironmentTransform();
        });
        scaleInput.addEventListener('input', (e) => {
            const val = parseFloat(e.target.value) || 0.01;
            scaleSlider.value = Math.min(Math.max(val, 0.0001), 5);
            window.app?.environmentManager?.updateEnvironmentTransform();
        });
    }
    
    // ポイントサイズスライダー
    const pointSizeSlider = document.getElementById('env-pointsize');
    const pointSizeInput = document.getElementById('env-pointsize-input');
    if (pointSizeSlider && pointSizeInput) {
        pointSizeSlider.addEventListener('input', (e) => {
            const val = parseFloat(e.target.value);
            pointSizeInput.value = val;
            window.app?.environmentManager?.updatePointSize(val);
        });
        pointSizeInput.addEventListener('input', (e) => {
            const val = parseFloat(e.target.value) || 0.5;
            pointSizeSlider.value = Math.min(Math.max(val, 0.001), 2);
            window.app?.environmentManager?.updatePointSize(val);
        });
    }
    
    // 高さスライダー
    const heightSlider = document.getElementById('env-height');
    const heightInput = document.getElementById('env-height-input');
    if (heightSlider && heightInput) {
        heightSlider.addEventListener('input', (e) => {
            const val = parseFloat(e.target.value);
            heightInput.value = val;
            window.app?.environmentManager?.updateEnvironmentTransform();
        });
        heightInput.addEventListener('input', (e) => {
            const val = parseFloat(e.target.value) || 0;
            heightSlider.value = Math.min(Math.max(val, -10), 10);
            window.app?.environmentManager?.updateEnvironmentTransform();
        });
    }
    
    // 回転スライダー
    const rotationSlider = document.getElementById('env-rotation');
    const rotationInput = document.getElementById('env-rotation-input');
    if (rotationSlider && rotationInput) {
        rotationSlider.addEventListener('input', (e) => {
            const val = parseInt(e.target.value);
            rotationInput.value = val;
            window.app?.environmentManager?.updateEnvironmentTransform();
        });
        rotationInput.addEventListener('input', (e) => {
            const val = parseInt(e.target.value) || 0;
            rotationSlider.value = Math.min(Math.max(val, 0), 360);
            window.app?.environmentManager?.updateEnvironmentTransform();
        });
    }
    
    // 削除ボタン
    const removeBtn = document.getElementById('env-remove-btn');
    if (removeBtn) {
        removeBtn.addEventListener('click', () => {
            window.app?.environmentManager?.removeEnvironment();
        });
    }
    
    // 環境コライダー表示ボタン
    const colliderBtn = document.getElementById('env-collider-btn');
    if (colliderBtn) {
        colliderBtn.addEventListener('click', () => {
            if (window.toggleEnvironmentColliderVisibility) {
                window.toggleEnvironmentColliderVisibility();
                
                // ボタンの見た目を更新
                if (window.showEnvironmentColliders) {
                    colliderBtn.textContent = '🟦 コライダー非表示';
                    colliderBtn.style.background = '#ff6b6b';
                    colliderBtn.style.color = 'white';
                } else {
                    colliderBtn.textContent = '🟦 コライダー表示';
                    colliderBtn.style.background = 'white';
                    colliderBtn.style.color = '#0088ff';
                }
            } else {
                alert('物理システムが読み込まれていません。\nページをリロードしてください。');
            }
        });
    }
    
    // 移動モードボタン
    const transformBtn = document.getElementById('env-transform-btn');
    if (transformBtn) {
        transformBtn.addEventListener('click', () => {
            const manager = window.app?.environmentManager;
            if (!manager) return;
            
            const isOn = manager.toggleTransformMode();
            
            if (isOn) {
                transformBtn.textContent = '✅ 移動モード ON';
                transformBtn.style.background = 'linear-gradient(135deg, #00c853, #00e676)';
            } else {
                transformBtn.textContent = '📍 移動モード';
                transformBtn.style.background = 'linear-gradient(135deg, #667eea, #764ba2)';
            }
        });
    }
    
    // トランスフォームモード切り替えボタン（移動/回転/スケール）
    document.querySelectorAll('.env-mode-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const mode = btn.dataset.mode;
            const manager = window.app?.environmentManager;
            if (!manager) return;
            
            manager.setTransformMode(mode);
            
            // ボタンの見た目を更新
            document.querySelectorAll('.env-mode-btn').forEach(b => {
                if (b.dataset.mode === mode) {
                    b.style.background = '#667eea';
                    b.style.color = 'white';
                } else {
                    b.style.background = 'white';
                    b.style.color = '#667eea';
                }
            });
        });
    });
    
    // 設定保存ボタン
    const saveBtn = document.getElementById('env-save-btn');
    if (saveBtn) {
        saveBtn.addEventListener('click', () => {
            const success = window.saveEnvironmentSettings();
            const statusEl = document.getElementById('env-save-status');
            if (success) {
                if (statusEl) {
                    const settings = window.loadEnvironmentSettings();
                    const date = new Date(settings.savedAt);
                    statusEl.textContent = `✅ 保存完了 (${date.toLocaleString('ja-JP')})`;
                    statusEl.style.color = '#28a745';
                }
                alert('設定を保存しました！\n次回起動時に自動的に復元されます。');
            } else {
                if (statusEl) {
                    statusEl.textContent = '❌ 保存失敗';
                    statusEl.style.color = '#dc3545';
                }
            }
        });
    }
    
    // 設定クリアボタン
    const clearSettingsBtn = document.getElementById('env-clear-settings-btn');
    if (clearSettingsBtn) {
        clearSettingsBtn.addEventListener('click', () => {
            if (confirm('保存された環境設定をクリアしますか？')) {
                window.clearEnvironmentSettings();
                const statusEl = document.getElementById('env-save-status');
                if (statusEl) {
                    statusEl.textContent = '保存された設定: なし';
                    statusEl.style.color = '#666';
                }
            }
        });
    }
    
    // 保存状態の表示を更新
    updateSaveStatus();
}

/**
 * 保存状態の表示を更新
 */
function updateSaveStatus() {
    const statusEl = document.getElementById('env-save-status');
    if (!statusEl) return;
    
    const settings = window.loadEnvironmentSettings();
    if (settings && settings.savedAt) {
        const date = new Date(settings.savedAt);
        const fileName = settings.lastFileName || '不明';
        statusEl.innerHTML = `💾 ${date.toLocaleDateString('ja-JP')} 保存<br><span style="font-size:8px;">${fileName}</span>`;
        statusEl.style.color = '#28a745';
    } else {
        statusEl.textContent = '保存された設定: なし';
        statusEl.style.color = '#666';
    }
}

// 初期化
(function() {
    let count = 0;
    const maxAttempts = 200; // 20秒待機
    
    const init = () => {
        count++;
        
        // デバッグログ（10回ごと）
        if (count % 20 === 0) {
            console.log(`🌃 EnvironmentManager 待機中... (${count}回目)`, {
                app: !!window.app,
                scene: !!window.app?.scene,
                renderer: !!window.app?.renderer,
                camera: !!window.app?.camera
            });
        }
        
        if (window.app?.scene && window.app?.renderer && window.app?.camera) {
            window.app.environmentManager = new EnvironmentManager(
                window.app.scene,
                window.app.renderer,
                window.app.camera
            );
            createEnvironmentPanel();
            console.log('✅ EnvironmentManager 初期化完了');
            
            // 保存された設定があれば通知
            const savedSettings = window.loadEnvironmentSettings();
            if (savedSettings) {
                console.log('💾 保存された環境設定が見つかりました:', savedSettings);
                
                // ファイル読み込み後に設定を適用するためのフラグ
                window._pendingEnvSettings = savedSettings;
                
                // 通知を表示
                setTimeout(() => {
                    const statusEl = document.getElementById('env-status');
                    if (statusEl && savedSettings.lastFileName) {
                        statusEl.innerHTML = `💾 前回: ${savedSettings.lastFileName}<br><span style="font-size:9px;">同じファイルを読み込むと設定が復元されます</span>`;
                    }
                }, 500);
            }
            
            return;
        }
        if (count < maxAttempts) {
            setTimeout(init, 100);
        } else {
            console.error('❌ EnvironmentManager: タイムアウト - window.appが見つかりません');
        }
    };
    
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => setTimeout(init, 500));
    } else {
        setTimeout(init, 500);
    }
})();

console.log('✅ spark-environment.js 読み込み完了');
