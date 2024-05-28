# Component definition

Lexicon:

- DS: Design System
- SFC: Single-File Component
- Component: A component defined in the Design System (DS)
- Subcomponent: A component that is part of a Component

## Components and Subcomponents MUST be defined as Vue SFC (Single-File Component)

## Components MUST be named according to their name in the DS (Design System)

## Components MUST start with an HTML comment containing the implemented version number from the DS

In the form `v<x>.<y>` (`z` is reserved to DS versioning)

❌ Bad

```vue
<!-- v1.2.0 -->
<template>
  <!-- code -->
</template>
```

✅ Good

```vue
<!-- v1.2 -->
<template>
  <!-- code -->
</template>
```

## Subcomponents MUST NOT have a version number

## Components MUST be stored in their own directory

❌ Bad

`components/Square.vue`

✅ Good

`components/square/Square.vue`

## Component tags MUST follow `template`, `script` then `style` order, separated with an empty line

## Components SHOULD be kept short and be split into multiple Subcomponents if necessary, stored in the same directory

✅ Good

```
/components/
  /square/
    /Square.vue
    /SquareIcon.vue
```

## Component variants (color, size...) MUST be configured according to their guidelines

For more details, see the [Component Variants](./component-variants.md) guidelines

## Class names MUST use kebab-case

## Component root element MUST have a class name based on the component name, prefixed with `vts-`

❌ Bad

```vue
<!-- Square.vue -->
<template>
  <div class="my-shape" />
</template>
```

```vue
<!-- Square.vue -->
<template>
  <div class="square" />
</template>
```

✅ Good

```vue
<!-- Square.vue -->
<template>
  <div class="vts-square" />
</template>
```

```vue
<!-- SquareIcon.vue -->
<template>
  <div class="vts-square-icon" />
</template>
```

## Class names SHOULD be short and MUST be meaningful

❌ Bad

```vue
<template>
  <div class="vts-square">
    <Icon :icon="faSmile" class="vts-square-icon" />
    <div class="component-label"><slot /></div>
  </div>
</template>
```

✅ Good

```vue
<template>
  <div class="vts-square">
    <Icon :icon="faSmile" class="icon" />
    <div class="label"><slot /></div>
  </div>
</template>
```

## Component MUST use `<style scoped>`

## Component SHOULD NOT use nested CSS, unless necessary

With meaningful class names + scoped styles, in most cases it will not be necessary to use nested CSS

❌ Bad

```vue
<style scoped>
.my-component {
  /* styles... */

  .icon {
    /* styles... */
  }
}
</style>
```

✅ Good

```vue
<style scoped>
.my-component {
  /* styles... */
}

.icon {
  /* styles... */
}
</style>
```
