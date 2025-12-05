// 메시지 상수 정의
const Messages = {
  KEY_EVENT_UP: "KEY_EVENT_UP",
  KEY_EVENT_DOWN: "KEY_EVENT_DOWN",
  KEY_EVENT_LEFT: "KEY_EVENT_LEFT",
  KEY_EVENT_RIGHT: "KEY_EVENT_RIGHT",
  KEY_EVENT_SPACE_DOWN: "KEY_EVENT_SPACE_DOWN",
  KEY_EVENT_SPACE_UP: "KEY_EVENT_SPACE_UP",
  COLLISION_ENEMY_LASER: "COLLISION_ENEMY_LASER", // 영웅 레이저 -> 적 충돌
  COLLISION_ENEMY_HERO: "COLLISION_ENEMY_HERO",   // 적 본체 -> 영웅 충돌
  COLLISION_HERO_ENEMY_LASER: "COLLISION_HERO_ENEMY_LASER", // 적 레이저 -> 영웅 충돌 (신규)
  GAME_END_LOSS: "GAME_END_LOSS",
  GAME_END_WIN: "GAME_END_WIN",
  KEY_EVENT_ENTER: "KEY_EVENT_ENTER",
};

// 이벤트 처리기
class EventEmitter {
  constructor() {
    this.listeners = {};
  }
  on(message, listener) {
    if (!this.listeners[message]) this.listeners[message] = [];
    this.listeners[message].push(listener);
  }
  emit(message, payload = null) {
    if (this.listeners[message]) {
      this.listeners[message].forEach((l) => l(message, payload));
    }
  }
  clear() {
    this.listeners = {};
  }
}

// 전역 변수
let heroImg, enemyImg, laserImg, laserShotImg, lifeImg, ufoImg; // ufoImg 추가
let canvas, ctx;
let gameObjects = [];
let hero;
let eventEmitter = new EventEmitter();
let gameLoopId;

// 스테이지 관리 변수
let currentStage = 1;
const TOTAL_STAGES = 2; // 총 2단계 (1: 졸개, 2: 보스)

// 이미지 로드 함수
function loadTexture(src) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => {
        console.warn(`이미지를 찾을 수 없습니다: ${src}. 기본 이미지를 사용하거나 경로를 확인하세요.`);
        resolve(img); // 에러가 나도 진행되도록 처리
    }
    img.src = src;
  });
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
    if (this.img) {
      ctx.drawImage(this.img, this.x, this.y, this.width, this.height);
    }
  }
}

// Hero (차지 기능 포함)
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
    // 마지막 인자 false = 플레이어 레이저
    const laser = new Laser(this.x + 45, this.y - 10, isSuper, false);
    
    if (isSuper) {
        laser.x -= 10;
    }

    gameObjects.push(laser);
    this.cooldown = 500;

    let id = setInterval(() => {
      if (this.cooldown > 0) this.cooldown -= 100;
      else clearInterval(id);
    }, 100);
  }

  canFire() {
    return this.cooldown === 0;
  }

  decrementLife() {
    this.life--;
    if (this.life <= 0) {
      this.dead = true;
    }
  }

  incrementPoints(amount = 100) {
    this.points += amount;
  }

  draw(ctx) {
    super.draw(ctx);
    if (this.isCharging) {
      const duration = Date.now() - this.chargeStartTime;
      const maxTime = 1000;
      let ratio = Math.min(duration / maxTime, 1);
      
      ctx.fillStyle = "gray";
      ctx.fillRect(this.x, this.y + this.height + 10, this.width, 10);
      ctx.fillStyle = ratio === 1 ? "red" : "yellow";
      ctx.fillRect(this.x, this.y + this.height + 10, this.width * ratio, 10);
      ctx.strokeStyle = "white";
      ctx.strokeRect(this.x, this.y + this.height + 10, this.width, 10);
    }
  }
}

// 일반 적 (Enemy)
class Enemy extends GameObject {
  constructor(x, y) {
    super(x, y);
    this.width = 98;
    this.height = 50;
    this.type = "Enemy";
    this.img = enemyImg;

    let id = setInterval(() => {
      if (this.y < canvas.height - this.height) {
        this.y += 5;
      } else {
        clearInterval(id);
      }
    }, 300);
  }
}

// [신규] 보스 (Boss)
class Boss extends GameObject {
  constructor(x, y) {
    super(x, y);
    this.width = 200;  // 큼직하게
    this.height = 100; 
    this.type = "Boss";
    this.img = ufoImg; // UFO 이미지
    this.life = 20;    // 보스 체력
    this.maxLife = 20;
    this.direction = 1; // 1: 우측, -1: 좌측

    // 보스 이동 로직 (좌우 왕복)
    this.moveInterval = setInterval(() => {
        if (this.x <= 0 || this.x + this.width >= canvas.width) {
            this.direction *= -1; // 벽에 닿으면 방향 반전
        }
        this.x += 10 * this.direction;
    }, 100);

    // 보스 공격 로직 (주기적으로 레이저 발사)
    this.attackInterval = setInterval(() => {
        // 플레이어를 향해 발사 (간단하게 그냥 아래로 발사)
        const laser = new Laser(this.x + this.width / 2, this.y + this.height, false, true);
        gameObjects.push(laser);
    }, 1500); // 1.5초마다 발사
  }

  takeDamage() {
      this.life--;
      if (this.life <= 0) {
          this.dead = true;
          clearInterval(this.moveInterval);
          clearInterval(this.attackInterval);
      }
  }

  // 보스 체력바 그리기
  draw(ctx) {
      super.draw(ctx);
      // 체력바 배경
      ctx.fillStyle = "red";
      ctx.fillRect(this.x, this.y - 20, this.width, 10);
      // 현재 체력
      ctx.fillStyle = "green";
      ctx.fillRect(this.x, this.y - 20, this.width * (this.life / this.maxLife), 10);
  }
}

// 레이저 (플레이어용 + 적/보스용 통합)
class Laser extends GameObject {
  constructor(x, y, isSuper, isEnemyLaser) {
    super(x, y);
    this.type = isEnemyLaser ? "EnemyLaser" : "Laser"; // 타입 구분
    this.img = laserImg;
    this.isSuper = isSuper;
    this.isEnemyLaser = isEnemyLaser; 

    if (isSuper) {
        this.width = 30; this.height = 60;
    } else {
        this.width = 9; this.height = 33;
    }

    let id = setInterval(() => {
      // 적 레이저는 아래로, 영웅 레이저는 위로
      if (this.isEnemyLaser) {
          this.y += 10; // 아래로 이동
          if (this.y > canvas.height) {
              this.dead = true;
              clearInterval(id);
          }
      } else {
          this.y -= 15; // 위로 이동
          if (this.y < -this.height) {
              this.dead = true;
              clearInterval(id);
          }
      }
    }, 100);
  }
}

// 폭발 이펙트
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

// 게임 초기화
function initGame() {
  gameObjects = [];
  createHero();
  
  currentStage = 1; // 스테이지 1부터 시작
  loadStage(currentStage);

  // 키보드 이동
  eventEmitter.on(Messages.KEY_EVENT_UP, () => { hero.y -= 5; });
  eventEmitter.on(Messages.KEY_EVENT_DOWN, () => { hero.y += 5; });
  eventEmitter.on(Messages.KEY_EVENT_LEFT, () => { hero.x -= 5; });
  eventEmitter.on(Messages.KEY_EVENT_RIGHT, () => { hero.x += 5; });

  // 차지 공격
  eventEmitter.on(Messages.KEY_EVENT_SPACE_DOWN, () => { if (hero) hero.startCharge(); });
  eventEmitter.on(Messages.KEY_EVENT_SPACE_UP, () => { if (hero) hero.stopChargeAndFire(); });

  // [충돌 1] 플레이어 레이저 -> 적(Enemy) 또는 보스(Boss)
  eventEmitter.on(Messages.COLLISION_ENEMY_LASER, (_, { laser, target }) => {
    // 일반 레이저면 소멸, 슈퍼 레이저는 관통(소멸 안함)
    if (!laser.isSuper) {
        laser.dead = true;
    }

    if (target.type === "Boss") {
        target.takeDamage(); // 보스는 HP 감소
        if (target.dead) hero.incrementPoints(1000); // 보스 처치 점수
    } else {
        target.dead = true; // 일반 적은 즉사
        hero.incrementPoints(100);
    }
    
    // 폭발 이펙트
    gameObjects.push(new Explosion(target.x, target.y));

    // 스테이지 클리어 체크
    if (isStageClear()) {
        if (currentStage < TOTAL_STAGES) {
            nextStage();
        } else {
            eventEmitter.emit(Messages.GAME_END_WIN);
        }
    }
  });

  // [충돌 2] 적 본체 -> 플레이어 충돌
  eventEmitter.on(Messages.COLLISION_ENEMY_HERO, (_, { enemy }) => {
    // 보스랑 부딪히면 보스는 안 죽고 플레이어만 아픔
    if(enemy.type !== "Boss") enemy.dead = true; 
    
    hero.decrementLife();
    if (isHeroDead()) {
      eventEmitter.emit(Messages.GAME_END_LOSS);
    }
  });

  // [충돌 3] 적 레이저 -> 플레이어 충돌 (신규)
  eventEmitter.on(Messages.COLLISION_HERO_ENEMY_LASER, (_, { laser }) => {
      laser.dead = true;
      hero.decrementLife();
      if (isHeroDead()) {
          eventEmitter.emit(Messages.GAME_END_LOSS);
      }
  });

  eventEmitter.on(Messages.GAME_END_WIN, () => { endGame(true); });
  eventEmitter.on(Messages.GAME_END_LOSS, () => { endGame(false); });
  eventEmitter.on(Messages.KEY_EVENT_ENTER, () => { resetGame(); });
}

// 스테이지 로드 함수
function loadStage(stage) {
    if (stage === 1) {
        createEnemies(); // 쫄병 생성
    } else if (stage === 2) {
        createBoss(); // 보스 생성
    }
}

function nextStage() {
    currentStage++;
    // 화면의 모든 적/레이저 제거 (안전하게)
    gameObjects = gameObjects.filter(go => go.type === "Hero");
    
    setTimeout(() => {
        loadStage(currentStage);
    }, 1000); // 1초 뒤 다음 스테이지 시작
}

function createEnemies() {
  const MONSTER_TOTAL = 5;
  const MONSTER_WIDTH = MONSTER_TOTAL * 98;
  const START_X = (canvas.width - MONSTER_WIDTH) / 2;
  const STOP_X = START_X + MONSTER_WIDTH;

  for (let x = START_X; x < STOP_X; x += 98) {
    for (let y = 0; y < 50 * 5; y += 50) {
      const enemy = new Enemy(x, y);
      gameObjects.push(enemy);
    }
  }
}

function createBoss() {
    // 화면 중앙 상단에 보스 생성
    const boss = new Boss(canvas.width / 2 - 100, 50);
    gameObjects.push(boss);
}

function createHero() {
  hero = new Hero(canvas.width / 2 - 45, canvas.height - canvas.height / 4);
  hero.img = heroImg;
  gameObjects.push(hero);
}

function drawGameObjects(ctx) {
  gameObjects.forEach((go) => go.draw(ctx));
}

function updateGameObjects() {
  // 타겟(적, 보스) 필터링
  const targets = gameObjects.filter((go) => go.type === "Enemy" || go.type === "Boss");
  const heroLasers = gameObjects.filter((go) => go.type === "Laser");
  const enemyLasers = gameObjects.filter((go) => go.type === "EnemyLaser");

  // 1. 영웅 레이저 vs 적(타겟)
  heroLasers.forEach((l) => {
    targets.forEach((t) => {
      if (intersectRect(l.rectFromGameObject(), t.rectFromGameObject())) {
        eventEmitter.emit(Messages.COLLISION_ENEMY_LASER, { laser: l, target: t });
      }
    });
  });

  // 2. 적 본체 vs 영웅
  targets.forEach((t) => {
    if (intersectRect(hero.rectFromGameObject(), t.rectFromGameObject())) {
      eventEmitter.emit(Messages.COLLISION_ENEMY_HERO, { enemy: t });
    }
  });

  // 3. 적 레이저 vs 영웅
  enemyLasers.forEach((l) => {
      if (intersectRect(l.rectFromGameObject(), hero.rectFromGameObject())) {
          eventEmitter.emit(Messages.COLLISION_HERO_ENEMY_LASER, { laser: l });
      }
  });

  gameObjects = gameObjects.filter((go) => !go.dead);
}

function drawLife() {
  const START_POS = canvas.width - 180;
  for (let i = 0; i < hero.life; i++) {
    ctx.drawImage(lifeImg, START_POS + (45 * (i + 1)), canvas.height - 37);
  }
}

function drawPoints() {
  ctx.font = "30px Arial";
  ctx.fillStyle = "red";
  ctx.textAlign = "left";
  // 스테이지 정보도 같이 표시
  ctx.fillText(`Stage: ${currentStage} | Points: ${hero.points}`, 10, canvas.height - 20);
}

function displayMessage(message, color = "red") {
  ctx.font = "30px Arial";
  ctx.fillStyle = color;
  ctx.textAlign = "center";
  ctx.fillText(message, canvas.width / 2, canvas.height / 2);
}

function isHeroDead() { return hero.life <= 0; }

function isStageClear() {
  // 적이나 보스가 하나도 없으면 클리어
  const enemies = gameObjects.filter((go) => (go.type === "Enemy" || go.type === "Boss") && !go.dead);
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
    eventEmitter.clear();
    initGame();
    gameLoopId = setInterval(() => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = "black";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      drawPoints();
      drawLife();
      updateGameObjects();
      drawGameObjects(ctx);
    }, 100);
  }
}

// 키 입력 리스너
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

// 메인 실행
window.onload = async () => {
  canvas = document.getElementById("myCanvas");
  ctx = canvas.getContext("2d");

  // 이미지 로드 (assets 폴더에 ufo.png가 있어야 합니다)
  heroImg = await loadTexture("assets/player.png");
  enemyImg = await loadTexture("assets/enemyShip.png");
  laserImg = await loadTexture("assets/laserRed.png");
  laserShotImg = await loadTexture("assets/laserRedShot.png");
  lifeImg = await loadTexture("assets/life.png");
  ufoImg = await loadTexture("assets/enemyUFO.png"); // 보스 이미지 로드

  initGame();

  gameLoopId = setInterval(() => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "black";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    drawGameObjects(ctx);
    updateGameObjects();
    drawPoints();
    drawLife();
  }, 100);
};