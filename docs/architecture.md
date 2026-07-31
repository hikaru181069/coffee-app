# Architecture

## System Overview

```text
React / Vite
    |
    | HTTPS / JSON
    v
Express API
    |
    +---- MongoDB Atlas
    |
    +---- FastAPI（必要な計算のみ）
```

## Responsibility

### React

- UI
- ルーティング
- フォーム
- API状態
- グラフ描画

### Express

- 外部公開APIの唯一の入口
- 認証・認可
- CRUD
- MongoDB
- 入力検証
- FastAPI呼び出し
- エラー形式の統一

### FastAPI

- DB非依存の計算
- グラフ変換または将来分析
- Pydanticによる入出力検証

### MongoDB

- users
- coffeeRecords
- master data

## Request Flow: Create Record

```text
RecordForm
  → coffeeRecordApi.create()
  → POST /api/coffee-records
  → authenticate middleware
  → validator
  → coffeeRecordController.create
  → coffeeRecordService.create
  → CoffeeRecord model / repository
  → MongoDB
  → normalized response
  → frontend
```

## Request Flow: Graph

推奨MVP案:

```text
GraphPage
  → GET /api/graph
  → authenticate
  → graphController
  → graphService
  → CoffeeRecord取得
  → graph変換
  → response
```

FastAPIへ分離する場合:

```text
GraphPage
  → Express GET /api/graph
  → CoffeeRecord取得
  → FastAPI POST /graph/build
  → graph response
  → React
```

最初はExpress内の純粋関数として実装し、
分析処理が増えた段階でFastAPIへ移す案を優先します。
MVPでサービス間通信を増やす必要性が薄いためです。

## Suggested Repository Structure

```text
coffee-app/
├── CLAUDE.md
├── README.md
├── docker-compose.yml
├── docs/
├── prompts/
├── frontend/
│   └── src/
│       ├── app/
│       ├── components/
│       ├── features/
│       │   ├── auth/
│       │   ├── coffee-records/
│       │   └── graph/
│       ├── pages/
│       ├── services/
│       └── utils/
├── backend/
│   └── src/
│       ├── config/
│       ├── controllers/
│       ├── middleware/
│       ├── models/
│       ├── repositories/
│       ├── routes/
│       ├── services/
│       ├── validators/
│       └── utils/
└── fastapi-service/
    ├── app/
    │   ├── routers/
    │   ├── schemas/
    │   ├── services/
    │   └── core/
    └── tests/
```

既存mlb-appと大きく異なる構成へ一括変更しないでください。
現在の構成を確認し、必要な責務分割を段階的に導入します。

## Error Response

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "入力内容を確認してください",
    "details": []
  }
}
```

代表コード:

- VALIDATION_ERROR
- UNAUTHORIZED
- FORBIDDEN
- NOT_FOUND
- CONFLICT
- INTERNAL_ERROR

## Security

- JWT秘密鍵をコードへ書かない
- パスワードをレスポンスへ含めない
- userIdをbodyから信用しない
- 更新・削除で所有者確認
- CORSを環境別に制限
- MongoDBクエリへ未検証入力を渡さない
- rate limitは公開環境で検討
