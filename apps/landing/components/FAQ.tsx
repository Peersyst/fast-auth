// Native HTML <details>/<summary> for the FAQ — no client interactivity
// needed. The browser toggles the expanded state on its own; this works
// reliably on every mobile browser (and screen readers / assistive tech) with
// zero React state, zero event handlers. The first item is `open` by default
// to mirror the prior UI's initial state.
//
// FAQ copy lives in `lib/faq.ts` so the visible list and the FAQPage JSON-LD
// emitted from app/page.tsx can never drift apart.
import { FAQ_ITEMS } from "@/lib/faq";
import { PlusIcon } from "./icons";

export default function FAQ() {
  return (
    <section className="faq" id="faq">
      <div className="container">
        <div className="faqGrid">
          <div>
            <p className="sectionKicker"><span className="kn">05</span>  FAQ</p>
            <h2 className="sectionTitle">Questions, answered honestly.</h2>
            <p className="sectionLede" style={{ marginTop: 24 }}>
              If you don't see what you're looking for, the docs go deeper. Or open an issue — we read all of them.
            </p>
          </div>
          <div className="faqList">
            {FAQ_ITEMS.map((it, i) => (
              <details key={it.q} className="faqItem" open={i === 0}>
                <summary className="faqQ">
                  <span className="faqQText">{it.q}</span>
                  <span className="plus" aria-hidden="true">
                    <PlusIcon />
                  </span>
                </summary>
                <div className="faqA"><p>{it.a}</p></div>
              </details>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
