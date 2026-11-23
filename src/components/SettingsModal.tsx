import React from 'react';
import { RotateCcw, Volume2, VolumeX, X } from 'lucide-react';
import { ALL_OST_QUESTIONS, OST_TOPICS } from '../data/ostQuestions';
import { OstTopicId } from '../data/ostQuestions/types';
import { GameMode } from '../game/types';

interface SettingsModalProps {
  mode: GameMode;
  adventureLevel: number;
  selectedTopic: OstTopicId | 'all';
  soundEnabled: boolean;
  onChangeMode: (mode: GameMode) => void;
  onChangeTopic: (topic: OstTopicId | 'all') => void;
  onToggleSound: () => void;
  onRestartRun: () => void;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  mode,
  adventureLevel,
  selectedTopic,
  soundEnabled,
  onChangeMode,
  onChangeTopic,
  onToggleSound,
  onRestartRun,
  onClose,
}) => {
  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="settings-modal-title"
    >
      <div className="w-full max-w-md bg-[#162033] border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden">
        <div className="px-5 py-4 bg-[#101827] border-b border-slate-800 flex items-center justify-between">
          <h2 id="settings-modal-title" className="text-lg font-bold font-display text-slate-100">
            Game Settings
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors cursor-pointer"
            aria-label="Close settings"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* Game Mode */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-slate-300">
              Game Mode
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  onChangeMode('classic');
                  onClose();
                }}
                className={`py-2.5 px-3 rounded-xl border text-xs font-bold transition-colors cursor-pointer ${
                  mode === 'classic'
                    ? 'bg-amber-500 text-slate-950 border-amber-400'
                    : 'bg-[#1D2B44] border-slate-700 text-slate-200 hover:border-slate-500'
                }`}
              >
                Classic Endless
              </button>
              <button
                type="button"
                onClick={() => {
                  onChangeMode('adventure');
                  onClose();
                }}
                className={`py-2.5 px-3 rounded-xl border text-xs font-bold transition-colors cursor-pointer ${
                  mode === 'adventure'
                    ? 'bg-amber-500 text-slate-950 border-amber-400'
                    : 'bg-[#1D2B44] border-slate-700 text-slate-200 hover:border-slate-500'
                }`}
              >
                Adventure (Stage {adventureLevel})
              </button>
            </div>
          </div>

          {/* OST Topic Selector */}
          <div className="space-y-2">
            <label
              htmlFor="settings-topic-select"
              className="block text-xs font-semibold text-slate-300"
            >
              OST Playbook Topic
            </label>
            <select
              id="settings-topic-select"
              value={selectedTopic}
              onChange={(e) => onChangeTopic(e.target.value as OstTopicId | 'all')}
              className="w-full bg-[#0F172A] border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 outline-none focus:border-amber-400"
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
          </div>

          {/* Sound Toggle */}
          <div className="flex items-center justify-between py-2 border-y border-slate-800">
            <div>
              <p className="text-sm font-medium text-slate-100">Sound Effects</p>
              <p className="text-xs text-slate-400">
                Block placement &amp; line-clear chimes
              </p>
            </div>
            <button
              type="button"
              onClick={onToggleSound}
              className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border text-xs font-semibold transition-colors cursor-pointer ${
                soundEnabled
                  ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
                  : 'bg-slate-800 border-slate-700 text-slate-400'
              }`}
            >
              {soundEnabled ? (
                <>
                  <Volume2 className="w-4 h-4" /> On
                </>
              ) : (
                <>
                  <VolumeX className="w-4 h-4" /> Off
                </>
              )}
            </button>
          </div>

          {/* Restart Button */}
          <button
            type="button"
            onClick={() => {
              onRestartRun();
              onClose();
            }}
            className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/40 text-rose-200 text-sm font-semibold transition-colors cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
            Restart Current Run
          </button>
        </div>
      </div>
    </div>
  );
};
