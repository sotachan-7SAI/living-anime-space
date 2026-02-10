// Motion List Manager v6 - 感情強度対応 + 挨拶/軽い喜び区別
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { VRMAnimationLoaderPlugin, createVRMAnimationClip } from '@pixiv/three-vrm-animation';

class MotionListManager {
    constructor() {
        this.motionFiles = [];
        this.filterText = '';
        this.panel = null;
        this.isDragging = false;
        this.dragOffset = { x: 0, y: 0 };
        this.motionKeywords = {};
        this.isLoaded = false;
        
        // 表情設定
        this.expressions = {
            'neutral': { icon: '😐', name: '通常' },
            'happy': { icon: '😊', name: '喜' },
            'angry': { icon: '😠', name: '怒' },
            'sad': { icon: '😢', name: '哀' },
            'surprised': { icon: '😲', name: '驚' },
            'relaxed': { icon: '😌', name: '和' },
            'blink': { icon: '😑', name: '閉目' }
        };
        
        this.currentExpression = 'neutral';
        this.motionExpressions = {};
        this.expressionInterval = null;
        
        // 瞬き制御
        this.blinkInterval = null;
        this.isBlinkPaused = false;
        this.blinkWeight = 0;
        this.blinkEnabled = true; // 瞬きON/OFF
        
        // まぶた調整
        this.eyeClosedWeight = 0;
        
        this.init();
    }
    
    init() {
        const self = this;
        this.loadMotionExpressions();
        this.createFloatingPanel();
        
        setTimeout(() => {
            const btn = document.getElementById('more-motions-btn');
            if (btn) btn.onclick = () => self.togglePanel();
            self.preloadMotionList();
            self.startBlink();
            console.log('MotionListManager v6 initialized (感情強度対応)');
        }, 500);
        
        window.motionListManager = this;
    }
    
    // 瞬きを開始
    startBlink() {
        if (this.blinkInterval) clearInterval(this.blinkInterval);
        
        const self = this;
        const doBlink = () => {
            if (self.isBlinkPaused || !self.blinkEnabled) return;
            if (!window.app || !window.app.vrm) return;
            
            const vrm = window.app.vrm;
            const em = vrm.expressionManager;
            if (!em) return;
            
            // 瞬き
            let progress = 0;
            const blinkAnim = setInterval(() => {
                progress += 0.1;
                if (progress <= 0.5) {
                    self.blinkWeight = progress * 2;
                } else if (progress <= 1) {
                    self.blinkWeight = (1 - progress) * 2;
                } else {
                    self.blinkWeight = 0;
                    clearInterval(blinkAnim);
                }
                try {
                    em.setValue('blink', self.blinkWeight);
                } catch(e) {}
            }, 30);
        };
        
        // ランダム間隔で瞬き
        const scheduleNext = () => {
            const delay = 2000 + Math.random() * 4000;
            this.blinkInterval = setTimeout(() => {
                doBlink();
                scheduleNext();
            }, delay);
        };
        scheduleNext();
    }
    
    // 瞬きを停止
    pauseBlink() {
        this.isBlinkPaused = true;
    }
    
    // 瞬きを再開
    resumeBlink() {
        this.isBlinkPaused = false;
    }
    
    loadMotionExpressions() {
        try {
            const saved = localStorage.getItem('motionExpressions');
            if (saved) {
                this.motionExpressions = JSON.parse(saved);
            }
        } catch (e) {}
    }
    
    saveMotionExpressions() {
        try {
            localStorage.setItem('motionExpressions', JSON.stringify(this.motionExpressions));
            console.log('💾 表情設定を保存');
        } catch (e) {}
    }
    
    guessExpressionForMotion(filename) {
        const name = filename.toLowerCase();
        if (name.includes('喜ぶ') || name.includes('ガッツ') || name.includes('ジャンプ') || name.includes('ok')) return 'happy';
        if (name.includes('怒る') || name.includes('否定') || name.includes('じだんだ')) return 'angry';
        if (name.includes('頭をかかえる') || name.includes('悲し') || name.includes('たおれ')) return 'sad';
        if (name.includes('びっくり') || name.includes('びびり') || name.includes('なにそれ')) return 'surprised';
        if (name.includes('セクシー') || name.includes('投げキッス') || name.includes('お辞儀') || name.includes('考える')) return 'relaxed';
        return 'neutral';
    }
    
    getExpressionForMotion(filename) {
        return this.motionExpressions[filename] || this.guessExpressionForMotion(filename);
    }
    
    setExpressionForMotion(filename, expression) {
        this.motionExpressions[filename] = expression;
    }
    
    // VRM表情を設定
    setVRMExpression(expressionName, weight = 1) {
        if (!window.app || !window.app.vrm) return;
        
        const vrm = window.app.vrm;
        const em = vrm.expressionManager;
        if (!em) return;
        
        // 目閉じモードの場合
        if (expressionName === 'blink') {
            this.pauseBlink();
            try {
                em.setValue('happy', 0);
                em.setValue('angry', 0);
                em.setValue('sad', 0);
                em.setValue('surprised', 0);
                em.setValue('relaxed', 0);
                em.setValue('blink', weight);
            } catch(e) {}
            this.currentExpression = 'blink';
            return;
        }
        
        // 通常表情
        this.resumeBlink();
        try {
            em.setValue('blink', 0);
            em.setValue('happy', 0);
            em.setValue('angry', 0);
            em.setValue('sad', 0);
            em.setValue('surprised', 0);
            em.setValue('relaxed', 0);
            if (expressionName !== 'neutral') {
                em.setValue(expressionName, weight);
            }
        } catch(e) {}
        
        this.currentExpression = expressionName;
    }
    
    // まぶた（目閉じ）の重みを設定
    setEyeClosedWeight(weight) {
        if (!window.app || !window.app.vrm) return;
        
        const vrm = window.app.vrm;
        const em = vrm.expressionManager;
        if (!em) return;
        
        this.eyeClosedWeight = weight;
        
        if (weight > 0) {
            this.pauseBlink();
            try {
                em.setValue('blink', weight);
            } catch(e) {}
        } else {
            this.resumeBlink();
            try {
                em.setValue('blink', 0);
            } catch(e) {}
        }
    }
    
    animateExpression(targetExpression, duration = 200) {
        if (this.expressionInterval) clearInterval(this.expressionInterval);
        
        const startTime = Date.now();
        const self = this;
        
        this.expressionInterval = setInterval(() => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);
            self.setVRMExpression(targetExpression, progress);
            if (progress >= 1) {
                clearInterval(self.expressionInterval);
                self.expressionInterval = null;
            }
        }, 16);
    }
    
    async preloadMotionList() {
        try {
            const response = await fetch('./motions/motions.json?t=' + Date.now());
            if (!response.ok) return;
            const data = await response.json();
            this.motionFiles = data.motions || [];
            this.motionFiles.sort((a, b) => a.localeCompare(b, 'ja'));
            this.buildKeywordMapping();
            this.isLoaded = true;
        } catch (e) {}
    }
    
    buildKeywordMapping() {
        this.motionKeywords = {
            '喜び': ['喜ぶ', 'ガッツ', 'よろこぶ', 'ジャンプ'],
            '怒り': ['怒る', '否定', 'じだんだ'],
            '悲しみ': ['頭をかかえる', '悲しい'],
            '驚き': ['びっくり', 'びびり'],
            '考え': ['考える', '悩む'],
            '挨拶': ['お辞儀', '挨拶', '手をふる'],
            '肯定': ['OK', '全身でOK'],
            '否定': ['否定', '一線をひく'],
            '手振り': ['手をふる', 'ノリノリ'],
            'ダンス': ['ダンス', 'Kpop'],
            '蹴り': ['蹴り', '回し蹴り'],
            '転': ['転', 'バク転'],
            '走る': ['走る', 'あるき'],
            'ポーズ': ['ポーズ', '仁王'],
            'セクシー': ['セクシー', '投げキッス']
        };
        
        // neutral時に使う「話す」系モーション
        this.talkingMotionKeywords = ['しゃべる', '話す', 'トーク', 'talking', 'speak', '説明', '相槌', 'うなずく', '会話'];
        
        // 挨拶系キーワード（greeting用）
        this.greetingKeywords = ['こんにちは', 'おはよう', 'こんばんは', 'ただいま', 'おかえり', 'はじめまして', 'よろしく', 'どうも', 'ハロー', 'hello', 'hi'];
        
        // 挨拶用モーションキーワード（軽いリアクション）
        this.greetingMotionKeywords = ['手をふる', 'お辞儀', '挨拶', 'うなずく', '会釈'];
    }
    
    async autoSelectMotion(text) {
        if (!this.isLoaded || this.motionFiles.length === 0) {
            await this.preloadMotionList();
        }
        if (this.motionFiles.length === 0) return false;
        
        // ========== 1. まず挨拶かどうかチェック ==========
        const isGreeting = this.greetingKeywords.some(kw => text.includes(kw));
        
        if (isGreeting) {
            console.log('🎭 検出された感情: greeting (挨拶)');
            
            // 挨拶用モーションを探す
            for (const file of this.motionFiles) {
                const fn = file.toLowerCase();
                for (const kw of this.greetingMotionKeywords) {
                    if (fn.includes(kw.toLowerCase())) {
                        console.log(`👋 挨拶モーション選択: ${file}`);
                        await this.playMotionByFilename(file);
                        return true;
                    }
                }
            }
            
            // 挨拶モーションがなければneutralフォールバック
            console.log('🗣️ 挨拶モーションなし - neutralフォールバック');
            return await this.playNeutralMotion();
        }
        
        // ========== 2. 感情強度を検出 ==========
        // 高強度の喜び（大喜び、勝利、成功）
        const strongHappyKeywords = ['やった！', '最高！', 'すごい！', '勝った', '成功', '優勝', '合格', 'イェーイ', 'わーい！', '！！！', 'やったー'];
        
        // 軽い喜び（感謝、普通の喜び）
        const mildHappyKeywords = ['嬉しい', 'ありがとう', '楽しい', '良い', 'いいね', '素晴らしい', '幸せ', '♪'];
        
        // その他の感情（変更なし）
        const emotionKeywords = {
            'angry': ['怒', 'むかつく', '嫌', 'ダメ', '許さない', 'ふざけるな', 'イライラ', '最悪', 'やめて'],
            'sad': ['悲しい', '辛い', '残念', 'ごめん', '申し訳', 'つらい', '泣'],
            'surprised': ['えっ', 'びっくり', 'まさか', 'やばい', '本当', 'ええ', 'うそ', '驚'],
            'relaxed': ['うーん', 'なるほど', '難しい', 'そうですね', '考え', 'ふむ', 'へー', 'ほー']
        };
        
        // 高強度喜びをチェック
        let isStrongHappy = strongHappyKeywords.some(kw => text.includes(kw));
        
        // 軽い喜びをチェック
        let isMildHappy = !isStrongHappy && mildHappyKeywords.some(kw => text.includes(kw));
        
        // その他の感情をチェック
        let detectedEmotion = null;
        let maxCount = 0;
        
        for (const [emotion, keywords] of Object.entries(emotionKeywords)) {
            let count = 0;
            for (const kw of keywords) {
                if (text.includes(kw)) count++;
            }
            if (count > maxCount) {
                maxCount = count;
                detectedEmotion = emotion;
            }
        }
        
        // 感情の優先度: strongHappy > その他感情 > mildHappy > neutral
        if (isStrongHappy) {
            detectedEmotion = 'strongHappy';
        } else if (detectedEmotion === null && isMildHappy) {
            detectedEmotion = 'mildHappy';
        }
        
        console.log('🎭 検出された感情:', detectedEmotion || 'neutral');
        
        // ========== 3. 感情に応じたモーション選択 ==========
        
        // 高強度喜び → ガッツポーズ、ジャンプ、大喜び
        if (detectedEmotion === 'strongHappy') {
            const strongHappyMotionKw = ['ガッツ', 'ジャンプ', 'よろこぶ', 'めちゃくちゃ', '大喜び'];
            for (const file of this.motionFiles) {
                const fn = file.toLowerCase();
                for (const kw of strongHappyMotionKw) {
                    if (fn.includes(kw.toLowerCase())) {
                        console.log(`🎉 大喜びモーション選択: ${file}`);
                        await this.playMotionByFilename(file);
                        return true;
                    }
                }
            }
        }
        
        // 軽い喜び → 手を振る、うなずく、軽いOK
        if (detectedEmotion === 'mildHappy') {
            const mildHappyMotionKw = ['手をふる', 'うなずく', '笑顔', 'にっこり', '小さく喜ぶ', '興味'];
            for (const file of this.motionFiles) {
                const fn = file.toLowerCase();
                for (const kw of mildHappyMotionKw) {
                    if (fn.includes(kw.toLowerCase())) {
                        console.log(`😊 軽い喜びモーション選択: ${file}`);
                        await this.playMotionByFilename(file);
                        return true;
                    }
                }
            }
            // 軽い喜び用モーションがなければneutralフォールバック
            console.log('🗣️ 軽い喜びモーションなし - neutralフォールバック');
            return await this.playNeutralMotion();
        }
        
        // その他の感情（angry, sad, surprised, relaxed）
        const motionKeywordMap = {
            'angry': ['怒る', '否定', 'じだんだ', 'おっぱらい', 'ディス'],
            'sad': ['頭をかかえる', '悲しい', 'たおれ'],
            'surprised': ['びっくり', 'びびり', 'なにそれ', 'えー'],
            'relaxed': ['考える', '興味', 'セクシー', '投げキッス']
        };
        
        if (detectedEmotion && motionKeywordMap[detectedEmotion]) {
            for (const file of this.motionFiles) {
                const fn = file.toLowerCase();
                for (const kw of motionKeywordMap[detectedEmotion]) {
                    if (fn.includes(kw.toLowerCase())) {
                        console.log(`🎬 ${detectedEmotion}モーション選択: ${file}`);
                        await this.playMotionByFilename(file);
                        return true;
                    }
                }
            }
        }
        
        // ========== 4. neutralフォールバック ==========
        console.log('🗣️ neutral検出 - 話すモーションを探索中...');
        return await this.playNeutralMotion();
    }
    
    // neutralモーションを再生
    async playNeutralMotion() {
        // まず「しゃべる」「話す」系のモーションを優先的に探す
        let talkingMotion = null;
        for (const file of this.motionFiles) {
            const fn = file.toLowerCase();
            for (const kw of this.talkingMotionKeywords) {
                if (fn.includes(kw.toLowerCase())) {
                    talkingMotion = file;
                    break;
                }
            }
            if (talkingMotion) break;
        }
        
        // 話すモーションがあれば再生
        if (talkingMotion) {
            console.log(`🗣️ 話すモーション選択: ${talkingMotion}`);
            await this.playMotionByFilename(talkingMotion);
            return true;
        }
        
        // 話すモーションがなければ「考える」「興味」「うなずく」系を探す
        const neutralFallbackKeywords = ['考える', '興味', 'うなずく', '手をふる', 'お辞儀'];
        for (const file of this.motionFiles) {
            const fn = file.toLowerCase();
            for (const kw of neutralFallbackKeywords) {
                if (fn.includes(kw.toLowerCase())) {
                    console.log(`🗣️ フォールバックモーション選択: ${file}`);
                    await this.playMotionByFilename(file);
                    return true;
                }
            }
        }
        
        console.log('🎭 適切なモーションが見つかりませんでした');
        return false;
    }
    
    async playMotionByFilename(filename) {
        if (!window.app || !window.app.vrm) return false;
        
        try {
            const loader = new GLTFLoader();
            loader.register((parser) => new VRMAnimationLoaderPlugin(parser));
            
            const gltf = await loader.loadAsync('./motions/' + encodeURIComponent(filename));
            const vrmAnim = gltf.userData.vrmAnimation || gltf.userData.vrmAnimations?.[0];
            if (!vrmAnim) throw new Error('No animation');
            
            if (window.app.currentAction) window.app.currentAction.stop();
            if (!window.app.mixer) window.app.mixer = new THREE.AnimationMixer(window.app.vrm.scene);
            
            const clip = createVRMAnimationClip(vrmAnim, window.app.vrm);
            window.app.currentAction = window.app.mixer.clipAction(clip);
            window.app.currentAction.reset();
            window.app.currentAction.setLoop(THREE.LoopOnce, 1);
            window.app.currentAction.clampWhenFinished = true;
            window.app.currentAction.play();
            
            // まぶた調整をリセット
            this.setEyeClosedWeight(0);
            const eyelidSlider = document.getElementById('eyelid-slider');
            const eyelidValue = document.getElementById('eyelid-value');
            if (eyelidSlider) eyelidSlider.value = 0;
            if (eyelidValue) eyelidValue.textContent = '0%';
            
            const expr = this.getExpressionForMotion(filename);
            this.animateExpression(expr);
            this.updatePanelSelection(filename);
            this.updateExpressionButtons(expr);
            
            return true;
        } catch (e) {
            console.error('Motion error:', e);
            return false;
        }
    }
    
    updatePanelSelection(filename) {
        const container = document.getElementById('motion-float-list');
        if (!container) return;
        container.querySelectorAll('.motion-float-item').forEach(item => {
            item.classList.toggle('playing', item.dataset.file === filename);
        });
    }
    
    updateExpressionButtons(expr) {
        document.querySelectorAll('.expression-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.expr === expr);
        });
    }
    
    createFloatingPanel() {
        const style = document.createElement('style');
        style.textContent = `
            #motion-float-panel {
                position: fixed;
                top: 80px;
                left: 50%;
                transform: translateX(-50%);
                width: 480px;
                min-width: 350px;
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
            #motion-float-panel.visible { display: flex; }
            
            /* リサイズハンドル */
            #resize-handle {
                position: absolute;
                right: 0;
                bottom: 0;
                width: 20px;
                height: 20px;
                cursor: nwse-resize;
                background: linear-gradient(135deg, transparent 50%, #667eea 50%);
                border-radius: 0 0 12px 0;
            }
            #resize-handle:hover {
                background: linear-gradient(135deg, transparent 50%, #764ba2 50%);
            }
            
            #motion-float-header {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                padding: 10px 15px;
                cursor: move;
                display: flex;
                align-items: center;
                justify-content: space-between;
                user-select: none;
            }
            #motion-float-header .title { font-size: 14px; font-weight: bold; }
            #motion-float-header .close-btn {
                background: rgba(255,255,255,0.2);
                border: none;
                color: white;
                width: 26px; height: 26px;
                border-radius: 50%;
                cursor: pointer;
                font-size: 14px;
            }
            #motion-float-header .close-btn:hover { background: rgba(255,255,255,0.3); }
            
            #motion-float-body {
                padding: 10px;
                flex: 1;
                display: flex;
                flex-direction: column;
                overflow: hidden;
                background: rgba(255, 255, 255, 0.98);
                border-radius: 0 0 12px 12px;
            }
            
            /* 表情ボタンエリア */
            #expression-area {
                display: flex;
                gap: 8px;
                margin-bottom: 10px;
                padding: 8px;
                background: #f5f5f5;
                border-radius: 8px;
                align-items: center;
                flex-wrap: wrap;
            }
            
            .expression-btn {
                width: 36px; height: 36px;
                border: 2px solid #ddd;
                border-radius: 8px;
                background: white;
                cursor: pointer;
                font-size: 18px;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: all 0.2s;
            }
            .expression-btn:hover { transform: scale(1.1); border-color: #667eea; }
            .expression-btn.active { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-color: #667eea; }
            
            /* 瞬きトグル */
            .blink-toggle {
                min-width: 50px;
                height: 36px;
                border: 2px solid #4CAF50;
                border-radius: 8px;
                background: #4CAF50;
                color: white;
                cursor: pointer;
                font-size: 11px;
                font-weight: bold;
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 2px;
                transition: all 0.2s;
                padding: 0 6px;
            }
            .blink-toggle:hover { opacity: 0.9; }
            .blink-toggle.off {
                background: #9e9e9e;
                border-color: #9e9e9e;
                color: white;
            }
            
            /* まぶた調整 */
            #eyelid-control {
                display: flex;
                align-items: center;
                gap: 6px;
                margin-left: auto;
                padding: 4px 8px;
                background: white;
                border-radius: 6px;
                border: 1px solid #ddd;
            }
            #eyelid-control .eyelid-icon { font-size: 16px; cursor: pointer; }
            #eyelid-slider { width: 60px; height: 4px; }
            #eyelid-value { font-size: 10px; color: #666; min-width: 28px; }
            
            /* 検索・トグル */
            #motion-float-controls {
                display: flex;
                gap: 6px;
                margin-bottom: 8px;
                align-items: center;
            }
            #motion-float-controls input[type="text"] {
                flex: 1;
                padding: 6px 10px;
                border: 1px solid #ddd;
                border-radius: 6px;
                font-size: 12px;
            }
            #motion-float-controls .count { font-size: 10px; color: #888; }
            
            #auto-toggle-row {
                display: flex;
                align-items: center;
                gap: 6px;
                padding: 5px 8px;
                background: #e8f5e9;
                border-radius: 6px;
                margin-bottom: 8px;
                font-size: 11px;
            }
            #auto-toggle-row input { width: 14px; height: 14px; }
            
            /* リスト */
            #motion-float-list {
                flex: 1;
                overflow-y: auto;
                overflow-x: visible;
                padding-left: 10px;
                padding-right: 10px;
            }
            
            .motion-float-item {
                background: #f8f9fa;
                border: 1px solid #e0e0e0;
                border-radius: 6px;
                padding: 6px 8px;
                margin-bottom: 4px;
                cursor: pointer;
                display: flex;
                align-items: center;
                gap: 6px;
                transition: all 0.15s;
                position: relative;
            }
            .motion-float-item:hover {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
            }
            .motion-float-item.playing {
                background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%);
                color: white;
            }
            
            .motion-float-item .m-icon { font-size: 16px; width: 22px; text-align: center; }
            .motion-float-item .m-name { flex: 1; font-size: 11px; font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
            
            /* 名前変更ボタン */
            .motion-float-item .rename-btn {
                font-size: 12px;
                padding: 2px 4px;
                cursor: pointer;
                opacity: 0.5;
                transition: opacity 0.2s;
            }
            .motion-float-item .rename-btn:hover { opacity: 1; }
            .motion-float-item:hover .rename-btn { opacity: 0.8; }
            .motion-float-item.playing .rename-btn { opacity: 0.8; }
            
            /* 表情セレクター（横に表示） */
            .motion-float-item .expr-btn {
                font-size: 14px;
                padding: 2px 4px;
                border-radius: 4px;
                cursor: pointer;
                background: rgba(255,255,255,0.3);
                position: relative;
            }
            .motion-float-item:hover .expr-btn { background: rgba(255,255,255,0.4); }
            
            .expr-popup {
                position: absolute;
                left: 100%;
                top: 50%;
                transform: translateY(-50%);
                margin-left: 8px;
                background: white;
                border: 1px solid #ddd;
                border-radius: 8px;
                box-shadow: 0 4px 16px rgba(0,0,0,0.2);
                padding: 6px;
                display: none;
                flex-direction: row;
                gap: 4px;
                z-index: 10001;
            }
            .expr-popup.show { display: flex; }
            
            .expr-popup-item {
                width: 32px; height: 32px;
                border: 1px solid #ddd;
                border-radius: 6px;
                background: white;
                cursor: pointer;
                font-size: 18px;
                display: flex;
                align-items: center;
                justify-content: center;
            }
            .expr-popup-item:hover { background: #f0f0f0; border-color: #667eea; }
            .expr-popup-item.selected { background: #667eea; border-color: #667eea; }
            
            /* ローディング */
            .motion-float-loading, .motion-float-empty {
                text-align: center;
                padding: 20px;
                color: #888;
                font-size: 12px;
            }
            
            /* 保存ボタン */
            #save-expr-btn {
                margin-top: 8px;
                padding: 8px;
                background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%);
                color: white;
                border: none;
                border-radius: 6px;
                font-size: 12px;
                font-weight: bold;
                cursor: pointer;
            }
            #save-expr-btn:hover { opacity: 0.9; }
            
            /* リネームダイアログ */
            #rename-dialog {
                position: fixed;
                top: 0; left: 0; right: 0; bottom: 0;
                background: rgba(0,0,0,0.5);
                z-index: 20000;
                display: none;
                align-items: center;
                justify-content: center;
            }
            #rename-dialog.show { display: flex; }
            
            #rename-dialog-box {
                background: white;
                border-radius: 12px;
                padding: 20px;
                width: 400px;
                max-width: 90vw;
                box-shadow: 0 8px 32px rgba(0,0,0,0.3);
            }
            #rename-dialog-box h3 {
                margin: 0 0 15px 0;
                font-size: 16px;
                color: #333;
            }
            #rename-dialog-box .current-name {
                font-size: 11px;
                color: #888;
                margin-bottom: 10px;
                word-break: break-all;
            }
            #rename-dialog-box input {
                width: 100%;
                padding: 10px;
                border: 2px solid #ddd;
                border-radius: 8px;
                font-size: 14px;
                margin-bottom: 15px;
                box-sizing: border-box;
            }
            #rename-dialog-box input:focus {
                outline: none;
                border-color: #667eea;
            }
            #rename-dialog-box .buttons {
                display: flex;
                gap: 10px;
                justify-content: flex-end;
            }
            #rename-dialog-box button {
                padding: 8px 20px;
                border: none;
                border-radius: 6px;
                font-size: 13px;
                font-weight: bold;
                cursor: pointer;
            }
            #rename-dialog-box .cancel-btn {
                background: #e0e0e0;
                color: #333;
            }
            #rename-dialog-box .ok-btn {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
            }
            #rename-dialog-box .ok-btn:hover { opacity: 0.9; }
            #rename-dialog-box .note {
                font-size: 10px;
                color: #888;
                margin-top: 10px;
                padding: 8px;
                background: #f5f5f5;
                border-radius: 6px;
            }
            
            #motion-float-list::-webkit-scrollbar { width: 5px; }
            #motion-float-list::-webkit-scrollbar-thumb { background: #ccc; border-radius: 3px; }
        `;
        document.head.appendChild(style);
        
        this.panel = document.createElement('div');
        this.panel.id = 'motion-float-panel';
        this.panel.innerHTML = `
            <div id="motion-float-header">
                <div class="title">📁 モーション一覧</div>
                <button class="close-btn" id="motion-float-close">✕</button>
            </div>
            <div id="motion-float-body">
                <div id="expression-area">
                    <button class="expression-btn active" data-expr="neutral" title="通常">😐</button>
                    <button class="expression-btn" data-expr="happy" title="喜">😊</button>
                    <button class="expression-btn" data-expr="angry" title="怒">😠</button>
                    <button class="expression-btn" data-expr="sad" title="哀">😢</button>
                    <button class="expression-btn" data-expr="surprised" title="驚">😲</button>
                    <button class="expression-btn" data-expr="relaxed" title="和">😌</button>
                    <button class="expression-btn" data-expr="blink" title="目閉じ">😑</button>
                    <button class="blink-toggle" id="blink-toggle" title="瞬きON/OFF">👁 ON</button>
                    <div id="eyelid-control">
                        <span class="eyelid-icon" title="まぶた調整">👁</span>
                        <input type="range" id="eyelid-slider" min="0" max="100" value="0">
                        <span id="eyelid-value">0%</span>
                    </div>
                </div>
                
                <div id="auto-toggle-row">
                    <input type="checkbox" id="auto-motion-enabled" checked>
                    <label for="auto-motion-enabled">🤖 会話に応じてモーション自動選択</label>
                </div>
                
                <div id="motion-float-controls">
                    <input type="text" id="motion-float-input" placeholder="🔍 検索...">
                    <span class="count" id="motion-float-count"></span>
                </div>
                
                <div id="motion-float-list">
                    <div class="motion-float-loading">読み込み中...</div>
                </div>
                
                <button id="save-expr-btn">💾 表情設定を保存</button>
            </div>
            <div id="resize-handle" title="ドラッグでサイズ変更"></div>
        `;
        document.body.appendChild(this.panel);
        
        // リネームダイアログを作成
        this.createRenameDialog();
        
        this.setupPanelEvents();
    }
    
    // リネームダイアログを作成
    createRenameDialog() {
        const dialog = document.createElement('div');
        dialog.id = 'rename-dialog';
        dialog.innerHTML = `
            <div id="rename-dialog-box">
                <h3>✏️ モーション名を変更</h3>
                <div class="current-name">元のファイル名: <span id="rename-original"></span></div>
                <input type="text" id="rename-input" placeholder="新しい名前を入力...">
                <div class="buttons">
                    <button class="cancel-btn" id="rename-cancel">キャンセル</button>
                    <button class="ok-btn" id="rename-ok">変更する</button>
                </div>
                <div class="note">
                    ※ 変更を適用するには、「リネーム実行」ボタンを押してください。<br>
                    実際のファイル名変更は rename-motions.bat で実行されます。
                </div>
            </div>
        `;
        document.body.appendChild(dialog);
        
        this.renameDialog = dialog;
        this.renameQueue = []; // リネーム待ちリスト
        this.loadRenameQueue();
        
        // イベント
        const self = this;
        document.getElementById('rename-cancel').onclick = () => self.hideRenameDialog();
        document.getElementById('rename-ok').onclick = () => self.confirmRename();
        document.getElementById('rename-input').onkeypress = (e) => {
            if (e.key === 'Enter') self.confirmRename();
        };
        dialog.onclick = (e) => {
            if (e.target === dialog) self.hideRenameDialog();
        };
    }
    
    // リネームキューを読み込み
    loadRenameQueue() {
        try {
            const saved = localStorage.getItem('motionRenameQueue');
            if (saved) {
                this.renameQueue = JSON.parse(saved);
            }
        } catch (e) {}
    }
    
    // リネームキューを保存
    saveRenameQueue() {
        try {
            localStorage.setItem('motionRenameQueue', JSON.stringify(this.renameQueue));
        } catch (e) {}
    }
    
    // リネームダイアログを表示
    showRenameDialog(filename) {
        this.currentRenameFile = filename;
        const displayName = filename.replace('.vrma', '');
        
        document.getElementById('rename-original').textContent = filename;
        document.getElementById('rename-input').value = displayName;
        this.renameDialog.classList.add('show');
        
        setTimeout(() => {
            document.getElementById('rename-input').focus();
            document.getElementById('rename-input').select();
        }, 100);
    }
    
    // リネームダイアログを非表示
    hideRenameDialog() {
        this.renameDialog.classList.remove('show');
        this.currentRenameFile = null;
    }
    
    // リネームを確定
    confirmRename() {
        const newName = document.getElementById('rename-input').value.trim();
        if (!newName) {
            alert('名前を入力してください');
            return;
        }
        
        const oldFile = this.currentRenameFile;
        const newFile = newName + '.vrma';
        
        if (oldFile === newFile) {
            this.hideRenameDialog();
            return;
        }
        
        // リネームキューに追加
        const existing = this.renameQueue.findIndex(r => r.oldFile === oldFile);
        if (existing >= 0) {
            this.renameQueue[existing].newFile = newFile;
        } else {
            this.renameQueue.push({ oldFile, newFile });
        }
        this.saveRenameQueue();
        
        // 表示名を更新（ローカルのみ）
        const idx = this.motionFiles.indexOf(oldFile);
        if (idx >= 0) {
            this.motionFiles[idx] = newFile;
        }
        
        // 表情設定も移行
        if (this.motionExpressions[oldFile]) {
            this.motionExpressions[newFile] = this.motionExpressions[oldFile];
            delete this.motionExpressions[oldFile];
            this.saveMotionExpressions();
        }
        
        this.hideRenameDialog();
        this.renderMotionList();
        
        // バッチファイルを生成
        this.generateRenameBatch();
        
        console.log(`📝 リネーム予約: ${oldFile} -> ${newFile}`);
    }
    
    // リネームバッチファイルを生成
    generateRenameBatch() {
        if (this.renameQueue.length === 0) return;
        
        let bat = '@echo off\nchcp 65001\necho モーションファイルをリネームします...\ncd /d "%~dp0motions"\n\n';
        
        for (const rename of this.renameQueue) {
            bat += `if exist "${rename.oldFile}" ren "${rename.oldFile}" "${rename.newFile}"\n`;
        }
        
        bat += '\necho 完了しました！\npause';
        
        // ダウンロード
        const blob = new Blob([bat], { type: 'text/plain' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'rename-motions.bat';
        a.click();
        
        alert(`📄 rename-motions.bat をダウンロードしました。\n\nmotionsフォルダと同じ場所に置いて実行してください。\n\nリネーム待ち: ${this.renameQueue.length}件`);
    }
    
    // リネームキューをクリア
    clearRenameQueue() {
        this.renameQueue = [];
        this.saveRenameQueue();
    }
    
    setupPanelEvents() {
        const self = this;
        const header = document.getElementById('motion-float-header');
        const closeBtn = document.getElementById('motion-float-close');
        const searchInput = document.getElementById('motion-float-input');
        const saveBtn = document.getElementById('save-expr-btn');
        const eyelidSlider = document.getElementById('eyelid-slider');
        
        closeBtn.onclick = () => self.hidePanel();
        
        searchInput.oninput = (e) => {
            self.filterText = e.target.value.toLowerCase();
            self.renderMotionList();
        };
        
        saveBtn.onclick = () => {
            self.saveMotionExpressions();
            saveBtn.textContent = '✅ 保存完了!';
            setTimeout(() => { saveBtn.textContent = '💾 表情設定を保存'; }, 1500);
        };
        
        // まぶたスライダー
        eyelidSlider.oninput = (e) => {
            const val = parseInt(e.target.value);
            document.getElementById('eyelid-value').textContent = val + '%';
            self.setEyeClosedWeight(val / 100);
        };
        
        // 瞬きトグル
        const blinkToggle = document.getElementById('blink-toggle');
        blinkToggle.onclick = () => {
            self.blinkEnabled = !self.blinkEnabled;
            if (self.blinkEnabled) {
                blinkToggle.classList.remove('off');
                blinkToggle.innerHTML = '👁 ON';
                blinkToggle.title = '瞬きON（クリックでOFF）';
                self.resumeBlink();
            } else {
                blinkToggle.classList.add('off');
                blinkToggle.innerHTML = '👁 OFF';
                blinkToggle.title = '瞬きOFF（クリックでON）';
                self.pauseBlink();
            }
        };
        
        // 表情ボタン
        document.querySelectorAll('.expression-btn').forEach(btn => {
            btn.onclick = () => {
                const expr = btn.dataset.expr;
                document.querySelectorAll('.expression-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                
                if (expr === 'blink') {
                    // 目閉じボタン
                    self.pauseBlink();
                    self.setVRMExpression('blink', 1);
                    eyelidSlider.value = 100;
                    document.getElementById('eyelid-value').textContent = '100%';
                } else {
                    // 他の表情
                    eyelidSlider.value = 0;
                    document.getElementById('eyelid-value').textContent = '0%';
                    self.animateExpression(expr);
                }
            };
        });
        
        // ドラッグ
        header.onmousedown = (e) => {
            if (e.target === closeBtn) return;
            self.isDragging = true;
            const rect = self.panel.getBoundingClientRect();
            self.dragOffset.x = e.clientX - rect.left;
            self.dragOffset.y = e.clientY - rect.top;
            self.panel.style.transform = 'none';
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
            self.panel.style.transform = 'none';
        };
        
        document.addEventListener('touchmove', (e) => {
            if (!self.isDragging) return;
            const touch = e.touches[0];
            self.panel.style.left = (touch.clientX - self.dragOffset.x) + 'px';
            self.panel.style.top = (touch.clientY - self.dragOffset.y) + 'px';
        });
        
        document.addEventListener('touchend', () => { self.isDragging = false; });
        
        // ポップアップ外クリックで閉じる
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.expr-popup') && !e.target.closest('.expr-btn')) {
                document.querySelectorAll('.expr-popup').forEach(p => p.classList.remove('show'));
            }
        });
        
        // リサイズハンドル
        const resizeHandle = document.getElementById('resize-handle');
        let isResizing = false;
        let startX, startY, startWidth, startHeight;
        
        resizeHandle.onmousedown = (e) => {
            isResizing = true;
            startX = e.clientX;
            startY = e.clientY;
            startWidth = self.panel.offsetWidth;
            startHeight = self.panel.offsetHeight;
            e.preventDefault();
            e.stopPropagation();
        };
        
        document.addEventListener('mousemove', (e) => {
            if (!isResizing) return;
            const newWidth = startWidth + (e.clientX - startX);
            const newHeight = startHeight + (e.clientY - startY);
            if (newWidth >= 350) self.panel.style.width = newWidth + 'px';
            if (newHeight >= 300) self.panel.style.height = newHeight + 'px';
        });
        
        document.addEventListener('mouseup', () => {
            isResizing = false;
        });
    }
    
    isAutoMotionEnabled() {
        const cb = document.getElementById('auto-motion-enabled');
        return cb ? cb.checked : true;
    }
    
    togglePanel() {
        this.panel.classList.toggle('visible');
        if (this.panel.classList.contains('visible')) {
            this.loadMotionList();
        }
    }
    
    showPanel() { this.panel.classList.add('visible'); this.loadMotionList(); }
    hidePanel() { this.panel.classList.remove('visible'); }
    
    async loadMotionList() {
        const container = document.getElementById('motion-float-list');
        if (!container) return;
        
        container.innerHTML = '<div class="motion-float-loading">🔄 読み込み中...</div>';
        
        if (!this.isLoaded) await this.preloadMotionList();
        
        if (this.motionFiles.length === 0) {
            container.innerHTML = '<div class="motion-float-empty">📭 モーションがありません</div>';
            return;
        }
        
        this.renderMotionList();
        document.getElementById('motion-float-count').textContent = this.motionFiles.length + '件';
    }
    
    renderMotionList() {
        const container = document.getElementById('motion-float-list');
        if (!container) return;
        
        const filtered = this.motionFiles.filter(f => !this.filterText || f.toLowerCase().includes(this.filterText));
        
        const countEl = document.getElementById('motion-float-count');
        if (countEl) {
            countEl.textContent = this.filterText 
                ? `${filtered.length}/${this.motionFiles.length}件`
                : `${this.motionFiles.length}件`;
        }
        
        if (filtered.length === 0) {
            container.innerHTML = '<div class="motion-float-empty">🔍 該当なし</div>';
            return;
        }
        
        container.innerHTML = '';
        const self = this;
        
        for (const file of filtered) {
            const item = document.createElement('div');
            item.className = 'motion-float-item';
            item.dataset.file = file;
            
            const displayName = file.replace('.vrma', '');
            
            // モーションアイコン
            let icon = '🎬';
            const n = displayName.toLowerCase();
            if (n.includes('ダンス') || n.includes('kpop')) icon = '💃';
            else if (n.includes('蹴り')) icon = '🦵';
            else if (n.includes('セクシー')) icon = '💋';
            else if (n.includes('喜ぶ') || n.includes('ガッツ')) icon = '🎉';
            else if (n.includes('怒る') || n.includes('否定')) icon = '😤';
            else if (n.includes('お辞儀')) icon = '🙇';
            else if (n.includes('走る')) icon = '🏃';
            else if (n.includes('考える')) icon = '🤔';
            else if (n.includes('びっくり')) icon = '😱';
            else if (n.includes('転') || n.includes('バク')) icon = '🤸';
            else if (n.includes('手をふる')) icon = '👋';
            
            // このモーションの表情
            const expr = this.getExpressionForMotion(file);
            const exprIcon = this.expressions[expr]?.icon || '😐';
            
            item.innerHTML = `
                <span class="m-icon">${icon}</span>
                <span class="m-name" title="${file}">${displayName}</span>
                <span class="rename-btn" title="名前を変更">✏️</span>
                <span class="expr-btn" data-file="${file}">${exprIcon}</span>
                <div class="expr-popup" data-file="${file}">
                    ${Object.entries(this.expressions).map(([key, val]) => 
                        `<div class="expr-popup-item ${key === expr ? 'selected' : ''}" data-expr="${key}" title="${val.name}">${val.icon}</div>`
                    ).join('')}
                </div>
            `;
            
            // モーション再生（名前・アイコンクリック）
            item.querySelector('.m-name').onclick = () => self.playMotion(file, item);
            item.querySelector('.m-icon').onclick = () => self.playMotion(file, item);
            
            // リネームボタン
            item.querySelector('.rename-btn').onclick = (e) => {
                e.stopPropagation();
                self.showRenameDialog(file);
            };
            
            // 表情選択ポップアップ
            const exprBtn = item.querySelector('.expr-btn');
            const exprPopup = item.querySelector('.expr-popup');
            
            exprBtn.onclick = (e) => {
                e.stopPropagation();
                document.querySelectorAll('.expr-popup').forEach(p => p.classList.remove('show'));
                exprPopup.classList.toggle('show');
            };
            
            exprPopup.querySelectorAll('.expr-popup-item').forEach(popItem => {
                popItem.onclick = (e) => {
                    e.stopPropagation();
                    const newExpr = popItem.dataset.expr;
                    self.setExpressionForMotion(file, newExpr);
                    exprBtn.textContent = self.expressions[newExpr].icon;
                    exprPopup.querySelectorAll('.expr-popup-item').forEach(pi => pi.classList.remove('selected'));
                    popItem.classList.add('selected');
                    exprPopup.classList.remove('show');
                };
            });
            
            container.appendChild(item);
        }
    }
    
    async playMotion(filename, element) {
        if (!window.app || !window.app.vrm) {
            alert('VRMモデルを先に読み込んでください');
            return;
        }
        
        const container = document.getElementById('motion-float-list');
        if (container) {
            container.querySelectorAll('.motion-float-item').forEach(i => i.classList.remove('playing'));
        }
        if (element) element.classList.add('playing');
        
        try {
            const loader = new GLTFLoader();
            loader.register((parser) => new VRMAnimationLoaderPlugin(parser));
            
            const gltf = await loader.loadAsync('./motions/' + encodeURIComponent(filename));
            const vrmAnim = gltf.userData.vrmAnimation || gltf.userData.vrmAnimations?.[0];
            if (!vrmAnim) throw new Error('No animation');
            
            if (window.app.currentAction) window.app.currentAction.stop();
            if (!window.app.mixer) window.app.mixer = new THREE.AnimationMixer(window.app.vrm.scene);
            
            const clip = createVRMAnimationClip(vrmAnim, window.app.vrm);
            window.app.currentAction = window.app.mixer.clipAction(clip);
            window.app.currentAction.reset();
            window.app.currentAction.play();
            
            // まぶたリセット & 瞬き再開
            this.setEyeClosedWeight(0);
            const eyelidSlider = document.getElementById('eyelid-slider');
            const eyelidValue = document.getElementById('eyelid-value');
            if (eyelidSlider) eyelidSlider.value = 0;
            if (eyelidValue) eyelidValue.textContent = '0%';
            
            // 表情適用
            const expr = this.getExpressionForMotion(filename);
            this.animateExpression(expr);
            this.updateExpressionButtons(expr);
            
            document.querySelectorAll('.motion-card').forEach(c => c.classList.remove('active'));
            
        } catch (e) {
            console.error('Motion error:', e);
            if (element) element.classList.remove('playing');
        }
    }
}

const motionManager = new MotionListManager();

// window.autoSelectMotion は ai-chat-auto-motion.js が担当
// ここでは定義しない（上書きを防ぐ）

window.setExpression = (expr) => motionManager.animateExpression(expr);
window.setEyeClosed = (weight) => motionManager.setEyeClosedWeight(weight);
window.playMotionByFilename = (filename) => motionManager.playMotionByFilename(filename);
