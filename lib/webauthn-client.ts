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
    const credential = await startRegistration(options);
    return credential;
  } catch (error) {
    console.error('WebAuthn registration error:', error);
    throw new Error('Failed to register WebAuthn credential');
  }
}

export async function authenticateWebAuthn(options: PublicKeyCredentialRequestOptionsJSON) {
  try {
    const credential = await startAuthentication(options);
    return credential;
  } catch (error) {
    console.error('WebAuthn authentication error:', error);
    throw new Error('Failed to authenticate with WebAuthn');
  }
}