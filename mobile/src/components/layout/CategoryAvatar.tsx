import React from "react";
import { View } from "react-native";
import { Ionicons, FontAwesome6, Feather } from "@expo/vector-icons";
import { getCategoryIconDetails } from "../../utils/quiz";
import { styles } from "../../styles/shared";

export function renderCategoryAvatar(category: string, settingsDarkMode: boolean) {
  const details = getCategoryIconDetails(category);
  const bg = settingsDarkMode ? details.bg : details.bg.replace("0.1", "0.08");
  const border = settingsDarkMode ? details.border : details.border.replace("0.25", "0.2");
  const color = details.color;
  const iconName = details.iconName;
  const iconType = details.iconType;

  return (
    <View style={[styles.quizAvatar, { backgroundColor: bg, borderColor: border, borderWidth: 1.5, borderRadius: 14 }]}>
      {iconType === "Ionicons" ? (
        <Ionicons name={iconName as any} size={20} color={color} />
      ) : iconType === "FontAwesome6" ? (
        <FontAwesome6 name={iconName as any} size={18} color={color} />
      ) : (
        <Feather name={iconName as any} size={18} color={color} />
      )}
    </View>
  );
}
