# 使用 Git 发布瞬息

已有仓库：[Yulia0128/MomentTheatre](https://github.com/Yulia0128/MomentTheatre)，默认分支 `main`。以后更新使用 `git push`，不再通过网页逐个上传。

1. 在开发目录运行所需测试、`npm run check` 与 `npm run package`，生成 `dist/momenttheatre-1.3.0/`、同名 ZIP 和独立 HTML 预览。
2. 使用开发目录下 `.release-git/MomentTheatre/` 的独立 Git 克隆；确认 origin 与默认分支，读取最新远端状态并保留现有提交历史。
3. 仅将发布目录里的正式文件复制到克隆的根目录。根目录应直接是 `manifest.json`、`index.js`、`style.css`、`src/` 等，不增加外层版本文件夹。不能在外层 airp 工作区直接整目录提交。
4. 检查 Git 差异和文件清单，确认版本号一致、模块完整，没有依赖、预览、临时资料或密钥；远端额外文件不擅自删除。有远端新改动时先处理并验证，不能强推覆盖。
5. 在独立克隆中创建提交，执行 `git push origin main`；推送后检查远端提交 SHA 和主要文件。只有明确授权上传时才执行，普通开发不自动发布。
6. 用户在酒馆扩展管理中更新瞬息并刷新；首次安装仍使用上述仓库地址。

无需开启 GitHub Pages；酒馆安装的是 Git 仓库，不是托管网页。可以额外创建 `v1.3.0` Release 展示更新说明，安装和更新依然来自默认分支中的扩展文件。

后续版本更新同一仓库的文件，保持入口和目录结构，提升 manifest 版本号并更新 CHANGELOG。用户在酒馆扩展管理中更新并刷新，不必卸载。

Git 登录使用系统 Git Credential Manager 或 GitHub 的浏览器授权，不将令牌写入源码、远端 URL 或项目配置。独立发布克隆可以单独配置代理和文本换行方式，不修改用户全局设置。「检查更新」从酒馆当前 Git 安装目录读取真实远程仓库，无需预填账号。

HTML 预览单独交付，不必上传到扩展仓库；项目工作区的 node_modules、.artifacts、设计过程文件、旧版 ZIP 与个人数据都不应混入发布目录。

依据：[酒馆扩展安装说明](https://docs.sillytavern.app/extensions/)、[GitHub 创建仓库](https://docs.github.com/en/repositories/creating-and-managing-repositories/creating-a-new-repository)。

## 1.3.0 增强版：本地发布步骤

`D:\yiyou\酒馆\MomentTheatre-Plus` 这个目录就是仓库根，没有外层版本文件夹，`manifest.json`、`index.js`、`style.css`、`src/` 都在第一层。作者仓库是 `Yulia0128/MomentTheatre`，不要把改动推到作者仓库，发布到自己的账号里。

1. 在 GitHub 新建一个空仓库（不要勾选自动生成 README），拿到仓库地址。
2. 在 `D:\yiyou\酒馆\MomentTheatre-Plus` 里设置远端并推送：
   `git remote add origin https://github.com/<你的用户名>/<仓库名>.git`
   `git push -u origin main`
   （这个目录已经有初始化好的 `main` 分支和首个提交，提交信息是 `瞬息·番外小剧场 1.3.0 增强版`。）
3. 在酒馆「扩展」→「安装扩展」里填 `https://github.com/<你的用户名>/<仓库名>` 安装；以后更新走仓库的更新按钮。
4. 可选：建一个 `v1.3.0` Release，把 `CHANGELOG.md` 顶部的 1.3.0 条目贴进去。

代理：GitHub 直连在本机被重置，推送前给这个仓库设置代理
`git config http.proxy socks5h://127.0.0.1:10808`（只作用于本仓库，不动全局设置）。

发布包里不要带 `.git`、`node_modules`、`dist`、任何本机路径或备份 JSON；`MomentTheatre-1.3.0.zip` 是给不熟悉 Git 时直接拖进扩展目录用的备用包，同样只有扩展文件。
