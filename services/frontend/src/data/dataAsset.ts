const DATA_BASE_URL = import.meta.env.BASE_URL.replace(/\/$/, '')

function normalizeRelativePath(relativePath: string) {
  return relativePath.replace(/^\/+/, '')
}

export function buildDataAssetUrl(relativePath: string, forceRefresh = false) {
  const normalizedPath = normalizeRelativePath(relativePath)
  const baseUrl = `${DATA_BASE_URL}/data/${normalizedPath}`
  return forceRefresh ? `${baseUrl}?refresh=${Date.now()}` : baseUrl
}

function buildDataAssetError(message: string, relativePath: string, url: string, preview?: string) {
  const detail = preview ? `，回應片段：${preview}` : ''
  return new Error(`${message}：${relativePath} (${url})${detail}`)
}

function looksLikeHtmlDocument(text: string) {
  const normalized = text.trimStart().slice(0, 120).toLowerCase()
  return normalized.startsWith('<!doctype html') || normalized.startsWith('<html')
}

export async function parseJsonDataResponse<T>(response: Response, relativePath: string, url: string) {
  if (!response.ok) {
    throw buildDataAssetError(`無法載入正式資料 (${response.status})`, relativePath, url)
  }

  const text = await response.text()
  if (looksLikeHtmlDocument(text)) {
    throw buildDataAssetError('正式資料路徑錯誤，伺服器回傳了 HTML 而非 JSON', relativePath, url, text.trim().slice(0, 80).replace(/\s+/g, ' '))
  }

  try {
    return JSON.parse(text) as T
  } catch {
    throw buildDataAssetError('正式資料 JSON 解析失敗', relativePath, url, text.trim().slice(0, 80).replace(/\s+/g, ' '))
  }
}

export async function assertBinaryDataResponse(response: Response, relativePath: string, url: string) {
  if (!response.ok) {
    throw buildDataAssetError(`無法載入正式資料 (${response.status})`, relativePath, url)
  }

  const contentType = response.headers.get('content-type')?.toLowerCase() ?? ''
  if (contentType.includes('text/html')) {
    const preview = (await response.text()).trim().slice(0, 80).replace(/\s+/g, ' ')
    throw buildDataAssetError('正式資料路徑錯誤，伺服器回傳了 HTML 而非資料檔', relativePath, url, preview)
  }
}
