export function limpiarRut(value: string): string {
  return (value || '')
    .replace(/[^0-9kK]/g, '')
    .toUpperCase()
    .slice(0, 9)
}

export function formatearRut(value: string): string {
  const limpio = limpiarRut(value)
  if (!limpio) return ''
  if (limpio.length === 1) return limpio

  const cuerpo = limpio.slice(0, -1)
  const dv = limpio.slice(-1)

  const cuerpoConPuntos = cuerpo
    .split('')
    .reverse()
    .reduce((acc, char, index) => {
      const prefijo = index > 0 && index % 3 === 0 ? `${char}.${acc}` : `${char}${acc}`
      return prefijo
    }, '')

  return `${cuerpoConPuntos}-${dv}`.slice(0, 12)
}

export function rutParaApi(value: string): string {
  return limpiarRut(value)
}
