/**
 * AI Chat Auto Motion System v5.7
 * 
 * 🎚️ v5.7: モーション派手さ制御！派手なモーションは選ばれにくく
 * 🤖 v5.6: AI Selectモード追加！GPTがモーション名を直接選択
 * 🎬 v5.5: モーション大幅拡張！60以上のモーションをフル活用
 * 🔄 v5.4: モーションクロスフェード対応！
 * 🚀 v5.3: Grok Voice応答にも対応！
 * 
 * 🎬🔊 同期再生システム！
 * - モーション生成と音声生成を並列処理
 * - 両方が揃ってから同時再生
 * 
 * 🎭 v5.1: 感情に応じた表情モーフも同時適用
 * 🎯 v5.2: 感情の強度を考慮（控えめな感謝は控えめなモーション）
 */

(function() {
    console.log('🎬🔊 AI Chat Auto Motion System v5.7 読み込み開始（派手さ制御追加）');
    
    const STORAGE_KEYS = {
        OPENAI_API_KEY: 'vrm_viewer_openai_api_key',
        MOTION_MODE: 'vrm_viewer_motion_mode',
        MOTION_SELECT_MODE: 'vrm_viewer_motion_select_mode'  // 🤖 新規: Preset / AI Select
    };
    
    let currentMotionMode = 'preset';
    let currentMotionSelectMode = 'preset';  // 🤖 'preset' または 'ai_select'
    let lastMotionTime = 0;
    let isProcessing = false;
    let motionQueue = [];
    let isGenerating = false;
    let expressionAnimInterval = null;
    let cachedMotionList = null;  // 🤖 モーション一覧キャッシュ
    let motionUsageHistory = [];  // 🎚️ モーション使用履歴（最近使ったモーションを避ける）
    
    // 🔄 モーション設定（調整可能）
    const motionSettings = {
        crossfadeDuration: 0.5,  // クロスフェード時間（秒） 0-3
        cooldownTime: 2000,      // クールダウン時間（ms） 0-5000
        intensityThreshold: 0.5  // 🎚️ 派手さしきい値（0-1、高いほど派手なモーションが出やすい）
    };
    
    // 🎚️ モーションの「派手さ」定義（0=普通、1=派手、選ばれにくい）
    // intensity が高いほど「特別な状況でのみ使う」モーション
    const MOTION_INTENSITY = {
        // ===== 派手さ: 極めて高い (0.95) - ほぼ出ない =====
        '子供のように駄々をこねて倒れてじだんだ.vrma': 0.95,
        
        // ===== 派手さ: 非常に高い (0.85-0.9) - めったに出ない =====
        'アンリアルキャラガッツポーズでジャンプしてめちゃくちゃよろこぶ.vrma': 0.9,
        'アンリアルキャラお化け屋敷で四方八方にびびり散らかす.vrma': 0.9,
        '怒って攻撃しまくり.vrma': 0.85,
        'ふみつけけりまくり.vrma': 0.85,
        '威嚇して蹴ってくる.vrma': 0.85,
        '投げキッスしまくり.vrma': 0.85,
        
        // ===== 派手さ: 高い (0.7-0.8) - 時々出る =====
        'アンリアルキャラガッツポーズでめちゃくちゃよろこぶ.vrma': 0.75,
        'アンリアルキャラその場でふっとぶ.vrma': 0.75,
        '怒り「かかってこいよ！」.vrma': 0.75,
        'アンリアルキャラもーなんなのよ！.vrma': 0.7,
        '悲しくしゃがんで泣いちゃう.vrma': 0.7,
        'しゃがんでいじける.vrma': 0.7,
        'ぴょんぴょんジャンプ拒絶.vrma': 0.7,
        'アンリアルキャラセクシーモーション.vrma': 0.7,
        
        // ===== 派手さ: 中程度 (0.5-0.6) - 普通に出る =====
        '喜びガッツポーズ.vrma': 0.5,
        'アンリアルキャラびっくり.vrma': 0.5,
        'アンリアルキャラびっくり否定怒る.vrma': 0.5,
        'アンリアルキャラびっくり否定怒る１.vrma': 0.5,
        'しゃべりいかりイライラ.vrma': 0.5,
        '怒りゆびさし.vrma': 0.5,
        'ええええ～！いやだよ～！どんびき.vrma': 0.5,
        'アンリアルキャラセクシー投げキッス.vrma': 0.5,
        '女性投げキッス.vrma': 0.5,
        
        // ===== 派手さ: 低め (0.3-0.4) - よく出る =====
        'アンリアルキャラノリノリで手をふる.vrma': 0.35,
        'アンリアルキャラ喜ぶ.vrma': 0.3,
        'アニメイライラ.vrma': 0.35,
        '怒りあきれる.vrma': 0.3,
        '悲しくしゃべる.vrma': 0.3,
        'うなだれて一周.vrma': 0.35,
        'あたまをおさえてがっがり.vrma': 0.35,
        'アンリアルキャラ頭をかかえる.vrma': 0.3,
        'アンリアルキャラ頭をかかえるB.vrma': 0.3,
        '恥ずかしくて顔をおおう.vrma': 0.3,
        '恥ずかしい顔おおい.vrma': 0.3,
        
        // ===== 派手さ: 普通 (0.1-0.2) - 頻繁に出てOK =====
        '女性しゃべり01.vrma': 0.1,
        '女性しゃべり02.vrma': 0.1,
        '女性しゃべり03.vrma': 0.1,
        '女性しゃべり04うでくみ.vrma': 0.15,
        '女性しゃべり05ルンルン気分.vrma': 0.2,
        'アンリアルキャラ女性しゃべり.vrma': 0.1,
        'アンリアルキャラおっぱらいディス.vrma': 0.1,
        'アンリアルキャラおっぱらいディスB.vrma': 0.1,
        'アンリアルキャラ考える.vrma': 0.1,
        '真剣にあれこれ考える.vrma': 0.15,
        'アンリアルキャラ丁寧なお辞儀.vrma': 0.15,
        'おしとやかにしゃべる.vrma': 0.1,
        'アンリアルキャラまーまーおちついてくび.vrma': 0.15,
        'アンリアルキャラ興味しんしん.vrma': 0.2,
        'アンリアルキャラリアクションポーズ.vrma': 0.2,
        'アンリアルキャラ否定.vrma': 0.2,
        'アンリアルキャラ否定して一線をひく.vrma': 0.25,
        '冗談じゃない手ではらって一周.vrma': 0.3,
        'アンリアルキャラまーざっとこんなもんよツンデレ.vrma': 0.25,
        'アンリアルキャラ腰に手をあて仁王だち.vrma': 0.2,
        'アンリアルキャラ全身でOKマークポーズ.vrma': 0.25,
        '祈る.vrma': 0.2,
        'アンリアルキャラセクシー待機.vrma': 0.3,
        'アンリアルキャラセクシー待機しゃがんで立つ.vrma': 0.35,
        'アンリアルキャラゆびうごかし.vrma': 0.1,
        'アンリアルキャラ筋肉ムキムキ.vrma': 0.4,
        'アンリアルキャラえーなにそれ！嫌なリアクション.vrma': 0.4
    };
    
    // 🎚️ モーションの派手さを取得（未定義は0.2をデフォルト）
    function getMotionIntensity(motionFile) {
        return MOTION_INTENSITY[motionFile] ?? 0.2;
    }
    
    // 🎚️ 派手さを考慮してモーションを選択
    function selectMotionByIntensity(motions, requiredIntensity = 0.5) {
        if (!motions || motions.length === 0) return null;
        
        // 最近使ったモーションを除外
        const recentMotions = motionUsageHistory.slice(-3);
        const availableMotions = motions.filter(m => !recentMotions.includes(m));
        const targetMotions = availableMotions.length > 0 ? availableMotions : motions;
        
        // 派手さに基づいて重み付け
        const weighted = targetMotions.map(m => {
            const intensity = getMotionIntensity(m);
            // requiredIntensityが低いほど、派手なモーション(高intensity)は選ばれにくい
            // weight = 1 - |intensity - requiredIntensity| でもいいが、
            // 派手なものを抑制したいので、intensityが高いほど確率を下げる
            const weight = Math.max(0.01, 1 - intensity + requiredIntensity * 0.5);
            return { motion: m, weight };
        });
        
        // 重み付きランダム選択
        const totalWeight = weighted.reduce((sum, w) => sum + w.weight, 0);
        let random = Math.random() * totalWeight;
        
        for (const item of weighted) {
            random -= item.weight;
            if (random <= 0) {
                // 使用履歴に追加
                motionUsageHistory.push(item.motion);
                if (motionUsageHistory.length > 10) motionUsageHistory.shift();
                
                console.log('🎚️ 派手さ考慮選択:', item.motion, '(intensity:', getMotionIntensity(item.motion), ')');
                return item.motion;
            }
        }
        
        return targetMotions[0];
    }
    
    // 設定の保存/読み込み
    function saveMotionSettings() {
        try { localStorage.setItem('vrm_motion_settings', JSON.stringify(motionSettings)); } catch (e) {}
    }
    function loadMotionSettings() {
        try {
            const saved = localStorage.getItem('vrm_motion_settings');
            if (saved) {
                const parsed = JSON.parse(saved);
                Object.assign(motionSettings, parsed);
                console.log('📦 モーション設定読み込み:', motionSettings);
            }
        } catch (e) {}
    }
    
    function saveApiKey(apiKey) {
        try { localStorage.setItem(STORAGE_KEYS.OPENAI_API_KEY, apiKey); return true; } catch (e) { return false; }
    }
    function loadApiKey() {
        try { return localStorage.getItem(STORAGE_KEYS.OPENAI_API_KEY); } catch (e) { return null; }
    }
    function saveMotionMode(mode) {
        try { localStorage.setItem(STORAGE_KEYS.MOTION_MODE, mode); currentMotionMode = mode; } catch (e) {}
    }
    function loadMotionMode() {
        try { const mode = localStorage.getItem(STORAGE_KEYS.MOTION_MODE) || 'preset'; currentMotionMode = mode; return mode; } catch (e) { return 'preset'; }
    }
    // 🤖 モーション選択モード（Preset / AI Select）
    function saveMotionSelectMode(mode) {
        try { localStorage.setItem(STORAGE_KEYS.MOTION_SELECT_MODE, mode); currentMotionSelectMode = mode; } catch (e) {}
    }
    function loadMotionSelectMode() {
        try { const mode = localStorage.getItem(STORAGE_KEYS.MOTION_SELECT_MODE) || 'preset'; currentMotionSelectMode = mode; return mode; } catch (e) { return 'preset'; }
    }
    function getApiKey() {
        return loadApiKey() || (window.app && window.app.OPENAI_API_KEY) || (window.app && window.app.chatGPTClient && window.app.chatGPTClient.apiKey);
    }

    // 🎭 会話モーション用のマッピング（感情＋表情モーフ）
    // v5.5: モーション大幅拡張！派手さレベルを考慮
    const TALK_MOTIONS = {
        // ========================================
        // 通常・ニュートラル（普段使い）
        // ========================================
        normal: { motions: [
            '女性しゃべり01.vrma', 
            '女性しゃべり02.vrma', 
            '女性しゃべり03.vrma', 
            '女性しゃべり04うでくみ.vrma',
            'アンリアルキャラおっぱらいディス.vrma',    // ナチュラルな動き
            'アンリアルキャラおっぱらいディスB.vrma',   // ナチュラルな動き
            'アンリアルキャラ女性しゃべり.vrma'
        ], expression: 'neutral', expressionWeight: 0 },
        
        // 説明・解説中
        explaining: { motions: [
            '女性しゃべり01.vrma',
            '女性しゃべり02.vrma',
            'アンリアルキャラおっぱらいディス.vrma',
            'アンリアルキャラゆびうごかし.vrma'
        ], expression: 'neutral', expressionWeight: 0.2 },
        
        // ========================================
        // 喜び系（強度別）
        // ========================================
        happy_mild: { motions: [
            'アンリアルキャラ喜ぶ.vrma',
            '女性しゃべり05ルンルン気分.vrma'
        ], expression: 'happy', expressionWeight: 0.5 },
        
        happy: { motions: [
            '女性しゃべり05ルンルン気分.vrma',
            'アンリアルキャラノリノリで手をふる.vrma',
            '喜びガッツポーズ.vrma'
        ], expression: 'happy', expressionWeight: 0.7 },
        
        happy_strong: { motions: [
            'アンリアルキャラガッツポーズでめちゃくちゃよろこぶ.vrma',
            'アンリアルキャラガッツポーズでジャンプしてめちゃくちゃよろこぶ.vrma'
        ], expression: 'happy', expressionWeight: 1.0 },
        
        // ========================================
        // 感謝系（強度別）
        // ========================================
        grateful: { motion: 'アンリアルキャラ喜ぶ.vrma', expression: 'happy', expressionWeight: 0.5 },
        grateful_strong: { motion: 'アンリアルキャラガッツポーズでめちゃくちゃよろこぶ.vrma', expression: 'happy', expressionWeight: 1.0 },
        
        // ========================================
        // 悲しみ系（強度別）
        // ========================================
        sad_mild: { motion: '悲しくしゃべる.vrma', expression: 'sad', expressionWeight: 0.4 },
        
        sad: { motions: [
            '悲しくしゃべる.vrma',
            'うなだれて一周.vrma',
            'アンリアルキャラ頭をかかえる.vrma'
        ], expression: 'sad', expressionWeight: 0.7 },
        
        sad_strong: { motions: [
            '悲しくしゃがんで泣いちゃう.vrma',
            'しゃがんでいじける.vrma'
        ], expression: 'sad', expressionWeight: 1.0 },
        
        disappointed: { motions: [
            'あたまをおさえてがっがり.vrma',
            'アンリアルキャラ頭をかかえるB.vrma',
            'うなだれて一周.vrma'
        ], expression: 'sad', expressionWeight: 0.6 },
        
        // ========================================
        // 怒り系（強度別）
        // ========================================
        annoyed: { motions: [
            'アニメイライラ.vrma',
            '怒りあきれる.vrma'
        ], expression: 'angry', expressionWeight: 0.5 },
        
        angry: { motions: [
            'しゃべりいかりイライラ.vrma',
            '怒りゆびさし.vrma',
            '怒りあきれる.vrma'
        ], expression: 'angry', expressionWeight: 0.8 },
        
        angry_strong: { motions: [
            'ふみつけけりまくり.vrma',
            '怒って攻撃しまくり.vrma',
            '怒り「かかってこいよ！」.vrma',
            '威嚇して蹴ってくる.vrma',
            'アンリアルキャラもーなんなのよ！.vrma'
        ], expression: 'angry', expressionWeight: 1.0 },
        
        // ★極度の拒絶・駄々（めったに出ない）
        tantrum: { motion: '子供のように駄々をこねて倒れてじだんだ.vrma', expression: 'angry', expressionWeight: 1.0 },
        
        // ========================================
        // 拒否・嫌悪系
        // ========================================
        reject: { motions: [
            'ぴょんぴょんジャンプ拒絶.vrma',
            'アンリアルキャラ否定.vrma',
            'アンリアルキャラ否定して一線をひく.vrma',
            '冗談じゃない手ではらって一周.vrma'
        ], expression: 'angry', expressionWeight: 0.5 },
        
        disgusted: { motions: [
            'ええええ～！いやだよ～！どんびき.vrma',
            'アンリアルキャラえーなにそれ！嫌なリアクション.vrma',
            'アンリアルキャラびっくり否定怒る.vrma'
        ], expression: 'angry', expressionWeight: 0.7 },
        
        // ========================================
        // 興味・驚き系（強度別）
        // ========================================
        interested: { motions: [
            'アンリアルキャラ興味しんしん.vrma',
            'アンリアルキャラリアクションポーズ.vrma'
        ], expression: 'surprised', expressionWeight: 0.5 },
        
        surprised: { motions: [
            'アンリアルキャラびっくり.vrma',
            'アンリアルキャラびっくり否定怒る１.vrma'
        ], expression: 'surprised', expressionWeight: 0.7 },
        
        surprised_strong: { motions: [
            'アンリアルキャラお化け屋敷で四方八方にびびり散らかす.vrma',
            'アンリアルキャラその場でふっとぶ.vrma'
        ], expression: 'surprised', expressionWeight: 1.0 },
        
        confused: { motions: [
            'アンリアルキャラびっくり否定怒る.vrma',
            'アンリアルキャラ頭をかかえる.vrma'
        ], expression: 'surprised', expressionWeight: 0.6 },
        
        // ========================================
        // 思考・集中系
        // ========================================
        thinking: { motions: [
            '真剣にあれこれ考える.vrma',
            'アンリアルキャラ考える.vrma'
        ], expression: 'neutral', expressionWeight: 0 },
        
        // ========================================
        // 挨拶・礼儀系
        // ========================================
        greeting: { motions: [
            'アンリアルキャラ喜ぶ.vrma',
            'アンリアルキャラノリノリで手をふる.vrma'
        ], expression: 'happy', expressionWeight: 0.4 },
        
        greeting_formal: { motion: 'アンリアルキャラ丁寧なお辞儀.vrma', expression: 'happy', expressionWeight: 0.4 },
        
        // ========================================
        // 恥ずかしい・照れ系
        // ========================================
        shy: { motions: [
            '恥ずかしくて顔をおおう.vrma',
            '恥ずかしい顔おおい.vrma'
        ], expression: 'relaxed', expressionWeight: 0.5 },
        
        flirty: { motions: [
            'アンリアルキャラセクシー待機.vrma',
            'アンリアルキャラセクシー待機しゃがんで立つ.vrma',
            '女性投げキッス.vrma'
        ], expression: 'relaxed', expressionWeight: 0.7 },
        
        flirty_strong: { motions: [
            '投げキッスしまくり.vrma',
            'アンリアルキャラセクシー投げキッス.vrma',
            'アンリアルキャラセクシーモーション.vrma'
        ], expression: 'relaxed', expressionWeight: 0.9 },
        
        // ========================================
        // ツンデレ・強気系
        // ========================================
        tsundere: { motions: [
            'アンリアルキャラまーざっとこんなもんよツンデレ.vrma',
            'アンリアルキャラ腰に手をあて仁王だち.vrma'
        ], expression: 'neutral', expressionWeight: 0.3 },
        
        confident: { motions: [
            'アンリアルキャラ腰に手をあて仁王だち.vrma',
            'アンリアルキャラ全身でOKマークポーズ.vrma',
            'アンリアルキャラ筋肉ムキムキ.vrma'
        ], expression: 'happy', expressionWeight: 0.5 },
        
        // ========================================
        // 落ち着かせる・なだめる系
        // ========================================
        calming: { motion: 'アンリアルキャラまーまーおちついてくび.vrma', expression: 'neutral', expressionWeight: 0.3 },
        
        // ========================================
        // お祈り・お願い系
        // ========================================
        praying: { motion: '祈る.vrma', expression: 'sad', expressionWeight: 0.4 },
        
        // ========================================
        // おしとやか・上品系
        // ========================================
        elegant: { motion: 'おしとやかにしゃべる.vrma', expression: 'relaxed', expressionWeight: 0.3 },
        
        // ========================================
        // からかい・おちょくり系
        // ========================================
        teasing: { motions: [
            'アンリアルキャラおっぱらいディス.vrma',
            'アンリアルキャラまーざっとこんなもんよツンデレ.vrma'
        ], expression: 'happy', expressionWeight: 0.5 }
    };

    // 🎭 表情モーフを適用
    function applyExpression(expressionName, weight = 1.0, duration = 300) {
        if (!window.app || !window.app.vrm) return;
        const em = window.app.vrm.expressionManager;
        if (!em) return;
        if (expressionAnimInterval) { clearInterval(expressionAnimInterval); expressionAnimInterval = null; }
        
        const allExpressions = ['happy', 'angry', 'sad', 'surprised', 'relaxed'];
        console.log('🎭 表情適用:', expressionName, '(weight:', weight, ')');
        
        const startTime = Date.now();
        const startWeights = {};
        allExpressions.forEach(expr => { try { startWeights[expr] = em.getValue(expr) || 0; } catch (e) { startWeights[expr] = 0; } });
        
        expressionAnimInterval = setInterval(() => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const easeProgress = 1 - Math.pow(1 - progress, 3);
            try {
                allExpressions.forEach(expr => {
                    if (expr === expressionName) {
                        em.setValue(expr, startWeights[expr] + (weight - startWeights[expr]) * easeProgress);
                    } else {
                        em.setValue(expr, startWeights[expr] * (1 - easeProgress));
                    }
                });
                if (progress >= 1) { clearInterval(expressionAnimInterval); expressionAnimInterval = null; console.log('✅ 表情適用完了:', expressionName); }
            } catch (e) { clearInterval(expressionAnimInterval); expressionAnimInterval = null; }
        }, 16);
    }

    function resetExpression(duration = 500) {
        if (!window.app || !window.app.vrm) return;
        const em = window.app.vrm.expressionManager;
        if (!em) return;
        if (expressionAnimInterval) { clearInterval(expressionAnimInterval); expressionAnimInterval = null; }
        
        const allExpressions = ['happy', 'angry', 'sad', 'surprised', 'relaxed'];
        const startTime = Date.now();
        const startWeights = {};
        allExpressions.forEach(expr => { try { startWeights[expr] = em.getValue(expr) || 0; } catch (e) { startWeights[expr] = 0; } });
        
        expressionAnimInterval = setInterval(() => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);
            try {
                allExpressions.forEach(expr => { em.setValue(expr, startWeights[expr] * (1 - progress)); });
                if (progress >= 1) { clearInterval(expressionAnimInterval); expressionAnimInterval = null; }
            } catch (e) { clearInterval(expressionAnimInterval); expressionAnimInterval = null; }
        }, 16);
    }

    // 🤖 モーション一覧を取得
    async function getMotionList() {
        if (cachedMotionList) return cachedMotionList;
        
        try {
            const response = await fetch('/list-motions');
            if (response.ok) {
                const data = await response.json();
                cachedMotionList = data.motions || [];
                console.log('📦 モーション一覧取得:', cachedMotionList.length, '個');
                return cachedMotionList;
            }
        } catch (e) {
            console.warn('⚠️ モーション一覧取得失敗:', e);
        }
        
        // フォールバック: TALK_MOTIONSからモーション名を抽出
        const motionSet = new Set();
        Object.values(TALK_MOTIONS).forEach(data => {
            if (data.motion) motionSet.add(data.motion);
            if (data.motions) data.motions.forEach(m => motionSet.add(m));
        });
        cachedMotionList = Array.from(motionSet);
        console.log('📦 フォールバック一覧:', cachedMotionList.length, '個');
        return cachedMotionList;
    }

    // 🤖 AI Selectモード: GPTにモーション名を直接選ばせる（派手さ制御付き）
    async function selectMotionWithAI(message) {
        const apiKey = getApiKey();
        if (!apiKey) { console.warn('⚠️ APIキーがありません'); return null; }
        
        const motionList = await getMotionList();
        if (motionList.length === 0) {
            console.warn('⚠️ モーション一覧が空');
            return null;
        }
        
        // 🎚️ 派手さ情報付きのモーション一覧を作成
        const motionListWithIntensity = motionList.map((m, i) => {
            const intensity = getMotionIntensity(m);
            let intensityLabel = '';
            if (intensity >= 0.85) intensityLabel = '【⚠️ほぼ使わない】';
            else if (intensity >= 0.7) intensityLabel = '【△ 派手すぎ注意】';
            else if (intensity >= 0.5) intensityLabel = '【○ 時々OK】';
            else intensityLabel = '【◎ 普段使いOK】';
            return `${i + 1}. ${m} ${intensityLabel}`;
        }).join('\n');
        
        console.log('🤖 AI Selectモード: GPTにモーション選択依頼（派手さ制御付き）...');
        
        try {
            const response = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + apiKey },
                body: JSON.stringify({
                    model: 'gpt-4o-mini',
                    messages: [{
                        role: 'system',
                        content: `あなたは3Dキャラクターのモーション選択AIです。

以下のモーション一覧から、ユーザーのメッセージの感情や文脈に最も適したモーションを1つ選んでください。

=== 重要ルール ===
🚨 【⚠️ほぼ使わない】【△ 派手すぎ注意】のモーションは、よほど強い感情表現が必要な場合のみ選んでください！
✅ 通常の会話では【◎ 普段使いOK】【○ 時々OK】から選んでください
✅ 同じモーションを連続で選ばないでください
✅ 迷ったら「しゃべり」系を選んでください

=== モーション一覧（派手さレベル付き） ===
${motionListWithIntensity}

=== 選択のヒント ===
- 「しゃべり」系【◎】: 普通の会話向け、デフォルト
- 「喜ぶ」【◎】: 軽い喜び
- 「ガッツポーズでジャンプ」【⚠️】: 大喜び（めったに使わない！）
- 「悲しくしゃべる」【◎】: 悲しい時
- 「泣いちゃう」「いじける」【△】: 非常に悲しい時のみ
- 「イライラ」【◎】: 軽い怒り
- 「攻撃しまくり」「蹴りまくり」【⚠️】: 激怒（ほぼ使わない！）
- 「びっくり」【○】: 驚き
- 「ふっとぶ」【△】: 大驚き（派手すぎ注意）
- 「駄々をこねて」【⚠️】: 極度の拒絶（ほぼ絶対使わない！）

=== 出力 ===
選んだモーションのファイル名のみを出力してください（番号なし、ラベルなし）。
例: アンリアルキャラ喜ぶ.vrma`
                    }, { role: 'user', content: message }],
                    temperature: 0.3,
                    max_tokens: 100
                })
            });
            
            if (!response.ok) { console.error('❌ API エラー:', response.status); return null; }
            const data = await response.json();
            let selectedMotion = data.choices[0].message.content.trim();
            
            // 改行や余分な文字を削除
            selectedMotion = selectedMotion.split('\n')[0].trim();
            // ラベル部分を除去
            selectedMotion = selectedMotion.replace(/【[^】]+】/g, '').trim();
            
            // モーション一覧に存在するか確認
            const found = motionList.find(m => m === selectedMotion || m.includes(selectedMotion) || selectedMotion.includes(m.replace('.vrma', '')));
            
            if (found) {
                const intensity = getMotionIntensity(found);
                console.log('🤖 AI選択モーション:', found, '(派手さ:', intensity, ')');
                
                // 🎚️ 派手すぎるモーションが選ばれた場合、確率的に却下
                if (intensity >= 0.7 && Math.random() > motionSettings.intensityThreshold) {
                    console.log('🎚️ 派手すぎるモーションを却下、代替を選択...');
                    // 同じ感情カテゴリから派手さが低いものを選ぶ
                    const alternatives = motionList.filter(m => getMotionIntensity(m) < 0.5);
                    if (alternatives.length > 0) {
                        const alt = selectMotionByIntensity(alternatives, 0.3);
                        console.log('🎚️ 代替モーション:', alt);
                        return alt;
                    }
                }
                
                // 使用履歴に追加
                motionUsageHistory.push(found);
                if (motionUsageHistory.length > 10) motionUsageHistory.shift();
                
                return found;
            } else {
                console.warn('⚠️ AIが選んだモーションが見つからない:', selectedMotion);
                // 部分一致で検索
                const partial = motionList.find(m => selectedMotion.includes(m.replace('.vrma', '').substring(0, 10)));
                if (partial) {
                    console.log('🤖 部分一致で発見:', partial);
                    return partial;
                }
                return null;
            }
        } catch (e) { 
            console.error('❌ AI Select エラー:', e); 
            return null; 
        }
    }

    // 🤖 AI Selectモードでモーション再生
    async function playAISelectedMotion(message) {
        const selectedMotion = await selectMotionWithAI(message);
        
        if (!selectedMotion) {
            console.log('🔄 AI Selectフォールバック → Presetモード');
            const emotion = await analyzeTalkEmotion(message);
            await playTalkMotion(emotion);
            return;
        }
        
        // 選択されたモーションを再生
        console.log('🤖 AI Selectモーション再生:', selectedMotion);
        await playMotionByFilename(selectedMotion);
    }

    // 🎬 ファイル名でモーション再生
    async function playMotionByFilename(motionFile) {
        console.log('🎬 モーション再生:', motionFile);
        
        try {
            const THREE = window.THREE;
            const loader = new window.GLTFLoaderClass();
            const { VRMAnimationLoaderPlugin, createVRMAnimationClip } = await import('@pixiv/three-vrm-animation');
            
            loader.register((parser) => new VRMAnimationLoaderPlugin(parser));
            const gltf = await loader.loadAsync('./motions/' + encodeURIComponent(motionFile));
            const vrmAnim = gltf.userData.vrmAnimation || gltf.userData.vrmAnimations?.[0];
            
            if (!vrmAnim) { console.warn('⚠️ VRMアニメーションが見つかりません'); return false; }
            if (!window.app || !window.app.vrm) { console.warn('⚠️ VRMモデルが読み込まれていません'); return false; }
            
            // 🔄 Mixer初期化
            if (!window.app.mixer) window.app.mixer = new THREE.AnimationMixer(window.app.vrm.scene);
            
            const clip = createVRMAnimationClip(vrmAnim, window.app.vrm);
            
            // ★ MotionCleanup対応: ゾンビアクションを全てクリーンアップしてから再生
            if (window.MotionCleanup) {
                window.MotionCleanup.playCleanMotion(window.app.mixer, clip, {
                    loop: true,
                    fadeIn: motionSettings.crossfadeDuration || 0.5
                });
            } else {
                // フォールバック: 従来のクロスフェード
                const newAction = window.app.mixer.clipAction(clip);
                const oldAction = window.app.currentAction;
                if (oldAction && oldAction.isRunning()) {
                    newAction.reset();
                    newAction.setLoop(THREE.LoopRepeat);
                    newAction.setEffectiveWeight(1);
                    newAction.play();
                    oldAction.crossFadeTo(newAction, motionSettings.crossfadeDuration, true);
                } else {
                    newAction.reset();
                    newAction.setLoop(THREE.LoopRepeat);
                    newAction.play();
                }
                window.app.currentAction = newAction;
            }
            
            // 表情も適切に設定（モーション名から推測）
            const expressionInfo = guessExpressionFromMotionName(motionFile);
            if (expressionInfo.weight > 0) {
                applyExpression(expressionInfo.expression, expressionInfo.weight, 300);
            } else {
                resetExpression(300);
            }
            
            console.log('✅ モーション再生開始:', motionFile);
            return true;
        } catch (e) { 
            console.error('❌ モーション再生エラー:', e); 
            return false; 
        }
    }

    // 🎭 モーション名から表情を推測
    function guessExpressionFromMotionName(motionFile) {
        const name = motionFile.toLowerCase();
        
        if (name.includes('喜') || name.includes('ガッツ') || name.includes('ノリノリ') || name.includes('ルンルン')) {
            return { expression: 'happy', weight: 0.7 };
        }
        if (name.includes('悲し') || name.includes('泣') || name.includes('いじける') || name.includes('がっかり')) {
            return { expression: 'sad', weight: 0.7 };
        }
        if (name.includes('怒') || name.includes('イライラ') || name.includes('攻撃') || name.includes('蹴') || name.includes('駄々')) {
            return { expression: 'angry', weight: 0.8 };
        }
        if (name.includes('びっくり') || name.includes('驚') || name.includes('ふっとぶ')) {
            return { expression: 'surprised', weight: 0.7 };
        }
        if (name.includes('セクシー') || name.includes('キッス') || name.includes('恥ずかし')) {
            return { expression: 'relaxed', weight: 0.6 };
        }
        
        return { expression: 'neutral', weight: 0 };
    }

    // 🗣️ 会話の感情分析 (v5.5: カテゴリ大幅拡張)
    async function analyzeTalkEmotion(userMessage) {
        const apiKey = getApiKey();
        if (!apiKey) { console.warn('⚠️ APIキーがありません'); return 'normal'; }
        
        console.log('🗣️ 会話の感情分析中...');
        
        try {
            const response = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + apiKey },
                body: JSON.stringify({
                    model: 'gpt-4o-mini',
                    messages: [{
                        role: 'system',
                        content: `You analyze the emotional tone and INTENSITY of a conversation message.

=== CATEGORIES ===

【普通・ニュートラル】
- normal: 普通の会話、情報伝達
- explaining: 説明、解説、教えている

【喜び系（強度別）】
- happy_mild: 軽い喜び、ほっこり
- happy: 明るい気分、楽しい
- happy_strong: 大喜び（「やったー!!」「最高!!」）

【感謝系】
- grateful: 普通の感謝（「ありがとう」）
- grateful_strong: 大感謝（「本当にありがとう!!」）

【悲しみ系（強度別）】
- sad_mild: 少し悲しい、しょんぼり
- sad: 悲しい、寂しい
- sad_strong: とても悲しい、泣いてる（「もうダメ...」）
- disappointed: がっかり、残念

【怒り系（強度別）】
- annoyed: イラッ、ちょっと不機嫌
- angry: 怒り、イライラ
- angry_strong: 激怒、ブチギレ（「ふざけるな!!」）
- tantrum: ★極度の駄々、絶対に嫌（「やだやだやだ!!」「絶対嫌!!」） ※めったに使わない

【拒否・嫌悪系】
- reject: 拒否、嫌だ（「それはちょっと...」）
- disgusted: ドン引き、うんざり（「えー...」「無理」）

【興味・驚き系】
- interested: 興味、面白い（「へー」「どういうこと？」）
- surprised: 驚き（「えっ」「本当？」）
- surprised_strong: 大驚き（「えええ!?」「マジで!?」）
- confused: 混乱、困惑（「どういうこと...？」）

【思考系】
- thinking: 考え中、悩んでる（「うーん...」）

【挨拶・礼儀系】
- greeting: 挨拶（「こんにちは」）
- greeting_formal: 丁寧な挨拶・お辞儀（「お世話になっております」）

【恥ずかしい・照れ系】
- shy: 恥ずかしい、照れ（「えへへ...」）
- flirty: 褒め、可愛いアピール（「すごいね～」）
- flirty_strong: 积極的な誘惑、投げキッス

【ツンデレ・強気系】
- tsundere: ツンデレ（「別にあんたのためじゃ...」）
- confident: 自信満々、ドヤ顔（「任せて!」「余裕だね」）

【その他】
- calming: なだめる、落ち着かせる（「まあまあ」）
- praying: お願い、祈る（「お願い!!」「神様...」）
- elegant: おしとやか、上品
- teasing: からかう、いじる（「あらあら～」）

=== RULES ===
- tantrumは「絶対嫌!!」「やだやだ!!」など極端な場合のみ
- 怒りの強度を見極める：annoyed < angry < angry_strong < tantrum
- 日本語の控えめな表現に注意

Output ONLY one category name.`
                    }, { role: 'user', content: userMessage }],
                    temperature: 0.2,
                    max_tokens: 20
                })
            });
            
            if (!response.ok) { console.error('❌ API エラー:', response.status); return 'normal'; }
            const data = await response.json();
            const emotion = data.choices[0].message.content.trim().toLowerCase();
            console.log('🎭 感情分析結果:', emotion);
            
            const validEmotions = Object.keys(TALK_MOTIONS);
            return validEmotions.includes(emotion) ? emotion : 'normal';
        } catch (e) { console.error('❌ 感情分析エラー:', e); return 'normal'; }
    }

    // 🎬🎭 しゃべりモーション＋表情を再生（クロスフェード対応、派手さ制御）
    async function playTalkMotion(emotion) {
        const emotionData = TALK_MOTIONS[emotion] || TALK_MOTIONS.normal;
        let motionFile;
        
        if (emotionData.motions) {
            // 🎚️ 派手さを考慮してモーションを選択
            motionFile = selectMotionByIntensity(emotionData.motions, motionSettings.intensityThreshold);
        } else {
            motionFile = emotionData.motion;
        }
        
        const expressionName = emotionData.expression || 'neutral';
        const expressionWeight = emotionData.expressionWeight || 0;
        
        console.log('🗣️🎭 しゃべりモーション再生:', motionFile, '表情:', expressionName, 'weight:', expressionWeight);
        
        try {
            const THREE = window.THREE;
            const loader = new window.GLTFLoaderClass();
            const { VRMAnimationLoaderPlugin, createVRMAnimationClip } = await import('@pixiv/three-vrm-animation');
            
            loader.register((parser) => new VRMAnimationLoaderPlugin(parser));
            const gltf = await loader.loadAsync('./motions/' + encodeURIComponent(motionFile));
            const vrmAnim = gltf.userData.vrmAnimation || gltf.userData.vrmAnimations?.[0];
            
            if (!vrmAnim) { console.warn('⚠️ VRMアニメーションが見つかりません'); return false; }
            if (!window.app || !window.app.vrm) { console.warn('⚠️ VRMモデルが読み込まれていません'); return false; }
            
            // 🔄 Mixer初期化
            if (!window.app.mixer) window.app.mixer = new THREE.AnimationMixer(window.app.vrm.scene);
            
            const clip = createVRMAnimationClip(vrmAnim, window.app.vrm);
            
            // ★ MotionCleanup対応: ゾンビアクションを全てクリーンアップしてから再生
            if (window.MotionCleanup) {
                window.MotionCleanup.playCleanMotion(window.app.mixer, clip, {
                    loop: true,
                    fadeIn: motionSettings.crossfadeDuration || 0.5
                });
            } else {
                // フォールバック: 従来のクロスフェード
                const newAction = window.app.mixer.clipAction(clip);
                const oldAction = window.app.currentAction;
                if (oldAction && oldAction.isRunning()) {
                    newAction.reset();
                    newAction.setLoop(THREE.LoopRepeat);
                    newAction.setEffectiveWeight(1);
                    newAction.play();
                    oldAction.crossFadeTo(newAction, motionSettings.crossfadeDuration, true);
                } else {
                    newAction.reset();
                    newAction.setLoop(THREE.LoopRepeat);
                    newAction.play();
                }
                window.app.currentAction = newAction;
            }
            
            // 🎭 表情モーフを適用
            if (expressionWeight > 0) {
                applyExpression(expressionName, expressionWeight, 300);
            } else {
                resetExpression(300);
            }
            
            console.log('✅ しゃべりモーション＋表情 再生開始（clean）');
            return true;
        } catch (e) { console.error('❌ しゃべりモーション再生エラー:', e); return false; }
    }

    // 動作分析
    async function analyzeMotionWithAI(userMessage) {
        const apiKey = getApiKey();
        if (!apiKey) { console.warn('⚠️ APIキーがありません'); return null; }
        
        console.log('🧠 GPT-4o-mini で動作分析中...');
        
        try {
            const response = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + apiKey },
                body: JSON.stringify({
                    model: 'gpt-4o-mini',
                    messages: [{
                        role: 'system',
                        content: `You are a motion prompt generator for 3D character animation.

Analyze the user's Japanese message and generate an English motion prompt.

Rules:
1. Focus on PHYSICAL BODY MOVEMENTS only
2. Output simple, clear English description
3. Keep it under 15 words
4. If no clear physical action is implied, output "none"

Examples:
- "走って！" → "a person running forward"
- "座ってリラックスして" → "a person sitting down"
- "今日の天気は？" → "none"

Respond with ONLY the English motion prompt or "none".`
                    }, { role: 'user', content: userMessage }],
                    temperature: 0.3,
                    max_tokens: 50
                })
            });
            
            if (!response.ok) { console.error('❌ API エラー:', response.status); return null; }
            const data = await response.json();
            const motionPrompt = data.choices[0].message.content.trim();
            console.log('🎯 AI分析結果:', motionPrompt);
            
            if (motionPrompt.toLowerCase() === 'none' || motionPrompt === '') return null;
            return motionPrompt;
        } catch (e) { console.error('❌ モーション分析エラー:', e); return null; }
    }

    // メイン処理
    async function processUserInput(userMessage) {
        console.log('📨 processUserInput:', userMessage, 'モード:', currentMotionMode, '選択:', currentMotionSelectMode);
        
        if (currentMotionMode === 'off') { console.log('⏹ 自動モーションOFF'); return; }
        
        const now = Date.now();
        if (now - lastMotionTime < motionSettings.cooldownTime) { console.log('⏳ クールダウン中'); return; }
        if (isProcessing) { console.log('⏳ AI分析処理中...'); return; }
        
        isProcessing = true;
        lastMotionTime = now;
        
        try {
            if (currentMotionMode === 'hymotion') {
                const motionPrompt = await analyzeMotionWithAI(userMessage);
                
                if (motionPrompt) {
                    console.log('🎬 HY-Motion生成へ:', motionPrompt);
                    // HY-Motion生成（comfyui-hy-motion.jsに委譲）
                    const motionInput = document.getElementById('comfyui-motion-input');
                    const generateBtn = document.getElementById('comfyui-generate-btn');
                    if (motionInput && generateBtn) {
                        motionInput.value = motionPrompt;
                        motionInput.dispatchEvent(new Event('input', { bubbles: true }));
                        setTimeout(() => generateBtn.click(), 300);
                    }
                } else {
                    console.log('🗣️ 動作指示なし→会話モーション＋表情を選択');
                    // 🤖 選択モードに応じて処理
                    if (currentMotionSelectMode === 'ai_select') {
                        await playAISelectedMotion(userMessage);
                    } else {
                        const emotion = await analyzeTalkEmotion(userMessage);
                        await playTalkMotion(emotion);
                    }
                }
            } else if (currentMotionMode === 'preset') {
                // 🤖 選択モードに応じて処理
                if (currentMotionSelectMode === 'ai_select') {
                    await playAISelectedMotion(userMessage);
                } else {
                    const emotion = await analyzeTalkEmotion(userMessage);
                    await playTalkMotion(emotion);
                }
            }
        } catch (e) { console.error('❌ 処理エラー:', e); }
        finally { isProcessing = false; }
    }

    // 🚀 AI応答テキストを処理（Grok Voice等から呼び出し）
    async function processAIResponse(aiMessage) {
        console.log('🤖 processAIResponse:', aiMessage.substring(0, 50) + '...', 'モード:', currentMotionMode, '選択:', currentMotionSelectMode);
        
        if (currentMotionMode === 'off') { console.log('⏹ 自動モーションOFF'); return; }
        
        const now = Date.now();
        if (now - lastMotionTime < motionSettings.cooldownTime) { console.log('⏳ クールダウン中'); return; }
        if (isProcessing) { console.log('⏳ AI分析処理中...'); return; }
        
        isProcessing = true;
        lastMotionTime = now;
        
        try {
            // 🤖 選択モードに応じて処理
            if (currentMotionSelectMode === 'ai_select') {
                console.log('🤖 AI Selectモードで処理...');
                await playAISelectedMotion(aiMessage);
            } else {
                console.log('📁 Presetモードで処理...');
                const emotion = await analyzeTalkEmotion(aiMessage);
                console.log('🎭 応答感情:', emotion);
                await playTalkMotion(emotion);
            }
        } catch (e) { console.error('❌ AI応答処理エラー:', e); }
        finally { isProcessing = false; }
    }

    // チャット入力をフック
    function hookChatInput() {
        console.log('🔗 チャット入力フック設定中...');
        
        const chatInput = document.getElementById('chat-input');
        const chatSend = document.getElementById('chat-send');
        
        if (!chatInput || !chatSend) {
            console.log('⏳ チャット入力待機中...');
            setTimeout(hookChatInput, 1000);
            return;
        }
        
        if (chatInput.dataset.motionHooked === 'true') {
            console.log('✅ 既にフック済み');
            return;
        }
        
        chatSend.addEventListener('click', function(e) {
            const message = chatInput.value.trim();
            if (message) {
                console.log('🎯 チャット送信検出:', message);
                setTimeout(() => processUserInput(message), 100);
            }
        }, true);
        
        chatInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                const message = chatInput.value.trim();
                if (message) {
                    console.log('🎯 Enter送信検出:', message);
                    setTimeout(() => processUserInput(message), 100);
                }
            }
        }, true);
        
        chatInput.dataset.motionHooked = 'true';
        console.log('✅ チャット入力フック完了！');
    }

    function setMotionMode(mode) {
        currentMotionMode = mode;
        const buttons = document.querySelectorAll('.motion-mode-btn');
        const descriptionEl = document.getElementById('motion-mode-description');
        
        const descriptions = {
            'preset': currentMotionSelectMode === 'ai_select' 
                ? '🤖 AIがモーション名を直接選択' 
                : '🧠 AIが感情を理解してモーション＋表情を選択',
            'hymotion': '🔥 HY-Motion生成 or 会話モーション＋表情',
            'off': '自動モーションは無効'
        };
        
        buttons.forEach(btn => {
            if (btn.dataset.mode === mode) {
                btn.style.background = mode === 'hymotion' ? 'linear-gradient(135deg, #00ff88 0%, #00c853 100%)' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
                btn.style.color = mode === 'hymotion' ? '#1a1a2e' : 'white';
                btn.style.fontWeight = 'bold';
            } else {
                btn.style.background = 'white';
                btn.style.color = '#666';
                btn.style.fontWeight = 'normal';
            }
        });
        
        if (descriptionEl) { descriptionEl.textContent = descriptions[mode] || ''; }
        console.log('🎬 モーションモード変更:', mode);
    }

    // 🤖 モーション選択モードを設定
    function setMotionSelectMode(mode) {
        currentMotionSelectMode = mode;
        saveMotionSelectMode(mode);
        
        const presetBtn = document.getElementById('motion-select-preset');
        const aiSelectBtn = document.getElementById('motion-select-ai');
        const descriptionEl = document.getElementById('motion-mode-description');
        
        if (presetBtn && aiSelectBtn) {
            if (mode === 'ai_select') {
                presetBtn.style.background = 'white';
                presetBtn.style.color = '#666';
                aiSelectBtn.style.background = 'linear-gradient(135deg, #ff6b35 0%, #ffcc00 100%)';
                aiSelectBtn.style.color = '#1a1a2e';
                aiSelectBtn.style.fontWeight = 'bold';
                presetBtn.style.fontWeight = 'normal';
            } else {
                aiSelectBtn.style.background = 'white';
                aiSelectBtn.style.color = '#666';
                presetBtn.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
                presetBtn.style.color = 'white';
                presetBtn.style.fontWeight = 'bold';
                aiSelectBtn.style.fontWeight = 'normal';
            }
        }
        
        // 説明文も更新
        if (descriptionEl && currentMotionMode === 'preset') {
            descriptionEl.textContent = mode === 'ai_select' 
                ? '🤖 AIがモーション名を直接選択（全モーション活用）' 
                : '🧠 AIが感情を理解してモーション＋表情を選択';
        }
        
        console.log('🤖 モーション選択モード変更:', mode);
    }

    // UI作成
    function enhanceChatPanel() {
        const chatPanel = document.getElementById('chat-panel');
        if (!chatPanel) { setTimeout(enhanceChatPanel, 500); return; }
        if (document.getElementById('auto-motion-section')) return;
        
        const voiceSettings = chatPanel.querySelector('.voice-settings');
        if (!voiceSettings) { setTimeout(enhanceChatPanel, 500); return; }
        
        const motionSection = document.createElement('div');
        motionSection.id = 'auto-motion-section';
        motionSection.innerHTML = `
            <div style="margin-bottom: 15px; padding: 10px; background: linear-gradient(135deg, rgba(0, 255, 136, 0.15) 0%, rgba(102, 126, 234, 0.15) 100%); border-radius: 8px; border: 2px solid rgba(0, 255, 136, 0.6);">
                <div style="font-size: 12px; font-weight: bold; color: #00ff88; margin-bottom: 8px;">
                    🎬🎭 自動モーション＋表情 <span style="font-size:9px;color:#fff;background:#00ff88;padding:2px 6px;border-radius:3px;">v5.6</span>
                </div>
                <div style="font-size: 9px; color: #00ff88; margin-bottom: 8px; padding: 6px; background: rgba(0,255,136,0.1); border-radius: 4px;">
                    ✨ 会話に応じてモーション＋表情を自動選択！
                </div>
                <div style="display: flex; gap: 4px; margin-bottom: 8px;">
                    <button id="motion-mode-preset" class="motion-mode-btn" data-mode="preset" style="flex: 1; padding: 6px 4px; font-size: 9px; border: 1px solid #667eea; border-radius: 4px; cursor: pointer; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; font-weight: bold;">
                        📁 会話モード
                    </button>
                    <button id="motion-mode-hymotion" class="motion-mode-btn" data-mode="hymotion" style="flex: 1; padding: 6px 4px; font-size: 9px; border: 1px solid #00ff88; border-radius: 4px; cursor: pointer; background: white; color: #666;">
                        🎬 HY-Motion
                    </button>
                    <button id="motion-mode-off" class="motion-mode-btn" data-mode="off" style="flex: 1; padding: 6px 4px; font-size: 9px; border: 1px solid #ddd; border-radius: 4px; cursor: pointer; background: white; color: #666;">
                        ⏹ OFF
                    </button>
                </div>
                
                <!-- 🤖 モーション選択モード（Preset / AI Select） -->
                <div style="display: flex; gap: 4px; margin-bottom: 8px;">
                    <button id="motion-select-preset" style="flex: 1; padding: 5px 4px; font-size: 9px; border: 1px solid #667eea; border-radius: 4px; cursor: pointer; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; font-weight: bold;">
                        📁 Preset
                    </button>
                    <button id="motion-select-ai" style="flex: 1; padding: 5px 4px; font-size: 9px; border: 1px solid #ff6b35; border-radius: 4px; cursor: pointer; background: white; color: #666;">
                        🤖 AI Select
                    </button>
                </div>
                
                <div id="motion-mode-description" style="font-size: 9px; color: #00ff88; text-align: center; font-weight: bold;">
                    🧠 AIが感情を理解してモーション＋表情を選択
                </div>
                
                <!-- 🔄 モーション設定スライダー -->
                <div style="margin-top: 10px; padding: 8px; background: rgba(255,255,255,0.1); border-radius: 6px;">
                    <div style="font-size: 10px; color: #00ff88; margin-bottom: 6px; font-weight: bold;">🔄 モーション切り替え設定</div>
                    <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px;">
                        <span style="font-size: 9px; color: #ccc; min-width: 80px;">クロスフェード</span>
                        <input type="range" id="motion-crossfade-slider" min="0" max="3" step="0.1" value="0.5" style="flex: 1; accent-color: #00ff88;">
                        <span id="motion-crossfade-value" style="font-size: 10px; color: #00ff88; font-weight: bold; min-width: 35px;">0.5秒</span>
                    </div>
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <span style="font-size: 9px; color: #ccc; min-width: 80px;">クールダウン</span>
                        <input type="range" id="motion-cooldown-slider" min="0" max="5" step="0.5" value="2" style="flex: 1; accent-color: #00ff88;">
                        <span id="motion-cooldown-value" style="font-size: 10px; color: #00ff88; font-weight: bold; min-width: 35px;">2.0秒</span>
                    </div>
                </div>
            </div>
            <div style="margin-bottom: 15px; padding: 10px; background: linear-gradient(135deg, rgba(78, 205, 196, 0.15) 0%, rgba(68, 160, 141, 0.15) 100%); border-radius: 8px; border: 1px solid rgba(78, 205, 196, 0.4);">
                <div style="font-size: 12px; font-weight: bold; color: #4ecdc4; margin-bottom: 8px;">🔑 OpenAI APIキー</div>
                <input type="password" id="openai-api-key-input" placeholder="sk-proj-..." style="width: 100%; padding: 8px; border: 1px solid #4ecdc4; border-radius: 4px; font-size: 11px; font-family: monospace; background: rgba(255,255,255,0.9);">
                <div style="display: flex; gap: 4px; margin-top: 6px;">
                    <button id="save-api-key-btn" style="flex: 1; padding: 6px; font-size: 10px; background: linear-gradient(135deg, #4ecdc4 0%, #44a08d 100%); color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: bold;">💾 保存</button>
                    <button id="toggle-api-key-btn" style="padding: 6px 10px; font-size: 10px; background: #eee; border: none; border-radius: 4px; cursor: pointer;">👁</button>
                    <button id="clear-api-key-btn" style="padding: 6px 10px; font-size: 10px; background: #ff6b6b; color: white; border: none; border-radius: 4px; cursor: pointer;">🗑</button>
                </div>
                <div id="api-key-status" style="font-size: 10px; color: #888; margin-top: 6px; text-align: center; padding: 4px; background: rgba(0,0,0,0.05); border-radius: 4px;"></div>
            </div>
        `;
        
        voiceSettings.insertBefore(motionSection, voiceSettings.firstChild);
        setupEventListeners();
        loadSavedState();
        console.log('✅ AI Chat Auto Motion UI追加完了 (v5.7)');
    }

    function setupEventListeners() {
        document.querySelectorAll('.motion-mode-btn').forEach(btn => {
            btn.addEventListener('click', () => { setMotionMode(btn.dataset.mode); saveMotionMode(btn.dataset.mode); });
        });
        
        // 🤖 モーション選択モードボタン
        const presetBtn = document.getElementById('motion-select-preset');
        const aiSelectBtn = document.getElementById('motion-select-ai');
        
        if (presetBtn) {
            presetBtn.addEventListener('click', () => setMotionSelectMode('preset'));
        }
        if (aiSelectBtn) {
            aiSelectBtn.addEventListener('click', () => setMotionSelectMode('ai_select'));
        }
        
        // 🔄 クロスフェードスライダー
        const crossfadeSlider = document.getElementById('motion-crossfade-slider');
        const crossfadeValue = document.getElementById('motion-crossfade-value');
        if (crossfadeSlider && crossfadeValue) {
            crossfadeSlider.addEventListener('input', (e) => {
                const val = parseFloat(e.target.value);
                crossfadeValue.textContent = val.toFixed(1) + '秒';
                motionSettings.crossfadeDuration = val;
                saveMotionSettings();
                console.log('🔄 クロスフェード:', val, '秒');
            });
        }
        
        // ⏳ クールダウンスライダー
        const cooldownSlider = document.getElementById('motion-cooldown-slider');
        const cooldownValue = document.getElementById('motion-cooldown-value');
        if (cooldownSlider && cooldownValue) {
            cooldownSlider.addEventListener('input', (e) => {
                const val = parseFloat(e.target.value);
                cooldownValue.textContent = val.toFixed(1) + '秒';
                motionSettings.cooldownTime = val * 1000; // msに変換
                saveMotionSettings();
                console.log('⏳ クールダウン:', val, '秒');
            });
        }
        
        const saveBtn = document.getElementById('save-api-key-btn');
        const input = document.getElementById('openai-api-key-input');
        const statusEl = document.getElementById('api-key-status');
        
        if (saveBtn) {
            saveBtn.addEventListener('click', () => {
                const apiKey = input.value.trim();
                if (apiKey && saveApiKey(apiKey)) {
                    statusEl.textContent = '✅ APIキーを保存しました！';
                    statusEl.style.color = '#4ecdc4';
                    if (window.app) { window.app.OPENAI_API_KEY = apiKey; if (window.app.chatGPTClient) window.app.chatGPTClient.apiKey = apiKey; }
                } else {
                    statusEl.textContent = '❌ 保存に失敗しました';
                    statusEl.style.color = '#ff6b6b';
                }
            });
        }
        
        const toggleBtn = document.getElementById('toggle-api-key-btn');
        if (toggleBtn) { toggleBtn.addEventListener('click', () => { input.type = input.type === 'password' ? 'text' : 'password'; }); }
        
        const clearBtn = document.getElementById('clear-api-key-btn');
        if (clearBtn) {
            clearBtn.addEventListener('click', () => {
                if (confirm('APIキーを削除しますか？')) {
                    localStorage.removeItem(STORAGE_KEYS.OPENAI_API_KEY);
                    input.value = '';
                    statusEl.textContent = '🗑 APIキーを削除しました';
                    statusEl.style.color = '#ff6b6b';
                }
            });
        }
    }

    function loadSavedState() {
        // モーション設定読み込み
        loadMotionSettings();
        
        // スライダーUIに反映
        const crossfadeSlider = document.getElementById('motion-crossfade-slider');
        const crossfadeValue = document.getElementById('motion-crossfade-value');
        if (crossfadeSlider && crossfadeValue) {
            crossfadeSlider.value = motionSettings.crossfadeDuration;
            crossfadeValue.textContent = motionSettings.crossfadeDuration.toFixed(1) + '秒';
        }
        
        const cooldownSlider = document.getElementById('motion-cooldown-slider');
        const cooldownValue = document.getElementById('motion-cooldown-value');
        if (cooldownSlider && cooldownValue) {
            const cooldownSec = motionSettings.cooldownTime / 1000;
            cooldownSlider.value = cooldownSec;
            cooldownValue.textContent = cooldownSec.toFixed(1) + '秒';
        }
        
        const input = document.getElementById('openai-api-key-input');
        const statusEl = document.getElementById('api-key-status');
        
        if (input && statusEl) {
            const savedKey = loadApiKey();
            if (savedKey) {
                input.value = savedKey;
                statusEl.textContent = '🔑 保存済みのAPIキーを読み込みました';
                statusEl.style.color = '#4ecdc4';
                if (window.app) { window.app.OPENAI_API_KEY = savedKey; if (window.app.chatGPTClient) window.app.chatGPTClient.apiKey = savedKey; }
            } else {
                statusEl.textContent = 'APIキーを入力して保存してください';
                statusEl.style.color = '#888';
            }
        }
        
        // モーションモード
        const savedMode = loadMotionMode();
        setMotionMode(savedMode);
        
        // 🤖 モーション選択モード
        const savedSelectMode = loadMotionSelectMode();
        setMotionSelectMode(savedSelectMode);
    }

    // 初期化
    function init() {
        console.log('🎬🎭 AI Chat Auto Motion System v5.7 初期化');
        enhanceChatPanel();
        setTimeout(hookChatInput, 2000);
        setTimeout(hookChatInput, 4000);
        
        // モーション一覧を事前取得
        setTimeout(() => getMotionList(), 3000);
        
        // presetモードをデフォルトに
        setTimeout(() => {
            const savedMode = localStorage.getItem(STORAGE_KEYS.MOTION_MODE);
            if (!savedMode) { setMotionMode('preset'); saveMotionMode('preset'); }
        }, 3000);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => setTimeout(init, 1000));
    } else {
        setTimeout(init, 1000);
    }

    window.AIChatAutoMotion = {
        saveApiKey, loadApiKey, setMotionMode, processUserInput, analyzeTalkEmotion,
        getMotionMode: () => currentMotionMode,
        applyExpression, resetExpression, playTalkMotion,
        // 🚀 Grok Voice等のAI応答用
        processAIResponse,
        // 🔄 モーション設定
        getMotionSettings: () => ({ ...motionSettings }),
        setCrossfadeDuration: (sec) => { motionSettings.crossfadeDuration = Math.max(0, Math.min(3, sec)); saveMotionSettings(); },
        setCooldownTime: (sec) => { motionSettings.cooldownTime = Math.max(0, Math.min(5000, sec * 1000)); saveMotionSettings(); },
        // 🤖 新機能
        setMotionSelectMode,
        getMotionSelectMode: () => currentMotionSelectMode,
        selectMotionWithAI,
        playMotionByFilename,
        getMotionList,
        // 🎚️ 派手さ制御
        getMotionIntensity,
        selectMotionByIntensity,
        setIntensityThreshold: (val) => { motionSettings.intensityThreshold = Math.max(0, Math.min(1, val)); saveMotionSettings(); },
        getIntensityThreshold: () => motionSettings.intensityThreshold,
        MOTION_INTENSITY
    };

    console.log('✅ AI Chat Auto Motion System v5.7 読み込み完了（派手さ制御対応）');
})();
