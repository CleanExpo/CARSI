"""RAG pipeline API routes."""

from fastapi import APIRouter, UploadFile, File, Form, HTTPException, status
from typing import Optional
import base64

from src.rag.models import (
    PipelineConfig,
    SearchRequest,
    SearchResponse,
    SearchResult,
    SearchType,
)
from src.rag.pipeline import RAGPipeline
from src.rag.storage import RAGStore
from src.utils import get_logger
import time

logger = get_logger(__name__)
router = APIRouter(prefix="/rag", tags=["RAG"])

# Global instances (initialized on first use)
_pipeline: Optional[RAGPipeline] = None
_store: Optional[RAGStore] = None


async def get_pipeline() -> RAGPipeline:
    """Get initialized pipeline."""
    global _pipeline
    if _pipeline is None:
        _pipeline = RAGPipeline()
        await _pipeline.initialize()
    return _pipeline


async def get_store() -> RAGStore:
    """Get initialized store."""
    global _store
    if _store is None:
        _store = RAGStore()
        await _store.initialize()
    return _store


@router.post("/upload")
async def upload_document(
    file: UploadFile = File(...),
    project_id: str = Form(...),
    config: Optional[str] = Form(None),
    user_id: Optional[str] = Form(None),
) -> dict:
    """Upload and process a document."""
    try:
        # Read file
        content = await file.read()

        # Parse config
        pipeline_config = PipelineConfig()
        if config:
            import json

            config_dict = json.loads(config)
            pipeline_config = PipelineConfig(**config_dict)

        # Process through pipeline
        pipeline = await get_pipeline()
        source_id = await pipeline.process_document(
            content=content,
            mime_type=file.content_type or "text/plain",
            project_id=project_id,
            source_uri=file.filename or "upload",
            config=pipeline_config,
            user_id=user_id,
            metadata={"original_filename": file.filename},
        )

        return {
            "status": "success",
            "source_id": source_id,
            "message": "Document uploaded and processed",
        }

    except Exception as e:
        logger.error("Document upload failed", error=str(e))
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/search", response_model=SearchResponse)
async def search_documents(request: SearchRequest) -> SearchResponse:
    """Search documents using vector, keyword, or hybrid search."""
    try:
        start_time = time.time()

        store = await get_store()

        # Execute search based on type
        if request.search_type == SearchType.HYBRID:
            results = await store.hybrid_search(
                query=request.query,
                project_id=request.project_id,
                vector_weight=request.vector_weight,
                keyword_weight=request.keyword_weight,
                limit=request.limit,
                threshold=request.min_score,
            )
        elif request.search_type == SearchType.VECTOR:
            results = await store.vector_search(
                query=request.query,
                project_id=request.project_id,
                limit=request.limit,
                threshold=request.min_score,
            )
        else:
            raise HTTPException(
                status_code=400, detail="Keyword-only search not yet implemented"
            )

        execution_time = (time.time() - start_time) * 1000

        # Format results
        search_results = [
            SearchResult(
                chunk_id=r["chunk_id"],
                source_id=r.get("source_id", ""),
                content=r["content"],
                vector_score=r.get("vector_score", 0.0),
                keyword_score=r.get("keyword_score", 0.0),
                combined_score=r.get("combined_score", 0.0),
                rerank_score=None,
                metadata=r.get("metadata", {}),
                heading_hierarchy=r.get("heading_hierarchy", []),
                summary=r.get("summary"),
            )
            for r in results
        ]

        return SearchResponse(
            query=request.query,
            results=search_results,
            total_count=len(search_results),
            search_type=request.search_type,
            execution_time_ms=execution_time,
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error("Search failed", error=str(e))
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/sources/{source_id}")
async def get_source(source_id: str) -> dict:
    """Get document source details."""
    store = await get_store()

    result = store.client.table("document_sources").select("*").eq("id", source_id).execute()

    if not result.data:
        raise HTTPException(status_code=404, detail="Source not found")

    return result.data[0]
