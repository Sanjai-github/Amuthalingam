import React, { useEffect } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../Firebase/AuthContext';
import { authService } from '../../Firebase';

export default function LogoutScreen() {
  const router = useRouter();

  useEffect(() => {
    const performLogout = async () => {
      try {
        // Use authService.logoutUser instead of logout from useAuth
        const { success, error } = await authService.logoutUser();
        
        if (error) {
          console.error('Logout error:', error);
        }
        
        // Redirect to login screen after logout
        router.replace('/authentication/login');
      } catch (error) {
        console.error('Unexpected logout error:', error);
        // Still redirect to login even if there's an error
        router.replace('/authentication/login');
      }
    };

    performLogout();
  }, [router]);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#d88c9a" />
      <Text style={styles.text}>Logging out...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5e9e2',
  },
  text: {
    marginTop: 20,
    fontSize: 18,
    color: '#333',
  },
});
