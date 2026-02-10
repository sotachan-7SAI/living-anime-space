// ========================================
// VRM AI Viewer - API設定ファイル
// ========================================
// このファイルにAPIキーを設定してください
// ※このファイルはGitにコミットしないでください！

window.API_CONFIG = {
    // OpenAI APIキー（ChatGPT、TTS用）
    // https://platform.openai.com/api-keys から取得
    OPENAI_API_KEY: '',
    
    // Google Gemini APIキー（Gemini Chat、Google TTS用）
    // https://aistudio.google.com/ から取得
    // tts03
    GOOGLE_API_KEY: '',
    
    // Tripo3D APIキー（3Dモデル生成用）※オプション
    // https://www.tripo3d.ai/ から取得
    TRIPO_API_KEY: '',
};

// ========================================
// 自動設定（このコードは編集しないでください）
// ========================================
(function() {
    console.log('🔑 API設定を読み込み中...');
    
    // OpenAI APIキー
    if (window.API_CONFIG.OPENAI_API_KEY && window.API_CONFIG.OPENAI_API_KEY.length > 10) {
        localStorage.setItem('openai_api_key', window.API_CONFIG.OPENAI_API_KEY);
        console.log('✅ OpenAI APIキー設定完了');
    }
    
    // Google APIキー
    if (window.API_CONFIG.GOOGLE_API_KEY && window.API_CONFIG.GOOGLE_API_KEY.length > 10) {
        localStorage.setItem('banana_api_key', window.API_CONFIG.GOOGLE_API_KEY);
        localStorage.setItem('gemini_api_key', window.API_CONFIG.GOOGLE_API_KEY);
        console.log('✅ Google APIキー設定完了');
    }
    
    // Tripo3D APIキー
    if (window.API_CONFIG.TRIPO_API_KEY && window.API_CONFIG.TRIPO_API_KEY.length > 10) {
        localStorage.setItem('tripo_api_key', window.API_CONFIG.TRIPO_API_KEY);
        console.log('✅ Tripo3D APIキー設定完了');
    }
    
    console.log('🔑 API設定読み込み完了');
})();
