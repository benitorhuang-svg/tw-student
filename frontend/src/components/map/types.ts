export type ObservedCountyResource = {
  id: string
  name: string
  detailBytes: number
  bucketBytes: number
  townshipBytes: number
  hasBucketSlice: boolean
  hasTownshipSlice: boolean
}

export type SchoolMapPoint = {
  id: string
  name: string
  townshipName: string
  educationLevel: string
  managementType: string
  status: string
  currentStudents: number
  delta: number
  latitude: number
  longitude: number
  website?: string
}