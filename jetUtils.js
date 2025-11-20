// Jet Algorithm Utilities for Histogram2D
// This file contains common utility functions used by multiple jet algorithms

// Normalize phi to [-π, π]
Histogram2D.prototype.normalizePhi = function(phi) {
    while (phi > Math.PI) phi -= 2 * Math.PI;
    while (phi < -Math.PI) phi += 2 * Math.PI;
    return phi;
};

// Resolve overlaps between proto-jets
// Used by cone algorithms to handle overlapping jet candidates
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

// Visualization of found jets
// Draws jet markers (cones, axes, labels) on the 2D histogram
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

