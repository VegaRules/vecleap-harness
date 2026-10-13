# VecLeap Desktop（Windows）

VecLeap 桌面端基于 DeepSeek Harness 的 `apps/desktop` Electron 壳。产品名与安装包前缀在 **`apps/desktop/product.config.mjs`** 中集中配置（当前为 **VecLeap**）。

## 不要复制 `apps/desktop`

上游只维护 **`apps/desktop` 这一份** Desktop 工程。在 `apps/vecleap-desktop` 再拷一套会导致：

- workspace / electron-builder / 打包脚本路径全部对不上；
- 合并官方 dsh 时 **冲突翻倍**。

正确做法：在 fork 里 **只改 `apps/desktop` + 可选 `product.config.mjs`**，合并 upstream 时冲突通常集中在这几个文件。

## 环境（Windows）

- Node.js **22.19+** 或 **24+**
- 启用 Corepack：`corepack enable`
- 仓库根目录：`pnpm install`

可选：根目录 `.env` 中配置 `DEEPSEEK_API_KEY`，用于登录后对话。

## 开发运行（不打包）

在仓库根目录：

```powershell
pnpm run build
pnpm run dev:desktop
```

首次会准备 Electron 与 primary-runtime，耗时较长。开发数据在 `apps/desktop/.desktop-build/development/`，不会污染 `%USERPROFILE%\.dsh`。

仅启动已有构建产物：

```powershell
pnpm run start:desktop
```

## 编译安装包（Windows x64，无签名）

1. 复制环境文件（打包脚本会读 mandatory-update 等配置；本地无签名构建用占位即可）：

```powershell
cd apps\desktop
copy .env.windows.example .env.windows
```

2. 编辑 `.env.windows`：至少保留 `DSH_DESKTOP_APP_ID=com.vegarules.vecleap`。若仅本地 dir 包、不连官方更新源，打包时使用 unsigned 目标（见下）。

3. 在仓库根目录：

```powershell
pnpm run build
pnpm --filter @deepseek-ai/dsh-desktop exec install-electron
pnpm run package:desktop:win:x64:unsigned
```

产物目录（典型路径）：

`apps/desktop/.desktop-build/targets/win-x64/unsigned/` 或 `artifacts` 下 **`vecleap-<version>-win-x64-unsigned.exe`** 与 **`win-unpacked/`**。

直接运行未打包目录：

`win-unpacked\VecLeap.exe`

## 安装后使用

- 用户数据仍在 **`%USERPROFILE%\.dsh`**（Harness 约定）；Desktop profile 为 `profiles\desktop`。
- 内置 CLI：菜单 **管理 dsh 命令…** 可注册 PATH（仍为 `dsh` 命令名，与上游一致）。
- 与 **vecleap-hub** 等云端对接：后续通过 Cordis 插件（账号/LLM Gateway）接入，不修改 vecleap 其它 GitHub 仓库结构。

## 合并上游 dsh

1. `git remote add upstream https://github.com/deepseek-ai/deepseek-harness.git`（若尚未添加）
2. `git fetch upstream --tags`
3. 选择版本合并，例如：`git merge upstream/master` 或合并指定 tag
4. 若有冲突，优先保留 **`product.config.mjs` 及 locale/main/electron-builder-config 中的 VecLeap 品牌**
5. 根目录 `pnpm run build` 与 `pnpm run package:desktop:win:x64:unsigned` 冒烟

品牌相关改动尽量只动 **`product.config.mjs`** 和引用它的文件，可减少每次 merge 的手工量。
