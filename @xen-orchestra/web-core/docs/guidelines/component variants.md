# Component variants

Component variants (color, size, etc.) provide a convenient way to customize the appearance of your component based on
props.

ℹ️ CSS Custom Properties will be referred to as "variables" in this document.

💡 You can find a fully working example in the [Square.vue](./Square.vue) file.

## 1. Define you variants as required props

```ts
defineProps<{
  size: 'small' | 'large'
  color: 'info' | 'success'
}>()
```

## 2. Apply the variants to the component root element with the `variant()` helper

```vue
<template>
  <div :class="variant({ size, color })" class="vts-square">
    <span class="icon" />
  </div>
</template>

<script lang="ts" setup>
import { variant } from '@core/utils/variant.util'

defineProps<{
  size: 'small' | 'large'
  color: 'info' | 'success'
}>()
</script>
```

This will apply the `variant-<name>` and `variant-<name>-<value>` classes on the root element.

For example, if a component has `size` variant set to `large` and `color` variants set to `success`, the rendered code
will be:

```vue
<div class="vts-square variant-size variant-size-large variant-color variant-color-success">
  <span class="icon"/>
</div>
```

## 3. In CSS, replace your customizable values with variables

- The variable MUST have the name of the attribute being customized.
- If the variable is used by a child element, then it MUST be prefixed with `<child-class>__`

For example, to customize our square's `width`, `height` and `background-color`, and our icon's `color` and `font-size`:

```vue
<template>
  <div class="vts-square">
    <span class="icon" />
  </div>
</template>

<style lang="postcss" scoped>
.vts-square {
  width: var(--width);
  height: var(--height);
  background-color: var(--background-color);
}

.icon {
  color: var(--icon__color);
  font-size: var(--icon__font-size);
}
</style>
```

## 4. Add the variants and their values

Take advantage of CSS nesting to keep variants together.

This also allows you to collapse entire variants in editors that support code folding.

```
.variant {
  &-<name> {
    &-<value> {
      // Rules for `variant-<name>-<value>` class
    }
  }
}
```

In our example:

```postcss
.variant {
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

  &-color {
    &-info {
      --background-color: blue;
      --icon__color: lightblue;
    }

    &-success {
      --background-color: green;
      --icon__color: lightgreen;
    }
  }
}

/* IMPLEMENTATION */

.vts-square {
  width: var(--width);
  height: var(--height);
  background-color: var(--background-color);
}

.icon {
  color: var(--icon__color);
  font-size: var(--icon__font-size);
}
```

## 5. Special case: Interactive component

When an element has user interaction (hover, focus, pressed, etc.), they must be defined as an optional `state` prop.

CSS rules should be defined (if applicable) under a `.variant-state` class, in the following order:

1. Default values
2. `&-active`, or `&-selected`
3. `&:is(:hover, :focus-visible, &-hover)`
4. `&:is(:active, &-pressed)`
5. `&:is(:disabled, &-disabled)`

## Example

```css
.variant-state {
  /* default values */

  &-selected {
    /* values */
  }

  &:is(:hover, :focus-visible, &-hover) {
    /* values */
  }

  &:is(:active, &-pressed) {
    /* values */
  }

  &:is(:disabled, &-disabled) {
    /* values */
  }
}
```

## 6. Special case: Disabled component

When a component can be in a disabled state, it should be defined as an optional `disabled: boolean` prop.

This value will be passed as an option in the second argument to the `variant()` helper.

```vue
<template>
  <div :class="variant({ size, color }, { disabled })" class="vts-square">
    <span class="icon" />
  </div>
</template>

<script lang="ts" setup>
defineProps<{
  size: 'small' | 'large'
  color: 'info' | 'success'
  disabled: boolean
}>()
</script>
```

When `true`, then `disabled` will act as a `state` variant with value `disabled`, and thus will apply
the `variant-state variant-state-disabled` class.

You can mix `state` and `disabled` variants in the same component. In this case, `state` will be taken into account
if `disabled` is `false`.

```vue
<template>
  <div :class="variant({ size, color, state }, { disabled })" class="vts-square">
    <span class="icon" />
  </div>
</template>

<script lang="ts" setup>
defineProps<{
  size: 'small' | 'large'
  color: 'info' | 'success'
  state: 'active' | 'selected'
  disabled: boolean
}>()
</script>
```

## 7. Special case: Values altered by multiple states at once and transient variables

Ideally, a variant should always define the "final" variables that correspond to it.

For example, a `color` variant would probably define `--color` or `--background-color` variables,
and a `size` variant would probably define `--width` and `--height` variables.

However, if a variant value is based on another variant, then the latter should define transient variables that are used
by the former.

A transient variable will be named following the pattern `--x-<destination-variant-name>-<destination variant value>_<destination-variable-name>`.

For example, let's take a `color` variant that configures the `--color` variable.

But the color to be applied depends on a `size` variant: we want `small` to be lighter than `large`.

Here is how you should define the transient variables:

```postcss
.variant {
  &-size {
    &-small {
      --x-color-info--background-color: lightblue;
      --x-color-success--background-color: lightgreen;
    }

    &-large {
      --x-color-info--background-color: blue;
      --x-color-success--background-color: green;
    }
  }

  &-color {
    &-info {
      --background-color: --x-color-info--background-color;
    }

    &-success {
      --background-color: --x-color-success--background-color;
    }
  }
}

.vts-square {
  background-color: var(--background-color);
}
```
