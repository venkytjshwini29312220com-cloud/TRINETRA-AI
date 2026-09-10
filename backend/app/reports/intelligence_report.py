"""
TRINETRA Intelligence Report
============================

Builds structured intelligence reports from investigation data.

Responsibilities
----------------
- Assemble investigation information
- Include graph/analytics findings
- Include risk signals
- Include investigation actions
- Include case memory
- Produce a structured report dictionary
- Keep analytical observations separate from conclusions

This module does NOT:
- Modify the graph
- Perform NLP extraction
- Determine guilt
- Automatically make legal conclusions
"""

from __future__ import annotations

from dataclasses import asdict, dataclass, field
from datetime import datetime, timezone
from typing import Any

from app.analytics.risk_engine import RiskAssessment, RiskEngine
from app.graph.neo4j_client import Neo4jClient
from app.investigations.action_manager import (
    InvestigationActionManager,
)
from app.investigations.case_memory import CaseMemory
from app.investigations.investigation_store import (
    InvestigationStore,
)


# ============================================================
# REPORT SECTION
# ============================================================


@dataclass
class ReportSection:
    """
    A section of the intelligence report.
    """

    title: str

    content: Any

    section_type: str = "general"

    metadata: dict[str, Any] = field(
        default_factory=dict
    )

    def to_dict(self) -> dict[str, Any]:
        """
        Convert section to dictionary.
        """

        return {
            "title": self.title,
            "content": self.content,
            "section_type": self.section_type,
            "metadata": self.metadata,
        }


# ============================================================
# INTELLIGENCE REPORT
# ============================================================


@dataclass
class IntelligenceReport:
    """
    Complete structured intelligence report.
    """

    report_id: str

    investigation_id: int

    case_id: int | None

    title: str

    generated_at: str

    status: str

    sections: list[ReportSection] = field(
        default_factory=list
    )

    risk_assessment: dict[str, Any] | None = None

    executive_summary: str = ""

    limitations: list[str] = field(
        default_factory=list
    )

    disclaimer: str = (
        "This report contains analytical and investigative "
        "information. Analytical signals do not constitute "
        "a determination of guilt or criminal responsibility."
    )

    def to_dict(self) -> dict[str, Any]:
        """
        Convert the report into an API-friendly dictionary.
        """

        return {
            "report_id": self.report_id,
            "investigation_id": self.investigation_id,
            "case_id": self.case_id,
            "title": self.title,
            "generated_at": self.generated_at,
            "status": self.status,
            "executive_summary": self.executive_summary,
            "sections": [
                section.to_dict()
                for section in self.sections
            ],
            "risk_assessment": self.risk_assessment,
            "limitations": self.limitations,
            "disclaimer": self.disclaimer,
        }


# ============================================================
# REPORT GENERATOR
# ============================================================


class IntelligenceReportGenerator:
    """
    Generates structured intelligence reports.
    """

    def __init__(
        self,
        session,
        neo4j_client: Neo4jClient | None = None,
    ) -> None:

        self.session = session

        self.investigation_store = (
            InvestigationStore(
                session
            )
        )

        self.action_manager = (
            InvestigationActionManager(
                session
            )
        )

        self.case_memory = CaseMemory(
            session
        )

        self.neo4j_client = neo4j_client

        self.risk_engine = (
            RiskEngine(
                neo4j_client
            )
            if neo4j_client is not None
            else None
        )

    # ========================================================
    # GENERATE
    # ========================================================

    def generate(
        self,
        investigation_id: int,
        include_actions: bool = True,
        include_memory: bool = True,
        include_risk: bool = True,
    ) -> IntelligenceReport:
        """
        Generate an intelligence report for an investigation.
        """

        investigation = (
            self.investigation_store.get_by_id(
                investigation_id
            )
        )

        if investigation is None:
            raise ValueError(
                "Investigation not found."
            )

        report_id = self._build_report_id(
            investigation_id
        )

        sections: list[
            ReportSection
        ] = []

        # ----------------------------------------------------
        # INVESTIGATION OVERVIEW
        # ----------------------------------------------------

        sections.append(
            ReportSection(
                title="Investigation Overview",
                section_type="overview",
                content=self._investigation_overview(
                    investigation
                ),
            )
        )

        # ----------------------------------------------------
        # ACTIONS
        # ----------------------------------------------------

        if include_actions:

            actions = (
                self.action_manager.list_actions(
                    investigation_id
                )
            )

            sections.append(
                ReportSection(
                    title="Investigation Actions",
                    section_type="actions",
                    content=actions,
                    metadata={
                        "count": len(actions)
                    },
                )
            )

        # ----------------------------------------------------
        # CASE MEMORY
        # ----------------------------------------------------

        if include_memory:

            memory = (
                self.case_memory.get_context(
                    investigation_id,
                    limit=100,
                )
            )

            sections.append(
                ReportSection(
                    title="Case Memory",
                    section_type="memory",
                    content=memory,
                    metadata={
                        "count": len(memory)
                    },
                )
            )

        # ----------------------------------------------------
        # RISK ASSESSMENT
        # ----------------------------------------------------

        risk_assessment = None

        if (
            include_risk
            and self.risk_engine is not None
        ):

            risk_assessment = (
                self._generate_risk_assessment(
                    investigation
                )
            )

            if risk_assessment is not None:

                sections.append(
                    ReportSection(
                        title="Analytical Priority Assessment",
                        section_type="risk",
                        content=(
                            risk_assessment.to_dict()
                        ),
                    )
                )

        # ----------------------------------------------------
        # GRAPH INFORMATION
        # ----------------------------------------------------

        if self.neo4j_client is not None:

            graph_section = (
                self._build_graph_section(
                    investigation
                )
            )

            if graph_section is not None:
                sections.append(
                    graph_section
                )

        # ----------------------------------------------------
        # EXECUTIVE SUMMARY
        # ----------------------------------------------------

        executive_summary = (
            self._build_executive_summary(
                investigation=investigation,
                sections=sections,
                risk_assessment=risk_assessment,
            )
        )

        # ----------------------------------------------------
        # LIMITATIONS
        # ----------------------------------------------------

        limitations = (
            self._build_limitations(
                include_risk=include_risk,
                neo4j_available=(
                    self.neo4j_client is not None
                ),
            )
        )

        return IntelligenceReport(
            report_id=report_id,
            investigation_id=investigation_id,
            case_id=getattr(
                investigation,
                "case_id",
                None,
            ),
            title=(
                f"Intelligence Report — "
                f"{getattr(investigation, 'title', 'Investigation')}"
            ),
            generated_at=self._now(),
            status="generated",
            sections=sections,
            risk_assessment=(
                risk_assessment.to_dict()
                if risk_assessment is not None
                else None
            ),
            executive_summary=executive_summary,
            limitations=limitations,
        )

    # ========================================================
    # OVERVIEW
    # ========================================================

    @staticmethod
    def _investigation_overview(
        investigation,
    ) -> dict[str, Any]:
        """
        Build the investigation overview.
        """

        return {
            "investigation_id": getattr(
                investigation,
                "id",
                None,
            ),
            "case_id": getattr(
                investigation,
                "case_id",
                None,
            ),
            "title": getattr(
                investigation,
                "title",
                None,
            ),
            "description": getattr(
                investigation,
                "description",
                None,
            ),
            "status": getattr(
                investigation,
                "status",
                None,
            ),
            "created_at": (
                str(
                    getattr(
                        investigation,
                        "created_at",
                        None,
                    )
                )
            ),
            "updated_at": (
                str(
                    getattr(
                        investigation,
                        "updated_at",
                        None,
                    )
                )
            ),
        }

    # ========================================================
    # RISK
    # ========================================================

    def _generate_risk_assessment(
        self,
        investigation,
    ) -> RiskAssessment | None:
        """
        Generate a risk/priority assessment when the
        investigation is connected to a usable graph entity.
        """

        if self.risk_engine is None:
            return None

        metadata = (
            getattr(
                investigation,
                "metadata",
                None,
            )
            or {}
        )

        entity_type = metadata.get(
            "primary_entity_type"
        )

        entity_value = metadata.get(
            "primary_entity_value"
        )

        if not entity_type or not entity_value:
            return None

        return self.risk_engine.assess_entity(
            entity_type=entity_type,
            value=entity_value,
        )

    # ========================================================
    # GRAPH SECTION
    # ========================================================

    def _build_graph_section(
        self,
        investigation,
    ) -> ReportSection | None:
        """
        Build a graph-analysis section if a primary entity
        is associated with the investigation.
        """

        metadata = (
            getattr(
                investigation,
                "metadata",
                None,
            )
            or {}
        )

        entity_type = metadata.get(
            "primary_entity_type"
        )

        entity_value = metadata.get(
            "primary_entity_value"
        )

        if not entity_type or not entity_value:
            return None

        try:

            query = """
            MATCH (n:Entity)
            WHERE n.entity_type = $entity_type
              AND n.normalized_value = $normalized_value

            OPTIONAL MATCH (n)-[r]-(neighbor)

            RETURN
                n.entity_type AS entity_type,
                n.value AS value,
                count(DISTINCT neighbor) AS neighbor_count,
                count(DISTINCT r) AS relationship_count
            """

            records = (
                self.neo4j_client.execute_read(
                    query,
                    {
                        "entity_type": entity_type,
                        "normalized_value": (
                            str(
                                entity_value
                            )
                            .strip()
                            .lower()
                        ),
                    },
                )
            )

            if not records:
                return None

            record = dict(
                records[0]
            )

            return ReportSection(
                title="Graph Overview",
                section_type="graph",
                content=record,
            )

        except Exception as exc:
            return ReportSection(
                title="Graph Overview",
                section_type="graph",
                content={
                    "available": False,
                    "error": str(exc),
                },
                metadata={
                    "status": "unavailable"
                },
            )

    # ========================================================
    # EXECUTIVE SUMMARY
    # ========================================================

    @staticmethod
    def _build_executive_summary(
        investigation,
        sections: list[ReportSection],
        risk_assessment: RiskAssessment | None,
    ) -> str:
        """
        Build a concise executive summary from structured data.
        """

        title = getattr(
            investigation,
            "title",
            "Investigation",
        )

        status = getattr(
            investigation,
            "status",
            "unknown",
        )

        summary = (
            f"Investigation '{title}' is currently "
            f"marked as {status}."
        )

        if risk_assessment is not None:

            summary += (
                f" The analytical priority score is "
                f"{risk_assessment.score:.2f}, "
                f"classified as "
                f"{risk_assessment.level}."
            )

        action_section = next(
            (
                section
                for section in sections
                if section.section_type
                == "actions"
            ),
            None,
        )

        if action_section is not None:

            action_count = len(
                action_section.content
            )

            summary += (
                f" {action_count} investigation "
                "action(s) are recorded."
            )

        memory_section = next(
            (
                section
                for section in sections
                if section.section_type
                == "memory"
            ),
            None,
        )

        if memory_section is not None:

            memory_count = len(
                memory_section.content
            )

            summary += (
                f" {memory_count} case-memory "
                "entry/entries are available."
            )

        return summary

    # ========================================================
    # LIMITATIONS
    # ========================================================

    @staticmethod
    def _build_limitations(
        include_risk: bool,
        neo4j_available: bool,
    ) -> list[str]:
        """
        Describe limitations of the generated report.
        """

        limitations = [
            (
                "The report reflects information available "
                "at generation time."
            ),
            (
                "Analytical similarity, pattern, and priority "
                "signals require human review."
            ),
            (
                "Absence of a relationship in the current "
                "graph does not establish that the relationship "
                "does not exist."
            ),
            (
                "Source data quality and completeness may "
                "affect analytical results."
            ),
        ]

        if include_risk:
            limitations.append(
                (
                    "Priority scores are analytical signals "
                    "and are not determinations of guilt."
                )
            )

        if not neo4j_available:
            limitations.append(
                (
                    "Neo4j was not available during report "
                    "generation, so graph-dependent sections "
                    "may be absent."
                )
            )

        return limitations

    # ========================================================
    # REPORT ID
    # ========================================================

    @staticmethod
    def _build_report_id(
        investigation_id: int,
    ) -> str:
        """
        Generate a deterministic report identifier for the
        current generation.
        """

        timestamp = datetime.now(
            timezone.utc
        ).strftime(
            "%Y%m%d%H%M%S"
        )

        return (
            f"IR-{investigation_id}-"
            f"{timestamp}"
        )

    # ========================================================
    # TIMESTAMP
    # ========================================================

    @staticmethod
    def _now() -> str:
        """
        Return current UTC timestamp.
        """

        return datetime.now(
            timezone.utc
        ).isoformat()


# ============================================================
# CONVENIENCE FUNCTION
# ============================================================


def generate_intelligence_report(
    session,
    investigation_id: int,
    neo4j_client: Neo4jClient | None = None,
) -> IntelligenceReport:
    """
    Convenience wrapper for report generation.
    """

    generator = IntelligenceReportGenerator(
        session=session,
        neo4j_client=neo4j_client,
    )

    return generator.generate(
        investigation_id=investigation_id
    )