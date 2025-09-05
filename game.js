/*
 * Vertical Car Runner – Canvas implementation
 *
 * A lightweight endless runner written in plain JavaScript using the
 * HTML5 Canvas API. A car moves along three lanes while obstacles and
 * coins scroll downward. Collect coins to increase your score and avoid
 * obstacles. When you hit an obstacle the game ends and shows your
 * high score. Tap/click or use the arrow keys to change lanes. Press
 * space or tap to restart after a crash.
 */
// Immediately invoked function to encapsulate the game logic
(function () {
  // Canvas and context
  const canvas = document.createElement('canvas');
  canvas.id = 'gameCanvas';
  canvas.width = 360;
  canvas.height = 640;
  document.getElementById('game-container').appendChild(canvas);
  const ctx = canvas.getContext('2d');

  // Game variables
  let laneCount = 3; // starts with 3 lanes; may increase to 4 when score threshold is reached
  let laneWidth = canvas.width / laneCount;
  let lanesX = [];
  // Helper to compute lanesX array
  function computeLanes() {
    laneWidth = canvas.width / laneCount;
    lanesX = [];
    for (let i = 0; i < laneCount; i++) {
      lanesX.push(laneWidth * (i + 0.5));
    }
  }
  computeLanes();
  const carSize = { width: 60, height: 100 };
  const obstacleSize = { width: 80, height: 80 };

  let car;
  let obstacles;
  let speed;
  let spawnObstacleInterval;
  let lastObstacleSpawn;
  let score;
  let highScore;
  let gameOver;
  let lastSpeedIncrease;
  let extraLaneAdded;
  let obstaclesPerSpawn;
  // Offset used to animate dashed lane lines for road movement
  let dashOffset = 0;

  // Initialize game state
  function initGame() {
    // Reset lanes if extra lane had been added previously
    laneCount = 3;
    computeLanes();
    car = {
      lane: 1,
      x: lanesX[1],
      y: canvas.height - 120,
      width: carSize.width,
      height: carSize.height,
      color: '#4287f5',
    };
    obstacles = [];
    speed = 3.0; // base speed in pixels per frame
    spawnObstacleInterval = 1000; // ms
    lastObstacleSpawn = performance.now();
    lastSpeedIncrease = performance.now();
    score = 0;
    obstaclesPerSpawn = 1;
    extraLaneAdded = false;
    // Retrieve high score from localStorage
    const stored = localStorage.getItem('highScore');
    highScore = stored ? parseInt(stored) : 0;
    gameOver = false;
  }

  /**
   * Lighten a hex color by a given amount. Amount should be between 0 and 1.
   * This function takes a hex string like "#ff0000" and returns a new
   * hex string with each component moved towards white.
   * @param {string} hex
   * @param {number} amt
   */
  function lightenColor(hex, amt) {
    let h = hex.replace('#', '');
    if (h.length === 3) {
      // expand shorthand form (#abc) to full form (#aabbcc)
      h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    }
    let r = parseInt(h.substring(0, 2), 16);
    let g = parseInt(h.substring(2, 4), 16);
    let b = parseInt(h.substring(4, 6), 16);
    r = Math.min(255, Math.floor(r + (255 - r) * amt));
    g = Math.min(255, Math.floor(g + (255 - g) * amt));
    b = Math.min(255, Math.floor(b + (255 - b) * amt));
    const toHex = (c) => c.toString(16).padStart(2, '0');
    return '#' + toHex(r) + toHex(g) + toHex(b);
  }

  /**
   * Draw a simple car shape consisting of a body and a roof on the given
   * context. Cars are drawn facing upward.
   * @param {number} x - center x position
   * @param {number} y - center y position
   * @param {number} width - width of the car
   * @param {number} height - height of the car
   * @param {string} color - base body color
   */
  function drawCar(x, y, width, height, color) {
    // Body of the car
    ctx.fillStyle = color;
    ctx.fillRect(x - width / 2, y - height / 2, width, height);
    // Roof (slightly lighter)
    const roofWidth = width * 0.7;
    const roofHeight = height * 0.4;
    const roofColor = lightenColor(color, 0.3);
    ctx.fillStyle = roofColor;
    ctx.fillRect(x - roofWidth / 2, y - height / 2 + 5, roofWidth, roofHeight);
    // Windows (two small rectangles)
    const windowWidth = roofWidth * 0.4;
    const windowHeight = roofHeight * 0.3;
    const windowColor = lightenColor('#88c', 0.5); // light blue windows
    // left window
    ctx.fillStyle = windowColor;
    ctx.fillRect(x - roofWidth / 2 + 3, y - height / 2 + 10, windowWidth, windowHeight);
    // right window
    ctx.fillRect(x + roofWidth / 2 - windowWidth - 3, y - height / 2 + 10, windowWidth, windowHeight);
  }

  // Spawn a single obstacle in a specific lane
  function spawnSingleObstacle(lane) {
    // Randomly assign a color: red, yellow, or green
    const colors = ['#ef476f', '#ffd166', '#06d6a0'];
    const color = colors[Math.floor(Math.random() * colors.length)];
    obstacles.push({
      lane: lane,
      x: lanesX[lane],
      y: -obstacleSize.height,
      width: obstacleSize.width,
      height: obstacleSize.height,
      color: color,
      scored: false,
    });
  }

  // Spawn obstacles for this frame
  function spawnObstacle() {
    // Choose lanes randomly without repetition
    const availableLanes = [];
    for (let i = 0; i < laneCount; i++) {
      availableLanes.push(i);
    }
    const count = Math.min(obstaclesPerSpawn, laneCount);
    for (let i = 0; i < count; i++) {
      const idx = Math.floor(Math.random() * availableLanes.length);
      const lane = availableLanes.splice(idx, 1)[0];
      spawnSingleObstacle(lane);
    }
  }

  // Update game state
  function update(delta) {
    const now = performance.now();
    // Spawn obstacles periodically
    if (now - lastObstacleSpawn >= spawnObstacleInterval) {
      spawnObstacle();
      lastObstacleSpawn = now;
    }
    // Increase speed every 5 seconds
    if (now - lastSpeedIncrease >= 5000) {
      speed += 0.5;
      lastSpeedIncrease = now;
    }
    // Move obstacles
    obstacles.forEach((o) => {
      o.y += speed;
      // Check if car safely passed obstacle for scoring
      if (!o.scored && o.y - o.height / 2 > car.y + car.height / 2) {
        score++;
        o.scored = true;
      }
    });
    // Animate dashed line offset to simulate road movement
    dashOffset += speed;
    // prevent dashOffset from growing indefinitely
    if (dashOffset > 40) dashOffset -= 40;
    // Remove off‑screen obstacles
    obstacles = obstacles.filter((o) => o.y - o.height < canvas.height);
    // Collision detection
    for (const o of obstacles) {
      if (rectsIntersect(car, o)) {
        triggerGameOver();
        break;
      }
    }
    // Dynamic difficulty: add extra lane and spawn more obstacles at 60 points
    if (!extraLaneAdded && score >= 60) {
      // Add one lane
      laneCount = 4;
      computeLanes();
      // Reposition car in same lane index (clamp to new laneCount)
      car.lane = Math.min(car.lane, laneCount - 1);
      car.x = lanesX[car.lane];
      // Increase obstacles per spawn to 2
      obstaclesPerSpawn = 2;
      extraLaneAdded = true;
    }
  }

  // Rectangle–rectangle intersection for obstacles
  function rectsIntersect(a, b) {
    return (
      Math.abs(a.x - b.x) < (a.width + b.width) / 2 &&
      Math.abs(a.y - b.y) < (a.height + b.height) / 2
    );
  }

  function triggerGameOver() {
    if (gameOver) return;
    gameOver = true;
    // Update high score
    if (score > highScore) {
      highScore = score;
      localStorage.setItem('highScore', highScore.toString());
    }
  }

  // Draw everything
  function draw() {
    // Clear canvas
    // Road background
    ctx.fillStyle = '#303030';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    // Draw dashed lane lines between lanes
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 3;
    ctx.setLineDash([20, 20]);
    // Dash offset to simulate movement: offset increases with speed and resets when large
    ctx.lineDashOffset = -dashOffset;
    for (let i = 1; i < laneCount; i++) {
      const x = laneWidth * i;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvas.height);
      ctx.stroke();
    }
    ctx.setLineDash([]); // reset dash pattern
    // Draw player car
    drawCar(car.x, car.y, car.width, car.height, car.color);
    // Draw obstacle cars
    obstacles.forEach((o) => {
      drawCar(o.x, o.y, o.width, o.height, o.color);
    });
    // Draw score
    ctx.fillStyle = '#ffffff';
    ctx.font = '24px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(`Score: ${score}`, canvas.width / 2, 40);
    if (gameOver) {
      // Game over overlay
      ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#ffffff';
      ctx.font = '36px Arial';
      ctx.fillText('Game Over', canvas.width / 2, canvas.height / 2 - 60);
      ctx.font = '28px Arial';
      ctx.fillText(`High Score: ${highScore}`, canvas.width / 2, canvas.height / 2);
      ctx.font = '20px Arial';
      ctx.fillStyle = '#dddddd';
      ctx.fillText('Tap / Press Space to Restart', canvas.width / 2, canvas.height / 2 + 50);
    }
  }

  let lastTime = performance.now();
  function gameLoop() {
    const now = performance.now();
    const delta = now - lastTime;
    lastTime = now;
    if (!gameOver) {
      update(delta);
    }
    draw();
    requestAnimationFrame(gameLoop);
  }

  // Input handling
  function moveLane(direction) {
    const newLane = Math.min(Math.max(car.lane + direction, 0), laneCount - 1);
    if (newLane !== car.lane) {
      car.lane = newLane;
      car.x = lanesX[newLane];
    }
  }

  // Keyboard events
  window.addEventListener('keydown', (e) => {
    if (!gameOver) {
      if (e.key === 'ArrowLeft') {
        moveLane(-1);
      } else if (e.key === 'ArrowRight') {
        moveLane(1);
      }
    }
    if (gameOver && e.key === ' ') {
      initGame();
    }
  });
  // Touch/click input: decide left/right based on pointer x position
  canvas.addEventListener('pointerdown', (e) => {
    if (!gameOver) {
      const rect = canvas.getBoundingClientRect();
      const pointerX = e.clientX - rect.left;
      if (pointerX < car.x) {
        moveLane(-1);
      } else {
        moveLane(1);
      }
    } else {
      initGame();
    }
  });

  // Start game
  initGame();
  requestAnimationFrame(gameLoop);
})();