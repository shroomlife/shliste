import { resolve } from 'path'
import { readFileSync, existsSync } from 'fs'
import { string } from 'yup'
import * as cheerio from 'cheerio'
import OpenAI from 'openai'

export default defineEventHandler(async (event): Promise<ExtractRecipeResponse> => {
  try {
    const runtimeConfig = useRuntimeConfig()

    const prompt = {
      location: null as string | null,
    }

    switch (runtimeConfig.environment) {
      case 'production': {
        prompt.location = resolve(process.cwd(), '.output', 'server', 'static', 'prompts', 'recipe.txt')
        break
      }
      default: {
        prompt.location = resolve(process.cwd(), 'server', 'static', 'prompts', 'recipe.txt')
      }
    }

    console.log('### Prompt Location:', prompt.location)
    if (existsSync(prompt.location) === false) {
      throw new Error('Prompt file not found!')
    }
    else {
      console.log('✅ Recipe Prompt File Initialized')
    }

    const urlSchema = string().url()
    const query = getQuery(event) as { recipeUrl: string, goVegan: boolean }

    const { recipeUrl } = query

    const isValidUrl = urlSchema.isValidSync(recipeUrl)

    if (!isValidUrl) {
      return {
        success: false,
        error: 'Die URL ist ungültig.',
      }
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
      return {
        success: false,
        error: 'Die Website konnte leider nicht geladen werden.',
      }
    }

    const html = await response.text()

    const $ = cheerio.load(html)
    $('script, style, nav, footer, svg, img, picture, video, noscript, source, meta, header, footer, button, input, textarea, iframe').remove()
    const bodyContent = $('body').text().trim() as string

    if (bodyContent.length === 0) {
      return {
        success: false,
        error: 'Der Inhalt der Website konnte nicht extrahiert werden.',
      }
    }

    const openai = new OpenAI({
      apiKey: runtimeConfig.openai.apiKey,
    })

    const promptTemplateText = [
      readFileSync(prompt.location, 'utf-8') as string,
      // goVegan ? '4. VEGANIZE: If in the recipe are NON-vegan ingredients, then replace them with amazing vegan alternatives! Take care! The User is allergic to NON-vegan products! MAKE THE RECIPE SUITABLE FOR VEGANS!' : '',
    ].join('\n')
    const cleanedBodyContent = bodyContent.replace(/\s+/g, ' ').trim()

    console.info('### Prompt Template Text')
    console.info(promptTemplateText)

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      // model: 'chatgpt-4o-latest',
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: promptTemplateText,
        },
        { role: 'user', content: cleanedBodyContent },
      ],
    })

    const messageContent = completion.choices[0].message.content as string

    console.info('### Recipe Extracted')
    console.info(messageContent)

    const recipe = JSON.parse(messageContent) as {
      title: string
      ingredients?: string[]
      steps?: string[]
      error: boolean
      errorMessage?: string
    }

    if (recipe.ingredients) {
      recipe.ingredients = Array.from(new Set(recipe.ingredients))
    }

    if (recipe.error === false && recipe.ingredients && recipe.steps) {
      return {
        success: true,
        title: recipe.title,
        ingredients: recipe.ingredients,
        steps: recipe.steps,
      }
    }

    return {
      success: false,
      error: recipe.errorMessage,
    }
  }
  catch (error: unknown) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Ein unbekannter Fehler ist aufgetreten.',
    }
  }
})
