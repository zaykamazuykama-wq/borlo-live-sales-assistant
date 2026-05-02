'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { 
  Wand2, 
  Users, 
  AlertCircle,
  Loader2
} from 'lucide-react'
import { SpeakerCard } from './speaker-card'
import { OutputPreview } from './output-preview'
import { useSpeakerVoice } from './speaker-voice-context'
import type { Speaker, DialogueLine } from '@/lib/types'

interface SpeakerVoiceAssignmentProps {
  initialSpeakers?: Speaker[]
  initialDialogueLines?: DialogueLine[]
  onComplete?: (output: {
    speakers: Speaker[]
    assignments: ReturnType<typeof useSpeakerVoice>['getAssignmentOutput']['assignments']
    dialogueLines: DialogueLine[]
  }) => void
  onContinueToDubbing?: (output: {
    speakers: Speaker[]
    assignments: ReturnType<typeof useSpeakerVoice>['getAssignmentOutput']['assignments']
    dialogueLines: DialogueLine[]
  }) => void
}

export function SpeakerVoiceAssignment({
  initialSpeakers,
  initialDialogueLines,
  onComplete,
  onContinueToDubbing,
}: SpeakerVoiceAssignmentProps) {
  const {
    state,
    voices,
    setSpeakers,
    setDialogueLines,
    runAutoAssign,
    assignVoice,
    updateCustomization,
    selectSpeaker,
    getRecommendationsForSpeaker,
    generatePreview,
    getAssignmentOutput,
  } = useSpeakerVoice()

  // Initialize with provided data
  useEffect(() => {
    if (initialSpeakers && initialSpeakers.length > 0) {
      setSpeakers(initialSpeakers)
    }
    if (initialDialogueLines && initialDialogueLines.length > 0) {
      setDialogueLines(initialDialogueLines)
    }
  }, [initialSpeakers, initialDialogueLines, setSpeakers, setDialogueLines])

  const handleExport = () => {
    const output = getAssignmentOutput()
    if (onComplete) {
      onComplete(output)
    } else {
      // Download as JSON file
      const blob = new Blob([JSON.stringify(output, null, 2)], {
        type: 'application/json',
      })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'speaker-voice-assignments.json'
      a.click()
      URL.revokeObjectURL(url)
    }
  }

  const handleContinueToDubbing = () => {
    const output = getAssignmentOutput()
    if (onContinueToDubbing) {
      onContinueToDubbing(output)
    } else if (onComplete) {
      onComplete(output)
    } else {
      console.log('Continuing to dubbing with output:', output)
      // In a real app, this would navigate to the dubbing step
    }
  }

  const assignedCount = Object.keys(state.assignments).length
  const totalSpeakers = state.speakers.length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Users className="size-5" />
            Speaker & Voice Assignment
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Assign natural Mongolian voices to each detected speaker
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="py-1.5">
            {assignedCount}/{totalSpeakers} assigned
          </Badge>
          <Button
            onClick={runAutoAssign}
            disabled={state.isAutoAssigning || totalSpeakers === 0}
          >
            {state.isAutoAssigning ? (
              <>
                <Loader2 className="size-4 mr-2 animate-spin" />
                Assigning...
              </>
            ) : (
              <>
                <Wand2 className="size-4 mr-2" />
                Auto-Assign All
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Warning if no speakers */}
      {totalSpeakers === 0 && (
        <div className="flex items-center gap-3 p-4 rounded-lg bg-amber-50 border border-amber-200 text-amber-800">
          <AlertCircle className="size-5 shrink-0" />
          <div>
            <p className="font-medium">No speakers detected</p>
            <p className="text-sm opacity-80">
              Upload and process video content to detect speakers for voice assignment.
            </p>
          </div>
        </div>
      )}

      {/* Main Content */}
      {totalSpeakers > 0 && (
        <div className="grid gap-6 lg:grid-cols-[1fr,400px]">
          {/* Speaker Cards */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-muted-foreground">
                Detected Speakers ({totalSpeakers})
              </h3>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">
                  Show Mongolian names
                </span>
                <Switch defaultChecked />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {state.speakers.map((speaker) => (
                <SpeakerCard
                  key={speaker.id}
                  speaker={speaker}
                  assignment={state.assignments[speaker.id]}
                  recommendedVoices={getRecommendationsForSpeaker(speaker)}
                  allVoices={voices}
                  onAssignVoice={assignVoice}
                  onUpdateCustomization={updateCustomization}
                  isSelected={state.selectedSpeakerId === speaker.id}
                  onSelect={() =>
                    selectSpeaker(
                      state.selectedSpeakerId === speaker.id ? null : speaker.id
                    )
                  }
                />
              ))}
            </div>
          </div>

          {/* Output Preview Sidebar */}
          <div className="lg:sticky lg:top-6 lg:self-start">
            <OutputPreview
              speakers={state.speakers}
              assignments={state.assignments}
              voices={voices}
              dialogueLines={state.dialogueLines}
              previews={state.outputPreviews}
              onGeneratePreview={generatePreview}
              onContinueToDubbing={handleContinueToDubbing}
              onExport={handleExport}
            />
          </div>
        </div>
      )}
    </div>
  )
}
