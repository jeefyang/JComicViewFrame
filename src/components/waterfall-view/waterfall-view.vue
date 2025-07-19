<template>
  <div class="container">
    <template v-if="props.list && props.list.length > 0">
      <div
        class="view"
        ref="scrollRef"
        :style="{ transform: `translate(0,${translateY})` }"
        @scroll="(e) => handleScroll(e)"
      >
        <div class="prev" :style="{ height: prevH + 'px', marginBottom: curOP.gap + 'px' }">
          <slot name="prev" :height="prevH">
            <div class="template">看到页首了</div>
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
            <div class="template">看到页尾了</div>
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
import { nextTick, onMounted, reactive, ref, watch } from 'vue'

type OPType = {
  gap: number
  prefix: string
  preloadNext: number
}
type ViewType = {
  type: 'div' | 'img'
  key: string
  src: string
  width: number
  height: number
  originWidth?: number
  originHeight?: number
  index: number
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

const translateY = ref(0)
const scrollRef = ref<HTMLDivElement>()
const containerW = ref(0)
const containerH = ref(0)
const prevH = ref(0)
const nextH = ref(0)
const curScrollCount = ref(0)

const viewList = ref(<ViewType[]>[])

const baseOP: OPType = {
  gap: 0,
  prefix: 'waterfall_',
  preloadNext: 10,
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

const update = (start?: number) => {
  if (!scrollRef.value) {
    console.warn('无视图')
    return
  }
  console.log('start update')
  if (start == undefined) {
    start = Math.max(curScrollCount.value, 0)
  } else {
    curScrollCount.value = Math.max(start, 0)
  }
  start = Math.max(start, 0)
  containerW.value = scrollRef.value.offsetWidth
  containerH.value = scrollRef.value.offsetHeight
  prevH.value = start * containerH.value
  nextH.value = (props.list.length - start) * containerH.value
  const len = Math.min(start + curOP.preloadNext, props.list.length)
  for (let i = start; i < len; i++) {
    const o = preloadImg(props.list[i], i, () => {
      const index = viewList.value.findIndex((item) => item.key === o.key)
      if (index == -1) {
        return
      }
      viewList.value = [...viewList.value]
    })
    viewList.value.push(o)
  }
}

const imgMap = new Map<string, { width: number; height: number }>()
const preloadImg = (src: string, index: number, cb?: () => void) => {
  const o: ViewType = {
    src: src,
    key: `${src}_${index}`,
    width: containerW.value,
    height: containerH.value - curOP.gap,
    index: index,
    type: 'div',
  }
  new Promise<{ width: number; height: number }>((resolve) => {
    if (imgMap.has(src)) {
      resolve(imgMap.get(src)!)
    } else {
      const img = new Image()
      img.src = src
      img.onload = () => {
        setTimeout(() => {
          imgMap.set(src, { width: img.width, height: img.height })
          resolve(imgMap.get(src)!)
        }, 0)
      }
    }
  }).then((r) => {
    if (index < curScrollCount.value) {
      translateY.value += r.height - o.height
    }
    o.width = containerW.value
    o.height = containerW.value * (r.height / r.width)
    o.originWidth = r.width
    o.originWidth = r.height
    o.type = 'img'
    if (cb) {
      cb()
    }
  })
  return o
}

const handleScroll = (e: Event) => {
  console.log('e', e)
}

defineExpose({
  update,
  curScrollCount,
  translateY,
})

onMounted(async () => {
  await nextTick()
  emits('init')
  requestAnimationFrame(() => {})
})
</script>
<style lang="css" scoped>
.container {
  width: 100%;
  height: 100%;
}

.view {
  width: 100%;
  height: 100%;
  overflow: auto;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.prev {
  width: 100%;
  flex-shrink: 0;
  overflow: hidden;
}

.next {
  width: 100%;
  flex-shrink: 0;
  overflow: hidden;
}

.view::-webkit-scrollbar {
  display: none;
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
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
