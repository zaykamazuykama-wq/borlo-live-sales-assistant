'use client'

import { Slider } from '@/components/ui/slider'
import { Button } from '@/components/ui/button'
import { RotateCcw } from 'lucide-react'
import type { VoiceAssignment } from '@/lib/types'

interface VoiceCustomizerProps {
  customizations: VoiceAssignment['customizations']
  onUpdate: (customizations: VoiceAssignment['customizations']) => void
}

export function VoiceCustomizer({
  customizations,
  onUpdate,
}: VoiceCustomizerProps) {
  const handleReset = () => {
    onUpdate({
      pitchAdjustment: 0,
      speedAdjustment: 0,
      volumeAdjustment: 0,
    })
  }

  const hasChanges =
    customizations.pitchAdjustment !== 0 ||
    customizations.speedAdjustment !== 0 ||
    customizations.volumeAdjustment !== 0

  return (
    <div className="space-y-4 rounded-lg border p-4 bg-muted/30">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">Voice Adjustments</p>
        {hasChanges && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleReset}
            className="h-7 px-2 text-xs"
          >
            <RotateCcw className="size-3 mr-1" />
            Reset
          </Button>
        )}
      </div>

      {/* Pitch Adjustment */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-xs text-muted-foreground">Pitch</label>
          <span className="text-xs font-mono text-muted-foreground">
            {customizations.pitchAdjustment > 0 ? '+' : ''}
            {customizations.pitchAdjustment}%
          </span>
        </div>
        <Slider
          value={[customizations.pitchAdjustment]}
          min={-50}
          max={50}
          step={5}
          onValueChange={([value]) =>
            onUpdate({ ...customizations, pitchAdjustment: value })
          }
        />
        <div className="flex justify-between text-xs text-muted-foreground/60">
          <span>Lower</span>
          <span>Higher</span>
        </div>
      </div>

      {/* Speed Adjustment */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-xs text-muted-foreground">Speed</label>
          <span className="text-xs font-mono text-muted-foreground">
            {customizations.speedAdjustment > 0 ? '+' : ''}
            {customizations.speedAdjustment}%
          </span>
        </div>
        <Slider
          value={[customizations.speedAdjustment]}
          min={-50}
          max={50}
          step={5}
          onValueChange={([value]) =>
            onUpdate({ ...customizations, speedAdjustment: value })
          }
        />
        <div className="flex justify-between text-xs text-muted-foreground/60">
          <span>Slower</span>
          <span>Faster</span>
        </div>
      </div>

      {/* Volume Adjustment */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-xs text-muted-foreground">Volume</label>
          <span className="text-xs font-mono text-muted-foreground">
            {customizations.volumeAdjustment > 0 ? '+' : ''}
            {customizations.volumeAdjustment}%
          </span>
        </div>
        <Slider
          value={[customizations.volumeAdjustment]}
          min={-50}
          max={50}
          step={5}
          onValueChange={([value]) =>
            onUpdate({ ...customizations, volumeAdjustment: value })
          }
        />
        <div className="flex justify-between text-xs text-muted-foreground/60">
          <span>Quieter</span>
          <span>Louder</span>
        </div>
      </div>
    </div>
  )
}
