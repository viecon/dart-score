# DART CLUB

Vue 3 + Vite 純前端飛鏢計分網頁。

- 1–16 位玩家與自訂名稱
- 301 / 501 / 701，一般或雙倍結鏢
- 逐鏢輸入、自動換人、爆鏢還原、撤銷
- 即時三鏢平均、命中率、最高回合、雙倍／三倍命中與回合紀錄
- 響應式桌面與手機介面

所有比賽資料只保留在當前頁面記憶體，重新整理即清除。爆鏢回合以 0 分計入平均，命中率計算所有非 Miss 投擲（包含爆鏢回合）。

## 開發

```sh
npm ci
npm run dev
npm test
npm run build
```

GitHub Actions 將 main 分支自動建置並部署到 GitHub Pages。自訂網域為 `dart.viecon.site`，DNS 的 `dart` CNAME 應指向 `viecon.github.io`。
