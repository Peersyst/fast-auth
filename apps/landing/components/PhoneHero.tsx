"use client";

import { useEffect, useRef, useState } from "react";
import {
  AppleIcon,
  ArrowDown,
  ArrowUp,
  Bars,
  Battery,
  GoogleIcon,
  KeyIcon,
  RecvIcon,
  SendIcon,
  SwapIcon,
  Wifi,
} from "./icons";

const TARGET_EMAIL = "alex@protocol.dev";

export default function PhoneHero() {
  const [step, setStep] = useState(0);
  const [email, setEmail] = useState("");
  const typingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (step === 0) {
      let i = 0;
      setEmail("");
      typingRef.current = setInterval(() => {
        i++;
        setEmail(TARGET_EMAIL.slice(0, i));
        if (i >= TARGET_EMAIL.length) {
          if (typingRef.current) clearInterval(typingRef.current);
          setTimeout(() => setStep(1), 900);
        }
      }, 70);
      return () => {
        if (typingRef.current) clearInterval(typingRef.current);
      };
    }
    if (step === 1) {
      const t = setTimeout(() => setStep(2), 2200);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setStep(0), 3800);
    return () => clearTimeout(t);
  }, [step]);

  return (
    <div className="phoneWrap">
      <div className="phone">
        <div className="phoneNotch" />
        <div className="phoneScreen">
          <div className="phoneStatus">
            <span>9:41</span>
            <span className="phoneStatusIcons">
              <Bars />
              <Wifi />
              <Battery />
            </span>
          </div>

          <div className="phoneBody">
            {step === 0 && <SignInScreen email={email} />}
            {step === 1 && <ApprovingScreen />}
            {step === 2 && <WalletScreen />}
          </div>

          <div className="phoneDots">
            {[0, 1, 2].map((i) => (
              <span key={i} className={"pd " + (i === step ? "pdActive" : "")} />
            ))}
          </div>
        </div>
      </div>

      <div className="floatBadge floatBadge--top">
        <span className="fbDot" />
        <div>
          <div className="fbLabel">No seed phrase</div>
          <div className="fbSub">Auth0 + MPC</div>
        </div>
      </div>
      <div className="floatBadge floatBadge--bottom">
        <div className="fbStat">
          <span className="fbStatLabel">Avg. sign-in</span>
          <span className="fbStatValue">5.7s</span>
        </div>
      </div>
    </div>
  );
}

function SignInScreen({ email }: { email: string }) {
  return (
    <div className="sc">
      <div className="scHead">
        <div className="scLogo">
          <img src="/brand/fastauth-mark.svg" alt="" width={32} height={32} />
        </div>
        <h3 className="scTitle">Welcome back</h3>
        <p className="scLede">One login across every NEAR dApp on FastAuth.</p>
      </div>

      <div className="scField">
        <label>Email</label>
        <div className="scInput">
          <span>{email}</span>
          {email.length < 18 && <span className="caret" />}
        </div>
      </div>

      <button className="scPrimary">Continue</button>

      <div className="scDivider"><span>or</span></div>

      <button className="scOauth">
        <GoogleIcon /> Continue with Google
      </button>
      <button className="scOauth">
        <AppleIcon /> Continue with Apple
      </button>

      <p className="scFoot">
        New here? <b>Create a wallet →</b>
      </p>
    </div>
  );
}

function ApprovingScreen() {
  return (
    <div className="sc scCenter">
      <div className="ringWrap">
        <div className="ring" />
        <div className="ringInner">
          <KeyIcon />
        </div>
      </div>
      <h3 className="scTitle">Verifying passkey</h3>
      <p className="scLede">Auth0 issues a JWT, the on-chain guard verifies it, MPC signs. No key ever touches your device.</p>
      <div className="approveLog">
        <div className="alLine"><span className="ts">00:01</span> <span className="ok">✓</span> Auth0 JWT issued</div>
        <div className="alLine"><span className="ts">00:01</span> <span className="ok">✓</span> Guard verified on chain</div>
        <div className="alLine"><span className="ts">00:02</span> <span className="alDot" /> MPC signing…</div>
      </div>
    </div>
  );
}

function WalletScreen() {
  return (
    <div className="sc">
      <div className="walHead">
        <div>
          <div className="walEyebrow">alex.near</div>
          <div className="walBalance">
            142.<span className="walBalanceFrac">08</span> <span className="walUnit">NEAR</span>
          </div>
          <div className="walUsd">≈ $487.32</div>
        </div>
        <div className="walAvatar">A</div>
      </div>

      <div className="walActions">
        <button><SendIcon /> Send</button>
        <button><RecvIcon /> Receive</button>
        <button><SwapIcon /> Swap</button>
      </div>

      <div className="walSection">Recent</div>
      <div className="walTx">
        <div className="walTxIcon walTxIcon--in"><ArrowDown /></div>
        <div className="walTxBody">
          <div className="walTxTitle">Received</div>
          <div className="walTxMeta">from bob.near · 2m ago</div>
        </div>
        <div className="walTxAmt">+12.0</div>
      </div>
      <div className="walTx">
        <div className="walTxIcon"><ArrowUp /></div>
        <div className="walTxBody">
          <div className="walTxTitle">Swap</div>
          <div className="walTxMeta">USDC → NEAR · 1h ago</div>
        </div>
        <div className="walTxAmt walTxAmt--out">−50.0</div>
      </div>
      <div className="walTx">
        <div className="walTxIcon walTxIcon--in"><ArrowDown /></div>
        <div className="walTxBody">
          <div className="walTxTitle">Stake reward</div>
          <div className="walTxMeta">aurora-pool · 6h ago</div>
        </div>
        <div className="walTxAmt">+0.42</div>
      </div>
    </div>
  );
}
