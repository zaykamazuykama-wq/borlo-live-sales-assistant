'use client'

import {
  createContext,
  useContext,
  useReducer,
  useCallback,
  useMemo,
  useEffect,
  useRef,
  type ReactNode,
} from 'react'
import type {
  DubbingPipelineInput,
  DubbingState,
  DubbingSegment,
  TTSOptions,
  ExportPackage,
  AlignmentSummary,
} from '@/lib/dubbing'
import {
  createDubbingPipeline,
  getAlignmentSummary,
  type DubbingPipeline,
} from '@/lib/dubbing'

// ============================================
// State Types
// ============================================

interface DubbingContextState extends DubbingState {
  isInitialized: boolean
  alignmentSummary: AlignmentSummary | null
}

// ============================================
// Actions
// ============================================

type Action =
  | { type: 'INITIALIZE_START' }
  | { type: 'INITIALIZE_COMPLETE'; state: DubbingState }
  | { type: 'UPDATE_STATE'; state: Partial<DubbingState> }
  | { type: 'SET_ALIGNMENT_SUMMARY'; summary: AlignmentSummary }
  | { type: 'RESET' }

// ============================================
// Reducer
// ============================================

const initialState: DubbingContextState = {
  input: null,
  segments: [],
  isProcessing: false,
  currentSegmentId: null,
  completedCount: 0,
  failedCount: 0,
  previewSegmentId: null,
  exportReady: false,
  exportProgress: 0,
  isInitialized: false,
  alignmentSummary: null,
}

function reducer(state: DubbingContextState, action: Action): DubbingContextState {
  switch (action.type) {
    case 'INITIALIZE_START':
      return { ...state, isInitialized: false }

    case 'INITIALIZE_COMPLETE':
      return {
        ...state,
        ...action.state,
        isInitialized: true,
        alignmentSummary: getAlignmentSummary(action.state.segments),
      }

    case 'UPDATE_STATE':
      const newState = { ...state, ...action.state }
      if (action.state.segments) {
        newState.alignmentSummary = getAlignmentSummary(action.state.segments)
      }
      return newState

    case 'SET_ALIGNMENT_SUMMARY':
      return { ...state, alignmentSummary: action.summary }

    case 'RESET':
      return initialState

    default:
      return state
  }
}

// ============================================
// Context
// ============================================

interface DubbingContextValue {
  state: DubbingContextState
  initialize: (input: DubbingPipelineInput) => Promise<void>
  generatePreview: (segmentId: string) => Promise<void>
  generateAll: () => Promise<{ completed: number; failed: number }>
  updateSegmentSettings: (
    segmentId: string,
    updates: Partial<Pick<DubbingSegment, 'voiceSettings' | 'emotion' | 'deliveryNotes'>>
  ) => void
  buildExport: () => ExportPackage | null
  reset: () => void
  getSegmentById: (segmentId: string) => DubbingSegment | undefined
  getSegmentsBySpeaker: (speakerId: string) => DubbingSegment[]
}

const DubbingContext = createContext<DubbingContextValue | null>(null)

// ============================================
// Provider
// ============================================

interface DubbingProviderProps {
  children: ReactNode
  initialInput?: DubbingPipelineInput
}

export function DubbingProvider({ children, initialInput }: DubbingProviderProps) {
  const [state, dispatch] = useReducer(reducer, initialState)
  const pipelineRef = useRef<DubbingPipeline | null>(null)

  // Handle state changes from pipeline
  const handleStateChange = useCallback((pipelineState: DubbingState) => {
    dispatch({ type: 'UPDATE_STATE', state: pipelineState })
  }, [])

  // Initialize pipeline
  const initialize = useCallback(async (input: DubbingPipelineInput) => {
    dispatch({ type: 'INITIALIZE_START' })

    // Dispose existing pipeline
    if (pipelineRef.current) {
      pipelineRef.current.dispose()
    }

    // Create new pipeline
    const pipeline = createDubbingPipeline({}, handleStateChange)
    pipelineRef.current = pipeline

    // Initialize with input
    await pipeline.initialize(input)

    dispatch({ type: 'INITIALIZE_COMPLETE', state: pipeline.getState() })
  }, [handleStateChange])

  // Auto-initialize if initial input provided
  useEffect(() => {
    if (initialInput && !state.isInitialized) {
      initialize(initialInput)
    }
  }, [initialInput, state.isInitialized, initialize])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (pipelineRef.current) {
        pipelineRef.current.dispose()
      }
    }
  }, [])

  // Generate preview for single segment
  const generatePreview = useCallback(async (segmentId: string) => {
    if (!pipelineRef.current) return
    await pipelineRef.current.generatePreview(segmentId)
  }, [])

  // Generate all segments
  const generateAll = useCallback(async () => {
    if (!pipelineRef.current) {
      return { completed: 0, failed: 0 }
    }
    return pipelineRef.current.generateAll()
  }, [])

  // Update segment settings
  const updateSegmentSettings = useCallback(
    (
      segmentId: string,
      updates: Partial<Pick<DubbingSegment, 'voiceSettings' | 'emotion' | 'deliveryNotes'>>
    ) => {
      if (!pipelineRef.current) return
      pipelineRef.current.updateSegmentSettings(segmentId, updates)
    },
    []
  )

  // Build export
  const buildExport = useCallback((): ExportPackage | null => {
    if (!pipelineRef.current) return null
    try {
      return pipelineRef.current.buildExport()
    } catch {
      return null
    }
  }, [])

  // Reset
  const reset = useCallback(() => {
    if (pipelineRef.current) {
      pipelineRef.current.dispose()
      pipelineRef.current = null
    }
    dispatch({ type: 'RESET' })
  }, [])

  // Helpers
  const getSegmentById = useCallback(
    (segmentId: string) => state.segments.find((s) => s.id === segmentId),
    [state.segments]
  )

  const getSegmentsBySpeaker = useCallback(
    (speakerId: string) => state.segments.filter((s) => s.speakerId === speakerId),
    [state.segments]
  )

  const value = useMemo(
    () => ({
      state,
      initialize,
      generatePreview,
      generateAll,
      updateSegmentSettings,
      buildExport,
      reset,
      getSegmentById,
      getSegmentsBySpeaker,
    }),
    [
      state,
      initialize,
      generatePreview,
      generateAll,
      updateSegmentSettings,
      buildExport,
      reset,
      getSegmentById,
      getSegmentsBySpeaker,
    ]
  )

  return (
    <DubbingContext.Provider value={value}>
      {children}
    </DubbingContext.Provider>
  )
}

// ============================================
// Hook
// ============================================

export function useDubbing() {
  const context = useContext(DubbingContext)
  if (!context) {
    throw new Error('useDubbing must be used within a DubbingProvider')
  }
  return context
}
