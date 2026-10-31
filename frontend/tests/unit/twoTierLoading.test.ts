import { describe, it, expect, vi, beforeEach } from 'vitest'
import { loadEducationSummaryWithOptions, resetSummaryCache } from '../../src/shared/api/data/sqlite/summary'
import { loadCountyBoundaries, resetAtlasBoundaryCaches } from '../../src/shared/api/data/atlasBoundaries'

describe('Two-Tier Data Model Loading', () => {
  beforeEach(() => {
    resetSummaryCache()
    resetAtlasBoundaryCaches()
    vi.restoreAllMocks()
  })

  it('Tier 1: loadEducationSummaryWithOptions fetches education-summary.json directly without SQLite', async () => {
    const mockSummary = {
      generatedAt: '2026-10-31T00:00:00.000Z',
      years: [111, 112, 113, 114],
      counties: [
        {
          id: '臺北市',
          countyCode: '63000',
          name: '臺北市',
          shortLabel: '北',
          region: '北部',
          detailFile: '臺北市.detail.json',
          bucketFile: '臺北市.bucket.json',
          townshipFile: '臺北市.topo.json',
          towns: [],
          summaries: {},
        },
      ],
      totalStudentsByYear: { 114: 100000 },
      assetMetrics: { summaryBytes: 3500000 },
    }

    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify(mockSummary), {
        status: 200,
        headers: { 'Content-Type': 'application/json', 'Content-Length': '123456' },
      })
    )

    const result = await loadEducationSummaryWithOptions()

    expect(fetchSpy).toHaveBeenCalledTimes(1)
    expect(fetchSpy.mock.calls[0][0]).toContain('education-summary.json')
    expect(result.counties).toHaveLength(1)
    expect(result.counties[0].name).toBe('臺北市')
  })

  it('Tier 1: loadCountyBoundaries fetches counties.topo.json directly without SQLite', async () => {
    const mockTopology = {
      type: 'Topology',
      objects: {
        counties: {
          type: 'GeometryCollection',
          geometries: [
            {
              type: 'Polygon',
              arcs: [[0]],
              properties: { countyId: '臺北市', countyName: '臺北市' },
            },
          ],
        },
      },
      arcs: [[[121, 25], [1, 0], [0, 1], [-1, 0]]],
    }

    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify(mockTopology), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    )

    const result = await loadCountyBoundaries()

    expect(fetchSpy).toHaveBeenCalledTimes(1)
    expect(fetchSpy.mock.calls[0][0]).toContain('counties.topo.json')
    expect(result.type).toBe('FeatureCollection')
  })
})
