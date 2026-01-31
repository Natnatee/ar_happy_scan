import { use_index_db } from './index_db';

export class UIManager {
    constructor() {
        this.container = null;
        this.btnLeft = null;
        this.btnRight = null;
    }

    /**
     * Initialize UI elements based on settings
     * @param {Object} setting - Setting object from config
     * @param {Function} onNavigate - Callback function for navigation (direction: -1 or 1)
     */
    async init(setting, onNavigate) {
        if (!setting || !setting.scene_button?.show) return;

        // 1. Create UI Container
        this.container = document.createElement('div');
        this.container.className = 'ui-container';
        document.body.appendChild(this.container);

        // 2. Create Navigation Buttons
        this.btnLeft = document.createElement('button');
        this.btnLeft.className = 'nav-btn';
        this.btnRight = document.createElement('button');
        this.btnRight.className = 'nav-btn';

        // 3. Load Button Icons from IndexedDB
        try {
            const leftBlob = await use_index_db(setting.scene_button.src_left);
            const rightBlob = await use_index_db(setting.scene_button.src_right);
            
            this.btnLeft.style.backgroundImage = `url(${URL.createObjectURL(leftBlob)})`;
            this.btnRight.style.backgroundImage = `url(${URL.createObjectURL(rightBlob)})`;
        } catch (err) {
            console.error("Failed to load navigation button icons", err);
            // Fallback text if icons fail
            this.btnLeft.innerText = '<';
            this.btnRight.innerText = '>';
        }

        // 4. Set Event Listeners
        this.btnLeft.onclick = (e) => {
            e.stopPropagation();
            onNavigate(-1);
        };
        this.btnRight.onclick = (e) => {
            e.stopPropagation();
            onNavigate(1);
        };

        this.container.appendChild(this.btnLeft);
        this.container.appendChild(this.btnRight);

        console.log("UI Manager Initialized");
    }

    /**
     * Show or Hide navigation buttons
     * @param {boolean} isVisible 
     */
    showNavigation(isVisible) {
        if (!this.container) return;
        this.btnLeft.style.display = isVisible ? 'block' : 'none';
        this.btnRight.style.display = isVisible ? 'block' : 'none';
    }
}
