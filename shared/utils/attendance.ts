interface Attendee {
  status: string
  spectatorPays: boolean
}

/** Juega: entra al sorteo, ocupa cupo y aparece en la planilla. */
export const isPlaying = (p: Pick<Attendee, 'status'>) => p.status === 'voy'

/** Mira desde afuera: no juega ni ocupa cupo, aunque igual puede repartir la cancha. */
export const isSpectator = (p: Pick<Attendee, 'status'>) => p.status === 'espectador'

/** Entra en el reparto del costo: quienes juegan y los espectadores que dijeron que pagan. */
export const sharesCost = (p: Attendee) => p.status === 'voy' || (p.status === 'espectador' && p.spectatorPays)
