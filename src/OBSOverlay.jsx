import React, { useState, useEffect, useRef, useCallback } from 'react';
import { calculateTotalSubs, formatRule } from './utils/SubRuleLogic';
import clsx from 'clsx';

const isActuallyFinished = (bet) => {
  if (bet.ruleType === 'fixed' && bet.count >= 1) return true;
  if (bet.ruleType === 'capped' && (bet.count * bet.baseN) >= bet.maxF) return true;
  if (bet.ruleType === 'threshold' && bet.count >= bet.maxF) return true;
  return false;
};

// Animated total with slot-machine effect for the overlay
const OverlayAnimatedTotal = ({ bet }) => {
  const history = bet.rollHistory || [];
  const currentTotal = calculateTotalSubs(bet.ruleType, bet.baseN, bet.count, bet.maxF, history);

  const [displayTotal, setDisplayTotal] = useState(currentTotal);
  const [addedValue, setAddedValue] = useState(null);
  const [shouldBump, setShouldBump] = useState(false);

  const prevTotalRef = useRef(currentTotal);
  const prevCountRef = useRef(bet.count);

  useEffect(() => {
    const diff = currentTotal - prevTotalRef.current;

    if (diff > 0 && bet.count > prevCountRef.current) {
      setAddedValue(null);

      const isRange = bet.ruleType === 'range';
      const spinDuration = isRange ? 800 : 300;
      const revealDuration = isRange ? 1500 : 800;

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

        setTimeout(() => {
          setAddedValue(null);
          setDisplayTotal(currentTotal);
          setShouldBump(true);
          setTimeout(() => setShouldBump(false), 400);
        }, revealDuration);
      }, spinDuration);
    } else {
      setDisplayTotal(currentTotal);
    }

    prevTotalRef.current = currentTotal;
    prevCountRef.current = bet.count;
  }, [currentTotal, bet.count, bet.ruleType, bet.baseN, bet.maxF]);

  const badgeColor = bet.ruleType === 'range' ? '#a855f7' : '#22c55e';

  return (
    <div className="overlay-total">
      <span className={clsx('overlay-total-num', shouldBump && 'bump')}>
        {displayTotal}
      </span>
      {addedValue !== null && (
        <span className="overlay-added-badge" style={{
          background: badgeColor,
          boxShadow: `0 0 20px ${badgeColor}aa`
        }}>
          +{addedValue}
        </span>
      )}
    </div>
  );
};

function OBSOverlay() {
  const [bets, setBets] = useState(() => {
    const saved = localStorage.getItem('sub-bets');
    if (saved) return JSON.parse(saved);
    return [];
  });

  const [highlightedId, setHighlightedId] = useState(null);
  const prevCountsRef = useRef({});

  // Detect count increases for highlight
  useEffect(() => {
    bets.forEach(bet => {
      const prevCount = prevCountsRef.current[bet.id];
      if (prevCount !== undefined && bet.count > prevCount && !bet.isPaid) {
        setHighlightedId(bet.id);
        // Clear highlight after 3.5 seconds (gives time for slot animation + reveal)
        setTimeout(() => setHighlightedId(prev => prev === bet.id ? null : prev), 3500);
      }
      prevCountsRef.current[bet.id] = bet.count;
    });
  }, [bets]);

  // Poll localStorage for updates from the dock
  useEffect(() => {
    const interval = setInterval(() => {
      const saved = localStorage.getItem('sub-bets');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (JSON.stringify(bets) !== saved) {
            setBets(parsed);
          }
        } catch (e) { /* ignore */ }
      }
    }, 250);

    const handleStorage = (e) => {
      if (e.key === 'sub-bets' && e.newValue) {
        setBets(JSON.parse(e.newValue));
      }
    };
    window.addEventListener('storage', handleStorage);

    return () => {
      clearInterval(interval);
      window.removeEventListener('storage', handleStorage);
    };
  }, [bets]);

  // Force transparent background + dark text
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', 'dark');
    document.body.classList.add('obs-overlay-body');
    return () => document.body.classList.remove('obs-overlay-body');
  }, []);

  const activeBets = bets
    .filter(b => !b.isPaid)
    .sort((a, b) => {
      if (a.isStreamer && !b.isStreamer) return -1;
      if (!a.isStreamer && b.isStreamer) return 1;
      const aDone = isActuallyFinished(a);
      const bDone = isActuallyFinished(b);
      if (aDone && !bDone) return 1;
      if (!aDone && bDone) return -1;
      return 0;
    });

  const totalSubs = (() => {
    const streamerSubs = bets.filter(b => b.isStreamer).reduce((acc, b) => acc + calculateTotalSubs(b.ruleType, b.baseN, b.count, b.maxF, b.rollHistory), 0);
    const otherSubs = bets.filter(b => !b.isStreamer).reduce((acc, b) => acc + calculateTotalSubs(b.ruleType, b.baseN, b.count, b.maxF, b.rollHistory), 0);
    return otherSubs - streamerSubs;
  })();

  if (activeBets.length === 0) return null;

  return (
    <div className="obs-overlay">
      {/* Dimmer background when highlighted */}
      <div className={clsx('overlay-dimmer', highlightedId && 'active')} />

      {/* Title bar */}
      <div className="overlay-header">
        <span className="overlay-logo">🎰 LUDOREACTION</span>
        <span className="overlay-total-badge">{totalSubs} SUB</span>
      </div>

      {/* Bet rows */}
      <div className="overlay-bet-list">
        {activeBets.map(bet => {
          const isDone = isActuallyFinished(bet);
          const isHighlighted = highlightedId === bet.id;

          return (
            <div key={bet.id} className={clsx('overlay-bet-row', bet.isStreamer && 'streamer', isDone && 'finished', isHighlighted && 'hero-highlight')}>
              <div className="overlay-bet-left">
                <span className="overlay-bet-phrase">{bet.phrase}</span>
                <span className="overlay-bet-user">{bet.username}</span>
              </div>

              <div className="overlay-bet-right">
                <span className="overlay-bet-count">×{bet.count}</span>
                <span className="overlay-bet-rule">{formatRule(bet.ruleType, bet.baseN, bet.maxF)}</span>
                <OverlayAnimatedTotal bet={bet} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default OBSOverlay;
