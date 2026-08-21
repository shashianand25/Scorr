/**
 * authStyles — barrel re-export for backward compatibility.
 * Actual styles are split into auth/formStyles.ts and auth/screenStyles.ts.
 */
import { StyleSheet } from "react-native";
import { formStyles } from "./auth/formStyles";
import { screenStyles } from "./auth/screenStyles";

export { formStyles, screenStyles };

/** Combined export — preserves all existing `authStyles.X` references. */
export const authStyles = { ...formStyles, ...screenStyles } as ReturnType<typeof StyleSheet.create>;
