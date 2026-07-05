# Verify — feature/login-upgrade (2026-07-05)

| Spec item            | Observed                                                                 | Result |
|---|---|---|
| Layout / spacing     | Login card centered; eye toggle sits inside input right edge; Forgot link centered under Sign in; reset page mirrors login card | PASS |
| Colors / contrast    | Dark surface card on near-black bg, white headings, indigo CTA, muted gray labels — matches existing dashboard vars | PASS |
| Typography           | Same font stack, uppercase tracking-wider labels, bold white h1 as pre-existing login | PASS |
| Mobile (375px)       | Login renders fully in viewport, no overflow, input/CTA full width | PASS |
| Animations / motion  | Only 150-300ms color transitions on hover/toggle; reveal toggle flips input type password→text (verified via Playwright: type="text" after click, EyeOff icon shown) | PASS |
| Reset invalid token  | Shows "This reset link is invalid or has expired" + Back to sign in | PASS |
| Reset valid token    | Two password fields with independent reveal toggles, min-12 hint, auto-login CTA | PASS |
| Google button        | Hidden — NEXT_PUBLIC_GOOGLE_CLIENT_ID unset (credential-gated by design) | PASS |
| Outside input        | Opus critique: "clean, disciplined dark auth flow, 90% shippable" — flagged plaintext-by-default password as a defect; investigated: both reveal toggles default to useState(false) (masked), the screenshot was post-toggle from functional testing. Real takeaway adopted: primary-button label contrast → Phase 5 polish list. | PASS |

Viewports beyond 1440/375 waived: auth-only card layout, no wide-layout surface.
Screenshots: scratchpad login-1440.png, login-375.png, reset-1440.png, reset-valid-1440.png
API curls: login 401/200+cookie, reset-confirm forged 401 / expired 401 / short-pw 400, google-no-env 404, reset-request 200 (Resend id 55f71fa3-6a97-41fd-9d00-05a1eb3d7572) then 429.
