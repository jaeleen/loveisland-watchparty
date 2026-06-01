import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { onAuthStateChanged } from "firebase/auth";

const bannerContainer = {
  animate: { transition: { staggerChildren: 0.04 } },
};

const letterAnimation = {
  initial: { opacity: 0, scale: 0.3, y: 10 },
  animate: {
    opacity: 1, scale: 1, y: 0,
    transition: { type: "spring", stiffness: 220, damping: 12 },
  },
};
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "../firebaseConfig";
import { signInWithGoogle, signOutUser } from "../AuthService";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function randomFourDigit() {
  return String(Math.floor(1000 + Math.random() * 9000));
}

async function allocateUniqueCode(maxAttempts = 5) {
  for (let i = 0; i < maxAttempts; i++) {
    const code = randomFourDigit();
    const snap = await getDoc(doc(db, "parties", code));
    if (!snap.exists()) return code;
  }
  throw new Error("Could not allocate a unique code. Please try again.");
}

// ─── Toast ────────────────────────────────────────────────────────────────────

function useToast() {
  const [msg, setMsg] = useState("");
  const [visible, setVisible] = useState(false);
  const timer = useRef(null);

  function show(text, ms = 3200) {
    clearTimeout(timer.current);
    setMsg(text);
    setVisible(true);
    timer.current = setTimeout(() => setVisible(false), ms);
  }

  return { msg, visible, show };
}

// ─── Legal Modal ──────────────────────────────────────────────────────────────

const LEGAL_CONTENT = {
  terms: {
    title: "Terms of Use",
    badge: "📋",
    sections: [
      {
        heading: "1. Nature of This Application",
        body: "Love Island Fan Hub is a 100% non-commercial, fan-made companion app built for entertainment and educational portfolio purposes only. No paid subscription, in-app purchase, or revenue of any kind is generated from this application.",
      },
      {
        heading: "2. Acceptable Use",
        body: "By accessing this app you agree to use it solely for personal, non-commercial entertainment. You must not use this app to harass, impersonate, or harm other users. Watch party chat messages must be respectful and free of hate speech, explicit content, or personal attacks.",
      },
      {
        heading: "3. User-Generated Content",
        body: "Any predictions, display names, or chat messages you submit remain your own. By submitting content you grant this app a non-exclusive licence to display it to other users within your party session. You are solely responsible for the content you post.",
      },
      {
        heading: "4. Data & Authentication",
        body: "Sign-in is handled securely via Google OAuth. We store only the data necessary to run your session: your display name, profile photo URL, party picks, and chat messages. No payment or sensitive personal data is collected. See our Privacy Policy for full details.",
      },
      {
        heading: "5. No Warranty",
        body: "This app is provided \"as is\" without any warranty of any kind. The developer makes no guarantee of uptime, accuracy, or fitness for any particular purpose. The app may be modified, suspended, or discontinued at any time without notice.",
      },
      {
        heading: "6. Limitation of Liability",
        body: "To the fullest extent permitted by law, the developer shall not be liable for any indirect, incidental, or consequential damages arising from your use of this application.",
      },
      {
        heading: "7. Changes to These Terms",
        body: "These terms may be updated at any time. Continued use of the app after changes are posted constitutes acceptance of the revised terms.",
      },
    ],
  },
  privacy: {
    title: "Privacy Policy",
    badge: "🔒",
    sections: [
      {
        heading: "What We Collect",
        body: "When you sign in with Google we receive your public profile information: your display name and profile photo URL. You also provide a display name of your choosing. We store your watch party picks (Favourite Islander, First Dumped prediction, couplings) and any chat messages you send within your party.",
      },
      {
        heading: "How We Use Your Data",
        body: "Your data is used exclusively to power the app experience: identifying you within your party, displaying your avatar to other party members, showing community rankings, and enabling real-time chat. We do not use your data for advertising, profiling, or any commercial purpose.",
      },
      {
        heading: "Data Storage",
        body: "All data is stored in Google Firebase (Firestore) and is subject to Google's privacy and security standards. Your display name and picks are also cached in your browser's localStorage to improve load speed and offline resilience.",
      },
      {
        heading: "Third-Party Services",
        body: "This app uses Google Firebase for authentication and database services, and Google OAuth for sign-in. These services are governed by Google's own Privacy Policy and Terms of Service. We do not integrate any advertising networks, analytics trackers, or data brokers.",
      },
      {
        heading: "Data Retention & Deletion",
        body: "Your data remains stored until you request deletion. To request deletion of your account data, contact the developer at jaeleen.pg@gmail.com. We will remove your records from Firestore within 30 days of a verified request.",
      },
      {
        heading: "Children's Privacy",
        body: "This app is intended for users aged 13 and over. We do not knowingly collect personal information from children under 13. If you believe a child has provided us with personal data, please contact us immediately.",
      },
      {
        heading: "Contact",
        body: "For any privacy-related questions or data deletion requests, contact: jaeleen.pg@gmail.com.",
      },
    ],
  },
  fairuse: {
    title: "Fair Use & Copyright Disclaimer",
    badge: "🛡️",
    sections: [
      {
        heading: "Non-Affiliation Statement",
        body: "This application is not affiliated with, endorsed by, sponsored by, or in any way officially connected with ITV Studios, Peacock, Universal Television, or the Love Island franchise. The official Love Island website and all related properties are the exclusive property of their respective owners.",
      },
      {
        heading: "Fan-Made Parody & Fair Use",
        body: "This app is a fan-made parody concept created strictly for non-commercial, educational, and entertainment portfolio purposes. Under Section 107 of the U.S. Copyright Act and equivalent provisions in other jurisdictions, commentary, criticism, parody, and educational uses may qualify as fair use. This application does not reproduce, distribute, or monetise any original copyrighted content from the Love Island franchise.",
      },
      {
        heading: "Trademark Acknowledgement",
        body: "\"Love Island\" is a registered trademark of ITV Studios. Use of the name within this fan app is purely descriptive and referential — it is intended to identify the subject of the fan commentary, not to suggest any affiliation with or endorsement by the trademark owner.",
      },
      {
        heading: "No Commercial Benefit",
        body: "No revenue, subscription fees, donations, or any form of commercial benefit is derived from this application. It exists solely as a personal portfolio project to demonstrate frontend development and UX design skills.",
      },
      {
        heading: "Original Assets",
        body: "All UI design, component architecture, code, and original written content within this app was created independently by the developer. Islander profile images used for demonstration are sourced from publicly available promotional materials. No claim of ownership is made over any third-party intellectual property.",
      },
      {
        heading: "Takedown Policy",
        body: "If you are a rights holder and believe any content in this application infringes your intellectual property, please contact jaeleen.pg@gmail.com with details of your claim. We will respond promptly and remove any infringing material upon verification.",
      },
    ],
  },
};

function LegalModal({ type, onClose }) {
  const content = LEGAL_CONTENT[type];
  if (!content) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4"
      style={{ background: "rgba(0,0,0,0.72)", backdropFilter: "blur(6px)" }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ y: "100%", opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: "100%", opacity: 0 }}
        transition={{ type: "spring", damping: 30, stiffness: 320 }}
        className="w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl flex flex-col"
        style={{ background: "white", maxHeight: "88vh" }}
      >
        {/* Header */}
        <div className="flex-shrink-0 px-5 pt-5 pb-4 border-b" style={{ borderColor: "rgba(0,0,0,0.07)" }}>
          <div className="w-10 h-1 rounded-full mx-auto mb-4 sm:hidden" style={{ background: "#E2E8F0" }} />
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="text-xl">{content.badge}</span>
              <h2 style={{ fontFamily: "'Playfair Display', serif", fontWeight: 600, fontSize: 17, color: "#0F172A" }}>
                {content.title}
              </h2>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-slate-100 transition-colors"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M1 1l12 12M13 1L1 13" stroke="#94A3B8" strokeWidth="1.8" strokeLinecap="round"/>
              </svg>
            </button>
          </div>
          <p style={{ fontSize: 10.5, color: "#94A3B8", marginTop: 4 }}>
            Last updated: May 2026 · Love Island Fan Hub
          </p>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5">
          {content.sections.map(({ heading, body }) => (
            <div key={heading}>
              <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: "#0891B2", marginBottom: 6 }}>
                {heading}
              </p>
              <p style={{ fontSize: 13, color: "#475569", lineHeight: 1.7 }}>
                {body}
              </p>
            </div>
          ))}
        </div>

        {/* Footer CTA */}
        <div className="flex-shrink-0 px-5 py-4 border-t" style={{ borderColor: "rgba(0,0,0,0.07)" }}>
          <button
            onClick={onClose}
            className="w-full py-3 rounded-xl font-bold text-sm transition-all active:scale-[0.98]"
            style={{ background: "linear-gradient(135deg,#0891B2,#22D3EE)", color: "white", border: "none", fontFamily: "'Josefin Sans',sans-serif", letterSpacing: "0.06em" }}
          >
            Got it — Close
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function Lobby({ onComplete }) {
  // Auth
  const [user, setUser]           = useState(null);
  const [authReady, setAuthReady] = useState(false);
  const [signingIn, setSigningIn] = useState(false);
  const [authError, setAuthError] = useState(null);

  // Legal compliance gate
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [termsShakeKey, setTermsShakeKey] = useState(0);
  const [termsError,    setTermsError]    = useState(false);
  const [legalModal,    setLegalModal]    = useState(null); // "terms" | "privacy" | "fairuse" | null

  // Multi-step flow
  // step 1 = sign in  |  step 2 = display name + party code  |  step 3 = success
  const [step, setStep] = useState(1);

  // Step 2 fields
  const [displayName, setDisplayName] = useState("");
  const [partyCodeInput, setPartyCodeInput] = useState("");
  const [nameError, setNameError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [profileLoaded, setProfileLoaded] = useState(false); // true when name was pre-filled

  // Step 3 result
  const [resultCode, setResultCode] = useState(null);
  const [resultHost, setResultHost] = useState(null);

  const nameRef = useRef(null);
  const toast   = useToast();

  // ── Auth state listener ────────────────────────────────────────────────────
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      setAuthReady(true);
      if (firebaseUser && step === 1) {
        setStep(2);

        // Try localStorage first (instant, works offline)
        const localName = localStorage.getItem(`li_name_${firebaseUser.uid}`);
        if (localName) {
          setDisplayName(localName);
          setProfileLoaded(true);
        }

        // Also try Firestore (may have a more recent name from another device)
        try {
          const snap = await getDoc(doc(db, "users", firebaseUser.uid));
          if (snap.exists()) {
            const data = snap.data();
            if (data.displayName) {
              setDisplayName(data.displayName);
              setProfileLoaded(true);
            }
          }
        } catch {
          // Firestore unavailable — localStorage fallback already applied above
        }
      }
    });
    return () => unsub();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Google sign-in ─────────────────────────────────────────────────────────
  async function handleSignIn() {
    if (!agreedToTerms) {
      setTermsShakeKey(k => k + 1);
      setTermsError(true);
      return;
    }
    setTermsError(false);
    setSigningIn(true);
    setAuthError(null);
    try {
      await signInWithGoogle();
      // onAuthStateChanged fires → sets `user` → we move to step 2
      setStep(2);
    } catch (err) {
      const dismissed = ["auth/popup-closed-by-user", "auth/cancelled-popup-request"];
      if (!dismissed.includes(err.code)) {
        setAuthError(err.message ?? "Sign-in failed. Please try again.");
      }
    } finally {
      setSigningIn(false);
    }
  }

  // ── Step 2 submit — create or join ─────────────────────────────────────────
  async function handleEnter(e) {
    e.preventDefault();

    const name = displayName.trim();
    const code = partyCodeInput.trim().toUpperCase();

    if (!name) {
      setNameError("Please enter a display name.");
      nameRef.current?.focus();
      return;
    }
    if (name.length < 2) {
      setNameError("Display name must be at least 2 characters.");
      nameRef.current?.focus();
      return;
    }

    setSubmitting(true);
    setSubmitError(null);

    try {
      if (code) {
        // ── JOIN an existing party ──
        if (!/^\d{4}$/.test(code)) {
          setSubmitError("Party code must be exactly 4 digits.");
          setSubmitting(false);
          return;
        }
        const snap = await getDoc(doc(db, "parties", code));
        if (!snap.exists() || snap.data().status !== "active") {
          setSubmitError("No active party found with that code. Double-check with your host.");
          setSubmitting(false);
          return;
        }
        setResultCode(code);
        setResultHost(snap.data().hostName);
      } else {
        // ── CREATE a new party ──
        const newCode = await allocateUniqueCode();
        await setDoc(doc(db, "parties", newCode), {
          hostId:       user.uid,
          hostName:     name,
          hostPhotoURL: user.photoURL,
          createdAt:    serverTimestamp(),
          status:       "active",
          members:      [user.uid],
        });
        setResultCode(newCode);
        setResultHost(name);
      }

      setStep(3);
      setTimeout(() => toast.show(`Welcome to the villa, ${name}! 🏝️`), 280);

      // Persist display name for next login
      if (user?.uid) {
        // localStorage — instant, works even if Firestore fails
        try { localStorage.setItem(`li_name_${user.uid}`, name); } catch { /* ignore */ }

        // Firestore — syncs across devices
        setDoc(doc(db, "users", user.uid), {
          displayName: name,
          photoURL: user.photoURL ?? null,
        }, { merge: true }).catch(err => console.error("Firestore write failed:", err));
      }
    } catch (err) {
      setSubmitError(err.message ?? "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  // ── Sign out ───────────────────────────────────────────────────────────────
  async function handleSignOut() {
    try {
      await signOutUser();
      setStep(1);
      setDisplayName("");
      setPartyCodeInput("");
      setResultCode(null);
      setResultHost(null);
      setAuthError(null);
      setSubmitError(null);
    } catch (err) {
      console.error("Sign-out error:", err);
    }
  }

  // ── Progress bar width ──────────────────────────────────────────────────────
  const progress = step === 1 ? "50%" : step === 2 ? "75%" : "100%";

  // ── Loading (resolving initial auth state) ─────────────────────────────────
  if (!authReady) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#FAF4E8" }}>
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-cyan-600 border-t-transparent animate-spin" />
          <p className="text-xs text-slate-400 tracking-widest uppercase">Loading</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* ── Layout — mobile-first column, desktop splits 60/40 ── */}
      <div className="flex flex-col md:flex-row w-full min-h-screen relative">

        {/* Mobile-only full-screen background image (hidden on desktop) */}
        <div className="md:hidden absolute inset-0 z-0">
          <img
            src="/villa-island.jpg"
            alt=""
            className="w-full h-full object-cover"
            style={{ objectPosition: "center 25%" }}
          />
          {/* Dark gradient so the white card pops cleanly */}
          <div
            className="absolute inset-0"
            style={{ background: "linear-gradient(to bottom, rgba(5,18,35,0.28) 0%, rgba(5,18,35,0.52) 60%, rgba(5,18,35,0.7) 100%)" }}
          />
        </div>

        {/* ══════════════════════════════════════════
            LEFT PANEL — hidden on mobile, 60% on desktop
        ══════════════════════════════════════════ */}
        <div className="hidden md:block md:w-3/5 md:h-screen relative overflow-hidden flex-shrink-0">
          {/* Photo fills the panel */}
          <img
            src="/villa-island.jpg"
            alt="Love Island villa on a floating island"
            className="absolute inset-0 w-full h-full object-cover"
            style={{ objectPosition: "center 20%" }}
          />

          {/* Gradient overlay — light at top, darkens toward bottom for text legibility */}
          <div
            className="absolute inset-0"
            style={{
              background: "linear-gradient(to bottom, rgba(5,18,35,0.08) 0%, transparent 30%, rgba(5,18,35,0.22) 65%, rgba(5,18,35,0.72) 100%)"
            }}
          />

          {/* Brand + tagline */}
          <div className="beach-overlay">

            {/* Logo — letter-by-letter spring entrance */}
            <motion.h1
              variants={bannerContainer}
              initial="initial"
              animate="animate"
              className="font-['Josefin_Sans',sans-serif] text-7xl leading-none flex items-baseline select-none"
              style={{ textShadow:"0 1px 10px rgba(0,0,0,0.4)" }}
            >
              <span className="font-bold flex tracking-[-0.05em]" style={{ color:"white" }}>
                {"love".split("").map((char, i) => (
                  <motion.span key={`desk-love-${i}`} variants={letterAnimation}>{char}</motion.span>
                ))}
              </span>
              <span className="font-light ml-1 flex tracking-[-0.05em]" style={{ color:"rgba(255,255,255,0.75)" }}>
                {"Island".split("").map((char, i) => (
                  <motion.span key={`desk-island-${i}`} variants={letterAnimation}>{char}</motion.span>
                ))}
              </span>
              <motion.span
                initial={{ opacity:0, scale:0 }}
                animate={{ opacity:1, scale:1 }}
                transition={{ delay:0.6, type:"spring", stiffness:220, damping:12 }}
                className="text-sm align-super ml-1 font-semibold"
                style={{ color:"#FFD14A" }}
              >
                Fan
              </motion.span>
            </motion.h1>

            {/* Tagline — pinned to the bottom, fades in after the logo settles */}
            <div className="absolute bottom-32 left-0 right-0 px-11">
              <motion.h2
                initial={{ opacity:0, y:14 }}
                animate={{ opacity:1, y:0 }}
                transition={{ delay:0.75, duration:0.55, ease:"easeOut" }}
                style={{
                  fontFamily:"'Playfair Display', serif",
                  fontStyle:"italic", fontWeight:400,
                  fontSize:26, color:"white", lineHeight:1.18,
                  marginBottom:14,
                  textShadow:"0 2px 28px rgba(0,0,0,0.5)"
                }}
              >
                Your ticket to the villa.
              </motion.h2>
              <motion.p
                initial={{ opacity:0, y:8 }}
                animate={{ opacity:1, y:0 }}
                transition={{ delay:0.95, duration:0.45, ease:"easeOut" }}
                style={{
                  fontSize:8, fontWeight:300,
                  color:"rgba(255,255,255,0.9)",
                  letterSpacing:"0.2px", lineHeight:1.6,
                  textShadow:"0 1px 12px rgba(0,0,0,0.4)"
                }}
              >
                The ultimate companion app for Canadian watch parties.
              </motion.p>
            </div>

          </div>
        </div>

        {/* ══════════════════════════════════════════
            RIGHT PANEL — full width mobile, 40% desktop
        ══════════════════════════════════════════ */}
        <div
          className="w-full md:w-2/5 relative z-10 flex flex-col items-center justify-center px-5 py-12 md:px-8 min-h-screen flex-shrink-0 md:bg-[#FAF4E8]"
        >
          {/* Progress bar — pinned to the very top of this panel */}
          <div className="absolute top-0 left-0 right-0 h-[3px]" style={{ background:"#F0E6D0" }}>
            <div
              className="h-full rounded-r-sm progress-fill"
              style={{ width: progress, background:"linear-gradient(to right, #0891B2, #22D3EE)" }}
            />
          </div>

          {/* Mobile brand header — only visible when left panel is hidden */}
          <div className="md:hidden flex flex-col items-center gap-2 mb-8 mt-2">
            <motion.h1
              variants={bannerContainer}
              initial="initial"
              animate="animate"
              className="font-['Josefin_Sans',sans-serif] text-5xl font-normal leading-none flex items-center select-none"
              style={{ textShadow: "0 1px 10px rgba(0,0,0,0.4)" }}
            >
              <span className="font-bold flex tracking-[-0.05em]" style={{ color: "white" }}>
                {"love".split("").map((char, i) => (
                  <motion.span key={`mob-love-${i}`} variants={letterAnimation}>{char}</motion.span>
                ))}
              </span>
              <span className="font-light ml-1 flex tracking-[-0.05em]" style={{ color: "rgba(255,255,255,0.75)" }}>
                {"Island".split("").map((char, i) => (
                  <motion.span key={`mob-island-${i}`} variants={letterAnimation}>{char}</motion.span>
                ))}
              </span>
              <motion.span
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.6, type: "spring" }}
                className="text-sm align-super ml-1 font-semibold"
                style={{ color: "#FFD14A" }}
              >
                Fan
              </motion.span>
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8 }}
              className="text-xs tracking-widest uppercase font-medium mt-1 text-white/70"
            >
              Your ticket to the villa 🌴
            </motion.p>
          </div>

          {/* Auth card — full width on mobile up to max 372px */}
          <div
            className="w-full relative z-10 p-5 md:p-9"
            style={{
              maxWidth:372,
              background:"white",
              borderRadius:20,
              border:"1px solid rgba(226,232,240,0.9)",
              boxShadow:"0 2px 8px rgba(0,0,0,0.04), 0 8px 32px rgba(0,0,0,0.06)"
            }}
          >
            {/* ── STEP 1: Sign in ── */}
            {step === 1 && (
              <div className="step-in">
                <p className="text-[10.5px] md:text-[10.5px]" style={{ fontWeight:600, letterSpacing:"1.6px", textTransform:"uppercase", color:"#0891B2", marginBottom:8 }}>
                  Step 1 of 2
                </p>
                <h2 className="text-xl md:text-2xl" style={{ fontFamily:"'Playfair Display', serif", fontWeight:600, color:"#0F172A", marginBottom:5, lineHeight:1.3 }}>
                  Welcome.
                </h2>
                <p className="text-sm md:text-[13.5px]" style={{ color:"#475569", lineHeight:1.55, marginBottom:26 }}>
                  Sign in to create or join a watch party.
                </p>

                {/* Google */}
                <button
                  onClick={handleSignIn}
                  disabled={signingIn}
                  style={{
                    display:"flex", alignItems:"center", justifyContent:"center", gap:10,
                    width:"100%", padding:"12px 16px", borderRadius:10,
                    border:"1.5px solid #E2E8F0", background:"white",
                    fontSize:13.5, fontWeight:500, color:"#0F172A",
                    cursor:"pointer", marginBottom:9,
                    opacity: signingIn ? 0.65 : 1,
                    transition:"border-color .18s, box-shadow .18s, transform .18s"
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background="#F8FAFC"; e.currentTarget.style.transform="translateY(-1px)"; e.currentTarget.style.boxShadow="0 4px 14px rgba(0,0,0,0.07)"; }}
                  onMouseLeave={e => { e.currentTarget.style.background="white"; e.currentTarget.style.transform="none"; e.currentTarget.style.boxShadow="none"; }}
                >
                  {signingIn ? <span className="spin-dark" /> : <GoogleLogo />}
                  {signingIn ? "Opening Google…" : "Continue with Google"}
                </button>

                {/* Apple (coming soon) */}
                <button
                  disabled
                  style={{
                    display:"flex", alignItems:"center", justifyContent:"center", gap:10,
                    width:"100%", padding:"12px 16px", borderRadius:10,
                    border:"1.5px solid #E2E8F0", background:"white",
                    fontSize:13.5, fontWeight:500, color:"#94A3B8",
                    cursor:"not-allowed", marginBottom:0, opacity:.55
                  }}
                >
                  <AppleLogo />
                  Continue with Apple
                </button>

                {/* ── Legal compliance gate ── */}
                <div style={{ marginTop:18 }}>

                  {/* Warning notification */}
                  <AnimatePresence>
                    {termsError && !agreedToTerms && (
                      <motion.div
                        key="terms-warning"
                        initial={{ opacity:0, y:-6, scale:0.97 }}
                        animate={{ opacity:1, y:0,  scale:1   }}
                        exit={{    opacity:0, y:-4, scale:0.97 }}
                        transition={{ duration:0.2 }}
                        role="alert"
                        style={{
                          display:"flex", alignItems:"flex-start", gap:8,
                          padding:"10px 12px", borderRadius:10, marginBottom:10,
                          background:"#FFF1F2", border:"1px solid #FDA4AF",
                        }}
                      >
                        <span style={{ fontSize:14, flexShrink:0, marginTop:1 }}>⚠️</span>
                        <p style={{ fontSize:11.5, fontWeight:600, color:"#BE123C", lineHeight:1.45, margin:0 }}>
                          Please accept the Terms, Privacy Policy, and Fair Use Disclaimer before signing in.
                        </p>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Shake + border wrapper */}
                  <motion.div
                    key={termsShakeKey}
                    animate={termsShakeKey > 0 ? { x:[0,-9,9,-7,7,-4,4,0] } : {}}
                    transition={{ duration:0.45, ease:"easeInOut" }}
                    style={{
                      padding:"12px 14px", borderRadius:12,
                      background: agreedToTerms ? "#F0FDF4" : "#F8FAFC",
                      border: `1.5px solid ${agreedToTerms ? "#86EFAC" : termsError ? "#FDA4AF" : "#E2E8F0"}`,
                      transition:"background 0.2s, border-color 0.2s",
                    }}
                  >
                    <div style={{ display:"flex", alignItems:"flex-start", gap:10 }}>
                      {/* Custom checkbox */}
                      <div
                        role="checkbox"
                        aria-checked={agreedToTerms}
                        onClick={() => { setAgreedToTerms(v => !v); setTermsError(false); }}
                        style={{
                          width:18, height:18, borderRadius:5, flexShrink:0, marginTop:1,
                          border:`2px solid ${agreedToTerms ? "#0891B2" : termsError ? "#FDA4AF" : "#CBD5E1"}`,
                          background: agreedToTerms ? "#0891B2" : "white",
                          display:"flex", alignItems:"center", justifyContent:"center",
                          cursor:"pointer", transition:"all 0.15s",
                        }}
                      >
                        {agreedToTerms && (
                          <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                            <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        )}
                      </div>
                      <p
                        style={{ fontSize:11.5, color:"#475569", lineHeight:1.55, margin:0, cursor:"pointer" }}
                        onClick={() => { setAgreedToTerms(v => !v); setTermsError(false); }}
                      >
                        I agree to the{" "}
                        <a href="#" onClick={e => { e.preventDefault(); e.stopPropagation(); setLegalModal("terms"); }} style={{ color:"#0891B2", fontWeight:600, textDecoration:"underline", textUnderlineOffset:2 }}>Terms</a>,{" "}
                        <a href="#" onClick={e => { e.preventDefault(); e.stopPropagation(); setLegalModal("privacy"); }} style={{ color:"#0891B2", fontWeight:600, textDecoration:"underline", textUnderlineOffset:2 }}>Privacy Policy</a>, and{" "}
                        <a href="#" onClick={e => { e.preventDefault(); e.stopPropagation(); setLegalModal("fairuse"); }} style={{ color:"#0891B2", fontWeight:600, textDecoration:"underline", textUnderlineOffset:2 }}>Fair Use Disclaimers</a>.
                      </p>
                    </div>
                  </motion.div>

                  {/* Copyright Shield Disclaimer */}
                  <div style={{
                    marginTop:10, padding:"11px 13px", borderRadius:10,
                    background:"linear-gradient(135deg,#F0F9FF,#F5F3FF)",
                    border:"1px solid #BAE6FD",
                  }}>
                    <p style={{ fontSize:10, color:"#475569", lineHeight:1.65, margin:0 }}>
                      <span style={{
                        display:"block", marginBottom:4,
                        fontSize:9, fontWeight:700, fontStyle:"normal",
                        letterSpacing:"0.1em", textTransform:"uppercase", color:"#0891B2",
                      }}>
                        🛡️ Fair Use Disclaimer
                      </span>
                      <span style={{ fontStyle:"italic" }}>
                        This application is a 100% non-commercial, fan-made parody concept created strictly for educational and entertainment portfolio purposes. It is not affiliated with, endorsed by, or associated with ITV Studios, Peacock, or the official Love Island franchise. All trademarks, show titles, and assets belong to their respective copyright owners.
                      </span>
                    </p>
                  </div>
                </div>

                {authError && (
                  <p role="alert" style={{ fontSize:11.5, color:"#F43F5E", textAlign:"center", marginTop:14 }}>
                    {authError}
                  </p>
                )}
              </div>
            )}

            {/* ── STEP 2: Display name + party code ── */}
            {step === 2 && (
              <div className="step-in">
                {/* Back */}
                <button
                  onClick={() => { handleSignOut(); }}
                  style={{ display:"flex", alignItems:"center", gap:5, background:"none", border:"none", fontSize:12.5, color:"#94A3B8", cursor:"pointer", padding:0, marginBottom:18 }}
                >
                  <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
                    <path d="M9 3L5 7.5L9 12" stroke="#94A3B8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  Back
                </button>

                <p className="text-[10.5px]" style={{ fontWeight:600, letterSpacing:"1.6px", textTransform:"uppercase", color:"#0891B2", marginBottom:8 }}>
                  Step 2 of 2
                </p>
                <h2 className="text-xl md:text-2xl" style={{ fontFamily:"'Playfair Display', serif", fontWeight:600, color:"#0F172A", marginBottom:5, lineHeight:1.3 }}>
                  {profileLoaded ? `Welcome back, ${displayName}! 🌴` : "Almost there."}
                </h2>
                <p className="text-sm md:text-[13.5px]" style={{ color:"#475569", lineHeight:1.55, marginBottom:26 }}>
                  {profileLoaded ? "Your display name was saved. Just pick a party and you're in." : "Set up your profile and join the party."}
                </p>

                <form onSubmit={handleEnter} noValidate>
                  {/* Display name */}
                  <div style={{ marginBottom:13 }}>
                    <label style={{ display:"block", fontSize:11.5, fontWeight:600, color:"#475569", marginBottom:6 }}>
                      Display Name
                    </label>
                    <input
                      ref={nameRef}
                      type="text"
                      maxLength={30}
                      placeholder="e.g. IslandVibesTO"
                      value={displayName}
                      onChange={e => { setDisplayName(e.target.value); setNameError(null); }}
                      style={{
                        width:"100%", padding:"11.5px 13px", borderRadius:9,
                        border: nameError ? "1.5px solid #FB7185" : "1.5px solid #E2E8F0",
                        boxShadow: nameError ? "0 0 0 3px rgba(251,113,133,0.12)" : "none",
                        fontSize:13.5, color:"#0F172A", outline:"none",
                        fontFamily:"'Inter', sans-serif"
                      }}
                      onFocus={e => { if (!nameError) e.target.style.border="1.5px solid #0891B2"; e.target.style.boxShadow="0 0 0 3px rgba(8,145,178,0.1)"; }}
                      onBlur={e  => { if (!nameError) { e.target.style.border="1.5px solid #E2E8F0"; e.target.style.boxShadow="none"; } }}
                    />
                    {nameError && <p style={{ fontSize:11.5, color:"#F43F5E", marginTop:5 }}>{nameError}</p>}
                  </div>

                  {/* Party code */}
                  <div style={{ marginBottom:20 }}>
                    <label style={{ display:"flex", alignItems:"center", gap:6, fontSize:11.5, fontWeight:600, color:"#475569", marginBottom:6 }}>
                      Watch Party Code
                      <span style={{ fontSize:9.5, fontWeight:500, color:"#94A3B8", background:"#FAF4E8", padding:"2px 7px", borderRadius:20 }}>
                        Optional
                      </span>
                    </label>
                    <input
                      type="text"
                      maxLength={4}
                      placeholder="Leave blank to create a new party"
                      value={partyCodeInput}
                      onChange={e => { setPartyCodeInput(e.target.value.replace(/\D/g, "")); setSubmitError(null); }}
                      style={{
                        width:"100%", padding:"11.5px 13px", borderRadius:9,
                        border:"1.5px solid #E2E8F0",
                        fontSize:13.5, color:"#0F172A", outline:"none",
                        fontFamily:"'Inter', sans-serif",
                        letterSpacing: partyCodeInput ? "0.3em" : "normal"
                      }}
                      onFocus={e => { e.target.style.border="1.5px solid #0891B2"; e.target.style.boxShadow="0 0 0 3px rgba(8,145,178,0.1)"; }}
                      onBlur={e  => { e.target.style.border="1.5px solid #E2E8F0"; e.target.style.boxShadow="none"; }}
                    />
                  </div>

                  {submitError && (
                    <p role="alert" style={{ fontSize:11.5, color:"#F43F5E", marginBottom:12 }}>{submitError}</p>
                  )}

                  <button
                    type="submit"
                    disabled={submitting}
                    style={{
                      display:"flex", alignItems:"center", justifyContent:"center", gap:8,
                      width:"100%", padding:"13.5px 16px", borderRadius:10,
                      border:"none", cursor: submitting ? "not-allowed" : "pointer",
                      background:"linear-gradient(135deg, #0891B2 0%, #0A7898 100%)",
                      color:"white", fontSize:14, fontWeight:600,
                      fontFamily:"'Inter', sans-serif", letterSpacing:"0.3px",
                      opacity: submitting ? 0.7 : 1,
                      transition:"transform .18s, box-shadow .18s"
                    }}
                    onMouseEnter={e => { if (!submitting) { e.currentTarget.style.transform="translateY(-1px)"; e.currentTarget.style.boxShadow="0 6px 22px rgba(8,145,178,0.38)"; }}}
                    onMouseLeave={e => { e.currentTarget.style.transform="none"; e.currentTarget.style.boxShadow="none"; }}
                  >
                    {submitting ? <span className="spin" /> : null}
                    {submitting ? "One sec…" : partyCodeInput ? "Join the Villa" : "Enter the Villa"}
                  </button>
                </form>
              </div>
            )}

            {/* ── STEP 3: Success ── */}
            {step === 3 && (
              <div className="step-in" style={{ textAlign:"center", padding:"16px 0 8px" }}>
                <div style={{
                  width:62, height:62, borderRadius:"50%",
                  background:"linear-gradient(135deg, #0891B2, #22D3EE)",
                  display:"flex", alignItems:"center", justifyContent:"center",
                  margin:"0 auto 18px",
                  boxShadow:"0 6px 20px rgba(8,145,178,0.3)"
                }}>
                  <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
                    <path d="M8 14L12 18L20 10" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>

                <h2 className="text-xl md:text-2xl" style={{ fontFamily:"'Playfair Display', serif", fontWeight:600, color:"#0F172A", marginBottom:6, lineHeight:1.3 }}>
                  Welcome, {displayName}! 🌴
                </h2>

                {partyCodeInput ? (
                  <p style={{ fontSize:13.5, color:"#475569", lineHeight:1.55 }}>
                    You've joined <strong>{resultHost}'s</strong> party.
                  </p>
                ) : (
                  <>
                    <p style={{ fontSize:13.5, color:"#475569", lineHeight:1.55, marginBottom:16 }}>
                      Your party is live. Share this code with your guests:
                    </p>
                    <div style={{
                      background:"#EFF9FC", border:"1px solid #BAE6FD",
                      borderRadius:12, padding:"16px 20px"
                    }}>
                      <p style={{ fontSize:10, fontWeight:600, letterSpacing:"0.2em", textTransform:"uppercase", color:"#0891B2", marginBottom:6 }}>
                        Party Code
                      </p>
                      <p className="text-4xl md:text-5xl" style={{ fontWeight:900, letterSpacing:"0.25em", color:"#0E7490", userSelect:"all", fontVariantNumeric:"tabular-nums" }}>
                        {resultCode}
                      </p>
                    </div>
                  </>
                )}

                {onComplete && (
                  <button
                    onClick={() => onComplete({
                      partyCode:   resultCode,
                      displayName,
                      uid:         user?.uid,
                      photoURL:    user?.photoURL ?? null,
                    })}
                    style={{
                      display:"flex", alignItems:"center", justifyContent:"center", gap:8,
                      width:"100%", padding:"13px 16px", borderRadius:10, border:"none",
                      marginTop:16, cursor:"pointer",
                      background:"linear-gradient(135deg, #0891B2 0%, #0A7898 100%)",
                      color:"white", fontSize:14, fontWeight:600,
                      fontFamily:"'Inter', sans-serif",
                    }}
                  >
                    Enter the Dashboard →
                  </button>
                )}
                <button
                  onClick={handleSignOut}
                  style={{ marginTop:12, fontSize:12, color:"#94A3B8", background:"none", border:"none", cursor:"pointer" }}
                >
                  Sign out
                </button>
              </div>
            )}
          </div>

          {/* Terms */}
          {step !== 3 && (
            <p style={{ fontSize:11, textAlign:"center", marginTop:18, lineHeight:1.65, maxWidth:320 }}
              className="text-slate-400 md:text-slate-400" >
              <span className="md:hidden" style={{ color:"rgba(255,255,255,0.55)" }}>
                By continuing you agree to our{" "}
                <a href="#" onClick={e => { e.preventDefault(); setLegalModal("terms"); }} style={{ color:"rgba(255,255,255,0.8)", textDecoration:"underline", textUnderlineOffset:2 }}>Terms</a>
                {" "}and{" "}
                <a href="#" onClick={e => { e.preventDefault(); setLegalModal("privacy"); }} style={{ color:"rgba(255,255,255,0.8)", textDecoration:"underline", textUnderlineOffset:2 }}>Privacy Policy</a>
              </span>
              <span className="hidden md:inline" style={{ color:"#94A3B8" }}>
                By continuing you agree to our{" "}
                <a href="#" onClick={e => { e.preventDefault(); setLegalModal("terms"); }} style={{ color:"#0891B2", textDecoration:"underline", textUnderlineOffset:2 }}>Terms of Service</a>
                {" "}and{" "}
                <a href="#" onClick={e => { e.preventDefault(); setLegalModal("privacy"); }} style={{ color:"#0891B2", textDecoration:"underline", textUnderlineOffset:2 }}>Privacy Policy</a>
              </span>
            </p>
          )}
        </div>
      </div>

      {/* ── Toast ── */}
      <div className={`toast ${toast.visible ? "show" : ""}`}>
        <div style={{ width:20, height:20, borderRadius:"50%", background:"#22C55E", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
          <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
            <path d="M2 5.5L4.5 8L9 3" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        <span>{toast.msg}</span>
      </div>

      {/* ── Legal modals ── */}
      <AnimatePresence>
        {legalModal && (
          <LegalModal key={legalModal} type={legalModal} onClose={() => setLegalModal(null)} />
        )}
      </AnimatePresence>
    </>
  );
}

// ─── Icons ────────────────────────────────────────────────────────────────────

function GoogleLogo() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <path d="M17.64 9.2a10.34 10.34 0 0 0-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92C16.66 14.07 17.64 11.76 17.64 9.2z" fill="#4285F4"/>
      <path d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.34A9 9 0 0 0 9 18z" fill="#34A853"/>
      <path d="M3.97 10.72A5.41 5.41 0 0 1 3.68 9c0-.6.1-1.18.29-1.72V4.94H.96A9 9 0 0 0 0 9c0 1.45.35 2.82.96 4.06l3.01-2.34z" fill="#FBBC05"/>
      <path d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .96 4.94L3.97 7.28C4.68 5.16 6.66 3.58 9 3.58z" fill="#EA4335"/>
    </svg>
  );
}

function AppleLogo() {
  return (
    <svg width="15" height="18" viewBox="0 0 15 18" fill="none" aria-hidden="true">
      <path d="M12.2 9.55c-.02-1.96 1.6-2.9 1.67-2.94-.92-1.34-2.34-1.52-2.84-1.54-1.2-.13-2.37.71-2.98.71-.62 0-1.57-.69-2.58-.67-1.32.02-2.55.77-3.23 1.95C.73 9.3 1.82 13.1 3.42 15.16c.8 1.06 1.73 2.23 2.95 2.19 1.18-.05 1.63-.76 3.06-.76 1.43 0 1.84.76 3.08.74 1.28-.02 2.09-1.08 2.88-2.14.9-1.23 1.27-2.42 1.29-2.48-.03-.01-2.47-.94-2.48-3.16zM10.26 3.28c.66-.8 1.1-1.91.98-3.01-.95.04-2.1.63-2.78 1.43-.61.7-1.14 1.82-1 2.9 1.06.08 2.13-.54 2.8-1.32z" fill="#94A3B8"/>
    </svg>
  );
}
