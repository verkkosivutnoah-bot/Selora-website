# Workflow: refresh chatbot knowledge

Keep the site chatbot's facts in step with the site.

`api/site-knowledge.js` is generated from the live pages by
`scripts/build-chatbot-knowledge.py`. It goes stale the moment copy changes,
and a stale knowledge file is how the chatbot ended up selling an archived
product. Regenerating it is cheap, so this runs on a schedule rather than
relying on anyone remembering after a copy edit.

## Steps

1. Regenerate:

   ```bash
   python3 scripts/build-chatbot-knowledge.py
   ```

2. Check what moved:

   ```bash
   git diff --stat api/site-knowledge.js
   ```

3. If the file is unchanged, stop. Report that the chatbot is already current.

4. If it changed, read the diff and sanity-check it before accepting:
   - Section count should not drop. A page disappearing from the knowledge
     file usually means the extractor failed on it, not that the page is gone.
   - Prices, plan names, and service names should match what the HTML says.
   - No section should be empty or truncated mid-sentence.

5. If anything looks wrong, stop and report it. Do not commit a knowledge file
   you do not trust — a broken one makes the chatbot confidently wrong, which
   is worse than it being one copy change behind.

## Boundaries

- Only `api/site-knowledge.js` should change. If the script touches anything
  else, stop and report.
- Do not edit the generated file by hand. If the output is wrong, the fix
  belongs in `scripts/build-chatbot-knowledge.py`, and that is a change to
  report rather than to make unattended.

## Report

Summarise what changed: which pages gained or lost content, and any figure
(price, plan, service) that moved. If nothing changed, say so in one line.
