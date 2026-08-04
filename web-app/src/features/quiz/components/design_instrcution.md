Instead of storing only:

selectedAnswer: 2

I recommend using a richer state model:

{
  id: "q1",
  selectedAnswer: 2,
  submitted: true,
  isCorrect: true,
  timeSpent: 18,
  bookmarked: false
}

This separates immutable question data from user interaction state. It makes the component easier to integrate with quiz sessions, progress tracking, analytics, and review mode without mutating the original question object. It's also a better fit for your learning platform, where you'll likely want to persist quiz attempts and generate performance summaries later.