# Prompt 05: Knowledge Graph Frontend

以下を読んでください。

- @CLAUDE.md
- @docs/design.md
- @docs/knowledge-graph.md
- @docs/api.md
- @docs/product-principles.md

## Goal

ユーザーが自分のCoffeeRecordと属性のつながりを、
探索できるGraph画面を実装すること。

## Before Coding

既存依存関係を確認し、グラフライブラリ候補を比較してください。

比較軸:

- Reactとの統合
- node選択
- zoom / pan
- custom node
- bundle size
- mobile
- 保守性
- 初学者が説明できるか

候補を1つ選び、採用理由を説明してから実装してください。

## Responsibility Split

```text
features/graph/
├── api/
├── components/
│   ├── GraphCanvas
│   ├── GraphFilters
│   ├── GraphLegend
│   └── NodeDetailPanel
├── hooks/
├── adapters/
└── utils/
```

APIレスポンスから描画ライブラリ形式への変換はadapterへ置いてください。

## Required UX

- zoom / pan
- node selection
- node type legend
- filters
- loading / empty / error
- selected node detail
- related record links
- GraphからRecord Detailへの遷移
- モバイルで情報が読める代替レイアウト

## Constraints

- 色だけでnode typeを区別しない
- GraphPageへ全ロジックを集中させない
- 物理シミュレーション設定を無意味に複雑化しない
- 1000件規模を前提とした過剰最適化をしない

## Checks

- 記録追加後にgraphへ反映
- 同じ属性が重複ノードにならない
- filterがAPIまたはUIで一貫して動く
- npm run lint
- npm run build
