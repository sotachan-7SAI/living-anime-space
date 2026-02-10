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
if (window.blinkTimer) clearInterval(window.blinkTimer);
window.blinkTimer = setInterval(function() {
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
}, 8000);
console.log('✅ 自動瞬き有効化');

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
// 5. 表情変化関数（自動リセット付き）
// ========================================
window.expressionResetTimer = null;
window.applyExpression = function(exp, autoReset) {
    if (autoReset === undefined) autoReset = true; // デフォルトで5秒後にリセット
    
    if (window.app && window.app.vrm && window.app.vrm.expressionManager) {
        ['happy', 'sad', 'angry', 'surprised', 'relaxed', 'neutral'].forEach(function(e) {
            try { 
                window.app.vrm.expressionManager.setValue(e, 0.0); 
            } catch(err) {}
        });
        try {
            window.app.vrm.expressionManager.setValue(exp, 1.0);
            console.log('😊 表情:', exp);
            
            // 自動リセット（neutral以外の場合のみ）
            if (autoReset && exp !== 'neutral') {
                if (window.expressionResetTimer) {
                    clearTimeout(window.expressionResetTimer);
                }
                window.expressionResetTimer = setTimeout(function() {
                    window.applyExpression('neutral', false);
                    console.log('😐 表情を自動リセット');
                }, 5000);
            }
        } catch(err) {}
    }
};
console.log('✅ 表情機能有効化（5秒後自動リセット）');

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
// 7. 自動表情変化（AIメッセージ監視）
// ========================================
window.lastCheckedMessage = '';
setInterval(function() {
    var messages = document.querySelectorAll('.message.ai');
    if (messages.length > 0) {
        var lastMsg = messages[messages.length - 1];
        var text = lastMsg.textContent;
        
        if (text !== window.lastCheckedMessage && text.length > 20) {
            window.lastCheckedMessage = text;
            
            var exp = null;
            if (text.indexOf('嬉しい') >= 0 || text.indexOf('ありがとう') >= 0 || text.indexOf('楽しい') >= 0 || text.indexOf('幸せ') >= 0 || text.indexOf('笑顔') >= 0) {
                exp = 'happy';
            } else if (text.indexOf('悲しい') >= 0 || text.indexOf('辛い') >= 0 || text.indexOf('残念') >= 0) {
                exp = 'sad';
            } else if (text.indexOf('びっくり') >= 0 || text.indexOf('驚き') >= 0 || text.indexOf('すごい') >= 0 || text.indexOf('わあ') >= 0) {
                exp = 'surprised';
            } else if (text.indexOf('怒り') >= 0 || text.indexOf('むかつく') >= 0) {
                exp = 'angry';
            }
            
            if (exp) {
                console.log('→表情変更:', exp);
                window.applyExpression(exp);
            }
        }
    }
}, 1000);
console.log('✅ 自動表情変化有効化');

// ========================================
// 8. ルックアット機能
// ========================================
(function setupLookAt() {
    var attempts = 0;
    var maxAttempts = 50;
    var checkInterval = setInterval(function() {
        attempts++;
        if (window.app && window.app.vrm && window.app.vrm.lookAt && window.app.camera) {
            window.app.vrm.lookAt.target = window.app.camera;
            if (window.lookAtUpdateInterval) {
                clearInterval(window.lookAtUpdateInterval);
            }
            window.lookAtUpdateInterval = setInterval(function() {
                if (window.app.vrm && window.app.vrm.lookAt) {
                    window.app.vrm.lookAt.update(0.016);
                }
            }, 16);
            console.log('✅ ルックアット有効化');
            clearInterval(checkInterval);
        } else if (attempts >= maxAttempts) {
            console.log('⚠️ ルックアット設定タイムアウト');
            clearInterval(checkInterval);
        }
    }, 100);
})();

// ========================================
// 9. OpenAI TTS機能（高品質音声）
// ========================================

// 超感情的なプロンプト設定
(function() {
    const emotionalPrompt = `あなたは可愛いVRMキャラクターです。
【超重要】感情を最大限に表現してください。

【話し方のルール】
- 感嘆詞を多用：「わぁー！」「きゃー！」「えへへ♪」「ふふっ」
- 笑い声：「あはは！」「うふふ♪」「えへへ」
- 驚き：「えっ！？」「まさか！」「すごーい！」
- 語尾：「～ね！」「～よ♪」「～だよー！」

【感情表現の例】
嬉しい：「わぁー！嬉しい！えへへ♪ ありがとう！」
驚き：「えっ！？ すごーい！ びっくりした～！」
興奮：「きゃー！ 楽しい！ もっとやろう！」
悲しい：「うぅ... そっか... 残念だなぁ...」

必ず動作の説明を感情的に入れてください：
- 「くるくる回って」→「わぁい！くるくる回りますね！えへへ♪（楽しそうにぐるんぐるん回転します）」
- 「撃って」→「バーン！撃ちますよ！（ビシッとポーズを決めながら）ふふっ♪」
- 「ポーズ決めて」→「はい！かっこよく決めますね！（キラーンと輝くポーズ）どうですか？えへへ♪」`;
    
    localStorage.setItem('character_prompt', emotionalPrompt);
    
    // ChatGPTクライアントに反映（読み込み後に実行）
    setTimeout(function() {
        if (window.app && window.app.chatGPTClient) {
            window.app.chatGPTClient.setSystemPrompt(emotionalPrompt);
            console.log('✅ 超感情的プロンプト設定完了');
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

console.log('✅ OpenAI TTS準備完了');

// ========================================
// 完了メッセージ
// ========================================
console.log('');
console.log('🎉 ========================================');
console.log('✅ VRM AI Viewer カスタム機能が有効になりました！');
console.log('========================================');
console.log('');
console.log('📋 有効な機能:');
console.log('  1. ✅ チャットUIを右下に配置');
console.log('  2. ✅ 自動瞬き（8秒に1回、0.2秒×2回）');
console.log('  3. ✅ 会話に応じたモーション自動選択');
console.log('  4. ✅ 会話に応じた表情自動変化');
console.log('  5. ✅ 表情自動リセット（5秒後）');
console.log('  6. ✅ ルックアット機能');
console.log('  7. ✅ OpenAI TTS（高品質音声+リップシンク）');
console.log('');
console.log('🎮 使い方:');
console.log('  - 「くるくる回って！」→ 回転モーション');
console.log('  - 「バーン！撃って！」→ 撃つモーション');
console.log('  - 「ポーズ決めて！」→ ポーズ');
console.log('  - AIが「嬉しい」と言う→ 笑顔');
console.log('  - AIが「びっくり」と言う→ 驚き表情');
console.log('========================================');