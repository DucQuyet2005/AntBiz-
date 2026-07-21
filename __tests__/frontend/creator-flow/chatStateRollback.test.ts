import { describe, expect, it } from 'vitest';
import { creatorFlowReducer, initialCreatorFlowState } from '@/frontend/modules/creator-flow/use-creator-flow';
import { ChatMessage } from '@/lib/services/creator/post.service';

describe('Creator Flow Chat Rollback logic', () => {
  it('restores state to a specific chat message index and removes target and subsequent messages', () => {
    const msg1: ChatMessage = {
      id: 'msg-1',
      sender: 'user',
      text: 'First prompt',
      timestamp: '10:00',
      postContentSnapshot: 'Version 1 content',
    };
    const msg2: ChatMessage = {
      id: 'msg-2',
      sender: 'ai',
      text: 'AI generated V1',
      timestamp: '10:01',
      postContentSnapshot: 'Version 1 content',
    };
    const msg3: ChatMessage = {
      id: 'msg-3',
      sender: 'user',
      text: 'Second prompt',
      timestamp: '10:05',
      postContentSnapshot: 'Version 2 content',
    };
    const msg4: ChatMessage = {
      id: 'msg-4',
      sender: 'ai',
      text: 'AI generated V2',
      timestamp: '10:06',
      postContentSnapshot: 'Version 2 content',
    };

    const stateWithHistory = {
      ...initialCreatorFlowState,
      postContent: 'Version 2 content',
      chatMessages: [msg1, msg2, msg3, msg4],
    };

    // Restore back to msg3 (index 2) - deletes msg3 & msg4, reverting to msg2 content
    const restoredState = creatorFlowReducer(stateWithHistory, {
      type: 'RESTORE_CHAT_STATE',
      payload: {
        messageIndex: 2,
        postContent: msg2.postContentSnapshot!,
      },
    });

    // Post content should be reverted to Version 1
    expect(restoredState.postContent).toBe('Version 1 content');

    // Chat messages should be truncated to only include [msg1, msg2]
    expect(restoredState.chatMessages).toHaveLength(2);
    expect(restoredState.chatMessages.map(m => m.id)).toEqual(['msg-1', 'msg-2']);
  });
});
