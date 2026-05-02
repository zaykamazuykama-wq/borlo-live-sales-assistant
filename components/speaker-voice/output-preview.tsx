'use client'

import { useState, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Play, 
  Pause, 
  RotateCcw, 
  Volume2,
  Loader2,
  Download,
  FileJson
} from 'lucide-react'
import type { Speaker, VoiceAssignment, MongolianVoice, DialogueLine, OutputPreview as OutputPreviewType } from '@/lib/types'
import { cn } from '@/lib/utils'

interface OutputPreviewProps {
  speakers: Speaker[]
  assignments: Record<string, VoiceAssignment>
  voices: MongolianVoice[]
  dialogueLines: DialogueLine[]
  previews: OutputPreviewType[]
  onGeneratePreview: (speakerId: string) => void
  onContinueToDubbing: () => void
  onExport: () => void
}

export function OutputPreview({
  speakers,
  assignments,
  voices,
  dialogueLines,
  previews,
  onGeneratePreview,
  onContinueToDubbing,
  onExport,
}: OutputPreviewProps) {
  const [playingSpeakerId, setPlayingSpeakerId] = useState<string | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  const getVoiceForSpeaker = (speakerId: string): MongolianVoice | undefined => {
    const assignment = assignments[speakerId]
    if (!assignment) return undefined
    return voices.find((v) => v.id === assignment.voiceId)
  }

  const getPreviewForSpeaker = (speakerId: string): OutputPreviewType | undefined => {
    return previews.find((p) => p.speakerId === speakerId)
  }

  const handlePlay = (speakerId: string) => {
    // In a real implementation, this would play the actual audio
    if (playingSpeakerId === speakerId) {
      setPlayingSpeakerId(null)
    } else {
      setPlayingSpeakerId(speakerId)
      // Simulate audio playback duration
      setTimeout(() => {
        setPlayingSpeakerId(null)
      }, 3000)
    }
  }

  const assignedSpeakers = speakers.filter((s) => assignments[s.id])
  const allSpeakersAssigned = speakers.length > 0 && assignedSpeakers.length === speakers.length
  
  // Check if all dialogue lines have speakers with assigned voices
  const lines = dialogueLines ?? []
  const allSegmentsHaveVoice = lines.length === 0 || lines.every((line) => {
    return assignments[line.speakerId] !== undefined
  })
  
  // Final validation: can only continue if all speakers have voices AND all segments inherit voices
  const canContinue = allSpeakersAssigned && allSegmentsHaveVoice
  
  // Count segments per speaker for display
  const segmentCounts = speakers.reduce((acc, speaker) => {
    acc[speaker.id] = lines.filter((line) => line.speakerId === speaker.id).length
    return acc
  }, {} as Record<string, number>)

  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">Output Preview</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Review voice assignments and generate audio previews
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={allSpeakersAssigned ? 'default' : 'secondary'}>
              {assignedSpeakers.length}/{speakers.length} assigned
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {speakers.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Volume2 className="size-12 mx-auto mb-3 opacity-20" />
            <p>No speakers detected</p>
            <p className="text-sm">Upload content to get started</p>
          </div>
        ) : (
          <>
            {/* Speaker List */}
            <div className="space-y-3">
              {speakers.map((speaker) => {
                const voice = getVoiceForSpeaker(speaker.id)
                const preview = getPreviewForSpeaker(speaker.id)
                const isPlaying = playingSpeakerId === speaker.id
                const assignment = assignments[speaker.id]

                return (
                  <div
                    key={speaker.id}
                    className={cn(
                      'flex items-center gap-4 p-3 rounded-lg border',
                      voice ? 'bg-card' : 'bg-muted/30'
                    )}
                  >
                    {/* Speaker Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{speaker.label}</span>
                        {assignment && (
                          <Badge
                            variant={assignment.assignmentType === 'auto' ? 'default' : 'secondary'}
                            className={cn(
                              'text-xs',
                              assignment.assignmentType === 'auto'
                                ? 'bg-emerald-600 hover:bg-emerald-600'
                                : 'bg-amber-100 text-amber-700 border-amber-300'
                            )}
                          >
                            {assignment.assignmentType === 'auto' ? 'Best Match' : 'Manual'}
                          </Badge>
                        )}
                        {segmentCounts[speaker.id] > 0 && (
                          <span className="text-xs text-muted-foreground">
                            ({segmentCounts[speaker.id]} segments)
                          </span>
                        )}
                      </div>
                      {voice ? (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {voice.name} ({voice.nameInMongolian})
                        </p>
                      ) : (
                        <p className="text-xs text-amber-600 mt-0.5 font-medium">
                          No voice assigned
                        </p>
                      )}
                    </div>

                    {/* Confidence */}
                    {assignment && (
                      <div className="text-right shrink-0">
                        <span
                          className={cn(
                            'text-sm font-medium',
                            assignment.confidence >= 0.8
                              ? 'text-emerald-600'
                              : assignment.confidence >= 0.6
                                ? 'text-amber-600'
                                : 'text-red-600'
                          )}
                        >
                          {Math.round(assignment.confidence * 100)}%
                        </span>
                        <p className="text-xs text-muted-foreground">match</p>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex items-center gap-2 shrink-0">
                      {voice && (
                        <>
                          {preview?.isGenerating ? (
                            <Button variant="outline" size="sm" disabled>
                              <Loader2 className="size-4 animate-spin" />
                            </Button>
                          ) : preview?.audioUrl ? (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handlePlay(speaker.id)}
                            >
                              {isPlaying ? (
                                <Pause className="size-4" />
                              ) : (
                                <Play className="size-4" />
                              )}
                            </Button>
                          ) : (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => onGeneratePreview(speaker.id)}
                            >
                              <Volume2 className="size-4" />
                            </Button>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between pt-4 border-t">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  assignedSpeakers.forEach((s) => onGeneratePreview(s.id))
                }}
                disabled={assignedSpeakers.length === 0}
              >
                <RotateCcw className="size-4 mr-2" />
                Generate All Previews
              </Button>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onExport}
                  disabled={!canContinue}
                >
                  <FileJson className="size-4 mr-2" />
                  Export Config
                </Button>
                <Button
                  size="sm"
                  disabled={!canContinue}
                  onClick={onContinueToDubbing}
                  className={cn(
                    canContinue && 'bg-emerald-600 hover:bg-emerald-700'
                  )}
                >
                  <Download className="size-4 mr-2" />
                  Continue to Dubbing
                </Button>
              </div>
            </div>

            {/* Hidden audio element for playback */}
            <audio ref={audioRef} className="hidden" />
          </>
        )}
      </CardContent>
    </Card>
  )
}
