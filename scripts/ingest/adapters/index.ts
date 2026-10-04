// Etkin kaynak adaptörleri. Yeni kaynak: adaptörü buraya ekleyin ve katalogda decision: 'integrated' yapın.
import type { SourceAdapter } from '../types'
import { BugeceAdapter } from './bugece'
import { IzmirAdapter } from './izmir'
import { KulturIstanbulAdapter } from './kulturIstanbul'

export const ADAPTERS: SourceAdapter[] = [BugeceAdapter, IzmirAdapter, KulturIstanbulAdapter]
