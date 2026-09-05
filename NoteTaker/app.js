// App State
let projects = [];
let currentProject = null;
let editingProjectId = null;
let connectMode = false;
let selectedNote = null;
let noteCounter = 0;
let connectionStartNode = null;
let history = [];
let historyIndex = -1;
let maxHistory = 50;

// DOM Elements
const dashboard = document.getElementById('dashboard');
const whiteboard = document.getElementById('whiteboard');
const projectsGrid = document.getElementById('projectsGrid');
const emptyState = document.getElementById('emptyState');
const projectModal = document.getElementById('projectModal');
const projectForm = document.getElementById('projectForm');
const projectNameInput = document.getElementById('projectName');
const projectDescriptionInput = document.getElementById('projectDescription');
const modalTitle = document.getElementById('modalTitle');
const canvas = document.getElementById('canvas');
const canvasContent = document.getElementById('canvasContent');
const connectionsLayer = document.getElementById('connectionsLayer');
const projectTitle = document.getElementById('projectTitle');
const formatToolbar = document.getElementById('formatToolbar');

// Initialize
function init() {
    loadProjects();
    renderProjects();
    setupEventListeners();
}

// Load projects from localStorage
function loadProjects() {
    const stored = localStorage.getItem('projectBoardProjects');
    if (stored) {
        try {
            projects = JSON.parse(stored);
        } catch (e) {
            console.error('Error loading projects:', e);
            projects = [];
        }
    }
}

// Save projects to localStorage
function saveProjects() {
    try {
        localStorage.setItem('projectBoardProjects', JSON.stringify(projects));
    } catch (e) {
        console.error('Error saving projects:', e);
        alert('Storage full! Try exporting some projects to free up space.');
    }
}

// Render projects grid
function renderProjects() {
    projectsGrid.innerHTML = '';
    
    if (projects.length === 0) {
        emptyState.style.display = 'block';
        return;
    }
    
    emptyState.style.display = 'none';
    
    projects.forEach(project => {
        const card = document.createElement('div');
        card.className = 'project-card';
        card.innerHTML = `
            <h3>${escapeHtml(project.name)}</h3>
            <p>${escapeHtml(project.description || 'No description')}</p>
            <div class="card-actions">
                <button class="edit-btn" data-id="${project.id}" title="Edit">✏️</button>
                <button class="delete-btn" data-id="${project.id}" title="Delete">🗑️</button>
            </div>
        `;
        
        // Click on card to open project
        card.addEventListener('click', (e) => {
            if (!e.target.classList.contains('edit-btn') && !e.target.classList.contains('delete-btn')) {
                openProject(project.id);
            }
        });
        
        // Edit button
        const editBtn = card.querySelector('.edit-btn');
        editBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            editProject(project.id);
        });

        // Delete button
        const deleteBtn = card.querySelector('.delete-btn');
        deleteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            deleteProject(project.id);
        });
        
        projectsGrid.appendChild(card);
    });
}

// Delete project
function deleteProject(id) {
    if (!confirm('Are you sure you want to delete this project? This cannot be undone.')) return;
    
    projects = projects.filter(p => p.id !== id);
    saveProjects();
    renderProjects();
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Setup event listeners
function setupEventListeners() {
    // New project button
    document.getElementById('newProjectBtn').addEventListener('click', showCreateModal);
    
    // Back button
    document.getElementById('backBtn').addEventListener('click', closeWhiteboard);
    
    // Add note button
    document.getElementById('addNoteBtn').addEventListener('click', addNote);
    
    // Add image button
    document.getElementById('addImageBtn').addEventListener('click', () => {
        document.getElementById('imageInput').click();
    });
    
    // Image input
    document.getElementById('imageInput').addEventListener('change', handleImageUpload);
    
    // Connect mode button
    document.getElementById('connectModeBtn').addEventListener('click', toggleConnectMode);
    
    // Background settings button
    document.getElementById('bgSettingsBtn').addEventListener('click', () => {
        document.getElementById('bgModal').classList.remove('hidden');
    });
    
    // Close background modal
    document.getElementById('closeBgBtn').addEventListener('click', () => {
        document.getElementById('bgModal').classList.add('hidden');
    });
    
    // Background presets
    document.querySelectorAll('.bgPreset').forEach(btn => {
        btn.addEventListener('click', (e) => {
            setCanvasBackground(e.target.dataset.bg);
        });
    });
    
    // Custom background upload
    document.getElementById('bgUpload').addEventListener('change', handleBgUpload);
    
    // Clear custom background
    document.getElementById('clearBgBtn').addEventListener('click', () => {
        if (currentProject) {
            currentProject.background = null;
            currentProject.backgroundType = 'none';
            saveCurrentProject();
            applyBackground(currentProject);
        }
    });
    
    // Undo button
    document.getElementById('undoBtn').addEventListener('click', undo);
    
    // Redo button
    document.getElementById('redoBtn').addEventListener('click', redo);
    
    // Export button
    document.getElementById('exportBtn').addEventListener('click', exportProject);
    
    // Import button
    document.getElementById('importBtn').addEventListener('click', () => {
        document.getElementById('importFile').click();
    });
    
    // Import file handler
    document.getElementById('importFile').addEventListener('change', handleImport);
    
    // Format toolbar handlers
    document.getElementById('fontSizeSelect').addEventListener('change', (e) => {
        if (selectedNote) {
            const noteEl = canvasContent.querySelector(`[data-id="${selectedNote.id}"]`);
            if (noteEl) {
                const textarea = noteEl.querySelector('textarea');
                textarea.style.fontSize = e.target.value + 'px';
                selectedNote.fontSize = e.target.value;
                saveCurrentProject();
            }
        }
    });
    
    document.getElementById('textColorPicker').addEventListener('input', (e) => {
        if (selectedNote) {
            const noteEl = canvasContent.querySelector(`[data-id="${selectedNote.id}"]`);
            if (noteEl) {
                const textarea = noteEl.querySelector('textarea');
                textarea.style.color = e.target.value;
                selectedNote.textColor = e.target.value;
                saveCurrentProject();
            }
        }
    });
    
    document.getElementById('noteColorPicker').addEventListener('input', (e) => {
        if (selectedNote) {
            const noteEl = canvasContent.querySelector(`[data-id="${selectedNote.id}"]`);
            if (noteEl) {
                noteEl.style.background = e.target.value;
                selectedNote.color = e.target.value;
                saveCurrentProject();
            }
        }
    });
    
    document.getElementById('imagePositionSelect').addEventListener('change', (e) => {
        if (selectedNote) {
            selectedNote.imagePosition = e.target.value;
            saveCurrentProject();
            renderCanvas();
        }
    });
    
    // Modal cancel
    document.getElementById('cancelBtn').addEventListener('click', closeModal);
    
    // Project form submit
    projectForm.addEventListener('submit', handleProjectSubmit);
    
    // Close modal on outside click
    projectModal.addEventListener('click', (e) => {
        if (e.target === projectModal) {
            closeModal();
        }
    });
    
    // Close bg modal on outside click
    document.getElementById('bgModal').addEventListener('click', (e) => {
        if (e.target === document.getElementById('bgModal')) {
            document.getElementById('bgModal').classList.add('hidden');
        }
    });
    
    // Canvas events
    canvas.addEventListener('scroll', () => {
        if (currentProject) {
            renderConnections();
        }
    });
    
    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Delete' || e.key === 'Backspace') {
            if (selectedNote && document.activeElement.tagName !== 'TEXTAREA') {
                deleteNote(selectedNote.id);
            }
        }
        if (e.key === 'Escape') {
            if (connectMode) {
                toggleConnectMode();
            }
            closeModal();
            document.getElementById('bgModal').classList.add('hidden');
        }
        if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
            e.preventDefault();
            if (e.shiftKey) {
                redo();
            } else {
                undo();
            }
        }
    });
}

// Show create project modal
function showCreateModal() {
    editingProjectId = null;
    modalTitle.textContent = 'Create New Project';
    projectNameInput.value = '';
    projectDescriptionInput.value = '';
    projectModal.classList.remove('hidden');
    projectNameInput.focus();
}

// Show edit project modal
function editProject(id) {
    const project = projects.find(p => p.id === id);
    if (!project) return;
    
    editingProjectId = id;
    modalTitle.textContent = 'Edit Project';
    projectNameInput.value = project.name;
    projectDescriptionInput.value = project.description || '';
    projectModal.classList.remove('hidden');
    projectNameInput.focus();
}

// Close modal
function closeModal() {
    projectModal.classList.add('hidden');
}

// Handle project form submit
function handleProjectSubmit(e) {
    e.preventDefault();
    
    const name = projectNameInput.value.trim();
    const description = projectDescriptionInput.value.trim();
    
    if (!name) return;
    
    if (editingProjectId) {
        // Update existing project
        const project = projects.find(p => p.id === editingProjectId);
        if (project) {
            project.name = name;
            project.description = description;
        }
    } else {
        // Create new project
        const newProject = {
            id: Date.now(),
            name: name,
            description: description,
            notes: [],
            connections: [],
            backgroundType: 'none',
            background: null
        };
        projects.push(newProject);
    }
    
    saveProjects();
    renderProjects();
    closeModal();
}

// Open project whiteboard
function openProject(id) {
    currentProject = projects.find(p => p.id === id);
    if (!currentProject) return;
    
    projectTitle.textContent = currentProject.name;
    dashboard.classList.add('hidden');
    dashboard.classList.remove('active');
    whiteboard.classList.remove('hidden');
    whiteboard.classList.add('active');
    
    // Apply background
    applyBackground(currentProject);
    
    renderCanvas();
    saveToHistory();
}

// Close whiteboard
function closeWhiteboard() {
    if (currentProject) {
        saveCurrentProject();
    }
    currentProject = null;
    selectedNote = null;
    formatToolbar.classList.add('hidden');
    whiteboard.classList.add('hidden');
    whiteboard.classList.remove('active');
    dashboard.classList.remove('hidden');
    dashboard.classList.add('active');
    renderProjects();
}

// Apply background to canvas
function applyBackground(project) {
    canvasContent.style.background = '';
    canvasContent.style.backgroundImage = '';
    canvasContent.style.backgroundSize = '';
    
    if (!project) return;
    
    switch (project.backgroundType) {
        case 'dots':
            canvasContent.style.backgroundImage = 'radial-gradient(#ccc 1px, transparent 1px)';
            canvasContent.style.backgroundSize = '20px 20px';
            break;
        case 'grid':
            canvasContent.style.backgroundImage = `
                linear-gradient(to right, #eee 1px, transparent 1px),
                linear-gradient(to bottom, #eee 1px, transparent 1px)
            `;
            canvasContent.style.backgroundSize = '20px 20px';
            break;
        case 'lines':
            canvasContent.style.backgroundImage = 'linear-gradient(to bottom, #eee 1px, transparent 1px)';
            canvasContent.style.backgroundSize = '100% 30px';
            break;
        case 'gradient1':
            canvasContent.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
            break;
        case 'gradient2':
            canvasContent.style.background = 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)';
            break;
        case 'gradient3':
            canvasContent.style.background = 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)';
            break;
        case 'dark':
            canvasContent.style.background = '#1a1a2e';
            break;
        case 'custom':
            if (project.background) {
                canvasContent.style.backgroundImage = `url(${project.background})`;
                canvasContent.style.backgroundSize = 'cover';
                canvasContent.style.backgroundPosition = 'center';
            }
            break;
    }
}

// Set canvas background
function setCanvasBackground(type) {
    if (currentProject) {
        currentProject.backgroundType = type;
        currentProject.background = null;
        saveCurrentProject();
        applyBackground(currentProject);
    }
}

// Handle background upload
function handleBgUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(event) {
        if (currentProject) {
            currentProject.backgroundType = 'custom';
            currentProject.background = event.target.result;
            saveCurrentProject();
            applyBackground(currentProject);
        }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
}

// Render canvas with notes and connections
function renderCanvas() {
    canvasContent.innerHTML = '';
    connectionsLayer.innerHTML = '';
    
    if (!currentProject) return;
    
    // Render notes
    currentProject.notes.forEach(note => {
        renderNote(note);
    });
    
    // Draw connections
    renderConnections();
}

// Render connections
function renderConnections() {
    connectionsLayer.innerHTML = '';
    
    if (!currentProject) return;
    
    currentProject.connections.forEach(conn => {
        drawConnection(conn.from, conn.to);
    });
}

// Draw a single connection
function drawConnection(fromId, toId) {
    const fromNote = currentProject.notes.find(n => n.id === fromId);
    const toNote = currentProject.notes.find(n => n.id === toId);
    
    if (!fromNote || !toNote) return;
    
    const fromEl = canvasContent.querySelector(`[data-id="${fromId}"]`);
    const toEl = canvasContent.querySelector(`[data-id="${toId}"]`);
    
    if (!fromEl || !toEl) return;
    
    // Get connection points based on closest nodes
    const fromRect = fromEl.getBoundingClientRect();
    const toRect = toEl.getBoundingClientRect();
    const canvasRect = canvasContent.getBoundingClientRect();
    
    // Calculate centers
    const fromCenterX = fromRect.left + fromRect.width / 2 - canvasRect.left + canvasContent.scrollLeft;
    const fromCenterY = fromRect.top + fromRect.height / 2 - canvasRect.top + canvasContent.scrollTop;
    const toCenterX = toRect.left + toRect.width / 2 - canvasRect.left + canvasContent.scrollLeft;
    const toCenterY = toRect.top + toRect.height / 2 - canvasRect.top + canvasContent.scrollTop;
    
    // Determine best connection points
    const dx = toCenterX - fromCenterX;
    const dy = toCenterY - fromCenterY;
    
    let x1, y1, x2, y2;
    
    // Choose connection point on from node
    if (Math.abs(dx) > Math.abs(dy)) {
        // Horizontal connection
        x1 = dx > 0 ? fromRect.right - canvasRect.left + canvasContent.scrollLeft : fromRect.left - canvasRect.left + canvasContent.scrollLeft;
        x2 = dx > 0 ? toRect.left - canvasRect.left + canvasContent.scrollLeft : toRect.right - canvasRect.left + canvasContent.scrollLeft;
        y1 = fromCenterY;
        y2 = toCenterY;
    } else {
        // Vertical connection
        y1 = dy > 0 ? fromRect.bottom - canvasRect.top + canvasContent.scrollTop : fromRect.top - canvasRect.top + canvasContent.scrollTop;
        y2 = dy > 0 ? toRect.top - canvasRect.top + canvasContent.scrollTop : toRect.bottom - canvasRect.top + canvasContent.scrollTop;
        x1 = fromCenterX;
        x2 = toCenterX;
    }
    
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('x1', x1);
    line.setAttribute('y1', y1);
    line.setAttribute('x2', x2);
    line.setAttribute('y2', y2);
    line.classList.add('connection-line');
    line.dataset.from = fromId;
    line.dataset.to = toId;
    
    // Double click to delete connection
    line.addEventListener('dblclick', () => {
        if (confirm('Delete this connection?')) {
            currentProject.connections = currentProject.connections.filter(
                c => !(c.from === fromId && c.to === toId)
            );
            saveCurrentProject();
            renderConnections();
        }
    });
    
    connectionsLayer.appendChild(line);
}

// Render a single note
function renderNote(noteData) {
    const note = document.createElement('div');
    note.className = 'note';
    note.dataset.id = noteData.id;
    note.style.left = noteData.x + 'px';
    note.style.top = noteData.y + 'px';
    note.style.background = noteData.color || '#fef3c7';
    
    if (noteData.fontSize) {
        note.style.fontSize = noteData.fontSize + 'px';
    }
    
    // Delete button
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'note-delete';
    deleteBtn.textContent = '×';
    deleteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        deleteNote(noteData.id);
    });
    note.appendChild(deleteBtn);
    
    // Add image if exists and position is top
    if (noteData.image && noteData.imagePosition === 'top') {
        const img = document.createElement('img');
        img.src = noteData.image;
        img.className = 'note-image';
        note.appendChild(img);
    }
    
    // Textarea
    const textarea = document.createElement('textarea');
    textarea.placeholder = 'Write your note...';
    textarea.value = noteData.text || '';
    textarea.style.color = noteData.textColor || '#000000';
    if (noteData.fontSize) {
        textarea.style.fontSize = noteData.fontSize + 'px';
    }
    
    textarea.addEventListener('input', () => {
        noteData.text = textarea.value;
        saveCurrentProject();
    });
    
    textarea.addEventListener('focus', () => {
        selectNoteForFormatting(noteData, note);
    });
    
    note.appendChild(textarea);
    
    // Add image if exists and position is bottom or not set
    if (noteData.image && noteData.imagePosition !== 'top') {
        const img = document.createElement('img');
        img.src = noteData.image;
        img.className = 'note-image';
        note.appendChild(img);
    }
    
    // Connection nodes
    const directions = ['top', 'right', 'bottom', 'left'];
    directions.forEach(dir => {
        const node = document.createElement('div');
        node.className = `connection-node node-${dir}`;
        node.dataset.direction = dir;
        node.dataset.noteId = noteData.id;
        
        node.addEventListener('mousedown', (e) => {
            e.stopPropagation();
            startConnection(node, noteData.id, dir);
        });
        
        note.appendChild(node);
    });
    
    // Make draggable
    makeDraggable(note, noteData);
    
    // Select on click
    note.addEventListener('click', (e) => {
        if (!e.target.classList.contains('connection-node')) {
            e.stopPropagation();
            selectNoteForFormatting(noteData, note);
        }
    });
    
    canvasContent.appendChild(note);
}

// Select note for formatting
function selectNoteForFormatting(noteData, noteEl) {
    selectedNote = noteData;
    
    // Update toolbar
    formatToolbar.classList.remove('hidden');
    document.getElementById('fontSizeSelect').value = noteData.fontSize || '16';
    document.getElementById('textColorPicker').value = noteData.textColor || '#000000';
    document.getElementById('noteColorPicker').value = noteData.color || '#fef3c7';
    document.getElementById('imagePositionSelect').value = noteData.imagePosition || 'bottom';
}

// Make note draggable
function makeDraggable(element, noteData) {
    let isDragging = false;
    let startX, startY, initialX, initialY;
    
    element.addEventListener('mousedown', (e) => {
        if (e.target.tagName === 'TEXTAREA' || 
            e.target.classList.contains('note-delete') ||
            e.target.classList.contains('connection-node') ||
            e.target.classList.contains('note-image')) {
            return;
        }
        
        isDragging = true;
        startX = e.clientX;
        startY = e.clientY;
        initialX = noteData.x;
        initialY = noteData.y;
        
        element.style.zIndex = 1000;
    });
    
    document.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        
        const dx = e.clientX - startX;
        const dy = e.clientY - startY;
        
        noteData.x = initialX + dx;
        noteData.y = initialY + dy;
        
        element.style.left = noteData.x + 'px';
        element.style.top = noteData.y + 'px';
        
        // Redraw connections
        renderConnections();
    });
    
    document.addEventListener('mouseup', () => {
        if (isDragging) {
            isDragging = false;
            element.style.zIndex = '';
            saveCurrentProject();
        }
    });
}

// Start connection
function startConnection(node, noteId, direction) {
    if (!connectMode) return;
    
    connectionStartNode = { noteId, direction, node };
    node.classList.add('active');
    
    // Create temporary line
    const tempLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    tempLine.id = 'temp-connection';
    tempLine.classList.add('connection-line');
    tempLine.style.strokeDasharray = '5,5';
    connectionsLayer.appendChild(tempLine);
    
    const mouseMoveHandler = (e) => {
        const canvasRect = canvasContent.getBoundingClientRect();
        const x = e.clientX - canvasRect.left + canvasContent.scrollLeft;
        const y = e.clientY - canvasRect.top + canvasContent.scrollTop;
        
        tempLine.setAttribute('x2', x);
        tempLine.setAttribute('y2', y);
    };
    
    const mouseUpHandler = (e) => {
        document.removeEventListener('mousemove', mouseMoveHandler);
        document.removeEventListener('mouseup', mouseUpHandler);
        
        const tempLine = document.getElementById('temp-connection');
        if (tempLine) tempLine.remove();
        
        connectionStartNode.node.classList.remove('active');
        
        // Check if dropped on another node
        const target = e.target;
        if (target.classList.contains('connection-node') && target !== connectionStartNode.node) {
            const targetNoteId = target.dataset.noteId;
            
            if (targetNoteId !== connectionStartNode.noteId) {
                // Create connection
                currentProject.connections.push({
                    from: connectionStartNode.noteId,
                    to: targetNoteId
                });
                saveCurrentProject();
                renderConnections();
            }
        }
        
        connectionStartNode = null;
    };
    
    document.addEventListener('mousemove', mouseMoveHandler);
    document.addEventListener('mouseup', mouseUpHandler);
}

// Delete note
function deleteNote(id) {
    if (!confirm('Delete this note?')) return;
    
    currentProject.notes = currentProject.notes.filter(n => n.id !== id);
    currentProject.connections = currentProject.connections.filter(
        c => c.from !== id && c.to !== id
    );
    
    if (selectedNote && selectedNote.id === id) {
        selectedNote = null;
        formatToolbar.classList.add('hidden');
    }
    
    saveCurrentProject();
    renderCanvas();
    saveToHistory();
}

// Add new note
function addNote() {
    const noteData = {
        id: 'note_' + Date.now() + '_' + noteCounter++,
        x: 50 + Math.random() * 100 + canvasContent.scrollLeft,
        y: 50 + Math.random() * 100 + canvasContent.scrollTop,
        text: '',
        color: '#fef3c7',
        fontSize: 16,
        textColor: '#000000',
        image: null,
        imagePosition: 'bottom'
    };
    
    currentProject.notes.push(noteData);
    saveCurrentProject();
    renderNote(noteData);
    saveToHistory();
}

// Handle image upload
function handleImageUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(event) {
        const noteData = {
            id: 'note_' + Date.now() + '_' + noteCounter++,
            x: 100 + Math.random() * 100 + canvasContent.scrollLeft,
            y: 100 + Math.random() * 100 + canvasContent.scrollTop,
            text: '',
            image: event.target.result,
            color: '#ffffff',
            fontSize: 16,
            textColor: '#000000',
            imagePosition: 'bottom'
        };
        
        currentProject.notes.push(noteData);
        saveCurrentProject();
        renderNote(noteData);
        saveToHistory();
    };
    reader.readAsDataURL(file);
    
    // Reset input
    e.target.value = '';
}

// Toggle connect mode
function toggleConnectMode() {
    connectMode = !connectMode;
    const btn = document.getElementById('connectModeBtn');
    
    if (connectMode) {
        btn.classList.add('active');
        btn.textContent = '✓ Connected';
        connectionStartNode = null;
    } else {
        btn.classList.remove('active');
        btn.textContent = '🔗 Connect';
        connectionStartNode = null;
        document.querySelectorAll('.connection-node.active').forEach(n => n.classList.remove('active'));
        const tempLine = document.getElementById('temp-connection');
        if (tempLine) tempLine.remove();
    }
}

// History functions
function saveToHistory() {
    if (!currentProject) return;
    
    // Remove any future history if we're in the middle
    history = history.slice(0, historyIndex + 1);
    
    // Save current state
    history.push(JSON.stringify(currentProject.notes));
    history.push(JSON.stringify(currentProject.connections));
    
    if (history.length > maxHistory * 2) {
        history.shift();
        history.shift();
    } else {
        historyIndex++;
    }
}

function undo() {
    if (historyIndex < 0 || !currentProject) return;
    
    currentProject.connections = JSON.parse(history[historyIndex]);
    historyIndex--;
    currentProject.notes = JSON.parse(history[historyIndex]);
    historyIndex--;
    
    saveCurrentProject();
    renderCanvas();
}

function redo() {
    if (historyIndex >= history.length - 2 || !currentProject) return;
    
    historyIndex++;
    currentProject.notes = JSON.parse(history[historyIndex]);
    historyIndex++;
    currentProject.connections = JSON.parse(history[historyIndex]);
    
    saveCurrentProject();
    renderCanvas();
}

// Export project
function exportProject() {
    if (!currentProject) return;
    
    const dataStr = JSON.stringify(currentProject, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `${currentProject.name.replace(/[^a-z0-9]/gi, '_')}.json`;
    a.click();
    
    URL.revokeObjectURL(url);
}

// Handle import
function handleImport(e) {
    const file = e.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(event) {
        try {
            const imported = JSON.parse(event.target.result);
            
            if (!imported.id || !imported.name) {
                throw new Error('Invalid project file');
            }
            
            // Check if project already exists
            const existing = projects.find(p => p.id === imported.id);
            if (existing) {
                if (!confirm('A project with this ID already exists. Overwrite?')) {
                    return;
                }
                const index = projects.findIndex(p => p.id === imported.id);
                projects[index] = imported;
            } else {
                imported.id = Date.now(); // New ID to avoid conflicts
                projects.push(imported);
            }
            
            saveProjects();
            renderProjects();
            alert('Project imported successfully!');
        } catch (err) {
            alert('Error importing project: ' + err.message);
        }
    };
    reader.readAsText(file);
    e.target.value = '';
}

// Save current project
function saveCurrentProject() {
    if (!currentProject) return;
    
    const index = projects.findIndex(p => p.id === currentProject.id);
    if (index !== -1) {
        projects[index] = currentProject;
        saveProjects();
    }
}

// Start the app
init();
