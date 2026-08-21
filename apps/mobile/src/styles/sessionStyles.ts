/**
 * sessionStyles — barrel re-export for backward compatibility.
 * Actual styles are split into session/quizStyles.ts and session/mediaStyles.ts.
 */
import { StyleSheet } from "react-native";
import { quizStyles } from "./session/quizStyles";
import { mediaStyles } from "./session/mediaStyles";

export { quizStyles, mediaStyles };

/** Combined export — preserves all existing `sessionStyles.X` references. */
export const sessionStyles = { ...quizStyles, ...mediaStyles } as ReturnType<typeof StyleSheet.create>;
