"""
POST /graph/communities の入出力スキーマ。

Expressが backend/core/graph/graphBuilder.js で組み立て済みのnodes/edges
（MongoDBの生データではない）をそのまま渡してくる前提。このサービスは
DBに一切依存しない（docs/architecture.md）。
"""

from pydantic import BaseModel


class GraphNode(BaseModel):
    id: str
    type: str
    label: str


class GraphEdge(BaseModel):
    source: str
    target: str


class CommunityDetectionRequest(BaseModel):
    nodes: list[GraphNode]
    edges: list[GraphEdge]


class Community(BaseModel):
    # 出現順（記録数の多い順）の連番。安定したノードIDではなく、
    # このレスポンス1回限りの表示用の番号。
    id: int
    recordCount: int
    # 種別ごとの代表ラベル（record型は含めない）。
    # 例: { "origin": ["Ethiopia"], "process": ["Washed"] }
    dominantAttributes: dict[str, list[str]]


class CommunityDetectionResponse(BaseModel):
    communities: list[Community]
