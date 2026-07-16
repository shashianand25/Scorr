import React, { useState, useEffect } from "react";
import { View, Text, Pressable, TextInput } from "react-native";
import { Feather } from "@expo/vector-icons";
import { styles } from "../../styles/shared";

export function Stepper({
  value, min, max, step = 1, onChange, suffix = "", darkMode = true, disabled = false,
}: {
  value: number; min: number; max: number; step?: number;
  onChange: (v: number) => void; suffix?: string; darkMode?: boolean; disabled?: boolean;
}) {
  const [localText, setLocalText] = useState(value.toString());

  useEffect(() => { setLocalText(value.toString()); }, [value]);

  return (
    <View style={[styles.stepperContainer, !darkMode && styles.lightCard]}>
      <Pressable
        onPress={() => onChange(Math.max(min, value - step))}
        disabled={value <= min}
        style={({ pressed }) => [styles.stepperBtn, value <= min && styles.stepperBtnDisabled, pressed && styles.opacityPress]}
      >
        <Feather name="minus" size={14} color={value <= min ? (darkMode ? "#444" : "#ccc") : (darkMode ? "#FFFFFF" : "#0d0f14")} />
      </Pressable>

      <View style={[styles.stepperValueContainer, !darkMode && styles.lightBorder]}>
        {disabled ? (
          <Text style={[styles.stepperValueText, { color: darkMode ? "#FFFFFF" : "#000000" }]}>{value}{suffix}</Text>
        ) : (
          <TextInput
            style={[styles.stepperValueText, { color: darkMode ? "#FFFFFF" : "#000000", minWidth: 40, textAlign: "center", padding: 0 }]}
            value={localText}
            keyboardType="number-pad"
            onChangeText={(text) => {
              setLocalText(text);
              const num = parseInt(text, 10);
              if (!isNaN(num)) onChange(Math.max(min, Math.min(max, num)));
            }}
            onEndEditing={(e) => {
              const text = e.nativeEvent.text;
              if (text === "") { onChange(min); setLocalText(min.toString()); }
            }}
            onBlur={() => {
              if (localText === "" || isNaN(parseInt(localText, 10))) setLocalText(value.toString());
            }}
          />
        )}
      </View>

      <Pressable
        onPress={() => onChange(Math.min(max, value + step))}
        onLongPress={() => onChange(Math.min(max, value + (step * 10)))}
        delayLongPress={300}
        disabled={value >= max || disabled}
        style={({ pressed }) => [styles.stepperBtn, (value >= max || disabled) && styles.stepperBtnDisabled, pressed && styles.opacityPress]}
      >
        <Feather name="plus" size={14} color={value >= max ? (darkMode ? "#444" : "#ccc") : (darkMode ? "#FFFFFF" : "#0d0f14")} />
      </Pressable>
    </View>
  );
}
