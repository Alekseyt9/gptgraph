import { dia, shapes } from '@joint/core';
import { elementTools } from '@joint/core';
import './style.css';

const app = document.querySelector('#app');
app.innerHTML = `
  <div class="app-shell">
    <div class="paper-wrapper">
      <div id="paper"></div>
      <button id="new-node-btn" class="floating-button primary">+ New instruction</button>
      <aside class="control-panel">
        <div class="panel-header">
          <h1>NonLinear GPT</h1>
          <p>Branch out prompts, remix context, and compare ideas side-by-side.</p>
          <button id="reset-canvas-btn" class="ghost small">Reset workspace</button>
        </div>
        <section>
          <h2>ChatGPT API Key</h2>
          <input id="api-key-input" name="openai-key" type="password" placeholder="sk-..." />
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
            <li>Double-click empty space to create a node. Drag to pan, pinch/scroll to zoom.</li>
            <li>Connect nodes to pass the parent's answers into the child's prompt.</li>
            <li>When a parent changes, children show "Needs refresh" until you resend.</li>
          </ul>
        </section>
      </aside>
    </div>
  </div>
`;

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
            const title = entry.prompt && entry.prompt.trim() ? entry.prompt.trim() : `Parent #${index + 1}`;
            const answer = entry.response && entry.response.trim() ? entry.response.trim() : 'No response yet.';
            return `[${index + 1}] ${title}\n${answer}`;
          })
          .join('\n\n')
      : 'No parent context provided.';

    if (!this.apiKey) {
      return [
        'Mock assistant response. Provide an OpenAI API key to talk to the real model.',
        `Prompt: ${prompt}`,
        `Context digest: ${contextBlock.slice(0, 280)}`
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
          content: `Context:\n${contextBlock}\n\nPrompt:\n${prompt}`
        }
      ],
      temperature: 0.4
    };

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorMessage = await response.text();
      throw new Error(`OpenAI request failed: ${errorMessage}`);
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
const apiKeyInput = document.querySelector('#api-key-input');
const newNodeButton = document.getElementById('new-node-btn');
const resetButton = document.getElementById('reset-canvas-btn');
const storedKey = window.localStorage.getItem('gptgraph.openaiKey');
if (storedKey) {
  apiKeyInput.value = storedKey;
  chatGateway.setApiKey(storedKey);
}

apiKeyInput.addEventListener('input', (event) => {
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

const StyledLink = dia.Link.define('app.StyledLink', {
  router: { name: 'orthogonal' },
  connector: { name: 'smooth' },
  attrs: {
    line: {
      connection: true,
      fill: 'none',
      'pointer-events': 'none',
      stroke: '#334155',
      strokeWidth: 2.2,
      targetMarker: {
        type: 'path',
        d: 'M 10 -5 0 0 10 5 z',
        fill: '#334155'
      }
    }
  },
  markup: [
    {
      tagName: 'path',
      selector: 'line'
    }
  ]
});

function createStyledLink() {
  return new StyledLink();
}

const paper = new dia.Paper({
  el: paperElement,
  model: graph,
  width: paperElement.clientWidth,
  height: paperElement.clientHeight,
  gridSize: 24,
  drawGrid: { name: 'fixedDot', args: { color: '#d2dbea', thickness: 3 } },
  background: { color: '#f8f9fb' },
  snapLinks: true,
  linkPinning: false,
  defaultLink: () => createStyledLink(),
  cellViewNamespace: shapes
});

const RESIZE_HANDLE_OFFSET = 10;
const CONNECT_HANDLE_OFFSET = 16;
const CONNECT_HANDLE_RADIUS = 11;

const ResizeTool = elementTools.Control.extend({
  children() {
    return [
      {
        tagName: 'image',
        selector: 'handle',
        attributes: {
          cursor: 'pointer',
          width: 20,
          height: 20,
          'xlink:href': 'https://assets.codepen.io/7589991/8725981_image_resize_square_icon.svg'
        }
      },
      {
        tagName: 'rect',
        selector: 'extras',
        attributes: {
          'pointer-events': 'none',
          fill: 'none',
          stroke: '#33334F',
          'stroke-dasharray': '2,4',
          rx: 5,
          ry: 5
        }
      }
    ];
  },
  getPosition(view) {
    const { width, height } = view.model.size();
    return { x: width, y: height };
  },
  setPosition(view, coordinates) {
    const width = Math.max(coordinates.x - RESIZE_HANDLE_OFFSET, 1);
    const height = Math.max(coordinates.y - RESIZE_HANDLE_OFFSET, 1);
    view.model.resize(width, height);
  }
});

const connectToolMarkup = [
  {
    tagName: 'circle',
    selector: 'button',
    attributes: {
      r: CONNECT_HANDLE_RADIUS,
      fill: '#0f172a',
      stroke: '#fff',
      'stroke-width': 2,
      cursor: 'pointer'
    }
  },
  {
    tagName: 'path',
    selector: 'icon',
    attributes: {
      d: 'M -4 0 L 4 0 M 0 -4 L 0 4',
      stroke: '#fff',
      'stroke-width': 2,
      'stroke-linecap': 'round',
      'pointer-events': 'none'
    }
  }
];

function createNodeToolsView() {
  return new dia.ToolsView({
    tools: [
      new elementTools.Connect({
        selector: 'body',
        x: 'calc(w)',
        y: 'calc(h / 2)',
        offset: { x: CONNECT_HANDLE_OFFSET, y: 0 },
        useModelGeometry: true,
        magnet: 'body',
        distance: 0,
        markup: connectToolMarkup
      }),
      new ResizeTool({
        selector: 'body'
      })
    ]
  });
}

function attachNodeTools(element) {
  const view = element.findView(paper);
  if (view) {
    view.addTools(createNodeToolsView());
    return;
  }
  const waitForRender = () => {
    const renderedView = element.findView(paper);
    if (renderedView) {
      renderedView.addTools(createNodeToolsView());
      paper.off('render:done', waitForRender);
    }
  };
  paper.on('render:done', waitForRender);
}

let isPanning = false;
let panOrigin = { x: 0, y: 0 };
let translationOrigin = { x: 0, y: 0 };
let currentScale = 1;

function resetViewTransform() {
  panOrigin = { x: 0, y: 0 };
  translationOrigin = { x: 0, y: 0 };
  currentScale = 1;
  paper.translate(0, 0);
  paper.scale(1, 1);
}

function getPaperTranslation() {
  const translation = paper.translate();
  if (Array.isArray(translation)) {
    const [tx = 0, ty = 0] = translation;
    return { tx, ty };
  }
  if (translation && typeof translation === 'object') {
    const { tx = 0, ty = 0 } = translation;
    return { tx, ty };
  }
  return { tx: 0, ty: 0 };
}

const ConversationNode = dia.Element.define(
  'app.ConversationNode',
  {
    size: { width: 220, height: 160 },
    attrs: {
      body: {
        width: 'calc(w)',
        height: 'calc(h)',
        fill: '#ffffff',
        stroke: '#64748b',
        strokeWidth: 1.6,
        rx: 8,
        ry: 8,
        filter: {
          name: 'dropShadow',
          args: { dx: 0, dy: 3, blur: 10, color: 'rgba(15, 23, 42, 0.12)' }
        },
        magnet: true
      },
      fo: {
        width: 'calc(w)',
        height: 'calc(h)',
        x: 0,
        y: 0,
        style: { overflow: 'hidden' }
      },
      foBody: {
        style: {
          width: '100%',
          height: '100%'
        }
      }
    }
  },
  {
    markup: [
      { tagName: 'rect', selector: 'body' },
      {
        tagName: 'foreignObject',
        selector: 'fo',
        attributes: { width: '100%', height: '100%' },
        children: [
          {
            tagName: 'div',
            namespaceURI: 'http://www.w3.org/1999/xhtml',
            selector: 'foBody',
            style: {
              width: '100%',
              height: '100%'
            }
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
      const parentState = nodeState.get(sourceId) ?? {};
      return {
        id: sourceId,
        prompt: parentState.prompt ?? '',
        response: parentState.response ?? ''
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
  const parentLabel = parentNames.length ? parentNames.join(' | ') : 'No parents yet';
  let statusLabel = 'Ready';
  let statusClass = 'status';
  if (state.status === 'loading') {
    statusLabel = 'Thinking...';
    statusClass = 'status loading';
  } else if (state.status === 'error') {
    statusLabel = 'Error';
    statusClass = 'status error';
  } else if (state.contextDirty) {
    statusLabel = 'Needs refresh';
    statusClass = 'status stale';
  }
  const responseBlock = state.response
    ? `<pre>${escapeHtml(state.response)}</pre>`
    : '<p class="placeholder">LLM answers appear here.</p>';
  const errorBlock = state.error ? `<div class="error-banner">${escapeHtml(state.error)}</div>` : '';

  return `
    <div class="conversation-node" data-node-id="${nodeId}">
      <div class="node-meta">
        <span class="parents" title="${escapeHtml(parentLabel)}">${escapeHtml(parentLabel)}</span>
        <span class="${statusClass}">${statusLabel}</span>
      </div>
      <div class="prompt-row">
        <input class="prompt-input" id="prompt-input-${nodeId}" name="prompt-${nodeId}" type="text" value="${escapeHtml(state.prompt)}" placeholder="Ask something..." aria-label="Prompt input" />
        <button class="send-btn" ${state.status === 'loading' ? 'disabled' : ''}>${state.status === 'loading' ? '...' : 'Send'}</button>
      </div>
      ${errorBlock}
      <div class="response-pane">${responseBlock}</div>
      <div class="node-footer">
        <button class="child-btn">Add child</button>
        <button class="duplicate-btn">Duplicate</button>
      </div>
    </div>
  `;
}

function attachNodeDomHandlers(nodeId) {
  const domNode = paperElement.querySelector(`.conversation-node[data-node-id="${nodeId}"]`);
  if (!domNode) return;
  const inputEl = domNode.querySelector('.prompt-input');
  const sendBtn = domNode.querySelector('.send-btn');
  const childBtn = domNode.querySelector('.child-btn');
  const duplicateBtn = domNode.querySelector('.duplicate-btn');

  inputEl?.addEventListener('input', (event) => {
    const value = event.target.value;
    updateNodeState(nodeId, { prompt: value }, { skipRender: true });
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
  const prev = nodeState.get(nodeId) || {
    prompt: '',
    response: '',
    status: 'idle',
    contextDirty: false,
    error: null
  };
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
  attachNodeTools(element);
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
      entries.push({ id: parentId, prompt: parentState.prompt, response: parentState.response });
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
    updateNodeState(nodeId, { error: 'Enter a prompt before sending.' });
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
    const childState = nodeState.get(childId) ?? {};
    const nextStatus = childState.status === 'loading' ? 'loading' : 'stale';
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
  graph.addCell(createStyledLink().set({ source: { id: parentId }, target: { id: child.id } }));
}

function duplicateNode(nodeId) {
  const element = graph.getCell(nodeId);
  if (!element) return;
  const state = nodeState.get(nodeId) ?? {};
  const newPosition = { x: element.position().x + 20, y: element.position().y + 220 };
  const duplicate = createConversationNode(newPosition, state.prompt ?? '');
  updateNodeState(duplicate.id, { response: state.response ?? '', status: 'idle', contextDirty: false });
}

function resetWorkspace(initialPrompt = 'Explain how bread is made.') {
  resetViewTransform();
  graph.clear();
  nodeState.clear();
  createConversationNode({ x: 200, y: 140 }, initialPrompt);
}

function resizePaper() {
  const rect = paperElement.getBoundingClientRect();
  paper.setDimensions(rect.width, rect.height);
}

window.addEventListener('resize', resizePaper);
resizePaper();

paper.on('blank:pointerdown', (evt) => {
  isPanning = true;
  panOrigin = { x: evt.clientX, y: evt.clientY };
  const { tx, ty } = getPaperTranslation();
  translationOrigin = { x: tx, y: ty };
  document.body.style.cursor = 'grabbing';
});

window.addEventListener('pointermove', (evt) => {
  if (!isPanning) return;
  const dx = evt.clientX - panOrigin.x;
  const dy = evt.clientY - panOrigin.y;
  paper.translate(translationOrigin.x + dx, translationOrigin.y + dy);
});

window.addEventListener('pointerup', () => {
  if (!isPanning) return;
  isPanning = false;
  document.body.style.cursor = '';
});

paperElement.addEventListener(
  'wheel',
  (evt) => {
    if (!evt.ctrlKey && !evt.metaKey) return;
    evt.preventDefault();
    const delta = evt.deltaY > 0 ? -0.1 : 0.1;
    currentScale = Math.min(1.6, Math.max(0.5, currentScale + delta));
    paper.scale(currentScale, currentScale);
  },
  { passive: false }
);

paper.on('blank:pointerdblclick', (_evt, x, y) => {
  createConversationNode({ x, y });
});

newNodeButton?.addEventListener('click', () => {
  const rect = paperElement.getBoundingClientRect();
  const { tx, ty } = getPaperTranslation();
  const x = (rect.width / 2 - tx) / currentScale;
  const y = (rect.height / 2 - ty) / currentScale;
  createConversationNode({ x, y });
});

resetButton?.addEventListener('click', () => resetWorkspace());

function applyTemplate(type) {
  resetViewTransform();
  graph.clear();
  nodeState.clear();
  if (type === 'bread') {
    const main = createConversationNode({ x: 40, y: 80 }, 'Explain how bread is made.');
    const baking = createConversationNode({ x: 440, y: 40 }, 'What happens during baking chemically?');
    const recipe = createConversationNode({ x: 440, y: 220 }, 'I want a really soft bread. Give me a recipe.');
    graph.addCell(createStyledLink().set({ source: { id: main.id }, target: { id: baking.id } }));
    graph.addCell(createStyledLink().set({ source: { id: main.id }, target: { id: recipe.id } }));
  } else if (type === 'science') {
    const core = createConversationNode({ x: 40, y: 60 }, 'Summarize quantum entanglement.');
    const eli5 = createConversationNode({ x: 460, y: 0 }, 'Explain it like I am five.');
    const compare = createConversationNode({ x: 460, y: 140 }, 'Compare entanglement to classical correlation.');
    const apply = createConversationNode({ x: 460, y: 280 }, 'List real-world systems where entanglement is useful.');
    graph.addCell(createStyledLink().set({ source: { id: core.id }, target: { id: eli5.id } }));
    graph.addCell(createStyledLink().set({ source: { id: core.id }, target: { id: compare.id } }));
    graph.addCell(createStyledLink().set({ source: { id: core.id }, target: { id: apply.id } }));
  } else {
    createConversationNode({ x: 80, y: 60 }, 'New root idea');
    createConversationNode({ x: 420, y: 60 }, 'Another branch');
    createConversationNode({ x: 420, y: 220 }, 'Third branch');
  }
}

Array.from(document.querySelectorAll('.quick-actions button')).forEach((button) => {
  button.addEventListener('click', () => applyTemplate(button.dataset.template));
});

resetWorkspace();

graph.on('add', (cell) => {
  if (cell.isLink()) {
    console.debug('[Graph] Link added', cell.id, 'source:', cell.get('source'), 'target:', cell.get('target'));
    console.debug('[Graph] Link attrs', cell.get('attrs'));
    requestAnimationFrame(() => {
      const view = paper.findViewByModel(cell);
      const pathEl = view?.el?.querySelector('path');
      if (pathEl) {
        const computed = window.getComputedStyle(pathEl);
        console.debug('[Graph] Path d:', pathEl.getAttribute('d'), 'stroke:', computed.stroke, 'stroke-width:', computed.strokeWidth);
      } else {
        console.warn('[Graph] No path element found for link', cell.id);
      }
    });
    const targetId = cell.get('target')?.id;
    if (targetId) {
      renderNode(targetId);
    }
  }
});

graph.on('change:target', (link) => {
  console.debug('[Graph] Link target changed', link.id, 'new target:', link.get('target'));
  requestAnimationFrame(() => {
    const view = paper.findViewByModel(link);
    const pathEl = view?.el?.querySelector('path');
    if (pathEl) {
      console.debug('[Graph] Target change path d:', pathEl.getAttribute('d'));
    }
  });
  const targetId = link.get('target')?.id;
  if (targetId) {
    renderNode(targetId);
  }
});

graph.on('remove', (cell) => {
  if (cell.isLink()) {
    console.debug('[Graph] Link removed', cell.id, 'last target:', cell.previous('target'));
    const targetId = cell.previous('target')?.id;
    if (targetId) {
      renderNode(targetId);
    }
  }
});
