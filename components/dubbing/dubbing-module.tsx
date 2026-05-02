'use client'

import { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Play,
  PlayCircle,
  FileJson,
  ArrowLeft,
  Loader2,
  CheckCircle2,
  Download,
  FileText,
} from 'lucide-react'
import { useDubbing } from './dubbing-context'
import { SegmentCard } from './segment-card'
import { AlignmentSummary } from './alignment-summary'
import { SpeakerPanel } from './speaker-panel'
import { downloadManifest, downloadSubtitles, generateSubtitles } from '@/lib/dubbing'
import { cn } from '@/lib/utils'

interface DubbingModuleProps {
  onBack?: () => void
}

export function DubbingModule({ onBack }: DubbingModuleProps) {
  const {
    state,
    generatePreview,
    generateAll,
    updateSegmentSettings,
    buildExport,
  } = useDubbing()

  const [expandedSegmentId, setExpandedSegmentId] = useState<string | null>(null)
  const [filterSpeaker, setFilterSpeaker] = useState<string | null>(null)

  // Get voices map for quick lookup
  const voicesMap = useMemo(() => {
    const map = new Map<string, typeof state.input extends { voices: infer V } ? V[number] : never>()
    state.input?.voices.forEach((v) => map.set(v.id, v))
    return map
  }, [state.input?.voices])

  // Get speakers map
  const speakersMap = useMemo(() => {
    const map = new Map<string, typeof state.input extends { speakers: infer S } ? S[number] : never>()
    state.input?.speakers.forEach((s) => map.set(s.id, s))
    return map
  }, [state.input?.speakers])

  // Filter segments by speaker
  const filteredSegments = useMemo(() => {
    if (!filterSpeaker) return state.segments
    return state.segments.filter((s) => s.speakerId === filterSpeaker)
  }, [state.segments, filterSpeaker])

  // Count completed
  const completedCount = state.segments.filter((s) => s.status === 'completed').length
  const allCompleted = completedCount === state.segments.length && state.segments.length > 0

  const handleGenerateAll = async () => {
    await generateAll()
  }

  const handleExportConfig = () => {
    const pkg = buildExport()
    if (pkg) {
      downloadManifest(pkg.manifest, 'dubbing-config.json')
    }
  }

  const handleExportSubtitles = () => {
    if (state.segments.length > 0) {
      const srt = generateSubtitles(state.segments, 'srt')
      downloadSubtitles(srt, 'srt', 'mongolian-subtitles.srt')
    }
  }

  if (!state.isInitialized) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4">
          <Loader2 className="size-8 animate-spin mx-auto text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Initializing dubbing pipeline...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          {onBack && (
            <Button variant="ghost" size="sm" onClick={onBack}>
              <ArrowLeft className="size-4 mr-2" />
              Back to Voice Assignment
            </Button>
          )}
          <div>
            <h2 className="text-xl font-semibold">Step 5: Dubbing</h2>
            <p className="text-sm text-muted-foreground">
              Review segments, generate audio, and export your dubbed content
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant={allCompleted ? 'default' : 'secondary'} className={cn(
            'text-sm',
            allCompleted && 'bg-emerald-600'
          )}>
            {allCompleted ? (
              <>
                <CheckCircle2 className="size-3 mr-1" />
                All Generated
              </>
            ) : (
              `${completedCount}/${state.segments.length} generated`
            )}
          </Badge>
        </div>
      </div>

      {/* Main Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left Sidebar */}
        <div className="lg:col-span-1 space-y-4">
          {/* Alignment Summary */}
          {state.alignmentSummary && (
            <AlignmentSummary
              summary={state.alignmentSummary}
              completedCount={completedCount}
            />
          )}

          {/* Speaker Panel */}
          {state.input && (
            <SpeakerPanel
              speakers={state.input.speakers}
              voices={state.input.voices}
              assignments={state.input.assignments}
              segments={state.segments}
            />
          )}

          {/* Filter by Speaker */}
          {state.input && state.input.speakers.length > 1 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Filter by Speaker</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button
                  variant={filterSpeaker === null ? 'default' : 'outline'}
                  size="sm"
                  className="w-full justify-start"
                  onClick={() => setFilterSpeaker(null)}
                >
                  All Speakers
                </Button>
                {state.input.speakers.map((speaker) => (
                  <Button
                    key={speaker.id}
                    variant={filterSpeaker === speaker.id ? 'default' : 'outline'}
                    size="sm"
                    className="w-full justify-start"
                    onClick={() => setFilterSpeaker(speaker.id)}
                  >
                    {speaker.label}
                  </Button>
                ))}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Main Content - Segment List */}
        <div className="lg:col-span-3 space-y-4">
          {/* Action Buttons */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Button
                    onClick={handleGenerateAll}
                    disabled={state.isProcessing || allCompleted}
                  >
                    {state.isProcessing ? (
                      <>
                        <Loader2 className="size-4 mr-2 animate-spin" />
                        Generating...
                      </>
                    ) : allCompleted ? (
                      <>
                        <CheckCircle2 className="size-4 mr-2" />
                        All Generated
                      </>
                    ) : (
                      <>
                        <PlayCircle className="size-4 mr-2" />
                        Generate All Previews
                      </>
                    )}
                  </Button>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    onClick={handleExportSubtitles}
                    disabled={state.segments.length === 0}
                  >
                    <FileText className="size-4 mr-2" />
                    Export Subtitles
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleExportConfig}
                    disabled={state.segments.length === 0}
                  >
                    <FileJson className="size-4 mr-2" />
                    Export Config
                  </Button>
                  <Button
                    disabled={!allCompleted}
                    className={cn(allCompleted && 'bg-emerald-600 hover:bg-emerald-700')}
                  >
                    <Download className="size-4 mr-2" />
                    Export Dubbed Audio
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Segment List */}
          <div className="space-y-3">
            {filteredSegments.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <p className="text-muted-foreground">No segments found</p>
                </CardContent>
              </Card>
            ) : (
              filteredSegments.map((segment) => (
                <SegmentCard
                  key={segment.id}
                  segment={segment}
                  speaker={speakersMap.get(segment.speakerId)}
                  voice={voicesMap.get(segment.voiceId)}
                  onGeneratePreview={generatePreview}
                  onUpdateSettings={updateSegmentSettings}
                  isExpanded={expandedSegmentId === segment.id}
                  onToggleExpand={() =>
                    setExpandedSegmentId(
                      expandedSegmentId === segment.id ? null : segment.id
                    )
                  }
                />
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
