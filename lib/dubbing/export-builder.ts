// Export Builder for Mongolian AI Dubbing
// Generates manifest files, subtitles, and export configurations

import type {
  DubbingSegment,
  DubbingManifest,
  SpeakerMapping,
  ExportSegment,
  ExportOutput,
  ExportConfig,
  Speaker,
  MongolianVoice,
  VoiceAssignment,
} from './types'

// ============================================
// Default Export Configuration
// ============================================

export const DEFAULT_EXPORT_CONFIG: ExportConfig = {
  outputFormat: 'mp3',
  outputQuality: 'high',
  includeMetadata: true,
  generateSubtitles: true,
  subtitleFormat: 'srt',
  combineToSingleTrack: true,
  normalizeVolume: true,
}

// ============================================
// Manifest Builder
// ============================================

export function buildDubbingManifest(
  segments: DubbingSegment[],
  speakers: Speaker[],
  voices: MongolianVoice[],
  assignments: VoiceAssignment[],
  config: ExportConfig = DEFAULT_EXPORT_CONFIG
): DubbingManifest {
  // Build speaker mappings
  const speakerMappings: SpeakerMapping[] = speakers.map((speaker) => {
    const assignment = assignments.find((a) => a.speakerId === speaker.id)
    const voice = assignment ? voices.find((v) => v.id === assignment.voiceId) : null
    
    return {
      speakerId: speaker.id,
      speakerLabel: speaker.label,
      voiceId: assignment?.voiceId || '',
      voiceName: voice?.name || 'Unassigned',
      voiceNameMongolian: voice?.nameInMongolian || '',
      assignmentType: assignment?.assignmentType || 'manual',
      confidence: assignment?.confidence || 0,
    }
  })
  
  // Build export segments
  const exportSegments: ExportSegment[] = segments.map((segment) => ({
    id: segment.id,
    speakerId: segment.speakerId,
    originalText: segment.originalText,
    translatedText: segment.translatedText,
    startTime: segment.timing.originalStart,
    endTime: segment.timing.originalEnd,
    duration: segment.alignment.estimatedDuration,
    audioFile: segment.audioUrl ? `audio/${segment.id}.${config.outputFormat}` : undefined,
    emotion: segment.emotion,
  }))
  
  // Calculate total duration
  const totalDuration = segments.length > 0
    ? Math.max(...segments.map((s) => s.timing.originalEnd))
    : 0
  
  // Build output list
  const outputs: ExportOutput[] = []
  
  if (config.combineToSingleTrack) {
    outputs.push({
      type: 'audio',
      format: config.outputFormat,
      filename: `dubbed_audio.${config.outputFormat}`,
    })
  } else {
    segments.forEach((segment) => {
      outputs.push({
        type: 'audio',
        format: config.outputFormat,
        filename: `audio/${segment.id}.${config.outputFormat}`,
      })
    })
  }
  
  if (config.generateSubtitles) {
    outputs.push({
      type: 'subtitle',
      format: config.subtitleFormat,
      filename: `subtitles.${config.subtitleFormat}`,
    })
  }
  
  outputs.push({
    type: 'manifest',
    format: 'json',
    filename: 'manifest.json',
  })
  
  return {
    version: '1.0.0',
    createdAt: new Date().toISOString(),
    sourceLanguage: 'auto', // Could be detected from input
    targetLanguage: 'mn-MN',
    totalDuration,
    speakerMappings,
    segments: exportSegments,
    outputs,
    metadata: {
      generator: 'Mongolian AI Dubbing App',
      exportConfig: config,
    },
  }
}

// ============================================
// Subtitle Generation
// ============================================

function formatSRTTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = Math.floor(seconds % 60)
  const ms = Math.round((seconds % 1) * 1000)
  
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')},${ms.toString().padStart(3, '0')}`
}

function formatVTTTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = Math.floor(seconds % 60)
  const ms = Math.round((seconds % 1) * 1000)
  
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(3, '0')}`
}

export function generateSRT(segments: DubbingSegment[]): string {
  const sortedSegments = [...segments].sort(
    (a, b) => a.timing.originalStart - b.timing.originalStart
  )
  
  return sortedSegments
    .map((segment, index) => {
      const startTime = formatSRTTime(segment.timing.originalStart)
      const endTime = formatSRTTime(
        segment.timing.originalStart + segment.alignment.estimatedDuration
      )
      
      return `${index + 1}\n${startTime} --> ${endTime}\n${segment.translatedText}\n`
    })
    .join('\n')
}

export function generateVTT(segments: DubbingSegment[]): string {
  const sortedSegments = [...segments].sort(
    (a, b) => a.timing.originalStart - b.timing.originalStart
  )
  
  let vtt = 'WEBVTT\n\n'
  
  sortedSegments.forEach((segment, index) => {
    const startTime = formatVTTTime(segment.timing.originalStart)
    const endTime = formatVTTTime(
      segment.timing.originalStart + segment.alignment.estimatedDuration
    )
    
    vtt += `${index + 1}\n${startTime} --> ${endTime}\n${segment.translatedText}\n\n`
  })
  
  return vtt
}

export function generateSubtitles(
  segments: DubbingSegment[],
  format: 'srt' | 'vtt' | 'ass' = 'srt'
): string {
  switch (format) {
    case 'srt':
      return generateSRT(segments)
    case 'vtt':
      return generateVTT(segments)
    case 'ass':
      // ASS format is more complex, fallback to SRT for now
      console.warn('ASS format not fully implemented, using SRT')
      return generateSRT(segments)
    default:
      return generateSRT(segments)
  }
}

// ============================================
// Export Package Builder
// ============================================

export interface ExportPackage {
  manifest: DubbingManifest
  subtitles?: string
  subtitleFormat?: string
  audioFiles: { id: string; url: string }[]
}

export function buildExportPackage(
  segments: DubbingSegment[],
  speakers: Speaker[],
  voices: MongolianVoice[],
  assignments: VoiceAssignment[],
  config: ExportConfig = DEFAULT_EXPORT_CONFIG
): ExportPackage {
  const manifest = buildDubbingManifest(segments, speakers, voices, assignments, config)
  
  const completedSegments = segments.filter((s) => s.status === 'completed' && s.audioUrl)
  
  const audioFiles = completedSegments.map((segment) => ({
    id: segment.id,
    url: segment.audioUrl!,
  }))
  
  const pkg: ExportPackage = {
    manifest,
    audioFiles,
  }
  
  if (config.generateSubtitles) {
    pkg.subtitles = generateSubtitles(segments, config.subtitleFormat)
    pkg.subtitleFormat = config.subtitleFormat
  }
  
  return pkg
}

// ============================================
// JSON Export
// ============================================

export function exportToJSON(manifest: DubbingManifest): string {
  return JSON.stringify(manifest, null, 2)
}

export function downloadManifest(manifest: DubbingManifest, filename: string = 'dubbing-manifest.json'): void {
  const json = exportToJSON(manifest)
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  
  URL.revokeObjectURL(url)
}

export function downloadSubtitles(content: string, format: string, filename?: string): void {
  const mimeTypes: Record<string, string> = {
    srt: 'text/plain',
    vtt: 'text/vtt',
    ass: 'text/plain',
  }
  
  const blob = new Blob([content], { type: mimeTypes[format] || 'text/plain' })
  const url = URL.createObjectURL(blob)
  
  const a = document.createElement('a')
  a.href = url
  a.download = filename || `subtitles.${format}`
  a.click()
  
  URL.revokeObjectURL(url)
}
