# 项目发布约定

- 本项目以当前根目录为主源码，GitHub 仓库为 https://github.com/JerryZhi/deposit-studio ，分支为 `main`。
- 用户已指定：以后推送 GitHub 后通过 SSH 部署到 vmrack，不再发布 ChatGPT Sites，除非用户明确改变要求。
- SSH 别名为 `new-vmrack`；正式网址为 https://jieqian.yeedit.xyz/ 。保留现有 Cloudflare 代理、DNS、Nginx 和证书配置。
- 发布前检查 Git 差异，运行 `npm test` 和 `npm run build`，提交并推送准确源码。不要覆盖其他工作中的修改。
- 将 `dist` 内容打包上传到 `/tmp`，解压至 `/var/www/deposit-studio/releases/<git-commit>`；确认产物后原子切换 `/var/www/deposit-studio/current` 符号链接。
- 保留旧 release 用于回滚；验证源站和公网返回的新 index 及静态资源，必要时回滚 current。禁止删除其他站点或重置服务器配置。
- `sites/deposit-studio` 和 `.openai` 是旧 Sites 发布资料，不是当前发布入口。不要创建或部署新的 Sites 版本。
- 部署步骤和回滚方式见 README.md。
