from core.llm_clients import async_OR_client
from typing import Dict
from pathlib import Path
   


async def autocomplete(req: Dict) -> str:

    # Load markdown prompt
    prompt = Path("app/modules/autocompletion/prompt.md").read_text()
    
    # Inject variable
    prompt = prompt.format(
        pre_context=req['pre_context'], 
        post_context=req['post_context']
    )

    # Call OpenAI via SDK
    resp = await async_OR_client.chat.completions.create(
        model="google/gemini-2.5-flash-lite",
        messages=[{"role": "user", "content": prompt}],
    )
    suggestion = resp.choices[0].message.content.strip()
    return suggestion

