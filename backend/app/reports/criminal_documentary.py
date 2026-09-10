"""
TRINETRA Criminal Documentary
=============================

Builds a chronological, evidence-grounded narrative from
structured investigation data.

Responsibilities
----------------
- Organize investigation events chronologically
- Convert case memory into narrative sections
- Include investigation actions and results
- Include analytical observations
- Clearly separate facts from analytical interpretation
- Produce a documentary-style structured output

This module does NOT:
- Invent events
- Determine guilt
- Create fictional evidence
- Replace investigator judgment
- Modify database or graph data
"""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any

from app.investigations.action_manager import (
    InvestigationActionManager,
)
from app.investigations.case_memory import CaseMemory
from app.investigations.investigation_store import (
    InvestigationStore,
)


# ============================================================
# DOCUMENTARY EVENT
# ============================================================


@dataclass
class DocumentaryEvent:
    """
    One chronological event in the documentary.
    """

    event_id: str

    timestamp: str | None

    event_type: str

    title: str

    description: str

    source: str | None = None

    evidentiary_status: str = "documented"

    metadata: dict[str, Any] = field(
        default_factory=dict
    )

    def to_dict(self) -> dict[str, Any]:
        """
        Convert event to dictionary.
        """

        return {
            "event_id": self.event_id,
            "timestamp": self.timestamp,
            "event_type": self.event_type,
            "title": self.title,
            "description": self.description,
            "source": self.source,
            "evidentiary_status": (
                self.evidentiary_status
            ),
            "metadata": self.metadata,
        }


# ============================================================
# DOCUMENTARY
# ============================================================


@dataclass
class CriminalDocumentary:
    """
    Complete documentary-style investigation report.
    """

    documentary_id: str

    investigation_id: int

    case_id: int | None

    title: str

    generated_at: str

    introduction: str

    timeline: list[DocumentaryEvent] = field(
        default_factory=list
    )

    findings: list[dict[str, Any]] = field(
        default_factory=list
    )

    analytical_observations: list[
        dict[str, Any]
    ] = field(
        default_factory=list
    )

    unresolved_questions: list[str] = field(
        default_factory=list
    )

    conclusion: str = ""

    disclaimer: str = (
        "This documentary is generated from available "
        "investigative information. Narrative presentation "
        "does not establish guilt, intent, or criminal "
        "responsibility."
    )

    def to_dict(self) -> dict[str, Any]:
        """
        Convert documentary to API-friendly dictionary.
        """

        return {
            "documentary_id": self.documentary_id,
            "investigation_id": self.investigation_id,
            "case_id": self.case_id,
            "title": self.title,
            "generated_at": self.generated_at,
            "introduction": self.introduction,
            "timeline": [
                event.to_dict()
                for event in self.timeline
            ],
            "findings": self.findings,
            "analytical_observations": (
                self.analytical_observations
            ),
            "unresolved_questions": (
                self.unresolved_questions
            ),
            "conclusion": self.conclusion,
            "disclaimer": self.disclaimer,
        }


# ============================================================
# DOCUMENTARY GENERATOR
# ============================================================


class CriminalDocumentaryGenerator:
    """
    Generates an evidence-grounded documentary from an
    investigation.
    """

    def __init__(
        self,
        session,
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

    # ========================================================
    # GENERATE
    # ========================================================

    def generate(
        self,
        investigation_id: int,
        include_actions: bool = True,
        include_notes: bool = True,
    ) -> CriminalDocumentary:
        """
        Generate a documentary representation of an
        investigation.
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

        documentary_id = (
            self._build_documentary_id(
                investigation_id
            )
        )

        memory = (
            self.case_memory.list(
                investigation_id=investigation_id,
                limit=500,
            )
        )

        timeline = self._build_memory_timeline(
            memory
        )

        if include_actions:

            actions = (
                self.action_manager.list_actions(
                    investigation_id
                )
            )

            timeline.extend(
                self._build_action_timeline(
                    actions
                )
            )

        timeline.sort(
            key=self._timeline_sort_key
        )

        findings = (
            self._extract_findings(
                memory
            )
        )

        analytical_observations = (
            self._extract_analytical_observations(
                memory
            )
        )

        unresolved_questions = (
            self._build_unresolved_questions(
                memory=memory,
                actions=(
                    actions
                    if include_actions
                    else []
                ),
            )
        )

        introduction = (
            self._build_introduction(
                investigation
            )
        )

        conclusion = (
            self._build_conclusion(
                investigation=investigation,
                timeline=timeline,
                findings=findings,
                analytical_observations=(
                    analytical_observations
                ),
                unresolved_questions=(
                    unresolved_questions
                ),
            )
        )

        if not include_notes:

            timeline = [
                event
                for event in timeline
                if event.event_type
                not in {
                    "note",
                    "observation",
                }
            ]

        return CriminalDocumentary(
            documentary_id=documentary_id,
            investigation_id=investigation_id,
            case_id=getattr(
                investigation,
                "case_id",
                None,
            ),
            title=(
                f"Investigation Documentary — "
                f"{getattr(investigation, 'title', 'Investigation')}"
            ),
            generated_at=self._now(),
            introduction=introduction,
            timeline=timeline,
            findings=findings,
            analytical_observations=(
                analytical_observations
            ),
            unresolved_questions=(
                unresolved_questions
            ),
            conclusion=conclusion,
        )

    # ========================================================
    # MEMORY → TIMELINE
    # ========================================================

    @staticmethod
    def _build_memory_timeline(
        memory: list[dict[str, Any]],
    ) -> list[DocumentaryEvent]:
        """
        Convert case-memory entries into documentary events.
        """

        events: list[
            DocumentaryEvent
        ] = []

        for entry in memory:

            memory_id = entry.get(
                "id"
            )

            memory_type = entry.get(
                "type",
                "note",
            )

            title = (
                entry.get("title")
                or memory_type.replace(
                    "_",
                    " ",
                ).title()
            )

            content = str(
                entry.get(
                    "content",
                    "",
                )
            ).strip()

            if not content:
                continue

            evidentiary_status = (
                CriminalDocumentaryGenerator
                ._memory_evidentiary_status(
                    memory_type
                )
            )

            events.append(
                DocumentaryEvent(
                    event_id=(
                        f"memory-{memory_id}"
                    ),
                    timestamp=entry.get(
                        "created_at"
                    ),
                    event_type=memory_type,
                    title=title,
                    description=content,
                    source=entry.get(
                        "source"
                    ),
                    evidentiary_status=(
                        evidentiary_status
                    ),
                    metadata=(
                        entry.get(
                            "metadata"
                        )
                        or {}
                    ),
                )
            )

        return events

    # ========================================================
    # ACTION → TIMELINE
    # ========================================================

    @staticmethod
    def _build_action_timeline(
        actions: list[dict[str, Any]],
    ) -> list[DocumentaryEvent]:
        """
        Convert investigation actions into documentary events.
        """

        events: list[
            DocumentaryEvent
        ] = []

        for action in actions:

            action_id = action.get(
                "id"
            )

            title = (
                action.get("title")
                or "Investigation Action"
            )

            description = (
                action.get("description")
                or ""
            )

            status = action.get(
                "status",
                "pending",
            )

            result = action.get(
                "result"
            )

            if result is not None:

                description = (
                    f"{description} "
                    f"Result: {result}"
                ).strip()

            if not description:

                description = (
                    f"Investigation action "
                    f"status: {status}."
                )

            timestamp = (
                action.get("completed_at")
                or action.get("started_at")
                or action.get("created_at")
            )

            events.append(
                DocumentaryEvent(
                    event_id=(
                        f"action-{action_id}"
                    ),
                    timestamp=timestamp,
                    event_type="action",
                    title=title,
                    description=description,
                    source=(
                        action.get(
                            "assigned_to"
                        )
                    ),
                    evidentiary_status=(
                        "investigative_activity"
                    ),
                    metadata={
                        "action_id": action_id,
                        "status": status,
                        "priority": action.get(
                            "priority"
                        ),
                        "action_type": action.get(
                            "action_type"
                        ),
                    },
                )
            )

        return events

    # ========================================================
    # FINDINGS
    # ========================================================

    @staticmethod
    def _extract_findings(
        memory: list[dict[str, Any]],
    ) -> list[dict[str, Any]]:
        """
        Extract documented findings from case memory.
        """

        findings = []

        for entry in memory:

            if entry.get("type") != "finding":
                continue

            findings.append(
                {
                    "id": entry.get(
                        "id"
                    ),
                    "title": entry.get(
                        "title"
                    ),
                    "content": entry.get(
                        "content"
                    ),
                    "source": entry.get(
                        "source"
                    ),
                    "created_at": entry.get(
                        "created_at"
                    ),
                    "metadata": (
                        entry.get(
                            "metadata"
                        )
                        or {}
                    ),
                }
            )

        return findings

    # ========================================================
    # ANALYTICAL OBSERVATIONS
    # ========================================================

    @staticmethod
    def _extract_analytical_observations(
        memory: list[dict[str, Any]],
    ) -> list[dict[str, Any]]:
        """
        Extract analytical observations.

        These are intentionally kept separate from findings
        because an analytical signal is not automatically a
        verified fact.
        """

        analytical_types = {
            "analysis",
            "relationship_review",
            "entity_review",
            "evidence_review",
        }

        observations = []

        for entry in memory:

            if entry.get("type") not in analytical_types:
                continue

            observations.append(
                {
                    "id": entry.get(
                        "id"
                    ),
                    "type": entry.get(
                        "type"
                    ),
                    "title": entry.get(
                        "title"
                    ),
                    "content": entry.get(
                        "content"
                    ),
                    "source": entry.get(
                        "source"
                    ),
                    "created_at": entry.get(
                        "created_at"
                    ),
                    "metadata": (
                        entry.get(
                            "metadata"
                        )
                        or {}
                    ),
                    "interpretation_status": (
                        "analytical_observation"
                    ),
                }
            )

        return observations

    # ========================================================
    # UNRESOLVED QUESTIONS
    # ========================================================

    @staticmethod
    def _build_unresolved_questions(
        memory: list[dict[str, Any]],
        actions: list[dict[str, Any]],
    ) -> list[str]:
        """
        Generate explicit unresolved investigation questions.

        This does not speculate about answers.
        """

        questions: list[str] = []

        # ----------------------------------------------------
        # Blocked actions
        # ----------------------------------------------------

        for action in actions:

            if action.get("status") != "blocked":
                continue

            title = action.get(
                "title",
                "Investigation action",
            )

            questions.append(
                f"Why does the investigation action "
                f"'{title}' remain blocked?"
            )

        # ----------------------------------------------------
        # Pending actions
        # ----------------------------------------------------

        for action in actions:

            if action.get("status") != "pending":
                continue

            title = action.get(
                "title",
                "Investigation action",
            )

            questions.append(
                f"What is required to complete "
                f"the pending action '{title}'?"
            )

        # ----------------------------------------------------
        # Explicit question-like memory
        # ----------------------------------------------------

        for entry in memory:

            content = str(
                entry.get(
                    "content",
                    "",
                )
            ).strip()

            if not content:
                continue

            if (
                content.endswith("?")
                and content not in questions
            ):
                questions.append(
                    content
                )

        return questions

    # ========================================================
    # INTRODUCTION
    # ========================================================

    @staticmethod
    def _build_introduction(
        investigation,
    ) -> str:
        """
        Build documentary introduction.
        """

        title = getattr(
            investigation,
            "title",
            "Investigation",
        )

        description = getattr(
            investigation,
            "description",
            None,
        )

        status = getattr(
            investigation,
            "status",
            "unknown",
        )

        introduction = (
            f"This documentary presents the recorded "
            f"investigative history of '{title}'. "
            f"The investigation is currently marked "
            f"as {status}."
        )

        if description:
            introduction += (
                f" The recorded case description states: "
                f"{description}"
            )

        introduction += (
            " The timeline below is assembled from "
            "available case-memory entries and "
            "investigation activities."
        )

        return introduction

    # ========================================================
    # CONCLUSION
    # ========================================================

    @staticmethod
    def _build_conclusion(
        investigation,
        timeline: list[DocumentaryEvent],
        findings: list[dict[str, Any]],
        analytical_observations: list[
            dict[str, Any]
        ],
        unresolved_questions: list[str],
    ) -> str:
        """
        Build a cautious conclusion based only on recorded
        investigation information.
        """

        status = getattr(
            investigation,
            "status",
            "unknown",
        )

        parts = []

        parts.append(
            f"The investigation is currently recorded "
            f"with status '{status}'."
        )

        if timeline:

            parts.append(
                f" The documentary contains "
                f"{len(timeline)} recorded timeline event(s)."
            )

        if findings:

            parts.append(
                f" {len(findings)} documented "
                f"finding(s) are available."
            )

        if analytical_observations:

            parts.append(
                f" {len(analytical_observations)} "
                f"analytical observation(s) are recorded."
            )

        if unresolved_questions:

            parts.append(
                f" {len(unresolved_questions)} "
                f"unresolved question(s) remain recorded."
            )

        parts.append(
            " The available material should be reviewed "
            "against the underlying source evidence before "
            "drawing investigative or legal conclusions."
        )

        return "".join(parts)

    # ========================================================
    # EVIDENTIARY STATUS
    # ========================================================

    @staticmethod
    def _memory_evidentiary_status(
        memory_type: str,
    ) -> str:
        """
        Classify the role of a memory entry in the narrative.
        """

        mapping = {
            "finding": "documented_finding",
            "evidence_review": "evidence_review",
            "entity_review": "analytical_review",
            "relationship_review": "analytical_review",
            "analysis": "analytical_observation",
            "observation": "investigator_observation",
            "decision": "investigative_decision",
            "note": "investigator_note",
            "system": "system_record",
        }

        return mapping.get(
            memory_type,
            "documented",
        )

    # ========================================================
    # SORT
    # ========================================================

    @staticmethod
    def _timeline_sort_key(
        event: DocumentaryEvent,
    ) -> tuple[int, str]:
        """
        Sort events chronologically.

        Events without timestamps are placed after
        timestamped events.
        """

        timestamp = event.timestamp

        if not timestamp:
            return (
                1,
                "",
            )

        return (
            0,
            timestamp,
        )

    # ========================================================
    # DOCUMENTARY ID
    # ========================================================

    @staticmethod
    def _build_documentary_id(
        investigation_id: int,
    ) -> str:
        """
        Generate documentary identifier.
        """

        timestamp = datetime.now(
            timezone.utc
        ).strftime(
            "%Y%m%d%H%M%S"
        )

        return (
            f"CD-{investigation_id}-"
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


def generate_criminal_documentary(
    session,
    investigation_id: int,
) -> CriminalDocumentary:
    """
    Convenience wrapper for documentary generation.
    """

    generator = (
        CriminalDocumentaryGenerator(
            session
        )
    )

    return generator.generate(
        investigation_id=investigation_id
    )