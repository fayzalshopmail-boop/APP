export const registerWebAuthn = async (username: string) => {
  try {
    // 1. Get challenge from backend
    // const response = await fetch('/api/webauthn/register-challenge', ...);
    // const options = await response.json();
    
    // Dummy options for demo
    const publicKey: PublicKeyCredentialCreationOptions = {
      challenge: new Uint8Array(32), // Should come from server
      rp: { name: 'POS System', id: window.location.hostname },
      user: {
        id: new Uint8Array(16),
        name: username,
        displayName: username,
      },
      pubKeyCredParams: [{ alg: -7, type: 'public-key' }],
      authenticatorSelection: {
        authenticatorAttachment: 'platform', // Built-in authenticators like Fingerprint/FaceID
        userVerification: 'required',
      },
      timeout: 60000,
    };

    const credential = await navigator.credentials.create({ publicKey });
    console.log('Registered Credential:', credential);
    return credential;
  } catch (error) {
    console.error('WebAuthn Registration Error:', error);
    throw error;
  }
};

export const loginWebAuthn = async () => {
  try {
    // 1. Get challenge from backend
    const publicKey: PublicKeyCredentialRequestOptions = {
      challenge: new Uint8Array(32), // Should come from server
      rpId: window.location.hostname,
      userVerification: 'required',
      timeout: 60000,
    };

    const credential = await navigator.credentials.get({ publicKey });
    console.log('Login Credential:', credential);
    return credential;
  } catch (error) {
    console.error('WebAuthn Login Error:', error);
    throw error;
  }
};

