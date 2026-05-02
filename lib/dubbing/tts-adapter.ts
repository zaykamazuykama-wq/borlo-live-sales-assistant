// TTS Adapter Interface for Mongolian AI Dubbing
// Vendor-agnostic synthesis interface - supports multiple providers

import type {
  TTSProvider,
  TTSConfig,
  TTSRequest,
  TTSResult,
  TTSOptions,
  AudioFormat,
  AudioQuality,
} from './types'

// ============================================
// Abstract TTS Adapter Interface
// ============================================

export interface ITTSAdapter {
  readonly provider: TTSProvider
  readonly isInitialized: boolean
  
  initialize(config: TTSConfig): Promise<void>
  synthesize(request: TTSRequest): Promise<TTSResult>
  synthesizeBatch(requests: TTSRequest[]): Promise<TTSResult[]>
  estimateDuration(text: string, options: TTSOptions): number
  getAvailableVoices(): Promise<string[]>
  validateVoiceId(voiceId: string): boolean
  dispose(): void
}

// ============================================
// Default TTS Options
// ============================================

export const DEFAULT_TTS_OPTIONS: TTSOptions = {
  pitch: 0,
  speed: 1.0,
  volume: 0,
  format: 'mp3',
  quality: 'high',
}

export const DEFAULT_TTS_CONFIG: TTSConfig = {
  provider: 'mock',
  defaultLanguage: 'mn-MN',
  defaultFormat: 'mp3',
  maxConcurrentRequests: 3,
}

// ============================================
// Mock TTS Adapter (for development/preview)
// ============================================

export class MockTTSAdapter implements ITTSAdapter {
  readonly provider: TTSProvider = 'mock'
  private _isInitialized = false
  private _config: TTSConfig | null = null
  
  get isInitialized(): boolean {
    return this._isInitialized
  }

  async initialize(config: TTSConfig): Promise<void> {
    this._config = config
    this._isInitialized = true
    // Simulate initialization delay
    await new Promise((resolve) => setTimeout(resolve, 100))
  }

  async synthesize(request: TTSRequest): Promise<TTSResult> {
    if (!this._isInitialized) {
      return {
        id: request.id,
        success: false,
        error: 'TTS adapter not initialized',
      }
    }

    // Simulate synthesis delay based on text length
    const processingTime = Math.max(500, request.text.length * 20)
    await new Promise((resolve) => setTimeout(resolve, processingTime))

    // Estimate duration based on text and speed
    const estimatedDuration = this.estimateDuration(request.text, request.options)

    return {
      id: request.id,
      success: true,
      audioUrl: `#mock-audio-${request.id}-${Date.now()}`,
      audioDuration: estimatedDuration,
      audioSize: Math.round(estimatedDuration * 16000), // Approximate size
      processingTime,
    }
  }

  async synthesizeBatch(requests: TTSRequest[]): Promise<TTSResult[]> {
    const results: TTSResult[] = []
    
    // Process in batches based on config
    const batchSize = this._config?.maxConcurrentRequests || 3
    
    for (let i = 0; i < requests.length; i += batchSize) {
      const batch = requests.slice(i, i + batchSize)
      const batchResults = await Promise.all(
        batch.map((req) => this.synthesize(req))
      )
      results.push(...batchResults)
    }
    
    return results
  }

  estimateDuration(text: string, options: TTSOptions): number {
    // Mongolian speech rate: approximately 3-4 syllables per second
    // Average Mongolian word has about 2-3 syllables
    const wordCount = text.split(/\s+/).length
    const baseDuration = (wordCount * 2.5) / 3.5 // syllables / rate
    
    // Adjust for speed setting
    const speedAdjustedDuration = baseDuration / options.speed
    
    // Add small buffer for natural pauses
    return Math.max(0.5, speedAdjustedDuration * 1.1)
  }

  async getAvailableVoices(): Promise<string[]> {
    // Return mock voice IDs matching our Mongolian voices
    return [
      'voice-batbayar', 'voice-oyunbileg', 'voice-enkhjargal', 'voice-tserendulam',
      'voice-bold', 'voice-narantuya', 'voice-gantulga', 'voice-altantsetseg',
      'voice-erdene', 'voice-saruul', 'voice-chinbat', 'voice-delgermaa',
    ]
  }

  validateVoiceId(voiceId: string): boolean {
    return voiceId.startsWith('voice-')
  }

  dispose(): void {
    this._isInitialized = false
    this._config = null
  }
}

// ============================================
// TTS Adapter Factory
// ============================================

export function createTTSAdapter(provider: TTSProvider): ITTSAdapter {
  switch (provider) {
    case 'mock':
      return new MockTTSAdapter()
    case 'azure':
      // Future: return new AzureTTSAdapter()
      console.warn('Azure TTS not implemented, falling back to mock')
      return new MockTTSAdapter()
    case 'google':
      // Future: return new GoogleTTSAdapter()
      console.warn('Google TTS not implemented, falling back to mock')
      return new MockTTSAdapter()
    case 'aws':
      // Future: return new AWSTTSAdapter()
      console.warn('AWS TTS not implemented, falling back to mock')
      return new MockTTSAdapter()
    case 'custom':
      // Future: return new CustomTTSAdapter()
      console.warn('Custom TTS not implemented, falling back to mock')
      return new MockTTSAdapter()
    default:
      return new MockTTSAdapter()
  }
}

// ============================================
// SSML Builder Utilities
// ============================================

export function buildSSML(
  text: string,
  options: {
    pitch?: number
    speed?: number
    volume?: number
    emotion?: string
    breaks?: { position: number; duration: string }[]
  }
): string {
  let ssml = '<speak>'
  
  // Apply prosody adjustments
  const prosodyAttrs: string[] = []
  
  if (options.pitch && options.pitch !== 0) {
    const pitchValue = options.pitch > 0 ? `+${options.pitch}%` : `${options.pitch}%`
    prosodyAttrs.push(`pitch="${pitchValue}"`)
  }
  
  if (options.speed && options.speed !== 1) {
    prosodyAttrs.push(`rate="${Math.round(options.speed * 100)}%"`)
  }
  
  if (options.volume && options.volume !== 0) {
    const volumeValue = options.volume > 0 ? `+${options.volume}%` : `${options.volume}%`
    prosodyAttrs.push(`volume="${volumeValue}"`)
  }
  
  if (prosodyAttrs.length > 0) {
    ssml += `<prosody ${prosodyAttrs.join(' ')}>`
  }
  
  // Add text with optional breaks
  if (options.breaks && options.breaks.length > 0) {
    let lastPos = 0
    const sortedBreaks = [...options.breaks].sort((a, b) => a.position - b.position)
    
    for (const brk of sortedBreaks) {
      ssml += text.slice(lastPos, brk.position)
      ssml += `<break time="${brk.duration}"/>`
      lastPos = brk.position
    }
    ssml += text.slice(lastPos)
  } else {
    ssml += text
  }
  
  if (prosodyAttrs.length > 0) {
    ssml += '</prosody>'
  }
  
  ssml += '</speak>'
  
  return ssml
}
