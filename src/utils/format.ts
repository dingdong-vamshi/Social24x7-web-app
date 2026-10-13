export const formatMoney = (minor: number) => new Intl.NumberFormat('en-IN', {
  style: 'currency', currency: 'INR', maximumFractionDigits: 0,
}).format(minor / 100)

export const sentenceCase = (value: string) => value.replaceAll('_', ' ').replace(/^./, (letter) => letter.toUpperCase())
