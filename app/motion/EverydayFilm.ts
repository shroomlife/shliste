import { createElement as h } from 'react'
import { AbsoluteFill, Img, interpolate, useCurrentFrame, useVideoConfig } from 'remotion'

// Ausschließlich unveränderte, dokumentierte App-Screenshots. Die Kamerafahrt und
// die schwebenden Ausschnitte illustrieren den Ablauf; sie simulieren keinen Live-Sync.
export function EverydayFilm({ scene = 'recipe' }: { scene?: string }) {
  const frame = useCurrentFrame()
  const { fps, width } = useVideoConfig()
  const t = frame / fps
  const mobile = width < 800
  const c = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const
  const shared = scene === 'shared'
  const photo = scene === 'photo'
  const voice = scene === 'voice'
  const left = shared ? 'android-list-detail.png' : photo ? 'links.png' : voice ? 'list.png' : 'recipe.png'
  const right = shared ? (t > 8 ? 'android-list-shared-checked.png' : 'android-list-detail.png') : photo ? 'recipe.png' : 'list.png'
  const heading = shared ? ['Sam ergänzt. Du kaufst ein.', 'Ein gemeinsamer Stand.'] : photo ? ['Eine Fundstelle wird ein Rezept.', 'Wiederfinden. Weiterkochen.'] : voice ? ['Dein Gedanke bekommt einen Platz.', 'Alles auf deiner Liste.'] : ['Dein Rezept. Euer Einkauf.', 'Von der Kochidee zum Einkauf.']
  const description = shared ? 'Mit Verbindung abgleichen' : photo ? 'Angaben am Original kontrollieren' : voice ? 'Erkannte Einträge kontrollieren' : 'Nur fehlende Zutaten auswählen'
  const shotWidth = mobile ? 255 : 280
  const top = mobile ? 245 : 205
  const x1 = mobile ? 28 : 115
  const x2 = mobile ? 335 : 735
  const screen = (file: string, x: number, angle: number, delay: number) => h('div', { style: { position: 'absolute', left: x, top, width: shotWidth, height: mobile ? 540 : 535, overflow: 'hidden', borderRadius: 26, border: '6px solid #fff', boxShadow: '0 24px 55px #a6387d26', rotate: `${angle * interpolate(t, [delay, delay + 2], [1, 0.35], c)}deg`, translate: `0 ${interpolate(t, [delay, delay + 1], [28, 0], c)}px` } }, h(Img, { src: `/images/screenshots/${file}`, style: { width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top' } }))
  return h(AbsoluteFill, { style: { background: '#fff8fc', color: '#27232a', fontFamily: 'Zain, sans-serif', overflow: 'hidden' } },
    h('div', { style: { position: 'absolute', width: 850, height: 850, left: width / 2 - 425, top: 110, borderRadius: '50%', background: 'radial-gradient(circle, #f5bcda 0%, #fdebf5 50%, transparent 70%)', scale: 1 + Math.sin(t * 0.7) * 0.05 } }),
    h(Img, { src: '/images/brand/wordmark.svg', style: { position: 'absolute', width: 138, left: 36, top: 28 } }),
    h('div', { style: { position: 'absolute', left: 36, top: 85, fontSize: mobile ? 43 : 54, fontWeight: 800, lineHeight: 1.05, letterSpacing: -1, maxWidth: width - 72 } }, heading[t > 7 ? 1 : 0]),
    h('div', { style: { position: 'absolute', left: 36, top: mobile ? 185 : 150, fontSize: mobile ? 24 : 23, color: '#9d3575' } }, description),
    screen(left, x1, -5, 0), screen(right, x2, 5, 0.3),
    h('div', { style: { position: 'absolute', left: mobile ? 276 : 514, top: mobile ? 460 : 400, fontSize: mobile ? 42 : 64, color: '#a6387d', opacity: interpolate(t, [1, 3, 6], [0.3, 1, 0.3], c) } }, '→'),
    // Originalausschnitt des Zutaten-Buttons aus der PWA als visueller Übergang.
    !shared && !photo && !voice ? h('div', { style: { position: 'absolute', left: interpolate(t, [2, 6], [x1, x2], c), top: interpolate(t, [2, 4, 6], [top + 355, top + 170, top + 320], c), width: shotWidth, height: 45, overflow: 'hidden', borderRadius: 12, boxShadow: '0 10px 35px #a6387d40', opacity: interpolate(t, [1.5, 2, 5.7, 6.3], [0, 1, 1, 0], c), scale: interpolate(t, [2, 4, 6], [1, 1.25, 1], c) } }, h(Img, { src: '/images/screenshots/recipe.png', style: { position: 'absolute', width: shotWidth, left: 0, top: -shotWidth * 545 / 390 } })) : null,
    h('div', { style: { position: 'absolute', left: mobile ? 38 : 420, top: mobile ? 810 : 620, padding: '13px 24px', background: '#a6387d', color: '#fff', borderRadius: 30, fontSize: mobile ? 25 : 24, boxShadow: '0 10px 30px #a6387d20', scale: interpolate(t, [6.5, 7.2], [0.9, 1], c) } }, t > 8 ? shared ? 'Rucola abgehakt. Gemeinsam aktuell.' : 'Deine Inhalte. Wieder griffbereit.' : shared ? 'Zwei Geräte · dieselbe Liste' : 'Rezept & Einkauf bleiben verbunden'),
    h('div', { style: { position: 'absolute', left: 36, bottom: mobile ? 72 : 80, fontSize: mobile ? 21 : 19, color: '#75546b', maxWidth: width - 72, lineHeight: 1.25 } }, 'Echte App-Aufnahmen mit Beispieldaten · animierte Erklärung. Kein Live-Mitschnitt.'))
}
