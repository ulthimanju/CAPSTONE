import React, { useState } from 'react';
import {
  Sparkles,
  RotateCw,
  ChevronLeft,
  ChevronRight,
  Shuffle,
  CheckCircle,
} from 'lucide-react';
import { Card, Button, Badge, RegenerateIcon } from '@/components/ui';
import { cn } from '@/lib/cn';

export function UnitFlashcardsView({ flashcards = [] }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [cards, setCards] = useState(flashcards);

  if (!cards || cards.length === 0) {
    return (
      <div className="flex min-h-[240px] items-center justify-center p-8 text-center text-text/60">
        <p className="font-mono text-xs">No flashcards available for this unit.</p>
      </div>
    );
  }

  const currentCard = cards[currentIndex];

  const handleNext = () => {
    setIsFlipped(false);
    setCurrentIndex((prev) => (prev + 1) % cards.length);
  };

  const handlePrev = () => {
    setIsFlipped(false);
    setCurrentIndex((prev) => (prev - 1 + cards.length) % cards.length);
  };

  const handleShuffle = () => {
    setIsFlipped(false);
    const shuffled = [...cards].sort(() => Math.random() - 0.5);
    setCards(shuffled);
    setCurrentIndex(0);
  };

  const handleReset = () => {
    setIsFlipped(false);
    setCards(flashcards);
    setCurrentIndex(0);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Top Header Control Bar */}
      <div className="flex items-center justify-between border-b border-sep-line pb-3">
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs text-text/70">
            Card <strong className="text-text">{currentIndex + 1}</strong> of{' '}
            <strong className="text-text">{cards.length}</strong>
          </span>
          {currentCard?.concept_key && (
            <Badge variant="outline" className="font-mono text-[10px] uppercase">
              {currentCard.concept_key.replace(/_/g, ' ')}
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleShuffle}
            className="text-xs text-text/70 hover:text-text"
            leftIcon={<Shuffle className="h-3.5 w-3.5" />}
          >
            Shuffle
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleReset}
            className="text-xs text-text/70 hover:text-text"
            leftIcon={<RegenerateIcon className="h-3.5 w-3.5" />}
          >
            Reset
          </Button>
        </div>
      </div>

      {/* Interactive 3D Flip Flashcard */}
      <div
        role="button"
        tabIndex={0}
        onClick={() => setIsFlipped((prev) => !prev)}
        onKeyDown={(e) => {
          if (e.key === ' ' || e.key === 'Enter') {
            e.preventDefault();
            setIsFlipped((prev) => !prev);
          }
        }}
        className="cursor-pointer select-none group min-h-[320px] focus:outline-none"
      >
        <Card
          className={cn(
            'min-h-[320px] p-8 flex flex-col justify-between transition-all duration-300 shadow-md border-sep-line',
            isFlipped
              ? 'bg-sand/60 border-accent/40'
              : 'bg-surface hover:border-accent/50'
          )}
        >
          {/* Card Top Pill */}
          <div className="flex items-center justify-between text-xs font-mono text-text/60">
            <span className="uppercase tracking-wider font-semibold text-accent">
              {isFlipped ? 'Answer / Explanation' : 'Prompt / Concept Question'}
            </span>
            <span className="flex items-center gap-1 text-[11px] text-text/50">
              <RotateCw className="h-3 w-3" />
              <span>Click or Space to flip</span>
            </span>
          </div>

          {/* Card Main Body */}
          <div className="my-auto py-6 text-center">
            {isFlipped ? (
              <p className="font-body text-base sm:text-lg font-medium text-text leading-relaxed">
                {currentCard.back}
              </p>
            ) : (
              <h3 className="font-display text-lg sm:text-xl font-bold text-text leading-snug">
                {currentCard.front}
              </h3>
            )}
          </div>

          {/* Card Bottom Helper */}
          <div className="flex items-center justify-center font-mono text-[11px] text-text/60 border-t border-sep-line/40 pt-3">
            <span>{isFlipped ? 'Tap to view question' : 'Tap to reveal answer'}</span>
          </div>
        </Card>
      </div>

      {/* Bottom Navigation Controls */}
      <div className="flex items-center justify-between pt-2">
        <Button
          variant="outline"
          onClick={handlePrev}
          leftIcon={<ChevronLeft className="h-4 w-4" />}
          className="text-xs"
        >
          Previous
        </Button>

        {/* Dots Indicator */}
        <div className="flex items-center gap-1.5">
          {cards.map((_, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => {
                setIsFlipped(false);
                setCurrentIndex(idx);
              }}
              className={cn(
                'h-2 rounded-full transition-all',
                idx === currentIndex
                  ? 'w-6 bg-accent'
                  : 'w-2 bg-sep-line hover:bg-text/40'
              )}
              aria-label={`Go to card ${idx + 1}`}
            />
          ))}
        </div>

        <Button
          variant="outline"
          onClick={handleNext}
          rightIcon={<ChevronRight className="h-4 w-4" />}
          className="text-xs"
        >
          Next
        </Button>
      </div>
    </div>
  );
}

export default UnitFlashcardsView;
