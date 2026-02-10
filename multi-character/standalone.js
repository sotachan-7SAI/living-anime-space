// ========================================
// Multi-Character System v2.9
// VRMモデル選択機能 + クリックで位置調整UI
// + LLM別APIキー設定対応
// + APIキーJSONエクスポート/インポート
// + v2.6: Grok Voice対応（音声エンジン切替時に声種リスト切替）
// + v2.7: 会話開始時にGrok APIキーをDirectorに自動設定
// + v2.8: voiceEngine/grokVoiceをキャラ作成時に正しく渡すよう修正
// + v2.9: キャラリスト表示でGrok Voice選択時は「⚡Eve」のように表示
// ========================================

(function() {
    'use strict';
    
    console.log('🎭 Multi-Character System v3.0 読み込み開始 (先読みパイプライン対応)');
    
    // ========================================
    // MultiCharacterManager
    // ========================================
    
    class MultiCharacterManager {
        constructor(app) {
            this.app = app;
            this.characters = new Map();
            this.director = null;
            this.sharedApiKey = null;
            this.loadedVRMs = new Map(); // characterId -> { vrm, scene, mixer }
            
            this.positionPresets = {
                1: [{ x: 0, y: 0, z: 0 }],
                2: [{ x: -0.5, y: 0, z: 0 }, { x: 0.5, y: 0, z: 0 }],
                3: [{ x: -0.8, y: 0, z: 0 }, { x: 0, y: 0, z: 0.2 }, { x: 0.8, y: 0, z: 0 }],
                4: [{ x: -1.0, y: 0, z: 0 }, { x: -0.33, y: 0, z: 0.3 }, { x: 0.33, y: 0, z: 0.3 }, { x: 1.0, y: 0, z: 0 }]
            };
            
            this.cameraFollowEnabled = true;
            this.aiDirectorCamera = null;
            
            // ★ パイプラインモード設定
            this.usePipeline = true; // trueで先読み有効
            
            if (window.DialogueDirector || window.PipelinedDialogueDirector) {
                this.initDirector();
            }
            
            // VRMクリック検出の拡張を設定
            this.setupMultiVRMClickDetection();
            
            console.log('🎭 MultiCharacterManager初期化完了');
        }
        
        // ========================================
        // マルチVRMクリック検出
        // ========================================
        
        setupMultiVRMClickDetection() {
            // model-context-menu.js の onContextMenu を拡張
            const self = this;
            
            // オリジナルの右クリックハンドラを保存
            const canvas = document.querySelector('canvas');
            if (!canvas) {
                setTimeout(() => this.setupMultiVRMClickDetection(), 500);
                return;
            }
            
            // 既存のコンテキストメニューハンドラに統合するため、
            // グローバル関数を登録してmodel-context-menu.jsから呼び出せるようにする
            window.getMultiCharacterVRMs = () => {
                return this.loadedVRMs;
            };
            
            window.getCharacterByVRM = (vrm) => {
                for (const [id, data] of this.loadedVRMs) {
                    if (data.vrm === vrm) {
                        return { id, ...data, unit: this.characters.get(id) };
                    }
                }
                return null;
            };
            
            console.log('✅ マルチVRMクリック検出設定完了');
        }
        
        initDirector() {
            if (this.director) return;
            
            // ★ パイプラインモード判定
            if (this.usePipeline && window.PipelinedDialogueDirector) {
                this.director = new window.PipelinedDialogueDirector();
                console.log('✅ PipelinedDialogueDirector初期化完了（先読みON）');
            } else if (window.DialogueDirector) {
                this.director = new window.DialogueDirector();
                console.log('✅ DialogueDirector初期化完了（従来モード）');
            } else {
                console.warn('⚠️ DialogueDirectorが見つかりません');
                return;
            }
            
            this.setupDirectorCallbacks();
        }
        
        // ★ パイプラインモードを切り替え
        setPipelineMode(enabled) {
            if (this.director && this.director.isRunning) {
                console.warn('⚠️ 会話中はモード切替できません');
                return;
            }
            
            this.usePipeline = enabled;
            
            // Directorを再作成
            const oldTurnOrder = this.director ? this.director.turnOrder : [];
            this.director = null;
            this.initDirector();
            
            // ターン順序を復元
            if (this.director && oldTurnOrder.length > 0) {
                this.director.turnOrder = oldTurnOrder;
            }
            
            // キャラクターを再登録
            this.characters.forEach((unit, id) => {
                this.director.addCharacter(unit);
            });
            
            console.log(`🔄 パイプラインモード: ${enabled ? 'ON（先読み有効）' : 'OFF（従来モード）'}`);
        }
        
        setAIDirectorCamera(camera) {
            this.aiDirectorCamera = camera;
            console.log('📷 AI Director Camera連携設定完了');
        }
        
        setupDirectorCallbacks() {
            if (!this.director) return;
            
            this.director.onConversationStart = (topic) => {
                console.log(`🎬 会話開始: ${topic}`);
                if (this.aiDirectorCamera && this.aiDirectorCamera.showGroupShot && this.cameraFollowEnabled) {
                    this.aiDirectorCamera.showGroupShot();
                }
                this.dispatchEvent('conversationStart', { topic });
            };
            
            this.director.onConversationEnd = () => {
                console.log('🎬 会話終了');
                this.dispatchEvent('conversationEnd', {});
            };
            
            this.director.onTurnStart = (speaker, type) => {
                console.log(`👤 ${speaker.name}のターン開始`);
                if (this.aiDirectorCamera && this.aiDirectorCamera.followSpeaker && this.cameraFollowEnabled) {
                    setTimeout(() => this.aiDirectorCamera.followSpeaker(speaker.id, 'MCU'), 100);
                }
                this.dispatchEvent('turnStart', { speaker, type });
            };
            
            this.director.onTurnEnd = (speaker, text, emotion, motion) => {
                console.log(`👤 ${speaker.name}のターン終了 [感情: ${emotion || 'N/A'}, モーション: ${motion || 'N/A'}]`);
                // ★ 感情とモーション情報も渡す
                this.dispatchEvent('turnEnd', { speaker, text, emotion, motion });
            };
            
            this.director.onSpeechStart = (char) => this.dispatchEvent('speechStart', { character: char });
            this.director.onSpeechEnd = (char) => this.dispatchEvent('speechEnd', { character: char });
            this.director.onLogUpdate = (history) => this.dispatchEvent('logUpdate', { history });
            
            // ★ パイプライン専用コールバック
            if (this.usePipeline && this.director.onPipelineUpdate !== undefined) {
                this.director.onPipelineUpdate = (status) => {
                    this.dispatchEvent('pipelineUpdate', { status });
                };
                
                this.director.onPreviewTextReady = (entry) => {
                    console.log(`📝 先読みテキスト: ${entry.speakerName}`);
                    this.dispatchEvent('previewTextReady', { entry });
                };
                
                this.director.onAudioReady = (entry) => {
                    console.log(`🔊 音声準備完了: ${entry.speakerName}`);
                    this.dispatchEvent('audioReady', { entry });
                };
            }
        }
        
        dispatchEvent(eventName, detail) {
            window.dispatchEvent(new CustomEvent(`multichar:${eventName}`, { detail }));
        }
        
        // ========================================
        // VRM読み込み
        // ========================================
        
        async loadVRMForCharacter(characterId, vrmPath) {
            console.log(`📦 VRM読み込み開始: ${characterId} <- ${vrmPath}`);
            
            try {
                const THREE = window.THREE;
                const loader = new window.GLTFLoaderClass();
                
                // VRMLoaderPluginを動的インポート
                const { VRMLoaderPlugin } = await import('@pixiv/three-vrm');
                loader.register((parser) => new VRMLoaderPlugin(parser));
                
                const gltf = await loader.loadAsync(vrmPath);
                const vrm = gltf.userData.vrm;
                
                if (!vrm) {
                    throw new Error('VRMデータが見つかりません');
                }
                
                // 既存のVRMがあれば削除
                if (this.loadedVRMs.has(characterId)) {
                    const old = this.loadedVRMs.get(characterId);
                    if (old.vrm && old.vrm.scene && this.app && this.app.scene) {
                        this.app.scene.remove(old.vrm.scene);
                    }
                }
                
                // シーンに追加
                if (this.app && this.app.scene) {
                    this.app.scene.add(vrm.scene);
                }
                
                // VRM初期設定
                vrm.scene.rotation.y = Math.PI; // 正面向き
                
                // Mixerを作成
                const mixer = new THREE.AnimationMixer(vrm.scene);
                
                // ★ アニメーションループにmixerを登録（main.jsで更新されるようにする）
                if (!window.multiConversationState) {
                    window.multiConversationState = { animationMixers: [] };
                }
                if (!window.multiConversationState.animationMixers) {
                    window.multiConversationState.animationMixers = [];
                }
                // 重複登録を防ぐ
                if (!window.multiConversationState.animationMixers.includes(mixer)) {
                    window.multiConversationState.animationMixers.push(mixer);
                    console.log(`📌 ${characterId}: mixer をアニメーションループに登録`);
                }
                
                // キャラクター情報を保存
                const charUnit = this.characters.get(characterId);
                const charName = charUnit ? charUnit.name : characterId;
                
                // VRMシーンにメタデータを追加（クリック検出用）
                vrm.scene.userData.multiCharacterId = characterId;
                vrm.scene.userData.multiCharacterName = charName;
                vrm.scene.userData.isMultiCharacterVRM = true;
                
                this.loadedVRMs.set(characterId, { 
                    vrm, 
                    mixer, 
                    path: vrmPath,
                    name: charName
                });
                
                // CharacterUnitにVRMを設定
                if (charUnit) {
                    charUnit.vrm = vrm;
                    charUnit.mixer = mixer;
                    charUnit.vrmPath = vrmPath;
                }
                
                // カメラに登録
                if (this.aiDirectorCamera && this.aiDirectorCamera.registerCharacterVRM) {
                    this.aiDirectorCamera.registerCharacterVRM(characterId, vrm);
                }
                
                // 位置を更新
                this.updatePositions();
                
                console.log(`✅ VRM読み込み完了: ${characterId} (${charName})`);
                this.dispatchEvent('vrmLoaded', { characterId, vrmPath, charName });
                
                return vrm;
                
            } catch (error) {
                console.error(`❌ VRM読み込みエラー: ${characterId}`, error);
                this.dispatchEvent('vrmLoadError', { characterId, error: error.message });
                return null;
            }
        }
        
        // ファイルからVRM読み込み
        async loadVRMFromFile(characterId, file) {
            const url = URL.createObjectURL(file);
            try {
                const vrm = await this.loadVRMForCharacter(characterId, url);
                if (vrm) {
                    const unit = this.characters.get(characterId);
                    if (unit) {
                        unit.vrmFileName = file.name;
                    }
                    // 名前を更新
                    const vrmData = this.loadedVRMs.get(characterId);
                    if (vrmData) {
                        vrmData.fileName = file.name;
                    }
                }
                return vrm;
            } catch (e) {
                console.error('VRMファイル読み込みエラー:', e);
                return null;
            }
        }
        
        // メインVRMを流用
        useMainVRM(characterId) {
            if (!this.app || !this.app.vrm) {
                console.warn('メインVRMがありません');
                return false;
            }
            
            const unit = this.characters.get(characterId);
            if (!unit) return false;
            
            unit.vrm = this.app.vrm;
            unit.mixer = this.app.mixer || new window.THREE.AnimationMixer(this.app.vrm.scene);
            unit.vrmPath = 'main';
            
            // メインVRMにもメタデータを追加
            this.app.vrm.scene.userData.multiCharacterId = characterId;
            this.app.vrm.scene.userData.multiCharacterName = unit.name;
            this.app.vrm.scene.userData.isMultiCharacterVRM = true;
            this.app.vrm.scene.userData.isMainVRM = true;
            
            this.loadedVRMs.set(characterId, { 
                vrm: this.app.vrm, 
                mixer: unit.mixer, 
                path: 'main',
                isMain: true,
                name: unit.name
            });
            
            if (this.aiDirectorCamera && this.aiDirectorCamera.registerCharacterVRM) {
                this.aiDirectorCamera.registerCharacterVRM(characterId, this.app.vrm);
            }
            
            this.updatePositions();
            console.log(`✅ メインVRM流用: ${characterId} (${unit.name})`);
            return true;
        }
        
        createCharacter(config) {
            if (!this.director) this.initDirector();
            
            // ★ v4.5: デバッグログ追加
            console.log(`📝 createCharacter config:`, {
                id: config.id,
                name: config.name,
                voiceEngine: config.voiceEngine,
                grokVoice: config.grokVoice,
                voiceModel: config.voiceModel
            });
            
            const unit = new window.CharacterUnit({
                id: config.id,
                name: config.name,
                personality: config.personality,
                enabled: config.enabled !== false,
                llmProvider: config.llmProvider || config.llmType || 'chatgpt',
                llmModel: config.llmModel || 'gpt-4o-mini',
                apiKey: config.apiKey || this.sharedApiKey,
                ttsEngine: config.ttsEngine || 'sbv2',
                voiceModel: config.voiceModel || 'jvnv-F1-jp',
                voiceSpeakerId: config.voiceSpeakerId || 0,
                vrmPath: config.vrmPath,
                // ★ v4.3: Grok Voice対応
                voiceEngine: config.voiceEngine || 'sbv2',
                grokVoice: config.grokVoice || 'Ara'
            });
            
            // ★ v4.5: 作成後の確認ログ
            console.log(`✅ CharacterUnit作成後: voiceEngine=${unit.voiceEngine}, grokVoice=${unit.grokVoice}`);
            
            this.characters.set(unit.id, unit);
            this.director.addCharacter(unit);
            console.log(`✅ キャラクター作成: ${unit.name} (${unit.id}) [音声エンジン: ${unit.voiceEngine}]`);
            return unit;
        }
        
        updatePositions() {
            const enabledWithVRM = [];
            this.characters.forEach((unit, id) => {
                if (unit.enabled && this.loadedVRMs.has(id)) {
                    enabledWithVRM.push({ id, unit, vrmData: this.loadedVRMs.get(id) });
                }
            });
            
            const count = enabledWithVRM.length;
            if (count === 0) return;
            
            const positions = this.positionPresets[count] || this.positionPresets[4];
            
            enabledWithVRM.forEach((item, index) => {
                if (index < positions.length) {
                    const pos = positions[index];
                    if (item.vrmData.vrm && item.vrmData.vrm.scene) {
                        item.vrmData.vrm.scene.position.set(pos.x, pos.y, pos.z);
                    }
                    item.unit.position = pos;
                }
            });
            
            console.log(`📍 ${count}体のVRM位置を更新`);
        }
        
        removeCharacter(characterId) {
            // VRMをシーンから削除（メインVRMでない場合）
            if (this.loadedVRMs.has(characterId)) {
                const vrmData = this.loadedVRMs.get(characterId);
                if (!vrmData.isMain && vrmData.vrm && vrmData.vrm.scene && this.app && this.app.scene) {
                    this.app.scene.remove(vrmData.vrm.scene);
                }
                this.loadedVRMs.delete(characterId);
            }
            
            this.characters.delete(characterId);
            if (this.director) this.director.removeCharacter(characterId);
            if (this.aiDirectorCamera && this.aiDirectorCamera.unregisterCharacterVRM) {
                this.aiDirectorCamera.unregisterCharacterVRM(characterId);
            }
            this.updatePositions();
        }
        
        async startConversation(topic = '') {
            if (!this.director) this.initDirector();
            
            const readyChars = [];
            this.characters.forEach((unit, id) => {
                if (unit.enabled && this.loadedVRMs.has(id)) {
                    readyChars.push(unit);
                }
            });
            
            if (readyChars.length < 2) {
                console.warn('⚠️ VRMが読み込まれた有効キャラクターが2人以上必要です');
                this.dispatchEvent('error', { message: 'VRMが読み込まれた有効キャラクターが2人以上必要です' });
                return;
            }
            
            // ★ v4.3: Grok APIキーをDirectorに設定
            const grokApiKey = document.getElementById('mc-api-key-grok')?.value || localStorage.getItem('grok_api_key');
            if (grokApiKey && this.director.setGrokApiKey) {
                this.director.setGrokApiKey(grokApiKey);
                console.log('🔑 Grok APIキーをDirectorに設定');
            }
            
            await this.director.start(topic);
        }
        
        stopConversation() { if (this.director) this.director.stop(); }
        pauseConversation() { if (this.director) this.director.pause(); }
        resumeConversation() { if (this.director) this.director.resume(); }
        
        setSharedApiKey(apiKey) {
            this.sharedApiKey = apiKey;
            this.characters.forEach(unit => unit.setApiKey(apiKey));
        }
        
        setTurnMode(mode) { if (this.director) this.director.turnMode = mode; }
        setCameraFollow(enabled) { this.cameraFollowEnabled = enabled; }
        
        getCharacter(id) { return this.characters.get(id); }
        getAllCharacters() { return Array.from(this.characters.values()); }
        getEnabledCharacters() { return this.getAllCharacters().filter(c => c.enabled); }
        getConversationHistory() { return this.director ? this.director.getConversationHistory() : []; }
        clearHistory() { if (this.director) this.director.clearAllHistory(); }
        
        hasVRM(characterId) { return this.loadedVRMs.has(characterId); }
        getVRMInfo(characterId) { return this.loadedVRMs.get(characterId); }
    }
    
    window.MultiCharacterManager = MultiCharacterManager;
    
    // ========================================
    // MultiCharacterUI（VRM選択機能付き）
    // ========================================
    
    class MultiCharacterUI {
        constructor(manager) {
            this.manager = manager;
            this.panel = null;
            this.characterList = null;
            this.conversationLog = null;
            this.isMinimized = false;
            this.selectedCharacterId = null;
            
            // モデルリスト（modelsフォルダ内）
            this.availableModels = [
                { name: 'AvatarSample_B', path: './models/AvatarSample_B.vrm' },
                { name: 'AvatarSample_E', path: './models/AvatarSample_E.vrm' },
                { name: 'ジャイ美大人', path: './models/ジャイ美大人1.0.vrm' },
                { name: 'スネ子大人', path: './models/スネ子大人1.0.vrm' },
                { name: '井上博士大人', path: './models/井上博士大人1,0.vrm' },
                { name: '男性C', path: './models/AvatarSample_C男.vrm' },
                { name: '男性Gネクタイ', path: './models/AvatarSample_G男ネクタイ.vrm' },
            ];
            
            this.characterConfigs = [
                { id: 'char_A', name: '井上博士', personality: `知的で博識な発明家の女性。見た目は少女だが中身は年齢不詳。トニオたち3兄弟の近所に住む頼れるお姉さん的存在。あらゆる知識に詳しく、ドラえもんの道具のような発明もできる。
一人称は「ワシ」。語尾は「じゃ」「のじゃ」「なのじゃ」などを使う。
「トニオ」「ジャイ美」「スネ子」と呼ぶ。`, llmProvider: 'chatgpt', voiceModel: 'amitaro', enabled: true, vrmPath: './models/井上博士大人1,0.vrm' },
                { id: 'char_B', name: 'ジャイ美', personality: `14歳JKの女版ジャイアン。ちょっとアホなツンデレお姉ちゃん。喋らなければ超美人で雑誌モデルもやってる。気が強くて学校では番長だけど今でもモテる。アイドルヘヴィメタバンド「鼓膜破り」のセンターでメジャーデビュー済み。元気でポジティブ、多少ドジでボケ担当。
一人称は「アタシ」。語尾は「よ。」「わよ。」「でしょ。」など女の子らしい話し方。
「トニオ」「スネ子」「博士」と呼ぶ。`, llmProvider: 'chatgpt', voiceModel: 'FN7', enabled: true, vrmPath: './models/ジャイ美大人1.0.vrm' },
                { id: 'char_C', name: 'スネ子', personality: `18歳の長女で主席の生徒会長。クールな容姿とリーダーシップで男女問わず慕われている。実はむっつりスケベでVtuber「スネリンちゃん」の中の人。パソコンオタクで哲学オタク。基本みんなのツッコミ担当。
一人称は「ボク」。話し方は男の子っぽく「だ。」「だな。」「だね。」など。
「トニオ」「ジャイ美」「博士」と呼ぶ。`, llmProvider: 'chatgpt', voiceModel: 'FN9', enabled: true, vrmPath: './models/スネ子大人1.0.vrm' },
                { id: 'char_D', name: 'トニオ', personality: `おませな5歳児。いつも「なんでなんで」と中二病的なことばかり考えている永遠の5歳児。「この世界は5分前に作られた？」「宇宙の果てはどうなってる？」など哲学的な疑問を持つ。
一人称は「ボク」。語尾は「でちゅ」を使う。
「ジャイ美ちゃん」「スネ子ちゃん」「井上博士」と呼ぶ。`, llmProvider: 'chatgpt', voiceModel: 'FN2', enabled: false, vrmPath: null },
                { id: 'char_U', name: 'ユーザー', personality: '会話に参加するユーザー。自由に発言できる。', llmProvider: 'chatgpt', voiceModel: 'jvnv-F1-jp', enabled: false, vrmPath: null }
            ];
            
            // ★ 関係性備考欄（全員共通）
            this.relationshipNotes = `【3兄弟の関係】
トニオ（5歳）、ジャイ美（14歳）、スネ子（18歳）は3兄弟で同じ家に住んでいる。
井上博士は近所に住んでいる頼れるお姉さん的存在。
父は病院に入院中、母も看病のため病院で寝泊まりしている。

【呼び方のルール】
・トニオは「ジャイ美ちゃん」「スネ子ちゃん」「井上博士」と呼ぶ
・ジャイ美は「トニオ」「スネ子」「博士」と呼ぶ
・スネ子は「トニオ」「ジャイ美」「博士」と呼ぶ
・井上博士は「トニオ」「ジャイ美」「スネ子」と呼ぶ`;
            
            // SBV2音声モデルリスト（動的に取得）
            this.sbv2VoiceModels = [];
            
            this.loadSavedConfigs();
            this.init();
        }
        
        // SBV2音声モデル一覧を取得
        async loadSBV2VoiceModels() {
            try {
                const res = await fetch('/sbv2/api/models_info');
                if (res.ok) {
                    this.sbv2VoiceModels = await res.json();
                    console.log('🎤 SBV2音声モデル取得:', this.sbv2VoiceModels.length, '件');
                    this.updateVoiceSelect();
                }
            } catch (e) {
                console.warn('SBV2モデル取得失敗:', e);
            }
        }
        
        // 声選択UIを更新（音声エンジンに応じて切替）
        updateVoiceSelect(voiceEngine = null) {
            const voiceSelect = document.getElementById('mc-char-voice');
            if (!voiceSelect) return;
            
            // 音声エンジンを判定
            const engine = voiceEngine || document.getElementById('mc-char-voice-engine')?.value || 'sbv2';
            
            voiceSelect.innerHTML = '';
            
            if (engine === 'grok') {
                // ★ Grok Voice用のオプション
                const grokVoices = [
                    { value: 'Ara', text: '👩 Ara (女性/温かい)' },
                    { value: 'Eve', text: '👩 Eve (女性/元気)' },
                    { value: 'Rex', text: '👨 Rex (男性/自信)' },
                    { value: 'Leo', text: '👨 Leo (男性/威厳)' },
                    { value: 'Sal', text: '🧑 Sal (中性)' }
                ];
                grokVoices.forEach(v => {
                    const opt = document.createElement('option');
                    opt.value = v.value;
                    opt.textContent = v.text;
                    voiceSelect.appendChild(opt);
                });
                
                // 現在選択中のキャラのGrok声を選択
                if (this.selectedCharacterId) {
                    const char = this.characterConfigs.find(c => c.id === this.selectedCharacterId);
                    if (char && char.grokVoice) {
                        voiceSelect.value = char.grokVoice;
                    } else {
                        voiceSelect.value = 'Ara';
                    }
                }
                
                console.log('🔊⚡ 声選択をGrok Voiceに切替');
            } else {
                // ★ SBV2用のオプション
                if (this.sbv2VoiceModels.length > 0) {
                    // FNシリーズ
                    const fnModels = this.sbv2VoiceModels.filter(m => m.name.startsWith('FN'));
                    if (fnModels.length > 0) {
                        const fnGroup = document.createElement('optgroup');
                        fnGroup.label = '🎤 SBV2 FNシリーズ';
                        fnModels.sort((a, b) => {
                            const numA = parseInt(a.name.replace('FN', '')) || 0;
                            const numB = parseInt(b.name.replace('FN', '')) || 0;
                            return numA - numB;
                        }).forEach(m => {
                            const opt = document.createElement('option');
                            opt.value = m.name;
                            opt.textContent = m.name;
                            fnGroup.appendChild(opt);
                        });
                        voiceSelect.appendChild(fnGroup);
                    }
                    
                    // JVNVシリーズ
                    const jvnvModels = this.sbv2VoiceModels.filter(m => m.name.startsWith('jvnv'));
                    if (jvnvModels.length > 0) {
                        const jvnvGroup = document.createElement('optgroup');
                        jvnvGroup.label = '🎤 SBV2 JVNVシリーズ';
                        jvnvModels.forEach(m => {
                            const opt = document.createElement('option');
                            opt.value = m.name;
                            const displayName = m.name.replace('jvnv-', '').replace('-jp', '');
                            opt.textContent = displayName + (m.name.includes('F') ? ' (女)' : ' (男)');
                            jvnvGroup.appendChild(opt);
                        });
                        voiceSelect.appendChild(jvnvGroup);
                    }
                    
                    // その他のモデル
                    const otherModels = this.sbv2VoiceModels.filter(m => 
                        !m.name.startsWith('FN') && !m.name.startsWith('jvnv')
                    );
                    if (otherModels.length > 0) {
                        const otherGroup = document.createElement('optgroup');
                        otherGroup.label = '🎤 SBV2 その他';
                        otherModels.forEach(m => {
                            const opt = document.createElement('option');
                            opt.value = m.name;
                            opt.textContent = m.name;
                            otherGroup.appendChild(opt);
                        });
                        voiceSelect.appendChild(otherGroup);
                    }
                } else {
                    // フォールバック
                    const defaultOptions = [
                        { value: 'FN1', text: 'FN1' },
                        { value: 'FN2', text: 'FN2' },
                        { value: 'FN3', text: 'FN3' },
                        { value: 'FN4', text: 'FN4' },
                        { value: 'jvnv-F1-jp', text: '女声1 (F1)' },
                        { value: 'jvnv-M1-jp', text: '男声1 (M1)' }
                    ];
                    defaultOptions.forEach(opt => {
                        const option = document.createElement('option');
                        option.value = opt.value;
                        option.textContent = opt.text;
                        voiceSelect.appendChild(option);
                    });
                }
                
                // 現在選択中のキャラの声を再選択
                if (this.selectedCharacterId) {
                    const char = this.characterConfigs.find(c => c.id === this.selectedCharacterId);
                    if (char) voiceSelect.value = char.voiceModel;
                }
                
                console.log('🎤 声選択をSBV2に切替');
            }
        }
        
        init() {
            this.createPanel();
            this.setupEventListeners();
            
            // SBV2音声モデルを取得
            this.loadSBV2VoiceModels();
            
            console.log('🎭 MultiCharacterUI v2.3初期化完了');
            
            // 保存されたVRMを自動読み込み
            setTimeout(() => this.autoLoadSavedVRMs(), 1500);
        }
        
        // 保存されたVRM設定を自動読み込み
        async autoLoadSavedVRMs() {
            console.log('📦 保存済みVRM自動読み込み開始...');
            
            let loadedCount = 0;
            for (const char of this.characterConfigs) {
                if (!char.vrmPath || !char.enabled) continue;
                
                try {
                    if (char.vrmPath === 'main') {
                        // メインVRMを使用
                        const success = this.manager.useMainVRM(char.id);
                        if (success) {
                            loadedCount++;
                            console.log(`✅ ${char.name}: メインVRM設定完了`);
                        }
                    } else if (char.vrmPath.startsWith('file:')) {
                        // ファイルから読み込まれたVRMは再読み込み不可
                        console.log(`⚠️ ${char.name}: ファイルVRMは手動で再読み込みしてください`);
                    } else {
                        // モデルファイルから読み込み
                        const vrm = await this.manager.loadVRMForCharacter(char.id, char.vrmPath);
                        if (vrm) {
                            loadedCount++;
                            console.log(`✅ ${char.name}: VRM読み込み完了`);
                        }
                    }
                } catch (e) {
                    console.error(`❌ ${char.name}: VRM読み込みエラー`, e);
                }
            }
            
            console.log(`📦 VRM自動読み込み完了: ${loadedCount}体`);
            this.renderCharacterList();
        }
        
        loadSavedConfigs() {
            try {
                const saved = localStorage.getItem('multichar_configs_v2');
                if (saved) {
                    const loaded = JSON.parse(saved);
                    // 保存されたデータとデフォルトをマージ（新規追加フィールド対応）
                    this.characterConfigs = loaded.map((savedChar, index) => {
                        const defaultChar = this.characterConfigs[index] || {};
                        return {
                            ...defaultChar,
                            ...savedChar,
                            // 明示的に確認したいフィールド
                            personality: savedChar.personality || defaultChar.personality || '',
                            voiceModel: savedChar.voiceModel || defaultChar.voiceModel || 'jvnv-F1-jp',
                            llmProvider: savedChar.llmProvider || defaultChar.llmProvider || 'chatgpt',
                            // ★ v2.8: Grok Voice対応
                            voiceEngine: savedChar.voiceEngine || defaultChar.voiceEngine || 'sbv2',
                            grokVoice: savedChar.grokVoice || defaultChar.grokVoice || 'Ara'
                        };
                    });
                    console.log('📂 キャラ設定読み込み完了:', this.characterConfigs.map(c => 
                        `${c.name}(音声:${c.voiceEngine}/${c.voiceEngine === 'grok' ? c.grokVoice : c.voiceModel})`
                    ).join(', '));
                }
            } catch (e) {
                console.error('キャラ設定読み込みエラー:', e);
            }
        }
        
        saveConfigs() {
            try {
                // 保存前に現在の状態をログ
                console.log('💾 キャラ設定保存:', this.characterConfigs.map(c => 
                    `${c.name}(personality:${c.personality?.substring(0,20)}..., voice:${c.voiceModel}, llm:${c.llmProvider})`
                ).join(' | '));
                localStorage.setItem('multichar_configs_v2', JSON.stringify(this.characterConfigs));
            } catch (e) {
                console.error('キャラ設定保存エラー:', e);
            }
        }
        
        // ★ LLM別APIキーを保存
        saveApiKeys() {
            try {
                const keys = {
                    openai: document.getElementById('mc-api-key-openai')?.value || '',
                    gemini: document.getElementById('mc-api-key-gemini')?.value || '',
                    claude: document.getElementById('mc-api-key-claude')?.value || '',
                    grok: document.getElementById('mc-api-key-grok')?.value || '',
                    deepseek: document.getElementById('mc-api-key-deepseek')?.value || ''
                };
                localStorage.setItem('multichar_api_keys_v3', JSON.stringify(keys));
                console.log('🔑 APIキー保存完了');
            } catch (e) {
                console.warn('APIキー保存失敗:', e);
            }
        }
        
        // ★ LLM別APIキーを読み込み
        loadSavedApiKeys() {
            try {
                const saved = localStorage.getItem('multichar_api_keys_v3');
                if (saved) {
                    const keys = JSON.parse(saved);
                    if (keys.openai) document.getElementById('mc-api-key-openai').value = keys.openai;
                    if (keys.gemini) document.getElementById('mc-api-key-gemini').value = keys.gemini;
                    if (keys.claude) document.getElementById('mc-api-key-claude').value = keys.claude;
                    if (keys.grok) document.getElementById('mc-api-key-grok').value = keys.grok;
                    if (keys.deepseek) document.getElementById('mc-api-key-deepseek').value = keys.deepseek;
                    console.log('🔑 APIキー読み込み完了');
                }
            } catch (e) {
                console.warn('APIキー読み込み失敗:', e);
            }
        }
        
        // ★ LLMタイプに応じたAPIキーを取得
        getApiKeyForLLM(llmProvider) {
            const mapping = {
                'chatgpt': 'openai',
                'gemini': 'gemini',
                'claude': 'claude',
                'grok': 'grok',
                'deepseek': 'deepseek'
            };
            const keyId = mapping[llmProvider] || 'openai';
            return document.getElementById(`mc-api-key-${keyId}`)?.value || '';
        }
        
        // ★ APIキーをJSONファイルに保存
        exportApiKeysToJson() {
            const keys = {
                version: '1.0',
                exportDate: new Date().toISOString(),
                apiKeys: {
                    openai: document.getElementById('mc-api-key-openai')?.value || '',
                    gemini: document.getElementById('mc-api-key-gemini')?.value || '',
                    claude: document.getElementById('mc-api-key-claude')?.value || '',
                    grok: document.getElementById('mc-api-key-grok')?.value || '',
                    deepseek: document.getElementById('mc-api-key-deepseek')?.value || ''
                }
            };
            
            const json = JSON.stringify(keys, null, 2);
            const blob = new Blob([json], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            
            const a = document.createElement('a');
            a.href = url;
            a.download = `multichar-api-keys-${new Date().toISOString().slice(0,10)}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            console.log('💾 APIキーJSONエクスポート完了');
            alert('✅ APIキーをJSONファイルに保存しました');
        }
        
        // ★ JSONファイルからAPIキーを読み込み
        importApiKeysFromJson(file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const data = JSON.parse(e.target.result);
                    const keys = data.apiKeys || data; // 両方の形式に対応
                    
                    if (keys.openai) document.getElementById('mc-api-key-openai').value = keys.openai;
                    if (keys.gemini) document.getElementById('mc-api-key-gemini').value = keys.gemini;
                    if (keys.claude) document.getElementById('mc-api-key-claude').value = keys.claude;
                    if (keys.grok) document.getElementById('mc-api-key-grok').value = keys.grok;
                    if (keys.deepseek) document.getElementById('mc-api-key-deepseek').value = keys.deepseek;
                    
                    // localStorageにも保存
                    this.saveApiKeys();
                    
                    console.log('📂 APIキーJSONインポート完了');
                    alert('✅ APIキーを読み込みました');
                } catch (err) {
                    console.error('❌ JSON読み込みエラー:', err);
                    alert('❌ JSONファイルの読み込みに失敗しました');
                }
            };
            reader.readAsText(file);
        }
        
        // ★ APIキーをクリア
        clearApiKeys() {
            if (!confirm('⚠️ すべてのAPIキーをクリアしますか？')) return;
            
            document.getElementById('mc-api-key-openai').value = '';
            document.getElementById('mc-api-key-gemini').value = '';
            document.getElementById('mc-api-key-claude').value = '';
            document.getElementById('mc-api-key-grok').value = '';
            document.getElementById('mc-api-key-deepseek').value = '';
            
            // localStorageからも削除
            localStorage.removeItem('multichar_api_keys_v3');
            
            console.log('🗑️ APIキークリア完了');
            alert('✅ APIキーをクリアしました');
        }
        
        // ★ キャラクター設定をJSONファイルに保存
        exportCharacterConfigsToJson() {
            const data = {
                version: '2.0',
                exportDate: new Date().toISOString(),
                characters: this.characterConfigs,
                relationshipNotes: this.relationshipNotes
            };
            
            const json = JSON.stringify(data, null, 2);
            const blob = new Blob([json], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            
            const a = document.createElement('a');
            a.href = url;
            a.download = `multichar-characters-${new Date().toISOString().slice(0,10)}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            console.log('💾 キャラ設定JSONエクスポート完了');
            alert('✅ キャラクター設定をJSONファイルに保存しました');
        }
        
        // ★ JSONファイルからキャラクター設定を読み込み
        importCharacterConfigsFromJson(file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const data = JSON.parse(e.target.result);
                    
                    // キャラクター設定を読み込み
                    if (data.characters && Array.isArray(data.characters)) {
                        this.characterConfigs = data.characters;
                        this.saveConfigs();
                        this.renderCharacterList();
                        console.log('📂 キャラ設定読み込み完了:', this.characterConfigs.length, '人');
                    }
                    
                    // 関係性設定も読み込み
                    if (data.relationshipNotes) {
                        this.relationshipNotes = data.relationshipNotes;
                        this.saveRelationshipNotes();
                        const textarea = document.getElementById('mc-relationship-notes');
                        if (textarea) textarea.value = this.relationshipNotes;
                    }
                    
                    alert(`✅ キャラクター設定を読み込みました\n・キャラクター: ${this.characterConfigs.length}人\n・関係性設定: ${data.relationshipNotes ? 'あり' : 'なし'}`);
                    
                } catch (err) {
                    console.error('❌ JSON読み込みエラー:', err);
                    alert('❌ JSONファイルの読み込みに失敗しました');
                }
            };
            reader.readAsText(file);
        }
        
        // ★ 関係性設定を保存
        saveRelationshipNotes() {
            try {
                localStorage.setItem('multichar_relationship_notes', this.relationshipNotes);
                console.log('💾 関係性設定保存完了');
            } catch (e) {
                console.warn('関係性設定保存失敗:', e);
            }
        }
        
        // ★ 関係性設定を読み込み
        loadSavedRelationshipNotes() {
            try {
                const saved = localStorage.getItem('multichar_relationship_notes');
                if (saved) {
                    this.relationshipNotes = saved;
                    const textarea = document.getElementById('mc-relationship-notes');
                    if (textarea) textarea.value = this.relationshipNotes;
                    console.log('📂 関係性設定読み込み完了');
                }
            } catch (e) {
                console.warn('関係性設定読み込み失敗:', e);
            }
        }
        
        createPanel() {
            this.panel = document.createElement('div');
            this.panel.id = 'multi-character-panel';
            this.panel.innerHTML = `
                <div class="mc-header">
                    <span class="mc-title">🎭 マルチキャラ会話</span>
                    <div class="mc-header-controls">
                        <span class="mc-status" id="mc-status">停止中</span>
                        <button class="mc-btn mc-btn-minimize" id="mc-minimize">−</button>
                        <button class="mc-btn mc-btn-close" id="mc-close">×</button>
                    </div>
                </div>
                <div class="mc-body" id="mc-body">
                    <!-- キャラクター一覧 -->
                    <div class="mc-section">
                        <div class="mc-section-title">
                            <span>👥 キャラクター</span>
                            <div style="display:flex;gap:4px;">
                                <button class="mc-btn mc-btn-small mc-btn-placement" id="mc-auto-placement">📍 自動配置</button>
                                <button class="mc-btn mc-btn-small" id="mc-add-char">＋追加</button>
                            </div>
                        </div>
                        <div class="mc-character-list" id="mc-character-list"></div>
                        <!-- ★ キャラ設定JSON保存/読込 -->
                        <div class="mc-char-json-buttons">
                            <button class="mc-btn mc-btn-small mc-btn-save-char-json" id="mc-save-char-json">💾 キャラJSON保存</button>
                            <button class="mc-btn mc-btn-small mc-btn-load-char-json" id="mc-load-char-json">📂 キャラJSON読込</button>
                        </div>
                        <input type="file" id="mc-char-json-file-input" accept=".json" style="display:none;">
                    </div>
                    
                    <!-- ★ 発言順序管理 -->
                    <div class="mc-section mc-order-section">
                        <div class="mc-section-title">
                            <span>📋 発言順序</span>
                            <button class="mc-btn mc-btn-small" id="mc-reset-order">🔄 リセット</button>
                        </div>
                        <div class="mc-order-hint">ドラッグまたは▲▼で並び替え</div>
                        <div class="mc-speaking-order" id="mc-speaking-order"></div>
                    </div>
                    
                    <!-- ★ 行動制御 -->
                    <div class="mc-section mc-behavior-section">
                        <div class="mc-section-title">
                            <span>🚶 行動制御</span>
                            <button class="mc-btn mc-btn-small" id="mc-behavior-toggle">展開▼</button>
                        </div>
                        <div class="mc-behavior-body" id="mc-behavior-body" style="display:none;">
                            <div class="mc-behavior-all">
                                <label>全員:</label>
                                <div class="mc-behavior-btns">
                                    <button class="mc-behavior-btn active" data-mode="idle" data-all="true" title="静止">🧍</button>
                                    <button class="mc-behavior-btn" data-mode="follow" data-all="true" title="追跡">🏃</button>
                                    <button class="mc-behavior-btn" data-mode="flee" data-all="true" title="逃走">💨</button>
                                    <button class="mc-behavior-btn" data-mode="random" data-all="true" title="ランダム">🎲</button>
                                </div>
                            </div>
                            <hr style="border:none;border-top:1px dashed #444;margin:8px 0;">
                            <div class="mc-behavior-individual" id="mc-behavior-individual">
                                <div style="text-align:center;color:#888;font-size:10px;padding:8px;">キャラクターを有効にしてください</div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- キャラクター設定（選択時表示） -->
                    <div class="mc-section mc-char-settings" id="mc-char-settings" style="display:none;">
                        <div class="mc-section-title">⚙️ キャラ設定</div>
                        
                        <!-- VRMモデル選択 -->
                        <div class="mc-vrm-section">
                            <div class="mc-setting-row">
                                <label>🎨 VRM:</label>
                                <select id="mc-char-vrm-select">
                                    <option value="">-- 選択 --</option>
                                    <option value="main">📌 メインVRMを使用</option>
                                    ${this.availableModels.map(m => `<option value="${m.path}">${m.name}</option>`).join('')}
                                    <option value="file">📁 ファイルから選択...</option>
                                </select>
                            </div>
                            <div class="mc-vrm-status" id="mc-vrm-status">VRM未設定</div>
                            <div class="mc-vrm-hint">💡 読み込んだVRMを右クリック→「サイズ・位置」で移動できます</div>
                            <input type="file" id="mc-vrm-file-input" accept=".vrm" style="display:none;">
                        </div>
                        
                        <div class="mc-setting-row">
                            <label>名前:</label>
                            <input type="text" id="mc-char-name" placeholder="名前">
                        </div>
                        <div class="mc-setting-row">
                            <label>性格:</label>
                            <textarea id="mc-char-personality" placeholder="性格・特徴" rows="2"></textarea>
                        </div>
                        <div class="mc-setting-row">
                            <label>LLM:</label>
                            <select id="mc-char-llm">
                                <option value="chatgpt">🤖 ChatGPT</option>
                                <option value="gemini">💎 Gemini</option>
                                <option value="claude">🟣 Claude</option>
                                <option value="grok">🚀 Grok</option>
                                <option value="deepseek">🐋 DeepSeek</option>
                            </select>
                        </div>
                        <div class="mc-setting-row">
                            <label>🔊 音声:</label>
                            <select id="mc-char-voice-engine" style="width:65px;">
                                <option value="sbv2">SBV2</option>
                                <option value="grok">Grok</option>
                            </select>
                            <select id="mc-char-voice" style="flex:1;">
                                <option value="jvnv-F1-jp">女声1 (F1)</option>
                                <option value="jvnv-F2-jp">女声2 (F2)</option>
                                <option value="jvnv-M1-jp">男声1 (M1)</option>
                                <option value="jvnv-M2-jp">男声2 (M2)</option>
                            </select>
                        </div>
                        
                        <!-- ★ 個性設定ボタン -->
                        <div class="mc-personality-section">
                            <button class="mc-btn mc-btn-personality" id="mc-open-personality">🎭 個性設定を開く</button>
                        </div>
                        
                        <!-- ★ v4.1.4: モーション制限ボタン -->
                        <div class="mc-motion-restrict-section">
                            <div class="mc-motion-restrict-title">🎭 モーション制限</div>
                            <div class="mc-motion-restrict-buttons">
                                <button class="mc-btn mc-btn-motion-restrict" id="mc-restrict-happy-strong" title="大喜びモーション（ガッツポーズ、ピース、投げキス等）を禁止">🎉 大喜び禁止</button>
                                <button class="mc-btn mc-btn-motion-restrict" id="mc-restrict-sexy" title="セクシーモーションを禁止">💋 セクシー禁止</button>
                                <button class="mc-btn mc-btn-motion-restrict" id="mc-restrict-angry" title="激しい怒りモーションを禁止">💢 激怒り禁止</button>
                            </div>
                            <div class="mc-motion-restrict-hint">💡 静かなキャラには「大喜び禁止」がおすすめ</div>
                        </div>
                        
                        <div class="mc-setting-buttons">
                            <button class="mc-btn mc-btn-apply" id="mc-char-apply">💾 適用</button>
                            <button class="mc-btn mc-btn-delete" id="mc-char-delete">🗑️</button>
                        </div>
                    </div>
                    
                    <!-- 会話設定 -->
                    <div class="mc-section">
                        <div class="mc-section-title">
                            <span>💬 会話設定</span>
                            <button class="mc-btn mc-btn-small" id="mc-toggle-api-keys">🔑 API設定▼</button>
                        </div>
                        
                        <!-- ★ LLM別APIキー設定（折りたたみ） -->
                        <div class="mc-api-keys-section" id="mc-api-keys-section" style="display:none;">
                            <div class="mc-setting-row">
                                <label>🤖 OpenAI:</label>
                                <input type="password" id="mc-api-key-openai" placeholder="sk-...">
                                <button class="mc-btn mc-btn-small mc-toggle-key" data-target="mc-api-key-openai">👁</button>
                            </div>
                            <div class="mc-setting-row">
                                <label>💎 Gemini:</label>
                                <input type="password" id="mc-api-key-gemini" placeholder="AIza...">
                                <button class="mc-btn mc-btn-small mc-toggle-key" data-target="mc-api-key-gemini">👁</button>
                            </div>
                            <div class="mc-setting-row">
                                <label>🟣 Claude:</label>
                                <input type="password" id="mc-api-key-claude" placeholder="sk-ant-...">
                                <button class="mc-btn mc-btn-small mc-toggle-key" data-target="mc-api-key-claude">👁</button>
                            </div>
                            <div class="mc-setting-row">
                                <label>🚀 Grok:</label>
                                <input type="password" id="mc-api-key-grok" placeholder="xai-...">
                                <button class="mc-btn mc-btn-small mc-toggle-key" data-target="mc-api-key-grok">👁</button>
                            </div>
                            <div class="mc-setting-row">
                                <label>🐋 DeepSeek:</label>
                                <input type="password" id="mc-api-key-deepseek" placeholder="sk-...">
                                <button class="mc-btn mc-btn-small mc-toggle-key" data-target="mc-api-key-deepseek">👁</button>
                            </div>
                            <div class="mc-api-keys-hint">💡 各キャラのLLM設定に応じたAPIキーを入力してください</div>
                            <div class="mc-api-keys-buttons">
                                <button class="mc-btn mc-btn-small mc-btn-save-json" id="mc-save-api-json">💾 JSON保存</button>
                                <button class="mc-btn mc-btn-small mc-btn-load-json" id="mc-load-api-json">📂 JSON読込</button>
                                <button class="mc-btn mc-btn-small mc-btn-clear-api" id="mc-clear-api-keys">🗑️ クリア</button>
                            </div>
                            <input type="file" id="mc-api-json-file-input" accept=".json" style="display:none;">
                        </div>
                        <div class="mc-setting-row">
                            <label>トピック:</label>
                            <input type="text" id="mc-topic" placeholder="会話のトピック">
                            <button class="mc-btn mc-btn-small mc-btn-update-topic" id="mc-update-topic">📝 書換</button>
                        </div>
                        <div class="mc-setting-row">
                            <label>📝 カンペ:</label>
                            <textarea id="mc-system-note" placeholder="みんなへのシステムプロンプトに追加する注意事項を書いてください。例：「名前を言わないで」「敬語で話して」" rows="3"></textarea>
                        </div>
                        <div class="mc-kanpe-button-row">
                            <button class="mc-btn mc-btn-kanpe" id="mc-send-kanpe">📢 このカンペを伝える</button>
                        </div>
                        <!-- ★ 関係性設定欄（折りたたみ） -->
                        <div class="mc-setting-row">
                            <label>👥 関係性:</label>
                            <button class="mc-btn mc-btn-small" id="mc-toggle-relationship">▼ 開く</button>
                        </div>
                        <div class="mc-relationship-section" id="mc-relationship-section" style="display:none;">
                            <textarea id="mc-relationship-notes" placeholder="キャラクター同士の関係性、世界観、呼び方のルールなどを記載。会話開始時に全員のシステムプロンプトに追加されます。" rows="6"></textarea>
                            <div class="mc-relationship-hint">💡 例：「トニオは「ジャイ美ちゃん」と呼ぶ」「3人は兄弟で同じ家に住んでいる」</div>
                        </div>
                        <div class="mc-setting-row">
                            <label>モード:</label>
                            <select id="mc-turn-mode">
                                <option value="round-robin">順番制</option>
                                <option value="dynamic">動的</option>
                            </select>
                        </div>
                        <div class="mc-setting-row">
                            <label>📷 カメラ追従:</label>
                            <input type="checkbox" id="mc-camera-follow" checked>
                        </div>
                        <!-- ★ 発話間隔スライダー -->
                        <div class="mc-setting-row mc-speaker-delay-row">
                            <label>🕐 発話間隔:</label>
                            <input type="range" id="mc-speaker-delay" min="0" max="2000" step="500" value="500" style="flex:1;">
                            <span id="mc-speaker-delay-value" style="min-width:45px;text-align:right;">0.5秒</span>
                        </div>
                    </div>
                    
                    <!-- 会話コントロール -->
                    <div class="mc-section mc-controls">
                        <button class="mc-btn mc-btn-start" id="mc-start">▶️ 会話開始</button>
                        <button class="mc-btn mc-btn-stop" id="mc-stop" disabled>⏹️ 停止</button>
                        <button class="mc-btn mc-btn-pause" id="mc-pause" disabled>⏸️ 一時停止</button>
                    </div>
                    
                    <!-- 会話ログ -->
                    <div class="mc-section">
                        <div class="mc-section-title">
                            <span>📜 会話ログ</span>
                            <button class="mc-btn mc-btn-small" id="mc-clear-log">クリア</button>
                        </div>
                        <div class="mc-conversation-log" id="mc-conversation-log">
                            <div class="mc-log-empty">会話がありません</div>
                        </div>
                    </div>
                </div>
            `;
            this.addStyles();
            document.body.appendChild(this.panel);
            this.characterList = document.getElementById('mc-character-list');
            this.conversationLog = document.getElementById('mc-conversation-log');
            this.speakingOrderList = document.getElementById('mc-speaking-order');
            this.renderCharacterList();
            this.renderSpeakingOrder();
        }
        
        addStyles() {
            if (document.getElementById('mc-styles')) return;
            const style = document.createElement('style');
            style.id = 'mc-styles';
            style.textContent = `
                #multi-character-panel{position:fixed;top:60px;left:200px;width:320px;background:rgba(30,30,50,0.95);border-radius:12px;box-shadow:0 4px 20px rgba(0,0,0,0.4);z-index:10000;font-family:'Segoe UI','Yu Gothic',sans-serif;font-size:11px;color:#e0e0e0;overflow:hidden;backdrop-filter:blur(10px)}
                .mc-header{background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);padding:10px 12px;display:flex;justify-content:space-between;align-items:center;cursor:move}
                .mc-title{font-weight:bold;font-size:13px;color:white}
                .mc-header-controls{display:flex;align-items:center;gap:6px}
                .mc-status{font-size:10px;padding:3px 8px;background:rgba(255,255,255,0.2);border-radius:4px;color:white}
                .mc-status.running{background:#4ade80;color:#1a1a2e;font-weight:bold}
                .mc-status.paused{background:#fbbf24;color:#1a1a2e}
                .mc-body{padding:10px;max-height:75vh;overflow-y:auto}
                .mc-body.minimized{display:none}
                .mc-section{background:rgba(255,255,255,0.05);border-radius:8px;padding:10px;margin-bottom:8px}
                .mc-section-title{font-weight:bold;font-size:11px;color:#a0a0ff;margin-bottom:8px;display:flex;justify-content:space-between;align-items:center}
                .mc-btn{padding:5px 10px;border:none;border-radius:4px;cursor:pointer;font-size:10px;transition:all 0.2s}
                .mc-btn:hover{opacity:0.85;transform:translateY(-1px)}
                .mc-btn:disabled{opacity:0.5;cursor:not-allowed;transform:none}
                .mc-btn-small{padding:3px 6px;font-size:9px;background:#444;color:#aaa}
                .mc-btn-minimize,.mc-btn-close{background:rgba(255,255,255,0.2);color:white;width:22px;height:22px;padding:0;font-size:14px}
                .mc-btn-start{background:linear-gradient(135deg,#4ade80 0%,#22c55e 100%);color:white;flex:1;font-weight:bold}
                .mc-btn-stop{background:linear-gradient(135deg,#f87171 0%,#ef4444 100%);color:white;flex:1}
                .mc-btn-pause{background:linear-gradient(135deg,#fbbf24 0%,#f59e0b 100%);color:#1a1a2e;flex:1}
                .mc-btn-apply{background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);color:white;flex:1}
                .mc-btn-delete{background:#ef4444;color:white;padding:5px 8px}
                .mc-controls{display:flex;gap:6px}
                .mc-character-list{display:flex;flex-direction:column;gap:4px}
                .mc-char-item{display:flex;align-items:center;gap:8px;padding:8px 10px;background:rgba(255,255,255,0.05);border-radius:6px;cursor:pointer;transition:all 0.2s;border:2px solid transparent}
                .mc-char-item:hover{background:rgba(255,255,255,0.1)}
                .mc-char-item.selected{border-color:#667eea;background:rgba(102,126,234,0.2)}
                .mc-char-item.speaking{border-color:#4ade80;border-width:3px;animation:speaking-pulse 1s infinite;background:rgba(74,222,128,0.15)}
                .mc-char-item.preparing{border-color:#2d5a3d;border-width:2px;border-style:solid;background:rgba(45,90,61,0.1)}
                .mc-char-item.no-vrm{border-color:#f87171;border-style:dashed}
                @keyframes speaking-pulse{0%,100%{box-shadow:0 0 5px rgba(74,222,128,0.5)}50%{box-shadow:0 0 20px rgba(74,222,128,0.8)}}
                .mc-char-item.disabled{opacity:0.5}
                .mc-char-toggle{width:18px;height:18px;cursor:pointer;accent-color:#4ade80}
                .mc-char-avatar{width:32px;height:32px;border-radius:50%;background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);display:flex;align-items:center;justify-content:center;font-size:16px;font-weight:bold;color:white;position:relative}
                .mc-char-avatar.has-vrm::after{content:'✓';position:absolute;bottom:-2px;right:-2px;background:#4ade80;color:#1a1a2e;font-size:10px;width:14px;height:14px;border-radius:50%;display:flex;align-items:center;justify-content:center}
                .mc-char-info{flex:1;overflow:hidden}
                .mc-char-name{font-weight:bold;font-size:12px}
                .mc-char-meta{font-size:9px;color:#888;display:flex;gap:6px}
                .mc-char-badges{display:flex;gap:3px;flex-direction:column;align-items:flex-end}
                .mc-badge{font-size:8px;padding:2px 5px;border-radius:3px;background:#444;color:#aaa}
                .mc-badge.llm{background:#3b82f6;color:white}
                .mc-badge.vrm{background:#10b981;color:white}
                .mc-badge.no-vrm{background:#ef4444;color:white}
                .mc-setting-row{display:flex;align-items:center;gap:6px;margin-bottom:8px}
                .mc-setting-row label{min-width:70px;font-size:10px;color:#aaa}
                .mc-setting-row input[type="text"],.mc-setting-row input[type="password"],.mc-setting-row select,.mc-setting-row textarea{flex:1;padding:6px 10px;border:1px solid #444;border-radius:4px;background:#2a2a3e;color:#e0e0e0;font-size:10px}
                .mc-setting-row textarea{resize:vertical;min-height:50px}
                .mc-setting-row input[type="checkbox"]{width:18px;height:18px;accent-color:#4ade80}
                .mc-setting-buttons{display:flex;gap:6px;margin-top:10px}
                .mc-vrm-section{background:rgba(16,185,129,0.1);border:1px solid rgba(16,185,129,0.3);border-radius:6px;padding:8px;margin-bottom:10px}
                .mc-vrm-status{font-size:10px;color:#888;text-align:center;padding:4px;margin-top:6px;background:rgba(0,0,0,0.2);border-radius:4px}
                .mc-vrm-status.loaded{color:#4ade80}
                .mc-vrm-status.loading{color:#fbbf24}
                .mc-vrm-status.error{color:#f87171}
                .mc-vrm-hint{font-size:9px;color:#888;text-align:center;margin-top:6px;padding:4px;background:rgba(102,126,234,0.1);border-radius:4px}
                .mc-conversation-log{max-height:150px;overflow-y:auto;font-size:10px}
                .mc-api-keys-section{background:rgba(102,126,234,0.1);border:1px solid rgba(102,126,234,0.3);border-radius:6px;padding:10px;margin-bottom:10px}
                .mc-api-keys-section .mc-setting-row{margin-bottom:6px}
                .mc-api-keys-section .mc-setting-row:last-of-type{margin-bottom:0}
                .mc-api-keys-hint{font-size:9px;color:#888;text-align:center;margin-top:8px;padding:4px;background:rgba(0,0,0,0.2);border-radius:4px}
                .mc-api-keys-buttons{display:flex;gap:4px;margin-top:8px;justify-content:center}
                .mc-btn-save-json{background:#10b981!important;color:white!important}
                .mc-btn-load-json{background:#3b82f6!important;color:white!important}
                .mc-btn-clear-api{background:#ef4444!important;color:white!important}
                .mc-log-empty{text-align:center;color:#666;padding:15px}
                .mc-log-entry{padding:6px 8px;margin-bottom:4px;background:rgba(255,255,255,0.03);border-radius:4px;border-left:3px solid #667eea}
                .mc-log-speaker{font-weight:bold;color:#a0a0ff}
                .mc-log-text{color:#ccc;margin-top:3px;line-height:1.4}
                .mc-btn-placement{background:linear-gradient(135deg,#ff6666 0%,#ff3333 100%)!important;color:white!important}
                .mc-char-json-buttons{display:flex;gap:4px;margin-top:8px;justify-content:center}
                .mc-btn-save-char-json{background:#10b981!important;color:white!important}
                .mc-btn-load-char-json{background:#3b82f6!important;color:white!important}
                .mc-relationship-section{background:rgba(255,165,0,0.1);border:1px solid rgba(255,165,0,0.3);border-radius:6px;padding:10px;margin-bottom:10px}
                .mc-relationship-section textarea{width:100%;min-height:80px;resize:vertical}
                .mc-relationship-hint{font-size:9px;color:#888;text-align:center;margin-top:6px;padding:4px;background:rgba(0,0,0,0.2);border-radius:4px}
                .mc-btn-update-topic{background:linear-gradient(135deg,#f59e0b 0%,#d97706 100%)!important;color:white!important;font-weight:bold}
                .mc-btn-update-topic:hover{background:linear-gradient(135deg,#fbbf24 0%,#f59e0b 100%)!important}
                .mc-kanpe-button-row{display:flex;justify-content:center;margin-top:8px;margin-bottom:8px}
                .mc-btn-kanpe{background:linear-gradient(135deg,#ec4899 0%,#db2777 100%)!important;color:white!important;font-weight:bold;padding:8px 16px!important;font-size:12px!important;animation:kanpe-pulse 2s infinite}
                .mc-btn-kanpe:hover{background:linear-gradient(135deg,#f472b6 0%,#ec4899 100%)!important;transform:scale(1.05)}
                .mc-btn-kanpe.sent{background:linear-gradient(135deg,#10b981 0%,#059669 100%)!important;animation:none}
                @keyframes kanpe-pulse{0%,100%{box-shadow:0 0 5px rgba(236,72,153,0.5)}50%{box-shadow:0 0 15px rgba(236,72,153,0.8)}}
                .mc-order-section{background:rgba(102,126,234,0.1)!important;border:1px solid rgba(102,126,234,0.3)}
                .mc-order-hint{font-size:9px;color:#888;text-align:center;margin-bottom:6px}
                .mc-speaking-order{display:flex;flex-direction:column;gap:4px}
                .mc-order-item{display:flex;align-items:center;gap:6px;padding:6px 8px;background:rgba(255,255,255,0.08);border-radius:6px;cursor:grab;transition:all 0.2s;border:2px solid transparent;user-select:none}
                .mc-order-item:hover{background:rgba(255,255,255,0.15);border-color:rgba(102,126,234,0.5)}
                .mc-order-item.dragging{opacity:0.5;border-color:#667eea;background:rgba(102,126,234,0.3)}
                .mc-order-item.drag-over{border-color:#4ade80;background:rgba(74,222,128,0.2)}
                .mc-order-item.disabled{opacity:0.4;cursor:not-allowed}
                .mc-order-handle{cursor:grab;font-size:12px;color:#888;padding:2px 4px}
                .mc-order-handle:active{cursor:grabbing}
                .mc-order-number{width:20px;height:20px;border-radius:50%;background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);color:white;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:bold}
                .mc-order-item.disabled .mc-order-number{background:#444}
                .mc-order-name{flex:1;font-size:11px;font-weight:500}
                .mc-order-controls{display:flex;gap:2px}
                .mc-order-btn{width:20px;height:20px;border:none;border-radius:4px;background:#444;color:#aaa;cursor:pointer;font-size:10px;display:flex;align-items:center;justify-content:center;transition:all 0.2s}
                .mc-order-btn:hover{background:#555;color:white}
                .mc-order-btn:disabled{opacity:0.3;cursor:not-allowed}
                .mc-order-btn.up:hover{background:#3b82f6}
                .mc-order-btn.down:hover{background:#3b82f6}
                .mc-order-item.speaking{border-color:#4ade80;background:rgba(74,222,128,0.2);animation:speaking-pulse 1s infinite}
                .mc-order-item.speaking .mc-order-number{background:linear-gradient(135deg,#4ade80 0%,#22c55e 100%)}
                .mc-personality-section{margin-top:10px;margin-bottom:10px;text-align:center}
                .mc-btn-personality{background:linear-gradient(135deg,#a855f7 0%,#7c3aed 100%)!important;color:white!important;font-weight:bold;padding:10px 20px!important;font-size:12px!important;width:100%;border-radius:8px!important}
                .mc-btn-personality:hover{background:linear-gradient(135deg,#c084fc 0%,#a855f7 100%)!important;transform:scale(1.02)}
                .mc-motion-restrict-section{background:rgba(255,100,100,0.1);border:1px solid rgba(255,100,100,0.3);border-radius:6px;padding:8px;margin-top:10px;margin-bottom:10px}
                .mc-motion-restrict-title{font-size:10px;font-weight:bold;color:#ff9999;margin-bottom:6px;text-align:center}
                .mc-motion-restrict-buttons{display:flex;gap:4px;flex-wrap:wrap;justify-content:center}
                .mc-btn-motion-restrict{padding:4px 8px!important;font-size:9px!important;background:#444!important;color:#aaa!important;border:2px solid transparent!important;transition:all 0.2s}
                .mc-btn-motion-restrict:hover{background:#555!important;color:#fff!important}
                .mc-btn-motion-restrict.active{background:linear-gradient(135deg,#ef4444 0%,#dc2626 100%)!important;color:white!important;border-color:#ff6666!important;box-shadow:0 0 8px rgba(239,68,68,0.5)}
                .mc-motion-restrict-hint{font-size:8px;color:#888;text-align:center;margin-top:6px}
                .mc-behavior-section{background:rgba(240,147,251,0.1)!important;border:1px solid rgba(240,147,251,0.3)}
                .mc-behavior-body{padding-top:8px}
                .mc-behavior-all{display:flex;align-items:center;gap:8px;margin-bottom:6px}
                .mc-behavior-all label{font-size:10px;color:#aaa;min-width:40px}
                .mc-behavior-btns{display:flex;gap:4px}
                .mc-behavior-btn{width:32px;height:32px;border:2px solid #444;border-radius:6px;background:rgba(255,255,255,0.05);cursor:pointer;font-size:16px;transition:all 0.2s;display:flex;align-items:center;justify-content:center}
                .mc-behavior-btn:hover{border-color:#f093fb;background:rgba(240,147,251,0.2)}
                .mc-behavior-btn.active{background:linear-gradient(135deg,#f093fb 0%,#f5576c 100%);border-color:transparent}
                .mc-behavior-btn.waypoint{background:linear-gradient(135deg,#ff6b6b 0%,#ee5a24 100%);border-color:transparent;animation:waypoint-pulse 1s infinite}
                @keyframes waypoint-pulse{0%,100%{opacity:1}50%{opacity:0.7}}
                .mc-behavior-individual{display:flex;flex-direction:column;gap:6px}
                .mc-behavior-char-row{display:flex;align-items:center;gap:6px;padding:4px 6px;background:rgba(255,255,255,0.03);border-radius:6px}
                .mc-behavior-char-name{min-width:60px;font-size:10px;font-weight:500;color:#ccc}
                .mc-behavior-char-btns{display:flex;gap:3px;flex:1}
                .mc-behavior-char-btn{width:26px;height:26px;border:1px solid #555;border-radius:4px;background:rgba(255,255,255,0.03);cursor:pointer;font-size:12px;transition:all 0.2s}
                .mc-behavior-char-btn:hover{border-color:#f093fb;background:rgba(240,147,251,0.15)}
                .mc-behavior-char-btn.active{background:linear-gradient(135deg,#f093fb 0%,#f5576c 100%);border-color:transparent}
                .mc-behavior-char-btn.waypoint{background:linear-gradient(135deg,#ff6b6b 0%,#ee5a24 100%);border-color:transparent}
                .mc-behavior-char-status{font-size:9px;color:#888;min-width:50px;text-align:right}
                .mc-behavior-target-select{font-size:9px;padding:2px 4px;background:#2a2a3e;border:1px solid #444;border-radius:3px;color:#ccc;max-width:60px}
            `;
            document.head.appendChild(style);
        }
        
        setupEventListeners() {
            this.makeDraggable(this.panel, this.panel.querySelector('.mc-header'));
            
            document.getElementById('mc-minimize').addEventListener('click', () => this.toggleMinimize());
            document.getElementById('mc-close').addEventListener('click', () => this.panel.style.display = 'none');
            document.getElementById('mc-add-char').addEventListener('click', () => this.addNewCharacter());
            document.getElementById('mc-auto-placement').addEventListener('click', () => this.activateAutoPlacement());
            document.getElementById('mc-char-apply').addEventListener('click', () => this.applyCharacterSettings());
            document.getElementById('mc-char-delete').addEventListener('click', () => this.deleteSelectedCharacter());
            document.getElementById('mc-start').addEventListener('click', () => this.startConversation());
            document.getElementById('mc-stop').addEventListener('click', () => this.stopConversation());
            document.getElementById('mc-pause').addEventListener('click', () => this.togglePause());
            document.getElementById('mc-clear-log').addEventListener('click', () => this.clearLog());
            document.getElementById('mc-camera-follow').addEventListener('change', (e) => this.manager.setCameraFollow(e.target.checked));
            document.getElementById('mc-turn-mode').addEventListener('change', (e) => this.manager.setTurnMode(e.target.value));
            
            // ★ 発話間隔スライダー
            document.getElementById('mc-speaker-delay').addEventListener('input', (e) => {
                const value = parseInt(e.target.value);
                const displayValue = value === 0 ? '0秒' : `${(value / 1000).toFixed(1)}秒`;
                document.getElementById('mc-speaker-delay-value').textContent = displayValue;
                
                // Directorに即座に反映
                if (this.manager.director) {
                    this.manager.director.delayBetweenSpeakers = value;
                    console.log(`🕐 発話間隔: ${displayValue}`);
                }
                
                // localStorageに保存
                localStorage.setItem('multichar_speaker_delay', value.toString());
            });
            
            // ★ 保存された発話間隔を読み込み
            const savedDelay = localStorage.getItem('multichar_speaker_delay');
            if (savedDelay !== null) {
                const delayValue = parseInt(savedDelay);
                document.getElementById('mc-speaker-delay').value = delayValue;
                const displayValue = delayValue === 0 ? '0秒' : `${(delayValue / 1000).toFixed(1)}秒`;
                document.getElementById('mc-speaker-delay-value').textContent = displayValue;
                if (this.manager.director) {
                    this.manager.director.delayBetweenSpeakers = delayValue;
                }
            }
            
            // ★ 発言順序リセット
            document.getElementById('mc-reset-order').addEventListener('click', () => this.resetSpeakingOrder());
            
            // ★ API設定折りたたみトグル
            document.getElementById('mc-toggle-api-keys').addEventListener('click', () => {
                const section = document.getElementById('mc-api-keys-section');
                const btn = document.getElementById('mc-toggle-api-keys');
                const isVisible = section.style.display !== 'none';
                section.style.display = isVisible ? 'none' : 'block';
                btn.textContent = isVisible ? '🔑 API設定▼' : '🔑 API設定▲';
            });
            
            // ★ 各LLMのAPIキー表示/非表示トグル
            document.querySelectorAll('.mc-toggle-key').forEach(btn => {
                btn.addEventListener('click', () => {
                    const targetId = btn.dataset.target;
                    const input = document.getElementById(targetId);
                    if (input) {
                        input.type = input.type === 'password' ? 'text' : 'password';
                    }
                });
            });
            
            // ★ APIキー保存（各LLM別）
            ['openai', 'gemini', 'claude', 'grok', 'deepseek'].forEach(llm => {
                const input = document.getElementById(`mc-api-key-${llm}`);
                if (input) {
                    input.addEventListener('change', (e) => this.saveApiKeys());
                }
            });
            
            // 保存済みAPIキーを読み込み
            this.loadSavedApiKeys();
            
            // ★ JSON保存・読込・クリアボタン
            document.getElementById('mc-save-api-json').addEventListener('click', () => this.exportApiKeysToJson());
            document.getElementById('mc-load-api-json').addEventListener('click', () => document.getElementById('mc-api-json-file-input').click());
            document.getElementById('mc-api-json-file-input').addEventListener('change', (e) => {
                if (e.target.files[0]) {
                    this.importApiKeysFromJson(e.target.files[0]);
                    e.target.value = ''; // リセット
                }
            });
            document.getElementById('mc-clear-api-keys').addEventListener('click', () => this.clearApiKeys());
            
            // ★ キャラ設定JSON保存/読込
            document.getElementById('mc-save-char-json').addEventListener('click', () => this.exportCharacterConfigsToJson());
            document.getElementById('mc-load-char-json').addEventListener('click', () => document.getElementById('mc-char-json-file-input').click());
            document.getElementById('mc-char-json-file-input').addEventListener('change', (e) => {
                if (e.target.files[0]) {
                    this.importCharacterConfigsFromJson(e.target.files[0]);
                    e.target.value = '';
                }
            });
            
            // ★ 関係性設定欄トグル
            document.getElementById('mc-toggle-relationship').addEventListener('click', () => {
                const section = document.getElementById('mc-relationship-section');
                const btn = document.getElementById('mc-toggle-relationship');
                const isVisible = section.style.display !== 'none';
                section.style.display = isVisible ? 'none' : 'block';
                btn.textContent = isVisible ? '▼ 開く' : '▲ 閉じる';
            });
            
            // ★ 関係性設定の保存（変更時に自動保存）
            document.getElementById('mc-relationship-notes').addEventListener('change', (e) => {
                this.relationshipNotes = e.target.value;
                this.saveRelationshipNotes();
                this.updateSystemNoteRealtime(); // ★ 会話中に即時反映
            });
            
            // ★★★ トピック・カンペのリアルタイム反映 ★★★
            document.getElementById('mc-topic').addEventListener('input', (e) => {
                this.updateTopicRealtime(e.target.value);
            });
            
            document.getElementById('mc-system-note').addEventListener('input', (e) => {
                this.updateSystemNoteRealtime();
            });
            
            // 関係性もinputイベントで即時反映
            document.getElementById('mc-relationship-notes').addEventListener('input', (e) => {
                this.relationshipNotes = e.target.value;
                this.updateSystemNoteRealtime();
            });
            
            // ★ 保存済み関係性設定を読み込み
            this.loadSavedRelationshipNotes();
            
            // ★★★ トピック書換ボタン ★★★
            document.getElementById('mc-update-topic').addEventListener('click', () => this.forceUpdateTopic());
            
            // ★★★ カンペを伝えるボタン ★★★
            document.getElementById('mc-send-kanpe').addEventListener('click', () => this.sendKanpeToAll());
            
            // ★ 音声エンジン選択切替時に声種リストを更新
            document.getElementById('mc-char-voice-engine').addEventListener('change', (e) => {
                this.updateVoiceSelect(e.target.value);
                console.log('🔊 音声エンジン切替:', e.target.value);
            });
            
            // VRM選択
            document.getElementById('mc-char-vrm-select').addEventListener('change', (e) => this.onVRMSelectChange(e.target.value));
            document.getElementById('mc-vrm-file-input').addEventListener('change', (e) => this.onVRMFileSelect(e.target.files[0]));
            
            // ★ 個性設定ボタン
            document.getElementById('mc-open-personality').addEventListener('click', () => this.openPersonalityEditor());
            
            // ★ v4.1.4: モーション制限ボタン
            document.getElementById('mc-restrict-happy-strong').addEventListener('click', () => this.toggleMotionRestriction('happy_strong'));
            document.getElementById('mc-restrict-sexy').addEventListener('click', () => this.toggleMotionRestriction('sexy'));
            document.getElementById('mc-restrict-angry').addEventListener('click', () => this.toggleMotionRestriction('angry_strong'));
            
            // イベントリスナー
            window.addEventListener('multichar:conversationStart', () => { this.updateStatus('running'); this.updateControls(true); this.clearAllHighlights(); });
            window.addEventListener('multichar:conversationEnd', () => { this.updateStatus('stopped'); this.updateControls(false); this.clearAllHighlights(); });
            window.addEventListener('multichar:turnStart', (e) => this.highlightSpeaker(e.detail.speaker.id, 'speaking'));
            window.addEventListener('multichar:turnEnd', (e) => {
                this.highlightSpeaker(e.detail.speaker.id, 'none');
                this.addLogEntry(e.detail.speaker.name, e.detail.text);
            });
            window.addEventListener('multichar:vrmLoaded', (e) => this.onVRMLoaded(e.detail.characterId));
            window.addEventListener('multichar:error', (e) => alert('⚠️ ' + e.detail.message));
            
            // ★ 話者ハイライトイベント（パイプライン用）
            window.addEventListener('multichar:speakerHighlight', (e) => {
                const { speakerId, state } = e.detail;
                this.highlightSpeaker(speakerId, state);
            });
            
            // ★ 行動制御イベント
            document.getElementById('mc-behavior-toggle').addEventListener('click', () => {
                const body = document.getElementById('mc-behavior-body');
                const btn = document.getElementById('mc-behavior-toggle');
                const isVisible = body.style.display !== 'none';
                body.style.display = isVisible ? 'none' : 'block';
                btn.textContent = isVisible ? '展開▼' : '折りたたみ▲';
                
                if (!isVisible) {
                    this.initBehaviorManager();
                    this.renderBehaviorControls();
                }
            });
            
            // 全員行動ボタン
            document.querySelectorAll('.mc-behavior-btn[data-all="true"]').forEach(btn => {
                btn.addEventListener('click', () => {
                    const mode = btn.dataset.mode;
                    this.setAllBehaviorMode(mode);
                    
                    document.querySelectorAll('.mc-behavior-btn[data-all="true"]').forEach(b => {
                        b.classList.toggle('active', b.dataset.mode === mode);
                    });
                });
            });
        }
        
        // VRM選択変更
        async onVRMSelectChange(value) {
            if (!this.selectedCharacterId) return;
            
            const statusEl = document.getElementById('mc-vrm-status');
            
            if (value === 'file') {
                document.getElementById('mc-vrm-file-input').click();
                return;
            }
            
            if (value === 'main') {
                statusEl.textContent = '⏳ メインVRM設定中...';
                statusEl.className = 'mc-vrm-status loading';
                
                const success = this.manager.useMainVRM(this.selectedCharacterId);
                if (success) {
                    const char = this.characterConfigs.find(c => c.id === this.selectedCharacterId);
                    if (char) char.vrmPath = 'main';
                    this.saveConfigs();
                    statusEl.textContent = '✅ メインVRM使用中';
                    statusEl.className = 'mc-vrm-status loaded';
                } else {
                    statusEl.textContent = '❌ メインVRMがありません';
                    statusEl.className = 'mc-vrm-status error';
                }
                this.renderCharacterList();
                return;
            }
            
            if (value) {
                statusEl.textContent = '⏳ VRM読み込み中...';
                statusEl.className = 'mc-vrm-status loading';
                
                const vrm = await this.manager.loadVRMForCharacter(this.selectedCharacterId, value);
                if (vrm) {
                    const char = this.characterConfigs.find(c => c.id === this.selectedCharacterId);
                    if (char) char.vrmPath = value;
                    this.saveConfigs();
                }
            }
        }
        
        // VRMファイル選択
        async onVRMFileSelect(file) {
            if (!file || !this.selectedCharacterId) return;
            
            const statusEl = document.getElementById('mc-vrm-status');
            statusEl.textContent = `⏳ ${file.name} 読み込み中...`;
            statusEl.className = 'mc-vrm-status loading';
            
            const vrm = await this.manager.loadVRMFromFile(this.selectedCharacterId, file);
            if (vrm) {
                const char = this.characterConfigs.find(c => c.id === this.selectedCharacterId);
                if (char) {
                    char.vrmPath = 'file:' + file.name;
                }
                this.saveConfigs();
            }
        }
        
        // VRM読み込み完了
        onVRMLoaded(characterId) {
            if (characterId === this.selectedCharacterId) {
                const statusEl = document.getElementById('mc-vrm-status');
                statusEl.textContent = '✅ VRM読み込み完了（右クリックで位置調整）';
                statusEl.className = 'mc-vrm-status loaded';
            }
            this.renderCharacterList();
        }
        
        renderCharacterList() {
            this.characterList.innerHTML = '';
            this.characterConfigs.forEach(char => {
                const hasVRM = this.manager.hasVRM(char.id);
                const item = document.createElement('div');
                item.className = `mc-char-item ${char.enabled ? '' : 'disabled'} ${char.id === this.selectedCharacterId ? 'selected' : ''} ${!hasVRM && char.enabled ? 'no-vrm' : ''}`;
                item.dataset.charId = char.id;
                
                // ★ v2.9: 音声エンジンに応じた表示
                const voiceEngine = char.voiceEngine || 'sbv2';
                let voiceDisplay;
                if (voiceEngine === 'grok') {
                    voiceDisplay = `⚡${char.grokVoice || 'Ara'}`;
                } else {
                    voiceDisplay = (char.voiceModel || 'F1').replace('jvnv-', '').replace('-jp', '');
                }
                
                item.innerHTML = `
                    <input type="checkbox" class="mc-char-toggle" ${char.enabled ? 'checked' : ''}>
                    <div class="mc-char-avatar ${hasVRM ? 'has-vrm' : ''}">${char.name.charAt(0)}</div>
                    <div class="mc-char-info">
                        <div class="mc-char-name">${char.name}</div>
                        <div class="mc-char-meta">
                            <span>${char.llmProvider}</span>
                            <span>${voiceDisplay}</span>
                        </div>
                    </div>
                    <div class="mc-char-badges">
                        ${hasVRM ? '<span class="mc-badge vrm">VRM✓</span>' : '<span class="mc-badge no-vrm">VRM未設定</span>'}
                    </div>
                `;
                
                item.addEventListener('click', (e) => {
                    if (!e.target.classList.contains('mc-char-toggle')) {
                        this.selectCharacter(char.id);
                    }
                });
                
                item.querySelector('.mc-char-toggle').addEventListener('change', (e) => {
                    e.stopPropagation();
                    char.enabled = e.target.checked;
                    item.classList.toggle('disabled', !char.enabled);
                    this.saveConfigs();
                    this.renderCharacterList();
                    // ★ 発言順序リストも更新
                    this.renderSpeakingOrder();
                    this.updateDirectorTurnOrder();
                });
                
                this.characterList.appendChild(item);
            });
        }
        
        selectCharacter(charId) {
            this.selectedCharacterId = charId;
            document.querySelectorAll('.mc-char-item').forEach(item => {
                item.classList.toggle('selected', item.dataset.charId === charId);
            });
            
            const char = this.characterConfigs.find(c => c.id === charId);
            if (char) {
                document.getElementById('mc-char-settings').style.display = 'block';
                document.getElementById('mc-char-name').value = char.name;
                document.getElementById('mc-char-personality').value = char.personality;
                document.getElementById('mc-char-llm').value = char.llmProvider;
                
                // ★ 音声エンジンを復元してから声種リストを更新
                const voiceEngine = char.voiceEngine || 'sbv2';
                document.getElementById('mc-char-voice-engine').value = voiceEngine;
                this.updateVoiceSelect(voiceEngine);
                
                // VRM選択の状態を更新
                const vrmSelect = document.getElementById('mc-char-vrm-select');
                const statusEl = document.getElementById('mc-vrm-status');
                
                if (char.vrmPath === 'main') {
                    vrmSelect.value = 'main';
                    statusEl.textContent = '✅ メインVRM使用中';
                    statusEl.className = 'mc-vrm-status loaded';
                } else if (char.vrmPath && char.vrmPath.startsWith('file:')) {
                    vrmSelect.value = '';
                    statusEl.textContent = '✅ ' + char.vrmPath.replace('file:', '');
                    statusEl.className = 'mc-vrm-status loaded';
                } else if (char.vrmPath) {
                    vrmSelect.value = char.vrmPath;
                    statusEl.textContent = this.manager.hasVRM(charId) ? '✅ VRM読み込み済み（右クリックで位置調整）' : 'VRM未読み込み';
                    statusEl.className = this.manager.hasVRM(charId) ? 'mc-vrm-status loaded' : 'mc-vrm-status';
                } else {
                    vrmSelect.value = '';
                    statusEl.textContent = 'VRM未設定';
                    statusEl.className = 'mc-vrm-status';
                }
                
                // ★ v4.1.4: モーション制限ボタンの状態を更新
                this.updateMotionRestrictionButtons(charId);
            }
        }
        
        applyCharacterSettings() {
            if (!this.selectedCharacterId) return;
            const char = this.characterConfigs.find(c => c.id === this.selectedCharacterId);
            if (!char) return;
            
            char.name = document.getElementById('mc-char-name').value;
            char.personality = document.getElementById('mc-char-personality').value;
            char.llmProvider = document.getElementById('mc-char-llm').value;
            
            // ★ 音声エンジンと声種を保存
            const voiceEngine = document.getElementById('mc-char-voice-engine').value;
            const voiceSelect = document.getElementById('mc-char-voice').value;
            char.voiceEngine = voiceEngine;
            
            if (voiceEngine === 'grok') {
                char.grokVoice = voiceSelect;
                console.log(`🔊⚡ ${char.name} のGrok声種を ${voiceSelect} に設定`);
            } else {
                char.voiceModel = voiceSelect;
                console.log(`🎤 ${char.name} の音声モデルを ${voiceSelect} に設定`);
            }
            
            // ★ CharacterUnitも更新（重要！）
            const unit = this.manager.characters.get(this.selectedCharacterId);
            if (unit) {
                unit.name = char.name;
                unit.personality = char.personality;
                unit.llmProvider = char.llmProvider;
                unit.voiceEngine = voiceEngine;
                if (voiceEngine === 'grok') {
                    unit.grokVoice = voiceSelect;
                } else {
                    unit.voiceModel = voiceSelect;
                }
            }
            
            // VRMのメタデータも更新
            if (this.manager.loadedVRMs.has(this.selectedCharacterId)) {
                const vrmData = this.manager.loadedVRMs.get(this.selectedCharacterId);
                vrmData.name = char.name;
                if (vrmData.vrm && vrmData.vrm.scene) {
                    vrmData.vrm.scene.userData.multiCharacterName = char.name;
                }
            }
            
            this.saveConfigs();
            this.renderCharacterList();
            this.selectCharacter(this.selectedCharacterId);
            
            console.log(`💾 ${char.name}の設定を保存しました (voice: ${char.voiceModel})`);
        }
        
        addNewCharacter() {
            const id = `char_${Date.now()}`;
            this.characterConfigs.push({
                id,
                name: `キャラ${this.characterConfigs.length + 1}`,
                personality: '新しいキャラクター',
                llmProvider: 'chatgpt',
                voiceModel: 'jvnv-F1-jp',
                enabled: false,
                vrmPath: null
            });
            this.saveConfigs();
            this.renderCharacterList();
            this.selectCharacter(id);
        }
        
        deleteSelectedCharacter() {
            if (!this.selectedCharacterId || this.characterConfigs.length <= 2) {
                alert('最低2人のキャラクターが必要です');
                return;
            }
            if (!confirm(`${this.characterConfigs.find(c => c.id === this.selectedCharacterId)?.name}を削除しますか？`)) {
                return;
            }
            
            this.manager.removeCharacter(this.selectedCharacterId);
            const index = this.characterConfigs.findIndex(c => c.id === this.selectedCharacterId);
            if (index >= 0) this.characterConfigs.splice(index, 1);
            this.selectedCharacterId = null;
            document.getElementById('mc-char-settings').style.display = 'none';
            this.saveConfigs();
            this.renderCharacterList();
        }
        
        async startConversation() {
            const topic = document.getElementById('mc-topic').value;
            
            const enabledChars = this.characterConfigs.filter(c => c.enabled);
            if (enabledChars.length < 2) {
                alert('⚠️ 2人以上のキャラクターを有効にしてください');
                return;
            }
            
            // VRMが設定されているか確認
            const charsWithVRM = enabledChars.filter(c => this.manager.hasVRM(c.id));
            if (charsWithVRM.length < 2) {
                alert('⚠️ 有効なキャラクターのうち2人以上にVRMを設定してください');
                return;
            }
            
            // 既存キャラをクリアして再作成
            this.manager.characters.clear();
            if (this.manager.director) {
                this.manager.director.characters.clear();
                this.manager.director.turnOrder = [];
            }
            
            // ★ キャラクター作成（各キャラのLLMに応じたAPIキーを設定）
            for (const charData of enabledChars) {
                // キャラのLLMに対応するAPIキーを取得
                const apiKey = this.getApiKeyForLLM(charData.llmProvider);
                
                if (!apiKey) {
                    console.warn(`⚠️ ${charData.name} (${charData.llmProvider}) のAPIキーが未設定です`);
                }
                
                // ★ v2.8: voiceEngineとgrokVoiceを明示的に渡す
                const unit = this.manager.createCharacter({ 
                    ...charData, 
                    apiKey: apiKey,
                    personality: charData.personality,
                    voiceModel: charData.voiceModel,
                    voiceEngine: charData.voiceEngine || 'sbv2',
                    grokVoice: charData.grokVoice || 'Ara'
                });
                
                console.log(`🎭 ${charData.name} 作成: LLM=${charData.llmProvider}, 音声=${charData.voiceEngine || 'sbv2'}/${charData.voiceEngine === 'grok' ? charData.grokVoice : charData.voiceModel}`);
                
                // ★ 既にロード済みのVRMを再設定（重要！）
                if (this.manager.loadedVRMs.has(charData.id)) {
                    const vrmData = this.manager.loadedVRMs.get(charData.id);
                    unit.vrm = vrmData.vrm;
                    unit.mixer = vrmData.mixer;
                    
                    // ★ mixerをアニメーションループに登録（重要）
                    if (!window.multiConversationState) {
                        window.multiConversationState = { animationMixers: [] };
                    }
                    if (!window.multiConversationState.animationMixers) {
                        window.multiConversationState.animationMixers = [];
                    }
                    if (vrmData.mixer && !window.multiConversationState.animationMixers.includes(vrmData.mixer)) {
                        window.multiConversationState.animationMixers.push(vrmData.mixer);
                        console.log(`📌 ${charData.name}: mixerをアニメーションループに登録`);
                    }
                    
                    console.log(`✅ ${charData.name}: VRM設定完了 (vrm: ${unit.vrm ? '有' : '無'}, mixer: ${unit.mixer ? '有' : '無'})`);
                } else {
                    console.warn(`⚠️ ${charData.name}: VRMがロードされていません`);
                }
            }
            
            this.manager.setTurnMode(document.getElementById('mc-turn-mode').value);
            this.manager.setCameraFollow(document.getElementById('mc-camera-follow').checked);
            
            // ★ 発話間隔を適用
            const speakerDelay = parseInt(document.getElementById('mc-speaker-delay').value) || 500;
            if (this.manager.director) {
                this.manager.director.delayBetweenSpeakers = speakerDelay;
                console.log(`🕐 発話間隔設定: ${speakerDelay}ms`);
            }
            
            // ★ カンペ（追加システムプロンプト）を取得
            const systemNote = document.getElementById('mc-system-note')?.value || '';
            
            // ★ 関係性設定を取得
            const relationshipNotes = document.getElementById('mc-relationship-notes')?.value || this.relationshipNotes || '';
            
            // ★ カンペと関係性を結合してシステムプロンプトに追加
            let combinedSystemNote = '';
            if (relationshipNotes) {
                combinedSystemNote += `【キャラクターの関係性・世界観】\n${relationshipNotes}\n\n`;
            }
            if (systemNote) {
                combinedSystemNote += `【追加指示】\n${systemNote}`;
            }
            
            if (combinedSystemNote && this.manager.director) {
                this.manager.director.systemNote = combinedSystemNote;
                console.log('📝 システムノート設定:', combinedSystemNote.substring(0, 100) + '...');
            }
            
            await this.manager.startConversation(topic || '自由に会話してください');
        }
        
        stopConversation() { this.manager.stopConversation(); }
        
        togglePause() {
            if (this.manager.director && this.manager.director.isPaused) {
                this.manager.resumeConversation();
                this.updateStatus('running');
                document.getElementById('mc-pause').textContent = '⏸️ 一時停止';
            } else {
                this.manager.pauseConversation();
                this.updateStatus('paused');
                document.getElementById('mc-pause').textContent = '▶️ 再開';
            }
        }
        
        updateStatus(status) {
            const statusEl = document.getElementById('mc-status');
            statusEl.className = 'mc-status ' + status;
            statusEl.textContent = status === 'running' ? '会話中' : status === 'paused' ? '一時停止' : '停止中';
        }
        
        updateControls(isRunning) {
            document.getElementById('mc-start').disabled = isRunning;
            document.getElementById('mc-stop').disabled = !isRunning;
            document.getElementById('mc-pause').disabled = !isRunning;
        }
        
        // ★ 話者ハイライト（状態対応版）
        // state: 'speaking'(明るい緑) / 'preparing'(深緑) / 'none'(なし)
        highlightSpeaker(charId, state = 'speaking') {
            // キャラクターリスト
            const item = document.querySelector(`.mc-char-item[data-char-id="${charId}"]`);
            if (!item) return;
            
            // 状態をクリア
            item.classList.remove('speaking', 'preparing');
            
            // 新しい状態を設定
            if (state === 'speaking') {
                item.classList.add('speaking');
            } else if (state === 'preparing') {
                item.classList.add('preparing');
            }
            
            // ★ 発言順序リストもハイライト
            const orderItem = document.querySelector(`.mc-order-item[data-char-id="${charId}"]`);
            if (orderItem) {
                orderItem.classList.remove('speaking', 'preparing');
                if (state === 'speaking') {
                    orderItem.classList.add('speaking');
                } else if (state === 'preparing') {
                    orderItem.classList.add('preparing');
                }
            }
        }
        
        // ★ 全員のハイライトをクリア
        clearAllHighlights() {
            document.querySelectorAll('.mc-char-item').forEach(item => {
                item.classList.remove('speaking', 'preparing');
            });
            // ★ 発言順序リストもクリア
            document.querySelectorAll('.mc-order-item').forEach(item => {
                item.classList.remove('speaking', 'preparing');
            });
        }
        
        addLogEntry(speaker, text) {
            const emptyMsg = this.conversationLog.querySelector('.mc-log-empty');
            if (emptyMsg) emptyMsg.remove();
            const entry = document.createElement('div');
            entry.className = 'mc-log-entry';
            entry.innerHTML = `<div class="mc-log-speaker">${speaker}:</div><div class="mc-log-text">${text}</div>`;
            this.conversationLog.appendChild(entry);
            this.conversationLog.scrollTop = this.conversationLog.scrollHeight;
        }
        
        clearLog() {
            this.conversationLog.innerHTML = '<div class="mc-log-empty">会話がありません</div>';
            this.manager.clearHistory();
        }
        
        // ========================================
        // ★ 個性設定エディタを開く
        // ========================================
        
        openPersonalityEditor() {
            if (!this.selectedCharacterId) {
                alert('❗ キャラクターを選択してください');
                return;
            }
            
            const char = this.characterConfigs.find(c => c.id === this.selectedCharacterId);
            if (!char) return;
            
            // 個性設定UIを表示
            if (window.personalityEditorUI) {
                window.personalityEditorUI.show(this.selectedCharacterId, char.name);
            } else {
                alert('⚠️ 個性設定システムが読み込まれていません');
            }
        }
        
        // ========================================
        // ★ v4.1.4: モーション制限機能
        // ========================================
        
        /**
         * モーション制限をトグル
         * @param {string} emotionType - 'happy_strong', 'sexy', 'angry_strong'
         */
        toggleMotionRestriction(emotionType) {
            if (!this.selectedCharacterId) {
                alert('❗ キャラクターを選択してください');
                return;
            }
            
            const char = this.characterConfigs.find(c => c.id === this.selectedCharacterId);
            if (!char) return;
            
            // 制限配列を初期化
            if (!char.motionRestrictions) {
                char.motionRestrictions = [];
            }
            
            // トグル
            const index = char.motionRestrictions.indexOf(emotionType);
            if (index >= 0) {
                // 制限解除
                char.motionRestrictions.splice(index, 1);
                console.log(`✅ ${char.name}: ${emotionType} 制限解除`);
            } else {
                // 制限追加
                char.motionRestrictions.push(emotionType);
                
                // sexyの場合はsexy_strongも追加
                if (emotionType === 'sexy' && !char.motionRestrictions.includes('sexy_strong')) {
                    char.motionRestrictions.push('sexy_strong');
                }
                
                console.log(`🚫 ${char.name}: ${emotionType} 制限追加`);
            }
            
            // 設定を保存
            this.saveConfigs();
            
            // ボタンUIを更新
            this.updateMotionRestrictionButtons(this.selectedCharacterId);
            
            // Directorに制限を適用
            this.applyMotionRestrictionsToDirector(this.selectedCharacterId);
        }
        
        /**
         * モーション制限ボタンの表示を更新
         */
        updateMotionRestrictionButtons(charId) {
            const char = this.characterConfigs.find(c => c.id === charId);
            const restrictions = char?.motionRestrictions || [];
            
            const btnHappy = document.getElementById('mc-restrict-happy-strong');
            const btnSexy = document.getElementById('mc-restrict-sexy');
            const btnAngry = document.getElementById('mc-restrict-angry');
            
            if (btnHappy) {
                btnHappy.classList.toggle('active', restrictions.includes('happy_strong'));
            }
            if (btnSexy) {
                btnSexy.classList.toggle('active', restrictions.includes('sexy'));
            }
            if (btnAngry) {
                btnAngry.classList.toggle('active', restrictions.includes('angry_strong'));
            }
        }
        
        /**
         * Directorにモーション制限を適用
         */
        applyMotionRestrictionsToDirector(charId) {
            if (!this.manager.director || !this.manager.director.setCharacterEmotionRestrictions) {
                console.warn('⚠️ Directorが制限機能に対応していません');
                return;
            }
            
            const char = this.characterConfigs.find(c => c.id === charId);
            const restrictions = char?.motionRestrictions || [];
            
            this.manager.director.setCharacterEmotionRestrictions(charId, restrictions);
        }
        
        /**
         * 全キャラクターのモーション制限をDirectorに適用
         */
        applyAllMotionRestrictionsToDirector() {
            if (!this.manager.director || !this.manager.director.setCharacterEmotionRestrictions) {
                return;
            }
            
            for (const char of this.characterConfigs) {
                if (char.motionRestrictions && char.motionRestrictions.length > 0) {
                    this.manager.director.setCharacterEmotionRestrictions(char.id, char.motionRestrictions);
                }
            }
            
            console.log('🎭 全キャラクターのモーション制限を適用');
        }
        
        toggleMinimize() {
            this.isMinimized = !this.isMinimized;
            document.getElementById('mc-body').classList.toggle('minimized', this.isMinimized);
            document.getElementById('mc-minimize').textContent = this.isMinimized ? '＋' : '−';
        }
        
        makeDraggable(element, handle) {
            let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
            handle.onmousedown = (e) => {
                e.preventDefault();
                pos3 = e.clientX; pos4 = e.clientY;
                document.onmouseup = () => { document.onmouseup = null; document.onmousemove = null; };
                document.onmousemove = (e) => {
                    e.preventDefault();
                    pos1 = pos3 - e.clientX; pos2 = pos4 - e.clientY;
                    pos3 = e.clientX; pos4 = e.clientY;
                    element.style.top = (element.offsetTop - pos2) + "px";
                    element.style.left = (element.offsetLeft - pos1) + "px";
                };
            };
        }
        
        show() { this.panel.style.display = 'block'; }
        hide() { this.panel.style.display = 'none'; }
        
        // ========================================
        // ★ 発言順序管理機能
        // ========================================
        
        renderSpeakingOrder() {
            if (!this.speakingOrderList) return;
            
            const enabledChars = this.characterConfigs.filter(c => c.enabled);
            
            if (enabledChars.length === 0) {
                this.speakingOrderList.innerHTML = '<div style="text-align:center;color:#666;padding:10px;font-size:10px;">キャラクターを有効にしてください</div>';
                return;
            }
            
            this.speakingOrderList.innerHTML = '';
            
            enabledChars.forEach((char, index) => {
                const item = document.createElement('div');
                item.className = 'mc-order-item';
                item.draggable = true;
                item.dataset.charId = char.id;
                item.dataset.index = index;
                
                const isFirst = index === 0;
                const isLast = index === enabledChars.length - 1;
                
                item.innerHTML = `
                    <span class="mc-order-handle" title="ドラッグで移動">≡</span>
                    <span class="mc-order-number">${index + 1}</span>
                    <span class="mc-order-name">${char.name}</span>
                    <div class="mc-order-controls">
                        <button class="mc-order-btn up" title="上へ" ${isFirst ? 'disabled' : ''}>▲</button>
                        <button class="mc-order-btn down" title="下へ" ${isLast ? 'disabled' : ''}>▼</button>
                    </div>
                `;
                
                // ▲▼ボタンイベント
                item.querySelector('.mc-order-btn.up').addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.moveSpeakingOrder(index, index - 1);
                });
                
                item.querySelector('.mc-order-btn.down').addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.moveSpeakingOrder(index, index + 1);
                });
                
                // ドラッグイベント
                this.setupOrderDragEvents(item, index);
                
                this.speakingOrderList.appendChild(item);
            });
        }
        
        setupOrderDragEvents(item, index) {
            item.addEventListener('dragstart', (e) => {
                item.classList.add('dragging');
                e.dataTransfer.effectAllowed = 'move';
                e.dataTransfer.setData('text/plain', index.toString());
                this.draggedIndex = index;
            });
            
            item.addEventListener('dragend', () => {
                item.classList.remove('dragging');
                this.speakingOrderList.querySelectorAll('.mc-order-item').forEach(el => {
                    el.classList.remove('drag-over');
                });
                this.draggedIndex = null;
            });
            
            item.addEventListener('dragover', (e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
                const currentIndex = parseInt(item.dataset.index);
                if (this.draggedIndex !== null && this.draggedIndex !== currentIndex) {
                    item.classList.add('drag-over');
                }
            });
            
            item.addEventListener('dragleave', () => {
                item.classList.remove('drag-over');
            });
            
            item.addEventListener('drop', (e) => {
                e.preventDefault();
                item.classList.remove('drag-over');
                const fromIndex = parseInt(e.dataTransfer.getData('text/plain'));
                const toIndex = parseInt(item.dataset.index);
                if (fromIndex !== toIndex) {
                    this.moveSpeakingOrder(fromIndex, toIndex);
                }
            });
        }
        
        moveSpeakingOrder(fromIndex, toIndex) {
            const enabledChars = this.characterConfigs.filter(c => c.enabled);
            
            if (fromIndex < 0 || fromIndex >= enabledChars.length) return;
            if (toIndex < 0 || toIndex >= enabledChars.length) return;
            if (fromIndex === toIndex) return;
            
            const movedChar = enabledChars[fromIndex];
            const targetChar = enabledChars[toIndex];
            
            const fromFullIndex = this.characterConfigs.findIndex(c => c.id === movedChar.id);
            const toFullIndex = this.characterConfigs.findIndex(c => c.id === targetChar.id);
            
            const [removed] = this.characterConfigs.splice(fromFullIndex, 1);
            const newToIndex = this.characterConfigs.findIndex(c => c.id === targetChar.id);
            const insertAt = fromIndex < toIndex ? newToIndex + 1 : newToIndex;
            this.characterConfigs.splice(insertAt, 0, removed);
            
            this.saveConfigs();
            this.updateDirectorTurnOrder();
            this.renderSpeakingOrder();
            this.renderCharacterList();
            
            console.log(`📋 発言順序変更: ${movedChar.name} を ${fromIndex + 1}番目 → ${toIndex + 1}番目へ`);
        }
        
        resetSpeakingOrder() {
            this.characterConfigs.sort((a, b) => {
                if (a.id.startsWith('char_') && b.id.startsWith('char_')) {
                    return a.id.localeCompare(b.id);
                }
                return a.id.localeCompare(b.id);
            });
            
            this.saveConfigs();
            this.updateDirectorTurnOrder();
            this.renderSpeakingOrder();
            this.renderCharacterList();
            
            console.log('🔄 発言順序をリセットしました');
        }
        
        updateDirectorTurnOrder() {
            if (!this.manager?.director) return;
            
            const enabledChars = this.characterConfigs.filter(c => c.enabled);
            const newOrder = enabledChars.map(c => c.id);
            
            if (this.manager.director.turnOrder) {
                this.manager.director.turnOrder = newOrder;
                console.log('🎬 ディレクターのターン順序更新:', newOrder.map(id => {
                    const char = this.characterConfigs.find(c => c.id === id);
                    return char ? char.name : id;
                }));
            }
        }
        
        // ★★★ トピックのリアルタイム更新 ★★★
        updateTopicRealtime(newTopic) {
            if (!this.manager.director || !this.manager.director.isRunning) {
                return; // 会話中でなければ何もしない
            }
            
            this.manager.director.topic = newTopic;
            console.log(`📝 トピックをリアルタイム更新: "${newTopic.substring(0, 50)}${newTopic.length > 50 ? '...' : ''}"`);
        }
        
        // ★★★ カンペ（systemNote）のリアルタイム更新 ★★★
        updateSystemNoteRealtime() {
            if (!this.manager.director || !this.manager.director.isRunning) {
                return; // 会話中でなければ何もしない
            }
            
            // カンペと関係性を結合
            const systemNote = document.getElementById('mc-system-note')?.value || '';
            const relationshipNotes = document.getElementById('mc-relationship-notes')?.value || this.relationshipNotes || '';
            
            let combinedSystemNote = '';
            if (relationshipNotes) {
                combinedSystemNote += `【キャラクターの関係性・世界観】\n${relationshipNotes}\n\n`;
            }
            if (systemNote) {
                combinedSystemNote += `【追加指示】\n${systemNote}`;
            }
            
            this.manager.director.systemNote = combinedSystemNote;
            
            const preview = combinedSystemNote.substring(0, 80).replace(/\n/g, ' ');
            console.log(`📝 カンペをリアルタイム更新: "${preview}${combinedSystemNote.length > 80 ? '...' : ''}"`);
        }
        
        // ★ 自動配置モードを有効化
        activateAutoPlacement() {
            // AutoPlacementSystemが読み込まれているか確認
            if (!window.AutoPlacementSystem) {
                alert('⚠️ 自動配置システムが読み込まれていません');
                return;
            }
            
            // インスタンスがなければ作成
            if (!this.autoPlacement) {
                this.autoPlacement = new window.AutoPlacementSystem(this.manager);
            }
            
            // 有効化
            this.autoPlacement.activate();
        }
        
        // ★★★ トピックを強制更新 ★★★
        forceUpdateTopic() {
            const newTopic = document.getElementById('mc-topic').value;
            
            if (!this.manager.director) {
                console.log('⚠️ 会話が開始されていません');
                return;
            }
            
            // トピックを更新
            this.manager.director.topic = newTopic;
            
            // ★★★ 先読みパイプラインをクリア（重要！）★★★
            // 現在再生中のエントリ以外を削除
            if (this.manager.director.pipeline) {
                const currentlyPlaying = this.manager.director.pipeline.find(e => e.status === 'playing');
                if (currentlyPlaying) {
                    // 再生中のものだけ残す
                    this.manager.director.pipeline = [currentlyPlaying];
                    console.log('🗑️ 先読みパイプラインをクリア（再生中のものは保持）');
                } else {
                    this.manager.director.pipeline = [];
                    console.log('🗑️ 先読みパイプラインを完全クリア');
                }
            }
            
            // ボタンの視覚的フィードバック
            const btn = document.getElementById('mc-update-topic');
            const originalText = btn.textContent;
            btn.textContent = '✅ 更新完了!';
            btn.style.background = 'linear-gradient(135deg, #10b981 0%, #059669 100%)';
            
            setTimeout(() => {
                btn.textContent = originalText;
                btn.style.background = '';
            }, 1500);
            
            console.log(`📝 トピックを強制更新: "${newTopic}"`);
            console.log(`📝 次のターンから即座に反映されます！`);
            
            // イベント発火（他のシステムに通知）
            window.dispatchEvent(new CustomEvent('multichar:topicUpdated', {
                detail: { topic: newTopic, forced: true, pipelineCleared: true }
            }));
        }
        
        // ★★★ カンペを全員に伝える ★★★
        sendKanpeToAll() {
            const systemNote = document.getElementById('mc-system-note')?.value || '';
            const relationshipNotes = document.getElementById('mc-relationship-notes')?.value || this.relationshipNotes || '';
            
            if (!systemNote && !relationshipNotes) {
                alert('⚠️ カンペまたは関係性設定を入力してください');
                return;
            }
            
            if (!this.manager.director) {
                console.log('⚠️ 会話が開始されていません');
                return;
            }
            
            // カンペと関係性を結合
            let combinedSystemNote = '';
            if (relationshipNotes) {
                combinedSystemNote += `【キャラクターの関係性・世界観】\n${relationshipNotes}\n\n`;
            }
            if (systemNote) {
                combinedSystemNote += `【★★★ 編集者からの緊急指示 ★★★】\n${systemNote}\n\n上記の指示に従って、次の発言から即座に反映してください。`;
            }
            
            // DirectorのsystemNoteを更新
            this.manager.director.systemNote = combinedSystemNote;
            
            // ボタンの視覚的フィードバック
            const btn = document.getElementById('mc-send-kanpe');
            btn.textContent = '✅ 伝えました!';
            btn.classList.add('sent');
            
            setTimeout(() => {
                btn.textContent = '📢 このカンペを伝える';
                btn.classList.remove('sent');
            }, 2000);
            
            console.log(`📢 カンペを全員に伝達:`);
            console.log(`   指示内容: ${systemNote.substring(0, 50)}${systemNote.length > 50 ? '...' : ''}`);
            
            // イベント発火（他のシステムに通知）
            window.dispatchEvent(new CustomEvent('multichar:kanpeSent', {
                detail: { 
                    systemNote: systemNote,
                    relationshipNotes: relationshipNotes,
                    combined: combinedSystemNote,
                    timestamp: Date.now()
                }
            }));
        }
        
        // ========================================
        // ★ 行動制御システム
        // ========================================
        
        initBehaviorManager() {
            if (this.behaviorManager) return this.behaviorManager;
            
            if (window.CharacterBehaviorManager && this.manager) {
                this.behaviorManager = new window.CharacterBehaviorManager(this.manager);
                this.behaviorManager.start();
                
                // ★ ロード済みVRMから直接Behaviorを作成（会話開始前でも動くように）
                const loadedVRMs = this.manager.loadedVRMs;
                if (loadedVRMs && loadedVRMs.size > 0) {
                    loadedVRMs.forEach((vrmData, charId) => {
                        if (vrmData.vrm && !this.behaviorManager.getBehavior(charId)) {
                            // 仮のCharacterUnitオブジェクトを作成
                            const charConfig = this.characterConfigs.find(c => c.id === charId);
                            const pseudoUnit = {
                                id: charId,
                                name: charConfig?.name || vrmData.name || charId,
                                vrm: vrmData.vrm,
                                mixer: vrmData.mixer,
                                enabled: charConfig?.enabled !== false
                            };
                            this.behaviorManager.createBehavior(pseudoUnit);
                            console.log(`🎮 ${pseudoUnit.name}: Behavior作成完了`);
                        }
                    });
                }
                
                // 既存のキャラクターにもBehaviorを作成
                const characters = this.manager.getAllCharacters();
                characters.forEach(unit => {
                    if (!this.behaviorManager.getBehavior(unit.id)) {
                        this.behaviorManager.createBehavior(unit);
                    }
                });
                
                console.log(`🎮 行動マネージャー初期化完了 (${this.behaviorManager.behaviors.size}体)`);
            }
            return this.behaviorManager;
        }
        
        renderBehaviorControls() {
            const container = document.getElementById('mc-behavior-individual');
            if (!container) return;
            
            const enabledChars = this.characterConfigs.filter(c => c.enabled);
            
            if (enabledChars.length === 0) {
                container.innerHTML = '<div style="text-align:center;color:#888;font-size:10px;padding:8px;">キャラクターを有効にしてください</div>';
                return;
            }
            
            container.innerHTML = '';
            
            enabledChars.forEach(char => {
                const behavior = this.behaviorManager?.getBehavior(char.id);
                const currentMode = behavior?.currentMode || 'idle';
                
                const otherChars = enabledChars.filter(c => c.id !== char.id);
                const targetOptions = otherChars.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
                
                const row = document.createElement('div');
                row.className = 'mc-behavior-char-row';
                row.dataset.charId = char.id;
                
                row.innerHTML = `
                    <span class="mc-behavior-char-name">${char.name}</span>
                    <div class="mc-behavior-char-btns">
                        <button class="mc-behavior-char-btn ${currentMode === 'idle' ? 'active' : ''}" 
                                data-char-id="${char.id}" data-mode="idle" title="静止">🧍</button>
                        <button class="mc-behavior-char-btn ${currentMode === 'follow' ? 'active' : ''}" 
                                data-char-id="${char.id}" data-mode="follow" title="追跡">🏃</button>
                        <button class="mc-behavior-char-btn ${currentMode === 'flee' ? 'active' : ''}" 
                                data-char-id="${char.id}" data-mode="flee" title="逃走">💨</button>
                        <button class="mc-behavior-char-btn ${currentMode === 'random' ? 'active' : ''}" 
                                data-char-id="${char.id}" data-mode="random" title="ランダム">🎲</button>
                        <button class="mc-behavior-char-btn ${currentMode === 'waypoint' ? 'waypoint' : ''}" 
                                data-char-id="${char.id}" data-mode="waypoint" title="目的地">📍</button>
                        <button class="mc-behavior-char-btn ${currentMode === 'follow-character' ? 'active' : ''}" 
                                data-char-id="${char.id}" data-mode="follow-character" title="キャラ追跡">👥</button>
                    </div>
                    ${otherChars.length > 0 ? `
                        <select class="mc-behavior-target-select" data-char-id="${char.id}" title="追跡対象">
                            <option value="">対象</option>
                            ${targetOptions}
                        </select>
                    ` : ''}
                    <span class="mc-behavior-char-status" data-char-id="${char.id}">待機</span>
                `;
                
                container.appendChild(row);
                
                // ボタンイベント
                row.querySelectorAll('.mc-behavior-char-btn').forEach(btn => {
                    btn.addEventListener('click', () => {
                        const charId = btn.dataset.charId;
                        const mode = btn.dataset.mode;
                        
                        if (mode === 'follow-character') {
                            const select = row.querySelector('.mc-behavior-target-select');
                            const targetId = select?.value;
                            if (!targetId) {
                                alert('追跡対象を選択してください');
                                return;
                            }
                            this.setCharacterBehaviorMode(charId, mode, { targetCharacterId: targetId });
                        } else {
                            this.setCharacterBehaviorMode(charId, mode);
                        }
                        
                        row.querySelectorAll('.mc-behavior-char-btn').forEach(b => {
                            b.classList.remove('active', 'waypoint');
                        });
                        btn.classList.add(mode === 'waypoint' ? 'waypoint' : 'active');
                    });
                });
            });
            
            // 状態更新コールバックを設定
            if (this.behaviorManager) {
                this.behaviorManager.behaviors.forEach(behavior => {
                    behavior.onStateChange = (b, state) => {
                        const statusEl = container.querySelector(`.mc-behavior-char-status[data-char-id="${b.id}"]`);
                        if (statusEl) statusEl.textContent = state;
                    };
                });
            }
        }
        
        setAllBehaviorMode(mode) {
            this.initBehaviorManager();
            if (this.behaviorManager) {
                this.behaviorManager.setAllMode(mode);
                
                document.querySelectorAll('.mc-behavior-char-btn').forEach(btn => {
                    btn.classList.remove('active', 'waypoint');
                    if (btn.dataset.mode === mode) {
                        btn.classList.add(mode === 'waypoint' ? 'waypoint' : 'active');
                    }
                });
                
                console.log(`🚶 全キャラ: 行動モード → ${mode}`);
            }
        }
        
        setCharacterBehaviorMode(characterId, mode, options = {}) {
            this.initBehaviorManager();
            if (this.behaviorManager) {
                this.behaviorManager.setMode(characterId, mode, options);
                
                if (mode === 'waypoint') {
                    this.behaviorManager.enableWaypointMode(characterId);
                    const statusEl = document.querySelector(`.mc-behavior-char-status[data-char-id="${characterId}"]`);
                    if (statusEl) statusEl.textContent = 'クリック待ち...';
                }
                
                console.log(`🚶 ${characterId}: 行動モード → ${mode}`, options);
            }
        }
    }
    
    window.MultiCharacterUI = MultiCharacterUI;
    
    // ========================================
    // model-context-menu.js のVRMクリック検出を拡張
    // ========================================
    
    function patchContextMenuForMultiVRM() {
        // model-context-menu.jsが読み込まれるまで待つ
        if (!window.selectedVRM && !document.getElementById('model-context-menu')) {
            setTimeout(patchContextMenuForMultiVRM, 500);
            return;
        }
        
        const canvas = document.querySelector('canvas');
        if (!canvas) {
            setTimeout(patchContextMenuForMultiVRM, 500);
            return;
        }
        
        // 既存のcontextmenuイベントをキャプチャフェーズで先に処理
        canvas.addEventListener('contextmenu', function(e) {
            // マルチキャラクターVRMをチェック
            if (!window.multiCharManager || !window.THREE) return;
            
            const rect = canvas.getBoundingClientRect();
            const mouse = new window.THREE.Vector2();
            mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
            mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
            
            const raycaster = new window.THREE.Raycaster();
            raycaster.setFromCamera(mouse, window.app.camera);
            
            // マルチキャラクターVRMをチェック
            for (const [charId, vrmData] of window.multiCharManager.loadedVRMs) {
                if (!vrmData.vrm || !vrmData.vrm.scene) continue;
                
                // メインVRMは通常の処理に任せる
                if (vrmData.isMain) continue;
                
                const vrmMeshes = [];
                vrmData.vrm.scene.traverse(child => {
                    if (child.isMesh || child.isSkinnedMesh) {
                        vrmMeshes.push(child);
                    }
                });
                
                const intersects = raycaster.intersectObjects(vrmMeshes, true);
                if (intersects.length > 0) {
                    // マルチキャラVRMをクリックした
                    e.preventDefault();
                    e.stopPropagation();
                    
                    // window.selectedVRMを設定
                    window.selectedVRM = vrmData.vrm;
                    window.selectedPhysicsObject = null;
                    
                    // VRM基準スケールを保存
                    if (!vrmData.vrm._multiCharBaseScale) {
                        vrmData.vrm._multiCharBaseScale = vrmData.vrm.scene.scale.x;
                    }
                    window.vrmBaseScale = vrmData.vrm._multiCharBaseScale;
                    
                    // コンテキストメニューを表示
                    showMultiCharVRMContextMenu(e.clientX, e.clientY, vrmData.name || charId, charId);
                    
                    console.log(`📋 マルチキャラVRM右クリック: ${vrmData.name} (${charId})`);
                    return;
                }
            }
        }, true); // captureフェーズ
        
        console.log('✅ マルチVRM右クリック検出パッチ適用');
    }
    
    // マルチキャラVRM用コンテキストメニュー表示
    function showMultiCharVRMContextMenu(x, y, name, charId) {
        const contextMenu = document.getElementById('model-context-menu');
        if (!contextMenu) return;
        
        // ターゲット名を設定
        const targetNameEl = document.getElementById('ctx-target-name');
        if (targetNameEl) {
            targetNameEl.textContent = `🎭 ${name}`;
        }
        
        // VRM用にメニュー項目を調整
        const deleteBtn = contextMenu.querySelector('.ctx-delete');
        const vrmOnlyItems = contextMenu.querySelectorAll('.ctx-vrm-only');
        
        if (deleteBtn) deleteBtn.style.display = 'none';
        vrmOnlyItems.forEach(item => item.style.display = 'flex');
        
        // メニュー表示
        contextMenu.style.display = 'block';
        contextMenu.style.left = x + 'px';
        contextMenu.style.top = y + 'px';
        
        // 画面外にはみ出さないよう調整
        const rect = contextMenu.getBoundingClientRect();
        if (rect.right > window.innerWidth) {
            contextMenu.style.left = (window.innerWidth - rect.width - 10) + 'px';
        }
        if (rect.bottom > window.innerHeight) {
            contextMenu.style.top = (window.innerHeight - rect.height - 10) + 'px';
        }
    }
    
    // ========================================
    // 自動初期化
    // ========================================
    
    function initMultiCharacterSystem() {
        if (!window.app || !window.CharacterUnit || !window.DialogueDirector) {
            console.log('⏳ 依存待機中...');
            setTimeout(initMultiCharacterSystem, 500);
            return;
        }
        
        console.log('🎭 マルチキャラクターシステム初期化開始...');
        
        const manager = new MultiCharacterManager(window.app);
        window.multiCharManager = manager;
        
        if (window.aiDirectorCamera) {
            manager.setAIDirectorCamera(window.aiDirectorCamera);
            if (window.aiDirectorCamera.enableMultiCharMode) {
                window.aiDirectorCamera.enableMultiCharMode();
            }
        }
        
        const ui = new MultiCharacterUI(manager);
        window.multiCharUI = ui;
        
        // 右クリックメニュー拡張
        patchContextMenuForMultiVRM();
        
        console.log('✅ マルチキャラクターシステム v2.3 初期化完了 (voiceModel修正)');
    }
    
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => setTimeout(initMultiCharacterSystem, 2000));
    } else {
        setTimeout(initMultiCharacterSystem, 2000);
    }
    
    console.log('📦 Multi-Character System v2.5 ロード完了 (APIキーJSON対応)');
})();
