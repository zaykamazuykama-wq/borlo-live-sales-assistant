'use client'

import {
  createContext,
  useContext,
  useReducer,
  useCallback,
  useMemo,
  type ReactNode,
} from 'react'
import type {
  Speaker,
  MongolianVoice,
  VoiceAssignment,
  DialogueLine,
  OutputPreview,
} from '@/lib/types'
import { mongolianVoices } from '@/lib/mongolian-voices'
import {
  autoAssignVoices,
  createManualAssignment,
  getRecommendedVoices,
} from '@/lib/voice-matching'

// State
interface SpeakerVoiceState {
  speakers: Speaker[]
  assignments: Record<string, VoiceAssignment>
  dialogueLines: DialogueLine[]
  outputPreviews: OutputPreview[]
  isAutoAssigning: boolean
  selectedSpeakerId: string | null
}

// Actions
type Action =
  | { type: 'SET_SPEAKERS'; speakers: Speaker[] }
  | { type: 'SET_DIALOGUE_LINES'; lines: DialogueLine[] }
  | { type: 'AUTO_ASSIGN_START' }
  | { type: 'AUTO_ASSIGN_COMPLETE'; assignments: Record<string, VoiceAssignment> }
  | { type: 'ASSIGN_VOICE'; speakerId: string; voiceId: string }
  | {
      type: 'UPDATE_CUSTOMIZATION'
      speakerId: string
      customizations: VoiceAssignment['customizations']
    }
  | { type: 'SELECT_SPEAKER'; speakerId: string | null }
  | { type: 'SET_OUTPUT_PREVIEW'; preview: OutputPreview }
  | { type: 'CLEAR_OUTPUT_PREVIEWS' }

// Reducer
function reducer(state: SpeakerVoiceState, action: Action): SpeakerVoiceState {
  switch (action.type) {
    case 'SET_SPEAKERS':
      return { ...state, speakers: action.speakers }

    case 'SET_DIALOGUE_LINES':
      return { ...state, dialogueLines: action.lines }

    case 'AUTO_ASSIGN_START':
      return { ...state, isAutoAssigning: true }

    case 'AUTO_ASSIGN_COMPLETE':
      return {
        ...state,
        isAutoAssigning: false,
        assignments: action.assignments,
      }

    case 'ASSIGN_VOICE': {
      const speaker = state.speakers.find((s) => s.id === action.speakerId)
      if (!speaker) return state

      const newAssignment = createManualAssignment(
        action.speakerId,
        action.voiceId,
        speaker
      )

      return {
        ...state,
        assignments: {
          ...state.assignments,
          [action.speakerId]: newAssignment,
        },
      }
    }

    case 'UPDATE_CUSTOMIZATION': {
      const existing = state.assignments[action.speakerId]
      if (!existing) return state

      return {
        ...state,
        assignments: {
          ...state.assignments,
          [action.speakerId]: {
            ...existing,
            customizations: action.customizations,
          },
        },
      }
    }

    case 'SELECT_SPEAKER':
      return { ...state, selectedSpeakerId: action.speakerId }

    case 'SET_OUTPUT_PREVIEW': {
      const existingIndex = state.outputPreviews.findIndex(
        (p) => p.speakerId === action.preview.speakerId
      )
      if (existingIndex >= 0) {
        const newPreviews = [...state.outputPreviews]
        newPreviews[existingIndex] = action.preview
        return { ...state, outputPreviews: newPreviews }
      }
      return {
        ...state,
        outputPreviews: [...state.outputPreviews, action.preview],
      }
    }

    case 'CLEAR_OUTPUT_PREVIEWS':
      return { ...state, outputPreviews: [] }

    default:
      return state
  }
}

// Initial state
const initialState: SpeakerVoiceState = {
  speakers: [],
  assignments: {},
  dialogueLines: [],
  outputPreviews: [],
  isAutoAssigning: false,
  selectedSpeakerId: null,
}

// Context
interface SpeakerVoiceContextValue {
  state: SpeakerVoiceState
  voices: MongolianVoice[]
  setSpeakers: (speakers: Speaker[]) => void
  setDialogueLines: (lines: DialogueLine[]) => void
  runAutoAssign: () => void
  assignVoice: (speakerId: string, voiceId: string) => void
  updateCustomization: (
    speakerId: string,
    customizations: VoiceAssignment['customizations']
  ) => void
  selectSpeaker: (speakerId: string | null) => void
  getRecommendationsForSpeaker: (
    speaker: Speaker
  ) => { voice: MongolianVoice; score: number }[]
  generatePreview: (speakerId: string) => void
  getAssignmentOutput: () => {
    speakers: Speaker[]
    assignments: VoiceAssignment[]
    dialogueLines: DialogueLine[]
  }
}

const SpeakerVoiceContext = createContext<SpeakerVoiceContextValue | null>(null)

// Provider
export function SpeakerVoiceProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState)

  const setSpeakers = useCallback((speakers: Speaker[]) => {
    dispatch({ type: 'SET_SPEAKERS', speakers })
  }, [])

  const setDialogueLines = useCallback((lines: DialogueLine[]) => {
    dispatch({ type: 'SET_DIALOGUE_LINES', lines })
  }, [])

  const runAutoAssign = useCallback(() => {
    dispatch({ type: 'AUTO_ASSIGN_START' })

    // Simulate async operation
    setTimeout(() => {
      const assignmentsMap = autoAssignVoices(state.speakers)
      const assignments: Record<string, VoiceAssignment> = {}
      assignmentsMap.forEach((value, key) => {
        assignments[key] = value
      })
      dispatch({ type: 'AUTO_ASSIGN_COMPLETE', assignments })
    }, 500)
  }, [state.speakers])

  const assignVoice = useCallback((speakerId: string, voiceId: string) => {
    dispatch({ type: 'ASSIGN_VOICE', speakerId, voiceId })
  }, [])

  const updateCustomization = useCallback(
    (speakerId: string, customizations: VoiceAssignment['customizations']) => {
      dispatch({ type: 'UPDATE_CUSTOMIZATION', speakerId, customizations })
    },
    []
  )

  const selectSpeaker = useCallback((speakerId: string | null) => {
    dispatch({ type: 'SELECT_SPEAKER', speakerId })
  }, [])

  const getRecommendationsForSpeaker = useCallback((speaker: Speaker) => {
    return getRecommendedVoices(speaker, 5)
  }, [])

  const generatePreview = useCallback(
    (speakerId: string) => {
      const speaker = state.speakers.find((s) => s.id === speakerId)
      const assignment = state.assignments[speakerId]

      if (!speaker || !assignment) return

      // Set generating state
      dispatch({
        type: 'SET_OUTPUT_PREVIEW',
        preview: {
          speakerId,
          voiceId: assignment.voiceId,
          text: speaker.sampleText,
          isGenerating: true,
        },
      })

      // Simulate TTS generation (in real app, this would call an API)
      setTimeout(() => {
        dispatch({
          type: 'SET_OUTPUT_PREVIEW',
          preview: {
            speakerId,
            voiceId: assignment.voiceId,
            text: speaker.sampleText,
            isGenerating: false,
            // In real implementation, this would be an actual audio URL
            audioUrl: `#preview-${speakerId}-${Date.now()}`,
          },
        })
      }, 1500)
    },
    [state.speakers, state.assignments]
  )

  const getAssignmentOutput = useCallback(() => {
    return {
      speakers: state.speakers,
      assignments: Object.values(state.assignments),
      dialogueLines: state.dialogueLines,
    }
  }, [state.speakers, state.assignments, state.dialogueLines])

  const value = useMemo(
    () => ({
      state,
      voices: mongolianVoices,
      setSpeakers,
      setDialogueLines,
      runAutoAssign,
      assignVoice,
      updateCustomization,
      selectSpeaker,
      getRecommendationsForSpeaker,
      generatePreview,
      getAssignmentOutput,
    }),
    [
      state,
      setSpeakers,
      setDialogueLines,
      runAutoAssign,
      assignVoice,
      updateCustomization,
      selectSpeaker,
      getRecommendationsForSpeaker,
      generatePreview,
      getAssignmentOutput,
    ]
  )

  return (
    <SpeakerVoiceContext.Provider value={value}>
      {children}
    </SpeakerVoiceContext.Provider>
  )
}

// Hook
export function useSpeakerVoice() {
  const context = useContext(SpeakerVoiceContext)
  if (!context) {
    throw new Error('useSpeakerVoice must be used within a SpeakerVoiceProvider')
  }
  return context
}
