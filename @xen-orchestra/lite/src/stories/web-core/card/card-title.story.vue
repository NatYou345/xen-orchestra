<template>
  <ComponentStory
    v-slot="{ properties, settings }"
    :params="[
      slot().help('Meant to receive the title and a UiCounter'),
      slot('info').help('Meant to receive an info text and / or a tertiary UiButton'),
      slot('description').help('Meant to receive a description text, will be displayed under the title'),
      setting('defaultSlotContent').preset('Title').widget(text()),
      setting('infoSlotContent').preset('Info').widget(text()),
      setting('descriptionSlotContent').preset('Description').widget(text()),
    ]"
  >
    <CardTitle v-bind="properties">
      {{ settings.defaultSlotContent }}<UiCounter :value="3" color="danger" size="medium" />
      <template #info>
        {{ settings.infoSlotContent
        }}<UiButton level="tertiary" size="extra-small" :right-icon="faAngleRight">See all</UiButton>
      </template>
      <template #description>{{ settings.descriptionSlotContent }}</template>
    </CardTitle>
  </ComponentStory>
</template>

<script lang="ts" setup>
import ComponentStory from '@/components/component-story/ComponentStory.vue'
import { slot, setting } from '@/libs/story/story-param'
import { text } from '@/libs/story/story-widget'
import UiButton from '@core/components/button/UiButton.vue'
import CardTitle from '@core/components/card/CardTitle.vue'
import UiCounter from '@core/components/UiCounter.vue'
import { faAngleRight } from '@fortawesome/free-solid-svg-icons'
</script>
