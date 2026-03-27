import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Plus, Minus, Trash2, Ticket, Hash, MessageSquare, User, Check, ChevronDown, ChevronUp, Search } from 'lucide-react';
import { calculateTotalSubs, formatRule } from './utils/SubRuleLogic';
import clsx from 'clsx';

const isActuallyFinished = (bet) => {
  if (bet.ruleType === 'fixed' && bet.count >= 1) return true;
  if (bet.ruleType === 'capped' && (bet.count * bet.baseN) >= bet.maxF) return true;
  if (bet.ruleType === 'threshold' && bet.count >= bet.maxF) return true;
  return false;
};

function OBSDock() {
  const [bets, setBets] = useState(() => {
    const saved = localStorage.getItem('sub-bets');
    if (saved) return JSON.parse(saved);
    return [];
  });

  const [settledFinishedIds, setSettledFinishedIds] = useState(() => {
    const saved = localStorage.getItem('sub-bets');
    if (saved) {
      const bList = JSON.parse(saved);
      return new Set(bList.filter(b => isActuallyFinished(b)).map(b => b.id));
    }
    return new Set();
  });

  const [showForm, setShowForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [formData, setFormData] = useState({
    username: '',
    phrase: '',
    ruleType: 'fixed',
    baseN: 3,
    maxF: 5,
    isStreamer: false
  });

  // Listen for localStorage changes from the main app
  useEffect(() => {
    const handleStorage = (e) => {
      if (e.key === 'sub-bets' && e.newValue) {
        setBets(JSON.parse(e.newValue));
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  useEffect(() => {
    localStorage.setItem('sub-bets', JSON.stringify(bets));
  }, [bets]);

  // Force dark theme
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', 'dark');
    document.body.classList.add('obs-dock-body');
    return () => document.body.classList.remove('obs-dock-body');
  }, []);

  const handleAnimationSettled = useCallback((id, isFinishedNow = true) => {
    setSettledFinishedIds(prev => {
      if (isFinishedNow) {
        if (prev.has(id)) return prev;
        const next = new Set(prev);
        next.add(id);
        return next;
      } else {
        if (!prev.has(id)) return prev;
        const next = new Set(prev);
        next.delete(id);
        return next;
      }
    });
  }, []);

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
      setBets([bet, ...bets.filter(b => !b.isStreamer)]);
    } else {
      setBets([...bets, bet]);
    }

    setFormData({ ...formData, username: '', phrase: '', isStreamer: false });
    setShowForm(false);
  };

  const togglePaid = (id) => {
    setBets(bets.map(b => b.id === id ? { ...b, isPaid: !b.isPaid } : b));
  };

  const updateCount = (id, delta) => {
    setBets(bets.map(b => {
      if (b.id !== id) return b;
      const newCount = Math.max(0, b.count + delta);

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

  const filteredBets = bets
    .filter(b =>
      b.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.phrase.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => {
      if (a.isStreamer && !b.isStreamer) return -1;
      if (!a.isStreamer && b.isStreamer) return 1;
      if (a.isPaid && !b.isPaid) return 1;
      if (!a.isPaid && b.isPaid) return -1;
      const aDone = settledFinishedIds.has(a.id);
      const bDone = settledFinishedIds.has(b.id);
      if (aDone && !bDone) return 1;
      if (!aDone && bDone) return -1;
      return 0;
    });

  const totalSubs = (() => {
    const streamerSubs = bets.filter(b => b.isStreamer).reduce((acc, b) => acc + calculateTotalSubs(b.ruleType, b.baseN, b.count, b.maxF, b.rollHistory), 0);
    const otherSubs = bets.filter(b => !b.isStreamer).reduce((acc, b) => acc + calculateTotalSubs(b.ruleType, b.baseN, b.count, b.maxF, b.rollHistory), 0);
    return otherSubs - streamerSubs;
  })();

  return (
    <div className="obs-dock">
      {/* Header */}
      <div className="dock-header">
        <div className="dock-logo">
          <Ticket size={16} />
          <span>LUDOREACTION</span>
          <div className="dock-logo-dot" />
        </div>
        <div style={{ display: 'flex', gap: '4px' }}>
          <button
            className={clsx('dock-header-btn', showSearch && 'active')}
            onClick={() => {
              setShowSearch(!showSearch);
              if (showSearch) setSearchTerm('');
            }}
          >
            <Search size={14} />
          </button>
          <button
            className={clsx('dock-header-btn', showForm && 'active')}
            onClick={() => setShowForm(p => !p)}
          >
            {showForm ? <ChevronUp size={16} /> : <Plus size={16} />}
          </button>
        </div>
      </div>

      {/* Search Bar */}
      {showSearch && (
        <div className="dock-search-container">
          <input
            className="dock-search-input"
            placeholder="Cerca..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            autoFocus
          />
        </div>
      )}

      {/* Totale */}
      {bets.length > 0 && (
        <div className="dock-total-bar">
          <span>TOTALE</span>
          <span className="dock-total-value">{totalSubs} SUB</span>
        </div>
      )}

      {/* Add Form */}
      {showForm && (
        <form className="dock-form" onSubmit={handleAdd}>
          <div className="dock-form-row">
            <div className="dock-input-group">
              <label><User size={10} /> USER</label>
              <input required placeholder="Nome" value={formData.username} onChange={e => setFormData({ ...formData, username: e.target.value })} />
            </div>
            <div className="dock-input-group">
              <label><MessageSquare size={10} /> FRASE</label>
              <input required placeholder="Frase" value={formData.phrase} onChange={e => setFormData({ ...formData, phrase: e.target.value })} />
            </div>
          </div>

          <div className="dock-rule-selector">
            {[
              { id: 'fixed', label: 'FISSA' },
              { id: 'multiplier', label: 'MULT' },
              { id: 'capped', label: 'MAX' },
              { id: 'threshold', label: 'MIN' },
              { id: 'progressive', label: 'PROG' },
              { id: 'range', label: 'RAND' }
            ].map(type => (
              <button key={type.id} type="button" className={clsx('dock-rule-tab', formData.ruleType === type.id && 'active')} onClick={() => setFormData({ ...formData, ruleType: type.id })}>
                {type.label}
              </button>
            ))}
          </div>

          <div className="dock-form-row">
            <div className="dock-input-group">
              <label><Hash size={10} /> {formData.ruleType === 'range' ? 'MIN' : 'N.SUB'}</label>
              <input type="number" value={formData.baseN} onChange={e => setFormData({ ...formData, baseN: e.target.value })} />
            </div>
            {(formData.ruleType === 'capped' || formData.ruleType === 'threshold' || formData.ruleType === 'range') && (
              <div className="dock-input-group">
                <label><Hash size={10} /> {formData.ruleType === 'range' ? 'MAX' : formData.ruleType === 'capped' ? 'MAX TOT' : 'SOGLIA'}</label>
                <input type="number" value={formData.maxF} onChange={e => setFormData({ ...formData, maxF: e.target.value })} />
              </div>
            )}
          </div>

          <div className="dock-form-actions">
            <button type="button" className={clsx('dock-streamer-btn', formData.isStreamer && 'active')} onClick={() => setFormData(p => ({ ...p, isStreamer: !p.isStreamer }))}>
              ★ STREAMER
            </button>
            <button type="submit" className="dock-submit-btn">GIOCA</button>
          </div>
        </form>
      )}

      {/* Bet List */}
      <div className="dock-bet-list">
        {filteredBets.map(bet => {
          const isDone = settledFinishedIds.has(bet.id);
          const isActuallyDone = isActuallyFinished(bet);
          const currentTotalSubs = calculateTotalSubs(bet.ruleType, bet.baseN, bet.count, bet.maxF, bet.rollHistory);
          const isManualType = ['multiplier', 'progressive', 'range'].includes(bet.ruleType);

          return (
            <div key={bet.id} className={clsx('dock-bet-card', isDone && 'finished', bet.isStreamer && 'streamer', bet.isPaid && 'paid')}>
              <div className="dock-bet-info">
                <div className="dock-bet-phrase">{bet.phrase}</div>
                <div className="dock-bet-user">{bet.username}</div>
              </div>

              <div className="dock-bet-right">
                <div className="dock-bet-total">
                  <span className="dock-total-num">{currentTotalSubs}</span>
                  <span className="dock-total-rule">{formatRule(bet.ruleType, bet.baseN, bet.maxF)}</span>
                </div>

                <div className="dock-bet-controls">
                  <button className="dock-counter-btn" onClick={() => updateCount(bet.id, -1)}>
                    <Minus size={12} strokeWidth={3} />
                  </button>
                  <span className="dock-counter-value">{bet.count < 10 ? `0${bet.count}` : bet.count}</span>
                  <button className="dock-counter-btn plus" onClick={() => updateCount(bet.id, 1)}>
                    <Plus size={12} strokeWidth={3} />
                  </button>

                  {(isActuallyDone || (isManualType && currentTotalSubs > 0)) && (
                    <button onClick={() => togglePaid(bet.id)} className={clsx('dock-paid-btn', bet.isPaid && 'active')} title={bet.isPaid ? "Non pagato" : "Pagato"}>
                      <Check size={12} strokeWidth={4} />
                    </button>
                  )}

                  <button onClick={() => removeBet(bet.id)} className="dock-remove-btn">
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            </div>
          );
        })}

        {bets.length === 0 && (
          <div className="dock-empty">
            <Ticket size={24} style={{ opacity: 0.3 }} />
            <span>Nessuna scommessa</span>
            <span style={{ fontSize: '0.6rem', opacity: 0.4 }}>Clicca + per aggiungerne una</span>
          </div>
        )}
      </div>

      {/* Footer */}
      {bets.length > 0 && (
        <div className="dock-footer">
          <button onClick={() => { if (confirm('Svuotare la Ludoreaction?')) setBets([]) }} className="dock-clear-btn">
            <Trash2 size={12} /> SVUOTA
          </button>
        </div>
      )}
    </div>
  );
}

export default OBSDock;
