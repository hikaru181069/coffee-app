"""
知識グラフ関連のHTTP境界。ロジック本体は core/communityDetection.py に置き、
ここではリクエスト/レスポンスの変換だけを行う（CLAUDE.mdのfastapi-service
責務分割: routers=HTTP境界 / core=純粋ロジック）。
"""

from fastapi import APIRouter

from core.communityDetection import detect_communities
from schemas.graph import Community, CommunityDetectionRequest, CommunityDetectionResponse

router = APIRouter()


@router.post("/communities", response_model=CommunityDetectionResponse)
def detect_graph_communities(request: CommunityDetectionRequest) -> CommunityDetectionResponse:
    nodes = [node.model_dump() for node in request.nodes]
    edges = [edge.model_dump() for edge in request.edges]

    raw_communities = detect_communities(nodes, edges)

    communities = [
        Community(
            id=index,
            recordCount=community["recordCount"],
            dominantAttributes=community["dominantAttributes"],
            nodeIds=community["nodeIds"],
        )
        for index, community in enumerate(raw_communities)
    ]

    return CommunityDetectionResponse(communities=communities)
