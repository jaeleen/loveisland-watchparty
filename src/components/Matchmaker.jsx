import { useState, useRef } from "react";
import { Heart, X, Trophy } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

// ─── Design tokens — in sync with Dashboard ───────────────────────────────────
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

// ─── All 12 OG islanders — names match their uploaded JPEG filenames ───────────
const ISLANDERS = [
  { id:"1",  name:"Aniya",   image:"/aniya.jpeg"   },
  { id:"2",  name:"Beatriz", image:"/beatriz.jpeg" },
  { id:"3",  name:"Bryce",   image:"/bryce.jpeg"   },
  { id:"4",  name:"Gabriel", image:"/gabriel.jpeg" },
  { id:"5",  name:"KC",      image:"/kc.jpeg"      },
  { id:"6",  name:"Kenzie",  image:"/kenzie.jpeg"  },
  { id:"7",  name:"Melanie", image:"/melanie.jpeg" },
  { id:"8",  name:"Sean",    image:"/sean.jpeg"    },
  { id:"9",  name:"Sincere", image:"/sincere.jpeg" },
  { id:"10", name:"Trinity", image:"/trinity.jpeg" },
  { id:"11", name:"Vasana",  image:"/vasana.jpeg"  },
  { id:"12", name:"Zach",    image:"/zach.jpeg"    },
];

// ─── Logo ─────────────────────────────────────────────────────────────────────
function Logo() {
  return (
    <h1 className="leading-none uppercase flex-shrink-0" style={{ fontFamily:"'Josefin Sans',sans-serif" }}>
      <span className="font-bold text-xl"  style={{ color:"white",                  letterSpacing:"0.15em" }}>love</span>
      <span className="font-light text-xl" style={{ color:"rgba(255,255,255,0.75)", letterSpacing:"0.02em" }}> Island</span>
      <span className="font-semibold text-[10px] align-super ml-1" style={{ color:C.amber }}>Matchmaker</span>
    </h1>
  );
}

// ─── IslanderGrid — reusable 3-col selection grid ─────────────────────────────
function IslanderGrid({ selected, onSelect, highlightColor = C.pink, badgeLabel }) {
  return (
    <div className="grid grid-cols-3 gap-3">
      {ISLANDERS.map(islander => {
        const sel = selected === islander.id;
        return (
          <button
            key={islander.id}
            onClick={() => onSelect(islander.id)}
            className="rounded-2xl overflow-hidden transition-all duration-200 active:scale-[0.96]"
            style={{
              background: sel ? `${highlightColor}20` : C.card,
              border:     sel ? `2.5px solid ${highlightColor}` : `1.5px solid ${C.cardBorder}`,
              boxShadow:  sel ? `0 0 0 4px ${highlightColor}30, ${C.cardShadow}` : C.cardShadow,
            }}
          >
            <div className="aspect-square w-full overflow-hidden">
              <img
                src={islander.image}
                alt={islander.name}
                className="w-full h-full object-cover object-top"
              />
            </div>
            <div className="py-2 px-1 text-center">
              <p className="text-xs font-bold" style={{ color: sel ? highlightColor : C.ink }}>
                {islander.name}
              </p>
              {sel && badgeLabel && (
                <span
                  className="inline-block text-[9px] font-black px-1.5 py-0.5 rounded-full mt-0.5"
                  style={{ background: highlightColor, color:"white" }}
                >
                  {badgeLabel}
                </span>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}

// ─── Main Matchmaker ──────────────────────────────────────────────────────────
export default function Matchmaker({ partyInfo, onComplete }) {
  const [step,        setStep]       = useState(1);   // 1 | 2 | 3 | 4 (done)
  const [favIslander, setFavIslander]= useState(null); // step 1 — single islander id
  const [dangerPick,  setDangerPick] = useState(null); // step 2 — islander id
  const [couplings,   setCouplings]  = useState([]);   // step 3 — [{p1, p2}]
  const [heartFlash,  setHeartFlash] = useState(null); // step 3 — animation trigger
  const [draggingId,  setDraggingId]  = useState(null);
  const [heartPos,    setHeartPos]    = useState(null); // {x,y} screen coords for burst
  const cardRefs = useRef({});

  // ── Coupling helpers ────────────────────────────────────────────────────────
  const coupledIds = new Set(couplings.flatMap(c => [c.p1, c.p2]));
  const available  = ISLANDERS.filter(i => !coupledIds.has(i.id));

  function handleDragEnd(islanderId, info) {
    setDraggingId(null);
    for (const [targetId, ref] of Object.entries(cardRefs.current)) {
      if (targetId === islanderId || !ref) continue;
      const rect = ref.getBoundingClientRect();
      const { x, y } = info.point;
      if (x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom) {
        setCouplings(prev => [...prev, { p1: islanderId, p2: targetId }]);
        const cx = (rect.left + rect.right) / 2;
        const cy = (rect.top + rect.bottom) / 2;
        setHeartPos({ x: cx, y: cy });
        setHeartFlash(Date.now());
        setTimeout(() => setHeartPos(null), 900);
        break;
      }
    }
  }

  function uncouple(idx) {
    setCouplings(prev => prev.filter((_, i) => i !== idx));
  }

  // ── Derived labels ──────────────────────────────────────────────────────────
  const progress   = Math.min((step / 3) * 100, 100);
  const favName    = ISLANDERS.find(i => i.id === favIslander)?.name;
  const dangerName = ISLANDERS.find(i => i.id === dangerPick)?.name;

  return (
    <div
      className="min-h-screen"
      style={{
        backgroundImage: `linear-gradient(rgba(10,20,40,0.28), rgba(10,20,40,0.32)), url(${C.sand})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundAttachment: "fixed",
        fontFamily: "'Josefin Sans', sans-serif",
      }}
    >
      {/* ── Sticky header ── */}
      <header className="sticky top-0 z-40 border-b"
        style={{ background:"rgba(8,60,90,0.45)", backdropFilter:"blur(20px)", borderColor:"rgba(255,255,255,0.12)" }}>
        <div className="max-w-2xl mx-auto px-4">
          <div className="h-14 flex items-center justify-between gap-3">
            <Logo />
            {step <= 3 && (
              <div className="flex items-center gap-2">
                {[1,2,3].map(s => (
                  <div
                    key={s}
                    className="rounded-full transition-all duration-300"
                    style={{ width: s === step ? 20 : 8, height: 8, background: s <= step ? C.pink : "rgba(255,255,255,0.3)" }}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
        {step <= 3 && (
          <div className="h-[2px]" style={{ background:"rgba(255,255,255,0.1)" }}>
            <div
              className="h-full transition-all duration-500"
              style={{ width:`${progress}%`, background:`linear-gradient(to right,${C.ocean},${C.pink})` }}
            />
          </div>
        )}
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8">

        {/* ══ STEP 1: Your Favorite Islander ══ */}
        {step === 1 && (
          <div>
            <div className="mb-6 text-center">
              <p className="text-[10px] font-bold uppercase mb-2" style={{ color:"rgba(255,255,255,0.55)", letterSpacing:"0.2em" }}>Step 1 of 3</p>
              <h2 className="text-2xl font-bold mb-1" style={{ color:"white" }}>Your Favorite Islander 💕</h2>
              <p className="text-sm" style={{ color:"rgba(255,255,255,0.7)" }}>Pick your client for this season</p>
            </div>

            <div className="mb-8">
              <IslanderGrid
                selected={favIslander}
                onSelect={setFavIslander}
                highlightColor={C.pink}
                badgeLabel="My Pick"
              />
            </div>

            <button
              onClick={() => favIslander && setStep(2)}
              disabled={!favIslander}
              className="w-full py-4 rounded-2xl font-bold transition-all active:scale-[0.98]"
              style={{
                background: favIslander ? `linear-gradient(135deg,${C.pink},${C.ocean})` : "rgba(255,255,255,0.15)",
                color:"white", border:"none", opacity: favIslander ? 1 : 0.5,
                letterSpacing:"0.08em", fontSize:13,
              }}
            >
              Next →
            </button>
          </div>
        )}

        {/* ══ STEP 2: First OG Islander Dumped ══ */}
        {step === 2 && (
          <div>
            <div className="mb-6 text-center">
              <p className="text-[10px] font-bold uppercase mb-2" style={{ color:"rgba(255,255,255,0.55)", letterSpacing:"0.2em" }}>Step 2 of 3</p>
              <h2 className="text-2xl font-bold mb-1" style={{ color:"white" }}>Most Likely First OG Dumped 🚨</h2>
              <p className="text-sm" style={{ color:"rgba(255,255,255,0.7)" }}>Who's most likely to be the first OG islander dumped?</p>
            </div>

            <div className="mb-8">
              <IslanderGrid
                selected={dangerPick}
                onSelect={setDangerPick}
                highlightColor={C.coral}
                badgeLabel="OUT"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setStep(1)}
                className="py-4 px-6 rounded-2xl font-bold text-sm"
                style={{ background:"rgba(255,255,255,0.12)", color:"rgba(255,255,255,0.8)", border:"1px solid rgba(255,255,255,0.2)", fontSize:13 }}
              >
                ← Back
              </button>
              <button
                onClick={() => dangerPick && setStep(3)}
                disabled={!dangerPick}
                className="flex-1 py-4 rounded-2xl font-bold transition-all active:scale-[0.98]"
                style={{
                  background: dangerPick ? `linear-gradient(135deg,${C.coral},${C.pink})` : "rgba(255,255,255,0.15)",
                  color:"white", border:"none", opacity: dangerPick ? 1 : 0.5,
                  letterSpacing:"0.08em", fontSize:13,
                }}
              >
                Next →
              </button>
            </div>
          </div>
        )}

        {/* ══ STEP 3: How would you couple them up? ══ */}
        {step === 3 && (
          <div>
            <div className="mb-6 text-center">
              <p className="text-[10px] font-bold uppercase mb-2" style={{ color:"rgba(255,255,255,0.55)", letterSpacing:"0.2em" }}>Step 3 of 3</p>
              <h2 className="text-2xl font-bold mb-1" style={{ color:"white" }}>How Would You Couple Up the Islanders? 💑</h2>
              <p className="text-sm min-h-[20px]" style={{ color:"rgba(255,255,255,0.7)" }}>
                Drag one islander and drop them onto their match
              </p>
            </div>

            {/* Available pool */}
            {available.length > 0 && (
              <div className="rounded-2xl overflow-hidden mb-4"
                style={{ background:C.card, border:`1px solid ${C.cardBorder}`, boxShadow:C.cardShadow }}>
                <div className="px-4 py-2.5 border-b" style={{ borderColor:"rgba(0,0,0,0.06)" }}>
                  <p className="text-[11px] font-bold uppercase tracking-wider" style={{ color:C.muted }}>
                    Available — {available.length} islanders
                  </p>
                </div>
                <div className="p-3 grid grid-cols-4 gap-2">
                  {available.map(islander => (
                    <motion.div
                      key={islander.id}
                      ref={el => { cardRefs.current[islander.id] = el; }}
                      drag
                      dragSnapToOrigin
                      dragElastic={0.15}
                      whileDrag={{ scale: 1.18, zIndex: 100, opacity: 0.88, cursor: "grabbing" }}
                      onDragStart={() => setDraggingId(islander.id)}
                      onDragEnd={(_, info) => handleDragEnd(islander.id, info)}
                      className="flex flex-col items-center gap-1.5 rounded-xl p-2 select-none"
                      style={{ cursor: "grab", touchAction: "none" }}
                    >
                      <div className="w-14 h-14 rounded-full overflow-hidden border-2"
                        style={{ borderColor: "rgba(0,0,0,0.08)", pointerEvents: "none" }}>
                        <img src={islander.image} alt={islander.name}
                          className="w-full h-full object-cover object-top" draggable={false} />
                      </div>
                      <span className="text-[10px] font-bold text-center leading-tight"
                        style={{ color: C.ink }}>{islander.name}</span>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}

            {/* Formed couples */}
            {couplings.length > 0 && (
              <div className="rounded-2xl overflow-hidden mb-4"
                style={{ background:C.card, border:`1px solid ${C.cardBorder}`, boxShadow:C.cardShadow }}>
                <div className="px-4 py-2.5 border-b" style={{ borderColor:"rgba(0,0,0,0.06)" }}>
                  <p className="text-[11px] font-bold uppercase tracking-wider" style={{ color:C.muted }}>
                    Your Couples — {couplings.length} pair{couplings.length !== 1 ? "s" : ""} formed
                  </p>
                </div>
                <div className="p-3 space-y-2">
                  {couplings.map((couple, idx) => {
                    const p1 = ISLANDERS.find(i => i.id === couple.p1);
                    const p2 = ISLANDERS.find(i => i.id === couple.p2);
                    return (
                      <motion.div
                        key={`${couple.p1}-${couple.p2}`}
                        initial={{ opacity:0, scale:.93 }}
                        animate={{ opacity:1, scale:1 }}
                        transition={{ duration:.25 }}
                        className="flex items-center gap-3 px-3 py-2.5 rounded-xl"
                        style={{ background:`${C.pink}10`, border:`1px solid ${C.pink}25` }}
                      >
                        {/* Overlapping avatars */}
                        <div className="flex -space-x-2 flex-shrink-0">
                          <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-white">
                            <img src={p1?.image} alt={p1?.name} className="w-full h-full object-cover object-top" />
                          </div>
                          <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-white">
                            <img src={p2?.image} alt={p2?.name} className="w-full h-full object-cover object-top" />
                          </div>
                        </div>
                        <Heart size={13} fill={C.pink} color={C.pink} className="flex-shrink-0" />
                        <span className="text-sm font-bold flex-1" style={{ color:C.ink }}>
                          {p1?.name} & {p2?.name}
                        </span>
                        <button
                          onClick={() => uncouple(idx)}
                          className="p-1.5 rounded-full hover:bg-slate-100 transition-colors flex-shrink-0"
                        >
                          <X size={12} color={C.muted} />
                        </button>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            )}

            {couplings.length === 0 && (
              <p className="text-center text-sm mb-4" style={{ color:"rgba(255,255,255,0.45)" }}>
                Drag one islander onto another to form your first couple 💘
              </p>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => setStep(2)}
                className="py-4 px-6 rounded-2xl font-bold text-sm"
                style={{ background:"rgba(255,255,255,0.12)", color:"rgba(255,255,255,0.8)", border:"1px solid rgba(255,255,255,0.2)", fontSize:13 }}
              >
                ← Back
              </button>
              <button
                onClick={() => couplings.length > 0 && setStep(4)}
                disabled={couplings.length === 0}
                className="flex-1 py-4 rounded-2xl font-bold transition-all active:scale-[0.98]"
                style={{
                  background: couplings.length > 0 ? `linear-gradient(135deg,${C.ocean},${C.pink})` : "rgba(255,255,255,0.15)",
                  color:"white", border:"none", opacity: couplings.length > 0 ? 1 : 0.5,
                  letterSpacing:"0.08em", fontSize:13,
                }}
              >
                Submit My Predictions 🏝️
              </button>
            </div>
          </div>
        )}

        {/* ══ STEP 4: Done ══ */}
        {step === 4 && (
          <div className="flex flex-col items-center text-center py-6">
            <div
              className="w-20 h-20 rounded-full flex items-center justify-center mb-6"
              style={{ background:`linear-gradient(135deg,${C.pink},${C.ocean})`, boxShadow:`0 8px 32px ${C.pink}50` }}
            >
              <Trophy size={36} color="white" />
            </div>

            <h2 className="text-3xl font-bold mb-3" style={{ color:"white" }}>Predictions in! 🎉</h2>
            <p className="text-base mb-2" style={{ color:"rgba(255,255,255,0.85)" }}>
              Rooting for <strong style={{ color:C.pink }}>{favName}</strong> this season
            </p>
            <p className="text-sm mb-8" style={{ color:"rgba(255,255,255,0.6)" }}>Let's see if your reads are right 👀</p>

            {/* Summary card */}
            <div
              className="w-full rounded-2xl p-5 mb-8 text-left"
              style={{ background:C.card, border:`1px solid ${C.cardBorder}`, boxShadow:C.cardShadow }}
            >
              <p className="text-[10px] font-bold uppercase mb-4" style={{ color:C.muted, letterSpacing:"0.15em" }}>
                Your Predictions
              </p>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm" style={{ color:C.slate }}>Favourite Islander</span>
                  <span className="text-sm font-bold" style={{ color:C.ink }}>{favName} 💕</span>
                </div>
                <div className="h-px" style={{ background:"rgba(0,0,0,0.06)" }} />
                <div className="flex items-center justify-between">
                  <span className="text-sm" style={{ color:C.slate }}>First OG Dumped</span>
                  <span className="text-sm font-bold" style={{ color:C.coral }}>{dangerName} 🚨</span>
                </div>
                <div className="h-px" style={{ background:"rgba(0,0,0,0.06)" }} />
                <div>
                  <span className="text-sm block mb-2" style={{ color:C.slate }}>Your Couplings</span>
                  <div className="space-y-1">
                    {couplings.map((c, i) => {
                      const p1 = ISLANDERS.find(x => x.id === c.p1);
                      const p2 = ISLANDERS.find(x => x.id === c.p2);
                      return (
                        <p key={i} className="text-sm font-bold" style={{ color:C.amber }}>
                          {p1?.name} & {p2?.name} 💑
                        </p>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            <button
              onClick={() => onComplete({ favIslander, dangerPick, couplings })}
              className="w-full py-4 rounded-2xl font-bold transition-all active:scale-[0.98]"
              style={{
                background:`linear-gradient(135deg,${C.ocean},${C.pink})`,
                color:"white", border:"none", fontSize:14, letterSpacing:"0.08em",
              }}
            >
              Enter the Villa 🏝️
            </button>
          </div>
        )}

      </main>

      {/* ── Positioned heart burst at drop location ── */}
      <AnimatePresence>
        {heartFlash && heartPos && (
          <motion.div
            key={heartFlash}
            className="fixed pointer-events-none z-[9999]"
            style={{ left: heartPos.x, top: heartPos.y, transform: "translate(-50%,-50%)" }}
            initial={{ scale:0, opacity:1 }}
            animate={{ scale:4, opacity:0 }}
            exit={{ opacity:0 }}
            transition={{ duration:.75, ease:"easeOut" }}
            onAnimationComplete={() => { setHeartFlash(null); setHeartPos(null); }}
          >
            <span style={{ fontSize:"3.5rem", lineHeight:1 }}>❤️</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
