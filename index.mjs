export class Timeless {
  constructor() {
    this._enc = 'utf-8'
    this._sortedBase = null
    this._sortedAlpha = null
    this._gr = /(\p{RI}\p{RI}|\p{Emoji}(\p{EMod}|\uFE0F\u20E3?|[\u{E0020}-\u{E007E}]+\u{E007F})?(\u200D\p{Emoji}(\p{EMod}|\uFE0F\u20E3?|[\u{E0020}-\u{E007E}]+\u{E007F})?)*|\p{Other})/gu
    this.base = [
      Buffer.from('👁️', this._enc), Buffer.from('🐍', this._enc), Buffer.from('🦩', this._enc),
      Buffer.from('🦠', this._enc), Buffer.from('🌞', this._enc)
    ]
    this.alphabet = this._graphemesToBuffers(` !"#$%&\'()*+,-./0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz`)
    this.digits = this._setDigits()
    this._rebuildLookups()
  }

  _graphemesToBuffers(str) {
    if (typeof Intl !== 'undefined' && 'Segmenter' in Intl) {
      const sg = new Intl.Segmenter('en', { granularity: 'grapheme' })
      const sgs = Array.from(sg.segment(str), ({ segment }) => segment)
      return sgs.map(sg => Buffer.from(sg, this._enc))
    } else {
      return this._fallbackGraphemeSplit(str).map(segment => Buffer.from(segment, this._enc))
    }
  }

  _fallbackGraphemeSplit(str) {
    const sgs = []
    let m
    while ((m = this._gr.exec(str)) !== null) { sgs.push(m[0]) }
    return sgs.length > 0 ? sgs : Array.from(str)
  }

  _setDigits() { return Math.ceil(Math.log(this.alphabet.length) / Math.log(this.base.length)) || 1 }

  _rebuildLookups() {
    const buffToIdx = new Map()
    this.base.forEach((b, idx) => buffToIdx.set(b.toString('hex'), idx))
    this._sortedBase = [...this.base].sort((a, b) => b.length - a.length).map(b => ({
      buff: b,
      index: buffToIdx.get(b.toString('hex')),
      length: b.length
    }))
    const alphaToIdx = new Map()
    this.alphabet.forEach((buf, idx) => alphaToIdx.set(buf.toString('hex'), idx))
    this._sortedAlpha = [...this.alphabet].sort((a, b) => b.length - a.length).map(a => ({
      buff: a,
      index: alphaToIdx.get(a.toString('hex')),
      length: a.length
    }))
  }

  _findBuffIdx(h, n) {
    for (let i = 0; i < h.length; i++) { if (h[i].equals(n)) return i }
    return -1
  }

  _encodeSymbol(sb) {
    const idx = this._findBuffIdx(this.alphabet, sb)
    if (idx === -1) {
      const char = sb.toString(this._enc)
      throw new Error(`Symbol not in alphabet: "${char}" (hex: ${sb.toString('hex')})`)
    } 
    let r = Buffer.alloc(0), re = idx
    for (let i = 0; i < this.digits; i++) {
      const sI = re % this.base.length
      r = Buffer.concat([this.base[sI], r]), re = Math.floor(re / this.base.length)
    }
    return r
  }

  _decodeSymbols(sym) {
    let idx = 0, p = 0
    for (let i = 0; i < this.digits; i++) {
      let on = false
      for (const { buff, index } of this._sortedBase) {
        if (sym.length - p >= buff.length && sym.slice(p, p + buff.length).equals(buff)) {
          idx = idx * this.base.length + index
          p += buff.length
          on = true
          break
        }
      }
      if (!on) throw new Error(`No matching symbol found at position ${p}`)
    } 
    if (idx >= this.alphabet.length) throw new Error(`Index ${idx} out of bounds for alphabet`)
    return this.alphabet[idx]
  }

  setSymbols(syms) {
    if (syms && syms.length > 1) {
      const seen = new Set(), uniq = []
      for (const s of syms) {
        const b = Buffer.isBuffer(s) ? s : Buffer.from(s, this._enc)
        const k = b.toString('hex')
        if (!seen.has(k)) {
          seen.add(k)
          uniq.push(b)
        }
      }
      if (uniq.length > 1) {
        this.base = uniq
        this.digits = this._setDigits()
        this._rebuildLookups()
      }
    }
  }

  setAlphabet(alpha) {
    if (alpha && alpha.length > 1) {
      if (Buffer.isBuffer(alpha)) alpha = alpha.toString(this._enc)
      const arr = (Array.isArray(alpha)) ? alpha.map(s => Buffer.isBuffer(s) ? s : Buffer.from(s, this._enc)) : this._graphemesToBuffers(alpha)
      const seen = new Set(), uniq = []
      for (const b of arr) {
        const k = b.toString('hex')
        if (!seen.has(k)) {
          seen.add(k)
          uniq.push(b)
        }
      }
      if (uniq.length > 1) {
        this.alphabet = uniq
        this.digits = this._setDigits()
        this._rebuildLookups()
      }
    }
  }

  encode(x) {
    const b = Buffer.isBuffer(x) ? x : Buffer.from(x, this._enc), e = []
    let p = 0
    while (p < b.length) {
      let on = false
      for (const { buff } of this._sortedAlpha) {
        if (b.length - p >= buff.length && b.slice(p, p + buff.length).equals(buff)) {
          e.push(this._encodeSymbol(buff))
          p += buff.length
          on = true
          break
        }
      }
      if (!on) {
        const c = b.slice(p, Math.min(p + 10, b.length)).toString(this._enc)
        throw new Error(`No matching alphabet symbol found at position ${p}. Context: "${c}"`)
      }
    }
    return Buffer.concat(e)
  }

  decode(x) {
    const e = Buffer.isBuffer(x) ? x : Buffer.from(x, this._enc)
    let p = 0, d = []
    while (p < e.length) {
      try {
        d.push(this._decodeSymbols(e.slice(p)))
        let sL = 0
        for (let i = 0; i < this.digits; i++) {
          let on = false
          for (const { buff } of this._sortedBase) {
            if (e.slice(p + sL, p + sL + buff.length).equals(buff)) {
              sL += buff.length
              on = true
              break
            }
          }
          if (!on) throw new Error(`Cannot find symbol ${i + 1} at position ${p + sL}`)
        }
        p += sL
      } catch (e) { throw new Error(`Decoding error at position ${p}: ${e.message}`) }
    }
    return Buffer.concat(d)
  }

  encodeString(text) { return this.encode(text).toString(this._enc) }
  
  decodeString(encText) { return this.decode(encText).toString(this._enc) }

  getState() {
    return {
      base: this.base.map(b => b.toString(this._enc)),
      alphabet: this.alphabet.map(a => a.toString(this._enc)),
      digits: this.digits,
      alphabetSize: this.alphabet.length,
      gr: this._gr
    }
  }
}