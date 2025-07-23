<script setup lang="ts">
import WaterfallView from '@/components/waterfall-view/waterfall-view.vue'
import { ref } from 'vue'

const list = ref([
  './img/1.jpg',
  './img/2.jpg',
  './img/3.jpg',
  './img/4.png',
  './img/5.jpg',
  './img/1.jpg',
  './img/2.jpg',
  './img/3.jpg',
  './img/4.png',
  './img/5.jpg',
  './img/1.jpg',
  './img/2.jpg',
  './img/3.jpg',
  './img/4.png',
  './img/5.jpg',
  './img/1.jpg',
  './img/2.jpg',
  './img/3.jpg',
  './img/4.png',
  './img/5.jpg',
  './img/1.jpg',
  './img/2.jpg',
  './img/3.jpg',
  './img/4.png',
  './img/5.jpg',
  './img/1.jpg',
  './img/2.jpg',
  './img/3.jpg',
  './img/4.png',
  './img/5.jpg',
  './img/1.jpg',
  './img/2.jpg',
  './img/3.jpg',
  './img/4.png',
  './img/5.jpg',
  './img/1.jpg',
  './img/2.jpg',
  './img/3.jpg',
  './img/4.png',
  './img/5.jpg',
])
const waterfallRef = ref<InstanceType<typeof WaterfallView> | null>(null)
</script>
<template>
  <div class="box">
    <WaterfallView
      :list="list"
      ref="waterfallRef"
      @init="waterfallRef!.update(5)"
      :op="{ gap: 10 }"
    ></WaterfallView>
  </div>
</template>

<style scoped>
.box {
  width: 500px;
  height: 500px;
  background-color: red;
}
</style>
