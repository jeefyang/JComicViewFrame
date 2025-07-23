<template>
  <div class="container" ref="containerRef">
    <template v-if="props.list && props.list.length > 0">
      <div
        class="view"
        :style="{
          transform: `translate(0,${translateY}px)`,
        }"
      >
        <div
          class="prev"
          :style="{
            height: prevH + 'px',
            marginBottom: curOP.gap + 'px',
          }"
        >
          <slot name="prev" :height="prevH" :translateY="translateY">
            <div class="template header">
              <div class="header_text" :style="{ top: -translateY + 'px' }">
                {{ translateY > -1 ? '到顶了' : '看到页首了' }}
              </div>
            </div>
          </slot>
        </div>
        <div
          class="view_child media"
          v-for="item in viewList"
          :key="item.key"
          :alt="item.key"
          :style="{
            marginBottom: curOP.gap + 'px',
          }"
        >
          <div
            class="loading"
            v-if="item.type == 'div'"
            :style="{
              width: item.width + 'px',
              height: item.height + 'px',
            }"
          >
            <slot name="loading" :item="item">
              <div>
                <div class="template">加载中...</div>
                <div class="template">{{ item.key }}</div>
              </div>
            </slot>
          </div>

          <img
            v-else-if="item.type == 'img'"
            class="media"
            style="flex-shrink: 0"
            :src="item.src"
            :alt="item.key"
            :style="{
              width: item.width + 'px',
              height: item.height + 'px',
            }"
          />
          <div class="media_over">{{ item.key }}</div>
        </div>
        <div class="next" :style="{ height: nextH + 'px' }">
          <slot name="next">
            <div class="template end">
              <div class="end_text" :style="{ bottom: bottomEnd + 'px' }">
                {{ Math.abs(bottomEnd) < 1 ? '到底了' : '看到页脚了' }}
              </div>
            </div>
          </slot>
        </div>
      </div>
      <div class="shadow">
        <slot name="shadow"></slot>
      </div>
      <div
        ref="wheelRef"
        class="shadow"
        @wheel="(e) => handleWheel(e)"
        @mousedown="drag.onMouseDown"
        @mousemove="drag.onMouseMove"
        @mouseup="drag.onMouseUp"
        @touchstart="drag.onTouchStart"
        @touchmove="drag.onTouchMove"
        @touchend="drag.onTouchEnd"
      ></div>
    </template>
    <slot v-else name="empty">
      <div class="template">暂无数据</div>
    </slot>
  </div>
</template>
<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { WaterfallDrag, type ScrollFlowType } from './waterfall-drag'

type OPType = {
  /** 间隔 */
  gap: number
  /** 关键字前缀 */
  prefix: string
  /** 预加载多少张上一页 */
  preloadPrev: number
  /** 预加载多少张下一页 */
  preloadNext: number
  /** 同时加载上限,0为无上限 */
  multiLoadNum: number
  /** 可视个数,0为无上限 */
  viewCount: number
} & ScrollFlowType

type ViewType = {
  type: 'div' | 'img'
  key: string
  src: string
  width: number
  height: number
  oldW?: number
  oldH?: number
  originWidth?: number
  originHeight?: number
  index: number
}

type ScrollingWorkType = {
  animateID: number
  key: string
  delta: number
}

const drag = new WaterfallDrag()

const props = withDefaults(
  defineProps<{
    list?: string[]
    op?: Partial<OPType>
  }>(),
  {
    list: () => [],
    op: () => ({}),
  },
)

const emits = defineEmits<{
  (e: 'click', index: number): void
  (e: 'init'): void
}>()

/** Y轴 */
const translateY = ref(0)
/** 容器的元素 */
const containerRef = ref<HTMLDivElement>()
/** 滚动的元素 */
const wheelRef = ref<HTMLDivElement>()
/** 容器的宽度 */
const containerW = ref(0)
/** 容器的高度 */
const containerH = ref(0)
/** 隐藏上页高度 */
const prevH = ref(0)
/** 隐藏上页个数 */
const prevCount = ref(0)
/** 隐藏下页高度 */
const nextH = ref(0)
/** 隐藏下页个数 */
const nextCount = ref(0)
/** 当前滚动到第几个(以视图上为准) */
const curUpScrollCount = ref(0)
/** 当前滚动到第几个(以视图下为准) */
const curDownScollCount = ref(-1)

/** 视图列表 */
const viewList = ref(<ViewType[]>[])

const baseOP: OPType = {
  gap: 0,
  prefix: 'waterfall_',
  preloadPrev: 2,
  preloadNext: 10,
  flowSpeed: 1,
  flowSmooth: true,
  flowSmoothRatio: 0.1,
  multiLoadNum: 3,
  viewCount: 10,
}

const curOP = reactive(<OPType>{})

watch(
  () => props.op,
  (v) => {
    const op: OPType = JSON.parse(JSON.stringify(baseOP))
    Object.assign(op, v)
    Object.assign(curOP, op)
    Object.keys(curOP).forEach((k) => {
      if (drag.hasOwnProperty(k)) {
        // @ts-ignore
        drag[k] = curOP[k]
      }
    })
  },
  {
    immediate: true,
  },
)
let translateYTimer: number = -1
let dispatchTranslateY = false
const translateDeltaTime = 300
let translateYCache: number = 0

const transLateYTimeFn = () => {
  if (translateYTimer != -1) {
    return
  }
  dispatchTranslateY = false
  translateYTimer = setTimeout(() => {
    updateByTranslateY(translateYCache)
    clearTimeout(translateYTimer)
    translateYTimer = -1
    if (dispatchTranslateY) {
      transLateYTimeFn()
    }
  }, translateDeltaTime)
}

watch(
  () => translateY.value,
  (v) => {
    translateYCache = v
    dispatchTranslateY = true
    transLateYTimeFn()
  },
)
let oldDelta: -1 | 1 = 1
const updateByTranslateY = (v: number) => {
  updateView(false, true)
  updateScrollCount(-v)
  if (drag.curDeltaY != oldDelta) {
    AutoremoveLoadImgCache(curUpScrollCount.value, curDownScollCount.value)
  } else {
    AutoremoveLoadImgCache(curUpScrollCount.value, curUpScrollCount.value)
  }
  oldDelta = drag.curDeltaY
  updateImg(false)
}

const allH = computed(() => {
  return (
    prevH.value +
    nextH.value +
    viewList.value.reduce((a, b) => a + b.height + curOP.gap, 0) +
    curOP.gap
  )
})

const bottomEnd = computed(() => {
  return allH.value - containerH.value + translateY.value
})

const getKey = (src: string, index: number) => {
  return `${src}_${index}`
}

/** 更新 */
const update = (start?: number) => {
  if (!containerRef.value || !wheelRef.value) {
    console.warn('无视图')
    return
  }
  if (start == undefined) {
    start = curUpScrollCount.value
  }
  start = Math.max(0, Math.min(start, props.list.length))
  curUpScrollCount.value = start
  containerW.value = containerRef.value.offsetWidth
  containerH.value = containerRef.value.offsetHeight
  prevCount.value = start
  prevH.value = start * containerH.value
  nextCount.value = props.list.length - start
  nextH.value = nextCount.value * containerH.value
  translateY.value = -prevH.value - curOP.gap
  updateView(true)
  updateScrollCount(-translateY.value)
  updateImg(true)
}

/** 更新滚动排序索引 */
const updateScrollCount = (v: number) => {
  if (v <= prevH.value) {
    curUpScrollCount.value = Math.floor(v / containerH.value)
  } else {
    let upStartCount = prevCount.value
    let upStart = prevH.value
    let isSelct = false
    for (let i = 0; i < viewList.value.length; i++) {
      const c = viewList.value[i]
      upStart += c.height
      if (upStart >= v) {
        curUpScrollCount.value = c.index
        isSelct = true
        break
      }
      upStartCount++
    }
    if (!isSelct) {
      curUpScrollCount.value = Math.ceil((v - upStart) / containerH.value) + upStartCount
    }
  }
  const down = v + containerH.value
  if (down <= prevH.value) {
    curDownScollCount.value = Math.floor(down / containerH.value)
    return
  }
  let downStartCount = prevCount.value
  let downStart = prevH.value
  for (let i = 0; i < viewList.value.length; i++) {
    const c = viewList.value[i]
    downStart += c.height
    if (downStart >= down) {
      curDownScollCount.value = c.index
      return
    }
    downStartCount++
  }
  curDownScollCount.value = Math.ceil((down - downStart) / containerH.value) + downStartCount
}

/** 更新可视视图 */
const updateView = (isReset: boolean = false, isAutoRemove: boolean = false) => {
  if (isReset) {
    viewList.value = []
  }
  const start = curUpScrollCount.value
  let l = Math.max(0, start - curOP.preloadPrev)
  let r = Math.min(props.list.length - 1, start + curOP.preloadNext)
  let count = r - l
  if (count + 1 < curOP.preloadPrev + curOP.preloadNext + 1) {
    if (l == 0) {
      r = Math.min(props.list.length - 1, curOP.preloadPrev + curOP.preloadNext + 1)
    } else if (r == props.list.length - 1) {
      l = Math.max(0, props.list.length - 1 - curOP.preloadPrev - curOP.preloadNext)
    }
  }
  if (isAutoRemove) {
    for (let i = viewList.value.length - 1; i >= 0; i--) {
      const c = viewList.value[i]
      if (c.index < l || c.index > r) {
        if (c.index < start) {
          addTrans(0, c.height + curOP.gap - containerH.value)
        } else {
        }
        viewList.value.splice(i, 1)
      }
    }
  }
  for (let i = l; i < r + 1; i++) {
    const c = props.list[i]
    const key = getKey(c, i)
    if (viewList.value.findIndex((c) => c.key == key) !== -1) {
      continue
    }
    const v: ViewType = {
      key: key,
      index: i,
      oldW: containerW.value,
      oldH: containerH.value - curOP.gap,
      width: containerW.value,
      height: containerH.value - curOP.gap,
      src: c,
      type: 'div',
    }
    let insertIndex = viewList.value.findIndex((cc) => cc.index > i)
    if (insertIndex === -1) {
      insertIndex = viewList.value.length
    }
    viewList.value.splice(insertIndex, 0, v)
    updatePrevNextFn()
  }
}

const updatePrevNextFn = () => {
  prevCount.value = viewList.value[0].index
  prevH.value = prevCount.value * containerH.value
  nextCount.value = props.list.length - viewList.value[viewList.value.length - 1].index - 1
  nextH.value = nextCount.value * containerH.value
}

/** 图片缓存 */
const imgMap = new Map<string, { width: number; height: number }>()
/** 多线加载 */
let multiLoadImgCache: {
  src: string
  key: string
  index: number
  time: number
  img: HTMLImageElement
}[] = []

/** 动态删除图片缓存,留出空位加载 */
const AutoremoveLoadImgCache = (l: number, r: number) => {
  if (curOP.multiLoadNum == 0) {
    return
  }
  // 负载小就跳过
  if (multiLoadImgCache.length <= curOP.multiLoadNum - (l - r + 1)) {
    return
  }
  const filterList = multiLoadImgCache.filter((item) => item.index < l || item.index > r)
  if (filterList.length == 0) {
    return
  }
  const count = l - r + 1 - (multiLoadImgCache.length - filterList.length)
  const center = (l + r) / 2
  filterList.sort((a, b) => Math.abs(a.index - center) - Math.abs(b.index - center))
  for (let i = 0; i < count; i++) {
    const o = filterList.pop()!
    o.img.src = ''
    o.img.remove()
    const index = multiLoadImgCache.findIndex((c) => c.index == o.index)
    multiLoadImgCache.splice(index, 1)
  }
}

const viewOnLoad = (v: ViewType, img: HTMLImageElement) => {
  v.oldW = v.width
  v.oldH = v.height
  v.width = containerW.value
  v.height = (img.height * containerW.value) / img.width
  v.type = 'img'
  updateScrollCount(-translateY.value)
  if (v.index < curUpScrollCount.value) {
    addTrans(0, v.oldH - v.height)
  } else if (v.index == curUpScrollCount.value && drag.curDeltaY == -1) {
    addTrans(0, v.oldH - v.height)
  }
  viewList.value = [...viewList.value]
}

/** 循环加载计时器 */
let loopLoadImgCount = 0
/** 循环加载图片 */
const loopLoadImg = (count: number, start?: number, loopList?: number[]) => {
  if (count != loopLoadImgCount) {
    return
  }
  if (start == undefined) {
    start = curUpScrollCount.value
  }
  if (loopList == undefined) {
    loopList = [drag.curDeltaY, -drag.curDeltaY]
  }

  let c = viewList.value.find((c) => c.index == start)
  // 找不到就停止
  if (!c) {
    return
  }
  // 已经加载完,跳过继续
  else if (c.type != 'div') {
    loopList.forEach((n) => {
      loopLoadImg(count, start + n, [n])
    })
    return
  }
  // 无上限加载
  if (curOP.multiLoadNum == 0) {
    const img = new Image()
    img.src = c.src
    img.onload = () => {
      viewOnLoad(c, img)
    }
    loopList.forEach((n) => {
      loopLoadImg(count, start + n, [n])
    })
    return
  }

  // 多线程加载
  // 线程超过上限
  if (multiLoadImgCache.length >= curOP.multiLoadNum) {
    return
  }
  // 正在加载中
  if (multiLoadImgCache.findIndex((cc) => cc.key == c.key) != -1) {
    loopList.forEach((n) => {
      loopLoadImg(count, start + n, [n])
    })
    return
  }
  const img = new Image()
  img.src = c.src
  img.onload = () => {
    viewOnLoad(c, img)
    const index = multiLoadImgCache.findIndex((cc) => cc.key == c.key)
    if (index != -1) {
      multiLoadImgCache.splice(index, 1)
    }
    loopList.forEach((n) => {
      loopLoadImg(count, start + n, [n])
    })
  }
  multiLoadImgCache.push({
    src: c.src,
    key: c.key,
    img: img,
    time: new Date().getTime(),
    index: c.index,
  })
  loopList.forEach((n) => {
    loopLoadImg(count, start + n, [n])
  })
}

/** 更新图片 */
const updateImg = (isReset: boolean = false) => {
  if (isReset) {
    multiLoadImgCache.forEach((c) => {
      c.img.src = ''
      c.img.remove()
    })
    multiLoadImgCache = []
  }
  loopLoadImgCount++
  loopLoadImg(loopLoadImgCount)
}

const handleWheel = (e: WheelEvent) => {
  const delta = e.deltaY || e.detail
  drag.curDeltaY = delta > 0 ? 1 : -1
  drag.onWheel(e)
}

const addTrans = (x: number, y: number) => {
  const newY = Math.min(0, Math.max(containerH.value - allH.value, translateY.value + y))
  const delta = newY - translateY.value
  translateY.value += delta
  drag.addTrans(x, delta)
}

defineExpose({
  update,
  curDownScollCount,
  curUpScrollCount,
  translateY,
})

onMounted(async () => {
  await nextTick()
  drag.curTranslateY = () => translateY.value
  drag.minTranslateY = () => containerH.value - allH.value
  drag.addDargEvent((o) => {
    translateY.value += o.y
  })
  emits('init')
})

onBeforeUnmount(() => {
  clearTimeout(translateYTimer)
  multiLoadImgCache.forEach((c) => {
    c.img.src = ''
    c.img.remove()
  })
  drag.unMounted()
})
</script>
<style lang="css" scoped>
.container {
  width: 100%;
  height: 100%;
  overflow: hidden;
  position: relative;
}

.view {
  width: 100%;
  height: auto;
  overflow: auto;
  display: flex;
  flex-direction: column;
  align-items: center;
  overflow: hidden;
}

.view::-webkit-scrollbar {
  display: none;
}

.prev {
  width: 100%;
  flex-shrink: 0;
  overflow: hidden;
  will-change: transform;
}

.next {
  width: 100%;
  flex-shrink: 0;
  overflow: hidden;
}

.empty {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.view_child {
  background-color: blue;
}

.loading {
  position: relative;
  flex-shrink: 0;
}

.template {
  width: 100%;
  height: 100%;
  position: relative;
  display: flex;
  justify-content: center;
}

.header {
  background-color: chocolate;
}

.header_text {
  position: absolute;
  margin-top: 20px;
  will-change: top;
}

.end {
  background-color: cadetblue;
}

.end_text {
  position: absolute;
  margin-bottom: 20px;
  will-change: bottom;
}

.media {
  user-select: none;
  -webkit-user-drag: none;
  display: block;
  position: relative;
}

.media_over {
  position: absolute;

  top: 0;
  left: 0;
  color: blueviolet;
  background-color: azure;
}

.shadow {
  position: absolute;
  width: 100%;
  height: 100%;
  top: 0;
  left: 0;
  overflow: hidden;
}
</style>
