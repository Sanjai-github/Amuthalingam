// TypeScript declarations for biometric authentication
declare module "expo-local-authentication" {
  export interface BiometricAvailability {
    available: boolean;
    hasFaceId: boolean;
    hasFingerprint: boolean;
    canUse: boolean;
  }
}

// Add declarations for our biometric auth service
declare namespace BiometricAuth {
  interface BiometricAvailability {
    available: boolean;
    hasFaceId: boolean;
    hasFingerprint: boolean;
    canUse: boolean;
  }
}
