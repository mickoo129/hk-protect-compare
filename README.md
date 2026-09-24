# 保障羅盤 · hk-protect-compare

香港保障產品比較靜態站，準備放 Netlify。

## 範圍（第一版）

- 類型：醫療／VHIS、危疾、定期人壽、意外
- 公司：友邦、保誠、宏利、富衛、安盛、永明、中國人壽（海外）、周大福人壽、中國太平人壽（香港）、安達人壽、萬通、保柏、保泰、藍十字
- 不做：儲蓄／分紅、銀行系列（滙豐人壽、恒生保險、中銀人壽）
- 本站唔賣保險、唔提供保險意見

## 資料

全部產品放 `data/db.json`。

- `status: seed`：已入庫、待核對計劃書
- `status: verified`：已對過官方資料同更新日期

加產品只改 JSON，唔使改版面。

## 本機

```bash
npx serve .
```

## Netlify

連呢個 GitHub repo，publish directory 設為 repo 根目錄。
