export interface GalleryImage {
  src: string
  width?: number
  height?: number
  origin?: string
  name?: string
  description?: string
}

export interface GalleryCategory {
  name: string
  description?: string
  baseURL?: string
  cover?: number | string
  images: GalleryImage[]
}

const absoluteURLPattern = /^(?:[a-z][a-z\d+\-.]*:)?\/\//i

export function resolveGalleryURL(baseURL: string | undefined, path: string) {
  if (absoluteURLPattern.test(path) || path.startsWith('/')) {
    return path
  }

  if (!baseURL) {
    return path
  }

  const normalizedBaseURL = baseURL.endsWith('/') ? baseURL : `${baseURL}/`
  return new URL(path, normalizedBaseURL).toString()
}

export function getGalleryImageURL(category: GalleryCategory, image: GalleryImage) {
  return resolveGalleryURL(category.baseURL, image.src)
}

export function getGalleryPreviewURL(category: GalleryCategory, image: GalleryImage) {
  return resolveGalleryURL(category.baseURL, toWebPPreviewPath(image.src))
}

export function getGalleryCoverURL(category: GalleryCategory) {
  if (typeof category.cover === 'string') {
    return resolveGalleryURL(category.baseURL, category.cover)
  }

  const coverIndex = typeof category.cover === 'number' ? category.cover : 0
  const coverImage = category.images[coverIndex] ?? category.images[0]
  return coverImage ? getGalleryImageURL(category, coverImage) : undefined
}

export function getGalleryCoverPreviewURL(category: GalleryCategory) {
  if (typeof category.cover === 'string') {
    return resolveGalleryURL(category.baseURL, toWebPPreviewPath(category.cover))
  }

  const coverIndex = typeof category.cover === 'number' ? category.cover : 0
  const coverImage = category.images[coverIndex] ?? category.images[0]
  return coverImage ? getGalleryPreviewURL(category, coverImage) : undefined
}

function toWebPPreviewPath(path: string) {
  const suffixMatch = path.match(/[?#].*$/)
  const suffix = suffixMatch?.[0] ?? ''
  const cleanPath = suffix ? path.slice(0, -suffix.length) : path
  const slashIndex = cleanPath.lastIndexOf('/')
  const directory = slashIndex >= 0 ? cleanPath.slice(0, slashIndex + 1) : ''
  const fileName = slashIndex >= 0 ? cleanPath.slice(slashIndex + 1) : cleanPath
  const stem = fileName.replace(/\.[^.]+$/, '')

  return `${directory}webp/${stem}.webp${suffix}`
}

const galleryCategories: GalleryCategory[] = [
  {
    name: '黍黍',
    baseURL: 'https://r2.oss.isyuah.top/Shu/',
    cover: 0,
    images: [
      { src: '115633819_p0.png' },
      { src: '115703922_p0.png' },
      { src: '115731105_p0.png' },
      { src: '116111881_p0.png' },
      { src: '116219337_p0.jpg' },
      { src: '117132001_p0.jpg' },
      { src: '119819606_p0.jpg' },
      { src: '120895691_p0.jpg' },
      { src: '120937386_p0.jpg' },
      { src: '124611962_p0.jpg' },
      { src: '126833742_p0.jpg' },
      { src: '127801686_p0.png' },
      { src: '129193039_p0.png' },
      { src: '129306073_p0.jpg' },
      { src: '129854743_p0.jpg' },
      { src: '131006348_p0.jpg' },
      { src: '132397490_p0.jpg' },
      { src: '132813018_p0.jpg' },
      { src: '135305363_p0.png' },
      { src: '135946930_p0.jpg' },
      { src: '141494112_p0.png' },
      { src: '142152942_p0.jpg' },
      { src: '142761500_p0.jpg' },
      { src: '144168190_p0.jpg' },
      { src: 'wallhaven-2ymez6.png' },
      { src: 'wallhaven-5yz9w5.jpg' },
      { src: 'wallhaven-jevojw.jpg' },
      { src: 'wallhaven-jx6v1p.jpg' },
    ],
  },
]

export default galleryCategories
