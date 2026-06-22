import PhotoSwipe from 'photoswipe'
import PhotoSwipeLightbox from 'photoswipe/lightbox'
import type { SlideData } from 'photoswipe'
import type { PhotoSwipeLightboxOptions } from 'photoswipe/lightbox'

type GalleryWindow = Window & {
  __heteroGalleryCleanup?: () => void
  __heteroGalleryListenerBound?: boolean
}

type GallerySlideData = SlideData & {
  title?: string
  description?: string
  origin?: string
}

const galleryWindow = window as GalleryWindow

const htmlEntities: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
}

const escapeHTML = (value: unknown) => String(value ?? '').replace(
  /[&<>"']/g,
  (char) => htmlEntities[char] ?? char,
)

const setupImageFallbacks = () => {
  document.querySelectorAll<HTMLImageElement>('img[data-fallback-src]').forEach((image) => {
    image.addEventListener('error', () => {
      const fallbackSrc = image.dataset.fallbackSrc

      if (!fallbackSrc || image.src === fallbackSrc) {
        return
      }

      image.src = fallbackSrc
      image.removeAttribute('data-fallback-src')
    }, { once: true })
  })
}

const setupGallery = () => {
  galleryWindow.__heteroGalleryCleanup?.()
  setupImageFallbacks()

  const lightboxes: PhotoSwipeLightbox[] = []

  document.querySelectorAll<HTMLElement>('[data-pswp-gallery]').forEach((gallery) => {
    const lightboxOptions: PhotoSwipeLightboxOptions = {
      gallery,
      children: '[data-gallery-link]',
      pswpModule: PhotoSwipe,
      bgOpacity: 0.92,
      wheelToZoom: true,
      closeTitle: '关闭',
      zoomTitle: '缩放',
      arrowPrevTitle: '上一张',
      arrowNextTitle: '下一张',
      errorMsg: '图片加载失败',
      paddingFn: (viewportSize) => {
        const side = viewportSize.x < 700 ? 16 : 64
        const vertical = viewportSize.y < 700 ? 24 : 56

        return {
          top: vertical,
          right: side,
          bottom: vertical + 40,
          left: side,
        }
      },
    }

    const lightbox = new PhotoSwipeLightbox(lightboxOptions)

    lightbox.addFilter('domItemData', (itemData, element, linkEl) => ({
      ...itemData,
      title: linkEl.dataset.galleryName,
      description: linkEl.dataset.galleryDescription,
      origin: linkEl.dataset.galleryOrigin,
    }))

    lightbox.on('uiRegister', () => {
      lightbox.pswp?.ui?.registerElement({
        name: 'caption',
        order: 9,
        isButton: false,
        appendTo: 'root',
        html: '',
        onInit: (element, pswp) => {
          const updateCaption = () => {
            const data = (pswp.currSlide?.data ?? {}) as GallerySlideData
            const title = data.title ?? data.alt ?? ''
            const description = data.description ?? ''
            const origin = data.origin ?? ''

            if (!title && !description && !origin) {
              element.hidden = true
              element.innerHTML = ''
              return
            }

            element.hidden = false
            element.innerHTML = `
              <div class="pswp-caption-title">${escapeHTML(title)}</div>
              ${description ? `<div class="pswp-caption-description">${escapeHTML(description)}</div>` : ''}
              ${origin ? `<a class="pswp-caption-origin" href="${escapeHTML(origin)}" target="_blank" rel="noreferrer">Origin</a>` : ''}
            `
          }

          pswp.on('change', updateCaption)
          pswp.on('afterInit', updateCaption)
        },
      })
    })

    lightbox.init()
    lightboxes.push(lightbox)
  })

  galleryWindow.__heteroGalleryCleanup = () => {
    lightboxes.forEach((lightbox) => lightbox.destroy())
    lightboxes.length = 0
  }
}

if (!galleryWindow.__heteroGalleryListenerBound) {
  document.addEventListener('astro:page-load', setupGallery)
  galleryWindow.__heteroGalleryListenerBound = true
}

setupGallery()
