import { Stack } from "expo-router";
import { useEffect } from "react";
import { useFonts } from "expo-font";
import * as SplashScreen from "expo-splash-screen";
import "../global.css";
import { AuthProvider } from "../Firebase/AuthContext";
import AuthGuard from "../components/AuthGuard";
import { PaperProvider } from "react-native-paper";

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync();


export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    // You can add custom fonts here if needed
  });

  useEffect(() => {
    // Hide splash screen when fonts are loaded
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <PaperProvider>
      <AuthProvider>
        <AuthGuard>
          <Stack 
            screenOptions={{
              headerShown: false,
              animation: "fade",
              animationDuration: 50,
              gestureEnabled: true,
              gestureDirection: "horizontal",
              presentation: "card"
            }}
          />
        </AuthGuard>
      </AuthProvider>
    </PaperProvider>
  );
}
