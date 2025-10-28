/* 🎯 首頁 + 作品一/二連結 + 作品三（CSV 小測驗，預設抽 10 題）
 * 🔧 側邊選單：滑鼠靠左 < 40px 自動滑出，離開自動收回；寬 100、全高。
 * 🎨 首頁標題：輕微擺動＋柔和變色；滑鼠移上去微放大＋淡淡光暈。
 * 📁 題庫：優先讀 data/questions.csv；讀不到用內建 10 題備援。
 */

//// ----------- 首頁 / 背景 ----------- ////
let colors = ["#232946","#1C1B1F","#393E46","#22223B","#4F5D75"];
let pos = [];

//// ----------- 首頁標題 hover 狀態 ----------- ////
let titleHover = false;
const TITLE_HOVER_PAD = 12;

//// ----------- 可拉縮側邊選單（全部 p5 畫） ----------- ////
const MENU_W = 100;         // 選單寬
const HANDLE_W = 14;        // 把手寬（收合後還留一條可召喚）
const HOVER_OPEN_X = 40;    // 靠左多少 px 以內就打開
let menuX = -MENU_W + HANDLE_W;        // 目前 x（動畫位置）
let menuTarget = -MENU_W + HANDLE_W;   // 目標 x
let menuPinned = false;     // （若要「釘住不收」可改 true）

// 配色
let MENU_BG, MENU_BG_HOVER, MENU_TEXT, MENU_ACCENT;
let sideMenuItems = [
  { label: "作品一", type: "link", url: "https://huangshiting60-gif.github.io/20251014-1/" },
  { label: "作品二", type: "link", url: "https://hackmd.io/@DVFtTMYjTmumEkY6i9d0lw/SkBeKOyhll" },
  { label: "作品三", type: "quiz" }
];
let sideMenuBoxes = [];
let sideHoverIndex = -1;

//// ----------- 畫面狀態 ----------- ////
let appState = 'home'; // home | quiz_loading | intro | quiz | result

//// ----------- 小測驗設定 ----------- ////
const NUM_QUESTIONS = 10;   // ←需求：一次 10 題
let allRows = [];
let quiz = [];
let qIdx = 0;
let score = 0;
let buttons = [];
let particles = [];
let shakeT = 0;
let toastTimer = 0, toastText = '', toastGood = true;

// 內建 10 題備援題庫（讀不到 CSV 就用它）
const FALLBACK_CSV = `question,optionA,optionB,optionC,optionD,answer,feedback
p5.js 的 setup 什麼時候執行？,每一幀都執行,只在開始執行一次,按滑鼠時,視窗縮放時,B,setup 只在開始呼叫一次，初始化用
下列何者能在每一幀重繪畫面？,mousePressed,frameRate,draw,createCanvas,C,draw 會每幀自動呼叫
CSV 在 p5.js 中可用哪個函式讀取？,loadImage,loadSound,loadTable,loadFont,C,讀取表格題庫用 loadTable
在 p5.js 中改變文字大小要用？,textSize,strokeWeight,textAlign,textLeading,A,textSize 可以設定文字大小
想要把原點移動到畫面中央要用？,rotate,translate,scale,push,B,translate 可平移座標系
要畫沒有邊框的圓形該如何設定？,noStroke(),noFill(),stroke(0),strokeWeight(0),A,noStroke() 會取消外框線
把畫面清成單一底色應該用？,fill,background,clear,erase,B,background 會填滿整個畫布背景
讓圖形每幀旋轉需要用到哪個變數或函式？,mouseX,frameCount,windowWidth,keyCode,B,frameCount 每幀遞增可用來製作動畫
使用者按滑鼠時會觸發哪個事件？,mouseMoved,mousePressed,keyPressed,mouseReleased,B,mousePressed 在按下時觸發
想在視窗大小改變時自動調整畫布，該放哪個函式？,setup,draw,windowResized,preload,C,windowResized 在視窗改變時觸發`;

//// ----------- 載題庫 ----------- ////
async function loadQuestionBank() {
  try {
    const res = await fetch('data/questions.csv', { cache: 'no-store' });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const text = await res.text();
    allRows = parseCSV(text);
    if (allRows.length === 0) throw new Error('CSV 為空或欄位錯誤');
    console.log('[題庫] 使用外部 CSV，共', allRows.length, '題');
  } catch (err) {
    console.warn('[題庫] 外部 CSV 載入失敗，改用內建題庫：', err);
    allRows = parseCSV(FALLBACK_CSV);
  }
}
function parseCSV(text){
  const lines = text.trim().split(/\r?\n/);
  if (lines.length <= 1) return [];
  const header = lines[0].split(',');
  const idx = n => header.indexOf(n);
  const qi=idx('question'), ai=idx('optionA'), bi=idx('optionB'),
        ci=idx('optionC'), di=idx('optionD'), ansi=idx('answer'), fbi=idx('feedback');
  if ([qi,ai,bi,ci,di,ansi,fbi].some(i => i === -1)) return [];
  const rows=[];
  for(let r=1;r<lines.length;r++){
    const cols = splitCSVLine(lines[r]);
    const q=cols[qi], A=cols[ai], B=cols[bi], C=cols[ci], D=cols[di];
    const ans=(cols[ansi]||'').trim().toUpperCase();
    const fb=cols[fbi]||'';
    if (q&&A&&B&&C&&D&&'ABCD'.includes(ans)) rows.push({question:q, options:[A,B,C,D], answer:ans, feedback:fb});
  }
  return rows;
}
function splitCSVLine(line){
  const out=[]; let cur='', inQ=false;
  for(let i=0;i<line.length;i++){
    const ch=line[i];
    if(inQ){
      if(ch=== '"'){ if(line[i+1]==='"'){ cur+='"'; i++; } else inQ=false; }
      else cur+=ch;
    }else{
      if(ch=== '"') inQ=true;
      else if(ch=== ','){ out.push(cur); cur=''; }
      else cur+=ch;
    }
  }
  out.push(cur); return out;
}
function shuffleInPlace(a){ for(let i=a.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [a[i],a[j]]=[a[j],a[i]];} return a; }

//// ----------- p5 生命週期 ----------- ////
async function preload(){ await loadQuestionBank(); }

function setup(){
  const cnv = createCanvas(window.innerWidth, window.innerHeight);
  cnv.parent("game-container");
  rectMode(CENTER);
  textFont('sans-serif');

  // 選單配色
  MENU_BG       = color(17, 24, 39, 180);  // 深藍灰玻璃
  MENU_BG_HOVER = color(30, 41, 59, 210);  // hover 稍深
  MENU_TEXT     = color(238);              // 文字
  MENU_ACCENT   = color(14, 165, 233);     // 青色重點

  generate();  // 先畫首頁背景
}

function windowResized(){
  resizeCanvas(window.innerWidth, window.innerHeight);
  if (appState === 'home') generate();
}

/* 首頁不清畫面；其他狀態清畫面 */
function draw(){
  if (appState === 'home'){
    drawTitle();
    drawSideMenu(); // 任何頁面都可喚出
    return;
  }

  background(colors[0]);

  if (appState === 'quiz_loading'){
    drawLoading();
    if (allRows && allRows.length>0){ buildQuizFromRows(allRows); appState='intro'; }
    drawSideMenu();
    return;
  }

  if (appState === 'intro'){
    drawIntro();
    drawSideMenu();
    drawToastTop();
    return;
  }

  if (appState === 'quiz'){
    if (shakeT>0){ push(); translate(random(-4,4),random(-4,4)); shakeT--; drawQuiz(); pop(); }
    else drawQuiz();
    updateParticles();
    drawSideMenu();
    drawToastTop();
    return;
  }

  if (appState === 'result'){
    drawResult();
    updateParticles();
    drawSideMenu();
    drawToastTop();
    return;
  }
}

//// ----------- 首頁標題（微擺動＋呼吸變色＋hover 微放大光暈） ----------- ////
function drawTitle() {
  const title = '教育科技學系';
  const subtitle = '414730175 黃詩婷';

  const titleSize = Math.min(width, height) * 0.09;
  const subtitleSize = Math.min(width, height) * 0.035;

  const totalHeight = titleSize + subtitleSize + 18;
  const centerY = height / 2 - totalHeight / 2 + titleSize / 2;

  // ✨ 文字飛入動畫參數
  const duration = 120; // 動畫總幀數（越大越慢）
  const t = constrain(frameCount / duration, 0, 1);
  const ease = t * t * (3 - 2 * t); // 平滑函數（ease in-out）

  // X 位置：從左到中間
  const x = lerp(-width * 0.3, width / 2, ease);
  // 旋轉角度：由 -PI/8 轉回 0
  const angle = lerp(-PI / 8, 0, ease);
  // 透明度：由 0 → 255
  const alpha = lerp(0, 255, ease);
  // 顏色：白 ↔ 淡藍
  const hueShift = sin(frameCount * 0.03) * 0.5 + 0.5;
  const r = lerp(255, 180, hueShift);
  const g = lerp(255, 220, hueShift);
  const b = 255;

  // hover 效果（略亮 + 放大）
  textSize(titleSize);
  const tw = textWidth(title);
  const hovered = mouseX > width / 2 - tw / 2 - 20 && mouseX < width / 2 + tw / 2 + 20 &&
                  mouseY > centerY - titleSize / 2 && mouseY < centerY + titleSize / 2;
  const scaleUp = hovered ? 1.05 : 1.0;

  push();
  translate(x, centerY);
  rotate(angle);
  scale(scaleUp);

  // 光暈效果
  if (hovered) {
    noStroke();
    fill(r, g, b, 60);
    textAlign(CENTER, CENTER);
    textSize(titleSize + 8);
    text(title, 0, 0);
  }

  // 主文字
  fill(r, g, b, alpha);
  noStroke();
  textAlign(CENTER, CENTER);
  textSize(titleSize);
  text(title, 0, 0);
  pop();

  // 副標題固定
  textAlign(CENTER, TOP);
  textSize(subtitleSize);
  fill(255, alpha);
  text(subtitle, width / 2, centerY + titleSize / 2 + 14);
}

//// ----------- 可拉縮側邊選單（動畫＋自動收合） ----------- ////
function drawSideMenu(){
  const nearEdge = mouseX < HOVER_OPEN_X;
  const insideMenu = mouseX >= menuX && mouseX <= menuX + MENU_W;

  if (!menuPinned){
    if (nearEdge || insideMenu) menuTarget = 0;                 // 展開
    else                        menuTarget = -MENU_W + HANDLE_W; // 收回只留把手
  }
  menuX = lerp(menuX, menuTarget, 0.15); // 平滑動畫

  // 背板（全高）
  noStroke();
  fill(MENU_BG);
  rectMode(CORNER);
  rect(menuX, 0, MENU_W, height);

  // 把手
  const handleX = menuX;
  const handleY = height/2;
  fill(MENU_ACCENT);
  rect(handleX-1, handleY-40, HANDLE_W, 80, 6);
  // 把手上的三條橫線
  push();
  stroke(255); strokeWeight(2);
  const cx = handleX + HANDLE_W/2 - 3;
  for (let i=0;i<3;i++){ line(cx-6, handleY-10 + i*10, cx+6, handleY-10 + i*10); }
  pop();

  // 選單項目
  const n = sideMenuItems.length;
  const itemH = 36;
  const gap = 12;
  const totalH = n*itemH + (n-1)*gap;
  let y = height/2 - totalH/2;

  sideMenuBoxes = [];
  sideHoverIndex = -1;

  textAlign(LEFT, CENTER);
  textSize(14);

  for (let i=0;i<n;i++){
    const box = { x: menuX, y: y, w: MENU_W, h: itemH, i };
    const hover = (mouseX>=box.x && mouseX<=box.x+box.w && mouseY>=box.y && mouseY<=box.y+box.h);
    if (hover) sideHoverIndex = i;

    fill(hover ? MENU_BG_HOVER : MENU_BG);
    rect(box.x, box.y, box.w, box.h);

    if (hover){
      fill(MENU_ACCENT);
      rect(box.x, box.y, 3, box.h);
    }

    fill(MENU_TEXT);
    text(sideMenuItems[i].label, box.x + 16, box.y + box.h/2 + 1);

    sideMenuBoxes.push(box);
    y += itemH + gap;
  }

  // 游標形狀（只在選單範圍內處理，避免干擾標題 hover）
  if (insideMenu && sideHoverIndex !== -1) cursor(HAND);
  else if (nearEdge) cursor('pointer');
  else cursor(ARROW);
}

function mousePressed(){
  const insideMenu = mouseX >= menuX && mouseX <= menuX + MENU_W;
  if (insideMenu && sideMenuBoxes.length){
    for (const b of sideMenuBoxes){
      if (mouseX>=b.x && mouseX<=b.x+b.w && mouseY>=b.y && mouseY<=b.y+b.h){
        const item = sideMenuItems[b.i];
        if (item.type === 'link' && item.url) {
          window.location.href = item.url;
        } else if (item.type === 'quiz') {
          appState = 'quiz_loading';
        }
        return;
      }
    }
  }

  if (appState === 'home'){
    if (!insideMenu) generate(); // 點非選單區：更新首頁背景
  } else if (appState === 'quiz'){
    for(const c of buttons) if(c.hit(mouseX,mouseY)) handleAnswer(c);
  }
}
function touchStarted(){ mousePressed(); }

//// ----------- 背景生成 ----------- ////
function generate(){
  pos=[]; shuffleInPlace(colors); background(colors[0]);
  dots(0,0,width,int(random(18,22)));
  for (let p of pos){
    let len=random(width*0.5), col=255*int(random(2));
    push(); translate(p.x,p.y); rotate(int(random(8))*PI*0.25);
    stroke(col); strokeWeight(random(2)*random()); line(0,len,0,0); pop();
  }
  for(let i=0;i<10;i++){
    let x=random(-0.1,1.1)*width, y=random(-0.1,1.1)*height, w=random(80,150);
    dots(x-w/2,y-w/2,w,int(random(5,15)));
  }
}
function dots(x_,y_,w_,c){
  let seg=c, wseg=w_/seg; push(); translate(x_,y_); noStroke();
  for(let i=0;i<seg;i++){
    for(let j=0;j<seg;j++){
      let x=i*wseg+wseg/2, y=j*wseg+wseg/2, ww=random(wseg*0.5);
      fill(random(colors)); form(x,y,ww);
      if(c>=18 && random()<0.189) pos.push(createVector(x,y));
    }
  } pop();
}
function form(x,y,s){ push(); translate(x,y); rotate(int(random(10))*PI*0.25); (int(random(2))===0?circle:square)(0,0,s); pop(); }

//// ----------- 小測驗 ----------- ////
function buildQuizFromRows(rows){
  if (rows.length < NUM_QUESTIONS) {
    makeToast(`題庫只有 ${rows.length} 題，不足 ${NUM_QUESTIONS} 題`, false);
  }
  const pool=rows.slice(); shuffleInPlace(pool);
  quiz=pool.slice(0, Math.min(NUM_QUESTIONS, pool.length));
  qIdx=0; score=0; buttons=[]; particles=[];
}
function drawLoading(){ fill(255); textAlign(CENTER,CENTER); textSize(22); text('載入題庫中...', width/2, height/2); }

function drawIntro(){
  fill(255); textAlign(CENTER,CENTER);
  textSize(Math.min(width,height)*0.08); text('作品三：小測驗', width/2, height*0.32);
  textSize(18); text('系統會從題庫亂數抽出 10 題。\n每題四選一，答完顯示成績與評語。', width/2, height*0.45);
  drawBtn(width/2, height*0.62, 220, 56, '開始作答', ()=>{ ensureButtons(4); appState='quiz'; });
  drawBtn(width/2, height*0.72, 220, 44, '返回首頁', ()=>{ appState='home'; generate(); });
}

function drawQuiz(){
  const q=quiz[qIdx];
  fill(255); textAlign(LEFT,TOP); textSize(18);
  text(`第 ${qIdx+1} 題／共 ${quiz.length} 題`, 32, 28);
  textSize(26);
  const boxW=Math.min(width*0.86,960); drawTextBox(32,64,boxW,q.question);

  const startY=180, gap=66, btnW=Math.min(width*0.78,720), cx=32+btnW/2;
  ensureButtons(4);
  const labels=['A','B','C','D'];
  for(let i=0;i<4;i++){ const y=startY+i*gap; buttons[i].set(cx,y,btnW,52,`${labels[i]}. ${q.options[i]}`); buttons[i].draw(); }
}

function handleAnswer(btn){
  const q=quiz[qIdx], picked=btn.label.slice(0,1), correct=(picked===q.answer);
  makeToast(correct?'答對了！':`答錯了：${q.feedback || '再想想～'}`, correct);
  if(correct){ score++; for(let i=0;i<50;i++) particles.push(new Particle(width/2,0)); setTimeout(nextQuestionOrEnd,550); }
  else { shakeT=18; setTimeout(nextQuestionOrEnd,600); }
}
function nextQuestionOrEnd(){ qIdx++; if(qIdx>=quiz.length) appState='result'; }

function drawResult(){
  fill(255); textAlign(CENTER,CENTER);
  const percent=Math.round((score/quiz.length)*100);
  let msg = percent===100?'滿分！超強！🎉' : percent>=67?'很不錯，再接再厲！' : percent>=34?'加油～再多練習就會更穩！' : '別氣餒，重來一次看看吧！';
  textSize(Math.min(width,height)*0.08); text(`${score} / ${quiz.length}`, width/2, height*0.33);
  textSize(22); text(`成績：${percent} 分\n${msg}`, width/2, height*0.48);
  drawBtn(width/2, height*0.66, 220, 56, '再測一次', ()=>{ buildQuizFromRows(allRows); appState='intro'; });
  drawBtn(width/2, height*0.76, 220, 44, '返回首頁', ()=>{ appState='home'; generate(); });
}

//// ----------- UI 工具 / 特效 / 提示 ----------- ////
function drawTextBox(x,y,w,content){
  fill(255,255,255,12); rectMode(CORNER); rect(x,y,w,84,10);
  fill(255); textAlign(LEFT,TOP); textSize(24); textWrap(WORD); text(content, x+16, y+12, w-32);
}
function drawBtn(cx,cy,w,h,label,onClick){
  const hovered=(mouseX>=cx-w/2 && mouseX<=cx+w/2 && mouseY>=cy-h/2 && mouseY<=cy+h/2);
  push(); translate(cx,cy); const r=12; fill(hovered?'#4254c9':'#3a48b6'); rectMode(CENTER); rect(0,0,w,h,r);
  fill(255); textAlign(CENTER,CENTER); textSize(18); text(label,0,2); pop();
  if(!drawBtn._areas) drawBtn._areas=[]; drawBtn._areas.push({x:cx-w/2,y:cy-h/2,w,h,onClick});
}
function mouseReleased(){
  if(!drawBtn._areas) return;
  const areas=drawBtn._areas; drawBtn._areas=[];
  for(const a of areas){ if(mouseX>=a.x && mouseX<=a.x+a.w && mouseY>=a.y && mouseY<=a.y+a.h){ a.onClick && a.onClick(); break; } }
}
function touchEnded(){ mouseReleased(); }
function ensureButtons(n){ while(buttons.length<n) buttons.push(new ChoiceButton()); }

class ChoiceButton{
  constructor(){ this.x=this.y=0; this.w=this.h=0; this.label=''; }
  set(x,y,w,h,label){ this.x=x; this.y=y; this.w=w; this.h=h; this.label=label; }
  draw(){
    const hovered=(mouseX>=this.x-this.w/2 && mouseX<=this.x+this.w/2 &&
                   mouseY>=this.y-this.h/2 && mouseY<=this.y+this.h/2);
    push(); translate(this.x,this.y); rectMode(CENTER);
    fill(hovered?'rgba(255,255,255,0.14)':'rgba(255,255,255,0.08)');
    rect(0,0,this.w,this.h,10);
    fill(255); textAlign(CENTER,CENTER); textSize(18); text(this.label,0,2);
    pop();
  }
  hit(mx,my){ return (mx>=this.x-this.w/2 && mx<=this.x+this.w/2 && my>=this.y-this.h/2 && my<=this.y+this.h/2); }
}

class Particle{
  constructor(x,y){ this.x=x+random(-40,40); this.y=y+random(-10,20); this.vx=random(-3,3); this.vy=random(2,6);
    this.life=60+random(20); this.size=random(4,10); this.c=color(random(150,255), random(150,255), random(150,255)); }
  update(){ this.x+=this.vx; this.y+=this.vy; this.vy+=0.12; this.life--; }
  draw(){ noStroke(); fill(this.c); circle(this.x,this.y,this.size); }
  get dead(){ return this.life<=0 || this.y>height+40; }
}
function updateParticles(){ for(let i=particles.length-1;i>=0;i--){ particles[i].update(); particles[i].draw(); if(particles[i].dead) particles.splice(i,1); } }

function makeToast(txt,good){ toastText=txt; toastGood=!!good; toastTimer=60; }
function drawToastTop(){
  if(toastTimer<=0) return;
  const t=toastTimer/60, y=lerp(height*0.18,height*0.12,1-t);
  fill(toastGood?'rgba(78,205,196,0.95)':'rgba(255,99,71,0.95)'); rectMode(CENTER);
  const w=Math.min(width*0.7,640); rect(width/2,y,w,44,10);
  fill(0); textAlign(CENTER,CENTER); textSize(16); text(toastText,width/2,y+1);
  toastTimer--;
}
