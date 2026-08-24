/// <reference types="bun" />
/**
 * Selbstgeschriebene Prüfsummen-Rechnerei ist nur so viel wert wie ihre
 * Gegenprobe. Deshalb wird hier gegen ZWEI unabhängige Quellen geprüft:
 *
 * 1. Die veröffentlichten Testwerte aus RFC 1321, Anhang A.5. Sie belegen, dass
 *    der Algorithmus als solcher stimmt.
 * 2. Werte aus der echten Postgres-Instanz dieses Projekts (`postgres:18`, in
 *    Entwicklung wie Produktion dasselbe Abbild). Sie belegen, dass diese Seite
 *    dasselbe rechnet wie der Server — und genau darauf kommt es an, denn eine
 *    Abweichung hier sähe im Betrieb nach einem Datenschaden aus.
 *
 * Der Umlaut-Fall ist kein Beiwerk: Er sichert die UTF-8-Kodierung ab. Würde
 * hier anders kodiert als in Postgres, hätte jede Liste mit einem Umlaut im
 * Namen dauerhaft eine andere Prüfsumme.
 */
import { describe, expect, test } from 'bun:test'
import { md5, md5Bytes } from './md5'

describe('RFC 1321, Anhang A.5', () => {
  const vektoren: Array<[string, string]> = [
    ['', 'd41d8cd98f00b204e9800998ecf8427e'],
    ['a', '0cc175b9c0f1b6a831c399e269772661'],
    ['abc', '900150983cd24fb0d6963f7d28e17f72'],
    ['message digest', 'f96b697d7cb7938d525a2f31aaf161d0'],
    ['abcdefghijklmnopqrstuvwxyz', 'c3fcd3d76192e4007dfb496cca67e13b'],
    [
      'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789',
      'd174ab98d277d9f5a5611c2c9f419d9f',
    ],
    [
      '12345678901234567890123456789012345678901234567890123456789012345678901234567890',
      '57edf4a22be3c955ac49da2e2107b67a',
    ],
  ]

  for (const [eingabe, erwartet] of vektoren) {
    test(`"${eingabe.slice(0, 24)}${eingabe.length > 24 ? '…' : ''}"`, () => {
      expect(md5(eingabe)).toBe(erwartet)
    })
  }
})

describe('Gegenprobe gegen die echte Postgres-Instanz', () => {
  // Erzeugt mit:
  //   SELECT md5('…');
  // auf postgres:18 — derselben Fassung, die auch in Produktion läuft.
  const ausPostgres: Array<[string, string, string]> = [
    ['leere Zeichenkette', '', 'd41d8cd98f00b204e9800998ecf8427e'],
    ['abc', 'abc', '900150983cd24fb0d6963f7d28e17f72'],
    ['Umlaute und Kaufmanns-Und', 'Müsli & Öl', '74e4e49553f2943217db8d644a9813a5'],
    [
      'eine Eintragszeile im Format der Prüfsumme',
      'a1b2|Milch|2|false|false|0',
      '2647e9018c90e5bc7f4a35c8713750bc',
    ],
    ['tausend Zeichen', 'x'.repeat(1000), '398533d48111e9f664b1f64cb10c4b63'],
  ]

  for (const [name, eingabe, erwartet] of ausPostgres) {
    test(name, () => {
      expect(md5(eingabe)).toBe(erwartet)
    })
  }
})

describe('Kanten der Polsterung', () => {
  // Die Polsterung ist die klassische Fehlerstelle: Bei Längen um ein
  // Vielfaches von 64 Bytes herum entsteht ein zusätzlicher Block.
  test('Längen um die Blockgrenze herum bleiben stabil', () => {
    const laengen = [55, 56, 57, 63, 64, 65, 119, 120, 128]
    const ergebnisse = laengen.map(n => md5('a'.repeat(n)))

    for (const hash of ergebnisse) {
      expect(hash).toMatch(/^[0-9a-f]{32}$/)
    }
    // Verschiedene Längen dürfen niemals denselben Wert ergeben.
    expect(new Set(ergebnisse).size).toBe(laengen.length)
  })

  test('rohe Bytes und Zeichenkette stimmen überein', () => {
    expect(md5Bytes(new TextEncoder().encode('abc'))).toBe(md5('abc'))
  })
})
