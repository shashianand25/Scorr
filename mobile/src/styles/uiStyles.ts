/**
 * uiStyles — barrel re-export for backward compatibility.
 * Actual styles are split into ui/buttonStyles.ts and ui/cardStyles.ts.
 */
import { StyleSheet } from "react-native";
import { buttonStyles } from "./ui/buttonStyles";
import { cardStyles } from "./ui/cardStyles";

export { buttonStyles, cardStyles };

/** Combined export — preserves all existing `uiStyles.X` references. */
export const uiStyles = { ...buttonStyles, ...cardStyles } as ReturnType<typeof StyleSheet.create>;
