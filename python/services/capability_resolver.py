from typing import List, Dict, Optional
from services.tool_registry import registry, Tool


class CapabilityResolver:
    """Filter tools based on current context (selection, scene state, app mode)"""

    def __init__(self):
        pass

    async def resolve(self, context: Dict, query: Optional[str] = None) -> List[Tool]:
        """
        Resolve tools that match the current context.
        
        Context structure:
        {
            "selection": {
                "type": "mesh" | "camera" | "light" | null,
                "count": 1,
                "name": "Cube.001"
            },
            "mode": "object" | "edit" | "sculpt",
            "scene": {
                "objects": 5,
                "frame": 1
            },
            "app": "blender" | "r3f" | "dashboard"
        }
        """
        
        # Extract predicates for matching
        filters = {}
        
        if context.get("selection"):
            filters["selection"] = context["selection"].get("type")
        
        if context.get("mode"):
            filters["mode"] = context["mode"]

        # Search registry with context filters
        tools = await registry.search_tools(context=filters, query=query, limit=50)

        # Score tools based on context match quality
        scored_tools = []
        for tool in tools:
            score = self._score_tool(tool, context)
            if score > 0:
                scored_tools.append((score, tool))

        # Sort by score (descending)
        scored_tools.sort(key=lambda x: x[0], reverse=True)

        # Return top tools
        return [tool for score, tool in scored_tools[:20]]

    def _score_tool(self, tool: Tool, context: Dict) -> float:
        """
        Score a tool based on how well it matches the context.
        Higher score = better match.
        """
        score = 0.0

        # Base score from usage count (popular tools get a boost)
        score += min(tool.usage_count * 0.01, 1.0)

        # Match context predicates
        predicates = tool.context_predicates or {}
        
        for key, expected_value in predicates.items():
            if key in context:
                if expected_value is None:
                    # Tool accepts any value for this key
                    score += 0.5
                elif context[key] == expected_value:
                    # Exact match
                    score += 2.0
                elif isinstance(context[key], dict) and isinstance(expected_value, dict):
                    # Nested match (e.g., selection.type)
                    nested_matches = sum(
                        1 for k, v in expected_value.items()
                        if context[key].get(k) == v
                    )
                    score += nested_matches * 1.5

        # Recency boost (recently used tools rank higher)
        if tool.last_used:
            from datetime import datetime, timedelta
            age = (datetime.now() - tool.last_used).total_seconds()
            if age < 3600:  # Used in last hour
                score += 1.0
            elif age < 86400:  # Used in last day
                score += 0.5

        return score

    async def get_by_category(self, category: str, context: Dict) -> List[Tool]:
        """Get tools for a specific radial menu category"""
        # Map category to tags
        category_tags = {
            "modeling": ["modeling", "3d", "geometry"],
            "ai": ["ai", "generation", "ml"],
            "rigging": ["rigging", "ik", "bones"],
            "animation": ["animation", "keyframe"],
            "rendering": ["render", "material", "shader"],
        }

        tags = category_tags.get(category, [category])
        
        # Search with tags and context
        tools = await registry.search_tools(tags=tags, context=context, limit=8)
        
        # Score and sort
        scored = [(self._score_tool(t, context), t) for t in tools]
        scored.sort(key=lambda x: x[0], reverse=True)
        
        return [t for _, t in scored]


# Singleton instance
resolver = CapabilityResolver()
