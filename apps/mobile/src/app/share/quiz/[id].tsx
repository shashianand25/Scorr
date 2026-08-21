import { useEffect } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { View, ActivityIndicator } from "react-native";

/**
 * This screen is the landing point for deep links of the form:
 *   scorr://share/quiz/<id>
 *   https://scorrapp.com/share/quiz/<id>   (Android App Links / iOS Universal Links)
 *
 * It stores the quiz ID in AsyncStorage then immediately redirects to the home
 * screen, where the existing pendingSharedQuizId Linking useEffect will detect it
 * and trigger the quiz import flow.
 */
export default function SharedQuizDeepLink() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  useEffect(() => {
    const redirect = async () => {
      if (id) {
        await AsyncStorage.setItem("pending_shared_quiz_id", String(id));
      }
      router.replace("/");
    };
    redirect();
  }, [id, router]);

  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#0b1021" }}>
      <ActivityIndicator color="#6366f1" size="large" />
    </View>
  );
}
