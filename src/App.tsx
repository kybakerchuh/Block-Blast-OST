import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { signInWithPopup, signOut, onAuthStateChanged, User } from 'firebase/auth';
import {
  Award,
  BookOpen,
  Boxes,
  Crown,
  Flame,
  LogIn,
  LogOut,
  RotateCcw,
  Settings,
  Trophy,
} from 'lucide-react';
import { soundEngine } from './audio/soundEngine';
import { BlockBoard, GemIcon } from './components/BlockBoard';
import { LeaderboardView } from './components/LeaderboardView';
import { OstQuizModal, QuizTriggerReason } from './components/OstQuizModal';
import { SettingsModal } from './components/SettingsModal';
import { TopicsView } from './components/TopicsView';
import {
  ALL_OST_QUESTIONS,
  normalizeTopicId,
  OST_TOPICS,
  pickNextOstQuestion,
} from './data/ostQuestions';
import { OstQuestion, OstTopicId } from './data/ostQuestions/types';
import { auth, googleProvider } from './firebase/config';
import {
  extractFirstName,
  loadAllTopicProgress,
  loadOrCreateUserProfile,
  saveTopicMastery,
  saveUserProgress,
  TopicMastery,
  UserProgress,
} from './firebase/progressService';
import {
  createEmptyBoard,
  generateTray,
  hasAnyValidMove,
  placeShapeOnBoard,
  reviveClearBoard,
} from './game/engine';
import { getAdventureLevel } from './game/levels';
import {
  BoardGrid,
  FloatingPopup,
  GameMode,
  GemType,
  TraySlot,
} from './game/types';

type ActiveTab = 'play' | 'topics' | 'leaderboard';

const LOCAL_STORAGE_KEY = 'block_blast_ost_local_v1';
const BLOCKS_PER_CHECKPOINT = 6;

interface LocalSavedState {
  classicHighScore: number;
  adventureBestScore: number;
  adventureLevel: number;
  totalOstCorrect: number;
  totalOstAttempted: number;
  selectedTopic: OstTopicId | 'all';
  soundEnabled: boolean;
  topicMastery: Record<string, TopicMastery>;
}

function loadLocalState(): LocalSavedState {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        classicHighScore: Number(parsed.classicHighScore || 0),
        adventureBestScore: Number(parsed.adventureBestScore || 0),
        adventureLevel: Math.max(1, Number(parsed.adventureLevel || 1)),
        totalOstCorrect: Number(parsed.totalOstCorrect || 0),
        totalOstAttempted: Number(parsed.totalOstAttempted || 0),
        selectedTopic: normalizeTopicId(parsed.selectedTopic),
        soundEnabled: parsed.soundEnabled !== false,
        topicMastery: parsed.topicMastery || {},
      };
    }
  } catch {
    // ignore storage errors
  }
  return {
    classicHighScore: 0,
    adventureBestScore: 0,
    adventureLevel: 1,
    totalOstCorrect: 0,
    totalOstAttempted: 0,
    selectedTopic: 'all',
    soundEnabled: true,
    topicMastery: {},
  };
}

export default function App() {
  const initialLocal = useMemo(() => loadLocalState(), []);

  // Navigation & Auth
  const [activeTab, setActiveTab] = useState<ActiveTab>('play');
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [authBusy, setAuthBusy] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // Persistent Player Progress
  const [classicHighScore, setClassicHighScore] = useState(
    initialLocal.classicHighScore
  );
  const [adventureBestScore, setAdventureBestScore] = useState(
    initialLocal.adventureBestScore
  );
  const [adventureLevel, setAdventureLevel] = useState(initialLocal.adventureLevel);
  const [totalOstCorrect, setTotalOstCorrect] = useState(initialLocal.totalOstCorrect);
  const [totalOstAttempted, setTotalOstAttempted] = useState(
    initialLocal.totalOstAttempted
  );
  const [selectedTopic, setSelectedTopic] = useState<OstTopicId | 'all'>(
    initialLocal.selectedTopic
  );
  const [soundEnabled, setSoundEnabled] = useState(initialLocal.soundEnabled);
  const [topicMastery, setTopicMastery] = useState<Record<string, TopicMastery>>(
    initialLocal.topicMastery
  );

  // Active Game Run State
  const [mode, setMode] = useState<GameMode>('classic');
  const [board, setBoard] = useState<BoardGrid>(() => createEmptyBoard());
  const [tray, setTray] = useState<TraySlot[]>(() => generateTray(createEmptyBoard()));
  const [score, setScore] = useState(0);
  const [comboStreak, setComboStreak] = useState(0);
  const [reviveUsedInRun, setReviveUsedInRun] = useState(false);
  const [runOstCorrect, setRunOstCorrect] = useState(0);
  const [runOstAttempted, setRunOstAttempted] = useState(0);
  const [collectedGems, setCollectedGems] = useState<Partial<Record<GemType, number>>>(
    {}
  );

  // Visual FX State
  const [clearingRows, setClearingRows] = useState<number[]>([]);
  const [clearingCols, setClearingCols] = useState<number[]>([]);
  const [shaking, setShaking] = useState(false);
  const [popups, setPopups] = useState<FloatingPopup[]>([]);

  // Overlays & Modals
  const [blocksUntilQuiz, setBlocksUntilQuiz] = useState(BLOCKS_PER_CHECKPOINT);
  const [activeQuiz, setActiveQuiz] = useState<{
    question: OstQuestion;
    reason: QuizTriggerReason;
  } | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [gameOverOpen, setGameOverOpen] = useState(false);
  const [stageVictoryOpen, setStageVictoryOpen] = useState(false);

  const recentlyAskedRef = useRef<Set<string>>(new Set());

  // Keep sound engine synchronized
  useEffect(() => {
    soundEngine.enabled = soundEnabled;
  }, [soundEnabled]);

  // Save local fallback whenever player metrics change
  useEffect(() => {
    try {
      const payload: LocalSavedState = {
        classicHighScore,
        adventureBestScore,
        adventureLevel,
        totalOstCorrect,
        totalOstAttempted,
        selectedTopic,
        soundEnabled,
        topicMastery,
      };
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(payload));
    } catch {
      // ignore storage quota errors
    }
  }, [
    classicHighScore,
    adventureBestScore,
    adventureLevel,
    totalOstCorrect,
    totalOstAttempted,
    selectedTopic,
    soundEnabled,
    topicMastery,
  ]);

  const buildProgressObject = useCallback(
    (user: User, overrides?: Partial<UserProgress>): UserProgress => ({
      uid: user.uid,
      email: user.email || 'unknown@user.local',
      displayName: extractFirstName(user.displayName, user.email),
      classicHighScore,
      adventureBestScore,
      adventureLevel,
      totalOstCorrect,
      totalOstAttempted,
      selectedTopic,
      soundEnabled,
      ...overrides,
    }),
    [
      classicHighScore,
      adventureBestScore,
      adventureLevel,
      totalOstCorrect,
      totalOstAttempted,
      selectedTopic,
      soundEnabled,
    ]
  );

  const persistCloudProgress = useCallback(
    async (overrides?: Partial<UserProgress>) => {
      if (!firebaseUser) return;
      try {
        await saveUserProgress(buildProgressObject(firebaseUser, overrides));
      } catch (err) {
        console.error('Failed to save progress to Firestore:', err);
      }
    },
    [firebaseUser, buildProgressObject]
  );

  // Firebase Auth listener
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user);
      if (user) {
        try {
          const local = loadLocalState();
          const profile = await loadOrCreateUserProfile(user, {
            classicHighScore: local.classicHighScore,
            adventureBestScore: local.adventureBestScore,
            adventureLevel: local.adventureLevel,
            totalOstCorrect: local.totalOstCorrect,
            totalOstAttempted: local.totalOstAttempted,
            selectedTopic: local.selectedTopic,
            soundEnabled: local.soundEnabled,
          });
          setClassicHighScore(profile.classicHighScore);
          setAdventureBestScore(profile.adventureBestScore);
          setAdventureLevel(profile.adventureLevel);
          setTotalOstCorrect(profile.totalOstCorrect);
          setTotalOstAttempted(profile.totalOstAttempted);
          setSelectedTopic(normalizeTopicId(profile.selectedTopic));
          setSoundEnabled(profile.soundEnabled);

          const cloudTopics = await loadAllTopicProgress(user.uid);
          setTopicMastery((prev) => {
            const merged: Record<string, TopicMastery> = { ...prev };
            for (const [tid, cloudVal] of Object.entries(cloudTopics)) {
              const localVal = merged[tid];
              merged[tid] = {
                topicId: tid,
                correctCount: Math.max(
                  cloudVal.correctCount,
                  localVal?.correctCount ?? 0
                ),
                attemptedCount: Math.max(
                  cloudVal.attemptedCount,
                  localVal?.attemptedCount ?? 0
                ),
              };
            }
            return merged;
          });
        } catch (err) {
          console.error('Failed loading user profile:', err);
        }
      }
      setAuthReady(true);
    });
    return () => unsub();
  }, []);

  const handleSignIn = async () => {
    setAuthBusy(true);
    setAuthError(null);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Sign-in cancelled';
      if (msg.includes('unauthorized-domain')) {
        setAuthError(
          `Add "${window.location.hostname}" to Firebase Console → Authentication → Settings → Authorized domains to enable Google Sign-In here.`
        );
      } else if (!msg.includes('popup-closed-by-user')) {
        setAuthError('Google sign-in popup was blocked or failed. Please try again.');
      }
    } finally {
      setAuthBusy(false);
    }
  };

  const handleSignOut = async () => {
    setAuthBusy(true);
    try {
      await signOut(auth);
    } finally {
      setAuthBusy(false);
    }
  };

  const currentStage = useMemo(
    () => getAdventureLevel(adventureLevel),
    [adventureLevel]
  );

  const startNewRun = useCallback(
    (targetMode: GameMode, levelOverride?: number) => {
      const lvl = levelOverride ?? adventureLevel;
      const startBoard =
        targetMode === 'adventure'
          ? getAdventureLevel(lvl).initialBoard
          : createEmptyBoard();
      setMode(targetMode);
      setBoard(startBoard);
      setTray(generateTray(startBoard));
      setScore(0);
      setComboStreak(0);
      setReviveUsedInRun(false);
      setRunOstCorrect(0);
      setRunOstAttempted(0);
      setCollectedGems({});
      setClearingRows([]);
      setClearingCols([]);
      setPopups([]);
      setGameOverOpen(false);
      setStageVictoryOpen(false);
      setActiveQuiz(null);
      setBlocksUntilQuiz(BLOCKS_PER_CHECKPOINT);
    },
    [adventureLevel]
  );

  const spawnPopup = useCallback(
    (
      text: string,
      tone: FloatingPopup['tone'] = 'gold',
      subtext?: string,
      x = 50,
      y = 45
    ) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      setPopups((prev) => [...prev, { id, text, subtext, x, y, tone }]);
      setTimeout(() => {
        setPopups((prev) => prev.filter((p) => p.id !== id));
      }, 920);
    },
    []
  );

  const openQuiz = useCallback(
    (reason: QuizTriggerReason, topicOverride?: OstTopicId | 'all') => {
      const topicToUse = topicOverride ?? selectedTopic;
      const question = pickNextOstQuestion(topicToUse, recentlyAskedRef.current);
      recentlyAskedRef.current.add(question.id);
      if (recentlyAskedRef.current.size > 240) {
        recentlyAskedRef.current.clear();
      }
      setActiveQuiz({ question, reason });
    },
    [selectedTopic]
  );

  const checkAdventureGoalMet = useCallback(
    (newScore: number, gemsMap: Partial<Record<GemType, number>>) => {
      if (mode !== 'adventure') return false;
      if (newScore < currentStage.targetScore) return false;
      for (const [gemKey, targetQty] of Object.entries(currentStage.gemTargets)) {
        const collected = gemsMap[gemKey as GemType] || 0;
        if (collected < (targetQty || 0)) return false;
      }
      return true;
    },
    [mode, currentStage]
  );

  const handlePlaceShape = useCallback(
    (slotIndex: number, row: number, col: number) => {
      if (activeQuiz || gameOverOpen || stageVictoryOpen) return;
      const slot = tray[slotIndex];
      if (!slot?.shape) return;

      const result = placeShapeOnBoard(board, slot.shape, row, col, comboStreak);
      soundEngine.playPlace();

      const nextScore = score + result.basePoints + result.linePoints;
      const nextCombo = result.totalLinesCleared > 0 ? comboStreak + 1 : 0;

      // Update collected gems
      const nextGems: Partial<Record<GemType, number>> = { ...collectedGems };
      for (const [gKey, count] of Object.entries(result.collectedGems)) {
        nextGems[gKey as GemType] = (nextGems[gKey as GemType] || 0) + (count || 0);
      }

      // Visual & Audio feedback
      const popX = ((col + slot.shape.matrix[0].length / 2) / 8) * 100;
      const popY = ((row + slot.shape.matrix.length / 2) / 8) * 100;

      if (result.totalLinesCleared > 0) {
        setClearingRows(result.clearedRows);
        setClearingCols(result.clearedCols);
        setTimeout(() => {
          setClearingRows([]);
          setClearingCols([]);
        }, 250);

        if (result.isBoardEmpty) {
          soundEngine.playBoardClear();
          setShaking(true);
          setTimeout(() => setShaking(false), 260);
          spawnPopup(
            `+${result.basePoints + result.linePoints}`,
            'emerald',
            'BOARD CLEAR!',
            50,
            45
          );
        } else {
          soundEngine.playClear(nextCombo);
          if (result.totalLinesCleared >= 2 || nextCombo >= 2) {
            setShaking(true);
            setTimeout(() => setShaking(false), 260);
          }
          const sub =
            nextCombo >= 2
              ? `COMBO x${nextCombo}!`
              : result.totalLinesCleared >= 2
                ? `${result.totalLinesCleared} LINES!`
                : undefined;
          spawnPopup(
            `+${result.basePoints + result.linePoints}`,
            nextCombo >= 2 ? 'gold' : 'cyan',
            sub,
            Math.min(82, Math.max(18, popX)),
            Math.min(82, Math.max(18, popY))
          );
        }
      } else {
        spawnPopup(
          `+${result.basePoints}`,
          'gold',
          undefined,
          Math.min(85, Math.max(15, popX)),
          Math.min(85, Math.max(15, popY))
        );
      }

      setBoard(result.nextBoard);
      setScore(nextScore);
      setComboStreak(nextCombo);
      setCollectedGems(nextGems);

      // Update high scores
      let nextClassicBest = classicHighScore;
      let nextAdvBest = adventureBestScore;
      if (mode === 'classic' && nextScore > classicHighScore) {
        nextClassicBest = nextScore;
        setClassicHighScore(nextScore);
      } else if (mode === 'adventure' && nextScore > adventureBestScore) {
        nextAdvBest = nextScore;
        setAdventureBestScore(nextScore);
      }

      // Check Adventure victory
      if (checkAdventureGoalMet(nextScore, nextGems)) {
        soundEngine.playLevelWin();
        const nextLevel = adventureLevel + 1;
        setAdventureLevel(nextLevel);
        setStageVictoryOpen(true);
        persistCloudProgress({
          classicHighScore: nextClassicBest,
          adventureBestScore: nextAdvBest,
          adventureLevel: nextLevel,
        });
        return;
      }

      // Update tray
      const updatedTray = tray.map((s, idx) =>
        idx === slotIndex ? { ...s, shape: null } : s
      );
      const isTrayEmpty = updatedTray.every((s) => s.shape === null);
      const finalTray = isTrayEmpty ? generateTray(result.nextBoard) : updatedTray;
      setTray(finalTray);

      // Check Game Over (no valid moves remaining)
      if (!hasAnyValidMove(result.nextBoard, finalTray)) {
        soundEngine.playGameOver();
        if (nextClassicBest !== classicHighScore || nextAdvBest !== adventureBestScore) {
          persistCloudProgress({
            classicHighScore: nextClassicBest,
            adventureBestScore: nextAdvBest,
          });
        }
        setBlocksUntilQuiz(BLOCKS_PER_CHECKPOINT);
        // Trigger mandatory death OST question!
        openQuiz(reviveUsedInRun ? 'death-final' : 'death-revive');
        return;
      }

      // Trigger OST checkpoint every 6 blocks placed down
      const nextBlocksRemaining = blocksUntilQuiz - 1;
      if (nextBlocksRemaining <= 0) {
        setBlocksUntilQuiz(BLOCKS_PER_CHECKPOINT);
        openQuiz('blocks');
      } else {
        setBlocksUntilQuiz(nextBlocksRemaining);
      }
    },
    [
      activeQuiz,
      gameOverOpen,
      stageVictoryOpen,
      tray,
      board,
      comboStreak,
      score,
      collectedGems,
      classicHighScore,
      adventureBestScore,
      mode,
      adventureLevel,
      reviveUsedInRun,
      blocksUntilQuiz,
      checkAdventureGoalMet,
      spawnPopup,
      persistCloudProgress,
      openQuiz,
    ]
  );

  const handleQuizResult = useCallback(
    (isCorrect: boolean) => {
      if (!activeQuiz) return;
      const qTopic = activeQuiz.question.topicId;

      const nextCorrect = totalOstCorrect + (isCorrect ? 1 : 0);
      const nextAttempted = totalOstAttempted + 1;

      setTotalOstCorrect(nextCorrect);
      setTotalOstAttempted(nextAttempted);

      if (activeQuiz.reason !== 'practice') {
        setRunOstCorrect((prev) => prev + (isCorrect ? 1 : 0));
        setRunOstAttempted((prev) => prev + 1);
      }

      const prevTopic = topicMastery[qTopic] || {
        topicId: qTopic,
        correctCount: 0,
        attemptedCount: 0,
      };
      const nextTopicCorrect = prevTopic.correctCount + (isCorrect ? 1 : 0);
      const nextTopicAttempted = prevTopic.attemptedCount + 1;

      setTopicMastery((prev) => ({
        ...prev,
        [qTopic]: {
          topicId: qTopic,
          correctCount: nextTopicCorrect,
          attemptedCount: nextTopicAttempted,
        },
      }));

      let bonus = 0;
      if (isCorrect && activeQuiz.reason === 'blocks') {
        bonus = 150;
      } else if (isCorrect && activeQuiz.reason === 'death-revive') {
        bonus = 200;
      }

      const updatedScore = score + bonus;
      let nextClassicBest = classicHighScore;
      let nextAdvBest = adventureBestScore;

      if (bonus > 0) {
        setScore(updatedScore);
        if (mode === 'classic' && updatedScore > classicHighScore) {
          nextClassicBest = updatedScore;
          setClassicHighScore(updatedScore);
        } else if (mode === 'adventure' && updatedScore > adventureBestScore) {
          nextAdvBest = updatedScore;
          setAdventureBestScore(updatedScore);
        }
      }

      if (firebaseUser) {
        persistCloudProgress({
          classicHighScore: nextClassicBest,
          adventureBestScore: nextAdvBest,
          totalOstCorrect: nextCorrect,
          totalOstAttempted: nextAttempted,
        });
        saveTopicMastery(
          firebaseUser.uid,
          qTopic,
          nextTopicCorrect,
          nextTopicAttempted
        ).catch((err) => console.error('Failed saving topic mastery:', err));
      }
    },
    [
      activeQuiz,
      totalOstCorrect,
      totalOstAttempted,
      topicMastery,
      score,
      classicHighScore,
      adventureBestScore,
      mode,
      firebaseUser,
      persistCloudProgress,
    ]
  );

  const handleQuizContinue = useCallback(
    (isCorrect: boolean) => {
      if (!activeQuiz) return;
      const reason = activeQuiz.reason;
      setActiveQuiz(null);

      if (reason === 'blocks') {
        setBlocksUntilQuiz(BLOCKS_PER_CHECKPOINT);
        if (isCorrect) {
          spawnPopup('+150 OST', 'emerald', 'CHECKPOINT BONUS', 50, 35);
        }
        return;
      }

      if (reason === 'death-revive') {
        if (isCorrect) {
          const clearedBoard = reviveClearBoard(board);
          const nextTray = hasAnyValidMove(clearedBoard, tray)
            ? tray
            : generateTray(clearedBoard);
          setBoard(clearedBoard);
          setTray(nextTray);
          setReviveUsedInRun(true);
          setShaking(true);
          setTimeout(() => setShaking(false), 260);
          spawnPopup('REVIVED!', 'emerald', '+200 BONUS', 50, 45);
        } else {
          setGameOverOpen(true);
        }
        return;
      }

      if (reason === 'death-final') {
        setGameOverOpen(true);
      }
    },
    [activeQuiz, board, tray, spawnPopup]
  );

  const handleTopicChange = (topicId: OstTopicId | 'all') => {
    setSelectedTopic(topicId);
    persistCloudProgress({ selectedTopic: topicId });
  };

  const handleToggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    persistCloudProgress({ soundEnabled: next });
  };

  const activeTopicTitle = useMemo(() => {
    if (selectedTopic === 'all') {
      return `All Topics (${ALL_OST_QUESTIONS.length} Qs)`;
    }
    return OST_TOPICS.find((t) => t.id === selectedTopic)?.title || 'OST Review';
  }, [selectedTopic]);

  const highScoreForMode = mode === 'classic' ? classicHighScore : adventureBestScore;
  const ostAccuracy =
    totalOstAttempted > 0
      ? Math.round((totalOstCorrect / totalOstAttempted) * 100)
      : 0;

  return (
    <div className="min-h-screen bg-[#0B1221] text-slate-100 flex flex-col">
      {/* 3-Zone Top Bar */}
      <header className="sticky top-0 z-30 bg-[#0D1526]/95 backdrop-blur-md border-b border-slate-800/90">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4 sm:gap-8">
          {/* Zone 1: Brand Wordmark */}
          <button
            type="button"
            onClick={() => setActiveTab('play')}
            className="text-lg font-extrabold font-display tracking-tight text-slate-100 whitespace-nowrap shrink-0 cursor-pointer hover:text-amber-400 transition-colors"
          >
            Block Blast! OST
          </button>

          {/* Zone 2: Single-line navigation tabs */}
          <nav className="flex items-center gap-4 sm:gap-6 text-sm font-medium">
            <button
              type="button"
              onClick={() => setActiveTab('play')}
              className={`py-1 border-b-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                activeTab === 'play'
                  ? 'border-amber-400 text-amber-300 font-semibold'
                  : 'border-transparent text-slate-400 hover:text-slate-100'
              }`}
            >
              Play
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('topics')}
              className={`py-1 border-b-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                activeTab === 'topics'
                  ? 'border-amber-400 text-amber-300 font-semibold'
                  : 'border-slate-800/0 text-slate-400 hover:text-slate-100'
              }`}
            >
              OST Topics
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('leaderboard')}
              className={`py-1 border-b-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                activeTab === 'leaderboard'
                  ? 'border-amber-400 text-amber-300 font-semibold'
                  : 'border-transparent text-slate-400 hover:text-slate-100'
              }`}
            >
              Leaderboard
            </button>
          </nav>

          {/* Zone 3: Primary Account Action */}
          <div className="flex items-center shrink-0">
            {!authReady ? (
              <span className="text-xs text-slate-500 whitespace-nowrap">...</span>
            ) : firebaseUser ? (
              <button
                type="button"
                disabled={authBusy}
                onClick={handleSignOut}
                title={`Signed in as ${firebaseUser.email}`}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border border-slate-700 bg-[#162033] hover:bg-slate-800 text-xs font-semibold text-slate-200 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <span className="max-w-[100px] sm:max-w-[150px] truncate">
                  {extractFirstName(firebaseUser.displayName, firebaseUser.email)}
                </span>
                <LogOut className="w-3.5 h-3.5 text-slate-400" />
              </button>
            ) : (
              <button
                type="button"
                disabled={authBusy}
                onClick={handleSignIn}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Sign in</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {authError && (
        <div className="bg-rose-500/15 border-b border-rose-500/30 px-4 py-2 text-center text-xs text-rose-200">
          {authError}
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1">
        {activeTab === 'play' && (
          <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 sm:py-6 grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6 items-start">
            {/* Center Portrait Playfield */}
            <div className="flex flex-col items-center w-full">
              {/* Block Blast Top HUD */}
              <div className="w-full max-w-[420px] mb-3">
                <div className="flex items-center justify-between gap-2 px-1">
                  {/* Left: Crown High Score */}
                  <div className="flex items-center gap-1.5 min-w-[90px]">
                    <Crown className="w-5 h-5 text-amber-400 shrink-0" />
                    <span className="font-display font-bold text-lg text-amber-300 tabular-nums">
                      {highScoreForMode.toLocaleString()}
                    </span>
                  </div>

                  {/* Center: Prominent Current Score */}
                  <div className="text-center">
                    <div className="font-display font-extrabold text-3xl sm:text-4xl text-white tabular-nums leading-none">
                      {score.toLocaleString()}
                    </div>
                    {comboStreak >= 2 && (
                      <div className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-400 mt-0.5">
                        <Flame className="w-3 h-3" />
                        Combo ×{comboStreak}
                      </div>
                    )}
                  </div>

                  {/* Right: 6-Block Counter + Settings Gear */}
                  <div className="flex items-center justify-end gap-2 min-w-[90px]">
                    <div
                      title="OST question triggers every 6 blocks placed"
                      className="inline-flex items-center gap-1 text-xs font-mono tabular-nums text-slate-300"
                    >
                      <Boxes
                        className={`w-3.5 h-3.5 ${
                          blocksUntilQuiz === 1 ? 'text-amber-400' : 'text-slate-400'
                        }`}
                      />
                      <span className={blocksUntilQuiz === 1 ? 'text-amber-300 font-bold' : ''}>
                        {BLOCKS_PER_CHECKPOINT - blocksUntilQuiz}/{BLOCKS_PER_CHECKPOINT}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSettingsOpen(true)}
                      aria-label="Open game settings"
                      className="p-2 rounded-xl bg-[#162033] border border-slate-700/70 hover:border-slate-500 text-slate-300 hover:text-white transition-colors cursor-pointer"
                    >
                      <Settings className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Adventure Stage Goal Bar (only in Adventure Mode) */}
                {mode === 'adventure' && (
                  <div className="mt-2.5 px-3.5 py-2 rounded-xl bg-[#162033] border border-slate-700/70 flex items-center justify-between gap-3 text-xs">
                    <div className="font-semibold text-slate-200 truncate">
                      Stage {currentStage.level}: {currentStage.title}
                    </div>
                    <div className="flex items-center gap-3 shrink-0 font-mono tabular-nums">
                      {Object.entries(currentStage.gemTargets).map(([gKey, target]) => {
                        const got = collectedGems[gKey as GemType] || 0;
                        return (
                          <span
                            key={gKey}
                            className={`inline-flex items-center gap-1 ${
                              got >= (target || 0)
                                ? 'text-emerald-300 font-bold'
                                : 'text-slate-200'
                            }`}
                          >
                            <GemIcon gem={gKey as GemType} size="sm" />
                            {Math.min(got, target || 0)}/{target}
                          </span>
                        );
                      })}
                      <span
                        className={
                          score >= currentStage.targetScore
                            ? 'text-emerald-300 font-bold'
                            : 'text-amber-300'
                        }
                      >
                        {score}/{currentStage.targetScore} pts
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* 8x8 Grid + 3-Slot Tray */}
              <BlockBoard
                board={board}
                tray={tray}
                clearingRows={clearingRows}
                clearingCols={clearingCols}
                popups={popups}
                shaking={shaking}
                disabled={Boolean(activeQuiz) || gameOverOpen || stageVictoryOpen}
                onPlaceShape={handlePlaceShape}
              />
            </div>

            {/* Companion Panel (Mode, Topic, OST Stats) */}
            <aside className="bg-[#162033] border border-slate-700/70 rounded-2xl p-5 space-y-5">
              {/* Mode Switcher */}
              <div className="space-y-2">
                <div className="text-xs font-semibold text-slate-400">Game Mode</div>
                <div className="grid grid-cols-2 gap-1.5 p-1 bg-[#0F172A] rounded-xl border border-slate-800">
                  <button
                    type="button"
                    onClick={() => {
                      if (mode !== 'classic') startNewRun('classic');
                    }}
                    className={`py-2 px-3 rounded-lg text-xs font-bold transition-colors whitespace-nowrap cursor-pointer ${
                      mode === 'classic'
                        ? 'bg-amber-500 text-slate-950'
                        : 'text-slate-300 hover:text-white'
                    }`}
                  >
                    Classic
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (mode !== 'adventure') startNewRun('adventure');
                    }}
                    className={`py-2 px-3 rounded-lg text-xs font-bold transition-colors whitespace-nowrap cursor-pointer ${
                      mode === 'adventure'
                        ? 'bg-amber-500 text-slate-950'
                        : 'text-slate-300 hover:text-white'
                    }`}
                  >
                    Adventure Lv {adventureLevel}
                  </button>
                </div>
              </div>

              {/* Active OST Topic Quick Switcher */}
              <div className="space-y-2 pt-3 border-t border-slate-800">
                <div className="flex items-center justify-between">
                  <label
                    htmlFor="sidebar-topic-select"
                    className="text-xs font-semibold text-slate-400"
                  >
                    OST Playbook Topic
                  </label>
                  <button
                    type="button"
                    onClick={() => setActiveTab('topics')}
                    className="text-xs text-amber-400 hover:text-amber-300 font-medium cursor-pointer"
                  >
                    View all {OST_TOPICS.length}
                  </button>
                </div>
                <select
                  id="sidebar-topic-select"
                  value={selectedTopic}
                  onChange={(e) =>
                    handleTopicChange(e.target.value as OstTopicId | 'all')
                  }
                  className="w-full bg-[#0F172A] border border-slate-700 rounded-xl px-3 py-2 text-xs font-medium text-slate-100 outline-none focus:border-amber-400"
                >
                  <option value="all">
                    All Playbook Topics ({ALL_OST_QUESTIONS.length} Qs)
                  </option>
                  {OST_TOPICS.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.title} (30 Qs)
                    </option>
                  ))}
                </select>
                <p className="text-xs text-slate-400">
                  Triggers every 6 blocks placed and on every death.
                </p>
              </div>

              {/* OST Progress Metrics */}
              <div className="space-y-2.5 pt-3 border-t border-slate-800">
                <div className="text-xs font-semibold text-slate-400">
                  OST Review Stats
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-[#0F172A] border border-slate-800 rounded-xl p-3">
                    <div className="text-xs text-slate-400">OST Correct</div>
                    <div className="text-xl font-bold font-display text-emerald-300 tabular-nums mt-0.5">
                      {totalOstCorrect}
                    </div>
                  </div>
                  <div className="bg-[#0F172A] border border-slate-800 rounded-xl p-3">
                    <div className="text-xs text-slate-400">Accuracy</div>
                    <div className="text-xl font-bold font-display text-slate-100 tabular-nums mt-0.5">
                      {ostAccuracy}%
                    </div>
                  </div>
                </div>
                <div className="text-xs text-slate-400 font-mono tabular-nums flex items-center justify-between pt-1">
                  <span>This run: {runOstCorrect}/{runOstAttempted}</span>
                  <span>Revive: {reviveUsedInRun ? 'Used' : 'Ready'}</span>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="pt-3 border-t border-slate-800 flex flex-col gap-2">
                <button
                  type="button"
                  onClick={() => openQuiz('practice')}
                  className="w-full inline-flex items-center justify-center gap-2 py-2 px-3 rounded-xl border border-slate-700 bg-[#1D2B44] hover:bg-slate-800 text-slate-100 text-xs font-semibold transition-colors cursor-pointer"
                >
                  <BookOpen className="w-3.5 h-3.5 text-amber-400" />
                  Practice {activeTopicTitle}
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('leaderboard')}
                  className="w-full inline-flex items-center justify-center gap-2 py-2 px-3 rounded-xl border border-slate-700 bg-[#0F172A] hover:bg-slate-800 text-slate-300 text-xs font-semibold transition-colors cursor-pointer"
                >
                  <Trophy className="w-3.5 h-3.5 text-amber-400" />
                  View Leaderboards
                </button>
              </div>
            </aside>
          </div>
        )}

        {activeTab === 'topics' && (
          <TopicsView
            selectedTopic={selectedTopic}
            topicMastery={topicMastery}
            onSelectTopic={handleTopicChange}
            onPracticeTopic={(tid) => {
              handleTopicChange(tid);
              openQuiz('practice', tid);
            }}
            onGoToPlay={() => setActiveTab('play')}
          />
        )}

        {activeTab === 'leaderboard' && (
          <LeaderboardView
            currentUserId={firebaseUser?.uid || null}
            onRequestSignIn={handleSignIn}
          />
        )}
      </main>

      {/* OST Checkpoint / Death / Practice Modal */}
      {activeQuiz && (
        <OstQuizModal
          question={activeQuiz.question}
          reason={activeQuiz.reason}
          onResult={handleQuizResult}
          onContinue={handleQuizContinue}
          onNextPractice={
            activeQuiz.reason === 'practice'
              ? () => openQuiz('practice')
              : undefined
          }
          onClosePractice={
            activeQuiz.reason === 'practice'
              ? () => setActiveQuiz(null)
              : undefined
          }
        />
      )}

      {/* Settings Modal */}
      {settingsOpen && (
        <SettingsModal
          mode={mode}
          adventureLevel={adventureLevel}
          selectedTopic={selectedTopic}
          soundEnabled={soundEnabled}
          onChangeMode={(m) => startNewRun(m)}
          onChangeTopic={handleTopicChange}
          onToggleSound={handleToggleSound}
          onRestartRun={() => startNewRun(mode)}
          onClose={() => setSettingsOpen(false)}
        />
      )}

      {/* Game Over Summary Modal */}
      {gameOverOpen && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-sm bg-[#162033] border border-slate-700/80 rounded-2xl p-6 text-center space-y-5 shadow-2xl">
            <div className="space-y-1">
              <div className="text-xs font-semibold text-slate-400">
                {mode === 'classic' ? 'Classic Run Complete' : `Adventure Stage ${currentStage.level}`}
              </div>
              <h2 className="text-2xl font-extrabold font-display text-white">
                Game Over
              </h2>
            </div>

            <div className="bg-[#0F172A] border border-slate-800 rounded-xl p-4 space-y-2">
              <div className="text-xs text-slate-400">Final Score</div>
              <div className="text-4xl font-extrabold font-display text-amber-400 tabular-nums">
                {score.toLocaleString()}
              </div>
              <div className="text-xs text-slate-400 font-mono tabular-nums pt-1">
                Best: {highScoreForMode.toLocaleString()} · OST Correct: {runOstCorrect}/{runOstAttempted}
              </div>
            </div>

            {!firebaseUser && (
              <button
                type="button"
                onClick={handleSignIn}
                className="w-full py-2.5 px-4 rounded-xl border border-amber-500/40 bg-amber-500/10 hover:bg-amber-500/20 text-amber-200 text-xs font-semibold transition-colors cursor-pointer"
              >
                Sign in with Google to save score to Leaderboard
              </button>
            )}

            <button
              type="button"
              onClick={() => startNewRun(mode)}
              className="w-full inline-flex items-center justify-center gap-2 py-3 px-5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm transition-colors cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              Play Again
            </button>
          </div>
        </div>
      )}

      {/* Adventure Stage Victory Modal */}
      {stageVictoryOpen && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-sm bg-[#162033] border border-emerald-500/40 rounded-2xl p-6 text-center space-y-5 shadow-2xl">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/20 text-emerald-300 flex items-center justify-center mx-auto">
              <Award className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <div className="text-xs font-semibold text-emerald-300">
                Adventure Mode
              </div>
              <h2 className="text-2xl font-extrabold font-display text-white">
                Stage {adventureLevel - 1} Cleared!
              </h2>
              <p className="text-sm text-slate-400">
                Score: <span className="font-mono text-slate-100">{score.toLocaleString()}</span>
              </p>
            </div>

            <button
              type="button"
              onClick={() => startNewRun('adventure', adventureLevel)}
              className="w-full py-3 px-5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm transition-colors cursor-pointer"
            >
              Continue to Stage {adventureLevel}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
