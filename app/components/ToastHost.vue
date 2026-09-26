<script setup lang="ts">
import { mdiAlertCircleOutline, mdiCheck, mdiClose, mdiInformationOutline } from '@mdi/js'

const { toasts, dismiss } = useToast()

const ICON = { success: mdiCheck, error: mdiAlertCircleOutline, info: mdiInformationOutline }
</script>

<template>
  <div class="pl-toasts">
    <div class="d-sr-only" aria-live="polite" role="status">
      <span v-for="t in toasts" :key="t.id">{{ t.kind === 'error' ? '' : t.text }}</span>
    </div>
    <div class="d-sr-only" aria-live="assertive" role="alert">
      <span v-for="t in toasts" :key="t.id">{{ t.kind === 'error' ? t.text : '' }}</span>
    </div>
    <TransitionGroup name="pl-toast" tag="ul" class="pl-toasts__list" aria-hidden="true">
      <li v-for="t in toasts" :key="t.id" class="pl-toast" :class="`pl-toast--${t.kind}`">
        <v-icon :icon="ICON[t.kind]" size="18" class="pl-toast__icon" />
        <span class="pl-toast__text">{{ t.text }}</span>
        <button type="button" class="pl-toast__close" tabindex="-1" @click="dismiss(t.id)">
          <v-icon :icon="mdiClose" size="16" />
        </button>
      </li>
    </TransitionGroup>
  </div>
</template>

<style scoped>
.pl-toasts__list {
  position: fixed;
  z-index: 3000;
  top: 70px;
  left: 50%;
  transform: translateX(-50%);
  width: min(420px, calc(100vw - 32px));
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin: 0;
  padding: 0;
  list-style: none;
  pointer-events: none;
}

.pl-toast {
  display: flex;
  align-items: center;
  gap: 0.65rem;
  padding: 0.7rem 0.6rem 0.7rem 0.85rem;
  background: var(--pl-raised);
  border: 1px solid var(--pl-line-strong);
  border-left: 3px solid var(--pl-accent);
  color: var(--pl-ink);
  font-size: 0.9rem;
  line-height: 1.35;
  box-shadow: 0 10px 30px rgba(var(--v-theme-background), 0.6);
  pointer-events: auto;
}

.pl-toast--success {
  border-left-color: var(--pl-turf);
}
.pl-toast--success .pl-toast__icon {
  color: var(--pl-turf);
}

.pl-toast--error {
  border-left-color: var(--pl-red);
}
.pl-toast--error .pl-toast__icon {
  color: var(--pl-red);
}

.pl-toast--info .pl-toast__icon {
  color: var(--pl-accent);
}

.pl-toast__text {
  flex: 1;
  min-width: 0;
}

.pl-toast__close {
  display: grid;
  place-items: center;
  flex: none;
  width: 28px;
  height: 28px;
  background: transparent;
  border: 0;
  color: var(--pl-ink-faint);
  cursor: pointer;
}

.pl-toast__close:hover {
  color: var(--pl-ink);
}

.pl-toast-enter-active,
.pl-toast-leave-active {
  transition:
    opacity 180ms ease,
    transform 220ms cubic-bezier(0.2, 0.7, 0.2, 1);
}
.pl-toast-enter-from,
.pl-toast-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}

@media (min-width: 860px) {
  .pl-toasts__list {
    top: auto;
    bottom: 24px;
    left: auto;
    right: 24px;
    transform: none;
  }
  .pl-toast-enter-from,
  .pl-toast-leave-to {
    transform: translateY(8px);
  }
}

@media (prefers-reduced-motion: reduce) {
  .pl-toast-enter-active,
  .pl-toast-leave-active {
    transition: opacity 120ms ease;
  }
}
</style>
