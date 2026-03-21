const boxElements = document.querySelectorAll('.box');
const container = document.getElementById('game-container');

// Physics constants
const gravity = 0.6;
const frictionX = 0.98; 
const floorFriction = 0.5;
const boxSize = 60;
const containerWidth = 800;
const containerHeight = 600;
const floorHeight = 100;
const groundY = containerHeight - floorHeight - boxSize;

// Chain constants
const targetDistance = 65;
const stiffness = 0.8;
const iterations = 15; // Increased iterations for stable pseudo-verlet constraints

const boxes = Array.from(boxElements).map((el, i) => {
    const startX = 50 + (i * targetDistance); 
    const startY = 100;
    
    const hue = (i * 360 / boxElements.length);
    el.style.backgroundColor = `hsl(${hue}, 85%, 55%)`;
    
    return {
        el,
        pos: { x: startX, y: startY },
        oldPos: { x: startX, y: startY },
        isDragging: false,
        dragOffsetX: 0,
        dragOffsetY: 0
    };
});

let activeBox = null;
let lastMousePos = { x: 0, y: 0 };

function updateDOM() {
    boxes.forEach(b => {
        b.el.style.left = b.pos.x + 'px';
        b.el.style.top = b.pos.y + 'px';
    });
}

// Dragging Logic
boxes.forEach(b => {
    b.el.addEventListener('mousedown', (e) => {
        b.isDragging = true;
        activeBox = b;
        
        boxes.forEach(other => other.el.style.zIndex = 10);
        b.el.style.zIndex = 100;
        
        const rect = b.el.getBoundingClientRect();
        b.dragOffsetX = e.clientX - rect.left;
        b.dragOffsetY = e.clientY - rect.top;
        lastMousePos = { x: e.clientX, y: e.clientY };
        
        // Zero out initial throw velocity when first grabbed
        b.oldPos.x = b.pos.x;
        b.oldPos.y = b.pos.y;
    });
});

document.addEventListener('mousemove', (e) => {
    if (!activeBox || !activeBox.isDragging) {
        lastMousePos = { x: e.clientX, y: e.clientY };
        return;
    }
    
    const b = activeBox;
    const containerRect = container.getBoundingClientRect();
    
    let dx = e.clientX - lastMousePos.x;
    let dy = e.clientY - lastMousePos.y;
    lastMousePos = { x: e.clientX, y: e.clientY };
    
    let newX = e.clientX - containerRect.left - b.dragOffsetX;
    let newY = e.clientY - containerRect.top - b.dragOffsetY;
    
    if (newX < 0) newX = 0;
    if (newX > containerWidth - boxSize) newX = containerWidth - boxSize;
    if (newY < 0) newY = 0;
    if (newY > groundY) newY = groundY;
    
    b.pos.x = newX;
    b.pos.y = newY;
    
    // Simulate verlet velocity behind the active pos
    b.oldPos.x = b.pos.x - dx;
    b.oldPos.y = b.pos.y - dy;
    
    updateDOM();
});

document.addEventListener('mouseup', () => {
    if (activeBox) {
        // dampen throw velocity lightly on release
        let vx = activeBox.pos.x - activeBox.oldPos.x;
        let vy = activeBox.pos.y - activeBox.oldPos.y;
        activeBox.oldPos.x = activeBox.pos.x - vx * 0.8;
        activeBox.oldPos.y = activeBox.pos.y - vy * 0.8;
        
        activeBox.isDragging = false;
        activeBox = null;
    }
});

// Circle-to-Circle collision resolution (prevent overlapping)
function resolveBoxCollisions() {
    for (let i = 0; i < boxes.length; i++) {
        for (let j = i + 1; j < boxes.length; j++) {
            let b1 = boxes[i];
            let b2 = boxes[j];

            let dx = b1.pos.x - b2.pos.x;
            let dy = b1.pos.y - b2.pos.y;
            let distance = Math.sqrt(dx * dx + dy * dy);
            
            // To prevent division by zero gracefully
            if (distance === 0) {
                dx = 0.1; dy = 0.1; distance = Math.sqrt(dx*dx + dy*dy);
            }

            // overlapping if distance is less than diameter (boxSize)
            if (distance < boxSize) {
                let overlap = boxSize - distance;
                let nx = dx / distance;
                let ny = dy / distance;

                let m1 = b1.isDragging ? 0 : 0.5;
                let m2 = b2.isDragging ? 0 : 0.5;
                
                if (b1.isDragging && !b2.isDragging) m2 = 1;
                if (b2.isDragging && !b1.isDragging) m1 = 1;

                b1.pos.x += nx * overlap * m1;
                b1.pos.y += ny * overlap * m1;
                b2.pos.x -= nx * overlap * m2;
                b2.pos.y -= ny * overlap * m2;
            }
        }
    }
}

// Chain constraints
function resolveChainConstraints() {
    for (let i = 0; i < boxes.length - 1; i++) {
        const b1 = boxes[i];
        const b2 = boxes[i + 1];
        
        const dx = b2.pos.x - b1.pos.x;
        const dy = b2.pos.y - b1.pos.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance === 0) continue;
        
        const diff = targetDistance - distance;
        
        if (diff < 0) { // Only spring when pulled too far apart
            const percent = (diff / distance) * stiffness;
            const offsetX = dx * percent;
            const offsetY = dy * percent;
            
            let m1 = b1.isDragging ? 0 : 0.5;
            let m2 = b2.isDragging ? 0 : 0.5;
            
            if (b1.isDragging && !b2.isDragging) m2 = 1;
            if (b2.isDragging && !b1.isDragging) m1 = 1;
            
            b1.pos.x -= offsetX * m1;
            b1.pos.y -= offsetY * m1;
            
            b2.pos.x += offsetX * m2;
            b2.pos.y += offsetY * m2;
        }
    }
}


// Main Loop
function loop() {
    // 1. Move
    boxes.forEach(b => {
        if (!b.isDragging) {
            // Calculate velocity from oldPos (Verlet Integration)
            let velX = (b.pos.x - b.oldPos.x) * frictionX;
            let velY = (b.pos.y - b.oldPos.y); 
            
            b.oldPos.x = b.pos.x;
            b.oldPos.y = b.pos.y;
            
            velY += gravity;
            
            b.pos.x += velX;
            b.pos.y += velY;
        }
    });

    // 2. Resolve Constraints multiple times for stability
    for (let iter = 0; iter < iterations; iter++) {
        resolveChainConstraints();
        resolveBoxCollisions();
        
        // Boundaries
        boxes.forEach(b => {
            if (!b.isDragging) {
                if (b.pos.y >= groundY) { b.pos.y = groundY; }
                if (b.pos.x <= 0) { b.pos.x = 0; } 
                else if (b.pos.x >= containerWidth - boxSize) { b.pos.x = containerWidth - boxSize; }
            }
        });
    }

    // 3. Post-constraint Velocity Adjustments (Ground friction)
    boxes.forEach(b => {
        if (!b.isDragging && b.pos.y >= groundY) {
            let velX = b.pos.x - b.oldPos.x;
            b.pos.x = b.oldPos.x + velX * floorFriction;
        }
    });
    
    updateDOM();
    requestAnimationFrame(loop);
}

// Start
updateDOM();
requestAnimationFrame(loop);
