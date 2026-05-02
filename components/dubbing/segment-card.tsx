'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Slider } from '@/components/ui/slider'
import {
  Play,
  Pause,
  RefreshCw,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  ChevronDown,
  ChevronUp,
  Gauge,
} from 'lucide-react'
import type { DubbingSegment, Speaker, MongolianVoice } from '@/lib/dubbing'
import { cn } from '@/lib/utils'

interface SegmentCardProps {
  segment: DubbingSegment
  speaker?: Speaker
  voice?: MongolianVoice
  onGeneratePreview: (segmentId: string) => void
  onUpdateSettings?: (
    segmentId: string,
    updates: Partial<Pick<DubbingSegment, 'voiceSettings' | 'emotion' | 'deliveryNotes'>>
  ) => void
  isExpanded?: boolean
  onToggleExpand?: () => void
}

const statusConfig: Record<
  DubbingSegment['status'],
  { label: string; color: string; icon: React.ComponentType<{ className?: string }> }
> = {
  pending: { label: 'Pending', color: 'bg-muted text-muted-foreground', icon: Clock },
  queued: { label: 'Queued', color: 'bg-blue-100 text-blue-700', icon: Clock },
  generating: { label: 'Generating', color: 'bg-amber-100 text-amber-700', icon: Loader2 },
  completed: { label: 'Ready', color: 'bg-emerald-100 text-emerald-700', icon: CheckCircle2 },
  failed: { label: 'Failed', color: 'bg-red-100 text-red-700', icon: AlertTriangle },
  skipped: { label: 'Skipped', color: 'bg-muted text-muted-foreground', icon: Clock },
}

const alignmentStatusConfig: Record<
  DubbingSegment['alignment']['status'],
  { label: string; color: string }
> = {
  pending: { label: 'Pending', color: 'text-muted-foreground' },
  aligned: { label: 'Aligned', color: 'text-emerald-600' },
  'needs-compression': { label: 'Needs Speed Up', color: 'text-amber-600' },
  'needs-extension': { label: 'Needs Slow Down', color: 'text-blue-600' },
  'overlap-detected': { label: 'Overlap', color: 'text-red-600' },
  'gap-detected': { label: 'Gap', color: 'text-amber-600' },
}

const emotionLabels: Record<string, string> = {
  neutral: 'Neutral',
  happy: 'Happy',
  sad: 'Sad',
  angry: 'Angry',
  excited: 'Excited',
  thoughtful: 'Thoughtful',
}

export function SegmentCard({
  segment,
  speaker,
  voice,
  onGeneratePreview,
  onUpdateSettings,
  isExpanded = false,
  onToggleExpand,
}: SegmentCardProps) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [localSpeed, setLocalSpeed] = useState(segment.voiceSettings.speed)

  const status = statusConfig[segment.status]
  const StatusIcon = status.icon
  const alignmentStatus = alignmentStatusConfig[segment.alignment.status]

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    const ms = Math.round((seconds % 1) * 100)
    return `${mins}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`
  }

  const handlePlay = () => {
    if (segment.audioUrl) {
      setIsPlaying(!isPlaying)
      // In real implementation, this would control audio playback
      if (!isPlaying) {
        setTimeout(() => setIsPlaying(false), 2000)
      }
    }
  }

  const handleSpeedChange = (value: number[]) => {
    const newSpeed = value[0]
    setLocalSpeed(newSpeed)
    onUpdateSettings?.(segment.id, {
      voiceSettings: { ...segment.voiceSettings, speed: newSpeed },
    })
  }

  return (
    <Card className={cn(
      'transition-all',
      segment.alignment.status === 'overlap-detected' && 'border-red-300',
      segment.status === 'completed' && 'border-emerald-200 bg-emerald-50/30'
    )}>
      <CardContent className="p-4">
        {/* Header Row */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            {/* Segment Info */}
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-mono text-muted-foreground">
                #{segment.segmentIndex + 1}
              </span>
              <Badge variant="outline" className="text-xs">
                {speaker?.label || 'Unknown Speaker'}
              </Badge>
              <Badge className={cn('text-xs', status.color)}>
                <StatusIcon className={cn(
                  'size-3 mr-1',
                  segment.status === 'generating' && 'animate-spin'
                )} />
                {status.label}
              </Badge>
            </div>

            {/* Timing */}
            <div className="flex items-center gap-3 text-xs text-muted-foreground mb-2">
              <span className="flex items-center gap-1">
                <Clock className="size-3" />
                {formatTime(segment.timing.originalStart)} - {formatTime(segment.timing.originalEnd)}
              </span>
              <span className={alignmentStatus.color}>
                {alignmentStatus.label}
              </span>
              {segment.alignment.suggestedSpeed !== 1 && (
                <span className="flex items-center gap-1">
                  <Gauge className="size-3" />
                  {(segment.alignment.suggestedSpeed * 100).toFixed(0)}% speed
                </span>
              )}
            </div>

            {/* Translated Text */}
            <p className="text-sm text-foreground leading-relaxed">
              {segment.translatedText}
            </p>

            {/* Original Text (smaller) */}
            <p className="text-xs text-muted-foreground mt-1 italic">
              {segment.originalText}
            </p>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 shrink-0">
            {segment.status === 'completed' && segment.audioUrl && (
              <Button
                variant="outline"
                size="sm"
                onClick={handlePlay}
              >
                {isPlaying ? (
                  <Pause className="size-4" />
                ) : (
                  <Play className="size-4" />
                )}
              </Button>
            )}
            <Button
              variant={segment.status === 'completed' ? 'outline' : 'default'}
              size="sm"
              onClick={() => onGeneratePreview(segment.id)}
              disabled={segment.status === 'generating' || segment.status === 'queued'}
            >
              {segment.status === 'generating' ? (
                <Loader2 className="size-4 animate-spin" />
              ) : segment.status === 'completed' ? (
                <RefreshCw className="size-4" />
              ) : (
                'Generate'
              )}
            </Button>
            {onToggleExpand && (
              <Button variant="ghost" size="sm" onClick={onToggleExpand}>
                {isExpanded ? (
                  <ChevronUp className="size-4" />
                ) : (
                  <ChevronDown className="size-4" />
                )}
              </Button>
            )}
          </div>
        </div>

        {/* Expanded Settings */}
        {isExpanded && (
          <div className="mt-4 pt-4 border-t space-y-4">
            {/* Voice Info */}
            {voice && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Voice:</span>
                <span className="text-sm font-medium">{voice.name}</span>
                <span className="text-xs text-muted-foreground">
                  ({voice.nameInMongolian})
                </span>
              </div>
            )}

            {/* Emotion */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Emotion:</span>
              <Badge variant="secondary" className="text-xs">
                {emotionLabels[segment.emotion] || segment.emotion}
              </Badge>
            </div>

            {/* Speed Adjustment */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Speed Adjustment</span>
                <span className="text-xs font-medium">{(localSpeed * 100).toFixed(0)}%</span>
              </div>
              <Slider
                value={[localSpeed]}
                min={0.5}
                max={2}
                step={0.05}
                onValueChange={handleSpeedChange}
              />
            </div>

            {/* Warnings */}
            {segment.alignment.warnings.length > 0 && (
              <div className="space-y-1">
                <span className="text-xs text-muted-foreground">Warnings:</span>
                {segment.alignment.warnings.map((warning, idx) => (
                  <p key={idx} className="text-xs text-amber-600 flex items-center gap-1">
                    <AlertTriangle className="size-3" />
                    {warning}
                  </p>
                ))}
              </div>
            )}

            {/* Error */}
            {segment.error && (
              <p className="text-xs text-red-600 flex items-center gap-1">
                <AlertTriangle className="size-3" />
                {segment.error}
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
