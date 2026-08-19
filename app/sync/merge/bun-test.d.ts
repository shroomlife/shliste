/**
 * Typdeklaration für `bun:test`.
 *
 * WARUM DIESE DATEI EXISTIERT: Die Tests laufen mit `bun test`, aber das
 * Projekt hat (noch) keine Bun-Typen als devDependency, und Nuxts generiertes
 * `tsconfig` setzt `types: []` — automatisch eingelesen würde ein
 * `@types/bun`-Paket also ohnehin nicht. Ohne diese Deklaration scheitert
 * `nuxt typecheck` an `Cannot find module 'bun:test'`.
 *
 * BEIM AUFRÄUMEN: Sobald `@types/bun` als devDependency liegt und in
 * `nuxt.config.ts` unter `typescript.tsConfig.compilerOptions.types` eingetragen
 * ist, gehört diese Datei gelöscht — zwei Deklarationen desselben Moduls
 * widersprechen sich sonst. Deklariert ist bewusst nur, was die Tests in
 * diesem Verzeichnis tatsächlich benutzen.
 */
declare module 'bun:test' {
  interface Matchers {
    toBe: (expected: unknown) => void
    toEqual: (expected: unknown) => void
    toBeNull: () => void
    toBeUndefined: () => void
    toContain: (expected: unknown) => void
    toHaveLength: (expected: number) => void
    toBeGreaterThan: (expected: number) => void
    toBeLessThan: (expected: number) => void
    toThrow: (expected?: string | RegExp) => void
    readonly not: Matchers
  }

  export function describe(label: string, fn: () => void): void
  export function test(label: string, fn: () => void): void
  export function expect(value: unknown): Matchers
}
