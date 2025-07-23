type ScrollingWorkType = {
    animateID: number;
    key: string;
    delta?: -1 | 1;
    type: "drag" | "wheel";
};

export type ScrollFlowType = {
    /** 滚动速度系数 */
    flowSpeed: number;
    /** 滚动平滑 */
    flowSmooth: boolean;
    /** 滚动平滑系数 */
    flowSmoothRatio: number;
};


export class WaterfallDrag implements ScrollFlowType {

    eventList: {
        fn: (o: {
            x: number,
            y: number,

        }) => void;
        key: string;
    }[] = [];
    protected eventListKeyCount = 0;
    protected isStart: boolean = false;
    protected lastTime: number = 0;
    protected startX: number = 0;
    protected startY: number = 0;
    protected lastX: number = 0;
    protected lastY: number = 0;
    protected velocityX: number = 0;
    protected velocityY: number = 0;
    protected veloctiyStart: number = 0.2;
    protected curX: number = 0;
    protected curY: number = 0;

    /** 当前滚动作业 */
    protected scrollingWorkList: ScrollingWorkType[] = [];
    /** 滚动作业keys 计数器 */
    protected scrollingWorkKeysCount = 0;

    /** 当前容器的位移X */
    curTranslateY: (() => number) = () => 0;
    /** 当前容器的位移Y */
    curTranslateX: (() => number) = () => 0;
    /** 当前容器的最小位移X */
    minTranslateX: (() => number) | undefined = undefined;
    /** 当前容器的最小位移Y */
    minTranslateY: (() => number) | undefined = undefined;
    translatingY: number = 0;
    translatingX: number = 0;
    curDeltaX: -1 | 1 = 1;
    curDeltaY: -1 | 1 = 1;

    /** 滚动速度系数 */
    flowSpeed: number = 1;
    /** 滚动平滑 */
    flowSmooth: boolean = true;
    /** 滚动平滑系数 */
    flowSmoothRatio: number = 0.1;

    /** 摩擦系数 */
    friction = 0.9;
    /** 放大系数 */
    speedZoom = 100;
    /** 惯性滚动的帧间隔 */
    deltaTimeStep = 30;
    /** 反弹系数 */
    bounceRatio = 0.1;

    constructor() {

    }

    addTrans(x: number, y: number) {
        this.translatingY += y;
        this.startX -= x;
        this.lastY -= y;
        this.startY -= y;
        this.lastY -= y;
    }

    protected handleStart(x: number, y: number) {
        this.isStart = true;
        this.startX = x - this.curTranslateX();
        this.startY = y - this.curTranslateY();
        this.lastX = x;
        this.lastY = y;
        this.lastTime = new Date().getTime();
        this.stopAnimate();
    }

    protected handleMove(x: number, y: number) {
        if (!this.isStart) {
            return;
        }
        let newX = x - this.startX;
        let newY = y - this.startY;

        if (this.minTranslateX) {
            newX = Math.min(0, Math.max(newX, this.minTranslateX()));
        }
        if (this.minTranslateY) {
            newY = Math.min(0, Math.max(newY, this.minTranslateY()));
        }

        this.dispatchEvent({ x: newX - this.curTranslateX(), y: newY - this.curTranslateY() });

        const now = Date.now();
        const deltaTime = now - this.lastTime;
        this.curDeltaY = (y - this.lastY) < 0 ? 1 : -1;
        if (deltaTime > 0) {
            this.velocityX = (x - this.lastX) / deltaTime;
            this.velocityY = (y - this.lastY) / deltaTime;
        }
        this.lastX = x;
        this.lastY = y;
        this.lastTime = now;
    }

    protected handleEnd() {
        if (!this.isStart) {
            return;
        }
        this.isStart = false;
        this.curDeltaY = this.velocityY < 0 ? 1 : -1;
        if (Math.abs(this.velocityX) > this.veloctiyStart || Math.abs(this.velocityY) > this.veloctiyStart) {
            this.startInertiaScroll(this.velocityX, this.velocityY);
        }
    }

    protected startInertiaScroll(startVx: number, startVy: number) {
        let vx = startVx * this.speedZoom;
        let vy = startVy * this.speedZoom;
        let lastFrameTime = Date.now();
        const o: ScrollingWorkType = {
            key: (this.scrollingWorkKeysCount++).toString(),
            animateID: -1,
            type: "drag"
        };
        this.scrollingWorkList.push(o);
        const animate = () => {
            const now = Date.now();
            const deltaTime = now - lastFrameTime;
            lastFrameTime = now;

            vx *= this.friction;
            vy *= this.friction;

            // 速度过下就停止
            if (Math.abs(vx) < 0.5 && Math.abs(vy) < 0.5) {
                let index = this.scrollingWorkList.findIndex((c) => c.key == o.key);
                if (index >= 0) {
                    this.scrollingWorkList.splice(index, 1);
                }
                return;
            }

            let newX = this.curTranslateX() + vx * deltaTime / this.deltaTimeStep;
            let newY = this.curTranslateY() + vy * deltaTime / this.deltaTimeStep;
            let minX = newX;
            let minY = newY;
            if (this.minTranslateX) {
                minX = this.minTranslateX();
            }
            if (this.minTranslateY) {
                minY = this.minTranslateY();
            }
            // 边界反弹处理
            if (this.bounceRatio > 0 && (newX > 0 || newX < minX)) {
                vx *= -this.bounceRatio;
            }
            if (this.bounceRatio > 0 && (newY > 0 || newY < minY)) {
                vy *= -this.bounceRatio;
            }
            const x = Math.min(0, Math.max(newX, minX));
            const y = Math.min(0, Math.max(newY, minY));
            const deltaX = x - this.curTranslateX();
            const deltaY = y - this.curTranslateY();
            this.dispatchEvent({ x: deltaX, y: deltaY });
            o.animateID = requestAnimationFrame(animate);
        };
        o.animateID = requestAnimationFrame(animate);
    }

    onMouseDown(e: MouseEvent) {

        const x = e.clientX;
        const y = e.clientY;
        this.handleStart(x, y);
    }

    onMouseMove(e: MouseEvent) {

        const x = e.clientX;
        const y = e.clientY;
        this.handleMove(x, y);
    }

    onMouseUp(e: MouseEvent) {
        this.handleEnd();
    }

    onTouchStart(e: TouchEvent) {

        const touch = e.touches[0];
        const x = touch.clientX;
        const y = touch.clientY;
        this.handleStart(x, y);
    }

    onTouchMove(e: TouchEvent) {

        const touch = e.touches[0];
        const x = touch.clientX;
        const y = touch.clientY;
        this.handleMove(x, y);
    }

    onTouchEnd(e: TouchEvent) {
        this.handleEnd();
    }

    onWheel(e: WheelEvent) {
        e.preventDefault();
        const delta = e.deltaY || e.detail;
        this.curDeltaY = delta > 0 ? 1 : -1;
        let curTransY = this.curTranslateY() + delta * this.flowSpeed * -1;
        if (this.minTranslateY) {
            curTransY = Math.min(0, Math.max(curTransY, this.minTranslateY()));

        }
        if (!this.flowSmooth) {
            this.dispatchEvent({ x: 0, y: curTransY - this.curTranslateY() });
            return;
        }
        this.translatingY = curTransY;
        const o: ScrollingWorkType = {
            key: (this.scrollingWorkKeysCount++).toString(),
            animateID: -1,
            delta: this.curDeltaY,
            type: "wheel"
        };
        const animate = () => {
            const diff = this.translatingY - this.curTranslateY();
            if (Math.abs(diff) > 0.5) {
                this.dispatchEvent({ x: 0, y: diff * this.flowSmoothRatio });
                o.animateID = requestAnimationFrame(animate);
            } else {
                let index = this.scrollingWorkList.findIndex((c) => c.key == o.key);
                if (index >= 0) {
                    this.scrollingWorkList.splice(index, 1);
                }
            }
        };
        this.scrollingWorkList.push(o);
        animate();
    }

    addDargEvent(fn: typeof this['eventList'][number]['fn']) {
        const key = (this.eventListKeyCount++).toString();
        this.eventList.push({ fn, key });
        return key;
    }

    removeDragEvent(o: Partial<typeof this['eventList'][number]>) {
        const { fn, key } = o;
        if (fn) {
            this.eventList = this.eventList.filter(item => item.fn !== fn);
        }
        else if (key) {
            this.eventList = this.eventList.filter(item => item.key !== key);
        }
    }

    protected dispatchEvent(o: {
        x: number,
        y: number;

    }) {
        this.eventList.forEach(c => c.fn(o));
    }

    stopAnimate() {
        this.scrollingWorkList.forEach((c) => {
            cancelAnimationFrame(c.animateID);
        });
        this.scrollingWorkList = [];
    }

    unMounted() {
        this.stopAnimate();
    }
}