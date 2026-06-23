import React from "react";
import { Pressable, View } from "react-native";
import { styles } from "../../styles/shared";

export function ToggleSwitch({ checked, onChange, disabled, darkMode = true }: { checked: boolean; onChange: (v: boolean) => void; disabled?: boolean; darkMode?: boolean }) {
  return (
    <Pressable
      onPress={() => !disabled && onChange(!checked)}
      disabled={disabled}
      style={[
        styles.switchContainer,
        checked ? { backgroundColor: "#00e5a0" } : { backgroundColor: darkMode ? "rgba(255, 255, 255, 0.12)" : "rgba(0, 0, 0, 0.08)" },
        !darkMode && { borderWidth: 1, borderColor: "rgba(0, 0, 0, 0.12)" },
        disabled && { opacity: 0.4 }
      ]}
    >
      <View
        style={[
          styles.switchCircle,
          !darkMode && {
            backgroundColor: checked ? "#ffffff" : "#f0f0f0",
            shadowColor: "#000000",
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.15,
            shadowRadius: 1.5,
            elevation: 2,
            borderWidth: 0.5,
            borderColor: "rgba(0, 0, 0, 0.15)"
          },
          checked ? { transform: [{ translateX: 18 }] } : { transform: [{ translateX: 0 }] }
        ]}
      />
    </Pressable>
  );
}
