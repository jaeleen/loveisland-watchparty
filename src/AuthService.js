import {
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
} from "firebase/auth";
import { auth } from "./firebaseConfig";

/**
 * Opens a Google OAuth popup and resolves with the authenticated user and
 * the short-lived Google OAuth access token.
 *
 * Firebase errors are structured objects — we normalise them before throwing
 * so callers always receive { code, message, email, credential } regardless
 * of which layer (network, SDK, Google) produced the failure.
 *
 * Codes callers should handle gracefully without surfacing an error to the
 * user (they represent intentional dismissal, not failure):
 *   - auth/popup-closed-by-user
 *   - auth/cancelled-popup-request
 *
 * @returns {Promise<{ user: import("firebase/auth").User, accessToken: string }>}
 */
export async function signInWithGoogle() {
  const provider = new GoogleAuthProvider();

  // Request the two standard OAuth scopes — profile covers displayName + photoURL.
  provider.addScope("profile");
  provider.addScope("email");

  // Force the Google account picker on every sign-in so users with multiple
  // accounts can choose, and so sign-in always feels explicit.
  provider.setCustomParameters({ prompt: "select_account" });

  try {
    const result     = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);

    return {
      user:        result.user,
      accessToken: credential.accessToken,
    };
  } catch (error) {
    // credentialFromError extracts the partial credential from failed attempts,
    // which is needed if you want to recover/retry via linkWithCredential later.
    const credential = GoogleAuthProvider.credentialFromError(error);

    throw {
      code:       error.code,
      message:    error.message,
      email:      error.customData?.email ?? null,
      credential,
    };
  }
}

/**
 * Signs the current user out of Firebase Auth and clears all local SDK state.
 * The onAuthStateChanged listener in your component will fire with null
 * immediately after this resolves, so no manual state reset is required there.
 *
 * @returns {Promise<void>}
 */
export async function signOutUser() {
  try {
    await signOut(auth);
  } catch (error) {
    throw {
      code:    error.code,
      message: error.message,
    };
  }
}
