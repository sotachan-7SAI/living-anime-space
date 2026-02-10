// ========================================
// VRM AI Viewer - カスタム機能拡張
// ========================================

console.log('🚀 カスタム機能を読み込み中...');

// ========================================
// 1. チャットUIを右下に移動
// ========================================
(function() {
    const chatPanel = document.getElementById('chat-panel');
    if (chatPanel) {
        chatPanel.setAttribute('style', 
            'position: fixed !important; ' +
            'bottom: 20px !important; ' +
            'right: 20px !important; ' +
            'left: auto !important; ' +
            'transform: none !important; ' +
            'width: 400px !important; ' +
            'max-width: 400px !important;'
        );
        console.log('✅ チャットUIを右下に移動');
    }
})();

// ========================================
// 2. 自動瞬き機能（8秒に1回、0.2秒×2回）
// ========================================
// 旧変数名との互換性のため
(function setupAutoBlinkSystem() {
    // 既存のタイマーをクリア
    if (window.blinkTimer) clearInterval(window.blinkTimer);
    if (window.autoBlinkInterval) clearInterval(window.autoBlinkInterval);
    
    // 瞬き実行関数
    function doBlink() {
        if (window.app && window.app.vrm && window.app.vrm.expressionManager) {
            window.app.vrm.expressionManager.setValue('blink', 1.0);
            setTimeout(function() {
                window.app.vrm.expressionManager.setValue('blink', 0.0);
                setTimeout(function() {
                    window.app.vrm.expressionManager.setValue('blink', 1.0);
                    setTimeout(function() {
                        window.app.vrm.expressionManager.setValue('blink', 0.0);
                    }, 100);
                }, 200);
            }, 100);
        }
    }
    
    // 自動瞬き開始関数
    window.startAutoBlink = function() {
        if (window.autoBlinkInterval) {
            clearInterval(window.autoBlinkInterval);
        }
        window.autoBlinkInterval = setInterval(doBlink, 8000);
        window.blinkTimer = window.autoBlinkInterval; // 後方互換
        console.log('✅ 自動瞬き開始');
    };
    
    // 自動瞬き停止関数
    window.stopAutoBlink = function() {
        if (window.autoBlinkInterval) {
            clearInterval(window.autoBlinkInterval);
            window.autoBlinkInterval = null;
            window.blinkTimer = null;
            console.log('⏸️ 自動瞬き停止');
        }
    };
    
    // 自動瞬き再初期化
    window.reinitializeAutoBlink = function() {
        window.startAutoBlink();
    };
    
    // 初回開始
    window.startAutoBlink();
})();
console.log('✅ 自動瞬きシステム有効化');

// ========================================
// 3. モーションボタン取得
// ========================================
window.motionButtons = {};
document.querySelectorAll('.motion-card').forEach(function(card) {
    const text = card.textContent.trim();
    if (text.includes('全身')) window.motionButtons['all'] = card;
    else if (text.includes('挨拶')) window.motionButtons['wave'] = card;
    else if (text.includes('Vサイン')) window.motionButtons['vSign'] = card;
    else if (text.includes('撃つ')) window.motionButtons['shoot'] = card;
    else if (text.includes('回る')) window.motionButtons['spin'] = card;
    else if (text.includes('ポーズ')) window.motionButtons['pose'] = card;
    else if (text.includes('屈伸')) window.motionButtons['squat'] = card;
});
console.log('✅ モーション登録:', Object.keys(window.motionButtons));

// ========================================
// 4. モーション実行関数
// ========================================
window.playMotionByButton = function(name) {
    const btn = window.motionButtons[name];
    if (btn) {
        console.log('🎭 モーション実行:', name);
        btn.click();
    }
};

// ========================================
// 5. 表情変化機能 → ai-chat-auto-motion.js に移行済み
// ========================================
// この機能は ai-chat-auto-motion.js が担当するため削除
console.log('ℹ️ 表情機能は ai-chat-auto-motion.js に移行済み');

// ========================================
// 6. ユーザー入力監視（モーション用）
// ========================================
var userInput = '';
var inputField = document.querySelector('#chat-panel input[type="text"]') || document.querySelector('input[placeholder*="メッセージ"]');
if (inputField) {
    inputField.addEventListener('input', function(e) {
        userInput = this.value;
    });
    inputField.addEventListener('keypress', function(e) {
        if (e.key === 'Enter' && userInput) {
            console.log('入力:', userInput);
            setTimeout(function() {
                var mo = null;
                if (userInput.indexOf('回る') >= 0 || userInput.indexOf('くるくる') >= 0) mo = 'spin';
                else if (userInput.indexOf('撃つ') >= 0 || userInput.indexOf('バーン') >= 0) mo = 'shoot';
                else if (userInput.indexOf('屈伸') >= 0 || userInput.indexOf('運動') >= 0) mo = 'squat';
                else if (userInput.indexOf('ポーズ') >= 0 || userInput.indexOf('決める') >= 0) mo = 'pose';
                else if (userInput.indexOf('やった') >= 0 || userInput.indexOf('イェーイ') >= 0) mo = 'vSign';
                else if (userInput.indexOf('挨拶') >= 0 || userInput.indexOf('おはよう') >= 0) mo = 'wave';
                if (mo) {
                    console.log('→モーション:', mo);
                    window.playMotionByButton(mo);
                }
                userInput = '';
            }, 500);
        }
    });
    console.log('✅ 入力監視開始');
}

// ========================================
// 7. 文脈推測表情制御 → ai-chat-auto-motion.js に移行済み
// ========================================
// この機能は ai-chat-auto-motion.js が GPT-4o-mini で高精度に処理するため削除
console.log('ℹ️ 文脈推測表情制御は ai-chat-auto-motion.js に移行済み');

// ========================================
// 8. ルックアット機能（VRM 1.0/0.x 対応）
// ========================================
(function setupLookAtSystem() {
    console.log('👁️ ルックアットシステム初期化...');
    
    // ルックアットターゲット（カメラの前）
    let lookAtTarget = null;
    
    // ルックアットを設定する関数
    function initializeLookAt() {
        if (!window.app || !window.app.vrm) {
            console.log('⏳ VRM待機中...');
            return false;
        }
        
        const vrm = window.app.vrm;
        const camera = window.app.camera;
        
        if (!vrm.lookAt) {
            console.warn('⚠️ VRMにlookAtがありません');
            return false;
        }
        
        // 👁️ ルックアットターゲットを作成（カメラの前方）
        if (!lookAtTarget && window.THREE) {
            lookAtTarget = new THREE.Object3D();
            lookAtTarget.name = 'LookAtTarget';
            if (window.app.scene) {
                window.app.scene.add(lookAtTarget);
            }
        }
        
        // ターゲットを設定
        vrm.lookAt.target = lookAtTarget;
        
        // VRM 1.0: autoUpdateをfalseにして手動更新
        if (vrm.lookAt.autoUpdate !== undefined) {
            vrm.lookAt.autoUpdate = false;
        }
        
        console.log('✅ ルックアット設定完了');
        return true;
    }
    
    // 毎フレーム更新
    function updateLookAt() {
        if (!window.app || !window.app.vrm || !window.app.vrm.lookAt) return;
        if (!window.app.camera || !lookAtTarget) return;
        
        const camera = window.app.camera;
        
        // カメラの前方にターゲットを配置
        lookAtTarget.position.set(
            camera.position.x,
            camera.position.y,
            camera.position.z
        );
        
        // VRMのlookAtを更新
        try {
            window.app.vrm.lookAt.update(0.016);
        } catch (e) {
            // エラーを静かに無視
        }
    }
    
    // 初期化ループ
    var attempts = 0;
    var maxAttempts = 100;
    var initInterval = setInterval(function() {
        attempts++;
        if (initializeLookAt()) {
            clearInterval(initInterval);
            
            // 更新ループ開始
            if (window.lookAtUpdateInterval) {
                clearInterval(window.lookAtUpdateInterval);
            }
            window.lookAtUpdateInterval = setInterval(updateLookAt, 16);
            console.log('✅ ルックアット更新ループ開始');
        } else if (attempts >= maxAttempts) {
            console.log('⚠️ ルックアット設定タイムアウト');
            clearInterval(initInterval);
        }
    }, 100);
    
    // 🔄 VRM再読み込み時に再初期化
    window.reinitializeLookAt = function() {
        console.log('🔄 ルックアット再初期化...');
        
        // 既存のインターバルをクリア
        if (window.lookAtUpdateInterval) {
            clearInterval(window.lookAtUpdateInterval);
            window.lookAtUpdateInterval = null;
            console.log('  ↳ 既存インターバルクリア');
        }
        
        setTimeout(function() {
            if (initializeLookAt()) {
                window.lookAtUpdateInterval = setInterval(updateLookAt, 16);
                console.log('✅ ルックアット再初期化完了（インターバルID:', window.lookAtUpdateInterval, '）');
            } else {
                console.warn('⚠️ ルックアット初期化失敗 - VRMがまだ読み込まれていないかも');
            }
        }, 100);
    };
    
    // グローバルに公開
    window.LookAtSystem = {
        initialize: initializeLookAt,
        reinitialize: window.reinitializeLookAt,
        update: updateLookAt,
        getTarget: () => lookAtTarget
    };
    
    // デバッグ用：現在のルックアット状態を確認
    window.testLookAt = function() {
        console.log('=== ルックアット状態チェック ===');
        console.log('1. window.app:', !!window.app);
        console.log('2. window.app.vrm:', !!(window.app && window.app.vrm));
        console.log('3. vrm.lookAt:', !!(window.app && window.app.vrm && window.app.vrm.lookAt));
        console.log('4. lookAtTarget:', !!lookAtTarget);
        console.log('5. lookAtUpdateInterval:', window.lookAtUpdateInterval);
        
        if (window.app && window.app.vrm && window.app.vrm.lookAt) {
            const la = window.app.vrm.lookAt;
            console.log('6. lookAt.target:', la.target);
            console.log('7. lookAt.autoUpdate:', la.autoUpdate);
        }
        
        // 手動で一回更新してみる
        console.log('\n🔄 手動更新テスト...');
        updateLookAt();
        console.log('✅ 手動更新完了');
        
        return 'コンソールで window.testLookAt() を実行してください';
    };
})();

// ========================================
// 9. OpenAI TTS機能（高品質音声）
// ========================================

// ★ キャラクター設定の初期化（既存の設定を保持！）
(function() {
    // 既存の設定があればそれを使用、なければデフォルトを設定
    const existingPrompt = localStorage.getItem('character_prompt');
    
    if (!existingPrompt) {
        // デフォルト：シンプルなキャラクター
        const defaultPrompt = `あなたは親しみやすいVRMキャラクターです。

【話し方の特徴】
- フレンドリーで明るい口調
- 「〜だよ！」「〜だね！」などの語尾
- 短く簡潔に返答

【絶対ルール】
★返答は50〜120文字
★日本語で返答`;
        localStorage.setItem('character_prompt', defaultPrompt);
        console.log('ℹ️ デフォルトキャラクター設定を適用');
    } else {
        console.log('✅ 保存済みのキャラクター設定を維持:', existingPrompt.substring(0, 30) + '...');
    }
    
    // Gemini/ChatGPTクライアントに反映（読み込み後に実行）
    setTimeout(function() {
        const prompt = localStorage.getItem('character_prompt');
        if (prompt) {
            if (window.app && window.app.geminiClient) {
                window.app.geminiClient.setSystemPrompt(prompt);
                console.log('✅ Geminiにキャラクター設定適用');
            }
            if (window.app && window.app.chatGPTClient) {
                window.app.chatGPTClient.setSystemPrompt(prompt);
                console.log('✅ ChatGPTにキャラクター設定適用');
            }
        }
    }, 2000);
})();

window.openaiTTS = {
    enabled: false,
    voice: 'shimmer',
    isSpeaking: false,
    getApiKey: function() {
        if (window.app && window.app.chatGPTClient && window.app.chatGPTClient.apiKey) {
            return window.app.chatGPTClient.apiKey;
        }
        return localStorage.getItem('openai_api_key');
    },
    speak: async function(text) {
        if (!this.enabled || this.isSpeaking) return;
        var apiKey = this.getApiKey();
        if (!apiKey) return;
        this.isSpeaking = true;
        try {
            console.log('TTS生成中:', text.substring(0, 30));
            var response = await fetch('https://api.openai.com/v1/audio/speech', {
                method: 'POST',
                headers: {
                    'Authorization': 'Bearer ' + apiKey,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: 'tts-1-hd',
                    voice: this.voice,
                    input: text,
                    speed: 1.0
                })
            });
            if (!response.ok) {
                throw new Error('API error: ' + response.status);
            }
            var audioBlob = await response.blob();
            var audioUrl = URL.createObjectURL(audioBlob);
            var audio = new Audio(audioUrl);
            if (window.app && window.app.startLipSync) {
                window.app.startLipSync(audio);
            }
            audio.onended = () => {
                URL.revokeObjectURL(audioUrl);
                this.isSpeaking = false;
                if (window.app && window.app.stopLipSync) {
                    window.app.stopLipSync();
                }
            };
            audio.onerror = () => {
                this.isSpeaking = false;
                if (window.app && window.app.stopLipSync) {
                    window.app.stopLipSync();
                }
            };
            await audio.play();
            console.log('TTS再生中');
        } catch (error) {
            console.error('TTS error:', error);
            this.isSpeaking = false;
        }
    },
    toggle: function() {
        this.enabled = !this.enabled;
        console.log('OpenAI TTS:', this.enabled ? 'ON' : 'OFF');
        if (this.enabled) {
            var v = document.getElementById('voice-enabled');
            if (v && v.checked) {
                v.checked = false;
                v.dispatchEvent(new Event('change'));
            }
        }
        return this.enabled;
    }
};

// OpenAI TTS メッセージ監視
window.lastTTSMessage = '';
window.lastTTSLength = 0;
setInterval(function() {
    if (!window.openaiTTS || !window.openaiTTS.enabled || window.openaiTTS.isSpeaking) return;
    var msgs = document.querySelectorAll('.message.ai');
    if (msgs.length > 0) {
        var last = msgs[msgs.length - 1];
        var txt = last.textContent.replace(/^AI/, '').trim();
        if (txt === window.lastTTSMessage) return;
        if (txt.length > 10 && txt.length === window.lastTTSLength) {
            window.lastTTSMessage = txt;
            window.lastTTSLength = 0;
            window.openaiTTS.speak(txt);
        } else {
            window.lastTTSLength = txt.length;
        }
    }
}, 1500);

// OpenAI TTS UIボタン
(function() {
    var btn = document.createElement('button');
    btn.setAttribute('data-openai-tts', 'true');
    btn.textContent = 'OpenAI TTS OFF';
    btn.style.cssText = 'position: fixed; top: 200px; left: 20px; z-index: 1000; padding: 10px 20px; background: #FF9800; color: white; border: none; border-radius: 5px; cursor: pointer; font-weight: bold;';
    btn.onclick = function() {
        var on = window.openaiTTS.toggle();
        this.textContent = on ? 'OpenAI TTS ON' : 'OpenAI TTS OFF';
        this.style.background = on ? '#4CAF50' : '#FF9800';
    };
    document.body.appendChild(btn);
    console.log('✅ OpenAI TTSボタン追加');
})();

// Gemini一体化ボタン
(function() {
    var btn = document.createElement('button');
    btn.id = 'gemini-mode-toggle';
    btn.textContent = '💎 Gemini OFF';
    btn.style.cssText = 'position: fixed; top: 160px; left: 20px; z-index: 1000; padding: 10px 20px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border: none; border-radius: 5px; cursor: pointer; font-weight: bold;';
    btn.onclick = function() {
        if (window.app && window.app.toggleGeminiMode) {
            window.app.toggleGeminiMode();
        }
    };
    document.body.appendChild(btn);
    console.log('✅ Gemini一体化ボタン追加');
})();

console.log('✅ OpenAI TTS準備完了');

// ========================================
// 9.5 Google TTS機能（低コスト音声）
// ========================================
window.googleTTS = {
    enabled: false,
    isSpeaking: false,
    voiceName: 'Zephyr', // デフォルト音声
    useFastModel: false, // 高速モード（Flash使用）
    getApiKey: function() {
        return localStorage.getItem('banana_api_key');
    },
    getModelName: function() {
        // 高速モードの場合はFlashを使用（低遅延）
        return this.useFastModel 
            ? 'gemini-2.5-flash-preview-tts' 
            : 'gemini-2.5-pro-preview-tts';
    },
    speak: async function(text) {
        if (!this.enabled || this.isSpeaking) return;
        var apiKey = this.getApiKey();
        if (!apiKey) {
            console.error('Google APIキーが設定されていません');
            return;
        }
        this.isSpeaking = true;
        try {
            console.log('🍌 Google TTS生成中 (' + this.getModelName() + '):', text.substring(0, 30));
            
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${this.getModelName()}:generateContent?key=${apiKey}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    contents: [{
                        parts: [{ text: text }]
                    }],
                    generationConfig: {
                        responseModalities: ["AUDIO"],
                        speechConfig: {
                            voiceConfig: {
                                prebuiltVoiceConfig: {
                                    voiceName: this.voiceName
                                }
                            }
                        }
                    }
                })
            });
            
            const data = await response.json();
            
            if (data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts) {
                for (const part of data.candidates[0].content.parts) {
                    if (part.inlineData && part.inlineData.data) {
                        console.log('✅ Google TTS生成完了');
                        const base64 = part.inlineData.data;
                        const mimeType = part.inlineData.mimeType || 'audio/L16';
                        console.log('🎤 音声フォーマット:', mimeType);
                        
                        // Base64をバイナリに変換
                        const byteCharacters = atob(base64);
                        const byteNumbers = new Array(byteCharacters.length);
                        for (let i = 0; i < byteCharacters.length; i++) {
                            byteNumbers[i] = byteCharacters.charCodeAt(i);
                        }
                        const byteArray = new Uint8Array(byteNumbers);
                        
                        // PCM 16-bitデータをWeb Audio APIで再生
                        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
                        const sampleRate = 24000; // rate=24000
                        
                        // 16-bit PCMをFloat32に変換
                        const samples = byteArray.length / 2;
                        const audioBuffer = audioContext.createBuffer(1, samples, sampleRate);
                        const channelData = audioBuffer.getChannelData(0);
                        
                        const dataView = new DataView(byteArray.buffer);
                        for (let i = 0; i < samples; i++) {
                            // 16-bit signed integerを-1.0～1.0の範囲に変換
                            const int16 = dataView.getInt16(i * 2, true); // little-endian
                            channelData[i] = int16 / 32768.0;
                        }
                        
                        // リップシンク開始（ブラウザTTS風の自然な動き）
                        if (window.app && window.app.vrm && window.app.vrm.expressionManager) {
                            const durationSec = audioBuffer.duration;
                            console.log('👄 リップシンク開始: ' + durationSec.toFixed(2) + '秒');
                            
                            // 自然な開閉パターン（完全に閉じない）
                            const mouthPattern = [0.10, 0.30, 0.05, 0.15, 0.25, 0.50, 0.20, 1.00, 0.15, 0.25, 0.10, 0.75];
                            let patternIndex = 0;
                            
                            const lipSyncInterval = setInterval(() => {
                                const value = mouthPattern[patternIndex];
                                window.app.vrm.expressionManager.setValue('aa', value);
                                patternIndex = (patternIndex + 1) % mouthPattern.length;
                            }, 300); // 0.3秒ごとに切り替え
                            
                            window.googleTTSLipSyncInterval = lipSyncInterval;
                        }
                        
                        const source = audioContext.createBufferSource();
                        source.buffer = audioBuffer;
                        source.connect(audioContext.destination);
                        
                        source.onended = () => {
                            console.log('🍌 Google TTS再生完了');
                            this.isSpeaking = false;
                            
                            // リップシンク停止
                            if (window.googleTTSLipSyncInterval) {
                                clearInterval(window.googleTTSLipSyncInterval);
                                window.googleTTSLipSyncInterval = null;
                            }
                            if (window.app && window.app.vrm && window.app.vrm.expressionManager) {
                                window.app.vrm.expressionManager.setValue('aa', 0);
                            }
                            
                            // 表情は ai-chat-auto-motion.js が制御するため、ここではリセットしない
                            console.log('😐 TTS再生完了（表情はai-chat-auto-motion.jsが制御）');
                            
                            audioContext.close();
                        };
                        
                        source.start(0);
                        console.log('🍌 Google TTS再生中');
                        return;
                    }
                }
            }
            
            console.error('Google TTS応答:', data);
            throw new Error('Google TTS失敗');
            
        } catch (error) {
            console.error('Google TTS error:', error);
            this.isSpeaking = false;
        }
    },
    toggle: function() {
        this.enabled = !this.enabled;
        // OpenAI TTSをオフに
        if (this.enabled && window.openaiTTS.enabled) {
            window.openaiTTS.enabled = false;
            var openaiBtn = document.querySelector('[data-openai-tts]');
            if (openaiBtn) {
                openaiBtn.textContent = 'OpenAI TTS OFF';
                openaiBtn.style.background = '#FF9800';
            }
        }
        console.log('Google TTS:', this.enabled ? 'ON' : 'OFF');
        return this.enabled;
    }
};

// Google TTS メッセージ監視
window.lastGoogleTTSMessage = '';
window.lastGoogleTTSLength = 0;
setInterval(function() {
    if (!window.googleTTS || !window.googleTTS.enabled || window.googleTTS.isSpeaking) return;
    var msgs = document.querySelectorAll('.message.ai');
    if (msgs.length > 0) {
        var last = msgs[msgs.length - 1];
        var txt = last.textContent.replace(/^AI/, '').trim();
        if (txt === window.lastGoogleTTSMessage) return;
        if (txt.length > 10 && txt.length === window.lastGoogleTTSLength) {
            window.lastGoogleTTSMessage = txt;
            window.lastGoogleTTSLength = 0;
            window.googleTTS.speak(txt);
        } else {
            window.lastGoogleTTSLength = txt.length;
        }
    }
}, 1500);

// Google TTS UIボタン
(function() {
    var btn = document.createElement('button');
    btn.setAttribute('data-google-tts', 'true');
    btn.textContent = '🍌 Google TTS OFF';
    btn.style.cssText = 'position: fixed; top: 250px; left: 20px; z-index: 1000; padding: 10px 20px; background: #4285F4; color: white; border: none; border-radius: 5px; cursor: pointer; font-weight: bold;';
    btn.onclick = function() {
        var on = window.googleTTS.toggle();
        this.textContent = on ? '🍌 Google TTS ON' : '🍌 Google TTS OFF';
        this.style.background = on ? '#34A853' : '#4285F4';
    };
    document.body.appendChild(btn);
    
    // モデル選択ボタン追加
    var modelBtn = document.createElement('button');
    modelBtn.textContent = '高速モード';
    modelBtn.style.cssText = 'position: fixed; top: 300px; left: 20px; z-index: 1000; padding: 8px 15px; background: #9E9E9E; color: white; border: none; border-radius: 5px; cursor: pointer; font-size: 12px;';
    modelBtn.onclick = function() {
        if (window.googleTTS.useFastModel) {
            window.googleTTS.useFastModel = false;
            this.textContent = '高速モード';
            this.style.background = '#9E9E9E';
            console.log('🐢 通常モード（高品質）');
        } else {
            window.googleTTS.useFastModel = true;
            this.textContent = '高速モード ON';
            this.style.background = '#FF5722';
            console.log('⚡ 高速モード（低遅延）');
        }
    };
    document.body.appendChild(modelBtn);
    
    console.log('✅ Google TTSボタン追加');
})();

console.log('✅ Google TTS準備完了');

// ========================================
// 10. 360度パノラマ環境生成 (Imagen 3 画像 + Veo 3 動画)
// ========================================
window.veo3Panorama = {
    isVideoMode: false,  // 動画モードかどうか
    videoElement: null,  // 動画再生用
    operationId: null,   // Veo 3生成のオペレーションID
    
    // 解像度設定
    resolutionPresets: {
        'HD': { width: 1280, height: 720, label: 'HD (1280x720)' },
        'FHD': { width: 1920, height: 1080, label: 'Full HD (1920x1080)' },
        '2K': { width: 2560, height: 1440, label: '2K (2560x1440)' },
        '4K': { width: 3840, height: 2160, label: '4K (3840x2160)' }
    },
    currentResolution: '4K',  // デフォルト4K
    
    // === 画像生成（Imagen 3）===
    generate: async function(description, resolution = null) {
        const res = resolution || this.currentResolution;
        const preset = this.resolutionPresets[res] || this.resolutionPresets['4K'];
        
        console.log(`🖼️ パノラマ画像生成中 [${preset.label}]:`, description);
        
        if (window.playMotionByButton) {
            window.playMotionByButton('pose');
        }
        
        try {
            const imageUrl = await this.generateWithImagen3(description, preset);
            
            if (imageUrl) {
                await this.applyBackground(imageUrl);
                console.log('✅ パノラマ画像適用完了');
            }
            
        } catch (error) {
            console.error('パノラマ画像生成エラー:', error);
            alert('エラー: ' + error.message);
        }
    },
    
    // Gemini 3 Pro Image Preview で画像生成
    generateWithImagen3: async function(description, preset) {
        const geminiKey = localStorage.getItem('gemini_imagen_api_key') || localStorage.getItem('banana_api_key');
        if (!geminiKey) {
            throw new Error('360度環境APIキーが設定されていません。「🔑 API設定」パネルで「🌐 360°画像 API Key」を入力してください');
        }
        
        try {
            console.log(`🎨 Gemini 3 Pro Imageで${preset.label}画像生成中...`);
            
            // 高解像度対応プロンプト（画像生成を明示的に指示）
            const panoramaPrompt = `Generate an image of a seamless 360-degree equirectangular panorama of ${description}. Photorealistic, extremely detailed, 8K quality textures, immersive environment. The left and right edges must connect perfectly with no visible seams. Wide horizontal panoramic view covering full 360 degrees. Perfect for VR skybox. Sharp details, high dynamic range, cinematic lighting.`;
            
            // Gemini 3 Pro Image Preview（画像生成に対応）
            console.log('🖼️ Gemini 3 Pro Image API呼び出し中...');
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3-pro-image-preview:generateContent?key=${geminiKey}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    contents: [{
                        parts: [{
                            text: panoramaPrompt
                        }]
                    }],
                    generationConfig: {
                        responseModalities: ["IMAGE", "TEXT"]
                    }
                })
            });
            
            const data = await response.json();
            console.log('Gemini 3応答:', data);
            
            // 画像データを抽出
            if (data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts) {
                for (const part of data.candidates[0].content.parts) {
                    if (part.inlineData && part.inlineData.data) {
                        console.log(`✅ Gemini 3 Pro画像生成完了`);
                        const base64 = part.inlineData.data;
                        const mimeType = part.inlineData.mimeType || 'image/png';
                        
                        // 高解像度にアップスケール（Canvas使用）
                        const upscaledUrl = await this.upscaleImage(`data:${mimeType};base64,${base64}`, preset.width, preset.height);
                        return upscaledUrl;
                    }
                }
            }
            
            // 画像が返されなかった場合、テキスト応答を確認
            const textResponse = data.candidates?.[0]?.content?.parts?.[0]?.text;
            if (textResponse) {
                console.log('Geminiテキスト応答:', textResponse.substring(0, 200));
            }
            
            // エラーメッセージを改善
            const errorMsg = data.error?.message || 'Gemini 3 Pro Imageで画像が生成されませんでした。';
            throw new Error(`画像生成失敗: ${errorMsg}\n\n代替案: Pollinationsの無料APIを試します...`);
            
        } catch (error) {
            console.warn('Gemini画像生成失敗、Pollinationsにフォールバック:', error.message);
            
            // Pollinations.ai（無料の画像生成API）にフォールバック
            return await this.generateWithPollinations(description, preset);
        }
    },
    
    // Pollinations.ai で画像生成（無料、制限なし）
    generateWithPollinations: async function(description, preset) {
        console.log(`🌸 Pollinations.aiで${preset.label}画像生成中...`);
        
        // パノラマ用プロンプト
        const panoramaPrompt = `360 degree equirectangular panorama, seamless edges, ${description}, photorealistic, high quality, immersive environment, VR skybox, ultra detailed, 8K`;
        
        // URLエンコード
        const encodedPrompt = encodeURIComponent(panoramaPrompt);
        
        // Pollinations API URL（直接画像URLを返す）
        // 注: Pollinationsは最大1024x1024程度なので、後でアップスケール
        const pollinationsUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=1024&height=512&nologo=true&seed=${Date.now()}`;
        
        console.log('🌸 Pollinations URL:', pollinationsUrl);
        
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            
            img.onload = async () => {
                console.log(`✅ Pollinations画像取得完了: ${img.width}x${img.height}`);
                
                // Canvas経由でBase64に変換
                const canvas = document.createElement('canvas');
                canvas.width = img.width;
                canvas.height = img.height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0);
                
                const base64Url = canvas.toDataURL('image/png', 1.0);
                
                // 目標解像度にアップスケール
                const upscaledUrl = await this.upscaleImage(base64Url, preset.width, preset.height);
                resolve(upscaledUrl);
            };
            
            img.onerror = (err) => {
                console.error('Pollinations画像取得エラー:', err);
                reject(new Error('Pollinations.aiからの画像取得に失敗しました。ネットワーク接続を確認してください。'));
            };
            
            img.src = pollinationsUrl;
        });
    },
    
    // 画像をアップスケール（Canvas利用）
    upscaleImage: function(imageDataUrl, targetWidth, targetHeight) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width = targetWidth;
                canvas.height = targetHeight;
                
                const ctx = canvas.getContext('2d');
                
                // 高品質補間
                ctx.imageSmoothingEnabled = true;
                ctx.imageSmoothingQuality = 'high';
                
                // 画像を描画（アスペクト比を維持しつつ引き伸ばし）
                ctx.drawImage(img, 0, 0, targetWidth, targetHeight);
                
                // シャープネス処理（コントラスト強調）
                try {
                    const imageData = ctx.getImageData(0, 0, targetWidth, targetHeight);
                    const data = imageData.data;
                    
                    // 軽いシャープネスフィルタ
                    for (let i = 0; i < data.length; i += 4) {
                        data[i] = Math.min(255, Math.max(0, data[i] * 1.05 - 10));     // R
                        data[i+1] = Math.min(255, Math.max(0, data[i+1] * 1.05 - 10)); // G
                        data[i+2] = Math.min(255, Math.max(0, data[i+2] * 1.05 - 10)); // B
                    }
                    
                    ctx.putImageData(imageData, 0, 0);
                } catch (e) {
                    console.warn('シャープネス処理スキップ:', e);
                }
                
                const upscaledUrl = canvas.toDataURL('image/png', 1.0);
                console.log(`📐 アップスケール完了: ${img.width}x${img.height} → ${targetWidth}x${targetHeight}`);
                resolve(upscaledUrl);
            };
            img.onerror = reject;
            img.src = imageDataUrl;
        });
    },
    
    // 旧API（互換性維持）
    generateWithGeminiImagen: async function(description) {
        return this.generateWithImagen3(description, this.resolutionPresets['4K']);
    },
    
    // === 動画生成（Veo 2 via サーバープロキシ）===
    generateVideo: async function(description) {
        console.log('🎬 Veo 2 パノラマ動画生成中:', description);
        
        const veo3Key = localStorage.getItem('veo3_api_key');
        if (!veo3Key) {
            throw new Error('Veo API キーが設定されていません。「🔑 API設定」パネルで「🎬 Veo 3 API Key」を入力してください');
        }
        
        if (window.playMotionByButton) {
            window.playMotionByButton('pose');
        }
        
        try {
            // 360度パノラマ用プロンプト
            const panoramaPrompt = `A seamless 360-degree equirectangular panorama video of ${description}. Smooth ambient movement, photorealistic, high quality, immersive environment. The scene should loop seamlessly. Perfect for VR skybox animation. Gentle ambient movement, clouds drifting, water rippling, leaves swaying. No camera movement, static viewpoint.`;
            
            console.log('🎥 Veo 2 API呼び出し中（サーバープロキシ経由）...');
            
            // サーバープロキシ経由でVeo 2を使用（CORS回避）
            const response = await fetch('/gemini-video-generate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    apiKey: veo3Key,
                    prompt: panoramaPrompt
                })
            });
            
            const data = await response.json();
            console.log('Veo 2 初回応答:', data);
            
            if (!data.success) {
                throw new Error(data.error || 'Veo 2 API エラー');
            }
            
            // Long-running operationの場合、ポーリングで完了を待つ
            if (data.operationId) {
                this.operationId = data.operationId;
                console.log('⏳ 動画生成中... Operation ID:', this.operationId);
                
                // ポーリングで完了を待つ
                const videoUrl = await this.pollForCompletion(veo3Key);
                
                if (videoUrl) {
                    await this.applyVideoBackground(videoUrl);
                    console.log('✅ パノラマ動画適用完了');
                    return videoUrl;
                }
            }
            
            throw new Error('Veo 2 動画生成失敗: Operation ID が返されませんでした');
            
        } catch (error) {
            console.error('Veo 2エラー:', error);
            throw error;
        }
    },
    
    // ポーリングで動画生成完了を待つ（サーバープロキシ経由）
    pollForCompletion: async function(apiKey, maxAttempts = 60) {
        for (let i = 0; i < maxAttempts; i++) {
            console.log(`⏳ 動画生成中... (${i + 1}/${maxAttempts})`);
            
            await new Promise(resolve => setTimeout(resolve, 5000)); // 5秒待機
            
            try {
                const response = await fetch('/gemini-video-poll', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        apiKey: apiKey,
                        operationId: this.operationId
                    })
                });
                
                const data = await response.json();
                console.log('ポーリング応答:', data);
                
                if (!data.success && data.error) {
                    throw new Error('ポーリングエラー: ' + data.error);
                }
                
                if (data.done) {
                    console.log('✅ 動画生成完了！');
                    
                    if (data.videoData) {
                        return `data:video/mp4;base64,${data.videoData}`;
                    } else if (data.videoUri) {
                        return data.videoUri;
                    }
                    
                    throw new Error('動画データが見つかりません');
                }
                
            } catch (error) {
                console.error('ポーリングエラー:', error);
                // エラーでも続行（ネットワーク一時エラーの可能性）
            }
        }
        
        throw new Error('動画生成タイムアウト（5分経過）');
    },
    
    // 動画を360度環境球に適用
    applyVideoBackground: async function(videoUrl) {
        return new Promise((resolve, reject) => {
            try {
                console.log('🎥 動画を読み込み中...');
                
                // 既存の環境を削除
                this.remove();
                
                // 動画要素を作成
                const video = document.createElement('video');
                video.crossOrigin = 'anonymous';
                video.loop = true;
                video.muted = false;  // 音声あり
                video.playsInline = true;
                video.autoplay = true;
                
                video.onloadeddata = () => {
                    console.log('✅ 動画読み込み完了');
                    
                    const THREE = window.THREE || (window.app && window.app.THREE);
                    
                    if (THREE) {
                        // VideoTextureを作成
                        const texture = new THREE.VideoTexture(video);
                        texture.minFilter = THREE.LinearFilter;
                        texture.magFilter = THREE.LinearFilter;
                        texture.format = THREE.RGBAFormat;
                        
                        // 環境球を作成
                        const geometry = new THREE.SphereGeometry(10, 60, 40);
                        geometry.scale(-1, 1, 1);
                        
                        const material = new THREE.MeshBasicMaterial({
                            map: texture,
                            side: THREE.FrontSide
                        });
                        
                        window.panoramaSphere = new THREE.Mesh(geometry, material);
                        window.app.scene.add(window.panoramaSphere);
                        
                        // 動画テクスチャの更新をアニメーションループに追加
                        window.panoramaVideoTexture = texture;
                        
                        console.log('✅ 360度動画環境球に適用完了');
                    } else {
                        // CSSフォールバック
                        video.style.cssText = `
                            position: fixed;
                            top: 0;
                            left: 0;
                            width: 100vw;
                            height: 100vh;
                            object-fit: cover;
                            z-index: -1;
                        `;
                        document.body.insertBefore(video, document.body.firstChild);
                        console.log('✅ CSS動画背景として適用完了');
                    }
                    
                    this.videoElement = video;
                    this.isVideoMode = true;
                    video.play();
                    
                    resolve();
                };
                
                video.onerror = (err) => {
                    console.error('動画読み込みエラー:', err);
                    reject(new Error('動画の読み込みに失敗しました'));
                };
                
                video.src = videoUrl;
                
            } catch (error) {
                console.error('動画背景適用エラー:', error);
                reject(error);
            }
        });
    },
    
    // 画像を360度環境球に適用
    applyBackground: async function(imageUrl) {
        return new Promise((resolve, reject) => {
            try {
                console.log('📥 画像を読み込み中...');
                
                // 既存の環境を削除
                this.remove();
                
                const isBase64 = imageUrl.startsWith('data:');
                const proxyUrl = isBase64 ? imageUrl : `/proxy?url=${encodeURIComponent(imageUrl)}`;
                
                const THREE = window.THREE || (window.app && window.app.THREE);
                
                if (!THREE) {
                    const img = new Image();
                    img.crossOrigin = 'anonymous';
                    img.onload = () => {
                        let panoramaDiv = document.getElementById('panorama-background');
                        if (!panoramaDiv) {
                            panoramaDiv = document.createElement('div');
                            panoramaDiv.id = 'panorama-background';
                            document.body.insertBefore(panoramaDiv, document.body.firstChild);
                        }
                        panoramaDiv.style.cssText = `
                            position: fixed;
                            top: 0;
                            left: 0;
                            width: 100vw;
                            height: 100vh;
                            z-index: -1;
                            background-image: url(${proxyUrl});
                            background-size: cover;
                            background-position: center;
                            background-repeat: no-repeat;
                        `;
                        
                        console.log('✅ CSS背景として適用完了');
                        this.isVideoMode = false;
                        resolve();
                    };
                    img.onerror = (err) => reject(err);
                    img.src = proxyUrl;
                    return;
                }
                
                const textureLoader = new THREE.TextureLoader();
                textureLoader.crossOrigin = 'anonymous';
                
                textureLoader.load(
                    proxyUrl,
                    (texture) => {
                        console.log('✅ テクスチャ読み込み完了');
                        
                        const geometry = new THREE.SphereGeometry(10, 60, 40);
                        geometry.scale(-1, 1, 1);
                        
                        const material = new THREE.MeshBasicMaterial({
                            map: texture,
                            side: THREE.FrontSide
                        });
                        
                        window.panoramaSphere = new THREE.Mesh(geometry, material);
                        window.app.scene.add(window.panoramaSphere);
                        
                        console.log('✅ 360度環境球に適用完了');
                        this.isVideoMode = false;
                        resolve();
                    },
                    (progress) => {
                        if (progress.total) {
                            console.log('📥 読み込み中...', Math.round((progress.loaded / progress.total) * 100) + '%');
                        }
                    },
                    (error) => {
                        console.error('テクスチャ読み込みエラー:', error);
                        reject(new Error('テクスチャの読み込みに失敗しました'));
                    }
                );
                
            } catch (error) {
                console.error('背景適用エラー:', error);
                reject(error);
            }
        });
    },
    
    // 環境を削除
    remove: function() {
        // 動画を停止・削除
        if (this.videoElement) {
            this.videoElement.pause();
            this.videoElement.src = '';
            if (this.videoElement.parentNode) {
                this.videoElement.parentNode.removeChild(this.videoElement);
            }
            this.videoElement = null;
        }
        
        // 動画テクスチャをクリア
        if (window.panoramaVideoTexture) {
            window.panoramaVideoTexture.dispose();
            window.panoramaVideoTexture = null;
        }
        
        // Three.js環境球を削除
        if (window.panoramaSphere) {
            window.app.scene.remove(window.panoramaSphere);
            window.panoramaSphere.geometry.dispose();
            if (window.panoramaSphere.material.map) {
                window.panoramaSphere.material.map.dispose();
            }
            window.panoramaSphere.material.dispose();
            window.panoramaSphere = null;
        }
        
        // CSS背景を削除
        const panoramaDiv = document.getElementById('panorama-background');
        if (panoramaDiv) {
            panoramaDiv.remove();
        }
        
        // 背景色を元に戻す
        if (window.app && window.app.renderer) {
            window.app.renderer.setClearColor(0x000000, 1);
        }
        
        this.isVideoMode = false;
        console.log('✅ 環境削除完了');
    }
};

// 360度環境UIボタン（画像版 + Veo 3動画版）
(function() {
    // 解像度選択ダイアログを表示する関数
    function showResolutionDialog(callback) {
        // オーバーレイ
        const overlay = document.createElement('div');
        overlay.id = 'resolution-dialog-overlay';
        overlay.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.7); z-index: 999999; display: flex; justify-content: center; align-items: center;';
        
        // ダイアログパネル
        const panel = document.createElement('div');
        panel.style.cssText = 'background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); border-radius: 15px; padding: 25px; width: 350px; box-shadow: 0 10px 40px rgba(0,0,0,0.5); border: 2px solid #E91E63;';
        
        panel.innerHTML = `
            <h3 style="margin: 0 0 15px 0; color: #E91E63; text-align: center; font-size: 18px;">🖼️ 360°パノラマ画像生成</h3>
            
            <div style="margin-bottom: 15px;">
                <label style="color: #fff; font-size: 13px; display: block; margin-bottom: 8px;">🎨 プロンプト（どんなシーン？）</label>
                <input type="text" id="panorama-prompt-input" placeholder="例: sunset ocean, 森の中, 宇宙ステーション" 
                    style="width: 100%; padding: 10px; border: 1px solid #E91E63; border-radius: 8px; background: #0a0a15; color: #fff; font-size: 14px; box-sizing: border-box;">
            </div>
            
            <div style="margin-bottom: 20px;">
                <label style="color: #fff; font-size: 13px; display: block; margin-bottom: 8px;">📷 解像度選択</label>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
                    <button class="res-btn" data-res="HD" style="padding: 12px; border: 2px solid #666; border-radius: 8px; background: transparent; color: #aaa; cursor: pointer; transition: all 0.2s;">
                        <div style="font-size: 14px; font-weight: bold;">HD</div>
                        <div style="font-size: 10px; opacity: 0.7;">1280×720</div>
                    </button>
                    <button class="res-btn" data-res="FHD" style="padding: 12px; border: 2px solid #666; border-radius: 8px; background: transparent; color: #aaa; cursor: pointer; transition: all 0.2s;">
                        <div style="font-size: 14px; font-weight: bold;">Full HD</div>
                        <div style="font-size: 10px; opacity: 0.7;">1920×1080</div>
                    </button>
                    <button class="res-btn" data-res="2K" style="padding: 12px; border: 2px solid #666; border-radius: 8px; background: transparent; color: #aaa; cursor: pointer; transition: all 0.2s;">
                        <div style="font-size: 14px; font-weight: bold;">2K</div>
                        <div style="font-size: 10px; opacity: 0.7;">2560×1440</div>
                    </button>
                    <button class="res-btn active" data-res="4K" style="padding: 12px; border: 2px solid #E91E63; border-radius: 8px; background: rgba(233, 30, 99, 0.2); color: #E91E63; cursor: pointer; transition: all 0.2s;">
                        <div style="font-size: 14px; font-weight: bold;">⭐ 4K</div>
                        <div style="font-size: 10px; opacity: 0.7;">3840×2160</div>
                    </button>
                </div>
            </div>
            
            <div style="display: flex; gap: 10px;">
                <button id="res-cancel-btn" style="flex: 1; padding: 12px; border: 1px solid #666; border-radius: 8px; background: transparent; color: #aaa; cursor: pointer; font-size: 14px;">キャンセル</button>
                <button id="res-generate-btn" style="flex: 2; padding: 12px; border: none; border-radius: 8px; background: linear-gradient(135deg, #E91E63 0%, #9C27B0 100%); color: white; cursor: pointer; font-size: 14px; font-weight: bold;">🖼️ 生成開始</button>
            </div>
        `;
        
        overlay.appendChild(panel);
        document.body.appendChild(overlay);
        
        // 選択された解像度
        let selectedResolution = '4K';
        
        // 解像度ボタンのイベント
        panel.querySelectorAll('.res-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                // 全ボタンの選択解除
                panel.querySelectorAll('.res-btn').forEach(b => {
                    b.style.border = '2px solid #666';
                    b.style.background = 'transparent';
                    b.style.color = '#aaa';
                    b.classList.remove('active');
                });
                // クリックしたボタンを選択
                btn.style.border = '2px solid #E91E63';
                btn.style.background = 'rgba(233, 30, 99, 0.2)';
                btn.style.color = '#E91E63';
                btn.classList.add('active');
                selectedResolution = btn.dataset.res;
            });
            
            // ホバー効果
            btn.addEventListener('mouseenter', () => {
                if (!btn.classList.contains('active')) {
                    btn.style.borderColor = '#888';
                    btn.style.color = '#ddd';
                }
            });
            btn.addEventListener('mouseleave', () => {
                if (!btn.classList.contains('active')) {
                    btn.style.borderColor = '#666';
                    btn.style.color = '#aaa';
                }
            });
        });
        
        // キャンセル
        document.getElementById('res-cancel-btn').addEventListener('click', () => {
            overlay.remove();
        });
        
        // 背景クリックで閉じる
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) overlay.remove();
        });
        
        // 生成開始
        document.getElementById('res-generate-btn').addEventListener('click', () => {
            const prompt = document.getElementById('panorama-prompt-input').value.trim();
            if (!prompt) {
                alert('プロンプトを入力してください');
                return;
            }
            overlay.remove();
            callback(prompt, selectedResolution);
        });
        
        // Enterキーで生成
        document.getElementById('panorama-prompt-input').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                document.getElementById('res-generate-btn').click();
            }
        });
        
        // フォーカス
        setTimeout(() => document.getElementById('panorama-prompt-input').focus(), 100);
    }
    
    // 画像生成ボタン
    var imgBtn = document.createElement('button');
    imgBtn.id = 'panorama-image-btn';
    imgBtn.textContent = '🖼️ 360°画像';
    imgBtn.style.cssText = 'position: fixed; top: 70px; left: 20px; z-index: 99999; padding: 10px 20px; background: linear-gradient(135deg, #E91E63 0%, #9C27B0 100%); color: white; border: none; border-radius: 5px; cursor: pointer; font-weight: bold;';
    imgBtn.onclick = function() {
        showResolutionDialog((prompt, resolution) => {
            imgBtn.textContent = `⏳ ${resolution}生成中...`;
            imgBtn.disabled = true;
            
            // 解像度を設定
            window.veo3Panorama.currentResolution = resolution;
            
            window.veo3Panorama.generate(prompt, resolution).then(() => {
                imgBtn.textContent = '🖼️ 360°画像';
                imgBtn.disabled = false;
                
                const preset = window.veo3Panorama.resolutionPresets[resolution];
                alert(`✅ 360度パノラマ画像を生成しました！\n解像度: ${preset.label}`);
            }).catch((err) => {
                imgBtn.textContent = '🖼️ 360°画像';
                imgBtn.disabled = false;
                alert('❌ エラー: ' + err.message);
            });
        });
    };
    document.body.appendChild(imgBtn);
    
    // Veo 3 動画生成ボタン
    var videoBtn = document.createElement('button');
    videoBtn.id = 'panorama-video-btn';
    videoBtn.textContent = '🎬 Veo3動画';
    videoBtn.style.cssText = 'position: fixed; top: 70px; left: 140px; z-index: 99999; padding: 10px 20px; background: linear-gradient(135deg, #FF5722 0%, #FF9800 100%); color: white; border: none; border-radius: 5px; cursor: pointer; font-weight: bold;';
    videoBtn.onclick = function() {
        var prompt = window.prompt('どんな360°動画を生成しますか？\n\n例:\n- calm ocean waves at sunset (穏やかな夕焼けの海)\n- aurora borealis in arctic night (オーロラの夜空)\n- tropical rainforest with rain (熱帯雨林)\n- floating in space near nebula (星雲の宇宙)\n\n⚠️ 生成に2-5分かかります');
        
        if (prompt) {
            videoBtn.textContent = '⏳ Veo3生成中...';
            videoBtn.disabled = true;
            
            window.veo3Panorama.generateVideo(prompt).then(() => {
                videoBtn.textContent = '🎬 Veo3動画';
                videoBtn.disabled = false;
                alert('✅ 360度パノラマ動画を生成しました！');
            }).catch((err) => {
                videoBtn.textContent = '🎬 Veo3動画';
                videoBtn.disabled = false;
                alert('❌ エラー: ' + err.message);
            });
        }
    };
    document.body.appendChild(videoBtn);
    
    // 削除ボタン
    var veo3RemoveBtn = document.createElement('button');
    veo3RemoveBtn.textContent = '🗑️ 環境削除';
    veo3RemoveBtn.style.cssText = 'position: fixed; top: 70px; left: 260px; z-index: 99999; padding: 10px 20px; background: #f44336; color: white; border: none; border-radius: 5px; cursor: pointer; font-weight: bold;';
    veo3RemoveBtn.onclick = function() {
        window.veo3Panorama.remove();
        alert('360度パノラマ環境を削除しました');
    };
    document.body.appendChild(veo3RemoveBtn);
    
    console.log('✅ Veo 3パノラマボタン追加');
})();

console.log('✅ Veo 3パノラマシステム準備完了');

// ========================================
// 9.8 AIキャラクタープロンプト自動生成機能（履歴機能付き v2.0）
// ========================================
window.characterGenerator = {
    MAX_HISTORY: 5,  // 最大履歴数
    HISTORY_KEY: 'character_prompt_history',
    
    // 履歴を取得
    getHistory: function() {
        try {
            const history = localStorage.getItem(this.HISTORY_KEY);
            return history ? JSON.parse(history) : [];
        } catch (e) {
            console.error('履歴読み込みエラー:', e);
            return [];
        }
    },
    
    // 履歴に追加（最大5件）
    addToHistory: function(name, prompt) {
        const history = this.getHistory();
        const timestamp = new Date().toLocaleString('ja-JP');
        
        // 新しいエントリを追加
        const entry = {
            name: name,
            prompt: prompt,
            timestamp: timestamp,
            id: Date.now()
        };
        
        // 先頭に追加
        history.unshift(entry);
        
        // 最大数を超えたら古いものを削除
        while (history.length > this.MAX_HISTORY) {
            history.pop();
        }
        
        // 保存
        try {
            localStorage.setItem(this.HISTORY_KEY, JSON.stringify(history));
            console.log('📚 履歴に追加:', name, '(合計:', history.length, '件)');
        } catch (e) {
            console.error('履歴保存エラー:', e);
        }
        
        return history;
    },
    
    // 履歴から削除
    removeFromHistory: function(id) {
        let history = this.getHistory();
        history = history.filter(h => h.id !== id);
        localStorage.setItem(this.HISTORY_KEY, JSON.stringify(history));
        console.log('🗑️ 履歴から削除:', id);
        return history;
    },
    
    // 履歴から復元
    restoreFromHistory: function(id) {
        const history = this.getHistory();
        const entry = history.find(h => h.id === id);
        if (entry) {
            this.apply(entry.prompt);
            console.log('🔄 履歴から復元:', entry.name);
            return entry;
        }
        return null;
    },
    
    // プロンプト名を抽出（最初の行または「」内の名前）
    extractName: function(prompt, userRequest) {
        // 【キャラクター設定】から名前を抽出
        const nameMatch = prompt.match(/[「『]([^」』]+)[」』]/);
        if (nameMatch) return nameMatch[1];
        
        // 最初の行から名前っぽいものを抽出
        const firstLine = prompt.split('\n')[0];
        const characterMatch = firstLine.match(/「([^」]+)」|『([^』]+)』|名前[：:]\s*(.+)/);
        if (characterMatch) return characterMatch[1] || characterMatch[2] || characterMatch[3];
        
        // ユーザーリクエストを使用
        return userRequest.substring(0, 20);
    },
    
    generate: async function(userRequest) {
        const apiKey = localStorage.getItem('banana_api_key');
        if (!apiKey) {
            alert('Gemini APIキーが設定されていません');
            return null;
        }
        
        console.log('🎨 キャラクタープロンプト生成中:', userRequest);
        
        const metaPrompt = `あなたはVRMキャラクターの性格設定プロンプトを作成する専門家です。

ユーザーのリクエスト: 「${userRequest}」

以下の形式で、創造的で詳細なキャラクター設定プロンプトを生成してください。
制限なく自由に発想してOKです。

【必須要素】
1. キャラクター設定（名前、性格、特徴）
2. 話し方の特徴（口調、語尾、特有の表現）
3. セリフ例（5つ以上）
4. 行動パターン（どんな時にどう反応するか）
5. 絶対ルール（返答文字数50〜120文字、日本語で返答）

プロンプトのみを出力してください。説明や前置きは不要です。`;
        
        try {
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: metaPrompt }] }],
                    generationConfig: {
                        maxOutputTokens: 2000,
                        temperature: 1.0
                    }
                })
            });
            
            const data = await response.json();
            
            if (data.candidates?.[0]?.content?.parts?.[0]?.text) {
                const generatedPrompt = data.candidates[0].content.parts[0].text;
                console.log('✅ プロンプト生成完了');
                return generatedPrompt;
            } else {
                console.error('プロンプト生成失敗:', data);
                return null;
            }
        } catch (error) {
            console.error('プロンプト生成エラー:', error);
            return null;
        }
    },
    
    apply: function(prompt, name) {
        if (!prompt) return;
        
        // localStorageに保存（現在の設定）
        localStorage.setItem('character_prompt', prompt);
        
        // Gemini/ChatGPTクライアントに適用
        if (window.app?.geminiClient) {
            window.app.geminiClient.setSystemPrompt(prompt);
            console.log('✅ Geminiに新プロンプト適用');
        }
        if (window.app?.chatGPTClient) {
            window.app.chatGPTClient.setSystemPrompt(prompt);
            console.log('✅ ChatGPTに新プロンプト適用');
        }
        
        // ★ Grok Voiceにも適用！
        if (window.grokVoiceMode && window.grokVoiceMode.enabled) {
            window.grokVoiceMode.refreshSession();
            console.log('✅ Grok Voiceに新プロンプト適用');
        }
    },
    
    // ユーザーからのリクエストで生成して適用
    createAndApply: async function(userRequest) {
        const prompt = await this.generate(userRequest);
        if (prompt) {
            const name = this.extractName(prompt, userRequest);
            this.apply(prompt, name);
            this.addToHistory(name, prompt);  // 履歴に追加
            return { prompt, name };
        }
        return null;
    },
    
    // 履歴選択UIを表示
    showHistoryUI: function() {
        const history = this.getHistory();
        
        // オーバーレイ
        const overlay = document.createElement('div');
        overlay.id = 'character-history-overlay';
        overlay.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.7); z-index: 999999; display: flex; justify-content: center; align-items: center;';
        
        // パネル
        const panel = document.createElement('div');
        panel.style.cssText = 'background: white; border-radius: 12px; padding: 20px; width: 90%; max-width: 500px; max-height: 80vh; overflow-y: auto; box-shadow: 0 10px 40px rgba(0,0,0,0.3);';
        
        // ヘッダー
        panel.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; border-bottom: 2px solid #667eea; padding-bottom: 10px;">
                <h3 style="margin: 0; color: #333;">📚 キャラクター履歴 (最大5件)</h3>
                <button id="close-history-btn" style="background: #f44336; color: white; border: none; padding: 8px 15px; border-radius: 5px; cursor: pointer; font-weight: bold;">✕</button>
            </div>
        `;
        
        // 履歴リスト
        const listContainer = document.createElement('div');
        listContainer.id = 'history-list-container';
        
        if (history.length === 0) {
            listContainer.innerHTML = '<p style="text-align: center; color: #888; padding: 30px;">履歴がありません</p>';
        } else {
            history.forEach((entry, index) => {
                const item = document.createElement('div');
                item.style.cssText = 'background: linear-gradient(135deg, #f5f7fa 0%, #e4e8eb 100%); border-radius: 8px; padding: 12px; margin-bottom: 10px; border: 1px solid #ddd;';
                item.innerHTML = `
                    <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                        <div style="flex: 1;">
                            <div style="font-weight: bold; color: #333; font-size: 14px; margin-bottom: 4px;">
                                ${index + 1}. ${entry.name}
                            </div>
                            <div style="font-size: 11px; color: #888;">${entry.timestamp}</div>
                            <div style="font-size: 11px; color: #666; margin-top: 6px; max-height: 40px; overflow: hidden; text-overflow: ellipsis;">
                                ${entry.prompt.substring(0, 100)}...
                            </div>
                        </div>
                        <div style="display: flex; flex-direction: column; gap: 4px; margin-left: 10px;">
                            <button class="history-apply-btn" data-id="${entry.id}" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer; font-size: 11px;">適用</button>
                            <button class="history-view-btn" data-id="${entry.id}" style="background: #4ecdc4; color: white; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer; font-size: 11px;">表示</button>
                            <button class="history-delete-btn" data-id="${entry.id}" style="background: #ff6b6b; color: white; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer; font-size: 11px;">削除</button>
                        </div>
                    </div>
                `;
                listContainer.appendChild(item);
            });
        }
        
        panel.appendChild(listContainer);
        
        // 現在の設定を表示するボタン
        const currentBtn = document.createElement('button');
        currentBtn.textContent = '📝 現在の設定を表示';
        currentBtn.style.cssText = 'width: 100%; padding: 10px; margin-top: 15px; background: linear-gradient(135deg, #4ecdc4 0%, #44a08d 100%); color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: bold;';
        currentBtn.onclick = () => {
            const currentPrompt = localStorage.getItem('character_prompt') || '(設定なし)';
            alert('現在の設定:\n\n' + currentPrompt.substring(0, 500) + '...');
        };
        panel.appendChild(currentBtn);
        
        overlay.appendChild(panel);
        document.body.appendChild(overlay);
        
        // イベントリスナー
        document.getElementById('close-history-btn').onclick = () => overlay.remove();
        overlay.onclick = (e) => { if (e.target === overlay) overlay.remove(); };
        
        // 適用ボタン
        document.querySelectorAll('.history-apply-btn').forEach(btn => {
            btn.onclick = () => {
                const id = parseInt(btn.dataset.id);
                const entry = this.restoreFromHistory(id);
                if (entry) {
                    alert(`✅ "${entry.name}" を適用しました！`);
                    overlay.remove();
                }
            };
        });
        
        // 表示ボタン
        document.querySelectorAll('.history-view-btn').forEach(btn => {
            btn.onclick = () => {
                const id = parseInt(btn.dataset.id);
                const entry = history.find(h => h.id === id);
                if (entry) {
                    // プロンプト表示用のテキストエリア
                    const viewOverlay = document.createElement('div');
                    viewOverlay.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.8); z-index: 9999999; display: flex; justify-content: center; align-items: center;';
                    viewOverlay.innerHTML = `
                        <div style="background: white; border-radius: 12px; padding: 20px; width: 90%; max-width: 600px; max-height: 80vh;">
                            <h3 style="margin: 0 0 10px 0; color: #333;">${entry.name}</h3>
                            <textarea readonly style="width: 100%; height: 400px; padding: 10px; border: 1px solid #ddd; border-radius: 8px; font-size: 12px; resize: none;">${entry.prompt}</textarea>
                            <button id="close-view-btn" style="width: 100%; margin-top: 10px; padding: 10px; background: #667eea; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: bold;">閉じる</button>
                        </div>
                    `;
                    document.body.appendChild(viewOverlay);
                    document.getElementById('close-view-btn').onclick = () => viewOverlay.remove();
                    viewOverlay.onclick = (e) => { if (e.target === viewOverlay) viewOverlay.remove(); };
                }
            };
        });
        
        // 削除ボタン
        document.querySelectorAll('.history-delete-btn').forEach(btn => {
            btn.onclick = () => {
                const id = parseInt(btn.dataset.id);
                if (confirm('この履歴を削除しますか？')) {
                    this.removeFromHistory(id);
                    overlay.remove();
                    this.showHistoryUI();  // 再表示
                }
            };
        });
    }
};

// キャラクター生成UIボタン（2つのボタン：生成 と 履歴）
(function() {
    // 生成ボタン
    const btn = document.createElement('button');
    btn.id = 'character-generator-btn';
    btn.textContent = '🎨 キャラ生成';
    btn.style.cssText = 'position: fixed; top: 340px; left: 20px; z-index: 99999; padding: 10px 20px; background: linear-gradient(135deg, #FF6B6B 0%, #FFE66D 100%); color: #333; border: none; border-radius: 5px; cursor: pointer; font-weight: bold;';
    btn.onclick = async function() {
        const request = window.prompt('どんなキャラクターを作りたい？\n\n例:\n- ツンデレなメイド\n- 瞀想コーチの先生\n- 中二病の魔王\n- 関西弁のおばちゃん\n- ヤンデレ彼氏\n- 古代の魔女');
        
        if (request) {
            btn.textContent = '⚙️ 生成中...';
            btn.disabled = true;
            
            const result = await window.characterGenerator.createAndApply(request);
            
            if (result) {
                alert(`✅ キャラクター「${result.name}」を生成しました！\n\n履歴に自動保存されました。`);
            } else {
                alert('キャラクター生成に失敗しました');
            }
            
            btn.textContent = '🎨 キャラ生成';
            btn.disabled = false;
        }
    };
    document.body.appendChild(btn);
    
    // 履歴ボタン
    const historyBtn = document.createElement('button');
    historyBtn.id = 'character-history-btn';
    historyBtn.textContent = '📚 履歴';
    historyBtn.style.cssText = 'position: fixed; top: 380px; left: 20px; z-index: 99999; padding: 8px 15px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border: none; border-radius: 5px; cursor: pointer; font-size: 12px;';
    historyBtn.onclick = function() {
        window.characterGenerator.showHistoryUI();
    };
    document.body.appendChild(historyBtn);
    
    console.log('✅ キャラクター生成ボタン追加（履歴機能付き）');
})();

console.log('✅ AIキャラクタープロンプト生成機能準備完了（履歴機能 v2.0）');

// ========================================
// 完了メッセージ
// ========================================
console.log('');
console.log('🎉 ========================================');
console.log('✅ VRM AI Viewer カスタム機能が有効になりました！');
console.log('========================================');

// ========================================
// 11. 画面キャプチャ → AI認識機能
// 「これどう思う？」で画面をキャプチャしてAIに送信
// ========================================

window.screenCapture = {
    // 画面をキャプチャしてBase64で返す
    capture: async function() {
        return new Promise((resolve) => {
            const canvas = document.querySelector('canvas');
            if (!canvas) {
                console.error('❌ Canvasが見つかりません');
                resolve(null);
                return;
            }
            
            // WebGLのpreserveDrawingBufferがfalseの場合、
            // レンダリング後にキャプチャする必要がある
            if (window.app && window.app.renderer) {
                window.app.renderer.render(window.app.scene, window.app.camera);
            }
            
            // Canvasを画像に変換
            try {
                const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
                const base64 = dataUrl.split(',')[1];
                console.log('📸 画面キャプチャ完了');
                resolve(base64);
            } catch (e) {
                console.error('❌ キャプチャエラー:', e);
                resolve(null);
            }
        });
    },
    
    // ★ 画面を客観的にテキスト化（Grok用）
    describeScreen: async function() {
        const apiKey = localStorage.getItem('banana_api_key');
        if (!apiKey) {
            console.error('Gemini APIキーが設定されていません');
            return null;
        }
        
        console.log('📸 画面をキャプチャ中（説明用）...');
        const imageBase64 = await this.capture();
        
        if (!imageBase64) {
            return null;
        }
        
        console.log('🧠 Gemini Visionで画面を説明中...');
        
        try {
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    contents: [{
                        parts: [
                            {
                                inlineData: {
                                    mimeType: 'image/jpeg',
                                    data: imageBase64
                                }
                            },
                            {
                                text: `この画面に映っているものを客観的に説明してください。
あなたはVRMキャラクターの「目」として機能します。

以下の情報を含めて、簡潔に（100文字以内）説明してください：
- 背景や環境（どんな場所か）
- 画面に見える物体やキャラクター
- 全体の雰囲気や色合い
- 特徴的な要素

説明のみを出力してください。感想や返答は不要です。`
                            }
                        ]
                    }],
                    generationConfig: {
                        maxOutputTokens: 150,
                        temperature: 0.3
                    }
                })
            });
            
            const data = await response.json();
            
            if (data.candidates && data.candidates[0] && data.candidates[0].content) {
                const description = data.candidates[0].content.parts[0].text;
                console.log('✅ 画面説明取得:', description);
                return description;
            } else {
                console.error('Gemini応答エラー:', data);
                return null;
            }
            
        } catch (error) {
            console.error('Gemini APIエラー:', error);
            return null;
        }
    },
    
    // キャプチャしてGeminiに送信（従来の方法）
    analyzeWithGemini: async function(userQuestion) {
        const apiKey = localStorage.getItem('banana_api_key');
        if (!apiKey) {
            return 'Gemini APIキーが設定されていません。';
        }
        
        console.log('📸 画面をキャプチャ中...');
        const imageBase64 = await this.capture();
        
        if (!imageBase64) {
            return '画面のキャプチャに失敗しました。';
        }
        
        // ★ 性格設定を取得
        const characterPrompt = localStorage.getItem('character_prompt') || '';
        
        console.log('🧠 Geminiに送信中...（性格設定反映）');
        
        try {
            // ★ プロンプトを構築（性格設定を含む）
            let systemPrompt = '';
            if (characterPrompt) {
                systemPrompt = `【あなたの性格設定】\n${characterPrompt}\n\n`;
            }
            
            const fullPrompt = `${systemPrompt}【状況】
あなたはVRMキャラクターとして、今ユーザーと一緒に画面を見ています。
ユーザーが今の画面について聴いています。

【ユーザーの質問】
「${userQuestion}」

【指示】
画面に見えるものを認識して、上記の性格設定に従ってキャラクターとして感想やコメントを日本語で答えてください。
性格設定の口調・話し方・語尾を必ず反映してください。
短く（50〜120文字以内）答えてください。`;
            
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    contents: [{
                        parts: [
                            {
                                inlineData: {
                                    mimeType: 'image/jpeg',
                                    data: imageBase64
                                }
                            },
                            {
                                text: fullPrompt
                            }
                        ]
                    }],
                    generationConfig: {
                        maxOutputTokens: 200,
                        temperature: 0.9
                    }
                })
            });
            
            const data = await response.json();
            
            if (data.candidates && data.candidates[0] && data.candidates[0].content) {
                const text = data.candidates[0].content.parts[0].text;
                console.log('✅ Gemini応答:', text);
                return text;
            } else {
                console.error('Gemini応答エラー:', data);
                return 'うーん、ちょっとわからなかった...。';
            }
            
        } catch (error) {
            console.error('Gemini APIエラー:', error);
            return 'エラーが起きちゃった...。';
        }
    },
    
    // ★ Grok Voice Mode用：画面説明 + 質問をGrokに送信（性格設定反映）
    analyzeWithGrok: async function(userQuestion) {
        console.log('👁️ Grok Vision: 画面認識開始（性格設定反映）');
        
        // 思考中表示
        showThinkingMessage('👁️ 画面を見ているよ...');
        
        // Step 1: Gemini Visionで画面を「見る」（テキスト化）
        const screenDescription = await this.describeScreen();
        
        removeThinkingMessage();
        
        if (!screenDescription) {
            console.error('❌ 画面説明の取得に失敗');
            addAIMessage('あれ？画面がよく見えなかった...');
            return null;
        }
        
        // ★ 性格設定を取得
        const characterPrompt = localStorage.getItem('character_prompt') || '';
        
        // Step 2: 画面説明 + ユーザーの質問 + 性格設定をGrokに送信
        let contextMessage = '';
        
        if (characterPrompt) {
            // 性格設定がある場合は含める
            contextMessage = `【あなたの性格設定・話し方】
${characterPrompt}

【今あなたの目に見えている景色】
${screenDescription}

【ユーザーからの質問】
「${userQuestion}」

【指示】
あなたは今この場所にいるキャラクターです。上記の景色があなたの視界に映っています。
性格設定に従った口調・語尾・話し方で、見えている景色を踏まえて自然に返答してください。`;
        } else {
            // 性格設定がない場合は従来通り
            contextMessage = `【今あなたの目に見えている景色】
${screenDescription}

【ユーザーからの質問】
「${userQuestion}」

あなたは今この場所にいるキャラクターです。上記の景色があなたの視界に映っています。
キャラクターとして、見えている景色を踏まえて自然に返答してください。`;
        }
        
        console.log('🚀 Grokに画面情報を送信');
        console.log('  - 画面説明:', screenDescription);
        console.log('  - 質問:', userQuestion);
        
        // Grokに送信（音声で返答される）
        if (window.grokVoiceMode && window.grokVoiceMode.client && window.grokVoiceMode.enabled) {
            window.grokVoiceMode.sendText(contextMessage);
            return screenDescription;
        } else {
            console.error('❌ Grok Voice Modeが有効ではありません');
            addAIMessage('Grok Voiceモードがオフみたい...');
            return null;
        }
    }
};

// 「これどう思う？」等のトリガーワードを検出
window.visionTriggerPatterns = [
    /これ.*どう/i,
    /今.*見え/i,
    /画面.*見/i,
    /何が.*見え/i,
    /どう.*見え/i,
    /見て.*どう/i,
    /どんな.*見え/i,
    /周り.*どう/i,
    /景色.*どう/i,
    /この場所/i,
    /どこにいる/i,
    /どんな状況/i
];

// トリガーチェック関数
window.isVisionTrigger = function(text) {
    return window.visionTriggerPatterns.some(pattern => pattern.test(text));
};

// ユーザー入力を監視してトリガーを検出
(function() {
    // 既存のチャット送信をフック
    const hookChatSubmit = () => {
        const chatPanel = document.getElementById('chat-panel');
        if (!chatPanel) return;
        
        const input = chatPanel.querySelector('input[type="text"]');
        const form = chatPanel.querySelector('form') || input?.closest('form');
        
        if (input && !input._visionHooked) {
            input._visionHooked = true;
            
            input.addEventListener('keypress', async (e) => {
                if (e.key === 'Enter') {
                    const text = input.value.trim();
                    
                    if (window.isVisionTrigger(text)) {
                        e.preventDefault();
                        e.stopPropagation();
                        
                        console.log('👁️ Visionトリガー検出:', text);
                        
                        // 入力をクリア
                        input.value = '';
                        
                        // ★ Grok Voice Modeが有効ならGrokに送信
                        if (window.grokVoiceMode && window.grokVoiceMode.enabled) {
                            console.log('🚀 Grok Vision モードで処理');
                            await window.screenCapture.analyzeWithGrok(text);
                            return false;
                        }
                        
                        // 従来のGemini処理
                        // 「見てるよ」表示
                        showThinkingMessage('👁️ ちょっと待ってね、今見てるよ...');
                        
                        // 画面キャプチャしてAIに送信
                        const response = await window.screenCapture.analyzeWithGemini(text);
                        
                        // AIメッセージとして表示
                        removeThinkingMessage();
                        addAIMessage(response);
                        
                        // 表情は ai-chat-auto-motion.js が制御するため、ここでは処理しない
                        console.log('ℹ️ Vision: 表情はai-chat-auto-motion.jsが制御');
                        
                        // TTSで話す（Gemini一体化モード優先）
                        console.log('🔊 Vision TTSチェック:');
                        console.log('  - geminiMode:', window.app?.geminiMode);
                        console.log('  - geminiClient:', !!window.app?.geminiClient);
                        console.log('  - response:', response.substring(0, 30) + '...');
                        
                        try {
                            if (window.app && window.app.geminiMode && window.app.geminiClient) {
                                // Gemini一体化モードのTTSを使用
                                console.log('🎤 Vision応答をGemini TTSで再生開始...');
                                const audioResult = await window.app.geminiClient.generateAudio(response);
                                console.log('🎤 音声生成結果:', audioResult);
                                if (audioResult && audioResult.audioData) {
                                    console.log('🎤 音声データあり、再生開始...');
                                    await window.app.geminiClient.playAudio(
                                        audioResult.audioData,
                                        () => {
                                            console.log('👄 リップシンク開始');
                                            if (window.app.startLipSync) window.app.startLipSync();
                                        },
                                        () => {
                                            console.log('👄 リップシンク終了');
                                            if (window.app.stopLipSync) window.app.stopLipSync();
                                        }
                                    );
                                    console.log('🎤 再生完了');
                                } else {
                                    console.error('❌ 音声データがない');
                                }
                            } else if (window.googleTTS && window.googleTTS.enabled) {
                                console.log('🎤 Google TTSで再生');
                                window.googleTTS.speak(response);
                            } else if (window.openaiTTS && window.openaiTTS.enabled) {
                                console.log('🎤 OpenAI TTSで再生');
                                window.openaiTTS.speak(response);
                            } else {
                                // どのTTSもONじゃない場合、自動でGemini TTSを使う
                                console.log('🎤 自動でGemini TTS Flashを使用');
                                const apiKey = localStorage.getItem('banana_api_key');
                                if (apiKey) {
                                    // 直接Gemini TTS APIを呼ぶ
                                    const ttsResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-tts:generateContent?key=${apiKey}`, {
                                        method: 'POST',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({
                                            contents: [{ parts: [{ text: response }] }],
                                            generationConfig: {
                                                responseModalities: ["AUDIO"],
                                                speechConfig: {
                                                    voiceConfig: {
                                                        prebuiltVoiceConfig: { voiceName: 'Zephyr' }
                                                    }
                                                }
                                            }
                                        })
                                    });
                                    const ttsData = await ttsResponse.json();
                                    
                                    if (ttsData.candidates?.[0]?.content?.parts) {
                                        for (const part of ttsData.candidates[0].content.parts) {
                                            if (part.inlineData?.data) {
                                                console.log('✅ Vision TTS音声生成完了');
                                                const base64 = part.inlineData.data;
                                                const byteChars = atob(base64);
                                                const byteArr = new Uint8Array(byteChars.length);
                                                for (let i = 0; i < byteChars.length; i++) {
                                                    byteArr[i] = byteChars.charCodeAt(i);
                                                }
                                                
                                                const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
                                                const samples = byteArr.length / 2;
                                                const audioBuffer = audioCtx.createBuffer(1, samples, 24000);
                                                const channelData = audioBuffer.getChannelData(0);
                                                const dataView = new DataView(byteArr.buffer);
                                                
                                                for (let i = 0; i < samples; i++) {
                                                    channelData[i] = dataView.getInt16(i * 2, true) / 32768.0;
                                                }
                                                
                                                // リップシンク
                                                const mouthPattern = [0.1, 0.3, 0.05, 0.15, 0.25, 0.5, 0.2, 1.0, 0.15, 0.25];
                                                let pi = 0;
                                                const lipInterval = setInterval(() => {
                                                    if (window.app?.vrm?.expressionManager) {
                                                        window.app.vrm.expressionManager.setValue('aa', mouthPattern[pi]);
                                                    }
                                                    pi = (pi + 1) % mouthPattern.length;
                                                }, 300);
                                                
                                                const source = audioCtx.createBufferSource();
                                                source.buffer = audioBuffer;
                                                source.connect(audioCtx.destination);
                                                source.onended = () => {
                                                    clearInterval(lipInterval);
                                                    if (window.app?.vrm?.expressionManager) {
                                                        window.app.vrm.expressionManager.setValue('aa', 0);
                                                    }
                                                    audioCtx.close();
                                                    console.log('🎤 Vision TTS再生完了');
                                                };
                                                source.start(0);
                                                console.log('🎤 Vision TTS再生中...');
                                            }
                                        }
                                    }
                                } else {
                                    console.log('⚠️ APIキーがないためTTSスキップ');
                                }
                            }
                        } catch (ttsError) {
                            console.error('❌ Vision TTSエラー:', ttsError);
                        }
                        
                        return false;
                    }
                }
            }, true); // capture phaseで先に処理
            
            console.log('✅ Visionトリガーフック完了');
        }
    };
    
    // 思考中メッセージ表示
    window.showThinkingMessage = function(text) {
        const messagesContainer = document.querySelector('.messages-container') || 
                                   document.querySelector('#chat-panel .messages') ||
                                   document.querySelector('#chat-panel > div:nth-child(2)');
        if (!messagesContainer) return;
        
        const thinkingDiv = document.createElement('div');
        thinkingDiv.className = 'message ai thinking-message';
        thinkingDiv.innerHTML = `<span class="thinking-dots">${text}</span>`;
        thinkingDiv.style.cssText = 'padding: 10px; margin: 5px 0; background: #f0f0f0; border-radius: 8px; color: #666; font-style: italic;';
        messagesContainer.appendChild(thinkingDiv);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    };
    
    // 思考中メッセージ削除
    window.removeThinkingMessage = function() {
        const thinking = document.querySelector('.thinking-message');
        if (thinking) thinking.remove();
    };
    
    // AIメッセージ追加
    window.addAIMessage = function(text) {
        const messagesContainer = document.querySelector('.messages-container') || 
                                   document.querySelector('#chat-panel .messages') ||
                                   document.querySelector('#chat-panel > div:nth-child(2)');
        if (!messagesContainer) return;
        
        const msgDiv = document.createElement('div');
        msgDiv.className = 'message ai';
        msgDiv.innerHTML = `<strong>AI</strong> ${text}`;
        msgDiv.style.cssText = 'padding: 10px; margin: 5px 0; background: #e3f2fd; border-radius: 8px;';
        messagesContainer.appendChild(msgDiv);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    };
    
    // 定期的にフックを試みる
    setInterval(hookChatSubmit, 1000);
    
    console.log('✅ Visionトリガーシステム準備完了');
})();

console.log('✅ 画面キャプチャAI認識機能準備完了');
console.log('  👁️ Grok Voice有効時: 画面→テキスト→Grok音声応答');
console.log('  💎 Grok Voice無効時: 画面→Gemini応答→TTS');

// ========================================
// 12. Grok Voice Agent API（xAI 高速リアルタイム音声）
// ========================================
window.grokVoiceMode = {
    enabled: false,
    client: null,
    voice: 'Ara', // Ara, Rex, Sal, Eve, Leo
    
    // リップシンク用の表情名（VRMによって異なる可能性）
    mouthExpressionName: 'aa',
    
    // リップシンク用の表情名を検出
    detectMouthExpression: function() {
        if (!window.app || !window.app.vrm || !window.app.vrm.expressionManager) {
            return 'aa';
        }
        
        const em = window.app.vrm.expressionManager;
        const expressions = em._expressionMap ? Object.keys(em._expressionMap) : [];
        
        // 優先順位で検索
        const candidates = ['aa', 'A', 'Fcl_MTH_A', 'vrc.v_aa', 'mouth_a', 'Aa'];
        for (const name of candidates) {
            if (expressions.includes(name)) {
                console.log('👄 口表情検出:', name);
                return name;
            }
        }
        
        // 見つからない場合はデフォルト
        console.log('⚠️ 口表情が見つかりません、デフォルト: aa');
        return 'aa';
    },
    
    // リップシンク用の状態
    lipSync: {
        currentValue: 0,      // 現在の口の開き具合
        targetValue: 0,       // 目標値
        smoothing: 0.3,       // スムージング係数（0-1、大きいほど追従が早い）
        amplitudeHistory: [], // 振幅履歴（平滑化用）
        historySize: 5,       // 履歴サイズ
        isActive: false,      // リップシンク中かどうか
        silenceTimer: null,   // 無音検出タイマー
        silenceThreshold: 0.01, // 無音判定閾値
        silenceDelay: 150,    // 無音後に口を閉じるまでの時間(ms)
    },
    
    // 利用可能な声
    voices: {
        'Ara': { type: 'Female', tone: 'Warm, friendly', description: 'デフォルト、バランスの取れた会話向け' },
        'Rex': { type: 'Male', tone: 'Confident, clear', description: 'プロフェッショナル、ビジネス向け' },
        'Sal': { type: 'Neutral', tone: 'Smooth, balanced', description: '汎用性の高い声' },
        'Eve': { type: 'Female', tone: 'Energetic, upbeat', description: '元気で活発、インタラクティブ向け' },
        'Leo': { type: 'Male', tone: 'Authoritative, strong', description: '威厳のある、説明・指示向け' }
    },
    
    getApiKey: function() {
        return localStorage.getItem('grok_api_key');
    },
    
    toggle: async function() {
        const apiKey = this.getApiKey();
        if (!apiKey) {
            alert('⚠️ Grok APIキーが設定されていません。\n「🔑 API設定」パネルで「🚀 Grok (xAI) API Key」を入力してください。');
            return false;
        }
        
        if (this.enabled) {
            // OFF
            await this.disconnect();
            return false;
        } else {
            // ON
            return await this.connect();
        }
    },
    
    connect: async function() {
        const apiKey = this.getApiKey();
        if (!apiKey) return false;
        
        try {
            console.log('🚀 Grok Voice Agent API 接続中...');
            
            // GrokRealtimeClientを動的にインポート
            const { GrokRealtimeClient } = await import('./grok-realtime-client.js?v=4.7');
            
            this.client = new GrokRealtimeClient(
                apiKey,
                (audioData) => this.handleAudio(audioData),
                (text) => this.handleText(text),
                this.voice,
                (userText) => this.handleUserSpeech(userText)  // ユーザー発話コールバック
            );
            
            await this.client.connect();
            await this.client.startMicrophone();
            
            // リップシンク更新ループ開始
            this.startLipSyncLoop();
            
            this.enabled = true;
            console.log('✅ Grok Voice Agent 接続完了！');
            console.log('🎙️ 使用中の声:', this.voice, this.voices[this.voice]);
            console.log('👄 高品質リップシンク有効');
            
            // ★ VRMの利用可能な表情を確認
            if (window.app && window.app.vrm && window.app.vrm.expressionManager) {
                const em = window.app.vrm.expressionManager;
                const expressions = em._expressionMap ? Object.keys(em._expressionMap) : [];
                console.log('👄 VRM利用可能表情:', expressions);
                
                // 口表情名を検出して保存
                this.mouthExpressionName = this.detectMouthExpression();
                console.log('👄 使用する口表情:', this.mouthExpressionName);
            }
            
            return true;
        } catch (error) {
            console.error('❌ Grok Voice Agent 接続エラー:', error);
            alert('Grok Voice Agentの接続に失敗しました。\nAPIキーを確認してください。');
            this.enabled = false;
            return false;
        }
    },
    
    disconnect: async function() {
        // リップシンクループ停止
        this.stopLipSyncLoop();
        
        if (this.client) {
            this.client.disconnect();
            this.client = null;
        }
        this.enabled = false;
        
        // 口を閉じる
        if (window.app && window.app.vrm && window.app.vrm.expressionManager) {
            window.app.vrm.expressionManager.setValue('aa', 0);
        }
        
        console.log('🔌 Grok Voice Agent 切断');
    },
    
    // 🎵 高品質リップシンク - 音声データ処理
    handleAudio: function(audioData) {
        // デバッグ：呼び出し確認
        // console.log('👄 handleAudio呼び出し! データ長:', audioData ? audioData.length : 0);
        
        if (!audioData || audioData.length === 0) {
            return;
        }
        
        // RMS（二乗平均平方根）で振幅を計算 - より正確な音量測定
        let sumSquares = 0;
        for (let i = 0; i < audioData.length; i++) {
            sumSquares += audioData[i] * audioData[i];
        }
        const rms = Math.sqrt(sumSquares / audioData.length);
        
        // 振幅履歴に追加（平滑化用）
        this.lipSync.amplitudeHistory.push(rms);
        if (this.lipSync.amplitudeHistory.length > this.lipSync.historySize) {
            this.lipSync.amplitudeHistory.shift();
        }
        
        // 移動平均で平滑化
        const avgAmplitude = this.lipSync.amplitudeHistory.reduce((a, b) => a + b, 0) 
                            / this.lipSync.amplitudeHistory.length;
        
        // 目標値を設定（非線形マッピングでより自然に）
        // 小さい音は控えめに、大きい音ははっきり開く
        const normalized = Math.min(avgAmplitude * 15, 1.0);
        const curved = Math.pow(normalized, 0.7); // 非線形カーブ
        this.lipSync.targetValue = curved;
        
        // デバッグログ（毎回は多すぎるので省略）
        // console.log('👄 RMS:', rms.toFixed(4), '目標:', curved.toFixed(2));
        
        // アクティブフラグをセット
        this.lipSync.isActive = true;
        
        // 無音タイマーをリセット
        if (this.lipSync.silenceTimer) {
            clearTimeout(this.lipSync.silenceTimer);
        }
        
        // ★ 直接VRMに適用
        if (window.app && window.app.vrm && window.app.vrm.expressionManager) {
            const em = window.app.vrm.expressionManager;
            const mouthName = this.mouthExpressionName || 'aa';
            em.setValue(mouthName, curved);
            // ★ 重要：update()を呼ばないと反映されない
            em.update();
        }
        
        // 無音検出 - 一定時間音がなければ口を閉じる
        if (avgAmplitude < this.lipSync.silenceThreshold) {
            const self = this;
            this.lipSync.silenceTimer = setTimeout(() => {
                self.lipSync.targetValue = 0;
                self.lipSync.isActive = false;
                // 口を閉じる
                if (window.app && window.app.vrm && window.app.vrm.expressionManager) {
                    const em = window.app.vrm.expressionManager;
                    em.setValue('aa', 0);
                    em.update();
                }
            }, this.lipSync.silenceDelay);
        }
    },
    
    // 🔄 リップシンク更新ループ（60fps）
    lipSyncLoopId: null,
    
    startLipSyncLoop: function() {
        const self = this;
        
        const update = () => {
            if (!self.enabled) return;
            
            // スムーズ補間
            const diff = self.lipSync.targetValue - self.lipSync.currentValue;
            self.lipSync.currentValue += diff * self.lipSync.smoothing;
            
            // 非常に小さい値は0にクランプ（チラツキ防止）
            if (self.lipSync.currentValue < 0.01) {
                self.lipSync.currentValue = 0;
            }
            
            // VRMに適用
            if (window.app && window.app.vrm && window.app.vrm.expressionManager) {
                // メインの口開け（aa）
                window.app.vrm.expressionManager.setValue('aa', self.lipSync.currentValue);
                
                // 口の形のバリエーション（オプション - より自然に）
                // 大きく開いている時は「お」の形も少し混ぜる
                const ohValue = self.lipSync.currentValue > 0.5 
                    ? (self.lipSync.currentValue - 0.5) * 0.4 
                    : 0;
                window.app.vrm.expressionManager.setValue('oh', ohValue);
            }
            
            self.lipSyncLoopId = requestAnimationFrame(update);
        };
        
        update();
        console.log('👄 リップシンクループ開始');
    },
    
    stopLipSyncLoop: function() {
        if (this.lipSyncLoopId) {
            cancelAnimationFrame(this.lipSyncLoopId);
            this.lipSyncLoopId = null;
        }
        
        // 履歴クリア
        this.lipSync.amplitudeHistory = [];
        this.lipSync.currentValue = 0;
        this.lipSync.targetValue = 0;
        this.lipSync.isActive = false;
        
        if (this.lipSync.silenceTimer) {
            clearTimeout(this.lipSync.silenceTimer);
            this.lipSync.silenceTimer = null;
        }
        
        console.log('👄 リップシンクループ停止');
    },
    
    // Grok応答テキストの蓄積用
    grokResponseBuffer: '',
    grokResponseTimer: null,
    
    // ★ 感情表情の現在値（徐々に変化させるため）
    currentEmotion: {
        happy: 0,
        angry: 0,
        sad: 0,
        relaxed: 0,
        surprised: 0
    },
    emotionDecayTimer: null,
    
    // ★ テキストから感情を分析（キーワードベース + 強度判定）
    analyzeEmotion: function(text) {
        const emotions = {
            happy: 0,
            angry: 0,
            sad: 0,
            relaxed: 0,
            surprised: 0
        };
        
        // 感情キーワードと強度マッピング
        const patterns = {
            happy: {
                strong: ['最高', '大好き', 'すごく嬉しい', 'やったー', '素晴らしい', '幸せ', 'わーい', '楽しい'],
                medium: ['嬉しい', '良い', 'いいね', 'ありがとう', 'ふふ', 'へへ', '笑', 'www', 'ｗｗ'],
                weak: ['うん', 'そう', 'ね', 'よかった']
            },
            angry: {
                strong: ['ふざけるな', '許せない', '最悪', 'むかつく', '怒り'],
                medium: ['嫌い', 'うざい', 'イラッ', 'もう', 'ちょっと'],
                weak: ['え？', 'は？']
            },
            sad: {
                strong: ['悲しい', '辛い', '泣きたい', '寂しい', '残念'],
                medium: ['ごめん', 'すまない', '申し訳', 'しょんぼり'],
                weak: ['うーん', 'そっか']
            },
            relaxed: {
                strong: ['のんびり', 'ゆっくり', 'まったり', '癒される', '落ち着く'],
                medium: ['...', '〜', 'ふぅ', 'なのじゃ', 'じゃよ', 'じゃな'],
                weak: ['そうね', 'かな']
            },
            surprised: {
                strong: ['えええ', 'まさか', '信じられない', 'びっくり', '衝撃'],
                medium: ['え！', 'おお', 'へぇ', 'すごい', '本当'],
                weak: ['あ', 'お']
            }
        };
        
        const lowerText = text.toLowerCase();
        
        // 各感情のスコアを計算
        for (const [emotion, levels] of Object.entries(patterns)) {
            for (const word of levels.strong) {
                if (text.includes(word)) emotions[emotion] = Math.max(emotions[emotion], 0.9);
            }
            for (const word of levels.medium) {
                if (text.includes(word)) emotions[emotion] = Math.max(emotions[emotion], 0.5);
            }
            for (const word of levels.weak) {
                if (text.includes(word)) emotions[emotion] = Math.max(emotions[emotion], 0.2);
            }
        }
        
        // 感嘆符・疑問符で強調
        const exclamationCount = (text.match(/！|!/g) || []).length;
        const questionCount = (text.match(/？|\?/g) || []).length;
        
        if (exclamationCount > 0) {
            // 最も高い感情を強調
            const maxEmotion = Object.entries(emotions).reduce((a, b) => a[1] > b[1] ? a : b);
            if (maxEmotion[1] > 0) {
                emotions[maxEmotion[0]] = Math.min(emotions[maxEmotion[0]] + exclamationCount * 0.1, 1.0);
            } else {
                emotions.happy += exclamationCount * 0.15;
            }
        }
        
        if (questionCount > 0) {
            emotions.surprised = Math.max(emotions.surprised, 0.3);
        }
        
        // デフォルト：何も検出されなければ軽いリラックス
        const total = Object.values(emotions).reduce((a, b) => a + b, 0);
        if (total < 0.1) {
            emotions.relaxed = 0.3;
        }
        
        console.log('🎭 感情分析結果:', emotions);
        return emotions;
    },
    
    // ★ 感情表情をVRMに適用（スムーズ遷移）
    applyEmotion: function(emotions) {
        if (!window.app || !window.app.vrm || !window.app.vrm.expressionManager) {
            return;
        }
        
        const em = window.app.vrm.expressionManager;
        const smoothing = 0.3; // 急激な変化を防ぐ
        
        // 各感情をスムーズに適用
        for (const [emotion, targetValue] of Object.entries(emotions)) {
            const current = this.currentEmotion[emotion] || 0;
            const newValue = current + (targetValue - current) * smoothing;
            this.currentEmotion[emotion] = newValue;
            
            // VRMに適用
            try {
                em.setValue(emotion, newValue);
            } catch (e) {
                // この表情がない場合は無視
            }
        }
        
        // 更新を反映
        em.update();
        
        console.log('😊 表情適用:', 
            Object.entries(this.currentEmotion)
                .filter(([k, v]) => v > 0.1)
                .map(([k, v]) => `${k}:${v.toFixed(2)}`)
                .join(', ') || 'neutral'
        );
    },
    
    // ★ 感情を徐々にリセット
    startEmotionDecay: function() {
        // 前のタイマーをクリア
        if (this.emotionDecayTimer) {
            clearTimeout(this.emotionDecayTimer);
        }
        
        // 3秒後から徐々に感情をリセット
        this.emotionDecayTimer = setTimeout(() => {
            const decay = () => {
                let hasEmotion = false;
                
                for (const emotion of Object.keys(this.currentEmotion)) {
                    if (this.currentEmotion[emotion] > 0.01) {
                        this.currentEmotion[emotion] *= 0.9; // 10%ずつ減衰
                        hasEmotion = true;
                    } else {
                        this.currentEmotion[emotion] = 0;
                    }
                }
                
                // VRMに適用
                if (window.app && window.app.vrm && window.app.vrm.expressionManager) {
                    const em = window.app.vrm.expressionManager;
                    for (const [emotion, value] of Object.entries(this.currentEmotion)) {
                        try {
                            em.setValue(emotion, value);
                        } catch (e) {}
                    }
                    em.update();
                }
                
                // まだ感情が残っていれば続ける
                if (hasEmotion && this.enabled) {
                    setTimeout(decay, 100);
                }
            };
            decay();
        }, 3000);
    },
    
    handleText: function(text) {
        // Grokの応答はストリーミングで断片的に届くので蓄積
        this.grokResponseBuffer += text;
        
        // 前のタイマーをクリア
        if (this.grokResponseTimer) {
            clearTimeout(this.grokResponseTimer);
        }
        
        // 500ms応答がなければ完了とみなす
        this.grokResponseTimer = setTimeout(() => {
            let fullResponse = this.grokResponseBuffer.trim();
            if (fullResponse) {
                console.log('📝 Grok応答完了:', fullResponse);
                
                // ★ v4.4: テキスト内のplay_motion()やchange_clothing()などのツール呼び出しを検出して実行
                fullResponse = this._interceptAndExecuteToolCalls(fullResponse);
                
                // ★ 感情分析と表情適用（既存のキーワードベース）
                const emotions = this.analyzeEmotion(fullResponse);
                this.applyEmotion(emotions);
                this.startEmotionDecay(); // 徐々にリセット
                
                // 🚀 ai-chat-auto-motion.js に委譲！（モーション選択）
                if (window.AIChatAutoMotion && window.AIChatAutoMotion.processAIResponse) {
                    console.log('🎬 Grok応答をai-chat-auto-motionに委譲');
                    window.AIChatAutoMotion.processAIResponse(fullResponse);
                } else {
                    console.warn('⚠️ AIChatAutoMotion.processAIResponseが利用不可');
                }
                
                // チャットUIにGrok応答を追加（ツールテキスト除去済み）
                const cleanResponse = fullResponse.trim();
                if (cleanResponse) {
                    const messagesContainer = document.querySelector('.messages-container') || 
                                               document.querySelector('#chat-panel .messages') ||
                                               document.querySelector('#chat-panel > div:nth-child(2)');
                    if (messagesContainer) {
                        const msgDiv = document.createElement('div');
                        msgDiv.className = 'message ai';
                        msgDiv.innerHTML = `<strong>AI</strong> ${cleanResponse}`;
                        msgDiv.style.cssText = 'padding: 10px; margin: 5px 0; background: #e3f2fd; border-radius: 8px;';
                        messagesContainer.appendChild(msgDiv);
                        messagesContainer.scrollTop = messagesContainer.scrollHeight;
                    }
                }
                
                // ChatGPTの会話履歴に追加
                if (window.app && window.app.chatGPTClient) {
                    window.app.chatGPTClient.conversationHistory.push({
                        role: 'assistant',
                        content: fullResponse
                    });
                }
            }
            this.grokResponseBuffer = '';
        }, 500);
    },
    
    // ★ v4.4: テキスト内のツール呼び出しを検出して実行し、テキストから除去
    _interceptAndExecuteToolCalls: function(text) {
        let cleanText = text;
        
        // play_motion(モーション名) を検出
        const motionRegex = /play_motion\s*\(\s*["']?([^)"']+)["']?\s*\)/gi;
        let motionMatch;
        while ((motionMatch = motionRegex.exec(text)) !== null) {
            const motionName = motionMatch[1].trim();
            console.log('🎭 テキストからモーション検出・実行:', motionName);
            
            // grokExtendedToolsでモーションを実行
            if (window.grokExtendedTools) {
                window.grokExtendedTools.handleFunctionCall('play_motion', { 
                    motion_name: motionName 
                });
            } else {
                // フォールバック: loadAndPlayVRMAで検索
                this._fallbackPlayMotion(motionName);
            }
            
            // テキストから除去
            cleanText = cleanText.replace(motionMatch[0], '');
        }
        
        // change_clothing(...) を検出
        const clothingRegex = /change_clothing\s*\(\s*["']?([^)"']+)["']?\s*(?:,\s*["']?([^)"']+)["']?)?\s*\)/gi;
        let clothingMatch;
        while ((clothingMatch = clothingRegex.exec(text)) !== null) {
            console.log('👗 テキストから服装変更検出:', clothingMatch[0]);
            if (window.vrmBodyController) {
                const target = clothingMatch[1]?.trim() || 'clothing';
                const opacity = parseFloat(clothingMatch[2]) || 0;
                window.vrmBodyController.handleFunctionCall('change_clothing', {
                    target: target,
                    opacity: opacity
                });
            }
            cleanText = cleanText.replace(clothingMatch[0], '');
        }
        
        // 「■ツール名でパーツ名のopacityを0に」のような自然言語表現も検出
        const naturalClothingRegex = /change_clothing\w*で\s*([\w_]+)\s*の\s*opacityを\s*(\d+\.?\d*)/gi;
        let natMatch;
        while ((natMatch = naturalClothingRegex.exec(text)) !== null) {
            console.log('👗 自然言語服装変更検出:', natMatch[0]);
            if (window.vrmBodyController) {
                window.vrmBodyController.handleFunctionCall('change_clothing', {
                    target: natMatch[1],
                    opacity: parseFloat(natMatch[2])
                });
            }
            cleanText = cleanText.replace(natMatch[0], '');
        }
        
        // 余分な空白を整理
        cleanText = cleanText.replace(/\s{2,}/g, ' ').trim();
        
        return cleanText;
    },
    
    // モーション名からVRMAを検索して再生（フォールバック）
    _fallbackPlayMotion: function(motionName) {
        if (window.loadAndPlayVRMA && window.motionFiles) {
            const match = window.motionFiles.find(f => f.includes(motionName));
            if (match) {
                window.loadAndPlayVRMA('motions/' + match, false);
                console.log('🎬 フォールバックモーション再生:', match);
            }
        }
    },
    
    // ★ ユーザー発話をChatGPTに送信（表情・モーション分析用）
    handleUserSpeech: function(userText) {
        console.log('🗣️ ユーザー発話をChatGPTに送信:', userText);
        
        // チャットUIにユーザーメッセージを追加
        const messagesContainer = document.querySelector('.messages-container') || 
                                   document.querySelector('#chat-panel .messages') ||
                                   document.querySelector('#chat-panel > div:nth-child(2)');
        if (messagesContainer) {
            const msgDiv = document.createElement('div');
            msgDiv.className = 'message user';
            msgDiv.innerHTML = `<strong>🎙️</strong> ${userText}`;
            msgDiv.style.cssText = 'padding: 10px; margin: 5px 0; background: #e8f5e9; border-radius: 8px; text-align: right;';
            messagesContainer.appendChild(msgDiv);
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
        }
        
        // ChatGPTにユーザー発話を送信（表情・モーション分析をトリガー）
        // ai-chat-auto-motion.js がこのメッセージを検出して分析を行う
        if (window.app && window.app.chatGPTClient) {
            // ChatGPTの会話履歴に追加（音声応答なしでコンテキストのみ）
            window.app.chatGPTClient.conversationHistory.push({
                role: 'user',
                content: userText
            });
            console.log('✅ ChatGPT会話履歴に追加');
        }
    },
    
    sendText: function(text) {
        if (this.client && this.enabled) {
            this.client.sendText(text);
            console.log('📤 Grokに送信:', text);
        }
    },
    
    setVoice: function(voice) {
        if (this.voices[voice]) {
            this.voice = voice;
            if (this.client) {
                this.client.setVoice(voice);
            }
            console.log('🎙️ Grok声変更:', voice, this.voices[voice]);
        }
    },
    
    // ★ 性格設定変更時にGrokセッションを更新
    refreshSession: function() {
        if (this.client && this.enabled) {
            this.client.refreshSession();
            console.log('✅ Grokセッション更新（性格設定反映）');
        }
    }
};

// Grok Voice Mode UIボタン
(function() {
    // メインボタン
    const btn = document.createElement('button');
    btn.id = 'grok-voice-toggle';
    btn.textContent = '🚀 Grok Voice OFF';
    btn.style.cssText = 'position: fixed; top: 120px; left: 20px; z-index: 99999; padding: 10px 20px; background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); color: #00d4ff; border: 2px solid #00d4ff; border-radius: 8px; cursor: pointer; font-weight: bold; font-size: 13px; box-shadow: 0 0 10px rgba(0, 212, 255, 0.3);';
    btn.onclick = async function() {
        btn.disabled = true;
        btn.textContent = '⚡ 接続中...';
        
        const result = await window.grokVoiceMode.toggle();
        
        if (result) {
            btn.textContent = '🚀 Grok Voice ON';
            btn.style.background = 'linear-gradient(135deg, #00d4ff 0%, #0099ff 100%)';
            btn.style.color = '#000';
            btn.style.borderColor = '#00d4ff';
            btn.style.boxShadow = '0 0 20px rgba(0, 212, 255, 0.6)';
        } else {
            btn.textContent = '🚀 Grok Voice OFF';
            btn.style.background = 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)';
            btn.style.color = '#00d4ff';
            btn.style.borderColor = '#00d4ff';
            btn.style.boxShadow = '0 0 10px rgba(0, 212, 255, 0.3)';
        }
        
        btn.disabled = false;
    };
    document.body.appendChild(btn);
    
    // 声選択ボタン
    const voiceBtn = document.createElement('button');
    voiceBtn.id = 'grok-voice-select';
    voiceBtn.textContent = '🎙️ Ara';
    voiceBtn.style.cssText = 'position: fixed; top: 120px; left: 180px; z-index: 99999; padding: 8px 12px; background: #1a1a2e; color: #00d4ff; border: 1px solid #00d4ff; border-radius: 5px; cursor: pointer; font-size: 11px;';
    
    const voices = ['Ara', 'Rex', 'Sal', 'Eve', 'Leo'];
    let currentVoiceIndex = 0;
    
    voiceBtn.onclick = function() {
        currentVoiceIndex = (currentVoiceIndex + 1) % voices.length;
        const newVoice = voices[currentVoiceIndex];
        window.grokVoiceMode.setVoice(newVoice);
        voiceBtn.textContent = '🎙️ ' + newVoice;
        
        // 声の詳細を表示
        const voiceInfo = window.grokVoiceMode.voices[newVoice];
        console.log('🎙️ ' + newVoice + ': ' + voiceInfo.type + ' - ' + voiceInfo.description);
    };
    document.body.appendChild(voiceBtn);
    
    console.log('✅ Grok Voice Agent UIボタン追加');
})();

console.log('✅ Grok Voice Agent API 準備完了');

console.log('');
console.log('📋 有効な機能:');
console.log('  1. ✅ チャットUIを右下に配置');
console.log('  2. ✅ 自動瞬き（8秒に1回、0.2秒×2回）');
console.log('  3. ✅ キーワードモーション（「くるくる」等）');
console.log('  4. ℹ️ 表情制御 → ai-chat-auto-motion.js に移行済み');
console.log('  5. ✅ ルックアット機能');
console.log('  6. ✅ OpenAI TTS / Google TTS');
console.log('  7. ✅ 360度パノラマ環境生成');
console.log('  8. ✅ キャラクタープロンプト生成');
console.log('  9. ✅ 画面キャプチャAI認識');
console.log(' 10. ✅ ⚡ Grok Voice Agent（高速リアルタイム音声）');
console.log(' 11. ✅ 👁️ Grok Vision（画面キャプチャ→Grok音声）');
console.log('');
console.log('🎮 使い方:');
console.log('  - 「くるくる回って！」→ 回転モーション');
console.log('  - 表情制御は ai-chat-auto-motion.js で行います');
console.log('  - 🚀 Grok Voice: 高速リアルタイム音声会話');
console.log('  - 👁️ 「これどう思う？」→ 画面を見てGrokが音声で応答');
console.log('  - 😊 モーフ調整パネルが自動表示されます');
console.log('========================================');

// ========================================
// 😊 モーフパネル常時表示 & グローバル操作API
// ========================================

// グローバルモーフ操作オブジェクト
window.MorphControl = {
    // 感情表情を設定（0.0〜1.0）
    setEmotion: function(emotion, value) {
        if (!window.app || !window.app.vrm || !window.app.vrm.expressionManager) {
            console.warn('⚠️ VRMが読み込まれていません');
            return false;
        }
        const em = window.app.vrm.expressionManager;
        const clampedValue = Math.max(0, Math.min(1, value));
        try {
            em.setValue(emotion, clampedValue);
            em.update();
            console.log(`😊 ${emotion}: ${(clampedValue * 100).toFixed(0)}%`);
            this.updatePanelSlider(emotion, clampedValue);
            return true;
        } catch (e) {
            console.warn(`⚠️ 表情 "${emotion}" が見つかりません`);
            return false;
        }
    },
    
    // 複数の感情を同時に設定
    setEmotions: function(emotions) {
        for (const [emotion, value] of Object.entries(emotions)) {
            this.setEmotion(emotion, value);
        }
    },
    
    // 喜怒哀楽のショートカット
    happy: function(value = 1.0) { return this.setEmotion('happy', value); },
    angry: function(value = 1.0) { return this.setEmotion('angry', value); },
    sad: function(value = 1.0) { return this.setEmotion('sad', value); },
    relaxed: function(value = 1.0) { return this.setEmotion('relaxed', value); },
    surprised: function(value = 1.0) { return this.setEmotion('surprised', value); },
    neutral: function() { return this.resetAll(); },
    
    // リップシンク用
    mouth: function(value = 1.0) { return this.setEmotion('aa', value); },
    
    // まばたき
    blink: function(value = 1.0) { return this.setEmotion('blink', value); },
    
    // 全てリセット
    resetAll: function() {
        const emotions = ['happy', 'angry', 'sad', 'relaxed', 'surprised', 'aa', 'ih', 'ou', 'ee', 'oh', 'blink', 'blinkLeft', 'blinkRight', 'neutral'];
        emotions.forEach(e => this.setEmotion(e, 0));
        console.log('🔄 全モーフリセット');
        return true;
    },
    
    // 現在の表情状態を取得
    getState: function() {
        if (!window.app || !window.app.vrm || !window.app.vrm.expressionManager) {
            return null;
        }
        const em = window.app.vrm.expressionManager;
        const state = {};
        const emotions = ['happy', 'angry', 'sad', 'relaxed', 'surprised', 'aa', 'ih', 'ou', 'ee', 'oh', 'blink', 'neutral'];
        emotions.forEach(e => {
            try {
                const val = em.getValue(e);
                if (val > 0.01) state[e] = val;
            } catch (err) {}
        });
        return state;
    },
    
    // パネルのスライダーを更新
    updatePanelSlider: function(emotion, value) {
        const slider = document.querySelector(`.morph-slider[data-morph="${emotion}"]`);
        const numInput = document.querySelector(`.morph-value[data-morph="${emotion}"]`);
        if (slider) slider.value = value;
        if (numInput) numInput.value = value.toFixed(2);
    },
    
    // パネルを表示
    showPanel: function() {
        if (window.app && window.app.vrm) {
            window.selectedVRM = window.app.vrm;
            if (typeof showMorphPanel === 'function') {
                showMorphPanel();
            }
        }
    },
    
    // パネルを非表示
    hidePanel: function() {
        if (typeof hideMorphPanel === 'function') {
            hideMorphPanel();
        }
    },
    
    // 利用可能な表情一覧を取得
    getAvailableExpressions: function() {
        if (!window.app || !window.app.vrm || !window.app.vrm.expressionManager) {
            return [];
        }
        const em = window.app.vrm.expressionManager;
        return em._expressionMap ? Object.keys(em._expressionMap) : [];
    }
};

// VRM読み込み完了時にモーフパネルを自動表示
(function autoShowMorphPanel() {
    let checkCount = 0;
    const maxChecks = 100; // 10秒間チェック
    
    const checkVRM = setInterval(() => {
        checkCount++;
        
        if (window.app && window.app.vrm && window.app.vrm.expressionManager) {
            clearInterval(checkVRM);
            
            // VRMを選択状態に
            window.selectedVRM = window.app.vrm;
            
            // 少し待ってからパネル表示（DOM準備待ち）
            setTimeout(() => {
                if (typeof showMorphPanel === 'function') {
                    showMorphPanel();
                    console.log('😊 モーフパネル自動表示完了');
                    
                    // 閉じるボタンを「最小化」に変更
                    const closeBtn = document.getElementById('morph-panel-close');
                    if (closeBtn) {
                        closeBtn.textContent = '−';
                        closeBtn.title = '最小化（再表示: MorphControl.showPanel()）';
                    }
                    
                    // ヘルプメッセージ
                    console.log('');
                    console.log('🎮 モーフ操作コマンド:');
                    console.log('  MorphControl.happy(0.8)    // 喜び 80%');
                    console.log('  MorphControl.angry(0.5)    // 怒り 50%');
                    console.log('  MorphControl.sad(1.0)      // 悲しみ 100%');
                    console.log('  MorphControl.surprised(0.7)// 驚き 70%');
                    console.log('  MorphControl.relaxed(0.6)  // リラックス 60%');
                    console.log('  MorphControl.mouth(0.5)    // 口開け 50%');
                    console.log('  MorphControl.blink(1.0)    // まばたき');
                    console.log('  MorphControl.resetAll()    // 全リセット');
                    console.log('  MorphControl.setEmotions({happy: 0.5, surprised: 0.3})  // 複数同時');
                    console.log('  MorphControl.getState()    // 現在の状態');
                    console.log('  MorphControl.getAvailableExpressions() // 利用可能な表情');
                    console.log('');
                }
            }, 500);
        }
        
        if (checkCount >= maxChecks) {
            clearInterval(checkVRM);
            console.log('⚠️ VRM読み込み待機タイムアウト');
        }
    }, 100);
})();

console.log('✅ モーフパネル常時表示システム準備完了');

// ========================================
// 13. Style-Bert-VITS2 TTS（高品質ローカル音声合成）
// LLMの感情分析結果からスタイルを自動選択
// ========================================

window.sbv2TTS = {
    enabled: false,
    isSpeaking: false,
    baseUrl: 'http://localhost:8000',
    modelsInfo: null,
    
    // 現在の設定
    settings: {
        model: 'jvnv-F1-jp',        // デフォルトモデル（女性）
        speaker: 'jvnv-F1-jp',
        style: 'Neutral',
        styleWeight: 1.0,
        speed: 1.0,
        noise: 0.6,
        noisew: 0.8,
        sdpRatio: 0.2,
        language: 'JP',
        silenceAfter: 0.3,
        pitchScale: 1.0,
        intonationScale: 1.0
    },
    
    // 感情マッピング（VRM感情分析 → Style-Bert-VITS2スタイル）
    emotionToStyle: {
        'joy': 'Happy', 'happy': 'Happy', 'happiness': 'Happy', 'excited': 'Happy', 'cheerful': 'Happy',
        'anger': 'Angry', 'angry': 'Angry', 'irritated': 'Angry', 'frustrated': 'Angry',
        'sadness': 'Sad', 'sad': 'Sad', 'melancholy': 'Sad', 'disappointed': 'Sad',
        'surprise': 'Surprise', 'surprised': 'Surprise', 'shocked': 'Surprise', 'amazed': 'Surprise',
        'fear': 'Fear', 'scared': 'Fear', 'anxious': 'Fear', 'nervous': 'Fear',
        'disgust': 'Disgust', 'disgusted': 'Disgust',
        'neutral': 'Neutral', 'calm': 'Neutral', 'normal': 'Neutral', 'default': 'Neutral'
    },
    
    // スタイル強度マッピング
    emotionIntensity: {
        'Happy': { styleWeight: 1.2, intonationScale: 1.1 },
        'Angry': { styleWeight: 1.3, intonationScale: 1.2, speed: 1.1 },
        'Sad': { styleWeight: 1.1, speed: 0.9, pitchScale: 0.95 },
        'Surprise': { styleWeight: 1.4, intonationScale: 1.3 },
        'Fear': { styleWeight: 1.2, speed: 1.1 },
        'Disgust': { styleWeight: 1.1 },
        'Neutral': { styleWeight: 1.0 }
    },
    
    // サーバー接続確認
    checkConnection: async function() {
        try {
            const response = await fetch(`${this.baseUrl}/api/version`);
            if (response.ok) {
                const version = await response.json();
                console.log('✅ Style-Bert-VITS2 接続OK:', version);
                return true;
            }
        } catch (error) {
            console.warn('⚠️ Style-Bert-VITS2 サーバーに接続できません:', error.message);
        }
        return false;
    },
    
    // モデル情報を取得
    getModelsInfo: async function() {
        try {
            const response = await fetch(`${this.baseUrl}/api/models_info`);
            if (response.ok) {
                this.modelsInfo = await response.json();
                console.log('📋 SBV2利用可能モデル:', this.modelsInfo.map(m => m.name));
                return this.modelsInfo;
            }
        } catch (error) {
            console.error('❌ SBV2モデル情報取得失敗:', error);
        }
        return null;
    },
    
    // 利用可能なスタイル一覧を取得
    getAvailableStyles: function(modelName = null) {
        const targetModel = modelName || this.settings.model;
        if (!this.modelsInfo) return ['Neutral'];
        const model = this.modelsInfo.find(m => m.name === targetModel);
        return model ? model.styles : ['Neutral'];
    },
    
    // モデルを設定
    setModel: function(modelName) {
        this.settings.model = modelName;
        this.settings.speaker = modelName;
        console.log('🎤 SBV2モデル変更:', modelName);
        // UI更新
        const modelSelect = document.getElementById('sbv2-model-select');
        if (modelSelect) modelSelect.value = modelName;
    },
    
    // テキストから感情を簡易分析
    analyzeTextEmotion: function(text) {
        const emotionKeywords = {
            'Happy': ['嬉しい', 'やった', 'わーい', '楽しい', 'ありがとう', '最高', 'すごい', '！！', 'わくわく', 'うれしい', 'ふふ', 'へへ'],
            'Angry': ['怒', 'むかつく', 'イライラ', 'ふざけ', 'ひどい', 'なんで', '許せない'],
            'Sad': ['悲しい', '辛い', '寂しい', '残念', 'がっかり', 'しょんぼり', '...', 'ごめん'],
            'Surprise': ['えっ', 'まじ', 'うそ', '本当', 'びっくり', 'すごい', '！？', 'えええ', 'はぁ'],
            'Fear': ['怖い', '不安', '心配', 'やばい', 'どうしよう'],
            'Disgust': ['気持ち悪い', 'いや', '嫌い', 'きもい']
        };
        
        for (const [emotion, keywords] of Object.entries(emotionKeywords)) {
            for (const keyword of keywords) {
                if (text.includes(keyword)) {
                    return emotion;
                }
            }
        }
        return 'Neutral';
    },
    
    // 音声合成を実行
    synthesize: async function(text, emotion = null) {
        // 感情からスタイルを決定
        let style = 'Neutral';
        if (emotion) {
            const normalizedEmotion = emotion.toLowerCase().trim();
            style = this.emotionToStyle[normalizedEmotion] || 'Neutral';
        } else {
            style = this.analyzeTextEmotion(text);
        }
        
        // モデルがそのスタイルをサポートしているか確認
        const availableStyles = this.getAvailableStyles();
        if (!availableStyles.includes(style)) {
            console.warn(`⚠️ モデル ${this.settings.model} は ${style} スタイルをサポートしていません`);
            style = 'Neutral';
        }
        
        // スタイルに応じたパラメータ調整
        const intensity = this.emotionIntensity[style] || {};
        
        const requestBody = {
            model: this.settings.model,
            text: text,
            style: style,
            styleWeight: intensity.styleWeight || this.settings.styleWeight,
            speed: intensity.speed || this.settings.speed,
            noise: this.settings.noise,
            noisew: this.settings.noisew,
            sdpRatio: this.settings.sdpRatio,
            language: this.settings.language,
            silenceAfter: this.settings.silenceAfter,
            pitchScale: intensity.pitchScale || this.settings.pitchScale,
            intonationScale: intensity.intonationScale || this.settings.intonationScale,
            speaker: this.settings.speaker
        };
        
        console.log(`🎤 SBV2 音声合成: "${text.substring(0, 30)}..." [${style}]`);
        const startTime = Date.now();
        
        try {
            const response = await fetch(`${this.baseUrl}/api/synthesis`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(requestBody)
            });
            
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.detail || 'Synthesis failed');
            }
            
            const audioData = await response.arrayBuffer();
            const elapsed = Date.now() - startTime;
            
            console.log(`✅ SBV2 音声生成完了 (${elapsed}ms): ${audioData.byteLength} bytes, Style: ${style}`);
            
            return { audioData, style, elapsed };
            
        } catch (error) {
            console.error('❌ SBV2 音声合成エラー:', error);
            throw error;
        }
    },
    
    // 音声再生
    speak: async function(text, emotion = null) {
        if (!this.enabled || this.isSpeaking) return;
        
        this.isSpeaking = true;
        
        try {
            const result = await this.synthesize(text, emotion);
            
            if (!result || !result.audioData) {
                throw new Error('音声データが取得できませんでした');
            }
            
            // WAVファイルとして再生
            const blob = new Blob([result.audioData], { type: 'audio/wav' });
            const url = URL.createObjectURL(blob);
            const audio = new Audio(url);
            
            // リップシンク開始
            if (window.app && window.app.vrm && window.app.vrm.expressionManager) {
                const mouthPattern = [0.10, 0.30, 0.05, 0.15, 0.25, 0.50, 0.20, 1.00, 0.15, 0.25, 0.10, 0.75];
                let patternIndex = 0;
                
                window.sbv2LipSyncInterval = setInterval(() => {
                    const value = mouthPattern[patternIndex];
                    window.app.vrm.expressionManager.setValue('aa', value);
                    patternIndex = (patternIndex + 1) % mouthPattern.length;
                }, 300);
            }
            
            audio.onended = () => {
                URL.revokeObjectURL(url);
                this.isSpeaking = false;
                
                // リップシンク停止
                if (window.sbv2LipSyncInterval) {
                    clearInterval(window.sbv2LipSyncInterval);
                    window.sbv2LipSyncInterval = null;
                }
                if (window.app && window.app.vrm && window.app.vrm.expressionManager) {
                    window.app.vrm.expressionManager.setValue('aa', 0);
                }
                
                console.log('🎤 SBV2 再生完了');
            };
            
            audio.onerror = (error) => {
                URL.revokeObjectURL(url);
                this.isSpeaking = false;
                console.error('❌ SBV2 再生エラー:', error);
            };
            
            await audio.play();
            console.log('🎤 SBV2 再生中... Style:', result.style);
            
        } catch (error) {
            console.error('SBV2 TTS error:', error);
            this.isSpeaking = false;
        }
    },
    
    // 切り替え
    toggle: async function() {
        if (this.enabled) {
            this.enabled = false;
            console.log('🎤 Style-Bert-VITS2 TTS OFF');
            return false;
        } else {
            // 接続確認
            const connected = await this.checkConnection();
            if (!connected) {
                alert('⚠️ Style-Bert-VITS2 サーバーに接続できません。\n\nlocalhost:8000 でサーバーが起動しているか確認してください。');
                return false;
            }
            
            // モデル情報を取得
            await this.getModelsInfo();
            
            // 他のTTSをオフに
            if (window.googleTTS && window.googleTTS.enabled) {
                window.googleTTS.enabled = false;
                const googleBtn = document.querySelector('[data-google-tts]');
                if (googleBtn) {
                    googleBtn.textContent = '🍌 Google TTS OFF';
                    googleBtn.style.background = '#4285F4';
                }
            }
            if (window.openaiTTS && window.openaiTTS.enabled) {
                window.openaiTTS.enabled = false;
                const openaiBtn = document.querySelector('[data-openai-tts]');
                if (openaiBtn) {
                    openaiBtn.textContent = 'OpenAI TTS OFF';
                    openaiBtn.style.background = '#FF9800';
                }
            }
            
            this.enabled = true;
            console.log('🎤 Style-Bert-VITS2 TTS ON');
            console.log('  - モデル:', this.settings.model);
            console.log('  - 利用可能スタイル:', this.getAvailableStyles());
            return true;
        }
    }
};

// SBV2 TTS メッセージ監視
window.lastSBV2Message = '';
window.lastSBV2Length = 0;
setInterval(function() {
    if (!window.sbv2TTS || !window.sbv2TTS.enabled || window.sbv2TTS.isSpeaking) return;
    var msgs = document.querySelectorAll('.message.ai');
    if (msgs.length > 0) {
        var last = msgs[msgs.length - 1];
        var txt = last.textContent.replace(/^AI/, '').trim();
        if (txt === window.lastSBV2Message) return;
        if (txt.length > 10 && txt.length === window.lastSBV2Length) {
            window.lastSBV2Message = txt;
            window.lastSBV2Length = 0;
            
            // ai-chat-auto-motion.js から感情情報を取得（あれば）
            let emotion = null;
            if (window.AIChatAutoMotion && window.AIChatAutoMotion.lastAnalysis) {
                emotion = window.AIChatAutoMotion.lastAnalysis.emotion;
            }
            
            window.sbv2TTS.speak(txt, emotion);
        } else {
            window.lastSBV2Length = txt.length;
        }
    }
}, 1500);

// Style-Bert-VITS2 TTS UIボタン
(function() {
    // メインボタン
    var btn = document.createElement('button');
    btn.setAttribute('data-sbv2-tts', 'true');
    btn.textContent = '🎭 SBV2 TTS OFF';
    btn.style.cssText = 'position: fixed; top: 420px; left: 20px; z-index: 99999; padding: 10px 20px; background: linear-gradient(135deg, #e91e63 0%, #9c27b0 100%); color: white; border: none; border-radius: 5px; cursor: pointer; font-weight: bold;';
    btn.onclick = async function() {
        btn.disabled = true;
        btn.textContent = '⏳ 接続中...';
        
        var on = await window.sbv2TTS.toggle();
        
        if (on) {
            btn.textContent = '🎭 SBV2 TTS ON';
            btn.style.background = 'linear-gradient(135deg, #4CAF50 0%, #8BC34A 100%)';
        } else {
            btn.textContent = '🎭 SBV2 TTS OFF';
            btn.style.background = 'linear-gradient(135deg, #e91e63 0%, #9c27b0 100%)';
        }
        
        btn.disabled = false;
    };
    document.body.appendChild(btn);
    
    // モデル選択セレクト
    var modelSelect = document.createElement('select');
    modelSelect.id = 'sbv2-model-select';
    modelSelect.style.cssText = 'position: fixed; top: 460px; left: 20px; z-index: 99999; padding: 5px 10px; background: #1a1a2e; color: #e91e63; border: 1px solid #e91e63; border-radius: 5px; cursor: pointer; font-size: 11px; width: 140px;';
    modelSelect.innerHTML = `
        <option value="jvnv-F1-jp">jvnv-F1-jp (女性1)</option>
        <option value="jvnv-F2-jp">jvnv-F2-jp (女性2)</option>
        <option value="jvnv-M1-jp">jvnv-M1-jp (男性1)</option>
        <option value="jvnv-M2-jp">jvnv-M2-jp (男性2)</option>
        <option value="koharune-ami">小春音アミ</option>
        <option value="amitaro">あみたろ</option>
    `;
    modelSelect.onchange = function() {
        window.sbv2TTS.setModel(this.value);
    };
    document.body.appendChild(modelSelect);
    
    // スタイル表示ラベル
    var styleLabel = document.createElement('div');
    styleLabel.id = 'sbv2-style-info';
    styleLabel.style.cssText = 'position: fixed; top: 490px; left: 20px; z-index: 99999; padding: 5px 10px; background: rgba(0,0,0,0.7); color: #e91e63; border-radius: 5px; font-size: 10px; max-width: 150px;';
    styleLabel.textContent = '感情自動検出: ON';
    document.body.appendChild(styleLabel);
    
    console.log('✅ Style-Bert-VITS2 TTSボタン追加');
})();

console.log('✅ Style-Bert-VITS2 TTS準備完了');
console.log('  🎭 感情スタイル: Happy, Angry, Sad, Surprise, Fear, Disgust, Neutral');
console.log('  📢 localhost:8000 でサーバーを起動してください');
