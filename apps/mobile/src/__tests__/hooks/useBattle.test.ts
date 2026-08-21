describe('Battle Multiplayer Room State Reducer', () => {
  interface PlayerState {
    score: number;
    answers: Record<string, string[]>;
    finished: boolean;
  }

  interface BattleRoom {
    roomCode: string;
    hostUid: string;
    status: 'lobby' | 'countdown' | 'in_progress' | 'finished';
    players: Record<string, PlayerState>;
  }

  function advanceBattleState(room: BattleRoom, action: { type: string; payload?: any }): BattleRoom {
    switch (action.type) {
      case 'START_COUNTDOWN':
        return { ...room, status: 'countdown' };
      case 'START_GAME':
        return { ...room, status: 'in_progress' };
      case 'SUBMIT_ANSWER': {
        const { uid, questionId, selectedAnswers } = action.payload;
        const player = room.players[uid] || { score: 0, answers: {}, finished: false };
        const updatedPlayers = {
          ...room.players,
          [uid]: {
            ...player,
            answers: { ...player.answers, [questionId]: selectedAnswers },
          },
        };
        return { ...room, players: updatedPlayers };
      }
      case 'FINISH_GAME':
        return { ...room, status: 'finished' };
      default:
        return room;
    }
  }

  it('transitions battle room through lifecycle from lobby to finished', () => {
    let room: BattleRoom = {
      roomCode: 'SCO123',
      hostUid: 'host1',
      status: 'lobby',
      players: { host1: { score: 0, answers: {}, finished: false } },
    };

    room = advanceBattleState(room, { type: 'START_COUNTDOWN' });
    expect(room.status).toBe('countdown');

    room = advanceBattleState(room, { type: 'START_GAME' });
    expect(room.status).toBe('in_progress');

    room = advanceBattleState(room, {
      type: 'SUBMIT_ANSWER',
      payload: { uid: 'host1', questionId: 'q1', selectedAnswers: ['a1'] },
    });
    expect(room.players.host1.answers.q1).toEqual(['a1']);

    room = advanceBattleState(room, { type: 'FINISH_GAME' });
    expect(room.status).toBe('finished');
  });
});
