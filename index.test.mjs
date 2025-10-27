import { Timeless } from './index.mjs'

const ALPHA = `!"#$%&'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_\`abcdefghijklmnopqrstuvwxyz{|}~❤️‍🔥🦃👻🧑‍🧒`

function generateText(length, alpha, gr) {
  let r = ''
  const a = splitGraphemes(alpha, gr)
  for (let i = 0; i < length; i++) { r += a[Math.floor(Math.random() * a.length)] }
  return r
}

function splitGraphemes(str, gr) {
  if (typeof Intl !== 'undefined' && 'Segmenter' in Intl) {
    const sg = new Intl.Segmenter('en', { granularity: 'grapheme' })
    return Array.from(sg.segment(str), ({ segment }) => segment)
  } else {
    const sgs = []
    let m
    while ((m = gr.exec(str)) !== null) { sgs.push(m[0]) }
    return sgs.length > 0 ? sgs : Array.from(str)
  }
}

function setEncoder(symbols) {
  const enc = new Timeless()
  enc.setSymbols(symbols)
  enc.setAlphabet(ALPHA)
  return enc
}

const enc = setEncoder(['💎', '🌋', '🏔️', '🪱', '🌳'])
for (let i = 0; i < Math.floor(Math.random() * 3) + 1; i++) {
  const message = generateText(Math.floor(Math.random() * 24) + 3, ALPHA, enc.getState().gr)
  try {
    console.log(`\nTesting: "${message}"`) 
    console.log(`\nAlphabet: ${enc.getState().alphabet}`)
    const en = enc.encodeString(message)
    console.log(`\nEncoded:\n${en}`)
    const de = enc.decodeString(en)
    console.log(`\nDecoded:\n${de}`)
    console.log('\nSuccess:', message === de ? '✅' : '❌')
  } catch (e) {
    console.error(`\nError: ${e.message}`)
  }
}

const encF = setEncoder(['🦢', '.'])
encF.setAlphabet(`01`)
const tF = ['#HELLO#\\\n##?!_What^❤️‍🔥']
tF.forEach(m => {
  try {
    console.log(`\nTesting: "${m}"`)
    encF.encodeString(m)
    console.error(`Fail: ❌`)
  } catch (e) {
    console.log(`\nAlphabet: ${encF.getState().alphabet}`)
    console.error(`\nError expected: ${e.message}`)
    console.log('\nSuccess:', e.message ? '✅' : '❌')
  }
})