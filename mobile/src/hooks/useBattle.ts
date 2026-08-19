import { useState, useRef, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getBattleRoom, listenToBattleRoom } from '../lib/multiplayer';
import type { BattleRoom } from '../lib/multiplayer';

/**
 * useBattle — owns all multiplayer battle state, refs, and the pending-battles
 * startup sync. Extracted from HomeScreen god-file (lines ~1088-1131, 961-1079).
 */
export function useBattle(deps: {
  setBattlePopup: React.Dispatch<React.SetStateAction<any>>;
  triggerConfettiBurst: () => void;
}) {
  const { setBattlePopup, triggerConfettiBurst } = deps;

  const [battleRoomCode, setBattleRoomCode] = useState('');
  const [battleRoomState, setBattleRoomState] = useState<BattleRoom | null>(null);
  const [isHost, setIsHost] = useState(false);
  const [joinCodeInput, setJoinCodeInput] = useState('');
  const [battleError, setBattleError] = useState('');
  const [showBattleQuizSelector, setShowBattleQuizSelector] = useState(false);
  const [showBattleOptions, setShowBattleOptions] = useState(false);
  const [battleOptionsQuiz, setBattleOptionsQuiz] = useState<any>(null);
  const [battleOptionsSource, setBattleOptionsSource] = useState<'lobby' | 'insights'>('lobby');
  const [battleShuffleQ, setBattleShuffleQ] = useState(false);
  const [battleShuffleA, setBattleShuffleA] = useState(false);
  const [battleRandomCount, setBattleRandomCount] = useState(10);
  const [battleSelectionMode, setBattleSelectionMode] = useState<'all' | 'random' | 'range'>('all');
  const [battleRangeStart, setBattleRangeStart] = useState<number>(1);
  const [battleRangeEnd, setBattleRangeEnd] = useState<number>(5);
  const [showBattleHistory, setShowBattleHistory] = useState(false);
  const [battleHistory, setBattleHistory] = useState<Array<{
    date: number; quizTitle: string; myScore: number; opponentScore: number;
    opponentName: string; won: boolean; myTime?: number; opponentTime?: number;
    roomCode?: string; questions?: any[]; answers?: Record<string, string[]>;
  }>>([]);
  const [battleConnError, setBattleConnError] = useState('');
  const [battleCreating, setBattleCreating] = useState(false);
  const [battleTimePerQuestion, setBattleTimePerQuestion] = useState<number | null>(null);
  const [battleCountdown, setBattleCountdown] = useState<number | null>(null);
  const [battlePopup, setBattlePopupLocal] = useState<{
    myScore: number; opponentScore: number; opponentName: string;
    won: boolean; myTime?: number; opponentTime?: number;
  } | null>(null);

  const battleUnsubscribeRef = useRef<(() => void) | null>(null);
  const battleStartedRef = useRef(false);
  const battleFinishedCalledRef = useRef(false);
  const battleConfettiFiredRef = useRef(false);

  // Cleanup listener on unmount
  useEffect(() => {
    return () => {
      if (battleUnsubscribeRef.current) {
        battleUnsubscribeRef.current();
      }
    };
  }, []);

  // ── Load battle history + pending battles on startup ──
  useEffect(() => {
    AsyncStorage.multiGet(['battle_history', 'pending_battles']).then(async ([[_k1, histVal], [_k2, pendVal]]) => {
      let loadedHistory: any[] = [];
      if (histVal) {
        try { loadedHistory = JSON.parse(histVal); setBattleHistory(loadedHistory); } catch {}
      }
      if (pendVal) {
        try {
          let pending = JSON.parse(pendVal) as { code: string; isHost: boolean; questions?: any[]; answers?: Record<string, string[]> }[];
          let updatedPending = [...pending];
          let historyUpdated = false;

          for (const pb of pending) {
            const room = await getBattleRoom(pb.code);
            if (!room) { updatedPending = updatedPending.filter(p => p.code !== pb.code); continue; }

            if (room.hostFinished && room.guestFinished) {
              const myScore = pb.isHost ? room.hostScore : room.guestScore;
              const oppScore = pb.isHost ? room.guestScore : room.hostScore;
              const oppName = pb.isHost ? (room.guestName || 'Opponent') : room.hostName;
              const myTime = pb.isHost ? (room.hostTime ?? Infinity) : (room.guestTime ?? Infinity);
              const oppTime = pb.isHost ? (room.guestTime ?? Infinity) : (room.hostTime ?? Infinity);
              let effectiveWin = myScore > oppScore || (myScore === oppScore && myTime < oppTime);
              const entry = {
                date: Date.now(), roomCode: pb.code, quizTitle: room.quizTitle || '',
                myScore, opponentScore: oppScore, opponentName: oppName, won: effectiveWin,
                myTime: myTime !== Infinity ? myTime : undefined,
                opponentTime: oppTime !== Infinity ? oppTime : undefined,
                questions: pb.questions || [], answers: pb.answers || {},
              };
              const filtered = loadedHistory.filter((p: any) => p.roomCode !== pb.code);
              loadedHistory = [...filtered, entry].slice(-50);
              historyUpdated = true;
              updatedPending = updatedPending.filter(p => p.code !== pb.code);
              setBattlePopup({ myScore, opponentScore: oppScore, opponentName: oppName, won: effectiveWin, myTime, opponentTime: oppTime });
            } else {
              const unsubscribe = listenToBattleRoom(pb.code, (data: any) => {
                if (data.hostFinished && data.guestFinished) {
                  const myScore = pb.isHost ? data.hostScore : data.guestScore;
                  const oppScore = pb.isHost ? data.guestScore : data.hostScore;
                  const oppName = pb.isHost ? (data.guestName || 'Opponent') : data.hostName;
                  const myTime = pb.isHost ? (data.hostTime ?? Infinity) : (data.guestTime ?? Infinity);
                  const oppTime = pb.isHost ? (data.guestTime ?? Infinity) : (data.hostTime ?? Infinity);
                  const effectiveWin = myScore > oppScore || (myScore === oppScore && myTime < oppTime);
                  const entry = {
                    date: Date.now(), roomCode: pb.code, quizTitle: data.quizTitle || '',
                    myScore, opponentScore: oppScore, opponentName: oppName, won: effectiveWin,
                    myTime: myTime !== Infinity ? myTime : undefined,
                    opponentTime: oppTime !== Infinity ? oppTime : undefined,
                    questions: pb.questions || [], answers: pb.answers || {},
                  };
                  setBattleHistory(prev => {
                    const filtered = prev.filter((p: any) => p.roomCode !== pb.code);
                    const next = [...filtered, entry].slice(-50);
                    AsyncStorage.setItem('battle_history', JSON.stringify(next));
                    return next;
                  });
                  setBattlePopup({ myScore, opponentScore: oppScore, opponentName: oppName, won: effectiveWin, myTime, opponentTime: oppTime });
                  if (effectiveWin) triggerConfettiBurst();
                  AsyncStorage.getItem('pending_battles').then(val => {
                    if (val) {
                      try {
                        const cur = JSON.parse(val);
                        AsyncStorage.setItem('pending_battles', JSON.stringify(cur.filter((p: any) => p.code !== pb.code)));
                      } catch {}
                    }
                  });
                  unsubscribe();
                }
              });
            }
          }

          if (historyUpdated) {
            setBattleHistory(loadedHistory);
            AsyncStorage.setItem('battle_history', JSON.stringify(loadedHistory));
          }
          if (updatedPending.length !== pending.length) {
            AsyncStorage.setItem('pending_battles', JSON.stringify(updatedPending));
          }
        } catch {}
      }
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    // State
    battleRoomCode, setBattleRoomCode,
    battleRoomState, setBattleRoomState,
    isHost, setIsHost,
    joinCodeInput, setJoinCodeInput,
    battleError, setBattleError,
    showBattleQuizSelector, setShowBattleQuizSelector,
    showBattleOptions, setShowBattleOptions,
    battleOptionsQuiz, setBattleOptionsQuiz,
    battleOptionsSource, setBattleOptionsSource,
    battleShuffleQ, setBattleShuffleQ,
    battleShuffleA, setBattleShuffleA,
    battleRandomCount, setBattleRandomCount,
    battleSelectionMode, setBattleSelectionMode,
    battleRangeStart, setBattleRangeStart,
    battleRangeEnd, setBattleRangeEnd,
    showBattleHistory, setShowBattleHistory,
    battleHistory, setBattleHistory,
    battleConnError, setBattleConnError,
    battleCreating, setBattleCreating,
    battleTimePerQuestion, setBattleTimePerQuestion,
    battleCountdown, setBattleCountdown,
    battlePopup: battlePopupLocal, setBattlePopup: setBattlePopupLocal,
    // Refs
    battleUnsubscribeRef,
    battleStartedRef,
    battleFinishedCalledRef,
    battleConfettiFiredRef,
  };
}
