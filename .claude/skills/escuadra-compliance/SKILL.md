---
name: escuadra-compliance
description: Use when handling Escuadra data retention, deletion, the privacy policy, terms, DPA, sub-processor disclosure, public report exposure, onboarding/PII, or sending data to Anthropic/OpenAI. Triggers whenever third-party personal data (provider/client phones, voices, photos) is stored, transferred, exposed, or deleted, and before any "sell to customers" milestone.
---

# Escuadra Compliance & Data Protection

## Overview

Escuadra stores the personal data of **third parties who never consented** — providers',
maestros' and clients' phone numbers, **voice recordings**, names, and **photos of private
homes** — forwarded by the architect, and sends it to Anthropic/OpenAI (US). For a product
sold to customers in Argentina, this is the single biggest legal exposure (Ley 25.326 +
reform). Infosec ≠ data protection: this skill is the data-protection layer.

**This skill flags legal risk; it is not legal advice.** A real Argentine lawyer must review
before selling. But the engineering posture below is buildable now and required.

## Minimum posture before selling (build these)

1. **Privacy policy + Terms**, published, naming every sub-processor: Anthropic, OpenAI, Twilio, Supabase, Google, Dropbox, Vercel.
2. **DPA studio↔Escuadra**: the studio is the controller and warrants it has the right to forward third-party data; Escuadra is the processor. Standard, non-negotiable for B2B SaaS.
3. **AI on no-training / zero-or-short-retention tiers** (API/enterprise terms, in writing). Never default consumer terms. Document the cross-border transfer basis.
4. **Retention with expiry**: auto-delete media/transcripts a set time after an obra closes. Don't retain forever.
5. **Deletion / access by data subject**: a documented way to find-and-purge by phone number / name across `media_assets`, `photos`, transcripts, `timeline_entries`, `report_photos`, AND cloud-sync copies. Disclose that synced copies in the studio's own Drive/Dropbox are the studio's responsibility.
6. **Data minimization**: delete raw audio after transcription (shrinks biometric exposure); redact phone numbers from transcripts/logs where not needed.

## Public report controls (`/r/[token]`)

- `expires_at` (default 30–90 days) + `revoked_at`; expired/revoked → 404.
- `X-Robots-Tag: noindex, nofollow` + `<meta name=robots noindex>` + `robots.txt` Disallow on `/r/*` (photos of private homes must never be indexed).
- `Cache-Control: private, no-store` on the HTML; short-TTL signed image URLs; no shared-CDN caching of private bytes.
- **Optional passcode** for sensitive clients. Revoking/closing an obra invalidates its report tokens.

## PII handling everywhere

- **Never log** full transcripts, media URLs, or phone numbers. Configure any error tracker with PII scrubbing. The autonomous provisioning agent must never echo customer data or secrets.
- **Onboarding codes**: ≥8 chars, single-use, TTL 15 min, hard rate-limit on attempts (anti brute-force). `phone_e164` unique per studio.
- **`whatsapp_link` lifecycle**: revoke on member removal; re-confirm / unlink on prolonged inactivity (protects against carrier-reassigned numbers leaking PII to a stranger).
- **Encryption**: OAuth tokens encrypted at rest with a rotatable `ENCRYPTION_KEY` (envelope/Vault); minimal OAuth scopes (`drive.file`, Dropbox app-folder).
- **Incident response**: a one-page breach plan (detection, containment, who to notify, timelines) + Supabase PITR/backups.

## Verification (its "test")

- `/r/<token>` returns `noindex` headers and `Cache-Control: private`; `robots.txt` disallows `/r/`.
- Account/obra close purges Storage objects + DB rows + report tokens + search vectors.
- A "delete this data subject" routine removes a given phone/name across all tables.
- Logs/error traces contain no transcripts, phone numbers, or media URLs (grep a sample).
- Sub-processor list + privacy policy + DPA exist and are linked from signup.

## Red flags — STOP

- Storing voices/photos with no retention limit or deletion path.
- Sending data to Anthropic/OpenAI on consumer (training-enabled) terms.
- A public report with no expiry, no `noindex`, or no revocation.
- Phone numbers / transcripts appearing in logs.
- Claiming "ready to sell" without privacy policy + DPA + lawyer review.
