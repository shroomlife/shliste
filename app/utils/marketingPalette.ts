// Illustrative Material You palettes. Android derives its actual scheme from the
// device wallpaper via dynamicLightColorScheme(), rather than these six presets.
export const marketingPalettes = [
  { name: 'Rose', accent: '#A6387D', primary: '#BC4E94', soft: '#F8DEEF', surface: '#FFFAFD', canvas: '#F8EAF2', ink: '#34232F', muted: '#78616F' },
  { name: 'Salbei', accent: '#456642', primary: '#52784D', soft: '#DDEBD6', surface: '#FBFDF7', canvas: '#EDF2E6', ink: '#263425', muted: '#63715E' },
  { name: 'Ozean', accent: '#365F91', primary: '#496FA5', soft: '#DCE8FA', surface: '#FAFCFF', canvas: '#EAF0FA', ink: '#253349', muted: '#626F85' },
  { name: 'Aprikose', accent: '#99502F', primary: '#AD613F', soft: '#FFE2CF', surface: '#FFFBF7', canvas: '#FBEEE2', ink: '#402E26', muted: '#806A5D' },
  { name: 'Lavendel', accent: '#6A5090', primary: '#8060A8', soft: '#EBDEFA', surface: '#FDFAFF', canvas: '#F1EAF8', ink: '#342B43', muted: '#786B84' },
  { name: 'Petrol', accent: '#236A70', primary: '#337C81', soft: '#D4EDEC', surface: '#F7FDFC', canvas: '#E4F1EF', ink: '#243B3D', muted: '#587375' },
] as const

export function marketingPaletteStyle(index: number) {
  const p = marketingPalettes[index % marketingPalettes.length]!
  return {
    '--demo-accent': p.accent, '--demo-soft': p.soft, '--demo-canvas': p.canvas,
    '--marketing-text-accent': p.accent, '--md-background': p.surface, '--md-on-background': p.ink,
    '--ui-primary': p.primary,
    '--md-primary': p.primary, '--md-on-primary': '#FFFFFF', '--md-secondary': p.soft,
    '--md-on-secondary': p.ink, '--md-secondary-container': p.soft, '--md-primary-container': p.soft,
    '--md-on-primary-container': p.ink, '--md-surface': p.surface, '--md-surface-container': p.canvas,
    '--md-surface-variant': p.soft, '--md-on-surface': p.ink, '--md-on-surface-variant': p.muted,
    '--md-check-surface': '#EFFAF5', '--md-check-content': '#2D9C74',
    '--md-undo-surface': '#FFF7ED', '--md-undo-content': '#F97316',
    '--md-delete-surface': '#FDECF5', '--md-delete-content': '#F53F96',
    '--md-muted-surface': '#E6E2E4',
  }
}
