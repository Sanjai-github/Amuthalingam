import React, { useRef, useState } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  StyleSheet, 
  KeyboardAvoidingView, 
  Platform,
  Alert,
  ScrollView,
  TouchableWithoutFeedback,
  Keyboard
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import LottieView from 'lottie-react-native';
import { Ionicons } from '@expo/vector-icons';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const animation = useRef<LottieView>(null);
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [countdown, setCountdown] = useState(0);

  const handleResetPassword = () => {
    // Basic validation
    if (!email) {
      Alert.alert('Error', 'Please enter your email address');
      return;
    }

    // Simple email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      Alert.alert('Error', 'Please enter a valid email address');
      return;
    }

    // TODO: Implement Firebase password reset
    setIsLoading(true);
    console.log('Password reset requested for:', email);
    
    // Simulate API call
    setTimeout(() => {
      setIsLoading(false);
      setEmailSent(true);
      startCountdown();
    }, 1500);
  };

  const startCountdown = () => {
    let seconds = 30;
    setCountdown(seconds);
    
    const timer = setInterval(() => {
      seconds--;
      setCountdown(seconds);
      
      if (seconds <= 0) {
        clearInterval(timer);
      }
    }, 1000);
  };

  const handleResendEmail = () => {
    if (countdown > 0) return;
    
    // TODO: Resend password reset email
    startCountdown();
    Alert.alert('Email Sent', 'Password reset link has been resent to your email');
  };

  const handleBackToLogin = () => {
    router.push('/authentication/login');
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <KeyboardAvoidingView 
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContainer}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Animation */}
          <View style={styles.animationContainer}>
            <LottieView
              ref={animation}
              source={require('../../assets/animations/forget-password.json')}
              autoPlay
              loop
              style={styles.animation}
            />
          </View>

          <Text style={styles.title}>Forgot Password?</Text>
          <Text style={styles.subtitle}>
            {emailSent 
              ? 'We\'ve sent a password reset link to your email.' 
              : 'Enter your email address and we\'ll send you a link to reset your password.'}
          </Text>

          {!emailSent ? (
            <>
              {/* Email Input */}
              <View style={styles.inputContainer}>
                <Ionicons name="mail-outline" size={20} color="#666" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Email"
                  placeholderTextColor="#999"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!isLoading}
                />
              </View>

              {/* Reset Password Button */}
              <TouchableOpacity 
                style={[styles.resetButton, isLoading && styles.resetButtonDisabled]}
                onPress={handleResetPassword}
                disabled={isLoading}
              >
                {isLoading ? (
                  <LottieView
                    source={require('../../assets/animations/loading.json')}
                    autoPlay
                    loop
                    style={styles.loadingAnimation}
                  />
                ) : (
                  <LinearGradient
                    colors={['#d88c9a', '#f97316']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.gradient}
                  >
                    <Text style={styles.resetButtonText}>Send Reset Link</Text>
                  </LinearGradient>
                )}
              </TouchableOpacity>
            </>
          ) : (
            <View style={styles.successContainer}>
              <Ionicons name="mail-open-outline" size={60} color="#4CAF50" style={styles.successIcon} />
              <Text style={styles.successText}>
                We've sent a password reset link to:
                <Text style={styles.emailText}> {email}</Text>
              </Text>
              
              <TouchableOpacity 
                style={styles.resendButton}
                onPress={handleResendEmail}
                disabled={countdown > 0}
              >
                <Text style={[styles.resendText, countdown > 0 && styles.resendTextDisabled]}>
                  {countdown > 0 
                    ? `Resend in ${countdown}s` 
                    : 'Resend Email'}
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Back to Login Link */}
          <TouchableOpacity 
            style={styles.backToLoginButton}
            onPress={handleBackToLogin}
          >
            <Ionicons name="arrow-back" size={16} color="#d88c9a" style={styles.backIcon} />
            <Text style={styles.backToLoginText}>Back to Login</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5e9e2',
  },
  scrollContainer: {
    flexGrow: 1,
    padding: 20,
    paddingBottom: 40,
    justifyContent: 'center',
  },
  animationContainer: {
    width: '100%',
    height: 200,
    marginBottom: 10,
  },
  animation: {
    width: '100%',
    height: '100%',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 30,
    paddingHorizontal: 20,
    lineHeight: 22,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 10,
    paddingHorizontal: 15,
    marginBottom: 20,
    height: 50,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    height: '100%',
    color: '#333',
    fontSize: 16,
  },
  resetButton: {
    height: 55,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 20,
  },
  resetButtonDisabled: {
    opacity: 0.7,
  },
  gradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  resetButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  loadingAnimation: {
    width: 80,
    height: 80,
    alignSelf: 'center',
  },
  successContainer: {
    alignItems: 'center',
    marginBottom: 30,
  },
  successIcon: {
    marginBottom: 20,
  },
  successText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
    paddingHorizontal: 20,
    lineHeight: 22,
  },
  emailText: {
    fontWeight: 'bold',
    color: '#333',
  },
  resendButton: {
    padding: 10,
  },
  resendText: {
    color: '#d88c9a',
    fontWeight: '500',
    fontSize: 16,
  },
  resendTextDisabled: {
    color: '#aaa',
  },
  backToLoginButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
  },
  backIcon: {
    marginRight: 5,
  },
  backToLoginText: {
    color: '#d88c9a',
    fontWeight: '500',
    fontSize: 16,
  },
});
