// ========================================
// Multi-Character System Entry Point
// メインアプリケーションへの統合スクリプト
// ========================================

import { CharacterUnit } from './character-unit.js?v=4.3';
import { DialogueDirector } from './dialogue-director.js';
import { MultiCharacterManager } from './multi-character-manager.js';
import { MultiCharacterUI } from './multi-character-ui.js?v=4.3';
import { CharacterBehavior, CharacterBehaviorManager } from './character-behavior.js';

// グローバル公開
window.CharacterUnit = CharacterUnit;
window.DialogueDirector = DialogueDirector;
window.MultiCharacterManager = MultiCharacterManager;
window.MultiCharacterUI = MultiCharacterUI;
window.CharacterBehavior = CharacterBehavior;
window.CharacterBehaviorManager = CharacterBehaviorManager;

/**
 * マルチキャラクターシステムを初期化
 * @param {VRMAIViewer} app - メインアプリケーション
 * @returns {MultiCharacterManager}
 */
export function initMultiCharacterSystem(app) {
    console.log('🎭 マルチキャラクターシステム初期化開始...');
    
    // マネージャー作成
    const manager = new MultiCharacterManager(app);
    
    // AI Director Cameraとの連携
    if (window.aiDirectorCamera) {
        manager.setAIDirectorCamera(window.aiDirectorCamera);
    }
    
    // グローバル参照
    window.multiCharManager = manager;
    
    // UI作成
    const ui = new MultiCharacterUI(manager);
    window.multiCharUI = ui;
    
    console.log('✅ マルチキャラクターシステム初期化完了');
    
    return manager;
}

/**
 * 既存のVRMをキャラクターとして登録
 * @param {string} characterId - キャラクターID
 * @param {VRM} vrm - VRMオブジェクト
 */
export function registerExistingVRM(characterId, vrm) {
    if (!window.multiCharManager) {
        console.error('❌ マルチキャラクターシステムが初期化されていません');
        return false;
    }
    
    return window.multiCharManager.assignExistingVRM(characterId, vrm);
}

/**
 * クイックスタート - 2人会話を即座に開始
 */
export async function quickStart2PersonChat(apiKey, topic = '最近の出来事について話しましょう') {
    if (!window.multiCharManager) {
        console.error('❌ マルチキャラクターシステムが初期化されていません');
        return;
    }
    
    const manager = window.multiCharManager;
    
    // キャラクターA（ボケ）
    await manager.createCharacter({
        id: 'char_A',
        name: 'アキラ',
        personality: 'ボケ担当。天然で突拍子もない発想をする。明るくポジティブ。',
        llmType: 'chatgpt',
        apiKey: apiKey,
        voiceModel: 'jvnv-F1-jp'
    });
    
    // キャラクターB（ツッコミ）
    await manager.createCharacter({
        id: 'char_B',
        name: 'ボン',
        personality: 'ツッコミ担当。論理的で鋭い指摘をするが根は優しい。',
        llmType: 'chatgpt',
        apiKey: apiKey,
        voiceModel: 'jvnv-M1-jp'
    });
    
    // メインVRMがあれば割り当て
    if (window.app && window.app.vrm) {
        manager.assignExistingVRM('char_A', window.app.vrm);
    }
    
    // Mocap VRMがあれば割り当て
    if (window.vmcMocap && window.vmcMocap.avatarVRM) {
        manager.assignExistingVRM('char_B', window.vmcMocap.avatarVRM);
    }
    
    // 会話開始
    await manager.startConversation(topic);
}

/**
 * クイックスタート - 3人会話を即座に開始
 */
export async function quickStart3PersonChat(apiKey, topic = '今日のランチについて話しましょう') {
    if (!window.multiCharManager) {
        console.error('❌ マルチキャラクターシステムが初期化されていません');
        return;
    }
    
    const manager = window.multiCharManager;
    
    // キャラクターA
    await manager.createCharacter({
        id: 'char_A',
        name: 'アキラ',
        personality: 'ボケ担当。天然で突拍子もない発想をする。',
        llmType: 'chatgpt',
        apiKey: apiKey,
        voiceModel: 'jvnv-F1-jp'
    });
    
    // キャラクターB
    await manager.createCharacter({
        id: 'char_B',
        name: 'ボン',
        personality: 'ツッコミ担当。論理的で鋭い指摘をする。',
        llmType: 'chatgpt',
        apiKey: apiKey,
        voiceModel: 'jvnv-M1-jp'
    });
    
    // キャラクターC
    await manager.createCharacter({
        id: 'char_C',
        name: 'チカ',
        personality: '仲裁・まとめ役。優しく場を和ませる。時々独自の視点を加える。',
        llmType: 'chatgpt',
        apiKey: apiKey,
        voiceModel: 'jvnv-F2-jp'
    });
    
    // 会話開始
    await manager.startConversation(topic);
}

// 自動初期化（DOMContentLoaded後）
document.addEventListener('DOMContentLoaded', () => {
    // アプリケーションがロードされた後に初期化
    const checkAndInit = () => {
        if (window.app) {
            initMultiCharacterSystem(window.app);
        } else {
            // 少し待って再試行
            setTimeout(checkAndInit, 1000);
        }
    };
    
    // 3秒後にチェック開始（アプリケーション初期化を待つ）
    setTimeout(checkAndInit, 3000);
});

console.log('📦 Multi-Character System モジュールロード完了');
