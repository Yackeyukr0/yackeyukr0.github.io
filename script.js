// 物理基础常数
const k = 8.617e-5;
const q = 1.602e-19;
const h = 6.626e-34;
const m0 = 9.109e-31;

// 半导体材料参数
const materialDB = {
    Si:    { Eg: 1.12,  mn: 1.08, mp: 0.56 },
    GaAs:  { Eg: 1.424, mn: 0.067, mp: 0.45 }
};

// DOM 元素
const canvas = document.getElementById('mainCanvas');
const ctx = canvas.getContext('2d');
const matSelect = document.getElementById('matSelect');
const tempSlider = document.getElementById('tempSlider');
const tempVal = document.getElementById('tempVal');
const dopeSlider = document.getElementById('dopeSlider');
const dopeVal = document.getElementById('dopeVal');
const dopeType = document.getElementById('dopeType');
const energySlider = document.getElementById('energySlider');
const energyVal = document.getElementById('energyVal');
const speedSlider = document.getElementById('speedSlider');
const speedVal = document.getElementById('speedVal');
const fluctSlider = document.getElementById('fluctSlider');
const fluctVal = document.getElementById('fluctVal');
const animBtn = document.getElementById('animBtn');
const resetBtn = document.getElementById('resetBtn');

// 全局仿真参数
let sim = {
    mat: 'Si',
    T: 300,
    dop: 1e15,
    type: 'n',
    eRange: 2.0,
    aSpeed: 1.0,
    fluct: 1.0,
    runAnim: false,
    carriers: []
};

// 画布自适应
function resizeCanvas() {
    const wrap = canvas.parentElement;
    canvas.width = wrap.clientWidth;
    canvas.height = wrap.clientHeight;
    renderFull();
}
window.addEventListener('resize', resizeCanvas);

// 物理计算：有效状态密度
function calcN(T, mStar) {
    const m = mStar * m0;
    const term = (2 * Math.PI * m * k * T * q) / (h * h);
    return 2 * Math.pow(term, 1.5) / 1e6;
}

// 物理计算：费米能级
function calcEF(T, Nd, mat, type) {
    const { Eg, mn, mp } = materialDB[mat];
    const Ec = Eg / 2;
    const Ev = -Eg / 2;
    if(type === 'n'){
        const Nc = calcN(T, mn);
        return Ec - k * T * Math.log(Nc / Nd);
    }else{
        const Nv = calcN(T, mp);
        return Ev + k * T * Math.log(Nv / Nd);
    }
}

// 物理计算：态密度（曲线形态随材料/能量动态变化）
function calcDOS(E, mat) {
    const { Eg, mn, mp } = materialDB[mat];
    const Ec = Eg / 2;
    const Ev = -Eg / 2;
    const mnE = mn * m0;
    const mpE = mp * m0;
    const base = 1 / (2 * Math.PI**2) * Math.pow(2 * q / (h*h), 1.5);

    if(E >= Ec) return base * Math.pow(mnE, 1.5) * Math.sqrt(E - Ec);
    if(E <= Ev) return base * Math.pow(mpE, 1.5) * Math.sqrt(Ev - E);
    return 0;
}

// 初始化载流子（带运动参数，热波动直接影响轨迹）
function spawnCarriers() {
    sim.carriers = [];
    const { Eg } = materialDB[sim.mat];
    const w = canvas.width, h = canvas.height;
    const pad = 50;
    const cy = h / 2;
    const cbY = cy - (Eg/2 / sim.eRange) * (h - 2*pad);
    const vbY = cy + (Eg/2 / sim.eRange) * (h - 2*pad);

    for(let i = 0; i < 12; i++){
        // 电子 导带
        sim.carriers.push({
            type: 'e',
            x: Math.random()*(w-pad*2)+pad,
            y: Math.random()*(cy - cbY)+cbY,
            vx: (Math.random()-0.5)*sim.fluct*2,
            vy: (Math.random()-0.5)*sim.fluct*2
        });
        // 空穴 价带
        sim.carriers.push({
            type: 'h',
            x: Math.random()*(w-pad*2)+pad,
            y: Math.random()*(vbY - cy)+cy,
            vx: (Math.random()-0.5)*sim.fluct*2,
            vy: (Math.random()-0.5)*sim.fluct*2
        });
    }
}

// 主渲染函数：分层绘制 网格→坐标轴→能带→费米能级→态密度→粒子（全图形联动）
function renderFull() {
    const { mat, T, dop, type, eRange } = sim;
    const { Eg } = materialDB[mat];
    const EF = calcEF(T, dop, mat, type);

    const w = canvas.width;
    const h = canvas.height;
    const pad = 50;
    const cy = h / 2;
    const EMin = -eRange;
    const EMax = eRange;
    const totalE = EMax - EMin;

    ctx.clearRect(0,0,w,h);

    // 1. 精致浅色网格背景
    ctx.fillStyle = '#f7f8fa';
    ctx.fillRect(pad, pad, w-pad*2, h-pad*2);
    ctx.strokeStyle = '#e4e7ed';
    ctx.lineWidth = 1;
    const gridSize = 25;
    // 横向网格
    for(let y = pad; y <= h-pad; y += gridSize){
        ctx.beginPath(); ctx.moveTo(pad,y); ctx.lineTo(w-pad,y); ctx.stroke();
    }
    // 纵向网格
    for(let x = pad; x <= w-pad; x += gridSize){
        ctx.beginPath(); ctx.moveTo(x,pad); ctx.lineTo(x,h-pad); ctx.stroke();
    }

    // 2. 坐标轴 + 精细刻度
    ctx.strokeStyle = '#444';
    ctx.lineWidth = 1.5;
    // 纵轴 能量 eV
    ctx.beginPath(); ctx.moveTo(pad,pad); ctx.lineTo(pad,h-pad); ctx.stroke();
    // 横轴 态密度
    ctx.beginPath(); ctx.moveTo(pad,h-pad); ctx.lineTo(w-pad,h-pad); ctx.stroke();

    // 纵轴能量刻度（随能量范围动态变化）
    ctx.fillStyle = '#555';
    ctx.font = '12px Segoe UI';
    const eTicks = [-eRange, -eRange/2, 0, eRange/2, eRange];
    eTicks.forEach(ev => {
        const y = cy - (ev / eRange) * (h - 2*pad);
        ctx.beginPath(); ctx.moveTo(pad-5,y); ctx.lineTo(pad,y); ctx.stroke();
        ctx.fillText(ev.toFixed(1)+' eV', pad-35, y+4);
    });

    // 轴标题
    ctx.save();
    ctx.translate(22, h/2);
    ctx.rotate(-Math.PI/2);
    ctx.font = '14px Segoe UI';
    ctx.fillText('Energy (eV)',0,0);
    ctx.restore();
    ctx.fillText('Density of States', w/2-80, h-18);

    // 3. 导带/价带 渐变高亮能带线（材料变化 → 线条位置+渐变区域同步变）
    const cbY = cy - (Eg/2 / eRange) * (h - 2*pad);
    const vbY = cy + (Eg/2 / eRange) * (h - 2*pad);
    // 能带渐变填充
    const gradCB = ctx.createLinearGradient(0,cbY-20,0,cbY);
    gradCB.addColorStop(0,'rgba(255,153,51,0)');
    gradCB.addColorStop(1,'rgba(255,153,51,0.25)');
    ctx.fillStyle = gradCB;
    ctx.fillRect(pad, cbY-20, w-pad*2, 20);

    const gradVB = ctx.createLinearGradient(0,vbY,0,vbY+20);
    gradVB.addColorStop(0,'rgba(255,153,51,0.25)');
    gradVB.addColorStop(1,'rgba(255,153,51,0)');
    ctx.fillStyle = gradVB;
    ctx.fillRect(pad, vbY, w-pad*2, 20);

    // 能带主线
    ctx.strokeStyle = '#ff9933';
    ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.moveTo(pad,cbY); ctx.lineTo(w-pad,cbY); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(pad,vbY); ctx.lineTo(w-pad,vbY); ctx.stroke();
    ctx.fillStyle = '#333';
    ctx.fillText('CB', pad+8, cbY-6);
    ctx.fillText('VB', pad+8, vbY+18);

    // 4. 费米能级 红色高亮线 + 半透明能级带（参数变化 → 整条线+填充区域移动）
    const efY = cy - (EF / eRange) * (h - 2*pad);
    // 费米能级填充带
    const gradEF = ctx.createLinearGradient(0,efY-15,0,efY+15);
    gradEF.addColorStop(0,'rgba(236,71,71,0)');
    gradEF.addColorStop(0.5,'rgba(236,71,71,0.22)');
    gradEF.addColorStop(1,'rgba(236,71,71,0)');
    ctx.fillStyle = gradEF;
    ctx.fillRect(pad, efY-15, w-pad*2, 30);
    // 费米主线
    ctx.strokeStyle = '#ec4747';
    ctx.setLineDash([6,4]);
    ctx.lineWidth = 2.2;
    ctx.beginPath(); ctx.moveTo(pad,efY); ctx.lineTo(w-pad,efY); ctx.stroke();
    ctx.setLineDash([]);
    // 费米数值标注
    ctx.fillStyle = '#ec4747';
    ctx.font = '13px Segoe UI';
    ctx.fillText(`E_F = ${EF.toFixed(3)} eV`, w-140, efY-8);

    // 5. 态密度曲线 + 渐变填充（材料/能量变化 → 曲线形态、峰值、面积完全形变）
    const dosGrad = ctx.createLinearGradient(0,0,w,0);
    dosGrad.addColorStop(0,'rgba(41,147,237,0.1)');
    dosGrad.addColorStop(1,'rgba(41,147,237,0.3)');
    ctx.fillStyle = dosGrad;
    ctx.strokeStyle = '#2993ed';
    ctx.lineWidth = 2.2;

    ctx.beginPath();
    let first = true;
    const step = totalE / 700;
    for(let E = EMin; E <= EMax; E += step){
        const dos = calcDOS(E, mat);
        const x = pad + dos * 2200;
        const y = cy - (E / eRange) * (h - 2*pad);
        if(first) { ctx.moveTo(x,y); first = false; }
        else ctx.lineTo(x,y);
    }
    ctx.lineTo(pad, cy - (EMax/eRange)*(h-2*pad));
    ctx.lineTo(pad, cy - (EMin/eRange)*(h-2*pad));
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // 6. 载流子粒子（发光特效，热波动/速度实时改变运动状态）
    if(sim.runAnim){
        sim.carriers.forEach(c => {
            // 更新位置
            c.x += c.vx * sim.aSpeed;
            c.y += c.vy * sim.aSpeed;
            // 边界反弹
            if(c.x < pad || c.x > w-pad) c.vx *= -1;
            if(c.y < pad || c.y > h-pad) c.vy *= -1;

            // 粒子外发光
            const glow = ctx.createRadialGradient(c.x,c.y,0,c.x,c.y,8);
            if(c.type === 'e'){
                glow.addColorStop(0,'rgba(41,147,237,0.8)');
                glow.addColorStop(1,'rgba(41,147,237,0)');
            }else{
                glow.addColorStop(0,'rgba(236,71,71,0.8)');
                glow.addColorStop(1,'rgba(236,71,71,0)');
            }
            ctx.fillStyle = glow;
            ctx.beginPath();
            ctx.arc(c.x,c.y,8,0,Math.PI*2);
            ctx.fill();

            // 粒子核心
            ctx.fillStyle = c.type === 'e' ? '#2993ed' : '#ec4747';
            ctx.beginPath();
            ctx.arc(c.x,c.y,4,0,Math.PI*2);
            ctx.fill();
        });
    }
}

// 动画循环
function animLoop() {
    if(!sim.runAnim) return;
    renderFull();
    requestAnimationFrame(animLoop);
}

// ========== 全局事件监听：所有参数变更 → 立即重绘全图 ==========
matSelect.addEventListener('change', () => {
    sim.mat = matSelect.value;
    spawnCarriers();
    renderFull();
});

tempSlider.addEventListener('input', () => {
    sim.T = +tempSlider.value;
    tempVal.textContent = sim.T;
    renderFull();
});

dopeSlider.addEventListener('input', () => {
    const p = +dopeSlider.value;
    sim.dop = Math.pow(10, p);
    dopeVal.textContent = `1e${p}`;
    renderFull();
});

dopeType.addEventListener('change', () => {
    sim.type = dopeType.value;
    renderFull();
});

energySlider.addEventListener('input', () => {
    sim.eRange = +energySlider.value;
    energyVal.textContent = sim.eRange.toFixed(1);
    spawnCarriers();
    renderFull();
});

speedSlider.addEventListener('input', () => {
    sim.aSpeed = +speedSlider.value;
    speedVal.textContent = `${sim.aSpeed.toFixed(1)}x`;
});

fluctSlider.addEventListener('input', () => {
    sim.fluct = +fluctSlider.value;
    fluctVal.textContent = sim.fluct.toFixed(1);
    // 热波动直接刷新粒子运动幅度
    sim.carriers.forEach(c => {
        c.vx = (Math.random()-0.5)*sim.fluct*2;
        c.vy = (Math.random()-0.5)*sim.fluct*2;
    });
    renderFull();
});

animBtn.addEventListener('click', () => {
    sim.runAnim = !sim.runAnim;
    animBtn.textContent = sim.runAnim ? 'Pause Animation' : 'Start Animation';
    if(sim.runAnim){
        spawnCarriers();
        animLoop();
    }
});

resetBtn.addEventListener('click', () => {
    // 重置控件
    matSelect.value = 'Si';
    tempSlider.value = 300;
    dopeSlider.value = 15;
    dopeType.value = 'n';
    energySlider.value = 2.0;
    speedSlider.value = 1.0;
    fluctSlider.value = 1.0;
    // 重置参数
    sim = {
        mat: 'Si', T:300, dop:1e15, type:'n',
        eRange:2.0, aSpeed:1.0, fluct:1.0, runAnim:false, carriers:[]
    };
    // 刷新文本
    tempVal.textContent = '300';
    dopeVal.textContent = '1e15';
    energyVal.textContent = '2.0';
    speedVal.textContent = '1.0x';
    fluctVal.textContent = '1.0';
    animBtn.textContent = 'Start Animation';

    spawnCarriers();
    renderFull();
});

// 初始化
resizeCanvas();
spawnCarriers();
renderFull();
