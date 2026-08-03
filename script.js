const CANVAS_SIZE = 600;
const GRID_SIZE = 40; // 1マス = 40px
const GRID_COLS = CANVAS_SIZE / GRID_SIZE; // 15
const GRID_ROWS = CANVAS_SIZE / GRID_SIZE; // 15

const BUILDINGS = {
  // 特定の施設（タイタンの指示）
  smithy: { x: 2, y: 2, w: 2, h: 2, name: "鍛冶屋", color: "#8b4513" },
  inn: { x: 12, y: 2, w: 2, h: 2, name: "宿屋", color: "#a0522d" },
  heroHome: { x: 2, y: 12, w: 2, h: 2, name: "勇者の実家", color: "#ff6b6b" },
  villageChief: { x: 12, y: 12, w: 2, h: 2, name: "村長の家", color: "#ffd700" },
  stable: { x: 7, y: 2, w: 2, h: 2, name: "馬小屋", color: "#daa520" },
  // その他の家5件
  house1: { x: 5, y: 5, w: 2, h: 2, name: "田中さん宅", color: "#cd5c5c" },
  house2: { x: 10, y: 5, w: 2, h: 2, name: "鈴木さん宅", color: "#d0a0ff" },
  house3: { x: 2, y: 7, w: 2, h: 2, name: "武田さん宅", color: "#90ee90" },
  house4: { x: 12, y: 7, w: 2, h: 2, name: "山田さん宅", color: "#87ceeb" },
  house5: { x: 7, y: 12, w: 2, h: 2, name: "佐藤さん宅", color: "#ffb6c1" },
};

const NPCs = [
  { name: "鍛冶職人トム", home: "smithy", color: "#333" },
  { name: "宿屋の女将", home: "inn", color: "#444" },
  { name: "母親", home: "heroHome", color: "#555" },
  { name: "村長", home: "villageChief", color: "#666" },
  { name: "馬飼い", home: "stable", color: "#777" },
  { name: "田中さん", home: "house1", color: "#888" },
  { name: "鈴木さん", home: "house2", color: "#999" },
  { name: "武田さん", home: "house3", color: "#aaa" },
  { name: "山田さん", home: "house4", color: "#bbb" },
  { name: "佐藤さん", home: "house5", color: "#ccc" },
];

const GREETINGS = {
  smithy: "鍛冶職人: ようこそ！武器の修理ができますよ",
  inn: "女将: いらっしゃいませ！お泊まりですか？",
  heroHome: "母親: あら、帰ってきたのね。元気そうね",
  villageChief: "村長: よう！何か手伝えることはあるかな",
  stable: "馬飼い: ほい！馬の世話で忙しいんだ",
  house1: "田中さん: あ、勇者さんだ！",
  house2: "鈴木さん: いらっしゃい！",
  house3: "武田さん: よ、来たね！",
  house4: "山田さん: こんにちは！",
  house5: "佐藤さん: あ、世話になってます！",
};

class VillageGame {
  constructor() {
    this.canvas = document.getElementById("map-canvas");
    this.ctx = this.canvas.getContext("2d");
    this.messageBox = document.getElementById("message-box");
    this.locationDisplay = document.getElementById("location");
    this.timeDisplay = document.getElementById("time");

    this.playerX = 7;
    this.playerY = 7;
    this.playerDir = "front";
    this.heroImage = null;

    this.villagerImages = {
      front: null,
      back: null,
      left: null,
      right: null,
    };

    this.npcInstances = [];
    this.animals = [];
    this.gameTime = 6; // 朝6時
    this.frame = 0;

    this.keys = {};
    this.interactCooldown = 0;

    this.init();
  }

  init() {
    this.loadHeroImage();
    this.loadVillagerImages();
    this.createNPCs();
    this.createAnimals();
    this.setupInput();
    this.gameLoop();
  }

  loadHeroImage() {
    const img = new Image();
    img.onload = () => { this.heroImage = img; };
    img.src = "images/hero-front.svg";
  }

  loadVillagerImages() {
    const dirs = ['front', 'back', 'left', 'right'];
    dirs.forEach(dir => {
      const img = new Image();
      img.onload = () => { this.villagerImages[dir] = img; };
      img.src = `images/villager-${dir}.svg`;
    });
  }

  createNPCs() {
    NPCs.forEach((npc, i) => {
      const building = BUILDINGS[npc.home];
      this.npcInstances.push({
        ...npc,
        x: building.x + 0.5,
        y: building.y + 0.5,
        targetX: building.x + 0.5,
        targetY: building.y + 0.5,
        inHome: true,
        exitTimer: Math.random() * 300,
        direction: "front",
      });
    });
  }

  createAnimals() {
    // 馬2頭
    this.animals.push({ type: "horse", x: 6, y: 3, vx: 0.3, vy: 0.1, emoji: "🐴" });
    this.animals.push({ type: "horse", x: 8, y: 4, vx: -0.2, vy: 0.2, emoji: "🐴" });
    // 牛2頭
    this.animals.push({ type: "cow", x: 10, y: 10, vx: 0.15, vy: -0.2, emoji: "🐄" });
    this.animals.push({ type: "cow", x: 9, y: 11, vx: -0.25, vy: 0.1, emoji: "🐄" });
  }

  setupInput() {
    window.addEventListener("keydown", (e) => {
      this.keys[e.key] = true;
      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)) {
        e.preventDefault();
      }
      if (e.key === "e" || e.key === "E") {
        this.interact();
      }
    });

    window.addEventListener("keyup", (e) => {
      this.keys[e.key] = false;
    });
  }

  handleMovement() {
    let moved = false;
    if (this.keys["ArrowUp"]) {
      if (this.canMove(this.playerX, this.playerY - 1)) {
        this.playerY -= 1;
        this.playerDir = "back";
        moved = true;
      }
    }
    if (this.keys["ArrowDown"]) {
      if (this.canMove(this.playerX, this.playerY + 1)) {
        this.playerY += 1;
        this.playerDir = "front";
        moved = true;
      }
    }
    if (this.keys["ArrowLeft"]) {
      if (this.canMove(this.playerX - 1, this.playerY)) {
        this.playerX -= 1;
        this.playerDir = "left";
        moved = true;
      }
    }
    if (this.keys["ArrowRight"]) {
      if (this.canMove(this.playerX + 1, this.playerY)) {
        this.playerX += 1;
        this.playerDir = "right";
        moved = true;
      }
    }
    return moved;
  }

  canMove(x, y) {
    if (x < 0 || x >= GRID_COLS || y < 0 || y >= GRID_ROWS) return false;

    for (const building of Object.values(BUILDINGS)) {
      if (
        x >= building.x && x < building.x + building.w &&
        y >= building.y && y < building.y + building.h
      ) {
        return false;
      }
    }
    return true;
  }

  getCurrentLocation() {
    for (const [key, building] of Object.entries(BUILDINGS)) {
      if (
        this.playerX >= building.x && this.playerX < building.x + building.w &&
        this.playerY >= building.y && this.playerY < building.y + building.h
      ) {
        return key;
      }
    }
    return "広場";
  }

  interact() {
    if (this.interactCooldown > 0) return;
    this.interactCooldown = 30;

    const location = this.getCurrentLocation();
    const greeting = GREETINGS[location];
    if (greeting) {
      this.messageBox.textContent = greeting;
    }
  }

  updateNPCs() {
    this.npcInstances.forEach((npc) => {
      npc.exitTimer++;
      if (npc.inHome && npc.exitTimer > 300) {
        npc.inHome = false;
        npc.targetX = Math.random() * (GRID_COLS - 2);
        npc.targetY = Math.random() * (GRID_ROWS - 2);
      }

      if (!npc.inHome) {
        const dx = npc.targetX - npc.x;
        const dy = npc.targetY - npc.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < 0.3) {
          npc.inHome = true;
          npc.exitTimer = 0;
          const building = BUILDINGS[npc.home];
          npc.x = building.x + 0.5;
          npc.y = building.y + 0.5;
          npc.direction = "front";
        } else {
          // 方向を計算
          if (Math.abs(dy) > Math.abs(dx)) {
            npc.direction = dy > 0 ? "front" : "back";
          } else {
            npc.direction = dx > 0 ? "right" : "left";
          }
          npc.x += (dx / dist) * 0.05;
          npc.y += (dy / dist) * 0.05;
        }
      }
    });
  }

  updateAnimals() {
    this.animals.forEach((animal) => {
      animal.x += animal.vx;
      animal.y += animal.vy;

      if (animal.x < 1 || animal.x > GRID_COLS - 1) animal.vx *= -1;
      if (animal.y < 1 || animal.y > GRID_ROWS - 1) animal.vy *= -1;

      animal.x = Math.max(1, Math.min(GRID_COLS - 1, animal.x));
      animal.y = Math.max(1, Math.min(GRID_ROWS - 1, animal.y));
    });
  }

  draw() {
    const ctx = this.ctx;

    // 背景（草）
    ctx.fillStyle = "#3d8b3d";
    ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

    // グリッド背景パターン
    ctx.fillStyle = "#4a9a4a";
    for (let i = 0; i < GRID_COLS; i++) {
      for (let j = 0; j < GRID_ROWS; j++) {
        if ((i + j) % 2 === 0) {
          ctx.fillRect(i * GRID_SIZE, j * GRID_SIZE, GRID_SIZE, GRID_SIZE);
        }
      }
    }

    // 道の描画（簡単な十字路）
    ctx.fillStyle = "#999999";
    ctx.fillRect(0, 7 * GRID_SIZE, CANVAS_SIZE, GRID_SIZE); // 水平道
    ctx.fillRect(7 * GRID_SIZE, 0, GRID_SIZE, CANVAS_SIZE); // 垂直道

    // 建物の描画
    for (const [key, building] of Object.entries(BUILDINGS)) {
      const x = building.x * GRID_SIZE;
      const y = building.y * GRID_SIZE;
      const w = building.w * GRID_SIZE;
      const h = building.h * GRID_SIZE;

      ctx.fillStyle = building.color;
      ctx.fillRect(x, y, w, h);
      ctx.strokeStyle = "#000";
      ctx.lineWidth = 2;
      ctx.strokeRect(x, y, w, h);

      // 建物のラベル
      ctx.fillStyle = "#fff";
      ctx.font = "bold 10px Arial";
      ctx.textAlign = "center";
      ctx.fillText(building.name, x + w / 2, y + h / 2 - 3);
      ctx.fillText("(E)", x + w / 2, y + h / 2 + 8);
    }

    // 動物の描画
    ctx.font = "20px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    this.animals.forEach((animal) => {
      ctx.fillText(animal.emoji, animal.x * GRID_SIZE + GRID_SIZE / 2, animal.y * GRID_SIZE + GRID_SIZE / 2);
    });

    // NPC の描画（SVG）
    this.npcInstances.forEach((npc) => {
      const img = this.villagerImages[npc.direction];
      if (img) {
        const px = npc.x * GRID_SIZE + GRID_SIZE / 2 - 10;
        const py = npc.y * GRID_SIZE + GRID_SIZE / 2 - 10;
        ctx.save();
        ctx.globalAlpha = 0.9;
        ctx.drawImage(img, px, py, 20, 20);
        ctx.restore();
      }
    });

    // プレイヤーの描画
    const px = this.playerX * GRID_SIZE + GRID_SIZE / 2 - 10;
    const py = this.playerY * GRID_SIZE + GRID_SIZE / 2 - 10;

    if (this.heroImage) {
      ctx.save();
      ctx.globalAlpha = 0.95;
      ctx.drawImage(this.heroImage, px, py, 20, 20);
      ctx.restore();
    } else {
      ctx.fillStyle = "#ffff00";
      ctx.fillRect(px, py, 20, 20);
    }

    // 光の効果（プレイヤーの周り）
    ctx.strokeStyle = "rgba(255, 215, 0, 0.3)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(this.playerX * GRID_SIZE + GRID_SIZE / 2, this.playerY * GRID_SIZE + GRID_SIZE / 2, 25, 0, Math.PI * 2);
    ctx.stroke();
  }

  updateUI() {
    this.locationDisplay.textContent = this.getCurrentLocation();
    const hour = Math.floor(this.gameTime);
    const minute = Math.round((this.gameTime - hour) * 60);
    this.timeDisplay.textContent = `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`;
  }

  gameLoop = () => {
    this.frame++;

    // 時間経過（60フレーム = 1時間相当）
    if (this.frame % 60 === 0) {
      this.gameTime = (this.gameTime + 0.5) % 24;
    }

    this.handleMovement();
    this.updateNPCs();
    this.updateAnimals();
    this.updateUI();

    if (this.interactCooldown > 0) this.interactCooldown--;

    this.draw();
    requestAnimationFrame(this.gameLoop);
  };
}

document.addEventListener("DOMContentLoaded", () => {
  new VillageGame();
});
