// Cone 2 Algorithm Implementation for Histogram2D
// This file extends the Histogram2D class with a second cone jet finding algorithm
// Skeleton structure with basic loop over particles

// Cone 2 Algorithm implementation
Histogram2D.prototype.runCone2Algorithm = function() {
    console.log('Running Cone 2 algorithm...');
    
    const coneBtn = document.getElementById('coneAlgorithm');
    const cone2Btn = document.getElementById('cone2Algorithm');
    const ktBtn = document.getElementById('ktAlgorithm');
    coneBtn.classList.remove('active');
    cone2Btn.classList.add('active');
    ktBtn.classList.remove('active');
    
    // Algorithm parameters - read from input fields (can use same or different parameters)
    const R = parseFloat(document.getElementById('coneRadius').value) || 0.8;
    const seedThreshold = parseFloat(document.getElementById('seedThreshold').value) || 10.0;
    
    // Store cone radius for visualization
    this.currentConeRadius = R;
    
    // Step 1: Convert histogram bins to particles
    const particles = [];
    for (let i = 0; i < this.gridSize; i++) {
        for (let j = 0; j < this.gridSize; j++) {
            const energy = this.data[i][j];
            if (energy > 0.1) { // Only include particles with meaningful energy
                const physics = this.gridToPhysics(j, i);
                particles.push({
                    y: physics.y,
                    phi: physics.phi,
                    energy: energy,
                    gridY: i,
                    gridX: j
                });
            }
        }
    }
    
    console.log(`Found ${particles.length} particles`);
    
    // Step 2: Basic loop over all particles
    // TODO: Implement your cone 2 algorithm here
    const protoJets = [];
    
    // Example: Loop over all particles
    for (const particle of particles) {
        // TODO: Process each particle
        // Example structure:
        // - Check if particle should be a seed
        // - Form cone around particle
        // - Find particles within cone
        // - Calculate jet properties
        // - Store proto-jet
        
        // Placeholder: You can access particle properties:
        // particle.y, particle.phi, particle.energy, particle.gridY, particle.gridX
    }
    
    // Step 3: Handle overlaps (can reuse resolveOverlaps from cone1.js)
    this.foundJets = this.resolveOverlaps(protoJets, R);
    
    console.log(`Found ${this.foundJets.length} jets`);
    this.foundJets.forEach((jet, idx) => {
        console.log(`Jet ${idx + 1}: E=${jet.energy.toFixed(2)} GeV, y=${jet.y.toFixed(3)}, φ=${jet.phi.toFixed(3)}, ${jet.particles.length} particles`);
    });
    
    // Redraw to show found jets
    this.draw();
};

