// The React demo: a server-rendered page that the browser hydrates. It passes
// <SafeContact> scrambled values (DATA, filled in at build time) the way a
// server component tree would, so neither the page nor its script holds an
// address.
import { SafeContact } from "../src/react.js";

declare const DATA: { email: string; label: string; phone: string };

export function App() {
  return (
    <main>
      <header>
        <p className="name">safe-contact · React</p>
        <h1>The same links, rendered by React.</h1>
        <p className="lede">Server-rendered, then hydrated. React owns the reveal, so re-renders stay consistent.</p>
        <p className="links"><a href="./">Back to the main demo</a></p>
      </header>
      <section className="try">
        <h2>Try it</h2>
        <dl>
          <dt>Email</dt><dd><SafeContact data={DATA.email} hint="Email address, activate to show" /></dd>
          <dt>With a label</dt><dd><SafeContact data={DATA.label}>Email us</SafeContact></dd>
          <dt>Phone</dt><dd><SafeContact data={DATA.phone} hint="Phone number, activate to show" /></dd>
        </dl>
      </section>
    </main>
  );
}
