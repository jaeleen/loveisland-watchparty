import { useState } from "react";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "./firebaseConfig";
import Lobby      from "./components/Lobby";
import Matchmaker from "./components/Matchmaker";
import Dashboard  from "./components/Dashboard";

export default function App() {
  const [screen,                setScreen]                = useState("lobby");
  const [partyInfo,             setPartyInfo]             = useState(null);
  const [matchmakerPredictions, setMatchmakerPredictions] = useState(null);
  const [checkingProfile,       setCheckingProfile]       = useState(false);

  // Called when Lobby step-3 "Enter the Dashboard" is tapped.
  // Before showing Matchmaker we check whether this user already saved predictions.
  async function handleLobbyComplete(info) {
    setPartyInfo(info);

    if (!info.uid) {
      // No auth (dev mode) — always show Matchmaker
      setScreen("matchmaker");
      return;
    }

    setCheckingProfile(true);
    try {
      // Race the Firestore read against a 5 s timeout so a slow network
      // doesn't leave the user stuck on the loading screen.
      const timeout = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("timeout")), 5000)
      );
      const snap = await Promise.race([
        getDoc(doc(db, "users", info.uid)),
        timeout,
      ]);
      if (snap.exists() && snap.data().predictions) {
        setMatchmakerPredictions(snap.data().predictions);
        setScreen("dashboard");
        return;
      }
    } catch {
      // Firestore unreachable or timed out — fall through to localStorage check
    } finally {
      setCheckingProfile(false);
    }

    // localStorage fallback — works even when Firestore is unavailable
    try {
      const saved = localStorage.getItem(`li_predictions_${info.uid}`);
      if (saved) {
        const predictions = JSON.parse(saved);
        setMatchmakerPredictions(predictions);
        setScreen("dashboard");
        return;
      }
    } catch { /* corrupt data — ignore and show Matchmaker */ }

    setScreen("matchmaker");
  }

  // Called when the Matchmaker "Enter the Villa" button is tapped on first run.
  function handleMatchmakerComplete(predictions) {
    setMatchmakerPredictions(predictions);
    setScreen("dashboard");                      // navigate immediately
    persistPredictions(partyInfo, predictions);  // save in background — don't block
  }

  // Called from inside the Dashboard whenever the user edits predictions.
  function handleUpdatePredictions(predictions) {
    setMatchmakerPredictions(predictions);
    persistPredictions(partyInfo, predictions);  // save in background
  }

  function handleSignOut() {
    setPartyInfo(null);
    setMatchmakerPredictions(null);
    setScreen("lobby");
  }

  if (checkingProfile) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#FAF4E8" }}>
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-cyan-600 border-t-transparent animate-spin" />
          <p className="text-xs text-slate-400 tracking-widest uppercase">Loading your profile</p>
        </div>
      </div>
    );
  }

  if (screen === "lobby")
    return <Lobby onComplete={handleLobbyComplete} />;

  if (screen === "matchmaker")
    return <Matchmaker partyInfo={partyInfo} onComplete={handleMatchmakerComplete} />;

  return (
    <Dashboard
      {...partyInfo}
      onSignOut={handleSignOut}
      matchmakerPredictions={matchmakerPredictions}
      onUpdatePredictions={handleUpdatePredictions}
    />
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function persistPredictions(partyInfo, predictions) {
  if (!partyInfo?.uid) return;

  // Always save to localStorage first — works even if Firestore is unavailable
  try {
    localStorage.setItem(`li_predictions_${partyInfo.uid}`, JSON.stringify(predictions));
  } catch { /* storage quota exceeded — ignore */ }

  try {
    await setDoc(
      doc(db, "users", partyInfo.uid),
      {
        displayName: partyInfo.displayName ?? null,
        photoURL:    partyInfo.photoURL    ?? null,
        predictions,
        predictionsUpdatedAt: new Date(),
      },
      { merge: true },
    );
  } catch (err) {
    console.error("Failed to save predictions to Firestore:", err);
  }
}
