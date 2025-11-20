// Cone Algorithm Implementation for Histogram2D
// This file extends the Histogram2D class with cone jet finding algorithm
// Note: normalizePhi, resolveOverlaps, and drawFoundJets2D are defined in jetUtils.js

// Cone Algorithm implementation
Histogram2D.prototype.runConeAlgorithm = function() {
    console.log('Running Cone algorithm...');
    
    const coneBtn = document.getElementById('coneAlgorithm');
    const cone2Btn = document.getElementById('cone2Algorithm');
    const ktBtn = document.getElementById('ktAlgorithm');
    coneBtn.classList.add('active');
    cone2Btn.classList.remove('active');
    ktBtn.classList.remove('active');
    
    // Algorithm parameters - read from input fields
    const R = parseFloat(document.getElementById('coneRadius').value) || 0.8;
    const seedThreshold = parseFloat(document.getElementById('seedThreshold').value) || 10.0;
    const maxIterations = 100;
    const convergenceThreshold = 0.01; // Convergence in y/phi
    
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
    
    // Step 2: Find seeds (high energy particles)
    const seeds = particles
        .filter(p => p.energy >= seedThreshold)
        .sort((a, b) => b.energy - a.energy); // Sort by energy descending
    
    console.log(`Found ${seeds.length} seeds`);
    
    // Step 3: Iterative cone algorithm for each seed
    const protoJets = [];
    
    for (const seed of seeds) {
        let jetY = seed.y;
        let jetPhi = seed.phi;
        let converged = false;
        let iterations = 0;
        
        // Iterate until convergence
        while (!converged && iterations < maxIterations) {
            const oldY = jetY;
            const oldPhi = jetPhi;
            
            // Find all particles within cone radius R
            const particlesInCone = particles.filter(p => {
                const deltaY = p.y - jetY;
                const deltaPhi = this.normalizePhi(p.phi - jetPhi);
                const distance = Math.sqrt(deltaY * deltaY + deltaPhi * deltaPhi);
                return distance <= R;
            });
            
            if (particlesInCone.length === 0) break;
            
            // Calculate energy-weighted center
            let totalEnergy = 0;
            let weightedY = 0;
            let weightedPhi = 0;
            
            particlesInCone.forEach(p => {
                totalEnergy += p.energy;
                weightedY += p.energy * p.y;
                weightedPhi += p.energy * p.phi;
            });
            
            jetY = weightedY / totalEnergy;
            jetPhi = this.normalizePhi(weightedPhi / totalEnergy);
            
            // Check convergence
            const deltaY = Math.abs(jetY - oldY);
            const deltaPhi = Math.abs(this.normalizePhi(jetPhi - oldPhi));
            
            if (deltaY < convergenceThreshold && deltaPhi < convergenceThreshold) {
                converged = true;
            }
            
            iterations++;
        }
        
        // Store proto-jet
        const particlesInCone = particles.filter(p => {
            const deltaY = p.y - jetY;
            const deltaPhi = this.normalizePhi(p.phi - jetPhi);
            const distance = Math.sqrt(deltaY * deltaY + deltaPhi * deltaPhi);
            return distance <= R;
        });
        
        const totalEnergy = particlesInCone.reduce((sum, p) => sum + p.energy, 0);
        
        protoJets.push({
            y: jetY,
            phi: jetPhi,
            energy: totalEnergy,
            particles: particlesInCone,
            seedEnergy: seed.energy,
            iterations: iterations
        });
    }
    
    // Step 4: Handle overlaps (split/merge procedure) - optional
    const shouldResolveOverlaps = document.getElementById('resolveOverlaps').checked;
    
    if (shouldResolveOverlaps) {
        this.foundJets = this.resolveOverlaps(protoJets, R);
    } else {
        // Use proto-jets directly without overlap resolution
        this.foundJets = protoJets.sort((a, b) => b.energy - a.energy);
    }
    
    console.log(`Found ${this.foundJets.length} jets${shouldResolveOverlaps ? ' (with overlap resolution)' : ' (without overlap resolution)'}`);
    this.foundJets.forEach((jet, idx) => {
        console.log(`Jet ${idx + 1}: E=${jet.energy.toFixed(2)} GeV, y=${jet.y.toFixed(3)}, φ=${jet.phi.toFixed(3)}, ${jet.particles.length} particles`);
    });
    
    // Redraw to show found jets
    this.draw();
};

