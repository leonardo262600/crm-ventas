import React, { useState, useEffect, useCallback, useRef } from 'react';
import ReactFlow, { 
  ReactFlowProvider, addEdge, applyNodeChanges, applyEdgeChanges, 
  Controls, Background, MarkerType 
} from 'reactflow';
import 'reactflow/dist/style.css';
import { useParams, useNavigate } from 'react-router-dom';
import { Save, ArrowLeft, Play, Clock, CheckCircle, Mail, UserPlus, PlayCircle } from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';

// ── Nodos Personalizados ──────────────────────────────────────────────────────
const nodeStyles = {
  triggerNode: { background: '#f8fafc', border: '2px solid #3b82f6', borderRadius: 8, padding: '10px 16px', minWidth: 150 },
  actionNode:  { background: '#f0fdfa', border: '2px solid #0f766e', borderRadius: 8, padding: '10px 16px', minWidth: 150 },
  delayNode:   { background: '#fffbeb', border: '2px solid #f59e0b', borderRadius: 8, padding: '10px 16px', minWidth: 150 }
};

const initialNodes = [
  { id: 'trigger_1', type: 'triggerNode', position: { x: 250, y: 50 }, data: { label: 'Oportunidad Creada' } }
];

let id = 1;
const getId = () => `node_${id++}`;

export default function WorkflowBuilder() {
  const { id: workflowId } = useParams();
  const navigate = useNavigate();
  const reactFlowWrapper = useRef(null);

  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);
  const [name, setName] = useState('Nuevo Workflow');
  const [triggerType, setTriggerType] = useState('opportunity_created');
  const [reactFlowInstance, setReactFlowInstance] = useState(null);

  useEffect(() => {
    if (workflowId === 'new') {
      setNodes([{ id: 'trigger_1', type: 'triggerNode', position: { x: 250, y: 50 }, data: { label: 'Inicio del Flujo' } }]);
    } else {
      loadWorkflow();
    }
  }, [workflowId]);

  const loadWorkflow = async () => {
    try {
      const { data } = await api.get(`/workflows/${workflowId}`);
      setName(data.name);
      setTriggerType(data.trigger_type);
      setNodes(typeof data.nodes_json === 'string' ? JSON.parse(data.nodes_json) : data.nodes_json || []);
      setEdges(typeof data.edges_json === 'string' ? JSON.parse(data.edges_json) : data.edges_json || []);
    } catch (err) { toast.error('Error al cargar workflow'); }
  };

  const onNodesChange = useCallback(changes => setNodes(nds => applyNodeChanges(changes, nds)), []);
  const onEdgesChange = useCallback(changes => setEdges(eds => applyEdgeChanges(changes, eds)), []);
  const onConnect     = useCallback(params => setEdges(eds => addEdge({ ...params, markerEnd: { type: MarkerType.ArrowClosed } }, eds)), []);

  const onDragOver = useCallback((event) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback((event) => {
    event.preventDefault();
    const type = event.dataTransfer.getData('application/reactflow');
    if (!type || !reactFlowInstance) return;

    const position = reactFlowInstance.screenToFlowPosition({ x: event.clientX, y: event.clientY });
    
    let newNode = {
      id: getId(),
      type,
      position,
      data: { label: 'Nuevo Nodo' }
    };

    if (type === 'actionNode') {
      newNode.data = { label: 'Enviar Email', action_type: 'send_email', action_config: { subject: 'Hola', body: '' } };
      newNode.style = nodeStyles.actionNode;
    } else if (type === 'delayNode') {
      newNode.data = { label: 'Esperar 1 Hora', delay_type: 'hours', delay_value: 1 };
      newNode.style = nodeStyles.delayNode;
    }

    setNodes((nds) => nds.concat(newNode));
  }, [reactFlowInstance]);

  const save = async () => {
    try {
      const payload = { name, trigger_type: triggerType, nodes_json: nodes, edges_json: edges };
      if (workflowId === 'new') {
        const { data } = await api.post('/workflows', payload);
        toast.success('Workflow creado');
        navigate(`/workflows/${data.id}`);
      } else {
        await api.put(`/workflows/${workflowId}`, payload);
        toast.success('Workflow guardado');
      }
    } catch (err) { toast.error('Error al guardar'); }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 80px)', margin: '-20px' }}>
      {/* Header */}
      <div style={{ padding: '16px 24px', background: '#fff', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', zIndex: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <button className="btn btn-sm" style={{ background: '#f8fafc', border: '1px solid #e2e8f0' }} onClick={() => navigate('/workflows')}>
            <ArrowLeft size={16}/>
          </button>
          <input className="input" value={name} onChange={e => setName(e.target.value)} style={{ fontWeight: 600, fontSize: 16, border: 'none', padding: 0, background: 'transparent' }} />
          <select className="input" value={triggerType} onChange={e => setTriggerType(e.target.value)} style={{ padding: '4px 8px', fontSize: 13, height: 'auto' }}>
            <option value="opportunity_created">Oportunidad Creada</option>
            <option value="opportunity_stage_changed">Etapa Cambiada</option>
            <option value="quote_approved">Cotización Aprobada</option>
          </select>
        </div>
        <button className="btn btn-primary" onClick={save}>
          <Save size={16}/> Guardar Workflow
        </button>
      </div>

      {/* Main Builder Area */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Sidebar */}
        <div style={{ width: 260, background: '#f8fafc', borderRight: '1px solid #e2e8f0', padding: 20, overflowY: 'auto' }}>
          <h3 style={{ fontSize: 13, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 16 }}>Nodos Disponibles</h3>
          
          <div style={{ marginBottom: 24 }}>
            <p style={{ fontSize: 12, color: '#94a3b8', marginBottom: 8 }}>Acciones</p>
            <div 
              onDragStart={(e) => e.dataTransfer.setData('application/reactflow', 'actionNode')} draggable
              style={{ padding: '12px 16px', background: '#fff', border: '1px solid #0f766e', borderRadius: 8, cursor: 'grab', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Mail size={16} color="#0f766e"/> <span style={{ fontSize: 13, fontWeight: 500, color: '#0f766e' }}>Acción Ejecutable</span>
            </div>
          </div>

          <div>
            <p style={{ fontSize: 12, color: '#94a3b8', marginBottom: 8 }}>Control de Flujo</p>
            <div 
              onDragStart={(e) => e.dataTransfer.setData('application/reactflow', 'delayNode')} draggable
              style={{ padding: '12px 16px', background: '#fff', border: '1px solid #f59e0b', borderRadius: 8, cursor: 'grab', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Clock size={16} color="#f59e0b"/> <span style={{ fontSize: 13, fontWeight: 500, color: '#b45309' }}>Retraso Temporal</span>
            </div>
          </div>
          
          <div style={{ marginTop: 32, padding: 16, background: '#e0f2fe', borderRadius: 8 }}>
            <p style={{ fontSize: 12, color: '#0369a1', lineHeight: 1.5 }}>
              <strong>Tip:</strong> Arrastra los nodos hacia el lienzo de la derecha. Conecta los puntos arrastrando una línea desde un nodo hacia otro.
            </p>
          </div>
        </div>

        {/* Canvas */}
        <div style={{ flex: 1 }} ref={reactFlowWrapper}>
          <ReactFlowProvider>
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              onInit={setReactFlowInstance}
              onDrop={onDrop}
              onDragOver={onDragOver}
              fitView
            >
              <Background color="#cbd5e1" gap={16} />
              <Controls />
            </ReactFlow>
          </ReactFlowProvider>
        </div>
      </div>
    </div>
  );
}
