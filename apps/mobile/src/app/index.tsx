import React from "react";
import { HomeLayout } from "../screens/HomeLayout";
import { useHomeScreenState } from "../hooks/useHomeScreenState";

/**
 * HomeScreen — Main entry point for the Mobile application.
 * Fully decomposed into modular sub-hooks and screens (<500 LOC).
 */
export default function HomeScreen() {
  const p = useHomeScreenState();
  return <HomeLayout p={p} />;
}
