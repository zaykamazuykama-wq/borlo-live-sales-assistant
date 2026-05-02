// Timeline Aligner for Mongolian AI Dubbing
// Handles segment timing, alignment planning, and overlap detection

import type {
  DialogueLine,
  DubbingSegment,
  TimingConstraint,
  AlignmentResult,
  AlignmentStatus,
  AlignmentConfig,
  VoiceAssignment,
  TTSOptions,
} from './types'
import { DEFAULT_TTS_OPTIONS } from './tts-adapter'

// ============================================
// Default Alignment Configuration
// ============================================

export const DEFAULT_ALIGNMENT_CONFIG: AlignmentConfig = {
  defaultVariance: 0.15, // 15% timing variance allowed
  compressionLimit: 1.4, // Max 40% speed increase
  extensionLimit: 0.7, // Max 30% speed decrease
  minGapBetweenSegments: 0.1, // 100ms minimum gap
  overlapStrategy: 'compress', // Prefer compression over truncation
}

// ============================================
// Timing Calculation Utilities
// ============================================

function estimateMongolianDuration(text: string, speed: number = 1.0): number {
  // Mongolian speech characteristics:
  // - Average speaking rate: 3-4 syllables per second
  // - Mongolian words average 2-3 syllables
  // - Natural pauses add ~10% to duration
  
  const wordCount = text.split(/\s+/).filter(Boolean).length
  const avgSyllablesPerWord = 2.5
  const syllablesPerSecond = 3.5
  
  const baseDuration = (wordCount * avgSyllablesPerWord) / syllablesPerSecond
  const withPauses = baseDuration * 1.1
  
  return Math.max(0.3, withPauses / speed)
}

function calculateTimingConstraint(line: DialogueLine): TimingConstraint {
  const originalDuration = line.endTime - line.startTime
  
  return {
    originalStart: line.startTime,
    originalEnd: line.endTime,
    originalDuration,
    targetDuration: originalDuration, // Default: match original
    allowedVariance: DEFAULT_ALIGNMENT_CONFIG.defaultVariance,
    hardBoundary: false, // Can be overridden per segment
  }
}

// ============================================
// Alignment Analysis
// ============================================

export function analyzeAlignment(
  estimatedDuration: number,
  timing: TimingConstraint,
  config: AlignmentConfig = DEFAULT_ALIGNMENT_CONFIG
): AlignmentResult {
  const targetDuration = timing.targetDuration || timing.originalDuration
  const ratio = estimatedDuration / targetDuration
  
  const warnings: string[] = []
  let status: AlignmentStatus = 'aligned'
  let suggestedSpeed = 1.0
  
  // Check if duration is within acceptable variance
  const minAcceptable = targetDuration * (1 - timing.allowedVariance)
  const maxAcceptable = targetDuration * (1 + timing.allowedVariance)
  
  if (estimatedDuration >= minAcceptable && estimatedDuration <= maxAcceptable) {
    // Duration is acceptable, minor adjustment if needed
    status = 'aligned'
    suggestedSpeed = estimatedDuration / targetDuration
  } else if (estimatedDuration > maxAcceptable) {
    // Need to compress (speed up)
    const requiredSpeed = estimatedDuration / targetDuration
    
    if (requiredSpeed <= config.compressionLimit) {
      status = 'needs-compression'
      suggestedSpeed = requiredSpeed
      warnings.push(`Requires ${Math.round((requiredSpeed - 1) * 100)}% speed increase`)
    } else {
      status = 'needs-compression'
      suggestedSpeed = config.compressionLimit
      warnings.push(`Maximum compression applied (${Math.round((config.compressionLimit - 1) * 100)}%)`)
      warnings.push('Content may extend beyond original timing')
    }
  } else {
    // Need to extend (slow down)
    const requiredSpeed = estimatedDuration / targetDuration
    
    if (requiredSpeed >= config.extensionLimit) {
      status = 'needs-extension'
      suggestedSpeed = requiredSpeed
      warnings.push(`Requires ${Math.round((1 - requiredSpeed) * 100)}% speed decrease`)
    } else {
      status = 'needs-extension'
      suggestedSpeed = config.extensionLimit
      warnings.push(`Maximum extension applied (${Math.round((1 - config.extensionLimit) * 100)}%)`)
    }
  }
  
  const adjustedDuration = estimatedDuration / suggestedSpeed
  
  return {
    status,
    suggestedSpeed,
    estimatedDuration: adjustedDuration,
    warnings,
  }
}

// ============================================
// Segment Overlap Detection
// ============================================

export function detectOverlaps(
  segments: DubbingSegment[],
  config: AlignmentConfig = DEFAULT_ALIGNMENT_CONFIG
): DubbingSegment[] {
  const sortedSegments = [...segments].sort(
    (a, b) => a.timing.originalStart - b.timing.originalStart
  )
  
  return sortedSegments.map((segment, index) => {
    const updatedSegment = { ...segment }
    const nextSegment = sortedSegments[index + 1]
    
    if (!nextSegment) {
      return updatedSegment
    }
    
    const estimatedEnd = segment.timing.originalStart + segment.alignment.estimatedDuration
    const gap = nextSegment.timing.originalStart - estimatedEnd
    
    if (gap < 0) {
      // Overlap detected
      updatedSegment.alignment = {
        ...updatedSegment.alignment,
        status: 'overlap-detected',
        overlapAmount: Math.abs(gap),
        warnings: [
          ...updatedSegment.alignment.warnings,
          `Overlaps with next segment by ${Math.abs(gap).toFixed(2)}s`,
        ],
      }
    } else if (gap > config.minGapBetweenSegments * 3) {
      // Large gap detected (more than 3x minimum)
      updatedSegment.alignment = {
        ...updatedSegment.alignment,
        status: 'gap-detected',
        gapAmount: gap,
        warnings: [
          ...updatedSegment.alignment.warnings,
          `${gap.toFixed(2)}s gap before next segment`,
        ],
      }
    }
    
    return updatedSegment
  })
}

// ============================================
// Main Timeline Alignment Function
// ============================================

export function alignTimeline(
  dialogueLines: DialogueLine[],
  assignments: Record<string, VoiceAssignment>,
  config: AlignmentConfig = DEFAULT_ALIGNMENT_CONFIG
): DubbingSegment[] {
  // Sort by start time
  const sortedLines = [...dialogueLines].sort((a, b) => a.startTime - b.startTime)
  
  // Track segment indices per speaker
  const speakerSegmentCounts: Record<string, number> = {}
  const speakerTotalSegments: Record<string, number> = {}
  
  // First pass: count total segments per speaker
  for (const line of sortedLines) {
    speakerTotalSegments[line.speakerId] = (speakerTotalSegments[line.speakerId] || 0) + 1
  }
  
  // Second pass: create segments with alignment
  const segments: DubbingSegment[] = sortedLines.map((line, index) => {
    const assignment = assignments[line.speakerId]
    const timing = calculateTimingConstraint(line)
    
    // Get speaker segment index
    speakerSegmentCounts[line.speakerId] = (speakerSegmentCounts[line.speakerId] || 0) + 1
    const speakerSegmentIndex = speakerSegmentCounts[line.speakerId]
    const totalForSpeaker = speakerTotalSegments[line.speakerId]
    
    // Build voice settings from assignment
    const voiceSettings: TTSOptions = {
      ...DEFAULT_TTS_OPTIONS,
      pitch: assignment?.customizations?.pitchAdjustment || 0,
      speed: 1.0, // Will be adjusted by alignment
      volume: assignment?.customizations?.volumeAdjustment || 0,
      emotion: line.emotion,
    }
    
    // Estimate duration
    const estimatedDuration = estimateMongolianDuration(line.translatedText, voiceSettings.speed)
    
    // Analyze alignment
    const alignment = analyzeAlignment(estimatedDuration, timing, config)
    
    // Apply suggested speed to voice settings
    voiceSettings.speed = alignment.suggestedSpeed
    
    return {
      id: `segment-${line.id}`,
      dialogueLineId: line.id,
      speakerId: line.speakerId,
      voiceId: assignment?.voiceId || '',
      
      originalText: line.originalText,
      translatedText: line.translatedText,
      
      timing,
      alignment,
      voiceSettings,
      
      emotion: line.emotion || 'neutral',
      
      status: 'pending',
      
      segmentIndex: index,
      isFirstForSpeaker: speakerSegmentIndex === 1,
      isLastForSpeaker: speakerSegmentIndex === totalForSpeaker,
    }
  })
  
  // Third pass: detect overlaps
  return detectOverlaps(segments, config)
}

// ============================================
// Alignment Summary
// ============================================

export interface AlignmentSummary {
  totalSegments: number
  alignedCount: number
  needsCompressionCount: number
  needsExtensionCount: number
  overlapCount: number
  gapCount: number
  averageSpeedAdjustment: number
  totalWarnings: number
}

export function getAlignmentSummary(segments: DubbingSegment[]): AlignmentSummary {
  const summary: AlignmentSummary = {
    totalSegments: segments.length,
    alignedCount: 0,
    needsCompressionCount: 0,
    needsExtensionCount: 0,
    overlapCount: 0,
    gapCount: 0,
    averageSpeedAdjustment: 0,
    totalWarnings: 0,
  }
  
  let totalSpeed = 0
  
  for (const segment of segments) {
    totalSpeed += segment.alignment.suggestedSpeed
    summary.totalWarnings += segment.alignment.warnings.length
    
    switch (segment.alignment.status) {
      case 'aligned':
        summary.alignedCount++
        break
      case 'needs-compression':
        summary.needsCompressionCount++
        break
      case 'needs-extension':
        summary.needsExtensionCount++
        break
      case 'overlap-detected':
        summary.overlapCount++
        break
      case 'gap-detected':
        summary.gapCount++
        break
    }
  }
  
  summary.averageSpeedAdjustment = segments.length > 0 ? totalSpeed / segments.length : 1
  
  return summary
}
