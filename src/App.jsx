import React, { useState, useEffect, useRef } from 'react';
import { Plus, Minus, Trash2, Search, Ticket, Hash, MessageSquare, User, Sun, Moon, Check } from 'lucide-react';
import { calculateTotalSubs, formatRule } from './utils/SubRuleLogic';
import clsx from 'clsx';

// Unified component for all totals with HIGH-END Additive animation
const AnimatedTotal = ({ bet, isActuallyFinished, onAnimationSettled }) => {
  const history = bet.rollHistory || [];
  const currentTotal = calculateTotalSubs(bet.ruleType, bet.baseN, bet.count, bet.maxF, history);

  const [displayTotal, setDisplayTotal] = useState(currentTotal);
  const [addedValue, setAddedValue] = useState(null);
  const [isSpinning, setIsSpinning] = useState(false);
  const [shouldBump, setShouldBump] = useState(false);

  const prevTotalRef = useRef(currentTotal);
  const prevCountRef = useRef(bet.count);

  useEffect(() => {
    const diff = currentTotal - prevTotalRef.current;

    // Trigger animation ONLY if count increased
    if (diff > 0 && bet.count > prevCountRef.current) {
      setIsSpinning(true);
      setAddedValue(null);

      const isRange = bet.ruleType === 'range';
      const spinDuration = isRange ? 800 : 300;
      const revealDuration = isRange ? 1500 : 800; // Longer reveal for Range

      const interval = setInterval(() => {
        if (isRange) {
          setAddedValue(Math.floor(Math.random() * (bet.maxF - bet.baseN + 1)) + parseInt(bet.baseN));
        } else {
          setAddedValue(diff);
        }
      }, 60);

      setTimeout(() => {
        clearInterval(interval);
        setAddedValue(diff);

        // Final reveal pause before summation
        setTimeout(() => {
          setIsSpinning(false);
          setAddedValue(null);
          setDisplayTotal(currentTotal);

          // Trigger physics bump
          setShouldBump(true);
          setTimeout(() => {
            setShouldBump(false);
            // NOW the animation is truly "done" - notify parent
            if (isActuallyFinished) {
              onAnimationSettled(bet.id);
            }
          }, 400);
        }, revealDuration);
      }, spinDuration);
    } else {
      // Immediate update for decrements or deletions
      setDisplayTotal(currentTotal);
      if (!isActuallyFinished) {
        // If we decremented and it's no longer finished, we should reset parent status
        onAnimationSettled(bet.id, false);
      }
    }

    prevTotalRef.current = currentTotal;
    prevCountRef.current = bet.count;
  }, [currentTotal, bet.count, bet.ruleType, bet.baseN, bet.maxF, isActuallyFinished, bet.id, onAnimationSettled]);

  const badgeColor = bet.ruleType === 'range' ? 'var(--accent-purple)' : 'var(--accent-green)';

  return (
    <div className="total-container" style={{ position: 'relative' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <div className={clsx('total-value', shouldBump && 'bump')} style={{
          color: (currentTotal > 0 && !isActuallyFinished && !isSpinning) ? 'var(--accent-green)' : 'inherit'
        }}>
          {displayTotal}
        </div>

        {addedValue !== null && (
          <div className={clsx('slot-badge animate', bet.ruleType === 'range' && 'large')} style={{
            background: badgeColor,
            boxShadow: `0 0 25px ${badgeColor}aa`
          }}>
            +{addedValue}
          </div>
        )}
      </div>
      <div className="rule-small">{formatRule(bet.ruleType, bet.baseN, bet.maxF)}</div>
    </div>
  );
};

const isActuallyFinished = (bet) => {
  if (bet.ruleType === 'fixed' && bet.count >= 1) return true;
  if (bet.ruleType === 'capped' && (bet.count * bet.baseN) >= bet.maxF) return true;
  if (bet.ruleType === 'threshold' && bet.count >= bet.maxF) return true;
  return false;
};

function App() {
  const [bets, setBets] = useState(() => {
    const saved = localStorage.getItem('sub-bets');
    if (saved) return JSON.parse(saved);
    return [];
  });

  // Track which bets have COMPLETED their finish-animation
  const [settledFinishedIds, setSettledFinishedIds] = useState(() => {
    const saved = localStorage.getItem('sub-bets');
    if (saved) {
      const bList = JSON.parse(saved);
      return new Set(bList.filter(b => isActuallyFinished(b)).map(b => b.id));
    }
    return new Set();
  });

  const [searchTerm, setSearchTerm] = useState('');
  const [theme, setTheme] = useState(() => localStorage.getItem('ludo-theme') || 'dark');
  const [formData, setFormData] = useState({
    username: '',
    phrase: '',
    ruleType: 'fixed',
    baseN: 3,
    maxF: 5,
    isStreamer: false
  });

  useEffect(() => {
    localStorage.setItem('sub-bets', JSON.stringify(bets));
  }, [bets]);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('ludo-theme', theme);
  }, [theme]);


  const handleAnimationSettled = (id, isFinishedNow = true) => {
    setSettledFinishedIds(prev => {
      const next = new Set(prev);
      if (isFinishedNow) {
        next.add(id);
      } else {
        next.delete(id);
      }
      return next;
    });
  };

  const getRandomInt = (min, max) => {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1)) + min;
  };

  const handleAdd = (e) => {
    e.preventDefault();
    if (!formData.phrase.trim() || !formData.username.trim()) return;

    let nVal = parseInt(formData.baseN) || 0;
    let fVal = parseInt(formData.maxF) || 0;

    if ((formData.ruleType === 'range' || formData.ruleType === 'capped') && nVal > fVal && fVal !== 0) {
      [nVal, fVal] = [fVal, nVal];
    }

    const bet = {
      id: Date.now(),
      ...formData,
      baseN: nVal,
      maxF: fVal,
      count: 0,
      rollHistory: [],
      isPaid: false
    };

    if (bet.isStreamer) {
      // Only one streamer bet allowed, remove existing ones if any? 
      // Or just allow multiple. User said "la scommessa dello streamer" (singular).
      // I'll filter out other streamer bets to keep it exclusive.
      setBets([bet, ...bets.filter(b => !b.isStreamer)]);
    } else {
      setBets([...bets, bet]);
    }

    setFormData({ ...formData, username: '', phrase: '', isStreamer: false });
  };

  const togglePaid = (id) => {
    setBets(bets.map(b => b.id === id ? { ...b, isPaid: !b.isPaid } : b));
  };

  const updateCount = (id, delta) => {
    setBets(bets.map(b => {
      if (b.id !== id) return b;

      const newCount = Math.max(0, b.count + delta);

      // If we decrement, we immediately unset the settled status to avoid sticking at the bottom
      if (delta < 0) {
        handleAnimationSettled(id, false);
      }

      let newHistory = [...(b.rollHistory || [])];
      if (b.ruleType === 'range') {
        if (delta > 0) {
          newHistory.push(getRandomInt(b.baseN, b.maxF));
        } else if (delta < 0 && newHistory.length > 0) {
          newHistory.pop();
        }
      }

      const updatedBet = { ...b, count: newCount, rollHistory: newHistory };
      const canFinish = ['fixed', 'capped', 'threshold'].includes(updatedBet.ruleType);
      
      // For types that have a completion goal, reset paid status if they fall below that goal.
      // For manual types (mult, prog, rand), the status is purely manual and won't reset on count change.
      if (canFinish && !isActuallyFinished(updatedBet)) {
        updatedBet.isPaid = false;
      }
      
      return updatedBet;
    }));
  };

  const removeBet = (id) => {
    setBets(bets.filter(b => b.id !== id));
    setSettledFinishedIds(prev => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

  const toggleTheme = () => setTheme(prev => prev === 'dark' ? 'light' : 'dark');

  const filteredBets = bets
    .filter(b =>
      b.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.phrase.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => {
      // 1. Streamer always first
      if (a.isStreamer && !b.isStreamer) return -1;
      if (!a.isStreamer && b.isStreamer) return 1;

      // 2. Paid bets always at the absolute bottom
      if (a.isPaid && !b.isPaid) return 1;
      if (!a.isPaid && b.isPaid) return -1;

      // 3. Finished (done) bets go after active bets
      const aDone = settledFinishedIds.has(a.id);
      const bDone = settledFinishedIds.has(b.id);
      if (aDone && !bDone) return 1;
      if (!aDone && bDone) return -1;

      return 0;
    });

  return (
    <div className="container">
      <header className="header" style={{ marginBottom: '2rem' }}>
        <div className="logo" style={{ color: 'var(--accent-green)' }}>
          <Ticket size={24} style={{ marginRight: '8px' }} />
          LUDOREACTION <div className="logo-dot" />
        </div>
        <button onClick={toggleTheme} className="theme-toggle-btn" style={{ background: 'var(--bg-pill)', border: '1px solid var(--border-muted)', color: 'var(--text-primary)', padding: '8px', borderRadius: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'var(--transition)' }}>
          {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
        </button>
      </header>

      <div className="search-container" style={{ marginBottom: '1.5rem' }}>
        <Search className="search-icon" size={18} />
        <input className="search-input" type="text" placeholder="Cerca in Ludoreaction..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
      </div>

      <div className="bet-list" style={{ marginBottom: '2.5rem' }}>
        {filteredBets.map((bet) => {
          const isDone = settledFinishedIds.has(bet.id);
          const isActuallyDone = isActuallyFinished(bet);

          return (
            <div key={bet.id} className={clsx('bet-card', isDone && 'finished', bet.isStreamer && 'streamer-card', bet.isPaid && 'paid')}>
              <div className="user-info">
                <div className="phrase" style={{ fontWeight: 800, fontSize: '0.95rem', textTransform: 'uppercase' }}>{bet.phrase}</div>
                <div className="username" style={{ color: 'var(--text-secondary)', fontWeight: 400, fontSize: '0.75rem' }}>{bet.username}</div>
              </div>
              <div className="counter-pill">
                <button className="counter-btn minus" onClick={() => updateCount(bet.id, -1)}><Minus size={16} strokeWidth={3} /></button>
                <span className="counter-value">{bet.count < 10 ? `0${bet.count}` : bet.count}</span>
                <button className="counter-btn plus" onClick={() => updateCount(bet.id, 1)}><Plus size={16} strokeWidth={3} /></button>
              </div>

              <AnimatedTotal
                bet={bet}
                isActuallyFinished={isActuallyDone}
                onAnimationSettled={handleAnimationSettled}
              />

              {(() => {
                const currentTotalSubs = calculateTotalSubs(bet.ruleType, bet.baseN, bet.count, bet.maxF, bet.rollHistory);
                const isManualType = ['multiplier', 'progressive', 'range'].includes(bet.ruleType);
                
                if (isActuallyDone || (isManualType && currentTotalSubs > 0)) {
                  return (
                    <button
                      onClick={() => togglePaid(bet.id)}
                      className={clsx('paid-btn', bet.isPaid && 'active')}
                      title={bet.isPaid ? "Segna come NON pagato" : "Segna come pagato"}
                    >
                      <Check size={16} strokeWidth={4} />
                    </button>
                  );
                }
                return null;
              })()}

              <button onClick={() => removeBet(bet.id)} className="remove-btn">
                <Trash2 size={16} />
              </button>
            </div>
          );
        })}
        {bets.length > 0 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1.5rem', padding: '0 8px' }}>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
              Totale Ludoreaction: <b>{bets.reduce((acc, b) => acc + calculateTotalSubs(b.ruleType, b.baseN, b.count, b.maxF, b.rollHistory), 0)} SUB</b>
            </span>
            <button onClick={() => { if (confirm('Svuotare la Ludoreaction?')) setBets([]) }} style={{ background: 'transparent', border: 'none', color: '#ef4444', fontSize: '0.65rem', textTransform: 'uppercase', fontWeight: 700, cursor: 'pointer' }}>Svuota Ludoreaction</button>
          </div>
        )}
      </div>

      <div className="glass-panel" style={{ padding: '1.25rem', marginBottom: '2rem', background: 'var(--bg-secondary)', border: '1px solid var(--border-muted)', borderRadius: 'var(--radius-card)', transition: 'var(--theme-transition)' }}>
        <form onSubmit={handleAdd}>
          <div className="form-row" style={{ marginBottom: '16px' }}>
            <div className="input-group">
              <label><User size={12} /> USERNAME</label>
              <input required placeholder="Es: Luca" value={formData.username} onChange={e => setFormData({ ...formData, username: e.target.value })} />
            </div>
            <div className="input-group">
              <label><MessageSquare size={12} /> FRASE</label>
              <input required placeholder="Es: Ciao" value={formData.phrase} onChange={e => setFormData({ ...formData, phrase: e.target.value })} />
            </div>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', marginBottom: '8px', display: 'block', textTransform: 'uppercase', letterSpacing: '0.05em' }}>TIPO DI QUOTA</label>
            <div className="rule-selector" style={{ gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px' }}>
              {[
                { id: 'fixed', label: 'FISSA' },
                { id: 'multiplier', label: 'MULT' },
                { id: 'capped', label: 'MAX' },
                { id: 'threshold', label: 'MIN' },
                { id: 'progressive', label: 'PROG' },
                { id: 'range', label: 'RAND' }
              ].map((type) => (
                <button key={type.id} type="button" className={clsx('rule-tab', formData.ruleType === type.id && 'active')} onClick={() => setFormData({ ...formData, ruleType: type.id })}>
                  {type.label}
                </button>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-end', width: '100%', flexWrap: 'wrap' }}>
            <button
              type="button"
              className={clsx('streamer-toggle', formData.isStreamer && 'active')}
              onClick={() => setFormData(prev => ({ ...prev, isStreamer: !prev.isStreamer }))}
              style={{
                height: '40px',
                padding: '0 12px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border-muted)',
                background: formData.isStreamer ? 'var(--accent-purple)' : 'var(--bg-pill)',
                color: formData.isStreamer ? 'white' : 'var(--text-secondary)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'var(--transition)',
                fontWeight: 700,
                fontSize: '0.65rem'
              }}
            >
              <Sun size={14} fill={formData.isStreamer ? "white" : "none"} /> STREAMER
            </button>
            <div className="input-group" style={{ flex: 1, minWidth: 0 }}>
              <label><Hash size={12} /> {formData.ruleType === 'range' ? 'MIN SUB' : 'N. SUB'}</label>
              <input type="number" value={formData.baseN} onChange={e => setFormData({ ...formData, baseN: e.target.value })} />
            </div>
            {(formData.ruleType === 'capped' || formData.ruleType === 'threshold' || formData.ruleType === 'range') && (
              <div className="input-group" style={{ flex: 1, minWidth: 0 }}>
                <label><Hash size={12} /> {
                  formData.ruleType === 'range' ? 'MAX SUB' :
                    formData.ruleType === 'capped' ? 'MAX TOT. SUB' : 'SOGLIA VOLTE'
                }</label>
                <input type="number" value={formData.maxF} onChange={e => setFormData({ ...formData, maxF: e.target.value })} />
              </div>
            )}
            <button type="submit" className="btn-add" style={{ margin: 0, height: '40px', padding: '0 20px', flexShrink: 0 }}>
              GIOCA
            </button>
          </div>
        </form>
      </div>

      <footer style={{ marginTop: 'auto', padding: '20px 0', textAlign: 'center', opacity: 0.3, fontSize: '0.6rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
        Creato da <span style={{ fontWeight: 800, color: 'var(--accent-purple)' }}>rombri02</span>
        <br />
        <span style={{ fontSize: '0.55rem', opacity: 0.8, marginTop: '8px', display: 'block' }}>
          Bug o Consigli? <a href="mailto:rombri002@gmail.com" style={{ color: 'inherit', textDecoration: 'underline' }}>rombri002@gmail.com</a>
        </span>
      </footer>
    </div>
  );
}

export default App;
