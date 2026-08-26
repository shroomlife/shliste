/// <reference types="bun" />
/**
 * Der Umgang mit Adressen — eine Regel, drei Repos.
 *
 * DIE EINE ENTSCHEIDUNG, die hier festgenagelt wird: Eine gültige Adresse
 * kommt UNVERÄNDERT zurück, nur die Randleerzeichen fallen weg. Kein
 * `URL.toString()`, keine Normalisierung. Der Grund ist der Abgleich: Server,
 * Android und diese Seite prüfen dieselbe Eingabe, und jede Seite, die
 * zusätzlich normalisiert, erzeugt einen anderen Wert für dasselbe Feld. Ein
 * angehängter Schrägstrich oder ein kleingeschriebener Host wäre dann ein
 * Feld-Update, das im Kreis zwischen den Geräten wandert.
 */
import { describe, expect, test } from 'bun:test'
import { hostOf, isHttpUrl, parseHttpUrl, validHttpUrlOrNull, withHttpsPrefix } from './url'

describe('parseHttpUrl', () => {
  test('liest eine gewöhnliche Adresse', () => {
    expect(parseHttpUrl('https://kochwelt.de/rezept')?.hostname).toBe('kochwelt.de')
  })

  test('http zählt genauso', () => {
    expect(parseHttpUrl('http://kochwelt.de')?.protocol).toBe('http:')
  })

  test('andere Schemata sind keine Web-Adressen', () => {
    expect(parseHttpUrl('javascript:alert(1)')).toBeNull()
    expect(parseHttpUrl('ftp://beispiel.de')).toBeNull()
    expect(parseHttpUrl('data:text/html,<b>x</b>')).toBeNull()
    expect(parseHttpUrl('mailto:wer@beispiel.de')).toBeNull()
  })

  test('ohne Hostnamen ist es keine Adresse', () => {
    expect(parseHttpUrl('http://')).toBeNull()
    expect(parseHttpUrl('https://')).toBeNull()
    // Zur Erinnerung, weil es beim Lesen überrascht: `https:///pfad` ist nach
    // WHATWG KEINE hostlose Adresse — der Parser liest `pfad` als Host. Der
    // Fall ist also gültig und wird bewusst nicht abgelehnt.
    expect(parseHttpUrl('https:///pfad')?.hostname).toBe('pfad')
  })

  test('kaputte Eingaben werfen nicht, sie liefern null', () => {
    expect(parseHttpUrl('kaputt')).toBeNull()
    expect(parseHttpUrl('')).toBeNull()
    expect(parseHttpUrl('   ')).toBeNull()
  })
})

describe('isHttpUrl', () => {
  test('trennt Web-Adressen von allem anderen', () => {
    expect(isHttpUrl('https://rewe.de')).toBe(true)
    expect(isHttpUrl('javascript:alert(1)')).toBe(false)
  })
})

describe('validHttpUrlOrNull', () => {
  test('gibt die getrimmte Eingabe zurück, nicht die normalisierte Adresse', () => {
    // `new URL('https://kochwelt.de').toString()` wäre 'https://kochwelt.de/'
    // — der angehängte Schrägstrich wäre eine Änderung, die kein Mensch
    // getippt hat und die auf jedem Gerät anders ankäme.
    expect(validHttpUrlOrNull('https://kochwelt.de')).toBe('https://kochwelt.de')
  })

  test('Grossbuchstaben im Host bleiben erhalten', () => {
    expect(validHttpUrlOrNull('https://WWW.Rewe.DE/Angebote')).toBe('https://WWW.Rewe.DE/Angebote')
  })

  test('Randleerzeichen fallen weg', () => {
    expect(validHttpUrlOrNull('  https://kochwelt.de/x  ')).toBe('https://kochwelt.de/x')
  })

  test('leer und nur Leerzeichen sind keine Adresse', () => {
    expect(validHttpUrlOrNull('')).toBeNull()
    expect(validHttpUrlOrNull('   ')).toBeNull()
    expect(validHttpUrlOrNull(null)).toBeNull()
    expect(validHttpUrlOrNull(undefined)).toBeNull()
  })

  test('nur http und https', () => {
    expect(validHttpUrlOrNull('javascript:alert(1)')).toBeNull()
    expect(validHttpUrlOrNull('ftp://beispiel.de/x')).toBeNull()
    expect(validHttpUrlOrNull('data:text/plain,x')).toBeNull()
  })

  test('Zugangsdaten machen die Adresse ungültig', () => {
    // Sie gehören niemals in eine synchronisierte Zeile: Der Wert läge im
    // Klartext auf dem Server und in jedem Gerät der geteilten Liste.
    expect(validHttpUrlOrNull('https://benutzer:geheim@beispiel.de/x')).toBeNull()
    expect(validHttpUrlOrNull('https://benutzer@beispiel.de/x')).toBeNull()
  })

  test('2000 Zeichen gehen, 2001 nicht', () => {
    const basis = 'https://beispiel.de/'
    const genau = basis + 'a'.repeat(2000 - basis.length)
    expect(genau.length).toBe(2000)
    expect(validHttpUrlOrNull(genau)).toBe(genau)
    expect(validHttpUrlOrNull(`${genau}a`)).toBeNull()
  })

  test('relative Pfade sind keine Adresse', () => {
    expect(validHttpUrlOrNull('/app/lists')).toBeNull()
    expect(validHttpUrlOrNull('rewe.de')).toBeNull()
  })
})

describe('withHttpsPrefix', () => {
  test('ergänzt das fehlende Schema', () => {
    expect(withHttpsPrefix('rewe.de/angebote')).toBe('https://rewe.de/angebote')
  })

  test('lässt ein vorhandenes Schema in Ruhe — auch ein fremdes', () => {
    // Ein fremdes Schema zu überschreiben würde aus `ftp://x` ein
    // `https://ftp://x` machen. Die Prüfung danach lehnt es ohnehin ab.
    expect(withHttpsPrefix('http://rewe.de')).toBe('http://rewe.de')
    expect(withHttpsPrefix('HTTPS://Rewe.de')).toBe('HTTPS://Rewe.de')
    expect(withHttpsPrefix('ftp://rewe.de')).toBe('ftp://rewe.de')
  })

  test('trimmt die Eingabe', () => {
    expect(withHttpsPrefix('  rewe.de  ')).toBe('https://rewe.de')
  })

  test('aus leer wird kein Schema-Torso mit Inhalt', () => {
    expect(validHttpUrlOrNull(withHttpsPrefix(''))).toBeNull()
  })
})

describe('hostOf', () => {
  test('führendes www. fällt weg, andere Subdomains bleiben', () => {
    expect(hostOf('https://www.rewe.de/angebote')).toBe('rewe.de')
    expect(hostOf('https://shop.rewe.de/p/1')).toBe('shop.rewe.de')
  })

  test('kleingeschrieben, ohne Port und ohne Zugangsdaten', () => {
    expect(hostOf('https://WWW.Rewe.DE:443/p?q=1')).toBe('rewe.de')
    expect(hostOf('https://benutzer:geheim@Beispiel.de/x')).toBe('beispiel.de')
  })

  test('unlesbare und fehlende Adressen haben keinen Host', () => {
    expect(hostOf('kaputt')).toBe('')
    expect(hostOf(null)).toBe('')
    expect(hostOf('')).toBe('')
  })
})
