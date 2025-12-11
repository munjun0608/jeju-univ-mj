// 메시지 상수 정의
const Messages = {
  KEY_EVENT_UP: "KEY_EVENT_UP",
  KEY_EVENT_DOWN: "KEY_EVENT_DOWN",
  KEY_EVENT_LEFT: "KEY_EVENT_LEFT",
  KEY_EVENT_RIGHT: "KEY_EVENT_RIGHT",
  KEY_EVENT_SPACE_DOWN: "KEY_EVENT_SPACE_DOWN",
  KEY_EVENT_SPACE_UP: "KEY_EVENT_SPACE_UP",
  COLLISION_ENEMY_LASER: "COLLISION_ENEMY_LASER",
  COLLISION_ENEMY_HERO: "COLLISION_ENEMY_HERO",
  COLLISION_HERO_ENEMY_LASER: "COLLISION_HERO_ENEMY_LASER",
  GAME_END_LOSS: "GAME_END_LOSS",
  GAME_END_WIN: "GAME_END_WIN",
  KEY_EVENT_ENTER: "KEY_EVENT_ENTER",
};

// 이벤트 처리기
class EventEmitter {
  constructor() { this.listeners = {}; }
  on(message, listener) {
    if (!this.listeners[message]) this.listeners[message] = [];
    this.listeners[message].push(listener);
  }
  emit(message, payload = null) {
    if (this.listeners[message]) this.listeners[message].forEach((l) => l(message, payload));
  }
  clear() { this.listeners = {}; }
}

// 전역 변수
let heroImg, enemyImg, laserImg, laserShotImg, lifeImg, ufoImg;
let canvas, ctx;
let gameObjects = [];
let stars = [];
let hero;
let eventEmitter = new EventEmitter();
let gameLoopId;

// 스테이지 관리
let currentStage = 1;
const TOTAL_STAGES = 2;
let isStageTransitioning = false;

// 이미지 로드
function loadTexture(src) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(img);
    img.src = src;
  });
}

// [배경 별 클래스]
class Star {
  constructor() {
    this.x = Math.random() * canvas.width;
    this.y = Math.random() * canvas.height;
    this.size = Math.random() * 2;
    this.speed = Math.random() * 3 + 1;
  }
  update() {
    this.y += this.speed;
    if (this.y > canvas.height) {
      this.y = 0;
      this.x = Math.random() * canvas.width;
    }
  }
  draw(ctx) {
    ctx.fillStyle = "white";
    ctx.fillRect(this.x, this.y, this.size, this.size);
  }
}

// GameObject
class GameObject {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.dead = false;
    this.type = "";
    this.width = 0;
    this.height = 0;
    this.img = undefined;
    // [수정] 타이머 ID들을 관리하기 위한 속성
    this.intervalId = null;
    this.moveInterval = null;
    this.attackInterval = null;
  }
  rectFromGameObject() {
    return {
      top: this.y,
      left: this.x,
      bottom: this.y + this.height,
      right: this.x + this.width,
    };
  }
  draw(ctx) {
    if (this.img) ctx.drawImage(this.img, this.x, this.y, this.width, this.height);
  }
  // [추가] 객체가 삭제될 때 타이머를 정리하는 메서드
  cleanup() {
    if (this.intervalId) clearInterval(this.intervalId);
    if (this.moveInterval) clearInterval(this.moveInterval);
    if (this.attackInterval) clearInterval(this.attackInterval);
  }
}

// Hero
class Hero extends GameObject {
  constructor(x, y) {
    super(x, y);
    this.width = 99;
    this.height = 75;
    this.type = "Hero";
    this.cooldown = 0;
    this.life = 3;
    this.points = 0;
    this.isCharging = false;
    this.chargeStartTime = 0;
  }
  startCharge() {
    if (this.canFire() && !this.isCharging) {
      this.isCharging = true;
      this.chargeStartTime = Date.now();
    }
  }
  stopChargeAndFire() {
    if (this.isCharging) {
      const chargeDuration = Date.now() - this.chargeStartTime;
      this.isCharging = false;
      const isSuper = chargeDuration >= 1000;
      this.fire(isSuper);
    } else if (this.canFire()) {
      this.fire(false);
    }
  }
  fire(isSuper) {
    const laser = new Laser(this.x + 45, this.y - 10, isSuper, false);
    if (isSuper) laser.x -= 10;
    gameObjects.push(laser);
    this.cooldown = 500;
    let id = setInterval(() => {
      if (this.cooldown > 0) this.cooldown -= 100;
      else clearInterval(id);
    }, 100);
  }
  canFire() { return this.cooldown === 0; }
  decrementLife() {
    this.life--;
    if (this.life <= 0) this.dead = true;
  }
  incrementPoints(amount) { this.points += amount; }
  
  draw(ctx) {
    super.draw(ctx);
    if (this.isCharging) {
      const duration = Date.now() - this.chargeStartTime;
      const maxTime = 1000;
      let ratio = Math.min(duration / maxTime, 1);
      const barX = this.x;
      const barY = this.y + this.height + 10;
      ctx.fillStyle = "gray";
      ctx.fillRect(barX, barY, this.width, 10);
      if (ratio === 1) {
          ctx.fillStyle = (Date.now() % 200 < 100) ? "red" : "orange"; 
      } else {
          ctx.fillStyle = "yellow";
      }
      ctx.fillRect(barX, barY, this.width * ratio, 10);
      ctx.strokeStyle = "white";
      ctx.strokeRect(barX, barY, this.width, 10);
    }
  }
}

// Enemy (Sine Wave Movement)
class Enemy extends GameObject {
  constructor(x, y) {
    super(x, y);
    this.width = 98;
    this.height = 50;
    this.type = "Enemy";
    this.img = enemyImg;
    this.startX = x; 
    this.startTime = Date.now();

    this.intervalId = setInterval(() => {
      // [수정] 죽었으면 타이머 중지
      if (this.dead) { clearInterval(this.intervalId); return; }

      const time = Date.now() - this.startTime;
      this.x = this.startX + Math.sin(time / 500) * 50; 
      if (this.y < canvas.height - this.height) {
        this.y += 2; 
      } else {
        clearInterval(this.intervalId);
      }
    }, 50);
  }
}

// Boss
class Boss extends GameObject {
  constructor(x, y) {
    super(x, y);
    this.width = 200;
    this.height = 100;
    this.type = "Boss";
    this.img = ufoImg;
    this.life = 30;
    this.maxLife = 30;
    this.direction = 1;

    // 이동 타이머
    this.moveInterval = setInterval(() => {
      if (this.dead) { clearInterval(this.moveInterval); return; }
      if (this.x <= 20 || this.x + this.width >= canvas.width - 20) {
        this.direction *= -1;
      }
      this.x += 8 * this.direction;
    }, 50);

    // 공격 타이머 (이게 재시작 시 멈추지 않아서 문제가 되었음)
    this.attackInterval = setInterval(() => {
      if (this.dead) { clearInterval(this.attackInterval); return; }
      gameObjects.push(new Laser(this.x + this.width / 2, this.y + this.height, false, true, 0));
      gameObjects.push(new Laser(this.x + this.width / 2, this.y + this.height, false, true, -3));
      gameObjects.push(new Laser(this.x + this.width / 2, this.y + this.height, false, true, 3));
    }, 1500);
  }
  takeDamage() {
    this.life--;
    if (this.life <= 0) {
      this.dead = true;
      this.cleanup(); // [수정] 죽을 때 확실하게 타이머 정리
    }
  }
  draw(ctx) {
    super.draw(ctx);
    ctx.fillStyle = "rgba(255, 0, 0, 0.5)"; 
    ctx.fillRect(this.x, this.y - 20, this.width, 10);
    ctx.fillStyle = "rgb(0, 255, 0)";
    ctx.fillRect(this.x, this.y - 20, this.width * (this.life / this.maxLife), 10);
    ctx.strokeStyle = "white";
    ctx.strokeRect(this.x, this.y - 20, this.width, 10);
  }
}

// Laser
class Laser extends GameObject {
  constructor(x, y, isSuper, isEnemyLaser, xSpeed = 0) {
    super(x, y);
    this.type = isEnemyLaser ? "EnemyLaser" : "Laser";
    this.img = laserImg;
    this.isSuper = isSuper;
    this.isEnemyLaser = isEnemyLaser;
    this.xSpeed = xSpeed;

    if (isSuper) {
      this.width = 30; this.height = 60;
    } else {
      this.width = 9; this.height = 33;
    }

    this.intervalId = setInterval(() => {
      if (this.dead) { clearInterval(this.intervalId); return; }
      
      this.x += this.xSpeed;
      
      if (this.isEnemyLaser) {
        this.y += 10;
        if (this.y > canvas.height) {
           this.dead = true; clearInterval(this.intervalId);
        }
      } else {
        this.y -= 15;
        if (this.y < -this.height) {
           this.dead = true; clearInterval(this.intervalId);
        }
      }
    }, 50);
  }
}

class Explosion extends GameObject {
  constructor(x, y) {
    super(x, y);
    this.width = 56;
    this.height = 54;
    this.type = "Explosion";
    this.img = laserShotImg;
    setTimeout(() => { this.dead = true; }, 300);
  }
}

function intersectRect(r1, r2) {
  return !(r2.left > r1.right || r2.right < r1.left || r2.top > r1.bottom || r2.bottom < r1.top);
}

function initStars() {
  stars = [];
  for(let i=0; i<50; i++) {
    stars.push(new Star());
  }
}

// [핵심 수정] 모든 게임 오브젝트의 타이머를 끄고 배열을 비우는 함수
function clearAllGameObjects() {
  gameObjects.forEach((go) => {
    go.cleanup(); // 각 객체의 타이머(move, attack, intervalId) 모두 정지
  });
  gameObjects = [];
}

function initGame() {
  clearAllGameObjects(); // [수정] 단순히 []로 비우지 않고 타이머 정리 후 비움
  
  currentStage = 1;
  isStageTransitioning = false;
  createHero();
  initStars();
  loadStage(currentStage);

  eventEmitter.clear(); 
  eventEmitter.on(Messages.KEY_EVENT_UP, () => { hero.y -= 10; }); 
  eventEmitter.on(Messages.KEY_EVENT_DOWN, () => { hero.y += 10; });
  eventEmitter.on(Messages.KEY_EVENT_LEFT, () => { hero.x -= 10; });
  eventEmitter.on(Messages.KEY_EVENT_RIGHT, () => { hero.x += 10; });
  eventEmitter.on(Messages.KEY_EVENT_SPACE_DOWN, () => { if (hero) hero.startCharge(); });
  eventEmitter.on(Messages.KEY_EVENT_SPACE_UP, () => { if (hero) hero.stopChargeAndFire(); });

  eventEmitter.on(Messages.COLLISION_ENEMY_LASER, (_, { laser, target }) => {
    if (!laser.isSuper) laser.dead = true;
    
    if (target.type === "Boss") {
      target.takeDamage();
      if (target.dead) hero.incrementPoints(1000);
    } else {
      target.dead = true;
      hero.incrementPoints(100);
    }
    gameObjects.push(new Explosion(target.x, target.y));

    if (isStageClear() && !isStageTransitioning) {
      if (currentStage < TOTAL_STAGES) {
        nextStage();
      } else {
        eventEmitter.emit(Messages.GAME_END_WIN);
      }
    }
  });

  eventEmitter.on(Messages.COLLISION_ENEMY_HERO, (_, { enemy }) => {
    if(enemy.type !== "Boss") enemy.dead = true;
    hero.decrementLife();
    gameObjects.push(new Explosion(hero.x, hero.y)); 
    if (isHeroDead()) eventEmitter.emit(Messages.GAME_END_LOSS);
  });

  eventEmitter.on(Messages.COLLISION_HERO_ENEMY_LASER, (_, { laser }) => {
    laser.dead = true;
    hero.decrementLife();
    gameObjects.push(new Explosion(hero.x, hero.y));
    if (isHeroDead()) eventEmitter.emit(Messages.GAME_END_LOSS);
  });

  eventEmitter.on(Messages.GAME_END_WIN, () => endGame(true));
  eventEmitter.on(Messages.GAME_END_LOSS, () => endGame(false));
  eventEmitter.on(Messages.KEY_EVENT_ENTER, () => resetGame());
}

function loadStage(stage) {
  if (stage === 1) createEnemies();
  else if (stage === 2) createBoss();
}

function nextStage() {
  isStageTransitioning = true;
  setTimeout(() => {
    currentStage++;
    
    // [수정] 스테이지 전환 시, Hero를 제외한 모든 객체의 타이머 정리
    gameObjects.forEach(go => {
        if (go.type !== "Hero") {
            go.cleanup(); // 타이머 정지
            go.dead = true; // 삭제 표시
        }
    });

    gameObjects = gameObjects.filter(go => go.type === "Hero");
    hero.life = 3; 
    loadStage(currentStage);
    isStageTransitioning = false;
  }, 2000);
}

function createEnemies() {
  const MONSTER_TOTAL = 5;
  const START_X = (canvas.width - (MONSTER_TOTAL * 98)) / 2;
  for (let x = START_X; x < START_X + (MONSTER_TOTAL * 98); x += 98) {
    for (let y = 0; y < 50 * 3; y += 50) { 
      const enemy = new Enemy(x, y);
      gameObjects.push(enemy);
    }
  }
}

function createBoss() {
  const boss = new Boss(canvas.width / 2 - 100, 50);
  gameObjects.push(boss);
}

function createHero() {
  hero = new Hero(canvas.width / 2 - 45, canvas.height - 100);
  hero.img = heroImg;
  gameObjects.push(hero);
}

function updateGameObjects() {
  if(isStageTransitioning) return;

  stars.forEach(star => star.update());

  const targets = gameObjects.filter(go => go.type === "Enemy" || go.type === "Boss");
  const heroLasers = gameObjects.filter(go => go.type === "Laser");
  const enemyLasers = gameObjects.filter(go => go.type === "EnemyLaser");

  heroLasers.forEach((l) => {
    targets.forEach((t) => {
      if (intersectRect(l.rectFromGameObject(), t.rectFromGameObject())) {
        eventEmitter.emit(Messages.COLLISION_ENEMY_LASER, { laser: l, target: t });
      }
    });
  });

  targets.forEach((t) => {
    if (intersectRect(hero.rectFromGameObject(), t.rectFromGameObject())) {
      eventEmitter.emit(Messages.COLLISION_ENEMY_HERO, { enemy: t });
    }
  });

  enemyLasers.forEach((l) => {
    if (intersectRect(l.rectFromGameObject(), hero.rectFromGameObject())) {
      eventEmitter.emit(Messages.COLLISION_HERO_ENEMY_LASER, { laser: l });
    }
  });

  // [중요] 죽은 객체들은 화면 그리기 목록에서 제외 (이미 cleanup은 위에서 처리됨)
  gameObjects = gameObjects.filter(go => !go.dead);
}

function drawGameObjects(ctx) {
  stars.forEach(star => star.draw(ctx));
  gameObjects.forEach(go => go.draw(ctx));
}

function drawUI() {
  const START_POS = canvas.width - 180;
  for (let i = 0; i < hero.life; i++) {
    ctx.drawImage(lifeImg, START_POS + (45 * (i + 1)), canvas.height - 37);
  }
  ctx.font = "bold 25px Arial";
  ctx.fillStyle = "white";
  ctx.textAlign = "left";
  ctx.fillText(`STAGE ${currentStage}   POINTS: ${hero.points}`, 20, 40);

  if(isStageTransitioning) {
      ctx.font = "bold 50px Arial";
      ctx.fillStyle = "yellow";
      ctx.textAlign = "center";
      ctx.fillText(`STAGE ${currentStage + 1} START!`, canvas.width/2, canvas.height/2);
  }
}

function displayMessage(message, color = "red") {
  ctx.font = "30px Arial";
  ctx.fillStyle = color;
  ctx.textAlign = "center";
  ctx.fillText(message, canvas.width / 2, canvas.height / 2);
}

function isHeroDead() { return hero.life <= 0; }
function isStageClear() {
  const enemies = gameObjects.filter(go => (go.type === "Enemy" || go.type === "Boss") && !go.dead);
  return enemies.length === 0;
}

function endGame(win) {
  clearInterval(gameLoopId);
  setTimeout(() => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "black";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    if (win) {
      displayMessage("Victory!!! Pew Pew... - Press [Enter] to start a new game Captain Pew Pew", "green");
    } else {
      displayMessage("You died !!! Press [Enter] to start a new game Captain Pew Pew");
    }
  }, 200);
}

function resetGame() {
  if (gameLoopId) {
    clearInterval(gameLoopId);
    
    // [중요] 재시작 시 화면에 보이지 않는 이전 게임 객체들(보스 포함)의 타이머를 모두 정지!
    clearAllGameObjects(); 

    eventEmitter.clear();
    initGame();
    gameLoopId = setInterval(() => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = "black";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      updateGameObjects();
      drawGameObjects(ctx);
      drawUI(); 
    }, 50); 
  }
}

let spacePressed = false;
window.addEventListener("keydown", (evt) => {
  if (evt.key === "ArrowUp") eventEmitter.emit(Messages.KEY_EVENT_UP);
  else if (evt.key === "ArrowDown") eventEmitter.emit(Messages.KEY_EVENT_DOWN);
  else if (evt.key === "ArrowLeft") eventEmitter.emit(Messages.KEY_EVENT_LEFT);
  else if (evt.key === "ArrowRight") eventEmitter.emit(Messages.KEY_EVENT_RIGHT);
  else if (evt.keyCode === 32) {
    if (!spacePressed) { spacePressed = true; eventEmitter.emit(Messages.KEY_EVENT_SPACE_DOWN); }
  }
  else if (evt.key === "Enter") eventEmitter.emit(Messages.KEY_EVENT_ENTER);
});
window.addEventListener("keyup", (evt) => {
  if (evt.keyCode === 32) {
    spacePressed = false; eventEmitter.emit(Messages.KEY_EVENT_SPACE_UP);
  }
});

window.onload = async () => {
  canvas = document.getElementById("myCanvas");
  ctx = canvas.getContext("2d");

  heroImg = await loadTexture("assets/player.png");
  enemyImg = await loadTexture("assets/enemyShip.png");
  laserImg = await loadTexture("assets/laserRed.png");
  laserShotImg = await loadTexture("assets/laserRedShot.png");
  lifeImg = await loadTexture("assets/life.png");
  ufoImg = await loadTexture("assets/enemyUFO.png"); 

  initGame();

  gameLoopId = setInterval(() => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "black";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    updateGameObjects();
    drawGameObjects(ctx);
    drawUI();
  }, 50);
};