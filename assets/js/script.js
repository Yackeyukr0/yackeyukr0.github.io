// ========== 1. 全局DOM元素 ==========
// 左侧控制滑块
const voltSlider = document.getElementById('volt-slider');
const voltValue = document.getElementById('volt-value');
const bandSlider = document.getElementById('band-slider');
const bandValue = document.getElementById('band-value');
const tempSlider = document.getElementById('temp-slider');
const tempValue = document.getElementById('temp-value');
const mobilityESlider = document.getElementById('mobility-e-slider');
const mobilityEValue = document.getElementById('mobility-e-value');
const dopingSlider = document.getElementById('doping-slider');
const dopingValue = document.getElementById('doping-value');

// 数据文本
const currentData = document.getElementById('current-data');
const waveData = document.getElementById('wave-data');
const lightData = document.getElementById('light-data');
const lossData = document.getElementById('loss-data');
const biasState = document.getElementById('bias-state');

// 按钮
const resetBtn = document.getElementById('reset-btn');
const exportBtn = document.getElementById('export-btn');
const toggleAnim = document.getElementById('toggle-animation');

// Tab 切换元素
const tabItems = document.querySelectorAll('.tab-item');
const tabPanels = document.querySelectorAll('.tab-panel');

// 三个页面 载流子画布
const carrier1 = document.getElementById('carrier-tab1');
const carrier2 = document.getElementById('carrier-tab2');
const carrier3 = document.getElementById('carrier-tab3');
const c1Ctx = carrier1.getContext('2d');
const c2Ctx = carrier2.getContext('2d');
const c3Ctx = carrier3.getContext('2d');

// 三个页面 能带画布
const band1 = document.getElementById('band-tab1');
const band2 = document.getElementById('band-tab2');
const band3 = document.getElementById('band-tab3');
const b1Ctx = band1.getContext('2d');
const b2Ctx = band2.getContext('2d');
const b3Ctx = band3.getContext('2d');

// 三个页面 曲线画布
const chart1 = document.getElementById('chart-tab1');
const chart2 = document.getElementById('chart-tab2');
const chart3 = document.getElementById('chart-tab3');
const ch1Ctx = chart1.getContext('2d');
const ch2Ctx = chart2.getContext('2d');
const ch3Ctx = chart3.getContext('2d');

// 正向页面 发光元素
const photon1 = document.getElementById('photon-tab1');
const led1 = document.getElementById('led-tab1');

// 描述文本
const desc1 = document.getElementById('desc-tab1');
const desc2 = document.getElementById('desc-tab2');
const desc3 = document.getElementById('desc-tab3');

// ========== 2. 全局仿真参数 ==========
let simParam = {
    voltage: 2.0,
    bandGap: 1.8,
    temp: 25,
    mobilityE: 600,
    doping: 10,
    current: 0,
    wavelength: 0,
    lightIntensity: 0,
    heatLoss: 0,
    isAnimRun: true
};

let carriers1 = [], carriers2 = [], carriers3 = [];
const H_CONST = 1240;
const V_ON = 1.6;
const X_MAX = 5;
const Y_MAX = 50;

// ========== 3. 工具函数 ==========
// 判断偏置状态
function getBiasStatus(v) {
    if (v < -0.1) return "反向偏置";
    if (v > 0.1) return "正向偏置";
    return "零偏置（未加电压）";
}

// 单电压点计算电流、光强
function calcPoint(v) {
    let tempFactor = 1 + (simParam.temp - 25) * 0.012;
    let materialFactor = (simParam.mobilityE / 600) * (simParam.doping / 10);
    let i = 0;
    if (v >= V_ON) {
        i = Math.pow(v - V_ON, 2) * 15 * tempFactor * materialFactor;
    }
    i = Math.min(i, Y_MAX);
    let lossFactor = Math.max(0, 1 - (simParam.temp / 150));
    let l = i * lossFactor * 0.8;
    return {v, i, l};
}

// ========== 4. 核心仿真计算 ==========
function calcSimulation() {
    simParam.wavelength = Math.round(H_CONST / simParam.bandGap);
    const pt = calcPoint(simParam.voltage);
    simParam.current = parseFloat(pt.i.toFixed(2));
    simParam.lightIntensity = parseFloat(pt.l.toFixed(2));
    simParam.heatLoss = Math.round((simParam.temp / 120) * 100);

    biasState.innerText = getBiasStatus(simParam.voltage);
    updateDataView();
    updateAllDesc();
    updateLedEffect();

    // 同步绘制所有画布
    drawAllChart();
    drawAllBand();
}

// 更新数据面板
function updateDataView() {
    currentData.innerText = simParam.current;
    waveData.innerText = simParam.wavelength;
    lightData.innerText = simParam.lightIntensity;
    lossData.innerText = simParam.heatLoss;
}

// 更新三个页面描述文字
function updateAllDesc() {
    const v = simParam.voltage;
    // 正向页
    if (v < -0.1) {
        desc1.innerText = "反向电压：LED 截止，无发光";
    } else if (v >= -0.1 && v <= 0.1) {
        desc1.innerText = "零电压：无载流子复合，LED 不发光";
    } else if (v >= V_ON) {
        desc1.innerText = "正向偏置：载流子辐射复合，电子跃迁释放光子";
    } else {
        desc1.innerText = "正向低压：电流较小，亮度微弱";
    }
    // 零偏页
    if (v < -0.1) {
        desc2.innerText = "当前为反向偏置，能带弯曲，势垒加宽";
    } else if (v >= -0.1 && v <= 0.1) {
        desc2.innerText = "零偏置：PN结能带平直，动态平衡";
    } else {
        desc2.innerText = "当前为正向偏置，能带开始凹陷";
    }
    // 反向页
    if (v < -0.1) {
        desc3.innerText = "反向偏置：势垒大幅加宽，载流子无法导通";
    } else if (v >= -0.1 && v <= 0.1) {
        desc3.innerText = "零偏置：无负压，器件处于静态";
    } else {
        desc3.innerText = "正向电压下，反向截止特性消失";
    }
}

// 正向页LED发光效果
function updateLedEffect() {
    let color = "#111";
    let shadow = "none";
    const wave = simParam.wavelength;
    if (simParam.voltage >= V_ON && simParam.isAnimRun) {
        if (wave >= 620) color = "#ef4444";
        else if (wave >= 570) color = "#f97316";
        else if (wave >= 495) color = "#22c55e";
        else if (wave >= 450) color = "#3b82f6";
        else color = "#a855f7";
        shadow = "0 0 30px 10px " + color;
    }
    led1.style.background = color;
    led1.style.boxShadow = shadow;
    let opacity = simParam.current > 0 ? Math.min(1, simParam.current / 30) : 0.2;
    led1.style.opacity = opacity;

    // 光子区
    let bg = "rgba(255,255,255,0.05)";
    let glow = "none";
    if (simParam.voltage >= V_ON && simParam.isAnimRun) {
        if (wave >= 620) bg = "rgba(239,68,0.5)", glow = "0 -8px 20px rgba(239,68,68,0.6)";
        else if (wave >= 570) bg = "rgba(249,115,0.5)", glow = "0 -8px 20px rgba(249,115,22,0.6)";
        else if (wave >= 495) bg = "rgba(34,197,0.5)", glow = "0 -8px 20px rgba(34,197,94,0.6)";
        else if (wave >= 450) bg = "rgba(59,130,0.5)", glow = "0 -8px 20px rgba(59,130,246,0.6)";
        else bg = "rgba(168,85,0.5)", glow = "0 -8px 20px rgba(168,85,247,0.6)";
    }
    photon1.style.background = bg;
    photon1.style.boxShadow = glow;
}

// ========== 载流子三组独立动画 ==========
function animateCarrier(ctx, canvas, carrierArr) {
    if (!simParam.isAnimRun || simParam.voltage < V_ON) {
        carrierArr.length = 0;
        ctx.clearRect(0,0,canvas.width,canvas.height);
        requestAnimationFrame(()=>animateCarrier(ctx,canvas,carrierArr));
        return;
    }
    const speed = simParam.current / 10;
    const rate = 0.3 + speed * 0.05 * (simParam.doping / 10) * (simParam.mobilityE / 600);
    if (Math.random() < rate) {
        if (Math.random() > 0.5) {
            carrierArr.push({x:20, y:40, vx:1.5+speed*0.2});
        } else {
            carrierArr.push({x:200, y:40, vx:-1.5-speed*0.2});
        }
    }
    ctx.clearRect(0,0,canvas.width,canvas.height);
    carrierArr.forEach((c,i)=>{
        c.x += c.vx;
        ctx.beginPath();
        ctx.fillStyle = c.vx>0 ? "#facc15" : "#38bdf8";
        ctx.arc(c.x,40,4,0,Math.PI*2);
        ctx.fill();
        if(c.x>100 && c.x<140){
            ctx.fillStyle="#fff";
            ctx.arc(c.x,40,6,0,Math.PI*2);
            ctx.fill();
            if(Math.random()<0.1) carrierArr.splice(i,1);
        }
        if(c.x<0||c.x>220) carrierArr.splice(i,1);
    });
    requestAnimationFrame(()=>animateCarrier(ctx,canvas,carrierArr));
}

// ========== 曲线绘制（复用） ==========
function drawChartSingle(ctx, canvas) {
    const w = canvas.width;
    const h = canvas.height;
    const padding = 40;
    ctx.clearRect(0,0,w,h);
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(0,0,w,h);

    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(padding, h-padding);
    ctx.lineTo(w-padding, h-padding);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(padding, padding);
    ctx.lineTo(padding, h-padding);
    ctx.stroke();

    ctx.fillStyle = '#e2e8f0';
    ctx.font = "12px Microsoft Yahei";
    ctx.fillText("电压 (V)", w-70, h-15);
    ctx.fillText("电流(mA) / 光强(cd)", 10, 25);

    // X刻度
    for(let xVal=0;xVal<=X_MAX;xVal+=1){
        let x = padding + (xVal/X_MAX)*(w-padding*2);
        ctx.beginPath();
        ctx.moveTo(x, h-padding);
        ctx.lineTo(x, h-padding+5);
        ctx.stroke();
        ctx.fillText(xVal.toString(), x-6, h-padding+18);
    }
    // Y刻度
    for(let yVal=0;yVal<=Y_MAX;yVal+=10){
        let y = h-padding - (yVal/Y_MAX)*(h-padding*2);
        ctx.beginPath();
        ctx.moveTo(padding, y);
        ctx.lineTo(padding-5, y);
        ctx.stroke();
        ctx.fillText(yVal.toString(), padding-25, y+4);
    }

    // 图例
    ctx.fillStyle = "#3498db";
    ctx.fillRect(padding+20, padding+10,12,12);
    ctx.fillStyle = "#e2e8f0";
    ctx.fillText("I-V 电流曲线", padding+40, padding+20);
    ctx.fillStyle = "#f39c12";
    ctx.fillRect(padding+140, padding+10,12,12);
    ctx.fillText("L-I 光强曲线", padding+160, padding+20);

    const points = [];
    for(let v=0;v<=simParam.voltage;v+=0.05){
        points.push(calcPoint(v));
    }
    if(points.length<2) return;

    // 电流曲线
    ctx.strokeStyle = '#3498db';
    ctx.lineWidth = 2;
    ctx.beginPath();
    points.forEach((pt,idx)=>{
        let x = padding + (pt.v/X_MAX)*(w-padding*2);
        let y = h-padding - (Math.min(pt.i,Y_MAX)/Y_MAX)*(h-padding*2);
        idx===0 ? ctx.moveTo(x,y) : ctx.lineTo(x,y);
    });
    ctx.stroke();

    // 光强曲线
    ctx.strokeStyle = '#f39c12';
    ctx.lineWidth = 2;
    ctx.beginPath();
    points.forEach((pt,idx)=>{
        let x = padding + (pt.v/X_MAX)*(w-padding*2);
        let y = h-padding - (Math.min(pt.l,Y_MAX)/Y_MAX)*(h-padding*2);
        idx===0 ? ctx.moveTo(x,y) : ctx.lineTo(x,y);
    });
    ctx.stroke();
}
function drawAllChart(){
    drawChartSingle(ch1Ctx, chart1);
    drawChartSingle(ch2Ctx, chart2);
    drawChartSingle(ch3Ctx, chart3);
}

// ========== 能带绘制（三态切换） ==========
function drawBandSingle(ctx, canvas) {
    const w = canvas.width;
    const h = canvas.height;
    const midY = h / 2;
    const Eg = simParam.bandGap * 12;
    const v = simParam.voltage;

    ctx.clearRect(0,0,w,h);
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(0,0,w,h);

    let pShift = 0, nShift = 0, showTransition = false;
    if (v < -0.1) {
        pShift = -Math.abs(v)*14;
        nShift = Math.abs(v)*14;
    } else if (v > 0.1) {
        pShift = v*14;
        nShift = -v*14;
        showTransition = true;
    }

    ctx.strokeStyle = '#27ae60';
    ctx.lineWidth = 3;
    // P区
    ctx.beginPath();
    ctx.moveTo(50, midY - Eg/2 + pShift);
    ctx.lineTo(220, midY - Eg/2 + pShift);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(50, midY + Eg/2 + pShift);
    ctx.lineTo(220, midY + Eg/2 + pShift);
    ctx.stroke();
    // 中间弯曲
    const midX = 350;
    const bend = (pShift + nShift)/2;
    ctx.beginPath();
    ctx.moveTo(220, midY - Eg/2 + pShift);
    ctx.quadraticCurveTo(midX, midY - Eg/2 + bend, 480, midY - Eg/2 + nShift);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(220, midY + Eg/2 + pShift);
    ctx.quadraticCurveTo(midX, midY + Eg/2 + bend, 480, midY + Eg/2 + nShift);
    ctx.stroke();
    // N区
    ctx.beginPath();
    ctx.moveTo(480, midY - Eg/2 + nShift);
    ctx.lineTo(650, midY - Eg/2 + nShift);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(480, midY + Eg/2 + nShift);
    ctx.lineTo(650, midY + Eg/2 + nShift);
    ctx.stroke();

    // 跃迁箭头
    if(showTransition){
        ctx.strokeStyle = '#f39c12';
        ctx.lineWidth = 2;
        ctx.setLineDash([4,4]);
        ctx.beginPath();
        ctx.moveTo(midX, midY + Eg/2 + bend);
        ctx.lineTo(midX, midY - Eg/2 + bend);
        ctx.stroke();
        ctx.setLineDash([]);
    }

    // 文字
    ctx.fillStyle = '#e2e8f0';
    ctx.font = "12px Microsoft Yahei";
    ctx.fillText("P区", 80, midY - Eg/2 + pShift - 8);
    ctx.fillText("发光层(辐射复合)", 280, midY - Eg/2 + bend - 8);
    ctx.fillText("N区", 550, midY - Eg/2 + nShift - 8);
    if(showTransition) ctx.fillText("电子跃迁→释放光子", midX-75, midY + Eg/2 + bend + 30);
    ctx.fillText(`当前：${getBiasStatus(v)}`, 40, h-20);
}
function drawAllBand(){
    drawBandSingle(b1Ctx, band1);
    drawBandSingle(b2Ctx, band2);
    drawBandSingle(b3Ctx);
}

// ========== Tab 切换事件 ==========
tabItems.forEach((item, index) => {
    item.addEventListener('click', () => {
        // 清除所有激活状态
        tabItems.forEach(t => t.classList.remove('active'));
        tabPanels.forEach(p => p.classList.remove('active'));
        // 激活当前
        item.classList.add('active');
        tabPanels[index].classList.add('active');
    });
});

// ========== 滑块 & 按钮事件 ==========
voltSlider.addEventListener('input', function(){
    simParam.voltage = parseFloat(this.value);
    voltValue.innerText = this.value;
    calcSimulation();
});
bandSlider.addEventListener('input', function(){
    simParam.bandGap = parseFloat(this.value);
    bandValue.innerText = this.value;
    calcSimulation();
});
tempSlider.addEventListener('input', function(){
    simParam.temp = parseInt(this.value);
    tempValue.innerText = this.value;
    calcSimulation();
});
mobilityESlider.addEventListener('input', function(){
    simParam.mobilityE = Number(this.value);
    mobilityEValue.innerText = this.value;
    calcSimulation();
});
dopingSlider.addEventListener('input', function(){
    simParam.doping = Number(this.value);
    dopingValue.innerText = this.value;
    calcSimulation();
});

// 重置
resetBtn.addEventListener('click', function(){
    simParam.voltage = 2.0;
    simParam.bandGap = 1.8;
    simParam.temp = 25;
    simParam.mobilityE = 600;
    simParam.doping = 10;

    voltSlider.value = 2.0;
    bandSlider.value = 1.8;
    tempSlider.value = 25;
    mobilityESlider.value = 600;
    dopingSlider.value = 10;

    voltValue.innerText = "2.0";
    bandValue.innerText = "1.8";
    tempValue.innerText = "25";
    mobilityEValue = "600";
    dopingValue = "600";

    carriers1 = []; carriers2 = []; carriers3 = [];
    calcSimulation();
});

// 启停动画
toggleAnim.addEventListener('click', function(){
    simParam.isAnimRun = !simParam.isAnimRun;
    this.innerText = simParam.isAnimRun ? "停止动画" : "启动动画";
    updateLedEffect();
});

// 导出数据
exportBtn.addEventListener('click', function(){
    let dataStr = "LED偏置切换仿真数据\n";
    dataStr += "电压(V),禁带宽度(eV),温度(℃),电子迁移率,掺杂浓度(10^18cm-3),电流(mA),波长(nm),光强(cd),热损耗(%)\n";
    dataStr += `${simParam.voltage},${simParam.bandGap},${simParam.temp},${simParam.mobilityE},${simParam.doping},${simParam.current},${simParam.wavelength},${simParam.lightIntensity},${simParam.heatLoss}\n`;

    let blob = new Blob([dataStr], {type: "text/plain"});
    let url = URL.createObjectURL(blob);
    let a = document.createElement('a');
    a.href = url;
    a.download = "LED仿真数据.txt";
    a.click();
    URL.revokeObjectURL(url);
});

// ========== 页面初始化 ==========
window.onload = function(){
    calcSimulation();
    // 启动三组载流子动画
    animateCarrier(c1Ctx, carrier1, carriers1);
    animateCarrier(c2Ctx, carrier2, carriers2);
    animateCarrier(c3Ctx, carrier3, carriers3);
}
