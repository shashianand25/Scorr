import { db } from './firebase';
import { doc, setDoc, getDoc, updateDoc, onSnapshot, serverTimestamp } from 'firebase/firestore';

export interface BattleRoom {
  id: string; // 5-digit code
  quizId: string;
  quizTitle: string;
  questionCount: number;
  status: "waiting" | "playing" | "finished";
  hostId: string;
  hostName: string;
  hostScore: number;
  hostFinished: boolean;
  hostTime: number | null;  // total ms taken by host (null = not done yet)
  guestId: string | null;
  guestName: string | null;
  guestScore: number;
  guestFinished: boolean;
  guestTime: number | null; // total ms taken by guest
  questions: any[];
  timePerQuestion: number | null; // seconds per question (null = no limit)
  createdAt: any;
}

const generateRoomCode = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let result = '';
  for (let i = 0; i < 5; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

export const createBattleRoom = async (
  quizId: string,
  quizTitle: string,
  questionCount: number,
  questions: any[],
  hostId: string,
  hostName: string,
  timePerQuestion: number | null = null,
) => {
  const roomCode = generateRoomCode();
  const roomRef = doc(db, "battles", roomCode);
  
  const roomData: BattleRoom = {
    id: roomCode,
    quizId,
    quizTitle,
    questionCount,
    status: "waiting",
    hostId,
    hostName,
    hostScore: 0,
    hostFinished: false,
    hostTime: null,
    guestId: null,
    guestName: null,
    guestScore: 0,
    guestFinished: false,
    guestTime: null,
    questions,
    timePerQuestion,
    createdAt: serverTimestamp(),
  };

  await setDoc(roomRef, roomData);
  return roomCode;
};

export const joinBattleRoom = async (roomCode: string, guestId: string, guestName: string) => {
  const code = roomCode.toUpperCase().trim();
  const roomRef = doc(db, "battles", code);
  const roomSnap = await getDoc(roomRef);
  
  if (!roomSnap.exists()) {
    return { success: false, error: "Room not found" };
  }
  
  const data = roomSnap.data() as BattleRoom;
  if (data.status !== "waiting") {
    return { success: false, error: "Match already started or full" };
  }
  
  if (data.hostId === guestId) {
    return { success: false, error: "You cannot join your own room. Have your friend join it!" };
  }

  await updateDoc(roomRef, {
    guestId,
    guestName,
    status: "playing"
  });

  return { success: true, quizId: data.quizId };
};

export const updateBattleScore = async (roomCode: string, isHost: boolean, score: number) => {
  const roomRef = doc(db, "battles", roomCode);
  await updateDoc(roomRef, {
    [isHost ? 'hostScore' : 'guestScore']: score
  });
};

/** Mark this player as done — saves score and total time (ms) */
export const markPlayerFinished = async (
  roomCode: string,
  isHost: boolean,
  totalTimeMs?: number,
) => {
  const roomRef = doc(db, "battles", roomCode);
  await updateDoc(roomRef, {
    [isHost ? 'hostFinished' : 'guestFinished']: true,
    ...(totalTimeMs !== undefined
      ? { [isHost ? 'hostTime' : 'guestTime']: totalTimeMs }
      : {}),
  });
};

/** Called when BOTH are finished — sets status: "finished" */
export const finishBattle = async (roomCode: string) => {
  const roomRef = doc(db, "battles", roomCode);
  await updateDoc(roomRef, {
    status: "finished"
  });
};

export const listenToBattleRoom = (roomCode: string, callback: (data: BattleRoom) => void) => {
  const roomRef = doc(db, "battles", roomCode);
  return onSnapshot(roomRef, (doc) => {
    if (doc.exists()) {
      callback(doc.data() as BattleRoom);
    }
  });
};

export const getBattleRoom = async (roomCode: string) => {
  const roomRef = doc(db, "battles", roomCode);
  const snap = await getDoc(roomRef);
  if (snap.exists()) {
    return snap.data() as BattleRoom;
  }
  return null;
};
