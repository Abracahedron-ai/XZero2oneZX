from typing import Any, Dict, List, Optional
from datetime import datetime
from pydantic import BaseModel, Field, field_validator


class TransformCapabilities(BaseModel):
    maintain_offset: bool = Field(default=False, description="Preserve world offset when parenting or snapping.")
    supports_spaces: List[str] = Field(default_factory=list, description="Supported transform spaces.")
    snap_modes: List[str] = Field(default_factory=list, description="Supported snapping modes.")


class ToolCapabilities(BaseModel):
    transform: Optional[TransformCapabilities] = None


class ToolManifest(BaseModel):
    id: Optional[str] = None
    name: str
    tags: List[str] = Field(default_factory=list)
    description: Optional[str] = None
    capabilities: ToolCapabilities = Field(default_factory=ToolCapabilities)
    command_schema: Dict[str, Any] = Field(default_factory=dict)
    metadata: Dict[str, Any] = Field(default_factory=dict)


class ExecuteCommandPayload(BaseModel):
    transform: Optional[Dict[str, Any]] = None
    pivot: Optional[Dict[str, Any]] = None
    targetId: Optional[str] = Field(default=None, alias="target_id")
    options: Dict[str, Any] = Field(default_factory=dict)

    class Config:
        populate_by_name = True


class ExecuteCommand(BaseModel):
    tool_id: str
    selection: List[str] = Field(default_factory=list)
    payload: ExecuteCommandPayload = Field(default_factory=ExecuteCommandPayload)
    intent: Optional[str] = None
    context: Dict[str, Any] = Field(default_factory=dict)
    user_approved: bool = False


class MutationDelta(BaseModel):
    transform: Optional[Dict[str, Any]] = None
    pivot: Optional[Dict[str, Any]] = None
    parentId: Optional[str] = Field(default=None, alias="parent_id")
    snap: Optional[Dict[str, Any]] = None

    class Config:
        populate_by_name = True


class MutationRecord(BaseModel):
    id: str
    ts: datetime
    type: str
    before: MutationDelta
    after: MutationDelta
    selection: List[str]
    meta: Dict[str, Any] = Field(default_factory=dict)

    @field_validator("ts", mode="before")
    @classmethod
    def _parse_ts(cls, value):
        if isinstance(value, (int, float)):
            if value > 10_000_000_000:  # assume milliseconds
                return datetime.fromtimestamp(value / 1000.0)
            return datetime.fromtimestamp(value)
        return value


class MutationContext(BaseModel):
    selectionCount: int = Field(alias="selection_count")
    transformSpace: str = Field(alias="transform_space")
    snapMode: str = Field(alias="snap_mode")
    undoDepth: int = Field(alias="undo_depth")
    durationMs: float = Field(alias="duration_ms")

    class Config:
        populate_by_name = True


class MutationIngest(BaseModel):
    mutation: MutationRecord
    context: MutationContext
