// Speaker & Voice Assignment Types for Mongolian AI Dubbing App

export type Gender = 'male' | 'female' | 'neutral'
export type AgeRange = 'child' | 'young-adult' | 'adult' | 'senior'
export type SpeakingStyle = 'calm' | 'energetic' | 'serious' | 'warm' | 'authoritative' | 'gentle'
export type EmotionalTone = 'neutral' | 'happy' | 'sad' | 'angry' | 'excited' | 'thoughtful'

export interface SpeakerTraits {
  gender: Gender
  ageRange: AgeRange
  speakingStyle: SpeakingStyle
  emotionalTone: EmotionalTone
  speakingRate: number // 0.5 to 2.0, 1.0 is normal
  pitch: number // 0.5 to 2.0, 1.0 is normal
}

export interface Speaker {
  id: string
  label: string // e.g., "Speaker 1", "Narrator"
  inferredTraits: SpeakerTraits
  dialogueCount: number
  totalDuration: number // in seconds
  sampleText: string // Sample dialogue for preview
}

export interface MongolianVoice {
  id: string
  name: string
  nameInMongolian: string // Mongolian script name
  gender: Gender
  ageRange: AgeRange
  style: SpeakingStyle
  description: string
  descriptionInMongolian: string
  sampleAudioUrl?: string
  // Voice quality indicators
  naturalness: number // 1-5 rating
  clarity: number // 1-5 rating
  emotionalRange: number // 1-5 rating
  // Supported features
  supportsSSML: boolean
  supportsPitchAdjustment: boolean
  supportsSpeedAdjustment: boolean
}

export interface VoiceAssignment {
  speakerId: string
  voiceId: string
  assignmentType: 'auto' | 'manual'
  confidence: number // 0-1, how well the voice matches the speaker traits
  customizations: {
    pitchAdjustment: number // -50 to +50 percent
    speedAdjustment: number // -50 to +50 percent
    volumeAdjustment: number // -50 to +50 percent
  }
}

export interface DialogueLine {
  id: string
  speakerId: string
  originalText: string // Original language text
  translatedText: string // Mongolian translation
  startTime: number // in seconds
  endTime: number // in seconds
  emotion?: EmotionalTone
}

export interface OutputPreview {
  speakerId: string
  voiceId: string
  text: string
  audioUrl?: string
  isGenerating: boolean
  error?: string
}

export interface SpeakerVoiceAssignmentState {
  speakers: Speaker[]
  voices: MongolianVoice[]
  assignments: Map<string, VoiceAssignment>
  dialogueLines: DialogueLine[]
  outputPreviews: OutputPreview[]
  isAutoAssigning: boolean
  selectedSpeakerId: string | null
}
