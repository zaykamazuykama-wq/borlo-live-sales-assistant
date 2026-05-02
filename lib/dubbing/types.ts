// Step 5: Dubbing Module Types for Mongolian AI Dubbing App
// Consumes output from Step 4 (Voice Assignment) and prepares for synthesis

import type {
  Speaker,
  MongolianVoice,
  VoiceAssignment,
  DialogueLine,
  EmotionalTone,
  SpeakingStyle,
} from '../types'

// Re-export for convenience
export type { Speaker, MongolianVoice, VoiceAssignment, DialogueLine }

// ============================================
// TTS Adapter Types (vendor-agnostic)
// ============================================

export type TTSProvider = 'mock' | 'azure' | 'google' | 'aws' | 'custom'

export interface TTSConfig {
  provider: TTSProvider
  apiEndpoint?: string
  apiKey?: string
  region?: string
  defaultLanguage: string // 'mn-MN' for Mongolian
  defaultFormat: AudioFormat
  maxConcurrentRequests: number
}

export type AudioFormat = 'mp3' | 'wav' | 'ogg' | 'webm'
export type AudioQuality = 'low' | 'medium' | 'high' | 'ultra'

export interface TTSRequest {
  id: string
  text: string
  voiceId: string
  language: string
  ssml?: string
  options: TTSOptions
}

export interface TTSOptions {
  pitch: number // -50 to +50
  speed: number // 0.5 to 2.0
  volume: number // -50 to +50
  emotion?: EmotionalTone
  style?: SpeakingStyle
  format: AudioFormat
  quality: AudioQuality
}

export interface TTSResult {
  id: string
  success: boolean
  audioUrl?: string
  audioDuration?: number // in seconds
  audioSize?: number // in bytes
  error?: string
  processingTime?: number // in ms
}

// ============================================
// Timeline / Segment Types
// ============================================

export type AlignmentStatus = 
  | 'pending'
  | 'aligned'
  | 'needs-compression'
  | 'needs-extension'
  | 'overlap-detected'
  | 'gap-detected'

export interface TimingConstraint {
  originalStart: number // Original segment start time (seconds)
  originalEnd: number // Original segment end time (seconds)
  originalDuration: number // Original duration
  targetDuration?: number // Desired dubbed duration
  allowedVariance: number // Percentage variance allowed (e.g., 0.15 = 15%)
  hardBoundary: boolean // If true, cannot exceed original timing
}

export interface AlignmentResult {
  status: AlignmentStatus
  suggestedSpeed: number // Speed adjustment to fit timing
  estimatedDuration: number // Estimated output duration
  overlapAmount?: number // Seconds of overlap with next segment
  gapAmount?: number // Seconds of gap before next segment
  warnings: string[]
}

export interface DubbingSegment {
  id: string
  dialogueLineId: string
  speakerId: string
  voiceId: string
  
  // Text content
  originalText: string
  translatedText: string
  ssmlText?: string // SSML-enhanced version
  
  // Timing
  timing: TimingConstraint
  alignment: AlignmentResult
  
  // Voice settings
  voiceSettings: TTSOptions
  
  // Delivery hints
  emotion: EmotionalTone
  deliveryNotes?: string
  
  // Generation state
  status: SegmentStatus
  audioUrl?: string
  audioDuration?: number
  error?: string
  
  // Metadata
  segmentIndex: number
  isFirstForSpeaker: boolean
  isLastForSpeaker: boolean
}

export type SegmentStatus = 
  | 'pending'
  | 'queued'
  | 'generating'
  | 'completed'
  | 'failed'
  | 'skipped'

// ============================================
// Dubbing Pipeline Types
// ============================================

export interface DubbingPipelineInput {
  speakers: Speaker[]
  assignments: VoiceAssignment[]
  dialogueLines: DialogueLine[]
  voices: MongolianVoice[]
}

export interface DubbingPipelineConfig {
  ttsConfig: TTSConfig
  alignmentConfig: AlignmentConfig
  exportConfig: ExportConfig
}

export interface AlignmentConfig {
  defaultVariance: number // Default allowed timing variance
  compressionLimit: number // Max speed increase (e.g., 1.3 = 30% faster)
  extensionLimit: number // Max speed decrease (e.g., 0.8 = 20% slower)
  minGapBetweenSegments: number // Minimum silence between segments (seconds)
  overlapStrategy: 'compress' | 'truncate' | 'warn'
}

export interface ExportConfig {
  outputFormat: AudioFormat
  outputQuality: AudioQuality
  includeMetadata: boolean
  generateSubtitles: boolean
  subtitleFormat: 'srt' | 'vtt' | 'ass'
  combineToSingleTrack: boolean
  normalizeVolume: boolean
}

// ============================================
// Dubbing State Types
// ============================================

export interface DubbingState {
  // Input data (from Step 4)
  input: DubbingPipelineInput | null
  
  // Processed segments
  segments: DubbingSegment[]
  
  // Generation state
  isProcessing: boolean
  currentSegmentId: string | null
  completedCount: number
  failedCount: number
  
  // Preview state
  previewSegmentId: string | null
  
  // Export state
  exportReady: boolean
  exportProgress: number
}

// ============================================
// Export / Manifest Types
// ============================================

export interface DubbingManifest {
  version: string
  createdAt: string
  projectId?: string
  
  // Source info
  sourceLanguage: string
  targetLanguage: string
  totalDuration: number
  
  // Speaker mappings
  speakerMappings: SpeakerMapping[]
  
  // Segments
  segments: ExportSegment[]
  
  // Output files
  outputs: ExportOutput[]
  
  // Metadata
  metadata: Record<string, unknown>
}

export interface SpeakerMapping {
  speakerId: string
  speakerLabel: string
  voiceId: string
  voiceName: string
  voiceNameMongolian: string
  assignmentType: 'auto' | 'manual'
  confidence: number
}

export interface ExportSegment {
  id: string
  speakerId: string
  originalText: string
  translatedText: string
  startTime: number
  endTime: number
  duration: number
  audioFile?: string
  emotion?: EmotionalTone
}

export interface ExportOutput {
  type: 'audio' | 'subtitle' | 'manifest'
  format: string
  filename: string
  url?: string
  size?: number
}
