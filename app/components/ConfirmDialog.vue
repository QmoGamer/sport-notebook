<script setup lang="ts">
const { request, answer } = useConfirm()
const cancelButton = ref<HTMLButtonElement | null>(null)

// 打開時把焦點放在「取消」，避免按 Enter 就誤刪
watch(request, async (value) => {
  if (!value) return
  await nextTick()
  cancelButton.value?.focus()
})

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape' && request.value) answer(false)
}

onMounted(() => window.addEventListener('keydown', onKeydown))
onBeforeUnmount(() => window.removeEventListener('keydown', onKeydown))
</script>

<template>
  <Teleport to="body">
    <Transition name="modal-fade">
      <div
        v-if="request"
        class="fixed inset-0 z-[55] flex items-center justify-center bg-slate-900/50 p-4"
        @click.self="answer(false)"
      >
        <div
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="confirm-title"
          aria-describedby="confirm-message"
          class="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl"
        >
          <h3 id="confirm-title" class="text-lg font-bold text-slate-900">{{ request.title }}</h3>
          <p id="confirm-message" class="mt-2 text-sm text-slate-500">{{ request.message }}</p>
          <div class="mt-6 flex justify-end gap-2">
            <button
              ref="cancelButton"
              type="button"
              class="rounded-xl px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100"
              @click="answer(false)"
            >
              取消
            </button>
            <button
              type="button"
              class="rounded-xl bg-red-500 px-4 py-2 text-sm font-semibold text-white hover:bg-red-600"
              @click="answer(true)"
            >
              {{ request.confirmLabel }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.modal-fade-enter-active,
.modal-fade-leave-active {
  transition: opacity 0.15s ease;
}
.modal-fade-enter-from,
.modal-fade-leave-to {
  opacity: 0;
}
</style>
