import {
  startRegistration,
  startAuthentication,
} from '@simplewebauthn/browser';
import type {
  PublicKeyCredentialCreationOptionsJSON,
  PublicKeyCredentialRequestOptionsJSON,
} from '@simplewebauthn/types';

export async function registerWebAuthn(options: PublicKeyCredentialCreationOptionsJSON) {
  try {
    // Check if platform authenticator is available
    const available = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
    if (!available) {
      throw new Error('Your device does not support biometric authentication. Please ensure Touch ID is set up on your device.');
    }

    const credential = await startRegistration(options);
    return credential;
  } catch (error: any) {
    console.error('WebAuthn registration error:', error);
    
    // Provide user-friendly error messages
    if (error.name === 'NotAllowedError') {
      throw new Error('Biometric authentication was denied. Please allow access to Touch ID.');
    } else if (error.name === 'SecurityError') {
      throw new Error('Unable to access Touch ID. Please ensure it is enabled in your device settings.');
    } else if (error.message?.includes('authenticator')) {
      throw new Error('Touch ID is not set up on this device. Please set it up in your device settings.');
    }
    
    throw new Error('Failed to register biometric authentication. Please try again.');
  }
}

export async function authenticateWebAuthn(options: PublicKeyCredentialRequestOptionsJSON) {
  try {
    // Check if platform authenticator is available
    const available = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
    if (!available) {
      throw new Error('Your device does not support biometric authentication. Please ensure Touch ID is set up on your device.');
    }

    const credential = await startAuthentication(options);
    return credential;
  } catch (error: any) {
    console.error('WebAuthn authentication error:', error);
    
    // Provide user-friendly error messages
    if (error.name === 'NotAllowedError') {
      throw new Error('Biometric authentication was denied. Please try again or use password.');
    } else if (error.name === 'SecurityError') {
      throw new Error('Unable to access Touch ID. Please ensure it is enabled in your device settings.');
    } else if (error.message?.includes('authenticator')) {
      throw new Error('Touch ID is not available. Please use password authentication.');
    }
    
    throw new Error('Failed to authenticate with biometrics. Please try again or use password.');
  }
}