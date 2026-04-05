export function buildLineDiff(left: string, right: string): string[] {
  const a = left.split("\n");
  const b = right.split("\n");
  const max = Math.max(a.length, b.length);
  const out: string[] = [];
  for (let i = 0; i < max; i += 1) {
    const lv = a[i] ?? "";
    const rv = b[i] ?? "";
    if (lv === rv) {
      out.push(`  ${lv}`);
    } else {
      out.push(`- ${lv}`);
      out.push(`+ ${rv}`);
    }
  }
  return out;
}
