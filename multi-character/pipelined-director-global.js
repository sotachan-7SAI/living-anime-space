// ========================================
// PipelinedDialogueDirector グローバル登録
// standalone.js から使用するためのラッパー
// ========================================

import { PipelinedDialogueDirector } from './pipelined-dialogue-director.js';

// グローバルに登録
window.PipelinedDialogueDirector = PipelinedDialogueDirector;

console.log('🚀 PipelinedDialogueDirector グローバル登録完了');
