'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import {
  CheckCircle2,
  AlertTriangle,
  Clock,
  Gauge,
  ArrowUp,
  ArrowDown,
  Layers,
} from 'lucide-react'
import type { AlignmentSummary as AlignmentSummaryType } from '@/lib/dubbing'
import { cn } from '@/lib/utils'

interface AlignmentSummaryProps {
  summary: AlignmentSummaryType
  completedCount: number
  className?: string
}

export function AlignmentSummary({
  summary,
  completedCount,
  className,
}: AlignmentSummaryProps) {
  const totalIssues = summary.needsCompressionCount + summary.needsExtensionCount + summary.overlapCount
  const healthScore = summary.totalSegments > 0
    ? Math.round(((summary.alignedCount + (summary.gapCount * 0.5)) / summary.totalSegments) * 100)
    : 100
  
  const completionPercent = summary.totalSegments > 0
    ? Math.round((completedCount / summary.totalSegments) * 100)
    : 0

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Layers className="size-4" />
          Timeline Alignment
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Overall Progress */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Generation Progress</span>
            <span className="font-medium">{completedCount}/{summary.totalSegments}</span>
          </div>
          <Progress value={completionPercent} className="h-2" />
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3">
          {/* Aligned */}
          <div className="flex items-center gap-2 p-2 rounded-lg bg-emerald-50 border border-emerald-100">
            <CheckCircle2 className="size-4 text-emerald-600" />
            <div>
              <p className="text-xs text-emerald-600">Aligned</p>
              <p className="text-sm font-semibold text-emerald-700">{summary.alignedCount}</p>
            </div>
          </div>

          {/* Needs Compression */}
          <div className="flex items-center gap-2 p-2 rounded-lg bg-amber-50 border border-amber-100">
            <ArrowUp className="size-4 text-amber-600" />
            <div>
              <p className="text-xs text-amber-600">Speed Up</p>
              <p className="text-sm font-semibold text-amber-700">{summary.needsCompressionCount}</p>
            </div>
          </div>

          {/* Needs Extension */}
          <div className="flex items-center gap-2 p-2 rounded-lg bg-blue-50 border border-blue-100">
            <ArrowDown className="size-4 text-blue-600" />
            <div>
              <p className="text-xs text-blue-600">Slow Down</p>
              <p className="text-sm font-semibold text-blue-700">{summary.needsExtensionCount}</p>
            </div>
          </div>

          {/* Overlaps */}
          <div className={cn(
            'flex items-center gap-2 p-2 rounded-lg border',
            summary.overlapCount > 0 
              ? 'bg-red-50 border-red-100' 
              : 'bg-muted/30 border-border'
          )}>
            <AlertTriangle className={cn(
              'size-4',
              summary.overlapCount > 0 ? 'text-red-600' : 'text-muted-foreground'
            )} />
            <div>
              <p className={cn(
                'text-xs',
                summary.overlapCount > 0 ? 'text-red-600' : 'text-muted-foreground'
              )}>Overlaps</p>
              <p className={cn(
                'text-sm font-semibold',
                summary.overlapCount > 0 ? 'text-red-700' : 'text-muted-foreground'
              )}>{summary.overlapCount}</p>
            </div>
          </div>
        </div>

        {/* Average Speed */}
        <div className="flex items-center justify-between p-2 rounded-lg bg-muted/30">
          <div className="flex items-center gap-2">
            <Gauge className="size-4 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Average Speed</span>
          </div>
          <span className={cn(
            'text-sm font-medium',
            summary.averageSpeedAdjustment > 1.1 && 'text-amber-600',
            summary.averageSpeedAdjustment < 0.9 && 'text-blue-600'
          )}>
            {(summary.averageSpeedAdjustment * 100).toFixed(0)}%
          </span>
        </div>

        {/* Health Score */}
        <div className="pt-2 border-t">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Alignment Health</span>
            <span className={cn(
              'text-sm font-bold',
              healthScore >= 80 && 'text-emerald-600',
              healthScore >= 50 && healthScore < 80 && 'text-amber-600',
              healthScore < 50 && 'text-red-600'
            )}>
              {healthScore}%
            </span>
          </div>
          <Progress 
            value={healthScore} 
            className={cn(
              'h-1.5 mt-1',
              healthScore >= 80 && '[&>div]:bg-emerald-500',
              healthScore >= 50 && healthScore < 80 && '[&>div]:bg-amber-500',
              healthScore < 50 && '[&>div]:bg-red-500'
            )}
          />
        </div>

        {/* Warnings count */}
        {summary.totalWarnings > 0 && (
          <p className="text-xs text-amber-600 flex items-center gap-1">
            <AlertTriangle className="size-3" />
            {summary.totalWarnings} warning{summary.totalWarnings !== 1 ? 's' : ''} to review
          </p>
        )}
      </CardContent>
    </Card>
  )
}
