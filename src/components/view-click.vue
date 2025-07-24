<template>
  <div class="container" ref="containerRef">
    <div
      style="height: 20%; width: 100%; background: coral; position: absolute"
      :ref="(el) => setupListener(<any>el, 'top')"
    ></div>
    <div
      style="position: absolute; top: 20%; height: 60%; width: 50%; background: red"
      :ref="(el) => setupListener(<any>el, 'left')"
    ></div>
    <div
      style="position: absolute; top: 20%; right: 0; height: 60%; width: 50%; background: blue"
      :ref="(el) => setupListener(<any>el, 'right')"
    ></div>
    <div
      style="position: absolute; bottom: 0; height: 20%; width: 100%; background: yellow"
      :ref="(el) => setupListener(<any>el, 'bottom')"
    ></div>
  </div>
</template>
<script setup lang="ts">
import { ref } from 'vue'

export type ActionType = 'click' | 'dblclick' | 'longpress'
export type PosType = 'left' | 'right' | 'top' | 'bottom'

export type EventMouseType = {
  e: MouseEvent
  type: 'mouse'
}

export type EventTouchType = {
  e: TouchEvent
  type: 'touch'
}
export type EventType = {
  actionType?: ActionType
  posType?: PosType
  key: string
  fn: (x: number, y: number, e: EventMouseType | EventTouchType) => void
}

const events: EventType[] = []

const containerRef = ref<HTMLDivElement>()

const dblclickDeltaTime = 300
const clickDeltaTime = 200
const longpressDeltaTime = 1000
const moveDelta = 5
let curTarget: any = null
let eventTimer = -1
let startX = -1
let startY = -1
let clickCount = 0
let startTime = -1

const setupListener = (el: HTMLElement, posType: PosType) => {
  if (!el) {
    return
  }
  // 桌面端
  if (navigator.maxTouchPoints == 0) {
    el.addEventListener('mousedown', (e: MouseEvent) => {
      const rect = containerRef.value!.getBoundingClientRect()
      const x = e.clientX - rect.left
      const y = e.clientY - rect.top
      handleDown(x, y, posType, { type: 'mouse', e })
    })
    el.addEventListener('mouseup', (e: MouseEvent) => {
      const rect = containerRef.value!.getBoundingClientRect()
      const x = e.clientX - rect.left
      const y = e.clientY - rect.top
      handleUp(x, y, posType, { type: 'mouse', e })
    })
  }
  // 移动端
  else {
    el.addEventListener('touchstart', (e: TouchEvent) => {
      const rect = containerRef.value!.getBoundingClientRect()

      const x = e.touches[0].clientX - rect.left
      const y = e.touches[0].clientY - rect.top
      handleDown(x, y, posType, { type: 'touch', e })
    })
    el.addEventListener('touchend', (e: TouchEvent) => {
      e.preventDefault()
      const rect = (<any>e.target).getBoundingClientRect()
      const x = e.changedTouches[0].clientX - rect.left
      const y = e.changedTouches[0].clientY - rect.top
      handleUp(x, y, posType, { type: 'touch', e })
    })
  }
}

const handleDown = (x: number, y: number, posType: PosType, o: EventTouchType | EventMouseType) => {
  startX = x
  startY = y
  curTarget = o.e.target
  startTime = Date.now()
}

const handleUp = (x: number, y: number, posType: PosType, o: EventTouchType | EventMouseType) => {
  // 非当前元素排除
  if (o.e.target != curTarget) {
    return
  }
  // 拖拽行为排除
  if (Math.abs(x - startX) > 5 || Math.abs(y - startY) > 5) {
    clearTimeout(eventTimer)
    return
  }
  clickCount++
  const now = Date.now()
  const delta = now - startTime
  if (delta < clickDeltaTime) {
    clearInterval(eventTimer)
    eventTimer = setTimeout(() => {
      clickCount = 0
      dispatchEvent({
        actionType: 'click',
        posType,
        x,
        y,
        o,
      })
    }, dblclickDeltaTime)
  }
  if (delta < dblclickDeltaTime && clickCount >= 2) {
    clearInterval(eventTimer)
    eventTimer = setTimeout(() => {
      clickCount = 0
      dispatchEvent({
        actionType: 'dblclick',
        posType,
        x,
        y,
        o,
      })
    }, clickDeltaTime)
  }
  if (delta > clickDeltaTime) {
    clearInterval(eventTimer)
    eventTimer = setTimeout(() => {
      clickCount = 0
      dispatchEvent({
        actionType: 'longpress',
        posType,
        x,
        y,
        o,
      })
    })
  }
}

/** 触发事件 */
const dispatchEvent = (obj: {
  actionType: ActionType
  posType: PosType
  x: number
  y: number
  o: EventMouseType | EventTouchType
}) => {
  events.forEach((item) => {
    if (
      (item.posType != undefined && item.posType != obj.posType) ||
      (item.actionType != undefined && item.actionType != obj.actionType)
    ) {
      return
    }
    item.fn(obj.x, obj.y, obj.o)
  })
}

/** 添加事件 */
const addEvent = (
  key: string,
  actionType: ActionType | undefined,
  posType: PosType | undefined,
  fn: EventType['fn'],
) => {
  removeEvent({ key })
  events.push({
    actionType,
    posType,
    fn,
    key,
  })
}

/** 关闭事件 */
const removeEvent = (o: { fn?: EventType['fn']; key?: string }) => {
  if (o.fn) {
    let index = events.findIndex((item) => item.fn == o.fn)
    index != -1 && events.splice(index, 1)
    return
  }
  if (o.key) {
    let index = events.findIndex((item) => item.key == o.key)
    index != -1 && events.splice(index, 1)
    return
  }
}

defineExpose({ addEvent, removeEvent })
</script>
<style lang="css" scoped>
.container {
  width: 100%;
  height: 100%;
}
</style>
