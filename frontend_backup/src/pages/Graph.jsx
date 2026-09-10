import { useState } from "react";
import {
  GitBranch,
  LoaderCircle,
  Search,
  SlidersHorizontal,
} from "lucide-react";

import InvestigationGraph from "../components/graph/InvestigationGraph";
import PageTransition from "../components/layout/PageTransition";
import EntityPanel from "../components/graph/EntityPanel";
import useGraph from "../hooks/useGraph";


function Graph() {
  const [entityType, setEntityType] = useState("person");
  const [entityValue, setEntityValue] = useState("");

  const [depth, setDepth] = useState(1);

  const {
    nodes,
    edges,
    loading,
    error,
    selectedEntity,
    setSelectedEntity,
    loadNeighborhood,
    clearGraph,
  } = useGraph();

  async function handleSearch(event) {
    event.preventDefault();

    await loadNeighborhood({
      entityType,
      entityValue,
      depth,
      limit: 100,
    });
  }

  function handleNodeClick(node) {
    setSelectedEntity({
      id: node.id,
      type: node.type,
      value: node.value,
    });
  }

  return (
    <PageTransition>
      <div className="tn-graph-page">
        <section className="tn-page-heading">
          <div>
            <div className="tn-eyebrow">
              GRAPH INTELLIGENCE
            </div>

            <h1>Investigation Graph</h1>

            <p>
              Explore connected entities and relationships
              directly from the TRINETRA Neo4j intelligence
              graph.
            </p>
          </div>

          <div className="tn-live-indicator">
            <span className="tn-status-dot" />
            NEO4J CONNECTED
          </div>
        </section>

        <section className="tn-graph-toolbar tn-glass">
          <form
            className="tn-graph-search"
            onSubmit={handleSearch}
          >
            <div className="tn-field">
              <label htmlFor="entity-type">
                ENTITY TYPE
              </label>

              <input
                id="entity-type"
                value={entityType}
                onChange={(event) =>
                  setEntityType(event.target.value)
                }
                placeholder="person"
                autoComplete="off"
              />
            </div>

            <div className="tn-field tn-field-wide">
              <label htmlFor="entity-value">
                ENTITY VALUE
              </label>

              <div className="tn-search-input">
                <Search size={16} />

                <input
                  id="entity-value"
                  value={entityValue}
                  onChange={(event) =>
                    setEntityValue(event.target.value)
                  }
                  placeholder="Enter an entity name..."
                  autoComplete="off"
                />
              </div>
            </div>

            <div className="tn-field tn-depth-field">
              <label htmlFor="graph-depth">
                DEPTH
              </label>

              <div className="tn-depth-control">
                <SlidersHorizontal size={14} />

                <select
                  id="graph-depth"
                  value={depth}
                  onChange={(event) =>
                    setDepth(Number(event.target.value))
                  }
                >
                  <option value={1}>1 hop</option>
                  <option value={2}>2 hops</option>
                  <option value={3}>3 hops</option>
                  <option value={4}>4 hops</option>
                  <option value={5}>5 hops</option>
                </select>
              </div>
            </div>

            <button
              type="submit"
              className="tn-graph-load-button"
              disabled={loading}
            >
              {loading ? (
                <>
                  <LoaderCircle
                    size={16}
                    className="tn-spin"
                  />
                  Loading
                </>
              ) : (
                <>
                  <GitBranch size={16} />
                  Explore
                </>
              )}
            </button>
          </form>

          {(nodes.length > 0 || error) && (
            <button
              type="button"
              className="tn-graph-clear"
              onClick={clearGraph}
            >
              Clear
            </button>
          )}
        </section>

        {error && (
          <div className="tn-graph-error">
            <strong>GRAPH ERROR</strong>
            <span>{error}</span>
          </div>
        )}

        <section className="tn-graph-workspace tn-glass tn-glow-border">
          <div className="tn-graph-workspace-header">
            <div>
              <div className="tn-panel-kicker">
                CONNECTED INTELLIGENCE
              </div>

              <h2>
                {selectedEntity?.value ||
                  "Entity Relationship Network"}
              </h2>
            </div>

            <div className="tn-graph-metrics">
              <span>
                <strong>{nodes.length}</strong> nodes
              </span>

              <span>
                <strong>{edges.length}</strong> links
              </span>
            </div>
          </div>

          <InvestigationGraph
            nodes={nodes}
            edges={edges}
            selectedEntity={selectedEntity}
            onNodeClick={handleNodeClick}
          />

          {selectedEntity && (
            <EntityPanel
                entity={selectedEntity}
                onClose={() => setSelectedEntity(null)}
            />
            )}

          {nodes.length > 0 && (
            <div className="tn-graph-debug-result">
                <span>LIVE GRAPH DATA</span>
                <strong>
                {nodes.length} nodes · {edges.length} relationships
                </strong>
            </div>
            )}
        </section>
      </div>
    </PageTransition>
  );
}

export default Graph;