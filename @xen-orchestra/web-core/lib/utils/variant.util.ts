export function variant(props: Record<string, string | undefined>, options?: { disabled?: boolean }) {
  if (options?.disabled) {
    props.state = 'disabled'
  }
  return Object.entries(props).map(([prop, value]) => {
    const variant = `variant-${prop}`
    return value ? [variant, `${variant}-${value}`] : variant
  })
}
