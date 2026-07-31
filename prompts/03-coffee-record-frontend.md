# Prompt 03: Coffee Record Frontend

以下を読んでください。

- @CLAUDE.md
- @docs/design.md
- @docs/mvp.md
- @docs/api.md
- @docs/product-principles.md

## Goal

CoffeeRecordの一覧・作成・詳細・編集・削除を、
ブラウザから完了できるUIを実装すること。

## Screens

- RecordsPage
- RecordFormPage（create/edit共用可）
- RecordDetailPage

## Feature Structure

既存frontend構成を確認したうえで、
少なくとも責務を次のように分けてください。

```text
features/coffee-records/
├── api/
├── components/
├── hooks/
├── schemas-or-validation/
└── utils/
```

pageには画面構成を置き、
API通信・フォーム変換・再利用UIを分離してください。

## Form UX

- 必須項目を先に表示
- Coffee Detailsはセクション化
- home / cafeで不要項目を調整
- flavors、varietiesは複数選択
- 保存中の二重送信を防ぐ
- validation messageを入力欄付近に表示
- APIエラーをユーザー向けに表示

## States

- loading
- empty
- error
- success
- delete confirmation
- not found

## Constraints

- 新しい大規模state management libraryを理由なく追加しない
- pageへ巨大なJSXを置かない
- API URLを直書きしない
- JWT保存方式は既存mlb-appに合わせる
- デザイン刷新と機能実装を混ぜすぎない

## Tests / Checks

- npm run lint
- npm run build
- 作成→詳細→編集→削除の手動確認
- モバイル幅で確認
