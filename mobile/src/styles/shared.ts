import { StyleSheet } from "react-native";
import { layoutStyles } from "./layoutStyles";
import { sessionStyles } from "./sessionStyles";
import { uiStyles } from "./uiStyles";
import { authStyles } from "./authStyles";

/**
 * Shared styles barrel — merged from domain-split style files.
 * Import from this file to get all styles as before: import { styles } from "../styles/shared"
 */
export const styles = {
  ...layoutStyles,
  ...sessionStyles,
  ...uiStyles,
  ...authStyles,
} as ReturnType<typeof StyleSheet.create>;
