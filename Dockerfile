# Der Build läuft unter Node, nicht unter Bun: Nuxt 4.6 und @nuxtjs/seo 6
# verlangen Node ^22.22.3 || ^24.15.0 || >=26, und nuxt-og-image ruft beim
# Build module.findPackageJSON auf, das Bun als Node-Ersatz nicht kennt.
# Bun bleibt Paketmanager und Laufzeit des fertigen Servers.
FROM node:24.22.1-alpine AS builder

# Bun-Fassung identisch zu `packageManager` in der package.json. Weicht sie ab,
# löst der Build im Bild andere Abhängigkeiten auf als der Build auf dem
# Rechner — und genau das soll ein Lockfile verhindern.
COPY --from=oven/bun:1.4.4-alpine /usr/local/bin/bun /usr/local/bin/bun

WORKDIR /app

COPY package.json bun.lock ./

# --frozen-lockfile: Die Pipeline darf keine anderen Fassungen ziehen als die,
# die geprüft wurden. Ohne das Flag aktualisiert bun das Lockfile still.
RUN bun install --frozen-lockfile

COPY . .

# NODE_ENV bleibt hier ungesetzt: `nuxt build` braucht die
# Entwicklungsabhängigkeiten, und `production` würde manche Werkzeuge dazu
# bringen, sie zu überspringen. Die Ausgabe ist trotzdem ein Produktionsbau —
# das entscheidet Nuxt selbst, nicht diese Variable.
RUN bun run build

# Dieselbe Bun-Fassung wie im Builder (siehe oben).
FROM oven/bun:1.4.4-alpine AS runtime

WORKDIR /app

# PRODUKTION HEISST PRODUKTION. Vorher stand hier `development`, in beiden
# Stufen — der laufende Server hat sich damit in Produktion wie ein
# Entwicklungsserver verhalten (ausführlichere Fehlerseiten, keine
# Produktionspfade in Abhängigkeiten, die auf NODE_ENV schauen).
ENV NODE_ENV=production

# Kein zweites node_modules: Der Bun-Preset von Nitro legt alles Nötige nach
# .output/server/node_modules. Eine getrennte Stufe mit `bun install
# --production` kopierte bisher ein zweites, unbenutztes Abhängigkeitsbündel
# ins Bild.
COPY --from=builder /app/.output ./.output

EXPOSE 3000

CMD ["bun", ".output/server/index.mjs"]
