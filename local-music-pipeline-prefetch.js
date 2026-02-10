// ========================================
// 🎵 ローカルBGMパイプライン先読み生成システム v1.0
// 想像ワイプ3.1の先読み監視の要領で
// パイプラインから先読みしてBGM選曲
// 音声再生とオンタイムでBGMを切り替え
// ========================================

console.log('🎵 BGMパイプライン先読み v1.0 を読み込み中...');

class LocalMusicPipelinePrefetch {
    constructor() {
        // ========================================
        // パイプライン先読み用の状態管理
        // ========================================
        this.bgmCache = new Map(); // entryId → { mood, category, track, status }
        this.currentPlayingEntryId = null;
        this.pipelineCheckInterval = null;
        this.lastPipelineState = null;
        
        // 先読み生成モード
        this.prefetchEnabled = false;
        
        // 設定
        this.config = {
            checkInterval: 200,         // パイプラインチェック間隔(ms)
            maxCacheSize: 10,           // キャッシュ最大件数
            cacheExpireTime: 120000,    // キャッシュ有効期限(ms)
            minTextLength: 5,           // ムード検出に必要な最低テキスト長
            fadeTransition: true        // フェードでBGM切り替え
        };
        
        // ムード検出パターン（local-music-panel.jsと同じ）
        this.moodPatterns = [
            { mood: 'happy', regex: /嬉し|楽し|幸せ|やった|わーい|最高|すごい|ありがとう|よかった|！！/i },
            { mood: 'sad', regex: /悲し|辛い|寂し|切な|泣|さよなら|別れ|もう会えない/i },
            { mood: 'angry', regex: /怒|むかつ|イライラ|許さない|ふざけるな|💢|くそ/i },
            { mood: 'anxious', regex: /怖|恐|不安|やばい|ヤバ|心配|どうしよう/i },
            { mood: 'surprised', regex: /え[ぇえ]|まじ|本当|うそ|びっくり|！\？|\?!/i },
            { mood: 'romantic', regex: /好き|愛して|ドキドキ|照れ|💕|❤|大好き|告白/i },
            { mood: 'calm', regex: /穏やか|静か|落ち着|リラックス|のんびり|ゆっくり/i },
            { mood: 'energetic', regex: /元気|頑張|やるぞ|行くぞ|燃え|テンション/i },
            { mood: 'mysterious', regex: /謎|不思議|怪しい|闇|秘密|神秘/i },
            { mood: 'nostalgic', regex: /思い出|昔|あの時|懐かし|過去/i },
            { mood: 'playful', regex: /笑|あはは|ウケる|www|ｗｗ|面白/i },
            { mood: 'serious', regex: /真剣|大事|重要|真面目|本気/i },
            { mood: 'hopeful', regex: /希望|夢|未来|きっと|信じ/i },
            { mood: 'relaxed', regex: /おはよう|朝|目覚め|夜|おやすみ|眠/i },
            { mood: 'thinking', regex: /うーん|考え|なぜ|どうして|どうしよう/i },
        ];
        
        // ムード→カテゴリマッピング（local-music-panel.jsと同じ）
        this.moodToCategory = {
            'happy': ['03エモーション', '雰囲気', 'バラエティ'],
            'sad': ['感情', 'あんにゅい', 'ドラマティック'],
            'calm': ['01ネイチャー', '雰囲気', 'そらキレイ'],
            'energetic': ['02ループBGM', 'スタイリッシュ', 'バラエティ'],
            'romantic': ['ろまんす', 'ドラマティック', '情景'],
            'mysterious': ['サスペンス', '闘', '雰囲気'],
            'angry': ['感情', 'ドラマティック', '03エモーション'],
            'anxious': ['サスペンス', '感情', '雰囲気'],
            'hopeful': ['雰囲気', 'ドラマティック', '03エモーション'],
            'nostalgic': ['民芸レトロ', '情景', 'あんにゅい'],
            'playful': ['08コミカル', 'バラエティ', '03エモーション'],
            'serious': ['ニュース', '06ビジネス', 'くーる'],
            'exciting': ['07イベント', 'バラエティ', '02ループBGM'],
            'relaxed': ['01ネイチャー', 'そらキレイ', '雰囲気'],
            'thinking': ['雰囲気', '06ビジネス', 'くーる'],
            'surprised': ['03エモーション', '04ファンファーレカウントダウン', 'バラエティ'],
            'neutral': ['02ループBGM', '雰囲気', '01ネイチャー']
        };
        
        // 最近使用したトラック（重複防止）
        this.recentTracks = [];
        this.maxRecentTracks = 5;
        
        // 現在のBGMムード
        this.currentMood = null;
        
        this.init();
    }
    
    init() {
        this.createUI();
        this.setupEventListeners();
        this.loadSettings();
        console.log('✅ BGMパイプライン先読み v1.0 初期化完了');
    }
    
    // ========================================
    // UI作成
    // ========================================
    createUI() {
        // ローカルBGMパネルに先読みモードのトグルを追加
        const panel = document.getElementById('local-music-panel');
        if (!panel) {
            console.log('📌 ローカルBGMパネルがまだない、後で追加');
            setTimeout(() => this.createUI(), 2000);
            return;
        }
        
        // 既存の自動選曲セクションを探す
        const autoSection = panel.querySelector('.lm-section:has(#lm-auto-select)');
        if (!autoSection) {
            console.log('📌 自動選曲セクションが見つからない');
            setTimeout(() => this.createUI(), 2000);
            return;
        }
        
        // 先読みモードUI挿入
        const prefetchUI = document.createElement('div');
        prefetchUI.className = 'lm-prefetch-section';
        prefetchUI.innerHTML = `
            <div style="margin-top: 12px; padding-top: 10px; border-top: 1px dashed #ccc;">
                <div class="lm-section-label" style="color: #e91e63;">🔮 BGM先読みシンクロモード</div>
                <div class="lm-auto-toggle">
                    <label class="lm-toggle-switch">
                        <input type="checkbox" id="lm-prefetch-enable">
                        <span class="lm-toggle-slider" style="background: #ccc;"></span>
                    </label>
                    <span class="lm-toggle-label">パイプライン先読み＆音声シンクロ</span>
                </div>
                <div class="lm-prefetch-info" style="font-size: 9px; color: #888; margin-top: 6px; padding: 6px; background: #fce4ec; border-radius: 4px;">
                    💡 会話パイプラインを監視し、LLM生成中にムードを検出。<br>
                    音声再生開始時にシンクロしてBGMを切り替えます。
                </div>
                <div class="lm-prefetch-status" id="lm-prefetch-status" style="margin-top: 8px; display: none;">
                    <div style="display: flex; align-items: center; gap: 6px; padding: 6px; background: #e8f5e9; border-radius: 4px; font-size: 10px;">
                        <span id="lm-prefetch-indicator">🟢</span>
                        <span id="lm-prefetch-status-text">監視中</span>
                    </div>
                    <div id="lm-prefetch-cache-info" style="font-size: 9px; color: #666; margin-top: 4px;">
                        キャッシュ: 0件
                    </div>
                    <div id="lm-prefetch-next-mood" style="font-size: 10px; color: #e91e63; margin-top: 4px; font-weight: bold;">
                        次のムード: -
                    </div>
                </div>
            </div>
        `;
        
        // スタイル追加
        this.addStyles();
        
        autoSection.appendChild(prefetchUI);
        
        // イベントリスナー
        document.getElementById('lm-prefetch-enable').addEventListener('change', (e) => {
            this.setPrefetchEnabled(e.target.checked);
        });
        
        console.log('✅ BGM先読みモードUI追加完了');
    }
    
    addStyles() {
        if (document.getElementById('lm-prefetch-styles')) return;
        
        const style = document.createElement('style');
        style.id = 'lm-prefetch-styles';
        style.textContent = `
            .lm-prefetch-section .lm-toggle-switch input:checked + .lm-toggle-slider {
                background: linear-gradient(135deg, #e91e63 0%, #f06292 100%) !important;
            }
        `;
        document.head.appendChild(style);
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
        
        // multichar:turnStartイベントでもBGM切り替え
        window.addEventListener('multichar:turnStart', (e) => {
            if (this.prefetchEnabled && e.detail) {
                this.onTurnStart(e.detail);
            }
        });
        
        console.log('📊 BGMパイプライン監視を開始');
        this.updateStatusUI('🟢', '監視中');
    }
    
    stopPipelineMonitoring() {
        if (this.pipelineCheckInterval) {
            clearInterval(this.pipelineCheckInterval);
            this.pipelineCheckInterval = null;
        }
        console.log('📊 BGMパイプライン監視を停止');
        this.updateStatusUI('⚪', '停止中');
    }
    
    // パイプラインをチェックしてムードを先読み検出
    checkPipelineAndPrefetch() {
        const director = window.multiCharManager?.director;
        if (!director || !director.pipeline) return;
        
        const pipeline = director.pipeline;
        
        for (const entry of pipeline) {
            const entryId = this.getEntryId(entry);
            
            // すでにキャッシュにある場合
            if (this.bgmCache.has(entryId)) {
                const cached = this.bgmCache.get(entryId);
                
                // playing になったらBGM切り替え
                if (entry.status === 'playing' && cached.status !== 'played') {
                    this.switchToCachedBGM(entryId, entry);
                }
                continue;
            }
            
            // generating または synthesizing で responseText がある場合、ムード検出開始
            if ((entry.status === 'generating' || entry.status === 'synthesizing' || entry.status === 'ready') 
                && entry.responseText && entry.responseText.length >= this.config.minTextLength) {
                
                // キャッシュにプレースホルダーを追加（重複検出防止）
                this.bgmCache.set(entryId, {
                    mood: null,
                    category: null,
                    track: null,
                    status: 'analyzing',
                    speakerName: entry.speakerName,
                    createdAt: Date.now()
                });
                
                // ムード検出と曲選択
                this.prefetchBGMForEntry(entryId, entry.responseText, entry.speakerName);
            }
        }
        
        // 古いキャッシュをクリーンアップ
        this.cleanupOldCache();
        
        // キャッシュ情報更新
        this.updateCacheInfo();
    }
    
    getEntryId(entry) {
        return `bgm_${entry.speakerId}_${entry.createdAt}`;
    }
    
    // ========================================
    // 先読みムード検出＆曲選択
    // ========================================
    async prefetchBGMForEntry(entryId, text, speakerName) {
        console.log(`🎵 [先読み] ${speakerName}のBGMムードを検出中...`);
        
        try {
            this.updateStatusUI('🟡', `${speakerName}のムード分析中...`);
            
            // テキストからムードを検出
            const mood = this.detectMoodFromText(text);
            
            if (!mood) {
                console.log(`🎵 [先読み] ムード検出なし、neutralを使用`);
            }
            
            const detectedMood = mood || 'neutral';
            
            // カテゴリを選択
            const categories = this.moodToCategory[detectedMood] || this.moodToCategory['neutral'];
            const selectedCategory = categories[Math.floor(Math.random() * categories.length)];
            
            console.log(`🎵 [先読み] ${speakerName}: ムード=${detectedMood}, カテゴリ=${selectedCategory}`);
            
            // 曲を選択（APIから取得）
            const track = await this.selectTrackFromCategory(selectedCategory);
            
            // キャッシュを更新
            const cached = this.bgmCache.get(entryId);
            if (cached) {
                cached.mood = detectedMood;
                cached.category = selectedCategory;
                cached.track = track;
                cached.status = 'ready';
                console.log(`✅ [先読み] ${speakerName}のBGM準備完了: ${track?.name || 'なし'}`);
            }
            
            // 次のムード表示を更新
            this.updateNextMoodDisplay(detectedMood, speakerName);
            
            this.updateStatusUI('🟢', '監視中');
            
        } catch (error) {
            console.error(`❌ [先読み] BGMムード検出エラー:`, error);
            this.updateCacheStatus(entryId, 'error');
            this.updateStatusUI('🔴', 'エラー発生');
        }
    }
    
    // テキストからムードを検出
    detectMoodFromText(text) {
        for (const { mood, regex } of this.moodPatterns) {
            if (regex.test(text)) {
                return mood;
            }
        }
        
        // 質問文
        if (/？|\?/.test(text)) {
            return 'thinking';
        }
        
        return null;
    }
    
    // カテゴリから曲を選択
    async selectTrackFromCategory(category) {
        try {
            const response = await fetch(`/api/music-tracks?category=${encodeURIComponent(category)}`);
            if (response.ok) {
                const data = await response.json();
                const tracks = data.tracks || [];
                
                if (tracks.length > 0) {
                    // 最近再生していない曲を優先
                    const availableTracks = tracks.filter(t => 
                        !this.recentTracks.includes(t.path)
                    );
                    
                    const selectedTrack = availableTracks.length > 0
                        ? availableTracks[Math.floor(Math.random() * availableTracks.length)]
                        : tracks[Math.floor(Math.random() * tracks.length)];
                    
                    return selectedTrack;
                }
            }
        } catch (e) {
            console.warn('🎵 曲取得エラー:', e);
        }
        
        return null;
    }
    
    // ========================================
    // BGM切り替え（音声シンクロ）
    // ========================================
    async switchToCachedBGM(entryId, entry) {
        const cached = this.bgmCache.get(entryId);
        if (!cached) return;
        
        // 前回と同じムードならスキップ（オプション）
        if (cached.mood === this.currentMood && !this.config.alwaysChange) {
            console.log(`🎵 [シンクロ] 同じムードのためスキップ: ${cached.mood}`);
            cached.status = 'played';
            return;
        }
        
        console.log(`🎵 [シンクロ] ${entry.speakerName}のBGMに切替: ${cached.mood} → ${cached.track?.name || 'なし'}`);
        
        // ローカルBGMパネルの関数を使用して再生
        if (window.localMusicPanel && cached.track) {
            // ムードUIを更新
            window.localMusicPanel.lastDetectedMood = cached.mood;
            
            const moodEmojis = {
                'happy': '😊', 'sad': '😢', 'calm': '😌', 'energetic': '⚡',
                'romantic': '💕', 'mysterious': '🌙', 'angry': '😠', 'anxious': '😰',
                'hopeful': '🌟', 'nostalgic': '🍂', 'playful': '🎪', 'serious': '📋',
                'exciting': '🎉', 'relaxed': '🌿', 'thinking': '🤔', 'surprised': '😲',
                'neutral': '😐'
            };
            
            const panel = document.getElementById('local-music-panel');
            if (panel) {
                panel.querySelector('.lm-mood-emoji').textContent = moodEmojis[cached.mood] || '🎵';
                panel.querySelector('.lm-mood-text').textContent = cached.mood;
            }
            
            // 曲を再生
            await window.localMusicPanel.playTrack(cached.track, true);
            window.localMusicPanel.showNotification(`🎵 [シンクロ] ${cached.mood} → ${cached.track.name}`);
        }
        
        // ステータスを更新
        cached.status = 'played';
        this.currentPlayingEntryId = entryId;
        this.currentMood = cached.mood;
        
        // 最近使用したトラックに追加
        if (cached.track) {
            this.recentTracks.push(cached.track.path);
            if (this.recentTracks.length > this.maxRecentTracks) {
                this.recentTracks.shift();
            }
        }
        
        this.updateStatusUI('🟢', `${entry.speakerName}のBGM再生中`);
    }
    
    // 再生開始イベントハンドラ
    onPlaybackStart(detail) {
        const director = window.multiCharManager?.director;
        if (!director || !director.pipeline) return;
        
        // 現在再生中のエントリを探す
        const playingEntry = director.pipeline.find(e => e.status === 'playing');
        if (playingEntry) {
            const entryId = this.getEntryId(playingEntry);
            const cached = this.bgmCache.get(entryId);
            
            if (cached && cached.track && cached.status === 'ready') {
                this.switchToCachedBGM(entryId, playingEntry);
            }
        }
    }
    
    // ターン開始イベントハンドラ
    onTurnStart(detail) {
        const { speakerId, speakerName } = detail;
        
        // キャッシュから該当するエントリを探す
        for (const [entryId, cached] of this.bgmCache.entries()) {
            if (cached.speakerName === speakerName && cached.status === 'ready' && cached.track) {
                this.switchToCachedBGM(entryId, { speakerName });
                break;
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
        const cached = this.bgmCache.get(entryId);
        if (cached) {
            cached.status = status;
        }
    }
    
    cleanupOldCache() {
        const now = Date.now();
        
        for (const [entryId, cached] of this.bgmCache.entries()) {
            // 古すぎるエントリを削除
            if (now - cached.createdAt > this.config.cacheExpireTime) {
                this.bgmCache.delete(entryId);
            }
        }
        
        // キャッシュサイズ制限
        if (this.bgmCache.size > this.config.maxCacheSize) {
            const entries = Array.from(this.bgmCache.entries());
            entries.sort((a, b) => a[1].createdAt - b[1].createdAt);
            
            const toRemove = entries.slice(0, entries.length - this.config.maxCacheSize);
            for (const [entryId] of toRemove) {
                this.bgmCache.delete(entryId);
            }
        }
    }
    
    updateCacheInfo() {
        const infoEl = document.getElementById('lm-prefetch-cache-info');
        if (infoEl) {
            const ready = Array.from(this.bgmCache.values()).filter(c => c.status === 'ready').length;
            const analyzing = Array.from(this.bgmCache.values()).filter(c => c.status === 'analyzing').length;
            infoEl.textContent = `キャッシュ: ${this.bgmCache.size}件 (準備完了: ${ready}, 分析中: ${analyzing})`;
        }
    }
    
    updateNextMoodDisplay(mood, speakerName) {
        const nextMoodEl = document.getElementById('lm-prefetch-next-mood');
        if (nextMoodEl) {
            const moodEmojis = {
                'happy': '😊', 'sad': '😢', 'calm': '😌', 'energetic': '⚡',
                'romantic': '💕', 'mysterious': '🌙', 'angry': '😠', 'anxious': '😰',
                'hopeful': '🌟', 'nostalgic': '🍂', 'playful': '🎪', 'serious': '📋',
                'exciting': '🎉', 'relaxed': '🌿', 'thinking': '🤔', 'surprised': '😲',
                'neutral': '😐'
            };
            nextMoodEl.textContent = `次: ${moodEmojis[mood] || '🎵'} ${mood} (${speakerName})`;
        }
    }
    
    // ========================================
    // UI更新
    // ========================================
    updateStatusUI(indicator, text) {
        const indicatorEl = document.getElementById('lm-prefetch-indicator');
        const textEl = document.getElementById('lm-prefetch-status-text');
        
        if (indicatorEl) indicatorEl.textContent = indicator;
        if (textEl) textEl.textContent = text;
    }
    
    // ========================================
    // 設定
    // ========================================
    setPrefetchEnabled(enabled) {
        this.prefetchEnabled = enabled;
        
        const statusSection = document.getElementById('lm-prefetch-status');
        if (statusSection) {
            statusSection.style.display = enabled ? 'block' : 'none';
        }
        
        if (enabled) {
            this.startPipelineMonitoring();
            console.log('🔮 BGM先読みシンクロモード: ON');
            
            // 通知
            if (window.localMusicPanel) {
                window.localMusicPanel.showNotification('🔮 BGM先読みシンクロモードが有効になりました');
            }
        } else {
            this.stopPipelineMonitoring();
            this.bgmCache.clear();
            console.log('🔮 BGM先読みシンクロモード: OFF');
        }
        
        this.saveSettings();
    }
    
    setupEventListeners() {
        // 既存のローカルBGMパネルと連携
        // 特に追加の設定は不要
    }
    
    loadSettings() {
        try {
            const saved = localStorage.getItem('lm-prefetch-settings');
            if (saved) {
                const settings = JSON.parse(saved);
                if (settings.enabled) {
                    const checkbox = document.getElementById('lm-prefetch-enable');
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
            localStorage.setItem('lm-prefetch-settings', JSON.stringify({
                enabled: this.prefetchEnabled
            }));
        } catch (e) {}
    }
}

// ========================================
// グローバル初期化
// ========================================

let localMusicPrefetch = null;

function initLocalMusicPrefetch() {
    if (!localMusicPrefetch) {
        localMusicPrefetch = new LocalMusicPipelinePrefetch();
        window.localMusicPrefetch = localMusicPrefetch;
    }
    return localMusicPrefetch;
}

// DOMContentLoadedで初期化
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        // ローカルBGMパネルの後に初期化
        setTimeout(initLocalMusicPrefetch, 4000);
    });
} else {
    setTimeout(initLocalMusicPrefetch, 4000);
}

// グローバルAPIエクスポート
window.LocalMusicPipelinePrefetch = LocalMusicPipelinePrefetch;

console.log('✅ BGMパイプライン先読み v1.0 スクリプト読み込み完了');
