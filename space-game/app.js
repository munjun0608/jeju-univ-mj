
// 메시지 상수
const Messages = {
  KEY_EVENT_UP: "KEY_EVENT_UP",
  KEY_EVENT_DOWN: "KEY_EVENT_DOWN",
  KEY_EVENT_LEFT: "KEY_EVENT_LEFT",
  KEY_EVENT_RIGHT: "KEY_EVENT_RIGHT",
  KEY_EVENT_SPACE: "KEY_EVENT_SPACE",
  COLLISION_ENEMY_LASER: "COLLISION_ENEMY_LASER",
  COLLISION_ENEMY_HERO: "COLLISION_ENEMY_HERO",
};


// EventEmitter
class EventEmitter {
  constructor() {
    this.listeners = {};
  }

  on(message, listener) {
    if (!this.listeners[message]) {
      this.listeners[message] = [];
    }
    this.listeners[message].push(listener);
  }

  emit(message, payload = null) {
    if (this.listeners[message]) {
      this.listeners[message].forEach((l) => l(message, payload));
    }
  }
}

let heroImg, enemyImg, laserImg, laserShotImg;
let canvas, ctx;
let gameObjects = [];
let hero, leftSidekick, rightSidekick; // 보조 비행선 변수 추가;
let eventEmitter = new EventEmitter();


// 텍스처 로딩
function loadTexture(src) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
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
    ctx.drawImage(this.img, this.x, this.y, this.width, this.height);
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
  }

  fire() {
    if (this.canFire()) {
      gameObjects.push(new Laser(this.x + 45, this.y - 10));
      this.cooldown = 500;

      let id = setInterval(() => {
        if (this.cooldown > 0) {
          this.cooldown -= 100;
        } else {
          clearInterval(id);
        }
      }, 100);
    }
  }

  canFire() {
    return this.cooldown === 0;
  }
}


// Enemy
class Enemy extends GameObject {
  constructor(x, y) {
    super(x, y);
    this.width = 98;
    this.height = 50;
    this.type = "Enemy";

    let id = setInterval(() => {
      if (this.y < canvas.height - this.height) {
        this.y += 5;
      } else {
        clearInterval(id);
      }
    }, 300);
  }
}


// Laser
class Laser extends GameObject {
  constructor(x, y) {
    super(x, y);
    this.width = 9;
    this.height = 33;
    this.type = "Laser";
    this.img = laserImg;

    let id = setInterval(() => {
      if (this.y > 0) {
        this.y -= 15;
      } else {
        this.dead = true;
        clearInterval(id);
      }
    }, 100);
  }
}


// Sidekick (보조 비행선)
class Sidekick extends GameObject {
  constructor(x, y) {
    super(x, y);
    this.width = 50;  // 영웅보다 작게 설정
    this.height = 37;
    this.type = "Sidekick";
    this.img = heroImg; // 영웅 이미지 재사용 (또는 다른 이미지)

    // 1. 보조 비행선 자동 발사 로직 (1초마다 발사)
    setInterval(() => {
      // 보조 비행선은 '작은 레이저'를 쏘므로 크기를 조절한 레이저를 생성
      const smallLaser = new Laser(this.x + 20, this.y - 10);
      smallLaser.width = 5;  // 레이저 크기 줄임
      smallLaser.height = 15;
      gameObjects.push(smallLaser);
    }, 1000); // 1000ms = 1초
  }
}


// Explosion (폭발 이펙트)
class Explosion extends GameObject {
  constructor(x, y) {
    super(x, y);
    this.width = 56;
    this.height = 54;
    this.type = "Explosion";
    this.img = laserShotImg; // 2. 제공해주신 폭발 이미지 사용

    // 0.3초 뒤에 사라지게 설정
    setTimeout(() => {
      this.dead = true;
    }, 300);
  }
}

// 충돌 검사
function intersectRect(r1, r2) {
  return !(
    r2.left > r1.right ||
    r2.right < r1.left ||
    r2.top > r1.bottom ||
    r2.bottom < r1.top
  );
}


// 게임 초기화
function initGame() {
  gameObjects = [];
  createEnemies();
  createHero();

  // 보조 비행선 생성 (영웅 좌우에 배치)
  leftSidekick = new Sidekick(hero.x - 60, hero.y + 20);
  rightSidekick = new Sidekick(hero.x + 110, hero.y + 20);
  gameObjects.push(leftSidekick);
  gameObjects.push(rightSidekick);

  // 영웅 움직일 때 보조 비행선도 같이 이동
  eventEmitter.on(Messages.KEY_EVENT_UP, () => {
    hero.y -= 5; leftSidekick.y -= 5; rightSidekick.y -= 5;
  });
  eventEmitter.on(Messages.KEY_EVENT_DOWN, () => {
    hero.y += 5; leftSidekick.y += 5; rightSidekick.y += 5;
  });
  eventEmitter.on(Messages.KEY_EVENT_LEFT, () => {
    hero.x -= 5; leftSidekick.x -= 5; rightSidekick.x -= 5;
  });
  eventEmitter.on(Messages.KEY_EVENT_RIGHT, () => {
    hero.x += 5; leftSidekick.x += 5; rightSidekick.x += 5;
  });

  eventEmitter.on(Messages.KEY_EVENT_SPACE, () => {
    if (hero.canFire()) hero.fire();
  });

  // 충돌 이벤트 수정: 폭발 이펙트 추가
  eventEmitter.on(Messages.COLLISION_ENEMY_LASER, (_, { first, second }) => {
    first.dead = true;  // 레이저 제거
    second.dead = true; // 적 제거
    
    // 적의 위치(second.x, second.y)에 폭발 이펙트 생성
    const explosion = new Explosion(second.x, second.y);
    gameObjects.push(explosion);
  });
}

function createEnemies() {
  const MONSTER_TOTAL = 5;
  const MONSTER_WIDTH = MONSTER_TOTAL * 98;
  const START_X = (canvas.width - MONSTER_WIDTH) / 2;
  const STOP_X = START_X + MONSTER_WIDTH;

  for (let x = START_X; x < STOP_X; x += 98) {
    for (let y = 0; y < 50 * 5; y += 50) {
      const enemy = new Enemy(x, y);
      enemy.img = enemyImg;
      gameObjects.push(enemy);
    }
  }
}

function createHero() {
  hero = new Hero(canvas.width / 2 - 45, canvas.height - canvas.height / 4);
  hero.img = heroImg;
  gameObjects.push(hero);
}

function drawGameObjects(ctx) {
  gameObjects.forEach((go) => go.draw(ctx));
}


// 객체 상태 업데이트 (충돌 포함)
function updateGameObjects() {
  const enemies = gameObjects.filter((go) => go.type === "Enemy");
  const lasers = gameObjects.filter((go) => go.type === "Laser");

  lasers.forEach((l) => {
    enemies.forEach((m) => {
      if (intersectRect(l.rectFromGameObject(), m.rectFromGameObject())) {
        eventEmitter.emit(Messages.COLLISION_ENEMY_LASER, {
          first: l,
          second: m,
        });
      }
    });
  });

  gameObjects = gameObjects.filter((go) => !go.dead);
}


window.addEventListener("keyup", (evt) => {
  if (evt.key === "ArrowUp") eventEmitter.emit(Messages.KEY_EVENT_UP);
  else if (evt.key === "ArrowDown") eventEmitter.emit(Messages.KEY_EVENT_DOWN);
  else if (evt.key === "ArrowLeft") eventEmitter.emit(Messages.KEY_EVENT_LEFT);
  else if (evt.key === "ArrowRight") eventEmitter.emit(Messages.KEY_EVENT_RIGHT);
  else if (evt.keyCode === 32) eventEmitter.emit(Messages.KEY_EVENT_SPACE);
});


// 게임 루프
window.onload = async () => {
  canvas = document.getElementById("myCanvas");
  ctx = canvas.getContext("2d");

  heroImg = await loadTexture("assets/player.png");
  enemyImg = await loadTexture("assets/enemyShip.png");
  laserImg = await loadTexture("assets/laserRed.png");
  laserShotImg = await loadTexture("assets/laserRedShot.png"); // 폭발 이미지 로드 추가

  initGame();

  setInterval(() => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "black";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    drawGameObjects(ctx);
    updateGameObjects();
  }, 100);
};


