---
name: escuadra-visual-system
description: Use when building or styling ANY Escuadra surface — web panel, React components, the public client report (/r/[token]), emails, or marketing pages — to match the product's presentation deck. Triggers whenever you write CSS/Tailwind/JSX for Escuadra UI.
---

# Escuadra Visual System

## Overview

Escuadra's visual language is the one in `deck_escuadra.html`: a **monochrome warm "stone"
palette with NO accent color**. The accent IS the **line** — blueprint grid, dimension lines
(cotas), hairlines, and the set-square (escuadra) motif. The feel is a calm architecture
studio, not a generic SaaS dashboard. When in doubt, open the deck and copy its treatment.

**Verification (its "test"):** a rendered Escuadra screen placed next to a deck slide should
read as the same product — same palette, type, line motifs, generous air. If it looks like a
default dashboard template, it's wrong.

## Design tokens (port to `globals.css` `:root`)

```css
--bg:#ffffff;          /* base */
--paper:#f6f5f1;       /* piedra muy clara, paneles sutiles */
--ink:#16150f;         /* casi negro, levemente cálido — texto/líneas fuertes */
--grey:#6f6e66;        /* texto secundario */
--grey-soft:#9a988f;   /* labels */
--grey-light:#c6c4ba;  /* ticks, marcas tenues */
--rule:#e4e2da;        /* hairline (bordes de cards, cotas) */
--rule-soft:#efeee8;   /* hairline aún más tenue (divisores de lista) */
```

No hay color de acento. No agregar azules/verdes de "primary". El énfasis se logra con peso
de línea (`--ink` vs `--rule`) y con aire, no con color.

## Tipografía

- **Display / títulos:** `Archivo` (pesos 400/500/600), tracking negativo (`letter-spacing:-.02em`), escala contenida, `text-wrap:balance`.
- **Cuerpo:** `Inter` (400/500), `line-height` ~1.6, color `--grey`.
- **Labels / eyebrows:** Archivo 500, `text-transform:uppercase`, `letter-spacing:.2em–.26em`, color `--grey-soft`/`--grey-light`.
- Pesos livianos, mucho aire. Nunca bold pesado ni mayúsculas gritonas fuera de labels.

## Motivos visuales (reutilizar del deck)

- **Retícula de plano** de fondo (`linear-gradient` 60px, máscara radial, opacidad baja).
- **Marcas de recorte** en esquinas (`.crop`) = esquinas de escuadra.
- **Líneas de cota** (`.dim`) como divisores: hairline `--rule` con ticks verticales en los extremos + micro-label uppercase.
- **Cards planas**: borde `1px solid --rule`, fondo `--bg`, índice numerado (`01`,`02`…) en Archivo arriba a la derecha, **tick de esquina** abajo a la derecha; hover mínimo (borde `--grey-soft` + `translateY(-2px)`). Sin sombras pesadas.
- **Marca/logo:** triángulo de escuadra SVG con ticks de graduación en la base + wordmark `ESCUADRA` (Archivo 600, uppercase, `letter-spacing:.36em`).
- Iconos: línea fina (`stroke-width` ~1.25–1.5), `fill:none`, monocromos `--ink`/`--grey`.
- Bordes 1–2px, radios chicos (2–14px), sombras solo sutiles (ej. el mockup de chat).
- Entrada sutil (`data-reveal`: opacity + translateY pequeño). **Respetar `prefers-reduced-motion`** (todo a estado final, sin animación).

## El informe público (`/r/[token]`)

Hereda esta estética + el **logo del estudio**: mobile-first, prolijo, sensación de "ficha
técnica de estudio", no galería genérica. Fotos en grilla con hairlines, título en Archivo,
nota del arquitecto en Inter, fecha y marca al pie.

## Do / Don't

| Hacé | No hagas |
|---|---|
| Jerarquía con peso de línea + aire | Color de acento para "primary" |
| Cards planas hairline con índice + tick | Cards con sombra grande / glassmorphism |
| Archivo (display) + Inter (body) | Fuentes del sistema o una sola fuente |
| Calma, silencio visual, mucho margen | Densidad de dashboard / data-grid apretado |
| `prefers-reduced-motion` respetado | Animaciones llamativas o spinners ruidosos |

## Common mistakes

- Meter un color "de marca" porque "se ve plano": el plano ES la marca.
- Copiar la config de Tailwind v3 de Social Publisher → Escuadra usa **Tailwind v4** (`@import "tailwindcss"`, plugin `@tailwindcss/postcss`).
- Olvidar el grid de plano / las cotas → la UI pierde el lenguaje del deck.
