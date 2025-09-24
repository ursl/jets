class Histogram2D {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        this.gridSize = 20;
        this.data = [];
        this.is3D = false;
        this.mousePos = { x: 0, y: 0 };
        this.hoveredBin = null;
        
        // 3D rotation state (only Z-axis rotation with inclined viewpoint)
        this.rotationZ = 0;
        this.zoom = 1;
        this.isDragging = false;
        this.lastMousePos = { x: 0, y: 0 };
        
        // Fixed inclined viewpoint (looking down at an angle)
        this.viewAngle = Math.PI / 8; // 22.5 degrees inclination (less steep)
        
        // Physics parameters
        this.rapidityRange = [-4, 4]; // Rapidity range
        this.phiRange = [-Math.PI, Math.PI]; // Azimuth range
        
        // Jet data
        this.jets = [];
        this.jetCounter = 0;
        
        this.setupEventListeners();
        this.initializeEmptyHistogram();
        this.draw();
    }
    
    setupEventListeners() {
        // Mouse movement for hover effects
        this.canvas.addEventListener('mousemove', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            this.mousePos.x = e.clientX - rect.left;
            this.mousePos.y = e.clientY - rect.top;
            
            if (this.isDragging && this.is3D) {
                const deltaX = this.mousePos.x - this.lastMousePos.x;
                
                // Only rotate around Z-axis (perpendicular to the plane)
                this.rotationZ += deltaX * 0.01;
                
                this.lastMousePos = { x: this.mousePos.x, y: this.mousePos.y };
                this.update3DControls();
                this.draw();
            } else {
                this.updateHoveredBin();
            }
        });
        
        // Mouse down for 3D rotation
        this.canvas.addEventListener('mousedown', (e) => {
            if (this.is3D) {
                this.isDragging = true;
                this.lastMousePos = { x: this.mousePos.x, y: this.mousePos.y };
                this.canvas.style.cursor = 'grabbing';
            }
        });
        
        // Mouse up to stop dragging
        this.canvas.addEventListener('mouseup', () => {
            this.isDragging = false;
            this.canvas.style.cursor = this.is3D ? 'grab' : 'crosshair';
        });
        
        // Mouse leave to hide tooltip and stop dragging
        this.canvas.addEventListener('mouseleave', () => {
            this.hoveredBin = null;
            this.isDragging = false;
            this.hideTooltip();
            this.canvas.style.cursor = this.is3D ? 'grab' : 'crosshair';
        });
        
        // Wheel for zoom in 3D mode
        this.canvas.addEventListener('wheel', (e) => {
            if (this.is3D) {
                e.preventDefault();
                this.zoom += e.deltaY * -0.002;
                this.zoom = Math.max(0.3, Math.min(2, this.zoom));
                this.update3DControls();
                this.draw();
            }
        });
        
        // Generate data button
        document.getElementById('generateData').addEventListener('click', () => {
            if (this.jets.length === 0) {
                this.generateRandomData();
                this.draw();
            } else {
                alert('Please clear all jets first before generating random data.');
            }
        });
        
        // Toggle 3D button
        document.getElementById('toggle3D').addEventListener('click', () => {
            this.is3D = !this.is3D;
            this.canvas.style.cursor = this.is3D ? 'grab' : 'crosshair';
            
            // Show/hide static axis labels based on mode
            const axisLabels = document.querySelectorAll('.axis-label');
            axisLabels.forEach(label => {
                label.style.display = this.is3D ? 'none' : 'block';
            });
            
            this.update3DControls();
            this.draw();
        });
        
        // Reset 3D view button
        document.getElementById('resetView').addEventListener('click', () => {
            this.rotationZ = 0;
            this.zoom = 1;
            this.update3DControls();
            this.draw();
        });
        
        // Grid size slider
        const gridSizeSlider = document.getElementById('gridSize');
        const gridSizeValue = document.getElementById('gridSizeValue');
        
        gridSizeSlider.addEventListener('input', (e) => {
            this.gridSize = parseInt(e.target.value);
            gridSizeValue.textContent = this.gridSize;
            this.generateRandomData();
            this.draw();
        });
        
        // View angle slider
        const viewAngleSlider = document.getElementById('viewAngle');
        const viewAngleValue = document.getElementById('viewAngleValue');
        
        viewAngleSlider.addEventListener('input', (e) => {
            this.viewAngle = (parseInt(e.target.value) * Math.PI) / 180; // Convert degrees to radians
            viewAngleValue.textContent = e.target.value + '°';
            this.update3DControls();
            this.draw();
        });
        
        // Jet controls
        document.getElementById('addJet').addEventListener('click', () => {
            this.addJet();
        });
        
        document.getElementById('clearJets').addEventListener('click', () => {
            this.clearJets();
        });
    }
    
    initializeEmptyHistogram() {
        this.data = [];
        for (let i = 0; i < this.gridSize; i++) {
            this.data[i] = [];
            for (let j = 0; j < this.gridSize; j++) {
                this.data[i][j] = 0;
            }
        }
        this.updateStats();
    }
    
    generateRandomData() {
        this.data = [];
        for (let i = 0; i < this.gridSize; i++) {
            this.data[i] = [];
            for (let j = 0; j < this.gridSize; j++) {
                // Generate random values with some clustering
                const distance = Math.sqrt((i - this.gridSize/2)**2 + (j - this.gridSize/2)**2);
                const clusterFactor = Math.exp(-distance / (this.gridSize/4));
                const randomValue = Math.random() * clusterFactor * 100;
                this.data[i][j] = randomValue;
            }
        }
        this.updateStats();
    }
    
    updateStats() {
        const flatData = this.data.flat();
        const maxValue = Math.max(...flatData);
        const minValue = Math.min(...flatData);
        
        document.getElementById('totalBins').textContent = this.gridSize * this.gridSize;
        document.getElementById('maxValue').textContent = maxValue.toFixed(2);
        document.getElementById('minValue').textContent = minValue.toFixed(2);
    }
    
    // Convert grid coordinates to physics coordinates
    gridToPhysics(gridX, gridY) {
        const phi = this.phiRange[0] + (gridX / this.gridSize) * (this.phiRange[1] - this.phiRange[0]);
        const y = this.rapidityRange[0] + (gridY / this.gridSize) * (this.rapidityRange[1] - this.rapidityRange[0]);
        return { phi, y };
    }
    
    // Convert physics coordinates to grid coordinates
    physicsToGrid(y, phi) {
        const gridX = Math.floor(((phi - this.phiRange[0]) / (this.phiRange[1] - this.phiRange[0])) * this.gridSize);
        const gridY = Math.floor(((y - this.rapidityRange[0]) / (this.rapidityRange[1] - this.rapidityRange[0])) * this.gridSize);
        return { gridX, gridY };
    }
    
    // Jet management functions
    addJet() {
        const numJets = parseInt(document.getElementById('numJets').value);
        console.log('Adding', numJets, 'jets');
        
        for (let i = 0; i < numJets; i++) {
            const jet = {
                id: this.jetCounter++,
                energy: 50 + Math.random() * 100, // GeV
                rapidity: (Math.random() - 0.5) * 6, // -3 to 3
                phi: (Math.random() - 0.5) * 2 * Math.PI, // -π to π
                targetConstituentCount: Math.max(5, Math.floor((50 + Math.random() * 100) / 2)), // Default count
                constituents: []
            };
            
            this.jets.push(jet);
            this.generateJetConstituents(jet);
            console.log('Added jet', jet.id, 'with', jet.constituents.length, 'constituents');
        }
        
        this.updateJetList();
        this.updateHistogramFromJets();
    }
    
    clearJets() {
        this.jets = [];
        this.jetCounter = 0;
        this.updateJetList();
        this.initializeEmptyHistogram();
        this.draw();
    }
    
    removeJet(jetId) {
        this.jets = this.jets.filter(jet => jet.id !== jetId);
        this.updateJetList();
        this.updateHistogramFromJets();
    }
    
    updateJetList() {
        const jetList = document.getElementById('jetList');
        jetList.innerHTML = '';
        
        this.jets.forEach(jet => {
            const jetElement = document.createElement('div');
            jetElement.className = 'jet-item';
            jetElement.innerHTML = `
                <h3>Jet ${jet.id + 1}</h3>
                <div class="jet-params">
                    <div class="jet-param">
                        <label>Energy (GeV)</label>
                        <input type="number" value="${jet.energy.toFixed(1)}" min="1" max="500" step="0.1" 
                               onchange="histogram.updateJetEnergy(${jet.id}, 'energy', this.value)">
                    </div>
                    <div class="jet-param">
                        <label>Rapidity y</label>
                        <input type="number" value="${jet.rapidity.toFixed(3)}" min="-4" max="4" step="0.001" 
                               onchange="histogram.updateJetEnergy(${jet.id}, 'rapidity', this.value)">
                    </div>
                    <div class="jet-param">
                        <label>Azimuth φ (rad)</label>
                        <input type="number" value="${jet.phi.toFixed(3)}" min="-3.14159" max="3.14159" step="0.001" 
                               onchange="histogram.updateJetEnergy(${jet.id}, 'phi', this.value)">
                    </div>
                    <div class="jet-param">
                        <label>Total Energy (GeV)</label>
                        <input type="number" value="${jet.constituents.reduce((sum, c) => sum + c.energy, 0).toFixed(1)}" readonly>
                    </div>
                    <div class="jet-param">
                        <label>Constituents</label>
                        <input type="number" value="${jet.constituents.length}" min="1" max="100" step="1" 
                               onchange="histogram.updateJetConstituentCount(${jet.id}, this.value)">
                    </div>
                </div>
                <div class="jet-actions">
                    <button onclick="histogram.removeJet(${jet.id})" class="remove-jet">Remove</button>
                </div>
            `;
            jetList.appendChild(jetElement);
        });
    }
    
    updateJetEnergy(jetId, property, value) {
        const jet = this.jets.find(j => j.id === jetId);
        if (jet) {
            jet[property] = parseFloat(value);
            this.generateJetConstituents(jet);
            this.updateHistogramFromJets();
        }
    }
    
    updateJetConstituentCount(jetId, count) {
        const jet = this.jets.find(j => j.id === jetId);
        if (jet) {
            const numCount = parseInt(count);
            if (numCount >= 1 && numCount <= 100) {
                jet.targetConstituentCount = numCount;
                this.generateJetConstituents(jet);
                this.updateHistogramFromJets();
            } else {
                alert('Constituent count must be between 1 and 100');
                // Reset the input to the current value
                this.updateJetList();
            }
        }
    }
    
    // Simplified fragmentation model
    generateJetConstituents(jet) {
        jet.constituents = [];
        
        // Use specified count or calculate based on energy
        const numConstituents = jet.targetConstituentCount || Math.max(5, Math.floor(jet.energy / 2));
        
        // Generate energy fractions using exponential distribution
        const energyFractions = [];
        let totalFraction = 0;
        
        for (let i = 0; i < numConstituents; i++) {
            // Exponential fall-off with random fluctuations
            const baseFraction = Math.exp(-i * 0.3);
            const randomFactor = 0.8 + Math.random() * 0.4; // 0.8 to 1.2
            const fraction = baseFraction * randomFactor;
            energyFractions.push(fraction);
            totalFraction += fraction;
        }
        
        // Normalize fractions to ensure energy conservation
        for (let i = 0; i < numConstituents; i++) {
            const normalizedFraction = energyFractions[i] / totalFraction;
            const constituentEnergy = jet.energy * normalizedFraction;
            
            // Only add constituents with meaningful energy (> 0.1 GeV)
            if (constituentEnergy > 0.1) {
                // Angular distribution around jet axis (Gaussian)
                const deltaR = Math.sqrt(-2 * Math.log(Math.random())) * 0.3; // R = sqrt(Δy² + Δφ²)
                const angle = Math.random() * 2 * Math.PI;
                
                const deltaY = deltaR * Math.cos(angle);
                const deltaPhi = deltaR * Math.sin(angle);
                
                jet.constituents.push({
                    energy: constituentEnergy,
                    rapidity: jet.rapidity + deltaY,
                    phi: jet.phi + deltaPhi
                });
            }
        }
        
        console.log(`Jet ${jet.id}: Generated ${jet.constituents.length} constituents, total energy: ${jet.constituents.reduce((sum, c) => sum + c.energy, 0).toFixed(2)} GeV`);
        
        // Verify energy conservation
        const totalConstituentEnergy = jet.constituents.reduce((sum, c) => sum + c.energy, 0);
        const energyDifference = Math.abs(totalConstituentEnergy - jet.energy);
        if (energyDifference > 0.1) {
            console.warn(`Energy conservation warning: Jet ${jet.id} has ${jet.energy.toFixed(2)} GeV but constituents sum to ${totalConstituentEnergy.toFixed(2)} GeV`);
        }
    }
    
    updateHistogramFromJets() {
        console.log('Updating histogram from jets:', this.jets.length, 'jets');
        
        // Clear histogram
        this.data = [];
        for (let i = 0; i < this.gridSize; i++) {
            this.data[i] = [];
            for (let j = 0; j < this.gridSize; j++) {
                this.data[i][j] = 0;
            }
        }
        
        // Fill histogram with jet constituent energies
        this.jets.forEach(jet => {
            console.log('Processing jet:', jet.id, 'with', jet.constituents.length, 'constituents');
            jet.constituents.forEach(constituent => {
                const gridCoords = this.physicsToGrid(constituent.rapidity, constituent.phi);
                
                if (gridCoords.gridX >= 0 && gridCoords.gridX < this.gridSize && 
                    gridCoords.gridY >= 0 && gridCoords.gridY < this.gridSize) {
                    this.data[gridCoords.gridY][gridCoords.gridX] += constituent.energy;
                }
            });
        });
        
        console.log('Histogram data updated, max value:', Math.max(...this.data.flat()));
        this.updateStats();
        this.draw();
    }
    
    update3DControls() {
        document.getElementById('rotationZ').textContent = this.rotationZ.toFixed(2);
        document.getElementById('viewAngleDisplay').textContent = Math.round((this.viewAngle * 180) / Math.PI) + '°';
        document.getElementById('zoomLevel').textContent = this.zoom.toFixed(2);
    }
    
    updateHoveredBin() {
        if (this.is3D) {
            // For 3D mode, find the bar whose top face is closest to the mouse pointer
            const flatData = this.data.flat();
            const maxValue = Math.max(...flatData);
            const scale = Math.min(this.canvas.width, this.canvas.height) * 0.3;
            
            let closestBar = null;
            let minDistance = Infinity;
            
            for (let i = 0; i < this.gridSize; i++) {
                for (let j = 0; j < this.gridSize; j++) {
                    const value = this.data[i][j];
                    const normalizedValue = value / maxValue;
                    const barHeight = normalizedValue * scale;
                    
                    // Calculate 3D positions for bar corners
                    const baseX = (j - this.gridSize / 2) * scale / this.gridSize;
                    const baseY = (i - this.gridSize / 2) * scale / this.gridSize;
                    const baseZ = 0;
                    
                    // Project the top face center to 2D
                    const topCenter = {
                        x: baseX + scale / (2 * this.gridSize),
                        y: baseY + scale / (2 * this.gridSize),
                        z: baseZ + barHeight
                    };
                    
                    const projected = this.project3D(topCenter);
                    
                    // Calculate distance from mouse to top face center
                    const distance = Math.sqrt(
                        Math.pow(this.mousePos.x - projected.x, 2) + 
                        Math.pow(this.mousePos.y - projected.y, 2)
                    );
                    
                    if (distance < minDistance && distance < 60) { // 60 pixel threshold
                        minDistance = distance;
                        closestBar = { x: j, y: i, value: value };
                    }
                }
            }
            
            if (closestBar) {
                this.hoveredBin = closestBar;
                this.showTooltip();
            } else {
                this.hoveredBin = null;
                this.hideTooltip();
            }
        } else {
            // 2D mode - simple grid-based detection
            const binWidth = this.canvas.width / this.gridSize;
            const binHeight = this.canvas.height / this.gridSize;
            
            const binX = Math.floor(this.mousePos.x / binWidth);
            const binY = Math.floor(this.mousePos.y / binHeight);
            
            if (binX >= 0 && binX < this.gridSize && binY >= 0 && binY < this.gridSize) {
                this.hoveredBin = { x: binX, y: binY, value: this.data[binY][binX] };
                this.showTooltip();
            } else {
                this.hoveredBin = null;
                this.hideTooltip();
            }
        }
    }
    
    showTooltip() {
        if (!this.hoveredBin) return;
        
        const tooltip = document.getElementById('tooltip');
        const binWidth = this.canvas.width / this.gridSize;
        const binHeight = this.canvas.height / this.gridSize;
        
        // Convert grid coordinates to physics coordinates
        const physics = this.gridToPhysics(this.hoveredBin.x, this.hoveredBin.y);
        
        tooltip.innerHTML = `
            <div><strong>Bin (${this.hoveredBin.x}, ${this.hoveredBin.y})</strong></div>
            <div>φ = ${physics.phi.toFixed(3)} rad</div>
            <div>y = ${physics.y.toFixed(3)}</div>
            <div>Value = ${this.hoveredBin.value.toFixed(2)}</div>
        `;
        
        // Position tooltip away from pointer to avoid obstruction
        const tooltipOffset = 80;
        let tooltipX = this.mousePos.x + tooltipOffset;
        let tooltipY = this.mousePos.y - tooltipOffset;
        
        // Keep tooltip within canvas bounds
        if (tooltipX + 150 > this.canvas.width) {
            tooltipX = this.mousePos.x - tooltipOffset - 150;
        }
        if (tooltipY < 0) {
            tooltipY = this.mousePos.y + tooltipOffset;
        }
        
        tooltip.style.left = tooltipX + 'px';
        tooltip.style.top = tooltipY + 'px';
        tooltip.classList.add('show');
        
        // Update info panel with physics coordinates
        document.getElementById('hoveredBin').innerHTML = 
            `(${this.hoveredBin.x}, ${this.hoveredBin.y})<br/>φ = ${physics.phi.toFixed(3)} rad<br/>y = ${physics.y.toFixed(3)}<br/>Value = ${this.hoveredBin.value.toFixed(2)}`;
    }
    
    hideTooltip() {
        const tooltip = document.getElementById('tooltip');
        tooltip.classList.remove('show');
        document.getElementById('hoveredBin').textContent = 'None';
    }
    
    draw() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        if (this.is3D) {
            this.draw3D();
        } else {
            this.draw2D();
        }
    }
    
    draw2D() {
        const binWidth = this.canvas.width / this.gridSize;
        const binHeight = this.canvas.height / this.gridSize;
        const flatData = this.data.flat();
        const maxValue = Math.max(...flatData);
        
        // Clear canvas with matching background
        const gradient = this.ctx.createLinearGradient(0, 0, this.canvas.width, this.canvas.height);
        gradient.addColorStop(0, '#264653');
        gradient.addColorStop(1, '#2a9d8f');
        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        for (let i = 0; i < this.gridSize; i++) {
            for (let j = 0; j < this.gridSize; j++) {
                const value = this.data[i][j];
                
                // Set color based on value
                if (value === 0) {
                    this.ctx.fillStyle = 'white';
                } else {
                    const normalizedValue = value / maxValue;
                    const hue = (1 - normalizedValue) * 240; // Blue to red
                    this.ctx.fillStyle = `hsl(${hue}, 70%, 50%)`;
                }
                
                this.ctx.fillRect(j * binWidth, i * binHeight, binWidth, binHeight);
            }
        }
        
        // Draw grid lines
        this.ctx.strokeStyle = '#333';
        this.ctx.lineWidth = 1;
        
        // Draw vertical grid lines
        for (let j = 0; j <= this.gridSize; j++) {
            const x = j * binWidth;
            this.ctx.beginPath();
            this.ctx.moveTo(x, 0);
            this.ctx.lineTo(x, this.canvas.height);
            this.ctx.stroke();
        }
        
        // Draw horizontal grid lines
        for (let i = 0; i <= this.gridSize; i++) {
            const y = i * binHeight;
            this.ctx.beginPath();
            this.ctx.moveTo(0, y);
            this.ctx.lineTo(this.canvas.width, y);
            this.ctx.stroke();
        }
        
        // Highlight hovered bin
        if (this.hoveredBin) {
            const x = this.hoveredBin.x * binWidth;
            const y = this.hoveredBin.y * binHeight;
            
            this.ctx.strokeStyle = '#fff';
            this.ctx.lineWidth = 3;
            this.ctx.strokeRect(x, y, binWidth, binHeight);
        }
    }
    
    // 3D transformation functions
    rotateX(point, angle) {
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);
        return {
            x: point.x,
            y: point.y * cos - point.z * sin,
            z: point.y * sin + point.z * cos
        };
    }
    
    rotateY(point, angle) {
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);
        return {
            x: point.x * cos + point.z * sin,
            y: point.y,
            z: -point.x * sin + point.z * cos
        };
    }
    
    rotateZ(point, angle) {
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);
        return {
            x: point.x * cos - point.y * sin,
            y: point.x * sin + point.y * cos,
            z: point.z
        };
    }
    
    project3D(point) {
        // Apply zoom first
        let scaled = {
            x: point.x * this.zoom,
            y: point.y * this.zoom,
            z: point.z * this.zoom
        };
        
        // Apply Z-axis rotation (around the perpendicular axis)
        // Use modulo to keep rotation within reasonable bounds
        let rotationZ = this.rotationZ % (2 * Math.PI);
        let rotated = this.rotateZ(scaled, rotationZ);
        
        // Apply fixed inclined viewpoint (always looking down at an angle)
        // This prevents the view from flipping under the plane
        const inclined = this.rotateX(rotated, this.viewAngle);
        
        return {
            x: inclined.x + this.canvas.width / 2,
            y: inclined.y + this.canvas.height / 2,
            z: inclined.z
        };
    }
    
    draw3D() {
        const flatData = this.data.flat();
        const maxValue = Math.max(...flatData);
        const scale = Math.min(this.canvas.width, this.canvas.height) * 0.3;
        
        // Clear canvas with gradient background
        const gradient = this.ctx.createLinearGradient(0, 0, this.canvas.width, this.canvas.height);
        gradient.addColorStop(0, '#264653');
        gradient.addColorStop(1, '#2a9d8f');
        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Create array of bars for drawing with proper depth sorting
        const bars = [];
        
        for (let i = 0; i < this.gridSize; i++) {
            for (let j = 0; j < this.gridSize; j++) {
                const value = this.data[i][j];
                const normalizedValue = value / maxValue;
                const barHeight = normalizedValue * scale;
                
                // Calculate 3D positions for bar corners
                const baseX = (j - this.gridSize / 2) * scale / this.gridSize;
                const baseY = (i - this.gridSize / 2) * scale / this.gridSize;
                const baseZ = 0;
                
                const corners = [
                    { x: baseX, y: baseY, z: baseZ },                    // bottom-left
                    { x: baseX + scale / this.gridSize, y: baseY, z: baseZ }, // bottom-right
                    { x: baseX + scale / this.gridSize, y: baseY + scale / this.gridSize, z: baseZ }, // top-right
                    { x: baseX, y: baseY + scale / this.gridSize, z: baseZ }, // top-left
                    { x: baseX, y: baseY, z: baseZ + barHeight },                    // bottom-left-top
                    { x: baseX + scale / this.gridSize, y: baseY, z: baseZ + barHeight }, // bottom-right-top
                    { x: baseX + scale / this.gridSize, y: baseY + scale / this.gridSize, z: baseZ + barHeight }, // top-right-top
                    { x: baseX, y: baseY + scale / this.gridSize, z: baseZ + barHeight }  // top-left-top
                ];
                
                // Project all corners to 2D
                const projectedCorners = corners.map(corner => this.project3D(corner));
                
                // Calculate average Z for depth sorting
                const avgZ = projectedCorners.reduce((sum, corner) => sum + corner.z, 0) / projectedCorners.length;
                
                bars.push({
                    i, j, value, normalizedValue, barHeight,
                    corners: projectedCorners,
                    avgZ: avgZ
                });
            }
        }
        
        // Sort bars by depth (back to front) for proper rendering
        bars.sort((a, b) => a.avgZ - b.avgZ);
        
        // Draw bars with proper solid appearance
        bars.forEach(bar => {
            const { corners, normalizedValue, value } = bar;
            
            // Define faces with different colors for depth perception
            let faces;
            if (value === 0) {
                // White faces for zero-energy bins
                faces = [
                    // Top face (brightest)
                    { corners: [corners[4], corners[5], corners[6], corners[7]], color: 'white' },
                    // Front face
                    { corners: [corners[0], corners[1], corners[5], corners[4]], color: 'white' },
                    // Right face
                    { corners: [corners[1], corners[2], corners[6], corners[5]], color: 'white' },
                    // Back face
                    { corners: [corners[2], corners[3], corners[7], corners[6]], color: 'white' },
                    // Left face
                    { corners: [corners[3], corners[0], corners[4], corners[7]], color: 'white' },
                    // Bottom face (darkest)
                    { corners: [corners[0], corners[3], corners[2], corners[1]], color: 'white' }
                ];
            } else {
                // Color faces based on energy value
                faces = [
                    // Top face (brightest)
                    { corners: [corners[4], corners[5], corners[6], corners[7]], color: `hsl(${(1 - normalizedValue) * 240}, 70%, 70%)` },
                    // Front face
                    { corners: [corners[0], corners[1], corners[5], corners[4]], color: `hsl(${(1 - normalizedValue) * 240}, 70%, 55%)` },
                    // Right face
                    { corners: [corners[1], corners[2], corners[6], corners[5]], color: `hsl(${(1 - normalizedValue) * 240}, 70%, 45%)` },
                    // Back face
                    { corners: [corners[2], corners[3], corners[7], corners[6]], color: `hsl(${(1 - normalizedValue) * 240}, 70%, 35%)` },
                    // Left face
                    { corners: [corners[3], corners[0], corners[4], corners[7]], color: `hsl(${(1 - normalizedValue) * 240}, 70%, 40%)` },
                    // Bottom face (darkest)
                    { corners: [corners[0], corners[3], corners[2], corners[1]], color: `hsl(${(1 - normalizedValue) * 240}, 70%, 25%)` }
                ];
            }
            
            // Draw each face
            faces.forEach(face => {
                this.ctx.fillStyle = face.color;
                this.ctx.beginPath();
                this.ctx.moveTo(face.corners[0].x, face.corners[0].y);
                for (let i = 1; i < face.corners.length; i++) {
                    this.ctx.lineTo(face.corners[i].x, face.corners[i].y);
                }
                this.ctx.closePath();
                this.ctx.fill();
            });
            
            // Draw solid edges to make bars look solid
            this.ctx.strokeStyle = value === 0 ? '#ccc' : '#000'; // Light gray for zero-energy, black for others
            this.ctx.lineWidth = 1;
            
            // Draw all edges of the bar
            const edges = [
                // Bottom edges
                [corners[0], corners[1]], [corners[1], corners[2]], [corners[2], corners[3]], [corners[3], corners[0]],
                // Top edges
                [corners[4], corners[5]], [corners[5], corners[6]], [corners[6], corners[7]], [corners[7], corners[4]],
                // Vertical edges
                [corners[0], corners[4]], [corners[1], corners[5]], [corners[2], corners[6]], [corners[3], corners[7]]
            ];
            
            edges.forEach(edge => {
                this.ctx.beginPath();
                this.ctx.moveTo(edge[0].x, edge[0].y);
                this.ctx.lineTo(edge[1].x, edge[1].y);
                this.ctx.stroke();
            });
        });
        
        // Highlight hovered bin
        if (this.hoveredBin) {
            const hoveredBar = bars.find(bar => bar.i === this.hoveredBin.y && bar.j === this.hoveredBin.x);
            if (hoveredBar) {
                this.ctx.strokeStyle = '#fff';
                this.ctx.lineWidth = 3;
                
                // Draw outline around the top face
                const topFace = hoveredBar.corners.slice(4, 8);
                this.ctx.beginPath();
                this.ctx.moveTo(topFace[0].x, topFace[0].y);
                for (let i = 1; i < topFace.length; i++) {
                    this.ctx.lineTo(topFace[i].x, topFace[i].y);
                }
                this.ctx.closePath();
                this.ctx.stroke();
            }
        }
        
        // Draw rotating axis labels
        this.drawAxisLabels();
    }
    
    drawAxisLabels() {
        if (!this.is3D) return;
        
        const flatData = this.data.flat();
        const maxValue = Math.max(...flatData);
        const scale = Math.min(this.canvas.width, this.canvas.height) * 0.3;
        
        // Calculate label positions in 3D space (adaptive distance based on zoom)
        const labelDistance = scale * (0.8 + this.zoom * 0.4);
        
        // X-axis label (Azimuth φ)
        const xLabelPos = this.project3D({ x: labelDistance, y: 0, z: 0 });
        
        // Y-axis label (Rapidity y)
        const yLabelPos = this.project3D({ x: 0, y: labelDistance, z: 0 });
        
        // Draw labels with background
        this.ctx.font = 'bold 16px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        
        // X-axis label
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        this.ctx.fillRect(xLabelPos.x - 60, xLabelPos.y - 12, 120, 24);
        this.ctx.fillStyle = '#2c3e50';
        this.ctx.fillText('Azimuth φ (rad)', xLabelPos.x, xLabelPos.y);
        
        // Y-axis label
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        this.ctx.fillRect(yLabelPos.x - 60, yLabelPos.y - 12, 120, 24);
        this.ctx.fillStyle = '#2c3e50';
        this.ctx.fillText('Rapidity y', yLabelPos.x, yLabelPos.y);
    }
}

// Initialize the histogram when the page loads
document.addEventListener('DOMContentLoaded', () => {
    window.histogram = new Histogram2D('histogramCanvas');
});
