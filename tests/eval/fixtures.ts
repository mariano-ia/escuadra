// Contextos de estudio sintéticos, en el MISMO formato que produce
// buildStudioContext() en src/lib/ingest/process.ts. El clasificador elige
// obra solo de esta lista, devolviendo el id entre [id:...].

export const FIXTURES: Record<string, string> = {
  "tres-obras": `Obras activas:
- Belgrano Cabildo (Av. Cabildo 2300) — cliente Familia Roca [id:obra-belgrano]
- Palermo Soho (Honduras 4521) — cliente Estudio Lemos [id:obra-palermo]
- Núñez Libertador (Av. del Libertador 7000) [id:obra-nunez]

Proveedores conocidos:
- Pinturas Sur (pintura)
- Plomería García (plomería)
- Aberturas del Norte (aberturas)

Obra activa de la sesión: (ninguna)`,

  "una-obra": `Obras activas:
- Casa Roca (Martínez) [id:obra-casaroca]

Proveedores conocidos:
(sin proveedores)

Obra activa de la sesión: (ninguna)`,

  "sin-obras": `Obras activas:
(sin obras todavía)

Proveedores conocidos:
(sin proveedores)

Obra activa de la sesión: (ninguna)`,

  "activa-belgrano": `Obras activas:
- Belgrano Cabildo (Av. Cabildo 2300) — cliente Familia Roca [id:obra-belgrano]
- Palermo Soho (Honduras 4521) — cliente Estudio Lemos [id:obra-palermo]

Proveedores conocidos:
- Pinturas Sur (pintura)

Obra activa de la sesión: Belgrano Cabildo [id:obra-belgrano]`,
};

export type FixtureName = keyof typeof FIXTURES;
