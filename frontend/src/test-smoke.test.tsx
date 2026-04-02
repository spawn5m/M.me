import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'

function TestComponent() {
  return <div data-testid="smoke">Mirigliani</div>
}

describe('Test setup', () => {
  it('renders a React component', () => {
    render(<TestComponent />)
    expect(screen.getByTestId('smoke')).toHaveTextContent('Mirigliani')
  })
})
