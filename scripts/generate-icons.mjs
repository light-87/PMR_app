// One-off: generate square PWA icons from the landscape logo.png.
// Centered on white background with appropriate safe-area padding.
import sharp from 'sharp'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')
const src = path.join(root, 'logo.png')
const outDir = path.join(root, 'public', 'icons')

const variants = [
  // Standard "any" icons — logo fills ~85% of canvas width.
  { name: 'icon-192.png', size: 192, scale: 0.85 },
  { name: 'icon-512.png', size: 512, scale: 0.85 },
  // Apple touch icon — same sizing.
  { name: 'icon-180.png', size: 180, scale: 0.85 },
  // Maskable: Android adaptive icon clips to a circle/squircle, so logo lives in
  // the inner 60% safe area to survive any mask shape.
  { name: 'icon-maskable-512.png', size: 512, scale: 0.6 },
]

for (const v of variants) {
  const targetWidth = Math.round(v.size * v.scale)
  const resized = await sharp(src)
    .resize({ width: targetWidth, fit: 'inside' })
    .toBuffer()

  await sharp({
    create: {
      width: v.size,
      height: v.size,
      channels: 4,
      background: { r: 255, g: 255, b: 255, alpha: 1 },
    },
  })
    .composite([{ input: resized, gravity: 'center' }])
    .png()
    .toFile(path.join(outDir, v.name))

  console.log(`wrote ${v.name} (${v.size}x${v.size})`)
}
