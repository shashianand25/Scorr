import React from "react";
import { View, Text } from "react-native";
import type { HomeScreenProps } from "../types/HomeScreenProps";

export function AddTab({ p }: { p: HomeScreenProps }) {
  return (
    <View style={{ flex: 1 }}>
      <Text style={{ color: "#fff" }}>Add Tab</Text>
    </View>
  );
}
