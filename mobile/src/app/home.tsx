import React, { useEffect } from "react";
import { useRouter } from "expo-router";
import { View, ActivityIndicator } from "react-native";

export default function HomeRouteRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/");
  }, [router]);

  return (
    <View style={{ flex: 1, backgroundColor: "#0B0F1E", alignItems: "center", justifyContent: "center" }}>
      <ActivityIndicator color="#6366f1" size="large" />
    </View>
  );
}
