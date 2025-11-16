import { dia, shapes } from '@joint/core';
import './style.css';

const app = document.querySelector('#app');
app.innerHTML = 
  <div class="app-shell">
    <header class="app-header">
      <div>
        <h1>NonLinear GPT</h1>
        <p>Build a branching knowledge map for your prompts. Double-click the grid to spawn a node.</p>
      </div>
      <div class="header-actions">
        <button id="new-node-btn" class="primary">+ New instruction</button>
        <button id="reset-canvas-btn" class="ghost">Reset canvas</button>
      </div>
    </header>
    <div class="app-main">
      <div class="paper-wrapper">
        <div id="paper"></div>
      </div>
      <aside class="side-panel">
        <section>
          <h2>ChatGPT API Key</h2>
          <input id="api-key-input" type="password" placeholder="sk-..." />
          <p class="muted">Key stays in your browser only. Leave empty to use the offline mock model.</p>
        </section>
        <section>
          <h2>Quick actions</h2>
          <div class="quick-actions">
            <button data-template="bread">Bread explainer</button>
            <button data-template="science">Science branch</button>
            <button data-template="blank">Blank trio</button>
          </div>
        </section>
        <section>
          <h2>How to use</h2>
          <ul>
            <li>Drag from one node onto another to connect context.</li>
            <li>Each node keeps the cumulative chat context from all parents.</li>
            <li>If a parent changes, children become "stale" until you resend.</li>
          </ul>
        </section>
      </aside>
    </div>
  </div>
;

const nodeState = new Map();

class ChatGateway {
  constructor() {
    this.apiKey = '';
  }

  setApiKey(value) {
    this.apiKey = value?.trim() ?? '';
  }

  async ask({ prompt, contextEntries }) {
    const contextBlock = contextEntries.length
      ? contextEntries
          .map((entry, index) => {
            const title = entry.prompt?.trim() ? entry.prompt.trim() : Parent #;
            const answer = entry.response?.trim() ?? 'No response yet.';
            return [] \n;
          })
          .join('\n\n')
      : 'No parent context provided.';

    if (!this.apiKey) {
      return [
        'Mock assistant response. Provide an OpenAI API key to talk to the real model.',
        Prompt: ,
        Context digest: 
      ].join('\n\n');
    }

    const payload = {
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content:
            'You are a helpful research assistant embedded in a node-based graph. Respond concisely and include lists when needed.'
        },
        {
          role: 'user',
          content: Context:\n\n\nPrompt:\n
        }
      ],
      temperature: 0.4
    };

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: Bearer 
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorMessage = await response.text();
      throw new Error(OpenAI request failed: );
    }

    const data = await response.json();
    const content = data?.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error('No content returned from OpenAI.');
    }
    return content.trim();
  }
}

const chatGateway = new ChatGateway();
const storedKey = window.localStorage.getItem('gptgraph.openaiKey');
if (storedKey) {
  document.querySelector('#api-key-input').value = storedKey;
  chatGateway.setApiKey(storedKey);
}

document.querySelector('#api-key-input').addEventListener('input', (event) => {
  const value = event.target.value ?? '';
  chatGateway.setApiKey(value);
  if (value) {
    window.localStorage.setItem('gptgraph.openaiKey', value);
  } else {
    window.localStorage.removeItem('gptgraph.openaiKey');
  }
});

const graph = new dia.Graph({}, { cellNamespace: shapes });
const paperElement = document.getElementById('paper');
const paper = new dia.Paper({
  el: paperElement,
  model: graph,
  width: paperElement.clientWidth,
  height: paperElement.clientHeight,
  gridSize: 1,
  background: {
    color: '#f8f9fb'
  },
  snapLinks: true,
  linkPinning: false,
  defaultLink: () =>
    new dia.Link({
      router: { name: 'manhattan' },
      attrs: {
        line: {
          stroke: '#b0bec5',
          strokeWidth: 1.6,
          targetMarker: {
            type: 'path',
            d: 'M 10 -5 0 0 10 5 z',
            fill: '#b0bec5'
          }
        }
      }
    }),
  cellViewNamespace: shapes
});

const ConversationNode = dia.Element.define(
  'app.ConversationNode',
  {
    size: { width: 360, height: 260 },
    attrs: {
      body: {
        fill: '#ffffff',
        stroke: '#ced8e3',
        strokeWidth: 1,
        rx: 18,
        ry: 18,
        filter: {
          name: 'dropShadow',
          args: {
            dx: 0,
            dy: 6,
            blur: 18,
            color: 'rgba(15, 23, 42, 0.15)'
          }
        },
        magnet: true
      },
      fo: {
        width: '100%',
        height: '100%'
      },
      foBody: {
        xmlns: 'http://www.w3.org/1999/xhtml'
      }
    }
  },
  {
    markup: [
      {
        tag: 'rect',
        selector: 'body'
      },
      {
        tag: 'foreignObject',
        selector: 'fo',
        attributes: {
          width: '100%',
          height: '100%'
        },
        children: [
          {
            tag: 'body',
            selector: 'foBody'
          }
        ]
      }
    ]
  }
);

function escapeHtml(value = '') {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function getParentSummaries(nodeId) {
  const element = graph.getCell(nodeId);
  if (!element) return [];
  const inbound = graph.getConnectedLinks(element, { inbound: true });
  return inbound
    .map((link) => {
      const sourceId = link.get('source')?.id;
      if (!sourceId) return null;
      const sourceState = nodeState.get(sourceId) ?? {};
      return {
        id: sourceId,
        prompt: sourceState.prompt ?? '',
        response: sourceState.response ?? ''
      };
    })
    .filter(Boolean);
}

function getParentNames(nodeId) {
  return getParentSummaries(nodeId)
    .map((parent) => (parent.prompt ? parent.prompt.slice(0, 42) : 'Untitled'))
    .filter(Boolean);
}

function createNodeHtml(nodeId) {
  const state = nodeState.get(nodeId);
  if (!state) return '';
  const parentNames = getParentNames(nodeId);
  const parentLabel = parentNames.length ? parentNames.join(' • ') : 'No parents yet';
  const statusLabel = state.status === 'loading' ? 'Thinking…' : state.contextDirty ? 'Needs refresh' : 'Ready';
  const statusClass = state.status === 'loading' ? 'status loading' : state.contextDirty ? 'status stale' : 'status';
  const responseBlock = state.response
    ? <pre></pre>
    : '<p class="placeholder">LLM answers appear here.</p>';
  const errorBlock = state.error ? <div class="error-banner"></div> : '';

  return 
    <div class="conversation-node" data-node-id="">
      <div class="node-meta">
        <span class="parents" title=""></span>
        <span class=""></span>
      </div>
      <div class="prompt-row">
        <input class="prompt-input" type="text" value="" placeholder="Ask something…" />
        <button class="send-btn" ></button>
      </div>
      
      <div class="response-pane"></div>
      <div class="node-footer">
        <button class="child-btn">Add child</button>
        <button class="duplicate-btn">Duplicate</button>
      </div>
    </div>
  ;
}

function attachNodeDomHandlers(nodeId) {
  const domNode = paperElement.querySelector(.conversation-node[data-node-id=""]);
  if (!domNode) return;
  const inputEl = domNode.querySelector('.prompt-input');
  const sendBtn = domNode.querySelector('.send-btn');
  const childBtn = domNode.querySelector('.child-btn');
  const duplicateBtn = domNode.querySelector('.duplicate-btn');

  inputEl?.addEventListener('input', (event) => {
    const value = event.target.value;
    updateNodeState(nodeId, { prompt: value });
    if (nodeState.get(nodeId)?.response) {
      markDescendantsDirty(nodeId);
    }
  });

  inputEl?.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSend(nodeId);
    }
  });

  sendBtn?.addEventListener('click', () => handleSend(nodeId));
  childBtn?.addEventListener('click', () => spawnChildNode(nodeId));
  duplicateBtn?.addEventListener('click', () => duplicateNode(nodeId));
}

function updateNodeState(nodeId, patch, { skipRender = false } = {}) {
  const prev = nodeState.get(nodeId) || { prompt: '', response: '', status: 'idle', contextDirty: false, error: null };
  const next = { ...prev, ...patch };
  nodeState.set(nodeId, next);
  if (!skipRender) {
    renderNode(nodeId);
  }
}

function renderNode(nodeId) {
  const cell = graph.getCell(nodeId);
  if (!cell) return;
  const html = createNodeHtml(nodeId);
  cell.attr('foBody/html', html);
  requestAnimationFrame(() => attachNodeDomHandlers(nodeId));
}

function createConversationNode(position = { x: 120, y: 120 }, initialPrompt = '') {
  const element = new ConversationNode({ position });
  graph.addCell(element);
  nodeState.set(element.id, {
    prompt: initialPrompt,
    response: '',
    status: 'idle',
    contextDirty: false,
    error: null
  });
  renderNode(element.id);
  return element;
}

function gatherContextEntries(nodeId, visited = new Set()) {
  if (visited.has(nodeId)) return [];
  visited.add(nodeId);
  const element = graph.getCell(nodeId);
  if (!element) return [];
  const inbound = graph.getConnectedLinks(element, { inbound: true });
  const entries = [];
  inbound.forEach((link) => {
    const parentId = link.get('source')?.id;
    if (!parentId || visited.has(parentId)) return;
    const parentState = nodeState.get(parentId);
    if (parentState) {
      entries.push({
        id: parentId,
        prompt: parentState.prompt,
        response: parentState.response
      });
      entries.push(...gatherContextEntries(parentId, visited));
    }
  });
  return entries;
}

async function handleSend(nodeId) {
  const state = nodeState.get(nodeId);
  if (!state) return;
  const prompt = state.prompt?.trim();
  if (!prompt) {
    updateNodeState(nodeId, { error: 'Ââåäèòå âîïðîñ ïåðåä îòïðàâêîé.' });
    return;
  }
  updateNodeState(nodeId, { status: 'loading', error: null, contextDirty: false });
  try {
    const contextEntries = gatherContextEntries(nodeId);
    const response = await chatGateway.ask({ prompt, contextEntries });
    updateNodeState(nodeId, { response, status: 'ready', error: null });
    markDescendantsDirty(nodeId);
  } catch (error) {
    updateNodeState(nodeId, { status: 'error', error: error.message });
  }
}

function markDescendantsDirty(nodeId, visited = new Set()) {
  if (visited.has(nodeId)) return;
  visited.add(nodeId);
  const element = graph.getCell(nodeId);
  if (!element) return;
  const outbound = graph.getConnectedLinks(element, { outbound: true });
  outbound.forEach((link) => {
    const childId = link.get('target')?.id;
    if (!childId || visited.has(childId)) return;
    const currentState = nodeState.get(childId) ?? {};
    const nextStatus = currentState.status === 'loading' ? 'loading' : 'stale';
    updateNodeState(childId, { contextDirty: true, status: nextStatus });
    markDescendantsDirty(childId, visited);
  });
}

function spawnChildNode(parentId) {
  const parent = graph.getCell(parentId);
  if (!parent) return;
  const parentPosition = parent.position();
  const newPosition = { x: parentPosition.x + 420, y: parentPosition.y + 20 };
  const child = createConversationNode(newPosition, '');
  const link = new dia.Link({
    source: { id: parentId },
    target: { id: child.id },
    router: { name: 'manhattan' },
    attrs: {
      line: {
        stroke: '#cdd5df',
        strokeWidth: 1.4,
        targetMarker: { type: 'path', d: 'M 10 -5 0 0 10 5 z', fill: '#cdd5df' }
      }
    }
  });
  graph.addCell(link);
}

function duplicateNode(nodeId) {
  const element = graph.getCell(nodeId);
  if (!element) return;
  const state = nodeState.get(nodeId) ?? {};
  const newPosition = { x: element.position().x + 20, y: element.position().y + 220 };
  const duplicate = createConversationNode(newPosition, state.prompt ?? '');
  updateNodeState(duplicate.id, { response: state.response ?? '', status: 'idle' });
}

function resizePaper() {
  const rect = paperElement.getBoundingClientRect();
  paper.setDimensions(rect.width, rect.height);
}

window.addEventListener('resize', resizePaper);
resizePaper();

let isPanning = false;
let panOrigin = { x: 0, y: 0 };
let translationOrigin = { x: 0, y: 0 };
let currentScale = 1;

paper.on('blank:pointerdown', (event) => {
  isPanning = true;
  panOrigin = { x: event.clientX, y: event.clientY };
  const { tx, ty } = paper.translate();
  translationOrigin = { x: tx, y: ty };
  document.body.style.cursor = 'grabbing';
});

window.addEventListener('pointermove', (event) => {
  if (!isPanning) return;
  const dx = event.clientX - panOrigin.x;
  const dy = event.clientY - panOrigin.y;
  paper.translate(translationOrigin.x + dx, translationOrigin.y + dy);
});

window.addEventListener('pointerup', () => {
  if (isPanning) {
    isPanning = false;
    document.body.style.cursor = '';
  }
});

paperElement.addEventListener(
  'wheel',
  (event) => {
    if (!event.ctrlKey && !event.metaKey) return;
    event.preventDefault();
    const delta = event.deltaY > 0 ? -0.1 : 0.1;
    currentScale = Math.min(1.6, Math.max(0.5, currentScale + delta));
    paper.scale(currentScale, currentScale);
  },
  { passive: false }
);

paper.on('blank:pointerdblclick', (_, x, y) => {
  createConversationNode({ x, y });
});

document.getElementById('new-node-btn').addEventListener('click', () => {
  const rect = paperElement.getBoundingClientRect();
  const { tx, ty } = paper.translate();
  const x = (rect.width / 2 - tx) / currentScale;
  const y = (rect.height / 2 - ty) / currentScale;
  createConversationNode({ x, y });
});

document.getElementById('reset-canvas-btn').addEventListener('click', () => {
  graph.clear();
  nodeState.clear();
  createConversationNode({ x: 240, y: 120 }, 'Explain how bread is made.');
});

function applyTemplate(type) {
  graph.clear();
  nodeState.clear();
  if (type === 'bread') {
    const main = createConversationNode({ x: 40, y: 80 }, 'Explain how bread is made.');
    const baking = createConversationNode({ x: 440, y: 40 }, 'What happens during baking chemically?');
    const recipe = createConversationNode({ x: 440, y: 220 }, 'I want a really soft bread. Give me a recipe.');
    graph.addCell(new dia.Link({ source: { id: main.id }, target: { id: baking.id } }));
    graph.addCell(new dia.Link({ source: { id: main.id }, target: { id: recipe.id } }));
  } else if (type === 'science') {
    const core = createConversationNode({ x: 40, y: 60 }, 'Summarize quantum entanglement.');
    const eli5 = createConversationNode({ x: 460, y: 0 }, 'Explain it like I am five.');
    const compare = createConversationNode({ x: 460, y: 140 }, 'Compare entanglement to classical correlation.');
    const apply = createConversationNode({ x: 460, y: 280 }, 'List real-world systems where entanglement is useful.');
    graph.addCell(new dia.Link({ source: { id: core.id }, target: { id: eli5.id } }));
    graph.addCell(new dia.Link({ source: { id: core.id }, target: { id: compare.id } }));
    graph.addCell(new dia.Link({ source: { id: core.id }, target: { id: apply.id } }));
  } else {
    createConversationNode({ x: 80, y: 60 }, 'New root idea');
    createConversationNode({ x: 420, y: 60 }, 'Another branch');
    createConversationNode({ x: 420, y: 220 }, 'Third branch');
  }
}

Array.from(document.querySelectorAll('.quick-actions button')).forEach((button) => {
  button.addEventListener('click', () => applyTemplate(button.dataset.template));
});

createConversationNode({ x: 120, y: 120 }, 'Explain how bread is made.');