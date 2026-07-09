function wait(milliseconds) {
  return new Promise((resolve) => {
    setTimeout(resolve, milliseconds)
  })
}

async function fetchWithRetry(url, responseType, attempts = 3) {
  let lastError = null

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': '*/*',
        }
      })
      if (!response.ok) {
        throw new Error(`Failed to fetch ${url}: ${response.status}`)
      }

      if (responseType === 'json') return response.json()
      if (responseType === 'arrayBuffer') return response.arrayBuffer()
      return response.text()
    } catch (error) {
      lastError = error
      if (attempt < attempts) {
        await wait(attempt * 1200)
      }
    }
  }

  throw lastError ?? new Error(`Failed to fetch ${url}`)
}

export async function fetchText(url) {
  return fetchWithRetry(url, 'text')
}

export async function fetchJson(url) {
  return fetchWithRetry(url, 'json')
}

export async function fetchArrayBuffer(url) {
  return fetchWithRetry(url, 'arrayBuffer')
}

export async function fetchArrayBufferWithFallback(urls) {
  let lastError = null
  for (const url of urls) {
    try {
      return await fetchWithRetry(url, 'arrayBuffer')
    } catch (error) {
      lastError = error
    }
  }
  throw lastError ?? new Error('Unable to download official boundary dataset')
}
