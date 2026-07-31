"""main.py のヘルスチェックのテスト。

MVPではこのサービスに実装済みの計算処理が無い（docs/architecture.md の
Architecture Decision により、知識グラフの変換はExpress側の純粋関数で
行っている）。CIで「サービスが正しく起動しレスポンスを返せるか」だけは
確認できるよう、最小限のテストを置いている。
"""

from fastapi.testclient import TestClient

from main import app

client = TestClient(app)


def test_health_check():
    response = client.get("/")

    assert response.status_code == 200
    assert response.json() == {"status": "ok", "service": "Coffee App Analysis Service"}
