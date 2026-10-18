import React, { useState, useEffect, useRef, useCallback } from 'react';
import { GameMode, GameScoreUpdate } from '../../types/game';
import { sounds } from '../../engine/audio';
import { haptics } from '../../engine/haptics';
import { Delete, Trophy, RotateCcw } from 'lucide-react';

interface WordPulseViewProps {
  mode: GameMode;
  level?: number;
  isPaused: boolean;
  onScoreUpdate: (update: GameScoreUpdate) => void;
  onGameOver: (finalScore: number, isNewHighScore: boolean, stars?: number) => void;
}

const WORDS = [
  'CYBER', 'PULSE', 'RETRO', 'LASER', 'PIXEL', 'NEON', 'QUEST', 'DREAM',
  'POWER', 'FLAME', 'GHOST', 'BLITZ', 'FOCUS', 'SPACE', 'SOLAR', 'MAGIC',
  'CLOUD', 'SWIFT', 'BRAIN', 'SHINE', 'SPARK', 'TURBO', 'SONIC', 'HYPER',
  'PRISM', 'CHRON', 'NEXUS', 'VORTX', 'TITAN', 'GLOWS', 'SHARP', 'FLASH',
  'STORM', 'BLAZE', 'SPEED', 'VIPER', 'ORBIT', 'SUPER', 'VITAL', 'RADIO'
];

type LetterStatus = 'correct' | 'present' | 'absent' | 'empty';

interface GuessRow {
  letters: string[];
  statuses: LetterStatus[];
}

export const WordPulseView: React.FC<WordPulseViewProps> = ({
  isPaused,
  onScoreUpdate,
  onGameOver
}) => {
  const [targetWord, setTargetWord] = useState(() => WORDS[Math.floor(Math.random() * WORDS.length)]);
  const [guesses, setGuesses] = useState<GuessRow[]>([]);
  const [currentGuess, setCurrentGuess] = useState('');
  const [keyStatuses, setKeyStatuses] = useState<Record<string, LetterStatus>>({});
  const [score, setScore] = useState(0);
  const [shakeRow, setShakeRow] = useState(false);

  const isGameOverRef = useRef(false);

  const startNewWord = useCallback(() => {
    isGameOverRef.current = false;
    const nextWord = WORDS[Math.floor(Math.random() * WORDS.length)];
    setTargetWord(nextWord);
    setGuesses([]);
    setCurrentGuess('');
    setKeyStatuses({});
  }, []);

  // Handle letter input
  const addLetter = useCallback(
    (letter: string) => {
      if (isPaused || isGameOverRef.current || currentGuess.length >= 5) return;
      setCurrentGuess(prev => prev + letter.toUpperCase());
      sounds.playTap();
      haptics.tap();
    },
    [currentGuess.length, isPaused]
  );

  const deleteLetter = useCallback(() => {
    if (isPaused || isGameOverRef.current || currentGuess.length === 0) return;
    setCurrentGuess(prev => prev.slice(0, -1));
    sounds.playTap();
  }, [currentGuess.length, isPaused]);

  // Submit guess
  const submitGuess = useCallback(() => {
    if (isPaused || isGameOverRef.current) return;
    if (currentGuess.length !== 5) {
      setShakeRow(true);
      sounds.playHit();
      haptics.impact();
      setTimeout(() => setShakeRow(false), 500);
      return;
    }

    const letters = currentGuess.split('');
    const targetLetters = targetWord.split('');
    const statuses: LetterStatus[] = Array(5).fill('absent');
    const matched = Array(5).fill(false);

    // First pass: exact matches (green)
    for (let i = 0; i < 5; i++) {
      if (letters[i] === targetLetters[i]) {
        statuses[i] = 'correct';
        matched[i] = true;
      }
    }

    // Second pass: letter exists in wrong spot (amber)
    for (let i = 0; i < 5; i++) {
      if (statuses[i] !== 'correct') {
        const foundIdx = targetLetters.findIndex((l, idx) => l === letters[i] && !matched[idx]);
        if (foundIdx !== -1) {
          statuses[i] = 'present';
          matched[foundIdx] = true;
        }
      }
    }

    // Update keyboard statuses
    const newKeyStatuses = { ...keyStatuses };
    letters.forEach((l, idx) => {
      const status = statuses[idx];
      const current = newKeyStatuses[l];
      if (status === 'correct') {
        newKeyStatuses[l] = 'correct';
      } else if (status === 'present' && current !== 'correct') {
        newKeyStatuses[l] = 'present';
      } else if (status === 'absent' && !current) {
        newKeyStatuses[l] = 'absent';
      }
    });
    setKeyStatuses(newKeyStatuses);

    const nextGuesses = [...guesses, { letters, statuses }];
    setGuesses(nextGuesses);
    setCurrentGuess('');

    const isWin = currentGuess === targetWord;
    if (isWin) {
      isGameOverRef.current = true;
      sounds.playVictory();
      haptics.success();
      const attemptsUsed = nextGuesses.length;
      const points = (7 - attemptsUsed) * 200;
      const nextScore = score + points;
      setScore(nextScore);
      onScoreUpdate({ score: nextScore });
      const stars = attemptsUsed <= 3 ? 3 : attemptsUsed <= 5 ? 2 : 1;
      setTimeout(() => {
        onGameOver(nextScore, true, stars);
      }, 1000);
    } else if (nextGuesses.length >= 6) {
      isGameOverRef.current = true;
      sounds.playGameOver();
      haptics.gameOver();
      setTimeout(() => {
        onGameOver(score, false, 0);
      }, 1000);
    } else {
      sounds.playBounce();
      haptics.bump();
    }
  }, [currentGuess, guesses, isPaused, keyStatuses, onGameOver, onScoreUpdate, score, targetWord]);

  // Physical keyboard typing
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isPaused || isGameOverRef.current) return;
      if (/^[a-zA-Z]$/.test(e.key)) {
        e.preventDefault();
        addLetter(e.key);
      } else if (e.key === 'Backspace') {
        e.preventDefault();
        deleteLetter();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        submitGuess();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [addLetter, deleteLetter, isPaused, submitGuess]);

  const KEYBOARD_ROWS = [
    ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
    ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
    ['ENTER', 'Z', 'X', 'C', 'V', 'B', 'N', 'M', 'DEL']
  ];

  return (
    <div className="relative w-full h-full flex flex-col items-center justify-between overflow-hidden select-none touch-none pb-2 pt-14">
      {/* Top HUD */}
      <div className="w-full max-w-md px-3 flex items-center justify-between z-20">
        <div className="glass-pill px-3 py-1.5 rounded-xl border border-slate-700/40 dark:border-slate-800 shadow-sm flex items-center space-x-1.5">
          <Trophy className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
          <span className="text-xs font-bold text-slate-800 dark:text-slate-100">{score}</span>
        </div>

        <div className="glass-pill px-3 py-1.5 rounded-xl border border-slate-700/40 dark:border-slate-800 shadow-sm">
          <span className="text-xs font-bold text-rose-400">GUESS {guesses.length + 1}/6</span>
        </div>

        <button
          type="button"
          onClick={startNewWord}
          className="glass-panel border border-slate-700/40 rounded-xl p-2 active:scale-95 shadow-sm text-sky-400"
          aria-label="New Word"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* 6x5 Letter Grid - Maximized */}
      <div className="w-[min(380px,88vw,48vh)] aspect-[5/6] p-2 sm:p-3 bg-slate-900/85 dark:bg-slate-950/85 rounded-3xl border border-slate-700/50 dark:border-slate-800 shadow-2xl flex flex-col justify-between my-auto z-20">
        {Array.from({ length: 6 }).map((_, rIdx) => {
          const guess = guesses[rIdx];
          const isCurrentRow = rIdx === guesses.length;

          return (
            <div
              key={rIdx}
              className={`flex space-x-1.5 my-[2px] ${
                isCurrentRow && shakeRow ? 'animate-bounce' : ''
              }`}
            >
              {Array.from({ length: 5 }).map((_, cIdx) => {
                let letter = '';
                let status: LetterStatus = 'empty';

                if (guess) {
                  letter = guess.letters[cIdx] || '';
                  status = guess.statuses[cIdx];
                } else if (isCurrentRow) {
                  letter = currentGuess[cIdx] || '';
                }

                let tileBg = 'bg-slate-800/40 border border-slate-700/40 text-slate-200';
                if (status === 'correct') {
                  tileBg = 'bg-emerald-600/40 border border-emerald-500 text-emerald-300 shadow-sm';
                } else if (status === 'present') {
                  tileBg = 'bg-amber-500/30 border border-amber-400 text-amber-300 shadow-sm';
                } else if (status === 'absent') {
                  tileBg = 'bg-slate-800/80 border border-slate-700/30 text-slate-500';
                } else if (letter) {
                  tileBg = 'bg-slate-800 border border-sky-400/60 text-white shadow-sm';
                }

                return (
                  <div
                    key={cIdx}
                    className={`flex-1 aspect-square rounded-xl flex items-center justify-center font-bold text-lg sm:text-xl uppercase transition-all duration-150 ${tileBg}`}
                  >
                    {letter}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>

      {/* Virtual Cyber QWERTY Keyboard */}
      <div className="w-full max-w-md px-2 pb-2 flex flex-col space-y-1.5 z-20">
        {KEYBOARD_ROWS.map((row, rIdx) => (
          <div key={rIdx} className="flex justify-center space-x-1 sm:space-x-1.5">
            {row.map(key => {
              const status = keyStatuses[key];
              const isAction = key === 'ENTER' || key === 'DEL';

              let keyBg = 'bg-slate-800/80 text-slate-200 border border-slate-700/50 hover:bg-slate-700/80';
              if (status === 'correct') {
                keyBg = 'bg-emerald-600 text-white border border-emerald-500';
              } else if (status === 'present') {
                keyBg = 'bg-amber-500 text-slate-950 border border-amber-400';
              } else if (status === 'absent') {
                keyBg = 'bg-slate-900/60 text-slate-600 border border-slate-800';
              } else if (isAction) {
                keyBg = 'bg-slate-700/80 text-sky-400 border border-slate-600';
              }

              return (
                <button
                  key={key}
                  type="button"
                  onPointerDown={e => {
                    e.preventDefault();
                    if (key === 'ENTER') submitGuess();
                    else if (key === 'DEL') deleteLetter();
                    else addLetter(key);
                  }}
                  className={`h-11 rounded-xl flex items-center justify-center font-bold text-xs active:scale-95 transition-all shadow-sm ${keyBg} ${
                    isAction ? 'px-3 text-[10px]' : 'flex-1'
                  }`}
                >
                  {key === 'DEL' ? <Delete className="w-4 h-4" /> : key}
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
};
