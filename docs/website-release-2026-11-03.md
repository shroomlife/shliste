# Website release, 2026-11-03

The user authorized publication of the locally reviewed website. This release is based on production branch `2382ccae2c48b2c30e0447515be09a9b41af5345` and preserves that application's current behavior except for the explicitly requested automatic PWA update activation. The original working directory remains intact.

The release includes the expanded marketing pages, everyday stories, contextual app animations, responsive layouts, generated illustrations, navigation, footer, metadata and sitemap improvements. The imprint address and VAT ID were supplied by the user through https://vype.ai/impressum. Existing unfinished privacy-policy text remains an outstanding editorial task; this release does not certify legal completeness.

Local experiments involving WebAuthn unlocking, web push and the AI job queue are excluded. The secret-list article consequently states that browser unlocking is still in development. Android and API repositories are not part of this deployment. Temporary generation files, raw screenshots, credentials and local review outputs are excluded.

Validation: ESLint passes, Nuxt type checking passes, and 989 tests pass with 47,941 assertions. The preceding visual review covered 144 layouts across eight viewport widths from 320 to 3840 pixels, plus 91 animation states. Release formatting does not change the animation timelines or layouts.

The production image before this release was `sha256:0793a0607bd8249725304302ea6d2d930bcfd3fe6fa8da901274da744d4ca71a`; it is retained on xva001 as `shroomlife/shliste:pre-website-20261103`. Deployment uses the existing production pipeline and only the `shliste_app` service. No database migration is included.
