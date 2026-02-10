/**
 * HY-Motion Integration Module v3.2 - CACHE BUST 20260109
 * NPZ → VRMA → @pixiv/three-vrm-animation
 * 
 * NPZファイルをブラウザ内でVRMA(glTF)に変換し、
 * three-vrm-animationで正確に再生する
 * 
 * 更新: 2026-01-09 fflate対応、ブラウザAPI対応
 */

import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { VRMAnimationLoaderPlugin, createVRMAnimationClip } from '@pixiv/three-vrm-animation';

class HYMotionIntegration {
    constructor(app) {
        this.app = app;
        this.currentVrmAnimation = null;
        this.currentMixer = null;
        this.currentAction = null;
        this.isPlaying = false;
        this.playbackSpeed = 1.0;
        this.clock = new THREE.Clock();
        this.lastVRMABlob = null;
        
        // SMPL to VRM bone mapping (22 joints)
        this.SMPL_TO_VRM = {
            0: 'hips',
            1: 'leftUpperLeg',
            2: 'rightUpperLeg',
            3: 'spine',
            4: 'leftLowerLeg',
            5: 'rightLowerLeg',
            6: 'chest',
            7: 'leftFoot',
            8: 'rightFoot',
            9: 'upperChest',
            10: 'leftToes',
            11: 'rightToes',
            12: 'neck',
            13: 'leftShoulder',
            14: 'rightShoulder',
            15: 'head',
            16: 'leftUpperArm',
            17: 'rightUpperArm',
            18: 'leftLowerArm',
            19: 'rightLowerArm',
            20: 'leftHand',
            21: 'rightHand',
        };
        
        this.init();
    }
    
    init() {
        this.createUI();
        this.setupEventListeners();
        this.startAnimationLoop();
        this.preloadFflate(); // fflateを事前読み込み
        console.log('🎬 HY-Motion Integration v3.2 (VRMA mode) loaded');
    }
    
    async preloadFflate() {
        try {
            await this.loadScript('https://cdn.jsdelivr.net/npm/fflate@0.8.0/umd/index.min.js');
            console.log('✅ fflateライブラリ読み込み完了');
        } catch (e) {
            console.warn('⚠️ fflate読み込み失敗、ブラウザAPIを使用します');
        }
    }
    
    createUI() {
        const panel = document.createElement('div');
        panel.id = 'hy-motion-panel';
        panel.innerHTML = `
            <style>
                #hy-motion-panel {
                    position: fixed;
                    top: 50%;
                    right: 10px;
                    transform: translateY(-50%);
                    background: rgba(30, 30, 50, 0.95);
                    padding: 15px;
                    border-radius: 12px;
                    color: #fff;
                    font-family: -apple-system, BlinkMacSystemFont, sans-serif;
                    font-size: 13px;
                    z-index: 1000;
                    min-width: 280px;
                    box-shadow: 0 4px 20px rgba(0,0,0,0.3);
                }
                #hy-motion-panel h3 {
                    margin: 0 0 12px 0;
                    color: #4ecdc4;
                    font-size: 14px;
                    border-bottom: 1px solid #4ecdc4;
                    padding-bottom: 8px;
                }
                #hy-motion-panel .status {
                    background: rgba(78,205,196,0.1);
                    padding: 8px 10px;
                    border-radius: 6px;
                    margin-bottom: 10px;
                    color: #4ecdc4;
                    word-break: break-all;
                    font-size: 12px;
                }
                #hy-motion-panel .status.empty {
                    color: #666;
                    background: rgba(255,255,255,0.05);
                }
                #hy-motion-panel .drop-area {
                    border: 2px dashed #4ecdc4;
                    border-radius: 8px;
                    padding: 15px;
                    text-align: center;
                    cursor: pointer;
                    margin-bottom: 10px;
                    transition: all 0.2s;
                }
                #hy-motion-panel .drop-area:hover {
                    background: rgba(78,205,196,0.1);
                }
                #hy-motion-panel .drop-area.dragover {
                    background: rgba(78,205,196,0.2);
                    border-color: #fff;
                }
                #hy-motion-panel .controls {
                    display: flex;
                    gap: 8px;
                    margin-top: 10px;
                }
                #hy-motion-panel button {
                    flex: 1;
                    padding: 8px;
                    border: none;
                    border-radius: 6px;
                    cursor: pointer;
                    background: #4ecdc4;
                    color: #1a1a2e;
                    font-weight: bold;
                    transition: all 0.2s;
                }
                #hy-motion-panel button:hover {
                    background: #45b7aa;
                }
                #hy-motion-panel button:disabled {
                    background: #333;
                    color: #666;
                    cursor: not-allowed;
                }
                #hy-motion-panel .info {
                    text-align: center;
                    margin-top: 8px;
                    color: #888;
                    font-size: 11px;
                }
                #hy-motion-panel .speed-control {
                    margin-top: 10px;
                }
                #hy-motion-panel .speed-control label {
                    display: block;
                    margin-bottom: 5px;
                    color: #888;
                }
                #hy-motion-panel .speed-control input {
                    width: 100%;
                }
                #hy-motion-panel .toggle-btn {
                    position: absolute;
                    top: -30px;
                    left: 0;
                    background: #4ecdc4;
                    border: none;
                    padding: 5px 10px;
                    border-radius: 6px 6px 0 0;
                    cursor: pointer;
                    font-size: 12px;
                    color: #1a1a2e;
                    font-weight: bold;
                }
                #hy-motion-panel.collapsed .panel-content {
                    display: none;
                }
                #hy-motion-panel .download-btn {
                    margin-top: 8px;
                    background: #6c5ce7;
                    font-size: 11px;
                    padding: 6px;
                }
                #hy-motion-panel .download-btn:hover {
                    background: #5b4cdb;
                }
            </style>
            <button class="toggle-btn" id="hy-motion-toggle">🎬 HY-Motion</button>
            <div class="panel-content">
                <h3>🎬 HY-Motion v3.2</h3>
                <div class="status empty" id="hy-motion-status">モーション未読み込み</div>
                <div class="drop-area" id="hy-motion-drop">
                    📁 NPZ / VRMAファイルをドロップ<br>
                    <small style="color:#666">またはクリックして選択</small>
                    <input type="file" id="hy-motion-file" accept=".npz,.vrma,.glb" style="display:none">
                </div>
                <div class="controls">
                    <button id="hy-motion-play" disabled>▶ Play</button>
                    <button id="hy-motion-stop" disabled>⏹ Stop</button>
                </div>
                <button class="download-btn" id="hy-motion-download" disabled style="width:100%">💾 VRMAをダウンロード</button>
                <div class="info" id="hy-motion-info"></div>
                <div class="speed-control">
                    <label>速度: <span id="hy-motion-speed-val">1.0</span>x</label>
                    <input type="range" id="hy-motion-speed" min="0.1" max="2" step="0.1" value="1">
                </div>
            </div>
        `;
        document.body.appendChild(panel);
    }
    
    setupEventListeners() {
        const dropArea = document.getElementById('hy-motion-drop');
        const fileInput = document.getElementById('hy-motion-file');
        
        dropArea.addEventListener('click', () => fileInput.click());
        
        dropArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropArea.classList.add('dragover');
        });
        
        dropArea.addEventListener('dragleave', () => {
            dropArea.classList.remove('dragover');
        });
        
        dropArea.addEventListener('drop', (e) => {
            e.preventDefault();
            dropArea.classList.remove('dragover');
            const file = e.dataTransfer.files[0];
            if (file) this.loadFile(file);
        });
        
        fileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) this.loadFile(file);
        });
        
        document.getElementById('hy-motion-play').addEventListener('click', () => this.togglePlay());
        document.getElementById('hy-motion-stop').addEventListener('click', () => this.stop());
        document.getElementById('hy-motion-download').addEventListener('click', () => this.downloadVRMA());
        
        document.getElementById('hy-motion-speed').addEventListener('input', (e) => {
            this.playbackSpeed = parseFloat(e.target.value);
            document.getElementById('hy-motion-speed-val').textContent = this.playbackSpeed.toFixed(1);
            if (this.currentAction) {
                this.currentAction.setEffectiveTimeScale(this.playbackSpeed);
            }
        });
        
        document.getElementById('hy-motion-toggle').addEventListener('click', () => {
            document.getElementById('hy-motion-panel').classList.toggle('collapsed');
        });
    }
    
    async loadFile(file) {
        const fileName = file.name.toLowerCase();
        
        document.getElementById('hy-motion-status').textContent = '読み込み中...';
        document.getElementById('hy-motion-status').classList.remove('empty');
        
        try {
            if (fileName.endsWith('.npz')) {
                await this.loadNPZ(file);
            } else if (fileName.endsWith('.vrma') || fileName.endsWith('.glb')) {
                await this.loadVRMA(file);
            } else {
                throw new Error('未対応のファイル形式です');
            }
        } catch (err) {
            console.error('Motion load error:', err);
            document.getElementById('hy-motion-status').textContent = 'エラー: ' + err.message;
            document.getElementById('hy-motion-status').classList.add('empty');
            alert('モーションファイルの読み込みに失敗しました: ' + err.message);
        }
    }
    
    // ===========================================
    // NPZ読み込み → VRMA変換
    // ===========================================
    async loadNPZ(file) {
        console.log('📦 Loading NPZ:', file.name);
        
        const arrayBuffer = await file.arrayBuffer();
        
        // ZIP解凍（fflateまたはブラウザ内蔵APIを使用）
        let unzipped;
        
        // まずfflateを試す
        if (typeof fflate === 'undefined' || typeof fflate.unzipSync === 'undefined') {
            console.log('📦 Loading fflate library...');
            try {
                await this.loadScript('https://cdn.jsdelivr.net/npm/fflate@0.8.0/umd/index.min.js');
                await new Promise(resolve => setTimeout(resolve, 200));
            } catch (e) {
                console.warn('fflate読み込み失敗:', e);
            }
        }
        
        if (typeof fflate !== 'undefined' && typeof fflate.unzipSync === 'function') {
            console.log('📦 Using fflate for unzip');
            try {
                const uint8 = new Uint8Array(arrayBuffer);
                unzipped = fflate.unzipSync(uint8);
            } catch (err) {
                console.error('fflate unzip error:', err);
                console.log('📦 Falling back to browser API...');
                unzipped = await this.unzipNPZBrowser(arrayBuffer);
            }
        } else {
            console.log('📦 Using browser API for unzip');
            unzipped = await this.unzipNPZBrowser(arrayBuffer);
        }
        
        // NPZデータをパース
        const npzData = {};
        for (const [filename, data] of Object.entries(unzipped)) {
            if (filename.endsWith('.npy')) {
                const name = filename.replace('.npy', '');
                npzData[name] = this.parseNPY(data);
            }
        }
        
        console.log('📦 NPZ keys:', Object.keys(npzData));
        
        // rot6dがあるか確認
        if (!npzData.rot6d) {
            throw new Error('rot6dデータがNPZに含まれていません');
        }
        
        // VRMAデータを生成
        const vrmaBlob = this.createVRMAFromNPZ(npzData, file.name);
        this.lastVRMABlob = vrmaBlob;
        
        // VRMAを読み込み
        await this.loadVRMAFromBlob(vrmaBlob, npzData.text || file.name);
        
        // ダウンロードボタンを有効化
        document.getElementById('hy-motion-download').disabled = false;
    }
    
    // ===========================================
    // ブラウザ内蔵APIでZIP解凍（フォールバック）
    // ===========================================
    async unzipNPZBrowser(arrayBuffer) {
        const view = new DataView(arrayBuffer);
        const files = {};
        let offset = 0;
        
        while (offset < arrayBuffer.byteLength - 4) {
            const signature = view.getUint32(offset, true);
            
            if (signature === 0x04034b50) {
                // Local file header
                const compressionMethod = view.getUint16(offset + 8, true);
                const compressedSize = view.getUint32(offset + 18, true);
                const uncompressedSize = view.getUint32(offset + 22, true);
                const fileNameLength = view.getUint16(offset + 26, true);
                const extraFieldLength = view.getUint16(offset + 28, true);
                
                const fileName = new TextDecoder().decode(
                    new Uint8Array(arrayBuffer, offset + 30, fileNameLength)
                );
                
                const dataStart = offset + 30 + fileNameLength + extraFieldLength;
                const compressedData = new Uint8Array(arrayBuffer, dataStart, compressedSize);
                
                let fileData;
                if (compressionMethod === 0) {
                    // 非圧縮
                    fileData = compressedData;
                } else if (compressionMethod === 8) {
                    // Deflate
                    fileData = await this.inflateData(compressedData);
                } else {
                    console.warn('Unsupported compression method:', compressionMethod);
                    fileData = compressedData;
                }
                
                files[fileName] = fileData;
                offset = dataStart + compressedSize;
            } else if (signature === 0x02014b50) {
                // Central directory header - 終了
                break;
            } else {
                offset++;
            }
        }
        
        return files;
    }
    
    async inflateData(compressedData) {
        try {
            const ds = new DecompressionStream('deflate-raw');
            const writer = ds.writable.getWriter();
            writer.write(compressedData);
            writer.close();
            
            const reader = ds.readable.getReader();
            const chunks = [];
            
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                chunks.push(value);
            }
            
            const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
            const result = new Uint8Array(totalLength);
            let resultOffset = 0;
            for (const chunk of chunks) {
                result.set(chunk, resultOffset);
                resultOffset += chunk.length;
            }
            
            return result;
        } catch (err) {
            console.error('Deflate error:', err);
            throw new Error('ZIP解凍に失敗しました');
        }
    }
    
    // ===========================================
    // VRMA読み込み（ファイルから）
    // ===========================================
    async loadVRMA(file) {
        console.log('🎬 Loading VRMA:', file.name);
        
        const blob = new Blob([await file.arrayBuffer()], { type: 'model/gltf-binary' });
        await this.loadVRMAFromBlob(blob, file.name);
        
        // 直接読み込んだVRMAはダウンロード不可
        document.getElementById('hy-motion-download').disabled = true;
    }
    
    // ===========================================
    // VRMAをBlobから読み込んで再生準備
    // ===========================================
    async loadVRMAFromBlob(blob, name) {
        const vrm = this.app.vrm;
        if (!vrm) {
            throw new Error('VRMモデルを先に読み込んでください');
        }
        
        const url = URL.createObjectURL(blob);
        
        try {
            // GLTFLoaderでVRMAを読み込み
            const loader = new GLTFLoader();
            loader.register((parser) => new VRMAnimationLoaderPlugin(parser));
            
            const gltf = await loader.loadAsync(url);
            
            console.log('📦 GLTF loaded:', gltf);
            console.log('📦 userData:', gltf.userData);
            
            // VRMAnimationを取得
            const vrmAnimation = gltf.userData.vrmAnimations?.[0];
            if (!vrmAnimation) {
                throw new Error('VRMAにアニメーションデータがありません');
            }
            
            this.currentVrmAnimation = vrmAnimation;
            
            // AnimationClipを作成
            const clip = createVRMAnimationClip(vrmAnimation, vrm);
            
            console.log('🎬 AnimationClip created:', clip.name, 'Duration:', clip.duration, 'Tracks:', clip.tracks.length);
            
            // Mixerを作成
            if (this.currentMixer) {
                this.currentMixer.stopAllAction();
            }
            this.currentMixer = new THREE.AnimationMixer(vrm.scene);
            
            // Actionを作成
            this.currentAction = this.currentMixer.clipAction(clip);
            this.currentAction.setEffectiveTimeScale(this.playbackSpeed);
            
            // UI更新
            document.getElementById('hy-motion-status').textContent = `✅ ${name}`;
            document.getElementById('hy-motion-status').classList.remove('empty');
            document.getElementById('hy-motion-info').textContent = 
                `Duration: ${clip.duration.toFixed(2)}s / Tracks: ${clip.tracks.length}`;
            
            document.getElementById('hy-motion-play').disabled = false;
            document.getElementById('hy-motion-stop').disabled = false;
            
            console.log('✅ VRMA loaded:', name, 'Duration:', clip.duration);
            
            // 🎬 自動再生: モーション読み込み完了後に自動的にPlayを開始
            this.autoPlay();
            
        } finally {
            URL.revokeObjectURL(url);
        }
    }
    
    // ===========================================
    // NPZからVRMA(GLB)を生成
    // ===========================================
    createVRMAFromNPZ(npzData, fileName) {
        let rot6d = npzData.rot6d;
        let transl = npzData.transl;
        let text = npzData.text || fileName;
        let duration = npzData.duration;
        
        // バッチ次元を除去
        if (rot6d && rot6d.length === 1 && Array.isArray(rot6d[0]) && Array.isArray(rot6d[0][0])) {
            rot6d = rot6d[0];
        }
        if (transl && transl.length === 1 && Array.isArray(transl[0])) {
            transl = transl[0];
        }
        
        const numFrames = rot6d.length;
        const numJoints = rot6d[0].length;
        
        // Duration計算
        let durationValue = 5.0;
        if (duration) {
            durationValue = Array.isArray(duration) ? duration[0] : duration;
        }
        const fps = numFrames / durationValue;
        
        console.log(`🔄 Converting NPZ to VRMA: ${numFrames} frames, ${numJoints} joints, ${fps.toFixed(1)} fps`);
        
        // タイムスタンプ生成
        const timestamps = new Float32Array(numFrames);
        for (let i = 0; i < numFrames; i++) {
            timestamps[i] = (i / numFrames) * durationValue;
        }
        
        // 各ボーンのクォータニオンを計算
        const boneQuaternions = {};
        
        for (let jointIdx = 0; jointIdx < Math.min(numJoints, 22); jointIdx++) {
            const boneName = this.SMPL_TO_VRM[jointIdx];
            if (!boneName) continue;
            
            const quaternions = new Float32Array(numFrames * 4);
            
            for (let frame = 0; frame < numFrames; frame++) {
                const r6d = rot6d[frame][jointIdx];
                const q = this.rot6dToQuaternion(r6d);
                const qVRM = this.convertSMPLToVRMQuaternion(q);
                
                quaternions[frame * 4 + 0] = qVRM[0];
                quaternions[frame * 4 + 1] = qVRM[1];
                quaternions[frame * 4 + 2] = qVRM[2];
                quaternions[frame * 4 + 3] = qVRM[3];
            }
            
            boneQuaternions[boneName] = quaternions;
        }
        
        // ルート位置
        let rootTranslations = null;
        if (transl && transl.length === numFrames) {
            rootTranslations = new Float32Array(numFrames * 3);
            for (let frame = 0; frame < numFrames; frame++) {
                // SMPL→VRM座標変換: x, y+1.0, -z
                rootTranslations[frame * 3 + 0] = transl[frame][0];
                rootTranslations[frame * 3 + 1] = transl[frame][1] + 1.0;
                rootTranslations[frame * 3 + 2] = -transl[frame][2];
            }
        }
        
        // GLB生成
        return this.buildGLB(timestamps, boneQuaternions, rootTranslations, text, durationValue);
    }
    
    // ===========================================
    // GLB(VRMA)バイナリを構築
    // ===========================================
    buildGLB(timestamps, boneQuaternions, rootTranslations, text, duration) {
        const bufferData = [];
        let byteOffset = 0;
        const accessors = [];
        const bufferViews = [];
        
        // タイムスタンプ
        const timeBytes = new Uint8Array(timestamps.buffer);
        bufferData.push(timeBytes);
        
        bufferViews.push({
            buffer: 0,
            byteOffset: byteOffset,
            byteLength: timeBytes.byteLength
        });
        
        accessors.push({
            bufferView: bufferViews.length - 1,
            componentType: 5126, // FLOAT
            count: timestamps.length,
            type: 'SCALAR',
            min: [timestamps[0]],
            max: [timestamps[timestamps.length - 1]]
        });
        const timeAccessorIdx = accessors.length - 1;
        
        byteOffset += timeBytes.byteLength;
        // 4バイトアライメント
        const timePadding = (4 - (byteOffset % 4)) % 4;
        if (timePadding > 0) {
            bufferData.push(new Uint8Array(timePadding));
            byteOffset += timePadding;
        }
        
        // 各ボーンのクォータニオン
        const channels = [];
        const samplers = [];
        const nodes = [];
        const humanBones = {};
        
        let nodeIdx = 0;
        for (const [boneName, quaternions] of Object.entries(boneQuaternions)) {
            const quatBytes = new Uint8Array(quaternions.buffer);
            bufferData.push(quatBytes);
            
            bufferViews.push({
                buffer: 0,
                byteOffset: byteOffset,
                byteLength: quatBytes.byteLength
            });
            
            accessors.push({
                bufferView: bufferViews.length - 1,
                componentType: 5126,
                count: quaternions.length / 4,
                type: 'VEC4'
            });
            const quatAccessorIdx = accessors.length - 1;
            
            byteOffset += quatBytes.byteLength;
            const padding = (4 - (byteOffset % 4)) % 4;
            if (padding > 0) {
                bufferData.push(new Uint8Array(padding));
                byteOffset += padding;
            }
            
            // Sampler
            samplers.push({
                input: timeAccessorIdx,
                output: quatAccessorIdx,
                interpolation: 'LINEAR'
            });
            
            // Channel
            channels.push({
                sampler: samplers.length - 1,
                target: {
                    node: nodeIdx,
                    path: 'rotation'
                }
            });
            
            // Node
            nodes.push({ name: boneName });
            humanBones[boneName] = { node: nodeIdx };
            nodeIdx++;
        }
        
        // ルート位置（hipsの移動）
        if (rootTranslations) {
            const transBytes = new Uint8Array(rootTranslations.buffer);
            bufferData.push(transBytes);
            
            bufferViews.push({
                buffer: 0,
                byteOffset: byteOffset,
                byteLength: transBytes.byteLength
            });
            
            accessors.push({
                bufferView: bufferViews.length - 1,
                componentType: 5126,
                count: rootTranslations.length / 3,
                type: 'VEC3'
            });
            const transAccessorIdx = accessors.length - 1;
            
            byteOffset += transBytes.byteLength;
            
            // hipsノードのインデックスを探す
            const hipsNodeIdx = nodes.findIndex(n => n.name === 'hips');
            if (hipsNodeIdx >= 0) {
                samplers.push({
                    input: timeAccessorIdx,
                    output: transAccessorIdx,
                    interpolation: 'LINEAR'
                });
                
                channels.push({
                    sampler: samplers.length - 1,
                    target: {
                        node: hipsNodeIdx,
                        path: 'translation'
                    }
                });
            }
        }
        
        // 全バッファを結合
        const totalLength = bufferData.reduce((sum, arr) => sum + arr.byteLength, 0);
        const buffer = new Uint8Array(totalLength);
        let offset = 0;
        for (const arr of bufferData) {
            buffer.set(arr, offset);
            offset += arr.byteLength;
        }
        
        // glTF JSON
        const gltf = {
            asset: {
                version: '2.0',
                generator: 'HY-Motion Integration v3.0'
            },
            extensionsUsed: ['VRMC_vrm_animation'],
            extensions: {
                VRMC_vrm_animation: {
                    specVersion: '1.0',
                    humanoid: {
                        humanBones: humanBones
                    }
                }
            },
            buffers: [{
                byteLength: buffer.byteLength
            }],
            bufferViews: bufferViews,
            accessors: accessors,
            animations: [{
                name: text,
                channels: channels,
                samplers: samplers
            }],
            nodes: nodes,
            scenes: [{ nodes: nodes.map((_, i) => i) }],
            scene: 0
        };
        
        // GLB構築
        const gltfJson = JSON.stringify(gltf);
        let gltfBytes = new TextEncoder().encode(gltfJson);
        
        // JSONチャンクは4バイトアライメント
        const jsonPadding = (4 - (gltfBytes.byteLength % 4)) % 4;
        if (jsonPadding > 0) {
            const padded = new Uint8Array(gltfBytes.byteLength + jsonPadding);
            padded.set(gltfBytes);
            for (let i = 0; i < jsonPadding; i++) {
                padded[gltfBytes.byteLength + i] = 0x20; // スペース
            }
            gltfBytes = padded;
        }
        
        // バイナリチャンクも4バイトアライメント
        const binPadding = (4 - (buffer.byteLength % 4)) % 4;
        let binBuffer = buffer;
        if (binPadding > 0) {
            const padded = new Uint8Array(buffer.byteLength + binPadding);
            padded.set(buffer);
            binBuffer = padded;
        }
        
        // GLBヘッダー
        const glbLength = 12 + 8 + gltfBytes.byteLength + 8 + binBuffer.byteLength;
        const glb = new ArrayBuffer(glbLength);
        const view = new DataView(glb);
        
        // ヘッダー
        view.setUint32(0, 0x46546C67, true);  // 'glTF'
        view.setUint32(4, 2, true);            // version
        view.setUint32(8, glbLength, true);    // length
        
        // JSONチャンク
        view.setUint32(12, gltfBytes.byteLength, true);
        view.setUint32(16, 0x4E4F534A, true);  // 'JSON'
        new Uint8Array(glb, 20, gltfBytes.byteLength).set(gltfBytes);
        
        // バイナリチャンク
        const binChunkOffset = 20 + gltfBytes.byteLength;
        view.setUint32(binChunkOffset, binBuffer.byteLength, true);
        view.setUint32(binChunkOffset + 4, 0x004E4942, true);  // 'BIN\0'
        new Uint8Array(glb, binChunkOffset + 8, binBuffer.byteLength).set(binBuffer);
        
        return new Blob([glb], { type: 'model/gltf-binary' });
    }
    
    // ===========================================
    // rot6d → Quaternion変換
    // ===========================================
    rot6dToQuaternion(rot6d) {
        const a1 = [rot6d[0], rot6d[1], rot6d[2]];
        const a2 = [rot6d[3], rot6d[4], rot6d[5]];
        
        // Gram-Schmidt正規化
        const b1 = this.normalize(a1);
        const dot = this.dot(b1, a2);
        const b2_raw = [a2[0] - dot * b1[0], a2[1] - dot * b1[1], a2[2] - dot * b1[2]];
        const b2 = this.normalize(b2_raw);
        const b3 = this.cross(b1, b2);
        
        // 回転行列
        const R = [
            [b1[0], b2[0], b3[0]],
            [b1[1], b2[1], b3[1]],
            [b1[2], b2[2], b3[2]]
        ];
        
        return this.rotationMatrixToQuaternion(R);
    }
    
    normalize(v) {
        const len = Math.sqrt(v[0]*v[0] + v[1]*v[1] + v[2]*v[2]) + 1e-8;
        return [v[0]/len, v[1]/len, v[2]/len];
    }
    
    dot(a, b) {
        return a[0]*b[0] + a[1]*b[1] + a[2]*b[2];
    }
    
    cross(a, b) {
        return [
            a[1]*b[2] - a[2]*b[1],
            a[2]*b[0] - a[0]*b[2],
            a[0]*b[1] - a[1]*b[0]
        ];
    }
    
    rotationMatrixToQuaternion(R) {
        const trace = R[0][0] + R[1][1] + R[2][2];
        let x, y, z, w;
        
        if (trace > 0) {
            const s = 0.5 / Math.sqrt(trace + 1.0);
            w = 0.25 / s;
            x = (R[2][1] - R[1][2]) * s;
            y = (R[0][2] - R[2][0]) * s;
            z = (R[1][0] - R[0][1]) * s;
        } else if (R[0][0] > R[1][1] && R[0][0] > R[2][2]) {
            const s = 2.0 * Math.sqrt(1.0 + R[0][0] - R[1][1] - R[2][2]);
            w = (R[2][1] - R[1][2]) / s;
            x = 0.25 * s;
            y = (R[0][1] + R[1][0]) / s;
            z = (R[0][2] + R[2][0]) / s;
        } else if (R[1][1] > R[2][2]) {
            const s = 2.0 * Math.sqrt(1.0 + R[1][1] - R[0][0] - R[2][2]);
            w = (R[0][2] - R[2][0]) / s;
            x = (R[0][1] + R[1][0]) / s;
            y = 0.25 * s;
            z = (R[1][2] + R[2][1]) / s;
        } else {
            const s = 2.0 * Math.sqrt(1.0 + R[2][2] - R[0][0] - R[1][1]);
            w = (R[1][0] - R[0][1]) / s;
            x = (R[0][2] + R[2][0]) / s;
            y = (R[1][2] + R[2][1]) / s;
            z = 0.25 * s;
        }
        
        const len = Math.sqrt(x*x + y*y + z*z + w*w) + 1e-8;
        return [x/len, y/len, z/len, w/len];
    }
    
    convertSMPLToVRMQuaternion(q) {
        // SMPL座標系からVRM座標系への変換
        // X軸とZ軸を反転
        return [-q[0], q[1], -q[2], q[3]];
    }
    
    // ===========================================
    // NPYパーサー
    // ===========================================
    parseNPY(data) {
        const magic = String.fromCharCode(...data.slice(0, 6));
        if (magic !== '\x93NUMPY') {
            throw new Error('Invalid NPY format');
        }
        
        const version = [data[6], data[7]];
        let headerLen, headerOffset;
        
        if (version[0] === 1) {
            headerLen = data[8] | (data[9] << 8);
            headerOffset = 10;
        } else {
            headerLen = data[8] | (data[9] << 8) | (data[10] << 16) | (data[11] << 24);
            headerOffset = 12;
        }
        
        const headerStr = String.fromCharCode(...data.slice(headerOffset, headerOffset + headerLen));
        const header = this.parseNPYHeader(headerStr);
        
        const dataOffset = headerOffset + headerLen;
        const dataBytes = data.slice(dataOffset);
        
        return this.readNPYData(dataBytes, header);
    }
    
    parseNPYHeader(headerStr) {
        const result = {};
        
        const descrMatch = headerStr.match(/'descr':\s*'([^']+)'/);
        if (descrMatch) result.descr = descrMatch[1];
        
        result.fortran_order = headerStr.includes("'fortran_order': True");
        
        const shapeMatch = headerStr.match(/'shape':\s*\(([^)]+)\)/);
        if (shapeMatch) {
            result.shape = shapeMatch[1].split(',')
                .map(s => s.trim())
                .filter(s => s.length > 0)
                .map(s => parseInt(s));
        }
        
        return result;
    }
    
    readNPYData(bytes, header) {
        const dtype = header.descr;
        const shape = header.shape;
        
        let typedArray;
        
        // バッファアライメント問題を回避するため、新しいArrayBufferにコピー
        const alignedBuffer = new ArrayBuffer(bytes.byteLength);
        new Uint8Array(alignedBuffer).set(bytes);
        
        if (dtype.includes('f4') || dtype === '<f4' || dtype === '>f4') {
            typedArray = new Float32Array(alignedBuffer);
        } else if (dtype.includes('f8') || dtype === '<f8' || dtype === '>f8') {
            typedArray = new Float64Array(alignedBuffer);
        } else if (dtype.includes('U') || dtype.includes('S')) {
            const decoder = new TextDecoder('utf-8');
            return decoder.decode(bytes).replace(/\x00/g, '').trim();
        } else {
            typedArray = new Float32Array(alignedBuffer);
        }
        
        if (shape && shape.length > 1) {
            return this.reshapeArray(Array.from(typedArray), shape);
        }
        
        return Array.from(typedArray);
    }
    
    reshapeArray(flat, shape) {
        if (shape.length === 1) return flat;
        
        if (shape.length === 2) {
            const [rows, cols] = shape;
            const result = [];
            for (let i = 0; i < rows; i++) {
                result.push(flat.slice(i * cols, (i + 1) * cols));
            }
            return result;
        }
        
        if (shape.length === 3) {
            const [dim0, dim1, dim2] = shape;
            const result = [];
            for (let i = 0; i < dim0; i++) {
                const plane = [];
                for (let j = 0; j < dim1; j++) {
                    const start = (i * dim1 + j) * dim2;
                    plane.push(flat.slice(start, start + dim2));
                }
                result.push(plane);
            }
            return result;
        }
        
        if (shape.length === 4) {
            const [dim0, dim1, dim2, dim3] = shape;
            const result = [];
            for (let i = 0; i < dim0; i++) {
                const cube = [];
                for (let j = 0; j < dim1; j++) {
                    const plane = [];
                    for (let k = 0; k < dim2; k++) {
                        const start = ((i * dim1 + j) * dim2 + k) * dim3;
                        plane.push(flat.slice(start, start + dim3));
                    }
                    cube.push(plane);
                }
                result.push(cube);
            }
            return result;
        }
        
        return flat;
    }
    
    // ===========================================
    // ユーティリティ
    // ===========================================
    loadScript(src) {
        return new Promise((resolve, reject) => {
            if (document.querySelector(`script[src="${src}"]`)) {
                resolve();
                return;
            }
            const script = document.createElement('script');
            script.src = src;
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }
    
    // ===========================================
    // 再生制御
    // ===========================================
    
    /**
     * 自動再生 - モーション読み込み後に自動的に再生を開始
     */
    autoPlay() {
        if (!this.currentAction) {
            console.warn('🎬 AutoPlay: currentAction が存在しません');
            return;
        }
        
        console.log('🎬 AutoPlay: モーション自動再生開始 (isPlaying:', this.isPlaying, ')');
        
        // 強制的に状態をリセットしてから再生
        this.isPlaying = false;
        this.currentAction.stop();
        this.currentAction.reset();
        this.currentAction.paused = false;
        this.currentAction.setEffectiveTimeScale(this.playbackSpeed);
        this.currentAction.setEffectiveWeight(1.0);
        this.currentAction.play();
        this.isPlaying = true;
        
        const playBtn = document.getElementById('hy-motion-play');
        if (playBtn) {
            playBtn.textContent = '⏸ Pause';
        }
        
        console.log('🎬 AutoPlay: 再生開始完了');
    }
    
    togglePlay() {
        if (!this.currentAction) return;
        
        if (this.isPlaying) {
            this.currentAction.paused = true;
            this.isPlaying = false;
            document.getElementById('hy-motion-play').textContent = '▶ Play';
        } else {
            this.currentAction.paused = false;
            this.currentAction.play();
            this.isPlaying = true;
            document.getElementById('hy-motion-play').textContent = '⏸ Pause';
        }
    }
    
    stop() {
        if (this.currentAction) {
            this.currentAction.stop();
            this.currentAction.reset();
        }
        this.isPlaying = false;
        document.getElementById('hy-motion-play').textContent = '▶ Play';
    }
    
    downloadVRMA() {
        if (!this.lastVRMABlob) {
            alert('VRMAデータがありません');
            return;
        }
        
        const url = URL.createObjectURL(this.lastVRMABlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'motion.vrma';
        a.click();
        URL.revokeObjectURL(url);
    }
    
    startAnimationLoop() {
        const update = () => {
            requestAnimationFrame(update);
            
            const delta = this.clock.getDelta();
            
            if (this.currentMixer && this.isPlaying) {
                this.currentMixer.update(delta);
            }
            
            // VRMのupdate
            if (this.app && this.app.vrm) {
                this.app.vrm.update(delta);
            }
        };
        update();
    }
}

// アプリが読み込まれたら初期化
function initHYMotion() {
    if (window.app) {
        window.hyMotion = new HYMotionIntegration(window.app);
    } else {
        const checkApp = setInterval(() => {
            if (window.app) {
                window.hyMotion = new HYMotionIntegration(window.app);
                clearInterval(checkApp);
            }
        }, 100);
    }
}

// DOMContentLoadedの後に初期化
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => setTimeout(initHYMotion, 500));
} else {
    setTimeout(initHYMotion, 500);
}

export { HYMotionIntegration };
