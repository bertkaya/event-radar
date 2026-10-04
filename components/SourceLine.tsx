// Etkinliğin nereden geldiğini ve en son ne zaman doğrulandığını gösterir. Verinin kaynağı gizlenmez.
import { SOURCE_LABELS, SOURCE_TYPE_LABEL } from '@/lib/sources/catalog'
import { timeAgo } from '@/lib/utils'

interface Props {
  event: { primary_source?: string | null; last_verified_at?: string | null; organizer_name?: string | null }
  compact?: boolean
}

export default function SourceLine({ event, compact }: Props) {
  const label = event.primary_source ? SOURCE_LABELS[event.primary_source] : undefined
  const verified = event.last_verified_at ? timeAgo(event.last_verified_at) : null

  if (!label) {
    return compact ? null : <span className="text-[11px] text-gray-400">Kaynak: 18-23 editörleri</span>
  }

  if (compact) {
    return (
      <div className="text-[10px] text-gray-400 truncate" title={`${SOURCE_TYPE_LABEL[label.type]}${verified ? ` · ${verified} doğrulandı` : ''}`}>
        {label.name}{verified ? ` · ${verified}` : ''}
      </div>
    )
  }

  return (
    <span className="text-[11px] text-gray-500 dark:text-gray-400">
      Kaynak: <strong className="font-bold">{label.name}</strong> ({SOURCE_TYPE_LABEL[label.type].toLocaleLowerCase('tr-TR')})
      {event.organizer_name ? <> · Organizatör: {event.organizer_name}</> : null}
      {verified ? <> · Son doğrulama: {verified}</> : null}
    </span>
  )
}
