# Bun-Fassung identisch zu `packageManager` in der package.json. Weicht sie ab,
# löst der Build im Bild andere Abhängigkeiten auf als der Build auf dem
# Rechner — und genau das soll ein Lockfile verhindern.
FROM oven/bun:1.3.14-alpine AS builder

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

FROM oven/bun:1.3.14-alpine AS runtime

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
