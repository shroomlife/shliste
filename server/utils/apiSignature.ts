/**
 * HMAC-SHA256-Signatur für api.shliste.app.
 *
 * Die API sichert JEDE Route mit einer Signatur ab, die das geteilte
 * APP_SECRET voraussetzt. Das Secret darf niemals in den Browser gelangen,
 * deshalb signiert ausschliesslich der Nitro-Server — dieses Modul ist der
 * einzige Ort im Projekt, der das Secret liest.
 *
 * Der Algorithmus ist aus api.shliste.app/src/index.ts (Guard im .derive())
 * übernommen und muss byteweise identisch bleiben, sonst antwortet die API 403:
 *
 *   bodyHash  = sha256hex(rawBody)                              // leerer Body -> sha256hex("")
 *   message   = `${METHOD}|${pathname}|${timestamp}|${bodyHash}`
 *   signature = HMAC-SHA256(APP_SECRET, message) als Hex
 *
 * Zwei Fallstricke, beide im API-Code belegt:
 * 1. Signiert wird NUR der pathname. Der Query-String geht NICHT ein — die API
 *    bildet die Nachricht aus `new URL(request.url).pathname`.
 * 2. Das Zeitfenster ist ±30 Sekunden. Geht die Serveruhr falsch, scheitert
 *    jede Anfrage mit 403, ohne dass an der Signatur etwas falsch wäre.
 */
import { createHash, createHmac } from 'node:crypto'

/** Die drei Header, die jede signierte Anfrage an die API mitführen muss. */
export interface ApiSignatureHeaders {
  'x-auth-timestamp': string
  'x-auth-signature': string
  'x-auth-body-hash': string
}

/**
 * sha256-Hex über den rohen Body.
 *
 * Es wird exakt der String gehasht, der auch gesendet wird. Ein erneutes
 * Serialisieren zwischen Hashen und Senden würde die Bytes verändern können
 * (Zahlenformat, Unicode-Escapes) und den Body-Hash-Vergleich der API brechen.
 */
export function hashBody(rawBody = ''): string {
  return createHash('sha256').update(rawBody, 'utf8').digest('hex')
}

/**
 * Baut die zu signierende Nachricht.
 *
 * `pathname` heisst wörtlich pathname: ohne Query-String, ohne Fragment. Wer
 * hier den vollen Pfad inklusive `?since=...` übergibt, erzeugt eine Signatur,
 * die die API nicht nachrechnen kann.
 */
export function buildSignatureMessage(
  method: string,
  pathname: string,
  timestamp: number,
  bodyHash: string,
): string {
  return `${method.toUpperCase()}|${pathname}|${timestamp}|${bodyHash}`
}

/**
 * Reine Signaturbildung mit explizitem Secret und explizitem Zeitstempel.
 *
 * Bewusst frei von Nitro-Kontext: so ist der Algorithmus ohne laufenden Server
 * testbar (siehe server/tests/apiSignature.test.ts). Den Nitro-Weg geht
 * `signRequest()` weiter unten.
 */
export function createSignatureHeaders(
  secret: string,
  method: string,
  pathname: string,
  rawBody = '',
  timestamp: number = Date.now(),
): ApiSignatureHeaders {
  const bodyHash = hashBody(rawBody)
  const message = buildSignatureMessage(method, pathname, timestamp, bodyHash)

  return {
    'x-auth-timestamp': String(timestamp),
    'x-auth-signature': createHmac('sha256', secret).update(message, 'utf8').digest('hex'),
    'x-auth-body-hash': bodyHash,
  }
}

/**
 * Signiert eine Anfrage mit dem Secret aus der server-only runtimeConfig.
 *
 * Gelesen wird ausschliesslich `useRuntimeConfig().appSecret` — niemals über
 * `public`. Alles unterhalb von `public` wird beim Build ins Browser-Bundle
 * inlined und wäre in diesem öffentlichen Repo für jeden lesbar.
 */
export function signRequest(method: string, pathname: string, rawBody = ''): ApiSignatureHeaders {
  return createSignatureHeaders(readAppSecret(), method, pathname, rawBody)
}

/**
 * Fail fast: Ohne Secret ist keine einzige API-Anfrage möglich.
 *
 * Bewusst beim ersten Gebrauch und nicht beim Modul-Import: die runtimeConfig
 * steht erst zur Laufzeit fest (NUXT_APP_SECRET wird im Container gesetzt, nicht
 * beim Build). Ein leerer Wert erzeugt sonst still eine Signatur, die die API
 * mit 403 ablehnt — ein Fehlerbild, das nach Signaturbug aussieht statt nach
 * fehlender Konfiguration.
 */
function readAppSecret(): string {
  const { appSecret } = useRuntimeConfig()

  if (!appSecret) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Server nicht konfiguriert',
      message: 'NUXT_APP_SECRET ist nicht gesetzt — ohne das Secret kann der Server keine Anfrage an api.shliste.app signieren.',
    })
  }

  return appSecret
}
