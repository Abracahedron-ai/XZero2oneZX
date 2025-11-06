"""
Ottomator Agent Ingestor

Scans EXPERIMENTAL/ottomator-agents/ directories and extracts metadata.
Generates standardized agent.yaml files for each agent.
"""

import os
import json
import yaml
from pathlib import Path
from typing import Dict, List, Optional, Any
import logging
from dataclasses import dataclass, asdict
import re


@dataclass
class AgentMetadata:
    """Agent metadata structure."""
    id: str
    name: str
    description: str
    type: str  # n8n | python | mcp
    inputs: List[str]
    outputs: List[str]
    tools: List[str]
    dependencies: List[str]
    runtime: Dict[str, Any]
    metadata: Dict[str, Any]


class OttomatorIngestor:
    """Ingests Ottomator agents and generates agent.yaml files."""
    
    def __init__(self, agents_dir: Path):
        self.agents_dir = agents_dir
        self.logger = logging.getLogger(__name__)
        self.agents: List[AgentMetadata] = []
    
    def scan_agents(self) -> List[AgentMetadata]:
        """Scan all agents in the directory."""
        if not self.agents_dir.exists():
            self.logger.error(f"Agents directory not found: {self.agents_dir}")
            return []
        
        agents = []
        
        for agent_dir in self.agents_dir.iterdir():
            if not agent_dir.is_dir() or agent_dir.name.startswith('.'):
                continue
            
            # Skip sample agents
            if agent_dir.name.startswith('~'):
                continue
            
            try:
                agent = self._parse_agent(agent_dir)
                if agent:
                    agents.append(agent)
                    self.logger.info(f"Parsed agent: {agent.name} ({agent.id})")
            except Exception as e:
                self.logger.error(f"Error parsing agent {agent_dir.name}: {e}")
        
        self.agents = agents
        return agents
    
    def _parse_agent(self, agent_dir: Path) -> Optional[AgentMetadata]:
        """Parse a single agent directory."""
        agent_id = agent_dir.name
        
        # Check for existing agent.yaml
        yaml_path = agent_dir / "agent.yaml"
        if yaml_path.exists():
            return self._load_yaml(agent_dir, yaml_path)
        
        # Try to infer from files
        return self._infer_metadata(agent_dir, agent_id)
    
    def _load_yaml(self, agent_dir: Path, yaml_path: Path) -> Optional[AgentMetadata]:
        """Load agent metadata from YAML file."""
        try:
            with open(yaml_path, 'r', encoding='utf-8') as f:
                data = yaml.safe_load(f)
            
            return AgentMetadata(
                id=data.get('id', agent_dir.name),
                name=data.get('name', agent_dir.name),
                description=data.get('description', ''),
                type=data.get('type', 'python'),
                inputs=data.get('inputs', []),
                outputs=data.get('outputs', []),
                tools=data.get('tools', []),
                dependencies=data.get('dependencies', []),
                runtime=data.get('runtime', {}),
                metadata=data.get('metadata', {})
            )
        except Exception as e:
            self.logger.error(f"Error loading YAML {yaml_path}: {e}")
            return None
    
    def _infer_metadata(self, agent_dir: Path, agent_id: str) -> Optional[AgentMetadata]:
        """Infer agent metadata from files."""
        # Detect agent type
        agent_type = self._detect_type(agent_dir)
        
        # Parse README
        readme = self._parse_readme(agent_dir)
        
        # Parse dependencies
        dependencies = self._parse_dependencies(agent_dir)
        
        # Parse tools/inputs/outputs
        tools = self._parse_tools(agent_dir)
        inputs, outputs = self._parse_io(agent_dir, agent_type)
        
        # Infer runtime requirements
        runtime = self._infer_runtime(agent_dir, agent_type)
        
        # Generate metadata
        return AgentMetadata(
            id=agent_id,
            name=readme.get('name', agent_id),
            description=readme.get('description', ''),
            type=agent_type,
            inputs=inputs,
            outputs=outputs,
            tools=tools,
            dependencies=dependencies,
            runtime=runtime,
            metadata={
                "source": f"ottomator-agents/{agent_id}",
                "license": readme.get('license', 'MIT'),
                "inferred": True
            }
        )
    
    def _detect_type(self, agent_dir: Path) -> str:
        """Detect agent type from files."""
        # Check for n8n workflow
        if any(f.name.endswith('.json') for f in agent_dir.iterdir()):
            json_files = [f for f in agent_dir.iterdir() if f.name.endswith('.json')]
            for json_file in json_files:
                try:
                    with open(json_file, 'r', encoding='utf-8') as f:
                        data = json.load(f)
                    if 'nodes' in data or 'workflow' in data:
                        return 'n8n'
                except:
                    pass
        
        # Check for Python files
        if any(f.name.endswith('.py') for f in agent_dir.iterdir()):
            return 'python'
        
        # Check for MCP files
        if any(f.name.endswith('.mcp') or 'mcp' in f.name.lower() for f in agent_dir.iterdir()):
            return 'mcp'
        
        return 'python'  # Default
    
    def _parse_readme(self, agent_dir: Path) -> Dict[str, str]:
        """Parse README file."""
        readme_files = [
            agent_dir / "README.md",
            agent_dir / "readme.md",
            agent_dir / "README.txt"
        ]
        
        for readme_file in readme_files:
            if readme_file.exists():
                try:
                    with open(readme_file, 'r', encoding='utf-8') as f:
                        content = f.read()
                    
                    # Extract name (first line or title)
                    name_match = re.search(r'^#\s+(.+)$', content, re.MULTILINE)
                    name = name_match.group(1) if name_match else agent_dir.name
                    
                    # Extract description (first paragraph)
                    desc_match = re.search(r'^#.*?\n\n(.+?)(?:\n\n|\n#)', content, re.DOTALL)
                    description = desc_match.group(1).strip() if desc_match else ''
                    
                    # Extract license
                    license_match = re.search(r'license[:\s]+([^\n]+)', content, re.IGNORECASE)
                    license = license_match.group(1).strip() if license_match else 'MIT'
                    
                    return {
                        "name": name,
                        "description": description,
                        "license": license
                    }
                except Exception as e:
                    self.logger.warning(f"Error parsing README {readme_file}: {e}")
        
        return {}
    
    def _parse_dependencies(self, agent_dir: Path) -> List[str]:
        """Parse dependencies from requirements.txt or pyproject.toml."""
        dependencies = []
        
        # Check requirements.txt
        req_file = agent_dir / "requirements.txt"
        if req_file.exists():
            try:
                with open(req_file, 'r', encoding='utf-8') as f:
                    for line in f:
                        line = line.strip()
                        if line and not line.startswith('#'):
                            dependencies.append(line)
            except Exception as e:
                self.logger.warning(f"Error parsing requirements.txt: {e}")
        
        # Check pyproject.toml
        pyproject_file = agent_dir / "pyproject.toml"
        if pyproject_file.exists():
            try:
                import tomli
                with open(pyproject_file, 'rb') as f:
                    data = tomli.load(f)
                deps = data.get('project', {}).get('dependencies', [])
                dependencies.extend(deps)
            except Exception as e:
                self.logger.warning(f"Error parsing pyproject.toml: {e}")
        
        return dependencies
    
    def _parse_tools(self, agent_dir: Path) -> List[str]:
        """Parse tools used by the agent."""
        tools = []
        
        # Check for tools directory
        tools_dir = agent_dir / "tools"
        if tools_dir.exists():
            for tool_file in tools_dir.glob("*.py"):
                tools.append(tool_file.stem)
        
        # Check for API documentation
        api_doc = agent_dir / "API_DOCUMENTATION.md"
        if api_doc.exists():
            try:
                with open(api_doc, 'r', encoding='utf-8') as f:
                    content = f.read()
                # Extract tool names from API docs
                tool_matches = re.findall(r'###\s+(\w+)', content)
                tools.extend(tool_matches)
            except Exception as e:
                self.logger.warning(f"Error parsing API docs: {e}")
        
        return list(set(tools))  # Remove duplicates
    
    def _parse_io(self, agent_dir: Path, agent_type: str) -> tuple[List[str], List[str]]:
        """Parse inputs and outputs."""
        inputs = []
        outputs = []
        
        if agent_type == 'n8n':
            # Parse n8n workflow JSON
            json_files = [f for f in agent_dir.iterdir() if f.name.endswith('.json')]
            for json_file in json_files:
                try:
                    with open(json_file, 'r', encoding='utf-8') as f:
                        data = json.load(f)
                    # Extract input/output nodes
                    nodes = data.get('nodes', [])
                    for node in nodes:
                        if node.get('type') == 'n8n-nodes-base.webhook':
                            inputs.append('webhook')
                        elif node.get('type') == 'n8n-nodes-base.httpResponse':
                            outputs.append('http_response')
                except:
                    pass
        
        elif agent_type == 'python':
            # Parse Python files for function signatures
            py_files = [f for f in agent_dir.iterdir() if f.name.endswith('.py')]
            for py_file in py_files:
                try:
                    with open(py_file, 'r', encoding='utf-8') as f:
                        content = f.read()
                    # Extract function parameters (simplified)
                    func_matches = re.findall(r'def\s+\w+\s*\(([^)]+)\)', content)
                    for params in func_matches:
                        param_list = [p.strip().split(':')[0] for p in params.split(',')]
                        inputs.extend(param_list)
                except:
                    pass
        
        return list(set(inputs)), list(set(outputs))
    
    def _infer_runtime(self, agent_dir: Path, agent_type: str) -> Dict[str, Any]:
        """Infer runtime requirements."""
        runtime = {
            "gpu": False,
            "memory": "512MB",
            "ports": []
        }
        
        # Check for GPU requirements
        if (agent_dir / "requirements.txt").exists():
            with open(agent_dir / "requirements.txt", 'r', encoding='utf-8') as f:
                content = f.read()
            if 'torch' in content or 'tensorflow' in content or 'cuda' in content:
                runtime["gpu"] = True
        
        # Check for Dockerfile
        if (agent_dir / "Dockerfile").exists():
            with open(agent_dir / "Dockerfile", 'r', encoding='utf-8') as f:
                content = f.read()
            if 'nvidia' in content.lower() or 'gpu' in content.lower():
                runtime["gpu"] = True
        
        # Infer port from agent type
        if agent_type == 'python':
            runtime["ports"] = [8001]  # Default FastAPI port
        
        return runtime
    
    def generate_yaml(self, agent: AgentMetadata, output_dir: Path):
        """Generate agent.yaml file."""
        yaml_path = output_dir / agent.id / "agent.yaml"
        yaml_path.parent.mkdir(parents=True, exist_ok=True)
        
        data = {
            "id": agent.id,
            "name": agent.name,
            "description": agent.description,
            "type": agent.type,
            "inputs": agent.inputs,
            "outputs": agent.outputs,
            "tools": agent.tools,
            "dependencies": agent.dependencies,
            "runtime": agent.runtime,
            "metadata": agent.metadata
        }
        
        with open(yaml_path, 'w', encoding='utf-8') as f:
            yaml.dump(data, f, default_flow_style=False, sort_keys=False)
        
        self.logger.info(f"Generated agent.yaml for {agent.name}")
    
    def ingest_all(self, output_dir: Optional[Path] = None):
        """Ingest all agents and generate YAML files."""
        agents = self.scan_agents()
        
        if output_dir:
            for agent in agents:
                self.generate_yaml(agent, output_dir)
        
        return agents


def main():
    """Main entry point."""
    import argparse
    
    parser = argparse.ArgumentParser(description='Ingest Ottomator agents')
    parser.add_argument(
        '--agents-dir',
        type=str,
        default='EXPERIMENTAL/ottomator-agents',
        help='Path to ottomator-agents directory'
    )
    parser.add_argument(
        '--output-dir',
        type=str,
        default=None,
        help='Output directory for generated YAML files'
    )
    
    args = parser.parse_args()
    
    ingestor = OttomatorIngestor(Path(args.agents_dir))
    agents = ingestor.ingest_all(output_dir=Path(args.output_dir) if args.output_dir else None)
    
    print(f"Ingested {len(agents)} agents")
    for agent in agents:
        print(f"  - {agent.name} ({agent.type})")


if __name__ == "__main__":
    main()


