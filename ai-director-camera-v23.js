/**
 * AI Director Camera System
 * Version: 2.3.2
 * 
 * - 4人対応（1人A, 1人B, 1人C, 1人D + Mocap + デフォルト）
 * - AI演出時に話者を自動検出してカメラターゲット
 * - マルチキャラ会話のDialogueDirector連携
 * - ★ v2.3.1: ツーショット/グループ対応、切り替えモード追加（固定/ランダム/文脈解析）
 */

class AIDirectorCamera {
    constructor(app) {
        this.app = app;
        this.isEnabled = false;
        this.aiProvider = 'rule';
        
        this.distanceMultiplier = 1.0;
        this.showBodyShots = false;
        
        // アングル回転機能
        this.angleRotationEnabled = false;
        this.currentCameraWork = null;
        this.cameraWorkStartTime = 0;
        this.rotationAnimationId = null;
        
        this.angleRotationConfig = {
            speed: 0.015,
            minDistance: 1.0,
            maxDistance: 5.0,
        };
        
        this.cameraWorkTypes = {
            'orbit-slow-left': { name: '🔄 左回り', category: 'orbit' },
            'orbit-slow-right': { name: '🔄 右回り', category: 'orbit' },
            'tilt-up-slow': { name: '↕️ 上へ', category: 'tilt' },
            'tilt-down-slow': { name: '↕️ 下へ', category: 'tilt' },
            'dolly-in-slow': { name: '🔍 寄り', category: 'dolly' },
            'dolly-out-slow': { name: '🔍 引き', category: 'dolly' },
            'track-left-slow': { name: '◀️ 左移動', category: 'track' },
            'track-right-slow': { name: '▶️ 右移動', category: 'track' },
            'crane-up-slow': { name: '🏗️ クレーンアップ', category: 'crane' },
            'crane-down-slow': { name: '🏗️ クレーンダウン', category: 'crane' },
            'face-closeup': { name: '✨ 顔寄り', category: 'special' },
            'orbit-dolly-in': { name: '🎬 回り込み＋寄り', category: 'combo' },
        };
        
        this.enabledCameraWorkCategories = {
            orbit: true, tilt: true, dolly: true,
            track: true, crane: true, special: true, combo: true,
        };
        
        this.rotationState = {
            theta: 0, phi: Math.PI / 2, radius: 2.5,
            goalTheta: 0, goalPhi: Math.PI / 2, goalRadius: 2.5,
            trackOffset: { x: 0, z: 0 },
            goalTrackOffset: { x: 0, z: 0 },
            baseTargetPos: { x: 0, y: 1.2, z: 0 },
        };
        
        this.faceShotSizes = {
            'ECU': { distance: 0.3, targetBone: 'head', heightOffset: 0.05, description: 'アイショット', emotion: '目のクローズアップ', icon: '👁️' },
            'CU': { distance: 0.5, targetBone: 'head', heightOffset: 0, description: 'フェイス', emotion: '顔のクローズアップ', icon: '😊' },
            'MCU': { distance: 0.9, targetBone: 'chest', heightOffset: 0.1, description: 'バストアップ', emotion: '胸から上', icon: '👔' },
            'MS': { distance: 1.3, targetBone: 'spine', heightOffset: 0, description: 'ミディアム', emotion: '腰から上', icon: '🧍‍♂️' },
            'COWBOY': { distance: 1.8, targetBone: 'hips', heightOffset: 0.3, description: 'カウボーイ', emotion: '膝上', icon: '🤠' },
            'FS': { distance: 2.5, targetBone: 'hips', heightOffset: 0, description: 'フル', emotion: '全身', icon: '🧍' },
            'LS': { distance: 4.0, targetBone: 'hips', heightOffset: 0, description: 'ロング', emotion: '全身+環境', icon: '🏞️' },
            'TWO': { distance: 3.0, targetBone: 'center', heightOffset: 0.2, description: 'ツーショット', emotion: '2人を同時に', icon: '👥' },
            'GROUP': { distance: 4.5, targetBone: 'center', heightOffset: 0.3, description: 'グループ', emotion: '全員を写す', icon: '👨‍👩‍👧‍👦' }
        };
        
        this.bodyShotSizes = {
            'UPPER': { distance: 1.1, targetBone: 'chest', heightOffset: 0, description: '上半身', emotion: 'upper body', icon: '👕' },
            'FEET_OUT': { distance: 1.6, targetBone: 'spine', heightOffset: 0.1, description: '足切れ', emotion: 'feet out of frame', icon: '🦵' },
            'WIDE': { distance: 3.5, targetBone: 'hips', heightOffset: 0, description: 'ワイド', emotion: 'wide shot', icon: '🏠' },
            'VERY_WIDE': { distance: 6.0, targetBone: 'hips', heightOffset: 0, description: '超ワイド', emotion: 'very wide shot', icon: '🌄' },
            'THIRD_PERSON': { distance: 1.8, targetBone: 'head', heightOffset: 0.3, description: 'サードパーソン', emotion: '後頭部越し', icon: '🎮', behindCamera: true },
            'ARM_FOCUS': { distance: 0.6, targetBone: 'leftUpperArm', heightOffset: 0, description: '腕に注目', emotion: 'armpit focus', icon: '💪' },
            'HAND_FOCUS': { distance: 0.4, targetBone: 'leftHand', heightOffset: 0, description: '手に注目', emotion: 'hand focus', icon: '🤚' },
            'NAVEL_FOCUS': { distance: 0.7, targetBone: 'spine', heightOffset: -0.15, description: 'お腹に注目', emotion: 'navel focus', icon: '🫃' },
            'BACK_FOCUS': { distance: 1.0, targetBone: 'chest', heightOffset: 0, description: '背中に注目', emotion: 'back focus', icon: '🔙', behindCamera: true },
            'CROTCH_FOCUS': { distance: 0.8, targetBone: 'hips', heightOffset: -0.15, description: '股間に注目', emotion: 'crotch focus', icon: '🩲' },
            'HIP_FOCUS': { distance: 0.8, targetBone: 'hips', heightOffset: 0, description: '腰に注目', emotion: 'hip focus', icon: '💃' },
            'ASS_FOCUS': { distance: 0.8, targetBone: 'hips', heightOffset: -0.1, description: '尻に注目', emotion: 'ass focus', icon: '🍑', behindCamera: true },
            'THIGH_FOCUS': { distance: 0.9, targetBone: 'leftUpperLeg', heightOffset: 0, description: '太ももに注目', emotion: 'thigh focus', icon: '🦵' },
            'FOOT_FOCUS': { distance: 0.6, targetBone: 'leftFoot', heightOffset: 0, description: '足に注目', emotion: 'foot focus', icon: '🦶' }
        };
        
        this.shotSizes = { ...this.faceShotSizes, ...this.bodyShotSizes };
        
        this.cameraAngles = {
            'FRONT': { theta: 0, description: '正面' },
            'FRONT_LEFT': { theta: Math.PI / 6, description: '正面やや左' },
            'FRONT_RIGHT': { theta: -Math.PI / 6, description: '正面やや右' },
            'DIAGONAL_LEFT': { theta: Math.PI / 4, description: '斜め45度左' },
            'DIAGONAL_RIGHT': { theta: -Math.PI / 4, description: '斜め45度右' },
            'SIDE_LEFT': { theta: Math.PI / 2, description: '真横左' },
            'SIDE_RIGHT': { theta: -Math.PI / 2, description: '真横右' },
            'OTS_LEFT': { theta: Math.PI / 5, description: '肩越し左' },
            'OTS_RIGHT': { theta: -Math.PI / 5, description: '肩越し右' }
        };
        
        this.cameraHeights = {
            'EYE_LEVEL': { phi: Math.PI / 2, description: 'アイレベル' },
            'LOW_ANGLE': { phi: Math.PI * 0.6, description: 'ローアングル' },
            'HIGH_ANGLE': { phi: Math.PI * 0.4, description: 'ハイアングル' },
            'EXTREME_LOW': { phi: Math.PI * 0.7, description: '極端なロー' },
            'BIRDS_EYE': { phi: Math.PI * 0.25, description: '俯瞰' }
        };
        
        // ★ 4人対応 + ユーザーのターゲット定義
        this.targetDefinitions = {
            'char_A': { label: '1人A', icon: '🅰️', source: 'character', characterId: 'char_A' },
            'char_B': { label: '1人B', icon: '🅱️', source: 'character', characterId: 'char_B' },
            'char_C': { label: '1人C', icon: '©️', source: 'character', characterId: 'char_C' },
            'char_D': { label: '1人D', icon: '🇩', source: 'character', characterId: 'char_D' },
            'mocap': { label: 'Mocap', icon: '🎭', source: 'mocap' },
            'user': { label: 'ユーザー', icon: '👤', source: 'mocap_user' },
            'default': { label: 'デフォルト', icon: '👤', source: 'default' },
            'center': { label: '全員中央', icon: '👥', source: 'center' }
        };
        
        this.currentShot = { size: 'MCU', angle: 'FRONT', height: 'EYE_LEVEL', target: 'default' };
        this.shotHistory = [];
        this.lastAIDecision = null;
        this.decisionInterval = null;
        this.switchTimeout = null;
        
        // ★ 話者追従設定
        this.followSpeaker = true;
        this.lastDetectedSpeaker = null;
        this.speakerChangeCount = 0;
        
        // ★ ローアングル除外設定
        this.excludeLowAngles = false;
        
        // ★ ツーショット/グループショット設定
        this.includeTwoShot = true;      // ツーショットを含めるか
        this.includeGroupShot = true;    // グループショットを含めるか
        this.twoShotProbability = 0.15;  // ツーショットの確率（15%）
        this.groupShotProbability = 0.08; // グループショットの確率（8%）
        
        // ★ v2.3.1: 切り替えモード設定
        this.switchMode = 'fixed';        // 'fixed', 'random', 'context'
        this.randomSwitchMin = 2.0;       // ランダムモード最小間隔（秒）
        this.randomSwitchMax = 10.0;      // ランダムモード最大間隔（秒）
        
        // ★ 文脈解析用
        this.contextAnalyzer = {
            lastAnalyzedText: '',
            lastShotTime: Date.now(),
            sentenceBuffer: [],
            emotionKeywords: {
                closeup: ['！', '!', '？', '?', 'えっ', 'うわ', 'おお', 'すごい', 'やば', 'マジ', '本当', 'ほんと', '嘘', 'うそ', 'びっくり', '驚', 'ショック', '感動', '泣', '嬉し', '悲し', '怒', '怖'],
                medium: ['それで', 'つまり', '要するに', 'だから', 'なので', 'ところで', 'さて', '実は', '実際', '考えて', '思う', '説明'],
                long: ['。。。', '...', '……', 'しーん', '静か', '沈黙', '間', 'ふう', 'はぁ', '終わり', '以上'],
                twoshot: ['あなた', 'お前', '君', 'きみ', 'あんた', '貴方', '貴女', '二人', 'ふたり', '一緒', '私たち', '俺たち'],
                group: ['みんな', '皆', '全員', '皆さん', 'みなさん', '私達', '俺達', '僕達', 'チーム', 'グループ']
            }
        };
        
        // ターゲット自動選択
        this.autoTargetEnabled = false;
        this.autoTargetInterval = null;
        this.autoTargetCheckRate = 200;
        
        this.config = {
            switchInterval: 5000,
            aiDecisionInterval: 10000,
            transitionDuration: 300,
            captureForAI: true,
        };
        
        this.mode = 'ai-director';
        this.panel = null;
        
        // ★ v2.3.2: 録画連動設定
        this.recordOnStart = false;  // AI演出開始時に録画も開始するか（デフォルトOFF）
        
        this.init();
    }
    
    init() {
        console.log('🎬 AI Director Camera V2.3.2 初期化中...');
        this.createUI();
        this.loadSettings();
        this.setupContextMonitoring();
        console.log('✅ AI Director Camera V2.3.2 初期化完了');
    }
    
    // ========================================
    // ★ v2.3.1: 文脈監視システム
    // ========================================
    
    setupContextMonitoring() {
        // パイプラインの再生状態を監視
        window.addEventListener('playbackStart', (e) => {
            if (this.switchMode === 'context' && this.isEnabled && e.detail) {
                this.onPlaybackTextStart(e.detail.text || e.detail.responseText || '');
            }
        });
        
        // マルチキャラのターン開始を監視
        window.addEventListener('multichar:turnStart', (e) => {
            if (this.switchMode === 'context' && this.isEnabled && e.detail) {
                this.onPlaybackTextStart(e.detail.text || e.detail.responseText || '');
            }
        });
        
        // 定期的にパイプラインをチェック
        setInterval(() => {
            if (this.switchMode === 'context' && this.isEnabled) {
                this.checkPipelineForContext();
            }
        }, 300);
    }
    
    /**
     * 再生テキスト開始時の処理
     */
    onPlaybackTextStart(text) {
        if (!text || text === this.contextAnalyzer.lastAnalyzedText) return;
        
        this.contextAnalyzer.lastAnalyzedText = text;
        this.contextAnalyzer.sentenceBuffer = this.splitIntoSentences(text);
        this.contextAnalyzer.currentSentenceIndex = 0;
        
        console.log(`📖 文脈解析開始: ${this.contextAnalyzer.sentenceBuffer.length}文`);
        
        // 最初の文から解析してショットを決定
        this.analyzeAndSwitchByContext();
    }
    
    /**
     * テキストを文に分割
     */
    splitIntoSentences(text) {
        // 句読点や感嘆符で分割
        const sentences = text.split(/(?<=[。！？!?…、])/g)
            .map(s => s.trim())
            .filter(s => s.length > 0);
        return sentences.length > 0 ? sentences : [text];
    }
    
    /**
     * パイプラインをチェックして文脈解析
     */
    checkPipelineForContext() {
        const director = window.multiCharManager?.director;
        if (!director || !director.pipeline) return;
        
        const playingEntry = director.pipeline.find(e => e.status === 'playing');
        if (playingEntry && playingEntry.responseText) {
            if (playingEntry.responseText !== this.contextAnalyzer.lastAnalyzedText) {
                this.onPlaybackTextStart(playingEntry.responseText);
            }
        }
    }
    
    /**
     * 文脈を解析してショットを切り替え
     */
    analyzeAndSwitchByContext() {
        const sentences = this.contextAnalyzer.sentenceBuffer;
        if (!sentences || sentences.length === 0) return;
        
        // 全文を結合して解析
        const fullText = sentences.join('');
        
        // キーワードマッチングでショットタイプを決定
        const shotType = this.analyzeTextForShotType(fullText);
        const decision = this.createContextBasedDecision(shotType, fullText);
        
        if (decision) {
            this.applyDecision(decision);
            
            // 次の切り替えタイミングを文脈に基づいて決定
            const nextInterval = this.calculateContextBasedInterval(fullText);
            this.scheduleNextContextSwitch(nextInterval);
        }
    }
    
    /**
     * テキストからショットタイプを分析
     */
    analyzeTextForShotType(text) {
        const keywords = this.contextAnalyzer.emotionKeywords;
        
        // グループショットのキーワードチェック（最優先）
        if (this.includeGroupShot) {
            for (const kw of keywords.group) {
                if (text.includes(kw)) {
                    return 'group';
                }
            }
        }
        
        // ツーショットのキーワードチェック
        if (this.includeTwoShot) {
            for (const kw of keywords.twoshot) {
                if (text.includes(kw)) {
                    return 'twoshot';
                }
            }
        }
        
        // クローズアップのキーワードチェック（感情的）
        for (const kw of keywords.closeup) {
            if (text.includes(kw)) {
                return 'closeup';
            }
        }
        
        // ロングショットのキーワードチェック（間、静寂）
        for (const kw of keywords.long) {
            if (text.includes(kw)) {
                return 'long';
            }
        }
        
        // ミディアムショットのキーワードチェック（説明的）
        for (const kw of keywords.medium) {
            if (text.includes(kw)) {
                return 'medium';
            }
        }
        
        // デフォルト: テキストの長さに基づく
        if (text.length < 20) {
            return 'closeup';  // 短い発言は顔アップ
        } else if (text.length > 100) {
            return 'medium';   // 長い説明はミディアム
        }
        
        return 'normal';  // 通常
    }
    
    /**
     * 文脈に基づいたショット決定を作成
     */
    createContextBasedDecision(shotType, text) {
        const speakingTarget = this.detectSpeakingCharacter();
        let size, target, angle, height;
        
        switch (shotType) {
            case 'closeup':
                // 感情的 → 顔アップ
                size = Math.random() < 0.6 ? 'CU' : 'MCU';
                target = speakingTarget || this.currentShot.target;
                angle = this.pickRandom(['FRONT', 'DIAGONAL_LEFT', 'DIAGONAL_RIGHT']);
                height = 'EYE_LEVEL';
                break;
                
            case 'medium':
                // 説明的 → ミディアム/カウボーイ
                size = this.pickRandom(['MS', 'COWBOY', 'MCU']);
                target = speakingTarget || this.currentShot.target;
                angle = this.pickRandom(['FRONT', 'DIAGONAL_LEFT', 'DIAGONAL_RIGHT', 'OTS_LEFT', 'OTS_RIGHT']);
                height = this.pickRandom(['EYE_LEVEL', 'EYE_LEVEL', 'HIGH_ANGLE']);
                break;
                
            case 'long':
                // 間、沈黙 → ロング
                size = this.pickRandom(['LS', 'FS', 'WIDE']);
                target = 'center';
                angle = this.pickRandom(['FRONT', 'DIAGONAL_LEFT', 'DIAGONAL_RIGHT']);
                height = this.pickRandom(['EYE_LEVEL', 'HIGH_ANGLE', 'BIRDS_EYE']);
                break;
                
            case 'twoshot':
                // 2人の会話 → ツーショット
                size = 'TWO';
                target = 'center';
                angle = this.pickRandom(['FRONT', 'DIAGONAL_LEFT', 'DIAGONAL_RIGHT']);
                height = 'EYE_LEVEL';
                break;
                
            case 'group':
                // 全員 → グループショット
                size = 'GROUP';
                target = 'center';
                angle = 'FRONT';
                height = this.pickRandom(['EYE_LEVEL', 'HIGH_ANGLE']);
                break;
                
            default:
                // 通常 → バストアップ/ミディアム
                size = this.pickRandom(['MCU', 'MS', 'CU']);
                target = speakingTarget || this.currentShot.target;
                angle = this.pickRandom(['FRONT', 'FRONT_LEFT', 'FRONT_RIGHT', 'DIAGONAL_LEFT', 'DIAGONAL_RIGHT']);
                height = 'EYE_LEVEL';
        }
        
        // ローアングル除外
        if (this.excludeLowAngles && (height === 'LOW_ANGLE' || height === 'EXTREME_LOW')) {
            height = 'EYE_LEVEL';
        }
        
        const reason = `文脈解析: ${shotType} (${text.substring(0, 20)}...)`;
        
        return { size, angle, height, target, reason };
    }
    
    /**
     * 文脈に基づいた次の切り替え間隔を計算
     */
    calculateContextBasedInterval(text) {
        // 文の長さに基づいて間隔を調整
        // 短い文 → 短い間隔、長い文 → 長い間隔
        const baseInterval = 3000; // 3秒ベース
        const lengthFactor = Math.min(text.length / 50, 2.5); // 最大2.5倍
        
        // 感嘆符が多い → 短め
        const exclamationCount = (text.match(/[！!？?]/g) || []).length;
        const exclamationFactor = Math.max(0.5, 1 - exclamationCount * 0.1);
        
        const interval = baseInterval * lengthFactor * exclamationFactor;
        
        // 2〜10秒の範囲に収める
        return Math.max(2000, Math.min(10000, interval));
    }
    
    /**
     * 次の文脈ベース切り替えをスケジュール
     */
    scheduleNextContextSwitch(interval) {
        if (this.switchTimeout) {
            clearTimeout(this.switchTimeout);
        }
        
        this.switchTimeout = setTimeout(() => {
            if (this.isEnabled && this.switchMode === 'context') {
                // 新しいテキストがあれば再解析、なければランダム
                if (this.contextAnalyzer.lastAnalyzedText) {
                    this.analyzeAndSwitchByContext();
                } else {
                    this.decideAndApplyNextShot();
                    this.scheduleNextContextSwitch(this.calculateRandomInterval());
                }
            }
        }, interval);
        
        console.log(`⏱️ 次の切り替え: ${(interval / 1000).toFixed(1)}秒後`);
    }
    
    /**
     * ランダムな間隔を計算
     */
    calculateRandomInterval() {
        const min = this.randomSwitchMin * 1000;
        const max = this.randomSwitchMax * 1000;
        return min + Math.random() * (max - min);
    }
    
    /**
     * ランダムに要素を選択
     */
    pickRandom(array) {
        return array[Math.floor(Math.random() * array.length)];
    }
    
    // ========================================
    // ★ VRM取得ヘルパー（4人対応）
    // ========================================
    
    getVRMByTarget(targetId) {
        const def = this.targetDefinitions[targetId];
        if (!def) return null;
        
        switch (def.source) {
            case 'character':
                return this.getCharacterVRM(def.characterId);
            case 'mocap':
                return window.vmcMocap?.avatarVRM || null;
            case 'mocap_user':
                return window.vmcMocap?.avatarVRM || null;
            case 'default':
                return this.app.vrm || null;
            case 'center':
                return null;
            default:
                return this.app.vrm;
        }
    }
    
    getCharacterVRM(characterId) {
        const manager = window.multiCharUI?.manager;
        if (manager && manager.characters instanceof Map) {
            const character = manager.characters.get(characterId);
            if (character && character.vrm) {
                return character.vrm;
            }
        }
        
        const director = manager?.director;
        if (director && director.characters instanceof Map) {
            const character = director.characters.get(characterId);
            if (character && character.vrm) {
                return character.vrm;
            }
        }
        
        const globalDirector = window.dialogueDirector;
        if (globalDirector && globalDirector.characters instanceof Map) {
            const character = globalDirector.characters.get(characterId);
            if (character && character.vrm) {
                return character.vrm;
            }
        }
        
        return null;
    }
    
    getCharacterVRMFromManager(characterId) {
        const manager = window.multiCharUI?.manager;
        if (manager && manager.characters instanceof Map) {
            const character = manager.characters.get(characterId);
            if (character && character.vrm) {
                return character.vrm;
            }
        }
        return null;
    }
    
    getCenterPosition(boneName) {
        const positions = [];
        
        const manager = window.multiCharUI?.manager;
        if (manager && manager.characters instanceof Map) {
            manager.characters.forEach((char) => {
                if (char.vrm) {
                    const pos = this.getBonePosition(char.vrm, boneName);
                    if (pos) positions.push(pos);
                }
            });
        }
        
        const mocapVRM = window.vmcMocap?.avatarVRM;
        if (mocapVRM) {
            const pos = this.getBonePosition(mocapVRM, boneName);
            if (pos) positions.push(pos);
        }
        
        if (positions.length === 0 && this.app.vrm) {
            const pos = this.getBonePosition(this.app.vrm, boneName);
            if (pos) positions.push(pos);
        }
        
        if (positions.length === 0) {
            return { x: 0, y: 1.2, z: 0 };
        }
        
        const center = {
            x: positions.reduce((sum, p) => sum + p.x, 0) / positions.length,
            y: Math.max(...positions.map(p => p.y)),
            z: positions.reduce((sum, p) => sum + p.z, 0) / positions.length
        };
        
        return center;
    }
    
    // ========================================
    // ★ 話者検出（4人対応）
    // ========================================
    
    detectSpeakingCharacter() {
        const director = window.dialogueDirector;
        if (director && director.currentSpeakerId) {
            const speakerId = director.currentSpeakerId;
            return this.mapSpeakerIdToTarget(speakerId);
        }
        
        const lipSyncResults = this.detectLipSyncSpeaker();
        if (lipSyncResults.speaker) {
            return lipSyncResults.speaker;
        }
        
        return null;
    }
    
    mapSpeakerIdToTarget(speakerId) {
        if (this.targetDefinitions[speakerId]) {
            return speakerId;
        }
        
        const director = window.dialogueDirector;
        if (director) {
            const turnOrder = director.turnOrder;
            const index = turnOrder.indexOf(speakerId);
            if (index >= 0) {
                const targets = ['char-a', 'char-b', 'char-c', 'char-d'];
                if (index < targets.length) {
                    return targets[index];
                }
            }
        }
        
        return 'default';
    }
    
    detectLipSyncSpeaker() {
        const results = [];
        
        if (this.app.vrm) {
            const value = this.getLipSyncValue(this.app.vrm);
            if (value > 0.05) {
                results.push({ target: 'default', value });
            }
        }
        
        const mocapVRM = window.vmcMocap?.avatarVRM;
        if (mocapVRM) {
            const value = this.getLipSyncValue(mocapVRM);
            if (value > 0.05) {
                results.push({ target: 'mocap', value });
            }
        }
        
        const director = window.dialogueDirector;
        if (director) {
            const chars = director.getAllCharacters();
            const targetIds = ['char-a', 'char-b', 'char-c', 'char-d'];
            chars.forEach((char, index) => {
                if (char.vrm && index < targetIds.length) {
                    const value = this.getLipSyncValue(char.vrm);
                    if (value > 0.05) {
                        results.push({ target: targetIds[index], value });
                    }
                }
            });
        }
        
        if (results.length > 0) {
            results.sort((a, b) => b.value - a.value);
            return { speaker: results[0].target, value: results[0].value };
        }
        
        return { speaker: null, value: 0 };
    }
    
    getLipSyncValue(vrm) {
        if (!vrm || !vrm.expressionManager) return 0;
        try {
            return Math.max(
                vrm.expressionManager.getValue('aa') || 0,
                vrm.expressionManager.getValue('ih') || 0,
                vrm.expressionManager.getValue('ou') || 0,
                vrm.expressionManager.getValue('ee') || 0,
                vrm.expressionManager.getValue('oh') || 0
            );
        } catch (e) { return 0; }
    }
    
    // ========================================
    // ★ ターゲット自動選択機能
    // ========================================
    
    startAutoTarget() {
        if (this.autoTargetInterval) {
            clearInterval(this.autoTargetInterval);
        }
        
        this.autoTargetEnabled = true;
        console.log('🎯 ターゲット自動選択開始');
        
        this.autoTargetInterval = setInterval(() => {
            this.checkAndUpdateTarget();
        }, this.autoTargetCheckRate);
        
        this.checkAndUpdateTarget();
        this.updateAutoTargetUI();
    }
    
    stopAutoTarget() {
        if (this.autoTargetInterval) {
            clearInterval(this.autoTargetInterval);
            this.autoTargetInterval = null;
        }
        
        this.autoTargetEnabled = false;
        console.log('🎯 ターゲット自動選択停止');
        this.updateAutoTargetUI();
    }
    
    checkAndUpdateTarget() {
        const speakerId = this.getCurrentSpeakerFromMultiCharUI();
        
        if (speakerId && speakerId !== this.lastDetectedSpeaker) {
            const prevSpeaker = this.lastDetectedSpeaker;
            this.lastDetectedSpeaker = speakerId;
            this.speakerChangeCount++;
            
            const targetInfo = this.targetDefinitions[speakerId] || {};
            console.log(`🎤 話者変更: ${prevSpeaker} → ${speakerId} (${targetInfo.label || speakerId})`);
            
            this.currentShot.target = speakerId;
            this.updateTargetButtonsUI();
            this.updateSpeakerDisplay(speakerId);
            
            if (!this.isEnabled) {
                this.applyCameraPosition();
            }
        }
    }
    
    getCurrentSpeakerFromMultiCharUI() {
        const manager = window.multiCharUI?.manager;
        if (manager) {
            const director = manager.director;
            if (director && director.currentSpeakerId) {
                return this.normalizeSpeakerId(director.currentSpeakerId);
            }
        }
        
        const globalDirector = window.dialogueDirector;
        if (globalDirector && globalDirector.currentSpeakerId) {
            return this.normalizeSpeakerId(globalDirector.currentSpeakerId);
        }
        
        const lipSyncResult = this.detectLipSyncSpeaker();
        if (lipSyncResult.speaker && lipSyncResult.value > 0.1) {
            return lipSyncResult.speaker;
        }
        
        return null;
    }
    
    normalizeSpeakerId(speakerId) {
        if (speakerId.startsWith('char_')) {
            return speakerId;
        }
        
        if (speakerId.startsWith('char-')) {
            const letter = speakerId.replace('char-', '').toUpperCase();
            return `char_${letter}`;
        }
        
        return speakerId;
    }
    
    updateTargetButtonsUI() {
        const target = this.currentShot.target;
        document.querySelectorAll('#target-grid .target-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.target === target);
        });
    }
    
    updateSpeakerDisplay(speakerId) {
        const speakerIndicator = document.getElementById('speaker-indicator');
        const speakerInfo = this.targetDefinitions[speakerId] || {};
        
        if (speakerIndicator) {
            speakerIndicator.textContent = `🎤 話者: ${speakerInfo.icon || ''} ${speakerInfo.label || speakerId}`;
            speakerIndicator.style.display = 'block';
        }
        
        const targetDisplay = document.getElementById('current-shot-target');
        if (targetDisplay) {
            targetDisplay.textContent = `ターゲット: ${speakerInfo.icon || ''} ${speakerInfo.label || speakerId}`;
        }
    }
    
    updateAutoTargetUI() {
        const btn = document.getElementById('auto-target-btn');
        if (btn) {
            if (this.autoTargetEnabled) {
                btn.textContent = '🎯 自動: ON';
                btn.classList.add('active');
            } else {
                btn.textContent = '🎯 自動: OFF';
                btn.classList.remove('active');
            }
        }
        
        const speakerIndicator = document.getElementById('speaker-indicator');
        if (speakerIndicator) {
            speakerIndicator.style.display = this.autoTargetEnabled ? 'block' : 'none';
        }
    }
    
    // ========================================
    // カメラ位置計算
    // ========================================
    
    calculateCameraPosition(target = 'default') {
        const shot = this.currentShot;
        const sizeConfig = this.shotSizes[shot.size];
        const angleConfig = this.cameraAngles[shot.angle];
        const heightConfig = this.cameraHeights[shot.height];
        
        if (!sizeConfig || !angleConfig || !heightConfig) {
            return { position: { x: 0, y: 1.2, z: 3 }, target: { x: 0, y: 1.2, z: 0 } };
        }
        
        // ★ ツーショット/グループショットの場合はcenterを使用
        let effectiveTarget = target;
        if (shot.size === 'TWO' || shot.size === 'GROUP') {
            effectiveTarget = 'center';
        }
        
        let targetPos = this.getTargetPosition(effectiveTarget, sizeConfig.targetBone);
        targetPos.y += sizeConfig.heightOffset;
        
        const facing = this.getCharacterFacing(effectiveTarget);
        const distance = sizeConfig.distance * this.distanceMultiplier;
        
        let theta = sizeConfig.behindCamera ? facing + angleConfig.theta : facing + Math.PI + angleConfig.theta;
        const phi = heightConfig.phi;
        
        const camX = targetPos.x + distance * Math.sin(phi) * Math.sin(theta);
        const camY = targetPos.y + distance * Math.cos(phi);
        const camZ = targetPos.z + distance * Math.sin(phi) * Math.cos(theta);
        
        return { position: { x: camX, y: camY, z: camZ }, target: targetPos, distance, theta, phi };
    }
    
    getTargetPosition(target, boneName) {
        if (target === 'center') {
            return this.getCenterPosition(boneName);
        }
        
        const vrm = this.getVRMByTarget(target);
        if (!vrm) {
            return { x: 0, y: 1.2, z: 0 };
        }
        
        return this.getBonePosition(vrm, boneName) || { x: 0, y: 1.2, z: 0 };
    }
    
    getBonePosition(vrm, boneName) {
        if (!vrm || !vrm.humanoid) return null;
        try {
            const bone = vrm.humanoid.getNormalizedBoneNode(boneName);
            if (bone) {
                const worldPos = new THREE.Vector3();
                bone.getWorldPosition(worldPos);
                return { x: worldPos.x, y: worldPos.y, z: worldPos.z };
            }
        } catch (e) {}
        const scenePos = vrm.scene ? vrm.scene.position : { x: 0, y: 0, z: 0 };
        const heights = { 'head': 1.5, 'chest': 1.2, 'spine': 1.0, 'hips': 0.9, 'leftUpperArm': 1.3, 'leftHand': 0.8, 'leftUpperLeg': 0.6, 'leftFoot': 0.1 };
        return { x: scenePos.x || 0, y: (scenePos.y || 0) + (heights[boneName] || 1.2), z: scenePos.z || 0 };
    }
    
    getCharacterFacing(target) {
        const vrm = this.getVRMByTarget(target);
        if (!vrm || !vrm.humanoid) return 0;
        try {
            const hips = vrm.humanoid.getNormalizedBoneNode('hips');
            if (hips) {
                const worldQuat = new THREE.Quaternion();
                hips.getWorldQuaternion(worldQuat);
                const forward = new THREE.Vector3(0, 0, -1);
                forward.applyQuaternion(worldQuat);
                return Math.atan2(forward.x, forward.z);
            }
        } catch (e) {}
        return 0;
    }
    
    // ========================================
    // ショット設定・適用
    // ========================================
    
    setShot(size, angle, height, target = null) {
        this.currentShot.size = size;
        this.currentShot.angle = angle;
        this.currentShot.height = height;
        if (target) this.currentShot.target = target;
        
        this.shotHistory.push({ ...this.currentShot, timestamp: Date.now() });
        if (this.shotHistory.length > 50) this.shotHistory.shift();
        
        this.applyCameraPosition();
        this.updateShotDisplay();
        
        if (this.angleRotationEnabled && this.isEnabled) {
            this.startAngleRotationFromCurrentPosition();
        }
        
        const sizeInfo = this.shotSizes[size] || {};
        const heightInfo = this.cameraHeights[height] || {};
        const targetInfo = this.targetDefinitions[this.currentShot.target] || {};
        console.log(`🎬 ショット: ${sizeInfo.description || size} / ${this.cameraAngles[angle]?.description || angle} / ${heightInfo.description || height} → ${targetInfo.label || target}`);
        
        this.emitDOFShotEvent();
    }
    
    emitDOFShotEvent() {
        const sizeConfig = this.shotSizes[this.currentShot.size] || {};
        
        let focusBone = 'head';
        const size = this.currentShot.size;
        if (['ECU', 'CU', 'MCU'].includes(size)) {
            focusBone = 'head';
        } else if (['MS', 'UPPER', 'COWBOY'].includes(size)) {
            focusBone = 'chest';
        } else if (['FS', 'LS', 'WIDE', 'VERY_WIDE', 'TWO', 'GROUP'].includes(size)) {
            focusBone = 'hips';
        } else {
            focusBone = sizeConfig.targetBone || 'head';
        }
        
        const eventData = {
            target: this.currentShot.target,
            shotSize: this.currentShot.size,
            shotAngle: this.currentShot.angle,
            shotHeight: this.currentShot.height,
            bone: focusBone,
            distance: sizeConfig.distance || 1.0,
            targetBone: sizeConfig.targetBone || 'chest'
        };
        
        window.dispatchEvent(new CustomEvent('aiDirectorShotChanged', { detail: eventData }));
    }
    
    applyCameraPosition() {
        const camera = this.app.camera;
        const controls = this.app.controls;
        if (!camera || !controls) return;
        
        const camData = this.calculateCameraPosition(this.currentShot.target);
        
        if (this.config.transitionDuration <= 100) {
            camera.position.set(camData.position.x, camData.position.y, camData.position.z);
            controls.target.set(camData.target.x, camData.target.y, camData.target.z);
            controls.update();
        } else {
            this.animateCameraTo(camData);
        }
    }
    
    animateCameraTo(camData) {
        const camera = this.app.camera;
        const controls = this.app.controls;
        const startPos = { ...camera.position };
        const startTarget = { ...controls.target };
        const startTime = Date.now();
        const duration = this.config.transitionDuration;
        
        const animate = () => {
            const elapsed = Date.now() - startTime;
            const t = Math.min(1, elapsed / duration);
            const ease = 1 - Math.pow(1 - t, 3);
            
            camera.position.x = startPos.x + (camData.position.x - startPos.x) * ease;
            camera.position.y = startPos.y + (camData.position.y - startPos.y) * ease;
            camera.position.z = startPos.z + (camData.position.z - startPos.z) * ease;
            controls.target.x = startTarget.x + (camData.target.x - startTarget.x) * ease;
            controls.target.y = startTarget.y + (camData.target.y - startTarget.y) * ease;
            controls.target.z = startTarget.z + (camData.target.z - startTarget.z) * ease;
            controls.update();
            
            if (t < 1) requestAnimationFrame(animate);
        };
        animate();
    }
    
    // ========================================
    // アングル回転機能
    // ========================================
    
    startAngleRotationFromCurrentPosition() {
        const camData = this.calculateCameraPosition(this.currentShot.target);
        
        this.rotationState.theta = camData.theta;
        this.rotationState.phi = camData.phi;
        this.rotationState.radius = camData.distance;
        this.rotationState.trackOffset = { x: 0, z: 0 };
        this.rotationState.baseTargetPos = { ...camData.target };
        
        this.currentCameraWork = this.selectRandomCameraWork();
        this.setCameraWorkGoals(this.currentCameraWork);
        this.cameraWorkStartTime = Date.now();
        
        if (!this.rotationAnimationId) {
            this.startRotationAnimation();
        }
        
        this.updateCameraWorkDisplay();
    }
    
    setCameraWorkGoals(workType) {
        const cfg = this.angleRotationConfig;
        const { theta, phi, radius } = this.rotationState;
        this.rotationState.goalTrackOffset = { x: 0, z: 0 };
        
        switch (workType) {
            case 'orbit-slow-left':
                this.rotationState.goalTheta = theta + this.degToRad(50);
                this.rotationState.goalPhi = phi;
                this.rotationState.goalRadius = radius;
                break;
            case 'orbit-slow-right':
                this.rotationState.goalTheta = theta - this.degToRad(50);
                this.rotationState.goalPhi = phi;
                this.rotationState.goalRadius = radius;
                break;
            case 'tilt-up-slow':
                this.rotationState.goalTheta = theta;
                this.rotationState.goalPhi = Math.max(this.degToRad(35), phi - this.degToRad(30));
                this.rotationState.goalRadius = radius;
                break;
            case 'tilt-down-slow':
                this.rotationState.goalTheta = theta;
                this.rotationState.goalPhi = Math.min(this.degToRad(115), phi + this.degToRad(30));
                this.rotationState.goalRadius = radius;
                break;
            case 'dolly-in-slow':
                this.rotationState.goalTheta = theta;
                this.rotationState.goalPhi = phi;
                this.rotationState.goalRadius = Math.max(cfg.minDistance, radius * 0.7);
                break;
            case 'dolly-out-slow':
                this.rotationState.goalTheta = theta;
                this.rotationState.goalPhi = phi;
                this.rotationState.goalRadius = Math.min(cfg.maxDistance, radius * 1.4);
                break;
            case 'track-left-slow':
                this.rotationState.goalTheta = theta;
                this.rotationState.goalPhi = phi;
                this.rotationState.goalRadius = radius;
                this.rotationState.goalTrackOffset = { x: 1.2, z: 0 };
                break;
            case 'track-right-slow':
                this.rotationState.goalTheta = theta;
                this.rotationState.goalPhi = phi;
                this.rotationState.goalRadius = radius;
                this.rotationState.goalTrackOffset = { x: -1.2, z: 0 };
                break;
            case 'crane-up-slow':
                this.rotationState.goalTheta = theta;
                this.rotationState.goalPhi = Math.max(this.degToRad(25), phi - this.degToRad(40));
                this.rotationState.goalRadius = radius + 0.5;
                break;
            case 'crane-down-slow':
                this.rotationState.goalTheta = theta;
                this.rotationState.goalPhi = Math.min(this.degToRad(115), phi + this.degToRad(40));
                this.rotationState.goalRadius = Math.max(cfg.minDistance, radius - 0.4);
                break;
            case 'face-closeup':
                this.rotationState.goalTheta = theta;
                this.rotationState.goalPhi = this.degToRad(85);
                this.rotationState.goalRadius = Math.max(cfg.minDistance, radius * 0.6);
                break;
            case 'orbit-dolly-in':
                this.rotationState.goalTheta = theta + this.degToRad(40);
                this.rotationState.goalPhi = phi;
                this.rotationState.goalRadius = Math.max(cfg.minDistance, radius * 0.75);
                break;
            default:
                this.rotationState.goalTheta = theta;
                this.rotationState.goalPhi = phi;
                this.rotationState.goalRadius = radius;
        }
        
        this.rotationState.goalPhi = Math.max(this.degToRad(15), Math.min(this.degToRad(155), this.rotationState.goalPhi));
        this.rotationState.goalRadius = Math.max(cfg.minDistance, Math.min(cfg.maxDistance, this.rotationState.goalRadius));
    }
    
    selectRandomCameraWork() {
        const enabledWorks = Object.entries(this.cameraWorkTypes)
            .filter(([key, info]) => this.enabledCameraWorkCategories[info.category])
            .map(([key]) => key);
        if (enabledWorks.length === 0) return null;
        return enabledWorks[Math.floor(Math.random() * enabledWorks.length)];
    }
    
    startRotationAnimation() {
        const animate = () => {
            if (!this.angleRotationEnabled || !this.isEnabled) {
                this.rotationAnimationId = null;
                return;
            }
            this.rotationAnimationId = requestAnimationFrame(animate);
            this.updateAngleRotation();
        };
        animate();
    }
    
    stopAngleRotation() {
        if (this.rotationAnimationId) {
            cancelAnimationFrame(this.rotationAnimationId);
            this.rotationAnimationId = null;
        }
        this.currentCameraWork = null;
        this.updateCameraWorkDisplay();
    }
    
    updateAngleRotation() {
        const camera = this.app.camera;
        const controls = this.app.controls;
        if (!camera || !controls) return;
        
        const s = this.angleRotationConfig.speed;
        this.rotationState.theta += (this.rotationState.goalTheta - this.rotationState.theta) * s;
        this.rotationState.phi += (this.rotationState.goalPhi - this.rotationState.phi) * s;
        this.rotationState.radius += (this.rotationState.goalRadius - this.rotationState.radius) * s;
        this.rotationState.trackOffset.x += (this.rotationState.goalTrackOffset.x - this.rotationState.trackOffset.x) * s;
        this.rotationState.trackOffset.z += (this.rotationState.goalTrackOffset.z - this.rotationState.trackOffset.z) * s;
        
        const sizeConfig = this.shotSizes[this.currentShot.size];
        const targetPos = this.getTargetPosition(this.currentShot.target, sizeConfig?.targetBone || 'chest');
        targetPos.y += sizeConfig?.heightOffset || 0;
        
        let camX = targetPos.x + this.rotationState.radius * Math.sin(this.rotationState.phi) * Math.sin(this.rotationState.theta);
        let camY = targetPos.y + this.rotationState.radius * Math.cos(this.rotationState.phi);
        let camZ = targetPos.z + this.rotationState.radius * Math.sin(this.rotationState.phi) * Math.cos(this.rotationState.theta);
        
        camX += this.rotationState.trackOffset.x;
        camZ += this.rotationState.trackOffset.z;
        
        camera.position.set(camX, camY, camZ);
        controls.target.set(targetPos.x, targetPos.y, targetPos.z);
        controls.update();
    }
    
    updateCameraWorkDisplay() {
        const el = document.getElementById('current-camera-work');
        if (el) {
            el.textContent = this.currentCameraWork && this.cameraWorkTypes[this.currentCameraWork] ? this.cameraWorkTypes[this.currentCameraWork].name : '-';
        }
    }
    
    degToRad(d) { return d * Math.PI / 180; }
    
    // ========================================
    // AI演出
    // ========================================
    
    async startAIDirector() {
        console.log('🤖 AI演出モード開始（話者追従）');
        this.isEnabled = true;
        if (this.app.controls) this.app.controls.enabled = false;
        
        window.dispatchEvent(new CustomEvent('aiDirectorStateChanged', { detail: { isEnabled: true } }));
        
        // ★ v2.3.2: 録画連動
        if (this.recordOnStart) {
            this.startRecordingIfAvailable();
        }
        
        await this.decideAndApplyNextShot();
        this.startSwitchTimer();
        this.updateStatusDisplay();
    }
    
    /**
     * ★ v2.3.2: 録画開始（利用可能な場合）
     */
    startRecordingIfAvailable() {
        // screen-recorder.js の startRecording 関数を呼び出す
        if (typeof window.startScreenRecording === 'function') {
            console.log('🎬 録画を自動開始します...');
            window.startScreenRecording();
        } else if (window.screenRecorder && typeof window.screenRecorder.start === 'function') {
            console.log('🎬 録画を自動開始します...');
            window.screenRecorder.start();
        } else {
            // Shift+P のキーイベントをシミュレート
            const event = new KeyboardEvent('keydown', {
                key: 'P',
                code: 'KeyP',
                shiftKey: true,
                bubbles: true
            });
            document.dispatchEvent(event);
            console.log('🎬 録画開始キー(Shift+P)を送信しました');
        }
    }
    
    /**
     * ★ v2.3.2: 録画停止（利用可能な場合）
     */
    stopRecordingIfAvailable() {
        if (typeof window.stopScreenRecording === 'function') {
            console.log('🎬 録画を自動停止します...');
            window.stopScreenRecording();
        } else if (window.screenRecorder && typeof window.screenRecorder.stop === 'function') {
            console.log('🎬 録画を自動停止します...');
            window.screenRecorder.stop();
        } else {
            // Shift+O のキーイベントをシミュレート
            const event = new KeyboardEvent('keydown', {
                key: 'O',
                code: 'KeyO',
                shiftKey: true,
                bubbles: true
            });
            document.dispatchEvent(event);
            console.log('🎬 録画停止キー(Shift+O)を送信しました');
        }
    }
    
    stopAIDirector() {
        console.log('🤖 AI演出モード停止');
        this.isEnabled = false;
        
        window.dispatchEvent(new CustomEvent('aiDirectorStateChanged', { detail: { isEnabled: false } }));
        
        // ★ v2.3.2: 録画連動停止
        if (this.recordOnStart) {
            this.stopRecordingIfAvailable();
        }
        
        if (this.switchTimeout) {
            clearTimeout(this.switchTimeout);
            this.switchTimeout = null;
        }
        
        this.stopAngleRotation();
        
        if (this.app.controls) this.app.controls.enabled = true;
        
        this.updateStatusDisplay();
    }
    
    /**
     * ★ v2.3.1: 切り替えモードに応じたタイマー開始
     */
    startSwitchTimer() {
        if (this.switchTimeout) {
            clearTimeout(this.switchTimeout);
        }
        
        let interval;
        switch (this.switchMode) {
            case 'random':
                interval = this.calculateRandomInterval();
                console.log(`🎲 ランダム間隔: ${(interval / 1000).toFixed(1)}秒`);
                break;
            case 'context':
                // 文脈モードは別のタイミングで管理
                return;
            case 'fixed':
            default:
                interval = this.config.switchInterval;
        }
        
        this.switchTimeout = setTimeout(async () => {
            if (this.isEnabled) {
                await this.decideAndApplyNextShot();
                this.startSwitchTimer();
            }
        }, interval);
    }
    
    async decideAndApplyNextShot() {
        const decision = await this.makeDecision();
        if (decision) {
            this.applyDecision(decision);
        }
    }
    
    async makeDecision() {
        if (this.aiProvider !== 'rule') {
            try {
                const context = this.getConversationContext();
                let imageData = this.config.captureForAI ? await this.captureScreen() : null;
                const aiDecision = await this.queryAI(context, imageData);
                if (aiDecision) {
                    this.lastAIDecision = aiDecision;
                    return aiDecision;
                }
            } catch (error) {
                console.error('AI判断エラー:', error);
            }
        }
        
        return this.makeRuleBasedDecision();
    }
    
    getConversationContext() {
        const chatHistory = [];
        const chatContainer = document.querySelector('.chat-container, #chat-messages, .messages');
        if (chatContainer) {
            const messages = chatContainer.querySelectorAll('.message, .chat-message');
            Array.from(messages).slice(-5).forEach(msg => chatHistory.push(msg.textContent?.trim() || ''));
        }
        return {
            recentMessages: chatHistory,
            speakingCharacter: this.detectSpeakingCharacter(),
            currentShot: this.currentShot,
            shotHistory: this.shotHistory.slice(-10)
        };
    }
    
    async captureScreen() {
        return new Promise((resolve) => {
            const canvas = this.app.renderer?.domElement;
            if (!canvas) { resolve(null); return; }
            try { resolve(canvas.toDataURL('image/jpeg', 0.6)); } catch (e) { resolve(null); }
        });
    }
    
    async queryAI(context, imageData) {
        const prompt = this.buildDirectorPrompt(context);
        try {
            if (this.aiProvider === 'gemini' && window.geminiClient) return await this.queryGemini(prompt, imageData);
            if (this.aiProvider === 'claude') return await this.queryClaude(prompt, imageData);
        } catch (e) { console.error('AI問い合わせエラー:', e); }
        return null;
    }
    
    buildDirectorPrompt(context) {
        const allShots = this.showBodyShots ? { ...this.faceShotSizes, ...this.bodyShotSizes } : this.faceShotSizes;
        const targetList = Object.entries(this.targetDefinitions).map(([id, def]) => `${id} (${def.label})`).join(', ');
        return `あなたはプロの映画監督です。VRMキャラクターの会話シーンに最適なカメラショットを選んでください。

【現在の状況】
- 最近の会話: ${context.recentMessages.slice(-3).join(' / ')}
- 話しているキャラ: ${context.speakingCharacter || '不明'}
- 現在のショット: ${context.currentShot.size} / ${context.currentShot.angle} / ${context.currentShot.height} → ${context.currentShot.target}

【原則】
- 感情的なシーンではCU/MCU、説明シーンではMS/FS
- 同じショットを連続で使わない
- 話しているキャラクターを優先的に映す

【選択肢】
ショットサイズ: ${Object.keys(allShots).join(', ')}
アングル: ${Object.keys(this.cameraAngles).join(', ')}
高さ: ${Object.keys(this.cameraHeights).join(', ')}
ターゲット: ${targetList}

【回答形式】JSONのみ:
{"size": "MCU", "angle": "FRONT", "height": "EYE_LEVEL", "target": "char-a", "reason": "理由"}`;
    }
    
    async queryGemini(prompt, imageData) {
        if (!window.geminiClient) return null;
        try {
            const parts = [{ text: prompt }];
            if (imageData) parts.push({ inlineData: { mimeType: 'image/jpeg', data: imageData.split(',')[1] } });
            const response = await window.geminiClient.generateContent(parts);
            const text = response.response.text();
            const jsonMatch = text.match(/\{[\s\S]*?\}/);
            if (jsonMatch) return JSON.parse(jsonMatch[0]);
        } catch (e) { console.error('Gemini error:', e); }
        return null;
    }
    
    async queryClaude(prompt, imageData) {
        const apiKey = localStorage.getItem('claude_api_key');
        if (!apiKey) return null;
        try {
            const messages = [{ role: 'user', content: imageData ? [{ type: 'text', text: prompt }, { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: imageData.split(',')[1] }}] : prompt }];
            const response = await fetch('https://api.anthropic.com/v1/messages', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
                body: JSON.stringify({ model: 'claude-sonnet-4-20250514', max_tokens: 200, messages })
            });
            const data = await response.json();
            const text = data.content?.[0]?.text || '';
            const jsonMatch = text.match(/\{[\s\S]*?\}/);
            if (jsonMatch) return JSON.parse(jsonMatch[0]);
        } catch (e) { console.error('Claude error:', e); }
        return null;
    }
    
    /**
     * ★ v2.3.1: ルールベースの判断（ツーショット/グループ対応）
     */
    makeRuleBasedDecision() {
        const lastShot = this.shotHistory[this.shotHistory.length - 1];
        const speakingTarget = this.detectSpeakingCharacter();
        
        // ★ ツーショット/グループショットの確率判定
        const rand = Math.random();
        let size, target;
        
        if (this.includeGroupShot && rand < this.groupShotProbability) {
            // グループショット
            size = 'GROUP';
            target = 'center';
            console.log('🎬 グループショット選択');
        } else if (this.includeTwoShot && rand < this.groupShotProbability + this.twoShotProbability) {
            // ツーショット
            size = 'TWO';
            target = 'center';
            console.log('🎬 ツーショット選択');
        } else {
            // 通常のショット
            target = this.followSpeaker && speakingTarget ? speakingTarget : this.currentShot.target;
            
            // ショットサイズをランダム選択
            const sizes = this.showBodyShots ? 
                ['CU', 'MCU', 'MS', 'UPPER', 'COWBOY', 'FS', 'WIDE'] : 
                ['ECU', 'CU', 'MCU', 'MS', 'COWBOY', 'FS'];
            
            size = sizes[Math.floor(Math.random() * sizes.length)];
            
            // 連続を避ける
            if (lastShot?.size === size) {
                size = sizes[(sizes.indexOf(size) + 1) % sizes.length];
            }
        }
        
        // 話者追跡
        if (this.followSpeaker && speakingTarget && speakingTarget !== this.lastDetectedSpeaker) {
            this.speakerChangeCount++;
            console.log(`🎤 話者変更検出: ${this.lastDetectedSpeaker} → ${speakingTarget}`);
            this.lastDetectedSpeaker = speakingTarget;
        }
        
        // アングルをランダム選択
        const angles = ['FRONT', 'DIAGONAL_LEFT', 'DIAGONAL_RIGHT', 'FRONT_LEFT', 'FRONT_RIGHT', 'OTS_LEFT', 'OTS_RIGHT'];
        let angle = angles[Math.floor(Math.random() * angles.length)];
        if (lastShot?.angle === angle) {
            angle = angles[(angles.indexOf(angle) + 1) % angles.length];
        }
        
        // 高さをランダム選択
        let heights;
        if (this.excludeLowAngles) {
            heights = ['EYE_LEVEL', 'EYE_LEVEL', 'EYE_LEVEL', 'EYE_LEVEL', 'HIGH_ANGLE', 'BIRDS_EYE'];
        } else {
            heights = ['EYE_LEVEL', 'EYE_LEVEL', 'EYE_LEVEL', 'LOW_ANGLE', 'HIGH_ANGLE'];
        }
        const height = heights[Math.floor(Math.random() * heights.length)];
        
        const targetLabel = this.targetDefinitions[target]?.label || target;
        const reason = size === 'TWO' ? 'ツーショット' : 
                       size === 'GROUP' ? 'グループショット' :
                       speakingTarget ? `話者追従: ${targetLabel}` : 'ルールベース';
        
        return { size, angle, height, target, reason };
    }
    
    applyDecision(decision) {
        if (!decision) return;
        if (!this.shotSizes[decision.size]) decision.size = 'MCU';
        if (!this.cameraAngles[decision.angle]) decision.angle = 'FRONT';
        if (!this.cameraHeights[decision.height]) decision.height = 'EYE_LEVEL';
        if (!this.targetDefinitions[decision.target]) decision.target = 'default';
        
        this.setShot(decision.size, decision.angle, decision.height, decision.target);
        
        if (decision.reason) this.updateAIReasonDisplay(decision.reason);
    }
    
    // ========================================
    // UI
    // ========================================
    
    createUI() {
        const panel = document.createElement('div');
        panel.id = 'ai-director-panel';
        panel.innerHTML = this.getUIHTML();
        document.body.appendChild(panel);
        this.panel = panel;
        this.generateShotButtons();
        this.setupEventListeners();
        this.setupDragMove();
    }
    
    getUIHTML() {
        return `
            <style>
                #ai-director-panel { position: fixed; top: 80px; right: 10px; background: rgba(15,15,30,0.97); border-radius: 16px; color: #fff; font-family: -apple-system, sans-serif; font-size: 11px; z-index: 10001; min-width: 380px; max-height: 90vh; overflow: hidden; box-shadow: 0 10px 40px rgba(0,0,0,0.5); border: 1px solid rgba(255,255,255,0.08); }
                #ai-director-panel.collapsed .panel-body { display: none; }
                #ai-director-panel .panel-header { background: linear-gradient(135deg, #9b59b6, #8e44ad); padding: 12px 14px; display: flex; align-items: center; justify-content: space-between; cursor: grab; border-radius: 16px 16px 0 0; }
                #ai-director-panel.collapsed .panel-header { border-radius: 16px; }
                #ai-director-panel .panel-header .title { font-weight: 700; font-size: 13px; }
                #ai-director-panel .header-btn { background: rgba(255,255,255,0.2); border: none; color: white; width: 26px; height: 26px; border-radius: 6px; cursor: pointer; }
                #ai-director-panel .header-btn:hover { background: rgba(255,255,255,0.35); }
                #ai-director-panel .panel-body { padding: 14px; max-height: calc(90vh - 55px); overflow-y: auto; }
                #ai-director-panel .section { background: rgba(0,0,0,0.25); border-radius: 12px; padding: 12px; margin-bottom: 12px; }
                #ai-director-panel .section-title { font-size: 11px; font-weight: 700; margin-bottom: 10px; color: #9b59b6; }
                #ai-director-panel .shot-display { background: rgba(0,0,0,0.4); border-radius: 10px; padding: 12px; margin-bottom: 12px; }
                #ai-director-panel .shot-current { font-size: 14px; font-weight: 700; color: #9b59b6; margin-bottom: 8px; }
                #ai-director-panel .shot-detail { font-size: 10px; color: #888; }
                #ai-director-panel .shot-target { font-size: 11px; color: #3498db; margin-top: 4px; }
                #ai-director-panel .ai-reason { font-size: 9px; color: #f39c12; margin-top: 8px; padding: 6px 8px; background: rgba(243,156,18,0.1); border-radius: 6px; display: none; }
                #ai-director-panel .checkbox-row { display: flex; align-items: center; gap: 8px; padding: 8px 10px; background: rgba(231,76,60,0.15); border: 1px solid rgba(231,76,60,0.3); border-radius: 8px; margin-bottom: 10px; cursor: pointer; }
                #ai-director-panel .checkbox-row:hover { background: rgba(231,76,60,0.25); }
                #ai-director-panel .checkbox-row input[type="checkbox"] { width: 16px; height: 16px; accent-color: #e74c3c; }
                #ai-director-panel .checkbox-row label { font-size: 11px; color: #e74c3c; cursor: pointer; font-weight: 600; }
                #ai-director-panel .checkbox-row.green { background: rgba(46,204,113,0.15); border-color: rgba(46,204,113,0.3); }
                #ai-director-panel .checkbox-row.green:hover { background: rgba(46,204,113,0.25); }
                #ai-director-panel .checkbox-row.green input[type="checkbox"] { accent-color: #2ecc71; }
                #ai-director-panel .checkbox-row.green label { color: #2ecc71; }
                #ai-director-panel .checkbox-row.blue { background: rgba(52,152,219,0.15); border-color: rgba(52,152,219,0.3); }
                #ai-director-panel .checkbox-row.blue:hover { background: rgba(52,152,219,0.25); }
                #ai-director-panel .checkbox-row.blue input[type="checkbox"] { accent-color: #3498db; }
                #ai-director-panel .checkbox-row.blue label { color: #3498db; }
                #ai-director-panel .shot-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 4px; margin-bottom: 10px; }
                #ai-director-panel .shot-btn { padding: 8px 4px; background: rgba(255,255,255,0.06); border: 1px solid transparent; border-radius: 6px; color: #aaa; font-size: 8px; cursor: pointer; text-align: center; }
                #ai-director-panel .shot-btn:hover { background: rgba(155,89,182,0.3); border-color: #9b59b6; color: #fff; }
                #ai-director-panel .shot-btn.active { background: #9b59b6; color: white; }
                #ai-director-panel .shot-btn .shot-icon { font-size: 16px; display: block; margin-bottom: 2px; }
                #ai-director-panel .body-shots-section { display: none; }
                #ai-director-panel .body-shots-section.visible { display: block; }
                #ai-director-panel .body-shot-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 4px; }
                #ai-director-panel .body-shot-btn { padding: 6px 4px; background: rgba(231,76,60,0.15); border: 1px solid rgba(231,76,60,0.3); border-radius: 6px; color: #e74c3c; font-size: 7px; cursor: pointer; text-align: center; }
                #ai-director-panel .body-shot-btn:hover { background: rgba(231,76,60,0.3); border-color: #e74c3c; color: #fff; }
                #ai-director-panel .body-shot-btn.active { background: #e74c3c; color: white; }
                #ai-director-panel .body-shot-btn .shot-icon { font-size: 14px; display: block; margin-bottom: 1px; }
                #ai-director-panel .height-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 4px; margin-bottom: 10px; }
                #ai-director-panel .height-btn { padding: 6px 4px; background: rgba(255,255,255,0.06); border: 1px solid transparent; border-radius: 6px; color: #aaa; font-size: 8px; cursor: pointer; text-align: center; }
                #ai-director-panel .height-btn:hover { background: rgba(155,89,182,0.3); border-color: #9b59b6; color: #fff; }
                #ai-director-panel .height-btn.active { background: #9b59b6; color: white; }
                #ai-director-panel .angle-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 4px; }
                #ai-director-panel .angle-btn { padding: 6px 4px; background: rgba(255,255,255,0.06); border: 1px solid transparent; border-radius: 6px; color: #aaa; font-size: 8px; cursor: pointer; text-align: center; }
                #ai-director-panel .angle-btn:hover { background: rgba(155,89,182,0.3); border-color: #9b59b6; color: #fff; }
                #ai-director-panel .angle-btn.active { background: #9b59b6; color: white; }
                #ai-director-panel .control-row { display: flex; gap: 8px; margin-bottom: 10px; }
                #ai-director-panel .control-btn { flex: 1; padding: 10px; border: none; border-radius: 8px; font-weight: 700; font-size: 11px; cursor: pointer; }
                #ai-director-panel .control-btn.start { background: linear-gradient(135deg, #27ae60, #2ecc71); color: white; }
                #ai-director-panel .control-btn.stop { background: linear-gradient(135deg, #e74c3c, #c0392b); color: white; }
                #ai-director-panel .control-btn:disabled { opacity: 0.5; cursor: not-allowed; }
                #ai-director-panel .ai-select { width: 100%; padding: 8px; background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.1); border-radius: 6px; color: white; font-size: 11px; }
                #ai-director-panel .slider-row { margin: 8px 0; }
                #ai-director-panel .slider-row label { display: flex; justify-content: space-between; margin-bottom: 4px; color: #aaa; font-size: 10px; }
                #ai-director-panel .slider-row input[type="range"] { width: 100%; height: 6px; -webkit-appearance: none; background: rgba(255,255,255,0.1); border-radius: 3px; }
                #ai-director-panel .slider-row input[type="range"]::-webkit-slider-thumb { -webkit-appearance: none; width: 14px; height: 14px; background: #9b59b6; border-radius: 50%; cursor: pointer; }
                #ai-director-panel .slider-value { color: #9b59b6; font-weight: 700; }
                #ai-director-panel .target-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 4px; margin-top: 10px; }
                #ai-director-panel .target-btn { padding: 8px 4px; background: rgba(255,255,255,0.06); border: 1px solid transparent; border-radius: 6px; color: #888; font-size: 9px; cursor: pointer; text-align: center; }
                #ai-director-panel .target-btn:hover { background: rgba(52,152,219,0.3); border-color: #3498db; color: #fff; }
                #ai-director-panel .target-btn.active { background: #3498db; color: white; }
                #ai-director-panel #auto-target-btn { transition: all 0.2s; }
                #ai-director-panel #auto-target-btn:hover { transform: scale(1.02); }
                #ai-director-panel #auto-target-btn.active { background: linear-gradient(135deg, #27ae60, #2ecc71) !important; box-shadow: 0 0 10px rgba(46,204,113,0.5); }
                #ai-director-panel .target-btn .target-icon { font-size: 16px; display: block; margin-bottom: 2px; }
                #ai-director-panel .distance-section { background: rgba(52,152,219,0.15); border: 1px solid rgba(52,152,219,0.3); border-radius: 10px; padding: 12px; margin-bottom: 12px; }
                #ai-director-panel .distance-section .section-title { color: #3498db; }
                #ai-director-panel .distance-section input[type="range"]::-webkit-slider-thumb { background: #3498db; }
                #ai-director-panel .distance-section .slider-value { color: #3498db; }
                #ai-director-panel .angle-rotation-section { background: rgba(46,204,113,0.1); border: 1px solid rgba(46,204,113,0.3); border-radius: 10px; padding: 12px; margin-bottom: 12px; }
                #ai-director-panel .angle-rotation-section .section-title { color: #2ecc71; }
                #ai-director-panel .angle-rotation-section input[type="range"]::-webkit-slider-thumb { background: #2ecc71; }
                #ai-director-panel .angle-rotation-section .slider-value { color: #2ecc71; }
                #ai-director-panel .angle-rotation-details { display: none; margin-top: 10px; padding-top: 10px; border-top: 1px solid rgba(46,204,113,0.2); }
                #ai-director-panel .angle-rotation-details.visible { display: block; }
                #ai-director-panel .camera-work-status { background: rgba(0,0,0,0.3); border-radius: 6px; padding: 8px; margin-bottom: 10px; font-size: 10px; }
                #ai-director-panel .camera-work-status .label { color: #888; }
                #ai-director-panel .camera-work-status .value { color: #2ecc71; font-weight: 700; }
                #ai-director-panel .camerawork-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 4px; }
                #ai-director-panel .camerawork-check { display: flex; align-items: center; gap: 6px; padding: 5px 8px; background: rgba(255,255,255,0.04); border-radius: 4px; font-size: 9px; cursor: pointer; }
                #ai-director-panel .camerawork-check input { width: 12px; height: 12px; accent-color: #2ecc71; }
                #ai-director-panel .status-indicator { display: inline-block; padding: 2px 8px; border-radius: 10px; font-size: 9px; font-weight: 600; }
                #ai-director-panel .status-indicator.running { background: #27ae60; color: white; }
                #ai-director-panel .status-indicator.stopped { background: #7f8c8d; color: white; }
                #ai-director-panel .speaker-indicator { margin-top: 6px; padding: 4px 8px; background: rgba(46,204,113,0.2); border-radius: 6px; font-size: 10px; color: #2ecc71; }
                #ai-director-panel .switch-mode-section { background: rgba(230,126,34,0.15); border: 1px solid rgba(230,126,34,0.3); border-radius: 10px; padding: 12px; margin-bottom: 12px; }
                #ai-director-panel .switch-mode-section .section-title { color: #e67e22; }
                #ai-director-panel .mode-btn-group { display: flex; gap: 4px; margin-bottom: 10px; }
                #ai-director-panel .mode-btn { flex: 1; padding: 8px 4px; background: rgba(255,255,255,0.06); border: 1px solid transparent; border-radius: 6px; color: #aaa; font-size: 9px; cursor: pointer; text-align: center; transition: all 0.2s; }
                #ai-director-panel .mode-btn:hover { background: rgba(230,126,34,0.3); border-color: #e67e22; color: #fff; }
                #ai-director-panel .mode-btn.active { background: #e67e22; color: white; border-color: #e67e22; }
                #ai-director-panel .mode-details { display: none; margin-top: 10px; padding-top: 10px; border-top: 1px solid rgba(230,126,34,0.2); }
                #ai-director-panel .mode-details.visible { display: block; }
                #ai-director-panel .twoshot-section { background: rgba(142,68,173,0.15); border: 1px solid rgba(142,68,173,0.3); border-radius: 10px; padding: 12px; margin-bottom: 12px; }
                #ai-director-panel .twoshot-section .section-title { color: #8e44ad; }
            </style>
            <div class="panel-header">
                <div class="title">🎬 AI Director Camera V2.3.1</div>
                <div style="display:flex;gap:6px;">
                    <button class="header-btn" id="ai-director-minimize">−</button>
                    <button class="header-btn" id="ai-director-close">×</button>
                </div>
            </div>
            <div class="panel-body">
                <!-- 現在のショット -->
                <div class="shot-display">
                    <div style="display:flex;justify-content:space-between;align-items:center;">
                        <div class="shot-current" id="current-shot-name">バストアップ / 正面 / アイレベル</div>
                        <span class="status-indicator stopped" id="status-indicator">停止中</span>
                    </div>
                    <div class="shot-detail" id="current-shot-detail">胸から上</div>
                    <div class="shot-target" id="current-shot-target">ターゲット: デフォルト</div>
                    <div class="speaker-indicator" id="speaker-indicator" style="display:none;">🎤 話者: -</div>
                    <div class="ai-reason" id="ai-reason">AI判断: -</div>
                </div>
                
                <!-- AI演出コントロール -->
                <div class="section" id="ai-control-section">
                    <div class="section-title">🤖 AI演出</div>
                    <div class="control-row">
                        <button class="control-btn start" id="ai-start-btn">▶️ AI演出開始</button>
                        <button class="control-btn stop" id="ai-stop-btn" disabled>⏹️ 停止</button>
                    </div>
                    <div class="checkbox-row green">
                        <input type="checkbox" id="follow-speaker-checkbox" checked>
                        <label for="follow-speaker-checkbox">🎤 話者を自動追従</label>
                    </div>
                    <div class="checkbox-row" style="background: rgba(241,196,15,0.15); border-color: rgba(241,196,15,0.3);">
                        <input type="checkbox" id="exclude-low-angles-checkbox">
                        <label for="exclude-low-angles-checkbox" style="color: #f1c40f;">📷 ローアングルに入らない</label>
                    </div>
                    <div class="checkbox-row" style="background: rgba(231,76,60,0.15); border-color: rgba(231,76,60,0.3);">
                        <input type="checkbox" id="record-on-start-checkbox">
                        <label for="record-on-start-checkbox" style="color: #e74c3c;">🔴 AI演出開始時に録画も開始</label>
                    </div>
                    <div style="margin-top:10px;">
                        <label style="font-size:10px;color:#888;">判断方法</label>
                        <select class="ai-select" id="ai-provider-select">
                            <option value="rule">ルールベース（高速・話者追従）</option>
                            <option value="gemini">Gemini（画像認識対応）</option>
                            <option value="claude">Claude（高精度）</option>
                        </select>
                    </div>
                </div>
                
                <!-- ★ v2.3.1: 切り替えモード設定 -->
                <div class="switch-mode-section">
                    <div class="section-title">⏱️ カメラ切り替えモード</div>
                    <div class="mode-btn-group">
                        <button class="mode-btn active" data-mode="fixed">📌 固定間隔</button>
                        <button class="mode-btn" data-mode="random">🎲 ランダム</button>
                        <button class="mode-btn" data-mode="context">📖 文脈解析</button>
                    </div>
                    <div id="fixed-mode-details" class="mode-details visible">
                        <div class="slider-row">
                            <label><span>切り替え間隔</span><span class="slider-value" id="switch-interval-value">5秒</span></label>
                            <input type="range" id="switch-interval" min="0.3" max="30" step="0.1" value="5">
                        </div>
                    </div>
                    <div id="random-mode-details" class="mode-details">
                        <div class="slider-row">
                            <label><span>最小間隔</span><span class="slider-value" id="random-min-value">2秒</span></label>
                            <input type="range" id="random-min" min="0.5" max="10" step="0.5" value="2">
                        </div>
                        <div class="slider-row">
                            <label><span>最大間隔</span><span class="slider-value" id="random-max-value">10秒</span></label>
                            <input type="range" id="random-max" min="2" max="20" step="0.5" value="10">
                        </div>
                    </div>
                    <div id="context-mode-details" class="mode-details">
                        <div style="font-size:9px;color:#888;padding:8px;background:rgba(0,0,0,0.2);border-radius:6px;">
                            📖 会話の内容を解析して、感情的な場面では顔アップ、説明的な場面ではミディアムショット、間や沈黙ではロングショットを自動選択します。<br><br>
                            ✨ 感嘆詞・驚き → 顔アップ<br>
                            💬 説明・要約 → ミディアム<br>
                            ⏸️ 間・沈黙 → ロング<br>
                            👥 「あなた」「二人」→ ツーショット<br>
                            👨‍👩‍👧‍👦 「みんな」「全員」→ グループ
                        </div>
                    </div>
                </div>
                
                <!-- ★ v2.3.1: ツーショット/グループ設定 -->
                <div class="twoshot-section">
                    <div class="section-title">👥 ツーショット / グループショット</div>
                    <div class="checkbox-row blue">
                        <input type="checkbox" id="include-twoshot-checkbox" checked>
                        <label for="include-twoshot-checkbox">👥 ツーショットを含める</label>
                    </div>
                    <div class="checkbox-row blue">
                        <input type="checkbox" id="include-group-checkbox" checked>
                        <label for="include-group-checkbox">👨‍👩‍👧‍👦 グループショットを含める</label>
                    </div>
                    <div class="slider-row">
                        <label><span>ツーショット確率</span><span class="slider-value" id="twoshot-prob-value">15%</span></label>
                        <input type="range" id="twoshot-prob" min="0" max="50" step="1" value="15">
                    </div>
                    <div class="slider-row">
                        <label><span>グループショット確率</span><span class="slider-value" id="group-prob-value">8%</span></label>
                        <input type="range" id="group-prob" min="0" max="30" step="1" value="8">
                    </div>
                </div>
                
                <!-- ターゲット選択 -->
                <div class="section">
                    <div class="section-title" style="display:flex;justify-content:space-between;align-items:center;">
                        <span>🎯 ターゲット選択（手動）</span>
                        <button class="control-btn" id="auto-target-btn" style="flex:0;padding:6px 12px;font-size:10px;background:linear-gradient(135deg,#3498db,#2980b9);">🎯 自動: OFF</button>
                    </div>
                    <div class="target-grid" id="target-grid"></div>
                </div>
                
                <!-- カメラ距離調整 -->
                <div class="distance-section">
                    <div class="section-title">📏 カメラ距離調整</div>
                    <div class="slider-row">
                        <label><span>被写体からの距離</span><span class="slider-value" id="distance-value">1.0x</span></label>
                        <input type="range" id="distance-multiplier" min="0.5" max="3.0" step="0.1" value="1.0">
                    </div>
                </div>
                
                <!-- 手動ショット選択 -->
                <div class="section" id="manual-control-section">
                    <div class="section-title">🎯 ショットサイズ</div>
                    <div class="shot-grid" id="shot-size-grid"></div>
                    <div class="checkbox-row" id="body-shots-toggle">
                        <input type="checkbox" id="show-body-shots">
                        <label for="show-body-shots">🔞 顔以外も撮影（ボディショット）</label>
                    </div>
                    <div class="body-shots-section" id="body-shots-section">
                        <div class="section-title" style="color:#e74c3c;">🎯 ボディショット</div>
                        <div class="body-shot-grid" id="body-shot-grid"></div>
                    </div>
                    <div class="section-title" style="margin-top:12px;">📐 アングル</div>
                    <div class="angle-grid" id="angle-grid">
                        <button class="angle-btn" data-angle="SIDE_LEFT">←横</button>
                        <button class="angle-btn" data-angle="DIAGONAL_LEFT">↖斜め</button>
                        <button class="angle-btn active" data-angle="FRONT">正面</button>
                        <button class="angle-btn" data-angle="DIAGONAL_RIGHT">↗斜め</button>
                        <button class="angle-btn" data-angle="SIDE_RIGHT">横→</button>
                        <button class="angle-btn" data-angle="OTS_LEFT">肩越L</button>
                        <button class="angle-btn" data-angle="OTS_RIGHT">肩越R</button>
                        <button class="angle-btn" data-angle="FRONT_LEFT">正面L</button>
                        <button class="angle-btn" data-angle="FRONT_RIGHT">正面R</button>
                    </div>
                    <div class="section-title" style="margin-top:12px;">📷 高さ</div>
                    <div class="height-grid" id="height-grid">
                        <button class="height-btn" data-height="BIRDS_EYE">俯瞰</button>
                        <button class="height-btn" data-height="HIGH_ANGLE">ハイ</button>
                        <button class="height-btn active" data-height="EYE_LEVEL">目線</button>
                        <button class="height-btn" data-height="LOW_ANGLE">ロー</button>
                        <button class="height-btn" data-height="EXTREME_LOW">極ロー</button>
                    </div>
                </div>
                
                <!-- 切り替え速度 -->
                <div class="section">
                    <div class="section-title">⚡ 切り替えアニメーション</div>
                    <div class="slider-row">
                        <label><span>切り替え速度</span><span class="slider-value" id="transition-value">パッと</span></label>
                        <input type="range" id="transition-speed" min="0" max="500" step="50" value="100">
                    </div>
                </div>
                
                <!-- アングル回転設定 -->
                <div class="angle-rotation-section">
                    <div class="section-title">🔄 アングル回転</div>
                    <div class="checkbox-row green" style="background: rgba(46,204,113,0.15); border-color: rgba(46,204,113,0.3);">
                        <input type="checkbox" id="angle-rotation-checkbox">
                        <label for="angle-rotation-checkbox">カメラをゆっくり動かす</label>
                    </div>
                    <div class="angle-rotation-details" id="angle-rotation-details">
                        <div class="camera-work-status"><span class="label">カメラワーク: </span><span class="value" id="current-camera-work">-</span></div>
                        <div class="slider-row">
                            <label><span>🐢 カメラ速度</span><span class="slider-value" id="rotation-speed-value">ゆっくり</span></label>
                            <input type="range" id="rotation-speed" min="0.005" max="0.05" step="0.005" value="0.015">
                        </div>
                        <div class="slider-row">
                            <label><span>📏 最小距離</span><span class="slider-value" id="rotation-min-dist-value">1.0</span></label>
                            <input type="range" id="rotation-min-dist" min="0.3" max="2.5" step="0.1" value="1.0">
                        </div>
                        <div class="slider-row">
                            <label><span>📏 最大距離</span><span class="slider-value" id="rotation-max-dist-value">5.0</span></label>
                            <input type="range" id="rotation-max-dist" min="2.0" max="8.0" step="0.1" value="5.0">
                        </div>
                        <div class="section-title" style="margin-top:10px;">📹 カメラワーク種類</div>
                        <div class="camerawork-grid">
                            <label class="camerawork-check"><input type="checkbox" id="cw-orbit" checked><span>🔄 オービット</span></label>
                            <label class="camerawork-check"><input type="checkbox" id="cw-tilt" checked><span>↕️ ティルト</span></label>
                            <label class="camerawork-check"><input type="checkbox" id="cw-dolly" checked><span>🔍 ドリー</span></label>
                            <label class="camerawork-check"><input type="checkbox" id="cw-track" checked><span>◀️▶️ トラック</span></label>
                            <label class="camerawork-check"><input type="checkbox" id="cw-crane" checked><span>🏗️ クレーン</span></label>
                            <label class="camerawork-check"><input type="checkbox" id="cw-special" checked><span>✨ 特殊</span></label>
                            <label class="camerawork-check" style="grid-column:span 2;"><input type="checkbox" id="cw-combo" checked><span>🎬 複合</span></label>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
    
    generateShotButtons() {
        const faceGrid = document.getElementById('shot-size-grid');
        faceGrid.innerHTML = '';
        for (const [key, shot] of Object.entries(this.faceShotSizes)) {
            const btn = document.createElement('button');
            btn.className = 'shot-btn' + (key === this.currentShot.size ? ' active' : '');
            btn.dataset.size = key;
            btn.innerHTML = `<span class="shot-icon">${shot.icon}</span>${shot.description}`;
            faceGrid.appendChild(btn);
        }
        
        const bodyGrid = document.getElementById('body-shot-grid');
        bodyGrid.innerHTML = '';
        for (const [key, shot] of Object.entries(this.bodyShotSizes)) {
            const btn = document.createElement('button');
            btn.className = 'body-shot-btn';
            btn.dataset.size = key;
            btn.innerHTML = `<span class="shot-icon">${shot.icon}</span>${shot.description}`;
            bodyGrid.appendChild(btn);
        }
        
        const targetGrid = document.getElementById('target-grid');
        targetGrid.innerHTML = '';
        for (const [key, def] of Object.entries(this.targetDefinitions)) {
            const btn = document.createElement('button');
            btn.className = 'target-btn' + (key === this.currentShot.target ? ' active' : '');
            btn.dataset.target = key;
            btn.innerHTML = `<span class="target-icon">${def.icon}</span>${def.label}`;
            targetGrid.appendChild(btn);
        }
    }
    
    setupEventListeners() {
        document.getElementById('ai-director-minimize').addEventListener('click', () => {
            this.panel.classList.toggle('collapsed');
            document.getElementById('ai-director-minimize').textContent = this.panel.classList.contains('collapsed') ? '+' : '−';
        });
        document.getElementById('ai-director-close').addEventListener('click', () => this.panel.style.display = 'none');
        
        document.getElementById('distance-multiplier').addEventListener('input', (e) => {
            this.distanceMultiplier = parseFloat(e.target.value);
            document.getElementById('distance-value').textContent = `${this.distanceMultiplier.toFixed(1)}x`;
            this.applyCameraPosition();
        });
        
        document.getElementById('follow-speaker-checkbox').addEventListener('change', (e) => {
            this.followSpeaker = e.target.checked;
            document.getElementById('speaker-indicator').style.display = this.followSpeaker ? 'block' : 'none';
            this.saveSettings();
        });
        
        document.getElementById('exclude-low-angles-checkbox').addEventListener('change', (e) => {
            this.excludeLowAngles = e.target.checked;
            this.updateHeightButtonsState();
            this.saveSettings();
        });
        
        // ★ v2.3.2: 録画連動チェックボックス
        document.getElementById('record-on-start-checkbox').addEventListener('change', (e) => {
            this.recordOnStart = e.target.checked;
            console.log(`🔴 録画連動: ${this.recordOnStart ? 'ON' : 'OFF'}`);
            this.saveSettings();
        });
        
        // ★ v2.3.1: 切り替えモード
        document.querySelectorAll('.mode-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.switchMode = btn.dataset.mode;
                
                // モード別詳細表示
                document.getElementById('fixed-mode-details').classList.toggle('visible', this.switchMode === 'fixed');
                document.getElementById('random-mode-details').classList.toggle('visible', this.switchMode === 'random');
                document.getElementById('context-mode-details').classList.toggle('visible', this.switchMode === 'context');
                
                console.log(`⏱️ 切り替えモード変更: ${this.switchMode}`);
                
                // AI演出中なら再スタート
                if (this.isEnabled) {
                    this.startSwitchTimer();
                }
                
                this.saveSettings();
            });
        });
        
        // ★ v2.3.1: ランダムモード設定
        document.getElementById('random-min').addEventListener('input', (e) => {
            this.randomSwitchMin = parseFloat(e.target.value);
            document.getElementById('random-min-value').textContent = `${this.randomSwitchMin}秒`;
            this.saveSettings();
        });
        
        document.getElementById('random-max').addEventListener('input', (e) => {
            this.randomSwitchMax = parseFloat(e.target.value);
            document.getElementById('random-max-value').textContent = `${this.randomSwitchMax}秒`;
            this.saveSettings();
        });
        
        // ★ v2.3.1: ツーショット/グループ設定
        document.getElementById('include-twoshot-checkbox').addEventListener('change', (e) => {
            this.includeTwoShot = e.target.checked;
            this.saveSettings();
        });
        
        document.getElementById('include-group-checkbox').addEventListener('change', (e) => {
            this.includeGroupShot = e.target.checked;
            this.saveSettings();
        });
        
        document.getElementById('twoshot-prob').addEventListener('input', (e) => {
            this.twoShotProbability = parseInt(e.target.value) / 100;
            document.getElementById('twoshot-prob-value').textContent = `${e.target.value}%`;
            this.saveSettings();
        });
        
        document.getElementById('group-prob').addEventListener('input', (e) => {
            this.groupShotProbability = parseInt(e.target.value) / 100;
            document.getElementById('group-prob-value').textContent = `${e.target.value}%`;
            this.saveSettings();
        });
        
        // アングル回転
        document.getElementById('angle-rotation-checkbox').addEventListener('change', (e) => {
            this.angleRotationEnabled = e.target.checked;
            document.getElementById('angle-rotation-details').classList.toggle('visible', this.angleRotationEnabled);
            
            if (!this.angleRotationEnabled) {
                this.stopAngleRotation();
            } else if (this.isEnabled) {
                this.startAngleRotationFromCurrentPosition();
            }
            this.saveSettings();
        });
        
        document.getElementById('rotation-speed').addEventListener('input', (e) => {
            this.angleRotationConfig.speed = parseFloat(e.target.value);
            const v = parseFloat(e.target.value);
            document.getElementById('rotation-speed-value').textContent = v < 0.01 ? 'とてもゆっくり' : v < 0.02 ? 'ゆっくり' : v < 0.03 ? '普通' : '速い';
            this.saveSettings();
        });
        
        document.getElementById('rotation-min-dist').addEventListener('input', (e) => {
            this.angleRotationConfig.minDistance = parseFloat(e.target.value);
            document.getElementById('rotation-min-dist-value').textContent = parseFloat(e.target.value).toFixed(1);
            this.saveSettings();
        });
        
        document.getElementById('rotation-max-dist').addEventListener('input', (e) => {
            this.angleRotationConfig.maxDistance = parseFloat(e.target.value);
            document.getElementById('rotation-max-dist-value').textContent = parseFloat(e.target.value).toFixed(1);
            this.saveSettings();
        });
        
        ['orbit', 'tilt', 'dolly', 'track', 'crane', 'special', 'combo'].forEach(cat => {
            const el = document.getElementById(`cw-${cat}`);
            if (el) el.addEventListener('change', () => { this.enabledCameraWorkCategories[cat] = el.checked; this.saveSettings(); });
        });
        
        document.getElementById('show-body-shots').addEventListener('change', (e) => {
            this.showBodyShots = e.target.checked;
            document.getElementById('body-shots-section').classList.toggle('visible', this.showBodyShots);
            this.saveSettings();
        });
        
        document.getElementById('ai-start-btn').addEventListener('click', () => {
            this.startAIDirector();
            document.getElementById('ai-start-btn').disabled = true;
            document.getElementById('ai-stop-btn').disabled = false;
        });
        
        document.getElementById('ai-stop-btn').addEventListener('click', () => {
            this.stopAIDirector();
            document.getElementById('ai-start-btn').disabled = false;
            document.getElementById('ai-stop-btn').disabled = true;
        });
        
        document.getElementById('auto-target-btn').addEventListener('click', () => {
            if (this.autoTargetEnabled) {
                this.stopAutoTarget();
            } else {
                this.startAutoTarget();
            }
            this.saveSettings();
        });
        
        document.getElementById('ai-provider-select').addEventListener('change', (e) => this.aiProvider = e.target.value);
        
        document.getElementById('switch-interval').addEventListener('input', (e) => {
            this.config.switchInterval = parseFloat(e.target.value) * 1000;
            document.getElementById('switch-interval-value').textContent = `${parseFloat(e.target.value).toFixed(1)}秒`;
            this.saveSettings();
        });
        
        document.getElementById('shot-size-grid').addEventListener('click', (e) => {
            const btn = e.target.closest('.shot-btn');
            if (!btn) return;
            document.querySelectorAll('#shot-size-grid .shot-btn, #body-shot-grid .body-shot-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            this.setShot(btn.dataset.size, this.currentShot.angle, this.currentShot.height);
        });
        
        document.getElementById('body-shot-grid').addEventListener('click', (e) => {
            const btn = e.target.closest('.body-shot-btn');
            if (!btn) return;
            document.querySelectorAll('#shot-size-grid .shot-btn, #body-shot-grid .body-shot-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            this.setShot(btn.dataset.size, this.currentShot.angle, this.currentShot.height);
        });
        
        document.getElementById('target-grid').addEventListener('click', (e) => {
            const btn = e.target.closest('.target-btn');
            if (!btn) return;
            document.querySelectorAll('#target-grid .target-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            this.currentShot.target = btn.dataset.target;
            this.applyCameraPosition();
            this.updateShotDisplay();
        });
        
        document.querySelectorAll('#angle-grid .angle-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('#angle-grid .angle-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.setShot(this.currentShot.size, btn.dataset.angle, this.currentShot.height);
            });
        });
        
        document.querySelectorAll('#height-grid .height-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('#height-grid .height-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.setShot(this.currentShot.size, this.currentShot.angle, btn.dataset.height);
            });
        });
        
        document.getElementById('transition-speed').addEventListener('input', (e) => {
            this.config.transitionDuration = parseInt(e.target.value);
            const val = parseInt(e.target.value);
            document.getElementById('transition-value').textContent = val > 300 ? 'ゆっくり' : val > 150 ? '普通' : val > 50 ? '速い' : 'パッと';
        });
    }
    
    updateShotDisplay() {
        const size = this.currentShot.size;
        const angle = this.currentShot.angle;
        const height = this.currentShot.height;
        const target = this.currentShot.target;
        
        const sizeInfo = this.shotSizes[size] || {};
        const angleInfo = this.cameraAngles[angle] || {};
        const heightInfo = this.cameraHeights[height] || {};
        const targetInfo = this.targetDefinitions[target] || {};
        
        document.getElementById('current-shot-name').textContent = `${sizeInfo.description || size} / ${angleInfo.description || angle} / ${heightInfo.description || height}`;
        document.getElementById('current-shot-detail').textContent = sizeInfo.emotion || '';
        document.getElementById('current-shot-target').textContent = `ターゲット: ${targetInfo.icon || ''} ${targetInfo.label || target}`;
        
        const speakerIndicator = document.getElementById('speaker-indicator');
        if (this.followSpeaker && this.lastDetectedSpeaker) {
            const speakerInfo = this.targetDefinitions[this.lastDetectedSpeaker] || {};
            speakerIndicator.textContent = `🎤 話者: ${speakerInfo.icon || ''} ${speakerInfo.label || this.lastDetectedSpeaker}`;
            speakerIndicator.style.display = 'block';
        }
        
        document.querySelectorAll('#shot-size-grid .shot-btn').forEach(btn => btn.classList.toggle('active', btn.dataset.size === size));
        document.querySelectorAll('#body-shot-grid .body-shot-btn').forEach(btn => btn.classList.toggle('active', btn.dataset.size === size));
        document.querySelectorAll('#angle-grid .angle-btn').forEach(btn => btn.classList.toggle('active', btn.dataset.angle === angle));
        document.querySelectorAll('#height-grid .height-btn').forEach(btn => btn.classList.toggle('active', btn.dataset.height === height));
        document.querySelectorAll('#target-grid .target-btn').forEach(btn => btn.classList.toggle('active', btn.dataset.target === target));
    }
    
    updateAIReasonDisplay(reason) {
        const el = document.getElementById('ai-reason');
        if (el) {
            el.textContent = `🤖 ${reason}`;
            el.style.display = 'block';
        }
    }
    
    updateHeightButtonsState() {
        const lowAngleBtn = document.querySelector('#height-grid .height-btn[data-height="LOW_ANGLE"]');
        const extremeLowBtn = document.querySelector('#height-grid .height-btn[data-height="EXTREME_LOW"]');
        
        if (this.excludeLowAngles) {
            if (lowAngleBtn) {
                lowAngleBtn.style.opacity = '0.3';
                lowAngleBtn.style.pointerEvents = 'none';
                lowAngleBtn.title = 'ローアングル除外中';
            }
            if (extremeLowBtn) {
                extremeLowBtn.style.opacity = '0.3';
                extremeLowBtn.style.pointerEvents = 'none';
                extremeLowBtn.title = 'ローアングル除外中';
            }
            
            if (this.currentShot.height === 'LOW_ANGLE' || this.currentShot.height === 'EXTREME_LOW') {
                this.currentShot.height = 'EYE_LEVEL';
                this.applyCameraPosition();
                this.updateShotDisplay();
            }
        } else {
            if (lowAngleBtn) {
                lowAngleBtn.style.opacity = '1';
                lowAngleBtn.style.pointerEvents = 'auto';
                lowAngleBtn.title = '';
            }
            if (extremeLowBtn) {
                extremeLowBtn.style.opacity = '1';
                extremeLowBtn.style.pointerEvents = 'auto';
                extremeLowBtn.title = '';
            }
        }
    }
    
    updateStatusDisplay() {
        const indicator = document.getElementById('status-indicator');
        if (indicator) {
            if (this.isEnabled) {
                indicator.textContent = '動作中';
                indicator.className = 'status-indicator running';
            } else {
                indicator.textContent = '停止中';
                indicator.className = 'status-indicator stopped';
            }
        }
        
        document.getElementById('speaker-indicator').style.display = this.followSpeaker ? 'block' : 'none';
    }
    
    setupDragMove() {
        const panel = this.panel;
        const header = panel.querySelector('.panel-header');
        let isDragging = false, startX, startY, startLeft, startTop;
        
        header.addEventListener('mousedown', (e) => {
            if (e.target.tagName === 'BUTTON') return;
            isDragging = true;
            startX = e.clientX;
            startY = e.clientY;
            const rect = panel.getBoundingClientRect();
            startLeft = rect.left;
            startTop = rect.top;
            panel.style.right = 'auto';
            panel.style.left = rect.left + 'px';
            panel.style.top = rect.top + 'px';
            e.preventDefault();
        });
        
        document.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            panel.style.left = Math.max(0, Math.min(startLeft + e.clientX - startX, window.innerWidth - panel.offsetWidth)) + 'px';
            panel.style.top = Math.max(0, Math.min(startTop + e.clientY - startY, window.innerHeight - panel.offsetHeight)) + 'px';
        });
        
        document.addEventListener('mouseup', () => isDragging = false);
    }
    
    saveSettings() {
        try {
            localStorage.setItem('aiDirectorCameraSettings_v231', JSON.stringify({
                aiProvider: this.aiProvider,
                config: this.config,
                currentShot: this.currentShot,
                distanceMultiplier: this.distanceMultiplier,
                showBodyShots: this.showBodyShots,
                followSpeaker: this.followSpeaker,
                excludeLowAngles: this.excludeLowAngles,
                autoTargetEnabled: this.autoTargetEnabled,
                angleRotationEnabled: this.angleRotationEnabled,
                angleRotationConfig: this.angleRotationConfig,
                enabledCameraWorkCategories: this.enabledCameraWorkCategories,
                // ★ v2.3.1
                switchMode: this.switchMode,
                randomSwitchMin: this.randomSwitchMin,
                randomSwitchMax: this.randomSwitchMax,
                includeTwoShot: this.includeTwoShot,
                includeGroupShot: this.includeGroupShot,
                twoShotProbability: this.twoShotProbability,
                groupShotProbability: this.groupShotProbability,
                // ★ v2.3.2
                recordOnStart: this.recordOnStart,
            }));
        } catch (e) {}
    }
    
    loadSettings() {
        try {
            const saved = localStorage.getItem('aiDirectorCameraSettings_v231') || localStorage.getItem('aiDirectorCameraSettings_v23');
            if (saved) {
                const s = JSON.parse(saved);
                if (s.aiProvider) this.aiProvider = s.aiProvider;
                if (s.config) Object.assign(this.config, s.config);
                if (s.currentShot) Object.assign(this.currentShot, s.currentShot);
                if (s.distanceMultiplier) this.distanceMultiplier = s.distanceMultiplier;
                if (s.showBodyShots !== undefined) this.showBodyShots = s.showBodyShots;
                if (s.followSpeaker !== undefined) this.followSpeaker = s.followSpeaker;
                if (s.excludeLowAngles !== undefined) this.excludeLowAngles = s.excludeLowAngles;
                if (s.autoTargetEnabled !== undefined && s.autoTargetEnabled) {
                    setTimeout(() => this.startAutoTarget(), 500);
                }
                if (s.angleRotationEnabled !== undefined) this.angleRotationEnabled = s.angleRotationEnabled;
                if (s.angleRotationConfig) Object.assign(this.angleRotationConfig, s.angleRotationConfig);
                if (s.enabledCameraWorkCategories) this.enabledCameraWorkCategories = s.enabledCameraWorkCategories;
                
                // ★ v2.3.1
                if (s.switchMode) this.switchMode = s.switchMode;
                if (s.randomSwitchMin !== undefined) this.randomSwitchMin = s.randomSwitchMin;
                if (s.randomSwitchMax !== undefined) this.randomSwitchMax = s.randomSwitchMax;
                if (s.includeTwoShot !== undefined) this.includeTwoShot = s.includeTwoShot;
                if (s.includeGroupShot !== undefined) this.includeGroupShot = s.includeGroupShot;
                if (s.twoShotProbability !== undefined) this.twoShotProbability = s.twoShotProbability;
                if (s.groupShotProbability !== undefined) this.groupShotProbability = s.groupShotProbability;
                
                // ★ v2.3.2
                if (s.recordOnStart !== undefined) this.recordOnStart = s.recordOnStart;
                
                // UIに反映
                document.getElementById('ai-provider-select').value = this.aiProvider;
                document.getElementById('switch-interval').value = this.config.switchInterval / 1000;
                document.getElementById('switch-interval-value').textContent = `${(this.config.switchInterval / 1000).toFixed(1)}秒`;
                document.getElementById('transition-speed').value = this.config.transitionDuration;
                document.getElementById('distance-multiplier').value = this.distanceMultiplier;
                document.getElementById('distance-value').textContent = `${this.distanceMultiplier.toFixed(1)}x`;
                document.getElementById('show-body-shots').checked = this.showBodyShots;
                document.getElementById('body-shots-section').classList.toggle('visible', this.showBodyShots);
                document.getElementById('follow-speaker-checkbox').checked = this.followSpeaker;
                document.getElementById('exclude-low-angles-checkbox').checked = this.excludeLowAngles;
                this.updateHeightButtonsState();
                document.getElementById('angle-rotation-checkbox').checked = this.angleRotationEnabled;
                document.getElementById('angle-rotation-details').classList.toggle('visible', this.angleRotationEnabled);
                document.getElementById('rotation-speed').value = this.angleRotationConfig.speed;
                document.getElementById('rotation-min-dist').value = this.angleRotationConfig.minDistance;
                document.getElementById('rotation-min-dist-value').textContent = this.angleRotationConfig.minDistance.toFixed(1);
                document.getElementById('rotation-max-dist').value = this.angleRotationConfig.maxDistance;
                document.getElementById('rotation-max-dist-value').textContent = this.angleRotationConfig.maxDistance.toFixed(1);
                
                ['orbit', 'tilt', 'dolly', 'track', 'crane', 'special', 'combo'].forEach(cat => {
                    const el = document.getElementById(`cw-${cat}`);
                    if (el) el.checked = this.enabledCameraWorkCategories[cat];
                });
                
                // ★ v2.3.1 UI
                document.querySelectorAll('.mode-btn').forEach(btn => {
                    btn.classList.toggle('active', btn.dataset.mode === this.switchMode);
                });
                document.getElementById('fixed-mode-details').classList.toggle('visible', this.switchMode === 'fixed');
                document.getElementById('random-mode-details').classList.toggle('visible', this.switchMode === 'random');
                document.getElementById('context-mode-details').classList.toggle('visible', this.switchMode === 'context');
                
                document.getElementById('random-min').value = this.randomSwitchMin;
                document.getElementById('random-min-value').textContent = `${this.randomSwitchMin}秒`;
                document.getElementById('random-max').value = this.randomSwitchMax;
                document.getElementById('random-max-value').textContent = `${this.randomSwitchMax}秒`;
                
                document.getElementById('include-twoshot-checkbox').checked = this.includeTwoShot;
                document.getElementById('include-group-checkbox').checked = this.includeGroupShot;
                
                // ★ v2.3.2: 録画連動
                document.getElementById('record-on-start-checkbox').checked = this.recordOnStart;
                document.getElementById('twoshot-prob').value = this.twoShotProbability * 100;
                document.getElementById('twoshot-prob-value').textContent = `${Math.round(this.twoShotProbability * 100)}%`;
                document.getElementById('group-prob').value = this.groupShotProbability * 100;
                document.getElementById('group-prob-value').textContent = `${Math.round(this.groupShotProbability * 100)}%`;
                
                this.updateShotDisplay();
            }
        } catch (e) {
            console.error('設定読み込みエラー:', e);
        }
    }
    
    showPanel() { this.panel.style.display = 'block'; }
    hidePanel() { this.panel.style.display = 'none'; }
    togglePanel() { this.panel.style.display = this.panel.style.display === 'none' ? 'block' : 'none'; }
}

function initAIDirectorCamera() {
    if (window.app) {
        window.aiDirectorCamera = new AIDirectorCamera(window.app);
        console.log('🎬 AI Director Camera V2.3.2 登録完了');
    } else {
        const check = setInterval(() => {
            if (window.app) {
                window.aiDirectorCamera = new AIDirectorCamera(window.app);
                console.log('🎬 AI Director Camera V2.3.1 登録完了');
                clearInterval(check);
            }
        }, 100);
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => setTimeout(initAIDirectorCamera, 1500));
} else {
    setTimeout(initAIDirectorCamera, 1500);
}

window.AIDirectorCamera = AIDirectorCamera;
