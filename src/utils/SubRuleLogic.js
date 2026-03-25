export const calculateTotalSubs = (type, n, count, f, rollHistory = []) => {
  const numN = parseInt(n) || 0;
  const numCount = parseInt(count) || 0;
  const numF = parseInt(f) || 0;

  switch (type) {
    case 'fixed':
      return numCount >= 1 ? numN : 0;
    case 'multiplier':
      return numCount * numN;
    case 'capped':
      return Math.min(numCount * numN, numF);
    case 'threshold':
      return numCount >= numF ? numN : 0;
    case 'progressive':
      // Arithmetic progression: n + 2n + 3n... = n * (count * (count + 1) / 2)
      return numN * (numCount * (numCount + 1)) / 2;
    case 'range':
      // Use stored roll history to ensure stability
      return rollHistory.reduce((a, b) => a + b, 0);
    default:
      return 0;
  }
};

export const formatRule = (type, n, f) => {
  switch (type) {
    case 'fixed': return `${n} FISSA`;
    case 'multiplier': return `${n}x`;
    case 'capped': return `${n} (MAX ${f})`;
    case 'threshold': return `${n} (MIN ${f})`;
    case 'progressive': return `${n} » (PROG)`;
    case 'range': return `${n} ↔ ${f} (RAND)`;
    default: return `${n}`;
  }
};
