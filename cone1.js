// Cone Algorithm Implementation for Histogram2D
// This file extends the Histogram2D class with cone jet finding algorithm

// Normalize phi to [-π, π]
Histogram2D.prototype.normalizePhi = function(phi) {
    while (phi > Math.PI) phi -= 2 * Math.PI;
    while (phi < -Math.PI) phi += 2 * Math.PI;
    return phi;
};

// Resolve overlaps between proto-jets
Histogram2D.prototype.resolveOverlaps = function(protoJets, R) {
    if (protoJets.length === 0) return [];
    
    const finalJets = [];
    const used = new Set();
    
    for (let i = 0; i < protoJets.length; i++) {
        if (used.has(i)) continue;
        
        const jet1 = protoJets[i];
        let merged = false;
        
        // Check for overlaps with other jets
        for (let j = i + 1; j < protoJets.length; j++) {
            if (used.has(j)) continue;
            
            const jet2 = protoJets[j];
            const deltaY = jet1.y - jet2.y;
            const deltaPhi = this.normalizePhi(jet1.phi - jet2.phi);
            const distance = Math.sqrt(deltaY * deltaY + deltaPhi * deltaPhi);
            
            // If jets are closer than 2R, they overlap
            if (distance < 2 * R) {
                // Calculate shared energy
                const sharedParticles = jet1.particles.filter(p1 => 
                    jet2.particles.some(p2 => p1.gridY === p2.gridY && p1.gridX === p2.gridX)
                );
                const sharedEnergy = sharedParticles.reduce((sum, p) => sum + p.energy, 0);
                const totalEnergy = jet1.energy + jet2.energy;
                const sharedFraction = sharedEnergy / totalEnergy;
                
                // Merge if shared energy > 50%, otherwise keep the higher energy jet
                if (sharedFraction > 0.5) {
                    // Merge: combine particles and recalculate center
                    // Deduplicate particles by grid coordinates
                    const particleMap = new Map();
                    [...jet1.particles, ...jet2.particles].forEach(p => {
                        const key = `${p.gridY},${p.gridX}`;
                        if (!particleMap.has(key)) {
                            particleMap.set(key, p);
                        }
                    });
                    const allParticles = Array.from(particleMap.values());
                    
                    let totalE = 0;
                    let weightedY = 0;
                    let weightedPhi = 0;
                    
                    allParticles.forEach(p => {
                        totalE += p.energy;
                        weightedY += p.energy * p.y;
                        weightedPhi += p.energy * p.phi;
                    });
                    
                    finalJets.push({
                        y: weightedY / totalE,
                        phi: this.normalizePhi(weightedPhi / totalE),
                        energy: totalE,
                        particles: allParticles
                    });
                    
                    used.add(i);
                    used.add(j);
                    merged = true;
                    break;
                } else {
                    // Keep the higher energy jet
                    if (jet1.energy >= jet2.energy) {
                        used.add(j);
                    } else {
                        used.add(i);
                        break;
                    }
                }
            }
        }
        
        if (!merged && !used.has(i)) {
            finalJets.push(jet1);
            used.add(i);
        }
    }
    
    return finalJets.sort((a, b) => b.energy - a.energy); // Sort by energy
};

// Cone Algorithm implementation
Histogram2D.prototype.runConeAlgorithm = function() {
    console.log('Running Cone algorithm...');
    
    const coneBtn = document.getElementById('coneAlgorithm');
    const ktBtn = document.getElementById('ktAlgorithm');
    coneBtn.classList.add('active');
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
    
    // Step 4: Handle overlaps (split/merge procedure)
    this.foundJets = this.resolveOverlaps(protoJets, R);
    
    console.log(`Found ${this.foundJets.length} jets`);
    this.foundJets.forEach((jet, idx) => {
        console.log(`Jet ${idx + 1}: E=${jet.energy.toFixed(2)} GeV, y=${jet.y.toFixed(3)}, φ=${jet.phi.toFixed(3)}, ${jet.particles.length} particles`);
    });
    
    // Redraw to show found jets
    this.draw();
};

// Visualization of found jets
Histogram2D.prototype.drawFoundJets2D = function() {
    if (this.foundJets.length === 0) return;
    
    // Use minimum dimension to ensure square bins
    const canvasSize = Math.min(this.canvas.width, this.canvas.height);
    const binWidth = canvasSize / this.gridSize;
    const binHeight = canvasSize / this.gridSize;
    const R = this.currentConeRadius || 0.5; // Cone radius from algorithm or default
    
    this.foundJets.forEach((jet, idx) => {
        // Convert jet position (y, phi) directly to canvas pixel coordinates
        // This is the energy-weighted center, not necessarily at a bin center
        const yRange = this.rapidityRange[1] - this.rapidityRange[0];
        const phiRange = this.phiRange[1] - this.phiRange[0];
        
        // Map phi from [phiRange[0], phiRange[1]] to [0, canvasSize] for x
        const centerX = ((jet.phi - this.phiRange[0]) / phiRange) * canvasSize;
        
        // Map y from [rapidityRange[0], rapidityRange[1]] to [0, canvasSize] for y
        // Note: canvas y=0 is at top, but we want y increasing downward
        const centerY = ((jet.y - this.rapidityRange[0]) / yRange) * canvasSize;
        
        // Draw cone circle
        this.ctx.strokeStyle = idx === 0 ? '#ffeb3b' : '#ff9800'; // Yellow for highest energy, orange for others
        this.ctx.lineWidth = 2;
        this.ctx.setLineDash([5, 5]);
        
        // Calculate radius in pixels (R in rapidity/phi space)
        // yRange and phiRange already calculated above
        const radiusX = (R / phiRange) * canvasSize;
        const radiusY = (R / yRange) * canvasSize;
        
        this.ctx.beginPath();
        this.ctx.ellipse(centerX, centerY, radiusX, radiusY, 0, 0, 2 * Math.PI);
        this.ctx.stroke();
        
        // Draw jet axis (cross)
        this.ctx.setLineDash([]);
        this.ctx.strokeStyle = idx === 0 ? '#ffeb3b' : '#ff9800';
        this.ctx.lineWidth = 3;
        const crossSize = 8;
        this.ctx.beginPath();
        this.ctx.moveTo(centerX - crossSize, centerY);
        this.ctx.lineTo(centerX + crossSize, centerY);
        this.ctx.moveTo(centerX, centerY - crossSize);
        this.ctx.lineTo(centerX, centerY + crossSize);
        this.ctx.stroke();
        
        // Draw jet label
        this.ctx.fillStyle = idx === 0 ? '#ffeb3b' : '#ff9800';
        this.ctx.font = 'bold 12px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText(`J${idx + 1}`, centerX, centerY - radiusY - 5);
    });
};

