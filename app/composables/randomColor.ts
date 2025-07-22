export const useRandomColor = () => {
  const randomChannelValue = () => Math.floor(Math.random() * 256)
  const r = randomChannelValue()
  const g = randomChannelValue()
  const b = randomChannelValue()
  const toHex = (value: number) => value.toString(16).padStart(2, '0')
  return `${toHex(r)}${toHex(g)}${toHex(b)}`
}

export const useRandomColorRGBA = (alpha: number = 1) => {
  const randomChannelValue = () => Math.floor(Math.random() * 256)
  const r = randomChannelValue()
  const g = randomChannelValue()
  const b = randomChannelValue()
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}
