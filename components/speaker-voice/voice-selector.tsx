'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Star, Check, Sparkles, Hand } from 'lucide-react'
import type { MongolianVoice, VoiceAssignment } from '@/lib/types'
import { cn } from '@/lib/utils'

interface VoiceSelectorProps {
  recommendedVoices: { voice: MongolianVoice; score: number }[]
  allVoices: MongolianVoice[]
  selectedVoiceId?: string
  assignment?: VoiceAssignment
  onSelectVoice: (voiceId: string) => void
}

const genderLabels: Record<string, string> = {
  male: 'Male',
  female: 'Female',
  neutral: 'Neutral',
}

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={cn(
            'size-3',
            star <= rating
              ? 'fill-amber-400 text-amber-400'
              : 'text-muted-foreground/30'
          )}
        />
      ))}
    </div>
  )
}

function getAssignmentStateLabel(
  voiceId: string,
  selectedVoiceId?: string,
  assignment?: VoiceAssignment,
  bestMatchVoiceId?: string
): { label: string; variant: 'best' | 'selected' | 'manual' } | null {
  if (selectedVoiceId !== voiceId) return null
  
  if (!assignment) return { label: 'Selected', variant: 'selected' }
  
  if (assignment.assignmentType === 'auto') {
    return { label: 'Best Match', variant: 'best' }
  }
  
  // Manual assignment
  if (bestMatchVoiceId && bestMatchVoiceId !== voiceId) {
    return { label: 'Manual Override', variant: 'manual' }
  }
  
  return { label: 'Selected', variant: 'selected' }
}

export function VoiceSelector({
  recommendedVoices,
  allVoices,
  selectedVoiceId,
  assignment,
  onSelectVoice,
}: VoiceSelectorProps) {
  const [showAllVoices, setShowAllVoices] = useState(false)
  
  const bestMatchVoiceId = recommendedVoices[0]?.voice.id

  return (
    <div className="space-y-3">
      {/* Recommended Voices */}
      <div>
        <p className="text-xs font-medium text-muted-foreground mb-2">
          Recommended Voices
        </p>
        <div className="space-y-2">
          {recommendedVoices.slice(0, 3).map(({ voice, score }, index) => {
            const stateLabel = getAssignmentStateLabel(
              voice.id,
              selectedVoiceId,
              assignment,
              bestMatchVoiceId
            )
            const isSelected = selectedVoiceId === voice.id
            const isBestMatch = index === 0
            
            return (
            <button
              key={voice.id}
              onClick={() => onSelectVoice(voice.id)}
              className={cn(
                'w-full flex items-center justify-between p-2.5 rounded-lg border transition-all text-left',
                isSelected
                  ? 'border-primary bg-primary/5 ring-2 ring-primary shadow-sm'
                  : 'border-border hover:border-primary/50 hover:bg-muted/50'
              )}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm">{voice.name}</span>
                  <span className="text-xs text-muted-foreground">
                    ({voice.nameInMongolian})
                  </span>
                  {isBestMatch && !isSelected && (
                    <Badge variant="outline" className="text-xs py-0 px-1.5 border-emerald-500/50 text-emerald-600 bg-emerald-50">
                      <Sparkles className="size-3 mr-1" />
                      Best
                    </Badge>
                  )}
                  {stateLabel && (
                    <Badge 
                      variant={stateLabel.variant === 'manual' ? 'secondary' : 'default'}
                      className={cn(
                        'text-xs py-0 px-1.5 ml-auto shrink-0',
                        stateLabel.variant === 'best' && 'bg-emerald-600 hover:bg-emerald-600',
                        stateLabel.variant === 'selected' && 'bg-primary',
                        stateLabel.variant === 'manual' && 'bg-amber-100 text-amber-700 border-amber-300'
                      )}
                    >
                      {stateLabel.variant === 'best' && <Sparkles className="size-3 mr-1" />}
                      {stateLabel.variant === 'manual' && <Hand className="size-3 mr-1" />}
                      {stateLabel.variant === 'selected' && <Check className="size-3 mr-1" />}
                      {stateLabel.label}
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="outline" className="text-xs py-0">
                    {genderLabels[voice.gender]}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {voice.description}
                  </span>
                </div>
                <div className="flex items-center gap-3 mt-1.5">
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-muted-foreground">Natural:</span>
                    <StarRating rating={voice.naturalness} />
                  </div>
                </div>
              </div>
              <div className="ml-3 text-right shrink-0">
                <span
                  className={cn(
                    'text-sm font-semibold',
                    score >= 80
                      ? 'text-emerald-600'
                      : score >= 60
                        ? 'text-amber-600'
                        : 'text-muted-foreground'
                  )}
                >
                  {Math.round(score)}%
                </span>
                <p className="text-xs text-muted-foreground">match</p>
              </div>
            </button>
          )
          })}
        </div>
      </div>

      {/* Toggle to show all voices */}
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowAllVoices(!showAllVoices)}
          className="text-xs"
        >
          {showAllVoices ? 'Hide All Voices' : 'Browse All Voices'}
        </Button>
      </div>

      {/* All Voices Dropdown */}
      {showAllVoices && (
        <div>
          <Select value={selectedVoiceId} onValueChange={onSelectVoice}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select a voice..." />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectLabel>Male Voices</SelectLabel>
                {allVoices
                  .filter((v) => v.gender === 'male')
                  .map((voice) => (
                    <SelectItem key={voice.id} value={voice.id}>
                      <div className="flex items-center gap-2">
                        <span>{voice.name}</span>
                        <span className="text-muted-foreground text-xs">
                          {voice.nameInMongolian}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
              </SelectGroup>
              <SelectGroup>
                <SelectLabel>Female Voices</SelectLabel>
                {allVoices
                  .filter((v) => v.gender === 'female')
                  .map((voice) => (
                    <SelectItem key={voice.id} value={voice.id}>
                      <div className="flex items-center gap-2">
                        <span>{voice.name}</span>
                        <span className="text-muted-foreground text-xs">
                          {voice.nameInMongolian}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
              </SelectGroup>
              <SelectGroup>
                <SelectLabel>Child/Neutral Voices</SelectLabel>
                {allVoices
                  .filter((v) => v.gender === 'neutral' || v.ageRange === 'child')
                  .map((voice) => (
                    <SelectItem key={voice.id} value={voice.id}>
                      <div className="flex items-center gap-2">
                        <span>{voice.name}</span>
                        <span className="text-muted-foreground text-xs">
                          {voice.nameInMongolian}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>
      )}
    </div>
  )
}
