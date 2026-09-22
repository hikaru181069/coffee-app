# 2026-09、AWS本番リリースに向けたDocker仕上げの一環で、1つのファイルに
# 「開発用」「本番用」2つの作り方をまとめたmulti-stage構成へ変更した。
# backend/Dockerfileと同じ考え方（詳細はそちらのコメント参照）。
FROM python:3.13-slim AS base
WORKDIR /app

# python:slimの公式イメージには非rootユーザーが用意されていないため、
# 自分で作る（backend/Dockerfileのnode:alpineと同じ「本番はroot権限で
# 起動しない」というお作法）。
RUN useradd --create-home --shell /bin/bash appuser

# ── 開発用（従来通り） ──────────────────────────
# pytest等のテスト専用ツールも含めてインストールし、--reloadで
# ファイル変更を検知して自動再起動する。docker-compose.ymlがこのステージを使う。
FROM base AS dev
COPY requirements.txt requirements-dev.txt ./
RUN pip install --no-cache-dir -r requirements-dev.txt
COPY . .
EXPOSE 8000
# --host 0.0.0.0: コンテナの外(=Node.jsのbackendコンテナ)からも接続できるようにする
# --reload: ファイル変更を検知して自動再起動する(nodemonのFastAPI版)
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]

# ── 本番用 ────────────────────────────────
FROM base AS prod
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .

USER appuser

EXPOSE 8000

# 30秒ごとに「/」（main.pyのhealth_check）を叩いて確認する。
# python-slimにはcurl/wgetが入っていないため、追加インストール無しで
# 使えるPython標準ライブラリ（urllib）でチェックする。127.0.0.1を明示する
# 理由はfrontend/Dockerfileの同種コメント参照（"localhost"のIPv6優先解決に
# よる接続失敗を避けるため）。
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD python -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8000/')" || exit 1

# --reloadを外す（開発専用のオプションのため）
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
