// ========================================
// 🌍 AI背景パイプライン先読み生成システム v1.0
// 想像ワイプ3.1の先読み監視の要領で
// パイプラインから先読みして背景を生成
// 音声再生とオンタイムで背景を変更
// ========================================

console.log('🌍 AI背景パイプライン先読み v1.0 を読み込み中...');

class AIBackgroundPipelinePrefetch {
    constructor() {
        // ========================================
        // パイプライン先読み用の状態管理
        // ========================================
        this.backgroundCache = new Map(); // entryId → { imageUrl, prompt, scene, status }
        this.currentPlayingEntryId = null;
        this.pipelineCheckInterval = null;
        this.lastPipelineState = null;
        
        // 先読み生成モード
        this.prefetchEnabled = false;
        this.isGenerating = false;
        this.generationQueue = [];
        
        // 設定
        this.config = {
            checkInterval: 200,         // パイプラインチェック間隔(ms)
            maxCacheSize: 10,           // キャッシュ最大件数
            cacheExpireTime: 120000,    // キャッシュ有効期限(ms)
            minTextLength: 10,          // 背景生成に必要な最低テキスト長
            transitionDuration: 500     // 背景切り替えトランジション時間(ms)
        };
        
        // APIキー
        this.geminiApiKey = null;
        
        // シーン検出用キーワード（ai-background-generator.jsと同じ）
        this.keywordToScene = {
            // 場所
            '海': 'beach', 'ビーチ': 'beach', '砂浜': 'beach', '浜辺': 'beach',
            '森': 'forest', '林': 'forest', '自然': 'forest',
            '山': 'mountain', '登山': 'mountain', 'ハイキング': 'mountain',
            '庭': 'garden', '公園': 'garden', '花': 'garden',
            '夕日': 'sunset', '夕焼け': 'sunset', '日没': 'sunset',
            '星': 'night_sky', '夜空': 'night_sky', '星空': 'night_sky', 'オーロラ': 'night_sky',
            '都市': 'city', '街': 'city', 'ビル': 'city',
            '東京': 'tokyo', '渋谷': 'tokyo', '秋葉原': 'tokyo', '新宿': 'tokyo',
            'カフェ': 'cafe', '喫茶店': 'cafe', 'コーヒー': 'cafe',
            '部屋': 'room', '家': 'room', 'リビング': 'room',
            '教室': 'classroom', '学校': 'classroom', '授業': 'classroom',
            '駅': 'station', '電車': 'station', 'ホーム': 'station',
            '城': 'castle', 'お城': 'castle', '王国': 'castle',
            '宇宙': 'space', '惑星': 'space', 'ロケット': 'space', 'SF': 'space',
            '海中': 'underwater', '海底': 'underwater', 'サンゴ': 'underwater', '魚': 'underwater',
            'ファンタジー': 'fantasy', '魔法': 'fantasy', '冒険': 'fantasy',
            // 感情
            '嬉しい': 'happy', '楽しい': 'happy', 'わーい': 'happy', 'やったー': 'happy',
            '悲しい': 'sad', '寂しい': 'sad', '辛い': 'sad', '泣く': 'sad',
            '穏やか': 'calm', 'リラックス': 'calm', '癒し': 'calm', '落ち着く': 'calm',
            '元気': 'energetic', 'テンション': 'energetic', '盛り上がる': 'energetic',
            'ロマンチック': 'romantic', '恋': 'romantic', 'デート': 'romantic',
            '神秘的': 'mysterious', '謎': 'mysterious', '不思議': 'mysterious'
        };
        
        // シーン→プロンプト変換用
        this.sceneToPrompt = {
            'beach': '360度パノラマ、美しいトロピカルビーチ、ターコイズブルーの海、白い砂浜、ヤシの木、青い空',
            'forest': '360度パノラマ、神秘的な森の中、木漏れ日、緑豊かな木々、苔むした地面',
            'mountain': '360度パノラマ、雄大な山岳風景、雪をかぶった峰々、澄んだ青空',
            'ocean': '360度パノラマ、広大な海、水平線、穏やかな波、青い海と空',
            'garden': '360度パノラマ、日本庭園、桜の木、池、石灯籠、緑の苔',
            'sunset': '360度パノラマ、美しい夕焼け、オレンジと紫のグラデーション',
            'night_sky': '360度パノラマ、満天の星空、天の川、オーロラ、月明かり',
            'city': '360度パノラマ、近未来的な都市、高層ビル群、ネオンライト、夜景',
            'tokyo': '360度パノラマ、東京の街並み、渋谷スクランブル交差点風、ネオン看板',
            'cafe': '360度パノラマ、おしゃれなカフェ内装、温かい照明、木製家具',
            'room': '360度パノラマ、モダンな部屋、大きな窓、日差し、観葉植物',
            'classroom': '360度パノラマ、日本の教室、机と椅子、黒板、窓からの光',
            'station': '360度パノラマ、日本の駅ホーム、電車、人々、夕暮れ',
            'fantasy': '360度パノラマ、ファンタジーの世界、浮遊する島々、魔法の光',
            'castle': '360度パノラマ、中世のお城、石造りの壁、旗、青空',
            'space': '360度パノラマ、宇宙空間、地球、星々、銀河、宇宙船',
            'underwater': '360度パノラマ、海中世界、サンゴ礁、熱帯魚、光の筋',
            'happy': '360度パノラマ、明るく楽しい公園、花々、青空、暖かい日差し',
            'sad': '360度パノラマ、雨の日の街角、街灯、濡れた路面、ブルートーン',
            'calm': '360度パノラマ、静かな湖畔、朝もや、穏やかな水面',
            'energetic': '360度パノラマ、コンサート会場、ステージライト、カラフルな照明',
            'romantic': '360度パノラマ、パリの夜景、エッフェル塔、イルミネーション',
            'mysterious': '360度パノラマ、霧に包まれた古い図書館、キャンドルの光',
            'neutral': '360度パノラマ、シンプルなスタジオ背景、グラデーション'
        };
        
        this.init();
    }
    
    init() {
        this.loadApiKey();
        this.createUI();
        this.setupEventListeners();
        this.loadSettings();
        console.log('✅ AI背景パイプライン先読み v1.0 初期化完了');
    }
    
    loadApiKey() {
        try {
            // AI背景生成パネルのAPIキーを共有
            const dedicated = localStorage.getItem('aibg-gemini-api-key');
            if (dedicated) {
                this.geminiApiKey = dedicated;
                console.log('🔑 背景先読み: APIキー読み込み完了');
                return;
            }
            
            const saved = localStorage.getItem('vrm-ai-viewer-api-settings');
            if (saved) {
                const settings = JSON.parse(saved);
                this.geminiApiKey = settings.gemini_api_key || null;
            }
        } catch (e) {
            console.warn('⚠️ APIキー読み込みエラー');
        }
    }
    
    // ========================================
    // UI作成
    // ========================================
    createUI() {
        // AI背景パネルに先読みモードのトグルを追加
        const panel = document.getElementById('ai-background-panel');
        if (!panel) {
            console.log('📌 AI背景パネルがまだない、後で追加');
            setTimeout(() => this.createUI(), 2000);
            return;
        }
        
        // 既存の自動生成セクションを探す
        const autoSection = panel.querySelector('.aibg-section:has(#aibg-auto-generate)');
        if (!autoSection) {
            console.log('📌 自動生成セクションが見つからない');
            setTimeout(() => this.createUI(), 2000);
            return;
        }
        
        // 先読みモードUI挿入
        const prefetchUI = document.createElement('div');
        prefetchUI.className = 'aibg-prefetch-section';
        prefetchUI.innerHTML = `
            <div style="margin-top: 12px; padding-top: 10px; border-top: 1px dashed #ccc;">
                <div class="aibg-section-label" style="color: #9c27b0;">🔮 会話自動背景先読み生成モード</div>
                <div class="aibg-auto-toggle">
                    <label class="aibg-toggle-switch">
                        <input type="checkbox" id="aibg-prefetch-enable">
                        <span class="aibg-toggle-slider" style="background: linear-gradient(135deg, #9c27b0 0%, #e040fb 100%) !important;"></span>
                    </label>
                    <span class="aibg-toggle-label">パイプライン先読み＆音声シンクロ</span>
                </div>
                <div class="aibg-prefetch-info" style="font-size: 9px; color: #888; margin-top: 6px; padding: 6px; background: #f3e5f5; border-radius: 4px;">
                    💡 会話パイプラインを監視し、LLM生成中に背景を先読み生成。<br>
                    音声再生開始時にシンクロして背景を切り替えます。
                </div>
                <div class="aibg-prefetch-status" id="aibg-prefetch-status" style="margin-top: 8px; display: none;">
                    <div style="display: flex; align-items: center; gap: 6px; padding: 6px; background: #e8f5e9; border-radius: 4px; font-size: 10px;">
                        <span id="aibg-prefetch-indicator">🟢</span>
                        <span id="aibg-prefetch-status-text">監視中</span>
                    </div>
                    <div id="aibg-prefetch-cache-info" style="font-size: 9px; color: #666; margin-top: 4px;">
                        キャッシュ: 0件
                    </div>
                </div>
            </div>
        `;
        
        autoSection.appendChild(prefetchUI);
        
        // イベントリスナー
        document.getElementById('aibg-prefetch-enable').addEventListener('change', (e) => {
            this.setPrefetchEnabled(e.target.checked);
        });
        
        console.log('✅ 先読みモードUI追加完了');
    }
    
    // ========================================
    // パイプライン監視
    // ========================================
    startPipelineMonitoring() {
        if (this.pipelineCheckInterval) {
            clearInterval(this.pipelineCheckInterval);
        }
        
        this.pipelineCheckInterval = setInterval(() => {
            if (!this.prefetchEnabled) return;
            this.checkPipelineAndPrefetch();
        }, this.config.checkInterval);
        
        // イベントリスナーも追加
        window.addEventListener('multichar:pipelineUpdate', () => {
            if (this.prefetchEnabled) {
                this.checkPipelineAndPrefetch();
            }
        });
        
        // 再生開始イベント
        window.addEventListener('playbackStart', (e) => {
            if (this.prefetchEnabled && e.detail) {
                this.onPlaybackStart(e.detail);
            }
        });
        
        // 再生終了イベント
        window.addEventListener('playbackEnd', (e) => {
            if (this.prefetchEnabled && e.detail) {
                this.onPlaybackEnd(e.detail);
            }
        });
        
        // multichar:turnStartイベントでも切り替え
        window.addEventListener('multichar:turnStart', (e) => {
            if (this.prefetchEnabled && e.detail) {
                this.onTurnStart(e.detail);
            }
        });
        
        console.log('📊 パイプライン監視を開始');
        this.updateStatusUI('🟢', '監視中');
    }
    
    stopPipelineMonitoring() {
        if (this.pipelineCheckInterval) {
            clearInterval(this.pipelineCheckInterval);
            this.pipelineCheckInterval = null;
        }
        console.log('📊 パイプライン監視を停止');
        this.updateStatusUI('⚪', '停止中');
    }
    
    // パイプラインをチェックして背景を先読み生成
    checkPipelineAndPrefetch() {
        const director = window.multiCharManager?.director;
        if (!director || !director.pipeline) return;
        
        const pipeline = director.pipeline;
        
        for (const entry of pipeline) {
            const entryId = this.getEntryId(entry);
            
            // すでにキャッシュにある場合
            if (this.backgroundCache.has(entryId)) {
                const cached = this.backgroundCache.get(entryId);
                
                // playing になったら背景表示
                if (entry.status === 'playing' && cached.status !== 'displayed') {
                    this.displayCachedBackground(entryId, entry);
                }
                continue;
            }
            
            // generating または synthesizing で responseText がある場合、背景生成開始
            if ((entry.status === 'generating' || entry.status === 'synthesizing' || entry.status === 'ready') 
                && entry.responseText && entry.responseText.length >= this.config.minTextLength) {
                
                // キャッシュにプレースホルダーを追加（重複生成防止）
                this.backgroundCache.set(entryId, {
                    imageUrl: null,
                    prompt: null,
                    scene: null,
                    status: 'generating',
                    speakerName: entry.speakerName,
                    createdAt: Date.now()
                });
                
                // 非同期で背景生成
                this.prefetchBackgroundForEntry(entryId, entry.responseText, entry.speakerName);
            }
        }
        
        // 古いキャッシュをクリーンアップ
        this.cleanupOldCache();
        
        // キャッシュ情報更新
        this.updateCacheInfo();
    }
    
    getEntryId(entry) {
        return `bg_${entry.speakerId}_${entry.createdAt}`;
    }
    
    // ========================================
    // 先読み背景生成
    // ========================================
    async prefetchBackgroundForEntry(entryId, text, speakerName) {
        console.log(`🎨 [先読み] ${speakerName}の背景を先行生成開始...`);
        
        if (!this.geminiApiKey) {
            console.warn('⚠️ Gemini APIキーがありません');
            this.updateCacheStatus(entryId, 'error');
            return;
        }
        
        try {
            this.updateStatusUI('🟡', `${speakerName}の背景生成中...`);
            
            // テキストからシーンを検出
            const sceneResult = this.detectSceneFromText(text);
            let scene = sceneResult.scene || 'neutral';
            let prompt = this.sceneToPrompt[scene] || this.sceneToPrompt['neutral'];
            
            // 会話内容でプロンプトを補強
            const enhancedPrompt = await this.enhancePromptWithContext(text, prompt);
            
            console.log(`🎨 [先読み] シーン: ${scene}, プロンプト: ${enhancedPrompt.substring(0, 50)}...`);
            
            // 背景画像生成
            const imageUrl = await this.generateBackgroundImage(enhancedPrompt);
            
            if (imageUrl) {
                // キャッシュを更新
                const cached = this.backgroundCache.get(entryId);
                if (cached) {
                    cached.imageUrl = imageUrl;
                    cached.prompt = enhancedPrompt;
                    cached.scene = scene;
                    cached.status = 'ready';
                    console.log(`✅ [先読み] ${speakerName}の背景準備完了！`);
                }
                
                this.updateStatusUI('🟢', '監視中');
            }
        } catch (error) {
            console.error(`❌ [先読み] 背景生成エラー:`, error);
            this.updateCacheStatus(entryId, 'error');
            this.updateStatusUI('🔴', 'エラー発生');
        }
    }
    
    // テキストからシーンを検出
    detectSceneFromText(text) {
        for (const [keyword, scene] of Object.entries(this.keywordToScene)) {
            if (text.includes(keyword)) {
                return { scene, keyword };
            }
        }
        return { scene: null, keyword: null };
    }
    
    // プロンプトを会話文脈で補強
    async enhancePromptWithContext(text, basePrompt) {
        // 簡易版: テキストの雰囲気を反映
        let mood = '';
        
        if (text.match(/[！!]{2,}|わーい|やった|嬉しい|楽しい/)) {
            mood = '、明るく活気のある雰囲気';
        } else if (text.match(/悲しい|寂しい|辛い|泣/)) {
            mood = '、メランコリックな雰囲気';
        } else if (text.match(/怖い|不気味|恐ろしい/)) {
            mood = '、不気味で緊張感のある雰囲気';
        } else if (text.match(/穏やか|落ち着|リラックス/)) {
            mood = '、穏やかで平和な雰囲気';
        }
        
        return basePrompt + mood + '、高解像度、フォトリアリスティック';
    }
    
    // 背景画像生成
    async generateBackgroundImage(prompt) {
        this.isGenerating = true;
        
        try {
            // Gemini 2.0 Flash Experimental で画像生成
            const requestBody = {
                contents: [{
                    parts: [{
                        text: `Generate a 360-degree equirectangular panorama image.
                        
Style: Ultra high quality, extremely detailed, seamless panorama

Scene description:
${prompt}

IMPORTANT REQUIREMENTS:
1. The image MUST be in equirectangular format suitable for 360-degree viewing
2. The left and right edges MUST connect seamlessly
3. Maximum detail and clarity`
                    }]
                }],
                generationConfig: {
                    responseModalities: ['TEXT', 'IMAGE'],
                    responseMimeType: 'text/plain'
                }
            };
            
            const response = await fetch(
                `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${this.geminiApiKey}`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(requestBody)
                }
            );
            
            const data = await response.json();
            
            if (data.error) {
                throw new Error(data.error.message);
            }
            
            // 画像データを抽出
            if (data.candidates && data.candidates[0] && data.candidates[0].content) {
                const parts = data.candidates[0].content.parts;
                for (const part of parts) {
                    if (part.inlineData && part.inlineData.mimeType?.startsWith('image/')) {
                        return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
                    }
                }
            }
            
            // 画像が生成されなかった場合、Imagen APIを試す
            return await this.generateWithImagen(prompt);
            
        } finally {
            this.isGenerating = false;
        }
    }
    
    // Imagen APIフォールバック
    async generateWithImagen(prompt) {
        try {
            const requestBody = {
                instances: [{
                    prompt: `${prompt} 360 degree equirectangular panorama, HD resolution, ultra high quality, seamless`
                }],
                parameters: {
                    sampleCount: 1,
                    aspectRatio: '16:9',
                    personGeneration: 'allow_all'
                }
            };
            
            const response = await fetch(
                `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-002:predict?key=${this.geminiApiKey}`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(requestBody)
                }
            );
            
            const data = await response.json();
            
            if (data.predictions && data.predictions[0] && data.predictions[0].bytesBase64Encoded) {
                return `data:image/png;base64,${data.predictions[0].bytesBase64Encoded}`;
            }
        } catch (e) {
            console.log('⚠️ Imagen API 利用不可:', e.message);
        }
        
        return null;
    }
    
    // ========================================
    // 背景表示（音声シンクロ）
    // ========================================
    displayCachedBackground(entryId, entry) {
        const cached = this.backgroundCache.get(entryId);
        if (!cached || !cached.imageUrl) return;
        
        console.log(`🖼️ [シンクロ] ${entry.speakerName}の背景を表示！`);
        
        // AI背景生成パネルの関数を利用して背景適用
        if (window.aiBackgroundGenerator) {
            window.aiBackgroundGenerator.apply360Background(cached.imageUrl);
            window.aiBackgroundGenerator.updatePreview(cached.imageUrl);
            window.aiBackgroundGenerator.showNotification(`🎬 ${entry.speakerName}のシーンに切替`);
        } else {
            this.applyBackgroundDirectly(cached.imageUrl);
        }
        
        // ステータスを更新
        cached.status = 'displayed';
        this.currentPlayingEntryId = entryId;
        
        this.updateStatusUI('🟢', `${entry.speakerName}のシーン表示中`);
    }
    
    // 直接背景適用（フォールバック）
    async applyBackgroundDirectly(imageDataUrl) {
        const THREE = window.THREE;
        const scene = window.app?.scene;
        
        if (!THREE || !scene) {
            console.error('Three.js またはシーンが利用できません');
            return;
        }
        
        // 既存の背景メッシュを探して削除
        const existingBg = scene.children.find(c => c.userData?.isAIBackground);
        if (existingBg) {
            scene.remove(existingBg);
            if (existingBg.geometry) existingBg.geometry.dispose();
            if (existingBg.material) {
                if (existingBg.material.map) existingBg.material.map.dispose();
                existingBg.material.dispose();
            }
        }
        
        return new Promise((resolve, reject) => {
            const loader = new THREE.TextureLoader();
            loader.load(
                imageDataUrl,
                (texture) => {
                    texture.colorSpace = THREE.SRGBColorSpace;
                    
                    const geometry = new THREE.SphereGeometry(100, 64, 32);
                    const material = new THREE.MeshBasicMaterial({
                        map: texture,
                        side: THREE.BackSide
                    });
                    
                    const mesh = new THREE.Mesh(geometry, material);
                    mesh.userData.isAIBackground = true;
                    mesh.position.set(0, 0, 0);
                    
                    scene.add(mesh);
                    scene.background = null;
                    
                    resolve();
                },
                undefined,
                reject
            );
        });
    }
    
    // 再生開始イベントハンドラ
    onPlaybackStart(detail) {
        const director = window.multiCharManager?.director;
        if (!director || !director.pipeline) return;
        
        // 現在再生中のエントリを探す
        const playingEntry = director.pipeline.find(e => e.status === 'playing');
        if (playingEntry) {
            const entryId = this.getEntryId(playingEntry);
            const cached = this.backgroundCache.get(entryId);
            
            if (cached && cached.imageUrl && cached.status === 'ready') {
                this.displayCachedBackground(entryId, playingEntry);
            }
        }
    }
    
    // ターン開始イベントハンドラ
    onTurnStart(detail) {
        // turnStartでも同様に処理
        const { speakerId, speakerName } = detail;
        
        // キャッシュから該当するエントリを探す
        for (const [entryId, cached] of this.backgroundCache.entries()) {
            if (cached.speakerName === speakerName && cached.status === 'ready' && cached.imageUrl) {
                // まだ表示されていない最新のエントリ
                if (cached.status !== 'displayed') {
                    this.displayCachedBackground(entryId, { speakerName });
                    break;
                }
            }
        }
    }
    
    // 再生終了イベントハンドラ
    onPlaybackEnd(detail) {
        // 次のエントリがあれば先読み状態を確認
        this.checkPipelineAndPrefetch();
    }
    
    // ========================================
    // キャッシュ管理
    // ========================================
    updateCacheStatus(entryId, status) {
        const cached = this.backgroundCache.get(entryId);
        if (cached) {
            cached.status = status;
        }
    }
    
    cleanupOldCache() {
        const now = Date.now();
        
        for (const [entryId, cached] of this.backgroundCache.entries()) {
            // 古すぎるエントリを削除
            if (now - cached.createdAt > this.config.cacheExpireTime) {
                this.backgroundCache.delete(entryId);
            }
        }
        
        // キャッシュサイズ制限
        if (this.backgroundCache.size > this.config.maxCacheSize) {
            const entries = Array.from(this.backgroundCache.entries());
            entries.sort((a, b) => a[1].createdAt - b[1].createdAt);
            
            const toRemove = entries.slice(0, entries.length - this.config.maxCacheSize);
            for (const [entryId] of toRemove) {
                this.backgroundCache.delete(entryId);
            }
        }
    }
    
    updateCacheInfo() {
        const infoEl = document.getElementById('aibg-prefetch-cache-info');
        if (infoEl) {
            const ready = Array.from(this.backgroundCache.values()).filter(c => c.status === 'ready').length;
            const generating = Array.from(this.backgroundCache.values()).filter(c => c.status === 'generating').length;
            infoEl.textContent = `キャッシュ: ${this.backgroundCache.size}件 (準備完了: ${ready}, 生成中: ${generating})`;
        }
    }
    
    // ========================================
    // UI更新
    // ========================================
    updateStatusUI(indicator, text) {
        const indicatorEl = document.getElementById('aibg-prefetch-indicator');
        const textEl = document.getElementById('aibg-prefetch-status-text');
        
        if (indicatorEl) indicatorEl.textContent = indicator;
        if (textEl) textEl.textContent = text;
    }
    
    // ========================================
    // 設定
    // ========================================
    setPrefetchEnabled(enabled) {
        this.prefetchEnabled = enabled;
        
        const statusSection = document.getElementById('aibg-prefetch-status');
        if (statusSection) {
            statusSection.style.display = enabled ? 'block' : 'none';
        }
        
        if (enabled) {
            this.startPipelineMonitoring();
            console.log('🔮 会話自動背景先読み生成モード: ON');
        } else {
            this.stopPipelineMonitoring();
            this.backgroundCache.clear();
            console.log('🔮 会話自動背景先読み生成モード: OFF');
        }
        
        this.saveSettings();
    }
    
    setupEventListeners() {
        // AI背景パネルとの連携
        window.addEventListener('aibg:apiKeyUpdated', () => {
            this.loadApiKey();
        });
    }
    
    loadSettings() {
        try {
            const saved = localStorage.getItem('aibg-prefetch-settings');
            if (saved) {
                const settings = JSON.parse(saved);
                if (settings.enabled) {
                    const checkbox = document.getElementById('aibg-prefetch-enable');
                    if (checkbox) {
                        checkbox.checked = true;
                        this.setPrefetchEnabled(true);
                    }
                }
            }
        } catch (e) {}
    }
    
    saveSettings() {
        try {
            localStorage.setItem('aibg-prefetch-settings', JSON.stringify({
                enabled: this.prefetchEnabled
            }));
        } catch (e) {}
    }
}

// ========================================
// グローバル初期化
// ========================================

let aiBackgroundPrefetch = null;

function initAIBackgroundPrefetch() {
    if (!aiBackgroundPrefetch) {
        aiBackgroundPrefetch = new AIBackgroundPipelinePrefetch();
        window.aiBackgroundPrefetch = aiBackgroundPrefetch;
    }
    return aiBackgroundPrefetch;
}

// DOMContentLoadedで初期化
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        // AI背景パネルの後に初期化
        setTimeout(initAIBackgroundPrefetch, 3000);
    });
} else {
    setTimeout(initAIBackgroundPrefetch, 3000);
}

// グローバルAPIエクスポート
window.AIBackgroundPipelinePrefetch = AIBackgroundPipelinePrefetch;

console.log('✅ AI背景パイプライン先読み v1.0 スクリプト読み込み完了');
