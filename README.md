# Event-management-simulatie
Spel
# Event Site Manager Simulation

## Description
Event Site Manager is a browser-based simulation game designed as an educational tool for event management students. Players design an event site layout by placing key facilities on a grid. Once the design is complete, they can run a simulation to observe how hundreds of virtual visitors interact with the layout. The primary objective is to create an efficient, safe, and enjoyable event environment, measured by an overall visitor satisfaction score.

## Gameplay Instructions

### 1. Design Phase
- **Select an Asset:** Click on an icon in the left-hand toolbar (e.g., Entrance, Stage, Food Stand) to select it. The selected icon will be highlighted.
- **Place an Asset:** Move your mouse over the main grid. A preview of the asset will appear. The preview will be green if the placement is valid and red if it is not (e.g., overlapping another object or placed out of bounds). Click the left mouse button to place the asset.
- **Deselect an Asset:** Right-click anywhere on the grid or press the `Escape` key to deselect the current asset.
- **Set Stage Schedules:** You must place at least 3 stages to start the simulation. After placing a stage, you can click on it during the Design Phase to open a schedule modal. Add performance times (e.g., from 10:00 to 12:00) to attract visitors.

### 2. Simulation Phase
- **Start Simulation:** Once you are happy with your layout and have set schedules for at least 3 stages, click the **'Start Simulation'** button.
- **Observe:** Watch as 500 visitors enter the site through the entrances. They will make decisions based on their needs (hunger, toilet) and their preferences for active stage performances.
    - **Green Visitors:** Happy and satisfied.
    - **Yellow Visitors:** Have a need (e.g., hungry) or are waiting in a queue.
    - **Red Visitors:** Unhappy due to long waits, overcrowding, or inability to find their destination.
- **Monitor Metrics:** Keep an eye on the status display at the top right, which shows the overall Visitor Satisfaction, the current number of visitors on site, and the simulation time.
- **Pause/Reset:** You can pause the simulation at any time to analyze the situation or reset the entire layout to start over.

### Objective
Your goal is to achieve the highest possible average Visitor Satisfaction score. This is achieved by:
- Placing facilities logically to minimize walking distances.
- Providing enough Food/Drink and Toilet facilities to keep queues short.
- Designing pathways that prevent severe overcrowding.
- Scheduling stage performances to distribute crowds.

## Installation
No installation is required. This is a purely client-side application that runs directly in your web browser.

## How to Run Locally
1. Download the code from this repository (click the green 'Code' button, then 'Download ZIP').
2. Unzip the downloaded file.
3. Open the `index.html` file in any modern web browser (like Chrome, Firefox, or Edge).

## Deployment on GitHub Pages
This static web application is perfectly suited for free hosting on GitHub Pages. "Deploying" simply means making it publicly available through a GitHub URL.

1. Create a new **public** repository on your GitHub account.
2. Upload all the generated files (`index.html`, `style.css`, `script.js`, and the entire `assets` folder) to your new repository.
3. Go to your repository's **'Settings'** tab.
4. Navigate to the **'Pages'** section in the left sidebar.
5. Under 'Build and deployment', select **'Deploy from a branch'** as the source.
6. Under 'Branch', select your main branch (e.g., `main` or `master`) and the `/ (root)` folder, then click **'Save'**.
7. GitHub will start the deployment process. After a few minutes, your simulation game will be live at the URL displayed on that page, which will be in the format: `https://<your-username>.github.io/<repository-name>/`.
