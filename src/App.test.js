import { render, screen } from '@testing-library/react'
import App from './App'
beforeEach(() => {
  global.fetch = jest.fn().mockResolvedValue({
    ok: false,
    json: async () => ({})
  })
})

afterEach(() => {
  jest.restoreAllMocks()
})

test('renders dealer portal login screen', async () => {
  render(<App />)
  const portalTitle = await screen.findByText(/Bayi Portalı/i)
  expect(portalTitle).toBeInTheDocument()
})
