function loadTexture(path) {
    return new Promise((resolve) => {
        const img = new Image();
        img.src = path;
        img.onload = () => {
            resolve(img);
        };
    })
}

function createEnemies(ctx, canvas, enemyImg) {
    const MONSTER_TOTAL = 5;
    const MONSTER_WIDTH = MONSTER_TOTAL * enemyImg.width;
    const START_X = (canvas.width - MONSTER_WIDTH) / 2;
    const STOP_X = START_X + MONSTER_WIDTH;

    for (let x = START_X; x < STOP_X; x += enemyImg.width) {
        for (let y = 0; y < enemyImg.height * 5; y += enemyImg.height) {
            ctx.drawImage(enemyImg, x, y);
        }
    }
}

function createEnemies2(ctx, canvas, enemyImg) {
    const ROWS = 5;

    for (let y = 0; y < ROWS; y++) {
        const enemiesInRow = ROWS - y;
        const rowWidth = enemiesInRow * enemyImg.width;
        const startX = (canvas.width - rowWidth) / 2;

        for (let x = 0; x < enemiesInRow; x++) {
            ctx.drawImage(
                enemyImg,
                startX + (x * enemyImg.width),
                y * enemyImg.height
            );
        }
    }
}

window.onload = async () => {
    const canvas = document.getElementById("myCanvas");
    const ctx = canvas.getContext("2d");

    const heroImg = await loadTexture('assets/player.png');
    const enemyImg = await loadTexture('assets/enemyShip.png');
    const backgroundImg = await loadTexture('assets/starBackground.png'); 

    const backgroundPattern = ctx.createPattern(backgroundImg, 'repeat');

    ctx.fillStyle = backgroundPattern;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    createEnemies2(ctx, canvas, enemyImg);

    const mainShipWidth = heroImg.width;
    const mainShipHeight = heroImg.height;
    const mainShipX = canvas.width / 2 - mainShipWidth / 2;
    const mainShipY = canvas.height - mainShipHeight - 50;

    const sideShipWidth = mainShipWidth * 0.6;
    const sideShipHeight = mainShipHeight * 0.6;
    const sideShipY = mainShipY + (mainShipHeight - sideShipHeight);
    const gap = 20;

    ctx.drawImage(heroImg, mainShipX, mainShipY, mainShipWidth, mainShipHeight);

    const leftShipX = mainShipX - sideShipWidth - gap;
    ctx.drawImage(heroImg, leftShipX, sideShipY, sideShipWidth, sideShipHeight);

    const rightShipX = mainShipX + mainShipWidth + gap;
    ctx.drawImage(heroImg, rightShipX, sideShipY, sideShipWidth, sideShipHeight);
};