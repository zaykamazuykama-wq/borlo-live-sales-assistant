'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { User, Mic2, CheckCircle2, Clock } from 'lucide-react'
import type { Speaker, MongolianVoice, VoiceAssignment, DubbingSegment } from '@/lib/dubbing'
import { cn } from '@/lib/utils'

interface SpeakerPanelProps {
  speakers: Speaker[]
  voices: MongolianVoice[]
  assignments: VoiceAssignment[]
  segments: DubbingSegment[]
  className?: string
}

export function SpeakerPanel({
  speakers,
  voices,
  assignments,
  segments,
  className,
}: SpeakerPanelProps) {
  const getVoiceForSpeaker = (speakerId: string): MongolianVoice | undefined => {
    const assignment = assignments.find((a) => a.speakerId === speakerId)
    if (!assignment) return undefined
    return voices.find((v) => v.id === assignment.voiceId)
  }

  const getAssignmentForSpeaker = (speakerId: string): VoiceAssignment | undefined => {
    return assignments.find((a) => a.speakerId === speakerId)
  }

  const getSegmentStatsForSpeaker = (speakerId: string) => {
    const speakerSegments = segments.filter((s) => s.speakerId === speakerId)
    const completed = speakerSegments.filter((s) => s.status === 'completed').length
    return { total: speakerSegments.length, completed }
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <User className="size-4" />
          Speakers & Voices
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {speakers.map((speaker) => {
          const voice = getVoiceForSpeaker(speaker.id)
          const assignment = getAssignmentForSpeaker(speaker.id)
          const stats = getSegmentStatsForSpeaker(speaker.id)
          const isComplete = stats.completed === stats.total && stats.total > 0

          return (
            <div
              key={speaker.id}
              className={cn(
                'p-3 rounded-lg border transition-colors',
                isComplete ? 'bg-emerald-50/50 border-emerald-200' : 'bg-muted/30'
              )}
            >
              <div className="flex items-start justify-between gap-2">
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
                            : 'bg-amber-100 text-amber-700'
                        )}
                      >
                        {assignment.assignmentType === 'auto' ? 'Auto' : 'Manual'}
                      </Badge>
                    )}
                  </div>

                  {voice ? (
                    <div className="flex items-center gap-1.5 mt-1">
                      <Mic2 className="size-3 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">
                        {voice.name}
                      </span>
                      <span className="text-xs text-muted-foreground/70">
                        ({voice.nameInMongolian})
                      </span>
                    </div>
                  ) : (
                    <p className="text-xs text-amber-600 mt-1">No voice assigned</p>
                  )}
                </div>

                {/* Segment progress */}
                <div className="text-right shrink-0">
                  <div className="flex items-center gap-1">
                    {isComplete ? (
                      <CheckCircle2 className="size-3 text-emerald-600" />
                    ) : (
                      <Clock className="size-3 text-muted-foreground" />
                    )}
                    <span className={cn(
                      'text-xs font-medium',
                      isComplete ? 'text-emerald-600' : 'text-muted-foreground'
                    )}>
                      {stats.completed}/{stats.total}
                    </span>
                  </div>
                  <span className="text-xs text-muted-foreground">segments</span>
                </div>
              </div>

              {/* Speaker traits preview */}
              <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                <Badge variant="outline" className="text-xs px-1.5 py-0">
                  {speaker.inferredTraits.gender}
                </Badge>
                <Badge variant="outline" className="text-xs px-1.5 py-0">
                  {speaker.inferredTraits.ageRange}
                </Badge>
                <Badge variant="outline" className="text-xs px-1.5 py-0">
                  {speaker.inferredTraits.speakingStyle}
                </Badge>
              </div>
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}
