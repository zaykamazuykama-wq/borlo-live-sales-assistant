'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  User, 
  Clock, 
  MessageSquare,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Hand,
  Check,
  AlertCircle
} from 'lucide-react'
import type { Speaker, VoiceAssignment, MongolianVoice } from '@/lib/types'
import { VoiceSelector } from './voice-selector'
import { VoiceCustomizer } from './voice-customizer'
import { cn } from '@/lib/utils'

interface SpeakerCardProps {
  speaker: Speaker
  assignment?: VoiceAssignment
  recommendedVoices: { voice: MongolianVoice; score: number }[]
  allVoices: MongolianVoice[]
  onAssignVoice: (speakerId: string, voiceId: string) => void
  onUpdateCustomization: (
    speakerId: string,
    customizations: VoiceAssignment['customizations']
  ) => void
  isSelected: boolean
  onSelect: () => void
}

const genderLabels: Record<string, string> = {
  male: 'Male',
  female: 'Female',
  neutral: 'Neutral',
}

const ageLabels: Record<string, string> = {
  child: 'Child',
  'young-adult': 'Young Adult',
  adult: 'Adult',
  senior: 'Senior',
}

const styleLabels: Record<string, string> = {
  calm: 'Calm',
  energetic: 'Energetic',
  serious: 'Serious',
  warm: 'Warm',
  authoritative: 'Authoritative',
  gentle: 'Gentle',
}

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

export function SpeakerCard({
  speaker,
  assignment,
  recommendedVoices,
  allVoices,
  onAssignVoice,
  onUpdateCustomization,
  isSelected,
  onSelect,
}: SpeakerCardProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const assignedVoice = assignment
    ? allVoices.find((v) => v.id === assignment.voiceId)
    : null

  const confidenceColor =
    assignment && assignment.confidence >= 0.8
      ? 'text-emerald-600'
      : assignment && assignment.confidence >= 0.6
        ? 'text-amber-600'
        : 'text-red-600'

  return (
    <Card
      className={cn(
        'transition-all duration-200 cursor-pointer',
        isSelected && 'ring-2 ring-primary shadow-lg'
      )}
      onClick={onSelect}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-full bg-muted">
              <User className="size-5 text-muted-foreground" />
            </div>
            <div>
              <CardTitle className="text-base">{speaker.label}</CardTitle>
              <CardDescription className="flex items-center gap-3 mt-1">
                <span className="flex items-center gap-1">
                  <MessageSquare className="size-3" />
                  {speaker.dialogueCount} lines
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="size-3" />
                  {formatDuration(speaker.totalDuration)}
                </span>
              </CardDescription>
            </div>
          </div>
          {assignment ? (
            <Badge
              variant={assignment.assignmentType === 'auto' ? 'default' : 'secondary'}
              className={cn(
                'text-xs',
                assignment.assignmentType === 'auto' 
                  ? 'bg-emerald-600 hover:bg-emerald-600' 
                  : 'bg-amber-100 text-amber-700 border-amber-300'
              )}
            >
              {assignment.assignmentType === 'auto' ? (
                <span className="flex items-center gap-1">
                  <Sparkles className="size-3" />
                  Best Match
                </span>
              ) : (
                <span className="flex items-center gap-1">
                  <Hand className="size-3" />
                  Manual
                </span>
              )}
            </Badge>
          ) : (
            <Badge variant="outline" className="text-xs border-amber-400 text-amber-600 bg-amber-50">
              <AlertCircle className="size-3 mr-1" />
              Unassigned
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Inferred Traits */}
        <div>
          <p className="text-xs text-muted-foreground mb-2">Inferred Traits</p>
          <div className="flex flex-wrap gap-1.5">
            <Badge variant="outline" className="text-xs">
              {genderLabels[speaker.inferredTraits.gender]}
            </Badge>
            <Badge variant="outline" className="text-xs">
              {ageLabels[speaker.inferredTraits.ageRange]}
            </Badge>
            <Badge variant="outline" className="text-xs">
              {styleLabels[speaker.inferredTraits.speakingStyle]}
            </Badge>
          </div>
        </div>

        {/* Sample Text */}
        <div>
          <p className="text-xs text-muted-foreground mb-1">Sample Dialogue</p>
          <p className="text-sm italic text-foreground/80 line-clamp-2">
            {`"${speaker.sampleText}"`}
          </p>
        </div>

        {/* Assigned Voice */}
        {assignedVoice ? (
          <div className={cn(
            'rounded-lg p-3 border-2 transition-all',
            assignment?.assignmentType === 'auto' 
              ? 'bg-emerald-50 border-emerald-200' 
              : 'bg-primary/5 border-primary/30'
          )}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Check className="size-4 text-emerald-600" />
                <p className="text-xs font-medium text-foreground">Assigned Voice</p>
              </div>
              <span className={cn('text-xs font-medium', confidenceColor)}>
                {Math.round((assignment?.confidence || 0) * 100)}% match
              </span>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-sm">{assignedVoice.name}</p>
                <p className="text-xs text-muted-foreground">
                  {assignedVoice.nameInMongolian}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground">
                  {genderLabels[assignedVoice.gender]} / {ageLabels[assignedVoice.ageRange]}
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="rounded-lg p-3 border-2 border-dashed border-amber-300 bg-amber-50/50">
            <div className="flex items-center gap-2 text-amber-700">
              <AlertCircle className="size-4" />
              <p className="text-sm font-medium">No voice assigned</p>
            </div>
            <p className="text-xs text-amber-600 mt-1">
              Click below to assign a voice or use Auto-Assign
            </p>
          </div>
        )}

        {/* Expand/Collapse Button */}
        <Button
          variant="ghost"
          size="sm"
          className="w-full"
          onClick={(e) => {
            e.stopPropagation()
            setIsExpanded(!isExpanded)
          }}
        >
          {isExpanded ? (
            <>
              <ChevronUp className="size-4 mr-1" />
              Hide Options
            </>
          ) : (
            <>
              <ChevronDown className="size-4 mr-1" />
              {assignedVoice ? 'Change Voice' : 'Assign Voice'}
            </>
          )}
        </Button>

        {/* Expanded Section */}
        {isExpanded && (
          <div
            className="space-y-4 pt-2 border-t"
            onClick={(e) => e.stopPropagation()}
          >
            <VoiceSelector
              recommendedVoices={recommendedVoices}
              allVoices={allVoices}
              selectedVoiceId={assignment?.voiceId}
              assignment={assignment}
              onSelectVoice={(voiceId) => onAssignVoice(speaker.id, voiceId)}
            />

            {assignment && (
              <VoiceCustomizer
                customizations={assignment.customizations}
                onUpdate={(customizations) =>
                  onUpdateCustomization(speaker.id, customizations)
                }
              />
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
