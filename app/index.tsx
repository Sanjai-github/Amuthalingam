import { Text, View, TouchableOpacity, StyleSheet, Dimensions, Animated } from "react-native";
import { useRouter } from "expo-router";
import { useEffect, useRef } from "react";
import LottieView from "lottie-react-native";
import { LinearGradient } from "expo-linear-gradient";
import "../global.css";

export default function SplashScreen() {
  const router = useRouter();
  const animation = useRef<LottieView>(null);
  const buttonAnimation = useRef(new Animated.Value(0)).current;
  const textOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Auto play the animation when component mounts
    if (animation.current) {
      animation.current.play();
    }
    
    // Animate the text and button with a sequence
    Animated.sequence([
      Animated.delay(1000), // Wait for logo animation to start
      Animated.timing(textOpacity, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true
      }),
      Animated.timing(buttonAnimation, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true
      })
    ]).start();
  }, []);

  const handleGetStarted = () => {
    // Navigate to home screen
    router.push("/tabs/home");
  };

  return (
    <LinearGradient
      colors={["#f5e9e2", "#e8c4c4", "#d88c9a"]}
      className="flex-1 justify-center items-center"
    >
      <View className="flex-1 justify-center items-center w-full" style={{ paddingBottom: 50 }}>
        {/* Animated Logo */}
        <View className="w-80 h-80 mb-10">
          <LottieView
            ref={animation}
            source={require("../assets/animations/splash_screen.json")}
            autoPlay
            loop
            style={styles.animation}
          />
        </View>

        {/* App Name */}
        <Animated.Text 
          className="text-5xl font-bold mb-16" 
          style={[{ opacity: textOpacity, color: '#4a4e69' }]}
        >
          Amuthalingam
        </Animated.Text>

        {/* Get Started Button with animation */}
        <Animated.View
          style={{
            opacity: buttonAnimation,
            transform: [{
              translateY: buttonAnimation.interpolate({
                inputRange: [0, 1],
                outputRange: [50, 0]
              })
            }]
          }}
        >
          <TouchableOpacity
            onPress={handleGetStarted}
            className="bg-white rounded-full px-10 py-4 shadow-lg"
            activeOpacity={0.7}
            style={{
              elevation: 8,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.3,
              shadowRadius: 6,
            }}
          >
            <Text className="text-xl font-semibold text-[#d88c9a]">Get Started</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  animation: {
    width: "100%",
    height: "100%",
  },
});
