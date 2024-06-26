import type { MaybeRef } from '@vueuse/core'
import { computed, unref } from 'vue'

export default function useFilteredCollection<T>(
  collection: MaybeRef<T[]>,
  predicate: MaybeRef<(value: T) => boolean>
) {
  return computed(() => {
    return unref(collection).filter(unref(predicate))
  })
}
