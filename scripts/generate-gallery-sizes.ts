import { mkdir, writeFile } from 'node:fs/promises'

import probe from 'probe-image-size'

import galleryCategories, { getGalleryImageURL } from '../src/data/gallery'

const result: Record<string, { width: number; height: number }> = {}

for (const category of galleryCategories) {
  for (const image of category.images) {
    const url = getGalleryImageURL(category, image)

    if (result[url]) {
      continue
    }

    try {
      const size = await probe(url)

      result[url] = {
        width: size.width,
        height: size.height,
      }

      console.log(`✓ ${url} ${size.width}x${size.height}`)
    } catch (error) {
      console.warn(`✗ Failed: ${url}`)
      console.warn(error)
    }
  }
}

await mkdir('src/data', { recursive: true })

await writeFile(
  'src/data/gallery-sizes.generated.ts',
  `export const galleryImageSizes = ${JSON.stringify(result, null, 2)} as const\n`,
  'utf8',
)
