# VecLeap cloud Agent runtime: a self-contained vecleap-harness install at
# /opt/vecleap-harness plus Node 24, for Hub's worker image to build on.
# Debian (glibc): the native modules (koffi, node-pty) ship tested prebuilds
# for it, while their musl builds crash at run time.
#
# Build from the repository root after `pnpm run build` (the image installs
# the Linux dependencies itself and uses the built lib/ outputs):
#   docker build -f apps/vecleap-cloud/Dockerfile -t vecleap-harness-cloud:<version> .
FROM node:24-bookworm-slim AS install
RUN apt-get update \
 && apt-get install -y --no-install-recommends gcc libc6-dev musl-tools python3 make g++ \
 && rm -rf /var/lib/apt/lists/* \
 && corepack enable && corepack prepare pnpm@11.28.5 --activate
WORKDIR /src
COPY . .
# The harness's own Linux addon (flock) and static Landlock launcher are built
# per platform (musl-gcc for the static launcher).
RUN cd native/system && node scripts/build.ts
RUN pnpm --filter @vecleap/harness-cloud deploy --prod --legacy /opt/vecleap-harness \
 && node /opt/vecleap-harness/scripts/materialize-links.mjs /opt/vecleap-harness

FROM node:24-bookworm-slim
COPY --from=install /opt/vecleap-harness /opt/vecleap-harness
# Smoke check: the CLI loads (prints its help) without network or credentials.
RUN node /opt/vecleap-harness/node_modules/@deepseek-ai/dsh/lib/bin.js --profile headless --help > /dev/null
