/**
 * 🎬 AI Cinematic Presets System v1.0
 * 
 * プリセット方式のAI演出監督
 * LLMは「プリセット名を選ぶだけ」、パラメータは人間が作成
 * 
 * アニメ・映画・漫画の演出技法を50+プリセットに凝縮
 */

class AICinematicPresets {
    constructor() {
        this.isEnabled = false;
        this.currentPreset = null;
        this.lastPresetTime = 0;
        this.presetCooldown = 2000; // 最低2秒間隔
        
        // AI設定
        this.aiProvider = 'gemini'; // 'gemini' or 'chatgpt'
        this.isProcessing = false;
        
        // 会話バッファ
        this.conversationBuffer = [];
        this.maxBufferSize = 10;
        
        // ========================================
        // 🎬 シネマティックプリセット定義
        // ========================================
        this.presets = {
            
            // ====== 😊 喜び系 (JOY) ======
            joy_soft: {
                name: '😊 穏やかな喜び',
                description: '日常の幸せ、ほっこり',
                keywords: ['嬉しい', 'よかった', 'ありがとう', '楽しかった', 'ほっと'],
                // カメラ
                shot: 'MCU',
                angle: 'FRONT',
                height: 'EYE_LEVEL',
                focalLength: 50,
                // 色彩
                whiteBalance: 5800,
                tint: 5,
                saturation: 15,
                brightness: 10,
                contrast: 0,
                // エフェクト
                bloomEnabled: true,
                bloomIntensity: 0.25,
                vignetteEnabled: false,
                dofEnabled: false,
                // 参考: 日常アニメの和やかシーン
            },
            
            joy_burst: {
                name: '🎉 弾ける喜び',
                description: 'やったー！大成功！',
                keywords: ['やったー', 'すごい', '最高', 'わーい', '！！', 'やばい'],
                shot: 'MS',
                angle: 'DIAGONAL_LEFT',
                height: 'LOW_ANGLE',
                focalLength: 35,
                whiteBalance: 5500,
                tint: 0,
                saturation: 30,
                brightness: 20,
                contrast: 10,
                bloomEnabled: true,
                bloomIntensity: 0.5,
                vignetteEnabled: false,
                dofEnabled: true,
                bokehIntensity: 0.3,
                // 参考: スポーツアニメの勝利シーン
            },
            
            joy_warm: {
                name: '🌅 温かい喜び',
                description: '再会、懐かしさ、感謝',
                keywords: ['会えて', '久しぶり', '懐かしい', '感謝', 'ありがとう'],
                shot: 'CU',
                angle: 'FRONT_LEFT',
                height: 'EYE_LEVEL',
                focalLength: 85,
                whiteBalance: 5200,
                tint: 10,
                saturation: 10,
                brightness: 5,
                contrast: -5,
                bloomEnabled: true,
                bloomIntensity: 0.4,
                vignetteEnabled: true,
                vignetteIntensity: 0.2,
                dofEnabled: true,
                bokehIntensity: 0.5,
                // 参考: 君の名は。の再会シーン
            },
            
            // ====== 😢 悲しみ系 (SADNESS) ======
            sad_quiet: {
                name: '😢 静かな悲しみ',
                description: '涙をこらえる、切ない',
                keywords: ['悲しい', '辛い', '寂しい', '切ない', '泣きそう'],
                shot: 'CU',
                angle: 'SIDE_LEFT',
                height: 'EYE_LEVEL',
                focalLength: 85,
                whiteBalance: 6500,
                tint: -10,
                saturation: -30,
                brightness: -15,
                contrast: 5,
                bloomEnabled: false,
                vignetteEnabled: true,
                vignetteIntensity: 0.4,
                grainEnabled: true,
                grainIntensity: 0.08,
                dofEnabled: true,
                bokehIntensity: 0.6,
                // 参考: ヴァイオレット・エヴァーガーデンの涙シーン
            },
            
            sad_lonely: {
                name: '🌧️ 孤独な悲しみ',
                description: '一人で立ち尽くす、別れ',
                keywords: ['一人', '孤独', '別れ', 'さよなら', 'もう会えない'],
                shot: 'LS',
                angle: 'FRONT',
                height: 'HIGH_ANGLE',
                focalLength: 24,
                whiteBalance: 7000,
                tint: -15,
                saturation: -40,
                brightness: -25,
                contrast: 10,
                bloomEnabled: false,
                vignetteEnabled: true,
                vignetteIntensity: 0.6,
                grainEnabled: true,
                grainIntensity: 0.12,
                // 参考: あの花のEDシーン
            },
            
            sad_tears: {
                name: '💧 涙',
                description: '涙を流す瞬間',
                keywords: ['泣', '涙', '😢', '😭', 'うぅ'],
                shot: 'ECU',
                angle: 'FRONT',
                height: 'EYE_LEVEL',
                focalLength: 100,
                whiteBalance: 6200,
                tint: -5,
                saturation: -20,
                brightness: -10,
                contrast: 15,
                bloomEnabled: true,
                bloomIntensity: 0.2,
                vignetteEnabled: true,
                vignetteIntensity: 0.5,
                dofEnabled: true,
                bokehIntensity: 0.7,
                // 参考: 目のアップで涙が光る演出
            },
            
            // ====== 😠 怒り系 (ANGER) ======
            anger_cold: {
                name: '😤 静かな怒り',
                description: '怒りを抑えている、睨む',
                keywords: ['許さない', 'ふざけるな', '黙れ', '怒', 'イライラ'],
                shot: 'CU',
                angle: 'FRONT',
                height: 'LOW_ANGLE',
                focalLength: 85,
                whiteBalance: 5000,
                tint: -5,
                saturation: -15,
                brightness: -10,
                contrast: 35,
                bloomEnabled: false,
                vignetteEnabled: true,
                vignetteIntensity: 0.5,
                // 参考: DEATH NOTEのライトの表情
            },
            
            anger_burst: {
                name: '💢 爆発する怒り',
                description: '激昂、叫び',
                keywords: ['なんで', 'どうして', '馬鹿', 'くそ', '💢'],
                shot: 'MCU',
                angle: 'DIAGONAL_RIGHT',
                height: 'LOW_ANGLE',
                focalLength: 35,
                whiteBalance: 4500,
                tint: 15,
                saturation: 20,
                brightness: -5,
                contrast: 40,
                bloomEnabled: false,
                vignetteEnabled: true,
                vignetteIntensity: 0.4,
                grainEnabled: true,
                grainIntensity: 0.1,
                // 参考: 進撃の巨人のエレンの激昂
            },
            
            // ====== 😨 恐怖系 (FEAR) ======
            fear_creeping: {
                name: '😰 忍び寄る恐怖',
                description: '不安、嫌な予感',
                keywords: ['怖い', '不安', 'やばい', '嫌な予感', 'なんか'],
                shot: 'MS',
                angle: 'DIAGONAL_LEFT',
                height: 'HIGH_ANGLE',
                focalLength: 28,
                whiteBalance: 6800,
                tint: -20,
                saturation: -35,
                brightness: -20,
                contrast: 20,
                bloomEnabled: false,
                vignetteEnabled: true,
                vignetteIntensity: 0.6,
                grainEnabled: true,
                grainIntensity: 0.15,
                // 参考: ホラー映画の不穏シーン
            },
            
            fear_shock: {
                name: '😱 衝撃の恐怖',
                description: '驚愕、絶望',
                keywords: ['うわ', 'ひぃ', 'まさか', '嘘', '終わり'],
                shot: 'ECU',
                angle: 'FRONT',
                height: 'EYE_LEVEL',
                focalLength: 100,
                whiteBalance: 7500,
                tint: -25,
                saturation: -50,
                brightness: -30,
                contrast: 45,
                bloomEnabled: false,
                vignetteEnabled: true,
                vignetteIntensity: 0.7,
                grainEnabled: true,
                grainIntensity: 0.2,
                // 参考: 進撃の巨人の巨人遭遇
            },
            
            // ====== 😲 驚き系 (SURPRISE) ======
            surprise_mild: {
                name: '😮 軽い驚き',
                description: 'へー、そうなんだ',
                keywords: ['え', 'へー', 'そうなんだ', 'まじ', 'ほんと'],
                shot: 'MCU',
                angle: 'FRONT_RIGHT',
                height: 'EYE_LEVEL',
                focalLength: 50,
                whiteBalance: 5600,
                tint: 0,
                saturation: 5,
                brightness: 5,
                contrast: 5,
                bloomEnabled: false,
                vignetteEnabled: false,
            },
            
            surprise_shock: {
                name: '😲 大きな驚き',
                description: 'えぇ！？マジで！？',
                keywords: ['えぇ', 'マジ', '本当', 'うそ', '！？', 'びっくり'],
                shot: 'CU',
                angle: 'FRONT',
                height: 'EYE_LEVEL',
                focalLength: 65,
                whiteBalance: 5800,
                tint: 0,
                saturation: 10,
                brightness: 15,
                contrast: 15,
                bloomEnabled: true,
                bloomIntensity: 0.3,
                vignetteEnabled: true,
                vignetteIntensity: 0.3,
                // 参考: コメディアニメのリアクション
            },
            
            // ====== 💕 恋愛系 (LOVE) ======
            love_shy: {
                name: '😳 照れ',
                description: 'ドキドキ、照れる',
                keywords: ['好き', '照れ', 'ドキドキ', '恥ずかし', '💕'],
                shot: 'CU',
                angle: 'FRONT_LEFT',
                height: 'EYE_LEVEL',
                focalLength: 85,
                whiteBalance: 5400,
                tint: 15,
                saturation: 15,
                brightness: 10,
                contrast: -10,
                bloomEnabled: true,
                bloomIntensity: 0.45,
                vignetteEnabled: true,
                vignetteIntensity: 0.2,
                dofEnabled: true,
                bokehIntensity: 0.5,
                // 参考: 少女漫画のときめきシーン
            },
            
            love_confession: {
                name: '💗 告白',
                description: '大好き、愛してる',
                keywords: ['大好き', '愛してる', '付き合って', '結婚', '❤'],
                shot: 'CU',
                angle: 'FRONT',
                height: 'EYE_LEVEL',
                focalLength: 100,
                whiteBalance: 5200,
                tint: 20,
                saturation: 20,
                brightness: 15,
                contrast: -15,
                bloomEnabled: true,
                bloomIntensity: 0.6,
                vignetteEnabled: true,
                vignetteIntensity: 0.25,
                dofEnabled: true,
                bokehIntensity: 0.7,
                // 参考: ラブコメのクライマックス
            },
            
            love_together: {
                name: '👫 二人の時間',
                description: '寄り添う、一緒にいる幸せ',
                keywords: ['一緒', '隣', '二人', 'ずっと', '傍に'],
                shot: 'TWOSHOT',
                angle: 'FRONT',
                height: 'EYE_LEVEL',
                focalLength: 50,
                whiteBalance: 5300,
                tint: 10,
                saturation: 10,
                brightness: 8,
                contrast: -5,
                bloomEnabled: true,
                bloomIntensity: 0.35,
                vignetteEnabled: true,
                vignetteIntensity: 0.15,
                dofEnabled: true,
                bokehIntensity: 0.4,
            },
            
            // ====== 😰 緊張系 (TENSION) ======
            tension_waiting: {
                name: '😓 緊張の待機',
                description: '結果待ち、ドキドキ',
                keywords: ['緊張', 'ドキドキ', '大丈夫かな', '心配', 'どうなる'],
                shot: 'MCU',
                angle: 'FRONT',
                height: 'EYE_LEVEL',
                focalLength: 65,
                whiteBalance: 5500,
                tint: -5,
                saturation: -10,
                brightness: -5,
                contrast: 15,
                bloomEnabled: false,
                vignetteEnabled: true,
                vignetteIntensity: 0.35,
            },
            
            tension_confrontation: {
                name: '⚔️ 対峙',
                description: '睨み合い、一触即発',
                keywords: ['対決', '勝負', '来い', '覚悟', '戦い'],
                shot: 'MS',
                angle: 'SIDE_LEFT',
                height: 'LOW_ANGLE',
                focalLength: 35,
                whiteBalance: 5000,
                tint: -10,
                saturation: -20,
                brightness: -15,
                contrast: 35,
                bloomEnabled: false,
                vignetteEnabled: true,
                vignetteIntensity: 0.5,
                grainEnabled: true,
                grainIntensity: 0.08,
                // 参考: バトルアニメの対峙シーン
            },
            
            tension_climax: {
                name: '🔥 クライマックス',
                description: '最高潮、決め台詞',
                keywords: ['今だ', '行くぞ', '決める', '終わらせる', '全力'],
                shot: 'CU',
                angle: 'LOW_ANGLE',
                height: 'LOW_ANGLE',
                focalLength: 50,
                whiteBalance: 4800,
                tint: 5,
                saturation: 10,
                brightness: 0,
                contrast: 40,
                bloomEnabled: true,
                bloomIntensity: 0.3,
                vignetteEnabled: true,
                vignetteIntensity: 0.45,
                // 参考: 少年漫画の必殺技シーン
            },
            
            // ====== 😌 安堵系 (RELIEF) ======
            relief_sigh: {
                name: '😮‍💨 ほっとする',
                description: 'よかった、助かった',
                keywords: ['よかった', 'ほっと', '助かった', '安心', 'ふぅ'],
                shot: 'MCU',
                angle: 'FRONT',
                height: 'EYE_LEVEL',
                focalLength: 50,
                whiteBalance: 5600,
                tint: 5,
                saturation: 5,
                brightness: 10,
                contrast: -5,
                bloomEnabled: true,
                bloomIntensity: 0.2,
                vignetteEnabled: false,
            },
            
            relief_peace: {
                name: '🕊️ 平穏',
                description: '穏やかな終わり、余韻',
                keywords: ['終わった', '平和', '穏やか', '静か', '落ち着いた'],
                shot: 'MS',
                angle: 'FRONT',
                height: 'EYE_LEVEL',
                focalLength: 50,
                whiteBalance: 5500,
                tint: 5,
                saturation: 0,
                brightness: 5,
                contrast: -10,
                bloomEnabled: true,
                bloomIntensity: 0.3,
                vignetteEnabled: true,
                vignetteIntensity: 0.15,
                dofEnabled: true,
                bokehIntensity: 0.3,
            },
            
            // ====== 🤔 謎・思考系 (MYSTERY) ======
            mystery_thinking: {
                name: '🤔 考え中',
                description: 'うーん、どうしよう',
                keywords: ['うーん', 'どうしよう', '考え', 'なぜ', 'どうして'],
                shot: 'MCU',
                angle: 'DIAGONAL_LEFT',
                height: 'EYE_LEVEL',
                focalLength: 65,
                whiteBalance: 5800,
                tint: 0,
                saturation: -5,
                brightness: 0,
                contrast: 5,
                bloomEnabled: false,
                vignetteEnabled: true,
                vignetteIntensity: 0.2,
            },
            
            mystery_suspicious: {
                name: '🧐 怪しい',
                description: '何かある、謎',
                keywords: ['怪しい', '謎', '不思議', 'なんか変', 'おかしい'],
                shot: 'CU',
                angle: 'SIDE_RIGHT',
                height: 'EYE_LEVEL',
                focalLength: 85,
                whiteBalance: 6500,
                tint: -15,
                saturation: -25,
                brightness: -15,
                contrast: 20,
                bloomEnabled: false,
                vignetteEnabled: true,
                vignetteIntensity: 0.5,
                grainEnabled: true,
                grainIntensity: 0.1,
                // 参考: サスペンスドラマの怪しいシーン
            },
            
            mystery_revelation: {
                name: '💡 発見',
                description: 'そうか！わかった！',
                keywords: ['そうか', 'わかった', '見つけた', 'これだ', 'ひらめいた'],
                shot: 'CU',
                angle: 'FRONT',
                height: 'EYE_LEVEL',
                focalLength: 65,
                whiteBalance: 5800,
                tint: 0,
                saturation: 10,
                brightness: 15,
                contrast: 10,
                bloomEnabled: true,
                bloomIntensity: 0.35,
                vignetteEnabled: true,
                vignetteIntensity: 0.25,
            },
            
            // ====== 😄 コメディ系 (COMEDY) ======
            comedy_funny: {
                name: '😂 笑い',
                description: 'あはは、面白い',
                keywords: ['笑', 'あはは', '面白い', 'ウケる', 'www'],
                shot: 'MCU',
                angle: 'FRONT',
                height: 'EYE_LEVEL',
                focalLength: 50,
                whiteBalance: 5600,
                tint: 5,
                saturation: 25,
                brightness: 15,
                contrast: 5,
                bloomEnabled: true,
                bloomIntensity: 0.25,
                vignetteEnabled: false,
            },
            
            comedy_tsukkomi: {
                name: '🤦 ツッコミ',
                description: 'なんでやねん！おい！',
                keywords: ['おい', 'なんで', 'ちょっと', 'やめて', 'え〜'],
                shot: 'MS',
                angle: 'DIAGONAL_RIGHT',
                height: 'EYE_LEVEL',
                focalLength: 35,
                whiteBalance: 5500,
                tint: 0,
                saturation: 20,
                brightness: 10,
                contrast: 15,
                bloomEnabled: false,
                vignetteEnabled: false,
            },
            
            comedy_embarrassed: {
                name: '😅 困惑',
                description: 'えーと、あの...',
                keywords: ['えーと', 'あの', 'その', '困った', '😅'],
                shot: 'MCU',
                angle: 'FRONT_LEFT',
                height: 'EYE_LEVEL',
                focalLength: 50,
                whiteBalance: 5500,
                tint: 5,
                saturation: 10,
                brightness: 5,
                contrast: 0,
                bloomEnabled: false,
                vignetteEnabled: false,
            },
            
            // ====== 📖 ナレーション・説明系 ======
            narration_intro: {
                name: '📖 導入',
                description: '説明、状況紹介',
                keywords: ['では', 'さて', 'ところで', '実は', '説明'],
                shot: 'MS',
                angle: 'FRONT',
                height: 'EYE_LEVEL',
                focalLength: 50,
                whiteBalance: 5500,
                tint: 0,
                saturation: 0,
                brightness: 0,
                contrast: 0,
                bloomEnabled: false,
                vignetteEnabled: false,
            },
            
            narration_important: {
                name: '📢 重要な話',
                description: '大事なこと、真面目な話',
                keywords: ['大事', '重要', '真面目', '聞いて', '実は'],
                shot: 'CU',
                angle: 'FRONT',
                height: 'EYE_LEVEL',
                focalLength: 65,
                whiteBalance: 5500,
                tint: 0,
                saturation: -5,
                brightness: 0,
                contrast: 10,
                bloomEnabled: false,
                vignetteEnabled: true,
                vignetteIntensity: 0.25,
            },
            
            // ====== 🌸 シーン演出系 ======
            scene_morning: {
                name: '🌅 朝',
                description: '爽やかな朝、目覚め',
                keywords: ['おはよう', '朝', '目覚め', '今日', '始まり'],
                shot: 'MS',
                angle: 'FRONT',
                height: 'EYE_LEVEL',
                focalLength: 50,
                whiteBalance: 5800,
                tint: 5,
                saturation: 15,
                brightness: 15,
                contrast: 5,
                bloomEnabled: true,
                bloomIntensity: 0.35,
                vignetteEnabled: false,
            },
            
            scene_night: {
                name: '🌙 夜',
                description: '夜の静けさ、ムーディー',
                keywords: ['夜', '暗い', '月', '星', '眠い', 'おやすみ'],
                shot: 'MCU',
                angle: 'FRONT',
                height: 'EYE_LEVEL',
                focalLength: 50,
                whiteBalance: 7000,
                tint: -15,
                saturation: -25,
                brightness: -30,
                contrast: 10,
                bloomEnabled: true,
                bloomIntensity: 0.2,
                vignetteEnabled: true,
                vignetteIntensity: 0.4,
            },
            
            scene_sunset: {
                name: '🌆 夕暮れ',
                description: 'エモい夕暮れ、青春',
                keywords: ['夕方', '夕焼け', '帰り', '放課後', '夕日'],
                shot: 'MS',
                angle: 'SIDE_LEFT',
                height: 'EYE_LEVEL',
                focalLength: 50,
                whiteBalance: 4200,
                tint: 25,
                saturation: 30,
                brightness: 5,
                contrast: 15,
                bloomEnabled: true,
                bloomIntensity: 0.4,
                vignetteEnabled: true,
                vignetteIntensity: 0.2,
                // 参考: 青春アニメの夕暮れシーン
            },
            
            scene_flashback: {
                name: '📼 回想',
                description: '思い出、過去',
                keywords: ['思い出', '昔', 'あの時', '懐かしい', '過去'],
                shot: 'MCU',
                angle: 'FRONT',
                height: 'EYE_LEVEL',
                focalLength: 50,
                whiteBalance: 5200,
                tint: 15,
                saturation: -15,
                brightness: 10,
                contrast: -10,
                bloomEnabled: true,
                bloomIntensity: 0.5,
                vignetteEnabled: true,
                vignetteIntensity: 0.35,
                grainEnabled: true,
                grainIntensity: 0.12,
                // 参考: 回想シーンのぼんやり感
            },
            
            scene_dream: {
                name: '💭 夢',
                description: '夢の中、幻想的',
                keywords: ['夢', '幻', '不思議', 'ふわふわ', '曖昧'],
                shot: 'MCU',
                angle: 'FRONT',
                height: 'EYE_LEVEL',
                focalLength: 50,
                whiteBalance: 6000,
                tint: 10,
                saturation: -10,
                brightness: 15,
                contrast: -20,
                bloomEnabled: true,
                bloomIntensity: 0.7,
                vignetteEnabled: true,
                vignetteIntensity: 0.3,
                dofEnabled: true,
                bokehIntensity: 0.6,
            },
            
            // ====== 😐 ニュートラル系 ======
            neutral_default: {
                name: '😐 通常',
                description: '普通の会話',
                keywords: [],
                shot: 'MCU',
                angle: 'FRONT',
                height: 'EYE_LEVEL',
                focalLength: 50,
                whiteBalance: 5500,
                tint: 0,
                saturation: 0,
                brightness: 0,
                contrast: 0,
                bloomEnabled: false,
                vignetteEnabled: false,
                dofEnabled: false,
            },
            
            neutral_listening: {
                name: '👂 傾聴',
                description: '相手の話を聞いている',
                keywords: ['うん', 'なるほど', 'そうなんだ', 'へー', 'ふーん'],
                shot: 'MCU',
                angle: 'FRONT_LEFT',
                height: 'EYE_LEVEL',
                focalLength: 50,
                whiteBalance: 5500,
                tint: 0,
                saturation: 0,
                brightness: 0,
                contrast: 0,
                bloomEnabled: false,
                vignetteEnabled: false,
            },
            
            neutral_question: {
                name: '❓ 質問',
                description: '何かを尋ねている',
                keywords: ['？', '何', 'どう', 'いつ', 'どこ', 'なぜ', 'どうして'],
                shot: 'MCU',
                angle: 'FRONT',
                height: 'EYE_LEVEL',
                focalLength: 50,
                whiteBalance: 5500,
                tint: 0,
                saturation: 0,
                brightness: 5,
                contrast: 5,
                bloomEnabled: false,
                vignetteEnabled: false,
            },
        };
        
        // プリセット名の配列（AIに渡す用）
        this.presetNames = Object.keys(this.presets);
        
        this.panel = null;
        this.init();
    }
    
    init() {
        this.createPanel();
        this.setupEventListeners();
        this.setupConversationListener();
        console.log('🎬 AI Cinematic Presets System 初期化完了');
        console.log(`   📦 ${this.presetNames.length}個のプリセット登録済み`);
    }
    
    // ========================================
    // AI（Gemini/ChatGPT）で文章を理解してプリセット選択
    // ========================================
    
    async selectPresetByAI(text) {
        if (this.isProcessing) return null;
        this.isProcessing = true;
        
        try {
            // プリセット一覧を生成
            const presetListForAI = this.generatePresetListForAI();
            
            const prompt = `あなたは映像演出の専門家です。以下のセリフ/文章を読んで、最も適切な演出プリセットを1つ選んでください。

【セリフ】
"${text}"

【選択肢】
${presetListForAI}

【ルール】
- セリフの感情、状況、ニュアンスを総合的に判断してください
- 必ず上記の選択肢から1つだけ選んでください
- プリセットIDのみを回答してください（例: joy_soft）
- 判断が難しい場合は neutral_default を選んでください`;

            let response = null;
            
            // Gemini API
            if (this.aiProvider === 'gemini' && window.geminiClient) {
                try {
                    const result = await window.geminiClient.generateContent(prompt);
                    response = result.response?.text() || result;
                } catch (e) {
                    console.warn('Gemini API error:', e);
                }
            }
            
            // ChatGPT API (フォールバック)
            if (!response && window.chatGPTClient) {
                try {
                    response = await window.chatGPTClient.chat([
                        { role: 'user', content: prompt }
                    ]);
                } catch (e) {
                    console.warn('ChatGPT API error:', e);
                }
            }
            
            if (response) {
                // レスポンスからプリセットIDを抽出
                const presetId = this.extractPresetId(response);
                if (presetId && this.presets[presetId]) {
                    console.log(`🤖 AI判断: "${text.substring(0, 30)}..." → ${presetId}`);
                    return presetId;
                }
            }
            
            // AIが使えない場合はシンプルな感情分析にフォールバック
            return this.fallbackEmotionAnalysis(text);
            
        } catch (error) {
            console.error('AI preset selection error:', error);
            return this.fallbackEmotionAnalysis(text);
        } finally {
            this.isProcessing = false;
        }
    }
    
    // AIに渡すプリセット一覧を生成
    generatePresetListForAI() {
        const categories = {
            '喜び': ['joy_soft', 'joy_burst', 'joy_warm'],
            '悲しみ': ['sad_quiet', 'sad_lonely', 'sad_tears'],
            '怒り': ['anger_cold', 'anger_burst'],
            '恐怖・不安': ['fear_creeping', 'fear_shock'],
            '驚き': ['surprise_mild', 'surprise_shock'],
            '恋愛・照れ': ['love_shy', 'love_confession', 'love_together'],
            '緊張': ['tension_waiting', 'tension_confrontation', 'tension_climax'],
            '安堵': ['relief_sigh', 'relief_peace'],
            '思考・謎': ['mystery_thinking', 'mystery_suspicious', 'mystery_revelation'],
            'コメディ': ['comedy_funny', 'comedy_tsukkomi', 'comedy_embarrassed'],
            'シーン演出': ['scene_morning', 'scene_sunset', 'scene_night', 'scene_flashback', 'scene_dream'],
            '通常': ['neutral_default', 'neutral_listening', 'neutral_question']
        };
        
        let result = '';
        for (const [category, presetIds] of Object.entries(categories)) {
            result += `\n【${category}】\n`;
            for (const id of presetIds) {
                const p = this.presets[id];
                if (p) {
                    result += `  ${id}: ${p.description}\n`;
                }
            }
        }
        return result;
    }
    
    // レスポンスからプリセットIDを抽出
    extractPresetId(response) {
        if (!response) return null;
        
        const text = typeof response === 'string' ? response : JSON.stringify(response);
        
        // プリセットIDを探す
        for (const presetId of this.presetNames) {
            if (text.includes(presetId)) {
                return presetId;
            }
        }
        
        return null;
    }
    
    // フォールバック: シンプルな感情分析
    fallbackEmotionAnalysis(text) {
        // 感情を示す明確なパターン
        const patterns = [
            // 喜び
            { regex: /嬉し|楽し|幸せ|やった|わーい|最高|すごい|ありがとう/i, preset: 'joy_soft' },
            { regex: /！！|!!|やったー|イエーイ/i, preset: 'joy_burst' },
            
            // 悲しみ
            { regex: /悲し|辛い|寂し|切な|泣/i, preset: 'sad_quiet' },
            { regex: /さよなら|別れ|もう会えない|一人/i, preset: 'sad_lonely' },
            
            // 怒り
            { regex: /怒|むかつ|イライラ|許さない|ふざけるな/i, preset: 'anger_cold' },
            { regex: /💢|くそ|馬鹿|殺/i, preset: 'anger_burst' },
            
            // 恐怖
            { regex: /怖|恐|不安|やばい|ヤバ/i, preset: 'fear_creeping' },
            
            // 驚き
            { regex: /え[ぇえ]|まじ|本当|うそ|びっくり|！\？|\?!/i, preset: 'surprise_shock' },
            
            // 恋愛
            { regex: /好き|愛して|ドキドキ|照れ|💕|❤/i, preset: 'love_shy' },
            { regex: /大好き|付き合って|結婚/i, preset: 'love_confession' },
            
            // 緊張
            { regex: /緊張|ドキドキ|心配|大丈夫かな/i, preset: 'tension_waiting' },
            
            // 安堵
            { regex: /よかった|ほっと|助かった|安心/i, preset: 'relief_sigh' },
            
            // 思考
            { regex: /うーん|どうしよう|考え|なぜ|どうして/i, preset: 'mystery_thinking' },
            
            // コメディ
            { regex: /笑|あはは|ウケる|www|ｗｗ/i, preset: 'comedy_funny' },
            
            // 時間帯
            { regex: /おはよう|朝|目覚め/i, preset: 'scene_morning' },
            { regex: /夕方|夕焼け|夕暮れ/i, preset: 'scene_sunset' },
            { regex: /夜|おやすみ|眠/i, preset: 'scene_night' },
            { regex: /思い出|昔|あの時|懐かし/i, preset: 'scene_flashback' },
        ];
        
        for (const { regex, preset } of patterns) {
            if (regex.test(text)) {
                console.log(`📝 フォールバック判断: "${text.substring(0, 30)}..." → ${preset}`);
                return preset;
            }
        }
        
        // 質問文
        if (/？|\?/.test(text)) {
            return 'neutral_question';
        }
        
        return 'neutral_default';
    }
    
    // ========================================
    // プリセット適用
    // ========================================
    
    applyPreset(presetId) {
        const preset = this.presets[presetId];
        if (!preset) {
            console.warn(`プリセット "${presetId}" が見つかりません`);
            return;
        }
        
        // クールダウンチェック
        const now = Date.now();
        if (now - this.lastPresetTime < this.presetCooldown) {
            return;
        }
        this.lastPresetTime = now;
        
        this.currentPreset = presetId;
        
        console.log(`🎬 プリセット適用: ${preset.name}`);
        
        // 1. AI Director Camera にショット指示
        if (window.aiDirectorCamera) {
            const shot = preset.shot || 'MCU';
            const angle = preset.angle || 'FRONT';
            const height = preset.height || 'EYE_LEVEL';
            window.aiDirectorCamera.setShot(shot, angle, height);
        }
        
        // 2. Camera Effects Panel に色彩・エフェクト指示
        if (window.cameraEffectsPanel) {
            const settings = window.cameraEffectsPanel.settings;
            
            // レンズ
            if (preset.focalLength !== undefined) {
                settings.focalLength = preset.focalLength;
            }
            
            // 色彩
            if (preset.whiteBalance !== undefined) {
                settings.whiteBalance = preset.whiteBalance;
            }
            if (preset.tint !== undefined) {
                settings.tint = preset.tint;
            }
            if (preset.saturation !== undefined) {
                settings.saturation = preset.saturation;
            }
            if (preset.brightness !== undefined) {
                settings.brightness = preset.brightness;
            }
            if (preset.contrast !== undefined) {
                settings.contrast = preset.contrast;
            }
            
            // エフェクト
            settings.bloomEnabled = preset.bloomEnabled || false;
            if (preset.bloomIntensity !== undefined) {
                settings.bloomIntensity = preset.bloomIntensity;
            }
            
            settings.vignetteEnabled = preset.vignetteEnabled || false;
            if (preset.vignetteIntensity !== undefined) {
                settings.vignetteIntensity = preset.vignetteIntensity;
            }
            
            settings.grainEnabled = preset.grainEnabled || false;
            if (preset.grainIntensity !== undefined) {
                settings.grainIntensity = preset.grainIntensity;
            }
            
            settings.dofEnabled = preset.dofEnabled || false;
            if (preset.bokehIntensity !== undefined) {
                settings.bokehIntensity = preset.bokehIntensity;
            }
            
            // UI更新＆エフェクト適用
            window.cameraEffectsPanel.updateUIFromSettings();
            window.cameraEffectsPanel.applyEffects();
        }
        
        // UI更新
        this.updateStatusUI(preset);
        this.log(`🎬 ${preset.name}`);
    }
    
    // ========================================
    // 会話監視
    // ========================================
    
    setupConversationListener() {
        // カスタムイベント監視
        window.addEventListener('chatMessage', (e) => {
            if (this.isEnabled) {
                this.onNewMessage(e.detail);
            }
        });
        
        // 定期的にチャット履歴をチェック
        setInterval(() => {
            if (this.isEnabled) {
                this.checkChatHistory();
            }
        }, 1000);
    }
    
    checkChatHistory() {
        const chatLog = document.getElementById('chat-log') || 
                       document.querySelector('.chat-messages') ||
                       document.querySelector('[data-chat-log]');
        
        if (!chatLog) return;
        
        const messages = chatLog.querySelectorAll('.message, .chat-message, [data-message]');
        const lastMessage = messages[messages.length - 1];
        
        if (lastMessage && lastMessage !== this.lastProcessedMessage) {
            this.lastProcessedMessage = lastMessage;
            
            const text = lastMessage.textContent || lastMessage.innerText;
            const isAI = lastMessage.classList.contains('ai') || 
                        lastMessage.classList.contains('assistant') ||
                        lastMessage.dataset.sender === 'ai';
            
            this.onNewMessage({
                text: text,
                sender: isAI ? 'ai' : 'user',
                timestamp: Date.now()
            });
        }
    }
    
    async onNewMessage(message) {
        // バッファに追加
        this.conversationBuffer.push(message);
        if (this.conversationBuffer.length > this.maxBufferSize) {
            this.conversationBuffer.shift();
        }
        
        // クールダウンチェック
        const now = Date.now();
        if (now - this.lastPresetTime < this.presetCooldown) {
            return;
        }
        
        // AIで文章を理解してプリセット選択
        const presetId = await this.selectPresetByAI(message.text);
        
        if (presetId && presetId !== this.currentPreset) {
            this.applyPreset(presetId);
        }
    }
    
    // ========================================
    // UI
    // ========================================
    
    createPanel() {
        const panel = document.createElement('div');
        panel.id = 'ai-cinematic-presets-panel';
        panel.innerHTML = `
            <style>
                #ai-cinematic-presets-panel {
                    position: fixed;
                    bottom: 10px;
                    right: 10px;
                    width: 320px;
                    max-height: 500px;
                    background: rgba(15, 15, 25, 0.95);
                    border-radius: 12px;
                    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
                    font-family: 'Segoe UI', sans-serif;
                    font-size: 11px;
                    color: #e0e0e0;
                    z-index: 9500;
                    overflow: hidden;
                    backdrop-filter: blur(10px);
                    border: 1px solid rgba(255, 150, 50, 0.3);
                    display: none;
                }
                
                #ai-cinematic-presets-panel.visible { display: block; }
                #ai-cinematic-presets-panel.minimized .acp-content { display: none; }
                
                .acp-header {
                    background: linear-gradient(135deg, #ff9500 0%, #ff5e3a 100%);
                    padding: 10px 14px;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    cursor: move;
                }
                
                .acp-title {
                    font-size: 13px;
                    font-weight: bold;
                    color: white;
                }
                
                .acp-header-btns {
                    display: flex;
                    gap: 6px;
                }
                
                .acp-header-btn {
                    background: rgba(255, 255, 255, 0.2);
                    border: none;
                    color: white;
                    width: 24px;
                    height: 24px;
                    border-radius: 6px;
                    cursor: pointer;
                }
                
                .acp-header-btn:hover { background: rgba(255, 255, 255, 0.35); }
                
                .acp-content {
                    padding: 12px;
                    max-height: 420px;
                    overflow-y: auto;
                }
                
                .acp-master-toggle {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    padding: 12px;
                    background: linear-gradient(135deg, rgba(255, 149, 0, 0.2) 0%, rgba(255, 94, 58, 0.2) 100%);
                    border-radius: 8px;
                    margin-bottom: 12px;
                    border: 1px solid rgba(255, 150, 50, 0.3);
                }
                
                .acp-master-toggle.active {
                    background: linear-gradient(135deg, rgba(255, 149, 0, 0.4) 0%, rgba(255, 94, 58, 0.4) 100%);
                    border-color: #ff9500;
                }
                
                .acp-toggle {
                    position: relative;
                    width: 50px;
                    height: 26px;
                }
                
                .acp-toggle input { opacity: 0; width: 0; height: 0; }
                
                .acp-toggle-slider {
                    position: absolute;
                    cursor: pointer;
                    top: 0; left: 0; right: 0; bottom: 0;
                    background: rgba(255, 255, 255, 0.2);
                    transition: 0.3s;
                    border-radius: 26px;
                }
                
                .acp-toggle-slider:before {
                    position: absolute;
                    content: "";
                    height: 18px;
                    width: 18px;
                    left: 4px;
                    bottom: 4px;
                    background: white;
                    transition: 0.3s;
                    border-radius: 50%;
                }
                
                .acp-toggle input:checked + .acp-toggle-slider {
                    background: linear-gradient(135deg, #ff9500 0%, #ff5e3a 100%);
                }
                
                .acp-toggle input:checked + .acp-toggle-slider:before {
                    transform: translateX(24px);
                }
                
                .acp-status {
                    background: rgba(0, 0, 0, 0.3);
                    border-radius: 8px;
                    padding: 12px;
                    margin-bottom: 12px;
                }
                
                .acp-current-preset {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                }
                
                .acp-preset-emoji { font-size: 28px; }
                
                .acp-preset-info { flex: 1; }
                
                .acp-preset-name {
                    font-size: 14px;
                    font-weight: bold;
                    color: #ff9500;
                }
                
                .acp-preset-desc {
                    font-size: 10px;
                    color: #888;
                    margin-top: 2px;
                }
                
                .acp-section-title {
                    font-size: 11px;
                    font-weight: bold;
                    color: #ff9500;
                    margin: 12px 0 8px 0;
                    padding-bottom: 4px;
                    border-bottom: 1px solid rgba(255, 150, 50, 0.3);
                }
                
                .acp-presets-grid {
                    display: grid;
                    grid-template-columns: repeat(4, 1fr);
                    gap: 4px;
                }
                
                .acp-preset-btn {
                    padding: 8px 4px;
                    background: rgba(255, 255, 255, 0.05);
                    border: 1px solid transparent;
                    border-radius: 6px;
                    cursor: pointer;
                    text-align: center;
                    font-size: 9px;
                    color: #aaa;
                    transition: all 0.2s;
                }
                
                .acp-preset-btn:hover {
                    background: rgba(255, 149, 0, 0.2);
                    border-color: rgba(255, 149, 0, 0.5);
                    color: #fff;
                }
                
                .acp-preset-btn.active {
                    background: linear-gradient(135deg, #ff9500, #ff5e3a);
                    border-color: #ff9500;
                    color: white;
                }
                
                .acp-preset-btn .emoji { font-size: 16px; display: block; margin-bottom: 2px; }
                
                .acp-log {
                    background: rgba(0, 0, 0, 0.3);
                    border-radius: 6px;
                    padding: 8px;
                    max-height: 80px;
                    overflow-y: auto;
                    font-family: monospace;
                    font-size: 9px;
                }
                
                .acp-log-entry { margin-bottom: 3px; color: #888; }
                .acp-log-entry .time { color: #555; }
                .acp-log-entry .action { color: #ff9500; }
            </style>
            
            <div class="acp-header">
                <div class="acp-title">🎬 シネマティック演出</div>
                <div class="acp-header-btns">
                    <button class="acp-header-btn" id="acp-minimize">−</button>
                    <button class="acp-header-btn" id="acp-close">×</button>
                </div>
            </div>
            
            <div class="acp-content">
                <!-- マスタートグル -->
                <div class="acp-master-toggle" id="acp-master-toggle">
                    <span style="font-weight: bold; color: #ff9500;">🎭 自動演出</span>
                    <label class="acp-toggle">
                        <input type="checkbox" id="acp-enabled">
                        <span class="acp-toggle-slider"></span>
                    </label>
                </div>
                
                <!-- AI設定 -->
                <div style="background: rgba(0,0,0,0.2); border-radius: 8px; padding: 10px; margin-bottom: 12px;">
                    <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
                        <span style="font-size: 10px; color: #aaa;">🤖 AI:</span>
                        <select id="acp-ai-provider" style="flex: 1; background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.1); color: #ff9500; padding: 4px 8px; border-radius: 4px; font-size: 10px;">
                            <option value="gemini">Gemini</option>
                            <option value="chatgpt">ChatGPT</option>
                        </select>
                    </div>
                    <div id="acp-ai-status" style="font-size: 9px; color: #888; text-align: center;">AIで文章の意味を理解して演出を選択</div>
                </div>
                
                <!-- 現在のプリセット -->
                <div class="acp-status">
                    <div class="acp-current-preset">
                        <span class="acp-preset-emoji" id="acp-emoji">😐</span>
                        <div class="acp-preset-info">
                            <div class="acp-preset-name" id="acp-preset-name">通常</div>
                            <div class="acp-preset-desc" id="acp-preset-desc">普通の会話</div>
                        </div>
                    </div>
                </div>
                
                <!-- プリセット手動選択 -->
                <div class="acp-section-title">😊 喜び</div>
                <div class="acp-presets-grid">
                    <button class="acp-preset-btn" data-preset="joy_soft"><span class="emoji">😊</span>穏やか</button>
                    <button class="acp-preset-btn" data-preset="joy_burst"><span class="emoji">🎉</span>弾ける</button>
                    <button class="acp-preset-btn" data-preset="joy_warm"><span class="emoji">🌅</span>温かい</button>
                </div>
                
                <div class="acp-section-title">😢 悲しみ</div>
                <div class="acp-presets-grid">
                    <button class="acp-preset-btn" data-preset="sad_quiet"><span class="emoji">😢</span>静か</button>
                    <button class="acp-preset-btn" data-preset="sad_lonely"><span class="emoji">🌧️</span>孤独</button>
                    <button class="acp-preset-btn" data-preset="sad_tears"><span class="emoji">💧</span>涙</button>
                </div>
                
                <div class="acp-section-title">😠 怒り・恐怖</div>
                <div class="acp-presets-grid">
                    <button class="acp-preset-btn" data-preset="anger_cold"><span class="emoji">😤</span>静かな怒り</button>
                    <button class="acp-preset-btn" data-preset="anger_burst"><span class="emoji">💢</span>激昂</button>
                    <button class="acp-preset-btn" data-preset="fear_creeping"><span class="emoji">😰</span>不安</button>
                    <button class="acp-preset-btn" data-preset="fear_shock"><span class="emoji">😱</span>恐怖</button>
                </div>
                
                <div class="acp-section-title">💕 恋愛</div>
                <div class="acp-presets-grid">
                    <button class="acp-preset-btn" data-preset="love_shy"><span class="emoji">😳</span>照れ</button>
                    <button class="acp-preset-btn" data-preset="love_confession"><span class="emoji">💗</span>告白</button>
                    <button class="acp-preset-btn" data-preset="love_together"><span class="emoji">👫</span>二人</button>
                </div>
                
                <div class="acp-section-title">⚔️ 緊張</div>
                <div class="acp-presets-grid">
                    <button class="acp-preset-btn" data-preset="tension_waiting"><span class="emoji">😓</span>待機</button>
                    <button class="acp-preset-btn" data-preset="tension_confrontation"><span class="emoji">⚔️</span>対峙</button>
                    <button class="acp-preset-btn" data-preset="tension_climax"><span class="emoji">🔥</span>クライマックス</button>
                </div>
                
                <div class="acp-section-title">🎨 その他</div>
                <div class="acp-presets-grid">
                    <button class="acp-preset-btn" data-preset="surprise_shock"><span class="emoji">😲</span>驚き</button>
                    <button class="acp-preset-btn" data-preset="comedy_funny"><span class="emoji">😂</span>笑い</button>
                    <button class="acp-preset-btn" data-preset="mystery_thinking"><span class="emoji">🤔</span>思考</button>
                    <button class="acp-preset-btn" data-preset="relief_sigh"><span class="emoji">😮‍💨</span>安堵</button>
                </div>
                
                <div class="acp-section-title">🌸 シーン</div>
                <div class="acp-presets-grid">
                    <button class="acp-preset-btn" data-preset="scene_morning"><span class="emoji">🌅</span>朝</button>
                    <button class="acp-preset-btn" data-preset="scene_sunset"><span class="emoji">🌆</span>夕暮れ</button>
                    <button class="acp-preset-btn" data-preset="scene_night"><span class="emoji">🌙</span>夜</button>
                    <button class="acp-preset-btn" data-preset="scene_flashback"><span class="emoji">📼</span>回想</button>
                </div>
                
                <div class="acp-section-title">😐 基本</div>
                <div class="acp-presets-grid">
                    <button class="acp-preset-btn active" data-preset="neutral_default"><span class="emoji">😐</span>通常</button>
                    <button class="acp-preset-btn" data-preset="neutral_listening"><span class="emoji">👂</span>傾聴</button>
                    <button class="acp-preset-btn" data-preset="neutral_question"><span class="emoji">❓</span>質問</button>
                </div>
                
                <!-- ログ -->
                <div class="acp-section-title">📜 演出ログ</div>
                <div class="acp-log" id="acp-log">
                    <div class="acp-log-entry"><span class="time">[--:--]</span> <span class="action">待機中...</span></div>
                </div>
            </div>
        `;
        
        document.body.appendChild(panel);
        this.panel = panel;
    }
    
    setupEventListeners() {
        // パネル制御
        document.getElementById('acp-minimize').addEventListener('click', () => {
            this.panel.classList.toggle('minimized');
            document.getElementById('acp-minimize').textContent = 
                this.panel.classList.contains('minimized') ? '+' : '−';
        });
        
        document.getElementById('acp-close').addEventListener('click', () => {
            this.panel.classList.remove('visible');
        });
        
        // マスタートグル
        const enabledToggle = document.getElementById('acp-enabled');
        enabledToggle.addEventListener('change', () => {
            this.isEnabled = enabledToggle.checked;
            document.getElementById('acp-master-toggle').classList.toggle('active', this.isEnabled);
            this.log(this.isEnabled ? '🎬 自動演出 ON' : '⏹️ 自動演出 OFF');
            
            // AIステータス更新
            const statusEl = document.getElementById('acp-ai-status');
            if (statusEl) {
                statusEl.textContent = this.isEnabled ? '🟢 文章解析中...' : 'AIで文章の意味を理解して演出を選択';
                statusEl.style.color = this.isEnabled ? '#4ecdc4' : '#888';
            }
        });
        
        // AIプロバイダー選択
        const aiProviderSelect = document.getElementById('acp-ai-provider');
        if (aiProviderSelect) {
            aiProviderSelect.addEventListener('change', () => {
                this.aiProvider = aiProviderSelect.value;
                this.log(`🤖 AI: ${this.aiProvider}`);
            });
        }
        
        // プリセットボタン
        document.querySelectorAll('.acp-preset-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const presetId = btn.dataset.preset;
                this.applyPreset(presetId);
                
                // アクティブ状態更新
                document.querySelectorAll('.acp-preset-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
            });
        });
        
        // ドラッグ
        this.setupDrag();
    }
    
    setupDrag() {
        const header = this.panel.querySelector('.acp-header');
        let isDragging = false;
        let startX, startY, startLeft, startTop;
        
        header.addEventListener('mousedown', (e) => {
            if (e.target.tagName === 'BUTTON') return;
            isDragging = true;
            startX = e.clientX;
            startY = e.clientY;
            const rect = this.panel.getBoundingClientRect();
            startLeft = rect.left;
            startTop = rect.top;
            this.panel.style.right = 'auto';
            this.panel.style.bottom = 'auto';
            this.panel.style.left = rect.left + 'px';
            this.panel.style.top = rect.top + 'px';
        });
        
        document.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            this.panel.style.left = (startLeft + e.clientX - startX) + 'px';
            this.panel.style.top = (startTop + e.clientY - startY) + 'px';
        });
        
        document.addEventListener('mouseup', () => { isDragging = false; });
    }
    
    updateStatusUI(preset) {
        const emoji = preset.name.split(' ')[0];
        const name = preset.name.split(' ').slice(1).join(' ');
        
        document.getElementById('acp-emoji').textContent = emoji;
        document.getElementById('acp-preset-name').textContent = name || preset.name;
        document.getElementById('acp-preset-desc').textContent = preset.description;
        
        // アクティブ状態更新
        document.querySelectorAll('.acp-preset-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.preset === this.currentPreset);
        });
    }
    
    log(message) {
        const logEl = document.getElementById('acp-log');
        if (!logEl) return;
        
        const time = new Date().toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' });
        const entry = document.createElement('div');
        entry.className = 'acp-log-entry';
        entry.innerHTML = `<span class="time">[${time}]</span> <span class="action">${message}</span>`;
        
        logEl.insertBefore(entry, logEl.firstChild);
        
        while (logEl.children.length > 15) {
            logEl.removeChild(logEl.lastChild);
        }
    }
    
    // ========================================
    // 公開メソッド
    // ========================================
    
    show() { this.panel.classList.add('visible'); }
    hide() { this.panel.classList.remove('visible'); }
    toggle() { this.panel.classList.toggle('visible'); }
    
    // 外部から呼び出し用
    setPreset(presetId) {
        this.applyPreset(presetId);
    }
    
    // プリセット一覧を取得（AIに渡す用）
    getPresetList() {
        return this.presetNames.map(id => ({
            id: id,
            name: this.presets[id].name,
            description: this.presets[id].description
        }));
    }
    
    // プリセット一覧をテキストで取得（プロンプト用）
    getPresetListText() {
        return Object.entries(this.presets).map(([id, p]) => 
            `${id}: ${p.name} - ${p.description}`
        ).join('\n');
    }
}

// ========================================
// 初期化
// ========================================

window.aiCinematicPresets = null;

document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        window.aiCinematicPresets = new AICinematicPresets();
        
        // キーボードショートカット: Shift+P
        document.addEventListener('keydown', (e) => {
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
            
            if (e.shiftKey && !e.ctrlKey && !e.altKey && (e.key === 'P' || e.key === 'p')) {
                e.preventDefault();
                if (window.aiCinematicPresets) {
                    window.aiCinematicPresets.toggle();
                }
            }
        });
        
        console.log('✅ AI Cinematic Presets System ready (Shift+P で表示)');
    }, 1000);
});

// エクスポート
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AICinematicPresets;
}
