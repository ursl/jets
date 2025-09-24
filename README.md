# 2D Histogram Visualization for High-Energy Physics

A modern, interactive web-based visualization tool for displaying 2D histograms with jet physics data. This application allows users to inject jets with customizable parameters and visualize their energy distribution in rapidity-azimuth space.

## Features

###  **Interactive Visualization**
- **2D Histogram View**: Traditional grid-based visualization with color-coded energy bins
- **3D Histogram View**: Rotatable 3D perspective with solid bars and proper depth sorting
- **Real-time Updates**: Instant visualization updates when jet parameters change
- **Zoom and Pan**: Interactive controls for detailed analysis

###  **Physics Simulation**
- **Jet Injection**: Add multiple jets with customizable energy, rapidity, and azimuth
- **Fragmentation Model**: Realistic particle distribution using exponential energy fall-off
- **Constituent Control**: Adjustable number of particles per jet (1-100)
- **Energy Conservation**: Proper energy distribution ensuring conservation laws

###  **User Interface**
- **Physics Coordinates**: Uses standard rapidity (y) and azimuth (φ) coordinate system
- **Interactive Controls**: Real-time parameter adjustment with immediate feedback
- **Hover Information**: Detailed tooltips showing physics quantities and bin values
- **Responsive Design**: Works on different screen sizes and devices

## Getting Started

### Prerequisites
- Modern web browser (Chrome, Firefox, Safari, Edge)
- No additional software or dependencies required

### Installation
1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/jets.git
   cd jets
   ```

2. Open `index.html` in your web browser
3. Start exploring the jet physics visualization!

## Usage

### Basic Workflow
1. **Start Empty**: The histogram begins with all bins empty (white)
2. **Add Jets**: Click "Add Jet(s)" to inject jets with random parameters
3. **Customize**: Adjust energy, rapidity, azimuth, and constituent count for each jet
4. **Visualize**: Switch between 2D and 3D views to analyze jet structures
5. **Analyze**: Use hover tooltips to examine specific bins and physics quantities

### Controls
- **Generate Random Data**: Creates random energy distribution (only when no jets present)
- **Toggle 3D View**: Switch between 2D grid and 3D perspective
- **Reset 3D View**: Return to default rotation and zoom
- **Grid Size**: Adjust histogram resolution (5x5 to 50x50)
- **View Angle**: Control 3D perspective angle (0° to 45°)

### Jet Parameters
- **Energy**: Jet energy in GeV (1-500 GeV)
- **Rapidity (y)**: Position in rapidity space (-4 to 4)
- **Azimuth (φ)**: Angular position (-π to π radians)
- **Constituents**: Number of particles per jet (1-100)

## Physics Background

### Coordinate System
- **Rapidity (y)**: Measures particle velocity along beam axis
- **Azimuth (φ)**: Angular position around beam axis
- **Energy**: Total energy of jet constituents

### Fragmentation Model
- **Exponential Distribution**: Higher energy particles more likely
- **Angular Correlation**: Particles cluster around jet axis
- **Realistic Spread**: Typical jet cone size (R ~ 0.3-0.4)
- **Energy Conservation**: Total constituent energy = jet energy

## Technical Details

### Technologies Used
- **HTML5 Canvas**: High-performance 2D/3D rendering
- **Vanilla JavaScript**: No external dependencies
- **CSS3**: Modern styling with gradients and animations
- **Web Standards**: Pure web technologies, no frameworks


## Contact

For questions or suggestions, please open an issue on GitHub.

---

**Note**: This is a simplified physics simulation for educational purposes (and exercising cursor). If you use this for anything real, you should be fired from your job (in case you have one).