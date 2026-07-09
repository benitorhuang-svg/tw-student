import { describe, it, expect } from 'vitest'
import { parseJsonDataResponse, assertBinaryDataResponse } from '../../src/shared/api/data/dataAsset'

describe('dataAsset', () => {
  describe('parseJsonDataResponse', () => {
    it('parses valid JSON response', async () => {
      const response = new Response(JSON.stringify({ success: true }), {
        status: 200,
      })
      const result = await parseJsonDataResponse(response, 'test.json', 'http://localhost/test.json')
      expect(result).toEqual({ success: true })
    })

    it('throws on non-200 status', async () => {
      const response = new Response('Not Found', { status: 404 })
      await expect(
        parseJsonDataResponse(response, 'test.json', 'http://localhost/test.json')
      ).rejects.toThrowError(/無法載入正式資料 \(404\)/)
    })

    it('throws when response looks like HTML document', async () => {
      const html = '<!DOCTYPE html><html><body>Error</body></html>'
      const response = new Response(html, { status: 200 })
      await expect(
        parseJsonDataResponse(response, 'test.json', 'http://localhost/test.json')
      ).rejects.toThrowError(/伺服器回傳了 HTML 而非 JSON/)
    })

    it('throws on invalid JSON syntax', async () => {
      const invalidJson = '{ "broken": true ' // missing closing brace
      const response = new Response(invalidJson, { status: 200 })
      await expect(
        parseJsonDataResponse(response, 'test.json', 'http://localhost/test.json')
      ).rejects.toThrowError(/正式資料 JSON 解析失敗/)
    })
  })

  describe('assertBinaryDataResponse', () => {
    it('passes for successful binary response', async () => {
      const response = new Response(new ArrayBuffer(8), {
        status: 200,
        headers: { 'Content-Type': 'application/octet-stream' }
      })
      await expect(
        assertBinaryDataResponse(response, 'test.sqlite', 'http://localhost/test.sqlite')
      ).resolves.toBeUndefined()
    })

    it('throws when response has text/html content type', async () => {
      const html = '<!DOCTYPE html><html><body>Not Found</body></html>'
      const response = new Response(html, {
        status: 200, // Sometimes CDNs return 200 for 404 pages
        headers: { 'Content-Type': 'text/html' }
      })
      await expect(
        assertBinaryDataResponse(response, 'test.sqlite', 'http://localhost/test.sqlite')
      ).rejects.toThrowError(/伺服器回傳了 HTML 而非資料檔/)
    })
  })
})
