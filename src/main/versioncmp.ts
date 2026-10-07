/**
 * Compare dotted version strings the way macOS vendors use them:
 * numeric segments compare numerically ("1.10" > "1.9"), everything else
 * compares lexically, and a version with more segments wins when the
 * common prefix ties ("1.2.1" > "1.2").
 */
export function compareVersions(a: string, b: string): number {
  const pa = split(a)
  const pb = split(b)
  const len = Math.max(pa.length, pb.length)

  for (let i = 0; i < len; i++) {
    const sa = pa[i]
    const sb = pb[i]

    if (sa === undefined) return -1
    if (sb === undefined) return 1

    const na = Number(sa)
    const nb = Number(sb)
    const bothNumeric = !Number.isNaN(na) && !Number.isNaN(nb) && sa !== '' && sb !== ''

    const cmp = bothNumeric ? na - nb : sa.localeCompare(sb)
    if (cmp !== 0) return cmp > 0 ? 1 : -1
  }
  return 0
}

function split(v: string): string[] {
  return v
    .trim()
    .toLowerCase()
    .replace(/^v/, '')
    .split(/[.+-]/)
    // keep build suffixes as their own segment: "1.2 (345)" -> ["1","2","345"]
    .flatMap((seg) => seg.split(/\s+/))
    .filter((s) => s !== '')
}
