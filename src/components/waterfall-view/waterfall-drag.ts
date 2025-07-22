export class WaterfallDrag {

    eventList: {
        fn: (o: {
            startX: number,
            startY: number,

        }) => void;
    }[] = [];
    isStart: boolean = false;
    startTime: number = 0;
    startX: number = 0;
    startY: number = 0;
    curX: number = 0;
    curY: number = 0;

    constructor() {

    }

    onMouseDown(e: MouseEvent) {
        this.isStart = true;
        this.startTime = new Date().getTime();
        this.startX = e.clientX - this.curX;
        this.startY = e.clientY - this.curY;

    }

    onMouseMove(e: MouseEvent) {
        if (!this.isStart) {
            return;
        }
        const x = e.clientX;
        const y = e.clientY;
    }

    onMouseUp(e: MouseEvent) {
        this.isStart = false;
    }

    onTouchStart(e: TouchEvent) {
        this.isStart = true;
        this.startTime = new Date().getTime();
        const touch = e.touches[0];
        this.startX = touch.clientX - this.curX;
        this.startY = touch.clientY - this.curY;
    }

    onTouchMove(e: TouchEvent) {
        if (!this.isStart) {
            return;
        }
        const touch = e.touches[0];
        const x = touch.clientX;
        const y = touch.clientY;
    }

    onTouchEnd(e: TouchEvent) {
        this.isStart = false;
    }

    addDargEvent(fn: typeof this['eventList'][number]) {
        this.eventList.push(fn);
    }

    removeDragEvent(fn: typeof this['eventList'][number]) {
        this.eventList = this.eventList.filter(item => item !== fn);
    }
}