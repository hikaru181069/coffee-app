# MVP Scope

> **2026-08-28 追記**: MVPは完了済み（下記の Completion Criteria を満たした状態、2026-07-31時点）。
> このファイルはMVP時点のスコープ決定を残すための historical な記録として保持している
> （`docs/mlb-legacy-inventory.md`と同じ扱い）。Post-MVPで追加した機能（Insight/Search/
> Entity Detail/Stats/Discover/Coffee Diagnosis/World Map等）は`docs/features.md`を、
> 実装の経緯・テスト結果は`IMPLEMENTATION.md`を参照。「Out of Scope」はMVP当時の判断であり、
> 恒久的な禁止事項ではない（実際、世界地図はPost-MVPの産地フォーカス機能として追加した）。

## Goal

ユーザーがコーヒー体験を記録し、過去の記録との繋がりを知識グラフで探索できる状態を作る。中心体験 Record -> Connect -> Discover を最小限で実装する。（`product.md`のVisionより）

## In Scope

### Authentication

- 新規登録
- ログイン
- ログアウト
- 認証状態の維持

### Record

- 記録のCRUD
- home/cafeの切り替え
- title、日時、評価、メモ、産地、農園、品種、精製方法、焙煎度、フレーバーの項目

### Graph

- 自分の記録を反映させた知識グラフ
- ノード選択
- 関連記録の表示
- フィルター
- グラフから詳細ページの遷移

## Out of Scope

- SNS機能
- 写真機能
- 世界地図
- aiチャット推薦
- 高度なレシピ管理機能

## MVP Completion Criteria

- 他者の記録を見れない
- CRUDが機能する
- 必須項目が空だと保存できない
- 記録した要素がグラフへ反映される
- ノードから関連する記録を見れる
- レスポンシブな設計
