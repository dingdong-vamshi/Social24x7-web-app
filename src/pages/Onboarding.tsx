import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { ArrowLeft, ArrowRight, Check, Megaphone, ShieldCheck, Store } from 'lucide-react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { Brand } from '../components/Brand'
import { AccountMenu } from '../components/AccountMenu'
import { defaultDestination } from '../auth/routing'
import { Button, ErrorState, LoadingState } from '../components/Ui'
import { useAuth } from '../auth/AuthContext'
import { requireSupabase } from '../lib/supabase'
import { creatorCategories, creatorSpecializationsFor, creatorRequiresProfessionalVerification, credentialRuleFor, selectCreatorSpecialization, sellerOnboardingSteps } from '../auth/onboardingRules'
import { getMyCreatorApplication, getMySellerApplication, getMyProfessionalRequest, saveCommerceOnboardingDraft, submitSellerApplication, submitCreatorApplication, submitProfessionalVerification, uploadCommerceEvidence, type ApplicationKind } from '../auth/onboardingRepository'
import { selectedSpecializations, validateOnboardingStep, valueOf, type OnboardingData } from '../auth/onboardingValidation'
import { applicationSocialLinks, savedSocialFields, creatorPlatforms, sellerPlatforms, platformLabels, socialUrl, normalizePan, validPan, formatBusinessText, type SocialPlatform } from '../auth/applicationFields'
import { audienceTierLabels, type AudienceTier } from '../auth/onboardingRules'
import './auth.css'

export function RoleSelection() {
  const { user, access } = useAuth()
  return <Navigate to={defaultDestination(user!.id, access)} replace />
}

type Field = { key: string; label: string; type?: string; required?: boolean; options?: string[] }
const sellerFields: Record<number, Field[]> = {
  0: [{key:'sellerType',label:'Seller type',options:['gst','non_gst']}],
  1: [{key:'legalName',label:'Legal identity / business name',required:true},{key:'businessName',label:'Trade / business name',required:true},{key:'storefrontName',label:'Store name',required:true},{key:'registeredState',label:'Registered / home state code',required:true},{key:'city',label:'City',required:true},{key:'phone',label:'Phone number',type:'tel',required:true},{key:'email',label:'Business email',type:'email',required:true}],
  2: [{key:'addressLine',label:'Store address',required:true},{key:'pickupAddress',label:'Pickup address',required:true},{key:'returnAddress',label:'Return address',required:true},{key:'postalCode',label:'PIN / postal code',required:true}],
  3: [{key:'bankAccountHolder',label:'Bank account holder',required:true},{key:'bankAccountNumber',label:'Bank account number',type:'password',required:true},{key:'bankIfsc',label:'IFSC',required:true}],
  4: sellerPlatforms.map(key=>({key,label:platformLabels[key],type:'text'})),
}
const creatorFields: Record<number, Field[]> = {
  0:[{key:'macroCategory',label:'Main category',options:creatorCategories.map(item=>item.name)},{key:'about',label:'About your work'}],
  1:[{key:'audienceTier',label:'Audience tier (self-declared)',options:Object.keys(audienceTierLabels)}],
  2:[{key:'identityName',label:'Legal identity name',required:true},{key:'panNumber',label:'PAN',required:true},{key:'payoutUpi',label:'Payout UPI (or provide bank details below)'},{key:'bankAccountHolder',label:'Bank account holder'},{key:'bankAccountNumber',label:'Bank account number',type:'password'},{key:'bankIfsc',label:'IFSC'}],
  3:[{key:'professionalTitle',label:'Professional title',required:true},{key:'degree',label:'Degree / qualification',required:true},{key:'institution',label:'Qualification institution',required:true},{key:'registrationNumber',label:'Registration / licence number',required:true}],
}
const sellerEvidence: Record<number, Array<[string,string,string]>> = {2:[['documentPath','Business / identity document','business-document'],['exteriorEvidencePath','Business exterior photo','exterior-evidence'],['interiorEvidencePath','Business interior photo','interior-evidence']],4:[['businessVerificationVideoPath','Business Verification video','verification-video']]}
const creatorEvidence: Record<number, Array<[string,string,string]>> = {2:[['identityDocumentPath','Government identity evidence','identity-document']],3:[['credentialDocumentPath','Professional credential document','credential-document'],['verificationVideoPath','Professional Verification video','verification-video']]}
const lockedStatuses = ['submitted','under_review','approved','suspended']

export function OnboardingFlow() {
  const { role: param } = useParams()
  if (param !== 'seller' && param !== 'creator') return <Navigate to="/onboarding" replace />
  return <ConnectedOnboarding key={param} role={param} />
}
function ConnectedOnboarding({role}:{role:'seller'|'creator'}) {
  const auth = useAuth()
  const userId = auth.user?.id
  const navigate = useNavigate()
  const [form,setForm] = useState<OnboardingData>({sellerType:'gst',macroCategory:'Content & Digital Media',specializations:[],audienceTier:'Nano'})
  const [step,setStep] = useState(0)
  const [loading,setLoading] = useState(true)
  const [loadFailed,setLoadFailed] = useState(false)
  const [busy,setBusy] = useState(false)
  const [error,setError] = useState('')
  const [notice,setNotice] = useState('')
  const [fieldErrors,setFieldErrors] = useState<Record<string,string>>({})
  const selectedPlatforms = Array.isArray(form.selectedPlatforms) ? form.selectedPlatforms as string[] : creatorPlatforms.filter(key=>valueOf(form,key))
  const specializations = selectedSpecializations(form)
  const professional = role === 'creator' && creatorRequiresProfessionalVerification(specializations)
  const professionalRule = credentialRuleFor(specializations)
  const steps = role === 'seller' ? [...sellerOnboardingSteps] : ['Category','Social presence','Identity & payout',...(professional ? ['Professional verification'] : []),'Review']
  const review = step === steps.length-1
  const load = useCallback(async () => {
    if (!userId) return
    setLoading(true);setError('');setLoadFailed(false)
    try {
      const client=requireSupabase()
      const application=role==='seller' ? await getMySellerApplication(client,userId) : await getMyCreatorApplication(client,userId)
      if(application && lockedStatuses.includes(application.status)){navigate(`/application?role=${role}`,{replace:true});return}
      let data:OnboardingData={sellerType:'gst',macroCategory:'Content & Digital Media',specializations:[],audienceTier:'Nano'}
      if(application){
        data={...data,...application,...application.applicationPayload,...savedSocialFields(application.applicationPayload)}
        if('legalName' in application && application.legalName==='Seller applicant') data.legalName=''
        if('storefrontName' in application && application.storefrontName==='Draft store') data.storefrontName=''
        if('socialHandles' in application) data={...data,...application.socialHandles}
      }
      if(role==='creator'){
        const request=await getMyProfessionalRequest(client,userId)
        if(request) data={...data,professionalTitle:request.professionalTitle,degree:request.degree,institution:request.institution,registrationNumber:request.registrationNumber,credentialDocumentPath:request.credentialDocumentPath,verificationVideoPath:request.verificationVideoPath}
      }
      setForm(data)
      const count=role==='seller'?6:creatorRequiresProfessionalVerification(selectedSpecializations(data))?5:4
      setStep(Math.max(0,Math.min(count-1,typeof data.currentStep==='number'?data.currentStep:0)))
      if(application?.requestedInformation)setNotice(application.requestedInformation)
    }catch(cause){setLoadFailed(true);setError(cause instanceof Error?cause.message:'Unable to load your saved application.')}
    finally{setLoading(false)}
  },[userId,role,navigate])
  useEffect(()=>{const timer=window.setTimeout(()=>void load(),0);return()=>window.clearTimeout(timer)},[load])
  function update(key:string,value:unknown){setNotice('');setFieldErrors(previous=>({...previous,[key]:''}));setForm(previous=>({...previous,[key]:key==='panNumber'&&typeof value==='string'?normalizePan(value):value,...(key==='macroCategory'?{specializations:[]}: {})}))}
  function blur(key:string){const value=valueOf(form,key);try{if(key==='panNumber'){update(key,normalizePan(value));if(value&&!validPan(value))throw new Error('Use five letters, four digits and a final letter.')}else if([...sellerPlatforms,...creatorPlatforms].includes(key as SocialPlatform)){update(key,socialUrl(value,key as SocialPlatform))}else update(key,formatBusinessText(value,key))}catch(cause){setFieldErrors(previous=>({...previous,[key]:(cause as Error).message}))}}
  function payload(targetStep=step){const links=applicationSocialLinks(form,role);return {...form,panNumber:normalizePan(valueOf(form,'panNumber')),onboardingVersion:2,currentStep:targetStep,completedStep:Math.max(step,targetStep),professionalRequired:professional,taxVerificationStatus:'manual_review',identityVerificationStatus:'manual_review',bankVerificationStatus:'manual_review',audienceMetricsStatus:'self_declared',socialHandles:links,...links}}
  async function save(targetStep:number){setBusy(true);setError('');try{await saveCommerceOnboardingDraft(requireSupabase(),role,payload(targetStep));setStep(targetStep);setNotice('Progress saved to your account.')}catch(cause){setError(cause instanceof Error?cause.message:'Unable to save. Your entries are still on this page.')}finally{setBusy(false)}}
  async function next(event:FormEvent){event.preventDefault();const validation=validateOnboardingStep(role,step,form,professional);if(validation){setError(validation);return}if(!review){await save(step+1);return}for(let index=0;index<steps.length-1;index++){const issue=validateOnboardingStep(role,index,form,professional);if(issue){setStep(index);setError(issue);return}}
    if(!auth.user)return
    setBusy(true);setError('')
    try{
      const client=requireSupabase();const data=payload();const v=(key:string)=>valueOf(form,key)
      await saveCommerceOnboardingDraft(client,role,data)
      if(role==='seller')await submitSellerApplication(client,auth.user.id,{sellerType:form.sellerType==='non_gst'?'non_gst':'gst',legalName:v('legalName'),businessName:v('businessName'),storefrontName:v('storefrontName'),registeredState:v('registeredState'),city:v('city'),phone:v('phone'),email:v('email'),addressLine:v('addressLine'),pickupAddress:v('pickupAddress'),returnAddress:v('returnAddress'),gstin:v('gstin'),panNumber:v('panNumber'),documentPath:v('documentPath'),exteriorEvidencePath:v('exteriorEvidencePath'),interiorEvidencePath:v('interiorEvidencePath'),businessVerificationVideoPath:v('businessVerificationVideoPath'),locationLatitude:form.locationLatitude as number,locationLongitude:form.locationLongitude as number,applicationPayload:data})
      else{
        const draft=await getMyCreatorApplication(client,auth.user.id)
        if(!draft)throw new Error('Your Creator draft could not be prepared. Please retry.')
        if(professional && professionalRule){const existing=await getMyProfessionalRequest(client,auth.user.id);if(!existing||['draft','more_information_required','rejected'].includes(existing.status))await submitProfessionalVerification(client,auth.user.id,{creatorApplicationId:draft.id,professionalCategory:professionalRule.specialization,professionalTitle:v('professionalTitle'),degree:v('degree'),institution:v('institution'),registrationNumber:v('registrationNumber'),credentialDocumentPath:v('credentialDocumentPath'),verificationVideoPath:v('verificationVideoPath'),socialHandles:data.socialHandles,applicationPayload:{onboardingVersion:2,macroCategory:v('macroCategory'),specializations}});else if(existing.professionalCategory!==professionalRule.specialization)throw new Error('Your selected specialization differs from the current professional review. Ask Admin to request corrections before changing it.')}
        await submitCreatorApplication(client,auth.user.id,{creatorType:professional?'professional':'general',category:v('macroCategory'),macroCategory:v('macroCategory'),specializations,about:v('about'),socialHandles:data.socialHandles,identityName:v('identityName'),identityDocumentPath:v('identityDocumentPath'),applicationPayload:data})
      }
      await auth.refreshProfile();navigate(`/application?role=${role}`)
    }catch(cause){setError(cause instanceof Error?cause.message:'Submission failed. Your saved draft is available to retry.')}finally{setBusy(false)}
  }
  async function upload(key:string,documentKind:string,file:File|undefined){if(!file||!auth.user)return;setBusy(true);setError('');const uri=URL.createObjectURL(file);try{const kind:ApplicationKind=role==='creator'&&step===3?'professional':role;const path=await uploadCommerceEvidence(requireSupabase(),auth.user.id,kind,documentKind,{uri,fileName:file.name,mimeType:file.type,fileSize:file.size});setForm(previous=>({...previous,[key]:path}));setNotice(`${file.name} uploaded. Save this step to attach it to your draft.`)}catch(cause){setError(cause instanceof Error?cause.message:'Upload failed. Please retry.')}finally{URL.revokeObjectURL(uri);setBusy(false)}}
  function locate(){if(!navigator.geolocation){setError('Location is not available in this browser.');return}setBusy(true);setError('');navigator.geolocation.getCurrentPosition(position=>{setForm(previous=>({...previous,locationLatitude:position.coords.latitude,locationLongitude:position.coords.longitude}));setBusy(false);setNotice('Business location captured.')},()=>{setError('Allow location access while at your business premises, then retry.');setBusy(false)},{enableHighAccuracy:true,timeout:15000})}
  if(loading)return <LoadingState />
  if(loadFailed)return <><ErrorState message={error}/><Button onClick={()=>void load()}>Retry loading application</Button></>
  const fields=review?[]:[...(role==='seller'?sellerFields[step]??[]:creatorFields[step]??[]),...(role==='seller'&&step===1?(form.sellerType==='gst'?[{key:'gstin',label:'GSTIN',required:true}]:[{key:'panNumber',label:'PAN',required:true},{key:'localSellerId',label:'Enrolment ID / UIN / local Seller ID',required:true}]):[])]
  const evidence=review?[]:role==='seller'?sellerEvidence[step]??[]:creatorEvidence[step]??[]
  return <div className="onboarding-page connected-onboarding"><header><Brand /><AccountMenu/></header><div className="onboarding-layout"><aside><Link to="/partner"><ArrowLeft size={16}/> Back to Partner</Link><div className="onboarding-role"><span>{role==='seller'?<Store/>:<Megaphone/>}</span><div><small>{role==='seller'?'Seller':'Creator'} onboarding</small><strong>Build your {role==='seller'?'business':'creator'} profile</strong></div></div><ol>{steps.map((item,index)=><li key={item} className={index===step?'active':index<step?'complete':''}><span>{index<step?<Check size={15}/>:index+1}</span><div><strong>{item}</strong><small>{index===step?'In progress':index<step?'Completed':'Next step'}</small></div></li>)}</ol></aside><main><div className="mobile-progress"><span>Step {step+1} of {steps.length}</span><b>{Math.round((step+1)/steps.length*100)}%</b></div><form className="form-card" onSubmit={next}><div className="form-heading"><div><div className="eyebrow">Step {step+1} of {steps.length}</div><h1>{steps[step]}</h1><p>{review?'Review your information before submitting it for Admin review.':role==='seller'&&step===4?'Appear and speak in a short walkthrough of your business premises.':'Your information is saved securely to your existing account when you continue.'}</p></div></div>
    {review?<div className="review-summary"><div className="review-banner"><ShieldCheck/><div><strong>Verification requires Admin review</strong><p>Submitting does not activate a store, verify payout details or grant professional status.</p></div></div><dl>{(role==='seller'?[['Store',valueOf(form,'storefrontName')],['Business',valueOf(form,'businessName')],['Seller type',form.sellerType==='gst'?'GST registered':'Non-GST'],['Registered state',valueOf(form,'registeredState')],['Verification video',valueOf(form,'businessVerificationVideoPath')?'Uploaded':'Missing']]:[['Identity',valueOf(form,'identityName')],['Category',valueOf(form,'macroCategory')],['Specializations',specializations.join(', ')],['Professional credentials',professional?'Required · uploaded':'Not required']]).map(([label,value])=><div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}{(role==='seller'?sellerPlatforms:creatorPlatforms).filter(key=>valueOf(form,key)&&(role==='seller'||selectedPlatforms.includes(key))).map(key=><div key={key}><dt>{platformLabels[key]}</dt><dd>{valueOf(form,key)}</dd></div>)}{role==='creator'&&<div><dt>Audience (self-declared)</dt><dd>{audienceTierLabels[valueOf(form,'audienceTier') as AudienceTier]||valueOf(form,'audienceTier')}</dd></div>}{valueOf(form,'panNumber')&&<div><dt>PAN</dt><dd>{'••••••'+normalizePan(valueOf(form,'panNumber')).slice(-4)} · format only, not verified</dd></div>}<div><dt>Payout details</dt><dd>Provided for manual review</dd></div></dl><p>Bank details and identity evidence are not stored in browser drafts.</p></div>:<div className="field-grid">{fields.map(field=><label key={field.key}>{field.label}{field.options?<select aria-label={field.label} value={valueOf(form,field.key)} onChange={event=>update(field.key,event.target.value)} disabled={busy}>{field.options.map(option=><option key={option} value={option}>{option==='gst'?'GST registered':option==='non_gst'?'Non-GST / local individual':field.key==='audienceTier'?audienceTierLabels[option as AudienceTier]:option}</option>)}</select>:<input type={field.type??'text'} value={valueOf(form,field.key)} onChange={event=>update(field.key,event.target.value)} onBlur={()=>blur(field.key)} aria-invalid={Boolean(fieldErrors[field.key])} aria-describedby={fieldErrors[field.key]?`${field.key}-error`:undefined} required={field.required} disabled={busy} autoComplete="off"/>}{field.required&&<small>Required</small>}{fieldErrors[field.key]&&<small id={`${field.key}-error`} role="alert">{fieldErrors[field.key]}</small>}</label>)}
    {role==='seller'&&step===4&&<p className="wide">Website and social profiles are optional. Add only profiles your business uses. Links are reviewed manually by Admin; supplying a URL does not verify ownership.</p>}
    {role==='creator'&&step===1&&<><fieldset className="wide"><legend>Where do you share your work?</legend><div className="specialization-options">{creatorPlatforms.map(key=><label className="check-label" key={key}><input type="checkbox" checked={selectedPlatforms.includes(key)} disabled={busy} onChange={event=>update('selectedPlatforms',event.target.checked?[...selectedPlatforms,key]:selectedPlatforms.filter(item=>item!==key))}/>{key==='website'?'Website / other channel':platformLabels[key]}</label>)}</div></fieldset>{creatorPlatforms.filter(key=>selectedPlatforms.includes(key)).map(key=><label key={key}>{key==='website'?'Website / other channel URL':platformLabels[key]+' profile URL'}<input value={valueOf(form,key)} onChange={event=>update(key,event.target.value)} onBlur={()=>blur(key)} placeholder="https://" required disabled={busy} aria-invalid={Boolean(fieldErrors[key])}/>{fieldErrors[key]&&<small role="alert">{fieldErrors[key]}</small>}</label>)}<p className="wide">Audience ranges and profiles are self-declared and reviewed manually. Select the tier that best describes your audience; no follower count is automatically assigned or independently verified.</p></>}
    {role==='seller'&&step===0&&<p className="wide">Choose your existing tax registration. Non-GST selling follows the configured home-state rules; tax verification is reviewed manually.</p>}
    {role==='seller'&&step===1&&form.sellerType==='non_gst'&&<label className="check-label wide"><input type="checkbox" checked={form.declarationAccepted===true} onChange={event=>update('declarationAccepted',event.target.checked)} required/>I understand that Non-GST selling is limited by the configured home-state rules.</label>}
    {role==='creator'&&step===0&&<fieldset className="wide"><legend>Choose one to three specializations ({specializations.length}/3)</legend><div className="specialization-options">{creatorSpecializationsFor(valueOf(form,'macroCategory')).map(item=><button key={item} type="button" aria-pressed={specializations.includes(item)} disabled={busy||specializations.length===3&&!specializations.includes(item)} onClick={()=>update('specializations',selectCreatorSpecialization(specializations,item))}>{item}</button>)}</div><p>{professional?'This specialization requires a professional credential and verification video.':'This category uses ordinary identity review. No professional degree is required.'}</p></fieldset>}
    {evidence.map(([key,label,documentKind])=><label className="evidence-field wide" key={key}>{label}<input type="file" accept={documentKind.includes('verification-video')?'video/mp4,video/webm,video/quicktime':documentKind.includes('exterior')||documentKind.includes('interior')?'image/jpeg,image/png,image/webp':'image/jpeg,image/png,image/webp,application/pdf'} disabled={busy} onChange={event=>void upload(key,documentKind,event.target.files?.[0])}/><small>{valueOf(form,key)?'Uploaded to private storage.':'Choose a file, up to 15 MB. Upload completion is required.'}</small></label>)}
    {role==='seller'&&step===2&&<div className="wide"><Button variant="secondary" onClick={locate} disabled={busy}>Use current business location</Button><p>{typeof form.locationLatitude==='number'?`Location captured: ${form.locationLatitude.toFixed(5)}, ${(form.locationLongitude as number).toFixed(5)}`:'Capture your location while at your business premises.'}</p></div>}
    {role==='creator'&&professional&&step===3&&<p className="wide">{professionalRule?.verificationInstructions} Professional approval is separate from Creator access and any paid verification badge.</p>}
    </div>}{error&&<div className="form-error" role="alert">{error}</div>}{notice&&<div className="auth-notice" role="status">{notice}</div>}<div className="form-actions"><Button variant="ghost" disabled={busy} onClick={()=>step===0?navigate('/partner'):void save(step-1)}><ArrowLeft size={16}/>Back</Button><Button variant="secondary" disabled={busy} onClick={()=>void save(step)}>Save draft</Button><Button type="submit" disabled={busy}>{busy?'Please wait…':review?'Submit for review':'Save & continue'}<ArrowRight size={16}/></Button></div></form><div className="integration-note"><ShieldCheck size={18}/><span>Saved drafts and uploaded evidence belong to your existing SOCIAL 24-7 account. Verification and approval remain subject to review.</span></div></main></div></div>
}
