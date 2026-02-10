// ========================================
// Motion Cleanup Utility v1.0
// モーションレイヤー残留問題を解決する共通ユーティリティ
// 
// 問題: 複数のモーションソース(ChatGPT, Grok Voice, 行動パネル)が
// fadeOut/crossFadeToで古いアクションを「見えなく」するが、
// mixer内にweight=0のゾンビアクションとして残り、
// 次のモーション再生時にブレンドされて50%の動きになる
//
// 解決: 新モーション再生前に全ての古いアクションを完全に停止・除去
// ========================================

(function() {
    'use strict';
    
    console.log('🧹 Motion Cleanup Utility v1.0 読み込み開始');
    
    /**
     * mixer内の全アクションを完全に停止・除去する
     * 新しいモーションを再生する前に必ず呼ぶこと
     * 
     * @param {THREE.AnimationMixer} mixer - アニメーションミキサー
     * @param {THREE.AnimationAction} [exceptAction] - 除外するアクション（新しく再生するもの）
     */
    function cleanupAllActions(mixer, exceptAction = null) {
        if (!mixer) return;
        
        // mixer._actions は内部配列だが、Three.jsの仕様で利用可能
        // 全アクションのコピーを取得（操作中に配列が変わるので）
        const actions = [...(mixer._actions || [])];
        let cleaned = 0;
        
        for (const action of actions) {
            if (action === exceptAction) continue;
            
            // 1. アクションを即座に停止
            action.stop();
            
            // 2. weightを0にリセット
            action.setEffectiveWeight(0);
            
            // 3. アクションとクリップをmixerのキャッシュから除去
            try {
                const clip = action.getClip();
                mixer.uncacheAction(clip);
                mixer.uncacheClip(clip);
            } catch (e) {
                // uncacheが失敗しても続行
            }
            
            cleaned++;
        }
        
        if (cleaned > 0) {
            console.log(`🧹 ${cleaned}個のゾンビアクションをクリーンアップ`);
        }
    }
    
    /**
     * 新しいモーションアクションを安全に再生する
     * 古いアクションを全てクリーンアップしてから再生
     * 
     * @param {THREE.AnimationMixer} mixer
     * @param {THREE.AnimationClip} clip - 再生するクリップ
     * @param {Object} options
     * @param {boolean} options.loop - ループ再生するか (default: true)
     * @param {number} options.fadeIn - フェードイン時間 (default: 0.3)
     * @param {boolean} options.clampWhenFinished - 終了時にポーズを保持 (default: false)
     * @returns {THREE.AnimationAction} 新しいアクション
     */
    function playCleanMotion(mixer, clip, options = {}) {
        if (!mixer || !clip) return null;
        
        const {
            loop = true,
            fadeIn = 0.3,
            clampWhenFinished = false
        } = options;
        
        const THREE = window.THREE;
        
        // まず全ての古いアクションをクリーンアップ
        cleanupAllActions(mixer);
        
        // 新しいアクションを作成・再生
        const action = mixer.clipAction(clip);
        action.reset();
        action.setLoop(loop ? THREE.LoopRepeat : THREE.LoopOnce, loop ? Infinity : 1);
        action.clampWhenFinished = clampWhenFinished;
        action.setEffectiveWeight(1);
        
        if (fadeIn > 0) {
            action.fadeIn(fadeIn);
        }
        
        action.play();
        
        // window.app.currentAction を更新
        if (window.app) {
            window.app.currentAction = action;
        }
        
        // ループでない場合、終了時に自動クリーンアップ
        if (!loop) {
            const onFinished = (e) => {
                if (e.action === action) {
                    mixer.removeEventListener('finished', onFinished);
                    console.log('🧹 非ループモーション終了 → 自動クリーンアップ');
                }
            };
            mixer.addEventListener('finished', onFinished);
        }
        
        return action;
    }
    
    /**
     * 現在のモーション状態を完全リセット
     * Grok Voiceのポーズ割り込み後などに呼び出し可能
     */
    function resetMotionState() {
        const mixer = window.app?.mixer;
        if (!mixer) return;
        
        // 全アクションをクリーンアップ
        cleanupAllActions(mixer);
        
        // currentActionもクリア
        if (window.app) {
            window.app.currentAction = null;
        }
        
        console.log('🧹 モーション状態を完全リセット');
    }
    
    /**
     * デバッグ: mixer内のアクション状態を表示
     */
    function debugMotionState() {
        const mixer = window.app?.mixer;
        if (!mixer) {
            console.log('🔍 mixer なし');
            return;
        }
        
        const actions = mixer._actions || [];
        console.log(`🔍 Mixer内アクション数: ${actions.length}`);
        
        actions.forEach((action, i) => {
            const clip = action.getClip();
            console.log(`  [${i}] ${clip.name || '(unnamed)'} | running: ${action.isRunning()} | weight: ${action.getEffectiveWeight().toFixed(3)} | time: ${action.time.toFixed(2)}`);
        });
    }
    
    // グローバルに公開
    window.MotionCleanup = {
        cleanupAllActions,
        playCleanMotion,
        resetMotionState,
        debugMotionState
    };
    
    console.log('✅ Motion Cleanup Utility v1.0 準備完了');
    console.log('   使い方: window.MotionCleanup.resetMotionState() でリセット');
    console.log('   デバッグ: window.MotionCleanup.debugMotionState() で状態確認');
})();
