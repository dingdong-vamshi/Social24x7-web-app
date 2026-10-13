import { ArrowRight, Boxes, CircleDollarSign, Handshake, Layers3, PackageCheck, ShieldCheck, Sparkles, Truck, Users } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Brand } from '../components/Brand'
import { Button } from '../components/Ui'

export function Landing() {
  return <div className="landing">
    <nav className="landing-nav"><Brand /><div className="landing-links"><a href="#capabilities">Capabilities</a><a href="#how">How it works</a><Link to="/login">Sign in</Link><Button to="/onboarding" variant="primary">Get started <ArrowRight size={17} /></Button></div></nav>
    <main>
      <section className="hero">
        <div className="hero-copy"><div className="eyebrow"><Sparkles size={15} /> Social commerce, built for business</div><h1>Grow your business with <em>Social 24x7.</em></h1><p>One focused partner workspace to launch your store, work with creators, fulfill orders, and understand every rupee you earn.</p><div className="hero-actions"><Button to="/onboarding/seller">Start selling <ArrowRight size={18} /></Button><Button to="/onboarding/creator" variant="secondary">Become a creator</Button></div><div className="trust-row"><span><ShieldCheck size={17} /> Guided verification</span><span><Layers3 size={17} /> One unified account</span><span><Handshake size={17} /> Creator commerce</span></div></div>
        <div className="hero-visual" aria-label="Illustration of the Social 24x7 business workspace">
          <div className="visual-orbit orbit-one" /><div className="visual-orbit orbit-two" />
          <div className="hero-dashboard"><div className="mini-window-head"><span /><span /><span /><b>Seller overview</b></div><div className="mini-stats"><article><small>Revenue</small><strong>₹18.6k</strong><i>+12.4%</i></article><article><small>Orders</small><strong>142</strong><i>18 to action</i></article></div><div className="mini-chart"><div className="chart-copy"><small>Net sales</small><strong>Last 7 days</strong></div><svg viewBox="0 0 420 120" role="img" aria-label="Upward sales chart"><path d="M8 105 C 54 92, 70 96, 105 72 S 165 78, 202 54 S 265 64, 301 36 S 370 48, 412 10" fill="none" stroke="currentColor" strokeWidth="5" strokeLinecap="round" /><path d="M8 105 C 54 92, 70 96, 105 72 S 165 78, 202 54 S 265 64, 301 36 S 370 48, 412 10 L412 120 L8 120Z" fill="url(#gradient)" opacity=".28" /><defs><linearGradient id="gradient" x1="0" y1="0" x2="0" y2="1"><stop stopColor="#2dbb72"/><stop offset="1" stopColor="#2dbb72" stopOpacity="0"/></linearGradient></defs></svg></div><div className="mini-order"><span className="product-thumb">LN</span><div><strong>Everyday Linen Shirt</strong><small>Order S24-845291</small></div><b>₹1,599</b></div></div>
          <div className="floating-card creator-float"><span>Creator network</span><strong>27 active</strong><div className="avatars"><i>MK</i><i>RV</i><i>AS</i><i>+24</i></div></div>
          <div className="floating-card shipment-float"><Truck size={20} /><div><strong>Ready to ship</strong><span>8 orders today</span></div></div>
        </div>
      </section>
      <section className="proof-strip"><span>SELL</span><strong>List and manage your complete catalog</strong><span>COLLABORATE</span><strong>Grow with trusted creator partners</strong><span>OPERATE</span><strong>Run orders, finance and teams</strong></section>
      <section id="capabilities" className="landing-section capability-section"><div className="section-intro"><div className="eyebrow">A complete operating system</div><h2>Built for the work behind every sale.</h2><p>Purpose-made desktop tools give sellers and creators space to manage complex workflows without bringing consumer distractions into the room.</p></div><div className="capability-grid">
        <article className="feature-large"><div className="feature-icon"><Boxes /></div><h3>Catalogs that scale with you</h3><p>Manage product status, pricing, inventory, variants, media, and creator commission eligibility from one dense, searchable view.</p><div className="catalog-preview"><div><span>Everyday Linen Shirt</span><small>LN-SH-042</small></div><b>₹1,599</b><i>84 in stock</i></div><div className="catalog-preview"><div><span>Botanical Face Serum</span><small>BT-SR-018</small></div><b>₹1,299</b><i>12 in stock</i></div></article>
        <article><div className="feature-icon"><PackageCheck /></div><h3>Orders in motion</h3><p>Move fulfillment forward with clear action states, customer-safe context, and return evidence.</p></article>
        <article><div className="feature-icon"><Handshake /></div><h3>Creator-powered growth</h3><p>Configure product commissions, track promotions, and understand attributed orders.</p></article>
        <article><div className="feature-icon"><CircleDollarSign /></div><h3>Finance you can follow</h3><p>Review seven-day settlement ledgers, commissions, fees, and payout status.</p></article>
        <article><div className="feature-icon"><Users /></div><h3>Your team, correctly scoped</h3><p>Assign roles and permissions, monitor verification, and keep operations accountable.</p></article>
      </div></section>
      <section id="how" className="landing-section role-section"><div className="role-card seller-role"><span>01 · SELLERS</span><h2>From first product to daily operations.</h2><p>Complete business onboarding, earn approval, then step directly into Seller Studio to run catalog, orders, logistics, finance, and growth.</p><Link to="/onboarding/seller">Build your storefront <ArrowRight /></Link></div><div className="role-card creator-role"><span>02 · CREATORS</span><h2>Turn influence into attributable commerce.</h2><p>Verify your creator profile, discover eligible products, launch trackable promotions, and monitor commission through every stage.</p><Link to="/onboarding/creator">Join as a creator <ArrowRight /></Link></div></section>
      <section className="final-cta"><div><div className="eyebrow">Your next chapter</div><h2>Choose how you grow on Social 24x7.</h2></div><div><Button to="/onboarding/seller">Start selling</Button><Button to="/onboarding/creator" variant="secondary">Become a creator</Button></div></section>
    </main>
    <footer><Brand /><p>Social 24x7 Partner Web · Business operations for sellers and creators.</p><Link to="/login">Partner sign in</Link></footer>
  </div>
}
