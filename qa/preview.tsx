import { createRoot } from 'react-dom/client'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { OnboardingFlow } from '../src/pages/Onboarding'
import { AdminDashboard } from '../src/pages/Admin'
import { NewPersonalChat } from '../src/features/chat/NewPersonalChat'
import type { ChatRepository } from '../src/features/chat/repository'
import '../src/styles.css'
import '../src/features/chat/chat.css'
const params = new URLSearchParams(window.location.search)
const view = params.get('view') || 'seller'
const path = view === 'admin' ? '/partner/admin/application/'+(params.get('kind')==='creator'?'creator':'seller')+'/synthetic' : '/partner/onboarding/' + view
const repository = { incomingRequests: async () => [], searchUsernames: async () => [{id:'synthetic',username:'synthetic_demo',display_name:'Synthetic Demo',request_state:'none'}], requestPersonalChat: async () => ({state:'outgoing'}) } as unknown as ChatRepository
createRoot(document.getElementById('root')!).render(<><div style={{padding:12,background:'#fff1b8',color:'#332600',textAlign:'center'}}>ISOLATED QA • Synthetic data • Production access, submissions and uploads disabled</div><MemoryRouter initialEntries={[path]}>{view === 'chat' ? <NewPersonalChat repository={repository} opened={()=>{}} close={()=>{}} revision={0}/> : <Routes><Route path="/partner/onboarding/:role" element={<OnboardingFlow/>}/><Route path="/partner/admin/application/:kind/:id" element={<AdminDashboard/>}/></Routes>}</MemoryRouter></>)
