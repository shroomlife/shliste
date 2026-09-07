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
    // Der überraschende Fall, und warum er trotzdem abgelehnt wird: Nach
    // WHATWG ist `https:///pfad` KEINE hostlose Adresse — der Parser überliest
    // den leeren Autoritätsteil und liest `pfad` als Host. Die Prüfung auf
    // `hostname.length` greift hier also nie.
    //
    // Abgelehnt wird trotzdem, über eine zweite Prüfung an der rohen Eingabe:
    // Der Android-Client lehnt so eine Adresse über sein Muster ohnehin ab, und
    // ohne diese Zeile gäben Client und Server verschiedene Antworten. Seit dem
    // 27.08.2026 steht der Fall in link-fixtures.json und gilt für alle drei
    // Repos.
    expect(parseHttpUrl('https:///pfad')).toBeNull()
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

  test('Großbuchstaben im Host bleiben erhalten', () => {
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

  test('ein Leerzeichen AB DEM PFAD macht eine Adresse NICHT ungültig', () => {
    // WICHTIG UND LEICHT ZU VERWECHSELN: „kein innerer Leerraum" ist eine
    // Regel der EINGABEZEILE (`detectLinkInput`) und keine der Adressprüfung.
    // Der Server-Sanitizer lehnt so etwas ebenfalls nicht ab — wer eine
    // Adresse mit Leerzeichen ins Link-Feld einfügt oder teilt, bekommt sie
    // gespeichert.
    //
    // DAS IST KEIN FEINSCHLIFF, SONDERN EIN DATENVERLUST-BEFUND aus dem
    // Android-Repo: Diese Prüfung läuft an JEDER Schreibstelle, nicht nur an
    // frisch getippten Eingaben. Eine strengere Regel hätte eine längst
    // gespeicherte, gültige Adresse beim nächsten Schreibvorgang auf `null`
    // gesetzt — an einer Zeile, die bloß abgehakt wurde, und für alle
    // Mitglieder einer geteilten Liste.
    expect(validHttpUrlOrNull('https://x.de/a b')).toBe('https://x.de/a b')
    expect(validHttpUrlOrNull('https://x.de/a?q=1 2')).toBe('https://x.de/a?q=1 2')
    expect(hostOf('https://x.de/a b')).toBe('x.de')
  })

  test('ein Leerzeichen IM HOSTNAMEN macht sie sehr wohl ungültig', () => {
    expect(validHttpUrlOrNull('https://x .de/a')).toBeNull()
    expect(validHttpUrlOrNull('https://x.de /a')).toBeNull()
  })

  test('Steuerzeichen fallen überall durch — auch versteckt im Hostnamen', () => {
    // DIE FALLE: Der WHATWG-Parser ENTFERNT Tabulator, Zeilenvorschub und
    // Wagenrücklauf still aus der Eingabe, bevor er sie liest. `new URL`
    // liefert für die erste Zeile hier klaglos den Host `x.de` — und weil
    // diese Funktion die EINGABE zurückgibt und nicht `toString()`, landete
    // der Umbruch sonst in der gespeicherten Adresse. Ein Leerzeichen an
    // derselben Stelle wird abgelehnt; ohne diese Prüfung käme man mit einem
    // Umbruch also an genau dem Schutz vorbei, der den Hostnamen schützt.
    expect(validHttpUrlOrNull('https://x\n.de/a')).toBeNull()
    expect(validHttpUrlOrNull('https://x\t.de/a')).toBeNull()
    expect(validHttpUrlOrNull('https://x.de/a\nb')).toBeNull()
    expect(validHttpUrlOrNull('https://x.de/a\rb')).toBeNull()
    expect(validHttpUrlOrNull('https://x.de/a\u0000b')).toBeNull()

    // Und derselbe Wert taugt auch nicht als `href` oder als Host.
    expect(isHttpUrl('https://x\n.de/a')).toBe(false)
    expect(hostOf('https://x\n.de/a')).toBe('')
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
