"use client";

import { useState } from "react";
import { ArrowRight, CheckIcon, GithubIcon } from "./icons";

type Tab = "provider" | "hooks" | "interface";

const SNIPPETS: Record<Tab, string> = {
  provider: `import { FastAuthProvider } from "@fast-auth-near/react-sdk";
import { JavascriptProvider } from "@fast-auth-near/javascript-provider";
import { Connection } from "near-api-js";

// Start on testnet (no approval needed). Switch to "mainnet" once your
// app has been whitelisted and approved Auth0 credentials issued.
const connection = new Connection({
  networkId: "testnet",
  provider: { type: "JsonRpcProvider", args: { url: "https://rpc.testnet.near.org" } },
});

export default function App() {
  const providerConfig = {
    // Auth0 tenant — Google · Apple · Email/password · Passkey live here.
    provider: new JavascriptProvider({
      domain:   "your-tenant.auth0.com",
      clientId: "YOUR_AUTH0_CLIENT_ID",
      audience: "https://your-api.example.com",
    }),
  };

  return (
    <FastAuthProvider
      providerConfig={providerConfig}
      connection={connection}
      network="testnet"
    >
      <Wallet />
    </FastAuthProvider>
  );
}`,
  hooks: `// Wallet.tsx — sign in once, then send gas-free transactions.
import { useFastAuth, useIsLoggedIn, useSigner } from "@fast-auth-near/react-sdk";
import { buildDelegateAction } from "near-api-js/lib/transaction";

export function Wallet() {
  const { client, isReady } = useFastAuth();
  const { isLoggedIn }      = useIsLoggedIn();
  const { signer }          = useSigner();

  if (!isReady || !client) return <p>Initializing…</p>;
  if (!isLoggedIn)         return <button onClick={() => client.login()}>Sign in</button>;

  // Gas-free meta-transaction. Build the delegate action with near-api-js;
  // the FastAuth relayer pays gas on behalf of the user.
  const post = () => signer?.signAndSendDelegateAction({
    receiverId:     "guest-book.near",
    delegateAction: buildDelegateAction({ /* sender, actions, nonce, … */ }),
    name:           "My dApp",
    imageUrl:       "https://my-dapp.com/logo.png",
  });

  return <button onClick={post}>Post message · gas-free</button>;
}`,
  interface: `// Provider interface — implement IFastAuthProvider yourself,
// or pick one of the built-in providers (Auth0, custom backend).

interface IFastAuthProvider {
  // Authentication
  login(...args: any[]): void;
  logout(): void;
  isLoggedIn(): Promise<boolean>;

  // Signing
  requestTransactionSignature(...args: any[]): Promise<void>;
  requestDelegateActionSignature(...args: any[]): Promise<void>;

  // Utilities
  getSignatureRequest(): Promise<SignatureRequest>;
  getPath(): Promise<string>;
}

type SignatureRequest = {
  guardId:       string;        // guard contract identifier
  verifyPayload: string;        // JWT or verification data
  signPayload:   Uint8Array;    // transaction bytes to sign
  algorithm?:    "secp256k1" | "eddsa" | "ecdsa";
};`,
};

const TAB_FILE: Record<Tab, string> = {
  provider: "App.tsx",
  hooks: "Wallet.tsx",
  interface: "types.ts",
};

const TAB_LABEL: Record<Tab, string> = {
  provider: "Provider",
  hooks: "Hooks",
  interface: "Interface",
};

export default function DeveloperSection({ docsHref }: { docsHref: string }) {
  const [tab, setTab] = useState<Tab>("provider");
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard?.writeText(SNIPPETS[tab]);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  };

  return (
    <section className="dev" id="developers">
      <div className="container">
        <div className="sectionHead">
          <div>
            <p className="sectionKicker"><span className="kn">03</span>  For developers</p>
            <h2 className="sectionTitle">Drop it in.<br />Ship today.</h2>
          </div>
          <p className="sectionLede">
            React SDK or vanilla JS — pick your stack. The Auth0-backed JavaScript provider handles login; the FastAuth relayer pays gas. You write the dApp.
          </p>
        </div>

        <div className="devGrid">
          <div className="devCopy">
            <ul className="devList">
              <li>
                <span className="checkbox"><CheckIcon /></span>
                <div>
                  <strong>Drop in <code>FastAuthProvider</code>.</strong>
                  <span>
                    Wrap your app once. <code>useFastAuth</code> exposes the{" "}
                    <code>client</code> for <code>login</code> / <code>logout</code>;{" "}
                    <code>useSigner</code> exposes the signer for transactions and gas-free
                    delegate actions.
                  </span>
                </div>
              </li>
              <li>
                <span className="checkbox"><CheckIcon /></span>
                <div>
                  <strong>Four sign-in methods. One identity.</strong>
                  <span>
                    Email, Google, Apple, or passkey — routed through Auth0. The same login resolves to the same NEAR account in every dApp on FastAuth.
                  </span>
                </div>
              </li>
              <li>
                <span className="checkbox"><CheckIcon /></span>
                <div>
                  <strong>Browser, React, JS, React Native.</strong>
                  <span>
                    Pick the SDK or provider that matches your stack. Same client, same account model, same signature flow.
                  </span>
                </div>
              </li>
              <li>
                <span className="checkbox"><CheckIcon /></span>
                <div>
                  <strong>Open source. Extend the auth side.</strong>
                  <span>
                    SDKs and contracts on GitHub. Run your own JWT guard or custom issuer service if Auth0 isn't enough — the FastAuth contract, router, and MPC network are shared mainnet infrastructure.
                  </span>
                </div>
              </li>
            </ul>

            <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 8 }}>
              <a href={docsHref} className="btn btn--primary">
                Read the docs <ArrowRight />
              </a>
              <a href="https://github.com/peersyst/fast-auth" className="btn devGhostBtn">
                <GithubIcon /> View on GitHub
              </a>
            </div>
          </div>

          <div className="codeCard">
            <div className="codeBar">
              <div className="dots"><span /><span /><span /></div>
              <span className="file">{TAB_FILE[tab]}</span>
              <button className={"copy " + (copied ? "copied" : "")} onClick={handleCopy}>
                {copied ? "✓ Copied" : "Copy"}
              </button>
            </div>
            <div className="codeTabs">
              {(["provider", "hooks", "interface"] as Tab[]).map((t) => (
                <button
                  key={t}
                  className={"codeTab " + (tab === t ? "active" : "")}
                  onClick={() => setTab(t)}
                >
                  {TAB_LABEL[t]}
                </button>
              ))}
            </div>
            <pre className="code">
              <code dangerouslySetInnerHTML={{ __html: highlight(SNIPPETS[tab]) }} />
            </pre>
          </div>
        </div>
      </div>
    </section>
  );
}

// All three tabs are TypeScript-ish now — same highlighter for each.
function highlight(src: string): string {
  let s = src.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  s = s.replace(/(\/\/[^\n]*)/g, '<span class="tk-c">$1</span>');
  s = s.replace(/(&quot;[^&]*?&quot;)/g, '<span class="tk-s">$1</span>');
  s = s.replace(
    /\b(import|from|export|default|function|return|const|let|if|else|new|interface|type|extends)\b/g,
    '<span class="tk-k">$1</span>',
  );
  s = s.replace(/\b(\d+)\b/g, '<span class="tk-n">$1</span>');
  return s;
}
