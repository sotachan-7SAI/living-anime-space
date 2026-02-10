import * as THREE from 'three';

// THREEをグローバルに公開（custom.js等からアクセス可能に）
window.THREE = THREE;
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { TransformControls } from 'three/addons/controls/TransformControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';
import { BVHLoader } from 'three/addons/loaders/BVHLoader.js';

// Loaderをグローバルに公開
window.GLTFLoaderClass = GLTFLoader;
window.FBXLoaderClass = FBXLoader;
window.BVHLoaderClass = BVHLoader;
window.TransformControlsClass = TransformControls;

import { VRMUtils, VRMLoaderPlugin } from '@pixiv/three-vrm';
import { VRMAnimationLoaderPlugin, createVRMAnimationClip } from '@pixiv/three-vrm-animation';

// VRM Animation関連をグローバルに公開（hy-motion-integration.js等で使用）
window.VRMAnimationLoaderPlugin = VRMAnimationLoaderPlugin;
window.createVRMAnimationClip = createVRMAnimationClip;
import { RealtimeAPIClient } from './realtime-client.js';
import { ChatGPTClient } from './chatgpt-client.js';
import { GeminiClient } from './gemini-client.js';
import { GrokRealtimeClient } from './grok-realtime-client.js';

class VRMAIViewer {
    constructor() {
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.controls = null;
        this.vrm = null;
        this.fbxModel = null;  // FBXモデル用
        this.fbxMixer = null;  // FBXアニメーション用
        this.mixer = null;
        this.currentAction = null;
        this.clock = new THREE.Clock();
        this.motions = {};
        this.lipSyncValue = 0;
        this.lipSyncTarget = 0;
        this.lipSyncInterval = null;
        
        // Realtime API
        this.realtimeClient = null;
        this.isVoiceMode = false;
        this.OPENAI_API_KEY = null; // ユーザーが入力
        
        // ChatGPT API
        this.chatGPTClient = null;
        this.useChatGPT = false; // ChatGPTを使用するか
        
        // Gemini API（一体化）
        this.geminiClient = null;
        this.useGemini = false; // Geminiを使用するか
        this.GEMINI_API_KEY = null;
        
        // Grok Voice Agent API
        this.grokRealtimeClient = null;
        this.isGrokVoiceMode = false;
        this.GROK_API_KEY = null;
        this.grokVoice = 'Ara'; // デフォルト: Ara, Rex, Sal, Eve, Leo
        
        // 声質設定
        this.selectedVoice = 'browser-female-1'; // デフォルトはブラウザTTS
        this.browserVoices = []; // 利用可能なブラウザ音声リスト
        
        this.init();
    }
    
    // v2.4: メインVRMスキップ設定を確認
    checkShouldSkipMainVRM() {
        try {
            const saved = localStorage.getItem('vrm_viewer_startup_settings');
            if (saved) {
                const settings = JSON.parse(saved);
                return settings.skipMainVRMLoad === true;
            }
        } catch (e) {
            console.warn('初期設定の読み込みエラー:', e);
        }
        return false; // デフォルトは読み込む
    }
    
    async init() {
        this.setupScene();
        this.setupLights();
        this.setupDragDrop();
        
        // デフォルトモデルを読み込み
        // v2.4: 初期設定でスキップできるように
        const shouldSkip = this.checkShouldSkipMainVRM();
        if (!shouldSkip) {
            try {
                await this.loadDefaultModel();
            } catch (error) {
                console.log('デフォルトモデルなし、ドラッグ&ドロップで読み込んでください');
            }
        } else {
            console.log('🚧 メインVRMの読み込みをスキップしました（初期設定）');
        }
        
        // モーションを読み込み
        await this.loadMotions();
        
        // ブラウザ音声を読み込み
        this.loadBrowserVoices();
        
        this.hideLoading();
        this.setupModelUpload();
        this.animate();
    }
    
    setupScene() {
        const container = document.getElementById('canvas-container');
        
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0xf0f0f0);
        
        this.camera = new THREE.PerspectiveCamera(
            35,
            window.innerWidth / window.innerHeight,
            0.1,
            10000
        );
        this.camera.position.set(0, 1.65, 3);
        
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        container.appendChild(this.renderer.domElement);
        
        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.target.set(0, 1.0, 0);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        this.controls.update();
        
        const gridHelper = new THREE.GridHelper(10, 10, 0x888888, 0xcccccc);
        gridHelper.name = 'groundGrid'; // ★ 名前を付けて参照できるように
        this.gridHelper = gridHelper; // ★ インスタンスに保存
        this.scene.add(gridHelper);
        
        window.addEventListener('resize', () => this.onWindowResize());
    }
    
    setupLights() {
        const ambient = new THREE.AmbientLight(0xffffff, 0.6);
        this.scene.add(ambient);
        
        const directional = new THREE.DirectionalLight(0xffffff, 1);
        directional.position.set(5, 10, 7.5);
        this.scene.add(directional);
        
        const fill = new THREE.DirectionalLight(0xffffff, 0.3);
        fill.position.set(-5, 5, -5);
        this.scene.add(fill);
    }
    
    setupDragDrop() {
        const overlay = document.getElementById('drop-overlay');
        
        document.body.addEventListener('dragover', (e) => {
            e.preventDefault();
            overlay.classList.add('active');
        });
        
        document.body.addEventListener('dragleave', (e) => {
            if (e.target === document.body) {
                overlay.classList.remove('active');
            }
        });
        
        document.body.addEventListener('drop', async (e) => {
            e.preventDefault();
            overlay.classList.remove('active');
            
            const files = e.dataTransfer.files;
            if (files.length > 0) {
                const fileName = files[0].name.toLowerCase();
                if (fileName.endsWith('.vrm')) {
                    await this.loadVRMFromFile(files[0]);
                } else if (fileName.endsWith('.fbx')) {
                    await this.loadFBXFromFile(files[0]);
                } else if (fileName.endsWith('.bvh')) {
                    await this.loadBVHFromFile(files[0]);
                } else if (fileName.endsWith('.npz')) {
                    // NPZはHY-Motionパネルにドロップしてください
                    console.log('📦 NPZファイルはHY-Motionパネルにドロップしてください');
                    // HY-Motionが利用可能なら直接呼び出す
                    if (window.hyMotion && typeof window.hyMotion.loadFile === 'function') {
                        await window.hyMotion.loadFile(files[0]);
                    } else {
                        alert('🎬 NPZファイルは右側のHY-Motionパネルにドロップしてください');
                    }
                }
            }
        });
    }
    
    setupModelUpload() {
        const uploadBtn = document.getElementById('model-upload');
        const fileInput = document.getElementById('model-file-input');
        
        uploadBtn.addEventListener('click', () => {
            fileInput.click();
        });
        
        fileInput.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (file) {
                const fileName = file.name.toLowerCase();
                if (fileName.endsWith('.vrm')) {
                    await this.loadVRMFromFile(file);
                } else if (fileName.endsWith('.fbx')) {
                    await this.loadFBXFromFile(file);
                }
            }
        });
        
        document.querySelectorAll('.model-item').forEach(item => {
            item.addEventListener('click', async () => {
                if (item.dataset.model === 'default') {
                    await this.loadDefaultModel();
                }
                this.updateActiveModel(item);
            });
        });
    }
    
    async loadVRMFromFile(file) {
        const loading = document.getElementById('loading');
        loading.style.display = 'block';
        
        try {
            const url = URL.createObjectURL(file);
            await this.loadVRM(url);
            console.log('✓ VRM loaded from file:', file.name);
            URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Error loading VRM from file:', error);
            alert('VRMファイルの読み込みに失敗しました');
        }
        
        loading.style.display = 'none';
    }
    
    async loadDefaultModel() {
        try {
            await this.loadVRM('./model.vrm');
            console.log('✓ Default model loaded');
        } catch (error) {
            console.warn('デフォルトモデルが見つかりません');
            throw error;
        }
    }
    
    async loadVRM(url) {
        if (this.vrm) {
            this.scene.remove(this.vrm.scene);
            VRMUtils.deepDispose(this.vrm.scene);
            this.vrm = null;
        }
        
        const loader = new GLTFLoader();
        loader.register((parser) => new VRMLoaderPlugin(parser));
        
        const gltf = await loader.loadAsync(url);
        this.vrm = gltf.userData.vrm;
        
        this.scene.add(this.vrm.scene);
        
        // AnimationMixerを初期化
        this.mixer = new THREE.AnimationMixer(this.vrm.scene);
        
        console.log('✓ VRM loaded!', this.vrm);
    }
    
    /**
     * FBXモデルをファイルから読み込み
     */
    async loadFBXFromFile(file) {
        const loading = document.getElementById('loading');
        loading.style.display = 'block';
        
        try {
            const url = URL.createObjectURL(file);
            await this.loadFBX(url, file.name);
            console.log('✓ FBX loaded from file:', file.name);
            URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Error loading FBX from file:', error);
            alert('FBXファイルの読み込みに失敗しました: ' + error.message);
        }
        
        loading.style.display = 'none';
    }
    
    /**
     * FBXモデルを読み込み
     */
    async loadFBX(url, fileName = 'model.fbx') {
        // 既存のVRMを削除
        if (this.vrm) {
            this.scene.remove(this.vrm.scene);
            VRMUtils.deepDispose(this.vrm.scene);
            this.vrm = null;
        }
        
        // 既存のFBXを削除
        if (this.fbxModel) {
            this.scene.remove(this.fbxModel);
            this.fbxModel.traverse((child) => {
                if (child.geometry) child.geometry.dispose();
                if (child.material) {
                    if (Array.isArray(child.material)) {
                        child.material.forEach(m => m.dispose());
                    } else {
                        child.material.dispose();
                    }
                }
            });
            this.fbxModel = null;
        }
        
        if (this.fbxMixer) {
            this.fbxMixer.stopAllAction();
            this.fbxMixer = null;
        }
        
        return new Promise((resolve, reject) => {
            const loader = new FBXLoader();
            
            loader.load(
                url,
                (fbx) => {
                    console.log('📦 FBX読み込み完了:', fileName);
                    
                    this.fbxModel = fbx;
                    
                    // スケール調整（Mixamoはcm単位のことが多い）
                    const box = new THREE.Box3().setFromObject(fbx);
                    const size = box.getSize(new THREE.Vector3());
                    const height = size.y;
                    
                    // 1.6mくらいにスケール
                    const targetHeight = 1.6;
                    const scale = targetHeight / height;
                    fbx.scale.setScalar(scale);
                    
                    // 位置を調整（地面に立たせる）
                    box.setFromObject(fbx);
                    const minY = box.min.y;
                    fbx.position.y = -minY;
                    
                    // マテリアル調整
                    fbx.traverse((child) => {
                        if (child.isMesh) {
                            child.castShadow = true;
                            child.receiveShadow = true;
                            if (child.material) {
                                child.material.side = THREE.DoubleSide;
                            }
                        }
                    });
                    
                    this.scene.add(fbx);
                    
                    // アニメーションがあれば再生
                    if (fbx.animations && fbx.animations.length > 0) {
                        console.log('🎬 FBXアニメーション発見:', fbx.animations.length, '個');
                        
                        this.fbxMixer = new THREE.AnimationMixer(fbx);
                        
                        // 最初のアニメーションをループ再生
                        const action = this.fbxMixer.clipAction(fbx.animations[0]);
                        action.play();
                        
                        console.log('▶️ アニメーション再生中:', fbx.animations[0].name);
                    }
                    
                    console.log('✅ FBXモデル表示完了');
                    resolve(fbx);
                },
                (progress) => {
                    if (progress.total > 0) {
                        const percent = Math.round((progress.loaded / progress.total) * 100);
                        console.log(`📦 FBX読み込み中: ${percent}%`);
                    }
                },
                (error) => {
                    console.error('FBX読み込みエラー:', error);
                    reject(error);
                }
            );
        });
    }
    
    /**
     * FBXアニメーションを外部ファイルから読み込んで適用
     */
    async loadFBXAnimation(file) {
        if (!this.fbxModel) {
            alert('先にFBXモデルを読み込んでください');
            return;
        }
        
        const url = URL.createObjectURL(file);
        const loader = new FBXLoader();
        
        loader.load(url, (animFbx) => {
            URL.revokeObjectURL(url);
            
            if (animFbx.animations && animFbx.animations.length > 0) {
                console.log('🎬 アニメーション読み込み:', file.name);
                
                if (!this.fbxMixer) {
                    this.fbxMixer = new THREE.AnimationMixer(this.fbxModel);
                }
                
                // 既存アニメーションを停止
                this.fbxMixer.stopAllAction();
                
                // 新しいアニメーションを再生
                const action = this.fbxMixer.clipAction(animFbx.animations[0]);
                action.play();
                
                console.log('▶️ アニメーション再生:', animFbx.animations[0].name);
            }
        });
    }
    
    /**
     * BVHモーションをファイルから読み込み
     */
    async loadBVHFromFile(file) {
        console.log('🎬 BVHファイル読み込み:', file.name);
        
        const url = URL.createObjectURL(file);
        
        try {
            await this.loadBVH(url, file.name);
            console.log('✅ BVH読み込み完了');
        } catch (error) {
            console.error('BVH読み込みエラー:', error);
            alert('BVHファイルの読み込みに失敗しました: ' + error.message);
        } finally {
            URL.revokeObjectURL(url);
        }
    }
    
    /**
     * BVHモーションを読み込んでFBXモデルに適用
     */
    async loadBVH(url, fileName = 'motion.bvh') {
        return new Promise((resolve, reject) => {
            const loader = new BVHLoader();
            
            loader.load(
                url,
                (result) => {
                    console.log('📦 BVHパース完了:', fileName);
                    console.log('  - スケルトン:', result.skeleton);
                    console.log('  - アニメーション:', result.clip);
                    
                    // FBXモデルがある場合はそちらに適用
                    if (this.fbxModel) {
                        this.applyBVHToFBX(result);
                        resolve(result);
                    } 
                    // VRMモデルがある場合
                    else if (this.vrm) {
                        this.applyBVHToVRM(result);
                        resolve(result);
                    }
                    // モデルがない場合はBVHスケルトンを表示
                    else {
                        this.showBVHSkeleton(result);
                        resolve(result);
                    }
                },
                (progress) => {
                    if (progress.total > 0) {
                        const percent = Math.round((progress.loaded / progress.total) * 100);
                        console.log(`📦 BVH読み込み中: ${percent}%`);
                    }
                },
                (error) => {
                    console.error('BVH読み込みエラー:', error);
                    reject(error);
                }
            );
        });
    }
    
    /**
     * BVHモーションをFBXモデルに適用
     */
    applyBVHToFBX(bvhResult) {
        console.log('🎯 BVHをFBXに適用中...');
        
        if (!this.fbxMixer) {
            this.fbxMixer = new THREE.AnimationMixer(this.fbxModel);
        }
        
        // 既存アニメーションを停止
        this.fbxMixer.stopAllAction();
        
        // BVHのアニメーションクリップを取得
        const clip = bvhResult.clip;
        
        // ボーン名のマッピング（MoMask/HumanML3D -> Mixamo）
        const boneNameMap = {
            // MoMask/HumanML3Dのボーン名 -> Mixamoのボーン名
            'Hips': 'mixamorigHips',
            'Spine': 'mixamorigSpine',
            'Spine1': 'mixamorigSpine1',
            'Spine2': 'mixamorigSpine2',
            'Neck': 'mixamorigNeck',
            'Head': 'mixamorigHead',
            'LeftShoulder': 'mixamorigLeftShoulder',
            'LeftArm': 'mixamorigLeftArm',
            'LeftForeArm': 'mixamorigLeftForeArm',
            'LeftHand': 'mixamorigLeftHand',
            'RightShoulder': 'mixamorigRightShoulder',
            'RightArm': 'mixamorigRightArm',
            'RightForeArm': 'mixamorigRightForeArm',
            'RightHand': 'mixamorigRightHand',
            'LeftUpLeg': 'mixamorigLeftUpLeg',
            'LeftLeg': 'mixamorigLeftLeg',
            'LeftFoot': 'mixamorigLeftFoot',
            'LeftToeBase': 'mixamorigLeftToeBase',
            'RightUpLeg': 'mixamorigRightUpLeg',
            'RightLeg': 'mixamorigRightLeg',
            'RightFoot': 'mixamorigRightFoot',
            'RightToeBase': 'mixamorigRightToeBase',
        };
        
        // トラック名をリマップ
        const remappedTracks = [];
        for (const track of clip.tracks) {
            // トラック名からボーン名を抽出（例: "Hips.position" -> "Hips"）
            const parts = track.name.split('.');
            const boneName = parts[0];
            const property = parts.slice(1).join('.');
            
            // Mixamoのボーン名に変換
            const mixamoBoneName = boneNameMap[boneName] || boneName;
            
            // 新しいトラックを作成
            const newTrackName = `${mixamoBoneName}.${property}`;
            const newTrack = track.clone();
            newTrack.name = newTrackName;
            remappedTracks.push(newTrack);
            
            console.log(`  🔗 ${track.name} -> ${newTrackName}`);
        }
        
        // 新しいクリップを作成
        const remappedClip = new THREE.AnimationClip(
            clip.name + '_remapped',
            clip.duration,
            remappedTracks
        );
        
        // アニメーションを再生
        const action = this.fbxMixer.clipAction(remappedClip);
        action.play();
        
        console.log('▶️ BVHアニメーション再生中');
    }
    
    /**
     * BVHモーションをVRMモデルに適用
     */
    applyBVHToVRM(bvhResult) {
        console.log('🎯 BVHをVRMに適用中...');
        
        if (!this.mixer) {
            this.mixer = new THREE.AnimationMixer(this.vrm.scene);
        }
        
        // 既存アニメーションを停止
        if (this.currentAction) {
            this.currentAction.stop();
        }
        
        // BVHのアニメーションクリップを取得
        const clip = bvhResult.clip;
        
        // VRMのボーン名マッピング（MoMask -> VRM Humanoid）
        const boneNameMap = {
            'Hips': 'hips',
            'Spine': 'spine',
            'Spine1': 'chest',
            'Spine2': 'upperChest',
            'Neck': 'neck',
            'Head': 'head',
            'LeftShoulder': 'leftShoulder',
            'LeftArm': 'leftUpperArm',
            'LeftForeArm': 'leftLowerArm',
            'LeftHand': 'leftHand',
            'RightShoulder': 'rightShoulder',
            'RightArm': 'rightUpperArm',
            'RightForeArm': 'rightLowerArm',
            'RightHand': 'rightHand',
            'LeftUpLeg': 'leftUpperLeg',
            'LeftLeg': 'leftLowerLeg',
            'LeftFoot': 'leftFoot',
            'LeftToeBase': 'leftToes',
            'RightUpLeg': 'rightUpperLeg',
            'RightLeg': 'rightLowerLeg',
            'RightFoot': 'rightFoot',
            'RightToeBase': 'rightToes',
        };
        
        // VRMのボーンを取得
        const humanoid = this.vrm.humanoid;
        
        // トラック名をリマップ
        const remappedTracks = [];
        for (const track of clip.tracks) {
            const parts = track.name.split('.');
            const boneName = parts[0];
            const property = parts.slice(1).join('.');
            
            // VRMのボーン名に変換
            const vrmBoneName = boneNameMap[boneName];
            if (!vrmBoneName) continue;
            
            // VRMのボーンノードを取得
            const bone = humanoid.getNormalizedBoneNode(vrmBoneName);
            if (!bone) continue;
            
            // 新しいトラックを作成
            const newTrackName = `${bone.name}.${property}`;
            const newTrack = track.clone();
            newTrack.name = newTrackName;
            remappedTracks.push(newTrack);
        }
        
        if (remappedTracks.length === 0) {
            console.warn('⚠️ マッピングできるトラックがありません');
            return;
        }
        
        // 新しいクリップを作成
        const remappedClip = new THREE.AnimationClip(
            clip.name + '_vrm',
            clip.duration,
            remappedTracks
        );
        
        // アニメーションを再生
        this.currentAction = this.mixer.clipAction(remappedClip);
        this.currentAction.play();
        
        console.log('▶️ BVHアニメーション再生中（VRM）');
    }
    
    /**
     * BVHスケルトンを表示（モデルがない場合）
     */
    showBVHSkeleton(bvhResult) {
        console.log('💀 BVHスケルトンを表示');
        
        // 既存のスケルトンヘルパーを削除
        if (this.bvhSkeletonHelper) {
            this.scene.remove(this.bvhSkeletonHelper);
            this.bvhSkeletonHelper = null;
        }
        
        // スケルトンヘルパーを作成
        this.bvhSkeletonHelper = new THREE.SkeletonHelper(bvhResult.skeleton.bones[0]);
        this.bvhSkeletonHelper.skeleton = bvhResult.skeleton;
        
        // スケール調整
        const rootBone = bvhResult.skeleton.bones[0];
        rootBone.scale.setScalar(0.01); // BVHは通常cm単位
        
        this.scene.add(rootBone);
        this.scene.add(this.bvhSkeletonHelper);
        
        // アニメーションを再生
        this.bvhMixer = new THREE.AnimationMixer(rootBone);
        const action = this.bvhMixer.clipAction(bvhResult.clip);
        action.play();
        
        console.log('▶️ BVHスケルトンアニメーション再生中');
    }
    
    /**
     * MoMask NPZファイルを読み込み
     */
    async loadNPZFromFile(file) {
        console.log('🎬 NPZファイル読み込み:', file.name);
        
        // HY-Motion Integrationがあればそちらに委譲（初期化を待つ）
        if (window.hyMotion && typeof window.hyMotion.loadFile === 'function') {
            console.log('🔄 HY-Motion Integrationに委譲');
            await window.hyMotion.loadFile(file);
            return;
        }
        
        // HY-Motionがまだ初期化されていない場合、少し待って再試行
        for (let i = 0; i < 10; i++) {
            await new Promise(resolve => setTimeout(resolve, 200));
            if (window.hyMotion && typeof window.hyMotion.loadFile === 'function') {
                console.log('🔄 HY-Motion Integrationに委譲 (待機後)');
                await window.hyMotion.loadFile(file);
                return;
            }
        }
        
        // HY-Motionが利用できない場合はフォールバック
        console.warn('⚠️ HY-Motion Integrationが利用できません。フォールバック処理を使用します。');
        
        try {
            const arrayBuffer = await file.arrayBuffer();
            await this.loadNPZ(arrayBuffer, file.name);
            console.log('✅ NPZ読み込み完了');
        } catch (error) {
            console.error('NPZ読み込みエラー:', error);
            alert('NPZファイルの読み込みに失敗しました: ' + error.message);
        }
    }
    
    /**
     * MoMask NPZをパースしてアニメーションを適用
     */
    async loadNPZ(arrayBuffer, fileName = 'motion.npz') {
        // NPZはZIP形式なので、JSZipで解凍
        // または簡易パーサーを使用
        
        const npzData = await this.parseNPZ(arrayBuffer);
        
        if (!npzData.rot6d || !npzData.transl) {
            throw new Error('Invalid NPZ format: missing rot6d or transl');
        }
        
        console.log('📦 NPZパース完了:', fileName);
        console.log('  - Text:', npzData.text || 'N/A');
        console.log('  - Duration:', npzData.duration, 's');
        console.log('  - Frames:', npzData.rot6d.length);
        
        // NPZをアニメーションに変換
        this.applyNPZMotion(npzData);
    }
    
    /**
     * NPZファイルをパース（簡易実装）
     */
    async parseNPZ(arrayBuffer) {
        // NPZはZIP形式
        const zip = await this.unzipNPZ(arrayBuffer);
        
        const result = {};
        
        for (const [name, data] of Object.entries(zip)) {
            const arrayName = name.replace('.npy', '');
            result[arrayName] = this.parseNPY(data);
        }
        
        return result;
    }
    
    /**
     * NPZ (ZIP)を解凍
     */
    async unzipNPZ(arrayBuffer) {
        // 簡易ZIPパーサー（非圧縮またはDeflate）
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
    
    /**
     * Deflateデータを解凍
     */
    async inflateData(compressedData) {
        // DecompressionStream APIを使用
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
        
        // チャンクを結合
        const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
        const result = new Uint8Array(totalLength);
        let offset = 0;
        for (const chunk of chunks) {
            result.set(chunk, offset);
            offset += chunk.length;
        }
        
        return result;
    }
    
    /**
     * NPYファイルをパース
     */
    parseNPY(data) {
        const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
        
        // Magic number check
        const magic = String.fromCharCode(...data.slice(0, 6));
        if (!magic.startsWith('\x93NUMPY')) {
            console.warn('Not a valid NPY file');
            return null;
        }
        
        const majorVersion = data[6];
        const minorVersion = data[7];
        
        let headerLength;
        let headerStart;
        if (majorVersion === 1) {
            headerLength = view.getUint16(8, true);
            headerStart = 10;
        } else {
            headerLength = view.getUint32(8, true);
            headerStart = 12;
        }
        
        const headerStr = new TextDecoder().decode(
            data.slice(headerStart, headerStart + headerLength)
        );
        
        // ヘッダーをパース
        const descrMatch = headerStr.match(/'descr':\s*'([^']+)'/);
        const shapeMatch = headerStr.match(/'shape':\s*\(([^)]+)\)/);
        const orderMatch = headerStr.match(/'fortran_order':\s*(True|False)/);
        
        const descr = descrMatch ? descrMatch[1] : '<f4';
        const shapeStr = shapeMatch ? shapeMatch[1] : '';
        const fortranOrder = orderMatch ? orderMatch[1] === 'True' : false;
        
        // Shapeをパース
        let shape = [];
        if (shapeStr.trim()) {
            shape = shapeStr.split(',').map(s => parseInt(s.trim())).filter(n => !isNaN(n));
        }
        
        const dataStart = headerStart + headerLength;
        const rawData = data.slice(dataStart);
        
        // バッファアライメント問題を回避するため、新しいArrayBufferにコピー
        const alignedBuffer = new ArrayBuffer(rawData.byteLength);
        new Uint8Array(alignedBuffer).set(rawData);
        
        // データ型に応じて配列を作成
        let typedArray;
        if (descr.includes('f4') || descr.includes('float32')) {
            typedArray = new Float32Array(alignedBuffer);
        } else if (descr.includes('f8') || descr.includes('float64')) {
            typedArray = new Float64Array(alignedBuffer);
        } else if (descr.includes('i4') || descr.includes('int32')) {
            typedArray = new Int32Array(alignedBuffer);
        } else if (descr.includes('i8') || descr.includes('int64')) {
            // JavaScriptはBigInt64Arrayを使用
            typedArray = new BigInt64Array(alignedBuffer);
            // Numberに変換
            typedArray = Array.from(typedArray).map(n => Number(n));
        } else if (descr.includes('U')) {
            // Unicode文字列
            const charWidth = parseInt(descr.match(/U(\d+)/)?.[1] || '1') * 4;
            const decoder = new TextDecoder('utf-32le');
            typedArray = decoder.decode(rawData).replace(/\0/g, '').trim();
        } else {
            console.warn('Unknown dtype:', descr);
            typedArray = rawData;
        }
        
        // スカラーの場合
        if (shape.length === 0 && typeof typedArray !== 'string') {
            return typedArray[0];
        }
        
        // 文字列の場合
        if (typeof typedArray === 'string') {
            return typedArray;
        }
        
        // 配列をshapeに従ってリシェイプ
        if (shape.length > 1) {
            return this.reshapeArray(Array.from(typedArray), shape);
        }
        
        return Array.from(typedArray);
    }
    
    /**
     * 配列を指定の形状にリシェイプ
     */
    reshapeArray(flat, shape) {
        if (shape.length === 1) {
            return flat;
        }
        
        const result = [];
        const stride = flat.length / shape[0];
        
        for (let i = 0; i < shape[0]; i++) {
            const start = i * stride;
            const end = start + stride;
            result.push(this.reshapeArray(flat.slice(start, end), shape.slice(1)));
        }
        
        return result;
    }
    
    /**
     * NPZモーションをモデルに適用
     */
    applyNPZMotion(npzData) {
        // ダウンロード用に保存
        this.lastNPZData = npzData;
        
        const rot6d = npzData.rot6d;  // [frames, 22, 6]
        const transl = npzData.transl;  // [frames, 3]
        const duration = npzData.duration || 5.0;
        
        const nFrames = rot6d.length;
        const frameTime = duration / nFrames;
        const fps = 1 / frameTime;
        
        console.log(`🎬 モーション適用: ${nFrames}フレーム, ${fps.toFixed(1)}fps`);
        
        // 6D回転をクォータニオンに変換
        const quaternions = this.rot6dToQuaternions(rot6d);
        
        // Three.jsアニメーションクリップを作成
        const tracks = [];
        
        // SMPL 22 joints -> Mixamo bone names
        const jointToMixamo = [
            'mixamorigHips',           // 0
            'mixamorigLeftUpLeg',      // 1
            'mixamorigRightUpLeg',     // 2
            'mixamorigSpine',          // 3
            'mixamorigLeftLeg',        // 4
            'mixamorigRightLeg',       // 5
            'mixamorigSpine1',         // 6
            'mixamorigLeftFoot',       // 7
            'mixamorigRightFoot',      // 8
            'mixamorigSpine2',         // 9
            'mixamorigLeftToeBase',    // 10
            'mixamorigRightToeBase',   // 11
            'mixamorigNeck',           // 12
            'mixamorigLeftShoulder',   // 13
            'mixamorigRightShoulder',  // 14
            'mixamorigHead',           // 15
            'mixamorigLeftArm',        // 16
            'mixamorigRightArm',       // 17
            'mixamorigLeftForeArm',    // 18
            'mixamorigRightForeArm',   // 19
            'mixamorigLeftHand',       // 20
            'mixamorigRightHand',      // 21
        ];
        
        // タイム配列
        const times = [];
        for (let f = 0; f < nFrames; f++) {
            times.push(f * frameTime);
        }
        
        // ルート位置トラック
        const positionValues = [];
        for (let f = 0; f < nFrames; f++) {
            positionValues.push(transl[f][0], transl[f][1], transl[f][2]);
        }
        tracks.push(new THREE.VectorKeyframeTrack(
            `${jointToMixamo[0]}.position`,
            times,
            positionValues
        ));
        
        // 各ジョイントの回転トラック
        for (let j = 0; j < 22; j++) {
            const quaternionValues = [];
            for (let f = 0; f < nFrames; f++) {
                const q = quaternions[f][j];
                quaternionValues.push(q.x, q.y, q.z, q.w);
            }
            tracks.push(new THREE.QuaternionKeyframeTrack(
                `${jointToMixamo[j]}.quaternion`,
                times,
                quaternionValues
            ));
        }
        
        // アニメーションクリップを作成
        const clip = new THREE.AnimationClip('NPZ_Motion', duration, tracks);
        
        // FBXモデルに適用
        if (this.fbxModel) {
            if (!this.fbxMixer) {
                this.fbxMixer = new THREE.AnimationMixer(this.fbxModel);
            }
            this.fbxMixer.stopAllAction();
            
            const action = this.fbxMixer.clipAction(clip);
            action.play();
            
            console.log('▶️ NPZモーション再生中（FBX）');
        }
        // VRMモデルに適用
        else if (this.vrm) {
            // VRMのボーン名にリマップ
            const vrmTracks = this.remapTracksToVRM(tracks, times, quaternions, transl, nFrames);
            const vrmClip = new THREE.AnimationClip('NPZ_Motion_VRM', duration, vrmTracks);
            
            if (!this.mixer) {
                this.mixer = new THREE.AnimationMixer(this.vrm.scene);
            }
            if (this.currentAction) {
                this.currentAction.stop();
            }
            
            this.currentAction = this.mixer.clipAction(vrmClip);
            this.currentAction.play();
            
            console.log('▶️ NPZモーション再生中（VRM）');
        }
        else {
            console.warn('⚠️ モデルが読み込まれていません');
            alert('先にFBXまたはVRMモデルを読み込んでください');
        }
    }
    
    /**
     * VRM用にトラックをリマップ
     */
    remapTracksToVRM(tracks, times, quaternions, transl, nFrames) {
        const vrmTracks = [];
        const humanoid = this.vrm.humanoid;
        
        // SMPL -> VRM Humanoid
        const smplToVRM = {
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
        
        // ルート位置
        const hipsBone = humanoid.getNormalizedBoneNode('hips');
        if (hipsBone) {
            const positionValues = [];
            for (let f = 0; f < nFrames; f++) {
                positionValues.push(transl[f][0], transl[f][1], transl[f][2]);
            }
            vrmTracks.push(new THREE.VectorKeyframeTrack(
                `${hipsBone.name}.position`,
                times,
                positionValues
            ));
        }
        
        // 各ジョイントの回転
        for (let j = 0; j < 22; j++) {
            const vrmBoneName = smplToVRM[j];
            if (!vrmBoneName) continue;
            
            const bone = humanoid.getNormalizedBoneNode(vrmBoneName);
            if (!bone) continue;
            
            const quaternionValues = [];
            for (let f = 0; f < nFrames; f++) {
                const q = quaternions[f][j];
                quaternionValues.push(q.x, q.y, q.z, q.w);
            }
            
            vrmTracks.push(new THREE.QuaternionKeyframeTrack(
                `${bone.name}.quaternion`,
                times,
                quaternionValues
            ));
        }
        
        return vrmTracks;
    }
    
    /**
     * 6D回転表現をクォータニオンに変換
     */
    rot6dToQuaternions(rot6d) {
        const nFrames = rot6d.length;
        const nJoints = rot6d[0].length;
        const result = [];
        
        for (let f = 0; f < nFrames; f++) {
            const frameQuats = [];
            for (let j = 0; j < nJoints; j++) {
                const r6d = rot6d[f][j];
                
                // 6D -> 3x3 rotation matrix
                let a1 = new THREE.Vector3(r6d[0], r6d[1], r6d[2]);
                let a2 = new THREE.Vector3(r6d[3], r6d[4], r6d[5]);
                
                // Gram-Schmidt
                const b1 = a1.clone().normalize();
                const b2 = a2.clone().sub(b1.clone().multiplyScalar(b1.dot(a2))).normalize();
                const b3 = new THREE.Vector3().crossVectors(b1, b2);
                
                // 3x3 matrix
                const mat = new THREE.Matrix4().set(
                    b1.x, b2.x, b3.x, 0,
                    b1.y, b2.y, b3.y, 0,
                    b1.z, b2.z, b3.z, 0,
                    0, 0, 0, 1
                );
                
                // Quaternion
                const quat = new THREE.Quaternion().setFromRotationMatrix(mat);
                frameQuats.push(quat);
            }
            result.push(frameQuats);
        }
        
        return result;
    }
    
    async loadMotions() {
        const loader = new GLTFLoader();
        loader.register((parser) => new VRMAnimationLoaderPlugin(parser));
        
        const motionFiles = [
            'VRMA_01.vrma',
            'VRMA_02.vrma',
            'VRMA_03.vrma',
            'VRMA_04.vrma',
            'VRMA_05.vrma',
            'VRMA_06.vrma',
            'VRMA_07.vrma'
        ];
        
        for (let i = 0; i < motionFiles.length; i++) {
            try {
                const gltf = await loader.loadAsync(`./motions/${motionFiles[i]}`);
                
                // デバッグ: gltfの中身を確認
                console.log(`Motion ${i + 1} gltf:`, gltf);
                console.log(`Motion ${i + 1} userData:`, gltf.userData);
                console.log(`Motion ${i + 1} vrmAnimation:`, gltf.userData.vrmAnimation);
                console.log(`Motion ${i + 1} vrmAnimations:`, gltf.userData.vrmAnimations);
                
                // vrmAnimation または vrmAnimations[0] を取得
                this.motions[i + 1] = gltf.userData.vrmAnimation || (gltf.userData.vrmAnimations && gltf.userData.vrmAnimations[0]);
                
                if (this.motions[i + 1]) {
                    console.log(`✓ Motion ${i + 1} loaded:`, this.motions[i + 1]);
                } else {
                    console.error(`✗ Motion ${i + 1} not found in userData`);
                }
            } catch (error) {
                console.error(`✗ Error loading motion ${i + 1}:`, error);
            }
        }
        
        console.log('✓ All motions loaded:', Object.keys(this.motions).filter(k => this.motions[k]).length);
        console.log('Motions object:', this.motions);
    }
    
    playMotion(index) {
        if (!this.vrm || !this.mixer || !this.motions[index]) {
            console.warn('Cannot play motion:', { 
                vrm: !!this.vrm, 
                mixer: !!this.mixer, 
                motion: !!this.motions[index] 
            });
            return;
        }
        
        console.log(`🎬 Playing motion ${index}`);
        
        // 現在のアクションを停止
        if (this.currentAction) {
            this.currentAction.stop();
        }
        
        // VRMAnimationClipを作成
        const clip = createVRMAnimationClip(this.motions[index], this.vrm);
        console.log('✓ Clip created:', clip.name);
        
        // AnimationActionを作成して再生
        this.currentAction = this.mixer.clipAction(clip);
        this.currentAction.reset();
        this.currentAction.play();
        
        console.log('✓ Motion playing!');
        this.updateActiveMotion(index);
    }
    
    stopMotion() {
        if (this.currentAction) {
            this.currentAction.stop();
            this.currentAction = null;
        }
        this.updateActiveMotion(null);
    }
    
    /**
     * 現在のモーションをBVHとしてダウンロード
     */
    downloadCurrentMotion() {
        // 保存されたNPZデータがある場合
        if (this.lastNPZData) {
            this.downloadMotionAsBVH(this.lastNPZData);
            return;
        }
        
        // FBXモデルのアニメーション
        if (this.fbxModel && this.fbxModel.animations && this.fbxModel.animations.length > 0) {
            this.downloadFBXAnimationAsBVH();
            return;
        }
        
        alert('ダウンロード可能なモーションがありません。\nNPZファイルを読み込んでください。');
    }
    
    /**
     * NPZデータをBVHとしてダウンロード
     */
    downloadMotionAsBVH(npzData) {
        const rot6d = npzData.rot6d;
        const transl = npzData.transl;
        const duration = npzData.duration || 5.0;
        const text = npzData.text || 'motion';
        
        const nFrames = rot6d.length;
        const frameTime = duration / nFrames;
        
        // SMPL 22 joints
        const JOINT_NAMES = [
            'Hips', 'LeftUpLeg', 'RightUpLeg', 'Spine', 'LeftLeg', 'RightLeg',
            'Spine1', 'LeftFoot', 'RightFoot', 'Spine2', 'LeftToeBase', 'RightToeBase',
            'Neck', 'LeftShoulder', 'RightShoulder', 'Head', 'LeftArm', 'RightArm',
            'LeftForeArm', 'RightForeArm', 'LeftHand', 'RightHand',
        ];
        
        const PARENT_IDX = [-1, 0, 0, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 9, 9, 12, 13, 14, 16, 17, 18, 19];
        
        const T_POSE_OFFSETS = [
            [0, 0, 0], [10, 0, 0], [-10, 0, 0], [0, 10, 0], [0, -40, 0], [0, -40, 0],
            [0, 15, 0], [0, -40, 0], [0, -40, 0], [0, 15, 0], [0, -5, 10], [0, -5, 10],
            [0, 10, 0], [5, 0, 0], [-5, 0, 0], [0, 10, 0], [15, 0, 0], [-15, 0, 0],
            [25, 0, 0], [-25, 0, 0], [25, 0, 0], [-25, 0, 0],
        ];
        
        // 6D回転をオイラー角に変換
        const eulers = [];
        for (let f = 0; f < nFrames; f++) {
            const frameEulers = [];
            for (let j = 0; j < 22; j++) {
                const r6d = rot6d[f][j];
                
                // 6D -> rotation matrix
                let a1 = new THREE.Vector3(r6d[0], r6d[1], r6d[2]);
                let a2 = new THREE.Vector3(r6d[3], r6d[4], r6d[5]);
                const b1 = a1.clone().normalize();
                const b2 = a2.clone().sub(b1.clone().multiplyScalar(b1.dot(a2))).normalize();
                const b3 = new THREE.Vector3().crossVectors(b1, b2);
                
                const mat = new THREE.Matrix4().set(
                    b1.x, b2.x, b3.x, 0,
                    b1.y, b2.y, b3.y, 0,
                    b1.z, b2.z, b3.z, 0,
                    0, 0, 0, 1
                );
                
                // Eulerに変換 (ZXY順)
                const euler = new THREE.Euler().setFromRotationMatrix(mat, 'ZXY');
                frameEulers.push([
                    THREE.MathUtils.radToDeg(euler.z),
                    THREE.MathUtils.radToDeg(euler.x),
                    THREE.MathUtils.radToDeg(euler.y)
                ]);
            }
            eulers.push(frameEulers);
        }
        
        // BVHファイルを生成
        let bvh = 'HIERARCHY\n';
        
        const writeJoint = (idx, indent) => {
            const name = JOINT_NAMES[idx];
            const offset = T_POSE_OFFSETS[idx];
            const pre = '  '.repeat(indent);
            
            bvh += `${pre}${idx === 0 ? 'ROOT' : 'JOINT'} ${name}\n`;
            bvh += `${pre}{\n`;
            bvh += `${pre}  OFFSET ${offset[0].toFixed(6)} ${offset[1].toFixed(6)} ${offset[2].toFixed(6)}\n`;
            bvh += `${pre}  CHANNELS ${idx === 0 ? '6 Xposition Yposition Zposition' : '3'} Zrotation Xrotation Yrotation\n`;
            
            const children = PARENT_IDX.map((p, i) => p === idx ? i : -1).filter(i => i >= 0);
            if (children.length > 0) {
                children.forEach(c => writeJoint(c, indent + 1));
            } else {
                bvh += `${pre}  End Site\n`;
                bvh += `${pre}  {\n`;
                bvh += `${pre}    OFFSET 0 5 0\n`;
                bvh += `${pre}  }\n`;
            }
            bvh += `${pre}}\n`;
        };
        
        writeJoint(0, 0);
        
        bvh += 'MOTION\n';
        bvh += `Frames: ${nFrames}\n`;
        bvh += `Frame Time: ${frameTime.toFixed(6)}\n`;
        
        // フレームデータ
        for (let f = 0; f < nFrames; f++) {
            const frameData = [];
            
            // ルート位置と回転
            frameData.push(transl[f][0] * 100, transl[f][1] * 100, transl[f][2] * 100);
            frameData.push(eulers[f][0][0], eulers[f][0][1], eulers[f][0][2]);
            
            // 他のジョイント
            const collectRotations = (idx) => {
                const children = PARENT_IDX.map((p, i) => p === idx ? i : -1).filter(i => i >= 0);
                children.forEach(c => {
                    frameData.push(eulers[f][c][0], eulers[f][c][1], eulers[f][c][2]);
                    collectRotations(c);
                });
            };
            collectRotations(0);
            
            bvh += frameData.map(v => v.toFixed(6)).join(' ') + '\n';
        }
        
        // ダウンロード
        const blob = new Blob([bvh], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${text.replace(/\s+/g, '_')}.bvh`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        console.log('✅ BVHダウンロード完了:', `${text}.bvh`);
    }
    
    /**
     * FBXアニメーションをBVHとしてダウンロード（簡易版）
     */
    downloadFBXAnimationAsBVH() {
        alert('FBXアニメーションのダウンロードはまだサポートされていません。\nNPZファイルを読み込んでからダウンロードしてください。');
    }
    
    updateActiveMotion(index) {
        const cards = document.querySelectorAll('.motion-card');
        cards.forEach(card => {
            card.classList.remove('active');
        });
        
        if (index) {
            const targetCard = cards[index - 1];
            if (targetCard) {
                targetCard.classList.add('active');
            }
        }
    }
    
    updateActiveModel(element) {
        document.querySelectorAll('.model-item').forEach(item => {
            item.classList.remove('active');
        });
        element.classList.add('active');
    }
    
    async sendMessage() {
        const input = document.getElementById('chat-input');
        const message = input.value.trim();
        
        if (!message) return;
        
        this.addMessage('user', message);
        input.value = '';
        
        // Gemini一体化モード
        if (this.useGemini && this.geminiClient) {
            try {
                console.log('🚀 Gemini一体化モードで送信');
                
                const result = await this.geminiClient.generateResponse(message);
                
                // テキストをチャットに追加
                if (result.text) {
                    this.addMessage('ai', result.text);
                }
                
                // 音声を再生
                if (result.audioData) {
                    await this.geminiClient.playAudio(
                        result.audioData,
                        (duration) => {
                            // リップシンク開始
                            console.log('👄 リップシンク開始:', duration.toFixed(2), '秒');
                            this.startGeminiLipSync();
                        },
                        () => {
                            // リップシンク終了
                            console.log('👄 リップシンク終了');
                            this.stopGeminiLipSync();
                        }
                    );
                }
                
                console.log(`✅ Gemini応答完了 (${result.elapsed}ms)`);
                
                // 自動モーション選択
                if (window.autoSelectMotion && result.text) {
                    window.autoSelectMotion(result.text);
                }
                
            } catch (error) {
                console.error('❌ Geminiエラー:', error);
                this.addMessage('ai', '申し訳ありません、エラーが発生しました。');
            }
        }
        // Realtime APIモードかどうか
        else if (this.isVoiceMode && this.realtimeClient && this.realtimeClient.isConnected) {
            // Realtime APIで送信
            this.realtimeClient.sendText(message);
        } else if (this.useChatGPT && this.chatGPTClient) {
            // ChatGPTで返信を生成
            try {
                // ストリーミングで表示
                let currentMessageDiv = null;
                
                const result = await this.chatGPTClient.sendMessageStream(message, (chunk) => {
                    if (!currentMessageDiv) {
                        // 最初のチャンクでメッセージdivを作成
                        const chatMessages = document.getElementById('chat-messages');
                        currentMessageDiv = document.createElement('div');
                        currentMessageDiv.className = 'message ai';
                        
                        const senderDiv = document.createElement('div');
                        senderDiv.className = 'message-sender';
                        senderDiv.textContent = 'AI';
                        
                        const textDiv = document.createElement('div');
                        textDiv.className = 'message-text';
                        textDiv.textContent = chunk;
                        
                        currentMessageDiv.appendChild(senderDiv);
                        currentMessageDiv.appendChild(textDiv);
                        chatMessages.appendChild(currentMessageDiv);
                        chatMessages.scrollTop = chatMessages.scrollHeight;
                    } else {
                        // 次のチャンクを追加
                        const textDiv = currentMessageDiv.querySelector('.message-text');
                        textDiv.textContent += chunk;
                        const chatMessages = document.getElementById('chat-messages');
                        chatMessages.scrollTop = chatMessages.scrollHeight;
                    }
                });
                
                // 音声読み上げ
                // SBV2が有効な場合はSBV2で読み上げ
                if (window.SBV2Panel && window.SBV2Panel.isEnabled()) {
                    console.log('🎤 SBV2で読み上げ:', result.text.substring(0, 50) + '...');
                    window.SBV2Panel.speak(result.text);
                } else if (document.getElementById('voice-enabled').checked) {
                    this.speak(result.text);
                }
                
                // 自動モーション選択
                if (window.autoSelectMotion) {
                    window.autoSelectMotion(result.text);
                }
                
            } catch (error) {
                console.error('❗ ChatGPTエラー:', error);
                this.addMessage('ai', '申し訳ありません、エラーが発生しました。');
            }
        } else {
            // 通常モード（ダミー返答）
            const response = await this.generateAIResponse(message);
            this.addMessage('ai', response);
            
            // 音声読み上げ
            // SBV2が有効な場合はSBV2で読み上げ
            if (window.SBV2Panel && window.SBV2Panel.isEnabled()) {
                console.log('🎤 SBV2で読み上げ:', response.substring(0, 50) + '...');
                window.SBV2Panel.speak(response);
            } else if (document.getElementById('voice-enabled').checked) {
                this.speak(response);
            }
            
            // 自動モーション選択
            if (window.autoSelectMotion) {
                window.autoSelectMotion(response);
            }
        }
    }
    
    /**
     * ChatGPTモードを切り替え
     */
    async toggleChatGPTMode() {
        if (!this.OPENAI_API_KEY) {
            const key = prompt('🔑 OpenAI API Key を入力してください:');
            if (!key) return;
            this.OPENAI_API_KEY = key;
        }
        
        if (this.useChatGPT) {
            // ChatGPT OFF
            this.useChatGPT = false;
            console.log('💬 ChatGPTモードOFF');
            this.updateChatGPTModeUI();
        } else {
            // ChatGPT ON
            if (!this.chatGPTClient) {
                this.chatGPTClient = new ChatGPTClient(this.OPENAI_API_KEY);
                
                // 保存されている性格設定を適用
                const savedPrompt = localStorage.getItem('character_prompt');
                if (savedPrompt) {
                    this.chatGPTClient.setSystemPrompt(savedPrompt);
                }
            }
            this.useChatGPT = true;
            console.log('💬 ChatGPTモードON');
            this.updateChatGPTModeUI();
        }
    }
    
    /**
     * キャラクターの性格設定を変更
     */
    openCharacterSettings() {
        const currentPrompt = this.chatGPTClient?.systemPrompt || 'あなたは親しみやすく、フレンドリーなVRMキャラクターです。';
        
        const modal = document.getElementById('character-settings-modal');
        const textarea = document.getElementById('character-prompt');
        
        textarea.value = currentPrompt;
        modal.style.display = 'flex';
    }
    
    /**
     * 性格設定を保存
     */
    saveCharacterSettings() {
        const textarea = document.getElementById('character-prompt');
        const newPrompt = textarea.value.trim();
        
        if (newPrompt) {
            // localStorageに保存
            localStorage.setItem('character_prompt', newPrompt);
            
            // ChatGPTクライアントに適用
            if (this.chatGPTClient) {
                this.chatGPTClient.setSystemPrompt(newPrompt);
                this.chatGPTClient.clearHistory(); // 会話履歴をクリア
            }
            
            console.log('✅ 性格設定を保存:', newPrompt);
            alert('性格設定を保存しました！');
        }
        
        this.closeCharacterSettings();
    }
    
    /**
     * 設定モーダルを閉じる
     */
    closeCharacterSettings() {
        const modal = document.getElementById('character-settings-modal');
        modal.style.display = 'none';
    }
    
    /**
     * Realtime API 音声モードを切り替え
     */
    async toggleVoiceMode() {
        if (!this.OPENAI_API_KEY) {
            const key = prompt('🔑 OpenAI API Key を入力してください:');
            if (!key) return;
            this.OPENAI_API_KEY = key;
        }
        
        if (this.isVoiceMode) {
            // 音声モードOFF
            if (this.realtimeClient) {
                this.realtimeClient.disconnect();
                this.realtimeClient = null;
            }
            this.isVoiceMode = false;
            console.log('🔇 音声モードOFF');
            this.updateVoiceModeUI();
        } else {
            // 音声モードON
            try {
                // 選択された声質を取得
                const realtimeVoice = ['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer'].includes(this.selectedVoice) 
                    ? this.selectedVoice 
                    : 'alloy';
                
                console.log('🎵 Realtime API声質:', realtimeVoice);
                
                this.realtimeClient = new RealtimeAPIClient(
                    this.OPENAI_API_KEY,
                    (audioData) => this.handleRealtimeAudio(audioData),
                    (text) => this.handleRealtimeText(text),
                    realtimeVoice // 声質を渡す
                );
                
                await this.realtimeClient.connect();
                await this.realtimeClient.startMicrophone();
                
                this.isVoiceMode = true;
                console.log('🎤 音声モードON');
                this.updateVoiceModeUI();
            } catch (error) {
                console.error('❗ 音声モード起動失敗:', error);
                alert('音声モードの起動に失敗しました。APIキーを確認してください。');
                this.isVoiceMode = false;
            }
        }
    }
    
    /**
     * Realtime APIからの音声データを処理
     */
    handleRealtimeAudio(audioData) {
        // 音声の強度からリップシンク値を計算
        let sum = 0;
        for (let i = 0; i < audioData.length; i++) {
            sum += Math.abs(audioData[i]);
        }
        const average = sum / audioData.length;
        
        // リップシンク目標値を更新
        this.lipSyncTarget = Math.min(average * 10, 1.0);
    }
    
    /**
     * Realtime APIからのテキストを処理
     */
    handleRealtimeText(text) {
        // チャットに追加（ストリーミングで追加される）
        console.log('📝 AI:', text);
    }
    
    addMessage(sender, text) {
        const chatMessages = document.getElementById('chat-messages');
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${sender}`;
        
        // ユーザーメッセージは濃い緑背景に白文字を強制適用
        if (sender === 'user') {
            messageDiv.style.backgroundColor = '#1b5e20';
            messageDiv.style.color = '#ffffff';
        }
        
        const senderDiv = document.createElement('div');
        senderDiv.className = 'message-sender';
        senderDiv.textContent = sender === 'user' ? 'あなた' : 'AI';
        
        const textDiv = document.createElement('div');
        textDiv.className = 'message-text';
        textDiv.textContent = text;
        
        messageDiv.appendChild(senderDiv);
        messageDiv.appendChild(textDiv);
        chatMessages.appendChild(messageDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }
    
    async generateAIResponse(message) {
        const responses = [
            'こんにちは！何かお手伝いできることはありますか？',
            'それは面白いですね！もっと教えてください。',
            'なるほど、よくわかりました！',
            '素晴らしいアイデアですね！',
            'それについて考えてみますね。'
        ];
        
        await new Promise(resolve => setTimeout(resolve, 500));
        return responses[Math.floor(Math.random() * responses.length)];
    }
    
    speak(text) {
        // Google TTSまたはOpenAI TTSがONの場合はブラウザTTSをスキップ
        if ((window.googleTTS && window.googleTTS.enabled) || (window.openaiTTS && window.openaiTTS.enabled)) {
            console.log('🔇 外部TTSがONのためブラウザTTSをスキップ');
            return;
        }
        
        const utterance = new SpeechSynthesisUtterance(text);
        
        // 選択された声質を適用
        const selectedVoice = this.selectedVoice;
        
        if (selectedVoice.startsWith('browser-')) {
            // ブラウザTTSを使用
            const voiceIndex = selectedVoice.split('-')[2]; // 'browser-female-1' -> '1'
            const voiceGender = selectedVoice.split('-')[1]; // 'female' or 'male'
            
            // 利用可能な音声から選択
            if (this.browserVoices.length > 0) {
                let targetVoice = null;
                
                if (voiceGender === 'female') {
                    const femaleVoices = this.browserVoices.filter(v => 
                        v.name.includes('female') || 
                        v.name.includes('Female') || 
                        v.name.includes('女性') ||
                        v.name.includes('Kyoko') ||
                        v.name.includes('Samantha') ||
                        v.name.includes('Victoria')
                    );
                    targetVoice = femaleVoices[parseInt(voiceIndex) - 1] || femaleVoices[0];
                } else {
                    const maleVoices = this.browserVoices.filter(v => 
                        v.name.includes('male') || 
                        v.name.includes('Male') || 
                        v.name.includes('男性') ||
                        v.name.includes('Otoya') ||
                        v.name.includes('Daniel') ||
                        v.name.includes('Thomas')
                    );
                    targetVoice = maleVoices[parseInt(voiceIndex) - 1] || maleVoices[0];
                }
                
                if (targetVoice) {
                    utterance.voice = targetVoice;
                    console.log('🎵 使用する音声:', targetVoice.name);
                }
            }
            
            utterance.lang = 'ja-JP';
            utterance.rate = 1.0; // 読み上げ速度
            utterance.pitch = voiceGender === 'female' ? 1.2 : 0.9; // ピッチ
            
        } else {
            // OpenAI Realtime音声は音声モードでのみ使用
            // 通常モードではブラウザTTSを使用
            utterance.lang = 'ja-JP';
            utterance.rate = 1.0;
            utterance.pitch = 1.0;
        }
        
        if (document.getElementById('lipsync-enabled').checked) {
            utterance.onstart = () => {
                this.startLipSync();
            };
            
            utterance.onend = () => {
                this.stopLipSync();
            };
        }
        
        speechSynthesis.speak(utterance);
    }
    
    /**
     * ブラウザの利用可能な音声を読み込み
     */
    loadBrowserVoices() {
        // 音声リストを取得
        const loadVoices = () => {
            this.browserVoices = speechSynthesis.getVoices();
            console.log('🎵 利用可能な音声:', this.browserVoices.length);
            
            // 日本語音声をログ出力
            const japaneseVoices = this.browserVoices.filter(v => v.lang.startsWith('ja'));
            console.log('🇯🇵 日本語音声:', japaneseVoices.map(v => v.name));
        };
        
        loadVoices();
        
        // 音声リストが非同期で読み込まれる場合もある
        if (speechSynthesis.onvoiceschanged !== undefined) {
            speechSynthesis.onvoiceschanged = loadVoices;
        }
    }
    
    startLipSync() {
        this.lipSyncInterval = setInterval(() => {
            this.lipSyncTarget = Math.random() * 0.5 + 0.3;
        }, 100);
    }
    
    stopLipSync() {
        if (this.lipSyncInterval) {
            clearInterval(this.lipSyncInterval);
            this.lipSyncInterval = null;
        }
        this.lipSyncTarget = 0;
    }
    
    // Gemini用リップシンク（自然なパターン）
    startGeminiLipSync() {
        const mouthPattern = [0.10, 0.30, 0.05, 0.15, 0.25, 0.50, 0.20, 1.00, 0.15, 0.25, 0.10, 0.75];
        let patternIndex = 0;
        
        this.geminiLipSyncInterval = setInterval(() => {
            if (this.vrm && this.vrm.expressionManager) {
                const value = mouthPattern[patternIndex];
                this.vrm.expressionManager.setValue('aa', value);
                patternIndex = (patternIndex + 1) % mouthPattern.length;
            }
        }, 300); // 0.3秒ごと
    }
    
    stopGeminiLipSync() {
        if (this.geminiLipSyncInterval) {
            clearInterval(this.geminiLipSyncInterval);
            this.geminiLipSyncInterval = null;
        }
        if (this.vrm && this.vrm.expressionManager) {
            this.vrm.expressionManager.setValue('aa', 0);
        }
        // 表情をneutralに戻す
        setTimeout(() => {
            if (window.applyExpression) {
                window.applyExpression('neutral');
            }
        }, 500);
    }
    
    /**
     * Geminiモードを切り替え
     */
    async toggleGeminiMode() {
        if (!this.GEMINI_API_KEY) {
            // localStorageから取得を試みる
            const savedKey = localStorage.getItem('banana_api_key');
            if (savedKey) {
                this.GEMINI_API_KEY = savedKey;
            } else {
                const key = prompt('🔑 Gemini API Key を入力してください:');
                if (!key) return;
                this.GEMINI_API_KEY = key;
                localStorage.setItem('banana_api_key', key);
            }
        }
        
        if (this.useGemini) {
            // Gemini OFF
            this.useGemini = false;
            console.log('💎 GeminiモードOFF');
            this.updateGeminiModeUI();
        } else {
            // Gemini ON
            if (!this.geminiClient) {
                this.geminiClient = new GeminiClient(this.GEMINI_API_KEY);
                
                // 保存されている性格設定を適用
                const savedPrompt = localStorage.getItem('character_prompt');
                if (savedPrompt) {
                    this.geminiClient.setSystemPrompt(savedPrompt);
                }
            }
            
            // 他のモードをOFF
            this.useChatGPT = false;
            this.updateChatGPTModeUI();
            
            this.useGemini = true;
            console.log('💎 GeminiモードON（一体化）');
            this.updateGeminiModeUI();
        }
    }
    
    updateGeminiModeUI() {
        const geminiBtn = document.getElementById('gemini-mode-toggle');
        if (geminiBtn) {
            if (this.useGemini) {
                geminiBtn.textContent = '💎 Gemini ON';
                geminiBtn.style.background = 'linear-gradient(135deg, #4285F4 0%, #34A853 100%)';
            } else {
                geminiBtn.textContent = '💎 Gemini OFF';
                geminiBtn.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
            }
        }
    }
    
    updateLipSync(deltaTime) {
        if (!this.vrm) return;
        
        this.lipSyncValue += (this.lipSyncTarget - this.lipSyncValue) * deltaTime * 10;
        
        if (this.vrm.expressionManager) {
            this.vrm.expressionManager.setValue('aa', this.lipSyncValue);
        }
    }
    
    resetCamera() {
        this.camera.position.set(0, 1.65, 3);
        this.controls.target.set(0, 1.0, 0);
        this.controls.update();
    }
    
    zoomIn() {
        const direction = new THREE.Vector3();
        this.camera.getWorldDirection(direction);
        this.camera.position.addScaledVector(direction, 0.3);
        this.controls.update();
    }
    
    zoomOut() {
        const direction = new THREE.Vector3();
        this.camera.getWorldDirection(direction);
        this.camera.position.addScaledVector(direction, -0.3);
        this.controls.update();
    }
    
    hideLoading() {
        document.getElementById('loading').style.display = 'none';
        
        // パネルを表示（display + panel-showクラス）
        const leftPanel = document.getElementById('left-panel');
        const rightPanel = document.getElementById('right-panel');
        const chatPanel = document.getElementById('chat-panel');
        
        if (leftPanel) {
            leftPanel.style.display = 'block';
            leftPanel.classList.add('panel-show');
        }
        if (rightPanel) {
            rightPanel.style.display = 'block';
            rightPanel.classList.add('panel-show');
        }
        if (chatPanel) {
            chatPanel.style.display = 'block';
            chatPanel.classList.add('panel-show');
        }
        
        // UI イベントリスナーを設定
        this.setupUIEventListeners();
    }
    
    updateChatGPTModeUI() {
        const chatGPTBtn = document.getElementById('chatgpt-mode-toggle');
        if (chatGPTBtn) {
            if (this.useChatGPT) {
                chatGPTBtn.textContent = '🤖 ChatGPT ON';
                chatGPTBtn.style.background = 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)';
            } else {
                chatGPTBtn.textContent = '🤖 ChatGPT OFF';
                chatGPTBtn.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
            }
        }
    }
    
    updateVoiceModeUI() {
        const voiceBtn = document.getElementById('voice-mode-toggle');
        if (voiceBtn) {
            if (this.isVoiceMode) {
                voiceBtn.textContent = '🎤 音声モードON';
                voiceBtn.style.background = 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)';
            } else {
                voiceBtn.textContent = '🎤 音声モードOFF';
                voiceBtn.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
            }
        }
    }
    
    setupUIEventListeners() {
        // モーションカードのクリックイベント
        document.querySelectorAll('.motion-card').forEach(card => {
            card.addEventListener('click', () => {
                const motionIndex = parseInt(card.dataset.motion);
                this.playMotion(motionIndex);
            });
        });
        
        // 停止ボタン
        document.getElementById('stop-motion-btn')?.addEventListener('click', () => {
            this.stopMotion();
        });
        
        // モーションダウンロードボタン
        document.getElementById('download-motion-btn')?.addEventListener('click', () => {
            this.downloadCurrentMotion();
        });
        
        // カメラボタン
        document.getElementById('reset-camera-btn')?.addEventListener('click', () => {
            this.resetCamera();
        });
        
        document.getElementById('zoom-in-btn')?.addEventListener('click', () => {
            this.zoomIn();
        });
        
        document.getElementById('zoom-out-btn')?.addEventListener('click', () => {
            this.zoomOut();
        });
        
        // チャット送信ボタン
        document.getElementById('chat-send')?.addEventListener('click', () => {
            this.sendMessage();
        });
        
        // チャット入力でEnterキー
        document.getElementById('chat-input')?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.sendMessage();
            }
        });
        
        // 音声モード切り替えボタン
        document.getElementById('voice-mode-toggle')?.addEventListener('click', () => {
            this.toggleVoiceMode();
        });
        
        // ChatGPTモード切り替えボタン
        document.getElementById('chatgpt-mode-toggle')?.addEventListener('click', () => {
            this.toggleChatGPTMode();
        });
        
        // Geminiモード切り替えボタンはcustom.jsで設定されるため、ここでは設定しない
        
        // 性格設定ボタン
        document.getElementById('character-settings-btn')?.addEventListener('click', () => {
            this.openCharacterSettings();
        });
        
        // 設定保存ボタン
        document.getElementById('save-character-btn')?.addEventListener('click', () => {
            this.saveCharacterSettings();
        });
        
        // 設定キャンセルボタン
        document.getElementById('cancel-character-btn')?.addEventListener('click', () => {
            this.closeCharacterSettings();
        });
        
        // 声質選択
        document.getElementById('voice-select')?.addEventListener('change', (e) => {
            this.selectedVoice = e.target.value;
            console.log('🎵 声質変更:', this.selectedVoice);
            
            // Realtime APIがアクティブな場合、再接続が必要
            if (this.isVoiceMode && this.realtimeClient) {
                alert('声質変更を適用するには、音声モードを一旦OFFにしてから再度ONにしてください。');
            }
        });
    }
    
    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        
        // DOFシステムのリサイズ
        if (window.dofSystem && window.dofSystem.isInitialized) {
            window.dofSystem.onResize(window.innerWidth, window.innerHeight);
        }
    }
    
    animate() {
        requestAnimationFrame(() => this.animate());
        
        const deltaTime = this.clock.getDelta();
        
        // VRMのAnimationMixerの更新
        if (this.mixer) {
            this.mixer.update(deltaTime);
        }
        
        // FBXのAnimationMixerの更新
        if (this.fbxMixer) {
            this.fbxMixer.update(deltaTime);
        }
        
        // BVHスケルトンのAnimationMixerの更新
        if (this.bvhMixer) {
            this.bvhMixer.update(deltaTime);
        }
        
        // ★ マルチキャラクターのAnimationMixerの更新
        if (window.multiConversationState && window.multiConversationState.animationMixers) {
            for (const mixer of window.multiConversationState.animationMixers) {
                if (mixer) {
                    mixer.update(deltaTime);
                }
            }
        }
        
        // ★ マルチキャラクターのVRM更新（重要！これがないとボーンが動かない）
        if (window.multiCharManager && window.multiCharManager.loadedVRMs) {
            window.multiCharManager.loadedVRMs.forEach((vrmData, charId) => {
                if (vrmData && vrmData.vrm) {
                    vrmData.vrm.update(deltaTime);
                }
            });
        }
        
        // VRMの更新
        if (this.vrm) {
            this.vrm.update(deltaTime);
            this.updateLipSync(deltaTime);
        }
        
        // FPSモード以外のときのみOrbitControlsを更新
        if (!window.fpsMode) {
            this.controls.update();
        }
        
        // Gaussian Splats環境のレンダリングフック
        if (this.environmentManager && this.environmentManager.viewer) {
            try {
                this.environmentManager.viewer.update();
                this.environmentManager.viewer.render();
            } catch (e) {
                // エラーは無視（環境が削除された場合など）
            }
        }
        
        // DOFシステムでレンダリングするか、通常レンダリング
        let usedDOF = false;
        if (window.dofSystem && window.dofSystem.enabled && window.dofSystem.isInitialized) {
            usedDOF = window.dofSystem.render();
        }
        
        // DOFを使わなかった場合は通常レンダリング
        if (!usedDOF) {
            this.renderer.render(this.scene, this.camera);
        }
    }
}

// アプリケーションインスタンスを作成
const app = new VRMAIViewer();

// グローバル関数として公開
window.playMotion = (index) => app.playMotion(index);
window.stopMotion = () => app.stopMotion();
window.sendMessage = () => app.sendMessage();
window.resetCamera = () => app.resetCamera();
window.zoomIn = () => app.zoomIn();
window.zoomOut = () => app.zoomOut();
window.app = app;
