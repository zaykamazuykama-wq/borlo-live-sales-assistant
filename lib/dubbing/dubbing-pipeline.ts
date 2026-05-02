// Dubbing Pipeline for Mongolian AI Dubbing
// Orchestrates the dubbing process from voice assignment to final export

import type {
  DubbingPipelineInput,
  DubbingPipelineConfig,
  DubbingSegment,
  DubbingState,
  TTSRequest,
  TTSResult,
  VoiceAssignment,
} from './types'
import { createTTSAdapter, DEFAULT_TTS_CONFIG, type ITTSAdapter } from './tts-adapter'
import { alignTimeline, DEFAULT_ALIGNMENT_CONFIG, getAlignmentSummary } from './timeline-aligner'
import { buildExportPackage, DEFAULT_EXPORT_CONFIG, type ExportPackage } from './export-builder'

// ============================================
// Default Pipeline Configuration
// ============================================

export const DEFAULT_PIPELINE_CONFIG: DubbingPipelineConfig = {
  ttsConfig: DEFAULT_TTS_CONFIG,
  alignmentConfig: DEFAULT_ALIGNMENT_CONFIG,
  exportConfig: DEFAULT_EXPORT_CONFIG,
}

// ============================================
// Dubbing Pipeline Class
// ============================================

export class DubbingPipeline {
  private config: DubbingPipelineConfig
  private ttsAdapter: ITTSAdapter
  private state: DubbingState
  private onStateChange?: (state: DubbingState) => void

  constructor(
    config: DubbingPipelineConfig = DEFAULT_PIPELINE_CONFIG,
    onStateChange?: (state: DubbingState) => void
  ) {
    this.config = config
    this.ttsAdapter = createTTSAdapter(config.ttsConfig.provider)
    this.onStateChange = onStateChange
    this.state = {
      input: null,
      segments: [],
      isProcessing: false,
      currentSegmentId: null,
      completedCount: 0,
      failedCount: 0,
      previewSegmentId: null,
      exportReady: false,
      exportProgress: 0,
    }
  }

  // Initialize the pipeline with input from Step 4
  async initialize(input: DubbingPipelineInput): Promise<void> {
    // Initialize TTS adapter
    await this.ttsAdapter.initialize(this.config.ttsConfig)

    // Convert assignments array to record
    const assignmentsRecord: Record<string, VoiceAssignment> = {}
    for (const assignment of input.assignments) {
      assignmentsRecord[assignment.speakerId] = assignment
    }

    // Create aligned segments
    const segments = alignTimeline(
      input.dialogueLines,
      assignmentsRecord,
      this.config.alignmentConfig
    )

    this.updateState({
      input,
      segments,
      isProcessing: false,
      currentSegmentId: null,
      completedCount: 0,
      failedCount: 0,
      previewSegmentId: null,
      exportReady: false,
      exportProgress: 0,
    })
  }

  // Generate preview for a single segment
  async generatePreview(segmentId: string): Promise<TTSResult> {
    const segment = this.state.segments.find((s) => s.id === segmentId)
    if (!segment) {
      return { id: segmentId, success: false, error: 'Segment not found' }
    }

    // Update segment status
    this.updateSegment(segmentId, { status: 'generating' })
    this.updateState({ previewSegmentId: segmentId })

    const request: TTSRequest = {
      id: segment.id,
      text: segment.translatedText,
      voiceId: segment.voiceId,
      language: this.config.ttsConfig.defaultLanguage,
      options: segment.voiceSettings,
    }

    try {
      const result = await this.ttsAdapter.synthesize(request)

      if (result.success) {
        this.updateSegment(segmentId, {
          status: 'completed',
          audioUrl: result.audioUrl,
          audioDuration: result.audioDuration,
        })
      } else {
        this.updateSegment(segmentId, {
          status: 'failed',
          error: result.error,
        })
      }

      return result
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      this.updateSegment(segmentId, {
        status: 'failed',
        error: errorMessage,
      })
      return { id: segmentId, success: false, error: errorMessage }
    }
  }

  // Generate all segments
  async generateAll(
    onProgress?: (completed: number, total: number) => void
  ): Promise<{ completed: number; failed: number }> {
    this.updateState({ isProcessing: true, completedCount: 0, failedCount: 0 })

    const pendingSegments = this.state.segments.filter(
      (s) => s.status === 'pending' || s.status === 'failed'
    )

    let completed = 0
    let failed = 0

    // Mark all as queued
    for (const segment of pendingSegments) {
      this.updateSegment(segment.id, { status: 'queued' })
    }

    // Process in batches
    const batchSize = this.config.ttsConfig.maxConcurrentRequests

    for (let i = 0; i < pendingSegments.length; i += batchSize) {
      const batch = pendingSegments.slice(i, i + batchSize)
      const requests: TTSRequest[] = batch.map((segment) => ({
        id: segment.id,
        text: segment.translatedText,
        voiceId: segment.voiceId,
        language: this.config.ttsConfig.defaultLanguage,
        options: segment.voiceSettings,
      }))

      // Update status to generating
      for (const segment of batch) {
        this.updateSegment(segment.id, { status: 'generating' })
        this.updateState({ currentSegmentId: segment.id })
      }

      const results = await this.ttsAdapter.synthesizeBatch(requests)

      for (const result of results) {
        if (result.success) {
          this.updateSegment(result.id, {
            status: 'completed',
            audioUrl: result.audioUrl,
            audioDuration: result.audioDuration,
          })
          completed++
        } else {
          this.updateSegment(result.id, {
            status: 'failed',
            error: result.error,
          })
          failed++
        }
      }

      this.updateState({
        completedCount: completed,
        failedCount: failed,
        exportProgress: ((completed + failed) / pendingSegments.length) * 100,
      })

      onProgress?.(completed + failed, pendingSegments.length)
    }

    const allCompleted = this.state.segments.every(
      (s) => s.status === 'completed' || s.status === 'skipped'
    )

    this.updateState({
      isProcessing: false,
      currentSegmentId: null,
      exportReady: allCompleted,
    })

    return { completed, failed }
  }

  // Build export package
  buildExport(): ExportPackage {
    if (!this.state.input) {
      throw new Error('Pipeline not initialized')
    }

    return buildExportPackage(
      this.state.segments,
      this.state.input.speakers,
      this.state.input.voices,
      this.state.input.assignments,
      this.config.exportConfig
    )
  }

  // Get current state
  getState(): DubbingState {
    return this.state
  }

  // Get alignment summary
  getAlignmentSummary() {
    return getAlignmentSummary(this.state.segments)
  }

  // Update segment settings
  updateSegmentSettings(
    segmentId: string,
    updates: Partial<Pick<DubbingSegment, 'voiceSettings' | 'emotion' | 'deliveryNotes'>>
  ): void {
    this.updateSegment(segmentId, updates)
    // Reset status if settings changed
    const segment = this.state.segments.find((s) => s.id === segmentId)
    if (segment && segment.status === 'completed') {
      this.updateSegment(segmentId, { status: 'pending', audioUrl: undefined })
    }
  }

  // Dispose resources
  dispose(): void {
    this.ttsAdapter.dispose()
  }

  // Private helpers
  private updateState(updates: Partial<DubbingState>): void {
    this.state = { ...this.state, ...updates }
    this.onStateChange?.(this.state)
  }

  private updateSegment(segmentId: string, updates: Partial<DubbingSegment>): void {
    this.state = {
      ...this.state,
      segments: this.state.segments.map((s) =>
        s.id === segmentId ? { ...s, ...updates } : s
      ),
    }
    this.onStateChange?.(this.state)
  }
}

// ============================================
// Factory Function
// ============================================

export function createDubbingPipeline(
  config?: Partial<DubbingPipelineConfig>,
  onStateChange?: (state: DubbingState) => void
): DubbingPipeline {
  const mergedConfig: DubbingPipelineConfig = {
    ttsConfig: { ...DEFAULT_TTS_CONFIG, ...config?.ttsConfig },
    alignmentConfig: { ...DEFAULT_ALIGNMENT_CONFIG, ...config?.alignmentConfig },
    exportConfig: { ...DEFAULT_EXPORT_CONFIG, ...config?.exportConfig },
  }

  return new DubbingPipeline(mergedConfig, onStateChange)
}
