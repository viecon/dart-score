# 飛鏢計分

Vue 3 + Vite 純前端，部署在 https://dart.viecon.site 。

- 自訂 1–16 位玩家與名稱
- 301 / 501 / 701，一般或雙倍結鏢
- 輸入三鏢總分，Enter 記分、自動換人並維持焦點
- Ctrl / Cmd + Z 撤銷整個回合（包含獲勝、爆鏢）
- Alt + N 新比賽；設定使用 Tab / Shift+Tab 切換，Enter 開始，Esc 關閉
- 雙倍結鏢時，用 Alt + D 確認最後一鏢為雙倍，再 Enter 提交
- 回合平均、最高得分、回合數、爆鏢與回合紀錄

平均按回合計算，爆鏢以 0 分納入。總分無法推斷逐鏢命中率與實際用鏢數，因此不顯示這些統計。重新整理會清除比賽。

```sh
npm ci
npm run dev
npm test
npm run build
```

GitHub Actions 將 main 分支部署到 GitHub Pages。DNS：`dart` CNAME → `viecon.github.io`（僅 DNS）。
