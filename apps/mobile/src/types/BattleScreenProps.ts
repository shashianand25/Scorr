import type React from "react";
import type { QuizQuestion, BattleRoomState } from "./QuizSessionProps";

export interface BattleHistoryItem {
  id: string;
  room_code?: string;
  quiz_title?: string;
  my_score?: number;
  opponent_score?: number;
  opponent_name?: string;
  won: boolean;
  date?: number;
  created_at?: string;
}

export interface BattleQuizOption {
  id?: string;
  title: string;
  category?: string;
  questions?: number;
  questionsList?: QuizQuestion[];
  [key: string]: unknown;
}

/** Lobby room navigation and joining contract */
export interface BattleLobbyStateProps {
  battleRoomCode?: string;
  setBattleRoomCode?: (code: string) => void;
  battleRoomState?: BattleRoomState | null;
  setBattleRoomState?: (state: any) => void;
  joinCodeInput?: string;
  setJoinCodeInput?: (code: string) => void;
  battleError?: string | null;
  setBattleError?: (error: string | null) => void;
  battleConnError?: string | null;
  battleCreating?: boolean;
  battleCountdown?: number | null;
  battleUnsubscribeRef?: React.MutableRefObject<any>;
  handleJoinBattle?: () => void;
  handleStartBattle?: () => void;
  handleCreateBattle?: (quiz: BattleQuizOption, source?: string) => void;
}

/** Host battle customization (time per question, question ranges, shuffling) */
export interface BattleHostOptionsProps {
  isHost?: boolean;
  setIsHost?: (isHost: boolean) => void;
  showBattleQuizSelector?: boolean;
  setShowBattleQuizSelector?: (show: boolean) => void;
  showBattleOptions?: boolean;
  setShowBattleOptions?: (show: boolean) => void;
  battleOptionsQuiz?: BattleQuizOption | null;
  battleOptionsSource?: string;
  battleShuffleQ?: boolean;
  setBattleShuffleQ?: (shuffle: boolean) => void;
  battleShuffleA?: boolean;
  setBattleShuffleA?: (shuffle: boolean) => void;
  battleRandomCount?: number;
  setBattleRandomCount?: (count: number) => void;
  battleSelectionMode?: string;
  setBattleSelectionMode?: (mode: string) => void;
  battleRangeStart?: number;
  setBattleRangeStart?: (start: number) => void;
  battleRangeEnd?: number;
  setBattleRangeEnd?: (end: number) => void;
  battleTimePerQuestion?: number | null;
  setBattleTimePerQuestion?: (seconds: number | null) => void;
}

/** Battle historical results and statistics */
export interface BattleHistoryStateProps {
  showBattleHistory?: boolean;
  setShowBattleHistory?: (show: boolean) => void;
  battleHistory?: BattleHistoryItem[];
}

/** Complete typed contract for BattleScreen */
export interface BattleScreenProps
  extends BattleLobbyStateProps,
    BattleHostOptionsProps,
    BattleHistoryStateProps {
  settingsDarkMode: boolean;
  firebaseUser?: { displayName?: string | null; email?: string | null; uid?: string } | null;
  setShowAuthScreen: (show: boolean) => void;
  isConnected?: boolean;
  setActiveTab?: (tab: string) => void;
  quizzes?: BattleQuizOption[];
  showBottomPillToast?: (msg: string) => void;
  [key: string]: unknown;
}
