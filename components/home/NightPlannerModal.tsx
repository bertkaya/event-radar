'use client'

import { Moon, Shuffle, X } from 'lucide-react'
import type { Event, SelectableEvent } from '@/lib/types'
import { generateNightPlans, NightPlan } from '@/lib/night_planner'

export interface PlannerInputState {
  city: string
  budget: number
  partyType: 'date' | 'friends' | 'solo' | 'family'
  mood: string
}

interface NightPlannerModalProps {
  show: boolean
  onClose: () => void
  allEvents: Event[]
  plannerInput: PlannerInputState
  setPlannerInput: React.Dispatch<React.SetStateAction<PlannerInputState>>
  nightPlans: NightPlan[]
  setNightPlans: (plans: NightPlan[]) => void
  onEventSelect: (event: SelectableEvent | null) => void
}

export default function NightPlannerModal({
  show,
  onClose,
  allEvents,
  plannerInput,
  setPlannerInput,
  nightPlans,
  setNightPlans,
  onEventSelect,
}: NightPlannerModalProps) {
  if (!show) return null

  return (
    <div className="fixed inset-0 z-[2300] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in">
      <div className="bg-white dark:bg-gray-900 w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden max-h-[88vh] flex flex-col border border-gray-200 dark:border-gray-800">
        <div className="p-5 border-b dark:border-gray-800 bg-gradient-to-r from-red-950 via-gray-900 to-black text-white flex justify-between items-center shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-brand/30 rounded-xl text-brand-light"><Moon size={22} /></div>
            <div>
              <h3 className="font-black text-lg tracking-tight">BU AKŞAMI PLANLA (NIGHT PLANNER)</h3>
              <p className="text-xs text-gray-400">Yemekten etkinliğe ve gece kapanışına kadar eksiksiz rota</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-white"><X size={22} /></button>
        </div>

        {/* Planner Inputs Bar */}
        <div className="p-4 bg-gray-50 dark:bg-gray-800/60 border-b dark:border-gray-800 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-1.5 font-bold text-gray-600 dark:text-gray-300">
            <span>Kiminle:</span>
            <div className="flex bg-white dark:bg-gray-900 p-1 rounded-lg border border-gray-200 dark:border-gray-700">
              {(['date', 'friends', 'solo', 'family'] as const).map(type => (
                <button
                  key={type}
                  onClick={() => {
                    setPlannerInput(prev => ({ ...prev, partyType: type }))
                    setNightPlans(generateNightPlans(allEvents, { ...plannerInput, partyType: type }))
                  }}
                  className={`px-2.5 py-1 rounded-md capitalize font-bold transition ${plannerInput.partyType === type ? 'bg-brand text-white' : 'text-gray-500'}`}
                >
                  {type === 'date' ? 'Date 🍷' : type === 'friends' ? 'Arkadaşlar 🍻' : type === 'solo' ? 'Yalnız 🎒' : 'Ailece 👨‍👩‍👧'}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={() => setNightPlans(generateNightPlans(allEvents, plannerInput))}
            className="bg-brand text-white font-bold px-3 py-1.5 rounded-lg text-xs hover:bg-brand-dark transition flex items-center gap-1 shadow-sm"
          >
            <Shuffle size={13} /> Farklı Plan Üret
          </button>
        </div>

        {/* Generated Itineraries */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 bg-white dark:bg-gray-900">
          {nightPlans.map((plan) => (
            <div key={plan.id} className="bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-gray-200 dark:border-gray-700/80 p-5 shadow-sm space-y-4">
              <div className="flex flex-wrap justify-between items-start gap-2 border-b dark:border-gray-700/80 pb-3">
                <div>
                  <span className="text-[10px] font-black uppercase text-brand tracking-wider bg-brand/10 px-2 py-0.5 rounded-full">{plan.mood}</span>
                  <h4 className="font-black text-lg text-gray-900 dark:text-white mt-1 leading-snug">{plan.planTitle}</h4>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{plan.tagline}</p>
                </div>
                <div className="text-right">
                  <div className="text-xs font-black text-brand">{plan.totalEstimatedCost}</div>
                  <div className="text-[11px] text-gray-400">⏱️ Toplam ~{plan.totalDurationHours} Saat</div>
                </div>
              </div>

              {/* Steps Timeline */}
              <div className="space-y-4 relative before:absolute before:left-3 before:top-2 before:bottom-2 before:w-0.5 before:bg-gray-200 dark:before:bg-gray-700">
                {plan.steps.map((step, sIdx) => (
                  <div key={sIdx} className="relative pl-8 flex flex-col gap-1">
                    <div className={`absolute left-1.5 top-1 -translate-x-1/2 w-3.5 h-3.5 rounded-full border-2 border-white dark:border-gray-900 ${step.isMainEvent ? 'bg-brand ring-4 ring-brand/20' : 'bg-gray-400 dark:bg-gray-600'}`} />
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-black text-brand">{step.time}</span>
                      <span className="text-[11px] font-bold text-gray-400 bg-white dark:bg-gray-800 px-2 py-0.5 rounded border border-gray-100 dark:border-gray-700">{step.estimatedCost}</span>
                    </div>
                    <div className="font-bold text-sm text-gray-900 dark:text-white flex items-center gap-1.5">
                      {step.isMainEvent ? '🎟️' : step.type === 'dinner' ? '🍽️' : step.type === 'coffee' ? '☕' : '🍸'} {step.title}
                    </div>
                    <div className="text-xs text-gray-500 font-medium">📍 {step.placeName}</div>
                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5 leading-relaxed">{step.description}</p>
                    {step.isMainEvent && step.eventRef && (
                      <div className="mt-2 flex gap-2">
                        <button
                          onClick={() => {
                            onClose()
                            onEventSelect(step.eventRef ?? null)
                          }}
                          className="text-xs bg-brand text-white font-bold px-3 py-1.5 rounded-lg hover:bg-brand-dark transition"
                        >
                          Etkinlik Detaylarını Gör
                        </button>
                        {step.eventRef.ticket_url && (
                          <a
                            href={step.eventRef.ticket_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 font-bold px-3 py-1.5 rounded-lg hover:bg-gray-200 transition"
                          >
                            Doğrudan Bilet Al
                          </a>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
