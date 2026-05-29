const API_URL = '/api/deepseek/v1/chat/completions'

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
