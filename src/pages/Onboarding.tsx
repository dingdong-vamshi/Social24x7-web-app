import { useMemo, useState } from 'react'
import { ArrowLeft, ArrowRight, Building2, Check, CheckCircle2, CircleUserRound, FileCheck2, Landmark, LoaderCircle, Megaphone, ShieldCheck, Sparkles, Store, UploadCloud } from 'lucide-react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Brand } from '../components/Brand'
import { Button } from '../components/Ui'
import { creatorCategories, requiresProfessionalVerification } from '../domain/creator-policy'
import type { PartnerRole } from '../domain/models'
import { repositories } from '../repositories/mock'
import { announcePreviewAction } from '../utils/preview'

export function RoleSelection() {
  return <div className="selection-page"><header><Brand /><Link to="/login">Sign in</Link></header><main><div className="selection-intro"><div className="eyebrow">Set up your workspace</div><h1>How will you use Social 24x7?</h1><p>Choose a path now. Both roles belong to the same Social 24x7 account architecture.</p></div><div className="role-options"><Link to="/onboarding/seller" className="role-option seller"><span className="role-number">01</span><div className="role-icon"><Store /></div><h2>Seller</h2><p>List and manage products, orders, fulfillment, finance, teams, and daily business operations.</p><span className="role-link">Start seller onboarding <ArrowRight /></span></Link><Link to="/onboarding/creator" className="role-option creator"><span className="role-number">02</span><div className="role-icon"><Megaphone /></div><h2>Creator</h2><p>Discover products, promote brands, create affiliate links, and track attributed earnings.</p><span className="role-link">Start creator onboarding <ArrowRight /></span></Link></div><div className="selection-foot"><ShieldCheck size={18} /><span>Your information is saved through a repository interface ready for future secure backend integration.</span></div></main></div>
}

type Field = { name: string; label: string; placeholder?: string; type?: string; options?: string[]; wide?: boolean; required?: boolean }
type Step = { title: string; description: string; icon: React.ReactNode; fields?: Field[]; upload?: string; review?: boolean }

const sellerSteps: Step[] = [
  { title: 'Representative', description: 'Tell us who is responsible for this application.', icon: <CircleUserRound />, fields: [
    { name: 'representativeName', label: 'Representative name', placeholder: 'Arjun Rao', required: true }, { name: 'businessEmail', label: 'Business email', placeholder: 'arjun@store.com', type: 'email', required: true }, { name: 'phone', label: 'Phone number', placeholder: '+91 98765 43210', required: true }, { name: 'designation', label: 'Designation', placeholder: 'Founder / Owner' },
  ] },
  { title: 'Business information', description: 'Legal and public details for your business.', icon: <Building2 />, fields: [
    { name: 'legalName', label: 'Legal business name', placeholder: 'Arjun Retail Private Limited', required: true }, { name: 'storeName', label: 'Store / brand name', placeholder: 'Arjun QA Store', required: true }, { name: 'businessType', label: 'Business type', options: ['Private limited company', 'Sole proprietorship', 'Partnership', 'LLP'] }, { name: 'category', label: 'Primary category', options: ['Fashion', 'Beauty', 'Home & living', 'Electronics', 'Food & beverage'] }, { name: 'address', label: 'Registered address', placeholder: 'Street, locality, city, state, PIN', wide: true, required: true },
  ] },
  { title: 'Tax & KYC', description: 'Provide the identifiers used for business verification.', icon: <FileCheck2 />, fields: [
    { name: 'gstin', label: 'GSTIN (where applicable)', placeholder: '29ABCDE1234F1Z5' }, { name: 'pan', label: 'Business PAN', placeholder: 'ABCDE1234F', required: true }, { name: 'registrationNumber', label: 'Registration number', placeholder: 'CIN / UDYAM / other' },
  ], upload: 'Business registration and identity documents' },
  { title: 'Bank & payout', description: 'Add the account that will receive settlements.', icon: <Landmark />, fields: [
    { name: 'accountHolder', label: 'Account holder', placeholder: 'Arjun Retail Pvt Ltd', required: true }, { name: 'accountNumber', label: 'Account number', placeholder: 'Enter account number', required: true }, { name: 'ifsc', label: 'IFSC', placeholder: 'HDFC0000123', required: true }, { name: 'accountType', label: 'Account type', options: ['Current', 'Savings'] },
  ], upload: 'Cancelled cheque or bank proof' },
  { title: 'Store setup', description: 'Shape how customers and creators see your store.', icon: <Store />, fields: [
    { name: 'displayName', label: 'Display name', placeholder: 'Arjun Everyday', required: true }, { name: 'supportEmail', label: 'Support email', placeholder: 'care@arjuneveryday.com', type: 'email' }, { name: 'storeCategory', label: 'Store category', options: ['Fashion', 'Beauty', 'Home & living', 'Fitness'] }, { name: 'supportPhone', label: 'Support phone', placeholder: '+91 98765 00000' }, { name: 'description', label: 'Store description', placeholder: 'Tell customers what makes your store different.', wide: true },
    { name: 'pickupAddress', label: 'Pickup address', placeholder: 'Warehouse, street, city, state, PIN', wide: true },
  ], upload: 'Store logo or brand mark' },
  { title: 'Verification', description: 'Confirm the evidence Social 24x7 will review.', icon: <ShieldCheck />, fields: [
    { name: 'verificationContact', label: 'Verification contact', placeholder: 'Representative name' }, { name: 'availability', label: 'Preferred verification window', options: ['10 AM–1 PM', '2 PM–5 PM', '5 PM–7 PM'] },
  ], upload: 'Business verification evidence (video placeholder)' },
  { title: 'Review', description: 'Check your information before submission.', icon: <CheckCircle2 />, review: true },
]

function creatorSteps(professional: boolean): Step[] {
  const steps: Step[] = [
    { title: 'Creator identity', description: 'Start with the person behind the creator profile.', icon: <CircleUserRound />, fields: [
      { name: 'creatorName', label: 'Legal name', placeholder: 'Maya Kapoor', required: true }, { name: 'displayName', label: 'Creator display name', placeholder: 'Maya Makes', required: true }, { name: 'email', label: 'Email', placeholder: 'maya@example.com', type: 'email', required: true }, { name: 'city', label: 'City', placeholder: 'Bengaluru' },
    ] },
    { title: 'Creator category', description: 'Choose the primary category and specialization.', icon: <Sparkles />, fields: [
      { name: 'category', label: 'Category', options: creatorCategories.map((item) => item.name), required: true }, { name: 'specialization', label: 'Specialization', options: creatorCategories.flatMap((item) => item.specializations.map((specialization) => specialization.name)), required: true }, { name: 'niche', label: 'Your niche', placeholder: 'Slow fashion, mindful lifestyle', wide: true },
    ] },
    { title: 'Social presence', description: 'Add the channels you use for brand partnerships.', icon: <Megaphone />, fields: [
      { name: 'primaryPlatform', label: 'Primary platform', options: ['Instagram', 'YouTube', 'Facebook', 'X', 'LinkedIn'] }, { name: 'handle', label: 'Primary handle', placeholder: '@mayamakes', required: true }, { name: 'followers', label: 'Audience size', placeholder: '48,200', required: true }, { name: 'secondaryPlatform', label: 'Secondary platform', options: ['None', 'Instagram', 'YouTube', 'Facebook'] },
    ] },
    { title: 'KYC', description: 'Identity details used for partner verification.', icon: <FileCheck2 />, fields: [
      { name: 'pan', label: 'PAN', placeholder: 'ABCDE1234F', required: true }, { name: 'idType', label: 'Identity document', options: ['Aadhaar', 'Passport', 'Driving licence'] }, { name: 'idNumber', label: 'Document number', placeholder: 'Masked ID number', required: true },
    ], upload: 'Identity document' },
    { title: 'Payment & tax', description: 'Details for future creator commission payouts.', icon: <Landmark />, fields: [
      { name: 'payoutUpi', label: 'Payout UPI (optional)', placeholder: 'creator@upi' }, { name: 'accountHolder', label: 'Account holder', placeholder: 'Maya Kapoor', required: true }, { name: 'accountNumber', label: 'Account number', placeholder: 'Enter account number', required: true }, { name: 'ifsc', label: 'IFSC', placeholder: 'ICIC0000123', required: true }, { name: 'gstRegistered', label: 'GST registered?', options: ['No', 'Yes'] },
    ] },
  ]
  if (professional) steps.push({ title: 'Professional verification', description: 'This specialization requires evidence of professional credentials.', icon: <ShieldCheck />, fields: [
    { name: 'professionalTitle', label: 'Professional title', placeholder: 'Doctor, dentist, advocate…', required: true }, { name: 'degree', label: 'Degree / qualification', placeholder: 'Professional qualification', required: true }, { name: 'licence', label: 'Registration / licence number', placeholder: 'Professional registration number', required: true }, { name: 'institution', label: 'Issuing institution', placeholder: 'Council or institution', required: true },
  ], upload: 'Professional credential and workplace verification video' })
  steps.push({ title: 'Review', description: 'Check your information before submission.', icon: <CheckCircle2 />, review: true })
  return steps
}

export function OnboardingWizard() {
  const { role: roleParam } = useParams()
  const role: PartnerRole = roleParam === 'creator' ? 'creator' : 'seller'
  const [step, setStep] = useState(0)
  const [form, setForm] = useState<Record<string, string>>({ category: 'Content & Digital Media', specialization: 'Content Creator' })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()
  const professional = role === 'creator' && requiresProfessionalVerification(form.specialization || '')
  const steps = useMemo(() => role === 'seller' ? sellerSteps : creatorSteps(professional), [role, professional])
  const current = steps[step]
  const progress = Math.round(((step + 1) / steps.length) * 100)
  function update(name: string, value: string) {
    setForm((previous) => {
      if (role === 'creator' && name === 'category') {
        const firstSpecialization = creatorCategories.find((category) => category.name === value)?.specializations[0]?.name ?? ''
        return { ...previous, category: value, specialization: firstSpecialization }
      }
      return { ...previous, [name]: value }
    })
  }
  function optionsFor(field: Field) {
    if (role === 'creator' && field.name === 'specialization') {
      return creatorCategories.find((category) => category.name === form.category)?.specializations.map((item) => item.name) ?? []
    }
    return field.options ?? []
  }
  async function next() {
    const completedForm = { ...form }
    current.fields?.forEach((field) => {
      if (!completedForm[field.name] && field.options) completedForm[field.name] = optionsFor(field)[0] ?? ''
    })
    const missing = current.fields?.filter((field) => field.required && !(completedForm[field.name] ?? '').trim()).map((field) => field.label) ?? []
    if (missing.length) { setError(`Complete: ${missing.join(', ')}`); return }
    setForm(completedForm); setError(''); setBusy(true)
    try {
      const repository = role === 'seller' ? repositories.sellerOnboarding : repositories.creatorOnboarding
      await repository.save(step, completedForm)
      if (step === steps.length - 1) { await repository.submit(); navigate(`/application?role=${role}`) }
      else setStep((value) => value + 1)
    } finally { setBusy(false) }
  }
  return <div className="onboarding-page">
    <header><Brand /><div><span>Need help?</span><button onClick={() => announcePreviewAction('Partner support is not connected in this Phase 1 preview.')}>Partner support</button></div></header>
    <div className="onboarding-layout">
      <aside><Link to="/onboarding"><ArrowLeft size={16} /> Change role</Link><div className="onboarding-role"><span>{role === 'seller' ? <Store /> : <Megaphone />}</span><div><small>{role === 'seller' ? 'Seller onboarding' : 'Creator onboarding'}</small><strong>{role === 'seller' ? 'Build your business profile' : 'Build your creator profile'}</strong></div></div><ol>{steps.map((item, index) => <li key={item.title} className={index === step ? 'active' : index < step ? 'complete' : ''}><span>{index < step ? <Check size={15} /> : index + 1}</span><div><strong>{item.title}</strong><small>{index < step ? 'Completed' : index === step ? 'In progress' : 'Not started'}</small></div></li>)}</ol></aside>
      <main>
        <div className="mobile-progress"><span>Step {step + 1} of {steps.length}</span><b>{progress}%</b><div><i style={{ width: `${progress}%` }} /></div></div>
        <div className="form-card"><div className="form-heading"><span className="form-icon">{current.icon}</span><div><div className="eyebrow">Step {step + 1} of {steps.length}</div><h1>{current.title}</h1><p>{current.description}</p></div></div>
          {current.review ? <ReviewSummary role={role} form={form} professional={professional} /> : <div className="field-grid">{current.fields?.map((field) => <label key={field.name} className={field.wide ? 'wide' : ''}>{field.label}{field.options ? <select value={form[field.name] ?? optionsFor(field)[0]} onChange={(event) => update(field.name, event.target.value)}>{optionsFor(field).map((option) => <option key={option}>{option}</option>)}</select> : <input type={field.type ?? 'text'} value={form[field.name] ?? ''} onChange={(event) => update(field.name, event.target.value)} placeholder={field.placeholder} />}{field.required && <small>Required</small>}</label>)}{current.upload && <button className="upload-zone wide" type="button" onClick={() => announcePreviewAction('File upload is represented visually in Phase 1; no document was transmitted.')}><UploadCloud /><strong>{current.upload}</strong><span>Choose files or drag them here · PDF, JPG, PNG</span></button>}</div>}
          {error && <div className="form-error" role="alert">{error}</div>}
          <div className="form-actions"><Button variant="ghost" onClick={() => step === 0 ? navigate('/onboarding') : setStep((value) => value - 1)}><ArrowLeft size={17} /> Back</Button><Button onClick={next} disabled={busy}>{busy ? <><LoaderCircle className="spin" size={17} /> Saving…</> : step === steps.length - 1 ? <>Submit application <Check size={17} /></> : <>Save & continue <ArrowRight size={17} /></>}</Button></div>
        </div>
        <div className="integration-note"><ShieldCheck size={18} /><span><strong>Local mock application</strong> Your progress is stored in this browser. Production identity, document storage, and verification connect through repository interfaces in Phase 2.</span></div>
      </main>
    </div>
  </div>
}

function ReviewSummary({ role, form, professional }: { role: PartnerRole; form: Record<string, string>; professional: boolean }) {
  const entries = Object.entries(form).filter(([, value]) => value)
  return <div className="review-summary"><div className="review-banner"><CheckCircle2 /><div><strong>Ready for your review</strong><p>Submitting places this mock {role} application into Under Review. No real payment or verification action occurs.</p></div></div><dl>{entries.map(([key, value]) => <div key={key}><dt>{key.replace(/([A-Z])/g, ' $1').replace(/^./, (letter) => letter.toUpperCase())}</dt><dd>{value}</dd></div>)}</dl>{role === 'creator' && <div className="conditional-note"><ShieldCheck /><span><strong>Professional verification</strong><small>{professional ? 'Required for the selected specialization and included in this application.' : 'Not required for the selected creator specialization.'}</small></span></div>}<div className="subscription-placeholder"><Landmark /><span><strong>Subscription activation</strong><small>Future web-gateway integration boundary only. No payment is collected in Phase 1.</small></span></div></div>
}
