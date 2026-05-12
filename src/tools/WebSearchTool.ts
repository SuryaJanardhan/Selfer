import axios from 'axios';
import { ToolDefinition } from '../types/index.js';
import dotenv from 'dotenv';

dotenv.config();

export class WebSearchTool {
  static getDefinitions(): ToolDefinition[] {
    return [
      {
        name: 'web_search',
        description: 'Searches the web for information using a search engine.',
        parameters: {
          type: 'object',
          properties: {
            query: { type: 'string', description: 'The search query.' }
          },
          required: ['query']
        }
      }
    ];
  }

  async execute(name: string, args: any): Promise<string> {
    if (name === 'web_search') {
      const { query } = args;
      const apiKey = process.env.SERPER_API_KEY;

      if (!apiKey) {
        return 'Web search is not configured. Please set SERPER_API_KEY in your .env file.';
      }

      try {
        const response = await axios.post('https://google.serper.dev/search', 
          { q: query },
          { headers: { 'X-API-KEY': apiKey, 'Content-Type': 'application/json' } }
        );

        const results = response.data.organic || [];
        if (results.length === 0) return 'No results found.';

        return results.slice(0, 5).map((r: any, i: number) => 
          `${i+1}. ${r.title}\n   ${r.link}\n   ${r.snippet}`
        ).join('\n\n');
      } catch (error: any) {
        return `Search failed: ${error.message}`;
      }
    }
    return 'Unknown search tool';
  }
}
