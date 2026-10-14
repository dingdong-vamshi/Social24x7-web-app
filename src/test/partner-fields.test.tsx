import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { useState } from 'react'
import { PasswordInput } from '../components/PasswordInput'
import { validNewPassword } from '../auth/passwordPolicy'
import { applicationSocialLinks, formatBusinessText, normalizePan, socialUrl, validPan } from '../auth/applicationFields'
import { audienceTierLabels } from '../auth/onboardingRules'
import { safeApplicationLink } from '../repositories/admin'

describe('new password policy and visibility', () => {
  it.each(['short1A!', 'Valid pass1!', 'Longer123#'])('accepts compliant %s', value => expect(validNewPassword(value)).toBe(true))
  it.each(['', 'Aa1!', 'lowercase1!', 'UPPERCASE1!', 'NoNumber!', 'NoSymbol123', 'SpaceOnly1 ', 'EmojiOnly1😀', 'A1!'+ 'x'.repeat(126)])('rejects a missing requirement: %s', value => expect(validNewPassword(value)).toBe(false))
  it('starts hidden, toggles without submitting, and preserves its value', () => {
    const submit = vi.fn()
    function Form() { const [value,setValue]=useState('Synthetic1!'); return <form onSubmit={submit}><PasswordInput label="Password" value={value} onChange={e=>setValue(e.target.value)} showRequirements/></form> }
    render(<Form/>); const input = screen.getByLabelText('Password')
    expect(input).toHaveAttribute('type','password')
    fireEvent.click(screen.getByRole('button',{name:'Show password'}))
    expect(input).toHaveAttribute('type','text'); expect(input).toHaveValue('Synthetic1!')
    fireEvent.click(screen.getByRole('button',{name:'Hide password'}))
    expect(input).toHaveAttribute('type','password'); expect(submit).not.toHaveBeenCalled()
  })
})
describe('field-aware onboarding normalization', () => {
  it('normalizes ordinary trade names but preserves legal and intentional casing', () => {
    expect(formatBusinessText('rOHAN TEST BUSINESS','businessName')).toBe('Rohan Test Business')
    expect(formatBusinessText('iPhone McDonald GST LLP','storefrontName')).toBe('iPhone McDonald GST LLP')
    expect(formatBusinessText('REGISTERED Pvt. LTD','legalName')).toBe('REGISTERED Pvt. LTD')
    expect(formatBusinessText('hello WORLD','about')).toBe('Hello WORLD')
    expect(formatBusinessText('ABC@example.com','email')).toBe('ABC@example.com')
  })
  it('uppercases PAN format without asserting verification', () => { expect(normalizePan(' abcde1234f ')).toBe('ABCDE1234F'); expect(validPan('abcde1234f')).toBe(true); expect(validPan('ABCDE12345')).toBe(false) })
  it.each(['javascript:alert(1)','data:text/html,test','http://example.com','https://x:secret@example.com','https://example.com:8443','https://192.168.1.1','https://172.16.1.1','https://127.1','https://server.local','https://example.com\\evil'])('rejects unsafe URL %s', value => expect(()=>socialUrl(value,'website')).toThrow())
  it('accepts HTTPS profile URLs and rejects lookalike domains', () => {
    expect(socialUrl('www.instagram.com/test_account','instagram')).toBe('https://www.instagram.com/test_account')
    expect(()=>socialUrl('https://instagram.com.evil.test/test','instagram')).toThrow()
    expect(()=>socialUrl('https://instagram.com','instagram')).toThrow()
    expect(socialUrl('https://maps.app.goo.gl/synthetic','googleMaps')).toContain('maps.app.goo.gl')
    expect(()=>socialUrl('https://google.com/search?q=test','googleMaps')).toThrow()
  })
  it('keeps Seller links optional and drops unselected Creator links', () => {
    expect(Object.values(applicationSocialLinks({},'seller')).every(value=>value==='')).toBe(true)
    expect(applicationSocialLinks({selectedPlatforms:['youtube'],youtube:'youtube.com/@test',instagram:'javascript:bad'},'creator')).toMatchObject({youtube:'https://youtube.com/@test',instagram:''})
  })
  it('only turns valid submitted social URLs into external Admin links', () => {
    expect(safeApplicationLink('Social · Instagram','https://instagram.com/test')).toBe('https://instagram.com/test')
    expect(safeApplicationLink('Social · instagram','javascript:bad')).toBeNull()
    expect(safeApplicationLink('Legal identity','https://example.com')).toBeNull()
  })
  it('shows the five client-supplied ranges without deriving overlapping numeric tiers', () => {
    expect(Object.keys(audienceTierLabels)).toEqual(['Nano','Micro','Mid','Macro','Mega'])
    expect(Object.values(audienceTierLabels).join(' ')).toMatch(/1K–10K.*10K–50K.*50K–500K.*500K–1M.*1M\+/)
  })
})
