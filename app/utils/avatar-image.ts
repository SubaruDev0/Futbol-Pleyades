export const AVATAR_PX = 256
export const AVATAR_SOURCE_MAX_PX = 1600

const canvasBlob = (canvas: HTMLCanvasElement, type: string, quality: number) =>
  new Promise<Blob | null>(resolve => canvas.toBlob(resolve, type, quality))

function makeCanvas(width: number, height: number) {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('canvas')
  // Los PNG transparentes se volverían negros como JPEG; se les da la superficie "raised" de la app.
  const backdrop = getComputedStyle(document.documentElement).getPropertyValue('--pl-raised').trim()
  if (backdrop) {
    ctx.fillStyle = backdrop
    ctx.fillRect(0, 0, width, height)
  }
  ctx.imageSmoothingQuality = 'high'
  return { canvas, ctx }
}

async function encode(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  const webp = await canvasBlob(canvas, 'image/webp', quality)
  if (webp?.type === 'image/webp') return webp
  const jpeg = await canvasBlob(canvas, 'image/jpeg', quality)
  if (!jpeg) throw new Error('encode')
  return jpeg
}

/** Decodifica un archivo elegido, respetando la rotación EXIF donde el navegador lo soporta. */
async function decodeFile(file: File) {
  try {
    const bmp = await createImageBitmap(file, { imageOrientation: 'from-image' })
    return { source: bmp as CanvasImageSource, width: bmp.width, height: bmp.height, done: () => bmp.close() }
  }
  catch {
    const url = URL.createObjectURL(file)
    try {
      const img = await loadImage(url)
      return { source: img as CanvasImageSource, width: img.naturalWidth, height: img.naturalHeight, done: () => URL.revokeObjectURL(url) }
    }
    catch (e) {
      URL.revokeObjectURL(url)
      throw e
    }
  }
}

export async function loadImage(src: string): Promise<HTMLImageElement> {
  const img = new Image()
  img.src = src
  await img.decode()
  return img
}

/** El original que se guarda para volver a encuadrar después: lado largo de máximo 1600 px. */
export async function downscaleSource(file: File): Promise<Blob> {
  const image = await decodeFile(file)
  try {
    const ratio = Math.min(1, AVATAR_SOURCE_MAX_PX / Math.max(image.width, image.height))
    const width = Math.max(1, Math.round(image.width * ratio))
    const height = Math.max(1, Math.round(image.height * ratio))
    const { canvas, ctx } = makeCanvas(width, height)
    ctx.drawImage(image.source, 0, 0, width, height)
    return await encode(canvas, 0.85)
  }
  finally {
    image.done()
  }
}

/** Recorta el cuadrado encuadrado del original y lo reduce a 256 px. */
export async function renderAvatar(img: HTMLImageElement, crop: AvatarCrop): Promise<Blob> {
  const w = img.naturalWidth
  const h = img.naturalHeight
  const { cx, cy, zoom } = clampAvatarCrop(crop, w, h)
  const side = Math.min(w, h) / zoom
  const { canvas, ctx } = makeCanvas(AVATAR_PX, AVATAR_PX)
  ctx.drawImage(img, cx * w - side / 2, cy * h - side / 2, side, side, 0, 0, AVATAR_PX, AVATAR_PX)
  return encode(canvas, 0.86)
}
