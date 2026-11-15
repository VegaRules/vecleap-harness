# @vecleap/harness-cloud

VecLeap Hub's cloud Agent runtime. Hub's worker runs one `dsh headless` process per task inside its sandbox, with network access only to Hub.

- `launch.mjs` forwards a loopback port to the Hub socket bound into the sandbox (`VECLEAP_HUB_SOCKET`) and runs dsh.
- `cloud.patch.yml` is the profile overlay: models through Hub's LLM gateway, Track over MCP with the task's credentials (when `VECLEAP_TRACK=1`), live `delta` events, no approval prompts and no internet tools.
- `package.json` lists dsh and the workspace peers its composition expects, so a standalone install is complete:

```sh
pnpm --filter @vecleap/harness-cloud deploy --prod --legacy /opt/vecleap-harness
node /opt/vecleap-harness/launch.mjs --profile headless --patch /opt/vecleap-harness/cloud.patch.yml --json -
```
