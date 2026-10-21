# Deploy on GitHub Pages

The maintained deployment workflow publishes `dist` to GitHub Pages. Do not use Cloudflare Pages. The CNAME in the static output is `maturity.mightora.io`.

## Repository and first publication

1. Create the public repository `mightora/maturity.mightora.io` if it does not already exist. If it exists, clone its history and add this source as a normal commit. Do not overwrite history or force-push.
2. Add the generated source, lockfile and `.github` workflows to its main branch. An extracted source ZIP has no credentials or installation dependencies. With a new empty repository, initialise and push main. An existing repository should use a branch/PR or a normal fast-forward commit.
3. In **Settings → Pages → Build and deployment**, select **GitHub Actions**. The standard workflow token cannot reliably enable Pages for the first time; a maintainer must enable the setting if it is not already available.
4. In **Settings → Pages**, set **Custom domain** to `maturity.mightora.io`. Wait for DNS validation and the certificate, then enable **Enforce HTTPS** when available. Keep `dist/CNAME` in the deployment.
5. In **Settings → Actions → General**, permit the workflows. The deployment job requests only `pages: write` and `id-token: write`; other jobs use read-only contents. CodeQL separately requests security-events permission.
6. Push main or run **GitHub Pages deployment** manually. Its build job runs type, unit, browser and offline checks before uploading the Pages artifact. A separate deploy job publishes it. A successful build alone is not deployment success.

## Cloudflare DNS

After the repository is controlled and Pages is configured with the custom domain, add this record in the `mightora.io` zone:

| Type | Name | Target | Proxy | TTL |
| --- | --- | --- | --- | --- |
| CNAME | maturity | mightora.github.io | DNS only | Auto |

Do not point an unused custom domain at unclaimed hosting. Preserve existing records unless a deliberate migration is authorised. The session's DNS inspection found no `maturity.mightora.io` record. No DNS record was created while the repository/Pages target was unavailable. This is a setup dependency rather than a request to change the hosting platform.

## Verify publication

Open https://maturity.mightora.io and confirm the app, full logo, shared header/author/footer and current `build-info.json`. Create a blank assessment, load the Power Platform example, change a score, switch views, export Office files and download the offline ZIP. Test at desktop and 390px widths. Confirm workflow badges point to real runs and that the production content matches the deployed commit. Record the actual result in `VERIFICATION.md`.

## Offline and releases

`npm run build` generates the standalone HTML and ZIP from the maintained application source. `npm run samples` creates sample reports. `node scripts/package.mjs` packages source, offline downloads, samples and example JSON in `release/`.

Push a `v*` tag to run the release workflow. The packaging job runs verification first. The release job alone receives contents write permission and attaches the artifacts with the GitHub CLI. Manual dispatch builds downloadable Actions artifacts without publishing a release tag.

## Updating shared branding

The online application loads the official shared components and stylesheet from jsDelivr, with local official snapshots as a resilience fallback. The footer snapshot and known tab-indentation workaround remain in place. To update, retrieve the latest `components.js`, `shared.css` and `footer.yaml` from `mightora/shared-ui`, update `public/shared`, check current design instructions from Technology Radar, then rebuild and test both editions. Offline CSS removes remote background image URLs and embeds the official header logo and author images.
