export type { SchoolMapPoint } from '@/shared/lib/atlas'

export type ObservedCountyResource = {
  id: string
  name: string
  detailBytes: number
  bucketBytes: number
  townshipBytes: number
  hasBucketSlice: boolean
  hasTownshipSlice: boolean
}
