document.addEventListener('DOMContentLoaded', () => {
    const cards = document.querySelectorAll('.card');

    cards.forEach(card => {
        card.addEventListener('mousemove', (e) => {
            const { clientX, clientY } = e;
            const { left, top, width, height } = card.getBoundingClientRect();

            // Calculate mouse position relative to card center
            const x = (clientX - left) - width / 2;
            const y = (clientY - top) - height / 2;

            // Rotation intensity (30deg as requested)
            const rotateX = (-y / height) * 30;
            const rotateY = (x / width) * 30;

            // Apply 5% scale + 3D rotation
            card.style.transform = `scale(1.05) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
        });

        card.addEventListener('mouseleave', () => {
            // Reset transform when mouse leaves
            card.style.transform = `scale(1) rotateX(0deg) rotateY(0deg)`;
        });
    });
});
