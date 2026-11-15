---
description: "VecLeap Harness branch ownership, review, verification and release procedure."
kind: "agent-instruction"
---

# Development workflow

English | [中文](development-workflow.zh.md)

This reference defines the VecLeap team's process for this independent repository. The [development guide](development.md) owns environment setup and commands; the root [AGENTS.md](../AGENTS.md) owns technical conventions and the [pre-push check selection](../.agents/skills/dsh-pre-push-checks/SKILL.md). An explicit user instruction may authorize a local merge or deployment; it does not replace review or verification for a pull request.

## Branch ownership

- `develop`: integration. Completed, reviewed and verified changes join here for integration and acceptance.
- `master`: stable releases. It advances through an approved release merge, not through direct task commits.
- `feature-*`: a user-visible feature or capability.
- `fix-*`: an ordinary defect fix.
- `chore-*`: engineering, tooling, dependency or documentation maintenance.
- `hotfix-*`: an urgent fix from the affected release on `master`; synchronize it back to `develop`.
- `release-*`: an optional acceptance branch when release validation overlaps continuing work on `develop`.

Branch names use lowercase letters, digits and single hyphens, start with a letter and do not end with a hyphen. Do not use slashes, underscores, spaces, Chinese characters or generic names such as `test` or `new`.

Legacy `dev_desktop` and `feature-*` branches are historical work branches, not permanent integration branches. Preserve their history until an authorized cleanup; continue new work from `develop`.

## Daily development and review

1. Fetch `origin`, confirm the intended files are clean, and create a task branch from the latest `origin/develop`.
2. Keep one task's provider, consumers, tests, documentation and deployment assets in that branch. VecLeap Hub is a separate repository; coordinate compatible versions across repositories rather than copying sources between them.
3. Commit with Conventional Commits: `<type>(<scope>): <subject>`. Use a specific scope and an imperative English subject. Do not mix unrelated changes in one commit.
4. Open a pull request to `develop`. Describe the behavior, compatibility effects, release or rollback needs, and the commands actually run. AI-generated changes require the same review as other changes.
5. Obtain approval from another team member and the required checks before merging. Review session-format compatibility, persistence changes, snapshots, credentials, sandboxing and subprocess ownership where relevant.
6. Squash the task pull request into `develop`. Delete the task branch after integration. Reconcile the task branch with `develop` before merging when shared files changed.

Do not commit or push directly to `develop` or `master` without task or existing session authorization. Do not bypass branch protections, force-push a shared branch, merge without the required approval, or publish without release authorization.

## Verification

Select the smallest checks that cover the outgoing diff; follow the root instructions and the pre-push check selection. Never report a command that did not run or a failure as passing. The relevant checks include:

- behavior changes: focused tests, required recorded-session snapshots and both SDK projections where the loop or lifecycle changed;
- provider changes: real-API e2e tests with the appropriate credentials;
- built or published paths: `pnpm run build` and the matching artifact smoke;
- documentation: `pnpm run test:docs`, `pnpm run doc-sync`, bilingual counterpart updates and pairing records;
- source-wide quality or release: the repository-required typecheck, lint, coverage, hygiene and platform checks.

CI owns exhaustive coverage and the platform matrix. Run `pnpm run check:all` only by explicit request, for CI diagnosis or for an irreducibly repository-wide change. A pull request that changes model- or product-user-visible behavior must include the required keyless snapshot and, for GUI changes, the real-flow GIF required by the root instructions.

Never commit `.env` files, API keys, credentials, local artifacts or local tool settings. Keep Harness packages, profiles, generated files and release boundaries intact. Record externally perceptible breaking changes in the owning upgrade guide in the same change.

## Release

1. Appoint a release owner. Complete integration and acceptance on `develop`; identify the included commits, compatibility changes and rollback procedure.
2. Open a pull request from `develop` to `master`. Require another member's approval and the required release checks.
3. Merge with an ordinary merge commit. Do not squash or rebase a `develop` release into `master`.
4. Build the approved merge commit and tag it according to the owning package or application release procedure. Publish only with explicit release authorization.
5. Record the tag, source commit, image or artifact identifier, verification and deployment result.

For a release blocking fix, create `hotfix-*` from the affected `master` release, obtain review and verification, then merge it into `master` with an ordinary merge commit. Merge the fix back to `develop` with an ordinary merge commit so a later release cannot reintroduce the defect. If the released version is behind `master`, tag and deploy the reviewed hotfix candidate instead of including unrelated work.

## Branch protection and AI boundaries

Protect `master` and `develop`: require pull requests, another member's approval, passing required checks and resolved review discussions. Disallow force pushes and deletion. Administrators follow these rules too; any emergency exception requires explicit authorization and a record.

AI tools inspect the current branch and working tree before editing or Git operations. They follow the same task-branch, review and verification requirements. Documentation alone does not establish remote protections; verify the remote default branch, required checks, merge methods and publication permissions separately.
