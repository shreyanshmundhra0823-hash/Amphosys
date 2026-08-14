import { useEffect, useMemo, useState } from 'react'
import { CheckCircle2, RotateCcw, Sparkles, XCircle } from 'lucide-react'
import { Button } from '@/components/Button'
import { Card } from '@/components/Card'
import { EmptyState } from '@/components/EmptyState'
import { LoadingState } from '@/components/LoadingState'
import { PageHeader } from '@/components/PageHeader'
import { useStudyMaterials } from '@/hooks/useStudyMaterials'
import { getOrCreateDocument } from '@/db/documents'
import { answerQuestion, getQuestionStats, listQuestions, questionsFromBlocks, saveQuestions } from '@/db/revision'
import type { RevisionQuestion } from '@/types/revision'

export function Revision() {
  const { materials, isLoading } = useStudyMaterials({ sort: 'updatedAt' })
  const [materialId, setMaterialId] = useState('')
  const [questions, setQuestions] = useState<RevisionQuestion[]>([])
  const [index, setIndex] = useState(0)
  const [answer, setAnswer] = useState('')
  const [showAnswer, setShowAnswer] = useState(false)
  const [stats, setStats] = useState({ total: 0, correct: 0, accuracy: 0 })
  const current = questions[index]

  useEffect(() => { if (!materialId && materials?.[0]) setMaterialId(materials[0].id) }, [materials, materialId])
  useEffect(() => { if (!materialId) return; listQuestions(materialId).then(setQuestions); getQuestionStats(materialId).then(setStats) }, [materialId])

  const material = useMemo(() => materials?.find((m) => m.id === materialId), [materials, materialId])

  const generate = async () => {
    if (!material) return
    const doc = await getOrCreateDocument(material.id, material.title)
    const generated = questionsFromBlocks(material.id, doc.sections.flatMap((s) => s.blocks))
    await saveQuestions(generated)
    setQuestions(generated)
    setIndex(0); setAnswer(''); setShowAnswer(false)
  }

  const submit = async (isCorrect: boolean) => {
    if (!current || !material) return
    await answerQuestion({ questionId: current.id, studyMaterialId: material.id, givenAnswer: answer, isCorrect })
    const nextStats = await getQuestionStats(material.id)
    setStats(nextStats); setShowAnswer(true)
  }

  if (isLoading) return <LoadingState label="Loading revision…" />
  if (!materials?.length) return <EmptyState icon={RotateCcw} title="Nothing to revise yet" description="Create study material first, then generate recall questions from your editable notes." />

  return <div>
    <PageHeader title="Revision" subtitle="Active recall, answer checking and weak-topic tracking — stored locally." />
    <div className="grid gap-5 lg:grid-cols-[260px_1fr]">
      <Card className="p-4 h-fit">
        <label className="text-xs font-semibold uppercase tracking-wide text-ink/50 dark:text-paper/50">Study material</label>
        <select value={materialId} onChange={(e) => setMaterialId(e.target.value)} className="mt-2 h-11 w-full rounded-lg border border-ink/15 bg-white px-3 text-sm dark:border-paper/15 dark:bg-white/[0.03] dark:text-paper">
          {materials.map((m) => <option key={m.id} value={m.id}>{m.title}</option>)}
        </select>
        <Button className="mt-3 w-full" onClick={generate}><Sparkles className="h-4 w-4" /> Generate recall set</Button>
        <div className="mt-5 border-t border-ink/10 pt-4 text-sm dark:border-paper/10"><div className="flex justify-between"><span>Answered</span><b>{stats.total}</b></div><div className="flex justify-between"><span>Accuracy</span><b>{stats.accuracy}%</b></div></div>
      </Card>
      <Card className="p-6">
        {!current ? <div className="py-10 text-center text-sm text-ink/60 dark:text-paper/60">Generate a recall set from this material to begin.</div> : <>
          <div className="mb-4 flex items-center justify-between text-xs text-ink/50 dark:text-paper/50"><span>Question {index + 1} / {questions.length}</span><span>{current.category ?? current.round}</span></div>
          <h2 className="text-xl font-semibold text-ink dark:text-paper">{current.prompt}</h2>
          <textarea value={answer} onChange={(e) => setAnswer(e.target.value)} placeholder="Type your answer…" className="mt-5 min-h-32 w-full rounded-xl border border-ink/15 bg-white p-4 text-sm outline-none focus:border-brand-500 dark:border-paper/15 dark:bg-white/[0.03] dark:text-paper" />
          {showAnswer && <div className="mt-4 rounded-xl border border-brand-500/20 bg-brand-50 p-4 text-sm dark:bg-brand-500/10"><b>Reference answer:</b><div className="mt-1 whitespace-pre-wrap">{current.answer}</div></div>}
          <div className="mt-5 flex flex-wrap gap-2">
            <Button variant="secondary" onClick={() => submit(false)}><XCircle className="h-4 w-4" /> Incorrect</Button>
            <Button onClick={() => submit(true)}><CheckCircle2 className="h-4 w-4" /> Correct</Button>
            {showAnswer && <Button variant="secondary" onClick={() => { setIndex((i) => (i + 1) % questions.length); setAnswer(''); setShowAnswer(false) }}>Next</Button>}
          </div>
        </>}
      </Card>
    </div>
  </div>
}
