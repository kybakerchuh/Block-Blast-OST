import { User } from 'firebase/auth';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from './config';

export interface UserProgress {
  uid: string;
  email: string;
  displayName: string;
  classicHighScore: number;
  adventureBestScore: number;
  adventureLevel: number;
  totalOstCorrect: number;
  totalOstAttempted: number;
  selectedTopic: string;
  soundEnabled: boolean;
}

export interface TopicMastery {
  topicId: string;
  correctCount: number;
  attemptedCount: number;
}

export interface LeaderboardEntry {
  uid: string;
  displayName: string;
  highScore: number;
  ostCorrectCount: number;
  ostAttemptedCount: number;
  adventureLevel: number;
}

export function extractFirstName(
  name: string | null | undefined,
  email?: string | null
): string {
  const trimmed = name?.trim() ?? '';
  if (trimmed.length > 0) {
    const tokens = trimmed.split(/\s+/);
    // Handle "Last, First" format if present, otherwise use the first token
    const rawFirst =
      tokens[0].endsWith(',') && tokens.length > 1
        ? tokens[1]
        : tokens[0].replace(/,+$/, '');
    const cleaned = rawFirst.trim().slice(0, 60);
    if (cleaned.length > 0) return cleaned;
  }

  if (email && email.includes('@')) {
    const local = email.split('@')[0];
    const firstPart = local.split(/[._-]+/).find((p) => p.trim().length > 0);
    if (firstPart) {
      const formatted =
        firstPart.charAt(0).toUpperCase() + firstPart.slice(1);
      return formatted.slice(0, 60);
    }
  }

  return 'Player';
}

function sanitizeDisplayName(
  name: string | null | undefined,
  email?: string | null
): string {
  return extractFirstName(name, email);
}

function clampInt(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.max(min, Math.min(max, Math.floor(value)));
}

function sanitizeTopicId(topicId: string): string {
  const cleaned = topicId.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 64);
  return cleaned.length > 0 ? cleaned : 'all';
}

export async function loadOrCreateUserProfile(
  user: User,
  localFallback?: Partial<UserProgress>
): Promise<UserProgress> {
  const path = `users/${user.uid}`;
  const userRef = doc(db, 'users', user.uid);

  let snap;
  try {
    snap = await getDoc(userRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }

  const displayName = sanitizeDisplayName(user.displayName, user.email);
  const email = (user.email || 'unknown@user.local').slice(0, 254);

  if (snap.exists()) {
    const data = snap.data();
    const merged: UserProgress = {
      uid: user.uid,
      email: typeof data.email === 'string' ? data.email : email,
      displayName,
      classicHighScore: Math.max(
        clampInt(Number(data.classicHighScore ?? 0), 0, 10000000),
        clampInt(Number(localFallback?.classicHighScore ?? 0), 0, 10000000)
      ),
      adventureBestScore: Math.max(
        clampInt(Number(data.adventureBestScore ?? 0), 0, 10000000),
        clampInt(Number(localFallback?.adventureBestScore ?? 0), 0, 10000000)
      ),
      adventureLevel: Math.max(
        clampInt(Number(data.adventureLevel ?? 1), 1, 1000),
        clampInt(Number(localFallback?.adventureLevel ?? 1), 1, 1000)
      ),
      totalOstCorrect: Math.max(
        clampInt(Number(data.totalOstCorrect ?? 0), 0, 1000000),
        clampInt(Number(localFallback?.totalOstCorrect ?? 0), 0, 1000000)
      ),
      totalOstAttempted: Math.max(
        clampInt(Number(data.totalOstAttempted ?? 0), 0, 1000000),
        clampInt(Number(localFallback?.totalOstAttempted ?? 0), 0, 1000000)
      ),
      selectedTopic: sanitizeTopicId(
        typeof data.selectedTopic === 'string'
          ? data.selectedTopic
          : localFallback?.selectedTopic || 'all'
      ),
      soundEnabled:
        typeof data.soundEnabled === 'boolean'
          ? data.soundEnabled
          : localFallback?.soundEnabled ?? true,
    };

    if (merged.totalOstCorrect > merged.totalOstAttempted) {
      merged.totalOstAttempted = merged.totalOstCorrect;
    }

    // Sync any local gains or updated first-name displayName up to Firestore
    if (
      merged.displayName !== data.displayName ||
      merged.classicHighScore !== data.classicHighScore ||
      merged.adventureBestScore !== data.adventureBestScore ||
      merged.adventureLevel !== data.adventureLevel ||
      merged.totalOstCorrect !== data.totalOstCorrect ||
      merged.totalOstAttempted !== data.totalOstAttempted
    ) {
      await saveUserProgress(merged);
    } else {
      await syncLeaderboardEntry(merged);
    }

    return merged;
  }

  const initial: UserProgress = {
    uid: user.uid,
    email,
    displayName,
    classicHighScore: clampInt(localFallback?.classicHighScore ?? 0, 0, 10000000),
    adventureBestScore: clampInt(localFallback?.adventureBestScore ?? 0, 0, 10000000),
    adventureLevel: clampInt(localFallback?.adventureLevel ?? 1, 1, 1000),
    totalOstCorrect: clampInt(localFallback?.totalOstCorrect ?? 0, 0, 1000000),
    totalOstAttempted: clampInt(localFallback?.totalOstAttempted ?? 0, 0, 1000000),
    selectedTopic: sanitizeTopicId(localFallback?.selectedTopic || 'all'),
    soundEnabled: localFallback?.soundEnabled ?? true,
  };

  if (initial.totalOstCorrect > initial.totalOstAttempted) {
    initial.totalOstAttempted = initial.totalOstCorrect;
  }

  try {
    await setDoc(userRef, {
      ...initial,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }

  await syncLeaderboardEntry(initial);
  return initial;
}

export async function saveUserProgress(progress: UserProgress): Promise<void> {
  const path = `users/${progress.uid}`;
  const userRef = doc(db, 'users', progress.uid);

  const sanitizedCorrect = clampInt(progress.totalOstCorrect, 0, 1000000);
  const sanitizedAttempted = Math.max(
    sanitizedCorrect,
    clampInt(progress.totalOstAttempted, 0, 1000000)
  );

  const updatePayload = {
    displayName: sanitizeDisplayName(progress.displayName, progress.email),
    classicHighScore: clampInt(progress.classicHighScore, 0, 10000000),
    adventureBestScore: clampInt(progress.adventureBestScore, 0, 10000000),
    adventureLevel: clampInt(progress.adventureLevel, 1, 1000),
    totalOstCorrect: sanitizedCorrect,
    totalOstAttempted: sanitizedAttempted,
    selectedTopic: sanitizeTopicId(progress.selectedTopic),
    soundEnabled: Boolean(progress.soundEnabled),
    updatedAt: serverTimestamp(),
  };

  try {
    await updateDoc(userRef, updatePayload);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }

  await syncLeaderboardEntry({
    ...progress,
    ...updatePayload,
  });
}

export async function syncLeaderboardEntry(progress: UserProgress): Promise<void> {
  const path = `leaderboard/${progress.uid}`;
  const lbRef = doc(db, 'leaderboard', progress.uid);

  const bestScore = Math.max(
    clampInt(progress.classicHighScore, 0, 10000000),
    clampInt(progress.adventureBestScore, 0, 10000000)
  );
  const ostCorrect = clampInt(progress.totalOstCorrect, 0, 1000000);
  const ostAttempted = Math.max(ostCorrect, clampInt(progress.totalOstAttempted, 0, 1000000));

  const payload = {
    uid: progress.uid,
    displayName: sanitizeDisplayName(progress.displayName, progress.email),
    highScore: bestScore,
    ostCorrectCount: ostCorrect,
    ostAttemptedCount: ostAttempted,
    adventureLevel: clampInt(progress.adventureLevel, 1, 1000),
    updatedAt: serverTimestamp(),
  };

  try {
    const existing = await getDoc(lbRef);
    if (existing.exists()) {
      await updateDoc(lbRef, {
        displayName: payload.displayName,
        highScore: payload.highScore,
        ostCorrectCount: payload.ostCorrectCount,
        ostAttemptedCount: payload.ostAttemptedCount,
        adventureLevel: payload.adventureLevel,
        updatedAt: serverTimestamp(),
      });
    } else {
      await setDoc(lbRef, payload);
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function loadAllTopicProgress(uid: string): Promise<Record<string, TopicMastery>> {
  const path = `users/${uid}/topicProgress`;
  try {
    const q = query(collection(db, path), where('uid', '==', uid));
    const snap = await getDocs(q);
    const result: Record<string, TopicMastery> = {};
    snap.forEach((docSnap) => {
      const d = docSnap.data();
      const topicId = sanitizeTopicId(String(d.topicId || docSnap.id));
      const correct = clampInt(Number(d.correctCount ?? 0), 0, 1000000);
      const attempted = Math.max(correct, clampInt(Number(d.attemptedCount ?? 0), 0, 1000000));
      result[topicId] = {
        topicId,
        correctCount: correct,
        attemptedCount: attempted,
      };
    });
    return result;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export async function saveTopicMastery(
  uid: string,
  topicId: string,
  correctCount: number,
  attemptedCount: number
): Promise<void> {
  const safeTopic = sanitizeTopicId(topicId);
  const path = `users/${uid}/topicProgress/${safeTopic}`;
  const docRef = doc(db, 'users', uid, 'topicProgress', safeTopic);

  const safeCorrect = clampInt(correctCount, 0, 1000000);
  const safeAttempted = Math.max(safeCorrect, clampInt(attemptedCount, 0, 1000000));

  try {
    const existing = await getDoc(docRef);
    if (existing.exists()) {
      await updateDoc(docRef, {
        correctCount: safeCorrect,
        attemptedCount: safeAttempted,
        updatedAt: serverTimestamp(),
      });
    } else {
      await setDoc(docRef, {
        uid,
        topicId: safeTopic,
        correctCount: safeCorrect,
        attemptedCount: safeAttempted,
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function fetchLeaderboard(
  sortBy: 'highScore' | 'ostCorrectCount',
  maxRows = 10
): Promise<LeaderboardEntry[]> {
  const path = 'leaderboard';
  try {
    const q = query(
      collection(db, path),
      where(sortBy, '>=', 0),
      orderBy(sortBy, 'desc'),
      limit(maxRows)
    );
    const snap = await getDocs(q);
    return snap.docs.map((docSnap) => {
      const d = docSnap.data();
      return {
        uid: String(d.uid || docSnap.id),
        displayName: extractFirstName(
          typeof d.displayName === 'string' ? d.displayName : null
        ),
        highScore: Number(d.highScore ?? 0),
        ostCorrectCount: Number(d.ostCorrectCount ?? 0),
        ostAttemptedCount: Number(d.ostAttemptedCount ?? 0),
        adventureLevel: Number(d.adventureLevel ?? 1),
      };
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}
