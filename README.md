# 存笺 · Deposit Studio

本地定期存款示意图编辑器。提供参数配置、实时手机预览和 PNG 导出，不连接银行、不上传输入、不生成拒绝话术。

## 启动

需要 Node.js 22.18+（推荐 Node.js 24）和 npm。

```powershell
npm install
npm run dev
```

打开终端显示的本机地址。生产构建：`npm run build`；预览构建：`npm run preview`；计算与校验测试：`npm test`。

## 使用

- 左侧调整金额、年利率、存期、存入日期；默认自动计算到期日，可切换手动日期。
- 无保存配置时，手机时间使用访问时的浏览器本地时间，开户日使用本地日期的 16 天前。重置会重新生成这些默认值；已保存的自定义参数优先恢复。
- 手机时间、电量、充电状态、Wi-Fi / 4G / 5G、信号强度均可调整。
- 导出 1×（390 × 844）、2×（780 × 1688）或 3×（1170 × 2532）的 PNG。
- 模板参考提供的截图布局：白底列表、居中余额、红色利息、开户与到期日期、期限进度条。卡号前缀为 `6212****`，账户前缀为 `3602****`；无保存配置时及重置时，各自随机生成 4 位数字尾号，支持前导零。可手动修改或使用“随机生成两个尾号”重新生成，已保存的手动值优先恢复。
- 状态栏使用横向细长的安卓风格电池，电量百分比显示在右侧，各图标在 16px 高的容器内垂直居中；4G / 5G 标注紧贴信号格，Wi-Fi 使用紧凑的同心圆弧。电池内用填充量表示电量，低电量显示红色，充电时显示绿色和闪电。
- 导出包含矩形手机画面，不包含预览中的硬件边框与编辑器。“模拟数据 · 非银行凭证”说明显示在网站界面，不包含在导出图片中。
- “底部文字半截显示”默认开启，仅裁切底部灰色说明文字，模拟屏幕边界截断内容；关闭后完整显示。预览与 PNG 使用相同裁切效果，输出尺寸不变。
- 有效配置自动保存在当前浏览器的 localStorage 中。刷新后恢复；“重置 → 清空并重置”可删除保存的配置。
- 无效输入会提示原因并暂时禁用导出。浏览器不允许存储时，预览和导出仍然可用。

## 计算规则

固定存期的预计利息 = 本金 × 年利率 / 100 × 存款月数 / 12。

手动到期日期的预计利息 = 本金 × 年利率 / 100 × 实际天数 / 365。

日期差按 UTC 日历日计算，避免夏令时造成偏差；按月到期遇到月末时钳制到目标月最后一天。收益四舍五入到分，均为简化单利估算，不代表任何银行的实际计息规则。

## 技术

React + TypeScript + Vite；PNG 使用 [html-to-image](https://github.com/bubkoo/html-to-image)。界面使用本机字体，不加载远程图片、字体、分析或第三方服务。`src/domain.ts` 包含日期、校验、计算和配置解码；`src/App.tsx` 包含编辑器；`src/PhoneScreen.tsx` 与 `src/phone.css` 定义截图模板。

推荐使用最新版 Chrome / Edge。PNG 与当前系统的中文字体保持一致，跨系统字体可能略有差异。本项目为“存笺”生成的模拟界面，不使用真实银行标志或账户。

## 发布与回滚

正式站点：https://jieqian.yeedit.xyz/ 。源码：https://github.com/JerryZhi/deposit-studio ，使用 `main` 分支。

按用户要求，后续使用 GitHub → SSH vmrack 发布，不再使用 ChatGPT Sites。SSH 别名为 `new-vmrack`。服务器已有 Nginx 静态托管与 HTTPS，保留 Cloudflare 橙云代理和现有 DNS 配置。

1. 检查差异，运行 `npm test` 和 `npm run build`。
2. 提交源码并 `git push origin main`，确保构建对应已推送的提交。
3. 将 `dist` 目录内的文件打成 tar.gz，通过 `scp` 上传到服务器 `/tmp`。
4. 解压至 `/var/www/deposit-studio/releases/<git-commit>`，检查 `index.html` 和 `assets` 后，以临时符号链接加 `mv -Tf` 原子替换 `/var/www/deposit-studio/current`。
5. 验证服务器本机 HTTPS 与公网 HTTPS 均返回新 index 和资源，检查页面及 PNG 导出。

Nginx 根目录为 `/var/www/deposit-studio/current`；配置为 `/etc/nginx/sites-available/jieqian.yeedit.xyz`；证书续期使用现有 Certbot webroot `/var/www/letsencrypt`。仅更新静态文件无需重载 Nginx。

发布前记录 `readlink -f /var/www/deposit-studio/current`。发生问题时，将临时符号链接指向这个旧 release，再原子替换 `current` 即可回滚。不要立即删除旧版本。
