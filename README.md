
  # Artwalls Marketplace Web App

  This is a code bundle for Artwalls Marketplace Web App. The original project is available at https://www.figma.com/design/nRhro8hi8uUibQ4p6o3co2/Artwalls-Marketplace-Web-App.

  ## Running the code

  Run `npm i` to install the dependencies.

  Run `npm run dev` to start the development server.

  ## Artist → Venue Referrals (V1)

  ### Env vars

  - `REFERRAL_DAILY_LIMIT` (optional, default 5)
  - `PAGES_ORIGIN` (Cloudflare Pages origin for invite links)
  - Email (server/local): `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `FROM_EMAIL`

  ### Test flow (quick)

  1. Sign in as an artist and open **Invite a Venue**.
  2. Send an invite and confirm it appears in **Referrals**.
  3. Open the invite link: `/venue/signup?ref=<token>` and create a venue account.
  4. Create a wallspace or call for art to qualify the referral.
  5. As admin, open **Referrals** and click **Grant reward**.
  6. Verify the artist has `pro_until` set and Pro features unlocked.
  