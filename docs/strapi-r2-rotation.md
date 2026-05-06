# Strapi — Cloudflare R2 credential rotation runbook

This runbook is the operator checklist for rotating the Cloudflare R2 access
keys used by the Strapi instance that backs e-do.studio. Run it any time the
keys may have been exposed (committed to a public repo, leaked in logs,
shared with a former contributor, etc.).

The trigger that produced this document was the audit finding [EDO-7][edo7]:
the keys for the `website` bucket were committed in plaintext at
`strapi/scripts/setup-r2-cors.mjs:6-9` and `upload-to-r2.mjs:11-13` (commit
`8cda2ab`, carried over from the e-do.studio-3.0 migration). Treat those
keys as compromised even if the repo is private — assume "anyone with clone
access at any point" has them.

## Affected resources

- **Account**: Cloudflare account hosting the R2 bucket.
- **Bucket**: `website` (used by Strapi `@strapi/provider-upload-aws-s3`).
- **Consumers**:
  - Strapi prod server (Coolify VPS at `nkowss40400ww0swgw400cwg.195.35.25.154.sslip.io`),
    via `CF_ACCESS_KEY_ID` / `CF_ACCESS_SECRET` env vars.
  - One-shot scripts `strapi/scripts/setup-r2-cors.mjs` and
    `strapi/scripts/upload-to-r2.mjs` (now read from env, no hardcoded values).

## Rotation procedure

### 1. Generate a new R2 access key pair

1. Cloudflare dashboard → **R2** → **Manage R2 API Tokens**.
2. **Create API token** scoped to the `website` bucket only (Object Read & Write).
3. Copy `Access Key ID` and `Secret Access Key` to a password manager. They
   are shown once.

### 2. Roll the key on the Strapi prod server

1. SSH into the prod VPS (or open the Coolify UI for the Strapi service).
2. Update env vars:
   ```
   CF_ACCESS_KEY_ID=<new key id>
   CF_ACCESS_SECRET=<new secret>
   ```
   `CF_ACCOUNT_ID`, `CF_BUCKET_NAME`, and `CF_PUBLIC_URL` do not change.
3. Restart the Strapi service so the new credentials are picked up.

### 3. Smoke-test before purging the old key

With both keys still active:

1. Open `https://cms.e-do.studio/admin`, upload a test image to the Media
   Library. Confirm it appears.
2. Open the public site (e-do.studio) and confirm an existing image still
   loads from `CF_PUBLIC_URL`.
3. Re-run CORS setup if it has drifted:
   ```
   cd strapi/scripts
   CF_ACCOUNT_ID=... CF_ACCESS_KEY_ID=... CF_ACCESS_SECRET=... \
     node setup-r2-cors.mjs
   ```

### 4. Revoke the old key

1. Cloudflare dashboard → **R2 API Tokens** → delete the previous token.
2. Re-test upload + serve once more to confirm nothing was depending on the
   old key.

### 5. Confirm the repo is clean

```
git grep -nE '40b1f3eb00963de1f0c69c748e35eed3|00c62ee8708b37fd51460652897ad646|87c44f90ebd5874859810145c62c7f62aec5a7a903d20689e0822aba8064ff46'
```

This must return nothing on the working tree. The history still contains the
old keys (from the 3.0 migration commit). Because the keys are revoked, we
accept the historical exposure rather than rewriting Git history. Document
this decision so future audits don't re-flag it.

## Acceptance criteria (EDO-7)

- [ ] New R2 keys provisioned and deployed to Strapi prod.
- [ ] Upload + serve tested with the new keys.
- [ ] Old keys revoked in Cloudflare and confirmed inoperative.
- [ ] `git grep` for the old key fragments returns no working-tree matches.
- [ ] No env value on the prod server still equal to `tobemodified` /
      `toBeModified*` (compare against `strapi/.env.example`).
- [ ] Strapi admin shows the FR / EN locale switcher.
- [ ] A fresh deploy (empty DB) reproduces the public-role permissions via
      the bootstrap in `strapi/src/index.ts`.

[edo7]: https://paperclip.ing/EDOAAA/issues/EDO-7
