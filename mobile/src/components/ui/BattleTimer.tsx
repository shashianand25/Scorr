import React, { useState, useEffect } from "react";
import { Text } from "react-native";

export const BattleTimer = React.memo(({ startTime, settingsDarkMode }: { startTime: number; settingsDarkMode: boolean }) => {
  const [elapsed, setElapsed] = useState(Date.now() - startTime);

  useEffect(() => {
    const interval = setInterval(() => setElapsed(Date.now() - startTime), 1000);
    return () => clearInterval(interval);
  }, [startTime]);

  const totalSecs = Math.floor(elapsed / 1000);
  const m = Math.floor(totalSecs / 60);
  const s = totalSecs % 60;
  const timeString = `${m}:${s < 10 ? "0" : ""}${s}`;

  return (
    <Text style={{ fontSize: 10, fontWeight: "800", color: settingsDarkMode ? "#52525b" : "#94a3b8", letterSpacing: 1 }}>
      ⏱️ {timeString}
    </Text>
  );
});
