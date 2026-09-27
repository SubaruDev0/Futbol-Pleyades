/**
 * El cúmulo de las Pléyades tal como se ve en el cielo: nueve estrellas con
 * nombre y las líneas que las unen en los mapas estelares. Fuente única para
 * el logo y para el fondo, así los dos dibujan exactamente la misma forma.
 * Coordenadas sobre un lienzo de 640 x 400.
 */
export interface Sister {
  name: string
  x: number
  y: number
  /** Radio relativo: Alcyone es la más brillante del cúmulo. */
  r: number
}

export const SISTERS: Sister[] = [
  { name: 'Asterope 2', x: 438, y: 101, r: 3 },
  { name: 'Asterope 1', x: 423, y: 116, r: 3.5 },
  { name: 'Taygeta', x: 488, y: 135, r: 5 },
  { name: 'Maia', x: 441, y: 169, r: 5.5 },
  { name: 'Celaeno', x: 518, y: 198, r: 4 },
  { name: 'Pleione', x: 191, y: 247, r: 4 },
  { name: 'Electra', x: 513, y: 262, r: 6 },
  { name: 'Alcyone', x: 320, y: 261, r: 7 },
  { name: 'Atlas', x: 196, y: 278, r: 5.5 },
  { name: 'Merope', x: 406, y: 315, r: 5.5 },
]

export const ALCYONE = 'Alcyone'

const PAIRS: [string, string][] = [
  ['Asterope 2', 'Asterope 1'],
  ['Asterope 1', 'Maia'],
  ['Maia', 'Taygeta'],
  ['Taygeta', 'Celaeno'],
  ['Celaeno', 'Electra'],
  ['Electra', 'Merope'],
  ['Merope', 'Alcyone'],
  ['Alcyone', 'Atlas'],
  ['Atlas', 'Pleione'],
]

const at = (name: string) => SISTERS.find(s => s.name === name)!

export const CLUSTER_LINES = PAIRS.map(([a, b]) => {
  const p = at(a)
  const q = at(b)
  return { x1: p.x, y1: p.y, x2: q.x, y2: q.y }
})
