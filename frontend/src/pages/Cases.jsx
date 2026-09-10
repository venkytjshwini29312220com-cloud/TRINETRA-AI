import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardPlus,
  FileUp,
  Loader2,
  RefreshCw,
  Search,
  ShieldCheck,
  UploadCloud,
  X,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { createCase, listCases, uploadCaseEvidence } from "../services/casesApi";
import "./cases-page.css";

const REFRESH_INTERVAL_MS = 10000;
const EMPTY_FORM = { caseNumber: "", title: "", description: "" };

const idOf = (x) => x?.id ?? x?.case_id ?? x?.caseId ?? null;
const numberOf = (x) => x?.case_number ?? x?.caseNumber ?? "—";
const titleOf = (x) => x?.title ?? "Untitled case";
const descriptionOf = (x) => x?.description ?? "";

function formatDate(value) {
  if (!value) return "—";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? String(value) : d.toLocaleString();
}

export default function Cases() {
  const [cases, setCases] = useState([]);
  const [selectedCase, setSelectedCase] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [evidence, setEvidence] = useState({
    evidenceNumber: "",
    title: "",
    evidenceType: "document",
    description: "",
    sourceReference: "",
    file: null,
  });
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [creating, setCreating] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const loadCases = useCallback(async (manual = false) => {
    manual ? setRefreshing(true) : setLoading(true);
    try {
      const data = await listCases();
      const rows = Array.isArray(data) ? data : data?.results ?? data?.cases ?? [];
      setCases(rows);
      setError("");
    } catch (e) {
      setError(e?.response?.data?.detail || e?.message || "Unable to load cases.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadCases();
    const timer = window.setInterval(() => loadCases(), REFRESH_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [loadCases]);

  const filteredCases = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return cases;
    return cases.filter((x) =>
      [numberOf(x), titleOf(x), descriptionOf(x)].join(" ").toLowerCase().includes(q)
    );
  }, [cases, query]);

  const update = (field, value) => setForm((x) => ({ ...x, [field]: value }));
  const updateEvidence = (field, value) =>
    setEvidence((x) => ({ ...x, [field]: value }));

  async function handleCreateCase(event) {
    event.preventDefault();
    setError("");
    setNotice("");

    if (!form.caseNumber.trim() || !form.title.trim()) {
      setError("Case number and case title are required.");
      return;
    }

    setCreating(true);
    try {
      const result = await createCase({
        caseNumber: form.caseNumber.trim(),
        title: form.title.trim(),
        description: form.description.trim(),
      });
      const created = result?.case ?? result;
      setSelectedCase(created);
      setForm(EMPTY_FORM);
      setNotice(`Case ${numberOf(created)} created successfully.`);
      await loadCases(true);
    } catch (e) {
      setError(e?.response?.data?.detail || e?.message || "Unable to create the case.");
    } finally {
      setCreating(false);
    }
  }

  async function handleUpload(event) {
    event.preventDefault();
    setError("");
    setNotice("");

    const caseId = idOf(selectedCase);
    if (!caseId) return setError("Select a case before uploading evidence.");
    if (!evidence.evidenceNumber.trim() || !evidence.title.trim() || !evidence.file) {
      return setError("Evidence number, title, and file are required.");
    }

    setUploading(true);
    try {
      await uploadCaseEvidence({
        caseId,
        evidenceNumber: evidence.evidenceNumber.trim(),
        title: evidence.title.trim(),
        evidenceType: evidence.evidenceType,
        description: evidence.description.trim(),
        sourceReference: evidence.sourceReference.trim(),
        file: evidence.file,
      });

      setEvidence({
        evidenceNumber: "",
        title: "",
        evidenceType: "document",
        description: "",
        sourceReference: "",
        file: null,
      });
      event.target.reset();
      setNotice("Evidence uploaded and linked to the selected case.");
    } catch (e) {
      setError(e?.response?.data?.detail || e?.message || "Unable to upload evidence.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="tn-page tn-cases-page">
      <header className="tn-cases-header">
        <div>
          <div className="tn-eyebrow">TRINETRA / CASE MANAGEMENT</div>
          <h1 className="tn-page-title">New Case Intake</h1>
          <p className="tn-page-subtitle">
            Create cases from the live API and attach source evidence for downstream
            graph, analytics, and assistant processing.
          </p>
        </div>

        <div className="tn-cases-live">
          <span className="tn-cases-live-dot" />
          <div>
            <strong>CASE SERVICE ONLINE</strong>
            <span>Auto-refresh every 10 seconds</span>
          </div>
          <button className="tn-icon-button" onClick={() => loadCases(true)} disabled={refreshing}>
            <RefreshCw size={17} className={refreshing ? "tn-spin" : ""} />
          </button>
        </div>
      </header>

      <AnimatePresence initial={false}>
        {(error || notice) && (
          <motion.div className={`tn-cases-alert ${error ? "is-error" : "is-success"}`}
            initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
            {error ? <AlertTriangle size={17} /> : <CheckCircle2 size={17} />}
            <span>{error || notice}</span>
            <button onClick={() => { setError(""); setNotice(""); }}><X size={15} /></button>
          </motion.div>
        )}
      </AnimatePresence>

      <section className="tn-cases-layout">
        <motion.div className="tn-case-intake tn-glass-panel"
          initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }}>
          <div className="tn-panel-heading">
            <div className="tn-panel-icon"><ClipboardPlus size={20} /></div>
            <div><span>CASE INTAKE</span><h2>Create a new case</h2></div>
          </div>

          <form onSubmit={handleCreateCase} className="tn-case-form">
            <label><span>Case number *</span>
              <input value={form.caseNumber} onChange={(e) => update("caseNumber", e.target.value)}
                placeholder="TRI-2026-002" /></label>
            <label><span>Case title *</span>
              <input value={form.title} onChange={(e) => update("title", e.target.value)}
                placeholder="Financial Network Investigation" /></label>
            <label><span>Description</span>
              <textarea value={form.description} onChange={(e) => update("description", e.target.value)}
                placeholder="Describe the purpose and scope of this investigation..." rows={6} /></label>

            <div className="tn-intake-note"><ShieldCheck size={16} />
              <span>Creates the case through <code>POST /cases</code>. No case data is hardcoded.</span>
            </div>

            <button className="tn-primary-button" disabled={creating}>
              {creating ? <Loader2 size={17} className="tn-spin" /> : <ClipboardPlus size={17} />}
              {creating ? "Creating case…" : "Create case"}
            </button>
          </form>
        </motion.div>

        <div className="tn-case-list-panel tn-glass-panel">
          <div className="tn-list-heading">
            <div><span>LIVE CASE REGISTER</span><h2>{cases.length} cases</h2></div>
            <div className="tn-case-search"><Search size={16} />
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search cases…" />
            </div>
          </div>

          <div className="tn-case-list">
            {loading ? (
              <div className="tn-empty-state"><Loader2 size={22} className="tn-spin" />Loading live case register…</div>
            ) : filteredCases.length === 0 ? (
              <div className="tn-empty-state"><ClipboardPlus size={22} />No matching cases found.</div>
            ) : filteredCases.map((item) => {
              const active = selectedCase && String(idOf(selectedCase)) === String(idOf(item));
              return (
                <button className={`tn-case-row ${active ? "is-active" : ""}`}
                  key={idOf(item) ?? numberOf(item)} onClick={() => setSelectedCase(item)}>
                  <div className="tn-case-row-mark"><span /></div>
                  <div className="tn-case-row-main"><strong>{titleOf(item)}</strong><span>{numberOf(item)}</span></div>
                  <div className="tn-case-row-meta">
                    <span>{item?.status ?? "created"}</span>
                    <small>{formatDate(item?.created_at ?? item?.createdAt)}</small>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      <section className="tn-evidence-intake tn-glass-panel">
        <div className="tn-panel-heading">
          <div className="tn-panel-icon"><FileUp size={20} /></div>
          <div>
            <span>EVIDENCE INTAKE</span>
            <h2>{selectedCase ? `Attach evidence to ${numberOf(selectedCase)}` : "Select a case to attach evidence"}</h2>
          </div>
        </div>

        <form onSubmit={handleUpload} className="tn-evidence-form">
          <label><span>Evidence number *</span>
            <input value={evidence.evidenceNumber} onChange={(e) => updateEvidence("evidenceNumber", e.target.value)} placeholder="EV-2026-001" /></label>
          <label><span>Evidence title *</span>
            <input value={evidence.title} onChange={(e) => updateEvidence("title", e.target.value)} placeholder="Bank transaction record" /></label>
          <label><span>Evidence type</span>
            <select value={evidence.evidenceType} onChange={(e) => updateEvidence("evidenceType", e.target.value)}>
              <option value="document">Document</option><option value="financial">Financial</option>
              <option value="communication">Communication</option><option value="image">Image</option>
              <option value="registry">Registry</option><option value="other">Other</option>
            </select></label>
          <label><span>Source reference</span>
            <input value={evidence.sourceReference} onChange={(e) => updateEvidence("sourceReference", e.target.value)} placeholder="DOC-2026-001" /></label>
          <label className="tn-field-wide"><span>Description</span>
            <textarea value={evidence.description} onChange={(e) => updateEvidence("description", e.target.value)} rows={4} placeholder="What does this evidence contain?" /></label>

          <label className="tn-file-drop tn-field-wide">
            <input type="file" accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.tif,.tiff"
              onChange={(e) => updateEvidence("file", e.target.files?.[0] ?? null)} />
            <UploadCloud size={25} />
            <strong>{evidence.file ? evidence.file.name : "Choose evidence file"}</strong>
            <span>PDF, DOCX, JPG, PNG, TIFF</span>
          </label>

          <button className="tn-primary-button tn-field-wide" disabled={!selectedCase || uploading}>
            {uploading ? <Loader2 size={17} className="tn-spin" /> : <FileUp size={17} />}
            {uploading ? "Uploading evidence…" : "Upload evidence to case"}
          </button>
        </form>
      </section>
    </div>
  );
}
