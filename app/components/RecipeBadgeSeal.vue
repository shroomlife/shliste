<template>
  <span
    class="recipe-badge-seal"
    aria-hidden="true"
  >
    <svg
      viewBox="0 0 100 100"
      focusable="false"
    >
      <path
        d="M50.00,3.65 L52.39,4.39 L54.63,5.92 L56.83,6.89 L59.22,6.64 L61.82,5.88 L64.32,5.92 L66.37,7.36 L68.03,9.51 L69.82,11.11 L72.16,11.61 L74.88,11.69 L77.24,12.50 L78.74,14.50 L79.66,17.06 L80.87,19.13 L82.94,20.34 L85.50,21.26 L87.50,22.76 L88.31,25.12 L88.39,27.84 L88.89,30.18 L90.49,31.97 L92.64,33.63 L94.08,35.68 L94.12,38.18 L93.36,40.78 L93.11,43.17 L94.08,45.37 L95.61,47.61 L96.35,50.00 L95.61,52.39 L94.08,54.63 L93.11,56.83 L93.36,59.22 L94.12,61.82 L94.08,64.32 L92.64,66.37 L90.49,68.03 L88.89,69.82 L88.39,72.16 L88.31,74.88 L87.50,77.24 L85.50,78.74 L82.94,79.66 L80.87,80.87 L79.66,82.94 L78.74,85.50 L77.24,87.50 L74.88,88.31 L72.16,88.39 L69.82,88.89 L68.03,90.49 L66.37,92.64 L64.32,94.08 L61.82,94.12 L59.22,93.36 L56.83,93.11 L54.63,94.08 L52.39,95.61 L50.00,96.35 L47.61,95.61 L45.37,94.08 L43.17,93.11 L40.78,93.36 L38.18,94.12 L35.68,94.08 L33.63,92.64 L31.97,90.49 L30.18,88.89 L27.84,88.39 L25.12,88.31 L22.76,87.50 L21.26,85.50 L20.34,82.94 L19.13,80.87 L17.06,79.66 L14.50,78.74 L12.50,77.24 L11.69,74.88 L11.61,72.16 L11.11,69.82 L9.51,68.03 L7.36,66.37 L5.92,64.32 L5.88,61.82 L6.64,59.22 L6.89,56.83 L5.92,54.63 L4.39,52.39 L3.65,50.00 L4.39,47.61 L5.92,45.37 L6.89,43.17 L6.64,40.78 L5.88,38.18 L5.92,35.68 L7.36,33.63 L9.51,31.97 L11.11,30.18 L11.61,27.84 L11.69,25.12 L12.50,22.76 L14.50,21.26 L17.06,20.34 L19.13,19.13 L20.34,17.06 L21.26,14.50 L22.76,12.50 L25.12,11.69 L27.84,11.61 L30.18,11.11 L31.97,9.51 L33.63,7.36 L35.68,5.92 L38.18,5.88 L40.78,6.64 L43.17,6.89 L45.37,5.92 L47.61,4.39 Z"
        fill="#D2A76F"
        stroke="#6D422B"
        stroke-width="1.5"
        stroke-linecap="round"
      />
      <path
        d="M50,9 A41,41 0 1,1 49.99,9 Z"
        fill="#FBE5B7"
      />
      <path
        d="M50,14 A36,36 0 1,1 49.99,14 Z"
        fill="#552A40"
        stroke="#AD774B"
        stroke-width="1.5"
        stroke-linecap="round"
      />
      <path
        d="M50,18 A32,32 0 1,1 49.99,18 Z"
        fill="none"
        stroke="#BA8A70"
        stroke-width="0.85"
        stroke-linecap="round"
      />
      <path
        d="M32,52 Q34,67 50,68 Q66,67 68,52 Z"
        fill="#F3D8A1"
      />
      <path
        d="M30,51 H70 M42,71 H58"
        fill="none"
        stroke="#F8E1B8"
        stroke-width="2.6"
        stroke-linecap="round"
      />
      <path
        d="M50,47 C46,44 38,40 40,34 C42,29 48,30 50,34 C53,29 59,29 61,34 C63,40 54,45 50,47 Z"
        fill="#F3A4B0"
      />
      <path
        d="M28,37 L29,40 L32,41 L29,42 L28,45 L27,42 L24,41 L27,40 Z M71,30 L72,34 L76,35 L72,36 L71,40 L70,36 L66,35 L70,34 Z"
        fill="#F6DCAD"
      />
    </svg>
  </span>
</template>

<style scoped>
.recipe-badge-seal { position: relative; display: inline-grid; flex: none; width: var(--seal-size, 3.15rem); aspect-ratio: 1; filter: drop-shadow(0 2px 2px #160a13a0); }
.recipe-badge-seal svg { display: block; width: 100%; height: 100%; }
@media (prefers-reduced-motion: no-preference) {
  .celebration-seal::after {
    content: ''; position: absolute; inset: 5%; border-radius: 50%; pointer-events: none;
    background: linear-gradient(113deg, transparent 35%, #fff5ce82 50%, transparent 65%) no-repeat;
    background-size: 220% 100%; animation: medal-glint .95s .18s ease-in-out both;
  }
}
@keyframes medal-glint { from { background-position: 140% 0; } to { background-position: -40% 0; } }
</style>
