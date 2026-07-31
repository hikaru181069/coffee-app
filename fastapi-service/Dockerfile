FROM python:3.13-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000

# --host 0.0.0.0: コンテナの外(=Node.jsのbackendコンテナ)からも接続できるようにする
# --reload: ファイル変更を検知して自動再起動する(nodemonのFastAPI版)
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]
