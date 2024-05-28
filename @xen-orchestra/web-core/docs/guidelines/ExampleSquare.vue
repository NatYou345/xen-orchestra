<template>
  <div :class="variant({ color, size, state }, { disabled })" class="vts-example-square">
    <UiIcon :icon="faSmile" class="icon" />
  </div>
</template>

<script lang="ts" setup>
import UiIcon from '@core/components/icon/UiIcon.vue'
import { variant } from '@core/utils/variant.util'
import { faSmile } from '@fortawesome/free-solid-svg-icons'

defineProps<{
  color: 'info' | 'success'
  size: 'small' | 'large'
  state?: 'hover' | 'pressed' | 'disabled'
  disabled?: boolean
}>()
</script>

<style lang="postcss" scoped>
.variant {
  &-state {
    & {
      --x-color-info--background-color: blue;
      --x-color-success--background-color: green;

      --x-color-info--icon__color: lightblue;
      --x-color-success--icon__color: lightgreen;
    }

    &:is(:hover, &-hover) {
      --x-color-info--background-color: lightblue;
      --x-color-success--background-color: lightgreen;

      --x-color-info--icon__color: blue;
      --x-color-success--icon__color: green;
    }

    &:is(:active, &-pressed) {
      --x-color-info--background-color: darkblue;
      --x-color-success--background-color: darkgreen;

      --x-color-info--icon__color: white;
      --x-color-success--icon__color: white;
    }

    &:is(:disabled, &-disabled) {
      --x-color-info--background-color: #d8d8e6;
      --x-color-success--background-color: #ddeedd;

      --x-color-info--icon__color: white;
      --x-color-success--icon__color: white;
    }
  }

  &-color {
    &-info {
      --background-color: var(--x-color-info--background-color);
      --icon__color: var(--x-color-info--icon__color);
    }

    &-success {
      --background-color: var(--x-color-success--background-color);
      --icon__color: var(--x-color-success--icon__color);
    }
  }

  &-size {
    &-small {
      --width: 100px;
      --height: 100px;
      --icon__font-size: 32px;
    }

    &-large {
      --width: 200px;
      --height: 200px;
      --icon__font-size: 64px;
    }
  }
}

/* IMPLEMENTATION */

.vts-example-square {
  width: var(--width);
  height: var(--height);
  background-color: var(--background-color);
  text-align: center;
  align-content: center;
}

.icon {
  font-size: var(--icon__font-size);
  color: var(--icon__color);
}
</style>
