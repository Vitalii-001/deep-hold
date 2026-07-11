const UNITS = ['K', 'M', 'B', 'T'];

export function formatNumber(n: number): string {
  if (n < 0) return '-' + formatNumber(-n);
  if (n < 1000) {
    if (n < 10 && n % 1 !== 0) return n.toFixed(1);
    return Math.floor(n).toString();
  }
  let v = n;
  let u = -1;
  while (v >= 1000 && u < UNITS.length - 1) {
    v /= 1000;
    u++;
  }
  if (v >= 100) return Math.floor(v) + UNITS[u];
  return v.toFixed(1).replace(/\.0$/, '') + UNITS[u];
}