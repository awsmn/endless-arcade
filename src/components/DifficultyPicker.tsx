import React from 'react';
import { Gauge } from 'lucide-react';
import { DIFFICULTIES, Difficulty } from '../engine/difficulty';

export function DifficultyPicker({ value, onChange }: { value: Difficulty; onChange: (value: Difficulty) => void }) {
  return <section className="difficulty-picker" aria-label="Game difficulty">
    <div className="difficulty-copy"><Gauge size={18} /><div><strong>YOUR PACE. YOUR ARCADE.</strong><p>{DIFFICULTIES[value].description}</p></div></div>
    <div className="difficulty-options" role="group" aria-label="Choose difficulty">
      {(Object.keys(DIFFICULTIES) as Difficulty[]).map(key => <button key={key} aria-pressed={value === key} onClick={() => onChange(key)}>{DIFFICULTIES[key].label}</button>)}
    </div>
  </section>;
}
