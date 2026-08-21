import type { H3Event } from 'h3'

/**
 * Die echte Besucher-IP hinter dem eigenen Reverse Proxy.
 *
 * BEWUSST NICHT `getRequestIP(event, { xForwardedFor: true })`: h3 nimmt dort
 * den ERSTEN Eintrag von `x-forwarded-for` — und der ist vollständig
 * client-kontrolliert, denn der Proxy HÄNGT die echte Peer-IP hinten an das
 * an, was der Client selbst geschickt hat. Wer den ersten Eintrag benutzt,
 * lässt jeden Aufrufer seinen eigenen Rate-Limit-Schlüssel wählen.
 *
 * Vertrauenswürdig ist allein der LETZTE Eintrag (ein eigener Proxy-Hop, wie
 * bei der API in lib/client-ip.ts begründet). Ohne Header bleibt die
 * Socket-Adresse; ohne beides `undefined` — dann lässt der Aufrufer den
 * Weiterreich-Header schlicht weg und die API zählt konservativ nach Peer.
 */
export function resolveVisitorIp(event: H3Event): string | undefined {
  const header = getRequestHeader(event, 'x-forwarded-for')
  if (header !== undefined && header !== '') {
    const entries = header
      .split(',')
      .map(entry => entry.trim())
      .filter(entry => entry.length > 0)
    const last = entries[entries.length - 1]
    if (last !== undefined) return last
  }

  const socketAddress = event.node.req.socket?.remoteAddress
  return socketAddress === null || socketAddress === undefined || socketAddress === ''
    ? undefined
    : socketAddress
}
