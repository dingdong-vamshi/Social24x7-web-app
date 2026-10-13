import { useCallback, useEffect, useState } from 'react'
import { CheckCircle2, FileSearch, RefreshCw } from 'lucide-react'
import { useSearchParams } from 'react-router-dom'
import { Brand } from '../components/Brand'
import { Button, ErrorState, LoadingState, StatusPill } from '../components/Ui'
import { useAuth } from '../auth/AuthContext'
import { requireSupabase } from '../lib/supabase'
import { dateTime } from '../repositories/commerce'
import { getMyCreatorApplication, getMySellerApplication, getMyProfessionalRequest, type CreatorApplication, type SellerApplication, type ProfessionalVerificationRequest } from '../auth/onboardingRepository'

export function ApplicationStatusPage() {
  const [params]=useSearchParams()
  const role=params.get('role')==='creator'?'creator':'seller'
  const {user,access,refreshProfile}=useAuth()
  const userId=user?.id
  const [application,setApplication]=useState<CreatorApplication|SellerApplication|null>(null)
  const [professional,setProfessional]=useState<ProfessionalVerificationRequest|null>(null)
  const [loading,setLoading]=useState(true)
  const [error,setError]=useState('')
  const load=useCallback(async()=>{if(!userId)return;setLoading(true);setError('');try{const client=requireSupabase();const result=role==='seller'?await getMySellerApplication(client,userId):await getMyCreatorApplication(client,userId);setApplication(result);setProfessional(role==='creator'?await getMyProfessionalRequest(client,userId):null)}catch(cause){setError(cause instanceof Error?cause.message:'Unable to load application status.')}finally{setLoading(false)}},[userId,role])
  useEffect(()=>{const timer=window.setTimeout(()=>void load(),0);return()=>window.clearTimeout(timer)},[load])
  const approved=access?.[`${role}_status`]==='approved'
  const editable=application&&['draft','more_information_required','rejected'].includes(application.status)
  const status=application?.status??access?.[`${role}_status`]??'not_applied'
  return <div className="status-page"><header><Brand/><Button to="/onboarding" variant="ghost">Your workspaces</Button></header><main><div className="status-title"><div className="status-icon">{approved?<CheckCircle2/>:<FileSearch/>}</div><div><div className="eyebrow">{role==='seller'?'Seller':'Creator'} application</div><h1>Application status</h1><p>Your current review status from your existing account.</p></div></div>{loading?<LoadingState/>:error?<ErrorState message={error}/>:<section className="application-card"><div className="application-head"><h2>{application?('storefrontName'in application?application.storefrontName:application.identityName):'Your application'}</h2><StatusPill>{status.replaceAll('_',' ')}</StatusPill></div><div className="review-callout"><FileSearch/><div><strong>{approved?'Your workspace is available':status==='draft'?'Your application is saved':status==='not_applied'?'Start your application':'Application review'}</strong><p>{approved?'Your account has approved access. Open the workspace below.':editable?'Continue your saved application or respond to the requested corrections.':application?'Your application is controlled by the review team. Refresh to check for changes.':'Choose your role and complete the application to request access.'}</p></div></div>{application&&<dl className="application-facts"><div><dt>Submitted</dt><dd>{application.submittedAt?dateTime(application.submittedAt):'Not submitted'}</dd></div><div><dt>Last updated</dt><dd>{dateTime(application.updatedAt)}</dd></div>{application.reviewNote&&<div><dt>Reviewer note</dt><dd>{application.reviewNote}</dd></div>}{application.requestedInformation&&<div><dt>Requested corrections</dt><dd>{application.requestedInformation}</dd></div>}{professional&&<div><dt>Professional credential review</dt><dd>{professional.status.replaceAll('_',' ')}{professional.requestedInformation?` — ${professional.requestedInformation}`:''}</dd></div>}</dl>}<div className="header-actions">{approved?<Button to={`/partner/${role}`}>Open {role==='seller'?'Seller Studio':'Creator Center'}</Button>:editable||!application?<Button to={`/partner/onboarding/${role}`}>{editable?'Continue application':'Start application'}</Button>:null}<Button variant="secondary" onClick={()=>void Promise.all([load(),refreshProfile()]).catch(cause=>setError(cause.message))}><RefreshCw size={16}/>Refresh status</Button></div></section>}</main></div>
}
