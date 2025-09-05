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
(function () {
  // Canvas and context
  const canvas = document.createElement('canvas');
  canvas.id = 'gameCanvas';
  canvas.width = 360;
  canvas.height = 640;
  document.getElementById('game-container').appendChild(canvas);
  const ctx = canvas.getContext('2d');

  // Game variables
  const laneCount = 3;
  const laneWidth = canvas.width / laneCount;
  const lanesX = [];
  for (let i = 0; i < laneCount; i++) {
    lanesX.push(laneWidth * (i + 0.5));
  }
  const carSize = { width: 60, height: 100 };
  const obstacleSize = { width: 80, height: 80 };
  const coinSize = { diameter: 40 };

  let car;
  let obstacles;
  let coins;
  let speed;
  let spawnObstacleInterval;
  let spawnCoinInterval;
  let lastObstacleSpawn;
  let lastCoinSpawn;
  let score;
  let highScore;
  let gameOver;
  let lastSpeedIncrease;

  function initGame() {
    // Initialize game state
    car = {
      lane: 1,
      x: lanesX[1],
      y: canvas.height - 120,
      width: carSize.width,
      height: carSize.height,
      color: '#4287f5',
    };
    obstacles = [];
    coins = [];
    speed = 3.0; // base speed in pixels per frame
    spawnObstacleInterval = 1000; // ms
    spawnCoinInterval = 700; // ms
    lastObstacleSpawn = performance.now();
    lastCoinSpawn = performance.now();
    lastSpeedIncrease = performance.now();
    score = 0;
    // Retrieve high score from localStorage
    const stored = localStorage.getItem('highScore');
    highScore = stored ? parseInt(stored) : 0;
    gameOver = false;
  }

  function spawnObstacle() {
    const lane = Math.floor(Math.random() * laneCount);
    obstacles.push({
      lane: lane,
      x: lanesX[lane],
      y: -obstacleSize.height,
      width: obstacleSize.width,
      height: obstacleSize.height,
      color: '#ef476f',
    });
  }

  function spawnCoin() {
    const lane = Math.floor(Math.random() * laneCount);
    // Avoid spawning a coin on top of an obstacle near spawn area
    const laneX = lanesX[lane];
    const conflict = obstacles.some((o) => {
      return o.lane === lane && o.y < 0;
    });
    if (conflict) return;
    coins.push({
      lane: lane,
      x: laneX,
      y: -coinSize.diameter,
      radius: coinSize.diameter / 2,
      color: '#f9c74f',
    });
  }

  function update(delta) {
    const now = performance.now();
    // Spawn obstacles
    if (now - lastObstacleSpawn >= spawnObstacleInterval) {
      spawnObstacle();
      lastObstacleSpawn = now;
    }
    // Spawn coins
    if (now - lastCoinSpawn >= spawnCoinInterval) {
      spawnCoin();
      lastCoinSpawn = now;
    }
    // Increase speed every 5 seconds to ramp difficulty
    if (now - lastSpeedIncrease >= 5000) {
      speed += 0.5;
      lastSpeedIncrease = now;
    }
    // Move obstacles and coins
    obstacles.forEach((o) => {
      o.y += speed;
    });
    coins.forEach((c) => {
      c.y += speed;
    });
    // Remove off‑screen entities
    obstacles = obstacles.filter((o) => o.y - o.height < canvas.height);
    coins = coins.filter((c) => c.y - c.radius < canvas.height);
    // Collision detection
    // Check obstacle collision with car
    for (const o of obstacles) {
      if (rectsIntersect(car, o)) {
        triggerGameOver();
        break;
      }
    }
    // Check coin collection
    coins = coins.filter((c) => {
      if (circleRectIntersect(c, car)) {
        score++;
        return false;
      }
      return true;
    });
  }

  // Rectangle–rectangle intersection for obstacles
  function rectsIntersect(a, b) {
    return (
      Math.abs(a.x - b.x) < (a.width + b.width) / 2 &&
      Math.abs(a.y - b.y) < (a.height + b.height) / 2
    );
  }
  // Circle–rectangle intersection for coins
  function circleRectIntersect(circle, rect) {
    // Find the closest point on the rectangle to the circle center
    const dx = Math.abs(circle.x - rect.x);
    const dy = Math.abs(circle.y - rect.y);
    if (dx > rect.width / 2 + circle.radius) return false;
    if (dy > rect.height / 2 + circle.radius) return false;
    if (dx <= rect.width / 2) return true;
    if (dy <= rect.height / 2) return true;
    const cornerDistanceSq = (dx - rect.width / 2) ** 2 + (dy - rect.height / 2) ** 2;
    return cornerDistanceSq <= circle.radius ** 2;
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

  function draw() {
    // Clear canvas
    ctx.fillStyle = '#222222';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    // Draw lanes separators
    ctx.strokeStyle = '#444444';
    ctx.lineWidth = 2;
    for (let i = 1; i < laneCount; i++) {
      const x = laneWidth * i;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvas.height);
      ctx.stroke();
    }
    // Draw car
    ctx.fillStyle = car.color;
    ctx.fillRect(car.x - car.width / 2, car.y - car.height / 2, car.width, car.height);
    // Draw obstacles
    obstacles.forEach((o) => {
      ctx.fillStyle = o.color;
      ctx.fillRect(o.x - o.width / 2, o.y - o.height / 2, o.width, o.height);
    });
    // Draw coins
    coins.forEach((c) => {
      ctx.fillStyle = c.color;
      ctx.beginPath();
      ctx.arc(c.x, c.y, c.radius, 0, Math.PI * 2);
      ctx.fill();
    });
    // Draw score
    ctx.fillStyle = '#ffffff';
    ctx.font = '24px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(`Score: ${score}`, canvas.width / 2, 40);
    if (gameOver) {
      // Overlay
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
  // Keyboard
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
  // Touch/click input: decide left/right based on pointer x position relative to car
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

  // Initialize and start the game
  initGame();
  requestAnimationFrame(gameLoop);
})();