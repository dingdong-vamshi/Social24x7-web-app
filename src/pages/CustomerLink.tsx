import { Link } from "react-router-dom";
import { Laptop, ShieldCheck, Smartphone } from "lucide-react";
import { PublicNav, PublicFooter } from "../components/PublicNav";
import "../features/social/social.css";

// Deliberately fail closed. A Partner session or a client-side localStorage
// flag is NOT evidence of an approved linked-device grant.
export function CustomerLink() {
  return (
    <div className="public-site">
      <PublicNav />
      <main id="main-content" className="customer-link">
        <section>
          <span className="eyebrow">SOCIAL 24-7 · Customer Web</span>
          <h1>
            Use SOCIAL 24-7
            <br />
            on your computer.
          </h1>
          <p>
            Your chats, community and everyday connections—linked securely from
            your phone.
          </p>
          <h2>Phone-to-browser linking</h2>
          <ol>
            <li>Open SOCIAL 24-7 on your phone.</li>
            <li>
              Use Linked Devices when the supported app update is available.
            </li>
            <li>Scan the browser code and approve the device on your phone.</li>
          </ol>
          <p>
            These steps will become available after the app and secure session
            service are integrated.
          </p>
        </section>
        <section
          className="pairing-unavailable"
          aria-labelledby="pairing-heading"
        >
          <div className="device-illustration" aria-hidden="true">
            <Smartphone size={50} />
            <Laptop size={90} />
          </div>
          <ShieldCheck size={30} />
          <h2 id="pairing-heading">Device linking is not available yet</h2>
          <p>
            No QR code has been issued. The current profile and Wallet scanners
            cannot sign this browser in.
          </p>
          <p>
            Linking requires an app update, explicit approval on your phone and
            a secure browser-session exchange.
          </p>
          <Link className="button secondary" to="/partner">
            Seller or Creator? Open Partner Web
          </Link>
        </section>
      </main>
      <PublicFooter />
    </div>
  );
}
