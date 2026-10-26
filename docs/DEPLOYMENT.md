# 部署与回滚

项目：拒绝借钱截图工具。正式站点：https://jieqian.yeedit.xyz/ 。源码：https://github.com/JerryZhi/bu-jie-qian ，使用 `main` 分支。

发布流程为 GitHub → SSH vmrack，不使用 ChatGPT Sites。SSH 别名为 `new-vmrack`。服务器已有 Nginx 静态托管与 HTTPS，保留 Cloudflare 代理、DNS 和证书配置。

## 发布

1. 检查 Git 差异，不覆盖其他工作中的修改；运行 `npm test` 和 `npm run build`。
2. 提交准确源码并 `git push origin main`，确保构建对应已推送的提交。
3. 将 `dist` 目录内的文件打成 tar.gz，通过 `scp` 上传到服务器 `/tmp`。
4. 发布前记录 `readlink -f /var/www/deposit-studio/current`，作为回滚目标。
5. 解压至 `/var/www/deposit-studio/releases/<git-commit>`，检查 `index.html`、`assets` 及产物校验值。
6. 以临时符号链接加 `mv -Tf` 原子替换 `/var/www/deposit-studio/current`。
7. 验证源站 HTTPS 和公网 HTTPS 均返回新 index 与静态资源，检查页面交互和 PNG 导出。

## 现有路径

- Nginx 根目录：`/var/www/deposit-studio/current`。
- Nginx 配置：`/etc/nginx/sites-available/jieqian.yeedit.xyz`。
- 证书续期：沿用 Certbot webroot `/var/www/letsencrypt`。

仓库改名不迁移服务器目录。仅更新静态文件无需重载 Nginx。浏览器存储键 `deposit-studio:v1` 也继续沿用，避免已有配置丢失。

`sites/deposit-studio` 和 `.openai` 是历史 Sites 资料，不是当前源码或发布入口，不创建或部署新的 Sites 版本。

## 回滚

将新的临时符号链接指向发布前记录的旧 release，再原子替换 `current`。随后重新验证源站与公网资源。

保留旧 release，不立即删除旧版本；不要删除其他站点、重置服务器配置或修改已有 DNS、代理与证书设置。
