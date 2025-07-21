<template>
  <div class="container" @wheel="(e) => handleWheel(e)" ref="scrollRef">
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
        <template v-for="item in viewList" :key="item.key">
          <div
            class="loading_container"
            v-if="item.type == 'div'"
            :style="{
              marginBottom: curOP.gap + 'px',
              width: item.width + 'px',
              height: item.height + 'px',
            }"
          >
            <slot name="loading" :item="item">
              <div class="template">加载中...</div>
            </slot>
          </div>
          <img
            class="media"
            style="flex-shrink: 0"
            v-else-if="item.type == 'img'"
            :src="item.src"
            :alt="item.key"
            :style="{
              marginBottom: curOP.gap + 'px',
              width: item.width + 'px',
              height: item.height + 'px',
            }"
          />
        </template>
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
    </template>
    <slot v-else name="empty">
      <div class="template">暂无数据</div>
    </slot>
  </div>
</template>
<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'

type OPType = {
  /** 间隔 */
  gap: number
  /** 关键字前缀 */
  prefix: string
  /** 预加载多少张上一页 */
  preloadPrev: number
  /** 预加载多少张下一页 */
  preloadNext: number
  /** 滚动速度系数 */
  flowSpeed: number
  /** 滚动平滑 */
  flowSmooth: boolean
  /** 滚动平滑系数 */
  flowSmoothRatio: number
  /** 同时加载上限,0为无上限 */
  multiLoadNum: number
  /** 可视个数,0为无上限 */
  viewCount: number
}
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
  delta: -1 | 1
}

type ScrollingWorkType = {
  animateID: number
  key: string
  delta: number
}

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
/** 正在要滚动到的Y轴 */
let translatingY = 0
/** 滚动的元素 */
const scrollRef = ref<HTMLDivElement>()
/** 容器的宽度 */
const containerW = ref(0)
/** 容器的高度 */
const containerH = ref(0)
/** 隐藏上页高度 */
const prevH = ref(0)
/** 隐藏下页高度 */
const nextH = ref(0)
/** 当前滚动到第几个 */
const curUpScrollCount = ref(0)
const curDownScollCount = ref(-1)
/** 滚动作业keys 计数器 */
let scrollingWorkKeysCount = 0
/** 当前滚动作业 */
const scrollingWorkList = ref<ScrollingWorkType[]>([])
/** 是否在滚动 */
const isScrolling = computed(() => scrollingWorkList.value.length != 0)
/** 当前滚动趋势 -1:向上 1:向下 */
const curDelta = ref(<-1 | 1>1)

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
  },
  {
    immediate: true,
  },
)

watch(
  () => translateY.value,
  (v) => {
    if (multiLoadCache.length > 0) {
      const c = multiLoadCache[0]
      const v = viewList.value.find((o) => o.src == c.src)
      if (v && v.delta != curDelta.value) {
        multiLoadCache = []
      }
    }
    const start = -v
    const end = -v + containerH.value
    // if(curDelta.value==-1 && start)
  },
)

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
  if (!scrollRef.value) {
    console.warn('无视图')
    return
  }
  if (start == undefined) {
    start = curDownScollCount.value
  }
  start = Math.max(0, Math.min(start, props.list.length))
  curDownScollCount.value = start
  containerW.value = scrollRef.value.offsetWidth
  containerH.value = scrollRef.value.offsetHeight
  prevH.value = start * containerH.value
  nextH.value = (props.list.length - start) * containerH.value
  translateY.value = -prevH.value - curOP.gap
  loopLoad(
    start,
    1,
    (o) => {
      viewList.value.push(o)
      nextH.value -= o.height + curOP.gap
    },
    (_o, key) => {
      const index = viewList.value.findIndex((item) => item.key === key)
      if (index == -1) {
        return
      }
      viewList.value = [...viewList.value]
    },
  )
}

/** 循环加载 */
const loopLoad = (
  start: number,
  delta: -1 | 1,
  pushCB: (o: ViewType, key: string, index: number) => void,
  loadedCB: (o: ViewType, key: string, index: number) => void,
) => {
  const l = delta == -1 ? Math.min(0, start - curOP.preloadPrev) : start
  const r = delta == -1 ? start : Math.min(start + curOP.preloadNext, props.list.length - 1)
  if (l > r) {
    return
  }
  while (start >= l && start <= r) {
    const src = props.list[start]
    const key = getKey(src, start)
    const index = viewList.value.findIndex((v) => v.key == key)
    if (index != -1) {
      start += delta
      continue
    }

    const n: ViewType = {
      src: src,
      key: getKey(src, start),
      width: containerW.value,
      height: containerH.value - curOP.gap,
      index: start,
      type: 'div',
      delta: 1,
    }
    loadImg(src).then((r) => {
      n.oldW = n.width
      n.oldH = n.height
      n.originHeight = r!.height
      n.originWidth = r!.width
      n.width = containerW.value
      n.height = (r!.height * containerW.value) / r!.width
      n.type = 'img'
      loadedCB(n, n.key, n.index)
    })
    pushCB(n, n.key, n.index)
    start += delta
  }
}

/** 图片缓存 */
const imgMap = new Map<string, { width: number; height: number }>()
/** 多线加载 */
let multiLoadCache: { src: string; fn: (width: number, height: number) => void }[] = []
/** 多线正在加载的缓存 */
const multiLoadingCache: boolean[] = []
/** 是否停止多线加载 */
let isStopMultiLoad = false
/**  设置多线加载 */
const setMultiLoad = (o?: (typeof multiLoadCache)[number]) => {
  if (isStopMultiLoad) {
    return
  }
  if (o) {
    multiLoadCache.push(o)
  }
  if (multiLoadingCache.length >= curOP.multiLoadNum) {
    return
  }
  let f: (typeof multiLoadCache)[number] | undefined = undefined
  let l = 0
  let r = multiLoadCache.length - 1
  let start = curDelta.value == -1 ? curUpScrollCount.value : curDownScollCount.value
  while (start >= l && start <= r) {
    const img = new Image()
    img.remove()
  }
  if (!f) {
    f = multiLoadCache.shift()
  }
  if (!f) {
    return
  }

  multiLoadingCache.push(true)
  const img = new Image()
  img.src = f.src
  img.onload = () => {
    f.fn(img.width, img.height)
    multiLoadingCache.pop()
    setMultiLoad()
  }
}

/** 多线加载链接 */
const multiLoadSrc = async (src: string): Promise<{ width: number; height: number }> => {
  /** 不多线加载 */
  if (curOP.multiLoadNum == 0) {
    return new Promise((res, rej) => {
      const img = new Image()
      img.src = src
      img.onload = () => {
        res({ width: img.width, height: img.height })
      }
    })
  }
  return new Promise((res, rej) => {
    setMultiLoad({
      src: src,
      fn: (w, h) => {
        res({ width: w, height: h })
      },
    })
  })
}

const loadImg = async (src: string): Promise<ReturnType<(typeof imgMap)['get']>> => {
  if (false && imgMap.has(src)) {
    return imgMap.get(src)!
  }
  return new Promise(async (resolve, reject) => {
    const data = await multiLoadSrc(src)
    imgMap.set(src, { width: data.width, height: data.height })
    resolve(imgMap.get(src)!)
  })
}

const handleWheel = (e: WheelEvent) => {
  e.preventDefault()
  const delta = e.deltaY || e.detail
  curDelta.value = delta > 0 ? -1 : 1
  let curTransY = translateY.value + delta * curOP.flowSpeed * -1

  curTransY = Math.min(0, Math.max(curTransY, containerH.value - allH.value))
  if (!curOP.flowSmooth) {
    translateY.value = curTransY
    return
  }
  translatingY = curTransY
  const o: ScrollingWorkType = {
    key: (scrollingWorkKeysCount++).toString(),
    animateID: -1,
    delta: delta,
  }
  const animate = () => {
    const diff = translatingY - translateY.value
    if (Math.abs(diff) > 0.5) {
      translateY.value = translateY.value + diff * curOP.flowSmoothRatio
      o.animateID = requestAnimationFrame(animate)
    } else {
      let index = scrollingWorkList.value.findIndex((c) => c.key == o.key)
      if (index >= 0) {
        scrollingWorkList.value.splice(index, 1)
      }
    }
  }
  scrollingWorkList.value.push(o)
  animate()
}

defineExpose({
  update,
  curDownScollCount,
  curUpScrollCount,
  translateY,
})

onMounted(async () => {
  await nextTick()
  emits('init')
})

onBeforeUnmount(() => {
  isStopMultiLoad = true
  scrollingWorkList.value.forEach((c) => {
    cancelAnimationFrame(c.animateID)
  })
})
</script>
<style lang="css" scoped>
.container {
  width: 100%;
  height: 100%;
  overflow: hidden;
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

.loading_container {
  background-color: blue;
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
}
</style>
