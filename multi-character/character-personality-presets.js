// ========================================
// Character Personality Presets v1.1
// キャラクター個性プリセット（表情・モーション）
// ========================================
// 
// 🆕 v1.1: excludedIdleMotions対応
//    - 待機モーション除外設定を保存・読み込み
//
// 🎯 目的: キャラクターごとの個性を表情とモーションで表現
// 
// 【プリセットタイプ】
// - genki: 元気おてんば系（表情変化が大きく、派手なモーションも使う）
// - oshitoyaka: おしとやか可愛い系（表情変化がやや弱く、落ち着いたモーション）
// - cool: 知的クール系（表情変化がさらに弱く、控えめなモーション）
// - custom: カスタム設定
//
// ========================================

(function() {
    'use strict';

// ========================================
// キャラクター個性プリセット定義
// ========================================

const CHARACTER_PRESETS = {
    // 元気おてんば系（ジャイ美のデフォルト）
    genki: {
        id: 'genki',
        name: '元気おてんば系',
        description: '表情変化が大きく、派手なモーションも使う明るいキャラ',
        icon: '🌟',
        
        // 表情設定
        expressionMultiplier: 1.0,      // 表情強度の倍率（1.0 = 100%）
        expressionHappyMultiplier: 1.0, // happy系だけの追加倍率
        
        // モーション設定
        motionEmotionRestrictions: [],  // 禁止感情カテゴリ（空 = 全て使う）
        motionProbabilityBoost: {       // 特定感情の確率アップ（1.0 = 通常、2.0 = 2倍）
            happy_strong: 1.5,
            surprised: 1.3,
            sexy: 0.8
        },
        preferredMotions: [              // 優先的に選ばれるモーション
            'アンリアルキャラガッツポーズでめちゃくちゃよろこぶ.vrma',
            'アンリアルキャラノリノリで手をふる.vrma',
            '女性しゃべり05ルンルン気分.vrma',
            'VRMA_03.vrma',  // ピース
            'VRMA_04.vrma'   // ピストル
        ],
        excludedMotions: [],              // 除外するモーション
        excludedIdleMotions: []          // 🆕 v1.1: 除外する待機モーション
    },
    
    // おしとやか可愛い系（スネ子のデフォルト候補）
    oshitoyaka: {
        id: 'oshitoyaka',
        name: 'おしとやか可愛い系',
        description: '表情変化がやや控えめ、落ち着いた可愛らしい動き',
        icon: '🌸',
        
        // 表情設定
        expressionMultiplier: 0.7,       // 表情強度70%
        expressionHappyMultiplier: 0.8,  // happy系はさらに80%
        
        // モーション設定
        motionEmotionRestrictions: [     // 禁止感情カテゴリ
            'happy_strong',              // 派手な喜びは禁止
            'angry_strong',              // 激しい怒りは禁止
            'spin_happy'                 // ルンルン回転禁止
        ],
        motionProbabilityBoost: {
            normal: 1.3,
            happy_mild: 1.5,
            shy: 2.0,
            thinking: 1.3
        },
        preferredMotions: [
            'おしとやかにしゃべる.vrma',
            '女性しゃべり01.vrma',
            '女性しゃべり02.vrma',
            '恥ずかしくて顔をおおう.vrma',
            '真剣にあれこれ考える.vrma'
        ],
        excludedMotions: [
            'アンリアルキャラガッツポーズでめちゃくちゃよろこぶ.vrma',
            'アンリアルキャラガッツポーズでジャンプしてめちゃくちゃよろこぶ.vrma',
            'ふみつけけりまくり.vrma',
            '威嚇して蹴ってくる.vrma',
            '怒って攻撃しまくり.vrma'
        ],
        excludedIdleMotions: []          // 🆕 v1.1: 除外する待機モーション
    },
    
    // 知的クール系（井上博士のデフォルト）
    cool: {
        id: 'cool',
        name: '知的クール系',
        description: '表情変化が控えめ、落ち着いた知的な動き',
        icon: '🧠',
        
        // 表情設定
        expressionMultiplier: 0.5,       // 表情強度50%
        expressionHappyMultiplier: 0.6,  // happy系はさらに60%
        
        // モーション設定
        motionEmotionRestrictions: [
            'happy_strong',
            'angry_strong',
            'sad_strong',
            'annoyed_strong',
            'sexy',
            'sexy_strong',
            'spin_happy',
            'exercise'
        ],
        motionProbabilityBoost: {
            normal: 2.0,
            thinking: 2.5,
            proud: 1.5,
            polite: 1.5
        },
        preferredMotions: [
            '真剣にあれこれ考える.vrma',
            'アンリアルキャラ考える.vrma',
            'アンリアルキャラ腰に手をあて仁王だち.vrma',
            '女性しゃべり0４.vrma',
            'アンリアルキャラ丁寧なお辞儀.vrma'
        ],
        excludedMotions: [
            'アンリアルキャラガッツポーズでめちゃくちゃよろこぶ.vrma',
            'アンリアルキャラガッツポーズでジャンプしてめちゃくちゃよろこぶ.vrma',
            'VRMA_03.vrma',
            'VRMA_04.vrma',
            '投げキッスしまくり.vrma',
            'セクシーダンス.vrma',
            'ふみつけけりまくり.vrma',
            '子供のように駄々をこねて倒れてじだんだ.vrma'
        ],
        excludedIdleMotions: []          // 🆕 v1.1: 除外する待機モーション
    },
    
    // カスタム（ユーザー定義）
    custom: {
        id: 'custom',
        name: 'カスタム',
        description: 'ユーザーが自由に設定',
        icon: '⚙️',
        expressionMultiplier: 1.0,
        expressionHappyMultiplier: 1.0,
        motionEmotionRestrictions: [],
        motionProbabilityBoost: {},
        preferredMotions: [],
        excludedMotions: [],
        excludedIdleMotions: []          // 🆕 v1.1: 除外する待機モーション
    }
};

// ========================================
// モーション一覧（全モーション）
// ========================================

const ALL_MOTIONS = {
    // 基本しゃべり
    talk_basic: [
        { file: '女性しゃべり01.vrma', name: '腕を組んで片腕を立てて話す', category: 'normal' },
        { file: '女性しゃべり02.vrma', name: 'ゆびを見つめて話す', category: 'normal' },
        { file: '女性しゃべり03.vrma', name: '両手を腕を組んで話す', category: 'normal' },
        { file: '女性しゃべり0４.vrma', name: '腰に手をあてて話す', category: 'normal' },
        { file: '女性しゃべり04うでくみ.vrma', name: '腰に手をあてて話す(B)', category: 'normal' },
        { file: '女性しゃべり05ルンルン気分.vrma', name: 'ルンルン気分で話す', category: 'happy_mild' },
        { file: 'おしとやかにしゃべる.vrma', name: 'おしとやかに話す', category: 'normal' }
    ],
    
    // 嬉しい系
    happy: [
        { file: 'アンリアルキャラ喜ぶ.vrma', name: '喜ぶ', category: 'happy' },
        { file: 'アンリアルキャラ興味しんしん.vrma', name: '興味津々', category: 'happy' },
        { file: 'アンリアルキャラノリノリで手をふる.vrma', name: 'ノリノリで手を振る', category: 'happy_mild' },
        { file: 'アンリアルキャラまーざっとこんなもんよツンデレ.vrma', name: 'ツンデレ「まーこんなもんよ」', category: 'happy' },
        { file: 'VRMA_03.vrma', name: '可愛くピースサイン', category: 'happy_strong' },
        { file: 'VRMA_04.vrma', name: '可愛くピストルポーズ', category: 'happy_strong' },
        { file: 'VRMA_05.vrma', name: 'ウキウキ', category: 'happy_mild' }
    ],
    
    // 大喜び系
    happy_strong: [
        { file: 'アンリアルキャラガッツポーズでめちゃくちゃよろこぶ.vrma', name: 'ガッツポーズで大喜び', category: 'happy_strong' },
        { file: 'アンリアルキャラガッツポーズでジャンプしてめちゃくちゃよろこぶ.vrma', name: 'ジャンプで大喜び', category: 'happy_strong' },
        { file: '喜びガッツポーズ.vrma', name: '喜びのガッツポーズ', category: 'happy_strong' },
        { file: 'アンリアルキャラ全身でOKマークポーズ.vrma', name: '全身でOKポーズ', category: 'happy_strong' },
        { file: 'VRMA_01.vrma', name: 'ルンルン回転', category: 'spin_happy' }
    ],
    
    // セクシー系
    sexy: [
        { file: 'アンリアルキャラセクシー待機.vrma', name: 'セクシー待機', category: 'sexy' },
        { file: 'アンリアルキャラセクシーモーション.vrma', name: 'セクシーモーション', category: 'sexy' },
        { file: 'アンリアルキャラいろいろなセクシーポーズ.vrma', name: 'いろいろなセクシーポーズ', category: 'sexy' },
        { file: 'アンリアルキャラセクシー投げキッス.vrma', name: 'セクシー投げキッス', category: 'sexy' },
        { file: '女性投げキッス.vrma', name: '投げキッス', category: 'sexy' },
        { file: '投げキッスしまくり.vrma', name: '投げキッスしまくり', category: 'sexy' },
        { file: 'セクシーダンス.vrma', name: 'セクシーダンス', category: 'sexy_strong' }
    ],
    
    // 怒り系
    angry: [
        { file: 'しゃべりいかりイライラ.vrma', name: 'イライラして話す', category: 'angry' },
        { file: 'アニメイライラ.vrma', name: 'アニメ風イライラ', category: 'angry' },
        { file: '怒りあきれる.vrma', name: '怒りながら呆れる', category: 'angry' },
        { file: '怒りゆびさし.vrma', name: '怒りの指差し', category: 'angry' },
        { file: 'アンリアルキャラ否定.vrma', name: '否定', category: 'angry' },
        { file: 'アンリアルキャラびっくり否定怒る.vrma', name: 'びっくり否定怒る', category: 'angry' },
        { file: 'アンリアルキャラびっくり否定怒る１.vrma', name: 'びっくり否定怒る(B)', category: 'angry' },
        { file: 'アンリアルキャラもーなんなのよ！.vrma', name: '「もーなんなのよ！」', category: 'annoyed' },
        { file: 'アンリアルキャラおっぱらいディス.vrma', name: 'おっぱらいディス', category: 'annoyed' },
        { file: 'アンリアルキャラおっぱらいディスB.vrma', name: 'おっぱらいディス(B)', category: 'annoyed' },
        { file: '冗談じゃない手ではらって一周.vrma', name: '「冗談じゃない」', category: 'angry' }
    ],
    
    // 激怒系
    angry_strong: [
        { file: 'ぴょんぴょんジャンプ拒絶.vrma', name: 'じだんだ拒絶', category: 'angry_strong' },
        { file: 'ふみつけけりまくり.vrma', name: '踏みつけ蹴りまくり', category: 'angry_strong' },
        { file: '威嚇して蹴ってくる.vrma', name: '威嚇して蹴る', category: 'angry_strong' },
        { file: '怒って攻撃しまくり.vrma', name: '怒って攻撃しまくり', category: 'angry_strong' },
        { file: '怒り「かかってこいよ！」.vrma', name: '「かかってこいよ！」', category: 'angry_strong' }
    ],
    
    // 悲しみ系
    sad: [
        { file: '悲しくしゃべる.vrma', name: '悲しく話す', category: 'sad' },
        { file: 'あたまをおさえてがっかり.vrma', name: '頭を押さえてがっかり', category: 'sad' },
        { file: 'アンリアルキャラ頭をかかえる.vrma', name: '頭を抱える', category: 'sad' },
        { file: 'アンリアルキャラ頭をかかえるB.vrma', name: '頭を抱える(B)', category: 'sad' },
        { file: 'ええええ～！いやだよ～！どんびき.vrma', name: '「えー！いやだよ～！」', category: 'sad' },
        { file: 'うなだれて一周.vrma', name: 'うなだれる', category: 'disappointed' },
        { file: 'しゃがんでいじける.vrma', name: 'しゃがんでいじける', category: 'disappointed' },
        { file: '子供のように駄々をこねて倒れてじだんだ.vrma', name: '駄々をこねてじだんだ', category: 'sad_strong' },
        { file: '悲しくしゃがんで泣いちゃう.vrma', name: 'しゃがんで泣く', category: 'sad_strong' }
    ],
    
    // 驚き系
    surprised: [
        { file: 'アンリアルキャラびっくり.vrma', name: 'びっくり', category: 'surprised' },
        { file: 'アンリアルキャラお化け屋敷で四方八方にびびり散らかす.vrma', name: 'びびり散らかす', category: 'surprised' },
        { file: 'アンリアルキャラえーなにそれ！嫌なリアクション.vrma', name: '「えーなにそれ！」', category: 'annoyed_strong' },
        { file: 'アンリアルキャラじだんだ.vrma', name: 'じだんだ', category: 'annoyed_strong' }
    ],
    
    // 考える系
    thinking: [
        { file: '真剣にあれこれ考える.vrma', name: '真剣に考える', category: 'thinking' },
        { file: 'アンリアルキャラ考える.vrma', name: '考える', category: 'thinking' }
    ],
    
    // 恥ずかしい系
    shy: [
        { file: '恥ずかしくて顔をおおう.vrma', name: '恥ずかしくて顔を覆う', category: 'shy' },
        { file: '恥ずかしい顔おおい.vrma', name: '恥ずかしい(顔覆い)', category: 'shy' }
    ],
    
    // 待機モーション
    idle: [
        { file: 'アンリアルキャラセクシー待機.vrma', name: 'セクシー待機', category: 'idle' },
        { file: 'アンリアルキャラセクシー待機しゃがんで立つ.vrma', name: 'セクシー待機→立つ', category: 'idle' },
        { file: 'アンリアルキャラ腰に手をあて仁王だち.vrma', name: '仁王立ち待機', category: 'idle' },
        { file: 'おしとやかにしゃべる.vrma', name: 'おしとやか待機', category: 'idle' },
        { file: '女性しゃべり01.vrma', name: '腕組み待機', category: 'idle' },
        { file: '女性しゃべり0４.vrma', name: '腰に手待機', category: 'idle' },
        { file: 'アンリアルキャラ考える.vrma', name: '考え中待機', category: 'idle' },
        { file: '真剣にあれこれ考える.vrma', name: '真剣待機', category: 'idle' }
    ],
    
    // その他
    misc: [
        { file: 'アンリアルキャラ丁寧なお辞儀.vrma', name: '丁寧なお辞儀', category: 'polite' },
        { file: 'アンリアルキャラ腰に手をあて仁王だち.vrma', name: '仁王立ち', category: 'proud' },
        { file: 'アンリアルキャラリアクションポーズ.vrma', name: 'リアクションポーズ', category: 'normal' },
        { file: 'アンリアルキャラゆびうごかし.vrma', name: '指動かし', category: 'normal' },
        { file: 'アンリアルキャラ女性しゃべり.vrma', name: '女性しゃべり', category: 'normal' },
        { file: 'アンリアルキャラまーまーおちついてくび.vrma', name: '「まーまー落ち着いて」', category: 'normal' },
        { file: 'アンリアルキャラ否定して一線をひく.vrma', name: '否定して一線をひく', category: 'annoyed' },
        { file: 'アンリアルキャラ筋肉ムキムキ.vrma', name: '筋肉ムキムキ', category: 'muscle' },
        { file: '祈る.vrma', name: '祈る', category: 'pray' },
        { file: 'おちょくりwave.vrma', name: 'おちょくりwave', category: 'teasing' },
        { file: 'VRMA_07.vrma', name: 'ラジオ体操', category: 'exercise' }
    ]
};

// 全モーションをフラット化
function getAllMotionsFlat() {
    const all = [];
    Object.values(ALL_MOTIONS).forEach(category => {
        category.forEach(motion => all.push(motion));
    });
    return all;
}

// ========================================
// CharacterPersonalityManager クラス
// ========================================

class CharacterPersonalityManager {
    constructor() {
        this.characterSettings = new Map(); // characterId => settings
        this.loadSavedSettings();
        
        console.log('🎭 CharacterPersonalityManager 初期化完了');
    }
    
    /**
     * キャラクターのプリセットを設定
     */
    setPreset(characterId, presetId) {
        const preset = CHARACTER_PRESETS[presetId];
        if (!preset) {
            console.warn(`⚠️ プリセット ${presetId} が見つかりません`);
            return false;
        }
        
        // プリセットをコピーしてカスタマイズ可能に
        const settings = {
            ...JSON.parse(JSON.stringify(preset)),
            characterId,
            presetId
        };
        
        this.characterSettings.set(characterId, settings);
        this.saveSettings();
        
        console.log(`🎭 ${characterId} にプリセット「${preset.name}」を設定`);
        
        // Directorへ反映
        this.applyToDirector(characterId);
        
        return true;
    }
    
    /**
     * キャラクターの設定を取得
     * 🆕 v1.1: excludedIdleMotionsのフォールバック追加
     */
    getSettings(characterId) {
        const saved = this.characterSettings.get(characterId);
        const defaultSettings = {
            ...JSON.parse(JSON.stringify(CHARACTER_PRESETS.genki)),
            characterId,
            presetId: 'genki'
        };
        
        if (!saved) {
            return defaultSettings;
        }
        
        // 既存の保存データに新しいフィールドがない場合のフォールバック
        return {
            ...defaultSettings,
            ...saved,
            excludedIdleMotions: saved.excludedIdleMotions || []
        };
    }
    
    /**
     * キャラクターの設定をカスタマイズ
     */
    updateSettings(characterId, updates) {
        const current = this.getSettings(characterId);
        const updated = {
            ...current,
            ...updates,
            presetId: 'custom' // カスタム変更したらプリセットはcustomに
        };
        
        this.characterSettings.set(characterId, updated);
        this.saveSettings();
        
        // Directorへ反映
        this.applyToDirector(characterId);
        
        return updated;
    }
    
    /**
     * DirectorとUIへ設定を反映
     */
    applyToDirector(characterId) {
        const settings = this.getSettings(characterId);
        const director = window.multiCharManager?.director;
        
        if (director && director.setCharacterEmotionRestrictions) {
            // 感情制限を設定
            director.setCharacterEmotionRestrictions(characterId, settings.motionEmotionRestrictions);
        }
        
        // グローバルにキャラクター設定を保存（他のシステムから参照用）
        if (!window.characterPersonalitySettings) {
            window.characterPersonalitySettings = new Map();
        }
        window.characterPersonalitySettings.set(characterId, settings);
        
        console.log(`🎭 ${characterId} の設定をDirectorに反映`);
    }
    
    /**
     * 全キャラクターの設定をDirectorに反映
     */
    applyAllToDirector() {
        this.characterSettings.forEach((settings, characterId) => {
            this.applyToDirector(characterId);
        });
    }
    
    /**
     * 表情の強度を調整
     */
    adjustExpressionWeight(characterId, baseWeight, emotionName) {
        const settings = this.getSettings(characterId);
        
        let weight = baseWeight * settings.expressionMultiplier;
        
        // happy系は追加の倍率を適用
        const happyEmotions = ['happy', 'joy', 'excited', 'grateful', 'love', 'fun'];
        if (happyEmotions.includes(emotionName?.toLowerCase())) {
            weight *= settings.expressionHappyMultiplier;
        }
        
        return Math.min(weight, 1.0); // 最大1.0
    }
    
    /**
     * モーション選択のフィルタリング
     */
    filterMotions(characterId, motions, emotion) {
        const settings = this.getSettings(characterId);
        
        // 除外モーションをフィルタ
        let filtered = motions.filter(m => !settings.excludedMotions.includes(m));
        
        // 優先モーションがあれば確率アップ（2倍の確率で入れる）
        const preferred = settings.preferredMotions.filter(m => motions.includes(m));
        if (preferred.length > 0) {
            filtered = [...filtered, ...preferred]; // 優先モーションを追加（重複で確率アップ）
        }
        
        return filtered.length > 0 ? filtered : motions;
    }
    
    /**
     * 設定をlocalStorageに保存
     */
    saveSettings() {
        try {
            const data = {};
            this.characterSettings.forEach((settings, id) => {
                data[id] = settings;
            });
            localStorage.setItem('character_personality_settings_v1', JSON.stringify(data));
            console.log('💾 キャラクター個性設定を保存');
        } catch (e) {
            console.warn('⚠️ 個性設定の保存に失敗:', e);
        }
    }
    
    /**
     * 設定をlocalStorageから読み込み
     */
    loadSavedSettings() {
        try {
            const saved = localStorage.getItem('character_personality_settings_v1');
            if (saved) {
                const data = JSON.parse(saved);
                Object.entries(data).forEach(([id, settings]) => {
                    this.characterSettings.set(id, settings);
                });
                console.log('📂 キャラクター個性設定を読み込み:', Object.keys(data).length, '件');
            }
        } catch (e) {
            console.warn('⚠️ 個性設定の読み込みに失敗:', e);
        }
    }
    
    /**
     * 設定をJSONでエクスポート
     */
    exportToJSON() {
        const data = {
            version: '1.0',
            exportDate: new Date().toISOString(),
            presets: CHARACTER_PRESETS,
            characterSettings: {}
        };
        
        this.characterSettings.forEach((settings, id) => {
            data.characterSettings[id] = settings;
        });
        
        return JSON.stringify(data, null, 2);
    }
    
    /**
     * 設定をJSONからインポート
     */
    importFromJSON(jsonString) {
        try {
            const data = JSON.parse(jsonString);
            
            if (data.characterSettings) {
                Object.entries(data.characterSettings).forEach(([id, settings]) => {
                    this.characterSettings.set(id, settings);
                });
            }
            
            this.saveSettings();
            this.applyAllToDirector();
            
            console.log('📂 キャラクター個性設定をインポート');
            return true;
        } catch (e) {
            console.error('❌ インポートエラー:', e);
            return false;
        }
    }
    
    /**
     * プリセット一覧を取得
     */
    getPresets() {
        return CHARACTER_PRESETS;
    }
    
    /**
     * モーション一覧を取得
     */
    getAllMotions() {
        return ALL_MOTIONS;
    }
    
    /**
     * 全モーションをフラットに取得
     */
    getAllMotionsFlat() {
        return getAllMotionsFlat();
    }
}

// ========================================
// グローバル登録
// ========================================

window.CharacterPersonalityManager = CharacterPersonalityManager;
window.CHARACTER_PRESETS = CHARACTER_PRESETS;
window.ALL_MOTIONS = ALL_MOTIONS;

// インスタンス作成
if (!window.characterPersonalityManager) {
    window.characterPersonalityManager = new CharacterPersonalityManager();
}

// 🔧 デバッグ用: コンソールから待機モーション除外設定を確認
window.debugIdleExclusions = function() {
    const saved = localStorage.getItem('character_personality_settings_v1');
    if (!saved) {
        console.log('❌ 保存された個性設定がありません');
        return;
    }
    const data = JSON.parse(saved);
    console.log('=== 待機モーション除外設定確認 ===');
    Object.entries(data).forEach(([charId, settings]) => {
        console.log(`\n🎭 ${charId}:`);
        console.log(`  presetId: ${settings.presetId}`);
        console.log(`  excludedIdleMotions: ${(settings.excludedIdleMotions || []).length}件`);
        if (settings.excludedIdleMotions && settings.excludedIdleMotions.length > 0) {
            settings.excludedIdleMotions.forEach(m => console.log(`    - ${m}`));
        }
    });
    return data;
};
console.log('💡 デバッグ: debugIdleExclusions() で待機モーション除外設定を確認できます');

console.log('🎭 CharacterPersonalityPresets v1.1 読み込み完了（excludedIdleMotions対応）');

})();
