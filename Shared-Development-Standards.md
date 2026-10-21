# Mightora – Shared Development Standards - FOR STATIC WEB APPLICATIONS ONLY

You are developing a tool under the **Mightora** brand. All tools must be high-quality, open-source static web applications capable of deployment to GitHub Pages.

Apply the following requirements consistently across the application.

## 1. Open Source, Quality Badges and Trust

All Mightora tools must demonstrate transparency, code quality and security through verifiable evidence.

- All source code must be publicly available on GitHub, preferably under the MIT licence.
- Include a link to the GitHub repository and licence.
- Implement GitHub Actions automated testing and deployment.
- Implement CodeQL security analysis and appropriate dependency scanning.
- Display relevant badges for:
  - Automated build and test status.
  - CodeQL security analysis.
  - Open-source licence (MIT).
  - GitHub repository/source availability.
  - Deployment status, where applicable.
- Badges must reflect real GitHub workflows or verifiable information. Never display fabricated security certifications or imply a passing scan guarantees security.
- Position badges together **immediately above the footer**, in a discreet, responsive section.
- Each badge must link to its underlying evidence, such as a workflow, licence or repository.
- Include a short statement explaining that the application is open source and can be independently inspected.

## 2. Downloadable and Offline Application

Where technically feasible, provide users with an offline edition of the application.

- Offer a downloadable ZIP containing a standalone `index.html` or equivalent.
- Also offer the HTML file as a direct download.
- The offline HTML must work by double-clicking it on Windows, macOS or Linux, without installation, hosting or a local web server.
- Embed all necessary JavaScript, CSS, fonts and images directly into the HTML, including Mightora branding.
- Do not depend on external CDNs, APIs, analytics, telemetry or network resources in offline mode.
- Use an appropriate restrictive Content Security Policy to prevent unnecessary outbound connections.
- Keep all relevant processing local to the device.
- Clearly display **Offline Edition – No Internet Connection Required**.
- Include a README explaining how to run the downloaded application.
- Include the open-source licence within the ZIP.
- Generate the offline edition from the same maintained source as the online application to prevent feature divergence.
- Automatically test the offline edition and verify that the downloadable ZIP contains the latest build.

### Network Transparency

Both online and offline editions should help users independently verify their privacy.

- Include a Network Transparency section describing what information is processed locally.
- Where supported, display a summary of resource requests and external domains visible through the browser's Performance Resource Timing API.
- Include instructions to press F12, open Developer Tools → Network, enable Preserve log, reload the application and inspect network requests.
- Explain that the on-screen monitor has limitations and is not a substitute for Developer Tools or an independent security audit.
- Clearly disclose any network activity required by the online edition.
- Where a fully offline version is technically impossible, explain the dependency rather than claim offline support.

## 3. Mightora Branding and Design System

Follow the official Mightora design-system guidelines strictly:

https://raw.githubusercontent.com/mightora/radar.mightora.io/refs/heads/main/design-system.instructions.md

Always retrieve and review the latest guidelines before implementing UI changes.

### Branding requirements

- Use the correct full Mightora logo in the main header, not the square profile icon or TechTweedie logo.
- Use the prescribed `logo-light` and `logo-dark` attributes.
- Use the official Mightora shared components:
  - `<mightora-header>`
  - `<mightora-author>`
  - `<mightora-footer>`
- Load the official shared stylesheet and component bootstrap from `mightora/shared-ui` in the online edition.
- Load `js-yaml` before `components.js` as required by the shared footer component.
- Preserve the required YAML footer parsing workaround where applicable.
- Include the TechTweedie author biography directly above the footer area, following the design-system guidance.
- Use the defined Mightora CSS variables, including `--fb-primary` and `--fb-accent` where applicable, rather than introducing inconsistent colours.
- Include the prescribed accessible focus indicators, keyboard navigation and mobile-responsive layouts.
- Provide working mobile hamburger navigation and consistent styling across desktop, tablet and mobile.
- Use the sticky quick-navigation pattern where appropriate.
- Keep the design clean, professional, modern and consistent with other Mightora tools.

### Online and offline consistency

The offline edition should retain the Mightora identity, including the full logo, colours, typography, navigation style and overall visual appearance, without requiring external assets.

## 4. Acceptance Criteria

Before marking any tool complete:

1. Confirm it follows the latest Mightora brand guidelines.
2. Run automated tests and security checks.
3. Verify that all quality badges link to genuine evidence.
4. Confirm the badges sit immediately above the footer.
5. Test the online GitHub Pages deployment.
6. Test that the offline HTML opens directly from disk and that all essential features work.
7. Verify that the offline edition makes no application network requests.
8. Confirm downloadable files and ZIP contents match the current release.
9. Verify responsive layouts and keyboard accessibility.
10. Document any limitations, unverified security claims or functionality that requires an internet connection.

**The overall objective is that every Mightora tool feels like part of the same product family, demonstrates verifiable open-source quality, and offers users transparency and control over their data and how they run the application.**