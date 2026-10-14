import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import type { ReactNode } from 'react'
import { ProfessionalVerification } from '../../pages/ProfessionalVerification'
import { loadProfessional, submitProfessionalCorrection } from './professional'
vi.mock('../../auth/AuthContext', () => ({ useAuth: () => ({ user: { id: 'owner-1' }, access: { creator_status: 'approved' } }) }))
vi.mock('../../components/WorkspaceShell', () => ({ WorkspaceShell: ({ children }: { children: ReactNode }) => <main>{children}</main> }))
vi.mock('../../lib/supabase', () => ({ requireSupabase: () => ({}) }))
vi.mock('./professional', async (original) => ({ ...await original<typeof import('./professional')>(), loadProfessional: vi.fn(), submitProfessionalCorrection: vi.fn(), professionalEvidenceUrl: vi.fn(), uploadProfessionalEvidence: vi.fn() }))
const context = { creator: { id: 'creator-1', status: 'approved' }, request: { id: 'request-1', status: 'more_information_required', professionalCategory: 'Doctor', professionalTitle: 'Doctor', degree: 'MBBS', institution: 'QA institute', registrationNumber: 'QA-1234', credentialDocumentPath: 'private/doc', verificationVideoPath: 'private/video', updatedAt: '2026-10-14T00:00:00Z', requestedInformation: 'Please update your qualification evidence.' }, policy: { requires_professional_verification: true, requires_verification_video: true, verification_instructions: 'Show your professional workplace.' } } as Awaited<ReturnType<typeof loadProfessional>>
beforeEach(() => { vi.clearAllMocks(); vi.mocked(loadProfessional).mockResolvedValue(context) })
function mount() { render(<MemoryRouter><ProfessionalVerification /></MemoryRouter>) }
describe('professional status UI', () => {
  it.each(['approved', 'submitted', 'under_review', 'suspended'])('renders %s read-only without correction controls', async (status) => {
    vi.mocked(loadProfessional).mockResolvedValue({ ...context, request: { ...context.request!, status: status as NonNullable<typeof context.request>['status'] } })
    mount(); await screen.findByText('Submitted professional details')
    expect(screen.queryByRole('button', { name: 'Review correction' })).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Professional title')).not.toBeInTheDocument()
  })
  it.each(['rejected', 'more_information_required', 'draft'])('renders %s corrections and requires confirmation before any submit', async (status) => {
    vi.mocked(loadProfessional).mockResolvedValue({ ...context, request: { ...context.request!, status: status as NonNullable<typeof context.request>['status'] } })
    mount(); await screen.findByRole('button', { name: 'Review correction' })
    expect(screen.getByText('Please update your qualification evidence.')).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('Professional title'), { target: { value: 'Updated doctor' } })
    fireEvent.click(screen.getByRole('button', { name: 'Review correction' }))
    expect(await screen.findByRole('region', { name: 'Confirm professional correction' })).toBeInTheDocument()
    expect(submitProfessionalCorrection).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Back to edit' }))
    expect(screen.getByLabelText('Professional title')).toHaveValue('Updated doctor')
  })
  it('shows loading failure with retry, not a fabricated status', async () => {
    vi.mocked(loadProfessional).mockRejectedValue(new Error('Permission denied'))
    mount(); expect(await screen.findByText('Permission denied')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument()
  })
})
