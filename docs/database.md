# MongoDB Design

## Collections

- users
- coffeeRecords
- origins/varieties/processes/roastLevels/flavors

## Validation

coffeeRecordsにおけるuserIdは必ず、認証情報から取得する。また、記録の更新、削除は所有者確認を必ず行う。

## Graph Persistence

グラフ専用のコレクションを作成しない。

グラフを保存済みのデータとして読み込むのではなく、coffeeRecordsとマスターデータからリクエストのたびその場で計算して作成する。

グラフの二重管理を防ぐ。MVPレベルなら毎回計算しても時間的問題はない。
