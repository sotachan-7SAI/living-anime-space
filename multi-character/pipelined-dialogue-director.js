// ========================================
// PipelinedDialogueDirector - 先読み並列計算システム v4.8
// ========================================
// 
// 【v4.8 改善点】★★★ NEW ★★★
//   - 先読みシステム完全修正！2人会話でも5秒待ちなしでサクサク会話
//   - 再生開始と同時に次の準備を非同期で開始（本来の先読み動作に戻す）
//   - fillPipelineSequentially を改善し、先読み動作を維持しつつ会話の自然さも確保
//   - pipelineLoopで再生後に次を準備→再生中に次を準備、に変更
//
// 【v4.7 改善点】
//   - 2人会話でループが止まる問題を修正（v4.6のデッドロックも解決）
//   - パイプラインが空の場合のみ同期的にprepareEntryを呼ぶ
//   - パイプラインに残りがあれば従来通り非同期で補充
//
// 【v4.6 改善点】(リバート)
//   - fillPipelineをawaitで呼ぶとデッドロックが発生する問題
//
// 【v4.5 改善点】
//   - Grok Voice再生完了検出を response.done イベントベースに改善
//   - playEntry内でconversationSupervisor.startSpeaking/endSpeakingを確実に呼び出し
//   - 60秒タイムアウト問題を解消、サクサク会話が可能に
//
// 【v4.4 改善点】
//   - Grok APIキー取得先を拡張（Director設定/マルチキャラUI/localStorage/SBV2パネル）
//   - マルチキャラ会話でのキャラ別Grok Voice再生が確実に動作
//
// 【v4.3 改善点】
//   - Grok Voice対応！キャラごとにSBV2/Grok Voiceを選択可能
//   - voiceEngine: 'sbv2' | 'grok' でキャラごとに音声エンジン選択
//   - Grok Voiceは応答が速いので先読み不要、リアルタイム再生
//   - grokVoice: 'Ara' | 'Rex' | 'Sal' | 'Eve' | 'Leo' で声質選択
// 
// 🎯 目的: SBV2の5秒待ちを解消！
// 
// 【v4.2 改善点】★★★ NEW ★★★
//   - 会話監視システム(ConversationSupervisor)との統合強化
//   - 発言前に感情コンテキストをLLMに渡す機能追加
//   - 怒っているキャラは怒った状態で話すように
//
// 【v4.1.7 改善点】
//   - 音声重複再生防止の強化（playingステータスエントリもチェック）
//   - pipelineLoop内の待機ループでisCurrentlyPlayingとstatus==='playing'の両方を確認
// 
// 【v4.1.6 改善点】
//   - pipelineLoopの二重起動防止（isPipelineLoopRunningフラグ追加）
//   - 割り込み時の複数人同時発話問題を修正
//   - isUserInterruptingフラグで割り込み中はループをスキップ
//
// 【v4.1.5 改善点】
//   - excludedIdleMotions対応
//   - キャラクターごとに待機モーションを除外可能
//   - 個性設定からexcludedIdleMotionsを取得してフィルタリング
//
// 【v4.1.4 改善点】
//   - キャラクターごとの感情カテゴリ制限機能
//   - setCharacterEmotionRestrictions(speakerId, ['happy_strong']) で特定感情禁止
//   - 例: 井上博士はhappy_strong禁止 → 常に落ち着いたモーション
//
// 【v4.1.3 改善点】
//   - モーション履歴管理（前回と同じモーションの連続選択を避ける）
//   - 派手なガッツポーズ/ピース/投げキッス系はhappy_strongのみに移動
//   - happy/happy_mildは落ち着いたモーションのみ
//
// 【v4.1.2 改善点】
//   - VRMA_01(ルンルン回転)とVRMA_07(ラジオ体操)を通常選択から除外
//   - 行ごと感情判断モーションのレパートリー大幅拡充
//   - VRMA_03(ピース), VRMA_04(ピストル)を適切なシーンで選択
//   - 重複モーションを整理(女性しゃべり03=01, 04うでくみ=0４)
//
// 【v4.1 改善点】
//   - 喋り終わった後に文脈から待機モーションを選択
//   - AIが会話内容を見て適切な待機ポーズを判断
//
// 【v4.0 改善点】
//   - モーションも行ごとに感情分析して選択＆クロスフェード切替
//   - 1人の発言中にモーションが複数回つながって切り替わる
//   - クロスフェード時間: 0.5〜1秒
//
// 【v3.9.2 改善点】
//   - happy/joy/fun系の表情強度を0.5倍に調整（強すぎ対策）
//
// 【v3.9.1 改善点】
//   - 体モーションと表情を分離管理
//   - 体モーション: 会話全体で1回だけ感情判定で選択
//   - 表情: 行ごとに感情分析して切替
//
// 【v3.9 改善点】
//   - 行ごと感情分析・表情切替機能を追加
//   - 1人の発言中に文ごとに表情が変化する！
//   - AIチャットUIと同様のリッチな表現が可能に
//
// 【v3.8 改善点】
//   - 順次計算モード: 前の人の再生終了を待ってから次を生成
//   - 1つ前の発言が履歴に加わった状態で次のセリフを生成
//   - 会話の流れが自然になる！
//
// 【v3.6 改善点】
//   - 字幕イベント追加（playbackStart / playbackEnd）
//   - 再生開始時に字幕表示用イベントを発火
//
// 【v3.5 改善点】
//   - トピックを全ターンのプロンプトに含めるように修正
//   - 会話中のトピック書換が即座に反映される
//
// 【v3.4 改善点】
//   - カンペ画像対応: Vision APIで画像を全キャラに見せる
//   - カンペ（systemNote）対応: 全員への追加システムプロンプト
//   - 先読み時にSBV2音声合成も実行（5秒待ち解消！）
//   - モーション選択はplayEmotionMotion()に任せる（1回のみ）
//   - 再生時は音声再生 + モーション再生のみ
//
// 【フロー】
//   先読み: LLM → 感情分析 → SBV2音声合成
//   再生時: 行分割 → 行ごと感情分析 → 行ごとモーション切替 + 音声再生（行ごと表情切替）
//
// ========================================

(function() {
    'use strict';

// 先読みキューのエントリ
class PipelineEntry {
    constructor(speakerId, speakerName) {
        this.speakerId = speakerId;
        this.speakerName = speakerName;
        this.status = 'pending'; // pending, generating, synthesizing, ready, playing, done
        
        // LLM応答
        this.responseText = null;
        this.emotion = null;
        
        // 音声データ（先読みで生成）
        this.audioData = null;
        this.audioDuration = null;
        
        // タイムスタンプ
        this.createdAt = Date.now();
        this.responseAt = null;
        this.audioReadyAt = null;
        this.playStartAt = null;
        this.playEndAt = null;
    }
    
    get isReady() {
        return this.status === 'ready';
    }
    
    get isPlaying() {
        return this.status === 'playing';
    }
    
    get isPreparing() {
        return this.status === 'generating' || this.status === 'synthesizing';
    }
}

class PipelinedDialogueDirector {
    constructor() {
        // キャラクター管理
        this.characters = new Map();
        this.turnOrder = [];
        
        // 会話状態
        this.conversationHistory = [];
        this.maxHistoryLength = 20;
        this.currentTurnIndex = 0;
        this.currentSpeakerId = null;
        
        // ★ 再生中フラグ（交通整理の要）
        this.isCurrentlyPlaying = false;
        this.currentPlayingSpeakerId = null;
        
        // パイプライン
        this.pipeline = [];
        this.maxPipelineDepth = 3;
        
        // 動作状態
        this.isRunning = false;
        this.isPaused = false;
        
        // 設定
        this.turnMode = 'round-robin';
        this.topic = '';
        this.maxTurns = null;
        this.currentTurnCount = 0;
        this.conversationContext = '';
        this.delayBetweenSpeakers = 500;
        
        // ★ 順番計算モード（true: 上から順に1人ずつ計算、false: 並列計算）
        this.sequentialCalculation = true;
        this.isPreparingSequentially = false; // 順次計算中フラグ
        
        // ★ v4.1.6: pipelineLoopの二重起動防止
        this.isPipelineLoopRunning = false;   // pipelineLoopが動作中か
        this.isUserInterrupting = false;      // ユーザー割り込み中か
        
        // ★ カンペ（全員への追加システムプロンプト）
        this.systemNote = '';
        
        // コールバック
        this.onTurnStart = null;
        this.onTurnEnd = null;
        this.onConversationStart = null;
        this.onConversationEnd = null;
        this.onSpeechStart = null;
        this.onSpeechEnd = null;
        this.onLogUpdate = null;
        
        // パイプライン専用コールバック
        this.onPipelineUpdate = null;
        this.onPreviewTextReady = null;
        this.onAudioReady = null;
        this.onSpeakerHighlight = null;
        
        // ★ v3.9: 行ごと感情分析を有効化
        this.enableLineByLineEmotion = true;
        
        // ★ v4.0: モーションクロスフェード設定
        this.motionCrossfadeDuration = 0.7; // 0.5〜1秒
        
        // ★ v4.1.3: モーション履歴管理（同じモーションの連続選択を避ける）
        this.motionHistory = new Map(); // speakerId => [最近のモーション履歴]
        this.motionHistorySize = 5; // 履歴保持数
        
        // ★ v4.1.4: キャラクターごとの禁止感情カテゴリ
        // 例: { 'inoue': ['happy_strong', 'angry_strong'] } → 井上博士は派手な嬉しい/怒りモーション禁止
        this.characterEmotionRestrictions = new Map();
        
        // ★ v4.1.2: 待機モーションカテゴリ
        // ※VRMA_01(ルンルン回転)とVRMA_07(ラジオ体操)は通常の待機から除外
        // 【モーション内容メモ】
        // VRMA_03: 可愛くピースサイン
        // VRMA_04: 可愛く片手でピストルをうつ仕草
        // 女性しゃべり01: 可愛く腕をくんで片腕を立てて話す
        // 女性しゃべり02: ゆびを見つめて話す
        // 女性しゃべり03: 可愛く両手を腕をくんで話す（女性しゃべり01と同じなので除外）
        // 女性しゃべり0４: 腰に手をあてて話す
        // 女性しゃべり04うでくみ: 腰に手をあてて話す（女性しゃべり0４と同じなので除外）
        this.idleMotionCategories = {
            natural: [
                'アンリアルキャラ否定.vrma',
                'アンリアルキャラセクシー待機.vrma', 'アンリアルキャラゆびうごかし.vrma',
                'アンリアルキャラリアクションポーズ.vrma', 'アンリアルキャラ考える.vrma',
                'アンリアルキャラ腰に手をあて仁王だち.vrma', 'おしとやかにしゃべる.vrma',
                '女性しゃべり01.vrma', '女性しゃべり02.vrma',  // 01,02のみ（03は01と同じ）
                '女性しゃべり0４.vrma',                                          // ４のみ（04うでくみは同じ）
                '真剣にあれこれ考える.vrma'
            ],
            happy: [
                'VRMA_03.vrma', 'アンリアルキャラセクシーモーション.vrma',
                'アンリアルキャラまーざっとこんなもんよツンデレ.vrma', 'アンリアルキャラ喜ぶ.vrma',
                'アンリアルキャラ興味しんしん.vrma', '女性投げキッス.vrma', '投げキッスしまくり.vrma'
            ],
            happy_mild: [
                '女性しゃべり05ルンルン気分.vrma', 'VRMA_05.vrma',
                'アンリアルキャラいろいろなセクシーポーズ.vrma', 'アンリアルキャラセクシー投げキッス.vrma',
                'アンリアルキャラノリノリで手をふる.vrma'
            ],
            happy_strong: [
                'アンリアルキャラ全身でOKマークポーズ.vrma', 'アンリアルキャラガッツポーズでめちゃくちゃよろこぶ.vrma',
                'アンリアルキャラガッツポーズでジャンプしてめちゃくちゃよろこぶ.vrma', '喜びガッツポーズ.vrma'
            ],
            angry: [
                '怒りあきれる.vrma', 'アンリアルキャラ否定.vrma', 'アニメイライラ.vrma',
                'VRMA_03.vrma', 'アンリアルキャラびっくり否定怒る.vrma',
                'アンリアルキャラびっくり否定怒る１.vrma', 'アンリアルキャラおっぱらいディスB.vrma',
                '女性しゃべり04うでくみ.vrma', '冗談じゃない手ではらって一周.vrma'
            ],
            angry_strong: [
                '怒りゆびさし.vrma', 'しゃべりいかりイライラ.vrma', 'ぴょんぴょんジャンプ拒絶.vrma',
                'ふみつけけりまくり.vrma', '威嚇して蹴ってくる.vrma', '怒って攻撃しまくり.vrma',
                '怒り「かかってこいよ！」.vrma'
            ],
            annoyed: [
                '怒りあきれる.vrma', 'アンリアルキャラ否定して一線をひく.vrma',
                'アンリアルキャラ女性しゃべり.vrma', 'アンリアルキャラまーまーおちついてくび.vrma',
                'アンリアルキャラおっぱらいディス.vrma', 'アンリアルキャラお化け屋敷で四方八方にびびり散らかす.vrma'
            ],
            annoyed_strong: [
                'アンリアルキャラえーなにそれ！嫌なリアクション.vrma', 'アンリアルキャラもーなんなのよ！.vrma',
                'アンリアルキャラじだんだ.vrma', '子供のように駄々をこねて倒れてじだんだ.vrma'
            ],
            sad: [
                '悲しくしゃべる.vrma', 'あたまをおさえてがっかり.vrma',
                'アンリアルキャラ頭をかかえる.vrma', 'アンリアルキャラ頭をかかえるB.vrma',
                'ええええ～！いやだよ～！どんびき.vrma'
            ],
            sad_strong: ['悲しくしゃがんで泣いちゃう.vrma'],
            disappointed: [
                'うなだれて一周.vrma', 'しゃがんでいじける.vrma',
                '子供のように駄々をこねて倒れてじだんだ.vrma'
            ],
            muscle: ['アンリアルキャラ筋肉ムキムキ.vrma'],
            polite: ['アンリアルキャラ丁寧なお辞儀.vrma'],
            teasing: ['おちょくりwave.vrma'],
            sexy: [
                'アンリアルキャラいろいろなセクシーポーズ.vrma', 'アンリアルキャラセクシー投げキッス.vrma',
                'アンリアルキャラセクシーモーション.vrma'
            ],
            sexy_strong: ['セクシーダンス.vrma'],
            pray: ['祈る.vrma'],
            shy: ['恥ずかしくて顔をおおう.vrma', '恥ずかしい顔おおい.vrma'],
            // ★ 特殊モーション（特定の状況のみ）
            exercise: ['VRMA_07.vrma'],      // ラジオ体操 - 運動や体操の話題のときのみ
            spin_happy: ['VRMA_01.vrma']     // ルンルン回転 - すごくハイテンションで喜んでいるときのみ
        };
        
        // ★ v4.2: 会話監視システム統合フラグ
        this.useEmotionContext = true;  // 感情コンテキストをLLMに渡すか
        
        // ★ v4.3: Grok Voice対応
        this.grokClients = new Map();  // キャラごとのGrokクライアント
        this.grokApiKey = null;        // Grok APIキー（共有）
        
        console.log('🎬🚀 PipelinedDialogueDirector v4.8 作成（先読みシステム完全修正）');
    }
    
    // ========================================
    // キャラクター管理
    // ========================================
    
    addCharacter(unit) {
        this.characters.set(unit.id, unit);
        if (!this.turnOrder.includes(unit.id)) {
            this.turnOrder.push(unit.id);
        }
        
        unit.onSpeakStart = (char) => {
            if (this.onSpeechStart) this.onSpeechStart(char);
        };
        unit.onSpeakEnd = (char) => {
            if (this.onSpeechEnd) this.onSpeechEnd(char);
        };
        
        console.log(`➕ キャラクター追加: ${unit.name} (${unit.id})`);
    }
    
    /**
     * ★ v4.1.4: キャラクターごとの感情カテゴリ制限を設定
     * @param {string} speakerId - キャラクターID
     * @param {string[]} restrictedEmotions - 禁止する感情カテゴリの配列
     * 
     * 例: setCharacterEmotionRestrictions('inoue', ['happy_strong', 'angry_strong'])
     *      → 井上博士はhappy_strongとangry_strongのモーションを使わない
     */
    setCharacterEmotionRestrictions(speakerId, restrictedEmotions) {
        this.characterEmotionRestrictions.set(speakerId, restrictedEmotions);
        console.log(`🚫 ${speakerId} の感情制限設定: ${restrictedEmotions.join(', ')}`);
    }
    
    /**
     * ★ v4.1.4: キャラクターの感情制限を取得
     */
    getCharacterEmotionRestrictions(speakerId) {
        return this.characterEmotionRestrictions.get(speakerId) || [];
    }
    
    /**
     * 🆕 v4.1.5: キャラクターの除外待機モーションを取得
     * 個性設定(characterPersonalityManager)からexcludedIdleMotionsを取得
     */
    getExcludedIdleMotions(speakerId) {
        try {
            const manager = window.characterPersonalityManager;
            console.log(`🔍 getExcludedIdleMotions: speakerId=${speakerId}, manager=${!!manager}`);
            
            if (manager) {
                const settings = manager.getSettings(speakerId);
                const excluded = settings.excludedIdleMotions || [];
                console.log(`🔍 ${speakerId} の設定:`, {
                    presetId: settings.presetId,
                    excludedIdleMotions: excluded,
                    excludedCount: excluded.length
                });
                return excluded;
            }
        } catch (e) {
            console.warn(`⚠️ ${speakerId} の除外待機モーション取得エラー:`, e);
        }
        return [];
    }
    
    /**
     * 🆕 v4.1.5: 除外モーションをフィルタリング
     * @param {string[]} motions - モーションファイル名の配列
     * @param {string[]} excluded - 除外するモーションファイル名の配列
     * @returns {string[]} フィルタリング後のモーション配列
     */
    filterExcludedIdleMotions(motions, excluded) {
        if (!excluded || excluded.length === 0) {
            return motions;
        }
        return motions.filter(m => !excluded.includes(m));
    }
    
    /**
     * ★ v4.1.4: キャラクターの感情制限をクリア
     */
    clearCharacterEmotionRestrictions(speakerId) {
        this.characterEmotionRestrictions.delete(speakerId);
        console.log(`✅ ${speakerId} の感情制限を解除`);
    }
    
    /**
     * ★ v4.1.4: 感情がキャラクターに制限されているかチェック
     * 制限されている場合は代替感情を返す
     */
    getAdjustedEmotion(speakerId, emotion) {
        const restrictions = this.getCharacterEmotionRestrictions(speakerId);
        const emotionLower = (emotion || 'normal').toLowerCase();
        
        if (restrictions.includes(emotionLower)) {
            // 制限されている場合は代替感情に変換
            const fallbackMap = {
                'happy_strong': 'happy',      // 派手な嬉しい → 普通の嬉しい
                'angry_strong': 'angry',      // 派手な怒り → 普通の怒り
                'sad_strong': 'sad',          // 派手な悲しい → 普通の悲しい
                'annoyed_strong': 'annoyed',  // 派手なうんざり → 普通のうんざり
                'sexy_strong': 'sexy',        // 派手なセクシー → 普通のセクシー
                'spin_happy': 'happy',        // ルンルン回転 → 普通の嬉しい
                'exercise': 'normal'          // ラジオ体操 → 普通
            };
            
            const fallback = fallbackMap[emotionLower] || 'normal';
            console.log(`🚫 ${speakerId}: ${emotionLower} は制限中 → ${fallback} に変更`);
            return fallback;
        }
        
        return emotionLower;
    }

    removeCharacter(id) {
        this.characters.delete(id);
        this.turnOrder = this.turnOrder.filter(cid => cid !== id);
        return true;
    }
    
    getCharacter(id) {
        return this.characters.get(id);
    }
    
    getAllCharacters() {
        return Array.from(this.characters.values());
    }
    
    setTurnOrder(order) {
        this.turnOrder = order.filter(id => this.characters.has(id));
    }
    
    setMaxTurns(maxTurns) {
        this.maxTurns = maxTurns;
    }
    
    // ========================================
    // 会話制御
    // ========================================
    
    async start(topic = '') {
        if (this.characters.size === 0) {
            console.warn('⚠️ キャラクターが登録されていません');
            return;
        }
        
        if (this.isRunning) {
            console.warn('⚠️ 会話は既に進行中です');
            return;
        }
        
        this.isRunning = true;
        this.isPaused = false;
        this.isCurrentlyPlaying = false;
        this.currentPlayingSpeakerId = null;
        this.topic = topic;
        this.currentTurnIndex = 0;
        this.currentTurnCount = 0;
        this.conversationHistory = [];
        this.pipeline = [];
        
        console.log('');
        console.log('🎬🚀 ========================================');
        console.log(`🎬🚀 パイプライン会話開始（v3.2 先読み音声合成対応）`);
        console.log(`🎬🚀 トピック: "${topic || '自由会話'}"`);
        console.log(`🎬🚀 参加者: ${this.turnOrder.map(id => this.characters.get(id)?.name || id).join(', ')}`);
        console.log('🎬🚀 ========================================');
        console.log('');
        
        if (this.onConversationStart) {
            this.onConversationStart(topic);
        }
        
        this.updateAllHighlights();
        
        const firstSpeakerId = this.turnOrder[0];
        await this.startPipelinedConversation(firstSpeakerId, topic);
    }
    
    stop() {
        this.isRunning = false;
        this.isPaused = false;
        this.isCurrentlyPlaying = false;
        this.currentPlayingSpeakerId = null;
        this.currentSpeakerId = null;
        this.pipeline = [];
        
        this.updateAllHighlights();
        
        console.log('🛑 会話停止');
        
        if (this.onConversationEnd) {
            this.onConversationEnd();
        }
    }
    
    pause() {
        this.isPaused = true;
        console.log('⏸️ 会話一時停止');
    }
    
    resume() {
        if (this.isPaused) {
            this.isPaused = false;
            console.log('▶️ 会話再開');
        }
    }
    
    // ========================================
    // パイプライン処理
    // ========================================
    
    async startPipelinedConversation(firstSpeakerId, topic) {
        console.log(`📥 最初の話者 ${this.characters.get(firstSpeakerId)?.name} の準備開始...`);
        
        const firstEntry = await this.prepareEntry(firstSpeakerId, topic, 'initial');
        
        if (!firstEntry || !firstEntry.responseText) {
            console.error('❌ 最初のターン生成失敗');
            this.stop();
            return;
        }
        
        await this.pipelineLoop();
    }
    
    async pipelineLoop() {
        // ★ v4.1.6: 二重起動防止
        if (this.isPipelineLoopRunning) {
            console.log('⚠️ pipelineLoopは既に動作中です。スキップ。');
            return;
        }
        
        // ★ v4.1.6: 割り込み中は起動しない
        if (this.isUserInterrupting) {
            console.log('⚠️ 割り込み中のためpipelineLoopをスキップ');
            return;
        }
        
        this.isPipelineLoopRunning = true;
        console.log('🔄 pipelineLoop 開始');
        
        try {
        while (this.isRunning && !this.isPaused) {
            if (this.maxTurns && this.currentTurnCount >= this.maxTurns) {
                console.log(`🏁 ターン数制限に達しました (${this.currentTurnCount}/${this.maxTurns})`);
                this.stop();
                return;
            }
            
            if (this.pipeline.length === 0) {
                console.log('⚠️ パイプラインが空です');
                break;
            }
            
            const currentEntry = this.pipeline.find(e => e.status !== 'done' && e.status !== 'playing');
            
            if (!currentEntry) {
                await this.wait(100);
                continue;
            }
            
            // ★ 交通整理: 前の人が話し終わるまで待機
            // ★ v4.1.7: playingエントリがあれば待機（isCurrentlyPlayingフラグに加えて二重チェック）
            while (this.isCurrentlyPlaying || this.pipeline.some(e => e.status === 'playing')) {
                console.log(`⏳ 再生待機中... (isCurrentlyPlaying: ${this.isCurrentlyPlaying}, playing entries: ${this.pipeline.filter(e => e.status === 'playing').length})`);
                await this.wait(200);
                if (!this.isRunning) return;
            }
            
            // 準備完了を待機（テキスト + 音声）
            if (!currentEntry.isReady) {
                console.log(`⏳ ${currentEntry.speakerName} の準備待機中... (status: ${currentEntry.status})`);
                await this.waitForReady(currentEntry);
            }
            
            // 話者間の間隔
            await this.wait(this.delayBetweenSpeakers);
            
            if (!this.isRunning) return;
            
            // ★ v4.8: 再生開始前に次の準備を非同期で開始（先読み！）
            const nextSpeakerId = this.getNextSpeaker(currentEntry.speakerId);
            const nextContext = currentEntry.responseText;
            
            // ★ 次のエントリがまだ準備中でなければ、再生と並行して準備開始
            const nextExists = this.pipeline.some(e => 
                e.speakerId === nextSpeakerId && e.status !== 'done'
            );
            if (!nextExists && this.isRunning) {
                console.log(`📥 [v4.8] 先読み開始: ${this.characters.get(nextSpeakerId)?.name} （再生と並行）`);
                this.prepareEntryAsync(nextSpeakerId, nextContext, 'response');
            }
            
            // ★ 再生開始
            await this.playEntry(currentEntry);
            
            this.pipeline = this.pipeline.filter(e => e.status !== 'done');
            
            // ★ v4.8: 再生後もパイプラインが空なら次を同期準備（フォールバック）
            if (this.isRunning && this.pipeline.length === 0) {
                const fallbackNextId = this.getNextSpeaker(currentEntry.speakerId);
                console.log('🔄 [v4.8] パイプライン空（先読みが間に合わなかった） → 同期準備');
                await this.prepareEntry(fallbackNextId, currentEntry.responseText, 'response');
            }
        }
        } finally {
            this.isPipelineLoopRunning = false;
            console.log('🔄 pipelineLoop 終了');
        }
    }
    
    async fillPipeline(startSpeakerId, lastText) {
        // ★ 順番制かつ順番計算モードの場合、順次計算
        if (this.turnMode === 'round-robin' && this.sequentialCalculation) {
            await this.fillPipelineSequentially(startSpeakerId, lastText);
        } else {
            // 並列計算モード（従来通り）
            await this.fillPipelineParallel(startSpeakerId, lastText);
        }
    }
    
    /**
     * ★ v4.8 改善: 先読み動作を維持しつつ、会話の自然さも確保
     * 
     * 【重要な変更】
     * - 前の人が「再生中」でも次の人の準備を開始（これが先読み！）
     * - ただし、プロンプト生成時は最新の会話履歴を使用
     * - 最新履歴がない場合は渡されたlastTextを使用
     */
    async fillPipelineSequentially(startSpeakerId, lastText) {
        // 既に順次計算中ならスキップ
        if (this.isPreparingSequentially) {
            console.log('⏳ 既に先読み計算中です');
            return;
        }
        
        this.isPreparingSequentially = true;
        let speakerId = startSpeakerId;
        
        try {
            // パイプライン深度が足りない間、次の話者を準備
            while (this.pipeline.filter(e => e.status !== 'done').length < this.maxPipelineDepth && this.isRunning) {
                
                // 既にこの話者のエントリがある場合はスキップ
                const existingEntry = this.pipeline.find(e => 
                    e.speakerId === speakerId && e.status !== 'done'
                );
                
                if (existingEntry) {
                    speakerId = this.getNextSpeaker(speakerId);
                    continue;
                }
                
                const speaker = this.characters.get(speakerId);
                if (!speaker) {
                    speakerId = this.getNextSpeaker(speakerId);
                    continue;
                }
                
                // ★ v4.8: 前の人の再生を待たずに準備開始（これが先読み！）
                // 会話履歴があればそれを使う、なければlastTextを使う
                const latestContext = this.conversationHistory.length > 0 
                    ? this.conversationHistory[this.conversationHistory.length - 1].text 
                    : lastText;
                
                console.log(`📥 [先読み] ${speaker.name} の準備開始 (パイプライン深度: ${this.pipeline.filter(e => e.status !== 'done').length + 1})`);
                console.log(`   コンテキスト: "${latestContext?.substring(0, 40)}..."`);
                
                this.updateSpeakerHighlight(speakerId, 'preparing');
                
                // ★ 同期的に計算（LLM応答生成 + SBV2音声合成）
                const entry = await this.prepareEntry(speakerId, latestContext, 'response');
                
                if (!entry || !entry.responseText) {
                    console.warn(`⚠️ ${speaker.name} の生成に失敗`);
                }
                
                speakerId = this.getNextSpeaker(speakerId);
            }
        } finally {
            this.isPreparingSequentially = false;
        }
    }
    
    /**
     * 並列計算モード（従来通り）
     */
    async fillPipelineParallel(startSpeakerId, lastText) {
        let speakerId = startSpeakerId;
        let context = lastText;
        
        for (let i = this.pipeline.filter(e => e.status !== 'done').length; 
             i < this.maxPipelineDepth && this.isRunning; i++) {
            
            const existingEntry = this.pipeline.find(e => 
                e.speakerId === speakerId && e.status !== 'done'
            );
            
            if (existingEntry) {
                speakerId = this.getNextSpeaker(speakerId);
                continue;
            }
            
            const speaker = this.characters.get(speakerId);
            if (!speaker) {
                speakerId = this.getNextSpeaker(speakerId);
                continue;
            }
            
            console.log(`📥 [並列] 先読み開始: ${speaker.name} (パイプライン深度: ${this.pipeline.length + 1})`);
            
            this.updateSpeakerHighlight(speakerId, 'preparing');
            this.prepareEntryAsync(speakerId, context, 'response');
            
            speakerId = this.getNextSpeaker(speakerId);
        }
    }
    
    /**
     * エントリを準備（同期版）
     * 1. LLMテキスト生成
     * 2. 感情分析
     * 3. SBV2音声合成（先読み！）
     */
    async prepareEntry(speakerId, context, type) {
        const speaker = this.characters.get(speakerId);
        if (!speaker) return null;
        
        const entry = new PipelineEntry(speakerId, speaker.name);
        entry.status = 'generating';
        this.pipeline.push(entry);
        
        this.updateSpeakerHighlight(speakerId, 'preparing');
        this.notifyPipelineUpdate();
        
        // 1. LLM応答生成
        console.log(`🤖 ${speaker.name} LLM応答生成中...`);
        const prompt = this.buildPrompt(speakerId, context, type);
        const result = await speaker.generateResponse(prompt);
        
        if (!result || !result.text) {
            entry.status = 'error';
            this.updateSpeakerHighlight(speakerId, 'none');
            return entry;
        }
        
        entry.responseText = result.text;
        entry.responseAt = Date.now();
        
        // 2. 感情分析
        console.log(`🎭 ${speaker.name} 感情分析中...`);
        const emotion = await speaker.analyzeEmotion(result.text);
        entry.emotion = emotion;
        
        if (this.onPreviewTextReady) {
            this.onPreviewTextReady(entry);
        }
        
        console.log(`📝 ${speaker.name} テキスト準備完了: "${entry.responseText.substring(0, 40)}..." (感情: ${entry.emotion})`);
        
        // 3. ★★★ SBV2音声合成（先読み！）★★★
        entry.status = 'synthesizing';
        this.notifyPipelineUpdate();
        
        console.log(`🎤 ${speaker.name} 音声合成中...`);
        const audioData = await this.synthesizeAudio(speaker, entry.responseText, entry.emotion);
        
        if (audioData) {
            entry.audioData = audioData;
            entry.audioReadyAt = Date.now();
            entry.status = 'ready';
            
            const audioKB = (audioData.byteLength / 1024).toFixed(1);
            console.log(`🔊 ${speaker.name} 音声準備完了: ${audioKB}KB`);
            
            if (this.onAudioReady) {
                this.onAudioReady(entry);
            }
        } else {
            console.warn(`⚠️ ${speaker.name} 音声合成失敗、ブラウザTTSにフォールバック`);
            entry.audioData = null;
            entry.status = 'ready';
        }
        
        this.notifyPipelineUpdate();
        
        return entry;
    }
    
    /**
     * エントリを準備（非同期版 - 先読み用）
     */
    prepareEntryAsync(speakerId, context, type) {
        const speaker = this.characters.get(speakerId);
        if (!speaker) return;
        
        const entry = new PipelineEntry(speakerId, speaker.name);
        entry.status = 'generating';
        this.pipeline.push(entry);
        
        this.updateSpeakerHighlight(speakerId, 'preparing');
        this.notifyPipelineUpdate();
        
        (async () => {
            try {
                // 1. LLM応答生成
                console.log(`🤖 [先読み] ${speaker.name} LLM応答生成中...`);
                const prompt = this.buildPrompt(speakerId, context, type);
                const result = await speaker.generateResponse(prompt);
                
                if (!result || !result.text) {
                    entry.status = 'error';
                    this.updateSpeakerHighlight(speakerId, 'none');
                    return;
                }
                
                entry.responseText = result.text;
                entry.responseAt = Date.now();
                
                // 2. 感情分析
                console.log(`🎭 [先読み] ${speaker.name} 感情分析中...`);
                const emotion = await speaker.analyzeEmotion(result.text);
                entry.emotion = emotion;
                
                if (this.onPreviewTextReady) {
                    this.onPreviewTextReady(entry);
                }
                
                console.log(`📝 [先読み] ${speaker.name} テキスト完了: "${entry.responseText.substring(0, 40)}..." (感情: ${entry.emotion})`);
                
                // 3. ★★★ SBV2音声合成（先読み！）★★★
                entry.status = 'synthesizing';
                this.notifyPipelineUpdate();
                
                console.log(`🎤 [先読み] ${speaker.name} 音声合成中...`);
                const audioData = await this.synthesizeAudio(speaker, entry.responseText, entry.emotion);
                
                if (audioData) {
                    entry.audioData = audioData;
                    entry.audioReadyAt = Date.now();
                    entry.status = 'ready';
                    
                    const audioKB = (audioData.byteLength / 1024).toFixed(1);
                    console.log(`🔊 [先読み] ${speaker.name} 音声準備完了: ${audioKB}KB`);
                    
                    if (this.onAudioReady) {
                        this.onAudioReady(entry);
                    }
                } else {
                    entry.audioData = null;
                    entry.status = 'ready';
                }
                
                this.notifyPipelineUpdate();
                
            } catch (error) {
                console.error(`❌ 先読みエラー (${speaker.name}):`, error);
                entry.status = 'error';
                this.updateSpeakerHighlight(speakerId, 'none');
            }
        })();
    }
    
    /**
     * ★ v4.3: Grok APIキーを設定
     */
    setGrokApiKey(apiKey) {
        this.grokApiKey = apiKey;
        console.log('🔑 Grok APIキー設定完了');
    }
    
    /**
     * ★ v4.3: 音声合成（SBV2 or Grok Voice）
     * speaker.voiceEngine で振り分け
     */
    async synthesizeAudio(speaker, text, emotion) {
        // ★ v4.5: 詳細デバッグログ
        console.log(`🔍 synthesizeAudio 呼び出し:`);
        console.log(`   speakerオブジェクト:`, speaker);
        console.log(`   speaker.constructor.name:`, speaker?.constructor?.name);
        console.log(`   speaker.id:`, speaker?.id);
        console.log(`   speaker.name:`, speaker?.name);
        console.log(`   speaker.voiceEngine:`, speaker?.voiceEngine);
        console.log(`   speaker.grokVoice:`, speaker?.grokVoice);
        console.log(`   speaker.voiceModel:`, speaker?.voiceModel);
        
        const voiceEngine = speaker.voiceEngine || 'sbv2';
        
        console.log(`🎤 ${speaker.name} 音声エンジン決定: ${voiceEngine}`);
        
        if (voiceEngine === 'grok') {
            // ★ Grok Voiceモード: 先読みせず、再生時にストリーミング
            // audioDataはnullを返し、playEntry時にGrok再生
            console.log(`🚀 ${speaker.name} はGrok Voice使用 → 先読みスキップ（再生時にストリーミング）`);
            return 'GROK_STREAMING';  // 特殊マーカー
        }
        
        // SBV2モード（従来通り）
        console.log(`🎤 ${speaker.name} はSBV2使用`);
        return await this.synthesizeWithSBV2(speaker, text, emotion);
    }
    
    /**
     * SBV2音声合成（従来の処理）
     */
    async synthesizeWithSBV2(speaker, text, emotion) {
        try {
            // SBV2パネルの設定を取得
            if (!window.SBV2Panel || !window.SBV2Panel.isEnabled()) {
                console.warn('⚠️ SBV2パネルが無効、音声合成スキップ');
                return null;
            }
            
            const settings = window.SBV2Panel.getSettings();
            
            // G2P（読み仮名変換）
            const g2pRes = await fetch('/sbv2/api/g2p', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text })
            });
            
            if (!g2pRes.ok) throw new Error('G2P failed');
            const g2pData = await g2pRes.json();
            const moraToneList = g2pData.mora_tone_list || g2pData || [];
            
            // キャラクターのvoiceModelを使用
            const voiceModel = speaker.voiceModel || settings.model;
            
            // モデル情報を取得
            let validStyle = 'Neutral';
            let modelFile = `model_assets\\${voiceModel}\\${voiceModel}.safetensors`;
            
            try {
                const modelsRes = await fetch('/sbv2/api/models_info');
                if (modelsRes.ok) {
                    const modelsInfo = await modelsRes.json();
                    const modelInfo = modelsInfo.find(m => m.name === voiceModel);
                    if (modelInfo) {
                        if (modelInfo.files && modelInfo.files.length > 0) {
                            modelFile = modelInfo.files[0];
                        }
                        if (modelInfo.styles) {
                            const requestedStyle = this.mapEmotionToStyle(emotion);
                            validStyle = this.findValidStyle(requestedStyle, modelInfo.styles);
                        }
                    }
                }
            } catch (e) {
                console.warn('モデル情報取得失敗、デフォルト設定を使用');
            }
            
            const styleWeight = 0.5 + (settings.styleWeight - 1) * (2.5 / 19);
            
            console.log(`   model=${voiceModel}, style=${validStyle}, modelFile=${modelFile}`);
            
            // 音声合成
            const synthRes = await fetch('/sbv2/api/synthesis', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: voiceModel,
                    modelFile: modelFile,
                    text,
                    moraToneList,
                    style: validStyle,
                    styleWeight,
                    speed: settings.speed || 1.0,
                    language: 'JP'
                })
            });
            
            if (!synthRes.ok) {
                const errText = await synthRes.text();
                throw new Error(`Synthesis failed: ${synthRes.status} - ${errText}`);
            }
            
            const audioData = await synthRes.arrayBuffer();
            
            if (audioData.byteLength < 1000) {
                throw new Error(`Audio too small: ${audioData.byteLength} bytes`);
            }
            
            return audioData;
            
        } catch (error) {
            console.error(`❌ SBV2音声合成エラー:`, error);
            return null;
        }
    }
    
    /**
     * ★ v4.5: Grok Voiceでストリーミング再生（response.doneイベントベースの完了検出）
     * テキストを送ると音声がストリーミングで返ってきて再生される
     */
    async playWithGrokVoice(speaker, text) {
        return new Promise(async (resolve, reject) => {
            try {
                // ★ v4.4: APIキー取得先を拡張（Director設定 → マルチキャラUI → localStorage → SBV2パネル）
                const apiKey = this.grokApiKey 
                    || document.getElementById('mc-api-key-grok')?.value
                    || localStorage.getItem('grok_api_key')
                    || window.SBV2Panel?.grokApiKey;
                    
                if (!apiKey) {
                    console.error('❌ Grok APIキーが設定されていません（マルチキャラUIのAPI設定を確認してください）');
                    reject(new Error('Grok API key not set'));
                    return;
                }
                
                const grokVoice = speaker.grokVoice || 'Ara';
                console.log(`🎤 ${speaker.name} Grok Voice再生開始 (voice: ${grokVoice})`);
                
                // 動的インポート
                const { GrokRealtimeClient } = await import('../grok-realtime-client.js');
                
                // リップシンク用コールバック
                const onAudioReceived = (audioData) => {
                    if (speaker.vrm && window.handleAudio) {
                        window.handleAudio(audioData, speaker.vrm);
                    }
                };
                
                // テキスト受信コールバック（字幕用）
                let receivedText = '';
                const onTranscriptReceived = (delta) => {
                    receivedText += delta;
                };
                
                // Grokクライアント作成
                const client = new GrokRealtimeClient(
                    apiKey,
                    onAudioReceived,
                    onTranscriptReceived,
                    grokVoice
                );
                
                // 接続
                await client.connect();
                console.log(`✅ ${speaker.name} Grok接続成功`);
                
                // ★ v4.5: response.done イベントベースの完了検出
                client.onResponseDone = () => {
                    console.log(`✅ ${speaker.name} Grok Voice再生完了（response.done受信）`);
                    
                    // リップシンク停止
                    if (speaker.stopLipSync) {
                        speaker.stopLipSync();
                    }
                    speaker.isSpeaking = false;
                    
                    // クライアント切断
                    client.disconnect();
                    resolve();
                };
                
                // リップシンク開始
                speaker.isSpeaking = true;
                
                // テキスト送信（音声生成＆ストリーミング再生開始）
                client.sendText(text);
                
                // フォールバックタイムアウト（30秒）- 通常はresponse.doneで完了する
                setTimeout(() => {
                    if (speaker.isSpeaking) {
                        console.warn(`⏰ ${speaker.name} Grok Voiceフォールバックタイムアウト（30秒）`);
                        client.disconnect();
                        if (speaker.stopLipSync) {
                            speaker.stopLipSync();
                        }
                        speaker.isSpeaking = false;
                        resolve();
                    }
                }, 30000);
                
            } catch (error) {
                console.error(`❌ ${speaker.name} Grok Voice再生エラー:`, error);
                speaker.isSpeaking = false;
                reject(error);
            }
        });
    }
    
    mapEmotionToStyle(emotion) {
        const mapping = {
            normal: 'Neutral',
            happy_mild: 'Happy',
            happy: 'Happy',
            happy_strong: 'Happy',
            proud: 'Happy',
            grateful: 'Happy',
            sad: 'Sad',
            sad_strong: 'Sad',
            angry: 'Angry',
            angry_strong: 'Angry',
            disappointed: 'Sad',
            surprised: 'Surprise',
            thinking: 'Neutral',
            shy: 'Neutral',
            strong_ok: 'Happy'
        };
        return mapping[emotion?.toLowerCase()] || 'Neutral';
    }
    
    findValidStyle(requestedStyle, availableStyles) {
        if (availableStyles.includes(requestedStyle)) {
            return requestedStyle;
        }
        if (requestedStyle === 'Angry' && availableStyles.includes('angry')) {
            return 'angry';
        }
        if (['Happy', 'Surprise'].includes(requestedStyle) && availableStyles.includes('high')) {
            return 'high';
        }
        if (requestedStyle === 'Sad' && availableStyles.includes('low')) {
            return 'low';
        }
        if (availableStyles.includes('Neutral')) {
            return 'Neutral';
        }
        return availableStyles[0];
    }
    
    async waitForReady(entry, timeoutMs = 120000) {
        const startTime = Date.now();
        
        while (entry.status !== 'ready' && entry.status !== 'error') {
            if (Date.now() - startTime > timeoutMs) {
                console.warn(`⏰ ${entry.speakerName} 準備タイムアウト`);
                entry.status = 'error';
                break;
            }
            await this.wait(100);
            
            if (!this.isRunning) return;
        }
    }
    
    // ========================================
    // ★★★ 再生処理 ★★★
    // ========================================
    
    async playEntry(entry) {
        const speaker = this.characters.get(entry.speakerId);
        if (!speaker) return;
        
        // 再生開始フラグ
        this.isCurrentlyPlaying = true;
        this.currentPlayingSpeakerId = entry.speakerId;
        this.currentSpeakerId = entry.speakerId;
        this.currentTurnCount++;
        entry.status = 'playing';
        entry.playStartAt = Date.now();
        
        // ★ v4.5: 会話監視システムに発話開始を通知
        if (window.conversationSupervisor) {
            window.conversationSupervisor.startSpeaking(entry.speakerId);
        }
        
        console.log('');
        console.log(`🎙️ ========================================`);
        console.log(`🎙️ ${speaker.name}のターン開始 [ターン ${this.currentTurnCount}${this.maxTurns ? '/' + this.maxTurns : ''}]`);
        console.log(`🎙️ 感情: ${entry.emotion}`);
        console.log(`🎙️ 「${entry.responseText}」`);
        console.log(`🎙️ ========================================`);
        
        // 明るい緑枠表示
        this.updateSpeakerHighlight(entry.speakerId, 'speaking');
        
        // ★★★ 字幕イベント発火 ★★★
        window.dispatchEvent(new CustomEvent('multichar:playbackStart', {
            detail: {
                speakerId: entry.speakerId,
                speakerName: speaker.name,
                text: entry.responseText,
                emotion: entry.emotion
            }
        }));
        
        // AIDirectorへの通知
        if (this.onTurnStart) {
            this.onTurnStart(speaker, 'response');
        }
        
        // 他のキャラクターを聞く姿勢に
        this.characters.forEach((char, id) => {
            if (id !== entry.speakerId && char.setListening) {
                char.setListening();
            }
        });
        
        // 会話履歴に追加
        this.conversationHistory.push({
            speakerId: entry.speakerId,
            speakerName: entry.speakerName,
            text: entry.responseText,
            emotion: entry.emotion,
            timestamp: Date.now()
        });
        
        if (this.conversationHistory.length > this.maxHistoryLength) {
            this.conversationHistory = this.conversationHistory.slice(-this.maxHistoryLength);
        }
        
        if (this.onLogUpdate) {
            this.onLogUpdate(this.conversationHistory);
        }
        
        this.notifyPipelineUpdate();
        
        // ★★★ v4.3: Grok Voiceモードの場合 ★★★
        if (entry.audioData === 'GROK_STREAMING') {
            console.log(`🚀 ${speaker.name} Grok Voiceストリーミング再生モード`);
            
            // モーション再生
            if (entry.emotion && speaker.vrm && speaker.playEmotionMotion) {
                console.log(`🎬 ${speaker.name} モーション再生開始 (感情: ${entry.emotion})`);
                try {
                    const playedMotion = await speaker.playEmotionMotion(entry.emotion);
                    if (playedMotion) {
                        console.log(`🎬 ${speaker.name} モーション: ${playedMotion}`);
                    }
                } catch (e) {
                    console.warn(`⚠️ ${speaker.name} モーション再生エラー:`, e);
                }
            }
            
            // Grok Voiceで再生
            try {
                await this.playWithGrokVoice(speaker, entry.responseText);
            } catch (e) {
                console.warn(`⚠️ Grok Voice再生失敗、ブラウザTTSにフォールバック`);
                await this.playBrowserTTS(speaker, entry.responseText);
            }
        }
        // ★★★ v3.9: 行ごと感情分析モード（SBV2用） ★★★
        else if (this.enableLineByLineEmotion && entry.audioData) {
            console.log(`🎭 v3.9: 行ごと感情分析モードで再生`);
            await this.playWithLineByLineEmotion(speaker, entry);
        } else {
            // 従来の再生方式（1感情のみ）
            // ★★★ 1. モーション再生（CharacterUnit.playEmotionMotion）★★★
            if (entry.emotion && speaker.vrm && speaker.playEmotionMotion) {
                console.log(`🎬 ${speaker.name} モーション再生開始 (感情: ${entry.emotion})`);
                try {
                    const playedMotion = await speaker.playEmotionMotion(entry.emotion);
                    if (playedMotion) {
                        console.log(`🎬 ${speaker.name} モーション: ${playedMotion}`);
                    }
                } catch (e) {
                    console.warn(`⚠️ ${speaker.name} モーション再生エラー:`, e);
                }
            }
            
            // ★★★ 2. 音声再生（先読み済みデータ or ブラウザTTS）★★★
            if (entry.audioData) {
                console.log(`🔊 ${speaker.name} 音声再生開始（先読み済み）`);
                await this.playAudioWithLipSync(speaker, entry.audioData);
            } else {
                console.log(`🔊 ${speaker.name} ブラウザTTSにフォールバック`);
                await this.playBrowserTTS(speaker, entry.responseText);
            }
        }
        
        // 再生完了
        entry.playEndAt = Date.now();
        entry.status = 'done';
        
        this.isCurrentlyPlaying = false;
        this.currentPlayingSpeakerId = null;
        
        // ★ v4.5: 会話監視システムに発話終了を通知
        if (window.conversationSupervisor) {
            window.conversationSupervisor.endSpeaking(entry.speakerId);
        }
        
        // ★★★ 字幕終了イベント発火 ★★★
        window.dispatchEvent(new CustomEvent('multichar:playbackEnd', {
            detail: {
                speakerId: entry.speakerId,
                speakerName: speaker.name
            }
        }));
        
        this.updateSpeakerHighlight(entry.speakerId, 'none');
        
        // 表情をリセット
        this.resetExpression(speaker, 500);
        
        // ★★★ v4.1: 喋り終わった後に待機モーション選択＆再生 ★★★
        this.playIdleMotionAfterSpeech(speaker, entry.responseText, entry.emotion);
        
        if (this.onTurnEnd) {
            this.onTurnEnd(speaker, entry.responseText, entry.emotion);
        }
        
        console.log(`✅ ${speaker.name}のターン完了`);
    }
    
    // ========================================
    // ★★★ v3.9: 行ごと感情分析・表情切替機能 ★★★
    // ========================================
    
    /**
     * テキストを行（文）ごとに分割
     */
    splitIntoLines(text) {
        const minLineLength = 2;
        const lines = text
            .replace(/\r\n/g, '\n')
            .split(/(?<=[\u3002\uff01\uff1f\n])|(?<=\.\s)|(?<=!\s)|(?<=\?\s)/)
            .map(line => line.trim())
            .filter(line => line.length >= minLineLength);
        
        console.log(`📝 行分割: ${lines.length}行`);
        return lines;
    }
    
    /**
     * 複数行の感情を一括分析（OpenAI API）
     * ★ v4.0: モーションファイル名も選択
     * 🔧 v4.1.5: speakerIdを受け取って除外モーションを適用
     */
    async analyzeEmotionsForLines(lines, speakerId = null) {
        const apiKey = this.getOpenAIApiKey();
        if (!apiKey) {
            console.warn('⚠️ OpenAI APIキーなし → 全てneutral');
            return lines.map(() => ({ emotion: 'neutral', weight: 0.3, motion: this.selectMotionForEmotion('neutral', speakerId) }));
        }

        console.log('🧠 行ごと感情分析開始...', lines.length, '行');

        try {
            const response = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + apiKey
                },
                body: JSON.stringify({
                    model: 'gpt-4o-mini',
                    messages: [{
                        role: 'system',
                        content: `Analyze emotions for each line of Japanese text.

Output JSON array with emotion and weight (0.1-0.9) for each line:
[{"emotion": "happy", "weight": 0.6}, {"emotion": "sad", "weight": 0.4}, ...]

Emotions: normal, happy, happy_mild, happy_strong, grateful, proud, sad, sad_strong, angry, angry_strong, disappointed, surprised, thinking, shy, strong_ok

Rules:
- Weight 0.1-0.3: subtle emotion
- Weight 0.4-0.6: moderate emotion  
- Weight 0.7-0.9: strong emotion
- Output ONLY JSON array
- Must have same number of objects as input lines`
                    }, {
                        role: 'user',
                        content: lines.map((line, i) => `${i + 1}: ${line}`).join('\n')
                    }],
                    temperature: 0.3,
                    max_tokens: 500
                })
            });

            if (!response.ok) throw new Error(`API Error: ${response.status}`);

            const data = await response.json();
            const content = data.choices[0].message.content.trim();
            
            // JSONパース（```json ... ``` 形式も対応）
            let jsonStr = content;
            if (content.includes('```')) {
                const match = content.match(/```(?:json)?\s*([\s\S]*?)```/);
                if (match) jsonStr = match[1].trim();
            }
            
            const emotions = JSON.parse(jsonStr);
            
            // ★ v4.0: 各行にモーションファイル名を追加
            // 🔧 v4.1.5: speakerIdを渡して除外モーションを適用
            const emotionsWithMotions = emotions.map(e => ({
                ...e,
                motion: this.selectMotionForEmotion(e.emotion, speakerId)
            }));
            
            console.log('🎭 行ごと感情＆モーション分析結果:', emotionsWithMotions);
            
            // 行数調整
            while (emotionsWithMotions.length < lines.length) {
                emotionsWithMotions.push({ emotion: 'neutral', weight: 0.3, motion: this.selectMotionForEmotion('neutral', speakerId) });
            }
            
            return emotionsWithMotions.slice(0, lines.length);
        } catch (e) {
            console.error('❌ 感情分析エラー:', e);
            return lines.map(() => ({ emotion: 'neutral', weight: 0.3, motion: this.selectMotionForEmotion('neutral', speakerId) }));
        }
    }
    
    /**
     * ★ v4.1: 喋り終わった後に待機モーションを文脈からAI判断で選択して再生
     */
    async playIdleMotionAfterSpeech(speaker, text, emotion) {
        if (!speaker.vrm || !speaker.mixer) {
            console.warn(`⚠️ ${speaker.name}: 待機モーションスキップ（VRM/mixerなし）`);
            return;
        }
        
        console.log(`🧘 ${speaker.name} 待機モーション選択中...（文脈からAI判断）`);
        
        try {
            const apiKey = this.getOpenAIApiKey();
            
            // 🔧 v4.1.5: キャラクターの除外待機モーションを取得
            const excludedIdleMotions = this.getExcludedIdleMotions(speaker.id);
            if (excludedIdleMotions.length > 0) {
                console.log(`🚫 ${speaker.name} 除外待機モーション: ${excludedIdleMotions.length}件`);
            }
            
            if (!apiKey) {
                // APIキーがない場合はナチュラル待機
                console.log(`⚠️ APIキーなし → ナチュラル待機を選択`);
                const motions = this.filterExcludedIdleMotions(this.idleMotionCategories.natural, excludedIdleMotions);
                if (motions.length === 0) {
                    console.warn(`⚠️ 全て除外されているため待機モーションなし`);
                    return;
                }
                const motion = motions[Math.floor(Math.random() * motions.length)];
                await this.playMotionWithCrossfade(speaker, motion);
                return;
            }
            
            // AIに文脈から待機モーションカテゴリを判断させる
            const response = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + apiKey
                },
                body: JSON.stringify({
                    model: 'gpt-4o-mini',
                    messages: [{
                        role: 'system',
                        content: `あなたはキャラクターが話し終わった後の待機モーションを選ぶアシスタントです。

セリフの内容と文脈を読み、話し終わった後にどんな待機姿勢が自然かを判断してください。
キーワードマッチングではなく、文脈全体の雰囲気から判断してください。

【待機モーションカテゴリ】
- natural: 普通の会話、説明、質問の後。落ち着いた待機姿勢
- happy: 楽しい話、良いニュース、褒められた後の嬉しそうな待機
- happy_mild: まあまあ楽しい、軽くウキウキした後の待機
- happy_strong: 大喜び、感動、大成功の後の興奮した待機
- angry: イライラ、不満、軽い怒りの後の待機
- angry_strong: 激怒、ぶち切れた後の待機
- annoyed: 嫌なこと、ツッコミ、呆れた後の待機
- annoyed_strong: すごく嫌、うんざりした後の待機
- sad: 悲しい、残念、がっかりした後の待機
- sad_strong: とても悲しい、泣きそうな後の待機
- disappointed: すごくがっかり、落ち込んだ後の待機
- muscle: 筋肉、戦い、ヒーロー、力強い話の後
- polite: 丁寧なお礼、挨拶の後
- teasing: からかい、おちょくりの後
- sexy: 色っぽい、誘惑的な話の後
- sexy_strong: とてもセクシー、誘惑的な話の後
- pray: 祈り、願い事の後
- shy: 恥ずかしい、照れた後の待機
- exercise: 運動、体操、ストレッチ、ラジオ体操の話題の後（★特定状況のみ）
- spin_happy: 極度にハイテンションで跳ね回りたいほど嬉しい後（★非常に特殊、めったに選ばない）

カテゴリ名のみを1つ出力してください。
迷ったらnaturalを選んでください。
exerciseとspin_happyは非常に特殊な状況のみです。`
                    }, {
                        role: 'user',
                        content: `このセリフを言い終わった後の待機姿勢を選んでください：

「${text}」`
                    }],
                    temperature: 0.3,
                    max_tokens: 20
                })
            });
            
            if (!response.ok) {
                throw new Error(`API Error: ${response.status}`);
            }
            
            const data = await response.json();
            const categoryRaw = data.choices[0].message.content.trim().toLowerCase();
            
            // カテゴリ名のクリーニング
            const category = categoryRaw.replace(/[^a-z_]/g, '');
            
            console.log(`🧘 ${speaker.name} 待機カテゴリ判定: ${category}`);
            
            // ★ v4.1.4: キャラクターの感情制限をチェック
            const adjustedCategory = this.getAdjustedEmotion(speaker.id, category);
            if (adjustedCategory !== category) {
                console.log(`🚫 ${speaker.name}: 待機カテゴリ ${category} は制限中 → ${adjustedCategory}`);
            }
            
            // カテゴリからモーションを選択（🔧 v4.1.5: 除外フィルタリング）
            const rawMotions = this.idleMotionCategories[adjustedCategory] || this.idleMotionCategories.natural;
            console.log(`🔍 カテゴリ ${adjustedCategory} の元モーション数: ${rawMotions.length}`);
            console.log(`🔍 除外リスト:`, excludedIdleMotions);
            
            const motions = this.filterExcludedIdleMotions(rawMotions, excludedIdleMotions);
            console.log(`🔍 フィルタリング後のモーション数: ${motions.length}`);
            
            if (motions.length === 0) {
                console.warn(`⚠️ ${speaker.name}: カテゴリ ${adjustedCategory} のモーションが全て除外 → naturalにフォールバック`);
                const fallbackMotions = this.filterExcludedIdleMotions(this.idleMotionCategories.natural, excludedIdleMotions);
                if (fallbackMotions.length === 0) {
                    console.warn(`⚠️ 全て除外されているため待機モーションなし`);
                    return;
                }
                const motion = fallbackMotions[Math.floor(Math.random() * fallbackMotions.length)];
                console.log(`🧘 ${speaker.name} 待機モーション(フォールバック): ${motion}`);
                await this.playMotionWithCrossfade(speaker, motion);
                return;
            }
            
            const motion = motions[Math.floor(Math.random() * motions.length)];
            console.log(`🧘 ${speaker.name} 待機モーション: ${motion}`);
            
            // クロスフェードで再生
            await this.playMotionWithCrossfade(speaker, motion);
            
        } catch (e) {
            console.warn(`⚠️ ${speaker.name} 待機モーション選択エラー:`, e);
            // エラー時はナチュラル待機（🔧 v4.1.5: 除外フィルタリング）
            const excludedIdleMotions = this.getExcludedIdleMotions(speaker.id);
            const motions = this.filterExcludedIdleMotions(this.idleMotionCategories.natural, excludedIdleMotions);
            if (motions.length === 0) return;
            const motion = motions[Math.floor(Math.random() * motions.length)];
            await this.playMotionWithCrossfade(speaker, motion);
        }
    }
    
    /**
     * ★ v4.1.4: 感情からモーションファイルを選択（履歴管理付き + キャラ制限対応）
     * - 前回と同じモーションを避ける
     * - 派手なガッツポーズ系はhappy_strongのみ
     * - キャラクターごとの感情制限に対応
     * 
     * 【モーション内容メモ】
     * VRMA_03: 可愛くピースサイン
     * VRMA_04: 可愛く片手でピストルをうつ仕草
     * 女性しゃべり01: 可愛く腕をくんで片腕を立てて話す
     * 女性しゃべり02: ゆびを見つめて話す
     * 女性しゃべり0４: 腰に手をあてて話す
     */
    selectMotionForEmotion(emotion, speakerId = null) {
        // ★ v4.1.4: キャラクターの感情制限をチェック
        const adjustedEmotion = speakerId ? this.getAdjustedEmotion(speakerId, emotion) : (emotion || 'normal').toLowerCase();
        // ★ 大幅拡充: 待機モーションも含めた豊富なレパートリー
        // ★ v4.1.3: 派手なガッツポーズ系はhappy_strongのみに移動
        const EMOTION_MOTIONS_EXPANDED = {
            normal: [
                '女性しゃべり01.vrma',      // 可愛く腕をくんで片腕を立てて話す
                '女性しゃべり02.vrma',      // ゆびを見つめて話す
                '女性しゃべり0４.vrma',     // 腰に手をあてて話す
                'おしとやかにしゃべる.vrma',
                'アンリアルキャラ考える.vrma', 'アンリアルキャラリアクションポーズ.vrma',
                'アンリアルキャラゆびうごかし.vrma', '真剣にあれこれ考える.vrma'
            ],
            happy: [
                // ★ 落ち着いた嬉しさ（派手なモーションは除外）
                '女性しゃべり05ルンルン気分.vrma', 'アンリアルキャラ喜ぶ.vrma',
                'アンリアルキャラ興味しんしん.vrma',
                'VRMA_05.vrma'
            ],
            happy_mild: [
                // ★ 軽いウキウキ（ピース/ピストルは除外）
                '女性しゃべり01.vrma',      // 可愛く腕をくんで片腕を立てて話す
                '女性しゃべり02.vrma',      // ゆびを見つめて話す
                '女性しゃべり05ルンルン気分.vrma',
                'アンリアルキャラ興味しんしん.vrma', 'VRMA_05.vrma'
            ],
            happy_strong: [
                // ★ すごくすごく嬉しいときのみ（派手なモーション集約）
                'アンリアルキャラガッツポーズでめちゃくちゃよろこぶ.vrma',
                'アンリアルキャラガッツポーズでジャンプしてめちゃくちゃよろこぶ.vrma',
                '喜びガッツポーズ.vrma',
                // ★ 以下はhappyから昇格
                'アンリアルキャラセクシー投げキッス.vrma',
                'アンリアルキャラノリノリで手をふる.vrma',
                'アンリアルキャラ全身でOKマークポーズ.vrma',
                '女性投げキッス.vrma',
                'アンリアルキャラセクシーモーション.vrma',
                'アンリアルキャラまーざっとこんなもんよツンデレ.vrma',
                'VRMA_03.vrma',             // 可愛くピースサイン
                'VRMA_04.vrma'              // 可愛く片手でピストルをうつ仕草
            ],
            grateful: [
                '女性しゃべり05ルンルン気分.vrma', 'アンリアルキャラ丁寧なお辞儀.vrma',
                'アンリアルキャラ喜ぶ.vrma'
            ],
            proud: [
                'アンリアルキャラ腰に手をあて仁王だち.vrma',
                '女性しゃべり0４.vrma'      // 腰に手をあてて話す（自信ありげ）
            ],
            sad: [
                '悲しくしゃべる.vrma', 'あたまをおさえてがっかり.vrma',
                'アンリアルキャラ頭をかかえる.vrma', 'アンリアルキャラ頭をかかえるB.vrma',
                'ええええ～！いやだよ～！どんびき.vrma'
            ],
            sad_strong: [
                '悲しくしゃがんで泣いちゃう.vrma', 'しゃがんでいじける.vrma'
            ],
            angry: [
                'しゃべりいかりイライラ.vrma', 'アニメイライラ.vrma', '怒りあきれる.vrma',
                'アンリアルキャラ否定.vrma', 'アンリアルキャラびっくり否定怒る.vrma',
                '冗談じゃない手ではらって一周.vrma',
                '女性しゃべり0４.vrma'      // 腰に手をあてて話す（怒りポーズ）
            ],
            angry_strong: [
                'ふみつけけりまくり.vrma', 'アンリアルキャラもーなんなのよ！.vrma',
                '怒りゆびさし.vrma', 'ぴょんぴょんジャンプ拒絶.vrma',
                '威嚇して蹴ってくる.vrma', '怒って攻撃しまくり.vrma'
            ],
            disappointed: [
                'うなだれて一周.vrma', 'しゃがんでいじける.vrma',
                'あたまをおさえてがっかり.vrma'
            ],
            surprised: [
                'アンリアルキャラびっくり.vrma', 'アンリアルキャラびっくり否定怒る.vrma'
            ],
            thinking: [
                '真剣にあれこれ考える.vrma', 'アンリアルキャラ考える.vrma',
                'アンリアルキャラ頭をかかえる.vrma',
                '女性しゃべり02.vrma'       // ゆびを見つめて話す（考え込む感じ）
            ],
            shy: [
                '恥ずかしくて顔をおおう.vrma', '恥ずかしい顔おおい.vrma'
            ],
            strong_ok: [
                'アンリアルキャラ全身でOKマークポーズ.vrma'
            ],
            annoyed: [
                '怒りあきれる.vrma', 'アンリアルキャラ否定して一線をひく.vrma',
                'アンリアルキャラまーまーおちついてくび.vrma',
                'アンリアルキャラおっぱらいディス.vrma'
            ],
            annoyed_strong: [
                'アンリアルキャラえーなにそれ！嫌なリアクション.vrma',
                'アンリアルキャラもーなんなのよ！.vrma',
                'アンリアルキャラじだんだ.vrma'
            ],
            teasing: [
                'おちょくりwave.vrma'
            ],
            sexy: [
                'アンリアルキャラいろいろなセクシーポーズ.vrma'
            ],
            polite: [
                'アンリアルキャラ丁寧なお辞儀.vrma'
            ],
            // ★ 特殊モーション（特定の状況のみ）
            exercise: [
                'VRMA_07.vrma'  // ラジオ体操 - 運動や体操の話題のときのみ
            ],
            spin_happy: [
                'VRMA_01.vrma'  // ルンルン回転 - すごくハイテンションで喜んでいるときのみ
            ]
        };
        
        // ★ v4.1.4: 調整済み感情でモーションを選択
        let motions = EMOTION_MOTIONS_EXPANDED[adjustedEmotion] || EMOTION_MOTIONS_EXPANDED.normal;
        
        // 🔧 v4.1.5: 除外モーションをフィルタリング（話し中モーションにも適用）
        if (speakerId) {
            const excludedIdleMotions = this.getExcludedIdleMotions(speakerId);
            if (excludedIdleMotions.length > 0) {
                const filteredMotions = this.filterExcludedIdleMotions(motions, excludedIdleMotions);
                if (filteredMotions.length > 0) {
                    motions = filteredMotions;
                }
            }
        }
        
        // ★ v4.1.3: 履歴管理で前回と同じモーションを避ける
        return this.selectMotionAvoidingHistory(motions, speakerId);
    }
    
    /**
     * ★ v4.1.3: 履歴を避けてモーションを選択
     */
    selectMotionAvoidingHistory(motions, speakerId) {
        if (!speakerId || motions.length <= 1) {
            return motions[Math.floor(Math.random() * motions.length)];
        }
        
        // 履歴を取得
        const history = this.motionHistory.get(speakerId) || [];
        
        // 履歴にないモーションをフィルタ
        const availableMotions = motions.filter(m => !history.includes(m));
        
        // 全部履歴にある場合は履歴をクリアして全てから選択
        const candidates = availableMotions.length > 0 ? availableMotions : motions;
        const selected = candidates[Math.floor(Math.random() * candidates.length)];
        
        // 履歴に追加
        history.push(selected);
        if (history.length > this.motionHistorySize) {
            history.shift(); // 古い履歴を削除
        }
        this.motionHistory.set(speakerId, history);
        
        console.log(`🎲 モーション選択: ${selected} (履歴: ${history.length}件)`);
        
        return selected;
    }
    
    /**
     * OpenAI APIキーを取得
     */
    getOpenAIApiKey() {
        try {
            // localStorageから
            const stored = localStorage.getItem('vrm_viewer_openai_api_key');
            if (stored) return stored;
            
            // マルチキャラ用APIキー
            const mcKey = document.getElementById('mc-api-key-openai')?.value;
            if (mcKey) return mcKey;
        } catch (e) {}
        
        if (window.app && window.app.OPENAI_API_KEY) return window.app.OPENAI_API_KEY;
        if (window.app && window.app.chatGPTClient && window.app.chatGPTClient.apiKey) {
            return window.app.chatGPTClient.apiKey;
        }
        return null;
    }
    
    /**
     * 表情モーフを適用（スムーズ遷移）
     * ★ v3.9.2: happy系は強度0.5倍に調整
     */
    applyExpressionToVRM(vrm, emotionName, weight, duration = 200) {
        if (!vrm || !vrm.expressionManager) return;
        
        const em = vrm.expressionManager;
        
        // 感情名をVRM表情名に変換
        const EMOTION_MAP = {
            joy: 'happy', happy: 'happy', excited: 'happy', grateful: 'happy', love: 'happy',
            fun: 'happy',  // funも追加
            sad: 'sad', crying: 'sad', lonely: 'sad', disappointed: 'sad',
            angry: 'angry', annoyed: 'angry', frustrated: 'angry',
            surprised: 'surprised', shocked: 'surprised', confused: 'surprised',
            relaxed: 'relaxed', calm: 'relaxed', shy: 'relaxed',
            neutral: 'neutral', thinking: 'neutral'
        };
        
        const targetExpression = EMOTION_MAP[emotionName] || 'neutral';
        
        // ★★★ v3.9.2: happy系の感情は強度を0.5倍に調整 ★★★
        let adjustedWeight = weight;
        if (targetExpression === 'happy') {
            adjustedWeight = weight * 0.5;
            console.log(`😊 happy系表情: ${weight.toFixed(2)} → ${adjustedWeight.toFixed(2)} (0.5倍調整)`);
        }
        
        const targetWeight = targetExpression === 'neutral' ? 0 : adjustedWeight;
        
        const allExpressions = ['happy', 'angry', 'sad', 'surprised', 'relaxed'];
        
        // 現在の値を取得
        const startWeights = {};
        allExpressions.forEach(expr => {
            try { startWeights[expr] = em.getValue(expr) || 0; }
            catch (e) { startWeights[expr] = 0; }
        });

        const startTime = performance.now();

        const animate = () => {
            const elapsed = performance.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const ease = 1 - Math.pow(1 - progress, 3); // ease-out

            try {
                allExpressions.forEach(expr => {
                    if (expr === targetExpression && targetWeight > 0) {
                        em.setValue(expr, startWeights[expr] + (targetWeight - startWeights[expr]) * ease);
                    } else {
                        em.setValue(expr, startWeights[expr] * (1 - ease));
                    }
                });

                if (progress < 1) {
                    requestAnimationFrame(animate);
                } else {
                    console.log(`🎭 表情変更完了: ${targetExpression} (${targetWeight.toFixed(2)})`);
                }
            } catch (e) {
                // エラー時は中断
            }
        };

        requestAnimationFrame(animate);
        console.log(`🎭 表情変更: ${emotionName} → ${targetExpression} (${weight.toFixed(2)})`);
    }
    
    /**
     * 表情をリセット
     */
    resetExpression(speaker, duration = 500) {
        if (!speaker || !speaker.vrm || !speaker.vrm.expressionManager) return;
        
        const em = speaker.vrm.expressionManager;
        const allExpressions = ['happy', 'angry', 'sad', 'surprised', 'relaxed'];
        
        const startWeights = {};
        allExpressions.forEach(expr => {
            try { startWeights[expr] = em.getValue(expr) || 0; }
            catch (e) { startWeights[expr] = 0; }
        });
        
        const startTime = performance.now();
        
        const animate = () => {
            const elapsed = performance.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const ease = 1 - Math.pow(1 - progress, 3);
            
            try {
                allExpressions.forEach(expr => {
                    em.setValue(expr, startWeights[expr] * (1 - ease));
                });
                
                if (progress < 1) {
                    requestAnimationFrame(animate);
                }
            } catch (e) {}
        };
        
        requestAnimationFrame(animate);
    }
    
    /**
     * 音声の再生時間を推定（WAVヘッダーから）
     */
    estimateAudioDuration(audioData) {
        try {
            const view = new DataView(audioData);
            // WAVフォーマット: バイトレートはオフセット28にある
            const byteRate = view.getUint32(28, true);
            const dataSize = audioData.byteLength - 44; // ヘッダー分を引く
            if (byteRate > 0) {
                return (dataSize / byteRate) * 1000; // ms
            }
        } catch (e) {}
        
        // フォールバック: データサイズから推定（約48kHz 16bit monoを想定）
        return (audioData.byteLength / 96000) * 1000;
    }
    
    /**
     * ★★★ 行ごと感情分析・表情・モーション切替で再生 ★★★
     * 
     * 【v4.0 改善】体モーションも行ごとに切替:
     * - 体モーション: 行ごとに感情分析して選択＆クロスフェード切替
     * - 表情モーフ: 行ごとに感情分析して切替
     */
    async playWithLineByLineEmotion(speaker, entry) {
        // ★★★ v4.0: 最初のモーションだけ事前に再生（音声開始前に動き始める） ★★★
        if (entry.emotion && speaker.vrm) {
            console.log(`🎬 ${speaker.name} 初期モーション再生開始 (全体感情: ${entry.emotion})`);
            try {
                if (speaker.playEmotionMotion) {
                    const playedMotion = await speaker.playEmotionMotion(entry.emotion);
                    if (playedMotion) {
                        console.log(`🎬 ${speaker.name} 初期モーション: ${playedMotion}`);
                    }
                }
            } catch (e) {
                console.warn(`⚠️ ${speaker.name} 初期モーション再生エラー:`, e);
            }
        }
        
        // 2. テキストを行分割
        const lines = this.splitIntoLines(entry.responseText);
        
        if (lines.length <= 1) {
            // 1行以下なら表情は全体感情を適用
            console.log(`🎭 1行のみ、全体感情で表情適用`);
            if (entry.emotion && speaker.vrm) {
                this.applyExpressionToVRM(speaker.vrm, entry.emotion, 0.6);
            }
            await this.playAudioWithLipSync(speaker, entry.audioData);
            return;
        }
        
        // 3. 行ごと感情分析（音声再生と並行して実行）
        // ★ v4.0: 表情＋モーション両方を分析
        // 🔧 v4.1.5: speaker.idを渡して除外モーションを適用
        console.log(`🧠 ${lines.length}行の表情＆モーション用感情分析開始...`);
        const emotionsPromise = this.analyzeEmotionsForLines(lines, speaker.id);
        
        // 3. 音声の総再生時間を推定
        const totalDuration = this.estimateAudioDuration(entry.audioData);
        const avgLineTime = totalDuration / lines.length;
        
        console.log(`⏱️ 推定再生時間: ${totalDuration.toFixed(0)}ms, 行平均: ${avgLineTime.toFixed(0)}ms`);
        
        // 4. 音声再生開始
        const audioPromise = new Promise((resolve, reject) => {
            try {
                const blob = new Blob([entry.audioData], { type: 'audio/wav' });
                const url = URL.createObjectURL(blob);
                const audio = new Audio(url);
                
                audio.onplay = () => {
                    console.log(`👄 ${speaker.name} リップシンク開始`);
                    if (speaker.startAudioLipSync) {
                        speaker.isSpeaking = true;
                        speaker.startAudioLipSync(audio);
                    }
                };
                
                audio.onended = () => {
                    URL.revokeObjectURL(url);
                    if (speaker.stopLipSync) {
                        speaker.stopLipSync();
                    }
                    speaker.isSpeaking = false;
                    console.log(`👄 ${speaker.name} リップシンク終了`);
                    resolve();
                };
                
                audio.onerror = (e) => {
                    URL.revokeObjectURL(url);
                    if (speaker.stopLipSync) {
                        speaker.stopLipSync();
                    }
                    speaker.isSpeaking = false;
                    reject(e);
                };
                
                // 音声再生
                audio.play().catch(reject);
                
                // ★★★ 5. 感情分析完了を待って表情＆モーション切替スケジュール ★★★
                emotionsPromise.then(emotions => {
                    this.scheduleExpressionChanges(speaker, lines, emotions, avgLineTime);
                });
                
            } catch (e) {
                reject(e);
            }
        });
        
        await audioPromise;
    }
    
    /**
     * 表情＆モーション切替をスケジュール
     * ★ v4.0: モーションも行ごとにクロスフェード切替
     */
    scheduleExpressionChanges(speaker, lines, emotions, avgLineTime) {
        console.log(`🎭🎬 表情＆モーション切替スケジュール開始: ${lines.length}行, 間隔: ${avgLineTime.toFixed(0)}ms`);
        
        lines.forEach((line, i) => {
            const emotion = emotions[i] || { emotion: 'neutral', weight: 0.3, motion: '女性しゃべり01.vrma' };
            const delay = i * avgLineTime;
            
            setTimeout(() => {
                if (!this.isRunning) return; // 会話停止時はスキップ
                
                console.log(`🎭🎬 [${i + 1}/${lines.length}] ${emotion.emotion} (${emotion.weight.toFixed(2)}) モーション: ${emotion.motion} - "${line.substring(0, 20)}..."`);
                
                // 表情切替
                if (speaker.vrm) {
                    this.applyExpressionToVRM(speaker.vrm, emotion.emotion, emotion.weight);
                }
                
                // ★ v4.0: モーション切替（クロスフェード）
                if (speaker.vrm && emotion.motion) {
                    this.playMotionWithCrossfade(speaker, emotion.motion);
                }
            }, delay);
        });
    }
    
    /**
     * ★ v4.0: モーションをクロスフェードで再生
     */
    async playMotionWithCrossfade(speaker, motionFile) {
        if (!speaker.vrm || !speaker.mixer) {
            console.warn(`⚠️ ${speaker.name}: VRMまたはmixerがありません`);
            return;
        }
        
        try {
            const THREE = window.THREE;
            const loader = new window.GLTFLoaderClass();
            const { VRMAnimationLoaderPlugin, createVRMAnimationClip } = await import('@pixiv/three-vrm-animation');
            
            loader.register((parser) => new VRMAnimationLoaderPlugin(parser));
            const gltf = await loader.loadAsync('./motions/' + encodeURIComponent(motionFile));
            const vrmAnim = gltf.userData.vrmAnimation || gltf.userData.vrmAnimations?.[0];
            
            if (!vrmAnim) {
                console.warn(`⚠️ モーションデータなし: ${motionFile}`);
                return;
            }
            
            const clip = createVRMAnimationClip(vrmAnim, speaker.vrm);
            const newAction = speaker.mixer.clipAction(clip);
            
            // クロスフェード設定
            const crossfadeDuration = this.motionCrossfadeDuration || 0.7;
            
            if (speaker.currentAction && speaker.currentAction.isRunning()) {
                // 前のモーションからクロスフェード
                newAction.reset();
                newAction.setLoop(THREE.LoopRepeat);
                newAction.setEffectiveWeight(1);
                newAction.play();
                speaker.currentAction.crossFadeTo(newAction, crossfadeDuration, true);
                console.log(`🎬 ${speaker.name} モーション切替: ${motionFile} (crossfade: ${crossfadeDuration}s)`);
            } else {
                // 最初のモーション
                newAction.reset();
                newAction.setLoop(THREE.LoopRepeat);
                newAction.play();
                console.log(`🎬 ${speaker.name} モーション開始: ${motionFile}`);
            }
            
            speaker.currentAction = newAction;
            
        } catch (error) {
            console.error(`❌ ${speaker.name} モーション切替エラー:`, error);
        }
    }
    
    /**
     * 音声再生 + リップシンク（CharacterUnitの機能を使用）
     */
    async playAudioWithLipSync(speaker, audioData) {
        return new Promise((resolve, reject) => {
            try {
                const blob = new Blob([audioData], { type: 'audio/wav' });
                const url = URL.createObjectURL(blob);
                const audio = new Audio(url);
                
                audio.onplay = () => {
                    console.log(`👄 ${speaker.name} リップシンク開始`);
                    // CharacterUnitの音声連動リップシンクを使用
                    if (speaker.startAudioLipSync) {
                        speaker.isSpeaking = true;
                        speaker.startAudioLipSync(audio);
                    }
                };
                
                audio.onended = () => {
                    URL.revokeObjectURL(url);
                    if (speaker.stopLipSync) {
                        speaker.stopLipSync();
                    }
                    speaker.isSpeaking = false;
                    console.log(`👄 ${speaker.name} リップシンク終了`);
                    resolve();
                };
                
                audio.onerror = (e) => {
                    URL.revokeObjectURL(url);
                    if (speaker.stopLipSync) {
                        speaker.stopLipSync();
                    }
                    speaker.isSpeaking = false;
                    reject(e);
                };
                
                audio.play().catch(reject);
                
            } catch (e) {
                reject(e);
            }
        });
    }
    
    /**
     * ブラウザTTSフォールバック
     */
    async playBrowserTTS(speaker, text) {
        return new Promise((resolve) => {
            // パターンリップシンク開始
            if (speaker.startPatternLipSync) {
                speaker.isSpeaking = true;
                speaker.startPatternLipSync();
            }
            
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.lang = 'ja-JP';
            utterance.onend = () => {
                if (speaker.stopLipSync) {
                    speaker.stopLipSync();
                }
                speaker.isSpeaking = false;
                resolve();
            };
            utterance.onerror = () => {
                if (speaker.stopLipSync) {
                    speaker.stopLipSync();
                }
                speaker.isSpeaking = false;
                resolve();
            };
            speechSynthesis.speak(utterance);
        });
    }
    
    // ========================================
    // 話者決定・プロンプト構築
    // ========================================
    
    getNextSpeaker(currentSpeakerId) {
        if (this.turnMode === 'round-robin') {
            const currentIndex = this.turnOrder.indexOf(currentSpeakerId);
            const nextIndex = (currentIndex + 1) % this.turnOrder.length;
            return this.turnOrder[nextIndex];
        }
        return this.decideDynamicNextSpeaker(currentSpeakerId);
    }
    
    decideDynamicNextSpeaker(currentSpeakerId) {
        const lastMessage = this.conversationHistory[this.conversationHistory.length - 1];
        const others = this.turnOrder.filter(id => id !== currentSpeakerId);
        
        if (!lastMessage || others.length === 0) {
            return others[0] || currentSpeakerId;
        }
        
        for (const id of others) {
            const char = this.characters.get(id);
            if (char && lastMessage.text.includes(char.name)) {
                return id;
            }
        }
        
        return others[Math.floor(Math.random() * others.length)];
    }
    
    buildPrompt(speakerId, context, type) {
        const speaker = this.characters.get(speakerId);
        if (!speaker) return '';
        
        const others = this.turnOrder
            .filter(id => id !== speakerId)
            .map(id => {
                const char = this.characters.get(id);
                return char ? `・${char.name}: ${char.personality}` : '';
            })
            .filter(s => s)
            .join('\n');
        
        const recentHistory = this.conversationHistory
            .slice(-8)
            .map(h => `${h.speakerName}: ${h.text}`)
            .join('\n');
        
        // ★ カンペ（追加システムプロンプト）
        const systemNoteSection = this.systemNote ? `
【重要な注意】
${this.systemNote}
` : '';
        
        // ★★★ v4.2: 会話監視システムから感情コンテキストを取得 ★★★
        let emotionContextSection = '';
        if (this.useEmotionContext && window.conversationSupervisor?.isSystemEnabled()) {
            const emotionContext = window.conversationSupervisor.generateContextForCharacter(speakerId);
            if (emotionContext) {
                emotionContextSection = `
【あなたの現在の感情状態・会話の文脈】
${emotionContext}
※この感情状態を反映して話してください。怒っているなら怒りを込めて、悲しいなら悲しげに、楽しいなら楽しそうに話してください。
`;
                console.log(`📋 ${speaker.name} 感情コンテキスト適用:`, emotionContext.substring(0, 100) + '...');
            }
        }
        
        if (type === 'initial') {
            return `あなたは「${speaker.name}」です。

【あなたの性格】
${speaker.personality || '明るく元気な性格です。'}
${emotionContextSection}
【会話仲間】
${others || '(なし)'}
${systemNoteSection}
【トピック】
${context || '自由に会話を始めてください'}

このトピックについて、あなたから会話を始めてください。
2〜3文程度で簡潔に。自然な会話でお願いします。感情状態を反映した話し方をしてください。`;
        }
        
        const lastSpeaker = this.conversationHistory[this.conversationHistory.length - 1];
        const lastSpeakerName = lastSpeaker ? lastSpeaker.speakerName : '誰か';
        
        // ★ トピックセクション（会話中も反映）
        const topicSection = this.topic ? `
【現在のトピック・話題】
${this.topic}
※この話題に沿って会話を進めてください。
` : '';
        
        return `あなたは「${speaker.name}」です。

【あなたの性格】
${speaker.personality || '明るく元気な性格です。'}
${emotionContextSection}
【会話仲間】
${others || '(なし)'}
${topicSection}${systemNoteSection}
【これまでの会話】
${recentHistory || '(会話開始)'}

【${lastSpeakerName}の直前の発言】
「${context}」

あなたのキャラクターらしく反応してください。2〜3文程度で簡潔に。自然な会話でお願いします。感情状態を反映した話し方をしてください。`;
    }
    
    // ========================================
    // ハイライト管理
    // ========================================
    
    updateSpeakerHighlight(speakerId, state) {
        if (this.onSpeakerHighlight) {
            this.onSpeakerHighlight(speakerId, state);
        }
        
        window.dispatchEvent(new CustomEvent('multichar:speakerHighlight', {
            detail: { speakerId, state }
        }));
    }
    
    updateAllHighlights() {
        this.turnOrder.forEach(id => {
            const entry = this.pipeline.find(e => e.speakerId === id);
            
            if (this.currentPlayingSpeakerId === id) {
                this.updateSpeakerHighlight(id, 'speaking');
            } else if (entry && entry.isPreparing) {
                this.updateSpeakerHighlight(id, 'preparing');
            } else if (entry && entry.status === 'ready') {
                this.updateSpeakerHighlight(id, 'preparing');
            } else {
                this.updateSpeakerHighlight(id, 'none');
            }
        });
    }
    
    notifyPipelineUpdate() {
        if (this.onPipelineUpdate) {
            this.onPipelineUpdate(this.getPipelineStatus());
        }
        
        this.updateAllHighlights();
    }
    
    getPipelineStatus() {
        return this.pipeline.map(e => ({
            speakerId: e.speakerId,
            speakerName: e.speakerName,
            status: e.status,
            hasText: !!e.responseText,
            hasAudio: !!e.audioData,
            emotion: e.emotion,
            text: e.responseText ? e.responseText.substring(0, 50) + '...' : null
        }));
    }
    
    clearAllHistory() {
        this.conversationHistory = [];
        this.pipeline = [];
        this.characters.forEach(char => {
            if (char.clearHistory) char.clearHistory();
        });
    }
    
    wait(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    
    getConversationHistory() {
        return this.conversationHistory.map(h => ({
            speaker: h.speakerName,
            text: h.text,
            emotion: h.emotion,
            timestamp: h.timestamp
        }));
    }
    
    toJSON() {
        return {
            turnOrder: this.turnOrder,
            turnMode: this.turnMode,
            characters: this.turnOrder.map(id => {
                const char = this.characters.get(id);
                return char && char.toJSON ? char.toJSON() : { id };
            })
        };
    }
}

// グローバルに登録
window.PipelinedDialogueDirector = PipelinedDialogueDirector;
window.PipelineEntry = PipelineEntry;

console.log('🚀 PipelinedDialogueDirector v4.8 グローバル登録完了（先読みシステム完全修正）');

})();
