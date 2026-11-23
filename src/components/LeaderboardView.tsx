import React, { useCallback, useEffect, useState } from 'react';
import { Award, CheckCircle2, Crown, RefreshCw, Trophy } from 'lucide-react';
import {
  extractFirstName,
  fetchLeaderboard,
  LeaderboardEntry,
} from '../firebase/progressService';

interface LeaderboardViewProps {
  currentUserId: string | null;
  onRequestSignIn: () => void;
}

interface BoardCardProps {
  title: string;
  subtitle: string;
  entries: LeaderboardEntry[];
  metric: 'highScore' | 'ostCorrectCount';
  currentUserId: string | null;
  loading: boolean;
  icon: React.ReactNode;
  accentClass: string;
}

const TopTenBoardCard: React.FC<BoardCardProps> = ({
  title,
  subtitle,
  entries,
  metric,
  currentUserId,
  loading,
  icon,
  accentClass,
}) => {
  return (
    <section className="rounded-2xl border border-slate-700/70 bg-[#162033] overflow-hidden flex flex-col">
      <div className="px-5 py-4 bg-[#101827] border-b border-slate-800 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          {icon}
          <div className="min-w-0">
            <h2 className="text-base font-bold font-display text-slate-100 truncate">
              {title}
            </h2>
            <p className="text-xs text-slate-400 truncate">{subtitle}</p>
          </div>
        </div>
        <span className="text-xs font-mono font-semibold text-slate-300 bg-slate-800/80 border border-slate-700 rounded-lg px-2.5 py-1 shrink-0">
          Top 10
        </span>
      </div>

      {loading ? (
        <div className="p-8 text-center text-sm text-slate-400">
          Loading Top 10 rankings...
        </div>
      ) : entries.length === 0 ? (
        <div className="p-8 text-center space-y-2">
          <Trophy className="w-7 h-7 text-slate-500 mx-auto" />
          <p className="text-sm text-slate-300 font-medium">No entries yet</p>
          <p className="text-xs text-slate-400">
            Sign in with Google and play to claim #1.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-800/80 text-xs text-slate-400">
                <th className="px-4 py-2.5 font-semibold w-14">Rank</th>
                <th className="px-4 py-2.5 font-semibold">Player</th>
                <th className="px-4 py-2.5 font-semibold text-right">
                  {metric === 'highScore' ? 'High Score' : 'OST Correct'}
                </th>
                <th className="px-4 py-2.5 font-semibold text-right hidden sm:table-cell">
                  {metric === 'highScore' ? 'OST' : 'Score'}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/70">
              {entries.slice(0, 10).map((entry, idx) => {
                const isMe = currentUserId === entry.uid;
                const rank = idx + 1;
                const acc =
                  entry.ostAttemptedCount > 0
                    ? Math.round(
                        (entry.ostCorrectCount / entry.ostAttemptedCount) * 100
                      )
                    : 0;
                const firstName = extractFirstName(entry.displayName);

                return (
                  <tr
                    key={`${metric}-${entry.uid}`}
                    className={
                      isMe
                        ? 'bg-amber-500/10'
                        : 'hover:bg-slate-800/35 transition-colors'
                    }
                  >
                    <td className="px-4 py-3 font-mono tabular-nums font-bold">
                      {rank <= 3 ? (
                        <span
                          className={`inline-flex items-center gap-1 ${
                            rank === 1
                              ? 'text-amber-400'
                              : rank === 2
                                ? 'text-slate-200'
                                : 'text-orange-400'
                          }`}
                        >
                          <Award className="w-4 h-4" />
                          {rank}
                        </span>
                      ) : (
                        <span className="text-slate-400">{rank}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-100">
                      <span className="truncate block max-w-[140px] sm:max-w-[180px]">
                        {firstName}
                        {isMe && (
                          <span className="ml-1.5 text-xs text-amber-400 font-semibold">
                            (You)
                          </span>
                        )}
                      </span>
                    </td>
                    <td
                      className={`px-4 py-3 text-right font-mono tabular-nums font-bold ${accentClass}`}
                    >
                      {metric === 'highScore' ? (
                        entry.highScore.toLocaleString()
                      ) : (
                        <>
                          {entry.ostCorrectCount.toLocaleString()}
                          <span className="text-xs font-normal text-slate-400 ml-1">
                            ({acc}%)
                          </span>
                        </>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right font-mono tabular-nums text-xs text-slate-400 hidden sm:table-cell">
                      {metric === 'highScore'
                        ? `${entry.ostCorrectCount.toLocaleString()} Qs`
                        : entry.highScore.toLocaleString()}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
};

export const LeaderboardView: React.FC<LeaderboardViewProps> = ({
  currentUserId,
  onRequestSignIn,
}) => {
  const [highScoreEntries, setHighScoreEntries] = useState<LeaderboardEntry[]>([]);
  const [ostCorrectEntries, setOstCorrectEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const [topScores, topOst] = await Promise.all([
        fetchLeaderboard('highScore', 10),
        fetchLeaderboard('ostCorrectCount', 10),
      ]);
      setHighScoreEntries(topScores.slice(0, 10));
      setOstCorrectEntries(topOst.slice(0, 10));
    } catch (err) {
      setErrorMsg(
        err instanceof Error
          ? 'Could not load leaderboard entries right now.'
          : 'Failed to load leaderboard.'
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold font-display text-slate-100">
            Top 10 Leaderboards
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Top 10 highest Block Blast! scores and Top 10 Algebra 1 OST questions answered correctly.
          </p>
        </div>

        <button
          type="button"
          onClick={loadData}
          disabled={loading}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-700 bg-[#162033] hover:bg-slate-800 text-slate-200 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Sign-in callout for unauthenticated players */}
      {!currentUserId && (
        <div className="rounded-2xl border border-amber-500/35 bg-amber-500/10 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <p className="text-sm text-amber-100">
            Sign in with your Google account to save your progress and post your first name to both Top 10 leaderboards.
          </p>
          <button
            type="button"
            onClick={onRequestSignIn}
            className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            Sign in with Google
          </button>
        </div>
      )}

      {errorMsg ? (
        <div className="rounded-2xl border border-slate-700/70 bg-[#162033] p-8 text-center space-y-3">
          <p className="text-sm text-rose-300">{errorMsg}</p>
          <button
            type="button"
            onClick={loadData}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-100 cursor-pointer"
          >
            Try Again
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <TopTenBoardCard
            title="Highest Block Blast! Score"
            subtitle="All-time best score across Classic & Adventure"
            entries={highScoreEntries}
            metric="highScore"
            currentUserId={currentUserId}
            loading={loading}
            icon={<Crown className="w-5 h-5 text-amber-400 shrink-0" />}
            accentClass="text-amber-300"
          />

          <TopTenBoardCard
            title="OST Questions Answered Correctly"
            subtitle="Total Algebra 1 Playbook questions mastered"
            entries={ostCorrectEntries}
            metric="ostCorrectCount"
            currentUserId={currentUserId}
            loading={loading}
            icon={<CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />}
            accentClass="text-emerald-300"
          />
        </div>
      )}
    </div>
  );
};
