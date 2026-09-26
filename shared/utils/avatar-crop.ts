/**
 * Encuadre de un avatar dentro de su foto original, independiente de cualquier
 * tamaño de pantalla: cx/cy es el centro del cuadrado de recorte como fracción
 * del ancho y alto del original, y zoom 1 significa que el cuadrado abarca el
 * lado más corto del original.
 */
export interface AvatarCrop {
  cx: number
  cy: number
  zoom: number
}

export const AVATAR_MAX_ZOOM = 5

export const DEFAULT_AVATAR_CROP: AvatarCrop = { cx: 0.5, cy: 0.5, zoom: 1 }

/** Mantiene el cuadrado de recorte dentro de la foto, para que el avatar nunca muestre bordes vacíos. */
export function clampAvatarCrop(crop: AvatarCrop, width: number, height: number): AvatarCrop {
  const zoom = Math.min(AVATAR_MAX_ZOOM, Math.max(1, Number.isFinite(crop.zoom) ? crop.zoom : 1))
  const half = Math.min(width, height) / zoom / 2
  const clampAxis = (c: number, size: number) => {
    const px = (Number.isFinite(c) ? c : 0.5) * size
    return Math.min(size - half, Math.max(half, px)) / size
  }
  return { cx: clampAxis(crop.cx, width), cy: clampAxis(crop.cy, height), zoom }
}
