// kT Algorithm Implementation for Histogram2D
// This file extends the Histogram2D class with the kT clustering algorithm
// The kT algorithm is a sequential recombination algorithm for jet finding

// kT Algorithm implementation
Histogram2D.prototype.runKtAlgorithm = function() {
    console.log('Running kT algorithm...');
    
    const coneBtn = document.getElementById('coneAlgorithm');
    const cone2Btn = document.getElementById('cone2Algorithm');
    const ktBtn = document.getElementById('ktAlgorithm');
    coneBtn.classList.remove('active');
    cone2Btn.classList.remove('active');
    ktBtn.classList.add('active');
    
    // Algorithm parameters - read from input fields
    const R = parseFloat(document.getElementById('coneRadius').value) || 0.8;
    const ptCut = parseFloat(document.getElementById('seedThreshold').value) || 10.0; // pT cut for final jets
    
    // Store radius for visualization
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
                    pt: energy, // Using energy as proxy for pT
                    gridY: i,
                    gridX: j,
                    id: particles.length // Unique ID for tracking
                });
            }
        }
    }
    
    console.log(`Found ${particles.length} particles`);
    
    // Step 2: kT clustering algorithm
    // Create working copy of particles (pseudo-particles that can be merged)
    const pseudoParticles = particles.map((p, idx) => ({
        ...p,
        constituents: [p], // Track original particles in this pseudo-particle
        id: idx
    }));
    
    const finalJets = [];
    
    // Sequential recombination loop
    while (pseudoParticles.length > 0) {
        let minDistance = Infinity;
        let minType = null; // 'ij' for particle-particle, 'iB' for particle-beam
        let minI = -1;
        let minJ = -1;
        
        // Calculate all distances
        for (let i = 0; i < pseudoParticles.length; i++) {
            const pi = pseudoParticles[i];
            
            // Distance to beam: d_iB = p_Ti^2
            const diB = pi.pt * pi.pt;
            if (diB < minDistance) {
                minDistance = diB;
                minType = 'iB';
                minI = i;
                minJ = -1;
            }
            
            // Distance to other particles: d_ij = min(p_Ti^2, p_Tj^2) * (ΔR_ij)^2 / R^2
            for (let j = i + 1; j < pseudoParticles.length; j++) {
                const pj = pseudoParticles[j];
                
                const deltaY = pi.y - pj.y;
                const deltaPhi = this.normalizePhi(pi.phi - pj.phi);
                const deltaR = Math.sqrt(deltaY * deltaY + deltaPhi * deltaPhi);
                
                const minPt2 = Math.min(pi.pt * pi.pt, pj.pt * pj.pt);
                const dij = minPt2 * (deltaR * deltaR) / (R * R);
                
                if (dij < minDistance) {
                    minDistance = dij;
                    minType = 'ij';
                    minI = i;
                    minJ = j;
                }
            }
        }
        
        // Process the minimum distance
        if (minType === 'iB') {
            // Particle becomes a jet (if above pT threshold)
            const particle = pseudoParticles[minI];
            if (particle.pt >= ptCut) {
                // Calculate energy-weighted center for the jet
                let totalEnergy = 0;
                let weightedY = 0;
                let weightedPhi = 0;
                
                particle.constituents.forEach(p => {
                    totalEnergy += p.energy;
                    weightedY += p.energy * p.y;
                    weightedPhi += p.energy * p.phi;
                });
                
                finalJets.push({
                    y: weightedY / totalEnergy,
                    phi: this.normalizePhi(weightedPhi / totalEnergy),
                    energy: totalEnergy,
                    pt: particle.pt,
                    particles: particle.constituents
                });
            }
            
            // Remove particle from list
            pseudoParticles.splice(minI, 1);
        } else if (minType === 'ij') {
            // Combine particles i and j
            const pi = pseudoParticles[minI];
            const pj = pseudoParticles[minJ];
            
            // Combine all constituents
            const allConstituents = [...pi.constituents, ...pj.constituents];
            
            // Calculate combined properties (energy-weighted)
            let totalEnergy = 0;
            let weightedY = 0;
            let weightedPhi = 0;
            let totalPt = 0;
            
            allConstituents.forEach(p => {
                totalEnergy += p.energy;
                weightedY += p.energy * p.y;
                weightedPhi += p.energy * p.phi;
                totalPt += p.pt;
            });
            
            // Create new pseudo-particle
            const combined = {
                y: weightedY / totalEnergy,
                phi: this.normalizePhi(weightedPhi / totalEnergy),
                energy: totalEnergy,
                pt: totalPt, // Sum of pT (or could use totalEnergy)
                constituents: allConstituents,
                id: pseudoParticles.length // New ID
            };
            
            // Remove old particles and add combined one
            // Remove j first (higher index) to avoid index shift
            pseudoParticles.splice(minJ, 1);
            pseudoParticles.splice(minI, 1);
            pseudoParticles.push(combined);
        } else {
            // Should not happen, but break to avoid infinite loop
            console.warn('kT algorithm: No minimum distance found');
            break;
        }
    }
    
    // Sort jets by energy (descending)
    finalJets.sort((a, b) => b.energy - a.energy);
    
    this.foundJets = finalJets;
    
    console.log(`Found ${this.foundJets.length} jets`);
    this.foundJets.forEach((jet, idx) => {
        console.log(`Jet ${idx + 1}: E=${jet.energy.toFixed(2)} GeV, pT=${jet.pt.toFixed(2)} GeV, y=${jet.y.toFixed(3)}, φ=${jet.phi.toFixed(3)}, ${jet.particles.length} particles`);
    });
    
    // Redraw to show found jets
    this.draw();
};

