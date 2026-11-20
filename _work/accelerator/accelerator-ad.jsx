const C = {
  bg: '#161826', surface: '#232532', text: '#e9e9ed', accent: '#9184d9',
  n300: '#cfd3e5', n400: '#b2b6ca', n500: '#9397ab', n600: '#75798c', n700: '#595d6c', n800: '#3f424d', n900: '#292b31',
  a100: '#f5f4ff', a200: '#e7e5fe', a300: '#d2cefd', a400: '#b5abfc', a600: '#796cbf', a700: '#5d5294', a800: '#423a6a', a900: '#2b2741',
  section: '#262a60', glow: '#353b80', ghost: '#4c5397',
};
const FONT = '"Inter", system-ui, sans-serif';
const LOGO = 'assets/evolve-logo-light.png';
const MARK = 'assets/evolve-mark-light.png';

const prog = (T, s, d) => clamp((T - s) / d, 0, 1);
const MOTION = {
  enter: (T, s, d = 0.6) => Easing.easeOutCubic(prog(T, s, d)),
  exit: (T, s, d = 0.4) => Easing.easeInCubic(prog(T, s, d)),
  pop: (T, s, d = 0.55) => Easing.easeOutBack(prog(T, s, d)),
};
const vis = (T, a, b, fin = 0.4, fout = 0.4) => MOTION.enter(T, a, fin) * (1 - MOTION.exit(T, b - fout, fout));

function Pop({ T, at, children, style, dy = 28 }) {
  const p = MOTION.pop(T, at);
  const o = MOTION.enter(T, at, 0.3);
  return <div style={{ ...style, opacity: o, transform: `translateY(${(1 - p) * dy}px) scale(${0.95 + 0.05 * p})` }}>{children}</div>;
}

const Check = ({ size = 28, color = C.a300 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"><path d="M5 12.5l4.5 4.5L19 7.5" stroke={color} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
);
const Avatar = ({ label, size = 64, bg = C.n800, color = C.n300 }) => (
  <div style={{ width: size, height: size, borderRadius: '50%', background: bg, color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: size * 0.38, fontWeight: 500, flexShrink: 0 }}>{label}</div>
);
const Tile = ({ h = 240, children, style }) => (
  <div style={{ height: h, borderRadius: 14, position: 'relative', overflow: 'hidden', background: `radial-gradient(circle at 50% 42%, ${C.a700} 0%, ${C.a800} 32%, ${C.a900} 72%)`, boxShadow: `0 0 0 1px ${C.n800}`, ...style }}>{children}</div>
);
const Bar = ({ w, h = 16, c = C.n800 }) => <div style={{ width: w, height: h, borderRadius: h / 2, background: c }}></div>;

/* ---------------- headlines ---------------- */
function Kicker({ text }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 18, marginBottom: 26 }}>
      <div style={{ width: 44, height: 3, background: C.accent, borderRadius: 2 }}></div>
      <div style={{ fontSize: 32, fontWeight: 500, color: C.a300, letterSpacing: '0.02em' }}>{text}</div>
    </div>
  );
}
function Headline({ T, from, to, kicker, title, sub, top = 150, size = 76 }) {
  const o = vis(T, from + 0.05, to, 0.5, 0.35);
  if (o <= 0) return null;
  const a = MOTION.enter(T, from + 0.05, 0.7);
  const b = MOTION.enter(T, from + 0.6, 0.7);
  return (
    <div style={{ position: 'absolute', left: 96, top, width: 888, opacity: o }}>
      {kicker && <div style={{ opacity: a, transform: `translateX(${(1 - a) * -30}px)` }}><Kicker text={kicker} /></div>}
      <div style={{ fontSize: size, lineHeight: 1.08, fontWeight: 500, letterSpacing: '-0.025em', color: C.text, textWrap: 'pretty', transform: `translateY(${(1 - a) * 36}px)` }}>{title}</div>
      {sub && <div style={{ marginTop: 28, fontSize: 38, lineHeight: 1.3, color: C.n400, textWrap: 'pretty', opacity: b, transform: `translateY(${(1 - b) * 20}px)` }}>{sub}</div>}
    </div>
  );
}

/* ---------------- phone screens ---------------- */
function StatusBar() {
  return (
    <div style={{ height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 40px', fontSize: 24, fontWeight: 500, color: C.n300 }}>
      <span>11:42</span>
      <div style={{ width: 130, height: 34, borderRadius: 20, background: '#0f1019' }}></div>
      <span style={{ display: 'flex', gap: 6 }}><Bar w={26} h={14} c={C.n500} /></span>
    </div>
  );
}
function Screen({ o, children }) {
  if (o <= 0) return null;
  return <div style={{ position: 'absolute', inset: 0, top: 64, opacity: o, padding: '12px 30px' }}>{children}</div>;
}

function StatusScreen({ T, s, e }) {
  const fill = prog(T, s + 0.2, 1.9);
  const gone = MOTION.exit(T, s + 2.1, 0.5);
  const msg = MOTION.enter(T, s + 2.45, 0.5);
  return (
    <Screen o={vis(T, s - 1, e + 0.2)}>
      <div style={{ display: 'flex', gap: 8, marginBottom: 22 }}>
        {[0, 1, 2].map(i => (
          <div key={i} style={{ flex: 1, height: 6, borderRadius: 3, background: C.n800, overflow: 'hidden' }}>
            <div style={{ width: `${i === 0 ? fill * 100 : 0}%`, height: '100%', background: C.n300 }}></div>
          </div>
        ))}
      </div>
      <div style={{ opacity: 1 - gone, transform: `scale(${1 - gone * 0.06})`, filter: `blur(${gone * 8}px)` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 18, marginBottom: 26 }}>
          <Avatar label="YB" size={60} bg={C.a800} color={C.a200} />
          <div>
            <div style={{ fontSize: 28, fontWeight: 500 }}>Your business</div>
            <div style={{ fontSize: 22, color: C.n500 }}>23 hours ago</div>
          </div>
        </div>
        <Tile h={640}>
          <div style={{ position: 'absolute', left: 36, bottom: 40, right: 36 }}>
            <div style={{ fontSize: 56, fontWeight: 600, letterSpacing: '-0.02em', lineHeight: 1 }}>New stock in!</div>
            <div style={{ fontSize: 26, color: C.a200, marginTop: 14 }}>Send me a message to order</div>
          </div>
        </Tile>
      </div>
      <div style={{ position: 'absolute', left: 0, right: 0, top: 360, textAlign: 'center', opacity: msg, transform: `translateY(${(1 - msg) * 20}px)` }}>
        <div style={{ width: 96, height: 96, borderRadius: '50%', margin: '0 auto 26px', boxShadow: `0 0 0 3px ${C.n700}`, position: 'relative' }}>
          <div style={{ position: 'absolute', left: 46, top: 22, width: 4, height: 30, background: C.n500, borderRadius: 2 }}></div>
          <div style={{ position: 'absolute', left: 46, top: 48, width: 22, height: 4, background: C.n500, borderRadius: 2 }}></div>
        </div>
        <div style={{ fontSize: 34, fontWeight: 500, color: C.n300 }}>This status has expired</div>
      </div>
    </Screen>
  );
}

const CHATS = [
  ['A', 'Amaka', 'Is this still available?', '8:15 AM'],
  ['T', 'Tunde', 'How much for two?', '10:02 AM'],
  ['B', 'Blessing', 'Do you deliver?', '1:30 PM'],
  ['K', 'Kemi', 'Hello? Are you there?', '6:48 PM'],
  ['M', 'Musa', 'No problem, I found it elsewhere.', '11:42 PM'],
];
function ChatsScreen({ T, s, e }) {
  const shown = CHATS.filter((_, i) => T >= s + 0.25 + i * 0.42).length;
  return (
    <Screen o={vis(T, s - 0.2, e + 0.2)}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '8px 0 24px' }}>
        <div style={{ fontSize: 44, fontWeight: 500 }}>Chats</div>
        <div style={{ minWidth: 52, height: 52, padding: '0 14px', borderRadius: 26, background: C.a700, color: C.a100, fontSize: 26, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{shown}</div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column-reverse' }}>
        {CHATS.map(([ini, name, msg, time], i) => {
          const last = i === CHATS.length - 1;
          return (
            <Pop key={i} T={T} at={s + 0.25 + i * 0.42}>
              <div style={{ display: 'flex', gap: 20, alignItems: 'center', padding: '20px 0', boxShadow: `inset 0 -1px 0 ${C.n900}` }}>
                <Avatar label={ini} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 27, fontWeight: 500 }}>
                    <span>{name}</span><span style={{ fontSize: 21, color: C.a300, fontWeight: 400, whiteSpace: 'nowrap', marginLeft: 12 }}>{time}</span>
                  </div>
                  <div style={{ fontSize: 24, color: last ? C.n500 : C.n300, marginTop: 4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontStyle: last ? 'italic' : 'normal' }}>{msg}</div>
                </div>
                {!last && <div style={{ width: 20, height: 20, borderRadius: 10, background: C.accent }}></div>}
              </div>
            </Pop>
          );
        })}
      </div>
    </Screen>
  );
}

function SearchScreen({ T, s, e }) {
  const q = 'bags and shoes near me';
  const n = Math.floor(q.length * prog(T, s + 0.15, 0.9));
  const caret = Math.floor(T * 2.5) % 2 === 0 && n < q.length + 1;
  return (
    <Screen o={vis(T, s - 0.2, e + 0.2)}>
      <div style={{ height: 84, borderRadius: 42, background: C.surface, boxShadow: `0 0 0 1px ${C.n800}`, display: 'flex', alignItems: 'center', gap: 18, padding: '0 30px', margin: '12px 0 34px' }}>
        <svg width="30" height="30" viewBox="0 0 24 24" fill="none"><circle cx="10.5" cy="10.5" r="6.5" stroke={C.n400} strokeWidth="2.2" /><path d="M15.5 15.5L20 20" stroke={C.n400} strokeWidth="2.2" strokeLinecap="round" /></svg>
        <div style={{ fontSize: 28, color: C.text }}>{q.slice(0, n)}<span style={{ opacity: caret ? 1 : 0, color: C.accent }}>|</span></div>
      </div>
      {[0, 1, 2].map(i => (
        <Pop key={i} T={T} at={s + 1.05 + i * 0.16}>
          <div style={{ display: 'flex', gap: 22, padding: 22, marginBottom: 16, borderRadius: 14, background: C.surface }}>
            <div style={{ width: 96, height: 96, borderRadius: 12, background: C.n800 }}></div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, justifyContent: 'center' }}>
              <Bar w={220 - i * 30} h={20} c={C.n700} /><Bar w={300} h={14} /><Bar w={180} h={14} />
            </div>
          </div>
        </Pop>
      ))}
      <Pop T={T} at={s + 1.75}>
        <div style={{ marginTop: 12, padding: '34px 28px', borderRadius: 14, border: `2px dashed ${C.n700}`, textAlign: 'center' }}>
          <div style={{ fontSize: 30, fontWeight: 500, color: C.n300 }}>Your business</div>
          <div style={{ fontSize: 24, color: C.n500, marginTop: 6 }}>No results</div>
        </div>
      </Pop>
    </Screen>
  );
}

function AdsScreen({ T, s, e }) {
  const count = Math.round(2480 * MOTION.enter(T, s + 0.7, 2.4));
  const tap = prog(T, s + 2.7, 0.5);
  return (
    <Screen o={vis(T, s - 0.7, e + 0.2)}>
      <Pop T={T} at={s + 0.05}>
        <div style={{ borderRadius: 18, background: C.surface, padding: 22, boxShadow: `0 0 0 1px ${C.n800}` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 18 }}>
            <Avatar label="YB" size={56} bg={C.a800} color={C.a200} />
            <div>
              <div style={{ fontSize: 26, fontWeight: 500 }}>Your business</div>
              <div style={{ fontSize: 20, color: C.n500 }}>Sponsored</div>
            </div>
          </div>
          <Tile h={420}></Tile>
          <div style={{ fontSize: 26, margin: '20px 4px', color: C.n300 }}>New arrivals this week. Tap to see more.</div>
          <div style={{ position: 'relative', height: 72, borderRadius: 10, border: `2px solid ${C.accent}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 27, fontWeight: 500, color: C.a200, overflow: 'hidden', background: `rgba(145,132,217,${0.25 * Math.sin(tap * Math.PI)})` }}>
            Chat on WhatsApp
          </div>
        </div>
      </Pop>
      <Pop T={T} at={s + 0.6}>
        <div style={{ marginTop: 26, display: 'flex', alignItems: 'baseline', gap: 14 }}>
          <div style={{ fontSize: 52, fontWeight: 500, color: C.a300, fontVariantNumeric: 'tabular-nums' }}>{count.toLocaleString('en-US')}</div>
          <div style={{ fontSize: 24, color: C.n400 }}>people saw it today</div>
        </div>
      </Pop>
    </Screen>
  );
}

const PRODUCTS = ['Blue bag', 'Leather sandals', 'Gold earrings', 'Wrist watch'];
function ShopScreen({ T, s, e }) {
  const scroll = MOTION.enter(T, s + 1.6, 1.8) * 120;
  return (
    <Screen o={vis(T, s - 0.2, e + 0.2)}>
      <div style={{ height: 60, borderRadius: 30, background: C.surface, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 23, color: C.n400, marginBottom: 26 }}>yourbusiness.com</div>
      <div style={{ height: 1000, overflow: 'hidden' }}><div style={{ transform: `translateY(${-scroll}px)` }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div style={{ fontSize: 44, fontWeight: 500 }}>Shop</div>
          <div style={{ fontSize: 21, color: C.a200, padding: '8px 16px', borderRadius: 20, whiteSpace: 'nowrap', background: C.a900, boxShadow: `0 0 0 1px ${C.a700}` }}>Open 24 hours</div>
        </div>
        <div style={{ display: 'flex', gap: 10, marginBottom: 24 }}>
          {['All', 'New in', 'Best sellers'].map((c, i) => (
            <div key={c} style={{ whiteSpace: 'nowrap', fontSize: 21, padding: '8px 18px', borderRadius: 20, color: i === 0 ? C.a100 : C.n400, background: i === 0 ? C.a700 : C.surface }}>{c}</div>
          ))}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
          {PRODUCTS.map((p, i) => (
            <Pop key={p} T={T} at={s + 0.25 + i * 0.15}>
              <Tile h={230}></Tile>
              <div style={{ fontSize: 24, fontWeight: 500, margin: '12px 2px 10px' }}>{p}</div>
              <div style={{ height: 50, borderRadius: 8, border: `1.5px solid ${C.accent}`, fontSize: 19, color: C.a200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Order on WhatsApp</div>
            </Pop>
          ))}
        </div>
      </div></div>
    </Screen>
  );
}

function Bubble({ T, at, out, children, meta }) {
  return (
    <Pop T={T} at={at} dy={20} style={{ display: 'flex', flexDirection: 'column', alignItems: out ? 'flex-end' : 'flex-start', marginBottom: 18 }}>
      <div style={{ maxWidth: '82%', padding: '18px 22px', borderRadius: 20, borderBottomRightRadius: out ? 6 : 20, borderBottomLeftRadius: out ? 20 : 6, background: out ? C.a800 : C.n800, color: out ? C.a100 : C.text, fontSize: 26, lineHeight: 1.35 }}>{children}</div>
      {meta && <div style={{ fontSize: 20, color: out ? C.a300 : C.n500, marginTop: 8, padding: '0 6px' }}>{meta}</div>}
    </Pop>
  );
}
function ChatScreen({ T, s, e }) {
  const typing = T > s + 0.85 && T < s + 1.35;
  const dots = [0, 1, 2].map(i => 0.35 + 0.65 * Math.abs(Math.sin((T * 5) - i * 0.7)));
  return (
    <Screen o={vis(T, s - 0.2, e + 0.2)}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, paddingBottom: 20, marginBottom: 24, boxShadow: `inset 0 -1px 0 ${C.n900}` }}>
        <Avatar label="YB" size={60} bg={C.a800} color={C.a200} />
        <div>
          <div style={{ fontSize: 27, fontWeight: 500 }}>Your business</div>
          <div style={{ fontSize: 21, color: C.a300, whiteSpace: 'nowrap' }}>Online, day and night</div>
        </div>
      </div>
      <Bubble T={T} at={s + 0.25} meta="11:42 PM">Hi! Is the blue bag still available?</Bubble>
      {typing && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 18 }}>
          <div style={{ display: 'flex', gap: 8, padding: '22px 26px', borderRadius: 20, background: C.a800 }}>
            {dots.map((d, i) => <div key={i} style={{ width: 12, height: 12, borderRadius: 6, background: C.a300, opacity: d }}></div>)}
          </div>
        </div>
      )}
      <Bubble T={T} at={s + 1.35} out meta="Replied in 3 seconds">Yes, it's in stock! Would you like me to keep it for you?</Bubble>
      <Bubble T={T} at={s + 2.3} meta="11:43 PM">Yes please</Bubble>
      <Bubble T={T} at={s + 2.9} out meta="11:43 PM">Done. Your order is confirmed and we'll deliver tomorrow.</Bubble>
    </Screen>
  );
}

const CUSTOMERS = [['A', 'Amaka', 'Blue bag'], ['T', 'Tunde', 'Leather sandals'], ['K', 'Kemi', 'Gold earrings'], ['B', 'Blessing', 'Wrist watch'], ['M', 'Musa', 'Blue bag']];
function CustomersScreen({ T, s, e }) {
  const note = MOTION.enter(T, s + 1.15, 0.6);
  return (
    <Screen o={vis(T, s - 0.2, e + 0.2)}>
      <div style={{ fontSize: 44, fontWeight: 500, margin: '8px 0 6px' }}>Your customers</div>
      <div style={{ fontSize: 23, color: C.n500, marginBottom: 20 }}>Everyone who has bought from you</div>
      <div style={{ opacity: note > 0 ? 1 - note * 0.35 : 1 }}>
        {CUSTOMERS.map(([ini, name, item], i) => (
          <Pop key={i} T={T} at={s + 0.15 + i * 0.12}>
            <div style={{ display: 'flex', gap: 18, alignItems: 'center', padding: '16px 0', boxShadow: `inset 0 -1px 0 ${C.n900}` }}>
              <Avatar label={ini} size={56} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 26, fontWeight: 500 }}>{name}</div>
                <div style={{ fontSize: 21, color: C.n500 }}>Bought: {item}</div>
              </div>
              {i < 3 && (
                <Pop T={T} at={s + 2.2 + i * 0.3} dy={10}>
                  <div style={{ fontSize: 20, fontWeight: 500, color: C.a100, background: C.a700, padding: '8px 14px', borderRadius: 16 }}>Ordered again</div>
                </Pop>
              )}
            </div>
          </Pop>
        ))}
      </div>
      {note > 0 && (
        <div style={{ position: 'absolute', left: 22, right: 22, top: 4, opacity: note, transform: `translateY(${(1 - note) * -80}px)`, borderRadius: 20, padding: '24px 26px', background: C.surface, boxShadow: `0 0 0 1.5px ${C.accent}, 0 20px 50px rgba(0,0,0,0.6)` }}>
          <div style={{ fontSize: 20, color: C.a300, marginBottom: 8 }}>Message sent to all your customers</div>
          <div style={{ fontSize: 30, fontWeight: 500 }}>New stock just arrived!</div>
          <div style={{ fontSize: 24, color: C.n300, marginTop: 4 }}>Come and see what's new before it sells out.</div>
        </div>
      )}
    </Screen>
  );
}

function Phone({ T, CUES, children }) {
  const inP = MOTION.enter(T, 0.05, 0.9);
  const off = T < CUES.Ads - 0.5 ? MOTION.exit(T, CUES.Reveal - 0.15, 0.6) : 1 - MOTION.enter(T, CUES.Ads - 0.5, 0.8);
  const out = MOTION.exit(T, CUES.Keep - 0.15, 0.6);
  const y = (1 - inP) * 240 + off * 1300 + out * 1300 - T * 2.2;
  const sc = 1 + 0.012 * Math.sin(T * 0.35);
  return (
    <div style={{ position: 'absolute', left: 250, top: 740, width: 580, height: 1240, opacity: inP, transform: `translateY(${y}px) scale(${sc})`, transformOrigin: '50% 0%' }}>
      <div style={{ position: 'absolute', inset: 0, borderRadius: 76, background: C.n900, boxShadow: `0 0 0 2px ${C.n700}, 0 50px 120px rgba(0,0,0,0.6)` }}></div>
      <div style={{ position: 'absolute', inset: 14, borderRadius: 64, background: C.bg, overflow: 'hidden', fontFamily: FONT, color: C.text }}>
        <StatusBar />
        {children}
      </div>
    </div>
  );
}

/* ---------------- full-frame beats ---------------- */
function Reveal({ T, s, e }) {
  const o = vis(T, s + 0.25, e - 0.55, 0.5, 0.35);
  if (o <= 0) return null;
  const a = MOTION.enter(T, s + 0.3, 0.8);
  const line = MOTION.enter(T, s + 0.7, 1.0);
  const b = MOTION.enter(T, s + 1.1, 0.7);
  return (
    <div style={{ position: 'absolute', left: 96, top: 380, width: 888, opacity: o }}>
      <img src={LOGO} alt="Evolve Automation Agency" style={{ width: 230, marginBottom: 70, opacity: a, transform: `translateY(${(1 - a) * -20}px)` }} />
      <div style={{ opacity: a }}><Kicker text="Introducing" /></div>
      <div style={{ fontSize: 124, lineHeight: 1.0, fontWeight: 500, letterSpacing: '-0.035em', transform: `translateY(${(1 - a) * 40}px)` }}>The Business Accelerator Plan</div>
      <div style={{ height: 2, margin: '48px 0 44px', width: `${line * 100}%`, background: `linear-gradient(to right, ${C.a300}, ${C.a300} calc(100% - 48px), transparent)` }}></div>
      <div style={{ fontSize: 42, lineHeight: 1.3, color: C.a200, opacity: b, transform: `translateY(${(1 - b) * 20}px)`, textWrap: 'pretty' }}>One simple system that brings customers to you, answers them and keeps them coming back.</div>
    </div>
  );
}

const KEEP = ['Your own website', 'Your pages on Instagram, Facebook, TikTok and Google', 'Your official WhatsApp business line', 'Your full list of customers'];
function Keep({ T, s, e }) {
  const o = vis(T, s + 0.3, e, 0.4, 0.4);
  if (o <= 0) return null;
  return (
    <div style={{ position: 'absolute', left: 96, top: 800, width: 888, opacity: o, display: 'flex', flexDirection: 'column', gap: 40 }}>
      {KEEP.map((k, i) => (
        <Pop key={k} T={T} at={s + 0.8 + i * 0.28}>
          <div style={{ display: 'flex', gap: 30, alignItems: 'center' }}>
            <div style={{ width: 76, height: 76, borderRadius: '50%', flexShrink: 0, boxShadow: `0 0 0 2px ${C.accent}, 0 0 30px rgba(145,132,217,0.35)`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Check size={40} /></div>
            <div style={{ fontSize: 42, lineHeight: 1.25, color: C.text, textWrap: 'pretty' }}>{k}</div>
          </div>
        </Pop>
      ))}
    </div>
  );
}

function Close({ T, s }) {
  const o = MOTION.enter(T, s + 0.2, 0.5);
  if (o <= 0) return null;
  const a = MOTION.enter(T, s + 0.2, 0.8);
  const b = MOTION.enter(T, s + 1.0, 0.8);
  const c = MOTION.pop(T, s + 1.6);
  const glow = 0.35 + 0.15 * Math.sin((T - s) * 2.4);
  return (
    <div style={{ position: 'absolute', inset: 0, opacity: o }}>
      <div style={{ position: 'absolute', left: 96, top: 250, width: 888, fontSize: 104, lineHeight: 1.04, fontWeight: 500, letterSpacing: '-0.035em', transform: `translateY(${(1 - a) * 40}px)`, opacity: a }}>
        More customers.<br /><span style={{ color: C.a300 }}>Less time on your phone.</span>
      </div>
      <div style={{ position: 'absolute', left: 96, top: 820, width: 888, opacity: b, transform: `translateY(${(1 - b) * 24}px)` }}>
        <img src={LOGO} alt="Evolve Automation Agency" style={{ width: 260, marginBottom: 44 }} />
        <div style={{ fontSize: 60, fontWeight: 500, letterSpacing: '-0.02em', lineHeight: 1.1 }}>Business Accelerator Plan</div>
      </div>
      <div style={{ position: 'absolute', left: 96, top: 1250, opacity: MOTION.enter(T, s + 1.6, 0.3), transform: `scale(${0.94 + 0.06 * c})`, transformOrigin: '0 50%' }}>
        <div style={{ height: 112, padding: '0 56px', borderRadius: 14, border: `2px solid ${C.accent}`, display: 'flex', alignItems: 'center', fontSize: 40, fontWeight: 500, color: C.a100, boxShadow: `0 0 40px rgba(145,132,217,${glow})` }}>Message us on WhatsApp</div>
        <div style={{ fontSize: 36, color: C.n400, marginTop: 34 }}>evolve.ng</div>
      </div>
    </div>
  );
}

/* ---------------- backdrop ---------------- */
function Glow({ x, y, r, color, o }) {
  return <div style={{ position: 'absolute', left: x - r, top: y - r, width: r * 2, height: r * 2, borderRadius: '50%', opacity: o, background: `radial-gradient(circle, ${color} 0%, transparent 68%)` }}></div>;
}
function Backdrop({ T, CUES, end }) {
  const warm = MOTION.enter(T, CUES.Reveal - 0.2, 1.4);
  const section = vis(T, CUES.Reveal - 0.1, CUES.Ads + 0.1, 0.7, 0.6) + MOTION.enter(T, CUES.CTA, 1.0) * 0.75 * (1 - MOTION.exit(T, end - 0.6, 0.6));
  const sweep = prog(T, CUES.Reveal + 0.2, 1.6);
  const w = T * 0.25;
  const markO = 0.035 + 0.035 * warm;
  const markRot = -14 + Math.sin(T * 0.12) * 4;
  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
      <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(170deg, #1d2033 0%, ${C.bg} 45%, #121420 100%)` }}></div>
      <Glow x={820 + Math.sin(w) * 140} y={1250 + Math.cos(w * 0.8) * 160} r={760} color={C.glow} o={0.55 + 0.25 * warm} />
      <Glow x={140 + Math.cos(w * 0.9) * 120} y={380 + Math.sin(w * 1.1) * 140} r={620} color={C.n800} o={0.5 * (1 - warm)} />
      <Glow x={140 + Math.cos(w * 0.9) * 120} y={380 + Math.sin(w * 1.1) * 140} r={620} color={C.a800} o={0.7 * warm} />
      <Glow x={560 + Math.sin(w * 1.3) * 200} y={1780} r={520} color={C.accent} o={0.10 + 0.16 * warm} />
      <div style={{ position: 'absolute', inset: 0, opacity: 0.5, backgroundImage: `radial-gradient(${C.n700} 1.6px, transparent 1.8px)`, backgroundSize: '44px 44px', backgroundPosition: `0px ${-T * 6}px` }}></div>
      <div style={{ position: 'absolute', inset: 0, background: `radial-gradient(1100px 1500px at 55% 60%, transparent 30%, ${C.bg} 85%)` }}></div>
      <div style={{ position: 'absolute', inset: 0, opacity: Math.min(1, section), background: `radial-gradient(1200px 1100px at 25% 35%, ${C.ghost} 0%, ${C.glow} 30%, ${C.section} 70%)` }}></div>
      <img src={MARK} alt="" style={{ position: 'absolute', left: 520 + Math.sin(T * 0.1) * 30, top: 120 - T * 3, width: 900, opacity: markO * (1 - 0.45 * Math.min(1, section)), transform: `rotate(${markRot}deg)` }} />
      <div style={{ position: 'absolute', left: -600 + sweep * 2400, top: -400, width: 380, height: 2800, opacity: Math.sin(sweep * Math.PI) * 0.35, transform: 'rotate(18deg)', background: `linear-gradient(to right, transparent, ${C.a300}, transparent)` }}></div>
    </div>
  );
}

function Brand({ T, CUES }) {
  const o = vis(T, 0.3, CUES.Reveal + 0.1, 0.6, 0.4) + vis(T, CUES.Ads, CUES.CTA + 0.1, 0.6, 0.4);
  if (o <= 0) return null;
  return (
    <div style={{ position: 'absolute', left: 96, top: 58, display: 'flex', alignItems: 'center', gap: 16, opacity: o * 0.9 }}>
      <img src={MARK} alt="" style={{ height: 50 }} />
      <div style={{ fontSize: 24, fontWeight: 600, letterSpacing: '0.18em', color: C.n300 }}>EVOLVE</div>
    </div>
  );
}

/* ---------------- composition ---------------- */
function Piece() {
  const { T, CUES, time, authoredTotal } = useComposition();
  const end = authoredTotal;
  const master = MOTION.enter(T, 0, 0.35) * (1 - MOTION.exit(T, end - 0.5, 0.5));
  return (
    <div data-screen-label={`${Math.floor(time)}s`} style={{ position: 'absolute', inset: 0, overflow: 'hidden', background: C.bg, fontFamily: FONT, color: C.text }}>
      <Backdrop T={T} CUES={CUES} end={end} />
      <div style={{ position: 'absolute', inset: 0, opacity: master }}>
        <Brand T={T} CUES={CUES} />
        <Headline T={T} from={CUES.Hook} to={CUES.Missed} title="Still selling only on your WhatsApp status?" sub="Your posts disappear after 24 hours." />
        <Headline T={T} from={CUES.Missed} to={CUES.Unfound} title="Customers message while you're busy." sub="By the time you reply, many have bought elsewhere." />
        <Headline T={T} from={CUES.Unfound} to={CUES.Reveal} title="And new customers can't find you online." />
        <Reveal T={T} s={CUES.Reveal} e={CUES.Ads} />
        <Headline T={T} from={CUES.Ads} to={CUES.Shop} kicker="1 · Get seen" title="Ads show your products to new people every day." />
        <Headline T={T} from={CUES.Shop} to={CUES.Assistant} kicker="2 · Open all day" title="Your own website: a shop that never closes." />
        <Headline T={T} from={CUES.Assistant} to={CUES.Return} kicker="3 · Never miss a sale" title="A smart assistant replies in seconds, day and night." />
        <Headline T={T} from={CUES.Return} to={CUES.Keep} kicker="4 · Bring them back" title="Every customer is remembered and invited back." />
        <Headline T={T} from={CUES.Keep} to={CUES.CTA} kicker="Ready in about 3 weeks" title="Everything we build is yours to keep." />
        <Keep T={T} s={CUES.Keep} e={CUES.CTA} />
        <Phone T={T} CUES={CUES}>
          <StatusScreen T={T} s={CUES.Hook} e={CUES.Missed} />
          <ChatsScreen T={T} s={CUES.Missed} e={CUES.Unfound} />
          <SearchScreen T={T} s={CUES.Unfound} e={CUES.Reveal + 0.4} />
          <AdsScreen T={T} s={CUES.Ads} e={CUES.Shop} />
          <ShopScreen T={T} s={CUES.Shop} e={CUES.Assistant} />
          <ChatScreen T={T} s={CUES.Assistant} e={CUES.Return} />
          <CustomersScreen T={T} s={CUES.Return} e={CUES.Keep + 0.4} />
        </Phone>
        <Close T={T} s={CUES.CTA} />
      </div>
    </div>
  );
}

function AdPiece() {
  return (
    <CompositionStage width={1080} height={1920} scenes={window.OM_SCENES} playback={window.OM_PLAYBACK} bg={C.bg}>
      <Piece />
    </CompositionStage>
  );
}
window.AdPiece = AdPiece;
