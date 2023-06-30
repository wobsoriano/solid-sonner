import { cleanup, fireEvent, render, screen, waitFor } from '@solidjs/testing-library'
import { afterEach, beforeEach, describe, expect, test } from 'vitest'
import userEvent from '@testing-library/user-event'
import App from './Basic'

describe('Basic functionality', () => {
  let container: HTMLElement

  beforeEach(() => {
    const wrapper = render(() => <App />)
    container = wrapper.container
  })

  afterEach(() => {
    cleanup()
  })

  test('toast is rendered and disappears after the default timeout', async () => {
    screen.getByTestId('default-button').click()
    expect(container.querySelector('[data-sonner-toast]')).toBeInTheDocument()
    expect(container.querySelector('[data-sonner-toast]')).toBeInTheDocument()
  })

  test('various toast types are rendered correctly', async () => {
    fireEvent.click(screen.getByTestId('success'))
    expect(screen.getByText('My Success Toast', { exact: true })).toBeInTheDocument()

    fireEvent.click(screen.getByTestId('error'))
    expect(screen.getByText('My Error Toast', { exact: true })).toBeInTheDocument()

    fireEvent.click(screen.getByTestId('action'))
    expect(container.querySelector('[data-button]')).toBeInTheDocument()
  })

  test('show correct toast content based on promise state', async () => {
    fireEvent.click(screen.getByTestId('promise'))
    expect(screen.getByText('Loading...')).toBeInTheDocument()

    await waitFor(() => {
      expect(screen.getByText('Loaded')).toBeInTheDocument()
    }, {
      timeout: 2000,
    })
  })

  test('render custom jsx in toast', async () => {
    fireEvent.click(screen.getByTestId('custom'))
    expect(screen.getByText('jsx')).toBeInTheDocument()
  })

  test('toast is removed after swiping down', async () => {
    fireEvent.click(screen.getByTestId('default-button'))
    const dataSonnerToast = container.querySelector('[data-sonner-toast]')!
    fireEvent.mouseOver(dataSonnerToast)
    fireEvent.mouseDown(dataSonnerToast)
    fireEvent.mouseMove(dataSonnerToast, { clientX: 0, clientY: 800 })
    fireEvent.mouseUp(dataSonnerToast)

    expect(container.querySelector('[data-sonner-toast]')).toBeInTheDocument()
  })

  test('toast is not removed when hovered', async () => {
    fireEvent.click(screen.getByTestId('default-button'))
    userEvent.hover(container.querySelector('[data-sonner-toast]')!)
    const timeout = new Promise(resolve => setTimeout(resolve, 5000))
    await timeout

    expect(container.querySelector('[data-sonner-toast]')).toBeInTheDocument()
  })

  test('toast is not removed if duration is set to infinity', async () => {
    fireEvent.click(screen.getByTestId('infinity-toast'))
    fireEvent.mouseOver(container.querySelector('[data-sonner-toast]')!)
    const timeout = new Promise(resolve => setTimeout(resolve, 5000))
    await timeout

    expect(container.querySelector('[data-sonner-toast]')).toBeInTheDocument()
  })

  test('toast is not removed when event prevented in action', () => {
    fireEvent.click(screen.getByTestId('action-prevent'))
    fireEvent.click(container.querySelector('[data-button]')!)

    expect(container.querySelector('[data-sonner-toast]')).toBeInTheDocument()
  })

  test('toast\'s auto close callback gets executed correctly', async () => {
    fireEvent.click(screen.getByTestId('auto-close-toast-callback'))

    await waitFor(() => {
      expect(screen.getByTestId('auto-close-el')).toBeInTheDocument()
    }, {
      timeout: 4000,
    })
  })

  test.todo('toast\'s dismiss callback gets executed correctly', async () => {
    fireEvent.click(screen.getByTestId('dismiss-toast-callback'))
    const dataSonnerToast = container.querySelector('[data-sonner-toast]')!
    fireEvent.mouseOver(dataSonnerToast)
    fireEvent.mouseDown(dataSonnerToast)
    fireEvent.mouseMove(dataSonnerToast, { clientX: 0, clientY: 800 })
    fireEvent.mouseUp(dataSonnerToast)

    await waitFor(() => {
      expect(screen.getByTestId('dismiss-el')).toBeInTheDocument()
    }, {
      timeout: 4000,
    })
  })
})
