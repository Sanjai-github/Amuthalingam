import React, { useRef, useState, useEffect } from 'react';
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
  ActivityIndicator
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useLocalSearchParams } from 'expo-router';
import LottieView from 'lottie-react-native';
import { Ionicons } from '@expo/vector-icons';
import { authService, biometricAuth } from '../../Firebase';
import { User } from 'firebase/auth';

export default function LoginScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const animation = useRef<LottieView>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [biometricSupported, setBiometricSupported] = useState(false);
  const [biometricEnabled, setBiometricEnabled] = useState(false);

  // Extract redirect and enableBiometric params if present
  const redirectTo = params.redirect as string | undefined;
  const shouldEnableBiometric = params.enableBiometric === 'true';

  // Check if biometrics are available and enabled
  useEffect(() => {
    const checkBiometrics = async () => {
      try {
        const biometricStatus = await biometricAuth.isBiometricAvailable() as {
          available: boolean;
          hasFaceId: boolean;
          hasFingerprint: boolean;
          canUse: boolean;
        };
        setBiometricSupported(biometricStatus.canUse);
        
        if (biometricStatus.canUse) {
          const isEnabled = await biometricAuth.isBiometricLoginEnabled();
          setBiometricEnabled(isEnabled);
        }
      } catch (error) {
        console.error('Error checking biometrics:', error);
      }
    };
    
    checkBiometrics();
    
    // If we have biometric support and the login page was opened from settings to enable biometrics,
    // attempt a biometric verification after login
    if (biometricSupported && shouldEnableBiometric) {
      // Show an info message that biometric login will be set up after successful login
      Alert.alert(
        'Biometric Setup',
        'After successful login, you will be prompted to set up biometric authentication.'
      );
    }
  }, [biometricSupported, shouldEnableBiometric]);

  const handleBiometricLogin = async () => {
    try {
      setIsLoading(true);
      await biometricAuth.authenticateWithBiometrics();
      // If biometric authentication is successful, navigate to home
      router.replace('/tabs/home');
    } catch (error) {
      console.error('Biometric authentication error:', error);
      Alert.alert('Authentication Error', 'Biometric authentication failed. Please try again or use password.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }
    
    setIsLoading(true);
    
    try {
      const { user, error } = await authService.loginUser(email, password);
      
      if (error || !user) {
        Alert.alert('Login Error', error || 'Authentication failed');
        setIsLoading(false);
        return;
      }
      
      console.log('User logged in successfully:', user.uid);
      // Navigate to home after successful login
      // If coming from settings to enable biometric, or if user hasn't enabled it yet
      if (biometricSupported && (!biometricEnabled || shouldEnableBiometric)) {
        try {
          if (shouldEnableBiometric) {
            // User came from settings specifically to enable biometrics
            await biometricAuth.enableBiometricLogin(email, password);
            setBiometricEnabled(true);
            Alert.alert(
              'Biometric Login Enabled',
              'You can now use your fingerprint or face ID to log in.',
              [{ text: 'OK', onPress: () => {
                // Navigate back to the screen they came from (or home)
                if (redirectTo) {
                  router.replace(redirectTo as any);
                } else {
                  router.replace('/tabs/home');
                }
              }}]
            );
          } else {
            // Ask if they want to enable it during normal login
            Alert.alert(
              'Enable Biometric Login',
              'Would you like to enable biometric login for faster access next time?',
              [
                { text: 'Not Now', style: 'cancel' },
                { 
                  text: 'Enable', 
                  onPress: async () => {
                    try {
                      await biometricAuth.enableBiometricLogin(email, password);
                      Alert.alert('Success', 'Biometric login has been enabled.');
                    } catch (error) {
                      console.error('Error enabling biometric login:', error);
                      Alert.alert('Error', 'Could not enable biometric login. Please try again later.');
                    }
                  }
                }
              ]
            );
          }
        } catch (error) {
          console.error('Error handling biometric setup:', error);
        }
      }
      
      router.replace('/tabs/home');
    } catch (error) {
      console.error('Login error:', error);
      Alert.alert('Login Error', 'An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = () => {
    router.push('/authentication/forgot-password');
  };

  const handleSignUp = () => {
    // Navigate to sign up screen
    router.push('/authentication/register');
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView 
        contentContainerStyle={styles.scrollContainer}
        keyboardShouldPersistTaps="handled"
      >
        {/* Animation */}
        <View style={styles.animationContainer}>
          <LottieView
            ref={animation}
            source={require('../../assets/animations/login.json')}
            autoPlay
            loop
            style={styles.animation}
          />
        </View>

        <Text style={styles.title}>Welcome Back</Text>
        <Text style={styles.subtitle}>Sign in to continue</Text>

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
          />
        </View>

        {/* Password Input */}
        <View style={styles.inputContainer}>
          <Ionicons name="lock-closed-outline" size={20} color="#666" style={styles.inputIcon} />
          <TextInput
            style={[styles.input, styles.passwordInput]}
            placeholder="Password"
            placeholderTextColor="#999"
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPassword}
          />
          <TouchableOpacity 
            onPress={() => setShowPassword(!showPassword)}
            style={styles.eyeIcon}
          >
            <Ionicons 
              name={showPassword ? 'eye-off-outline' : 'eye-outline'} 
              size={22} 
              color="#666" 
            />
          </TouchableOpacity>
        </View>

        {/* Forgot Password */}
        <TouchableOpacity 
          onPress={handleForgotPassword}
          style={styles.forgotPassword}
        >
          <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
        </TouchableOpacity>

        {/* Login Button */}
        <TouchableOpacity 
          style={[styles.loginButton, isLoading && styles.loginButtonDisabled]}
          onPress={handleLogin}
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
              <Text style={styles.loginButtonText}>Sign In</Text>
            </LinearGradient>
          )}
        </TouchableOpacity>
        


        {/* Biometric Login Button */}
        {biometricSupported && biometricEnabled && (
          <TouchableOpacity 
            style={styles.biometricButton}
            onPress={handleBiometricLogin}
            disabled={isLoading}
          >
            <Ionicons name="finger-print-outline" size={28} color="#f97316" />
            <Text style={styles.biometricButtonText}>Login with Biometrics</Text>
          </TouchableOpacity>
        )}

        {/* Sign Up Link */}
        <View style={styles.signUpContainer}>
          <Text style={styles.signUpText}>Don't have an account? </Text>
          <TouchableOpacity onPress={handleSignUp}>
            <Text style={styles.signUpLink}>Sign Up</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
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
    justifyContent: 'center',
  },
  animationContainer: {
    width: '100%',
    height: 250,
    marginBottom: 10,
    alignItems: 'center',
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
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 30,
  },

  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 10,
    paddingHorizontal: 15,
    marginBottom: 15,
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
  passwordInput: {
    paddingRight: 40, // Space for the eye icon
  },
  eyeIcon: {
    position: 'absolute',
    right: 15,
    padding: 10,
  },
  forgotPassword: {
    alignSelf: 'flex-end',
    marginBottom: 25,
  },
  forgotPasswordText: {
    color: '#d88c9a',
    fontWeight: '500',
  },
  loginButton: {
    height: 55,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 20,
  },
  loginButtonDisabled: {
    opacity: 0.7,
  },
  gradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loginButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  loadingAnimation: {
    width: 80,
    height: 80,
    alignSelf: 'center',
  },
  signUpContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 10,
  },
  signUpText: {
    color: '#666',
  },
  signUpLink: {
    color: '#d88c9a',
    fontWeight: 'bold',
    marginLeft: 5,
  },
  biometricButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    marginBottom: 15,
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#f97316',
  },
  biometricButtonText: {
    marginLeft: 10,
    color: '#f97316',
    fontSize: 16,
    fontWeight: '500',
  },
});
