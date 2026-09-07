/**
 * MD5 für den Browser.
 *
 * WARUM DAS HIER STEHT UND NICHT AUS DER PLATTFORM KOMMT: Die Prüfsumme über
 * den Datenbestand rechnet der Server mit Postgres' eingebautem `md5()`, und
 * Android mit `MessageDigest.getInstance("MD5")`. Damit ein Vergleich
 * überhaupt möglich ist, muss diese Seite dasselbe rechnen — und die Web-API
 * `crypto.subtle` kennt ausschließlich SHA-1 und SHA-2. MD5 gibt es dort
 * nicht, und zwar absichtlich nicht.
 *
 * WARUM NICHT STATTDESSEN AUF SHA-256 UMSTELLEN: Ginge — Postgres 18 läuft in
 * Entwicklung wie Produktion und hat `sha256()` eingebaut. Es hiesse aber, eine
 * ZWEITE Prüfsummen-Familie zu führen, bis jede installierte Android-Version
 * nachgezogen ist. Die Merge- und Hash-Logik existiert ohnehin schon dreifach;
 * ein vierter Sonderweg wäre der teurere Handel. Ein Algorithmus für alle drei
 * Seiten ist die geringere Last.
 *
 * DIES IST KEINE SICHERHEITSFUNKTION. MD5 dient hier als Fingerabdruck zum
 * Erkennen von Abweichungen, nicht als Schutz gegen jemanden, der absichtlich
 * Kollisionen baut. Für Signaturen und Sitzungen nutzt dieses Projekt
 * ausschließlich SHA-256 (siehe `server/utils/apiSignature.ts`).
 *
 * Geprüft wird gegen zwei unabhängige Quellen: die veröffentlichten Testwerte
 * aus RFC 1321 und Werte, die aus der echten Postgres-Instanz stammen — siehe
 * `md5.test.ts`. Ohne diese Gegenprobe wäre der Code hier wertlos.
 */

/** Rotationsweiten je Runde, Tabelle aus RFC 1321. */
const SHIFTS = [
  7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22,
  5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20,
  4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23,
  6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21,
] as const

/**
 * Die Sinus-Konstanten, `floor(abs(sin(i + 1)) * 2^32)`.
 *
 * Berechnet statt abgetippt: 64 handgeschriebene Hexzahlen sind eine
 * Fehlerquelle ohne Gegenwert, und die Formel steht so in RFC 1321.
 */
const K = (() => {
  const table = new Uint32Array(64)
  for (let i = 0; i < 64; i++) {
    table[i] = Math.floor(Math.abs(Math.sin(i + 1)) * 4294967296)
  }
  return table
})()

/** Linksrotation auf 32 Bit. `>>> 0` hält das Ergebnis vorzeichenlos. */
function rotateLeft(value: number, by: number): number {
  return ((value << by) | (value >>> (32 - by))) >>> 0
}

/**
 * Hängt die Polsterung nach RFC 1321 an: ein gesetztes Bit, dann Nullen, dann
 * die Länge in Bits als 64-Bit-Zahl in Little-Endian.
 */
function pad(bytes: Uint8Array): Uint8Array {
  const bitLengthLow = (bytes.length * 8) >>> 0
  // 2^29 Bytes sind 2^32 Bit — ab da läuft das niedrige Wort über.
  const bitLengthHigh = Math.floor(bytes.length / 536870912) >>> 0

  const paddedLength = (((bytes.length + 8) >> 6) + 1) << 6
  const padded = new Uint8Array(paddedLength)
  padded.set(bytes)
  padded[bytes.length] = 0x80

  const view = new DataView(padded.buffer)
  view.setUint32(paddedLength - 8, bitLengthLow, true)
  view.setUint32(paddedLength - 4, bitLengthHigh, true)
  return padded
}

/** Vier Zustandswörter als Hexkette, jedes Wort in Little-Endian. */
function toHex(a: number, b: number, c: number, d: number): string {
  let out = ''
  for (const word of [a, b, c, d]) {
    for (let byte = 0; byte < 4; byte++) {
      out += ((word >>> (byte * 8)) & 0xff).toString(16).padStart(2, '0')
    }
  }
  return out
}

/** MD5 über beliebige Bytes, als Hexkette in Kleinbuchstaben. */
export function md5Bytes(bytes: Uint8Array): string {
  const message = pad(bytes)
  const view = new DataView(message.buffer)

  let a0 = 0x67452301
  let b0 = 0xefcdab89
  let c0 = 0x98badcfe
  let d0 = 0x10325476

  const block = new Uint32Array(16)

  for (let offset = 0; offset < message.length; offset += 64) {
    for (let word = 0; word < 16; word++) {
      block[word] = view.getUint32(offset + word * 4, true)
    }

    let a = a0
    let b = b0
    let c = c0
    let d = d0

    for (let i = 0; i < 64; i++) {
      let mixed: number
      let index: number

      if (i < 16) {
        mixed = (b & c) | (~b & d)
        index = i
      }
      else if (i < 32) {
        mixed = (d & b) | (~d & c)
        index = (5 * i + 1) % 16
      }
      else if (i < 48) {
        mixed = b ^ c ^ d
        index = (3 * i + 5) % 16
      }
      else {
        mixed = c ^ (b | ~d)
        index = (7 * i) % 16
      }

      // Alle Summen bleiben mit `| 0` in 32 Bit; ohne das kippt JavaScript ab
      // 2^53 in ungenaue Gleitkommazahlen und der Hash wäre still falsch.
      const sum = (((mixed + a) | 0) + ((K[i]! + (block[index] ?? 0)) | 0)) | 0
      a = d
      d = c
      c = b
      b = (b + rotateLeft(sum >>> 0, SHIFTS[i]!)) | 0
    }

    a0 = (a0 + a) | 0
    b0 = (b0 + b) | 0
    c0 = (c0 + c) | 0
    d0 = (d0 + d) | 0
  }

  return toHex(a0 >>> 0, b0 >>> 0, c0 >>> 0, d0 >>> 0)
}

/**
 * MD5 über eine Zeichenkette, in UTF-8 kodiert.
 *
 * Die Kodierung ist nicht beliebig: Postgres' `md5(text)` hasht die
 * UTF-8-Bytes, und Androids `toByteArray()` tut in dieser App dasselbe. Ein
 * Umlaut in einem Listennamen würde bei jeder anderen Kodierung eine andere
 * Prüfsumme ergeben — und die Abweichung wäre nicht als Kodierungsfehler
 * erkennbar, sondern sähe aus wie ein Datenschaden.
 */
export function md5(text: string): string {
  return md5Bytes(new TextEncoder().encode(text))
}
