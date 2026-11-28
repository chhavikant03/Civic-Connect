// @vitest-environment jsdom

import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { BackToTop } from './BackToTop'

globalThis.IS_REACT_ACT_ENVIRONMENT = true

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key) => (key === 'backToTop' ? 'Back to top' : key),
  }),
}))

describe('BackToTop Component', () => {
  let container
  let root
  let originalScrollY
  let originalScrollTo
  let originalMatchMedia

  beforeEach(() => {
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)

    originalScrollY = window.scrollY
    originalScrollTo = window.scrollTo
    originalMatchMedia = window.matchMedia

    window.scrollTo = vi.fn()
    window.matchMedia = vi.fn().mockImplementation((query) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }))
  })

  afterEach(() => {
    act(() => {
      root.unmount()
    })
    container.remove()
    container = null
    root = null

    window.scrollY = originalScrollY
    window.scrollTo = originalScrollTo
    window.matchMedia = originalMatchMedia
    vi.restoreAllMocks()
  })

  it('renders with initial hidden state when scroll position is at or below the default threshold (300px)', () => {
    Object.defineProperty(window, 'scrollY', { value: 0, writable: true, configurable: true })

    act(() => {
      root.render(<BackToTop />)
    })

    const button = container.querySelector('button')
    expect(button).not.toBeNull()
    expect(button.getAttribute('data-visible')).toBe('false')
    expect(button.getAttribute('aria-hidden')).toBe('true')
    expect(button.getAttribute('tabindex')).toBe('-1')
    expect(button.getAttribute('aria-label')).toBe('Back to top')
    expect(button.getAttribute('type')).toBe('button')
  })

  it('updates visibility attributes when scrolling beyond default threshold (300px) and back', () => {
    Object.defineProperty(window, 'scrollY', { value: 0, writable: true, configurable: true })

    act(() => {
      root.render(<BackToTop />)
    })

    const button = container.querySelector('button')
    expect(button.getAttribute('data-visible')).toBe('false')

    // At exactly threshold (300px)
    act(() => {
      window.scrollY = 300
      window.dispatchEvent(new Event('scroll'))
    })
    expect(button.getAttribute('data-visible')).toBe('false')
    expect(button.getAttribute('aria-hidden')).toBe('true')
    expect(button.getAttribute('tabindex')).toBe('-1')

    // Above threshold (301px)
    act(() => {
      window.scrollY = 301
      window.dispatchEvent(new Event('scroll'))
    })
    expect(button.getAttribute('data-visible')).toBe('true')
    expect(button.getAttribute('aria-hidden')).toBe('false')
    expect(button.getAttribute('tabindex')).toBe('0')

    // Scroll back below threshold (150px)
    act(() => {
      window.scrollY = 150
      window.dispatchEvent(new Event('scroll'))
    })
    expect(button.getAttribute('data-visible')).toBe('false')
    expect(button.getAttribute('aria-hidden')).toBe('true')
    expect(button.getAttribute('tabindex')).toBe('-1')
  })

  it('respects a custom threshold prop', () => {
    Object.defineProperty(window, 'scrollY', { value: 0, writable: true, configurable: true })

    act(() => {
      root.render(<BackToTop threshold={100} />)
    })

    const button = container.querySelector('button')
    expect(button.getAttribute('data-visible')).toBe('false')

    // 100px is not > threshold (100)
    act(() => {
      window.scrollY = 100
      window.dispatchEvent(new Event('scroll'))
    })
    expect(button.getAttribute('data-visible')).toBe('false')

    // 101px is > threshold (100)
    act(() => {
      window.scrollY = 101
      window.dispatchEvent(new Event('scroll'))
    })
    expect(button.getAttribute('data-visible')).toBe('true')
    expect(button.getAttribute('tabindex')).toBe('0')
  })

  it('tracks scrolling on a custom targetContainer element', () => {
    const scrollContainer = document.createElement('div')
    scrollContainer.scrollTop = 0
    document.body.appendChild(scrollContainer)

    act(() => {
      root.render(<BackToTop targetContainer={scrollContainer} threshold={200} />)
    })

    const button = container.querySelector('button')
    expect(button.getAttribute('data-visible')).toBe('false')

    // Container scrolls above threshold
    act(() => {
      scrollContainer.scrollTop = 250
      scrollContainer.dispatchEvent(new Event('scroll'))
    })
    expect(button.getAttribute('data-visible')).toBe('true')

    // Container scrolls back below threshold
    act(() => {
      scrollContainer.scrollTop = 50
      scrollContainer.dispatchEvent(new Event('scroll'))
    })
    expect(button.getAttribute('data-visible')).toBe('false')

    scrollContainer.remove()
  })

  it('invokes window.scrollTo with smooth behavior when clicked under normal motion preferences', () => {
    Object.defineProperty(window, 'scrollY', { value: 400, writable: true, configurable: true })

    act(() => {
      root.render(<BackToTop />)
    })

    const button = container.querySelector('button')
    expect(button.getAttribute('data-visible')).toBe('true')

    act(() => {
      button.click()
    })

    expect(window.scrollTo).toHaveBeenCalledWith({ top: 0, behavior: 'smooth' })
  })

  it('invokes window.scrollTo with auto behavior when prefers-reduced-motion matches', () => {
    window.matchMedia = vi.fn().mockImplementation((query) => ({
      matches: query === '(prefers-reduced-motion: reduce)',
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }))

    Object.defineProperty(window, 'scrollY', { value: 500, writable: true, configurable: true })

    act(() => {
      root.render(<BackToTop />)
    })

    const button = container.querySelector('button')
    act(() => {
      button.click()
    })

    expect(window.scrollTo).toHaveBeenCalledWith({ top: 0, behavior: 'auto' })
  })

  it('invokes targetContainer.scrollTo and fallback scrollableMain when scrolling to top', () => {
    const targetDiv = document.createElement('div')
    targetDiv.scrollTo = vi.fn()
    document.body.appendChild(targetDiv)

    const mainElement = document.createElement('main')
    mainElement.className = 'overflow-y-auto'
    mainElement.scrollTo = vi.fn()
    document.body.appendChild(mainElement)

    Object.defineProperty(window, 'scrollY', { value: 400, writable: true, configurable: true })

    act(() => {
      root.render(<BackToTop targetContainer={targetDiv} />)
    })

    const button = container.querySelector('button')
    act(() => {
      button.click()
    })

    expect(window.scrollTo).toHaveBeenCalledWith({ top: 0, behavior: 'smooth' })
    expect(targetDiv.scrollTo).toHaveBeenCalledWith({ top: 0, behavior: 'smooth' })
    expect(mainElement.scrollTo).toHaveBeenCalledWith({ top: 0, behavior: 'smooth' })

    targetDiv.remove()
    mainElement.remove()
  })

  it('supports keyboard activation via Enter key when focused', () => {
    Object.defineProperty(window, 'scrollY', { value: 400, writable: true, configurable: true })

    act(() => {
      root.render(<BackToTop />)
    })

    const button = container.querySelector('button')
    button.focus()
    expect(document.activeElement).toBe(button)

    act(() => {
      button.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }))
      // In native browser environment, Enter on focused button fires click
      button.click()
    })

    expect(window.scrollTo).toHaveBeenCalledWith({ top: 0, behavior: 'smooth' })
  })

  it('supports keyboard activation via Space key when focused', () => {
    Object.defineProperty(window, 'scrollY', { value: 400, writable: true, configurable: true })

    act(() => {
      root.render(<BackToTop />)
    })

    const button = container.querySelector('button')
    button.focus()
    expect(document.activeElement).toBe(button)

    act(() => {
      button.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true, cancelable: true }))
      // In native browser environment, Space on focused button fires click
      button.click()
    })

    expect(window.scrollTo).toHaveBeenCalledWith({ top: 0, behavior: 'smooth' })
  })

  it('cleans up window and targetContainer scroll event listeners on unmount', () => {
    const windowRemoveListenerSpy = vi.spyOn(window, 'removeEventListener')
    const targetDiv = document.createElement('div')
    const containerRemoveListenerSpy = vi.spyOn(targetDiv, 'removeEventListener')
    document.body.appendChild(targetDiv)

    act(() => {
      root.render(<BackToTop targetContainer={targetDiv} />)
    })

    act(() => {
      root.unmount()
    })

    expect(windowRemoveListenerSpy).toHaveBeenCalledWith('scroll', expect.any(Function), { capture: true })
    expect(containerRemoveListenerSpy).toHaveBeenCalledWith('scroll', expect.any(Function))

    targetDiv.remove()
  })
})
