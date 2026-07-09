// NEAR Auth wordmark lockup — the NEAR "N" mark (green) + "NEAR" (ink black)
// + "Auth" (NEAR green). Vector, extracted verbatim from the design system
// (preview/10_logo.html, "default header" variant). Per the brand spec: on
// light surfaces NEAR is ink-black and Auth is NEAR green. Replaces the raster
// logo whose baked-in white "NEAR" was invisible on the cream canvas.
const NEAR_GREEN = "#00EC97";

export function NearAuthLogo() {
  return (
    <span className="brandLockup" aria-label="NEAR Auth">
      <svg
        className="brandLockupMark"
        viewBox="0 0 39.41 39.43"
        fill="none"
        aria-hidden="true"
      >
        <path
          d="M35.2112 0C33.7516 0 32.3963 0.75721 31.6317 2.002L23.3937 14.2398C23.1253 14.6431 23.2342 15.1869 23.6373 15.4554C23.9641 15.6733 24.3963 15.6464 24.6939 15.3902L32.8028 8.3529C32.9375 8.23157 33.1453 8.24393 33.2665 8.37874C33.3215 8.44053 33.3507 8.5203 33.3507 8.60231V30.6355C33.3507 30.8175 33.2037 30.9636 33.0218 30.9636C32.9241 30.9636 32.832 30.9209 32.7703 30.8456L8.25936 1.48746C7.46105 0.544876 6.28884 0.00112346 5.05488 0H4.19818C1.87958 0 0 1.88067 0 4.2006V35.2327C0 37.5527 1.87958 39.4333 4.19818 39.4333C5.65783 39.4333 7.01305 38.6761 7.77769 37.4313L16.0157 25.1935C16.2841 24.7902 16.1752 24.2464 15.7721 23.9779C15.4453 23.76 15.013 23.787 14.7155 24.0431L6.60659 31.0804C6.47186 31.2018 6.26414 31.1894 6.14287 31.0546C6.08785 30.9928 6.05866 30.913 6.05979 30.831V8.79217C6.05979 8.61017 6.20688 8.46412 6.38877 8.46412C6.48534 8.46412 6.57853 8.50681 6.64028 8.58209L31.1489 37.9459C31.9472 38.8885 33.1194 39.4322 34.3534 39.4333H35.2101C37.5287 39.4345 39.4094 37.5549 39.4116 35.235V4.2006C39.4116 1.88067 37.5321 0 35.2135 0H35.2112Z"
          fill={NEAR_GREEN}
        />
      </svg>
      <span className="brandLockupWord" aria-hidden="true">
        <span className="blNear">NEAR</span>
        <span className="blAuth">Auth</span>
      </span>
    </span>
  );
}
