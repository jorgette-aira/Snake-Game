import { Orbitron_900Black, useFonts } from "@expo-google-fonts/orbitron";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { ActivityIndicator, View } from "react-native";

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    CyberFont: Orbitron_900Black,
  });

  if (!fontsLoaded) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: "#030712",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <ActivityIndicator size="large" color="#06d474" />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: "#030712" }}>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: "#030712" },
        }}
      />
    </View>
  );
}
