import { string } from 'yup'
import * as cheerio from 'cheerio'
import OpenAI from 'openai'

export default defineEventHandler(async (event) => {
  try {
    const urlSchema = string().url()
    const query = getQuery(event) as { recipeUrl: string }
    const { recipeUrl } = query

    const isValidUrl = urlSchema.isValidSync(recipeUrl)

    if (!isValidUrl) {
      return sendError(event, new Error('Invalid URL'))
    }

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 5000) // 5 seconds timeout

    const response = await fetch(recipeUrl, {
      signal: controller.signal,
      redirect: 'error',
      headers: {
        'User-Agent': 'https://shliste.app (Recipe Extractor)',
      },
    })

    clearTimeout(timeout)

    if (!response.ok) {
      throw new Error(`Failed to fetch the URL: ${response.statusText}`)
    }

    const html = await response.text()

    // Parse the HTML and extract the body content
    const $ = cheerio.load(html)
    $('script, style, nav, footer, svg, img, picture, video, noscript, source, meta, header, footer, button, input, textarea, iframe').remove()
    const bodyContent = $('body').text().trim() as string

    const runtimeConfig = useRuntimeConfig()

    const openai = new OpenAI({
      apiKey: runtimeConfig.openai.apiKey,
    })

    const prompt = `You are a helpful assistant who extracts ingredients and preparation steps from a given recipe text and returns them in a specific format.

**Requirements:**

1. **Ingredients:**
   - Extract all ingredients from the text.
   - Format each ingredient in the form: "[Quantity][Unit] [Ingredient]"
     - **Quantity**: Numerical value (e.g., 500, 3)
     - **Unit**: ml (milliliters), g (grams), stk. (pieces)
     - **Ingredient**: Name of the ingredient
   - Convert measurement units to German units if necessary.
   - Example: "500ml Sahne", "3 stk. Eier", "250g Mehl"

2. **Steps:**
   - Extract the preparation steps from the text.
   - Write clear and meaningful instructions in German.
   - Return the steps as elements in a list (without numbering).

3. **Output Format:**
   - Return the results in the following JSON format:
     \`\`\`json
     {
       "ingredients": ["..."],
       "steps": ["..."]
     }
     \`\`\`
   - Ensure that the JSON is valid and correctly formatted.
   - Return **only** the JSON object, without additional explanations or texts.

---

Here is the recipe text you should process:

${bodyContent}
`

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content:
            'You are a helpful assistant that extracts recipes from text and outputs them in JSON format as specified. The output should be in German.',
        },
        { role: 'user', content: prompt },
      ],
    })

    const messageContent = completion.choices[0].message.content as string

    console.log('messageContent:', messageContent)

    const recipe = JSON.parse(messageContent) as {
      ingredients: string[]
      steps: string[]
    }

    return {
      recipe,
    }
  }
  catch (error: unknown) {
    console.error('Error fetching the URL:', error)
    return sendError(event, error as Error)
  }
})
