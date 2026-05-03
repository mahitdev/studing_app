import { render, screen, fireEvent } from '@testing-library/react'
import LandingWaitlistForm from '../components/LandingWaitlistForm'

describe('LandingWaitlistForm', () => {
  it('renders the email input and join button', () => {
    render(<LandingWaitlistForm />)
    expect(screen.getByPlaceholderText(/priority access email/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /join the elite/i })).toBeInTheDocument()
  })

  it('validates email correctly', () => {
    render(<LandingWaitlistForm />)
    const input = screen.getByPlaceholderText(/priority access email/i)
    const button = screen.getByRole('button', { name: /join the elite/i })

    fireEvent.change(input, { target: { value: 'invalid' } })
    expect(button).toBeDisabled()

    fireEvent.change(input, { target: { value: 'test@example.com' } })
    expect(button).not.toBeDisabled()
  })
})
