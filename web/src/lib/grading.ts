/**
 * Grade calculation utilities for quiz results.
 * Extracted from quiz/[id]/page.tsx for reusability and smaller file size.
 */

export interface GradeResult {
  letter: string;
  color: string;
  label: string;
}

/** Maps a percentage score (0–100) to a letter grade with colour and label. */
export function calculateGrade(percentage: number): GradeResult {
  if (percentage >= 95) return { letter: "A+", color: "#34d399", label: "Mastery! Exceptional understanding." };
  if (percentage >= 85) return { letter: "A", color: "#10b981", label: "Great job! Strong mastery." };
  if (percentage >= 75) return { letter: "B", color: "#60a5fa", label: "Good effort! A little review will help." };
  if (percentage >= 60) return { letter: "C", color: "#f59e0b", label: "Passing, but needs more practice." };
  return { letter: "F", color: "#ef4444", label: "Needs review. Try flashcards or retake!" };
}
