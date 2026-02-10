/**
 * 🎬 AI Cinematographer - AI演出監督システム
 * 
 * アニメ・映画・漫画の演出技法を学習したAIが、
 * チャットの文脈を読み取り、最適なカメラワーク・色彩・エフェクトを自動制御
 * 
 * 参考にした演出技法:
 * - 色彩監督: シーンの感情に合わせた色彩設計
 * - 作画監督: キャラクターの演技・表情の強調
 * - コンポジット: 撮影効果、光学処理、レイヤー合成
 * - 編集: カット割り、テンポ、間の取り方
 * - 効果: SE的な視覚効果、強調表現
 * 
 * Version: 1.0.0
 */

class AICinematographer {
    constructor() {
        this.isInitialized = false;
        this.isEnabled = false;
        this.apiProvider = 'gemini'; // 'gemini' or 'chatgpt'
        
        // ========================================
        // 演出知識ベース
        // ========================================
        
        // 文脈の長さ設定（1-10）
        this.contextLength = 5;
        
        // 簡略モード
        this.briefMode = false;
        
        // 短略的モード（積極的判定）- ON: 1セリフでも積極的に判定, OFF: 慎重に判定
        this.aggressiveMode = true;

        // 会話履歴バッファ
        this.conversationBuffer = [];
        this.maxBufferSize = 20;
        
        // 現在のシーン状態
        this.currentScene = {
            mood: 'neutral',           // 感情トーン
            intensity: 0.5,            // 感情の強さ (0-1)
            genre: 'slice_of_life',    // ジャンル
            pacing: 'normal',          // テンポ
            speaker: null,             // 現在の話者
            lastSpeaker: null,         // 前の話者
            turnCount: 0               // 会話のターン数
        };
        
        // ========================================
        // 色彩監督の知識
        // ========================================
        this.colorDirectorKnowledge = {
            // 感情と色彩の対応
            emotionColors: {
                joy: { 
                    whiteBalance: 5800, tint: 5, saturation: 20, brightness: 10,
                    description: '暖色系、彩度高め、明るい' 
                },
                sadness: { 
                    whiteBalance: 6500, tint: -10, saturation: -30, brightness: -10,
                    description: '寒色系、彩度低め、暗い' 
                },
                anger: { 
                    whiteBalance: 4500, tint: 10, saturation: 30, contrast: 30,
                    description: '赤み、高コントラスト、強い色' 
                },
                fear: { 
                    whiteBalance: 7000, tint: -15, saturation: -40, brightness: -20,
                    description: '青緑、彩度低、暗い' 
                },
                surprise: { 
                    whiteBalance: 6000, tint: 0, saturation: 10, exposure: 0.3,
                    description: 'フラッシュ的な明るさ' 
                },
                love: { 
                    whiteBalance: 5200, tint: 15, saturation: 15, bloomEnabled: true,
                    description: 'ピンク寄り、ソフト、ブルーム' 
                },
                tension: { 
                    whiteBalance: 5000, tint: -5, saturation: -10, contrast: 25,
                    description: '低彩度、高コントラスト' 
                },
                relief: { 
                    whiteBalance: 5600, tint: 5, saturation: 5, brightness: 15,
                    description: '明るく、暖かみ' 
                },
                mystery: { 
                    whiteBalance: 6800, tint: -20, saturation: -25, vignetteEnabled: true,
                    description: '青紫、ビネット、不穏' 
                },
                comedy: { 
                    whiteBalance: 5500, tint: 0, saturation: 25, brightness: 15,
                    description: '明るく、彩度高め' 
                },
                neutral: { 
                    whiteBalance: 5500, tint: 0, saturation: 0, brightness: 0,
                    description: 'ニュートラル' 
                }
            },
            
            // 時間帯の色彩
            timeOfDay: {
                morning: { whiteBalance: 5800, tint: 5, saturation: 10, brightness: 10 },
                noon: { whiteBalance: 5500, tint: 0, saturation: 15, brightness: 15 },
                evening: { whiteBalance: 4500, tint: 15, saturation: 20, brightness: -5 },
                night: { whiteBalance: 7000, tint: -10, saturation: -20, brightness: -30 },
                dawn: { whiteBalance: 5000, tint: 20, saturation: 15, brightness: 5 },
                dusk: { whiteBalance: 4200, tint: 25, saturation: 25, brightness: -10 }
            }
        };
        
        // ========================================
        // 作画監督・カメラワークの知識
        // ========================================
        this.cameraKnowledge = {
            // ショットサイズと用途
            shotSizes: {
                ECU: { 
                    focalLength: 85, fStop: 1.4,
                    use: '強い感情、目線、衝撃的な瞬間' 
                },
                CU: { 
                    focalLength: 85, fStop: 1.8,
                    use: '感情表現、重要な台詞' 
                },
                MCU: { 
                    focalLength: 50, fStop: 2.0,
                    use: '通常会話、感情と状況のバランス' 
                },
                MS: { 
                    focalLength: 50, fStop: 2.8,
                    use: '標準的なシーン、ボディランゲージ' 
                },
                FS: { 
                    focalLength: 35, fStop: 4.0,
                    use: '動作全体、状況説明' 
                },
                LS: { 
                    focalLength: 24, fStop: 5.6,
                    use: '環境確立、孤独感、客観視' 
                },
                TWOSHOT: { 
                    focalLength: 35, fStop: 2.8,
                    use: '二人の関係性、対話' 
                }
            },
            
            // 感情とショットの対応
            emotionToShot: {
                joy: ['MCU', 'MS'],
                sadness: ['CU', 'LS'],
                anger: ['CU', 'ECU'],
                fear: ['ECU', 'LS'],
                surprise: ['CU', 'MCU'],
                love: ['CU', 'TWOSHOT'],
                tension: ['ECU', 'CU'],
                relief: ['MS', 'FS'],
                mystery: ['LS', 'CU'],
                comedy: ['MS', 'MCU'],
                neutral: ['MCU', 'MS']
            }
        };
        
        // ========================================
        // コンポジット・撮影効果の知識
        // ========================================
        this.compositingKnowledge = {
            // 効果とその用途
            effects: {
                bloom: {
                    use: '幸せ、夢、回想、神秘的',
                    settings: { bloomEnabled: true, bloomIntensity: 0.4 }
                },
                vignette: {
                    use: '緊張、フォーカス、ノスタルジー',
                    settings: { vignetteEnabled: true, vignetteIntensity: 0.4 }
                },
                grain: {
                    use: '回想、不安、フィルム感',
                    settings: { grainEnabled: true, grainIntensity: 0.15 }
                },
                dof: {
                    use: '感情的フォーカス、美しさ強調',
                    settings: { dofEnabled: true, bokehIntensity: 0.6 }
                },
                highContrast: {
                    use: 'ドラマチック、緊張感',
                    settings: { contrast: 30, gamma: 0.9 }
                },
                softLight: {
                    use: '優しさ、夢見心地',
                    settings: { contrast: -15, brightness: 10, bloomEnabled: true }
                },
                coldTone: {
                    use: '悲しみ、孤独、冷酷',
                    settings: { whiteBalance: 7000, saturation: -20 }
                },
                warmTone: {
                    use: '温かみ、親密さ、懐かしさ',
                    settings: { whiteBalance: 4500, saturation: 10 }
                }
            }
        };
        
        // ========================================
        // 編集・テンポの知識
        // ========================================
        this.editingKnowledge = {
            // テンポと演出変更頻度
            pacing: {
                slow: { 
                    changeInterval: 10000, // 10秒
                    description: '静かなシーン、感情的な場面' 
                },
                normal: { 
                    changeInterval: 5000, // 5秒
                    description: '通常の会話' 
                },
                fast: { 
                    changeInterval: 2000, // 2秒
                    description: '緊張感、アクション' 
                },
                veryfast: { 
                    changeInterval: 1000, // 1秒
                    description: '激しいアクション、クライマックス' 
                }
            }
        };
        
        // ========================================
        // 漫画的演出の知識
        // ========================================
        this.mangaKnowledge = {
            // コマ割りに相当する演出パターン
            panels: {
                normal: {
                    description: '通常のコマ',
                    camera: 'MS',
                    effects: []
                },
                emphasis: {
                    description: '強調コマ（大きいコマ）',
                    camera: 'CU',
                    effects: ['vignette']
                },
                shock: {
                    description: '衝撃コマ',
                    camera: 'ECU',
                    effects: ['highContrast', 'vignette'],
                    flash: true
                },
                emotional: {
                    description: '感情コマ',
                    camera: 'CU',
                    effects: ['bloom', 'dof']
                },
                establishing: {
                    description: '状況説明コマ',
                    camera: 'LS',
                    effects: []
                },
                action: {
                    description: 'アクションコマ',
                    camera: 'FS',
                    effects: ['highContrast'],
                    motionBlur: true
                }
            }
        };
        
        // ========================================
        // AIへのシステムプロンプト
        // ========================================
        this.systemPrompt = this.buildSystemPrompt();
        
        // 演出変更のデバウンス
        this.lastDirectionTime = 0;
        this.directionCooldown = 2000; // 最低2秒の間隔
        
        // 自動演出タイマー
        this.autoDirectTimer = null;
        
        this.init();
    }
    
    buildSystemPrompt() {
        return `あなたは「AI演出監督」です。アニメ、映画、漫画の演出技法に精通しています。

【あなたの役割】
- 色彩監督: シーンの感情に合わせた色彩設計
- 作画監督: キャラクターの演技・表情の強調  
- コンポジット: 撮影効果、光学処理
- 編集: カット割り、テンポ制御
- 漫画的演出: コマ割り的な視覚的強調

【入力される情報】
- 会話履歴（最新の会話内容）
- 現在の話者（キャラクターA/B、AI/ユーザー）
- 会話のターン数

【出力形式】
必ず以下のJSON形式で出力してください：
{
  "mood": "感情キーワード（joy/sadness/anger/fear/surprise/love/tension/relief/mystery/comedy/neutral）",
  "intensity": 0.0-1.0の数値（感情の強さ）,
  "shotSize": "ショットサイズ（ECU/CU/MCU/MS/FS/LS/TWOSHOT）",
  "effects": ["使用する効果の配列（bloom/vignette/grain/dof/highContrast/softLight/coldTone/warmTone）"],
  "pacing": "テンポ（slow/normal/fast/veryfast）",
  "colorAdjustments": {
    "whiteBalance": 2000-10000,
    "saturation": -100から100,
    "brightness": -100から100,
    "contrast": -100から100
  },
  "focalLength": 8-200,
  "reasoning": "判断理由（日本語で簡潔に）"
}

【演出の原則】
1. 感情の変化に敏感に反応する
2. 台詞の内容だけでなく、文脈も考慮する
3. 急激な変化は避け、自然なトランジションを心がける
4. 重要な瞬間では大胆な演出も許容する
5. 漫画的な「間」や「強調」を意識する`;
    }
    
    init() {
        this.createPanel();
        this.setupEventListeners();
        this.isInitialized = true;
        console.log('🎬 AI Cinematographer initialized');
    }
    
    createPanel() {
        const panel = document.createElement('div');
        panel.id = 'ai-cinematographer-panel';
        panel.innerHTML = `
            <style>
                #ai-cinematographer-panel {
                    position: fixed;
                    top: 10px;
                    right: 10px;
                    width: 340px;
                    max-height: 90vh;
                    background: rgba(15, 15, 25, 0.95);
                    border-radius: 12px;
                    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
                    font-family: 'Segoe UI', sans-serif;
                    font-size: 11px;
                    color: #e0e0e0;
                    z-index: 9500;
                    overflow: hidden;
                    backdrop-filter: blur(10px);
                    border: 1px solid rgba(255, 200, 100, 0.3);
                    display: none;
                }
                
                #ai-cinematographer-panel.visible {
                    display: block;
                }
                
                .aic-header {
                    background: linear-gradient(135deg, #ff6b35 0%, #f7931e 50%, #ffcc00 100%);
                    padding: 12px 14px;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    cursor: move;
                }
                
                .aic-title {
                    font-size: 13px;
                    font-weight: bold;
                    color: #1a1a2e;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                }
                
                .aic-header-btns {
                    display: flex;
                    gap: 6px;
                }
                
                .aic-header-btn {
                    background: rgba(0, 0, 0, 0.2);
                    border: none;
                    color: #1a1a2e;
                    width: 24px;
                    height: 24px;
                    border-radius: 6px;
                    cursor: pointer;
                    font-size: 12px;
                }
                
                .aic-header-btn:hover {
                    background: rgba(0, 0, 0, 0.3);
                }
                
                .aic-content {
                    max-height: calc(90vh - 50px);
                    overflow-y: auto;
                    padding: 12px;
                }
                
                .aic-section {
                    background: rgba(255, 255, 255, 0.05);
                    border-radius: 8px;
                    padding: 12px;
                    margin-bottom: 10px;
                }
                
                .aic-section-title {
                    font-size: 12px;
                    font-weight: bold;
                    color: #ffcc00;
                    margin-bottom: 10px;
                    display: flex;
                    align-items: center;
                    gap: 6px;
                }
                
                .aic-master-toggle {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    padding: 12px;
                    background: linear-gradient(135deg, rgba(255, 107, 53, 0.2) 0%, rgba(255, 204, 0, 0.2) 100%);
                    border-radius: 8px;
                    margin-bottom: 12px;
                    border: 1px solid rgba(255, 200, 100, 0.3);
                }
                
                .aic-master-toggle.active {
                    background: linear-gradient(135deg, rgba(255, 107, 53, 0.4) 0%, rgba(255, 204, 0, 0.4) 100%);
                    border-color: #ffcc00;
                }
                
                .aic-master-label {
                    font-size: 13px;
                    font-weight: bold;
                    color: #ffcc00;
                }
                
                .aic-toggle {
                    position: relative;
                    width: 50px;
                    height: 26px;
                }
                
                .aic-toggle input {
                    opacity: 0;
                    width: 0;
                    height: 0;
                }
                
                .aic-toggle-slider {
                    position: absolute;
                    cursor: pointer;
                    top: 0; left: 0; right: 0; bottom: 0;
                    background: rgba(255, 255, 255, 0.2);
                    transition: 0.3s;
                    border-radius: 26px;
                }
                
                .aic-toggle-slider:before {
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
                
                .aic-toggle input:checked + .aic-toggle-slider {
                    background: linear-gradient(135deg, #ff6b35 0%, #ffcc00 100%);
                }
                
                .aic-toggle input:checked + .aic-toggle-slider:before {
                    transform: translateX(24px);
                }
                
                .aic-row {
                    display: flex;
                    align-items: center;
                    margin-bottom: 10px;
                    gap: 10px;
                }
                
                .aic-label {
                    flex: 0 0 100px;
                    font-size: 11px;
                    color: #aaa;
                }
                
                .aic-slider-container {
                    flex: 1;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                }
                
                .aic-slider {
                    flex: 1;
                    -webkit-appearance: none;
                    height: 6px;
                    background: rgba(255, 255, 255, 0.1);
                    border-radius: 3px;
                    outline: none;
                }
                
                .aic-slider::-webkit-slider-thumb {
                    -webkit-appearance: none;
                    width: 16px;
                    height: 16px;
                    background: linear-gradient(135deg, #ff6b35 0%, #ffcc00 100%);
                    border-radius: 50%;
                    cursor: pointer;
                    border: 2px solid white;
                }
                
                .aic-value {
                    min-width: 35px;
                    text-align: center;
                    color: #ffcc00;
                    font-weight: bold;
                }
                
                .aic-select {
                    flex: 1;
                    background: rgba(0, 0, 0, 0.3);
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    color: #ffcc00;
                    padding: 6px 10px;
                    border-radius: 6px;
                    font-size: 11px;
                }
                
                .aic-checkbox-row {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    margin-bottom: 8px;
                }
                
                .aic-checkbox-row input[type="checkbox"] {
                    width: 16px;
                    height: 16px;
                    accent-color: #ffcc00;
                }
                
                .aic-checkbox-row label {
                    font-size: 11px;
                    color: #ccc;
                }
                
                .aic-status {
                    background: rgba(0, 0, 0, 0.3);
                    border-radius: 8px;
                    padding: 10px;
                    margin-top: 10px;
                }
                
                .aic-status-row {
                    display: flex;
                    justify-content: space-between;
                    margin-bottom: 6px;
                    font-size: 10px;
                }
                
                .aic-status-label {
                    color: #888;
                }
                
                .aic-status-value {
                    color: #ffcc00;
                    font-weight: bold;
                }
                
                .aic-mood-indicator {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    padding: 8px;
                    background: rgba(255, 204, 0, 0.1);
                    border-radius: 6px;
                    margin-top: 8px;
                }
                
                .aic-mood-emoji {
                    font-size: 24px;
                }
                
                .aic-mood-text {
                    flex: 1;
                }
                
                .aic-mood-name {
                    font-weight: bold;
                    color: #ffcc00;
                }
                
                .aic-mood-intensity {
                    font-size: 10px;
                    color: #888;
                }
                
                .aic-log {
                    background: rgba(0, 0, 0, 0.4);
                    border-radius: 6px;
                    padding: 8px;
                    max-height: 100px;
                    overflow-y: auto;
                    font-family: monospace;
                    font-size: 9px;
                    margin-top: 10px;
                }
                
                .aic-log-entry {
                    margin-bottom: 4px;
                    padding: 2px 0;
                    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
                }
                
                .aic-log-time {
                    color: #666;
                }
                
                .aic-log-action {
                    color: #ffcc00;
                }
                
                .aic-log-detail {
                    color: #888;
                }
                
                .aic-presets {
                    display: grid;
                    grid-template-columns: repeat(3, 1fr);
                    gap: 6px;
                    margin-top: 10px;
                }
                
                .aic-preset {
                    padding: 8px;
                    background: rgba(255, 255, 255, 0.08);
                    border: 1px solid transparent;
                    border-radius: 6px;
                    text-align: center;
                    cursor: pointer;
                    font-size: 10px;
                    transition: all 0.2s;
                }
                
                .aic-preset:hover {
                    background: rgba(255, 204, 0, 0.2);
                    border-color: rgba(255, 204, 0, 0.5);
                }
                
                .aic-preset.active {
                    background: linear-gradient(135deg, rgba(255, 107, 53, 0.4) 0%, rgba(255, 204, 0, 0.4) 100%);
                    border-color: #ffcc00;
                }
                
                .aic-preset-icon {
                    font-size: 18px;
                    display: block;
                    margin-bottom: 4px;
                }
            </style>
            
            <div class="aic-header" id="aic-drag-handle">
                <div class="aic-title">
                    <span>🎬</span>
                    <span>AI演出監督</span>
                </div>
                <div class="aic-header-btns">
                    <button class="aic-header-btn" id="aic-minimize" title="最小化">➖</button>
                    <button class="aic-header-btn" id="aic-close" title="閉じる">✕</button>
                </div>
            </div>
            
            <div class="aic-content">
                <!-- マスタートグル -->
                <div class="aic-master-toggle" id="aic-master-toggle">
                    <span class="aic-master-label">🎭 AI自動演出</span>
                    <label class="aic-toggle">
                        <input type="checkbox" id="aic-enabled">
                        <span class="aic-toggle-slider"></span>
                    </label>
                </div>
                
                <!-- API設定 -->
                <div class="aic-section">
                    <div class="aic-section-title">
                        <span>🤖</span>
                        <span>AI設定</span>
                    </div>
                    
                    <div class="aic-row">
                        <span class="aic-label">AIプロバイダ</span>
                        <select class="aic-select" id="aic-api-provider">
                            <option value="gemini">🌟 Gemini</option>
                            <option value="chatgpt">🤖 ChatGPT</option>
                        </select>
                    </div>
                    
                    <div class="aic-row">
                        <span class="aic-label">文脈の長さ</span>
                        <div class="aic-slider-container">
                            <input type="range" class="aic-slider" id="aic-context-length" min="1" max="10" value="5">
                            <span class="aic-value" id="aic-context-length-val">5</span>
                        </div>
                    </div>
                    
                    <div class="aic-checkbox-row">
                        <input type="checkbox" id="aic-brief-mode">
                        <label for="aic-brief-mode">📝 簡略モード（API呼び出し削減）</label>
                    </div>
                    
                    <div class="aic-checkbox-row">
                        <input type="checkbox" id="aic-aggressive-mode" checked>
                        <label for="aic-aggressive-mode">⚡ 短略的モード（ON: 1セリフでも積極的に判定 / OFF: 慎重に判定）</label>
                    </div>
                </div>
                
                <!-- 演出スタイル -->
                <div class="aic-section">
                    <div class="aic-section-title">
                        <span>🎨</span>
                        <span>演出スタイル</span>
                    </div>
                    
                    <div class="aic-presets" id="aic-style-presets">
                        <div class="aic-preset active" data-style="anime">
                            <span class="aic-preset-icon">🎌</span>
                            <span>アニメ</span>
                        </div>
                        <div class="aic-preset" data-style="movie">
                            <span class="aic-preset-icon">🎬</span>
                            <span>映画</span>
                        </div>
                        <div class="aic-preset" data-style="manga">
                            <span class="aic-preset-icon">📖</span>
                            <span>漫画</span>
                        </div>
                        <div class="aic-preset" data-style="drama">
                            <span class="aic-preset-icon">🎭</span>
                            <span>ドラマ</span>
                        </div>
                        <div class="aic-preset" data-style="action">
                            <span class="aic-preset-icon">💥</span>
                            <span>アクション</span>
                        </div>
                        <div class="aic-preset" data-style="romantic">
                            <span class="aic-preset-icon">💕</span>
                            <span>ロマンス</span>
                        </div>
                    </div>
                </div>
                
                <!-- 演出強度 -->
                <div class="aic-section">
                    <div class="aic-section-title">
                        <span>🎚️</span>
                        <span>演出強度</span>
                    </div>
                    
                    <div class="aic-row">
                        <span class="aic-label">色彩変化</span>
                        <div class="aic-slider-container">
                            <input type="range" class="aic-slider" id="aic-color-intensity" min="0" max="100" value="70">
                            <span class="aic-value" id="aic-color-intensity-val">70%</span>
                        </div>
                    </div>
                    
                    <div class="aic-row">
                        <span class="aic-label">カメラワーク</span>
                        <div class="aic-slider-container">
                            <input type="range" class="aic-slider" id="aic-camera-intensity" min="0" max="100" value="70">
                            <span class="aic-value" id="aic-camera-intensity-val">70%</span>
                        </div>
                    </div>
                    
                    <div class="aic-row">
                        <span class="aic-label">エフェクト</span>
                        <div class="aic-slider-container">
                            <input type="range" class="aic-slider" id="aic-effect-intensity" min="0" max="100" value="50">
                            <span class="aic-value" id="aic-effect-intensity-val">50%</span>
                        </div>
                    </div>
                </div>
                
                <!-- 現在の状態 -->
                <div class="aic-section">
                    <div class="aic-section-title">
                        <span>📊</span>
                        <span>現在の演出状態</span>
                    </div>
                    
                    <div class="aic-mood-indicator" id="aic-mood-indicator">
                        <span class="aic-mood-emoji" id="aic-mood-emoji">😊</span>
                        <div class="aic-mood-text">
                            <div class="aic-mood-name" id="aic-mood-name">ニュートラル</div>
                            <div class="aic-mood-intensity" id="aic-mood-intensity">強度: 50%</div>
                        </div>
                    </div>
                    
                    <div class="aic-status">
                        <div class="aic-status-row">
                            <span class="aic-status-label">ショットサイズ</span>
                            <span class="aic-status-value" id="aic-current-shot">MCU</span>
                        </div>
                        <div class="aic-status-row">
                            <span class="aic-status-label">焦点距離</span>
                            <span class="aic-status-value" id="aic-current-focal">50mm</span>
                        </div>
                        <div class="aic-status-row">
                            <span class="aic-status-label">テンポ</span>
                            <span class="aic-status-value" id="aic-current-pacing">通常</span>
                        </div>
                        <div class="aic-status-row">
                            <span class="aic-status-label">アクティブ効果</span>
                            <span class="aic-status-value" id="aic-current-effects">なし</span>
                        </div>
                    </div>
                </div>
                
                <!-- ログ -->
                <div class="aic-section">
                    <div class="aic-section-title">
                        <span>📜</span>
                        <span>演出ログ</span>
                    </div>
                    <div class="aic-log" id="aic-log">
                        <div class="aic-log-entry">
                            <span class="aic-log-time">[--:--:--]</span>
                            <span class="aic-log-action">待機中...</span>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(panel);
        this.panel = panel;
    }
    
    setupEventListeners() {
        // ドラッグ機能
        this.setupDrag();
        
        // 閉じる・最小化
        document.getElementById('aic-close').addEventListener('click', () => this.hide());
        document.getElementById('aic-minimize').addEventListener('click', () => this.toggleMinimize());
        
        // マスタートグル
        const enabledToggle = document.getElementById('aic-enabled');
        enabledToggle.addEventListener('change', () => {
            this.isEnabled = enabledToggle.checked;
            document.getElementById('aic-master-toggle').classList.toggle('active', this.isEnabled);
            
            if (this.isEnabled) {
                this.start();
            } else {
                this.stop();
            }
            
            this.log(this.isEnabled ? '🎬 AI演出開始' : '⏹️ AI演出停止');
        });
        
        // APIプロバイダ
        document.getElementById('aic-api-provider').addEventListener('change', (e) => {
            this.apiProvider = e.target.value;
            this.log(`🤖 API: ${this.apiProvider}`);
        });
        
        // 文脈の長さ
        const contextSlider = document.getElementById('aic-context-length');
        const contextVal = document.getElementById('aic-context-length-val');
        contextSlider.addEventListener('input', () => {
            this.contextLength = parseInt(contextSlider.value);
            contextVal.textContent = this.contextLength;
        });
        
        // 簡略モード
        document.getElementById('aic-brief-mode').addEventListener('change', (e) => {
            this.briefMode = e.target.checked;
            this.log(`📝 簡略モード: ${this.briefMode ? 'ON' : 'OFF'}`);
        });
        
        // 短略的モード
        document.getElementById('aic-aggressive-mode').addEventListener('change', (e) => {
            this.aggressiveMode = e.target.checked;
            this.log(`⚡ 短略的モード: ${this.aggressiveMode ? 'ON (積極的)' : 'OFF (慎重)'}`);
        });
        
        // 演出スタイル
        document.querySelectorAll('#aic-style-presets .aic-preset').forEach(preset => {
            preset.addEventListener('click', () => {
                document.querySelectorAll('#aic-style-presets .aic-preset').forEach(p => p.classList.remove('active'));
                preset.classList.add('active');
                this.currentScene.genre = preset.dataset.style;
                this.log(`🎨 スタイル: ${preset.dataset.style}`);
            });
        });
        
        // 強度スライダー
        this.setupIntensitySlider('color-intensity');
        this.setupIntensitySlider('camera-intensity');
        this.setupIntensitySlider('effect-intensity');
        
        // 会話監視のセットアップ
        this.setupConversationListener();
    }
    
    setupIntensitySlider(id) {
        const slider = document.getElementById(`aic-${id}`);
        const val = document.getElementById(`aic-${id}-val`);
        
        slider.addEventListener('input', () => {
            val.textContent = `${slider.value}%`;
        });
    }
    
    setupDrag() {
        const handle = document.getElementById('aic-drag-handle');
        let isDragging = false;
        let startX, startY, startLeft, startTop;
        
        handle.addEventListener('mousedown', (e) => {
            if (e.target.closest('.aic-header-btn')) return;
            isDragging = true;
            startX = e.clientX;
            startY = e.clientY;
            const rect = this.panel.getBoundingClientRect();
            startLeft = rect.left;
            startTop = rect.top;
        });
        
        document.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            this.panel.style.left = `${startLeft + e.clientX - startX}px`;
            this.panel.style.top = `${startTop + e.clientY - startY}px`;
            this.panel.style.right = 'auto';
        });
        
        document.addEventListener('mouseup', () => {
            isDragging = false;
        });
    }
    
    setupConversationListener() {
        // チャットメッセージを監視
        // window.addEventListener を使って、カスタムイベントを監視
        window.addEventListener('chatMessage', (e) => {
            if (this.isEnabled) {
                this.onNewMessage(e.detail);
            }
        });
        
        // 既存のチャットシステムとの統合
        // 定期的にチャット履歴をチェック
        setInterval(() => {
            if (this.isEnabled) {
                this.checkChatHistory();
            }
        }, 1000);
    }
    
    checkChatHistory() {
        // チャット履歴要素を探す
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
        
        // 話者の更新
        this.currentScene.lastSpeaker = this.currentScene.speaker;
        this.currentScene.speaker = message.sender;
        this.currentScene.turnCount++;
        
        // クールダウンチェック
        const now = Date.now();
        if (now - this.lastDirectionTime < this.directionCooldown) {
            return;
        }
        this.lastDirectionTime = now;
        
        // AI演出判断を実行
        await this.analyzeAndDirect();
    }
    
    async analyzeAndDirect() {
        try {
            // 文脈を取得
            const context = this.getContextMessages();
            
            if (this.briefMode) {
                // 簡略モード: ローカルで簡易判断
                this.localAnalysis(context);
            } else {
                // フルモード: AIに問い合わせ
                const direction = await this.getAIDirection(context);
                if (direction) {
                    this.applyDirection(direction);
                }
            }
        } catch (error) {
            console.error('AI Cinematographer error:', error);
            this.log(`❌ エラー: ${error.message}`);
        }
    }
    
    getContextMessages() {
        // 文脈の長さに基づいてメッセージを取得
        const count = Math.min(this.contextLength, this.conversationBuffer.length);
        return this.conversationBuffer.slice(-count);
    }
    
    localAnalysis(context) {
        // 簡略モード: キーワードベースの簡易分析
        const lastMessage = context[context.length - 1];
        if (!lastMessage) return;
        
        const text = lastMessage.text.toLowerCase();
        
        // 感情キーワード検出
        let mood = 'neutral';
        let intensity = 0.5;
        
        const moodKeywords = {
            joy: ['嬉しい', '楽しい', 'うれしい', 'たのしい', '幸せ', 'ハッピー', '笑', 'わーい', 'やったー', '！！'],
            sadness: ['悲しい', 'かなしい', '辛い', 'つらい', '寂しい', 'さみしい', '泣', '😢', '😭'],
            anger: ['怒', 'むかつく', 'イライラ', 'ふざけるな', '許さない', '💢'],
            fear: ['怖い', 'こわい', '恐ろしい', '不安', 'ヤバい', 'やばい'],
            surprise: ['え！', 'えっ', 'びっくり', '驚', 'まさか', 'うそ', '！？'],
            love: ['好き', '愛', 'すき', '大好き', 'だいすき', '💕', '❤'],
            tension: ['緊張', 'ドキドキ', 'ハラハラ', '大変', '急いで'],
            mystery: ['謎', '不思議', '怪しい', '何か', 'なぜ']
        };
        
        for (const [moodType, keywords] of Object.entries(moodKeywords)) {
            for (const keyword of keywords) {
                if (text.includes(keyword)) {
                    mood = moodType;
                    intensity = 0.7;
                    break;
                }
            }
            if (mood !== 'neutral') break;
        }
        
        // 感嘆符の数で強度を調整
        const exclamationCount = (text.match(/！|!/g) || []).length;
        if (exclamationCount > 0) {
            intensity = Math.min(1.0, intensity + exclamationCount * 0.1);
        }
        
        // ショットサイズを決定
        const shots = this.cameraKnowledge.emotionToShot[mood] || ['MCU'];
        const shotSize = shots[Math.floor(Math.random() * shots.length)];
        
        // 演出を適用
        const direction = {
            mood: mood,
            intensity: intensity,
            shotSize: shotSize,
            effects: intensity > 0.7 ? ['vignette'] : [],
            pacing: intensity > 0.8 ? 'fast' : 'normal',
            colorAdjustments: this.colorDirectorKnowledge.emotionColors[mood] || {},
            focalLength: this.cameraKnowledge.shotSizes[shotSize]?.focalLength || 50,
            reasoning: `ローカル分析: ${mood} (${Math.round(intensity * 100)}%)`
        };
        
        this.applyDirection(direction);
    }
    
    async getAIDirection(context) {
        // コンテキストをフォーマット
        const contextText = context.map((msg, i) => 
            `[${msg.sender === 'ai' ? 'AI' : 'ユーザー'}]: ${msg.text}`
        ).join('\n');
        
        const prompt = `以下の会話の最新の流れを分析し、最適な演出を決定してください。

【会話】
${contextText}

【現在の状況】
- ターン数: ${this.currentScene.turnCount}
- 前の話者: ${this.currentScene.lastSpeaker || 'なし'}
- 現在の話者: ${this.currentScene.speaker}
- ジャンル: ${this.currentScene.genre}

JSON形式で演出指示を出力してください。`;

        try {
            let response;
            
            if (this.apiProvider === 'gemini') {
                response = await this.callGeminiAPI(prompt);
            } else {
                response = await this.callChatGPTAPI(prompt);
            }
            
            // JSONを抽出
            const jsonMatch = response.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                return JSON.parse(jsonMatch[0]);
            }
            
            return null;
        } catch (error) {
            console.error('API call error:', error);
            this.log(`❌ API呼び出しエラー`);
            
            // フォールバック: ローカル分析
            this.localAnalysis(context);
            return null;
        }
    }
    
    async callGeminiAPI(prompt) {
        // Gemini APIを呼び出し
        if (!window.geminiClient && !window.GeminiClient) {
            throw new Error('Gemini client not available');
        }
        
        const client = window.geminiClient || new window.GeminiClient();
        const fullPrompt = this.systemPrompt + '\n\n' + prompt;
        
        // 既存のgemini-clientを使用
        const response = await client.chat(fullPrompt, {
            maxTokens: 500,
            temperature: 0.7
        });
        
        return response;
    }
    
    async callChatGPTAPI(prompt) {
        // ChatGPT APIを呼び出し
        if (!window.chatGPTClient && !window.ChatGPTClient) {
            throw new Error('ChatGPT client not available');
        }
        
        const client = window.chatGPTClient || new window.ChatGPTClient();
        
        const response = await client.chat([
            { role: 'system', content: this.systemPrompt },
            { role: 'user', content: prompt }
        ], {
            maxTokens: 500,
            temperature: 0.7
        });
        
        return response;
    }
    
    applyDirection(direction) {
        // 強度係数を取得
        const colorIntensity = parseInt(document.getElementById('aic-color-intensity')?.value || 70) / 100;
        const cameraIntensity = parseInt(document.getElementById('aic-camera-intensity')?.value || 70) / 100;
        const effectIntensity = parseInt(document.getElementById('aic-effect-intensity')?.value || 50) / 100;
        
        // 現在のシーン状態を更新
        this.currentScene.mood = direction.mood;
        this.currentScene.intensity = direction.intensity;
        this.currentScene.pacing = direction.pacing;
        
        // カメラエフェクトパネルに適用
        if (window.cameraEffectsPanel) {
            const settings = window.cameraEffectsPanel.settings;
            
            // 色彩調整を適用（強度を考慮）
            if (direction.colorAdjustments) {
                const ca = direction.colorAdjustments;
                
                if (ca.whiteBalance !== undefined) {
                    const diff = ca.whiteBalance - 5500;
                    settings.whiteBalance = 5500 + diff * colorIntensity;
                }
                if (ca.saturation !== undefined) {
                    settings.saturation = ca.saturation * colorIntensity;
                }
                if (ca.brightness !== undefined) {
                    settings.brightness = ca.brightness * colorIntensity;
                }
                if (ca.contrast !== undefined) {
                    settings.contrast = ca.contrast * colorIntensity;
                }
                if (ca.tint !== undefined) {
                    settings.tint = ca.tint * colorIntensity;
                }
            }
            
            // 焦点距離を適用
            if (direction.focalLength) {
                const defaultFocal = 50;
                const diff = direction.focalLength - defaultFocal;
                settings.focalLength = defaultFocal + diff * cameraIntensity;
            }
            
            // エフェクトを適用
            if (direction.effects && direction.effects.length > 0) {
                direction.effects.forEach(effect => {
                    switch (effect) {
                        case 'bloom':
                            settings.bloomEnabled = effectIntensity > 0.3;
                            settings.bloomIntensity = 0.4 * effectIntensity;
                            break;
                        case 'vignette':
                            settings.vignetteEnabled = effectIntensity > 0.3;
                            settings.vignetteIntensity = 0.4 * effectIntensity;
                            break;
                        case 'grain':
                            settings.grainEnabled = effectIntensity > 0.3;
                            settings.grainIntensity = 0.15 * effectIntensity;
                            break;
                        case 'dof':
                            settings.dofEnabled = effectIntensity > 0.3;
                            settings.bokehIntensity = 0.5 * effectIntensity;
                            break;
                    }
                });
            }
            
            // UIと効果を更新
            window.cameraEffectsPanel.updateUIFromSettings();
            window.cameraEffectsPanel.applyEffects();
        }
        
        // UI更新
        this.updateStatusUI(direction);
        
        // ログ
        this.log(`🎬 ${direction.mood} (${Math.round(direction.intensity * 100)}%) → ${direction.shotSize}`);
    }
    
    updateStatusUI(direction) {
        // ムードインジケーター
        const moodEmojis = {
            joy: '😊', sadness: '😢', anger: '😠', fear: '😨',
            surprise: '😲', love: '🥰', tension: '😰', relief: '😌',
            mystery: '🤔', comedy: '😄', neutral: '😐'
        };
        
        const moodNames = {
            joy: '喜び', sadness: '悲しみ', anger: '怒り', fear: '恐怖',
            surprise: '驚き', love: '愛情', tension: '緊張', relief: '安堵',
            mystery: '謎', comedy: 'コメディ', neutral: 'ニュートラル'
        };
        
        const pacingNames = {
            slow: 'ゆっくり', normal: '通常', fast: '速い', veryfast: '非常に速い'
        };
        
        document.getElementById('aic-mood-emoji').textContent = moodEmojis[direction.mood] || '😐';
        document.getElementById('aic-mood-name').textContent = moodNames[direction.mood] || 'ニュートラル';
        document.getElementById('aic-mood-intensity').textContent = `強度: ${Math.round(direction.intensity * 100)}%`;
        
        document.getElementById('aic-current-shot').textContent = direction.shotSize || 'MCU';
        document.getElementById('aic-current-focal').textContent = `${Math.round(direction.focalLength || 50)}mm`;
        document.getElementById('aic-current-pacing').textContent = pacingNames[direction.pacing] || '通常';
        document.getElementById('aic-current-effects').textContent = 
            direction.effects?.length > 0 ? direction.effects.join(', ') : 'なし';
    }
    
    log(message) {
        const logContainer = document.getElementById('aic-log');
        if (!logContainer) return;
        
        const time = new Date().toLocaleTimeString('ja-JP', { hour12: false });
        const entry = document.createElement('div');
        entry.className = 'aic-log-entry';
        entry.innerHTML = `
            <span class="aic-log-time">[${time}]</span>
            <span class="aic-log-action">${message}</span>
        `;
        
        logContainer.insertBefore(entry, logContainer.firstChild);
        
        // 古いエントリを削除
        while (logContainer.children.length > 20) {
            logContainer.removeChild(logContainer.lastChild);
        }
    }
    
    start() {
        this.isEnabled = true;
        this.log('🎬 AI演出監督を開始');
        
        // 会話監視開始
        this.conversationBuffer = [];
        this.currentScene.turnCount = 0;
    }
    
    stop() {
        this.isEnabled = false;
        this.log('⏹️ AI演出監督を停止');
        
        // 設定をリセット
        if (window.cameraEffectsPanel) {
            window.cameraEffectsPanel.applyPreset('natural');
        }
    }
    
    show() {
        this.panel.classList.add('visible');
    }
    
    hide() {
        this.panel.classList.remove('visible');
    }
    
    toggle() {
        this.panel.classList.toggle('visible');
    }
    
    toggleMinimize() {
        this.panel.classList.toggle('minimized');
    }
    
    // 外部から演出をトリガー
    triggerDirection(mood, intensity = 0.7) {
        const direction = {
            mood: mood,
            intensity: intensity,
            shotSize: this.cameraKnowledge.emotionToShot[mood]?.[0] || 'MCU',
            effects: intensity > 0.7 ? ['vignette'] : [],
            pacing: intensity > 0.8 ? 'fast' : 'normal',
            colorAdjustments: this.colorDirectorKnowledge.emotionColors[mood] || {},
            focalLength: this.cameraKnowledge.shotSizes[
                this.cameraKnowledge.emotionToShot[mood]?.[0] || 'MCU'
            ]?.focalLength || 50,
            reasoning: `手動トリガー: ${mood}`
        };
        
        this.applyDirection(direction);
    }
    
    // チャットメッセージを手動で追加（外部連携用）
    addMessage(text, sender = 'user') {
        this.onNewMessage({
            text: text,
            sender: sender,
            timestamp: Date.now()
        });
    }
}

// グローバルインスタンス
window.aiCinematographer = null;

// 初期化
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        window.aiCinematographer = new AICinematographer();
        console.log('✅ AI Cinematographer ready');
        
        // AI演出監督ボタンのイベントリスナー
        const aiCinemaBtn = document.getElementById('ai-cinematographer-btn');
        if (aiCinemaBtn) {
            aiCinemaBtn.addEventListener('click', () => {
                if (window.aiCinematographer) {
                    window.aiCinematographer.toggle();
                }
            });
            console.log('✅ AI演出監督ボタン セットアップ完了');
        }
    }, 800);
});

// ショートカットキー: Shift+D でトグル
document.addEventListener('keydown', (e) => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
    
    if (e.shiftKey && !e.ctrlKey && !e.altKey && (e.key === 'D' || e.key === 'd')) {
        e.preventDefault();
        if (window.aiCinematographer) {
            window.aiCinematographer.toggle();
            console.log('🎬 AI演出監督パネル トグル (Shift+D)');
        }
    }
});

// エクスポート
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AICinematographer;
}
