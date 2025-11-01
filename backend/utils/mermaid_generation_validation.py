"""Utilities for generating and validating Mermaid diagrams."""

from __future__ import annotations

import logging
import os
from typing import Optional, Tuple

import httpx

from clients import open_router_client


class MermaidGenerationValidator:
    """Generate and validate Mermaid diagrams with LLM support."""

    def __init__(self, logger: Optional[logging.Logger] = None) -> None:
        """Initialize the validator with an optional logger."""

        self.logger = logger or logging.getLogger(__name__)

    def generate_mermaid_diagram(
        self, cursory_explanation: str, max_iterations: int = 10
    ) -> Tuple[str, bool]:
        """Iteratively generate and validate Mermaid diagrams."""

        previous_error_code: Optional[str] = None
        for iteration in range(1, max_iterations + 1):
            self.logger.info(
                "Mermaid validation iteration %s/%s", iteration, max_iterations
            )

            project_diagram = self._generate_diagram_from_llm(
                cursory_explanation, previous_error_code
            )

            if project_diagram.startswith("Error:"):
                self.logger.error("Diagram generation failed: %s", project_diagram)
                return (project_diagram, False)

            _, error_message = self._validate_mermaid_code(project_diagram)

            if error_message is None or "error" not in error_message.lower():
                self.logger.info(
                    "Mermaid diagram validated successfully after %s iteration(s)",
                    iteration,
                )
                return (project_diagram, True)

            self.logger.warning(
                "Iteration %s: Mermaid validation failed: %s",
                iteration,
                error_message,
            )
            previous_error_code = self._build_error_context(
                project_diagram, error_message, previous_error_code
            )

        self.logger.warning(
            "Mermaid validation failed after %s iterations. Returning last diagram.",
            max_iterations,
        )
        return (project_diagram, False)

    def _generate_diagram_from_llm(
        self, cursory_explanation: str, previous_error_code: Optional[str]
    ) -> str:
        """Generate a Mermaid diagram using the LLM."""

        try:
            diagram_prompt = self._build_diagram_prompt(
                cursory_explanation, previous_error_code
            )

            diagram_response = open_router_client.chat.completions.create(
                model="anthropic/claude-3.7-sonnet",
                messages=[
                    {
                        "role": "system",
                        "content": (
                            "You are an expert in creating Mermaid diagrams for software "
                            "architecture. Focus on clear, logical data flow diagrams with "
                            "excellent visual design. Always use step numbers, high-contrast "
                            "colors, and clear visual hierarchy. Make diagrams that are "
                            "immediately understandable to both technical and non-technical "
                            "audiences. Use the specified color scheme and styling "
                            "requirements to create professional, readable diagrams."
                        ),
                    },
                    {"role": "user", "content": diagram_prompt},
                ],
                name="Mermaid Diagram Generator loop",
                max_tokens=20_000,
            )

            project_diagram = diagram_response.choices[0].message.content.strip()
            return self._cleanup_mermaid_response(project_diagram)
        except Exception as exc:
            return f"Error: {exc}"

    def _validate_mermaid_code(self, mermaid_code: str) -> Tuple[bool, Optional[str]]:
        """Validate Mermaid diagram syntax via the frontend validation API."""

        try:
            frontend_url = os.getenv("FRONTEND_BASE_URL")
            validation_url = f"{frontend_url}/api/mermaid/validate"
            self.logger.info("Validating Mermaid diagram via %s", validation_url)

            with httpx.Client(timeout=30.0) as client:
                response = client.post(
                    validation_url,
                    json={"mermaidCode": mermaid_code},
                    headers={"Content-Type": "application/json"},
                )

            if response.status_code == 200:
                result = response.json()
                is_valid = result.get("isValid", False)
                error_message = result.get("error") if not is_valid else None
                return (is_valid, error_message)

            self.logger.warning(
                "Validation API returned status %s: %s",
                response.status_code,
                response.text,
            )
            return (True, None)
        except httpx.RequestError as exc:
            self.logger.error("Error connecting to validation API: %s", exc)
            return (True, None)
        except Exception as exc:
            self.logger.error("Unexpected error during validation: %s", exc)
            return (True, None)

    def _build_diagram_prompt(
        self, cursory_explanation: str, previous_error_code: Optional[str]
    ) -> str:
        """Build the prompt used to request Mermaid diagrams from the LLM."""

        error_context = self._format_error_context(previous_error_code)
        return f"""Based on the following project structure and file descriptions, create a Mermaid diagram showing the data flow and component interactions. Focus on the logical flow of data through the system.
{error_context}Project Structure and File Roles:
{cursory_explanation}

Analyze the project structure and create a Mermaid flowchart that shows:

1. **Main Components**: Identify key modules, services, or layers
2. **Data Flow**: Show how data moves between components
3. **External Interfaces**: Show any external APIs, databases, or user interfaces
4. **Processing Flow**: Show the main processing pipeline
5. **Technical Details**: Assume the user is very technical and show the technical details of the project

**IMPORTANT STYLING REQUIREMENTS:**
- Use high-contrast colors for maximum readability
- Add step numbers to show process flow sequence
- Use descriptive labels that are easy to understand
- Apply visual hierarchy with different node shapes and colors
- Make the diagram clean and professional

**Color Scheme:**
- User Interface: Light blue (#E1F5FE) with dark text
- Business Logic/Services: Light green (#E8F5E8) with dark text
- Data Processing: Light yellow (#FFFDE7) with dark text
- Database/Storage: Light purple (#F3E5F5) with dark text
- External APIs: Light orange (#FFE0B2) with dark text
- Start/Entry points: Light cyan (#E0F2F1) with dark text

**Node Shapes:**
- Use rectangles [Node] for components
- Use rounded rectangles [Node] for user interfaces
- Use cylinders [(Database)] for data storage
- Use hexagons {{Node}} for processing steps
- Use diamonds {{Node}} for decision points

Provide only the Mermaid diagram code, properly formatted and functional with enhanced styling."""

    def _cleanup_mermaid_response(self, project_diagram: str) -> str:
        """Remove Markdown code fences from Mermaid responses."""

        if project_diagram.startswith("```mermaid"):
            return project_diagram.replace("```mermaid", "").replace("```", "").strip()
        if project_diagram.startswith("```"):
            return project_diagram.replace("```", "").strip()
        return project_diagram

    def _build_error_context(
        self,
        project_diagram: str,
        error_message: str,
        previous_error_code: Optional[str],
    ) -> str:
        """Compose contextual error feedback for subsequent LLM attempts."""

        if previous_error_code:
            return (
                f"Mermaid code: ```{project_diagram}```\n\nError message: ```{error_message}```\n\n"
                f"--------------------------------\nPrevious error code: ```{previous_error_code}```"
            )
        return f"Mermaid code: ```{project_diagram}```\n\nError message: ```{error_message}```"

    def _format_error_context(self, previous_error_code: Optional[str]) -> str:
        """Format prior errors into the LLM prompt when available."""

        if not previous_error_code:
            return ""

        wrong_example = (
            "Wrong example\n```mermaid\n"
            "graph TD\n"
            "%% Define styles for high contrast and readability\n"
            "classDef userInterface fill:#E1F5FE,stroke:#01579B,stroke-width:2px,color:#000\n"
            "classDef serviceLayer fill:#E8F5E8,stroke:#2E7D32,stroke-width:2px,color:#000\n"
            "classDef dataProcessing fill:#FFFDE7,stroke:#F57C00,stroke-width:2px,color:#000\n"
            "classDef database fill:#F3E5F5,stroke:#4A148C,stroke-width:2px,color:#000\n"
            "classDef externalAPI fill:#FFE0B2,stroke:#E65100,stroke-width:2px,color:#000\n\n"
            "%% Start point with step number\n"
            "A[1. User Interface index.html] -->|Input Data| B[2. Input Processing (script.js)]\n"
            "B -->|Compose Payload| C{{3. Invoke Scheduler}}\n"
            "C -->|POST /run_scheduler| D[4. Backend Server (server.js)]\n"
            "D -->|Spawns CPU Scheduler| E{{5. CPU Scheduler (cpu_scheduler.cpp)}}\n"
            "E -->|Processes Scheduling| F((6. Output Results))\n"
            "F -->|Return to Client| G[7. Display Results in UI]\n\n"
            "%% Styles\n"
            "class A userInterface\n"
            "class B dataProcessing\n"
            "class C dataProcessing\n"
            "class D serviceLayer\n"
            "class E dataProcessing\n"
            "class F database\n"
            "class G userInterface\n```"
        )

        errors_example = (
            "Errors example\n```\n"
            "A[1. User Interface (index.html)] will give error because of ()\n"
            "B[2. Input Processing (script.js)] will give error because of ()\n"
            "D[4. Backend Server (server.js)] will give error because of ()\n"
            "E{{5. CPU Scheduler (cpu_scheduler.cpp)}} will give error because of ()\n```"
        )

        correct_example = (
            "Correct example\n```mermaid\n"
            "graph TD\n"
            "%% Define styles for high contrast and readability\n"
            "classDef userInterface fill:#E1F5FE,stroke:#01579B,stroke-width:2px,color:#000\n"
            "classDef serviceLayer fill:#E8F5E8,stroke:#2E7D32,stroke-width:2px,color:#000\n"
            "classDef dataProcessing fill:#FFFDE7,stroke:#F57C00,stroke-width:2px,color:#000\n"
            "classDef database fill:#F3E5F5,stroke:#4A148C,stroke-width:2px,color:#000\n"
            "classDef externalAPI fill:#FFE0B2,stroke:#E65100,stroke-width:2px,color:#000\n\n"
            "%% Start point with step number\n"
            "A[1. User Interface index.html] -->|Input Data| B[2. Input Processing script.js]\n"
            "B -->|Compose Payload| C{{3. Invoke Scheduler}}\n"
            "C -->|POST /run_scheduler| D[4. Backend Server server.js]\n"
            "D -->|Spawns CPU Scheduler| E{{5. CPU Scheduler cpu_scheduler.cpp}}\n"
            "E -->|Processes Scheduling| F((6. Output Results))\n"
            "F -->|Return to Client| G[7. Display Results in UI]\n\n"
            "%% Styles\n"
            "class A userInterface\n"
            "class B dataProcessing\n"
            "class C dataProcessing\n"
            "class D serviceLayer\n"
            "class E dataProcessing\n"
            "class F database\n"
            "class G userInterface\n```"
        )

        return (
            "**PREVIOUS ATTEMPTS MERMAID CODE AND VALIDATION ERROR:**\n"
            f"{previous_error_code}\n\n"
            "Example \n\n"
            f"{wrong_example}\n\n"
            f"{errors_example}\n\n"
            f"{correct_example}\n"
        )
