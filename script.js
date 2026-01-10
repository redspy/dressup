// Configuration
const CONFIG = {
    categories: [
        { id: 'hair', name: 'Hair', zIndex: 50 },
        { id: 'hat', name: 'Hat', zIndex: 60 },
        { id: 'top', name: 'Top', zIndex: 30 },
        { id: 'bottom', name: 'Bottom', zIndex: 20 },
        { id: 'acc', name: 'Acc', zIndex: 40 },
        { id: 'shoes', name: 'Shoes', zIndex: 10 },
        { id: 'socks', name: 'Socks', zIndex: 15 },
        { id: 'outer', name: 'Outer', zIndex: 35 },
        { id: 'face', name: 'Face', zIndex: 55 },
        { id: 'bg', name: 'BG', zIndex: 0 }
    ],
    // Map categories to panels: 'left' or 'right'
    panels: {
        left: ['hair', 'hat', 'top', 'bottom', 'acc'],
        right: ['shoes', 'socks', 'outer', 'face', 'bg']
    },
    // Mock Data for items (10 per category)
    items: {}
};

// Initialize Mock Data
// Using generated assets where available, placeholders otherwise.
const ASSETS = {
    'top': ['assets/items/top_01.png'],
    'bottom': ['assets/items/bottom_01.png'],
    'hat': ['assets/items/hat_01.png']
};

function generateMockItems() {
    CONFIG.categories.forEach(cat => {
        CONFIG.items[cat.id] = [];
        for (let i = 0; i < 10; i++) {
            let src = '';
            // Use real asset if available
            if (ASSETS[cat.id] && ASSETS[cat.id][i]) {
                src = ASSETS[cat.id][i];
            } else {
                // Generate a colored placeholder SVG
                const color = `hsl(${Math.random() * 360}, 70%, 70%)`;
                const text = `${cat.name} ${i + 1}`;
                const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100">
                    <rect width="100" height="100" fill="${color}" rx="10" />
                    <text x="50" y="50" font-family="Arial" font-size="14" fill="white" text-anchor="middle" dy=".3em">${text}</text>
                </svg>`;
                src = 'data:image/svg+xml;base64,' + btoa(svg);
            }
            CONFIG.items[cat.id].push({
                id: `${cat.id}_${i}`,
                categoryId: cat.id,
                src: src
            });
        }
    });
}

// State
const STATE = {
    selectedCategory: { left: CONFIG.panels.left[0], right: CONFIG.panels.right[0] },
    nodes: {
        leftTabs: document.getElementById('left-tabs'),
        rightTabs: document.getElementById('right-tabs'),
        leftGrid: document.getElementById('left-grid'),
        rightGrid: document.getElementById('right-grid'),
        wearablesLayer: document.getElementById('wearables-layer'),
        resetBtn: document.getElementById('reset-btn')
    }
};

// Initialization
function init() {
    generateMockItems();
    renderTabs('left');
    renderTabs('right');
    renderGrid('left');
    renderGrid('right');
    setupGlobalEvents();
}

// Rendering
function renderTabs(panel) {
    const container = STATE.nodes[`${panel}Tabs`];
    container.innerHTML = '';

    CONFIG.panels[panel].forEach(catId => {
        const cat = CONFIG.categories.find(c => c.id === catId);
        const btn = document.createElement('button');
        btn.className = `tab-btn ${STATE.selectedCategory[panel] === catId ? 'active' : ''}`;
        btn.textContent = cat.name;
        btn.onclick = () => {
            STATE.selectedCategory[panel] = catId;
            renderTabs(panel);
            renderGrid(panel);
        };
        container.appendChild(btn);
    });
}

function renderGrid(panel) {
    const container = STATE.nodes[`${panel}Grid`];
    container.innerHTML = '';

    const currentCatId = STATE.selectedCategory[panel];
    const items = CONFIG.items[currentCatId];

    items.forEach(item => {
        const div = document.createElement('div');
        div.className = 'grid-item anim-pop';
        const img = document.createElement('img');
        img.src = item.src;
        div.appendChild(img);

        div.onclick = () => wearItem(item);

        container.appendChild(div);
    });
}

// Game Logic
function wearItem(itemData) {
    // Check if item of this category already exists? 
    // Requirement: "Center group is already present [and] cannot be added operation" 
    // -> Interpreting as "One item per category at a time". 
    // So we remove existing item of same category.

    // Find existing item
    const existing = document.querySelector(`.worn-item[data-cat="${itemData.categoryId}"]`);
    if (existing) {
        existing.remove();
    }

    const itemEl = createWornItemElement(itemData);
    STATE.nodes.wearablesLayer.appendChild(itemEl);

    // Slight random offset to make it look alive, or center it
    // Centering is better for dress up
    // But we need to account for item sizes. 
    // Since these are loose flat-lays, we might need manual positioning by user.
    // We'll spawn it at center.
    itemEl.style.left = '50%';
    itemEl.style.top = '50%';
    itemEl.style.transform = 'translate(-50%, -50%)'; // Centered
}

function createWornItemElement(itemData) {
    const div = document.createElement('div');
    div.className = 'worn-item anim-pop';
    div.dataset.cat = itemData.categoryId;

    // Set Z-Index based on category
    const catConfig = CONFIG.categories.find(c => c.id === itemData.categoryId);
    div.style.zIndex = catConfig ? catConfig.zIndex : 10;

    const img = document.createElement('img');
    img.src = itemData.src;
    img.style.width = '150px'; // Default start size
    img.style.pointerEvents = 'none'; // Click-through to div
    div.appendChild(img);

    // Controls
    const resizeHandle = document.createElement('div');
    resizeHandle.className = 'resize-handle';
    div.appendChild(resizeHandle);

    const removeBtn = document.createElement('div');
    removeBtn.className = 'remove-btn';
    removeBtn.innerHTML = '×';
    removeBtn.onclick = (e) => {
        e.stopPropagation();
        div.remove();
    };
    div.appendChild(removeBtn);

    // Interaction
    setupItemInteraction(div, resizeHandle);

    return div;
}

function setupItemInteraction(itemEl, handleEl) {
    let isDragging = false;
    let isResizing = false;
    let startX, startY;
    let startLeft, startTop;
    let startWidth;

    // Selection
    itemEl.addEventListener('mousedown', (e) => {
        if (e.target === handleEl) return; // Let handle logic take over
        e.stopPropagation(); // Don't deselect immediately
        selectItem(itemEl);

        isDragging = true;
        startX = e.clientX;
        startY = e.clientY;
        startLeft = itemEl.offsetLeft;
        startTop = itemEl.offsetTop;

        // Remove transform translate centering if present, to switch to absolute positioning
        // We need to calculate current computed position first if it was transformed
        if (itemEl.style.transform.includes('translate')) {
            const rect = itemEl.getBoundingClientRect();
            const parentRect = itemEl.parentElement.getBoundingClientRect();
            itemEl.style.transform = 'none';
            // Set left/top to current visual position relative to parent
            itemEl.style.left = (rect.left - parentRect.left) + 'px';
            itemEl.style.top = (rect.top - parentRect.top) + 'px';
            startLeft = itemEl.offsetLeft;
            startTop = itemEl.offsetTop;
        }
    });

    handleEl.addEventListener('mousedown', (e) => {
        e.stopPropagation();
        isResizing = true;
        startX = e.clientX;
        startWidth = itemEl.querySelector('img').offsetWidth;
    });

    window.addEventListener('mousemove', (e) => {
        if (isDragging) {
            const dx = e.clientX - startX;
            const dy = e.clientY - startY;
            itemEl.style.left = (startLeft + dx) + 'px';
            itemEl.style.top = (startTop + dy) + 'px';
        } else if (isResizing) {
            const dx = e.clientX - startX;
            const newWidth = Math.max(50, startWidth + dx); // Min width 50
            itemEl.querySelector('img').style.width = newWidth + 'px';
        }
    });

    window.addEventListener('mouseup', () => {
        isDragging = false;
        isResizing = false;
    });
}

function selectItem(el) {
    // Deselect all
    document.querySelectorAll('.worn-item').forEach(e => e.classList.remove('selected'));
    // Select this
    el.classList.add('selected');
}

function setupGlobalEvents() {
    // Click outside to deselect
    document.addEventListener('mousedown', (e) => {
        if (!e.target.closest('.worn-item')) {
            document.querySelectorAll('.worn-item').forEach(e => e.classList.remove('selected'));
        }
    });

    // Reset button
    STATE.nodes.resetBtn.onclick = () => {
        STATE.nodes.wearablesLayer.innerHTML = '';
    };
}

// Start
init();
