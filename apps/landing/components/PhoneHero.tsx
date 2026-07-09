// PhoneHero — pure CSS animation. All three screens are rendered at all
// times; CSS keyframes cycle which one is visible. Zero JS state, zero React
// effects, zero hydration dependency. The animation runs the moment the
// HTML+CSS reaches the browser, regardless of whether React loads.
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
  return (
    <div className="phoneWrap" aria-hidden="true">
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

          <div className="phoneBody phoneBody--cycle">
            <div className="phStep phStep--1"><SignInScreen /></div>
            <div className="phStep phStep--2"><ApprovingScreen /></div>
            <div className="phStep phStep--3"><WalletScreen /></div>
          </div>

          <div className="phoneDots">
            <span className="pd phDot--1" />
            <span className="pd phDot--2" />
            <span className="pd phDot--3" />
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

function SignInScreen() {
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
          {/* CSS animates `width` from 0 → 100% over the typing window so
              the email reveals char-by-char. The caret span sits to the
              right and blinks via its own keyframe. */}
          <span className="scInputType">{TARGET_EMAIL}</span>
          <span className="caret" />
        </div>
      </div>

      <button className="scPrimary" type="button" tabIndex={-1}>Continue</button>

      <div className="scDivider"><span>or</span></div>

      <button className="scOauth" type="button" tabIndex={-1}>
        <GoogleIcon /> Continue with Google
      </button>
      <button className="scOauth" type="button" tabIndex={-1}>
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
        <button type="button" tabIndex={-1}><SendIcon /> Send</button>
        <button type="button" tabIndex={-1}><RecvIcon /> Receive</button>
        <button type="button" tabIndex={-1}><SwapIcon /> Swap</button>
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
