/** 开发环境走 Vite 代理；GitHub Pages 等静态部署无服务端代理，需直连官方 API */
const API_URL = import.meta.env.DEV
  ? '/api/deepseek/v1/chat/completions'
  : 'https://api.deepseek.com/v1/chat/completions'

/** 将各类异常转为用户可读的中文提示 */
export function formatDeepSeekError(err, action = '请求') {
  if (!err) return `${action}失败，请稍后重试`

  const msg = err.message || String(err)

  if (err.name === 'TypeError' || /fetch|network|Failed to fetch/i.test(msg)) {
    return `${action}失败：网络连接异常，请检查网络后重试`
  }
  if (/401|unauthorized|invalid.*key|authentication/i.test(msg)) {
    return `${action}失败：API Key 无效或未授权，请在设置中检查 Key`
  }
  if (/429|rate limit|too many/i.test(msg)) {
    return `${action}失败：请求过于频繁，请稍后再试`
  }
  if (/402|insufficient|balance|quota/i.test(msg)) {
    return `${action}失败：账户余额或额度不足`
  }
  if (/500|502|503|504|server/i.test(msg)) {
    return `${action}失败：DeepSeek 服务暂时不可用 (${msg})`
  }
  if (/timeout|timed out/i.test(msg)) {
    return `${action}失败：请求超时，请稍后重试`
  }

  return msg.startsWith(`${action}失败`) ? msg : `${action}失败：${msg}`
}

function parseApiErrorBody(body, status) {
  const apiMsg = body?.error?.message || body?.message
  if (apiMsg) return apiMsg
  return `DeepSeek 接口错误 (HTTP ${status})`
}

async function request(apiKey, messages) {
  let res
  try {
    res = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages,
        temperature: 0.3,
      }),
    })
  } catch (err) {
    throw new Error(formatDeepSeekError(err, '调用'))
  }

  const rawText = await res.text()
  let data = {}
  if (rawText) {
    try {
      data = JSON.parse(rawText)
    } catch {
      throw new Error(
        res.ok
          ? '调用失败：无法解析 DeepSeek 返回数据'
          : `调用失败：${parseApiErrorBody({}, res.status)}`
      )
    }
  }

  if (!res.ok) {
    throw new Error(parseApiErrorBody(data, res.status))
  }

  const content = data.choices?.[0]?.message?.content?.trim()
  if (!content) {
    throw new Error('调用失败：DeepSeek 返回内容为空')
  }

  return content
}

export function translateToEnglish(apiKey, text) {
  return request(apiKey, [
    {
      role: 'system',
      content:
        'You are a professional translator. Translate the user text into natural English. Return only the English translation without explanations.',
    },
    { role: 'user', content: text },
  ])
}

function parseJsonArray(raw) {
  const trimmed = raw.replace(/^```(?:json)?\s*|\s*```$/g, '').trim()
  const parsed = JSON.parse(trimmed)
  if (!Array.isArray(parsed)) {
    throw new Error('翻译失败：批量翻译结果格式无效')
  }
  return parsed
}

/** 批量翻译段落，返回 { [paragraphId]: englishText } */
export async function translateBatchToEnglish(apiKey, items) {
  if (!items?.length) return {}
  if (items.length === 1) {
    const text = await translateToEnglish(apiKey, items[0].text)
    return { [items[0].id]: text }
  }

  const payload = JSON.stringify(items.map(({ id, text }) => ({ id, text })))
  const raw = await request(apiKey, [
    {
      role: 'system',
      content:
        'You are a professional translator. The user sends a JSON array of { id, text }. Translate each text into natural English. Return ONLY a valid JSON array with the same id values and translated text in the text field. No markdown fences or explanations.',
    },
    { role: 'user', content: payload },
  ])

  let parsed
  try {
    parsed = parseJsonArray(raw)
  } catch {
    throw new Error('翻译失败：无法解析批量翻译结果')
  }

  const result = {}
  for (let i = 0; i < parsed.length; i++) {
    const item = parsed[i]
    const source = items[i]
    if (item?.id && item?.text) {
      result[item.id] = String(item.text).trim()
      continue
    }
    if (source?.id && item?.text) {
      result[source.id] = String(item.text).trim()
    }
  }
  return result
}

export function analyzeParagraph(apiKey, text) {
  return request(apiKey, [
    {
      role: 'system',
      content: `你是一位文学与语言分析助手。请用中文对用户提供的一段文字进行深入分析，包括：
1. 内容大意
2. 关键词汇或表达（如有英文可注明）
3. 修辞或写作手法
4. 情感基调或主题关联
请条理清晰，适度简洁。`,
    },
    { role: 'user', content: text },
  ])
}
