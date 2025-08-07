import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  getWorkflow,
  getWorkflowNodes,
  createWorkflowNode,
  updateWorkflowNode,
  deleteWorkflowNode,
  startWorkflow,
  stopWorkflow,
} from "../lib/api";
import WorkflowCanvas, { WorkflowNode } from "../components/WorkflowCanvas";

type Workflow = { id: string; name: string; status: string };

export default function WorkflowEditor() {
  const { id = "" } = useParams();
  const navigate = useNavigate();

  const [workflow, setWorkflow] = useState<Workflow | null>(null);
  const [nodes, setNodes] = useState<WorkflowNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const activeCount = useMemo(
    () => nodes.filter((n) => n.is_active).length,
    [nodes]
  );

  useEffect(() => {
    if (!id) return;
    (async () => {
      setLoading(true);
      try {
        const w = await getWorkflow(id);
        setWorkflow(w);
        const ns = await getWorkflowNodes(id);
        setNodes(ns || []);
      } catch (e) {
        alert(`Erro: ${(e as Error).message}`);
        navigate("/dashboard");
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  async function toggle(n: WorkflowNode) {
    setSaving(true);
    try {
      await updateWorkflowNode(n.id, { is_active: !n.is_active });
      setNodes((prev) =>
        prev.map((x) => (x.id === n.id ? { ...x, is_active: !x.is_active } : x))
      );
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function remove(n: WorkflowNode) {
    if (!confirm("Excluir este grupo do workflow?")) return;
    setSaving(true);
    try {
      await deleteWorkflowNode(n.id);
      setNodes((prev) => prev.filter((x) => x.id !== n.id));
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function create() {
    const group_url = prompt("URL do grupo do Facebook");
    if (!group_url) return;
    const group_name = prompt("Nome do grupo") || "Grupo";
    try {
      const created = await createWorkflowNode({
        workflow_id: id,
        group_url,
        group_name,
        is_active: true,
      });
      setNodes((prev) => [...prev, created]);
    } catch (e) {
      alert((e as Error).message);
    }
  }

  async function run() {
    try {
      await startWorkflow(id);
      setWorkflow((w) => (w ? { ...w, status: "running" } : w));
    } catch (e) {
      alert((e as Error).message);
    }
  }

  async function stop() {
    try {
      await stopWorkflow(id);
      setWorkflow((w) => (w ? { ...w, status: "stopped" } : w));
    } catch (e) {
      alert((e as Error).message);
    }
  }

  if (loading) return <div className="p-6">Carregando…</div>;
  if (!workflow) return null;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">{workflow.name}</h1>
          <div className="text-sm text-gray-500">
            {activeCount} grupos ativos, status:{" "}
            <span className="font-medium">{workflow.status || "stopped"}</span>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={run}
            className="px-4 py-2 rounded-lg bg-green-600 text-white disabled:opacity-60"
            disabled={saving || workflow.status === "running"}
          >
            Iniciar
          </button>
          <button
            onClick={stop}
            className="px-4 py-2 rounded-lg bg-gray-900 text-white disabled:opacity-60"
            disabled={saving || workflow.status === "stopped"}
          >
            Parar
          </button>
          <button
            onClick={() => navigate("/dashboard")}
            className="px-4 py-2 rounded-lg border"
          >
            Voltar
          </button>
        </div>
      </div>

      <WorkflowCanvas
        nodes={nodes}
        onToggle={toggle}
        onDelete={remove}
        onCreate={create}
        onEdit={(n) => {
          const name = prompt("Novo nome do grupo", n.group_name) || n.group_name;
          const promptText = prompt("Prompt do comentário", n.prompt || "") || n.prompt || "";
          const kw = prompt("Keywords separadas por vírgula", (n.keywords || []).join(", ")) || "";
          const keywords = kw.split(",").map((x) => x.trim()).filter(Boolean);
          updateWorkflowNode(n.id, {
            group_name: name,
            prompt: promptText,
            keywords,
          })
            .then(() => {
              setNodes(prev => prev.map(x => x.id === n.id ? { ...x, group_name: name, prompt: promptText, keywords } : x));
            })
            .catch((e) => alert((e as Error).message));
        }}
      />
    </div>
  );
}