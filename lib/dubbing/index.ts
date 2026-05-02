// Step 5: Dubbing Module - Barrel Export
// Exports all dubbing-related types, utilities, and pipeline components

// Types
export * from './types'

// TTS Adapter
export {
  type ITTSAdapter,
  MockTTSAdapter,
  createTTSAdapter,
  buildSSML,
  DEFAULT_TTS_OPTIONS,
  DEFAULT_TTS_CONFIG,
} from './tts-adapter'

// Timeline Aligner
export {
  alignTimeline,
  analyzeAlignment,
  detectOverlaps,
  getAlignmentSummary,
  DEFAULT_ALIGNMENT_CONFIG,
  type AlignmentSummary,
} from './timeline-aligner'

// Export Builder
export {
  buildDubbingManifest,
  buildExportPackage,
  generateSubtitles,
  generateSRT,
  generateVTT,
  exportToJSON,
  downloadManifest,
  downloadSubtitles,
  DEFAULT_EXPORT_CONFIG,
  type ExportPackage,
} from './export-builder'

// Pipeline
export {
  DubbingPipeline,
  createDubbingPipeline,
  DEFAULT_PIPELINE_CONFIG,
} from './dubbing-pipeline'
