"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { WorkflowCanvas } from "@/components/workflow/canvas/workflow-canvas";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Settings } from "lucide-react";
import type { WorkflowDefinition } from "@/types/workflow";
import type { Node, Edge } from "reactflow";
import Link from "next/link";

export default function WorkflowEditorPage() {
  const params = useParams();
  const router = useRouter();
  const workflowId = params.id as string;

  const [workflow, setWorkflow] = useState<WorkflowDefinition | null>(null);
  const [loading, setLoading] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  useEffect(() => {
    if (workflowId && workflowId !== "new") {
      fetchWorkflow();
    } else {
      // New workflow
      setWorkflow({
        id: "",
        name: "Untitled Workflow",
        description: "",
        version: "1.0.0",
        nodes: [],
        edges: [],
        variables: {},
        skill_compatibility: [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        tags: [],
        is_published: false,
      });
      setName("Untitled Workflow");
      setLoading(false);
    }
  }, [workflowId]);

  const fetchWorkflow = async () => {
    try {
      const response = await fetch(`/api/workflows/${workflowId}`);
      if (response.ok) {
        const data = await response.json();
        setWorkflow(data);
        setName(data.name);
        setDescription(data.description || "");
      }
    } catch (error) {
      console.error("Failed to fetch workflow:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (nodes: Node[], edges: Edge[]) => {
    if (!workflow) return;

    const updatedWorkflow = {
      ...workflow,
      name,
      description,
      nodes: nodes.map((node) => ({
        id: node.id,
        type: node.type as any,
        position: node.position,
        label: node.data.label,
        config: {},
        inputs: {},
        outputs: {},
        metadata: {},
      })),
      edges: edges.map((edge) => ({
        id: edge.id,
        source_node_id: edge.source,
        target_node_id: edge.target,
        type: "default" as any,
      })),
    };

    try {
      const url = workflowId === "new"
        ? "/api/workflows"
        : `/api/workflows/${workflowId}`;

      const method = workflowId === "new" ? "POST" : "PUT";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedWorkflow),
      });

      if (response.ok) {
        const data = await response.json();
        setWorkflow(data);

        if (workflowId === "new") {
          router.push(`/workflows/${data.id}`);
        }
      }
    } catch (error) {
      console.error("Failed to save workflow:", error);
    }
  };

  const handleExecute = async () => {
    if (!workflow || !workflow.id) return;

    try {
      const response = await fetch(`/api/workflows/${workflow.id}/execute`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workflow_id: workflow.id,
          input_variables: {},
        }),
      });

      if (response.ok) {
        const data = await response.json();
        console.log("Execution started:", data);
        // TODO: Navigate to execution view or show status
      }
    } catch (error) {
      console.error("Failed to execute workflow:", error);
    }
  };

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto" />
          <p className="mt-4 text-muted-foreground">Loading workflow...</p>
        </div>
      </div>
    );
  }

  if (!workflow) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">Workflow not found</h2>
          <Link href="/workflows">
            <Button>Back to Workflows</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <div className="border-b px-4 py-3 flex items-center justify-between bg-background">
        <div className="flex items-center gap-4">
          <Link href="/workflows">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="font-semibold text-lg border-none px-2 h-8"
              placeholder="Workflow name"
            />
            <p className="text-xs text-muted-foreground px-2">
              {workflow.nodes.length} nodes · {workflow.edges.length} connections
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setShowSettings(!showSettings)}
          >
            <Settings className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 relative">
        {showSettings && (
          <div className="absolute top-0 left-0 w-80 h-full bg-background border-r z-10 p-4 overflow-y-auto">
            <h3 className="font-semibold mb-4">Workflow Settings</h3>
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Workflow name"
                />
              </div>
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe what this workflow does"
                  rows={4}
                />
              </div>
            </div>
          </div>
        )}

        <WorkflowCanvas
          workflowId={workflow.id}
          initialNodes={
            workflow.nodes.map((node) => ({
              id: node.id,
              type: node.type,
              position: node.position,
              data: { label: node.label },
            }))
          }
          initialEdges={
            workflow.edges.map((edge) => ({
              id: edge.id,
              source: edge.source_node_id,
              target: edge.target_node_id,
              type: edge.type,
            }))
          }
          onSave={handleSave}
          onExecute={workflow.id ? handleExecute : undefined}
        />
      </div>
    </div>
  );
}
