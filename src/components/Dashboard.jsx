import { useState, useEffect, useRef } from "react";
import {
  doc, collection, addDoc, setDoc, updateDoc,
  onSnapshot, query, where, orderBy, serverTimestamp,
} from "firebase/firestore";
import { db } from "../firebaseConfig";
import { motion, AnimatePresence } from "framer-motion";
import confetti from "canvas-confetti";
import {
  Home, Users, Heart, MessageCircle,
  Send, X, Zap, Check, Clock,
  Sparkles, RotateCcw, ChevronRight,
  Radio, LogOut, Edit2,
} from "lucide-react";

// ─── Design tokens ────────────────────────────────────────────────────────────
const C = {
  ocean:      "#0A84FF",
  coral:      "#FF5A5F",
  pink:       "#de69c0",
  sand:       "/dashboardimg.jpg",
  card:       "#FFFFFF",
  cardBorder: "rgba(255,255,255,0.55)",
  cardShadow: "0 4px 24px rgba(10,60,100,0.22), 0 1px 6px rgba(10,60,100,0.12)",
  ink:        "#1C1C1E",
  slate:      "#64748B",
  muted:      "#94A3B8",
  green:      "#22C55E",
  amber:      "#F59E0B",
};

const PALETTE = ["#FF5A5F","#22C55E","#F59E0B","#8B5CF6","#de69c0","#0A84FF"];
function uidColor(uid = "") {
  let h = 0;
  for (const ch of uid) h = ch.charCodeAt(0) + ((h << 5) - h);
  return PALETTE[Math.abs(h) % PALETTE.length];
}

// ─── Static data ──────────────────────────────────────────────────────────────
const ISLANDERS_INIT = [
  { id:"1",  name:"Aniya",   image:"/aniya.jpeg",   status:"single", partnerId:null, compat:0 },
  { id:"2",  name:"Beatriz", image:"/beatriz.jpeg", status:"single", partnerId:null, compat:0 },
  { id:"3",  name:"Bryce",   image:"/bryce.jpeg",   status:"single", partnerId:null, compat:0 },
  { id:"4",  name:"Gabriel", image:"/gabriel.jpeg", status:"single", partnerId:null, compat:0 },
  { id:"5",  name:"KC",      image:"/kc.jpeg",      status:"single", partnerId:null, compat:0 },
  { id:"6",  name:"Kenzie",  image:"/kenzie.jpeg",  status:"single", partnerId:null, compat:0 },
  { id:"7",  name:"Melanie", image:"/melanie.jpeg", status:"single", partnerId:null, compat:0 },
  { id:"8",  name:"Sean",    image:"/sean.jpeg",    status:"single", partnerId:null, compat:0 },
  { id:"9",  name:"Sincere", image:"/sincere.jpeg", status:"single", partnerId:null, compat:0 },
  { id:"10", name:"Trinity", image:"/trinity.jpeg", status:"single", partnerId:null, compat:0 },
  { id:"11", name:"Vasana",  image:"/vasana.jpeg",  status:"single", partnerId:null, compat:0 },
  { id:"12", name:"Zach",    image:"/zach.jpeg",    status:"single", partnerId:null, compat:0 },
];

const CHALLENGES_INIT = [
  { id:"1", emoji:"📱", title:"Like & Share",         diff:"Easy",   pts:50,  status:"available", desc:"Like a Love Island Canada post on your social media accounts." },
  { id:"2", emoji:"💬", title:"Text a Friend",        diff:"Easy",   pts:50,  status:"available", desc:"Convince someone new to tune in and watch tonight's episode." },
  { id:"3", emoji:"💑", title:"Predict the Coupling", diff:"Medium", pts:100, status:"available", desc:"Lock in a prediction — who couples up in the next episode?" },
  { id:"4", emoji:"✍️", title:"Write a Fan Theory",   diff:"Medium", pts:100, status:"available", desc:"Post a theory about the next big villa twist to social media." },
  { id:"5", emoji:"🎬", title:"Create a Fan Edit",    diff:"Hard",   pts:200, status:"available", desc:"Make an edit of your favourite couple and post it to socials." },
  { id:"6", emoji:"🏝️", title:"Host a Watch Party",  diff:"Hard",   pts:200, status:"available", desc:"Get 3+ friends together live for tonight's episode screening." },
];

const THREADS = [
  { id:"canada",   name:"🍁 Canada Lounge" },
  { id:"islanders", name:"🏝️ The Islanders" },
  { id:"hottakes",  name:"🔥 Hot Takes"     },
];

const TEXT_ALERTS = [
  "📱 Islanders, it's time for a recoupling. The boys will be choosing tonight.",
  "📱 BOMBSHELL ALERT: Two new Islanders are entering the villa tomorrow!",
  "📱 Tonight, the public will vote for their favourite couple. Stay tuned.",
  "📱 Islanders, a challenge is starting in the garden in 10 minutes.",
  "📱 You have 24 hours to decide who you want to be coupled up with.",
];


// ONLINE_SIMS removed — presence is now tracked live via Firestore globalPresence

const TABS = [
  { key:"villa",     label:"Villa",     Icon: Home          },
  { key:"islanders", label:"Islanders", Icon: Users         },
  { key:"chat",      label:"Chat",      Icon: MessageCircle },
];

const PAGE = {
  initial: { opacity:0, y:10 },
  animate: { opacity:1, y:0,  transition:{ duration:.2 } },
  exit:    { opacity:0, y:-8, transition:{ duration:.15 } },
};

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

// ─── TopBar ───────────────────────────────────────────────────────────────────
function TopBar({ onSignOut, displayName, photoURL, uid, partyCode, onlineUsers }) {
  const uColor = uidColor(uid ?? "you");

  // Other logged-in users (exclude self), capped at 3 for the avatar stack
  const others = onlineUsers.filter(u => u.uid !== uid);
  const shown  = others.slice(0, 3);
  const extra  = others.length - shown.length; // overflow count
  const total  = onlineUsers.length;           // includes self

  return (
    <header className="sticky top-0 z-40 border-b"
      style={{ background:"rgba(8,60,90,0.50)", backdropFilter:"blur(20px)", borderColor:"rgba(255,255,255,0.12)" }}>
      <div className="max-w-6xl mx-auto px-3 sm:px-5">
        <div className="h-14 flex items-center gap-2 justify-between">

          {/* Logo */}
          <motion.h1
            variants={bannerContainer}
            initial="initial"
            animate="animate"
            className="leading-none flex-shrink-0 flex items-center select-none"
            style={{ fontFamily:"'Josefin Sans',sans-serif", textShadow:"0 1px 10px rgba(0,0,0,0.4)" }}
          >
            <span className="font-bold text-xl flex tracking-[-0.05em]" style={{ color:"white" }}>
              {"love".split("").map((char, i) => (
                <motion.span key={`nav-love-${i}`} variants={letterAnimation}>{char}</motion.span>
              ))}
            </span>
            <span className="font-light text-xl flex ml-1 tracking-[-0.05em]" style={{ color:"rgba(255,255,255,0.75)" }}>
              {"Island".split("").map((char, i) => (
                <motion.span key={`nav-island-${i}`} variants={letterAnimation}>{char}</motion.span>
              ))}
            </span>
            <motion.span
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.6, type: "spring" }}
              className="text-sm align-super ml-1 font-semibold"
              style={{ color: C.amber }}
            >
              Fan
            </motion.span>
          </motion.h1>

          {/* Day counter + party code */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full"
              style={{ background:"rgba(255,255,255,0.18)", border:"1px solid rgba(255,255,255,0.25)" }}>
              <span className="text-xs font-semibold" style={{ color:"white" }}>🏝️ DAY 0</span>
            </div>
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full"
              style={{ background:"rgba(255,255,255,0.18)", border:"1px solid rgba(255,255,255,0.25)" }}>
              <Radio size={9} color="white" className="animate-pulse" />
              <span className="text-[11px] font-semibold" style={{ color:"white" }}>#{partyCode ?? "VILLA"}</span>
            </div>
          </div>

          {/* Online stack + count + sign out */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5">
              <div className="flex -space-x-2">
                {/* Other online users */}
                {shown.map((u, i) => (
                  <div
                    key={u.uid}
                    title={u.displayName ?? "Fan"}
                    className="relative w-7 h-7 rounded-full border-2 border-white flex items-center justify-center text-xs font-bold text-white overflow-hidden"
                    style={{ background: u.color ?? uidColor(u.uid), zIndex: shown.length - i }}
                  >
                    {u.photoURL
                      ? <img src={u.photoURL} alt={u.displayName} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      : (u.initial ?? u.displayName?.[0]?.toUpperCase() ?? "?")}
                    <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border border-white"
                      style={{ background: C.green }} />
                  </div>
                ))}

                {/* Overflow bubble — "+N" when more than 3 others */}
                {extra > 0 && (
                  <div className="relative w-7 h-7 rounded-full border-2 border-white flex items-center justify-center text-[10px] font-bold text-white"
                    style={{ background: "rgba(255,255,255,0.25)" }}>
                    +{extra}
                  </div>
                )}

                {/* Current user — always last */}
                <div
                  title={displayName ?? "You"}
                  className="relative w-7 h-7 rounded-full border-2 border-white flex items-center justify-center text-xs font-bold text-white overflow-hidden"
                  style={{ background: uColor }}
                >
                  {photoURL
                    ? <img src={photoURL} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    : (displayName?.[0]?.toUpperCase() ?? "Y")}
                  <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border border-white"
                    style={{ background: C.green }} />
                </div>
              </div>

              {/* Live count label */}
              <span className="hidden sm:block text-xs font-medium" style={{ color:"rgba(255,255,255,0.9)" }}>
                <span style={{ color:C.green }}>●</span>{" "}
                {total} fan{total !== 1 ? "s" : ""} online
              </span>
            </div>

            {onSignOut && (
              <button onClick={onSignOut} className="p-2 rounded-full transition-colors hover:bg-white/10" title="Sign out">
                <LogOut size={15} color="rgba(255,255,255,0.7)" />
              </button>
            )}
          </div>

        </div>
      </div>
    </header>
  );
}

// ─── BottomNav ────────────────────────────────────────────────────────────────
function BottomNav({ activeTab, setActiveTab }) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t"
      style={{ background:"rgba(8,60,90,0.65)", backdropFilter:"blur(24px)", borderColor:"rgba(255,255,255,0.12)" }}>
      <div className="max-w-6xl mx-auto flex">
        {TABS.map(({ key, label, Icon }) => {
          const active = activeTab === key;
          return (
            <button key={key} onClick={() => setActiveTab(key)}
              className="flex-1 flex flex-col items-center py-2 gap-0.5 transition-all">
              <div className={`p-1.5 rounded-xl transition-all ${active ? "bg-white/20" : ""}`}>
                <Icon size={18} color={active ? C.pink : "rgba(255,255,255,0.5)"} strokeWidth={active ? 2.5 : 1.5} />
              </div>
              <span className={`text-[10px] font-semibold transition-colors ${active ? "text-white" : "text-white/40"}`}
                style={{ fontFamily:"'Josefin Sans',sans-serif", letterSpacing:"0.05em" }}>
                {label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

// ─── CommunityRankingsCard ────────────────────────────────────────────────────
function CommunityRankingsCard({ allUserPredictions }) {
  const [view, setView] = useState("fav");

  const withPicks = allUserPredictions.filter(u => u.predictions?.favIslander);
  const total = withPicks.length;

  if (total === 0) return null;

  const favMap = {}, dangerMap = {};
  withPicks.forEach(u => {
    const { favIslander, dangerPick } = u.predictions;
    if (favIslander) favMap[favIslander] = (favMap[favIslander] ?? 0) + 1;
    if (dangerPick)  dangerMap[dangerPick] = (dangerMap[dangerPick] ?? 0) + 1;
  });

  const buildRanking = map =>
    ISLANDERS_INIT
      .map(i => ({ ...i, votes: map[i.id] ?? 0 }))
      .sort((a, b) => b.votes - a.votes);

  const ranking = buildRanking(view === "fav" ? favMap : dangerMap);
  const maxVotes = Math.max(ranking[0]?.votes ?? 1, 1);
  const accent = view === "fav" ? C.pink : C.coral;

  const medals = ["🥇","🥈","🥉"];

  return (
    <div className="rounded-2xl overflow-hidden"
      style={{ background: C.card, border: `1px solid ${C.cardBorder}`, boxShadow: C.cardShadow }}>
      <div className="px-4 py-3 border-b" style={{ borderColor: "rgba(0,0,0,0.06)" }}>
        <div className="flex items-center justify-between mb-3">
          <span className="font-bold text-sm" style={{ color: C.ink }}>
            Community Rankings 🏆
          </span>
          <span className="text-[11px] font-medium px-2 py-0.5 rounded-full"
            style={{ background: `${C.ocean}15`, color: C.ocean }}>
            {total} fan{total !== 1 ? "s" : ""} voted
          </span>
        </div>
        <div className="flex gap-2">
          {[
            { key: "fav",    label: "💕 Fan Favourite", color: C.pink  },
            { key: "danger", label: "🚨 First Out",     color: C.coral },
          ].map(({ key, label, color }) => (
            <button key={key} onClick={() => setView(key)}
              className="flex-1 py-1.5 rounded-xl text-xs font-bold transition-all"
              style={{
                background: view === key ? color : "transparent",
                color:      view === key ? "white" : C.muted,
                border:     `1px solid ${view === key ? color : "#E2E8F0"}`,
              }}>
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="divide-y" style={{ borderColor: "rgba(0,0,0,0.04)" }}>
        {ranking.map((islander, idx) => {
          const pct = Math.round((islander.votes / total) * 100);
          const barW = Math.round((islander.votes / maxVotes) * 100);
          return (
            <div key={islander.id} className="flex items-center gap-3 px-4 py-2.5">
              <span className="text-sm font-black w-6 text-center flex-shrink-0"
                style={{ color: idx < 3 ? accent : C.muted }}>
                {medals[idx] ?? idx + 1}
              </span>
              <div className="w-9 h-9 rounded-full overflow-hidden flex-shrink-0 border-2"
                style={{ borderColor: idx === 0 ? accent : "transparent" }}>
                <img src={islander.image} alt={islander.name}
                  className="w-full h-full object-cover object-top" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-bold" style={{ color: C.ink }}>{islander.name}</span>
                  <span className="text-xs font-bold"
                    style={{ color: islander.votes > 0 ? accent : C.muted }}>
                    {islander.votes > 0 ? `${pct}%` : "—"}
                  </span>
                </div>
                <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "#F1F5F9" }}>
                  <div className="h-full rounded-full transition-all duration-700"
                    style={{ width: `${barW}%`, background: accent }} />
                </div>
              </div>
              <span className="text-xs font-semibold w-5 text-right flex-shrink-0"
                style={{ color: C.muted }}>
                {islander.votes > 0 ? islander.votes : ""}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── PredictionsSheet ─────────────────────────────────────────────────────────
function PredictionsSheet({ predictions, onSave, onClose }) {
  const [favIslander, setFavIslander] = useState(predictions?.favIslander ?? null);
  const [dangerPick,  setDangerPick]  = useState(predictions?.dangerPick  ?? null);
  const [couplings,   setCouplings]   = useState(predictions?.couplings   ?? []);
  const [pending,     setPending]     = useState(null);
  const [saving,      setSaving]      = useState(false);

  const coupledIds = new Set(couplings.flatMap(c => [c.p1, c.p2]));
  const available  = ISLANDERS_INIT.filter(i => !coupledIds.has(i.id));

  function coupleUp(id) {
    if (pending === null) { setPending(id); }
    else if (pending === id) { setPending(null); }
    else {
      setCouplings(prev => [...prev, { p1:pending, p2:id }]);
      setPending(null);
    }
  }

  function uncouple(idx) {
    setCouplings(prev => prev.filter((_, i) => i !== idx));
    setPending(null);
  }

  async function handleSave() {
    setSaving(true);
    await onSave({ favIslander, dangerPick, couplings });
    setSaving(false);
    onClose();
  }

  const pendingName = ISLANDERS_INIT.find(i => i.id === pending)?.name;

  // Shared islander button used in sections 1 & 2
  function IslanderBtn({ islander, selected, onSelect, highlightColor, badgeLabel }) {
    const sel = selected === islander.id;
    return (
      <button
        onClick={() => onSelect(islander.id)}
        className="rounded-xl overflow-hidden transition-all duration-150 active:scale-[0.96]"
        style={{
          background: sel ? `${highlightColor}15` : "#F8FAFC",
          border:     sel ? `2px solid ${highlightColor}` : "1.5px solid #E2E8F0",
          boxShadow:  sel ? `0 0 0 3px ${highlightColor}25` : "none",
        }}
      >
        <div className="aspect-square w-full overflow-hidden">
          <img src={islander.image} alt={islander.name} className="w-full h-full object-cover object-top" />
        </div>
        <div className="py-1.5 px-1 text-center">
          <p className="text-[10px] font-bold" style={{ color: sel ? highlightColor : C.ink }}>{islander.name}</p>
          {sel && badgeLabel && (
            <span className="inline-block text-[8px] font-black px-1 py-0.5 rounded-full mt-0.5"
              style={{ background:highlightColor, color:"white" }}>{badgeLabel}</span>
          )}
        </div>
      </button>
    );
  }

  return (
    <motion.div
      initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
      className="fixed inset-0 z-50 flex items-end justify-center"
      style={{ background:"rgba(0,0,0,0.75)", backdropFilter:"blur(6px)" }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ y:"100%" }} animate={{ y:0 }} exit={{ y:"100%" }}
        transition={{ type:"spring", damping:30, stiffness:320 }}
        className="w-full max-w-xl rounded-t-3xl flex flex-col"
        style={{ background:C.card, maxHeight:"92vh" }}
      >
        {/* Handle + header */}
        <div className="flex-shrink-0 px-5 pt-4 pb-3 border-b" style={{ borderColor:"rgba(0,0,0,0.07)" }}>
          <div className="w-10 h-1 rounded-full mx-auto mb-4" style={{ background:"#E2E8F0" }} />
          <div className="flex items-center justify-between">
            <h2 className="font-black text-base" style={{ color:C.ink, fontFamily:"'Josefin Sans',sans-serif" }}>
              My Top Picks ✏️
            </h2>
            <button onClick={onClose} className="p-1.5 rounded-full hover:bg-slate-100 transition-colors">
              <X size={16} color={C.muted} />
            </button>
          </div>
          <p className="text-xs mt-1" style={{ color:C.muted }}>
            Changes save to your profile and carry over on your next login.
          </p>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-7">

          {/* ── Section 1: Favourite Islander ── */}
          <section>
            <p className="text-[11px] font-black uppercase tracking-widest mb-3" style={{ color:C.muted }}>
              Your Favourite Islander 💕
            </p>
            <div className="grid grid-cols-4 gap-2">
              {ISLANDERS_INIT.map(islander => (
                <IslanderBtn key={islander.id} islander={islander}
                  selected={favIslander} onSelect={setFavIslander}
                  highlightColor={C.pink} badgeLabel="My Pick" />
              ))}
            </div>
          </section>

          {/* ── Section 2: Most likely first OG dumped ── */}
          <section>
            <p className="text-[11px] font-black uppercase tracking-widest mb-3" style={{ color:C.muted }}>
              Most Likely First OG Dumped 🚨
            </p>
            <div className="grid grid-cols-4 gap-2">
              {ISLANDERS_INIT.map(islander => (
                <IslanderBtn key={islander.id} islander={islander}
                  selected={dangerPick} onSelect={setDangerPick}
                  highlightColor={C.coral} badgeLabel="OUT" />
              ))}
            </div>
          </section>

          {/* ── Section 3: Your Couplings ── */}
          <section>
            <p className="text-[11px] font-black uppercase tracking-widest mb-1" style={{ color:C.muted }}>
              Your Couplings 💑
            </p>
            <p className="text-xs mb-3" style={{ color:C.muted }}>
              {pending ? `Now pick a partner for ${pendingName}…` : "Tap an islander, then tap their match"}
            </p>

            {/* Available pool */}
            {available.length > 0 && (
              <div className="grid grid-cols-4 gap-2 mb-3">
                {available.map(islander => {
                  const isPending = pending === islander.id;
                  return (
                    <button key={islander.id} onClick={() => coupleUp(islander.id)}
                      className="flex flex-col items-center gap-1 rounded-xl p-2 transition-all active:scale-[0.95]"
                      style={{
                        background: isPending ? `${C.pink}15` : "#F8FAFC",
                        border:     isPending ? `2px solid ${C.pink}` : "1.5px solid #E2E8F0",
                      }}>
                      <div className="w-11 h-11 rounded-full overflow-hidden border-2"
                        style={{ borderColor: isPending ? C.pink : "transparent" }}>
                        <img src={islander.image} alt={islander.name} className="w-full h-full object-cover object-top" />
                      </div>
                      <span className="text-[10px] font-bold text-center" style={{ color: isPending ? C.pink : C.ink }}>
                        {islander.name}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Formed couples */}
            {couplings.length > 0 && (
              <div className="space-y-2">
                {couplings.map((couple, idx) => {
                  const p1 = ISLANDERS_INIT.find(i => i.id === couple.p1);
                  const p2 = ISLANDERS_INIT.find(i => i.id === couple.p2);
                  return (
                    <div key={`${couple.p1}-${couple.p2}`}
                      className="flex items-center gap-2 px-3 py-2 rounded-xl"
                      style={{ background:`${C.pink}10`, border:`1px solid ${C.pink}25` }}>
                      <div className="flex -space-x-2 flex-shrink-0">
                        <div className="w-8 h-8 rounded-full overflow-hidden border-2 border-white">
                          <img src={p1?.image} alt={p1?.name} className="w-full h-full object-cover object-top" />
                        </div>
                        <div className="w-8 h-8 rounded-full overflow-hidden border-2 border-white">
                          <img src={p2?.image} alt={p2?.name} className="w-full h-full object-cover object-top" />
                        </div>
                      </div>
                      <Heart size={11} fill={C.pink} color={C.pink} className="flex-shrink-0" />
                      <span className="text-xs font-bold flex-1" style={{ color:C.ink }}>
                        {p1?.name} & {p2?.name}
                      </span>
                      <button onClick={() => uncouple(idx)} className="p-1 rounded-full hover:bg-slate-100 flex-shrink-0">
                        <X size={11} color={C.muted} />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

        </div>

        {/* Sticky save bar */}
        <div className="flex-shrink-0 px-5 py-4 border-t" style={{ borderColor:"rgba(0,0,0,0.07)" }}>
          <button
            onClick={handleSave}
            disabled={saving || !favIslander || !dangerPick}
            className="w-full py-3.5 rounded-2xl font-bold text-sm transition-all active:scale-[0.98] disabled:opacity-50"
            style={{
              background:`linear-gradient(135deg,${C.ocean},${C.pink})`,
              color:"white", border:"none",
              fontFamily:"'Josefin Sans',sans-serif", letterSpacing:"0.08em",
            }}
          >
            {saving ? "Saving…" : "Save Changes ✓"}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── VillaLiveChat ────────────────────────────────────────────────────────────
function VillaLiveChat({ partyCode, displayName, uid, photoURL }) {
  const [messages, setMessages] = useState([]);
  const [input,    setInput]    = useState("");
  const [sending,  setSending]  = useState(false);
  const bottomRef = useRef(null);
  const uColor    = uidColor(uid ?? "guest");

  useEffect(() => {
    if (!partyCode) return;
    const q = query(
      collection(db, "parties", partyCode, "messages"),
      orderBy("createdAt", "asc"),
    );
    const unsub = onSnapshot(q, snap => {
      setMessages(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, console.error);
    return () => unsub();
  }, [partyCode]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function send(e) {
    e.preventDefault();
    const text = input.trim();
    if (!text || !partyCode || sending) return;
    setSending(true);
    setInput("");
    try {
      await addDoc(collection(db, "parties", partyCode, "messages"), {
        uid,
        displayName: displayName ?? "Fan",
        photoURL:    photoURL ?? null,
        color:       uColor,
        text,
        createdAt:   serverTimestamp(),
      });
    } catch (err) {
      console.error("Send failed:", err);
      setInput(text);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="rounded-2xl overflow-hidden flex flex-col"
      style={{ background: C.card, border: `1px solid ${C.cardBorder}`, boxShadow: C.cardShadow }}>

      {/* Header */}
      <div className="px-4 py-3 border-b flex items-center gap-2 flex-shrink-0"
        style={{ borderColor: "rgba(0,0,0,0.06)" }}>
        <MessageCircle size={13} color={C.ocean} />
        <span className="font-bold text-sm" style={{ color: C.ink }}>Party Chat</span>
        <span className="ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full"
          style={{ background: `${C.ocean}18`, color: C.ocean }}>LIVE</span>
      </div>

      {/* Messages */}
      <div className="overflow-y-auto px-4 py-3 space-y-3" style={{ height: 300 }}>
        {messages.length === 0 ? (
          <div className="h-full flex items-center justify-center">
            <p className="text-sm text-center" style={{ color: C.muted }}>
              No messages yet — be the first to say something! 🏝️
            </p>
          </div>
        ) : (
          messages.map(msg => {
            const isSelf = msg.uid === uid;
            return (
              <div key={msg.id} className={`flex items-end gap-2 ${isSelf ? "flex-row-reverse" : ""}`}>
                {!isSelf && (
                  <div className="w-7 h-7 rounded-full overflow-hidden flex items-center justify-center text-xs font-bold text-white flex-shrink-0 mb-0.5"
                    style={{ background: msg.color ?? uidColor(msg.uid) }}>
                    {msg.photoURL
                      ? <img src={msg.photoURL} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      : (msg.displayName?.[0]?.toUpperCase() ?? "?")}
                  </div>
                )}
                <div className={`max-w-[75%] flex flex-col gap-0.5 ${isSelf ? "items-end" : "items-start"}`}>
                  {!isSelf && (
                    <span className="text-[10px] font-semibold px-1" style={{ color: C.muted }}>
                      {msg.displayName}
                    </span>
                  )}
                  <div className="px-3 py-2 rounded-2xl text-sm leading-relaxed"
                    style={{
                      background:             isSelf ? `linear-gradient(135deg,${C.ocean},${C.pink})` : "#F8FAFC",
                      color:                  isSelf ? "white" : C.ink,
                      borderBottomRightRadius: isSelf ? 4 : 16,
                      borderBottomLeftRadius:  isSelf ? 16 : 4,
                    }}>
                    {msg.text}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <form onSubmit={send}
        className="border-t flex items-center gap-2 px-3 py-2.5 flex-shrink-0"
        style={{ borderColor: "rgba(0,0,0,0.06)" }}>
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Say something…"
          maxLength={300}
          className="flex-1 py-2 px-3 rounded-xl text-sm outline-none"
          style={{ background: "#F8FAFC", border: `1px solid ${C.cardBorder}`, color: C.ink }}
        />
        <button type="submit" disabled={!input.trim() || sending}
          className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 transition-all active:scale-90 disabled:opacity-40"
          style={{ background: `linear-gradient(135deg,${C.ocean},${C.pink})`, border: "none" }}>
          <Send size={14} color="white" />
        </button>
      </form>
    </div>
  );
}

// ─── VillaTab ─────────────────────────────────────────────────────────────────
function VillaTab({ islanders, setActiveTab, predictions, onUpdatePredictions, allUserPredictions, partyCode, displayName, uid, photoURL }) {
  const [showSheet, setShowSheet] = useState(false);

  const active  = islanders.filter(i => i.status !== "dumped");
  const couples = active.filter(i => i.status === "coupled").length / 2;
  const singles = active.filter(i => i.status === "single").length;

  // Derive display values from new predictions format
  const favIslanderName = predictions?.favIslander
    ? ISLANDERS_INIT.find(i => i.id === predictions.favIslander)?.name
    : null;
  const dangerName = predictions?.dangerPick
    ? ISLANDERS_INIT.find(i => i.id === predictions.dangerPick)?.name
    : null;
  const firstCouplePair = predictions?.couplings?.[0];
  const firstCoupleName = firstCouplePair
    ? `${ISLANDERS_INIT.find(i => i.id === firstCouplePair.p1)?.name} & ${ISLANDERS_INIT.find(i => i.id === firstCouplePair.p2)?.name}`
    : null;

  return (
    <motion.div {...PAGE} className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label:"Islanders", value:active.length,        emoji:"🏝️", accent:C.ocean },
          { label:"Couples",   value:Math.floor(couples),  emoji:"💑", accent:C.pink  },
          { label:"Singles",   value:singles,              emoji:"⚡", accent:C.coral },
        ].map(({ label, value, emoji, accent }) => (
          <div key={label} className="rounded-2xl p-4 text-center"
            style={{ background:C.card, border:`1.5px solid ${accent}40`, boxShadow:C.cardShadow }}>
            <div className="text-2xl mb-1">{emoji}</div>
            <div className="text-2xl font-black" style={{ color:C.ink, fontFamily:"'Josefin Sans',sans-serif" }}>{value}</div>
            <div className="text-[11px] font-semibold uppercase tracking-wider mt-0.5" style={{ color:C.muted }}>{label}</div>
          </div>
        ))}
      </div>

      {/* My Top Picks card */}
      <div className="rounded-2xl overflow-hidden"
        style={{ background:C.card, border:`1px solid ${C.cardBorder}`, boxShadow:C.cardShadow }}>
        <div className="px-4 py-3 border-b flex items-center justify-between" style={{ borderColor:"rgba(0,0,0,0.06)" }}>
          <span className="font-bold text-sm" style={{ color:C.ink }}>My Top Picks 🏝️</span>
          <button
            onClick={() => setShowSheet(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all active:scale-95"
            style={{ background:`${C.pink}15`, color:C.pink, border:`1px solid ${C.pink}30` }}
          >
            <Edit2 size={11} /> Edit
          </button>
        </div>

        {predictions?.favIslander ? (
          <div className="divide-y" style={{ borderColor:"rgba(0,0,0,0.05)" }}>
            <div className="flex items-center justify-between px-4 py-3">
              <span className="text-sm" style={{ color:C.slate }}>Favourite Islander</span>
              <span className="text-sm font-bold" style={{ color:C.ink }}>{favIslanderName} 💕</span>
            </div>
            <div className="flex items-center justify-between px-4 py-3">
              <span className="text-sm" style={{ color:C.slate }}>Most Likely First Dumped</span>
              <span className="text-sm font-bold" style={{ color:C.coral }}>{dangerName} 🚨</span>
            </div>
            <div className="flex items-center justify-between px-4 py-3">
              <span className="text-sm" style={{ color:C.slate }}>Your Top Couple</span>
              <span className="text-sm font-bold" style={{ color:C.amber }}>
                {firstCoupleName ?? "Not set yet"} 🏆
              </span>
            </div>
          </div>
        ) : (
          <div className="px-4 py-5 text-center">
            <p className="text-sm mb-3" style={{ color:C.muted }}>You haven't set your top picks yet.</p>
            <button
              onClick={() => setShowSheet(true)}
              className="px-4 py-2 rounded-xl text-sm font-bold transition-all active:scale-95"
              style={{ background:`linear-gradient(135deg,${C.ocean},${C.pink})`, color:"white", border:"none" }}
            >
              Set My Top Picks →
            </button>
          </div>
        )}
      </div>

      {/* Top Picks edit sheet */}
      <AnimatePresence>
        {showSheet && (
          <PredictionsSheet
            predictions={predictions}
            onSave={onUpdatePredictions}
            onClose={() => setShowSheet(false)}
          />
        )}
      </AnimatePresence>

      {/* Community rankings */}
      <CommunityRankingsCard allUserPredictions={allUserPredictions} />

      {/* Live party chat */}
      <VillaLiveChat partyCode={partyCode} displayName={displayName} uid={uid} photoURL={photoURL} />

      {/* Quick actions */}
      <div className="rounded-2xl overflow-hidden"
        style={{ background:C.card, border:`1px solid ${C.cardBorder}`, boxShadow:C.cardShadow }}>
        <div className="px-4 py-3 border-b" style={{ borderColor:"rgba(0,0,0,0.06)" }}>
          <span className="font-bold text-sm" style={{ color:C.ink }}>Quick Actions</span>
        </div>
        <div className="p-3 grid grid-cols-2 gap-2">
          {[
            { label:"View Islanders", key:"islanders", emoji:"👥", color:C.ocean },
            { label:"Join Chat",      key:"chat",      emoji:"💬", color:C.coral },
          ].map(({ label, key, emoji, color }) => (
            <button key={key} onClick={() => setActiveTab(key)}
              className="flex items-center gap-2 p-3 rounded-xl transition-all active:scale-[0.97]"
              style={{ background:`${color}10`, border:`1px solid ${color}30` }}>
              <span>{emoji}</span>
              <span className="text-sm font-semibold" style={{ color }}>{label}</span>
              <ChevronRight size={14} className="ml-auto" color={color} />
            </button>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

// ─── IslandersTab ─────────────────────────────────────────────────────────────
function IslandersTab({ islanders }) {
  return (
    <motion.div {...PAGE}>
      <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
        {islanders.map(islander => (
          <div key={islander.id} className="rounded-2xl overflow-hidden"
            style={{ background:C.card, border:`1px solid ${C.cardBorder}`, boxShadow:C.cardShadow }}>
            <div className="aspect-square w-full overflow-hidden">
              <img src={islander.image} alt={islander.name}
                className="w-full h-full object-cover object-top" />
            </div>
            <div className="py-2 px-1.5 text-center">
              <p className="text-xs font-bold truncate" style={{ color:C.ink,
                fontFamily:"'Josefin Sans',sans-serif", letterSpacing:"0.03em" }}>
                {islander.name}
              </p>
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

// ─── RecouplingModal ──────────────────────────────────────────────────────────
function RecouplingModal({ islanders, onClose, onComplete }) {
  const active   = islanders.filter(i => i.status !== "dumped");
  const choosers = active.filter((_, i) => i % 2 === 0);
  const [step, setStep]             = useState(0);
  const [selections, setSelections] = useState({});
  const [done, setDone]             = useState(false);

  const chosen   = new Set(Object.values(selections));
  const chooser  = choosers[step];
  const options  = active.filter(p =>
    p.id !== chooser?.id &&
    !Object.keys(selections).includes(p.id) &&
    !chosen.has(p.id)
  );
  const progress = (step / choosers.length) * 100;

  function selectPartner(partnerId) {
    const next = { ...selections, [chooser.id]: partnerId };
    setSelections(next);
    if (step + 1 >= choosers.length) {
      setDone(true);
      setTimeout(() => onComplete(Object.entries(next).map(([a,b])=>[a,b])), 1400);
    } else {
      setStep(s => s + 1);
    }
  }

  return (
    <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      style={{ background:"rgba(0,0,0,0.75)", backdropFilter:"blur(6px)" }}
      onClick={e => e.target===e.currentTarget && !done && onClose()}>
      <motion.div
        initial={{ y:"100%", opacity:0 }} animate={{ y:0, opacity:1 }} exit={{ y:"100%", opacity:0 }}
        transition={{ type:"spring", damping:28, stiffness:300 }}
        className="w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl overflow-hidden"
        style={{ background:C.card, maxHeight:"92vh", overflowY:"auto" }}>

        {done ? (
          <div className="p-8 text-center">
            <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
              style={{ background:`linear-gradient(135deg,${C.pink},${C.ocean})` }}>
              <Sparkles size={28} color="white" />
            </div>
            <h3 className="text-2xl font-black mb-2" style={{ color:C.ink, fontFamily:"'Josefin Sans',sans-serif" }}>
              Recoupling Complete! 🎉
            </h3>
            <p className="text-sm" style={{ color:C.muted }}>New couples have been formed in the villa 🏝️</p>
          </div>
        ) : (
          <>
            <div className="p-5 border-b" style={{ borderColor:"rgba(0,0,0,0.06)" }}>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-black text-lg" style={{ color:C.ink, fontFamily:"'Josefin Sans',sans-serif" }}>
                  💑 Recoupling Ceremony
                </h3>
                <button onClick={onClose} className="p-1.5 rounded-full hover:bg-slate-100 transition-colors">
                  <X size={16} color={C.muted} />
                </button>
              </div>
              <div className="flex items-center justify-between text-xs mb-1.5" style={{ color:C.muted }}>
                <span>Progress</span><span>{step} / {choosers.length}</span>
              </div>
              <div className="h-2 rounded-full overflow-hidden" style={{ background:"#F1F5F9" }}>
                <div className="h-full rounded-full transition-all duration-500"
                  style={{ width:`${progress}%`, background:`linear-gradient(to right,${C.pink},${C.ocean})` }} />
              </div>
            </div>

            {chooser && (
              <div className="p-5">
                <div className="flex items-center gap-3 p-3 rounded-xl mb-4"
                  style={{ background:`${C.pink}10`, border:`1px solid ${C.pink}25` }}>
                  <div className="w-12 h-12 rounded-full overflow-hidden flex items-center justify-center text-2xl flex-shrink-0"
                    style={{ background:"#FFF5F5" }}>
                    {chooser.image ? <img src={chooser.image} alt={chooser.name} className="w-full h-full object-cover" /> : chooser.emoji}
                  </div>
                  <div>
                    <p className="text-xs" style={{ color:C.muted }}>Now choosing…</p>
                    <p className="font-bold" style={{ color:C.ink }}>{chooser.name}, {chooser.age}</p>
                  </div>
                </div>
                <p className="text-sm font-semibold mb-3" style={{ color:C.slate }}>Choose your partner:</p>
                <div className="grid grid-cols-2 gap-2">
                  {options.map(opt => (
                    <button key={opt.id} onClick={() => selectPartner(opt.id)}
                      className="flex items-center gap-2 p-3 rounded-xl transition-all active:scale-[0.97]"
                      style={{ background:`${C.ocean}08`, border:`1px solid ${C.ocean}25` }}>
                      <div className="w-9 h-9 rounded-full overflow-hidden flex items-center justify-center text-lg flex-shrink-0"
                        style={{ background:"#EFF9FF" }}>
                        {opt.image ? <img src={opt.image} alt={opt.name} className="w-full h-full object-cover" /> : opt.emoji}
                      </div>
                      <div className="text-left">
                        <p className="text-sm font-bold" style={{ color:C.ink }}>{opt.name}</p>
                        <p className="text-[11px]" style={{ color:C.muted }}>{opt.age}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </motion.div>
    </motion.div>
  );
}

// ─── CouplesTab ───────────────────────────────────────────────────────────────
function CouplesTab({ islanders, setIslanders }) {
  const [showModal, setShowModal]         = useState(false);
  const [compatOverrides, setCompatOvr]   = useState({});

  const couplesList = [];
  const seen = new Set();
  islanders.filter(i => i.status==="coupled").forEach(i => {
    if (!seen.has(i.id) && i.partnerId) {
      const partner = islanders.find(p => p.id===i.partnerId);
      if (partner) { couplesList.push([i, partner]); seen.add(i.id); seen.add(partner.id); }
    }
  });

  function handleRecouple(pairs) {
    setIslanders(prev => {
      const upd = prev.map(i => ({ ...i, status:"single", partnerId:null, compat:0 }));
      pairs.forEach(([a,b]) => {
        const ai = upd.findIndex(x=>x.id===a), bi = upd.findIndex(x=>x.id===b);
        const score = Math.floor(55 + Math.random()*45);
        if (ai!==-1) upd[ai] = { ...upd[ai], status:"coupled", partnerId:b, compat:score };
        if (bi!==-1) upd[bi] = { ...upd[bi], status:"coupled", partnerId:a, compat:score };
      });
      return upd;
    });
    setCompatOvr({});
    setShowModal(false);
    confetti({ particleCount:160, spread:90, origin:{ y:0.55 }, colors:["#de69c0","#FF5A5F","#F59E0B","#0A84FF"] });
  }

  return (
    <motion.div {...PAGE} className="space-y-4">
      <button onClick={() => setShowModal(true)}
        className="w-full py-3.5 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
        style={{ background:`linear-gradient(135deg,${C.pink},${C.coral})`, color:"white", border:"none", fontFamily:"'Josefin Sans',sans-serif", letterSpacing:"0.08em" }}>
        <RotateCcw size={15} /> Start Recoupling Ceremony
      </button>

      {couplesList.map(([p1, p2]) => {
        const key = `${p1.id}-${p2.id}`;
        const compat = compatOverrides[key] ?? p1.compat;
        return (
          <div key={key} className="rounded-2xl overflow-hidden"
            style={{ background:C.card, border:`1px solid ${C.cardBorder}`, boxShadow:C.cardShadow }}>
            <div className="grid grid-cols-2">
              {[p1, p2].map((p, i) => (
                <div key={p.id} className={`p-4 flex items-center gap-3 ${i===0?"border-r":""}`}
                  style={{ borderColor:"rgba(0,0,0,0.05)", background:i===0?"#F0F9FF":"#FFF5F5" }}>
                  <div className="w-12 h-12 rounded-full overflow-hidden flex items-center justify-center text-2xl flex-shrink-0"
                    style={{ background:i===0?"#DBEAFE":"#FFE4E6" }}>
                    {p.image ? <img src={p.image} alt={p.name} className="w-full h-full object-cover" /> : p.emoji}
                  </div>
                  <div>
                    <p className="font-bold text-sm" style={{ color:C.ink }}>{p.name}</p>
                    <p className="text-xs" style={{ color:C.muted }}>{p.age} · {p.job}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="px-4 py-3 border-t" style={{ borderColor:"rgba(0,0,0,0.05)" }}>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color:C.muted }}>Compatibility</span>
                <span className="text-sm font-black"
                  style={{ color:compat>=80?C.green:compat>=60?C.amber:C.coral, fontFamily:"'Josefin Sans',sans-serif" }}>
                  {compat}%
                </span>
              </div>
              <div className="h-2 rounded-full overflow-hidden mb-2" style={{ background:"#F1F5F9" }}>
                <div className="h-full rounded-full transition-all duration-700"
                  style={{
                    width:`${compat}%`,
                    background: compat>=80 ? `linear-gradient(to right,${C.green},${C.ocean})`
                              : compat>=60 ? `linear-gradient(to right,${C.amber},${C.coral})`
                              :               `linear-gradient(to right,${C.coral},#FF9999)`,
                  }} />
              </div>
              <input type="range" min={0} max={100} value={compat}
                onChange={e => setCompatOvr(prev => ({ ...prev, [key]:Number(e.target.value) }))}
                className="w-full accent-pink-400" style={{ cursor:"pointer" }} />
            </div>
          </div>
        );
      })}

      {islanders.filter(i=>i.status==="single").length > 0 && (
        <div className="rounded-2xl overflow-hidden"
          style={{ background:C.card, border:`1px solid ${C.cardBorder}`, boxShadow:C.cardShadow }}>
          <div className="px-4 py-3 border-b flex items-center gap-2" style={{ borderColor:"rgba(0,0,0,0.06)" }}>
            <Zap size={13} color={C.coral} />
            <span className="font-bold text-sm" style={{ color:C.ink }}>Looking for Love</span>
          </div>
          <div className="p-3 grid grid-cols-2 gap-2">
            {islanders.filter(i=>i.status==="single").map(i => (
              <div key={i.id} className="flex items-center gap-2 p-3 rounded-xl"
                style={{ background:`${C.coral}08`, border:`1px solid ${C.coral}25` }}>
                <div className="w-10 h-10 rounded-full overflow-hidden flex items-center justify-center text-xl flex-shrink-0"
                  style={{ background:"#FFF5F5" }}>
                  {i.image ? <img src={i.image} alt={i.name} className="w-full h-full object-cover" /> : i.emoji}
                </div>
                <div>
                  <p className="text-sm font-bold" style={{ color:C.ink }}>{i.name}</p>
                  <p className="text-[11px]" style={{ color:C.coral }}>Single</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <AnimatePresence>
        {showModal && (
          <RecouplingModal islanders={islanders} onClose={() => setShowModal(false)} onComplete={handleRecouple} />
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ─── ChatTab ──────────────────────────────────────────────────────────────────
function ChatTab({ displayName, photoURL, uid }) {
  const [thread,    setThread]    = useState("canada");
  const [msgs,      setMsgs]      = useState({});
  const [input,     setInput]     = useState("");
  const [sending,   setSending]   = useState(false);
  const [textAlert, setTextAlert] = useState(null);
  const bottomRef  = useRef(null);
  const unsubRef   = useRef(null);
  const uColor     = uidColor(uid ?? "you");

  // Subscribe to the active thread — swap listener when thread changes
  useEffect(() => {
    if (unsubRef.current) unsubRef.current();
    const q = query(
      collection(db, "threads", thread, "messages"),
      orderBy("createdAt", "asc"),
    );
    unsubRef.current = onSnapshot(q, snap => {
      setMsgs(prev => ({
        ...prev,
        [thread]: snap.docs.map(d => ({ id: d.id, ...d.data() })),
      }));
    }, console.error);
    return () => unsubRef.current?.();
  }, [thread]);

  // Scroll to bottom whenever messages in the active thread update
  const threadMsgs = msgs[thread] ?? [];
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [threadMsgs.length, thread]);

  // Random text-alert banner
  useEffect(() => {
    const t = setTimeout(() => {
      setTextAlert(TEXT_ALERTS[Math.floor(Math.random() * TEXT_ALERTS.length)]);
    }, 20000 + Math.random() * 25000);
    return () => clearTimeout(t);
  }, [textAlert]);

  async function send(e) {
    e.preventDefault();
    const text = input.trim();
    if (!text || sending) return;
    setSending(true);
    setInput("");
    try {
      await addDoc(collection(db, "threads", thread, "messages"), {
        uid:         uid ?? null,
        displayName: displayName ?? "Fan",
        photoURL:    photoURL ?? null,
        color:       uColor,
        text,
        createdAt:   serverTimestamp(),
      });
    } catch (err) {
      console.error("Send failed:", err);
      setInput(text);
    } finally {
      setSending(false);
    }
  }

  const activeThread = THREADS.find(t => t.id === thread);

  return (
    <motion.div {...PAGE} className="space-y-3">
      <AnimatePresence>
        {textAlert && (
          <motion.div
            initial={{ y:-50, opacity:0 }} animate={{ y:0, opacity:1 }} exit={{ y:-50, opacity:0 }}
            className="flex items-start gap-3 px-4 py-3 rounded-2xl"
            style={{ background:`linear-gradient(135deg,${C.ocean}20,${C.pink}20)`, border:`1px solid ${C.pink}40` }}>
            <span className="text-xl">📱</span>
            <p className="flex-1 text-sm font-semibold" style={{ color:C.ink }}>{textAlert}</p>
            <button onClick={() => setTextAlert(null)}><X size={14} color={C.muted} /></button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Thread selector */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {THREADS.map(t => (
          <button key={t.id} onClick={() => setThread(t.id)}
            className="flex-shrink-0 px-4 py-2 rounded-xl text-sm font-bold transition-all"
            style={{
              background: thread === t.id ? C.ocean : C.card,
              color:      thread === t.id ? "white" : C.ink,
              border:     `1px solid ${thread === t.id ? C.ocean : C.cardBorder}`,
              boxShadow:  C.cardShadow,
            }}>
            {t.name}
          </button>
        ))}
      </div>

      {/* Chat window */}
      <div className="rounded-2xl overflow-hidden flex flex-col"
        style={{ background:C.card, border:`1px solid ${C.cardBorder}`, boxShadow:C.cardShadow, height:440 }}>

        {/* Header */}
        <div className="px-4 py-3 border-b flex items-center gap-2 flex-shrink-0"
          style={{ borderColor:"rgba(0,0,0,0.06)" }}>
          <MessageCircle size={13} color={C.ocean} />
          <span className="text-sm font-bold" style={{ color:C.ink }}>{activeThread?.name}</span>
          <span className="ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full"
            style={{ background:`${C.ocean}18`, color:C.ocean }}>LIVE</span>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
          {threadMsgs.length === 0 ? (
            <div className="h-full flex items-center justify-center">
              <p className="text-sm text-center" style={{ color:C.muted }}>
                No messages yet — start the conversation! 🏝️
              </p>
            </div>
          ) : (
            threadMsgs.map(msg => {
              const isSelf = msg.uid === uid;
              const timeStr = msg.createdAt?.toDate
                ? msg.createdAt.toDate().toLocaleTimeString([], { hour:"2-digit", minute:"2-digit" })
                : "";
              return (
                <div key={msg.id} className={`flex items-end gap-2 ${isSelf ? "flex-row-reverse" : ""}`}>
                  {!isSelf && (
                    <div className="w-7 h-7 rounded-full overflow-hidden flex items-center justify-center text-xs font-bold text-white flex-shrink-0 mb-0.5"
                      style={{ background: msg.color ?? uidColor(msg.uid ?? "") }}>
                      {msg.photoURL
                        ? <img src={msg.photoURL} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        : (msg.displayName?.[0]?.toUpperCase() ?? "?")}
                    </div>
                  )}
                  <div className={`max-w-[75%] flex flex-col gap-0.5 ${isSelf ? "items-end" : "items-start"}`}>
                    {!isSelf && (
                      <span className="text-[10px] font-semibold px-1" style={{ color:C.muted }}>
                        {msg.displayName}
                      </span>
                    )}
                    <div className="px-3 py-2 rounded-2xl text-sm leading-relaxed"
                      style={{
                        background:              isSelf ? `linear-gradient(135deg,${C.ocean},${C.pink})` : "#F8FAFC",
                        color:                   isSelf ? "white" : C.ink,
                        borderBottomRightRadius: isSelf ? 4 : 16,
                        borderBottomLeftRadius:  isSelf ? 16 : 4,
                      }}>
                      {msg.text}
                    </div>
                    {timeStr && (
                      <span className="text-[10px] px-1" style={{ color:C.muted }}>{timeStr}</span>
                    )}
                  </div>
                </div>
              );
            })
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <form onSubmit={send}
          className="border-t flex items-center gap-2 px-3 py-2.5 flex-shrink-0"
          style={{ borderColor:"rgba(0,0,0,0.06)" }}>
          <input
            type="text" value={input} onChange={e => setInput(e.target.value)}
            placeholder="Say something…" maxLength={300}
            className="flex-1 py-2 px-3 rounded-xl text-sm outline-none"
            style={{ background:"#F8FAFC", border:`1px solid ${C.cardBorder}`, color:C.ink }}
          />
          <button type="submit" disabled={!input.trim() || sending}
            className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 transition-all active:scale-90 disabled:opacity-40"
            style={{ background:`linear-gradient(135deg,${C.ocean},${C.pink})`, border:"none" }}>
            <Send size={14} color="white" />
          </button>
        </form>
      </div>
    </motion.div>
  );
}

// ─── ChallengesTab ────────────────────────────────────────────────────────────
function ChallengesTab() {
  const [challenges, setChallenges] = useState(CHALLENGES_INIT);
  const [points,     setPoints]     = useState(240);
  const [pop,        setPop]        = useState(null);

  const diffColor = { Easy:C.green, Medium:C.amber, Hard:C.coral };

  function advance(id) {
    setChallenges(prev => prev.map(c => {
      if (c.id !== id) return c;
      if (c.status === "available")   return { ...c, status:"in-progress" };
      if (c.status === "in-progress") {
        setPoints(p => p + c.pts);
        setPop(id);
        setTimeout(()=>setPop(null), 1600);
        confetti({ particleCount:80, spread:60, origin:{ y:0.6 }, colors:["#de69c0","#F59E0B","#22C55E"] });
        return { ...c, status:"completed" };
      }
      return c;
    }));
  }

  return (
    <motion.div {...PAGE} className="space-y-4">
      <div className="rounded-2xl p-5 flex items-center gap-4"
        style={{ background:`linear-gradient(135deg,${C.amber}22,${C.coral}22)`, border:`1px solid ${C.amber}40`, boxShadow:C.cardShadow }}>
        <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl flex-shrink-0"
          style={{ background:C.card }}>🏆</div>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color:C.muted }}>Total Fan Points</p>
          <p className="text-4xl font-black" style={{ color:C.ink, fontFamily:"'Josefin Sans',sans-serif" }}>
            {points.toLocaleString()} <span className="text-base font-semibold" style={{ color:C.muted }}>pts</span>
          </p>
        </div>
        <div className="ml-auto text-right">
          <p className="text-sm font-black" style={{ color:C.ink }}>{challenges.filter(c=>c.status==="completed").length}/{challenges.length}</p>
          <p className="text-xs" style={{ color:C.muted }}>done</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {challenges.map(c => (
          <motion.div key={c.id}
            animate={pop===c.id ? { scale:[1,1.04,1] } : { scale:1 }}
            transition={{ duration:.4 }}
            className="rounded-2xl overflow-hidden"
            style={{
              background: c.status==="completed" ? "#F0FDF4" : C.card,
              border:`1px solid ${c.status==="completed"?C.green+"40":C.cardBorder}`,
              boxShadow: C.cardShadow,
            }}>
            <div className="h-1.5" style={{
              background: c.status==="completed"   ? `linear-gradient(to right,${C.green},#86EFAC)`
                        : c.status==="in-progress" ? `linear-gradient(to right,${C.amber},${C.coral})`
                        :                             `linear-gradient(to right,${C.ocean},${C.pink})`,
            }} />
            <div className="p-4">
              <div className="flex items-start gap-3 mb-3">
                <span className="text-2xl">{c.emoji}</span>
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-sm" style={{ color:C.ink }}>{c.title}</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                      style={{ background:`${diffColor[c.diff]}15`, color:diffColor[c.diff] }}>
                      {c.diff}
                    </span>
                  </div>
                  <p className="text-xs mt-1 leading-relaxed" style={{ color:C.slate }}>{c.desc}</p>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-black" style={{ color:C.amber, fontFamily:"'Josefin Sans',sans-serif" }}>+{c.pts} pts</span>
                <button onClick={() => advance(c.id)} disabled={c.status==="completed"}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold transition-all active:scale-95 disabled:cursor-default"
                  style={{
                    background: c.status==="completed"   ? `${C.green}20`
                              : c.status==="in-progress" ? `linear-gradient(135deg,${C.amber},${C.coral})`
                              :                             `linear-gradient(135deg,${C.ocean},${C.pink})`,
                    color:  c.status==="completed" ? C.green : "white",
                    border: "none",
                  }}>
                  {c.status==="completed" ? "✓ Done" : c.status==="in-progress" ? "Complete ✓" : "Start →"}
                </button>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}

// ─── VoteTab ──────────────────────────────────────────────────────────────────
function VoteTab({ islanders }) {
  const [selected,    setSelected]    = useState(null);
  const [voted,       setVoted]       = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [seconds,     setSeconds]     = useState(14 * 60 + 22);

  useEffect(() => {
    if (seconds <= 0) return;
    const t = setInterval(() => setSeconds(s => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, []);

  const mm = String(Math.floor(seconds / 60)).padStart(2, "0");
  const ss = String(seconds % 60).padStart(2, "0");

  function submit() {
    if (!selected || voted || seconds===0) return;
    setVoted(true);
    setShowConfirm(true);
    confetti({ particleCount:120, spread:80, origin:{ y:0.55 }, colors:["#de69c0","#0A84FF","#22C55E","#F59E0B"] });
  }

  const votable = islanders.filter(i => i.status !== "dumped");

  return (
    <motion.div {...PAGE} className="space-y-4">
      {/* Timer */}
      <div className="rounded-2xl p-4 flex items-center gap-4"
        style={{ background:C.card, border:`1px solid ${seconds<60?C.coral+"60":C.cardBorder}`, boxShadow:C.cardShadow }}>
        <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background:seconds<60?`${C.coral}15`:`${C.ocean}10` }}>
          <Clock size={22} color={seconds<60?C.coral:C.ocean} />
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest" style={{ color:C.muted }}>Vote closes in</p>
          <p className="text-3xl font-black"
            style={{ color:seconds<60?C.coral:C.ink, fontFamily:"'Josefin Sans',sans-serif", fontVariantNumeric:"tabular-nums" }}>
            {mm}:{ss}
          </p>
        </div>
        {voted && (
          <div className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-xl" style={{ background:`${C.green}15` }}>
            <Check size={14} color={C.green} />
            <span className="text-xs font-bold" style={{ color:C.green }}>Vote Locked</span>
          </div>
        )}
      </div>

      <div className="text-center">
        <h3 className="font-black text-lg mb-1" style={{ color:"white", fontFamily:"'Josefin Sans',sans-serif" }}>
          🗳️ Vote for Your Favourite Islander
        </h3>
        <p className="text-sm" style={{ color:"rgba(255,255,255,0.65)" }}>
          {voted ? "Your vote has been submitted and locked in!" : "Tap a card to select, then submit your vote"}
        </p>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {votable.map(i => {
          const sel = selected===i.id;
          return (
            <button key={i.id} onClick={() => !voted && setSelected(i.id)}
              disabled={voted && !sel}
              className="rounded-2xl p-3 flex flex-col items-center gap-2 transition-all duration-200 active:scale-[0.97]"
              style={{
                background: sel ? `linear-gradient(135deg,${C.pink}25,${C.ocean}25)` : C.card,
                border:     sel ? `2px solid ${C.pink}` : `1px solid ${C.cardBorder}`,
                boxShadow:  sel ? `0 0 0 3px ${C.pink}30,${C.cardShadow}` : C.cardShadow,
                opacity:    voted && !sel ? 0.4 : 1,
              }}>
              <div className="w-12 h-12 rounded-full overflow-hidden flex items-center justify-center text-xl"
                style={{ background:i.status==="coupled"?"#EFF9FF":"#FFF5F5" }}>
                {i.image ? <img src={i.image} alt={i.name} className="w-full h-full object-cover" /> : i.emoji}
              </div>
              <span className="text-xs font-bold text-center leading-tight" style={{ color:sel?C.pink:C.ink }}>{i.name}</span>
              {sel && <Heart size={11} fill={C.pink} color={C.pink} />}
            </button>
          );
        })}
      </div>

      {!voted && (
        <button onClick={submit} disabled={!selected||seconds===0}
          className="w-full py-4 rounded-2xl font-bold text-sm transition-all active:scale-[0.98]"
          style={{
            background: selected&&seconds>0 ? `linear-gradient(135deg,${C.ocean},${C.pink})` : "rgba(255,255,255,0.15)",
            color: "white", border:"none", opacity:selected&&seconds>0?1:0.5,
            fontFamily:"'Josefin Sans',sans-serif", letterSpacing:"0.08em", fontSize:13,
          }}>
          {seconds===0 ? "Voting Closed" : "Submit Vote →"}
        </button>
      )}

      <AnimatePresence>
        {showConfirm && (
          <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background:"rgba(0,0,0,0.75)", backdropFilter:"blur(6px)" }}
            onClick={() => setShowConfirm(false)}>
            <motion.div initial={{ scale:.85,opacity:0 }} animate={{ scale:1,opacity:1 }}
              exit={{ scale:.85,opacity:0 }} transition={{ type:"spring",damping:22,stiffness:300 }}
              className="w-full max-w-xs rounded-3xl p-8 text-center"
              style={{ background:C.card }}
              onClick={e=>e.stopPropagation()}>
              <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
                style={{ background:`linear-gradient(135deg,${C.green},${C.ocean})` }}>
                <Check size={30} color="white" strokeWidth={2.5} />
              </div>
              <h3 className="text-xl font-black mb-2" style={{ color:C.ink, fontFamily:"'Josefin Sans',sans-serif" }}>
                Vote Verified! ✅
              </h3>
              <p className="text-sm mb-1" style={{ color:C.slate }}>
                You voted for <strong style={{ color:C.pink }}>{islanders.find(i=>i.id===selected)?.name}</strong>
              </p>
              <p className="text-xs mb-6" style={{ color:C.muted }}>Results revealed at the next ceremony</p>
              <button onClick={() => setShowConfirm(false)}
                className="w-full py-3 rounded-xl font-bold text-sm"
                style={{ background:`linear-gradient(135deg,${C.ocean},${C.pink})`, color:"white", border:"none" }}>
                Done
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────
export default function Dashboard({ onSignOut, partyCode, displayName, uid, photoURL, matchmakerPredictions, onUpdatePredictions }) {
  const [activeTab,          setActiveTab]          = useState("villa");
  const [islanders,          setIslanders]          = useState(ISLANDERS_INIT);
  const [onlineUsers,        setOnlineUsers]        = useState([]); // live from Firestore
  const [allUserPredictions, setAllUserPredictions] = useState([]);

  const matchmakerFav = matchmakerPredictions?.favCouple ?? null;

  // ── Subscribe to all users' top picks for community rankings ───────────────
  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, "users"),
      snap => setAllUserPredictions(snap.docs.map(d => d.data()).filter(u => u.predictions)),
      err  => console.error("Community rankings unavailable:", err),
    );
    return () => unsub();
  }, []);

  // ── Write own presence, subscribe to all online users ──────────────────────
  useEffect(() => {
    if (!uid) return;

    const presenceRef = doc(db, "globalPresence", uid);
    const me = {
      uid,
      displayName: displayName ?? "Guest",
      initial:     ((displayName ?? "Guest")[0] ?? "G").toUpperCase(),
      color:       uidColor(uid),
      photoURL:    photoURL ?? null,
      online:      true,
      lastSeen:    serverTimestamp(),
    };

    // Mark self online
    setDoc(presenceRef, me, { merge: true }).catch(console.error);

    // Live listener — every document in globalPresence where online == true
    const q     = query(collection(db, "globalPresence"), where("online", "==", true));
    const unsub = onSnapshot(q, snap => {
      setOnlineUsers(snap.docs.map(d => d.data()));
    }, console.error);

    // Mark offline when leaving
    function markOffline() {
      updateDoc(presenceRef, { online: false, lastSeen: serverTimestamp() }).catch(() => {});
    }
    window.addEventListener("beforeunload", markOffline);

    return () => {
      unsub();
      markOffline();
      window.removeEventListener("beforeunload", markOffline);
    };
  }, [uid, displayName, photoURL]);

  return (
    <div className="min-h-screen pb-24"
      style={{
        backgroundImage: `linear-gradient(rgba(10,20,40,0.28),rgba(10,20,40,0.32)),url(${C.sand})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundAttachment: "fixed",
        fontFamily: "'Josefin Sans',sans-serif",
      }}>
      <TopBar onSignOut={onSignOut} displayName={displayName} photoURL={photoURL} uid={uid} partyCode={partyCode} onlineUsers={onlineUsers} />

      <main className="max-w-6xl mx-auto px-3 sm:px-5 py-5">
        <AnimatePresence mode="wait">
          {activeTab === "villa" && (
            <VillaTab key="villa" islanders={islanders} setActiveTab={setActiveTab}
              predictions={matchmakerPredictions} onUpdatePredictions={onUpdatePredictions}
              allUserPredictions={allUserPredictions}
              partyCode={partyCode} displayName={displayName} uid={uid} photoURL={photoURL} />
          )}
          {activeTab === "islanders" && (
            <IslandersTab key="islanders" islanders={islanders} />
          )}
          {activeTab === "chat" && (
            <ChatTab key="chat" displayName={displayName} photoURL={photoURL} uid={uid} />
          )}
        </AnimatePresence>
      </main>

      <BottomNav activeTab={activeTab} setActiveTab={setActiveTab} />
    </div>
  );
}
