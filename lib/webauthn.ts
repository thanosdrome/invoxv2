// ====================================
// lib/webauthn.ts - WebAuthn Helper Functions
// ====================================
import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
  VerifiedRegistrationResponse,
  VerifiedAuthenticationResponse,
} from '@simplewebauthn/server';
import type {
  RegistrationResponseJSON,
  AuthenticationResponseJSON,
} from '@simplewebauthn/types';

const rpName = process.env.RP_NAME || 'Invox v2';
const rpID = process.env.RP_ID || 'localhost';
const origin = process.env.ORIGIN || 'http://localhost:3000';

interface StoredChallenge {
  challenge: string;
  expiresAt: number;
}

// In-memory challenge storage (for production, use Redis or DB)
const challengeStore = new Map<string, StoredChallenge>();

export async function generateRegistrationChallenge(
  userId: string,
  userName: string,
  userEmail: string
) {
  const options = await generateRegistrationOptions({
    rpName,
    rpID,
    userID: userId,
    userName: userEmail,
    userDisplayName: userName,
    attestationType: 'none',
    authenticatorSelection: {
      residentKey: 'preferred',
      userVerification: 'preferred',
      authenticatorAttachment: 'platform', // Prefer platform authenticators like Touch ID
    },
    supportedAlgorithmIDs: [-7, -257], // Support both ES256 and RS256
  });

  // Store challenge with 60s expiration
  challengeStore.set(userId, {
    challenge: options.challenge,
    expiresAt: Date.now() + 60000,
  });

  return options;
}

export async function verifyRegistration(
  userId: string,
  response: RegistrationResponseJSON
): Promise<VerifiedRegistrationResponse> {
  const stored = challengeStore.get(userId);
  
  if (!stored || Date.now() > stored.expiresAt) {
    throw new Error('Challenge expired or not found');
  }

  const verification = await verifyRegistrationResponse({
    response,
    expectedChallenge: stored.challenge,
    expectedOrigin: origin,
    expectedRPID: rpID,
  });

  if (verification.verified) {
    challengeStore.delete(userId);
  }

  return verification;
}

export async function generateAuthenticationChallenge(userId: string) {
  const options = await generateAuthenticationOptions({
    rpID,
    userVerification: 'preferred',
  });

  challengeStore.set(userId, {
    challenge: options.challenge,
    expiresAt: Date.now() + 60000,
  });

  return options;
}

export async function verifyAuthentication(
  userId: string,
  response: AuthenticationResponseJSON,
  credentialPublicKey: Uint8Array,
  credentialID: Uint8Array,
  counter: number
): Promise<VerifiedAuthenticationResponse> {
  const stored = challengeStore.get(userId);
  
  if (!stored || Date.now() > stored.expiresAt) {
    throw new Error('Challenge expired or not found');
  }

  const verification = await verifyAuthenticationResponse({
    response,
    expectedChallenge: stored.challenge,
    expectedOrigin: origin,
    expectedRPID: rpID,
    authenticator: {
      credentialPublicKey,
      credentialID,
      counter,
    },
  });

  if (verification.verified) {
    challengeStore.delete(userId);
  }

  return verification;
}