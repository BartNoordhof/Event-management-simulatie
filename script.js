document.addEventListener('DOMContentLoaded', () => {

    // --- CONFIGURATION & CONSTANTS ---
    const GRID_COLS = 50;
    const GRID_ROWS = 30;
    const CELL_SIZE = 20;

    const SIMULATION_SPEED = 2; // 1 = normal, 2 = 2x speed
    const TOTAL_VISITORS = 500;
    const VISITOR_SPAWN_RATE = 5; // Visitors per update cycle

    const CROWD_DENSITY_WARN_THRESHOLD = 5; // visitors per cell
    const CROWD_DENSITY_CRITICAL_THRESHOLD = 8; // visitors per cell

    // Asset definitions
    const ASSET_CONFIG = {
        'ENTRANCE': { width: 3, height: 1, icon: 'assets/icons/Ingangspoortjes.png' },
        'EXIT': { width: 2, height: 1, icon: 'assets/icons/Nooduitgang.png' },
        'STAGE': { width: 5, height: 3, icon: 'assets/icons/Podium.png' },
        'FOOD': { width: 2, height: 2, icon: 'assets/icons/Eten_en_Drinken.png', capacity: 10 },
        'TOILET': { width: 2, height: 2, icon: 'assets/icons/Toilet.png', capacity: 8 },
    };

    // Visitor satisfaction colors
    const SATISFACTION_COLORS = {
        HAPPY: 'rgba(46, 204, 113, 0.9)',   // Green
        NEUTRAL: 'rgba(241, 196, 15, 0.9)', // Yellow
        UNHAPPY: 'rgba(231, 76, 60, 0.9)'    // Red
    };

    // --- GAME STATE ---
    let gameState = 'DESIGN'; // DESIGN, RUNNING, PAUSED
    let placedAssets = [];
    let selectedAssetType = null;
    let visitors = [];
    let assetImages = {};
    let simulationTime = 8 * 60; // Start at 08:00
    let lastTimestamp = 0;
    let visitorIdCounter = 0;
    let walkabilityGrid = [];
    
    // --- DOM ELEMENTS ---
    const canvas = document.getElementById('simulation-canvas');
    const ctx = canvas.getContext('2d');
    const toolbarItems = document.querySelectorAll('.asset-item');
    const startBtn = document.getElementById('start-btn');
    const pauseBtn = document.getElementById('pause-btn');
    const resetBtn = document.getElementById('reset-btn');
    const messageLog = document.getElementById('message-log');
    // Status UI
    const satisfactionUI = document.getElementById('satisfaction-value');
    const visitorCountUI = document.getElementById('visitor-count');
    const simTimeUI = document.getElementById('sim-time');
    // Modal UI
    const scheduleModal = document.getElementById('schedule-modal');
    const closeModalBtn = document.querySelector('.close-button');
    const saveScheduleBtn = document.getElementById('save-schedule-btn');
    const scheduleInput = document.getElementById('schedule-input');
    let activeStageForModal = null;


    // --- INITIALIZATION ---
    function init() {
        canvas.width = GRID_COLS * CELL_SIZE;
        canvas.height = GRID_ROWS * CELL_SIZE;
        loadAssetImages();
        setupEventListeners();
        resetSimulation(); // Initial setup
        requestAnimationFrame(gameLoop);
    }

    function loadAssetImages() {
        for (const type in ASSET_CONFIG) {
            assetImages[type] = new Image();
            assetImages[type].src = ASSET_CONFIG[type].icon;
        }
    }

    // --- EVENT LISTENERS ---
    function setupEventListeners() {
        toolbarItems.forEach(item => {
            item.addEventListener('click', () => {
                if (gameState !== 'DESIGN') return;
                selectedAssetType = item.dataset.assetType;
                toolbarItems.forEach(i => i.classList.remove('selected'));
                item.classList.add('selected');
                canvas.style.cursor = 'copy';
            });
        });

        canvas.addEventListener('mousemove', handleCanvasMouseMove);
        canvas.addEventListener('mousedown', handleCanvasClick);
        canvas.addEventListener('contextmenu', e => {
            e.preventDefault();
            deselectAsset();
        });
        document.addEventListener('keydown', e => {
            if (e.key === 'Escape') deselectAsset();
        });

        startBtn.addEventListener('click', startSimulation);
        pauseBtn.addEventListener('click', pauseSimulation);
        resetBtn.addEventListener('click', resetSimulation);
        
        closeModalBtn.addEventListener('click', closeScheduleModal);
        saveScheduleBtn.addEventListener('click', saveSchedule);
    }

    // --- CORE GAME LOOP ---
    function gameLoop(timestamp) {
        const deltaTime = (timestamp - lastTimestamp) / 1000;
        lastTimestamp = timestamp;

        if (gameState === 'RUNNING') {
            updateSimulation(deltaTime * SIMULATION_SPEED);
        }

        draw();
        requestAnimationFrame(gameLoop);
    }

    // --- DRAWING FUNCTIONS ---
    function draw() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        drawGrid();
        drawAssets();

        if (gameState === 'RUNNING' || gameState === 'PAUSED') {
            drawVisitors();
        }
        
        if (gameState === 'DESIGN' && selectedAssetType) {
            drawPlacementPreview();
        }
    }

    function drawGrid() {
        ctx.strokeStyle = '#e0e0e0';
        ctx.lineWidth = 1;
        for (let x = 0; x <= GRID_COLS; x++) {
            ctx.beginPath();
            ctx.moveTo(x * CELL_SIZE, 0);
            ctx.lineTo(x * CELL_SIZE, canvas.height);
            ctx.stroke();
        }
        for (let y = 0; y <= GRID_ROWS; y++) {
            ctx.beginPath();
            ctx.moveTo(0, y * CELL_SIZE);
            ctx.lineTo(canvas.width, y * CELL_SIZE);
            ctx.stroke();
        }
    }

    function drawAssets() {
        placedAssets.forEach(asset => {
            const img = assetImages[asset.type];
            if (img.complete) {
                ctx.drawImage(
                    img, 
                    asset.x * CELL_SIZE, 
                    asset.y * CELL_SIZE, 
                    asset.width * CELL_SIZE, 
                    asset.height * CELL_SIZE
                );
            }
        });
    }

    function drawVisitors() {
        visitors.forEach(visitor => {
            ctx.beginPath();
            ctx.arc(visitor.x, visitor.y, 3, 0, Math.PI * 2);
            ctx.fillStyle = visitor.getColor();
            ctx.fill();
        });
    }

    function drawPlacementPreview() {
        const [gridX, gridY] = getMouseGridCoords();
        if (gridX === -1) return;

        const asset = ASSET_CONFIG[selectedAssetType];
        const isValid = isValidPlacement(gridX, gridY, asset);
        
        ctx.globalAlpha = 0.5;
        ctx.fillStyle = isValid ? 'green' : 'red';
        ctx.fillRect(
            gridX * CELL_SIZE, 
            gridY * CELL_SIZE, 
            asset.width * CELL_SIZE, 
            asset.height * CELL_SIZE
        );
        ctx.globalAlpha = 1.0;
    }

    // --- DESIGN PHASE LOGIC ---
    function handleCanvasMouseMove() {
        if (gameState !== 'DESIGN' || !selectedAssetType) return;
        // Drawing is handled by the game loop's drawPlacementPreview
    }

    function handleCanvasClick(e) {
        if (gameState !== 'DESIGN') return;
        const [gridX, gridY] = getMouseGridCoords(e);

        if (selectedAssetType) {
            // Place asset
            const assetInfo = ASSET_CONFIG[selectedAssetType];
            if (isValidPlacement(gridX, gridY, assetInfo)) {
                const newAsset = {
                    id: Date.now(),
                    type: selectedAssetType,
                    x: gridX,
                    y: gridY,
                    width: assetInfo.width,
                    height: assetInfo.height,
                    queue: [],
                    users: 0
                };
                if(newAsset.type === 'STAGE') newAsset.schedule = [];
                placedAssets.push(newAsset);
            }
        } else {
            // Check if clicking on a placed stage
            const clickedAsset = getAssetAt(gridX, gridY);
            if(clickedAsset && clickedAsset.type === 'STAGE'){
                openScheduleModal(clickedAsset);
            }
        }
    }

    function deselectAsset() {
        selectedAssetType = null;
        toolbarItems.forEach(i => i.classList.remove('selected'));
        canvas.style.cursor = 'default';
    }

    function isValidPlacement(gridX, gridY, asset) {
        if (gridX < 0 || gridY < 0 || gridX + asset.width > GRID_COLS || gridY + asset.height > GRID_ROWS) {
            return false;
        }
        for (const placed of placedAssets) {
            if (
                gridX < placed.x + placed.width &&
                gridX + asset.width > placed.x &&
                gridY < placed.y + placed.height &&
                gridY + asset.height > placed.y
            ) {
                return false;
            }
        }
        return true;
    }

    // --- MODAL LOGIC ---
    function openScheduleModal(stageAsset) {
        activeStageForModal = stageAsset;
        scheduleInput.value = stageAsset.schedule.map(s => `${minutesToTime(s.start)} - ${minutesToTime(s.end)}`).join('\n');
        scheduleModal.classList.remove('modal-hidden');
    }

    function closeScheduleModal() {
        scheduleModal.classList.add('modal-hidden');
        activeStageForModal = null;
    }

    function saveSchedule() {
        if (!activeStageForModal) return;
        const lines = scheduleInput.value.split('\n').filter(line => line.trim() !== '');
        const newSchedule = [];
        lines.forEach(line => {
            const parts = line.split('-').map(p => p.trim());
            if (parts.length === 2) {
                const start = timeToMinutes(parts[0]);
                const end = timeToMinutes(parts[1]);
                if (!isNaN(start) && !isNaN(end) && end > start) {
                    newSchedule.push({ start, end });
                }
            }
        });
        activeStageForModal.schedule = newSchedule;
        closeScheduleModal();
    }


    // --- SIMULATION CONTROL ---
    function startSimulation() {
        const stages = placedAssets.filter(a => a.type === 'STAGE');
        if (stages.length < 3) {
            logMessage("Error: You must place at least 3 stages to start the simulation.", 'error');
            return;
        }

        gameState = 'RUNNING';
        startBtn.disabled = true;
        pauseBtn.disabled = false;
        logMessage("Simulation started. Visitors are arriving.", 'info');
        buildWalkabilityGrid();
    }

    function pauseSimulation() {
        if (gameState === 'RUNNING') {
            gameState = 'PAUSED';
            pauseBtn.textContent = 'Resume Simulation';
            logMessage("Simulation paused.", 'info');
        } else if (gameState === 'PAUSED') {
            gameState = 'RUNNING';
            pauseBtn.textContent = 'Pause Simulation';
            logMessage("Simulation resumed.", 'info');
        }
    }

    function resetSimulation() {
        gameState = 'DESIGN';
        placedAssets = [];
        visitors = [];
        simulationTime = 8 * 60;
        visitorIdCounter = 0;
        selectedAssetType = null;
        
        startBtn.disabled = false;
        pauseBtn.disabled = true;
        pauseBtn.textContent = 'Pause Simulation';

        updateUI();
        deselectAsset();
        logMessage("Design your event site. Right-click to deselect an asset.", 'info');
    }

    // --- SIMULATION UPDATE ---
    function updateSimulation(deltaTime) {
        simulationTime += deltaTime * 60; // 1 second real time = 1 minute sim time

        spawnVisitors();
        updateVisitors(deltaTime);
        updateFacilityQueues();
        checkOvercrowding();
        updateUI();
    }
    
    function spawnVisitors() {
        if (visitors.length >= TOTAL_VISITORS) return;

        const entrances = placedAssets.filter(a => a.type === 'ENTRANCE');
        if (entrances.length === 0) return;

        for (let i = 0; i < VISITOR_SPAWN_RATE; i++) {
             if (visitors.length < TOTAL_VISITORS) {
                const entrance = entrances[Math.floor(Math.random() * entrances.length)];
                const spawnX = (entrance.x + Math.random() * entrance.width) * CELL_SIZE;
                const spawnY = (entrance.y + entrance.height + 0.5) * CELL_SIZE; 
                visitors.push(new Visitor(spawnX, spawnY));
            }
        }
    }
    
    function updateVisitors(deltaTime) {
        visitors.forEach(visitor => visitor.update(deltaTime));
        // Remove visitors who have left
        visitors = visitors.filter(v => !v.hasLeft);
    }
    
    function updateFacilityQueues() {
        placedAssets.forEach(asset => {
            if (asset.type === 'FOOD' || asset.type === 'TOILET') {
                if(asset.users > 0 && Math.random() < 0.01) { // Chance for a user to finish
                    asset.users--;
                }
                while(asset.users < ASSET_CONFIG[asset.type].capacity && asset.queue.length > 0) {
                    const visitor = asset.queue.shift();
                    visitor.state = 'using_facility';
                    visitor.stateTimer = 20 + Math.random() * 20; // Time to use facility
                    asset.users++;
                }
            }
        });
    }
    
    function checkOvercrowding() {
        const densityGrid = Array(GRID_COLS).fill(0).map(() => Array(GRID_ROWS).fill(0));
        visitors.forEach(v => {
            const gridX = Math.floor(v.x / CELL_SIZE);
            const gridY = Math.floor(v.y / CELL_SIZE);
            if (gridX >= 0 && gridX < GRID_COLS && gridY >= 0 && gridY < GRID_ROWS) {
                densityGrid[gridX][gridY]++;
            }
        });

        let accidentTriggered = false;
        for (let x = 0; x < GRID_COLS; x++) {
            for (let y = 0; y < GRID_ROWS; y++) {
                const density = densityGrid[x][y];
                if (density >= CROWD_DENSITY_WARN_THRESHOLD) {
                    visitors.forEach(v => {
                        const gridX = Math.floor(v.x / CELL_SIZE);
                        const gridY = Math.floor(v.y / CELL_SIZE);
                        if (gridX === x && gridY === y) {
                             v.satisfaction -= 0.1; // Penalty for being in a crowded area
                        }
                    });
                     if (density >= CROWD_DENSITY_CRITICAL_THRESHOLD && !accidentTriggered) {
                        logMessage("CRITICAL: Overcrowding accident! Simulation paused.", 'error');
                        pauseSimulation();
                        // Apply a large satisfaction penalty
                        visitors.forEach(v => v.satisfaction = Math.max(0, v.satisfaction - 30));
                        accidentTriggered = true;
                    }
                }
            }
        }
    }

    // --- VISITOR AI & PATHFINDING ---
    class Visitor {
        constructor(x, y) {
            this.id = visitorIdCounter++;
            this.x = x;
            this.y = y;
            this.speed = 15 + Math.random() * 10; // pixels per second
            this.satisfaction = 100; // 0-100
            this.needs = {
                hunger: Math.random() * 30,
                toilet: Math.random() * 40,
            };
            this.preferences = {
                stage: Math.floor(Math.random() * placedAssets.filter(a => a.type === 'STAGE').length)
            };
            this.state = 'wandering'; // wandering, moving_to_target, queuing, using_facility
            this.path = [];
            this.target = null;
            this.stateTimer = 0;
            this.hasLeft = false;
        }

        update(deltaTime) {
            this.updateNeeds(deltaTime);
            this.updateSatisfaction(deltaTime);
            this.makeDecision();
            this.move(deltaTime);

            if (this.satisfaction <= 0 && this.state !== 'exiting') {
                this.state = 'exiting';
                this.findAndSetExit();
            }
        }

        updateNeeds(deltaTime) {
            this.needs.hunger += deltaTime * 0.1;
            this.needs.toilet += deltaTime * 0.07;
        }
        
        updateSatisfaction(deltaTime){
            if (this.state === 'queuing') {
                this.satisfaction -= deltaTime * 2; // Decrease satisfaction faster while queuing
            } else if (this.state === 'wandering') {
                this.satisfaction -= deltaTime * 0.1; // Slowly decrease if wandering aimlessly
            }
            this.satisfaction = Math.max(0, this.satisfaction);
        }

        makeDecision() {
            if (this.state === 'moving_to_target' || this.state === 'queuing' || this.state === 'using_facility') {
                if(this.state === 'using_facility'){
                    this.stateTimer -= 1;
                    if(this.stateTimer <= 0){
                        this.state = 'wandering';
                        this.target.users--;
                        this.target = null;
                        if(this.needs.hunger > 60) this.needs.hunger = 0; else this.needs.toilet = 0;
                    }
                }
                return;
            }
            
            // Priority 1: Critical Needs
            if (this.needs.toilet > 70) {
                this.findAndSetTarget('TOILET');
                return;
            }
            if (this.needs.hunger > 60) {
                this.findAndSetTarget('FOOD');
                return;
            }

            // Priority 2: Go to a preferred stage performance
            const activeStages = getActiveStages();
            if (activeStages.length > 0) {
                const preferredStage = activeStages[this.preferences.stage % activeStages.length];
                if (preferredStage && this.target !== preferredStage) {
                     this.setTarget(preferredStage);
                     return;
                }
            }
            
            // Priority 3: Wander
            if(this.state !== 'wandering' || this.path.length === 0){
                this.state = 'wandering';
                const randomTarget = { 
                    x: Math.floor(Math.random() * GRID_COLS), 
                    y: Math.floor(Math.random() * GRID_ROWS) 
                };
                this.setPath(randomTarget.x, randomTarget.y);
            }
        }
        
        findAndSetTarget(type) {
            const facilities = placedAssets.filter(a => a.type === type);
            if (facilities.length > 0) {
                const nearest = findNearest(this, facilities);
                this.setTarget(nearest);
            }
        }
        
        findAndSetExit() {
            const exits = placedAssets.filter(a => a.type === 'EXIT' || a.type === 'ENTRANCE');
            if (exits.length > 0) {
                const nearest = findNearest(this, exits);
                this.setTarget(nearest, true);
            } else {
                 this.hasLeft = true; // No exits, just despawn
            }
        }

        setTarget(asset, isExit = false) {
            this.target = asset;
            this.state = isExit ? 'exiting' : 'moving_to_target';
            const targetCell = getWalkableNeighbor(asset.x, asset.y, asset.width, asset.height);
            if(targetCell){
                this.setPath(targetCell.x, targetCell.y);
            }
        }
        
        setPath(gridX, gridY) {
            const startX = Math.floor(this.x / CELL_SIZE);
            const startY = Math.floor(this.y / CELL_SIZE);
            this.path = findPathBFS({x: startX, y: startY}, {x: gridX, y: gridY});
        }

        move(deltaTime) {
            if (this.path.length === 0) {
                 if(this.state === 'moving_to_target'){ // Arrived at destination
                    if(this.target.type === 'FOOD' || this.target.type === 'TOILET'){
                        this.state = 'queuing';
                        this.target.queue.push(this);
                    } else {
                        this.state = 'wandering';
                    }
                 } else if (this.state === 'exiting'){
                     this.hasLeft = true;
                 }
                return;
            }

            const targetPos = this.path[0];
            const targetX = (targetPos.x + 0.5) * CELL_SIZE;
            const targetY = (targetPos.y + 0.5) * CELL_SIZE;

            const dx = targetX - this.x;
            const dy = targetY - this.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance < 1) {
                this.path.shift();
                return;
            }

            this.x += (dx / distance) * this.speed * deltaTime;
            this.y += (dy / distance) * this.speed * deltaTime;
        }
        
        getColor() {
            if (this.satisfaction > 70) return SATISFACTION_COLORS.HAPPY;
            if (this.satisfaction > 30) return SATISFACTION_COLORS.NEUTRAL;
            return SATISFACTION_COLORS.UNHAPPY;
        }
    }
    
    function buildWalkabilityGrid() {
        walkabilityGrid = Array(GRID_COLS).fill(0).map(() => Array(GRID_ROWS).fill(0));
        placedAssets.forEach(asset => {
            for (let x = asset.x; x < asset.x + asset.width; x++) {
                for (let y = asset.y; y < asset.y + asset.height; y++) {
                    if (x < GRID_COLS && y < GRID_ROWS) {
                        walkabilityGrid[x][y] = 1; // 1 means obstacle
                    }
                }
            }
        });
    }

    function findPathBFS(start, end) {
        const queue = [[start]];
        const visited = new Set([`${start.x},${start.y}`]);
        const directions = [[0, 1], [0, -1], [1, 0], [-1, 0]]; // Down, Up, Right, Left

        while (queue.length > 0) {
            const path = queue.shift();
            const { x, y } = path[path.length - 1];

            if (x === end.x && y === end.y) {
                return path.slice(1); // Return path without the starting point
            }

            for (const [dx, dy] of directions) {
                const newX = x + dx;
                const newY = y + dy;
                const key = `${newX},${newY}`;

                if (newX >= 0 && newX < GRID_COLS && newY >= 0 && newY < GRID_ROWS &&
                    walkabilityGrid[newX][newY] === 0 && !visited.has(key)) {
                    
                    visited.add(key);
                    const newPath = [...path, { x: newX, y: newY }];
                    queue.push(newPath);
                }
            }
        }
        return []; // No path found
    }

    // --- UTILITY FUNCTIONS ---
    function getMouseGridCoords(e) {
        const rect = canvas.getBoundingClientRect();
        const mouseX = e ? e.clientX - rect.left : -1;
        const mouseY = e ? e.clientY - rect.top : -1;
        
        if(mouseX < 0 || mouseY < 0) return [-1, -1];
        
        const gridX = Math.floor(mouseX / CELL_SIZE);
        const gridY = Math.floor(mouseY / CELL_SIZE);
        return [gridX, gridY];
    }
    
    function getAssetAt(gridX, gridY) {
        return placedAssets.find(asset => 
            gridX >= asset.x && gridX < asset.x + asset.width &&
            gridY >= asset.y && gridY < asset.y + asset.height
        );
    }
    
    function findNearest(visitor, facilities) {
        let nearest = null;
        let minDistance = Infinity;
        facilities.forEach(facility => {
            const distance = Math.hypot(facility.x * CELL_SIZE - visitor.x, facility.y * CELL_SIZE - visitor.y);
            if(distance < minDistance){
                minDistance = distance;
                nearest = facility;
            }
        });
        return nearest;
    }
    
    function getWalkableNeighbor(assetX, assetY, assetW, assetH){
        // Try to find a walkable cell just below the asset
        for(let x = assetX; x < assetX + assetW; x++){
            const y = assetY + assetH;
            if(x >= 0 && x < GRID_COLS && y >= 0 && y < GRID_ROWS && walkabilityGrid[x][y] === 0){
                return {x, y};
            }
        }
        // If not found, try above
        for(let x = assetX; x < assetX + assetW; x++){
            const y = assetY - 1;
            if(x >= 0 && x < GRID_COLS && y >= 0 && y < GRID_ROWS && walkabilityGrid[x][y] === 0){
                return {x, y};
            }
        }
        return null; // No walkable neighbor found
    }

    function getActiveStages() {
        return placedAssets.filter(asset => 
            asset.type === 'STAGE' && 
            asset.schedule.some(s => simulationTime >= s.start && simulationTime <= s.end)
        );
    }

    function updateUI() {
        // Time
        simTimeUI.textContent = minutesToTime(simulationTime);
        // Visitors
        visitorCountUI.textContent = `${visitors.length} / ${TOTAL_VISITORS}`;
        // Satisfaction
        if (visitors.length > 0) {
            const avgSatisfaction = visitors.reduce((sum, v) => sum + v.satisfaction, 0) / visitors.length;
            satisfactionUI.textContent = `${Math.round(avgSatisfaction)}%`;
            if (avgSatisfaction > 70) satisfactionUI.style.color = SATISFACTION_COLORS.HAPPY;
            else if (avgSatisfaction > 30) satisfactionUI.style.color = SATISFACTION_COLORS.NEUTRAL;
            else satisfactionUI.style.color = SATISFACTION_COLORS.UNHAPPY;
        } else {
            satisfactionUI.textContent = '100%';
            satisfactionUI.style.color = SATISFACTION_COLORS.HAPPY;
        }
    }
    
    function minutesToTime(minutes) {
        const h = Math.floor(minutes / 60) % 24;
        const m = Math.floor(minutes % 60);
        return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    }

    function timeToMinutes(timeStr) {
        const [h, m] = timeStr.split(':').map(Number);
        return h * 60 + m;
    }
    
    function logMessage(msg, type = 'info') {
        messageLog.textContent = msg;
        messageLog.style.color = type === 'error' ? 'var(--danger-color)' : type === 'info' ? '#7f8c8d' : 'black';
    }


    // --- KICKSTART ---
    init();
});
