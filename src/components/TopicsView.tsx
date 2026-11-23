import React from 'react';
import { BookOpen, Check, Play } from 'lucide-react';
import { ALL_OST_QUESTIONS, OST_TOPICS, QUESTIONS_BY_TOPIC } from '../data/ostQuestions';
import { OstTopicId } from '../data/ostQuestions/types';
import { TopicMastery } from '../firebase/progressService';

interface TopicsViewProps {
  selectedTopic: OstTopicId | 'all';
  topicMastery: Record<string, TopicMastery>;
  onSelectTopic: (topicId: OstTopicId | 'all') => void;
  onPracticeTopic: (topicId: OstTopicId | 'all') => void;
  onGoToPlay: () => void;
}

export const TopicsView: React.FC<TopicsViewProps> = ({
  selectedTopic,
  topicMastery,
  onSelectTopic,
  onPracticeTopic,
  onGoToPlay,
}) => {
  const totalCorrect = Object.values(topicMastery).reduce(
    (sum, t) => sum + t.correctCount,
    0
  );
  const totalAttempted = Object.values(topicMastery).reduce(
    (sum, t) => sum + t.attemptedCount,
    0
  );

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold font-display text-slate-100">
            Algebra 1 OST Playbook Topics
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Choose which topic appears every 6 blocks placed and during death revives (30 questions per topic).
          </p>
        </div>
        <div className="text-sm text-slate-300 font-mono tabular-nums shrink-0">
          Overall: {totalCorrect} correct / {totalAttempted} answered
        </div>
      </div>

      {/* All Topics Mixed Option */}
      <div
        className={`rounded-2xl border p-5 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
          selectedTopic === 'all'
            ? 'bg-amber-500/10 border-amber-400/70'
            : 'bg-[#162033] border-slate-700/70 hover:border-slate-600'
        }`}
      >
        <div className="space-y-1">
          <div className="flex items-center gap-2.5 text-xs text-slate-400">
            <span>Full OST Playbook Mix</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono tabular-nums">
              {ALL_OST_QUESTIONS.length} Questions
            </span>
          </div>
          <h2 className="text-lg font-bold font-display text-slate-100">
            All Playbook Topics (Mixed Review)
          </h2>
          <p className="text-sm text-slate-400">
            Cycles across all {OST_TOPICS.length} Algebra 1 OST Playbook sections for full exam readiness.
          </p>
        </div>
        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={() => onPracticeTopic('all')}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-slate-700 bg-slate-800/70 hover:bg-slate-800 text-slate-200 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <BookOpen className="w-3.5 h-3.5" />
            Practice
          </button>
          <button
            type="button"
            onClick={() => {
              onSelectTopic('all');
              onGoToPlay();
            }}
            className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              selectedTopic === 'all'
                ? 'bg-amber-500 text-slate-950'
                : 'bg-slate-100 hover:bg-white text-slate-950'
            }`}
          >
            {selectedTopic === 'all' ? (
              <>
                <Check className="w-3.5 h-3.5" />
                Active in Game
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5" />
                Use in Game
              </>
            )}
          </button>
        </div>
      </div>

      {/* Specific Playbook Topics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {OST_TOPICS.map((topic, index) => {
          const isSelected = selectedTopic === topic.id;
          const mastery = topicMastery[topic.id];
          const correct = mastery?.correctCount ?? 0;
          const attempted = mastery?.attemptedCount ?? 0;
          const qCount = QUESTIONS_BY_TOPIC[topic.id].length;
          const accuracy =
            attempted > 0 ? Math.round((correct / attempted) * 100) : null;

          return (
            <div
              key={topic.id}
              className={`rounded-2xl border p-5 flex flex-col justify-between gap-4 transition-colors ${
                isSelected
                  ? 'bg-amber-500/10 border-amber-400/70'
                  : 'bg-[#162033] border-slate-700/70 hover:border-slate-600'
              }`}
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2 text-xs text-slate-400">
                  <span className="truncate">
                    {String(index + 1).padStart(2, '0')}. {topic.playbookSection}
                  </span>
                  <span className="font-mono tabular-nums shrink-0">
                    {qCount} Qs
                  </span>
                </div>
                <h3 className="text-lg font-bold font-display text-slate-100">
                  {topic.title}
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  {topic.description}
                </p>
              </div>

              <div className="space-y-3 pt-2 border-t border-slate-800/80">
                <div className="flex items-center justify-between text-xs text-slate-300 font-mono tabular-nums">
                  <span>
                    {correct} / {attempted} correct
                  </span>
                  <span>{accuracy !== null ? `${accuracy}%` : '—'}</span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => onPracticeTopic(topic.id)}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border border-slate-700 bg-slate-800/60 hover:bg-slate-800 text-slate-200 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    <BookOpen className="w-3.5 h-3.5" />
                    Drill
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onSelectTopic(topic.id);
                      onGoToPlay();
                    }}
                    className={`flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                      isSelected
                        ? 'bg-amber-500 text-slate-950'
                        : 'bg-slate-100 hover:bg-white text-slate-950'
                    }`}
                  >
                    {isSelected ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        Selected
                      </>
                    ) : (
                      <>
                        <Play className="w-3.5 h-3.5" />
                        Select
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
